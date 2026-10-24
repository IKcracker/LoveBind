import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Love } from '@/components/auth-screens';

function iso(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function BirthDatePicker({ value, onChange, error }: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const today = new Date();
  const max = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const min = new Date(today.getFullYear() - 115, today.getMonth(), today.getDate());
  const parsed = value ? new Date(value + 'T12:00:00') : max;
  const current = Number.isNaN(parsed.getTime()) ? max : parsed;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(current);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Your date of birth</Text>

      {Platform.OS === 'web' ? (
        // The native datetime picker is not supported on web. Keep the date editable.
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Love.mutedSoft}
          accessibilityLabel="Date of birth, year-month-day"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          style={styles.webInput}
        />
      ) : (
        <Pressable
          onPress={() => { setDraft(current); setOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel="Choose your date of birth"
          style={styles.button}
        >
          <Text style={[styles.date, !value && styles.placeholder]}>{value || 'Choose date of birth'}</Text>
          <Text style={styles.calendar}>▦</Text>
        </Pressable>
      )}

      <Text style={styles.note}>You must be at least 18. Your birth date stays private.</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={current}
          mode="date"
          display="default"
          maximumDate={max}
          minimumDate={min}
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) onChange(iso(date));
          }}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={styles.overlay}>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Your birth date</Text>
              {/* The app uses a light modal even when the device uses dark mode.
                  Force dark picker text to prevent white-on-white spinner values. */}
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                themeVariant="light"
                textColor={Love.ink}
                style={styles.spinner}
                maximumDate={max}
                minimumDate={min}
                onChange={(_, date) => { if (date) setDraft(date); }}
              />
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
                  <Text style={styles.link}>Cancel</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => { onChange(iso(draft)); setOpen(false); }}>
                  <Text style={styles.link}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: Love.ink },
  button: {
    minHeight: 58, borderWidth: 1, borderColor: Love.line, borderRadius: 10,
    backgroundColor: Love.white, paddingHorizontal: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  webInput: {
    minHeight: 58, borderWidth: 1, borderColor: Love.line, borderRadius: 10,
    backgroundColor: Love.white, color: Love.ink, fontSize: 16, paddingHorizontal: 16,
  },
  date: { color: Love.ink, fontSize: 16 },
  placeholder: { color: Love.mutedSoft },
  calendar: { fontSize: 26, color: Love.wine },
  note: { fontSize: 12, color: Love.muted, lineHeight: 19 },
  error: { fontSize: 12, color: Love.error },
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.4)', padding: 25 },
  panel: { backgroundColor: Love.white, borderRadius: 18, padding: 20 },
  panelTitle: { fontSize: 20, fontWeight: '700', color: Love.ink },
  spinner: { height: 210, backgroundColor: Love.white },
  actions: { flexDirection: 'row', justifyContent: 'space-between', padding: 15 },
  link: { color: Love.wine, fontWeight: '700', fontSize: 16 },
});
