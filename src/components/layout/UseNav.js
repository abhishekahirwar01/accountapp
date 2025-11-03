import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { getCurrentUser } from '../../lib/auth';

// Helper functions (same as web)
function normalizeRole(raw) {
  const r = (raw ?? '').toLowerCase();
  if (r === 'client') return 'customer';
  return r;
}

function roleToLabel(r) {
  switch (r) {
    case 'master': return 'Master Admin';
    case 'admin': return 'Admin';
    case 'manager': return 'Manager';
    case 'customer': return 'Client';
    case 'user': return 'User';
    default: return 'User';
  }
}

function initialsFrom(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || 'U';
}

export function UserNav({ user }) {
  const [currentUser, setCurrentUser] = useState(user || null);
  const { width } = useWindowDimensions();
  
  // Show user info on tablets and larger screens (similar to web's sm:block hidden)
  const showUserInfo = width >= 768; // Tablet breakpoint

  useEffect(() => {
    if (!user) {
      const u = getCurrentUser();
      setCurrentUser(u);
    }
  }, [user]);

  if (!currentUser) return null;

  const normalizedRole = normalizeRole(currentUser.role);
  const roleLabel = roleToLabel(normalizedRole);

  const displayName =
    normalizedRole === 'master'
      ? 'Master Administrator'
      : currentUser.name || currentUser.email || 'User';

  const fallbackInitials =
    currentUser.initials || initialsFrom(currentUser.name || currentUser.email);

  return (
    <View style={styles.container}>
      {/* Avatar - Always visible */}
      <View style={styles.avatarContainer}>
        {currentUser.avatar ? (
          <Image
            source={{ uri: currentUser.avatar }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>
              {fallbackInitials}
            </Text>
          </View>
        )}
      </View>

      {/* User Info - Visible on tablets (like web's sm:block hidden) */}
      {showUserInfo && (
        <View style={styles.userInfo}>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.roleLabel} numberOfLines={1}>
            {roleLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  roleLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default UserNav;