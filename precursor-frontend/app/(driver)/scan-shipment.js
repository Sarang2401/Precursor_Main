import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Alert } from "react-native";
import QRScanner from "../../components/QRScanner";

export default function ScanShipment() {
  const [showScanner, setShowScanner] = useState(false);

  const handleQRScan = (data) => {
    console.log("Scanned data:", data);
    Alert.alert("Scanned", `Shipment ID: ${data}`);
    setShowScanner(false);
  };

  return (
    <View style={styles.container}>
      {showScanner ? (
        <QRScanner
          onScan={handleQRScan}
          onCancel={() => setShowScanner(false)}
        />
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowScanner(true)}
        >
          <Text style={styles.buttonText}>Open Scanner</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
