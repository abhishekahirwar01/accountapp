import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Modal,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Receipt,
  Package,
  Briefcase,
  ArrowRight,
  TrendingUp,
  CreditCard,
  BookOpen,
  ShoppingCart,
  X,
  ChevronRight,
} from 'lucide-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Path,
  G,
  Circle,
  Text as SvgText,
} from 'react-native-svg';

/* ─── helpers ─── */
const inr = n => {
  const number = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${number.toLocaleString('en-IN')}`;
};

const safeDate = d => {
  const t = d ? new Date(d) : null;
  if (!t || isNaN(t.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(t);
};



const capitalizeWords = str => {
  if (!str) return '';
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

const getAmount = tx => {
  switch (tx.type) {
    case 'sales':
      return Number(tx?.amount ?? tx?.totalAmount ?? 0);
    case 'purchases':
      return Number(tx?.totalAmount ?? tx?.amount ?? 0);
    default:
      return Number(tx?.amount ?? tx?.totalAmount ?? 0);
  }
};

const getItems = (tx, svcMap) => {
  const productsArr = Array.isArray(tx?.products) ? tx.products : [];
  const servicesArr = Array.isArray(tx?.services)
    ? tx.services
    : Array.isArray(tx?.service)
    ? tx.service
    : tx?.service
    ? [tx.service]
    : [];

  const normalized = [];

  for (const p of productsArr) {
    const name =
      (typeof p.product === 'object' && (p.product?.name || p.product?.productName)) ||
      (typeof tx.product === 'object' && (tx.product?.name || tx.product?.productName)) ||
      '(product)';
    normalized.push({
      itemType: 'product',
      name: capitalizeWords(name),
      quantity: p?.quantity ?? '',
      pricePerUnit: Number(p?.pricePerUnit ?? 0),
      amount: Number(p?.amount ?? 0),
      description: '',
    });
  }

  for (const s of servicesArr) {
    const ref = s?.serviceName ?? s?.service;
    let sName = '(service)';
    if (ref && typeof ref === 'object') {
      sName = ref.serviceName || ref.name || (ref._id ? svcMap?.get(String(ref._id)) : '') || '(service)';
    } else if (typeof ref === 'string') {
      sName = svcMap?.get(String(ref)) || '(service)';
    }
    normalized.push({
      itemType: 'service',
      name: capitalizeWords(sName),
      quantity: '',
      pricePerUnit: 0,
      amount: Number(s?.amount ?? 0),
      description: s?.description || '',
    });
  }

  if (normalized.length === 0) return { label: null, icon: 'none', items: [] };
  const first = normalized[0];
  const extra = normalized.length - 1;
  const label = extra > 0 ? `${first.name} +${extra} more` : first.name;
  return { label, icon: first.itemType, items: normalized };
};

const getPartyName = tx => {
  if (tx.type === 'journal') return 'Journal Entry';
  let partyName = '';
  if (tx.party && typeof tx.party === 'object') partyName = tx.party.name || 'Party';
  else if (tx.vendor && typeof tx.vendor === 'object') partyName = tx.vendor.vendorName || 'Vendor';
  return capitalizeWords(partyName);
};

/* ─── Type config ─── */
const TYPE_CONFIG = {
  sales: {
    label: 'Sales',
    bg: '#f0fdf4',
    color: '#16a34a',
    border: '#bbf7d0',
    dotColor: '#22c55e',
    Icon: TrendingUp,
    iconBg: '#dcfce7',
    iconColor: '#16a34a',
    amountSign: 'credit',
  },
  purchases: {
    label: 'Purchase',
    bg: '#fef2f2',
    color: '#dc2626',
    border: '#fecaca',
    dotColor: '#ef4444',
    Icon: ShoppingCart,
    iconBg: '#fee2e2',
    iconColor: '#dc2626',
    amountSign: 'debit',
  },
  receipt: {
    label: 'Receipt',
    bg: '#eff6ff',
    color: '#2563eb',
    border: '#bfdbfe',
    dotColor: '#3b82f6',
    Icon: CreditCard,
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    amountSign: 'credit',
  },
  payment: {
    label: 'Payment',
    bg: '#fefce8',
    color: '#ca8a04',
    border: '#fde68a',
    dotColor: '#eab308',
    Icon: CreditCard,
    iconBg: '#fef9c3',
    iconColor: '#ca8a04',
    amountSign: 'debit',
  },
  journal: {
    label: 'Journal',
    bg: '#f5f3ff',
    color: '#7c3aed',
    border: '#ddd6fe',
    dotColor: '#8b5cf6',
    Icon: BookOpen,
    iconBg: '#ede9fe',
    iconColor: '#7c3aed',
    amountSign: 'neutral',
  },
};

const getTypeConfig = type =>
  TYPE_CONFIG[type] || {
    label: type || 'Other',
    bg: '#f9fafb',
    color: '#6b7280',
    border: '#e5e7eb',
    dotColor: '#9ca3af',
    Icon: Receipt,
    iconBg: '#f3f4f6',
    iconColor: '#6b7280',
    amountSign: 'neutral',
  };


const GRAPH_LABELS = ['04:00', '09:00', '01:00', '06:00', '10:00', '15:00', '20:00'];

const TransactionsTopGraph = () => {
  const graphWidth = 340;
  const graphHeight = 180;
  const baselineY = 76; // Moved baseline slightly lower
  const labelY = 140; // Adjusted label position

const areaPath = [
  `M 0 ${baselineY}`, 
  `C 20 ${baselineY - 20}, 35 ${baselineY + 20}, 50 ${baselineY}`,
  `C 65 ${baselineY - 25}, 80 ${baselineY - 50}, 95 ${baselineY - 40}`,
  `C 110 ${baselineY + 30}, 125 ${baselineY + 45}, 140 ${baselineY + 30}`,
  `C 155 ${baselineY - 60}, 170 ${baselineY - 80}, 185 ${baselineY - 60}`,
  `C 200 ${baselineY - 40}, 215 ${baselineY - 20}, 230 ${baselineY - 30}`,
  `C 245 ${baselineY - 50}, 260 ${baselineY - 70}, 275 ${baselineY - 60}`,
  `C 290 ${baselineY - 30}, 305 ${baselineY - 15}, ${graphWidth} ${baselineY}`,
  `L ${graphWidth} ${graphHeight}`,
  `L 0 ${graphHeight}`,
  'Z',
].join(' ');

// Apply the same adjustments to the linePath for the stroke
const linePath = [
  `M 0 ${baselineY}`,
  `C 20 ${baselineY - 20}, 35 ${baselineY + 20}, 50 ${baselineY}`,
  `C 65 ${baselineY - 25}, 80 ${baselineY - 50}, 95 ${baselineY - 40}`,
  `C 110 ${baselineY + 30}, 125 ${baselineY + 45}, 140 ${baselineY + 30}`,
  `C 155 ${baselineY - 60}, 170 ${baselineY - 80}, 185 ${baselineY - 60}`,
  `C 200 ${baselineY - 40}, 215 ${baselineY - 20}, 230 ${baselineY - 30}`,
  `C 245 ${baselineY - 50}, 260 ${baselineY - 70}, 275 ${baselineY - 60}`,
  `C 290 ${baselineY - 30}, 305 ${baselineY - 15}, ${graphWidth} ${baselineY}`,
].join(' ');

  return (
    <View style={styles.topGraphWrap}>
      <Svg width="100%" height={graphHeight} viewBox={`0 0 ${graphWidth} ${graphHeight}`} preserveAspectRatio="none">
        <Defs>
          {/* Background gradient */}
          <SvgLinearGradient id="topGraphBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="100%" stopColor="#ffffff" />
          </SvgLinearGradient>
          
          {/* Wave fill gradient */}
          <SvgLinearGradient id="topGraphWave" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#4299e1" stopOpacity="0.3" />
            <Stop offset="70%" stopColor="#4299e1" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#4299e1" stopOpacity="0.05" />
          </SvgLinearGradient>
          
          {/* Wave stroke gradient */}
          <SvgLinearGradient id="topGraphStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#83bfd7" />
            <Stop offset="50%" stopColor="#71d7ff" />
            <Stop offset="100%" stopColor="#83bfd7" />
          </SvgLinearGradient>
        </Defs>

        {/* Background */}
        <Path d={`M 0 0 H ${graphWidth} V ${graphHeight} H 0 Z`} fill="url(#topGraphBg)" />
        
        {/* Filled area under the wave */}
        <Path d={areaPath} fill="url(#topGraphWave)" />
        
        {/* Wave line on top */}
        <Path 
          d={linePath} 
          fill="none" 
          stroke="url(#topGraphStroke)" 
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Date labels */}
        {GRAPH_LABELS.map((label, index) => {
          const padding = 5; // or whatever value you want
const x = padding + ((graphWidth - (padding * 2)) / (GRAPH_LABELS.length - 1)) * index;
          return (
            <SvgText
              key={label}
              x={x}
              y={labelY}
              fontSize="10"
              fill={index < 3 ? '#4a5568' : '#718096'}
              fontWeight="500"
              textAnchor={index === 0 ? 'start' : index === GRAPH_LABELS.length - 1 ? 'end' : 'middle'}
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

/* ─── Transaction Row (mobile card) ─── */
const TransactionCard = ({ tx, serviceNameById, onItemsPress }) => {
  const cfg = getTypeConfig(tx.type);
  const TxIcon = cfg.Icon;
  const item = getItems(tx, serviceNameById);
  const amt = getAmount(tx);
  const partyName = getPartyName(tx);
  const description = tx.description || tx.narration;
  const clickable = item.items.length > 0;
  const isDebit = cfg.amountSign === 'debit';
  const isCredit = cfg.amountSign === 'credit';

  return (
    <TouchableOpacity
      activeOpacity={clickable ? 0.75 : 1}
      onPress={() => clickable && onItemsPress(tx, item.items)}
      style={styles.txCard}
    >
      {/* Left: icon */}
      <View style={[styles.txIconWrap, { backgroundColor: cfg.iconBg }]}>
        <TxIcon size={16} color={cfg.iconColor} strokeWidth={1.8} />
      </View>

      {/* Center: party + item + date */}
      <View style={styles.txBody}>
        <Text style={styles.txParty} numberOfLines={1}>
          {partyName || cfg.label}
        </Text>

        {item.label ? (
          <View style={styles.txItemRow}>
            {item.icon === 'product' ? (
              <Package size={12} color="#94a3b8" strokeWidth={1.5} />
            ) : item.icon === 'service' ? (
              <Briefcase size={12} color="#94a3b8" strokeWidth={1.5} />
            ) : null}
            <Text style={[styles.txItemText, clickable && styles.txItemClickable]} numberOfLines={1}>
              {item.label}
            </Text>
            {clickable && <ChevronRight size={12} color="#3b82f6" strokeWidth={2} />}
          </View>
        ) : description ? (
          <Text style={styles.txDesc} numberOfLines={1}>{description}</Text>
        ) : null}

        <Text style={styles.txDate}>{safeDate(tx.date)}</Text>
      </View>

      {/* Right: badge on top, amount below */}
      <View style={styles.txAmountCol}>
        <Text style={[
          styles.txAmount,
          isCredit ? styles.amtCredit : isDebit ? styles.amtDebit : styles.amtNeutral,
        ]}>
          {isCredit ? '+' : isDebit ? '−' : ''}{inr(Math.abs(amt))}
        </Text>
        <View style={[styles.txBadge]}>
          <View style={[styles.txBadgeDot, { backgroundColor: cfg.dotColor }]} />
          <Text style={[styles.txBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        
      </View>
    </TouchableOpacity>
  );
};

/* ─── Desktop Table Row ─── */
const TableRow = ({ tx, serviceNameById, onItemsPress, isLast }) => {
  const cfg = getTypeConfig(tx.type);
  const TxIcon = cfg.Icon;
  const item = getItems(tx, serviceNameById);
  const amt = getAmount(tx);
  const partyName = getPartyName(tx);
  const description = tx.description || tx.narration;
  const clickable = item.items.length > 0;
  const isDebit = cfg.amountSign === 'debit';
  const isCredit = cfg.amountSign === 'credit';

  return (
    <View style={[styles.deskRow, !isLast && styles.deskRowBorder]}>
      {/* Icon + Party */}
      <View style={[styles.deskCell, { flex: 2.8 }]}>
        <View style={[styles.deskIconWrap, { backgroundColor: cfg.iconBg }]}>
          <TxIcon size={14} color={cfg.iconColor} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.deskParty} numberOfLines={1}>{partyName || cfg.label}</Text>
          {description ? <Text style={styles.deskDesc} numberOfLines={1}>{description}</Text> : null}
        </View>
      </View>

      {/* Item */}
      <View style={[styles.deskCell, { flex: 2 }]}>
        {item.label ? (
          <TouchableOpacity
            disabled={!clickable}
            onPress={() => clickable && onItemsPress(tx, item.items)}
            style={[styles.deskItemBtn, clickable && styles.deskItemBtnClickable]}
            activeOpacity={0.7}
          >
            {item.icon === 'product' ? (
              <Package size={13} color={clickable ? '#3b82f6' : '#94a3b8'} strokeWidth={1.5} />
            ) : (
              <Briefcase size={13} color={clickable ? '#3b82f6' : '#94a3b8'} strokeWidth={1.5} />
            )}
            <Text style={[styles.deskItemText, clickable && styles.deskItemClickable]} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.deskNone}>—</Text>
        )}
      </View>

      {/* Type */}
      <View style={[styles.deskCell, { flex: 1.2 }]}>
        <View style={[styles.txBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
          <View style={[styles.txBadgeDot, { backgroundColor: cfg.dotColor }]} />
          <Text style={[styles.txBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Date */}
      <View style={[styles.deskCell, { flex: 1.2 }]}>
        <Text style={styles.deskDate}>{safeDate(tx.date)}</Text>
      </View>

      {/* Amount */}
      <View style={[styles.deskCell, styles.deskAmountCell, { flex: 1.2 }]}>
        <Text style={[
          styles.deskAmount,
          isCredit ? styles.amtCredit : isDebit ? styles.amtDebit : styles.amtNeutral,
        ]}>
          {isCredit ? '+' : isDebit ? '−' : ''}{inr(Math.abs(amt))}
        </Text>
      </View>
    </View>
  );
};

/* ─── Items Dialog ─── */
const ItemsDialog = ({ visible, title, items, onClose }) => {
  const renderItem = (li, index) => {
    const isService = li.itemType === 'service';
    return (
      <View style={styles.dlgItem} key={`${li.name}-${index}`}>
        <View style={[styles.dlgItemIcon, { backgroundColor: isService ? '#ede9fe' : '#dbeafe' }]}>
          {isService
            ? <Briefcase size={16} color="#7c3aed" strokeWidth={1.5} />
            : <Package size={16} color="#2563eb" strokeWidth={1.5} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.dlgItemTop}>
            <Text style={styles.dlgItemName} numberOfLines={2}>{li.name}</Text>
            <Text style={styles.dlgItemTotal}>{inr(li.amount)}</Text>
          </View>
          {isService && li.description ? (
            <Text style={styles.dlgItemDesc} numberOfLines={2}>{li.description}</Text>
          ) : null}
          {!isService && (
            <View style={styles.dlgItemMeta}>
              {li.quantity ? <Text style={styles.dlgMetaText}>Qty: {li.quantity}</Text> : null}
              {li.pricePerUnit > 0 ? <Text style={styles.dlgMetaText}>@ {inr(li.pricePerUnit)}</Text> : null}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.dlgOverlay}>
        <View style={styles.dlgSheet}>
          {/* Handle */}
          <View style={styles.dlgHandle} />

          {/* Header */}
          <View style={styles.dlgHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dlgTitle}>Item Details</Text>
              <Text style={styles.dlgSubtitle} numberOfLines={1}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.dlgClose} activeOpacity={0.7}>
              <X size={18} color="#475569" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Items */}
          <ScrollView style={styles.dlgBody} showsVerticalScrollIndicator={false}>
            <View style={{ padding: 16, gap: 10 }}>
              {items.map((li, idx) => renderItem(li, idx))}
            </View>
          </ScrollView>

          {/* Footer */}
          {/* <View style={styles.dlgFooter}>
            <TouchableOpacity onPress={onClose} style={styles.dlgCloseBtn} activeOpacity={0.8}>
              <Text style={styles.dlgCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View> */}
        </View>
      </View>
    </Modal>
  );
};

/* ─── Empty state ─── */
const EmptyState = () => (
  <View style={styles.emptyWrap}>
    <View style={styles.emptyIcon}>
      <Receipt size={28} color="#94a3b8" strokeWidth={1.5} />
    </View>
    <Text style={styles.emptyTitle}>No transactions yet</Text>
    <Text style={styles.emptyText}>Your recent transactions will appear here</Text>
  </View>
);

/* ─── Main Component ─── */
const RecentTransactions = ({
  transactions,
  serviceNameById,
  onRefresh,
  refreshing = false,
}) => {
  const [isItemsOpen, setIsItemsOpen] = useState(false);
  const [dialogItems, setDialogItems] = useState([]);
  const [dialogTitle, setDialogTitle] = useState('');
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const openItemsDialog = (tx, items) => {
    if (items.length === 0) return;
    setDialogItems(items);
    const party = getPartyName(tx);
    const date = safeDate(tx?.date);
    setDialogTitle(party ? `${party} · ${date}` : date);
    setIsItemsOpen(true);
  };

  const hasTransactions = transactions?.length > 0;

  return (
    <View style={styles.root}>
      <View style={styles.card}>

        {/* ── Card Header ── */}
        <View style={[styles.cardHead, isMobile && hasTransactions && styles.cardHeadWithGraph]}>
          <View>
            <Text style={styles.cardTitle}>Recent Transactions</Text>
          </View>
          {/* ── button ── */}
        {hasTransactions && (
          <View style={styles.cardFoot}>
            {/* <TouchableOpacity
              onPress={() => navigation.navigate('Transactions')}
              style={styles.footBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.footBtnText}>See All</Text>
              <ArrowRight size={15}  />
            </TouchableOpacity> */}

             <TouchableOpacity
          style={styles.footBtn}
         onPress={() => navigation.navigate('Transactions')}
          activeOpacity={0.8}
        >
           <Text style={styles.footBtnText}>See All</Text>
          <Icon name="arrow-right" size={18} color="#ffffff" />
        </TouchableOpacity>
          </View>
        )}
        </View>

        {isMobile && hasTransactions && <TransactionsTopGraph />}

        
        {!isMobile && hasTransactions && (
          <View style={styles.deskHead}>
            <View style={[styles.deskHeadCell, { flex: 2.8 }]}>
              <Text style={styles.deskHeadText}>Party</Text>
            </View>
            <View style={[styles.deskHeadCell, { flex: 2 }]}>
              <Text style={styles.deskHeadText}>Item</Text>
            </View>
            <View style={[styles.deskHeadCell, { flex: 1.2 }]}>
              <Text style={styles.deskHeadText}>Type</Text>
            </View>
            <View style={[styles.deskHeadCell, { flex: 1.2 }]}>
              <Text style={styles.deskHeadText}>Date</Text>
            </View>
            <View style={[styles.deskHeadCell, styles.deskAmountCell, { flex: 1.2 }]}>
              <Text style={styles.deskHeadText}>Amount</Text>
            </View>
          </View>
        )}

        {/* ── Content ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
                tintColor="#3b82f6"
              />
            ) : undefined
          }
        >
          {!hasTransactions ? (
            <EmptyState />
          ) : isMobile ? (
            <View style={styles.mobileList}>
              {transactions.map(tx => (
                <TransactionCard
                  key={tx._id}
                  tx={tx}
                  serviceNameById={serviceNameById}
                  onItemsPress={openItemsDialog}
                />
              ))}
            </View>
          ) : (
            <View style={styles.deskList}>
              {transactions.map((tx, idx) => (
                <TableRow
                  key={tx._id}
                  tx={tx}
                  serviceNameById={serviceNameById}
                  onItemsPress={openItemsDialog}
                  isLast={idx === transactions.length - 1}
                />
              ))}
            </View>
          )}
        </ScrollView>

       
      </View>

      {/* ── Dialog ── */}
      <ItemsDialog
        visible={isItemsOpen}
        title={dialogTitle}
        items={dialogItems}
        onClose={() => setIsItemsOpen(false)}
      />
    </View>
  );
};

/* ─── Styles ─── */
const styles = StyleSheet.create({
  root: { flex: 1 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 100,
  },

  /* Card Header */
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9a1',
  },
  cardHeadWithGraph: {
    borderBottomWidth: 0,
    paddingBottom: 8,
  },
  cardTitle:   { fontSize: 20, fontWeight: '700', color: '#0f172a', letterSpacing: -0.3 },
  cardSubtitle:{ fontSize: 12, color: '#94a3b8', },
  headLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  headLinkText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },

  /* Desktop table head */
   topGraphWrap: {
    height: 140,
    borderBottomWidth: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  deskHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  deskHeadCell:  { paddingHorizontal: 6 },
  deskHeadText:  { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6 },
  deskAmountCell:{ alignItems: 'flex-end' },

  /* Desktop rows */
  deskList:      {},
  deskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  deskRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  deskCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 8,
  },
  deskIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deskParty:    { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  deskDesc:     { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  deskItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  deskItemBtnClickable: { backgroundColor: '#eff6ff' },
  deskItemText:     { fontSize: 12, color: '#64748b', flex: 1 },
  deskItemClickable:{ color: '#3b82f6', fontWeight: '500' },
  deskNone:         { fontSize: 13, color: '#cbd5e1' },
  deskDate:         { fontSize: 12, color: '#64748b' },
  deskAmount:       { fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },

  /* Mobile list */
  mobileList: { padding: 12, gap: 8 },

  /* Mobile transaction card */
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    // borderRadius: 10,
    // padding: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 12,
    borderWidth: 1,
    borderColor:"transparent",
    borderBottomColor: '#ebebeb',
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.04,
    // shadowRadius: 3,
    // elevation: 1,
  },
  txIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txBody:       { flex: 1, gap: 3 },
  txParty:      { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  txItemRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  txItemText:   { fontSize: 11, color: '#64748b', flexShrink: 1 },
  txItemClickable: { color: '#3b82f6' },
  txDesc:       { fontSize: 12, color: '#94a3b8' },
  txDate:       { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  txAmountCol:  { alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0, gap: 6 },
  txAmount:     { fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },

  /* Amount colors */
  amtCredit:  { color: '#16a34a' },
  amtDebit:   { color: '#dc2626' },
  amtNeutral: { color: '#334155' },

  /* Type badge (shared) */
  txBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,

  },
  txBadgeDot:  { width: 4, height: 4, borderRadius: 3 },
  txBadgeText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },

  /* Card footer */
  cardFoot: {

    // borderTopColor: '#f1f5f9',
    alignItems: 'flex-end',
  },
  footBtn: {
    marginTop: 12,
  alignSelf: 'flex-start',
  backgroundColor: '#857bed',
  borderRadius: 999,
  paddingVertical: 8,
  paddingHorizontal: 14,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  borderWidth: 1,
  borderColor: '#857bed',
  },
  footBtnText: {  fontSize: 13,
  fontWeight: '600',
  color: '#ffffff', },

  /* Empty state */
  emptyWrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 6 },
  emptyText:  { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },

  /* Items dialog (bottom sheet style) */
  dlgOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  dlgSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  dlgHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  dlgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  dlgTitle:    { fontSize: 15, fontWeight: '700', color: '#0f172a', letterSpacing: -0.3 },
  dlgSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  dlgClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dlgBody: { maxHeight: 420 },

  /* Dialog item row */
  dlgItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  dlgItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dlgItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  dlgItemName:  { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a', lineHeight: 20 },
  dlgItemTotal: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  dlgItemDesc:  { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 17 },
  dlgItemMeta:  { flexDirection: 'row', gap: 12, marginTop: 4 },
  dlgMetaText:  { fontSize: 11, color: '#94a3b8', fontWeight: '500' },

  dlgFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafafa',
  },
  dlgCloseBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dlgCloseBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: -0.1 },
});

export default RecentTransactions;  
