import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../../config/api';

export default function CreateShipmentScreen() {
  const [formData, setFormData] = useState({
    productId: '',
    origin: '',
    destination: '',
    initialWeight: ''
  });
  const [loading, setLoading] = useState(false);

  // Update form field
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validate form
  const validateForm = () => {
    if (!formData.productId.trim()) {
      Alert.alert('Validation Error', 'Please enter a Product ID');
      return false;
    }
    if (!formData.origin.trim()) {
      Alert.alert('Validation Error', 'Please enter origin location');
      return false;
    }
    if (!formData.destination.trim()) {
      Alert.alert('Validation Error', 'Please enter destination location');
      return false;
    }
    if (!formData.initialWeight || isNaN(parseFloat(formData.initialWeight))) {
      Alert.alert('Validation Error', 'Please enter a valid weight (in kg)');
      return false;
    }
    if (parseFloat(formData.initialWeight) <= 0) {
      Alert.alert('Validation Error', 'Weight must be greater than 0');
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const shipmentData = {
        productId: formData.productId.trim(),
        origin: formData.origin.trim(),
        destination: formData.destination.trim(),
        initialWeight: parseFloat(formData.initialWeight)
      };

      const response = await api.createShipment(shipmentData);

      Alert.alert(
        'Success!',
        `Shipment ${response.shipment.productId} created successfully!`,
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Failed to create shipment:', error);
      Alert.alert(
        'Error',
        'Failed to create shipment. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Quick fill example data
  const fillExample = () => {
    const timestamp = Date.now().toString().slice(-4);
    setFormData({
      productId: `PHARMA-${timestamp}`,
      origin: 'Mumbai Warehouse',
      destination: 'Pune Hospital',
      initialWeight: '25.5'
    });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create New Shipment</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Product ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product ID *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., PHARMA-12345"
              value={formData.productId}
              onChangeText={(text) => updateField('productId', text)}
              autoCapitalize="characters"
              editable={!loading}
            />
          </View>

          {/* Origin */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Origin Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Mumbai Warehouse"
              value={formData.origin}
              onChangeText={(text) => updateField('origin', text)}
              editable={!loading}
            />
          </View>

          {/* Destination */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destination Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Pune Hospital"
              value={formData.destination}
              onChangeText={(text) => updateField('destination', text)}
              editable={!loading}
            />
          </View>

          {/* Initial Weight */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Initial Weight (kg) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 25.5"
              value={formData.initialWeight}
              onChangeText={(text) => updateField('initialWeight', text)}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>ℹ️ The shipment will be automatically tracked with GPS simulation once created.</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.exampleButton}
              onPress={fillExample}
              disabled={loading}
            >
              <Text style={styles.exampleButtonText}>Fill Example</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Shipment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20
  },
  header: {
    marginBottom: 20
  },
  backButton: {
    fontSize: 16,
    color: '#2563EB',
    marginBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827'
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB'
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB'
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20
  },
  buttonContainer: {
    gap: 12
  },
  exampleButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB'
  },
  exampleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151'
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center'
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD'
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  }
});