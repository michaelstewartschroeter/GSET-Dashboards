import { useMemo } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFilters } from '../../contexts/FilterContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, CheckCircle, XCircle, Zap } from 'lucide-react';
import { isWithinInterval, format, eachDayOfInterval } from 'date-fns';

const Availability: React.FC = () => {
  const { events } = useWebSocket();
  const { selectedStations, selectedBranches, dateRange, selectedAssetTypes } = useFilters();

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = new Date(event.data.happened_at);
      if (!isWithinInterval(eventDate, { start: dateRange.start, end: dateRange.end })) {
        return false;
      }

      if (selectedStations.length > 0) {
        const assetStation = event.asset_id.split('-')[0];
        if (!selectedStations.includes(assetStation)) {
          return false;
        }
      }

      if (selectedAssetTypes.length > 0) {
        if (!selectedAssetTypes.includes(event.name)) {
          return false;
        }
      }

      if (selectedBranches.length > 0) {
        if (!event.branch || !selectedBranches.includes(event.branch)) {
          return false;
        }
      }

      return true;
    });
  }, [events, selectedStations, selectedBranches, dateRange, selectedAssetTypes]);

  // Calculate availability metrics
  const availabilityMetrics = useMemo(() => {
    const assetStates = new Map<string, { available: number; unavailable: number }>();

    filteredEvents.forEach((event) => {
      const assetType = event.name;
      if (!assetStates.has(assetType)) {
        assetStates.set(assetType, { available: 0, unavailable: 0 });
      }

      const state = assetStates.get(assetType)!;
      
      // Consider charging events as unavailable, everything else as available
      if (event.data.event_details_type === 'charging') {
        state.unavailable += event.data.duration;
      } else {
        state.available += event.data.duration;
      }
    });

    return Array.from(assetStates.entries())
      .map(([type, states]) => {
        const total = states.available + states.unavailable;
        const availabilityPct = total > 0 ? (states.available / total) * 100 : 100;
        return {
          type,
          availability: availabilityPct.toFixed(1),
          available: states.available,
          unavailable: states.unavailable,
        };
      })
      .sort((a, b) => parseFloat(b.availability) - parseFloat(a.availability));
  }, [filteredEvents]);

  // Time series data
  const availabilityOverTime = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map((day) => {
      const dayStr = format(day, 'MMM dd');
      const dayEvents = filteredEvents.filter((e) => {
        const eventDate = new Date(e.data.happened_at);
        return format(eventDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });

      let available = 0;
      let unavailable = 0;

      dayEvents.forEach((event) => {
        if (event.data.event_details_type === 'charging') {
          unavailable += event.data.duration;
        } else {
          available += event.data.duration;
        }
      });

      return {
        date: dayStr,
        available: ((available / (available + unavailable || 1)) * 100).toFixed(1),
        unavailable: ((unavailable / (available + unavailable || 1)) * 100).toFixed(1),
      };
    });
  }, [filteredEvents, dateRange]);

  const fleetAvailability = useMemo(() => {
    const total = availabilityMetrics.reduce((sum, item) => sum + parseFloat(item.availability), 0);
    return (total / (availabilityMetrics.length || 1)).toFixed(1);
  }, [availabilityMetrics]);

  const totalAssets = new Set(filteredEvents.map((e) => e.asset_id)).size;
  const availableCount = Math.floor(totalAssets * (parseFloat(fleetAvailability) / 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">GSE Asset Availability Rate</h1>
        <p className="text-gray-400">Real-time equipment availability and serviceability</p>
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
            <Zap className="w-5 h-5 text-primary-cyan" />
          </div>
          <div className="text-3xl font-bold text-white">{totalAssets}</div>
          <div className="text-gray-400 text-sm mt-2">Across all stations</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Asset Types Monitored</span>
            <Activity className="w-5 h-5 text-primary-cyan" />
          </div>
          <div className="text-3xl font-bold text-white">{availabilityMetrics.length}</div>
          <div className="text-gray-400 text-sm mt-2">Different equipment types</div>
        </div>
      </div>

      {/* Availability Over Time */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Availability Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={availabilityOverTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis dataKey="date" stroke="#8B949E" />
            <YAxis stroke="#8B949E" label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161B22',
                border: '1px solid #30363D',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Area type="monotone" dataKey="available" stackId="1" stroke="#10B981" fill="#10B981" name="Available" />
            <Area type="monotone" dataKey="unavailable" stackId="1" stroke="#EF4444" fill="#EF4444" name="Unavailable" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Real-time Status Grid */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Availability by Asset Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availabilityMetrics.map((metric) => {
            const pct = parseFloat(metric.availability);
            const isGood = pct >= 90;
            const isWarning = pct >= 70 && pct < 90;
            
            return (
              <div key={metric.type} className="bg-dark-bg border border-dark-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white">{metric.type}</span>
                  <div className={`w-3 h-3 rounded-full ${isGood ? 'bg-green-500' : isWarning ? 'bg-yellow-500' : 'bg-red-500'}`} />
                </div>
                <div className="mb-2">
                  <div className="text-2xl font-bold text-white">{metric.availability}%</div>
                  <div className="text-xs text-gray-400">availability</div>
                </div>
                <div className="w-full bg-dark-hover rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${isGood ? 'bg-green-500' : isWarning ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${metric.availability}%` }}
                  />
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
