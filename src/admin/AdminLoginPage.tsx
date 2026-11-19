import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from './AdminAuthContext';
import { NIEM_MEDIA } from '../lib/media';

export const AdminLoginPage: React.FC = () => {
  const { admin, loading, sessionExpired, clearSessionExpiredNotice, loginAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B2241] flex items-center justify-center px-6">
        <p className="text-sm text-slate-300">Verifying administrator session...</p>
      </div>
    );
  }

  if (admin) {
    const redirectTo =
      (location.state as { from?: string } | null)?.from || '/admin/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearSessionExpiredNotice();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError('Please enter your administrator email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await loginAdmin(trimmedEmail, password);
      const redirectTo =
        (location.state as { from?: string } | null)?.from || '/admin/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate administrator.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071830] flex flex-col justify-between px-4 py-10">
      <div className="max-w-md w-full mx-auto my-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={NIEM_MEDIA.logo}
              alt="National Institute of Engineering official emblem"
              className="w-10 h-10 rounded bg-white p-0.5 object-contain shadow-sm shrink-0"
            />
            <div>
              <p className="font-serif text-base font-semibold text-white leading-tight">
                NIEM Administration
              </p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#E5C57B]">
                Isolated Management Portal
              </p>
            </div>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Public Website
          </a>
        </div>

        <div className="bg-white rounded-md border border-slate-200 shadow-2xl overflow-hidden">
          <div className="px-7 py-5 bg-[#0B2241] border-b border-white/10">
            <div className="flex items-center gap-2 text-[#E5C57B] text-xs font-semibold uppercase tracking-[0.14em] mb-1">
              <ShieldCheck className="w-4 h-4" /> Authorized Personnel Only
            </div>
            <h1 className="font-serif text-xl font-semibold text-white">
              Administrator Sign In
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Sign in with your assigned NIEM Super Administrator credentials. Public student portal
              accounts cannot access this console.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-7 space-y-5" noValidate>
            {sessionExpired && (
              <div
                role="alert"
                className="p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <span>
                  Your previous administrator session expired or was signed out. Please sign in
                  again to continue.
                </span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Administrator Email
              </label>
              <input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="administrator@domain.com"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-[#0B2241] focus:ring-1 focus:ring-[#0B2241]"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-[#0B2241] focus:ring-1 focus:ring-[#0B2241]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#133562] rounded transition-colors disabled:opacity-60"
            >
              <Lock className="w-4 h-4" />
              {submitting ? 'Authenticating...' : 'Sign In to Admin Panel'}
            </button>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
              Protected by rate limiting, account lockout controls, HTTP-only session cookies, and
              server-side session revocation. All administrative actions are recorded in the
              institutional audit trail.
            </div>
          </form>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-400 mt-8">
        National Institute of Engineering &amp; Management — Institutional Administration Console
      </p>
    </div>
  );
};
