/**
 * start-lan.js
 * Auto-detects the PC's LAN IP and starts Expo with REACT_NATIVE_PACKAGER_HOSTNAME set.
 * This makes the QR code always broadcast the correct LAN IP, so your phone can connect
 * without needing to manually set the env variable.
 */

const { spawn } = require('child_process');
const os = require('os');

// Find the best LAN IP: prefer 192.168.x.x, then 10.x.x.x, skip loopback/hotspot junk
function getLANIP() {
    const interfaces = os.networkInterfaces();
    const allAddresses = Object.values(interfaces).flat();

    // Priority: 192.168.x.x (home WiFi) first
    const homeWifi = allAddresses.find(
        i => i.family === 'IPv4' && !i.internal && i.address.startsWith('192.168.')
    );
    if (homeWifi) return homeWifi.address;

    // Fallback: any non-internal, non-APIPA IPv4
    const anyLan = allAddresses.find(
        i => i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.')
    );
    return anyLan ? anyLan.address : 'localhost';
}

const lanIP = getLANIP();
console.log(`\n📡 Auto-detected LAN IP: ${lanIP}`);
console.log(`   Phone should connect to: exp://${lanIP}:8081\n`);

// Start expo with the IP set
const expo = spawn('npx', ['expo', 'start', '--clear'], {
    stdio: 'inherit',
    shell: true,
    env: {
        ...process.env,
        REACT_NATIVE_PACKAGER_HOSTNAME: lanIP,
    },
});

expo.on('exit', code => process.exit(code));
