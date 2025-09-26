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
  ArrowLeft
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

  const renderMainSettings = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your account and system preferences</Text>
      </View>

      {/* Profile Settings Card */}
      <Card style={styles.card} onPress={() => setActiveScreen('profile')}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <User size={24} color="#666" />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Profile Settings</Text>
                <Text style={styles.cardDescription}>Update your personal information</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#666" />
          </View>
        </Card.Content>
      </Card>

      {/* Clients Validity Manager Card */}
      <Card style={styles.card} onPress={() => setActiveScreen('clients')}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Users size={24} color="#666" />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Clients Validity Manager</Text>
                <Text style={styles.cardDescription}>Manage client access and validity periods</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#666" />
          </View>
        </Card.Content>
      </Card>

      {/* Notification Settings Card */}
      <Card style={styles.card} onPress={() => setActiveScreen('notifications')}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Bell size={24} color="#666" />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Notification Settings</Text>
                <Text style={styles.cardDescription}>Configure how you receive notifications</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#666" />
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderProfileSettings = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setActiveScreen('main')}
        >
          <ArrowLeft size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile Settings</Text>
        <Text style={styles.subtitle}>Update your personal information</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={profileData.fullName}
                onChangeText={(text) => setProfileData({...profileData, fullName: text})}
                placeholder="Enter full name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={profileData.email}
                onChangeText={(text) => setProfileData({...profileData, email: text})}
                placeholder="Enter email address"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={profileData.phone}
                onChangeText={(text) => setProfileData({...profileData, phone: text})}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Timezone</Text>
              <View style={styles.picker}>
                <Text style={styles.pickerText}>
                  {profileData.timezone === 'utc-5' ? 'Eastern Time (UTC-5)' :
                   profileData.timezone === 'utc-6' ? 'Central Time (UTC-6)' :
                   profileData.timezone === 'utc-7' ? 'Mountain Time (UTC-7)' : 'Pacific Time (UTC-8)'}
                </Text>
              </View>
            </View>
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="contained" 
            style={styles.saveButton}
            onPress={() => console.log('Profile saved')}
          >
            <Save size={20} color="#fff" style={styles.buttonIcon} />
            Save Profile
          </Button>
        </Card.Actions>
      </Card>
    </ScrollView>
  );

  const renderClientsSettings = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setActiveScreen('main')}
        >
          <ArrowLeft size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.title}>Clients Validity Manager</Text>
        <Text style={styles.subtitle}>Manage client access and validity periods</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionText}>
            Client validity management functionality will be implemented here.
          </Text>
          <Button 
            mode="outlined" 
            style={styles.addButton}
            onPress={() => handleClientClick(null)}
          >
            <Users size={20} style={styles.buttonIcon} />
            Add New Client
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderNotificationSettings = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setActiveScreen('main')}
        >
          <ArrowLeft size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.title}>Notification Settings</Text>
        <Text style={styles.subtitle}>Configure how you receive notifications</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.switchContainer}>
            <View style={styles.switchItem}>
              <View style={styles.switchText}>
                <Text style={styles.switchLabel}>Invoice Emails</Text>
                <Text style={styles.switchDescription}>
                  Receive email notifications for new invoices and payments.
                </Text>
              </View>
              <Switch
                value={notificationSettings.invoiceEmails}
                onValueChange={(value) => setNotificationSettings({
                  ...notificationSettings, 
                  invoiceEmails: value
                })}
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.switchItem}>
              <View style={styles.switchText}>
                <Text style={styles.switchLabel}>Monthly Reports</Text>
                <Text style={styles.switchDescription}>
                  Receive monthly financial summary reports via email.
                </Text>
              </View>
              <Switch
                value={notificationSettings.monthlyReports}
                onValueChange={(value) => setNotificationSettings({
                  ...notificationSettings, 
                  monthlyReports: value
                })}
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.switchItem}>
              <View style={styles.switchText}>
                <Text style={styles.switchLabel}>Security Alerts</Text>
                <Text style={styles.switchDescription}>
                  Receive email notifications for security-related events.
                </Text>
              </View>
              <Switch
                value={notificationSettings.securityAlerts}
                onValueChange={(value) => setNotificationSettings({
                  ...notificationSettings, 
                  securityAlerts: value
                })}
              />
            </View>
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
          <TouchableOpacity 
            onPress={() => setIsClientDialogOpen(false)}
            style={styles.closeButton}
          >
            <X size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {selectedClient ? 'Edit Client' : 'Add New Client'}
          </Text>
          <Text style={styles.modalDescription}>
            {selectedClient 
              ? `Update the details for ${selectedClient.contactName}.`
              : 'Fill in the form below to add a new client.'}
          </Text>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Client Form would go here */}
          <Text style={styles.sectionText}>
            Client form implementation would go here.
          </Text>
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button 
            mode="contained" 
            onPress={handleClientFormSubmit}
            style={styles.saveButton}
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
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  backButton: {
    padding: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardText: {
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  pickerText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  cardActions: {
    justifyContent: 'flex-end',
    padding: 16,
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 6,
  },
  addButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  switchContainer: {
    gap: 0,
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchText: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  divider: {
    marginVertical: 8,
  },
  sectionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});

export default SettingsScreen;