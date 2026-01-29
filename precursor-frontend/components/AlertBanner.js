import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AlertBanner({ urn, type, location, time, alertDetails }) {
  const [expanded, setExpanded] = useState(false);

  // Generate explanation based on alert details
  const getExplanation = () => {
    if (!alertDetails) return null;

    const { temp, hum, weight, alerts, risk } = alertDetails;
    const explanations = [];

    if (alerts && alerts.length > 0) {
      alerts.forEach(alert => {
        if (alert.detail === 'temp_out_of_range') {
          explanations.push({
            icon: '🌡️',
            title: 'Temperature Alert',
            details: [
              `Detected: ${alert.value}°C`,
              `Threshold: >33°C`,
              'The temperature sensor reading exceeded the safe operating range.'
            ]
          });
        } else if (alert.detail === 'load_cell_zero') {
          explanations.push({
            icon: '⚖️',
            title: 'Sensor Failure Alert',
            details: [
              `Detected: Weight = ${alert.value} kg`,
              'This indicates a potential sensor malfunction or tampering.'
            ]
          });
        }
      });
    }

    // Add risk level explanation
    if (risk) {
      explanations.push({
        icon: risk === 'HIGH' ? '🔴' : '🟡',
        title: `Risk Level: ${risk}`,
        details: [`Current sensor readings: Temp=${temp}°C, Humidity=${hum}%, Weight=${weight}kg`]
      });
    }

    return explanations;
  };

  const explanations = getExplanation();

  return (
    <View style={styles.banner}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={styles.header}>
          <Text style={styles.urn}>{urn}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.time}>{time}</Text>
            {explanations && explanations.length > 0 && (
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={18}
                color="#B45309"
                style={styles.chevron}
              />
            )}
          </View>
        </View>
        <Text style={styles.type}>⚠️ {type}</Text>
        <Text style={styles.location}>📍 {location}</Text>
      </TouchableOpacity>

      {/* Expandable explanation section */}
      {expanded && explanations && explanations.length > 0 && (
        <View style={styles.explanationContainer}>
          {explanations.map((explanation, index) => (
            <View key={index} style={styles.explanationBlock}>
              <Text style={styles.explanationTitle}>
                {explanation.icon} {explanation.title}
              </Text>
              {explanation.details.map((detail, idx) => (
                <Text key={idx} style={styles.explanationDetail}>
                  • {detail}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'center'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  urn: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E'
  },
  time: {
    fontSize: 12,
    color: '#B45309'
  },
  chevron: {
    marginLeft: 4
  },
  type: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4
  },
  location: {
    fontSize: 13,
    color: '#B45309'
  },
  explanationContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FCD34D',
    backgroundColor: '#FFFBEB'
  },
  explanationBlock: {
    marginBottom: 10
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4
  },
  explanationDetail: {
    fontSize: 12,
    color: '#B45309',
    marginLeft: 8,
    marginBottom: 2
  }
});