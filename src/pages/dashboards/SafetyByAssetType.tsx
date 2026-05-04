import { useMemo } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFilters } from '../../contexts/FilterContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, Layers } from 'lucide-react';
import { SAFETY_EVENT_TYPES } from '../../types';
import { isWithinInterval } from 'date-fns';

const SafetyByAssetType: React.FC = () => {
  const { events } = useWebSocket();
  const { selectedStations, selectedBranches, dateRange, selectedAssetTypes, searchQuery } = useFilters();

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (!SAFETY_EVENT_TYPES.includes(event.data.event_details_type as any)) {
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

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          event.asset_id.toLowerCase().includes(query) ||
          (event.data.driver_id && event.data.driver_id.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [events, selectedStations, selectedBranches, dateRange, selectedAssetTypes, searchQuery]);

  const assetTypeStats = useMemo(() => {
    const stats = new Map<string, { total: number; byEventType: Map<string, number> }>();

    filteredEvents.forEach((event) => {
      const assetType = event.name;
      if (!stats.has(assetType)) {
        stats.set(assetType, { total: 0, byEventType: new Map() });
      }
      const assetData = stats.get(assetType)!;
      assetData.total++;

      const eventType = event.data.event_details_type;
      assetData.byEventType.set(eventType, (assetData.byEventType.get(eventType) || 0) + 1);
    });

    return Array.from(stats.entries())
      .map(([assetType, data]) => ({
        assetType,
        total: data.total,
        harsh_acceleration: data.byEventType.get('harsh_acceleration') || 0,
        harsh_brake: data.byEventType.get('harsh_brake') || 0,
        harsh_jump: data.byEventType.get('harsh_jump') || 0,
        harsh_turn: data.byEventType.get('harsh_turn') || 0,
        shock: data.byEventType.get('shock') || 0,
        safety_alert: data.byEventType.get('safety_alert') || 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredEvents]);

  const totalEvents = filteredEvents.length;
  const worstAssetType = assetTypeStats[0];
  const affectedAssetTypes = assetTypeStats.length;

  // Calculate individual asset risks
  const individualAssets = useMemo(() => {
    const assetMap = new Map<string, number>();
    filteredEvents.forEach((event) => {
      const assetId = event.asset_id;
      assetMap.set(assetId, (assetMap.get(assetId) || 0) + 1);
    });

    return Array.from(assetMap.entries())
      .map(([assetId, count]) => ({ assetId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredEvents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Safety Events by Asset Type</h1>
        <p className="text-gray-400">Incident analysis across different equipment categories</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Safety Events</span>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-white">{totalEvents}</div>
          <div className="text-gray-400 text-sm mt-2">
            Across {affectedAssetTypes} asset types
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Highest Risk Asset Type</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-xl font-bold text-white">
            {worstAssetType?.assetType || 'N/A'}
          </div>
          <div className="text-gray-400 text-sm mt-2">
            {worstAssetType?.total || 0} incidents
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Average Events per Type</span>
            <Layers className="w-5 h-5 text-primary-cyan" />
          </div>
          <div className="text-3xl font-bold text-white">
            {affectedAssetTypes > 0 ? (totalEvents / affectedAssetTypes).toFixed(1) : 0}
          </div>
          <div className="text-gray-400 text-sm mt-2">events per asset type</div>
        </div>
      </div>

      {/* Grouped Bar Chart */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Event Types by Asset Category</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={assetTypeStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis dataKey="assetType" stroke="#8B949E" angle={-45} textAnchor="end" height={100} />
            <YAxis stroke="#8B949E" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161B22',
                border: '1px solid #30363D',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="harsh_acceleration" stackId="a" fill="#EF4444" name="Harsh Accel" />
            <Bar dataKey="harsh_brake" stackId="a" fill="#F59E0B" name="Harsh Brake" />
            <Bar dataKey="harsh_jump" stackId="a" fill="#10B981" name="Harsh Jump" />
            <Bar dataKey="harsh_turn" stackId="a" fill="#3B82F6" name="Harsh Turn" />
            <Bar dataKey="shock" stackId="a" fill="#8B5CF6" name="Shock" />
            <Bar dataKey="safety_alert" stackId="a" fill="#EC4899" name="Safety Alert" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Type Table */}
        <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h2 className="text-lg font-semibold text-white">Ranking by Asset Type</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-hover">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Asset Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Events
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {assetTypeStats.map((stat, index) => (
                  <tr key={stat.assetType} className="hover:bg-dark-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">{stat.assetType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-white font-semibold">{stat.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 Individual Assets */}
        <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h2 className="text-lg font-semibold text-white">Top 5 Worst Individual Assets</h2>
          </div>
          <div className="p-6 space-y-4">
            {individualAssets.map((asset, index) => (
              <div key={asset.assetId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-red-900/20 border border-red-500/30 rounded-full text-red-400 text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{asset.assetId}</div>
                    <div className="text-xs text-gray-400">Multiple violations</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{asset.count}</span>
                  <span className="text-sm text-gray-400">events</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyByAssetType;
