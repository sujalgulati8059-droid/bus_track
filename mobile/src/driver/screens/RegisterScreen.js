import React, { useEffect, useMemo, useState } from 'react';
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
import { getRoutes, registerDriver } from '../api/driverApi';
import PickerModal from '../../student/components/PickerModal';

export default function RegisterScreen({ onBack }) {
  const [form, setForm] = useState({ name: '', phone: '', password: '', vehicleNo: '', routeNo: '' });
  const [routes, setRoutes] = useState([]);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    getRoutes()
      .then((r) => setRoutes(r.filter((x) => !x.routeNo.endsWith('-R'))))
      .catch(() => setError('Could not load routes. Check your internet connection.'));
  }, []);

  const routeItems = useMemo(
    () => routes.map((r) => ({ value: r.routeNo, label: `${r.routeNo} - ${r.routeName}` })),
    [routes]
  );
  const chosen = routes.find((r) => r.routeNo === form.routeNo);

  const submit = async () => {
    setError('');
    if (form.name.trim().length < 2) return setError('Enter your full name');
    if (!/^\d{10}$/.test(form.phone.trim())) return setError('Enter a valid 10-digit phone number');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (!form.routeNo) return setError('Select the route you drive');
    setLoading(true);
    try {
      await registerDriver({
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        routeNo: form.routeNo,
        vehicleNo: form.vehicleNo.trim(),
      });
      setDone(true);
    } catch (e) {
      setError(
        e?.response?.data?.error ||
          (e?.response ? 'Something went wrong' : 'Cannot reach server. Check your internet and try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={styles.title}>Request sent</Text>
        <Text style={styles.body}>
          The admin will review your request for route {form.routeNo}. Once approved, you can log in with your
          phone number and password.
        </Text>
        <Text style={styles.body}>If login says "waiting for approval", try again later.</Text>
        <TouchableOpacity style={styles.button} onPress={onBack}>
          <Text style={styles.buttonText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Driver request</Text>
        <Text style={styles.subtitle}>The admin must approve your request before you can log in.</Text>

        <TextInput
          key="r-name"
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor="#9ca3af"
          autoComplete="off"
          importantForAutofill="no"
          value={form.name}
          onChangeText={set('name')}
        />
        <TextInput
          key="r-phone"
          style={styles.input}
          placeholder="Phone number (10 digits)"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
          maxLength={10}
          autoComplete="off"
          importantForAutofill="no"
          value={form.phone}
          onChangeText={set('phone')}
        />
        <TextInput
          key="r-password"
          style={styles.input}
          placeholder="Create a password (6+ characters)"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          autoComplete="new-password"
          value={form.password}
          onChangeText={set('password')}
        />
        <TextInput
          key="r-vehicle"
          style={styles.input}
          placeholder="Bus number plate (optional)"
          placeholderTextColor="#9ca3af"
          autoCapitalize="characters"
          autoComplete="off"
          importantForAutofill="no"
          value={form.vehicleNo}
          onChangeText={set('vehicleNo')}
        />

        <TouchableOpacity style={styles.select} onPress={() => setPicker(true)}>
          <Text style={form.routeNo ? styles.selectText : styles.placeholder}>
            {form.routeNo ? `${form.routeNo} - ${chosen?.routeName || ''}` : 'Select the route you drive'}
          </Text>
        </TouchableOpacity>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send request</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>Already approved? Back to login</Text>
        </TouchableOpacity>
      </ScrollView>

      <PickerModal
        visible={picker}
        title="Select your route"
        items={routeItems}
        onClose={() => setPicker(false)}
        onSelect={(value) => {
          set('routeNo')(value);
          setPicker(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', color: '#f97316', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 22 },
  body: { fontSize: 15, color: '#374151', marginTop: 12, lineHeight: 22 },
  input: {
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  select: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, marginBottom: 12 },
  selectText: { fontSize: 16, color: '#0f172a' },
  placeholder: { fontSize: 16, color: '#9ca3af' },
  button: { backgroundColor: '#f97316', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#dc2626', marginBottom: 8 },
  back: { textAlign: 'center', color: '#6b7280', marginTop: 20 },
});
