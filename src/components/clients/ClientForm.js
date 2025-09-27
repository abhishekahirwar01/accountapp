import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch as RNSwitch,
  StyleSheet,
  Button,
} from 'react-native';

export default function ClientForm({
  client,
  onSubmit,
  onCancel,
  hideAdvanced = false,
}) {
  const [contactName, setContactName] = useState(client?.contactName || '');
  const [clientUsername, setClientUsername] = useState(
    client?.clientUsername || '',
  );
  const [email, setEmail] = useState(client?.email || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [password, setPassword] = useState('');
  const [maxCompanies, setMaxCompanies] = useState(client?.maxCompanies || 5);
  const [maxUsers, setMaxUsers] = useState(client?.maxUsers || 10);
  const [canSendInvoiceEmail, setCanSendInvoiceEmail] = useState(
    client?.canSendInvoiceEmail ?? false,
  );
  const [canSendInvoiceWhatsapp, setCanSendInvoiceWhatsapp] = useState(
    client?.canSendInvoiceWhatsapp ?? false,
  );
  const [validityAmount, setValidityAmount] = useState(30);
  const [validityUnit, setValidityUnit] = useState('days');
  const [eyeOpen, setEyeOpen] = useState(false);

  // Preview expiry date (create mode only)
  const expiryPreview = useMemo(() => {
    if (client) return null;
    const d = new Date();
    if (validityUnit === 'days')
      d.setDate(d.getDate() + Number(validityAmount));
    if (validityUnit === 'months')
      d.setMonth(d.getMonth() + Number(validityAmount));
    if (validityUnit === 'years')
      d.setFullYear(d.getFullYear() + Number(validityAmount));
    return d.toDateString();
  }, [validityAmount, validityUnit, client]);

  const handleSubmit = () => {
    // Just UI, no backend
    const formData = {
      contactName,
      clientUsername,
      email,
      phone,
      password,
      maxCompanies,
      maxUsers,
      canSendInvoiceEmail,
      canSendInvoiceWhatsapp,
      validityAmount,
      validityUnit,
    };
    console.log('Form submitted:', formData);
    if (onSubmit) onSubmit(formData);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.section}>
        <Text style={styles.label}>Contact Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. John Doe"
          value={contactName}
          onChangeText={setContactName}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={[styles.input, client ? { backgroundColor: '#eee' } : null]}
          placeholder="e.g. johndoe"
          value={clientUsername}
          editable={!client}
          onChangeText={text =>
            setClientUsername(text.toLowerCase().replace(/\s+/g, ''))
          }
        />
      </View>

      {!client && (
        <View style={styles.section}>
          <Text style={styles.label}>Password</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••••"
              secureTextEntry={!eyeOpen}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setEyeOpen(!eyeOpen)}
              style={{ marginLeft: 8 }}
            >
              <Text style={{ color: 'blue' }}>{eyeOpen ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="contact@company.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="+1 (555) 123-4567"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </View>

      {!client && !hideAdvanced && (
        <View style={styles.section}>
          <Text style={styles.label}>Account Validity</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              keyboardType="number-pad"
              placeholder="e.g. 30"
              value={validityAmount.toString()}
              onChangeText={v => setValidityAmount(Number(v))}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Unit (days, months, years)"
              value={validityUnit}
              onChangeText={setValidityUnit}
            />
          </View>
          {expiryPreview && (
            <Text style={{ marginTop: 4, fontSize: 12, color: 'gray' }}>
              This account will expire on {expiryPreview}.
            </Text>
          )}
        </View>
      )}

      {!hideAdvanced && (
        <>
          <View style={styles.section}>
            <Text style={styles.label}>Max Companies</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={maxCompanies.toString()}
              onChangeText={v => setMaxCompanies(Number(v))}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Max Users</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={maxUsers.toString()}
              onChangeText={v => setMaxUsers(Number(v))}
            />
          </View>

          <View style={styles.sectionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Send Invoice via Email</Text>
            </View>
            <RNSwitch
              value={canSendInvoiceEmail}
              onValueChange={setCanSendInvoiceEmail}
            />
          </View>

          <View style={styles.sectionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Send Invoice via WhatsApp</Text>
            </View>
            <RNSwitch
              value={canSendInvoiceWhatsapp}
              onValueChange={setCanSendInvoiceWhatsapp}
            />
          </View>
        </>
      )}

      <View
        style={{
          marginTop: 20,
          flexDirection: 'row',
          justifyContent: 'flex-end',
        }}
      >
        <View style={{ marginRight: 8 }}>
          <Button title="Cancel" onPress={onCancel} />
        </View>
        <Button
          title={client ? 'Save Changes' : 'Create Client'}
          onPress={handleSubmit}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  section: { marginBottom: 16 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: { fontWeight: 'bold', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
});
