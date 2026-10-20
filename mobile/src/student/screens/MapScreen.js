import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSocket } from '../context/SocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LiveMap from '../components/LiveMap';
import { getBusEta } from '../api/studentApi';
import { colors } from '../utils/theme';

function formatLastSeen(isoStr) {
  if (!isoStr) return 'No recent trips';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000));
  if (diffSec < 60) return 'last seen just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `last seen ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `last seen ${hours} hr ago`;
}

// focusRoute = { routeNo, color, stops } passed from "My Bus" or "Find Route"
export default function MapScreen({ focusRoute, onClearFocus }) {
  const { busPositions, connected } = useSocket();
  const [onlyFocus, setOnlyFocus] = useState(true);
    const [selectedStop, setSelectedStop] = useState(null);
  const [etaData, setEtaData] = useState(null);

  // Students don't log in: use the stop they picked on "My Bus" / "Find Route" (saved on the phone).
  useEffect(() => {
    AsyncStorage.multiGet(['student_my_stop', 'findRouteStop']).then((pairs) => {
      const saved = pairs.map(([, v]) => v).find(Boolean);
      if (saved) setSelectedStop((cur) => cur || saved);
    }).catch(() => {});
  }, []);

  const activeRoute = focusRoute || null;
  const baseNo = activeRoute ? activeRoute.routeNo.replace(/-R$/, '') : null;

  const myStops = useMemo(() => (selectedStop ? [selectedStop] : []), [selectedStop]);

  // Filtered buses shown on map
  const buses = useMemo(() => {
    if (activeRoute && onlyFocus) return busPositions.filter((b) => b.routeNo === baseNo);
    return busPositions;
  }, [busPositions, activeRoute, onlyFocus, baseNo]);

  const liveBus = useMemo(() => {
    if (!baseNo) return null;
    return busPositions.find((b) => b.routeNo === baseNo) || null;
  }, [busPositions, baseNo]);

  // Fetch updated ETA whenever live bus or selected stop changes
  useEffect(() => {
    let mounted = true;
    if (activeRoute && selectedStop && liveBus?.live) {
      getBusEta(activeRoute.routeNo, selectedStop)
        .then((res) => {
          if (mounted) setEtaData(res);
        })
        .catch(() => {
          if (mounted) setEtaData(null);
        });
    } else {
      setEtaData(null);
    }
    return () => {
      mounted = false;
    };
  }, [activeRoute, selectedStop, liveBus?.live, liveBus?.currentStop]);

  const liveCount = busPositions.filter((b) => b.live).length;
  const isLive = !!liveBus?.live;

  return (
    <View style={{ flex: 1 }}>
      {/* Top Status Bar */}
      <View style={styles.bar}>
        <View style={styles.status}>
          <View style={[styles.dot, { backgroundColor: connected ? colors.green : colors.red }]} />
          <Text style={styles.statusText}>
            {connected ? `${liveCount} live / ${busPositions.length} buses` : 'Offline'}
          </Text>
        </View>
        {activeRoute ? (
          <View style={styles.chips}>
            <TouchableOpacity
              style={[styles.chip, onlyFocus && styles.chipOn]}
              onPress={() => setOnlyFocus(!onlyFocus)}
            >
              <Text style={styles.chipText}>{onlyFocus ? activeRoute.routeNo : 'All buses'}</Text>
            </TouchableOpacity>
            {focusRoute && (
              <TouchableOpacity style={styles.chip} onPress={onClearFocus}>
                <Text style={styles.chipText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={styles.hint}>Pick a route to see its stops</Text>
        )}
      </View>

      {/* Floating Status Banner for Active Route */}
      {activeRoute && (
        <View style={styles.bannerContainer}>
          {isLive ? (
            <View style={styles.liveBanner}>
              <View style={styles.bannerRow}>
                <View style={styles.liveIndicator}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.liveTag}>LIVE</Text>
                </View>
                <Text style={styles.bannerTitle}>Route {activeRoute.routeNo}</Text>
                {etaData?.etaMinutes != null && (
                  <View style={styles.etaBadge}>
                    <Text style={styles.etaBadgeText}>~{etaData.etaMinutes} min to {selectedStop}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.bannerDetails}>
                Current: <Text style={styles.bold}>{liveBus.currentStop || 'In transit'}</Text> · Next:{' '}
                <Text style={styles.bold}>{liveBus.nextStop || 'Terminus'}</Text>
                {liveBus.speed != null && liveBus.speed > 0
                  ? ` · ${Math.round(liveBus.speed)} km/h`
                  : ''}
              </Text>
            </View>
          ) : (
            <View style={styles.offlineBanner}>
              <View style={styles.bannerRow}>
                <View style={styles.offlineDot} />
                <Text style={styles.offlineTitle}>
                  Driver offline – {formatLastSeen(liveBus?.lastUpdated)}
                </Text>
              </View>
              <Text style={styles.offlineHint}>
                Live GPS sharing has not been started by the driver yet.
              </Text>
            </View>
          )}

          {/* Student's stop selector pills if multiple assigned stops */}
          {myStops.length > 1 && (
            <View style={styles.stopsRow}>
              <Text style={styles.stopsLabel}>Your stops:</Text>
              {myStops.map((st) => {
                const isSelected = st === selectedStop;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.stopPill, isSelected && styles.stopPillActive]}
                    onPress={() => setSelectedStop(st)}
                  >
                    <Text style={[styles.stopPillText, isSelected && styles.stopPillTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Interactive Map */}
      <LiveMap
        buses={buses}
        route={activeRoute}
        myStop={selectedStop}
        myStops={myStops}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.muted },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.ink },

  bannerContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  liveBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 10,
    padding: 10,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  liveTag: {
    color: '#16a34a',
    fontWeight: '800',
    fontSize: 12,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginLeft: 8,
  },
  etaBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  etaBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  bannerDetails: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  bold: { fontWeight: '700', color: '#0f172a' },

  offlineBanner: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
    marginRight: 6,
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    flex: 1,
  },
  offlineHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },

  stopsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  stopsLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  stopPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stopPillActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  stopPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  stopPillTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
});
