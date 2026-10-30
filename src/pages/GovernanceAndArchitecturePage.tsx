import React, { useState } from 'react';
import {
  FileClock,
  Network,
  GitBranch,
  Settings,
  ShieldCheck,
  RefreshCw,
  ArrowDown,
  Lock,
  RotateCcw,
  Search,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { SystemIntegration } from '../types/domain';

export const AuditLogsPage: React.FC = () => {
  const { auditLogs } = usePlatform();
  const [search, setSearch] = useState('');

  const filtered = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.entityReference.toLowerCase().includes(search.toLowerCase()) ||
      log.actionId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Security & Immutable Audit Logs
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Chronological trail of logins, student registrations, CSV uploads, duplicate resolutions, consent updates, and credential verifications.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, user, reference..."
            aria-label="Search audit logs"
            className="pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      {/* Security Controls Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-start gap-3">
        <Lock className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900">Zero-Plaintext Audit Policy:</strong> Full 12-digit APAAR IDs, HMAC secrets, Ed25519 private signing keys, and user passwords are never written to audit logs. Entity references store only masked identifiers (<code className="font-mono">XXXX-XXXX-9012</code>) or credential IDs. Note: This is a Smart India Hackathon demonstration prototype and not a production-certified government system.
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Action ID</th>
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Reference</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-950 whitespace-nowrap">
                    {log.actionId}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{log.userName}</div>
                    <div className="text-[11px] font-mono text-slate-500">{log.userRole}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{log.action}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">
                    {log.entityReference}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-bold ${
                        log.status === 'Success'
                          ? 'text-emerald-700'
                          : log.status === 'Flagged'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-md">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const SystemIntegrationsPage: React.FC = () => {
  const { integrations, syncIntegration } = usePlatform();
  const [configuringAdapter, setConfiguringAdapter] = useState<SystemIntegration | null>(
    null
  );
  const [statusChoice, setStatusChoice] =
    useState<SystemIntegration['connectionStatus']>('Connected to Sandbox');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
          System Integrations & Sandbox Connectors
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Modular API adapter interfaces and simulated sandbox connectors for national academic ecosystem interoperability.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed shadow-xs">
        <strong className="text-slate-900">Transparency Notice:</strong> This prototype uses modular sandbox adapters (`Connected to Sandbox`, `Demo Connector`, `Pending Authorization`, `Not Connected`) to demonstrate interoperability patterns without claiming live production government API credentials.
      </div>

      {/* 5 Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((intg) => (
          <div
            key={intg.id}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-950 flex items-center justify-center shrink-0">
                  <Network className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs font-bold ${
                    intg.connectionStatus === 'Connected to Sandbox' ||
                    intg.connectionStatus === 'Demo Connector'
                      ? 'text-emerald-700'
                      : intg.connectionStatus === 'Pending Authorization'
                      ? 'text-amber-700'
                      : 'text-slate-500'
                  }`}
                >
                  {intg.connectionStatus}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">{intg.systemName}</h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{intg.purpose}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Integration Type:</span>
                  <span className="font-medium text-slate-800">{intg.integrationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Synchronization:</span>
                  <span className="font-mono text-slate-700">{intg.lastSync}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Endpoint:</span>
                  <span className="font-mono text-[11px] text-blue-900">
                    {intg.endpointPattern}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => syncIntegration(intg.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Test Sync</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfiguringAdapter(intg);
                  setStatusChoice(intg.connectionStatus);
                }}
                className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg cursor-pointer"
              >
                Configure
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* API Integration Documentation */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Future Authorized Government API Adapter Specification
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          All external systems communicate through a clean TypeScript interface (`AcademicIdentityAdapter`) so sandbox connectors can be swapped for production NIC/NDEAR endpoints upon official authorization.
        </p>
        <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
{`// Modular Adapter Contract for Production Migration
export interface ApaarRegistryAdapter {
  verifyTokenChallenge(hmacToken: string, institutionCode: string): Promise<{
    tokenMatched: boolean;
    activeSeatLockInstitution?: string;
    verificationTimestamp: string;
  }>;
  publishSignedCredentialToDigiLocker(credentialId: string, ed25519Signature: string): Promise<{
    uri: string;
    status: 'ISSUED_SANDBOX' | 'PENDING_CONSENT';
  }>;
}`}
        </pre>
      </div>

      {/* Configure Adapter Modal */}
      {configuringAdapter && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Configure Adapter — {configuringAdapter.systemName}
            </h3>
            <div className="text-xs text-slate-600">
              Protocol: <strong className="font-mono">{configuringAdapter.protocol}</strong>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sandbox Connection Status
              </label>
              <select
                value={statusChoice}
                onChange={(e) =>
                  setStatusChoice(e.target.value as SystemIntegration['connectionStatus'])
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                <option value="Connected to Sandbox">Connected to Sandbox</option>
                <option value="Demo Connector">Demo Connector</option>
                <option value="Pending Authorization">Pending Authorization</option>
                <option value="Not Connected">Not Connected</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfiguringAdapter(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await syncIntegration(configuringAdapter.id, statusChoice);
                  setConfiguringAdapter(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 rounded-lg"
              >
                Save Adapter State
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SystemArchitecturePage: React.FC = () => {
  const pipelineSteps = [
    { step: '01', title: 'Institution Login', desc: 'Role-Based Access Control (RBAC) & Institution Isolation' },
    { step: '02', title: 'Student Data Upload', desc: 'Single Registration Form or Bulk CSV Upload with Preview' },
    { step: '03', title: 'APAAR Validation Engine', desc: '12-Digit Format Check & Exception Queue Routing' },
    { step: '04', title: 'Duplicate Shield', desc: 'Privacy-Preserving Server-Side HMAC-SHA256 Token Matching' },
    { step: '05', title: 'Seat Capacity Validation', desc: 'Live Seat Ledger (Approved Intake vs Supernumerary Quota)' },
    { step: '06', title: 'Data Quality Check', desc: 'Department, Programme & Academic Cycle Consistency' },
    { step: '07', title: 'Central Student Repository', desc: 'Unified AICTE National Record Store with Masked Identifiers' },
    { step: '08', title: 'AICTE Monitoring Dashboard', desc: 'Real-Time National KPIs, Alerts & AI Anomaly Detection' },
    { step: '09', title: 'Analytics and Reports', desc: '10 Standardized Compliance Reports & CSV Exports' },
    { step: '10', title: 'Student Consent', desc: 'Granular Student Approval / Revocation for Verifier Requests' },
    { step: '11', title: 'Authorized Verification', desc: 'Online & Offline Ed25519 Digital Signature QR Verification' },
  ];

  const archBlocks = [
    { title: 'Institution Portal', layer: 'Presentation Layer', detail: 'Student registration, CSV bulk upload, seat monitoring, and exception resolution.' },
    { title: 'Student Portal', layer: 'Presentation Layer', detail: 'My Academic Identity, Ed25519 QR certificate, and granular disclosure consent manager.' },
    { title: 'Employer Verification Portal', layer: 'Presentation Layer', detail: 'Least-privilege QR & Credential ID verifier with online/offline signature checks.' },
    { title: 'AICTE Central Dashboard', layer: 'Monitoring Layer', detail: 'National enrolment analytics, institution directory, and compliance oversight.' },
    { title: 'API Gateway & Auth Layer', layer: 'Security Layer', detail: 'REST API gateway enforcing role & institution-level data isolation + audit logging.' },
    { title: 'APAAR Validation Engine', layer: 'Core Domain Engine', detail: 'Format verification, missing ID detection, and Exception Queue orchestration.' },
    { title: 'Duplicate Shield (HMAC-SHA256)', layer: 'Core Domain Engine', detail: 'Zero-plaintext cross-institutional identity collision detection and transfer workflow.' },
    { title: 'Live Seat Ledger', layer: 'Core Domain Engine', detail: 'Separate dynamic counters for Regular Approved Intake and Supernumerary Quotas.' },
    { title: 'AI Anomaly Detection', layer: 'Intelligence Layer', detail: 'Deterministic 6-rule pattern detector + server-side anonymized Gemini summarization.' },
    { title: 'Ed25519 Credential Signer', layer: 'Cryptographic Layer', detail: 'RFC 8032 asymmetric signing and tamper-evident QR payload verification.' },
    { title: 'Central Repository', layer: 'Persistence Layer', detail: 'Modular repository abstraction ready for PostgreSQL / Cloud SQL migration.' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
          System Architecture & End-to-End Data Flow
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Visual architecture diagram and 11-stage verification pipeline for APAAR Setu (SIH26263).
        </p>
      </div>

      {/* 11-Step End-to-End Data Flow Diagram */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-6">
          End-to-End Verification & Admission Pipeline
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pipelineSteps.map((item, idx) => (
            <div
              key={item.step}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono font-bold text-blue-900">
                  <span>STAGE {item.step}</span>
                  {idx < pipelineSteps.length - 1 && (
                    <span className="text-teal-700">→</span>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1.5">
                  {item.title}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 11 System Architecture Components Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4">
          Core Platform Subsystems & Security Boundaries
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {archBlocks.map((b) => (
            <div
              key={b.title}
              className="p-4 rounded-xl border border-slate-200 hover:border-blue-900 transition-colors"
            >
              <div className="text-[11px] font-mono font-semibold text-teal-700">
                {b.layer}
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1">{b.title}</div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{b.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { user, publicKeyPem, resetDemoData } = usePlatform();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
          Portal Settings & Cryptographic Configuration
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Inspect active role permissions, server Ed25519 public key, and demonstration database controls.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Active Session & Role Isolation Profile
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Logged-in User:</span>
              <span className="font-bold text-slate-900">{user?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Email Address:</span>
              <span className="font-mono text-slate-800">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Authorized Role:</span>
              <span className="font-mono font-bold text-blue-950">{user?.role}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Organization / Scope:</span>
              <span className="font-medium text-slate-800">
                {user?.institutionName || user?.organization}
              </span>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={resetDemoData}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset All Synthetic Demo Data to Initial State</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            National Authority Ed25519 Verification Public Key (PEM)
          </h2>
          <p className="text-xs text-slate-500">
            Used by employers and offline verifiers to cryptographically verify student QR credentials. The corresponding private key remains strictly on the server.
          </p>
          <pre className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800 overflow-x-auto">
            {publicKeyPem || '-----BEGIN PUBLIC KEY-----\nEd25519 Public Key Active\n-----END PUBLIC KEY-----'}
          </pre>
        </div>
      </div>
    </div>
  );
};
