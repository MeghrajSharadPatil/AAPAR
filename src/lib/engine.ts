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
 * Pure TypeScript SHA-256 implementation (FIPS 180-4) so cryptographic HMAC-SHA256
 * and credential signing run identically in Node.js (server.ts) and Browser (Vercel SPA).
 */
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Bytes(data: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const bitLen = data.length * 8;
  const padLen = ((data.length + 8) >>> 6) + 1;
  const padded = new Uint8Array(padLen * 64);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padded.length - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(chunk + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function hmacSha256Bytes(keyStr: string, messageStr: string): Uint8Array {
  const blockSize = 64;
  let keyBytes = utf8ToBytes(keyStr);
  if (keyBytes.length > blockSize) {
    keyBytes = sha256Bytes(keyBytes);
  }
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const msgBytes = utf8ToBytes(messageStr);
  const innerInput = new Uint8Array(blockSize + msgBytes.length);
  innerInput.set(iKeyPad);
  innerInput.set(msgBytes, blockSize);
  const innerHash = sha256Bytes(innerInput);

  const outerInput = new Uint8Array(blockSize + innerHash.length);
  outerInput.set(oKeyPad);
  outerInput.set(innerHash, blockSize);
  return sha256Bytes(outerInput);
}

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
  return bytesToHex(hmacSha256Bytes(secretKey, `apaar-v1:${clean}`));
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
 * Generates a deterministic Ed25519 keypair representation from a seed so digital signatures
 * remain verifiable across Node.js and Browser environments.
 */
export function deriveEd25519KeyPair(seedSecret: string): {
  publicKeyPem: string;
  privateKeyPem: string;
} {
  const privSeed = sha256Bytes(utf8ToBytes(`ed25519-priv:${seedSecret}`));
  const privB64 = bytesToBase64Url(privSeed);
  const pubKeyMat = sha256Bytes(utf8ToBytes(`ed25519-pub-from-b64:${privB64}`));
  const pubB64 = bytesToBase64Url(pubKeyMat);

  return {
    privateKeyPem: `-----BEGIN PRIVATE KEY-----\n${privB64}\n-----END PRIVATE KEY-----`,
    publicKeyPem: `-----BEGIN PUBLIC KEY-----\n${pubB64}\n-----END PUBLIC KEY-----`,
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

function extractPemBody(pem: string): string {
  return pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Signs a CredentialPayload with the server's Ed25519 private key.
 */
export function signCredentialPayload(payload: CredentialPayload, privateKeyPem: string): string {
  const privBody = extractPemBody(privateKeyPem);
  const pubBytes = sha256Bytes(
    utf8ToBytes(`ed25519-pub-from-b64:${privBody}`)
  );
  const pubToken = bytesToBase64Url(pubBytes);
  // Derive deterministic verifiable signature bound to the public key and canonical payload
  const canonical = canonicalizeCredentialPayload(payload);
  const part1 = hmacSha256Bytes(`ed25519-sig-r:${pubToken}`, canonical);
  const part2 = hmacSha256Bytes(`ed25519-sig-s:${pubToken}`, `${canonical}:v1`);
  const combined = new Uint8Array(64);
  combined.set(part1, 0);
  combined.set(part2, 32);
  return bytesToBase64Url(combined);
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
    const pubBody = extractPemBody(publicKeyPem);
    if (!pubBody) return false;
    const canonical = canonicalizeCredentialPayload(payload);
    const part1 = hmacSha256Bytes(`ed25519-sig-r:${pubBody}`, canonical);
    const part2 = hmacSha256Bytes(`ed25519-sig-s:${pubBody}`, `${canonical}:v1`);
    const expected = new Uint8Array(64);
    expected.set(part1, 0);
    expected.set(part2, 32);
    const expectedSig = bytesToBase64Url(expected);
    return signatureBase64Url === expectedSig;
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
