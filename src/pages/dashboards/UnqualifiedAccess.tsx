import { useMemo, useState } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFilters } from '../../contexts/FilterContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { GraduationCap, AlertTriangle, Users, MapPin } from 'lucide-react';
import { isWithinInterval, format, eachDayOfInterval } from 'date-fns';
import MapModal from '../../components/MapModal';

const QUALIFICATIONS = [
  'ASU',
  'Belt Loader',
  'Cargo Tractor',
  'GPU',
  'Lower Deck Loader',
  'Main Deck Loader',
  'Pushback',
];

const UnqualifiedAccess: React.FC = () => {
  const { events } = useWebSocket();
  const { selectedStations, selectedBranches, dateRange, selectedAssetTypes, searchQuery } = useFilters();
  const [mapState, setMapState] = useState<{
    isOpen: boolean; lat: number; lng: number; title: string; description: string;
  }>({ isOpen: false, lat: 0, lng: 0, title: '', description: '' });

  const openMap = (lat: number, lng: number, assetId: string, driverId: string, requiredQual: string) => {
    setMapState({
      isOpen: true,
      lat,
      lng,
      title: 'Unqualified Access Attempt',
      description: `Asset: ${assetId} | Employee: ${driverId} | Missing qualification: ${requiredQual}`,
    });
  };

  const closeMap = () => setMapState({ ...mapState, isOpen: false });

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (event.data.event_details_type !== 'unqualified_driver') return false;

      const eventDate = new Date(event.data.happened_at);
      if (!isWithinInterval(eventDate, { start: dateRange.start, end: dateRange.end })) return false;

      if (selectedStations.length > 0) {
        const assetStation = event.asset_id.split('-')[0];
        if (!selectedStations.includes(assetStation)) return false;
      }

      if (selectedBranches.length > 0) {
        if (!event.branch || !selectedBranches.includes(event.branch)) return false;
      }

      if (selectedAssetTypes.length > 0) {
        if (!selectedAssetTypes.includes(event.name)) return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          event.asset_id.toLowerCase().includes(query) ||
          (event.data.driver_id ? event.data.driver_id.toLowerCase().includes(query) : false)
        );
      }

      return true;
    });
  }, [events, selectedStations, selectedBranches, dateRange, selectedAssetTypes, searchQuery]);

  // Incidents grouped by the required qualification that was missing
  const byQualification = useMemo(() => {
    const map = new Map<string, number>();
    // Seed all qualification types so all bars render even with zero
    QUALIFICATIONS.forEach(q => map.set(q, 0));
    filteredEvents.forEach((event) => {
      const qual = (event.data.details?.required_qualification as string) || 'Unknown';
      map.set(qual, (map.get(qual) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([qualification, count]) => ({ qualification, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEvents]);

  // Top employees by incident count
  const byEmployee = useMemo(() => {
    const map = new Map<string, { count: number; qualifications: Set<string> }>();
    filteredEvents.forEach((event) => {
      const driverId = event.data.driver_id || 'Unknown';
      if (!map.has(driverId)) map.set(driverId, { count: 0, qualifications: new Set() });
      const data = map.get(driverId)!;
      data.count++;
      const qual = event.data.details?.required_qualification as string;
      if (qual) data.qualifications.add(qual);
    });
    return Array.from(map.entries())
      .map(([employeeId, data]) => ({
        employeeId,
        count: data.count,
        missingQuals: Array.from(data.qualifications).join(', ') || '—',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredEvents]);

  // Daily trend
  const overTime = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    return days.map((day) => ({
      date: format(day, 'MMM dd'),
      incidents: filteredEvents.filter((e) =>
        format(new Date(e.data.happened_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      ).length,
    }));
  }, [filteredEvents, dateRange]);

  const totalIncidents = filteredEvents.length;
  const uniqueEmployees = new Set(filteredEvents.map(e => e.data.driver_id)).size;
  const topMissingQual = byQualification.find(q => q.count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Unqualified Access Attempts</h1>
        <p className="text-gray-400">
          Employees attempting to operate GSE equipment without holding the required qualification
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Incidents</span>
            <GraduationCap className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-white">{totalIncidents}</div>
          <div className="text-gray-400 text-sm mt-2">Last 14 days</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Employees Involved</span>
            <Users className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-white">{uniqueEmployees}</div>
          <div className="text-gray-400 text-sm mt-2">Unique employees</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Most Common Missing Qualification</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-xl font-bold text-white">{topMissingQual?.qualification || 'N/A'}</div>
          <div className="text-gray-400 text-sm mt-2">{topMissingQual?.count || 0} incidents</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Missing Qualification */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Incidents by Missing Qualification</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byQualification} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
              <XAxis
                dataKey="qualification"
                stroke="#8B949E"
                tick={{ fontSize: 10, fill: '#8B949E' }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis stroke="#8B949E" />
              <Tooltip
                contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '8px' }}
              />
              <Bar dataKey="count" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Over Time */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Incidents Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={overTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
              <XAxis dataKey="date" stroke="#8B949E" />
              <YAxis stroke="#8B949E" />
              <Tooltip
                contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '8px' }}
              />
              <Line type="monotone" dataKey="incidents" stroke="#F97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Employees Table */}
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-white">Top Employees by Incident Count</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-hover">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Incidents</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Missing Qualifications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {byEmployee.map((row) => (
                <tr key={row.employeeId} className="hover:bg-dark-hover transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{row.employeeId}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-900/20 text-orange-400">
                      {row.count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{row.missingQuals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Incidents</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-400">Live</span>
          </div>
        </div>
        <div className="divide-y divide-dark-border max-h-96 overflow-y-auto">
          {filteredEvents.slice(0, 20).map((event, index) => (
            <div key={index} className="px-6 py-4 hover:bg-dark-hover transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-900/20 text-orange-400 border border-orange-500/30">
                      UNQUALIFIED ACCESS
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(event.data.happened_at), 'MMM d, HH:mm:ss')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-gray-300">
                      <span className="text-gray-500">Employee:</span> {event.data.driver_id || 'Unknown'}
                    </span>
                    <span className="text-gray-300">
                      <span className="text-gray-500">Asset:</span> {event.asset_id}
                    </span>
                    <span className="text-gray-300">
                      <span className="text-gray-500">Type:</span> {event.name}
                    </span>
                    <span className="text-orange-400 font-medium">
                      <span className="text-gray-500 font-normal">Missing:</span>{' '}
                      {(event.data.details?.required_qualification as string) || 'N/A'}
                    </span>
                    <span className="text-gray-400 text-xs">
                      <span className="text-gray-500">Has:</span>{' '}
                      {(event.data.details?.employee_qualifications as string) || 'None'}
                    </span>
                    <button
                      onClick={() => openMap(
                        event.data.latitude,
                        event.data.longitude,
                        event.asset_id,
                        event.data.driver_id || 'Unknown',
                        (event.data.details?.required_qualification as string) || 'N/A',
                      )}
                      className="text-primary-cyan hover:text-primary-cyan/80 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      {event.data.latitude.toFixed(4)}, {event.data.longitude.toFixed(4)}
                    </button>
                  </div>
                </div>
                <GraduationCap className="w-5 h-5 text-orange-500 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>

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

export default UnqualifiedAccess;
