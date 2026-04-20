import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import {
  User,
  Phone,
  Calendar,
  Globe,
  Copy,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useToast } from '../hooks/useToast';
import { BASE_URL } from '../../config';

export default function ClientCard({
  client,
  onEdit,
  onDelete,
  copyToClipboard,
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const navigation = useNavigation();

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getAppLoginUrl = slug =>
    slug ? `${BASE_URL}/client-login/${slug}` : '';

  const handleCopyUrl = async () => {
    if (!client?.slug) {
      toast({
        title: 'Error',
        description: 'No URL available to copy',
        type: 'error',
      });
      return;
    }
    const url = getAppLoginUrl(client.slug);
    try {
      await Clipboard.setString(url);
      // show temporary UI feedback like in HistoryScreen
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      toast({
        title: 'Copied',
        description: 'Login URL copied to clipboard!',
        type: 'success',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy URL',
        type: 'error',
      });
    }
  };

  const handleDelete = () => {
    // Delegate confirmation to parent (custom AlertDialog)
    onDelete();
  };

  // Navigation handler for View Analytics
  const handleViewAnalytics = () => {
    navigation.navigate('AnalyticsScreen', {
      clientId: client._id,
      clientName: client.contactName,
      preSelectedClient: client,
    });
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {client.contactName?.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{client.contactName}</Text>
          <Text style={styles.email}>{client.email}</Text>
        </View>
      </View>

      {/* Info Rows */}
      <View style={styles.infoSection}>
        <InfoRow
          icon={<User size={16} color="#0284c7" />}
          label="Username"
          value={client.clientUsername}
        />
        <InfoRow
          icon={<Phone size={16} color="#16a34a" />}
          label="Phone"
          value={client.phone || 'N/A'}
        />
        <InfoRow
          icon={<Calendar size={16} color="#9333ea" />}
          label="Joined"
          value={formatDate(client.createdAt)}
        />
        {/* <View style={[styles.row, { marginBottom: 0 }]}>
          <View style={[styles.iconBox, { backgroundColor: '#fff7ed' }]}>
            <Globe size={16} color="#ea580c" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.label}>Login URL</Text>
            {client.slug ? (
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyUrl}
              >
                <Icon
                  name={copied ? 'check' : 'content-copy'}
                  size={14}
                  color="#666"
                />
                <Text style={styles.copyText}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.notSet}>Not set</Text>
            )}
          </View>
        </View> */}
      </View>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={handleViewAnalytics}
          activeOpacity={0.85}
        >
          <Eye size={16} color="#0369a1" />
          <Text style={[styles.actionText, styles.viewButtonText]}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={onEdit}
          activeOpacity={0.85}
        >
          <Edit size={16} color="#7e22ce" />
          <Text style={[styles.actionText, styles.editButtonText]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
          activeOpacity={0.85}
        >
          <Trash2 size={16} color="#b91c1c" />
          <Text style={[styles.actionText, styles.deleteButtonText]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.row}>
    <View style={styles.iconBox}>{icon}</View>
    <View style={styles.rowText}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginVertical: 5,
    marginHorizontal: 8,
  boxShadow:"0px 2px 5px rgba(0,0,0,0.1)",
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f6ff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e3deff',
  },
  avatarContainer: { marginRight: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8b77ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  headerText: { flex: 1 },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  email: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  infoSection: { padding: 16, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
  },
  value: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    maxWidth: '60%',
    textAlign: 'right',
  },
  notSet: {
    color: '#9ca3af',
    fontSize: 13,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fafafa',
  },
  copyText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 4,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    gap: 6,
  },
  actionText: {
    fontWeight: '600',
    fontSize: 14,
  },
  viewButton: {
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
  },
  viewButtonText: {
    color: '#0369a1',
  },
  editButton: {
    backgroundColor: '#f3e8ff',
    borderColor: '#e9d5ff',
  },
  editButtonText: {
    color: '#7e22ce',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    color: '#b91c1c',
  },
});
