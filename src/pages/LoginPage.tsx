import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Building2,
  GraduationCap,
  CheckCircle2,
  Lock,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { UserRole } from '../types/domain';

export const LoginPage: React.FC = () => {
  const { loginAsRole, notify } = usePlatform();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@aicte-demo.gov.in');
  const [password, setPassword] = useState('SIH2026@ApaarSetu');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      notify('Validation Error', 'Please enter both email address and password.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      let targetRole = UserRole.AICTE_ADMIN;
      const lower = email.toLowerCase();
      if (lower.includes('registrar') || lower.includes('inst')) {
        targetRole = UserRole.INSTITUTE_ADMIN;
      } else if (lower.includes('student') || lower.includes('rahul')) {
        targetRole = UserRole.STUDENT;
      } else if (lower.includes('verifier') || lower.includes('employer') || lower.includes('hr')) {
        targetRole = UserRole.VERIFIER;
      }
      await loginAsRole(targetRole, email);
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (role: UserRole, presetEmail: string) => {
    setEmail(presetEmail);
    setSubmitting(true);
    try {
      await loginAsRole(role, presetEmail);
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Institutional Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-950 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight text-slate-900">
                APAAR SETU
              </span>
              <span className="hidden sm:inline text-xs text-slate-500 ml-3">
                One ID. One Seat. One Verified Truth.
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Smart India Hackathon 2026 · Problem ID: SIH26263
          </div>
        </div>
      </header>

      {/* Main Split Login Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Platform Overview & Security Architecture */}
          <div className="lg:col-span-6 bg-blue-950 text-white rounded-2xl p-8 lg:p-10 flex flex-col justify-between shadow-sm">
            <div>
              <div className="text-xs font-medium text-teal-300 tracking-wide">
                AICTE Academic Identity & Seat Verification Infrastructure
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold mt-3 leading-tight text-balance">
                Welcome to APAAR Setu
              </h1>
              <p className="text-slate-300 text-base mt-3 leading-relaxed">
                Secure Academic Identity and Student Record Verification Platform for AICTE-Approved Institutions.
              </p>

              <div className="mt-8 space-y-5 border-t border-blue-900 pt-6">
                <div className="flex items-start gap-3.5">
                  <Lock className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Privacy-Preserving HMAC-SHA256 Duplicate Shield
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Detects dual admissions across AICTE institutions using server-side cryptographic tokens without exposing raw 12-digit APAAR identifiers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <Building2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Live Seat Ledger & Capacity Enforcement
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Separates Approved Regular Intake from Supernumerary quotas (NRI / OCI / FN) and flags excess admissions in real time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Ed25519 Signed Credentials & Student Consent
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Issues tamper-evident QR academic credentials verifiable online or offline with explicit student consent controls.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-blue-900 text-xs text-slate-400 flex items-center justify-between">
              <span>Tagline: One ID. One Seat. One Verified Truth.</span>
              <span className="font-mono">Ed25519 + HMAC-SHA256</span>
            </div>
          </div>

          {/* Right Column: Login Form + 4 Demo Access Portals */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-8 lg:p-10 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Sign In to Your Portal
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your institutional credentials or use the instant Demo Access buttons below.
              </p>

              <form onSubmit={handleFormLogin} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@aicte-demo.gov.in"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-blue-950 focus:ring-blue-900"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(true)}
                    className="font-medium text-blue-800 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-blue-950 hover:bg-blue-900 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{submitting ? 'Signing in...' : 'Login to Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* DEMO ACCESS SECTION FOR SIH JUDGES */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-wider text-slate-700">
                  DEMO ACCESS — INSTANT ROLE SWITCHING
                </span>
                <span className="text-[11px] text-teal-700 font-medium">
                  Seeded Accounts Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoLogin(UserRole.AICTE_ADMIN, 'admin@aicte-demo.gov.in')
                  }
                  className="flex items-center justify-between p-3 text-left rounded-xl border border-slate-200 hover:border-blue-900 hover:bg-blue-50/50 transition-colors group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-950">
                      Login as AICTE Admin
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      National Monitoring & Repository
                    </div>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-blue-900 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoLogin(
                      UserRole.INSTITUTE_ADMIN,
                      'registrar@abcengg-demo.edu.in'
                    )
                  }
                  className="flex items-center justify-between p-3 text-left rounded-xl border border-slate-200 hover:border-blue-900 hover:bg-blue-50/50 transition-colors group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-950">
                      Login as Institute Admin
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      ABC Engineering College (DL-101)
                    </div>
                  </div>
                  <Building2 className="w-4 h-4 text-blue-900 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoLogin(
                      UserRole.STUDENT,
                      'rahul.sharma@student-demo.edu.in'
                    )
                  }
                  className="flex items-center justify-between p-3 text-left rounded-xl border border-slate-200 hover:border-blue-900 hover:bg-blue-50/50 transition-colors group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-950">
                      Login as Student
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Rahul Sharma (ID: 221901)
                    </div>
                  </div>
                  <GraduationCap className="w-4 h-4 text-teal-700 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoLogin(
                      UserRole.VERIFIER,
                      'verifier@bharattech-demo.in'
                    )
                  }
                  className="flex items-center justify-between p-3 text-left rounded-xl border border-slate-200 hover:border-blue-900 hover:bg-blue-50/50 transition-colors group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-950">
                      Login as Employer / Verifier
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      BharatTech Background Verifier
                    </div>
                  </div>
                  <KeyRound className="w-4 h-4 text-teal-700 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500">
        APAAR SETU — One ID. One Seat. One Verified Truth. · Hackathon Demonstration Prototype (Synthetic Data Only)
      </footer>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-pwd-title"
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl"
          >
            <h3 id="forgot-pwd-title" className="text-base font-bold text-slate-900">
              Password Reset Instructions
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              In this Smart India Hackathon demonstration prototype, all four role accounts are pre-seeded for instant evaluation. You can click any of the four <strong>DEMO ACCESS</strong> buttons to sign in immediately without a password reset.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 rounded-lg hover:bg-blue-900"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
