import { useMemo } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFilters } from '../../contexts/FilterContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Wrench, AlertCircle, TrendingDown } from 'lucide-react';
import { isWithinInterval, subHours } from 'date-fns';

const AssetsInMaintenance: React.FC = () => {
  const { events } = useWebSocket();
  const { selectedStations, selectedBranches, dateRange, selectedAssetTypes } = useFilters();

  // Filter events for maintenance-related activities
  const maintenanceEvents = useMemo(() => {
    return events.filter((event) => {
      // Use charging, data_trouble_code, and working events as maintenance indicators
      if (!['charging', 'data_trouble_code_start', 'working'].includes(event.data.event_details_type)) {
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

  // Assets currently in maintenance (events in last 4 hours)
  const currentlyInMaintenance = useMemo(() => {
    const now = new Date();
    const fourHoursAgo = subHours(now, 4);

    return maintenanceEvents.filter((event) => {
      const eventDate = new Date(event.data.happened_at);
      return eventDate >= fourHoursAgo && eventDate <= now;
    });
  }, [maintenanceEvents]);

  // Group by asset type
  const maintenanceByType = useMemo(() => {
    const typeMap = new Map<string, Set<string>>();

    currentlyInMaintenance.forEach((event) => {
      if (!typeMap.has(event.name)) {
        typeMap.set(event.name, new Set());
      }
      typeMap.get(event.name)!.add(event.asset_id);
    });

    // Simulate fleet size (in production, this would come from asset inventory)
    const fleetSizes: Record<string, number> = {
      'Belt Loader': 45,
      'Cargo Loader': 38,
      'Bag Tractor': 52,
      'Pushback': 28,
      'Forklift': 35,
      'Deicing Truck': 22,
      'Lavatory Service': 18,
      'GPU': 40,
    };

    return Array.from(typeMap.entries())
      .map(([type, assetIds]) => {
        const inMaintenance = assetIds.size;
        const fleetSize = fleetSizes[type] || 30;
        const outOfServicePct = ((inMaintenance / fleetSize) * 100).toFixed(1);

        return {
          type,
          inMaintenance,
          fleetSize,
          available: fleetSize - inMaintenance,
          outOfServicePct: parseFloat(outOfServicePct),
        };
      })
      .sort((a, b) => b.outOfServicePct - a.outOfServicePct);
  }, [currentlyInMaintenance]);

  // Group by make/model
  const maintenanceByModel = useMemo(() => {
    const modelMap = new Map<string, { assetType: string; assetIds: Set<string> }>();

    currentlyInMaintenance.forEach((event) => {
      const model = event.model || 'Unknown';
      const key = `${event.name}|${model}`;

      if (!modelMap.has(key)) {
        modelMap.set(key, { assetType: event.name, assetIds: new Set() });
      }
      modelMap.get(key)!.assetIds.add(event.asset_id);
    });

    // Simulate fleet size per model (approximately 1/3 of type fleet size)
    const results = Array.from(modelMap.entries())
      .map(([key, data]) => {
        const [assetType, model] = key.split('|');
        const inMaintenance = data.assetIds.size;
        
        // Estimate: each model represents ~1/3 of the asset type fleet
        const estimatedFleetSize = Math.floor(maintenanceByType.find(t => t.type === assetType)?.fleetSize || 30) / 3;
        const outOfServicePct = ((inMaintenance / estimatedFleetSize) * 100).toFixed(1);

        return {
          assetType,
          model,
          inMaintenance,
          estimatedFleetSize,
          available: estimatedFleetSize - inMaintenance,
          outOfServicePct: parseFloat(outOfServicePct),
        };
      })
      .sort((a, b) => {
        if (a.assetType !== b.assetType) {
          return a.assetType.localeCompare(b.assetType);
        }
        return b.outOfServicePct - a.outOfServicePct;
      });

    return results;
  }, [currentlyInMaintenance, maintenanceByType]);

  const totalInMaintenance = currentlyInMaintenance.length;
  const totalAssetTypes = maintenanceByType.length;
  const avgOutOfService = maintenanceByType.length > 0
    ? (maintenanceByType.reduce((sum, item) => sum + item.outOfServicePct, 0) / maintenanceByType.length).toFixed(1)
    : '0';

  // Data for pie chart
  const pieData = maintenanceByType.map(item => ({
    name: item.type,
    value: item.inMaintenance,
  }));

  const COLORS = ['#58A6FF', '#1F6FEB', '#388BFD', '#58A6FF', '#79C0FF', '#A5D6FF', '#C6E2FF', '#DDEFFF'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Assets in Maintenance</h1>
        <p className="text-gray-400">Current out-of-service assets by type and make/model</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total in Maintenance</span>
            <Wrench className="w-5 h-5 text-primary-cyan" />
          </div>
          <div className="text-3xl font-bold text-white">{totalInMaintenance}</div>
          <div className="text-gray-400 text-sm mt-2">Events in last 4 hours</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Asset Types Affected</span>
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-white">{totalAssetTypes}</div>
          <div className="text-gray-400 text-sm mt-2">Different types</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Avg Out of Service</span>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-white">{avgOutOfService}%</div>
          <div className="text-gray-400 text-sm mt-2">Across all types</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Distribution by Asset Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
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

        {/* Bar Chart - Out of Service % */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Out of Service Rate by Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={maintenanceByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
              <XAxis dataKey="type" stroke="#8B949E" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#8B949E" label={{ value: '%', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161B22',
                  border: '1px solid #30363D',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="outOfServicePct" fill="#EF4444" name="Out of Service %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Assets by Type Table */}
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-white">Maintenance Status by Asset Type</h2>
          <p className="text-sm text-gray-400 mt-1">Current fleet availability</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-hover">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Asset Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  In Maintenance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Fleet Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Out of Service %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {maintenanceByType.map((item, index) => {
                const isHighRate = item.outOfServicePct >= 15;
                const isMediumRate = item.outOfServicePct >= 8 && item.outOfServicePct < 15;

                return (
                  <tr key={index} className="hover:bg-dark-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">{item.type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/20 text-red-400">
                        {item.inMaintenance}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/20 text-green-400">
                        {item.available}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">{item.fleetSize}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isHighRate ? 'bg-red-500' : isMediumRate ? 'bg-yellow-500' : 'bg-green-500'}`} />
                        <span className="text-sm text-white font-semibold">{item.outOfServicePct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assets by Make/Model Table */}
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-white">Maintenance Status by Make/Model</h2>
          <p className="text-sm text-gray-400 mt-1">Detailed breakdown by specific equipment models</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-hover">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Asset Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Make/Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  In Maintenance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Est. Fleet Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Out of Service %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {maintenanceByModel.map((item, index) => {
                const isHighRate = item.outOfServicePct >= 20;
                const isMediumRate = item.outOfServicePct >= 10 && item.outOfServicePct < 20;

                return (
                  <tr key={index} className="hover:bg-dark-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">{item.assetType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">{item.model}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/20 text-red-400">
                        {item.inMaintenance}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/20 text-green-400">
                        {item.available}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">{item.estimatedFleetSize}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isHighRate ? 'bg-red-500' : isMediumRate ? 'bg-yellow-500' : 'bg-green-500'}`} />
                        <span className="text-sm text-white font-semibold">{item.outOfServicePct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-dark-border bg-dark-bg">
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Low (&lt;10%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Medium (10-20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>High (&gt;20%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetsInMaintenance;
