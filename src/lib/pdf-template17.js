// template17.js
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Share,
} from 'react-native';
import { capitalizeWords, parseNotesHtml } from './utils';
import {
  invNo,
  getBillingAddress,
  getShippingAddress,
  getStateCode,
  numberToWords,
  formatPhoneNumber,
  formatQuantity,
} from './pdf-utils';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { BASE_URL } from '../config';

// Constants
const PRIMARY_BLUE = '#006EC8';
const DARK = '#2D3748';
const BORDER = '#006EC8';
const LIGHT_BLUE = '#C8E1FF';

export const Template17 = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
}) => {
  const scrollViewRef = useRef();

  // Helper functions
  const _getGSTIN = x => {
    return (
      x?.gstin ??
      x?.gstIn ??
      x?.gstNumber ??
      x?.gst_no ??
      x?.gst ??
      x?.gstinNumber ??
      x?.tax?.gstin ??
      null
    );
  };

  const money = n => {
    return Number(n || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const fmtDate = d => {
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleDateString('en-GB').replace(/\//g, '-');
  };

  const convertNumberToWords = n => {
    return numberToWords(n);
  };

  const checkValue = value => {
    const val = String(value || '');
    if (
      val === 'N/A' ||
      val === 'null' ||
      val === 'undefined' ||
      val === '' ||
      val.toLowerCase().includes('not available')
    ) {
      return '-';
    }
    return val;
  };

  // Prepare data with GST calculations
  const prepareData = () => {
    const items = transaction?.items || [];

    // Calculate totals
    const totalTaxable = items.reduce(
      (sum, item) => sum + (item.taxableValue || item.amount || 0),
      0,
    );
    const totalAmount = items.reduce(
      (sum, item) => sum + (item.total || item.lineTotal || 0),
      0,
    );
    const totalItems = items.length;
    const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    // GST calculations
    const totalCGST = items.reduce((sum, item) => sum + (item.cgst || 0), 0);
    const totalSGST = items.reduce((sum, item) => sum + (item.sgst || 0), 0);
    const totalIGST = items.reduce((sum, item) => sum + (item.igst || 0), 0);

    // Determine GST type
    const isGSTApplicable =
      totalCGST > 0 ||
      totalSGST > 0 ||
      totalIGST > 0 ||
      items.some(item => item.gstRate || item.gstPercentage);
    const isInterstate =
      totalIGST > 0 ||
      !company?.addressState ||
      !party?.state ||
      company.addressState !== party.state;
    const showIGST = isGSTApplicable && isInterstate;
    const showCGSTSGST = isGSTApplicable && !isInterstate;

    // Prepare items with GST data
    const itemsWithGST = items.map(item => ({
      ...item,
      name: capitalizeWords(item.name || ''),
      description: item.description || '',
      quantity: item.itemType === 'service' ? '-' : item.quantity || 0,
      pricePerUnit: item.pricePerUnit || item.rate || 0,
      taxableValue: item.taxableValue || item.amount || 0,
      gstRate: item.gstRate || item.gstPercentage || 0,
      cgst: item.cgst || 0,
      sgst: item.sgst || 0,
      igst: item.igst || 0,
      total: item.total || item.lineTotal || 0,
      hsnSac: item.hsnSac || item.code || 'N/A',
      unit: item.unit || 'PCS',
      itemType: item.itemType,
    }));

    return {
      totalTaxable,
      totalAmount,
      totalCGST,
      totalSGST,
      totalIGST,
      items: itemsWithGST,
      totalItems,
      totalQty,
      isGSTApplicable,
      isInterstate,
      showIGST,
      showCGSTSGST,
    };
  };

  const {
    totalTaxable,
    totalAmount,
    totalCGST,
    totalSGST,
    totalIGST,
    items,
    totalItems,
    totalQty,
    isGSTApplicable,
    showIGST,
    showCGSTSGST,
  } = prepareData();

  // Bank details logic
  const handleUndefined = (value, fallback = '-') => {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'string' && value.trim() === '') return fallback;
    if (value === 'N/A') return fallback;
    return value.toString();
  };

  const getBankDetails = () => {
    if (!bank || typeof bank !== 'object') {
      return {
        name: 'Bank Details Not Available',
        branch: '-',
        accNumber: '-',
        ifsc: '-',
        upiId: '-',
        upiName: '-',
        upiMobile: '-',
        qrCode: null,
      };
    }

    const bankObj = bank;
    const hasBankDetails =
      bankObj.bankName ||
      bankObj.branchName ||
      bankObj.branchAddress ||
      bankObj.accountNumber ||
      bankObj.accountNo ||
      bankObj.ifscCode ||
      bankObj.upiDetails?.upiId ||
      bankObj.upiId;

    if (!hasBankDetails) {
      return {
        name: 'Bank Details Not Available',
        branch: '-',
        accNumber: '-',
        ifsc: '-',
        upiId: '-',
        upiName: '-',
        upiMobile: '-',
        qrCode: bankObj.qrCode || null,
      };
    }

    const accountNumber =
      bankObj.accountNo ||
      bankObj.accountNumber ||
      bankObj.account_number ||
      '-';
    const upiId =
      bankObj.upiDetails?.upiId || bankObj.upiId || bankObj.upi_id || '-';
    const upiName = bankObj.upiDetails?.upiName || '-';
    const upiMobile = bankObj.upiDetails?.upiMobile || '-';

    return {
      name: handleUndefined(capitalizeWords(bankObj.bankName)),
      branch: handleUndefined(
        capitalizeWords(bankObj.branchName || bankObj.branchAddress),
      ),
      accNumber: handleUndefined(String(accountNumber)),
      ifsc: handleUndefined(capitalizeWords(bankObj.ifscCode)),
      upiId: handleUndefined(String(upiId)),
      upiName: handleUndefined(capitalizeWords(upiName)),
      upiMobile: handleUndefined(String(upiMobile)),
      qrCode: bankObj.qrCode || null,
    };
  };

  const bankDetails = getBankDetails();
  const areBankDetailsAvailable =
    bankDetails.name !== 'Bank Details Not Available';

  const invoiceData = {
    invoiceNumber: checkValue(invNo(transaction)),
    date: checkValue(fmtDate(transaction?.date) || fmtDate(new Date())),
    poNumber: checkValue(transaction?.poNumber),
    poDate: checkValue(fmtDate(transaction?.poDate)),
    eWayNo: checkValue(transaction?.eWayBillNo),

    placeOfSupply: party?.state
      ? `${capitalizeWords(party.state)} (${getStateCode(party.state) || '-'})`
      : '-',

    company: {
      name: capitalizeWords(company?.businessName || 'Your Company Name'),
      address: capitalizeWords(company?.address || 'Company Address Missing'),
      gstin: checkValue(_getGSTIN(company)),
      pan: checkValue(company?.panNumber),
      state: checkValue(company?.addressState),
      city: capitalizeWords(company?.City || '-'),
      phone: checkValue(
        company?.mobileNumber
          ? formatPhoneNumber(company.mobileNumber)
          : company?.Telephone
          ? formatPhoneNumber(company.Telephone)
          : '-',
      ),
      email: checkValue(company?.email || company?.emailId),
    },

    invoiceTo: {
      name: capitalizeWords(party?.name || 'Client Name'),
      billingAddress: capitalizeWords(getBillingAddress(party)),
      gstin: checkValue(_getGSTIN(party)),
      pan: checkValue(party?.panNumber),
      state: checkValue(party?.state),
      email: checkValue(party?.email),
      phone: checkValue(
        party?.contactNumber ? formatPhoneNumber(party.contactNumber) : '-',
      ),
    },

    shippingAddress: {
      name: capitalizeWords(
        shippingAddress?.name || party?.name || 'Client Name',
      ),
      label: capitalizeWords(shippingAddress?.label || party?.name || '-'),
      address: capitalizeWords(
        getShippingAddress(shippingAddress, getBillingAddress(party)),
      ),
      state: checkValue(shippingAddress?.state || party?.state),
      contactNumber: checkValue(shippingAddress?.contactNumber),
    },
  };

  const {
    title,
    isList,
    items: notesItems,
  } = parseNotesHtml(transaction?.notes || '');
  const termsTitle = title || 'Terms and Conditions';

  // Table rendering functions
  const renderTableHeaders = () => {
    if (showCGSTSGST) {
      return [
        'Sr.No.',
        'Name of Product / Service',
        'HSN/SAC',
        'Qty',
        'Unit',
        'Rate (Rs.)',
        'Taxable Value (Rs.)',
        'CGST %',
        'CGST Amount(Rs.)',
        'SGST %',
        'SGST Amount(Rs.)',
        'Total (Rs.)',
      ];
    } else if (showIGST) {
      return [
        'Sr.No.',
        'Name of Product / Service',
        'HSN/SAC',
        'Qty',
        'Unit',
        'Rate (Rs.)',
        'Taxable Value (Rs.)',
        'IGST %',
        'IGST Amount (Rs.)',
        'Total (Rs.)',
      ];
    } else {
      return [
        'Sr.No.',
        'Name of Product / Service',
        'HSN/SAC',
        'Qty',
        'Unit',
        'Rate (Rs.)',
        'Taxable Value (Rs.)',
        'Total (Rs.)',
      ];
    }
  };

  const renderTableRow = (item, index) => {
    const baseData = [
      index + 1,
      `${capitalizeWords(item.name || '')}\n${
        item.description ? item.description.split('\n').join(' / ') : ''
      }`,
      checkValue(item.hsnSac),
      item.quantity === '-' ? '-' : Number(item.quantity),
      item.itemType === 'service' ? '-' : item.unit || 'PCS',
      money(item.pricePerUnit),
      money(item.taxableValue),
    ];

    if (showCGSTSGST) {
      const cgstPct = (item.gstRate || 0) / 2;
      const sgstPct = (item.gstRate || 0) / 2;
      return [
        ...baseData,
        `${cgstPct}`,
        money(item.cgst || 0),
        `${sgstPct}`,
        money(item.sgst || 0),
        money(item.total),
      ];
    } else if (showIGST) {
      return [
        ...baseData,
        `${item.gstRate || 0}`,
        money(item.igst || 0),
        money(item.total),
      ];
    } else {
      return [...baseData, money(item.total)];
    }
  };

  // PDF Generation function
  const generatePDF = async () => {
    try {
      const htmlContent = generateHTMLContent();

      const options = {
        html: htmlContent,
        fileName: `Invoice_${invoiceData.invoiceNumber}`,
        directory: 'Documents',
      };

      const file = await RNHTMLtoPDF.convert(options);

      if (file.filePath) {
        await Share.open({
          url: `file://${file.filePath}`,
          type: 'application/pdf',
          filename: `Invoice_${invoiceData.invoiceNumber}`,
        });
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  };

  // Generate HTML content for PDF
  const generateHTMLContent = () => {
    const renderTableHeadersHTML = () => {
      if (showCGSTSGST) {
        return `
          <tr>
            <th>Sr.No.</th>
            <th>Name of Product / Service</th>
            <th>HSN/SAC</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Rate (Rs.)</th>
            <th>Taxable Value (Rs.)</th>
            <th colspan="2">CGST</th>
            <th colspan="2">SGST</th>
            <th>Total (Rs.)</th>
          </tr>
          <tr>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th>%</th>
            <th>Amount(Rs.)</th>
            <th>%</th>
            <th>Amount(Rs.)</th>
            <th></th>
          </tr>
        `;
      } else if (showIGST) {
        return `
          <tr>
            <th>Sr.No.</th>
            <th>Name of Product / Service</th>
            <th>HSN/SAC</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Rate (Rs.)</th>
            <th>Taxable Value (Rs.)</th>
            <th colspan="2">IGST</th>
            <th>Total (Rs.)</th>
          </tr>
          <tr>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th>%</th>
            <th>Amount (Rs.)</th>
            <th></th>
          </tr>
        `;
      } else {
        return `
          <tr>
            <th>Sr.No.</th>
            <th>Name of Product / Service</th>
            <th>HSN/SAC</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Rate (Rs.)</th>
            <th>Taxable Value (Rs.)</th>
            <th>Total (Rs.)</th>
          </tr>
        `;
      }
    };

    const renderTableRowsHTML = () => {
      return items
        .map((item, index) => {
          const rowData = renderTableRow(item, index);
          return `
          <tr>
            ${rowData.map(cell => `<td>${cell}</td>`).join('')}
          </tr>
        `;
        })
        .join('');
    };

    const renderTaxSummaryHTML = () => {
      // Group by HSN/SAC
      const groupedByHSN = {};
      items.forEach(item => {
        const key = checkValue(item.hsnSac);
        if (!groupedByHSN[key]) {
          groupedByHSN[key] = {
            hsn: key,
            taxable: 0,
            cgstAmt: 0,
            sgstAmt: 0,
            igstAmt: 0,
            total: 0,
          };
        }
        groupedByHSN[key].taxable += item.taxableValue || 0;
        groupedByHSN[key].cgstAmt += item.cgst || 0;
        groupedByHSN[key].sgstAmt += item.sgst || 0;
        groupedByHSN[key].igstAmt += item.igst || 0;
        groupedByHSN[key].total += item.total || 0;
      });

      const taxSummaryData = Object.values(groupedByHSN);

      if (showCGSTSGST) {
        return `
          <table class="tax-summary">
            <thead>
              <tr>
                <th>HSN / SAC</th>
                <th>Taxable Value (Rs.)</th>
                <th>%</th>
                <th>CGST (Rs.)</th>
                <th>%</th>
                <th>SGST (Rs.)</th>
                <th>Total (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${taxSummaryData
                .map(
                  item => `
                <tr>
                  <td>${item.hsn}</td>
                  <td>${money(item.taxable)}</td>
                  <td>${
                    item.taxable
                      ? (((item.cgstAmt / item.taxable) * 100) / 2).toFixed(2)
                      : '0'
                  }</td>
                  <td>${money(item.cgstAmt)}</td>
                  <td>${
                    item.taxable
                      ? (((item.sgstAmt / item.taxable) * 100) / 2).toFixed(2)
                      : '0'
                  }</td>
                  <td>${money(item.sgstAmt)}</td>
                  <td>${money(item.total)}</td>
                </tr>
              `,
                )
                .join('')}
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td><strong>${money(totalTaxable)}</strong></td>
                <td></td>
                <td><strong>${money(totalCGST)}</strong></td>
                <td></td>
                <td><strong>${money(totalSGST)}</strong></td>
                <td><strong>${money(totalAmount)}</strong></td>
              </tr>
            </tbody>
          </table>
        `;
      } else if (showIGST) {
        return `
          <table class="tax-summary">
            <thead>
              <tr>
                <th>HSN / SAC</th>
                <th>Taxable Value (Rs.)</th>
                <th>%</th>
                <th>IGST (Rs.)</th>
                <th>Total (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${taxSummaryData
                .map(
                  item => `
                <tr>
                  <td>${item.hsn}</td>
                  <td>${money(item.taxable)}</td>
                  <td>${
                    item.taxable
                      ? ((item.igstAmt / item.taxable) * 100).toFixed(2)
                      : '0'
                  }</td>
                  <td>${money(item.igstAmt)}</td>
                  <td>${money(item.total)}</td>
                </tr>
              `,
                )
                .join('')}
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td><strong>${money(totalTaxable)}</strong></td>
                <td></td>
                <td><strong>${money(totalIGST)}</strong></td>
                <td><strong>${money(totalAmount)}</strong></td>
              </tr>
            </tbody>
          </table>
        `;
      } else {
        return `
          <table class="tax-summary">
            <thead>
              <tr>
                <th>HSN / SAC</th>
                <th>Taxable Value (Rs.)</th>
                <th>Total (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${taxSummaryData
                .map(
                  item => `
                <tr>
                  <td>${item.hsn}</td>
                  <td>${money(item.taxable)}</td>
                  <td>${money(item.total)}</td>
                </tr>
              `,
                )
                .join('')}
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td><strong>${money(totalTaxable)}</strong></td>
                <td><strong>${money(totalAmount)}</strong></td>
              </tr>
            </tbody>
          </table>
        `;
      }
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #2D3748; 
            font-size: 12px;
          }
          .frame {
            border: 2px solid ${PRIMARY_BLUE};
            padding: 15px;
            margin-bottom: 20px;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 20px; 
          }
          .title { 
            font-size: 18px; 
            font-weight: bold; 
            color: ${PRIMARY_BLUE};
            text-align: center;
            margin-bottom: 10px;
          }
          .company-name { 
            font-size: 14px; 
            font-weight: bold; 
            color: #000;
            margin-bottom: 8px; 
          }
          .separator { 
            height: 1px; 
            background: ${BORDER}; 
            margin: 15px 0; 
          }
          .buyer-consignee-section {
            display: flex;
            border-top: 1px solid ${BORDER};
            border-bottom: 1px solid ${BORDER};
            margin: 20px 0;
          }
          .buyer-column, .consignee-column {
            flex: 1;
            padding: 10px;
          }
          .vertical-divider {
            border-left: 1px solid ${BORDER};
            margin: 0 10px;
          }
          .section-title {
            font-size: 10px;
            font-weight: bold;
            color: #2D3748;
            margin-bottom: 12px;
          }
          .detail-row {
            display: flex;
            margin-bottom: 8px;
          }
          .detail-label {
            font-size: 9px;
            font-weight: bold;
            color: #2D3748;
            width: 80px;
          }
          .detail-value {
            font-size: 9px;
            color: #2D3748;
            flex: 1;
          }
          .meta-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .meta-column {
            flex: 1;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding: 8px;
            border-bottom: 1px solid #f0f0f0;
          }
          .meta-label {
            font-size: 9px;
            font-weight: bold;
            color: #2D3748;
          }
          .meta-value {
            font-size: 9px;
            color: ${PRIMARY_BLUE};
            font-weight: bold;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
            font-size: 8px;
          }
          th { 
            background: ${LIGHT_BLUE}; 
            color: #2D3748; 
            padding: 8px; 
            text-align: center; 
            font-size: 7px;
            font-weight: bold;
            border: 1px solid ${BORDER};
          }
          td { 
            border: 1px solid ${BORDER}; 
            padding: 6px; 
            text-align: center; 
            font-size: 7.5px;
          }
          .tax-summary {
            margin: 20px 0;
          }
          .tax-summary th {
            background: ${LIGHT_BLUE};
          }
          .total-row {
            background: #f0f0f0;
            font-weight: bold;
          }
          .totals-section {
            margin: 20px 0;
          }
          .amount-words {
            font-size: 8px;
            color: #2D3748;
            margin: 10px 0;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
            border-top: 1px solid ${BORDER};
            padding-top: 20px;
          }
          .bank-section {
            flex: 1;
          }
          .signature-section {
            width: 200px;
            text-align: center;
          }
          .signature-box {
            width: 150px;
            height: 60px;
            border: 0.5px solid #DCE0E4;
            margin: 10px auto;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .terms-section {
            margin-bottom: 20px;
          }
          .terms-title {
            font-size: 10px;
            font-weight: bold;
            color: #000;
            margin-bottom: 10px;
          }
          .term-item {
            font-size: 8px;
            color: #2D3748;
            margin-bottom: 6px;
            line-height: 12px;
          }
          .qr-placeholder {
            width: 80px;
            height: 80px;
            background: #f0f0f0;
            border: 0.5px solid #DCE0E4;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 8px 0;
          }
          .page-number {
            text-align: center;
            font-size: 8px;
            color: #697077;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="frame">
          <!-- Header -->
          <div class="title">
            ${
              transaction?.type === 'proforma'
                ? 'PROFORMA INVOICE'
                : isGSTApplicable
                ? 'TAX INVOICE'
                : 'INVOICE'
            }
          </div>

          <div class="header">
            <div class="company-info">
              <div class="company-name">${invoiceData.company.name.toUpperCase()}</div>
              ${
                invoiceData.company.gstin !== '-'
                  ? `
                <div class="detail-row">
                  <div class="detail-label">GSTIN:</div>
                  <div class="detail-value">${invoiceData.company.gstin}</div>
                </div>
              `
                  : ''
              }
              <div class="detail-value">${invoiceData.company.address}</div>
              ${
                invoiceData.company.city !== '-'
                  ? `
                <div class="detail-value">${invoiceData.company.city}</div>
              `
                  : ''
              }
              ${
                invoiceData.company.state !== '-'
                  ? `
                <div class="detail-row">
                  <div class="detail-label">State:</div>
                  <div class="detail-value">${invoiceData.company.state}</div>
                </div>
              `
                  : ''
              }
              ${
                invoiceData.company.phone !== '-'
                  ? `
                <div class="detail-row">
                  <div class="detail-label">Phone:</div>
                  <div class="detail-value">${invoiceData.company.phone}</div>
                </div>
              `
                  : ''
              }
            </div>

            <div class="meta-section">
              <div class="meta-column">
                <div class="meta-row">
                  <div class="meta-label">Invoice No.</div>
                  <div class="meta-value">${invoiceData.invoiceNumber}</div>
                </div>
                <div class="meta-row">
                  <div class="meta-label">Invoice Date</div>
                  <div class="meta-value">${invoiceData.date}</div>
                </div>
                <div class="meta-row">
                  <div class="meta-label">P.O. No.</div>
                  <div class="meta-value">${invoiceData.poNumber}</div>
                </div>
                <div class="meta-row">
                  <div class="meta-label">P.O. Date</div>
                  <div class="meta-value">${invoiceData.poDate}</div>
                </div>
                <div class="meta-row">
                  <div class="meta-label">Due Date</div>
                  <div class="meta-value">${invoiceData.date}</div>
                </div>
                <div class="meta-row">
                  <div class="meta-label">E-Way No.</div>
                  <div class="meta-value">${invoiceData.eWayNo}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Buyer/Consignee Section -->
          <div class="buyer-consignee-section">
            <div class="buyer-column">
              <div class="section-title">Details of Buyer | Billed to:</div>
              <div class="detail-row">
                <div class="detail-label">Name:</div>
                <div class="detail-value">${invoiceData.invoiceTo.name}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Address:</div>
                <div class="detail-value">${
                  invoiceData.invoiceTo.billingAddress
                }</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">GSTIN:</div>
                <div class="detail-value">${invoiceData.invoiceTo.gstin}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">PAN:</div>
                <div class="detail-value">${invoiceData.invoiceTo.pan}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Phone:</div>
                <div class="detail-value">${invoiceData.invoiceTo.phone}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Place of Supply:</div>
                <div class="detail-value">${invoiceData.placeOfSupply}</div>
              </div>
            </div>

            <div class="vertical-divider"></div>

            <div class="consignee-column">
              <div class="section-title">Details of Consigned | Shipped to:</div>
              <div class="detail-row">
                <div class="detail-label">Name:</div>
                <div class="detail-value">${
                  invoiceData.shippingAddress.name
                }</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Address:</div>
                <div class="detail-value">${
                  invoiceData.shippingAddress.address
                }</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Country:</div>
                <div class="detail-value">India</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Phone:</div>
                <div class="detail-value">${
                  invoiceData.shippingAddress.contactNumber
                }</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">GSTIN:</div>
                <div class="detail-value">${invoiceData.invoiceTo.gstin}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">State:</div>
                <div class="detail-value">${
                  invoiceData.shippingAddress.state
                }</div>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <table>
            <thead>
              ${renderTableHeadersHTML()}
            </thead>
            <tbody>
              ${renderTableRowsHTML()}
            </tbody>
          </table>

          <!-- Tax Summary -->
          ${renderTaxSummaryHTML()}

          <!-- Amount in Words -->
          <div class="amount-words">
            <strong>Total Tax in words:</strong> ${convertNumberToWords(
              totalAmount,
            )}
          </div>

          <!-- Footer Section -->
          <div class="footer-section">
            <div class="bank-section">
              <div class="section-title">Bank Details</div>
              ${
                areBankDetailsAvailable
                  ? `
                <div class="detail-row">
                  <div class="detail-label">Name:</div>
                  <div class="detail-value">${bankDetails.name}</div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">Branch:</div>
                  <div class="detail-value">${bankDetails.branch}</div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">IFSC:</div>
                  <div class="detail-value">${bankDetails.ifsc}</div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">Acc. Number:</div>
                  <div class="detail-value">${bankDetails.accNumber}</div>
                </div>
                ${
                  bankDetails.upiId !== '-'
                    ? `
                  <div class="detail-row">
                    <div class="detail-label">UPI ID:</div>
                    <div class="detail-value">${bankDetails.upiId}</div>
                  </div>
                `
                    : ''
                }
                ${
                  bankDetails.upiName !== '-'
                    ? `
                  <div class="detail-row">
                    <div class="detail-label">UPI Name:</div>
                    <div class="detail-value">${bankDetails.upiName}</div>
                  </div>
                `
                    : ''
                }
                ${
                  bankDetails.upiMobile !== '-'
                    ? `
                  <div class="detail-row">
                    <div class="detail-label">UPI Mobile:</div>
                    <div class="detail-value">${bankDetails.upiMobile}</div>
                  </div>
                `
                    : ''
                }
                ${
                  bankDetails.qrCode
                    ? `
                  <div class="section-title">QR Code</div>
                  <div class="qr-placeholder">
                    QR Code Image
                  </div>
                `
                    : ''
                }
              `
                  : `
                <div class="detail-value">No bank details available</div>
              `
              }
            </div>

            <div class="signature-section">
              <div class="section-title">For ${invoiceData.company.name}</div>
              <div class="signature-box">
                Authorised Signatory
              </div>
            </div>
          </div>

          <!-- Terms and Conditions -->
          <div class="terms-section">
            <div class="terms-title">${termsTitle}:</div>
            ${
              notesItems.length > 0
                ? notesItems
                    .map(
                      item => `
                <div class="term-item">${isList ? '• ' : ''}${item}</div>
              `,
                    )
                    .join('')
                : '<div class="term-item">No terms and conditions specified</div>'
            }
          </div>

          <div class="page-number">Page 1 of 1</div>
        </div>
      </body>
      </html>
    `;
  };

  // Add PDF generation button to UI
  const renderPDFButton = () => (
    <View style={styles.pdfButtonContainer}>
      <Text style={styles.pdfButton} onPress={generatePDF}>
        Generate PDF
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderPDFButton()}
      <ScrollView
        style={styles.scrollView}
        ref={scrollViewRef}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Frame */}
        <View style={styles.frame}>
          {/* Title */}
          <Text style={styles.title}>
            {transaction?.type === 'proforma'
              ? 'PROFORMA INVOICE'
              : isGSTApplicable
              ? 'TAX INVOICE'
              : 'INVOICE'}
          </Text>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>
                {invoiceData.company.name.toUpperCase()}
              </Text>

              {invoiceData.company.gstin !== '-' && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>GSTIN:</Text>
                  <Text style={styles.detailValue}>
                    {invoiceData.company.gstin}
                  </Text>
                </View>
              )}

              <Text style={styles.detailValue}>
                {invoiceData.company.address}
              </Text>

              {invoiceData.company.city !== '-' && (
                <Text style={styles.detailValue}>
                  {invoiceData.company.city}
                </Text>
              )}

              {invoiceData.company.state !== '-' && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>State:</Text>
                  <Text style={styles.detailValue}>
                    {invoiceData.company.state}
                  </Text>
                </View>
              )}

              {invoiceData.company.phone !== '-' && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>
                    {invoiceData.company.phone}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.metaSection}>
              <View style={styles.metaColumn}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Invoice No.</Text>
                  <Text style={styles.metaValue}>
                    {invoiceData.invoiceNumber}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Invoice Date</Text>
                  <Text style={styles.metaValue}>{invoiceData.date}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>P.O. No.</Text>
                  <Text style={styles.metaValue}>{invoiceData.poNumber}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>P.O. Date</Text>
                  <Text style={styles.metaValue}>{invoiceData.poDate}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Due Date</Text>
                  <Text style={styles.metaValue}>{invoiceData.date}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>E-Way No.</Text>
                  <Text style={styles.metaValue}>{invoiceData.eWayNo}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Buyer/Consignee Section */}
          <View style={styles.buyerConsigneeSection}>
            <View style={styles.buyerColumn}>
              <Text style={styles.sectionTitle}>
                Details of Buyer | Billed to:
              </Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.invoiceTo.name}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Address:</Text>
                <Text style={[styles.detailValue, styles.addressText]}>
                  {invoiceData.invoiceTo.billingAddress}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>GSTIN:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.invoiceTo.gstin}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>PAN:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.invoiceTo.pan}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.invoiceTo.phone}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Place of Supply:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.placeOfSupply}
                </Text>
              </View>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.consigneeColumn}>
              <Text style={styles.sectionTitle}>
                Details of Consigned | Shipped to:
              </Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.shippingAddress.name}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Address:</Text>
                <Text style={[styles.detailValue, styles.addressText]}>
                  {invoiceData.shippingAddress.address}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Country:</Text>
                <Text style={styles.detailValue}>India</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.shippingAddress.contactNumber}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>GSTIN:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.invoiceTo.gstin}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>State:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.shippingAddress.state}
                </Text>
              </View>
            </View>
          </View>

          {/* Items Table */}
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              {renderTableHeaders().map((header, index) => (
                <Text key={index} style={styles.tableHeaderText}>
                  {header}
                </Text>
              ))}
            </View>

            {/* Table Rows */}
            {items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                {renderTableRow(item, index).map((cell, cellIndex) => (
                  <Text key={cellIndex} style={styles.tableCell}>
                    {cell}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          {/* Tax Summary */}
          <View style={styles.taxSummary}>
            <Text style={styles.taxSummaryTitle}>Tax Summary</Text>
            <View style={styles.taxSummaryTable}>
              {/* Tax summary content would go here */}
              <Text style={styles.taxSummaryText}>
                Total Taxable: {money(totalTaxable)}
              </Text>
              {showIGST && (
                <Text style={styles.taxSummaryText}>
                  Total IGST: {money(totalIGST)}
                </Text>
              )}
              {showCGSTSGST && (
                <>
                  <Text style={styles.taxSummaryText}>
                    Total CGST: {money(totalCGST)}
                  </Text>
                  <Text style={styles.taxSummaryText}>
                    Total SGST: {money(totalSGST)}
                  </Text>
                </>
              )}
              <Text style={[styles.taxSummaryText, styles.finalTotal]}>
                Grand Total: {money(totalAmount)}
              </Text>
            </View>
          </View>

          {/* Amount in Words */}
          <View style={styles.amountInWords}>
            <Text style={styles.amountLabel}>Total Tax in words:</Text>
            <Text style={styles.amountWords}>
              {convertNumberToWords(totalAmount)}
            </Text>
          </View>

          {/* Footer Section */}
          <View style={styles.footerSection}>
            <View style={styles.bankSection}>
              <Text style={styles.sectionTitle}>Bank Details</Text>

              {areBankDetailsAvailable ? (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{bankDetails.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Branch:</Text>
                    <Text style={styles.detailValue}>{bankDetails.branch}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>IFSC:</Text>
                    <Text style={styles.detailValue}>{bankDetails.ifsc}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Acc. Number:</Text>
                    <Text style={styles.detailValue}>
                      {bankDetails.accNumber}
                    </Text>
                  </View>
                  {bankDetails.upiId !== '-' && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>UPI ID:</Text>
                      <Text style={styles.detailValue}>
                        {bankDetails.upiId}
                      </Text>
                    </View>
                  )}
                  {bankDetails.upiName !== '-' && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>UPI Name:</Text>
                      <Text style={styles.detailValue}>
                        {bankDetails.upiName}
                      </Text>
                    </View>
                  )}
                  {bankDetails.upiMobile !== '-' && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>UPI Mobile:</Text>
                      <Text style={styles.detailValue}>
                        {bankDetails.upiMobile}
                      </Text>
                    </View>
                  )}
                  {bankDetails.qrCode && (
                    <>
                      <Text style={styles.sectionTitle}>QR Code</Text>
                      <View style={styles.qrPlaceholder}>
                        <Text style={styles.qrText}>QR Code</Text>
                      </View>
                    </>
                  )}
                </>
              ) : (
                <Text style={styles.detailValue}>
                  No bank details available
                </Text>
              )}
            </View>

            <View style={styles.signatureSection}>
              <Text style={styles.signatureTitle}>
                For {invoiceData.company.name}
              </Text>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureText}>Authorised Signatory</Text>
              </View>
            </View>
          </View>

          {/* Terms and Conditions */}
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>{termsTitle}:</Text>
            {notesItems.length > 0 ? (
              notesItems.map((item, index) => (
                <Text key={index} style={styles.termItem}>
                  {isList ? '• ' : ''}
                  {item}
                </Text>
              ))
            ) : (
              <Text style={styles.termItem}>
                No terms and conditions specified
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 15,
  },
  pdfButtonContainer: {
    padding: 10,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
  },
  pdfButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  frame: {
    borderWidth: 2,
    borderColor: PRIMARY_BLUE,
    padding: 15,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PRIMARY_BLUE,
    textAlign: 'center',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: DARK,
    width: 60,
  },
  detailValue: {
    fontSize: 9,
    color: DARK,
    flex: 1,
  },
  addressText: {
    flex: 1,
    flexWrap: 'wrap',
  },
  metaSection: {
    width: 200,
  },
  metaColumn: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: DARK,
  },
  metaValue: {
    fontSize: 9,
    color: PRIMARY_BLUE,
    fontWeight: 'bold',
  },
  buyerConsigneeSection: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginVertical: 20,
    paddingVertical: 10,
  },
  buyerColumn: {
    flex: 1,
    paddingRight: 10,
  },
  consigneeColumn: {
    flex: 1,
    paddingLeft: 10,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: BORDER,
    marginHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: DARK,
    marginBottom: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: LIGHT_BLUE,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: DARK,
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: 7.5,
    color: DARK,
    flex: 1,
    textAlign: 'center',
  },
  taxSummary: {
    marginBottom: 20,
  },
  taxSummaryTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: DARK,
    marginBottom: 10,
  },
  taxSummaryTable: {
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
  },
  taxSummaryText: {
    fontSize: 9,
    color: DARK,
    marginBottom: 6,
  },
  finalTotal: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  amountInWords: {
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  amountWords: {
    fontSize: 8,
    color: DARK,
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 20,
  },
  bankSection: {
    flex: 1,
    marginRight: 20,
  },
  signatureSection: {
    width: 150,
    alignItems: 'center',
  },
  signatureTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  signatureBox: {
    width: 150,
    height: 60,
    borderWidth: 0.5,
    borderColor: '#DCE0E4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureText: {
    fontSize: 8,
    color: '#697077',
  },
  qrPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#DCE0E4',
    marginTop: 8,
  },
  qrText: {
    fontSize: 8,
    color: '#697077',
  },
  termsSection: {
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  termItem: {
    fontSize: 8,
    color: DARK,
    marginBottom: 6,
    lineHeight: 12,
  },
});
