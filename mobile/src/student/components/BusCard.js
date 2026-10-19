import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';

const nowMins = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

// One search result from POST /api/search
export default function BusCard({ bus, onViewOnMap }) {
  const diff = bus.arrivalAtSourceMins - nowMins();
  const off = bus.isWorking === false;
  const badge = off
    ? { t: 'Not running today', c: colors.red }
    : diff < 0 ? { t: 'Departed', c: colors.red }
    : diff === 0 ? { t: 'Arriving now', c: colors.green }
    : { t: `In ${diff} min`, c: diff <= 15 ? colors.orange : colors.green };
  const num = bus.routeNo.replace('R-', '').replace('-R', '');

  return (
    <View style={[styles.card, off && { opacity: 0.6 }]}>
      <View style={styles.top}>
        <View style={[styles.num, { backgroundColor: (bus.color || '#f97316') + '22', borderColor: (bus.color || '#f97316') + '66' }]}>
          <Text style={[styles.numText, { color: bus.color || colors.brandDark }]}>{num}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.routeNo}>{bus.routeNo} · {bus.isReverse ? 'CU to Home' : 'Home to CU'}</Text>
          <Text style={styles.name} numberOfLines={2}>{bus.routeName}</Text>
        </View>
        <Text style={[styles.badge, { color: badge.c, borderColor: badge.c }]}>{badge.t}</Text>
      </View>
      {off && !!bus.offReason && <Text style={styles.reason}>Reason: {bus.offReason}</Text>}
      <View style={styles.stats}>
        {[['Departs', bus.arrivalAtSource], ['Arrives', bus.arrivalAtDestination], ['Journey', `~${bus.journeyDuration}m`], ['Stops', bus.totalStops - 1]].map(([l, v]) => (
          <View key={l}><Text style={styles.statL}>{l}</Text><Text style={styles.statV}>{v}</Text></View>
        ))}
      </View>
      {!!onViewOnMap && (
        <TouchableOpacity style={styles.mapBtn} onPress={() => onViewOnMap({ routeNo: bus.routeNo, color: bus.color, stops: bus.fullRoute })}>
          <Text style={styles.mapBtnText}>View route on map</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  num: { width: 50, height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  numText: { fontWeight: '800', fontSize: 16 },
  routeNo: { fontSize: 11, color: colors.muted, fontFamily: undefined },
  name: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 2 },
  badge: { fontSize: 11, fontWeight: '700', borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  reason: { color: colors.red, fontSize: 12, marginTop: 8 },
  stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  statL: { fontSize: 10, color: colors.muted },
  statV: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 1 },
  mapBtn: { marginTop: 12, backgroundColor: colors.brand, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  mapBtnText: { color: '#000', fontWeight: '700' },
});
