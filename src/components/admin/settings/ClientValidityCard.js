import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../../hooks/useToast';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BASE_URL } from '../../../config';

// --- Improved Helper Components ---

function Badge({ text, variant = 'outline' }) {
  const themes = {
    outline: { bg: '#f1f5f9', border: '#e2e8f0', text: '#64748b' },
    success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    disabled: { bg: '#f8fafc', border: '#cbd5e1', text: '#475569' },
  };
  const theme = themes[variant] || themes.outline;

  return (
    <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <Text style={[styles.badgeText, { color: theme.text }]}>{text.toUpperCase()}</Text>
    </View>
  );
}

function StatCard({ icon, label, value, color = '#3b82f6' }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}10` }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

export function ClientValidityCard({ clientId, onChanged }) {
  const baseURL = BASE_URL;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validity, setValidity] = useState(null);
  const [draft, setDraft] = useState({});
  const [exactDate, setExactDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getToken = useCallback(async () => {
    return await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${baseURL}/api/account/${clientId}/validity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.status === 404) {
        setValidity({ status: 'unknown', expiresAt: null });
      } else {
        const v = json?.validity ?? {};
        setValidity({
          status: v.status || 'unknown',
          expiresAt: v.expiresAt,
        });
      }
    } catch (e) {
      Alert.alert('Load error', e.message);
    } finally {
      setLoading(false);
    }
  }, [baseURL, clientId, toast, getToken]);

  useEffect(() => { load(); }, [load]);
  
  useEffect(() => { 
    if (validity) setDraft({ enabled: validity.status !== 'disabled' }); 
  }, [validity]);

  const expiresAtDate = useMemo(() => validity?.expiresAt ? new Date(validity.expiresAt) : null, [validity]);
  
  const daysLeft = useMemo(() => {
    if (!expiresAtDate) return null;
    const diff = Math.ceil((expiresAtDate - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [expiresAtDate]);

  // Logic to determine if save button should be active
  const hasPending = useMemo(() => {
    const statusChanged = draft.enabled !== (validity?.status !== 'disabled');
    const dateChanged = !!exactDate;
    return statusChanged || dateChanged;
  }, [draft.enabled, validity, exactDate]);

  async function commitChanges() {
    if (!hasPending) return;
    setSaving(true);
    try {
      const token = await getToken();
      
      // Handle Status Change
      if (draft.enabled !== (validity?.status !== 'disabled')) {
        const endpoint = draft.enabled ? '' : '/disable';
        const method = draft.enabled ? 'PUT' : 'PATCH';
        const body = draft.enabled ? JSON.stringify({ years: 0, months: 0, days: 1 }) : null;
        await fetch(`${baseURL}/api/account/${clientId}/validity${endpoint}`, {
          method,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body
        });
      }

      // Handle Date Change
      if (exactDate) {
         const target = new Date(`${exactDate}T00:00:00`);
         const days = Math.max(1, Math.ceil((target - new Date()) / (1000 * 60 * 60 * 24)));
         await fetch(`${baseURL}/api/account/${clientId}/validity`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ years: 0, months: 0, days, startAt: new Date().toISOString() }),
         });
      }

      await load();
      setExactDate('');
      Alert.alert('Success', 'Changes applied');
      onChanged?.();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setExactDate(date.toISOString().split('T')[0]);
    }
  };

  const resetChanges = () => {
    setDraft({ enabled: validity.status !== 'disabled' });
    setExactDate('');
  };

  return (
    <View style={styles.card}>
      {/* CARD HEADER */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Icon name="shield-check-outline" size={22} color="#2563eb" />
          <Text style={styles.headerTitle}>Account Validity</Text>
        </View>
        <Badge 
          text={validity?.status || '...'} 
          variant={validity?.status === 'active' ? 'success' : 'outline'} 
        />
      </View>

      <ScrollView scrollEnabled={false}>
        {/* STATS ROW */}
        <View style={styles.statsRow}>
          <StatCard 
            icon="calendar-range" 
            label="Expiry" 
            value={expiresAtDate ? expiresAtDate.toLocaleDateString() : 'N/A'} 
          />
          <StatCard 
            icon="clock-outline" 
            label="Remaining" 
            value={daysLeft !== null ? `${daysLeft}d` : '0d'} 
            color="#f59e0b"
          />
        </View>

        {/* TOGGLE SECTION */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionLabel}>Access Switch</Text>
              <Text style={styles.sectionSub}>Enable or disable user access</Text>
            </View>
            <Switch
              value={draft.enabled}
              onValueChange={(v) => setDraft(d => ({ ...d, enabled: v }))}
              trackColor={{ false: '#cbd5e1', true: '#10b981' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* DATE PICKER */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Override Expiration</Text>
          <TouchableOpacity 
            style={styles.dateSelector} 
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar-edit" size={18} color="#64748b" />
            <Text style={[styles.dateValue, !exactDate && styles.placeholder]}>
              {exactDate ? `Target: ${exactDate}` : 'Select a specific date'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FIXED FOOTER - ALWAYS VISIBLE */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.btnReset} 
          onPress={resetChanges}
          disabled={!hasPending || saving}
        >
          <Text style={[styles.btnResetText, !hasPending && styles.textDisabled]}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btnSave, (!hasPending || saving) && styles.btnSaveDisabled]} 
          onPress={commitChanges}
          disabled={!hasPending || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.btnSaveText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 10,
  },
  statIconContainer: {
    padding: 6,
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  sectionSub: {
    fontSize: 12,
    color: '#94a3b8',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    gap: 10,
  },
  dateValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  placeholder: {
    color: '#94a3b8',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    gap: 12,
  },
  btnSave: {
    flex: 2,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveDisabled: {
    backgroundColor: '#cbd5e1',
  },
  btnSaveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnReset: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnResetText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  textDisabled: {
    color: '#94a3b8',
  },
});

export default ClientValidityCard;