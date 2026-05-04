import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { GSEEvent } from '../types';
import { generateHistoricalEvents, generateLiveEvent } from '../utils/eventGenerator';

interface WebSocketContextType {
  events: GSEEvent[];
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<GSEEvent[]>(() => generateHistoricalEvents(2000, 14));
  const [isConnected] = useState(true);

  useEffect(() => {
    // Simulate live events arriving every 3 seconds
    const interval = setInterval(() => {
      const newEvent = generateLiveEvent();
      setEvents((prev) => [newEvent, ...prev].slice(0, 3000));
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ events, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
