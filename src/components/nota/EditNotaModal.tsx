import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { supabase, TransactionWithItems, Product, Customer, Sales } from '../../lib/supabase';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { ProductSelector } from './ProductSelector';
import { parseTransactionItemsToCart, CartItem } from '../../utils/transactionParser';
import { getDiscountInfo } from '../../utils/discountCalculator';

interface EditNotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionWithItems;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onUpdate: () => void;
}

export const EditNotaModal: React.FC<EditNotaModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSuccess,
  onError,
  onUpdate
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesList, setSalesList] = useState<Sales[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedSales, setSelectedSales] = useState<Sales | null>(null);
  const [notes, setNotes] = useState('');
  const [paymentTermsDays, setPaymentTermsDays] = useState('');
  const [isCustomPaymentTerm, setIsCustomPaymentTerm] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, transaction]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load cart items from transaction
      const cartItems = await parseTransactionItemsToCart(transaction.transaction_items);
      setItems(cartItems);

      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Load sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('name', { ascending: true });

      if (salesError) throw salesError;
      setSalesList(salesData || []);

      // Set initial values
      setNotes(transaction.notes || '');
      setPaymentTermsDays(transaction.payment_terms_days || '');

      // Find and set selected customer
      const customer = customersData?.find(c => c.name === transaction.customer_name) || null;
      setSelectedCustomer(customer);

      // Find and set selected sales
      const sales = salesData?.find(s => s.id === transaction.sales_id) || null;
      setSelectedSales(sales);

      // Check if payment term is custom
      if (customer && transaction.payment_terms_days) {
        const isCustom = !customer.payment_terms.includes(transaction.payment_terms_days);
        setIsCustomPaymentTerm(isCustom);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      onError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId) || null;
    setSelectedCustomer(customer);
    setPaymentTermsDays('');
    setIsCustomPaymentTerm(false);
  };

  const handlePaymentTermChange = (value: string) => {
    if (value === '__custom__') {
      setIsCustomPaymentTerm(true);
      setPaymentTermsDays('');
    } else {
      setIsCustomPaymentTerm(false);
      setPaymentTermsDays(value);
    }
  };

  const handleAddProduct = (product: Product, quantity: number, unit: string) => {
    setItems([...items, { product, quantity, unit }]);
    setShowProductSelector(false);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, value: string) => {
    const updatedItems = [...items];
    // Allow empty string for temporary state, will validate on save
    const newQuantity = value === '' ? 0 : parseInt(value);
    updatedItems[index].quantity = newQuantity;
    setItems(updatedItems);
  };

  const handleUnitChange = (index: number, newUnit: string) => {
    const updatedItems = [...items];
    updatedItems[index].unit = newUnit;
    setItems(updatedItems);
  };

  const calculateItemTotal = (item: CartItem): number => {
    const discountInfo = getDiscountInfo(item.product, item.quantity, item.unit);
    return discountInfo.finalPrice * item.quantity;
  };

  const totalAmount = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  const handleSave = async () => {
    if (!selectedCustomer) {
      onError('Pilih customer terlebih dahulu');
      return;
    }

    if (items.length === 0) {
      onError('Tambahkan minimal satu produk');
      return;
    }

    // Validate quantities
    const invalidItems = items.filter(item => item.quantity <= 0);
    if (invalidItems.length > 0) {
      onError('Jumlah produk tidak boleh kosong atau 0');
      return;
    }

    setSaving(true);
    try {
      // 1. Update transaction
      const { error: transError } = await supabase
        .from('transactions')
        .update({
          customer_name: selectedCustomer.name,
          customer_phone: '',
          customer_address: selectedCustomer.address,
          total_amount: totalAmount,
          notes,
          payment_terms_days: paymentTermsDays || null,
          sales_id: selectedSales?.id || null,
          sales_name: selectedSales?.name || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      if (transError) throw transError;

      // 2. Delete old transaction items
      const { error: deleteError } = await supabase
        .from('transaction_items')
        .delete()
        .eq('transaction_id', transaction.id);

      if (deleteError) throw deleteError;

      // 3. Insert new transaction items
      const transactionItems = items.map((item) => {
        const basePrice = item.product.base_price || item.product.price;
        const discountInfo = getDiscountInfo(item.product, item.quantity, item.unit);
        const finalPrice = discountInfo.finalPrice;

        const discountAmount = basePrice - finalPrice;
        const discountPercent = basePrice > 0 ? ((discountAmount / basePrice) * 100) : 0;

        let discountDetails = null;
        if (discountInfo.discounts.length > 0) {
          discountDetails = {
            discount1: discountInfo.discounts[0] || 0,
            discount2: discountInfo.discounts[1] || 0,
          };
        }

        return {
          transaction_id: transaction.id,
          product_id: item.product.id,
          product_name: `${item.product.name} (${item.quantity} ${item.unit})`,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: finalPrice,
          discount_amount: discountAmount,
          discount_percent: Math.round(discountPercent * 100) / 100,
          discount_details: discountDetails,
          subtotal: finalPrice * item.quantity,
        };
      });

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems);

      if (itemsError) throw itemsError;

      onSuccess('Nota berhasil diupdate');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error saving:', error);
      onError('Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Nota">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Nota" maxWidth="max-w-6xl">
      <div className="space-y-6">
        {/* Transaction Info (Read-only) */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-xs font-medium text-gray-600">No. Nota</div>
            <div className="text-sm font-semibold text-black">{transaction.transaction_number}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-600">Tanggal</div>
            <div className="text-sm text-black">
              {new Date(transaction.created_at).toLocaleDateString('id-ID')}
            </div>
          </div>
        </div>

        {/* Sales Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sales</label>
          <select
            value={selectedSales?.id || ''}
            onChange={(e) => {
              const sales = salesList.find(s => s.id === e.target.value) || null;
              setSelectedSales(sales);
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">Pilih Sales</option>
            {salesList.map((sales) => (
              <option key={sales.id} value={sales.id}>
                {sales.name}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCustomer?.id || ''}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            required
          >
            <option value="">Pilih Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Terms */}
        {selectedCustomer && selectedCustomer.payment_terms && selectedCustomer.payment_terms.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term of Payment</label>
            {isCustomPaymentTerm ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(e.target.value)}
                  placeholder="Masukkan term of payment"
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsCustomPaymentTerm(false);
                    setPaymentTermsDays('');
                  }}
                >
                  Batal
                </Button>
              </div>
            ) : (
              <select
                value={paymentTermsDays}
                onChange={(e) => handlePaymentTermChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">Pilih Term of Payment</option>
                {selectedCustomer.payment_terms.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
                <option value="__custom__">Custom...</option>
              </select>
            )}
          </div>
        )}

        {/* Items Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Produk <span className="text-red-500">*</span>
            </label>
            <Button
              variant="secondary"
              onClick={() => setShowProductSelector(!showProductSelector)}
              className="text-sm py-1.5 px-3"
            >
              {showProductSelector ? (
                <>
                  <X className="w-4 h-4 mr-1" />
                  Tutup
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah Produk
                </>
              )}
            </Button>
          </div>

          {showProductSelector && (
            <div className="mb-4">
              <ProductSelector
                onAddProduct={handleAddProduct}
                existingProductIds={items.map(item => item.product.id)}
              />
            </div>
          )}

          {items.length === 0 ? (
            <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">
              Belum ada produk. Klik "Tambah Produk" untuk memulai.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Produk</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-700">Jumlah</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-700">Satuan</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Harga</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Subtotal</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, index) => {
                    const discountInfo = getDiscountInfo(item.product, item.quantity, item.unit);
                    const subtotal = calculateItemTotal(item);

                    return (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-black">{item.product.name}</div>
                          {discountInfo.hasDiscount && (
                            <div className="text-xs text-green-600">
                              Diskon: {discountInfo.discounts.join(' + ')}%
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <select
                            value={item.unit}
                            onChange={(e) => handleUnitChange(index, e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                          >
                            {item.product.stock_entries && item.product.stock_entries.length > 0 ? (
                              item.product.stock_entries.map((entry) => (
                                <option key={entry.unit} value={entry.unit}>
                                  {entry.unit.charAt(0).toUpperCase() + entry.unit.slice(1)}
                                </option>
                              ))
                            ) : (
                              <>
                                <option value="buah">Buah</option>
                                <option value="box">Box</option>
                                <option value="karton">Karton</option>
                              </>
                            )}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-black">Rp {discountInfo.finalPrice.toLocaleString('id-ID')}</div>
                          {discountInfo.hasDiscount && (
                            <div className="text-xs text-gray-500 line-through">
                              Rp {(item.product.base_price || item.product.price).toLocaleString('id-ID')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-black">
                          Rp {subtotal.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right font-semibold text-black">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-lg text-black">
                      Rp {totalAmount.toLocaleString('id-ID')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Catatan tambahan (opsional)"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} className="flex-1" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
        </div>
      </div>
    </Modal>
  );
};
