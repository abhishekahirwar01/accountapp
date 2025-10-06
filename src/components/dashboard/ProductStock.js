import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { ServiceForm } from '../services/ServiceForm';
import { ProductForm } from '../products/ProductForm';

const INITIAL_PRODUCTS = [
  {
    _id: '1',
    name: 'Laptop Computer',
    type: 'product',
    stocks: 45,
    unit: 'pcs',
    createdByClient: 'client1',
  },
  {
    _id: '2',
    name: 'Wireless Mouse',
    type: 'product',
    stocks: 120,
    unit: 'pcs',
    createdByClient: 'client1',
  },
  {
    _id: '3',
    name: 'USB Cable',
    type: 'product',
    stocks: 200,
    unit: 'pcs',
    createdByClient: 'client1',
  },
  {
    _id: '4',
    name: 'IT Consulting',
    type: 'service',
    stocks: 0,
    unit: null,
    createdByClient: 'client1',
  },
  {
    _id: '5',
    name: 'Web Development',
    type: 'service',
    stocks: 0,
    unit: null,
    createdByClient: 'client1',
  },
];

// ----- Stock Edit Form -----
function StockEditForm({ product, onSuccess, onCancel }) {
  const [newStock, setNewStock] = useState(product.stocks?.toString() || '0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const updated = { ...product, stocks: parseInt(newStock) || 0 };
      onSuccess(updated);
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.label}>Stock for {product.name}</Text>
      <TextInput
        style={styles.input}
        value={newStock}
        onChangeText={setNewStock}
        keyboardType="numeric"
        placeholder="Enter stock quantity"
      />
      <View style={styles.formActions}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.saveButton, isSubmitting && styles.disabledButton]}
          disabled={isSubmitting}
        >
          <Text style={styles.saveButtonText}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ----- Segment Button -----
function Segment({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.segmentBtn, active && styles.segmentBtnActive]}
      activeOpacity={0.9}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ----- Main Component -----
export default function ProductStock() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PRODUCT' | 'SERVICE'

  const role = 'client';

  const filteredProducts = products
    .filter(p => activeTab === 'ALL' || p.type.toUpperCase() === activeTab)
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleEditClick = product => {
    setSelectedProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSuccess = updatedProduct => {
    setProducts(prev =>
      prev.map(p => (p._id === updatedProduct._id ? updatedProduct : p)),
    );
    setIsEditDialogOpen(false);
    setSelectedProduct(null);
    Alert.alert('Success', 'Stock updated successfully!');
  };

  const handleAddProductSuccess = newProduct => {
    const productToAdd = {
      ...newProduct,
      _id: Date.now().toString(),
      type: 'product',
      stocks: Number(newProduct.stocks ?? 0),
      unit: newProduct.unit ?? 'pcs',
      createdByClient: 'client1',
    };
    setProducts(prev => [productToAdd, ...prev]);
    setIsAddProductOpen(false);
    Alert.alert('Product Created!', `${newProduct.name} added.`);
  };

  const handleAddServiceSuccess = newService => {
    const serviceToAdd = {
      _id: Date.now().toString(),
      name: newService.serviceName,
      type: 'service',
      stocks: 0,
      unit: null,
      createdByClient: 'client1',
    };
    setProducts(prev => [serviceToAdd, ...prev]);
    setIsAddServiceOpen(false);
    Alert.alert('Service Created!', `${newService.serviceName} added.`);
  };

  const renderProductItem = ({ item }) => {
    const isService = item.type === 'service';
    return (
      <View style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Feather
              name={isService ? 'server' : 'package'}
              size={20}
              color={isService ? '#8b5cf6' : '#2563eb'}
            />
            <View>
              <Text style={styles.productName}>{item.name}</Text>
              {isService && <Text style={styles.serviceBadge}>Service</Text>}
            </View>
          </View>
          <View style={styles.stockInfo}>
            {isService ? (
              <Text style={styles.noStockText}>— no stock</Text>
            ) : (
              <>
                <Text style={styles.stockQuantity}>{item.stocks}</Text>
                <Text style={styles.unitText}>{item.unit ?? 'NA'}</Text>
              </>
            )}
          </View>
        </View>
        {!isService && role !== 'user' && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditClick(item)}
          >
            <Feather name="edit-3" size={16} color="#374151" />
            <Text style={styles.editButtonText}>Edit Stock</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const ListHeader = () => {
    const countAll = products.length;
    const countProducts = products.filter(p => p.type === 'product').length;
    const countServices = products.filter(p => p.type === 'service').length;

    return (
      <View>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Product & Service Stock</Text>
          <Text style={styles.subtitle}>Current inventory levels</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setIsAddProductOpen(true)}
            >
              <Feather name="plus-circle" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Product</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setIsAddServiceOpen(true)}
            >
              <Feather name="server" size={18} color="#2563eb" />
              <Text style={styles.secondaryButtonText}>Service</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products or services"
            value={searchTerm}
            onChangeText={setSearchTerm}
            keyboardType='visible-password'
          />
        </View>

        {/* Filter Segments */}
        <View style={styles.segmentRow}>
          <Segment
            label={`All (${countAll})`}
            active={activeTab === 'ALL'}
            onPress={() => setActiveTab('ALL')}
          />
          <Segment
            label={`Product (${countProducts})`}
            active={activeTab === 'PRODUCT'}
            onPress={() => setActiveTab('PRODUCT')}
          />
          <Segment
            label={`Services (${countServices})`}
            active={activeTab === 'SERVICE'}
            onPress={() => setActiveTab('SERVICE')}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item._id}
        renderItem={renderProductItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="package" size={32} color="#6b7280" />
            <Text style={styles.emptyTitle}>No Items Found</Text>
            <Text style={styles.emptyDescription}>
              {searchTerm
                ? `No items match "${searchTerm}".`
                : "You haven't added any products or services yet."}
            </Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* Modals */}
      <Modal visible={isEditDialogOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Stock</Text>
            {selectedProduct && (
              <StockEditForm
                product={selectedProduct}
                onSuccess={handleUpdateSuccess}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={isAddProductOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Product</Text>
            <ProductForm
              onSuccess={handleAddProductSuccess}
              onCancel={() => setIsAddProductOpen(false)}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={isAddServiceOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Service</Text>
            <ServiceForm
              onSuccess={handleAddServiceSuccess}
              onCancel={() => setIsAddServiceOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#f9fafb' },
  header: { marginVertical: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1f2937' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  headerActions: { flexDirection: 'row', marginTop: 12, gap: 10 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryButtonText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  secondaryButtonText: { color: '#2563eb', fontWeight: '600', marginLeft: 6 },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 12,
  },
  searchInput: { flex: 1, paddingVertical: 6, marginLeft: 6 },

  segmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  segmentText: { color: '#374151', fontWeight: '600' },
  segmentTextActive: { color: '#fff' },

  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  productName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  serviceBadge: { fontSize: 12, color: '#8b5cf6', fontWeight: '600' },
  stockInfo: { alignItems: 'flex-end' },
  stockQuantity: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  unitText: { fontSize: 12, color: '#6b7280' },
  noStockText: { fontSize: 12, fontStyle: 'italic', color: '#6b7280' },
  editButton: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  editButtonText: { marginLeft: 4, color: '#374151', fontWeight: '600' },

  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 6,
    color: '#374151',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  formContainer: { paddingVertical: 12 },
  label: { fontWeight: '600', marginBottom: 6, color: '#1f2937' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: { color: '#374151', fontWeight: '600' },
  saveButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  saveButtonText: { color: '#fff', fontWeight: '600' },
  disabledButton: { backgroundColor: '#93c5fd' },
});
