import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, User, Search, Menu, Bell, X, ChevronDown, LogOut } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef, useCallback } from 'react';
import { notificationService } from '@/services/notificationService';
import { SearchModal } from '@/components/ui/SearchModal';
import api from '@/services/api';

const NAV_LINKS = [
  { label: 'New Arrivals', to: '/shop?type=new-arrivals' },
  { label: 'Shop', to: '/shop' },
  { label: 'Sale', to: '/shop?type=sale' },
];

const Header = () => {
  const { items, setDrawerOpen } = useCartStore();
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  const categoryRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Fetch unread notifications
  useEffect(() => {
    if (user) {
      notificationService.getNotifications()
        .then(ns => setUnreadCount(ns.filter((n: any) => !n.read).length))
        .catch(() => {});
    } else {
      setUnreadCount(0);
    }
  }, [user]);

  // Fetch categories from catalog settings
  useEffect(() => {
    api.get('/products/catalog-settings')
      .then(res => setCategories(res.data.categories || []))
      .catch(() => setCategories(['Sneakers', 'Formal', 'Casual', 'Sports', 'Boots', 'Sandals']));
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setIsCategoryOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setIsAccountOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [navigate]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const handleLogout = useCallback(async () => {
    await logout();
    setIsAccountOpen(false);
    navigate('/');
  }, [logout, navigate]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Mobile: hamburger */}
          <button
            className="md:hidden p-2 -ml-2 text-text hover:text-primary transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          {/* Logo */}
          <Link to="/" className="text-xl font-display font-bold tracking-widest text-primary shrink-0">
            SOLEVAULT
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(link => (
              <Link
                key={link.label}
                to={link.to}
                className="text-sm font-medium text-text hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {/* Categories dropdown */}
            <div ref={categoryRef} className="relative">
              <button
                onClick={() => setIsCategoryOpen(o => !o)}
                className="flex items-center gap-1 text-sm font-medium text-text hover:text-primary transition-colors"
                aria-expanded={isCategoryOpen}
              >
                Categories <ChevronDown size={14} className={`transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
              </button>
              {isCategoryOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-border rounded-lg shadow-lg py-1 z-50">
                  {categories.map(cat => (
                    <Link
                      key={cat}
                      to={`/shop?category=${encodeURIComponent(cat)}`}
                      onClick={() => setIsCategoryOpen(false)}
                      className="block px-4 py-2 text-sm text-text hover:bg-surface hover:text-primary transition-colors"
                    >
                      {cat}
                    </Link>
                  ))}
                  <div className="border-t border-border mt-1 pt-1">
                    <Link
                      to="/shop"
                      onClick={() => setIsCategoryOpen(false)}
                      className="block px-4 py-2 text-sm font-medium text-primary hover:bg-surface transition-colors"
                    >
                      View All →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-text hover:text-primary transition-colors"
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            {/* Notifications */}
            {user && (
              <Link
                to="/account/notifications"
                className="p-2 text-text hover:text-primary transition-colors relative hidden md:block"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Account — desktop dropdown */}
            <div ref={accountRef} className="relative hidden md:block">
              <button
                onClick={() => setIsAccountOpen(o => !o)}
                className="p-2 text-text hover:text-primary transition-colors"
                aria-label="Account"
                aria-expanded={isAccountOpen}
              >
                <User size={20} />
              </button>
              {isAccountOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-border rounded-lg shadow-lg py-1 z-50">
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-text truncate">{user.name || user.email}</p>
                        <p className="text-xs text-text-muted truncate">{user.email}</p>
                      </div>
                      {[
                        { label: 'My Account', to: '/account' },
                        { label: 'Orders', to: '/account/orders' },
                        { label: 'Wishlist', to: '/account/wishlist' },
                        { label: 'Addresses', to: '/account/addresses' },
                      ].map(item => (
                        <Link
                          key={item.label}
                          to={item.to}
                          onClick={() => setIsAccountOpen(false)}
                          className="block px-4 py-2 text-sm text-text hover:bg-surface hover:text-primary transition-colors"
                        >
                          {item.label}
                        </Link>
                      ))}
                      {user.isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsAccountOpen(false)}
                          className="block px-4 py-2 text-sm text-primary font-medium hover:bg-surface transition-colors border-t border-border"
                        >
                          Admin Panel →
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-surface transition-colors border-t border-border mt-1"
                      >
                        <LogOut size={14} /> Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setIsAccountOpen(false)} className="block px-4 py-2 text-sm font-semibold text-primary hover:bg-surface transition-colors">
                        Sign In
                      </Link>
                      <Link to="/signup" onClick={() => setIsAccountOpen(false)} className="block px-4 py-2 text-sm text-text hover:bg-surface transition-colors">
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Wishlist */}
            <Link
              to="/account/wishlist"
              className="p-2 text-text hover:text-primary transition-colors hidden md:block"
              aria-label="Wishlist"
            >
              <Heart size={20} />
            </Link>

            {/* Cart */}
            <button
              className="p-2 text-text hover:text-primary transition-colors relative"
              aria-label={`Cart (${itemCount} items)`}
              onClick={() => setDrawerOpen(true)}
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Menu Slide-out ── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[90] flex">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* drawer */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="font-display font-bold text-lg text-primary">SOLEVAULT</span>
              <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
                <X size={22} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
              {user && (
                <div className="mb-4 pb-4 border-b border-border">
                  <p className="text-sm font-semibold">{user.name || user.email}</p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                </div>
              )}

              {NAV_LINKS.map(link => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-3 text-sm font-medium border-b border-border/50 hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile categories */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 mt-2">Categories</p>
                {categories.map(cat => (
                  <Link
                    key={cat}
                    to={`/shop?category=${encodeURIComponent(cat)}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-2.5 text-sm text-text hover:text-primary transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
              </div>

              <div className="border-t border-border pt-4 mt-4 space-y-1">
                {user ? (
                  <>
                    {[
                      { label: 'My Account', to: '/account' },
                      { label: 'Orders', to: '/account/orders' },
                      { label: 'Wishlist', to: '/account/wishlist' },
                      { label: 'Addresses', to: '/account/addresses' },
                      { label: 'Notifications', to: '/account/notifications' },
                    ].map(item => (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-2.5 text-sm text-text hover:text-primary transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                    {user.isAdmin && (
                      <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="block py-2.5 text-sm font-semibold text-primary">
                        Admin Panel →
                      </Link>
                    )}
                    <button onClick={handleLogout} className="flex items-center gap-2 py-2.5 text-sm text-danger w-full">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block py-2.5 text-sm font-semibold text-primary">Sign In</Link>
                    <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="block py-2.5 text-sm text-text">Create Account</Link>
                  </>
                )}
              </div>
            </nav>

            <div className="px-5 py-4 border-t border-border">
              <Link to="/track-order" onClick={() => setIsMobileMenuOpen(false)} className="block text-sm text-text-muted hover:text-primary text-center">
                Track My Order
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Header;
