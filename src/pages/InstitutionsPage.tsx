import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit3,
  BookOpen,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { Institution } from '../types/domain';

export const InstitutionsPage: React.FC = () => {
  const {
    institutions,
    programmes,
    students,
    seatLedger,
    addInstitution,
    updateInstitution,
    addProgramme,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<'institutions' | 'programmes'>('institutions');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddInstModal, setShowAddInstModal] = useState(false);
  const [showAddProgModal, setShowAddProgModal] = useState(false);
  const [editingInst, setEditingInst] = useState<Institution | null>(null);

  // New Institution Form
  const [instName, setInstName] = useState('');
  const [instCode, setInstCode] = useState('');
  const [instState, setInstState] = useState('Karnataka');
  const [instDistrict, setInstDistrict] = useState('Mysuru');
  const [instType, setInstType] = useState<Institution['type']>('Autonomous Private');

  // New Programme Form
  const [progInstId, setProgInstId] = useState(institutions[0]?.id || 'inst-1');
  const [progName, setProgName] = useState('');
  const [progDept, setProgDept] = useState('Computer Engineering');
  const [progIntake, setProgIntake] = useState(60);
  const [progSuper, setProgSuper] = useState(5);

  const enrichedInstitutions = useMemo(() => {
    return institutions
      .map((inst) => {
        const instProgs = programmes.filter((p) => p.institutionId === inst.id);
        const instLedger = seatLedger.filter((l) => l.institutionId === inst.id);
        const approvedIntake = instLedger.reduce((a, b) => a + b.approvedIntake, 0);
        const actualEnrolment = students.filter((s) => s.institutionId === inst.id).length;
        return {
          ...inst,
          programmeCount: instProgs.length,
          approvedIntake,
          actualEnrolment,
        };
      })
      .filter((inst) => {
        const matchesSearch =
          inst.name.toLowerCase().includes(search.toLowerCase()) ||
          inst.code.toLowerCase().includes(search.toLowerCase()) ||
          inst.state.toLowerCase().includes(search.toLowerCase());
        const matchesStatus =
          statusFilter === 'ALL' || inst.approvalStatus === statusFilter;
        return matchesSearch && matchesStatus;
      });
  }, [institutions, programmes, seatLedger, students, search, statusFilter]);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    await addInstitution({
      name: instName,
      code: instCode,
      state: instState,
      district: instDistrict,
      type: instType,
      approvalStatus: 'Approved',
      submissionStatus: 'Submitted',
    });
    setInstName('');
    setInstCode('');
    setShowAddInstModal(false);
  };

  const handleCreateProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    await addProgramme({
      institutionId: progInstId,
      name: progName,
      department: progDept,
      approvedIntake: progIntake,
      supernumerarySeats: progSuper,
      academicYear: '2026-27',
      approvalStatus: 'Approved',
    });
    setProgName('');
    setShowAddProgModal(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Institution Directory & Programme Configuration
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage AICTE-approved technical institutions, Extension of Approval (EoA) statuses, and programme seat ceilings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddProgModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-teal-700" />
            <span>Add Programme</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddInstModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Institution</span>
          </button>
        </div>
      </div>

      {/* Segmented View Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('institutions')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'institutions'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Registered Institutions ({institutions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('programmes')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'programmes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved Programmes ({programmes.length})
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code, state..."
              aria-label="Search institutions"
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by approval status"
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
          >
            <option value="ALL">All Approval Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Under Review">Under Review</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Institutions Table */}
      {activeTab === 'institutions' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Institution Name</th>
                  <th className="py-3 px-4">AICTE Code</th>
                  <th className="py-3 px-4">State & District</th>
                  <th className="py-3 px-4">Institution Type</th>
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4 text-right">Programmes</th>
                  <th className="py-3 px-4 text-right">Intake / Enrolled</th>
                  <th className="py-3 px-4">Submission Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {enrichedInstitutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {inst.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-blue-950 font-semibold">
                      {inst.code}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {inst.district}, {inst.state}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{inst.type}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          inst.approvalStatus === 'Approved'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {inst.approvalStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {inst.programmeCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold">
                      {inst.actualEnrolment} / {inst.approvedIntake}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-medium ${
                          inst.submissionStatus === 'Submitted'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {inst.submissionStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditingInst(inst)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-900 hover:bg-blue-50 border border-slate-200 rounded-md cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tab 2: Programmes Table */
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Programme Name</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-right">Approved Intake</th>
                  <th className="py-3 px-4 text-right">Supernumerary Quota</th>
                  <th className="py-3 px-4">Academic Year</th>
                  <th className="py-3 px-4">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {programmes.map((prog) => (
                  <tr key={prog.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {prog.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {prog.institutionName} ({prog.institutionCode})
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{prog.department}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {prog.approvedIntake}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-teal-800 font-semibold">
                      {prog.supernumerarySeats}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {prog.academicYear}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-700">
                      {prog.approvalStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Institution Modal */}
      {showAddInstModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateInstitution}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">
              Register AICTE-Approved Institution
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institution Name *
              </label>
              <input
                type="text"
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                placeholder="e.g., National Institute of Smart Engineering"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                AICTE Institution Code *
              </label>
              <input
                type="text"
                value={instCode}
                onChange={(e) => setInstCode(e.target.value)}
                placeholder="e.g., AICTE-KA-701"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={instState}
                  onChange={(e) => setInstState(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  District
                </label>
                <input
                  type="text"
                  value={instDistrict}
                  onChange={(e) => setInstDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institution Type
              </label>
              <select
                value={instType}
                onChange={(e) => setInstType(e.target.value as Institution['type'])}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                <option value="Government">Government</option>
                <option value="Autonomous Private">Autonomous Private</option>
                <option value="Deemed University">Deemed University</option>
                <option value="State University Affiliated">State University Affiliated</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddInstModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 rounded-lg"
              >
                Save Institution
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Institution Modal */}
      {editingInst && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Update Institution Status — {editingInst.name}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approval Status
              </label>
              <select
                value={editingInst.approvalStatus}
                onChange={(e) =>
                  setEditingInst({
                    ...editingInst,
                    approvalStatus: e.target.value as Institution['approvalStatus'],
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                <option value="Approved">Approved</option>
                <option value="Under Review">Under Review</option>
                <option value="Probation">Probation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data Submission Status
              </label>
              <select
                value={editingInst.submissionStatus}
                onChange={(e) =>
                  setEditingInst({
                    ...editingInst,
                    submissionStatus: e.target.value as Institution['submissionStatus'],
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                <option value="Submitted">Submitted</option>
                <option value="Verification in Progress">Verification in Progress</option>
                <option value="Pending Submission">Pending Submission</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingInst(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await updateInstitution(editingInst.id, {
                    approvalStatus: editingInst.approvalStatus,
                    submissionStatus: editingInst.submissionStatus,
                  });
                  setEditingInst(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Programme Modal */}
      {showAddProgModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProgramme}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">
              Add AICTE-Approved Programme
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institution
              </label>
              <select
                value={progInstId}
                onChange={(e) => setProgInstId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Programme Name *
              </label>
              <input
                type="text"
                value={progName}
                onChange={(e) => setProgName(e.target.value)}
                placeholder="e.g., Robotics and Mechatronics Engineering"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approved Regular Intake
                </label>
                <input
                  type="number"
                  min={10}
                  value={progIntake}
                  onChange={(e) => setProgIntake(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supernumerary Seats
                </label>
                <input
                  type="number"
                  min={0}
                  value={progSuper}
                  onChange={(e) => setProgSuper(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddProgModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 rounded-lg"
              >
                Add Programme
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
