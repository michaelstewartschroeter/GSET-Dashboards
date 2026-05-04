import { useMemo, useState } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFilters } from '../../contexts/FilterContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ShieldAlert, AlertTriangle, Users, MapPin } from 'lucide-react';
import { isWithinInterval, format, eachDayOfInterval } from 'date-fns';
import MapModal from '../../components/MapModal';

const UnauthorizedAccess: React.FC = () => {
  const { events } = useWebSocket();
  const { selectedStations, selectedBranches, dateRange, selectedAssetTypes } = useFilters();
  const [mapState, setMapState] = useState<{ isOpen: boolean; lat: number; lng: number; title: string; description: string }>({
    isOpen: false,
    lat: 0,
    lng: 0,
    title: '',
    description: '',
  });

  const openMap = (lat: number, lng: number, assetId: string, driverId: string) => {
    setMapState({
      isOpen: true,
      lat,
      lng,
      title: 'Unauthorized Access Attempt',
      description: `Asset: ${assetId} | Unqualified Driver: ${driverId}`,
    });
  };

  const closeMap = () => {
    setMapState({ ...mapState, isOpen: false });
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Filter unauthorized_driver events
      if (event.data.event_details_type !== 'unauthorized_driver') {
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

      if (selectedBranches.length > 0) {
        if (!event.branch || !selectedBranches.includes(event.branch)) {
          return false;
        }
      }

      if (selectedAssetTypes.length > 0) {
        if (!selectedAssetTypes.includes(event.name)) {
          return false;
        }
      }

      return true;
    });
  }, [events, selectedStations, selectedBranches, dateRange, selectedAssetTypes]);

  // Unauthorized attempts by station
  const attemptsByStation = useMemo(() => {
    const stationMap = new Map<string, number>();

    filteredEvents.forEach((event) => {
      const station = event.asset_id.split('-')[0];
      stationMap.set(station, (stationMap.get(station) || 0) + 1);
    });

    return Array.from(stationMap.entries())
      .map(([station, count]) => ({ station, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEvents]);

  // Unauthorized attempts by asset type
  const attemptsByAssetType = useMemo(() => {
    const typeMap = new Map<string, number>();

    filteredEvents.forEach((event) => {
      typeMap.set(event.name, (typeMap.get(event.name) || 0) + 1);
    });

    return Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEvents]);

  // Attempts over time
  const attemptsOverTime = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map((day) => {
      const dayStr = format(day, 'MMM dd');
      const dayEvents = filteredEvents.filter((e) => {
        const eventDate = new Date(e.data.happened_at);
        return format(eventDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });

      return {
        date: dayStr,
        attempts: dayEvents.length,
      };
    });
  }, [filteredEvents, dateRange]);

  // Repeat offenders
  const repeatOffenders = useMemo(() => {
    const driverMap = new Map<string, { count: number; assets: Set<string> }>();

    filteredEvents.forEach((event) => {
      const driverId = event.data.driver_id || 'Unknown';
      if (!driverMap.has(driverId)) {
        driverMap.set(driverId, { count: 0, assets: new Set() });
      }
      const data = driverMap.get(driverId)!;
      data.count++;
      data.assets.add(event.name);
    });

    return Array.from(driverMap.entries())
      .map(([driver, data]) => ({
        driver,
        attempts: data.count,
        assetTypes: data.assets.size,
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 10);
  }, [filteredEvents]);

  const totalAttempts = filteredEvents.length;
  const uniqueDrivers = new Set(filteredEvents.map(e => e.data.driver_id)).size;
  const worstStation = attemptsByStation[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Unauthorized Access Attempts</h1>
        <p className="text-gray-400">Tracking attempts by unqualified drivers to access GSE assets</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Unauthorized Attempts</span>
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-white">{totalAttempts}</div>
          <div className="text-gray-400 text-sm mt-2">Last 14 days</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Unique Unqualified Drivers</span>
            <Users className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-white">{uniqueDrivers}</div>
          <div className="text-gray-400 text-sm mt-2">Attempting access</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Highest Risk Station</span>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-white">{worstStation?.station || 'N/A'}</div>
          <div className="text-gray-400 text-sm mt-2">{worstStation?.count || 0} attempts</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attempts Over Time */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Unauthorized Attempts Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={attemptsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
              <XAxis dataKey="date" stroke="#8B949E" />
              <YAxis stroke="#8B949E" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161B22',
                  border: '1px solid #30363D',
                  borderRadius: '8px',
                }}
              />
              <Line type="monotone" dataKey="attempts" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Attempts by Station */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Attempts by Station</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={attemptsByStation}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
              <XAxis dataKey="station" stroke="#8B949E" />
              <YAxis stroke="#8B949E" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161B22',
                  border: '1px solid #30363D',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Repeat Offenders */}
        <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h2 className="text-lg font-semibold text-white">Repeat Offenders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-hover">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Driver ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Attempts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Asset Types
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {repeatOffenders.map((offender) => (
                  <tr key={offender.driver} className="hover:bg-dark-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">{offender.driver}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/20 text-red-400">
                        {offender.attempts}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {offender.assetTypes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attempts by Asset Type */}
        <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h2 className="text-lg font-semibold text-white">Attempts by Asset Type</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-hover">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Asset Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Attempts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {attemptsByAssetType.map((item) => (
                  <tr key={item.type} className="hover:bg-dark-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">{item.type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-white font-semibold">{item.count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Unauthorized Attempts */}
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Unauthorized Attempts</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-400">Live</span>
          </div>
        </div>
        <div className="divide-y divide-dark-border max-h-96 overflow-y-auto">
          {filteredEvents.slice(0, 20).map((event, index) => (
            <div key={index} className="px-6 py-4 hover:bg-dark-hover transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900/20 text-red-400 border border-red-500/30">
                      UNAUTHORIZED ACCESS
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
                    <span className="text-gray-300">
                      <span className="text-gray-500">Branch:</span> {event.branch || 'N/A'}
                    </span>
                    <button
                      onClick={() => openMap(
                        event.data.latitude,
                        event.data.longitude,
                        event.asset_id,
                        event.data.driver_id?.toString() || 'Unknown'
                      )}
                      className="text-primary-cyan hover:text-primary-cyan/80 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      {event.data.latitude.toFixed(4)}, {event.data.longitude.toFixed(4)}
                    </button>
                  </div>
                </div>
                <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
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

export default UnauthorizedAccess;
