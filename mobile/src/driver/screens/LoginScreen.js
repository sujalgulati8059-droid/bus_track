import React, { useState, useEffect } from 'react';
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
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getRoutes } from '../api/driverApi';

export default function LoginScreen({ onSwitchRole }) {
  const { loginWithEmail, signInWithGoogle, completeGoogleRegistration } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Dialog State for "New Driver" continuing with Google
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);
  const [googleSetupData, setGoogleSetupData] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [allRoutes, setAllRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [showRoutePicker, setShowRoutePicker] = useState(false);

  useEffect(() => {
    getRoutes()
      .then((r) => setAllRoutes(Array.isArray(r) ? r : []))
      .catch(() => {});
  }, []);

  const handleEmailLogin = async () => {
    setError('');
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return setError('Please enter your Route ID (e.g. R-01), email, or mobile number');
    }
    if (!password) {
      return setError('Please enter your password (default for seeded accounts is Pass@123)');
    }

    setLoading(true);
    try {
      await loginWithEmail(cleanEmail, password);
    } catch (e) {
      setError(
        e?.response?.data?.error ||
          (e?.response
            ? 'Invalid credentials. Check your Route ID, email, or password.'
            : 'Cannot reach server. Check your internet connection.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res?.isNewDriver) {
        setGoogleSetupData(res);
        setShowGoogleSetup(true);
      }
    } catch (e) {
      if (e?.code !== '12501' && e?.code !== 'SIGN_IN_CANCELLED') {
        setError(e?.response?.data?.error || e?.message || 'Google Sign-In failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFinishGoogleSetup = async (withPassword = true) => {
    if (!selectedRoute) {
      return Alert.alert('Select Route', 'Please pick the route you drive.');
    }
    setLoading(true);
    try {
      await completeGoogleRegistration({
        googleToken: googleSetupData.googleToken,
        routeNo: selectedRoute,
        phone: driverPhone.trim() || undefined,
        password: withPassword && setupPassword.length >= 6 ? setupPassword : undefined,
      });
      setShowGoogleSetup(false);
    } catch (e) {
      Alert.alert('Registration Failed', e?.response?.data?.error || e?.message || 'Could not complete setup');
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
            Sign in with Google or your assigned Route ID & password to start GPS tracking.
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

          {/* Continue with Google Button */}
          <TouchableOpacity
            style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
            disabled={googleLoading || loading}
            onPress={handleGoogleSignIn}
          >
            {googleLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.googleContent}>
                <View style={styles.gLogo}>
                  <Text style={styles.gLogoText}>G</Text>
                </View>
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN IN WITH PASSWORD</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Credentials Inputs */}
          <Text style={styles.label}>Route ID, Email, or Mobile</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. R-01, driver.r01@cu.ac.in, or 8295349280"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password (default: Pass@123)"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError('');
            }}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            disabled={loading || googleLoading}
            onPress={handleEmailLogin}
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.btnText}>Sign In to Dashboard</Text>
            )}
          </TouchableOpacity>

          {/* Sample Credentials Card for Testing */}
          <View style={styles.sampleBox}>
            <Text style={styles.sampleTitle}>💡 Sample Driver Credentials:</Text>
            <Text style={styles.sampleItem}>
              • Route: <Text style={styles.sampleBold}>R-01</Text> | Pass: <Text style={styles.sampleBold}>Pass@123</Text>
            </Text>
            <Text style={styles.sampleItem}>
              • Route: <Text style={styles.sampleBold}>R-02</Text> | Pass: <Text style={styles.sampleBold}>Pass@123</Text>
            </Text>
            <Text style={styles.sampleSub}>
              All 66 university buses are pre-seeded with default password <Text style={{ fontWeight: '700' }}>Pass@123</Text>.
            </Text>
          </View>
        </View>

        {/* Switch to Student */}
        {!!onSwitchRole && (
          <TouchableOpacity onPress={onSwitchRole} style={styles.switchRole}>
            <Text style={styles.switchRoleText}>
              Not a driver? <Text style={styles.switchRoleBold}>Switch to Student App</Text>
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* DIALOG BOX: NEW DRIVER GOOGLE SETUP & PASSWORD OPTION   */}
      {/* ========================================================= */}
      <Modal visible={showGoogleSetup} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Complete Driver Setup</Text>
            <Text style={styles.modalSub}>
              Welcome, <Text style={{ fontWeight: '700', color: '#0f172a' }}>{googleSetupData?.name || 'Driver'}</Text>!
              {'\n'}Please select your assigned bus route to finish setting up your account.
            </Text>

            <Text style={styles.modalLabel}>Google Email</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: '#f1f5f9', color: '#64748b' }]}
              value={googleSetupData?.email}
              editable={false}
            />

            <Text style={styles.modalLabel}>Assigned Bus Route *</Text>
            <TouchableOpacity
              style={styles.selectRouteBtn}
              onPress={() => setShowRoutePicker(true)}
            >
              <Text style={selectedRoute ? styles.selectedRouteText : styles.placeholderText}>
                {selectedRoute ? `Route ${selectedRoute}` : 'Tap to select your route'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.modalLabel}>Mobile Number (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="10-digit mobile number"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={driverPhone}
              onChangeText={setDriverPhone}
            />

            <Text style={styles.modalLabel}>Set Password (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Create password or set later"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={setupPassword}
              onChangeText={setSetupPassword}
            />
            <Text style={styles.setupHint}>
              You can set a password now so you can log in with Route ID anytime, or tap "Set Password Later".
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.primaryModalBtn}
                onPress={() => handleFinishGoogleSetup(true)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.primaryModalBtnText}>Complete & Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryModalBtn}
                onPress={() => handleFinishGoogleSetup(false)}
                disabled={loading}
              >
                <Text style={styles.secondaryModalBtnText}>Set Password Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowGoogleSetup(false)}
                disabled={loading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ROUTE PICKER MODAL */}
      <Modal visible={showRoutePicker} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '75%' }]}>
            <Text style={styles.modalTitle}>Select Route</Text>
            <ScrollView style={{ marginTop: 12 }}>
              {allRoutes.map((r) => (
                <TouchableOpacity
                  key={r.routeNo}
                  style={[
                    styles.routeItem,
                    selectedRoute === r.routeNo && styles.routeItemActive,
                  ]}
                  onPress={() => {
                    setSelectedRoute(r.routeNo);
                    setShowRoutePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.routeItemText,
                      selectedRoute === r.routeNo && styles.routeItemTextActive,
                    ]}
                  >
                    Route {r.routeNo} - {r.routeName || ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 12 }]}
              onPress={() => setShowRoutePicker(false)}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 320,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#451a1a',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  googleBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gLogoText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '900',
  },
  googleBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 13,
    color: '#f8fafc',
    fontSize: 14,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 15,
  },
  sampleBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sampleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f59e0b',
    marginBottom: 6,
  },
  sampleItem: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  sampleBold: {
    fontWeight: '800',
    color: '#38bdf8',
  },
  sampleSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 15,
  },
  switchRole: {
    alignItems: 'center',
    marginTop: 24,
  },
  switchRoleText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  switchRoleBold: {
    color: '#f59e0b',
    fontWeight: '700',
  },

  /* Modal Dialog Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 11,
    fontSize: 14,
    color: '#0f172a',
  },
  selectRouteBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 13,
    backgroundColor: '#f8fafc',
  },
  selectedRouteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  placeholderText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  setupHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 15,
  },
  modalActions: {
    marginTop: 10,
    gap: 8,
  },
  primaryModalBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryModalBtnText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryModalBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryModalBtnText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 13,
  },
  routeItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  routeItemActive: {
    backgroundColor: '#fef3c7',
  },
  routeItemText: {
    fontSize: 14,
    color: '#0f172a',
  },
  routeItemTextActive: {
    fontWeight: '800',
    color: '#b45309',
  },
});
