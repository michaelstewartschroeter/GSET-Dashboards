import { useMemo } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFilters } from '../../contexts/FilterContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ClipboardCheck, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { isWithinInterval, format, eachDayOfInterval } from 'date-fns';

const InspectionCompliance: React.FC = () => {
  const { events } = useWebSocket();
  const { selectedStations, selectedBranches, dateRange, selectedAssetTypes } = useFilters();

  // For motorized assets only
  const MOTORIZED_ASSETS = ['Belt Loader', 'Cargo Loader', 'Bag Tractor', 'Pushback', 'Deicing Truck', 'Lavatory Service'];

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Only operational events for motorized assets
      if (!['use', 'working', 'move'].includes(event.data.event_details_type)) {
        return false;
      }

      // Only motorized assets require daily inspection
      if (!MOTORIZED_ASSETS.includes(event.name)) {
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

  // Simulate inspection compliance (in real system, would track actual inspection events)
  const inspectionData = useMemo(() => {
    const assetDays = new Map<string, Set<string>>();

    filteredEvents.forEach((event) => {
      const assetId = event.asset_id;
      const dayKey = format(new Date(event.data.happened_at), 'yyyy-MM-dd');
      
      if (!assetDays.has(assetId)) {
        assetDays.set(assetId, new Set());
      }
      assetDays.get(assetId)!.add(dayKey);
    });

    // Simulate inspections: 85% compliance rate
    const inspections = [];
    for (const [assetId, days] of assetDays.entries()) {
      for (const day of days) {
        const compliant = Math.random() < 0.85;
        inspections.push({
          assetId,
          date: day,
          compliant,
          timestamp: new Date(day).toISOString(),
        });
      }
    }

    return inspections;
  }, [filteredEvents]);

  // Compliance by station
  const complianceByStation = useMemo(() => {
    const stationMap = new Map<string, { compliant: number; noncompliant: number }>();

    inspectionData.forEach((inspection) => {
      const station = inspection.assetId.split('-')[0];
      if (!stationMap.has(station)) {
        stationMap.set(station, { compliant: 0, noncompliant: 0 });
      }
      const data = stationMap.get(station)!;
      if (inspection.compliant) {
        data.compliant++;
      } else {
        data.noncompliant++;
      }
    });

    return Array.from(stationMap.entries())
      .map(([station, data]) => ({
        station,
        compliant: data.compliant,
        noncompliant: data.noncompliant,
        rate: ((data.compliant / (data.compliant + data.noncompliant)) * 100).toFixed(1),
      }))
      .sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));
  }, [inspectionData]);

  // Compliance over time
  const complianceOverTime = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map((day) => {
      const dayStr = format(day, 'MMM dd');
      const dayKey = format(day, 'yyyy-MM-dd');
      
      const dayInspections = inspectionData.filter(i => i.date === dayKey);
      const compliant = dayInspections.filter(i => i.compliant).length;
      const noncompliant = dayInspections.filter(i => !i.compliant).length;

      return {
        date: dayStr,
        compliant,
        noncompliant,
        rate: dayInspections.length > 0 ? ((compliant / dayInspections.length) * 100).toFixed(1) : '0',
      };
    });
  }, [inspectionData, dateRange]);

  // Compliance by asset type
  const complianceByAssetType = useMemo(() => {
    const typeMap = new Map<string, { compliant: number; noncompliant: number }>();

    inspectionData.forEach((inspection) => {
      const assetType = inspection.assetId.split('-')[1].replace(/([A-Z])/g, ' $1').trim();
      if (!typeMap.has(assetType)) {
        typeMap.set(assetType, { compliant: 0, noncompliant: 0 });
      }
      const data = typeMap.get(assetType)!;
      if (inspection.compliant) {
        data.compliant++;
      } else {
        data.noncompliant++;
      }
    });

    return Array.from(typeMap.entries())
      .map(([type, data]) => ({
        type,
        compliant: data.compliant,
        noncompliant: data.noncompliant,
        rate: ((data.compliant / (data.compliant + data.noncompliant)) * 100).toFixed(1),
      }))
      .sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));
  }, [inspectionData]);

  const totalInspections = inspectionData.length;
  const compliantCount = inspectionData.filter(i => i.compliant).length;
  const noncompliantCount = inspectionData.filter(i => !i.compliant).length;
  const complianceRate = totalInspections > 0 ? ((compliantCount / totalInspections) * 100).toFixed(1) : '0';
  const bestStation = complianceByStation[0];

  const pieData = [
    { name: 'Compliant', value: compliantCount },
    { name: 'Non-Compliant', value: noncompliantCount },
  ];

  const COLORS = ['#10B981', '#EF4444'];

  // Recent non-compliant inspections
  const recentNoncompliant = inspectionData
    .filter(i => !i.compliant)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Daily Inspection Compliance</h1>
        <p className="text-gray-400">Tracking daily inspection requirements for motorized GSE assets</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Overall Compliance</span>
            <ClipboardCheck className="w-5 h-5 text-primary-cyan" />
          </div>
          <div className="text-3xl font-bold text-white">{complianceRate}%</div>
          <div className="text-gray-400 text-sm mt-2">{totalInspections} inspections</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Compliant</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-white">{compliantCount}</div>
          <div className="text-gray-400 text-sm mt-2">Passed inspections</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Non-Compliant</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-white">{noncompliantCount}</div>
          <div className="text-gray-400 text-sm mt-2">Failed or missed</div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Best Station</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-white">{bestStation?.station || 'N/A'}</div>
          <div className="text-gray-400 text-sm mt-2">{bestStation?.rate || 0}% compliant</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Compliance Distribution</h2>
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
                {pieData.map((_entry, index) => (
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
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Compliance Over Time */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Daily Compliance Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={complianceOverTime}>
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
              <Legend />
              <Bar dataKey="compliant" stackId="a" fill="#10B981" name="Compliant" />
              <Bar dataKey="noncompliant" stackId="a" fill="#EF4444" name="Non-Compliant" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Compliance by Station */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Compliance Rate by Station</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={complianceByStation}>
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
            <Legend />
            <Bar dataKey="compliant" stackId="a" fill="#10B981" name="Compliant" />
            <Bar dataKey="noncompliant" stackId="a" fill="#EF4444" name="Non-Compliant" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance by Station Table */}
        <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h2 className="text-lg font-semibold text-white">Station Rankings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-hover">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Station
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {complianceByStation.map((station, index) => {
                  const rate = parseFloat(station.rate);
                  const isGood = rate >= 90;
                  const isWarning = rate >= 75 && rate < 90;

                  return (
                    <tr key={station.station} className="hover:bg-dark-hover transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-white">{station.station}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isGood ? 'bg-green-500' : isWarning ? 'bg-yellow-500' : 'bg-red-500'}`} />
                          <span className="text-sm text-white font-semibold">{station.rate}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {station.compliant + station.noncompliant}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance by Asset Type */}
        <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h2 className="text-lg font-semibold text-white">Compliance by Asset Type</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-hover">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Asset Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {complianceByAssetType.map((item) => {
                  const rate = parseFloat(item.rate);
                  const isGood = rate >= 90;
                  const isWarning = rate >= 75 && rate < 90;

                  return (
                    <tr key={item.type} className="hover:bg-dark-hover transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-white">{item.type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isGood ? 'bg-green-500' : isWarning ? 'bg-yellow-500' : 'bg-red-500'}`} />
                          <span className="text-sm text-white font-semibold">{item.rate}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {item.compliant + item.noncompliant}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Non-Compliant */}
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-white">Recent Non-Compliant Inspections</h2>
        </div>
        <div className="divide-y divide-dark-border max-h-96 overflow-y-auto">
          {recentNoncompliant.map((inspection, index) => (
            <div key={index} className="px-6 py-4 hover:bg-dark-hover transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900/20 text-red-400 border border-red-500/30">
                      NON-COMPLIANT
                    </span>
                    <span className="text-sm font-medium text-white">{inspection.assetId}</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(inspection.timestamp), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InspectionCompliance;
