import React from 'react';
import { Link } from 'react-router-dom';
import { FaRobot, FaBell, FaShoppingBag } from 'react-icons/fa';
import BrandMark from './BrandMark';

/**
 * Two-column shell used by every auth/recovery page (Signin, Signup,
 * ForgotPassword, VerifyOtp, ResetPassword, VerifySignupOtp, AdminLogin,
 * AdminRegistration). Keeps brand storytelling on the left and a focused
 * glass card on the right so each page has a consistent feel.
 *
 * `eyebrow` is opt-in — pages that pass an explicit value (e.g. AdminLogin
 * passes "Admin portal") get the badge. Storefront auth pages don't pass
 * it, so the badge is suppressed and the "Trendy Treasures" wordmark
 * doesn't visually duplicate the top-left logo.
 */
function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  eyebrow = null,
  panelTitle,
  panelSubtitle,
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Marketing panel */}
      <aside className="hidden lg:flex relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.4),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.25),transparent_50%)]" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link to="/home" className="inline-flex items-center gap-2 w-fit group">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BrandMark className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              Trendy Treasures
            </span>
          </Link>

          <div className="space-y-6">
            {eyebrow && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider">
                {eyebrow}
              </span>
            )}
            <h2 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight">
              {panelTitle || 'The smartest way to shop across stores.'}
            </h2>
            <p className="text-lg text-white/85 max-w-md leading-relaxed">
              {panelSubtitle ||
                'Compare Amazon and Walmart in one place. Track prices, get drop alerts, and ask AI for buy-or-wait advice before you check out.'}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-white/90">
              <div className="flex items-center gap-2"><FaRobot /> AI price advisor</div>
              <div className="flex items-center gap-2"><FaBell /> Price drop alerts</div>
              <div className="flex items-center gap-2"><FaShoppingBag /> One unified cart</div>
            </div>
          </div>

          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} Trendy Treasures
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex items-center justify-center p-6 lg:p-12">
        <Link
          to="/home"
          className="lg:hidden absolute top-6 left-6 inline-flex items-center gap-2"
        >
          <div className="w-9 h-9 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-brand-500/30">
            <BrandMark className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-ink-900">Trendy Treasures</span>
        </Link>

        <div className="w-full max-w-md animate-fade-in">
          <div className="card p-8 sm:p-10">
            <div className="mb-7">
              <h1 className="text-3xl font-bold text-ink-900 tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-ink-500 mt-2 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {children}
          </div>

          {footer && (
            <p className="text-center text-sm text-ink-600 mt-6">
              {footer}
            </p>
          )}
        </div>

      </main>
    </div>
  );
}

export default AuthLayout;
