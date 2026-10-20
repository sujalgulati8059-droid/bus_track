import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import RouteScreen from './screens/RouteScreen';

function Root({ onSwitchRole }) {
  const { driver, checking } = useAuth();
  const [registering, setRegistering] = useState(false);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }
  if (driver) return <RouteScreen />;
  if (registering) return <RegisterScreen onBack={() => setRegistering(false)} />;
  return <LoginScreen onSwitchRole={onSwitchRole} onRegister={() => setRegistering(true)} />;
}

export default function DriverApp({ onSwitchRole }) {
  return (
    <AuthProvider>
      <Root onSwitchRole={onSwitchRole} />
    </AuthProvider>
  );
}
