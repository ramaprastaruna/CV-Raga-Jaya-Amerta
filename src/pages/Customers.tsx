import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { supabase, Customer } from '../lib/supabase';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';

interface CustomersProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export const Customers: React.FC<CustomersProps> = ({ onError, onSuccess }) => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; customerId: string | null; customerName: string }>({
    isOpen: false,
    customerId: null,
    customerName: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    payment_terms: [] as string[],
  });

  const [newPaymentTerm, setNewPaymentTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      onError('Gagal memuat data customer');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCustomers(filtered);
  };

  const addPaymentTerm = () => {
    if (newPaymentTerm.trim()) {
      setFormData({
        ...formData,
        payment_terms: [...formData.payment_terms, newPaymentTerm.trim()],
      });
      setNewPaymentTerm('');
    }
  };

  const removePaymentTerm = (index: number) => {
    setFormData({
      ...formData,
      payment_terms: formData.payment_terms.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      onError('Nama customer wajib diisi');
      return;
    }

    if (!formData.address) {
      onError('Alamat customer wajib diisi');
      return;
    }

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: formData.name,
            address: formData.address,
            payment_terms: formData.payment_terms,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
        onSuccess('Customer berhasil diupdate');
      } else {
        const { error } = await supabase.from('customers').insert({
          name: formData.name,
          address: formData.address,
          payment_terms: formData.payment_terms,
          created_by: user?.id,
        });

        if (error) throw error;
        onSuccess('Customer berhasil ditambahkan');
      }

      closeModal();
      fetchCustomers();
    } catch (error: any) {
      onError('Gagal menyimpan customer');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      onSuccess('Customer berhasil dihapus');
      fetchCustomers();
      setDeleteConfirmModal({ isOpen: false, customerId: null, customerName: '' });
    } catch (error: any) {
      onError('Gagal menghapus customer');
      setDeleteConfirmModal({ isOpen: false, customerId: null, customerName: '' });
    }
  };

  const openDeleteConfirm = (customer: Customer) => {
    setDeleteConfirmModal({ isOpen: true, customerId: customer.id, customerName: customer.name });
  };

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        address: customer.address,
        payment_terms: customer.payment_terms || [],
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        address: '',
        payment_terms: [],
      });
    }
    setNewPaymentTerm('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
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
          <h2 className="text-2xl font-bold text-black">Customer</h2>
        </div>
        <Button onClick={() => openModal(undefined)}>
          <Plus className="w-4 h-4" />
          Tambah Customer
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari customer"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-black">Nama</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-black">Alamat</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-black">Term of Payment</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-black"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-600">
                  {searchQuery ? 'Tidak ada customer ditemukan' : 'Belum ada customer'}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-black">{customer.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {customer.address || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {customer.payment_terms && customer.payment_terms.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {customer.payment_terms.map((term, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-0.5 bg-black text-white rounded text-xs font-medium"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => openModal(customer)}
                        variant="secondary"
                        className="text-sm py-2 px-3"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => openDeleteConfirm(customer)}
                        variant="danger"
                        className="text-sm py-2 px-3"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCustomer ? 'Edit Customer' : 'Tambah Customer'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Customer <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alamat <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Term of Payment
            </label>
            <div className="space-y-2">
              {formData.payment_terms.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formData.payment_terms.map((term, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-black text-white rounded text-xs font-medium"
                    >
                      <span>{term}</span>
                      <button
                        type="button"
                        onClick={() => removePaymentTerm(index)}
                        className="hover:text-gray-300 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPaymentTerm}
                  onChange={(e) => setNewPaymentTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addPaymentTerm();
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <Button
                  type="button"
                  onClick={addPaymentTerm}
                  variant="secondary"
                  className="whitespace-nowrap px-3 py-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tambah
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {editingCustomer ? 'Update Customer' : 'Tambah Customer'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Batal
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, customerId: null, customerName: '' })}
        title="Konfirmasi Hapus"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Yakin ingin menghapus customer <span className="font-semibold text-black">{deleteConfirmModal.customerName}</span>?
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmModal({ isOpen: false, customerId: null, customerName: '' })}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirmModal.customerId && handleDelete(deleteConfirmModal.customerId)}
            >
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
