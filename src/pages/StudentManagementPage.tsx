import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import {
  Users,
  Plus,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileEdit,
  Beaker,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import {
  AdmissionCategory,
  AdmissionStatus,
  UserRole,
  ValidationStatus,
} from '../types/domain';
import { maskApaarId, validateApaarFormat } from '../lib/engine';

export const StudentManagementPage: React.FC<{ repositoryView?: boolean }> = ({
  repositoryView = false,
}) => {
  const {
    user,
    institutions,
    programmes,
    students,
    seatLedger,
    registerStudent,
    updateStudent,
    notify,
  } = usePlatform();

  const isAicte = user?.role === UserRole.AICTE_ADMIN;

  // Registration Form State
  const [showForm, setShowForm] = useState(!repositoryView);
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [rawApaarId, setRawApaarId] = useState('');
  const [dob, setDob] = useState('2005-05-14');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [institutionId, setInstitutionId] = useState(
    user?.institutionId || institutions[0]?.id || 'inst-1'
  );
  const availableProgrammes = useMemo(
    () => programmes.filter((p) => p.institutionId === institutionId),
    [programmes, institutionId]
  );
  const [programmeId, setProgrammeId] = useState(availableProgrammes[0]?.id || 'prog-1');
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [admissionDate, setAdmissionDate] = useState('2026-08-28');
  const [admissionCategory, setAdmissionCategory] = useState<AdmissionCategory>(
    AdmissionCategory.GENERAL
  );
  const [lastOutcomeBanner, setLastOutcomeBanner] = useState<{
    title: string;
    detail: string;
    status: ValidationStatus;
    admissionStatus: AdmissionStatus;
  } | null>(null);

  // Sync programme when institution changes
  const handleInstitutionChange = (newInstId: string) => {
    setInstitutionId(newInstId);
    const progs = programmes.filter((p) => p.institutionId === newInstId);
    if (progs.length > 0) setProgrammeId(progs[0].id);
  };

  const selectedInstitution = institutions.find((i) => i.id === institutionId);
  const selectedProgramme = programmes.find((p) => p.id === programmeId);
  const selectedSeatLedger = seatLedger.find((l) => l.programmeId === programmeId);

  const liveApaarPreview = useMemo(() => validateApaarFormat(rawApaarId), [rawApaarId]);

  const handleResetForm = () => {
    setFullName('');
    setStudentId('');
    setRawApaarId('');
    setDob('2005-05-14');
    setGender('Male');
    setAdmissionCategory(AdmissionCategory.GENERAL);
    setLastOutcomeBanner(null);
  };

  // Preset Scenarios for SIH Judges
  const applyTestScenario = (scenario: 'TEST1_DUP' | 'TEST2_EXCESS' | 'TEST3_MISSING' | 'VALID') => {
    setShowForm(true);
    if (scenario === 'TEST1_DUP') {
      // Register Rahul Sharma's APAAR (123456789012) into College B (or same college)
      const targetInst = isAicte ? 'inst-2' : institutionId;
      const targetProg =
        programmes.find((p) => p.institutionId === targetInst)?.id || programmeId;
      setInstitutionId(targetInst);
      setProgrammeId(targetProg);
      setFullName('Rahul Sharma');
      setStudentId('TEST-DUP-901');
      setRawApaarId('123456789012');
      setDob('2005-04-14');
      setAdmissionCategory(AdmissionCategory.GENERAL);
      notify(
        'Loaded TEST 1: Duplicate Student',
        'Pre-filled synthetic APAAR 123456789012 (already registered at ABC Engineering College). Click "Save Student" to test Duplicate Shield.',
        'info'
      );
    } else if (scenario === 'TEST2_EXCESS') {
      // ABC Engineering College CSE has 60/60 regular seats occupied
      setInstitutionId('inst-1');
      setProgrammeId('prog-1');
      setFullName('Vikramaditya Rao');
      setStudentId('221965');
      setRawApaarId('812345678909');
      setDob('2005-07-19');
      setAdmissionCategory(AdmissionCategory.GENERAL);
      notify(
        'Loaded TEST 2: Excess Admission (61st Regular Seat)',
        'Computer Science & Engineering at ABC Engineering College is at 60/60 Regular Intake. Click "Save Student" to trigger Excess Capacity Flag.',
        'info'
      );
    } else if (scenario === 'TEST3_MISSING') {
      setInstitutionId('inst-1');
      setProgrammeId('prog-2');
      setFullName('Kavita Subramanian');
      setStudentId('222150');
      setRawApaarId('');
      setDob('2005-10-03');
      setAdmissionCategory(AdmissionCategory.GENERAL);
      notify(
        'Loaded TEST 3: Missing APAAR ID',
        'APAAR ID left blank. Click "Save Student" to verify routing to the Exception Queue.',
        'info'
      );
    } else {
      // Valid student in Electronics & Communication (prog-2 has open seats)
      setInstitutionId('inst-1');
      setProgrammeId('prog-2');
      const randId = Math.floor(100000000000 + Math.random() * 800000000000);
      setFullName('Ishaan Chatterjee');
      setStudentId(`222${Math.floor(200 + Math.random() * 700)}`);
      setRawApaarId(String(randId));
      setDob('2005-03-21');
      setAdmissionCategory(AdmissionCategory.GENERAL);
      notify(
        'Loaded Valid Student Preset',
        'Pre-filled valid 12-digit APAAR ID in Electronics & Communication Engineering (seats available).',
        'info'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    if (!fullName.trim() || !studentId.trim()) {
      notify('Validation Error', 'Student Full Name and Student ID are required.', 'error');
      return;
    }

    try {
      const res = await registerStudent({
        studentId,
        fullName,
        dob,
        gender,
        rawApaarId,
        institutionId,
        programmeId,
        academicYear,
        admissionDate,
        admissionCategory,
        saveAsDraft,
      });

      const out = res.outcome;
      setLastOutcomeBanner({
        title: `Submission Processed: ${out.validationStatus} · Admission: ${out.admissionStatus}`,
        detail:
          out.validationReason ||
          `Student ${res.student.fullName} (${res.student.maskedApaarId}) verified and confirmed in Live Seat Ledger.`,
        status: out.validationStatus,
        admissionStatus: out.admissionStatus,
      });

      if (out.validationStatus === ValidationStatus.VERIFIED) {
        notify(
          'Student Verified & Confirmed',
          `${res.student.fullName} registered with Ed25519 credential issued.`,
          'success'
        );
      } else {
        notify(
          `Flagged: ${out.validationStatus}`,
          out.validationReason || 'Placed in Exception Queue for review.',
          'warning'
        );
      }
    } catch (err) {
      notify('Submission Failed', err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  // Repository Table Filters & Pagination
  const [search, setSearch] = useState('');
  const [instFilter, setInstFilter] = useState('ALL');
  const [progFilter, setProgFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [valFilter, setValFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Quick Inline Apaar Fix Modal
  const [fixingRecordId, setFixingRecordId] = useState<string | null>(null);
  const [fixApaarValue, setFixApaarValue] = useState('');

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.studentId.toLowerCase().includes(search.toLowerCase()) ||
        s.maskedApaarId.toLowerCase().includes(search.toLowerCase()) ||
        s.institutionName.toLowerCase().includes(search.toLowerCase());
      const matchesInst = instFilter === 'ALL' || s.institutionId === instFilter;
      const matchesProg = progFilter === 'ALL' || s.programmeId === progFilter;
      const matchesYear = yearFilter === 'ALL' || s.academicYear === yearFilter;
      const matchesVal = valFilter === 'ALL' || s.validationStatus === valFilter;
      return matchesSearch && matchesInst && matchesProg && matchesYear && matchesVal;
    });
  }, [students, search, instFilter, progFilter, yearFilter, valFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize);

  const handleExportCsv = () => {
    const exportData = filteredStudents.map((s) => ({
      StudentID: s.studentId,
      FullName: s.fullName,
      MaskedAPAAR: s.maskedApaarId,
      InstitutionCode: s.institutionCode,
      InstitutionName: s.institutionName,
      Programme: s.programmeName,
      AcademicYear: s.academicYear,
      Category: s.admissionCategory,
      AdmissionStatus: s.admissionStatus,
      ValidationStatus: s.validationStatus,
      VerificationStatus: s.verificationStatus,
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apaar_setu_students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify('CSV Exported', `Exported ${exportData.length} student records.`, 'success');
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            {repositoryView
              ? 'Central Student Repository'
              : 'Student Data Management & Registration'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {repositoryView
              ? 'National AICTE repository with privacy-masked APAAR identifiers, validation statuses, and CSV export.'
              : 'Register student admissions with automated HMAC-SHA256 duplicate checks and live seat capacity validation.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showForm ? 'Hide Registration Form' : 'New Student Registration'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Interactive SIH Test Case Presets Bar */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Beaker className="w-4 h-4 text-teal-700" />
              <span>SIH Judge One-Click Test Scenarios:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyTestScenario('TEST1_DUP')}
                className="px-3 py-1.5 text-xs font-medium text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
              >
                TEST 1: Duplicate Student (123456789012)
              </button>
              <button
                type="button"
                onClick={() => applyTestScenario('TEST2_EXCESS')}
                className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
              >
                TEST 2: Excess Admission (60/60 Full Intake)
              </button>
              <button
                type="button"
                onClick={() => applyTestScenario('TEST3_MISSING')}
                className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                TEST 3: Missing APAAR ID
              </button>
              <button
                type="button"
                onClick={() => applyTestScenario('VALID')}
                className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              >
                Load Valid Student Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Last Submission Outcome Banner */}
      {lastOutcomeBanner && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
            lastOutcomeBanner.status === ValidationStatus.VERIFIED
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-3">
            {lastOutcomeBanner.status === ValidationStatus.VERIFIED ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-sm font-bold">{lastOutcomeBanner.title}</div>
              <p className="text-xs mt-1 leading-relaxed">{lastOutcomeBanner.detail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastOutcomeBanner(null)}
            className="text-xs font-medium underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Complete Student Registration Form */}
      {showForm && (
        <form
          onSubmit={(e) => handleSubmit(e, false)}
          className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6"
        >
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Student Enrolment & APAAR Verification Form
              </h2>
              <p className="text-xs text-slate-500">
                Incomplete or invalid APAAR records cannot be saved as confirmed verified admissions; they are routed to the Exception Queue.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Synthetic Demo Data Only
            </span>
          </div>

          {/* 1. PERSONAL INFORMATION */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              1. Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="stu-fullname"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Student Full Name *
                </label>
                <input
                  id="stu-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Rahul Sharma"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="stu-id"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Student ID / Enrolment No. *
                </label>
                <input
                  id="stu-id"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g., 221901"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="stu-dob"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Date of Birth *
                </label>
                <input
                  id="stu-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="stu-gender"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Gender
                </label>
                <select
                  id="stu-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. ACADEMIC INFORMATION */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              2. Academic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="stu-inst"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Institution ({selectedInstitution?.code || 'AICTE'})
                </label>
                <select
                  id="stu-inst"
                  value={institutionId}
                  disabled={!isAicte}
                  onChange={(e) => handleInstitutionChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg disabled:bg-slate-100"
                >
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="stu-prog"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Programme / Course *
                </label>
                <select
                  id="stu-prog"
                  value={programmeId}
                  onChange={(e) => setProgrammeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  {availableProgrammes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="stu-year"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Academic Year
                </label>
                <select
                  id="stu-year"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                >
                  <option value="2026-27">2026-27</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2024-25">2024-25</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="stu-admdate"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Admission Date
                </label>
                <input
                  id="stu-admdate"
                  type="date"
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* 3. ADMISSION CATEGORY & SEAT LEDGER PREVIEW */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              3. Admission Category & Live Seat Ledger Check
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-4">
                <label
                  htmlFor="stu-cat"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Admission Category *
                </label>
                <select
                  id="stu-cat"
                  value={admissionCategory}
                  onChange={(e) => setAdmissionCategory(e.target.value as AdmissionCategory)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  {Object.values(AdmissionCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSeatLedger && (
                <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-500">Approved Intake</div>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">
                      {selectedSeatLedger.actualRegularEnrolment} / {selectedSeatLedger.approvedIntake} ({selectedSeatLedger.regularStatus})
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Supernumerary Quota</div>
                    <div className="font-mono font-bold text-teal-800 mt-0.5">
                      {selectedSeatLedger.actualSupernumeraryEnrolment} / {selectedSeatLedger.supernumerarySeats}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Total Occupancy</div>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">
                      {selectedSeatLedger.totalOccupied} / {selectedSeatLedger.totalAuthorizedCapacity}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Seat Type Selected</div>
                    <div className="font-semibold text-blue-950 mt-0.5">
                      {admissionCategory === AdmissionCategory.GENERAL
                        ? 'Regular Approved Seat'
                        : 'Supernumerary Quota Seat'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. APAAR INFORMATION & PRIVACY TOKENIZATION */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              4. APAAR Academic Identity Information
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-5">
                <label
                  htmlFor="stu-apaar"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  12-Digit Synthetic APAAR ID
                </label>
                <input
                  id="stu-apaar"
                  type="text"
                  maxLength={14}
                  value={rawApaarId}
                  onChange={(e) => setRawApaarId(e.target.value)}
                  placeholder="e.g., 123456789012 (Leave empty to test Exception Queue)"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  Stored as masked <code className="font-mono">{maskApaarId(rawApaarId)}</code> + server-side HMAC-SHA256 token.
                </div>
              </div>

              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    Pre-Submission Format Check:
                  </span>
                  <span
                    className={`font-bold ${
                      liveApaarPreview.valid ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {liveApaarPreview.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  {liveApaarPreview.valid
                    ? 'Format valid (12 digits). Server will perform HMAC-SHA256 Duplicate Shield and Live Seat Ledger checks on submission.'
                    : `${liveApaarPreview.reason} Submitting this record will route it to the APAAR Validation Exception Queue rather than confirming the seat.`}
                </p>
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleResetForm}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Form</span>
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
            >
              Save Student
            </button>
          </div>
        </form>
      )}

      {/* Student Repository / Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isAicte ? 'National Student Records Repository' : 'Institutional Student Records'}
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filteredStudents.length} records · Full APAAR numbers are masked in compliance with privacy guidelines
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ID, name, APAAR..."
                aria-label="Search student repository"
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>

            {isAicte && (
              <select
                value={instFilter}
                onChange={(e) => {
                  setInstFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by institution"
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="ALL">All Institutions</option>
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={progFilter}
              onChange={(e) => {
                setProgFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter repository by programme"
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="ALL">All Programmes</option>
              {programmes
                .filter((p) => instFilter === 'ALL' || p.institutionId === instFilter)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.institutionCode})
                  </option>
                ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter repository by academic year"
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="ALL">All Years</option>
              <option value="2026-27">2026-27</option>
              <option value="2025-26">2025-26</option>
              <option value="2024-25">2024-25</option>
            </select>

            <select
              value={valFilter}
              onChange={(e) => {
                setValFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter repository by validation status"
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="ALL">All Validation Statuses</option>
              {Object.values(ValidationStatus).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Masked APAAR ID</th>
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Programme</th>
                <th className="py-3 px-4">Academic Year</th>
                <th className="py-3 px-4">Admission Status</th>
                <th className="py-3 px-4">Validation Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {paginatedStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                    {s.studentId}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <div>{s.fullName}</div>
                    <div className="text-[11px] text-slate-500">{s.admissionCategory}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">{s.maskedApaarId}</td>
                  <td className="py-3 px-4 text-slate-700">
                    <div>{s.institutionName}</div>
                    <div className="text-[11px] font-mono text-slate-500">{s.institutionCode}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{s.programmeName}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{s.academicYear}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-medium ${
                        s.admissionStatus === AdmissionStatus.CONFIRMED
                          ? 'text-emerald-700'
                          : s.admissionStatus === AdmissionStatus.EXCESS_FLAGGED
                          ? 'text-red-700 font-semibold'
                          : 'text-amber-700'
                      }`}
                    >
                      {s.admissionStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold ${
                        s.validationStatus === ValidationStatus.VERIFIED
                          ? 'text-emerald-700'
                          : s.validationStatus === ValidationStatus.MISSING_APAAR
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {s.validationStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setFixingRecordId(s.id);
                        setFixApaarValue(s.rawApaarDemo || '');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-900 hover:bg-blue-50 border border-slate-200 rounded-md"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>{s.validationStatus === ValidationStatus.VERIFIED ? 'Edit' : 'Resolve'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredStudents.length)} of {filteredStudents.length} records
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-white border border-slate-300 rounded-md disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-white border border-slate-300 rounded-md disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Resolve / Update APAAR Modal */}
      {fixingRecordId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl"
          >
            <h3 className="text-base font-bold text-slate-900">
              Update & Revalidate Student APAAR ID
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Enter a valid 12-digit synthetic APAAR ID (non-zero first digit) to clear Missing/Invalid Format exceptions.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                12-Digit Synthetic APAAR ID
              </label>
              <input
                type="text"
                value={fixApaarValue}
                onChange={(e) => setFixApaarValue(e.target.value)}
                placeholder="e.g., 789012345678"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFixingRecordId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await updateStudent(fixingRecordId, { rawApaarId: fixApaarValue });
                    setFixingRecordId(null);
                    notify('Record Revalidated', 'Student record re-evaluated by APAAR Validation Engine.', 'success');
                  } catch (err) {
                    notify('Error', err instanceof Error ? err.message : 'Failed', 'error');
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 rounded-lg"
              >
                Revalidate & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
