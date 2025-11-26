// template19.js
import {
  capitalizeWords,
  formatPhoneNumber,
  formatCurrency,
  numberToWords,
  getStateCode,
  formatQuantity,
} from './pdf-utils';
import { BASE_URL } from '../config';
import RNHTMLtoPDF from 'react-native-html-to-pdf';

// Constants
const MARGIN = 36;
const PAGE_WIDTH = 595; // A4 width in points
const PAGE_HEIGHT = 842; // A4 height in points
const BLUE = '#1873cc';
const DARK = '#2d3748';
const MUTED = '#697077';
const BORDER = '#dce0e4';

// Helper functions
const handleUndefined = (value, fallback = '-') => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  if (value === 'N/A') return fallback;
  return value.toString();
};

const money = n => {
  return Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtDate = d => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-GB').replace(/\//g, '-');
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

// HTML Notes Rendering Function
const renderNotesHTML = notes => {
  if (!notes) return '';

  try {
    let formattedNotes = notes
      .replace(/\n/g, '<br>')
      .replace(/<br\s*\/?>/gi, '<br>')
      .replace(/<p>/gi, '<div style="margin-bottom: 8px;">')
      .replace(/<\/p>/gi, '</div>')
      .replace(
        /<b>(.*?)<\/b>/gi,
        '<strong style="font-weight: bold;">$1</strong>',
      )
      .replace(
        /<strong>(.*?)<\/strong>/gi,
        '<strong style="font-weight: bold;">$1</strong>',
      )
      .replace(/<i>(.*?)<\/i>/gi, '<em style="font-style: italic;">$1</em>')
      .replace(
        /<u>(.*?)<\/u>/gi,
        '<span style="text-decoration: underline;">$1</span>',
      )
      .replace(/<ul>/gi, '<div style="padding-left: 15px;">')
      .replace(/<\/ul>/gi, '</div>')
      .replace(/<li>/gi, '<div style="margin-bottom: 4px;">• ')
      .replace(/<\/li>/gi, '</div>')
      .replace(
        /<h1>(.*?)<\/h1>/gi,
        '<div style="font-size: 14px; font-weight: bold; margin: 10px 0 5px 0; color: #1873cc;">$1</div>',
      )
      .replace(
        /<h2>(.*?)<\/h2>/gi,
        '<div style="font-size: 12px; font-weight: bold; margin: 8px 0 4px 0; color: #1873cc;">$1</div>',
      )
      .replace(
        /<h3>(.*?)<\/h3>/gi,
        '<div style="font-size: 11px; font-weight: bold; margin: 6px 0 3px 0; color: #1873cc;">$1</div>',
      )
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .trim();

    return formattedNotes;
  } catch (error) {
    console.error('Error rendering notes HTML:', error);
    return notes.replace(/\n/g, '<br>');
  }
};

// Safe Phone Number Formatting
const safeFormatPhoneNumber = phoneNumber => {
  try {
    if (!phoneNumber) return '-';
    return formatPhoneNumber(phoneNumber);
  } catch (error) {
    console.error('Error formatting phone number:', error);
    return phoneNumber || '-';
  }
};

// Safe Number to Words
const safeNumberToWords = amount => {
  try {
    return numberToWords(amount);
  } catch (error) {
    console.error('Error converting number to words:', error);
    return `Rupees ${formatCurrency(amount)} Only`;
  }
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
  const {
    totalTaxable,
    totalAmount,
    items,
    totalItems,
    totalQty,
    itemsWithGST,
    totalCGST,
    totalSGST,
    totalIGST,
    isGSTApplicable,
    isInterstate,
    showIGST,
    showCGSTSGST,
    showNoTax,
  } = preparedData;

  // Convert items to lines
  const lines = itemsWithGST.map(item => ({
    name: capitalizeWords(item.name),
    description: item.description || '',
    quantity: item.itemType === 'service' ? '-' : item.quantity || 0,
    pricePerUnit: item.pricePerUnit || 0,
    amount: item.taxableValue,
    gstPercentage: item.gstRate,
    lineTax: item.cgst + item.sgst + item.igst,
    lineTotal: item.total,
    hsnSac: item.code || 'N/A',
    unit: item.unit || 'PCS',
  }));

  const subtotal = totalTaxable;
  const tax = totalCGST + totalSGST + totalIGST;
  const invoiceTotal = totalAmount;

  // Address functions
  const getBillingAddress = party => {
    if (!party) return 'Address not available';
    const parts = [
      party.addressLine1,
      party.addressLine2,
      party.city,
      party.state,
      party.pincode,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const getShippingAddress = (shippingAddr, billingAddr) => {
    if (!shippingAddr) return billingAddr;
    const parts = [
      shippingAddr.addressLine1,
      shippingAddr.addressLine2,
      shippingAddr.city,
      shippingAddr.state,
      shippingAddr.pincode,
    ].filter(Boolean);
    return parts.join(', ') || billingAddr;
  };

  const billingAddress = capitalizeWords(getBillingAddress(party));
  const shippingAddressStr = capitalizeWords(
    getShippingAddress(shippingAddress, billingAddress),
  );

  const companyGSTIN = _getGSTIN(company);
  const partyGSTIN = _getGSTIN(party);

  // Invoice data
  const invoiceData = {
    invoiceNumber: handleUndefined(transaction.invoiceNumber || transaction.id),
    date: handleUndefined(fmtDate(transaction.date) || fmtDate(new Date())),
    poNumber: handleUndefined(transaction.poNumber, '-'),
    poDate: handleUndefined(fmtDate(transaction.poDate), '-'),
    eWayNo: handleUndefined(transaction.eWayBillNo, '-'),

    company: {
      name: handleUndefined(
        capitalizeWords(company?.businessName),
        'Company Name',
      ),
      address: handleUndefined(
        capitalizeWords(company?.address),
        'Address not available',
      ),
      gstin: handleUndefined(companyGSTIN, '-'),
      pan: handleUndefined(company?.panNumber, '-'),
      state: handleUndefined(
        company?.addressState
          ? `${capitalizeWords(company.addressState)} (${
              getStateCode(company.addressState) || '-'
            })`
          : '-',
      ),
      city: handleUndefined(capitalizeWords(company?.city), '-'),
      phone: handleUndefined(company?.mobileNumber, '-'),
    },

    invoiceTo: {
      name: handleUndefined(capitalizeWords(party?.name), 'Client Name'),
      billingAddress: handleUndefined(billingAddress, 'Address not available'),
      gstin: handleUndefined(partyGSTIN, '-'),
      pan: handleUndefined(party?.panNumber, '-'),
      state: handleUndefined(
        party?.state
          ? `${capitalizeWords(party.state)} (${
              getStateCode(party.state) || '-'
            })`
          : '-',
      ),
    },

    shippingAddress: {
      name: handleUndefined(
        capitalizeWords(shippingAddress?.name || party?.name),
        'Client Name',
      ),
      address: handleUndefined(shippingAddressStr, 'Address not available'),
      state: handleUndefined(
        shippingAddress?.state
          ? `${capitalizeWords(shippingAddress.state)} (${
              getStateCode(shippingAddress.state) || '-'
            })`
          : party?.state
          ? `${capitalizeWords(party.state)} (${
              getStateCode(party.state) || '-'
            })`
          : '-',
      ),
    },
  };

  // Build table data
  const buildBodyData = () => {
    return lines.map((it, i) => {
      const baseData = [
        (i + 1).toString(),
        capitalizeWords(it.name || ''),
        it.hsnSac,
        money(it.pricePerUnit),
        it.quantity === '-'
          ? '-'
          : formatQuantity(Number(it.quantity), it.unit),
        money(it.amount),
      ];

      if (showIGST) {
        return [
          ...baseData,
          `${it.gstPercentage || 0}`,
          money(it.lineTax),
          money(it.lineTotal),
        ];
      } else if (showCGSTSGST) {
        const cgst = (it.lineTax || 0) / 2;
        const sgst = (it.lineTax || 0) / 2;
        return [
          ...baseData,
          `${(it.gstPercentage || 0) / 2}`,
          money(cgst),
          `${(it.gstPercentage || 0) / 2}`,
          money(sgst),
          money(it.lineTotal),
        ];
      } else {
        return [...baseData, money(it.lineTotal)];
      }
    });
  };

  // Get column widths
  const availableWidth = PAGE_WIDTH - 2 * MARGIN;
  const getColWidths = () => {
    if (showCGSTSGST) {
      const fixedSum = 28 + 18 + 48 + 26 + 55 + 45 + 50 + 55 + 45 + 55;
      const nameColWidth = availableWidth - fixedSum;
      return [23, nameColWidth, 40, 40, 33, 54, 35, 55, 35, 55, 55];
    } else if (showIGST) {
      const fixedSum = 28 + 48 + 45 + 28 + 55 + 40 + 55 + 55;
      const nameColWidth = availableWidth - fixedSum;
      return [28, nameColWidth, 42, 40, 37, 55, 40, 55, 58];
    } else {
      const fixedSum = 28 + 100 + 40 + 33 + 55 + 55;
      const nameColWidth = availableWidth - fixedSum;
      return [28, nameColWidth, 52, 50, 35, 70, 77];
    }
  };

  const tableData = buildBodyData();
  const colWidths = getColWidths();

  const title =
    transaction.type === 'proforma'
      ? 'PROFORMA INVOICE'
      : isGSTApplicable
      ? 'TAX INVOICE'
      : 'INVOICE';

  const placeOfSupply = shippingAddress?.state
    ? `${shippingAddress.state} (${getStateCode(shippingAddress.state) || '-'})`
    : party?.state
    ? `${party.state} (${getStateCode(party.state) || '-'})`
    : '-';

  const shippingGSTIN = _getGSTIN(shippingAddress) || partyGSTIN || '-';
  const shippingPhone =
    shippingAddress?.contactNumber ||
    shippingAddress?.phone ||
    party?.contactNumber ||
    '-';

  // Generate HTML content for PDF
  const generateHTML = () => {
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

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: Helvetica, Arial, sans-serif;
            margin: 0;
            padding: ${MARGIN}px;
            color: ${DARK};
            font-size: 10px;
            line-height: 1.2;
          }
          
          .page {
            position: relative;
            min-height: 100vh;
          }
          
          /* Header Styles */
          .header {
            margin-bottom: 20px;
          }
          
          .title {
            font-size: 18px;
            font-weight: bold;
            color: ${BLUE};
            text-align: center;
            margin-bottom: 24px;
          }
          
          .company-name {
            font-size: 15px;
            font-weight: bold;
            margin-bottom: 16px;
            text-transform: uppercase;
          }
          
          .company-details {
            font-size: 9px;
            margin-bottom: 2px;
          }
          
          .label {
            font-weight: bold;
          }
          
          .separator {
            height: 1.5px;
            background-color: ${BLUE};
            margin: 6px 0;
          }
          
          /* Section Styles */
          .section-title {
            font-size: 10px;
            font-weight: bold;
            color: ${BLUE};
            margin-bottom: 15px;
          }
          
          .customer-section {
            display: flex;
            flex-direction: row;
            margin-bottom: 20px;
          }
          
          .customer-details {
            flex: 2;
          }
          
          .meta-details {
            flex: 1;
            align-items: flex-end;
          }
          
          .customer-name {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 12px;
          }
          
          .address {
            font-size: 9px;
            margin-bottom: 12px;
            line-height: 1.2;
          }
          
          /* Table Styles */
          .table {
            margin: 10px 0;
          }
          
          .table-header {
            display: flex;
            flex-direction: row;
            background-color: ${BLUE};
            padding: 4px;
          }
          
          .table-header-text {
            color: #FFFFFF;
            font-size: 7px;
            font-weight: bold;
            text-align: center;
          }
          
          .table-row {
            display: flex;
            flex-direction: row;
            border-bottom: 0.3px solid ${BORDER};
            padding: 8px 0;
            min-height: 20px;
          }
          
          .table-cell {
            font-size: 7.5px;
            text-align: center;
            padding: 0 2px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .table-cell-left {
            font-size: 7.5px;
            text-align: left;
            padding: 0 2px;
            display: flex;
            align-items: center;
            justify-content: flex-start;
          }
          
          /* Totals Section */
          .totals-section {
            margin-top: 20px;
            align-items: flex-end;
          }
          
          .total-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            width: 200px;
            border: 1px solid ${BORDER};
            padding: 9px 12px;
            background-color: #FFFFFF;
          }
          
          .total-row-bold {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            width: 200px;
            border: 1px solid ${BORDER};
            padding: 10px 12px;
            background-color: #FFFFFF;
          }
          
          .total-label {
            font-size: 8px;
          }
          
          .total-label-bold {
            font-size: 9px;
            font-weight: bold;
          }
          
          .total-value {
            font-size: 8px;
          }
          
          .total-value-bold {
            font-size: 9px;
            font-weight: bold;
          }
          
          /* Amount in Words */
          .amount-in-words {
            margin: 30px 0 20px 0;
          }
          
          .amount-label {
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .amount-words {
            font-size: 8px;
            line-height: 1.2;
          }
          
          /* Footer */
          .footer {
            margin-top: 20px;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
          }
          
          .bank-details {
            flex: 2;
          }
          
          .signature {
            flex: 1;
            align-items: flex-end;
          }
          
          .bank-title {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 6px;
          }
          
          .bank-text {
            font-size: 8px;
            margin-bottom: 3px;
          }
          
          .signature-box {
            width: 120px;
            height: 50px;
            border: 1px solid ${BORDER};
            margin-top: 15px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          
          /* Terms and Conditions */
          .terms {
            margin-top: 40px;
          }
          
          .terms-title {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          
          .term-item {
            font-size: 8px;
            margin-bottom: 6px;
            line-height: 1.2;
          }
          
          .page-number {
            position: absolute;
            bottom: 15px;
            right: ${MARGIN}px;
            font-size: 8px;
          }
          
          .summary-text {
            font-size: 9px;
            margin-top: 16px;
          }
          
          .text-right {
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header -->
          <div class="header">
            <div class="title">${title}</div>

            <div class="company-name">${invoiceData.company.name}</div>

            ${
              invoiceData.company.gstin !== '-'
                ? `
              <div class="company-details">
                <span class="label">GSTIN: </span>${invoiceData.company.gstin}
              </div>
            `
                : ''
            }

            ${invoiceData.company.address
              .split(', ')
              .slice(0, 2)
              .map(
                (line, index) => `
              <div class="company-details">${line}</div>
            `,
              )
              .join('')}

            ${
              invoiceData.company.city !== '-'
                ? `
              <div class="company-details">${invoiceData.company.city}</div>
            `
                : ''
            }

            ${
              invoiceData.company.pan !== '-'
                ? `
              <div class="company-details">
                <span class="label">PAN: </span>${invoiceData.company.pan}
              </div>
            `
                : ''
            }

            ${
              invoiceData.company.phone !== '-'
                ? `
              <div class="company-details">
                <span class="label">Phone: </span>${safeFormatPhoneNumber(
                  invoiceData.company.phone,
                )}
              </div>
            `
                : ''
            }

            ${
              invoiceData.company.state !== '-'
                ? `
              <div class="company-details">
                <span class="label">State: </span>${invoiceData.company.state}
              </div>
            `
                : ''
            }

            <div class="separator"></div>
          </div>

          <!-- Customer and Meta Block -->
          <div class="customer-section">
            <div class="customer-details">
              <div class="section-title">Details of Buyer | Billed to :</div>

              <div class="customer-name">${invoiceData.invoiceTo.name}</div>

              ${invoiceData.invoiceTo.billingAddress
                .split(', ')
                .map(
                  (line, index) => `
                <div class="address">${line}</div>
              `,
                )
                .join('')}

              <div class="address">
                <span class="label">Phone No: </span>${safeFormatPhoneNumber(
                  party?.contactNumber || '-',
                )}
              </div>

              ${
                invoiceData.invoiceTo.gstin !== '-'
                  ? `
                <div class="address">
                  <span class="label">GSTIN: </span>${invoiceData.invoiceTo.gstin}
                </div>
              `
                  : ''
              }

              ${
                invoiceData.invoiceTo.pan !== '-'
                  ? `
                <div class="address">
                  <span class="label">PAN: </span>${invoiceData.invoiceTo.pan}
                </div>
              `
                  : ''
              }

              <div class="address">
                <span class="label">Place of Supply: </span>${placeOfSupply}
              </div>

              <div class="section-title" style="margin-top: 16px;">Details of Consigned | Shipped to :</div>

              <div class="customer-name">${
                invoiceData.shippingAddress.name
              }</div>

              ${invoiceData.shippingAddress.address
                .split(', ')
                .map(
                  (line, index) => `
                <div class="address">${line}</div>
              `,
                )
                .join('')}

              <div class="address">
                <span class="label">Phone No: </span>${safeFormatPhoneNumber(
                  shippingPhone,
                )}
              </div>

              <div class="address">
                <span class="label">GSTIN: </span>${shippingGSTIN}
              </div>

              ${
                invoiceData.shippingAddress.state !== '-'
                  ? `
                <div class="address">
                  <span class="label">State: </span>${invoiceData.shippingAddress.state}
                </div>
              `
                  : ''
              }
            </div>

            <div class="meta-details">
              <div class="address">
                <span class="label">Invoice # : </span>${
                  invoiceData.invoiceNumber
                }
              </div>
              <div class="address">
                <span class="label">Invoice Date : </span>${invoiceData.date}
              </div>
              <div class="address">
                <span class="label">P.O. No : </span>${invoiceData.poNumber}
              </div>
              <div class="address">
                <span class="label">P.O. Date : </span>${invoiceData.poDate}
              </div>
              <div class="address">
                <span class="label">E-Way No : </span>${invoiceData.eWayNo}
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="table">
            <!-- Table Header -->
            <div class="table-header">
              ${headers
                .map(
                  (header, index) => `
                <div class="table-header-text" style="width: ${colWidths[index]}px;">${header}</div>
              `,
                )
                .join('')}
            </div>

            <!-- Table Rows -->
            ${tableData
              .map(
                (row, rowIndex) => `
              <div class="table-row">
                ${row
                  .map(
                    (cell, cellIndex) => `
                  <div class="${
                    cellIndex === 1 ? 'table-cell-left' : 'table-cell'
                  }" style="width: ${colWidths[cellIndex]}px;">
                    ${cell}
                  </div>
                `,
                  )
                  .join('')}
              </div>
            `,
              )
              .join('')}
          </div>

          <!-- Summary -->
          <div class="summary-text">
            Total Items / Qty : ${totalItems} / ${
      totalQty % 1 === 0 ? totalQty.toFixed(0) : totalQty.toFixed(2)
    }
          </div>

          <!-- Totals -->
          <div class="totals-section">
            <div class="total-row">
              <div class="total-label">Taxable Amount</div>
              <div class="total-value">Rs.${formatCurrency(subtotal)}</div>
            </div>

            ${
              isGSTApplicable && showIGST
                ? `
              <div class="total-row">
                <div class="total-label">IGST</div>
                <div class="total-value">Rs.${formatCurrency(totalIGST)}</div>
              </div>
            `
                : ''
            }

            ${
              isGSTApplicable && showCGSTSGST
                ? `
              <div class="total-row">
                <div class="total-label">CGST</div>
                <div class="total-value">Rs.${formatCurrency(totalCGST)}</div>
              </div>
              <div class="total-row">
                <div class="total-label">SGST</div>
                <div class="total-value">Rs.${formatCurrency(totalSGST)}</div>
              </div>
            `
                : ''
            }

            <div class="total-row-bold">
              <div class="total-label-bold">Total</div>
              <div class="total-value-bold">Rs.${formatCurrency(
                invoiceTotal,
              )}</div>
            </div>
          </div>

          <!-- Amount in Words -->
          <div class="amount-in-words">
            <div class="amount-label">Total amount (in words):</div>
            <div class="amount-words">${safeNumberToWords(invoiceTotal)}</div>
          </div>

          <div class="separator"></div>

          <!-- Footer -->
          <div class="footer">
            <div class="bank-details">
              <div class="bank-title">Bank Details:</div>
              ${
                bank
                  ? `
                <div class="bank-text">Bank Name: ${bank.bankName || '-'}</div>
                <div class="bank-text">Branch: ${bank.branchName || '-'}</div>
                <div class="bank-text">IFSC: ${bank.ifscCode || '-'}</div>
                <div class="bank-text">Acc. Number: ${
                  bank.accountNumber || '-'
                }</div>
              `
                  : `
                <div class="bank-text">No bank details available</div>
              `
              }
            </div>

            <div class="signature">
              <div>For ${invoiceData.company.name}</div>
              <div class="signature-box"></div>
            </div>
          </div>

          <!-- Terms and Conditions -->
          ${
            transaction.notes
              ? `
            <div class="terms">
              <div class="terms-title">Terms and Conditions:</div>
              <div class="terms-content">
                ${renderNotesHTML(transaction.notes)}
              </div>
            </div>
          `
              : ''
          }

          <!-- Page Number -->
          <div class="page-number">Page 1 of 1</div>
        </div>
      </body>
      </html>
    `;
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
  console.log('Bank details from template 19:', bank);

  // Prepare data function (same as original)
  const prepareTemplateData = (
    transaction,
    company,
    party,
    shippingAddress,
  ) => {
    const items = transaction.items || [];
    const isInterstate = shippingAddress?.state !== company?.addressState;
    const isGSTApplicable = company?.gstin && party?.gstin;

    let totalTaxable = 0;
    let totalAmount = 0;
    let totalItems = items.length;
    let totalQty = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    const itemsWithGST = items.map(item => {
      const quantity = item.quantity || 0;
      const pricePerUnit = item.pricePerUnit || 0;
      const taxableValue = quantity * pricePerUnit;
      const gstRate = item.gstRate || 0;

      let cgst = 0,
        sgst = 0,
        igst = 0;

      if (isGSTApplicable) {
        if (isInterstate) {
          igst = taxableValue * (gstRate / 100);
        } else {
          cgst = taxableValue * (gstRate / 200);
          sgst = taxableValue * (gstRate / 200);
        }
      }

      const total = taxableValue + cgst + sgst + igst;

      totalTaxable += taxableValue;
      totalAmount += total;
      totalQty += quantity;
      totalCGST += cgst;
      totalSGST += sgst;
      totalIGST += igst;

      return {
        ...item,
        quantity,
        pricePerUnit,
        taxableValue,
        gstRate,
        cgst,
        sgst,
        igst,
        total,
        code: item.hsnSac || 'N/A',
        unit: item.unit || 'PCS',
      };
    });

    const showIGST = isGSTApplicable && isInterstate;
    const showCGSTSGST = isGSTApplicable && !isInterstate;
    const showNoTax = !isGSTApplicable;

    return {
      totalTaxable,
      totalAmount,
      items,
      totalItems,
      totalQty,
      itemsWithGST,
      totalCGST,
      totalSGST,
      totalIGST,
      isGSTApplicable,
      isInterstate,
      showIGST,
      showCGSTSGST,
      showNoTax,
    };
  };

  const preparedData = prepareTemplateData(
    transaction,
    company,
    party,
    shippingAddress,
  );

  try {
    const htmlContent = Template19({
      transaction,
      company,
      party,
      shippingAddress,
      bank,
      preparedData,
    });

    const options = {
      html: htmlContent,
      fileName: `invoice_${transaction.invoiceNumber || 'document'}`,
      directory: 'Documents',
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
    };

    const file = await RNHTMLtoPDF.convert(options);
    return file;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Utility function to use the component directly
export const generateTemplate19HTML = props => {
  return Template19(props);
};

export default Template19;
