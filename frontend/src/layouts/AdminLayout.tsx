import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Boxes, ShoppingCart, Truck, Users,
  CreditCard, Tag, RotateCcw, Star, Bell, Megaphone, BarChart3,
  Settings, Shield, ChevronRight, Menu, X, LogOut, Home, Eye
} from 'lucide-react';

interface NavItem {
  label: string;
  to?: string;
  icon: any;
  children?: { label: string; to: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  {
    label: 'Catalog', icon: Package,
    children: [
      { label: 'All Products', to: '/admin/products' },
      { label: 'Add Product', to: '/admin/products/add' },
      { label: 'Categories & Brands', to: '/admin/catalog-settings' },
    ],
  },
  { label: 'Inventory', to: '/admin/inventory', icon: Boxes },
  {
    label: 'Orders', icon: ShoppingCart,
    children: [
      { label: 'All Orders', to: '/admin/orders' },
      { label: 'Need to Ship', to: '/admin/orders?tab=to-ship' },
      { label: 'Shipped', to: '/admin/orders?tab=shipped' },
      { label: 'Cancelled', to: '/admin/orders?tab=cancelled' },
    ],
  },
  { label: 'Customers', to: '/admin/customers', icon: Users },
  {
    label: 'Finance', icon: CreditCard,
    children: [
      { label: 'Payments', to: '/admin/payments' },
      { label: 'Coupons', to: '/admin/coupons' },
      { label: 'Refunds', to: '/admin/refunds' },
      { label: 'COD Settings', to: '/admin/cod-settings' },
    ],
  },
  {
    label: 'Support', icon: RotateCcw,
    children: [
      { label: 'Returns', to: '/admin/returns' },
      { label: 'Reviews', to: '/admin/reviews' },
      { label: 'Notifications', to: '/admin/notification-logs' },
    ],
  },
  { label: 'Marketing', to: '/admin/marketing', icon: Megaphone },
  { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
  {
    label: 'System', icon: Settings,
    children: [
      { label: 'Store Settings', to: '/admin/settings' },
      { label: 'Admin Users', to: '/admin/admin-users' },
      { label: 'Audit Logs', to: '/admin/audit-logs' },
    ],
  },
];

// ─── Sidebar Nav Item ─────────────────────────────────────────────────────
const SidebarNavItem = ({ item, isOpen, onToggle, onNavigate }: {
  item: NavItem; isOpen: boolean; onToggle: () => void; onNavigate: () => void;
}) => {
  const location = useLocation();
  const isActive = item.to && (location.pathname === item.to || (item.to !== '/admin' && location.pathname.startsWith(item.to)));
  const hasActiveChild = item.children?.some(c => location.pathname === c.to || location.pathname.startsWith(c.to));

  if (!item.children) {
    return (
      <Link
        to={item.to!}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
          isActive
            ? 'bg-white/15 text-white font-medium'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <item.icon size={18} />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
          hasActiveChild ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <item.icon size={18} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronRight size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="ml-6 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
          {item.children.map(child => {
            const childActive = location.pathname === child.to || location.pathname.startsWith(child.to);
            return (
              <Link
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className={`block px-3 py-1.5 rounded text-sm transition-colors ${
                  childActive ? 'text-white bg-white/10 font-medium' : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Admin Layout ─────────────────────────────────────────────────────────
const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Close sidebar on route change (mobile)
  const location = useLocation();
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Auto-open active groups
  useEffect(() => {
    const active: Record<string, boolean> = {};
    NAV_ITEMS.forEach(item => {
      if (item.children?.some(c => location.pathname === c.to || location.pathname.startsWith(c.to))) {
        active[item.label] = true;
      }
    });
    setOpenGroups(prev => ({ ...prev, ...active }));
  }, [location.pathname]);

  if (!user || !user.isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Admin Access Required</h2>
          <Link to="/" className="text-primary text-sm hover:underline">Return to Home</Link>
        </div>
      </div>
    );
  }

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const toggleGroup = (label: string) => setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#111111] text-white flex flex-col transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SV</span>
            </div>
            <div>
              <span className="text-sm font-bold tracking-wider text-white">SOLEVAULT</span>
              <span className="block text-[10px] uppercase tracking-widest text-white/40">Admin</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {NAV_ITEMS.map(item => (
            <SidebarNavItem
              key={item.label}
              item={item}
              isOpen={openGroups[item.label] || false}
              onToggle={() => toggleGroup(item.label)}
              onNavigate={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-xs font-medium text-white/70">
              {(user.name || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user.name || 'Admin'}</p>
              <p className="text-[11px] text-white/40 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href="/" target="_blank" className="flex-1 flex items-center justify-center gap-1.5 text-[11px] text-white/50 hover:text-white py-1.5 rounded border border-white/10 hover:border-white/20 transition-colors">
              <Eye size={12} /> View Store
            </a>
            <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-1.5 text-[11px] text-white/50 hover:text-red-400 py-1.5 rounded border border-white/10 hover:border-red-400/30 transition-colors">
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900">
            <Menu size={22} />
          </button>
          <span className="text-sm font-semibold text-gray-900">SoleVault Admin</span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
