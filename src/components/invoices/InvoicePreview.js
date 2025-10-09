import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ✅ Props directly receive karo, route/params nahi
export default function InvoicePreview({ 
  transaction, 
  company, 
  party, 
  serviceNameById,
  onClose 
}) {
  // ✅ Ab directly props use kar sakte hain

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onClose}  // ✅ onClose use karo
        >
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Preview</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Invoice Header */}
        <View style={styles.invoiceHeader}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>
              {company?.businessName || 'Company Name'}
            </Text>
            <Text style={styles.companyAddress}>123 Business Street</Text>
            <Text style={styles.companyAddress}>City, State 12345</Text>
            <Text style={styles.companyContact}>contact@company.com</Text>
          </View>

          <View style={styles.invoiceDetails}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice #:</Text>
              <Text style={styles.detailValue}>
                {transaction?._id?.substring(0, 8) || 'INV-001'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>
                {transaction?.date || new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Bill To Section */}
        <View style={styles.billToSection}>
          <Text style={styles.sectionTitle}>Bill To:</Text>
          <Text style={styles.customerName}>
            {party?.name || 'Customer Name'}
          </Text>
          <Text style={styles.customerAddress}>
            {party?.address || 'Customer Address'}
          </Text>
          <Text style={styles.customerContact}>
            {party?.email || 'customer@email.com'}
          </Text>
        </View>

        {/* Items Table - Temporary placeholder */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.headerCell, { flex: 2 }]}>
              Description
            </Text>
            <Text style={[styles.tableCell, styles.headerCell, { flex: 1 }]}>
              Qty
            </Text>
            <Text style={[styles.tableCell, styles.headerCell, { flex: 1 }]}>
              Price
            </Text>
            <Text style={[styles.tableCell, styles.headerCell, { flex: 1 }]}>
              Amount
            </Text>
          </View>

          {/* Temporary sample data */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              Product/Service
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>1</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>₹100.00</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>₹100.00</Text>
          </View>
        </View>

        {/* Total Section */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>
              ₹{transaction?.totalAmount || transaction?.amount || '0.00'}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (0%):</Text>
            <Text style={styles.totalValue}>₹0.00</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>
              ₹{transaction?.totalAmount || transaction?.amount || '0.00'}
            </Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>
            Thank you for your business. Please make payment within 30 days.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.button, styles.downloadButton]}>
          <Icon name="download" size={20} color="#fff" />
          <Text style={styles.buttonText}>Download PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.shareButton]}>
          <Icon name="share" size={20} color="#fff" />
          <Text style={styles.buttonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  companyContact: {
    fontSize: 14,
    color: '#3b82f6',
  },
  invoiceDetails: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  billToSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  customerContact: {
    fontSize: 14,
    color: '#3b82f6',
  },
  itemsSection: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    fontSize: 14,
    color: '#374151',
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalSection: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  notesSection: {
    marginBottom: 24,
  },
  notesText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  downloadButton: {
    backgroundColor: '#059669',
  },
  shareButton: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
