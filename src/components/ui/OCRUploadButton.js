/**
 * OCRUploadButton.js — React Native
 *
 * Web (Next.js) ke OCRUploadButton ka React Native port.
 * UX text updated to match web version exactly.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
  Alert,
  Platform,
} from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { pick, types } from '@react-native-documents/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_FILES = 5;
const QUEUE_STORAGE_KEY = 'ocr_queue_state';
const QUEUE_EXPIRY_MS = 2 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function norm(s) {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isAmbiguousItem(item) {
  const noHsn = !item.hsn || item.hsn.trim() === '';
  const noSac = !item.sac || item.sac.trim() === '';
  const noQty =
    !item.quantity ||
    item.quantity === 0 ||
    item.quantity === null ||
    item.quantity === undefined;
  return noHsn && noSac && noQty;
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType) {
  if (!fileType) return 'file-outline';
  if (fileType.includes('pdf')) return 'file-pdf-box';
  if (fileType.includes('image')) return 'file-image';
  if (fileType.includes('sheet') || fileType.includes('excel'))
    return 'file-excel';
  return 'file-outline';
}

function getFileIconColor(fileType) {
  if (!fileType) return '#6B7280';
  if (fileType.includes('pdf')) return '#EF4444';
  if (fileType.includes('image')) return '#3B82F6';
  if (fileType.includes('sheet') || fileType.includes('excel'))
    return '#10B981';
  return '#6B7280';
}

function countFields(d) {
  if (!d) return 0;
  return (
    [
      d._companyName,
      d._partyNameRaw,
      d.referenceNumber,
      d.date,
      d.dueDate,
      d.totalAmount,
      d.taxAmount,
      d.paymentMethod,
      d.invoiceTotal,
    ].filter(Boolean).length + (d.items?.length ?? 0)
  );
}

// ── AsyncStorage Queue Helpers ────────────────────────────────────────────────

async function saveQueueToStorage(queue) {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {}
}

async function loadQueueFromStorage() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return null;
    const q = JSON.parse(raw);
    if (Date.now() - q.savedAt > QUEUE_EXPIRY_MS) {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
      return null;
    }
    if (!q.invoices?.length || q.currentIndex >= q.invoices.length) {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
      return null;
    }
    return q;
  } catch {
    return null;
  }
}

async function clearQueueFromStorage() {
  try {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch {}
}

// ── Detection Logic ───────────────────────────────────────────────────────────

function detectDecision(results) {
  const done = results.filter(r => r.status === 'done');
  if (done.length <= 1) return { decision: 'SINGLE' };

  const invoiceNums = done.map(r => norm(r.invoiceNumber));
  const companies = done.map(r => norm(r.companyName));
  const parties = done.map(r => norm(r.partyName));

  const hasAllInvoiceNums = invoiceNums.every(n => n.length > 0);
  const hasSomeInvoiceNums = invoiceNums.some(n => n.length > 0);
  const allInvoiceSame = hasAllInvoiceNums && new Set(invoiceNums).size === 1;
  const anyInvoiceDiff = hasAllInvoiceNums && new Set(invoiceNums).size > 1;
  const allCompanySame = new Set(companies.filter(Boolean)).size <= 1;
  const allPartySame = new Set(parties.filter(Boolean)).size <= 1;

  if (allInvoiceSame && allCompanySame && allPartySame) {
    return {
      decision: 'AUTO_MERGE',
      hint: 'Same invoice number, company & party — looks like a multi-page invoice.',
    };
  }
  if (allInvoiceSame && !allCompanySame) {
    return {
      decision: 'WARN_QUEUE',
      warning: `Same invoice number (${invoiceNums[0]}) found with different companies. Treating as separate transactions.`,
    };
  }
  if (anyInvoiceDiff) {
    const samePart =
      allPartySame && parties[0].length > 0
        ? ` Same party (${done[0].partyName}) will be prefilled each time.`
        : '';
    return {
      decision: 'QUEUE',
      hint: `Different invoice numbers — separate transactions.${samePart}`,
    };
  }
  if (!hasSomeInvoiceNums) {
    return {
      decision: 'ASK_USER',
      hint: 'Invoice number not detected. Are these pages of the same invoice?',
    };
  }
  return {
    decision: 'QUEUE',
    hint: 'Could not detect invoice numbers reliably. Treating as separate transactions.',
  };
}

// ── Merge Logic ───────────────────────────────────────────────────────────────

function mergeOCRData(dataList) {
  if (dataList.length === 0) return {};
  if (dataList.length === 1) return { ...dataList[0] };

  const merged = { ...dataList[0] };
  for (const d of dataList.slice(1)) {
    if (!merged._partyNameRaw && d._partyNameRaw)
      merged._partyNameRaw = d._partyNameRaw;
    if (!merged._companyName && d._companyName)
      merged._companyName = d._companyName;
    if (!merged.referenceNumber && d.referenceNumber)
      merged.referenceNumber = d.referenceNumber;
    if (!merged.paymentMethod && d.paymentMethod)
      merged.paymentMethod = d.paymentMethod;
    if (!merged.notes && d.notes) merged.notes = d.notes;
    if (!merged.date && d.date) merged.date = d.date;
    if (!merged.dueDate && d.dueDate) merged.dueDate = d.dueDate;
  }

  const seenKeys = new Set();
  const allItems = [];
  for (const d of dataList) {
    for (const item of d.items ?? []) {
      const key = `${norm(item.product || item.service || item.name)}|${
        item.amount
      }`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allItems.push(item);
      }
    }
  }
  merged.items = allItems;

  const sub = +allItems.reduce((s, it) => s + (it.amount ?? 0), 0).toFixed(2);
  const tax = +allItems.reduce((s, it) => s + (it.lineTax ?? 0), 0).toFixed(2);
  merged.totalAmount = sub;
  merged.taxAmount = tax;
  merged.invoiceTotal = +(sub + tax).toFixed(2);
  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// ScanningEffect Component
// ─────────────────────────────────────────────────────────────────────────────

function ScanningEffect() {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [scanAnim]);

  return (
    <View style={scanStyles.container} pointerEvents="none">
      <View style={[scanStyles.corner, scanStyles.cornerTL]} />
      <View style={[scanStyles.corner, scanStyles.cornerTR]} />
      <View style={[scanStyles.corner, scanStyles.cornerBL]} />
      <View style={[scanStyles.corner, scanStyles.cornerBR]} />
      <Animated.View
        style={[
          scanStyles.scanLine,
          {
            transform: [
              {
                translateY: scanAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 100],
                }),
              },
            ],
            opacity: scanAnim.interpolate({
              inputRange: [0, 0.05, 0.9, 1],
              outputRange: [0, 1, 1, 0],
            }),
          },
        ]}
      />
    </View>
  );
}

const scanStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#4ADE80',
  },
  cornerTL: { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 8, right: 8, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 8, left: 8, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2 },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#4ADE80',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// AmbiguousItemResolver Component
// ─────────────────────────────────────────────────────────────────────────────

function AmbiguousItemResolver({ item, index, resolved, onResolve }) {
  const name = item.product || item.service || item.name || `Item ${index + 1}`;
  return (
    <View
      style={[
        ambigStyles.container,
        resolved === null ? ambigStyles.unresolved : ambigStyles.resolved,
      ]}
    >
      <Text style={ambigStyles.name} numberOfLines={1}>
        {name}
      </Text>
      {item.amount > 0 && (
        <Text style={ambigStyles.amount}>
          ₹{item.amount.toLocaleString('en-IN')}
        </Text>
      )}
      <View style={ambigStyles.toggleRow}>
        <TouchableOpacity
          onPress={() => onResolve(index, 'product')}
          style={[
            ambigStyles.toggleBtn,
            ambigStyles.toggleLeft,
            resolved === 'product' && ambigStyles.toggleBtnActiveProduct,
          ]}
        >
          <Icon
            name="package-variant"
            size={12}
            color={resolved === 'product' ? '#fff' : '#6B7280'}
          />
          <Text
            style={[
              ambigStyles.toggleText,
              resolved === 'product' && ambigStyles.toggleTextActive,
            ]}
          >
            Product
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onResolve(index, 'service')}
          style={[
            ambigStyles.toggleBtn,
            ambigStyles.toggleRight,
            resolved === 'service' && ambigStyles.toggleBtnActiveService,
          ]}
        >
          <Icon
            name="tools"
            size={12}
            color={resolved === 'service' ? '#fff' : '#6B7280'}
          />
          <Text
            style={[
              ambigStyles.toggleText,
              resolved === 'service' && ambigStyles.toggleTextActive,
            ]}
          >
            Service
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ambigStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
    gap: 8,
  },
  unresolved: { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' },
  resolved: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  name: { flex: 1, fontSize: 12, fontWeight: '600', color: '#374151' },
  amount: { fontSize: 11, color: '#9CA3AF' },
  toggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    overflow: 'hidden',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
    backgroundColor: '#fff',
  },
  toggleLeft: { borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  toggleRight: {},
  toggleBtnActiveProduct: { backgroundColor: '#3B82F6' },
  toggleBtnActiveService: { backgroundColor: '#7C3AED' },
  toggleText: { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  toggleTextActive: { color: '#fff' },
});

// ─────────────────────────────────────────────────────────────────────────────
// PendingQueueBadge
// ─────────────────────────────────────────────────────────────────────────────

function PendingQueueBadge({ onPress }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const q = await loadQueueFromStorage();
      if (mounted) setCount(q ? q.totalCount - q.currentIndex : 0);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (count === 0) return null;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={badgeStyles.badge}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <Text style={badgeStyles.text}>{count}</Text>
    </TouchableOpacity>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  text: { color: '#fff', fontSize: 9, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main OCRUploadButton Component
// ─────────────────────────────────────────────────────────────────────────────

export function OCRUploadButton({
  transactionType,
  onDataExtracted,
  disabled = false,
  onQueueItemApplied,
  onQueueComplete,
  forceOpen,
  onForceOpenConsumed,
  style,
  companies = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [fileResults, setFileResults] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [resumeQueue, setResumeQueue] = useState(null);
  const [activeQueue, setActiveQueue] = useState(null);
  const [mergedPreview, setMergedPreview] = useState(null);
  const [detection, setDetection] = useState(null);
  const [ambiguousResolutions, setAmbiguousResolutions] = useState({});
  const [uiMode, setUiMode] = useState('upload');

  const doneResults = fileResults.filter(r => r.status === 'done' && r.data);

  // ── forceOpen effect ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!forceOpen) return;
    (async () => {
      const saved = await loadQueueFromStorage();
      if (saved && saved.currentIndex < saved.totalCount) {
        setActiveQueue(saved);
        const currentInvoice = saved.invoices[saved.currentIndex];
        if (currentInvoice) initAmbiguousResolutions(currentInvoice);
        setUiMode('queue');
        setIsOpen(true);
      }
      onForceOpenConsumed?.();
    })();
  }, [forceOpen]);

  // ── Open modal → check queue ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (uiMode === 'queue') return;
    (async () => {
      const saved = await loadQueueFromStorage();
      if (saved) {
        setResumeQueue(saved);
        setUiMode('resume_prompt');
      } else {
        setUiMode('upload');
      }
    })();
  }, [isOpen]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    setFileResults([]);
    setIsScanning(false);
    setUiMode('upload');
    setMergedPreview(null);
    setDetection(null);
    setActiveQueue(null);
    setResumeQueue(null);
    setAmbiguousResolutions({});
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    resetAll();
  }, [resetAll]);

  // ── Ambiguous Resolution ───────────────────────────────────────────────────
  const initAmbiguousResolutions = useCallback(data => {
    const map = {};
    (data.items || []).forEach((item, i) => {
      if (isAmbiguousItem(item)) map[i] = null;
    });
    setAmbiguousResolutions(map);
  }, []);

  const handleResolveItem = useCallback((index, type) => {
    setAmbiguousResolutions(prev => ({ ...prev, [index]: type }));
  }, []);

  const handleBulkResolve = useCallback(
    (type, data) => {
      const map = { ...ambiguousResolutions };
      (data.items || []).forEach((item, i) => {
        if (isAmbiguousItem(item)) map[i] = type;
      });
      setAmbiguousResolutions(map);
    },
    [ambiguousResolutions],
  );

  const handleToggleItemType = useCallback(
    itemIndex => {
      setAmbiguousResolutions(prev => {
        const current = prev[itemIndex];
        const newType =
          current === 'product'
            ? 'service'
            : current === 'service'
            ? 'product'
            : 'product';
        return { ...prev, [itemIndex]: newType };
      });

      if (mergedPreview) {
        setMergedPreview(prev => {
          if (!prev?.items) return prev;
          const items = prev.items.map((item, i) => {
            if (i !== itemIndex) return item;
            const currentType = item.itemType || 'product';
            const newType = currentType === 'product' ? 'service' : 'product';
            return {
              ...item,
              itemType: newType,
              product:
                newType === 'product'
                  ? item.product || item.service || item.name || ''
                  : '',
              service:
                newType === 'service'
                  ? item.product || item.service || item.name || ''
                  : '',
            };
          });
          return { ...prev, items };
        });
      }

      if (activeQueue) {
        setActiveQueue(prev => {
          if (!prev) return prev;
          const invoices = [...prev.invoices];
          const currentData = invoices[prev.currentIndex];
          if (!currentData?.items) return prev;
          const items = currentData.items.map((item, i) => {
            if (i !== itemIndex) return item;
            const currentType = item.itemType || 'product';
            const newType = currentType === 'product' ? 'service' : 'product';
            return {
              ...item,
              itemType: newType,
              product:
                newType === 'product'
                  ? item.product || item.service || item.name || ''
                  : '',
              service:
                newType === 'service'
                  ? item.product || item.service || item.name || ''
                  : '',
            };
          });
          invoices[prev.currentIndex] = { ...currentData, items };
          return { ...prev, invoices };
        });
      }
    },
    [mergedPreview, activeQueue],
  );

  const allResolved = Object.values(ambiguousResolutions).every(
    v => v !== null,
  );
  const ambiguousCount = Object.keys(ambiguousResolutions).length;
  const resolvedCount = Object.values(ambiguousResolutions).filter(
    v => v !== null,
  ).length;

  const applyResolutionsToData = useCallback(
    data => {
      if (Object.keys(ambiguousResolutions).length === 0) return data;
      const updatedItems = (data.items || []).map((item, i) => {
        const resolved = ambiguousResolutions[i];
        if (resolved == null) return item;
        return {
          ...item,
          itemType: resolved,
          product:
            resolved === 'product' ? item.product || item.name || '' : '',
          service:
            resolved === 'service'
              ? item.product || item.service || item.name || ''
              : '',
        };
      });
      return { ...data, items: updatedItems };
    },
    [ambiguousResolutions],
  );

  // ── File Picking ───────────────────────────────────────────────────────────
  const addFiles = useCallback(newFiles => {
    setFileResults(prev => {
      const combined = [...prev];
      for (const f of newFiles) {
        if (combined.length >= MAX_FILES) break;
        if (
          !combined.find(r => r.file.name === f.name && r.file.size === f.size)
        ) {
          combined.push({ file: f, status: 'pending' });
        }
      }
      return combined;
    });
  }, []);

  const handlePickFromGallery = useCallback(() => {
    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: MAX_FILES, quality: 0.9 },
      response => {
        if (response.didCancel || response.errorCode) return;
        const files = (response.assets || []).map(asset => ({
          name: asset.fileName || `image_${Date.now()}.jpg`,
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        }));
        addFiles(files);
      },
    );
  }, [addFiles]);

  const handlePickFromCamera = useCallback(() => {
    launchCamera(
      { mediaType: 'photo', quality: 0.9, saveToPhotos: false },
      response => {
        if (response.didCancel || response.errorCode) return;
        const files = (response.assets || []).map(asset => ({
          name: asset.fileName || `camera_${Date.now()}.jpg`,
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        }));
        addFiles(files);
      },
    );
  }, [addFiles]);

  const handlePickDocument = useCallback(async () => {
    try {
      const results = await pick({
        allowMultiSelection: true,
        type: [types.pdf, types.xls, types.xlsx],
      });
      const files = results.map(r => ({
        name: r.name || `file_${Date.now()}`,
        uri: r.uri,
        type: r.type || 'application/pdf',
        size: r.size || 0,
      }));
      addFiles(files);
    } catch (e) {
      // user cancelled
    }
  }, [addFiles]);

  const removeFile = useCallback(idx => {
    setFileResults(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Scan (API call) ────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    const pendingFiles = fileResults.filter(r => r.status === 'pending');
    if (pendingFiles.length === 0) return;

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    setIsScanning(true);
    setUiMode('scanning');
    setFileResults(prev =>
      prev.map(r =>
        r.status === 'pending' ? { ...r, status: 'scanning' } : r,
      ),
    );

    try {
      let updatedResults = fileResults.map(r =>
        r.status === 'pending' ? { ...r, status: 'scanning' } : r,
      );

      if (pendingFiles.length === 1) {
        const fr = pendingFiles[0];
        const fd = new FormData();
        fd.append('file', {
          uri: fr.file.uri,
          type: fr.file.type,
          name: fr.file.name,
        });
        fd.append('type', 'transaction');
        fd.append('transactionType', transactionType);

        const res = await fetch(`${BASE_URL}/api/ocr`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const result = await res.json();

        updatedResults = updatedResults.map(r =>
          r.file.name === fr.file.name && r.file.size === fr.file.size
            ? {
                ...r,
                status: result.success ? 'done' : 'error',
                data: result.data,
                error: result.error,
                invoiceNumber: result.data?.referenceNumber,
                partyName: result.data?._partyNameRaw,
                companyName: result.data?._companyName,
              }
            : r,
        );
      } else {
        const fd = new FormData();
        pendingFiles.forEach(fr =>
          fd.append('files', {
            uri: fr.file.uri,
            type: fr.file.type,
            name: fr.file.name,
          }),
        );
        fd.append('type', 'transaction');
        fd.append('transactionType', transactionType);

        const res = await fetch(`${BASE_URL}/api/ocr/batch`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const batch = await res.json();
        if (!batch.success) throw new Error('Batch OCR failed');

        updatedResults = updatedResults.map(r => {
          const match = batch.results.find(br => br.fileName === r.file.name);
          if (!match) return r;
          return {
            ...r,
            status: match.success ? 'done' : 'error',
            data: match.data,
            error: match.error,
            invoiceNumber: match.data?.referenceNumber,
            partyName: match.data?._partyNameRaw,
            companyName: match.data?._companyName,
          };
        });
      }

      setFileResults(updatedResults);
      const doneNow = updatedResults.filter(r => r.status === 'done' && r.data);

      if (doneNow.length === 0) {
        setUiMode('upload');
        Alert.alert(
          'All files failed',
          'Could not extract data from any file.',
        );
        return;
      }

      if (doneNow.length === 1) {
        const singleData = doneNow[0].data;
        setMergedPreview(singleData);
        initAmbiguousResolutions(singleData);
        setUiMode('single');
        return;
      }

      const det = detectDecision(updatedResults);
      setDetection(det);

      if (det.decision === 'AUTO_MERGE') {
        const merged = mergeOCRData(doneNow.map(r => r.data));
        setMergedPreview(merged);
        initAmbiguousResolutions(merged);
        setUiMode('auto_merge');
      } else if (det.decision === 'WARN_QUEUE') {
        const q = buildQueue(doneNow);
        setActiveQueue(q);
        setUiMode('warn_queue');
      } else if (det.decision === 'ASK_USER') {
        setUiMode('ask_user');
      } else {
        const q = buildQueue(doneNow);
        setActiveQueue(q);
        setUiMode('choose');
      }
    } catch (err) {
      Alert.alert('Scan failed', err?.message || 'Unknown error');
      setFileResults(prev =>
        prev.map(r =>
          r.status === 'scanning'
            ? { ...r, status: 'error', error: 'Failed' }
            : r,
        ),
      );
      setUiMode('upload');
    } finally {
      setIsScanning(false);
    }
  }, [fileResults, transactionType, initAmbiguousResolutions]);

  // ── Queue Builders ─────────────────────────────────────────────────────────
  function buildQueue(results) {
    return {
      invoices: results.map(r => r.data),
      fileNames: results.map(r => r.file.name),
      currentIndex: 0,
      totalCount: results.length,
      appliedCount: 0,
      savedAt: Date.now(),
    };
  }

  // ── Apply Handlers ─────────────────────────────────────────────────────────
  const handleApplyMerged = useCallback(async () => {
    if (!mergedPreview) return;
    try {
      const finalData = applyResolutionsToData(mergedPreview);
      await onDataExtracted(finalData);
      await clearQueueFromStorage();
      handleClose();
    } catch {
      Alert.alert('Apply failed', 'Could not apply OCR data to the form.');
    }
  }, [mergedPreview, applyResolutionsToData, onDataExtracted, handleClose]);

  const handleApplyFromQueue = useCallback(
    async q => {
      const current = q.invoices[q.currentIndex];
      if (!current) return;
      try {
        const finalData = applyResolutionsToData(current);
        await onDataExtracted(finalData);

        const nextIndex = q.currentIndex + 1;
        const nextApplied = q.appliedCount + 1;
        const isLast = nextIndex >= q.totalCount;

        if (isLast) {
          await clearQueueFromStorage();
          onQueueComplete?.();
          handleClose();
        } else {
          const updatedQueue = {
            ...q,
            currentIndex: nextIndex,
            appliedCount: nextApplied,
            savedAt: Date.now(),
          };
          await saveQueueToStorage(updatedQueue);
          const remaining = q.totalCount - nextIndex;

          onQueueItemApplied?.(remaining, () => {
            loadQueueFromStorage().then(savedQ => {
              if (savedQ && savedQ.currentIndex < savedQ.totalCount) {
                setActiveQueue(savedQ);
                const nextInvoice = savedQ.invoices[savedQ.currentIndex];
                if (nextInvoice) initAmbiguousResolutions(nextInvoice);
                setUiMode('queue');
                setIsOpen(true);
              }
            });
          });

          handleClose();
        }
      } catch {
        Alert.alert('Apply failed', 'Could not apply OCR data to the form.');
      }
    },
    [
      applyResolutionsToData,
      onDataExtracted,
      handleClose,
      onQueueItemApplied,
      onQueueComplete,
      initAmbiguousResolutions,
    ],
  );

  const handleSkipInQueue = useCallback(
    async q => {
      const nextIndex = q.currentIndex + 1;
      if (nextIndex >= q.totalCount) {
        await clearQueueFromStorage();
        handleClose();
        return;
      }
      const updatedQueue = {
        ...q,
        currentIndex: nextIndex,
        savedAt: Date.now(),
      };
      await saveQueueToStorage(updatedQueue);
      setActiveQueue(updatedQueue);
      const nextInvoice = updatedQueue.invoices[nextIndex];
      if (nextInvoice) initAmbiguousResolutions(nextInvoice);
    },
    [handleClose, initAmbiguousResolutions],
  );

  const handleDiscardQueue = useCallback(async () => {
    await clearQueueFromStorage();
    setResumeQueue(null);
    resetAll();
  }, [resetAll]);

  const handleResumeQueue = useCallback(
    q => {
      setActiveQueue(q);
      const currentInvoice = q.invoices[q.currentIndex];
      if (currentInvoice) initAmbiguousResolutions(currentInvoice);
      setUiMode('queue');
    },
    [initAmbiguousResolutions],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // UI Sub-renders
  // ─────────────────────────────────────────────────────────────────────────

  const renderFileRow = (fr, idx, showRemove = true) => {
    const iconName = getFileIcon(fr.file.type);
    const iconColor = getFileIconColor(fr.file.type);
    const bgColor =
      fr.status === 'done'
        ? '#F0FDF4'
        : fr.status === 'error'
        ? '#FEF2F2'
        : fr.status === 'scanning'
        ? '#EFF6FF'
        : '#fff';
    const borderColor =
      fr.status === 'done'
        ? '#BBF7D0'
        : fr.status === 'error'
        ? '#FECACA'
        : fr.status === 'scanning'
        ? '#BFDBFE'
        : '#E5E7EB';

    return (
      <View
        key={`${fr.file.name}-${idx}`}
        style={[s.fileRow, { backgroundColor: bgColor, borderColor }]}
      >
        <Icon name={iconName} size={20} color={iconColor} />
        <View style={s.fileInfo}>
          <Text style={s.fileName} numberOfLines={1}>
            {fr.file.name}
          </Text>
          <Text style={s.fileSize}>{formatFileSize(fr.file.size)}</Text>
        </View>
        {fr.status === 'scanning' && (
          <ActivityIndicator size="small" color="#3B82F6" />
        )}
        {fr.status === 'done' && (
          <Text style={s.fieldCount}>{countFields(fr.data)} fields</Text>
        )}
        {fr.status === 'error' && (
          <Icon name="alert-circle" size={16} color="#EF4444" />
        )}
        {showRemove && fr.status === 'pending' && (
          <TouchableOpacity onPress={() => removeFile(idx)} style={s.removeBtn}>
            <Icon name="close" size={14} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderPreviewGrid = (data, label) => {
    const getItemType = (item, itemIndex) => {
      const resolved = ambiguousResolutions?.[itemIndex];
      if (resolved) return resolved;
      if (isAmbiguousItem(item)) return 'ambiguous';
      return item.itemType || 'product';
    };

    return (
      <View style={s.previewCard}>
        {label && <Text style={s.previewLabel}>{label}</Text>}
        <View style={s.previewGrid}>
          {data._companyName && (
            <>
              <Text style={s.previewKey}>Company</Text>
              <Text style={s.previewVal} numberOfLines={1}>
                {data._companyName}
              </Text>
            </>
          )}
          {data._partyNameRaw && (
            <>
              <Text style={s.previewKey}>
                {transactionType === 'purchases' ? 'Vendor' : 'Customer'}
              </Text>
              <Text style={s.previewVal} numberOfLines={1}>
                {data._partyNameRaw}
              </Text>
            </>
          )}
          {data.referenceNumber && (
            <>
              <Text style={s.previewKey}>Invoice #</Text>
              <Text style={s.previewVal}>{data.referenceNumber}</Text>
            </>
          )}
          {data.date && (
            <>
              <Text style={s.previewKey}>Date</Text>
              <Text style={s.previewVal}>
                {new Date(data.date).toLocaleDateString('en-IN')}
              </Text>
            </>
          )}
          {(data.totalAmount ?? 0) > 0 && (
            <>
              <Text style={s.previewKey}>Subtotal</Text>
              <Text style={s.previewVal}>
                ₹{data.totalAmount.toLocaleString('en-IN')}
              </Text>
            </>
          )}
          {(data.taxAmount ?? 0) > 0 && (
            <>
              <Text style={s.previewKey}>Tax</Text>
              <Text style={s.previewVal}>
                ₹{data.taxAmount.toLocaleString('en-IN')}
              </Text>
            </>
          )}
          {(data.invoiceTotal ?? 0) > 0 && (
            <>
              <Text style={s.previewKey}>Total</Text>
              <Text style={[s.previewVal, s.previewTotal]}>
                ₹{data.invoiceTotal.toLocaleString('en-IN')}
              </Text>
            </>
          )}
          {data.paymentMethod && (
            <>
              <Text style={s.previewKey}>Payment</Text>
              <Text style={s.previewVal}>{data.paymentMethod}</Text>
            </>
          )}
        </View>

        {(data.items?.length ?? 0) > 0 && (
          <View style={s.itemsList}>
            <Text style={s.itemsTitle}>
              {data.items.length} item{data.items.length > 1 ? 's' : ''}{' '}
              <Text style={s.itemsHint}>(Tap badge to change item type)</Text>
            </Text>
            {data.items.map((item, i) => {
              const itemType = getItemType(item, i);
              const badgeBg =
                itemType === 'product'
                  ? '#3B82F6'
                  : itemType === 'service'
                  ? '#7C3AED'
                  : '#F59E0B';
              const badgeLabel =
                itemType === 'product'
                  ? 'P'
                  : itemType === 'service'
                  ? 'S'
                  : '?';
              const rowBg =
                itemType === 'product'
                  ? '#EFF6FF'
                  : itemType === 'service'
                  ? '#F5F3FF'
                  : '#FFFBEB';
              const rowBorder =
                itemType === 'product'
                  ? '#BFDBFE'
                  : itemType === 'service'
                  ? '#DDD6FE'
                  : '#FCD34D';

              return (
                <View
                  key={i}
                  style={[
                    s.itemRow,
                    { backgroundColor: rowBg, borderColor: rowBorder },
                  ]}
                >
                  <Text style={s.itemName} numberOfLines={1}>
                    {item.product ||
                      item.service ||
                      item.name ||
                      'Unknown item'}
                  </Text>
                  <Text style={s.itemAmount}>
                    {item.quantity} × ₹{item.pricePerUnit}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleToggleItemType(i)}
                    style={[s.itemTypeBadge, { backgroundColor: badgeBg }]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={s.itemTypeBadgeText}>{badgeLabel}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // ── renderAmbiguousBlock ───────────────────────────────────────────────────
  const renderAmbiguousBlock = data => {
    if (ambiguousCount === 0) return null;
    const ambiguousItems = (data.items || [])
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => isAmbiguousItem(item));
    if (ambiguousItems.length === 0) return null;
    const unresolvedCount = ambiguousItems.filter(
      ({ i }) =>
        ambiguousResolutions[i] === null ||
        ambiguousResolutions[i] === undefined,
    ).length;

    return (
      <View style={s.ambigBlock}>
        <View style={s.ambigHeader}>
          <View style={s.ambigHeaderLeft}>
            <Icon name="alert-circle" size={14} color="#D97706" />
            <Text style={s.ambigTitle}>
              {unresolvedCount > 0
                ? `${unresolvedCount} item${
                    unresolvedCount > 1 ? 's' : ''
                  } need type selection`
                : 'All items resolved ✓'}
            </Text>
          </View>
          {ambiguousItems.length >= 2 && (
            <View style={s.ambigBulkRow}>
              <TouchableOpacity
                onPress={() => handleBulkResolve('product', data)}
                style={s.ambigBulkBtn}
              >
                <Text style={s.ambigBulkText}>All Products</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleBulkResolve('service', data)}
                style={[s.ambigBulkBtn, s.ambigBulkBtnService]}
              >
                <Text style={[s.ambigBulkText, { color: '#7C3AED' }]}>
                  All Services
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Matches web: "HSN/SAC not detected — select type for each item to continue" */}
        <Text style={s.ambigSubtitle}>
          HSN/SAC not detected — select type for each item to continue
        </Text>
        <View style={s.ambigList}>
          {ambiguousItems.map(({ item, i }) => (
            <AmbiguousItemResolver
              key={i}
              item={item}
              index={i}
              resolved={ambiguousResolutions[i] ?? null}
              onResolve={handleResolveItem}
            />
          ))}
        </View>
        {ambiguousItems.length > 1 && (
          <View style={s.progressRow}>
            <View style={s.progressTrack}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: `${(resolvedCount / ambiguousCount) * 100}%`,
                    backgroundColor:
                      resolvedCount === ambiguousCount ? '#22C55E' : '#F59E0B',
                  },
                ]}
              />
            </View>
            <Text style={s.progressText}>
              {resolvedCount}/{ambiguousCount} resolved
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ── renderOCRWarning ───────────────────────────────────────────────────────
  const renderOCRWarning = () => (
    <View style={s.ocrWarning}>
      <Text style={s.ocrWarningText}>
        ⚠ Product names from OCR won't auto-match inventory — review items after
        applying.
      </Text>
    </View>
  );

  // ── renderApplyButton ──────────────────────────────────────────────────────
  const renderApplyButton = (onPress, label, color = '#22C55E') => {
    const isBlocked = ambiguousCount > 0 && !allResolved;
    const remaining = ambiguousCount - resolvedCount;
    return (
      <View style={{ gap: 6 }}>
        {isBlocked && (
          // Matches web: "Resolve X item(s) above before applying"
          <Text style={s.blockedText}>
            Resolve {remaining} item{remaining > 1 ? 's' : ''} above before
            applying
          </Text>
        )}
        <TouchableOpacity
          onPress={isBlocked ? undefined : onPress}
          style={[
            s.applyBtn,
            { backgroundColor: isBlocked ? '#D1D5DB' : color },
          ]}
          disabled={isBlocked}
        >
          <Icon
            name={isBlocked ? 'alert-circle' : 'check-circle'}
            size={16}
            color="#fff"
          />
          <Text style={s.applyBtnText}>
            {isBlocked
              ? // Matches web: "Select type for X item(s) first"
                `Select type for ${remaining} item${
                  remaining > 1 ? 's' : ''
                } first`
              : label}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── MODE: UPLOAD ──────────────────────────────────────────────────────────
  const renderUpload = () => {
    const pendingCount = fileResults.filter(r => r.status === 'pending').length;
    return (
      <View style={s.modeContainer}>
        <View style={s.pickerRow}>
          <TouchableOpacity style={s.pickerBtn} onPress={handlePickFromCamera}>
            <Icon name="camera" size={22} color="#7C3AED" />
            <Text style={s.pickerBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.pickerBtn} onPress={handlePickFromGallery}>
            <Icon name="image-multiple" size={22} color="#7C3AED" />
            <Text style={s.pickerBtnText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.pickerBtn} onPress={handlePickDocument}>
            <Icon name="file-pdf-box" size={22} color="#7C3AED" />
            <Text style={s.pickerBtnText}>PDF / XLS</Text>
          </TouchableOpacity>
        </View>
        {/* Matches web: "JPG, PNG, WebP, PDF, XLS, XLSX · Max 10 MB · Up to X files" */}
        <Text style={s.pickerHint}>
          JPG, PNG, WebP, PDF, XLS, XLSX · Max 10 MB · Up to {MAX_FILES} files
        </Text>
        {fileResults.length > 0 && (
          <View style={s.fileListContainer}>
            <View style={s.fileListHeader}>
              <Text style={s.fileListCount}>
                {fileResults.length}/{MAX_FILES} files
              </Text>
              <TouchableOpacity onPress={() => setFileResults([])}>
                <Text style={s.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            {fileResults.map((fr, i) => renderFileRow(fr, i, true))}
          </View>
        )}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.scanBtn, pendingCount === 0 && s.scanBtnDisabled]}
            onPress={handleScan}
            disabled={pendingCount === 0}
          >
            <Icon name="line-scan" size={16} color="#fff" />
            {/* Matches web: "Extract Data (X)" */}
            <Text style={s.scanBtnText}>
              Extract Data{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── MODE: SCANNING ────────────────────────────────────────────────────────
  const renderScanning = () => (
    <View style={s.modeContainer}>
      <View style={s.scanningPreview}>
        {fileResults
          .filter(r => r.status === 'scanning')
          .slice(0, 1)
          .map(fr => (
            <View key={fr.file.name} style={s.scanningFileInfo}>
              <Icon
                name={getFileIcon(fr.file.type)}
                size={24}
                color="rgba(255,255,255,0.7)"
              />
              <Text style={s.scanningFileName} numberOfLines={1}>
                {fr.file.name}
              </Text>
            </View>
          ))}
        <ScanningEffect />
      </View>
      <View style={s.fileListContainer}>
        {fileResults.map((fr, i) => renderFileRow(fr, i, false))}
      </View>
    </View>
  );

  // ─── MODE: SINGLE ──────────────────────────────────────────────────────────
  const renderSingle = () => {
    const data = mergedPreview;
    if (!data) return null;
    return (
      <View style={s.modeContainer}>
        <View style={s.infoBanner}>
          <Icon name="check-circle" size={14} color="#16A34A" />
          {/* Matches web: "X fields extracted" */}
          <Text style={s.infoBannerText}>
            {countFields(data)} fields extracted
          </Text>
        </View>
        {renderPreviewGrid(data)}
        {renderAmbiguousBlock(data)}
        {renderOCRWarning()}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.cancelBtn} onPress={resetAll}>
            {/* Matches web: "← Scan Again" */}
            <Text style={s.cancelBtnText}>← Scan Again</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {/* Matches web: "Apply to Form" */}
            {renderApplyButton(handleApplyMerged, 'Apply to Form', '#22C55E')}
          </View>
        </View>
      </View>
    );
  };

  // ─── MODE: AUTO_MERGE ──────────────────────────────────────────────────────
  const renderAutoMerge = () => {
    const data = mergedPreview;
    if (!data) return null;
    return (
      <View style={s.modeContainer}>
        <View style={s.infoBanner}>
          <Icon name="merge" size={14} color="#16A34A" />
          <View style={{ flex: 1 }}>
            {/* Matches web: "Multi-page invoice — auto merged" */}
            <Text style={s.infoBannerText}>
              Multi-page invoice — auto merged
            </Text>
            {detection?.hint && (
              <Text style={s.infoBannerSubtext}>{detection.hint}</Text>
            )}
          </View>
        </View>
        <View style={s.statsRow}>
          {[
            { label: 'Files', value: doneResults.length },
            { label: 'Items', value: data.items?.length ?? 0 },
            {
              label: 'Total',
              value: `₹${(data.invoiceTotal ?? 0).toLocaleString('en-IN')}`,
            },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
        {renderPreviewGrid(data)}
        {renderAmbiguousBlock(data)}
        {renderOCRWarning()}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.cancelBtn} onPress={resetAll}>
            <Text style={s.cancelBtnText}>← Scan Again</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {/* Matches web: "Apply Merged" */}
            {renderApplyButton(handleApplyMerged, 'Apply Merged', '#22C55E')}
          </View>
        </View>
      </View>
    );
  };

  // ─── MODE: WARN_QUEUE ──────────────────────────────────────────────────────
  const renderWarnQueue = () => (
    <View style={s.modeContainer}>
      <View style={[s.infoBanner, s.warningBanner]}>
        <Icon name="alert-triangle" size={14} color="#D97706" />
        <View style={{ flex: 1 }}>
          {/* Matches web: "Conflict detected" */}
          <Text style={[s.infoBannerText, { color: '#92400E' }]}>
            Conflict detected
          </Text>
          <Text style={s.warningDetail}>{detection?.warning}</Text>
          {/* Matches web: "Processing as separate transactions." */}
          <Text style={s.warningDetail}>
            Processing as separate transactions.
          </Text>
        </View>
      </View>
      <View style={s.fileListContainer}>
        {doneResults.map((fr, i) => renderFileRow(fr, i, false))}
      </View>
      <View style={s.actionRow}>
        <TouchableOpacity style={s.cancelBtn} onPress={resetAll}>
          <Text style={s.cancelBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.scanBtn, { backgroundColor: '#3B82F6' }]}
          onPress={() => {
            if (activeQueue) setUiMode('queue');
          }}
        >
          <Icon name="format-list-numbered" size={16} color="#fff" />
          {/* Matches web: "Start Queue (X)" */}
          <Text style={s.scanBtnText}>Start Queue ({doneResults.length})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── MODE: ASK_USER ────────────────────────────────────────────────────────
  const renderAskUser = () => (
    <View style={s.modeContainer}>
      <View style={s.infoBanner}>
        <Icon name="alert-circle" size={14} color="#3B82F6" />
        <View style={{ flex: 1 }}>
          {/* Matches web: "Invoice number not detected" */}
          <Text style={s.infoBannerText}>Invoice number not detected</Text>
          {/* Matches web body text exactly */}
          <Text style={[s.hintText, { marginTop: 4 }]}>
            Are these multiple pages of the{' '}
            <Text style={s.hintBold}>same invoice</Text>, or{' '}
            <Text style={s.hintBold}>separate invoices</Text>?
          </Text>
        </View>
      </View>
      <View style={s.fileListContainer}>
        {doneResults.map((fr, i) => renderFileRow(fr, i, false))}
      </View>
      <View style={s.choiceRow}>
        {/* Matches web: "Same Invoice" / "Merge all pages into one transaction" */}
        <TouchableOpacity
          style={[s.choiceCard, s.choiceCardMerge]}
          onPress={() => {
            const merged = mergeOCRData(doneResults.map(r => r.data));
            setMergedPreview(merged);
            initAmbiguousResolutions(merged);
            setUiMode('merge_preview');
          }}
        >
          <Icon name="merge" size={20} color="#7C3AED" />
          <Text style={s.choiceTitle}>Same Invoice</Text>
          <Text style={s.choiceSubtitle}>
            Merge all pages into one transaction
          </Text>
        </TouchableOpacity>
        {/* Matches web: "Separate Bills" / "Fill and save each invoice separately" */}
        <TouchableOpacity
          style={[s.choiceCard, s.choiceCardQueue]}
          onPress={() => {
            const q = buildQueue(doneResults);
            setActiveQueue(q);
            const first = q.invoices[0];
            if (first) initAmbiguousResolutions(first);
            setUiMode('queue');
          }}
        >
          <Icon name="format-list-numbered" size={20} color="#3B82F6" />
          <Text style={s.choiceTitle}>Separate Bills</Text>
          <Text style={s.choiceSubtitle}>
            Fill and save each invoice separately
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[s.cancelBtn, { alignSelf: 'center' }]}
        onPress={resetAll}
      >
        <Text style={s.cancelBtnText}>← Scan Again</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── MODE: CHOOSE ──────────────────────────────────────────────────────────
  const renderChoose = () => (
    <View style={s.modeContainer}>
      <View style={s.infoBanner}>
        <Icon name="format-list-numbered" size={14} color="#3B82F6" />
        <View style={{ flex: 1 }}>
          {/* Matches web: "X separate invoices detected" */}
          <Text style={s.infoBannerText}>
            {doneResults.length} separate invoices detected
          </Text>
          {detection?.hint && (
            <Text style={[s.hintText, { marginTop: 4 }]}>{detection.hint}</Text>
          )}
        </View>
      </View>
      <View style={s.fileListContainer}>
        {doneResults.map((fr, i) => (
          <View key={i} style={s.fileRow}>
            <Icon name="check-circle" size={14} color="#22C55E" />
            <Text style={s.fileName} numberOfLines={1}>
              {fr.file.name}
            </Text>
            {fr.invoiceNumber && (
              <Text style={s.fileSize}>#{fr.invoiceNumber}</Text>
            )}
            {fr.partyName && <Text style={s.fileSize}>· {fr.partyName}</Text>}
          </View>
        ))}
      </View>
      <View style={s.choiceRow}>
        {/* Matches web: "Queue" / "Recommended" badge / "Fill & save each invoice one by one" */}
        <TouchableOpacity
          style={[s.choiceCard, s.choiceCardQueue]}
          onPress={() => {
            if (activeQueue) {
              const first = activeQueue.invoices[0];
              if (first) initAmbiguousResolutions(first);
              setUiMode('queue');
            }
          }}
        >
          <View style={s.recommendedBadge}>
            <Text style={s.recommendedText}>Recommended</Text>
          </View>
          <Icon name="format-list-numbered" size={20} color="#3B82F6" />
          <Text style={s.choiceTitle}>Queue</Text>
          <Text style={s.choiceSubtitle}>
            Fill & save each invoice one by one
          </Text>
        </TouchableOpacity>
        {/* Matches web: "Merge All" / "Combine all items into one transaction" */}
        <TouchableOpacity
          style={[s.choiceCard, { borderColor: '#E5E7EB' }]}
          onPress={() => {
            const merged = mergeOCRData(doneResults.map(r => r.data));
            setMergedPreview(merged);
            initAmbiguousResolutions(merged);
            setUiMode('merge_preview');
          }}
        >
          <Icon name="merge" size={20} color="#7C3AED" />
          <Text style={s.choiceTitle}>Merge All</Text>
          <Text style={s.choiceSubtitle}>
            Combine all items into one transaction
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[s.cancelBtn, { alignSelf: 'center' }]}
        onPress={resetAll}
      >
        <Text style={s.cancelBtnText}>← Scan Again</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── MODE: MERGE_PREVIEW ───────────────────────────────────────────────────
  const renderMergePreview = () => {
    const data = mergedPreview;
    if (!data) return null;
    return (
      <View style={s.modeContainer}>
        <View
          style={[
            s.infoBanner,
            { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
          ]}
        >
          <Icon name="merge" size={14} color="#7C3AED" />
          {/* Matches web: "Merged X files · Y total items" */}
          <Text style={[s.infoBannerText, { color: '#6D28D9' }]}>
            Merged {doneResults.length} files · {data.items?.length ?? 0} total
            items
          </Text>
        </View>
        {renderPreviewGrid(data)}
        {renderAmbiguousBlock(data)}
        {renderOCRWarning()}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={() => setUiMode('choose')}
          >
            <Text style={s.cancelBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {/* Matches web: "Apply to Form" */}
            {renderApplyButton(handleApplyMerged, 'Apply to Form', '#22C55E')}
          </View>
        </View>
      </View>
    );
  };

  // ─── MODE: QUEUE ───────────────────────────────────────────────────────────
  const renderQueue = () => {
    const q = activeQueue;
    if (!q) return null;
    const current = q.invoices[q.currentIndex];
    const isLast = q.currentIndex === q.totalCount - 1;
    const remaining = q.totalCount - q.currentIndex - 1;

    return (
      <View style={s.modeContainer}>
        <View style={s.queueProgressRow}>
          <View style={s.queueProgressTrack}>
            <View
              style={[
                s.queueProgressFill,
                { width: `${(q.currentIndex / q.totalCount) * 100}%` },
              ]}
            />
          </View>
          <Text style={s.queueProgressText}>
            {q.currentIndex + 1} / {q.totalCount}
          </Text>
        </View>
        <View style={s.fileListContainer}>
          {q.invoices.map((inv, i) => {
            const isDone = i < q.currentIndex;
            const isCurrent = i === q.currentIndex;
            return (
              <View
                key={i}
                style={[
                  s.queueItem,
                  isCurrent && s.queueItemCurrent,
                  isDone && s.queueItemDone,
                ]}
              >
                {isDone ? (
                  <Icon name="check-circle" size={14} color="#22C55E" />
                ) : isCurrent ? (
                  <View style={s.queueDot} />
                ) : (
                  <View style={s.queueDotEmpty} />
                )}
                <Text
                  style={[s.queueItemName, isDone && s.queueItemDoneText]}
                  numberOfLines={1}
                >
                  {q.fileNames[i] || `Invoice ${i + 1}`}
                </Text>
                {inv.referenceNumber && (
                  <Text style={s.fileSize}>#{inv.referenceNumber}</Text>
                )}
              </View>
            );
          })}
        </View>
        {renderPreviewGrid(
          current,
          `Invoice ${q.currentIndex + 1} — ${
            q.fileNames[q.currentIndex] || ''
          }`,
        )}
        {renderAmbiguousBlock(current)}
        {renderOCRWarning()}
        <View
          style={[
            s.infoBanner,
            { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
          ]}
        >
          <Icon name="information" size={14} color="#3B82F6" />
          {/* Matches web queue instruction text */}
          <Text style={[s.infoBannerText, { color: '#1D4ED8', flex: 1 }]}>
            {isLast
              ? 'This is the last invoice. Save the transaction to complete all invoices.'
              : `Fill form → Save → Close invoice preview — next invoice (${remaining} remaining) will automatically load.`}
          </Text>
        </View>
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.skipBtn}
            onPress={() => handleSkipInQueue(q)}
          >
            <Icon name="skip-next" size={14} color="#6B7280" />
            <Text style={s.skipBtnText}>Skip</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {renderApplyButton(
              () => handleApplyFromQueue(q),
              isLast
                ? 'Fill Form & Finish'
                : `Fill Form (${remaining} more after this)`,
              '#3B82F6',
            )}
          </View>
        </View>
      </View>
    );
  };

  // ─── MODE: RESUME_PROMPT ───────────────────────────────────────────────────
  const renderResumePrompt = () => {
    const q = resumeQueue;
    if (!q) return null;
    const remaining = q.totalCount - q.currentIndex;
    return (
      <View style={s.modeContainer}>
        <View
          style={[
            s.infoBanner,
            { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
          ]}
        >
          <Icon name="play-circle" size={14} color="#3B82F6" />
          <View style={{ flex: 1 }}>
            {/* Matches web: "Resume pending queue" */}
            <Text style={[s.infoBannerText, { color: '#1D4ED8' }]}>
              Resume pending queue
            </Text>
            {/* Matches web: "X invoice(s) remaining out of Y total. (Z already saved)" */}
            <Text style={[s.hintText, { marginTop: 2 }]}>
              <Text style={s.hintBold}>{remaining}</Text> invoice
              {remaining > 1 ? 's' : ''} remaining out of{' '}
              <Text style={s.hintBold}>{q.totalCount}</Text> total.
              {q.appliedCount > 0 ? ` (${q.appliedCount} already saved)` : ''}
            </Text>
          </View>
        </View>
        <View style={s.fileListContainer}>
          {q.invoices.map((inv, i) => {
            const isDone = i < q.currentIndex;
            const isCurrent = i === q.currentIndex;
            return (
              <View
                key={i}
                style={[
                  s.queueItem,
                  isCurrent && s.queueItemCurrent,
                  isDone && s.queueItemDone,
                ]}
              >
                {isDone ? (
                  <Icon name="check-circle" size={14} color="#22C55E" />
                ) : isCurrent ? (
                  <View style={s.queueDot} />
                ) : (
                  <View style={s.queueDotEmpty} />
                )}
                <Text
                  style={[s.queueItemName, isDone && s.queueItemDoneText]}
                  numberOfLines={1}
                >
                  {q.fileNames[i] || `Invoice ${i + 1}`}
                </Text>
                {/* Matches web: "Saved ✓" / "Next →" */}
                {isDone && <Text style={s.savedText}>Saved ✓</Text>}
                {isCurrent && <Text style={s.nextText}>Next →</Text>}
              </View>
            );
          })}
        </View>
        <View style={s.actionRow}>
          {/* Matches web: "Discard Queue" */}
          <TouchableOpacity
            style={[s.cancelBtn, { borderColor: '#FCA5A5' }]}
            onPress={handleDiscardQueue}
          >
            <Text style={[s.cancelBtnText, { color: '#EF4444' }]}>
              Discard Queue
            </Text>
          </TouchableOpacity>
          {/* Matches web: "Resume Queue" */}
          <TouchableOpacity
            style={[s.scanBtn, { backgroundColor: '#3B82F6' }]}
            onPress={() => handleResumeQueue(q)}
          >
            <Icon name="play-circle" size={16} color="#fff" />
            <Text style={s.scanBtnText}>Resume Queue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Modal Title & Description ──────────────────────────────────────────────
  // Matches web getTitle() and getDescription() exactly
  const getTitle = () => {
    if (uiMode === 'resume_prompt') return 'Resume Invoice Queue';
    if (uiMode === 'queue')
      return `Queue — ${(activeQueue?.currentIndex ?? 0) + 1}/${
        activeQueue?.totalCount ?? 0
      }`;
    if (uiMode === 'auto_merge') return 'Multi-page Invoice Detected';
    if (uiMode === 'merge_preview') return 'Merge Preview';
    if (uiMode === 'warn_queue') return 'Conflict Detected';
    if (uiMode === 'ask_user') return 'Same or Separate Invoices?';
    if (uiMode === 'choose') return 'Multiple Invoices Scanned';
    return 'Scan Invoice / Bill';
  };

  const getDescription = () => {
    if (uiMode === 'resume_prompt')
      return 'You have pending invoices from your last session.';
    if (uiMode === 'queue')
      return 'Fill form → save transaction → close invoice preview → next invoice will auto-load.';
    if (uiMode === 'auto_merge')
      return 'All pages merged automatically. Review and apply.';
    if (uiMode === 'merge_preview')
      return 'All items combined into one transaction.';
    if (uiMode === 'warn_queue')
      return 'Same invoice number found with different companies.';
    if (uiMode === 'ask_user')
      return 'Invoice number not detected — please confirm.';
    if (uiMode === 'choose')
      return 'Different invoices detected. Choose how to proceed.';
    return 'Upload invoices — fields will be auto-filled using OCR.';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={[s.triggerWrapper, style]}>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        disabled={disabled}
        style={[s.triggerBtn, disabled && s.triggerBtnDisabled]}
      >
        <Icon name="line-scan" size={16} color="#7C3AED" />
        {/* Matches web: "Scan Invoice" */}
        <Text style={s.triggerBtnText}>Scan Invoice</Text>
      </TouchableOpacity>
      <PendingQueueBadge onPress={() => setIsOpen(true)} />

      <Modal
        isVisible={isOpen}
        onBackdropPress={handleClose}
        onBackButtonPress={handleClose}
        style={s.modal}
        avoidKeyboard
        propagateSwipe
      >
        <View style={s.modalContainer}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <View style={s.modalHeaderLeft}>
              <View style={s.modalIconBox}>
                <Icon name="barcode-scan" size={16} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>{getTitle()}</Text>
                {getDescription() ? (
                  <Text style={s.modalDescription}>{getDescription()}</Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={s.modalCloseBtn}>
              <Icon name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={s.modalContent}
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {uiMode === 'resume_prompt' && renderResumePrompt()}
            {uiMode === 'upload' && renderUpload()}
            {uiMode === 'scanning' && renderScanning()}
            {uiMode === 'single' && renderSingle()}
            {uiMode === 'auto_merge' && renderAutoMerge()}
            {uiMode === 'warn_queue' && renderWarnQueue()}
            {uiMode === 'ask_user' && renderAskUser()}
            {uiMode === 'choose' && renderChoose()}
            {uiMode === 'merge_preview' && renderMergePreview()}
            {uiMode === 'queue' && renderQueue()}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  triggerWrapper: { position: 'relative' },
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#8B5CF6',
    backgroundColor: '#FAFAFA',
  },
  triggerBtnDisabled: { opacity: 0.5 },
  triggerBtnText: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },
  modal: { justifyContent: 'flex-end', margin: 0 },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    minHeight: 300,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  modalIconBox: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  modalDescription: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 15,
  },
  modalCloseBtn: { padding: 4, marginLeft: 8 },
  modalContent: { paddingHorizontal: 16, paddingTop: 12 },
  modeContainer: { gap: 12 },
  pickerRow: { flexDirection: 'row', gap: 10 },
  pickerBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    gap: 6,
  },
  pickerBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  pickerHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
  fileListContainer: { gap: 6 },
  fileListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fileListCount: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  clearAllText: { fontSize: 12, color: '#EF4444' },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 12, fontWeight: '600', color: '#374151' },
  fileSize: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  fieldCount: { fontSize: 10, fontWeight: '700', color: '#22C55E' },
  removeBtn: { padding: 4 },
  scanningPreview: {
    height: 100,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scanningFileInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanningFileName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    maxWidth: 200,
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  scanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
    gap: 6,
  },
  scanBtnDisabled: { backgroundColor: '#D1D5DB' },
  scanBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  skipBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6,
  },
  applyBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  blockedText: {
    fontSize: 11,
    color: '#D97706',
    textAlign: 'center',
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  infoBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  infoBannerSubtext: {
    fontSize: 10,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 14,
  },
  warningBanner: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' },
  warningDetail: {
    fontSize: 11,
    color: '#D97706',
    marginTop: 2,
    lineHeight: 16,
  },
  hintText: { fontSize: 11, color: '#6B7280', lineHeight: 16 },
  hintBold: { fontWeight: '700', color: '#374151' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  statValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  previewCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  previewGrid: { padding: 12, flexDirection: 'row', flexWrap: 'wrap' },
  previewKey: {
    width: '40%',
    fontSize: 11,
    color: '#6B7280',
    paddingVertical: 2,
  },
  previewVal: {
    width: '60%',
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    paddingVertical: 2,
  },
  previewTotal: { fontWeight: '700', color: '#111827' },
  itemsList: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 4,
  },
  itemsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  itemsHint: {
    fontSize: 9,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 3,
  },
  itemName: { flex: 1, fontSize: 11, color: '#374151' },
  itemAmount: { fontSize: 10, color: '#9CA3AF' },
  itemTypeBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTypeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  ambigBlock: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    overflow: 'hidden',
  },
  ambigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    flexWrap: 'wrap',
    gap: 6,
  },
  ambigHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ambigTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  ambigSubtitle: {
    fontSize: 10,
    color: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFBEB',
  },
  ambigBulkRow: { flexDirection: 'row', gap: 6 },
  ambigBulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  ambigBulkBtnService: { borderColor: '#C4B5FD' },
  ambigBulkText: { fontSize: 10, fontWeight: '700', color: '#3B82F6' },
  ambigList: { padding: 10, gap: 4 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  progressFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  ocrWarning: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  ocrWarningText: { fontSize: 10, color: '#D97706' },
  choiceRow: { flexDirection: 'row', gap: 10 },
  choiceCard: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  choiceCardMerge: { borderColor: '#C4B5FD', backgroundColor: '#F5F3FF' },
  choiceCardQueue: { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
  choiceTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  choiceSubtitle: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  queueProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  queueProgressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  queueProgressFill: { height: 6, borderRadius: 3, backgroundColor: '#3B82F6' },
  queueProgressText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  queueItemCurrent: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  queueItemDone: { opacity: 0.6 },
  queueItemName: { flex: 1, fontSize: 12, fontWeight: '500', color: '#374151' },
  queueItemDoneText: { textDecorationLine: 'line-through' },
  queueDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3B82F6',
  },
  queueDotEmpty: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  savedText: { fontSize: 10, fontWeight: '700', color: '#22C55E' },
  nextText: { fontSize: 10, fontWeight: '700', color: '#3B82F6' },
});

export { loadQueueFromStorage, clearQueueFromStorage, saveQueueToStorage };
export default OCRUploadButton;
