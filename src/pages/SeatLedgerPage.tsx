import React, { useState } from 'react';
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
  Scale,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Beaker,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { AdmissionCategory, SeatLedgerItem } from '../types/domain';

export const SeatLedgerPage: React.FC<{ monitoringView?: boolean }> = ({
  monitoringView = false,
}) => {
  const {
    seatLedger,
    registerStudent,
    updateProgramme,
    notify,
  } = usePlatform();

  const [configuringProg, setConfiguringProg] = useState<SeatLedgerItem | null>(null);
  const [intakeInput, setIntakeInput] = useState(60);
  const [superInput, setSuperInput] = useState(5);
  const [excessBanner, setExcessBanner] = useState<string | null>(null);

  const totalApprovedIntake = seatLedger.reduce((a, b) => a + b.approvedIntake, 0);
  const totalRegularEnrolled = seatLedger.reduce((a, b) => a + b.actualRegularEnrolment, 0);
  const totalSuperQuota = seatLedger.reduce((a, b) => a + b.supernumerarySeats, 0);
  const totalSuperEnrolled = seatLedger.reduce((a, b) => a + b.actualSupernumeraryEnrolment, 0);
  const totalAuthorizedCapacity = totalApprovedIntake + totalSuperQuota;
  const totalAvailable = seatLedger.reduce((a, b) => a + b.availableTotalCapacity, 0);
  const totalExcessAlerts = seatLedger.reduce((a, b) => a + b.excessAdmissionsCount, 0);

  // Featured ABC Engineering College - Computer Science & Engineering (prog-1)
  const featuredAbcCse = seatLedger.find((l) => l.programmeId === 'prog-1') || seatLedger[0];

  const chartData = seatLedger.map((item) => ({
    name: `${item.institutionCode.replace('AICTE-', '')} (${item.programmeName
      .split(' ')
      .map((w) => w[0])
      .join('')})`,
    fullTitle: `${item.institutionName} — ${item.programmeName}`,
    'Approved Intake': item.approvedIntake,
    'Regular Enrolment': item.actualRegularEnrolment,
    'Supernumerary Occupied': item.actualSupernumeraryEnrolment,
  }));

  // 1-Click Test Case 2 Execution: Attempt 61st Regular Admission in ABC Engineering College CSE
  const handleTriggerExcessAdmissionTest = async () => {
    try {
      const randId = Math.floor(100 + Math.random() * 899);
      const res = await registerStudent({
        studentId: `2219${randId}`,
        fullName: `Vikramaditya Rao (Excess Test #${randId})`,
        dob: '2005-07-19',
        gender: 'Male',
        rawApaarId: `891234567${randId}`,
        institutionId: 'inst-1',
        programmeId: 'prog-1',
        academicYear: '2026-27',
        admissionDate: new Date().toISOString().split('T')[0],
        admissionCategory: AdmissionCategory.GENERAL,
      });

      const warnMsg =
        res.outcome.seatExceededWarning ||
        'Regular Approved Intake (60/60) is FULL. Admission attempt flagged for AICTE review.';
      setExcessBanner(warnMsg);
      notify('TEST 2 Triggered: Excess Admission Flagged', warnMsg, 'warning');
    } catch (err) {
      notify('Test Failed', err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleSaveCapacityConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringProg) return;
    await updateProgramme(configuringProg.programmeId, {
      approvedIntake: intakeInput,
      supernumerarySeats: superInput,
    });
    setConfiguringProg(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            {monitoringView
              ? 'Admission Monitoring & Intake Compliance'
              : 'Live Seat Ledger & Capacity Enforcement'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Dynamic calculation of Approved Regular Intake and Supernumerary Seats (Total Authorized Capacity = Approved Intake + Configured Supernumerary Seats).
          </p>
        </div>

        <button
          type="button"
          onClick={handleTriggerExcessAdmissionTest}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Beaker className="w-4 h-4 text-amber-800" />
          <span>Run TEST 2: Attempt 61st Regular Admission (60/60 Full)</span>
        </button>
      </div>

      {/* Live Excess Admission Alert Banner */}
      {excessBanner && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-950 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold">
                Over-Admission Attempt Blocked from Auto-Confirmation
              </div>
              <p className="text-xs mt-1 leading-relaxed">{excessBanner}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExcessBanner(null)}
            className="text-xs font-semibold underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 6 Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Approved Intake</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {totalApprovedIntake}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Regular Sanctioned</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Regular Enrolments</div>
          <div className="text-2xl font-bold text-blue-950 font-mono tabular-nums mt-1">
            {totalRegularEnrolled}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Occupied Regular Seats</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Supernumerary Seats</div>
          <div className="text-2xl font-bold text-teal-700 font-mono tabular-nums mt-1">
            {totalSuperEnrolled} / {totalSuperQuota}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Separate Quota Counter</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Authorized Capacity</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {totalAuthorizedCapacity}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Intake + Supernumerary</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Available Seats</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
            {totalAvailable}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Open Authorized Seats</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Excess Admission Alerts</div>
          <div className="text-2xl font-bold text-red-600 font-mono tabular-nums mt-1">
            {totalExcessAlerts}
          </div>
          <div className="text-[11px] text-red-700 mt-1">Flagged for Review</div>
        </div>
      </div>

      {/* Featured Demonstration Spotlight: ABC Engineering College (TEST 2 & TEST 6) */}
      {featuredAbcCse && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-950">
                SIH Live Demonstration Spotlight (TEST 2 & TEST 6)
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                {featuredAbcCse.institutionName} — {featuredAbcCse.programmeName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Regular Intake and Supernumerary Seats are tracked in separate counters derived dynamically from student admission records.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-red-700">
                Regular Intake Status: {featuredAbcCse.regularStatus} ({featuredAbcCse.actualRegularEnrolment}/{featuredAbcCse.approvedIntake})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-5 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50">
              <div className="text-slate-500">Approved Intake</div>
              <div className="text-xl font-bold font-mono text-slate-900 tabular-nums mt-1">
                {featuredAbcCse.approvedIntake}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Sanctioned Ceiling</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50">
              <div className="text-slate-500">Actual Regular Enrolment</div>
              <div className="text-xl font-bold font-mono text-blue-950 tabular-nums mt-1">
                {featuredAbcCse.actualRegularEnrolment}
              </div>
              <div className="text-[11px] text-red-700 font-semibold mt-0.5">100% Occupied (FULL)</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50">
              <div className="text-slate-500">Supernumerary Occupancy</div>
              <div className="text-xl font-bold font-mono text-teal-800 tabular-nums mt-1">
                {featuredAbcCse.actualSupernumeraryEnrolment} / {featuredAbcCse.supernumerarySeats}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">NRI / OCI / FN Quota</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50">
              <div className="text-slate-500">Total Occupancy</div>
              <div className="text-xl font-bold font-mono text-slate-900 tabular-nums mt-1">
                {featuredAbcCse.totalOccupied} / {featuredAbcCse.totalAuthorizedCapacity}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Combined Seats</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50">
              <div className="text-slate-500">Available Capacity</div>
              <div className="text-xl font-bold font-mono text-emerald-700 tabular-nums mt-1">
                {featuredAbcCse.availableTotalCapacity}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Supernumerary Only</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50">
              <div className="text-slate-500">Flagged Excess Attempts</div>
              <div className="text-xl font-bold font-mono text-red-600 tabular-nums mt-1">
                {featuredAbcCse.excessAdmissionsCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Blocked from Auto-Confirm</div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Seat Utilization Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">
          Programme-wise Seat Utilization Chart
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Comparison of Approved Regular Intake, Actual Regular Enrolment, and Supernumerary Occupancy
        </p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Approved Intake" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Regular Enrolment" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Supernumerary Occupied" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Programme-wise Live Seat Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Programme-wise Live Seat Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Real-time seat occupancy computed from active student records
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Institution & Programme</th>
                <th className="py-3 px-4 text-right">Approved Intake</th>
                <th className="py-3 px-4 text-right">Regular Enrolment</th>
                <th className="py-3 px-4 text-right">Supernumerary Occupancy</th>
                <th className="py-3 px-4 text-right">Total Occupancy</th>
                <th className="py-3 px-4 text-right">Available Capacity</th>
                <th className="py-3 px-4">Regular Intake Status</th>
                <th className="py-3 px-4 text-right">Configure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {seatLedger.map((item) => (
                <tr key={item.programmeId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{item.programmeName}</div>
                    <div className="text-[11px] text-slate-500">
                      {item.institutionName} ({item.institutionCode}) · {item.academicYear}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {item.approvedIntake}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {item.actualRegularEnrolment} / {item.approvedIntake}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-teal-800 font-medium">
                    {item.actualSupernumeraryEnrolment} / {item.supernumerarySeats}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                    {item.totalOccupied} / {item.totalAuthorizedCapacity}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                    {item.availableTotalCapacity}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-bold font-mono ${
                        item.regularStatus === 'EXCEEDED' || item.regularStatus === 'FULL'
                          ? 'text-red-700'
                          : item.regularStatus === 'NEAR CAPACITY'
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {item.regularStatus}
                      {item.excessAdmissionsCount > 0 &&
                        ` (+${item.excessAdmissionsCount} Excess Flagged)`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setConfiguringProg(item);
                        setIntakeInput(item.approvedIntake);
                        setSuperInput(item.supernumerarySeats);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-900 hover:bg-blue-50 border border-slate-200 rounded-md cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Policy</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configure Programme Capacity Modal */}
      {configuringProg && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCapacityConfig}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl"
          >
            <h3 className="text-base font-bold text-slate-900">
              Configure Seat Capacity Policy
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              {configuringProg.institutionName} — {configuringProg.programmeName}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approved Regular Intake Ceiling
                </label>
                <input
                  type="number"
                  min={1}
                  value={intakeInput}
                  onChange={(e) => setIntakeInput(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Configured Supernumerary Seats (NRI / OCI / FN / PMSSS)
                </label>
                <input
                  type="number"
                  min={0}
                  value={superInput}
                  onChange={(e) => setSuperInput(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfiguringProg(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 rounded-lg"
              >
                Update Capacity Rule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
