import { NavLink } from 'react-router-dom';
import { 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  Users, 
  Shield,
  CheckSquare,
  BarChart3,
  Clock,
  Wrench,
  AlertCircle,
  Battery,
} from 'lucide-react';
import bagTractorLogo from '../../BagTractor.svg';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const navItems = [
    {
      category: 'SAFETY',
      items: [
        { path: '/safety/by-employee', label: 'By Employee', icon: Users },
        { path: '/safety/by-event-type', label: 'By Event Type', icon: AlertTriangle },
        { path: '/safety/by-asset-type', label: 'By Asset Type', icon: TrendingUp },
        { path: '/safety/unauthorized', label: 'Unauthorized Access', icon: Shield },
        { path: '/safety/inspection', label: 'Inspection Compliance', icon: CheckSquare },
      ],
    },
    {
      category: 'FLEET OPERATIONS',
      items: [
        { path: '/fleet/utilization', label: 'Utilization Rate', icon: BarChart3 },
        { path: '/fleet/availability', label: 'Availability', icon: Activity },
        { path: '/fleet/downtime', label: 'Downtime', icon: Clock },
        { path: '/fleet/in-maintenance', label: 'In Maintenance', icon: Wrench },
        { path: '/fleet/faults', label: 'Critical Faults', icon: AlertCircle },
        { path: '/fleet/battery', label: 'EV Battery Alerts', icon: Battery },
      ],
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-dark-card border-r border-dark-border transition-all duration-300 z-50 ${
        isOpen ? 'w-64' : 'w-16'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-dark-border overflow-hidden">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center transition-all duration-300 ${isOpen ? 'w-60 h-60' : 'w-24 h-24'}`}>
              <img src={bagTractorLogo} alt="Bag Tractor" className={`transition-all duration-300 ${isOpen ? 'w-60 h-60' : 'w-24 h-24'}`} />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navItems.map((section) => (
            <div key={section.category} className="mb-6">
              {isOpen && (
                <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.category}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary-cyan/10 text-primary-cyan'
                          : 'text-gray-400 hover:bg-dark-hover hover:text-white'
                      }`
                    }
                    title={!isOpen ? item.label : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {isOpen && <span className="text-sm">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
