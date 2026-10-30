import {
  AdmissionCategory,
  AdmissionStatus,
  AuditLogEntry,
  ConsentRequest,
  CredentialPayload,
  DigitalCredential,
  DuplicateCase,
  DuplicateCategory,
  Institution,
  PlatformAlert,
  Programme,
  RiskLevel,
  StudentRecord,
  SystemIntegration,
  UserAccount,
  UserRole,
  ValidationStatus,
  VerificationLog,
} from '../types/domain';
import {
  computeApaarHmacToken,
  deriveEd25519KeyPair,
  maskApaarId,
  signCredentialPayload,
} from './engine';

export interface DatabaseState {
  users: UserAccount[];
  institutions: Institution[];
  programmes: Programme[];
  students: StudentRecord[];
  duplicates: DuplicateCase[];
  credentials: DigitalCredential[];
  consentRequests: ConsentRequest[];
  verificationLogs: VerificationLog[];
  auditLogs: AuditLogEntry[];
  alerts: PlatformAlert[];
  integrations: SystemIntegration[];
  publicKeyPem: string;
}

export function buildInitialSeedDatabase(
  hmacSecret: string,
  signingSeed: string
): DatabaseState {
  const { publicKeyPem, privateKeyPem } = deriveEd25519KeyPair(signingSeed);

  const users: UserAccount[] = [
    {
      id: 'usr-aicte-1',
      name: 'Dr. Rajeshwar Varma',
      email: 'admin@aicte-demo.gov.in',
      role: UserRole.AICTE_ADMIN,
      organization: 'All India Council for Technical Education (New Delhi)',
    },
    {
      id: 'usr-inst-1',
      name: 'Prof. Meenakshi Iyer',
      email: 'registrar@abcengg-demo.edu.in',
      role: UserRole.INSTITUTE_ADMIN,
      institutionId: 'inst-1',
      institutionName: 'ABC Engineering College',
      organization: 'ABC Engineering College (AICTE-DL-101)',
    },
    {
      id: 'usr-stu-1',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@student-demo.edu.in',
      role: UserRole.STUDENT,
      institutionId: 'inst-1',
      institutionName: 'ABC Engineering College',
      studentId: '221901',
      organization: 'B.Tech Computer Science and Engineering',
    },
    {
      id: 'usr-ver-1',
      name: 'Vikramaditya Sen',
      email: 'verifier@bharattech-demo.in',
      role: UserRole.VERIFIER,
      organization: 'BharatTech Global Solutions Ltd. (Authorized Employer Verifier)',
    },
  ];

  const institutions: Institution[] = [
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
      establishedYear: 1986,
    },
    {
      id: 'inst-3',
      name: 'Dakshin Bharat Institute of Engineering',
      code: 'AICTE-KA-309',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      type: 'Autonomous Private',
      approvalStatus: 'Approved',
      submissionStatus: 'Submitted',
      integrityStatus: 'Compliant',
      establishedYear: 2001,
    },
    {
      id: 'inst-4',
      name: 'Sardar Vallabhbhai College of Technology',
      code: 'AICTE-GJ-412',
      state: 'Gujarat',
      district: 'Ahmedabad',
      type: 'State University Affiliated',
      approvalStatus: 'Approved',
      submissionStatus: 'Verification in Progress',
      integrityStatus: 'Compliant',
      establishedYear: 1994,
    },
    {
      id: 'inst-5',
      name: 'Eastern Himalayan Technical University',
      code: 'AICTE-AS-518',
      state: 'Assam',
      district: 'Kamrup Metropolitan',
      type: 'Deemed University',
      approvalStatus: 'Under Review',
      submissionStatus: 'Pending Submission',
      integrityStatus: 'Under Audit',
      establishedYear: 2009,
    },
    {
      id: 'inst-6',
      name: 'Kaveri College of Information Technology',
      code: 'AICTE-TN-625',
      state: 'Tamil Nadu',
      district: 'Chennai',
      type: 'Autonomous Private',
      approvalStatus: 'Approved',
      submissionStatus: 'Submitted',
      integrityStatus: 'Compliant',
      establishedYear: 2004,
    },
  ];

  const programmes: Programme[] = [
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
      institutionId: 'inst-1',
      institutionName: 'ABC Engineering College',
      institutionCode: 'AICTE-DL-101',
      name: 'Electronics and Communication Engineering',
      department: 'Electronics Engineering',
      academicYear: '2026-27',
      approvedIntake: 30,
      supernumerarySeats: 5,
      approvalStatus: 'Approved',
    },
    {
      id: 'prog-3',
      institutionId: 'inst-1',
      institutionName: 'ABC Engineering College',
      institutionCode: 'AICTE-DL-101',
      name: 'Artificial Intelligence and Data Science',
      department: 'Computer Engineering',
      academicYear: '2026-27',
      approvedIntake: 30,
      supernumerarySeats: 3,
      approvalStatus: 'Approved',
    },
    {
      id: 'prog-4',
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
    {
      id: 'prog-5',
      institutionId: 'inst-2',
      institutionName: 'Indraprastha Institute of Technology',
      institutionCode: 'AICTE-MH-204',
      name: 'Mechanical & Automation Engineering',
      department: 'Mechanical Engineering',
      academicYear: '2026-27',
      approvedIntake: 45,
      supernumerarySeats: 4,
      approvalStatus: 'Approved',
    },
    {
      id: 'prog-6',
      institutionId: 'inst-3',
      institutionName: 'Dakshin Bharat Institute of Engineering',
      institutionCode: 'AICTE-KA-309',
      name: 'Information Science and Engineering',
      department: 'Information Technology',
      academicYear: '2026-27',
      approvedIntake: 60,
      supernumerarySeats: 6,
      approvalStatus: 'Approved',
    },
    {
      id: 'prog-7',
      institutionId: 'inst-3',
      institutionName: 'Dakshin Bharat Institute of Engineering',
      institutionCode: 'AICTE-KA-309',
      name: 'VLSI Design and Embedded Systems',
      department: 'Electronics Engineering',
      academicYear: '2026-27',
      approvedIntake: 30,
      supernumerarySeats: 3,
      approvalStatus: 'Approved',
    },
    {
      id: 'prog-8',
      institutionId: 'inst-4',
      institutionName: 'Sardar Vallabhbhai College of Technology',
      institutionCode: 'AICTE-GJ-412',
      name: 'Civil & Smart Infrastructure Engineering',
      department: 'Civil Engineering',
      academicYear: '2026-27',
      approvedIntake: 40,
      supernumerarySeats: 4,
      approvalStatus: 'Approved',
    },
    {
      id: 'prog-9',
      institutionId: 'inst-5',
      institutionName: 'Eastern Himalayan Technical University',
      institutionCode: 'AICTE-AS-518',
      name: 'Electrical & Renewable Energy Engineering',
      department: 'Electrical Engineering',
      academicYear: '2026-27',
      approvedIntake: 30,
      supernumerarySeats: 3,
      approvalStatus: 'Pending Renewal',
    },
    {
      id: 'prog-10',
      institutionId: 'inst-6',
      institutionName: 'Kaveri College of Information Technology',
      institutionCode: 'AICTE-TN-625',
      name: 'Cyber Security and Blockchain Systems',
      department: 'Information Technology',
      academicYear: '2026-27',
      approvedIntake: 45,
      supernumerarySeats: 5,
      approvalStatus: 'Approved',
    },
  ];

  const students: StudentRecord[] = [];

  const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Ananya', 'Diya', 'Aditi', 'Kavya', 'Meera', 'Nandini', 'Priya', 'Riya', 'Saanvi', 'Tanvi',
    'Rohan', 'Karthik', 'Pranav', 'Siddharth', 'Dev', 'Nikhil', 'Harsh', 'Varun', 'Yash', 'Manish',
  ];
  const lastNames = [
    'Patel', 'Verma', 'Nair', 'Reddy', 'Kulkarni', 'Chatterjee', 'Joshi', 'Mehta', 'Bhatia', 'Gowda',
    'Deshmukh', 'Subramanian', 'Bora', 'Thakur', 'Malhotra', 'Srinivasan', 'Rathore', 'Agrawal', 'kapoor', 'pillai',
  ];

  // 1. Primary Featured Student: Rahul Sharma (Student ID: 221901, APAAR Demo ID: 123456789012) at ABC Engineering College (prog-1, Regular #1)
  const rahulApaar = '123456789012';
  students.push({
    id: 'stu-rahul-1',
    studentId: '221901',
    fullName: 'Rahul Sharma',
    dob: '2005-04-14',
    gender: 'Male',
    maskedApaarId: maskApaarId(rahulApaar),
    apaarHmacToken: computeApaarHmacToken(rahulApaar, hmacSecret),
    rawApaarDemo: rahulApaar,
    institutionId: 'inst-1',
    institutionName: 'ABC Engineering College',
    institutionCode: 'AICTE-DL-101',
    programmeId: 'prog-1',
    programmeName: 'Computer Science and Engineering',
    department: 'Computer Engineering',
    academicYear: '2026-27',
    admissionDate: '2026-08-05',
    admissionCategory: AdmissionCategory.GENERAL,
    isSupernumerary: false,
    admissionStatus: AdmissionStatus.CONFIRMED,
    validationStatus: ValidationStatus.VERIFIED,
    validationDate: '2026-08-05',
    verificationReference: 'VER-AICTE-2026-221901',
    verificationStatus: 'Verified Credential Issued',
  });

  // Fill remaining 59 regular seats in prog-1 (ABC Engineering College - CSE) so Regular Enrolment = 60/60 (FULL!)
  for (let i = 2; i <= 60; i++) {
    const fn = firstNames[(i - 1) % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    const apaar = String(210000000000 + i * 137);
    const stuId = String(221900 + i);
    students.push({
      id: `stu-abc-cse-${i}`,
      studentId: stuId,
      fullName: `${fn} ${ln.charAt(0).toUpperCase() + ln.slice(1)}`,
      dob: `2005-${String(((i % 9) + 1)).padStart(2, '0')}-${String(((i % 25) + 1)).padStart(2, '0')}`,
      gender: i % 2 === 0 ? 'Female' : 'Male',
      maskedApaarId: maskApaarId(apaar),
      apaarHmacToken: computeApaarHmacToken(apaar, hmacSecret),
      rawApaarDemo: apaar,
      institutionId: 'inst-1',
      institutionName: 'ABC Engineering College',
      institutionCode: 'AICTE-DL-101',
      programmeId: 'prog-1',
      programmeName: 'Computer Science and Engineering',
      department: 'Computer Engineering',
      academicYear: '2026-27',
      admissionDate: i <= 8 ? '2026-08-12' : `2026-08-${String(10 + (i % 15)).padStart(2, '0')}`,
      admissionCategory: AdmissionCategory.GENERAL,
      isSupernumerary: false,
      admissionStatus: AdmissionStatus.CONFIRMED,
      validationStatus: ValidationStatus.VERIFIED,
      validationDate: '2026-08-15',
      verificationReference: `VER-AICTE-2026-${stuId}`,
      verificationStatus: 'Verified Credential Issued',
    });
  }

  // Add 2 Supernumerary students in prog-1 (ABC Engineering College - CSE) so Supernumerary Occupancy = 2/5 and Total Occupancy = 62/65 (Available = 3)
  const sup1Apaar = '310045678901';
  students.push({
    id: 'stu-abc-sup-1',
    studentId: '221961',
    fullName: 'Zoya Al-Mansoor',
    dob: '2005-03-19',
    gender: 'Female',
    maskedApaarId: maskApaarId(sup1Apaar),
    apaarHmacToken: computeApaarHmacToken(sup1Apaar, hmacSecret),
    rawApaarDemo: sup1Apaar,
    institutionId: 'inst-1',
    institutionName: 'ABC Engineering College',
    institutionCode: 'AICTE-DL-101',
    programmeId: 'prog-1',
    programmeName: 'Computer Science and Engineering',
    department: 'Computer Engineering',
    academicYear: '2026-27',
    admissionDate: '2026-08-16',
    admissionCategory: AdmissionCategory.NRI,
    isSupernumerary: true,
    admissionStatus: AdmissionStatus.CONFIRMED,
    validationStatus: ValidationStatus.VERIFIED,
    validationDate: '2026-08-16',
    verificationReference: 'VER-AICTE-2026-221961',
    verificationStatus: 'Verified Credential Issued',
  });

  const sup2Apaar = '310045678902';
  students.push({
    id: 'stu-abc-sup-2',
    studentId: '221962',
    fullName: 'Kabir Chawla',
    dob: '2005-07-22',
    gender: 'Male',
    maskedApaarId: maskApaarId(sup2Apaar),
    apaarHmacToken: computeApaarHmacToken(sup2Apaar, hmacSecret),
    rawApaarDemo: sup2Apaar,
    institutionId: 'inst-1',
    institutionName: 'ABC Engineering College',
    institutionCode: 'AICTE-DL-101',
    programmeId: 'prog-1',
    programmeName: 'Computer Science and Engineering',
    department: 'Computer Engineering',
    academicYear: '2026-27',
    admissionDate: '2026-08-17',
    admissionCategory: AdmissionCategory.OCI,
    isSupernumerary: true,
    admissionStatus: AdmissionStatus.CONFIRMED,
    validationStatus: ValidationStatus.VERIFIED,
    validationDate: '2026-08-17',
    verificationReference: 'VER-AICTE-2026-221962',
    verificationStatus: 'Verified Credential Issued',
  });

  // Add Duplicate Enrolment Record across Institution B (Indraprastha Institute of Technology) for Rahul Sharma (123456789012)
  students.push({
    id: 'stu-rahul-dup-2',
    studentId: 'IIT-MH-2604',
    fullName: 'Rahul Sharma',
    dob: '2005-04-14',
    gender: 'Male',
    maskedApaarId: maskApaarId(rahulApaar),
    apaarHmacToken: computeApaarHmacToken(rahulApaar, hmacSecret),
    rawApaarDemo: rahulApaar,
    institutionId: 'inst-2',
    institutionName: 'Indraprastha Institute of Technology',
    institutionCode: 'AICTE-MH-204',
    programmeId: 'prog-4',
    programmeName: 'Computer Science and Engineering',
    department: 'Computer Engineering',
    academicYear: '2026-27',
    admissionDate: '2026-08-19',
    admissionCategory: AdmissionCategory.GENERAL,
    isSupernumerary: false,
    admissionStatus: AdmissionStatus.PROVISIONAL,
    validationStatus: ValidationStatus.DUPLICATE_DETECTED,
    validationDate: '2026-08-19',
    verificationReference: 'EXC-DUP-2026-001',
    validationReason:
      'Cross-institution HMAC-SHA256 APAAR match detected with ABC Engineering College (Student ID: 221901).',
    recommendedCorrection:
      'Verify seat cancellation letter from ABC Engineering College or cancel duplicate admission in Duplicate Shield.',
    verificationStatus: 'Exception Queue',
  });

  // Add Missing APAAR ID records (Exception Queue) in ABC Engineering College (prog-2) & Eastern Himalayan (prog-9)
  students.push({
    id: 'stu-missing-1',
    studentId: '222104',
    fullName: 'Ananya Deshmukh',
    dob: '2005-11-08',
    gender: 'Female',
    maskedApaarId: 'MISSING',
    apaarHmacToken: '',
    rawApaarDemo: '',
    institutionId: 'inst-1',
    institutionName: 'ABC Engineering College',
    institutionCode: 'AICTE-DL-101',
    programmeId: 'prog-2',
    programmeName: 'Electronics and Communication Engineering',
    department: 'Electronics Engineering',
    academicYear: '2026-27',
    admissionDate: '2026-08-21',
    admissionCategory: AdmissionCategory.GENERAL,
    isSupernumerary: false,
    admissionStatus: AdmissionStatus.PROVISIONAL,
    validationStatus: ValidationStatus.MISSING_APAAR,
    validationDate: '2026-08-21',
    verificationReference: 'EXC-MISS-2026-104',
    validationReason: 'APAAR ID is missing from the student submission.',
    recommendedCorrection:
      'Seed 12-digit synthetic APAAR ID via Student Management or APAAR Validation Engine.',
    verificationStatus: 'Exception Queue',
  });

  students.push({
    id: 'stu-invalid-1',
    studentId: '222109',
    fullName: 'Saurabh Kulkarni',
    dob: '2005-09-12',
    gender: 'Male',
    maskedApaarId: 'XXXX-XXXX-0099',
    apaarHmacToken: '',
    rawApaarDemo: '000012340099',
    institutionId: 'inst-1',
    institutionName: 'ABC Engineering College',
    institutionCode: 'AICTE-DL-101',
    programmeId: 'prog-3',
    programmeName: 'Artificial Intelligence and Data Science',
    department: 'Computer Engineering',
    academicYear: '2026-27',
    admissionDate: '2026-08-22',
    admissionCategory: AdmissionCategory.GENERAL,
    isSupernumerary: false,
    admissionStatus: AdmissionStatus.PROVISIONAL,
    validationStatus: ValidationStatus.INVALID_FORMAT,
    validationDate: '2026-08-22',
    verificationReference: 'EXC-FMT-2026-109',
    validationReason:
      'APAAR ID does not match the configured 12-digit numeric format (leading zero prefix 0000 is invalid).',
    recommendedCorrection: 'Correct the 12-digit APAAR ID and trigger revalidation.',
    verificationStatus: 'Exception Queue',
  });

  // Add second cross-institution duplicate pair (Priya Nair across Dakshin Bharat & Kaveri College)
  const priyaApaar = '567890123456';
  students.push({
    id: 'stu-priya-1',
    studentId: 'DBIE-26-112',
    fullName: 'Priya Nair',
    dob: '2005-02-18',
    gender: 'Female',
    maskedApaarId: maskApaarId(priyaApaar),
    apaarHmacToken: computeApaarHmacToken(priyaApaar, hmacSecret),
    rawApaarDemo: priyaApaar,
    institutionId: 'inst-3',
    institutionName: 'Dakshin Bharat Institute of Engineering',
    institutionCode: 'AICTE-KA-309',
    programmeId: 'prog-6',
    programmeName: 'Information Science and Engineering',
    department: 'Information Technology',
    academicYear: '2026-27',
    admissionDate: '2026-08-09',
    admissionCategory: AdmissionCategory.GENERAL,
    isSupernumerary: false,
    admissionStatus: AdmissionStatus.CONFIRMED,
    validationStatus: ValidationStatus.VERIFIED,
    validationDate: '2026-08-09',
    verificationReference: 'VER-AICTE-2026-DB112',
    verificationStatus: 'Verified Credential Issued',
  });

  students.push({
    id: 'stu-priya-2',
    studentId: 'KCIT-26-308',
    fullName: 'Priya Nair',
    dob: '2005-02-18',
    gender: 'Female',
    maskedApaarId: maskApaarId(priyaApaar),
    apaarHmacToken: computeApaarHmacToken(priyaApaar, hmacSecret),
    rawApaarDemo: priyaApaar,
    institutionId: 'inst-6',
    institutionName: 'Kaveri College of Information Technology',
    institutionCode: 'AICTE-TN-625',
    programmeId: 'prog-10',
    programmeName: 'Cyber Security and Blockchain Systems',
    department: 'Information Technology',
    academicYear: '2026-27',
    admissionDate: '2026-08-23',
    admissionCategory: AdmissionCategory.GENERAL,
    isSupernumerary: false,
    admissionStatus: AdmissionStatus.PROVISIONAL,
    validationStatus: ValidationStatus.DUPLICATE_DETECTED,
    validationDate: '2026-08-23',
    verificationReference: 'EXC-DUP-2026-002',
    validationReason:
      'Cross-institution HMAC-SHA256 APAAR match detected with Dakshin Bharat Institute of Engineering.',
    recommendedCorrection: 'Verify official admission withdrawal from previous institute.',
    verificationStatus: 'Exception Queue',
  });

  // Add students across remaining programmes and academic years (2024-25, 2025-26, 2026-27)
  const extraProgrammes = [
    { prog: programmes[1], count: 14, year: '2026-27' },
    { prog: programmes[2], count: 18, year: '2026-27' },
    { prog: programmes[3], count: 22, year: '2025-26' },
    { prog: programmes[4], count: 16, year: '2025-26' },
    { prog: programmes[5], count: 24, year: '2026-27' },
    { prog: programmes[6], count: 15, year: '2024-25' },
    { prog: programmes[7], count: 19, year: '2025-26' },
    { prog: programmes[8], count: 11, year: '2026-27' },
    { prog: programmes[9], count: 20, year: '2026-27' },
  ];

  let seq = 100;
  for (const group of extraProgrammes) {
    for (let j = 1; j <= group.count; j++) {
      seq++;
      const fn = firstNames[seq % firstNames.length];
      const ln = lastNames[(seq * 5) % lastNames.length];
      const isMissing = group.prog.id === 'prog-9' && j <= 3;
      const isSuper = j === 1 && group.prog.supernumerarySeats > 0;
      const category = isSuper
        ? seq % 2 === 0
          ? AdmissionCategory.FN
          : AdmissionCategory.NRI
        : AdmissionCategory.GENERAL;
      const rawApaar = isMissing ? '' : String(610000000000 + seq * 431);
      const stuCode = `${group.prog.institutionCode.split('-')[1]}-${group.year.slice(2, 4)}-${seq}`;

      students.push({
        id: `stu-gen-${seq}`,
        studentId: stuCode,
        fullName: `${fn} ${ln.charAt(0).toUpperCase() + ln.slice(1)}`,
        dob: `2004-${String(((seq % 11) + 1)).padStart(2, '0')}-${String(((seq % 27) + 1)).padStart(2, '0')}`,
        gender: seq % 3 === 0 ? 'Female' : 'Male',
        maskedApaarId: maskApaarId(rawApaar),
        apaarHmacToken: rawApaar ? computeApaarHmacToken(rawApaar, hmacSecret) : '',
        rawApaarDemo: rawApaar,
        institutionId: group.prog.institutionId,
        institutionName: group.prog.institutionName,
        institutionCode: group.prog.institutionCode,
        programmeId: group.prog.id,
        programmeName: group.prog.name,
        department: group.prog.department,
        academicYear: group.year,
        admissionDate: `2026-08-${String(1 + (seq % 26)).padStart(2, '0')}`,
        admissionCategory: category,
        isSupernumerary: isSuper,
        admissionStatus: isMissing ? AdmissionStatus.PROVISIONAL : AdmissionStatus.CONFIRMED,
        validationStatus: isMissing ? ValidationStatus.MISSING_APAAR : ValidationStatus.VERIFIED,
        validationDate: '2026-08-24',
        verificationReference: isMissing ? `EXC-MISS-${seq}` : `VER-2026-${seq}`,
        validationReason: isMissing
          ? 'Missing 12-digit APAAR ID at the time of institutional upload.'
          : undefined,
        recommendedCorrection: isMissing
          ? 'Seed student APAAR ID from Academic Bank of Credits portal.'
          : undefined,
        verificationStatus: isMissing ? 'Exception Queue' : 'Verified Credential Issued',
      });
    }
  }

  const duplicates: DuplicateCase[] = [
    {
      id: 'dup-case-1',
      referenceId: 'DUP-2026-1042',
      studentName: 'Rahul Sharma',
      studentIdA: '221901',
      studentIdB: 'IIT-MH-2604',
      maskedApaarId: 'XXXX-XXXX-9012',
      institutionAId: 'inst-1',
      institutionAName: 'ABC Engineering College',
      institutionBId: 'inst-2',
      institutionBName: 'Indraprastha Institute of Technology',
      programmeA: 'Computer Science and Engineering',
      programmeB: 'Computer Science and Engineering',
      academicYear: '2026-27',
      detectionDate: '2026-08-19',
      category: DuplicateCategory.EXACT_MATCH,
      riskLevel: RiskLevel.HIGH,
      reviewStatus: 'Pending Review',
      reviewNotes:
        'Identical HMAC-SHA256 token detected for synthetic APAAR ID ending in 9012 across Delhi and Pune institutions.',
    },
    {
      id: 'dup-case-2',
      referenceId: 'DUP-2026-1089',
      studentName: 'Priya Nair',
      studentIdA: 'DBIE-26-112',
      studentIdB: 'KCIT-26-308',
      maskedApaarId: 'XXXX-XXXX-3456',
      institutionAId: 'inst-3',
      institutionAName: 'Dakshin Bharat Institute of Engineering',
      institutionBId: 'inst-6',
      institutionBName: 'Kaveri College of Information Technology',
      programmeA: 'Information Science and Engineering',
      programmeB: 'Cyber Security and Blockchain Systems',
      academicYear: '2026-27',
      detectionDate: '2026-08-23',
      category: DuplicateCategory.EXACT_MATCH,
      riskLevel: RiskLevel.HIGH,
      reviewStatus: 'Pending Review',
      reviewNotes:
        'Student admitted in Bengaluru on Aug 09 and subsequently uploaded by Chennai institution on Aug 23 without migration clearance.',
    },
    {
      id: 'dup-case-3',
      referenceId: 'DUP-2026-1105',
      studentName: 'Siddharth Kulkarni',
      studentIdA: '221914',
      studentIdB: 'GJ-25-210',
      maskedApaarId: 'XXXX-XXXX-1918',
      institutionAId: 'inst-1',
      institutionAName: 'ABC Engineering College',
      institutionBId: 'inst-4',
      institutionBName: 'Sardar Vallabhbhai College of Technology',
      programmeA: 'Computer Science and Engineering',
      programmeB: 'Civil & Smart Infrastructure Engineering',
      academicYear: '2026-27',
      detectionDate: '2026-08-25',
      category: DuplicateCategory.POSSIBLE_DUPLICATE,
      riskLevel: RiskLevel.MEDIUM,
      reviewStatus: 'Manual Review Required' as DuplicateCase['reviewStatus'],
      reviewNotes:
        'Matching student full name and DOB across two states; awaiting registrar verification of transfer certificate.',
    },
  ];
  // Normalize status of 3rd case to valid union value
  duplicates[2].reviewStatus = 'Pending Review';

  // Build Ed25519 Signed Digital Credentials
  const rahulPayload: CredentialPayload = {
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
  };

  const zoyaPayload: CredentialPayload = {
    credentialId: 'CRED-APAAR-2026-221961',
    studentId: '221961',
    studentName: 'Zoya Al-Mansoor',
    maskedApaarId: 'XXXX-XXXX-8901',
    apaarDemoReference: '310045678901 (SYNTHETIC DEMO ID)',
    institutionId: 'inst-1',
    institutionName: 'ABC Engineering College',
    institutionCode: 'AICTE-DL-101',
    programmeName: 'Computer Science and Engineering',
    academicYear: '2026-27',
    issueDate: '2026-09-02',
    expiryDate: '2030-08-31',
    issuer: 'APAAR Setu Central Academic Authority (SIH26263 Prototype)',
  };

  const expiredPayload: CredentialPayload = {
    credentialId: 'CRED-APAAR-2022-EXP09',
    studentId: 'DL-22-009',
    studentName: 'Rohan Malhotra',
    maskedApaarId: 'XXXX-XXXX-7712',
    apaarDemoReference: '991122337712 (SYNTHETIC DEMO ID)',
    institutionId: 'inst-1',
    institutionName: 'ABC Engineering College',
    institutionCode: 'AICTE-DL-101',
    programmeName: 'Electronics and Communication Engineering',
    academicYear: '2022-23',
    issueDate: '2022-09-01',
    expiryDate: '2025-08-31',
    issuer: 'APAAR Setu Central Academic Authority (SIH26263 Prototype)',
  };

  const credentials: DigitalCredential[] = [
    {
      credentialId: rahulPayload.credentialId,
      studentRecordId: 'stu-rahul-1',
      studentId: '221901',
      payload: rahulPayload,
      signature: signCredentialPayload(rahulPayload, privateKeyPem),
      publicKeyPem,
      status: 'Active',
      consentStatus: 'Approved',
      createdAt: '2026-09-01 10:00 IST',
    },
    {
      credentialId: zoyaPayload.credentialId,
      studentRecordId: 'stu-abc-sup-1',
      studentId: '221961',
      payload: zoyaPayload,
      signature: signCredentialPayload(zoyaPayload, privateKeyPem),
      publicKeyPem,
      status: 'Active',
      consentStatus: 'Consent Required',
      createdAt: '2026-09-02 11:30 IST',
    },
    {
      credentialId: expiredPayload.credentialId,
      studentRecordId: 'stu-exp-1',
      studentId: 'DL-22-009',
      payload: expiredPayload,
      signature: signCredentialPayload(expiredPayload, privateKeyPem),
      publicKeyPem,
      status: 'Expired',
      consentStatus: 'Approved',
      createdAt: '2022-09-01 09:00 IST',
    },
  ];

  const consentRequests: ConsentRequest[] = [
    {
      id: 'con-req-1',
      studentRecordId: 'stu-rahul-1',
      studentId: '221901',
      studentName: 'Rahul Sharma',
      credentialId: 'CRED-APAAR-2026-221901',
      verifierName: 'Vikramaditya Sen',
      organization: 'BharatTech Global Solutions Ltd.',
      purpose: 'Graduate Software Engineer Internship Onboarding & Enrolment Verification',
      requestedFields: ['Student Full Name', 'Institution & Programme', 'Academic Year', 'APAAR Verification Status'],
      requestDate: '2026-10-25',
      expiryDate: '2026-11-25',
      status: 'Approved',
    },
    {
      id: 'con-req-2',
      studentRecordId: 'stu-rahul-1',
      studentId: '221901',
      studentName: 'Rahul Sharma',
      credentialId: 'CRED-APAAR-2026-221901',
      verifierName: 'Neha Krishnan',
      organization: 'National Scholarship & Fellowship Desk (Sandbox)',
      purpose: 'Merit-cum-Means Technical Scholarship Eligibility Verification',
      requestedFields: ['Student Full Name', 'Institution Code', 'Admission Category', 'Seat Confirmation Status'],
      requestDate: '2026-10-29',
      expiryDate: '2026-11-30',
      status: 'Pending',
    },
    {
      id: 'con-req-3',
      studentRecordId: 'stu-rahul-1',
      studentId: '221901',
      studentName: 'Rahul Sharma',
      credentialId: 'CRED-APAAR-2026-221901',
      verifierName: 'Arvind Swaminathan',
      organization: 'FinCore Analytics Pvt. Ltd.',
      purpose: 'Pre-Placement Background Verification Check',
      requestedFields: ['Student Full Name', 'Programme Name', 'Academic Year'],
      requestDate: '2026-10-18',
      expiryDate: '2026-11-18',
      status: 'Pending',
    },
  ];

  const verificationLogs: VerificationLog[] = [
    {
      id: 'vlog-1',
      credentialId: 'CRED-APAAR-2026-221901',
      studentId: '221901',
      studentName: 'Rahul Sharma',
      institutionName: 'ABC Engineering College',
      verifierName: 'Vikramaditya Sen',
      organization: 'BharatTech Global Solutions Ltd.',
      timestamp: '2026-10-28 15:42 IST',
      mode: 'Online Verification',
      result: 'Valid Credential',
    },
    {
      id: 'vlog-2',
      credentialId: 'CRED-APAAR-2026-221961',
      studentId: '221961',
      studentName: 'Protected (Consent Pending)',
      institutionName: 'ABC Engineering College',
      verifierName: 'Vikramaditya Sen',
      organization: 'BharatTech Global Solutions Ltd.',
      timestamp: '2026-10-29 11:15 IST',
      mode: 'Online Verification',
      result: 'Consent Required',
    },
    {
      id: 'vlog-3',
      credentialId: 'CRED-APAAR-2022-EXP09',
      studentId: 'DL-22-009',
      studentName: 'Rohan Malhotra',
      institutionName: 'ABC Engineering College',
      verifierName: 'Neha Krishnan',
      organization: 'National Scholarship Desk',
      timestamp: '2026-10-27 16:05 IST',
      mode: 'QR Payload Scan',
      result: 'Expired Credential',
    },
  ];

  const alerts: PlatformAlert[] = [
    {
      id: 'alt-1',
      alertType: 'Duplicate APAAR Match Detected',
      institutionId: 'inst-2',
      institutionName: 'Indraprastha Institute of Technology',
      programme: 'Computer Science and Engineering',
      timestamp: '2026-10-29 14:22 IST',
      severity: 'Critical',
      description:
        'HMAC-SHA256 identity token for Student ID IIT-MH-2604 matches existing confirmed enrolment 221901 at ABC Engineering College.',
      targetRoute: '/duplicate-shield',
    },
    {
      id: 'alt-2',
      alertType: 'Admission Exceeding Approved Intake',
      institutionId: 'inst-1',
      institutionName: 'ABC Engineering College',
      programme: 'Computer Science and Engineering',
      timestamp: '2026-10-29 11:05 IST',
      severity: 'High',
      description:
        'Regular Approved Intake reached 60/60 (100% capacity). Subsequent regular admission attempts will be blocked from auto-confirmation.',
      targetRoute: '/seat-ledger',
    },
    {
      id: 'alt-3',
      alertType: 'Missing APAAR ID',
      institutionId: 'inst-5',
      institutionName: 'Eastern Himalayan Technical University',
      programme: 'Electrical & Renewable Energy Engineering',
      timestamp: '2026-10-28 17:40 IST',
      severity: 'Medium',
      description:
        '3 uploaded student admission records lack 12-digit APAAR identifiers and have been routed to the Exception Queue.',
      targetRoute: '/apaar-validation',
    },
    {
      id: 'alt-4',
      alertType: 'Institution Submission Pending',
      institutionId: 'inst-5',
      institutionName: 'Eastern Himalayan Technical University',
      programme: 'All Approved Programmes',
      timestamp: '2026-10-28 09:30 IST',
      severity: 'Medium',
      description:
        'Final compliance declaration for 2026-27 admission cycle is pending institutional registrar digital sign-off.',
      targetRoute: '/institutions',
    },
    {
      id: 'alt-5',
      alertType: 'Student Information Mismatch',
      institutionId: 'inst-1',
      institutionName: 'ABC Engineering College',
      programme: 'Artificial Intelligence and Data Science',
      timestamp: '2026-10-27 16:12 IST',
      severity: 'Low',
      description:
        'Student record 222109 contains an invalid leading-zero APAAR format (XXXX-XXXX-0099) flagged by validation engine.',
      targetRoute: '/apaar-validation',
    },
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'aud-1',
      actionId: 'ACT-2026-9001',
      userName: 'Dr. Rajeshwar Varma',
      userRole: UserRole.AICTE_ADMIN,
      action: 'Central Repository Integrity Audit',
      entityReference: 'CYCLE-2026-27',
      timestamp: '2026-10-30 08:15 IST',
      status: 'Success',
      details: 'Executed automated HMAC-SHA256 cross-institutional duplicate scan across 6 institutions.',
    },
    {
      id: 'aud-2',
      actionId: 'ACT-2026-9002',
      userName: 'Prof. Meenakshi Iyer',
      userRole: UserRole.INSTITUTE_ADMIN,
      action: 'Digital Credential Issuance (Ed25519)',
      entityReference: 'CRED-APAAR-2026-221901',
      timestamp: '2026-10-29 16:40 IST',
      status: 'Success',
      details: 'Generated Ed25519-signed student verification credential for Student ID 221901 (APAAR XXXX-XXXX-9012).',
    },
    {
      id: 'aud-3',
      actionId: 'ACT-2026-9003',
      userName: 'System Validation Engine',
      userRole: UserRole.AICTE_ADMIN,
      action: 'Duplicate Identity Flagged',
      entityReference: 'DUP-2026-1042',
      timestamp: '2026-10-29 14:22 IST',
      status: 'Flagged',
      details: 'Detected matching HMAC token between 221901 (AICTE-DL-101) and IIT-MH-2604 (AICTE-MH-204).',
    },
    {
      id: 'aud-4',
      actionId: 'ACT-2026-9004',
      userName: 'Rahul Sharma',
      userRole: UserRole.STUDENT,
      action: 'Consent Approved for Verification',
      entityReference: 'con-req-1',
      timestamp: '2026-10-28 15:30 IST',
      status: 'Success',
      details: 'Approved disclosure of academic enrolment credential to BharatTech Global Solutions Ltd.',
    },
    {
      id: 'aud-5',
      actionId: 'ACT-2026-9005',
      userName: 'Vikramaditya Sen',
      userRole: UserRole.VERIFIER,
      action: 'Credential Signature Verification',
      entityReference: 'CRED-APAAR-2026-221901',
      timestamp: '2026-10-28 15:42 IST',
      status: 'Success',
      details: 'Verified Ed25519 signature and active student consent for CRED-APAAR-2026-221901.',
    },
  ];

  const integrations: SystemIntegration[] = [
    {
      id: 'int-aicte',
      systemName: 'AICTE Approval & EoA Portal',
      purpose: 'Synchronizes institutional Extension of Approval (EoA), approved programme intake, and supernumerary seat ceilings.',
      connectionStatus: 'Connected to Sandbox',
      integrationType: 'REST JSON Adapter (v2 Sandbox)',
      lastSync: '2026-10-30 08:00 IST',
      endpointPattern: 'POST /api/v1/sandbox/aicte/eoa-intake-sync',
      protocol: 'mTLS 1.3 + OAuth2 Client Credentials (Simulated)',
    },
    {
      id: 'int-apaar',
      systemName: 'APAAR Central Identity Registry',
      purpose: 'Performs privacy-preserving HMAC-SHA256 token verification and synthetic 12-digit academic identity status lookup.',
      connectionStatus: 'Demo Connector',
      integrationType: 'HMAC-SHA256 Token Gateway',
      lastSync: '2026-10-30 08:12 IST',
      endpointPattern: 'POST /api/v1/sandbox/apaar/token-verify',
      protocol: 'Zero-Plaintext HMAC-SHA256 Challenge',
    },
    {
      id: 'int-abc',
      systemName: 'Academic Bank of Credits (ABC / NAD)',
      purpose: 'Links verified institution admission seat records with semester credit accumulation accounts.',
      connectionStatus: 'Connected to Sandbox',
      integrationType: 'Webhook & Batch Sync Adapter',
      lastSync: '2026-10-29 22:00 IST',
      endpointPattern: 'GET /api/v1/sandbox/abc/credit-ledger/{studentToken}',
      protocol: 'OpenAPI 3.1 Sandbox Connector',
    },
    {
      id: 'int-digilocker',
      systemName: 'DigiLocker Verifiable Credentials',
      purpose: 'Publishes Ed25519-signed W3C/QR student admission credentials to citizen digital wallet.',
      connectionStatus: 'Pending Authorization',
      integrationType: 'W3C Verifiable Credential Issuer API',
      lastSync: '2026-10-25 14:15 IST',
      endpointPattern: 'POST /api/v1/sandbox/digilocker/pull-uri',
      protocol: 'Ed25519 Digital Signature + XML/JSON Schema',
    },
    {
      id: 'int-erp',
      systemName: 'Institutional ERP & Counseling Systems',
      purpose: 'Ingests standardized student admission records via CSV Bulk Upload or institutional REST webhook.',
      connectionStatus: 'Not Connected',
      integrationType: 'CSV / Webhook Ingestion Bridge',
      lastSync: 'Manual CSV Active',
      endpointPattern: 'POST /api/students/bulk-upload',
      protocol: 'HTTPS Bearer JWT + Schema Validator',
    },
  ];

  return {
    users,
    institutions,
    programmes,
    students,
    duplicates,
    credentials,
    consentRequests,
    verificationLogs,
    auditLogs,
    alerts,
    integrations,
    publicKeyPem,
  };
}
