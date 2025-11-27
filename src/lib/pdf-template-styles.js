// Create styles for React Native
import { StyleSheet, Platform } from 'react-native';

export const template8Styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 25,
    paddingBottom: 34,
  },
  section: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2583C6',
  },
  grayColor: {
    color: '#262626',
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#232323',
  },
  addressText: {
    fontSize: 9,
    marginBottom: 3,
    lineHeight: 1.2,
  },
  dividerBlue: {
    borderBottomWidth: 3,
    borderBottomColor: '#2583C6',
    marginVertical: 2,
    marginBottom: 6,
  },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: '#bfbfbf',
    marginVertical: 2,
    marginBottom: 6,
  },
  threeColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 180,
  },
  column: {
    flex: 4,
    marginRight: 20,
  },
  lastColumn: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  normalText: {
    fontSize: 8,
    marginBottom: 2,
  },
  boldText: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  table: {
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#bfbfbf',
    borderBottomWidth: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2583C6',
    paddingLeft: 0,
    paddingRight: 0,
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#bfbfbf',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#bfbfbf',
    minHeight: 19,
  },
  tableCellHeader: {
    fontSize: 7,
    borderRightWidth: 1,
    borderRightColor: '#ffffff',
  },
  tableCell: {
    padding: 3,
    fontSize: 8,
  },
  tableCellSize7: {
    fontSize: 7,
  },
  tableCellLast: {
    padding: 3,
    fontSize: 8,
  },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalsLeft: {
    fontSize: 8,
  },
  totalsRight: {
    fontSize: 10,
    textAlign: 'right',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 32,
    marginBottom: 4,
  },
  paymentSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  stamp: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: 'blue',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampText: {
    fontSize: 6,
    fontWeight: 'bold',
  },
  termsSection: {
    fontSize: 8,
  },
  sectionHeader: {
    fontSize: 11,
    marginBottom: 3,
  },
  detailText: {
    fontSize: 9,
    lineHeight: 1.1,
  },
  smallRs: {
    fontSize: 10,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 10,
    right: 24,
    fontSize: 8,
    textAlign: 'right',
  },
});

// A5 specific styles
export const templateA5Styles = StyleSheet.create({
  tableOuterBorder: {
    borderColor: '#0371C1',
    borderWidth: 0,
    marginVertical: 10,
  },
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 30,
    fontSize: 8,
  },
  header: {
    flexDirection: 'row',
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
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  address: {
    fontSize: 10,
    marginBottom: 3,
    lineHeight: 1.2,
  },
  contactInfo: {
    fontSize: 10,
    lineHeight: 1.2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  contactValue: {
    fontSize: 10,
    fontWeight: 'normal',
  },
  section: {
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
  },
  gstValue: {
    fontSize: 10,
    fontWeight: 'normal',
  },
  invoiceTitleRow: {
    padding: 3,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
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
  },
  threeColSection: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0371C1',
    borderLeftWidth: 1.5,
    borderLeftColor: '#0371C1',
    borderRightWidth: 1.5,
    borderRightColor: '#0371C1',
  },
  column: {
    width: '33.3%',
    paddingHorizontal: 4,
    borderLeftWidth: 1,
    borderLeftColor: '#0371C1',
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
  threecoltableHeader: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  tableLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    width: '40%',
    flexShrink: 0,
  },
  tableValue: {
    fontSize: 8,
    fontWeight: 'normal',
    width: '70%',
    flexShrink: 1,
  },
  itemsTable: {},
  tableContainer: {
    position: 'relative',
    width: '100%',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0371C1',
    borderLeftWidth: 1.5,
    borderLeftColor: '#0371C1',
    borderRightWidth: 1.5,
    borderRightColor: '#0371C1',
  },
  verticalBorder: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#0371C1',
  },
  itemsTableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(3, 113, 193, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: '#0371C1',
  },
  headerCell: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  itemsTableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemsTableTotalRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(3, 113, 193, 0.2)',
    alignItems: 'center',
  },
  srNoHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    width: '8%',
    textAlign: 'center',
    padding: 2,
  },
  productHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    width: '25%',
    padding: 2,
  },
  hsnHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    width: '10%',
    textAlign: 'center',
    padding: 2,
  },
  qtyHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    width: '8%',
    textAlign: 'center',
    padding: 2,
  },
  rateHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    width: '10%',
    textAlign: 'center',
    padding: 2,
  },
  taxableHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    width: '12%',
    textAlign: 'center',
    padding: 2,
  },
  igstHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    width: '12%',
  },
  totalHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    width: '15%',
    textAlign: 'center',
    padding: 2,
  },
  igstMainHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 1,
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
  },
  igstSubPercentage: {
    fontSize: 6,
    fontWeight: 'bold',
    width: '30%',
    textAlign: 'center',
    padding: 1,
  },
  srNoCell: {
    fontSize: 7,
    width: '8%',
    textAlign: 'center',
    padding: 2,
  },
  productCell: {
    fontSize: 7,
    width: '25%',
    textAlign: 'left',
    padding: 2,
  },
  hsnCell: {
    fontSize: 7,
    width: '10%',
    textAlign: 'center',
    padding: 2,
  },
  qtyCell: {
    fontSize: 7,
    width: '8%',
    textAlign: 'center',
    padding: 2,
  },
  rateCell: {
    fontSize: 7,
    width: '10%',
    textAlign: 'center',
    padding: 2,
  },
  taxableCell: {
    fontSize: 7,
    width: '12%',
    textAlign: 'center',
    padding: 2,
  },
  igstCell: {
    flexDirection: 'row',
    width: '12%',
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
  },
  igstAmount: {
    fontSize: 7,
    textAlign: 'center',
    padding: 1,
    width: '70%',
  },
  totalCell: {
    fontSize: 7,
    width: '15%',
    textAlign: 'center',
    padding: 2,
  },
  totalLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 2,
  },
  totalEmpty: {
    fontSize: 7,
    width: '25%',
    padding: 2,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  totalQty: {
    fontSize: 7,
    fontWeight: 'bold',
    width: '8%',
    textAlign: 'center',
    padding: 2,
  },
  totalTaxable: {
    fontSize: 7,
    fontWeight: 'bold',
    width: '12%',
    textAlign: 'center',
    padding: 2,
  },
  igstTotal: {
    fontSize: 7,
  },
  totalIgstAmount: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'right',
    padding: 1,
  },
  grandTotal: {
    fontSize: 7,
    fontWeight: 'bold',
    width: '15%',
    textAlign: 'center',
    padding: 2,
  },
  bottomSection: {
    flexDirection: 'row',
    width: '100%',
    fontSize: 7,
    borderTopWidth: 1,
    borderTopColor: '#0371C1',
    borderLeftWidth: 1,
    borderLeftColor: '#0371C1',
    borderRightWidth: 1,
    borderRightColor: '#0371C1',
    borderBottomWidth: 1,
    borderBottomColor: '#0371C1',
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
  },
  termsBox: {
    padding: 8,
    paddingTop: 0,
  },
  termLine: {
    fontSize: 10,
    marginBottom: 2,
    color: '#000000',
    textAlign: 'left',
    fontWeight: 'normal',
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  qrImage: {
    width: 45,
    height: 45,
  },
  qrText: {
    fontSize: 7,
    marginTop: 2,
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
  },
  value: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  labelBold: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  valueBold: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  highlightRow: {
    backgroundColor: '#EAF4FF',
  },
  currencySymbol: {
    fontSize: 6,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    fontSize: 8,
    textAlign: 'right',
  },
});

// Template 1 Styles (converted similarly)
export const template1Styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 25,
    paddingBottom: 30,
  },
  tableWrapper: {
    position: 'relative',
    flexDirection: 'column',
  },
  pageBottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#0371C1',
  },
  columnBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    paddingBottom: 4,
    alignItems: 'center',
  },
  headerLeft: {
    alignItems: 'flex-start',
  },
  headerRight: {
    alignItems: 'flex-start',
    width: '100%',
    marginLeft: 20,
  },
  logo: {
    width: 70,
    height: 70,
    marginRight: 5,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    marginLeft: 2,
  },
  address: {
    fontSize: 10,
    marginBottom: 3,
    lineHeight: 1.2,
    marginLeft: 2,
    alignItems: 'flex-start',
    textAlign: 'left',
  },
  contactInfo: {
    fontSize: 10,
    lineHeight: 1.2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  contactValue: {
    fontSize: 10,
    fontWeight: 'normal',
  },
  // ... continue converting other template1 styles similarly
});

// Template 18 Styles
export const template18Styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 150,
    fontSize: 8,
  },
  pageContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: 4,
  },
  separator: {
    fontSize: 8,
    textAlign: 'center',
    marginVertical: 1,
    color: '#000000',
  },
  separatorBold: {
    fontSize: 7,
    textAlign: 'center',
    marginVertical: 1,
    fontWeight: 'bold',
    color: '#000000',
  },
  separatorDouble: {
    fontSize: 8,
    textAlign: 'center',
    marginVertical: 1,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: '#000000',
  },
  companyHeaderSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  companyNameTop: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 1,
    color: '#000000',
  },
  address: {
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 1.2,
    color: '#000000',
  },
  gstin: {
    fontSize: 8,
    marginTop: 1,
    color: '#000000',
    textAlign: 'center',
  },
  invoiceTitleContainer: {
    alignItems: 'center',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000',
    width: 280,
  },
  invoiceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  invoiceMetaTextLeft: {
    fontSize: 8,
    fontWeight: 'normal',
    color: '#000000',
    lineHeight: 1.3,
    textAlign: 'left',
  },
  invoiceMetaTextRight: {
    fontSize: 8,
    fontWeight: 'normal',
    color: '#000000',
    lineHeight: 1.3,
    textAlign: 'right',
  },
  // ... continue converting other template18 styles
});

// Template T3 Styles
export const template_t3 = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 10,
    fontSize: 8,
    width: '100%',
  },
  centerText: {
    textAlign: 'center',
    width: '100%',
  },
  boldText: {
    fontWeight: 'bold',
  },
  companyName: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  companyAddress: {
    fontSize: 7,
    textAlign: 'center',
    lineHeight: 1.2,
    marginBottom: 3,
  },
  invoiceTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 4,
  },
  section: {},
  billedinvoice: {
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  line: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginVertical: 3,
  },
  dashedLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderStyle: 'dashed',
    marginVertical: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  col: {
    flexDirection: 'column',
  },
  itemsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingVertical: 2,
    marginBottom: 2,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
  },
  colSr: {
    width: '8%',
    textAlign: 'center',
  },
  colItem: {
    width: '42%',
    paddingLeft: 2,
  },
  colHsn: {
    width: '20%',
    textAlign: 'left',
  },
  colQty: {
    width: '10%',
    textAlign: 'center',
  },
  colRate: {
    width: '12%',
    textAlign: 'right',
    paddingRight: 2,
  },
  colTotal: {
    width: '18%',
    textAlign: 'right',
    paddingRight: 2,
  },
  totalSection: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  footer: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 7,
    lineHeight: 1.2,
  },
});
