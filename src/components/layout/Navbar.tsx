import React from 'react';
import { Package, FileText, BarChart3, Users, LogOut, UserPlus, Briefcase } from 'lucide-react';
import { signOut } from '../../lib/auth';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  currentPage: 'products' | 'history' | 'reports' | 'customers' | 'sales' | 'users';
  onNavigate: (page: 'products' | 'history' | 'reports' | 'customers' | 'sales' | 'users') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, onLogout }) => {
  const { user, refreshUser } = useAuth();

  const handleLogout = async () => {
    await signOut();
    refreshUser();
    onLogout();
  };

  const navItems: Array<{ id: 'products' | 'history' | 'reports' | 'customers' | 'sales' | 'users'; label: string; icon: any }> = [
    { id: 'products' as const, label: 'Produk', icon: Package },
    { id: 'customers' as const, label: 'Customer', icon: Users },
    { id: 'sales' as const, label: 'Sales', icon: Briefcase },
    { id: 'history' as const, label: 'Nota', icon: FileText },
    { id: 'reports' as const, label: 'Laporan', icon: BarChart3 },
  ];

  if (user?.is_super_admin) {
    navItems.push({ id: 'users' as const, label: 'Kelola User', icon: UserPlus });
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-black">CV Raga Jaya Amerta</h1>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-black text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-slate-700">{user?.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
