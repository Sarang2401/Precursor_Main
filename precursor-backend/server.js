// ============================================================================
// PRECURSOR - Pharmaceutical Supply Chain Tracking Backend
// Node.js + Express + SQLite + GPS Simulation
// ============================================================================

import Database from 'better-sqlite3';
import cors from 'cors';
import { randomUUID } from 'crypto';
import express from 'express';

// ============================================================================
// Configuration
// ============================================================================

const app = express();
const PORT = 3000;
const SIMULATION_INTERVAL = 5000; // 5 seconds
const OFF_ROUTE_THRESHOLD = 0.3; // km

// Authorized route (Pune area - sample coordinates)
const AUTHORIZED_ROUTE = [
  { lat: 18.5204, lon: 73.8567 }, // Pune Starting Point
  { lat: 18.5314, lon: 73.8446 }, // Shivajinagar
  { lat: 18.5362, lon: 73.8253 }, // Deccan
  { lat: 18.5435, lon: 73.8258 }, // Near Fergusson College
  { lat: 18.5562, lon: 73.8090 }, // Kothrud
  { lat: 18.5074, lon: 73.8077 }  // Ending Point
];

// ============================================================================
// Database Setup
// ============================================================================

const db = new Database('precursor.db');
db.pragma('journal_mode = WAL'); // Better concurrency

// Create tables if they don't exist
function initializeDatabase() {
  console.log('📦 Initializing database...');

  // Shipments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      initialWeight REAL NOT NULL,
      currentWeight REAL NOT NULL,
      status TEXT DEFAULT 'Pending',
      createdAt TEXT NOT NULL
    )
  `);

  // Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      shipmentId TEXT NOT NULL,
      type TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      temperature REAL,
      humidity REAL,
      weight REAL,
      offRoute INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (shipmentId) REFERENCES shipments(id)
    )
  `);

  // Simulation table
  db.exec(`
    CREATE TABLE IF NOT EXISTS simulation (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      offRoute INTEGER DEFAULT 0,
      indexPos INTEGER DEFAULT 0,
      activeShipmentId TEXT
    )
  `);

  // Initialize simulation table with first route point
  const simExists = db.prepare('SELECT COUNT(*) as count FROM simulation').get();
  if (simExists.count === 0) {
    db.prepare(`
      INSERT INTO simulation (id, lat, lon, offRoute, indexPos, activeShipmentId)
      VALUES (1, ?, ?, 0, 0, NULL)
    `).run(AUTHORIZED_ROUTE[0].lat, AUTHORIZED_ROUTE[0].lon);
    console.log('✅ Simulation table initialized');
  }

  console.log('✅ Database tables ready');
}

// ============================================================================
// Haversine Distance Calculation (km)
// ============================================================================

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// GPS Simulation Logic
// ============================================================================

function simulateGPSStep() {
  const sim = db.prepare('SELECT * FROM simulation WHERE id = 1').get();
  
  if (!sim.activeShipmentId) {
    // No active shipment, don't simulate
    return;
  }

  // Get next route index
  let nextIndex = (sim.indexPos + 1) % AUTHORIZED_ROUTE.length;
  const targetPoint = AUTHORIZED_ROUTE[nextIndex];

  // Add random jitter (±0.001 degrees ≈ ±100m)
  const jitterLat = (Math.random() - 0.5) * 0.002;
  const jitterLon = (Math.random() - 0.5) * 0.002;
  
  const newLat = targetPoint.lat + jitterLat;
  const newLon = targetPoint.lon + jitterLon;

  // Check if off-route
  const distance = haversineDistance(newLat, newLon, targetPoint.lat, targetPoint.lon);
  const isOffRoute = distance > OFF_ROUTE_THRESHOLD ? 1 : 0;

  // Update simulation state
  db.prepare(`
    UPDATE simulation 
    SET lat = ?, lon = ?, offRoute = ?, indexPos = ?
    WHERE id = 1
  `).run(newLat, newLon, isOffRoute, nextIndex);

  // Update shipment status
  const newStatus = isOffRoute ? 'OFF_ROUTE' : 'In Transit';
  db.prepare(`
    UPDATE shipments 
    SET status = ?, currentWeight = currentWeight - 0.01
    WHERE id = ?
  `).run(newStatus, sim.activeShipmentId);

  // Log GPS event
  const eventId = randomUUID();
  const timestamp = new Date().toISOString();
  
  // Simulate environmental data
  const temperature = 20 + Math.random() * 10; // 20-30°C
  const humidity = 40 + Math.random() * 20; // 40-60%

  db.prepare(`
    INSERT INTO events (id, shipmentId, type, latitude, longitude, temperature, humidity, weight, offRoute, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    sim.activeShipmentId,
    'GPS_UPDATE',
    newLat,
    newLon,
    temperature,
    humidity,
    null,
    isOffRoute,
    timestamp
  );

  console.log(`🛰️  GPS Update: [${newLat.toFixed(4)}, ${newLon.toFixed(4)}] ${isOffRoute ? '⚠️ OFF-ROUTE' : '✅ On Route'}`);
}

// ============================================================================
// Middleware
// ============================================================================

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Endpoints - Manufacturer
// ============================================================================

// POST /shipments - Create new shipment
app.post('/shipments', (req, res) => {
  try {
    const { productId, origin, destination, initialWeight } = req.body;

    if (!productId || !origin || !destination || initialWeight === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: productId, origin, destination, initialWeight' 
      });
    }

    // Coerce and validate numeric weight to avoid storing garbage (e.g., strings)
    const initialWeightNum = Number(initialWeight);
    if (!Number.isFinite(initialWeightNum) || initialWeightNum <= 0) {
      return res.status(400).json({ error: 'initialWeight must be a positive number' });
    }

    const shipmentId = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO shipments (id, productId, origin, destination, initialWeight, currentWeight, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(shipmentId, productId, origin, destination, initialWeightNum, initialWeightNum, 'Pending', createdAt);

    // If no active shipment, set this as active
    const sim = db.prepare('SELECT activeShipmentId FROM simulation WHERE id = 1').get();
    if (!sim.activeShipmentId) {
      db.prepare('UPDATE simulation SET activeShipmentId = ?, indexPos = 0 WHERE id = 1')
        .run(shipmentId);
      
      // Set shipment to In Transit
      db.prepare('UPDATE shipments SET status = ? WHERE id = ?')
        .run('In Transit', shipmentId);
      
      console.log(`🚛 Active shipment set: ${shipmentId}`);
    }

    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(shipmentId);

    res.status(201).json({
      message: 'Shipment created successfully',
      shipment
    });
  } catch (error) {
    console.error('Error creating shipment:', error);
    res.status(500).json({ error: 'Failed to create shipment' });
  }
});

// ============================================================================
// Endpoints - Driver
// ============================================================================

// GET /shipments - Get all shipments
app.get('/shipments', (req, res) => {
  try {
    const shipments = db.prepare('SELECT * FROM shipments ORDER BY createdAt DESC').all();
    res.json({ shipments });
  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

// GET /shipments/:id - Get specific shipment with events
app.get('/shipments/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(id);
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const events = db.prepare('SELECT * FROM events WHERE shipmentId = ? ORDER BY timestamp DESC').all(id);
    
    res.json({ shipment, events });
  } catch (error) {
    console.error('Error fetching shipment:', error);
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
});

// POST /shipments/:id/scan - Driver checkpoint scan
app.post('/shipments/:id/scan', (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, temperature, humidity, weight } = req.body;

    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(id);
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Validate optional numeric weight to prevent garbage values
    let weightNum = null;
    if (weight !== undefined && weight !== null) {
      weightNum = Number(weight);
      if (!Number.isFinite(weightNum)) {
        return res.status(400).json({ error: 'weight must be a number' });
      }
    }

    // Create checkpoint event
    const eventId = randomUUID();
    const timestamp = new Date().toISOString();

    db.prepare(`
      INSERT INTO events (id, shipmentId, type, latitude, longitude, temperature, humidity, weight, offRoute, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(eventId, id, 'CHECKPOINT_SCAN', latitude, longitude, temperature, humidity, weightNum, timestamp);

    // Update shipment current weight if provided
    if (weightNum !== null) {
      db.prepare('UPDATE shipments SET currentWeight = ? WHERE id = ?').run(weightNum, id);
    }

    res.json({
      message: 'Checkpoint scan recorded',
      event: db.prepare('SELECT * FROM events WHERE id = ?').get(eventId)
    });
  } catch (error) {
    console.error('Error recording scan:', error);
    res.status(500).json({ error: 'Failed to record scan' });
  }
});

// ============================================================================
// Endpoints - Simulation / GPS
// ============================================================================

// GET /simulate - Get current simulation state
app.get('/simulate', (req, res) => {
  try {
    const sim = db.prepare('SELECT * FROM simulation WHERE id = 1').get();
    res.json({
      lat: sim.lat,
      lon: sim.lon,
      offRoute: sim.offRoute === 1,
      activeShipmentId: sim.activeShipmentId,
      indexPos: sim.indexPos
    });
  } catch (error) {
    console.error('Error fetching simulation:', error);
    res.status(500).json({ error: 'Failed to fetch simulation state' });
  }
});

// POST /simulate/step - Manually trigger simulation step
app.post('/simulate/step', (req, res) => {
  try {
    simulateGPSStep();
    const sim = db.prepare('SELECT * FROM simulation WHERE id = 1').get();
    res.json({
      message: 'Simulation step executed',
      lat: sim.lat,
      lon: sim.lon,
      offRoute: sim.offRoute === 1,
      activeShipmentId: sim.activeShipmentId
    });
  } catch (error) {
    console.error('Error executing simulation step:', error);
    res.status(500).json({ error: 'Failed to execute simulation step' });
  }
});

// GET /events - Get all events (for regulator)
app.get('/events', (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events ORDER BY timestamp DESC LIMIT 100').all();
    res.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// Server Initialization
// ============================================================================

function startServer() {
  initializeDatabase();
  
  // Start GPS simulation interval
  setInterval(simulateGPSStep, SIMULATION_INTERVAL);
  console.log(`🛰️  GPS simulation started (${SIMULATION_INTERVAL}ms interval)`);

  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🚀 ========================================');
    console.log('   PRECURSOR Backend Running');
    console.log('========================================');
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Network:  http://0.0.0.0:${PORT}`);
    console.log('========================================');
    console.log('');
  });
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  db.close();
  process.exit(0);
});