import { useMemo, useState } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFilters } from '../../contexts/FilterContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Battery, BatteryWarning, AlertTriangle, MapPin } from 'lucide-react';
import { isWithinInterval, format, eachDayOfInterval } from 'date-fns';
import MapModal from '../../components/MapModal';

const EVBatteryAlerts: React.FC = () => {
  const { events } = useWebSocket();
  const { selectedStations, selectedBranches, dateRange, selectedAssetTypes } = useFilters();
  const [mapState, setMapState] = useState<{ isOpen: boolean; lat: number; lng: number; title: string; description: string }>({
    isOpen: false,
    lat: 0,
    lng: 0,
    title: '',
    description: '',
  });

  const openMap = (lat: number, lng: number, assetId: string, batteryLevel: number) => {
    setMapState({
      isOpen: true,
      lat,
      lng,
      title: `Low Battery Alert: ${batteryLevel}%`,
      description: `Asset: ${assetId}`,
    });
  };

  const closeMap = () => {
    setMapState({ ...mapState, isOpen: false });
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Track charging events to monitor battery levels
      if (!['charging', 'low_backup_battery_alert'].includes(event.data.event_details_type)) {
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

  // Current battery status (simulated)
  const currentBatteryStatus = useMemo(() => {
    const assetBatteries = new Map<string, { level: number; status: string; lastUpdate: string; lat: number; lng: number }>();

    filteredEvents.forEach((event) => {
      const assetId = event.asset_id;
      
      // Simulate battery level
      let batteryLevel = 100;
      if (event.data.event_details_type === 'low_backup_battery_alert') {
        batteryLevel = event.data.details?.value || 10;
      } else if (event.data.event_details_type === 'charging') {
        batteryLevel = event.data.details?.battery_level_before_charging || Math.floor(Math.random() * 40) + 10;
      }

      assetBatteries.set(assetId, {
        level: batteryLevel,
        status: batteryLevel < 30 ? 'critical' : batteryLevel < 50 ? 'low' : 'good',
        lastUpdate: event.data.happened_at,
        lat: event.data.latitude,
        lng: event.data.longitude,
      });
    });

    return Array.from(assetBatteries.entries())
      .map(([assetId, data]) => ({ assetId, ...data }))
      .sort((a, b) => a.level - b.level)
      .slice(0, 20); // Top 20 assets with lowest battery
  }, [filteredEvents]);

  // Low battery events over time
  const lowBatteryOverTime = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map((day) => {
      const dayStr = format(day, 'MMM dd');
      const dayEvents = filteredEvents.filter((e) => {
        const eventDate = new Date(e.data.happened_at);
        return format(eventDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });

      let lowBattery = 0;
      let critical = 0;

      dayEvents.forEach((event) => {
        if (event.data.event_details_type === 'low_backup_battery_alert') {
          const level = event.data.details?.value || 10;
          if (level < 20) {
            critical++;
          } else {
            lowBattery++;
          }
        } else if (event.data.event_details_type === 'charging') {
          const level = event.data.details?.battery_level_before_charging || 50;
          if (level < 30) {
            if (level < 20) {
              critical++;
            } else {
              lowBattery++;
            }
          }
        }
      });

      return {
        date: dayStr,
        lowBattery,
        critical,
      };
    });
  }, [filteredEvents, dateRange]);

  const totalLowBatteryEvents = filteredEvents.length;
  const criticalAssets = currentBatteryStatus.filter((a) => a.level < 20).length;
  const warningAssets = currentBatteryStatus.filter((a) => a.level >= 20 && a.level < 30).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">EV Battery Alerts</h1>
        <p className="text-gray-400">Monitoring electric vehicle battery levels and low charge events</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Low Battery Events</span>
            <BatteryWarning className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-white">{totalLowBatteryEvents}</div>
          <div className="text-gray-400 text-sm mt-2">Last 14 days</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Critical (&lt;20%)</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-white">{criticalAssets}</div>
          <div className="text-gray-400 text-sm mt-2">Assets requiring immediate charging</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Warning (20-30%)</span>
            <Battery className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-white">{warningAssets}</div>
          <div className="text-gray-400 text-sm mt-2">Assets need charging soon</div>
        </div>
      </div>

      {/* Low Battery Trend */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Low Battery Events Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={lowBatteryOverTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis dataKey="date" stroke="#8B949E" />
            <YAxis stroke="#8B949E" allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161B22',
                border: '1px solid #30363D',
                borderRadius: '8px',
              }}
            />
            <Line type="monotone" dataKey="critical" stroke="#EF4444" strokeWidth={2} name="Critical (<20%)" />
            <Line type="monotone" dataKey="lowBattery" stroke="#F59E0B" strokeWidth={2} name="Low (20-30%)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Current Battery Levels */}
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-white">Assets with Low Battery (Below 30%)</h2>
        </div>
        <div className="p-6 space-y-3">
          {currentBatteryStatus.filter((asset) => asset.level < 30).map((asset) => {
            const isCritical = asset.level < 20;
            const isWarning = asset.level >= 20 && asset.level < 30;
            const isLow = asset.level >= 30 && asset.level < 50;
            
            let bgColor = 'bg-green-500';
            let textColor = 'text-green-500';
            
            if (isCritical) {
              bgColor = 'bg-red-500';
              textColor = 'text-red-500';
            } else if (isWarning) {
              bgColor = 'bg-orange-500';
              textColor = 'text-orange-500';
            } else if (isLow) {
              bgColor = 'bg-yellow-500';
              textColor = 'text-yellow-500';
            }

            return (
              <div key={asset.assetId} className="bg-dark-bg border border-dark-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white mb-1">{asset.assetId}</div>
                    <div className="text-xs text-gray-400">
                      Last update: {format(new Date(asset.lastUpdate), 'MMM d, HH:mm')}
                    </div>
                    <button
                      onClick={() => openMap(asset.lat, asset.lng, asset.assetId, asset.level)}
                      className="text-primary-cyan hover:text-primary-cyan/80 flex items-center gap-1 text-xs mt-1 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      {asset.lat.toFixed(4)}, {asset.lng.toFixed(4)}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${textColor}`}>{asset.level}%</div>
                      <div className="text-xs text-gray-400 uppercase">{asset.status}</div>
                    </div>
                    {isCritical ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Battery className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </div>
                <div className="w-full bg-dark-hover rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 ${bgColor} transition-all duration-300`}
                    style={{ width: `${asset.level}%` }}
                  />
                </div>
              </div>
            );
          })}
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
      />    </div>
  );
};

export default EVBatteryAlerts;
