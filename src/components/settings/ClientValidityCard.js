import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../../hooks/useToast';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BASE_URL } from '../../../config';

// Helper functions
function addToDate(base, amount, unit) {
  const d = new Date(base);
  if (unit === 'days') d.setDate(d.getDate() + amount);
  if (unit === 'months') d.setMonth(d.getMonth() + amount);
  if (unit === 'years') d.setFullYear(d.getFullYear() + amount);
  return d;
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    // Prefer Intl formatting (date + time)
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch (error) {
    // Manual fallback formatting
    const year = d.getFullYear();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${month} ${day}, ${year} ${hours}:${minutes}`;
  }
}

// Use UTC-safe day difference to avoid timezone shifts
function diffInDaysUTC(a, b) {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.ceil((utcB - utcA) / (1000 * 60 * 60 * 24));
}

function formatDateForInput(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper Components
function Badge({ text, variant = 'outline' }) {
  const variantStyles = {
    outline: {
      backgroundColor: 'transparent',
      borderColor: '#d1d5db',
      textColor: '#6b7280',
    },
    success: {
      backgroundColor: '#059669',
      borderColor: '#059669',
      textColor: '#ffffff',
    },
    error: {
      backgroundColor: '#dc2626',
      borderColor: '#dc2626',
      textColor: '#ffffff',
    },
    disabled: {
      backgroundColor: '#4b5563',
      borderColor: '#4b5563',
      textColor: '#ffffff',
    },
  };

  const style = variantStyles[variant] || variantStyles.outline;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
        },
      ]}
    >
      <Text style={[styles.badgeText, { color: style.textColor }]}>{text}</Text>
    </View>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={16} color="#6b7280" />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function StatusCard({ enabled, onToggle, disabled }) {
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusContent}>
        <View style={styles.statusInfo}>
          <Text style={styles.statusLabel}>Account Status</Text>
          <View style={styles.statusRow}>
            <Icon
              name={enabled ? 'shield-check' : 'shield-off'}
              size={16}
              color={enabled ? '#059669' : '#6b7280'}
            />
            <Text style={styles.statusText}>
              {enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: '#d1d5db', true: '#10b981' }}
          thumbColor={enabled ? '#ffffff' : '#ffffff'}
        />
      </View>
    </View>
  );
}

function WarningModal({
  visible,
  onClose,
  onConfirm,
  extendDirty,
  exactDirty,
}) {
  let description = '';
  if (extendDirty && exactDirty) {
    description =
      "You changed Extend and Exact Expiry inputs but didn't click their buttons.";
  } else if (extendDirty) {
    description =
      "You changed the Extend inputs but didn't click the Extend button.";
  } else {
    description =
      "You picked an Exact Expiry date but didn't click Save Exact Date.";
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Discard unstaged changes?</Text>
          <Text style={styles.modalDescription}>
            {description} These changes aren't staged and will be discarded if
            you continue.
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.button, styles.outlineButton]}
              onPress={onClose}
            >
              <Text style={styles.outlineButtonText}>Go back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onConfirm}
            >
              <Text style={styles.primaryButtonText}>Discard & Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Main Component
export function ClientValidityCard({ clientId, onChanged }) {
  const baseURL = BASE_URL;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validity, setValidity] = useState(null);
  const [draft, setDraft] = useState({});

  const [exactDate, setExactDate] = useState('');
  const [exactDirty, setExactDirty] = useState(false);
  const [warnUnsavedOpen, setWarnUnsavedOpen] = useState(false);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Get token from AsyncStorage (try both 'token' and 'userToken')
  const getToken = useCallback(async () => {
    try {
      const t1 = await AsyncStorage.getItem('token');
      if (t1) return t1;
      const t2 = await AsyncStorage.getItem('userToken');
      return t2;
    } catch (error) {
      console.error('Error getting token from AsyncStorage:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!validity) return;
    setDraft({ enabled: !(validity.status === 'disabled') });
  }, [validity]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not found.');
      }

      const res = await fetch(`${baseURL}/api/account/${clientId}/validity`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 404) {
        setValidity({
          isActive: false,
          status: 'unknown',
          expiresAt: null,
          startAt: null,
        });
        return;
      }

      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.message || 'Failed to fetch validity.');

      const v = json?.validity ?? {};
      const status = [
        'active',
        'expired',
        'suspended',
        'unlimited',
        'unknown',
        'disabled',
      ].includes(v?.status)
        ? v.status
        : 'unknown';

      setValidity({
        isActive: status === 'active' || status === 'unlimited',
        status,
        expiresAt: v?.expiresAt ?? null,
        startAt: v?.startAt ?? null,
        updatedAt: v?.updatedAt,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: "Couldn't load validity",
        description: e instanceof Error ? e.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [baseURL, clientId, toast, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  // Robust parsing: handle "YYYY-MM-DD" (no time) specially to avoid timezone shifts
  const expiresAtDate = useMemo(() => {
    if (!validity?.expiresAt) return null;
    const raw = validity.expiresAt;
    let date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) {
      // treat as local midnight
      date = new Date(`${raw}T00:00:00`);
    } else {
      date = new Date(raw);
    }
    if (isNaN(date.getTime())) {
      console.warn('Invalid validity.expiresAt from server:', raw);
      return null;
    }
    return date;
  }, [validity]);

  const now = useMemo(() => new Date(), []);

  const daysLeft = useMemo(() => {
    if (!expiresAtDate) return null;
    // Use UTC-safe calculation so timezone doesn't change day count
    const days = diffInDaysUTC(now, expiresAtDate);
    return days >= 0 ? days : 0;
  }, [expiresAtDate, now]);

  const expired = expiresAtDate ? expiresAtDate.getTime() <= Date.now() : false;
  const status =
    validity?.status ?? (validity?.isActive ? 'active' : 'unknown');
  const isDisabled = status === 'disabled';

  const currentlyEnabled = !(validity?.status === 'disabled');
  const uiEnabled = draft.enabled ?? currentlyEnabled;
  const hasPending = draft.enabled !== undefined || !!draft.exactDate;

  async function commitChanges() {
    try {
      setSaving(true);
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not found.');
      }

      // 1) Status change
      const currentlyEnabled = !(validity?.status === 'disabled');
      if (draft.enabled !== undefined && draft.enabled !== currentlyEnabled) {
        if (!draft.enabled) {
          // disable
          const r = await fetch(
            `${baseURL}/api/account/${clientId}/validity/disable`,
            {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const json = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(json?.message || 'Failed to disable.');
        } else {
          // enable (if no expiry change queued, give a minimal 1-day validity)
          if (!draft.exactDate) {
            const r = await fetch(
              `${baseURL}/api/account/${clientId}/validity`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ years: 0, months: 0, days: 1 }),
              },
            );
            const json = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(json?.message || 'Failed to enable.');
          }
        }
      }

      // 2) Expiry change (exactDate)
      if (draft.exactDate) {
        const start = new Date();
        // ensure correct parsing: YYYY-MM-DD -> treat as local midnight
        const target = /^\d{4}-\d{2}-\d{2}$/.test(draft.exactDate)
          ? new Date(`${draft.exactDate}T00:00:00`)
          : new Date(draft.exactDate);
        const ms = target.getTime() - start.getTime();
        const days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
        const r = await fetch(`${baseURL}/api/account/${clientId}/validity`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            years: 0,
            months: 0,
            days,
            startAt: start.toISOString(),
          }),
        });
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json?.message || 'Failed to set expiry.');
      }

      // reload from server, clear draft, notify parent
      await load();
      setDraft({});
      setExactDate('');
      setExactDirty(false);
      toast({ title: 'Changes saved' });
      await onChanged?.();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  function resetDraft() {
    setDraft({});
    setExactDate('');
    setExactDirty(false);
  }

  async function handleSave() {
    // warn if inputs changed but not staged
    if (exactDirty) {
      setWarnUnsavedOpen(true);
      return;
    }
    await commitChanges();
    setExactDate('');
  }

  function getStatusBadge() {
    if (loading) {
      return <Badge text="Loading…" variant="outline" />;
    }

    switch (status) {
      case 'active':
        return <Badge text="Active" variant="success" />;
      case 'expired':
        return <Badge text="Expired" variant="error" />;
      case 'disabled':
        return <Badge text="Disabled" variant="disabled" />;
      default:
        return <Badge text={status || 'Unknown'} variant="outline" />;
    }
  }

  // const handleSaveExactDate = () => {
  //   setDraft(d => ({ ...d, exactDate }));
  //   setExactDirty(false);
  // };

  // Date picker handlers
  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      const formattedDate = formatDateForInput(date);
      setExactDate(formattedDate);
      setExactDirty(true);
    }
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  // Debug logging (kept minimal)
  useEffect(() => {
    if (validity) {
      console.log('Validity data:', {
        raw: validity.expiresAt,
        parsed: expiresAtDate,
        daysLeft,
        status,
      });
    }
  }, [validity, expiresAtDate, daysLeft, status]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Icon name="star" size={20} color="#2563eb" />
          <Text style={styles.cardTitle}>Account Validity</Text>
        </View>
        {getStatusBadge()}
      </View>

      <ScrollView style={styles.cardContent}>
        {/* Top stats */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="calendar"
            label="Expires On"
            value={loading ? '—' : fmtDate(expiresAtDate)}
          />
          <StatCard
            icon="clock"
            label="Days Left"
            value={loading ? '—' : expiresAtDate ? daysLeft : '—'}
          />
          <StatusCard
            enabled={uiEnabled}
            onToggle={v => setDraft(d => ({ ...d, enabled: v }))}
            disabled={loading || saving}
          />
        </View>

        <View style={styles.separator} />

        {/* Exact date setter */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Set Exact Expiry</Text>
          <View style={styles.exactDateRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Expiry date</Text>
              <TouchableOpacity onPress={showDatepicker}>
                <View style={styles.dateInput}>
                  <Text
                    style={[
                      styles.dateInputText,
                      !exactDate && styles.placeholderText,
                    ]}
                  >
                    {exactDate || 'Select date'}
                  </Text>
                  <Icon name="calendar" size={20} color="#6b7280" />
                </View>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>
            {/* <TouchableOpacity
              style={[
                styles.button,
                styles.outlineButton,
                (!exactDate || loading || saving) && styles.buttonDisabled,
              ]}
              onPress={handleSaveExactDate}
              disabled={!exactDate || loading || saving}
            >
              {saving && <ActivityIndicator size="small" color="#6b7280" />}
              <Text style={styles.outlineButtonText}>Save Exact Date</Text>
            </TouchableOpacity> */}
          </View>
        </View>

        <View style={styles.separator} />

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={resetDraft}
            disabled={saving}
          >
            <Text style={styles.outlineButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              (!hasPending || saving) && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasPending || saving}
          >
            {saving && <ActivityIndicator size="small" color="#ffffff" />}
            <Text style={styles.primaryButtonText}>Save changes</Text>
          </TouchableOpacity>
        </View>

        {/* Warning Modal */}
        <WarningModal
          visible={warnUnsavedOpen}
          onClose={() => setWarnUnsavedOpen(false)}
          onConfirm={async () => {
            setWarnUnsavedOpen(false);
            setExactDirty(false);
            await commitChanges();
            setExactDate('');
          }}
          extendDirty={false}
          exactDirty={exactDirty}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ebeef1ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    // margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  cardContent: {
    padding: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  separator: {
    height: 2,
    backgroundColor: '#cccfd6ff',
    marginVertical: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 18,
    color: '#000000ff',
    marginBottom: 12,
  },
  exactDateRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#000000ff',
    marginBottom: 4,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
  },
  dateInputText: {
    fontSize: 14,
    color: '#1f2937',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  outlineButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
});
export default ClientValidityCard;
