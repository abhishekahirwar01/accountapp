import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

const TransactionForm = ({ onFormSubmit }) => {
  const [form, setForm] = useState({ date: '', type: 'sales', partyName: '', amount: '', narration: '' });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => onFormSubmit?.(form);

  return (
    <View style={styles.wrapper}>
      <Field label="Date">
        <TextInput placeholder="YYYY-MM-DD" style={styles.input} value={form.date} onChangeText={(t) => update('date', t)} />
      </Field>

      <Field label="Type">
        <TextInput placeholder="sales / purchases / receipt / payment / journal" style={styles.input} value={form.type} onChangeText={(t) => update('type', t)} />
      </Field>

      <Field label="Party Name">
        <TextInput placeholder="Enter party" style={styles.input} value={form.partyName} onChangeText={(t) => update('partyName', t)} />
      </Field>

      <Field label="Amount">
        <TextInput placeholder="e.g., 12000" keyboardType="numeric" style={styles.input} value={form.amount} onChangeText={(t) => update('amount', t)} />
      </Field>

      <Field label="Narration">
        <TextInput placeholder="Optional details" style={[styles.input, { height: 80 }]} multiline value={form.narration} onChangeText={(t) => update('narration', t)} />
      </Field>

      <TouchableOpacity onPress={submit} activeOpacity={0.85} style={[styles.btn, styles.btnSolid]}>
        <Text style={{ color: 'white', fontWeight: '700' }}>Save</Text>
      </TouchableOpacity>
    </View>
  );
};

const Field = ({ label, children }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1,
  },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' },
  btnSolid: { backgroundColor: '#0f62fe' },
});

export default TransactionForm;
