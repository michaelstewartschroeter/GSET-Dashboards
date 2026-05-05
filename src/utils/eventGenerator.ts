import { GSEEvent } from '../types';

// ─── Static reference data (mirrors server/index.js) ───────────────────────

const STATIONS = [
  { code: 'YVR', name: 'Vancouver',    lat: 49.1967, lng: -123.1815 },
  { code: 'YYC', name: 'Calgary',      lat: 51.1315, lng: -114.0106 },
  { code: 'YEG', name: 'Edmonton',     lat: 53.3097, lng: -113.5800 },
  { code: 'YWG', name: 'Winnipeg',     lat: 49.9100, lng:  -97.2398 },
  { code: 'YYZ', name: 'Toronto',      lat: 43.6777, lng:  -79.6248 },
  { code: 'YOW', name: 'Ottawa',       lat: 45.3225, lng:  -75.6692 },
  { code: 'YUL', name: 'Montreal',     lat: 45.4706, lng:  -73.7408 },
  { code: 'YQB', name: 'Quebec City',  lat: 46.7911, lng:  -71.3933 },
  { code: 'YHZ', name: 'Halifax',      lat: 44.8808, lng:  -63.5086 },
  { code: 'YYT', name: "St. John's",   lat: 47.6186, lng:  -52.7519 },
];

const ASSET_TYPES = [
  'Belt Loader',
  'Cargo Loader',
  'Bag Tractor',
  'Pushback',
  'Forklift',
  'Deicing Truck',
  'Lavatory Service',
  'GPU',
];

const ASSET_MODELS: Record<string, string[]> = {
  'Belt Loader':      ['Charlatte Manutention BL-620', 'TLD ULD-7', 'Mallaghan BL800'],
  'Cargo Loader':     ['JBT-AeroTech 60K', 'TLD ACL-70', 'K-Loader K-65'],
  'Bag Tractor':      ['TowFLEXX TF-1', 'Eagle Tugs TD3000', 'Lektro RT-18'],
  'Pushback':         ['TLD TMX-150', 'JBT AeroMobil', 'Goldhofer AST-1X'],
  'Forklift':         ['Toyota 8FD30', 'Hyster H120XL', 'Crown FC5200'],
  'Deicing Truck':    ['Vestergaard D-11', 'JBT Tempest', 'FMC EBDI'],
  'Lavatory Service': ['TLD LAV-25', 'Mallaghan LST400', 'Vestergaard E-760'],
  'GPU':              ['ITW GSE 2400', 'TLD GPU-418', 'Hobart 4400'],
};

const SAFETY_EVENT_TYPES = [
  'harsh_acceleration',
  'harsh_brake',
  'harsh_jump',
  'harsh_turn',
  'shock',
  'safety_alert',
  'unauthorized_driver',
  'unqualified_driver',
];

const OTHER_EVENT_TYPES = [
  'use',
  'charging',
  'idle',
  'move',
  'working',
  'busy',
  'data_trouble_code_start',
  'e_stop',
  'low_backup_battery_alert',
  'unauthorized_use',
];

const EMPLOYEE_IDS = [
  'AC101234', 'AC101456', 'AC102789', 'AC103012', 'AC104567',
  'AC105890', 'AC106123', 'AC107456', 'AC108789', 'AC109012',
];

const TROUBLE_CODES = ['Z000F', 'Z0001', 'Z0002', 'Z0003', 'Z0004'];

// Qualifications an employee can hold (from the certification matrix)
const QUALIFICATIONS = [
  'ASU',
  'Belt Loader',
  'Cargo Tractor',
  'GPU',
  'Lower Deck Loader',
  'Main Deck Loader',
  'Pushback',
];

// Asset types that map to a required qualification
const QUALIFIED_ASSET_TYPES = ['Belt Loader', 'Cargo Loader', 'Bag Tractor', 'GPU', 'Pushback'];

const ASSET_REQUIRED_QUALIFICATION: Record<string, string | string[]> = {
  'Belt Loader':  'Belt Loader',
  'Cargo Loader': ['Lower Deck Loader', 'Main Deck Loader'],
  'Bag Tractor':  'Cargo Tractor',
  'GPU':          'GPU',
  'Pushback':     'Pushback',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max));
}

function getBranch(assetType: string, assetId: string): string {
  if (assetType === 'Lavatory Service') return 'Airports';
  if (assetType === 'Deicing Truck')    return 'ACM';
  if (assetType === 'GPU')              return 'Airports';
  if (assetType === 'Forklift')         return 'Cargo';
  const match = assetId.match(/(\d+)$/);
  if (match) {
    return parseInt(match[1]) % 5 < 3 ? 'Airports' : 'Cargo';
  }
  return 'Other';
}

// ─── Single-event generator ─────────────────────────────────────────────────

function makeEvent(happenedAt: Date): GSEEvent {
  const isSafety  = Math.random() < 0.3;
  const station   = pick(STATIONS);
  const eventType = isSafety ? pick(SAFETY_EVENT_TYPES) : pick(OTHER_EVENT_TYPES);

  // unqualified_driver events are restricted to asset types with a defined qualification
  const assetType = eventType === 'unqualified_driver'
    ? pick(QUALIFIED_ASSET_TYPES)
    : pick(ASSET_TYPES);

  const assetNum = randInt(1, 999).toString().padStart(3, '0');
  const assetId  = `${station.code}-${assetType.replace(/\s+/g, '')}-${assetNum}`;
  const model    = pick(ASSET_MODELS[assetType]);
  const branch   = getBranch(assetType, assetId);
  const lat      = station.lat + rand(-0.01, 0.01);
  const lng      = station.lng + rand(-0.01, 0.01);

  const details: Record<string, unknown> = { id: randInt(1, 100_000_000) };

  if (['harsh_acceleration', 'harsh_brake', 'harsh_turn', 'harsh_jump'].includes(eventType)) {
    details.speed     = randInt(10, 50);
    details.threshold = randInt(30, 90);
  } else if (eventType === 'shock') {
    details.acceleration = randInt(20, 50);
  } else if (eventType === 'safety_alert') {
    details.alert_reason = pick(['missing_driver_seatbelt', 'driver_seatbelt_on_while_not_sitting']);
  } else if (['use', 'move', 'working'].includes(eventType)) {
    details.latitude_end  = lat + rand(-0.005, 0.005);
    details.longitude_end = lng + rand(-0.005, 0.005);
    details.distance_km   = rand(0.01, 2.0);
  } else if (eventType === 'data_trouble_code_start') {
    details.code = pick(TROUBLE_CODES);
  } else if (eventType === 'low_backup_battery_alert') {
    details.value = randInt(5, 25);
  } else if (eventType === 'charging') {
    details.battery_level_before_charging = randInt(10, 40);
    details.battery_level_after_charging  = null;
  } else if (eventType === 'unqualified_driver') {
    const reqQuals = ASSET_REQUIRED_QUALIFICATION[assetType];
    const required = Array.isArray(reqQuals) ? pick(reqQuals) : reqQuals;
    const others   = QUALIFICATIONS.filter(q => q !== required).sort(() => Math.random() - 0.5);
    details.required_qualification   = required;
    details.employee_qualifications  = others.slice(0, randInt(1, 4)).join(', ') || 'None';
  }

  const isLong   = ['idle', 'working', 'busy'].includes(eventType);
  const duration = isLong ? randInt(60, 3600) : randInt(5, 300);

  // unauthorized_use: no driver known; safety events: always a driver; other: 70% chance
  let driver_id: string | null;
  if (eventType === 'unauthorized_use') {
    driver_id = null;
  } else if (isSafety) {
    driver_id = pick(EMPLOYEE_IDS);
  } else {
    driver_id = Math.random() > 0.3 ? pick(EMPLOYEE_IDS) : null;
  }

  return {
    channel: 'event',
    event:   'event:created',
    asset_id: assetId,
    name:     assetType,
    model,
    branch,
    data: {
      event_details_type: eventType,
      latitude:  lat,
      longitude: lng,
      happened_at: happenedAt.toISOString(),
      driver_id,
      duration,
      details,
    },
  };
}

// ─── Bulk historical generator ───────────────────────────────────────────────

/**
 * Generates `count` past events spread across the last `days` days,
 * returned newest-first (same order as the WebSocket context stores them).
 */
export function generateHistoricalEvents(count = 2000, days = 14): GSEEvent[] {
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;

  const events: GSEEvent[] = [];
  for (let i = 0; i < count; i++) {
    // Distribute events with a slight recency bias
    const ageMs = Math.random() * Math.random() * windowMs; // skews toward recent
    const happenedAt = new Date(now - ageMs);
    events.push(makeEvent(happenedAt));
  }

  // Sort newest first (mirrors how the WS context prepends events)
  events.sort((a, b) =>
    new Date(b.data.happened_at).getTime() - new Date(a.data.happened_at).getTime()
  );

  return events;
}

// ─── Live event generator ────────────────────────────────────────────────────

/** Generates a single "now" event for use in the live interval. */
export function generateLiveEvent(): GSEEvent {
  return makeEvent(new Date());
}
