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

export interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  recentTransactions: (Purchase | Sale)[];
}
