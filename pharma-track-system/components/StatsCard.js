import { StyleSheet, Text, View } from 'react-native';

export default function StatsCard({ title, stat, active, total }) {
  return (
    <View style={styles.card}>
      {title ? (
        <>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.stat}>{stat}</Text>
        </>
      ) : (
        <>
          <Text style={styles.stat}>{active}</Text>
          <Text style={styles.label}>Active</Text>
          <Text style={styles.divider}>|</Text>
          <Text style={styles.stat}>{total}</Text>
          <Text style={styles.label}>Total</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    minWidth: 100
  },
  title: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center'
  },
  stat: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827'
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  divider: {
    fontSize: 20,
    color: '#D1D5DB',
    marginVertical: 8
  }
});