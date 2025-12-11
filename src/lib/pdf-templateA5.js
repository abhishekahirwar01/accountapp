// pdf-templateA5.js

import React from 'react';
import { generatePDF } from 'react-native-html-to-pdf';
import ReactPDF, { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import {
  deriveTotals,
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  getItemsBody,
  calculateGST,
  getUnifiedLines,
  prepareTemplate8Data,
  getStateCode,
  numberToWords,
} from './pdf-utils';
import { capitalizeWords, parseNotesHtml } from './utils';
import { formatQuantity } from './pdf-utils';
import { formatPhoneNumber } from './pdf-utils';
import { BASE_URL } from '../config';

// **START: ADDED IMPORT FOR HTML RENDERING UTILITIES**
import { parseHtmlToElements, renderParsedElements } from './HtmlNoteRenderer';
// **END: ADDED IMPORT FOR HTML RENDERING UTILITIES**

/**
 * Derives the client's name from the client object or a string.
 * @param client - The client object or a string name.
 * @returns The client's name.
 */
const getClientName = client => {
  console.log('getClientName called with:', client);
  if (!client) return 'Client Name';
  if (typeof client === 'string') return client;
  return client.companyName || client.contactName || 'Client Name';
};

// Create styles for ReactPDF
const styles = StyleSheet.create({
  page: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 4,
    alignItems: 'center',
    gap: 6,
  },
  headerLeft: {
    alignItems: 'flex-start',
  },
  headerRight: {
    flex: 3,
    alignItems: 'flex-start',
  },
  logo: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  address: {
    fontSize: 10,
    marginBottom: 3,
    lineHeight: 14,
    color: '#000',
  },
  contactInfo: {
    fontSize: 10,
    lineHeight: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  contactValue: {
    fontSize: 10,
    fontWeight: 'normal',
    color: '#000',
  },
  section: {
    borderWidth: 1.5,
    borderColor: '#0371C1',
    padding: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0371C1',
  },
  gstRow: {
    flexDirection: 'row',
    padding: 3,
  },
  gstLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  gstValue: {
    fontSize: 10,
    fontWeight: 'normal',
    color: '#000',
  },
  invoiceTitleRow: {
    padding: 3,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    color: '#0371C1',
  },
  recipientRow: {
    padding: 3,
  },
  recipientText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  threeColSection: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: '#0371C1',
  },
  column: {
    width: '33.3%',
    paddingHorizontal: 4,
    borderLeftWidth: 1,
    borderLeftColor: '#0371C1',
  },
  noLeftBorder: {
    borderLeftWidth: 0,
  },
  noRightBorder: {
    borderRightWidth: 0,
  },
  columnHeader: {
    marginBottom: 5,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  invoiceDetailRow: {
    gap: 30,
  },
  threecoltableHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
  },
  tableLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    width: '40%',
    color: '#000',
  },
  tableValue: {
    fontSize: 8,
    fontWeight: 'normal',
    width: '70%',
    color: '#000',
  },
  tableContainer: {
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: '#0371C1',
  },
  itemsTableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(3, 113, 193, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: '#0371C1',
  },
  itemsTableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#0371C1',
  },
  itemsTableTotalRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(3, 113, 193, 0.2)',
    alignItems: 'center',
  },
  // Header Styles
  srNoHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  productHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    padding: 2,
    color: '#000',
  },
  hsnHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  qtyHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  rateHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  taxableHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  igstHeader: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  totalHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  igstMainHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 1,
    color: '#000',
  },
  igstSubHeader: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#0371C1',
  },
  igstSubText: {
    fontSize: 6,
    fontWeight: 'bold',
    width: '70%',
    textAlign: 'center',
    padding: 1,
    color: '#000',
  },
  igstSubPercentage: {
    fontSize: 6,
    fontWeight: 'bold',
    width: '30%',
    textAlign: 'center',
    padding: 1,
    color: '#000',
  },
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: '#0371C1',
  },
  // Cell Styles
  srNoCell: {
    fontSize: 7,
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  productCell: {
    fontSize: 7,
    textAlign: 'left',
    padding: 2,
    color: '#000',
  },
  hsnCell: {
    fontSize: 7,
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  qtyCell: {
    fontSize: 7,
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  rateCell: {
    fontSize: 7,
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  taxableCell: {
    fontSize: 7,
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  igstCell: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    textAlign: 'center',
    paddingVertical: 3,
  },
  igstPercent: {
    fontSize: 7,
    textAlign: 'center',
    padding: 1,
    width: '30%',
    color: '#000',
  },
  igstAmount: {
    fontSize: 7,
    textAlign: 'center',
    padding: 1,
    width: '70%',
    color: '#000',
  },
  totalCell: {
    fontSize: 7,
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  // Total Row Styles
  totalLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  totalEmpty: {
    fontSize: 7,
    padding: 2,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#000',
  },
  totalQty: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  totalTaxable: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  igstTotal: {
    fontSize: 7,
  },
  totalIgstAmount: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'right',
    padding: 1,
    color: '#000',
  },
  grandTotal: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 2,
    color: '#000',
  },
  bottomSection: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#0371C1',
    fontSize: 7,
  },
  leftSection: {
    width: '65%',
    borderRightWidth: 1,
    borderRightColor: '#0371C1',
  },
  totalInWords: {
    fontSize: 7,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#0371C1',
    padding: 3,
    textTransform: 'uppercase',
    color: '#000',
  },
  bankDetailsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 4,
  },
  bankDetailsContainer: {
    flex: 1,
  },
  bankDetailsTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#000',
  },
  bankDetailRow: {
    flexDirection: 'row',
    marginBottom: 1,
    fontSize: 8,
  },
  bankLabel: {
    width: 70,
    fontWeight: 'bold',
    color: '#000',
  },
  bankAddress: {
    flex: 1,
    color: '#000',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    marginLeft: 10,
  },
  qrTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  qrImage: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    backgroundColor: '#fff',
  },
  rightSection: {
    width: '35%',
    justifyContent: 'flex-start',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#0371C1',
    padding: 3,
  },
  label: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
  },
  value: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
  },
  labelBold: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
  },
  valueBold: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
  },
  highlightRow: {
    backgroundColor: '#EAF4FF',
  },
  termsBox: {
    padding: 8,
    paddingTop: 0,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#0371C1',
  },
  termLine: {
    fontSize: 10,
    marginBottom: 2,
    color: '#000000',
    textAlign: 'left',
    textDecorationLine: 'none',
    backgroundColor: 'transparent',
  },
  boldText: {
    fontWeight: 'bold',
  },
});

// ReactPDF Component
const TemplateA5PDFDocument = ({ transaction, company, party }) => {
  // Use the shipping address from transaction if available
  const shippingAddress = transaction?.shippingAddress || null;
  const bank = company?.bankDetails || null;
  const client = party || null;

  // --- Data Preparation and State Derivation ---
  const {
    totals,
    totalTaxable,
    totalAmount,
    items,
    totalItems,
    totalQty,
    itemsBody,
    itemsWithGST,
    totalCGST,
    totalSGST,
    totalIGST,
    isGSTApplicable,
    isInterstate,
    showIGST,
    showCGSTSGST,
    showNoTax,
  } = prepareTemplate8Data(transaction, company, party, shippingAddress);

  const logoSrc = company?.logo
    ? `${BASE_URL}${company.logo}`
    : null;

  // Bank Data Check - Added from Template 1
  const bankData = bank || {};

  // Check if any bank detail is available (used for conditional rendering)
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.qrCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  // **START: Terms and Conditions HTML rendering setup**
  const { title } = parseNotesHtml(transaction?.notes || '');
  const termsTitle = title || 'Terms and Conditions';
  // **END: Terms and Conditions HTML rendering setup**

  // Render individual item row
  const renderItemRow = (item, index) => (
    <View key={index} style={styles.itemsTableRow}>
      <Text style={[styles.srNoCell, { width: '8%' }]}>{index + 1}</Text>
      <Text style={[styles.productCell, { width: '25%' }]}>
        {capitalizeWords(item.name)}
      </Text>
      <Text style={[styles.hsnCell, { width: '10%' }]}>{item.code || '-'}</Text>
      <Text style={[styles.qtyCell, { width: '8%' }]}>
        {item.itemType === 'service'
          ? '-'
          : formatQuantity(item.quantity || 0, item.unit)}
      </Text>
      <Text style={[styles.rateCell, { width: '10%' }]}>
        {formatCurrency(item.pricePerUnit || 0)}
      </Text>
      <Text style={[styles.taxableCell, { width: '12%' }]}>
        {formatCurrency(item.taxableValue)}
      </Text>

      {showIGST ? (
        <View style={[styles.igstCell, { width: '12%' }]}>
          <Text style={styles.igstPercent}>{item.gstRate}</Text>
          <Text style={styles.igstAmount}>{formatCurrency(item.igst)}</Text>
        </View>
      ) : showCGSTSGST ? (
        <>
          <View style={[styles.igstCell, { width: '12%' }]}>
            <Text style={styles.igstPercent}>{item.gstRate / 2}</Text>
            <Text style={styles.igstAmount}>{formatCurrency(item.cgst)}</Text>
          </View>
          <View style={[styles.igstCell, { width: '12%' }]}>
            <Text style={styles.igstPercent}>{item.gstRate / 2}</Text>
            <Text style={styles.igstAmount}>{formatCurrency(item.sgst)}</Text>
          </View>
        </>
      ) : null}

      <Text style={[styles.totalCell, { width: '15%' }]}>
        {formatCurrency(item.total)}
      </Text>
    </View>
  );

  // Render table header
  const renderTableHeader = () => (
    <View style={styles.itemsTableHeader}>
      <Text style={[styles.srNoHeader, { width: '8%' }]}>Sr. No.</Text>
      <Text style={[styles.productHeader, { width: '25%' }]}>
        Name of Product/Service
      </Text>
      <Text style={[styles.hsnHeader, { width: '10%' }]}>HSN/SAC</Text>
      <Text style={[styles.qtyHeader, { width: '8%' }]}>Qty</Text>
      <Text style={[styles.rateHeader, { width: '10%' }]}>Rate (Rs.)</Text>
      <Text style={[styles.taxableHeader, { width: '12%' }]}>
        Taxable Value (Rs.)
      </Text>

      {showIGST ? (
        <View style={[styles.igstHeader, { width: '12%' }]}>
          <Text style={styles.igstMainHeader}>IGST</Text>
          <View style={styles.igstSubHeader}>
            <Text style={[styles.igstSubPercentage, styles.borderRight]}>
              %
            </Text>
            <Text style={styles.igstSubText}>Amount (Rs.)</Text>
          </View>
        </View>
      ) : showCGSTSGST ? (
        <>
          <View style={[styles.igstHeader, { width: '12%' }]}>
            <Text style={styles.igstMainHeader}>CGST</Text>
            <View style={styles.igstSubHeader}>
              <Text style={[styles.igstSubPercentage, styles.borderRight]}>
                %
              </Text>
              <Text style={styles.igstSubText}>Amount (Rs.)</Text>
            </View>
          </View>
          <View style={[styles.igstHeader, { width: '12%' }]}>
            <Text style={styles.igstMainHeader}>SGST</Text>
            <View style={styles.igstSubHeader}>
              <Text style={[styles.igstSubPercentage, styles.borderRight]}>
                %
              </Text>
              <Text style={styles.igstSubText}>Amount (Rs.)</Text>
            </View>
          </View>
        </>
      ) : null}

      <Text style={[styles.totalHeader, { width: '15%' }]}>Total (Rs.)</Text>
    </View>
  );

  // Render total row
  const renderTotalRow = () => (
    <View style={styles.itemsTableTotalRow}>
      <Text style={[styles.totalLabel, { width: '8%' }]}></Text>
      <Text style={[styles.totalEmpty, { width: '25%' }]}></Text>
      <Text style={[styles.totalEmpty, { width: '10%' }]}>Total</Text>
      <Text style={[styles.totalQty, { width: '8%' }]}>{totalQty}</Text>
      <Text style={[styles.totalEmpty, { width: '10%' }]}></Text>
      <Text style={[styles.totalTaxable, { width: '12%' }]}>
        {formatCurrency(totalTaxable)}
      </Text>

      {showIGST ? (
        <View style={[styles.igstTotal, { width: '12%' }]}>
          <Text style={[styles.totalIgstAmount, { paddingRight: 20 }]}>
            {formatCurrency(totalIGST)}
          </Text>
        </View>
      ) : showCGSTSGST ? (
        <>
          <View style={[styles.igstTotal, { width: '12%', paddingRight: 9 }]}>
            <Text style={styles.totalIgstAmount}>
              {formatCurrency(totalCGST)}
            </Text>
          </View>
          <View style={[styles.igstTotal, { width: '12%', paddingRight: 13 }]}>
            <Text style={styles.totalIgstAmount}>
              {formatCurrency(totalSGST)}
            </Text>
          </View>
        </>
      ) : null}

      <Text style={[styles.grandTotal, { width: '15%' }]}>
        {formatCurrency(totalAmount)}
      </Text>
    </View>
  );

  // Render bank details
  const renderBankDetails = () => (
    <View style={styles.bankDetailsContainer}>
      <Text style={styles.bankDetailsTitle}>Bank Details:</Text>

      {bankData?.bankName && (
        <View style={styles.bankDetailRow}>
          <Text style={styles.bankLabel}>Name:</Text>
          <Text>{capitalizeWords(bankData.bankName)}</Text>
        </View>
      )}

      {bankData?.accountNo && (
        <View style={styles.bankDetailRow}>
          <Text style={styles.bankLabel}>Acc. No:</Text>
          <Text>{bankData.accountNo}</Text>
        </View>
      )}

      {bankData?.ifscCode && (
        <View style={styles.bankDetailRow}>
          <Text style={styles.bankLabel}>IFSC:</Text>
          <Text>{bankData.ifscCode}</Text>
        </View>
      )}

      {bankData?.branchAddress && (
        <View style={styles.bankDetailRow}>
          <Text style={styles.bankLabel}>Branch:</Text>
          <Text style={styles.bankAddress}>{bankData.branchAddress}</Text>
        </View>
      )}

      {bankData?.upiDetails?.upiId && (
        <View style={styles.bankDetailRow}>
          <Text style={styles.bankLabel}>UPI ID:</Text>
          <Text>{bankData.upiDetails.upiId}</Text>
        </View>
      )}

      {bankData?.upiDetails?.upiName && (
        <View style={styles.bankDetailRow}>
          <Text style={styles.bankLabel}>UPI Name:</Text>
          <Text>{bankData.upiDetails.upiName}</Text>
        </View>
      )}

      {bankData?.upiDetails?.upiMobile && (
        <View style={styles.bankDetailRow}>
          <Text style={styles.bankLabel}>UPI Mobile:</Text>
          <Text>{bankData.upiDetails.upiMobile}</Text>
        </View>
      )}
    </View>
  );

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoSrc && <Image src={logoSrc} style={styles.logo} />}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>
              {capitalizeWords(
                company?.businessName || company?.companyName || 'Company Name',
              )}
            </Text>
            <Text style={styles.address}>
              {[
                company?.address,
                company?.City,
                company?.addressState,
                company?.Country,
                company?.Pincode,
              ]
                .filter(Boolean)
                .join(', ') || 'Address Line 1'}
            </Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Name : </Text>
              <Text style={styles.contactValue}>
                {capitalizeWords(getClientName(client))}
              </Text>
              <Text style={styles.contactLabel}> | Phone : </Text>
              <Text style={styles.contactValue}>
                {company?.mobileNumber
                  ? formatPhoneNumber(String(company.mobileNumber))
                  : company?.Telephone
                  ? formatPhoneNumber(String(company.Telephone))
                  : '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* Main Content Section */}
        <View style={styles.section}>
          {/* Invoice Title and GSTIN */}
          <View style={styles.tableHeader}>
            {company?.gstin && (
              <View style={styles.gstRow}>
                <Text style={styles.gstLabel}>GSTIN : </Text>
                <Text style={styles.gstValue}>{company.gstin}</Text>
              </View>
            )}

            <View style={styles.invoiceTitleRow}>
              <Text style={styles.invoiceTitle}>
                {transaction.type === 'proforma'
                  ? 'PROFORMA INVOICE'
                  : isGSTApplicable
                  ? 'TAX INVOICE'
                  : 'INVOICE'}
              </Text>
            </View>

            <View style={styles.recipientRow}>
              <Text style={styles.recipientText}>ORIGINAL FOR RECIPIENT</Text>
            </View>
          </View>

          {/* Three Column Details Section */}
          <View style={styles.threeColSection}>
            {/* Column 1 - Details of Buyer */}
            <View style={[styles.column, styles.noLeftBorder]}>
              <View style={styles.columnHeader}>
                <Text style={styles.threecoltableHeader}>
                  Details of Buyer | Billed to:
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.tableLabel}>Name</Text>
                <Text style={styles.tableValue}>
                  {capitalizeWords(party?.name || 'N/A')}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.tableLabel}>Address</Text>
                <Text style={styles.tableValue}>
                  {capitalizeWords(getBillingAddress(party)) || '-'}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.tableLabel}>Phone</Text>
                <Text style={styles.tableValue}>
                  {party?.contactNumber
                    ? formatPhoneNumber(party.contactNumber)
                    : '-'}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.tableLabel}>GSTIN</Text>
                <Text style={styles.tableValue}>{party?.gstin || '-'}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.tableLabel}>PAN</Text>
                <Text style={styles.tableValue}>{party?.pan || '-'}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.tableLabel}>Place of Supply</Text>
                <Text style={styles.tableValue}>
                  {shippingAddress?.state
                    ? `${capitalizeWords(shippingAddress.state)} (${
                        getStateCode(shippingAddress.state) || '-'
                      })`
                    : party?.state
                    ? `${capitalizeWords(party.state)} (${
                        getStateCode(party.state) || '-'
                      })`
                    : '-'}
                </Text>
              </View>
            </View>

            {/* Column 2 - Details of Consigned */}
            <View style={styles.column}>
              <View style={styles.columnHeader}>
                <Text style={styles.threecoltableHeader}>
                  Details of Consigned | Shipped to:
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.tableLabel}>Name</Text>
                <Text style={styles.tableValue}>
                  {capitalizeWords(
                    shippingAddress?.label || party?.name || 'N/A',
                  )}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.tableLabel}>Address</Text>
                <Text style={styles.tableValue}>
                  {capitalizeWords(
                    getShippingAddress(shippingAddress, getBillingAddress(party)),
                  )}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.tableLabel}>Country</Text>
                <Text style={styles.tableValue}>India</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.tableLabel}>Phone</Text>
                <Text style={styles.tableValue}>
                  {shippingAddress?.contactNumber
                    ? formatPhoneNumber(String(shippingAddress.contactNumber))
                    : party?.contactNumber
                    ? formatPhoneNumber(String(party.contactNumber))
                    : '-'}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.tableLabel}>GSTIN</Text>
                <Text style={styles.tableValue}>{party?.gstin || '-'}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.tableLabel}>State</Text>
                <Text style={styles.tableValue}>
                  {shippingAddress?.state
                    ? `${capitalizeWords(shippingAddress.state)} (${
                        getStateCode(shippingAddress.state) || '-'
                      })`
                    : party?.state
                    ? `${capitalizeWords(party.state)} (${
                        getStateCode(party.state) || '-'
                      })`
                    : '-'}
                </Text>
              </View>
            </View>

            {/* Column 3 - Invoice Details */}
            <View style={[styles.column, styles.noRightBorder]}>
              <View style={[styles.dataRow, styles.invoiceDetailRow]}>
                <Text style={styles.tableLabel}>Invoice No.</Text>
                <Text style={styles.tableValue}>
                  {transaction.invoiceNumber || 'N/A'}
                </Text>
              </View>
              <View style={[styles.dataRow, styles.invoiceDetailRow]}>
                <Text style={styles.tableLabel}>Invoice Date</Text>
                <Text style={styles.tableValue}>
                  {new Date(transaction.date).toLocaleDateString('en-IN')}
                </Text>
              </View>
              <View style={[styles.dataRow, styles.invoiceDetailRow]}>
                <Text style={styles.tableLabel}>Due Date</Text>
                <Text style={styles.tableValue}>
                  {new Date(transaction.dueDate).toLocaleDateString('en-IN')}
                </Text>
              </View>
              <View style={[styles.dataRow, styles.invoiceDetailRow]}>
                <Text style={styles.tableLabel}>P.O. No.</Text>
                <Text style={styles.tableValue}>
                  {transaction.voucher || '-'}
                </Text>
              </View>
              <View style={[styles.dataRow, styles.invoiceDetailRow]}>
                <Text style={styles.tableLabel}>E-Way No.</Text>
                <Text style={styles.tableValue}>{transaction.eway || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Items Table - Main Content */}
          <View style={styles.tableContainer}>
            {renderTableHeader()}
            {itemsWithGST.map(renderItemRow)}
            {renderTotalRow()}
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            {/* Left Column: Total in words + Bank Details */}
            <View style={styles.leftSection}>
              <Text style={styles.totalInWords}>
                Total in words : {numberToWords(totalAmount)}
              </Text>

              {/* Bank Details Section */}
              {transaction.type !== 'proforma' && isBankDetailAvailable && (
                <View style={styles.bankDetailsWrapper}>
                  {renderBankDetails()}

                  {/* QR Code Section */}
                  {bankData?.qrCode && (
                    <View style={styles.qrContainer}>
                      <Text style={styles.qrTitle}>QR Code</Text>
                      <Image
                        src={`${BASE_URL}/${bankData.qrCode}`}
                        style={styles.qrImage}
                      />
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Right Column: Totals */}
            <View style={styles.rightSection}>
              <View style={styles.totalRow}>
                <Text style={styles.label}>Taxable Amount</Text>
                <Text style={styles.value}>
                  {`Rs.${formatCurrency(totalTaxable)}`}
                </Text>
              </View>

              {isGSTApplicable && (
                <View style={styles.totalRow}>
                  <Text style={styles.label}>Total Tax</Text>
                  <Text style={styles.value}>
                    {`Rs.${formatCurrency(
                      showIGST ? totalIGST : totalCGST + totalSGST,
                    )}`}
                  </Text>
                </View>
              )}

              <View
                style={[styles.totalRow, isGSTApplicable && styles.highlightRow]}
              >
                <Text style={isGSTApplicable ? styles.labelBold : styles.label}>
                  {isGSTApplicable ? 'Total Amount After Tax' : 'Total Amount'}
                </Text>
                <Text style={isGSTApplicable ? styles.valueBold : styles.value}>
                  {`Rs.${formatCurrency(totalAmount)}`}
                </Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.label}>
                  For-
                  {company?.businessName ||
                    company?.companyName ||
                    'Company Name'}
                </Text>
                <Text style={styles.value}>(E & O.E.)</Text>
              </View>
            </View>
          </View>

          {/* Terms and Conditions */}
          {transaction?.notes && (
            <View style={styles.termsBox}>
              <Text style={[styles.termLine, styles.boldText]}></Text>
              {/* Simple text rendering for notes - adjust as needed */}
              <Text style={styles.termLine}>{transaction.notes}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};

// MAIN EXPORT FUNCTION - This is what InvoicePreview.js expects
export const generatePdfForTemplateA5 = async (transaction, company, party, serviceNameMap) => {
  try {
    // Generate PDF using ReactPDF
    const pdfBytes = await ReactPDF.renderToStream(<TemplateA5PDFDocument 
      transaction={transaction}
      company={company}
      party={party}
    />);
    
    // Convert to base64
    const base64 = Buffer.from(pdfBytes).toString('base64');
    
    // Return in the expected format
    return {
      base64,
      filePath: null, // ReactPDF doesn't create a file directly
    };
    
  } catch (error) {
    console.error('Template A5 PDF generation error:', error);
    
    // Fallback: Try using HTML to PDF if ReactPDF fails
    try {
      const RNHTMLtoPDF = require('react-native-html-to-pdf');
      
      // Create simple HTML as fallback
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .invoice-title { text-align: center; font-size: 24px; font-weight: bold; color: #0371C1; margin-bottom: 20px; }
              .company-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
              .address { font-size: 12px; margin-bottom: 20px; }
              .section { border: 2px solid #0371C1; padding: 10px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="company-name">${company?.businessName || company?.companyName || 'Company Name'}</div>
            <div class="address">
              ${[company?.address, company?.City, company?.addressState, company?.Country, company?.Pincode]
                .filter(Boolean).join(', ') || 'Address'}
            </div>
            <div class="invoice-title">
              ${transaction.type === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE'}
            </div>
            <div class="section">
              <p><strong>Invoice No:</strong> ${transaction.invoiceNumber || 'N/A'}</p>
              <p><strong>Invoice Date:</strong> ${new Date(transaction.date).toLocaleDateString('en-IN')}</p>
              <p><strong>Client:</strong> ${party?.name || 'N/A'}</p>
              <p><strong>Total Amount:</strong> Rs. ${formatCurrency(transaction.totalAmount || 0)}</p>
            </div>
            <p>Generated with Template A5</p>
          </body>
        </html>
      `;
      
      const options = {
        html: htmlContent,
        fileName: `invoice_${transaction.invoiceNumber || Date.now()}`,
        directory: 'Documents',
      };
      
      const file = await generatePDF(options);
      return file;
      
    } catch (fallbackError) {
      console.error('Fallback PDF generation also failed:', fallbackError);
      throw new Error(`Failed to generate PDF: ${fallbackError.message}`);
    }
  }
};

// Also export the component for other uses
export default TemplateA5PDFDocument;