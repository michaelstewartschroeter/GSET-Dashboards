import { useMemo } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFilters } from '../../contexts/FilterContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { TrendingUp, Activity, Clock } from 'lucide-react';
import { isWithinInterval, format, eachDayOfInterval } from 'date-fns';

const UtilizationRate: React.FC = () => {
  const { events } = useWebSocket();
  const { selectedStations, selectedBranches, dateRange, selectedAssetTypes } = useFilters();

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Include use, working, move events
      if (!['use', 'working', 'move', 'busy'].includes(event.data.event_details_type)) {
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

  // Calculate utilization by asset type over time
  const utilizationByDay = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map((day) => {
      const dayStr = format(day, 'MMM dd');
      const dayEvents = filteredEvents.filter((e) => {
        const eventDate = new Date(e.data.happened_at);
        return format(eventDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });

      // Group by asset type
      const byAssetType: Record<string, number> = {};
      dayEvents.forEach((event) => {
        const assetType = event.name;
        byAssetType[assetType] = (byAssetType[assetType] || 0) + event.data.duration;
      });

      // Convert to utilization percentage (duration / 86400 seconds * 100)
      const result: any = { date: dayStr };
      Object.keys(byAssetType).forEach((type) => {
        result[type] = ((byAssetType[type] / 86400) * 100).toFixed(1);
      });

      return result;
    });
  }, [filteredEvents, dateRange]);

  // Calculate average utilization by asset type
  const avgUtilizationByType = useMemo(() => {
    const totalsByType: Record<string, { duration: number; count: number }> = {};

    filteredEvents.forEach((event) => {
      const type = event.name;
      if (!totalsByType[type]) {
        totalsByType[type] = { duration: 0, count: 0 };
      }
      totalsByType[type].duration += event.data.duration;
      totalsByType[type].count += 1;
    });

    return Object.entries(totalsByType)
      .map(([type, data]) => ({
        type,
        utilization: ((data.duration / (14 * 86400)) * 100).toFixed(1),
      }))
      .sort((a, b) => parseFloat(b.utilization) - parseFloat(a.utilization));
  }, [filteredEvents]);

  const fleetAvgUtilization = useMemo(() => {
    const total = avgUtilizationByType.reduce((sum, item) => sum + parseFloat(item.utilization), 0);
    return (total / (avgUtilizationByType.length || 1)).toFixed(1);
  }, [avgUtilizationByType]);

  const mostUtilized = avgUtilizationByType[0];
  const leastUtilized = avgUtilizationByType[avgUtilizationByType.length - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">GSE Asset Utilization Rate</h1>
        <p className="text-gray-400">Equipment usage efficiency over time</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Fleet Average Utilization</span>
            <Activity className="w-5 h-5 text-primary-cyan" />
          </div>
          <div className="text-3xl font-bold text-white">{fleetAvgUtilization}%</div>
          <div className="text-gray-400 text-sm mt-2">Across all asset types</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Most Utilized</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-xl font-bold text-white">{mostUtilized?.type || 'N/A'}</div>
          <div className="text-gray-400 text-sm mt-2">{mostUtilized?.utilization || 0}% utilization</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Least Utilized</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-xl font-bold text-white">{leastUtilized?.type || 'N/A'}</div>
          <div className="text-gray-400 text-sm mt-2">{leastUtilized?.utilization || 0}% utilization</div>
        </div>
      </div>

      {/* Utilization Trend Chart */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Utilization Trend by Asset Type</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={utilizationByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis dataKey="date" stroke="#8B949E" />
            <YAxis stroke="#8B949E" label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161B22',
                border: '1px solid #30363D',
                borderRadius: '8px',
              }}
            />
            <Legend />
            {avgUtilizationByType.slice(0, 5).map((item, index) => {
              const colors = ['#58A6FF', '#39D0D8', '#10B981', '#F59E0B', '#EF4444'];
              return <Line key={item.type} type="monotone" dataKey={item.type} stroke={colors[index]} strokeWidth={2} />;
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Asset Type Comparison */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Average Utilization by Asset Type</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={avgUtilizationByType} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis type="number" stroke="#8B949E" label={{ value: 'Utilization %', position: 'insideBottom', offset: -5 }} />
            <YAxis dataKey="type" type="category" width={150} stroke="#8B949E" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161B22',
                border: '1px solid #30363D',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="utilization" fill="#58A6FF" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default UtilizationRate;
