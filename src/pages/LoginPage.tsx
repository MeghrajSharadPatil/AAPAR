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
import { APAAR_SETU_LOGO } from '../components/Layout';

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
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col justify-between">
      {/* Top Tricolor Sovereign Ribbon */}
      <div>
        <div className="h-1.5 w-full bg-gradient-to-r from-[#F5821F] via-[#0B2859] to-[#138808]" />
        <div className="bg-[#071A38] text-[#E6E2D8] px-6 py-1.5 text-[11px] font-mono">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span>MINISTRY OF EDUCATION · ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)</span>
            <span className="hidden sm:inline text-[#FFB067]">
              SMART INDIA HACKATHON 2026 · PROBLEM STATEMENT SIH26263
            </span>
          </div>
        </div>

        {/* Institutional Brand Masthead */}
        <header className="bg-[#FDFCF9] border-b border-[#DDD7C9] px-6 py-3.5 shadow-2xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
            <div className="flex items-center gap-3.5">
              <img
                src={APAAR_SETU_LOGO}
                alt="APAAR Setu Official Emblem"
                className="w-12 h-12 object-contain rounded-md bg-white border border-[#DDD7C9] p-1"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-xl tracking-tight text-[#08204B]">
                    APAAR <span className="text-[#0066CC]">SETU</span>
                  </span>
                  <span className="hidden md:inline-block text-[11px] font-mono uppercase px-2 py-0.5 bg-[#EDE9DF] text-[#302D27] border border-[#C6BEB0] rounded-xs">
                    National Academic Verification Gateway
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5 font-medium">
                  One ID. One Seat. One Verified Truth. · Bridging Education & Verified Academic Identity
                </div>
              </div>
            </div>
            <div className="hidden lg:block text-right font-mono text-xs text-slate-600">
              <div className="font-semibold text-[#08204B]">NAD / ABC / DigiLocker Ready</div>
              <div className="text-[11px] text-[#0F6E06]">Ed25519 + HMAC-SHA256 Active</div>
            </div>
          </div>
        </header>
      </div>

      {/* Main Split Login Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Sovereign Identity Emblem & Architectural Brief */}
          <div className="lg:col-span-6 bg-[#08204B] text-white rounded-md border-t-4 border-t-[#F5821F] p-8 lg:p-10 flex flex-col justify-between shadow-sm">
            <div>
              {/* Featured Official Logo Card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-[#0D2C66] border border-[#1E468A] rounded-md p-4 mb-6">
                <div className="w-24 h-24 rounded-md bg-white p-2 shrink-0 shadow-xs flex items-center justify-center">
                  <img
                    src={APAAR_SETU_LOGO}
                    alt="APAAR Setu – Bridging Education and Identity"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-widest text-[#FFB067] font-semibold">
                    Sovereign Digital Public Infrastructure
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1 leading-tight text-white">
                    APAAR Setu Registry
                  </h1>
                  <p className="text-xs text-[#C9D8F0] mt-1.5 leading-relaxed">
                    Centralized APAAR ID Student Data Management, Live Seat Ledger, and Cryptographic Credential Verification for AICTE-Approved Institutions.
                  </p>
                </div>
              </div>

              <div className="space-y-4 border-t border-[#1A3D7A] pt-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-xs bg-[#133875] border-l-2 border-[#F5821F] flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="w-4 h-4 text-[#FFB067]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Privacy-Preserving HMAC-SHA256 Duplicate Shield
                    </h2>
                    <p className="text-xs text-[#B9C9E4] mt-1 leading-relaxed">
                      Detects dual admissions across AICTE institutions using server-side cryptographic tokens without exposing raw 12-digit APAAR numbers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-xs bg-[#133875] border-l-2 border-[#59A6FF] flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4 text-[#8AB8FF]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Live Seat Ledger & Supernumerary Quota Separation
                    </h2>
                    <p className="text-xs text-[#B9C9E4] mt-1 leading-relaxed">
                      Separates Approved Regular Intake from Supernumerary quotas (NRI / OCI / FN / PMSSS) and prevents unauthorized over-admission.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-xs bg-[#133875] border-l-2 border-[#3BB357] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-[#6EC882]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Ed25519 Signed Credentials & Student Consent
                    </h2>
                    <p className="text-xs text-[#B9C9E4] mt-1 leading-relaxed">
                      Issues tamper-evident QR academic certificates verifiable online or offline with explicit student consent controls.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-[#1A3D7A] text-xs text-[#9BB0D4] flex items-center justify-between font-mono">
              <span>One ID. One Seat. One Verified Truth.</span>
              <span className="text-[#6EC882]">SIH26263 VERIFIED</span>
            </div>
          </div>

          {/* Right Column: Official Sign-In Ledger + 4 Demo Access Portals */}
          <div className="lg:col-span-6 bg-[#FDFCF9] border border-[#C6BEB0] border-t-4 border-t-[#08204B] rounded-md p-8 lg:p-10 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#DDD7C9] pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#08204B]">
                    Authorized Portal Sign-In
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Sign in with institutional credentials or select a pre-seeded role below.
                  </p>
                </div>
                <img
                  src={APAAR_SETU_LOGO}
                  alt="APAAR Setu Crest"
                  className="w-10 h-10 object-contain hidden sm:block"
                />
              </div>

              <form onSubmit={handleFormLogin} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    Official Email / Login ID
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@aicte-demo.gov.in"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#08204B] focus:border-[#08204B]"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    Passkey / Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-3.5 pr-10 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#08204B] focus:border-[#08204B]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded-xs border-slate-300 text-[#08204B] focus:ring-[#08204B]"
                    />
                    <span>Keep session active</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(true)}
                    className="font-semibold text-[#0055B3] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-[#08204B] hover:bg-[#0B2E6B] text-white font-semibold text-sm rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer border-b-2 border-[#F5821F]"
                >
                  <span>{submitting ? 'Authenticating...' : 'Login to APAAR Setu Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* DEMO ACCESS SECTION FOR SIH JUDGES */}
            <div className="mt-7 pt-5 border-t border-[#DDD7C9]">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold tracking-wider text-[#08204B]">
                  DEMO ACCESS — INSTANT ROLE SWITCHING
                </span>
                <span className="font-mono text-[11px] text-[#0F6E06] font-semibold">
                  4 Roles Pre-Seeded
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoLogin(UserRole.AICTE_ADMIN, 'admin@aicte-demo.gov.in')
                  }
                  className="flex items-center justify-between p-3 text-left rounded-md bg-white border border-[#C6BEB0] border-l-4 border-l-[#F5821F] hover:bg-[#F6F4EF] transition-colors group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-[#08204B]">
                      Login as AICTE Admin
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      National Monitoring & Repository
                    </div>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-[#C45500] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoLogin(
                      UserRole.INSTITUTE_ADMIN,
                      'registrar@abcengg-demo.edu.in'
                    )
                  }
                  className="flex items-center justify-between p-3 text-left rounded-md bg-white border border-[#C6BEB0] border-l-4 border-l-[#08204B] hover:bg-[#F6F4EF] transition-colors group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-[#08204B]">
                      Login as Institute Admin
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      ABC Engineering College (DL-101)
                    </div>
                  </div>
                  <Building2 className="w-4 h-4 text-[#08204B] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoLogin(
                      UserRole.STUDENT,
                      'rahul.sharma@student-demo.edu.in'
                    )
                  }
                  className="flex items-center justify-between p-3 text-left rounded-md bg-white border border-[#C6BEB0] border-l-4 border-l-[#138808] hover:bg-[#F6F4EF] transition-colors group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-[#08204B]">
                      Login as Student
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Rahul Sharma (ID: 221901)
                    </div>
                  </div>
                  <GraduationCap className="w-4 h-4 text-[#138808] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoLogin(
                      UserRole.VERIFIER,
                      'verifier@bharattech-demo.in'
                    )
                  }
                  className="flex items-center justify-between p-3 text-left rounded-md bg-white border border-[#C6BEB0] border-l-4 border-l-[#0066CC] hover:bg-[#F6F4EF] transition-colors group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-[#08204B]">
                      Login as Employer / Verifier
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      BharatTech Background Verifier
                    </div>
                  </div>
                  <KeyRound className="w-4 h-4 text-[#0066CC] shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#FDFCF9] border-t border-[#DDD7C9] px-6 py-4 text-center text-xs text-slate-600">
        <strong>APAAR SETU</strong> — One ID. One Seat. One Verified Truth. · Hackathon Demonstration Prototype (Synthetic Data Only)
      </footer>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-pwd-title"
            className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 shadow-xl"
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
                className="px-4 py-2 text-xs font-semibold text-white bg-[#08204B] rounded-md hover:bg-[#0B2E6B]"
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
