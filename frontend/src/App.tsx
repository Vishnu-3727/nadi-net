import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar, NavTab } from './components/Sidebar';
import { IncidentReportModal } from './components/IncidentReportModal';
import { CommandCentrePage } from './pages/CommandCentrePage';
import { FloodIntelligencePage } from './pages/FloodIntelligencePage';
import { GeospatialPage } from './pages/GeospatialPage';
import { RescueRoutingPage } from './pages/RescueRoutingPage';
import { ResourceOptimisationPage } from './pages/ResourceOptimisationPage';
import { ScenarioSimulatorPage } from './pages/ScenarioSimulatorPage';
import { HistoricalAnalysisPage } from './pages/HistoricalAnalysisPage';
import { SettingsProvenancePage } from './pages/SettingsProvenancePage';

import {
  CommandCenterOverviewData,
  RiskSummaryResponseData,
  RoadNetworkData,
  FacilitiesData,
  OptimisationResultData,
  ScenarioData,
  ZoneRiskAssessmentData,
} from './types';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('command');
  const [overview, setOverview] = useState<CommandCenterOverviewData | null>(null);
  const [riskData, setRiskData] = useState<RiskSummaryResponseData | null>(null);
  const [roadNetwork, setRoadNetwork] = useState<RoadNetworkData | null>(null);
  const [facilities, setFacilities] = useState<FacilitiesData | null>(null);
  const [allocations, setAllocations] = useState<OptimisationResultData | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('SCN-A');
  const [selectedZone, setSelectedZone] = useState<ZoneRiskAssessmentData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState<boolean>(false);
  const [reportedIncidents, setReportedIncidents] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAllData = async () => {
    try {
      const [ov, rk, rn, fc, al, sc] = await Promise.all([
        api.getDashboardOverview(),
        api.getRiskZones(),
        api.getRoadNetwork(),
        api.getFacilities(),
        api.getAllocations(),
        api.getScenarios(),
      ]);

      setOverview(ov);
      setRiskData(rk);
      setRoadNetwork(rn);
      setFacilities(fc);
      setAllocations(al);
      setScenarios(sc.scenarios);
      setActiveScenarioId(sc.active_scenario_id || 'SCN-A');
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Data fetch error:', err);
      setErrorMsg(err.message || 'Failed to connect to NADI-NET backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleResetScenario = async () => {
    setIsResetting(true);
    try {
      await api.resetScenario();
      await fetchAllData();
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSelectZone = (zone: ZoneRiskAssessmentData) => {
    setSelectedZone(zone);
  };

  const handleIncidentReported = (incident: any) => {
    setReportedIncidents((prev) => [incident, ...prev]);
    if (overview) {
      const newAlert = {
        id: incident.id,
        severity: incident.severity,
        zone_id: Number(incident.zone_id) || 2,
        zone_name: incident.zone_name,
        message: `${incident.location}: ${incident.category.toUpperCase()} (${incident.affected_count} stranded citizens)`,
        timestamp: incident.timestamp || 'Just now',
        action_required: incident.need_boat
          ? 'Dispatch Amphibious Motorboat & Rescue Team'
          : 'Dispatch High-Clearance 4WD Truck',
        provenance: 'SIMULATED' as const,
      };
      setOverview({
        ...overview,
        alerts: [newAlert, ...overview.alerts],
      });
    }
  };

  const availableZonesForModal = (riskData?.zones || []).map((z) => ({
    zone_id: z.zone_id,
    zone_name: z.name,
  }));

  return (
    <div className="flex flex-col h-screen w-screen bg-[#080a10] text-slate-100 overflow-hidden font-sans">
      {/* Persistent Disaster Operations TopBar */}
      <TopBar
        activeScenarioName={overview?.active_scenario_name || 'Scenario A (Moderate)'}
        activeSeverity={overview?.active_severity || 'MODERATE'}
        onReset={handleResetScenario}
        onOpenSOS={() => setIsSOSModalOpen(true)}
        isResetting={isResetting}
      />

      {/* Citizen SOS & Field Incident Modal (WeCare Inspired) */}
      <IncidentReportModal
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
        onIncidentReported={handleIncidentReported}
        availableZones={
          availableZonesForModal.length > 0
            ? availableZonesForModal
            : [
                { zone_id: 2, zone_name: 'Manali' },
                { zone_id: 13, zone_name: 'Adyar' },
                { zone_id: 14, zone_name: 'Perungudi' },
                { zone_id: 15, zone_name: 'Sholinganallur' },
              ]
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          unmetCount={allocations?.unmet_zones_count || 0}
          criticalCount={(overview?.alerts.length || 0) + reportedIncidents.length}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#080a10]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3 font-mono text-sm text-cyan-400">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <div>Connecting to NADI-NET Operational Grid...</div>
            </div>
          ) : errorMsg ? (
            <div className="p-6 rounded-xl border border-red-900 bg-red-950/30 text-center space-y-3 max-w-lg mx-auto mt-20">
              <div className="text-red-400 font-bold text-base">Backend Connection Notice</div>
              <p className="text-xs text-slate-300">{errorMsg}</p>
              <button
                onClick={fetchAllData}
                className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-mono cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'command' && (
                <CommandCentrePage
                  overview={overview}
                  zones={riskData?.zones || []}
                  roadNetwork={roadNetwork}
                  facilities={facilities}
                  allocations={allocations}
                  reportedIncidents={reportedIncidents}
                  onOpenSOS={() => setIsSOSModalOpen(true)}
                  onNavigateTab={setActiveTab}
                  onSelectZone={handleSelectZone}
                />
              )}

              {activeTab === 'flood_intelligence' && (
                <FloodIntelligencePage
                  riskData={riskData}
                  onRefreshRisk={fetchAllData}
                />
              )}

              {activeTab === 'geospatial' && (
                <GeospatialPage
                  zones={riskData?.zones || []}
                  roadNetwork={roadNetwork}
                  facilities={facilities}
                />
              )}

              {activeTab === 'routing' && (
                <RescueRoutingPage
                  roadNetwork={roadNetwork}
                  activeBlockedEdges={overview?.recent_activities ? (overview as any).total_blocked_roads > 0 ? ['E03', 'E18', 'E21'] : [] : []}
                />
              )}

              {activeTab === 'optimisation' && (
                <ResourceOptimisationPage
                  allocations={allocations}
                  onRefreshAllocations={fetchAllData}
                />
              )}

              {activeTab === 'simulator' && (
                <ScenarioSimulatorPage
                  scenarios={scenarios}
                  activeScenarioId={activeScenarioId}
                  overview={overview}
                  onSimulationComplete={fetchAllData}
                />
              )}

              {activeTab === 'history' && <HistoricalAnalysisPage />}

              {activeTab === 'settings' && <SettingsProvenancePage />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
