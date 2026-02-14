import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api, API_BASE_URL } from '../../config/api';
import { useAuth } from '../../config/AuthContext';

export default function CreateShipmentScreen() {
  const { getToken } = useAuth();
  const [formData, setFormData] = useState({
    productId: '',
    origin: '',
    destination: '',
    initialWeight: '',
    regulatoryClass: 'non-controlled',
    unit: 'kg'
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
      Alert.alert('Validation Error', 'Please enter a valid weight');
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

    // Define shipmentData outside try block so it's accessible in catch
    const shipmentData = {
      productId: formData.productId.trim(),
      origin: formData.origin.trim(),
      destination: formData.destination.trim(),
      initialWeight: parseFloat(formData.initialWeight),
      regulatoryClass: formData.regulatoryClass,
      unit: formData.unit
    };

    try {
      const token = getToken();
      if (!token) {
        Alert.alert('Authentication Error', 'You must be logged in to create shipments.');
        setLoading(false);
        return;
      }

      const response = await api.createShipment(shipmentData, token);

      // Show enhanced success message with chemical identity
      const chemId = response.chemicalIdentity;
      Alert.alert(
        '✅ Shipment Created!',
        `Chemical URN: ${chemId?.chemicalURN || 'Generated'}\n` +
        `Batch ID: ${chemId?.batchId || 'Generated'}\n` +
        `Regulatory Class: ${chemId?.regulatoryClass || formData.regulatoryClass}\n` +
        `Digitally Signed: ${response.signed ? '✓ Yes' : '✗ No'}`,
        [
          {
            text: 'View Shipments',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Failed to create shipment:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        shipmentData: shipmentData
      });

      Alert.alert(
        'Error Creating Shipment',
        `Error: ${error.message}\n\nPlease check:\n1. Backend is running at ${API_BASE_URL}\n2. You are logged in as manufacturer\n3. All required fields are filled`,
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
      initialWeight: '25.5',
      regulatoryClass: 'precursor',
      unit: 'kg'
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

          {/* Initial Weight with Unit */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Initial Weight *</Text>
            <View style={styles.weightRow}>
              <TextInput
                style={[styles.input, styles.weightInput]}
                placeholder="e.g., 25.5"
                value={formData.initialWeight}
                onChangeText={(text) => updateField('initialWeight', text)}
                keyboardType="decimal-pad"
                editable={!loading}
              />
              <View style={styles.unitPicker}>
                {['kg', 'g', 'L', 'mL'].map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitOption,
                      formData.unit === unit && styles.unitOptionSelected
                    ]}
                    onPress={() => updateField('unit', unit)}
                    disabled={loading}
                  >
                    <Text style={[
                      styles.unitOptionText,
                      formData.unit === unit && styles.unitOptionTextSelected
                    ]}>{unit}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Regulatory Class */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Regulatory Classification *</Text>
            <Text style={styles.helperText}>Required for NCB compliance</Text>
            <View style={styles.regulatoryPicker}>
              {[
                { value: 'non-controlled', label: '📦 Non-Controlled', color: '#10B981' },
                { value: 'controlled', label: '⚠️ Controlled', color: '#F59E0B' },
                { value: 'precursor', label: '🔐 Precursor', color: '#EF4444' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.regOption,
                    formData.regulatoryClass === option.value && {
                      backgroundColor: option.color + '20',
                      borderColor: option.color
                    }
                  ]}
                  onPress={() => updateField('regulatoryClass', option.value)}
                  disabled={loading}
                >
                  <Text style={[
                    styles.regOptionText,
                    formData.regulatoryClass === option.value && { color: option.color, fontWeight: 'bold' }
                  ]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>ℹ️ A unique Chemical URN and Batch ID will be auto-generated. All events will be digitally signed.</Text>
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
  helperText: {
    fontSize: 12,
    color: '#6B7280',
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
  weightRow: {
    flexDirection: 'row',
    gap: 10
  },
  weightInput: {
    flex: 1
  },
  unitPicker: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB'
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB'
  },
  unitOptionSelected: {
    backgroundColor: '#2563EB'
  },
  unitOptionText: {
    fontSize: 14,
    color: '#374151'
  },
  unitOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold'
  },
  regulatoryPicker: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  regOption: {
    flex: 1,
    minWidth: 100,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  regOptionText: {
    fontSize: 13,
    color: '#374151'
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