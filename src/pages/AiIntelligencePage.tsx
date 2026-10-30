import React, { useState } from 'react';
import {
  Cpu,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Building2,
  Lock,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { RiskLevel } from '../types/domain';

export const AiIntelligencePage: React.FC = () => {
  const { anomalies, analyzeAnomaliesWithAi, notify } = usePlatform();

  const [aiReport, setAiReport] = useState<{
    source: string;
    summary: string;
    recommendations: string[];
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  const highCount = anomalies.filter((a) => a.riskLevel === RiskLevel.HIGH).length;
  const mediumCount = anomalies.filter((a) => a.riskLevel === RiskLevel.MEDIUM).length;
  const lowCount = anomalies.filter((a) => a.riskLevel === RiskLevel.LOW).length;

  const filteredAnomalies = anomalies.filter(
    (a) => riskFilter === 'ALL' || a.riskLevel === riskFilter
  );

  const handleRunAiAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await analyzeAnomaliesWithAi();
      setAiReport(res);
      notify(
        'AI Anomaly Brief Generated',
        `Analysis completed via ${res.source}.`,
        'success'
      );
    } catch (err) {
      notify('Analysis Error', err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            AI Admission Intelligence — Pattern & Anomaly Detection
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Hybrid deterministic rule engine + privacy-preserving server-side Gemini summarization for institutional admission patterns.
          </p>
        </div>

        <button
          type="button"
          disabled={analyzing}
          onClick={handleRunAiAnalysis}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 text-teal-300" />
          <span>
            {analyzing
              ? 'Generating Executive Brief...'
              : 'Generate AI Anomaly Investigation Brief'}
          </span>
        </button>
      </div>

      {/* Safeguard & Privacy Policy Notice */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
        <Lock className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900">Human-in-the-Loop & Zero-PII Policy:</strong> Raw 12-digit APAAR IDs and student personal details are never transmitted to external AI models. Anomaly detection runs deterministically on the server first, and AI output is strictly advisory—human administrator review is required for all compliance decisions.
        </div>
      </div>

      {/* Risk Level Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setRiskFilter('ALL')}
          className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
            riskFilter === 'ALL'
              ? 'bg-blue-950 text-white border-blue-950'
              : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs opacity-80">Total Detected Patterns</div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1">
            {anomalies.length}
          </div>
          <div className="text-[11px] opacity-75 mt-1">6 Deterministic Rule Classes</div>
        </button>

        <button
          type="button"
          onClick={() => setRiskFilter(RiskLevel.HIGH)}
          className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
            riskFilter === RiskLevel.HIGH
              ? 'bg-blue-950 text-white border-blue-950'
              : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs opacity-80">High Risk</div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-red-600">
            {highCount}
          </div>
          <div className="text-[11px] opacity-75 mt-1">Immediate Registrar Audit</div>
        </button>

        <button
          type="button"
          onClick={() => setRiskFilter(RiskLevel.MEDIUM)}
          className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
            riskFilter === RiskLevel.MEDIUM
              ? 'bg-blue-950 text-white border-blue-950'
              : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs opacity-80">Medium Risk</div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-amber-600">
            {mediumCount}
          </div>
          <div className="text-[11px] opacity-75 mt-1">Batch & Missing ID Checks</div>
        </button>

        <button
          type="button"
          onClick={() => setRiskFilter(RiskLevel.LOW)}
          className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
            riskFilter === RiskLevel.LOW
              ? 'bg-blue-950 text-white border-blue-950'
              : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs opacity-80">Low Risk</div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-teal-700">
            {lowCount}
          </div>
          <div className="text-[11px] opacity-75 mt-1">Data Formatting Hygiene</div>
        </button>
      </div>

      {/* Executive AI Investigation Brief (if generated) */}
      {aiReport && (
        <div className="bg-blue-950 text-white rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-900 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-bold">
                AI Admission Intelligence — Executive Investigation Summary
              </h2>
            </div>
            <span className="text-xs font-mono text-teal-300">{aiReport.source}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
            {aiReport.summary}
          </p>
          <div className="pt-3 border-t border-blue-900">
            <div className="text-xs font-bold text-teal-300 mb-2">
              Recommended Administrative Actions:
            </div>
            <ul className="space-y-1.5 text-xs text-slate-200">
              {aiReport.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Detected Anomaly Cards */}
      <div className="space-y-4">
        {filteredAnomalies.map((anom) => {
          const isAck = acknowledgedIds.includes(anom.id) || anom.status === 'Acknowledged';
          return (
            <div
              key={anom.id}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      anom.riskLevel === RiskLevel.HIGH
                        ? 'text-red-600'
                        : anom.riskLevel === RiskLevel.MEDIUM
                        ? 'text-amber-600'
                        : 'text-teal-700'
                    }`}
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {anom.anomalyType}
                      </h3>
                      <span
                        className={`text-xs font-bold ${
                          anom.riskLevel === RiskLevel.HIGH
                            ? 'text-red-700'
                            : anom.riskLevel === RiskLevel.MEDIUM
                            ? 'text-amber-700'
                            : 'text-teal-700'
                        }`}
                      >
                        · {anom.riskLevel}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>
                        Affected Institution: <strong className="text-slate-800">{anom.institutionName}</strong> · Programme: {anom.programmeName} · Affected Records: <strong className="font-mono">{anom.affectedRecordsCount}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!acknowledgedIds.includes(anom.id)) {
                        setAcknowledgedIds([...acknowledgedIds, anom.id]);
                        notify(
                          'Anomaly Acknowledged',
                          `Assigned ${anom.anomalyType} for human administrator review.`,
                          'info'
                        );
                      }
                    }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      isAck
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {isAck ? 'Marked for Registrar Review' : 'Assign Human Review'}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                <strong>Pattern Explanation:</strong> {anom.explanation}
              </p>

              <div>
                <div className="text-xs font-semibold text-slate-800 mb-2">
                  Suggested Investigation Steps:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {anom.suggestedSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 flex items-start gap-2"
                    >
                      <span className="font-mono font-bold text-blue-900">0{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
