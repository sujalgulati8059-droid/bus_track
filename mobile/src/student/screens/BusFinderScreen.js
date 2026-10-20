import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../context/SocketContext';
import { getRoutes, getStops, searchBuses, getBusStatusToday } from '../api/studentApi';
import PickerModal from '../components/PickerModal';
import { colors } from '../utils/theme';

const STOP_KEY = 'student_my_stop';

export default function BusFinderScreen({ onViewOnMap }) {
  const { busPositions, connected } = useSocket();
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [myStop, setMyStop] = useState('');
  const [routeQuery, setRouteQuery] = useState('');
  const [routeResult, setRouteResult] = useState(null);
  const [routeSearchError, setRouteSearchError] = useState('');
  const [picker, setPicker] = useState(false);
  const [buses, setBuses] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getStops().then(setStops).catch(() => {});
    getRoutes()
      .then((items) => setRoutes(items.filter((route) => !route.routeNo.endsWith('-R'))))
      .catch(() => setRouteSearchError('Could not load routes. Check your connection and try again.'));
    AsyncStorage.getItem(STOP_KEY).then((s) => { if (s) { setMyStop(s); loadBuses(s); } });
  }, []);

  const loadBuses = useCallback(async (stop = myStop) => {
    if (!stop) return;
    setLoading(true); setError('');
    try {
      const [results, todayStatuses] = await Promise.all([
        searchBuses(stop, 'CU'),
        getBusStatusToday(),
      ]);
      setBuses(results);
      setStatuses(todayStatuses);
    } catch (e) {
      setError('Cannot reach server. Check your connection.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [myStop]);

  const pickStop = async (s) => {
    setMyStop(s); setPicker(false);
    await AsyncStorage.setItem(STOP_KEY, s);
    loadBuses(s);
  };

  const onRefresh = () => { setRefreshing(true); loadBuses(); };

  const getLiveInfo = (routeNo) => busPositions.find((b) => b.routeNo === routeNo);
  const getStatus = (routeNo) => statuses.find((s) => s.routeNo === routeNo);

  const searchRoute = () => {
    const query = routeQuery
      .trim()
      .toUpperCase()
      .replace(/^ROUTE\s*/, '')
      .replace(/-R$/, '')
      .replace(/^R-?/, '')
      .replace(/\s+/g, '')
      .replace(/^0+(\d)/, '$1');

    if (!query) {
      setRouteResult(null);
      setRouteSearchError('Enter a route number, such as 1 or R-01.');
      return;
    }

    const matched = routes.find((route) => {
      const routeNumber = route.routeNo
        .toUpperCase()
        .replace(/-R$/, '')
        .replace(/^R-?/, '')
        .replace(/\s+/g, '')
        .replace(/^0+(\d)/, '$1');
      return routeNumber === query;
    });

    setRouteResult(matched || null);
    setRouteSearchError(matched ? '' : `Route "${routeQuery.trim()}" was not found.`);
  };

  const selectedLive = routeResult ? getLiveInfo(routeResult.routeNo) : null;
  const selectedStatus = routeResult ? getStatus(routeResult.routeNo) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Stop Selector Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚌 BusTrack CU</Text>
        <Text style={styles.headerSub}>Search a route to track its bus, or choose your stop</Text>
        <View style={styles.routeSearch}>
          <TextInput
            style={styles.routeInput}
            placeholder="Route number (e.g. 1 or R-01)"
            placeholderTextColor="#9ca3af"
            value={routeQuery}
            onChangeText={(value) => {
              setRouteQuery(value);
              setRouteResult(null);
              setRouteSearchError('');
            }}
            onSubmitEditing={searchRoute}
            returnKeyType="search"
            autoCapitalize="characters"
            accessibilityLabel="Search bus route number"
          />
          <TouchableOpacity style={styles.routeSearchBtn} onPress={searchRoute}>
            <Text style={styles.routeSearchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
        {!!routeSearchError && <Text style={styles.routeSearchError}>{routeSearchError}</Text>}
        {routeResult && (
          <View style={styles.routeResult}>
            <View style={styles.routeResultHeading}>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeResultNo}>{routeResult.routeNo}</Text>
                <Text style={styles.routeResultName} numberOfLines={2}>{routeResult.routeName}</Text>
              </View>
              <View style={[styles.routeLivePill, selectedLive?.live && styles.routeLivePillActive]}>
                <Text style={[styles.routeLiveText, selectedLive?.live && styles.routeLiveTextActive]}>
                  {selectedLive?.live ? 'LIVE' : 'NOT LIVE'}
                </Text>
              </View>
            </View>
            {selectedStatus?.isWorking === false ? (
              <Text style={styles.routeResultStatus}>
                Not running today{selectedStatus.reason ? ` — ${selectedStatus.reason}` : ''}
              </Text>
            ) : selectedLive?.live ? (
              <Text style={styles.routeResultStatus}>
                At {selectedLive.currentStop || 'current location'}{selectedLive.nextStop ? ` · Next: ${selectedLive.nextStop}` : ''}
              </Text>
            ) : (
              <Text style={styles.routeResultStatus}>The driver has not started sharing this route yet.</Text>
            )}
            <TouchableOpacity style={styles.routeMapBtn} onPress={() => onViewOnMap(routeResult)}>
              <Text style={styles.routeMapBtnText}>View bus location on map →</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity style={styles.stopBtn} onPress={() => setPicker(true)}>
          <Text style={myStop ? styles.stopBtnText : styles.stopBtnPlaceholder}>
            {myStop ? `📍 ${myStop}` : 'Tap to choose your stop →'}
          </Text>
        </TouchableOpacity>
        {myStop && (
          <View style={styles.connRow}>
            <View style={[styles.connDot, { backgroundColor: connected ? '#22c55e' : '#ef4444' }]} />
            <Text style={styles.connText}>{connected ? 'Live tracking active' : 'Offline'}</Text>
          </View>
        )}
      </View>

      {!myStop && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>Find your bus instantly</Text>
          <Text style={styles.emptyDesc}>No login needed. Just pick your stop and see all buses serving it in real time.</Text>
          <TouchableOpacity style={styles.bigPickBtn} onPress={() => setPicker(true)}>
            <Text style={styles.bigPickBtnText}>Choose My Stop</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && <ActivityIndicator style={{ marginTop: 30 }} color={colors.brandDark} />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {buses && !loading && (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {buses.length === 0 ? (
            <View style={styles.noBusBox}>
              <Text style={styles.noBusText}>No direct bus found for {myStop}</Text>
              <Text style={styles.noBusSub}>Try a nearby stop or check "Find Route" tab</Text>
            </View>
          ) : (
            buses.map((bus) => {
              const live = getLiveInfo(bus.routeNo);
              const status = getStatus(bus.routeNo);
              const isLive = !!live?.live;
              const notRunning = status?.isWorking === false;

              return (
                <View key={bus.routeNo} style={styles.busCard}>
                  {/* Route Header */}
                  <View style={styles.busCardHeader}>
                    <View style={[styles.routeBadge, { backgroundColor: bus.color || colors.brandDark }]}>
                      <Text style={styles.routeBadgeText}>{bus.routeNo}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.routeName} numberOfLines={1}>{bus.routeName}</Text>
                      <Text style={styles.routeSub}>Dep: {bus.departureTime || '08:00 AM'}</Text>
                    </View>
                    {isLive && <View style={styles.livePill}><Text style={styles.livePillText}>LIVE</Text></View>}
                  </View>

                  {/* Status */}
                  {notRunning ? (
                    <View style={styles.offBanner}>
                      <Text style={styles.offText}>🚫 Not running today{status.reason ? ` — ${status.reason}` : ''}</Text>
                    </View>
                  ) : isLive ? (
                    <View style={styles.liveBanner}>
                      <Text style={styles.liveText}>
                        🟢 Live · At: <Text style={{ fontWeight: '800' }}>{live.currentStop || '—'}</Text>
                        {live.nextStop ? ` · Next: ${live.nextStop}` : ''}
                        {live.etaMinutes != null ? `  · ~${live.etaMinutes} min to your stop` : ''}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.waitBanner}>
                      <Text style={styles.waitText}>⚪ Driver hasn't started trip yet</Text>
                    </View>
                  )}

                  {/* Stops preview */}
                  <Text style={styles.stopsLabel}>Stops on this route:</Text>
                  <Text style={styles.stopsText} numberOfLines={2}>
                    {bus.stops?.join(' → ')}
                  </Text>

                  <TouchableOpacity style={styles.mapBtn} onPress={() => onViewOnMap(bus)}>
                    <Text style={styles.mapBtnText}>Track on Map →</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <PickerModal visible={picker} title="Choose your stop" items={stops}
        onClose={() => setPicker(false)} onSelect={pickStop} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.brandDark },
  headerSub: { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: 10 },
  routeSearch: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  routeInput: { flex: 1, minWidth: 0, color: colors.ink, borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  routeSearchBtn: { justifyContent: 'center', backgroundColor: colors.brand, borderRadius: 12, paddingHorizontal: 16 },
  routeSearchBtnText: { color: '#000', fontWeight: '800' },
  routeSearchError: { color: colors.red, fontSize: 12, marginTop: -4, marginBottom: 10 },
  routeResult: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, marginBottom: 12 },
  routeResultHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeResultNo: { fontSize: 16, color: colors.ink, fontWeight: '800' },
  routeResultName: { fontSize: 12, color: colors.muted, marginTop: 2 },
  routeLivePill: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  routeLivePillActive: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  routeLiveText: { color: colors.muted, fontWeight: '800', fontSize: 10 },
  routeLiveTextActive: { color: '#15803d' },
  routeResultStatus: { color: colors.ink, fontSize: 12, marginTop: 8 },
  routeMapBtn: { marginTop: 10, backgroundColor: colors.brand, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  routeMapBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
  stopBtn: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: colors.brand, borderRadius: 12, padding: 14 },
  stopBtnText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  stopBtnPlaceholder: { fontSize: 15, color: '#9ca3af' },
  connRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  connText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  bigPickBtn: { marginTop: 24, backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40 },
  bigPickBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  error: { textAlign: 'center', color: colors.red, marginTop: 20, paddingHorizontal: 20 },
  noBusBox: { alignItems: 'center', marginTop: 40 },
  noBusText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  noBusSub: { fontSize: 13, color: colors.muted, marginTop: 6 },
  busCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 14 },
  busCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  routeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  routeBadgeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  routeName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  routeSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  livePill: { backgroundColor: '#dcfce7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  livePillText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  liveBanner: { backgroundColor: '#dcfce7', borderRadius: 10, padding: 10, marginBottom: 10 },
  liveText: { fontSize: 13, color: '#15803d', fontWeight: '600' },
  offBanner: { backgroundColor: '#fee2e2', borderRadius: 10, padding: 10, marginBottom: 10 },
  offText: { fontSize: 13, color: '#dc2626', fontWeight: '600' },
  waitBanner: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 10 },
  waitText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  stopsLabel: { fontSize: 11, color: colors.muted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  stopsText: { fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: 10 },
  mapBtn: { backgroundColor: colors.brand, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  mapBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },
});
