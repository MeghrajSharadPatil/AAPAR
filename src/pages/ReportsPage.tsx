import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Download,
  Printer,
  FileBarChart,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { AdmissionCategory, ValidationStatus } from '../types/domain';

const REPORT_TYPES = [
  { id: '1', label: '1. Institution-wise Student Enrolment' },
  { id: '2', label: '2. Programme-wise Enrolment' },
  { id: '3', label: '3. Approved Intake vs Actual Enrolment' },
  { id: '4', label: '4. Supernumerary Seat Utilization' },
  { id: '5', label: '5. APAAR Validation Report' },
  { id: '6', label: '6. Duplicate Enrolment Report' },
  { id: '7', label: '7. NRI / OCI / FN Student Report' },
  { id: '8', label: '8. Academic Year-wise Admission Report' },
  { id: '9', label: '9. Institution Data Submission Report' },
  { id: '10', label: '10. AI Anomaly Detection Report' },
];

export const ReportsPage: React.FC = () => {
  const {
    institutions,
    programmes,
    students,
    seatLedger,
    duplicates,
    anomalies,
    notify,
  } = usePlatform();

  const [selectedReportId, setSelectedReportId] = useState('1');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [instFilter, setInstFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const mYear = yearFilter === 'ALL' || s.academicYear === yearFilter;
      const mInst = instFilter === 'ALL' || s.institutionId === instFilter;
      const mCat = categoryFilter === 'ALL' || s.admissionCategory === categoryFilter;
      return mYear && mInst && mCat;
    });
  }, [students, yearFilter, instFilter, categoryFilter]);

  const activeReportRows = useMemo(() => {
    switch (selectedReportId) {
      case '1':
      case '3':
      case '9':
        return institutions.map((inst) => {
          const instLedger = seatLedger.filter((l) => l.institutionId === inst.id);
          const intake = instLedger.reduce((a, b) => a + b.approvedIntake, 0);
          const instStu = filteredStudents.filter((s) => s.institutionId === inst.id);
          const verified = instStu.filter(
            (s) => s.validationStatus === ValidationStatus.VERIFIED
          ).length;
          return {
            MetricEntity: `${inst.name} (${inst.code})`,
            State: inst.state,
            ApprovedIntake: intake,
            ActualEnrolment: instStu.length,
            VerifiedAPAAR: verified,
            SubmissionStatus: inst.submissionStatus,
          };
        });
      case '2':
      case '4':
        return seatLedger.map((l) => ({
          MetricEntity: `${l.programmeName} (${l.institutionCode})`,
          AcademicYear: l.academicYear,
          ApprovedIntake: l.approvedIntake,
          RegularEnrolment: l.actualRegularEnrolment,
          SupernumeraryQuota: `${l.actualSupernumeraryEnrolment}/${l.supernumerarySeats}`,
          TotalCapacityStatus: l.regularStatus,
        }));
      case '5':
        return filteredStudents.map((s) => ({
          MetricEntity: `${s.fullName} (${s.studentId})`,
          MaskedAPAAR: s.maskedApaarId,
          Institution: s.institutionName,
          Programme: s.programmeName,
          ValidationStatus: s.validationStatus,
          Diagnostic: s.validationReason || 'Verified in Central Repository',
        }));
      case '6':
        return duplicates.map((d) => ({
          MetricEntity: `${d.referenceId} — ${d.studentName}`,
          MaskedAPAAR: d.maskedApaarId,
          InstitutionA: d.institutionAName,
          InstitutionB: d.institutionBName,
          Category: d.category,
          ReviewStatus: d.reviewStatus,
        }));
      case '7':
        return filteredStudents
          .filter((s) => s.isSupernumerary)
          .map((s) => ({
            MetricEntity: `${s.fullName} (${s.studentId})`,
            MaskedAPAAR: s.maskedApaarId,
            Category: s.admissionCategory,
            Institution: s.institutionName,
            Programme: s.programmeName,
            AcademicYear: s.academicYear,
          }));
      case '8':
        return ['2024-25', '2025-26', '2026-27'].map((yr) => {
          const yrStu = students.filter((s) => s.academicYear === yr);
          return {
            MetricEntity: `Academic Cycle ${yr}`,
            TotalAdmissions: yrStu.length,
            VerifiedRecords: yrStu.filter(
              (s) => s.validationStatus === ValidationStatus.VERIFIED
            ).length,
            SupernumeraryCount: yrStu.filter((s) => s.isSupernumerary).length,
            ExceptionCount: yrStu.filter(
              (s) => s.validationStatus !== ValidationStatus.VERIFIED
            ).length,
          };
        });
      case '10':
      default:
        return anomalies.map((a) => ({
          MetricEntity: a.anomalyType,
          RiskLevel: a.riskLevel,
          AffectedInstitution: a.institutionName,
          Programme: a.programmeName,
          AffectedRecords: a.affectedRecordsCount,
          Status: a.status,
        }));
    }
  }, [
    selectedReportId,
    institutions,
    seatLedger,
    filteredStudents,
    duplicates,
    students,
    anomalies,
  ]);

  const chartSummaryData = useMemo(() => {
    return institutions.map((inst) => {
      const instLedger = seatLedger.filter((l) => l.institutionId === inst.id);
      const intake = instLedger.reduce((a, b) => a + b.approvedIntake, 0);
      const enrolled = filteredStudents.filter((s) => s.institutionId === inst.id).length;
      return {
        name: inst.code.replace('AICTE-', ''),
        'Approved Intake': intake,
        'Actual Enrolment': enrolled,
      };
    });
  }, [institutions, seatLedger, filteredStudents]);

  const handleDownloadCsv = () => {
    const csv = Papa.unparse(activeReportRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apaar_setu_report_${selectedReportId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify(
      'Report CSV Exported',
      `Exported ${activeReportRows.length} rows for Report #${selectedReportId}.`,
      'success'
    );
  };

  const currentReportTitle =
    REPORT_TYPES.find((r) => r.id === selectedReportId)?.label || 'Analytics Report';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Reports & Analytics Center
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Generate, filter, print, and export national and institutional reports (Synthetic Sample Data for SIH26263 Demonstration).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* 10 Report Type Selector Grid + Filters */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Select Standard AICTE Compliance Report (10 Report Modules)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {REPORT_TYPES.map((rep) => (
            <button
              key={rep.id}
              type="button"
              onClick={() => setSelectedReportId(rep.id)}
              className={`text-left px-3 py-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                selectedReportId === rep.id
                  ? 'bg-blue-950 text-white border-blue-950'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {rep.label}
            </button>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-3">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            aria-label="Filter report by academic year"
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
          >
            <option value="ALL">All Academic Years</option>
            <option value="2026-27">2026-27</option>
            <option value="2025-26">2025-26</option>
            <option value="2024-25">2024-25</option>
          </select>

          <select
            value={instFilter}
            onChange={(e) => setInstFilter(e.target.value)}
            aria-label="Filter report by institution"
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
          >
            <option value="ALL">All Institutions</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter report by admission category"
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
          >
            <option value="ALL">All Admission Categories</option>
            {Object.values(AdmissionCategory).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visual Chart Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {currentReportTitle} — Visual Analytics
            </h2>
            <p className="text-xs text-slate-500">
              Synthetic Demonstration Data Only — Not Official AICTE Statistics
            </p>
          </div>
          <FileBarChart className="w-5 h-5 text-blue-900" />
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartSummaryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Approved Intake" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual Enrolment" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dynamic Report Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">{currentReportTitle}</h2>
            <p className="text-xs text-slate-500">
              {activeReportRows.length} rows generated · Synthetic Sample Dataset
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeReportRows.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No records match the selected filters.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  {Object.keys(activeReportRows[0]).map((col) => (
                    <th key={col} className="py-3 px-4">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {activeReportRows.slice(0, 30).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {Object.values(row).map((val, cIdx) => (
                      <td
                        key={cIdx}
                        className={`py-3 px-4 ${
                          cIdx === 0 ? 'font-semibold text-slate-900' : 'text-slate-700 font-mono'
                        }`}
                      >
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
