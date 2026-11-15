import React, { useState } from 'react';
import {
  Waves,
  Sliders,
  CheckCircle2,
  Info,
  HelpCircle,
  BarChart2,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { ZoneRiskAssessmentData, RiskSummaryResponseData } from '../types';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { api } from '../services/api';

interface Props {
  riskData: RiskSummaryResponseData | null;
  onRefreshRisk: () => void;
}

export const FloodIntelligencePage: React.FC<Props> = ({ riskData, onRefreshRisk }) => {
  const [rainfallInput, setRainfallInput] = useState<number>(180);
  const [waterLevelInput, setWaterLevelInput] = useState<number>(0.6);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<RiskSummaryResponseData | null>(null);

  // Editable MCDA weights
  const [weights, setWeights] = useState({
    rainfall: 0.25,
    elevation: 0.20,
    historical: 0.20,
    drainage: 0.15,
    water_level: 0.10,
    vulnerability: 0.10,
  });

  const activeSummary = evalResult || riskData;

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const res = await api.evaluateRisk({
        rainfall_intensity_mm: rainfallInput,
        water_level_index: waterLevelInput,
        weights: weights,
      });
      setEvalResult(res);
    } catch (err) {
      alert(`Evaluation error: ${err}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const chartData = (activeSummary?.zones || []).map((z) => ({
    name: z.name.length > 8 ? z.name.slice(0, 7) + '..' : z.name,
    fullName: z.name,
    zoneId: z.zone_id,
    riskScore: z.flood_risk_score,
    rainfall: z.contributing_factors.rainfall_contribution,
    elevation: z.contributing_factors.elevation_contribution,
    historical: z.contributing_factors.historical_contribution,
    drainage: z.contributing_factors.drainage_contribution,
    waterLevel: z.contributing_factors.water_level_contribution,
    vulnerability: z.contributing_factors.vulnerability_contribution,
    category: z.risk_category,
  }));

  const getBarColor = (category: string) => {
    if (category === 'Critical') return '#ef4444';
    if (category === 'Very High') return '#f97316';
    if (category === 'High') return '#f59e0b';
    if (category === 'Moderate') return '#0284c7';
    return '#10b981';
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header & Scientific Notice */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <Waves className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Flood Intelligence Engine — Explainable Multi-Criteria Analysis (MCDA)
            </h2>
            <ProvenanceBadge provenance="MODEL_ESTIMATE" size="sm" />
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Calculates zone vulnerability via mathematically normalized environmental and historical parameters.
            All weights and factor contributions are transparent and configurable.
          </p>
        </div>
      </div>

      {/* Interactive Weight Simulator & Parameter Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Configurable Risk Weights</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Sum: 1.00</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Rainfall Weight (w_rain):</span>
                <span className="font-mono font-bold text-indigo-700">{weights.rainfall.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.05"
                value={weights.rainfall}
                onChange={(e) => setWeights({ ...weights, rainfall: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Elevation Deficit Weight (w_elev):</span>
                <span className="font-mono font-bold text-indigo-700">{weights.elevation.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.4"
                step="0.05"
                value={weights.elevation}
                onChange={(e) => setWeights({ ...weights, elevation: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Historical Flood Risk (w_hist):</span>
                <span className="font-mono font-bold text-indigo-700">{weights.historical.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.4"
                step="0.05"
                value={weights.historical}
                onChange={(e) => setWeights({ ...weights, historical: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Drainage Density Weight (w_drain):</span>
                <span className="font-mono font-bold text-indigo-700">{weights.drainage.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.3"
                step="0.05"
                value={weights.drainage}
                onChange={(e) => setWeights({ ...weights, drainage: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div>
                <div className="flex justify-between text-slate-700 font-medium mb-1">
                  <span>Rainfall Input (24h mm):</span>
                  <span className="font-mono font-bold text-slate-900">{rainfallInput} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={rainfallInput}
                  onChange={(e) => setRainfallInput(parseInt(e.target.value))}
                  className="w-full accent-slate-800 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 font-medium mb-1">
                  <span>Waterbody Sensor Proxy (0-1):</span>
                  <span className="font-mono font-bold text-slate-900">{waterLevelInput.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={waterLevelInput}
                  onChange={(e) => setWaterLevelInput(parseFloat(e.target.value))}
                  className="w-full accent-slate-800 cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <span>{isEvaluating ? 'Evaluating MCDA Model...' : 'Re-evaluate Risk Scores'}</span>
            </button>
          </div>
        </div>

        {/* Risk Score Chart (2 cols) */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                15 GCC ZONES — FLOOD RISK SCORE SPECTRUM
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Average Risk: <b className="text-slate-900">{activeSummary?.average_risk_score} / 100</b> | Exposed Population:{' '}
                <b className="text-amber-700">{activeSummary?.total_exposed_population.toLocaleString()}</b>
              </p>
            </div>
            <ProvenanceBadge provenance="MODEL_ESTIMATE" size="sm" />
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <div className="font-bold text-slate-900">
                            Zone {data.zoneId}: {data.fullName}
                          </div>
                          <div className="text-amber-700 font-mono font-bold">
                            Score: {data.riskScore} / 100 ({data.category})
                          </div>
                          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 space-y-0.5 font-mono">
                            <div>Rainfall: {data.rainfall} pts</div>
                            <div>Elevation: {data.elevation} pts</div>
                            <div>Historical: {data.historical} pts</div>
                            <div>Drainage: {data.drainage} pts</div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="riskScore" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.category)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono pt-3 border-t border-slate-100">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-red-500" />
              <span className="text-slate-700 font-medium">Critical (81–100)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-orange-500" />
              <span className="text-slate-700 font-medium">Very High (61–80)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-slate-700 font-medium">High (41–60)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-sky-600" />
              <span className="text-slate-700 font-medium">Moderate (21–40)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-slate-700 font-medium">Low (0–20)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Zones Table */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            Chennai 15 Municipal Administrative Zones — Vulnerability Registry
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {activeSummary?.zones.length} Zones Assessed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">Zone</th>
                <th className="py-2.5 px-3">Region</th>
                <th className="py-2.5 px-3">Elevation</th>
                <th className="py-2.5 px-3">Population</th>
                <th className="py-2.5 px-3">Exposed Pop.</th>
                <th className="py-2.5 px-3">Risk Score</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Response Priority</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
              {(activeSummary?.zones || []).map((z) => (
                <tr key={z.zone_id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    Zone {z.zone_id}: {z.name}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{z.region}</td>
                  <td className="py-2.5 px-3">{z.baseline_elevation_m} m</td>
                  <td className="py-2.5 px-3">{z.population.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-semibold text-amber-700">
                    {z.estimated_exposed_population.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{z.flood_risk_score}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        z.risk_category === 'Critical'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : z.risk_category === 'Very High'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : z.risk_category === 'High'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {z.risk_category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-indigo-700">Priority {z.recommended_priority}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{(z.data_confidence * 100).toFixed(0)}%</td>
                  <td className="py-2.5 px-3">
                    <ProvenanceBadge provenance={z.provenance} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
