// components/transactions/columns.js
import React, { useState, useEffect, useRef } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Global helper: when a DropdownMenu opens it will set this to its
// close function. Menu items call this to ensure the menu is closed
// immediately before running their handlers (prevents z-index/backdrop
// races on Android/iOS with nested modals).
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
import Pdf from 'react-native-pdf';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Checkbox } from 'react-native-paper';

// Import all PDF generation functions
import { generatePdfForTemplate1 } from '../../lib/pdf-template1';
import { generatePdfForTemplate11 } from '../../lib/pdf-template11';
import { generatePdfForTemplate12 } from '../../lib/pdf-template12';
import { generatePdfForTemplate16 } from '../../lib/pdf-template16';
import { generatePdfForTemplateA5 } from '../../lib/pdf-templateA5';
import { generatePdfForTemplateA5_3 } from '../../lib/pdf-templateA5-3';
import { generatePdfForTemplateA5_4 } from '../../lib/pdf-templateA5-4';
import { generatePdfForTemplatet3 } from '../../lib/pdf-template-t3';
import { generatePdfForTemplate2 } from '../../lib/pdf-template2';
import { generatePdfForTemplate17 } from '../../lib/pdf-template17';
import { generatePdfForTemplate18 } from '../../lib/pdf-template18';
import { generatePdfForTemplate19 } from '../../lib/pdf-template19';
import { generatePdfForTemplate3 } from '../../lib/pdf-template3';
import { generatePdfForTemplate4 } from '../../lib/pdf-template4';
import { generatePdfForTemplate5 } from '../../lib/pdf-template5';
import { generatePdfForTemplate6 } from '../../lib/pdf-template6';
import { generatePdfForTemplate7 } from '../../lib/pdf-template7';
import { generatePdfForTemplate8 } from '../../lib/pdf-template8';
import { generatePdfForTemplateA5_2 } from '../../lib/pdf-templateA3-2';

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
  // Increased default menu height so larger dialogs can fit inside when possible
  const DEFAULT_MENU_HEIGHT = 520;
  const [contentHeight, setContentHeight] = React.useState(null);

  const runAfterInteractionsAsync = () =>
    new Promise(resolve => {
      try {
        InteractionManager.runAfterInteractions(resolve);
      } catch (e) {
        resolve();
      }
    });

  // expose a close function globally while this menu is open so
  // individual menu items can reliably close the modal before
  // invoking actions (prevents the menu overlay from obscuring
  // subsequent dialogs like the invoice preview).
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

  // Clone children so that menu items auto-close the dropdown before running their action.
  const childrenWithAutoClose = React.Children.map(children, child => {
    if (!child || !child.props) return child;
    // If it's a DropdownMenuItem, wrap its onPress to close the menu first
    if (child.type === DropdownMenuItem) {
      const originalOnPress = child.props.onPress;
      const wrapped = () => {
        // close the dropdown immediately
        closeMenu();
        // call original handler after a short delay so the modal backdrop is removed
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

  // Compute menu placement and whether inner scrolling is required
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

    // Close any active dropdown immediately to ensure subsequent
    // modals/dialogs appear above the menu. Allow a short delay so
    // the native Modal backdrop is removed before running handler.
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

// Legacy ItemsTooltip removed — use `TooltipContent` (from ../ui/Tooltip) inside `LinesCell` for a richer, consistent UI.

// ✅ SortableHeader Component (alag component)
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

// ✅ LinesCell Component (alag component)
const LinesCell = ({ transaction, serviceNameById, onViewItems }) => {
  const [showCopied, setShowCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const lines = getUnifiedLines(transaction, serviceNameById);

  if (!lines.length) return <Text style={styles.noItems}>-</Text>;

  const handleCopy = async () => {
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
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const MAX_DISPLAY = 2;
  const displayLines = lines.slice(0, MAX_DISPLAY);
  const remainingCount = lines.length - MAX_DISPLAY;

  return (
    <View style={styles.itemsSection}>
      <View style={styles.copyButtonWrapper}>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
          <Feather name="copy" size={16} color="#666" />
        </TouchableOpacity>

        {/* {showCopied && (
          <View style={styles.copiedMessage}>
            <Text style={styles.copiedText}>✓ Copied!</Text>
          </View>
        )} */}
      </View>

      <TouchableOpacity
        style={styles.itemsContainer}
        onPress={() => setShowTooltip(true)}
        onLongPress={() => onViewItems && onViewItems(transaction)}
        delayLongPress={500}
      >
        <View style={styles.itemsAvatars}>
          {displayLines.map((line, idx) => (
            <View
              key={idx}
              style={[
                styles.itemIcon,
                line.itemType === 'product'
                  ? styles.productIcon
                  : styles.serviceIcon,
                { marginLeft: idx > 0 ? -8 : 0 },
              ]}
            >
              {line.itemType === 'product' ? (
                <Feather name="package" size={12} color="#0369a1" />
              ) : (
                <Feather name="tool" size={12} color="#92400e" />
              )}
            </View>
          ))}
          {remainingCount > 0 && (
            <View style={[styles.itemIcon, styles.remainingItems]}>
              <Text style={styles.remainingText}>+{remainingCount}</Text>
            </View>
          )}
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
      </TouchableOpacity>

      <TooltipContent
        visible={showTooltip}
        onClose={() => setShowTooltip(false)}
        title="Item Details"
      >
        {/* Header Totals Section - Matches Screenshot Top Bar */}
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

        {/* Items List - Matches the Rounded Card in Screenshot */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {lines.map((line, idx) => (
            <View key={idx} style={styles.screenshotItemCard}>
              {/* Item Header (Icon + Name + Badges) */}
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

// ✅ TransactionActions Component (alag component) - FIXED
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
  // console.log('TRANSACTION ACTIONS RENDERED:', transaction._id);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [mailSentDialogOpen, setMailSentDialogOpen] = useState(false);
  const [mailSentTo, setMailSentTo] = useState('');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [isCopyingId, setIsCopyingId] = useState(false);
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
      // If the whatsappConnectionService exposes an isConnected method, prefer to check it.
      const connected =
        typeof whatsappConnectionService?.isConnected === 'function'
          ? await whatsappConnectionService.isConnected()
          : false;

      // If not connected, still open the composer so user can proceed manually or see instructions.
      if (!connected) {
        setIsWhatsAppDialogOpen(true);
        return;
      }

      // Open the composer dialog when connected
      setIsWhatsAppDialogOpen(true);
    } catch (e) {
      console.error('WhatsApp send error:', e);
      // Fallback to opening composer so user can still attempt to send
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

  const handleCopyTransactionId = async () => {
    try {
      setIsCopyingId(true);
      await Clipboard.setString(transaction._id || '');
      Alert.alert('Copied', 'Transaction ID copied to clipboard');
    } catch (error) {
      console.error('Copy error:', error);
      Alert.alert('Error', 'Failed to copy transaction ID');
    } finally {
      setIsCopyingId(false);
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
      // Attempt to generate PDF using available templates (default to template1)
      let pdfBlob;
      const template = 'template1';
      switch (template) {
        case 'template1':
          pdfBlob = await generatePdfForTemplate1(
            transaction,
            transaction.company || null,
            transaction.party || null,
            serviceNameById,
          );
          break;
        case 'template2':
          pdfBlob = await generatePdfForTemplate2(
            transaction,
            transaction.company || null,
            transaction.party || null,
            serviceNameById,
          );
          break;
        // add other templates if needed
        default:
          pdfBlob = await generatePdfForTemplate1(
            transaction,
            transaction.company || null,
            transaction.party || null,
            serviceNameById,
          );
      }

      // Normalize the generator output to base64
      let pdfBase64;
      if (typeof pdfBlob === 'string') {
        pdfBase64 = pdfBlob;
      } else if (
        typeof Uint8Array !== 'undefined' &&
        pdfBlob instanceof Uint8Array
      ) {
        pdfBase64 = Buffer.from(pdfBlob).toString('base64');
      } else if (typeof Blob !== 'undefined' && pdfBlob instanceof Blob) {
        const arrayBuffer = await new Response(pdfBlob).arrayBuffer();
        pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
      } else if (pdfBlob && typeof pdfBlob === 'object' && pdfBlob.base64) {
        pdfBase64 = pdfBlob.base64;
      } else if (
        pdfBlob &&
        typeof pdfBlob === 'object' &&
        typeof pdfBlob.output === 'function'
      ) {
        try {
          pdfBase64 = await pdfBlob.output('base64');
        } catch (e) {
          // ignore and fallthrough
        }
      } else {
        pdfBase64 = pdfBlob;
      }

      if (!pdfBase64 || typeof pdfBase64 !== 'string') {
        throw new Error('Invalid PDF data generated');
      }

      const invoiceNumber =
        transaction.invoiceNumber ||
        transaction.referenceNumber ||
        transaction._id;
      const fname = `Invoice-${invoiceNumber || Date.now()}.pdf`;

      // Save to app's document directory
      const appFilePath = `${RNFS.DocumentDirectoryPath}/${fname}`;
      await RNFS.writeFile(appFilePath, pdfBase64, 'base64');

      let downloadsFilePath = '';
      let copiedToDownloads = false;

      // Try to copy to Downloads folder for easier access (best-effort)
      if (Platform.OS === 'android') {
        try {
          downloadsFilePath = `${RNFS.DownloadDirectoryPath}/${fname}`;
          await RNFS.copyFile(appFilePath, downloadsFilePath);
          copiedToDownloads = await RNFS.exists(downloadsFilePath);
        } catch (copyErr) {
          console.log(
            'Could not copy to downloads, using app storage only:',
            copyErr,
          );
          copiedToDownloads = false;
        }
      }

      const finalPath = copiedToDownloads ? downloadsFilePath : appFilePath;
      Alert.alert(
        'File Downloaded',
        'Your file has been downloaded successfully.',
      );
    } catch (error) {
      console.error('🔴 Download failed:', error);
      Alert.alert(
        'Download failed',
        error.message || 'Failed to download invoice',
      );
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

    Alert.alert(
      'Print Invoice',
      'Invoice printing functionality requires integration setup.',
      [{ text: 'OK' }],
    );
  };

  const handleConvertToSales = () => {
    if (onConvertToSales) {
      onConvertToSales(transaction);
    }
  };

  return (
    <>
      <DropdownMenu
        trigger={
          <View style={styles.moreButton}>
            <Feather name="more-horizontal" size={20} color="#666" />
          </View>
        }
      >
        <DropdownMenuLabel>Actions</DropdownMenuLabel>

        {/* 1) Send on WhatsApp */}
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

        {/* 2) Send via Email */}
        <DropdownMenuItem
          onPress={async () => {
            console.log(
              '📧 Send Email clicked - onSendInvoice:',
              !!onSendInvoice,
            );
            if (onSendInvoice) {
              try {
                await onSendInvoice(transaction);
                console.log('✅ Send invoice completed');
              } catch (err) {
                console.error('❌ Send invoice error:', err);
              }
            } else {
              console.log(
                '⚠️ onSendInvoice not provided, calling handleSendEmail',
              );
              handleSendEmail();
            }
          }}
          icon={{ type: Feather, name: 'send' }}
          disabled={!isInvoiceable || isSendingEmail || !canEmail}
        >
          {isSendingEmail ? 'Sending...' : 'Send Invoice via Email'}
        </DropdownMenuItem>

        {/* 3) Preview Invoice */}
        <DropdownMenuItem
          onPress={() => {
            if (onViewInvoicePDF) onViewInvoicePDF(transaction);
            else onPreview && onPreview(transaction);
          }}
          icon={{ type: Feather, name: 'eye' }}
          disabled={!isInvoiceable}
        >
          Preview Invoice
        </DropdownMenuItem>

        {/* 4) Download Invoice */}
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

        {/* 5) Print Invoice (fallback to internal print helper) */}
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

        {/* 6) Edit Transaction */}
        <DropdownMenuItem
          onPress={() => onEdit && onEdit(transaction)}
          icon={{ type: Feather, name: 'edit' }}
        >
          Edit transaction
        </DropdownMenuItem>

        {/* 7) Delete Transaction */}
        <DropdownMenuItem
          onPress={() => onDelete && onDelete(transaction)}
          icon={{ type: Feather, name: 'trash-2' }}
          destructive
        >
          Delete transaction
        </DropdownMenuItem>
      </DropdownMenu>

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
        // prefer real party/vendor and company objects when available
        party={
          // if the surrounding screen provided a parties list, prefer the full record
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
        // expose the whatsapp connection service and base URL to the dialog
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

// ✅ Main columns function - WEB जैसा structure
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

  // Badge Component (simple function component, no hooks)
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

  // Avatar Component (simple function component, no hooks)
  const Avatar = ({ children, size = 28, style }) => (
    <View style={[styles.avatar, { width: size, height: size }, style]}>
      <Text style={styles.avatarText}>{children}</Text>
    </View>
  );

  // ✅ Web की तरह column definitions
  const baseColumns = [];

  // SELECT COLUMN (if not hidden)
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

  // PARTY / DETAILS - Web की तरह
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

  // COMPANY - Web की तरह
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

  // LINES (ITEMS/SERVICES) - Web की तरह
  baseColumns.push({
    id: 'lines',
    header: 'Items / Services',
    cell: transaction => (
      <LinesCell
        transaction={transaction}
        serviceNameById={serviceNameById}
        onViewItems={onViewItems}
      />
    ),
    render: transaction => (
      <LinesCell
        transaction={transaction}
        serviceNameById={serviceNameById}
        onViewItems={onViewItems}
      />
    ),
    meta: {
      label: 'ITEMS / SERVICES',
      mobileLabel: 'ITEMS / SERVICES',
    },
  });

  // PAYMENT METHOD - Web की तरह
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

  // AMOUNT - Web की तरह SortableHeader
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

  // DATE - Web की तरह
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

  // TYPE - Web की तरह
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

  // Add actions column if not hidden - Web की तरह
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

// ✅ Helper function to get column labels for mobile
export const getColumnLabel = (column, defaultLabel = '') => {
  if (column.meta?.mobileLabel) return column.meta.mobileLabel;
  if (column.meta?.label) return column.meta.label;
  if (typeof column.header === 'string') return column.header;
  return column.id?.toUpperCase() || defaultLabel;
};

// ✅ Helper function to get column content
export const getColumnValue = (column, item) => {
  if (column.cell && typeof column.cell === 'function') {
    return column.cell(item);
  }
  if (column.render && typeof column.render === 'function') {
    return column.render(item);
  }
  return item[column.id] || '';
};

// Lightweight hook-compatible helper for React Native screens
// Returns the columns and several renderer stubs expected by screens.
export const useColumns = options => {
  const cols = columns(options || {});

  // The screen expects these render helpers to be callable in JSX.
  // Provide minimal no-op implementations so consumers can opt-in later.
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
  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  typeSales: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  typePurchases: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  typeProforma: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  typeReceipt: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  typePayment: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  typeJournal: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },

  // Avatar
  avatar: {
    borderRadius: 16,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
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

  // Party Info
  partyInfo: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    // gap: 4,
    marginTop: -6,
  },
  partyMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  partyText: {
    alignItems: 'flex-end',
  },
  partyName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    textAlign: 'right',
  },
  description: {
    fontSize: 12,
    color: '#6c757d',
    paddingLeft: 36, // Avatar width (28) + gap (8)
  },

  // Company
  companySection: {
    flexDirection: 'row-reverse',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  companyText: {
    fontSize: 12,
    color: '#495057',
    textAlign: 'right', // Text right align
    marginRight: 4, // Left ki jagah right margin
    flex: 0,
  },

  // Items
  itemsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // Content ko right mein rakhega
    width: '100%',
  },

  copyButtonWrapper: {
    position: 'relative',
  },
  copyButton: {
    padding: 4,
  },
  itemsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  itemsAvatars: {
    flexDirection: 'row',
    marginLeft: 8,
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
    alignItems: 'flex-end',
  },
  itemsText: {
    fontSize: 12,
    color: '#495057',
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
    color: '#10b981', // Emerald green from screenshot
  },

  // Amount
  amountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
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

  // Date
  dateText: {
    fontSize: 12,
    color: '#6c757d',
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
    padding: 8,
    borderRadius: 4,
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

// ✅ Export functions like web
export default {
  makeCustomFilterFn,
  printInvoice,
  columns,
  getColumnLabel,
  getColumnValue,
};
