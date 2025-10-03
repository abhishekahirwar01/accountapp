import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import { Check, ChevronDown, X, Loader2 } from 'lucide-react-native';

// Mock data for demonstration
const MOCK_UNITS = [
  { _id: '1', name: 'Piece' },
  { _id: '2', name: 'Kg' },
  { _id: '3', name: 'Litre' },
  { _id: '4', name: 'Box' },
  { _id: '5', name: 'Meter' },
  { _id: '6', name: 'Dozen' },
  { _id: '7', name: 'Pack' },
  { _id: '8', name: 'Custom Unit 1' },
  { _id: '9', name: 'Custom Unit 2' },
];

const MOCK_PRODUCTS = [
  {
    _id: '1',
    name: 'Sample Product',
    stocks: 10,
    unit: 'Piece'
  }
];

const ProductForm = ({
  product,
  onSuccess,
  initialName = '',
  productType,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingUnits, setExistingUnits] = useState(MOCK_UNITS);
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: product?.name || initialName || '',
    stocks: product?.stocks?.toString() || '0',
    unit: getDefaultUnit(product?.unit),
    customUnit: getDefaultCustomUnit(product?.unit),
  });
  const [errors, setErrors] = useState({});

  function getDefaultUnit(productUnit) {
    const standardUnits = ['Piece', 'Kg', 'Litre', 'Box', 'Meter', 'Dozen', 'Pack'];
    const existingUnitNames = existingUnits.map(u => u.name);
    if (!productUnit || standardUnits.includes(productUnit) || existingUnitNames.includes(productUnit)) {
      return productUnit || 'Piece';
    }
    return 'Other';
  }

  function getDefaultCustomUnit(productUnit) {
    const standardUnits = ['Piece', 'Kg', 'Litre', 'Box', 'Meter', 'Dozen', 'Pack'];
    const existingUnitNames = existingUnits.map(u => u.name);
    if (!productUnit || standardUnits.includes(productUnit) || existingUnitNames.includes(productUnit)) {
      return '';
    }
    return productUnit;
  }

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = 'Product name is required.';
    }

    const stocks = parseInt(formData.stocks);
    if (isNaN(stocks) || stocks < 0) {
      newErrors.stocks = 'Stock cannot be negative.';
    }

    if (!formData.unit || formData.unit === 'Select unit...') {
      newErrors.unit = 'Unit is required.';
    }

    if (formData.unit === 'Other' && (!formData.customUnit || formData.customUnit.length === 0)) {
      newErrors.customUnit = 'Custom unit is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDeleteUnit = (unitId) => {
    Alert.alert(
      'Delete Unit',
      'Are you sure you want to delete this unit?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedUnits = existingUnits.filter(unit => unit._id !== unitId);
            setExistingUnits(updatedUnits);
            
            // If deleted unit was selected, reset to default
            if (formData.unit === existingUnits.find(u => u._id === unitId)?.name) {
              setFormData(prev => ({ ...prev, unit: 'Piece' }));
            }
            
            Alert.alert('Success', 'Unit deleted successfully.');
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalUnit = formData.unit === 'Other' ? formData.customUnit : formData.unit;

      const productData = {
        _id: product?._id || Date.now().toString(),
        name: formData.name,
        stocks: parseInt(formData.stocks),
        unit: finalUnit,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Simulate successful operation
      onSuccess(productData);

      Alert.alert(
        'Success',
        `Product ${product ? 'updated' : 'created'} successfully!`
      );

    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUnits = existingUnits.filter(unit =>
    unit.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const standardUnits = ['Piece', 'Kg', 'Litre', 'Box', 'Meter', 'Dozen', 'Pack'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Product Name Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Product Name</Text>
          <TextInput
            style={[
              styles.input,
              errors.name && styles.inputError
            ]}
            placeholder="e.g. Website Development"
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Opening Stock Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Opening Stock</Text>
          <TextInput
            style={[
              styles.input,
              errors.stocks && styles.inputError
            ]}
            placeholder="0"
            value={formData.stocks}
            onChangeText={(text) => setFormData(prev => ({ ...prev, stocks: text }))}
            keyboardType="numeric"
          />
          {errors.stocks && <Text style={styles.errorText}>{errors.stocks}</Text>}
        </View>

        {/* Unit Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Unit</Text>
          <TouchableOpacity
            style={[
              styles.unitSelector,
              errors.unit && styles.inputError
            ]}
            onPress={() => setUnitModalVisible(true)}
          >
            <Text style={styles.unitSelectorText}>
              {formData.unit === 'Other' ? 'Other (Custom)' : formData.unit || 'Select unit...'}
            </Text>
            <ChevronDown size={20} color="#666" />
          </TouchableOpacity>
          {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}
        </View>

        {/* Custom Unit Field */}
        {formData.unit === 'Other' && (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Custom Unit</Text>
            <TextInput
              style={[
                styles.input,
                errors.customUnit && styles.inputError
              ]}
              placeholder="Enter custom unit"
              value={formData.customUnit}
              onChangeText={(text) => setFormData(prev => ({ ...prev, customUnit: text }))}
            />
            {errors.customUnit && <Text style={styles.errorText}>{errors.customUnit}</Text>}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 size={20} color="#fff" style={styles.loader} />}
          <Text style={styles.submitButtonText}>
            {product ? 'Save Changes' : 'Create Product'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Unit Selection Modal */}
      <Modal
        visible={unitModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUnitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity
                onPress={() => setUnitModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search units..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView style={styles.unitsList}>
              {/* Standard Units */}
              <View style={styles.unitGroup}>
                <Text style={styles.unitGroupTitle}>Standard Units</Text>
                {standardUnits.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitItem,
                      formData.unit === unit && styles.unitItemSelected
                    ]}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, unit }));
                      setUnitModalVisible(false);
                    }}
                  >
                    <View style={styles.unitItemContent}>
                      <Check
                        size={20}
                        color={formData.unit === unit ? '#007AFF' : 'transparent'}
                      />
                      <Text style={styles.unitItemText}>{unit}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Existing Custom Units */}
              {filteredUnits.filter(unit => !standardUnits.includes(unit.name)).length > 0 && (
                <View style={styles.unitGroup}>
                  <Text style={styles.unitGroupTitle}>Custom Units</Text>
                  {filteredUnits
                    .filter(unit => !standardUnits.includes(unit.name))
                    .map((unit) => (
                      <TouchableOpacity
                        key={unit._id}
                        style={[
                          styles.unitItem,
                          formData.unit === unit.name && styles.unitItemSelected
                        ]}
                        onPress={() => {
                          setFormData(prev => ({ ...prev, unit: unit.name }));
                          setUnitModalVisible(false);
                        }}
                      >
                        <View style={styles.unitItemContent}>
                          <Check
                            size={20}
                            color={formData.unit === unit.name ? '#007AFF' : 'transparent'}
                          />
                          <Text style={styles.unitItemText}>{unit.name}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteUnitButton}
                          onPress={() => handleDeleteUnit(unit._id)}
                        >
                          <X size={16} color="#FF3B30" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              {/* Other Option */}
              <TouchableOpacity
                style={[
                  styles.unitItem,
                  formData.unit === 'Other' && styles.unitItemSelected
                ]}
                onPress={() => {
                  setFormData(prev => ({ ...prev, unit: 'Other' }));
                  setUnitModalVisible(false);
                }}
              >
                <View style={styles.unitItemContent}>
                  <Check
                    size={20}
                    color={formData.unit === 'Other' ? '#007AFF' : 'transparent'}
                  />
                  <Text style={styles.unitItemText}>Other</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 4,
  },
  unitSelector: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  unitSelectorText: {
    fontSize: 16,
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loader: {
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  unitsList: {
    maxHeight: 400,
  },
  unitGroup: {
    marginBottom: 16,
  },
  unitGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  unitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unitItemSelected: {
    backgroundColor: '#F0F9FF',
  },
  unitItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unitItemText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  deleteUnitButton: {
    padding: 4,
  },
});

export default ProductForm;