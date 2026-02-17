// template19.js - Updated to match web UI
import {
  formatCurrency,
  getBillingAddress as getBillingAddressUtil,
  getShippingAddress as getShippingAddressUtil,
  prepareTemplate8Data,
  numberToWords,
  formatPhoneNumber,
  formatQuantity,
  getStateCode,
} from './pdf-utils';
import { BASE_URL } from '../config';
import { generatePDF } from 'react-native-html-to-pdf';

// Constants
const MARGIN = 20;
const PAGE_WIDTH = 595; // A4 width in points
const PAGE_HEIGHT = 842; // A4 height in points
const BLUE = '#1873cc';
const DARK = '#2d3748';
const MUTED = '#697077';
const BORDER = '#dce0e4';
const ITEMS_PER_PAGE = 29; // Maximum items per page

// ============ UTILITY FUNCTIONS ============

// Capitalize first letter of each word
const capitalizeWords = str => {
  if (!str) return str;
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

// Helper functions
const handleUndefined = (value, fallback = '-') => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  if (value === 'N/A') return fallback;
  return value.toString();
};

const checkValue = value => {
  const val = String(value);
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

const money = n => {
  return Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtDate = d => {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleDateString('en-GB').replace(/\//g, '-');
  } catch (error) {
    return d || 'N/A';
  }
};

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

const renderNotesHTML = notes => {
  if (!notes) return '';
  try {
    return notes
      .replace(/\n/g, '<br>')
      .replace(/<br\s*\/?>/gi, '<br>')
      .replace(/<p>/gi, '<div style="margin-bottom: 8px;">')
      .replace(/<\/p>/gi, '</div>')
      .replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>')
      .replace(/<i>(.*?)<\/i>/gi, '<em>$1</em>')
      .replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')
      .replace(/<ul>/gi, '<ul style="padding-left: 15px;">')
      .replace(/<li>/gi, '<li style="margin-bottom: 4px;">');
  } catch (error) {
    return notes.replace(/\n/g, '<br>');
  }
};

const safeFormatPhoneNumber = phoneNumber => {
  try {
    if (!phoneNumber) return '-';
    return formatPhoneNumber(phoneNumber);
  } catch (error) {
    return phoneNumber || '-';
  }
};

const safeNumberToWords = amount => {
  try {
    return numberToWords(amount);
  } catch (error) {
    return `Rupees ${money(amount)} Only`;
  }
};

const formatAddress = address => {
  if (!address || address === 'Address not available') return address;
  return capitalizeWords(address);
};

const escapeHtml = text => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Split items into pages
const splitItemsIntoPages = (items, itemsPerPage = ITEMS_PER_PAGE) => {
  const pages = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }
  return pages;
};

// Generate items table HTML for a specific page
const generateItemsTableHTML = (
  items,
  colWidths,
  showIGST,
  showCGSTSGST,
  startIndex = 0,
) => {
  return items
    .map((item, index) => {
      const baseData = [
        (startIndex + index + 1).toString(),
        capitalizeWords(item.name || 'N/A'),
        item.code || item.hsnSac || 'N/A',
        money(item.pricePerUnit || 0),
        item.itemType === 'service'
          ? '-'
          : formatQuantity(Number(item.quantity || 0), item.unit || 'PCS'),
        money(item.taxableValue || 0),
      ];

      let rowData;
      if (showIGST) {
        rowData = [
          ...baseData,
          `${item.gstRate || 0}%`,
          money(item.igst || 0),
          money(item.total || 0),
        ];
      } else if (showCGSTSGST) {
        rowData = [
          ...baseData,
          `${((item.gstRate || 0) / 2).toFixed(2)}%`,
          money(item.cgst || 0),
          `${((item.gstRate || 0) / 2).toFixed(2)}%`,
          money(item.sgst || 0),
          money(item.total || 0),
        ];
      } else {
        rowData = [...baseData, money(item.total || 0)];
      }

      return `<tr class="table-row">
        ${rowData
          .map(
            (cell, cellIndex) =>
              `<td class="table-cell ${
                cellIndex === 1 ? 'table-cell-left' : ''
              }">${escapeHtml(cell)}</td>`,
          )
          .join('')}
      </tr>`;
    })
    .join('');
};

// Generate page HTML
const generatePageHTML = (
  pageData,
  pageIndex,
  totalPages,
  invoiceData,
  party,
  shippingGSTIN,
  shippingPhone,
  placeOfSupply,
  headers,
  colWidths,
  totalItems,
  totalQty,
  showIGST,
  showCGSTSGST,
  isGSTApplicable,
  subtotal,
  totalIGST,
  totalCGST,
  totalSGST,
  invoiceTotal,
  bank,
  transaction,
  title,
  startIndex = 0,
  isLastPage = false,
) => {
  return `
    <div class="page">
      <!-- Repeating Header -->
      <div class="page-header">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1;">
            <div class="title">${escapeHtml(title)}</div>
            <div class="company-name">${escapeHtml(
              capitalizeWords(invoiceData.company.name),
            )}</div>
            <div class="company-details"><span class="label">GSTIN: </span>${escapeHtml(
              invoiceData.company.gstin,
            )}</div>
            <div class="company-details">${escapeHtml(
              formatAddress(invoiceData.company.address),
            )}</div>
            <div class="company-details">${escapeHtml(
              capitalizeWords(invoiceData.company.city),
            )}</div>
            ${
              invoiceData.company.pan !== '-'
                ? `<div class="company-details"><span class="label">PAN: </span>${escapeHtml(
                    invoiceData.company.pan,
                  )}</div>`
                : ''
            }
            <div class="company-details"><span class="label">Phone: </span>${safeFormatPhoneNumber(
              invoiceData.company.phone,
            )}</div>
            <div class="company-details"><span class="label">State: </span>${escapeHtml(
              capitalizeWords(invoiceData.company.state),
            )}</div>
          </div>
          <div style="min-width: 90px; text-align: right;">
            ${
              invoiceData.company.logo
                ? `<img src="${BASE_URL}${invoiceData.company.logo}" alt="Company Logo" style="max-width: 80px; max-height: 80px; margin-top: 38px;" />`
                : ''
            }
          </div>
        </div>
        <div class="separator"></div>
        
        <!-- Customer and Meta Block -->
        <div class="customer-section">
          <div class="customer-details">
            <div class="section-title">Details of Buyer | Billed to :</div>
            <div class="customer-name">${escapeHtml(
              capitalizeWords(invoiceData.invoiceTo.name),
            )}</div>
            <div class="address">${escapeHtml(
              formatAddress(invoiceData.invoiceTo.billingAddress),
            )}</div>
            <div class="address"><span class="label">Phone No: </span>${safeFormatPhoneNumber(
              party?.contactNumber ||
                party?.phone ||
                party?.mobileNumber ||
                '-',
            )}</div>
            <div class="address"><span class="label">GSTIN: </span>${escapeHtml(
              invoiceData.invoiceTo.gstin,
            )}</div>
            <div class="address"><span class="label">PAN: </span>${escapeHtml(
              invoiceData.invoiceTo.pan || party?.pan || '-',
            )}</div>
            <div class="address"><span class="label">Place of Supply: </span>${escapeHtml(
              capitalizeWords(placeOfSupply),
            )}</div>
            
            <div class="section-title" style="margin-top: 12px;">Details of Consignee | Shipped to :</div>
            <div class="customer-name">${escapeHtml(
              capitalizeWords(invoiceData.shippingAddress.name),
            )}</div>
            <div class="address">${escapeHtml(
              formatAddress(invoiceData.shippingAddress.address),
            )}</div>
            <div class="address"><span class="label">Phone No: </span>${safeFormatPhoneNumber(
              shippingPhone,
            )}</div>
            <div class="address"><span class="label">GSTIN: </span>${escapeHtml(
              shippingGSTIN,
            )}</div>
            <div class="address"><span class="label">State: </span>${escapeHtml(
              capitalizeWords(invoiceData.shippingAddress.state),
            )}</div>
          </div>
          
          <div class="meta-details">
            <div class="address"><span class="label">Invoice # : </span>${escapeHtml(
              invoiceData.invoiceNumber,
            )}</div>
            <div class="address"><span class="label">Invoice Date : </span>${escapeHtml(
              invoiceData.date,
            )}</div>
            <div class="address"><span class="label">P.O. No : </span>${escapeHtml(
              checkValue(invoiceData.poNumber),
            )}</div>
            <div class="address"><span class="label">P.O. Date : </span>${escapeHtml(
              checkValue(invoiceData.poDate),
            )}</div>
            <div class="address"><span class="label">E-Way No : </span>${escapeHtml(
              checkValue(invoiceData.eWayNo),
            )}</div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <table class="table">
        <thead class="table-header">
          <tr>
            ${headers
              .map(
                (header, index) =>
                  `<th style="width: ${colWidths[index]}">${escapeHtml(
                    header,
                  )}</th>`,
              )
              .join('')}
          </tr>
        </thead>
        <tbody style="border-left: 0.5px solid ${BORDER}; border-right: 0.5px solid ${BORDER};">
          ${generateItemsTableHTML(
            pageData,
            colWidths,
            showIGST,
            showCGSTSGST,
            startIndex,
          )}
        </tbody>
      </table>
      
      <!-- Summary -->
      <div class="summary-text">
        Total Items / Qty : ${totalItems} / ${
    totalQty % 1 === 0 ? totalQty.toFixed(0) : totalQty.toFixed(2)
  }
      </div>

      ${
        isLastPage
          ? `
      <!-- Totals (only on last page) -->
      <div class="totals-section">
        <div class="total-row">
          <div class="total-label">Taxable Amount</div>
          <div class="total-value">Rs. ${money(subtotal)}</div>
        </div>
        ${
          isGSTApplicable && showIGST
            ? `<div class="total-row"><div class="total-label">IGST</div><div class="total-value">Rs. ${money(
                totalIGST,
              )}</div></div>`
            : ''
        }
        ${
          isGSTApplicable && showCGSTSGST
            ? `<div class="total-row"><div class="total-label">CGST</div><div class="total-value">Rs. ${money(
                totalCGST,
              )}</div></div><div class="total-row"><div class="total-label">SGST</div><div class="total-value">Rs. ${money(
                totalSGST,
              )}</div></div>`
            : ''
        }
        <div class="total-row-bold">
          <div class="total-label">Total</div>
          <div class="total-value">Rs. ${money(invoiceTotal)}</div>
        </div>
      </div>

      <!-- Amount in Words -->
      <div class="amount-in-words">
        <div class="amount-label">Total amount (in words):</div>
        <div class="amount-words">${escapeHtml(
          safeNumberToWords(invoiceTotal),
        )}</div>
      </div>

      <div class="separator"></div>

      <!-- Footer -->
      <div class="footer clearfix">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
          <div class="bank-details" style="flex: 0 0 35%; max-width: 35%;">
            <div class="bank-title">Bank Details:</div>
            ${
              bank &&
              (bank.bankName ||
                bank.accountNumber ||
                bank.accountNo ||
                bank.ifscCode)
                ? `
              ${
                bank.bankName
                  ? `<div class="bank-text">Bank Name: ${escapeHtml(
                      capitalizeWords(bank.bankName),
                    )}</div>`
                  : ''
              }
              ${
                bank.branchName || bank.branchAddress
                  ? `<div class="bank-text">Branch: ${escapeHtml(
                      capitalizeWords(
                        bank.branchName || bank.branchAddress || '-',
                      ),
                    )}</div>`
                  : ''
              }
              ${
                bank.ifscCode
                  ? `<div class="bank-text">IFSC: ${escapeHtml(
                      capitalizeWords(bank.ifscCode),
                    )}</div>`
                  : ''
              }
              ${
                bank.accountNumber || bank.accountNo
                  ? `<div class="bank-text">Acc. Number: ${escapeHtml(
                      bank.accountNumber || bank.accountNo || '-',
                    )}</div>`
                  : ''
              }
              ${
                bank?.upiDetails?.upiId
                  ? `<div class="bank-text">UPI ID: ${escapeHtml(
                      bank.upiDetails.upiId,
                    )}</div>`
                  : ''
              }
              ${
                bank?.upiDetails?.upiName
                  ? `<div class="bank-text">UPI Name: ${escapeHtml(
                      capitalizeWords(bank.upiDetails.upiName),
                    )}</div>`
                  : ''
              }
              ${
                bank?.upiDetails?.upiMobile
                  ? `<div class="bank-text">UPI Mobile: ${escapeHtml(
                      bank.upiDetails.upiMobile,
                    )}</div>`
                  : ''
              }
              `
                : `<div class="bank-text">No bank details available</div>`
            }
          </div>
          
          <div style="flex: 0 0 auto; text-align: center; margin: 0 10px;">
            ${
              bank?.qrCode
                ? `<div style="margin-bottom: 6px; font-size: 9px; font-weight: bold;">QR Code</div><img src="${BASE_URL}/${bank.qrCode}" alt="QR Code" style="max-width: 85px; max-height: 73px;" />`
                : ''
            }
          </div>
          
          <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-end;">
            <div style="text-align: right;">For ${escapeHtml(
              capitalizeWords(invoiceData.company.name),
            )}</div>
            <div class="signature-box"></div>
          </div>
        </div>
      </div>

      <!-- Terms and Conditions -->
      ${
        transaction?.notes
          ? `
        <div class="terms">
          <div class="terms-content">${renderNotesHTML(transaction.notes)}</div>
        </div>
      `
          : ''
      }
      `
          : ''
      }

      <!-- Page Number -->
      <div class="page-number">Page ${pageIndex + 1} of ${totalPages}</div>
    </div>
  `;
};

// Main PDF Component
const Template19 = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  preparedData,
}) => {
  const billingAddress = getBillingAddressUtil(party);
  const shippingAddressStr = shippingAddress
    ? getShippingAddressUtil(shippingAddress, billingAddress)
    : billingAddress;

  const companyGSTIN = _getGSTIN(company);
  const partyGSTIN = _getGSTIN(party);
  const shippingGSTIN = _getGSTIN(shippingAddress) || partyGSTIN || '-';

  const {
    totalTaxable = 0,
    totalAmount = 0,
    items = [],
    totalItems = 0,
    totalQty = 0,
    itemsWithGST = [],
    totalCGST = 0,
    totalSGST = 0,
    totalIGST = 0,
    isGSTApplicable = false,
    isInterstate = false,
    showIGST = false,
    showCGSTSGST = false,
    showNoTax = false,
  } = preparedData || {};

  const itemsToRender = itemsWithGST.length > 0 ? itemsWithGST : items;
  const subtotal = totalTaxable;
  const invoiceTotal = totalAmount;

  const invoiceData = {
    invoiceNumber: handleUndefined(
      transaction?.invoiceNumber || transaction?.id,
    ),
    date: handleUndefined(fmtDate(transaction?.date) || fmtDate(new Date())),
    poNumber: handleUndefined(transaction?.poNumber, '-'),
    poDate: handleUndefined(fmtDate(transaction?.poDate), '-'),
    eWayNo: handleUndefined(transaction?.eWayBillNo || transaction?.eway, '-'),

    company: {
      name: handleUndefined(
        company?.businessName || company?.companyName,
        'Company Name',
      ),
      logo: company?.logo ? company.logo : null,
      address: formatAddress(
        handleUndefined(company?.address, 'Address not available'),
      ),
      gstin: handleUndefined(companyGSTIN, '-'),
      pan: handleUndefined(company?.panNumber || company?.pan, '-'),
      state: handleUndefined(
        company?.addressState || company?.state
          ? `${company.addressState || company.state} (${
              getStateCode(company.addressState || company.state) || '-'
            })`
          : '-',
      ),
      city: handleUndefined(company?.city || company?.City, '-'),
      phone: handleUndefined(company?.mobileNumber || company?.phone, '-'),
    },

    invoiceTo: {
      name: handleUndefined(party?.name, 'Client Name'),
      billingAddress: formatAddress(
        handleUndefined(billingAddress, 'Address not available'),
      ),
      gstin: handleUndefined(partyGSTIN, '-'),
      pan: handleUndefined(party?.panNumber || party?.pan, '-'),
      state: handleUndefined(
        party?.state
          ? `${party.state} (${getStateCode(party.state) || '-'})`
          : '-',
      ),
    },

    shippingAddress: {
      name: handleUndefined(
        shippingAddress?.name || shippingAddress?.label || party?.name,
        'Client Name',
      ),
      address: formatAddress(
        handleUndefined(shippingAddressStr, 'Address not available'),
      ),
      state: handleUndefined(
        shippingAddress?.state
          ? `${shippingAddress.state} (${
              getStateCode(shippingAddress.state) || '-'
            })`
          : party?.state
          ? `${party.state} (${getStateCode(party.state) || '-'})`
          : '-',
      ),
    },
  };

  const getColWidths = () => {
    if (showCGSTSGST) {
      return [
        '5%',
        '25%',
        '8%',
        '8%',
        '6%',
        '10%',
        '6%',
        '8%',
        '6%',
        '8%',
        '10%',
      ];
    } else if (showIGST) {
      return ['5%', '30%', '8%', '8%', '7%', '12%', '10%', '10%', '10%'];
    } else {
      return ['5%', '35%', '10%', '10%', '8%', '15%', '17%'];
    }
  };

  const colWidths = getColWidths();

  const title =
    transaction?.type === 'proforma'
      ? 'PROFORMA INVOICE'
      : isGSTApplicable
      ? 'TAX INVOICE'
      : 'INVOICE';

  const placeOfSupply = shippingAddress?.state
    ? `${shippingAddress.state} (${getStateCode(shippingAddress.state) || '-'})`
    : party?.state
    ? `${party.state} (${getStateCode(party.state) || '-'})`
    : '-';

  const shippingPhone = handleUndefined(
    shippingAddress?.contactNumber ||
      shippingAddress?.phone ||
      shippingAddress?.mobileNumber ||
      party?.contactNumber ||
      party?.phone ||
      party?.mobileNumber,
    '-',
  );

  const getHeaders = () => {
    const baseHeaders = [
      'Sr.No',
      'Name of Product / Service',
      'HSN/SAC',
      'Rate (Rs.)',
      'Qty',
      'Taxable Value (Rs.)',
    ];

    if (showIGST) {
      return [...baseHeaders, 'IGST %', 'IGST Amount (Rs.)', 'Total (Rs.)'];
    } else if (showCGSTSGST) {
      return [
        ...baseHeaders,
        'CGST%',
        'CGST Amount (Rs.)',
        'SGST%',
        'SGST Amount (Rs.)',
        'Total (Rs.)',
      ];
    } else {
      return [...baseHeaders, 'Total (Rs.)'];
    }
  };

  const headers = getHeaders();

  // Split items into pages
  const itemPages = splitItemsIntoPages(itemsToRender, ITEMS_PER_PAGE);
  const totalPages = itemPages.length;

  // Generate HTML content for PDF
  const generateHTML = () => {
    let startIndex = 0;
    const pageHTMLs = itemPages.map((pageItems, pageIndex) => {
      const pageHTML = generatePageHTML(
        pageItems,
        pageIndex,
        totalPages,
        invoiceData,
        party,
        shippingGSTIN,
        shippingPhone,
        placeOfSupply,
        headers,
        colWidths,
        totalItems,
        totalQty,
        showIGST,
        showCGSTSGST,
        isGSTApplicable,
        subtotal,
        totalIGST,
        totalCGST,
        totalSGST,
        invoiceTotal,
        bank,
        transaction,
        title,
        startIndex,
        pageIndex === totalPages - 1, // isLastPage
      );
      startIndex += pageItems.length;
      return pageHTML;
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    @page {
      size: A4;
      margin: 0;
    }
    
    body {
      font-family: Helvetica, Arial, sans-serif;
      color: ${DARK};
      font-size: 9px;
      line-height: 1.2;
      margin: 0;
      padding: 0;
    }
    
    .page {
      width: ${PAGE_WIDTH}pt;
      min-height: ${PAGE_HEIGHT}pt;
      padding: ${MARGIN}px;
      padding-bottom: 50px;
      page-break-after: always;
      position: relative;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    .page-header {
      margin-bottom: 15px;
    }
    
    .title {
      font-size: 16px;
      font-weight: bold;
      color: ${BLUE};
      text-align: center;
      margin-bottom: 15px;
    }
    
    .company-name {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    
    .company-details {
      font-size: 8px;
      margin-bottom: 2px;
    }
    
    .label {
      font-weight: bold;
    }
    
    .separator {
      height: 1px;
      background-color: ${BLUE};
      margin: 6px 0;
    }
    
    .customer-section {
      display: flex;
      flex-direction: row;
      margin-bottom: 15px;
    }
    
    .customer-details {
      flex: 2;
    }
    
    .meta-details {
      flex: 1;
      text-align: right;
    }
    
    .section-title {
      font-size: 9px;
      font-weight: bold;
      color: ${BLUE};
      margin-bottom: 10px;
    }
    
    .customer-name {
      font-size: 9px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .address {
      font-size: 8px;
      margin-bottom: 8px;
      line-height: 1.2;
      white-space: normal;
      word-wrap: break-word;
    }
    
    .table {
      width: 100%;
      margin: 10px 0;
      border-collapse: collapse;
    }
    
    .table-header {
      background-color: ${BLUE};
      color: #FFFFFF;
      font-size: 7px;
      font-weight: bold;
      text-align: center;
    }
    
    .table-header th {
      padding: 4px 2px;
      border: 1px solid ${BLUE};
    }
    
    .table-row {
      border-bottom: 0.5px solid ${BORDER};
      page-break-inside: avoid;
    }
    
    .table-cell {
      font-size: 7px;
      text-align: center;
      padding: 5px 2px;
      border-right: 0.5px solid ${BORDER};
    }
    
    .table-cell:last-child {
      border-right: none;
    }
    
    .table-cell-left {
      text-align: left;
      padding-left: 4px;
    }
    
    .totals-section {
      margin-top: 15px;
      float: right;
      width: 250px;
      page-break-inside: avoid;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 10px;
      border: 0.5px solid ${BORDER};
      margin-bottom: 2px;
    }
    
    .total-row-bold {
      display: flex;
      justify-content: space-between;
      padding: 7px 10px;
      border: 0.5px solid ${BORDER};
      background-color: #f5f5f5;
      font-weight: bold;
    }
    
    .total-label {
      font-size: 8px;
    }
    
    .total-value {
      font-size: 8px;
    }
    
    .amount-in-words {
      margin: 20px 0 5px 0;
      clear: both;
      page-break-inside: avoid;
    }
    
    .amount-label {
      font-size: 8px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .amount-words {
      font-size: 8px;
      line-height: 1.2;
    }
    
    .footer {
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    
    .bank-details {
      flex: 2;
    }
    
    .signature {
      flex: 1;
      text-align: right;
    }
    
    .bank-title {
      font-size: 9px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .bank-text {
      font-size: 8px;
      margin-bottom: 2px;
    }
    
    .signature-box {
      width: 120px;
      height: 50px;
      border: 1px solid ${BORDER};
      margin-top: 10px;
      display: block;
    }
    
    .terms {
      margin-top: 8px;
      page-break-inside: avoid;
      border-top: 1px solid ${BLUE};
      padding-top: 10px;
      padding-left: 10px;
    }
    
    .terms-content {
      font-size: 8px;
      line-height: 1.3;
    }
    
    .page-number {
      position: absolute;
      bottom: 10px;
      right: ${MARGIN}px;
      font-size: 7px;
      color: ${MUTED};
    }
    
    .summary-text {
      font-size: 8px;
      margin-top: 10px;
      margin-bottom: 10px;
    }
    
    .no-data {
      text-align: center;
      padding: 15px;
      font-size: 8px;
      color: #666;
      font-style: italic;
    }
    
    .clearfix::after {
      content: "";
      clear: both;
      display: table;
    }
  </style>
</head>
<body>
  ${pageHTMLs.join('')}
</body>
</html>`;
  };

  return generateHTML();
};

// Main export function
export const generatePdfForTemplate19 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
) => {
  try {
    const preparedData = prepareTemplate8Data(
      transaction,
      company,
      party,
      shippingAddress,
    );

    const htmlContent = Template19({
      transaction,
      company,
      party,
      shippingAddress,
      bank,
      preparedData,
    });

    if (!htmlContent || htmlContent.trim().length === 0) {
      throw new Error('Generated HTML content is empty');
    }

    const options = {
      html: htmlContent,
      fileName: `invoice_${
        transaction?.invoiceNumber || 'document'
      }_${Date.now()}`,
      directory: 'Documents',
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      padding: 0,
    };

    const file = await generatePDF(options);

    return file;
  } catch (error) {
    if (error.message.includes('retry')) {
      throw new Error(
        'PDF generation failed. Please check your data and try again.',
      );
    }

    throw error;
  }
};

export const generateTemplate19HTML = props => {
  return Template19(props);
};

export default Template19;
