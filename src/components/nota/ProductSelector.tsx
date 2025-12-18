import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { supabase, Product } from '../../lib/supabase';
import { Button } from '../ui/Button';

interface ProductSelectorProps {
  onAddProduct: (product: Product, quantity: number, unit: string) => void;
  existingProductIds: string[];
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({ onAddProduct, existingProductIds }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<string>('buah');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, products]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
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

  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    // Set satuan ke stock_unit produk atau 'buah' sebagai default
    const defaultUnit = product.stock_unit || 'buah';
    setSelectedUnit(defaultUnit);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    if (quantity <= 0) {
      alert('Jumlah harus lebih dari 0');
      return;
    }

    onAddProduct(selectedProduct, quantity, selectedUnit);
    setSelectedProduct(null);
    setQuantity(1);
    setSelectedUnit('buah');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {searchQuery || selectedCategory !== 'all' ? 'Tidak ada produk ditemukan' : 'Belum ada produk'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredProducts.map((product) => {
              const isInCart = existingProductIds.includes(product.id);
              const isSelected = selectedProduct?.id === product.id;

              return (
                <div
                  key={product.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : isInCart
                      ? 'bg-gray-50 opacity-60'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => !isInCart && handleSelectProduct(product)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-black">
                        {product.name}
                        {isInCart && <span className="ml-2 text-xs text-gray-500">(Sudah di cart)</span>}
                      </div>
                      <div className="text-xs text-gray-600">
                        {product.sku} | {product.category}
                      </div>
                      <div className="text-xs font-medium text-black mt-1">
                        Rp {product.price.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="text-sm font-medium text-black">Tambah: {selectedProduct.name}</div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah</label>
              <input
                type="number"
                min="1"
                value={quantity === 0 ? '' : quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? 0 : parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Satuan</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              >
                {selectedProduct.stock_entries && selectedProduct.stock_entries.length > 0 ? (
                  selectedProduct.stock_entries.map((entry) => (
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
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddToCart} className="flex-1 text-sm py-2">
              <Plus className="w-4 h-4 mr-1" />
              Tambah ke Cart
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSelectedProduct(null)}
              className="text-sm py-2 px-4"
            >
              Batal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
