import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Purchase, Sale } from '../types';
import { Download, FileText, Package, TrendingUp, TrendingDown } from 'lucide-react';

export function Reports() {
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [productsRes, purchasesRes, salesRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('purchases').select('*'),
      supabase.from('sales').select('*'),
    ]);

    setProducts(productsRes.data as Product[] || []);
    setPurchases(purchasesRes.data as Purchase[] || []);
    setSales(salesRes.data as Sale[] || []);
    setLoading(false);
  };

  const exportInventoryCSV = () => {
    const headers = ['Name', 'SKU', 'Stock', 'Reorder Level', 'Unit', 'Status'];
    const rows = products.map((p) => [
      p.name,
      p.sku,
      p.stock.toString(),
      p.reorder_level.toString(),
      p.unit,
      p.stock <= p.reorder_level ? 'Low Stock' : 'In Stock',
    ]);

    downloadCSV('inventory-report', headers, rows);
  };

  const exportPurchasesCSV = () => {
    const headers = ['Date', 'Product ID', 'Quantity', 'Note'];
    const rows = purchases.map((p) => [
      new Date(p.created_at).toLocaleDateString(),
      p.product_id,
      p.quantity.toString(),
      p.note || '',
    ]);

    downloadCSV('purchases-report', headers, rows);
  };

  const exportSalesCSV = () => {
    const headers = ['Date', 'Product ID', 'Quantity', 'Note'];
    const rows = sales.map((s) => [
      new Date(s.created_at).toLocaleDateString(),
      s.product_id,
      s.quantity.toString(),
      s.note || '',
    ]);

    downloadCSV('sales-report', headers, rows);
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalSales = sales.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500">Export your inventory data</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Products</p>
              <p className="text-2xl font-bold text-slate-900">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Purchases</p>
              <p className="text-2xl font-bold text-slate-900">{totalPurchases.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Sales</p>
              <p className="text-2xl font-bold text-slate-900">{totalSales.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Inventory Report</h3>
          <p className="text-sm text-slate-500 mb-4 flex-1">
            Export all products with current stock levels and reorder status.
          </p>
          <button
            onClick={exportInventoryCSV}
            disabled={loading || products.length === 0}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Purchases Report</h3>
          <p className="text-sm text-slate-500 mb-4 flex-1">
            Export all purchase records with dates and quantities.
          </p>
          <button
            onClick={exportPurchasesCSV}
            disabled={loading || purchases.length === 0}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Sales Report</h3>
          <p className="text-sm text-slate-500 mb-4 flex-1">
            Export all sales records with dates and quantities.
          </p>
          <button
            onClick={exportSalesCSV}
            disabled={loading || sales.length === 0}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
