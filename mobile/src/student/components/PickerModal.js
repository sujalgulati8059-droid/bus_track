import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../utils/theme';

// Searchable full-screen list picker (React Native has no <select>).
// items: string[] or [{ value, label }]
export default function PickerModal({ visible, title, items, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const norm = useMemo(
    () => (items || []).map((i) => (typeof i === 'string' ? { value: i, label: i } : i)),
    [items]
  );
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? norm.filter((i) => i.label.toLowerCase().includes(t)) : norm;
  }, [norm, q]);

  const close = () => { setQ(''); onClose(); };
  const pick = (v) => { setQ(''); onSelect(v); };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.wrap}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={close}><Text style={styles.close}>Close</Text></TouchableOpacity>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search..."
          placeholderTextColor="#9ca3af"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
        />
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.value}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.empty}>Nothing found</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => pick(item.value)}>
              <Text style={styles.rowText}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: colors.ink },
  close: { color: colors.brandDark, fontWeight: '600', fontSize: 15 },
  search: { color: '#0f172a', borderWidth: 1, borderColor: colors.line, borderRadius: 10, marginHorizontal: 16, marginBottom: 8, padding: 12, fontSize: 16 },
  row: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowText: { fontSize: 15, color: colors.ink },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 30 },
});
