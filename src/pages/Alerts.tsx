import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { AlertTriangle, Package, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Alerts() {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('stock', { ascending: true });

    const lowStock = (data as Product[] || []).filter(
      (p) => p.stock <= p.reorder_level
    );
    setLowStockProducts(lowStock);
    setLoading(false);
  };

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) {
      return { label: 'Out of Stock', color: 'bg-red-500' };
    }
    if (product.stock <= product.reorder_level * 0.5) {
      return { label: 'Critical', color: 'bg-red-500' };
    }
    return { label: 'Low Stock', color: 'bg-amber-500' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Low Stock Alerts</h1>
        <p className="text-slate-500">Products that need reordering</p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <p className="text-white/80 text-sm font-medium">Products Below Reorder Level</p>
            <p className="text-4xl font-bold">{lowStockProducts.length}</p>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading...</div>
        ) : lowStockProducts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-slate-600 font-medium">All products are well stocked</p>
            <p className="text-slate-400 text-sm mt-1">No low stock alerts at this time</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {lowStockProducts.map((product) => {
              const status = getStockStatus(product);
              const stockPercentage = product.reorder_level > 0
                ? Math.min(100, (product.stock / product.reorder_level) * 100)
                : 0;

              return (
                <div key={product.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${status.color} flex items-center justify-center flex-shrink-0`}>
                      {product.stock === 0 ? (
                        <AlertCircle className="w-6 h-6 text-white" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{product.name}</p>
                          <p className="text-sm text-slate-500">SKU: {product.sku}</p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                            product.stock === 0 || product.stock <= product.reorder_level * 0.5
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-500">Current Stock</span>
                          <span className="font-medium text-slate-900">
                            {product.stock} / {product.reorder_level} {product.unit}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              product.stock === 0
                                ? 'bg-red-500'
                                : product.stock <= product.reorder_level * 0.5
                                ? 'bg-red-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${stockPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {lowStockProducts.length > 0 && (
        <div className="flex justify-center">
          <Link
            to="/purchases"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            <Package className="w-5 h-5" />
            Record Purchases
          </Link>
        </div>
      )}
    </div>
  );
}
