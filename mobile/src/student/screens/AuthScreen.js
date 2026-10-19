import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
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
import { getRoutes } from '../api/studentApi';
import PickerModal from '../components/PickerModal';
import { colors } from '../utils/theme';

export default function AuthScreen({ onSwitchRole }) {
  const { signInWithGoogle, completeGoogleRegistration } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [routes, setRoutes] = useState([]);

  // New Student Route & Stops Dialog
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [googleData, setGoogleData] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedStops, setSelectedStops] = useState([]);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);

  useEffect(() => {
    getRoutes()
      .then((r) => setRoutes(r.filter((x) => !x.routeNo.endsWith('-R'))))
      .catch(() => {});
  }, []);

  const routeObj = useMemo(
    () => routes.find((r) => r.routeNo === selectedRoute),
    [routes, selectedRoute]
  );

  const routeItems = useMemo(
    () =>
      routes.map((r) => ({
        value: r.routeNo,
        label: `${r.routeNo} - ${r.routeName}`,
      })),
    [routes]
  );

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res?.isNewStudent) {
        setGoogleData(res);
        setShowSetupModal(true);
      }
    } catch (e) {
      if (e?.code !== '12501' && e?.code !== 'SIGN_IN_CANCELLED') {
        setError(e?.response?.data?.error || e?.message || 'Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleStop = (stopName) => {
    setSelectedStops((prev) =>
      prev.includes(stopName)
        ? prev.filter((s) => s !== stopName)
        : [...prev, stopName]
    );
  };

  const handleFinishSetup = async () => {
    if (!selectedRoute) {
      return Alert.alert('Select Route', 'Please select your bus route.');
    }
    if (selectedStops.length === 0) {
      return Alert.alert('Select Stop', 'Please pick at least 1 boarding stop.');
    }

    setLoading(true);
    try {
      await completeGoogleRegistration({
        googleToken: googleData.googleToken,
        assignedRoute: selectedRoute,
        assignedStop: selectedStops[0],
        assignedStops: selectedStops,
      });
      setShowSetupModal(false);
    } catch (e) {
      Alert.alert(
        'Registration Failed',
        e?.response?.data?.error || e?.message || 'Could not complete registration'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* App Logo & Header */}
        <View style={styles.header}>
          <View style={styles.busIconBadge}>
            <Text style={styles.busEmoji}>🚌</Text>
          </View>
          <Text style={styles.title}>BusTrack CU</Text>
          <Text style={styles.subtitle}>
            Real-time live campus bus tracking. Sign in with your university or personal Google Gmail account.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Student & Faculty Sign In</Text>
          <Text style={styles.cardSub}>
            No UID or SMS OTP verification needed. Continue directly with Google.
          </Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.googleBtn, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={handleGoogleSignIn}
          >
            {loading ? (
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

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>✨ Instant 1-Tap Access:</Text>
            <Text style={styles.infoText}>
              • First time? You will pick your bus route and stops on the next step.{'\n'}
              • Returning student? You will jump straight to your live bus map.
            </Text>
          </View>
        </View>

        {/* Switch to Driver Portal */}
        {!!onSwitchRole && (
          <TouchableOpacity onPress={onSwitchRole} style={styles.driverSwitchBtn}>
            <Text style={styles.driverSwitchText}>
              University Bus Driver? <Text style={styles.driverSwitchBold}>Driver Portal</Text>
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL: NEW STUDENT ROUTE & STOP SELECTION                */}
      {/* ========================================================= */}
      <Modal visible={showSetupModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Welcome to BusTrack!</Text>
            <Text style={styles.modalSub}>
              Hi <Text style={{ fontWeight: '700', color: colors.ink }}>{googleData?.name || 'Student'}</Text>,
              select your bus route and boarding stop(s) to finish setting up your account.
            </Text>

            <Text style={styles.modalLabel}>Selected Route *</Text>
            <TouchableOpacity
              style={styles.selectRouteBtn}
              onPress={() => setRoutePickerOpen(true)}
            >
              <Text style={selectedRoute ? styles.selectedRouteText : styles.placeholderText}>
                {selectedRoute ? `Route ${selectedRoute} - ${routeObj?.routeName || ''}` : 'Tap to choose your bus route'}
              </Text>
            </TouchableOpacity>

            {/* Stops Chips */}
            {routeObj && (
              <View style={{ marginTop: 14 }}>
                <Text style={styles.modalLabel}>Select Your Boarding Stop(s) *</Text>
                <Text style={styles.chipHint}>Tap one or more stops where you board:</Text>
                <View style={styles.chipsRow}>
                  {routeObj.stops.map((stop) => {
                    const isSelected = selectedStops.includes(stop);
                    return (
                      <TouchableOpacity
                        key={stop}
                        style={[styles.stopChip, isSelected && styles.stopChipSelected]}
                        onPress={() => toggleStop(stop)}
                      >
                        <Text style={[styles.stopChipText, isSelected && styles.stopChipTextSelected]}>
                          {isSelected ? `✓ ${stop}` : stop}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.btnDisabled]}
                onPress={handleFinishSetup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save & Open Bus Map</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowSetupModal(false)}
                disabled={loading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ROUTE PICKER */}
      <PickerModal
        visible={routePickerOpen}
        title="Select Your Bus Route"
        items={routeItems}
        onClose={() => setRoutePickerOpen(false)}
        onSelect={(val) => {
          setSelectedRoute(val);
          setSelectedStops([]);
          setRoutePickerOpen(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  busIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    borderColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  busEmoji: {
    fontSize: 34,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 320,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 18,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#f87171',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
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
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gLogoText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '900',
  },
  googleBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
  },
  driverSwitchBtn: {
    alignItems: 'center',
    marginTop: 26,
  },
  driverSwitchText: {
    fontSize: 13,
    color: '#64748b',
  },
  driverSwitchBold: {
    color: '#d97706',
    fontWeight: '700',
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectRouteBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
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
  chipHint: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    maxHeight: 160,
  },
  stopChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  stopChipSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  stopChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  stopChipTextSelected: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  modalActions: {
    marginTop: 20,
    gap: 10,
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 13,
  },
});
