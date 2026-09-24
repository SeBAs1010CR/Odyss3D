import { createClient } from "@/lib/supabase/client";
import { DEFAULT_INPUTS, mergeConfig } from "@/lib/calculator";
import { ADMIN_EMAIL_DOMAIN, SETTINGS_DEFAULTS } from "./constants";
import { startOfRange, startOfDay, toNum } from "./format";
import { machineFund } from "./pricing";
import { optimizeImage, slug } from "./utils";
import type {
  Accessory,
  CalculatorSharedSettings,
  ContactRequest,
  ContactRequestStatus,
  Customer,
  CustomerWithStats,
  DashboardData,
  FilamentColor,
  Order,
  OrderAccessory,
  OrderStatus,
  PaymentsData,
  PaymentOrderRow,
  Product,
  Profile,
  SettingsRecord,
  StatisticsData,
} from "./types";

/* ============ AUTH ============ */

const normalizeEmail = (username: string): string => {
  const u = username.trim();
  return u.includes("@") ? u : `${u}@${ADMIN_EMAIL_DOMAIN}`;
};

export async function signIn(
  username: string,
  password: string
): Promise<{ ok: boolean; message?: string }> {
  let error: { message?: string; status?: number } | null = null;
  try {
    const res = await createClient().auth.signInWithPassword({
      email: normalizeEmail(username),
      password,
    });
    error = res.error;
  } catch (e) {
    return { ok: false, message: "No se pudo conectar con Supabase." };
  }

  if (!error) return { ok: true };

  // 400 = credenciales inválidas. Cualquier otra cosa = red/config.
  if (error.status === 400) {
    return { ok: false, message: "Usuario o contraseña incorrectos." };
  }
  return { ok: false, message: `No se pudo iniciar sesión (${error.message ?? "error de conexión"}).` };
}

export async function signOut(): Promise<void> {
  await createClient().auth.signOut();
}

export async function currentUser() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  return user;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await createClient()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

/** Map: user id -> nombre. Se usa para "Creado por / Última modificación". */
export async function fetchStaff(): Promise<Record<string, string>> {
  const { data } = await createClient().from("profiles").select("id,name");
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.id) map[row.id] = row.name ?? "";
  }
  return map;
}

/* ============ HELPERS ============ */

/** Solo los pedidos entregados cuentan como venta / ingreso del negocio. */
const REVENUE_STATUSES = new Set<OrderStatus>(["entregado"]);

const money = (v: unknown): number => toNum(v);

const mapOrder = (row: Record<string, unknown>): Order => ({
  id: String(row.id),
  number: toNum(row.number),
  customer_id: (row.customer_id as string) ?? null,
  status: (row.status as OrderStatus) ?? "pendiente",
  total: money(row.total),
  estimated_profit: money(row.estimated_profit),
  machine_fund: money(row.machine_fund),
  order_date: String(row.order_date ?? ""),
  estimated_delivery: (row.estimated_delivery as string) ?? null,
  payment_method: (row.payment_method as string) ?? null,
  transport_type: (row.transport_type as string) ?? null,
  delivery_address: (row.delivery_address as string) ?? null,
  transport_cost: money(row.transport_cost),
  notes: (row.notes as string) ?? null,
  created_by: (row.created_by as string) ?? null,
  updated_by: (row.updated_by as string) ?? null,
  created_at: String(row.created_at ?? ""),
  updated_at: String(row.updated_at ?? ""),
  customer: row.customer ? (row.customer as Order["customer"]) : null,
  items: Array.isArray(row.items)
    ? (row.items as unknown[]).map((i) => {
        const it = i as Record<string, unknown>;
        return {
          id: String(it.id),
          order_id: String(it.order_id),
          product_id: (it.product_id as string) ?? null,
          name: String(it.name ?? ""),
          quantity: toNum(it.quantity, 1),
          unit_price: money(it.unit_price),
          production_cost: it.production_cost != null ? money(it.production_cost) : null,
          total: money(it.total),
          colors: Array.isArray(it.colors) ? (it.colors as string[]) : [],
        };
      })
    : undefined,
  images: Array.isArray(row.images)
    ? (row.images as unknown[]).map((i) => {
        const im = i as Record<string, unknown>;
        return {
          id: String(im.id),
          order_id: String(im.order_id),
          url: String(im.url ?? ""),
          label: (im.label as string) ?? null,
        };
      })
    : undefined,
  accessories: Array.isArray(row.accessories)
    ? (row.accessories as unknown[]).map((a) => {
        const acc = a as Record<string, unknown>;
        return {
          id: String(acc.id),
          order_id: String(acc.order_id),
          accessory_id: (acc.accessory_id as string) ?? null,
          name: String(acc.name ?? ""),
          quantity: toNum(acc.quantity, 1),
          unit_price: money(acc.unit_price),
          total: money(acc.total),
        };
      })
    : undefined,
});

export type NewOrderItem = {
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  production_cost: number | null;
  colors: string[];
};

export type NewOrderAccessory = {
  accessory_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
};

export type NewOrderInput = {
  customer_id: string;
  status: OrderStatus;
  order_date: string;
  estimated_delivery: string | null;
  payment_method: string | null;
  transport_type: string | null;
  delivery_address: string | null;
  transport_cost: number;
  notes: string | null;
  items: NewOrderItem[];
  accessories: NewOrderAccessory[];
};

/* ============ ORDENES ============ */

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await createClient()
    .from("orders")
    .select("*, customer:customers(id,name,whatsapp), items:order_items(name,quantity)")
    .order("created_at", { ascending: false });

  if (error) throw new Error("No se pudieron cargar los pedidos.");
  return (data ?? []).map((r: Record<string, unknown>) => mapOrder(r));
}

export async function fetchOrder(key: string): Promise<Order | null> {
  const isNumber = /^\d+$/.test(key.trim());
  const base = createClient()
    .from("orders")
    .select("*, customer:customers(*), items:order_items(*), images:order_images(*), accessories:order_accessories(*)");

  const { data, error } = isNumber
    ? await base.eq("number", toNum(key)).maybeSingle()
    : await base.eq("id", key).maybeSingle();

  if (error) throw new Error("No se pudo cargar el pedido.");
  return data ? mapOrder(data as Record<string, unknown>) : null;
}

export async function createOrder(input: NewOrderInput): Promise<Order> {
  const user = await currentUser();
  if (!user) throw new Error("Sesión no válida.");

  const items = input.items
    .filter((i) => i.quantity > 0 && i.unit_price >= 0)
    .map((i) => ({
      ...i,
      total: Math.round(i.quantity * i.unit_price * 100) / 100,
    }));

  const accessories = input.accessories
    .filter((a) => a.quantity > 0 && a.unit_price >= 0)
    .map((a) => ({
      ...a,
      total: Math.round(a.quantity * a.unit_price * 100) / 100,
    }));

  const transportCost = Math.round(money(input.transport_cost) * 100) / 100;
  const itemsTotal = items.reduce((s, i) => s + i.total, 0);
  const accessoriesTotal = accessories.reduce((s, a) => s + a.total, 0);
  const total = Math.round((itemsTotal + accessoriesTotal + transportCost) * 100) / 100;
  const estimatedProfit = Math.round(
    items.reduce((s, i) => s + (i.unit_price - (i.production_cost ?? 0)) * i.quantity, 0) * 100
  ) / 100;

  const settings = await fetchSettings();
  const machineFundValue = machineFund(estimatedProfit, settings);

  const { data: order, error } = await createClient()
    .from("orders")
    .insert({
      customer_id: input.customer_id,
      status: input.status,
      total,
      estimated_profit: estimatedProfit,
      machine_fund: machineFundValue,
      order_date: input.order_date,
      estimated_delivery: input.estimated_delivery || null,
      payment_method: input.payment_method || null,
      transport_type: input.transport_type || null,
      delivery_address: input.delivery_address || null,
      transport_cost: transportCost,
      notes: input.notes || null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id, number")
    .single();

  if (error || !order) throw new Error("No se pudo crear el pedido.");

  for (const item of items) {
    const { error: itemError } = await createClient().from("order_items").insert({
      order_id: order.id,
      product_id: item.product_id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      production_cost: item.production_cost,
      total: item.total,
      colors: item.colors ?? [],
    });
    if (itemError) throw new Error("No se pudieron guardar los productos del pedido.");
  }

  for (const acc of accessories) {
    const { error: accError } = await createClient().from("order_accessories").insert({
      order_id: order.id,
      accessory_id: acc.accessory_id,
      name: acc.name,
      quantity: acc.quantity,
      unit_price: acc.unit_price,
      total: acc.total,
    });
    if (accError) throw new Error("No se pudieron guardar los accesorios del pedido.");
  }

  return (await fetchOrder(String(order.id)))!;
}

export type OrderMetaPatch = {
  customer_id?: string;
  status?: OrderStatus;
  order_date?: string;
  estimated_delivery?: string | null;
  payment_method?: string | null;
  notes?: string | null;
};

export async function updateOrderMeta(
  orderId: string,
  patch: OrderMetaPatch
): Promise<void> {
  const user = await currentUser();
  const { error } = await createClient()
    .from("orders")
    .update({
      ...patch,
      estimated_delivery: patch.estimated_delivery || null,
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) throw new Error("No se pudo actualizar el pedido.");
}

export type OrderFullInput = NewOrderInput;

/** Actualiza TODO el pedido: metadatos, ítems, accesorios y totales. */
export async function updateOrderFull(orderId: string, input: OrderFullInput): Promise<void> {
  const user = await currentUser();
  if (!user) throw new Error("Sesión no válida.");

  const items = input.items
    .filter((i) => i.quantity > 0 && i.unit_price >= 0)
    .map((i) => ({
      ...i,
      total: Math.round(i.quantity * i.unit_price * 100) / 100,
      colors: i.colors ?? [],
    }));

  const accessories = input.accessories
    .filter((a) => a.quantity > 0 && a.unit_price >= 0)
    .map((a) => ({
      ...a,
      total: Math.round(a.quantity * a.unit_price * 100) / 100,
    }));

  const transportCost = Math.round(money(input.transport_cost) * 100) / 100;
  const itemsTotal = items.reduce((s, i) => s + i.total, 0);
  const accessoriesTotal = accessories.reduce((s, a) => s + a.total, 0);
  const total = Math.round((itemsTotal + accessoriesTotal + transportCost) * 100) / 100;
  const estimatedProfit = Math.round(
    items.reduce((s, i) => s + (i.unit_price - (i.production_cost ?? 0)) * i.quantity, 0) * 100
  ) / 100;

  const settings = await fetchSettings();
  const machineFundValue = machineFund(estimatedProfit, settings);

  const { error: orderError } = await createClient()
    .from("orders")
    .update({
      status: input.status,
      customer_id: input.customer_id,
      total,
      estimated_profit: estimatedProfit,
      machine_fund: machineFundValue,
      order_date: input.order_date,
      estimated_delivery: input.estimated_delivery || null,
      payment_method: input.payment_method || null,
      transport_type: input.transport_type || null,
      delivery_address: input.delivery_address || null,
      transport_cost: transportCost,
      notes: input.notes || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (orderError) throw new Error("No se pudo actualizar el pedido.");

  const { error: delItems } = await createClient().from("order_items").delete().eq("order_id", orderId);
  if (delItems) throw new Error("No se pudieron actualizar los productos.");

  for (const item of items) {
    const { error: itemError } = await createClient().from("order_items").insert({
      order_id: orderId,
      product_id: item.product_id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      production_cost: item.production_cost,
      total: item.total,
      colors: item.colors,
    });
    if (itemError) throw new Error("No se pudieron guardar los productos del pedido.");
  }

  const { error: delAcc } = await createClient().from("order_accessories").delete().eq("order_id", orderId);
  if (delAcc) throw new Error("No se pudieron actualizar los accesorios.");

  for (const acc of accessories) {
    const { error: accError } = await createClient().from("order_accessories").insert({
      order_id: orderId,
      accessory_id: acc.accessory_id,
      name: acc.name,
      quantity: acc.quantity,
      unit_price: acc.unit_price,
      total: acc.total,
    });
    if (accError) throw new Error("No se pudieron guardar los accesorios del pedido.");
  }
}

export async function deleteOrder(orderId: string): Promise<void> {
  const { error } = await createClient().from("orders").delete().eq("id", orderId);
  if (error) throw new Error("No se pudo eliminar el pedido.");
}

/* ============ IMÁGENES DE PEDIDO ============ */

export async function addOrderImage(
  orderId: string,
  url: string,
  label?: string
): Promise<void> {
  const user = await currentUser();
  const { error } = await createClient().from("order_images").insert({
    order_id: orderId,
    url,
    label: label || null,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error("No se pudo registrar la imagen.");
}

export async function removeOrderImage(image: { id: string; url: string }): Promise<void> {
  await deleteStorageObject("orders", image.url);
  const { error } = await createClient()
    .from("order_images")
    .delete()
    .eq("id", image.id);
  if (error) throw new Error("No se pudo eliminar la imagen.");
}

/* ============ COLORES DE FILAMENTO ============ */

const mapColor = (row: Record<string, unknown>): FilamentColor => ({
  id: String(row.id),
  name: String(row.name ?? ""),
  hex: (row.hex as string) ?? null,
  is_active: Boolean(row.is_active),
  created_at: String(row.created_at ?? ""),
});

export async function fetchFilamentColors(): Promise<FilamentColor[]> {
  const { data, error } = await createClient().from("filament_colors").select("*").order("name");
  if (error) throw new Error("No se pudieron cargar los colores.");
  return (data ?? []).map((r: Record<string, unknown>) => mapColor(r));
}

export async function createFilamentColor(name: string, hex?: string): Promise<void> {
  const { error } = await createClient()
    .from("filament_colors")
    .insert({ name: name.trim(), hex: hex?.trim() || null });
  if (error) throw new Error("No se pudo crear el color (¿ya existe?).");
}

export async function deleteFilamentColor(id: string): Promise<void> {
  const { error } = await createClient().from("filament_colors").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el color.");
}

/* ============ ACCESORIOS ============ */

const mapAccessory = (row: Record<string, unknown>): Accessory => ({
  id: String(row.id),
  name: String(row.name ?? ""),
  price: money(row.price),
  cost: money(row.cost),
  is_active: Boolean(row.is_active),
  created_at: String(row.created_at ?? ""),
  updated_at: String(row.updated_at ?? ""),
});

export async function fetchAccessories(): Promise<Accessory[]> {
  const { data, error } = await createClient().from("accessories").select("*").order("name");
  if (error) throw new Error("No se pudieron cargar los accesorios.");
  return (data ?? []).map((r: Record<string, unknown>) => mapAccessory(r));
}

export async function createAccessory(input: { name: string; price: number; cost?: number }): Promise<void> {
  const { error } = await createClient()
    .from("accessories")
    .insert({
      name: input.name.trim(),
      price: money(input.price),
      cost: money(input.cost ?? 0),
    });
  if (error) throw new Error("No se pudo crear el accesorio (¿ya existe?).");
}

export async function updateAccessory(id: string, input: { name: string; price: number; cost?: number }): Promise<void> {
  const { error } = await createClient()
    .from("accessories")
    .update({
      name: input.name.trim(),
      price: money(input.price),
      cost: money(input.cost ?? 0),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error("No se pudo actualizar el accesorio.");
}

export async function deleteAccessory(id: string): Promise<void> {
  const { error } = await createClient().from("accessories").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el accesorio.");
}

/* ============ CLIENTES ============ */

const mapCustomer = (row: Record<string, unknown>): Customer => ({
  id: String(row.id),
  name: String(row.name ?? ""),
  whatsapp: (row.whatsapp as string) ?? null,
  email: (row.email as string) ?? null,
  address: (row.address as string) ?? null,
  notes: (row.notes as string) ?? null,
  created_at: String(row.created_at ?? ""),
  updated_at: String(row.updated_at ?? ""),
});

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await createClient()
    .from("customers")
    .select("*")
    .order("name");
  if (error) throw new Error("No se pudieron cargar los clientes.");
  return (data ?? []).map((r: Record<string, unknown>) => mapCustomer(r));
}

export async function fetchCustomer(key: string): Promise<CustomerWithStats | null> {
  const { data, error } = await createClient()
    .from("customers")
    .select("*")
    .eq("id", key)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el cliente.");
  if (!data) return null;

  const customer = mapCustomer(data as Record<string, unknown>);

  const { data: orders } = await createClient()
    .from("orders")
    .select("*, customer:customers(id,name,whatsapp)")
    .eq("customer_id", key)
    .order("created_at", { ascending: false });

  const orderList = (orders ?? []).map((r: Record<string, unknown>) => mapOrder(r));
  const active = orderList.filter((o) => REVENUE_STATUSES.has(o.status));

  return {
    ...customer,
    orders: orderList,
    orders_count: orderList.length,
    total_spent: Math.round(active.reduce((s, o) => s + o.total, 0) * 100) / 100,
    last_order_at: orderList[0]?.created_at ?? null,
  };
}

export type CustomerInput = {
  name: string;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const { data, error } = await createClient()
    .from("customers")
    .insert({ ...input, whatsapp: input.whatsapp || null, email: input.email || null })
    .select("*")
    .single();
  if (error || !data) throw new Error("No se pudo crear el cliente.");
  return mapCustomer(data as Record<string, unknown>);
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<void> {
  const { error } = await createClient()
    .from("customers")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("No se pudo actualizar el cliente.");
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await createClient().from("customers").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el cliente.");
}

/* ============ PRODUCTOS ============ */

const mapProduct = (row: Record<string, unknown>): Product => ({
  id: String(row.id),
  name: String(row.name ?? ""),
  description: (row.description as string) ?? null,
  category: (row.category as string) ?? null,
  image: (row.image as string) ?? null,
  print_minutes: row.print_minutes != null ? toNum(row.print_minutes) : null,
  grams: row.grams != null ? toNum(row.grams) : null,
  production_cost: row.production_cost != null ? money(row.production_cost) : null,
  sale_price: row.sale_price != null ? money(row.sale_price) : null,
  is_active: Boolean(row.is_active),
  is_ecommerce: Boolean(row.is_ecommerce),
  colors: Array.isArray(row.colors)
    ? (row.colors as unknown[]).map((c) => String(c)).filter(Boolean)
    : [],
  created_by: (row.created_by as string) ?? null,
  updated_by: (row.updated_by as string) ?? null,
  created_at: String(row.created_at ?? ""),
  updated_at: String(row.updated_at ?? ""),
  images: Array.isArray(row.images)
    ? (row.images as unknown[]).map((i) => {
        const im = i as Record<string, unknown>;
        return {
          id: String(im.id),
          product_id: String(im.product_id),
          url: String(im.url ?? ""),
        };
      })
    : undefined,
});

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await createClient()
    .from("products")
    .select("*, images:product_images(*)")
    .order("name");
  if (error) throw new Error("No se pudieron cargar los productos.");
  return (data ?? []).map((r: Record<string, unknown>) => mapProduct(r));
}

export async function fetchProduct(key: string): Promise<Product | null> {
  const { data, error } = await createClient()
    .from("products")
    .select("*, images:product_images(*)")
    .eq("id", key)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el producto.");
  return data ? mapProduct(data as Record<string, unknown>) : null;
}

export type ProductInput = {
  id?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  image?: string | null;
  print_minutes?: number | null;
  grams?: number | null;
  production_cost?: number | null;
  sale_price?: number | null;
  is_active: boolean;
  is_ecommerce?: boolean;
  colors?: string[];
};

export async function createProduct(input: ProductInput, withId?: string): Promise<Product> {
  const user = await currentUser();
  const { data, error } = await createClient()
    .from("products")
    .insert({
      ...(withId ? { id: withId } : {}),
      name: input.name,
      description: input.description || null,
      category: input.category || null,
      image: input.image || null,
      print_minutes: input.print_minutes ?? null,
      grams: input.grams ?? null,
      production_cost: input.production_cost ?? null,
      sale_price: input.sale_price ?? null,
      is_active: input.is_active,
      is_ecommerce: input.is_ecommerce ?? false,
      colors: input.colors ?? [],
      created_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error("No se pudo crear el producto.");
  return mapProduct(data as Record<string, unknown>);
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<void> {
  const user = await currentUser();
  const { error } = await createClient()
    .from("products")
    .update({
      ...input,
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error("No se pudo actualizar el producto.");
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await createClient().from("products").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el producto.");
}

/* ============ IMÁGENES DE PRODUCTO ============ */

export async function addProductImage(productId: string, url: string): Promise<void> {
  const { error } = await createClient()
    .from("product_images")
    .insert({ product_id: productId, url });
  if (error) throw new Error("No se pudo registrar la imagen.");
}

export async function removeProductImage(image: { id: string; url: string }): Promise<void> {
  await deleteStorageObject("products", image.url);
  const { error } = await createClient()
    .from("product_images")
    .delete()
    .eq("id", image.id);
  if (error) throw new Error("No se pudo eliminar la imagen.");
}

/* ============ AJUSTES ============ */

export async function fetchSettings(): Promise<SettingsRecord> {
  const { data, error } = await createClient().from("settings").select("key,value");
  if (error) throw new Error("No se pudieron cargar los ajustes.");
  const out: SettingsRecord = { ...SETTINGS_DEFAULTS };
  for (const row of data ?? []) {
    if (row.key === "calculator_config") continue;
    out[row.key] = toNum(row.value);
  }
  return out;
}

export async function saveSettings(values: SettingsRecord): Promise<void> {
  const user = await currentUser();
  for (const [key, value] of Object.entries(values)) {
    const { error } = await createClient().from("settings").upsert({
      key,
      value: value,
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`No se pudo guardar el ajuste “${key}”.`);
  }
}

/* ============ CONFIGURACIÓN DE LA CALCULADORA ============ */

export async function fetchCalculatorConfig(): Promise<CalculatorSharedSettings | null> {
  const { data, error } = await createClient()
    .from("settings")
    .select("key,value")
    .eq("key", "calculator_config")
    .maybeSingle();

  if (error || !data?.value || typeof data.value !== "object") return null;

  const v = data.value as Record<string, unknown>;
  return {
    config: (v.config && typeof v.config === "object" ? v.config : {}) as Record<string, unknown>,
    filamentPrice: money(v.filamentPrice),
    rollWeight: money(v.rollWeight),
    rounding: typeof v.rounding === "string" ? v.rounding : "none",
  };
}

export async function saveCalculatorConfig(input: CalculatorSharedSettings): Promise<void> {
  const user = await currentUser();
  const { error } = await createClient().from("settings").upsert({
    key: "calculator_config",
    value: {
      config: input.config,
      filamentPrice: money(input.filamentPrice),
      rollWeight: money(input.rollWeight),
      rounding: input.rounding,
    },
    updated_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("No se pudo guardar la configuración de la calculadora.");
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ============ APARTADOS / PAGOS ============ */

export async function fetchPaymentsBreakdown(
  range: "week" | "month" | "3months" | "year"
): Promise<PaymentsData> {
  const start = startOfRange(range);
  const startStr = start.toISOString().slice(0, 10);

  const [ordersRes, productsRes, shared] = await Promise.all([
    createClient()
      .from("orders")
      .select(
        "id,number,order_date,status,total,estimated_profit,machine_fund," +
          "customer:customers(name),items:order_items(product_id,quantity,production_cost)"
      )
      .gte("order_date", startStr),
    createClient().from("products").select("id,grams,print_minutes"),
    fetchCalculatorConfig(),
  ]);

  const productMap = new Map<string, { grams: number | null; print_minutes: number | null }>();
  for (const p of (productsRes.data ?? []) as unknown as Record<string, unknown>[]) {
    productMap.set(String(p.id), {
      grams: p.grams != null ? toNum(p.grams) : null,
      print_minutes: p.print_minutes != null ? toNum(p.print_minutes) : null,
    });
  }

  const cfg = mergeConfig(shared?.config ?? null);
  const filamentPrice = shared?.filamentPrice || toNum(DEFAULT_INPUTS.filamentPrice);
  const rollWeight = Math.max(1, shared?.rollWeight || toNum(DEFAULT_INPUTS.rollWeight));
  const electricityPerMinute = cfg.costs.electricityPerMinute;
  const machinePerMinute = cfg.costs.machinePerHour / 60;

  const orders = (ordersRes.data ?? []) as unknown as Record<string, unknown>[];
  const rows: PaymentOrderRow[] = [];
  let totalSales = 0;
  let totalFilament = 0;
  let totalElectricity = 0;
  let totalMachine = 0;
  let totalFund = 0;
  let totalProfit = 0;

  for (const o of orders) {
    const status = (o.status as OrderStatus) ?? "pendiente";
    if (!REVENUE_STATUSES.has(status)) continue;

    const items = (o.items as unknown[]) ?? [];
    let f = 0;
    let e = 0;
    let m = 0;

    for (const raw of items) {
      const it = raw as Record<string, unknown>;
      const qty = Math.max(0, toNum(it.quantity, 1));
      const prod = it.production_cost != null ? Math.max(0, toNum(it.production_cost)) : 0;
      if (prod <= 0 || qty <= 0) continue;

      const meta = it.product_id != null ? productMap.get(String(it.product_id)) : undefined;
      const grams = meta?.grams != null ? meta.grams : NaN;
      const minutes = meta?.print_minutes != null ? meta.print_minutes : NaN;

      if (grams > 0 && minutes >= 0) {
        const filX = qty * ((grams * filamentPrice) / rollWeight);
        const eleX = qty * (minutes * electricityPerMinute);
        const machX = qty * prod - filX - eleX;
        f += filX;
        e += eleX;
        m += Math.max(0, machX);
      } else {
        m += qty * prod;
      }
    }

    const profit = money(o.estimated_profit);
    const fund = money(o.machine_fund);
    const row: PaymentOrderRow = {
      id: String(o.id),
      number: toNum(o.number),
      order_date: String(o.order_date ?? ""),
      status,
      customer_name: String((o.customer as { name?: string })?.name ?? ""),
      items_count: items.length,
      total: money(o.total),
      filament: round2(f),
      electricity: round2(e),
      machine: round2(m),
      profit: round2(profit),
      machine_fund: round2(fund),
      profit_net: round2(profit - fund),
    };
    rows.push(row);

    totalSales += row.total;
    totalFilament += row.filament;
    totalElectricity += row.electricity;
    totalMachine += row.machine;
    totalFund += row.machine_fund;
    totalProfit += row.profit;
  }

  return {
    range,
    sales: round2(totalSales),
    filament: round2(totalFilament),
    electricity: round2(totalElectricity),
    machine: round2(totalMachine),
    machine_fund: round2(totalFund),
    profit: round2(totalProfit),
    profit_net: round2(totalProfit - totalFund),
    orders: rows,
  };
}

/* ============ DASHBOARD ============ */

export async function fetchDashboardData(): Promise<DashboardData> {
  const [orders, customers, products] = await Promise.all([
    fetchOrders(),
    fetchCustomers(),
    fetchProducts(),
  ]);

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const counts: DashboardData["counts"] = {
    pendiente: 0,
    en_produccion: 0,
    listo: 0,
    cotizacion: 0,
    pago_pendiente: 0,
    entregado: 0,
    cancelado: 0,
  };

  let month_sales = 0;
  let month_profit = 0;
  let month_machine_fund = 0;

  for (const o of orders) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
    if (o.order_date.startsWith(monthPrefix) && REVENUE_STATUSES.has(o.status)) {
      month_sales += o.total;
      month_profit += o.estimated_profit;
      month_machine_fund += o.machine_fund;
    }
  }

  return {
    counts,
    month_sales,
    month_profit,
    month_machine_fund,
    customers_count: customers.length,
    products_count: products.filter((p) => p.is_active).length,
    recent_orders: orders.slice(0, 6),
  };
}

/* ============ ESTADÍSTICAS ============ */

const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DAY_NAMES = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export async function fetchStatistics(
  range: "week" | "month" | "3months" | "year"
): Promise<StatisticsData> {
  const start = startOfRange(range);
  const startStr = start.toISOString().slice(0, 10);

  const { data: orders, error: orderError } = await createClient()
    .from("orders")
    .select("*, items:order_items(quantity)")
    .gte("order_date", startStr);
  if (orderError) throw new Error("No se pudieron cargar las estadísticas.");

  const { data: customers } = await createClient()
    .from("customers")
    .select("created_at")
    .gte("created_at", start.toISOString());

  const orderList = (orders ?? []).map((r: Record<string, unknown>) => {
    const o = mapOrder(r);
    o.items = Array.isArray(r.items)
      ? (r.items as unknown[]).map((i) => {
          const it = i as Record<string, unknown>;
          return {
            id: String(it.id),
            order_id: String(it.order_id),
            product_id: null,
            name: String(it.name ?? ""),
            quantity: toNum(it.quantity, 1),
            unit_price: 0,
            production_cost: null,
            total: 0,
            colors: Array.isArray(it.colors) ? (it.colors as string[]) : [],
          };
        })
      : [];
    return o;
  });

  const active = orderList.filter((o) => REVENUE_STATUSES.has(o.status));

  const sales = Math.round(active.reduce((s, o) => s + o.total, 0) * 100) / 100;
  const profit = Math.round(active.reduce((s, o) => s + o.estimated_profit, 0) * 100) / 100;
  const machineFundTotal = Math.round(active.reduce((s, o) => s + o.machine_fund, 0) * 100) / 100;
  const products_sold = active.reduce(
    (s, o) => s + (o.items ?? []).reduce((si, it) => si + it.quantity, 0),
    0
  );

  const by_status = Object.entries(
    orderList.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ status: status as OrderStatus, count }));

  const chart = buildChart(active, range, start);

  return {
    sales,
    profit,
    machine_fund: machineFundTotal,
    orders_count: orderList.length,
    products_sold,
    new_customers: customers?.length ?? 0,
    chart,
    by_status,
  };
}

function buildChart(
  orders: Order[],
  range: "week" | "month" | "3months" | "year",
  start: Date
): { label: string; value: number }[] {
  const buckets = new Map<string, { label: string; key: string }>();
  const values = new Map<string, number>();

  if (range === "week") {
    for (let i = 0; i < 7; i++) {
      const d = startOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
      const iso = d.toISOString().slice(0, 10);
      buckets.set(iso, { label: DAY_NAMES[(d.getDay() + 6) % 7], key: iso });
    }
  } else if (range === "month") {
    const days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= days; i++) {
      const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      buckets.set(iso, { label: String(i), key: iso });
    }
  } else if (range === "3months") {
    const cursor = new Date(start);
    const end = new Date();
    while (cursor <= end) {
      const iso = cursor.toISOString().slice(0, 10);
      buckets.set(iso, {
        label: `${cursor.getDate()}/${cursor.getMonth() + 1}`,
        key: iso,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    for (let m = 0; m < 12; m++) {
      const key = `${start.getFullYear()}-${String(m + 1).padStart(2, "0")}`;
      buckets.set(key, { label: MONTH_NAMES[m].slice(0, 3), key });
    }
  }

  for (const o of orders) {
    const key =
      range === "year"
        ? o.order_date.slice(0, 7)
        : o.order_date.slice(0, 10);
    const b = buckets.get(key);
    if (!b) continue;
    values.set(b.key, (values.get(b.key) ?? 0) + o.total);
  }

  return [...buckets.values()].map((b) => ({
    label: b.label,
    value: values.get(b.key) ?? 0,
  }));
}

/* ============ STORAGE ============ */

export async function uploadImage(
  bucket: "products" | "orders",
  folder: string,
  file: File
): Promise<string> {
  const blob = await optimizeImage(file);
  const name = `${Date.now()}-${slug(file.name)}`;
  const path = `${folder}/${name}`;

  const { error } = await createClient().storage
    .from(bucket)
    .upload(path, blob, { contentType: blob.type, upsert: false });

  if (error) throw new Error("No se pudo subir la imagen.");
  return path;
}

export async function deleteStorageObject(
  bucket: "products" | "orders",
  path: string
): Promise<void> {
  if (!path || /^https?:\/\//.test(path)) return; // URL externa, no en Storage
  const { error } = await createClient().storage.from(bucket).remove([path]);
  if (error) throw new Error("No se pudo eliminar la imagen del almacenamiento.");
}

/** Resuelve URLs firmadas de imágenes privadas (solo admin). */
export async function resolveSignedUrls(
  bucket: "products" | "orders" | "cotizaciones",
  paths: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const publicPath = (p: string) =>
    /^https?:\/\//.test(p) || p.startsWith("/");
  const clean = [
    ...new Set(paths.filter((p): p is string => !!p && !publicPath(p))),
  ];
  const out: Record<string, string> = {};
  for (const p of paths) {
    if (p && publicPath(p)) out[p] = p;
  }
  if (clean.length === 0) return out;

  try {
    const res = await fetch("/api/admin/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, paths: clean }),
    });
    if (!res.ok) return out;
    const data = (await res.json()) as { urls?: Record<string, string> };
    if (data.urls) Object.assign(out, data.urls);
  } catch {
    // URLs sin firma; la UI mostrará un placeholder de "imagen privada"
  }

  return out;
}

/* ============ SOLICITUDES DE COTIZACIÓN ============ */

export async function fetchContactRequests(): Promise<ContactRequest[]> {
  const { data, error } = await createClient()
    .from("contact_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar las solicitudes.");
  return (data ?? []) as ContactRequest[];
}

export async function updateContactRequestStatus(
  id: string,
  status: ContactRequestStatus
): Promise<void> {
  const { error } = await createClient()
    .from("contact_requests")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error("No se pudo actualizar la solicitud.");
}

export async function deleteContactRequest(request: ContactRequest): Promise<void> {
  const paths = (request.file_paths ?? []).filter(
    (p) => !/^https?:\/\//.test(p)
  );
  if (paths.length > 0) {
    const { error: storageError } = await createClient()
      .storage.from("cotizaciones")
      .remove(paths);
    if (storageError) throw new Error("No se pudo eliminar los archivos.");
  }
  const { error } = await createClient()
    .from("contact_requests")
    .delete()
    .eq("id", request.id);
  if (error) throw new Error("No se pudo eliminar la solicitud.");
}

/* ============ SOLICITUDES DE COTIZACIÓN (fin) ============ */