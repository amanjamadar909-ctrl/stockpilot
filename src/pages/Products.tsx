import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Product, ProductCSVRow } from '../types';
import { Plus, Search, Edit2, Trash2, X, Package, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';

export function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    stock: 0,
    reorder_level: 10,
    unit: 'pcs',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    setProducts(data as Product[] || []);
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', sku: '', stock: 0, reorder_level: 10, unit: 'pcs' });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      stock: product.stock,
      reorder_level: product.reorder_level,
      unit: product.unit,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    if (!formData.name.trim() || !formData.sku.trim()) {
      setFormError('Name and SKU are required');
      setSaving(false);
      return;
    }

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update({
          name: formData.name.trim(),
          sku: formData.sku.trim(),
          stock: formData.stock,
          reorder_level: formData.reorder_level,
          unit: formData.unit.trim(),
        })
        .eq('id', editingProduct.id);

      if (error) {
        if (error.code === '23505') {
          setFormError('SKU must be unique');
        } else {
          setFormError(error.message);
        }
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('products').insert({
        user_id: user!.id,
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        stock: formData.stock,
        reorder_level: formData.reorder_level,
        unit: formData.unit.trim(),
      });

      if (error) {
        if (error.code === '23505') {
          setFormError('SKU must be unique');
        } else {
          setFormError(error.message);
        }
        setSaving(false);
        return;
      }
    }

    setShowModal(false);
    fetchProducts();
    setSaving(false);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete "${product.name}"? This will also delete all associated purchases and sales.`)) {
      return;
    }

    await supabase.from('products').delete().eq('id', product.id);
    fetchProducts();
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const downloadTemplate = () => {
    const templateData: ProductCSVRow[] = [
      { name: 'Widget A', sku: 'WGT-001', stock: '100', reorder_level: '20', unit: 'pcs' },
      { name: 'Gadget B', sku: 'GDT-002', stock: '50', reorder_level: '10', unit: 'pcs' },
      { name: 'Component C', sku: 'CMP-003', stock: '200', reorder_level: '30', unit: 'kg' },
    ];
    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'products_template.csv';
    link.click();
  };

  const exportProducts = () => {
    if (products.length === 0) {
      alert('No products to export');
      return;
    }
    const exportData = products.map(p => ({
      name: p.name,
      sku: p.sku,
      stock: p.stock.toString(),
      reorder_level: p.reorder_level.toString(),
      unit: p.unit,
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    Papa.parse<ProductCSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const successCount = { value: 0 };
        const errors: { row: number; message: string }[] = [];

        for (let i = 0; i < results.data.length; i++) {
          const row = results.data[i];
          const rowNum = i + 2;

          if (!row.name?.trim() || !row.sku?.trim()) {
            errors.push({ row: rowNum, message: 'Name and SKU are required' });
            continue;
          }

          const stock = parseInt(row.stock) || 0;
          const reorderLevel = parseInt(row.reorder_level) || 0;

          if (stock < 0 || reorderLevel < 0) {
            errors.push({ row: rowNum, message: 'Stock and reorder level must be non-negative numbers' });
            continue;
          }

          const { error } = await supabase.from('products').insert({
            user_id: user!.id,
            name: row.name.trim(),
            sku: row.sku.trim(),
            stock,
            reorder_level: reorderLevel,
            unit: row.unit?.trim() || 'pcs',
          });

          if (error) {
            errors.push({ row: rowNum, message: error.code === '23505' ? 'Duplicate SKU' : error.message });
          } else {
            successCount.value++;
          }
        }

        setImportResults({ success: successCount.value, errors });
        setImporting(false);
        fetchProducts();
      },
      error: (error) => {
        setImportResults({ success: 0, errors: [{ row: 0, message: error.message }] });
        setImporting(false);
      },
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500">Manage your product inventory</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors"
          >
            <Upload className="w-5 h-5" />
            Import
          </button>
          <button
            onClick={exportProducts}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name or SKU..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Products List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            {search ? 'No products found' : 'No products yet. Add your first product!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Product</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">SKU</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Stock</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Reorder Level</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Unit</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-500" />
                        </div>
                        <span className="font-medium text-slate-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-sm">{product.sku}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-sm font-medium ${
                          product.stock <= product.reorder_level
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{product.reorder_level}</td>
                    <td className="px-6 py-4 text-slate-600">{product.unit}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="p-2 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., pcs, kg, liters"
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
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
                  {saving ? 'Saving...' : editingProduct ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-900">Import Products</h2>
              <button
                onClick={() => { setShowImportModal(false); setImportResults(null); }}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
                <div>
                  <p className="font-medium text-slate-900">Download Template</p>
                  <p className="text-sm text-slate-500">Get the CSV format with example data</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="ml-auto px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Download
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">Drop your CSV file here or click to browse</p>
                <p className="text-sm text-slate-400 mb-4">Supported format: CSV with headers (name, sku, stock, reorder_level, unit)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                  disabled={importing}
                />
                <label
                  htmlFor="csv-upload"
                  className={`inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-medium rounded-xl cursor-pointer transition-colors ${importing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-600'}`}
                >
                  {importing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Select CSV File
                    </>
                  )}
                </label>
              </div>

              {importResults && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
                    <CheckCircle className="w-5 h-5" />
                    <span>{importResults.success} products imported successfully</span>
                  </div>
                  {importResults.errors.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2 text-red-700">
                        <AlertCircle className="w-5 h-5" />
                        <span>{importResults.errors.length} rows failed</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1 text-sm text-red-600">
                        {importResults.errors.map((err, idx) => (
                          <div key={idx}>
                            Row {err.row}: {err.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => { setShowImportModal(false); setImportResults(null); }}
                  className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
