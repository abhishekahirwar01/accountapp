import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card, Badge, Button } from 'react-native-paper';
import { Edit, Package, Server } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProductMobileCard = React.memo(({ product, onEditClick }) => {
  const [role, setRole] = React.useState(null);

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

  const getStockStatus = stocks => {
    if ((stocks ?? 0) === 0) {
      return {
        bgColor: '#fef2f2',
        darkBgColor: '#991b1b33',
        dotColor: '#dc2626',
        textColor: '#991b1b',
        darkTextColor: '#fecaca',
        status: 'Out of Stock',
      };
    } else if ((stocks ?? 0) > 0 && (stocks ?? 0) <= 10) {
      return {
        bgColor: '#fffbeb',
        darkBgColor: '#92400e33',
        dotColor: '#d97706',
        textColor: '#92400e',
        darkTextColor: '#fcd34d',
        status: 'Low Stock',
      };
    } else {
      return {
        bgColor: '#f0fdf4',
        darkBgColor: '#16653433',
        dotColor: '#16a34a',
        textColor: '#166534',
        darkTextColor: '#bbf7d0',
        status: 'In Stock',
      };
    }
  };

  const stockStatus = getStockStatus(product.stocks);

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        {/* Header */}
        <View style={styles.header}>
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

          <View style={styles.titleContainer}>
            <Text style={styles.productName} numberOfLines={2}>
              {capitalizeWords(product.name)}
            </Text>
            {product.type === 'service' && (
              <Badge style={styles.serviceBadge} size={16}>
                Service
              </Badge>
            )}
          </View>

          {product.type !== 'service' && (
            <View style={styles.stockBadge}>
              <Text
                style={[
                  styles.stockNumber,
                  {
                    color:
                      (product.stocks ?? 0) > 10
                        ? '#16a34a'
                        : (product.stocks ?? 0) > 0
                        ? '#d97706'
                        : '#dc2626',
                  },
                ]}
              >
                {product.stocks ?? 0}
              </Text>
              <Text style={styles.unitText}>{product.unit ?? 'units'}</Text>
            </View>
          )}
        </View>

        {/* Stock Status Badge */}
        {product.type !== 'service' && (
          <View
            style={[
              styles.stockStatus,
              { backgroundColor: stockStatus.bgColor },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: stockStatus.dotColor },
              ]}
            />
            <Text style={[styles.statusText, { color: stockStatus.textColor }]}>
              {stockStatus.status}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {role !== 'user' && product.type !== 'service' && (
            <Button
              mode="outlined"
              compact
              style={styles.editButton}
              labelStyle={styles.editButtonText}
              onPress={() => onEditClick(product)}
              icon={({ size, color }) => <Edit size={12} color={color} />}
            >
              Edit Stock
            </Button>
          )}

          {product?.price && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>${product.price}</Text>
              <Text style={styles.priceLabel}>per unit</Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    margin: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    backgroundColor: 'white',
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  serviceIcon: {
    backgroundColor: '#f3e8ff',
  },
  productIcon: {
    backgroundColor: '#dbeafe',
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  serviceBadge: {
    backgroundColor: '#f3e8ff',
    alignSelf: 'flex-start',
  },
  stockBadge: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  stockNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  unitText: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  stockStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  editButton: {
    borderColor: '#d1d5db',
    borderRadius: 8,
    height: 32,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: 'auto',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  priceLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default ProductMobileCard;
