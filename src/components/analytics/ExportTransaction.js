import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { Checkbox, Button } from 'react-native-paper';
import RNPickerSelect from 'react-native-picker-select';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

// Hardcoded data for demonstration
const HARDCODED_DATA = {
  clients: [
    { _id: '1', name: 'Client A', clientUsername: 'client_a' },
    { _id: '2', name: 'Client B', clientUsername: 'client_b' },
  ],
  companies: [
    { _id: 'comp1', name: 'Company 1', businessName: 'Company One Pvt Ltd' },
    { _id: 'comp2', name: 'Company 2', businessName: 'Company Two Ltd' },
  ],
  sales: [
    {
      _id: 's1',
      type: 'sales',
      date: '2024-01-15',
      company: { _id: 'comp1', businessName: 'Company One Pvt Ltd' },
      party: { name: 'Customer A', gstin: 'GSTIN123' },
      totalAmount: 15000,
      items: [{ product: { name: 'Product A' }, description: 'Sample product' }],
      description: 'Sales invoice',
      invoiceType: 'Regular',
      client: { _id: '1', name: 'Client A' },
    },
  ],
  purchases: [
    {
      _id: 'p1',
      type: 'purchases',
      date: '2024-01-10',
      company: { _id: 'comp1', businessName: 'Company One Pvt Ltd' },
      vendor: { name: 'Supplier X', gstin: 'GSTIN456' },
      totalAmount: 8000,
      items: [{ product: { name: 'Raw Material B' }, description: 'Purchase item' }],
      description: 'Purchase bill',
      invoiceType: 'Purchase',
      client: { _id: '1', name: 'Client A' },
    },
  ],
  receipts: [
    {
      _id: 'r1',
      type: 'receipts',
      date: '2024-01-20',
      company: { _id: 'comp1', businessName: 'Company One Pvt Ltd' },
      party: { name: 'Customer A' },
      amount: 5000,
      description: 'Payment received',
      voucherType: 'Receipt',
      client: { _id: '1', name: 'Client A' },
    },
  ],
  payments: [
    {
      _id: 'pay1',
      type: 'payments',
      date: '2024-01-05',
      company: { _id: 'comp1', businessName: 'Company One Pvt Ltd' },
      vendor: { name: 'Supplier X' },
      amount: 3000,
      description: 'Payment made',
      voucherType: 'Payment',
      client: { _id: '1', name: 'Client A' },
    },
  ],
  journals: [
    {
      _id: 'j1',
      type: 'journals',
      date: '2024-01-25',
      company: { _id: 'comp1', businessName: 'Company One Pvt Ltd' },
      party: { name: 'Internal Transfer' },
      amount: 2000,
      description: 'Journal entry',
      voucherType: 'Journal',
      client: { _id: '1', name: 'Client A' },
    },
  ],
};

const ExportTransaction = ({
  selectedClientId,
  companyMap = new Map(HARDCODED_DATA.companies.map(c => [c._id, c.name])),
  defaultCompanyId = null,
  onExported,
}) => {
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState('ALL');
  const [types, setTypes] = useState({
    sales: true,
    purchases: true,
    receipts: true,
    payments: true,
    journals: true,
  });
  const [dateRange, setDateRange] = useState({
    from: null,
    to: null,
  });
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [useDateRange, setUseDateRange] = useState(false);
  const [busy, setBusy] = useState(false);

  const allTypes = ['sales', 'purchases', 'receipts', 'payments', 'journals'];

  useEffect(() => {
    setCompanyId(defaultCompanyId || 'ALL');
  }, [defaultCompanyId]);

  const toggleAll = checked => {
    const next = { ...types };
    allTypes.forEach(t => (next[t] = checked));
    setTypes(next);
  };

  const stringifyId = v => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      if (v.$oid) return String(v.$oid);
      if (v._id) return stringifyId(v._id);
      if (v.id) return stringifyId(v.id);
    }
    try {
      return String(v);
    } catch {
      return '';
    }
  };

  const formatDate = date => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const normalizeData = (data, txType) => {
    return data.map(item => {
      const idOf = v => (typeof v === 'string' ? v : v?._id || v?.id || '');
      
      const first = (...vals) => {
        const found = vals.find(v => {
          if (v === null || v === undefined) return false;
          if (typeof v === 'string') return v.trim().length > 0;
          return true;
        });
        return found ?? '';
      };

      const nameOf = obj =>
        first(
          obj?.name,
          obj?.businessName,
          obj?.fullName,
          obj?.displayName,
          obj?.title,
          obj?.partyName,
          obj?.customerName,
          obj?.vendorName
        );

      const gstinOf = obj =>
        first(
          obj?.gstin,
          obj?.GSTIN,
          obj?.gstNumber,
          obj?.gst_no,
          obj?.gstNo,
          obj?.gstinNumber,
          obj?.gst
        );

      const fmtDate = d => {
        if (!d) return '';
        const dt = typeof d === 'string' ? new Date(d) : new Date(d);
        return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
      };

      const itemsArrayOf = t =>
        (Array.isArray(t.items) && t.items) ||
        (Array.isArray(t.lineItems) && t.lineItems) ||
        (Array.isArray(t.products) && t.products) ||
        [];

      const productsListOf = t => {
        const items = itemsArrayOf(t);
        if (!items.length) {
          return first(nameOf(t.product), t.productName, idOf(t.product));
        }
        return items
          .map(it => first(nameOf(it?.product), it?.productName, idOf(it?.product)))
          .filter(Boolean)
          .join(', ');
      };

      const descriptionOf = t =>
        first(
          t.description,
          t.notes,
          t.note,
          t.narration,
          t.remark,
          t.remarks,
          t.invoiceNote,
          t.memo,
          itemsArrayOf(t)?.[0]?.description
        );

      const invoiceTypeOf = (t, fallback) =>
        first(
          t.invoiceType,
          t.voucherType,
          t.voucher,
          t.entryType,
          t.type,
          fallback
        );

      const amountOf = t =>
        first(
          t.totalAmount,
          t.grandTotal,
          t.netAmount,
          t.amount,
          t.value,
          t.total
        );

      const companyName = first(
        item.company?.businessName,
        nameOf(item.company),
        companyMap.get(idOf(item.company)),
        idOf(item.company)
      );

      let partyName = '';
      if (txType === 'purchases' || txType === 'payments') {
        partyName = first(
          item.vendorName,
          item.supplierName,
          nameOf(item.vendor),
          idOf(item.vendor),
          ' '
        );
      } else {
        partyName = first(
          nameOf(item.party),
          item.partyName,
          item.customerName,
          idOf(item.party),
          ' '
        );
      }

      const gstin = first(
        gstinOf(item.party),
        item.partyGstin,
        item.gstin,
        gstinOf(item.company)
      );

      const base = {
        party: partyName,
        date: fmtDate(first(item.date, item.createdAt, item.invoiceDate, item.voucherDate)),
        company: companyName,
        gstin,
        client: first(item.client?.name, 'Client A'),
        amount: '',
        product: '',
        description: '',
        'invoice type': '',
      };

      if (txType === 'sales') {
        base.amount = amountOf(item);
        base.product = productsListOf(item);
        base.description = descriptionOf(item);
        base['invoice type'] = invoiceTypeOf(item, 'Sales');
        return base;
      }

      if (txType === 'purchases') {
        base.amount = amountOf(item);
        base.product = productsListOf(item);
        base.description = descriptionOf(item);
        base['invoice type'] = invoiceTypeOf(item, 'Purchase');
        return base;
      }

      if (txType === 'receipts') {
        base.amount = amountOf(item);
        base.description = descriptionOf(item);
        base['invoice type'] = invoiceTypeOf(item, 'Receipt');
        return base;
      }

      if (txType === 'payments') {
        base.amount = amountOf(item);
        base.description = descriptionOf(item);
        base['invoice type'] = invoiceTypeOf(item, 'Payment');
        return base;
      }

      base.amount = amountOf(item);
      base.description = descriptionOf(item);
      base['invoice type'] = invoiceTypeOf(item, 'Journal');
      return base;
    });
  };

  const generateCSV = data => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ];
    
    return csvRows.join('\n');
  };

  const exportToCSV = async () => {
    try {
      setBusy(true);

      const chosen = allTypes.filter(t => types[t]);
      if (!chosen.length) {
        Alert.alert('Error', 'Choose at least one transaction type.');
        return;
      }

      if (useDateRange) {
        if (!dateRange.from || !dateRange.to) {
          Alert.alert('Error', 'Please select both from and to dates.');
          return;
        }
        if (dateRange.from > dateRange.to) {
          Alert.alert('Error', 'From date cannot be after to date.');
          return;
        }
      }

      // Filter data based on selections
      let allData = [];
      chosen.forEach(type => {
        let typeData = HARDCODED_DATA[type] || [];
        
        // Apply company filter
        if (companyId !== 'ALL') {
          typeData = typeData.filter(item => {
            const itemCompanyId = stringifyId(item.company?._id || item.company);
            return itemCompanyId === companyId;
          });
        }

        // Apply date filter
        if (useDateRange) {
          typeData = typeData.filter(item => {
            const itemDate = new Date(item.date || item.createdAt);
            return itemDate >= dateRange.from && itemDate <= dateRange.to;
          });
        }

        const normalized = normalizeData(typeData, type);
        allData = [...allData, ...normalized];
      });

      if (!allData.length) {
        Alert.alert('Error', 'No data to export for selected filters.');
        return;
      }

      const csvContent = generateCSV(allData);
      
      // Create file path
      const fileName = `transactions_${companyId === 'ALL' ? 'all-companies' : companyMap.get(companyId)}_${formatDate(new Date())}.csv`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      
      // Write file
      await RNFS.writeFile(filePath, csvContent, 'utf8');

      // Share the file
      const shareOptions = {
        title: 'Export Transactions',
        url: `file://${filePath}`,
        type: 'text/csv',
      };

      await Share.open(shareOptions);

      onExported?.(allData.length);
      setOpen(false);
    } catch (error) {
      // Share cancellation is not an error
      if (error.message !== 'User did not share') {
        Alert.alert('Export Error', error.message || 'Export failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  const onFromDateChange = (event, selectedDate) => {
    setShowFromDatePicker(false);
    if (selectedDate) {
      setDateRange(prev => ({ ...prev, from: selectedDate }));
    }
  };

  const onToDateChange = (event, selectedDate) => {
    setShowToDatePicker(false);
    if (selectedDate) {
      setDateRange(prev => ({ ...prev, to: selectedDate }));
    }
  };

  const companyOptions = [
    { label: 'All companies', value: 'ALL' },
    ...Array.from(companyMap.entries()).map(([id, name]) => ({
      label: name,
      value: id,
    })),
  ];

  return (
    <View>
      <Button
        mode="outlined"
        onPress={() => setOpen(true)}
        icon="download"
        style={styles.exportButton}
      >
        Export
      </Button>

      <Modal
        visible={open}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Export Transactions</Text>

              {/* Company Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select company</Text>
                <View style={styles.pickerContainer}>
                  <RNPickerSelect
                    onValueChange={value => setCompanyId(value)}
                    items={companyOptions}
                    value={companyId}
                    placeholder={{}}
                    style={pickerSelectStyles}
                  />
                </View>
              </View>

              <View style={styles.separator} />

              {/* Date Range */}
              <View style={styles.section}>
                <View style={styles.checkboxRow}>
                  <Checkbox
                    status={useDateRange ? 'checked' : 'unchecked'}
                    onPress={() => setUseDateRange(!useDateRange)}
                  />
                  <Text style={styles.checkboxLabel}>Filter by date range</Text>
                </View>

                {useDateRange && (
                  <View style={styles.dateRangeContainer}>
                    <View style={styles.dateInput}>
                      <Text style={styles.dateLabel}>From date</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowFromDatePicker(true)}
                      >
                        <Text>
                          {dateRange.from ? formatDate(dateRange.from) : 'Select date'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.dateInput}>
                      <Text style={styles.dateLabel}>To date</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowToDatePicker(true)}
                      >
                        <Text>
                          {dateRange.to ? formatDate(dateRange.to) : 'Select date'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.separator} />

              {/* Transaction Types */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Transaction types</Text>
                
                <View style={styles.checkboxRow}>
                  <Checkbox
                    status={allTypes.every(t => types[t]) ? 'checked' : 'unchecked'}
                    onPress={() => toggleAll(!allTypes.every(t => types[t]))}
                  />
                  <Text style={styles.checkboxLabel}>Select all</Text>
                </View>

                <View style={styles.typesGrid}>
                  {allTypes.map(t => (
                    <View key={t} style={styles.checkboxRow}>
                      <Checkbox
                        status={types[t] ? 'checked' : 'unchecked'}
                        onPress={() => setTypes(prev => ({ ...prev, [t]: !prev[t] }))}
                      />
                      <Text style={styles.typeLabel}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <Button
                  mode="outlined"
                  onPress={() => setOpen(false)}
                  disabled={busy}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={exportToCSV}
                  disabled={busy}
                  loading={busy}
                >
                  {busy ? 'Exporting...' : 'Export CSV'}
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Date Pickers */}
        {showFromDatePicker && (
          <DateTimePicker
            value={dateRange.from || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onFromDateChange}
          />
        )}

        {showToDatePicker && (
          <DateTimePicker
            value={dateRange.to || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onToDateChange}
          />
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  exportButton: {
    margin: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    marginLeft: 8,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dateInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  typeLabel: {
    fontSize: 14,
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    marginRight: 8,
  },
});

const pickerSelectStyles = {
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 0,
    color: 'black',
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0,
    color: 'black',
  },
};

export default ExportTransaction;