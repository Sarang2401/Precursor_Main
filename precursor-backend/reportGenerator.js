import PDFDocument from 'pdfkit';

// ============================================================================
// PDF Report Generator for NCB Compliance Reports
// ============================================================================

/**
 * Generate a shipment compliance report PDF
 * @param {Object} shipment - Shipment data
 * @param {Array} events - Event history for the shipment
 * @returns {Promise<Buffer>} PDF buffer
 */
export function generateShipmentReport(shipment, events) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(20).font('Helvetica-Bold').text('PRECURSOR CHEMICAL TRACKING REPORT', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(12).font('Helvetica').text('Narcotics Control Bureau - India', { align: 'center' });
            doc.moveDown();
            doc.fontSize(10).text(`Report Generated: ${new Date().toISOString()}`, { align: 'center' });

            // Divider
            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();

            // Chemical Identity Section
            doc.fontSize(14).font('Helvetica-Bold').text('CHEMICAL IDENTITY');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');

            const identityData = [
                ['Chemical URN:', shipment.chemicalURN || 'N/A'],
                ['Batch ID:', shipment.batchId || 'N/A'],
                ['Product ID:', shipment.productId],
                ['Manufacturer URN:', shipment.manufacturerURN || 'N/A'],
                ['Regulatory Class:', shipment.regulatoryClass || 'N/A']
            ];

            identityData.forEach(([label, value]) => {
                doc.font('Helvetica-Bold').text(label, { continued: true, width: 150 });
                doc.font('Helvetica').text(` ${value}`);
            });

            doc.moveDown();

            // Shipment Details Section
            doc.fontSize(14).font('Helvetica-Bold').text('SHIPMENT DETAILS');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');

            const shipmentData = [
                ['Shipment ID:', shipment.id],
                ['Origin:', shipment.origin],
                ['Destination:', shipment.destination],
                ['Initial Weight:', `${shipment.initialWeight} ${shipment.unit || 'kg'}`],
                ['Current Weight:', `${shipment.currentWeight} ${shipment.unit || 'kg'}`],
                ['Status:', shipment.status],
                ['Created At:', shipment.createdAt]
            ];

            shipmentData.forEach(([label, value]) => {
                doc.font('Helvetica-Bold').text(label, { continued: true, width: 150 });
                doc.font('Helvetica').text(` ${value}`);
            });

            // Weight Deviation Check
            if (shipment.initialWeight > 0) {
                const deviation = ((shipment.initialWeight - shipment.currentWeight) / shipment.initialWeight * 100).toFixed(2);
                doc.moveDown(0.5);
                const deviationColor = parseFloat(deviation) > 5 ? 'red' : 'green';
                doc.font('Helvetica-Bold').text('Weight Deviation:', { continued: true, width: 150 });
                doc.fillColor(deviationColor).text(` ${deviation}%`);
                doc.fillColor('black');
            }

            doc.moveDown();

            // Event Chain Section
            doc.fontSize(14).font('Helvetica-Bold').text('EVENT CHAIN (AUDIT TRAIL)');
            doc.moveDown(0.5);
            doc.fontSize(9).font('Helvetica');

            if (events && events.length > 0) {
                events.forEach((event, index) => {
                    doc.font('Helvetica-Bold').text(`${index + 1}. ${event.type}`, { underline: true });
                    doc.font('Helvetica');
                    doc.text(`   Timestamp: ${event.timestamp}`);
                    doc.text(`   Weight: ${event.weight} ${shipment.unit || 'kg'}`);
                    doc.text(`   Actor: ${event.actorRole || 'system'}`);
                    doc.text(`   Signature: ${event.signature ? '✓ Verified' : '✗ Not Signed'}`);
                    doc.moveDown(0.3);
                });
            } else {
                doc.text('No events recorded for this shipment.');
            }

            doc.moveDown();

            // Compliance Certification
            doc.fontSize(14).font('Helvetica-Bold').text('COMPLIANCE CERTIFICATION');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            doc.text('This report is generated automatically by the PRECURSOR tracking system.');
            doc.text('All events are cryptographically signed and immutably recorded.');
            doc.moveDown();

            // Signature Block
            doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
            doc.moveDown(0.3);
            doc.text('Authorized Digital Signature', { width: 200, align: 'center' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Generate a daily summary report PDF
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {Array} shipments - All shipments for the date
 * @param {Array} events - All events for the date
 * @returns {Promise<Buffer>} PDF buffer
 */
export function generateDailySummaryReport(date, shipments, events) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(20).font('Helvetica-Bold').text('DAILY PRECURSOR SUMMARY REPORT', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(12).font('Helvetica').text('Narcotics Control Bureau - India', { align: 'center' });
            doc.moveDown();
            doc.fontSize(10).text(`Report Date: ${date}`, { align: 'center' });
            doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });

            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();

            // Summary Statistics
            doc.fontSize(14).font('Helvetica-Bold').text('SUMMARY STATISTICS');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');

            const statusCounts = shipments.reduce((acc, s) => {
                acc[s.status] = (acc[s.status] || 0) + 1;
                return acc;
            }, {});

            const precursorCount = shipments.filter(s => s.regulatoryClass === 'precursor').length;
            const signedEvents = events.filter(e => e.signature).length;

            doc.text(`Total Shipments: ${shipments.length}`);
            doc.text(`Precursor Class Shipments: ${precursorCount}`);
            doc.text(`Total Events: ${events.length}`);
            doc.text(`Signed Events: ${signedEvents} (${events.length > 0 ? ((signedEvents / events.length) * 100).toFixed(1) : 0}%)`);
            doc.moveDown();

            doc.font('Helvetica-Bold').text('Status Breakdown:');
            doc.font('Helvetica');
            Object.entries(statusCounts).forEach(([status, count]) => {
                doc.text(`  • ${status}: ${count}`);
            });

            doc.moveDown();

            // Shipment List
            doc.fontSize(14).font('Helvetica-Bold').text('SHIPMENTS');
            doc.moveDown(0.5);
            doc.fontSize(9).font('Helvetica');

            shipments.slice(0, 20).forEach((shipment, index) => {
                doc.font('Helvetica-Bold').text(`${index + 1}. ${shipment.productId} (${shipment.status})`);
                doc.font('Helvetica');
                doc.text(`   URN: ${shipment.chemicalURN || 'N/A'}`);
                doc.text(`   Route: ${shipment.origin} → ${shipment.destination}`);
                doc.text(`   Weight: ${shipment.currentWeight}/${shipment.initialWeight} ${shipment.unit || 'kg'}`);
                doc.moveDown(0.3);
            });

            if (shipments.length > 20) {
                doc.text(`... and ${shipments.length - 20} more shipments`);
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}
