import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BASE_URL } from '../../config';

import AdminCompanyForm from '../../components/companies/AdminCompanyForm';
import CompanyCard from '../../components/companies/CompanyCard';
import AppLayout from '../../components/layout/AppLayout';

// ---------- UI COMPONENTS ----------
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const Button = ({
  children,
  onPress,
  variant = 'default',
  size = 'default',
  style,
  disabled,
  icon,
  ...props
}) => (
  <TouchableOpacity
    style={[
      styles.button,
      styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
      styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`],
      disabled && styles.buttonDisabled,
      style,
    ]}
    onPress={onPress}
    disabled={disabled}
    {...props}
  >
    {icon && (
      <Icon
        name={icon}
        size={16}
        color={variant === 'outline' ? '#4f46e5' : '#fff'}
        style={styles.buttonIcon}
      />
    )}
    <Text
      style={[
        styles.buttonText,
        styles[
          `buttonText${variant.charAt(0).toUpperCase() + variant.slice(1)}`
        ],
      ]}
    >
      {children}
    </Text>
  </TouchableOpacity>
);

const Dialog = ({ visible, onClose, title, description, children }) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent={true}
    onRequestClose={onClose}
    statusBarTranslucent={true}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.dialogContent}>
        <View style={styles.dialogHeader}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogDescription}>{description}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.dialogBody}>{children}</View>
      </View>
    </View>
  </Modal>
);

const AlertDialog = ({ visible, onClose, title, description, onConfirm }) => (
  <Modal
    visible={visible}
    animationType="fade"
    transparent={true}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.alertDialogContent}>
        <Text style={styles.alertDialogTitle}>{title}</Text>
        <Text style={styles.alertDialogDescription}>{description}</Text>
        <View style={styles.alertDialogActions}>
          <Button
            variant="outline"
            onPress={onClose}
            style={styles.alertDialogButton}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onPress={onConfirm}
            style={styles.alertDialogButton}
          >
            Continue
          </Button>
        </View>
      </View>
    </View>
  </Modal>
);

// ---------- MAIN COMPONENT ----------
export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_HEIGHT = 145;
  const diffClamp = Animated.diffClamp(scrollY, 0, HEADER_HEIGHT);
  const headerTranslateY = diffClamp.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT],
  });

  const fetchAllData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const [companiesRes, clientsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/companies/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!companiesRes.ok || !clientsRes.ok) {
        const errorData = !companiesRes.ok
          ? await companiesRes.json()
          : await clientsRes.json();
        throw new Error(errorData.message || 'Failed to fetch data.');
      }

      const companiesData = await companiesRes.json();
      const clientsData = await clientsRes.json();

      setCompanies(companiesData.reverse());
      setClients(clientsData);
    } catch (error) {
      Alert.alert(
        'Failed to load data',
        error.message || 'Something went wrong.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- Optimized Search Logic ---
  const filteredCompanies = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return companies;

    return companies.filter(company => {
      return (
        company.businessName?.toLowerCase().includes(query) ||
        company.email?.toLowerCase().includes(query) ||
        company.phoneNumber?.toLowerCase().includes(query) ||
        company.address?.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, companies]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllData();
  };

  const handleAddNew = () => {
    setSelectedCompany(null);
    setIsDialogOpen(true);
  };

  const handleEdit = company => {
    setSelectedCompany(company);
    setIsDialogOpen(true);
  };

  const handleDelete = company => {
    setCompanyToDelete(company);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(
        `${BASE_URL}/api/companies/${companyToDelete._id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete company.');
      }

      Alert.alert(
        'Company Deleted',
        `${companyToDelete.businessName} deleted successfully.`,
      );
      fetchAllData();
    } catch (error) {
      Alert.alert('Deletion Failed', error.message || 'Something went wrong.');
    } finally {
      setIsAlertOpen(false);
      setCompanyToDelete(null);
    }
  };

  const onFormSubmit = () => {
    setIsDialogOpen(false);
    fetchAllData();
  };

  const getClientInfo = clientIdentifier => {
    if (!clientIdentifier) return { name: 'N/A', email: 'N/A' };
    let clientId;

    if (typeof clientIdentifier === 'object' && clientIdentifier.contactName) {
      return {
        name: clientIdentifier.contactName,
        email: clientIdentifier.email || 'N/A',
      };
    } else if (typeof clientIdentifier === 'object' && clientIdentifier._id) {
      clientId = clientIdentifier._id;
    } else {
      clientId = String(clientIdentifier);
    }

    const client = clients.find(c => String(c._id) === clientId);
    return {
      name: client?.contactName || 'N/A',
      email: client?.email || 'N/A',
    };
  };

  const renderAnimatedHeader = () => (
    <Animated.View
      style={[
        styles.animatedHeader,
        { transform: [{ translateY: headerTranslateY }] },
      ]}
    >
      {/* <SafeAreaView style={styles.headerSafeArea} edges={['top']}> */}
      <View style={styles.headerInner}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Icon name="office-building" size={24} color="#4f46e5" />
          </View>
          <View style={styles.headerTextContent}>
            <Text style={styles.title}>Company Management</Text>
            <Text style={styles.subtitle}>
              Manage all companies across all clients
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Button onPress={handleAddNew} size="sm" icon="plus">
            Create
          </Button>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Icon
          name="magnify"
          size={20}
          color="#6b7280"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or address..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={Keyboard.dismiss}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Icon name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>
      {/* </SafeAreaView> */}
    </Animated.View>
  );

  const renderEmptyState = () => {
    const isSearching = searchQuery.trim().length > 0;
    return (
      <Card style={styles.emptyStateCard}>
        <Icon
          name={isSearching ? 'magnify-close' : 'office-building'}
          size={48}
          color="#9ca3af"
        />
        <Text style={styles.emptyStateTitle}>
          {isSearching ? 'No Matches Found' : 'No Companies Found'}
        </Text>
        <Text style={styles.emptyStateDescription}>
          {isSearching
            ? `We couldn't find any results for "${searchQuery}".`
            : 'Get started by creating the first company.'}
        </Text>
        <Button
          onPress={isSearching ? () => setSearchQuery('') : handleAddNew}
          variant={isSearching ? 'outline' : 'default'}
          style={styles.emptyStateButton}
        >
          {isSearching ? 'Clear Search' : 'Create Company'}
        </Button>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading companies...</Text>
      </SafeAreaView>
    );
  }

  return (
    <AppLayout>
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        {renderAnimatedHeader()}

        <Animated.FlatList
          data={filteredCompanies}
          renderItem={({ item }) => (
            <CompanyCard
              company={item}
              clientName={
                getClientInfo(item.selectedClient || item.client).name
              }
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          keyExtractor={item => item._id}
          contentContainerStyle={[
            filteredCompanies.length === 0
              ? styles.emptyListContent
              : styles.listContent,
            { paddingTop: 120 }, // Adjusted for tight UI spacing
          ]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              progressViewOffset={160}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />

        <Dialog
          visible={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title={selectedCompany ? 'Edit Company' : 'Create New Company'}
          description={
            selectedCompany
              ? `Update details for ${selectedCompany.businessName}.`
              : 'Fill in the form to create a new company.'
          }
        >
          <AdminCompanyForm
            company={selectedCompany || undefined}
            clients={clients}
            onFormSubmit={onFormSubmit}
          />
        </Dialog>

        <AlertDialog
          visible={isAlertOpen}
          onClose={() => setIsAlertOpen(false)}
          title="Are you absolutely sure?"
          description={`This action cannot be undone. This will permanently delete ${companyToDelete?.businessName}.`}
          onConfirm={confirmDelete}
        />
      </SafeAreaView>
    </AppLayout>
  );
}

// ---------- STYLES ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6b7280' },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    zIndex: 10,
    elevation: 4,
  },
  headerSafeArea: { backgroundColor: '#fff' },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContent: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280' },
  headerRight: { marginLeft: 8 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, fontSize: 14, color: '#111827' },
  clearButton: { padding: 4 },
  emptyListContent: { flexGrow: 1, justifyContent: 'center' },
  listContent: { paddingBottom: 20, paddingHorizontal: 0 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonDefault: { backgroundColor: '#4f46e5' },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
  },
  buttonDestructive: { backgroundColor: '#ef4444' },
  buttonSm: { paddingHorizontal: 12, paddingVertical: 6 },
  buttonDisabled: { opacity: 0.5 },
  buttonIcon: { marginRight: 6 },
  buttonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  buttonTextOutline: { color: '#374151' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '95%',
    height: '90%',
  },
  dialogHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dialogTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  dialogDescription: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  closeButton: { position: 'absolute', top: 16, right: 16 },
  dialogBody: { flex: 1 },
  alertDialogContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  alertDialogTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  alertDialogDescription: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  alertDialogActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  emptyStateCard: {
    alignItems: 'center',
    padding: 40,
    margin: 16,
    backgroundColor: '#fff',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: { paddingHorizontal: 24 },
});
