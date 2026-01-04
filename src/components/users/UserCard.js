import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Web logic components translated to RN
import ManageUserPermissionsDialog from './UserPermissions';
import ResetPasswordDialog from './ResetPasswordDialog';

/* ----------------------------- Helpers ---------------------------- */

const isObjectId = s => typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s);

const companyIdOf = c => (typeof c === 'string' ? c : c?._id);

const getRoleLabel = (role, map) => {
  if (!role) return '—';
  if (typeof role === 'string') {
    return isObjectId(role) ? map.get(role) ?? role : role;
  }
  return map.get(role._id) ?? role.label ?? role.name ?? '—';
};

const getSafeUserId = u => {
  if (!u) return null;
  return u._id || u.userId || null;
};

/* -------------------------------- Component -------------------------------- */

export function UserCard({ users, onEdit, onDelete, companyMap, roleMap }) {
  const { width } = useWindowDimensions();
  const rMap = roleMap ?? new Map();
  const [permUser, setPermUser] = useState(null);
  const [tab, setTab] = useState('all');
  const [resetUser, setResetUser] = useState(null);

  // Web logic: Check if screen is large enough for grid (Tablet/Desktop mode)
  const isLargeScreen = width >= 768;

  const adminCount = useMemo(
    () =>
      users.filter(u => getRoleLabel(u.role, rMap).toLowerCase() === 'admin')
        .length,
    [users, rMap],
  );

  const filtered = useMemo(() => {
    if (tab === 'admin') {
      return users.filter(
        u => getRoleLabel(u.role, rMap).toLowerCase() === 'admin',
      );
    }
    return users;
  }, [users, tab, rMap]);

  const RoleIcon = ({ label }) => {
    const r = label.toLowerCase();
    let iconName = 'account';
    let iconColor = '#3b82f6';
    if (r === 'admin') {
      iconName = 'shield-check';
      iconColor = '#059669';
    }
    if (r === 'user') {
      iconName = 'account-cog';
      iconColor = '#7c3aed';
    }
    return <Icon name={iconName} size={14} color={iconColor} />;
  };

  const renderUserItem = user => {
    const roleLabel = getRoleLabel(user.role, rMap);
    // WEB PARITY LOGIC: Check if user is an admin
    const isAdmin = roleLabel.toLowerCase() === 'admin';

    const initials = (user.userName || 'NN').substring(0, 2).toUpperCase();
    const isActive = user.status === 'Active';

    return (
      <View
        key={user._id}
        style={[styles.card, isLargeScreen && styles.gridCard]}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.userName}
              </Text>
              <View style={styles.roleBadge}>
                <RoleIcon label={roleLabel} />
                <Text style={styles.roleText}>{roleLabel}</Text>
              </View>
            </View>
            <Text style={styles.userId}>ID: {user.userId}</Text>

            {/* Status Indicator */}
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isActive ? '#10b981' : '#f59e0b' },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isActive ? '#10b981' : '#f59e0b' },
                ]}
              >
                {user.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Info Section */}
        <View style={styles.infoSection}>
          {user.email && (
            <View style={styles.infoItem}>
              <Icon
                name="email-outline"
                size={14}
                color="#8b5cf6"
                style={styles.infoIconBg}
              />
              <Text style={styles.infoText} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          )}
          {user.contactNumber && (
            <View style={styles.infoItem}>
              <Icon
                name="phone-outline"
                size={14}
                color="#10b981"
                style={styles.infoIconBg}
              />
              <Text style={styles.infoText}>{user.contactNumber}</Text>
            </View>
          )}
          {user.address && (
            <View style={styles.infoItem}>
              <Icon
                name="map-marker-outline"
                size={14}
                color="#6b7280"
                style={styles.infoIconBg}
              />
              <Text style={styles.infoText} numberOfLines={2}>
                {user.address}
              </Text>
            </View>
          )}
        </View>

        {/* Companies Section */}
        <View style={styles.companiesSection}>
          <Text style={styles.sectionTitle}>Companies</Text>
          <View style={styles.badgeContainer}>
            {user.companies?.length > 0 ? (
              user.companies.map(c => {
                const name = companyMap.get(companyIdOf(c));
                return name ? (
                  <View key={companyIdOf(c)} style={styles.companyBadge}>
                    <Icon name="office-building" size={12} color="#4b5563" />
                    <Text style={styles.companyText}>{name}</Text>
                  </View>
                ) : null;
              })
            ) : (
              <Text style={styles.noData}>No companies assigned</Text>
            )}
          </View>
        </View>

        {/* Action Buttons Footer */}
        <View style={styles.footer}>
          <View style={styles.actionGroup}>
            {/* 1. EDIT BUTTON: Available for all */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => onEdit(user)}
            >
              <Icon name="pencil" size={18} color="#374151" />
            </TouchableOpacity>

            {/* 2. MANAGE PERMISSIONS: Hidden for Admins */}
            {!isAdmin && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setPermUser(user)}
              >
                <Icon name="account-cog" size={18} color="#7c3aed" />
              </TouchableOpacity>
            )}

            {/* 3. RESET PASSWORD: Available for all */}
            <TouchableOpacity
              style={[styles.iconBtn, !getSafeUserId(user) && { opacity: 0.5 }]}
              onPress={() => setResetUser(user)}
              disabled={!getSafeUserId(user)}
            >
              <Icon name="key-variant" size={18} color="#d97706" />
            </TouchableOpacity>
          </View>

          {/* 4. DELETE BUTTON: Available for all */}
          <TouchableOpacity
            style={[styles.iconBtn, styles.deleteBtn]}
            onPress={() => onDelete(user)}
          >
            <Icon name="trash-can-outline" size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tabs Section */}
      <View style={styles.tabWrapper}>
        <TouchableOpacity
          onPress={() => setTab('all')}
          style={[styles.tab, tab === 'all' && styles.activeTab]}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.activeTabText]}>
            All Users ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('admin')}
          style={[styles.tab, tab === 'admin' && styles.activeTab]}
        >
          <Text
            style={[styles.tabText, tab === 'admin' && styles.activeTabText]}
          >
            Admins ({adminCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={
          isLargeScreen ? styles.gridWrapper : styles.listWrapper
        }
      >
        {filtered.map(renderUserItem)}
      </ScrollView>

      {/* Dialogs integration */}
      {permUser && (
        <ManageUserPermissionsDialog
          open={!!permUser}
          onClose={() => setPermUser(null)}
          user={permUser}
        />
      )}
      {resetUser && (
        <ResetPasswordDialog
          open={true}
          onClose={() => setResetUser(null)}
          userId={getSafeUserId(resetUser)}
          userName={resetUser.userName}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  tabWrapper: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 4,
    margin: 16,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeTab: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  activeTabText: { color: '#000', fontWeight: '600' },

  listWrapper: { padding: 16 },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    justifyContent: 'space-between',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    elevation: 3,
  },
  gridCard: { width: '48%' },

  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#2563eb', fontWeight: 'bold', fontSize: 18 },

  headerInfo: { flex: 1, marginLeft: 12 },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', flex: 1 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleText: { fontSize: 10, fontWeight: '600', color: '#3b82f6' },
  userId: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },

  infoSection: { padding: 16, gap: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoIconBg: { backgroundColor: '#f3f4f6', padding: 4, borderRadius: 4 },
  infoText: { fontSize: 13, color: '#374151', flex: 1 },

  companiesSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  companyText: { fontSize: 11, color: '#4b5563', fontWeight: '500' },
  noData: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  actionGroup: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    minWidth: 38,
    alignItems: 'center',
  },
  deleteBtn: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
});
