import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Product, Sale } from '../types';
import { Plus, Search, ShoppingCart, X, AlertCircle } from 'lucide-react';

export function Sales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 1,
    note: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [salesRes, productsRes] = await Promise.all([
      supabase
        .from('sales')
        .select('*, product:products(id, name, sku, unit)')
        .order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('name'),
    ]);

    setSales(salesRes.data as Sale[] || []);
    setProducts(productsRes.data as Product[] || []);
    setLoading(false);
  };

  const selectedProduct = products.find((p) => p.id === formData.product_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    if (!formData.product_id) {
      setFormError('Please select a product');
      setSaving(false);
      return;
    }

    if (formData.quantity <= 0) {
      setFormError('Quantity must be positive');
      setSaving(false);
      return;
    }

    const product = products.find((p) => p.id === formData.product_id);
    if (!product) {
      setFormError('Product not found');
      setSaving(false);
      return;
    }

    if (formData.quantity > product.stock) {
      setFormError(`Insufficient stock. Only ${product.stock} ${product.unit} available.`);
      setSaving(false);
      return;
    }

    const { error: saleError } = await supabase.from('sales').insert({
      user_id: user!.id,
      product_id: formData.product_id,
      quantity: formData.quantity,
      note: formData.note.trim() || null,
    });

    if (saleError) {
      setFormError(saleError.message);
      setSaving(false);
      return;
    }

    await supabase
      .from('products')
      .update({ stock: product.stock - formData.quantity })
      .eq('id', formData.product_id);

    setShowModal(false);
    setFormData({ product_id: '', quantity: 1, note: '' });
    fetchData();
    setSaving(false);
  };

  const filteredSales = sales.filter(
    (s) =>
      s.product?.name.toLowerCase().includes(search.toLowerCase()) ||
      s.product?.sku.toLowerCase().includes(search.toLowerCase()) ||
      (s.note && s.note.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales</h1>
          <p className="text-slate-500">Record outgoing stock</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Record Sale
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sales..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading...</div>
        ) : filteredSales.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            {search ? 'No sales found' : 'No sales yet. Record your first sale!'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">
                    {sale.product?.name || 'Unknown Product'}
                  </p>
                  <p className="text-sm text-slate-500">
                    SKU: {sale.product?.sku} | Unit: {sale.product?.unit}
                  </p>
                  {sale.note && (
                    <p className="text-sm text-slate-400 mt-1">{sale.note}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-red-600">-{sale.quantity}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(sale.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-900">Record Sale</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => {
                    setFormData({ ...formData, product_id: e.target.value, quantity: 1 });
                    setFormError(null);
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - Stock: {product.stock} {product.unit}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="p-3 bg-slate-50 rounded-xl text-sm">
                  <p className="text-slate-600">
                    Available: <span className="font-semibold">{selectedProduct.stock}</span> {selectedProduct.unit}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="1"
                  max={selectedProduct?.stock || 999999}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Customer name, Invoice number"
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-medium rounded-xl transition-colors"
                >
                  {saving ? 'Processing...' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
