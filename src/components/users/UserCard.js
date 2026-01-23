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
    let bgColor = '#dbeafe';
    
    if (r === 'admin') {
      iconName = 'shield-crown';
      iconColor = '#059669';
      bgColor = '#d1fae5';
    }
    if (r === 'user') {
      iconName = 'account-circle';
      iconColor = '#7c3aed';
      bgColor = '#ede9fe';
    }
    
    return (
      <View style={[styles.roleIconContainer, { backgroundColor: bgColor }]}>
        <Icon name={iconName} size={12} color={iconColor} />
      </View>
    );
  };

  const renderUserItem = user => {
    const roleLabel = getRoleLabel(user.role, rMap);
    const isAdmin = roleLabel.toLowerCase() === 'admin';
    const initials = (user.userName || 'NN').substring(0, 2).toUpperCase();

    return (
      <View
        key={user._id}
        style={[styles.card, isLargeScreen && styles.gridCard]}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
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
              <Text style={styles.userName} numberOfLines={1}>
                {user.userName}
              </Text>
              <Text style={styles.userId} numberOfLines={1}>
                ID: {user.userId}
              </Text>
            </View>
          </View>

          <View style={styles.roleBadge}>
            <RoleIcon label={roleLabel} />
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
        </View>

        {/* Contact Info Section */}
        <View style={styles.infoSection}>
          {user.email && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIconBg, { backgroundColor: '#f3e8ff' }]}>
                <Icon name="email-outline" size={16} color="#8b5cf6" />
              </View>
              <Text style={styles.infoText} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          )}
          {user.contactNumber && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIconBg, { backgroundColor: '#d1fae5' }]}>
                <Icon name="phone-outline" size={16} color="#10b981" />
              </View>
              <Text style={styles.infoText}>{user.contactNumber}</Text>
            </View>
          )}
          {user.address && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIconBg, { backgroundColor: '#f3f4f6' }]}>
                <Icon name="map-marker-outline" size={16} color="#6b7280" />
              </View>
              <Text style={styles.infoText} numberOfLines={2}>
                {user.address}
              </Text>
            </View>
          )}
        </View>

        {/* Companies Section */}
        {user.companies?.length > 0 && (
          <View style={styles.companiesSection}>
            <Text style={styles.sectionLabel}>Companies</Text>
            <View style={styles.badgeContainer}>
              {user.companies.map(c => {
                const name = companyMap.get(companyIdOf(c));
                return name ? (
                  <View key={companyIdOf(c)} style={styles.companyBadge}>
                    <Icon name="domain" size={12} color="#64748b" />
                    <Text style={styles.companyText} numberOfLines={1}>
                      {name}
                    </Text>
                  </View>
                ) : null;
              })}
            </View>
          </View>
        )}

        {/* Action Buttons Footer */}
        <View style={styles.footer}>
          <View style={styles.actionGroup}>
            {/* Edit Button */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onEdit(user)}
              activeOpacity={0.7}
            >
              <Icon name="pencil-outline" size={18} color="#3b82f6" />
            </TouchableOpacity>

            {/* Manage Permissions - Hidden for Admins */}
            {!isAdmin && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setPermUser(user)}
                activeOpacity={0.7}
              >
                <Icon name="shield-account-outline" size={18} color="#7c3aed" />
              </TouchableOpacity>
            )}

            {/* Reset Password */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                !getSafeUserId(user) && styles.disabledBtn,
              ]}
              onPress={() => setResetUser(user)}
              disabled={!getSafeUserId(user)}
              activeOpacity={0.7}
            >
              <Icon name="key-outline" size={18} color="#f59e0b" />
            </TouchableOpacity>
          </View>

          {/* Delete Button */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(user)}
            activeOpacity={0.7}
          >
            <Icon name="trash-can-outline" size={18} color="#ef4444" />
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
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.activeTabText]}>
            All Users
          </Text>
          <View style={[styles.countBadge, tab === 'all' && styles.activeCountBadge]}>
            <Text style={[styles.countText, tab === 'all' && styles.activeCountText]}>
              {users.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab('admin')}
          style={[styles.tab, tab === 'admin' && styles.activeTab]}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.tabText, tab === 'admin' && styles.activeTabText]}
          >
            Admins
          </Text>
          <View style={[styles.countBadge, tab === 'admin' && styles.activeCountBadge]}>
            <Text style={[styles.countText, tab === 'admin' && styles.activeCountText]}>
              {adminCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={
          isLargeScreen ? styles.gridWrapper : styles.listWrapper
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.map(renderUserItem)}
      </ScrollView>

      {/* Dialogs */}
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
  container: { 
    flex: 1, 
    backgroundColor: '#f9fafb' 
  },

  // Tabs
  tabWrapper: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    margin: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  activeCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  activeCountText: {
    color: '#ffffff',
  },

  // Layout
  listWrapper: { 
    padding: 16, 
    paddingTop: 8 
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingTop: 8,
    gap: 16,
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  gridCard: { 
    width: '48%',
    marginBottom: 0,
  },

  // Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fafbfc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: { 
    width: '100%', 
    height: '100%' 
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { 
    color: '#3b82f6', 
    fontWeight: '700', 
    fontSize: 14 
  },
  headerInfo: { 
    flex: 1, 
    marginLeft: 10 
  },
  userName: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#111827',
    marginBottom: 2,
  },
  userId: { 
    fontSize: 11, 
    color: '#9ca3af',
    fontWeight: '500',
  },

  // Role Badge
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  roleIconContainer: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleText: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: '#0284c7',
    letterSpacing: 0.3,
  },

  // Info Section
  infoSection: { 
    padding: 12, 
    gap: 8 
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  infoIconBg: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { 
    fontSize: 12, 
    color: '#374151', 
    flex: 1,
    fontWeight: '500',
  },

  // Companies Section
  companiesSection: {
    padding: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 5 
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  companyText: { 
    fontSize: 11, 
    color: '#475569', 
    fontWeight: '600',
    maxWidth: 100,
  },

  // Footer Actions
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fafbfc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionGroup: { 
    flexDirection: 'row', 
    gap: 6 
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
});