import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  User, MapPin, ShoppingBag, Heart, Star, RotateCcw,
  Bell, LayoutDashboard, LogOut, ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/account', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/account/profile', label: 'Profile', icon: User },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/account/reviews', label: 'My Reviews', icon: Star },
  { to: '/account/returns', label: 'Returns', icon: RotateCcw },
  { to: '/account/notifications', label: 'Notifications', icon: Bell },
];

const AccountLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Sidebar ── */}
        <aside className="lg:w-64 shrink-0">
          {/* User card */}
          <div className="bg-white border border-border rounded-xl p-5 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-lg font-bold shrink-0">
                {(user?.name || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-text-muted truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="bg-white border border-border rounded-xl overflow-hidden">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-sm border-b border-border/60 last:border-b-0 transition-colors ${
                    isActive
                      ? 'bg-primary/5 text-primary font-semibold'
                      : 'text-text hover:bg-surface hover:text-primary'
                  }`
                }
              >
                <Icon size={16} className="shrink-0" />
                <span className="flex-1">{label}</span>
                <ChevronRight size={14} className="text-border" />
              </NavLink>
            ))}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-danger hover:bg-red-50 transition-colors border-t border-border"
            >
              <LogOut size={16} className="shrink-0" />
              Sign Out
            </button>
          </nav>
        </aside>

        {/* ── Page content ── */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AccountLayout;
