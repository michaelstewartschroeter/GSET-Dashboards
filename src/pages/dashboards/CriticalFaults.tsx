import { useMemo, useState } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFilters } from '../../contexts/FilterContext';
import { AlertCircle, AlertTriangle, MapPin } from 'lucide-react';
import { isWithinInterval, format } from 'date-fns';
import MapModal from '../../components/MapModal';

const CriticalFaults: React.FC = () => {
  const { events } = useWebSocket();
  const { selectedStations, selectedBranches, dateRange, selectedAssetTypes } = useFilters();
  const [mapState, setMapState] = useState<{ isOpen: boolean; lat: number; lng: number; title: string; description: string }>({
    isOpen: false,
    lat: 0,
    lng: 0,
    title: '',
    description: '',
  });

  const openMap = (lat: number, lng: number, assetId: string, faultCode: string) => {
    setMapState({
      isOpen: true,
      lat,
      lng,
      title: `Fault Location: ${faultCode}`,
      description: `Asset: ${assetId}`,
    });
  };

  const closeMap = () => {
    setMapState({ ...mapState, isOpen: false });
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Track trouble codes and e-stop events as faults
      if (!['data_trouble_code_start', 'e_stop', 'shock'].includes(event.data.event_details_type)) {
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

  // Fault code frequency
  const faultCodeFrequency = useMemo(() => {
    const faultCodes = new Map<string, { count: number; severity: string; description: string }>();

    // Define fault codes with descriptions
    const faultDescriptions: Record<string, { description: string; severity: 'critical' | 'high' | 'medium' }> = {
      'Z000F': { description: 'Potential wiring issue with Turtle mode', severity: 'high' },
      'Z0001': { description: 'Engine temperature sensor fault', severity: 'critical' },
      'Z0002': { description: 'Hydraulic pressure low', severity: 'high' },
      'Z0003': { description: 'Battery voltage critical', severity: 'critical' },
      'Z0004': { description: 'Brake system fault', severity: 'critical' },
      'E_STOP': { description: 'Emergency stop activated', severity: 'critical' },
      'SHOCK': { description: 'High impact/collision detected', severity: 'high' },
    };

    filteredEvents.forEach((event) => {
      let code = 'UNKNOWN';
      if (event.data.event_details_type === 'data_trouble_code_start') {
        code = event.data.details?.code || 'Z000F';
      } else if (event.data.event_details_type === 'e_stop') {
        code = 'E_STOP';
      } else if (event.data.event_details_type === 'shock') {
        code = 'SHOCK';
      }

      if (!faultCodes.has(code)) {
        const info = faultDescriptions[code] || { description: 'Unknown fault', severity: 'medium' };
        faultCodes.set(code, { count: 0, ...info });
      }

      const data = faultCodes.get(code)!;
      data.count++;
    });

    return Array.from(faultCodes.entries())
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEvents]);

  // Faults by asset type
  const faultsByAssetType = useMemo(() => {
    const typeMap = new Map<string, number>();

    filteredEvents.forEach((event) => {
      const assetType = event.name;
      typeMap.set(assetType, (typeMap.get(assetType) || 0) + 1);
    });

    return Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEvents]);

  const totalFaults = filteredEvents.length;
  const criticalFaults = faultCodeFrequency.filter((f) => f.severity === 'critical').reduce((sum, f) => sum + f.count, 0);
  const recentFaults = filteredEvents.slice(0, 15);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-900/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-900/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Critical Faults by Asset</h1>
        <p className="text-gray-400">Real-time fault monitoring and diagnostic trouble codes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Faults</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-white">{totalFaults}</div>
          <div className="text-gray-400 text-sm mt-2">Last 14 days</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Critical Severity</span>
            <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
          </div>
          <div className="text-3xl font-bold text-white">{criticalFaults}</div>
          <div className="text-gray-400 text-sm mt-2">Requires immediate attention</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Unique Fault Codes</span>
            <AlertCircle className="w-5 h-5 text-primary-cyan" />
          </div>
          <div className="text-3xl font-bold text-white">{faultCodeFrequency.length}</div>
          <div className="text-gray-400 text-sm mt-2">Different fault types</div>
        </div>
      </div>

      {/* Real-time Fault Feed */}
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Critical Faults</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-400">Live</span>
          </div>
        </div>
        <div className="divide-y divide-dark-border max-h-96 overflow-y-auto">
          {recentFaults.map((event, index) => {
            let faultCode = 'UNKNOWN';
            let severity = 'medium';
            
            if (event.data.event_details_type === 'data_trouble_code_start') {
              faultCode = event.data.details?.code || 'Z000F';
              severity = faultCode === 'Z0001' || faultCode === 'Z0003' || faultCode === 'Z0004' ? 'critical' : 'high';
            } else if (event.data.event_details_type === 'e_stop') {
              faultCode = 'E_STOP';
              severity = 'critical';
            } else if (event.data.event_details_type === 'shock') {
              faultCode = 'SHOCK';
              severity = 'high';
            }

            return (
              <div key={index} className="px-6 py-4 hover:bg-dark-hover transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(severity)}`}>
                        {faultCode}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(event.data.happened_at), 'MMM d, HH:mm:ss')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-300">
                        <span className="text-gray-500">Asset:</span> {event.asset_id}
                      </span>
                      <span className="text-gray-300">
                        <span className="text-gray-500">Type:</span> {event.name}
                      </span>
                      <span className="text-gray-300">
                        <span className="text-gray-500">Employee:</span>{' '}
                        {event.data.driver_id ? event.data.driver_id : <span className="text-gray-500">Unknown</span>}
                      </span>
                      <button
                        onClick={() => openMap(event.data.latitude, event.data.longitude, event.asset_id, faultCode)}
                        className="text-primary-cyan hover:text-primary-cyan/80 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <MapPin className="w-3 h-3" />
                        {event.data.latitude.toFixed(4)}, {event.data.longitude.toFixed(4)}
                      </button>
                    </div>
                  </div>
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 ${severity === 'critical' ? 'text-red-500' : 'text-orange-500'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fault Code Frequency */}
        <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h2 className="text-lg font-semibold text-white">Fault Code Frequency</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-hover">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Occurrences
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {faultCodeFrequency.map((fault) => (
                  <tr key={fault.code} className="hover:bg-dark-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{fault.code}</div>
                        <div className="text-xs text-gray-400">{fault.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-white font-semibold">{fault.count}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(fault.severity)}`}>
                        {fault.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Faults by Asset Type */}
        <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h2 className="text-lg font-semibold text-white">Faults by Asset Type</h2>
          </div>
          <div className="p-6 space-y-4">
            {faultsByAssetType.map((item, index) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-red-900/20 border border-red-500/30 rounded-full text-red-400 text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{item.type}</div>
                    <div className="text-xs text-gray-400">Multiple fault events</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{item.count}</span>
                  <span className="text-sm text-gray-400">faults</span>
                </div>
              </div>
            ))}
          </div>
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

export default CriticalFaults;
