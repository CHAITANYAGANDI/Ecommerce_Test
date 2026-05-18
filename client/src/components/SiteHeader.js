import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaUserCircle, FaSearch, FaSignOutAlt, FaTrashAlt, FaSignInAlt, FaBell } from 'react-icons/fa';
import { handleCartClick, handleError, handleSuccess, apiFetch, logoutUser, showConfirm } from '../utils';
import BrandMark from './BrandMark';

/**
 * Sticky frosted-glass top navigation used on every storefront page.
 * Renders the brand, an optional search box (controlled via props), the cart
 * icon, and a user dropdown. Keeping this in one place removes the ~80 lines
 * of header markup that each storefront component used to repeat.
 */
function SiteHeader({
  currentUser,
  setCurrentUser,
  cartCount = 0,
  searchValue,
  onSearchChange,
  showSearch = true,
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close the dropdown when the user clicks outside of it — small detail but
  // expected behavior on every production site and removes the awkward
  // "click-the-icon-again" interaction the legacy site had.
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser && setCurrentUser(null);
    setShowDropdown(false);
    handleSuccess('Logged out successfully');
    setTimeout(() => navigate('/login'), 800);
  };

  const handleDeleteAccount = async () => {
    if (!currentUser || !currentUser.email) {
      handleError('No user email found');
      return;
    }
    const ok = await showConfirm({
      title: 'Delete your account?',
      body: 'This will permanently remove your account, saved cart, and order history. This cannot be undone.',
      confirmLabel: 'Delete account',
      cancelLabel: 'Keep account',
      danger: true
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/account/delete/${currentUser.email}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        handleSuccess('Account deleted successfully');
        await logoutUser();
        setCurrentUser && setCurrentUser(null);
        setShowDropdown(false);
        setTimeout(() => navigate('/signup'), 1200);
      } else {
        const errorData = await response.json();
        handleError(errorData.message || 'Failed to delete account');
      }
    } catch (error) {
      handleError(error.message || 'An error occurred while deleting the account');
    }
  };

  const initial = currentUser?.name?.[0]?.toUpperCase() || '';

  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="store-shell">
        <div className="grid grid-cols-[auto_auto] md:grid-cols-[minmax(190px,240px)_minmax(240px,1fr)_minmax(160px,240px)] lg:grid-cols-[minmax(220px,300px)_minmax(360px,1fr)_minmax(220px,300px)] items-center gap-3 md:gap-5 py-3">
          {/* Brand */}
          <Link to="/home" className="flex items-center gap-2 shrink-0 group justify-self-start">
            <div className="w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
              <BrandMark className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-display font-bold text-lg text-ink-900 tracking-tight">
                Trendy Treasures
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-ink-500 font-semibold">
                Compare · track · save
              </span>
            </div>
          </Link>

          {/* Search bar */}
          {showSearch && (
            <div className="hidden md:block w-full max-w-4xl justify-self-center">
              <div className="relative">
                <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-400 text-sm" />
                <input
                  type="text"
                  value={searchValue || ''}
                  onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                  placeholder="Search across Amazon, Walmart and more…"
                  className="w-full pl-12 pr-5 py-2.5 rounded-full bg-white/80 border border-ink-200/80 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-400 focus:bg-white focus:shadow-focus transition-all"
                />
              </div>
            </div>
          )}
          {!showSearch && <div className="hidden md:block" />}

          {/* Cart + Profile */}
          <div className="justify-self-end flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCartClick(navigate)}
              className="relative p-2.5 rounded-full hover:bg-ink-100 transition-colors group"
              aria-label="Open cart"
            >
              <FaShoppingCart className="text-xl text-ink-700 group-hover:text-brand-700 transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-gradient text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-brand-500/40">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowDropdown((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-ink-100 transition-colors"
                aria-label="Open profile menu"
              >
                {currentUser ? (
                  <span className="w-8 h-8 rounded-full bg-brand-gradient text-white text-sm font-bold flex items-center justify-center shadow-md shadow-brand-500/30">
                    {initial}
                  </span>
                ) : (
                  <FaUserCircle className="text-2xl text-ink-600" />
                )}
                <span className="hidden lg:inline text-sm font-medium text-ink-700 max-w-[120px] truncate">
                  {currentUser ? currentUser.name : 'Sign in'}
                </span>
              </button>

              {showDropdown && (
                <div className="absolute top-full right-0 mt-2 w-60 glass-strong rounded-2xl py-2 animate-pop overflow-hidden">
                  {currentUser ? (
                    <>
                      <div className="px-4 py-3 border-b border-white/40">
                        <p className="text-sm font-semibold text-ink-900 truncate">
                          {currentUser.name}
                        </p>
                        <p className="text-xs text-ink-500 truncate">
                          {currentUser.email}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          navigate('/alerts');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-white/60 transition-colors"
                      >
                        <FaBell className="text-ink-500" />
                        Price alerts
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-white/60 transition-colors"
                      >
                        <FaSignOutAlt className="text-ink-500" />
                        Log out
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/80 transition-colors"
                      >
                        <FaTrashAlt />
                        Delete account
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-white/60 transition-colors"
                    >
                      <FaSignInAlt className="text-ink-500" />
                      Sign in
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search */}
        {showSearch && (
          <div className="md:hidden pb-3">
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 text-sm" />
              <input
                type="text"
                value={searchValue || ''}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                placeholder="Search products…"
                className="w-full pl-11 pr-4 py-2 rounded-full bg-white/80 border border-ink-200/80 text-sm focus:outline-none focus:border-brand-400 focus:bg-white transition-all"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default SiteHeader;
