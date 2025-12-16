import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/auth/Login';
import { Navbar } from './components/layout/Navbar';
import { Products } from './pages/Products';
import { CreateNota } from './pages/CreateNota';
import { History } from './pages/History';
import { Reports } from './pages/Reports';
import { Customers } from './pages/Customers';
import { Sales } from './pages/Sales';
import { Users } from './pages/Users';
import { Loading } from './components/ui/Loading';
import { ToastContainer } from './components/ui/Toast';
import { useToast } from './hooks/useToast';
import { Product } from './lib/supabase';

type Page = 'products' | 'history' | 'reports' | 'customers' | 'sales' | 'createNota' | 'users';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { toasts, removeToast, success, error } = useToast();
  const [currentPage, setCurrentPage] = useState<Page>('products');
  const [notaItems, setNotaItems] = useState<Array<{ product: Product; quantity: number; unit: string }>>([]);
  const [savedCart, setSavedCart] = useState<Array<{ product: Product; quantity: number; unit: string }> | null>(null);

  const handleCreateNota = (items: Array<{ product: Product; quantity: number; unit: string }>) => {
    setNotaItems(items);
    setSavedCart(items);
    setCurrentPage('createNota');
  };

  const handleBackToProducts = () => {
    setCurrentPage('products');
  };

  const handleNotaSuccess = (message: string) => {
    success(message);
    setNotaItems([]);
    setSavedCart(null);
    try { localStorage.removeItem('cart'); } catch {}
    setCurrentPage('products');
  };

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return (
      <>
        <Login
          onSuccess={success}
          onError={error}
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentPage !== 'createNota' && (
        <Navbar
          currentPage={currentPage as 'products' | 'history' | 'reports' | 'customers' | 'sales' | 'users'}
          onNavigate={(page) => setCurrentPage(page)}
          onLogout={() => success('Logout berhasil')}
        />
      )}

      {currentPage === 'products' && (
        <Products
          onError={error}
          onSuccess={success}
          onCreateNota={handleCreateNota}
          initialCart={savedCart}
        />
      )}

      {currentPage === 'createNota' && (
        <CreateNota
          items={notaItems}
          onBack={handleBackToProducts}
          onSuccess={handleNotaSuccess}
          onError={error}
        />
      )}

      {currentPage === 'history' && (
        <History onError={error} onSuccess={success} />
      )}

      {currentPage === 'reports' && <Reports onError={error} />}

      {currentPage === 'customers' && (
        <Customers onError={error} onSuccess={success} />
      )}

      {currentPage === 'sales' && (
        <Sales onError={error} onSuccess={success} />
      )}

      {currentPage === 'users' && (
        <Users onError={error} onSuccess={success} />
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
