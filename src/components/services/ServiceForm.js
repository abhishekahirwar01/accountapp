import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Trash2 } from 'lucide-react-native';

export function ServiceForm({
  service,
  onSuccess,
  onDelete,
  onCancel,
  visible = true,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceName, setServiceName] = useState(service?.serviceName || '');
  const [sacCode, setSacCode] = useState(service?.sacCode || '');
  const [errors, setErrors] = useState({});
  const [sacSuggestions, setSacSuggestions] = useState([]);

  useEffect(() => {
    setServiceName(service?.serviceName || '');
    setSacCode(service?.sacCode || '');
    setErrors({});
  }, [service]);

  // Simple mock SAC codes for suggestion
  const MOCK_SAC_CODES = ['9954', '9987', '9963', '9951', '9959'];

  useEffect(() => {
    if (sacCode.length >= 2) {
      setSacSuggestions(
        MOCK_SAC_CODES.filter(code => code.startsWith(sacCode)),
      );
    } else {
      setSacSuggestions([]);
    }
  }, [sacCode]);

  const validateForm = () => {
    const newErrors = {};
    if (!serviceName.trim())
      newErrors.serviceName = 'Service name is required.';
    else if (serviceName.trim().length < 2)
      newErrors.serviceName = 'Service name must be at least 2 characters.';

    if (!sacCode.trim()) newErrors.sacCode = 'SAC Code is required.';
    else if (!/^\d+$/.test(sacCode.trim()))
      newErrors.sacCode = 'SAC Code must be numeric.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    setIsSubmitting(true);

    setTimeout(() => {
      try {
        const newService = {
          _id: service?._id || Date.now().toString(),
          serviceName: serviceName.trim(),
          sacCode: sacCode.trim(),
        };
        onSuccess(newService);
        if (!service) {
          setServiceName('');
          setSacCode('');
        }
      } catch (error) {
        Alert.alert(
          'Operation Failed',
          error?.message || 'Unknown error occurred.',
        );
      } finally {
        setIsSubmitting(false);
      }
    }, 1000);
  };

  const handleDelete = () => {
    if (!service?._id || !onDelete) return;

    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setIsSubmitting(true);
            setTimeout(() => {
              try {
                Alert.alert(
                  'Service Deleted',
                  `${service.serviceName} deleted successfully.`,
                );
                onDelete(service);
              } catch (error) {
                Alert.alert(
                  'Delete Failed',
                  error?.message || 'Unknown error.',
                );
              } finally {
                setIsSubmitting(false);
              }
            }, 1000);
          },
        },
      ],
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        {/* Service Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Service Name</Text>
          <TextInput
            style={[styles.input, errors.serviceName && styles.inputError]}
            placeholder="e.g. Annual Maintenance Contract"
            value={serviceName}
            onChangeText={setServiceName}
            editable={!isSubmitting}
          />
          {errors.serviceName && (
            <Text style={styles.errorText}>{errors.serviceName}</Text>
          )}
        </View>

        {/* SAC Code */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>SAC Code</Text>
          <TextInput
            style={[styles.input, errors.sacCode && styles.inputError]}
            placeholder="Search SAC code (e.g., 9954)"
            value={sacCode}
            onChangeText={setSacCode}
            editable={!isSubmitting}
            keyboardType="numeric"
          />
          {errors.sacCode && (
            <Text style={styles.errorText}>{errors.sacCode}</Text>
          )}

          {/* SAC Suggestions */}
          {sacSuggestions.length > 0 && (
            <View style={styles.suggestions}>
              <FlatList
                data={sacSuggestions}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setSacCode(item)}
                    style={styles.suggestionItem}
                  >
                    <Text>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
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

          {service && onDelete && (
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={handleDelete}
              disabled={isSubmitting}
            >
              <Trash2 size={16} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete</Text>
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
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.submitButtonText}>
                  {service ? 'Saving...' : 'Creating...'}
                </Text>
              </>
            ) : (
              <Text style={styles.submitButtonText}>
                {service ? 'Save Changes' : 'Create Service'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Styles (updated to include suggestions)
const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  form: { padding: 16 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  suggestions: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 100,
    backgroundColor: '#fff',
  },
  suggestionItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
    flexWrap: 'wrap',
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
  cancelButtonText: { color: '#6b7280', fontWeight: '500', fontSize: 14 },
  deleteButton: { backgroundColor: '#ef4444' },
  deleteButtonText: { color: '#fff', fontWeight: '500', fontSize: 14 },
  submitButton: { backgroundColor: '#2563eb' },
  disabledButton: { backgroundColor: '#9ca3af' },
  submitButtonText: { color: '#fff', fontWeight: '500', fontSize: 14 },
});
