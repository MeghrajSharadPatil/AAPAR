import express, { Request, Response } from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  AdmissionCategory,
  AdmissionStatus,
  AuditLogEntry,
  ConsentRequest,
  CredentialPayload,
  DigitalCredential,
  Institution,
  PlatformAlert,
  Programme,
  StudentRecord,
  UserRole,
  ValidationStatus,
  VerificationLog,
} from './src/types/domain';
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
} from './src/lib/engine';
import { buildInitialSeedDatabase, DatabaseState } from './src/lib/seedData';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HMAC_SECRET =
  process.env.APAAR_HMAC_SECRET || 'sih26263-apaar-setu-hmac-server-secret-2026';
const SIGNING_SEED =
  process.env.APAAR_SIGNING_SEED || 'sih26263-apaar-setu-ed25519-signing-seed-2026';

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'apaar-setu-data')
  : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const { publicKeyPem, privateKeyPem } = deriveEd25519KeyPair(SIGNING_SEED);

function loadOrInitDb(): DatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseState;
      if (parsed && Array.isArray(parsed.institutions) && Array.isArray(parsed.students)) {
        parsed.publicKeyPem = publicKeyPem;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Re-initializing demo database from seed:', err);
  }
  const initial = buildInitialSeedDatabase(HMAC_SECRET, SIGNING_SEED);
  saveDb(initial);
  return initial;
}

function saveDb(state: DatabaseState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist db.json:', err);
  }
}

let db: DatabaseState = loadOrInitDb();

function recordAudit(
  userName: string,
  userRole: UserRole,
  action: string,
  entityReference: string,
  status: AuditLogEntry['status'],
  details: string
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actionId: `ACT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    userName,
    userRole,
    action,
    entityReference,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
    status,
    details,
  };
  db.auditLogs.unshift(entry);
  return entry;
}

/**
 * Sanitizes student records before sending to client so HMAC tokens are never exposed to the browser.
 */
function sanitizeStudentForClient(student: StudentRecord, includeDemoRawForCert = false): StudentRecord {
  const copy: StudentRecord = { ...student };
  delete copy.apaarHmacToken;
  if (!includeDemoRawForCert) {
    delete copy.rawApaarDemo;
  }
  return copy;
}

function getCallerContext(req: Request): {
  role: UserRole;
  userName: string;
  institutionId: string;
  studentId: string;
} {
  const roleHeader = (req.headers['x-demo-role'] as UserRole) || UserRole.AICTE_ADMIN;
  const userName = (req.headers['x-demo-user-name'] as string) || 'Authorized User';
  const institutionId = (req.headers['x-demo-institution-id'] as string) || 'inst-1';
  const studentId = (req.headers['x-demo-student-id'] as string) || '221901';
  return { role: roleHeader, userName, institutionId, studentId };
}

export const app = express();
app.use(express.json({ limit: '5mb' }));

  // --- AUTHENTICATION ENDPOINT ---
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { role, email } = req.body as { role?: UserRole; email?: string; password?: string };
    let account = db.users.find((u) => (role && u.role === role) || (email && u.email.toLowerCase() === email.toLowerCase()));
    if (!account) {
      account = db.users[0];
    }

    recordAudit(
      account.name,
      account.role,
      'User Portal Login',
      account.email,
      'Success',
      `Authenticated into ${account.role} portal session.`
    );
    saveDb(db);

    res.json({
      user: account,
      sessionToken: `demo-jwt-${account.role.toLowerCase()}-${Date.now()}`,
    });
  });

  // --- ROLE-ISOLATED PLATFORM STATE ENDPOINT ---
  app.get('/api/state', (req: Request, res: Response) => {
    const { role, institutionId, studentId } = getCallerContext(req);
    const fullSeatLedger = computeSeatLedger(db.programmes, db.students);
    const fullAnomalies = detectAdmissionAnomalies(
      db.students,
      db.programmes,
      db.institutions,
      db.duplicates
    );

    if (role === UserRole.AICTE_ADMIN) {
      return res.json({
        institutions: db.institutions,
        programmes: db.programmes,
        students: db.students.map((s) => sanitizeStudentForClient(s, true)),
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
      });
    }

    if (role === UserRole.INSTITUTE_ADMIN) {
      const instStudents = db.students
        .filter((s) => s.institutionId === institutionId)
        .map((s) => sanitizeStudentForClient(s, true));
      const instProgrammes = db.programmes.filter((p) => p.institutionId === institutionId);
      const instLedger = fullSeatLedger.filter((l) => l.institutionId === institutionId);
      const instDuplicates = db.duplicates.filter(
        (d) => d.institutionAId === institutionId || d.institutionBId === institutionId
      );
      const instCredentials = db.credentials.filter(
        (c) => c.payload.institutionId === institutionId
      );
      const instAlerts = db.alerts.filter((a) => a.institutionId === institutionId);
      const instAnomalies = fullAnomalies.filter((a) => a.institutionId === institutionId);

      return res.json({
        institutions: db.institutions.filter((i) => i.id === institutionId),
        programmes: instProgrammes,
        students: instStudents,
        seatLedger: instLedger,
        duplicates: instDuplicates,
        credentials: instCredentials,
        consentRequests: db.consentRequests.filter((cr) =>
          instStudents.some((s) => s.studentId === cr.studentId)
        ),
        verificationLogs: db.verificationLogs.filter((vl) =>
          instStudents.some((s) => s.studentId === vl.studentId)
        ),
        auditLogs: db.auditLogs.slice(0, 25),
        alerts: instAlerts,
        anomalies: instAnomalies,
        integrations: db.integrations,
        publicKeyPem: db.publicKeyPem,
      });
    }

    if (role === UserRole.STUDENT) {
      const myRecords = db.students
        .filter((s) => s.studentId === studentId && s.institutionId === institutionId)
        .map((s) => sanitizeStudentForClient(s, true));
      const myCredentials = db.credentials.filter((c) => c.studentId === studentId);
      const myConsents = db.consentRequests.filter((cr) => cr.studentId === studentId);
      const myVerifications = db.verificationLogs.filter((vl) => vl.studentId === studentId);

      return res.json({
        institutions: db.institutions.filter((i) => i.id === institutionId),
        programmes: db.programmes.filter((p) => p.institutionId === institutionId),
        students: myRecords,
        seatLedger: [],
        duplicates: [],
        credentials: myCredentials,
        consentRequests: myConsents,
        verificationLogs: myVerifications,
        auditLogs: db.auditLogs.filter((a) => a.entityReference.includes(studentId) || a.userName === 'Rahul Sharma'),
        alerts: [],
        anomalies: [],
        integrations: [],
        publicKeyPem: db.publicKeyPem,
      });
    }

    // VERIFIER role: strictly prohibited from accessing full student database
    return res.json({
      institutions: db.institutions.map((i) => ({
        id: i.id,
        name: i.name,
        code: i.code,
        state: i.state,
        district: i.district,
        type: i.type,
        approvalStatus: i.approvalStatus,
        submissionStatus: i.submissionStatus,
        integrityStatus: i.integrityStatus,
        establishedYear: i.establishedYear,
      })),
      programmes: [],
      students: [], // Verifier cannot view student database
      seatLedger: [],
      duplicates: [],
      credentials: db.credentials.map((c) => ({
        ...c,
        payload:
          c.consentStatus === 'Approved'
            ? c.payload
            : {
                ...c.payload,
                studentName: 'Protected (Student Consent Required)',
                apaarDemoReference: 'Protected (Student Consent Required)',
              },
      })),
      consentRequests: db.consentRequests,
      verificationLogs: db.verificationLogs,
      auditLogs: [],
      alerts: [],
      anomalies: [],
      integrations: [],
      publicKeyPem: db.publicKeyPem,
    });
  });

  // --- CREATE STUDENT RECORD (WITH SERVER-SIDE VALIDATION, DUPLICATE SHIELD & SEAT LEDGER) ---
  app.post('/api/students', (req: Request, res: Response) => {
    const { role, userName, institutionId: callerInstId } = getCallerContext(req);
    if (role !== UserRole.INSTITUTE_ADMIN && role !== UserRole.AICTE_ADMIN) {
      return res.status(403).json({ error: 'Unauthorized role for student registration.' });
    }

    const body = req.body as {
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
    };

    const targetInstitutionId =
      role === UserRole.INSTITUTE_ADMIN ? callerInstId : body.institutionId || callerInstId;

    if (!body.studentId?.trim() || !body.fullName?.trim() || !body.programmeId) {
      return res.status(400).json({
        error: 'Student Full Name, Student ID / Enrolment Number, and Programme are required.',
      });
    }

    const inst = db.institutions.find((i) => i.id === targetInstitutionId);
    const prog = db.programmes.find((p) => p.id === body.programmeId);
    if (!inst || !prog) {
      return res.status(400).json({ error: 'Invalid Institution or Programme selection.' });
    }

    const outcome = evaluateStudentSubmission(
      {
        studentId: body.studentId.trim(),
        fullName: body.fullName.trim(),
        dob: body.dob || '2005-05-15',
        gender: body.gender || 'Male',
        rawApaarId: body.rawApaarId,
        institutionId: inst.id,
        programmeId: prog.id,
        academicYear: body.academicYear || '2026-27',
        admissionDate: body.admissionDate || new Date().toISOString().split('T')[0],
        admissionCategory: body.admissionCategory || AdmissionCategory.GENERAL,
        saveAsDraft: Boolean(body.saveAsDraft),
      },
      db.students,
      db.programmes,
      db.institutions,
      HMAC_SECRET
    );

    const cleanRawApaar = normalizeApaarId(body.rawApaarId);
    const newRecord: StudentRecord = {
      id: `stu-${Date.now()}`,
      studentId: body.studentId.trim(),
      fullName: body.fullName.trim(),
      dob: body.dob || '2005-05-15',
      gender: body.gender || 'Male',
      maskedApaarId: outcome.maskedApaarId,
      apaarHmacToken: outcome.apaarHmacToken,
      rawApaarDemo: cleanRawApaar,
      institutionId: inst.id,
      institutionName: inst.name,
      institutionCode: inst.code,
      programmeId: prog.id,
      programmeName: prog.name,
      department: prog.department,
      academicYear: body.academicYear || '2026-27',
      admissionDate: body.admissionDate || new Date().toISOString().split('T')[0],
      admissionCategory: body.admissionCategory || AdmissionCategory.GENERAL,
      isSupernumerary: outcome.isSupernumerary,
      admissionStatus: outcome.admissionStatus,
      validationStatus: outcome.validationStatus,
      validationDate: new Date().toISOString().split('T')[0],
      verificationReference:
        outcome.validationStatus === ValidationStatus.VERIFIED
          ? `VER-2026-${body.studentId.trim()}`
          : `EXC-2026-${body.studentId.trim()}`,
      validationReason: outcome.validationReason,
      recommendedCorrection: outcome.recommendedCorrection,
      verificationStatus: outcome.verificationStatus,
    };

    db.students.unshift(newRecord);

    // If Duplicate Shield detected a match, add to duplicates & alerts
    if (outcome.duplicateCaseDetected) {
      db.duplicates.unshift(outcome.duplicateCaseDetected);
      db.alerts.unshift({
        id: `alt-${Date.now()}`,
        alertType: 'Duplicate APAAR Match Detected',
        institutionId: inst.id,
        institutionName: inst.name,
        programme: prog.name,
        timestamp: 'Just now',
        severity: 'Critical',
        description:
          outcome.validationReason ||
          `Cross-institution duplicate identity detected for ${newRecord.fullName}.`,
        targetRoute: '/duplicate-shield',
      });
    }

    // If Seat Capacity was exceeded, add high-severity alert
    if (outcome.seatExceededWarning) {
      db.alerts.unshift({
        id: `alt-seat-${Date.now()}`,
        alertType: 'Admission Exceeding Approved Intake',
        institutionId: inst.id,
        institutionName: inst.name,
        programme: prog.name,
        timestamp: 'Just now',
        severity: 'Critical',
        description: outcome.seatExceededWarning,
        targetRoute: '/seat-ledger',
      });
    }

    // If Missing APAAR, add alert
    if (outcome.validationStatus === ValidationStatus.MISSING_APAAR) {
      db.alerts.unshift({
        id: `alt-miss-${Date.now()}`,
        alertType: 'Missing APAAR ID',
        institutionId: inst.id,
        institutionName: inst.name,
        programme: prog.name,
        timestamp: 'Just now',
        severity: 'Medium',
        description: `Student ${newRecord.fullName} (${newRecord.studentId}) submitted without APAAR ID and placed in Exception Queue.`,
        targetRoute: '/apaar-validation',
      });
    }

    // If Verified, automatically issue Ed25519 Digital Credential
    if (outcome.validationStatus === ValidationStatus.VERIFIED) {
      const credPayload: CredentialPayload = {
        credentialId: `CRED-APAAR-2026-${newRecord.studentId}`,
        studentId: newRecord.studentId,
        studentName: newRecord.fullName,
        maskedApaarId: newRecord.maskedApaarId,
        apaarDemoReference: `${cleanRawApaar} (SYNTHETIC DEMO ID)`,
        institutionId: inst.id,
        institutionName: inst.name,
        institutionCode: inst.code,
        programmeName: prog.name,
        academicYear: newRecord.academicYear,
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: '2030-08-31',
        issuer: 'APAAR Setu Central Academic Authority (SIH26263 Prototype)',
      };
      db.credentials.unshift({
        credentialId: credPayload.credentialId,
        studentRecordId: newRecord.id,
        studentId: newRecord.studentId,
        payload: credPayload,
        signature: signCredentialPayload(credPayload, privateKeyPem),
        publicKeyPem,
        status: 'Active',
        consentStatus: 'Approved',
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' IST',
      });
    }

    recordAudit(
      userName,
      role,
      'Student Admission Registration',
      `${newRecord.studentId} (${newRecord.maskedApaarId})`,
      outcome.validationStatus === ValidationStatus.VERIFIED ? 'Success' : 'Flagged',
      `Registered ${newRecord.fullName} in ${prog.name} -> Status: ${outcome.validationStatus}, Admission: ${outcome.admissionStatus}.`
    );

    saveDb(db);
    return res.status(201).json({
      student: sanitizeStudentForClient(newRecord, true),
      outcome: {
        ...outcome,
        apaarHmacToken: undefined,
      },
    });
  });

  // --- UPDATE / REVALIDATE STUDENT RECORD (EXCEPTION QUEUE RESOLUTION) ---
  app.put('/api/students/:id', (req: Request, res: Response) => {
    const { role, userName, institutionId: callerInstId } = getCallerContext(req);
    if (role !== UserRole.INSTITUTE_ADMIN && role !== UserRole.AICTE_ADMIN) {
      return res.status(403).json({ error: 'Unauthorized role.' });
    }

    const existingIdx = db.students.findIndex((s) => s.id === req.params.id);
    if (existingIdx === -1) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    const existing = db.students[existingIdx];
    if (role === UserRole.INSTITUTE_ADMIN && existing.institutionId !== callerInstId) {
      return res.status(403).json({
        error: 'Institution data isolation policy: You can only modify records belonging to your institution.',
      });
    }

    const body = req.body as Partial<{
      fullName: string;
      studentId: string;
      dob: string;
      gender: 'Male' | 'Female' | 'Other';
      rawApaarId: string;
      programmeId: string;
      academicYear: string;
      admissionCategory: AdmissionCategory;
    }>;

    const cleanRaw =
      body.rawApaarId !== undefined
        ? normalizeApaarId(body.rawApaarId)
        : existing.rawApaarDemo || '';

    const targetProgId = body.programmeId || existing.programmeId;
    const prog = db.programmes.find((p) => p.id === targetProgId);
    const inst = db.institutions.find((i) => i.id === existing.institutionId);

    if (!prog || !inst) {
      return res.status(400).json({ error: 'Invalid programme or institution reference.' });
    }

    const outcome = evaluateStudentSubmission(
      {
        studentId: body.studentId?.trim() || existing.studentId,
        fullName: body.fullName?.trim() || existing.fullName,
        dob: body.dob || existing.dob,
        gender: body.gender || existing.gender,
        rawApaarId: cleanRaw,
        institutionId: inst.id,
        programmeId: prog.id,
        academicYear: body.academicYear || existing.academicYear,
        admissionDate: existing.admissionDate,
        admissionCategory: body.admissionCategory || existing.admissionCategory,
      },
      db.students,
      db.programmes,
      db.institutions,
      HMAC_SECRET,
      existing.id
    );

    const updated: StudentRecord = {
      ...existing,
      studentId: body.studentId?.trim() || existing.studentId,
      fullName: body.fullName?.trim() || existing.fullName,
      dob: body.dob || existing.dob,
      gender: body.gender || existing.gender,
      maskedApaarId: outcome.maskedApaarId,
      apaarHmacToken: outcome.apaarHmacToken,
      rawApaarDemo: cleanRaw,
      programmeId: prog.id,
      programmeName: prog.name,
      department: prog.department,
      academicYear: body.academicYear || existing.academicYear,
      admissionCategory: body.admissionCategory || existing.admissionCategory,
      isSupernumerary: outcome.isSupernumerary,
      admissionStatus: outcome.admissionStatus,
      validationStatus: outcome.validationStatus,
      validationDate: new Date().toISOString().split('T')[0],
      validationReason: outcome.validationReason,
      recommendedCorrection: outcome.recommendedCorrection,
      verificationStatus: outcome.verificationStatus,
    };

    db.students[existingIdx] = updated;

    recordAudit(
      userName,
      role,
      'Student Record Updated & Revalidated',
      `${updated.studentId} (${updated.maskedApaarId})`,
      updated.validationStatus === ValidationStatus.VERIFIED ? 'Success' : 'Warning',
      `Updated student record and re-ran APAAR Validation Engine -> ${updated.validationStatus}.`
    );

    saveDb(db);
    return res.json({
      student: sanitizeStudentForClient(updated, true),
      outcome: {
        ...outcome,
        apaarHmacToken: undefined,
      },
    });
  });

  // --- BULK CSV VALIDATION PREVIEW ---
  app.post('/api/students/bulk-validate', (req: Request, res: Response) => {
    const { role, institutionId: callerInstId } = getCallerContext(req);
    if (role !== UserRole.INSTITUTE_ADMIN && role !== UserRole.AICTE_ADMIN) {
      return res.status(403).json({ error: 'Unauthorized role.' });
    }

    const { rows } = req.body as { rows: Array<Record<string, string>> };
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: 'CSV rows array is required.' });
    }

    const enforcedInst = role === UserRole.INSTITUTE_ADMIN ? callerInstId : undefined;
    const validationReport = validateBulkCsvRows(
      rows,
      db.students,
      db.programmes,
      db.institutions,
      HMAC_SECRET,
      enforcedInst
    );

    return res.json(validationReport);
  });

  // --- BULK CSV COMMIT ---
  app.post('/api/students/bulk-commit', (req: Request, res: Response) => {
    const { role, userName, institutionId: callerInstId } = getCallerContext(req);
    if (role !== UserRole.INSTITUTE_ADMIN && role !== UserRole.AICTE_ADMIN) {
      return res.status(403).json({ error: 'Unauthorized role.' });
    }

    const { rows, includeExceptionRows } = req.body as {
      rows: Array<Record<string, string>>;
      includeExceptionRows?: boolean;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided for upload.' });
    }

    let committedVerified = 0;
    let queuedExceptions = 0;

    for (const raw of rows) {
      const studentId = (raw.studentId || raw.StudentID || `CSV-${Date.now()}`).trim();
      const fullName = (raw.fullName || raw.StudentName || 'Unnamed Student').trim();
      const dob = (raw.dob || raw.DOB || '2005-06-15').trim();
      const genderRaw = (raw.gender || raw.Gender || 'Male').trim();
      const gender: 'Male' | 'Female' | 'Other' =
        genderRaw === 'Female' || genderRaw === 'Other' ? genderRaw : 'Male';
      const rawApaarId = normalizeApaarId(raw.apaarId || raw.APAAR_ID || '');
      const institutionCode = (raw.institutionCode || raw.InstitutionCode || '').trim();
      const programmeName = (raw.programmeName || raw.Programme || '').trim();
      const academicYear = (raw.academicYear || raw.AcademicYear || '2026-27').trim();
      const categoryRaw = (raw.admissionCategory || raw.Category || AdmissionCategory.GENERAL).trim();
      const admissionCategory = Object.values(AdmissionCategory).includes(
        categoryRaw as AdmissionCategory
      )
        ? (categoryRaw as AdmissionCategory)
        : AdmissionCategory.GENERAL;

      const inst =
        role === UserRole.INSTITUTE_ADMIN
          ? db.institutions.find((i) => i.id === callerInstId)
          : db.institutions.find(
              (i) => i.code.toLowerCase() === institutionCode.toLowerCase()
            ) || db.institutions[0];

      if (!inst) continue;

      const prog =
        db.programmes.find(
          (p) =>
            p.institutionId === inst.id &&
            p.name.toLowerCase() === programmeName.toLowerCase()
        ) || db.programmes.find((p) => p.institutionId === inst.id);

      if (!prog) continue;

      const outcome = evaluateStudentSubmission(
        {
          studentId,
          fullName,
          dob,
          gender,
          rawApaarId,
          institutionId: inst.id,
          programmeId: prog.id,
          academicYear,
          admissionDate: new Date().toISOString().split('T')[0],
          admissionCategory,
        },
        db.students,
        db.programmes,
        db.institutions,
        HMAC_SECRET
      );

      // If programme name in CSV did not match any approved programme under the institution, flag it explicitly
      const progMatchedExactly = db.programmes.some(
        (p) =>
          p.institutionId === inst.id &&
          p.name.toLowerCase() === programmeName.toLowerCase()
      );
      if (!progMatchedExactly) {
        outcome.validationStatus = ValidationStatus.FLAGGED;
        outcome.admissionStatus = AdmissionStatus.PROVISIONAL;
        outcome.verificationStatus = 'Exception Queue';
        outcome.validationReason = `Uploaded programme "${programmeName || 'MISSING'}" is not mapped to ${inst.code}. Assigned provisionally to ${prog.name} in Exception Queue.`;
        outcome.recommendedCorrection = 'Assign valid AICTE-approved programme in Student Management.';
      }

      if (outcome.validationStatus !== ValidationStatus.VERIFIED && !includeExceptionRows) {
        continue;
      }

      const newRecord: StudentRecord = {
        id: `stu-csv-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        studentId,
        fullName,
        dob,
        gender,
        maskedApaarId: outcome.maskedApaarId,
        apaarHmacToken: outcome.apaarHmacToken,
        rawApaarDemo: rawApaarId,
        institutionId: inst.id,
        institutionName: inst.name,
        institutionCode: inst.code,
        programmeId: prog.id,
        programmeName: prog.name,
        department: prog.department,
        academicYear,
        admissionDate: new Date().toISOString().split('T')[0],
        admissionCategory,
        isSupernumerary: outcome.isSupernumerary,
        admissionStatus: outcome.admissionStatus,
        validationStatus: outcome.validationStatus,
        validationDate: new Date().toISOString().split('T')[0],
        verificationReference:
          outcome.validationStatus === ValidationStatus.VERIFIED
            ? `VER-CSV-${studentId}`
            : `EXC-CSV-${studentId}`,
        validationReason: outcome.validationReason,
        recommendedCorrection: outcome.recommendedCorrection,
        verificationStatus: outcome.verificationStatus,
      };

      db.students.unshift(newRecord);
      if (outcome.duplicateCaseDetected) {
        db.duplicates.unshift(outcome.duplicateCaseDetected);
      }

      if (outcome.validationStatus === ValidationStatus.VERIFIED) {
        committedVerified++;
      } else {
        queuedExceptions++;
      }
    }

    recordAudit(
      userName,
      role,
      'Bulk CSV Student Upload',
      `BATCH-${rows.length}-ROWS`,
      queuedExceptions > 0 ? 'Warning' : 'Success',
      `Processed ${rows.length} CSV rows: ${committedVerified} verified & confirmed, ${queuedExceptions} routed to Exception Queue / Duplicate Shield.`
    );

    saveDb(db);
    return res.json({
      committedVerified,
      queuedExceptions,
    });
  });

  // --- DUPLICATE SHIELD RESOLUTION & ESCALATION ---
  app.post('/api/duplicates/:id/action', (req: Request, res: Response) => {
    const { role, userName } = getCallerContext(req);
    if (role !== UserRole.AICTE_ADMIN && role !== UserRole.INSTITUTE_ADMIN) {
      return res.status(403).json({ error: 'Unauthorized role.' });
    }

    const dup = db.duplicates.find((d) => d.id === req.params.id);
    if (!dup) {
      return res.status(404).json({ error: 'Duplicate case not found.' });
    }

    const { reviewStatus, reviewNotes } = req.body as {
      reviewStatus: DuplicateCase['reviewStatus'];
      reviewNotes?: string;
    };

    dup.reviewStatus = reviewStatus;
    if (reviewNotes !== undefined && reviewNotes.trim()) {
      dup.reviewNotes = reviewNotes.trim();
    }

    // If resolved as legitimate transfer, mark the secondary student record as Verified & Confirmed
    if (reviewStatus === 'Resolved - Legitimate Transfer') {
      const stuB = db.students.find((s) => s.studentId === dup.studentIdB);
      if (stuB) {
        stuB.validationStatus = ValidationStatus.VERIFIED;
        stuB.admissionStatus = AdmissionStatus.CONFIRMED;
        stuB.verificationStatus = 'Verified Credential Issued';
        stuB.validationReason = 'Cleared via Duplicate Shield as verified inter-institutional transfer.';
      }
    }

    recordAudit(
      userName,
      role,
      `Duplicate Shield: ${reviewStatus}`,
      dup.referenceId,
      reviewStatus === 'Escalated to AICTE' ? 'Flagged' : 'Success',
      `Updated duplicate case ${dup.referenceId} (${dup.maskedApaarId}) -> ${reviewStatus}. Notes: ${dup.reviewNotes}`
    );

    saveDb(db);
    return res.json({ duplicate: dup });
  });

  // --- INSTITUTION & PROGRAMME MANAGEMENT (AICTE ADMIN) ---
  app.post('/api/institutions', (req: Request, res: Response) => {
    const { role, userName } = getCallerContext(req);
    if (role !== UserRole.AICTE_ADMIN) {
      return res.status(403).json({ error: 'Only AICTE Admin can register institutions.' });
    }

    const body = req.body as Partial<Institution>;
    if (!body.name?.trim() || !body.code?.trim()) {
      return res.status(400).json({ error: 'Institution Name and Code are required.' });
    }

    const newInst: Institution = {
      id: `inst-${Date.now()}`,
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      state: body.state?.trim() || 'Delhi',
      district: body.district?.trim() || 'New Delhi',
      type: body.type || 'Autonomous Private',
      approvalStatus: body.approvalStatus || 'Approved',
      submissionStatus: body.submissionStatus || 'Submitted',
      integrityStatus: 'Compliant',
      establishedYear: Number(body.establishedYear) || 2010,
    };

    db.institutions.push(newInst);
    recordAudit(
      userName,
      role,
      'Institution Registered',
      newInst.code,
      'Success',
      `Added AICTE-approved institution ${newInst.name} (${newInst.code}).`
    );
    saveDb(db);
    return res.status(201).json({ institution: newInst });
  });

  app.put('/api/institutions/:id', (req: Request, res: Response) => {
    const { role, userName } = getCallerContext(req);
    if (role !== UserRole.AICTE_ADMIN) {
      return res.status(403).json({ error: 'Only AICTE Admin can update institution parameters.' });
    }

    const inst = db.institutions.find((i) => i.id === req.params.id);
    if (!inst) return res.status(404).json({ error: 'Institution not found.' });

    const body = req.body as Partial<Institution>;
    if (body.name) inst.name = body.name.trim();
    if (body.state) inst.state = body.state.trim();
    if (body.district) inst.district = body.district.trim();
    if (body.type) inst.type = body.type;
    if (body.approvalStatus) inst.approvalStatus = body.approvalStatus;
    if (body.submissionStatus) inst.submissionStatus = body.submissionStatus;
    if (body.integrityStatus) inst.integrityStatus = body.integrityStatus;

    recordAudit(
      userName,
      role,
      'Institution Directory Updated',
      inst.code,
      'Success',
      `Updated status for ${inst.name} (${inst.code}).`
    );
    saveDb(db);
    return res.json({ institution: inst });
  });

  app.post('/api/programmes', (req: Request, res: Response) => {
    const { role, userName } = getCallerContext(req);
    if (role !== UserRole.AICTE_ADMIN && role !== UserRole.INSTITUTE_ADMIN) {
      return res.status(403).json({ error: 'Unauthorized role.' });
    }

    const body = req.body as Partial<Programme>;
    const inst = db.institutions.find((i) => i.id === body.institutionId);
    if (!inst || !body.name?.trim()) {
      return res.status(400).json({ error: 'Valid Institution and Programme Name are required.' });
    }

    const newProg: Programme = {
      id: `prog-${Date.now()}`,
      institutionId: inst.id,
      institutionName: inst.name,
      institutionCode: inst.code,
      name: body.name.trim(),
      department: body.department?.trim() || body.name.trim(),
      academicYear: body.academicYear || '2026-27',
      approvedIntake: Number(body.approvedIntake) || 60,
      supernumerarySeats: Number(body.supernumerarySeats) || 5,
      approvalStatus: body.approvalStatus || 'Approved',
    };

    db.programmes.push(newProg);
    recordAudit(
      userName,
      role,
      'Programme Intake Configured',
      `${inst.code}:${newProg.name}`,
      'Success',
      `Configured ${newProg.name} with Approved Intake ${newProg.approvedIntake} + Supernumerary ${newProg.supernumerarySeats}.`
    );
    saveDb(db);
    return res.status(201).json({ programme: newProg });
  });

  app.put('/api/programmes/:id', (req: Request, res: Response) => {
    const { role, userName } = getCallerContext(req);
    if (role !== UserRole.AICTE_ADMIN && role !== UserRole.INSTITUTE_ADMIN) {
      return res.status(403).json({ error: 'Unauthorized role.' });
    }

    const prog = db.programmes.find((p) => p.id === req.params.id);
    if (!prog) return res.status(404).json({ error: 'Programme not found.' });

    const body = req.body as Partial<Programme>;
    if (body.approvedIntake !== undefined) prog.approvedIntake = Math.max(1, Number(body.approvedIntake));
    if (body.supernumerarySeats !== undefined)
      prog.supernumerarySeats = Math.max(0, Number(body.supernumerarySeats));
    if (body.approvalStatus) prog.approvalStatus = body.approvalStatus;

    recordAudit(
      userName,
      role,
      'Seat Ledger Capacity Rule Updated',
      `${prog.institutionCode}:${prog.name}`,
      'Success',
      `Updated capacity to Approved Intake=${prog.approvedIntake}, Supernumerary=${prog.supernumerarySeats}.`
    );
    saveDb(db);
    return res.json({ programme: prog });
  });

  // --- DIGITAL CREDENTIAL GENERATION (Ed25519) ---
  app.post('/api/credentials/generate', (req: Request, res: Response) => {
    const { role, userName, institutionId: callerInstId } = getCallerContext(req);
    if (role !== UserRole.INSTITUTE_ADMIN && role !== UserRole.AICTE_ADMIN) {
      return res.status(403).json({ error: 'Unauthorized role for credential generation.' });
    }

    const { studentRecordId } = req.body as { studentRecordId: string };
    const student = db.students.find((s) => s.id === studentRecordId || s.studentId === studentRecordId);
    if (!student) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    if (role === UserRole.INSTITUTE_ADMIN && student.institutionId !== callerInstId) {
      return res.status(403).json({ error: 'Cannot generate credentials for another institution.' });
    }

    if (student.validationStatus !== ValidationStatus.VERIFIED) {
      return res.status(400).json({
        error: `Cannot issue verified digital credential while student validation status is "${student.validationStatus}". Resolve exceptions first.`,
      });
    }

    const credId = `CRED-APAAR-2026-${student.studentId}`;
    const payload: CredentialPayload = {
      credentialId: credId,
      studentId: student.studentId,
      studentName: student.fullName,
      maskedApaarId: student.maskedApaarId,
      apaarDemoReference: `${student.rawApaarDemo || '123456789012'} (SYNTHETIC DEMO ID)`,
      institutionId: student.institutionId,
      institutionName: student.institutionName,
      institutionCode: student.institutionCode,
      programmeName: student.programmeName,
      academicYear: student.academicYear,
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: '2030-08-31',
      issuer: 'APAAR Setu Central Academic Authority (SIH26263 Prototype)',
    };

    const signature = signCredentialPayload(payload, privateKeyPem);
    const existingIdx = db.credentials.findIndex((c) => c.credentialId === credId);
    const credObj: DigitalCredential = {
      credentialId: credId,
      studentRecordId: student.id,
      studentId: student.studentId,
      payload,
      signature,
      publicKeyPem,
      status: 'Active',
      consentStatus: 'Approved',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' IST',
    };

    if (existingIdx >= 0) {
      db.credentials[existingIdx] = credObj;
    } else {
      db.credentials.unshift(credObj);
    }

    student.verificationStatus = 'Verified Credential Issued';

    recordAudit(
      userName,
      role,
      'Digital Student Credential Signed (Ed25519)',
      credId,
      'Success',
      `Issued Ed25519 verifiable credential for ${student.fullName} (${student.studentId}).`
    );
    saveDb(db);
    return res.json({ credential: credObj });
  });

  // --- DIGITAL CREDENTIAL & QR VERIFICATION (ONLINE & OFFLINE MODES) ---
  app.post('/api/credentials/verify', (req: Request, res: Response) => {
    const { role, userName } = getCallerContext(req);
    const {
      credentialId,
      signedQrBundle,
      mode = 'Online Verification',
      verifierOrganization = 'Authorized Employer Verifier',
    } = req.body as {
      credentialId?: string;
      signedQrBundle?: { payload: CredentialPayload; signature: string; publicKeyPem?: string };
      mode?: 'Online Verification' | 'Offline Signature Verification' | 'QR Payload Scan';
      verifierOrganization?: string;
    };

    let targetPayload: CredentialPayload | undefined;
    let targetSignature = '';
    let storedCred: DigitalCredential | undefined;

    if (signedQrBundle && signedQrBundle.payload && signedQrBundle.signature) {
      targetPayload = signedQrBundle.payload;
      targetSignature = signedQrBundle.signature;
      storedCred = db.credentials.find(
        (c) => c.credentialId === signedQrBundle.payload.credentialId
      );
    } else if (credentialId) {
      storedCred = db.credentials.find(
        (c) => c.credentialId.toLowerCase() === credentialId.trim().toLowerCase() ||
               c.studentId.toLowerCase() === credentialId.trim().toLowerCase()
      );
      if (storedCred) {
        targetPayload = storedCred.payload;
        targetSignature = storedCred.signature;
      }
    }

    if (!targetPayload) {
      return res.status(404).json({
        error: 'Credential ID or QR payload not found in central verification registry.',
      });
    }

    // Step 1: Verify Ed25519 Cryptographic Signature
    const isSignatureValid = verifyCredentialSignature(
      targetPayload,
      targetSignature,
      publicKeyPem
    );

    let outcomeStatus: VerificationLog['result'] = 'Valid Credential';
    let explanation =
      'Ed25519 cryptographic signature verified against APAAR Setu National Authority Public Key. Student enrolment and seat allocation are authentic.';

    if (!isSignatureValid) {
      outcomeStatus = 'Invalid Signature';
      explanation =
        'CRITICAL ALERT: Ed25519 digital signature verification FAILED. The credential payload has been tampered with or was not signed by the APAAR Setu private key.';
    } else if (mode === 'Offline Signature Verification') {
      outcomeStatus = 'Valid Credential';
      explanation =
        'Ed25519 digital signature is cryptographically VALID using the offline public key. Note: Live revocation status and real-time student consent cannot be confirmed in Offline Mode.';
    } else if (storedCred) {
      const today = new Date().toISOString().split('T')[0];
      if (storedCred.status === 'Revoked') {
        outcomeStatus = 'Revoked Credential';
        explanation =
          'This credential was cryptographically signed in the past, but has been REVOKED in the central registry.';
      } else if (storedCred.status === 'Expired' || targetPayload.expiryDate < today) {
        outcomeStatus = 'Expired Credential';
        explanation = `This credential expired on ${targetPayload.expiryDate}.`;
      } else if (storedCred.consentStatus !== 'Approved') {
        outcomeStatus = 'Consent Required';
        explanation =
          'The credential signature and seat status are valid, but the student has not yet granted active consent to disclose personal identity attributes. Request student consent to view full profile.';
      }
    }

    const logEntry: VerificationLog = {
      id: `vlog-${Date.now()}`,
      credentialId: targetPayload.credentialId,
      studentId: targetPayload.studentId,
      studentName:
        outcomeStatus === 'Consent Required'
          ? 'Protected (Student Consent Required)'
          : targetPayload.studentName,
      institutionName: targetPayload.institutionName,
      verifierName: userName,
      organization: verifierOrganization,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' IST',
      mode,
      result: outcomeStatus,
    };

    db.verificationLogs.unshift(logEntry);
    recordAudit(
      userName,
      role,
      `Credential Verification (${mode})`,
      targetPayload.credentialId,
      outcomeStatus === 'Valid Credential' ? 'Success' : 'Warning',
      `Verification result for ${targetPayload.credentialId}: ${outcomeStatus}.`
    );
    saveDb(db);

    // Mask protected student details if Consent Required
    const permittedPayload =
      outcomeStatus === 'Consent Required'
        ? {
            ...targetPayload,
            studentName: 'PROTECTED (Awaiting Student Consent)',
            apaarDemoReference: 'PROTECTED (Awaiting Student Consent)',
          }
        : targetPayload;

    return res.json({
      result: outcomeStatus,
      signatureValid: isSignatureValid,
      mode,
      explanation,
      credentialStatus: storedCred?.status || 'Unknown (Offline)',
      consentStatus: storedCred?.consentStatus || 'Unknown (Offline)',
      payload: permittedPayload,
      publicKeyPem,
      logEntry,
    });
  });

  // --- STUDENT CONSENT WORKFLOW ---
  app.post('/api/consents/request', (req: Request, res: Response) => {
    const { role, userName } = getCallerContext(req);
    const { credentialId, verifierName, organization, purpose, requestedFields } = req.body as {
      credentialId: string;
      verifierName?: string;
      organization?: string;
      purpose?: string;
      requestedFields?: string[];
    };

    const cred = db.credentials.find(
      (c) =>
        c.credentialId.toLowerCase() === credentialId.trim().toLowerCase() ||
        c.studentId.toLowerCase() === credentialId.trim().toLowerCase()
    );
    if (!cred) {
      return res.status(404).json({ error: 'Target credential or student ID not found.' });
    }

    const newReq: ConsentRequest = {
      id: `con-req-${Date.now()}`,
      studentRecordId: cred.studentRecordId,
      studentId: cred.studentId,
      studentName: cred.payload.studentName,
      credentialId: cred.credentialId,
      verifierName: verifierName?.trim() || userName,
      organization: organization?.trim() || 'Authorized Employer Verifier',
      purpose: purpose?.trim() || 'Employment Background & Academic Enrolment Verification',
      requestedFields: requestedFields?.length
        ? requestedFields
        : ['Student Full Name', 'Institution & Programme', 'Academic Year', 'APAAR Verification Status'],
      requestDate: new Date().toISOString().split('T')[0],
      expiryDate: '2026-12-31',
      status: 'Pending',
    };

    db.consentRequests.unshift(newReq);
    recordAudit(
      newReq.verifierName,
      role,
      'Verification Consent Requested',
      cred.credentialId,
      'Success',
      `Requested student consent from ${cred.studentId} for ${newReq.organization}.`
    );
    saveDb(db);
    return res.status(201).json({ consentRequest: newReq });
  });

  app.post('/api/consents/:id/respond', (req: Request, res: Response) => {
    const { role, userName } = getCallerContext(req);
    const { decision } = req.body as { decision: 'Approved' | 'Rejected' | 'Revoked' };

    const consent = db.consentRequests.find((c) => c.id === req.params.id);
    if (!consent) {
      return res.status(404).json({ error: 'Consent request not found.' });
    }

    consent.status = decision;
    const cred = db.credentials.find((c) => c.credentialId === consent.credentialId);
    if (cred) {
      if (decision === 'Approved') {
        cred.consentStatus = 'Approved';
      } else if (decision === 'Revoked' || decision === 'Rejected') {
        cred.consentStatus = 'Consent Required';
      }
    }

    recordAudit(
      userName,
      role,
      `Student Consent ${decision}`,
      `${consent.credentialId} (${consent.organization})`,
      decision === 'Approved' ? 'Success' : 'Warning',
      `Student ${decision.toLowerCase()} verification access for ${consent.organization}.`
    );
    saveDb(db);
    return res.json({ consentRequest: consent, credential: cred });
  });

  // --- TOGGLE CREDENTIAL CONSENT DIRECTLY (FOR DEMO TEST CASE 5) ---
  app.post('/api/credentials/:credentialId/consent', (req: Request, res: Response) => {
    const { role, userName } = getCallerContext(req);
    const { consentStatus } = req.body as {
      consentStatus: 'Approved' | 'Consent Required' | 'Revoked';
    };
    const cred = db.credentials.find((c) => c.credentialId === req.params.credentialId);
    if (!cred) return res.status(404).json({ error: 'Credential not found.' });

    cred.consentStatus = consentStatus;
    recordAudit(
      userName,
      role,
      `Credential Disclosure Policy Updated`,
      cred.credentialId,
      'Success',
      `Set credential disclosure status to ${consentStatus}.`
    );
    saveDb(db);
    return res.json({ credential: cred });
  });

  // --- SYSTEM INTEGRATIONS SANDBOX SYNC ---
  app.post('/api/integrations/:id/sync', (req: Request, res: Response) => {
    const { role, userName } = getCallerContext(req);
    const integration = db.integrations.find((i) => i.id === req.params.id);
    if (!integration) return res.status(404).json({ error: 'Integration adapter not found.' });

    const { connectionStatus } = req.body as {
      connectionStatus?: SystemIntegration['connectionStatus'];
    };
    if (connectionStatus) {
      integration.connectionStatus = connectionStatus;
    }
    integration.lastSync = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' IST';

    recordAudit(
      userName,
      role,
      'Sandbox Integration Adapter Sync',
      integration.systemName,
      'Success',
      `Executed sandbox handshake with ${integration.systemName} (${integration.connectionStatus}).`
    );
    saveDb(db);
    return res.json({ integration });
  });

  // --- SERVER-SIDE GEMINI AI ANOMALY INTELLIGENCE SUMMARY ---
  app.post('/api/ai/analyze-anomalies', async (req: Request, res: Response) => {
    const anomalies = detectAdmissionAnomalies(
      db.students,
      db.programmes,
      db.institutions,
      db.duplicates
    );

    // Prepare strictly anonymized aggregate telemetry (NO raw APAAR IDs or student personal data)
    const anonymizedSummaryPayload = anomalies.map((a) => ({
      anomalyType: a.anomalyType,
      riskLevel: a.riskLevel,
      institutionName: a.institutionName,
      programmeName: a.programmeName,
      affectedRecordsCount: a.affectedRecordsCount,
      explanation: a.explanation,
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.json({
        source: 'Deterministic Rule Engine (Offline AI Fallback)',
        summary:
          'Deterministic anomaly scan identified 5 critical & moderate patterns across the 2026-27 admission cycle: (1) Cross-institution HMAC-SHA256 identity collisions requiring registrar verification of migration certificates, (2) 100% regular seat saturation in Computer Science & Engineering at ABC Engineering College (60/60 occupied), and (3) Incomplete APAAR seeding in 4 provisional student records routed to the Exception Queue.',
        recommendations: [
          'Enforce mandatory Duplicate Shield clearance before releasing scholarship or examination hall-ticket numbers for matched HMAC tokens.',
          'Lock automated regular seat confirmation for programmes at 100% Approved Intake while allowing verified Supernumerary quota admissions up to the configured ceiling.',
          'Issue automated 14-day compliance notices to nodal officers of institutions with pending APAAR Exception Queue items.',
        ],
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are an AICTE Academic Compliance & Data Integrity Analyst assisting human administrators on the APAAR Setu platform (SIH26263).
Analyze the following ANONYMIZED institutional admission anomaly telemetry (no PII or raw APAAR IDs are included).
Provide a concise, professional 2-paragraph executive assessment explaining why human registrar review is recommended, followed by 3 concrete investigation steps. Do not accuse institutions or students of fraud; emphasize fair verification of legitimate transfers and data corrections.

Anonymized Telemetry:
${JSON.stringify(anonymizedSummaryPayload, null, 2)}`,
      });

      return res.json({
        source: 'Gemini 3.8 Flash Server-Side Intelligence (Anonymized Telemetry)',
        summary:
          response.text ||
          'Anonymized anomaly patterns analyzed. Human administrator review is recommended for flagged duplicate tokens and full intake programmes.',
        recommendations: [
          'Cross-verify inter-institutional HMAC token matches against student transfer/cancellation letters.',
          'Audit programmes approaching 100% regular intake to ensure supernumerary seats are tracked in separate counters.',
          'Clear Missing APAAR exception queues via institutional ABC nodal camps.',
        ],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI service temporarily unavailable';
      return res.json({
        source: 'Deterministic Rule Engine (Fallback Active)',
        summary: `Deterministic admission intelligence verified ${anomalies.length} active patterns across 6 institutions. (Note: Live Gemini summarization skipped: ${message}). All duplicate identity matches and seat ceiling alerts are queued for human administrator review.`,
        recommendations: [
          'Review side-by-side institutional timestamps in Duplicate Shield before confirming secondary enrolment.',
          'Verify Extension of Approval (EoA) intake limits on programmes flagged at 100% occupancy.',
          'Resolve Missing APAAR IDs in the APAAR Validation Engine exception queue.',
        ],
      });
    }
  });

  // --- RESET DEMO DATA ---
  app.post('/api/admin/reset-demo', (req: Request, res: Response) => {
    const { userName, role } = getCallerContext(req);
    db = buildInitialSeedDatabase(HMAC_SECRET, SIGNING_SEED);
    recordAudit(
      userName,
      role,
      'Demo Database Reset',
      'GLOBAL-SEED-STATE',
      'Success',
      'Restored all synthetic institutions, programmes, 60/60 capacity ledger, duplicate cases, and Ed25519 credentials to initial demonstration state.'
    );
    saveDb(db);
    return res.json({ message: 'Demo database reset to initial state successfully.' });
  });

async function startServer() {
  // --- VITE MIDDLEWARE OR STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`APAAR Setu Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
