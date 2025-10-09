import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

// Hardcoded service names
const serviceNameById = new Map([
  ['service1', 'Web Development'],
  ['service2', 'Mobile App Development'],
  ['service3', 'Consulting'],
  ['service4', 'Design Services'],
  ['service5', 'Maintenance'],
])

// Mock data for products and services
const mockProducts = [
  { _id: 'prod1', name: 'Laptop', type: 'product' },
  { _id: 'prod2', name: 'Mouse', type: 'product' },
  { _id: 'prod3', name: 'Keyboard', type: 'product' },
]

const mockServices = [
  { _id: 'service1', serviceName: 'Web Development' },
  { _id: 'service2', serviceName: 'Mobile App Development' },
  { _id: 'service3', serviceName: 'Consulting' },
]

export const getUnifiedLines = (tx, serviceNameById) => {
  if (!tx) return [];

  // Handle items array
  if (tx.items && Array.isArray(tx.items)) {
    return tx.items.map(item => {
      if (item.itemType === 'product') {
        return {
          type: 'product',
          name: item.name || 'Unknown Product',
          quantity: item.quantity || 0,
          unitType: item.unitType || 'Piece',
          pricePerUnit: item.pricePerUnit || 0,
        };
      } else if (item.itemType === 'service') {
        return {
          type: 'service',
          name: item.serviceName || 'Unknown Service',
          description: item.description || '',
        };
      }
      return { type: 'unknown', name: 'Unknown Item' };
    });
  }

  // Handle single product/service (legacy)
  if (tx.product) {
    const product = mockProducts.find(p => p._id === tx.product) || { name: 'Unknown Product' };
    return [{
      type: 'product',
      name: product.name,
      quantity: tx.quantity || 1,
      unitType: tx.unitType || 'Piece',
      pricePerUnit: tx.pricePerUnit || 0,
    }];
  }

  return [];
}

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount || 0);
}

export const formatDate = (dateString) => {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

export { serviceNameById, mockProducts, mockServices };

// Default component
export default function Utils() {
  return (
    <View>
      <Text>Utils</Text>
    </View>
  )
}

const styles = StyleSheet.create({})