import { useMemo, useState } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFilters } from '../../contexts/FilterContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Activity, MapPin } from 'lucide-react';
import { SAFETY_EVENT_TYPES } from '../../types';
import { isWithinInterval, format } from 'date-fns';
import MapModal from '../../components/MapModal';

const EVENT_COLORS = {
  harsh_acceleration: '#EF4444',
  harsh_brake: '#F59E0B',
  harsh_jump: '#10B981',
  harsh_turn: '#3B82F6',
  shock: '#8B5CF6',
  safety_alert: '#EC4899',
};

const SafetyByEventType: React.FC = () => {
  const { events } = useWebSocket();
  const { selectedStations, selectedBranches, dateRange, selectedAssetTypes, searchQuery } = useFilters();
  const [mapState, setMapState] = useState<{ isOpen: boolean; lat: number; lng: number; title: string; description: string }>({
    isOpen: false,
    lat: 0,
    lng: 0,
    title: '',
    description: '',
  });

  const openMap = (lat: number, lng: number, assetId: string, eventType: string, driverId: string) => {
    setMapState({
      isOpen: true,
      lat,
      lng,
      title: `Safety Event: ${eventType.replace(/_/g, ' ')}`,
      description: `Asset: ${assetId} | Driver: ${driverId}`,
    });
  };

  const closeMap = () => {
    setMapState({ ...mapState, isOpen: false });
  };

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

  const eventTypeStats = useMemo(() => {
    const stats = new Map<string, number>();

    filteredEvents.forEach((event) => {
      const eventType = event.data.event_details_type;
      stats.set(eventType, (stats.get(eventType) || 0) + 1);
    });

    return Array.from(stats.entries())
      .map(([type, count]) => ({
        type: type.replace(/_/g, ' '),
        rawType: type,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEvents]);

  const pieData = eventTypeStats.map((stat) => ({
    name: stat.type,
    value: stat.count,
  }));

  const totalEvents = filteredEvents.length;
  const mostCommonEvent = eventTypeStats[0];
  const recentEvents = filteredEvents.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Safety Events by Type</h1>
        <p className="text-gray-400">Distribution and trends of safety incidents</p>
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
            {eventTypeStats.length} different types
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Most Common Event</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-xl font-bold text-white capitalize">
            {mostCommonEvent?.type || 'N/A'}
          </div>
          <div className="text-gray-400 text-sm mt-2">
            {mostCommonEvent?.count || 0} occurrences ({totalEvents > 0 ? ((mostCommonEvent?.count || 0) / totalEvents * 100).toFixed(1) : 0}%)
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Event Rate</span>
            <Activity className="w-5 h-5 text-primary-cyan" />
          </div>
          <div className="text-3xl font-bold text-white">
            {(totalEvents / 14).toFixed(1)}
          </div>
          <div className="text-gray-400 text-sm mt-2">events per day</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Event Type Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={eventTypeStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
              <XAxis dataKey="type" stroke="#8B949E" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#8B949E" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161B22',
                  border: '1px solid #30363D',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#58A6FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Proportion Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => {
                  const rawType = eventTypeStats.find((s) => s.type === entry.name)?.rawType || '';
                  const color = EVENT_COLORS[rawType as keyof typeof EVENT_COLORS] || '#58A6FF';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161B22',
                  border: '1px solid #30363D',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Event Feed */}
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Safety Events</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-400">Live</span>
          </div>
        </div>
        <div className="divide-y divide-dark-border max-h-96 overflow-y-auto">
          {recentEvents.map((event, index) => (
            <div key={index} className="px-6 py-4 hover:bg-dark-hover transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize"
                      style={{
                        backgroundColor: `${EVENT_COLORS[event.data.event_details_type as keyof typeof EVENT_COLORS] || '#58A6FF'}20`,
                        color: EVENT_COLORS[event.data.event_details_type as keyof typeof EVENT_COLORS] || '#58A6FF',
                        border: `1px solid ${EVENT_COLORS[event.data.event_details_type as keyof typeof EVENT_COLORS] || '#58A6FF'}50`,
                      }}
                    >
                      {event.data.event_details_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-gray-400">
                      {format(new Date(event.data.happened_at), 'MMM d, HH:mm:ss')}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-gray-300">
                      <span className="text-gray-500">Asset:</span> {event.asset_id}
                    </span>
                    <span className="text-gray-300">
                      <span className="text-gray-500">Driver:</span> {event.data.driver_id || 'Unknown'}
                    </span>
                    <span className="text-gray-300">
                      <span className="text-gray-500">Type:</span> {event.name}
                    </span>
                    <button
                      onClick={() => openMap(
                        event.data.latitude,
                        event.data.longitude,
                        event.asset_id,
                        event.data.event_details_type,
                        event.data.driver_id || 'Unknown'
                      )}
                      className="text-primary-cyan hover:text-primary-cyan/80 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      {event.data.latitude.toFixed(4)}, {event.data.longitude.toFixed(4)}
                    </button>
                  </div>
                </div>
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Modal */}
      <MapModal
        isOpen={mapState.isOpen}
        onClose={closeMap}
        latitude={mapState.lat}
        longitude={mapState.lng}
        title={mapState.title}
        description={mapState.description}
      />
    </div>
  );
};

export default SafetyByEventType;
