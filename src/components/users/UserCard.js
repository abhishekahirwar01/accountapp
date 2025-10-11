import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  StyleSheet,
  Dimensions,
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

export function UserCard({
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

  // Check if screen is large enough for grid layout
  const isLargeScreen = width >= 768; // 768px and above for grid, below for list

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

  const StatusIndicator = ({ status }) => (
    <View style={[
      styles.statusIndicator,
      status === "Active" ? styles.statusActive : styles.statusInactive
    ]} />
  );

  const UserAvatar = ({ user, initials, size = 56 }) => (
    <View style={[styles.avatar, { width: size, height: size }]}>
      {user.avatar ? (
        <Image source={{ uri: user.avatar }} style={[styles.avatarImage, { width: size, height: size }]} />
      ) : (
        <View style={[styles.avatarFallback, { width: size, height: size }]}>
          <Text style={[styles.avatarText, size > 40 ? styles.avatarTextLarge : styles.avatarTextSmall]}>
            {initials}
          </Text>
        </View>
      )}
    </View>
  );

  const ContactInfo = ({ user, compact = false }) => (
    <View style={[styles.contactInfo, compact && styles.contactInfoCompact]}>
      {user.contactNumber && (
        <View style={styles.contactItem}>
          <View style={[styles.contactIcon, styles.phoneIcon]}>
            <PhoneIcon />
          </View>
          <Text style={styles.contactText} numberOfLines={1}>
            {user.contactNumber}
          </Text>
        </View>
      )}
      
      {user.email && (
        <View style={styles.contactItem}>
          <View style={[styles.contactIcon, styles.mailIcon]}>
            <MailIcon />
          </View>
          <Text style={styles.contactText} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      )}
      
      {!compact && user.address && (
        <View style={styles.contactItem}>
          <View style={[styles.contactIcon, styles.mapIcon]}>
            <MapPinIcon />
          </View>
          <Text style={styles.addressText} numberOfLines={2}>
            {user.address}
          </Text>
        </View>
      )}
    </View>
  );

  const CompaniesList = ({ user, compact = false }) => (
    <View style={styles.companiesSection}>
      {!compact && <Text style={styles.companiesTitle}>Companies</Text>}
      <View style={[styles.companiesContainer, compact && styles.companiesContainerCompact]}>
        {user.companies && user.companies.length > 0 ? (
          user.companies.slice(0, compact ? 2 : undefined).map((c) => {
            const id = companyIdOf(c);
            const companyName = companyMap.get(id);
            return companyName ? (
              <View key={id} style={[styles.companyBadge, compact && styles.companyBadgeCompact]}>
                <BuildingIcon />
                <Text style={[styles.companyText, compact && styles.companyTextCompact]} numberOfLines={1}>
                  {companyName}
                </Text>
              </View>
            ) : null;
          })
        ) : (
          <Text style={styles.noCompaniesText}>No companies</Text>
        )}
        {compact && user.companies && user.companies.length > 2 && (
          <View style={[styles.companyBadge, styles.companyBadgeCompact]}>
            <Text style={[styles.companyText, styles.companyTextCompact]}>
              +{user.companies.length - 2}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const ActionButtons = ({ user, compact = false }) => (
    <View style={[styles.actionButtons, compact && styles.actionButtonsCompact]}>
      <View style={styles.leftActions}>
        <TouchableOpacity 
          style={[styles.actionButton, compact && styles.actionButtonCompact]} 
          onPress={() => onEdit(user)}
        >
          <EditIcon />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, compact && styles.actionButtonCompact]} 
          onPress={() => setPermUser(user)}
        >
          <UserCogIcon />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, compact && styles.actionButtonCompact]} 
          onPress={() => setResetUser(user)}
          disabled={!getSafeUserId(user)}
        >
          <KeyRoundIcon />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.deleteButton, compact && styles.actionButtonCompact]} 
        onPress={() => onDelete(user)}
      >
        <TrashIcon />
      </TouchableOpacity>
    </View>
  );

  // List View for Mobile Screens
  const renderListView = () => (
    <ScrollView 
      style={styles.listContainer}
      showsVerticalScrollIndicator={false}
    >
      {filtered.map((user) => {
        const roleLabel = getRoleLabel(user.role, rMap);
        const initials = (user.userName || "NN").substring(0, 2).toUpperCase();

        return (
          <View key={user._id} style={styles.listCard}>
            {/* User Header */}
            <View style={styles.listHeader}>
              <UserAvatar user={user} initials={initials} size={48} />
              
              <View style={styles.listUserInfo}>
                <View style={styles.listNameRow}>
                  <Text style={styles.listUserName} numberOfLines={1}>
                    {user.userName}
                  </Text>
                  <View style={styles.listRoleBadge}>
                    <RoleIcon label={roleLabel} />
                    <Text style={styles.listRoleText}>{roleLabel}</Text>
                  </View>
                </View>
                
                <Text style={styles.listUserId}>ID: {user.userId}</Text>
                
                {user.status && (
                  <View style={styles.statusRow}>
                    <StatusIndicator status={user.status} />
                    <Text style={[
                      styles.statusText,
                      user.status === "Active" ? styles.statusActiveText : styles.statusInactiveText
                    ]}>
                      {user.status}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Contact Info - Compact */}
            <ContactInfo user={user} compact={true} />

            {/* Companies - Compact */}
            <CompaniesList user={user} compact={true} />

            {/* Action Buttons */}
            <View style={styles.listFooter}>
              <ActionButtons user={user} compact={true} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  // Grid View for Large Screens
  const renderGridView = () => (
    <ScrollView 
      contentContainerStyle={styles.gridContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.gridInner}>
        {filtered.map((user) => {
          const roleLabel = getRoleLabel(user.role, rMap);
          const initials = (user.userName || "NN").substring(0, 2).toUpperCase();

          return (
            <View key={user._id} style={styles.gridCard}>
              {/* Card Content */}
              <View style={styles.cardContent}>
                {/* User Header */}
                <View style={styles.userHeader}>
                  <UserAvatar user={user} initials={initials} />
                  
                  <View style={styles.userInfo}>
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
                    
                    {user.status && (
                      <View style={styles.statusRow}>
                        <StatusIndicator status={user.status} />
                        <Text style={[
                          styles.statusText,
                          user.status === "Active" ? styles.statusActiveText : styles.statusInactiveText
                        ]}>
                          {user.status}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <ContactInfo user={user} />
                <CompaniesList user={user} />
              </View>

              {/* Card Footer */}
              <View style={styles.cardFooter}>
                <ActionButtons user={user} />
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
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

      {/* Conditional Render based on screen size */}
      {isLargeScreen ? renderGridView() : renderListView()}

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
    marginHorizontal: 10,
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

  // List View Styles (Mobile)
  listContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  listCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  listHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  listUserInfo: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  listNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  listUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  listRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  listRoleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3b82f6',
  },
  listUserId: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  listFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },

  // Grid View Styles (Desktop/Large Screens)
  gridContainer: {
    flexGrow: 1,
  },
  gridInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  gridCard: {
    width: '48%', // 2 columns
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },

  // Common Styles
  cardContent: {
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  avatar: {
    borderRadius: 28,
  },
  avatarImage: {
    borderRadius: 28,
  },
  avatarFallback: {
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  avatarText: {
    fontWeight: '600',
    color: '#3b82f6',
  },
  avatarTextLarge: {
    fontSize: 16,
  },
  avatarTextSmall: {
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  userId: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#10b981',
  },
  statusInactive: {
    backgroundColor: '#f59e0b',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusActiveText: {
    color: '#10b981',
  },
  statusInactiveText: {
    color: '#f59e0b',
  },
  contactInfo: {
    gap: 12,
    marginBottom: 16,
  },
  contactInfoCompact: {
    gap: 8,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactIcon: {
    padding: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
    height: 28,
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
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  addressText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  companiesSection: {
    marginBottom: 8,
  },
  companiesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  companiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  companiesContainerCompact: {
    gap: 4,
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  companyBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
  },
  companyText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  companyTextCompact: {
    fontSize: 10,
  },
  noCompaniesText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  cardFooter: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtonsCompact: {
    justifyContent: 'space-around',
  },
  leftActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  actionButtonCompact: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
});