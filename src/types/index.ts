export interface GSEEvent {
  channel: string;
  event: string;
  asset_id: string;
  name: string;
  model?: string;
  branch?: string;
  data: {
    event_details_type: string;
    latitude: number;
    longitude: number;
    happened_at: string;
    driver_id: string | null;
    duration: number;
    details?: Record<string, any>;
  };
}

export interface Station {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

export const STATIONS: Station[] = [
  { code: 'YVR', name: 'Vancouver', lat: 49.1967, lng: -123.1815 },
  { code: 'YYC', name: 'Calgary', lat: 51.1315, lng: -114.0106 },
  { code: 'YEG', name: 'Edmonton', lat: 53.3097, lng: -113.5800 },
  { code: 'YWG', name: 'Winnipeg', lat: 49.9100, lng: -97.2398 },
  { code: 'YYZ', name: 'Toronto', lat: 43.6777, lng: -79.6248 },
  { code: 'YOW', name: 'Ottawa', lat: 45.3225, lng: -75.6692 },
  { code: 'YUL', name: 'Montreal', lat: 45.4706, lng: -73.7408 },
  { code: 'YQB', name: 'Quebec City', lat: 46.7911, lng: -71.3933 },
  { code: 'YHZ', name: 'Halifax', lat: 44.8808, lng: -63.5086 },
  { code: 'YYT', name: 'St. John\'s', lat: 47.6186, lng: -52.7519 },
];

export const ASSET_TYPES = [
  'Belt Loader',
  'Cargo Loader',
  'Bag Tractor',
  'Pushback',
  'Forklift',
  'Deicing Truck',
  'Lavatory Service',
  'GPU',
] as const;

export const BRANCHES = [
  'Airports',
  'Cargo',
  'ACM',
  'Cabins',
  'Other',
] as const;

export const SAFETY_EVENT_TYPES = [
  'harsh_acceleration',
  'harsh_brake',
  'harsh_jump',
  'harsh_turn',
  'shock',
  'safety_alert',
  'unauthorized_driver',
] as const;

export const EMPLOYEE_IDS = [
  'AC101234',
  'AC101456',
  'AC102789',
  'AC103012',
  'AC104567',
  'AC105890',
  'AC106123',
  'AC107456',
  'AC108789',
  'AC109012',
] as const;

export type AssetType = typeof ASSET_TYPES[number];
export type SafetyEventType = typeof SAFETY_EVENT_TYPES[number];
