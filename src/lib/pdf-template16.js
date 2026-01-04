// template16.js
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
} from './pdf-utils';
import { generatePDF } from 'react-native-html-to-pdf';

const Template16HTML = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
}) => {
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
    if (!d) return 'N/A';
    const date = new Date(d);
    return date.toLocaleDateString('en-GB').replace(/\//g, '-');
  };

  const convertNumberToWords = n => {
    return numberToWords(n);
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

    return {
      totalTaxable,
      totalAmount,
      totalCGST,
      totalSGST,
      totalIGST,
      items,
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

  const invoiceData = {
    invoiceNumber: invNo(transaction),
    date: fmtDate(transaction?.date) || fmtDate(new Date()),
    poNumber: transaction?.poNumber || 'N/A',
    poDate: fmtDate(transaction?.poDate) || 'N/A',
    eWayNo: transaction?.eWayBillNo || 'N/A',

    placeOfSupply: party?.state
      ? `${capitalizeWords(party.state)} (${getStateCode(party.state) || '-'})`
      : 'N/A',

    company: {
      name: capitalizeWords(company?.businessName || 'Your Company Name'),
      address: capitalizeWords(company?.address || 'Company Address Missing'),
      gstin: _getGSTIN(company) || 'N/A',
      pan: company?.panNumber || 'N/A',
      state: company?.addressState
        ? `${capitalizeWords(company?.addressState)} (${
            getStateCode(company?.addressState) || '-'
          })`
        : 'N/A',
      city: capitalizeWords(company?.City || 'N/A'),
      phone: company?.mobileNumber || 'N/A',
      email: company?.email || company?.emailId || 'N/A',
    },

    invoiceTo: {
      name: capitalizeWords(party?.name || 'Client Name'),
      billingAddress: capitalizeWords(getBillingAddress(party)),
      gstin: _getGSTIN(party) || 'N/A',
      pan: party?.panNumber || 'N/A',
      state: party?.state
        ? `${capitalizeWords(party.state)} (${
            getStateCode(party.state) || '-'
          })`
        : 'N/A',
      email: party?.email || 'N/A',
    },

    shippingAddress: {
      name: capitalizeWords(
        shippingAddress?.name || party?.name || 'Client Name',
      ),
      address: capitalizeWords(
        getShippingAddress(shippingAddress, getBillingAddress(party)),
      ),
      state: shippingAddress?.state
        ? `${capitalizeWords(shippingAddress.state)} (${
            getStateCode(shippingAddress.state) || '-'
          })`
        : party?.state
        ? `${capitalizeWords(party.state)} (${
            getStateCode(party.state) || '-'
          })`
        : 'N/A',
    },
  };

  const {
    title,
    isList,
    items: notesItems,
  } = parseNotesHtml(transaction?.notes || '');
  const termsTitle = title || 'Terms and Conditions';

  const getBankDetails = () => ({
    name: bank?.bankName || 'N/A',
    branch: bank?.branchName || bank?.branchAddress || 'N/A',
    accNumber: bank?.accountNumber || 'N/A',
    ifsc: bank?.ifscCode || 'N/A',
    upiId: bank?.upiId || 'N/A',
  });

  const bankDetails = getBankDetails();

  // Table rendering functions
  const renderTableHeaders = () => {
    const baseHeaders = [
      'Sr.',
      'Product/Service',
      'HSN/SAC',
      'Rate',
      'Qty',
      'Taxable Value',
    ];

    if (showIGST) {
      return [...baseHeaders, 'IGST %', 'IGST Amount', 'Total'];
    } else if (showCGSTSGST) {
      return [
        ...baseHeaders,
        'CGST %',
        'CGST Amount',
        'SGST %',
        'SGST Amount',
        'Total',
      ];
    } else {
      return [...baseHeaders, 'Total'];
    }
  };

  const renderTableRow = (item, index) => {
    const baseData = [
      index + 1,
      `${capitalizeWords(item.name || '')}\n${
        item.description ? item.description.split('\n').join(' / ') : ''
      }`,
      item.hsnSac || item.code || 'N/A',
      money(item.pricePerUnit || item.rate || 0),
      `${Number(item.quantity)} ${item.unit || 'PCS'}`,
      money(item.taxableValue || item.amount || 0),
    ];

    if (showIGST) {
      return [
        ...baseData,
        `${item.gstRate || item.gstPercentage || 0}%`,
        money(item.igst || item.lineTax || 0),
        money(item.total || item.lineTotal || 0),
      ];
    } else if (showCGSTSGST) {
      const cgst = (item.cgst || item.lineTax || 0) / 2;
      const sgst = (item.sgst || item.lineTax || 0) / 2;
      const gstRate = item.gstRate || item.gstPercentage || 0;
      return [
        ...baseData,
        `${gstRate / 2}%`,
        money(cgst),
        `${gstRate / 2}%`,
        money(sgst),
        money(item.total || item.lineTotal || 0),
      ];
    } else {
      return [...baseData, money(item.total || item.lineTotal || 0)];
    }
  };

  // Generate HTML content for PDF
  const generateHTMLContent = () => {
    const renderTableHeadersHTML = () => {
      const headers = renderTableHeaders();
      return headers.map(header => `<th>${header}</th>`).join('');
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
          .header { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 20px; 
          }
          .title { 
            font-size: 20px; 
            font-weight: bold; 
            margin-bottom: 10px; 
          }
          .company-name { 
            font-size: 15px; 
            font-weight: bold; 
            color: #1873CC; 
            margin-bottom: 8px; 
          }
          .separator { 
            height: 2px; 
            background: #1873CC; 
            margin: 15px 0; 
          }
          .details-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .details-column {
            flex: 1;
            margin-right: 10px;
          }
          .meta-column {
            width: 150px;
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
            width: 50px;
          }
          .detail-value {
            font-size: 9px;
            color: #2D3748;
            flex: 1;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
            font-size: 8px;
          }
          th { 
            background: #1873CC; 
            color: white; 
            padding: 8px; 
            text-align: center; 
            font-size: 7px;
            font-weight: bold;
          }
          td { 
            border: 1px solid #DCE0E4; 
            padding: 6px; 
            text-align: center; 
            font-size: 7.5px;
          }
          .totals-section {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
          }
          .totals-left {
            flex: 1;
            margin-right: 20px;
          }
          .totals-right {
            width: 200px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            border-bottom: 1px solid #DCE0E4;
            background: #fff;
          }
          .final-total {
            background: #f0f0f0;
            margin-top: 8px;
            font-weight: bold;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .bank-section {
            flex: 1;
            margin-right: 20px;
          }
          .signature-section {
            width: 150px;
            text-align: center;
          }
          .signature-box {
            width: 150px;
            height: 50px;
            border: 0.5px solid #DCE0E4;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 10px;
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
          .page-number {
            text-align: center;
            font-size: 8px;
            color: #697077;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="header-left">
            <div class="title">TAX INVOICE</div>
            <div class="company-name">${invoiceData.company.name.toUpperCase()}</div>
            ${
              invoiceData.company.gstin !== 'N/A'
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
              invoiceData.company.city !== 'N/A'
                ? `
              <div class="detail-value">${invoiceData.company.city}</div>
            `
                : ''
            }
            ${
              invoiceData.company.pan !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">PAN:</div>
                <div class="detail-value">${invoiceData.company.pan}</div>
              </div>
            `
                : ''
            }
            ${
              invoiceData.company.phone !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">Phone:</div>
                <div class="detail-value">${invoiceData.company.phone}</div>
              </div>
            `
                : ''
            }
            ${
              invoiceData.company.state !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">State:</div>
                <div class="detail-value">${invoiceData.company.state}</div>
              </div>
            `
                : ''
            }
          </div>
          <div class="logo-placeholder">
            <!-- Logo would go here -->
          </div>
        </div>

        <div class="separator"></div>

        <!-- Customer & Shipping Details -->
        <div class="details-section">
          <div class="details-column">
            <div class="section-title">Customer Details:</div>
            ${
              invoiceData.invoiceTo.name !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">Name:</div>
                <div class="detail-value">${invoiceData.invoiceTo.name}</div>
              </div>
            `
                : ''
            }
            ${
              invoiceData.invoiceTo.email !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-value">${invoiceData.invoiceTo.email}</div>
              </div>
            `
                : ''
            }
            <div class="detail-row">
              <div class="detail-label">Phone No:</div>
              <div class="detail-value">${party?.contactNumber || 'N/A'}</div>
            </div>
            ${
              invoiceData.invoiceTo.gstin !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">GSTIN:</div>
                <div class="detail-value">${invoiceData.invoiceTo.gstin}</div>
              </div>
            `
                : ''
            }
            ${
              invoiceData.invoiceTo.pan !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">PAN:</div>
                <div class="detail-value">${invoiceData.invoiceTo.pan}</div>
              </div>
            `
                : ''
            }
            <div class="detail-row">
              <div class="detail-label">Address:</div>
              <div class="detail-value">${
                invoiceData.invoiceTo.billingAddress
              }</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Place of Supply:</div>
              <div class="detail-value">${invoiceData.placeOfSupply}</div>
            </div>
          </div>

          <div class="details-column">
            <div class="section-title">Shipping address:</div>
            <div class="detail-row">
              <div class="detail-label">Name:</div>
              <div class="detail-value">
                ${
                  invoiceData.shippingAddress.name !== 'Client Name'
                    ? invoiceData.shippingAddress.name
                    : '-'
                }
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Phone:</div>
              <div class="detail-value">
                ${
                  shippingAddress?.contactNumber &&
                  shippingAddress.contactNumber !== 'N/A'
                    ? shippingAddress.contactNumber
                    : '-'
                }
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">GSTIN:</div>
              <div class="detail-value">
                ${_getGSTIN(shippingAddress) || _getGSTIN(party) || '-'}
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Address:</div>
              <div class="detail-value">
                ${
                  invoiceData.shippingAddress.address.includes(
                    'Address Missing',
                  ) || invoiceData.shippingAddress.address === '-'
                    ? '-'
                    : invoiceData.shippingAddress.address
                }
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">State:</div>
              <div class="detail-value">
                ${
                  invoiceData.shippingAddress.state !== 'N/A'
                    ? invoiceData.shippingAddress.state
                    : '-'
                }
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Country:</div>
              <div class="detail-value">India</div>
            </div>
          </div>

          <div class="meta-column">
            <div class="detail-row">
              <div class="detail-label">Invoice # :</div>
              <div class="detail-value">${invoiceData.invoiceNumber}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Invoice Date :</div>
              <div class="detail-value">${invoiceData.date}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">P.O. No. :</div>
              <div class="detail-value">${
                invoiceData.poNumber === 'N/A' ? '-' : invoiceData.poNumber
              }</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">P.O. Date :</div>
              <div class="detail-value">${
                invoiceData.poDate === 'N/A' ? '-' : invoiceData.poDate
              }</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">E-Way No. :</div>
              <div class="detail-value">${
                invoiceData.eWayNo === 'N/A' ? '-' : invoiceData.eWayNo
              }</div>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              ${renderTableHeadersHTML()}
            </tr>
          </thead>
          <tbody>
            ${renderTableRowsHTML()}
          </tbody>
        </table>

        <!-- Totals Section -->
        <div class="totals-section">
          <div class="totals-left">
            <div class="detail-value">Total Items / Qty : ${totalItems} / ${totalQty.toFixed(
      2,
    )}</div>
            <div style="margin-top: 10px;">
              <div class="detail-label">Total amount (in words):</div>
              <div class="detail-value">${convertNumberToWords(
                totalAmount,
              )}</div>
            </div>
          </div>
          <div class="totals-right">
            <div class="total-row">
              <div>Taxable Amount</div>
              <div>${money(totalTaxable)}</div>
            </div>
            ${
              isGSTApplicable && showIGST
                ? `
              <div class="total-row">
                <div>IGST</div>
                <div>${money(totalIGST)}</div>
              </div>
            `
                : ''
            }
            ${
              isGSTApplicable && showCGSTSGST
                ? `
              <div class="total-row">
                <div>CGST</div>
                <div>${money(totalCGST)}</div>
              </div>
              <div class="total-row">
                <div>SGST</div>
                <div>${money(totalSGST)}</div>
              </div>
            `
                : ''
            }
            <div class="total-row final-total">
              <div>Total Amount</div>
              <div>${money(totalAmount)}</div>
            </div>
          </div>
        </div>

        <div class="separator"></div>

        <!-- Bank & Signature Section -->
        <div class="footer-section">
          <div class="bank-section">
            <div class="section-title">Bank Details:</div>
            <div class="detail-row">
              <div class="detail-label">Bank Name :</div>
              <div class="detail-value">${bankDetails.name}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Branch :</div>
              <div class="detail-value">${bankDetails.branch}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">IFSC :</div>
              <div class="detail-value">${bankDetails.ifsc}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Acc. Number :</div>
              <div class="detail-value">${bankDetails.accNumber}</div>
            </div>
            ${
              bankDetails.upiId !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">UPI ID:</div>
                <div class="detail-value">${bankDetails.upiId}</div>
              </div>
              <div style="margin-top: 10px;">
                <div class="section-title">Pay using UPI:</div>
                <div style="width: 60px; height: 60px; background: #f0f0f0; border: 0.5px solid #DCE0E4; display: flex; justify-content: center; align-items: center; margin-top: 8px;">
                  QR Code
                </div>
              </div>
            `
                : ''
            }
          </div>

          <div class="signature-section">
            <div class="section-title">For ${invoiceData.company.name}</div>
            <div class="signature-box">
              Authorized Signature
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
      </body>
      </html>
    `;
  };

  return generateHTMLContent();
};

export const generatePdfForTemplate16 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
) => {
  try {
    const htmlContent = Template16HTML({
      transaction,
      company,
      party,
      shippingAddress,
      bank,
    });
    const options = {
      html: htmlContent,
      fileName: `invoice_${transaction?.invoiceNumber || 'document'}`,
      directory: 'Documents',
      width: 595,
      height: 842,
    };
    const file = await generatePDF(options);
    return file;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const generateTemplate16HTML = props => {
  return Template16HTML(props);
};

import { BASE_URL } from '../config';

// Constants
const BLUE = '#1873CC';
const DARK = '#2D3748';
const MUTED = '#697077';
const BORDER = '#DCE0E4';

export const Template16 = ({
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
    if (!d) return 'N/A';
    const date = new Date(d);
    return date.toLocaleDateString('en-GB').replace(/\//g, '-');
  };

  const convertNumberToWords = n => {
    return numberToWords(n);
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

    return {
      totalTaxable,
      totalAmount,
      totalCGST,
      totalSGST,
      totalIGST,
      items,
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

  const invoiceData = {
    invoiceNumber: invNo(transaction),
    date: fmtDate(transaction?.date) || fmtDate(new Date()),
    poNumber: transaction?.poNumber || 'N/A',
    poDate: fmtDate(transaction?.poDate) || 'N/A',
    eWayNo: transaction?.eWayBillNo || 'N/A',

    placeOfSupply: party?.state
      ? `${capitalizeWords(party.state)} (${getStateCode(party.state) || '-'})`
      : 'N/A',

    company: {
      name: capitalizeWords(company?.businessName || 'Your Company Name'),
      address: capitalizeWords(company?.address || 'Company Address Missing'),
      gstin: _getGSTIN(company) || 'N/A',
      pan: company?.panNumber || 'N/A',
      state: company?.addressState
        ? `${capitalizeWords(company?.addressState)} (${
            getStateCode(company?.addressState) || '-'
          })`
        : 'N/A',
      city: capitalizeWords(company?.City || 'N/A'),
      phone: company?.mobileNumber || 'N/A',
      email: company?.email || company?.emailId || 'N/A',
    },

    invoiceTo: {
      name: capitalizeWords(party?.name || 'Client Name'),
      billingAddress: capitalizeWords(getBillingAddress(party)),
      gstin: _getGSTIN(party) || 'N/A',
      pan: party?.panNumber || 'N/A',
      state: party?.state
        ? `${capitalizeWords(party.state)} (${
            getStateCode(party.state) || '-'
          })`
        : 'N/A',
      email: party?.email || 'N/A',
    },

    shippingAddress: {
      name: capitalizeWords(
        shippingAddress?.name || party?.name || 'Client Name',
      ),
      address: capitalizeWords(
        getShippingAddress(shippingAddress, getBillingAddress(party)),
      ),
      state: shippingAddress?.state
        ? `${capitalizeWords(shippingAddress.state)} (${
            getStateCode(shippingAddress.state) || '-'
          })`
        : party?.state
        ? `${capitalizeWords(party.state)} (${
            getStateCode(party.state) || '-'
          })`
        : 'N/A',
    },
  };

  const {
    title,
    isList,
    items: notesItems,
  } = parseNotesHtml(transaction?.notes || '');
  const termsTitle = title || 'Terms and Conditions';

  const getBankDetails = () => ({
    name: bank?.bankName || 'N/A',
    branch: bank?.branchName || bank?.branchAddress || 'N/A',
    accNumber: bank?.accountNumber || 'N/A',
    ifsc: bank?.ifscCode || 'N/A',
    upiId: bank?.upiId || 'N/A',
  });

  const bankDetails = getBankDetails();

  // Table rendering functions
  const renderTableHeaders = () => {
    const baseHeaders = [
      'Sr.',
      'Product/Service',
      'HSN/SAC',
      'Rate',
      'Qty',
      'Taxable Value',
    ];

    if (showIGST) {
      return [...baseHeaders, 'IGST %', 'IGST Amount', 'Total'];
    } else if (showCGSTSGST) {
      return [
        ...baseHeaders,
        'CGST %',
        'CGST Amount',
        'SGST %',
        'SGST Amount',
        'Total',
      ];
    } else {
      return [...baseHeaders, 'Total'];
    }
  };

  const renderTableRow = (item, index) => {
    const baseData = [
      index + 1,
      `${capitalizeWords(item.name || '')}\n${
        item.description ? item.description.split('\n').join(' / ') : ''
      }`,
      item.hsnSac || item.code || 'N/A',
      money(item.pricePerUnit || item.rate || 0),
      `${Number(item.quantity)} ${item.unit || 'PCS'}`,
      money(item.taxableValue || item.amount || 0),
    ];

    if (showIGST) {
      return [
        ...baseData,
        `${item.gstRate || item.gstPercentage || 0}%`,
        money(item.igst || item.lineTax || 0),
        money(item.total || item.lineTotal || 0),
      ];
    } else if (showCGSTSGST) {
      const cgst = (item.cgst || item.lineTax || 0) / 2;
      const sgst = (item.sgst || item.lineTax || 0) / 2;
      const gstRate = item.gstRate || item.gstPercentage || 0;
      return [
        ...baseData,
        `${gstRate / 2}%`,
        money(cgst),
        `${gstRate / 2}%`,
        money(sgst),
        money(item.total || item.lineTotal || 0),
      ];
    } else {
      return [...baseData, money(item.total || item.lineTotal || 0)];
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

      // Share or save the PDF
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
      const headers = renderTableHeaders();
      return headers.map(header => `<th>${header}</th>`).join('');
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
          .header { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 20px; 
          }
          .title { 
            font-size: 20px; 
            font-weight: bold; 
            margin-bottom: 10px; 
          }
          .company-name { 
            font-size: 15px; 
            font-weight: bold; 
            color: #1873CC; 
            margin-bottom: 8px; 
          }
          .separator { 
            height: 2px; 
            background: #1873CC; 
            margin: 15px 0; 
          }
          .details-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .details-column {
            flex: 1;
            margin-right: 10px;
          }
          .meta-column {
            width: 150px;
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
            width: 50px;
          }
          .detail-value {
            font-size: 9px;
            color: #2D3748;
            flex: 1;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
            font-size: 8px;
          }
          th { 
            background: #1873CC; 
            color: white; 
            padding: 8px; 
            text-align: center; 
            font-size: 7px;
            font-weight: bold;
          }
          td { 
            border: 1px solid #DCE0E4; 
            padding: 6px; 
            text-align: center; 
            font-size: 7.5px;
          }
          .totals-section {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
          }
          .totals-left {
            flex: 1;
            margin-right: 20px;
          }
          .totals-right {
            width: 200px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            border-bottom: 1px solid #DCE0E4;
            background: #fff;
          }
          .final-total {
            background: #f0f0f0;
            margin-top: 8px;
            font-weight: bold;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .bank-section {
            flex: 1;
            margin-right: 20px;
          }
          .signature-section {
            width: 150px;
            text-align: center;
          }
          .signature-box {
            width: 150px;
            height: 50px;
            border: 0.5px solid #DCE0E4;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 10px;
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
          .page-number {
            text-align: center;
            font-size: 8px;
            color: #697077;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="header-left">
            <div class="title">TAX INVOICE</div>
            <div class="company-name">${invoiceData.company.name.toUpperCase()}</div>
            ${
              invoiceData.company.gstin !== 'N/A'
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
              invoiceData.company.city !== 'N/A'
                ? `
              <div class="detail-value">${invoiceData.company.city}</div>
            `
                : ''
            }
            ${
              invoiceData.company.pan !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">PAN:</div>
                <div class="detail-value">${invoiceData.company.pan}</div>
              </div>
            `
                : ''
            }
            ${
              invoiceData.company.phone !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">Phone:</div>
                <div class="detail-value">${invoiceData.company.phone}</div>
              </div>
            `
                : ''
            }
            ${
              invoiceData.company.state !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">State:</div>
                <div class="detail-value">${invoiceData.company.state}</div>
              </div>
            `
                : ''
            }
          </div>
          <div class="logo-placeholder">
            <!-- Logo would go here -->
          </div>
        </div>

        <div class="separator"></div>

        <!-- Customer & Shipping Details -->
        <div class="details-section">
          <div class="details-column">
            <div class="section-title">Customer Details:</div>
            ${
              invoiceData.invoiceTo.name !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">Name:</div>
                <div class="detail-value">${invoiceData.invoiceTo.name}</div>
              </div>
            `
                : ''
            }
            ${
              invoiceData.invoiceTo.email !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-value">${invoiceData.invoiceTo.email}</div>
              </div>
            `
                : ''
            }
            <div class="detail-row">
              <div class="detail-label">Phone No:</div>
              <div class="detail-value">${party?.contactNumber || 'N/A'}</div>
            </div>
            ${
              invoiceData.invoiceTo.gstin !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">GSTIN:</div>
                <div class="detail-value">${invoiceData.invoiceTo.gstin}</div>
              </div>
            `
                : ''
            }
            ${
              invoiceData.invoiceTo.pan !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">PAN:</div>
                <div class="detail-value">${invoiceData.invoiceTo.pan}</div>
              </div>
            `
                : ''
            }
            <div class="detail-row">
              <div class="detail-label">Address:</div>
              <div class="detail-value">${
                invoiceData.invoiceTo.billingAddress
              }</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Place of Supply:</div>
              <div class="detail-value">${invoiceData.placeOfSupply}</div>
            </div>
          </div>

          <div class="details-column">
            <div class="section-title">Shipping address:</div>
            <div class="detail-row">
              <div class="detail-label">Name:</div>
              <div class="detail-value">
                ${
                  invoiceData.shippingAddress.name !== 'Client Name'
                    ? invoiceData.shippingAddress.name
                    : '-'
                }
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Phone:</div>
              <div class="detail-value">
                ${
                  shippingAddress?.contactNumber &&
                  shippingAddress.contactNumber !== 'N/A'
                    ? shippingAddress.contactNumber
                    : '-'
                }
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">GSTIN:</div>
              <div class="detail-value">
                ${_getGSTIN(shippingAddress) || _getGSTIN(party) || '-'}
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Address:</div>
              <div class="detail-value">
                ${
                  invoiceData.shippingAddress.address.includes(
                    'Address Missing',
                  ) || invoiceData.shippingAddress.address === '-'
                    ? '-'
                    : invoiceData.shippingAddress.address
                }
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">State:</div>
              <div class="detail-value">
                ${
                  invoiceData.shippingAddress.state !== 'N/A'
                    ? invoiceData.shippingAddress.state
                    : '-'
                }
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Country:</div>
              <div class="detail-value">India</div>
            </div>
          </div>

          <div class="meta-column">
            <div class="detail-row">
              <div class="detail-label">Invoice # :</div>
              <div class="detail-value">${invoiceData.invoiceNumber}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Invoice Date :</div>
              <div class="detail-value">${invoiceData.date}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">P.O. No. :</div>
              <div class="detail-value">${
                invoiceData.poNumber === 'N/A' ? '-' : invoiceData.poNumber
              }</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">P.O. Date :</div>
              <div class="detail-value">${
                invoiceData.poDate === 'N/A' ? '-' : invoiceData.poDate
              }</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">E-Way No. :</div>
              <div class="detail-value">${
                invoiceData.eWayNo === 'N/A' ? '-' : invoiceData.eWayNo
              }</div>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              ${renderTableHeadersHTML()}
            </tr>
          </thead>
          <tbody>
            ${renderTableRowsHTML()}
          </tbody>
        </table>

        <!-- Totals Section -->
        <div class="totals-section">
          <div class="totals-left">
            <div class="detail-value">Total Items / Qty : ${totalItems} / ${totalQty.toFixed(
      2,
    )}</div>
            <div style="margin-top: 10px;">
              <div class="detail-label">Total amount (in words):</div>
              <div class="detail-value">${convertNumberToWords(
                totalAmount,
              )}</div>
            </div>
          </div>
          <div class="totals-right">
            <div class="total-row">
              <div>Taxable Amount</div>
              <div>${money(totalTaxable)}</div>
            </div>
            ${
              isGSTApplicable && showIGST
                ? `
              <div class="total-row">
                <div>IGST</div>
                <div>${money(totalIGST)}</div>
              </div>
            `
                : ''
            }
            ${
              isGSTApplicable && showCGSTSGST
                ? `
              <div class="total-row">
                <div>CGST</div>
                <div>${money(totalCGST)}</div>
              </div>
              <div class="total-row">
                <div>SGST</div>
                <div>${money(totalSGST)}</div>
              </div>
            `
                : ''
            }
            <div class="total-row final-total">
              <div>Total Amount</div>
              <div>${money(totalAmount)}</div>
            </div>
          </div>
        </div>

        <div class="separator"></div>

        <!-- Bank & Signature Section -->
        <div class="footer-section">
          <div class="bank-section">
            <div class="section-title">Bank Details:</div>
            <div class="detail-row">
              <div class="detail-label">Bank Name :</div>
              <div class="detail-value">${bankDetails.name}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Branch :</div>
              <div class="detail-value">${bankDetails.branch}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">IFSC :</div>
              <div class="detail-value">${bankDetails.ifsc}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Acc. Number :</div>
              <div class="detail-value">${bankDetails.accNumber}</div>
            </div>
            ${
              bankDetails.upiId !== 'N/A'
                ? `
              <div class="detail-row">
                <div class="detail-label">UPI ID:</div>
                <div class="detail-value">${bankDetails.upiId}</div>
              </div>
              <div style="margin-top: 10px;">
                <div class="section-title">Pay using UPI:</div>
                <div style="width: 60px; height: 60px; background: #f0f0f0; border: 0.5px solid #DCE0E4; display: flex; justify-content: center; align-items: center; margin-top: 8px;">
                  QR Code
                </div>
              </div>
            `
                : ''
            }
          </div>

          <div class="signature-section">
            <div class="section-title">For ${invoiceData.company.name}</div>
            <div class="signature-box">
              Authorized Signature
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>TAX INVOICE</Text>

            <Text style={styles.companyName}>
              {invoiceData.company.name.toUpperCase()}
            </Text>

            {invoiceData.company.gstin !== 'N/A' && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>GSTIN:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.company.gstin}
                </Text>
              </View>
            )}

            <Text style={styles.companyAddress}>
              {invoiceData.company.address}
            </Text>

            {invoiceData.company.city !== 'N/A' && (
              <Text style={styles.companyCity}>{invoiceData.company.city}</Text>
            )}

            {invoiceData.company.pan !== 'N/A' && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>PAN:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.company.pan}
                </Text>
              </View>
            )}

            {invoiceData.company.phone !== 'N/A' && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.company.phone}
                </Text>
              </View>
            )}

            {invoiceData.company.state !== 'N/A' && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>State:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.company.state}
                </Text>
              </View>
            )}
          </View>

          {/* Logo would go here */}
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>Company Logo</Text>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Customer & Shipping Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailsColumn}>
            <Text style={styles.sectionTitle}>Customer Details:</Text>

            {invoiceData.invoiceTo.name !== 'N/A' && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.invoiceTo.name}
                </Text>
              </View>
            )}

            {invoiceData.invoiceTo.email !== 'N/A' && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.invoiceTo.email}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone No:</Text>
              <Text style={styles.detailValue}>
                {party?.contactNumber || 'N/A'}
              </Text>
            </View>

            {invoiceData.invoiceTo.gstin !== 'N/A' && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>GSTIN:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.invoiceTo.gstin}
                </Text>
              </View>
            )}

            {invoiceData.invoiceTo.pan !== 'N/A' && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>PAN:</Text>
                <Text style={styles.detailValue}>
                  {invoiceData.invoiceTo.pan}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={[styles.detailValue, styles.addressText]}>
                {invoiceData.invoiceTo.billingAddress}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Place of Supply:</Text>
              <Text style={styles.detailValue}>
                {invoiceData.placeOfSupply}
              </Text>
            </View>
          </View>

          <View style={styles.detailsColumn}>
            <Text style={styles.sectionTitle}>Shipping address:</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>
                {invoiceData.shippingAddress.name !== 'Client Name'
                  ? invoiceData.shippingAddress.name
                  : '-'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>
                {shippingAddress?.contactNumber &&
                shippingAddress.contactNumber !== 'N/A'
                  ? shippingAddress.contactNumber
                  : '-'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>GSTIN:</Text>
              <Text style={styles.detailValue}>
                {_getGSTIN(shippingAddress) || _getGSTIN(party) || '-'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={[styles.detailValue, styles.addressText]}>
                {invoiceData.shippingAddress.address.includes(
                  'Address Missing',
                ) || invoiceData.shippingAddress.address === '-'
                  ? '-'
                  : invoiceData.shippingAddress.address}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>State:</Text>
              <Text style={styles.detailValue}>
                {invoiceData.shippingAddress.state !== 'N/A'
                  ? invoiceData.shippingAddress.state
                  : '-'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Country:</Text>
              <Text style={styles.detailValue}>India</Text>
            </View>
          </View>

          <View style={styles.metaColumn}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice # :</Text>
              <Text style={styles.metaValue}>{invoiceData.invoiceNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice Date :</Text>
              <Text style={styles.metaValue}>{invoiceData.date}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>P.O. No. :</Text>
              <Text style={styles.metaValue}>
                {invoiceData.poNumber === 'N/A' ? '-' : invoiceData.poNumber}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>P.O. Date :</Text>
              <Text style={styles.metaValue}>
                {invoiceData.poDate === 'N/A' ? '-' : invoiceData.poDate}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>E-Way No. :</Text>
              <Text style={styles.metaValue}>
                {invoiceData.eWayNo === 'N/A' ? '-' : invoiceData.eWayNo}
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

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsLeft}>
            <Text style={styles.totalItemsText}>
              Total Items / Qty : {totalItems} / {totalQty.toFixed(2)}
            </Text>

            <View style={styles.amountInWords}>
              <Text style={styles.amountLabel}>Total amount (in words):</Text>
              <Text style={styles.amountWords}>
                {convertNumberToWords(totalAmount)}
              </Text>
            </View>
          </View>

          <View style={styles.totalsRight}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Taxable Amount</Text>
              <Text style={styles.totalValue}>{money(totalTaxable)}</Text>
            </View>

            {isGSTApplicable && showIGST && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IGST</Text>
                <Text style={styles.totalValue}>{money(totalIGST)}</Text>
              </View>
            )}

            {isGSTApplicable && showCGSTSGST && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>CGST</Text>
                  <Text style={styles.totalValue}>{money(totalCGST)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>SGST</Text>
                  <Text style={styles.totalValue}>{money(totalSGST)}</Text>
                </View>
              </>
            )}

            <View style={[styles.totalRow, styles.finalTotal]}>
              <Text style={[styles.totalLabel, styles.finalTotalLabel]}>
                Total Amount
              </Text>
              <Text style={[styles.totalValue, styles.finalTotalValue]}>
                {money(totalAmount)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Bank & Signature Section */}
        <View style={styles.footerSection}>
          <View style={styles.bankSection}>
            <Text style={styles.sectionTitle}>Bank Details:</Text>

            <View style={styles.bankDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bank Name :</Text>
                <Text style={styles.detailValue}>{bankDetails.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Branch :</Text>
                <Text style={styles.detailValue}>{bankDetails.branch}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>IFSC :</Text>
                <Text style={styles.detailValue}>{bankDetails.ifsc}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Acc. Number :</Text>
                <Text style={styles.detailValue}>{bankDetails.accNumber}</Text>
              </View>
              {bankDetails.upiId !== 'N/A' && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>UPI ID:</Text>
                  <Text style={styles.detailValue}>{bankDetails.upiId}</Text>
                </View>
              )}
            </View>

            {bankDetails.upiId !== 'N/A' && (
              <View style={styles.upiSection}>
                <Text style={styles.sectionTitle}>Pay using UPI:</Text>
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrText}>QR Code</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.signatureSection}>
            <Text style={styles.signatureTitle}>
              For {invoiceData.company.name}
            </Text>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureText}>Authorized Signature</Text>
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
    padding: 20,
  },
  pdfButtonContainer: {
    padding: 10,
    backgroundColor: BLUE,
    alignItems: 'center',
  },
  pdfButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DARK,
    marginBottom: 10,
  },
  companyName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: BLUE,
    marginBottom: 8,
  },
  companyAddress: {
    fontSize: 9,
    color: DARK,
    marginBottom: 4,
  },
  companyCity: {
    fontSize: 9,
    color: DARK,
    marginBottom: 4,
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
    width: 50,
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
  logoPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  logoText: {
    fontSize: 8,
    color: MUTED,
  },
  separator: {
    height: 1.5,
    backgroundColor: BLUE,
    marginVertical: 15,
  },
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailsColumn: {
    flex: 1,
    marginRight: 10,
  },
  metaColumn: {
    width: 150,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: DARK,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: DARK,
  },
  metaValue: {
    fontSize: 9,
    color: DARK,
  },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BLUE,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#fff',
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
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  totalsLeft: {
    flex: 1,
    marginRight: 20,
  },
  totalsRight: {
    width: 200,
  },
  totalItemsText: {
    fontSize: 9,
    color: DARK,
    marginBottom: 15,
  },
  amountInWords: {
    marginTop: 10,
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#fff',
  },
  finalTotal: {
    backgroundColor: '#f0f0f0',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 9,
    color: DARK,
  },
  totalValue: {
    fontSize: 9,
    color: DARK,
  },
  finalTotalLabel: {
    fontWeight: 'bold',
  },
  finalTotalValue: {
    fontWeight: 'bold',
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  bankSection: {
    flex: 1,
    marginRight: 20,
  },
  bankDetails: {
    marginBottom: 15,
  },
  upiSection: {
    marginTop: 10,
  },
  qrPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: BORDER,
    marginTop: 8,
  },
  qrText: {
    fontSize: 8,
    color: MUTED,
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
    height: 50,
    borderWidth: 0.5,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureText: {
    fontSize: 8,
    color: MUTED,
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
