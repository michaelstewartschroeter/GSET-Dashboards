import { useMemo } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFilters } from '../../contexts/FilterContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { Activity, CheckCircle, XCircle } from 'lucide-react';
import { isWithinInterval, format, eachDayOfInterval, addMinutes, isSameDay } from 'date-fns';

// ─── State buckets ──────────────────────────────────────────────────────────
// Available  : idle, use, move  (parked/ready or in transit, accessible)
// Allocated  : working, busy    (assigned to a task, not free)
// Charging   : charging         (on charge, not deployable)
// Maintenance: data_trouble_code_start, e_stop (fault / emergency stop)

const STATE = {
  available:   ['idle', 'use', 'move'],
  allocated:   ['working', 'busy'],
  charging:    ['charging'],
  maintenance: ['data_trouble_code_start', 'e_stop'],
};

function getState(eventType: string): keyof typeof STATE | null {
  for (const [key, types] of Object.entries(STATE)) {
    if (types.includes(eventType)) return key as keyof typeof STATE;
  }
  return null;
}

const Availability: React.FC = () => {
  const { events } = useWebSocket();
  const { selectedStations, selectedBranches, dateRange, selectedAssetTypes } = useFilters();

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (getState(event.data.event_details_type) === null) return false;

      const eventDate = new Date(event.data.happened_at);
      if (!isWithinInterval(eventDate, { start: dateRange.start, end: dateRange.end })) return false;

      if (selectedStations.length > 0) {
        const assetStation = event.asset_id.split('-')[0];
        if (!selectedStations.includes(assetStation)) return false;
      }

      if (selectedAssetTypes.length > 0) {
        if (!selectedAssetTypes.includes(event.name)) return false;
      }

      if (selectedBranches.length > 0) {
        if (!event.branch || !selectedBranches.includes(event.branch)) return false;
      }

      return true;
    });
  }, [events, selectedStations, selectedBranches, dateRange, selectedAssetTypes]);

  // ── Per-asset-type duration breakdown ──────────────────────────────────────
  const byAssetType = useMemo(() => {
    const map = new Map<string, Record<keyof typeof STATE, number>>();

    filteredEvents.forEach((event) => {
      const s = getState(event.data.event_details_type);
      if (!s) return;
      if (!map.has(event.name)) {
        map.set(event.name, { available: 0, allocated: 0, charging: 0, maintenance: 0 });
      }
      map.get(event.name)![s] += event.data.duration;
    });

    return Array.from(map.entries()).map(([type, dur]) => {
      const total = dur.available + dur.allocated + dur.charging + dur.maintenance;
      const availPct = total > 0 ? (dur.available / total) * 100 : 0;
      return {
        type,
        availability: parseFloat(availPct.toFixed(1)),
        availablePct:   parseFloat(((dur.available   / (total || 1)) * 100).toFixed(1)),
        allocatedPct:   parseFloat(((dur.allocated   / (total || 1)) * 100).toFixed(1)),
        chargingPct:    parseFloat(((dur.charging    / (total || 1)) * 100).toFixed(1)),
        maintenancePct: parseFloat(((dur.maintenance / (total || 1)) * 100).toFixed(1)),
      };
    }).sort((a, b) => b.availability - a.availability);
  }, [filteredEvents]);

  // ── Daily trend (fleet-wide) ────────────────────────────────────────────────
  const overTime = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    return days.map((day) => {
      const dayStr = format(day, 'MMM dd');
      const dayEvents = filteredEvents.filter(
        (e) => format(new Date(e.data.happened_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );

      const dur = { available: 0, allocated: 0, charging: 0, maintenance: 0 };
      dayEvents.forEach((e) => {
        const s = getState(e.data.event_details_type);
        if (s) dur[s] += e.data.duration;
      });

      const total = dur.available + dur.allocated + dur.charging + dur.maintenance || 1;
      return {
        date: dayStr,
        Available:    parseFloat(((dur.available   / total) * 100).toFixed(1)),
        Allocated:    parseFloat(((dur.allocated   / total) * 100).toFixed(1)),
        Charging:     parseFloat(((dur.charging    / total) * 100).toFixed(1)),
        Maintenance:  parseFloat(((dur.maintenance / total) * 100).toFixed(1)),
      };
    });
  }, [filteredEvents, dateRange]);

  // ── 15-minute buckets (used when dateRange spans a single day) ─────────────
  const isSingleDay = isSameDay(dateRange.start, dateRange.end);

  const overTime15min = useMemo(() => {
    if (!isSingleDay) return [];
    const slots: { date: string; Available: number; Allocated: number; Charging: number; Maintenance: number }[] = [];
    let cursor = new Date(dateRange.start);
    const rangeEnd = new Date(dateRange.end);
    while (cursor <= rangeEnd) {
      const slotStart = new Date(cursor);
      const slotEnd   = addMinutes(cursor, 15);
      const label     = format(slotStart, 'HH:mm');
      const slotEvents = filteredEvents.filter((e) => {
        const t = new Date(e.data.happened_at);
        return t >= slotStart && t < slotEnd;
      });
      const dur = { available: 0, allocated: 0, charging: 0, maintenance: 0 };
      slotEvents.forEach((e) => {
        const s = getState(e.data.event_details_type);
        if (s) dur[s] += e.data.duration;
      });
      const total = dur.available + dur.allocated + dur.charging + dur.maintenance || 1;
      slots.push({
        date: label,
        Available:    parseFloat(((dur.available   / total) * 100).toFixed(1)),
        Allocated:    parseFloat(((dur.allocated   / total) * 100).toFixed(1)),
        Charging:     parseFloat(((dur.charging    / total) * 100).toFixed(1)),
        Maintenance:  parseFloat(((dur.maintenance / total) * 100).toFixed(1)),
      });
      cursor = slotEnd;
    }
    return slots;
  }, [filteredEvents, dateRange, isSingleDay]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const fleetAvailability = useMemo(() => {
    if (!byAssetType.length) return 0;
    return parseFloat(
      (byAssetType.reduce((s, r) => s + r.availability, 0) / byAssetType.length).toFixed(1)
    );
  }, [byAssetType]);

  const totalAssets  = new Set(filteredEvents.map((e) => e.asset_id)).size;
  const availableCount = Math.round(totalAssets * (fleetAvailability / 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">GSE Asset Availability</h1>
        <p className="text-gray-400">
          True availability: units are unavailable when charging, allocated to a task, or in maintenance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Fleet Availability</span>
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-white">{fleetAvailability}%</div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-400">{availableCount} available</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-400">{totalAssets - availableCount} unavailable</span>
            </div>
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Tracked Assets</span>
            <Activity className="w-5 h-5 text-primary-cyan" />
          </div>
          <div className="text-3xl font-bold text-white">{totalAssets}</div>
          <div className="text-gray-400 text-sm mt-2">Across all stations</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Asset Types Monitored</span>
            <Activity className="w-5 h-5 text-primary-cyan" />
          </div>
          <div className="text-3xl font-bold text-white">{byAssetType.length}</div>
          <div className="text-gray-400 text-sm mt-2">Different equipment types</div>
        </div>
      </div>

      {/* State legend */}
      <div className="flex flex-wrap gap-4">
        {[
          { label: 'Available',    color: 'bg-green-500' },
          { label: 'Allocated',    color: 'bg-blue-500' },
          { label: 'Charging',     color: 'bg-yellow-500' },
          { label: 'Maintenance',  color: 'bg-red-500' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-sm text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Stacked area — daily trend or 15-min when on today */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {isSingleDay ? 'Fleet State Distribution — 15-Minute Intervals' : 'Fleet State Distribution Over Time'}
          </h2>
          {isSingleDay && (
            <span className="text-xs text-primary-cyan bg-primary-cyan/10 border border-primary-cyan/30 rounded px-2 py-1">
              Today · 15-min granularity
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={isSingleDay ? overTime15min : overTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis
              dataKey="date"
              stroke="#8B949E"
              interval={isSingleDay ? 3 : 0}
              tick={{ fontSize: isSingleDay ? 11 : 12 }}
            />
            <YAxis stroke="#8B949E" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              formatter={(value: number) => `${value}%`}
              contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '8px' }}
            />
            <Legend />
            <Area type="monotone" dataKey="Available"   stackId="1" stroke="#10B981" fill="#10B981" />
            <Area type="monotone" dataKey="Allocated"   stackId="1" stroke="#3B82F6" fill="#3B82F6" />
            <Area type="monotone" dataKey="Charging"    stackId="1" stroke="#EAB308" fill="#EAB308" />
            <Area type="monotone" dataKey="Maintenance" stackId="1" stroke="#EF4444" fill="#EF4444" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stacked bar — per asset type */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">State Breakdown by Asset Type</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={byAssetType} margin={{ bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis dataKey="type" stroke="#8B949E" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
            <YAxis stroke="#8B949E" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              formatter={(value: number) => `${value}%`}
              contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '8px' }}
            />
            <Legend />
            <Bar dataKey="availablePct"   name="Available"   stackId="a" fill="#10B981" />
            <Bar dataKey="allocatedPct"   name="Allocated"   stackId="a" fill="#3B82F6" />
            <Bar dataKey="chargingPct"    name="Charging"    stackId="a" fill="#EAB308" />
            <Bar dataKey="maintenancePct" name="Maintenance" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-type availability cards */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Availability by Asset Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {byAssetType.map((metric) => {
            const isGood    = metric.availability >= 60;
            const isWarning = metric.availability >= 40 && metric.availability < 60;
            return (
              <div key={metric.type} className="bg-dark-bg border border-dark-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white truncate">{metric.type}</span>
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isGood ? 'bg-green-500' : isWarning ? 'bg-yellow-500' : 'bg-red-500'}`} />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{metric.availability}%</div>
                <div className="text-xs text-gray-400 mb-3">available</div>
                {/* Segmented progress bar */}
                <div className="w-full flex rounded-full h-2 overflow-hidden">
                  <div className="bg-green-500  h-2" style={{ width: `${metric.availablePct}%` }} />
                  <div className="bg-blue-500   h-2" style={{ width: `${metric.allocatedPct}%` }} />
                  <div className="bg-yellow-500 h-2" style={{ width: `${metric.chargingPct}%` }} />
                  <div className="bg-red-500    h-2" style={{ width: `${metric.maintenancePct}%` }} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-500">
                  <span>Allocated {metric.allocatedPct}%</span>
                  <span>Charging {metric.chargingPct}%</span>
                  <span className="text-red-400">Maint. {metric.maintenancePct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Availability;
