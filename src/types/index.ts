export interface Product {
  id: string;
  user_id: string;
  name: string;
  sku: string;
  stock: number;
  reorder_level: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  note: string | null;
  created_at: string;
  product?: Product;
}

export interface Sale {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  note: string | null;
  created_at: string;
  product?: Product;
}

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  entity_type: 'product' | 'supplier' | 'purchase' | 'sale';
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  diff: Record<string, { old: unknown; new: unknown }> | null;
  created_at: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  recentTransactions: (Purchase | Sale)[];
}

export interface ProductCSVRow {
  name: string;
  sku: string;
  stock: string;
  reorder_level: string;
  unit: string;
}

export interface SupplierCSVRow {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}
