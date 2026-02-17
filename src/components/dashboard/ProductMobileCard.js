import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card, Badge } from 'react-native-paper';
import { Package, Server } from 'lucide-react-native';

const ProductMobileCard = React.memo(({ product, onEditClick }) => {
  // currency formatter
  const formatINR = v => {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    if (n === null || n === undefined || n === '' || Number.isNaN(Number(n)))
      return '-';
    return `₹${Number(n).toLocaleString('en-IN')}`;
  };

  const capitalizeWords = str => {
    if (!str) return '';
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        {/* Header (Icon, Name, Stock Count) */}
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
              <Server size={16} color={'#9333ea'} />
            ) : (
              <Package size={16} color={'#2563eb'} />
            )}
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.productName} numberOfLines={2}>
              {capitalizeWords(product.name)}
            </Text>
            
            {/* Service Badge */}
            {product.type === 'service' && (
              <Badge style={styles.serviceBadgeStyle} size={18}>
                Service
              </Badge>
            )}
          </View>

          {/* Stock Number and Unit Badge */}
          {product.type !== 'service' && (
            <View style={styles.stockBadge}>
              <View style={styles.stockNumberContainer}>
                <Text
                  style={[
                    styles.stockNumber,
                    {
                      color: (product.stocks ?? 0) > 10 
                        ? '#16a34a' 
                        : (product.stocks ?? 0) > 0 
                          ? '#d97706' 
                          : '#dc2626'
                    },
                  ]}
                >
                  {product.stocks ?? 0}
                </Text>
                <Text style={styles.unitText}>{product.unit ?? 'units'}</Text>
              </View>
              
              {/* Stock Status Indicators */}
              <View style={styles.statusIndicator}>
                {(product.stocks ?? 0) === 0 && (
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, styles.outOfStockDot]} />
                    <Text style={[styles.statusText, styles.outOfStockText]}>
                      Out of Stock
                    </Text>
                  </View>
                )}
                {(product.stocks ?? 0) > 0 && (product.stocks ?? 0) <= 10 && (
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, styles.lowStockDot]} />
                    <Text style={[styles.statusText, styles.lowStockText]}>
                      Low Stock
                    </Text>
                  </View>
                )}
                {(product.stocks ?? 0) > 10 && (
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, styles.inStockDot]} />
                    <Text style={[styles.statusText, styles.inStockText]}>
                      In Stock
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Price Section */}
        <View style={styles.priceContainer}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>Cost Price</Text>
            <Text style={styles.priceValue}>
              {formatINR(product.costPrice)}
            </Text>
          </View>
          
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>Selling Price</Text>
            <Text style={styles.priceValue}>
              {formatINR(product.sellingPrice)}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    // margin: 8,
    // marginBottom: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardContent: {
    padding: 16,
  },

  // --- Header Styles ---
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    // marginBottom: 12,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 8,
    flexShrink: 0,
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
    lineHeight: 20,
    marginBottom: 4,
  },
  serviceBadgeStyle: {
    backgroundColor: '#f3e8ff',
    color: '#9333ea',
    fontWeight: '500',
    alignSelf: 'flex-start',
    fontSize: 10,
    height: 20,
    paddingHorizontal: 6,
  },
  
  // Stock Badge Styles
  stockBadge: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  stockNumberContainer: {
    alignItems: 'flex-end',
    marginBottom: 4,
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
  
  // Status Indicator Styles
  statusIndicator: {
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  outOfStockDot: {
    backgroundColor: '#dc2626',
  },
  lowStockDot: {
    backgroundColor: '#d97706',
  },
  inStockDot: {
    backgroundColor: '#16a34a',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  outOfStockText: {
    color: '#dc2626',
  },
  lowStockText: {
    color: '#d97706',
  },
  inStockText: {
    color: '#16a34a',
  },
  
  // Price Section Styles
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  priceBlock: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16a34a',
  },
});

export default ProductMobileCard;