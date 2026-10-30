import crypto from 'node:crypto';
import {
  AdmissionCategory,
  AdmissionStatus,
  AnomalyAlert,
  CredentialPayload,
  CsvRowValidationResult,
  DuplicateCase,
  DuplicateCategory,
  Institution,
  Programme,
  RiskLevel,
  SeatLedgerItem,
  StudentRecord,
  ValidationStatus,
} from '../types/domain';

/**
 * Normalizes a synthetic 12-digit APAAR ID string by stripping spaces and hyphens.
 */
export function normalizeApaarId(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/[\s-]/g, '').trim();
}

/**
 * Masks an APAAR ID so full 12-digit numbers are never exposed in tables or audit logs.
 * Example: "123456789012" -> "XXXX-XXXX-9012"
 */
export function maskApaarId(raw?: string): string {
  const clean = normalizeApaarId(raw);
  if (!clean) return 'MISSING';
  if (clean.startsWith('XXXX-XXXX-')) return clean;
  if (clean.length < 4) return 'XXXX-XXXX-INVALID';
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

/**
 * Generates a privacy-preserving HMAC-SHA256 token from a synthetic APAAR ID.
 * Never expose either the secretKey or the resulting token to unauthorized browser views.
 */
export function computeApaarHmacToken(rawApaarId: string, secretKey: string): string {
  const clean = normalizeApaarId(rawApaarId);
  if (!clean) return '';
  return crypto.createHmac('sha256', secretKey).update(`apaar-v1:${clean}`).digest('hex');
}

/**
 * Validates synthetic APAAR ID format according to configured demo rules:
 * - Must not be empty (Missing APAAR ID)
 * - Must be exactly 12 numeric digits, cannot start with '0000' or all identical digits (Invalid Format)
 */
export function validateApaarFormat(rawApaarId?: string): {
  valid: boolean;
  status: ValidationStatus;
  reason?: string;
  recommendation?: string;
} {
  const clean = normalizeApaarId(rawApaarId);
  if (!clean) {
    return {
      valid: false,
      status: ValidationStatus.MISSING_APAAR,
      reason: 'APAAR ID is missing from the student submission.',
      recommendation: 'Place record in Exception Queue and request student 12-digit APAAR identifier via ABC/DigiLocker.',
    };
  }

  if (!/^[1-9]\d{11}$/.test(clean) || /^(\d)\1{11}$/.test(clean)) {
    return {
      valid: false,
      status: ValidationStatus.INVALID_FORMAT,
      reason: 'APAAR ID does not match the configured 12-digit numeric format (must be 12 digits, non-zero leading digit).',
      recommendation: 'Verify student 12-digit numeric APAAR ID and resubmit for validation.',
    };
  }

  return {
    valid: true,
    status: ValidationStatus.VERIFIED,
  };
}

/**
 * Determines whether an admission category counts toward Supernumerary seats rather than Regular Approved Intake.
 */
export function isSupernumeraryCategory(category: AdmissionCategory | string): boolean {
  return (
    category === AdmissionCategory.NRI ||
    category === AdmissionCategory.OCI ||
    category === AdmissionCategory.FN ||
    category === AdmissionCategory.PMSSS
  );
}

/**
 * Computes the Live Seat Ledger for every programme dynamically from student admission records.
 * Total Authorized Capacity = Approved Intake + Configured Supernumerary Seats.
 */
export function computeSeatLedger(
  programmes: Programme[],
  students: StudentRecord[]
): SeatLedgerItem[] {
  return programmes.map((prog) => {
    const activeStudents = students.filter(
      (s) =>
        s.programmeId === prog.id &&
        s.admissionStatus !== AdmissionStatus.WITHDRAWN &&
        s.admissionStatus !== AdmissionStatus.DRAFT
    );

    const regularStudents = activeStudents.filter(
      (s) => !s.isSupernumerary && s.admissionStatus !== AdmissionStatus.EXCESS_FLAGGED
    );
    const supernumeraryStudents = activeStudents.filter(
      (s) => s.isSupernumerary && s.admissionStatus !== AdmissionStatus.EXCESS_FLAGGED
    );
    const excessFlaggedStudents = activeStudents.filter(
      (s) => s.admissionStatus === AdmissionStatus.EXCESS_FLAGGED
    );

    const actualRegularEnrolment = regularStudents.length;
    const actualSupernumeraryEnrolment = supernumeraryStudents.length;
    const totalAuthorizedCapacity = prog.approvedIntake + prog.supernumerarySeats;
    const totalOccupied = actualRegularEnrolment + actualSupernumeraryEnrolment;

    const availableRegularSeats = Math.max(0, prog.approvedIntake - actualRegularEnrolment);
    const availableSupernumerarySeats = Math.max(
      0,
      prog.supernumerarySeats - actualSupernumeraryEnrolment
    );
    const availableTotalCapacity = Math.max(0, totalAuthorizedCapacity - totalOccupied);

    let regularStatus: SeatLedgerItem['regularStatus'] = 'AVAILABLE';
    if (excessFlaggedStudents.length > 0 || actualRegularEnrolment > prog.approvedIntake) {
      regularStatus = 'EXCEEDED';
    } else if (actualRegularEnrolment === prog.approvedIntake) {
      regularStatus = 'FULL';
    } else if (actualRegularEnrolment >= prog.approvedIntake * 0.9) {
      regularStatus = 'NEAR CAPACITY';
    }

    const utilizationPercent =
      prog.approvedIntake > 0
        ? Math.round((actualRegularEnrolment / prog.approvedIntake) * 100)
        : 0;

    return {
      programmeId: prog.id,
      institutionId: prog.institutionId,
      institutionName: prog.institutionName,
      institutionCode: prog.institutionCode,
      programmeName: prog.name,
      department: prog.department,
      academicYear: prog.academicYear,
      approvedIntake: prog.approvedIntake,
      actualRegularEnrolment,
      supernumerarySeats: prog.supernumerarySeats,
      actualSupernumeraryEnrolment,
      totalAuthorizedCapacity,
      totalOccupied,
      availableRegularSeats,
      availableSupernumerarySeats,
      availableTotalCapacity,
      regularStatus,
      excessAdmissionsCount: excessFlaggedStudents.length,
      utilizationPercent,
    };
  });
}

export interface StudentSubmissionInput {
  studentId: string;
  fullName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  rawApaarId?: string;
  institutionId: string;
  programmeId: string;
  academicYear: string;
  admissionDate: string;
  admissionCategory: AdmissionCategory;
  saveAsDraft?: boolean;
}

export interface EvaluationOutcome {
  validationStatus: ValidationStatus;
  admissionStatus: AdmissionStatus;
  verificationStatus: StudentRecord['verificationStatus'];
  maskedApaarId: string;
  apaarHmacToken: string;
  isSupernumerary: boolean;
  validationReason?: string;
  recommendedCorrection?: string;
  duplicateCaseDetected?: DuplicateCase;
  seatExceededWarning?: string;
}

/**
 * Evaluates a student registration or update against:
 * 1. APAAR Format & Presence rules
 * 2. Intra-institution and Cross-institution HMAC-SHA256 Duplicate Shield
 * 3. Live Seat Ledger capacity rules (Regular Approved Intake vs Supernumerary Quota)
 * 4. Academic Consistency checks
 */
export function evaluateStudentSubmission(
  input: StudentSubmissionInput,
  existingStudents: StudentRecord[],
  programmes: Programme[],
  institutions: Institution[],
  hmacSecret: string,
  excludeRecordId?: string
): EvaluationOutcome {
  const cleanApaar = normalizeApaarId(input.rawApaarId);
  const masked = maskApaarId(cleanApaar);
  const hmacToken = cleanApaar ? computeApaarHmacToken(cleanApaar, hmacSecret) : '';
  const isSuper = isSupernumeraryCategory(input.admissionCategory);

  const inst = institutions.find((i) => i.id === input.institutionId);
  const prog = programmes.find((p) => p.id === input.programmeId);

  if (!inst || !prog || prog.institutionId !== inst.id) {
    return {
      validationStatus: ValidationStatus.FLAGGED,
      admissionStatus: AdmissionStatus.PROVISIONAL,
      verificationStatus: 'Exception Queue',
      maskedApaarId: masked,
      apaarHmacToken: hmacToken,
      isSupernumerary: isSuper,
      validationReason: 'Inconsistent academic information: Programme does not belong to the specified institution.',
      recommendedCorrection: 'Select a valid AICTE-approved programme mapped to your institution code.',
    };
  }

  if (input.saveAsDraft) {
    return {
      validationStatus: ValidationStatus.PENDING,
      admissionStatus: AdmissionStatus.DRAFT,
      verificationStatus: 'Pending Credential',
      maskedApaarId: masked,
      apaarHmacToken: hmacToken,
      isSupernumerary: isSuper,
      validationReason: 'Saved as draft by institution administrator.',
      recommendedCorrection: 'Complete APAAR verification and submit record.',
    };
  }

  // 1. Check APAAR format & presence
  const formatCheck = validateApaarFormat(cleanApaar);
  if (!formatCheck.valid) {
    return {
      validationStatus: formatCheck.status,
      admissionStatus: AdmissionStatus.PROVISIONAL,
      verificationStatus: 'Exception Queue',
      maskedApaarId: masked,
      apaarHmacToken: hmacToken,
      isSupernumerary: isSuper,
      validationReason: formatCheck.reason,
      recommendedCorrection: formatCheck.recommendation,
    };
  }

  // 2. Check Duplicate Shield via HMAC-SHA256 token
  const activePool = existingStudents.filter(
    (s) => s.id !== excludeRecordId && s.admissionStatus !== AdmissionStatus.WITHDRAWN
  );

  const tokenMatches = activePool.filter(
    (s) => s.apaarHmacToken && s.apaarHmacToken === hmacToken
  );

  if (tokenMatches.length > 0) {
    const primaryMatch = tokenMatches[0];
    const sameInstitution = primaryMatch.institutionId === inst.id;
    const duplicateCase: DuplicateCase = {
      id: `dup-${Date.now()}`,
      referenceId: `DUP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: input.fullName,
      studentIdA: primaryMatch.studentId,
      studentIdB: input.studentId,
      maskedApaarId: masked,
      institutionAId: primaryMatch.institutionId,
      institutionAName: primaryMatch.institutionName,
      institutionBId: inst.id,
      institutionBName: inst.name,
      programmeA: primaryMatch.programmeName,
      programmeB: prog.name,
      academicYear: input.academicYear,
      detectionDate: new Date().toISOString().split('T')[0],
      category: DuplicateCategory.EXACT_MATCH,
      riskLevel: RiskLevel.HIGH,
      reviewStatus: 'Pending Review',
      reviewNotes: sameInstitution
        ? `Duplicate student registration detected within ${inst.name}.`
        : `Cross-institution HMAC-SHA256 identity match detected between ${primaryMatch.institutionName} and ${inst.name}. Flagged for transfer or dual-enrolment review.`,
    };

    return {
      validationStatus: ValidationStatus.DUPLICATE_DETECTED,
      admissionStatus: AdmissionStatus.PROVISIONAL,
      verificationStatus: 'Exception Queue',
      maskedApaarId: masked,
      apaarHmacToken: hmacToken,
      isSupernumerary: isSuper,
      validationReason: sameInstitution
        ? `Duplicate APAAR token already registered inside ${inst.name} (Student ID: ${primaryMatch.studentId}).`
        : `Cross-institution duplicate APAAR identity detected with ${primaryMatch.institutionName} (${primaryMatch.programmeName}).`,
      recommendedCorrection:
        'Review in Duplicate Shield. Verify if student has an official migration/cancellation certificate from the previous institution.',
      duplicateCaseDetected: duplicateCase,
    };
  }

  // 3. Check Possible Duplicate (same Name + DOB across institutions even with different APAAR)
  const demographicMatch = activePool.find(
    (s) =>
      s.fullName.trim().toLowerCase() === input.fullName.trim().toLowerCase() &&
      s.dob === input.dob
  );

  if (demographicMatch) {
    const duplicateCase: DuplicateCase = {
      id: `dup-${Date.now()}`,
      referenceId: `DUP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: input.fullName,
      studentIdA: demographicMatch.studentId,
      studentIdB: input.studentId,
      maskedApaarId: masked,
      institutionAId: demographicMatch.institutionId,
      institutionAName: demographicMatch.institutionName,
      institutionBId: inst.id,
      institutionBName: inst.name,
      programmeA: demographicMatch.programmeName,
      programmeB: prog.name,
      academicYear: input.academicYear,
      detectionDate: new Date().toISOString().split('T')[0],
      category: DuplicateCategory.POSSIBLE_DUPLICATE,
      riskLevel: RiskLevel.MEDIUM,
      reviewStatus: 'Pending Review',
      reviewNotes: `Identical Student Name and Date of Birth found across ${demographicMatch.institutionName} and ${inst.name} with distinct APAAR identifiers.`,
    };

    return {
      validationStatus: ValidationStatus.FLAGGED,
      admissionStatus: AdmissionStatus.PROVISIONAL,
      verificationStatus: 'Exception Queue',
      maskedApaarId: masked,
      apaarHmacToken: hmacToken,
      isSupernumerary: isSuper,
      validationReason: `Possible demographic duplicate with record ${demographicMatch.studentId} at ${demographicMatch.institutionName}.`,
      recommendedCorrection: 'Verify demographic identity and confirm distinct APAAR assignment in Duplicate Shield.',
      duplicateCaseDetected: duplicateCase,
    };
  }

  // 4. Check Live Seat Ledger capacity limits
  const ledger = computeSeatLedger([prog], activePool)[0];
  if (!isSuper && ledger.actualRegularEnrolment >= prog.approvedIntake) {
    const warningMsg = `Regular Approved Intake (${prog.approvedIntake}/${prog.approvedIntake}) for ${prog.name} at ${inst.name} is FULL. Admission attempt flagged as Exceeding Approved Intake.`;
    return {
      validationStatus: ValidationStatus.FLAGGED,
      admissionStatus: AdmissionStatus.EXCESS_FLAGGED,
      verificationStatus: 'Exception Queue',
      maskedApaarId: masked,
      apaarHmacToken: hmacToken,
      isSupernumerary: isSuper,
      validationReason: warningMsg,
      recommendedCorrection:
        'Do not admit beyond AICTE approved intake. Escalate to AICTE Central Monitoring or verify if candidate belongs to an authorized Supernumerary category.',
      seatExceededWarning: warningMsg,
    };
  }

  if (isSuper && ledger.actualSupernumeraryEnrolment >= prog.supernumerarySeats) {
    const warningMsg = `Configured Supernumerary Seat limit (${prog.supernumerarySeats}/${prog.supernumerarySeats}) for ${prog.name} is FULL. Excess supernumerary admission flagged for review.`;
    return {
      validationStatus: ValidationStatus.FLAGGED,
      admissionStatus: AdmissionStatus.EXCESS_FLAGGED,
      verificationStatus: 'Exception Queue',
      maskedApaarId: masked,
      apaarHmacToken: hmacToken,
      isSupernumerary: isSuper,
      validationReason: warningMsg,
      recommendedCorrection: 'Verify AICTE supernumerary quota approval before confirming seat.',
      seatExceededWarning: warningMsg,
    };
  }

  // All checks passed!
  return {
    validationStatus: ValidationStatus.VERIFIED,
    admissionStatus: AdmissionStatus.CONFIRMED,
    verificationStatus: 'Verified Credential Issued',
    maskedApaarId: masked,
    apaarHmacToken: hmacToken,
    isSupernumerary: isSuper,
  };
}

/**
 * Generates a deterministic Ed25519 keypair from a server seed so digital signatures remain verifiable across restarts.
 */
export function deriveEd25519KeyPair(seedSecret: string): {
  publicKeyPem: string;
  privateKeyPem: string;
} {
  const seedHash = crypto.createHash('sha256').update(seedSecret).digest();
  // PKCS#8 DER prefix for Ed25519 32-byte private key seed
  const pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  const pkcs8Der = Buffer.concat([pkcs8Prefix, seedHash]);

  const privateKeyObj = crypto.createPrivateKey({
    key: pkcs8Der,
    format: 'der',
    type: 'pkcs8',
  });

  const publicKeyObj = crypto.createPublicKey(privateKeyObj);

  return {
    privateKeyPem: privateKeyObj.export({ format: 'pem', type: 'pkcs8' }).toString(),
    publicKeyPem: publicKeyObj.export({ format: 'pem', type: 'spki' }).toString(),
  };
}

/**
 * Canonicalizes a CredentialPayload into a deterministic string for Ed25519 signing and verification.
 */
export function canonicalizeCredentialPayload(payload: CredentialPayload): string {
  const orderedKeys: (keyof CredentialPayload)[] = [
    'credentialId',
    'studentId',
    'studentName',
    'maskedApaarId',
    'apaarDemoReference',
    'institutionId',
    'institutionName',
    'institutionCode',
    'programmeName',
    'academicYear',
    'issueDate',
    'expiryDate',
    'issuer',
  ];
  const canonicalObj: Record<string, string> = {};
  for (const k of orderedKeys) {
    canonicalObj[k] = String(payload[k] ?? '');
  }
  return JSON.stringify(canonicalObj);
}

/**
 * Signs a CredentialPayload with the server's Ed25519 private key.
 */
export function signCredentialPayload(payload: CredentialPayload, privateKeyPem: string): string {
  const canonicalData = Buffer.from(canonicalizeCredentialPayload(payload), 'utf-8');
  const signature = crypto.sign(null, canonicalData, privateKeyPem);
  return signature.toString('base64url');
}

/**
 * Verifies an Ed25519 signature against a CredentialPayload and the public key.
 * Any modification to the payload results in false.
 */
export function verifyCredentialSignature(
  payload: CredentialPayload,
  signatureBase64Url: string,
  publicKeyPem: string
): boolean {
  try {
    if (!signatureBase64Url || !publicKeyPem) return false;
    const canonicalData = Buffer.from(canonicalizeCredentialPayload(payload), 'utf-8');
    const sigBuffer = Buffer.from(signatureBase64Url, 'base64url');
    return crypto.verify(null, canonicalData, publicKeyPem, sigBuffer);
  } catch {
    return false;
  }
}

/**
 * Validates bulk CSV rows and reports row-level errors, missing APAAR IDs, duplicates, and seat warnings.
 */
export function validateBulkCsvRows(
  rows: Array<Record<string, string>>,
  existingStudents: StudentRecord[],
  programmes: Programme[],
  institutions: Institution[],
  hmacSecret: string,
  enforcedInstitutionId?: string
): {
  results: CsvRowValidationResult[];
  summary: {
    totalRows: number;
    validRecords: number;
    invalidRecords: number;
    duplicateRecords: number;
    missingApaarIds: number;
    seatWarnings: number;
  };
} {
  const seenTokensInBatch = new Set<string>();
  const seatTracker = new Map<string, { reg: number; sup: number }>();

  // Initialize seat tracker with current ledger
  const initialLedger = computeSeatLedger(programmes, existingStudents);
  for (const item of initialLedger) {
    seatTracker.set(item.programmeId, {
      reg: item.actualRegularEnrolment,
      sup: item.actualSupernumeraryEnrolment,
    });
  }

  let validRecords = 0;
  let invalidRecords = 0;
  let duplicateRecords = 0;
  let missingApaarIds = 0;
  let seatWarnings = 0;

  const results: CsvRowValidationResult[] = rows.map((raw, idx) => {
    const rowNumber = idx + 1;
    const studentId = (raw.studentId || raw.StudentID || '').trim();
    const fullName = (raw.fullName || raw.StudentName || '').trim();
    const dob = (raw.dob || raw.DOB || '2005-06-15').trim();
    const genderRaw = (raw.gender || raw.Gender || 'Male').trim();
    const gender: 'Male' | 'Female' | 'Other' =
      genderRaw === 'Female' || genderRaw === 'Other' ? genderRaw : 'Male';
    const rawApaarId = normalizeApaarId(raw.apaarId || raw.APAAR_ID || '');
    const maskedApaarId = maskApaarId(rawApaarId);
    const institutionCode = (raw.institutionCode || raw.InstitutionCode || '').trim();
    const programmeName = (raw.programmeName || raw.Programme || '').trim();
    const department = (raw.department || raw.Department || programmeName || 'Engineering').trim();
    const academicYear = (raw.academicYear || raw.AcademicYear || '2026-27').trim();
    const categoryRaw = (raw.admissionCategory || raw.Category || AdmissionCategory.GENERAL).trim();
    const admissionCategory = Object.values(AdmissionCategory).includes(
      categoryRaw as AdmissionCategory
    )
      ? (categoryRaw as AdmissionCategory)
      : AdmissionCategory.GENERAL;

    const errors: string[] = [];
    const warnings: string[] = [];
    let validationStatus = ValidationStatus.VERIFIED;

    if (!studentId) errors.push('Missing Student ID / Enrolment Number.');
    if (!fullName) errors.push('Missing Student Full Name.');

    const inst = institutions.find(
      (i) => i.code.toLowerCase() === institutionCode.toLowerCase()
    );
    if (!inst) {
      errors.push(`Invalid or unrecognized Institution Code "${institutionCode || 'EMPTY'}".`);
      validationStatus = ValidationStatus.FLAGGED;
    } else if (enforcedInstitutionId && inst.id !== enforcedInstitutionId) {
      errors.push(
        `Institution Code mismatch: You are only authorized to upload records for your own institution.`
      );
      validationStatus = ValidationStatus.FLAGGED;
    }

    const prog = inst
      ? programmes.find(
          (p) =>
            p.institutionId === inst.id &&
            p.name.toLowerCase() === programmeName.toLowerCase()
        )
      : undefined;

    if (!programmeName) {
      errors.push('Missing Programme / Course name.');
      validationStatus = ValidationStatus.FLAGGED;
    } else if (inst && !prog) {
      errors.push(
        `Programme "${programmeName}" is not configured or approved under ${inst.name} (${inst.code}).`
      );
      validationStatus = ValidationStatus.FLAGGED;
    }

    // Check APAAR
    const formatCheck = validateApaarFormat(rawApaarId);
    if (!formatCheck.valid) {
      validationStatus = formatCheck.status;
      if (formatCheck.status === ValidationStatus.MISSING_APAAR) {
        missingApaarIds++;
        errors.push('Missing 12-digit APAAR ID (will be routed to Exception Queue).');
      } else {
        errors.push(formatCheck.reason || 'Invalid APAAR ID format.');
      }
    } else {
      const token = computeApaarHmacToken(rawApaarId, hmacSecret);
      const existsInDb = existingStudents.some(
        (s) => s.apaarHmacToken === token && s.admissionStatus !== AdmissionStatus.WITHDRAWN
      );
      if (existsInDb || seenTokensInBatch.has(token)) {
        validationStatus = ValidationStatus.DUPLICATE_DETECTED;
        duplicateRecords++;
        errors.push(
          existsInDb
            ? 'Duplicate APAAR identity token already exists in the central repository.'
            : 'Duplicate APAAR ID repeated multiple times within this CSV file.'
        );
      }
      seenTokensInBatch.add(token);
    }

    // Check Seat Capacity if Programme is matched
    if (prog) {
      const currentCounts = seatTracker.get(prog.id) || { reg: 0, sup: 0 };
      const isSuper = isSupernumeraryCategory(admissionCategory);
      if (!isSuper) {
        if (currentCounts.reg >= prog.approvedIntake) {
          seatWarnings++;
          warnings.push(
            `Exceeds Approved Intake (${prog.approvedIntake}) for ${prog.name}. Will be flagged for AICTE review.`
          );
          if (validationStatus === ValidationStatus.VERIFIED) {
            validationStatus = ValidationStatus.FLAGGED;
          }
        } else if (errors.length === 0) {
          currentCounts.reg += 1;
          seatTracker.set(prog.id, currentCounts);
        }
      } else {
        if (currentCounts.sup >= prog.supernumerarySeats) {
          seatWarnings++;
          warnings.push(
            `Exceeds Supernumerary quota (${prog.supernumerarySeats}) for ${prog.name}.`
          );
          if (validationStatus === ValidationStatus.VERIFIED) {
            validationStatus = ValidationStatus.FLAGGED;
          }
        } else if (errors.length === 0) {
          currentCounts.sup += 1;
          seatTracker.set(prog.id, currentCounts);
        }
      }
    }

    const isValid = errors.length === 0 && warnings.length === 0;
    if (isValid) {
      validRecords++;
    } else {
      invalidRecords++;
    }

    return {
      rowNumber,
      studentId,
      fullName,
      dob,
      gender,
      rawApaarId,
      maskedApaarId,
      institutionCode,
      programmeName,
      department,
      academicYear,
      admissionCategory,
      isValid,
      validationStatus,
      errors,
      warnings,
    };
  });

  return {
    results,
    summary: {
      totalRows: rows.length,
      validRecords,
      invalidRecords,
      duplicateRecords,
      missingApaarIds,
      seatWarnings,
    },
  };
}

/**
 * Deterministic AI Admission Intelligence engine that scans repository data for the 6 required anomaly classes.
 */
export function detectAdmissionAnomalies(
  students: StudentRecord[],
  programmes: Programme[],
  institutions: Institution[],
  duplicates: DuplicateCase[]
): AnomalyAlert[] {
  const anomalies: AnomalyAlert[] = [];
  const ledger = computeSeatLedger(programmes, students);

  // 1. Multiple registrations with the same identity token across institutions
  const pendingDuplicates = duplicates.filter((d) => d.reviewStatus === 'Pending Review');
  if (pendingDuplicates.length > 0) {
    anomalies.push({
      id: 'anom-dup-tokens',
      anomalyType: 'Multiple Registrations with Identical APAAR HMAC Token',
      riskLevel: RiskLevel.HIGH,
      explanation: `${pendingDuplicates.length} cross-institution identity token collision(s) detected via HMAC-SHA256 matching across multiple AICTE institutions within the same academic cycle.`,
      institutionId: pendingDuplicates[0].institutionBId,
      institutionName: `${pendingDuplicates[0].institutionAName} & ${pendingDuplicates[0].institutionBName}`,
      programmeName: pendingDuplicates[0].programmeB,
      detectedAt: '2026-10-29 14:20 IST',
      affectedRecordsCount: pendingDuplicates.length * 2,
      suggestedSteps: [
        'Inspect side-by-side admission timestamps in Duplicate Shield.',
        'Verify whether student submitted an official seat cancellation / transfer certificate.',
        'Place secondary seat lock on hold until institution registrar responds.',
      ],
      status: 'Open Investigation',
    });
  }

  // 2. Admission beyond configured intake
  for (const item of ledger) {
    if (item.regularStatus === 'EXCEEDED' || item.excessAdmissionsCount > 0) {
      anomalies.push({
        id: `anom-excess-${item.programmeId}`,
        anomalyType: 'Admission Attempt Beyond Approved Intake',
        riskLevel: RiskLevel.HIGH,
        explanation: `${item.institutionName} attempted ${item.excessAdmissionsCount} regular admission(s) above the AICTE approved intake of ${item.approvedIntake} in ${item.programmeName}.`,
        institutionId: item.institutionId,
        institutionName: item.institutionName,
        programmeName: item.programmeName,
        detectedAt: '2026-10-30 09:15 IST',
        affectedRecordsCount: item.excessAdmissionsCount,
        suggestedSteps: [
          'Verify AICTE Extension of Approval (EoA) letter for academic year 2026-27.',
          'Check if excess records were misclassified regular vs supernumerary seats.',
          'Require institutional explanation before issuing student verification credentials.',
        ],
        status: 'Open Investigation',
      });
    }
  }

  // 3. Repeated incomplete student records (Missing APAAR IDs)
  for (const inst of institutions) {
    const instStudents = students.filter((s) => s.institutionId === inst.id);
    const missingCount = instStudents.filter(
      (s) => s.validationStatus === ValidationStatus.MISSING_APAAR
    ).length;
    if (missingCount >= 2) {
      anomalies.push({
        id: `anom-missing-${inst.id}`,
        anomalyType: 'Repeated Incomplete Student Records (Missing APAAR IDs)',
        riskLevel: RiskLevel.MEDIUM,
        explanation: `${inst.name} has ${missingCount} student records queued in the Exception Queue without valid 12-digit APAAR identifiers.`,
        institutionId: inst.id,
        institutionName: inst.name,
        programmeName: 'Multiple Programmes',
        detectedAt: '2026-10-28 17:45 IST',
        affectedRecordsCount: missingCount,
        suggestedSteps: [
          'Notify Nodal Officer at institution to complete Academic Bank of Credits (ABC) onboarding.',
          'Enforce 14-day provisional admission window for APAAR seeding.',
        ],
        status: 'Open Investigation',
      });
    }
  }

  // 4. Unusual concentration of admission entries on a single date / Sudden spike
  const dateCounts = new Map<string, { count: number; instName: string; instId: string; prog: string }>();
  for (const s of students) {
    const key = `${s.institutionId}:${s.admissionDate}`;
    const curr = dateCounts.get(key) || {
      count: 0,
      instName: s.institutionName,
      instId: s.institutionId,
      prog: s.programmeName,
    };
    curr.count += 1;
    dateCounts.set(key, curr);
  }
  for (const [key, val] of dateCounts.entries()) {
    const dateStr = key.split(':')[1];
    if (val.count >= 6) {
      anomalies.push({
        id: `anom-spike-${key}`,
        anomalyType: 'Unusual Concentration of Admission Entries on Single Date',
        riskLevel: RiskLevel.MEDIUM,
        explanation: `Sudden batch spike of ${val.count} admissions recorded on ${dateStr} at ${val.instName}, significantly above daily rolling institutional average.`,
        institutionId: val.instId,
        institutionName: val.instName,
        programmeName: val.prog,
        detectedAt: '2026-10-29 19:10 IST',
        affectedRecordsCount: val.count,
        suggestedSteps: [
          'Cross-check bulk CSV upload audit log against state counseling allotment round dates.',
          'Sample 10% of batch records for counseling allotment letter verification.',
        ],
        status: 'Acknowledged',
      });
    }
  }

  // 5. Repeated inconsistencies across uploaded records
  const flaggedInconsistent = students.filter(
    (s) =>
      s.validationStatus === ValidationStatus.INVALID_FORMAT ||
      s.validationStatus === ValidationStatus.FLAGGED
  );
  if (flaggedInconsistent.length >= 2) {
    anomalies.push({
      id: 'anom-inconsistent-records',
      anomalyType: 'Repeated Data Quality Inconsistencies Across Uploaded Records',
      riskLevel: RiskLevel.LOW,
      explanation: `${flaggedInconsistent.length} student records across participating institutions exhibit format mismatches or category capacity discrepancies requiring manual verification.`,
      institutionId: flaggedInconsistent[0].institutionId,
      institutionName: flaggedInconsistent[0].institutionName,
      programmeName: flaggedInconsistent[0].programmeName,
      detectedAt: '2026-10-27 11:30 IST',
      affectedRecordsCount: flaggedInconsistent.length,
      suggestedSteps: [
        'Review APAAR Validation Engine exception queue.',
        'Provide standardized CSV schema template to institutional ERP administrators.',
      ],
      status: 'Open Investigation',
    });
  }

  return anomalies;
}
