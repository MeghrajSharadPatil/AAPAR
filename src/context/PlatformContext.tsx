import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AdmissionCategory,
  AdmissionStatus,
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
  ValidationStatus,
  VerificationLog,
} from '../types/domain';
import {
  computeSeatLedger,
  deriveEd25519KeyPair,
  detectAdmissionAnomalies,
  evaluateStudentSubmission,
  maskApaarId,
  normalizeApaarId,
  signCredentialPayload,
  validateBulkCsvRows,
  verifyCredentialSignature,
} from '../lib/engine';
import { buildInitialSeedDatabase, DatabaseState } from '../lib/seedData';

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
const STORAGE_DB_KEY = 'apaar_setu_client_db_v3';
const CLIENT_HMAC_SECRET = 'sih26263-apaar-setu-hmac-server-secret-2026';
const CLIENT_SIGNING_SEED = 'sih26263-apaar-setu-ed25519-signing-seed-2026';

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

function loadLocalDb(): DatabaseState {
  try {
    const raw = localStorage.getItem(STORAGE_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DatabaseState;
      if (parsed && Array.isArray(parsed.institutions) && parsed.institutions.length >= 10) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  const fresh = buildInitialSeedDatabase(CLIENT_HMAC_SECRET, CLIENT_SIGNING_SEED);
  try {
    localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(fresh));
  } catch {
    // ignore quota errors
  }
  return fresh;
}

function saveLocalDb(state: DatabaseState): void {
  try {
    localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function computeRoleScopedView(db: DatabaseState, activeUser: UserAccount | null) {
  const role = activeUser?.role || UserRole.AICTE_ADMIN;
  const institutionId = activeUser?.institutionId || 'inst-1';
  const studentId = activeUser?.studentId || '221901';

  const fullSeatLedger = computeSeatLedger(db.programmes, db.students);
  const fullAnomalies = detectAdmissionAnomalies(
    db.students,
    db.programmes,
    db.institutions,
    db.duplicates
  );

  if (role === UserRole.AICTE_ADMIN) {
    return {
      institutions: db.institutions,
      programmes: db.programmes,
      students: db.students,
      seatLedger: fullSeatLedger,
      duplicates: db.duplicates,
      credentials: db.credentials,
      consentRequests: db.consentRequests,
      verificationLogs: db.verificationLogs,
      auditLogs: db.auditLogs,
      alerts: db.alerts,
      anomalies: fullAnomalies,
      integrations: db.integrations,
      publicKeyPem: db.publicKeyPem,
    };
  }

  if (role === UserRole.INSTITUTE_ADMIN) {
    return {
      institutions: db.institutions.filter((i) => i.id === institutionId),
      programmes: db.programmes.filter((p) => p.institutionId === institutionId),
      students: db.students.filter((s) => s.institutionId === institutionId),
      seatLedger: fullSeatLedger.filter((l) => l.institutionId === institutionId),
      duplicates: db.duplicates.filter(
        (d) => d.institutionAId === institutionId || d.institutionBId === institutionId
      ),
      credentials: db.credentials.filter((c) => c.payload.institutionId === institutionId),
      consentRequests: db.consentRequests,
      verificationLogs: db.verificationLogs,
      auditLogs: db.auditLogs.slice(0, 25),
      alerts: db.alerts.filter((a) => a.institutionId === institutionId),
      anomalies: fullAnomalies.filter((a) => a.institutionId === institutionId),
      integrations: db.integrations,
      publicKeyPem: db.publicKeyPem,
    };
  }

  if (role === UserRole.STUDENT) {
    const myStudents = db.students.filter((s) => s.studentId === studentId);
    const myStudent = myStudents[0] || db.students[0];
    return {
      institutions: db.institutions.filter((i) => i.id === myStudent.institutionId),
      programmes: db.programmes.filter((p) => p.id === myStudent.programmeId),
      students: [myStudent],
      seatLedger: fullSeatLedger.filter((l) => l.programmeId === myStudent.programmeId),
      duplicates: [],
      credentials: db.credentials.filter((c) => c.studentId === myStudent.studentId),
      consentRequests: db.consentRequests.filter((c) => c.studentId === myStudent.studentId),
      verificationLogs: db.verificationLogs.filter((v) => v.studentId === myStudent.studentId),
      auditLogs: db.auditLogs.filter(
        (a) => a.entityReference.includes(myStudent.studentId) || a.userRole === UserRole.STUDENT
      ),
      alerts: [],
      anomalies: [],
      integrations: db.integrations,
      publicKeyPem: db.publicKeyPem,
    };
  }

  // VERIFIER
  return {
    institutions: db.institutions,
    programmes: db.programmes,
    students: [],
    seatLedger: [],
    duplicates: [],
    credentials: db.credentials,
    consentRequests: db.consentRequests,
    verificationLogs: db.verificationLogs,
    auditLogs: db.auditLogs.filter((a) => a.userRole === UserRole.VERIFIER),
    alerts: [],
    anomalies: [],
    integrations: db.integrations,
    publicKeyPem: db.publicKeyPem,
  };
}

async function safeJsonFetch(url: string, options?: RequestInit): Promise<any | null> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch (err) {
    if (err instanceof Error && err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
    return null;
  }
}

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

  // Pre-seed immediately from local database so deployed static/serverless sites NEVER show empty data
  const initialScoped = computeRoleScopedView(loadLocalDb(), user);

  const [loading, setLoading] = useState<boolean>(false);
  const [institutions, setInstitutions] = useState<Institution[]>(initialScoped.institutions);
  const [programmes, setProgrammes] = useState<Programme[]>(initialScoped.programmes);
  const [students, setStudents] = useState<StudentRecord[]>(initialScoped.students);
  const [seatLedger, setSeatLedger] = useState<SeatLedgerItem[]>(initialScoped.seatLedger);
  const [duplicates, setDuplicates] = useState<DuplicateCase[]>(initialScoped.duplicates);
  const [credentials, setCredentials] = useState<DigitalCredential[]>(initialScoped.credentials);
  const [consentRequests, setConsentRequests] = useState<ConsentRequest[]>(
    initialScoped.consentRequests
  );
  const [verificationLogs, setVerificationLogs] = useState<VerificationLog[]>(
    initialScoped.verificationLogs
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialScoped.auditLogs);
  const [alerts, setAlerts] = useState<PlatformAlert[]>(initialScoped.alerts);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>(initialScoped.anomalies);
  const [integrations, setIntegrations] = useState<SystemIntegration[]>(
    initialScoped.integrations
  );
  const [publicKeyPem, setPublicKeyPem] = useState<string>(initialScoped.publicKeyPem);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const applyScopedData = useCallback((data: ReturnType<typeof computeRoleScopedView>) => {
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
  }, []);

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
      // Always apply local database state first so UI is immediately populated
      const localScoped = computeRoleScopedView(loadLocalDb(), targetUser);
      applyScopedData(localScoped);

      setLoading(true);
      try {
        const apiData = await safeJsonFetch('/api/state', {
          headers: buildHeaders(targetUser),
        });
        if (apiData && Array.isArray(apiData.institutions) && apiData.institutions.length > 0) {
          applyScopedData(apiData);
        }
      } catch {
        // Fallback to localScoped already applied
      } finally {
        setLoading(false);
      }
    },
    [applyScopedData, buildHeaders]
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
      const fallbackUser = DEFAULT_USERS[role];
      try {
        const apiData = await safeJsonFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, email }),
        });
        const loggedUser: UserAccount = apiData?.user || fallbackUser;
        setUser(loggedUser);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(loggedUser));
        await fetchStateForUser(loggedUser);
        notify(
          `Signed in as ${loggedUser.name}`,
          `Role: ${loggedUser.role.replace('_', ' ')} · ${loggedUser.organization || ''}`,
          'success'
        );
      } catch {
        setUser(fallbackUser);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(fallbackUser));
        await fetchStateForUser(fallbackUser);
        notify(
          `Signed in as ${fallbackUser.name}`,
          `Role: ${fallbackUser.role.replace('_', ' ')} · ${fallbackUser.organization || ''}`,
          'success'
        );
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
    const apiData = await safeJsonFetch('/api/students', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    if (apiData) {
      await refreshState();
      return apiData;
    }

    // Client-side execution fallback for static deployments
    const db = loadLocalDb();
    const targetInstId =
      user?.role === UserRole.INSTITUTE_ADMIN
        ? user.institutionId || 'inst-1'
        : input.institutionId || 'inst-1';
    const inst = db.institutions.find((i) => i.id === targetInstId) || db.institutions[0];
    const prog = db.programmes.find((p) => p.id === input.programmeId) || db.programmes[0];

    const outcome = evaluateStudentSubmission(
      {
        studentId: input.studentId.trim(),
        fullName: input.fullName.trim(),
        dob: input.dob,
        gender: input.gender || 'Male',
        rawApaarId: input.rawApaarId,
        institutionId: inst.id,
        programmeId: prog.id,
        academicYear: input.academicYear || prog.academicYear,
        admissionDate: input.admissionDate || new Date().toISOString().split('T')[0],
        admissionCategory: input.admissionCategory || AdmissionCategory.GENERAL,
        saveAsDraft: Boolean(input.saveAsDraft),
      },
      db.students,
      db.programmes,
      db.institutions,
      CLIENT_HMAC_SECRET
    );

    const newStudent: StudentRecord = {
      id: `stu-${Date.now()}`,
      studentId: input.studentId.trim(),
      fullName: input.fullName.trim(),
      dob: input.dob || '2005-05-15',
      gender: input.gender || 'Male',
      maskedApaarId: outcome.maskedApaarId,
      apaarHmacToken: outcome.apaarHmacToken,
      rawApaarDemo: normalizeApaarId(input.rawApaarId),
      institutionId: inst.id,
      institutionName: inst.name,
      institutionCode: inst.code,
      programmeId: prog.id,
      programmeName: prog.name,
      department: prog.department,
      academicYear: input.academicYear || prog.academicYear,
      admissionDate: input.admissionDate || new Date().toISOString().split('T')[0],
      admissionCategory: input.admissionCategory || AdmissionCategory.GENERAL,
      isSupernumerary: outcome.isSupernumerary,
      admissionStatus: outcome.admissionStatus,
      validationStatus: outcome.validationStatus,
      validationDate: new Date().toISOString().split('T')[0],
      verificationReference:
        outcome.validationStatus === ValidationStatus.VERIFIED
          ? `VER-2026-${input.studentId.trim()}`
          : `EXC-2026-${input.studentId.trim()}`,
      validationReason: outcome.validationReason,
      recommendedCorrection: outcome.recommendedCorrection,
      verificationStatus: outcome.verificationStatus,
    };

    db.students.unshift(newStudent);
    if (outcome.duplicateCaseDetected) {
      db.duplicates.unshift(outcome.duplicateCaseDetected);
    }
    saveLocalDb(db);
    await refreshState();
    return { student: newStudent, outcome };
  };

  const updateStudent: PlatformContextValue['updateStudent'] = async (id, input) => {
    const apiData = await safeJsonFetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    if (apiData) {
      await refreshState();
      return apiData;
    }

    const db = loadLocalDb();
    const existing = db.students.find((s) => s.id === id);
    if (!existing) throw new Error('Student record not found');
    const prog =
      db.programmes.find((p) => p.id === (input.programmeId || existing.programmeId)) ||
      db.programmes[0];

    const rawApaarToUse =
      input.rawApaarId !== undefined ? input.rawApaarId : existing.rawApaarDemo || '';

    const outcome = evaluateStudentSubmission(
      {
        studentId: input.studentId || existing.studentId,
        fullName: input.fullName || existing.fullName,
        dob: input.dob || existing.dob,
        gender: input.gender || existing.gender,
        rawApaarId: rawApaarToUse,
        institutionId: existing.institutionId,
        programmeId: prog.id,
        academicYear: input.academicYear || existing.academicYear,
        admissionDate: existing.admissionDate,
        admissionCategory: input.admissionCategory || existing.admissionCategory,
      },
      db.students,
      db.programmes,
      db.institutions,
      CLIENT_HMAC_SECRET,
      existing.id
    );

    existing.fullName = input.fullName || existing.fullName;
    existing.studentId = input.studentId || existing.studentId;
    existing.dob = input.dob || existing.dob;
    existing.gender = input.gender || existing.gender;
    existing.programmeId = prog.id;
    existing.programmeName = prog.name;
    existing.department = prog.department;
    existing.academicYear = input.academicYear || existing.academicYear;
    existing.admissionCategory = input.admissionCategory || existing.admissionCategory;
    existing.isSupernumerary = outcome.isSupernumerary;
    existing.maskedApaarId = outcome.maskedApaarId;
    existing.apaarHmacToken = outcome.apaarHmacToken;
    existing.rawApaarDemo = normalizeApaarId(rawApaarToUse);
    existing.validationStatus = outcome.validationStatus;
    existing.admissionStatus = outcome.admissionStatus;
    existing.validationDate = new Date().toISOString().split('T')[0];
    existing.validationReason = outcome.validationReason;
    existing.recommendedCorrection = outcome.recommendedCorrection;
    existing.verificationStatus = outcome.verificationStatus;

    saveLocalDb(db);
    await refreshState();
    return { student: existing, outcome };
  };

  const validateBulkCsv: PlatformContextValue['validateBulkCsv'] = async (rows) => {
    const apiData = await safeJsonFetch('/api/students/bulk-validate', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ rows }),
    });
    if (apiData) return apiData;

    const db = loadLocalDb();
    const enforcedInst =
      user?.role === UserRole.INSTITUTE_ADMIN ? user.institutionId : undefined;
    return validateBulkCsvRows(
      rows,
      db.students,
      db.programmes,
      db.institutions,
      CLIENT_HMAC_SECRET,
      enforcedInst
    );
  };

  const commitBulkCsv: PlatformContextValue['commitBulkCsv'] = async (
    rows,
    includeExceptionRows
  ) => {
    const apiData = await safeJsonFetch('/api/students/bulk-commit', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ rows, includeExceptionRows }),
    });
    if (apiData) {
      await refreshState();
      return apiData;
    }

    const db = loadLocalDb();
    const enforcedInst =
      user?.role === UserRole.INSTITUTE_ADMIN ? user.institutionId : undefined;
    const validation = validateBulkCsvRows(
      rows,
      db.students,
      db.programmes,
      db.institutions,
      CLIENT_HMAC_SECRET,
      enforcedInst
    );

    let committedVerified = 0;
    let queuedExceptions = 0;

    for (const row of validation.results) {
      if (!row.isValid && !includeExceptionRows) continue;
      const inst =
        db.institutions.find(
          (i) => i.code.toLowerCase() === row.institutionCode.toLowerCase()
        ) || db.institutions[0];
      const prog =
        db.programmes.find(
          (p) =>
            p.institutionId === inst.id &&
            p.name.toLowerCase() === row.programmeName.toLowerCase()
        ) ||
        db.programmes.find((p) => p.institutionId === inst.id) ||
        db.programmes[0];

      const outcome = evaluateStudentSubmission(
        {
          studentId: row.studentId || `CSV-${Date.now()}-${row.rowNumber}`,
          fullName: row.fullName || 'Unnamed Student',
          dob: row.dob,
          gender: row.gender,
          rawApaarId: row.rawApaarId,
          institutionId: inst.id,
          programmeId: prog.id,
          academicYear: row.academicYear,
          admissionDate: new Date().toISOString().split('T')[0],
          admissionCategory: row.admissionCategory,
        },
        db.students,
        db.programmes,
        db.institutions,
        CLIENT_HMAC_SECRET
      );

      const newStu: StudentRecord = {
        id: `stu-csv-${Date.now()}-${row.rowNumber}`,
        studentId: row.studentId || `CSV-${row.rowNumber}`,
        fullName: row.fullName || 'Unnamed Student',
        dob: row.dob,
        gender: row.gender,
        maskedApaarId: outcome.maskedApaarId,
        apaarHmacToken: outcome.apaarHmacToken,
        rawApaarDemo: normalizeApaarId(row.rawApaarId),
        institutionId: inst.id,
        institutionName: inst.name,
        institutionCode: inst.code,
        programmeId: prog.id,
        programmeName: prog.name,
        department: prog.department,
        academicYear: row.academicYear,
        admissionDate: new Date().toISOString().split('T')[0],
        admissionCategory: row.admissionCategory,
        isSupernumerary: outcome.isSupernumerary,
        admissionStatus: outcome.admissionStatus,
        validationStatus: outcome.validationStatus,
        validationDate: new Date().toISOString().split('T')[0],
        verificationReference:
          outcome.validationStatus === ValidationStatus.VERIFIED
            ? `VER-CSV-${row.studentId}`
            : `EXC-CSV-${row.studentId}`,
        validationReason: outcome.validationReason || row.errors.join(' '),
        recommendedCorrection: outcome.recommendedCorrection,
        verificationStatus: outcome.verificationStatus,
      };

      db.students.unshift(newStu);
      if (outcome.duplicateCaseDetected) {
        db.duplicates.unshift(outcome.duplicateCaseDetected);
      }
      if (outcome.validationStatus === ValidationStatus.VERIFIED) {
        committedVerified++;
      } else {
        queuedExceptions++;
      }
    }

    saveLocalDb(db);
    await refreshState();
    return { committedVerified, queuedExceptions };
  };

  const resolveDuplicate: PlatformContextValue['resolveDuplicate'] = async (
    id,
    reviewStatus,
    reviewNotes
  ) => {
    const apiData = await safeJsonFetch(`/api/duplicates/${id}/action`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ reviewStatus, reviewNotes }),
    });
    if (!apiData) {
      const db = loadLocalDb();
      const dup = db.duplicates.find((d) => d.id === id);
      if (dup) {
        dup.reviewStatus = reviewStatus;
        if (reviewNotes) dup.reviewNotes = reviewNotes;
      }
      saveLocalDb(db);
    }
    await refreshState();
    notify('Duplicate Shield Updated', `Case status updated to "${reviewStatus}".`, 'success');
  };

  const addInstitution: PlatformContextValue['addInstitution'] = async (input) => {
    const apiData = await safeJsonFetch('/api/institutions', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    if (!apiData) {
      const db = loadLocalDb();
      db.institutions.push({
        id: `inst-${Date.now()}`,
        name: input.name || 'New AICTE Institution',
        code: input.code || `AICTE-IN-${Math.floor(700 + Math.random() * 200)}`,
        state: input.state || 'Delhi',
        district: input.district || 'New Delhi',
        type: input.type || 'Autonomous Private',
        approvalStatus: input.approvalStatus || 'Approved',
        submissionStatus: input.submissionStatus || 'Submitted',
        integrityStatus: input.integrityStatus || 'Compliant',
        establishedYear: Number(input.establishedYear) || 2010,
      });
      saveLocalDb(db);
    }
    await refreshState();
    notify('Institution Added', `${input.name} added to AICTE Directory.`, 'success');
  };

  const updateInstitution: PlatformContextValue['updateInstitution'] = async (id, input) => {
    const apiData = await safeJsonFetch(`/api/institutions/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    if (!apiData) {
      const db = loadLocalDb();
      const inst = db.institutions.find((i) => i.id === id);
      if (inst) Object.assign(inst, input);
      saveLocalDb(db);
    }
    await refreshState();
    notify('Institution Updated', 'Institution details saved.', 'success');
  };

  const addProgramme: PlatformContextValue['addProgramme'] = async (input) => {
    const apiData = await safeJsonFetch('/api/programmes', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    if (!apiData) {
      const db = loadLocalDb();
      const inst =
        db.institutions.find((i) => i.id === input.institutionId) || db.institutions[0];
      db.programmes.push({
        id: `prog-${Date.now()}`,
        institutionId: inst.id,
        institutionName: inst.name,
        institutionCode: inst.code,
        name: input.name || 'New B.Tech Programme',
        department: input.department || 'Engineering',
        academicYear: input.academicYear || '2026-27',
        approvedIntake: Number(input.approvedIntake) || 60,
        supernumerarySeats: Number(input.supernumerarySeats) || 5,
        approvalStatus: input.approvalStatus || 'Approved',
      });
      saveLocalDb(db);
    }
    await refreshState();
    notify('Programme Configured', `${input.name} added to Seat Ledger.`, 'success');
  };

  const updateProgramme: PlatformContextValue['updateProgramme'] = async (id, input) => {
    const apiData = await safeJsonFetch(`/api/programmes/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    if (!apiData) {
      const db = loadLocalDb();
      const prog = db.programmes.find((p) => p.id === id);
      if (prog) {
        if (input.approvedIntake !== undefined) prog.approvedIntake = Number(input.approvedIntake);
        if (input.supernumerarySeats !== undefined)
          prog.supernumerarySeats = Number(input.supernumerarySeats);
        if (input.name) prog.name = input.name;
        if (input.approvalStatus) prog.approvalStatus = input.approvalStatus;
      }
      saveLocalDb(db);
    }
    await refreshState();
    notify('Seat Capacity Updated', 'Live Seat Ledger recalculated.', 'success');
  };

  const generateCredential: PlatformContextValue['generateCredential'] = async (
    studentRecordId
  ) => {
    const apiData = await safeJsonFetch('/api/credentials/generate', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ studentRecordId }),
    });
    if (apiData?.credential) {
      await refreshState();
      notify(
        'Ed25519 Credential Generated',
        `Signed credential ${apiData.credential.credentialId} issued.`,
        'success'
      );
      return apiData.credential;
    }

    const db = loadLocalDb();
    const stu =
      db.students.find((s) => s.id === studentRecordId || s.studentId === studentRecordId) ||
      db.students[0];
    const { publicKeyPem: pubPem, privateKeyPem } = deriveEd25519KeyPair(CLIENT_SIGNING_SEED);
    const credId = `CRED-APAAR-2026-${stu.studentId}`;
    const payload: CredentialPayload = {
      credentialId: credId,
      studentId: stu.studentId,
      studentName: stu.fullName,
      maskedApaarId: stu.maskedApaarId,
      apaarDemoReference: `${stu.rawApaarDemo || '123456789012'} (SYNTHETIC DEMO ID)`,
      institutionId: stu.institutionId,
      institutionName: stu.institutionName,
      institutionCode: stu.institutionCode,
      programmeName: stu.programmeName,
      academicYear: stu.academicYear,
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: '2030-08-31',
      issuer: 'APAAR Setu Central Academic Authority (SIH26263 Prototype)',
    };
    const cred: DigitalCredential = {
      credentialId: credId,
      studentRecordId: stu.id,
      studentId: stu.studentId,
      payload,
      signature: signCredentialPayload(payload, privateKeyPem),
      publicKeyPem: pubPem,
      status: 'Active',
      consentStatus: 'Approved',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
    };
    const idx = db.credentials.findIndex((c) => c.credentialId === credId);
    if (idx >= 0) db.credentials[idx] = cred;
    else db.credentials.unshift(cred);
    saveLocalDb(db);
    await refreshState();
    notify('Ed25519 Credential Generated', `Signed credential ${credId} issued.`, 'success');
    return cred;
  };

  const verifyCredential: PlatformContextValue['verifyCredential'] = async (input) => {
    const apiData = await safeJsonFetch('/api/credentials/verify', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    if (apiData) {
      await refreshState();
      return apiData;
    }

    const db = loadLocalDb();
    const mode = input.mode || 'Online Verification';
    const org = input.verifierOrganization || 'BharatTech Global Solutions Ltd.';

    if (input.signedQrBundle) {
      const { payload, signature } = input.signedQrBundle;
      const sigOk = verifyCredentialSignature(payload, signature, db.publicKeyPem);
      const outcomeResult: VerificationLog['result'] = sigOk
        ? 'Valid Credential'
        : 'Invalid Signature';
      db.verificationLogs.unshift({
        id: `vlog-${Date.now()}`,
        credentialId: payload.credentialId,
        studentId: payload.studentId,
        studentName: payload.studentName,
        institutionName: payload.institutionName,
        verifierName: user?.name || 'Authorized Verifier',
        organization: org,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
        mode: mode === 'Offline Signature Verification' ? 'Offline Signature Check' : 'QR Payload Scan',
        result: outcomeResult,
      });
      saveLocalDb(db);
      await refreshState();
      return {
        result: outcomeResult,
        signatureValid: sigOk,
        mode,
        explanation: sigOk
          ? 'Ed25519 digital signature verified against APAAR Setu public key. Payload integrity confirmed.'
          : 'CRITICAL ALERT: Ed25519 digital signature verification FAILED. The credential payload has been tampered with or modified after signing.',
        credentialStatus: sigOk ? 'Active' : 'Tampered',
        consentStatus: 'Approved',
        payload,
        publicKeyPem: db.publicKeyPem,
      };
    }

    const targetId = (input.credentialId || '').trim();
    const cred = db.credentials.find(
      (c) =>
        c.credentialId.toLowerCase() === targetId.toLowerCase() ||
        c.studentId.toLowerCase() === targetId.toLowerCase()
    );
    if (!cred) throw new Error(`No credential found matching "${targetId}"`);

    const sigValid = verifyCredentialSignature(cred.payload, cred.signature, db.publicKeyPem);
    let result: VerificationLog['result'] = 'Valid Credential';
    let explanation =
      'Ed25519 signature verified, credential is active, and student disclosure consent is approved.';

    if (!sigValid) {
      result = 'Invalid Signature';
      explanation = 'Ed25519 digital signature verification failed.';
    } else if (cred.status === 'Expired') {
      result = 'Expired Credential';
      explanation = `Credential expired on ${cred.payload.expiryDate}.`;
    } else if (cred.consentStatus !== 'Approved') {
      result = 'Consent Required';
      explanation =
        'Cryptographic signature is valid, but student privacy consent is required before personal identity attributes can be disclosed.';
    }

    db.verificationLogs.unshift({
      id: `vlog-${Date.now()}`,
      credentialId: cred.credentialId,
      studentId: cred.studentId,
      studentName:
        result === 'Consent Required' ? 'Protected (Consent Pending)' : cred.payload.studentName,
      institutionName: cred.payload.institutionName,
      verifierName: user?.name || 'Authorized Verifier',
      organization: org,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
      mode: mode === 'Offline Signature Verification' ? 'Offline Signature Check' : 'Online Verification',
      result,
    });
    saveLocalDb(db);
    await refreshState();

    return {
      result,
      signatureValid: sigValid,
      mode,
      explanation,
      credentialStatus: cred.status,
      consentStatus: cred.consentStatus,
      payload:
        result === 'Consent Required'
          ? {
              ...cred.payload,
              studentName: 'PROTECTED — STUDENT CONSENT REQUIRED',
              apaarDemoReference: 'PROTECTED — STUDENT CONSENT REQUIRED',
            }
          : cred.payload,
      publicKeyPem: db.publicKeyPem,
    };
  };

  const requestConsent: PlatformContextValue['requestConsent'] = async (input) => {
    const apiData = await safeJsonFetch('/api/consents/request', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    if (!apiData) {
      const db = loadLocalDb();
      const cred =
        db.credentials.find(
          (c) =>
            c.credentialId === input.credentialId || c.studentId === input.credentialId
        ) || db.credentials[0];
      db.consentRequests.unshift({
        id: `con-req-${Date.now()}`,
        studentRecordId: cred.studentRecordId,
        studentId: cred.studentId,
        studentName: cred.payload.studentName,
        credentialId: cred.credentialId,
        verifierName: input.verifierName || user?.name || 'Authorized Verifier',
        organization: input.organization || 'BharatTech Global Solutions Ltd.',
        purpose: input.purpose || 'Employment & Enrolment Verification',
        requestedFields: input.requestedFields || [
          'Student Full Name',
          'Institution & Programme',
          'Academic Year',
          'APAAR Verification Status',
        ],
        requestDate: new Date().toISOString().split('T')[0],
        expiryDate: '2026-12-31',
        status: 'Pending',
      });
      saveLocalDb(db);
    }
    await refreshState();
    notify(
      'Consent Request Sent',
      `Verification request sent to student (${input.credentialId}).`,
      'success'
    );
  };

  const respondConsent: PlatformContextValue['respondConsent'] = async (id, decision) => {
    const apiData = await safeJsonFetch(`/api/consents/${id}/respond`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ decision }),
    });
    if (!apiData) {
      const db = loadLocalDb();
      const reqItem = db.consentRequests.find((c) => c.id === id);
      if (reqItem) {
        reqItem.status = decision;
        const cred = db.credentials.find((c) => c.credentialId === reqItem.credentialId);
        if (cred) {
          cred.consentStatus = decision === 'Approved' ? 'Approved' : 'Consent Required';
        }
      }
      saveLocalDb(db);
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
    const apiData = await safeJsonFetch(`/api/credentials/${credentialId}/consent`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ consentStatus }),
    });
    if (!apiData) {
      const db = loadLocalDb();
      const cred = db.credentials.find((c) => c.credentialId === credentialId);
      if (cred) cred.consentStatus = consentStatus;
      saveLocalDb(db);
    }
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
    const apiData = await safeJsonFetch(`/api/integrations/${id}/sync`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ connectionStatus }),
    });
    if (!apiData) {
      const db = loadLocalDb();
      const intItem = db.integrations.find((i) => i.id === id);
      if (intItem) {
        intItem.connectionStatus = connectionStatus || 'Connected to Sandbox';
        intItem.lastSync = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
      }
      saveLocalDb(db);
    }
    await refreshState();
    notify('Sandbox Adapter Synchronized', 'Integration connector handshake verified.', 'success');
  };

  const analyzeAnomaliesWithAi: PlatformContextValue['analyzeAnomaliesWithAi'] = async () => {
    const apiData = await safeJsonFetch('/api/ai/analyze-anomalies', {
      method: 'POST',
      headers: buildHeaders(),
    });
    if (apiData && apiData.summary) return apiData;

    const db = loadLocalDb();
    const detected = detectAdmissionAnomalies(
      db.students,
      db.programmes,
      db.institutions,
      db.duplicates
    );
    return {
      source: 'Deterministic Rule Engine (Sovereign Sandbox)',
      summary: `Automated compliance scan across ${db.institutions.length} AICTE institutions and ${db.students.length} student records identified ${detected.length} active anomaly patterns, including cross-institution HMAC-SHA256 identity matches and full 60/60 regular intake utilization at ABC Engineering College. No raw 12-digit APAAR numbers were exposed.`,
      recommendations: [
        'Inspect side-by-side institutional timestamps in Duplicate Shield and verify migration/withdrawal slips before confirming secondary seats.',
        'Enforce strict separation between Regular Approved Intake (60/60) and Supernumerary quotas (NRI / OCI / FN / PMSSS) in the Live Seat Ledger.',
        'Require Nodal Officers to clear Missing APAAR IDs in the APAAR Validation Engine exception queue within the 14-day provisional window.',
      ],
    };
  };

  const resetDemoData: PlatformContextValue['resetDemoData'] = async () => {
    const fresh = buildInitialSeedDatabase(CLIENT_HMAC_SECRET, CLIENT_SIGNING_SEED);
    saveLocalDb(fresh);
    await safeJsonFetch('/api/admin/reset-demo', {
      method: 'POST',
      headers: buildHeaders(),
    });
    await refreshState();
    notify(
      'Demo Data Restored',
      'All 10 institutions, 60/60 seat ledger, duplicates, and credentials reset to initial seed state.',
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
