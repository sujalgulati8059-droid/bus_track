import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import RoleSelect from "./src/RoleSelect";
import StudentApp from "./src/student/StudentApp";
import DriverApp from "./src/driver/DriverApp";

const ROLE_KEY = "appRole";

export default function App() {
  const [role, setRole] = useState(undefined); // undefined = loading, null = not chosen yet

  useEffect(() => {
    AsyncStorage.getItem(ROLE_KEY).then((r) => setRole(r === "student" || r === "driver" ? r : null)).catch(() => setRole(null));
  }, []);

  const pick = (r) => { AsyncStorage.setItem(ROLE_KEY, r); setRole(r); };
  const reset = () => { AsyncStorage.removeItem(ROLE_KEY); setRole(null); };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        {role === undefined ? (
          <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator size="large" /></View>
        ) : role === null ? (
          <RoleSelect onPick={pick} />
        ) : role === "student" ? (
          <StudentApp onSwitchRole={reset} />
        ) : (
          <DriverApp onSwitchRole={reset} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
