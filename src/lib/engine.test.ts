import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeApaarHmacToken,
  computeSeatLedger,
  deriveEd25519KeyPair,
  evaluateStudentSubmission,
  maskApaarId,
  signCredentialPayload,
  validateApaarFormat,
  validateBulkCsvRows,
  verifyCredentialSignature,
} from './engine';
import {
  AdmissionCategory,
  AdmissionStatus,
  CredentialPayload,
  Institution,
  Programme,
  StudentRecord,
  ValidationStatus,
} from '../types/domain';

const TEST_HMAC_SECRET = 'test-sih26263-hmac-secret';
const TEST_SIGNING_SEED = 'test-sih26263-ed25519-seed';

const sampleInstitutions: Institution[] = [
  {
    id: 'inst-1',
    name: 'ABC Engineering College',
    code: 'AICTE-DL-101',
    state: 'Delhi',
    district: 'New Delhi',
    type: 'Autonomous Private',
    approvalStatus: 'Approved',
    submissionStatus: 'Submitted',
    integrityStatus: 'Compliant',
    establishedYear: 1998,
  },
  {
    id: 'inst-2',
    name: 'Indraprastha Institute of Technology',
    code: 'AICTE-MH-204',
    state: 'Maharashtra',
    district: 'Pune',
    type: 'Government',
    approvalStatus: 'Approved',
    submissionStatus: 'Submitted',
    integrityStatus: 'Action Required',
    establishedYear: 1985,
  },
];

const sampleProgrammes: Programme[] = [
  {
    id: 'prog-1',
    institutionId: 'inst-1',
    institutionName: 'ABC Engineering College',
    institutionCode: 'AICTE-DL-101',
    name: 'Computer Science and Engineering',
    department: 'Computer Engineering',
    academicYear: '2026-27',
    approvedIntake: 60,
    supernumerarySeats: 5,
    approvalStatus: 'Approved',
  },
  {
    id: 'prog-2',
    institutionId: 'inst-2',
    institutionName: 'Indraprastha Institute of Technology',
    institutionCode: 'AICTE-MH-204',
    name: 'Computer Science and Engineering',
    department: 'Computer Engineering',
    academicYear: '2026-27',
    approvedIntake: 60,
    supernumerarySeats: 5,
    approvalStatus: 'Approved',
  },
];

test('TEST 1: Duplicate Student across two institutions is detected via HMAC-SHA256', () => {
  const existingStudentInCollegeA: StudentRecord = {
    id: 'stu-1',
    studentId: '221901',
    fullName: 'Rahul Sharma',
    dob: '2005-04-12',
    gender: 'Male',
    maskedApaarId: maskApaarId('123456789012'),
    apaarHmacToken: computeApaarHmacToken('123456789012', TEST_HMAC_SECRET),
    institutionId: 'inst-1',
    institutionName: 'ABC Engineering College',
    institutionCode: 'AICTE-DL-101',
    programmeId: 'prog-1',
    programmeName: 'Computer Science and Engineering',
    department: 'Computer Engineering',
    academicYear: '2026-27',
    admissionDate: '2026-08-10',
    admissionCategory: AdmissionCategory.GENERAL,
    isSupernumerary: false,
    admissionStatus: AdmissionStatus.CONFIRMED,
    validationStatus: ValidationStatus.VERIFIED,
    validationDate: '2026-08-10',
    verificationReference: 'VER-2026-101',
    verificationStatus: 'Verified Credential Issued',
  };

  // Attempt to register same APAAR ID in College B
  const outcome = evaluateStudentSubmission(
    {
      studentId: 'IIT-26-881',
      fullName: 'Rahul Sharma',
      dob: '2005-04-12',
      gender: 'Male',
      rawApaarId: '1234-5678-9012',
      institutionId: 'inst-2',
      programmeId: 'prog-2',
      academicYear: '2026-27',
      admissionDate: '2026-08-14',
      admissionCategory: AdmissionCategory.GENERAL,
    },
    [existingStudentInCollegeA],
    sampleProgrammes,
    sampleInstitutions,
    TEST_HMAC_SECRET
  );

  assert.equal(outcome.validationStatus, ValidationStatus.DUPLICATE_DETECTED);
  assert.ok(outcome.duplicateCaseDetected);
  assert.equal(outcome.duplicateCaseDetected?.institutionAName, 'ABC Engineering College');
  assert.equal(outcome.duplicateCaseDetected?.institutionBName, 'Indraprastha Institute of Technology');
  assert.equal(outcome.maskedApaarId, 'XXXX-XXXX-9012');
});

test('TEST 2 & TEST 6: Live Seat Ledger separates regular (60/60) & supernumerary (2/5) and flags 61st regular admission', () => {
  const existing62Students: StudentRecord[] = [];
  // 60 regular admissions
  for (let i = 1; i <= 60; i++) {
    const apaar = String(200000000000 + i);
    existing62Students.push({
      id: `reg-${i}`,
      studentId: `ABC-REG-${i}`,
      fullName: `Regular Student ${i}`,
      dob: '2005-01-01',
      gender: 'Male',
      maskedApaarId: maskApaarId(apaar),
      apaarHmacToken: computeApaarHmacToken(apaar, TEST_HMAC_SECRET),
      institutionId: 'inst-1',
      institutionName: 'ABC Engineering College',
      institutionCode: 'AICTE-DL-101',
      programmeId: 'prog-1',
      programmeName: 'Computer Science and Engineering',
      department: 'Computer Engineering',
      academicYear: '2026-27',
      admissionDate: '2026-08-01',
      admissionCategory: AdmissionCategory.GENERAL,
      isSupernumerary: false,
      admissionStatus: AdmissionStatus.CONFIRMED,
      validationStatus: ValidationStatus.VERIFIED,
      validationDate: '2026-08-01',
      verificationReference: `REF-${i}`,
      verificationStatus: 'Verified Credential Issued',
    });
  }
  // 2 supernumerary admissions
  for (let i = 1; i <= 2; i++) {
    const apaar = String(300000000000 + i);
    existing62Students.push({
      id: `sup-${i}`,
      studentId: `ABC-SUP-${i}`,
      fullName: `Supernumerary Student ${i}`,
      dob: '2005-02-01',
      gender: 'Female',
      maskedApaarId: maskApaarId(apaar),
      apaarHmacToken: computeApaarHmacToken(apaar, TEST_HMAC_SECRET),
      institutionId: 'inst-1',
      institutionName: 'ABC Engineering College',
      institutionCode: 'AICTE-DL-101',
      programmeId: 'prog-1',
      programmeName: 'Computer Science and Engineering',
      department: 'Computer Engineering',
      academicYear: '2026-27',
      admissionDate: '2026-08-02',
      admissionCategory: AdmissionCategory.NRI,
      isSupernumerary: true,
      admissionStatus: AdmissionStatus.CONFIRMED,
      validationStatus: ValidationStatus.VERIFIED,
      validationDate: '2026-08-02',
      verificationReference: `REF-S-${i}`,
      verificationStatus: 'Verified Credential Issued',
    });
  }

  const ledger = computeSeatLedger([sampleProgrammes[0]], existing62Students)[0];
  assert.equal(ledger.approvedIntake, 60);
  assert.equal(ledger.actualRegularEnrolment, 60);
  assert.equal(ledger.regularStatus, 'FULL');
  assert.equal(ledger.supernumerarySeats, 5);
  assert.equal(ledger.actualSupernumeraryEnrolment, 2);
  assert.equal(ledger.totalAuthorizedCapacity, 65);
  assert.equal(ledger.totalOccupied, 62);
  assert.equal(ledger.availableTotalCapacity, 3);

  // Attempt 61st regular admission -> must flag as exceeding approved intake
  const attempt61 = evaluateStudentSubmission(
    {
      studentId: 'ABC-REG-61',
      fullName: 'Vikramaditya Rao',
      dob: '2005-07-19',
      gender: 'Male',
      rawApaarId: '456789012345',
      institutionId: 'inst-1',
      programmeId: 'prog-1',
      academicYear: '2026-27',
      admissionDate: '2026-08-20',
      admissionCategory: AdmissionCategory.GENERAL,
    },
    existing62Students,
    sampleProgrammes,
    sampleInstitutions,
    TEST_HMAC_SECRET
  );

  assert.equal(attempt61.admissionStatus, AdmissionStatus.EXCESS_FLAGGED);
  assert.equal(attempt61.validationStatus, ValidationStatus.FLAGGED);
  assert.ok(attempt61.seatExceededWarning?.includes('FULL'));
});

test('TEST 3: Missing APAAR ID routes student to Exception Queue', () => {
  const formatRes = validateApaarFormat('');
  assert.equal(formatRes.valid, false);
  assert.equal(formatRes.status, ValidationStatus.MISSING_APAAR);

  const outcome = evaluateStudentSubmission(
    {
      studentId: 'ABC-26-990',
      fullName: 'Ananya Deshmukh',
      dob: '2005-11-05',
      gender: 'Female',
      rawApaarId: '',
      institutionId: 'inst-1',
      programmeId: 'prog-1',
      academicYear: '2026-27',
      admissionDate: '2026-08-18',
      admissionCategory: AdmissionCategory.GENERAL,
    },
    [],
    sampleProgrammes,
    sampleInstitutions,
    TEST_HMAC_SECRET
  );

  assert.equal(outcome.validationStatus, ValidationStatus.MISSING_APAAR);
  assert.equal(outcome.verificationStatus, 'Exception Queue');
});

test('TEST 4: Ed25519 digital credential signing and tamper detection', () => {
  const { publicKeyPem, privateKeyPem } = deriveEd25519KeyPair(TEST_SIGNING_SEED);
  const payload: CredentialPayload = {
    credentialId: 'CRED-AICTE-2026-221901',
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
    issuer: 'APAAR Setu National Academic Verification Authority (Demo)',
  };

  const signature = signCredentialPayload(payload, privateKeyPem);
  assert.equal(verifyCredentialSignature(payload, signature, publicKeyPem), true);

  // Modify payload (tamper with programme or student name)
  const tamperedPayload: CredentialPayload = {
    ...payload,
    programmeName: 'Artificial Intelligence and Data Science',
  };
  assert.equal(verifyCredentialSignature(tamperedPayload, signature, publicKeyPem), false);
});

test('TEST 7: Bulk CSV upload detects missing APAAR, mismatched institution/programme, and duplicates', () => {
  const csvRows = [
    {
      studentId: 'CSV-101',
      fullName: 'Karan Mehta',
      dob: '2005-03-10',
      gender: 'Male',
      apaarId: '789012345678',
      institutionCode: 'AICTE-DL-101',
      programmeName: 'Computer Science and Engineering',
      department: 'Computer Engineering',
      academicYear: '2026-27',
      admissionCategory: 'General / Regular',
    },
    {
      studentId: 'CSV-102',
      fullName: 'Sneha Nair',
      dob: '2005-05-22',
      gender: 'Female',
      apaarId: '', // Missing APAAR
      institutionCode: 'AICTE-DL-101',
      programmeName: 'Computer Science and Engineering',
      department: 'Computer Engineering',
      academicYear: '2026-27',
      admissionCategory: 'General / Regular',
    },
    {
      studentId: 'CSV-103',
      fullName: 'Rohan Joshi',
      dob: '2005-09-14',
      gender: 'Male',
      apaarId: '890123456789',
      institutionCode: 'AICTE-DL-101',
      programmeName: 'Aerospace Robotics Unapproved', // Invalid programme
      department: 'Aerospace',
      academicYear: '2026-27',
      admissionCategory: 'General / Regular',
    },
  ];

  const batchValidation = validateBulkCsvRows(
    csvRows,
    [],
    sampleProgrammes,
    sampleInstitutions,
    TEST_HMAC_SECRET
  );

  assert.equal(batchValidation.summary.totalRows, 3);
  assert.equal(batchValidation.summary.validRecords, 1);
  assert.equal(batchValidation.summary.invalidRecords, 2);
  assert.equal(batchValidation.summary.missingApaarIds, 1);
});
