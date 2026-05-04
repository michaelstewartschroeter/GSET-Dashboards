import { useMemo, useState } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFilters } from '../../contexts/FilterContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, MapPin } from 'lucide-react';
import { SAFETY_EVENT_TYPES } from '../../types';
import { isWithinInterval, format } from 'date-fns';
import MapModal from '../../components/MapModal';

const SafetyByEmployee: React.FC = () => {
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
      // Filter by safety events only
      if (!SAFETY_EVENT_TYPES.includes(event.data.event_details_type as any)) {
        return false;
      }

      // Filter by date range
      const eventDate = new Date(event.data.happened_at);
      if (!isWithinInterval(eventDate, { start: dateRange.start, end: dateRange.end })) {
        return false;
      }

      // Filter by stations
      if (selectedStations.length > 0) {
        const assetStation = event.asset_id.split('-')[0];
        if (!selectedStations.includes(assetStation)) {
          return false;
        }
      }

      // Filter by asset types
      if (selectedAssetTypes.length > 0) {
        if (!selectedAssetTypes.includes(event.name)) {
          return false;
        }
      }

      // Filter by branch
      if (selectedBranches.length > 0) {
        if (!event.branch || !selectedBranches.includes(event.branch)) {
          return false;
        }
      }

      // Filter by search query
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

  const employeeStats = useMemo(() => {
    const stats = new Map<string, { count: number; types: Map<string, number> }>();

    filteredEvents.forEach((event) => {
      const driverId = event.data.driver_id || 'Unknown';
      if (!stats.has(driverId)) {
        stats.set(driverId, { count: 0, types: new Map() });
      }
      const employeeData = stats.get(driverId)!;
      employeeData.count++;
      
      const eventType = event.data.event_details_type;
      employeeData.types.set(eventType, (employeeData.types.get(eventType) || 0) + 1);
    });

    return Array.from(stats.entries())
      .map(([employeeId, data]) => ({
        employeeId,
        count: data.count,
        types: Object.fromEntries(data.types),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEvents]);

  const totalEvents = filteredEvents.length;
  const worstOffender = employeeStats[0];
  const trend = Math.random() > 0.5 ? 'up' : 'down'; // Mock trend

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Safety Events by Employee</h1>
        <p className="text-gray-400">Ranked by total number of safety incidents</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Safety Events</span>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-white">{totalEvents}</div>
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
            <span className={`text-sm ${trend === 'up' ? 'text-red-500' : 'text-green-500'}`}>
              {Math.floor(Math.random() * 20)}% vs last period
            </span>
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Worst Offender</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {worstOffender?.employeeId || 'N/A'}
          </div>
          <div className="text-gray-400 text-sm mt-2">
            {worstOffender?.count || 0} incidents
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Employees Involved</span>
            <AlertTriangle className="w-5 h-5 text-primary-cyan" />
          </div>
          <div className="text-3xl font-bold text-white">{employeeStats.length}</div>
          <div className="text-gray-400 text-sm mt-2">
            Avg {totalEvents > 0 ? (totalEvents / employeeStats.length).toFixed(1) : 0} events/employee
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Incidents by Employee</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={employeeStats.slice(0, 10)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis type="number" stroke="#8B949E" />
            <YAxis dataKey="employeeId" type="category" width={100} stroke="#8B949E" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161B22',
                border: '1px solid #30363D',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="count" fill="#58A6FF" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Individual Events with GPS */}
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-white">Individual Safety Events</h2>
          <p className="text-sm text-gray-400 mt-1">Click GPS coordinates to view location on map</p>
        </div>
        <div className="divide-y divide-dark-border max-h-96 overflow-y-auto">
          {filteredEvents.slice(0, 50).map((event, index) => (
            <div key={index} className="px-6 py-4 hover:bg-dark-hover transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900/20 text-red-400 border border-red-500/30 capitalize">
                      {event.data.event_details_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(event.data.happened_at), 'MMM d, HH:mm:ss')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-300">
                      <span className="text-gray-500">Driver:</span> {event.data.driver_id || 'Unknown'}
                    </span>
                    <span className="text-gray-300">
                      <span className="text-gray-500">Asset:</span> {event.asset_id}
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

export default SafetyByEmployee;
