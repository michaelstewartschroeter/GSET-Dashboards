import React, { createContext, useContext, useState, ReactNode } from 'react';
import { subDays, startOfDay, endOfDay } from 'date-fns';

interface FilterContextType {
  selectedStations: string[];
  setSelectedStations: (stations: string[]) => void;
  selectedBranches: string[];
  setSelectedBranches: (branches: string[]) => void;
  dateRange: { start: Date; end: Date };
  setDateRange: (range: { start: Date; end: Date }) => void;
  selectedAssetTypes: string[];
  setSelectedAssetTypes: (types: string[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfDay(subDays(new Date(), 13)), // Last 14 days
    end: endOfDay(new Date()),
  });
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <FilterContext.Provider
      value={{
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
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};
