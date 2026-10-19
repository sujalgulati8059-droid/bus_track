import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  AppState,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  getRoutes,
  getTodayTravel,
  setTravelStatus,
  getBusStatusToday,
  getBusEta,
} from '../api/studentApi';
import PickerModal from '../components/PickerModal';
import { colors } from '../utils/theme';

function formatLastSeen(isoStr) {
  if (!isoStr) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000));
  if (diffSec < 60) return 'last seen just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `last seen ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `last seen ${hours} hr ago`;
}

export default function MyBusScreen({ onViewOnMap }) {
  const { user, logout, changeStop } = useAuth();
  const { busPositions } = useSocket();
  const [route, setRoute] = useState(null);
  const [today, setToday] = useState(undefined); // undefined = loading, null = nothing set
  const [busStatus, setBusStatus] = useState(null);
  const [stop, setStop] = useState(user.assignedStop);
  const [etaInfo, setEtaInfo] = useState(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const myStops =
    user?.assignedStops && user.assignedStops.length > 0
      ? user.assignedStops
      : user?.assignedStop
      ? [user.assignedStop]
      : [];

  const load = useCallback(async () => {
    try {
      const [routes, status, statuses] = await Promise.all([
        getRoutes(),
        getTodayTravel(),
        getBusStatusToday(),
      ]);
      const matched = routes.find((r) => r.routeNo === user.assignedRoute) || null;
      setRoute(matched);
      setToday(status || null);
      if (status?.stop) setStop(status.stop);
      setBusStatus(statuses.find((s) => s.routeNo === user.assignedRoute) || null);

      // Fetch ETA for currently selected stop
      if (user.assignedRoute && (status?.stop || stop)) {
        try {
          const etaRes = await getBusEta(user.assignedRoute, status?.stop || stop);
          setEtaInfo(etaRes);
        } catch (e) {
          setEtaInfo(null);
        }
      }
    } catch (e) {
      setToday(null);
    }
  }, [user.assignedRoute, user.assignedStop, stop]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        load();
      }
    });
    return () => sub.remove();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const setGoing = async (going) => {
    setBusy(true);
    try {
      await setTravelStatus(going, stop);
      const s = await getTodayTravel();
      setToday(s || null);
    } catch (e) {
      Alert.alert('Could not update', e?.response?.data?.error || 'Check your connection and try again');
    } finally {
      setBusy(false);
    }
  };

  const saveAsDefault = async (s) => {
    setStop(s);
    setPicker(false);
    try {
      await changeStop(s);
      const etaRes = await getBusEta(user.assignedRoute, s).catch(() => null);
      setEtaInfo(etaRes);
    } catch (e) {
      Alert.alert('Could not save stop', e?.response?.data?.error || 'Try again');
    }
  };

  const live = busPositions.find((b) => b.routeNo === user.assignedRoute);
  const notRunning = busStatus && busStatus.isWorking === false;
  const isBusLive = !!live?.live;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Student Profile Card */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.sub}>
              {user.uid} · {user.role === 'faculty' ? 'Faculty' : 'Student'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Log out?', '', [
                { text: 'Cancel' },
                { text: 'Log out', style: 'destructive', onPress: logout },
              ])
            }
          >
            <Text style={styles.logout}>Log out</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.routeLine}>
          Route {user.assignedRoute}
          {route ? ` - ${route.routeName}` : ''}
        </Text>
      </View>

      {/* Not Running Banner */}
      {notRunning && (
        <View style={[styles.banner, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
          <Text style={{ color: colors.red, fontWeight: '700' }}>Your bus is not running today</Text>
          {!!busStatus.reason && <Text style={{ color: colors.red, marginTop: 2 }}>{busStatus.reason}</Text>}
        </View>
      )}

      {/* ============================================================ */}
      {/* BUS LIVE STATUS CARD */}
      {/* ============================================================ */}
      <View style={styles.card}>
        <Text style={styles.h}>Live Bus Status</Text>

        {isBusLive ? (
          <View style={styles.liveStatusContainer}>
            <View style={styles.liveTagRow}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.liveStatusText}>
                🟢 Bus is LIVE – arriving at {stop} in {etaInfo?.etaMinutes != null ? etaInfo.etaMinutes : (live?.etaMinutes != null ? live.etaMinutes : '5-10')} min
              </Text>
            </View>
            <Text style={styles.sub}>
              Current Stop: <Text style={styles.bold}>{live.currentStop || '-'}</Text> · Next:{' '}
              <Text style={styles.bold}>{live.nextStop || 'Terminus'}</Text>
            </Text>
          </View>
        ) : (
          <View style={styles.notLiveStatusContainer}>
            <Text style={styles.notLiveStatusText}>
              ⚪ Bus not live yet{' '}
              {live?.lastUpdated ? `(${formatLastSeen(live.lastUpdated)})` : ''}
            </Text>
            <Text style={styles.notLiveHintText}>
              Driver has not started live GPS sharing for this route yet.
            </Text>
          </View>
        )}

        {route && (
          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() =>
              onViewOnMap({
                routeNo: route.routeNo,
                color: route.color,
                stops: route.stops,
                assignedStops: myStops,
              })
            }
          >
            <Text style={styles.mapBtnText}>Track bus on live map</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Travel Status & Boarding Stop Selection */}
      <View style={styles.card}>
        <Text style={styles.h}>Are you travelling today?</Text>
        <Text style={styles.sub}>Helps your driver know how many passengers to expect.</Text>
        {today === undefined ? (
          <ActivityIndicator style={{ marginTop: 14 }} color={colors.brandDark} />
        ) : (
          <>
            <View style={styles.goRow}>
              <TouchableOpacity
                disabled={busy}
                onPress={() => setGoing(true)}
                style={[styles.goBtn, today?.going === true && styles.goYes]}
              >
                <Text style={styles.goText}>Yes, going</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={busy}
                onPress={() => setGoing(false)}
                style={[styles.goBtn, today?.going === false && styles.goNo]}
              >
                <Text style={styles.goText}>Not today</Text>
              </TouchableOpacity>
            </View>

            {/* Student's Saved Frequent Stops */}
            <Text style={styles.label}>Your Preferred Boarding Stops</Text>
            <View style={styles.chipsRow}>
              {myStops.map((s) => {
                const isCurrent = s === stop;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.savedStopChip, isCurrent && styles.savedStopChipActive]}
                    onPress={() => saveAsDefault(s)}
                  >
                    <Text
                      style={[
                        styles.savedStopChipText,
                        isCurrent && styles.savedStopChipTextActive,
                      ]}
                    >
                      {isCurrent ? `✓ ${s}` : s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.select} onPress={() => setPicker(true)} disabled={!route}>
              <Text style={styles.selectText}>Pick another stop: {stop}</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              {today
                ? `Marked ${today.going ? 'GOING' : 'NOT GOING'} from ${today.stop}.`
                : "You haven't set today's status yet."}
            </Text>
          </>
        )}
      </View>

      {/* Route Stops List */}
      {route && (
        <View style={styles.card}>
          <Text style={styles.h}>All stops on your route</Text>
          {route.stops.map((s, i) => {
            const isMine = myStops.includes(s);
            const isCurrent = s === stop;
            return (
              <View key={s + i} style={styles.stopRow}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isCurrent
                        ? '#2563eb'
                        : isMine
                        ? '#3b82f6'
                        : route.color || colors.brandDark,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.stopText,
                    isCurrent && { fontWeight: '800', color: '#2563eb' },
                    isMine && !isCurrent && { fontWeight: '700', color: '#1d4ed8' },
                  ]}
                >
                  {s}
                  {isCurrent ? '  (boarding stop)' : isMine ? '  (saved stop)' : ''}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <PickerModal
        visible={picker}
        title="Boarding stop"
        items={route?.stops || []}
        onClose={() => setPicker(false)}
        onSelect={saveAsDefault}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 13, color: colors.muted, marginTop: 3 },
  bold: { fontWeight: '700', color: colors.ink },
  logout: { color: colors.red, fontWeight: '600' },
  routeLine: { marginTop: 10, fontSize: 14, fontWeight: '700', color: colors.brandDark },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  h: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 2 },

  liveStatusContainer: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  liveTagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  greenPulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a', marginRight: 6 },
  liveStatusText: { fontSize: 13, fontWeight: '800', color: '#15803d' },

  notLiveStatusContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  notLiveStatusText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  notLiveHintText: { fontSize: 12, color: '#94a3b8', marginTop: 3 },

  mapBtn: {
    marginTop: 8,
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mapBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

  goRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  goBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
  },
  goYes: { backgroundColor: '#dcfce7', borderColor: '#4ade80' },
  goNo: { backgroundColor: '#fee2e2', borderColor: '#f87171' },
  goText: { fontWeight: '700', color: colors.ink },

  label: {
    marginTop: 14,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  savedStopChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.line,
  },
  savedStopChipActive: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  savedStopChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  savedStopChipTextActive: { color: '#1d4ed8', fontWeight: '800' },

  select: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: 10 },
  selectText: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.muted, marginTop: 10 },
  stopRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  stopText: { fontSize: 14, color: colors.ink },
});
