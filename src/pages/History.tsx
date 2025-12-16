import React, { useState, useEffect } from 'react';
import { Search, Eye, Trash2, Calendar, Download } from 'lucide-react';
import { supabase, TransactionWithItems } from '../lib/supabase';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { generateInvoicePDF } from '../utils/pdfGenerator';

interface HistoryProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export const History: React.FC<HistoryProps> = ({ onError, onSuccess }) => {
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithItems | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'all' | 'today' | 'month' | 'year'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; transactionId: string | null; transactionNumber: string }>({ isOpen: false, transactionId: null, transactionNumber: '' });

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
    fetchTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [searchQuery, transactions, timePeriod, selectedMonth]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      const errorMessage = error.message?.includes('violates')
        ? 'Terjadi kesalahan saat memuat data'
        : 'Gagal memuat riwayat';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfSelectedMonth = new Date(now.getFullYear(), selectedMonth, 1);
    const startOfNextMonth = new Date(now.getFullYear(), selectedMonth + 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    if (timePeriod === 'today') {
      filtered = filtered.filter((t) => new Date(t.created_at) >= today);
    } else if (timePeriod === 'month') {
      filtered = filtered.filter((t) => {
        const created = new Date(t.created_at);
        return created >= startOfSelectedMonth && created < startOfNextMonth;
      });
    } else if (timePeriod === 'year') {
      filtered = filtered.filter((t) => new Date(t.created_at) >= startOfYear);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.transaction_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      onSuccess('Transaksi berhasil dihapus');
      fetchTransactions();
      setDeleteConfirmModal({ isOpen: false, transactionId: null, transactionNumber: '' });
    } catch (error: any) {
      const errorMessage = error.message?.includes('foreign key')
        ? 'Tidak dapat menghapus transaksi yang masih terkait dengan data lain'
        : 'Gagal menghapus transaksi';
      onError(errorMessage);
      setDeleteConfirmModal({ isOpen: false, transactionId: null, transactionNumber: '' });
    }
  };

  const openDeleteConfirm = (transaction: TransactionWithItems) => {
    setDeleteConfirmModal({ isOpen: true, transactionId: transaction.id, transactionNumber: transaction.transaction_number });
  };

  const viewDetails = (transaction: TransactionWithItems) => {
    setSelectedTransaction(transaction);
    setIsDetailModalOpen(true);
  };

  const exportToPDF = async (transaction: TransactionWithItems) => {
    try {
      await generateInvoicePDF({
        transaction_number: transaction.transaction_number,
        customer_name: transaction.customer_name,
        customer_address: transaction.customer_address,
        sales_name: (transaction as any).sales_name,
        transaction_date: transaction.created_at,
        payment_terms_days: (transaction as any).payment_terms_days,
        transaction_items: transaction.transaction_items,
        total_amount: transaction.total_amount || 0,
        grand_total: transaction.grand_total || transaction.total_amount || 0,
      });
      onSuccess('PDF berhasil diunduh');
    } catch (error) {
      console.error('Error generating PDF:', error);
      onError('Gagal membuat PDF. Silakan coba lagi.');
    }
  };

  const loadJsPDF = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      if (window.jspdf) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load jsPDF'));
      document.head.appendChild(script);
    });
  };

  const loadAutoTable = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      if (window.jspdf && window.jspdf.jsPDF.prototype.autoTable) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load autoTable'));
      document.head.appendChild(script);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-black">Riwayat Nota</h2>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            onClick={() => setTimePeriod('all')}
            variant={timePeriod === 'all' ? 'primary' : 'secondary'}
            className="text-sm"
          >
            Semua
          </Button>
          <Button
            onClick={() => setTimePeriod('today')}
            variant={timePeriod === 'today' ? 'primary' : 'secondary'}
            className="text-sm"
          >
            Hari Ini
          </Button>
          <Button
            onClick={() => setTimePeriod('month')}
            variant={timePeriod === 'month' ? 'primary' : 'secondary'}
            className="text-sm"
          >
            Bulan Ini
          </Button>
          <Button
            onClick={() => setTimePeriod('year')}
            variant={timePeriod === 'year' ? 'primary' : 'secondary'}
            className="text-sm"
          >
            Tahun Ini
          </Button>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
            aria-label="Pilih Bulan"
          >
            {monthNames.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Cari nomor transaksi atau nama pelanggan"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                  No. Transaksi
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                  Pelanggan
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-black">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-black">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-black">
                    {transaction.transaction_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {transaction.customer_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(transaction.created_at).toLocaleDateString('id-ID')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-black">
                    Rp {transaction.total_amount.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => viewDetails(transaction)}
                        className="p-2"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => exportToPDF(transaction)}
                        className="p-2"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => openDeleteConfirm(transaction)}
                        className="p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">Tidak ada transaksi ditemukan</p>
        </div>
      )}

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detail Transaksi"
        maxWidth="max-w-3xl"
      >
        {selectedTransaction && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">No. Transaksi</p>
                <p className="font-medium text-black">
                  {selectedTransaction.transaction_number}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tanggal</p>
                <p className="font-medium text-black">
                  {new Date(selectedTransaction.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pelanggan</p>
                <p className="font-medium text-black">
                  {selectedTransaction.customer_name}
                </p>
              </div>
              {selectedTransaction.customer_phone && (
                <div>
                  <p className="text-sm text-gray-600">Telepon</p>
                  <p className="font-medium text-black">
                    {selectedTransaction.customer_phone}
                  </p>
                </div>
              )}
            </div>

            {selectedTransaction.customer_address && (
              <div>
                <p className="text-sm text-gray-600">Alamat</p>
                <p className="font-medium text-black">
                  {selectedTransaction.customer_address}
                </p>
              </div>
            )}

            {(selectedTransaction as any).payment_terms_days && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Term of Payment</p>
                <p className="font-medium text-black">
                  {(selectedTransaction as any).payment_terms_days}
                </p>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-black mb-3">Produk</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-black">
                        Produk
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-black">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-black">
                        Satuan
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-black">
                        Harga/Unit
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-black">
                        Diskon
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-black">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedTransaction.transaction_items.map((item) => {
                      const productName = item.product_name || '';

                      const unitMatch = productName.match(/\(([^)]+)\)$/);
                      const unitInParens = unitMatch ? unitMatch[1] : '';

                      const qtyUnitMatch = unitInParens.match(/^(\d+)\s+(.+)$/);
                      const displayQty = qtyUnitMatch ? parseInt(qtyUnitMatch[1]) : item.quantity;
                      const displayUnit = qtyUnitMatch ? qtyUnitMatch[2] : (unitInParens || 'buah');

                      const nameWithoutUnit = productName.replace(/\s*\([^)]+\)$/, '');

                      const discountPercent = Number(item.discount_percent || 0);
                      const discountAmount = Number(item.discount_amount || 0);
                      const unitPrice = Number(item.unit_price || 0);
                      const subtotal = Number(item.subtotal || 0);

                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-sm text-black">
                            {nameWithoutUnit}
                          </td>
                          <td className="px-3 py-2 text-sm text-center text-gray-600">
                            {displayQty}
                          </td>
                          <td className="px-3 py-2 text-sm text-center text-gray-600">
                            {displayUnit}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-600">
                            Rp {(Math.round(unitPrice * 100) / 100).toLocaleString('id-ID')}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-600">
                            {discountAmount > 0 ? (
                              <div>
                                <div>Rp {(Math.round(discountAmount * 100) / 100).toLocaleString('id-ID')}</div>
                                <div className="text-xs text-gray-500">({discountPercent.toFixed(2)}%)</div>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-right font-medium text-black">
                            Rp {(Math.round(subtotal * 100) / 100).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-2 text-right text-sm text-gray-600"
                      >
                        Subtotal
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-black">
                        Rp {selectedTransaction.transaction_items.reduce((sum, item) => sum + Number(item.subtotal), 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                    {selectedTransaction.transaction_items.some(item => Number(item.discount_amount || 0) > 0 || Number(item.discount_percent || 0) > 0) && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-2 text-right text-sm text-gray-600"
                        >
                          Total Diskon
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-red-600">
                          - Rp {selectedTransaction.transaction_items.reduce((sum, item) => {
                            const productName = item.product_name || '';
                            const unitMatch = productName.match(/\(([^)]+)\)$/);
                            const unitInParens = unitMatch ? unitMatch[1] : '';
                            const qtyUnitMatch = unitInParens.match(/^(\d+)\s+(.+)$/);
                            const displayQty = qtyUnitMatch ? parseInt(qtyUnitMatch[1]) : item.quantity;
                            const discountAmount = Number(item.discount_amount || 0);
                            return sum + (discountAmount * displayQty);
                          }, 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-3 text-right font-bold text-black"
                      >
                        Grand Total
                      </td>
                      <td className="px-3 py-3 text-right text-lg font-bold text-black">
                        Rp {Number(selectedTransaction.total_amount).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {selectedTransaction.notes && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Catatan</p>
                <p className="text-black">{selectedTransaction.notes}</p>
              </div>
            )}

            <Button
              onClick={() => exportToPDF(selectedTransaction)}
              className="w-full"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, transactionId: null, transactionNumber: '' })}
        title="Konfirmasi Hapus"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Yakin ingin menghapus transaksi <span className="font-semibold text-black">{deleteConfirmModal.transactionNumber}</span>?
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmModal({ isOpen: false, transactionId: null, transactionNumber: '' })}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirmModal.transactionId && handleDelete(deleteConfirmModal.transactionId)}
            >
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
