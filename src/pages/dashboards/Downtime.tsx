import { useMemo } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFilters } from '../../contexts/FilterContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { isWithinInterval } from 'date-fns';

const Downtime: React.FC = () => {
  const { events } = useWebSocket();
  const { selectedStations, selectedBranches, dateRange, selectedAssetTypes } = useFilters();

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Consider charging, idle as downtime events
      if (!['charging', 'idle'].includes(event.data.event_details_type)) {
        return false;
      }

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

  // Calculate downtime by asset type
  const downtimeByAssetType = useMemo(() => {
    const downtimeMap = new Map<string, { charging: number; idle: number; total: number }>();

    filteredEvents.forEach((event) => {
      const assetType = event.name;
      if (!downtimeMap.has(assetType)) {
        downtimeMap.set(assetType, { charging: 0, idle: 0, total: 0 });
      }

      const data = downtimeMap.get(assetType)!;
      const hours = event.data.duration / 3600;

      if (event.data.event_details_type === 'charging') {
        data.charging += hours;
      } else {
        data.idle += hours;
      }
      data.total += hours;
    });

    return Array.from(downtimeMap.entries())
      .map(([type, data]) => ({
        type,
        charging: data.charging.toFixed(1),
        idle: data.idle.toFixed(1),
        total: data.total.toFixed(1),
      }))
      .sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
  }, [filteredEvents]);

  // Recent downtime events
  const recentDowntimeEvents = useMemo(() => {
    return filteredEvents
      .slice(0, 10)
      .map((event) => ({
        assetId: event.asset_id,
        type: event.data.event_details_type,
        duration: event.data.duration,
        timestamp: event.data.happened_at,
        assetType: event.name,
      }));
  }, [filteredEvents]);

  const totalDowntimeHours = useMemo(() => {
    return filteredEvents.reduce((sum, e) => sum + e.data.duration / 3600, 0);
  }, [filteredEvents]);

  const avgDowntimePerAsset = useMemo(() => {
    const uniqueAssets = new Set(filteredEvents.map((e) => e.asset_id)).size;
    return uniqueAssets > 0 ? (totalDowntimeHours / uniqueAssets).toFixed(1) : '0.0';
  }, [filteredEvents, totalDowntimeHours]);

  const worstAssetType = downtimeByAssetType[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Asset Downtime Analysis</h1>
        <p className="text-gray-400">Tracking non-operational periods by asset type</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Downtime</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-white">{totalDowntimeHours.toFixed(0)} hrs</div>
          <div className="text-gray-400 text-sm mt-2">Across all assets</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Avg per Asset</span>
            <TrendingUp className="w-5 h-5 text-primary-cyan" />
          </div>
          <div className="text-3xl font-bold text-white">{avgDowntimePerAsset} hrs</div>
          <div className="text-gray-400 text-sm mt-2">Average downtime</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Highest Downtime</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-xl font-bold text-white">{worstAssetType?.type || 'N/A'}</div>
          <div className="text-gray-400 text-sm mt-2">{worstAssetType?.total || 0} hours</div>
        </div>
      </div>

      {/* Downtime by Asset Type */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Downtime Hours by Asset Type</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={downtimeByAssetType}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis dataKey="type" stroke="#8B949E" angle={-45} textAnchor="end" height={100} />
            <YAxis stroke="#8B949E" label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161B22',
                border: '1px solid #30363D',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="charging" stackId="a" fill="#F59E0B" name="Charging" />
            <Bar dataKey="idle" stackId="a" fill="#EF4444" name="Idle" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Downtime Breakdown Table */}
        <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h2 className="text-lg font-semibold text-white">Breakdown by Asset Type</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-hover">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Asset Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Total Hours
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {downtimeByAssetType.map((item) => (
                  <tr key={item.type} className="hover:bg-dark-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">{item.type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-white font-semibold">{item.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Downtime Events */}
        <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h2 className="text-lg font-semibold text-white">Recent Downtime Events</h2>
          </div>
          <div className="divide-y divide-dark-border max-h-96 overflow-y-auto">
            {recentDowntimeEvents.map((event, index) => (
              <div key={index} className="px-6 py-4 hover:bg-dark-hover transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white mb-1">{event.assetId}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className={`px-2 py-1 rounded ${event.type === 'charging' ? 'bg-yellow-900/20 text-yellow-400' : 'bg-red-900/20 text-red-400'}`}>
                        {event.type}
                      </span>
                      <span>{(event.duration / 3600).toFixed(1)} hrs</span>
                    </div>
                  </div>
                  <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Downtime;
