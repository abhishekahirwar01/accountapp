import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Button, Switch, Divider } from 'react-native-paper';
import { 
  User, 
  Bell, 
  Save, 
  Users, 
  X, 
  ChevronRight,
  ArrowLeft,
  Mail,
  Phone,
  Globe
} from 'lucide-react-native';

const SettingsScreen = () => {
  const [activeScreen, setActiveScreen] = useState('main');
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Mock data
  const [profileData, setProfileData] = useState({
    fullName: 'Master Administrator',
    email: 'admin@accountech.com',
    phone: '+1 (555) 123-4567',
    timezone: 'utc-5'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    invoiceEmails: true,
    monthlyReports: false,
    securityAlerts: true
  });

  const handleClientClick = (client) => {
    setSelectedClient(client);
    setIsClientDialogOpen(true);
  };

  const handleClientFormSubmit = () => {
    setIsClientDialogOpen(false);
    setSelectedClient(null);
  };

  const SettingCard = ({ icon: Icon, title, description, onPress }) => (
    <TouchableOpacity style={styles.settingCard} onPress={onPress}>
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Icon size={22} color="#007AFF" />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
        <ChevronRight size={20} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  const renderMainSettings = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>MA</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Master Administrator</Text>
            <Text style={styles.userEmail}>admin@accountech.com</Text>
          </View>
        </View>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your account and system preferences</Text>
      </View>

      {/* Settings Cards */}
      <View style={styles.settingsSection}>
        <SettingCard
          icon={User}
          title="Profile Settings"
          description="Update your personal information"
          onPress={() => setActiveScreen('profile')}
        />
        <SettingCard
          icon={Users}
          title="Clients Validity Manager"
          description="Manage client access and validity periods"
          onPress={() => setActiveScreen('clients')}
        />
        <SettingCard
          icon={Bell}
          title="Notification Settings"
          description="Configure how you receive notifications"
          onPress={() => setActiveScreen('notifications')}
        />
      </View>
    </ScrollView>
  );

  const InputField = ({ label, value, onChangeText, placeholder, icon: Icon, ...props }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        {Icon && <Icon size={20} color="#8E8E93" style={styles.inputIcon} />}
        <TextInput
          style={[styles.input, Icon && styles.inputWithIcon]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          {...props}
        />
      </View>
    </View>
  );

  const renderProfileSettings = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.screenHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setActiveScreen('main')}
        >
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Profile Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <Card style={styles.formCard}>
        <Card.Content>
          <View style={styles.form}>
            <InputField
              label="Full Name"
              value={profileData.fullName}
              onChangeText={(text) => setProfileData({...profileData, fullName: text})}
              placeholder="Enter your full name"
              icon={User}
            />

            <InputField
              label="Email Address"
              value={profileData.email}
              onChangeText={(text) => setProfileData({...profileData, email: text})}
              placeholder="Enter your email address"
              keyboardType="email-address"
              icon={Mail}
            />

            <InputField
              label="Phone Number"
              value={profileData.phone}
              onChangeText={(text) => setProfileData({...profileData, phone: text})}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              icon={Phone}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Timezone</Text>
              <TouchableOpacity style={styles.picker}>
                <Globe size={20} color="#8E8E93" style={styles.inputIcon} />
                <Text style={styles.pickerText}>
                  {profileData.timezone === 'utc-5' ? 'Eastern Time (UTC-5)' :
                   profileData.timezone === 'utc-6' ? 'Central Time (UTC-6)' :
                   profileData.timezone === 'utc-7' ? 'Mountain Time (UTC-7)' : 'Pacific Time (UTC-8)'}
                </Text>
                <ChevronRight size={20} color="#C7C7CC" />
              </TouchableOpacity>
            </View>
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="contained" 
            style={styles.saveButton}
            onPress={() => console.log('Profile saved')}
            contentStyle={styles.buttonContent}
          >
            <Save size={20} color="#fff" style={styles.buttonIcon} />
            Save Changes
          </Button>
        </Card.Actions>
      </Card>
    </ScrollView>
  );

  const NotificationToggle = ({ label, description, value, onValueChange }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationText}>
        <Text style={styles.notificationLabel}>{label}</Text>
        <Text style={styles.notificationDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
        thumbColor="#fff"
      />
    </View>
  );

  const renderNotificationSettings = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.screenHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setActiveScreen('main')}
        >
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Notification Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <Card style={styles.formCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Email Notifications</Text>
          
          <NotificationToggle
            label="Invoice Emails"
            description="Receive email notifications for new invoices and payments"
            value={notificationSettings.invoiceEmails}
            onValueChange={(value) => setNotificationSettings({
              ...notificationSettings, 
              invoiceEmails: value
            })}
          />

          <Divider style={styles.divider} />

          <NotificationToggle
            label="Monthly Reports"
            description="Receive monthly financial summary reports via email"
            value={notificationSettings.monthlyReports}
            onValueChange={(value) => setNotificationSettings({
              ...notificationSettings, 
              monthlyReports: value
            })}
          />

          <Divider style={styles.divider} />

          <NotificationToggle
            label="Security Alerts"
            description="Receive email notifications for security-related events"
            value={notificationSettings.securityAlerts}
            onValueChange={(value) => setNotificationSettings({
              ...notificationSettings, 
              securityAlerts: value
            })}
          />
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderClientsSettings = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.screenHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setActiveScreen('main')}
        >
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Clients Validity Manager</Text>
        <View style={styles.placeholder} />
      </View>

      <Card style={styles.formCard}>
        <Card.Content>
          <View style={styles.emptyState}>
            <Users size={64} color="#C7C7CC" />
            <Text style={styles.emptyStateTitle}>Client Management</Text>
            <Text style={styles.emptyStateText}>
              Manage client access, validity periods, and permissions in one place.
            </Text>
            <Button 
              mode="contained" 
              style={styles.primaryButton}
              onPress={() => handleClientClick(null)}
              contentStyle={styles.buttonContent}
            >
              <Users size={20} color="#fff" style={styles.buttonIcon} />
              Add New Client
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderClientDialog = () => (
    <Modal
      visible={isClientDialogOpen}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {selectedClient ? 'Edit Client' : 'Add New Client'}
          </Text>
          <TouchableOpacity 
            onPress={() => setIsClientDialogOpen(false)}
            style={styles.closeButton}
          >
            <X size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalDescription}>
            {selectedClient 
              ? `Update the details for ${selectedClient.contactName}.`
              : 'Fill in the form below to add a new client.'}
          </Text>
          
          <View style={styles.form}>
            <InputField
              label="Client Name"
              placeholder="Enter client name"
              icon={User}
            />
            <InputField
              label="Email Address"
              placeholder="Enter client email"
              keyboardType="email-address"
              icon={Mail}
            />
            <InputField
              label="Phone Number"
              placeholder="Enter client phone"
              keyboardType="phone-pad"
              icon={Phone}
            />
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button 
            mode="outlined" 
            onPress={() => setIsClientDialogOpen(false)}
            style={styles.outlinedButton}
            contentStyle={styles.buttonContent}
          >
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={handleClientFormSubmit}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
          >
            <Save size={20} color="#fff" style={styles.buttonIcon} />
            {selectedClient ? 'Update Client' : 'Add Client'}
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {activeScreen === 'main' && renderMainSettings()}
      {activeScreen === 'profile' && renderProfileSettings()}
      {activeScreen === 'clients' && renderClientsSettings()}
      {activeScreen === 'notifications' && renderNotificationSettings()}
      
      {renderClientDialog()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 8,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  settingsSection: {
    gap: 12,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    zIndex: 1,
  },
  placeholder: {
    width: 40,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 4,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1C1C1E',
  },
  inputWithIcon: {
    paddingLeft: 48,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 16,
  },
  cardActions: {
    justifyContent: 'flex-end',
    padding: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  saveButton: {
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  outlinedButton: {
    borderRadius: 12,
    borderColor: '#C7C7CC',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  notificationText: {
    flex: 1,
    marginRight: 16,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  divider: {
    backgroundColor: '#F2F2F7',
    height: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 24,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
});

export default SettingsScreen;