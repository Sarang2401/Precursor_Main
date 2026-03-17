// ============================================================================
// PRECURSOR - Pharmaceutical Supply Chain Tracking Backend
// Node.js + Express + SQLite + GPS Simulation
// ============================================================================

import 'dotenv/config'; // Load .env variables (ThingSpeak credentials etc.)
import Database from 'better-sqlite3';
import cors from 'cors';
import crypto, { randomUUID } from 'crypto';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateShipmentReport, generateDailySummaryReport } from './reportGenerator.js';

// ============================================================================
// Configuration
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3000; // Render will provide PORT env var
const SIMULATION_INTERVAL = 5000; // 5 seconds
const OFF_ROUTE_THRESHOLD = 0.3; // km
const JWT_SECRET = process.env.JWT_SECRET || 'precursor_jwt_secret_key_2026'; // Change in production!

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
// Shipment Lifecycle State Machine
// ============================================================================

const SHIPMENT_STATES = {
  CREATED: 'CREATED',
  DISPATCHED: 'DISPATCHED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CONSUMED: 'CONSUMED',
  OFF_ROUTE: 'OFF_ROUTE',
  SEIZED: 'SEIZED'
};

// Valid transitions: { fromState: { toState: [allowedRoles] } }
const VALID_TRANSITIONS = {
  [SHIPMENT_STATES.CREATED]: {
    [SHIPMENT_STATES.DISPATCHED]: ['manufacturer'],
    [SHIPMENT_STATES.SEIZED]: ['regulator']
  },
  [SHIPMENT_STATES.DISPATCHED]: {
    [SHIPMENT_STATES.IN_TRANSIT]: ['driver'],
    [SHIPMENT_STATES.SEIZED]: ['regulator']
  },
  [SHIPMENT_STATES.IN_TRANSIT]: {
    [SHIPMENT_STATES.DELIVERED]: ['driver'],
    [SHIPMENT_STATES.OFF_ROUTE]: ['driver', 'system'],
    [SHIPMENT_STATES.SEIZED]: ['regulator']
  },
  [SHIPMENT_STATES.OFF_ROUTE]: {
    [SHIPMENT_STATES.IN_TRANSIT]: ['driver'],
    [SHIPMENT_STATES.SEIZED]: ['regulator']
  },
  [SHIPMENT_STATES.DELIVERED]: {
    [SHIPMENT_STATES.CONSUMED]: ['manufacturer'],
    [SHIPMENT_STATES.SEIZED]: ['regulator']
  },
  [SHIPMENT_STATES.CONSUMED]: {
    [SHIPMENT_STATES.SEIZED]: ['regulator']
  },
  [SHIPMENT_STATES.SEIZED]: {} // Terminal state, no transitions out
};

// Weight deviation thresholds for theft detection
const WEIGHT_DEVIATION_THRESHOLDS = {
  WARNING: 0.05,   // 5% loss
  CRITICAL: 0.10,  // 10% loss
  THEFT: 0.15      // 15% loss
};

// Normalize legacy/alternate status strings to canonical state keys
const STATUS_ALIASES = {
  'In Transit': 'IN_TRANSIT',
  'in transit': 'IN_TRANSIT',
  'Off Route': 'OFF_ROUTE',
  'Dispatched': 'DISPATCHED',
  'Delivered': 'DELIVERED',
  'Consumed': 'CONSUMED',
  'Seized': 'SEIZED',
  'Created': 'CREATED'
};

// Validate state transition
function validateTransition(currentState, newState, userRole) {
  // Normalize to canonical state (handles mixed-case legacy values)
  const normalizedState = STATUS_ALIASES[currentState] || currentState;
  const validNextStates = VALID_TRANSITIONS[normalizedState];
  if (!validNextStates) {
    return { valid: false, reason: `Unknown current state: ${currentState}` };
  }

  const allowedRoles = validNextStates[newState];
  if (!allowedRoles) {
    return { valid: false, reason: `Invalid transition: ${currentState} → ${newState}` };
  }

  if (!allowedRoles.includes(userRole) && !allowedRoles.includes('system')) {
    return { valid: false, reason: `Role '${userRole}' cannot perform transition: ${currentState} → ${newState}` };
  }

  return { valid: true };
}

// Check weight deviation and return alert level
function checkWeightDeviation(initialWeight, currentWeight) {
  if (initialWeight <= 0) return null;

  const deviation = (initialWeight - currentWeight) / initialWeight;

  if (deviation >= WEIGHT_DEVIATION_THRESHOLDS.THEFT) {
    return { level: 'THEFT', deviation: (deviation * 100).toFixed(1), message: 'Critical weight loss detected - possible theft' };
  } else if (deviation >= WEIGHT_DEVIATION_THRESHOLDS.CRITICAL) {
    return { level: 'CRITICAL', deviation: (deviation * 100).toFixed(1), message: 'Significant weight loss detected' };
  } else if (deviation >= WEIGHT_DEVIATION_THRESHOLDS.WARNING) {
    return { level: 'WARNING', deviation: (deviation * 100).toFixed(1), message: 'Minor weight loss detected' };
  }

  return null;
}

// ============================================================================
// Database Setup
// ============================================================================

const db = new Database('precursor.db');
db.pragma('journal_mode = WAL'); // Better concurrency

// Create tables if they don't exist
function initializeDatabase() {
  console.log('📦 Initializing database...');

  // ============================================================================
  // Organizations table - For PKI and organization identity
  // ============================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      urn TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('manufacturer', 'distributor', 'transporter', 'regulator')),
      publicKey TEXT,
      privateKeyEncrypted TEXT,
      address TEXT,
      licenseNumber TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  // ============================================================================
  // Shipments table - Enhanced with Chemical Identity Model
  // ============================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      chemicalURN TEXT,
      batchId TEXT,
      manufacturerURN TEXT,
      regulatoryClass TEXT DEFAULT 'non-controlled' CHECK(regulatoryClass IN ('controlled', 'non-controlled', 'precursor')),
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      initialWeight REAL NOT NULL,
      currentWeight REAL NOT NULL,
      unit TEXT DEFAULT 'kg',
      sensorDeviceId TEXT,
      status TEXT DEFAULT 'CREATED',
      createdAt TEXT NOT NULL
    )
  `);

  // Migration: Add new columns if they don't exist
  const shipmentCols = db.prepare("PRAGMA table_info(shipments)").all().map(c => c.name);
  if (!shipmentCols.includes('chemicalURN')) {
    db.exec(`ALTER TABLE shipments ADD COLUMN chemicalURN TEXT`);
    console.log('  ➕ Added chemicalURN to shipments');
  }
  if (!shipmentCols.includes('batchId')) {
    db.exec(`ALTER TABLE shipments ADD COLUMN batchId TEXT`);
    console.log('  ➕ Added batchId to shipments');
  }
  if (!shipmentCols.includes('manufacturerURN')) {
    db.exec(`ALTER TABLE shipments ADD COLUMN manufacturerURN TEXT`);
    console.log('  ➕ Added manufacturerURN to shipments');
  }
  if (!shipmentCols.includes('regulatoryClass')) {
    db.exec(`ALTER TABLE shipments ADD COLUMN regulatoryClass TEXT DEFAULT 'non-controlled'`);
    console.log('  ➕ Added regulatoryClass to shipments');
  }
  if (!shipmentCols.includes('unit')) {
    db.exec(`ALTER TABLE shipments ADD COLUMN unit TEXT DEFAULT 'kg'`);
    console.log('  ➕ Added unit to shipments');
  }
  if (!shipmentCols.includes('updatedAt')) {
    db.exec(`ALTER TABLE shipments ADD COLUMN updatedAt TEXT`);
    console.log('  ➕ Added updatedAt to shipments');
  }
  if (!shipmentCols.includes('sensorDeviceId')) {
    db.exec(`ALTER TABLE shipments ADD COLUMN sensorDeviceId TEXT`);
    console.log('  ➕ Added sensorDeviceId to shipments');
  }

  // ============================================================================
  // Events table - Enhanced with actor binding and signatures
  // ============================================================================
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
      actorId TEXT,
      actorRole TEXT,
      signature TEXT,
      blockHash TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (shipmentId) REFERENCES shipments(id)
    )
  `);

  // Migration: Add new columns to events if they don't exist
  const eventCols = db.prepare("PRAGMA table_info(events)").all().map(c => c.name);
  if (!eventCols.includes('actorId')) {
    db.exec(`ALTER TABLE events ADD COLUMN actorId TEXT`);
    console.log('  ➕ Added actorId to events');
  }
  if (!eventCols.includes('actorRole')) {
    db.exec(`ALTER TABLE events ADD COLUMN actorRole TEXT`);
    console.log('  ➕ Added actorRole to events');
  }
  if (!eventCols.includes('signature')) {
    db.exec(`ALTER TABLE events ADD COLUMN signature TEXT`);
    console.log('  ➕ Added signature to events');
  }
  if (!eventCols.includes('blockHash')) {
    db.exec(`ALTER TABLE events ADD COLUMN blockHash TEXT`);
    console.log('  ➕ Added blockHash to events');
  }

  // ============================================================================
  // Simulation table
  // ============================================================================
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

  // ============================================================================
  // Users table - Enhanced with PKI and organization link
  // ============================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('manufacturer', 'driver', 'regulator', 'auditor')),
      organizationURN TEXT,
      publicKey TEXT,
      privateKeyEncrypted TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  // Migration: Add PKI columns to users if they don't exist
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('organizationURN')) {
    db.exec(`ALTER TABLE users ADD COLUMN organizationURN TEXT`);
    console.log('  ➕ Added organizationURN to users');
  }
  if (!userCols.includes('publicKey')) {
    db.exec(`ALTER TABLE users ADD COLUMN publicKey TEXT`);
    console.log('  ➕ Added publicKey to users');
  }
  if (!userCols.includes('privateKeyEncrypted')) {
    db.exec(`ALTER TABLE users ADD COLUMN privateKeyEncrypted TEXT`);
    console.log('  ➕ Added privateKeyEncrypted to users');
  }

  // Create default users if they don't exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const defaultUsers = [
      { username: 'manufacturer', password: 'manu123', role: 'manufacturer', orgURN: 'URN:NCB:ORG:PHARMA001' },
      { username: 'driver', password: 'driver123', role: 'driver', orgURN: 'URN:NCB:ORG:TRANS001' },
      { username: 'regulator', password: 'reg123', role: 'regulator', orgURN: 'URN:NCB:ORG:NCB001' }
    ];

    for (const user of defaultUsers) {
      const userId = randomUUID();
      const passwordHash = bcrypt.hashSync(user.password, 10);

      // Generate key pair for PKI
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      db.prepare(`
        INSERT INTO users (id, username, password_hash, role, organizationURN, publicKey, privateKeyEncrypted, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, user.username, passwordHash, user.role, user.orgURN, publicKey, privateKey, new Date().toISOString());
    }
    console.log('✅ Default users created with PKI key pairs');
  }

  // Migrate existing users without PKI keys
  const usersWithoutKeys = db.prepare('SELECT id, username FROM users WHERE publicKey IS NULL OR privateKeyEncrypted IS NULL').all();
  if (usersWithoutKeys.length > 0) {
    console.log(`🔐 Migrating ${usersWithoutKeys.length} users to have PKI keys...`);
    for (const user of usersWithoutKeys) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      db.prepare('UPDATE users SET publicKey = ?, privateKeyEncrypted = ? WHERE id = ?')
        .run(publicKey, privateKey, user.id);
      console.log(`  🔑 Generated keys for user: ${user.username}`);
    }
  }

  // ============================================================================
  // ML Alerts table
  // ============================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS ml_alerts (
      id TEXT PRIMARY KEY,
      alert_id TEXT UNIQUE NOT NULL,
      device TEXT NOT NULL,
      timestamp REAL NOT NULL,
      temp REAL,
      hum REAL,
      weight REAL,
      lat REAL,
      lon REAL,
      alerts TEXT NOT NULL,
      categories TEXT NOT NULL,
      risk TEXT NOT NULL,
      status TEXT DEFAULT 'UNCONFIRMED',
      createdAt TEXT NOT NULL
    )
  `);

  // ============================================================================
  // Audit Logs table - Immutable action logging
  // ============================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      userId TEXT,
      username TEXT,
      role TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      resourceId TEXT,
      details TEXT,
      ipAddress TEXT,
      result TEXT NOT NULL CHECK(result IN ('success', 'failure')),
      errorMessage TEXT
    )
  `);

  console.log('✅ Database tables ready (with migrations)');
}


// ============================================================================
// URN Generator Utility
// ============================================================================

function generateChemicalURN(manufacturerCode, chemicalType = 'PREC') {
  const year = new Date().getFullYear();
  const batchNum = Date.now().toString().slice(-6);
  return `URN:NCB:${chemicalType}:${year}:${manufacturerCode}:${batchNum}`;
}

function generateBatchId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BATCH-${timestamp}-${random}`;
}

// ============================================================================
// Cryptographic Signing Utilities (PKI)
// ============================================================================

function signData(data, privateKeyPem) {
  try {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(JSON.stringify(data));
    sign.end();
    return sign.sign(privateKeyPem, 'base64');
  } catch (error) {
    console.error('Error signing data:', error.message);
    return null;
  }
}

function verifySignature(data, signature, publicKeyPem) {
  try {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(JSON.stringify(data));
    verify.end();
    return verify.verify(publicKeyPem, signature, 'base64');
  } catch (error) {
    console.error('Error verifying signature:', error.message);
    return false;
  }
}

// ============================================================================
// Audit Logging Utility
// ============================================================================

function logAudit(userId, username, role, action, resource, resourceId, result, details = null, errorMessage = null, ipAddress = null) {
  try {
    const logId = randomUUID();
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, userId, username, role, action, resource, resourceId, details, ipAddress, result, errorMessage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      new Date().toISOString(),
      userId,
      username,
      role,
      action,
      resource,
      resourceId,
      details ? JSON.stringify(details) : null,
      ipAddress,
      result,
      errorMessage
    );
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
  }
}

// ============================================================================
// Role-Based Authorization Middleware
// ============================================================================

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      logAudit(null, null, null, req.method + ' ' + req.path, null, null, 'failure', null, 'No authentication');
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logAudit(req.user.id, req.user.username, req.user.role, req.method + ' ' + req.path, null, null, 'failure', null, 'Insufficient role');
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of these roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
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

  // Update shipment status — only if not already in a terminal/completed state
  const newStatus = isOffRoute ? 'OFF_ROUTE' : 'IN_TRANSIT';
  db.prepare(`
    UPDATE shipments 
    SET status = ?, currentWeight = currentWeight - 0.01
    WHERE id = ? AND status NOT IN ('DELIVERED', 'CONSUMED', 'SEIZED')
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

// CORS configuration - Allow all origins for APK and deployed frontend
// Security is maintained through JWT authentication
app.use(cors({
  origin: '*', // Allow all origins (APK needs this)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Authentication Middleware
// ============================================================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ============================================================================
// Endpoints - Authentication
// ============================================================================

// POST /api/auth/register - Create new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields: username, password, role' });
    }

    if (!['manufacturer', 'driver', 'regulator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be: manufacturer, driver, or regulator' });
    }

    // Check if username already exists
    const existingUser = db.prepare('SELECT username FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, username, passwordHash, role, createdAt);

    const token = jwt.sign({ id: userId, username, role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: userId, username, role }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login - Authenticate user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET /api/auth/me - Get current user info
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, role, createdAt FROM users WHERE id = ?').get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

// ============================================================================
// Endpoints - Manufacturer
// ============================================================================

// POST /shipments - Create new shipment (Manufacturer only)
app.post('/shipments', authenticateToken, requireRole('manufacturer'), (req, res) => {
  try {
    const { productId, origin, destination, initialWeight, regulatoryClass, unit } = req.body;

    if (!productId || !origin || !destination || initialWeight === undefined) {
      logAudit(req.user.id, req.user.username, req.user.role, 'CREATE_SHIPMENT', 'shipment', null, 'failure', req.body, 'Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields: productId, origin, destination, initialWeight'
      });
    }

    // Coerce and validate numeric weight
    const initialWeightNum = Number(initialWeight);
    if (!Number.isFinite(initialWeightNum) || initialWeightNum <= 0) {
      return res.status(400).json({ error: 'initialWeight must be a positive number' });
    }

    const shipmentId = randomUUID();
    const createdAt = new Date().toISOString();

    // Generate Chemical Identity (URN)
    const manufacturerCode = req.user.organizationURN?.split(':').pop() || 'MAN001';
    const chemicalURN = generateChemicalURN(manufacturerCode);
    const batchId = generateBatchId();
    const manufacturerURN = req.user.organizationURN || 'URN:NCB:ORG:UNKNOWN';
    const regClass = regulatoryClass || 'non-controlled';
    const unitValue = unit || 'kg';
    const sensorDeviceId = `SENSOR_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create shipment with enhanced Chemical Identity
    db.prepare(`
      INSERT INTO shipments (id, productId, chemicalURN, batchId, manufacturerURN, regulatoryClass, origin, destination, initialWeight, currentWeight, unit, sensorDeviceId, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(shipmentId, productId, chemicalURN, batchId, manufacturerURN, regClass, origin, destination, initialWeightNum, initialWeightNum, unitValue, sensorDeviceId, 'CREATED', createdAt);

    // Create MANUFACTURED event with actor binding and signature
    const eventId = randomUUID();
    const eventData = {
      type: 'MANUFACTURED',
      shipmentId,
      chemicalURN,
      batchId,
      manufacturerURN,
      weight: initialWeightNum,
      timestamp: createdAt
    };

    // Sign the event with manufacturer's private key
    const user = db.prepare('SELECT privateKeyEncrypted FROM users WHERE id = ?').get(req.user.id);
    const signature = user?.privateKeyEncrypted ? signData(eventData, user.privateKeyEncrypted) : null;

    db.prepare(`
      INSERT INTO events (id, shipmentId, type, weight, actorId, actorRole, signature, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, shipmentId, 'MANUFACTURED', initialWeightNum, req.user.id, req.user.role, signature, createdAt);

    // Log audit
    logAudit(req.user.id, req.user.username, req.user.role, 'CREATE_SHIPMENT', 'shipment', shipmentId, 'success', { chemicalURN, batchId, origin, destination });

    console.log(`📦 Shipment created: ${shipmentId} (${chemicalURN}) - status: CREATED`);

    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(shipmentId);

    res.status(201).json({
      message: 'Shipment created successfully',
      shipment,
      chemicalIdentity: {
        chemicalURN,
        batchId,
        manufacturerURN,
        regulatoryClass: regClass
      },
      signed: !!signature
    });
  } catch (error) {
    console.error('Error creating shipment:', error.message);
    console.error('Error stack:', error.stack);
    logAudit(req.user?.id, req.user?.username, req.user?.role, 'CREATE_SHIPMENT', 'shipment', null, 'failure', null, error.message);
    res.status(500).json({ error: 'Failed to create shipment', details: error.message });
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

// GET /shipments/:id - Get specific shipment with events (searches by ID or productId)
app.get('/shipments/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Try to find by UUID first, then by productId
    let shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(id);

    // If not found by UUID, try by productId (case-insensitive)
    if (!shipment) {
      shipment = db.prepare('SELECT * FROM shipments WHERE LOWER(productId) = LOWER(?)').get(id);
    }

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const events = db.prepare('SELECT * FROM events WHERE shipmentId = ? ORDER BY timestamp DESC').all(shipment.id);

    res.json({ shipment, events });
  } catch (error) {
    console.error('Error fetching shipment:', error);
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
});

// POST /shipments/:id/transition - Change shipment state
app.post('/shipments/:id/transition', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { newState, notes } = req.body;

    if (!newState) {
      return res.status(400).json({ error: 'Missing newState in request body' });
    }

    // Get current shipment
    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(id);
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Validate the transition
    const validation = validateTransition(shipment.status, newState, req.user.role);
    if (!validation.valid) {
      logAudit(req.user.id, req.user.username, req.user.role, 'STATE_TRANSITION', 'shipment', id, 'failure',
        { fromState: shipment.status, toState: newState }, validation.reason);
      return res.status(403).json({ error: validation.reason });
    }

    // Update shipment status
    const timestamp = new Date().toISOString();
    db.prepare('UPDATE shipments SET status = ?, updatedAt = ? WHERE id = ?')
      .run(newState, timestamp, id);

    // Create transition event with signature
    const eventId = randomUUID();
    const eventData = {
      type: 'STATE_TRANSITION',
      shipmentId: id,
      fromState: shipment.status,
      toState: newState,
      notes: notes || null,
      timestamp
    };

    // Sign the event
    const user = db.prepare('SELECT privateKeyEncrypted FROM users WHERE id = ?').get(req.user.id);
    const signature = user?.privateKeyEncrypted ? signData(eventData, user.privateKeyEncrypted) : null;

    db.prepare(`
      INSERT INTO events (id, shipmentId, type, weight, actorId, actorRole, signature, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, id, `STATE_TRANSITION:${newState}`, shipment.currentWeight, req.user.id, req.user.role, signature, timestamp);

    // Log audit
    logAudit(req.user.id, req.user.username, req.user.role, 'STATE_TRANSITION', 'shipment', id, 'success',
      { fromState: shipment.status, toState: newState, notes });

    console.log(`📦 State Transition: ${shipment.status} → ${newState} by ${req.user.username}`);

    // If dispatching, activate GPS simulation for this shipment
    if (newState === 'DISPATCHED') {
      const sim = db.prepare('SELECT activeShipmentId FROM simulation WHERE id = 1').get();
      if (!sim.activeShipmentId) {
        db.prepare('UPDATE simulation SET activeShipmentId = ?, indexPos = 0 WHERE id = 1')
          .run(id);
        console.log(`🚛 GPS simulation activated for shipment: ${id}`);
      }
    }

    res.json({
      message: 'State transition successful',
      shipment: {
        id,
        previousState: shipment.status,
        currentState: newState,
        transitionedBy: req.user.username,
        transitionedAt: timestamp
      },
      signed: !!signature
    });
  } catch (error) {
    console.error('Error transitioning shipment:', error);
    res.status(500).json({ error: 'Failed to transition shipment' });
  }
});

// POST /shipments/:id/checkpoint - Record a checkpoint scan event
app.post('/shipments/:id/checkpoint', authenticateToken, requireRole('driver'), (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, weight, notes } = req.body;

    // Try to find by UUID first, then by productId
    let shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(id);
    if (!shipment) {
      shipment = db.prepare('SELECT * FROM shipments WHERE LOWER(productId) = LOWER(?)').get(id);
    }
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Check if shipment is in a valid state for checkpoint
    const validStates = ['DISPATCHED', 'IN_TRANSIT', 'OFF_ROUTE'];
    if (!validStates.includes(shipment.status)) {
      return res.status(400).json({
        error: `Cannot scan checkpoint for shipment in ${shipment.status} state. Must be DISPATCHED, IN_TRANSIT, or OFF_ROUTE.`
      });
    }

    const timestamp = new Date().toISOString();

    // Auto-transition from DISPATCHED to IN_TRANSIT on first checkpoint
    let stateChanged = false;
    if (shipment.status === 'DISPATCHED') {
      db.prepare('UPDATE shipments SET status = ?, updatedAt = ? WHERE id = ?')
        .run('IN_TRANSIT', timestamp, id);
      stateChanged = true;
    }

    // Check weight deviation if weight provided
    const currentWeight = weight || shipment.currentWeight;
    const weightAlert = checkWeightDeviation(shipment.initialWeight, currentWeight);

    // Update current weight if provided
    if (weight) {
      db.prepare('UPDATE shipments SET currentWeight = ?, updatedAt = ? WHERE id = ?')
        .run(weight, timestamp, id);
    }

    // Create checkpoint event
    const eventId = randomUUID();
    const eventData = {
      type: 'CHECKPOINT_SCAN',
      shipmentId: id,
      latitude: latitude || 0,
      longitude: longitude || 0,
      weight: currentWeight,
      notes: notes || null,
      timestamp
    };

    // Sign the event
    const user = db.prepare('SELECT privateKeyEncrypted FROM users WHERE id = ?').get(req.user.id);
    const signature = user?.privateKeyEncrypted ? signData(eventData, user.privateKeyEncrypted) : null;

    db.prepare(`
      INSERT INTO events (id, shipmentId, type, latitude, longitude, weight, actorId, actorRole, signature, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, id, 'CHECKPOINT_SCAN', latitude || 0, longitude || 0, currentWeight, req.user.id, req.user.role, signature, timestamp);

    // Create weight deviation alert if detected
    if (weightAlert) {
      const alertMessage = `${weightAlert.level}: ${weightAlert.message} (${weightAlert.deviation}% loss)`;
      db.prepare(`
        INSERT INTO ml_alerts (id, device, temp, hum, weight, risk, timestamp, alerts)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), shipment.sensorDeviceId || 'CHECKPOINT', 0, 0, currentWeight, weightAlert.level, timestamp, JSON.stringify([{ type: 'weight_deviation', detail: alertMessage }]));
    }

    // Log audit
    logAudit(req.user.id, req.user.username, req.user.role, 'CHECKPOINT_SCAN', 'shipment', id, 'success',
      { latitude, longitude, weight: currentWeight, stateChanged, weightAlert: weightAlert?.level || null });

    console.log(`📍 Checkpoint Scan: ${shipment.productId} at [${latitude}, ${longitude}] by ${req.user.username}`);

    res.json({
      message: 'Checkpoint recorded successfully',
      checkpoint: {
        id: eventId,
        shipmentId: id,
        productId: shipment.productId,
        location: { latitude: latitude || 0, longitude: longitude || 0 },
        weight: currentWeight,
        timestamp,
        signed: !!signature
      },
      stateChanged: stateChanged ? { from: 'DISPATCHED', to: 'IN_TRANSIT' } : null,
      weightAlert: weightAlert || null
    });
  } catch (error) {
    console.error('Error recording checkpoint:', error);
    res.status(500).json({ error: 'Failed to record checkpoint' });
  }
});

// GET /shipments/:id/qr - Get QR code data for a shipment
app.get('/shipments/:id/qr', (req, res) => {
  try {
    const { id } = req.params;

    const shipment = db.prepare(`
      SELECT id, productId, chemicalURN, batchId, manufacturerURN, regulatoryClass, origin, destination
      FROM shipments WHERE id = ?
    `).get(id);

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Return QR data that can be encoded by frontend
    const qrData = {
      type: 'PRECURSOR_SHIPMENT',
      version: '1.0',
      shipmentId: shipment.id,
      productId: shipment.productId,
      urn: shipment.chemicalURN,
      batchId: shipment.batchId,
      manufacturer: shipment.manufacturerURN,
      class: shipment.regulatoryClass,
      route: `${shipment.origin} → ${shipment.destination}`
    };

    res.json({
      qrData,
      qrString: JSON.stringify(qrData)
    });
  } catch (error) {
    console.error('Error getting QR data:', error);
    res.status(500).json({ error: 'Failed to get QR data' });
  }
});

// GET /shipments/:id/sensors - Get live sensor data for a shipment
app.get('/shipments/:id/sensors', (req, res) => {
  try {
    const { id } = req.params;
    const shipment = db.prepare('SELECT sensorDeviceId FROM shipments WHERE id = ?').get(id);

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    if (!shipment.sensorDeviceId) {
      return res.status(404).json({ error: 'No sensor assigned to this shipment' });
    }

    res.json({
      shipmentId: id,
      sensorDeviceId: shipment.sensorDeviceId,
      message: 'Use this sensor device ID with ThingSpeak field4 to send sensor data'
    });
  } catch (error) {
    console.error('Error fetching sensor info:', error);
    res.status(500).json({ error: 'Failed to fetch sensor info' });
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

// POST /simulate/deviate - Simulate GPS route deviation (for demo)
app.post('/simulate/deviate', (req, res) => {
  try {
    // Move GPS to an off-route location (outside the authorized corridor)
    const offRouteLat = 18.4800; // Hadapsar area (far from the authorized Pune route)
    const offRouteLon = 73.9400;

    db.prepare('UPDATE simulation SET lat = ?, lon = ?, offRoute = 1 WHERE id = 1')
      .run(offRouteLat, offRouteLon);

    // Log the deviation event
    const sim = db.prepare('SELECT activeShipmentId FROM simulation WHERE id = 1').get();
    if (sim.activeShipmentId) {
      const eventId = randomUUID();
      const timestamp = new Date().toISOString();
      db.prepare(`
        INSERT INTO events (id, shipmentId, type, latitude, longitude, weight, actorId, actorRole, timestamp)
        VALUES (?, ?, 'GPS_DEVIATION', ?, ?, 0, 'system', 'system', ?)
      `).run(eventId, sim.activeShipmentId, offRouteLat, offRouteLon, timestamp);

      // Update shipment status to OFF_ROUTE
      db.prepare('UPDATE shipments SET status = ?, updatedAt = ? WHERE id = ? AND status = ?')
        .run('OFF_ROUTE', timestamp, sim.activeShipmentId, 'IN_TRANSIT');

      console.log(`🚨 GPS Deviation Simulated: [${offRouteLat}, ${offRouteLon}] - OFF ROUTE!`);
    }

    res.json({
      message: 'GPS deviation simulated - shipment is now OFF ROUTE',
      lat: offRouteLat,
      lon: offRouteLon,
      offRoute: true
    });
  } catch (error) {
    console.error('Error simulating deviation:', error);
    res.status(500).json({ error: 'Failed to simulate deviation' });
  }
});

// POST /simulate/return-route - Return GPS to authorized route
app.post('/simulate/return-route', (req, res) => {
  try {
    // Return to the first point on the authorized route
    const routePoint = AUTHORIZED_ROUTE[0];

    db.prepare('UPDATE simulation SET lat = ?, lon = ?, offRoute = 0, indexPos = 0 WHERE id = 1')
      .run(routePoint.lat, routePoint.lon);

    // Update shipment status back to IN_TRANSIT
    const sim = db.prepare('SELECT activeShipmentId FROM simulation WHERE id = 1').get();
    if (sim.activeShipmentId) {
      const timestamp = new Date().toISOString();
      db.prepare('UPDATE shipments SET status = ?, updatedAt = ? WHERE id = ? AND status = ?')
        .run('IN_TRANSIT', timestamp, sim.activeShipmentId, 'OFF_ROUTE');

      console.log(`✅ GPS returned to route: [${routePoint.lat}, ${routePoint.lon}]`);
    }

    res.json({
      message: 'GPS returned to authorized route',
      lat: routePoint.lat,
      lon: routePoint.lon,
      offRoute: false
    });
  } catch (error) {
    console.error('Error returning to route:', error);
    res.status(500).json({ error: 'Failed to return to route' });
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
// ML Alerts Endpoints (Persistence Layer)
// ============================================================================

// POST /api/ml-alerts - Store ML alert (called by ML backend)
app.post('/api/ml-alerts', (req, res) => {
  try {
    const { alert_id, device, timestamp, temp, hum, weight, lat, lon, alerts, categories, risk, status } = req.body;

    if (!alert_id || !device || !timestamp || !alerts || !categories || !risk) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if alert already exists (avoid duplicates)
    const existing = db.prepare('SELECT id FROM ml_alerts WHERE alert_id = ?').get(alert_id);
    if (existing) {
      return res.json({ message: 'Alert already exists', alert_id });
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO ml_alerts (id, alert_id, device, timestamp, temp, hum, weight, lat, lon, alerts, categories, risk, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      alert_id,
      device,
      timestamp,
      temp || null,
      hum || null,
      weight || null,
      lat || null,
      lon || null,
      JSON.stringify(alerts),
      JSON.stringify(categories),
      risk,
      status || 'UNCONFIRMED',
      new Date().toISOString()
    );

    res.status(201).json({ message: 'Alert stored successfully', id, alert_id });
  } catch (error) {
    console.error('Error storing ML alert:', error);
    res.status(500).json({ error: 'Failed to store ML alert' });
  }
});

// GET /api/ml-alerts - Get all ML alerts (for frontend)
app.get('/api/ml-alerts', (req, res) => {
  try {
    const alerts = db.prepare('SELECT * FROM ml_alerts ORDER BY timestamp DESC LIMIT 100').all();

    // Parse JSON fields
    const parsed = alerts.map(alert => ({
      ...alert,
      alerts: JSON.parse(alert.alerts),
      categories: JSON.parse(alert.categories)
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Error fetching ML alerts:', error);
    res.status(500).json({ error: 'Failed to fetch ML alerts' });
  }
});
// ============================================================================
// Audit Logs & Verification Endpoints
// ============================================================================

// GET /api/audit-logs - Get all audit logs (Regulator/Auditor only)
app.get('/api/audit-logs', authenticateToken, requireRole('regulator', 'auditor'), (req, res) => {
  try {
    const { limit = 100, action, userId } = req.query;

    let query = 'SELECT * FROM audit_logs';
    const params = [];
    const conditions = [];

    if (action) {
      conditions.push('action LIKE ?');
      params.push(`%${action}%`);
    }
    if (userId) {
      conditions.push('userId = ?');
      params.push(userId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(Number(limit));

    const logs = db.prepare(query).all(...params);
    res.json({ logs, count: logs.length });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/events/:id/verify - Verify event signature
app.get('/api/events/:id/verify', (req, res) => {
  try {
    const { id } = req.params;
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.signature) {
      return res.json({ verified: false, reason: 'Event has no signature' });
    }

    // Get actor's public key
    const actor = db.prepare('SELECT publicKey FROM users WHERE id = ?').get(event.actorId);

    if (!actor?.publicKey) {
      return res.json({ verified: false, reason: 'Actor public key not found' });
    }

    // Reconstruct the signed data
    const eventData = {
      type: event.type,
      shipmentId: event.shipmentId,
      weight: event.weight,
      timestamp: event.timestamp
    };

    const isValid = verifySignature(eventData, event.signature, actor.publicKey);

    res.json({
      verified: isValid,
      event: {
        id: event.id,
        type: event.type,
        actorId: event.actorId,
        actorRole: event.actorRole,
        timestamp: event.timestamp
      }
    });
  } catch (error) {
    console.error('Error verifying event:', error);
    res.status(500).json({ error: 'Failed to verify event' });
  }
});

// GET /api/blockchain/status - Get blockchain verification status
app.get('/api/blockchain/status', (req, res) => {
  try {
    // Count events and check integrity
    const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
    const signedCount = db.prepare('SELECT COUNT(*) as count FROM events WHERE signature IS NOT NULL').get().count;
    const shipmentCount = db.prepare('SELECT COUNT(*) as count FROM shipments').get().count;

    res.json({
      status: 'operational',
      eventCount,
      signedEvents: signedCount,
      unsignedEvents: eventCount - signedCount,
      signatureRate: eventCount > 0 ? ((signedCount / eventCount) * 100).toFixed(1) + '%' : '0%',
      shipmentCount,
      lastVerified: new Date().toISOString(),
      integrityStatus: signedCount === eventCount ? 'FULL' : 'PARTIAL'
    });
  } catch (error) {
    console.error('Error checking blockchain status:', error);
    res.status(500).json({ error: 'Failed to check blockchain status' });
  }
});

// GET /api/shipments/:id/chain - Get full event chain for a shipment
app.get('/api/shipments/:id/chain', (req, res) => {
  try {
    const { id } = req.params;

    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(id);
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const events = db.prepare(`
      SELECT e.*, u.username as actorName, u.publicKey
      FROM events e
      LEFT JOIN users u ON e.actorId = u.id
      WHERE e.shipmentId = ?
      ORDER BY e.timestamp ASC
    `).all(id);

    // Verify each event's signature
    const verifiedEvents = events.map(event => {
      let verified = false;
      if (event.signature && event.publicKey) {
        const eventData = {
          type: event.type,
          shipmentId: event.shipmentId,
          weight: event.weight,
          timestamp: event.timestamp
        };
        verified = verifySignature(eventData, event.signature, event.publicKey);
      }
      return {
        ...event,
        signatureVerified: verified,
        publicKey: undefined // Don't expose public key in response
      };
    });

    res.json({
      shipment: {
        id: shipment.id,
        chemicalURN: shipment.chemicalURN,
        batchId: shipment.batchId,
        manufacturerURN: shipment.manufacturerURN,
        status: shipment.status
      },
      eventChain: verifiedEvents,
      chainIntegrity: verifiedEvents.every(e => e.signature ? e.signatureVerified : true)
    });
  } catch (error) {
    console.error('Error fetching event chain:', error);
    res.status(500).json({ error: 'Failed to fetch event chain' });
  }
});

// ============================================================================
// PDF Compliance Reports (Regulator/Auditor only)
// ============================================================================

// GET /api/reports/shipment/:id - Generate PDF report for a specific shipment
app.get('/api/reports/shipment/:id', authenticateToken, requireRole('regulator', 'auditor'), async (req, res) => {
  try {
    const { id } = req.params;

    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(id);
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const events = db.prepare('SELECT * FROM events WHERE shipmentId = ? ORDER BY timestamp ASC').all(id);

    const pdfBuffer = await generateShipmentReport(shipment, events);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="shipment-${shipment.productId}-${Date.now()}.pdf"`);
    res.send(pdfBuffer);

    logAudit(req.user.id, req.user.username, req.user.role, 'GENERATE_REPORT', 'shipment', id, 'success',
      { reportType: 'shipment', productId: shipment.productId });
  } catch (error) {
    console.error('Error generating shipment report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/reports/daily/:date - Generate daily summary report (format: YYYY-MM-DD)
app.get('/api/reports/daily/:date', authenticateToken, requireRole('regulator', 'auditor'), async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const startDate = `${date}T00:00:00.000Z`;
    const endDate = `${date}T23:59:59.999Z`;

    const shipments = db.prepare(`
      SELECT * FROM shipments 
      WHERE createdAt >= ? AND createdAt <= ?
      ORDER BY createdAt DESC
    `).all(startDate, endDate);

    const events = db.prepare(`
      SELECT * FROM events 
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
    `).all(startDate, endDate);

    const pdfBuffer = await generateDailySummaryReport(date, shipments, events);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="daily-summary-${date}.pdf"`);
    res.send(pdfBuffer);

    logAudit(req.user.id, req.user.username, req.user.role, 'GENERATE_REPORT', 'daily_summary', date, 'success',
      { reportType: 'daily', shipmentCount: shipments.length, eventCount: events.length });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
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

const MAX_RETRIES = 5;

function startServer(retryCount = 0) {
  if (retryCount === 0) {
    initializeDatabase();

    // Start GPS simulation interval only once
    setInterval(simulateGPSStep, SIMULATION_INTERVAL);
    console.log(`🛰️  GPS simulation started (${SIMULATION_INTERVAL}ms interval)`);
  }

  const currentPort = PORT + retryCount;

  const server = app.listen(currentPort, '0.0.0.0', () => {
    console.log('');
    console.log('🚀 ========================================');
    console.log('   PRECURSOR Backend Running');
    console.log('========================================');
    console.log(`   Local:    http://localhost:${currentPort}`);
    console.log(`   Network:  http://0.0.0.0:${currentPort}`);
    console.log('========================================');
    console.log('');
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${currentPort} is busy, trying ${currentPort + 1}...`);
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => startServer(retryCount + 1), 1000);
      } else {
        console.error('❌ Could not find an open port after multiple attempts.');
        process.exit(1);
      }
    } else {
      console.error('❌ Server error:', e);
    }
  });
}

// ============================================================================
// ML Alerts Endpoints (called by ML backend + Regulator dashboard)
// ============================================================================

// POST /api/ml-alerts - Receive ML alert from Python ML backend (no auth - internal service)
app.post('/api/ml-alerts', (req, res) => {
  try {
    const { alert_id, device, timestamp, temp, hum, weight, lat, lon, alerts, categories, risk, status } = req.body;

    if (!alert_id || !device || !risk) {
      return res.status(400).json({ error: 'Missing required fields: alert_id, device, risk' });
    }

    // Normalise 'device' - accept string or object { id: '...' }
    const deviceStr = typeof device === 'object' ? (device.id || JSON.stringify(device)) : String(device);

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const ts = timestamp ? (isNaN(Number(timestamp)) ? Date.parse(timestamp) / 1000 : Number(timestamp)) : Date.now() / 1000;

    db.prepare(`
      INSERT OR IGNORE INTO ml_alerts
        (id, alert_id, device, timestamp, temp, hum, weight, lat, lon, alerts, categories, risk, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, alert_id, deviceStr, ts,
      temp ?? null, hum ?? null, weight ?? null, lat ?? null, lon ?? null,
      typeof alerts === 'string' ? alerts : JSON.stringify(alerts || []),
      typeof categories === 'string' ? categories : JSON.stringify(categories || []),
      risk, status || 'UNCONFIRMED', createdAt
    );

    console.log(`🚨 ML Alert received: ${alert_id} | risk=${risk} | device=${deviceStr}`);
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error saving ML alert:', error.message);
    res.status(500).json({ error: 'Failed to save ML alert' });
  }
});

// GET /api/ml-alerts - Return ML alerts for Regulator dashboard
app.get('/api/ml-alerts', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const rows = db.prepare(`
      SELECT * FROM ml_alerts
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit);

    // Parse JSON fields back to arrays for the frontend
    const alerts = rows.map(row => ({
      ...row,
      alerts: (() => { try { return JSON.parse(row.alerts); } catch { return []; } })(),
      categories: (() => { try { return JSON.parse(row.categories); } catch { return []; } })(),
    }));

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching ML alerts:', error.message);
    res.status(500).json({ error: 'Failed to fetch ML alerts' });
  }
});

// GET /api/sensors/live - Fetch latest ThingSpeak sensor readings (temp, humidity, weight)
app.get('/api/sensors/live', async (req, res) => {
  const channelId = process.env.THINGSPEAK_CHANNEL_ID;
  const apiKey = process.env.THINGSPEAK_READ_API_KEY;

  if (!channelId || !apiKey) {
    return res.json({ available: false, reason: 'ThingSpeak not configured' });
  }

  try {
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds/last.json?api_key=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`ThingSpeak returned ${response.status}`);
    const data = await response.json();

    res.json({
      available: true,
      temperature: data.field1 ? parseFloat(data.field1) : null,
      humidity: data.field2 ? parseFloat(data.field2) : null,
      weight: data.field3 ? parseFloat(data.field3) : null,
      updatedAt: data.created_at || null
    });
  } catch (err) {
    console.error('ThingSpeak fetch error:', err.message);
    res.json({ available: false, reason: err.message });
  }
});

// Start the server
startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  db.close();
  process.exit(0);
});