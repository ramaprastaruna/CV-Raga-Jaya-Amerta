import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';

interface ReportsProps {
  onError: (message: string) => void;
}

interface SalesData {
  totalRevenue: number;
  totalTransactions: number;
  averageTransaction: number;
  dailyRevenue: Array<{ date: string; amount: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number; unit: string }>;
}

export const Reports: React.FC<ReportsProps> = ({ onError }) => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all' | 'day' | 'month' | 'year'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);
  const [salesData, setSalesData] = useState<SalesData>({
    totalRevenue: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    dailyRevenue: [],
    topProducts: [],
  });

  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  useEffect(() => {
    fetchSalesData();
  }, [period, selectedMonth]);

  const getDateRange = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    let startDate = new Date();
    let endDate = new Date(now);

    switch (period) {
      case 'all':
        // For 'all', get all data then filter by selected month
        startDate = new Date(0); // Start from epoch
        endDate = new Date(now.getFullYear() + 1, 0, 1); // End next year
        break;
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        // Gunakan bulan saat ini, BUKAN selectedMonth
        startDate = new Date(now.getFullYear(), currentMonth, 1);
        endDate = new Date(now.getFullYear(), currentMonth + 1, 1);
        break;
      case 'year':
        // For 'year', get all data from current year then filter by selected month
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
    }

    return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
  };

  const fetchSalesData = async () => {
    try {
      const { startDate, endDate } = getDateRange();

      let { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (transError) throw transError;

      // Filter by selected month for 'all' and 'year' periods
      // Jika selectedMonth = -1 (Semua Bulan), tidak filter berdasarkan bulan
      if ((period === 'all' || period === 'year') && selectedMonth !== -1) {
        transactions = transactions?.filter((t) => {
          const created = new Date(t.created_at);
          return created.getMonth() === selectedMonth;
        }) || [];
      }

      const totalRevenue = transactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0;
      const totalTransactions = transactions?.length || 0;
      const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      const dailyRevenueMap = new Map<string, number>();
      transactions?.forEach((t) => {
        const date = new Date(t.created_at).toISOString().split('T')[0];
        dailyRevenueMap.set(date, (dailyRevenueMap.get(date) || 0) + t.total_amount);
      });

      const dailyRevenue = Array.from(dailyRevenueMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const productMap = new Map<string, { quantity: number; revenue: number; unit: string }>();
      transactions?.forEach((t) => {
        t.transaction_items.forEach((item: any) => {
          const key = `${item.product_name}|${item.unit}`;
          const existing = productMap.get(key) || { quantity: 0, revenue: 0, unit: item.unit };
          productMap.set(key, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.subtotal,
            unit: item.unit,
          });
        });
      });

      const topProducts = Array.from(productMap.entries())
        .map(([key, data]) => {
          const [name] = key.split('|');
          return { name, ...data };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setSalesData({
        totalRevenue,
        totalTransactions,
        averageTransaction,
        dailyRevenue,
        topProducts,
      });
    } catch (error: any) {
      const errorMessage = error.message?.includes('violates')
        ? 'Terjadi kesalahan saat memuat laporan'
        : 'Gagal memuat laporan';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const periodLabels = {
    all: 'Semua',
    day: 'Hari Ini',
    month: 'Bulan Ini',
    year: 'Tahun Ini',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const maxRevenue = Math.max(...salesData.dailyRevenue.map((d) => d.amount), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold text-black">Laporan Penjualan</h2>
        <div className="flex flex-wrap gap-2 items-center">
          {(['all', 'year', 'month', 'day'] as const).map((p) => (
            <Button
              key={p}
              onClick={() => setPeriod(p)}
              variant={period === p ? 'primary' : 'secondary'}
              className="text-sm"
            >
              {periodLabels[p]}
            </Button>
          ))}
          {(period === 'all' || period === 'year') && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
              aria-label="Pilih Bulan"
            >
              <option value={-1}>Semua Bulan</option>
              {monthNames.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Pendapatan</p>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-black">
            Rp {salesData.totalRevenue.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Transaksi</p>
            <ShoppingBag className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-black">{salesData.totalTransactions}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Rata-rata Transaksi</p>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-black">
            Rp {Math.round(salesData.averageTransaction).toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Pendapatan Harian
          </h3>
          {salesData.dailyRevenue.length > 0 ? (
            <div className="space-y-3">
              {salesData.dailyRevenue.map((item) => (
                <div key={item.date}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">
                      {new Date(item.date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span className="text-sm font-medium text-black">
                      Rp {item.amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-black h-full rounded-full transition-all duration-500"
                      style={{ width: `${(item.amount / maxRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 py-8">Belum ada data</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Top 5 Produk
          </h3>
          {salesData.topProducts.length > 0 ? (
            <div className="space-y-4">
              {salesData.topProducts.map((product, index) => (
                <div key={product.name} className="border-b border-gray-200 pb-3 last:border-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-black">
                          {index + 1}
                        </span>
                        <span className="font-medium text-black">{product.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-8 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Terjual: {product.quantity} {product.unit}</span>
                    <span className="font-medium text-black">
                      Rp {product.revenue.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 py-8">Belum ada data</p>
          )}
        </div>
      </div>

      {salesData.totalTransactions === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Belum ada transaksi pada periode ini</p>
        </div>
      )}
    </div>
  );
};
