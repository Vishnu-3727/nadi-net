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
    { id: 'inundation', label: 'Severe Inundation', icon: Droplets, color: 'text-sky-700 border-sky-200 bg-sky-50' },
    { id: 'stranded', label: 'Stranded Citizens', icon: LifeBuoy, color: 'text-amber-700 border-amber-200 bg-amber-50' },
    { id: 'medical', label: 'Medical Distress', icon: HeartPulse, color: 'text-rose-700 border-rose-200 bg-rose-50' },
    { id: 'road_cut', label: 'Road / Bridge Cut', icon: Ban, color: 'text-red-700 border-red-200 bg-red-50' },
    { id: 'grid_fail', label: 'Substation Hazard', icon: Zap, color: 'text-amber-800 border-amber-200 bg-amber-50' },
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Citizen SOS & Field Incident Dispatch
              </h3>
              <p className="text-[11px] text-slate-500">
                Direct relay to GCC Command Centre & TNFRS Dispatch Grid
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Incident Broadcasted to Command Grid</h4>
            <p className="text-xs text-slate-600">
              Assigned rescue units and nearest staging depots have received coordinates.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Category Selector */}
            <div>
              <label className="block text-[11px] font-mono text-slate-600 uppercase tracking-wider mb-2 font-bold">
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
                      className={`flex items-center space-x-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? `${cat.color} border-current shadow-xs scale-[1.02]`
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                <label className="block text-[11px] font-mono text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1 font-bold">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Target GCC Zone</span>
                </label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800 cursor-pointer font-medium"
                >
                  {availableZones.map((z) => (
                    <option key={z.zone_id} value={z.zone_id}>
                      {z.zone_id}: {z.zone_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-600 uppercase tracking-wider mb-1.5 font-bold">
                  Specific Landmark / Street
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100ft Road / Near Metro Station"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 font-medium"
                />
              </div>
            </div>

            {/* Urgency & Affected Persons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-600 uppercase tracking-wider mb-1.5 font-bold">
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
                            ? 'bg-red-600 border-red-700 text-white'
                            : lvl === 'SEVERE'
                            ? 'bg-amber-600 border-amber-700 text-white'
                            : 'bg-emerald-600 border-emerald-700 text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1 font-bold">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Est. Stranded People ({affectedCount})</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={affectedCount}
                  onChange={(e) => setAffectedCount(Number(e.target.value))}
                  className="w-full accent-slate-800 cursor-pointer"
                />
              </div>
            </div>

            {/* Special Needs Toggles */}
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={needBoat}
                  onChange={(e) => setNeedBoat(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0 w-4 h-4"
                />
                <span>Boat Rescue Essential (Water &gt; 1.0m)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={needMedical}
                  onChange={(e) => setNeedMedical(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-0 w-4 h-4"
                />
                <span>Critical Medical Patient Present</span>
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-mono text-slate-600 uppercase tracking-wider mb-1.5 font-bold">
                Field Notes / Accessibility Hazards
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Ground floor inundated, 4 elderly citizens on first-floor balcony..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 resize-none font-medium"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center space-x-2 cursor-pointer transition transform active:scale-95"
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
