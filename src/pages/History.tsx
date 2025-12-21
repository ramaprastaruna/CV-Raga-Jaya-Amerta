import React, { useState, useEffect } from 'react';
import { Search, Eye, Trash2, Calendar, Download, Edit2, CheckCircle, X, FileText } from 'lucide-react';
import { supabase, TransactionWithItems } from '../lib/supabase';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { EditNotaModal } from '../components/nota/EditNotaModal';

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
  const [activeTab, setActiveTab] = useState<'draft' | 'final'>('draft');
  const [timePeriod, setTimePeriod] = useState<'all' | 'today' | 'month' | 'year'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; transactionId: string | null; transactionNumber: string }>({ isOpen: false, transactionId: null, transactionNumber: '' });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithItems | null>(null);
  const [finalizeConfirmModal, setFinalizeConfirmModal] = useState<{ isOpen: boolean; transactionId: string | null; transactionNumber: string }>({ isOpen: false, transactionId: null, transactionNumber: '' });

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
  }, [searchQuery, transactions, timePeriod, selectedMonth, activeTab]);

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

    // Filter by status based on active tab
    if (activeTab === 'draft') {
      filtered = filtered.filter(t => t.status === 'pending');
    } else {
      filtered = filtered.filter(t => t.status === 'completed');
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonth = now.getMonth();
    const startOfCurrentMonth = new Date(now.getFullYear(), currentMonth, 1);
    const startOfNextCurrentMonth = new Date(now.getFullYear(), currentMonth + 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    if (timePeriod === 'today') {
      filtered = filtered.filter((t) => new Date(t.created_at) >= today);
    } else if (timePeriod === 'month') {
      // Gunakan bulan saat ini, BUKAN selectedMonth
      filtered = filtered.filter((t) => {
        const created = new Date(t.created_at);
        return created >= startOfCurrentMonth && created < startOfNextCurrentMonth;
      });
    } else if (timePeriod === 'year') {
      // Gunakan selectedMonth dari dropdown
      filtered = filtered.filter((t) => {
        const created = new Date(t.created_at);
        // Jika selectedMonth = -1 (Semua Bulan), hanya filter tahun ini
        if (selectedMonth === -1) {
          return created >= startOfYear;
        }
        return created >= startOfYear && created.getMonth() === selectedMonth;
      });
    } else if (timePeriod === 'all') {
      // Gunakan selectedMonth dari dropdown
      // Jika selectedMonth = -1 (Semua Bulan), tampilkan semua
      if (selectedMonth !== -1) {
        filtered = filtered.filter((t) => {
          const created = new Date(t.created_at);
          return created.getMonth() === selectedMonth;
        });
      }
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

  const handleEdit = (transaction: TransactionWithItems) => {
    setEditingTransaction(transaction);
    setEditModalOpen(true);
  };

  const openFinalizeConfirm = (transaction: TransactionWithItems) => {
    setFinalizeConfirmModal({ isOpen: true, transactionId: transaction.id, transactionNumber: transaction.transaction_number });
  };

  const handleFinalize = async (id: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          created_at: now,
          updated_at: now
        })
        .eq('id', id);

      if (error) throw error;
      onSuccess('Nota berhasil difinalisasi');
      fetchTransactions();
      setFinalizeConfirmModal({ isOpen: false, transactionId: null, transactionNumber: '' });
    } catch (error: any) {
      onError('Gagal memfinalisasi nota');
      setFinalizeConfirmModal({ isOpen: false, transactionId: null, transactionNumber: '' });
    }
  };

  const viewDetails = (transaction: TransactionWithItems) => {
    setSelectedTransaction(transaction);
    setIsDetailModalOpen(true);
  };

  const exportToPDF = async (transaction: TransactionWithItems) => {
    try {
      // Fetch sales phone if sales_id exists
      let salesPhone = undefined;
      if ((transaction as any).sales_id) {
        const { data: salesData } = await supabase
          .from('sales')
          .select('phone')
          .eq('id', (transaction as any).sales_id)
          .single();
        salesPhone = salesData?.phone;
      }

      await generateInvoicePDF({
        transaction_number: transaction.transaction_number,
        customer_name: transaction.customer_name,
        customer_address: transaction.customer_address,
        sales_name: (transaction as any).sales_name,
        sales_phone: salesPhone,
        transaction_date: transaction.created_at,
        payment_terms_days: (transaction as any).payment_terms_days,
        notes: transaction.notes,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-black mb-8">Nota</h2>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* Tab Draft/Final with premium pill design */}
          <div className="inline-flex items-center bg-gray-100 rounded-xl p-1.5 gap-1">
            <button
              onClick={() => setActiveTab('draft')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'draft'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Draft
            </button>
            <button
              onClick={() => setActiveTab('final')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'final'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Final
            </button>
          </div>

          {/* Time Period Filters with refined design */}
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              onClick={() => setTimePeriod('all')}
              variant={timePeriod === 'all' ? 'primary' : 'secondary'}
              className="text-sm"
            >
              Semua
            </Button>
            <Button
              onClick={() => setTimePeriod('year')}
              variant={timePeriod === 'year' ? 'primary' : 'secondary'}
              className="text-sm"
            >
              Tahun Ini
            </Button>
            <Button
              onClick={() => setTimePeriod('month')}
              variant={timePeriod === 'month' ? 'primary' : 'secondary'}
              className="text-sm"
            >
              Bulan Ini
            </Button>
            <Button
              onClick={() => setTimePeriod('today')}
              variant={timePeriod === 'today' ? 'primary' : 'secondary'}
              className="text-sm"
            >
              Hari Ini
            </Button>
            {(timePeriod === 'all' || timePeriod === 'year') && (
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
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Cari nomor transaksi atau nama pelanggan"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
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
                  Sales
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
                    {(transaction as any).sales_name || '-'}
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
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {transaction.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            onClick={() => handleEdit(transaction)}
                            className="p-2 text-blue-600 hover:bg-blue-50"
                            title="Edit Nota"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => openFinalizeConfirm(transaction)}
                            className="p-2 text-green-600 hover:bg-green-50"
                            title="Finalisasi Nota"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => exportToPDF(transaction)}
                        className="p-2"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => openDeleteConfirm(transaction)}
                        className="p-2 text-red-600 hover:bg-red-50"
                        title="Hapus Nota"
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
          <p className="text-gray-600">
            {activeTab === 'draft'
              ? 'Tidak ada nota draft'
              : 'Tidak ada nota final'}
          </p>
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

            {(selectedTransaction as any).sales_name && (
              <div>
                <p className="text-sm text-gray-600">Sales</p>
                <p className="font-medium text-black">
                  {(selectedTransaction as any).sales_name}
                </p>
              </div>
            )}

            {(selectedTransaction as any).payment_terms_days && (() => {
              const paymentTerms = (selectedTransaction as any).payment_terms_days;
              const daysMatch = paymentTerms.match(/(\d+)/);
              let dueDate = '';

              if (daysMatch) {
                const days = parseInt(daysMatch[1]);
                const transactionDate = new Date(selectedTransaction.created_at);
                const calculatedDueDate = new Date(transactionDate);
                calculatedDueDate.setDate(calculatedDueDate.getDate() + days);
                dueDate = calculatedDueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
              }

              return (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Term of Payment</p>
                  <p className="font-medium text-black">
                    {paymentTerms}{dueDate && ` (${dueDate})`}
                  </p>
                </div>
              );
            })()}

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
                      <th className="px-3 py-2 text-right text-xs font-semibold text-black w-40">
                        Harga/Unit
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-black w-24">
                        Diskon
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-black w-40">
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

                      // Calculate base price (before discount)
                      const basePricePerUnit = unitPrice + discountAmount;

                      // Get discount breakdown text
                      let discountBreakdown = '';
                      if (item.discount_details) {
                        const details = item.discount_details;
                        if (details.discount2 && details.discount2 > 0) {
                          discountBreakdown = `${details.discount1}% + ${details.discount2}%`;
                        } else if (details.discount1 && details.discount1 > 0) {
                          discountBreakdown = `${details.discount1}%`;
                        }
                      }
                      if (!discountBreakdown && discountPercent > 0) {
                        discountBreakdown = `${discountPercent.toFixed(1)}%`;
                      }

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
                            Rp {(Math.round(basePricePerUnit * 100) / 100).toLocaleString('id-ID')}
                          </td>
                          <td className="px-3 py-2 text-sm text-center text-gray-600">
                            {discountBreakdown || '-'}
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

            <div className="flex gap-2">
              {selectedTransaction.status === 'pending' && (
                <>
                  <Button
                    onClick={() => {
                      handleEdit(selectedTransaction);
                      setIsDetailModalOpen(false);
                    }}
                    className="flex-1"
                    variant="secondary"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Nota
                  </Button>
                  <Button
                    onClick={() => {
                      openFinalizeConfirm(selectedTransaction);
                      setIsDetailModalOpen(false);
                    }}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Finalisasi
                  </Button>
                </>
              )}
              <Button
                onClick={() => exportToPDF(selectedTransaction)}
                className={selectedTransaction.status === 'pending' ? 'flex-1' : 'w-full'}
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Nota Modal */}
      {editingTransaction && (
        <EditNotaModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingTransaction(null);
          }}
          transaction={editingTransaction}
          onSuccess={onSuccess}
          onError={onError}
          onUpdate={fetchTransactions}
        />
      )}

      {/* Finalize Confirmation Modal */}
      <Modal
        isOpen={finalizeConfirmModal.isOpen}
        onClose={() => setFinalizeConfirmModal({ isOpen: false, transactionId: null, transactionNumber: '' })}
        title="Finalisasi Nota"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 font-medium text-sm">
              Perhatian: Setelah difinalisasi, nota tidak dapat diedit lagi.
            </p>
            <p className="text-yellow-700 text-xs mt-1">
              Nota hanya dapat dilihat, didownload, dan dihapus.
            </p>
          </div>
          <p className="text-gray-600">
            Yakin ingin memfinalisasi nota <span className="font-semibold text-black">{finalizeConfirmModal.transactionNumber}</span>?
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => setFinalizeConfirmModal({ isOpen: false, transactionId: null, transactionNumber: '' })}
            >
              Batal
            </Button>
            <Button
              onClick={() => finalizeConfirmModal.transactionId && handleFinalize(finalizeConfirmModal.transactionId)}
            >
              Finalisasi
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, transactionId: null, transactionNumber: '' })}
        title="Konfirmasi Hapus"
      >
        <div className="space-y-4">
          {transactions.find(t => t.id === deleteConfirmModal.transactionId)?.status === 'completed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium text-sm">
                Peringatan: Anda akan menghapus nota yang sudah difinalisasi.
              </p>
              <p className="text-red-700 text-xs mt-1">
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          )}
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
