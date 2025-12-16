import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ShoppingCart, Minus } from 'lucide-react';
import { supabase, Product, DiscountTier, ProductUnit, StockEntry } from '../lib/supabase';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DiscountCalculator } from '../components/products/DiscountCalculator';

interface ProductsProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onCreateNota: (products: Array<{ product: Product; quantity: number; unit: string }>) => void;
  initialCart?: Array<{ product: Product; quantity: number; unit: string }> | null;
}

export const Products: React.FC<ProductsProps> = ({ onError, onSuccess, onCreateNota, initialCart }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number; unit: string }>>(() => {
    if (initialCart && initialCart.length > 0) return initialCart;
    try {
      const stored = localStorage.getItem('cart');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [showCart, setShowCart] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [selectedProductForCart, setSelectedProductForCart] = useState<Product | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; productId: string | null; productName: string }>({ isOpen: false, productId: null, productName: '' });

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    purchasePrice: '',
    stock: '',
    sku: '',
    basePrice: '',
    discountTiers: [] as DiscountTier[],
    units: [{ name: 'buah', quantity: 1 }] as ProductUnit[],
    stockEntries: [] as StockEntry[],
    stockUnit: 'buah',
    stockUnitQuantity: '1',
  });

  const [newTier, setNewTier] = useState({
    minQuantity: '',
    discount: '',
    discount2: '',
    unit: 'buah' as 'buah' | 'box' | 'karton',
    isExact: true,
  });

  const [newStock, setNewStock] = useState({
    unit: '',
    quantity: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, products]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      const errorMessage = error.message?.includes('duplicate key')
        ? 'SKU sudah digunakan. Gunakan SKU yang berbeda.'
        : error.message?.includes('violates')
        ? 'Terjadi kesalahan validasi data'
        : 'Gagal memuat produk';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  };

  const categories = ['all', ...new Set(products.map((p) => p.category).filter(Boolean))];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.sku || !formData.purchasePrice || !formData.basePrice) {
      onError('Semua field yang ditandai (*) wajib diisi');
      return;
    }

    if (formData.stockEntries.length === 0) {
      onError('Minimal satu unit stok harus ditambahkan');
      return;
    }

    try {
      const finalPrice = formData.basePrice
        ? parseFloat(formData.basePrice)
        : parseFloat(formData.price);

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            category: formData.category,
            description: formData.description,
            price: finalPrice,
            purchase_price: parseFloat(formData.purchasePrice) || 0,
            stock: parseInt(formData.stock) || 0,
            sku: formData.sku,
            base_price: parseFloat(formData.basePrice) || finalPrice,
            discount_tiers: formData.discountTiers,
            units: formData.units,
            stock_entries: formData.stockEntries,
            stock_unit: formData.stockUnit,
            stock_unit_quantity: parseInt(formData.stockUnitQuantity) || 1,
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        onSuccess('Produk berhasil diupdate');
      } else {
        const { error } = await supabase.from('products').insert({
          name: formData.name,
          category: formData.category,
          description: formData.description,
          price: finalPrice,
          purchase_price: parseFloat(formData.purchasePrice) || 0,
          stock: parseInt(formData.stock) || 0,
          sku: formData.sku,
          base_price: parseFloat(formData.basePrice) || finalPrice,
          discount_tiers: formData.discountTiers,
          units: formData.units,
          stock_entries: formData.stockEntries,
          stock_unit: formData.stockUnit,
          stock_unit_quantity: parseInt(formData.stockUnitQuantity) || 1,
        });

        if (error) throw error;
        onSuccess('Produk berhasil ditambahkan');
      }

      closeModal();
      fetchProducts();
    } catch (error: any) {
      const errorMessage = error.message?.includes('duplicate key')
        ? 'SKU sudah digunakan. Gunakan SKU yang berbeda.'
        : error.message?.includes('violates')
        ? 'Terjadi kesalahan validasi data'
        : 'Gagal menyimpan produk';
      onError(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      onSuccess('Produk berhasil dihapus');
      fetchProducts();
      setDeleteConfirmModal({ isOpen: false, productId: null, productName: '' });
    } catch (error: any) {
      const errorMessage = error.message?.includes('foreign key')
        ? 'Tidak dapat menghapus produk yang masih digunakan dalam transaksi'
        : 'Gagal menghapus produk';
      onError(errorMessage);
      setDeleteConfirmModal({ isOpen: false, productId: null, productName: '' });
    }
  };

  const openDeleteConfirm = (product: Product) => {
    setDeleteConfirmModal({ isOpen: true, productId: product.id, productName: product.name });
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price.toString(),
        purchasePrice: product.purchase_price?.toString() || '0',
        stock: product.stock.toString(),
        sku: product.sku,
        basePrice: product.base_price?.toString() || product.price.toString(),
        discountTiers: product.discount_tiers || [],
        units: product.units || [{ name: 'buah', quantity: 1 }],
        stockEntries: product.stock_entries || [],
        stockUnit: product.stock_unit || 'buah',
        stockUnitQuantity: product.stock_unit_quantity?.toString() || '1',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: '',
        description: '',
        price: '',
        purchasePrice: '',
        stock: '',
        sku: '',
        basePrice: '',
        discountTiers: [],
        stockEntries: [],
        units: [],
        stockUnit: 'buah',
        stockUnitQuantity: '1',
      });
    }
    setNewTier({ minQuantity: '', discount: '', discount2: '', unit: 'buah', isExact: true });
    setIsModalOpen(true);
  };

  const addDiscountTier = () => {
    const minQty = parseInt(newTier.minQuantity);
    const discount = parseFloat(newTier.discount);
    const discount2 = newTier.discount2 ? parseFloat(newTier.discount2) : undefined;

    if (!newTier.unit) {
      onError('Pilih unit terlebih dahulu');
      return;
    }

    if (!minQty || minQty < 1) {
      onError('Jumlah minimum harus lebih dari 0');
      return;
    }

    if (!discount || discount < 0 || discount > 100) {
      onError('Diskon harus antara 0-100%');
      return;
    }

    if (discount2 && (discount2 < 0 || discount2 > 100)) {
      onError('Diskon 2 harus antara 0-100%');
      return;
    }

    const exists = formData.discountTiers.some(
      (tier) =>
        tier.minQuantity === minQty && tier.unit === newTier.unit && tier.isExact === newTier.isExact
    );

    if (exists) {
      onError('Kombinasi qty, unit, dan tipe diskon sudah ada');
      return;
    }

    setFormData({
      ...formData,
      discountTiers: [
        ...formData.discountTiers,
        { minQuantity: minQty, discount, discount2, unit: newTier.unit, isExact: newTier.isExact },
      ],
    });

    setNewTier({ minQuantity: '', discount: '', discount2: '', unit: newTier.unit, isExact: true });
  };

  const removeDiscountTier = (minQuantity: number, unit: 'buah' | 'box' | 'karton', isExact?: boolean) => {
    setFormData({
      ...formData,
      discountTiers: formData.discountTiers.filter(
        (tier) => !(tier.minQuantity === minQuantity && tier.unit === unit && tier.isExact === isExact)
      ),
    });
  };

  const addStock = () => {
    const unit = newStock.unit.trim();
    const qty = parseInt(newStock.quantity);

    if (!unit) {
      onError('Unit stok harus diisi');
      return;
    }

    if (!qty || qty < 0) {
      onError('Jumlah stok harus 0 atau lebih');
      return;
    }

    const exists = formData.stockEntries.some((s) => s.unit.toLowerCase() === unit.toLowerCase());
    if (exists) {
      onError('Unit stok sudah ada');
      return;
    }

    const updatedStockEntries = [...formData.stockEntries, { unit, quantity: qty }];

    setFormData({
      ...formData,
      stockEntries: updatedStockEntries,
    });

    if (updatedStockEntries.length === 1) {
      setNewTier({ ...newTier, unit: unit as 'buah' | 'box' | 'karton' });
    }

    setNewStock({ unit: '', quantity: '' });
  };

  const removeStock = (index: number) => {
    setFormData({
      ...formData,
      stockEntries: formData.stockEntries.filter((_, i) => i !== index),
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const openUnitSelection = (product: Product) => {
    setSelectedProductForCart(product);
    setSelectedUnit('');
    setQuantityToAdd(0);
    setShowUnitModal(true);
  };

  const addToCartWithUnit = async () => {
    if (!selectedProductForCart || !selectedUnit || quantityToAdd < 1) return;

    const existing = cart.find(
      (item) => item.product.id === selectedProductForCart.id && item.unit === selectedUnit
    );

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === selectedProductForCart.id && item.unit === selectedUnit
            ? { ...item, quantity: item.quantity + quantityToAdd }
            : item
        )
      );
    } else {
      setCart([...cart, { product: selectedProductForCart, quantity: quantityToAdd, unit: selectedUnit }]);
    }

    onSuccess(`${selectedProductForCart.name} (${quantityToAdd} ${selectedUnit}) ditambahkan ke keranjang`);

    setShowUnitModal(false);
    setSelectedProductForCart(null);
    setSelectedUnit('');
    setQuantityToAdd(0);
  };

  const removeFromCart = async (productId: string, unit: string) => {
    setCart(cart.filter((item) => !(item.product.id === productId && item.unit === unit)));
  };

  const updateCartQuantity = async (productId: string, unit: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId, unit);
      return;
    }

    const item = cart.find(i => i.product.id === productId && i.unit === unit);
    if (!item) return;

    setCart(
      cart.map((i) =>
        i.product.id === productId && i.unit === unit ? { ...i, quantity } : i
      )
    );
  };

  const handleCreateNota = () => {
    if (cart.length === 0) {
      onError('Keranjang kosong');
      return;
    }
    onCreateNota(cart);
  };

  const getDiscountInfo = (product: Product, quantity: number, unit?: string) => {
    if (!product.discount_tiers || product.discount_tiers.length === 0) {
      return {
        finalPrice: product.price,
        hasDiscount: false,
        tier: null,
        discounts: []
      };
    }

    const exactTier = product.discount_tiers.find(
      tier => tier.isExact && tier.minQuantity === quantity && (!unit || tier.unit === unit)
    );

    if (exactTier) {
      const basePrice = product.base_price || product.price;
      let pricePerUnit = basePrice;
      const discounts = [];

      pricePerUnit = pricePerUnit - (pricePerUnit * exactTier.discount) / 100;
      discounts.push(exactTier.discount);

      if (exactTier.discount2 && exactTier.discount2 > 0) {
        pricePerUnit = pricePerUnit - (pricePerUnit * exactTier.discount2) / 100;
        discounts.push(exactTier.discount2);
      }

      return {
        finalPrice: pricePerUnit,
        hasDiscount: true,
        tier: exactTier,
        discounts
      };
    }

    const sortedTiers = [...product.discount_tiers]
      .filter(tier => !tier.isExact && (!unit || tier.unit === unit))
      .sort((a, b) => b.minQuantity - a.minQuantity);

    const applicableTier = sortedTiers.find(tier => quantity >= tier.minQuantity);

    if (!applicableTier) {
      return {
        finalPrice: product.price,
        hasDiscount: false,
        tier: null,
        discounts: []
      };
    }

    const basePrice = product.base_price || product.price;
    let pricePerUnit = basePrice;
    const discounts = [];

    pricePerUnit = pricePerUnit - (pricePerUnit * applicableTier.discount) / 100;
    discounts.push(applicableTier.discount);

    if (applicableTier.discount2 && applicableTier.discount2 > 0) {
      pricePerUnit = pricePerUnit - (pricePerUnit * applicableTier.discount2) / 100;
      discounts.push(applicableTier.discount2);
    }

    return {
      finalPrice: pricePerUnit,
      hasDiscount: true,
      tier: applicableTier,
      discounts
    };
  };

  const getPriceForQuantity = (product: Product, quantity: number, unit?: string): number => {
    return getDiscountInfo(product, quantity, unit).finalPrice;
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
          <h2 className="text-2xl font-bold text-black">Produk</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCart(true)} variant="secondary">
            <ShoppingCart className="w-4 h-4" />
            Keranjang ({cart.length})
          </Button>
          <Button onClick={() => openModal(undefined)}>
            <Plus className="w-4 h-4" />
            Tambah Produk
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari produk atau SKU"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'Semua Kategori' : cat}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
          >
            <div className="flex-1 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                {product.category ? (
                  <span className="text-xs text-gray-700 font-medium bg-blue-50 px-2 py-1 rounded border border-blue-100">
                    {product.category}
                  </span>
                ) : (
                  <div></div>
                )}
                {product.sku && (
                  <span className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
                    {product.sku}
                  </span>
                )}
              </div>

              <h3 className="font-bold text-gray-900 text-xl leading-tight mb-4 line-clamp-2 min-h-[3.5rem]">
                {product.name}
              </h3>

              <div className="border-t border-gray-200 pt-4 mt-auto space-y-3">
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-gray-500">Harga Beli:</span>
                    <p className="text-sm font-medium text-gray-700">
                      Rp {product.purchase_price?.toLocaleString('id-ID') || '0'}
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-gray-500">Harga Jual:</span>
                    <p className="text-base font-bold text-gray-900">
                      Rp {product.price.toLocaleString('id-ID')}
                    </p>
                  </div>
                  {product.purchase_price > 0 && product.price > product.purchase_price && (
                    <div className="flex items-baseline justify-between pt-1 border-t border-gray-100">
                      <span className="text-xs text-green-600 font-medium">Margin:</span>
                      <p className="text-sm font-semibold text-green-600">
                        {(((product.price - product.purchase_price) / product.purchase_price) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-500">Stok:</span>
                  <div className="text-xs text-gray-500">
                    {product.stock_entries && product.stock_entries.length > 0
                      ? product.stock_entries.map(s => `${s.quantity} ${s.unit}`).join(', ')
                      : `${product.stock} ${product.stock_unit || 'buah'}`}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-4 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100">
              <Button
                onClick={() => openUnitSelection(product)}
                variant="primary"
                className="flex-1 text-sm py-2.5 font-medium"
              >
                <ShoppingCart className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => openModal(product)}
                variant="secondary"
                className="text-sm py-2.5 px-3.5 font-medium"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => openDeleteConfirm(product)}
                variant="danger"
                className="text-sm py-2.5 px-3.5 font-medium"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">Tidak ada produk ditemukan</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProduct ? 'Edit Produk' : 'Tambah Produk'}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-black text-sm uppercase tracking-wider">
                Informasi Dasar
              </h3>
              <Input
                label={<span>Nama Produk <span className="text-red-500">*</span></span>}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={<span>Kategori <span className="text-red-500">*</span></span>}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                />
                <Input
                  label={<span>SKU <span className="text-red-500">*</span></span>}
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={<span>Harga Beli <span className="text-red-500">*</span></span>}
                  type="number"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  placeholder="Harga dari supplier"
                  required
                />
                <Input
                  label={<span>Harga Jual <span className="text-red-500">*</span></span>}
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value, price: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-black text-sm uppercase tracking-wider">
                Unit & Stok
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={<span>Unit Stok <span className="text-red-500">*</span></span>}
                    value={newStock.unit}
                    onChange={(e) => setNewStock({ ...newStock, unit: e.target.value })}
                  />
                  <Input
                    label={<span>Jumlah Stok <span className="text-red-500">*</span></span>}
                    type="number"
                    value={newStock.quantity}
                    onChange={(e) => setNewStock({ ...newStock, quantity: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  onClick={addStock}
                  variant="secondary"
                  className="w-full"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Stok
                </Button>
              </div>

              {formData.stockEntries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Stok Tersedia:</p>
                  <div className="space-y-2">
                    {formData.stockEntries.map((stock, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2"
                      >
                        <input
                          type="number"
                          value={stock.quantity === 0 ? '' : stock.quantity}
                          onChange={(e) => {
                            const newStockEntries = [...formData.stockEntries];
                            const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                            newStockEntries[index] = {
                              ...newStockEntries[index],
                              quantity: value
                            };
                            setFormData({ ...formData, stockEntries: newStockEntries });
                          }}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm font-medium"
                        />
                        <span className="text-gray-600 text-sm">{stock.unit}</span>
                        <button
                          type="button"
                          onClick={() => removeStock(index)}
                          className="ml-auto text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-black text-sm uppercase tracking-wider">
                Diskon
              </h3>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    {formData.stockEntries.length > 0 ? (
                      <select
                        value={newTier.unit}
                        onChange={(e) =>
                          setNewTier({
                            ...newTier,
                            unit: e.target.value as 'buah' | 'box' | 'karton',
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        <option value="">Pilih Unit</option>
                        {formData.stockEntries.map((stock, index) => (
                          <option key={index} value={stock.unit}>
                            {stock.unit}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-sm">
                        Tambahkan stok terlebih dahulu
                      </div>
                    )}
                  </div>
                  <div>
                    <Input
                      label="Qty"
                      type="number"
                      value={newTier.minQuantity}
                      onChange={(e) =>
                        setNewTier({ ...newTier, minQuantity: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Tipe Diskon:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      checked={newTier.isExact}
                      onChange={() => setNewTier({ ...newTier, isExact: true })}
                      className="w-4 h-4 text-black focus:ring-black"
                    />
                    <span className="text-sm text-gray-700">Spesifik (=)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      checked={!newTier.isExact}
                      onChange={() => setNewTier({ ...newTier, isExact: false })}
                      className="w-4 h-4 text-black focus:ring-black"
                    />
                    <span className="text-sm text-gray-700">Minimal (≥)</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Diskon 1 (%)"
                    type="number"
                    value={newTier.discount}
                    onChange={(e) =>
                      setNewTier({ ...newTier, discount: e.target.value })
                    }
                    min="0"
                    max="100"
                  />
                  <Input
                    label="Diskon 2 (%)"
                    type="number"
                    value={newTier.discount2}
                    onChange={(e) =>
                      setNewTier({ ...newTier, discount2: e.target.value })
                    }
                    min="0"
                    max="100"
                  />
                </div>
                <Button
                  type="button"
                  onClick={addDiscountTier}
                  variant="secondary"
                  className="w-full"
                >
                  <Plus className="w-4 h-4" />
                  Tambah
                </Button>
              </div>

              {formData.discountTiers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Diskon Aktif:</p>
                  <div className="space-y-2">
                    {formData.discountTiers
                      .sort((a, b) => a.minQuantity - b.minQuantity)
                      .map((tier, index) => (
                        <div
                          key={`${tier.minQuantity}-${tier.unit}-${tier.isExact}-${index}`}
                          className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2"
                        >
                          <div className="text-sm">
                            <span className="font-medium text-black">
                              {tier.isExact ? `= ${tier.minQuantity}` : `≥ ${tier.minQuantity}`} {tier.unit}
                            </span>
                            <span className="text-gray-600 mx-2">→</span>
                            <span className="text-black">
                              {tier.discount}%
                              {tier.discount2 ? ` + ${tier.discount2}%` : ''} off
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDiscountTier(tier.minQuantity, tier.unit, tier.isExact)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-black text-sm uppercase tracking-wider mb-4">
              Preview Perhitungan Harga
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <DiscountCalculator
                basePrice={parseFloat(formData.basePrice) || 0}
                discountTiers={formData.discountTiers}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <Button type="submit" className="flex-1">
              {editingProduct ? 'Update Produk' : 'Tambah Produk'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Batal
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        title="Keranjang Belanja"
      >
        {cart.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Keranjang kosong</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => {
              const basePrice = item.product.base_price || item.product.price;
              const discountInfo = getDiscountInfo(item.product, item.quantity, item.unit);
              const finalPrice = discountInfo.finalPrice;
              const subtotal = finalPrice * item.quantity;
              const hasDiscount = discountInfo.hasDiscount;

              return (
                <div
                  key={`${item.product.id}-${item.unit}`}
                  className="flex items-start justify-between border-b border-gray-200 pb-4"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-black">{item.product.name}</h4>
                    <div className="text-xs text-gray-500 mb-2">
                      Unit: {item.unit}
                    </div>
                    <div className="flex items-center gap-2">
                      {hasDiscount ? (
                        <>
                          <p className="text-sm text-gray-400 line-through">
                            Rp {basePrice.toLocaleString('id-ID')}
                          </p>
                          <p className="text-sm font-semibold text-green-600">
                            Rp {finalPrice.toLocaleString('id-ID')}
                          </p>
                          {discountInfo.discounts.length > 0 && (
                            <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded font-medium">
                              -{discountInfo.discounts.reduce((a, b) => a + b, 0)}%
                            </span>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-600">
                          Rp {finalPrice.toLocaleString('id-ID')} / {item.unit}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Subtotal: Rp {subtotal.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        updateCartQuantity(item.product.id, item.unit, item.quantity - 1)
                      }
                      className="w-8 h-8 p-0"
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        updateCartQuantity(item.product.id, item.unit, item.quantity + 1)
                      }
                      className="w-8 h-8 p-0"
                    >
                      +
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => removeFromCart(item.product.id, item.unit)}
                      className="ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <div className="pt-4">
                <div className="flex justify-between items-center mb-4">
                <span className="font-semibold">Total:</span>
                <span className="text-xl font-bold">
                  Rp{' '}
                  {cart
                    .reduce(
                      (sum, item) => {
                        const finalPrice = getPriceForQuantity(item.product, item.quantity, item.unit);
                        return sum + finalPrice * item.quantity;
                      },
                      0
                    )
                    .toLocaleString('id-ID')}
                </span>
              </div>
              <Button onClick={handleCreateNota} className="w-full">
                Buat Nota
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showUnitModal}
        onClose={() => {
          setShowUnitModal(false);
          setSelectedProductForCart(null);
          setSelectedUnit('');
          setQuantityToAdd(0);
        }}
        title="Pilih Unit dan Jumlah"
      >
        {selectedProductForCart && (() => {
          const basePrice = selectedProductForCart.base_price || selectedProductForCart.price;
          const discountInfo = quantityToAdd > 0 && selectedUnit ? getDiscountInfo(selectedProductForCart, quantityToAdd, selectedUnit) : null;
          const finalPrice = discountInfo ? discountInfo.finalPrice : basePrice;
          const hasDiscount = discountInfo?.hasDiscount || false;
          const subtotal = finalPrice * quantityToAdd;

          return (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Produk: <span className="font-semibold">{selectedProductForCart.name}</span>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Unit <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {selectedProductForCart.stock_entries && selectedProductForCart.stock_entries.length > 0 ? (
                    selectedProductForCart.stock_entries.map((entry, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedUnit(entry.unit)}
                        className={`w-full px-4 py-3 text-left border rounded-lg transition-colors ${
                          selectedUnit === entry.unit
                            ? 'border-black bg-gray-50'
                            : 'border-gray-200 hover:bg-gray-50 hover:border-black'
                        }`}
                      >
                        <span className="font-medium">{entry.unit}</span>
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={() => setSelectedUnit(selectedProductForCart.stock_unit || 'buah')}
                      className={`w-full px-4 py-3 text-left border rounded-lg transition-colors ${
                        selectedUnit === (selectedProductForCart.stock_unit || 'buah')
                          ? 'border-black bg-gray-50'
                          : 'border-gray-200 hover:bg-gray-50 hover:border-black'
                      }`}
                    >
                      <span className="font-medium">{selectedProductForCart.stock_unit || 'buah'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah
                </label>
                <Input
                  type="number"
                  min="1"
                  value={quantityToAdd === 0 ? '' : quantityToAdd}
                  onChange={(e) => setQuantityToAdd(e.target.value === '' ? 0 : parseInt(e.target.value))}
                  placeholder={selectedUnit ? "Masukkan jumlah" : "Pilih unit terlebih dahulu"}
                  disabled={!selectedUnit}
                />
              </div>

              {quantityToAdd > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Harga per unit:</span>
                    {hasDiscount ? (
                      <div className="text-right">
                        <div className="text-xs text-gray-400 line-through">
                          Rp {basePrice.toLocaleString('id-ID')}
                        </div>
                        <div className="text-sm font-semibold text-green-600">
                          Rp {finalPrice.toLocaleString('id-ID')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-black">
                        Rp {finalPrice.toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                  {hasDiscount && discountInfo && discountInfo.tier && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-green-700">
                          {discountInfo.tier.isExact ? '=' : '≥'}{discountInfo.tier.minQuantity} {discountInfo.tier.unit}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {discountInfo.discounts.map((discount, idx) => (
                            <span
                              key={idx}
                              className="inline-block bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded"
                            >
                              -{discount}%
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Subtotal:</span>
                    <span className="text-lg font-bold text-black">
                      Rp {subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={addToCartWithUnit}
                  className="flex-1"
                  disabled={!selectedUnit}
                >
                  Tambah ke Keranjang
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowUnitModal(false);
                    setSelectedProductForCart(null);
                    setSelectedUnit('');
                    setQuantityToAdd(0);
                  }}
                >
                  Batal
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, productId: null, productName: '' })}
        title="Konfirmasi Hapus"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Yakin ingin menghapus produk <span className="font-semibold text-black">{deleteConfirmModal.productName}</span>?
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmModal({ isOpen: false, productId: null, productName: '' })}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirmModal.productId && handleDelete(deleteConfirmModal.productId)}
            >
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
