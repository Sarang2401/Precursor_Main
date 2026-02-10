import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import QRCode from 'react-qr-code';
import { API_BASE_URL } from '../config/api';

export default function ShipmentQRCode({ shipmentId, productId, onClose }) {
    const [qrData, setQrData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchQRData();
    }, [shipmentId]);

    const fetchQRData = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/shipments/${shipmentId}/qr`);
            if (!response.ok) {
                throw new Error('Failed to fetch QR data');
            }
            const data = await response.json();
            setQrData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Generating QR Code...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorIcon}>❌</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>📦 Shipment QR Code</Text>
                <Text style={styles.subtitle}>Scan at checkpoints</Text>
            </View>

            <View style={styles.qrContainer}>
                <QRCode
                    value={qrData?.qrString || ''}
                    size={200}
                    level="H"
                    fgColor="#111827"
                    bgColor="#ffffff"
                />
            </View>

            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Product ID</Text>
                    <Text style={styles.infoValue}>{qrData?.qrData?.productId || productId}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Chemical URN</Text>
                    <Text style={styles.infoValueSmall}>{qrData?.qrData?.urn || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Batch ID</Text>
                    <Text style={styles.infoValue}>{qrData?.qrData?.batchId || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Route</Text>
                    <Text style={styles.infoValue}>{qrData?.qrData?.route || 'N/A'}</Text>
                </View>
            </View>

            <Text style={styles.instruction}>
                💡 Print this QR code and attach to the shipment package.
                The driver will scan this at each checkpoint.
            </Text>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
        </View>
    );
}

// Modal wrapper for displaying QR code
export function QRCodeModal({ visible, shipmentId, productId, onClose }) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <ShipmentQRCode
                        shipmentId={shipmentId}
                        productId={productId}
                        onClose={onClose}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 16
    },
    header: {
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280'
    },
    qrContainer: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5
    },
    infoCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 16
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
    },
    infoLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500'
    },
    infoValue: {
        fontSize: 13,
        color: '#111827',
        fontWeight: '600',
        maxWidth: 150
    },
    infoValueSmall: {
        fontSize: 10,
        color: '#111827',
        fontWeight: '600',
        maxWidth: 150
    },
    instruction: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 16,
        paddingHorizontal: 10
    },
    closeButton: {
        backgroundColor: '#2563EB',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 10
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#6B7280'
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: 16
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        marginBottom: 16
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10
    }
});
