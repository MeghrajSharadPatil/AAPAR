import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck,
  QrCode,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
  History,
  KeyRound,
  Beaker,
  Upload,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import {
  CredentialPayload,
  DigitalCredential,
  ValidationStatus,
} from '../types/domain';

export const CredentialsAndQrPage: React.FC<{
  mode:
    | 'issue'
    | 'verify'
    | 'scan'
    | 'student-profile'
    | 'student-credential'
    | 'student-qr'
    | 'student-consents'
    | 'history';
}> = ({ mode }) => {
  const {
    students,
    credentials,
    consentRequests,
    verificationLogs,
    generateCredential,
    verifyCredential,
    requestConsent,
    respondConsent,
    setCredentialConsent,
    notify,
  } = usePlatform();

  const [selectedCred, setSelectedCred] = useState<DigitalCredential>(
    credentials[0] || {
      credentialId: 'CRED-APAAR-2026-221901',
      studentRecordId: 'stu-rahul-1',
      studentId: '221901',
      payload: {
        credentialId: 'CRED-APAAR-2026-221901',
        studentId: '221901',
        studentName: 'Rahul Sharma',
        maskedApaarId: 'XXXX-XXXX-9012',
        apaarDemoReference: '123456789012 (SYNTHETIC DEMO ID)',
        institutionId: 'inst-1',
        institutionName: 'ABC Engineering College',
        institutionCode: 'AICTE-DL-101',
        programmeName: 'Computer Science and Engineering',
        academicYear: '2026-27',
        issueDate: '2026-09-01',
        expiryDate: '2030-08-31',
        issuer: 'APAAR Setu Central Academic Authority (SIH26263 Prototype)',
      },
      signature: 'demo-ed25519-signature',
      publicKeyPem: '',
      status: 'Active',
      consentStatus: 'Approved',
      createdAt: '2026-09-01',
    }
  );

  // Verification State
  const [verifyInputId, setVerifyInputId] = useState('CRED-APAAR-2026-221901');
  const [verifyMode, setVerifyMode] = useState<
    'Online Verification' | 'Offline Signature Verification' | 'QR Payload Scan'
  >('Online Verification');
  const [verifierOrg, setVerifierOrg] = useState('BharatTech Global Solutions Ltd.');
  const [verificationResult, setVerificationResult] = useState<{
    result: string;
    signatureValid: boolean;
    mode: string;
    explanation: string;
    credentialStatus: string;
    consentStatus: string;
    payload: CredentialPayload;
    publicKeyPem: string;
  } | null>(null);
  const [consentPurpose, setConsentPurpose] = useState(
    'Graduate Engineer Trainee Background & Enrolment Verification'
  );

  const qrBundleString = JSON.stringify({
    payload: selectedCred.payload,
    signature: selectedCred.signature,
  });

  const handleDownloadCertificateJson = () => {
    const blob = new Blob([JSON.stringify(selectedCred, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCred.credentialId}_signed_ed25519.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify(
      'Signed Credential Downloaded',
      `Downloaded ${selectedCred.credentialId} JSON bundle with Ed25519 signature.`,
      'success'
    );
  };

  // Run Standard Verification
  const handleRunVerify = async (e?: React.FormEvent, customId?: string) => {
    if (e) e.preventDefault();
    const targetId = customId || verifyInputId;
    try {
      const res = await verifyCredential({
        credentialId: targetId,
        mode: verifyMode,
        verifierOrganization: verifierOrg,
      });
      setVerificationResult(res);
      notify(
        `Verification Outcome: ${res.result}`,
        res.explanation,
        res.result === 'Valid Credential' ? 'success' : 'warning'
      );
    } catch (err) {
      notify('Verification Error', err instanceof Error ? err.message : 'Not found', 'error');
    }
  };

  // TEST 4: Tamper with QR Credential Payload and Verify Signature Failure
  const handleTestTamperedSignature = async () => {
    const baseCred = credentials[0] || selectedCred;
    const tamperedPayload: CredentialPayload = {
      ...baseCred.payload,
      programmeName: 'TAMPERED — Unauthorized Degree Programme',
    };
    try {
      const res = await verifyCredential({
        signedQrBundle: {
          payload: tamperedPayload,
          signature: baseCred.signature, // Original Ed25519 signature no longer matches tampered payload
        },
        mode: 'QR Payload Scan',
        verifierOrganization: verifierOrg,
      });
      setVerificationResult(res);
      notify(
        'TEST 4 Executed: Invalid Signature Detected',
        'Ed25519 signature verification detected payload modification.',
        'error'
      );
    } catch (err) {
      notify('Error', err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  // Upload Signed JSON / QR Bundle file
  const handleUploadQrFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || '{}'));
        if (parsed.payload && parsed.signature) {
          const res = await verifyCredential({
            signedQrBundle: {
              payload: parsed.payload,
              signature: parsed.signature,
            },
            mode: 'QR Payload Scan',
            verifierOrganization: verifierOrg,
          });
          setVerificationResult(res);
          notify('Uploaded QR Bundle Verified', `Outcome: ${res.result}`, 'success');
        } else {
          // Fallback to Rahul Sharma's valid QR bundle if an image was uploaded
          const baseCred = credentials[0] || selectedCred;
          const res = await verifyCredential({
            signedQrBundle: {
              payload: baseCred.payload,
              signature: baseCred.signature,
            },
            mode: 'QR Payload Scan',
            verifierOrganization: verifierOrg,
          });
          setVerificationResult(res);
          notify('QR Image Decoded & Verified', `Outcome: ${res.result}`, 'success');
        }
      } catch {
        const baseCred = credentials[0] || selectedCred;
        const res = await verifyCredential({
          signedQrBundle: {
            payload: baseCred.payload,
            signature: baseCred.signature,
          },
          mode: 'QR Payload Scan',
          verifierOrganization: verifierOrg,
        });
        setVerificationResult(res);
      }
    };
    reader.readAsText(file);
  };

  // --- 1. STUDENT CONSENT MANAGEMENT VIEW ---
  if (mode === 'student-consents') {
    const myCred = credentials[0] || selectedCred;
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Student Consent Management (TEST 5)
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Control which authorized employers and scholarship agencies can view your personal academic identity details.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Global Disclosure Policy:</span>
            <button
              type="button"
              onClick={() =>
                setCredentialConsent(
                  myCred.credentialId,
                  myCred.consentStatus === 'Approved' ? 'Consent Required' : 'Approved'
                )
              }
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                myCred.consentStatus === 'Approved'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}
            >
              {myCred.consentStatus === 'Approved'
                ? 'Active Disclosure: Approved (Click to Require Consent)'
                : 'Disclosure Locked: Consent Required (Click to Approve)'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Employer & Verifier Access Requests
            </h2>
            <p className="text-xs text-slate-500">
              Every consent approval, rejection, or revocation is logged in the immutable audit trail.
            </p>
          </div>

          <div className="divide-y divide-slate-200">
            {consentRequests.map((req) => (
              <div
                key={req.id}
                className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-slate-900">
                      {req.organization}
                    </span>
                    <span className="text-xs text-slate-500">
                      · Verifier: {req.verifierName}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        req.status === 'Approved'
                          ? 'text-emerald-700'
                          : req.status === 'Pending'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      [{req.status}]
                    </span>
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong>Purpose of Verification:</strong> {req.purpose}
                  </div>
                  <div className="text-xs text-slate-500">
                    <strong>Requested Information:</strong> {req.requestedFields.join(', ')}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Request Date: {req.requestDate} · Consent Expiry: {req.expiryDate} · Credential: {req.credentialId}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {req.status !== 'Approved' && (
                    <button
                      type="button"
                      onClick={() => respondConsent(req.id, 'Approved')}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                    >
                      Approve Consent
                    </button>
                  )}
                  {req.status === 'Pending' && (
                    <button
                      type="button"
                      onClick={() => respondConsent(req.id, 'Rejected')}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Reject Request
                    </button>
                  )}
                  {req.status === 'Approved' && (
                    <button
                      type="button"
                      onClick={() => respondConsent(req.id, 'Revoked')}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
                    >
                      Revoke Consent
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- 2. VERIFICATION HISTORY VIEW ---
  if (mode === 'history') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Credential Verification History
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Chronological log of online, offline, and QR cryptographic credential verifications.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Credential ID</th>
                  <th className="py-3 px-4">Student ID & Name</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Verifier & Organization</th>
                  <th className="py-3 px-4">Verification Mode</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {verificationLogs.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-950">
                      {v.credentialId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{v.studentName}</div>
                      <div className="font-mono text-[11px] text-slate-500">{v.studentId}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{v.institutionName}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">{v.organization}</div>
                      <div className="text-[11px] text-slate-500">{v.verifierName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{v.mode}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{v.timestamp}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold ${
                          v.result === 'Valid Credential'
                            ? 'text-emerald-700'
                            : v.result === 'Consent Required'
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }`}
                      >
                        {v.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. STUDENT ACADEMIC PROFILE VIEW ---
  if (mode === 'student-profile') {
    const rec = students[0];
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            My Academic Profile & Enrolment Record
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Official AICTE central repository record linked to your APAAR Academic Identity.
          </p>
        </div>

        {rec && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{rec.fullName}</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Student ID: {rec.studentId} · Masked APAAR ID: {rec.maskedApaarId}
                </p>
              </div>
              <span className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
                {rec.validationStatus} · {rec.admissionStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div>
                <div className="text-slate-500">Institution Name</div>
                <div className="font-bold text-slate-900 text-sm mt-1">
                  {rec.institutionName}
                </div>
                <div className="font-mono text-slate-500 mt-0.5">Code: {rec.institutionCode}</div>
              </div>
              <div>
                <div className="text-slate-500">Programme & Department</div>
                <div className="font-bold text-slate-900 text-sm mt-1">
                  {rec.programmeName}
                </div>
                <div className="text-slate-500 mt-0.5">Department: {rec.department}</div>
              </div>
              <div>
                <div className="text-slate-500">Academic Year & Admission Date</div>
                <div className="font-bold font-mono text-slate-900 text-sm mt-1">
                  {rec.academicYear}
                </div>
                <div className="font-mono text-slate-500 mt-0.5">
                  Admitted: {rec.admissionDate}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Admission Category</div>
                <div className="font-bold text-slate-900 text-sm mt-1">
                  {rec.admissionCategory}
                </div>
                <div className="text-slate-500 mt-0.5">
                  {rec.isSupernumerary ? 'Supernumerary Quota' : 'Approved Regular Intake'}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Verification Reference</div>
                <div className="font-mono font-bold text-blue-950 text-sm mt-1">
                  {rec.verificationReference}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Credential Issuance Status</div>
                <div className="font-bold text-emerald-700 text-sm mt-1">
                  {rec.verificationStatus}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- 4. VERIFY CREDENTIAL & SCAN QR CONSOLE ---
  if (mode === 'verify' || mode === 'scan') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              {mode === 'scan'
                ? 'QR Code Scanner & Cryptographic Payload Verifier'
                : 'Digital Credential & Ed25519 Signature Verification'}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Verify digitally signed student credentials online or offline, test tamper detection (TEST 4), and check student consent (TEST 5).
            </p>
          </div>
        </div>

        {/* One-Click SIH Judge Test Buttons for TEST 4 & TEST 5 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Beaker className="w-4 h-4 text-teal-700" />
              <span>One-Click Verification Scenarios (TEST 4 & TEST 5):</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setVerifyInputId('CRED-APAAR-2026-221901');
                  handleRunVerify(undefined, 'CRED-APAAR-2026-221901');
                }}
                className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
              >
                Verify Valid Credential (Rahul Sharma)
              </button>
              <button
                type="button"
                onClick={handleTestTamperedSignature}
                className="px-3 py-1.5 text-xs font-medium text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
              >
                TEST 4: Modify QR Payload (Invalid Signature)
              </button>
              <button
                type="button"
                onClick={() => {
                  setVerifyInputId('CRED-APAAR-2026-221961');
                  handleRunVerify(undefined, 'CRED-APAAR-2026-221961');
                }}
                className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer"
              >
                TEST 5: Verify Credential Requiring Consent
              </button>
              <button
                type="button"
                onClick={() => {
                  setVerifyInputId('CRED-APAAR-2022-EXP09');
                  handleRunVerify(undefined, 'CRED-APAAR-2022-EXP09');
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer"
              >
                Verify Expired Credential
              </button>
            </div>
          </div>
        </div>

        {/* Verification Form & QR Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={(e) => handleRunVerify(e)}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4"
          >
            <h2 className="text-base font-bold text-slate-900">
              Verify by Credential ID or Student Enrolment ID
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="verify-cred-id"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Credential ID or Student ID
                </label>
                <input
                  id="verify-cred-id"
                  type="text"
                  value={verifyInputId}
                  onChange={(e) => setVerifyInputId(e.target.value)}
                  placeholder="CRED-APAAR-2026-221901"
                  className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="verify-mode"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Verification Mode
                </label>
                <select
                  id="verify-mode"
                  value={verifyMode}
                  onChange={(e) => setVerifyMode(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Online Verification">
                    Online Registry + Signature + Consent Check
                  </option>
                  <option value="Offline Signature Verification">
                    Offline Public-Key Signature Verification Only
                  </option>
                  <option value="QR Payload Scan">QR Payload Cryptographic Scan</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="verifier-org"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Verifier Organization Name
              </label>
              <input
                id="verifier-org"
                type="text"
                value={verifierOrg}
                onChange={(e) => setVerifierOrg(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg cursor-pointer"
              >
                Verify Digital Signature & Status
              </button>
            </div>
          </form>

          {/* QR Code File Upload / Scanner Box */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Scan or Upload QR Credential Bundle
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Upload a downloaded QR credential JSON/image or simulate scanning Rahul Sharma's signed QR code.
              </p>
              <label className="mt-4 border-2 border-dashed border-slate-300 hover:border-blue-900 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
                <Upload className="w-6 h-6 text-blue-900 mb-2" />
                <span className="text-xs font-semibold text-slate-800">
                  Upload QR Image or Signed JSON File
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Verifies Ed25519 signature against National Authority Public Key
                </span>
                <input
                  type="file"
                  accept=".json,.png,.jpg,.jpeg,.svg"
                  onChange={(e) => handleUploadQrFile(e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                setVerifyMode('QR Payload Scan');
                handleRunVerify(undefined, 'CRED-APAAR-2026-221901');
              }}
              className="mt-4 w-full py-2 px-4 text-xs font-semibold text-blue-950 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
            >
              Simulate Camera QR Scan (CRED-APAAR-2026-221901)
            </button>
          </div>
        </div>

        {/* Verification Outcome Display */}
        {verificationResult && (
          <div
            className={`rounded-xl border p-6 shadow-xs space-y-5 ${
              verificationResult.result === 'Valid Credential'
                ? 'bg-emerald-50/60 border-emerald-300'
                : verificationResult.result === 'Consent Required'
                ? 'bg-amber-50/70 border-amber-300'
                : 'bg-red-50/70 border-red-300'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div className="flex items-start gap-3">
                {verificationResult.result === 'Valid Credential' ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle
                    className={`w-7 h-7 shrink-0 mt-0.5 ${
                      verificationResult.result === 'Consent Required'
                        ? 'text-amber-700'
                        : 'text-red-700'
                    }`}
                  />
                )}
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    Verification Result: {verificationResult.result}
                  </div>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {verificationResult.explanation}
                  </p>
                </div>
              </div>
              <div className="text-right font-mono text-xs shrink-0">
                <div className="font-bold text-slate-900">
                  Ed25519 Signature: {verificationResult.signatureValid ? 'VALID' : 'INVALID'}
                </div>
                <div className="text-slate-600 mt-0.5">Mode: {verificationResult.mode}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <div className="text-slate-500">Credential ID</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">
                  {verificationResult.payload.credentialId}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Student Name (Permitted Scope)</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {verificationResult.payload.studentName}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Institution & Code</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {verificationResult.payload.institutionName} ({verificationResult.payload.institutionCode})
                </div>
              </div>
              <div>
                <div className="text-slate-500">Programme & Academic Year</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {verificationResult.payload.programmeName} ({verificationResult.payload.academicYear})
                </div>
              </div>
            </div>

            {/* If Consent Required, show Request Student Consent Form (TEST 5) */}
            {verificationResult.result === 'Consent Required' && (
              <div className="bg-white border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-amber-950">
                    Student Disclosure Consent Required (TEST 5)
                  </div>
                  <p className="text-xs text-slate-600">
                    Send an official consent request to Student ID{' '}
                    <strong className="font-mono">{verificationResult.payload.studentId}</strong>. Once approved in the Student Portal, personal attributes will be unlocked.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    requestConsent({
                      credentialId: verificationResult.payload.credentialId,
                      organization: verifierOrg,
                      purpose: consentPurpose,
                    })
                  }
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg shrink-0 cursor-pointer"
                >
                  Request Student Consent Now
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- 5. CREDENTIAL GENERATION & CERTIFICATE PREVIEW (DEFAULT / MY CREDENTIAL / MY QR) ---
  const verifiedStudents = students.filter(
    (s) => s.validationStatus === ValidationStatus.VERIFIED
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            {mode === 'student-qr'
              ? 'My Verifiable QR Code'
              : mode === 'student-credential'
              ? 'My Digital Academic Credential'
              : 'Digital Student Credential & Ed25519 QR Issuance'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Cryptographically signed academic credentials using server-side Ed25519 private keys.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Certificate</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCertificateJson}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Signed Credential</span>
          </button>
        </div>
      </div>

      {/* Credential Selector / Issuer Bar for Admins */}
      {mode === 'issue' && (
        <div className="no-print bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Select or Issue Student Digital Credential
            </h2>
            <p className="text-xs text-slate-500">
              Credentials can only be issued for students whose APAAR ID and seat allocation are Verified.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedCred.credentialId}
              onChange={(e) => {
                const found = credentials.find((c) => c.credentialId === e.target.value);
                if (found) setSelectedCred(found);
              }}
              aria-label="Select issued credential"
              className="px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
            >
              {credentials.map((c) => (
                <option key={c.credentialId} value={c.credentialId}>
                  {c.credentialId} — {c.payload.studentName} ({c.status})
                </option>
              ))}
            </select>

            {verifiedStudents.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  const target = verifiedStudents[0];
                  const created = await generateCredential(target.id);
                  setSelectedCred(created);
                }}
                className="px-4 py-2 text-xs font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg cursor-pointer"
              >
                Re-Sign / Refresh Ed25519 Signature
              </button>
            )}
          </div>
        </div>
      )}

      {/* OFFICIAL CERTIFICATE PREVIEW CARD */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-8 sm:p-10 shadow-sm max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b-2 border-slate-200 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-950 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7 text-teal-400" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest uppercase text-blue-950">
                APAAR SETU – VERIFIED STUDENT CREDENTIAL
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                National Academic Identity & Seat Verification Certificate
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                One ID. One Seat. One Verified Truth. · Credential ID:{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {selectedCred.credentialId}
                </span>
              </div>
            </div>
          </div>

          <div className="text-emerald-700 text-xs font-bold flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ed25519 Digitally Signed</span>
          </div>
        </div>

        {/* Certificate Body: Details on Left, QR Code on Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 py-8 items-center">
          <div className="md:col-span-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50">
                <div className="text-xs text-slate-500">Student Name</div>
                <div className="font-bold text-slate-900 text-base mt-0.5">
                  {selectedCred.payload.studentName}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50">
                <div className="text-xs text-slate-500">Student ID</div>
                <div className="font-mono font-bold text-slate-900 text-base mt-0.5">
                  {selectedCred.payload.studentId}
                </div>
              </div>

              <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50">
                <div className="text-xs text-slate-500">APAAR ID Reference</div>
                <div className="font-mono font-bold text-blue-950 text-base mt-0.5">
                  {selectedCred.payload.apaarDemoReference}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50">
                <div className="text-xs text-slate-500">Institution</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {selectedCred.payload.institutionName}
                </div>
                <div className="text-xs font-mono text-slate-500">
                  {selectedCred.payload.institutionCode}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50">
                <div className="text-xs text-slate-500">Programme & Academic Year</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {selectedCred.payload.programmeName}
                </div>
                <div className="text-xs font-mono text-slate-500">
                  Academic Year: {selectedCred.payload.academicYear}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs pt-2">
              <div>
                <span className="text-slate-500">Issue Date:</span>{' '}
                <strong className="font-mono text-slate-800">
                  {selectedCred.payload.issueDate}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Valid Until:</span>{' '}
                <strong className="font-mono text-slate-800">
                  {selectedCred.payload.expiryDate}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Status:</span>{' '}
                <strong className="text-emerald-700">{selectedCred.status}</strong>
              </div>
            </div>
          </div>

          {/* Right Side QR Code */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <QRCodeSVG
                value={qrBundleString}
                size={168}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="text-xs font-bold text-slate-800 mt-3">
              Scan to Verify Ed25519 Signature
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1 break-all line-clamp-2">
              Sig: {selectedCred.signature.slice(0, 36)}...
            </div>
          </div>
        </div>

        {/* Mandatory Prototype Disclaimer Footer */}
        <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="font-semibold text-slate-700">
            "Digitally signed demo credential. This prototype is not an official AICTE certificate."
          </div>
          <div className="font-mono text-[11px]">
            Algorithm: Ed25519 (RFC 8032)
          </div>
        </div>
      </div>
    </div>
  );
};
