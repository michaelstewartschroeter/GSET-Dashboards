import { WebSocketServer } from 'ws';

const STATIONS = [
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

// Make/Model options for each asset type
const ASSET_MODELS = {
  'Belt Loader': ['Charlatte Manutention BL-620', 'TLD ULD-7', 'Mallaghan BL800'],
  'Cargo Loader': ['JBT-AeroTech 60K', 'TLD ACL-70', 'K-Loader K-65'],
  'Bag Tractor': ['TowFLEXX TF-1', 'Eagle Tugs TD3000', 'Lektro RT-18'],
  'Pushback': ['TLD TMX-150', 'JBT AeroMobil', 'Goldhofer AST-1X'],
  'Forklift': ['Toyota 8FD30', 'Hyster H120XL', 'Crown FC5200'],
  'Deicing Truck': ['Vestergaard D-11', 'JBT Tempest', 'FMC EBDI'],
  'Lavatory Service': ['TLD LAV-25', 'Mallaghan LST400', 'Vestergaard E-760'],
  'GPU': ['ITW GSE 2400', 'TLD GPU-418', 'Hobart 4400'],
};

const SAFETY_EVENT_TYPES = [
  'harsh_acceleration',
  'harsh_brake',
  'harsh_jump',
  'harsh_turn',
  'shock',
  'safety_alert',
  'unauthorized_driver',
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
];

const EMPLOYEE_IDS = [
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
];

const BRANCHES = ['Airports', 'Cargo', 'ACM', 'Cabins', 'Other'];

// Assign branch based on asset characteristics
// Belt Loaders, Cargo Loaders, Bag Tractors, Pushbacks can be either Airports or Cargo
// Determined by asset_id pattern (e.g., odd/even asset numbers)
function getBranchForAsset(assetType, assetId) {
  // Fixed assignments
  if (assetType === 'Lavatory Service') return 'Airports';
  if (assetType === 'Deicing Truck') return 'ACM';
  if (assetType === 'GPU') return 'Airports';
  if (assetType === 'Forklift') return 'Cargo';
  
  // Dynamic assignments for Belt Loader, Cargo Loader, Bag Tractor, Pushback
  // Use asset number to determine branch (simulating different operational assignments)
  if (['Belt Loader', 'Cargo Loader', 'Bag Tractor', 'Pushback'].includes(assetType)) {
    // Extract number from asset_id (e.g., YVR-BeltLoader-042)
    const match = assetId.match(/(\d+)$/);
    if (match) {
      const assetNumber = parseInt(match[1]);
      // Distribute 60% to Airports, 40% to Cargo
      return assetNumber % 5 < 3 ? 'Airports' : 'Cargo';
    }
  }
  
  return 'Other';
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function generateAssetId() {
  const station = randomChoice(STATIONS);
  const assetType = randomChoice(ASSET_TYPES);
  const number = Math.floor(Math.random() * 999) + 1;
  return `${station.code}-${assetType.replace(/\s+/g, '')}-${number.toString().padStart(3, '0')}`;
}

function generateSafetyEvent() {
  const station = randomChoice(STATIONS);
  const eventType = randomChoice(SAFETY_EVENT_TYPES);
  const lat = station.lat + randomFloat(-0.01, 0.01);
  const lng = station.lng + randomFloat(-0.01, 0.01);
  const assetType = randomChoice(ASSET_TYPES);
  const assetId = generateAssetId();
  const model = randomChoice(ASSET_MODELS[assetType]);
  
  const event = {
    channel: 'event',
    event: 'event:created',
    asset_id: assetId,
    name: assetType,
    model: model,
    branch: getBranchForAsset(assetType, assetId),
    data: {
      event_details_type: eventType,
      latitude: lat,
      longitude: lng,
      happened_at: new Date().toISOString(),
      driver_id: randomChoice(EMPLOYEE_IDS),
      duration: 0,
      details: {
        id: Math.floor(Math.random() * 100000000),
      },
    },
  };

  // Add event-specific details
  if (eventType === 'harsh_acceleration' || eventType === 'harsh_brake' || eventType === 'harsh_turn' || eventType === 'harsh_jump') {
    event.data.details.speed = Math.floor(randomFloat(10, 50));
    event.data.details.threshold = Math.floor(randomFloat(30, 90));
  } else if (eventType === 'shock') {
    event.data.details.acceleration = Math.floor(randomFloat(20, 50));
  } else if (eventType === 'safety_alert') {
    const reasons = ['missing_driver_seatbelt', 'driver_seatbelt_on_while_not_sitting'];
    event.data.details.alert_reason = randomChoice(reasons);
  }

  return event;
}

function generateOtherEvent() {
  const station = randomChoice(STATIONS);
  const eventType = randomChoice(OTHER_EVENT_TYPES);
  const lat = station.lat + randomFloat(-0.01, 0.01);
  const lng = station.lng + randomFloat(-0.01, 0.01);
  const assetType = randomChoice(ASSET_TYPES);
  const assetId = generateAssetId();
  const model = randomChoice(ASSET_MODELS[assetType]);
  
  const event = {
    channel: 'event',
    event: 'event:created',
    asset_id: assetId,
    name: assetType,
    model: model,
    branch: getBranchForAsset(assetType, assetId),
    data: {
      event_details_type: eventType,
      latitude: lat,
      longitude: lng,
      happened_at: new Date().toISOString(),
      driver_id: Math.random() > 0.3 ? randomChoice(EMPLOYEE_IDS) : null,
      duration: eventType === 'idle' || eventType === 'working' || eventType === 'busy' ? Math.floor(randomFloat(60, 3600)) : Math.floor(randomFloat(5, 300)),
      details: {
        id: Math.floor(Math.random() * 100000000),
      },
    },
  };

  // Add event-specific details
  if (eventType === 'use' || eventType === 'move' || eventType === 'working') {
    event.data.details.latitude_end = lat + randomFloat(-0.005, 0.005);
    event.data.details.longitude_end = lng + randomFloat(-0.005, 0.005);
    event.data.details.distance_km = randomFloat(0.01, 2.0);
  } else if (eventType === 'data_trouble_code_start') {
    const troubleCodes = ['Z000F', 'Z0001', 'Z0002', 'Z0003', 'Z0004'];
    event.data.details.code = randomChoice(troubleCodes);
  } else if (eventType === 'low_backup_battery_alert') {
    event.data.details.value = Math.floor(randomFloat(5, 25));
  } else if (eventType === 'charging') {
    event.data.details.battery_level_before_charging = Math.floor(randomFloat(10, 40));
    event.data.details.battery_level_after_charging = null;
  }

  return event;
}

function generateEvent() {
  // 30% safety events, 70% other events
  return Math.random() < 0.3 ? generateSafetyEvent() : generateOtherEvent();
}

// Create WebSocket server
const wss = new WebSocketServer({ port: 8080 });

console.log('WebSocket server started on ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send an event every 2-5 seconds
  const interval = setInterval(() => {
    const event = generateEvent();
    ws.send(JSON.stringify(event));
  }, randomFloat(2000, 5000));

  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearInterval(interval);
  });
});
