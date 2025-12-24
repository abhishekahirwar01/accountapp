import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// UI Dialogs
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

const TabValue = {
  ALL: 'all',
  ADMIN: 'admin',
};

export function UserTable({ users, onEdit, onDelete, companyMap, roleMap }) {
  const { width } = useWindowDimensions();
  const rMap = roleMap ?? new Map();

  const [permUser, setPermUser] = useState(null);
  const [tab, setTab] = useState(TabValue.ALL);
  const [resetUser, setResetUser] = useState(null);
  const resetId = getSafeUserId(resetUser);

  // Responsive logic: Web ki tarah 1024px+ par hi full table dikhayenge
  const isLargeScreen = width >= 1024;

  const adminCount = useMemo(
    () =>
      users.filter(u => getRoleLabel(u.role, rMap).toLowerCase() === 'admin')
        .length,
    [users, rMap],
  );

  const filtered = useMemo(() => {
    if (tab === TabValue.ADMIN) {
      return users.filter(
        u => getRoleLabel(u.role, rMap).toLowerCase() === 'admin',
      );
    }
    return users;
  }, [users, tab, rMap]);

  const RoleIcon = ({ label, size = 16 }) => {
    const r = label.toLowerCase();
    let name = 'account';
    let color = '#3b82f6';
    if (r === 'admin') {
      name = 'shield-check';
      color = '#059669';
    } else if (r === 'user') {
      name = 'account-cog';
      color = '#7c3aed';
    }
    return <Icon name={name} size={size} color={color} />;
  };

  const ActionButtons = ({ user }) => (
    <View style={styles.actionRow}>
      <TouchableOpacity
        style={[styles.actionBtn, styles.editBtn]}
        onPress={() => onEdit(user)}
      >
        <Icon name="pencil" size={18} color="#374151" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, styles.permBtn]}
        onPress={() => setPermUser(user)}
      >
        <Icon name="shield-account" size={18} color="#7c3aed" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, styles.keyBtn]}
        onPress={() => setResetUser(user)}
        disabled={!getSafeUserId(user)}
      >
        <Icon name="key-variant" size={18} color="#d97706" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, styles.deleteBtn]}
        onPress={() => onDelete(user)}
      >
        <Icon name="trash-can-outline" size={18} color="#dc2626" />
      </TouchableOpacity>
    </View>
  );

  // Full Desktop-style Table
  const renderFullTable = () => (
    <View style={styles.tableCard}>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, { flex: 2 }]}>User</Text>
        <Text style={[styles.headerText, { flex: 1.5 }]}>Role</Text>
        <Text style={[styles.headerText, { flex: 2 }]}>Contact</Text>
        <Text style={[styles.headerText, { flex: 2 }]}>Companies</Text>
        <Text style={[styles.headerText, { flex: 1.5, textAlign: 'right' }]}>
          Actions
        </Text>
      </View>
      {filtered.map((user, index) => {
        const roleLabel = getRoleLabel(user.role, rMap);
        return (
          <View
            key={user._id}
            style={[styles.tableRow, index % 2 !== 0 && styles.evenRow]}
          >
            <View style={{ flex: 2 }}>
              <Text style={styles.userName}>{user.userName}</Text>
              <Text style={styles.userId}>ID: {user.userId}</Text>
            </View>
            <View
              style={{
                flex: 1.5,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <RoleIcon label={roleLabel} />
              <Text style={styles.roleLabel}>{roleLabel}</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.contactText}>
                {user.contactNumber || '—'}
              </Text>
              <Text style={styles.emailText} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
            <View
              style={{
                flex: 2,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 4,
              }}
            >
              {user.companies?.map(c => (
                <View key={companyIdOf(c)} style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {companyMap.get(companyIdOf(c))}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
              <ActionButtons user={user} />
            </View>
          </View>
        );
      })}
    </View>
  );

  // Mobile-style Compact Cards
  const renderCompactTable = () => (
    <View style={{ padding: 16 }}>
      {filtered.map(user => {
        const roleLabel = getRoleLabel(user.role, rMap);
        return (
          <View key={user._id} style={styles.compactCard}>
            <View style={styles.compactHeader}>
              <View>
                <Text style={styles.userName}>{user.userName}</Text>
                <Text style={styles.userId}>ID: {user.userId}</Text>
              </View>
              <View style={styles.roleTag}>
                <RoleIcon label={roleLabel} size={14} />
                <Text style={styles.roleTagText}>{roleLabel}</Text>
              </View>
            </View>

            <View style={styles.compactInfo}>
              <View style={styles.infoLine}>
                <Icon name="phone" size={14} color="#64748b" />
                <Text style={styles.infoText}>
                  {user.contactNumber || 'No phone'}
                </Text>
              </View>
              <View style={styles.infoLine}>
                <Icon name="email" size={14} color="#64748b" />
                <Text style={styles.infoText}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.compactFooter}>
              <ActionButtons user={user} />
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs - Web Parity */}
      <View style={styles.tabWrapper}>
        <TouchableOpacity
          onPress={() => setTab(TabValue.ALL)}
          style={[styles.tab, tab === TabValue.ALL && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              tab === TabValue.ALL && styles.activeTabText,
            ]}
          >
            All ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab(TabValue.ADMIN)}
          style={[styles.tab, tab === TabValue.ADMIN && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              tab === TabValue.ADMIN && styles.activeTabText,
            ]}
          >
            Admins ({adminCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {isLargeScreen ? renderFullTable() : renderCompactTable()}
      </ScrollView>

      {/* Dialogs */}
      {permUser && (
        <ManageUserPermissionsDialog
          open={!!permUser}
          onClose={() => setPermUser(null)}
          user={permUser}
        />
      )}

      {resetUser && resetId && (
        <ResetPasswordDialog
          open={true}
          onClose={() => setResetUser(null)}
          userId={resetId}
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
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 4,
    margin: 16,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#fff', elevation: 2 },
  tabText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  activeTabText: { color: '#0f172a', fontWeight: '600' },

  // Table Styles
  tableCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  evenRow: { backgroundColor: '#f8fafc' },
  userName: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  userId: { fontSize: 11, color: '#64748b' },
  roleLabel: { fontSize: 13, color: '#334155', fontWeight: '500' },
  contactText: { fontSize: 13, color: '#1e293b' },
  emailText: { fontSize: 11, color: '#64748b' },
  badge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  badgeText: { fontSize: 10, color: '#1d4ed8', fontWeight: '600' },

  // Compact Card Styles
  compactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    padding: 5,
    borderRadius: 6,
  },
  roleTagText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  compactInfo: { gap: 8, marginBottom: 12 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: '#475569' },
  compactFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },

  // Action Buttons
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderAppearance: 'outline',
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  editBtn: { borderColor: '#e2e8f0' },
  permBtn: { borderColor: '#e2e8f0' },
  keyBtn: { borderColor: '#e2e8f0' },
  deleteBtn: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
});
