import { createClient } from "@/lib/supabase/client";
import { ADMIN_EMAIL_DOMAIN } from "./constants";
import { startOfRange, startOfDay, toNum } from "./format";
import { optimizeImage, slug } from "./utils";
import type {
  Customer,
  CustomerWithStats,
  DashboardData,
  Order,
  OrderStatus,
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

const NON_REVENUE = new Set<OrderStatus>(["cancelado", "cotizacion"]);

const money = (v: unknown): number => toNum(v);

const mapOrder = (row: Record<string, unknown>): Order => ({
  id: String(row.id),
  number: toNum(row.number),
  customer_id: (row.customer_id as string) ?? null,
  status: (row.status as OrderStatus) ?? "pendiente",
  total: money(row.total),
  estimated_profit: money(row.estimated_profit),
  order_date: String(row.order_date ?? ""),
  estimated_delivery: (row.estimated_delivery as string) ?? null,
  payment_method: (row.payment_method as string) ?? null,
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
});

export type NewOrderItem = {
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  production_cost: number | null;
};

export type NewOrderInput = {
  customer_id: string;
  status: OrderStatus;
  order_date: string;
  estimated_delivery: string | null;
  payment_method: string | null;
  notes: string | null;
  items: NewOrderItem[];
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
    .select("*, customer:customers(*), items:order_items(*), images:order_images(*)");

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

  const total = Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100;
  const estimatedProfit = Math.round(
    items.reduce((s, i) => s + (i.unit_price - (i.production_cost ?? 0)) * i.quantity, 0) * 100
  ) / 100;

  const { data: order, error } = await createClient()
    .from("orders")
    .insert({
      customer_id: input.customer_id,
      status: input.status,
      total,
      estimated_profit: estimatedProfit,
      order_date: input.order_date,
      estimated_delivery: input.estimated_delivery || null,
      payment_method: input.payment_method || null,
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
    });
    if (itemError) throw new Error("No se pudieron guardar los productos del pedido.");
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
  const active = orderList.filter((o) => !NON_REVENUE.has(o.status));

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
      created_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error("No se pudo crear el producto.");
  return mapProduct(data as Record<string, unknown>);
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
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
  const out: SettingsRecord = {};
  for (const row of data ?? []) {
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

  for (const o of orders) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
    if (o.order_date.startsWith(monthPrefix) && !NON_REVENUE.has(o.status)) {
      month_sales += o.total;
      month_profit += o.estimated_profit;
    }
  }

  return {
    counts,
    month_sales,
    month_profit,
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
          };
        })
      : [];
    return o;
  });

  const active = orderList.filter((o) => !NON_REVENUE.has(o.status));

  const sales = Math.round(active.reduce((s, o) => s + o.total, 0) * 100) / 100;
  const profit = Math.round(active.reduce((s, o) => s + o.estimated_profit, 0) * 100) / 100;
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
  bucket: "products" | "orders",
  paths: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const clean = [...new Set(paths.filter((p): p is string => !!p && !/^https?:\/\//.test(p)))];
  const out: Record<string, string> = {};
  for (const p of paths) {
    if (p && /^https?:\/\//.test(p)) out[p] = p;
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