import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  CopyCheck,
  Scale,
  Plus,
  UploadCloud,
  FileSpreadsheet,
  ArrowUpRight,
  Search,
  ShieldCheck,
  QrCode,
  Award,
  UserCheck,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import {
  AdmissionStatus,
  StudentRecord,
  UserRole,
  ValidationStatus,
} from '../types/domain';
import { APAAR_SETU_LOGO } from '../components/Layout';

const CHART_COLORS = ['#08204B', '#F5821F', '#138808', '#C81E1E'];

export const DashboardsPage: React.FC = () => {
  const { user } = usePlatform();

  if (!user) return null;

  if (user.role === UserRole.AICTE_ADMIN) {
    return <AicteCentralDashboard />;
  }
  if (user.role === UserRole.INSTITUTE_ADMIN) {
    return <InstituteAdminDashboard />;
  }
  if (user.role === UserRole.STUDENT) {
    return <StudentDashboardSummary />;
  }
  return <VerifierDashboardSummary />;
};

const AicteCentralDashboard: React.FC = () => {
  const {
    institutions,
    students,
    seatLedger,
    duplicates,
    alerts,
  } = usePlatform();
  const navigate = useNavigate();

  const [instSearch, setInstSearch] = useState('');
  const [integrityFilter, setIntegrityFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Dynamic KPIs
  const totalInstitutions = institutions.length;
  const totalApprovedIntake = seatLedger.reduce((acc, s) => acc + s.approvedIntake, 0);
  const totalSupernumerarySeats = seatLedger.reduce((acc, s) => acc + s.supernumerarySeats, 0);
  const totalEnrolment = students.filter(
    (s) => s.admissionStatus !== AdmissionStatus.WITHDRAWN && s.admissionStatus !== AdmissionStatus.DRAFT
  ).length;
  const duplicateRecordsCount = duplicates.filter(
    (d) => d.reviewStatus !== 'Resolved - Legitimate Transfer'
  ).length;
  const pendingValidationCount = students.filter(
    (s) => s.validationStatus !== ValidationStatus.VERIFIED
  ).length;

  // Chart A: Enrolment across Academic Years
  const yearChartData = useMemo(() => {
    const years = ['2024-25', '2025-26', '2026-27'];
    return years.map((yr) => {
      const yrStudents = students.filter((s) => s.academicYear === yr);
      return {
        year: yr,
        Verified: yrStudents.filter((s) => s.validationStatus === ValidationStatus.VERIFIED).length,
        Exceptions: yrStudents.filter((s) => s.validationStatus !== ValidationStatus.VERIFIED).length,
      };
    });
  }, [students]);

  // Chart B: Institution-wise Enrolment vs Intake
  const instChartData = useMemo(() => {
    return institutions.map((inst) => {
      const instLedger = seatLedger.filter((l) => l.institutionId === inst.id);
      const intake = instLedger.reduce((a, b) => a + b.approvedIntake, 0);
      const enrolled = students.filter(
        (s) => s.institutionId === inst.id && s.admissionStatus !== AdmissionStatus.WITHDRAWN
      ).length;
      return {
        name: inst.code.replace('AICTE-', ''),
        fullName: inst.name,
        Intake: intake,
        Enrolled: enrolled,
      };
    });
  }, [institutions, seatLedger, students]);

  // Chart C: Admission Validation Status Donut
  const statusDonutData = useMemo(() => {
    const verified = students.filter((s) => s.validationStatus === ValidationStatus.VERIFIED).length;
    const pendingOrMissing = students.filter(
      (s) =>
        s.validationStatus === ValidationStatus.PENDING ||
        s.validationStatus === ValidationStatus.MISSING_APAAR
    ).length;
    const flaggedOrDup = students.filter(
      (s) =>
        s.validationStatus === ValidationStatus.DUPLICATE_DETECTED ||
        s.validationStatus === ValidationStatus.INVALID_FORMAT ||
        s.validationStatus === ValidationStatus.FLAGGED
    ).length;
    return [
      { name: 'Verified (Demo)', value: verified },
      { name: 'Pending / Missing APAAR', value: pendingOrMissing },
      { name: 'Flagged / Duplicate', value: flaggedOrDup },
    ];
  }, [students]);

  // Chart D: Seat Utilization Summary
  const totalRegularOccupied = seatLedger.reduce((a, b) => a + b.actualRegularEnrolment, 0);
  const totalSuperOccupied = seatLedger.reduce((a, b) => a + b.actualSupernumeraryEnrolment, 0);
  const totalRemainingRegular = Math.max(0, totalApprovedIntake - totalRegularOccupied);

  // Top Performing Institutions table rows
  const institutionRows = useMemo(() => {
    return institutions
      .map((inst) => {
        const instLedger = seatLedger.filter((l) => l.institutionId === inst.id);
        const approved = instLedger.reduce((a, b) => a + b.approvedIntake, 0);
        const instStudents = students.filter((s) => s.institutionId === inst.id);
        const enrolled = instStudents.length;
        const verified = instStudents.filter(
          (s) => s.validationStatus === ValidationStatus.VERIFIED
        ).length;
        const utilPct = approved > 0 ? Math.round((enrolled / approved) * 100) : 0;
        return {
          ...inst,
          approved,
          enrolled,
          verified,
          utilPct,
        };
      })
      .filter((row) => {
        const matchesSearch =
          row.name.toLowerCase().includes(instSearch.toLowerCase()) ||
          row.code.toLowerCase().includes(instSearch.toLowerCase()) ||
          row.state.toLowerCase().includes(instSearch.toLowerCase());
        const matchesFilter =
          integrityFilter === 'ALL' || row.integrityStatus === integrityFilter;
        return matchesSearch && matchesFilter;
      });
  }, [institutions, seatLedger, students, instSearch, integrityFilter]);

  const totalPages = Math.max(1, Math.ceil(institutionRows.length / pageSize));
  const paginatedInstitutions = institutionRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-8">
      {/* Sovereign Masthead & Action Header */}
      <div className="bg-white border border-slate-300 border-t-4 border-t-[#08204B] rounded-md p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={APAAR_SETU_LOGO}
            alt="APAAR Setu Emblem"
            className="w-14 h-14 object-contain rounded-md bg-[#F6F4EF] border border-slate-200 p-1 shrink-0"
          />
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#C45500] font-semibold">
              All India Council for Technical Education · Central Command
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#08204B]">
              AICTE Central Monitoring Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              National APAAR identity registry, live sanctioned seat ledger, and cross-institution duplicate oversight.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/duplicate-shield')}
            className="px-4 py-2 text-xs font-semibold text-slate-800 bg-[#F6F4EF] border border-slate-300 rounded-md hover:bg-slate-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            Inspect Duplicate Shield ({duplicateRecordsCount})
          </button>
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#08204B] border-b-2 border-[#F5821F] rounded-md hover:bg-[#0B2E6B] transition-colors whitespace-nowrap cursor-pointer"
          >
            Export National Reports
          </button>
        </div>
      </div>

      {/* 6 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 border-t-2 border-t-[#08204B] rounded-md p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>Total Institutions</span>
            <Building2 className="w-4 h-4 text-[#08204B]" />
          </div>
          <div className="text-2xl font-bold text-[#08204B] mt-2 font-mono tabular-nums">
            {totalInstitutions}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            6 States · 10 Approved Programmes
          </div>
        </div>

        <div className="bg-white border border-slate-200 border-t-2 border-t-[#0066CC] rounded-md p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>Total Approved Intake</span>
            <Scale className="w-4 h-4 text-[#0066CC]" />
          </div>
          <div className="text-2xl font-bold text-[#08204B] mt-2 font-mono tabular-nums">
            {totalApprovedIntake}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Regular Sanctioned Ceiling
          </div>
        </div>

        <div className="bg-white border border-slate-200 border-t-2 border-t-[#138808] rounded-md p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>Total Student Enrolment</span>
            <Users className="w-4 h-4 text-[#138808]" />
          </div>
          <div className="text-2xl font-bold text-[#08204B] mt-2 font-mono tabular-nums">
            {totalEnrolment}
          </div>
          <div className="text-[11px] text-[#0F6E06] font-semibold mt-1 tabular-nums">
            {Math.round((totalEnrolment / Math.max(1, totalApprovedIntake)) * 100)}% Overall Occupancy
          </div>
        </div>

        <div className="bg-white border border-slate-200 border-t-2 border-t-[#138808] rounded-md p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>Supernumerary Seats</span>
            <Award className="w-4 h-4 text-[#138808]" />
          </div>
          <div className="text-2xl font-bold text-[#08204B] mt-2 font-mono tabular-nums">
            {totalSuperOccupied} / {totalSupernumerarySeats}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            NRI · OCI · FN · PMSSS Quota
          </div>
        </div>

        <div className="bg-white border border-slate-200 border-t-2 border-t-red-600 rounded-md p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>Duplicate Records</span>
            <CopyCheck className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600 mt-2 font-mono tabular-nums">
            {duplicateRecordsCount}
          </div>
          <div className="text-[11px] text-red-700 font-semibold mt-1">
            Cross-Institute HMAC Alerts
          </div>
        </div>

        <div className="bg-white border border-slate-200 border-t-2 border-t-[#F5821F] rounded-md p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>Pending Validation</span>
            <AlertTriangle className="w-4 h-4 text-[#E66A00]" />
          </div>
          <div className="text-2xl font-bold text-[#C45500] mt-2 font-mono tabular-nums">
            {pendingValidationCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            In Exception Queue
          </div>
        </div>
      </div>

      {/* 4 Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A. Student Enrolment Overview */}
        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Student Enrolment Overview
              </h2>
              <p className="text-xs text-slate-500">
                Verified vs Exception Queue records across academic years (Synthetic Sample Data)
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearChartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDD7C9" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Verified" fill="#08204B" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Exceptions" fill="#F5821F" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* B. Institution-wise Enrolment */}
        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Institution-wise Enrolment vs Intake
              </h2>
              <p className="text-xs text-slate-500">
                Approved regular intake ceiling compared to actual enrolled students
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={instChartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDD7C9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Intake" fill="#C6BEB0" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Enrolled" fill="#138808" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* C. Admission Status Donut Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">
              APAAR Validation & Admission Status
            </h2>
            <p className="text-xs text-slate-500">
              Distribution of Verified, Pending/Missing, and Flagged/Duplicate records
            </p>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusDonutData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* D. Seat Utilization Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              National Seat Utilization Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Separate tracking for Approved Regular Intake and Configured Supernumerary Seats
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-700">Regular Approved Intake Occupancy</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {totalRegularOccupied} / {totalApprovedIntake} Seats ({Math.round((totalRegularOccupied / Math.max(1, totalApprovedIntake)) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-900 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((totalRegularOccupied / Math.max(1, totalApprovedIntake)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-700">Supernumerary Quota Occupancy (NRI / OCI / FN)</span>
                  <span className="font-mono font-semibold text-teal-800 tabular-nums">
                    {totalSuperOccupied} / {totalSupernumerarySeats} Seats ({Math.round((totalSuperOccupied / Math.max(1, totalSupernumerarySeats)) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((totalSuperOccupied / Math.max(1, totalSupernumerarySeats)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <div className="p-3 rounded-lg bg-slate-50">
                  <div className="text-[11px] text-slate-500">Approved Intake</div>
                  <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                    {totalApprovedIntake}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <div className="text-[11px] text-slate-500">Occupied Regular</div>
                  <div className="text-lg font-bold text-blue-950 font-mono tabular-nums mt-0.5">
                    {totalRegularOccupied}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <div className="text-[11px] text-slate-500">Remaining Regular</div>
                  <div className="text-lg font-bold text-teal-700 font-mono tabular-nums mt-0.5">
                    {totalRemainingRegular}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              ABC Engineering College CSE Regular Intake: <strong className="text-slate-800">60/60 (FULL)</strong>
            </span>
            <button
              type="button"
              onClick={() => navigate('/seat-ledger')}
              className="font-semibold text-blue-900 hover:underline flex items-center gap-1"
            >
              <span>Open Live Seat Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Alerts Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Alerts</h2>
            <p className="text-xs text-slate-500">
              Automated validation, duplicate identity, and seat capacity triggers across AICTE institutions
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {alerts.length} Active Alerts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Alert Type</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Programme</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div>{alert.alertType}</div>
                    <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                      {alert.description}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">{alert.institutionName}</td>
                  <td className="py-3.5 px-4 text-slate-600">{alert.programme}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono tabular-nums whitespace-nowrap">
                    {alert.timestamp}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-semibold ${
                        alert.severity === 'Critical'
                          ? 'text-red-700'
                          : alert.severity === 'High'
                          ? 'text-amber-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => navigate(alert.targetRoute)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-50 border border-slate-200 rounded-md transition-colors"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Performing Institutions Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Top Performing Institutions
            </h2>
            <p className="text-xs text-slate-500">
              Institutional intake utilization, APAAR verification rate, and compliance status
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={instSearch}
                onChange={(e) => {
                  setInstSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search institution or code..."
                aria-label="Search institutions"
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <select
              value={integrityFilter}
              onChange={(e) => {
                setIntegrityFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by integrity status"
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="ALL">All Integrity Statuses</option>
              <option value="Compliant">Compliant</option>
              <option value="Action Required">Action Required</option>
              <option value="Under Audit">Under Audit</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4 text-right">Approved Intake</th>
                <th className="py-3 px-4 text-right">Actual Enrolment</th>
                <th className="py-3 px-4 text-right">Seat Utilization</th>
                <th className="py-3 px-4 text-right">Verified Records</th>
                <th className="py-3 px-4">Integrity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {paginatedInstitutions.map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div>{inst.name}</div>
                    <div className="text-[11px] font-normal text-slate-500">
                      {inst.district}, {inst.state} · {inst.type}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">{inst.code}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {inst.approved}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {inst.enrolled}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-teal-800 font-medium">
                    {inst.utilPct}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                    {inst.verified} / {inst.enrolled}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-medium ${
                        inst.integrityStatus === 'Compliant'
                          ? 'text-emerald-700'
                          : inst.integrityStatus === 'Action Required'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {inst.integrityStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing {paginatedInstitutions.length} of {institutionRows.length} institutions
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 border border-slate-300 bg-white rounded-md disabled:opacity-40"
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
              className="px-2.5 py-1 border border-slate-300 bg-white rounded-md disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InstituteAdminDashboard: React.FC = () => {
  const {
    user,
    students,
    seatLedger,
    programmes,
    updateStudent,
    notify,
  } = usePlatform();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [progFilter, setProgFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [editApaarInput, setEditApaarInput] = useState('');
  const [editNameInput, setEditNameInput] = useState('');

  const approvedIntake = seatLedger.reduce((a, b) => a + b.approvedIntake, 0);
  const supernumerarySeats = seatLedger.reduce((a, b) => a + b.supernumerarySeats, 0);
  const actualRegular = seatLedger.reduce((a, b) => a + b.actualRegularEnrolment, 0);
  const actualSuper = seatLedger.reduce((a, b) => a + b.actualSupernumeraryEnrolment, 0);
  const actualTotal = actualRegular + actualSuper;
  const availableSeats = seatLedger.reduce((a, b) => a + b.availableTotalCapacity, 0);

  const verifiedCount = students.filter(
    (s) => s.validationStatus === ValidationStatus.VERIFIED
  ).length;
  const pendingCount = students.filter(
    (s) =>
      s.validationStatus === ValidationStatus.PENDING ||
      s.validationStatus === ValidationStatus.MISSING_APAAR
  ).length;
  const flaggedCount = students.filter(
    (s) =>
      s.validationStatus === ValidationStatus.FLAGGED ||
      s.validationStatus === ValidationStatus.INVALID_FORMAT ||
      s.validationStatus === ValidationStatus.DUPLICATE_DETECTED
  ).length;

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.studentId.toLowerCase().includes(search.toLowerCase()) ||
        s.maskedApaarId.toLowerCase().includes(search.toLowerCase());
      const matchesProg = progFilter === 'ALL' || s.programmeId === progFilter;
      const matchesYear = yearFilter === 'ALL' || s.academicYear === yearFilter;
      const matchesStatus = statusFilter === 'ALL' || s.validationStatus === statusFilter;
      return matchesSearch && matchesProg && matchesYear && matchesStatus;
    });
  }, [students, search, progFilter, yearFilter, statusFilter]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await updateStudent(editingStudent.id, {
        fullName: editNameInput,
        rawApaarId: editApaarInput,
      });
      notify(
        'Student Record Revalidated',
        `Updated ${editNameInput} (${editingStudent.studentId}).`,
        'success'
      );
      setEditingStudent(null);
    } catch (err) {
      notify('Update Failed', err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Institution Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {user?.institutionName || 'ABC Engineering College'} (AICTE Code: AICTE-DL-101) · Institutional Admission & APAAR Management
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/students')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/bulk-upload')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-blue-900" />
            <span>Upload CSV</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/students')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-teal-700" />
            <span>View Students</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/duplicate-shield')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <CopyCheck className="w-4 h-4 text-red-600" />
            <span>Check Duplicate Records</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
            <span>Generate Reports</span>
          </button>
        </div>
      </div>

      {/* 7 Institution Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Approved Intake</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1.5">
            {approvedIntake}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Regular Quota</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Actual Enrolment</div>
          <div className="text-2xl font-bold text-blue-950 font-mono tabular-nums mt-1.5">
            {actualTotal}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {actualRegular} Reg + {actualSuper} Sup
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Supernumerary</div>
          <div className="text-2xl font-bold text-teal-700 font-mono tabular-nums mt-1.5">
            {actualSuper} / {supernumerarySeats}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">NRI / OCI / FN</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Available Seats</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1.5">
            {availableSeats}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Remaining Capacity</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Verified APAAR</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1.5">
            {verifiedCount}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">Validated (Demo)</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Pending / Missing</div>
          <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-1.5">
            {pendingCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting Seeding</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Flagged Records</div>
          <div className="text-2xl font-bold text-red-600 font-mono tabular-nums mt-1.5">
            {flaggedCount}
          </div>
          <div className="text-[11px] text-red-700 mt-1">Requires Action</div>
        </div>
      </div>

      {/* Seat Utilization Progress Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Institutional Seat Utilization Progress
            </h2>
            <p className="text-xs text-slate-500">
              Computer Science & Engineering Regular Intake is currently 60/60 (FULL) with 2/5 Supernumerary occupied
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-blue-950 tabular-nums">
            Total Occupied: {actualTotal} / {approvedIntake + supernumerarySeats} Authorized Seats
          </span>
        </div>

        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-blue-900 transition-all"
            style={{
              width: `${Math.min(100, Math.round((actualRegular / Math.max(1, approvedIntake + supernumerarySeats)) * 100))}%`,
            }}
            title="Regular Enrolments"
          />
          <div
            className="h-full bg-teal-600 transition-all"
            style={{
              width: `${Math.min(100, Math.round((actualSuper / Math.max(1, approvedIntake + supernumerarySeats)) * 100))}%`,
            }}
            title="Supernumerary Enrolments"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {seatLedger.map((item) => (
            <div
              key={item.programmeId}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">{item.programmeName}</span>
                  <span
                    className={`text-[11px] font-bold font-mono ${
                      item.regularStatus === 'FULL' || item.regularStatus === 'EXCEEDED'
                        ? 'text-red-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {item.regularStatus}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Regular Intake: <strong className="font-mono text-slate-800">{item.actualRegularEnrolment}/{item.approvedIntake}</strong> · Supernumerary: <strong className="font-mono text-teal-800">{item.actualSupernumeraryEnrolment}/{item.supernumerarySeats}</strong>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                <span>Total Occupancy: {item.totalOccupied}/{item.totalAuthorizedCapacity}</span>
                <span>Available: {item.availableTotalCapacity}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Student Registration Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recent Student Registrations
            </h2>
            <p className="text-xs text-slate-500">
              APAAR IDs are masked for privacy. Click View or Edit to inspect or revalidate records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, ID, APAAR..."
                aria-label="Search institution students"
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <select
              value={progFilter}
              onChange={(e) => setProgFilter(e.target.value)}
              aria-label="Filter by programme"
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="ALL">All Programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              aria-label="Filter by academic year"
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="ALL">All Academic Years</option>
              <option value="2026-27">2026-27</option>
              <option value="2025-26">2025-26</option>
              <option value="2024-25">2024-25</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by validation status"
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
                <th className="py-3 px-4">APAAR ID (Masked)</th>
                <th className="py-3 px-4">Programme</th>
                <th className="py-3 px-4">Year</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">APAAR Validation Status</th>
                <th className="py-3 px-4">Admission Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredStudents.slice(0, 15).map((stu) => (
                <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                    {stu.studentId}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{stu.fullName}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{stu.maskedApaarId}</td>
                  <td className="py-3 px-4 text-slate-700">{stu.programmeName}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{stu.academicYear}</td>
                  <td className="py-3 px-4 text-slate-600">{stu.admissionCategory}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold ${
                        stu.validationStatus === ValidationStatus.VERIFIED
                          ? 'text-emerald-700'
                          : stu.validationStatus === ValidationStatus.MISSING_APAAR
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {stu.validationStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{stu.admissionStatus}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(stu)}
                      className="text-blue-900 font-medium hover:underline"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudent(stu);
                        setEditNameInput(stu.fullName);
                        setEditApaarInput(stu.rawApaarDemo || '');
                      }}
                      className="text-teal-700 font-medium hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Student Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Student Profile — {selectedStudent.fullName}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-500">Student ID</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">
                  {selectedStudent.studentId}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Masked APAAR ID</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">
                  {selectedStudent.maskedApaarId}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Programme</div>
                <div className="font-medium text-slate-900 mt-0.5">
                  {selectedStudent.programmeName}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Admission Category</div>
                <div className="font-medium text-slate-900 mt-0.5">
                  {selectedStudent.admissionCategory}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Validation Status</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {selectedStudent.validationStatus}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Verification Reference</div>
                <div className="font-mono text-slate-800 mt-0.5">
                  {selectedStudent.verificationReference}
                </div>
              </div>
            </div>
            {selectedStudent.validationReason && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <strong>Validation Note:</strong> {selectedStudent.validationReason}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const st = selectedStudent;
                  setSelectedStudent(null);
                  navigate('/credentials', { state: { studentId: st.studentId } });
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 rounded-lg hover:bg-blue-900"
              >
                View / Issue Credential
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl"
          >
            <h3 className="text-base font-bold text-slate-900">
              Edit & Revalidate Student ({editingStudent.studentId})
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Full Name
                </label>
                <input
                  type="text"
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  12-Digit Synthetic APAAR ID
                </label>
                <input
                  type="text"
                  value={editApaarInput}
                  onChange={(e) => setEditApaarInput(e.target.value)}
                  placeholder="e.g., 456789012345"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 rounded-lg"
              >
                Save & Revalidate
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const StudentDashboardSummary: React.FC = () => {
  const { students, credentials, consentRequests } = usePlatform();
  const navigate = useNavigate();

  const myRecord = students[0];
  const myCredential = credentials[0];
  const pendingConsents = consentRequests.filter((c) => c.status === 'Pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            My Academic Identity
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Verified student enrolment record, Ed25519 QR credential, and employer consent control
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/my-credential')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 rounded-lg hover:bg-blue-900"
          >
            View Digital Credential
          </button>
          <button
            type="button"
            onClick={() => navigate('/consents')}
            className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Consent Requests ({pendingConsents.length})
          </button>
        </div>
      </div>

      {myRecord && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="text-xs text-slate-500">Student Name & ID</div>
            <div className="text-lg font-bold text-slate-900 mt-1">{myRecord.fullName}</div>
            <div className="text-xs font-mono text-slate-600 mt-0.5">ID: {myRecord.studentId}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="text-xs text-slate-500">Masked APAAR ID</div>
            <div className="text-lg font-bold font-mono text-blue-950 mt-1">
              {myRecord.maskedApaarId}
            </div>
            <div className="text-xs text-emerald-700 font-medium mt-0.5">
              {myRecord.validationStatus}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="text-xs text-slate-500">Institution & Programme</div>
            <div className="text-sm font-bold text-slate-900 mt-1">{myRecord.institutionName}</div>
            <div className="text-xs text-slate-600 mt-0.5">{myRecord.programmeName}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="text-xs text-slate-500">Credential & Consent Status</div>
            <div className="text-sm font-bold text-emerald-700 mt-1">
              {myCredential?.status || 'Active'} · Ed25519 Signed
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Disclosure: {myCredential?.consentStatus || 'Approved'}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <button
          type="button"
          onClick={() => navigate('/my-profile')}
          className="text-left bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-900 transition-colors cursor-pointer"
        >
          <Users className="w-6 h-6 text-blue-900 mb-3" />
          <h2 className="text-base font-bold text-slate-900">My Academic Profile</h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Inspect your complete admission record, AICTE institution code, and seat category details.
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/my-qr')}
          className="text-left bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-900 transition-colors cursor-pointer"
        >
          <QrCode className="w-6 h-6 text-teal-700 mb-3" />
          <h2 className="text-base font-bold text-slate-900">My QR Code & Certificate</h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Download or print your digitally signed APAAR Setu academic credential with embedded QR verification payload.
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/consents')}
          className="text-left bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-900 transition-colors cursor-pointer"
        >
          <UserCheck className="w-6 h-6 text-amber-600 mb-3" />
          <h2 className="text-base font-bold text-slate-900">
            Consent Management ({pendingConsents.length} Pending)
          </h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Approve, reject, or revoke access for employers and scholarship authorities requesting credential verification.
          </p>
        </button>
      </div>
    </div>
  );
};

const VerifierDashboardSummary: React.FC = () => {
  const { verificationLogs } = usePlatform();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Authorized Employer & Verifier Portal
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Verify Ed25519 digitally signed student credentials, scan QR payloads, and request student disclosure consent.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/verify-credential')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 rounded-lg hover:bg-blue-900"
          >
            Verify Credential ID
          </button>
          <button
            type="button"
            onClick={() => navigate('/scan-qr')}
            className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Scan / Test QR Payload
          </button>
        </div>
      </div>

      <div className="bg-blue-950 text-white rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-teal-300">
            Zero-Database-Exposure Security Policy
          </div>
          <h2 className="text-lg font-bold mt-1">
            Least-Privilege Verification Architecture
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            As an external verifier, you do not have browse access to the AICTE Central Student Repository. You may only verify specific Credential IDs or signed QR payloads and view attributes consented to by the student.
          </p>
        </div>
        <ShieldCheck className="w-10 h-10 text-teal-400 shrink-0" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Recent Verification Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Credential ID</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Verification Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {verificationLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                    {log.credentialId}
                  </td>
                  <td className="py-3 px-4 text-slate-800">{log.studentName}</td>
                  <td className="py-3 px-4 text-slate-600">{log.institutionName}</td>
                  <td className="py-3 px-4 text-slate-600">{log.mode}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{log.timestamp}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{log.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
