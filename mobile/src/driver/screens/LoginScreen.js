import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ onSwitchRole }) {
  const { loginWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return setError('Please enter your driver email, Route ID, or mobile number');
    }
    if (!password) {
      return setError('Please enter your password');
    }

    setLoading(true);
    try {
      await loginWithEmail(cleanEmail, password);
    } catch (e) {
      setError(
        e?.response?.data?.error ||
          (e?.response
            ? 'Invalid credentials. Check your email, Route ID, mobile number, and password.'
            : 'Cannot reach server. Check your internet connection.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#0f172a' }}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>DRIVER PORTAL</Text>
          </View>
          <Text style={styles.title}>BusTrack Pro</Text>
          <Text style={styles.sub}>
            Sign in with your registered email, Route ID, or mobile number to access live trip sharing.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Driver Sign In</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Email, Route ID, or Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Email, Route ID (e.g. R-01), or mobile number"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={(t) => { setEmail(t); setError(''); }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={(t) => { setPassword(t); setError(''); }}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={handleLogin}
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.btnText}>Sign In as Driver</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Transport Office Support */}
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>CU Transport Helpline</Text>
          <Text style={styles.supportText}>
            For route assignment or password issues, call transport office:
          </Text>
          <View style={styles.phoneRow}>
            <Text style={styles.phoneChip}>📞 73470-02958</Text>
            <Text style={styles.phoneChip}>📞 70870-39349</Text>
          </View>
        </View>

        {/* Switch Role */}
        {onSwitchRole && (
          <TouchableOpacity style={styles.switchBtn} onPress={onSwitchRole}>
            <Text style={styles.switchText}>← Switch to Student / Faculty App</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: '#facc15',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
  supportCard: {
    marginTop: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  supportTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#facc15',
    marginBottom: 4,
  },
  supportText: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
  },
  phoneChip: {
    backgroundColor: '#0f172a',
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  switchBtn: {
    marginTop: 20,
    alignSelf: 'center',
    padding: 10,
  },
  switchText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
});
