export enum UserRole {
  AICTE_ADMIN = 'AICTE_ADMIN',
  INSTITUTE_ADMIN = 'INSTITUTE_ADMIN',
  STUDENT = 'STUDENT',
  VERIFIER = 'VERIFIER',
}

export enum ValidationStatus {
  VERIFIED = 'Verified (Demo)',
  PENDING = 'Pending Verification',
  INVALID_FORMAT = 'Invalid Format',
  MISSING_APAAR = 'Missing APAAR ID',
  DUPLICATE_DETECTED = 'Duplicate Detected',
  FLAGGED = 'Flagged for Review',
}

export enum AdmissionStatus {
  CONFIRMED = 'Confirmed',
  PROVISIONAL = 'Provisional',
  DRAFT = 'Draft',
  EXCESS_FLAGGED = 'Excess Capacity Flagged',
  WITHDRAWN = 'Withdrawn',
}

export enum AdmissionCategory {
  GENERAL = 'General / Regular',
  NRI = 'NRI',
  OCI = 'OCI',
  FN = 'Foreign National (FN)',
  PMSSS = 'Supernumerary / PMSSS',
}

export enum DuplicateCategory {
  EXACT_MATCH = 'Exact Identity Match',
  POSSIBLE_DUPLICATE = 'Possible Duplicate',
  MANUAL_REVIEW = 'Manual Review Required',
}

export enum RiskLevel {
  LOW = 'Low Risk',
  MEDIUM = 'Medium Risk',
  HIGH = 'High Risk',
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId?: string;
  institutionName?: string;
  studentId?: string;
  organization?: string;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  state: string;
  district: string;
  type: 'Government' | 'Autonomous Private' | 'Deemed University' | 'State University Affiliated';
  approvalStatus: 'Approved' | 'Under Review' | 'Probation';
  submissionStatus: 'Submitted' | 'Pending Submission' | 'Verification in Progress';
  integrityStatus: 'Compliant' | 'Action Required' | 'Under Audit';
  establishedYear: number;
}

export interface Programme {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  name: string;
  department: string;
  academicYear: string;
  approvedIntake: number;
  supernumerarySeats: number;
  approvalStatus: 'Approved' | 'Pending Renewal';
}

export interface StudentRecord {
  id: string;
  studentId: string;
  fullName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  maskedApaarId: string;
  // Note: apaarHmacToken is kept on server side or used only in server validation
  apaarHmacToken?: string;
  // Synthetic demo raw ID stored only on server for generating student's own credential preview
  rawApaarDemo?: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  programmeId: string;
  programmeName: string;
  department: string;
  academicYear: string;
  admissionDate: string;
  admissionCategory: AdmissionCategory;
  isSupernumerary: boolean;
  admissionStatus: AdmissionStatus;
  validationStatus: ValidationStatus;
  validationDate: string;
  verificationReference: string;
  validationReason?: string;
  recommendedCorrection?: string;
  verificationStatus: 'Verified Credential Issued' | 'Pending Credential' | 'Exception Queue';
}

export interface DuplicateCase {
  id: string;
  referenceId: string;
  studentName: string;
  studentIdA: string;
  studentIdB: string;
  maskedApaarId: string;
  institutionAId: string;
  institutionAName: string;
  institutionBId: string;
  institutionBName: string;
  programmeA: string;
  programmeB: string;
  academicYear: string;
  detectionDate: string;
  category: DuplicateCategory;
  riskLevel: RiskLevel;
  reviewStatus: 'Pending Review' | 'Marked as Reviewed' | 'Resolved - Legitimate Transfer' | 'Escalated to AICTE';
  reviewNotes: string;
}

export interface SeatLedgerItem {
  programmeId: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  programmeName: string;
  department: string;
  academicYear: string;
  approvedIntake: number;
  actualRegularEnrolment: number;
  supernumerarySeats: number;
  actualSupernumeraryEnrolment: number;
  totalAuthorizedCapacity: number;
  totalOccupied: number;
  availableRegularSeats: number;
  availableSupernumerarySeats: number;
  availableTotalCapacity: number;
  regularStatus: 'AVAILABLE' | 'NEAR CAPACITY' | 'FULL' | 'EXCEEDED';
  excessAdmissionsCount: number;
  utilizationPercent: number;
}

export interface AnomalyAlert {
  id: string;
  anomalyType: string;
  riskLevel: RiskLevel;
  explanation: string;
  institutionId: string;
  institutionName: string;
  programmeName: string;
  detectedAt: string;
  affectedRecordsCount: number;
  suggestedSteps: string[];
  status: 'Open Investigation' | 'Acknowledged' | 'Resolved';
}

export interface PlatformAlert {
  id: string;
  alertType:
    | 'Duplicate APAAR Match Detected'
    | 'Admission Exceeding Approved Intake'
    | 'Missing APAAR ID'
    | 'Institution Submission Pending'
    | 'Student Information Mismatch';
  institutionId: string;
  institutionName: string;
  programme: string;
  timestamp: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  targetRoute: string;
}

export interface CredentialPayload {
  credentialId: string;
  studentId: string;
  studentName: string;
  maskedApaarId: string;
  apaarDemoReference: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  programmeName: string;
  academicYear: string;
  issueDate: string;
  expiryDate: string;
  issuer: string;
}

export interface DigitalCredential {
  credentialId: string;
  studentRecordId: string;
  studentId: string;
  payload: CredentialPayload;
  signature: string;
  publicKeyPem: string;
  status: 'Active' | 'Revoked' | 'Expired';
  consentStatus: 'Approved' | 'Consent Required' | 'Revoked';
  createdAt: string;
}

export interface ConsentRequest {
  id: string;
  studentRecordId: string;
  studentId: string;
  studentName: string;
  credentialId: string;
  verifierName: string;
  organization: string;
  purpose: string;
  requestedFields: string[];
  requestDate: string;
  expiryDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Revoked';
}

export interface VerificationLog {
  id: string;
  credentialId: string;
  studentId: string;
  studentName: string;
  institutionName: string;
  verifierName: string;
  organization: string;
  timestamp: string;
  mode: 'Online Verification' | 'Offline Signature Verification' | 'QR Payload Scan';
  result: 'Valid Credential' | 'Invalid Signature' | 'Expired Credential' | 'Revoked Credential' | 'Consent Required';
}

export interface AuditLogEntry {
  id: string;
  actionId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityReference: string;
  timestamp: string;
  status: 'Success' | 'Warning' | 'Flagged';
  details: string;
}

export interface SystemIntegration {
  id: string;
  systemName: string;
  purpose: string;
  connectionStatus: 'Connected to Sandbox' | 'Demo Connector' | 'Pending Authorization' | 'Not Connected';
  integrationType: string;
  lastSync: string;
  endpointPattern: string;
  protocol: string;
}

export interface CsvRowValidationResult {
  rowNumber: number;
  studentId: string;
  fullName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  rawApaarId: string;
  maskedApaarId: string;
  institutionCode: string;
  programmeName: string;
  department: string;
  academicYear: string;
  admissionCategory: AdmissionCategory;
  isValid: boolean;
  validationStatus: ValidationStatus;
  errors: string[];
  warnings: string[];
}
