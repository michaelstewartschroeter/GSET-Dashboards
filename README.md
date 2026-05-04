# GSE Real-Time Dashboards

Real-time monitoring dashboards for Air Canada Ground Support Equipment (GSE) fleet management.

## Overview

This application provides real-time visualization and analysis of GSE fleet data across 10 Canadian airports (YVR, YYC, YEG, YWG, YYZ, YOW, YUL, YQB, YHZ, YYT).

### Features

- **Real-time Event Streaming**: WebSocket connection for live MQTT message simulation
- **Multi-Station Monitoring**: Filter and view data across all 10 Air Canada stations
- **Safety Analytics**: Track safety events by employee, event type, and asset type
- **Dark Theme UI**: Particle.io-inspired design with modern dark interface
- **Advanced Filtering**: Station, asset type, date range (14-day retention), and search
- **Mock Authentication**: Hardcoded credentials for demo purposes

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Maps**: Leaflet + React-Leaflet
- **Real-time**: WebSocket (ws library)
- **Routing**: React Router v6
- **Date Handling**: date-fns

## Installation

1. **Clone and navigate to the project**:
   ```bash
   cd /Users/michael.schroeter/DEV/GSET_DASHBOARDS
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Running the Application

### Step 1: Start the WebSocket Server

In one terminal window, start the mock data generator:

```bash
npm run server
```

This starts a WebSocket server on `ws://localhost:8080` that continuously generates mock GSE events.

### Step 2: Start the Frontend

In a second terminal window, start the development server:

```bash
npm run dev
```

The application will open at `http://localhost:3000`.

### Step 3: Login

Use the following credentials:
- **Email**: `testuser@aircanada.ca`
- **Password**: `1234`

## Project Structure

```
GSET_DASHBOARDS/
├── DOCS/                           # Event type samples and CSV requirements
├── server/
│   └── index.js                    # WebSocket mock server
├── src/
│   ├── components/
│   │   ├── Layout.tsx              # Main layout wrapper
│   │   ├── Sidebar.tsx             # Left navigation sidebar
│   │   ├── TopBar.tsx              # Top bar with filters and user menu
│   │   └── PrivateRoute.tsx        # Auth route protection
│   ├── contexts/
│   │   ├── AuthContext.tsx         # Authentication state
│   │   ├── FilterContext.tsx       # Global filter state
│   │   └── WebSocketContext.tsx    # Real-time event streaming
│   ├── pages/
│   │   ├── Login.tsx               # Login page
│   │   ├── Dashboard.tsx           # Dashboard router
│   │   └── dashboards/
│   │       ├── SafetyByEmployee.tsx    # Dashboard 1.1
│   │       ├── SafetyByEventType.tsx   # Dashboard 1.2
│   │       └── SafetyByAssetType.tsx   # Dashboard 1.3
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   ├── App.tsx                     # Root component
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Global styles
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Dashboards

### Implemented (Priority)

1. **Safety Events by Employee (1.1)**
   - Ranked horizontal bar chart
   - KPI cards: total events, worst offender, trend
   - Detailed employee breakdown table

2. **Safety Events by Event Type (1.2)**
   - Bar chart distribution
   - Pie chart proportions
   - Live event feed with real-time updates

3. **Safety Events by Asset Type (1.3)**
   - Stacked bar chart by asset category
   - Top 5 worst individual assets
   - Ranking table

### Available for Future Implementation

- 1.4: Unauthorized Access Attempts
- 1.5: Daily Inspection Compliance
- 2.1-2.8: Fleet Operations (Utilization, Availability, Downtime, MTTR, MTBF, etc.)
- 3.1-3.4: System Health Monitoring
- 4.1: Fleet Optimization Index
- 5.1: Stale Fleet Report (>48 hours)

## Data Retention

- **14-day rolling window**: Only the last 14 days of data are retained
- Date range selector validates against this constraint
- Preset options: Today, Last 7 Days, Last 14 Days

## Filtering Capabilities

### Global Filters (Top Bar)
- **Station Selector**: Multi-select across 10 Canadian airports
- **Date Range**: Preset buttons with 14-day maximum
- **Asset Type**: Filter by equipment type (Belt Loader, Cargo Loader, etc.)
- **Search**: Find specific asset IDs or employee IDs

### Automatic Filtering
All dashboards automatically respond to global filter changes in real-time.

## Event Types

### Safety Events (30% of mock data)
- Harsh Acceleration
- Harsh Brake
- Harsh Jump
- Harsh Turn
- Shock/Impact
- Safety Alert (seatbelt violations)

### Operational Events (70% of mock data)
- Use
- Charging
- Idle
- Move
- Working
- Busy

## Mock Data Generation

The WebSocket server generates realistic events with:
- Random station assignment (based on actual airport coordinates)
- Realistic asset IDs (format: `{STATION}-{TYPE}-{NUMBER}`)
- Employee IDs (format: `AC######`)
- Event-specific data fields (speed, threshold, acceleration, etc.)
- Appropriate location variations within airport boundaries

Events are generated every 2-5 seconds per connected client.

## Design Language

Inspired by Particle.io:
- **Dark theme**: `#0D1117` background, `#161B22` cards
- **Accent colors**: Cyan/teal for primary actions, red/amber/green for status
- **Typography**: System fonts with clear hierarchy
- **Interactive elements**: Smooth hover states and transitions
- **Data visualization**: High-contrast charts optimized for dark backgrounds

## Future Enhancements

1. **Additional Dashboards**: Implement remaining 17 dashboards
2. **Map Visualizations**: Leaflet integration for geofence and location tracking
3. **Export Functionality**: CSV/PDF report generation
4. **Advanced Analytics**: Trend analysis, predictive maintenance
5. **Alert System**: Real-time notifications for critical events
6. **Multi-user Support**: Role-based access control
7. **Historical Data**: Integration with actual data storage backend

## Development Commands

```bash
# Install dependencies
npm install

# Start WebSocket server
npm run server

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- No Internet Explorer support

## Notes for Solution Architect

This prototype demonstrates:
1. **Data Model Validation**: Event structure matches provided JSON samples
2. **Real-time Capability**: WebSocket streaming with <1s latency
3. **Scalability**: Efficient React patterns for handling high-frequency updates
4. **UX/UI**: Professional interface suitable for operations teams
5. **Extensibility**: Modular architecture for adding remaining dashboards

### Data Model Refinement Opportunities

- Standardize employee ID format across all events
- Add asset type/class to event payload (currently inferred from name)
- Include station code explicitly in events
- Consider event severity levels for safety incidents
- Add seatbelt state fields when available (noted for 2026)
- Define consistent timestamp format (ISO 8601 is good)

## License

Internal Air Canada project - not for external distribution.
