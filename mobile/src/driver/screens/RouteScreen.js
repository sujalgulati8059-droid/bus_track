import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMyRoute,
  setTodayStatus,
  getPassengers,
  startDriverTrip,
  stopDriverTrip,
  updateDriverProfile,
} from '../api/driverApi';
import {
  startSharing,
  stopSharing,
  isSharing,
  subscribePingStatus,
} from '../services/locationSharing';
import { useAuth } from '../context/AuthContext';

const TRIP_STORAGE_KEY = 'driver_active_trip_state';

export default function RouteScreen() {
  const { driver, logout } = useAuth();
  const [route, setRoute] = useState(null);
  const [today, setToday] = useState('Today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isWorking, setIsWorking] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [pax, setPax] = useState(null);

  // Trip State
  const [tripActive, setTripActive] = useState(false);
  const [tripStartedAt, setTripStartedAt] = useState(null);
  const [elapsedTimeStr, setElapsedTimeStr] = useState('00:00');
  const [startDialogVisible, setStartDialogVisible] = useState(false);
  const [tripBusy, setTripBusy] = useState(false);

  // Ping Telemetry State
  const [pingStatus, setPingStatus] = useState({ lastSent: null, retrying: false });
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Account Phone & Password Settings Modal State
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountPhone, setAccountPhone] = useState(driver?.phone || '');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);

  const handleSaveAccount = async () => {
    if (accountPassword && accountPassword.length < 6) {
      return Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
    }
    setAccountSaving(true);
    try {
      await updateDriverProfile({
        phone: accountPhone.trim() || undefined,
        password: accountPassword || undefined,
      });
      Alert.alert('Account Updated', 'Your mobile number and password have been saved successfully.');
      setShowAccountModal(false);
      setAccountPassword('');
    } catch (e) {
      Alert.alert('Save Failed', e?.response?.data?.error || e?.message || 'Could not update profile');
    } finally {
      setAccountSaving(false);
    }
  };

  const elapsedTimerRef = useRef(null);
  const secondsAgoTimerRef = useRef(null);

  // Restore trip state on load
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(TRIP_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.tripActive) {
            const sharingActive = await isSharing();
            setTripActive(true);
            setTripStartedAt(parsed.tripStartedAt || Date.now());
            if (!sharingActive) {
              startSharing().catch(() => {});
            }
          }
        }
      } catch (e) {}
    })();
  }, []);

  // Listen to ping telemetry
  useEffect(() => {
    const unsubscribe = subscribePingStatus((status) => {
      setPingStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Elapsed time counter during live trip
  useEffect(() => {
    if (tripActive && tripStartedAt) {
      const updateElapsed = () => {
        const diffMs = Math.max(0, Date.now() - tripStartedAt);
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        setElapsedTimeStr(
          `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        );
      };
      updateElapsed();
      elapsedTimerRef.current = setInterval(updateElapsed, 1000);
      return () => clearInterval(elapsedTimerRef.current);
    } else {
      setElapsedTimeStr('00:00');
    }
  }, [tripActive, tripStartedAt]);

  // Last sent seconds counter
  useEffect(() => {
    if (tripActive && pingStatus.lastSent) {
      const updateAgo = () => {
        const secs = Math.max(0, Math.floor((Date.now() - pingStatus.lastSent) / 1000));
        setSecondsAgo(secs);
      };
      updateAgo();
      secondsAgoTimerRef.current = setInterval(updateAgo, 1000);
      return () => clearInterval(secondsAgoTimerRef.current);
    }
  }, [tripActive, pingStatus.lastSent]);

  const load = useCallback(async () => {
    try {
      const res = await getMyRoute();
      const r = res.data.route;
      setRoute(r);
      setToday(res.data.today || 'Today');
      setIsWorking(res.data.todayStatus?.isWorking !== false);

      try {
        const passengers = await getPassengers();
        setPax(passengers.data);
      } catch (e) {
        setPax(null);
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not load assigned route');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // ----------------------------------------------------
  // TRIP START / STOP LOGIC
  // ----------------------------------------------------
  const handleOpenStartDialog = () => {
    if (!isWorking) {
      Alert.alert(
        'Bus is marked OFF',
        'Your bus is marked not working today. Turn on working status first.'
      );
      return;
    }
    setStartDialogVisible(true);
  };

  const handleConfirmStartTrip = async () => {
    setStartDialogVisible(false);
    setTripBusy(true);

    try {
      // 1. Start foreground location service
      const shareResult = await startSharing();
      if (shareResult.error) {
        if (shareResult.gpsOff) {
          Alert.alert(
            'GPS is Turned Off',
            'Please turn on Location / GPS in your device settings to share your bus location.'
          );
          setTripBusy(false);
          return;
        }
        if (shareResult.permanentlyDenied) {
          Alert.alert(
            'Location Permission Required',
            'Location permission is permanently denied. Please enable it in Settings to start the trip.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          setTripBusy(false);
          return;
        }
        Alert.alert('Permission Error', shareResult.error);
        setTripBusy(false);
        return;
      }

      // 2. Notify backend of trip start
      const startRes = await startDriverTrip();
      const startTime = Date.now();
      setTripActive(true);
      setTripStartedAt(startTime);

      await AsyncStorage.setItem(
        TRIP_STORAGE_KEY,
        JSON.stringify({ tripActive: true, tripStartedAt: startTime })
      );
    } catch (e) {
      Alert.alert('Could Not Start Trip', e?.response?.data?.error || e.message);
      await stopSharing();
      setTripActive(false);
    } finally {
      setTripBusy(false);
    }
  };

  const handleConfirmEndTrip = () => {
    Alert.alert(
      'End Trip?',
      'Students on your route will no longer see your bus live on the map. End trip now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Trip',
          style: 'destructive',
          onPress: async () => {
            setTripBusy(true);
            try {
              await stopSharing();
              await stopDriverTrip();
              setTripActive(false);
              setTripStartedAt(null);
              await AsyncStorage.removeItem(TRIP_STORAGE_KEY);
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.error || 'Could not end trip cleanly');
            } finally {
              setTripBusy(false);
            }
          },
        },
      ]
    );
  };

  const toggleWorking = async (value) => {
    if (!value && tripActive) {
      Alert.alert('Trip in Progress', 'Please end your live trip before marking bus off.');
      return;
    }
    setIsWorking(value);
    setStatusSaving(true);
    try {
      await setTodayStatus(value, value ? '' : 'Marked off by driver');
    } catch (e) {
      setIsWorking(!value);
      Alert.alert('Error', e?.response?.data?.error || 'Could not update status');
    } finally {
      setStatusSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {driver?.name?.split(' ')[0]}</Text>
            <Text style={styles.routeBadge}>Route {route?.routeNo || driver?.routeNo}</Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Log out?', '', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Log out',
                  style: 'destructive',
                  onPress: async () => {
                    if (tripActive) {
                      await stopSharing();
                      await stopDriverTrip().catch(() => {});
                      await AsyncStorage.removeItem(TRIP_STORAGE_KEY);
                    }
                    logout();
                  },
                },
              ])
            }
          >
            <Text style={styles.logout}>Log out</Text>
          </TouchableOpacity>
        </View>

        {/* Account Settings Bar */}
        <TouchableOpacity
          style={styles.accountSettingsBar}
          onPress={() => {
            setAccountPhone(driver?.phone || '');
            setShowAccountModal(true);
          }}
        >
          <Text style={styles.accountSettingsBarText}>🔑 Set Up Phone Number & Password</Text>
        </TouchableOpacity>

        {/* ============================================================ */}
        {/* LIVE TRIP CONTROL BAR */}
        {/* ============================================================ */}
        {tripActive ? (
          <View style={styles.liveBar}>
            <View style={styles.liveIndicatorRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveBarText}>LIVE TRIP IN PROGRESS</Text>
              <Text style={styles.elapsedTimer}>{elapsedTimeStr}</Text>
            </View>

            {/* Connection / Ping Telemetry */}
            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryText}>
                {pingStatus.retrying
                  ? '🟠 Retrying connection...'
                  : pingStatus.lastSent
                  ? `🟢 Online • Last ping ${secondsAgo}s ago`
                  : '🟡 Connecting GPS...'}
              </Text>
            </View>

            {/* Big End Trip Button */}
            <TouchableOpacity
              style={styles.endTripBtn}
              onPress={handleConfirmEndTrip}
              disabled={tripBusy}
            >
              {tripBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.endTripBtnText}>⏹ End Trip</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.notLiveBar}>
            <Text style={styles.notLiveHeading}>Bus is Not Live</Text>
            <Text style={styles.notLiveSub}>
              Start a trip so students on Route {route?.routeNo} can track your bus in real time.
            </Text>

            <TouchableOpacity
              style={styles.startTripBtn}
              onPress={handleOpenStartDialog}
              disabled={tripBusy}
            >
              {tripBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.startTripBtnText}>▶ Start Trip</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Working Status Toggle */}
        <View style={styles.statusCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              {isWorking ? 'Bus is working today' : 'Bus is OFF today'}
            </Text>
            <Text style={styles.statusSub}>Today is {today}. Toggle if plans change.</Text>
          </View>
          {statusSaving ? (
            <ActivityIndicator color="#f97316" />
          ) : (
            <Switch
              value={isWorking}
              onValueChange={toggleWorking}
              trackColor={{ true: '#f97316' }}
            />
          )}
        </View>

        {/* Passenger Breakdown Card */}
        <Text style={styles.sectionTitle}>Students on your route</Text>
        {pax ? (
          <View style={styles.paxCard}>
            <View style={styles.paxHead}>
              <View>
                <Text style={styles.paxBig}>{pax.total}</Text>
                <Text style={styles.paxLabel}>going today</Text>
              </View>
              <View>
                <Text style={styles.paxBig}>{pax.registered}</Text>
                <Text style={styles.paxLabel}>registered</Text>
              </View>
              <View>
                <Text style={[styles.paxBig, pax.overCapacity && { color: '#dc2626' }]}>
                  {pax.capacity}
                </Text>
                <Text style={styles.paxLabel}>seats</Text>
              </View>
            </View>
            {pax.overCapacity && (
              <Text style={styles.paxWarn}>More students are going than there are seats.</Text>
            )}
            <View style={styles.paxRowHead}>
              <Text style={[styles.paxCell, { flex: 1 }]}>STOP</Text>
              <Text style={styles.paxCellNum}>TODAY</Text>
              <Text style={styles.paxCellNum}>REG.</Text>
            </View>
            {pax.stops?.map((s) => (
              <View key={s.stop} style={styles.paxRow}>
                <Text style={[styles.paxStop, { flex: 1 }]} numberOfLines={1}>
                  {s.stop}
                </Text>
                <Text style={[styles.paxCellNum, s.count > 0 && styles.paxActive]}>
                  {s.count}
                </Text>
                <Text style={styles.paxCellNum}>{s.registered}</Text>
              </View>
            ))}
            <Text style={styles.paxHint}>
              TODAY = students who marked "going". REG. = registered at that stop.
            </Text>
          </View>
        ) : (
          <Text style={styles.paxHint}>Passenger counts loading...</Text>
        )}

        {/* Assigned Route Stops List (Locked - Assigned from server) */}
        <Text style={styles.sectionTitle}>Your Assigned Route Stops</Text>
        <View style={styles.routeCard}>
          <Text style={styles.routeNameText}>
            {route?.routeNo}: {route?.routeName}
          </Text>
          <Text style={styles.departureText}>
            Scheduled Departure: {route?.departureTime || '08:00 AM'}
          </Text>
          <View style={{ marginTop: 10 }}>
            {route?.stops?.map((s, idx) => (
              <View key={s + idx} style={styles.stopItemRow}>
                <View style={styles.stopNumberBadge}>
                  <Text style={styles.stopNumberText}>{idx + 1}</Text>
                </View>
                <Text style={styles.stopItemName}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ============================================================ */}
      {/* START TRIP CUSTOM CONFIRMATION DIALOG */}
      {/* ============================================================ */}
      <Modal
        visible={startDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStartDialogVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Share Live Location?</Text>
            <Text style={styles.dialogBody}>
              Students on {route?.routeNo || 'your route'} will see your bus live in real time.
              Allow location access and keep this active until your trip ends.
            </Text>

            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setStartDialogVisible(false)}
              >
                <Text style={styles.dialogCancelText}>Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={handleConfirmStartTrip}
              >
                <Text style={styles.dialogConfirmText}>Enable & Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ACCOUNT SETTINGS MODAL */}
      <Modal visible={showAccountModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Driver Account Settings</Text>
            <Text style={styles.dialogBody}>
              Set up your phone number and password so you can also log in directly using your Route ID ({route?.routeNo || driver?.routeNo}) or mobile number.
            </Text>

            <Text style={styles.modalLabel}>Assigned Route</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: '#f1f5f9', color: '#64748b' }]}
              value={route?.routeNo || driver?.routeNo || 'Route'}
              editable={false}
            />

            <Text style={styles.modalLabel}>Mobile Number (10 digits)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 9876543210"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={accountPhone}
              onChangeText={setAccountPhone}
            />

            <Text style={styles.modalLabel}>New Password (min 6 characters)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter new password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={accountPassword}
              onChangeText={setAccountPassword}
            />

            <View style={[styles.dialogButtons, { marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setShowAccountModal(false)}
                disabled={accountSaving}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogConfirmBtn, { backgroundColor: '#f59e0b' }]}
                onPress={handleSaveAccount}
                disabled={accountSaving}
              >
                {accountSaving ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={[styles.dialogConfirmText, { color: '#0f172a' }]}>Save Settings</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  routeBadge: { fontSize: 15, color: '#f97316', fontWeight: '700', marginTop: 2 },
  logout: { color: '#6b7280', fontSize: 14, fontWeight: '600' },

  liveBar: {
    backgroundColor: '#052e16',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  liveIndicatorRow: { flexDirection: 'row', alignItems: 'center' },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  liveBarText: { fontSize: 13, fontWeight: '800', color: '#86efac', letterSpacing: 0.5 },
  elapsedTimer: { marginLeft: 'auto', fontSize: 20, fontWeight: '900', color: '#fff' },
  telemetryRow: { marginTop: 10, marginBottom: 14 },
  telemetryText: { fontSize: 12, fontWeight: '600', color: '#bbf7d0' },
  endTripBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  endTripBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  notLiveBar: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notLiveHeading: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  notLiveSub: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 16 },
  startTripBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startTripBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  statusSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 10 },

  paxCard: { backgroundColor: '#fff7ed', borderRadius: 14, padding: 14, marginBottom: 20 },
  paxHead: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  paxBig: { fontSize: 24, fontWeight: '800', color: '#1f2937', textAlign: 'center' },
  paxLabel: { fontSize: 11, color: '#6b7280', textAlign: 'center' },
  paxWarn: { color: '#dc2626', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  paxRowHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
    paddingBottom: 4,
    marginTop: 4,
  },
  paxRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ffedd5',
  },
  paxCell: { fontSize: 10, color: '#9a3412', fontWeight: '700' },
  paxCellNum: { width: 52, textAlign: 'right', fontSize: 13, color: '#374151', fontWeight: '600' },
  paxStop: { fontSize: 13, color: '#1f2937' },
  paxActive: { color: '#f97316', fontWeight: '800' },
  paxHint: { fontSize: 11, color: '#6b7280', marginTop: 8 },

  routeCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  routeNameText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  departureText: { fontSize: 13, fontWeight: '600', color: '#f97316', marginTop: 4 },
  stopItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  stopNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stopNumberText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  stopItemName: { fontSize: 14, color: '#1e293b', fontWeight: '500' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  dialogTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  dialogBody: { fontSize: 14, color: '#475569', lineHeight: 21, marginBottom: 22 },
  dialogButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  dialogCancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  dialogCancelText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  dialogConfirmBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  dialogConfirmText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  accountSettingsBar: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  accountSettingsBarText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#0f172a',
  },
});
