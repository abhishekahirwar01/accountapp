import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import {
  DataTable,
  Badge,
  Button,
  Modal,
  Portal,
  Provider as PaperProvider,
} from 'react-native-paper';
import { Edit, Package, Server } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProductTableRow = React.memo(({ product, onEditClick }) => {
  const [visible, setVisible] = useState(false);
  const [role, setRole] = useState(null);

  // Get user role from storage
  React.useEffect(() => {
    const getRole = async () => {
      try {
        const userRole = await AsyncStorage.getItem('role');
        setRole(userRole);
      } catch (error) {
        console.error('Error fetching role:', error);
      }
    };
    getRole();
  }, []);

  const capitalizeWords = str => {
    if (!str) return '';
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };

  const showDialog = () => setVisible(true);
  const hideDialog = () => setVisible(false);

  const getStockColor = stocks => {
    if ((stocks ?? 0) > 10) return '#16a34a'; // green-600
    if ((stocks ?? 0) > 0) return '#ea580c'; // orange-600
    return '#dc2626'; // red-600
  };

  const getStockTextColor = stocks => {
    if ((stocks ?? 0) > 10) return '#166534'; // green-800
    if ((stocks ?? 0) > 0) return '#9a3412'; // orange-800
    return '#991b1b'; // red-800
  };

  return (
    <PaperProvider>
      <DataTable.Row style={styles.tableRow}>
        {/* Product Name Column */}
        <DataTable.Cell style={styles.nameCell}>
          <View style={styles.nameContainer}>
            <View
              style={[
                styles.iconContainer,
                product.type === 'service'
                  ? styles.serviceIcon
                  : styles.productIcon,
              ]}
            >
              {product.type === 'service' ? (
                <Server
                  size={16}
                  color={product.type === 'service' ? '#9333ea' : '#2563eb'}
                />
              ) : (
                <Package
                  size={16}
                  color={product.type === 'service' ? '#9333ea' : '#2563eb'}
                />
              )}
            </View>

            <TouchableOpacity onPress={showDialog} style={styles.nameButton}>
              <Text style={styles.productName} numberOfLines={1}>
                {capitalizeWords(product.name)}
              </Text>
            </TouchableOpacity>

            {product.type === 'service' && (
              <Badge style={styles.serviceBadge} size={20}>
                Service
              </Badge>
            )}
          </View>

          <Portal>
            <Modal
              visible={visible}
              onDismiss={hideDialog}
              contentContainerStyle={styles.modalContainer}
            >
              <Text style={styles.modalTitle}>Product Name</Text>
              <Text style={styles.modalContent}>
                {capitalizeWords(product.name)}
              </Text>
              <Button
                mode="contained"
                onPress={hideDialog}
                style={styles.modalButton}
              >
                Close
              </Button>
            </Modal>
          </Portal>
        </DataTable.Cell>

        {/* Stocks Column */}
        <DataTable.Cell style={styles.stockCell}>
          {product.type === 'service' ? (
            <Text style={styles.naText}>N/A</Text>
          ) : (
            <View style={styles.stockContainer}>
              <Text
                style={[
                  styles.stockText,
                  { color: getStockColor(product.stocks) },
                ]}
              >
                {product.stocks ?? 0}
              </Text>
            </View>
          )}
        </DataTable.Cell>

        {/* Unit Column */}
        <DataTable.Cell style={styles.unitCell}>
          {product.type === 'service' ? (
            <Text style={styles.naText}>N/A</Text>
          ) : (
            <Text style={styles.unitText}>{product.unit ?? 'NA'}</Text>
          )}
        </DataTable.Cell>

        {/* Edit Button Column */}
        {role !== 'user' && (
          <DataTable.Cell style={styles.actionCell}>
            <Button
              mode="outlined"
              compact
              style={styles.editButton}
              labelStyle={styles.editButtonLabel}
              onPress={() => onEditClick(product)}
              icon={({ size, color }) => <Edit size={14} color={color} />}
            >
              Edit Stock
            </Button>
          </DataTable.Cell>
        )}
      </DataTable.Row>
    </PaperProvider>
  );
});

const styles = StyleSheet.create({
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 60,
  },
  nameCell: {
    flex: 2,
    paddingVertical: 12,
  },
  stockCell: {
    flex: 1,
    justifyContent: 'center',
  },
  unitCell: {
    flex: 1,
    justifyContent: 'center',
  },
  actionCell: {
    flex: 1,
    justifyContent: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 8,
  },
  serviceIcon: {
    backgroundColor: '#f3e8ff',
  },
  productIcon: {
    backgroundColor: '#dbeafe',
  },
  nameButton: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  serviceBadge: {
    backgroundColor: '#f3e8ff',
    marginLeft: 'auto',
  },
  naText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  stockContainer: {
    alignItems: 'center',
  },
  stockText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'center',
  },
  editButton: {
    borderColor: '#d1d5db',
    borderRadius: 6,
  },
  editButtonLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1f2937',
  },
  modalContent: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalButton: {
    marginTop: 8,
  },
});

export default ProductTableRow;
