import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch as RNSwitch,
  StyleSheet,
  Button,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../hooks/useToast';
import ClientValidityCard from '../admin/settings/ClientValidityCard';
import { BASE_URL } from '../../config';

function slugifyUsername(s = '') {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_.]+/g, '')
    .slice(0, 24);
}

function localSuggestions(base = '', tried) {
  const core = slugifyUsername(base) || 'user';
  const y = new Date().getFullYear().toString();
  const seeds = [
    core,
    `${core}1`,
    `${core}123`,
    `${core}${y.slice(-2)}`,
    `${core}${y}`,
    `${core}_official`,
    `${core}_hq`,
    `real${core}`,
    `${core}_co`,
    `${core}_app`,
  ];
  return Array.from(new Set(seeds))
    .filter(s => s && s !== tried)
    .slice(0, 6);
}

export default function ClientForm({
  client,
  onSubmit: parentOnSubmit,
  onCancel,
  hideAdvanced = false,
}) {
  const { toast } = useToast();

  // form state
  const [contactName, setContactName] = useState(client?.contactName || '');
  const [clientUsername, setClientUsername] = useState(
    client?.clientUsername || '',
  );
  const [email, setEmail] = useState(client?.email || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [password, setPassword] = useState('');
  const [maxCompanies, setMaxCompanies] = useState(client?.maxCompanies ?? 5);
  const [maxUsers, setMaxUsers] = useState(client?.maxUsers ?? 10);
  const [maxInventories, setMaxInventories] = useState(
    client?.maxInventories ?? 50,
  );
  const [canSendInvoiceEmail, setCanSendInvoiceEmail] = useState(
    client?.canSendInvoiceEmail ?? false,
  );
  const [canSendInvoiceWhatsapp, setCanSendInvoiceWhatsapp] = useState(
    client?.canSendInvoiceWhatsapp ?? false,
  );
  const [canCreateUsers, setCanCreateUsers] = useState(
    client?.canCreateUsers ?? true,
  );
  const [canCreateCustomers, setCanCreateCustomers] = useState(
    client?.canCreateCustomers ?? true,
  );
  const [canCreateVendors, setCanCreateVendors] = useState(
    client?.canCreateVendors ?? true,
  );
  const [canCreateProducts, setCanCreateProducts] = useState(
    client?.canCreateProducts ?? true,
  );
  const [canCreateCompanies, setCanCreateCompanies] = useState(
    client?.canCreateCompanies ?? false,
  );
  const [canUpdateCompanies, setCanUpdateCompanies] = useState(
    client?.canUpdateCompanies ?? false,
  );
  const [validityAmount, setValidityAmount] = useState(30);
  const [validityUnit, setValidityUnit] = useState('days');
  const [eyeOpen, setEyeOpen] = useState(false);

  // Permissions management state
  const [currentPermissions, setCurrentPermissions] = useState({
    maxCompanies: client?.maxCompanies || 5,
    maxUsers: client?.maxUsers || 10,
    maxInventories: client?.maxInventories || 50,
    canSendInvoiceEmail: client?.canSendInvoiceEmail || false,
    canSendInvoiceWhatsapp: client?.canSendInvoiceWhatsapp || false,
    canCreateUsers: client?.canCreateUsers || true,
    canCreateCustomers: client?.canCreateCustomers || true,
    canCreateVendors: client?.canCreateVendors || true,
    canCreateProducts: client?.canCreateProducts || true,
    canCreateCompanies: client?.canCreateCompanies || false,
    canUpdateCompanies: client?.canUpdateCompanies || false,
  });

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [eyeOpenPassword, setEyeOpenPassword] = useState(false);

  // UX / async state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null); // true | false | null
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [authToken, setAuthToken] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // load token
  useEffect(() => {
    AsyncStorage.getItem('token')
      .then(t => setAuthToken(t))
      .catch(() => setAuthToken(null));
  }, []);

  // expiry preview for create mode
  const expiryPreview = useMemo(() => {
    if (client) return null;
    const d = new Date();
    if (validityUnit === 'days')
      d.setDate(d.getDate() + Number(validityAmount));
    if (validityUnit === 'months')
      d.setMonth(d.getMonth() + Number(validityAmount));
    if (validityUnit === 'years')
      d.setFullYear(d.getFullYear() + Number(validityAmount));
    return d.toDateString();
  }, [validityAmount, validityUnit, client]);

  // username availability check (debounced)
  useEffect(() => {
    if (client) {
      // editing existing client — skip availability checks
      setUsernameAvailable(true);
      setUsernameSuggestions([]);
      setCheckingUsername(false);
      return;
    }

    const raw = (clientUsername || '').trim().toLowerCase();
    if (!raw) {
      setUsernameAvailable(null);
      setUsernameSuggestions([]);
      setCheckingUsername(false);
      return;
    }

    // local validation
    if (!/^[a-z0-9_.]{4,24}$/.test(raw)) {
      setUsernameAvailable(false);
      setUsernameSuggestions(localSuggestions(contactName || raw, raw));
      setCheckingUsername(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setCheckingUsername(true);
    setUsernameAvailable(null);

    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          username: raw,
          base: contactName || raw,
        });
        const res = await fetch(
          `${BASE_URL}/api/clients/check-username?${params.toString()}`,
          {
            method: 'GET',
            signal: controller.signal,
          },
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || !data?.ok) {
          // transient failure: don't block
          setUsernameAvailable(null);
          setUsernameSuggestions([]);
        } else if (data.available) {
          setUsernameAvailable(true);
          setUsernameSuggestions([]);
        } else {
          setUsernameAvailable(false);
          setUsernameSuggestions(
            (data.suggestions?.length
              ? data.suggestions
              : localSuggestions(contactName || raw, raw)
            ).slice(0, 6),
          );
        }
      } catch {
        if (!cancelled) {
          setUsernameAvailable(null);
          setUsernameSuggestions([]);
        }
      } finally {
        if (!cancelled) setCheckingUsername(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(t);
      setCheckingUsername(false);
    };
  }, [clientUsername, contactName, client]);

  // Load permissions when in edit mode and permissions tab is active
  useEffect(() => {
    if (client && activeTab === 'permissions' && !permissionsLoaded) {
      loadPermissions();
    }
  }, [client, activeTab, permissionsLoaded]);

  // Update local state when client prop changes (edit mode)
  useEffect(() => {
    if (!client) return;
    setContactName(client.contactName || '');
    setClientUsername(client.clientUsername || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setMaxCompanies(client.maxCompanies ?? 5);
    setMaxUsers(client.maxUsers ?? 10);
    setMaxInventories(client.maxInventories ?? 50);
    setCanSendInvoiceEmail(client.canSendInvoiceEmail ?? false);
    setCanSendInvoiceWhatsapp(client.canSendInvoiceWhatsapp ?? false);
    setCanCreateUsers(client.canCreateUsers ?? true);
    setCanCreateCustomers(client.canCreateCustomers ?? true);
    setCanCreateVendors(client.canCreateVendors ?? true);
    setCanCreateProducts(client.canCreateProducts ?? true);
    setCanCreateCompanies(client.canCreateCompanies ?? false);
    setCanUpdateCompanies(client.canUpdateCompanies ?? false);
  }, [client]);

  const validateClientForm = useCallback(() => {
    if (!contactName || contactName.trim().length < 2) {
      toast({
        variant: 'destructive',
        title: 'Validation',
        description: 'Contact name must be at least 2 characters.',
      });
      return false;
    }
    if (
      !client &&
      (!clientUsername ||
        clientUsername.length < 4 ||
        !/^[a-z0-9_.]{4,24}$/.test(clientUsername))
    ) {
      toast({
        variant: 'destructive',
        title: 'Validation',
        description:
          'Username must be 4–24 chars: lowercase letters, digits, dot or underscore.',
      });
      return false;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast({
        variant: 'destructive',
        title: 'Validation',
        description: 'Enter a valid email.',
      });
      return false;
    }
    if (!phone || phone.trim().length < 6) {
      toast({
        variant: 'destructive',
        title: 'Validation',
        description: 'Enter a valid phone number.',
      });
      return false;
    }
    if (!client && (!password || password.length < 6)) {
      toast({
        variant: 'destructive',
        title: 'Validation',
        description: 'Password must be at least 6 characters.',
      });
      return false;
    }
    if (checkingUsername) {
      toast({
        variant: 'destructive',
        title: 'Please wait',
        description: 'Still checking username availability.',
      });
      return false;
    }
    if (!client && usernameAvailable === false) {
      toast({
        variant: 'destructive',
        title: 'Username taken',
        description: 'Choose a different username.',
      });
      return false;
    }
    return true;
  }, [
    contactName,
    clientUsername,
    email,
    phone,
    password,
    checkingUsername,
    usernameAvailable,
    client,
    toast,
  ]);

  const applyServerErrorsToUI = message => {
    const lower = (message || '').toLowerCase();
    if (lower.includes('username')) {
      setUsernameAvailable(false);
      setUsernameSuggestions(
        localSuggestions(contactName || clientUsername, clientUsername).slice(
          0,
          6,
        ),
      );
      toast({
        variant: 'destructive',
        title: 'Username error',
        description: message,
      });
      return true;
    }
    if (lower.includes('email')) {
      toast({
        variant: 'destructive',
        title: 'Email error',
        description: message,
      });
      return true;
    }
    if (lower.includes('phone')) {
      toast({
        variant: 'destructive',
        title: 'Phone error',
        description: message,
      });
      return true;
    }
    return false;
  };

  // Load permissions function
  const loadPermissions = async () => {
    if (!client) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(
        `${BASE_URL}/api/clients/${client._id}/permissions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        setCurrentPermissions({
          maxCompanies: data.maxCompanies,
          maxUsers: data.maxUsers,
          maxInventories: data.maxInventories,
          canSendInvoiceEmail: data.canSendInvoiceEmail,
          canSendInvoiceWhatsapp: data.canSendInvoiceWhatsapp,
          canCreateUsers: data.canCreateUsers,
          canCreateCustomers: data.canCreateCustomers,
          canCreateVendors: data.canCreateVendors,
          canCreateProducts: data.canCreateProducts,
          canCreateCompanies: data.canCreateCompanies,
          canUpdateCompanies: data.canUpdateCompanies,
        });
      } else {
        // Fallback to client data if permissions are not explicitly set
        setCurrentPermissions({
          maxCompanies: client.maxCompanies || 5,
          maxUsers: client.maxUsers || 10,
          maxInventories: client.maxInventories || 50,
          canSendInvoiceEmail: client.canSendInvoiceEmail || false,
          canSendInvoiceWhatsapp: client.canSendInvoiceWhatsapp || false,
          canCreateUsers: client.canCreateUsers || true,
          canCreateCustomers: client.canCreateCustomers || true,
          canCreateVendors: client.canCreateVendors || true,
          canCreateProducts: client.canCreateProducts || true,
          canCreateCompanies: client.canCreateCompanies || false,
          canUpdateCompanies: client.canUpdateCompanies || false,
        });
      }
    } catch (error) {
      // Fallback in case of network error etc.
      setCurrentPermissions({
        maxCompanies: client.maxCompanies || 5,
        maxUsers: client.maxUsers || 10,
        maxInventories: client.maxInventories || 50,
        canSendInvoiceEmail: client.canSendInvoiceEmail || false,
        canSendInvoiceWhatsapp: client.canSendInvoiceWhatsapp || false,
        canCreateUsers: client.canCreateUsers || true,
        canCreateCustomers: client.canCreateCustomers || true,
        canCreateVendors: client.canCreateVendors || true,
        canCreateProducts: client.canCreateProducts || true,
        canCreateCompanies: client.canCreateCompanies || false,
        canUpdateCompanies: client.canUpdateCompanies || false,
      });
    }
    setPermissionsLoaded(true);
  };

  const handlePermissionChange = (field, value) => {
    setCurrentPermissions(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePermissions = async () => {
    if (!client) return;
    setIsSavingPermissions(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(
        `${BASE_URL}/api/clients/${client._id}/permissions`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(currentPermissions),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update permissions.');
      }

      toast({
        title: 'Permissions Updated',
        description: `Permissions for ${client.contactName} have been saved.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description:
          error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  // Password reset function
  const handleResetPassword = async () => {
    if (!client || !newPassword) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'New password cannot be empty.',
      });
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(
        `${BASE_URL}/api/clients/reset-password/${client._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newpassword: newPassword }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to reset password.');
      }

      toast({
        title: 'Password Reset Successful',
        description: `Password for ${client.contactName} has been updated.`,
      });

      setNewPassword('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Password Reset Failed',
        description:
          error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateClientForm()) return;
    setIsSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Auth required',
          description: 'You must be logged in.',
        });
        setIsSubmitting(false);
        return;
      }

      const url = client
        ? `${BASE_URL}/api/clients/${client._id}`
        : `${BASE_URL}/api/clients`;
      const method = client ? 'PATCH' : 'POST';

      const body = {
        contactName: contactName.trim(),
        clientUsername: clientUsername.trim(),
        email: email.trim(),
        phone: phone.trim(),
        maxCompanies,
        maxUsers,
        maxInventories,
        canSendInvoiceEmail,
        canSendInvoiceWhatsapp,
        canCreateUsers,
        canCreateCustomers,
        canCreateVendors,
        canCreateProducts,
        canCreateCompanies,
        canUpdateCompanies,
      };

      if (!client) {
        body.password = password;
        body.validity = { amount: Number(validityAmount), unit: validityUnit };
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || 'Failed to save client';
        applyServerErrorsToUI(msg);
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: msg,
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: `Client ${client ? 'updated' : 'created'}`,
        description: `${contactName} saved.`,
      });
      parentOnSubmit?.(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      applyServerErrorsToUI(msg);
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tab navigation for edit mode
  const renderTabButton = (tabName, label) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabName && styles.activeTab]}
      onPress={() => setActiveTab(tabName)}
    >
      <Text
        style={[styles.tabText, activeTab === tabName && styles.activeTabText]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // General Form Section
  const renderGeneralForm = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.label}>Contact Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. John Doe"
          value={contactName}
          onChangeText={setContactName}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Username</Text>
        <View>
          <TextInput
            style={[styles.input, client ? { backgroundColor: '#eee' } : null]}
            placeholder="e.g. johndoe"
            value={clientUsername}
            editable={!client}
            onChangeText={t =>
              setClientUsername(t.toLowerCase().replace(/\s+/g, ''))
            }
          />
          {!client && (
            <View
              style={{
                flexDirection: 'row',
                marginTop: 6,
                alignItems: 'center',
                gap: 8,
              }}
            >
              {checkingUsername ? <ActivityIndicator size="small" /> : null}
              {usernameAvailable === true && !checkingUsername && (
                <Text style={{ color: '#10b981' }}>Available ✓</Text>
              )}
              {usernameAvailable === false && !checkingUsername && (
                <Text style={{ color: '#ef4444' }}>Taken ✗</Text>
              )}
            </View>
          )}
          {!client && usernameSuggestions.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 8,
              }}
            >
              {usernameSuggestions.map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setClientUsername(s)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                  }}
                >
                  <Text>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {!client && (
        <View style={styles.section}>
          <Text style={styles.label}>Password</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••••"
              secureTextEntry={!eyeOpen}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setEyeOpen(v => !v)}
              style={{ marginLeft: 8 }}
            >
              <Text style={{ color: 'blue' }}>{eyeOpen ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="contact@company.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="+1 (555) 123-4567"
          value={phone}
          onChangeText={t => setPhone(t.replace(/[^0-9+()-\s]/g, ''))}
          keyboardType="phone-pad"
        />
      </View>

      {!client && !hideAdvanced && (
        <View style={styles.section}>
          <Text style={styles.label}>Account Validity</Text>
          <View style={{ flexDirection: 'row' }}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              placeholder="e.g. 30"
              value={String(validityAmount)}
              onChangeText={v => setValidityAmount(Number(v || 0))}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Unit (days, months, years)"
              value={validityUnit}
              onChangeText={setValidityUnit}
            />
          </View>
          {expiryPreview && (
            <Text style={{ marginTop: 6, fontSize: 12, color: 'gray' }}>
              This account will expire on {expiryPreview}.
            </Text>
          )}
        </View>
      )}

      {!hideAdvanced && (
        <>
          <View style={styles.section}>
            <Text style={styles.label}>Max Companies</Text>
            <TextInput
              style={styles.input}
              value={String(maxCompanies)}
              onChangeText={v => setMaxCompanies(Number(v || 0))}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Max Users</Text>
            <TextInput
              style={styles.input}
              value={String(maxUsers)}
              onChangeText={v => setMaxUsers(Number(v || 0))}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.sectionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Send Invoice via Email</Text>
            </View>
            <RNSwitch
              value={canSendInvoiceEmail}
              onValueChange={setCanSendInvoiceEmail}
            />
          </View>

          <View style={styles.sectionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Send Invoice via WhatsApp</Text>
            </View>
            <RNSwitch
              value={canSendInvoiceWhatsapp}
              onValueChange={setCanSendInvoiceWhatsapp}
            />
          </View>
        </>
      )}

      {/* Action Buttons for General Tab */}
      <View
        style={{
          marginTop: 20,
          flexDirection: 'row',
          justifyContent: 'flex-end',
        }}
      >
        <View style={{ marginRight: 8 }}>
          <Button title="Cancel" onPress={onCancel} />
        </View>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[
            styles.submitButton,
            isSubmitting ? styles.buttonDisabled : null,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {client ? 'Save Changes' : 'Create Client'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Permissions Form Section
  const renderPermissionsForm = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manage Permissions</Text>
        <Text style={styles.sectionSubtitle}>
          Modify usage limits and feature access for this client.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Limits</Text>
        <View style={styles.gridContainer}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Max Companies</Text>
            <TextInput
              style={styles.input}
              value={String(currentPermissions.maxCompanies || '')}
              onChangeText={v =>
                handlePermissionChange('maxCompanies', Number(v || 0))
              }
              keyboardType="numeric"
            />
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Max Users</Text>
            <TextInput
              style={styles.input}
              value={String(currentPermissions.maxUsers || '')}
              onChangeText={v =>
                handlePermissionChange('maxUsers', Number(v || 0))
              }
              keyboardType="numeric"
            />
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Max Inventories</Text>
            <TextInput
              style={styles.input}
              value={String(currentPermissions.maxInventories || '')}
              onChangeText={v =>
                handlePermissionChange('maxInventories', Number(v || 0))
              }
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Feature Access</Text>
        <View style={styles.permissionsGrid}>
          <View style={styles.permissionItem}>
            <Text style={styles.permissionLabel}>Send Invoice via Email</Text>
            <RNSwitch
              value={currentPermissions.canSendInvoiceEmail}
              onValueChange={v =>
                handlePermissionChange('canSendInvoiceEmail', v)
              }
            />
          </View>
          <View style={styles.permissionItem}>
            <Text style={styles.permissionLabel}>
              Send Invoice via WhatsApp
            </Text>
            <RNSwitch
              value={currentPermissions.canSendInvoiceWhatsapp}
              onValueChange={v =>
                handlePermissionChange('canSendInvoiceWhatsapp', v)
              }
            />
          </View>
          <View style={styles.permissionItem}>
            <Text style={styles.permissionLabel}>Create Users</Text>
            <RNSwitch
              value={currentPermissions.canCreateUsers}
              onValueChange={v => handlePermissionChange('canCreateUsers', v)}
            />
          </View>
          <View style={styles.permissionItem}>
            <Text style={styles.permissionLabel}>Create Customers</Text>
            <RNSwitch
              value={currentPermissions.canCreateCustomers}
              onValueChange={v =>
                handlePermissionChange('canCreateCustomers', v)
              }
            />
          </View>
          <View style={styles.permissionItem}>
            <Text style={styles.permissionLabel}>Create Vendors</Text>
            <RNSwitch
              value={currentPermissions.canCreateVendors}
              onValueChange={v => handlePermissionChange('canCreateVendors', v)}
            />
          </View>
          <View style={styles.permissionItem}>
            <Text style={styles.permissionLabel}>Create Products</Text>
            <RNSwitch
              value={currentPermissions.canCreateProducts}
              onValueChange={v =>
                handlePermissionChange('canCreateProducts', v)
              }
            />
          </View>
          <View style={styles.permissionItem}>
            <Text style={styles.permissionLabel}>Create Companies</Text>
            <RNSwitch
              value={currentPermissions.canCreateCompanies}
              onValueChange={v =>
                handlePermissionChange('canCreateCompanies', v)
              }
            />
          </View>
          <View style={styles.permissionItem}>
            <Text style={styles.permissionLabel}>Update Companies</Text>
            <RNSwitch
              value={currentPermissions.canUpdateCompanies}
              onValueChange={v =>
                handlePermissionChange('canUpdateCompanies', v)
              }
            />
          </View>
        </View>
      </View>

      <View
        style={{
          marginTop: 20,
          flexDirection: 'row',
          justifyContent: 'flex-end',
        }}
      >
        <TouchableOpacity
          onPress={handleSavePermissions}
          disabled={isSavingPermissions}
          style={[
            styles.submitButton,
            isSavingPermissions ? styles.buttonDisabled : null,
          ]}
        >
          {isSavingPermissions ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Save Permissions</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Validity Form Section
  const renderValidityForm = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <ClientValidityCard
          clientId={client._id}
          onChanged={() => {
            /* optional refresh handled by parent */
          }}
        />
      </View>
    </ScrollView>
  );

  // Password Reset Form Section
  const renderPasswordForm = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reset Password</Text>
        <Text style={styles.sectionSubtitle}>
          Set a new password for {client.contactName}. They will be notified of
          this change.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>New Password</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Enter new password"
            secureTextEntry={!eyeOpenPassword}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity
            onPress={() => setEyeOpenPassword(v => !v)}
            style={{ marginLeft: 8 }}
          >
            <Text style={{ color: 'blue' }}>
              {eyeOpenPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ marginTop: 20 }}>
        <TouchableOpacity
          onPress={handleResetPassword}
          disabled={isSubmittingPassword || !newPassword.trim()}
          style={[
            styles.submitButton,
            isSubmittingPassword || !newPassword.trim()
              ? styles.buttonDisabled
              : null,
          ]}
        >
          {isSubmittingPassword ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Reset Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {client ? (
        // Edit Mode with Tabs
        <>
          <View style={styles.tabContainer}>
            {renderTabButton('general', 'General')}
            {renderTabButton('permissions', 'Permissions')}
            {renderTabButton('validity', 'Validity')}
            {renderTabButton('password', 'Password')}
          </View>

          <View style={styles.tabContentContainer}>
            {activeTab === 'general' && renderGeneralForm()}
            {activeTab === 'permissions' && renderPermissionsForm()}
            {activeTab === 'validity' && renderValidityForm()}
            {activeTab === 'password' && renderPasswordForm()}
          </View>
        </>
      ) : (
        // Create Mode - Simple Form
        renderGeneralForm()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  tabContentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 16,
  },
  gridLabel: {
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 14,
  },
  permissionLabel: {
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    flex: 1,
    minWidth: '30%',
  },
  permissionsGrid: {
    gap: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
