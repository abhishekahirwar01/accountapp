import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Animated,
  Platform,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BASE_URL } from '../../config';
import UpdateNotification from '../../components/notifications/UpdateNotification';
import UpdateNotificationBadge from '../../components/notifications/UpdateNotificationBadge';

const toArray = value => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.entries)) return value.entries;
  return [];
};

const toPositiveInteger = (value, fallback) => {
  const num = Number(value);
  if (!isNaN(num) && isFinite(num) && num > 0) return Math.round(num);
  return fallback;
};

const normalizeBulkUsername = value => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '');
};

const normalizeBulkEmail = value => {
  return String(value || '')
    .trim()
    .toLowerCase();
};

const parseBulkCreateClientsFromPrompt = prompt => {
  const markerRegex = /\bclient\s*\d+\s*[:=-]/gi;
  const markerMatches = Array.from(prompt.matchAll(markerRegex));
  if (markerMatches.length < 2) return [];

  const blocks = [];
  for (let index = 0; index < markerMatches.length; index += 1) {
    const start = markerMatches[index].index;
    if (start === undefined) continue;
    const nextStart = markerMatches[index + 1]?.index;
    blocks.push(prompt.slice(start, nextStart ?? prompt.length).trim());
  }

  const drafts = [];
  for (const block of blocks) {
    if (!block) continue;

    const contactNameRaw =
      block.match(/\bclient\s*\d+\s*[:=-]\s*([^,\n]+)/i)?.[1]?.trim() || '';
    const contactName = contactNameRaw
      .replace(/^(?:name|contact\s*name)\s*[:=-]\s*/i, '')
      .trim();
    const clientUsername = normalizeBulkUsername(
      block.match(
        /\b(?:username|user\s*name|login\s*id|client\s*id)\s*(?:is|=|:)?\s*([a-z0-9_.-]{3,30})/i,
      )?.[1] || '',
    );
    const password =
      block.match(
        /\b(?:password|passw(?:ord|rod)|passcode)\s*(?:is|=|:)?\s*([^\s,;]+)/i,
      )?.[1] || '';
    const email = normalizeBulkEmail(
      block.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '',
    );
    const phone =
      block.match(
        /(?:contact\s*(?:no|number)?|phone|mobile)\s*(?:is|=|:|\.|-)?\s*(\+?\d[\d\s().-]{7,}\d)/i,
      )?.[1] || '';

    drafts.push({
      contactName,
      clientUsername,
      email,
      phone,
      password,
      maxCompanies: 5,
      maxUsers: 10,
      canSendInvoiceEmail: false,
      canSendInvoiceWhatsapp: false,
      validityAmount: 30,
      validityUnit: 'days',
    });
  }

  return drafts;
};

const operationLabelMap = {
  create: 'Create Client',
  update: 'Update Client',
  delete: 'Delete Client',
  update_permissions: 'Update Permissions',
  unknown: 'Unknown Action',
};

const permissionLabelMap = {
  maxCompanies: 'Max Companies',
  maxUsers: 'Max Users',
  maxInventories: 'Max Inventories',
  canSendInvoiceEmail: 'Send Invoice Email',
  canSendInvoiceWhatsapp: 'Send Invoice WhatsApp',
  canCreateUsers: 'Create Users',
  canCreateCustomers: 'Create Customers',
  canCreateVendors: 'Create Vendors',
  canCreateProducts: 'Create Products',
  canCreateInventory: 'Create Inventory',
  canCreateCompanies: 'Create Companies',
  canUpdateCompanies: 'Update Companies',
};

export default function AdminDashboardScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // AI Feature States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiPlan, setAiPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isExecutingPlan, setIsExecutingPlan] = useState(false);
  const [showAIPlanModal, setShowAIPlanModal] = useState(false);
  const [bulkCreateDrafts, setBulkCreateDrafts] = useState([]);
  const [draftClient, setDraftClient] = useState({
    contactName: '',
    clientUsername: '',
    email: '',
    phone: '',
    password: '',
    maxCompanies: 5,
    maxUsers: 10,
    canSendInvoiceEmail: false,
    canSendInvoiceWhatsapp: false,
    validityAmount: 30,
    validityUnit: 'days',
  });

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchClients(), fetchCompanies()]);
    } catch (error) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to load dashboard data. Please try again.',
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchClients = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      navigation.navigate('Login');
      return;
    }

    const res = await fetch(`${BASE_URL}/api/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        await AsyncStorage.removeItem('token');
        Alert.alert('Session Expired', 'Please login again');
        navigation.navigate('Login');
        return;
      }

      let message = 'Failed to fetch clients.';
      try {
        const err = await res.json();
        message = err?.message || message;
      } catch {
        // Keep fallback message if error body is not JSON.
      }
      throw new Error(message);
    }

    const data = await res.json();
    setClients(toArray(data));
  };

  const fetchCompanies = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      navigation.navigate('Login');
      return;
    }

    const res = await fetch(`${BASE_URL}/api/companies/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        await AsyncStorage.removeItem('token');
        Alert.alert('Session Expired', 'Please login again');
        navigation.navigate('Login');
        return;
      }

      let message = 'Failed to fetch companies.';
      try {
        const err = await res.json();
        message = err?.message || message;
      } catch {
        // Keep fallback message if error body is not JSON.
      }
      throw new Error(message);
    }

    const data = await res.json();
    setCompanies(toArray(data));
  };

  useEffect(() => {
    fetchData();

    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(cardsAnim, {
        toValue: 1,
        duration: 550,
        delay: 130,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardsAnim, headerAnim]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const resolveClientsFromTarget = target => {
    if (!target) return [];

    const normalizeLookupValue = value => {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
    };

    if (target.clientId) {
      return clients.filter(
        client => String(client._id) === String(target.clientId),
      );
    }

    if (target.clientUsername) {
      const targetUsername = normalizeLookupValue(target.clientUsername);
      const matches = clients.filter(
        client =>
          normalizeLookupValue(client.clientUsername) === targetUsername,
      );
      if (matches.length > 0) return matches;
    }

    if (target.email) {
      const targetEmail = normalizeLookupValue(target.email);
      const matches = clients.filter(
        client => normalizeLookupValue(client.email) === targetEmail,
      );
      if (matches.length > 0) return matches;
    }

    if (target.contactName) {
      const targetName = normalizeLookupValue(target.contactName);
      const exact = clients.filter(
        client => normalizeLookupValue(client.contactName) === targetName,
      );
      if (exact.length > 0) return exact;

      return clients.filter(client =>
        normalizeLookupValue(client.contactName).includes(targetName),
      );
    }

    return [];
  };

  const mapPayloadToCreateForm = payload => ({
    contactName: String(payload?.contactName || '').trim(),
    clientUsername: String(payload?.clientUsername || '')
      .trim()
      .toLowerCase(),
    email: String(payload?.email || '')
      .trim()
      .toLowerCase(),
    phone: String(payload?.phone || '').trim(),
    password: String(payload?.password || ''),
    maxCompanies: toPositiveInteger(payload?.maxCompanies, 5),
    maxUsers: toPositiveInteger(payload?.maxUsers, 10),
    canSendInvoiceEmail: Boolean(payload?.canSendInvoiceEmail),
    canSendInvoiceWhatsapp: Boolean(payload?.canSendInvoiceWhatsapp),
    validityAmount: toPositiveInteger(payload?.validityAmount, 30),
    validityUnit: payload?.validityUnit || 'days',
  });

  const handleGenerateClientPlan = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      Alert.alert('Prompt Required', 'Type an admin action prompt first.');
      return;
    }

    setIsGeneratingPlan(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/ai/client-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData?.message || 'Failed to generate action plan.',
        );
      }

      const payload = await response.json();
      const plan = payload?.plan;
      if (!plan)
        throw new Error('Action plan was not returned by the AI endpoint.');

      setAiPlan(plan);

      if (plan.operation === 'create') {
        const parsedBulkDrafts = parseBulkCreateClientsFromPrompt(prompt);
        if (parsedBulkDrafts.length > 1) {
          setBulkCreateDrafts(parsedBulkDrafts);
        } else {
          setBulkCreateDrafts([]);
          setDraftClient(mapPayloadToCreateForm(plan.payload));
        }
      } else {
        setBulkCreateDrafts([]);
      }

      setShowAIPlanModal(true);
    } catch (error) {
      Alert.alert('Plan Generation Failed', error.message);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleExecuteClientPlan = async () => {
    if (!aiPlan) {
      Alert.alert('No Action Plan', 'Generate an AI plan first.');
      return;
    }

    setIsExecutingPlan(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      if (aiPlan.operation === 'unknown') {
        throw new Error(
          'AI could not determine a valid action from this prompt.',
        );
      }

      if (aiPlan.operation === 'create') {
        const bulkDrafts = parseBulkCreateClientsFromPrompt(aiPrompt.trim());

        if (bulkDrafts.length > 1) {
          const createdClients = [];
          const failures = [];

          for (let index = 0; index < bulkDrafts.length; index += 1) {
            const bulkDraft = bulkDrafts[index];
            const missing = [];
            if (!bulkDraft.contactName.trim()) missing.push('contactName');
            if (!bulkDraft.clientUsername.trim())
              missing.push('clientUsername');
            if (!bulkDraft.email.trim()) missing.push('email');
            if (
              !bulkDraft.password.trim() ||
              bulkDraft.password.trim().length < 6
            ) {
              missing.push('password(min 6 chars)');
            }

            const label =
              bulkDraft.contactName ||
              bulkDraft.clientUsername ||
              `client ${index + 1}`;

            if (missing.length > 0) {
              failures.push(`${label}: missing ${missing.join(', ')}`);
              continue;
            }

            const createResponse = await fetch(`${BASE_URL}/api/clients`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                contactName: bulkDraft.contactName.trim(),
                clientUsername: bulkDraft.clientUsername.trim().toLowerCase(),
                email: bulkDraft.email.trim().toLowerCase(),
                password: bulkDraft.password,
                maxCompanies: toPositiveInteger(bulkDraft.maxCompanies, 5),
                maxUsers: toPositiveInteger(bulkDraft.maxUsers, 10),
                canSendInvoiceEmail: bulkDraft.canSendInvoiceEmail,
                canSendInvoiceWhatsapp: bulkDraft.canSendInvoiceWhatsapp,
                ...(bulkDraft.phone.trim()
                  ? { phone: bulkDraft.phone.trim() }
                  : {}),
                validity: {
                  amount: toPositiveInteger(bulkDraft.validityAmount, 30),
                  unit: bulkDraft.validityUnit,
                },
              }),
            });

            if (!createResponse.ok) {
              const errorData = await createResponse.json();
              failures.push(
                `${label}: ${errorData?.message || 'Failed to create client'}`,
              );
              continue;
            }

            const createPayload = await createResponse.json();
            const createdClient = createPayload?.client;
            if (createdClient?._id) createdClients.push(createdClient);
          }

          if (createdClients.length === 0) {
            throw new Error(
              failures.length > 0
                ? `Could not create any clients. ${failures.join(' | ')}`
                : 'Could not create any clients from this prompt.',
            );
          }

          await fetchClients();

          Alert.alert(
            'Bulk Create Complete',
            `${createdClients.length} client(s) created successfully.\n${
              failures.length > 0
                ? `${failures.length} failed: ${failures
                    .slice(0, 2)
                    .join(' | ')}`
                : 'All clients created successfully.'
            }`,
          );
        } else {
          const missing = [];
          if (!draftClient.contactName.trim()) missing.push('contactName');
          if (!draftClient.clientUsername.trim())
            missing.push('clientUsername');
          if (!draftClient.email.trim()) missing.push('email');
          if (
            !draftClient.password.trim() ||
            draftClient.password.trim().length < 6
          ) {
            missing.push('password(min 6 chars)');
          }

          if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
          }

          const createResponse = await fetch(`${BASE_URL}/api/clients`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              contactName: draftClient.contactName.trim(),
              clientUsername: draftClient.clientUsername.trim().toLowerCase(),
              email: draftClient.email.trim().toLowerCase(),
              phone: draftClient.phone.trim(),
              password: draftClient.password,
              maxCompanies: toPositiveInteger(draftClient.maxCompanies, 5),
              maxUsers: toPositiveInteger(draftClient.maxUsers, 10),
              canSendInvoiceEmail: draftClient.canSendInvoiceEmail,
              canSendInvoiceWhatsapp: draftClient.canSendInvoiceWhatsapp,
              validity: {
                amount: toPositiveInteger(draftClient.validityAmount, 30),
                unit: draftClient.validityUnit,
              },
            }),
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData?.message || 'Failed to create client.');
          }

          await fetchClients();
          Alert.alert('Success', 'Client created successfully.');
        }
      } else {
        const matches = resolveClientsFromTarget(aiPlan.target);
        if (matches.length === 0) {
          throw new Error(
            'No client matched the prompt target. Add username/email for exact match.',
          );
        }
        if (matches.length > 1) {
          throw new Error(
            `Target is ambiguous. Matched: ${matches
              .slice(0, 3)
              .map(client => client.contactName)
              .join(', ')}`,
          );
        }

        const matchedClient = matches[0];

        if (aiPlan.operation === 'delete') {
          const deleteResponse = await fetch(
            `${BASE_URL}/api/clients/${matchedClient._id}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            throw new Error(errorData?.message || 'Failed to delete client.');
          }

          await fetchClients();
          Alert.alert(
            'Client Deleted',
            `${matchedClient.contactName} was deleted.`,
          );
        }

        if (aiPlan.operation === 'update') {
          const payload = aiPlan.payload;
          const updateBody = {};

          if (payload?.contactName?.trim())
            updateBody.contactName = payload.contactName.trim();
          if (payload?.clientUsername?.trim())
            updateBody.clientUsername = payload.clientUsername
              .trim()
              .toLowerCase();
          if (payload?.email?.trim())
            updateBody.email = payload.email.trim().toLowerCase();
          if (payload?.phone?.trim()) updateBody.phone = payload.phone.trim();
          if (payload?.maxCompanies > 0)
            updateBody.maxCompanies = payload.maxCompanies;
          if (payload?.maxUsers > 0) updateBody.maxUsers = payload.maxUsers;
          if (payload?.canSendInvoiceEmail !== undefined)
            updateBody.canSendInvoiceEmail = payload.canSendInvoiceEmail;
          if (payload?.canSendInvoiceWhatsapp !== undefined)
            updateBody.canSendInvoiceWhatsapp = payload.canSendInvoiceWhatsapp;

          const nextPassword = payload?.password?.trim() || '';
          const hasPasswordUpdate = nextPassword.length >= 6;
          const hasValidityUpdate = Boolean(
            payload?.validityAmount && payload?.validityUnit,
          );

          let updateSuccess = false;

          if (Object.keys(updateBody).length > 0) {
            const updateResponse = await fetch(
              `${BASE_URL}/api/clients/${matchedClient._id}`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updateBody),
              },
            );

            if (!updateResponse.ok) {
              const errorData = await updateResponse.json();
              throw new Error(errorData?.message || 'Failed to update client.');
            }
            updateSuccess = true;
          }

          if (hasPasswordUpdate) {
            const resetResponse = await fetch(
              `${BASE_URL}/api/clients/reset-password/${matchedClient._id}`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ newpassword: nextPassword }),
              },
            );

            if (!resetResponse.ok) {
              const errorData = await resetResponse.json();
              throw new Error(
                errorData?.message || 'Failed to reset password.',
              );
            }
            updateSuccess = true;
          }

          if (hasValidityUpdate) {
            const validityBody =
              payload.validityUnit === 'days'
                ? { days: payload.validityAmount }
                : payload.validityUnit === 'months'
                ? { months: payload.validityAmount }
                : { years: payload.validityAmount };

            const validityResponse = await fetch(
              `${BASE_URL}/api/account/${matchedClient._id}/validity`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(validityBody),
              },
            );

            if (!validityResponse.ok && validityResponse.status !== 404) {
              const errorData = await validityResponse.json();
              throw new Error(
                errorData?.message || 'Failed to update validity.',
              );
            }
            updateSuccess = true;
          }

          if (!updateSuccess) {
            throw new Error('No update fields detected for this prompt.');
          }

          await fetchClients();
          Alert.alert(
            'Client Updated',
            `${matchedClient.contactName} was updated successfully.`,
          );
        }

        if (aiPlan.operation === 'update_permissions') {
          const patch = aiPlan.permissionPatch || {};
          if (Object.keys(patch).length === 0) {
            throw new Error('No permission fields detected for this prompt.');
          }

          const permissionsResponse = await fetch(
            `${BASE_URL}/api/clients/${matchedClient._id}/permissions`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(patch),
            },
          );

          if (!permissionsResponse.ok) {
            const errorData = await permissionsResponse.json();
            throw new Error(
              errorData?.message || 'Failed to update client permissions.',
            );
          }

          Alert.alert(
            'Permissions Updated',
            `${matchedClient.contactName} permissions were updated.`,
          );
        }
      }

      if (aiPlan.unsupportedIntents?.length) {
        Alert.alert(
          'Note',
          `Unsupported intents: ${aiPlan.unsupportedIntents.join(', ')}`,
        );
      }

      setShowAIPlanModal(false);
      setAiPlan(null);
      setAiPrompt('');
    } catch (error) {
      Alert.alert('Action Execution Failed', error.message);
    } finally {
      setIsExecutingPlan(false);
    }
  };

  const totalClients = clients.length;
  const activeClients = useMemo(
    () =>
      clients.filter(
        client => String(client?.status || '').toLowerCase() === 'active',
      ).length,
    [clients],
  );
  const totalCompanies = companies.length;
  const inactiveClients = Math.max(totalClients - activeClients, 0);
  const activeRate = totalClients
    ? `${Math.round((activeClients / totalClients) * 100)}%`
    : '0%';
  const avgCompaniesPerClient = totalClients
    ? (totalCompanies / totalClients).toFixed(1)
    : '0.0';

  const planTargetMatches = aiPlan
    ? resolveClientsFromTarget(aiPlan.target)
    : [];
  const resolvedPlanTargetClient =
    planTargetMatches.length === 1 ? planTargetMatches[0] : null;

  const planPayloadEntries = aiPlan?.payload
    ? Object.entries(aiPlan.payload).filter(
        ([, value]) => value !== null && value !== undefined,
      )
    : [];
  const planPermissionEntries = aiPlan?.permissionPatch
    ? Object.entries(aiPlan.permissionPatch).filter(
        ([, value]) => value !== null && value !== undefined,
      )
    : [];

  const kpiData = useMemo(
    () => [
      {
        title: 'Total Clients',
        value: totalClients.toLocaleString(),
        sub: `${activeClients} active currently`,
        change: `+${Math.floor(Math.random() * 5)}`,
        tone: 'positive',
        icon: 'account-group-outline',
        accent: '#2563EB',
        accentSoft: '#DBEAFE',
      },
      {
        title: 'Companies',
        value: totalCompanies.toLocaleString(),
        sub: `${avgCompaniesPerClient} avg per client`,
        change: 'Portfolio',
        tone: 'neutral',
        icon: 'office-building-outline',
        accent: '#0284C7',
        accentSoft: '#E0F2FE',
      },
      {
        title: 'Transactions',
        value: '1,452',
        sub: 'Total processed',
        change: '+120',
        tone: 'positive',
        icon: 'database-outline',
        accent: '#8B5CF6',
        accentSoft: '#F5F3FF',
      },
      {
        title: 'Pending Invoices',
        value: '23',
        sub: 'Across all clients',
        change: 'Action',
        tone: 'warning',
        icon: 'file-document-outline',
        accent: '#F59E0B',
        accentSoft: '#FFFBEB',
      },
    ],
    [activeClients, avgCompaniesPerClient, totalClients, totalCompanies],
  );

  const quickActions = [
    {
      title: 'Clients',
      subtitle: 'Manage client accounts',
      route: 'AdminClientManagement',
      icon: 'account-multiple-outline',
      iconColor: '#2563EB',
      iconBg: '#E6F0FF',
    },
    {
      title: 'Companies',
      subtitle: 'Review all companies',
      route: 'AdminCompanies',
      icon: 'domain',
      iconColor: '#0284C7',
      iconBg: '#E9F8FF',
    },
    {
      title: 'Analytics',
      subtitle: 'Open advanced reports',
      route: 'AdminAnalytics',
      icon: 'chart-line',
      iconColor: '#0D9488',
      iconBg: '#E7FFFC',
    },
  ];

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <View style={styles.loaderCard}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loaderTitle}>Loading Admin Dashboard</Text>
          <Text style={styles.loaderText}>
            Fetching latest platform data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.rootContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
            colors={['#2563EB']}
          />
        }
      >
        <Animated.View
          style={[
            styles.heroCard,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.heroGlow} />

          <View style={styles.heroHeader}>
            <View style={styles.heroBadge}>
              <Icon name="shield-crown-outline" size={14} color="#2563EB" />
              <Text style={styles.heroBadgeText}>Admin Control Center</Text>
            </View>

            <UpdateNotificationBadge
              onPress={() => navigation.navigate('AdminAnalytics')}
            />
          </View>

          <Text style={styles.heroTitle}>Master Admin Dashboard</Text>
          <Text style={styles.heroSubtitle}>
            Unified view of client health, company coverage, and operational
            momentum.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatLabel}>Clients</Text>
              <Text style={styles.heroStatValue}>
                {totalClients.toLocaleString()}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatLabel}>Companies</Text>
              <Text style={styles.heroStatValue}>
                {totalCompanies.toLocaleString()}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatLabel}>Active Rate</Text>
              <Text style={styles.heroStatValue}>{activeRate}</Text>
            </View>
          </View>
        </Animated.View>

        {/* AI Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AI Client Operations</Text>
            <View style={styles.aiBadge}>
              <Icon name="robot" size={12} color="#2563EB" />
              <Text style={styles.aiBadgeText}>Beta</Text>
            </View>
          </View>

          <View style={styles.aiCard}>
            <Text style={styles.aiDescription}>
              Natural language client management: Create, update, delete, or
              modify permissions
            </Text>
            <Text style={styles.aiExample}>
              Examples: "Create client Rahul with email rahul@acme.in", "Update
              client email", "Delete client username"
            </Text>

            <TextInput
              style={styles.aiInput}
              multiline
              numberOfLines={4}
              placeholder="Describe the client action in plain language..."
              placeholderTextColor="#94A3B8"
              value={aiPrompt}
              onChangeText={setAiPrompt}
              editable={!isGeneratingPlan}
            />

            <View style={styles.aiButtonRow}>
              <TouchableOpacity
                style={[styles.aiButton, styles.analyzeButton]}
                onPress={handleGenerateClientPlan}
                disabled={isGeneratingPlan || !aiPrompt.trim()}
              >
                {isGeneratingPlan ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="robot" size={18} color="#FFFFFF" />
                    <Text style={styles.aiButtonText}>Analyze Prompt</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.aiButton, styles.executeButton]}
                onPress={handleExecuteClientPlan}
                disabled={!aiPlan || isExecutingPlan}
              >
                {isExecutingPlan ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <>
                    <Icon name="play" size={18} color="#2563EB" />
                    <Text style={styles.executeButtonText}>Run Action</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.title}
                activeOpacity={0.8}
                onPress={() => navigation.navigate(action.route)}
                style={styles.quickActionCard}
              >
                <View
                  style={[
                    styles.quickActionIconWrap,
                    { backgroundColor: action.iconBg },
                  ]}
                >
                  <Icon name={action.icon} size={18} color={action.iconColor} />
                </View>

                <View style={styles.quickActionTextWrap}>
                  <Text style={styles.quickActionTitle}>{action.title}</Text>
                  <Text style={styles.quickActionSubtitle}>
                    {action.subtitle}
                  </Text>
                </View>

                <Icon name="chevron-right" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.kpiGrid}>
            {kpiData.map((kpi, index) => {
              const isPositive = kpi.tone === 'positive';
              const isWarning = kpi.tone === 'warning';

              return (
                <Animated.View
                  key={kpi.title}
                  style={[
                    styles.kpiCard,
                    {
                      opacity: cardsAnim,
                      transform: [
                        {
                          translateY: cardsAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [18 + index * 3, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.kpiTopRow}>
                    <View
                      style={[
                        styles.kpiIconWrap,
                        { backgroundColor: kpi.accentSoft },
                      ]}
                    >
                      <Icon name={kpi.icon} size={17} color={kpi.accent} />
                    </View>

                    <View
                      style={[
                        styles.kpiTrend,
                        isPositive && styles.kpiTrendPositive,
                        isWarning && styles.kpiTrendWarning,
                      ]}
                    >
                      <Icon
                        name={
                          isPositive
                            ? 'arrow-top-right'
                            : isWarning
                            ? 'alert-circle-outline'
                            : 'circle-medium'
                        }
                        size={11}
                        color={
                          isPositive
                            ? '#15803D'
                            : isWarning
                            ? '#B45309'
                            : '#475569'
                        }
                      />
                      <Text
                        style={[
                          styles.kpiTrendText,
                          isPositive && styles.kpiTrendTextPositive,
                          isWarning && styles.kpiTrendTextWarning,
                        ]}
                      >
                        {kpi.change}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.kpiValueContainer}>
                    <Text style={styles.kpiValue}>{kpi.value}</Text>
                    <Text style={styles.kpiTitle}>{kpi.title}</Text>
                  </View>
                  <Text style={styles.kpiSub}>{kpi.sub}</Text>

                  <View
                    style={[
                      styles.kpiAccentLine,
                      { backgroundColor: kpi.accent },
                    ]}
                  />
                </Animated.View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Update Notifications</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AdminAnalytics')}
              activeOpacity={0.8}
            >
              <Text style={styles.sectionActionText}>Open Analytics</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.notificationWrap}>
            <UpdateNotification />
          </View>
        </View>
      </ScrollView>

      {/* AI Plan Modal - Full Details */}
      <Modal
        visible={showAIPlanModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAIPlanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Action Plan</Text>
              <TouchableOpacity onPress={() => setShowAIPlanModal(false)}>
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {aiPlan && (
              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                {/* Badges */}
                <View style={styles.planBadges}>
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>
                      Action:{' '}
                      {operationLabelMap[aiPlan.operation] || aiPlan.operation}
                    </Text>
                  </View>
                  <View style={[styles.planBadge, styles.confidenceBadge]}>
                    <Text style={styles.planBadgeText}>
                      Confidence:{' '}
                      {Math.round(
                        Math.max(0, Math.min(1, aiPlan.confidence || 0)) * 100,
                      )}
                      %
                    </Text>
                  </View>
                  {aiPlan.missingFields?.length > 0 && (
                    <View style={[styles.planBadge, styles.missingBadge]}>
                      <Text
                        style={[styles.planBadgeText, styles.missingBadgeText]}
                      >
                        Missing: {aiPlan.missingFields.join(', ')}
                      </Text>
                    </View>
                  )}
                  {aiPlan.unsupportedIntents?.length > 0 && (
                    <View style={[styles.planBadge, styles.unsupportedBadge]}>
                      <Text
                        style={[
                          styles.planBadgeText,
                          styles.unsupportedBadgeText,
                        ]}
                      >
                        Unsupported: {aiPlan.unsupportedIntents.join(', ')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Target Client Section */}
                {(aiPlan.target?.clientId ||
                  aiPlan.target?.clientUsername ||
                  aiPlan.target?.contactName ||
                  aiPlan.target?.email) && (
                  <View style={styles.planSection}>
                    <Text style={styles.planSectionTitle}>Target Client</Text>
                    <View style={styles.planCard}>
                      <Text style={styles.planText}>
                        {[
                          aiPlan.target.contactName,
                          aiPlan.target.clientUsername
                            ? `@${aiPlan.target.clientUsername}`
                            : '',
                          aiPlan.target.email,
                          aiPlan.target.clientId,
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </Text>
                      {resolvedPlanTargetClient && (
                        <View style={styles.matchSuccess}>
                          <Icon name="check-circle" size={14} color="#059669" />
                          <Text style={styles.matchSuccessText}>
                            Matched: {resolvedPlanTargetClient.contactName} (
                            {resolvedPlanTargetClient.clientUsername})
                          </Text>
                        </View>
                      )}
                      {!resolvedPlanTargetClient &&
                        planTargetMatches.length > 1 && (
                          <View style={styles.matchWarning}>
                            <Icon name="alert" size={14} color="#D97706" />
                            <Text style={styles.matchWarningText}>
                              Multiple matches: {planTargetMatches.length}.
                              Please refine username/email in prompt.
                            </Text>
                          </View>
                        )}
                      {!resolvedPlanTargetClient &&
                        planTargetMatches.length === 0 &&
                        aiPlan.operation !== 'create' && (
                          <View style={styles.matchWarning}>
                            <Icon name="alert" size={14} color="#D97706" />
                            <Text style={styles.matchWarningText}>
                              No exact client match found yet.
                            </Text>
                          </View>
                        )}
                    </View>
                  </View>
                )}

                {/* Bulk Create Preview */}
                {aiPlan.operation === 'create' &&
                  bulkCreateDrafts.length > 1 && (
                    <View style={styles.planSection}>
                      <Text style={styles.planSectionTitle}>
                        Bulk Create Preview ({bulkCreateDrafts.length} clients)
                      </Text>
                      <View style={styles.bulkPreview}>
                        <Text style={styles.bulkPreviewNote}>
                          Single-client form is hidden for bulk prompts.
                          Clicking "Execute Now" will create all listed clients.
                        </Text>
                        {bulkCreateDrafts.map((item, index) => (
                          <View
                            key={`${item.clientUsername || 'client'}-${index}`}
                            style={styles.bulkItem}
                          >
                            <Text style={styles.bulkItemTitle}>
                              {index + 1}. {item.contactName || '-'} (
                              {item.clientUsername || '-'})
                            </Text>
                            <Text style={styles.bulkItemSub}>
                              {item.email || 'No email'} |{' '}
                              {item.phone || 'No phone'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                {/* Single Create Form Fields */}
                {aiPlan.operation === 'create' &&
                  bulkCreateDrafts.length <= 1 && (
                    <View style={styles.planSection}>
                      <Text style={styles.planSectionTitle}>
                        Client Details
                      </Text>
                      <View style={styles.formGrid}>
                        <View style={styles.formField}>
                          <Text style={styles.formLabel}>Contact Name</Text>
                          <TextInput
                            style={styles.formInput}
                            value={draftClient.contactName}
                            onChangeText={value =>
                              setDraftClient(prev => ({
                                ...prev,
                                contactName: value,
                              }))
                            }
                            placeholder="Contact name"
                          />
                        </View>
                        <View style={styles.formField}>
                          <Text style={styles.formLabel}>Username</Text>
                          <TextInput
                            style={styles.formInput}
                            value={draftClient.clientUsername}
                            onChangeText={value =>
                              setDraftClient(prev => ({
                                ...prev,
                                clientUsername: value.toLowerCase(),
                              }))
                            }
                            placeholder="client_username"
                          />
                        </View>
                        <View style={styles.formField}>
                          <Text style={styles.formLabel}>Email</Text>
                          <TextInput
                            style={styles.formInput}
                            value={draftClient.email}
                            onChangeText={value =>
                              setDraftClient(prev => ({
                                ...prev,
                                email: value,
                              }))
                            }
                            placeholder="email@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                          />
                        </View>
                        <View style={styles.formField}>
                          <Text style={styles.formLabel}>Phone</Text>
                          <TextInput
                            style={styles.formInput}
                            value={draftClient.phone}
                            onChangeText={value =>
                              setDraftClient(prev => ({
                                ...prev,
                                phone: value,
                              }))
                            }
                            placeholder="+919876543210"
                            keyboardType="phone-pad"
                          />
                        </View>
                        <View style={styles.formField}>
                          <Text style={styles.formLabel}>Password</Text>
                          <TextInput
                            style={styles.formInput}
                            value={draftClient.password}
                            onChangeText={value =>
                              setDraftClient(prev => ({
                                ...prev,
                                password: value,
                              }))
                            }
                            placeholder="Minimum 6 characters"
                            secureTextEntry
                          />
                        </View>
                        <View style={styles.formField}>
                          <Text style={styles.formLabel}>Max Companies</Text>
                          <TextInput
                            style={styles.formInput}
                            value={String(draftClient.maxCompanies)}
                            onChangeText={value =>
                              setDraftClient(prev => ({
                                ...prev,
                                maxCompanies: toPositiveInteger(value, 5),
                              }))
                            }
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.formField}>
                          <Text style={styles.formLabel}>Max Users</Text>
                          <TextInput
                            style={styles.formInput}
                            value={String(draftClient.maxUsers)}
                            onChangeText={value =>
                              setDraftClient(prev => ({
                                ...prev,
                                maxUsers: toPositiveInteger(value, 10),
                              }))
                            }
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.formField}>
                          <Text style={styles.formLabel}>Validity Amount</Text>
                          <TextInput
                            style={styles.formInput}
                            value={String(draftClient.validityAmount)}
                            onChangeText={value =>
                              setDraftClient(prev => ({
                                ...prev,
                                validityAmount: toPositiveInteger(value, 30),
                              }))
                            }
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.formField}>
                          <Text style={styles.formLabel}>Validity Unit</Text>
                          <View style={styles.pickerContainer}>
                            {['days', 'months', 'years'].map(unit => (
                              <TouchableOpacity
                                key={unit}
                                style={[
                                  styles.unitOption,
                                  draftClient.validityUnit === unit &&
                                    styles.unitOptionActive,
                                ]}
                                onPress={() =>
                                  setDraftClient(prev => ({
                                    ...prev,
                                    validityUnit: unit,
                                  }))
                                }
                              >
                                <Text
                                  style={[
                                    styles.unitOptionText,
                                    draftClient.validityUnit === unit &&
                                      styles.unitOptionTextActive,
                                  ]}
                                >
                                  {unit.charAt(0).toUpperCase() + unit.slice(1)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>

                      {/* Switches */}
                      <View style={styles.switchesContainer}>
                        <View style={styles.switchRow}>
                          <Text style={styles.switchLabel}>
                            Can Send Invoice Email
                          </Text>
                          <Switch
                            value={draftClient.canSendInvoiceEmail}
                            onValueChange={value =>
                              setDraftClient(prev => ({
                                ...prev,
                                canSendInvoiceEmail: value,
                              }))
                            }
                            trackColor={{ false: '#E2E8F0', true: '#2563EB' }}
                          />
                        </View>
                        <View style={styles.switchRow}>
                          <Text style={styles.switchLabel}>
                            Can Send Invoice WhatsApp
                          </Text>
                          <Switch
                            value={draftClient.canSendInvoiceWhatsapp}
                            onValueChange={value =>
                              setDraftClient(prev => ({
                                ...prev,
                                canSendInvoiceWhatsapp: value,
                              }))
                            }
                            trackColor={{ false: '#E2E8F0', true: '#2563EB' }}
                          />
                        </View>
                      </View>
                    </View>
                  )}

                {/* Planned Field Updates */}
                {aiPlan.operation !== 'create' &&
                  planPayloadEntries.length > 0 && (
                    <View style={styles.planSection}>
                      <Text style={styles.planSectionTitle}>
                        Planned Field Updates
                      </Text>
                      <View style={styles.chipsContainer}>
                        {planPayloadEntries.map(([key, value]) => (
                          <View key={key} style={styles.chip}>
                            <Text style={styles.chipText}>
                              {key}: {String(value)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                {/* Planned Permission Patch */}
                {planPermissionEntries.length > 0 && (
                  <View style={styles.planSection}>
                    <Text style={styles.planSectionTitle}>
                      Planned Permission Patch
                    </Text>
                    <View style={styles.chipsContainer}>
                      {planPermissionEntries.map(([key, value]) => (
                        <View
                          key={key}
                          style={[styles.chip, styles.permissionChip]}
                        >
                          <Text style={styles.permissionChipText}>
                            {permissionLabelMap[key] || key}: {String(value)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* AI Assumptions */}
                {aiPlan.assumptions?.length > 0 && (
                  <View style={styles.planSection}>
                    <Text style={styles.planSectionTitle}>AI Assumptions</Text>
                    <View style={styles.assumptionCard}>
                      <Icon
                        name="lightbulb-outline"
                        size={16}
                        color="#8B5CF6"
                      />
                      <Text style={styles.assumptionText}>
                        {aiPlan.assumptions.join(' ')}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowAIPlanModal(false)}
              >
                <Text style={styles.modalButtonText}>Review Later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalExecuteButton]}
                onPress={handleExecuteClientPlan}
                disabled={isExecutingPlan}
              >
                {isExecutingPlan ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalExecuteButtonText}>Execute Now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F7FF',
    marginBottom: 100,
  },
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  rootContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 34,
    gap: 12,
  },
  bgOrbTop: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(8, 145, 178, 0.08)',
  },

  loader: {
    flex: 1,
    backgroundColor: '#F4F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loaderCard: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E7EDF8',
    boxShadow: '0px 4px 14px rgba(15, 23, 42, 0.08)',
  },
  loaderTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  loaderText: {
    marginTop: 5,
    fontSize: 12,
    color: '#64748B',
  },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5ECFA',
    padding: 14,
    overflow: 'hidden',
    boxShadow: '0px 4px 14px rgba(15, 23, 42, 0.08)',
  },
  heroGlow: {
    position: 'absolute',
    top: -90,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#D5E3FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '72%',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  heroTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    maxWidth: '88%',
  },
  heroStatsRow: {
    marginTop: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E8EEF9',
    backgroundColor: '#F8FAFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  heroStatChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroStatValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },

  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },

  // AI Styles
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
  },
  aiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7EDF8',
    padding: 14,
    gap: 10,
  },
  aiDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  aiExample: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  aiInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 100,
    backgroundColor: '#F8FAFF',
  },
  aiButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  aiButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  analyzeButton: {
    backgroundColor: '#2563EB',
  },
  executeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  executeButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },

  quickActionsRow: {
    gap: 8,
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7EDF8',
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0px 2px 6px rgba(15, 23, 42, 0.06)',
  },
  quickActionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTextWrap: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickActionSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748B',
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7EDF8',
    paddingTop: 10,
    paddingHorizontal: 11,
    paddingBottom: 12,
    overflow: 'hidden',
    boxShadow: '0px 2px 6px rgba(15, 23, 42, 0.06)',
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  kpiIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#EEF2FF',
    gap: 3,
    maxWidth: '65%',
  },
  kpiTrendPositive: {
    backgroundColor: '#ECFDF3',
  },
  kpiTrendWarning: {
    backgroundColor: '#FFF7ED',
  },
  kpiTrendText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  kpiTrendTextPositive: {
    color: '#15803D',
  },
  kpiTrendTextWarning: {
    color: '#B45309',
  },
  kpiValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  kpiTitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  kpiSub: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
  },
  kpiAccentLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
  },

  notificationWrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBody: {
    padding: 16,
    maxHeight: 500,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalExecuteButton: {
    backgroundColor: '#2563EB',
  },
  modalButtonText: {
    color: '#64748B',
    fontWeight: '600',
  },
  modalExecuteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Plan Details Styles
  planBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  planBadge: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  confidenceBadge: {
    backgroundColor: '#F4EDFF',
  },
  missingBadge: {
    backgroundColor: '#FFF7ED',
  },
  missingBadgeText: {
    color: '#D97706',
  },
  unsupportedBadge: {
    backgroundColor: '#FEF2F2',
  },
  unsupportedBadgeText: {
    color: '#DC2626',
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  planSection: {
    marginBottom: 20,
  },
  planSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  planCard: {
    backgroundColor: '#F8FAFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  planText: {
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 18,
  },
  matchSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  matchSuccessText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  matchWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  matchWarningText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  bulkPreview: {
    backgroundColor: '#F8FAFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  bulkPreviewNote: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  bulkItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bulkItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  bulkItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  formGrid: {
    gap: 12,
  },
  formField: {
    gap: 4,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  unitOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitOptionActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  unitOptionText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  unitOptionTextActive: {
    color: '#FFFFFF',
  },
  switchesContainer: {
    marginTop: 12,
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 13,
    color: '#0F172A',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#2563EB',
  },
  permissionChip: {
    backgroundColor: '#ECFDF3',
  },
  permissionChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#059669',
  },
  assumptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  assumptionText: {
    flex: 1,
    fontSize: 12,
    color: '#6D28D9',
    lineHeight: 18,
  },
});
