import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SocketProvider } from "./context/SocketContext";
import BusFinderScreen from "./screens/BusFinderScreen";
import FindRouteScreen from "./screens/FindRouteScreen";
import MapScreen from "./screens/MapScreen";
import { colors } from "./utils/theme";

const TABS = [["finder", "My Bus"], ["find", "Find Route"], ["map", "Live Map"]];

function Root({ onSwitchRole }) {
  const [tab, setTab] = useState("finder");
  const [focusRoute, setFocusRoute] = useState(null);

  const viewOnMap = (route) => { setFocusRoute(route); setTab("map"); };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === "finder" && <BusFinderScreen onViewOnMap={viewOnMap} />}
        {tab === "find" && <FindRouteScreen onViewOnMap={viewOnMap} />}
        {tab === "map" && <MapScreen focusRoute={focusRoute} onClearFocus={() => setFocusRoute(null)} />}
      </View>
      <View style={styles.tabs}>
        {TABS.map(([k, l]) => (
          <TouchableOpacity key={k} style={styles.tab} onPress={() => setTab(k)}>
            <Text style={[styles.tabText, tab === k && styles.tabOn]}>{l}</Text>
            {tab === k && <View style={styles.underline} />}
          </TouchableOpacity>
        ))}
      </View>
      {!!onSwitchRole && (
        <TouchableOpacity style={styles.driverSwitch} onPress={onSwitchRole}>
          <Text style={styles.driverSwitchText}>🚌 Driver? Switch here</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function StudentApp({ onSwitchRole }) {
  return (
    <SocketProvider>
      <Root onSwitchRole={onSwitchRole} />
    </SocketProvider>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: "#fff" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 14 },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  tabOn: { color: colors.ink, fontWeight: "800" },
  underline: { position: "absolute", top: 0, height: 3, width: 40, backgroundColor: colors.brand, borderRadius: 2 },
  driverSwitch: { backgroundColor: "#fff7ed", borderTopWidth: 1, borderTopColor: "#fed7aa", paddingVertical: 10, alignItems: "center" },
  driverSwitchText: { fontSize: 13, color: "#f97316", fontWeight: "700" },
});
