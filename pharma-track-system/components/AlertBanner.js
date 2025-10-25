import { StyleSheet, Text, View } from 'react-native';

export default function AlertBanner({ urn, type, location, time }) {
  return (
    <View style={styles.banner}>
      <View style={styles.header}>
        <Text style={styles.urn}>{urn}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <Text style={styles.type}>⚠️ {type}</Text>
      <Text style={styles.location}>📍 {location}</Text>
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
    marginBottom: 6
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
  type: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4
  },
  location: {
    fontSize: 13,
    color: '#B45309'
  }
});