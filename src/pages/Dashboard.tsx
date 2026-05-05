import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import SafetyByEmployee from './dashboards/SafetyByEmployee';
import SafetyByEventType from './dashboards/SafetyByEventType';
import SafetyByAssetType from './dashboards/SafetyByAssetType';
import UnauthorizedAccess from './dashboards/UnauthorizedAccess';
import UnqualifiedAccess from './dashboards/UnqualifiedAccess';
import InspectionCompliance from './dashboards/InspectionCompliance';
import UtilizationRate from './dashboards/UtilizationRate';
import Availability from './dashboards/Availability';
import Downtime from './dashboards/Downtime';
import AssetsInMaintenance from './dashboards/AssetsInMaintenance';
import CriticalFaults from './dashboards/CriticalFaults';
import EVBatteryAlerts from './dashboards/EVBatteryAlerts';

const Dashboard: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/safety/by-employee" replace />} />
        
        {/* Safety Dashboards */}
        <Route path="/safety/by-employee" element={<SafetyByEmployee />} />
        <Route path="/safety/by-event-type" element={<SafetyByEventType />} />
        <Route path="/safety/by-asset-type" element={<SafetyByAssetType />} />
        <Route path="/safety/unauthorized" element={<UnauthorizedAccess />} />
        <Route path="/safety/unqualified"  element={<UnqualifiedAccess />} />
        <Route path="/safety/inspection"   element={<InspectionCompliance />} />
        
        {/* Fleet Operations Dashboards */}
        <Route path="/fleet/utilization" element={<UtilizationRate />} />
        <Route path="/fleet/availability" element={<Availability />} />
        <Route path="/fleet/downtime" element={<Downtime />} />
        <Route path="/fleet/in-maintenance" element={<AssetsInMaintenance />} />
        <Route path="/fleet/faults" element={<CriticalFaults />} />
        <Route path="/fleet/battery" element={<EVBatteryAlerts />} />
      </Routes>
    </Layout>
  );
};

export default Dashboard;
