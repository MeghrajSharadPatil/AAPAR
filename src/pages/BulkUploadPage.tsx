import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileWarning,
  Check,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { CsvRowValidationResult, ValidationStatus } from '../types/domain';

const SAMPLE_CSV_ROWS: Array<Record<string, string>> = [
  {
    studentId: '222301',
    fullName: 'Aarav Kulkarni',
    dob: '2005-03-14',
    gender: 'Male',
    apaarId: '741258963012',
    institutionCode: 'AICTE-DL-101',
    programmeName: 'Electronics and Communication Engineering',
    department: 'Electronics Engineering',
    academicYear: '2026-27',
    admissionCategory: 'General / Regular',
  },
  {
    studentId: '222302',
    fullName: 'Meera Srinivasan',
    dob: '2005-07-22',
    gender: 'Female',
    apaarId: '852369741023',
    institutionCode: 'AICTE-DL-101',
    programmeName: 'Artificial Intelligence and Data Science',
    department: 'Computer Engineering',
    academicYear: '2026-27',
    admissionCategory: 'General / Regular',
  },
  {
    studentId: '222303',
    fullName: 'Devansh Rathore',
    dob: '2005-11-09',
    gender: 'Male',
    apaarId: '', // TEST 3 / TEST 7: Missing APAAR ID
    institutionCode: 'AICTE-DL-101',
    programmeName: 'Electronics and Communication Engineering',
    department: 'Electronics Engineering',
    academicYear: '2026-27',
    admissionCategory: 'General / Regular',
  },
  {
    studentId: '222304',
    fullName: 'Rahul Sharma',
    dob: '2005-04-14',
    gender: 'Male',
    apaarId: '123456789012', // TEST 1: Duplicate existing APAAR token
    institutionCode: 'AICTE-DL-101',
    programmeName: 'Electronics and Communication Engineering',
    department: 'Electronics Engineering',
    academicYear: '2026-27',
    admissionCategory: 'General / Regular',
  },
  {
    studentId: '222305',
    fullName: 'Tanya Malhotra',
    dob: '2005-01-30',
    gender: 'Female',
    apaarId: '963258741036',
    institutionCode: 'AICTE-DL-101',
    programmeName: 'Unapproved Quantum Robotics', // TEST 7: Mismatched / unapproved programme
    department: 'Robotics',
    academicYear: '2026-27',
    admissionCategory: 'General / Regular',
  },
  {
    studentId: '222306',
    fullName: 'Pranav Joshi',
    dob: '2005-08-19',
    gender: 'Male',
    apaarId: '654789321098',
    institutionCode: 'AICTE-DL-101',
    programmeName: 'Computer Science and Engineering', // TEST 2: Exceeds 60/60 Regular Intake!
    department: 'Computer Engineering',
    academicYear: '2026-27',
    admissionCategory: 'General / Regular',
  },
];

export const BulkUploadPage: React.FC = () => {
  const { validateBulkCsv, commitBulkCsv, notify } = usePlatform();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [rawRows, setRawRows] = useState<Array<Record<string, string>>>([]);
  const [validationResults, setValidationResults] = useState<CsvRowValidationResult[]>([]);
  const [summary, setSummary] = useState<{
    totalRows: number;
    validRecords: number;
    invalidRecords: number;
    duplicateRecords: number;
    missingApaarIds: number;
    seatWarnings: number;
  } | null>(null);
  const [includeExceptions, setIncludeExceptions] = useState(true);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editApaar, setEditApaar] = useState('');
  const [editProgramme, setEditProgramme] = useState('');
  const [uploading, setUploading] = useState(false);

  const runValidation = async (rowsToValidate: Array<Record<string, string>>) => {
    try {
      const report = await validateBulkCsv(rowsToValidate);
      setValidationResults(report.results);
      setSummary(report.summary);
      notify(
        'CSV Validation Complete',
        `Validated ${report.summary.totalRows} rows: ${report.summary.validRecords} valid, ${report.summary.invalidRecords} with errors/warnings.`,
        report.summary.invalidRecords > 0 ? 'warning' : 'success'
      );
    } catch (err) {
      notify('Validation Error', err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const parsed = res.data || [];
        setRawRows(parsed);
        await runValidation(parsed);
      },
    });
  };

  const handleLoadSampleCsv = async () => {
    const cloned = SAMPLE_CSV_ROWS.map((r) => ({ ...r }));
    setRawRows(cloned);
    await runValidation(cloned);
  };

  const handleDownloadSampleCsv = () => {
    const csv = Papa.unparse(SAMPLE_CSV_ROWS);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'apaar_setu_sample_bulk_upload.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadErrorReport = () => {
    const errorRows = validationResults
      .filter((r) => !r.isValid)
      .map((r) => ({
        RowNumber: r.rowNumber,
        StudentID: r.studentId,
        StudentName: r.fullName,
        MaskedAPAAR: r.maskedApaarId,
        Programme: r.programmeName,
        ValidationStatus: r.validationStatus,
        Errors: r.errors.join(' | '),
        Warnings: r.warnings.join(' | '),
      }));
    const csv = Papa.unparse(errorRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'apaar_setu_csv_validation_errors.csv';
    a.click();
    URL.revokeObjectURL(url);
    notify('Error Report Downloaded', `Exported ${errorRows.length} flagged rows.`, 'info');
  };

  const handleSaveRowCorrection = async (idx: number) => {
    const updated = [...rawRows];
    updated[idx] = {
      ...updated[idx],
      apaarId: editApaar,
      programmeName: editProgramme,
    };
    setRawRows(updated);
    setEditingRowIndex(null);
    await runValidation(updated);
  };

  const handleConfirmUpload = async () => {
    if (rawRows.length === 0) return;
    setUploading(true);
    try {
      const res = await commitBulkCsv(rawRows, includeExceptions);
      notify(
        'Bulk Upload Committed',
        `${res.committedVerified} verified records confirmed; ${res.queuedExceptions} records placed in Exception Queue.`,
        'success'
      );
      setRawRows([]);
      setValidationResults([]);
      setSummary(null);
    } catch (err) {
      notify('Upload Failed', err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Bulk Student Data Upload
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Upload institutional admission batches via CSV with automated APAAR format, duplicate token, and seat capacity validation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadSampleCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Sample CSV</span>
          </button>
          <button
            type="button"
            onClick={handleLoadSampleCsv}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Load Sample CSV (TEST 7 Demo)</span>
          </button>
        </div>
      </div>

      {/* Upload Dropzone + Supported Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) {
              handleFileChange(e.dataTransfer.files[0]);
            }
          }}
          className="lg:col-span-7 bg-white border-2 border-dashed border-slate-300 hover:border-blue-900 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Drag and Drop CSV File Here
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Upload your institutional admission CSV batch, or click "Load Sample CSV (TEST 7 Demo)" to preview valid, missing APAAR, duplicate, and mismatched programme rows.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
            className="hidden"
          />
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg cursor-pointer"
            >
              Browse CSV Files
            </button>
            <button
              type="button"
              onClick={handleLoadSampleCsv}
              className="px-4 py-2 text-xs font-semibold text-blue-950 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
            >
              Load Built-In Test Batch
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">
            Upload Instructions & Supported CSV Fields
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Every row is validated before repository commitment. Invalid rows are never silently ignored.
          </p>
          <div className="mt-4 space-y-2 text-xs text-slate-700 font-mono bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>• studentId (Required, e.g., 222301)</div>
            <div>• fullName (Required, e.g., Aarav Kulkarni)</div>
            <div>• apaarId (12-digit synthetic ID, e.g., 741258963012)</div>
            <div>• institutionCode (e.g., AICTE-DL-101)</div>
            <div>• programmeName (Must match AICTE EoA programme)</div>
            <div>• academicYear (e.g., 2026-27)</div>
            <div>• admissionCategory (General / Regular, NRI, OCI, FN)</div>
          </div>
        </div>
      </div>

      {/* Validation Summary Cards & Preview Table */}
      {summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">1. Total Rows</div>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                {summary.totalRows}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">2. Valid Records</div>
              <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
                {summary.validRecords}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">3. Invalid / Flagged</div>
              <div className="text-2xl font-bold text-red-600 font-mono tabular-nums mt-1">
                {summary.invalidRecords}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">4. Duplicate Records</div>
              <div className="text-2xl font-bold text-red-700 font-mono tabular-nums mt-1">
                {summary.duplicateRecords}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">5. Missing APAAR IDs</div>
              <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-1">
                {summary.missingApaarIds}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">6. Seat Warnings</div>
              <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
                {summary.seatWarnings}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Row-by-Row Validation Preview
                </h2>
                <p className="text-xs text-slate-500">
                  Click "Correct Row" on any invalid record to fix missing APAAR IDs or programme mismatches and revalidate before uploading.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => runValidation(rawRows)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Revalidate File</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadErrorReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer"
                >
                  <FileWarning className="w-3.5 h-3.5" />
                  <span>Download Error Report</span>
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={handleConfirmUpload}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{uploading ? 'Uploading...' : 'Confirm & Upload Records'}</span>
                </button>
              </div>
            </div>

            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExceptions}
                  onChange={(e) => setIncludeExceptions(e.target.checked)}
                  className="rounded border-slate-300 text-blue-950"
                />
                <span>
                  Route invalid / missing APAAR rows into the <strong>APAAR Validation Exception Queue</strong> (unchecked = upload only valid rows)
                </span>
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4">Row</th>
                    <th className="py-3 px-4">Student ID & Name</th>
                    <th className="py-3 px-4">APAAR ID (Masked)</th>
                    <th className="py-3 px-4">Programme</th>
                    <th className="py-3 px-4">Validation Status</th>
                    <th className="py-3 px-4">Row-Level Findings</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {validationResults.map((r, idx) => (
                    <tr key={r.rowNumber} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-mono text-slate-500">#{r.rowNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{r.fullName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{r.studentId}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {editingRowIndex === idx ? (
                          <input
                            type="text"
                            value={editApaar}
                            onChange={(e) => setEditApaar(e.target.value)}
                            placeholder="12-digit APAAR"
                            className="px-2 py-1 text-xs font-mono border border-blue-900 rounded w-36"
                          />
                        ) : (
                          r.maskedApaarId
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {editingRowIndex === idx ? (
                          <select
                            value={editProgramme}
                            onChange={(e) => setEditProgramme(e.target.value)}
                            className="px-2 py-1 text-xs border border-blue-900 rounded"
                          >
                            <option value="Electronics and Communication Engineering">
                              Electronics and Communication Engineering
                            </option>
                            <option value="Artificial Intelligence and Data Science">
                              Artificial Intelligence and Data Science
                            </option>
                            <option value="Computer Science and Engineering">
                              Computer Science and Engineering
                            </option>
                          </select>
                        ) : (
                          r.programmeName
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold ${
                            r.isValid ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {r.validationStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {r.isValid ? (
                          <span className="text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Verified Repository
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {r.errors.map((err, i) => (
                              <div key={i} className="text-red-700 flex items-start gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{err}</span>
                              </div>
                            ))}
                            {r.warnings.map((warn, i) => (
                              <div key={i} className="text-amber-800 flex items-start gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{warn}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {editingRowIndex === idx ? (
                          <button
                            type="button"
                            onClick={() => handleSaveRowCorrection(idx)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-700 rounded-md"
                          >
                            Save & Revalidate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRowIndex(idx);
                              setEditApaar(r.rawApaarId || '789456123012');
                              setEditProgramme(
                                r.programmeName === 'Unapproved Quantum Robotics'
                                  ? 'Electronics and Communication Engineering'
                                  : r.programmeName
                              );
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-blue-900 hover:bg-blue-50 border border-slate-200 rounded-md"
                          >
                            Correct Row
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
