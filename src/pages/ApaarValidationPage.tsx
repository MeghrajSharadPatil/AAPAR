import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Search,
  Lock,
  Wrench,
  ShieldCheck,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { StudentRecord, ValidationStatus } from '../types/domain';

export const ApaarValidationPage: React.FC = () => {
  const { students, updateStudent, notify } = usePlatform();

  const [statusFilter, setStatusFilter] = useState<string>('EXCEPTIONS');
  const [search, setSearch] = useState('');
  const [resolvingStudent, setResolvingStudent] = useState<StudentRecord | null>(null);
  const [correctedApaar, setCorrectedApaar] = useState('');

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      [ValidationStatus.VERIFIED]: 0,
      [ValidationStatus.PENDING]: 0,
      [ValidationStatus.INVALID_FORMAT]: 0,
      [ValidationStatus.MISSING_APAAR]: 0,
      [ValidationStatus.DUPLICATE_DETECTED]: 0,
      [ValidationStatus.FLAGGED]: 0,
    };
    for (const s of students) {
      counts[s.validationStatus] = (counts[s.validationStatus] || 0) + 1;
    }
    return counts;
  }, [students]);

  const exceptionCount =
    students.length - (statusCounts[ValidationStatus.VERIFIED] || 0);

  const filteredRecords = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.studentId.toLowerCase().includes(search.toLowerCase()) ||
        s.maskedApaarId.toLowerCase().includes(search.toLowerCase()) ||
        s.institutionName.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'EXCEPTIONS') {
        return s.validationStatus !== ValidationStatus.VERIFIED;
      }
      return s.validationStatus === statusFilter;
    });
  }, [students, statusFilter, search]);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingStudent) return;
    try {
      const res = await updateStudent(resolvingStudent.id, {
        rawApaarId: correctedApaar,
      });
      setResolvingStudent(null);
      if (res.outcome.validationStatus === ValidationStatus.VERIFIED) {
        notify(
          'Exception Cleared',
          `${res.student.fullName} is now Verified (Demo) and moved out of the Exception Queue.`,
          'success'
        );
      } else {
        notify(
          `Revalidation Result: ${res.outcome.validationStatus}`,
          res.outcome.validationReason || 'Still requires correction.',
          'warning'
        );
      }
    } catch (err) {
      notify('Error', err instanceof Error ? err.message : 'Failed to revalidate', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            APAAR Validation Engine & Exception Queue
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Automated format checks, HMAC-SHA256 privacy-preserving token matching, and exception queue resolution.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-3.5 py-2 rounded-lg">
          <Lock className="w-4 h-4 text-teal-700" />
          <span>Synthetic Validation Prototype · HMAC Secret Protected on Server</span>
        </div>
      </div>

      {/* 6 Validation Status Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {Object.values(ValidationStatus).map((st) => {
          const isSelected = statusFilter === st;
          const count = statusCounts[st] || 0;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(isSelected ? 'ALL' : st)}
              className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-950 text-white border-blue-950'
                  : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs opacity-80 truncate">{st}</div>
              <div className="text-2xl font-bold font-mono tabular-nums mt-1.5">
                {count}
              </div>
              <div className="text-[11px] opacity-75 mt-1">Click to filter</div>
            </button>
          );
        })}
      </div>

      {/* Validation Engine Rules Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Active Automated Validation Rules (7-Stage Pipeline)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Missing or invalid records are placed into the Exception Queue below rather than silently deleted. Note: Format validation in this prototype uses synthetic demo rules and does not claim live government registry authentication.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('EXCEPTIONS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'EXCEPTIONS'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Exception Queue ({exceptionCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-blue-950 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Records ({students.length})
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Validation Results Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {statusFilter === 'EXCEPTIONS'
                ? `Exception Queue (${filteredRecords.length} Records Requiring Attention)`
                : `Validation Results (${filteredRecords.length} Records)`}
            </h2>
            <p className="text-xs text-slate-500">
              Inspect failure reasons and recommended corrections, or click "Correct & Resubmit"
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, ID, institution..."
              aria-label="Search validation records"
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Student Details</th>
                <th className="py-3 px-4">Masked APAAR</th>
                <th className="py-3 px-4">Institution & Programme</th>
                <th className="py-3 px-4">Validation Status</th>
                <th className="py-3 px-4">Reason for Failure / Diagnostic</th>
                <th className="py-3 px-4">Recommended Correction</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredRecords.slice(0, 25).map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{rec.fullName}</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      ID: {rec.studentId} · {rec.validationDate}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                    {rec.maskedApaarId}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{rec.institutionName}</div>
                    <div className="text-[11px] text-slate-500">{rec.programmeName}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-semibold ${
                        rec.validationStatus === ValidationStatus.VERIFIED
                          ? 'text-emerald-700'
                          : rec.validationStatus === ValidationStatus.MISSING_APAAR
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {rec.validationStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                    {rec.validationReason || (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Passed format, HMAC duplicate, and seat checks.
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                    {rec.recommendedCorrection || 'No action required.'}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setResolvingStudent(rec);
                        setCorrectedApaar(
                          rec.rawApaarDemo && !rec.rawApaarDemo.startsWith('0000')
                            ? rec.rawApaarDemo
                            : '789456123088'
                        );
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-950 bg-white border border-slate-300 hover:bg-blue-50 rounded-md cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Correct & Resubmit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to Correct & Resubmit Exception Record */}
      {resolvingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleResolveSubmit}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl"
          >
            <h3 className="text-base font-bold text-slate-900">
              Correct & Resubmit Student Record
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Student: <strong>{resolvingStudent.fullName}</strong> ({resolvingStudent.studentId}) · Current Status: <strong className="text-amber-700">{resolvingStudent.validationStatus}</strong>
            </p>
            {resolvingStudent.validationReason && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {resolvingStudent.validationReason}
              </div>
            )}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valid 12-Digit Synthetic APAAR ID
              </label>
              <input
                type="text"
                value={correctedApaar}
                onChange={(e) => setCorrectedApaar(e.target.value)}
                placeholder="e.g., 789456123088"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                required
              />
              <div className="text-[11px] text-slate-500 mt-1">
                Tip: Pre-filled with a valid 12-digit synthetic APAAR ID for instant revalidation.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResolvingStudent(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg"
              >
                Resubmit to Validation Engine
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
