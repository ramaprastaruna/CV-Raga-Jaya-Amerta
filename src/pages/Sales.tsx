import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { supabase, Sales as SalesType } from '../lib/supabase';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';

interface SalesProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export const Sales: React.FC<SalesProps> = ({ onError, onSuccess }) => {
  const { user } = useAuth();
  const [salesList, setSalesList] = useState<SalesType[]>([]);
  const [filteredSales, setFilteredSales] = useState<SalesType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSales, setEditingSales] = useState<SalesType | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; salesId: string | null; salesName: string }>({
    isOpen: false,
    salesId: null,
    salesName: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    fetchSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [searchQuery, salesList]);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setSalesList(data || []);
    } catch (error: any) {
      onError('Gagal memuat data sales');
    } finally {
      setLoading(false);
    }
  };

  const filterSales = () => {
    let filtered = salesList;

    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.phone.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredSales(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      onError('Nama sales wajib diisi');
      return;
    }

    if (!formData.phone) {
      onError('No. HP sales wajib diisi');
      return;
    }

    try {
      if (editingSales) {
        const { error } = await supabase
          .from('sales')
          .update({
            name: formData.name,
            phone: formData.phone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSales.id);

        if (error) throw error;
        onSuccess('Sales berhasil diupdate');
      } else {
        const { error } = await supabase.from('sales').insert({
          name: formData.name,
          phone: formData.phone,
          created_by: user?.id,
        });

        if (error) throw error;
        onSuccess('Sales berhasil ditambahkan');
      }

      closeModal();
      fetchSales();
    } catch (error: any) {
      onError('Gagal menyimpan sales');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (error) throw error;
      onSuccess('Sales berhasil dihapus');
      fetchSales();
      setDeleteConfirmModal({ isOpen: false, salesId: null, salesName: '' });
    } catch (error: any) {
      onError('Gagal menghapus sales');
      setDeleteConfirmModal({ isOpen: false, salesId: null, salesName: '' });
    }
  };

  const openDeleteConfirm = (sales: SalesType) => {
    setDeleteConfirmModal({ isOpen: true, salesId: sales.id, salesName: sales.name });
  };

  const openModal = (sales?: SalesType) => {
    if (sales) {
      setEditingSales(sales);
      setFormData({
        name: sales.name,
        phone: sales.phone,
      });
    } else {
      setEditingSales(null);
      setFormData({
        name: '',
        phone: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSales(null);
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
          <h2 className="text-2xl font-bold text-black">Sales</h2>
        </div>
        <Button onClick={() => openModal(undefined)}>
          <Plus className="w-4 h-4" />
          Tambah Sales
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari sales"
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
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-black">Nama</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-black">No. HP</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-black"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-600">
                  {searchQuery ? 'Tidak ada sales ditemukan' : 'Belum ada sales'}
                </td>
              </tr>
            ) : (
              filteredSales.map((sales) => (
                <tr key={sales.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-black">{sales.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {sales.phone || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => openModal(sales)}
                        variant="secondary"
                        className="text-sm py-2 px-3"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => openDeleteConfirm(sales)}
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
        title={editingSales ? 'Edit Sales' : 'Tambah Sales'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Sales <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. HP <span className="text-red-500">*</span>
            </label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {editingSales ? 'Update Sales' : 'Tambah Sales'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Batal
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, salesId: null, salesName: '' })}
        title="Konfirmasi Hapus"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Yakin ingin menghapus sales <span className="font-semibold text-black">{deleteConfirmModal.salesName}</span>?
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmModal({ isOpen: false, salesId: null, salesName: '' })}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirmModal.salesId && handleDelete(deleteConfirmModal.salesId)}
            >
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
