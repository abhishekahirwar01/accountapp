import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react-native';

const STANDARD_UNITS = [
  'Piece',
  'Kg',
  'Litre',
  'Box',
  'Meter',
  'Dozen',
  'Pack',
];
const MOCK_EXISTING_UNITS = [
  { _id: '1', name: 'Bottle' },
  { _id: '2', name: 'Carton' },
  { _id: '3', name: 'Set' },
];

export function ProductForm({
  product,
  onSuccess,
  onCancel,
  initialName,
  visible = true,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: product?.name || initialName || '',
    stocks: product?.stocks?.toString() || '0',
    unit: 'Piece',
    customUnit: '',
    hsn: product?.hsn || '',
  });
  const [errors, setErrors] = useState({});
  const [existingUnits, setExistingUnits] = useState(MOCK_EXISTING_UNITS);
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [searchUnitQuery, setSearchUnitQuery] = useState('');

  useEffect(() => {
    if (product) {
      const defaultUnit = getDefaultUnit(product.unit);
      const defaultCustomUnit = getDefaultCustomUnit(product.unit);
      setFormData({
        name: product.name || '',
        stocks: product.stocks?.toString() || '0',
        unit: defaultUnit,
        customUnit: defaultCustomUnit,
        hsn: product.hsn || '',
      });
    }
  }, [product]);

  const getDefaultUnit = productUnit => {
    const allUnitNames = [...STANDARD_UNITS, ...existingUnits.map(u => u.name)];
    if (!productUnit || allUnitNames.includes(productUnit))
      return productUnit || 'Piece';
    return 'Other';
  };

  const getDefaultCustomUnit = productUnit => {
    const allUnitNames = [...STANDARD_UNITS, ...existingUnits.map(u => u.name)];
    if (!productUnit || allUnitNames.includes(productUnit)) return '';
    return productUnit;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Product name is required.';
    else if (formData.name.trim().length < 2)
      newErrors.name = 'Product name must be at least 2 characters.';

    const stocks = parseInt(formData.stocks);
    if (isNaN(stocks) || stocks < 0)
      newErrors.stocks = 'Stock cannot be negative.';

    if (!formData.unit) newErrors.unit = 'Unit is required.';
    if (formData.unit === 'Other' && !formData.customUnit.trim())
      newErrors.customUnit = 'Custom unit is required.';

    if (!formData.hsn.trim()) newErrors.hsn = 'HSN code is required.';
    else if (!/^\d{4,8}$/.test(formData.hsn.trim()))
      newErrors.hsn = 'HSN code must be 4-8 digits.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    setIsSubmitting(true);

    setTimeout(() => {
      try {
        const finalUnit =
          formData.unit === 'Other' ? formData.customUnit : formData.unit;
        const newProduct = {
          _id: product?._id || Date.now().toString(),
          name: formData.name.trim(),
          stocks: parseInt(formData.stocks) || 0,
          unit: finalUnit,
          hsn: formData.hsn.trim(),
          type: 'product',
          createdByClient: 'client1',
        };
        onSuccess(newProduct);
        if (!product) {
          setFormData({
            name: '',
            stocks: '0',
            unit: 'Piece',
            customUnit: '',
            hsn: '',
          });
        }
      } catch (error) {
        Alert.alert(
          'Operation Failed',
          error?.message || 'An unknown error occurred.',
        );
      } finally {
        setIsSubmitting(false);
      }
    }, 1000);
  };

  const handleUnitSelect = unit => {
    setFormData(prev => ({
      ...prev,
      unit,
      customUnit: unit === 'Other' ? prev.customUnit : '',
    }));
    setUnitModalVisible(false);
    setSearchUnitQuery('');
  };

  const filteredUnits = [
    ...STANDARD_UNITS,
    ...existingUnits.map(u => u.name),
    'Other',
  ].filter(unit => unit.toLowerCase().includes(searchUnitQuery.toLowerCase()));

  const handleDeleteUnit = unitId => {
    Alert.alert('Delete Unit', 'Are you sure you want to delete this unit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          setExistingUnits(prev => prev.filter(u => u._id !== unitId)),
      },
    ]);
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.form}>
        {/* Product Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Product Name</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="e.g. Website Development"
            value={formData.name}
            onChangeText={text =>
              setFormData(prev => ({ ...prev, name: text }))
            }
            editable={!isSubmitting}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Opening Stock */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Opening Stock</Text>
          <TextInput
            style={[styles.input, errors.stocks && styles.inputError]}
            placeholder="0"
            value={formData.stocks}
            onChangeText={text =>
              setFormData(prev => ({ ...prev, stocks: text }))
            }
            keyboardType="numeric"
            editable={!isSubmitting}
          />
          {errors.stocks && (
            <Text style={styles.errorText}>{errors.stocks}</Text>
          )}
        </View>

        {/* Unit Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Unit</Text>
          <TouchableOpacity
            style={[styles.unitSelector, errors.unit && styles.inputError]}
            onPress={() => setUnitModalVisible(true)}
            disabled={isSubmitting}
          >
            <Text
              style={[
                styles.unitSelectorText,
                !formData.unit && styles.unitSelectorPlaceholder,
              ]}
            >
              {formData.unit
                ? formData.unit === 'Other'
                  ? 'Other (Custom)'
                  : formData.unit
                : 'Select unit...'}
            </Text>
            <ChevronsUpDown size={16} color="#6b7280" />
          </TouchableOpacity>
          {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}
        </View>

        {/* Custom Unit */}
        {formData.unit === 'Other' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Custom Unit</Text>
            <TextInput
              style={[styles.input, errors.customUnit && styles.inputError]}
              placeholder="Enter custom unit"
              value={formData.customUnit}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, customUnit: text }))
              }
              editable={!isSubmitting}
            />
            {errors.customUnit && (
              <Text style={styles.errorText}>{errors.customUnit}</Text>
            )}
          </View>
        )}

        {/* HSN Code */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>HSN Code</Text>
          <TextInput
            style={[styles.input, errors.hsn && styles.inputError]}
            placeholder="Enter HSN code"
            value={formData.hsn}
            onChangeText={text => setFormData(prev => ({ ...prev, hsn: text }))}
            keyboardType="numeric"
            editable={!isSubmitting}
          />
          {errors.hsn && <Text style={styles.errorText}>{errors.hsn}</Text>}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {onCancel && (
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              isSubmitting && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {product ? 'Saving...' : 'Creating...'}
                </Text>
              </>
            ) : (
              <Text style={styles.submitButtonText}>
                {product ? 'Save Changes' : 'Create Product'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Unit Selection Modal */}
      <Modal
        visible={unitModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUnitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Unit</Text>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search units..."
                value={searchUnitQuery}
                onChangeText={setSearchUnitQuery}
              />
            </View>
            <FlatList
              data={filteredUnits}
              keyExtractor={(item, index) => `${item}-${index}`}
              style={styles.unitsList}
              renderItem={({ item }) => {
                const isStandardUnit = STANDARD_UNITS.includes(item);
                const existingUnit = existingUnits.find(u => u.name === item);
                const isSelected = formData.unit === item;

                return (
                  <TouchableOpacity
                    style={[
                      styles.unitItem,
                      isSelected && styles.unitItemSelected,
                    ]}
                    onPress={() => handleUnitSelect(item)}
                  >
                    <View style={styles.unitItemContent}>
                      {isSelected ? (
                        <Check size={16} color="#2563eb" />
                      ) : (
                        <View style={styles.checkPlaceholder} />
                      )}
                      <Text
                        style={[
                          styles.unitItemText,
                          isSelected && styles.unitItemTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </View>
                    {existingUnit && !isStandardUnit && (
                      <TouchableOpacity
                        style={styles.deleteUnitButton}
                        onPress={e => {
                          e.stopPropagation();
                          handleDeleteUnit(existingUnit._id);
                        }}
                      >
                        <X size={12} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyUnits}>
                  <Text style={styles.emptyUnitsText}>No unit found.</Text>
                </View>
              }
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setUnitModalVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  unitSelectorText: {
    fontSize: 16,
    color: '#374151',
  },
  unitSelectorPlaceholder: {
    color: '#6b7280',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '500',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#2563eb',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  unitsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  unitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  unitItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  unitItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  checkPlaceholder: {
    width: 16,
    height: 16,
  },
  unitItemText: {
    fontSize: 16,
    color: '#374151',
  },
  unitItemTextSelected: {
    color: '#2563eb',
    fontWeight: '500',
  },
  deleteUnitButton: {
    padding: 4,
    borderRadius: 4,
  },
  emptyUnits: {
    padding: 20,
    alignItems: 'center',
  },
  emptyUnitsText: {
    color: '#6b7280',
    fontSize: 14,
  },
  closeModalButton: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
});

// Modal version for standalone usage
export function ProductFormModal({ visible, onRequestClose, ...props }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onRequestClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.content}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>
              {props.product ? 'Edit Product' : 'Create New Product'}
            </Text>
            <Text style={modalStyles.description}>
              {props.product
                ? 'Update the product details.'
                : 'Fill in the form to add a new product.'}
            </Text>
          </View>
          <ProductForm
            {...props}
            onCancel={onRequestClose}
            onSuccess={product => {
              props.onSuccess(product);
              onRequestClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});
