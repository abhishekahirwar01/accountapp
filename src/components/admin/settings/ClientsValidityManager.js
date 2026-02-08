import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { BASE_URL } from '../../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ClientsValidityManager = ({ onClientClick }) => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [validityByClient, setValidityByClient] = useState({});
  const [isValidityLoading, setIsValidityLoading] = useState(false);

  const lower = v => (v ?? '').toString().toLowerCase();
  const hasText = (v, q) => lower(v).includes(q);

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

    // Mobile में भी web जैसा logic: अगर expiry date निकल गई है तो "expired" दिखाओ
    if (status === 'active' && expiresAt) {
      const expiryDate = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      if (expiryDate < now) {
        status = 'expired';
      }
    }

    return {
      enabled: status === 'active' || status === 'unlimited',
      status,
      expiresAt: expiresAt,
      startAt: v?.startAt ?? null,
    };
  };

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      const list = Array.isArray(data) ? data : data.clients || [];
      
      setClients(list);

      setIsValidityLoading(true);
      const results = await Promise.allSettled(
        list.map(async c => {
          try {
            const vr = await fetch(
              `${BASE_URL}/api/account/${c._id}/validity`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            if (vr.status === 404) {
              console.warn(`⚠️ Validity not found for ${c.clientUsername}`);
              return { id: c._id, validity: null };
            }

            if (!vr.ok) {
              const body = await vr.text().catch(() => '');
              console.error(
                `❌ GET validity ${vr.status} for ${c.clientUsername}: ${body}`,
              );
              throw new Error(
                `GET validity ${vr.status} for ${c.clientUsername}: ${body}`,
              );
            }

            const json = await vr.json();
           
            return { id: c._id, validity: toValidity(json) };
          } catch (error) {
            console.warn(
              `Failed to fetch validity for ${c.clientUsername}:`,
              error,
            );
            return { id: c._id, validity: null };
          }
        }),
      );

      const map = {};
      results.forEach(r => {
        if (r.status === 'fulfilled') {
          map[r.value.id] = r.value.validity ?? {
            enabled: false,
            status: 'unknown',
            expiresAt: null,
            startAt: null,
          };
        }
      });


      setValidityByClient(map);
      setIsValidityLoading(false);
    } catch (error) {
      console.error('❌ Error loading clients:', error);
      Alert.alert('Error', 'Failed to load clients: ' + error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchClients();
  };

  const filteredClients = clients.filter(c => {
    const q = lower(search.trim());
    const clientValidity = validityByClient[c?._id];

    const matchesSearch =
      q.length === 0 ||
      hasText(c?.clientUsername, q) ||
      hasText(c?.contactName, q) ||
      hasText(c?.email, q) ||
      hasText(c?.slug, q) ||
      hasText(c?.phone, q);

    const matchesFilter =
      statusFilter === 'all' ||
      (statusFilter === 'active' && clientValidity?.status === 'active') ||
      (statusFilter === 'expired' && clientValidity?.status === 'expired') ||
      (statusFilter === 'suspended' &&
        clientValidity?.status === 'suspended') ||
      (statusFilter === 'unlimited' &&
        clientValidity?.status === 'unlimited') ||
      (statusFilter === 'unknown' &&
        (!clientValidity || clientValidity.status === 'unknown'));

    return matchesSearch && matchesFilter;
  });

  const StatusBadge = ({ validity }) => {
    const status = validity?.status ?? 'unknown';

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

    const config = badgeConfig[status] || badgeConfig.unknown;

    return (
      <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
        <Icon
          name={config.icon}
          size={14}
          color={config.iconColor}
          style={styles.badgeIcon}
        />
        <Text style={[styles.badgeText, { color: config.color }]}>
          {config.text}
        </Text>
      </View>
    );
  };

  const fmt = d => {
    if (!d) return '—';
    try {
      const t = new Date(d).getTime();
      if (Number.isNaN(t)) return '—';

      // Fallback date formatting के लिए (Android पर Intl support issue)
      try {
        return new Intl.DateTimeFormat(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).format(new Date(t));
      } catch (intlError) {
        // Intl fail होने पर simple format use करो
        console.warn('Intl.DateTimeFormat not supported, using fallback');
        const date = new Date(t);
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
        return `${
          months[date.getMonth()]
        } ${date.getDate()}, ${date.getFullYear()}`;
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return '—';
    }
  };

  const handleManage = client => {
    onClientClick?.(client);
  };

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
        <Text style={[styles.statNumber, { color: '#1e40af' }]}>
          {clients.length}
        </Text>
        <Text style={[styles.statLabel, { color: '#1e40af' }]}>
          Total Clients
        </Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
        <Text style={[styles.statNumber, { color: '#065f46' }]}>
          {
            clients.filter(c => validityByClient[c._id]?.status === 'active')
              .length
          }
        </Text>
        <Text style={[styles.statLabel, { color: '#065f46' }]}>Active</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
        <Text style={[styles.statNumber, { color: '#991b1b' }]}>
          {
            clients.filter(c => validityByClient[c._id]?.status === 'expired')
              .length
          }
        </Text>
        <Text style={[styles.statLabel, { color: '#991b1b' }]}>Expired</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
        <Text style={[styles.statNumber, { color: '#92400e' }]}>
          {
            clients.filter(c => validityByClient[c._id]?.status === 'suspended')
              .length
          }
        </Text>
        <Text style={[styles.statLabel, { color: '#92400e' }]}>Disabled</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#f3f4f6' }]}>
        <Text style={[styles.statNumber, { color: '#374151' }]}>
          {
            clients.filter(
              c =>
                !validityByClient[c._id] ||
                validityByClient[c._id]?.status === 'unknown',
            ).length
          }
        </Text>
        <Text style={[styles.statLabel, { color: '#374151' }]}>Unknown</Text>
      </View>
    </View>
  );

  const renderClientItem = ({ item: client }) => {
    const validity = validityByClient[client._id];

    return (
      <TouchableOpacity
        style={styles.clientCard}
        onPress={() => handleManage(client)}
      >
        <View style={styles.clientHeader}>
          <View>
            <Text style={styles.clientName}>{client.clientUsername}</Text>
            <Text style={styles.clientSlug}>{client.slug}</Text>
          </View>
          <StatusBadge validity={validity} />
        </View>

        <Text style={styles.contactName}>{client.contactName}</Text>

        <View style={styles.contactInfo}>
          <View style={styles.contactRow}>
            <Icon name="email" size={16} color="#6b7280" />
            <Text style={styles.contactDetail}>{client.email}</Text>
          </View>
          {client.phone && (
            <View style={styles.contactRow}>
              <Icon name="phone" size={16} color="#6b7280" />
              <Text style={styles.contactDetail}>{client.phone}</Text>
            </View>
          )}
        </View>

        <View style={styles.expiryRow}>
          <Icon name="calendar" size={16} color="#6b7280" />
          <Text style={styles.expiryLabel}>Expires: </Text>
          <Text style={styles.expiryDate}>{fmt(validity?.expiresAt)}</Text>
        </View>

        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => handleManage(client)}
        >
          <Icon name="shield-account" size={16} color="white" />
          <Text style={styles.manageButtonText}>Manage</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleSection}>
        <View style={styles.titleRow}>
          <Icon name="account-group" size={24} color="#1f2937" />
          <Text style={styles.title}>Client Validity Management</Text>
        </View>
        <Text style={styles.subtitle}>
          Manage account validity for all clients
        </Text>
      </View>

      {renderStats()}

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients by name, email, or contact..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterContainer}>
            <Icon name="filter" size={16} color="#6b7280" />
            <Text style={styles.filterLabel}>Filter:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                {[
                  { value: 'all', label: 'All Statuses' },
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
                      statusFilter === filter.value && styles.filterChipActive,
                    ]}
                    onPress={() => setStatusFilter(filter.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === filter.value &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSearch('');
              setStatusFilter('all');
            }}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="account-group" size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No clients found</Text>
      <Text style={styles.emptySubtitle}>
        {search || statusFilter !== 'all'
          ? 'Try adjusting your search or filters'
          : 'No clients available in the system'}
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.loadingText}>Loading clients...</Text>
    </View>
  );

  if (isLoading && !isRefreshing) {
    return renderLoadingState();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredClients}
        renderItem={renderClientItem}
        keyExtractor={item => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  titleSection: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  searchSection: {
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    marginLeft: 8,
    color: '#1f2937',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 6,
    marginRight: 8,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: 'white',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  clientCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  clientSlug: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  contactInfo: {
    gap: 6,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactDetail: {
    fontSize: 13,
    color: '#6b7280',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  expiryLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  expiryDate: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  manageButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 6,
  },
  manageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
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
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default ClientsValidityManager;
