// components/CreditReminderPopup.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Appearance,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BASE_URL } from '../../config';
import EmailComposerDialog  from './EmailComposerDialog';
import { useCompany } from '../../contexts/company-context';

const { width } = Dimensions.get('window');

export const CreditReminderPopup = ({
  isOpen,
  onClose,
  transaction,
  party,
}) => {
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [partyDetails, setPartyDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [companySpecificBalance, setCompanySpecificBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [colorScheme, setColorScheme] = useState('light');

  const { selectedCompanyId } = useCompany();

  // Detect color scheme
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    setColorScheme(Appearance.getColorScheme());
    return () => subscription.remove();
  }, []);

  // Fetch complete party details and company-specific balance when popup opens
  useEffect(() => {
    const fetchPartyDetails = async () => {
      if (!isOpen || !party?._id) return;

      setIsLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');

        const response = await fetch(`${BASE_URL}/api/parties/${party._id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPartyDetails(data);
        } else {
          // Fallback to basic party info
          setPartyDetails(party);
        }
      } catch (error) {
        // Fallback to basic party info
        setPartyDetails(party);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCompanySpecificBalance = async () => {
      if (!isOpen || !party?._id) return;

      setIsLoadingBalance(true);
      try {
        const token = await AsyncStorage.getItem('token');

        // Use the same balance fetching logic as in receivables page
        let url = `${BASE_URL}/api/parties/balances`;
        const params = new URLSearchParams();
        if (selectedCompanyId) {
          params.append('companyId', selectedCompanyId);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          const storedBalances = data.balances || {};
          const balance = storedBalances[party._id] || 0;
          setCompanySpecificBalance(balance);
        } else {
          // Fallback to basic party balance
          setCompanySpecificBalance(party.balance || 0);
        }
      } catch (error) {
        // Fallback to basic party balance
        setCompanySpecificBalance(party.balance || 0);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    const fetchCompanyDetails = async () => {
      if (!isOpen) return;

      try {
        const token = await AsyncStorage.getItem('token');

        // First, try to get company from transaction
        if (transaction?.company) {
          const transactionCompany = transaction.company;
          if (
            typeof transactionCompany === 'object' &&
            (transactionCompany.name || transactionCompany.businessName)
          ) {
            setCompanyDetails(transactionCompany);
            return;
          }
        }

        // If selectedCompanyId exists, fetch from API
        if (selectedCompanyId) {
          const response = await fetch(
            `${BASE_URL}/api/companies/${selectedCompanyId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (response.ok) {
            const data = await response.json();
            setCompanyDetails(data);
          }
        }
      } catch (error) {
      }
    };

    fetchPartyDetails();
    fetchCompanySpecificBalance();
    fetchCompanyDetails();
  }, [isOpen, party, selectedCompanyId, transaction]);

  if (!transaction || !party) return null;

  // Calculate days since transaction
  const transactionDate = new Date(transaction.date);
  const currentDate = new Date();
  const daysSinceTransaction = Math.floor(
    (currentDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Get pending balance for this specific transaction
  const pendingBalance = transaction.totalAmount || transaction.amount || 0;

  // Use detailed party info if available, otherwise fallback to basic
  const displayParty = partyDetails || party;
  // Use company-specific balance instead of basic balance
  const totalCustomerBalance = companySpecificBalance;

  // Get company info from transaction
  const company = transaction.company || {};

  const styles = createStyles(colorScheme);

  // Mobile View
  if (width < 768) {
    return (
      <>
        <Modal
          visible={isOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={onClose}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.mobileHeader}>
              <View style={styles.headerTitleContainer}>
                <Icon name="schedule" size={24} color="#f97316" />
                <Text style={styles.mobileHeaderTitle}>
                  Credit Payment Reminder
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon
                  name="close"
                  size={24}
                  color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.mobileContent}>
              {/* Company Info */}
              {companyDetails &&
                (companyDetails.name || companyDetails.businessName) && (
                  <View style={styles.companyInfoContainer}>
                    <View style={styles.companyIndicator}>
                      <View style={styles.companyDot} />
                      <Text style={styles.companyText}>
                        Company:{' '}
                        <Text style={styles.companyName}>
                          {companyDetails.name || companyDetails.businessName}
                        </Text>
                      </Text>
                    </View>
                  </View>
                )}

              {/* Customer Information */}
              <View style={styles.card}>
                <View style={styles.cardContent}>
                  <View style={styles.customerHeader}>
                    <View style={styles.customerInfo}>
                      <View style={styles.customerTitle}>
                        <Icon
                          name="person"
                          size={16}
                          color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                        />
                        <Text style={styles.customerName}>
                          {displayParty.name}
                        </Text>
                      </View>
                      {isLoading && (
                        <Text style={styles.loadingText}>
                          Loading details...
                        </Text>
                      )}
                    </View>
                    <View style={[styles.badge, styles.creditBadge]}>
                      <Text style={styles.badgeText}>Credit</Text>
                    </View>
                  </View>

                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#3b82f6" />
                      <Text style={styles.loadingText}>
                        Loading customer details...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.customerDetails}>
                      <View style={styles.detailRow}>
                        <Icon
                          name="email"
                          size={16}
                          color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                        />
                        <Text
                          style={[
                            styles.detailText,
                            !displayParty.email && styles.mutedText,
                          ]}
                        >
                          {displayParty.email || 'No email address available'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Icon
                          name="phone"
                          size={16}
                          color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                        />
                        <Text
                          style={[
                            styles.detailText,
                            !displayParty.contactNumber && styles.mutedText,
                          ]}
                        >
                          {displayParty.contactNumber ||
                            'No contact number available'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Transaction Details */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Icon
                      name="calendar-today"
                      size={16}
                      color={colorScheme === 'dark' ? '#f9fafb' : '#1f2937'}
                    />
                    <Text style={styles.cardTitle}>Transaction Details</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Invoice Date:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(transaction.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Invoice No:</Text>
                    <Text style={styles.detailValue}>
                      {transaction.invoiceNumber ||
                        transaction.referenceNumber ||
                        'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Days Since:</Text>
                    <View
                      style={[
                        styles.badge,
                        daysSinceTransaction > 30
                          ? styles.badgeDestructive
                          : styles.badgeSecondary,
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {daysSinceTransaction} days
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Customer Balance Status */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Icon
                      name="account-balance-wallet"
                      size={16}
                      color={colorScheme === 'dark' ? '#f9fafb' : '#1f2937'}
                    />
                    <Text style={styles.cardTitle}>Customer Balance</Text>
                    {companyDetails &&
                      (companyDetails.name || companyDetails.businessName) && (
                        <Text style={styles.companySubtitle}>
                          ({companyDetails.name || companyDetails.businessName})
                        </Text>
                      )}
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.balanceRow}>
                    <Text style={styles.detailLabel}>Customer Balance:</Text>
                    <View style={styles.balanceContainer}>
                      {isLoadingBalance ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color="#3b82f6" />
                          <Text style={styles.loadingText}>Loading...</Text>
                        </View>
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.balanceAmount,
                              totalCustomerBalance >= 0
                                ? styles.negativeBalance
                                : styles.positiveBalance,
                            ]}
                          >
                            ₹
                            {new Intl.NumberFormat('en-IN').format(
                              Math.abs(totalCustomerBalance),
                            )}
                          </Text>
                          <Text style={styles.balanceStatus}>
                            {totalCustomerBalance >= 0
                              ? '(Customer Owes)'
                              : '(You Owe)'}
                          </Text>
                          {daysSinceTransaction > 30 &&
                            totalCustomerBalance > 0 && (
                              <Text style={styles.overdueText}>
                                Overdue by {daysSinceTransaction - 30} days
                              </Text>
                            )}
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.composeButton]}
                  onPress={() => {
                    onClose();
                    setShowEmailComposer(true);
                  }}
                  disabled={!displayParty.email || isLoading}
                >
                  <Icon
                    name="edit"
                    size={20}
                    color={colorScheme === 'dark' ? '#1f2937' : '#374151'}
                  />
                  <Text style={styles.composeButtonText}>Compose Email</Text>
                </TouchableOpacity>
              </View>

              {!displayParty.email && !isLoading && (
                <View style={styles.warningContainer}>
                  <Icon name="warning" size={20} color="#d97706" />
                  <Text style={styles.warningText}>
                    This customer doesn't have an email address. Please add an
                    email to send payment reminders.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* Email Composer Dialog */}
        {displayParty.email && (
          <EmailComposerDialog
            isOpen={showEmailComposer}
            onClose={() => setShowEmailComposer(false)}
            transaction={transaction}
            party={displayParty}
            company={company}
            daysOverdue={daysSinceTransaction}
            pendingAmount={pendingBalance}
            totalCustomerBalance={totalCustomerBalance}
          />
        )}
      </>
    );
  }

  // Desktop View
  return (
    <>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.desktopBackdrop}>
          <View style={styles.desktopContent}>
            {/* Header */}
            <View style={styles.desktopHeader}>
              <View style={styles.headerTitleContainer}>
                <Icon name="schedule" size={24} color="#f97316" />
                <View>
                  <Text style={styles.desktopHeaderTitle}>
                    Credit Payment Reminder
                  </Text>
                  {companyDetails &&
                    (companyDetails.name || companyDetails.businessName) && (
                      <View style={styles.companyInfoContainer}>
                        <View style={styles.companyIndicator}>
                          <View style={styles.companyDot} />
                          <Text style={styles.companyText}>
                            Company:{' '}
                            <Text style={styles.companyName}>
                              {companyDetails.name ||
                                companyDetails.businessName}
                            </Text>
                          </Text>
                        </View>
                      </View>
                    )}
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon
                  name="close"
                  size={24}
                  color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.desktopScrollContent}>
              {/* Customer Information */}
              <View style={styles.card}>
                <View style={styles.cardContent}>
                  <View style={styles.customerHeader}>
                    <View style={styles.customerInfo}>
                      <View style={styles.customerTitle}>
                        <Icon
                          name="person"
                          size={20}
                          color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                        />
                        <Text style={styles.customerName}>
                          {displayParty.name}
                        </Text>
                      </View>
                      {isLoading && (
                        <Text style={styles.loadingText}>
                          Loading details...
                        </Text>
                      )}
                    </View>
                    <View style={[styles.badge, styles.creditBadge]}>
                      <Text style={styles.badgeText}>Credit</Text>
                    </View>
                  </View>

                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#3b82f6" />
                      <Text style={styles.loadingText}>
                        Loading customer details...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.customerDetails}>
                      <View style={styles.detailRow}>
                        <Icon
                          name="email"
                          size={20}
                          color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                        />
                        <Text
                          style={[
                            styles.detailText,
                            !displayParty.email && styles.mutedText,
                          ]}
                        >
                          {displayParty.email || 'No email address available'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Icon
                          name="phone"
                          size={20}
                          color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                        />
                        <Text
                          style={[
                            styles.detailText,
                            !displayParty.contactNumber && styles.mutedText,
                          ]}
                        >
                          {displayParty.contactNumber ||
                            'No contact number available'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Transaction Details */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Icon
                      name="calendar-today"
                      size={20}
                      color={colorScheme === 'dark' ? '#f9fafb' : '#1f2937'}
                    />
                    <Text style={styles.cardTitle}>Transaction Details</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Invoice Date:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(transaction.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Invoice No:</Text>
                    <Text style={styles.detailValue}>
                      {transaction.invoiceNumber ||
                        transaction.referenceNumber ||
                        'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Days Since:</Text>
                    <View
                      style={[
                        styles.badge,
                        daysSinceTransaction > 30
                          ? styles.badgeDestructive
                          : styles.badgeSecondary,
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {daysSinceTransaction} days
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Customer Balance Status */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Icon
                      name="account-balance-wallet"
                      size={20}
                      color={colorScheme === 'dark' ? '#f9fafb' : '#1f2937'}
                    />
                    <Text style={styles.cardTitle}>Customer Balance</Text>
                    {companyDetails &&
                      (companyDetails.name || companyDetails.businessName) && (
                        <Text style={styles.companySubtitle}>
                          ({companyDetails.name || companyDetails.businessName})
                        </Text>
                      )}
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.balanceRow}>
                    <Text style={styles.detailLabel}>Customer Balance:</Text>
                    <View style={styles.balanceContainer}>
                      {isLoadingBalance ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color="#3b82f6" />
                          <Text style={styles.loadingText}>Loading...</Text>
                        </View>
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.balanceAmount,
                              totalCustomerBalance >= 0
                                ? styles.negativeBalance
                                : styles.positiveBalance,
                            ]}
                          >
                            ₹
                            {new Intl.NumberFormat('en-IN').format(
                              Math.abs(totalCustomerBalance),
                            )}
                          </Text>
                          <Text style={styles.balanceStatus}>
                            {totalCustomerBalance >= 0
                              ? '(Customer Owes)'
                              : '(You Owe)'}
                          </Text>
                          {daysSinceTransaction > 30 &&
                            totalCustomerBalance > 0 && (
                              <Text style={styles.overdueText}>
                                Overdue by {daysSinceTransaction - 30} days
                              </Text>
                            )}
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.desktopFooter}>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.composeButton]}
                  onPress={() => {
                    onClose();
                    setShowEmailComposer(true);
                  }}
                  disabled={!displayParty.email || isLoading}
                >
                  <Icon
                    name="edit"
                    size={20}
                    color={colorScheme === 'dark' ? '#1f2937' : '#374151'}
                  />
                  <Text style={styles.composeButtonText}>Compose Email</Text>
                </TouchableOpacity>
              </View>

              {!displayParty.email && !isLoading && (
                <View style={styles.warningContainer}>
                  <Icon name="warning" size={20} color="#d97706" />
                  <Text style={styles.warningText}>
                    This customer doesn't have an email address. Please add an
                    email to send payment reminders.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Composer Dialog */}
      {displayParty.email && (
        <EmailComposerDialog
          isOpen={showEmailComposer}
          onClose={() => setShowEmailComposer(false)}
          transaction={transaction}
          party={displayParty}
          company={company}
          daysOverdue={daysSinceTransaction}
          pendingAmount={pendingBalance}
          totalCustomerBalance={totalCustomerBalance}
        />
      )}
    </>
  );
};

const createStyles = colorScheme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#111827' : '#ffffff',
    },
    // Mobile Styles
    mobileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
      backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
    },
    mobileContent: {
      flex: 1,
      padding: 16,
      backgroundColor: colorScheme === 'dark' ? '#111827' : '#ffffff',
    },
    // Desktop Styles
    desktopBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    desktopContent: {
      width: '90%',
      maxWidth: 500,
      maxHeight: '80%',
      backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
      borderRadius: 12,
      overflow: 'hidden',
    },
    desktopHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
      backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
    },
    desktopScrollContent: {
      maxHeight: 400,
      padding: 20,
    },
    desktopFooter: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
      backgroundColor:
        colorScheme === 'dark'
          ? 'rgba(31, 41, 55, 0.8)'
          : 'rgba(243, 244, 246, 0.2)',
    },
    headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    mobileHeaderTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
    },
    desktopHeaderTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
    },
    closeButton: {
      padding: 4,
    },
    // Company Info Styles
    companyInfoContainer: {
      marginBottom: 16,
    },
    companyIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    companyDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#3b82f6',
    },
    companyText: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#9ca3af' : '#6b7280',
    },
    companyName: {
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
    },
    // Card Styles
    card: {
      backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
      borderRadius: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    cardHeader: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
    },
    cardContent: {
      padding: 16,
    },
    cardTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
    },
    companySubtitle: {
      fontSize: 12,
      color: colorScheme === 'dark' ? '#9ca3af' : '#6b7280',
      marginLeft: 4,
    },
    // Customer Info Styles
    customerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    customerInfo: {
      flex: 1,
    },
    customerTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    customerName: {
      fontSize: 16,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
    },
    customerDetails: {
      gap: 8,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailText: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
    },
    mutedText: {
      color: colorScheme === 'dark' ? '#9ca3af' : '#6b7280',
      fontStyle: 'italic',
    },
    // Detail Styles
    detailLabel: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#9ca3af' : '#6b7280',
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
    },
    // Balance Styles
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    balanceContainer: {
      alignItems: 'flex-end',
    },
    balanceAmount: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    negativeBalance: {
      color: colorScheme === 'dark' ? '#fca5a5' : '#dc2626',
    },
    positiveBalance: {
      color: colorScheme === 'dark' ? '#86efac' : '#16a34a',
    },
    balanceStatus: {
      fontSize: 12,
      color: colorScheme === 'dark' ? '#9ca3af' : '#6b7280',
      marginTop: 2,
    },
    overdueText: {
      fontSize: 12,
      color: '#dc2626',
      marginTop: 2,
    },
    // Badge Styles
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '500',
    },
    creditBadge: {
      backgroundColor: colorScheme === 'dark' ? '#7c2d12' : '#fed7aa',
    },
    badgeSecondary: {
      backgroundColor: colorScheme === 'dark' ? '#374151' : '#f3f4f6',
    },
    badgeDestructive: {
      backgroundColor: colorScheme === 'dark' ? '#7f1d1d' : '#fef2f2',
    },
    // Loading Styles
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    loadingText: {
      fontSize: 14,
      color: '#3b82f6',
    },
    // Action Buttons
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 6,
      gap: 8,
    },
    cancelButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#4b5563' : '#d1d5db',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#d1d5db' : '#374151',
    },
    composeButton: {
      backgroundColor: colorScheme === 'dark' ? '#d1d5db' : '#f3f4f6',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#4b5563' : '#d1d5db',
    },
    composeButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#1f2937' : '#374151',
    },
    // Warning Styles
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colorScheme === 'dark' ? '#451a03' : '#fffbeb',
      padding: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#7c2d12' : '#fed7aa',
      marginTop: 16,
    },
    warningText: {
      flex: 1,
      fontSize: 14,
      color: colorScheme === 'dark' ? '#fdba74' : '#92400e',
    },
  });
