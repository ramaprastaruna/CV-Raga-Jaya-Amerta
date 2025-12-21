import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, Calendar, FileText, BarChart3, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import ExcelJS from 'exceljs';

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

interface RecapData {
  id: string;
  transaction_number: string;
  sales_name: string;
  customer_name: string;
  created_at: string;
  payment_terms_days: string;
  total_amount: number;
}

export const Reports: React.FC<ReportsProps> = ({ onError }) => {
  const [activeTab, setActiveTab] = useState<'sales-report' | 'sales-recap'>('sales-report');
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

  // Recap states
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapData, setRecapData] = useState<RecapData[]>([]);
  const [recapMonth, setRecapMonth] = useState<number>(new Date().getMonth());
  const [recapYear, setRecapYear] = useState<number>(new Date().getFullYear());

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

  useEffect(() => {
    if (activeTab === 'sales-recap') {
      fetchRecapData();
    }
  }, [activeTab, recapMonth, recapYear]);

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

  const fetchRecapData = async () => {
    try {
      setRecapLoading(true);

      // Get start and end date for selected month
      const startDate = new Date(recapYear, recapMonth, 1);
      const endDate = new Date(recapYear, recapMonth + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      setRecapData(data || []);
    } catch (error: any) {
      onError('Gagal memuat data rekap penjualan');
      console.error(error);
    } finally {
      setRecapLoading(false);
    }
  };

  const getPaymentTerm = (paymentTerms: string, createdAt: string): string => {
    const cashMatch = paymentTerms?.match(/cash/i);
    if (cashMatch) return 'Cash';

    const daysMatch = paymentTerms?.match(/(\d+)/);
    if (!daysMatch) return '-';

    const days = parseInt(daysMatch[1]);
    const date = new Date(createdAt);
    date.setDate(date.getDate() + days);

    const dueDate = date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `${days} hari (${dueDate})`;
  };

  const exportToExcel = async () => {
    if (recapData.length === 0) {
      onError('Tidak ada data untuk diekspor');
      return;
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekap Penjualan');

    // Add title row
    const titleRow = worksheet.addRow([`REKAP PENJUALAN - ${monthNames[recapMonth].toUpperCase()} ${recapYear}`]);
    worksheet.mergeCells('A1:F1');
    titleRow.font = { bold: true, size: 13 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add empty row
    worksheet.addRow([]);

    // Add header row
    const headerRow = worksheet.addRow(['No. Transaksi', 'Sales', 'Customer', 'Tanggal', 'Term of Payment', 'Total']);
    headerRow.font = { bold: true, size: 11 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'medium', color: { argb: 'FF000000' } },
      };
    });

    // Add data rows
    let totalAmount = 0;
    recapData.forEach((item) => {
      const row = worksheet.addRow([
        item.transaction_number.replace(/_/g, '/'),
        item.sales_name || '-',
        item.customer_name,
        new Date(item.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        getPaymentTerm(item.payment_terms_days, item.created_at),
        item.total_amount,
      ]);

      row.alignment = { vertical: 'middle' };

      // Apply borders and alignment to each cell
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };

        // Format currency column
        if (colNumber === 6) {
          cell.numFmt = 'Rp #,##0';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });

      totalAmount += item.total_amount;
    });

    // Add empty row before total
    const emptyRow = worksheet.addRow([]);
    emptyRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    // Add total row
    const totalRow = worksheet.addRow(['', '', '', '', 'SUBTOTAL', totalAmount]);
    totalRow.font = { bold: true, size: 11 };

    totalRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };

      if (colNumber === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (colNumber === 6) {
        cell.numFmt = 'Rp #,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });

    // Set optimal column widths
    worksheet.columns.forEach((column) => {
      if (!column || !column.eachCell) return;

      let maxLength = 0;

      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        const cellLength = cellValue.length;

        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });

      // Use character count directly with minimal adjustment
      const calculatedWidth = maxLength > 0 ? maxLength + 0.5 : 10;
      column.width = calculatedWidth > 30 ? 30 : calculatedWidth;
    });

    // Generate filename
    const filename = `Rekap_Penjualan_${monthNames[recapMonth]}_${recapYear}.xlsx`;

    // Write to file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
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
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-black mb-8">Laporan</h2>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* Tab Laporan Penjualan/Rekap Penjualan with premium pill design */}
          <div className="inline-flex items-center bg-gray-100 rounded-xl p-1.5 gap-1">
            <button
              onClick={() => setActiveTab('sales-report')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'sales-report'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Laporan Penjualan
            </button>
            <button
              onClick={() => setActiveTab('sales-recap')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'sales-recap'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Rekap Penjualan
            </button>
          </div>

          {/* Time Period Filters - only show for sales-report */}
          {activeTab === 'sales-report' && (
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
          )}
        </div>
      </div>

      {activeTab === 'sales-report' ? (
        <>
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
        </>
      ) : (
        <>
          {/* Filter Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-3 items-center flex-wrap">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bulan</label>
                  <select
                    value={recapMonth}
                    onChange={(e) => setRecapMonth(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black min-w-[150px]"
                  >
                    {monthNames.map((month, idx) => (
                      <option key={idx} value={idx}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tahun</label>
                  <select
                    value={recapYear}
                    onChange={(e) => setRecapYear(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black min-w-[120px]"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                onClick={exportToExcel}
                variant="primary"
                className="inline-flex items-center gap-2"
                disabled={recapData.length === 0 || recapLoading}
              >
                <Download className="w-4 h-4" />
                Export ke Excel
              </Button>
            </div>
          </div>

          {/* Table Section */}
          {recapLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
            </div>
          ) : recapData.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider">
                        No. Transaksi
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider">
                        Sales
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider">
                        Term of Payment
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-black uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recapData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-black font-medium">
                          {item.transaction_number.replace(/_/g, '/')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.sales_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.customer_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(item.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {getPaymentTerm(item.payment_terms_days, item.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-black font-medium text-right">
                          Rp {item.total_amount.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-black text-right">
                        Subtotal
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-black text-right">
                        Rp {recapData.reduce((sum, item) => sum + item.total_amount, 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Tidak ada data rekap penjualan untuk {monthNames[recapMonth]} {recapYear}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
