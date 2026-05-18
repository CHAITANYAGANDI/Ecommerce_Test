import React from 'react';
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/40 bg-white/50 backdrop-blur-xl">
      <div className="store-shell py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link to="/home" className="inline-flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-brand-500/30">
                <BrandMark className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-ink-900">
                Trendy Treasures
              </span>
            </Link>
            <p className="mt-4 text-sm text-ink-600 max-w-md leading-relaxed">
              One beautiful place to discover curated finds from across the
              internet's biggest stores. Compare. Decide. Check out where your
              product lives.
            </p>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.18em] font-semibold text-ink-500 mb-3">
              Shop
            </h4>
            <ul className="space-y-2 text-sm text-ink-700">
              <li><Link to="/home" className="hover:text-brand-700 transition-colors">All products</Link></li>
              <li><Link to="/cart" className="hover:text-brand-700 transition-colors">Cart</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.18em] font-semibold text-ink-500 mb-3">
              Account
            </h4>
            <ul className="space-y-2 text-sm text-ink-700">
              <li><Link to="/login" className="hover:text-brand-700 transition-colors">Sign in</Link></li>
              <li><Link to="/signup" className="hover:text-brand-700 transition-colors">Create account</Link></li>
              <li><Link to="/forgotpassword" className="hover:text-brand-700 transition-colors">Forgot password</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-ink-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-500">
          <p>© {new Date().getFullYear()} Trendy Treasures.</p>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
