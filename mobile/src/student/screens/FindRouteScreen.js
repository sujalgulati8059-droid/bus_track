import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStops, searchBuses } from '../api/studentApi';
import PickerModal from '../components/PickerModal';
import BusCard from '../components/BusCard';
import { colors } from '../utils/theme';

const STOP_KEY = 'findRouteStop';

// "Which bus can I take from my stop?" - uses the same /api/search the website uses.
export default function FindRouteScreen({ onViewOnMap }) {
  const [stops, setStops] = useState([]);
  const [stop, setStop] = useState('');
  const [dir, setDir] = useState('to'); // 'to' = my stop -> CU, 'from' = CU -> my stop
  const [picker, setPicker] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getStops().then(setStops).catch(() => {});
    AsyncStorage.getItem(STOP_KEY).then((s) => { if (s) setStop(s); });
  }, []);

  const search = async (theStop = stop, theDir = dir) => {
    if (!theStop) return setError('Pick your stop first');
    setLoading(true); setError(''); setResults(null);
    try {
      const r = theDir === 'to' ? await searchBuses(theStop, 'CU') : await searchBuses('CU', theStop);
      setResults(r);
    } catch (e) {
      setError(e?.response?.data?.error || 'Cannot reach server');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (stop) search(stop, dir); /* eslint-disable-next-line */ }, [dir]);

  const pickStop = (s) => {
    setStop(s); setPicker(false);
    AsyncStorage.setItem(STOP_KEY, s);
    search(s, dir);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.head}>
        <Text style={styles.label}>My stop</Text>
        <TouchableOpacity style={styles.select} onPress={() => setPicker(true)}>
          <Text style={stop ? styles.selectText : styles.placeholder}>{stop || 'Choose your stop...'}</Text>
        </TouchableOpacity>
        <View style={styles.dirRow}>
          {[['to', 'Stop to CU'], ['from', 'CU to Stop']].map(([k, l]) => (
            <TouchableOpacity key={k} style={[styles.dirBtn, dir === k && styles.dirOn]} onPress={() => setDir(k)}>
              <Text style={[styles.dirText, dir === k && { color: '#000' }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 30 }} color={colors.brandDark} />}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {results && !loading && (
        <FlatList
          data={results}
          keyExtractor={(b) => b.routeNo}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={<Text style={styles.count}>{results.length ? `${results.length} bus${results.length > 1 ? 'es' : ''} found` : ''}</Text>}
          ListEmptyComponent={<Text style={styles.empty}>No direct bus found for this stop.{'\n'}Try the other direction or a nearby stop.</Text>}
          renderItem={({ item }) => <BusCard bus={item} onViewOnMap={onViewOnMap} />}
        />
      )}
      {!results && !loading && !error && <Text style={styles.empty}>Choose your stop to see which buses serve it.</Text>}

      <PickerModal visible={picker} title="Choose your stop" items={stops} onClose={() => setPicker(false)} onSelect={pickStop} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  label: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  select: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 13, marginTop: 6 },
  selectText: { fontSize: 15, color: colors.ink, fontWeight: '600' },
  placeholder: { fontSize: 15, color: '#9ca3af' },
  dirRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  dirBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  dirOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  dirText: { fontWeight: '700', color: colors.muted },
  count: { color: colors.muted, marginBottom: 10, fontSize: 13 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, paddingHorizontal: 30, lineHeight: 20 },
  error: { textAlign: 'center', color: colors.red, marginTop: 20 },
});
