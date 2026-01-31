// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   Modal,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Alert,
//   Linking,
//   Platform,
//   StyleSheet,
//   Dimensions,
//   ActivityIndicator,
// } from 'react-native';
// import { Card, Button, Portal } from 'react-native-paper';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// export default function WhatsAppComposerDialog({
//   isOpen,
//   onClose,
//   transaction,
//   party,
//   company,
//   onGeneratePdf,
//   serviceNameById,
//   products = [],
//   services = [],
//   whatsappService = null,
//   baseUrl = null,
// }) {
//   const [messageContent, setMessageContent] = useState('');
//   const [mobileNumber, setMobileNumber] = useState('');
//   const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
//   const [pdfGenerated, setPdfGenerated] = useState(false);
//   const [pdfFileName, setPdfFileName] = useState('');
//   const [currentStep, setCurrentStep] = useState(1);
//   const [isLoading, setIsLoading] = useState(false);

//   // Helper function for currency formatting
//   const formatCurrency = amount => {
//     return new Intl.NumberFormat('en-IN', {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2,
//     }).format(amount);
//   };

//   // Helper function for date formatting
//   const formatDate = dateString => {
//     if (!dateString) return 'N/A';

//     try {
//       const date = new Date(dateString);
//       if (isNaN(date.getTime())) return 'N/A';

//       const months = [
//         'Jan',
//         'Feb',
//         'Mar',
//         'Apr',
//         'May',
//         'Jun',
//         'Jul',
//         'Aug',
//         'Sep',
//         'Oct',
//         'Nov',
//         'Dec',
//       ];
//       const day = date.getDate();
//       const month = months[date.getMonth()];
//       const year = date.getFullYear();

//       return `${day} ${month}, ${year}`;
//     } catch (error) {
//       console.error('Error formatting date:', error);
//       return 'N/A';
//     }
//   };

//   // Helper function for simple date formatting (dd/MM/yyyy)
//   const formatSimpleDate = dateString => {
//     if (!dateString) return 'N/A';

//     try {
//       const date = new Date(dateString);
//       if (isNaN(date.getTime())) return 'N/A';

//       const day = date.getDate().toString().padStart(2, '0');
//       const month = (date.getMonth() + 1).toString().padStart(2, '0');
//       const year = date.getFullYear();

//       return `${day}/${month}/${year}`;
//     } catch (error) {
//       console.error('Error formatting simple date:', error);
//       return 'N/A';
//     }
//   };

//   // Function to extract mobile number from party object
//   const extractMobileNumber = partyObj => {
//     if (!partyObj) return '';

//     console.log('Party object for mobile extraction:', partyObj);

//     // Check all possible mobile number fields
//     const possibleFields = [
//       'mobile',
//       'phone',
//       'mobileNumber',
//       'phoneNumber',
//       'contactNumber',
//       'contactNo',
//       'phone_no',
//       'mobile_no',
//       'whatsappNumber',
//       'whatsapp',
//       'primaryPhone',
//       'secondaryPhone',
//     ];

//     let foundNumber = '';

//     // First try to find in standard fields
//     for (const field of possibleFields) {
//       if (partyObj[field]) {
//         const num = String(partyObj[field]).trim();
//         if (num) {
//           foundNumber = num;
//           console.log(`Found mobile in field "${field}": ${num}`);
//           break;
//         }
//       }
//     }

//     // If still not found, check nested objects
//     if (!foundNumber) {
//       if (
//         partyObj.contactDetails &&
//         typeof partyObj.contactDetails === 'object'
//       ) {
//         for (const field of possibleFields) {
//           if (partyObj.contactDetails[field]) {
//             const num = String(partyObj.contactDetails[field]).trim();
//             if (num) {
//               foundNumber = num;
//               console.log(`Found mobile in contactDetails.${field}: ${num}`);
//               break;
//             }
//           }
//         }
//       }

//       // Also check in profile or primaryContact
//       if (!foundNumber && partyObj.profile) {
//         for (const field of possibleFields) {
//           if (partyObj.profile[field]) {
//             const num = String(partyObj.profile[field]).trim();
//             if (num) {
//               foundNumber = num;
//               console.log(`Found mobile in profile.${field}: ${num}`);
//               break;
//             }
//           }
//         }
//       }

//       if (!foundNumber && partyObj.primaryContact) {
//         for (const field of possibleFields) {
//           if (partyObj.primaryContact[field]) {
//             const num = String(partyObj.primaryContact[field]).trim();
//             if (num) {
//               foundNumber = num;
//               console.log(`Found mobile in primaryContact.${field}: ${num}`);
//               break;
//             }
//           }
//         }
//       }
//     }

//     // Clean up the number
//     if (foundNumber) {
//       // Remove all non-digit characters
//       const digits = foundNumber.replace(/\D/g, '');

//       // Handle Indian numbers
//       if (digits.length === 12 && digits.startsWith('91')) {
//         return digits.slice(2); // Remove country code for display
//       }

//       if (digits.length > 10) {
//         return digits.slice(-10); // Take last 10 digits
//       }

//       return digits;
//     }

//     return '';
//   };

//   // Function to generate the structured message content
//   const generateDefaultMessageContent = () => {
//     const invoiceNumber =
//       transaction.invoiceNumber || transaction.referenceNumber || 'N/A';

//     const invoiceDate = formatDate(transaction.date);

//     // Debug: Check both products and services
//     console.log('=== TRANSACTION DEBUG ===');
//     console.log('Party object:', party);
//     console.log('Party mobile extracted:', extractMobileNumber(party));
//     console.log('Products array:', transaction.products);
//     console.log('Services array:', transaction.services);
//     console.log('Available products prop:', products);
//     console.log('Available services prop:', services);
//     console.log('=== END DEBUG ===');

//     // Combine both products and services into one array
//     const transactionProducts = transaction.products || [];
//     const transactionServices = transaction.services || [];
//     const allItems = [...transactionProducts, ...transactionServices];

//     const subtotal =
//       transaction.subtotal ||
//       allItems.reduce(
//         (sum, item) => sum + (item.amount || item.lineTotal || 0),
//         0,
//       ) ||
//       0;

//     const taxAmount =
//       transaction.taxAmount ||
//       allItems.reduce(
//         (sum, item) => sum + (item.lineTax || item.gstAmount || 0),
//         0,
//       ) ||
//       0;

//     const totalAmount = transaction.totalAmount || subtotal + taxAmount;

//     let message = `📄 *INVOICE - ${
//       company?.businessName || 'Your Company'
//     }*\n\n`;
//     message += `*Invoice No:* ${invoiceNumber}\n`;
//     message += `*Date:* ${invoiceDate}\n`;
//     message += `*Customer:* ${party?.name || 'Valued Customer'}\n\n`;

//     // Build items section from combined products and services
//     if (allItems.length > 0) {
//       message += `*ITEMS:*\n`;
//       message += '────────────────\n';

//       allItems.forEach((item, index) => {
//         // Determine if it's a product or service and extract name accordingly
//         let itemName = 'Item';
//         let itemType = '';

//         if (item.product || item.productId) {
//           // This is a product - use the props to find the actual name
//           const productId = item.product?._id || item.product || item.productId;
//           const foundProduct = products.find(p => p._id === productId);
//           itemName =
//             foundProduct?.name || item.product?.name || item.name || 'Product';
//           itemType = '🛍️ ';
//           console.log(
//             `Product ${index + 1}: ID=${productId}, Name=${itemName}`,
//           );
//         } else if (item.service || item.serviceId) {
//           // This is a service - use the props to find the actual name
//           const serviceId = item.service?._id || item.service || item.serviceId;
//           const foundService = services.find(s => s._id === serviceId);
//           itemName =
//             foundService?.serviceName ||
//             item.service?.serviceName ||
//             item.name ||
//             'Service';
//           itemType = '🔧 ';
//           console.log(
//             `Service ${index + 1}: ID=${serviceId}, Name=${itemName}`,
//           );
//         } else {
//           // Fallback
//           itemName =
//             item.name ||
//             item.productName ||
//             item.serviceName ||
//             `Item ${index + 1}`;
//         }

//         const quantity = item.quantity || 1;
//         const unitType = item.unitType ? ` ${item.unitType}` : '';
//         const unitPrice =
//           item.pricePerUnit ||
//           item.rate ||
//           item.unitPrice ||
//           item.amount / quantity ||
//           0;
//         const itemAmount =
//           item.amount || item.lineTotal || item.total || quantity * unitPrice;
//         const itemTax = item.lineTax || item.gstAmount || 0;
//         const taxRate = item.gstPercentage || transaction.gstPercentage || 0;

//         message += `${index + 1}. ${itemType}${itemName}\n`;
//         message += `   Qty: ${quantity}${unitType} × ₹${formatCurrency(
//           unitPrice,
//         )} = ₹${formatCurrency(itemAmount)}\n`;

//         if (itemTax > 0) {
//           message += `   Tax (${taxRate}%): ₹${formatCurrency(itemTax)}\n`;
//         }
//       });

//       message += '────────────────\n';
//     } else {
//       // If no items, show basic info
//       message += `*DESCRIPTION:*\n`;
//       message += '────────────────\n';
//       message += `${
//         transaction.description || transaction.narration || 'Products/Services'
//       }\n`;
//       message += '────────────────\n';
//     }

//     message += `*Subtotal:* ₹${formatCurrency(subtotal)}\n`;
//     message += `*Tax:* ₹${formatCurrency(taxAmount)}\n`;
//     message += `*TOTAL:* ₹${formatCurrency(totalAmount)}\n\n`;

//     message += `Thank you for your business! 🎉\n\n`;
//     message += `Best regards,\n`;
//     message += `*${company?.businessName || 'Your Company'}*`;

//     return message;
//   };

//   // Initialize when dialog opens
//   useEffect(() => {
//     if (isOpen) {
//       const partyMobile = extractMobileNumber(party);
//       console.log('Setting mobile number to:', partyMobile);
//       setMobileNumber(partyMobile);
//       setMessageContent(generateDefaultMessageContent());
//       setPdfGenerated(false);
//       setPdfFileName('');
//       setCurrentStep(1);
//     }
//   }, [isOpen, transaction, party, company]);

//   // Complete flow handler - Direct PDF sharing to WhatsApp
//   const handleCompleteFlow = async () => {
//     if (!mobileNumber.trim()) {
//       Alert.alert(
//         'Mobile number required',
//         'Please enter a valid mobile number.',
//       );
//       return;
//     }

//     try {
//       setIsLoading(true);
//       setIsGeneratingPdf(true);

//       let pdfBase64 = null;
//       let pdfPath = null;

//       // Generate PDF if callback available
//       if (typeof onGeneratePdf === 'function') {
//         try {
//           console.log('🟡 Generating PDF for WhatsApp...');
//           const genResult = await onGeneratePdf(transaction, party, company);

//           // Handle different return types from PDF generator
//           if (typeof genResult === 'string') {
//             // Could be base64 or path
//             if (
//               genResult.startsWith('data:') ||
//               genResult.match(/^[A-Za-z0-9+/=]+$/)
//             ) {
//               pdfBase64 = genResult;
//             } else {
//               pdfPath = genResult;
//             }
//           } else if (genResult && typeof genResult === 'object') {
//             pdfBase64 =
//               genResult.base64 ||
//               genResult.data ||
//               (typeof genResult.output === 'function'
//                 ? genResult.output('base64')
//                 : null);
//             pdfPath =
//               genResult.path || genResult.pdfPath || genResult.url || null;
//           }

//           console.log('PDF Generated:', {
//             hasBase64: !!pdfBase64,
//             hasPath: !!pdfPath,
//           });
//         } catch (e) {
//           console.error('❌ PDF generation failed:', e);
//           Alert.alert(
//             'PDF Generation Failed',
//             'Could not generate invoice PDF.',
//           );
//           setIsLoading(false);
//           setIsGeneratingPdf(false);
//           return;
//         }
//       }

//       // If we have base64, write it to a file
//       if (pdfBase64 && !pdfPath) {
//         try {
//           const RNFS = await import('react-native-fs').then(m => m.default);
//           const { Platform } = await import('react-native');

//           const downloadDir =
//             Platform.OS === 'android'
//               ? `${RNFS.ExternalStorageDirectoryPath}/Download`
//               : RNFS.DocumentDirectoryPath;

//           // Ensure directory exists
//           const dirExists = await RNFS.exists(downloadDir);
//           if (!dirExists) {
//             await RNFS.mkdir(downloadDir);
//           }

//           const fileName = `invoice_${
//             transaction?.invoiceNumber || Date.now()
//           }.pdf`;
//           pdfPath = `${downloadDir}/${fileName}`;

//           console.log('💾 Saving PDF to:', pdfPath);
//           await RNFS.writeFile(pdfPath, pdfBase64, 'base64');
//           console.log('✅ PDF saved successfully');
//         } catch (e) {
//           console.error('❌ Error saving PDF file:', e);
//           Alert.alert('File Save Failed', 'Could not save PDF to device.');
//           setIsLoading(false);
//           setIsGeneratingPdf(false);
//           return;
//         }
//       }

//       const formattedNumber = mobileNumber.replace(/\D/g, '');
//       let finalNumber = formattedNumber;
//       if (!formattedNumber.startsWith('91') && formattedNumber.length === 10) {
//         finalNumber = `91${formattedNumber}`;
//       }

//       let finalMessage = messageContent || '';

//       // Share PDF directly with WhatsApp using Share API
//       if (pdfPath) {
//         try {
//           console.log('📤 Sharing PDF via Share API:', pdfPath);
//           const Share = await import('react-native-share').then(m => m.default);
//           const { Platform } = await import('react-native');

//           const shareOptions = {
//             title: 'Share Invoice',
//             message: finalMessage,
//             url: Platform.OS === 'android' ? `file://${pdfPath}` : pdfPath,
//             type: 'application/pdf',
//             recipient: `91${finalNumber}`,
//             social: 'whatsapp',
//             showAppsToView: true,
//           };

//           await Share.open(shareOptions);

//           console.log('✅ PDF shared successfully');
//           setTimeout(() => onClose && onClose(), 1000);
//         } catch (error) {
//           if (error.message !== 'User did not share') {
//             console.error('❌ Error sharing PDF:', error);
//             Alert.alert(
//               'Share Failed',
//               'Could not open WhatsApp. Make sure WhatsApp is installed.',
//             );
//           } else {
//             onClose && onClose();
//           }
//         }
//       } else {
//         // Fallback: Send via WhatsApp link without PDF
//         console.log('⚠️ No PDF available, opening WhatsApp with message only');
//         const { Linking, Platform } = await import('react-native');

//         const encodedMessage = encodeURIComponent(finalMessage);
//         const appUrl = `whatsapp://send?phone=${finalNumber}&text=${encodedMessage}`;
//         const iosTextOnlyUrl = `whatsapp://send?text=${encodedMessage}`;
//         const webLink = `https://wa.me/${finalNumber}?text=${encodedMessage}`;

//         // Try native app URL first, then platform-specific fallbacks, then wa.me web link
//         try {
//           if (Platform.OS === 'android') {
//             // Android: try whatsapp:// then intent:// (more robust on some devices)
//             const canOpen = await Linking.canOpenURL(appUrl);
//             if (canOpen) {
//               await Linking.openURL(appUrl);
//             } else {
//               const intentUrl = `intent://send?phone=${finalNumber}&text=${encodedMessage}#Intent;package=com.whatsapp;scheme=whatsapp;end`;
//               try {
//                 await Linking.openURL(intentUrl);
//               } catch (e) {
//                 await Linking.openURL(webLink);
//               }
//             }
//           } else {
//             // iOS: phone param can be unreliable; try text-only scheme, then wa.me
//             const canOpenTextOnly = await Linking.canOpenURL(iosTextOnlyUrl);
//             if (canOpenTextOnly) {
//               await Linking.openURL(iosTextOnlyUrl);
//             } else {
//               await Linking.openURL(webLink);
//             }
//           }
//         } catch (e) {
//           console.warn('WhatsApp open fallback failed, opening web link', e);
//           try {
//             await Linking.openURL(webLink);
//           } catch (err) {
//             console.error('Failed to open wa.me link', err);
//           }
//         }
//         setTimeout(() => onClose && onClose(), 1500);
//       }
//     } catch (error) {
//       console.error('Error in WhatsApp flow:', error);
//       Alert.alert(
//         'Operation Failed',
//         'Could not complete the operation. Please try again.',
//       );
//     } finally {
//       setIsLoading(false);
//       setIsGeneratingPdf(false);
//     }
//   };

//   // WhatsApp only handler
//   const handleOpenWhatsAppOnly = () => {
//     if (!mobileNumber.trim()) {
//       Alert.alert(
//         'Mobile number required',
//         'Please enter a valid mobile number.',
//       );
//       return;
//     }

//     const formattedNumber = mobileNumber.replace(/\D/g, '');
//     let finalNumber = formattedNumber;
//     if (!formattedNumber.startsWith('91') && formattedNumber.length === 10) {
//       finalNumber = `91${formattedNumber}`;
//     }

//     const finalMessage = messageContent || '';

//     const encodedMessage = encodeURIComponent(finalMessage);
//     const appUrl = `whatsapp://send?phone=${finalNumber}&text=${encodedMessage}`;
//     const iosTextOnlyUrl = `whatsapp://send?text=${encodedMessage}`;
//     const webLink = `https://wa.me/${finalNumber}?text=${encodedMessage}`;

//     // Try to open WhatsApp app first, then fallbacks
//     Linking.canOpenURL(appUrl)
//       .then(can => {
//         if (can) return Linking.openURL(appUrl);
//         if (Platform.OS === 'ios') return Linking.canOpenURL(iosTextOnlyUrl).then(c => (c ? Linking.openURL(iosTextOnlyUrl) : Linking.openURL(webLink)));
//         // Android try intent then wa.me
//         const intentUrl = `intent://send?phone=${finalNumber}&text=${encodedMessage}#Intent;package=com.whatsapp;scheme=whatsapp;end`;
//         return Linking.openURL(intentUrl).catch(() => Linking.openURL(webLink));
//       })
//       .catch(() => {
//         Linking.openURL(webLink).catch(() => {});
//       });

//     Alert.alert('WhatsApp Opening', 'Opening WhatsApp.');
//     onClose && onClose();
//   };

//   if (!isOpen) return null;

//   const invoiceNumber =
//     transaction.invoiceNumber || transaction.referenceNumber || 'N/A';

//   const invoiceDate = formatSimpleDate(transaction.date);

//   const amount = transaction.totalAmount || transaction.amount || 0;

//   const formattedAmount = new Intl.NumberFormat('en-IN', {
//     style: 'currency',
//     currency: 'INR',
//   }).format(amount);

//   // Extract mobile for display in summary
//   const displayMobile =
//     extractMobileNumber(party) || party?.contactNumber || party?.phone || 'N/A';

//   return (
//     <Portal>
//       <Modal
//         visible={isOpen}
//         onDismiss={onClose}
//         animationType="slide"
//         presentationStyle="pageSheet"
//         transparent={false}
//       >
//         <View style={styles.container}>
//           {/* Header */}
//           <View style={styles.header}>
//             <View style={styles.headerContent}>
//               <Icon name="whatsapp" size={24} color="#25D366" />
//               <Text style={styles.title}>Send Invoice via WhatsApp</Text>
//             </View>
//             <TouchableOpacity onPress={onClose} style={styles.closeButton}>
//               <Icon name="close" size={24} color="#666" />
//             </TouchableOpacity>
//           </View>

//           <ScrollView
//             style={styles.content}
//             showsVerticalScrollIndicator={false}
//           >
//             {/* Transaction Summary */}
//             <Card style={styles.card}>
//               <Card.Content>
//                 <Text style={styles.cardTitle}>Invoice Details</Text>
//                 <View style={styles.detailRow}>
//                   <Text style={styles.detailLabel}>Customer:</Text>
//                   <Text style={styles.detailValue}>{party?.name || 'N/A'}</Text>
//                 </View>
//                 <View style={styles.detailRow}>
//                   <Text style={styles.detailLabel}>Mobile:</Text>
//                   <Text style={styles.detailValue}>{displayMobile}</Text>
//                 </View>
//                 <View style={styles.detailRow}>
//                   <Text style={styles.detailLabel}>Invoice No:</Text>
//                   <Text style={styles.detailValue}>{invoiceNumber}</Text>
//                 </View>
//                 <View style={styles.detailRow}>
//                   <Text style={styles.detailLabel}>Date:</Text>
//                   <Text style={styles.detailValue}>{invoiceDate}</Text>
//                 </View>
//                 <View style={[styles.detailRow, styles.amountRow]}>
//                   <Text style={styles.detailLabel}>Amount:</Text>
//                   <View style={styles.amountContainer}>
//                     <Text style={styles.amountText}>{formattedAmount}</Text>
//                   </View>
//                 </View>
//               </Card.Content>
//             </Card>

//             {/* WhatsApp Form */}
//             <View style={styles.formSection}>
//               <Text style={styles.sectionLabel}>Customer WhatsApp Number</Text>
//               <View style={styles.phoneInputContainer}>
//                 <View style={styles.countryCode}>
//                   <Text style={styles.countryCodeText}>+91</Text>
//                 </View>
//                 <TextInput
//                   style={styles.phoneInput}
//                   value={mobileNumber}
//                   onChangeText={setMobileNumber}
//                   placeholder="Enter customer WhatsApp number"
//                   keyboardType="phone-pad"
//                   placeholderTextColor="#999"
//                 />
//               </View>

//               <Text style={styles.sectionLabel}>Message to Send</Text>
//               <TextInput
//                 style={styles.messageInput}
//                 value={messageContent}
//                 onChangeText={setMessageContent}
//                 placeholder="Compose your WhatsApp message..."
//                 multiline
//                 numberOfLines={8}
//                 textAlignVertical="top"
//                 placeholderTextColor="#999"
//                 editable={true}
//               />
//             </View>

//             {/* Auto-Attach Info */}
//             <Card style={styles.warningCard}>
//               <Card.Content style={styles.warningContent}>
//                 <Icon name="check-circle" size={20} color="#059669" />
//                 <View style={styles.warningText}>
//                   <Text style={styles.warningTitle}>
//                     Invoice PDF Auto-Attached
//                   </Text>
//                   <Text style={styles.warningDescription}>
//                     The PDF will be automatically attached and sent directly to
//                     WhatsApp app.
//                   </Text>
//                 </View>
//               </Card.Content>
//             </Card>
//           </ScrollView>

//           {/* Footer Actions */}
//           <View style={styles.footer}>
//             <View style={styles.buttonContainer}>
//               <Button
//                 mode="outlined"
//                 onPress={onClose}
//                 style={[styles.button, styles.cancelButton]}
//                 labelStyle={styles.cancelButtonText}
//                 disabled={isLoading}
//               >
//                 Cancel
//               </Button>

//               {currentStep === 1 && (
//                 <Button
//                   mode="contained"
//                   onPress={handleCompleteFlow}
//                   disabled={isLoading || !mobileNumber.trim()}
//                   style={[styles.button, styles.whatsappButton]}
//                   labelStyle={styles.whatsappButtonText}
//                 >
//                   {isLoading ? (
//                     <ActivityIndicator size="small" color="white" />
//                   ) : (
//                     <Icon name="whatsapp" size={20} color="white" />
//                   )}
//                   <Text style={styles.whatsappButtonText}>
//                     {isLoading ? ' Preparing...' : ' Open WhatsApp'}
//                   </Text>
//                 </Button>
//               )}
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </Portal>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e5e5e5',
//     backgroundColor: '#fafafa',
//   },
//   headerContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   title: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#333',
//   },
//   closeButton: {
//     padding: 4,
//   },
//   content: {
//     flex: 1,
//     padding: 16,
//   },
//   card: {
//     marginBottom: 16,
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//   },
//   cardTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 12,
//     color: '#333',
//   },
//   detailRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   detailLabel: {
//     fontSize: 14,
//     color: '#666',
//   },
//   detailValue: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#333',
//   },
//   amountRow: {
//     paddingTop: 8,
//     borderTopWidth: 1,
//     borderTopColor: '#e5e5e5',
//     marginTop: 4,
//   },
//   amountContainer: {
//     alignItems: 'flex-end',
//   },
//   amountText: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#2563eb',
//   },
//   formSection: {
//     marginBottom: 16,
//   },
//   sectionLabel: {
//     fontSize: 14,
//     fontWeight: '500',
//     marginBottom: 8,
//     color: '#333',
//   },
//   phoneInputContainer: {
//     flexDirection: 'row',
//     marginBottom: 16,
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 8,
//     overflow: 'hidden',
//   },
//   countryCode: {
//     backgroundColor: '#f5f5f5',
//     paddingHorizontal: 12,
//     justifyContent: 'center',
//     borderRightWidth: 1,
//     borderRightColor: '#ddd',
//   },
//   countryCodeText: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#333',
//   },
//   phoneInput: {
//     flex: 1,
//     paddingHorizontal: 12,
//     paddingVertical: 12,
//     fontSize: 16,
//     color: '#333',
//   },
//   messageInput: {
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 14,
//     color: '#333',
//     minHeight: 150,
//     textAlignVertical: 'top',
//     backgroundColor: '#fff',
//   },
//   warningCard: {
//     borderColor: '#FBBF24',
//     backgroundColor: '#FFFBEB',
//     marginBottom: 16,
//   },
//   warningContent: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     gap: 12,
//   },
//   warningText: {
//     flex: 1,
//   },
//   warningTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#B45309',
//     marginBottom: 4,
//   },
//   warningDescription: {
//     fontSize: 12,
//     color: '#B45309',
//     lineHeight: 16,
//   },
//   footer: {
//     padding: 16,
//     borderTopWidth: 1,
//     borderTopColor: '#e5e5e5',
//     backgroundColor: '#fafafa',
//   },
//   buttonContainer: {
//     flexDirection: 'row',
//     gap: 12,
//   },
//   button: {
//     flex: 1,
//     borderRadius: 8,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   cancelButton: {
//     borderColor: '#d1d5db',
//   },
//   cancelButtonText: {
//     color: '#374151',
//     fontWeight: '500',
//   },
//   whatsappButton: {
//     backgroundColor: '#25D366',
//   },
//   whatsappButtonText: {
//     color: 'white',
//     fontWeight: '500',
//   },
// });

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Card, Button, Portal } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function WhatsAppComposerDialog({
  isOpen,
  onClose,
  transaction,
  party,
  company,
  onGeneratePdf,
  serviceNameById,
  products = [],
  services = [],
  whatsappService = null,
  baseUrl = null,
}) {
  const [messageContent, setMessageContent] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function for currency formatting
  const formatCurrency = amount => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Helper function for date formatting
  const formatDate = dateString => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';

      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();

      return `${day} ${month}, ${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Helper function for simple date formatting (dd/MM/yyyy)
  const formatSimpleDate = dateString => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'N/A';
    }
  };

  // Function to extract mobile number from party object
  const extractMobileNumber = partyObj => {
    if (!partyObj) return '';

    // Check all possible mobile number fields
    const possibleFields = [
      'mobile',
      'phone',
      'mobileNumber',
      'phoneNumber',
      'contactNumber',
      'contactNo',
      'phone_no',
      'mobile_no',
      'whatsappNumber',
      'whatsapp',
      'primaryPhone',
      'secondaryPhone',
    ];

    let foundNumber = '';

    // First try to find in standard fields
    for (const field of possibleFields) {
      if (partyObj[field]) {
        const num = String(partyObj[field]).trim();
        if (num) {
          foundNumber = num;

          break;
        }
      }
    }

    // If still not found, check nested objects
    if (!foundNumber) {
      if (
        partyObj.contactDetails &&
        typeof partyObj.contactDetails === 'object'
      ) {
        for (const field of possibleFields) {
          if (partyObj.contactDetails[field]) {
            const num = String(partyObj.contactDetails[field]).trim();
            if (num) {
              foundNumber = num;

              break;
            }
          }
        }
      }

      // Also check in profile or primaryContact
      if (!foundNumber && partyObj.profile) {
        for (const field of possibleFields) {
          if (partyObj.profile[field]) {
            const num = String(partyObj.profile[field]).trim();
            if (num) {
              foundNumber = num;

              break;
            }
          }
        }
      }

      if (!foundNumber && partyObj.primaryContact) {
        for (const field of possibleFields) {
          if (partyObj.primaryContact[field]) {
            const num = String(partyObj.primaryContact[field]).trim();
            if (num) {
              foundNumber = num;

              break;
            }
          }
        }
      }
    }

    // Clean up the number
    if (foundNumber) {
      // Remove all non-digit characters
      const digits = foundNumber.replace(/\D/g, '');

      // Handle Indian numbers
      if (digits.length === 12 && digits.startsWith('91')) {
        return digits.slice(2); // Remove country code for display
      }

      if (digits.length > 10) {
        return digits.slice(-10); // Take last 10 digits
      }

      return digits;
    }

    return '';
  };

  // Function to generate the structured message content
  const generateDefaultMessageContent = () => {
    const invoiceNumber =
      transaction.invoiceNumber || transaction.referenceNumber || 'N/A';

    const invoiceDate = formatDate(transaction.date);

    // Combine both products and services into one array
    const transactionProducts = transaction.products || [];
    const transactionServices = transaction.services || [];
    const allItems = [...transactionProducts, ...transactionServices];

    const subtotal =
      transaction.subtotal ||
      allItems.reduce(
        (sum, item) => sum + (item.amount || item.lineTotal || 0),
        0,
      ) ||
      0;

    const taxAmount =
      transaction.taxAmount ||
      allItems.reduce(
        (sum, item) => sum + (item.lineTax || item.gstAmount || 0),
        0,
      ) ||
      0;

    const totalAmount = transaction.totalAmount || subtotal + taxAmount;

    let message = `📄 *INVOICE - ${
      company?.businessName || 'Your Company'
    }*\n\n`;
    message += `*Invoice No:* ${invoiceNumber}\n`;
    message += `*Date:* ${invoiceDate}\n`;
    message += `*Customer:* ${party?.name || 'Valued Customer'}\n\n`;

    // Build items section from combined products and services
    if (allItems.length > 0) {
      message += `*ITEMS:*\n`;
      message += '────────────────\n';

      allItems.forEach((item, index) => {
        // Determine if it's a product or service and extract name accordingly
        let itemName = 'Item';
        let itemType = '';

        if (item.product || item.productId) {
          // This is a product - use the props to find the actual name
          const productId = item.product?._id || item.product || item.productId;
          const foundProduct = products.find(p => p._id === productId);
          itemName =
            foundProduct?.name || item.product?.name || item.name || 'Product';
          itemType = '🛍️ ';
        } else if (item.service || item.serviceId) {
          // This is a service - use the props to find the actual name
          const serviceId = item.service?._id || item.service || item.serviceId;
          const foundService = services.find(s => s._id === serviceId);
          itemName =
            foundService?.serviceName ||
            item.service?.serviceName ||
            item.name ||
            'Service';
          itemType = '🔧 ';
        } else {
          // Fallback
          itemName =
            item.name ||
            item.productName ||
            item.serviceName ||
            `Item ${index + 1}`;
        }

        const quantity = item.quantity || 1;
        const unitType = item.unitType ? ` ${item.unitType}` : '';
        const unitPrice =
          item.pricePerUnit ||
          item.rate ||
          item.unitPrice ||
          item.amount / quantity ||
          0;
        const itemAmount =
          item.amount || item.lineTotal || item.total || quantity * unitPrice;
        const itemTax = item.lineTax || item.gstAmount || 0;
        const taxRate = item.gstPercentage || transaction.gstPercentage || 0;

        message += `${index + 1}. ${itemType}${itemName}\n`;
        message += `   Qty: ${quantity}${unitType} × ₹${formatCurrency(
          unitPrice,
        )} = ₹${formatCurrency(itemAmount)}\n`;

        if (itemTax > 0) {
          message += `   Tax (${taxRate}%): ₹${formatCurrency(itemTax)}\n`;
        }
      });

      message += '────────────────\n';
    } else {
      // If no items, show basic info
      message += `*DESCRIPTION:*\n`;
      message += '────────────────\n';
      message += `${
        transaction.description || transaction.narration || 'Products/Services'
      }\n`;
      message += '────────────────\n';
    }

    message += `*Subtotal:* ₹${formatCurrency(subtotal)}\n`;
    message += `*Tax:* ₹${formatCurrency(taxAmount)}\n`;
    message += `*TOTAL:* ₹${formatCurrency(totalAmount)}\n\n`;

    message += `Thank you for your business! 🎉\n\n`;
    message += `Best regards,\n`;
    message += `*${company?.businessName || 'Your Company'}*`;

    return message;
  };

  // Initialize when dialog opens
  useEffect(() => {
    if (isOpen) {
      // try to derive raw phone and country code from party if available
      const rawPhoneRaw =
        (party && (party.mobile || party.phone || party.contactNumber)) || '';
      const rawDigits = String(rawPhoneRaw).replace(/\D/g, '');
      if (rawDigits && rawDigits.length > 10) {
        const cc = rawDigits.slice(0, rawDigits.length - 10);
        const local = rawDigits.slice(-10);
        setCountryCode(`+${cc}`);
        setMobileNumber(local);
      } else {
        const partyMobile = extractMobileNumber(party);
        setMobileNumber(partyMobile);
        // keep default countryCode as-is
      }
      setMessageContent(generateDefaultMessageContent());
      setPdfGenerated(false);
      setPdfFileName('');
      setCurrentStep(1);
    }
  }, [isOpen, transaction, party, company]);

  // Complete flow handler - Direct PDF sharing to WhatsApp
  const handleCompleteFlow = async () => {
    if (!mobileNumber.trim()) {
      Alert.alert(
        'Mobile number required',
        'Please enter a valid mobile number.',
      );
      return;
    }

    try {
      setIsLoading(true);
      setIsGeneratingPdf(true);

      let pdfBase64 = null;
      let pdfPath = null;

      // Generate PDF if callback available
      if (typeof onGeneratePdf === 'function') {
        try {
          const genResult = await onGeneratePdf(transaction, party, company);

          // Handle different return types from PDF generator
          if (typeof genResult === 'string') {
            // Could be base64 or path
            if (
              genResult.startsWith('data:') ||
              genResult.match(/^[A-Za-z0-9+/=]+$/)
            ) {
              pdfBase64 = genResult;
            } else {
              pdfPath = genResult;
            }
          } else if (genResult && typeof genResult === 'object') {
            pdfBase64 =
              genResult.base64 ||
              genResult.data ||
              (typeof genResult.output === 'function'
                ? genResult.output('base64')
                : null);
            pdfPath =
              genResult.path || genResult.pdfPath || genResult.url || null;
          }
        } catch (e) {
          Alert.alert(
            'PDF Generation Failed',
            'Could not generate invoice PDF.',
          );
          setIsLoading(false);
          setIsGeneratingPdf(false);
          return;
        }
      }

      // If we have base64, write it to a file
      if (pdfBase64 && !pdfPath) {
        try {
          const RNFS = await import('react-native-fs').then(m => m.default);
          const { Platform } = await import('react-native');

          const downloadDir =
            Platform.OS === 'android'
              ? `${RNFS.ExternalStorageDirectoryPath}/Download`
              : RNFS.DocumentDirectoryPath;

          // Ensure directory exists
          const dirExists = await RNFS.exists(downloadDir);
          if (!dirExists) {
            await RNFS.mkdir(downloadDir);
          }

          const fileName = `invoice_${
            transaction?.invoiceNumber || Date.now()
          }.pdf`;
          pdfPath = `${downloadDir}/${fileName}`;

          await RNFS.writeFile(pdfPath, pdfBase64, 'base64');
        } catch (e) {
          Alert.alert('File Save Failed', 'Could not save PDF to device.');
          setIsLoading(false);
          setIsGeneratingPdf(false);
          return;
        }
      }

      const ccDigits = (countryCode || '').replace(/\D/g, '') || '91';
      const mobileDigits = mobileNumber.replace(/\D/g, '');
      let finalNumber = mobileDigits;
      if (!mobileDigits.startsWith(ccDigits)) {
        finalNumber = `${ccDigits}${mobileDigits}`;
      }

      let finalMessage = messageContent || '';

      // Direct WhatsApp Linking (No system share sheet) - Same as columns.js
      const {
        Linking,
        Platform,
        Alert: RNAlert,
      } = await import('react-native');

      const encodedMessage = encodeURIComponent(finalMessage);
      const appUrl = `whatsapp://send?phone=${finalNumber}&text=${encodedMessage}`;
      const webLink = `https://wa.me/${finalNumber}?text=${encodedMessage}`;

      try {
        // Try native WhatsApp app first
        const canOpen = await Linking.canOpenURL(appUrl);

        if (canOpen) {
          await Linking.openURL(appUrl);
          setTimeout(() => onClose && onClose(), 1000);
        } else {
          await Linking.openURL(webLink);
        }
      } catch (error) {
        Alert.alert(
          'Error',
          'Could not open WhatsApp. Please make sure WhatsApp is installed.',
        );
      }
    } catch (error) {
      Alert.alert(
        'Operation Failed',
        'Could not complete the operation. Please try again.',
      );
    } finally {
      setIsLoading(false);
      setIsGeneratingPdf(false);
    }
  };

  // WhatsApp only handler
  const handleOpenWhatsAppOnly = () => {
    if (!mobileNumber.trim()) {
      Alert.alert(
        'Mobile number required',
        'Please enter a valid mobile number.',
      );
      return;
    }

    const ccDigits = (countryCode || '').replace(/\D/g, '') || '91';
    const mobileDigits = mobileNumber.replace(/\D/g, '');
    let finalNumber = mobileDigits;
    if (!mobileDigits.startsWith(ccDigits)) {
      finalNumber = `${ccDigits}${mobileDigits}`;
    }

    const finalMessage = messageContent || '';

    const encodedMessage = encodeURIComponent(finalMessage);
    const appUrl = `whatsapp://send?phone=${finalNumber}&text=${encodedMessage}`;
    const iosTextOnlyUrl = `whatsapp://send?text=${encodedMessage}`;
    const webLink = `https://wa.me/${finalNumber}?text=${encodedMessage}`;

    // Try to open WhatsApp app first, then fallbacks
    Linking.canOpenURL(appUrl)
      .then(can => {
        if (can) return Linking.openURL(appUrl);
        if (Platform.OS === 'ios')
          return Linking.canOpenURL(iosTextOnlyUrl).then(c =>
            c ? Linking.openURL(iosTextOnlyUrl) : Linking.openURL(webLink),
          );
        // Android try intent then wa.me
        const intentUrl = `intent://send?phone=${finalNumber}&text=${encodedMessage}#Intent;package=com.whatsapp;scheme=whatsapp;end`;
        return Linking.openURL(intentUrl).catch(() => Linking.openURL(webLink));
      })
      .catch(() => {
        Linking.openURL(webLink).catch(() => {});
      });

    Alert.alert('WhatsApp Opening', 'Opening WhatsApp.');
    onClose && onClose();
  };

  if (!isOpen) return null;

  const invoiceNumber =
    transaction.invoiceNumber || transaction.referenceNumber || 'N/A';

  const invoiceDate = formatSimpleDate(transaction.date);

  const amount = transaction.totalAmount || transaction.amount || 0;

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);

  // Extract mobile for display in summary
  const displayMobile =
    extractMobileNumber(party) || party?.contactNumber || party?.phone || 'N/A';

  return (
    <Portal>
      <Modal
        visible={isOpen}
        onDismiss={onClose}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Icon name="whatsapp" size={24} color="#25D366" />
              <Text style={styles.title}>Send Invoice via WhatsApp</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Transaction Summary */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>Invoice Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer:</Text>
                  <Text style={styles.detailValue}>{party?.name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mobile:</Text>
                  <Text style={styles.detailValue}>{displayMobile}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Invoice No:</Text>
                  <Text style={styles.detailValue}>{invoiceNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{invoiceDate}</Text>
                </View>
                <View style={[styles.detailRow, styles.amountRow]}>
                  <Text style={styles.detailLabel}>Amount:</Text>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountText}>{formattedAmount}</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* WhatsApp Form */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Customer WhatsApp Number</Text>
              <View style={styles.phoneInputContainer}>
                <TextInput
                  style={styles.countryCodeInput}
                  value={countryCode}
                  onChangeText={setCountryCode}
                  placeholder="+91"
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={styles.phoneInput}
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  placeholder="Enter customer WhatsApp number"
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <Text style={styles.sectionLabel}>Message to Send</Text>
              <TextInput
                style={styles.messageInput}
                value={messageContent}
                onChangeText={setMessageContent}
                placeholder="Compose your WhatsApp message..."
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                placeholderTextColor="#999"
                editable={true}
              />
            </View>

            {/* Auto-Attach Info */}
            <Card style={styles.warningCard}>
              <Card.Content style={styles.warningContent}>
                <Icon name="check-circle" size={20} color="#059669" />
                <View style={styles.warningText}>
                  <Text style={styles.warningTitle}>
                    Invoice PDF Auto-Attached
                  </Text>
                  <Text style={styles.warningDescription}>
                    The PDF will be automatically attached and sent directly to
                    WhatsApp app.
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={onClose}
                style={[styles.button, styles.cancelButton]}
                labelStyle={styles.cancelButtonText}
                disabled={isLoading}
              >
                Cancel
              </Button>

              {currentStep === 1 && (
                <Button
                  mode="contained"
                  onPress={handleCompleteFlow}
                  disabled={isLoading || !mobileNumber.trim()}
                  style={[styles.button, styles.whatsappButton]}
                  labelStyle={styles.whatsappButtonText}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Icon name="whatsapp" size={20} color="white" />
                  )}
                  <Text style={styles.whatsappButtonText}>
                    {isLoading ? ' Preparing...' : ' Open WhatsApp'}
                  </Text>
                </Button>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </Portal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fafafa',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  amountRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    marginTop: 4,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  formSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  countryCodeInput: {
    width: 80,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    fontSize: 14,
    color: '#333',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 150,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  warningCard: {
    borderColor: '#FBBF24',
    backgroundColor: '#FFFBEB',
    marginBottom: 16,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  warningText: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B45309',
    marginBottom: 4,
  },
  warningDescription: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#fafafa',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  whatsappButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});
