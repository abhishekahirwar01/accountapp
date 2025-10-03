import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet
} from 'react-native';
import { Loader2, Trash2 } from 'lucide-react-native';

// Mock data for services
const MOCK_SERVICES = [
  { _id: '1', serviceName: 'Annual Maintenance Contract' },
  { _id: '2', serviceName: 'IT Consulting' },
  { _id: '3', serviceName: 'Software Development' },
];

// Mock API responses
const mockApiCall = (success = true, delay = 1000) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (success) {
        resolve({ success: true });
      } else {
        reject(new Error('Mock API error'));
      }
    }, delay);
  });
};

export function ServiceForm({
  service,
  onSuccess,
  onDelete,
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serviceName, setServiceName] = React.useState(service?.serviceName || '');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (service) {
      setServiceName(service.serviceName || '');
    }
  }, [service]);

  const validateForm = () => {
    if (!serviceName.trim() || serviceName.length < 2) {
      setError('Service name is required and must be at least 2 characters long.');
      return false;
    }
    setError('');
    return true;
  };

  async function onSubmit() {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await mockApiCall(true, 1500);

      // Create mock response data
      const mockService = {
        _id: service?._id || String(Date.now()),
        serviceName: serviceName.trim(),
      };

      // Show success feedback
      Alert.alert(
        'Success',
        `Service ${service ? 'updated' : 'created'} successfully!`,
        [{ text: 'OK' }]
      );

      onSuccess(mockService);
    } catch (error) {
      Alert.alert(
        'Operation Failed',
        error instanceof Error ? error.message : 'An unknown error occurred.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!service?._id || !onDelete) return;
    
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this service?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await mockApiCall(true, 1000);
              
              Alert.alert(
                'Service Deleted',
                `${service.serviceName} has been deleted.`,
                [{ text: 'OK' }]
              );

              onDelete(service);
            } catch (error) {
              Alert.alert(
                'Delete Failed',
                error instanceof Error ? error.message : 'An unknown error occurred.',
                [{ text: 'OK' }]
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Service Name Input */}
        <View style={styles.formItem}>
          <Text style={styles.label}>Service Name</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="e.g. Annual Maintenance Contract"
            value={serviceName}
            onChangeText={(text) => {
              setServiceName(text);
              if (error) setError('');
            }}
            editable={!isSubmitting}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          {service && onDelete && (
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={handleDelete}
              disabled={isSubmitting}
            >
              <Trash2 size={16} color="#fff" />
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 size={16} color="#fff" style={styles.spinner} />}
            <Text style={styles.buttonText}>
              {service ? 'Save Changes' : 'Create Service'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  formItem: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  buttonsContainer: {
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
    borderRadius: 6,
    minWidth: 120,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  spinner: {
    animationKeyframes: {
      '0%': { transform: [{ rotate: '0deg' }] },
      '100%': { transform: [{ rotate: '360deg' }] },
    },
    animationDuration: '1s',
    animationIterationCount: 'infinite',
  },
});
