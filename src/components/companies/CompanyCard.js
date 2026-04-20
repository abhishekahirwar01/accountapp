import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CompanyCard = ({ company, clientName, onEdit, onDelete }) => {
  const editScale = useRef(new Animated.Value(1)).current;
  const deleteScale = useRef(new Animated.Value(1)).current;

  const pressAnim = (ref, cb) => {
    Animated.sequence([
      Animated.timing(ref, { toValue: 0.94, duration: 70, useNativeDriver: true }),
      Animated.timing(ref, { toValue: 1, duration: 70, useNativeDriver: true }),
    ]).start(cb);
  };

  const initials = (company.businessName || 'C')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <View style={styles.card}>

      {/* ── Top strip ── */}
      <View style={styles.topStrip} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.companyName} numberOfLines={1}>
            {company.businessName}
          </Text>
          <Text style={styles.businessType} numberOfLines={1}>
            {company.businessType}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Client</Text>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Details ── */}
      <View style={styles.details}>

        <View style={styles.detailItem}>
          <Icon name="account-outline" size={15} color="#6B7280" style={styles.detailIcon} />
          <View>
            <Text style={styles.detailLabel}>Assigned Client</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{clientName}</Text>
            <Text style={styles.detailSub} numberOfLines={1}>{company.emailId || '—'}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Icon name="phone-outline" size={15} color="#6B7280" style={styles.detailIcon} />
          <View>
            <Text style={styles.detailLabel}>Contact</Text>
            <Text style={styles.detailValue}>{company.mobileNumber}</Text>
          </View>
        </View>

      </View>

      {/* ── ID Row ── */}
      <View style={styles.idRow}>
        <View style={styles.idItem}>
          <Text style={styles.idLabel}>Registration No.</Text>
          <Text style={styles.idValue} numberOfLines={1}>
            {company.registrationNumber || '—'}
          </Text>
        </View>
        <View style={styles.idSep} />
        <View style={styles.idItem}>
          <Text style={styles.idLabel}>GSTIN</Text>
          <Text style={styles.idValue} numberOfLines={1}>
            {company.gstin || '—'}
          </Text>
        </View>
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: editScale }] }}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => pressAnim(editScale, onEdit)}
            activeOpacity={1}
          >
            <Icon name="pencil-outline" size={15} color="#2563EB" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: deleteScale }] }}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => pressAnim(deleteScale, onDelete)}
            activeOpacity={1}
          >
            <Icon name="trash-can-outline" size={15} color="#DC2626" />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginHorizontal: 16,
    // marginVertical: 4,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },

  topStrip: {
    // height: 3,
    // backgroundColor: '#2563EB',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 12,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: '#f0eeff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8974fc',
    letterSpacing: 0.3,
  },
  headerText: {
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  businessType: {
    fontSize: 12,
    color: '#6B7280',
    // marginTop: 2,
  },
  badge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },

  /* Details */
  details: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailIcon: {
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },

  /* ID Row */
  idRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 14,
    marginTop: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  idItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  idSep: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  idLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  idValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
});

export default CompanyCard;