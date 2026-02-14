// Test script to import server and see errors
import('./server.js').catch(err => {
    console.error('Error loading server:');
    console.error(err);
    process.exit(1);
});
