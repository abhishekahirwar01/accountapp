import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  useWindowDimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import your dialogs
import ManageUserPermissionsDialog from "./UserPermissions"
import ResetPasswordDialog from "./ResetPasswordDialog";

/* ----------------------------- Helpers & Types ---------------------------- */

const isObjectId = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);

const isRoleObject = (r) => !!r && typeof r === "object" && "_id" in r;

const companyIdOf = (c) => typeof c === "string" ? c : c?._id;

const getRoleLabel = (role, map) => {
  if (!role) return "—";
  if (typeof role === "string") {
    return isObjectId(role) ? map.get(role) ?? role : role;
  }
  return map.get(role._id) ?? role.label ?? role.name ?? "—";
};

const getSafeUserId = (u) => {
  if (!u) return null;
  const id = (typeof u._id === "string" && u._id) || (typeof u.userId === "string" && u.userId) || null;
  return id;
};

/* -------------------------------- Component -------------------------------- */

const TabValue = {
  ALL: "all",
  ADMIN: "admin"
};

// React Native Vector Icons
const EditIcon = () => <Icon name="pencil" size={16} color="#374151" />;
const TrashIcon = () => <Icon name="trash-can-outline" size={16} color="#dc2626" />;
const MapPinIcon = () => <Icon name="map-marker-outline" size={16} color="#6b7280" />;
const PhoneIcon = () => <Icon name="phone" size={16} color="#10b981" />;
const UserIcon = () => <Icon name="account" size={16} color="#3b82f6" />;
const BuildingIcon = () => <Icon name="office-building" size={16} color="#4b5563" />;
const MailIcon = () => <Icon name="email-outline" size={16} color="#8b5cf6" />;
const ShieldCheckIcon = () => <Icon name="shield-check" size={16} color="#059669" />;
const UserCogIcon = () => <Icon name="account-cog" size={16} color="#7c3aed" />;
const KeyRoundIcon = () => <Icon name="key" size={16} color="#d97706" />;
const ShieldIcon = () => <Icon name="shield-account" size={16} color="#7c3aed" />;

export function UserTable({
  users,
  onEdit,
  onDelete,
  companyMap,
  roleMap,
}) {
  const { width } = useWindowDimensions();
  const rMap = roleMap ?? new Map();
  const [permUser, setPermUser] = useState(null);
  const [tab, setTab] = useState(TabValue.ALL);
  const [resetUser, setResetUser] = useState(null);
  const resetId = getSafeUserId(resetUser);

  // Check if screen is large enough for full table
  const isLargeScreen = width >= 1024;

  const adminCount = useMemo(
    () =>
      users.filter(
        (u) => getRoleLabel(u.role, rMap).toLowerCase() === "admin"
      ).length,
    [users, rMap]
  );

  const filtered = useMemo(() => {
    if (tab === TabValue.ADMIN) {
      return users.filter(
        (u) => getRoleLabel(u.role, rMap).toLowerCase() === "admin"
      );
    }
    return users;
  }, [users, tab, rMap]);

  const RoleIcon = ({ label }) => {
    const r = label.toLowerCase();
    if (r === "admin") return <ShieldCheckIcon />;
    if (r === "user") return <UserCogIcon />;
    return <UserIcon />;
  };

  const StatusBadge = ({ status }) => (
    <View style={[
      styles.statusBadge,
      status === "Active" ? styles.statusActive : styles.statusInactive
    ]}>
      <View style={[
        styles.statusDot,
        status === "Active" ? styles.statusDotActive : styles.statusDotInactive
      ]} />
      <Text style={[
        styles.statusText,
        status === "Active" ? styles.statusTextActive : styles.statusTextInactive
      ]}>
        {status}
      </Text>
    </View>
  );

  const RoleBadge = ({ role }) => {
    const roleLabel = getRoleLabel(role, rMap);
    return (
      <View style={styles.roleBadge}>
        <RoleIcon label={roleLabel} />
        <Text style={styles.roleText} numberOfLines={1}>
          {roleLabel}
        </Text>
      </View>
    );
  };

  const ActionButtons = ({ user }) => (
    <View style={styles.actionButtons}>
      <TouchableOpacity 
        style={[styles.actionButton, styles.editButton]} 
        onPress={() => onEdit(user)}
      >
        <EditIcon />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.permButton]} 
        onPress={() => setPermUser(user)}
      >
        <ShieldIcon />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.resetButton]} 
        onPress={() => setResetUser(user)}
        disabled={!getSafeUserId(user)}
      >
        <KeyRoundIcon />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.deleteButton]} 
        onPress={() => onDelete(user)}
      >
        <TrashIcon />
      </TouchableOpacity>
    </View>
  );

  // Full Table for Large Screens
  const renderFullTable = () => (
    <View style={styles.table}>
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <View style={[styles.tableHeaderCell, styles.userHeader]}>
          <Text style={styles.tableHeaderText}>User</Text>
        </View>
        <View style={[styles.tableHeaderCell, styles.roleHeader]}>
          <Text style={styles.tableHeaderText}>Role</Text>
        </View>
        <View style={[styles.tableHeaderCell, styles.contactHeader]}>
          <Text style={styles.tableHeaderText}>Contact</Text>
        </View>
        <View style={[styles.tableHeaderCell, styles.addressHeader]}>
          <Text style={styles.tableHeaderText}>Address</Text>
        </View>
        <View style={[styles.tableHeaderCell, styles.companiesHeader]}>
          <Text style={styles.tableHeaderText}>Companies</Text>
        </View>
        <View style={[styles.tableHeaderCell, styles.actionsHeader]}>
          <Text style={styles.tableHeaderText}>Actions</Text>
        </View>
      </View>

      {/* Table Body */}
      <View style={styles.tableBody}>
        {filtered.map((user, index) => {
          const roleLabel = getRoleLabel(user.role, rMap);
          
          return (
            <View 
              key={user._id} 
              style={[
                styles.tableRow,
                index % 2 === 0 ? styles.evenRow : styles.oddRow
              ]}
            >
              {/* User Cell */}
              <View style={[styles.tableCell, styles.userCell]}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <UserIcon />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user.userName}</Text>
                    <Text style={styles.userId}>ID: {user.userId}</Text>
                  </View>
                </View>
              </View>

              {/* Role Cell */}
              <View style={[styles.tableCell, styles.roleCell]}>
                <View style={styles.roleInfo}>
                  <View style={styles.roleIcon}>
                    <RoleIcon label={roleLabel} />
                  </View>
                  <Text style={styles.roleLabel}>{roleLabel}</Text>
                </View>
              </View>

              {/* Contact Cell */}
              <View style={[styles.tableCell, styles.contactCell]}>
                <View style={styles.contactInfo}>
                  {user.contactNumber && (
                    <View style={styles.contactItem}>
                      <View style={[styles.contactIcon, styles.phoneIcon]}>
                        <PhoneIcon />
                      </View>
                      <Text style={styles.contactText}>{user.contactNumber}</Text>
                    </View>
                  )}
                  {user.email && (
                    <View style={styles.contactItem}>
                      <View style={[styles.contactIcon, styles.mailIcon]}>
                        <MailIcon />
                      </View>
                      <Text style={styles.contactEmail}>{user.email}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Address Cell */}
              <View style={[styles.tableCell, styles.addressCell]}>
                {user.address ? (
                  <View style={styles.addressInfo}>
                    <View style={[styles.contactIcon, styles.mapIcon]}>
                      <MapPinIcon />
                    </View>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {user.address}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noDataText}>—</Text>
                )}
              </View>

              {/* Companies Cell */}
              <View style={[styles.tableCell, styles.companiesCell]}>
                <View style={styles.companiesContainer}>
                  {user.companies && user.companies.length > 0 ? (
                    user.companies.map((c) => {
                      const id = companyIdOf(c);
                      const companyName = companyMap.get(id);
                      return companyName ? (
                        <View key={id} style={styles.companyBadge}>
                          <BuildingIcon />
                          <Text style={styles.companyText} numberOfLines={1}>
                            {companyName}
                          </Text>
                        </View>
                      ) : null;
                    })
                  ) : (
                    <Text style={styles.noCompaniesText}>No companies assigned</Text>
                  )}
                </View>
              </View>

              {/* Actions Cell */}
              <View style={[styles.tableCell, styles.actionsCell]}>
                <ActionButtons user={user} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  // Compact Table for Mobile
  const renderCompactTable = () => (
    <View style={styles.compactTable}>
      {filtered.map((user) => {
        const roleLabel = getRoleLabel(user.role, rMap);
        
        return (
          <View key={user._id} style={styles.compactCard}>
            {/* Header */}
            <View style={styles.compactHeader}>
              <View style={styles.compactUserInfo}>
                <View style={styles.userAvatar}>
                  <UserIcon />
                </View>
                <View style={styles.compactUserDetails}>
                  <Text style={styles.compactUserName}>{user.userName}</Text>
                  <Text style={styles.compactUserId}>ID: {user.userId}</Text>
                </View>
              </View>
              <View style={styles.compactBadges}>
                <RoleBadge role={user.role} />
                {user.status && <StatusBadge status={user.status} />}
              </View>
            </View>

            {/* Contact Info */}
            <View style={styles.compactContact}>
              {user.contactNumber && (
                <View style={styles.contactItem}>
                  <View style={[styles.contactIcon, styles.phoneIcon]}>
                    <PhoneIcon />
                  </View>
                  <Text style={styles.contactText}>{user.contactNumber}</Text>
                </View>
              )}
              {user.email && (
                <View style={styles.contactItem}>
                  <View style={[styles.contactIcon, styles.mailIcon]}>
                    <MailIcon />
                  </View>
                  <Text style={styles.contactEmail}>{user.email}</Text>
                </View>
              )}
            </View>

            {/* Address */}
            {user.address && (
              <View style={styles.compactAddress}>
                <View style={[styles.contactIcon, styles.mapIcon]}>
                  <MapPinIcon />
                </View>
                <Text style={styles.addressText} numberOfLines={2}>
                  {user.address}
                </Text>
              </View>
            )}

            {/* Companies */}
            <View style={styles.compactCompanies}>
              <Text style={styles.companiesTitle}>Companies</Text>
              <View style={styles.companiesContainer}>
                {user.companies && user.companies.length > 0 ? (
                  user.companies.slice(0, 2).map((c) => {
                    const id = companyIdOf(c);
                    const companyName = companyMap.get(id);
                    return companyName ? (
                      <View key={id} style={styles.companyBadge}>
                        <BuildingIcon />
                        <Text style={styles.companyText} numberOfLines={1}>
                          {companyName}
                        </Text>
                      </View>
                    ) : null;
                  })
                ) : (
                  <Text style={styles.noCompaniesText}>No companies assigned</Text>
                )}
                {user.companies && user.companies.length > 2 && (
                  <View style={styles.companyBadge}>
                    <Text style={styles.companyText}>
                      +{user.companies.length - 2}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.compactActions}>
              <ActionButtons user={user} />
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs - Next.js style */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, tab === TabValue.ALL && styles.activeTab]} 
          onPress={() => setTab(TabValue.ALL)}
        >
          <Text style={[styles.tabText, tab === TabValue.ALL && styles.activeTabText]}>
            All Users ({users.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, tab === TabValue.ADMIN && styles.activeTab]} 
          onPress={() => setTab(TabValue.ADMIN)}
        >
          <Text style={[styles.tabText, tab === TabValue.ADMIN && styles.activeTabText]}>
            Admins ({adminCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Table */}
      <ScrollView 
        style={styles.tableContainer}
        showsVerticalScrollIndicator={false}
      >
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

      {resetUser && resetId != null && (
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
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 4,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  tableContainer: {
    flex: 1,
  },

  // Full Table Styles
  table: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 16,
  },
  tableHeaderCell: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  userHeader: { width: '20%' },
  roleHeader: { width: '15%' },
  contactHeader: { width: '20%' },
  addressHeader: { width: '20%' },
  companiesHeader: { width: '15%' },
  actionsHeader: { width: '10%' },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 80,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  evenRow: {
    backgroundColor: '#fafbfc',
  },
  oddRow: {
    backgroundColor: 'white',
  },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  userCell: { width: '20%' },
  roleCell: { width: '15%' },
  contactCell: { width: '20%' },
  addressCell: { width: '20%' },
  companiesCell: { width: '15%' },
  actionsCell: { width: '10%' },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  userId: {
    fontSize: 12,
    color: '#6b7280',
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  contactInfo: {
    gap: 6,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  mailIcon: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  mapIcon: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  contactText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  contactEmail: {
    fontSize: 11,
    color: '#6b7280',
    flex: 1,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
    lineHeight: 16,
  },
  companiesContainer: {
    gap: 4,
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  companyText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  noCompaniesText: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  editButton: {
    borderColor: '#d1d5db',
  },
  permButton: {
    borderColor: '#d1d5db',
  },
  resetButton: {
    borderColor: '#d1d5db',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusInactive: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#10b981',
  },
  statusDotInactive: {
    backgroundColor: '#f59e0b',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#10b981',
  },
  statusTextInactive: {
    color: '#f59e0b',
  },

  // Compact Table Styles
  compactTable: {
    paddingHorizontal: 16,
    gap: 12,
  },
  compactCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  compactUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  compactUserDetails: {
    flex: 1,
  },
  compactUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  compactUserId: {
    fontSize: 12,
    color: '#6b7280',
  },
  compactBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  compactContact: {
    gap: 8,
    marginBottom: 12,
  },
  compactAddress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  compactCompanies: {
    marginBottom: 12,
  },
  companiesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  compactActions: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
});