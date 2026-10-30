import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AdmissionCategory,
  AnomalyAlert,
  AuditLogEntry,
  ConsentRequest,
  CredentialPayload,
  CsvRowValidationResult,
  DigitalCredential,
  DuplicateCase,
  Institution,
  PlatformAlert,
  Programme,
  SeatLedgerItem,
  StudentRecord,
  SystemIntegration,
  UserAccount,
  UserRole,
  VerificationLog,
} from '../types/domain';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface PlatformContextValue {
  user: UserAccount | null;
  loading: boolean;
  institutions: Institution[];
  programmes: Programme[];
  students: StudentRecord[];
  seatLedger: SeatLedgerItem[];
  duplicates: DuplicateCase[];
  credentials: DigitalCredential[];
  consentRequests: ConsentRequest[];
  verificationLogs: VerificationLog[];
  auditLogs: AuditLogEntry[];
  alerts: PlatformAlert[];
  anomalies: AnomalyAlert[];
  integrations: SystemIntegration[];
  publicKeyPem: string;
  toasts: ToastMessage[];
  notify: (title: string, message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  loginAsRole: (role: UserRole, email?: string) => Promise<void>;
  logout: () => void;
  refreshState: () => Promise<void>;
  registerStudent: (input: {
    studentId: string;
    fullName: string;
    dob: string;
    gender: 'Male' | 'Female' | 'Other';
    rawApaarId?: string;
    institutionId?: string;
    programmeId: string;
    academicYear: string;
    admissionDate: string;
    admissionCategory: AdmissionCategory;
    saveAsDraft?: boolean;
  }) => Promise<{ student: StudentRecord; outcome: any }>;
  updateStudent: (
    id: string,
    input: Partial<{
      fullName: string;
      studentId: string;
      dob: string;
      gender: 'Male' | 'Female' | 'Other';
      rawApaarId: string;
      programmeId: string;
      academicYear: string;
      admissionCategory: AdmissionCategory;
    }>
  ) => Promise<{ student: StudentRecord; outcome: any }>;
  validateBulkCsv: (rows: Array<Record<string, string>>) => Promise<{
    results: CsvRowValidationResult[];
    summary: {
      totalRows: number;
      validRecords: number;
      invalidRecords: number;
      duplicateRecords: number;
      missingApaarIds: number;
      seatWarnings: number;
    };
  }>;
  commitBulkCsv: (
    rows: Array<Record<string, string>>,
    includeExceptionRows: boolean
  ) => Promise<{ committedVerified: number; queuedExceptions: number }>;
  resolveDuplicate: (
    id: string,
    reviewStatus: DuplicateCase['reviewStatus'],
    reviewNotes?: string
  ) => Promise<void>;
  addInstitution: (input: Partial<Institution>) => Promise<void>;
  updateInstitution: (id: string, input: Partial<Institution>) => Promise<void>;
  addProgramme: (input: Partial<Programme>) => Promise<void>;
  updateProgramme: (id: string, input: Partial<Programme>) => Promise<void>;
  generateCredential: (studentRecordId: string) => Promise<DigitalCredential>;
  verifyCredential: (input: {
    credentialId?: string;
    signedQrBundle?: { payload: CredentialPayload; signature: string; publicKeyPem?: string };
    mode?: 'Online Verification' | 'Offline Signature Verification' | 'QR Payload Scan';
    verifierOrganization?: string;
  }) => Promise<{
    result: VerificationLog['result'];
    signatureValid: boolean;
    mode: string;
    explanation: string;
    credentialStatus: string;
    consentStatus: string;
    payload: CredentialPayload;
    publicKeyPem: string;
  }>;
  requestConsent: (input: {
    credentialId: string;
    verifierName?: string;
    organization?: string;
    purpose?: string;
    requestedFields?: string[];
  }) => Promise<void>;
  respondConsent: (id: string, decision: 'Approved' | 'Rejected' | 'Revoked') => Promise<void>;
  setCredentialConsent: (
    credentialId: string,
    consentStatus: 'Approved' | 'Consent Required' | 'Revoked'
  ) => Promise<void>;
  syncIntegration: (
    id: string,
    connectionStatus?: SystemIntegration['connectionStatus']
  ) => Promise<void>;
  analyzeAnomaliesWithAi: () => Promise<{
    source: string;
    summary: string;
    recommendations: string[];
  }>;
  resetDemoData: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextValue | undefined>(undefined);

const STORAGE_USER_KEY = 'apaar_setu_active_user_v1';

const DEFAULT_USERS: Record<UserRole, UserAccount> = {
  [UserRole.AICTE_ADMIN]: {
    id: 'usr-aicte-1',
    name: 'Dr. Rajeshwar Varma',
    email: 'admin@aicte-demo.gov.in',
    role: UserRole.AICTE_ADMIN,
    organization: 'All India Council for Technical Education (New Delhi)',
  },
  [UserRole.INSTITUTE_ADMIN]: {
    id: 'usr-inst-1',
    name: 'Prof. Meenakshi Iyer',
    email: 'registrar@abcengg-demo.edu.in',
    role: UserRole.INSTITUTE_ADMIN,
    institutionId: 'inst-1',
    institutionName: 'ABC Engineering College',
    organization: 'ABC Engineering College (AICTE-DL-101)',
  },
  [UserRole.STUDENT]: {
    id: 'usr-stu-1',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@student-demo.edu.in',
    role: UserRole.STUDENT,
    institutionId: 'inst-1',
    institutionName: 'ABC Engineering College',
    studentId: '221901',
    organization: 'B.Tech Computer Science and Engineering',
  },
  [UserRole.VERIFIER]: {
    id: 'usr-ver-1',
    name: 'Vikramaditya Sen',
    email: 'verifier@bharattech-demo.in',
    role: UserRole.VERIFIER,
    organization: 'BharatTech Global Solutions Ltd. (Authorized Employer Verifier)',
  },
};

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return DEFAULT_USERS[UserRole.AICTE_ADMIN];
      }
      const saved = localStorage.getItem(STORAGE_USER_KEY);
      if (saved) return JSON.parse(saved) as UserAccount;
    } catch {
      // ignore storage errors
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [seatLedger, setSeatLedger] = useState<SeatLedgerItem[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCase[]>([]);
  const [credentials, setCredentials] = useState<DigitalCredential[]>([]);
  const [consentRequests, setConsentRequests] = useState<ConsentRequest[]>([]);
  const [verificationLogs, setVerificationLogs] = useState<VerificationLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [alerts, setAlerts] = useState<PlatformAlert[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [integrations, setIntegrations] = useState<SystemIntegration[]>([]);
  const [publicKeyPem, setPublicKeyPem] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback(
    (title: string, message: string, type: ToastMessage['type'] = 'info') => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [{ id, title, message, type }, ...prev.slice(0, 3)]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const buildHeaders = useCallback(
    (overrideUser?: UserAccount | null): Record<string, string> => {
      const active = overrideUser !== undefined ? overrideUser : user;
      return {
        'Content-Type': 'application/json',
        'x-demo-role': active?.role || UserRole.AICTE_ADMIN,
        'x-demo-user-name': active?.name || 'Authorized User',
        'x-demo-institution-id': active?.institutionId || 'inst-1',
        'x-demo-student-id': active?.studentId || '221901',
      };
    },
    [user]
  );

  const fetchStateForUser = useCallback(
    async (targetUser: UserAccount | null) => {
      if (!targetUser) return;
      setLoading(true);
      try {
        const res = await fetch('/api/state', {
          headers: buildHeaders(targetUser),
        });
        if (!res.ok) throw new Error('Failed to load platform state');
        const data = await res.json();
        setInstitutions(data.institutions || []);
        setProgrammes(data.programmes || []);
        setStudents(data.students || []);
        setSeatLedger(data.seatLedger || []);
        setDuplicates(data.duplicates || []);
        setCredentials(data.credentials || []);
        setConsentRequests(data.consentRequests || []);
        setVerificationLogs(data.verificationLogs || []);
        setAuditLogs(data.auditLogs || []);
        setAlerts(data.alerts || []);
        setAnomalies(data.anomalies || []);
        setIntegrations(data.integrations || []);
        setPublicKeyPem(data.publicKeyPem || '');
      } catch (err) {
        console.error('Error fetching state:', err);
      } finally {
        setLoading(false);
      }
    },
    [buildHeaders]
  );

  useEffect(() => {
    if (user) {
      fetchStateForUser(user);
    }
  }, [user, fetchStateForUser]);

  const refreshState = useCallback(async () => {
    await fetchStateForUser(user);
  }, [fetchStateForUser, user]);

  const loginAsRole = useCallback(
    async (role: UserRole, email?: string) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, email }),
        });
        const data = await res.json();
        const loggedUser: UserAccount = data.user || DEFAULT_USERS[role];
        setUser(loggedUser);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(loggedUser));
        await fetchStateForUser(loggedUser);
        notify(
          `Signed in as ${loggedUser.name}`,
          `Role: ${loggedUser.role.replace('_', ' ')} · ${loggedUser.organization || ''}`,
          'success'
        );
      } catch {
        const fallbackUser = DEFAULT_USERS[role];
        setUser(fallbackUser);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(fallbackUser));
        await fetchStateForUser(fallbackUser);
      }
    },
    [fetchStateForUser, notify]
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_USER_KEY);
    notify('Signed out', 'Your session has been closed.', 'info');
  }, [notify]);

  const registerStudent: PlatformContextValue['registerStudent'] = async (input) => {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register student');
    }
    await refreshState();
    return data;
  };

  const updateStudent: PlatformContextValue['updateStudent'] = async (id, input) => {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update student');
    }
    await refreshState();
    return data;
  };

  const validateBulkCsv: PlatformContextValue['validateBulkCsv'] = async (rows) => {
    const res = await fetch('/api/students/bulk-validate', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to validate CSV');
    }
    return data;
  };

  const commitBulkCsv: PlatformContextValue['commitBulkCsv'] = async (
    rows,
    includeExceptionRows
  ) => {
    const res = await fetch('/api/students/bulk-commit', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ rows, includeExceptionRows }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload CSV records');
    }
    await refreshState();
    return data;
  };

  const resolveDuplicate: PlatformContextValue['resolveDuplicate'] = async (
    id,
    reviewStatus,
    reviewNotes
  ) => {
    const res = await fetch(`/api/duplicates/${id}/action`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ reviewStatus, reviewNotes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update duplicate case');
    }
    await refreshState();
    notify('Duplicate Shield Updated', `Case status updated to "${reviewStatus}".`, 'success');
  };

  const addInstitution: PlatformContextValue['addInstitution'] = async (input) => {
    const res = await fetch('/api/institutions', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add institution');
    }
    await refreshState();
    notify('Institution Added', `${input.name} added to AICTE Directory.`, 'success');
  };

  const updateInstitution: PlatformContextValue['updateInstitution'] = async (id, input) => {
    const res = await fetch(`/api/institutions/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update institution');
    }
    await refreshState();
    notify('Institution Updated', 'Institution details saved.', 'success');
  };

  const addProgramme: PlatformContextValue['addProgramme'] = async (input) => {
    const res = await fetch('/api/programmes', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add programme');
    }
    await refreshState();
    notify('Programme Configured', `${input.name} added to Seat Ledger.`, 'success');
  };

  const updateProgramme: PlatformContextValue['updateProgramme'] = async (id, input) => {
    const res = await fetch(`/api/programmes/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update programme capacity');
    }
    await refreshState();
    notify('Seat Capacity Updated', 'Live Seat Ledger recalculated.', 'success');
  };

  const generateCredential: PlatformContextValue['generateCredential'] = async (
    studentRecordId
  ) => {
    const res = await fetch('/api/credentials/generate', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ studentRecordId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to generate credential');
    }
    await refreshState();
    notify(
      'Ed25519 Credential Generated',
      `Signed credential ${data.credential.credentialId} issued.`,
      'success'
    );
    return data.credential;
  };

  const verifyCredential: PlatformContextValue['verifyCredential'] = async (input) => {
    const res = await fetch('/api/credentials/verify', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Verification failed');
    }
    await refreshState();
    return data;
  };

  const requestConsent: PlatformContextValue['requestConsent'] = async (input) => {
    const res = await fetch('/api/consents/request', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to request consent');
    }
    await refreshState();
    notify(
      'Consent Request Sent',
      `Verification request sent to student (${input.credentialId}).`,
      'success'
    );
  };

  const respondConsent: PlatformContextValue['respondConsent'] = async (id, decision) => {
    const res = await fetch(`/api/consents/${id}/respond`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ decision }),
    });
    if (!res.ok) {
      throw new Error('Failed to update consent');
    }
    await refreshState();
    notify(
      `Consent ${decision}`,
      `Verification request has been ${decision.toLowerCase()}.`,
      decision === 'Approved' ? 'success' : 'warning'
    );
  };

  const setCredentialConsent: PlatformContextValue['setCredentialConsent'] = async (
    credentialId,
    consentStatus
  ) => {
    const res = await fetch(`/api/credentials/${credentialId}/consent`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ consentStatus }),
    });
    if (!res.ok) throw new Error('Failed to update credential disclosure status');
    await refreshState();
    notify(
      'Disclosure Policy Updated',
      `Credential ${credentialId} status set to "${consentStatus}".`,
      'info'
    );
  };

  const syncIntegration: PlatformContextValue['syncIntegration'] = async (
    id,
    connectionStatus
  ) => {
    const res = await fetch(`/api/integrations/${id}/sync`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ connectionStatus }),
    });
    if (!res.ok) throw new Error('Failed to sync adapter');
    await refreshState();
    notify('Sandbox Adapter Synchronized', 'Integration connector handshake verified.', 'success');
  };

  const analyzeAnomaliesWithAi: PlatformContextValue['analyzeAnomaliesWithAi'] = async () => {
    const res = await fetch('/api/ai/analyze-anomalies', {
      method: 'POST',
      headers: buildHeaders(),
    });
    const data = await res.json();
    return data;
  };

  const resetDemoData: PlatformContextValue['resetDemoData'] = async () => {
    const res = await fetch('/api/admin/reset-demo', {
      method: 'POST',
      headers: buildHeaders(),
    });
    if (!res.ok) throw new Error('Failed to reset demo data');
    await refreshState();
    notify(
      'Demo Data Restored',
      'All institutions, 60/60 seat ledger, duplicates, and credentials reset to initial seed state.',
      'success'
    );
  };

  return (
    <PlatformContext.Provider
      value={{
        user,
        loading,
        institutions,
        programmes,
        students,
        seatLedger,
        duplicates,
        credentials,
        consentRequests,
        verificationLogs,
        auditLogs,
        alerts,
        anomalies,
        integrations,
        publicKeyPem,
        toasts,
        notify,
        dismissToast,
        loginAsRole,
        logout,
        refreshState,
        registerStudent,
        updateStudent,
        validateBulkCsv,
        commitBulkCsv,
        resolveDuplicate,
        addInstitution,
        updateInstitution,
        addProgramme,
        updateProgramme,
        generateCredential,
        verifyCredential,
        requestConsent,
        respondConsent,
        setCredentialConsent,
        syncIntegration,
        analyzeAnomaliesWithAi,
        resetDemoData,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within a PlatformProvider');
  return ctx;
}
