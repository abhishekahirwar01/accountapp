import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { BASE_URL } from '../../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.85],
  });

  const Box = ({ w, h, r = 6, mb = 0, mt = 0 }) => (
    <Animated.View
      style={{
        width: w,
        height: h,
        borderRadius: r,
        backgroundColor: '#dde3f0',
        marginBottom: mb,
        marginTop: mt,
        opacity,
      }}
    />
  );

  return (
    <View style={styles.clientCard}>
      {/* Header */}
      <View style={styles.clientHeader}>
        <View style={styles.clientIdentity}>
          <Animated.View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#dde3f0',
              opacity,
            }}
          />
          <View style={{ marginLeft: 10, gap: 6 }}>
            <Box w={140} h={14} r={4} />
            <Box w={90} h={10} r={4} />
          </View>
        </View>
        <Box w={72} h={26} r={999} />
      </View>

      {/* Contact panel */}
      <View
        style={[
          styles.contactPanel,
          { backgroundColor: '#f4f6fc', borderColor: '#e3e9fa' },
        ]}
      >
        <Box w={160} h={12} r={4} mb={10} />
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#e3e9fa',
            paddingTop: 8,
            gap: 8,
          }}
        >
          <Box w={200} h={11} r={4} />
          <Box w={130} h={11} r={4} />
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.clientFooter, { marginTop: 12 }]}>
        <Box w={150} h={34} r={999} />
        <Box w={98} h={36} r={10} />
      </View>
    </View>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const badgeConfig = {
  active: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    text: 'Active',
    icon: 'check-circle',
    iconColor: '#059669',
  },
  expired: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    text: 'Expired',
    icon: 'clock-alert',
    iconColor: '#dc2626',
  },
  suspended: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    text: 'Suspended',
    icon: 'cancel',
    iconColor: '#d97706',
  },
  unlimited: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    text: 'Unlimited',
    icon: 'infinity',
    iconColor: '#2563eb',
  },
  unknown: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    text: 'Unknown',
    icon: 'help-circle',
    iconColor: '#6b7280',
  },
  disabled: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    text: 'Disabled',
    icon: 'block-helper',
    iconColor: '#6b7280',
  },
};

const StatusBadge = React.memo(({ validity }) => {
  const status = validity?.status ?? 'unknown';
  const config = badgeConfig[status] || badgeConfig.unknown;

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <Icon
        name={config.icon}
        size={14}
        color={config.iconColor}
        style={styles.badgeIcon}
      />
      <Text
        style={[styles.badgeText, { color: config.color }]}
        numberOfLines={1}
      >
        {config.text}
      </Text>
    </View>
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toValidity = raw => {
  const v = raw?.validity ?? raw?.data ?? raw ?? {};
  const allowed = new Set([
    'active',
    'expired',
    'suspended',
    'unlimited',
    'unknown',
    'disabled',
  ]);
  let status = allowed.has(v?.status) ? v.status : 'unknown';
  const expiresAt = v?.expiresAt ?? null;

  if (status === 'active' && expiresAt) {
    if (new Date(expiresAt).getTime() < Date.now()) status = 'expired';
  }

  return {
    enabled: status === 'active' || status === 'unlimited',
    status,
    expiresAt,
    startAt: v?.startAt ?? null,
  };
};

const emptyValidity = () => ({
  enabled: false,
  status: 'unknown',
  expiresAt: null,
  startAt: null,
});

const fmt = d => {
  if (!d) return '—';
  try {
    const t = new Date(d).getTime();
    if (Number.isNaN(t)) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(t));
    } catch {
      const dt = new Date(t);
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
    }
  } catch {
    return '—';
  }
};

const lower = v => (v ?? '').toString().toLowerCase();
const hasText = (v, q) => lower(v).includes(q);

// ─── Main Component ───────────────────────────────────────────────────────────
const INITIAL_SKELETON_COUNT = 4;

const ClientsValidityManager = ({ onClientClick }) => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // Refs so ListHeader useCallback doesn't need these as dependencies
  const searchRef = useRef('');
  const statusFilterRef = useRef('all');
  const showClearRef = useRef(false);
  const setClearVisible = useRef(null);
  const setFilterChipActive = useRef(null); // FilterChips ka setter

  const handleSearchChange = useCallback(text => {
    searchRef.current = text;
    setSearch(text);
    const hasText = text.length > 0;
    if (hasText !== showClearRef.current) {
      showClearRef.current = hasText;
      setClearVisible.current?.(hasText);
    }
  }, []);

  const handleFilterChange = useCallback(value => {
    statusFilterRef.current = value;
    setStatusFilter(value);
    // FilterChips component ka active state update karo
    setFilterChipActive.current?.(value);
  }, []);

  const handleClear = useCallback(() => {
    searchRef.current = '';
    statusFilterRef.current = 'all';
    showClearRef.current = false;
    setSearch('');
    setStatusFilter('all');
    setClearVisible.current?.(false);
    setFilterChipActive.current?.('all'); // chips reset
    inputRef.current?.clear();
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // validityByClient  → card badge/footer ke liye (progressive update)
  const [validityByClient, setValidityByClient] = useState({});

  // statsValidity → stats bar ke liye (sirf ek baar, jab sab load ho)
  const [statsValidity, setStatsValidity] = useState({});

  const [validityLoadingIds, setValidityLoadingIds] = useState(new Set());

  // Silent buffer — stats ke liye sab collect karo, UI ko bar-bar re-render mat karo
  const validityBufferRef = useRef({});
  const totalClientsRef = useRef(0);
  const resolvedCountRef = useRef(0);
  const inputRef = useRef(null); // TextInput ref for programmatic clear

  // ── Single client validity fetch — card turant update, buffer mein bhi save ──
  const fetchOneValidity = useCallback(async (c, token) => {
    let validity;
    try {
      const vr = await fetch(`${BASE_URL}/api/account/${c._id}/validity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      validity = vr.ok ? toValidity(await vr.json()) : emptyValidity();
    } catch {
      validity = emptyValidity();
    }

    // Card turant update
    setValidityByClient(prev => ({ ...prev, [c._id]: validity }));

    // Stats buffer mein silently store
    validityBufferRef.current[c._id] = validity;

    // Loading shimmer hata do
    setValidityLoadingIds(prev => {
      const next = new Set(prev);
      next.delete(c._id);
      return next;
    });

    // Jab SARE done → stats ek baar set
    resolvedCountRef.current += 1;
    if (resolvedCountRef.current >= totalClientsRef.current) {
      setStatsValidity({ ...validityBufferRef.current });
    }

    return { id: c._id, validity };
  }, []);

  // ── Main fetch ────────────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.clients || [];

      // Reset counters & buffer
      validityBufferRef.current = {};
      totalClientsRef.current = list.length;
      resolvedCountRef.current = 0;

      setClients(list);
      setValidityByClient({});
      setStatsValidity({});
      setValidityLoadingIds(new Set(list.map(c => c._id)));

      // ⚡ Client list turant dikhao
      setIsLoading(false);
      setIsRefreshing(false);

      // ✅ Promise.allSettled — sab ek saath fire, har result aate hi card update
      // Background mein chalta hai, await nahi karte taaki UI block na ho
      Promise.allSettled(list.map(c => fetchOneValidity(c, token)));
    } catch (error) {
      Alert.alert('Error', 'Failed to load clients: ' + error.message);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchOneValidity]);

  useEffect(() => {
    fetchClients();
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchClients();
  }, [fetchClients]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredClients = React.useMemo(() => {
    const q = lower(search.trim());
    return clients.filter(c => {
      const cv = validityByClient[c?._id];
      const matchesSearch =
        q.length === 0 ||
        hasText(c?.clientUsername, q) ||
        hasText(c?.contactName, q) ||
        hasText(c?.email, q) ||
        hasText(c?.slug, q) ||
        hasText(c?.phone, q);
      const matchesFilter =
        statusFilter === 'all' ||
        (statusFilter === 'active' && cv?.status === 'active') ||
        (statusFilter === 'expired' && cv?.status === 'expired') ||
        (statusFilter === 'suspended' && cv?.status === 'suspended') ||
        (statusFilter === 'unlimited' && cv?.status === 'unlimited') ||
        (statusFilter === 'unknown' && (!cv || cv.status === 'unknown'));
      return matchesSearch && matchesFilter;
    });
  }, [clients, search, statusFilter, validityByClient]);

  // ── Stats — statsValidity se (sirf ek baar update jab SARE load ho jaayein) ──
  // statsReady = true hone tak stats mein sirf "Total" dikhega, baaki shimmer
  const statsReady =
    clients.length > 0 && Object.keys(statsValidity).length >= clients.length;

  const stats = React.useMemo(
    () => ({
      total: clients.length,
      active: clients.filter(c => statsValidity[c._id]?.status === 'active')
        .length,
      expired: clients.filter(c => statsValidity[c._id]?.status === 'expired')
        .length,
      suspended: clients.filter(
        c => statsValidity[c._id]?.status === 'suspended',
      ).length,
      unknown: clients.filter(
        c =>
          !statsValidity[c._id] || statsValidity[c._id]?.status === 'unknown',
      ).length,
    }),
    [clients, statsValidity],
  );

  // ── Render client card ────────────────────────────────────────────────────
  const renderClientItem = useCallback(
    ({ item: client }) => {
      const isValidityPending = validityLoadingIds.has(client._id);
      const validity = validityByClient[client._id];
      const displayName = client.clientUsername || 'Unknown Client';
      const primaryInitial = displayName.charAt(0).toUpperCase();
      const contactPerson = client.contactName || 'No contact name';
      const expiryValue = fmt(validity?.expiresAt);
      const isExpired = validity?.status === 'expired';

      return (
        <TouchableOpacity
          style={styles.clientCard}
          onPress={() => onClientClick?.(client)}
          activeOpacity={0.9}
        >
          {/* Header */}
          <View style={styles.clientHeader}>
            <View style={styles.clientIdentity}>
              <View style={styles.clientAvatar}>
                <Text style={styles.clientAvatarText}>{primaryInitial}</Text>
              </View>
              <View style={styles.clientNameWrap}>
                <Text style={styles.clientName}>{displayName}</Text>
              </View>
            </View>

            {/* Badge or small shimmer */}
            {isValidityPending ? (
              <BadgeShimmer />
            ) : (
              <StatusBadge validity={validity} />
            )}
          </View>

          {/* Contact panel */}
          <View style={styles.contactPanel}>
            <View style={styles.contactPersonRow}>
              <Icon name="account-outline" size={16} color="#8b77ff" />
              <Text style={styles.contactName}>{contactPerson}</Text>
            </View>
            <View style={styles.contactInfo}>
              <View style={styles.contactRow}>
                <Icon name="email-outline" size={16} color="#7b8190" />
                <Text style={styles.contactDetail} numberOfLines={1}>
                  {client.email}
                </Text>
              </View>
              {client.phone && (
                <View style={styles.contactRow}>
                  <Icon name="phone-outline" size={16} color="#7b8190" />
                  <Text style={styles.contactDetail}>{client.phone}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.clientFooter}>
            {isValidityPending ? (
              <FooterShimmer />
            ) : (
              <View
                style={[styles.expiryRow, isExpired && styles.expiryRowExpired]}
              >
                <Icon
                  name="calendar-clock"
                  size={14}
                  color={isExpired ? '#b42318' : '#44506a'}
                />
                <Text style={styles.expiryLabel}>Valid Till</Text>
                <Text
                  style={[
                    styles.expiryDate,
                    isExpired && styles.expiryDateExpired,
                  ]}
                >
                  {expiryValue}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => onClientClick?.(client)}
              activeOpacity={0.8}
            >
              <Icon name="shield-account" size={15} color="white" />
              <Text style={styles.manageButtonText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [validityByClient, validityLoadingIds, onClientClick],
  );

  // ── Header ────────────────────────────────────────────────────────────────
  const ListHeader = useCallback(
    () => (
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Icon name="account-group" size={24} color="#8b77ff" />
            <Text style={styles.title}>Client Validity Management</Text>
          </View>
          <Text style={styles.subtitle}>
            Manage account validity for all clients
          </Text>
        </View>

        {/* Stats — jab tak sab load na ho, numbers ki jagah shimmer dikhega */}
        <View style={styles.statsContainer}>
          {[
            {
              bg: '#efebff',
              numColor: '#5b4dcf',
              labelColor: '#5b4dcf',
              num: stats.total,
              label: 'Total',
              alwaysShow: true,
            },
            {
              bg: '#d1fae5',
              numColor: '#065f46',
              labelColor: '#065f46',
              num: stats.active,
              label: 'Active',
            },
            {
              bg: '#fee2e2',
              numColor: '#991b1b',
              labelColor: '#991b1b',
              num: stats.expired,
              label: 'Expired',
            },
            {
              bg: '#fef3c7',
              numColor: '#92400e',
              labelColor: '#92400e',
              num: stats.suspended,
              label: 'Disabled',
            },
            {
              bg: '#f3f4f6',
              numColor: '#374151',
              labelColor: '#374151',
              num: stats.unknown,
              label: 'Unknown',
            },
          ].map(s => (
            <View
              key={s.label}
              style={[styles.statCard, { backgroundColor: s.bg }]}
            >
              {statsReady || s.alwaysShow ? (
                <Text style={[styles.statNumber, { color: s.numColor }]}>
                  {s.num}
                </Text>
              ) : (
                <StatShimmer color={s.numColor} />
              )}
              <Text style={[styles.statLabel, { color: s.labelColor }]}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Search — defaultValue + ref se controlled, ListHeader re-render nahi hoga */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color="#6b7280" />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search clients by name, email, or contact..."
              placeholderTextColor="#9ca3af"
              defaultValue={searchRef.current}
              onChangeText={handleSearchChange}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <ClearButton
              registerSetter={setClearVisible}
              onPress={handleClear}
            />
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterContainer}>
              <Icon name="filter" size={16} color="#6b7280" />
              <Text style={styles.filterLabel}>Filter:</Text>
              <FilterChips
                registerSetter={setFilterChipActive}
                onFilterChange={handleFilterChange}
              />
            </View>

            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [stats, statsReady, handleSearchChange, handleFilterChange, handleClear],
  );

  // ── Empty state ───────────────────────────────────────────────────────────
  const ListEmpty = useCallback(
    () =>
      isLoading ? null : (
        <View style={styles.emptyState}>
          <Icon name="account-group" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No clients found</Text>
          <Text style={styles.emptySubtitle}>
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'No clients available in the system'}
          </Text>
        </View>
      ),
    [isLoading, search, statusFilter],
  );

  // ── Initial loading: show skeleton cards ──────────────────────────────────
  if (isLoading && !isRefreshing) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mini header placeholder */}
        <View style={[styles.header, { paddingBottom: 12 }]}>
          <View style={styles.titleRow}>
            <Icon name="account-group" size={24} color="#8b77ff" />
            <Text style={styles.title}>Client Validity Management</Text>
          </View>
          <Text style={[styles.subtitle, { marginTop: 4 }]}>
            Loading clients...
          </Text>
        </View>
        {Array.from({ length: INITIAL_SKELETON_COUNT }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </ScrollView>
    );
  }

  // ── Main list ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <FlashList
        data={filteredClients}
        renderItem={renderClientItem}
        keyExtractor={item => item._id}
        estimatedItemSize={220}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        drawDistance={400}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

// ─── Inline shimmer helpers (no extra file) ───────────────────────────────────
// ── FilterChips — apna active state khud manage karta hai ──
const FilterChips = ({ registerSetter, onFilterChange }) => {
  const [active, setActive] = useState('all');
  useEffect(() => {
    registerSetter.current = setActive;
    return () => {
      registerSetter.current = null;
    };
  }, []);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.filterChips}>
        {[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'expired', label: 'Expired' },
          { value: 'suspended', label: 'Suspended' },
          { value: 'unlimited', label: 'Unlimited' },
          { value: 'unknown', label: 'Unknown' },
        ].map(filter => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              active === filter.value && styles.filterChipActive,
            ]}
            onPress={() => {
              setActive(filter.value);
              onFilterChange(filter.value);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                active === filter.value && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

// ── ClearButton — apna state khud manage karta hai, parent re-render nahi hoga ──
const ClearButton = ({ registerSetter, onPress }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    registerSetter.current = setVisible;
    return () => {
      registerSetter.current = null;
    };
  }, []);
  if (!visible) return null;
  return (
    <TouchableOpacity onPress={onPress}>
      <Icon name="close-circle" size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
};

const StatShimmer = ({ color }) => {
  const op = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(op, {
          toValue: 0.7,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        width: 28,
        height: 20,
        borderRadius: 4,
        backgroundColor: color,
        opacity: op,
        marginBottom: 2,
      }}
    />
  );
};

const BadgeShimmer = () => {
  const op = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(op, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        width: 72,
        height: 26,
        borderRadius: 999,
        backgroundColor: '#dde3f0',
        opacity: op,
      }}
    />
  );
};

const FooterShimmer = () => {
  const op = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(op, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        width: 150,
        height: 34,
        borderRadius: 999,
        backgroundColor: '#dde3f0',
        opacity: op,
        flex: 1,
        marginRight: 10,
      }}
    />
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  listContent: { padding: 0, paddingBottom: 32 },
  header: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e6eeff',
  },
  titleSection: { marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginLeft: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginLeft: 32 },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    minWidth: 0,
  },
  statNumber: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { fontSize: 9, fontWeight: '500', textAlign: 'center' },
  searchSection: { gap: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e7e6e6',
    borderRadius: 50,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    marginLeft: 8,
    color: '#1f2937',
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  filterContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 6,
    marginRight: 8,
  },
  filterChips: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
  },
  filterChipActive: { backgroundColor: '#8b77ff' },
  filterChipText: { fontSize: 12, fontWeight: '500', color: '#6b7280' },
  filterChipTextActive: { color: 'white' },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  clearButtonText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  clientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e6eeff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    flexShrink: 1,
  },
  clientAvatar: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#efebff',
    borderWidth: 1,
    borderColor: '#d8d0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: { fontSize: 16, fontWeight: '700', color: '#6d59e8' },
  clientNameWrap: { flex: 1, marginLeft: 10 },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  contactPanel: {
    borderWidth: 1,
    borderColor: '#e3e9fa',
    borderRadius: 12,
    backgroundColor: '#f8faff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contactPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  contactInfo: { borderTopWidth: 1, borderTopColor: '#e3e9fa', paddingTop: 8 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  contactDetail: { fontSize: 13, color: '#6b7280', marginLeft: 8, flex: 1 },
  clientFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    borderRadius: 999,
    backgroundColor: '#f3f6ff',
    borderWidth: 1,
    borderColor: '#d9e3ff',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  expiryRowExpired: { backgroundColor: '#fef3f2', borderColor: '#fecdca' },
  expiryLabel: {
    fontSize: 11,
    color: '#44506a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  expiryDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
    marginLeft: 6,
  },
  expiryDateExpired: { color: '#b42318' },
  manageButton: {
    backgroundColor: '#8b77ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 98,
  },
  manageButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  badgeIcon: { marginRight: 5 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});

export default React.memo(ClientsValidityManager);
