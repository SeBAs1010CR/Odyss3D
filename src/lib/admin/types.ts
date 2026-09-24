export type OrderStatus =
  | "cotizacion"
  | "pendiente"
  | "pago_pendiente"
  | "en_produccion"
  | "listo"
  | "entregado"
  | "cancelado";

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
}

export interface Customer {
  id: string;
  name: string;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerWithStats extends Customer {
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
  orders: Order[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  production_cost: number | null;
  total: number;
  colors: string[];
  created_at?: string;
}

export interface OrderAccessory {
  id: string;
  order_id: string;
  accessory_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at?: string;
}

export interface FilamentColor {
  id: string;
  name: string;
  hex: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Accessory {
  id: string;
  name: string;
  price: number;
  cost: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OrderImage {
  id: string;
  order_id: string;
  url: string;
  label: string | null;
  created_at?: string;
}

export interface Order {
  id: string;
  number: number;
  customer_id: string | null;
  status: OrderStatus;
  total: number;
  estimated_profit: number;
  machine_fund: number;
  order_date: string;
  estimated_delivery: string | null;
  payment_method: string | null;
  transport_type: string | null;
  delivery_address: string | null;
  transport_cost: number;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: Pick<Customer, "id" | "name" | "whatsapp"> | null;
  items?: OrderItem[];
  images?: OrderImage[];
  accessories?: OrderAccessory[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image: string | null;
  print_minutes: number | null;
  grams: number | null;
  production_cost: number | null;
  sale_price: number | null;
  is_active: boolean;
  is_ecommerce: boolean;
  colors: string[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
}

export type ContactRequestStatus = "nuevo" | "respondido" | "cerrado";

export interface ContactRequest {
  id: string;
  name: string;
  contact: string;
  message: string | null;
  file_paths: string[];
  status: ContactRequestStatus;
  created_at: string;
}

export type SettingsRecord = Record<string, number>;

/** Configuración compartida de la calculadora (/cal), guardada en settings. */
export interface CalculatorSharedSettings {
  config: Record<string, unknown>;
  filamentPrice: number;
  rollWeight: number;
  rounding: string;
}

export interface DashboardData {
  counts: {
    pendiente: number;
    en_produccion: number;
    listo: number;
    cotizacion: number;
    pago_pendiente: number;
    entregado: number;
    cancelado: number;
  };
  month_sales: number;
  month_profit: number;
  month_machine_fund: number;
  customers_count: number;
  products_count: number;
  recent_orders: Order[];
}

export interface StatisticsData {
  sales: number;
  profit: number;
  machine_fund: number;
  orders_count: number;
  products_sold: number;
  new_customers: number;
  chart: { label: string; value: number }[];
  by_status: { status: OrderStatus; count: number }[];
}