import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Send,
  Droplets,
  LifeBuoy,
  HeartPulse,
  Ban,
  Zap,
  MapPin,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onIncidentReported: (incident: any) => void;
  availableZones: Array<{ zone_id: number | string; zone_name: string }>;
}

export const IncidentReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onIncidentReported,
  availableZones,
}) => {
  const [category, setCategory] = useState<string>('inundation');
  const [selectedZone, setSelectedZone] = useState<string>(
    String(availableZones[0]?.zone_id || '2')
  );
  const [locationName, setLocationName] = useState<string>('');
  const [severity, setSeverity] = useState<'MODERATE' | 'SEVERE' | 'CRITICAL'>('CRITICAL');
  const [affectedCount, setAffectedCount] = useState<number>(15);
  const [needBoat, setNeedBoat] = useState<boolean>(true);
  const [needMedical, setNeedMedical] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const categories = [
    { id: 'inundation', label: 'Severe Inundation', icon: Droplets, color: 'text-cyan-400 border-cyan-800 bg-cyan-950/40' },
    { id: 'stranded', label: 'Stranded Citizens', icon: LifeBuoy, color: 'text-amber-400 border-amber-800 bg-amber-950/40' },
    { id: 'medical', label: 'Medical Distress', icon: HeartPulse, color: 'text-rose-400 border-rose-800 bg-rose-950/40' },
    { id: 'road_cut', label: 'Road / Bridge Cut', icon: Ban, color: 'text-red-400 border-red-800 bg-red-950/40' },
    { id: 'grid_fail', label: 'Substation Hazard', icon: Zap, color: 'text-yellow-400 border-yellow-800 bg-yellow-950/40' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const zoneObj = availableZones.find((z) => String(z.zone_id) === String(selectedZone));
    const newIncident = {
      id: `INC-${Date.now().toString().slice(-4)}`,
      category,
      zone_id: selectedZone,
      zone_name: zoneObj?.zone_name || selectedZone,
      location: locationName || `${zoneObj?.zone_name || 'Sector'} Main Corridor`,
      severity,
      affected_count: affectedCount,
      need_boat: needBoat,
      need_medical: needMedical,
      notes,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' IST',
      status: 'DISPATCH_QUEUED',
    };

    onIncidentReported(newIncident);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e1726] border border-cyan-800/60 rounded-2xl shadow-2xl shadow-cyan-950/50 overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#0e1726] to-cyan-950/50 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Citizen SOS & Field Incident Dispatch
              </h3>
              <p className="text-[11px] text-slate-400">
                Direct relay to GCC Command Centre & TNFRS Dispatch Grid
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Incident Broadcasted to Command Grid</h4>
            <p className="text-xs text-slate-400">
              Assigned rescue units and nearest staging depots have received coordinates.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Category Selector */}
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                Incident Classification
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center space-x-2 p-2.5 rounded-xl border text-left text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? `${cat.color} border-current shadow-md shadow-cyan-950/40 scale-[1.02]`
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zone & Location Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Target GCC Zone</span>
                </label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {availableZones.map((z) => (
                    <option key={z.zone_id} value={z.zone_id}>
                      {z.zone_id}: {z.zone_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                  Specific Landmark / Street
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100ft Road / Near Metro Station"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Urgency & Affected Persons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                  Severity Tier
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['MODERATE', 'SEVERE', 'CRITICAL'] as const).map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setSeverity(lvl)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold font-mono tracking-wider border cursor-pointer transition ${
                        severity === lvl
                          ? lvl === 'CRITICAL'
                            ? 'bg-red-500/20 border-red-500 text-red-400'
                            : lvl === 'SEVERE'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                            : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Est. Stranded People ({affectedCount})</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={affectedCount}
                  onChange={(e) => setAffectedCount(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Special Needs Toggles */}
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={needBoat}
                  onChange={(e) => setNeedBoat(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 w-4 h-4"
                />
                <span>Boat Rescue Essential (Water &gt; 1.0m)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={needMedical}
                  onChange={(e) => setNeedMedical(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0 w-4 h-4"
                />
                <span>Critical Medical Patient Present</span>
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Field Notes / Accessibility Hazards
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Ground floor inundated, 4 elderly citizens on first-floor balcony..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-900/40 flex items-center space-x-2 cursor-pointer transition transform active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit SOS Incident</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
