import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  mockTransactions,
  mockCompanies,
  Company,
  Party,
} from '../../lib/types.js';
import {
  getUnifiedLines,
  serviceNameById,
  formatCurrency,
  formatDate,
} from '../../lib/utils.js';
import Avatar from '../../lib/avatar.js';
import { generatePdfForTemplate1 } from '../../lib/pdfTemplates.js';

// Icons using react-native-vector-icons
const Icons = {
  ArrowUpDown: 'swap-vertical',
  Download: 'download',
  MoreHorizontal: 'dots-horizontal',
  Copy: 'content-copy',
  Edit: 'pencil',
  Trash2: 'trash-can-outline',
  Building: 'office-building',
  Package: 'package-variant',
  Eye: 'eye-outline',
  Server: 'server',
  Send: 'send',
  WhatsApp: 'whatsapp',
};

// Enhanced DropdownMenu with better positioning and responsiveness
const DropdownMenu = ({ trigger, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState(null);

  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;

  // Get trigger position for dropdown
  const handleTriggerLayout = event => {
    setTriggerLayout(event.nativeEvent.layout);
  };

  const handleTriggerPress = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Calculate dropdown position
  let dropdownStyle = {};
  const dropdownWidth = screenWidth < 500 ? 300 : 380;
const dropdownMaxHeight = screenHeight < 700 ? 320 : 420;

  if (triggerLayout) {
    // Default below the trigger
    dropdownStyle.top = triggerLayout.y + triggerLayout.height + 2;
    dropdownStyle.left = Math.min(
      triggerLayout.x,
      screenWidth - dropdownWidth - 8
    );
    // If dropdown goes below screen, show above
    if (dropdownStyle.top + dropdownMaxHeight > screenHeight) {
      dropdownStyle.top = Math.max(triggerLayout.y - dropdownMaxHeight, 8);
    }
  }

  return (
    <View style={styles.dropdownWrapper}>
      <View onLayout={handleTriggerLayout}>
        <TouchableOpacity
          onPress={handleTriggerPress}
          style={styles.dropdownTrigger}
        >
          {trigger}
        </TouchableOpacity>
      </View>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.dropdownModalBackdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={[
          styles.dropdownModalContent,
          {
            ...dropdownStyle,
            minWidth: dropdownWidth,
            maxHeight: dropdownMaxHeight,
          }
        ]}>
          <ScrollView
            style={{ maxHeight: dropdownMaxHeight }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const DropdownMenuItem = ({ onPress, children, disabled, style }) => {
  const handlePress = e => {
    e.stopPropagation && e.stopPropagation();
    if (onPress && !disabled) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.menuItem, disabled && styles.menuItemDisabled, style]}
      onPress={handlePress}
      disabled={disabled}
    >
      {children}
    </TouchableOpacity>
  );
};

const DropdownMenuLabel = ({ children }) => (
  <View style={styles.menuLabel}>
    <Text style={styles.menuLabelText}>{children}</Text>
  </View>
);

const DropdownMenuSeparator = () => <View style={styles.menuSeparator} />;

const Badge = ({ children, variant = 'secondary', style }) => {
  const badgeStyles = {
    default: styles.badgeDefault,
    secondary: styles.badgeSecondary,
    success: styles.badgeSuccess,
    warning: styles.badgeWarning,
    danger: styles.badgeDanger,
    info: styles.badgeInfo,
  };

  return (
    <View style={[styles.badge, badgeStyles[variant], style]}>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
};

const Checkbox = ({ checked, onPress, style }) => {
  return (
    <TouchableOpacity
      style={[styles.checkbox, checked && styles.checkboxChecked, style]}
      onPress={onPress}
    >
      {checked && <Icon name="check" size={14} color="white" />}
    </TouchableOpacity>
  );
};

const Tooltip = ({ content, children }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  return (
    <View style={styles.tooltipWrapper}>
      <TouchableOpacity
        onPressIn={() => setShowTooltip(true)}
        onPressOut={() => setShowTooltip(false)}
        style={styles.tooltipTrigger}
      >
        {children}
      </TouchableOpacity>
      {showTooltip && (
        <View style={styles.tooltip}>
          {content}
        </View>
      )}
    </View>
  );
};

// Custom filter function
const makeCustomFilterFn = serviceNameById => {
  return (row, filterValue) => {
    if (!filterValue) return true;

    const tx = row;
    const q = String(filterValue).toLowerCase();

    // party / vendor
    let partyName = '';
    const pv = tx.party || tx.vendor;
    if (pv && typeof pv === 'object') {
      partyName = pv.name || pv.vendorName || '';
    }

    const desc = (tx.description || tx.narration || '').toLowerCase();

    // lines (products/services)
    const lines = getUnifiedLines(tx, serviceNameById);
    const matchLine = lines.some(l => (l.name || '').toLowerCase().includes(q));

    return partyName.toLowerCase().includes(q) || desc.includes(q) || matchLine;
  };
};

export const columns = ({
  onPreview,
  onViewItems,
  onEdit,
  onDelete,
  onSendWhatsApp,
  companyMap = mockCompanies,
  serviceNameById,
  hideActions = false,
  
}) => {
  const customFilterFn = makeCustomFilterFn(serviceNameById);

  const baseColumns = [
    // PARTY / DETAILS
    {
      accessorKey: 'party',
      header: 'Party / Details',
      filterFn: customFilterFn,
      cell: row => {
        const transaction = row.original;

        if (transaction.type === 'journal') {
          return (
            <View style={styles.cellContainer}>
              <Avatar style={styles.journalAvatar}>
                <Icon name="book-edit-outline" size={16} color="white" />
              </Avatar>
              <View style={styles.cellTextContainer}>
                <Text style={styles.cellPrimary}>Journal Entry</Text>
                <Text style={styles.cellSecondary}>
                  {transaction.debitAccount} / {transaction.creditAccount}
                </Text>
              </View>
            </View>
          );
        }

        const partyOrVendor = transaction.party || transaction.vendor;
        let partyName = 'N/A';
        if (partyOrVendor && typeof partyOrVendor === 'object') {
          partyName = partyOrVendor.name || partyOrVendor.vendorName || 'N/A';
        }

        return (
          <View style={styles.cellContainer}>
            <Avatar style={styles.partyAvatar}>
              <Text style={styles.avatarText}>
                {partyName.substring(0, 2).toUpperCase()}
              </Text>
            </Avatar>
            <View style={styles.cellTextContainer}>
              <Text style={styles.cellPrimary}>{partyName}</Text>
              <Text style={styles.cellSecondary} numberOfLines={1}>
                {transaction.description || transaction.narration || ''}
              </Text>
            </View>
          </View>
        );
      },
      flex: 2,
    },

    // COMPANY
    {
      accessorKey: 'company',
      header: 'Company',
      cell: row => {
        const company = row.original.company;
        const companyId =
          typeof company === 'object' && company ? company._id : company;
        const companyName = companyId ? companyMap.get(companyId) : 'N/A';

        return (
          <View style={styles.companyCell}>
            <Icon name={Icons.Building} size={18} color="#6b7280" />
            <Text style={styles.cellPrimary} numberOfLines={1}>
              {companyName}
            </Text>
          </View>
        );
      },
      flex: 1,
    },

    // LINES (ITEMS/SERVICES)
    {
      id: 'lines',
      header: 'Items / Services',
      cell: row => {
        const tx = row.original;
        const lines = getUnifiedLines(tx, serviceNameById);

        if (!lines.length) {
          return <Text style={styles.noItemsText}>-</Text>;
        }

        const MAX_DISPLAY = 2;
        const displayLines = lines.slice(0, MAX_DISPLAY);
        const remainingCount = lines.length - MAX_DISPLAY;

        const fullList = (
          <View style={styles.tooltipContent}>
            {lines.map((l, idx) => (
              <View key={idx} style={styles.lineItem}>
                <Icon
                  name={l.type === 'product' ? Icons.Package : Icons.Server}
                  size={16}
                  color="#6b7280"
                />
                <View style={styles.lineDetails}>
                  <Text style={styles.lineName}>{l.name}</Text>
                  {l.type === 'product' && (
                    <Text style={styles.lineMeta}>
                      {l.quantity}
                      {l.unitType ? ` ${l.unitType}` : ''}
                      {l.pricePerUnit ? ` @ ${l.pricePerUnit}` : ''}
                    </Text>
                  )}
                  {l.type === 'service' && l.description && (
                    <Text style={styles.lineMeta} numberOfLines={2}>
                      {l.description}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        );

        return (
          <Tooltip content={fullList}>
            <TouchableOpacity
              style={styles.linesContainer}
              onPress={() => onViewItems(row.original)}
            >
              <View style={styles.avatarStack}>
                {displayLines.map((l, idx) => (
                  <Avatar
                    key={idx}
                    size={32}
                    style={[
                      styles.stackedAvatar,
                      idx > 0 && styles.stackedAvatarOverlap,
                    ]}
                  >
                    <Icon
                      name={l.type === 'product' ? Icons.Package : Icons.Server}
                      size={14}
                      color="#6b7280"
                    />
                  </Avatar>
                ))}
                {remainingCount > 0 && (
                  <Avatar
                    size={32}
                    style={[
                      styles.stackedAvatar,
                      styles.moreAvatar,
                      styles.stackedAvatarOverlap,
                    ]}
                  >
                    <Text style={styles.moreAvatarText}>+{remainingCount}</Text>
                  </Avatar>
                )}
              </View>
            </TouchableOpacity>
          </Tooltip>
        );
      },
      flex: 1,
    },

    // AMOUNT
    {
      accessorKey: 'totalAmount',
      header: 'Amount',
      cell: row => {
        const amount = parseFloat(
          String(row.original.totalAmount || row.original.amount || 0),
        );
        return (
          <View style={styles.amountCell}>
            <Text style={styles.amountText}>{formatCurrency(amount)}</Text>
          </View>
        );
      },
      flex: 1,
    },

    // DATE
    {
      accessorKey: 'date',
      header: 'Date',
      cell: row => (
        <View style={styles.dateCell}>
          <Text style={styles.cellPrimary}>
            {formatDate(row.original.date)}
          </Text>
        </View>
      ),
      flex: 1,
    },

    // TYPE
    {
      accessorKey: 'type',
      header: 'Type',
      cell: row => {
        const type = row.original.type;
        const typeStyles = {
          sales: styles.typeSales,
          purchases: styles.typePurchases,
          receipt: styles.typeReceipt,
          payment: styles.typePayment,
          journal: styles.typeJournal,
        };

        const typeIcons = {
          sales: 'sale',
          purchases: 'cart',
          receipt: 'receipt',
          payment: 'cash',
          journal: 'book-edit',
        };

        return (
          <View style={styles.typeCell}>
            <Badge style={[styles.typeBadge, typeStyles[type]]}>
              <View style={styles.badgeContent}>
                <Icon name={typeIcons[type]} size={12} color="#1f2937" />
                <Text style={styles.badgeText}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </View>
            </Badge>
          </View>
        );
      },
      flex: 1,
    },
  ];

  // ACTIONS COLUMN
  if (!hideActions) {
    baseColumns.push({
      id: 'actions',
      cell: row => {
        const transaction = row.original;
        const isInvoiceable = transaction.type === 'sales';
        const isJournal = transaction.type === 'journal';
        const canSendWhatsApp = !isJournal; // WhatsApp not supported for journal

        const buildCompany = () => {
          const c = transaction.company;
          const companyId = typeof c === 'object' && c ? c._id : c;
          const companyName = companyId ? companyMap.get(companyId) : undefined;
          return companyName ? { businessName: companyName } : undefined;
        };

        const buildParty = () => {
          const pv = transaction.party || transaction.vendor;
          return pv && typeof pv === 'object' ? pv : undefined;
        };

        const handleDownload = () => {
          generatePdfForTemplate1(
            transaction,
            buildCompany(),
            buildParty(),
            serviceNameById,
          );
        };

        const handleCopyId = () => {
          Alert.alert('Copied', `Transaction ID: ${transaction._id}`);
        };

        const handleSendWhatsApp = () => {
          if (onSendWhatsApp) {
            onSendWhatsApp(transaction);
          } else {
            Alert.alert('WhatsApp', 'Send invoice via WhatsApp functionality');
          }
        };

        return (
          <View style={styles.actionsCell}>
            <DropdownMenu
              trigger={
                <View style={styles.actionButton}>
                  <Icon name={Icons.MoreHorizontal} size={20} color="#64748b" />
                </View>
              }
            >
              <DropdownMenuLabel>Actions</DropdownMenuLabel>

              {/* 1. Send on WhatsApp (journal not support) */}
              <DropdownMenuItem
                onPress={handleSendWhatsApp}
                disabled={!canSendWhatsApp}
              >
                <View style={styles.menuItemContent}>
                  <Icon
                    name={Icons.WhatsApp}
                    size={18}
                    color={!canSendWhatsApp ? '#94a3b8' : '#25D366'}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      !canSendWhatsApp && styles.menuItemTextDisabled,
                    ]}
                  >
                    Send on WhatsApp
                    {!canSendWhatsApp && ' (Not for Journal)'}
                  </Text>
                </View>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* 2. Copy Transaction ID */}
              <DropdownMenuItem onPress={handleCopyId}>
                <View style={styles.menuItemContent}>
                  <Icon name={Icons.Copy} size={18} color="#334155" />
                  <Text style={styles.menuItemText}>Copy Transaction ID</Text>
                </View>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* 3. Preview Invoice (sales only) */}
              <DropdownMenuItem
                onPress={() => onPreview(transaction)}
                disabled={!isInvoiceable}
              >
                <View style={styles.menuItemContent}>
                  <Icon
                    name={Icons.Eye}
                    size={18}
                    color={!isInvoiceable ? '#94a3b8' : '#334155'}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      !isInvoiceable && styles.menuItemTextDisabled,
                    ]}
                  >
                    Preview Invoice
                    {!isInvoiceable && ' (Sales Only)'}
                  </Text>
                </View>
              </DropdownMenuItem>

              {/* 4. Download Invoice (sales only) */}
              <DropdownMenuItem
                onPress={handleDownload}
                disabled={!isInvoiceable}
              >
                <View style={styles.menuItemContent}>
                  <Icon
                    name={Icons.Download}
                    size={18}
                    color={!isInvoiceable ? '#94a3b8' : '#334155'}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      !isInvoiceable && styles.menuItemTextDisabled,
                    ]}
                  >
                    Download Invoice
                    {!isInvoiceable && ' (Sales Only)'}
                  </Text>
                </View>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* 5. Edit Transaction */}
              <DropdownMenuItem onPress={() => onEdit(transaction)}>
                <View style={styles.menuItemContent}>
                  <Icon name={Icons.Edit} size={18} color="#334155" />
                  <Text style={styles.menuItemText}>Edit Transaction</Text>
                </View>
              </DropdownMenuItem>

              {/* 6. Delete Transaction */}
              <DropdownMenuItem
                onPress={() => onDelete(transaction)}
                style={styles.deleteMenuItem}
              >
                <View style={styles.menuItemContent}>
                  <Icon name={Icons.Trash2} size={18} color="#dc2626" />
                  <Text style={[styles.menuItemText, styles.deleteMenuText]}>
                    Delete Transaction
                  </Text>
                </View>
              </DropdownMenuItem>
            </DropdownMenu>
          </View>
        );
      },
      width: 60,
    });
  }

  return baseColumns;
};

const styles = StyleSheet.create({
  // Dropdown styles
  dropdownWrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownTrigger: {},
  dropdownModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1001,
  },
  dropdownModalContent: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 1002,
    overflow: 'hidden',
  },

  // Menu styles
  menuLabel: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  menuLabelText: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: 14,
  },
  menuItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 14,
    color: '#334155',
    marginLeft: 12,
    flex: 1,
  },
  menuItemTextDisabled: {
    color: '#94a3b8',
  },
  menuSeparator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  deleteMenuItem: {
    backgroundColor: '#fef2f2',
  },
  deleteMenuText: {
    color: '#dc2626',
  },

  // Cell container styles
  cellContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    flex: 1,
  },
  cellTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  cellPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  cellSecondary: {
    fontSize: 12,
    color: '#6b7280',
  },

  // Company cell
  companyCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    flex: 1,
  },

  // Badge Styles
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    color: '#1f2937',
  },
  badgeDefault: {
    backgroundColor: '#3b82f6',
  },
  badgeSecondary: {
    backgroundColor: '#6b7280',
  },
  badgeSuccess: {
    backgroundColor: '#10b981',
  },
  badgeWarning: {
    backgroundColor: '#f59e0b',
  },
  badgeDanger: {
    backgroundColor: '#ef4444',
  },
  badgeInfo: {
    backgroundColor: '#8b5cf6',
  },

  // Avatar Styles
  journalAvatar: {
    backgroundColor: '#8b5cf6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partyAvatar: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Lines/Items Styles
  linesContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flex: 1,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  stackedAvatarOverlap: {
    marginLeft: -8,
  },
  moreAvatar: {
    backgroundColor: '#d1d5db',
  },
  moreAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  noItemsText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },

  // Amount Cell
  amountCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flex: 1,
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'right',
  },

  // Date Cell
  dateCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flex: 1,
    justifyContent: 'center',
  },

  // Type Cell
  typeCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flex: 1,
    justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Type Specific Styles
  typeSales: {
    backgroundColor: '#d1fae5',
  },
  typePurchases: {
    backgroundColor: '#fed7aa',
  },
  typeReceipt: {
    backgroundColor: '#dbeafe',
  },
  typePayment: {
    backgroundColor: '#fecaca',
  },
  typeJournal: {
    backgroundColor: '#e9d5ff',
  },

  // Actions Cell
  actionsCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Checkbox Styles
  headerCheckbox: {
    marginLeft: 16,
  },
  cellCheckbox: {
    marginLeft: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },

  // Tooltip Styles
  tooltipWrapper: {
    position: 'relative',
  },
  tooltipTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tooltipContent: {
    backgroundColor: 'transparent',
  },

  // Line Item in Tooltip
  lineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
  },
  lineDetails: {
    marginLeft: 8,
    flex: 1,
  },
  lineName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  lineMeta: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 14,
  },
});

export default columns;