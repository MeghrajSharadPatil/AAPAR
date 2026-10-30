import React, { useState, useMemo } from 'react';
import {
  CopyCheck,
  ShieldAlert,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  MessageSquarePlus,
  Building2,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import {
  DuplicateCase,
  DuplicateCategory,
  RiskLevel,
} from '../types/domain';

export const DuplicateShieldPage: React.FC = () => {
  const { duplicates, students, resolveDuplicate } = usePlatform();

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedCase, setSelectedCase] = useState<DuplicateCase | null>(
    duplicates[0] || null
  );
  const [notesInput, setNotesInput] = useState('');

  const filteredDuplicates = useMemo(() => {
    return duplicates.filter(
      (d) => categoryFilter === 'ALL' || d.category === categoryFilter
    );
  }, [duplicates, categoryFilter]);

  const exactMatchCount = duplicates.filter(
    (d) => d.category === DuplicateCategory.EXACT_MATCH
  ).length;
  const possibleCount = duplicates.filter(
    (d) => d.category === DuplicateCategory.POSSIBLE_DUPLICATE
  ).length;
  const pendingCount = duplicates.filter((d) => d.reviewStatus === 'Pending Review').length;

  const studentRecordA = useMemo(() => {
    if (!selectedCase) return null;
    return students.find((s) => s.studentId === selectedCase.studentIdA) || null;
  }, [selectedCase, students]);

  const studentRecordB = useMemo(() => {
    if (!selectedCase) return null;
    return students.find((s) => s.studentId === selectedCase.studentIdB) || null;
  }, [selectedCase, students]);

  const handleAction = async (
    caseId: string,
    status: DuplicateCase['reviewStatus']
  ) => {
    await resolveDuplicate(caseId, status, notesInput || undefined);
    setNotesInput('');
    const updated = duplicates.find((d) => d.id === caseId);
    if (updated) {
      setSelectedCase({ ...updated, reviewStatus: status });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Duplicate Shield — Cross-Institution Identity Matching
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Detect students registered in more than one AICTE-approved institution using privacy-preserving server-side HMAC-SHA256 tokens.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-3.5 py-2 rounded-lg">
          <Lock className="w-4 h-4 text-teal-700" />
          <span className="font-mono">HMAC-SHA256 Zero-Plaintext Matching Active</span>
        </div>
      </div>

      {/* Policy Notice Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
        <ShieldAlert className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900">Fair Verification Policy:</strong> A matching HMAC-SHA256 academic identity token generates an administrative review warning and does not automatically prove fraud. Registrars can verify legitimate inter-institutional transfers, counseling upgrades, or seat withdrawal certificates before resolving a flag. Every action is recorded in the central audit trail.
        </div>
      </div>

      {/* Category Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setCategoryFilter('ALL')}
          className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
            categoryFilter === 'ALL'
              ? 'bg-blue-950 text-white border-blue-950'
              : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs opacity-80">All Flagged Cases</div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1">
            {duplicates.length}
          </div>
          <div className="text-[11px] opacity-75 mt-1">{pendingCount} Pending Review</div>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter(DuplicateCategory.EXACT_MATCH)}
          className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
            categoryFilter === DuplicateCategory.EXACT_MATCH
              ? 'bg-blue-950 text-white border-blue-950'
              : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs opacity-80">Exact Identity Match</div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1">
            {exactMatchCount}
          </div>
          <div className="text-[11px] opacity-75 mt-1">Identical HMAC-SHA256 Token</div>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter(DuplicateCategory.POSSIBLE_DUPLICATE)}
          className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
            categoryFilter === DuplicateCategory.POSSIBLE_DUPLICATE
              ? 'bg-blue-950 text-white border-blue-950'
              : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs opacity-80">Possible Duplicate</div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1">
            {possibleCount}
          </div>
          <div className="text-[11px] opacity-75 mt-1">Demographic Name + DOB Match</div>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter(DuplicateCategory.MANUAL_REVIEW)}
          className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
            categoryFilter === DuplicateCategory.MANUAL_REVIEW
              ? 'bg-blue-950 text-white border-blue-950'
              : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs opacity-80">Manual Review Required</div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1">
            {pendingCount}
          </div>
          <div className="text-[11px] opacity-75 mt-1">Awaiting Registrar Action</div>
        </button>
      </div>

      {/* Duplicate Cases Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Detected Cross-Institution Duplicate Enrolments
            </h2>
            <p className="text-xs text-slate-500">
              Select any case to launch the side-by-side institutional record comparison & resolution console
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Duplicate Ref ID</th>
                <th className="py-3 px-4">Student & IDs</th>
                <th className="py-3 px-4">Masked APAAR ID</th>
                <th className="py-3 px-4">Institution A (Primary)</th>
                <th className="py-3 px-4">Institution B (Secondary)</th>
                <th className="py-3 px-4">Year & Date</th>
                <th className="py-3 px-4">Category & Risk</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredDuplicates.map((dup) => (
                <tr
                  key={dup.id}
                  onClick={() => setSelectedCase(dup)}
                  className={`cursor-pointer transition-colors ${
                    selectedCase?.id === dup.id ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-950">
                    {dup.referenceId}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{dup.studentName}</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {dup.studentIdA} ↔ {dup.studentIdB}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                    {dup.maskedApaarId}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{dup.institutionAName}</div>
                    <div className="text-[11px] text-slate-500">{dup.programmeA}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{dup.institutionBName}</div>
                    <div className="text-[11px] text-slate-500">{dup.programmeB}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    <div>{dup.academicYear}</div>
                    <div className="text-[11px] text-slate-400">{dup.detectionDate}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{dup.category}</div>
                    <div
                      className={`text-[11px] font-semibold ${
                        dup.riskLevel === RiskLevel.HIGH ? 'text-red-700' : 'text-amber-700'
                      }`}
                    >
                      {dup.riskLevel}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-semibold ${
                        dup.reviewStatus === 'Resolved - Legitimate Transfer'
                          ? 'text-emerald-700'
                          : dup.reviewStatus === 'Escalated to AICTE'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {dup.reviewStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCase(dup);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-950 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
                    >
                      Compare Records
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-Side Comparison & Resolution Console */}
      {selectedCase && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Side-by-Side Comparison: {selectedCase.referenceId} ({selectedCase.studentName})
                </h2>
                <p className="text-xs text-slate-500">
                  Masked APAAR ID: <strong className="font-mono text-slate-800">{selectedCase.maskedApaarId}</strong> · Category: {selectedCase.category} · Current Status: <strong>{selectedCase.reviewStatus}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Institution A Card */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-950">
                  Institution A (Primary Seat Record)
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  Confirmed First
                </span>
              </div>
              <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-900" />
                <span>{selectedCase.institutionAName}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
                <div>
                  <div className="text-slate-500">Student Enrolment ID</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {selectedCase.studentIdA}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Masked APAAR ID</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {selectedCase.maskedApaarId}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Programme</div>
                  <div className="font-medium text-slate-900 mt-0.5">
                    {selectedCase.programmeA}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Admission Date</div>
                  <div className="font-mono text-slate-800 mt-0.5">
                    {studentRecordA?.admissionDate || '2026-08-05'}
                  </div>
                </div>
              </div>
            </div>

            {/* Institution B Card */}
            <div className="p-5 rounded-xl border border-red-200 bg-red-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-900">
                  Institution B (Conflicting Enrolment Attempt)
                </span>
                <span className="text-xs font-semibold text-red-700">
                  Flagged by Duplicate Shield
                </span>
              </div>
              <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-red-700" />
                <span>{selectedCase.institutionBName}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-red-200/60">
                <div>
                  <div className="text-slate-500">Student Enrolment ID</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {selectedCase.studentIdB}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Masked APAAR ID</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {selectedCase.maskedApaarId}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Programme</div>
                  <div className="font-medium text-slate-900 mt-0.5">
                    {selectedCase.programmeB}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Submission Date</div>
                  <div className="font-mono text-slate-800 mt-0.5">
                    {studentRecordB?.admissionDate || selectedCase.detectionDate}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Review Notes & Resolution Actions */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <strong>Current Investigation Notes:</strong> {selectedCase.reviewNotes}
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label
                  htmlFor="dup-notes"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Add Registrar / AICTE Review Notes
                </label>
                <input
                  id="dup-notes"
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Enter migration certificate number or resolution justification..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <button
                  type="button"
                  onClick={() => handleAction(selectedCase.id, 'Marked as Reviewed')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Mark as Reviewed
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAction(selectedCase.id, 'Resolved - Legitimate Transfer')
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Resolve Duplicate (Verified Transfer)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(selectedCase.id, 'Escalated to AICTE')}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Escalate to AICTE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
