import { useState } from 'react';
import { PanelLeft, PanelLeftClose, LogOut, User, Calendar, Filter, Search, ChevronDown } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '../contexts/AuthContext';
import { useFilters } from '../contexts/FilterContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { STATIONS, ASSET_TYPES, BRANCHES } from '../types';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, sidebarOpen }) => {
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();
  const {
    selectedStations,
    setSelectedStations,
    selectedBranches,
    setSelectedBranches,
    dateRange,
    setDateRange,
    selectedAssetTypes,
    setSelectedAssetTypes,
    searchQuery,
    setSearchQuery,
  } = useFilters();

  const [showStationDropdown, setShowStationDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const datePresets = [
    { label: 'Yesterday', days: 1, isYesterday: true },
    { label: 'Today', days: 0 },
    { label: 'Last 7 Days', days: 6 },
    { label: 'Last 14 Days', days: 13 },
  ];

  const handleDatePreset = (days: number, isYesterday?: boolean) => {
    if (isYesterday) {
      // Yesterday: start and end both yesterday
      const yesterday = subDays(new Date(), 1);
      setDateRange({
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
      });
    } else {
      // Today or Last N days: from N days ago to now
      setDateRange({
        start: startOfDay(subDays(new Date(), days)),
        end: endOfDay(new Date()),
      });
    }
  };

  const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    if (start && end) {
      setDateRange({
        start: startOfDay(start),
        end: endOfDay(end),
      });
      setShowDatePicker(false);
    }
  };

  // Calculate max date (today) and min date (14 days ago)
  const maxDate = new Date();
  const minDate = subDays(new Date(), 13);

  const toggleStation = (code: string) => {
    setSelectedStations(
      selectedStations.includes(code)
        ? selectedStations.filter((s) => s !== code)
        : [...selectedStations, code]
    );
  };

  const toggleAssetType = (type: string) => {
    setSelectedAssetTypes(
      selectedAssetTypes.includes(type)
        ? selectedAssetTypes.filter((t) => t !== type)
        : [...selectedAssetTypes, type]
    );
  };

  const toggleBranch = (branch: string) => {
    setSelectedBranches(
      selectedBranches.includes(branch)
        ? selectedBranches.filter((b) => b !== branch)
        : [...selectedBranches, branch]
    );
  };

  return (
    <header className="h-16 bg-dark-card border-b border-dark-border flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-dark-hover rounded-md transition-colors"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-5 h-5 text-gray-400" />
          ) : (
            <PanelLeft className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* Connection status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-400">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Center section - Filters */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search asset or employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-cyan w-64"
          />
        </div>

        {/* Date Range */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-dark-bg border border-dark-border rounded-md px-3 py-2">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 hover:text-primary-cyan transition-colors"
              title="Open calendar"
            >
              <Calendar className="w-4 h-4 text-gray-500 hover:text-primary-cyan" />
            </button>
            <span className="text-sm text-white">
              {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d, yyyy')}
            </span>
            <div className="flex gap-1 ml-2">
              {datePresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleDatePreset(preset.days, preset.isYesterday)}
                  className="px-2 py-1 text-xs bg-dark-hover hover:bg-primary-cyan/20 text-gray-400 hover:text-primary-cyan rounded transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          {showDatePicker && (
            <div className="absolute top-full mt-2 right-0 z-50 bg-dark-card border border-dark-border rounded-lg shadow-xl p-2">
              <DatePicker
                selected={dateRange.start}
                onChange={handleDateRangeChange}
                startDate={dateRange.start}
                endDate={dateRange.end}
                selectsRange
                inline
                minDate={minDate}
                maxDate={maxDate}
                calendarClassName="dark-datepicker"
              />
              <button
                onClick={() => setShowDatePicker(false)}
                className="w-full mt-2 px-3 py-2 bg-primary-cyan hover:bg-primary-cyan/80 text-white rounded-md text-sm transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Station Filter */}
        <div className="relative">
          <button
            onClick={() => setShowStationDropdown(!showStationDropdown)}
            className="flex items-center gap-2 bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-white hover:bg-dark-hover transition-colors"
          >
            <Filter className="w-4 h-4" />
            Stations {selectedStations.length > 0 && `(${selectedStations.length})`}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showStationDropdown && (
            <div className="absolute top-full mt-2 right-0 bg-dark-card border border-dark-border rounded-md shadow-lg w-56 max-h-96 overflow-y-auto z-50">
              <div className="p-2">
                {STATIONS.map((station) => (
                  <label
                    key={station.code}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-dark-hover rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStations.includes(station.code)}
                      onChange={() => toggleStation(station.code)}
                      className="rounded border-gray-500"
                    />
                    <span className="text-sm text-white">
                      {station.code} - {station.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Branch/Division Filter */}
        <div className="relative">
          <button
            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
            className="flex items-center gap-2 bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-white hover:bg-dark-hover transition-colors"
          >
            <Filter className="w-4 h-4" />
            Branch {selectedBranches.length > 0 && `(${selectedBranches.length})`}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showBranchDropdown && (
            <div className="absolute top-full mt-2 right-0 bg-dark-card border border-dark-border rounded-md shadow-lg w-56 max-h-96 overflow-y-auto z-50">
              <div className="p-2">
                {BRANCHES.map((branch) => (
                  <label
                    key={branch}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-dark-hover rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBranches.includes(branch)}
                      onChange={() => toggleBranch(branch)}
                      className="rounded border-gray-500"
                    />
                    <span className="text-sm text-white">{branch}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Asset Type Filter */}
        <div className="relative">
          <button
            onClick={() => setShowAssetDropdown(!showAssetDropdown)}
            className="flex items-center gap-2 bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-white hover:bg-dark-hover transition-colors"
          >
            <Filter className="w-4 h-4" />
            Assets {selectedAssetTypes.length > 0 && `(${selectedAssetTypes.length})`}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showAssetDropdown && (
            <div className="absolute top-full mt-2 right-0 bg-dark-card border border-dark-border rounded-md shadow-lg w-56 max-h-96 overflow-y-auto z-50">
              <div className="p-2">
                {ASSET_TYPES.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-dark-hover rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssetTypes.includes(type)}
                      onChange={() => toggleAssetType(type)}
                      className="rounded border-gray-500"
                    />
                    <span className="text-sm text-white">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right section - User */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 hover:bg-dark-hover rounded-md p-2 transition-colors"
        >
          <div className="w-8 h-8 bg-primary-cyan rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-dark-bg" />
          </div>
        </button>

        {showUserMenu && (
          <div className="absolute top-full mt-2 right-0 bg-dark-card border border-dark-border rounded-md shadow-lg w-48 z-50">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-dark-hover transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
