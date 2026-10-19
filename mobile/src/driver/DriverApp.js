import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RouteScreen from './screens/RouteScreen';

function Root({ onSwitchRole }) {
  const { driver, checking } = useAuth();
  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }
  if (driver) return <RouteScreen />;
  return <LoginScreen onSwitchRole={onSwitchRole} />;
}

export default function DriverApp({ onSwitchRole }) {
  return (
    <AuthProvider>
      <Root onSwitchRole={onSwitchRole} />
    </AuthProvider>
  );
}
