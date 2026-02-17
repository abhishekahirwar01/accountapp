import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { generatePDF } from 'react-native-html-to-pdf';
import RNHTMLtoPDF from 'react-native-html-to-pdf';

// Import utility functions from your existing codebase
import {
  deriveTotals,
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  getItemsBody,
  calculateGST,
  getUnifiedLines,
  prepareTemplate8Data,
  numberToWords,
  formatPhoneNumber,
  formatQuantity,
} from './pdf-utils';
import { capitalizeWords } from './utils';
import { BASE_URL } from '../config';

const SEPARATOR = '==============================================';

// Helper function to convert mm to pixels for thermal paper sizing
const mmToPixels = mm => {
  const dpi = Platform.OS === 'ios' ? 72 : 96; // Approximate DPI
  return (mm * dpi) / 25.4;
};

// Helper to determine GST Label
const getTaxLabel = (showIGST, totalCGST, totalSGST) => {
  if (showIGST) return 'Add: IGST';
  if (totalCGST > 0 || totalSGST > 0) return 'Add: Total Tax';
  return 'Total Tax';
};

// Main Component
const Template18Receipt = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
}) => {
   const actualShippingAddress = shippingAddress || transaction?.shippingAddress;
  // Use the same data preparation logic from web version
  const {
    totalTaxable,
    totalAmount,
    items,
    totalItems,
    totalQty,
    itemsWithGST,
    totalCGST,
    totalSGST,
    totalIGST,
    isGSTApplicable,
    isInterstate,
    showIGST,
    showCGSTSGST,
    showNoTax,
  } = prepareTemplate8Data(transaction, company, party, actualShippingAddress);

  // Bank with UPI details
  const bankDataWithUpi = bank;
  const isUpiAvailable = bankDataWithUpi?.upiDetails?.upiId;

  const taxLabel = getTaxLabel(showIGST, totalCGST, totalSGST);
  const totalTaxAmount = totalIGST || totalCGST + totalSGST;

  // Format date matching web version
  const formatDate = date => {
    return new Date(date)
      .toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .toUpperCase()
      .replace(/\./g, '-');
  };

  // Calculate thermal paper width (80mm paper)
  const thermalWidth = mmToPixels(80);
  const screenWidth = Dimensions.get('window').width;
  const receiptWidth = Math.min(thermalWidth, screenWidth - 24); // 24px padding

  // Items breakdown structure
  const itemsBreakdown = itemsWithGST.map(item => ({
    name: capitalizeWords(item.name),
    qty: item.quantity || 0,
    unit: item.unit || 'BDL',
    rate: item.pricePerUnit || 0,
    hsn: item.code || '-',
    gstRate: item.gstRate,
    taxableValue: item.taxableValue,
    total: item.total,
    tax: item.igst || item.cgst + item.sgst,
  }));

  // return (
  //   <ScrollView style={styles.container}>
  //     <View style={[styles.receipt, { width: receiptWidth }]}>
  //       {/* Company Header - Centered */}
  //       <View style={styles.companyHeaderSection}>
  //         <Text style={styles.companyNameTop}>
  //           {capitalizeWords(
  //             company?.businessName ||
  //               company?.companyName ||
  //               'Global Securities',
  //           )}
  //         </Text>
  //         <Text style={styles.address}>
  //           {capitalizeWords(
  //             [company?.address, company?.City, company?.addressState]
  //               .filter(Boolean)
  //               .join(', '),
  //           )}
  //         </Text>
  //         <Text style={styles.address}>
  //           {capitalizeWords(company?.Country || 'India')} -{' '}
  //           {company?.Pincode || ''}
  //         </Text>
  //         {company?.mobileNumber && (
  //           <Text style={styles.gstin}>
  //             Phone no: {formatPhoneNumber(String(company.mobileNumber))}
  //           </Text>
  //         )}
  //         {company?.gstin && (
  //           <Text style={styles.gstin}>GSTIN: {company.gstin}</Text>
  //         )}
  //       </View>

  //       {/* TAX INVOICE Header */}
  //       <View style={styles.invoiceTitleContainer}>
  //         <Text style={styles.invoiceTitle}>
  //           ========================TAX INVOICE=======================
  //         </Text>
  //       </View>

  //       {/* INVOICE # and DATE */}
  //       <View style={styles.invoiceMetaRow}>
  //         <Text style={styles.invoiceMetaTextLeft}>
  //           INVOICE #: {transaction.invoiceNumber || 'N/A'}
  //         </Text>
  //         <Text style={styles.invoiceMetaTextRight}>
  //           DATE: {formatDate(transaction.date)}
  //         </Text>
  //       </View>

  //       {/* Billed To Section */}
  //       <View style={styles.billedToBox}>
  //         <Text style={styles.billedToHeader}>
  //           ============================BILLED TO============================
  //         </Text>
  //         <Text style={styles.billedToText}>
  //           Name : {capitalizeWords(party?.name || 'Jay Enterprises')}
  //         </Text>
  //         {party?.contactNumber && (
  //           <Text style={styles.billedToText}>
  //             {formatPhoneNumber(party.contactNumber)}
  //           </Text>
  //         )}
  //         {party?.gstin && (
  //           <Text style={styles.billedToText}>GSTIN : {party.gstin}</Text>
  //         )}
  //         {party?.pan && (
  //           <Text style={styles.billedToText}>PAN : {party.pan}</Text>
  //         )}
  //         <Text style={styles.billedToHeader}>
  //           =================================================================
  //         </Text>
  //       </View>

  //       {/* Items Table Header */}
  //       <View style={styles.itemsTableHeaderSimple}>
  //         <Text
  //           style={[
  //             styles.itemsHeaderColumn,
  //             { width: '30%', textAlign: 'left' },
  //           ]}
  //         >
  //           Items
  //         </Text>
  //         <Text
  //           style={[
  //             styles.itemsHeaderColumn,
  //             { width: '25%', textAlign: 'center' },
  //           ]}
  //         >
  //           Amount (Rs.)
  //         </Text>
  //         <Text
  //           style={[
  //             styles.itemsHeaderColumn,
  //             { width: '40%', textAlign: 'center' },
  //           ]}
  //         >
  //           GST
  //         </Text>
  //         <Text
  //           style={[
  //             styles.itemsHeaderColumn,
  //             { width: '30%', textAlign: 'right' },
  //           ]}
  //         >
  //           Total(Rs)
  //         </Text>
  //       </View>
  //       <Text style={styles.separator}>
  //         ==========================================================
  //       </Text>

  //       {/* Items Table Body */}
  //       <View style={styles.itemsTableSimple}>
  //         {itemsWithGST.map((item, index) => (
  //           <View key={index} style={styles.itemsTableRowSimple}>
  //             {/* Item Details - Position 1 */}
  //             <View style={[styles.itemDetailsCell, { width: '30%' }]}>
  //               <Text style={styles.itemNameText}>
  //                 {capitalizeWords(item.name)}
  //               </Text>
  //               {item.itemType !== 'service' && (
  //                 <Text style={styles.itemSubText}>
  //                   {formatQuantity(item.quantity || 0, item.unit)}
  //                 </Text>
  //               )}
  //               <Text style={styles.itemSubText}>
  //                 {item.itemType === 'service' ? 'SAC' : 'HSN'}:{' '}
  //                 {item.code || '-'}
  //               </Text>
  //             </View>

  //             {/* Amount - Position 3 */}
  //             <View
  //               style={[
  //                 styles.itemDetailsCell,
  //                 { width: '25%', alignItems: 'center' },
  //               ]}
  //             >
  //               <Text style={styles.itemSubText}>
  //                 {formatCurrency(item.pricePerUnit || 0)}
  //               </Text>
  //             </View>

  //             {/* GST - Position 2 */}
  //             <View style={[styles.taxablePlusGSTCell, { width: '40%' }]}>
  //               {isGSTApplicable ? (
  //                 <>
  //                   {showIGST ? (
  //                     <Text style={styles.gstRateText}>
  //                       IGST-{item.gstRate.toFixed(2)}%
  //                     </Text>
  //                   ) : showCGSTSGST ? (
  //                     <>
  //                       <Text style={styles.gstRateText}>
  //                         CGST-{(item.gstRate / 2).toFixed(2)}%
  //                       </Text>
  //                       <Text style={styles.gstRateText}>
  //                         SGST-{(item.gstRate / 2).toFixed(2)}%
  //                       </Text>
  //                     </>
  //                   ) : (
  //                     <Text style={styles.gstRateText}>No Tax</Text>
  //                   )}
  //                 </>
  //               ) : (
  //                 <Text style={styles.gstRateText}>No Tax</Text>
  //               )}
  //             </View>

  //             {/* Total - Position 4 */}
  //             <Text style={[styles.totalCellSimple, { width: '30%' }]}>
  //               {formatCurrency(item.total)}
  //             </Text>
  //           </View>
  //         ))}
  //       </View>

  //       {/* Summary Header */}
  //       <View style={styles.invoiceTitleContainer}>
  //         <Text style={styles.invoiceTitle}>
  //           ========================SUMMARY=======================
  //         </Text>
  //       </View>

  //       {/* Summary Section */}
  //       <View style={styles.summaryContainer}>
  //         <Text style={styles.separatorDouble}></Text>
  //         <View style={styles.summarySection}>
  //           <View style={styles.summaryRow}>
  //             <Text style={styles.summaryLabel}>Taxable Amount</Text>
  //             <Text style={styles.summaryValue}>
  //               Rs {formatCurrency(totalTaxable)}
  //             </Text>
  //           </View>

  //           {showIGST && (
  //             <View style={styles.summaryRow}>
  //               <Text style={styles.summaryLabel}>Add: IGST</Text>
  //               <Text style={styles.summaryValue}>
  //                 Rs {formatCurrency(totalIGST)}
  //               </Text>
  //             </View>
  //           )}

  //           {showCGSTSGST && (
  //             <>
  //               <View style={styles.summaryRow}>
  //                 <Text style={styles.summaryLabel}>Add: CGST</Text>
  //                 <Text style={styles.summaryValue}>
  //                   Rs {formatCurrency(totalCGST)}
  //                 </Text>
  //               </View>
  //               <View style={styles.summaryRow}>
  //                 <Text style={styles.summaryLabel}>Add: SGST</Text>
  //                 <Text style={styles.summaryValue}>
  //                   Rs {formatCurrency(totalSGST)}
  //                 </Text>
  //               </View>
  //             </>
  //           )}

  //           <View style={styles.summaryRow}>
  //             <Text style={styles.summaryLabel}>Total Tax</Text>
  //             <Text style={styles.summaryValue}>
  //               Rs {formatCurrency(totalIGST || totalCGST + totalSGST)}
  //             </Text>
  //           </View>

  //           <View style={styles.summaryRow}>
  //             <Text style={styles.summaryLabel}>Total Amount After Tax</Text>
  //             <Text style={styles.summaryValue}>
  //               Rs {formatCurrency(totalAmount).replace('₹', '')}
  //             </Text>
  //           </View>

  //           <View style={styles.summaryRow}>
  //             <Text style={styles.summaryLabel}>
  //               GST Payable on Reverse Charge
  //             </Text>
  //             <Text style={styles.summaryValue}>N.A.</Text>
  //           </View>

  //           <Text style={styles.separatorDouble}></Text>

  //           <View style={styles.summaryRow}>
  //             <Text style={styles.summaryLabelGrand}>Grand Total</Text>
  //             <Text style={styles.summaryValueGrand}>
  //               Rs {formatCurrency(totalAmount).replace('₹', '')}
  //             </Text>
  //           </View>

  //           <Text style={styles.separatorDouble}></Text>

  //           {/* Amount in Words Section */}
  //           <View style={styles.amountInWordsSection}>
  //             <Text style={styles.amountInWordsLabel}>Amount in Words:</Text>
  //             <Text style={styles.amountInWordsText}>
  //               {numberToWords(totalAmount)} ONLY
  //             </Text>
  //           </View>

  //           <Text style={styles.separatorDouble}></Text>
  //         </View>

  //         {/* Bank Details Section */}
  //         {bankDataWithUpi && (
  //           <View style={styles.bankDetailsSection}>
  //             <Text style={styles.bankDetailsHeader}>
  //               ========================BANK DETAILS========================
  //             </Text>
  //             {bankDataWithUpi.bankName && (
  //               <Text style={styles.bankDetailText}>
  //                 Bank Name: {bankDataWithUpi.bankName}
  //               </Text>
  //             )}
  //             {bankDataWithUpi.accountNumber && (
  //               <Text style={styles.bankDetailText}>
  //                 A/C No: {bankDataWithUpi.accountNumber}
  //               </Text>
  //             )}
  //             {bankDataWithUpi.ifscCode && (
  //               <Text style={styles.bankDetailText}>
  //                 IFSC: {bankDataWithUpi.ifscCode}
  //               </Text>
  //             )}
  //             {bankDataWithUpi.accountHolderName && (
  //               <Text style={styles.bankDetailText}>
  //                 Account Holder: {bankDataWithUpi.accountHolderName}
  //               </Text>
  //             )}
  //           </View>
  //         )}

  //         {/* UPI Payment Section */}
  //         {isUpiAvailable && (
  //           <View style={styles.upiSection}>
  //             <Text style={styles.upiHeader}>
  //               ========================UPI PAYMENT========================
  //             </Text>

  //             {bankDataWithUpi?.qrCode ? (
  //               <View style={styles.qrCodeContainer}>
  //                 <Text style={styles.qrCodeTitle}>Scan & Pay</Text>
  //                 <View style={styles.qrCodeWrapper}>
  //                   <Image
  //                     source={{
  //                       uri: `${process.env.REACT_APP_BASE_URL || ''}/${
  //                         bankDataWithUpi.qrCode
  //                       }`,
  //                     }}
  //                     style={styles.qrCodeImage}
  //                     resizeMode="contain"
  //                   />
  //                 </View>
  //               </View>
  //             ) : null}

  //             <View style={styles.upiDetailsContainer}>
  //               {bankDataWithUpi.upiDetails.upiId && (
  //                 <Text style={styles.upiTextDetail}>
  //                   UPI ID: {bankDataWithUpi.upiDetails.upiId}
  //                 </Text>
  //               )}
  //               {bankDataWithUpi.upiDetails.upiName && (
  //                 <Text style={styles.upiTextDetail}>
  //                   UPI Name: {bankDataWithUpi.upiDetails.upiName}
  //                 </Text>
  //               )}
  //               {bankDataWithUpi.upiDetails.upiMobile && (
  //                 <Text style={styles.upiTextDetail}>
  //                   UPI Mobile No: {bankDataWithUpi.upiDetails.upiMobile}
  //                 </Text>
  //               )}
  //             </View>
  //           </View>
  //         )}

  //         {/* Terms and Conditions Section */}
  //         <View style={styles.termsSection}>
  //           <Text style={styles.termsHeader}>
  //             ======================TERMS & CONDITIONS======================
  //           </Text>
  //           <Text style={styles.termsText}>
  //             1. Goods once sold will not be taken back.
  //           </Text>
  //           <Text style={styles.termsText}>
  //             2. Interest @18% p.a. will be charged if the payment is not made
  //             within the stipulated time.
  //           </Text>
  //           <Text style={styles.termsText}>
  //             3. Subject to 'Pune' Jurisdiction only.
  //           </Text>
  //         </View>

  //         {/* Footer Section */}
  //         <View style={styles.footerSection}>
  //           <Text style={styles.footerSeparator}>
  //             ==========================================================
  //           </Text>
  //           <Text style={styles.footerText}>
  //             This is a computer generated invoice
  //           </Text>
  //           <Text style={styles.footerText}>E. & O.E.</Text>
  //           <Text style={styles.footerText}>
  //             For{' '}
  //             {capitalizeWords(
  //               company?.businessName ||
  //                 company?.companyName ||
  //                 'Global Securities',
  //             )}
  //           </Text>
  //           <Text style={styles.footerText}>Authorized Signatory</Text>
  //         </View>
  //       </View>
  //     </View>
  //   </ScrollView>
  // );
};

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FFFFFF',
//   },
//   receipt: {
//     paddingVertical: 16,
//     paddingHorizontal: 12,
//     backgroundColor: '#FFFFFF',
//     alignSelf: 'center',
//   },

//   // Company Header
//   companyHeaderSection: {
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   companyNameTop: {
//     fontSize: 14,
//     fontWeight: 'bold',
//     marginBottom: 2,
//     color: '#000000',
//     textAlign: 'center',
//   },
//   address: {
//     fontSize: 10,
//     textAlign: 'center',
//     lineHeight: 14,
//     color: '#000000',
//   },
//   gstin: {
//     fontSize: 10,
//     marginTop: 2,
//     color: '#000000',
//     textAlign: 'center',
//   },

//   // Invoice Title
//   invoiceTitleContainer: {
//     alignItems: 'center',
//     marginBottom: 4,
//   },
//   invoiceTitle: {
//     fontSize: 10,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     color: '#000000',
//   },

//   // Invoice Meta Row
//   invoiceMetaRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 8,
//   },
//   invoiceMetaTextLeft: {
//     fontSize: 10,
//     fontWeight: 'normal',
//     color: '#000000',
//     textAlign: 'left',
//   },
//   invoiceMetaTextRight: {
//     fontSize: 10,
//     fontWeight: 'normal',
//     color: '#000000',
//     textAlign: 'right',
//   },

//   // Billed To Section
//   billedToBox: {
//     flexDirection: 'column',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   billedToHeader: {
//     fontSize: 9,
//     fontWeight: 'bold',
//     color: '#000000',
//     textAlign: 'center',
//     marginBottom: 2,
//   },
//   billedToText: {
//     fontSize: 10,
//     fontWeight: 'normal',
//     color: '#000000',
//     lineHeight: 14,
//     textAlign: 'center',
//   },

//   // Items Table
//   itemsTableHeaderSimple: {
//     flexDirection: 'row',
//     alignItems: 'stretch',
//     marginTop: 8,
//   },
//   itemsHeaderColumn: {
//     fontSize: 10,
//     fontWeight: 'bold',
//     padding: 2,
//     color: '#000000',
//   },
//   separator: {
//     fontSize: 10,
//     textAlign: 'center',
//     marginVertical: 4,
//     color: '#000000',
//   },
//   itemsTableSimple: {
//     flexDirection: 'column',
//     marginTop: 4,
//   },
//   itemsTableRowSimple: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     marginVertical: 6,
//     paddingBottom: 6,
//     borderBottomWidth: 0.5,
//     borderBottomColor: '#E0E0E0',
//   },
//   itemDetailsCell: {
//     flexDirection: 'column',
//     justifyContent: 'flex-start',
//   },
//   itemNameText: {
//     fontSize: 10,
//     fontWeight: 'normal',
//     color: '#000000',
//   },
//   itemSubText: {
//     fontSize: 9,
//     fontWeight: 'normal',
//     color: '#000000',
//     lineHeight: 13,
//   },
//   taxablePlusGSTCell: {
//     flexDirection: 'column',
//     justifyContent: 'flex-start',
//     paddingLeft: 10,
//   },
//   gstRateText: {
//     fontSize: 9,
//     fontWeight: 'normal',
//     color: '#000000',
//     lineHeight: 13,
//   },
//   totalCellSimple: {
//     fontSize: 10,
//     fontWeight: 'normal',
//     textAlign: 'right',
//     color: '#000000',
//   },

//   // Summary Section
//   summaryContainer: {
//     marginTop: 8,
//     flexDirection: 'column',
//   },
//   separatorDouble: {
//     fontSize: 10,
//     textAlign: 'center',
//     marginVertical: 2,
//     fontWeight: 'bold',
//     color: '#000000',
//   },
//   summarySection: {
//     width: '100%',
//     flexDirection: 'column',
//   },
//   summaryRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginVertical: 2,
//   },
//   summaryLabel: {
//     fontSize: 10,
//     fontWeight: 'normal',
//     color: '#000000',
//   },
//   summaryValue: {
//     fontSize: 10,
//     fontWeight: 'normal',
//     color: '#000000',
//   },
//   summaryLabelGrand: {
//     fontSize: 11,
//     fontWeight: 'bold',
//     color: '#000000',
//   },
//   summaryValueGrand: {
//     fontSize: 11,
//     fontWeight: 'bold',
//     color: '#000000',
//   },

//   // Amount in Words Section
//   amountInWordsSection: {
//     marginVertical: 8,
//     padding: 6,
//     backgroundColor: '#F8F9FA',
//     borderRadius: 4,
//   },
//   amountInWordsLabel: {
//     fontSize: 10,
//     fontWeight: 'bold',
//     color: '#000000',
//     marginBottom: 2,
//   },
//   amountInWordsText: {
//     fontSize: 10,
//     fontStyle: 'italic',
//     color: '#000000',
//     lineHeight: 14,
//   },

//   // Bank Details Section
//   bankDetailsSection: {
//     marginTop: 12,
//     padding: 8,
//     backgroundColor: '#F8F9FA',
//     borderRadius: 4,
//   },
//   bankDetailsHeader: {
//     fontSize: 10,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     marginBottom: 6,
//     color: '#000000',
//   },
//   bankDetailText: {
//     fontSize: 9,
//     color: '#000000',
//     marginVertical: 1,
//   },

//   // UPI Section
//   upiSection: {
//     marginTop: 12,
//     padding: 8,
//     backgroundColor: '#F0F8FF',
//     borderRadius: 4,
//   },
//   upiHeader: {
//     fontSize: 10,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     marginBottom: 8,
//     color: '#000000',
//   },
//   qrCodeContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 8,
//     marginBottom: 8,
//   },
//   qrCodeTitle: {
//     fontSize: 11,
//     fontWeight: 'bold',
//     marginBottom: 6,
//     color: '#000000',
//   },
//   qrCodeWrapper: {
//     backgroundColor: '#fff',
//     padding: 4,
//     borderRadius: 4,
//     borderWidth: 1,
//     borderColor: '#E0E0E0',
//   },
//   qrCodeImage: {
//     width: 100,
//     height: 100,
//   },
//   upiDetailsContainer: {
//     marginTop: 8,
//   },
//   upiTextDetail: {
//     fontSize: 9,
//     marginVertical: 2,
//     textAlign: 'left',
//     color: '#000000',
//   },

//   // Terms and Conditions Section
//   termsSection: {
//     marginTop: 12,
//     padding: 8,
//     backgroundColor: '#FFF3E0',
//     borderRadius: 4,
//   },
//   termsHeader: {
//     fontSize: 10,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     marginBottom: 6,
//     color: '#000000',
//   },
//   termsText: {
//     fontSize: 8,
//     color: '#000000',
//     marginVertical: 1,
//     lineHeight: 12,
//   },

//   // Footer Section
//   footerSection: {
//     marginTop: 16,
//     alignItems: 'center',
//   },
//   footerSeparator: {
//     fontSize: 10,
//     textAlign: 'center',
//     marginVertical: 4,
//     color: '#000000',
//   },
//   footerText: {
//     fontSize: 9,
//     color: '#000000',
//     marginVertical: 1,
//     textAlign: 'center',
//     fontStyle: 'italic',
//   },
// });

// Export function to generate PDF using react-native-html-to-pdf
export const generatePdfForTemplate18 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
) => {
  try {
    // Prepare data using the same logic
    const actualShippingAddress = shippingAddress || transaction?.shippingAddress;
    
    const {
      totalTaxable,
      totalAmount,
      itemsWithGST,
      totalCGST,
      totalSGST,
      totalIGST,
      isGSTApplicable,
      showIGST,
      showCGSTSGST,
    } = prepareTemplate8Data(transaction, company, party, actualShippingAddress);

    // Generate HTML for PDF
    const bank = bank || transaction?.bank || {};
    const html = generateHTMLReceipt(
      transaction,
      company,
      party,
      bank,
      itemsWithGST,
      totalTaxable,
      totalAmount,
      totalCGST,
      totalSGST,
      totalIGST,
      showIGST,
      showCGSTSGST,
    );

    const options = {
      html,
      fileName: `receipt_${transaction.invoiceNumber || 'invoice'}`,
      directory: 'Documents',
      width: 283, // 80mm paper width in points
      // height: 0, // Auto height
    };

    const file = await generatePDF(options);
    return file.filePath;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Helper function to generate HTML for PDF
const generateHTMLReceipt = (
  transaction,
  company,
  party,
  bank,
  itemsWithGST,
  totalTaxable,
  totalAmount,
  totalCGST,
  totalSGST,
  totalIGST,
  showIGST,
  showCGSTSGST,
) => {
  const formatDate = date => {
    return new Date(date)
      .toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .toUpperCase()
      .replace(/\./g, '-');
  };

  const itemsHTML = itemsWithGST
    .map(
      item => `
    <tr>
      <td style="width: 30%; font-size: 10px; padding: 4px; vertical-align: top;">
        <div><strong>${capitalizeWords(item.name)}</strong></div>
        ${
          item.itemType !== 'service'
            ? `<div>${formatQuantity(item.quantity || 0, item.unit)}</div>`
            : ''
        }
        <div>${item.itemType === 'service' ? 'SAC' : 'HSN'}: ${
        item.code || '-'
      }</div>
      </td>
      <td style="width: 25%; font-size: 10px; text-align: center; padding: 4px; vertical-align: top;">
        ${formatCurrency(item.pricePerUnit || 0)}
      </td>
      <td style="width: 40%; font-size: 10px; text-align: center; padding: 4px; vertical-align: top;">
        ${
          showIGST
            ? `IGST-${item.gstRate.toFixed(2)}%`
            : showCGSTSGST
            ? `CGST-${(item.gstRate / 2).toFixed(2)}%<br>SGST-${(
                item.gstRate / 2
              ).toFixed(2)}%`
            : 'No Tax'
        }
      </td>
      <td style="width: 30%; font-size: 10px; text-align: right; padding: 4px; vertical-align: top;">
        ${formatCurrency(item.total)}
      </td>
    </tr>
  `,
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Helvetica', Arial, sans-serif; 
            padding-top: 12px; 
            max-width: 283px; 
            margin: 0 auto; 
            background: white;
            font-size: 10px;
            line-height: 1.3;
            // padding-top:5mm;
          }
          .center { text-align: center; }
          .separator { text-align: center; font-size: 10px; margin: 4px 0; }
          .header { margin-bottom: 12px; text-align: center; }
          .company-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
          .meta-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .billed-section { text-align: center; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          .summary-row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 10px; }
          .grand-total { font-weight: bold; font-size: 11px; }
          .amount-words {    border-radius: 4px; }
          .bank-details { margin: 12px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; }
          .upi-section { margin-top:8px; border-radius: 4px;  }
          .qr-section { text-align: right; margin: 2px 0; }
          .qr-image { width: 100px; height: 100px; }
          .upi-text { font-size: 9px; margin: 2px 0; text-align: right; }
          .terms-section { margin: 4px 0; padding: 8px; background: #fff3e0; border-radius: 4px; }
          .footer { margin-top: 4px; text-align: center; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${capitalizeWords(
            company?.businessName ||
              company?.companyName ||
              'Global Securities',
          )}</div>
          <div>${capitalizeWords(
            [company?.address, company?.City, company?.addressState]
              .filter(Boolean)
              .join(', '),
          )}</div>
          <div>${capitalizeWords(company?.Country || 'India')} - ${
    company?.Pincode || ''
  }</div>
          ${
            company?.mobileNumber
              ? `<div>Phone no: ${formatPhoneNumber(
                  String(company.mobileNumber),
                )}</div>`
              : ''
          }
          ${company?.gstin ? `<div>GSTIN: ${company.gstin}</div>` : ''}
        </div>

        <div class="separator">=====================TAX INVOICE===================</div>

        <div class="meta-row">
          <span>INVOICE #: ${transaction.invoiceNumber || 'N/A'}</span>
          <span>DATE: ${formatDate(transaction.date)}</span>
        </div>

        <div class="billed-section">
          <div class="separator">=====================BILLED TO=====================</div>
          <div>Name : ${capitalizeWords(party?.name || 'Jay Enterprises')}</div>
          ${
            party?.contactNumber
              ? `<div>${formatPhoneNumber(party.contactNumber)}</div>`
              : ''
          }
          ${party?.gstin ? `<div>GSTIN : ${party.gstin}</div>` : ''}
          ${party?.pan ? `<div>PAN : ${party.pan}</div>` : ''}
          <div class="separator">===================================================</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30%; text-align: left; font-size: 10px; padding: 2px;">Items</th>
              <th style="width: 25%; text-align: center; font-size: 10px; padding: 2px;">Amount (Rs.)</th>
              <th style="width: 40%; text-align: center; font-size: 10px; padding: 2px;">GST</th>
              <th style="width: 30%; text-align: right; font-size: 10px; padding: 2px;">Total(Rs)</th>
            </tr>
          </thead>
        </table>
        <div class="separator">===================================================</div>
        <table>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="separator">======================SUMMARY=====================</div>

        <div style="margin-top: 8px;">
          <div class="summary-row"><span>Taxable Amount</span><span>Rs ${formatCurrency(
            totalTaxable,
          )}</span></div>
          ${
            showIGST
              ? `<div class="summary-row"><span>Add: IGST</span><span>Rs ${formatCurrency(
                  totalIGST,
                )}</span></div>`
              : ''
          }
          ${
            showCGSTSGST
              ? `
            <div class="summary-row"><span>Add: CGST</span><span>Rs ${formatCurrency(
              totalCGST,
            )}</span></div>
            <div class="summary-row"><span>Add: SGST</span><span>Rs ${formatCurrency(
              totalSGST,
            )}</span></div>
          `
              : ''
          }
          <div class="summary-row"><span>Total Tax</span><span>Rs ${formatCurrency(
            totalIGST || totalCGST + totalSGST,
          )}</span></div>
          <div class="summary-row"><span>Total Amount After Tax</span><span>Rs ${formatCurrency(
            totalAmount,
          ).replace('₹', '')}</span></div>
          <div class="summary-row"><span>GST Payable on Reverse Charge</span><span>N.A.</span></div>
          <div class="separator">===================================================</div>
          <div class="summary-row grand-total"><span>Grand Total</span><span>Rs ${formatCurrency(
            totalAmount,
          ).replace('₹', '')}</span></div>
          <div class="separator">====================================================</div>
          
          <div class="amount-words">
            <div><strong>Amount in Words:</strong></div>
            <div>${numberToWords(totalAmount)}</div>
          </div>
        </div>

        

        ${
          bank?.upiDetails?.upiId
            ? `
          <div class="upi-section">
           
            ${
              bank?.qrCode
                ? `
              <div class="qr-section">
                <div style="font-weight: bold; margin-bottom: 4px;">QR Code</div>
                <img src="${BASE_URL}/${bankData.qrCode}" class="qr-image" />
              </div>
            /${
                    bank.qrCode
                  }" class="qr-image" />
              </div>
            `
                : ''
            }
            <div class="upi-text">UPI ID: ${bank.upiDetails.upiId}</div>
            ${
              bank.upiDetails.upiName
                ? `<div class="upi-text">UPI Name: ${bank.upiDetails.upiName}</div>`
                : ''
            }
            ${
              bank.upiDetails.upiMobile
                ? `<div class="upi-text">UPI Mobile No: ${bank.upiDetails.upiMobile}</div>`
                : ''
            }
          </div>
        `
            : ''
        }

       

         <div class="footer">
          <div class="separator">=====================================================</div>
          
          
          <div>For ${capitalizeWords(
            company?.businessName ||
              company?.companyName ||
              'Global Securities',
          )}</div>
          <div>E. & O.E.</div>
          
        </div>
      </body>
    </html>
  `;
};

export default Template18Receipt;
