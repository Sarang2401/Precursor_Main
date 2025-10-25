import Database from 'better-sqlite3';
const db = new Database('precursor.db', { readonly: true });
console.log('Shipments:');
console.log(db.prepare('SELECT id, productId, origin, destination, initialWeight, currentWeight, status, createdAt FROM shipments').all());
console.log('Events:');
console.log(db.prepare('SELECT id, shipmentId, type, latitude, longitude, temperature, humidity, weight, offRoute, timestamp FROM events ORDER BY timestamp DESC').all());
console.log('Simulation:');
console.log(db.prepare('SELECT * FROM simulation WHERE id = 1').get());
db.close();
