import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Product, Purchase, Sale } from '../types';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface Stats {
  totalProducts: number;
  totalStock: number;
  lowStockProducts: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, totalStock: 0, lowStockProducts: 0 });
  const [recentTransactions, setRecentTransactions] = useState<(Purchase | Sale)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);

    const [productsRes, purchasesRes, salesRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('purchases').select('*, product:products(name, sku)').order('created_at', { ascending: false }).limit(5),
      supabase.from('sales').select('*, product:products(name, sku)').order('created_at', { ascending: false }).limit(5),
    ]);

    const products = productsRes.data as Product[] || [];
    const purchases = purchasesRes.data as Purchase[] || [];
    const sales = salesRes.data as Sale[] || [];

    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStockProducts = products.filter((p) => p.stock <= p.reorder_level).length;

    setStats({
      totalProducts: products.length,
      totalStock,
      lowStockProducts,
    });

    const transactions = [...purchases, ...sales]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    setRecentTransactions(transactions);
    setLoading(false);
  };

  const cards = [
    {
      label: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Total Stock Units',
      value: stats.totalStock.toLocaleString(),
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'Low Stock Alerts',
      value: stats.lowStockProducts,
      icon: AlertTriangle,
      color: 'from-amber-500 to-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Overview of your inventory</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{card.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading...</div>
        ) : recentTransactions.length === 0 ? (
          <div className="p-6 text-center text-slate-500">No transactions yet</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((transaction) => {
              const isPurchase = 'product_id' in transaction && !('quantity' in transaction && transaction.id.startsWith('sale'));
              const isPurchaseTx = 'user_id' in transaction && !('product' in transaction && transaction.id.startsWith('sale'));
              const actualIsPurchase = (transaction as Purchase).product !== undefined || !(transaction as Sale).product;

              return (
                <div key={transaction.id} className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    actualIsPurchase ? 'bg-emerald-100' : 'bg-red-100'
                  }`}>
                    {actualIsPurchase ? (
                      <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {(transaction as Purchase).product?.name || (transaction as Sale).product?.name || 'Unknown Product'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(transaction.created_at).toLocaleDateString()} at{' '}
                      {new Date(transaction.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      actualIsPurchase ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {actualIsPurchase ? '+' : '-'}{transaction.quantity}
                    </p>
                    <p className="text-sm text-slate-500">
                      {actualIsPurchase ? 'Purchase' : 'Sale'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
