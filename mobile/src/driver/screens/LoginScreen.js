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

export default function LoginScreen({ onSwitchRole, onRegister }) {
  const { loginWithEmail } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    const id = identifier.trim();
    if (!id) return setError('Enter your mobile number, Route ID or email');
    if (!password) return setError('Enter your password');

    setLoading(true);
    try {
      await loginWithEmail(id, password);
    } catch (e) {
      if (e?.response) {
        setError(e.response.data?.error || 'Login failed. Please try again.');
      } else if (e?.code === 'ECONNABORTED') {
        setError('Server is waking up. Wait 30 seconds and try again.');
      } else {
        setError('Cannot reach server. Check your internet connection.');
      }
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
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>DRIVER PORTAL</Text>
          </View>
          <Text style={styles.title}>BusTrack Pro</Text>
          <Text style={styles.sub}>Sign in to share your bus location live with students.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Driver Sign In</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Mobile number, Route ID or Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Mobile number"
            placeholderTextColor="#64748b"
            value={identifier}
            onChangeText={(t) => { setIdentifier(t); setError(''); }}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            importantForAutofill="no"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.pwRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Password"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              onSubmitEditing={submit}
            />
            <TouchableOpacity style={styles.eye} onPress={() => setShowPw((s) => !s)}>
              <Text style={styles.eyeText}>{showPw ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={submit}
          >
            {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onRegister} style={styles.linkWrap}>
            <Text style={styles.linkText}>
              New driver? <Text style={styles.linkBold}>Request access</Text>
            </Text>
          </TouchableOpacity>

          <Text style={styles.help}>
            Password problems? Call the CU transport office to reset it.
          </Text>
        </View>

        {!!onSwitchRole && (
          <TouchableOpacity onPress={onSwitchRole} style={styles.switchRole}>
            <Text style={styles.switchRoleText}>
              Not a driver? <Text style={styles.switchRoleBold}>Switch to Student App</Text>
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  badge: { backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  badgeText: { color: '#0f172a', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '900', color: '#f8fafc', letterSpacing: -0.5 },
  sub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 320 },
  card: { backgroundColor: '#1e293b', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#334155', elevation: 6 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#f8fafc', marginBottom: 16 },
  errorBox: { backgroundColor: '#451a1a', borderWidth: 1, borderColor: '#ef4444', padding: 12, borderRadius: 10, marginBottom: 16 },
  errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '700', color: '#cbd5e1', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 13, color: '#f8fafc', fontSize: 15, marginBottom: 12 },
  pwRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  eye: { paddingHorizontal: 10, paddingVertical: 12 },
  eyeText: { color: '#f59e0b', fontWeight: '700', fontSize: 13 },
  btn: { backgroundColor: '#f59e0b', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#0f172a', fontWeight: '800', fontSize: 15 },
  linkWrap: { alignItems: 'center', marginTop: 18 },
  linkText: { color: '#94a3b8', fontSize: 13 },
  linkBold: { color: '#f59e0b', fontWeight: '800' },
  help: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 14 },
  switchRole: { alignItems: 'center', marginTop: 24 },
  switchRoleText: { color: '#94a3b8', fontSize: 13 },
  switchRoleBold: { color: '#f59e0b', fontWeight: '700' },
});
