// components/transactions/columns.js
import React, { useState, useEffect, useRef } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';


let activeDropdownClose = null;
import { InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  Share,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  PermissionsAndroid,
  Linking,
  Pressable,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import RNPrint from 'react-native-print';
import Pdf from 'react-native-pdf';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Checkbox } from 'react-native-paper';

// Import PDF generation function with direct 1:1 template mapping (same as TransactionForm)
import { generatePdfByTemplate } from './transaction-form/invoice-handler';

// Import utilities
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { getUnifiedLines, capitalizeWords } from '../../lib/utils';
import { PaymentMethodCell } from './PaymentMethodCell';
import WhatsAppComposerDialog from './WhatsAppComposerDialog';
import { whatsappConnectionService } from '../../lib/whatsapp-connection';
import { BASE_URL } from '../../config';
import { TooltipContent } from '../ui/Tooltip';

/** Build a filter function that can match party/vendor, description and line names */
export const makeCustomFilterFn = serviceNameById => {
  return (transaction, filterValue) => {
    if (!filterValue) return true;

    const tx = transaction;
    const q = String(filterValue).toLowerCase();

    // party / vendor
    let partyName = '';
    const pv = tx.party || tx.vendor;
    if (pv && typeof pv === 'object') {
      partyName = String(pv.name || pv.vendorName || '');
    }

    const desc = String(tx.description || tx.narration || '').toLowerCase();

    // lines (products/services)
    const lines = getUnifiedLines(tx, serviceNameById);
    const matchLine = lines.some(l =>
      String(l.name || '')
        .toLowerCase()
        .includes(q),
    );

    return (
      String(partyName).toLowerCase().includes(q) ||
      desc.includes(q) ||
      matchLine
    );
  };
};

// Print invoice using react-native-share for sharing
export const printInvoice = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
  client,
  template = 'template1',
) => {
  try {
    let pdfBlob;

    switch (template) {
      case 'template1':
        pdfBlob = await generatePdfForTemplate1(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
          bank,
          client,
        );
        break;
      case 'template2':
        pdfBlob = await generatePdfForTemplate2(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
        );
        break;
      case 'template3':
        pdfBlob = await generatePdfForTemplate3(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
        );
        break;
      case 'template4':
        pdfBlob = await generatePdfForTemplate4(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
        );
        break;
      case 'template5':
        pdfBlob = await generatePdfForTemplate5(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
        );
        break;
      case 'template6':
        pdfBlob = await generatePdfForTemplate6(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
        );
        break;
      case 'template7':
        pdfBlob = await generatePdfForTemplate7(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
        );
        break;
      case 'template8':
        pdfBlob = await generatePdfForTemplate8(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
      case 'template11':
        pdfBlob = await generatePdfForTemplate11(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
          undefined,
          bank,
        );
        break;
      case 'template12':
        pdfBlob = await generatePdfForTemplate12(
          transaction,
          company || null,
          party || null,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
      case 'template16':
        pdfBlob = await generatePdfForTemplate16(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
        );
        break;
      case 'template17':
        pdfBlob = await generatePdfForTemplate17(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
      case 'template18':
        pdfBlob = await generatePdfForTemplate18(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
      case 'template19':
        pdfBlob = await generatePdfForTemplate19(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
      case 'templateA5':
        pdfBlob = await generatePdfForTemplateA5(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
          bank,
          client,
        );
        break;
      case 'templateA5_2':
        pdfBlob = await generatePdfForTemplateA5_2(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
          bank,
          client,
        );
        break;
      case 'templateA5_3':
        pdfBlob = await generatePdfForTemplateA5_3(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
          bank,
          client,
        );
        break;
      case 'templateA5_4':
        pdfBlob = await generatePdfForTemplateA5_4(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
          bank,
          client,
        );
        break;
      case 'template-t3':
        pdfBlob = await generatePdfForTemplatet3(
          transaction,
          company || null,
          party,
          shippingAddress,
          bank,
        );
        break;
      default:
        pdfBlob = await generatePdfForTemplate1(
          transaction,
          company || null,
          party,
          serviceNameById,
          shippingAddress,
          bank,
          client,
        );
    }

    // Save PDF locally
    const fileName = `Invoice-${transaction.invoiceNumber || 'INV'}.pdf`;
    const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    // Handle different return types from PDF generators
    let pdfBase64;
    if (typeof pdfBlob === 'string') {
      pdfBase64 = pdfBlob;
    } else if (pdfBlob instanceof Uint8Array) {
      pdfBase64 = Buffer.from(pdfBlob).toString('base64');
    } else if (pdfBlob instanceof Blob) {
      const arrayBuffer = await new Response(pdfBlob).arrayBuffer();
      pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
    } else {
      pdfBase64 = pdfBlob;
    }

    await RNFS.writeFile(path, pdfBase64, 'base64');

    // Use react-native-share for sharing the PDF
    const shareOptions = {
      title: 'Share Invoice',
      message: `Invoice: ${transaction.invoiceNumber}`,
      url: `file://${path}`,
      type: 'application/pdf',
      filename: fileName,
    };

    const result = await Share.share(shareOptions);

    if (result.action === Share.sharedAction) {
      Alert.alert('Success', 'Invoice shared successfully');
    }

    // Clean up after some time
    setTimeout(() => {
      RNFS.unlink(path).catch(() => {});
    }, 30000);
  } catch (error) {
    console.error('Error sharing invoice:', error);
    Alert.alert('Error', 'Failed to share invoice');
    throw error;
  }
};

// PDF Viewer Modal Component
const PdfViewerModal = ({ visible, pdfUri, onClose, onShare }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  if (!visible) return null;

  const handleShare = async () => {
    if (onShare && pdfUri) {
      await onShare(pdfUri);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.pdfModalContainer}>
        {/* Header */}
        <View style={styles.pdfModalHeader}>
          <View style={styles.pdfHeaderLeft}>
            <TouchableOpacity onPress={onClose}>
              <Feather name="arrow-left" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.pdfModalTitle}>Invoice PDF</Text>
          </View>

          <View style={styles.pdfHeaderActions}>
            {pdfUri && (
              <TouchableOpacity
                style={styles.pdfShareButton}
                onPress={handleShare}
              >
                <Feather name="share-2" size={20} color="#3b82f6" />
                <Text style={styles.pdfShareText}>Share</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* PDF Content */}
        <View style={styles.pdfContent}>
          {isLoading && (
            <View style={styles.pdfLoading}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.pdfLoadingText}>Loading PDF...</Text>
            </View>
          )}

          {error ? (
            <View style={styles.pdfError}>
              <Feather name="file-text" size={48} color="#ef4444" />
              <Text style={styles.pdfErrorText}>Failed to load PDF</Text>
              <Text style={styles.pdfErrorSubtext}>{error}</Text>
            </View>
          ) : pdfUri ? (
            <Pdf
              source={{ uri: pdfUri, cache: true }}
              style={styles.pdf}
              onLoadComplete={(numberOfPages, filePath) => {
                console.log(`PDF loaded: ${numberOfPages} pages`);
                setIsLoading(false);
              }}
              onPageChanged={(page, numberOfPages) => {
                console.log(`Current page: ${page}/${numberOfPages}`);
              }}
              onError={error => {
                console.error('PDF Error:', error);
                setError(error.message || 'Unknown error');
                setIsLoading(false);
              }}
              onPressLink={uri => {
                console.log(`Link pressed: ${uri}`);
              }}
              fitPolicy={0}
              minScale={0.5}
              maxScale={3.0}
              enablePaging={true}
              enableRTL={false}
              spacing={10}
            />
          ) : (
            <View style={styles.pdfEmpty}>
              <Feather name="file" size={48} color="#9ca3af" />
              <Text style={styles.pdfEmptyText}>No PDF available</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Dialog Component
const CustomDialog = ({ visible, onClose, title, description, children }) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.dialogOverlay} onPress={onClose}>
        <Pressable style={styles.dialogContainer}>
          <View style={styles.dialogHeader}>
            <Text style={styles.dialogTitle}>{title}</Text>
            {description && (
              <Text style={styles.dialogDescription}>{description}</Text>
            )}
            <TouchableOpacity
              style={styles.dialogCloseButton}
              onPress={onClose}
            >
              <Feather name="x" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Dropdown Menu Component - anchored to trigger
const DropdownMenu = ({ trigger, children, align = 'end' }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;
  const DEFAULT_MENU_WIDTH = 260;
  const DEFAULT_MENU_HEIGHT = 'auto';
  const [contentHeight, setContentHeight] = React.useState(null);

  const runAfterInteractionsAsync = () =>
    new Promise(resolve => {
      try {
        InteractionManager.runAfterInteractions(resolve);
      } catch (e) {
        resolve();
      }
    });


  React.useEffect(() => {
    if (open) {
      activeDropdownClose = closeMenu;
    } else if (activeDropdownClose === closeMenu) {
      activeDropdownClose = null;
    }

    return () => {
      if (activeDropdownClose === closeMenu) activeDropdownClose = null;
    };
  }, [open]);

  const handleTriggerPress = () => {
    // measure trigger position before opening menu
    try {
      if (triggerRef.current && triggerRef.current.measureInWindow) {
        triggerRef.current.measureInWindow((x, y, w, h) => {
          setMenuPos({ x, y, w, h });
        });
      }
    } catch (e) {
      // ignore
    }

    let didOpen = false;
    runAfterInteractionsAsync().then(() => {
      if (!didOpen) {
        didOpen = true;
        setOpen(true);
      }
    });

    setTimeout(() => {
      if (!didOpen) {
        didOpen = true;
        setOpen(true);
      }
    }, 200);
  };

  const closeMenu = () => setOpen(false);

  const handleBackdropPress = () => closeMenu();

 
  const childrenWithAutoClose = React.Children.map(children, child => {
    if (!child || !child.props) return child;
    if (child.type === DropdownMenuItem) {
      const originalOnPress = child.props.onPress;
      const wrapped = () => {
        
        closeMenu();
       
        setTimeout(() => {
          try {
            originalOnPress && originalOnPress();
          } catch (e) {
            console.error('Dropdown item handler error', e);
          }
        }, 140);
      };

      return React.cloneElement(child, { onPress: wrapped });
    }

    return child;
  });

  let menuStyleComputed = [
    styles.dropdownContent,
    { alignSelf: align === 'end' ? 'flex-end' : 'flex-start' },
  ];
  let innerRequiresScroll = true;
  if (menuPos) {
    const spaceBelow = windowHeight - (menuPos.y + menuPos.h);
    const spaceAbove = menuPos.y;
    const availableBelow = Math.max(0, spaceBelow - 16);
    const availableAbove = Math.max(0, spaceAbove - 16);
    const desiredContent = contentHeight || DEFAULT_MENU_HEIGHT;

    const fitsBelowMeasured = contentHeight
      ? availableBelow >= desiredContent
      : availableBelow >= DEFAULT_MENU_HEIGHT;
    const fitsAboveMeasured = contentHeight
      ? availableAbove >= desiredContent
      : availableAbove >= DEFAULT_MENU_HEIGHT;

    let finalH;
    let top;
    if (
      fitsBelowMeasured ||
      (!fitsAboveMeasured && availableBelow >= availableAbove)
    ) {
      finalH = Math.max(80, Math.min(desiredContent, availableBelow));
      top = menuPos.y + menuPos.h + 6;
    } else {
      finalH = Math.max(80, Math.min(desiredContent, availableAbove));
      top = Math.max(8, menuPos.y - finalH - 6);
    }

    const left = Math.max(
      8,
      Math.min(
        menuPos.x + menuPos.w - DEFAULT_MENU_WIDTH,
        windowWidth - DEFAULT_MENU_WIDTH - 8,
      ),
    );

    menuStyleComputed = {
      ...styles.dropdownContent,
      position: 'absolute',
      top,
      left,
      width: DEFAULT_MENU_WIDTH,
      height: finalH,
    };

    innerRequiresScroll = !(contentHeight && contentHeight <= finalH);
  }
  return (
    <>
      <TouchableOpacity
        onPress={handleTriggerPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View ref={triggerRef}>{trigger}</View>
      </TouchableOpacity>

      <Modal
        transparent
        visible={open}
        onRequestClose={closeMenu}
        animationType="fade"
        statusBarTranslucent
      >
        <Pressable style={styles.dropdownOverlay} onPress={handleBackdropPress}>
          <SafeAreaView
            style={styles.dropdownContainer}
            edges={['top', 'bottom', 'left', 'right']}
          >
            <View
              style={menuStyleComputed}
              onStartShouldSetResponder={() => true}
            >
              {innerRequiresScroll ? (
                <ScrollView
                  style={styles.dropdownScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <View
                    onLayout={e => {
                      const h = e.nativeEvent.layout.height;
                      if (h && h !== contentHeight) setContentHeight(h);
                    }}
                  >
                    {childrenWithAutoClose}
                  </View>
                </ScrollView>
              ) : (
                <View
                  onLayout={e => {
                    const h = e.nativeEvent.layout.height;
                    if (h && h !== contentHeight) setContentHeight(h);
                  }}
                >
                  {childrenWithAutoClose}
                </View>
              )}
            </View>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
};

const DropdownMenuItem = ({
  onPress,
  children,
  disabled,
  destructive,
  icon,
}) => {
  const IconComponent = icon?.type || Feather;
  const handlePress = () => {
    if (disabled) return;


    try {
      if (typeof activeDropdownClose === 'function') activeDropdownClose();
    } catch (e) {
      // ignore
    }

    if (onPress) {
      setTimeout(() => {
        try {
          onPress();
        } catch (e) {
          console.error('Dropdown item handler threw', e);
        }
      }, 140);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      style={[styles.menuItem, disabled && styles.menuItemDisabled]}
      activeOpacity={0.7}
    >
      {icon && (
        <IconComponent
          name={icon.name}
          size={16}
          color={icon.color || (destructive ? '#dc2626' : '#374151')}
          style={styles.menuIcon}
        />
      )}
      <Text
        style={[
          styles.menuItemText,
          destructive && styles.menuItemDestructive,
          disabled && styles.menuItemDisabledText,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const DropdownMenuLabel = ({ children }) => (
  <View style={styles.menuLabel}>
    <Text style={styles.menuLabelText}>{children}</Text>
  </View>
);

const DropdownMenuSeparator = () => <View style={styles.menuSeparator} />;


const SortableHeader = ({ title, onSort }) => {
  const [sortDirection, setSortDirection] = useState(null);

  const handlePress = () => {
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDirection);
    onSort && onSort(newDirection);
  };

  return (
    <TouchableOpacity style={styles.sortableHeader} onPress={handlePress}>
      <Text style={styles.headerText}>{title}</Text>
      <View style={styles.sortIcons}>
        <Feather
          name="chevron-up"
          size={14}
          color={sortDirection === 'asc' ? '#3b82f6' : '#9ca3af'}
          style={styles.sortIcon}
        />
        <Feather
          name="chevron-down"
          size={14}
          color={sortDirection === 'desc' ? '#3b82f6' : '#9ca3af'}
          style={styles.sortIcon}
        />
      </View>
    </TouchableOpacity>
  );
};

// helper to copy transaction details to clipboard
const copyTransactionDetails = async (transaction, serviceNameById) => {
  const lines = getUnifiedLines(transaction, serviceNameById);
  const transactionType =
    transaction.type?.charAt(0).toUpperCase() + transaction.type?.slice(1) ||
    'Transaction';

  let contactName = 'N/A';
  if (transaction.type === 'purchases') {
    contactName =
      transaction.vendor && typeof transaction.vendor === 'object'
        ? transaction.vendor.vendorName
        : transaction.vendor || 'N/A';
  } else {
    contactName =
      transaction.party && typeof transaction.party === 'object'
        ? transaction.party.name
        : transaction.party || 'N/A';
  }

  const date = new Date(transaction.date).toLocaleDateString();
  const total = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(transaction.totalAmount || transaction.invoiceTotal || 0);

  let text = `${transactionType} Details\n`;
  text += `Date: ${date}\n`;

  if (transaction.type === 'purchases') {
    text += `Vendor: ${contactName}\n`;
  } else if (transaction.type === 'sales') {
    text += `Customer: ${contactName}\n`;
  } else {
    text += `Party: ${contactName}\n`;
  }

  text += `Total: ${total}\n`;

  if (transaction.type !== 'sales' && transaction.type !== 'purchases') {
    text += `Reference: ${transaction.referenceNumber || 'N/A'}\n`;
  }

  text += `\nItems (${lines.length}):\n`;

  lines.forEach((line, index) => {
    text += `${index + 1}. ${line.type === 'product' ? '📦' : '🛠️'} ${
      line.name
    }\n`;

    if (line.type === 'product') {
      text += `   Qty: ${line.quantity}${
        line.unitType ? ` ${line.unitType}` : ''
      }\n`;
      if (line.pricePerUnit) {
        text += `   Price: ${new Intl.NumberFormat('en-IN').format(
          Number(line.pricePerUnit),
        )}\n`;
      }
    } else if (line.type === 'service' && line.description) {
      text += `   Desc: ${line.description}\n`;
    }

    if (line.amount) {
      text += `   Amount: ${new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(Number(line.amount))}\n`;
    }
    text += '\n';
  });

  await Clipboard.setString(text);
};

const LinesCell = ({ transaction, serviceNameById, onViewItems, compact = false }) => {
  const [showCopied, setShowCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const lines = getUnifiedLines(transaction, serviceNameById);

  if (!lines.length) return <Text style={styles.noItems}>-</Text>;

  const handleCopy = async () => {
    await copyTransactionDetails(transaction, serviceNameById);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const MAX_DISPLAY = 2;
  const displayLines = lines.slice(0, MAX_DISPLAY);
  const remainingCount = lines.length - MAX_DISPLAY;

  return (
    <View style={styles.itemsSection}>
      <TouchableOpacity
        style={styles.itemsContainer}
        onPress={() => setShowTooltip(true)}
        onLongPress={() => onViewItems && onViewItems(transaction)}
        delayLongPress={500}
      >
        {compact ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.itemLabelPrefix}>Item:</Text>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#eef2ff',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 4,
              }}
            >
              <Feather name="package" size={12} color="#0369a1" />
            </View>
            <Text style={{ fontSize: 13, color: '#1e1b4b', fontWeight: '600' }}>
              {lines.length}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.itemLabelPrefix}>Item:</Text>
            <View style={styles.itemsAvatars}>
              {displayLines.slice(0, 1).map((line, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.itemIcon,
                    line.itemType === 'product'
                      ? styles.productIcon
                      : styles.serviceIcon,
                  ]}
                >
                  {line.itemType === 'product' ? (
                    <Feather name="package" size={12} color="#0369a1" />
                  ) : (
                    <Feather name="tool" size={12} color="#92400e" />
                  )}
                </View>
              ))}
            </View>

            <View style={styles.itemsTextContainer}>
              <Text style={styles.itemsText} numberOfLines={1}>
                {lines[0]?.name || '-'}
              </Text>
              {lines.length > 1 && (
                <Text style={styles.remainingCountText}>
                  +{lines.length - 1} more
                </Text>
              )}
            </View>

            {/* <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
              <Feather name="copy" size={14} color="#9ca3af" />
            </TouchableOpacity> */}
          </>
        )}
      </TouchableOpacity>

      <TooltipContent
        visible={showTooltip}
        onClose={() => setShowTooltip(false)}
        title="Item Details"
      >
        {/* Header Totals Section */}
        <View style={styles.screenshotTotalsContainer}>
          <View style={styles.screenshotTotalColumn}>
            <Text style={styles.screenshotLabel}>Subtotal</Text>
            <Text style={styles.screenshotValue}>
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
              }).format(lines.reduce((s, l) => s + Number(l.amount || 0), 0))}
            </Text>
          </View>

          <View style={styles.screenshotTotalColumn}>
            <Text style={styles.screenshotLabel}>Tax Total</Text>
            <Text style={styles.screenshotValue}>
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
              }).format(lines.reduce((s, l) => s + Number(l.lineTax || 0), 0))}
            </Text>
          </View>

          <View style={styles.screenshotTotalColumn}>
            <Text style={styles.screenshotLabel}>Grand Total</Text>
            <Text style={[styles.screenshotValue, { color: '#10b981' }]}>
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
              }).format(
                lines.reduce(
                  (s, l) => s + Number(l.lineTotal || l.amount || 0),
                  0,
                ),
              )}
            </Text>
          </View>
        </View>

        {/* Items List */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {lines.map((line, idx) => (
            <View key={idx} style={styles.screenshotItemCard}>
            
              <View style={styles.screenshotItemHeader}>
                <View style={styles.screenshotIconCircle}>
                  <Feather
                    name={line.itemType === 'service' ? 'tool' : 'package'}
                    size={18}
                    color="#64748b"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.screenshotItemName}>{line.name}</Text>
                  <View style={styles.screenshotBadgeRow}>
                    <View style={styles.screenshotBadge}>
                      <Text style={styles.screenshotBadgeText}>
                        {line.itemType || 'Product'}
                      </Text>
                    </View>
                    {line.code && (
                      <View style={styles.screenshotBadge}>
                        <Text style={styles.screenshotBadgeText}>
                          HSN: {line.code}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Quantity & Price Grid */}
              <View style={styles.screenshotGrid}>
                <View>
                  <Text style={styles.screenshotLabelSmall}>Quantity</Text>
                  <Text style={styles.screenshotDataText}>
                    {line.itemType === 'service'
                      ? '-'
                      : `${line.quantity || '0'} ${line.unitType || 'Piece'}`}
                  </Text>
                </View>
                <View>
                  <Text style={styles.screenshotLabelSmall}>Price/Unit</Text>
                  <Text style={styles.screenshotDataText}>
                    {line.itemType === 'service'
                      ? '-'
                      : new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        }).format(line.pricePerUnit || 0)}
                  </Text>
                </View>
              </View>

              {/* Item Total Line */}
              <View style={styles.screenshotItemFooter}>
                <Text style={styles.screenshotFooterLabel}>Item Total</Text>
                <Text style={styles.screenshotFooterValue}>
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  }).format(line.amount || 0)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </TooltipContent>
    </View>
  );
};

// ✅ TransactionActions Component
const TransactionActions = ({
  transaction,
  onPreview,
  onEdit,
  onDelete,
  onSendInvoice,
  onSendWhatsApp,
  onViewInvoicePDF,
  onDownloadInvoicePDF,
  userRole,
  onConvertToSales,
  companyMap,
  serviceNameById,
  parties = [],
}) => {
  const { permissions } = useUserPermissions();
  const canEmail = !!permissions?.canSendInvoiceEmail;
  const canWhatsApp = !!permissions?.canSendInvoiceWhatsapp;
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [mailSentDialogOpen, setMailSentDialogOpen] = useState(false);
  const [mailSentTo, setMailSentTo] = useState('');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);
  const [isPdfViewOpen, setIsPdfViewOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const isInvoiceable =
    transaction.type === 'sales' || transaction.type === 'proforma';
  const isWhatsAppAllowed =
    transaction.type === 'sales' || transaction.type === 'receipt';

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete && onDelete(transaction),
        },
      ],
    );
  };

  const handleEdit = () => {
    onEdit && onEdit(transaction);
  };

  const handlePreview = () => {
    onPreview && onPreview(transaction);
  };

  const handleSendInvoice = async () => {
    if (onSendInvoice) {
      await onSendInvoice(transaction);
    }
  };

  const handleSendWhatsApp = async () => {
    try {
      
      const connected =
        typeof whatsappConnectionService?.isConnected === 'function'
          ? await whatsappConnectionService.isConnected()
          : false;

      
      if (!connected) {
        setIsWhatsAppDialogOpen(true);
        return;
      }

      
      setIsWhatsAppDialogOpen(true);
    } catch (e) {
      console.error('WhatsApp send error:', e);
      
      setIsWhatsAppDialogOpen(true);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setTimeout(() => {
      setMailSentTo('❌ Email integration not configured');
      setMailSentDialogOpen(true);
      setIsSendingEmail(false);
    }, 1000);
  };

  const handleCopy = async () => {
    try {
      setIsCopying(true);
      await copyTransactionDetails(transaction, serviceNameById);
      Alert.alert('Copied', 'Transaction details copied to clipboard');
    } catch (error) {
      console.error('Copy error:', error);
      Alert.alert('Error', 'Failed to copy transaction details');
    } finally {
      setIsCopying(false);
    }
  };

  const handleViewPDF = async () => {
    if (!isInvoiceable) {
      Alert.alert(
        'Cannot View PDF',
        'Only sales and proforma transactions can be viewed as PDF.',
      );
      return;
    }

    Alert.alert(
      'View PDF',
      'PDF viewing functionality requires integration setup.',
      [{ text: 'OK' }],
    );
  };

  const handleDownloadPDF = async () => {
    if (!isInvoiceable) {
      Alert.alert(
        'Cannot Download',
        'Only sales and proforma transactions can be downloaded as invoices.',
      );
      return;
    }

    try {
      setIsGeneratingPdf(true);

      // 1️⃣ Android Permission Check
      if (Platform.OS === 'android' && Platform.Version < 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission Required',
            message:
              'We need permission to save invoices to your Downloads folder',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission Denied',
            'Storage permission is required to download invoices.',
          );
          return;
        }
      }

      // 2️⃣ Fetch backend default template
      let selectedTemplate = 'template1';
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const templateRes = await fetch(
            `${BASE_URL}/api/settings/default-template`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (templateRes.ok) {
            const templateData = await templateRes.json();
            selectedTemplate = templateData.defaultTemplate || 'template1';
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch default template:', error.message);
      }

      // 3️⃣ Fetch party, company, bank details 
      let partyData = transaction.party || null;
      let companyData = transaction.company || null;
      let bankData = null;
      const token = await AsyncStorage.getItem('token');

      if (token) {
        try {
          const partyId = transaction.party?._id || transaction.party;
          if (partyId) {
            const partyRes = await fetch(`${BASE_URL}/api/parties/${partyId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (partyRes.ok) {
              partyData = await partyRes.json();
            }
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch party:', err.message);
        }

        try {
          const companyId = transaction.company?._id || transaction.company;
          if (companyId) {
            const companyRes = await fetch(
              `${BASE_URL}/api/companies/${companyId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (companyRes.ok) {
              companyData = await companyRes.json();
            }
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch company:', err.message);
        }

        try {
          const bankId = transaction.bank?._id || transaction.bank;
          if (bankId) {
            const bankRes = await fetch(
              `${BASE_URL}/api/bank-details/${bankId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (bankRes.ok) {
              const bankResponse = await bankRes.json();
              
              bankData = bankResponse.data || bankResponse;
            } else {
              console.warn(
                '⚠️ Download: Bank API returned status:',
                bankRes.status,
              );
              if (transaction.bank && typeof transaction.bank === 'object') {
                bankData = transaction.bank;
              }
            }
          } else {
            if (transaction.bank && typeof transaction.bank === 'object') {
              bankData = transaction.bank;
            }
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch bank:', err.message);
          if (transaction.bank && typeof transaction.bank === 'object') {
            bankData = transaction.bank;
          }
        }
      }

      // 4️⃣ Generate Unique Filename
      const invoiceNumber =
        transaction.invoiceNumber ||
        transaction.referenceNumber ||
        transaction._id.slice(-6);
      const timestamp = Date.now();
      const fname = `Invoice_${invoiceNumber}_${timestamp}.pdf`;

      // 5️⃣ Convert serviceNameById to Map
      const serviceNameMap =
        serviceNameById instanceof Map
          ? serviceNameById
          : new Map(Object.entries(serviceNameById || {}));

      // 6️⃣ Extract shippingAddress
      const shippingAddress =
        transaction?.shippingAddress &&
        typeof transaction.shippingAddress === 'object'
          ? transaction.shippingAddress
          : null;

      const pdfBlob = await generatePdfByTemplate(
        selectedTemplate,
        transaction,
        companyData || null,
        partyData || null,
        serviceNameMap,
        shippingAddress,
        bankData,
      );

      // 8️⃣ Normalize PDF to Base64 
      let pdfBase64;

      if (
        pdfBlob &&
        typeof pdfBlob === 'object' &&
        (pdfBlob.filePath || pdfBlob.path)
      ) {
        const filePath = pdfBlob.filePath || pdfBlob.path;
        try {
          const normalizedPath = String(filePath).startsWith('file://')
            ? String(filePath).replace('file://', '')
            : String(filePath);
          pdfBase64 = await RNFS.readFile(normalizedPath, 'base64');
        } catch (err) {
          console.warn(
            '⚠️ Failed to read PDF filePath from generator object:',
            err,
          );
        }
      }

      if (!pdfBase64) {
        if (typeof pdfBlob === 'string') {
          // If template returned a file path string, read it
          if (pdfBlob.includes('/') || pdfBlob.includes('\\')) {
            try {
              pdfBase64 = await RNFS.readFile(pdfBlob, 'base64');
            } catch (err) {
              console.warn(
                '⚠️ Failed to read PDF file path, treating as base64 string:',
                err,
              );
              pdfBase64 = pdfBlob;
            }
          } else {
            // already base64
            pdfBase64 = pdfBlob;
          }
        } else if (pdfBlob && typeof pdfBlob.output === 'function') {
          // jsPDF instance
          pdfBase64 = pdfBlob.output('base64');
        } else if (
          typeof Uint8Array !== 'undefined' &&
          pdfBlob instanceof Uint8Array
        ) {
          pdfBase64 = Buffer.from(pdfBlob).toString('base64');
        } else if (typeof Blob !== 'undefined' && pdfBlob instanceof Blob) {
          const arrayBuffer = await new Response(pdfBlob).arrayBuffer();
          pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
        } else {
          pdfBase64 = pdfBlob;
        }
      }

      if (!pdfBase64 || typeof pdfBase64 !== 'string') {
        throw new Error('Invalid PDF data generated');
      }

      // 9️⃣ Setup Paths
      const tempPath = `${RNFS.DocumentDirectoryPath}/${fname}`;
      const downloadDir =
        Platform.OS === 'android'
          ? RNFS.DownloadDirectoryPath
          : RNFS.DocumentDirectoryPath;
      const publicPath = `${downloadDir}/${fname}`;

      // 🔟 Write file
      await RNFS.writeFile(tempPath, pdfBase64, 'base64');

      
      if (Platform.OS === 'android') {
        await RNFS.copyFile(tempPath, publicPath);
        try {
          await RNFS.scanFile(publicPath);
        } catch (scanErr) {
          console.warn('Media scan warning:', scanErr);
        }
        Alert.alert('Download Successful ✅', `Saved as: ${fname}`, [
          { text: 'OK' },
        ]);
      } else {
        await Share.share({
          url: `file://${tempPath}`,
          type: 'application/pdf',
          filename: fname,
        });
      }

      await RNFS.unlink(tempPath).catch(() =>
        console.log('Temp file cleanup skipped'),
      );
    } catch (error) {
      console.error('🔴 Download Error:', error);
      Alert.alert(
        'Download Failed',
        error.message || 'Could not save invoice.',
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintInvoice = async () => {
    if (!isInvoiceable) {
      Alert.alert(
        'Cannot Print',
        'Only sales transactions can be printed as invoices.',
      );
      return;
    }

    try {
      setIsGeneratingPdf(true);

      // 1️⃣ Fetch backend default template 
      let selectedTemplate = 'template1';
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const templateRes = await fetch(
            `${BASE_URL}/api/settings/default-template`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (templateRes.ok) {
            const templateData = await templateRes.json();
            selectedTemplate = templateData.defaultTemplate || 'template1';
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch default template:', error.message);
      }

      // 2️⃣ Fetch party, company, bank details
      let partyData = transaction.party || null;
      let companyData = transaction.company || null;
      let bankData = null;
      const token = await AsyncStorage.getItem('token');

      if (token) {
        try {
          const partyId = transaction.party?._id || transaction.party;
          if (partyId) {
            const partyRes = await fetch(`${BASE_URL}/api/parties/${partyId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (partyRes.ok) {
              partyData = await partyRes.json();
            }
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch party:', err.message);
        }

        try {
          const companyId = transaction.company?._id || transaction.company;
          if (companyId) {
            const companyRes = await fetch(
              `${BASE_URL}/api/companies/${companyId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (companyRes.ok) {
              companyData = await companyRes.json();
            }
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch company:', err.message);
        }

        try {
          const bankId = transaction.bank?._id || transaction.bank;
          if (bankId) {
            const bankRes = await fetch(
              `${BASE_URL}/api/bank-details/${bankId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (bankRes.ok) {
              const bankResponse = await bankRes.json();
              
              bankData = bankResponse.data || bankResponse;
            } else {
              console.warn(
                '⚠️ Print: Bank API returned status:',
                bankRes.status,
              );
              if (transaction.bank && typeof transaction.bank === 'object') {
                bankData = transaction.bank;
              }
            }
          } else {
            if (transaction.bank && typeof transaction.bank === 'object') {
              bankData = transaction.bank;
            }
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch bank:', err.message);
          if (transaction.bank && typeof transaction.bank === 'object') {
            bankData = transaction.bank;
          }
        }
      }

      
      const serviceNameMap =
        serviceNameById instanceof Map
          ? serviceNameById
          : new Map(Object.entries(serviceNameById || {}));

      
      const shippingAddress =
        transaction?.shippingAddress &&
        typeof transaction.shippingAddress === 'object'
          ? transaction.shippingAddress
          : null;

      const pdfBlob = await generatePdfByTemplate(
        selectedTemplate,
        transaction,
        companyData || null,
        partyData || null,
        serviceNameMap,
        shippingAddress,
        bankData,
      );

      
      let pdfBase64;

      
      if (
        pdfBlob &&
        typeof pdfBlob === 'object' &&
        (pdfBlob.filePath || pdfBlob.path)
      ) {
        const filePath = pdfBlob.filePath || pdfBlob.path;
        try {
          const normalizedPath = String(filePath).startsWith('file://')
            ? String(filePath).replace('file://', '')
            : String(filePath);
          pdfBase64 = await RNFS.readFile(normalizedPath, 'base64');
        } catch (err) {
          console.warn(
            '⚠️ Failed to read PDF filePath from generator object for print:',
            err,
          );
        }
      }

      if (!pdfBase64) {
        if (typeof pdfBlob === 'string') {
          if (pdfBlob.includes('/') || pdfBlob.includes('\\')) {
            try {
              pdfBase64 = await RNFS.readFile(pdfBlob, 'base64');
            } catch (err) {
              console.warn(
                '⚠️ Failed to read PDF file path for print, treating as base64 string:',
                err,
              );
              pdfBase64 = pdfBlob;
            }
          } else {
            pdfBase64 = pdfBlob;
          }
        } else if (pdfBlob && typeof pdfBlob.output === 'function') {
          pdfBase64 = pdfBlob.output('base64');
        } else if (
          typeof Uint8Array !== 'undefined' &&
          pdfBlob instanceof Uint8Array
        ) {
          pdfBase64 = Buffer.from(pdfBlob).toString('base64');
        } else if (typeof Blob !== 'undefined' && pdfBlob instanceof Blob) {
          const arrayBuffer = await new Response(pdfBlob).arrayBuffer();
          pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
        } else {
          pdfBase64 = pdfBlob;
        }
      }

      if (!pdfBase64 || typeof pdfBase64 !== 'string') {
        throw new Error('Invalid PDF data generated');
      }

      
      const fileName = `Invoice_${transaction.invoiceNumber || Date.now()}.pdf`;
      const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      await RNFS.writeFile(cachePath, pdfBase64, 'base64');

      
      await RNPrint.print({ filePath: cachePath })
        .catch(err => {
          console.error('Print error:', err);
          Alert.alert('Print Failed', 'Could not print invoice.');
        })
        .finally(() => {
          setTimeout(() => {
            RNFS.unlink(cachePath).catch(() => {});
          }, 2000);
        });
    } catch (error) {
      console.error('🔴 Print Error:', error);
      Alert.alert(
        'Print Failed',
        error.message || 'Could not prepare invoice for printing.',
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleConvertToSales = () => {
    if (onConvertToSales) {
      onConvertToSales(transaction);
    }
  };

  return (
    <>
     
      <View style={styles.actionRow}>
        
        {isInvoiceable && (
          <TouchableOpacity onPress={handlePreview} activeOpacity={0.8}>
            <LinearGradient
              colors={[
                '#b6aff8',
                '#7C6FF7',
                // '#ccbcf8',
                // '#835deb', 
                // '#b5a0f0',
              ]}
              style={styles.viewInvoiceButton}
            >
              <Text style={styles.viewInvoiceButtonText}>View Invoice</Text>
              <Feather
                name="chevron-right"
                size={14}
                color="#ffffff"
                style={{ marginLeft: 4 }}
              />
            </LinearGradient>
          </TouchableOpacity>
        )}

       
        <View style={styles.iconGroup}>
          {/* Copy button */}
          <TouchableOpacity 
            onPress={handleCopy}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ marginRight: 6 }}
          >
            <View style={styles.copyIconButton}>
              <Feather name="copy" size={18} color="#000" />
            </View>
          </TouchableOpacity>

          {/* share icon menu containing whatsapp / email options */}
          <DropdownMenu
            trigger={
              <View style={styles.shareButton}>
                <Feather name="share-2" size={20} color="#000" />
              </View>
            }
          >
            <DropdownMenuLabel>Share</DropdownMenuLabel>
            <DropdownMenuItem
              onPress={() => {
                if (onSendWhatsApp) onSendWhatsApp(transaction);
                else handleSendWhatsApp();
              }}
              icon={{ type: FontAwesome5, name: 'whatsapp', color: '#25D366' }}
              disabled={!isWhatsAppAllowed || !canWhatsApp}
            >
              Send on WhatsApp
              {!canWhatsApp && ' (No permission)'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onPress={async () => {
                if (onSendInvoice) {
                  try {
                    await onSendInvoice(transaction);
                  } catch (_) {}
                } else {
                  handleSendEmail();
                }
              }}
              icon={{ type: Feather, name: 'send' }}
              disabled={!isInvoiceable || isSendingEmail || !canEmail}
            >
              {isSendingEmail ? 'Sending...' : 'Send Invoice via Email'}
            </DropdownMenuItem>
          </DropdownMenu>

          <DropdownMenu
            trigger={
              <View style={styles.moreButton}>
                <Feather name="more-vertical" size={20} color="#000" />
              </View>
            }
          >
            <DropdownMenuLabel>Actions</DropdownMenuLabel>

            {/* Download Invoice */}
            <DropdownMenuItem
              onPress={() => {
                if (onDownloadInvoicePDF) onDownloadInvoicePDF(transaction);
                else handleDownloadPDF();
              }}
              icon={{ type: Feather, name: 'download' }}
              disabled={!isInvoiceable}
            >
              Download Invoice
            </DropdownMenuItem>

            {/* Print Invoice  */}
            <DropdownMenuItem
              onPress={() => {
                try {
                  if (onViewInvoicePDF) onViewInvoicePDF(transaction);
                  else handlePrintInvoice();
                } catch (e) {
                  console.error('Print action failed', e);
                }
              }}
              icon={{ type: Feather, name: 'printer' }}
              disabled={!isInvoiceable}
            >
              Print Invoice
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Edit Transaction */}
            <DropdownMenuItem
              onPress={() => onEdit && onEdit(transaction)}
              icon={{ type: Feather, name: 'edit' }}
            >
              Edit transaction
            </DropdownMenuItem>

            {/* Delete Transaction */}
            <DropdownMenuItem
              onPress={() => onDelete && onDelete(transaction)}
              icon={{ type: Feather, name: 'trash-2' }}
              destructive
            >
              Delete transaction
            </DropdownMenuItem>
          </DropdownMenu>
        </View>
      </View>

      {/* PDF Viewer Modal */}
      <PdfViewerModal
        visible={isPdfViewOpen}
        pdfUri={pdfUri}
        onClose={() => {
          setIsPdfViewOpen(false);
          setPdfUri(null);
        }}
        onShare={() => {
          if (pdfUri) {
            const filePath = pdfUri.replace('file://', '');
            // handleSharePDF(filePath);
          }
        }}
      />

      <WhatsAppComposerDialog
        isOpen={isWhatsAppDialogOpen}
        onClose={() => setIsWhatsAppDialogOpen(false)}
        transaction={transaction}
        
        party={
          
          (Array.isArray(parties) &&
            parties.find(p => {
              const partyId = transaction?.party?._id || transaction?.party;
              return (
                p && (String(p._id) === String(partyId) || p._id === partyId)
              );
            })) ||
          transaction.party ||
          transaction.vendor ||
          {}
        }
        company={transaction.company || {}}
        whatsappService={whatsappConnectionService}
        baseUrl={BASE_URL}
      />

      <CustomDialog
        visible={mailSentDialogOpen}
        onClose={() => setMailSentDialogOpen(false)}
        title="Mail Status"
        description={mailSentTo}
      >
        <TouchableOpacity
          style={styles.okButton}
          onPress={() => setMailSentDialogOpen(false)}
        >
          <Text style={styles.okButtonText}>OK</Text>
        </TouchableOpacity>
      </CustomDialog>

      <CustomDialog
        visible={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        title={
          userRole === 'client'
            ? 'Email invoicing is enabled for your account'
            : 'Email invoicing requires setup'
        }
        description={
          userRole === 'client'
            ? 'Your administrator has granted you permission to send invoices via email.'
            : 'Please contact your administrator to set up email integration.'
        }
      >
        {userRole === 'client' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setEmailDialogOpen(false)}
          >
            <Text style={styles.primaryButtonText}>Go to Permissions</Text>
          </TouchableOpacity>
        )}
      </CustomDialog>
    </>
  );
};

// ✅ Main columns function 
export const columns = ({
  onPreview,
  onViewItems,
  onEdit,
  onDelete,
  companyMap,
  serviceNameById,
  onSendInvoice,
  onSendWhatsApp,
  hideActions = false,
  userRole,
  onConvertToSales,
  customerBalances,
  selectedRows = [],
  onSelectRow,
  onSelectAllRows,
  hideCheckbox = false,
  onSortAmount,
  onViewInvoicePDF,
  onDownloadInvoicePDF,
  parties = [],
}) => {
  const customFilterFn = makeCustomFilterFn(serviceNameById);

  // Badge Component 
  const Badge = ({ children, variant, style }) => {
    const typeStyles = {
      sales: styles.typeSales,
      purchases: styles.typePurchases,
      proforma: styles.typeProforma,
      receipt: styles.typeReceipt,
      payment: styles.typePayment,
      journal: styles.typeJournal,
    };

    return (
      <View style={[styles.badge, typeStyles[variant], style]}>
        <Text style={styles.badgeText}>{children}</Text>
      </View>
    );
  };

  
  const Avatar = ({ children, size = 28, style }) => (
    <View style={[styles.avatar, { width: size, height: size }, style]}>
      <Text style={styles.avatarText}>{children}</Text>
    </View>
  );

  
  const baseColumns = [];

  // SELECT COLUMN 
  if (!hideCheckbox) {
    baseColumns.push({
      id: 'select',
      header: () => (
        <View style={styles.checkboxHeader}>
          <Checkbox.Android
            status={selectedRows.length > 0 ? 'checked' : 'unchecked'}
            onPress={onSelectAllRows}
            color="#3b82f6"
          />
        </View>
      ),
      cell: transaction => (
        <View style={styles.checkboxCell}>
          <Checkbox.Android
            status={
              selectedRows.includes(transaction._id) ? 'checked' : 'unchecked'
            }
            onPress={() => onSelectRow && onSelectRow(transaction._id)}
            color="#3b82f6"
          />
        </View>
      ),
      render: transaction => (
        <View style={styles.checkboxCell}>
          <Checkbox.Android
            status={
              selectedRows.includes(transaction._id) ? 'checked' : 'unchecked'
            }
            onPress={() => onSelectRow && onSelectRow(transaction._id)}
            color="#3b82f6"
          />
        </View>
      ),
      meta: {
        label: 'SELECT',
        mobileLabel: 'SELECT',
      },
    });
  }

  // PARTY / DETAILS 
  baseColumns.push({
    id: 'party',
    header: 'Details',
    cell: transaction => {
      if (transaction.type === 'journal') {
        return (
          <View style={styles.partyInfo}>
            <Avatar>JE</Avatar>
            <View>
              <Text style={styles.partyName}>Journal Entry</Text>
              <Text style={styles.description}>
                {transaction.debitAccount} / {transaction.creditAccount}
              </Text>
            </View>
          </View>
        );
      }

      const partyOrVendor = transaction.party || transaction.vendor;
      let partyName = 'N/A';
      if (partyOrVendor && typeof partyOrVendor === 'object') {
        if ('name' in partyOrVendor) {
          partyName = partyOrVendor.name;
        } else if ('vendorName' in partyOrVendor) {
          partyName = partyOrVendor.vendorName;
        }
      }

      if (
        transaction.type === 'payment' &&
        transaction.isExpense &&
        transaction.expense
      ) {
        if (
          typeof transaction.expense === 'object' &&
          transaction.expense.name
        ) {
          partyName = transaction.expense.name;
        } else if (typeof transaction.expense === 'string') {
          partyName = transaction.expense;
        }
      }

      return (
        <View style={styles.partyInfo}>
          <View style={styles.partyMainContent}>
            <Avatar>{partyName.substring(0, 2).toUpperCase()}</Avatar>
            <View style={styles.partyText}>
              <Text style={styles.partyName}>
                {capitalizeWords(partyName) || 'N/A'}
              </Text>
            </View>
          </View>
          {(transaction.description || transaction.narration) && (
            <Text style={styles.description} numberOfLines={1}>
              {transaction.description || transaction.narration}
            </Text>
          )}
        </View>
      );
    },
    render: transaction => {
      if (transaction.type === 'journal') {
        return (
          <View style={styles.partyInfo}>
            <Avatar>JE</Avatar>
            <View>
              <Text style={styles.partyName}>Journal Entry</Text>
              <Text style={styles.description}>
                {transaction.debitAccount} / {transaction.creditAccount}
              </Text>
            </View>
          </View>
        );
      }

      const partyOrVendor = transaction.party || transaction.vendor;
      let partyName = 'N/A';
      if (partyOrVendor && typeof partyOrVendor === 'object') {
        if ('name' in partyOrVendor) {
          partyName = partyOrVendor.name;
        } else if ('vendorName' in partyOrVendor) {
          partyName = partyOrVendor.vendorName;
        }
      }

      if (
        transaction.type === 'payment' &&
        transaction.isExpense &&
        transaction.expense
      ) {
        if (
          typeof transaction.expense === 'object' &&
          transaction.expense.name
        ) {
          partyName = transaction.expense.name;
        } else if (typeof transaction.expense === 'string') {
          partyName = transaction.expense;
        }
      }

      return (
        <View style={styles.partyInfo}>
          <View style={styles.partyMainContent}>
            <Avatar>{partyName.substring(0, 2).toUpperCase()}</Avatar>
            <View style={styles.partyText}>
              <Text style={styles.partyName}>
                {capitalizeWords(partyName) || 'N/A'}
              </Text>
            </View>
          </View>
          {(transaction.description || transaction.narration) && (
            <Text style={styles.description} numberOfLines={1}>
              {transaction.description || transaction.narration}
            </Text>
          )}
        </View>
      );
    },
    filterFn: customFilterFn,
    meta: {
      label: 'DETAILS',
      mobileLabel: 'DETAILS',
    },
  });

  // COMPANY 
  baseColumns.push({
    id: 'company',
    header: 'Company',
    cell: transaction => {
      const company = transaction.company;
      const companyId =
        typeof company === 'object' && company ? company._id : company;

      if (!companyId) return <Text style={styles.naText}>N/A</Text>;

      const companyName = companyMap?.get(companyId) || 'N/A';
      return (
        <View style={styles.companySection}>
          <Ionicons name="business-outline" size={16} color="#666" />
          <Text style={styles.companyText} numberOfLines={1}>
            {companyName}
          </Text>
        </View>
      );
    },
    render: transaction => {
      const company = transaction.company;
      const companyId =
        typeof company === 'object' && company ? company._id : company;

      if (!companyId) return <Text style={styles.naText}>N/A</Text>;

      const companyName = companyMap?.get(companyId) || 'N/A';
      return (
        <View style={styles.companySection}>
          <Ionicons name="business-outline" size={16} color="#666" />
          <Text style={styles.companyText} numberOfLines={1}>
            {companyName}
          </Text>
        </View>
      );
    },
    meta: {
      label: 'COMPANY',
      mobileLabel: 'COMPANY',
    },
  });

  // LINES (ITEMS/SERVICES)
  baseColumns.push({
    id: 'lines',
    header: 'Items / Services',
    cell: (transaction, opts = {}) => (
      <LinesCell
        transaction={transaction}
        serviceNameById={serviceNameById}
        onViewItems={onViewItems}
        compact={opts.compact}
      />
    ),
    render: (transaction, opts = {}) => (
      <LinesCell
        transaction={transaction}
        serviceNameById={serviceNameById}
        onViewItems={onViewItems}
        compact={opts.compact}
      />
    ),
    meta: {
      label: 'ITEMS / SERVICES',
      mobileLabel: 'ITEMS / SERVICES',
    },
  });

  // PAYMENT METHOD 
  baseColumns.push({
    id: 'paymentMethod',
    header: 'Payment Method',
    cell: transaction => <PaymentMethodCell transaction={transaction} />,
    render: transaction => <PaymentMethodCell transaction={transaction} />,
    meta: {
      label: 'PAYMENT METHOD',
      mobileLabel: 'PAYMENT METHOD',
    },
  });

  // AMOUNT -
  baseColumns.push({
    id: 'totalAmount',
    header: () => <SortableHeader title="Amount" onSort={onSortAmount} />,
    cell: transaction => {
      const amount = parseFloat(
        String(transaction.totalAmount || transaction.amount || 0),
      );
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount);

      return <Text style={styles.amountText}>{formatted}</Text>;
    },
    render: transaction => {
      const amount = parseFloat(
        String(transaction.totalAmount || transaction.amount || 0),
      );
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount);

      return <Text style={styles.amountText}>{formatted}</Text>;
    },
    meta: {
      label: 'AMOUNT',
      mobileLabel: 'AMOUNT',
    },
  });

  // DATE - 
  baseColumns.push({
    id: 'date',
    header: 'Date',
    cell: transaction => {
      const date = new Date(transaction.date);
      return (
        <Text style={styles.dateText}>
          {date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      );
    },
    render: transaction => {
      const date = new Date(transaction.date);
      return (
        <Text style={styles.dateText}>
          {date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      );
    },
    meta: {
      label: 'DATE',
      mobileLabel: 'DATE',
    },
  });

  // TYPE - 
  baseColumns.push({
    id: 'type',
    header: 'Type',
    cell: transaction => {
      const type = transaction.type;
      const typeStyles = {
        sales: styles.typeSales,
        purchases: styles.typePurchases,
        proforma: styles.typeProforma,
        receipt: styles.typeReceipt,
        payment: styles.typePayment,
        journal: styles.typeJournal,
      };

      return (
        <Badge variant={type} style={typeStyles[type]}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Badge>
      );
    },
    render: transaction => {
      const type = transaction.type;
      const typeStyles = {
        sales: styles.typeSales,
        purchases: styles.typePurchases,
        proforma: styles.typeProforma,
        receipt: styles.typeReceipt,
        payment: styles.typePayment,
        journal: styles.typeJournal,
      };

      return (
        <Badge variant={type} style={typeStyles[type]}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Badge>
      );
    },
    meta: {
      label: 'TYPE',
      mobileLabel: 'TYPE',
    },
  });

  
  if (!hideActions) {
    baseColumns.push({
      id: 'actions',
      header: 'Actions',
      cell: transaction => (
        <TransactionActions
          transaction={transaction}
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
          onSendInvoice={onSendInvoice}
          onSendWhatsApp={onSendWhatsApp}
          onViewInvoicePDF={onViewInvoicePDF}
          onDownloadInvoicePDF={onDownloadInvoicePDF}
          userRole={userRole}
          onConvertToSales={onConvertToSales}
          companyMap={companyMap}
          serviceNameById={serviceNameById}
          parties={parties}
        />
      ),
      render: transaction => (
        <TransactionActions
          transaction={transaction}
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
          onSendInvoice={onSendInvoice}
          onSendWhatsApp={onSendWhatsApp}
          onViewInvoicePDF={onViewInvoicePDF}
          onDownloadInvoicePDF={onDownloadInvoicePDF}
          userRole={userRole}
          onConvertToSales={onConvertToSales}
          companyMap={companyMap}
          serviceNameById={serviceNameById}
          parties={parties}
        />
      ),
      meta: {
        label: 'ACTIONS',
        mobileLabel: 'ACTIONS',
      },
    });
  }

  return baseColumns;
};


export const getColumnLabel = (column, defaultLabel = '') => {
  if (column.meta?.mobileLabel) return column.meta.mobileLabel;
  if (column.meta?.label) return column.meta.label;
  if (typeof column.header === 'string') return column.header;
  return column.id?.toUpperCase() || defaultLabel;
};


export const getColumnValue = (column, item) => {
  if (column.cell && typeof column.cell === 'function') {
    return column.cell(item);
  }
  if (column.render && typeof column.render === 'function') {
    return column.render(item);
  }
  return item[column.id] || '';
};


export const useColumns = options => {
  const cols = columns(options || {});

  
  const renderActionSheet = () => null;
  const renderCopySuccess = () => null;
  const renderEmailNotConnectedDialog = () => null;
  const renderMailStatusDialog = () => null;
  const renderPdfViewer = () => null;

  return {
    columns: cols,
    renderActionSheet,
    renderCopySuccess,
    renderEmailNotConnectedDialog,
    renderMailStatusDialog,
    renderPdfViewer,
  };
};

// Styles
const styles = StyleSheet.create({
  
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-end',
    // borderWidth: 1,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeSales: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  typePurchases: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  typeProforma: {
    backgroundColor: '#ecfeff',
    borderColor: '#a5f3fc',
  },
  typeReceipt: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  typePayment: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  typeJournal: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },

  // Premium Avatar
  avatar: {
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    width: 38,
    height: 38,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C6FF7',
  },

  // Item Icon
  itemIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  productIcon: {
    backgroundColor: '#e0f2fe',
  },
  serviceIcon: {
    backgroundColor: '#fef3c7',
  },

  // Premium Party Info 
  partyInfo: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  partyMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  partyText: {
    alignItems: 'flex-start',
    flex: 1,
  },
  partyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e1b4b',
    textAlign: 'left',
  },
  description: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    paddingLeft: 48,
  },

  // Company
  companySection: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingLeft: 48,
  },
  companyText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'left',
    marginLeft: 4,
    flex: 0,
  },

  // Items 
  itemsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },

  itemLabelPrefix: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginRight: 6,
  },
  copyButtonWrapper: {
    position: 'relative',
  },
  copyButton: {
    padding: 4,
    marginLeft: 6,
  },
  itemsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  itemsAvatars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  remainingItems: {
    backgroundColor: '#e5e7eb',
  },
  remainingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4b5563',
  },
  itemsTextContainer: {
    alignItems: 'flex-start',
    flex: 1,
  },
  itemsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e1b4b',
  },
  remainingCountText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  noItems: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },

  // Tooltip
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltipContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  tooltipList: {
    maxHeight: 400,
  },
  tooltipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tooltipItemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  tooltipItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  tooltipItemMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  tooltipItemDesc: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },

  tooltipTotalsTop: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  tooltipItemsList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  tooltipLineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eef2ff',
  },
  tooltipLineContent: {
    flexDirection: 'column',
  },
  tooltipLineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tooltipLineInfo: {
    marginLeft: 12,
    flex: 1,
  },
  tooltipLineName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  tooltipItemMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  tooltipServiceDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  itemTypeBadgeSmall: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  itemTypeBadgeTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  tooltipLineDetails: {
    marginTop: 10,
  },

  // Screenshot-style totals + cards
  screenshotTotalsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 10,
  },
  screenshotTotalColumn: {
    alignItems: 'center',
    flex: 1,
  },
  screenshotLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  screenshotValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  screenshotItemCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  screenshotItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  screenshotIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenshotItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  screenshotBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  screenshotBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  screenshotBadgeText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  screenshotGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  screenshotLabelSmall: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  screenshotDataText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  screenshotItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    pt: 12,
    paddingTop: 12,
  },
  screenshotFooterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  screenshotFooterValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981', 
  },

  // Premium Amount
  amountText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111111',
    textAlign: 'right',
  },

  // Sortable Header
  sortableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginRight: 4,
  },
  sortIcons: {
    flexDirection: 'column',
  },
  sortIcon: {
    marginTop: -2,
    marginBottom: -2,
  },

  // Premium Date
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
  },

  // Checkbox
  checkboxHeader: {
    padding: 8,
  },
  checkboxCell: {
    padding: 8,
  },

  // Dropdown - FIXED STYLES
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdownContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  dropdownContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 800,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dropdownScroll: {
    maxHeight: 800,
  },
  moreButton: {
    padding: 6,
    borderRadius: 8,
  },

  
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 6,
  },
  viewInvoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8e6bcf',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 120,
    maxWidth: 200,
    flexShrink: 0,
  },
  viewInvoiceButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  shareButton: {
    padding: 6,
    borderRadius: 8,
    marginHorizontal: 3,
    // backgroundColor: '#f3f4f6',
  },
  copyIconButton: {
    padding: 6,
    borderRadius: 8,
    marginRight: 3,
    // backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemDisabledText: {
    color: '#9ca3af',
  },
  menuItemDestructive: {
    color: '#dc2626',
  },
  menuItemText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  menuSeparator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },

  // PDF Modal Styles
  pdfModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdfModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pdfHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pdfModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  pdfHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  pdfShareText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  pdfContent: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  pdfLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfLoadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  pdfError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pdfErrorText: {
    fontSize: 18,
    color: '#ef4444',
    marginTop: 12,
    fontWeight: '600',
  },
  pdfErrorSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  pdfEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfEmptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },

  // WhatsApp Dialog
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  dialogSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontSize: 14,
    color: '#111827',
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#25D366',
    gap: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // Dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  dialogHeader: {
    marginBottom: 20,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  dialogDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  dialogCloseButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
  },
  okButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  okButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // Copied message
  copiedMessage: {
    position: 'absolute',
    top: -30,
    left: -20,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1000,
  },
  copiedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },

  // N/A text
  naText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
});

export default {
  makeCustomFilterFn,
  printInvoice,
  columns,
  getColumnLabel,
  getColumnValue,
};
