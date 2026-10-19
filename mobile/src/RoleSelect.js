import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function RoleSelect({ onPick }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.logo}>BusTrack Pro</Text>
      <Text style={styles.sub}>Chandigarh University bus tracking</Text>
      <Text style={styles.q}>I am a...</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: "#facc15" }]} onPress={() => onPick("student")}>
        <Text style={styles.btnTitle}>Student / Faculty</Text>
        <Text style={styles.btnSub}>Find my bus, track it live</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { backgroundColor: "#f97316" }]} onPress={() => onPick("driver")}>
        <Text style={[styles.btnTitle, { color: "#fff" }]}>Bus Driver</Text>
        <Text style={[styles.btnSub, { color: "#ffedd5" }]}>Update route, share live location</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: "#fff" },
  logo: { fontSize: 32, fontWeight: "800", color: "#0f172a" },
  sub: { fontSize: 14, color: "#64748b", marginTop: 4, marginBottom: 40 },
  q: { fontSize: 13, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  btn: { borderRadius: 16, padding: 22, marginBottom: 14 },
  btnTitle: { fontSize: 20, fontWeight: "800", color: "#000" },
  btnSub: { fontSize: 13, color: "#422006", marginTop: 4 },
});
