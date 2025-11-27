// pdf-templateA5.js
import React from 'react';
import {
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  prepareTemplate8Data,
  getStateCode,
  numberToWords,
  getHsnSummary,
  formatPhoneNumber,
  formatQuantity,
} from './pdf-utils';
import { capitalizeWords, parseNotesHtml } from './utils';
import { BASE_URL } from '../config';
import RNHTMLtoPDF from 'react-native-html-to-pdf';

// Constants
const PRIMARY_BLUE = '#0371C1';
const LIGHT_BLUE_BG = 'rgba(3, 113, 193, 0.2)';

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
        '<div style="font-size: 14px; font-weight: bold; margin: 10px 0 5px 0; color: #0371C1;">$1</div>',
      )
      .replace(
        /<h2>(.*?)<\/h2>/gi,
        '<div style="font-size: 12px; font-weight: bold; margin: 8px 0 4px 0; color: #0371C1;">$1</div>',
      )
      .replace(
        /<h3>(.*?)<\/h3>/gi,
        '<div style="font-size: 11px; font-weight: bold; margin: 6px 0 3px 0; color: #0371C1;">$1</div>',
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
const TemplateA5 = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  client,
}) => {
  const {
    totalTaxable,
    totalAmount,
    items,
    totalItems,
    totalQty,
    itemsBody,
    itemsWithGST,
    totalCGST,
    totalSGST,
    totalIGST,
    isGSTApplicable,
    isInterstate,
    showIGST,
    showCGSTSGST,
    showNoTax,
  } = prepareTemplate8Data(transaction, company, party, shippingAddress);

  const logoSrc = company?.logo ? `${BASE_URL}${company.logo}` : null;
  const shouldHideBankDetails = transaction.type === 'proforma';
  const bankData = bank || {};

  // Check if any bank detail is available
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.qrCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  // Column configurations
  const colWidthsIGST = ['4%', '30%', '10%', '8%', '10%', '15%', '20%', '12%'];
  const totalColumnIndexIGST = 7;

  const colWidthsCGSTSGST = [
    '4%',
    '30%',
    '10%',
    '8%',
    '10%',
    '12%',
    '12%',
    '12%',
    '15%',
  ];
  const totalColumnIndexCGSTSGST = 8;

  const colWidthsNoTax = ['10%', '25%', '10%', '10%', '10%', '15%', '20%'];
  const totalColumnIndexNoTax = 6;

  const colWidths = showIGST
    ? colWidthsIGST
    : showCGSTSGST
    ? colWidthsCGSTSGST
    : colWidthsNoTax;
  const totalColumnIndex = showIGST
    ? totalColumnIndexIGST
    : showCGSTSGST
    ? totalColumnIndexCGSTSGST
    : totalColumnIndexNoTax;

  // Safe date formatting
  const formatDateSafe = dateString => {
    try {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch (error) {
      return dateString || '-';
    }
  };

  // Generate HTML content for PDF
  const generateHTML = () => {
    // Generate HSN Summary table HTML
    const generateHsnSummaryHTML = () => {
      if (!isGSTApplicable) return '';

      try {
        const hsnSummary = getHsnSummary(itemsWithGST, showIGST, showCGSTSGST);
        const hsnColWidths = showIGST
          ? ['25%', '20%', '30%', '25%']
          : showCGSTSGST
          ? ['18%', '20%', '22%', '22%', '20%']
          : ['40%', '30%', '30%'];

        const hsnTotalColumnIndex = showIGST ? 3 : showCGSTSGST ? 4 : 2;

        return `
          <div class="hsn-tax-table">
            <div class="hsn-tax-table-header">
              <div class="hsn-tax-header-cell" style="width: ${
                hsnColWidths[0]
              }">HSN / SAC</div>
              <div class="hsn-tax-header-cell" style="width: ${
                hsnColWidths[1]
              }">Taxable Value (Rs.)</div>
              ${
                showIGST
                  ? `
                <div class="igst-header" style="width: ${hsnColWidths[2]}; border-right: 1px solid ${PRIMARY_BLUE};">
                  <div class="igst-main-header">IGST</div>
                  <div class="igst-sub-header">
                    <div class="igst-sub-percentage">%</div>
                    <div class="igst-sub-text">Amount (Rs.)</div>
                  </div>
                </div>
              `
                  : showCGSTSGST
                  ? `
                <div class="igst-header" style="width: ${hsnColWidths[2]}; border-right: 1px solid ${PRIMARY_BLUE};">
                  <div class="igst-main-header">CGST</div>
                  <div class="igst-sub-header">
                    <div class="igst-sub-percentage">%</div>
                    <div class="igst-sub-text">Amount (Rs.)</div>
                  </div>
                </div>
                <div class="igst-header" style="width: ${hsnColWidths[3]}">
                  <div class="igst-main-header">SGST</div>
                  <div class="igst-sub-header">
                    <div class="igst-sub-percentage">%</div>
                    <div class="igst-sub-text">Amount (Rs.)</div>
                  </div>
                </div>
              `
                  : ''
              }
              <div class="hsn-tax-header-cell" style="width: ${
                hsnColWidths[hsnTotalColumnIndex]
              }; border-left: 1px solid ${PRIMARY_BLUE}; border-right: none;">Total</div>
            </div>

            ${hsnSummary
              .map(
                (hsnItem, index) => `
              <div class="hsn-tax-table-row">
                <div class="hsn-tax-cell" style="width: ${hsnColWidths[0]}">${
                  hsnItem.hsnCode
                }</div>
                <div class="hsn-tax-cell" style="width: ${
                  hsnColWidths[1]
                }">${formatCurrency(hsnItem.taxableValue)}</div>
                ${
                  showIGST
                    ? `
                  <div class="igst-cell" style="width: ${hsnColWidths[2]}">
                    <div class="igst-percent">${hsnItem.taxRate}</div>
                    <div class="igst-amount">${formatCurrency(
                      hsnItem.taxAmount,
                    )}</div>
                  </div>
                `
                    : showCGSTSGST
                    ? `
                  <div class="igst-cell" style="width: ${
                    hsnColWidths[2]
                  }; border-right: 1px solid ${PRIMARY_BLUE};">
                    <div class="igst-percent">${hsnItem.taxRate / 2}</div>
                    <div class="igst-amount">${formatCurrency(
                      hsnItem.cgstAmount,
                    )}</div>
                  </div>
                  <div class="igst-cell" style="width: ${hsnColWidths[3]}">
                    <div class="igst-percent">${hsnItem.taxRate / 2}</div>
                    <div class="igst-amount">${formatCurrency(
                      hsnItem.sgstAmount,
                    )}</div>
                  </div>
                `
                    : ''
                }
                <div class="hsn-tax-cell" style="width: ${
                  hsnColWidths[hsnTotalColumnIndex]
                }; border-left: 1px solid ${PRIMARY_BLUE}; border-right: none;">${formatCurrency(
                  hsnItem.total,
                )}</div>
              </div>
            `,
              )
              .join('')}

            <div class="hsn-tax-table-total-row">
              <div class="hsn-tax-total-cell" style="width: ${
                hsnColWidths[0]
              }">Total</div>
              <div class="hsn-tax-total-cell" style="width: ${
                hsnColWidths[1]
              }">${formatCurrency(totalTaxable)}</div>
              ${
                showIGST
                  ? `
                <div class="hsn-tax-total-cell" style="width: ${
                  hsnColWidths[2]
                }; border-right: 1px solid ${PRIMARY_BLUE};">${formatCurrency(
                      totalIGST,
                    )}</div>
              `
                  : showCGSTSGST
                  ? `
                <div class="hsn-tax-total-cell" style="width: ${
                  hsnColWidths[2]
                }; border-right: 1px solid ${PRIMARY_BLUE};">${formatCurrency(
                      totalCGST,
                    )}</div>
                <div class="hsn-tax-total-cell" style="width: ${
                  hsnColWidths[3]
                }">${formatCurrency(totalSGST)}</div>
              `
                  : ''
              }
              <div class="hsn-tax-total-cell" style="width: ${
                hsnColWidths[hsnTotalColumnIndex]
              }; border-left: 1px solid ${PRIMARY_BLUE}; border-right: none;">${formatCurrency(
          totalAmount,
        )}</div>
            </div>
          </div>
        `;
      } catch (error) {
        console.error('Error generating HSN summary:', error);
        return '';
      }
    };

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
            padding: 15px;
            color: #000;
            font-size: 8px;
            line-height: 1.2;
            width: 595px;
            height: 420px;
          }
          
          .page {
            position: relative;
            width: 100%;
            min-height: 100vh;
          }
          
          /* Three Column Section */
          .three-col-section {
            display: flex;
            flex-direction: row;
            border: 1.5px solid ${PRIMARY_BLUE};
            margin-bottom: 5px;
          }
          
          .column {
            flex: 1;
            padding: 4px;
            border-left: 1px solid ${PRIMARY_BLUE};
          }
          
          .column:first-child {
            border-left: none;
          }
          
          .column-header {
            margin-bottom: 3px;
          }
          
          .threecol-table-header {
            font-size: 8px;
            font-weight: bold;
            color: ${PRIMARY_BLUE};
          }
          
          .data-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
            padding: 1px 0;
          }
          
          .table-label {
            font-size: 7px;
            font-weight: bold;
            width: 35%;
            flex-shrink: 0;
          }
          
          .table-value {
            font-size: 7px;
            font-weight: normal;
            width: 65%;
            flex-shrink: 1;
          }
          
          /* Items Table Styles */
          .table-container {
            position: relative;
            width: 100%;
            border: 1.5px solid ${PRIMARY_BLUE};
            margin-bottom: 5px;
          }
          
          .items-table-header {
            display: flex;
            flex-direction: row;
            background-color: rgba(3, 113, 193, 0.2);
            border-bottom: 1px solid ${PRIMARY_BLUE};
          }
          
          .header-cell {
            padding: 2px;
            text-align: center;
            font-size: 6px;
            font-weight: bold;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .header-cell:last-child {
            border-right: none;
          }
          
          .items-table-row {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            border-bottom: 1px solid ${PRIMARY_BLUE};
          }
          
          .items-table-total-row {
            display: flex;
            flex-direction: row;
            background-color: rgba(3, 113, 193, 0.2);
            align-items: center;
            border-top: 1px solid ${PRIMARY_BLUE};
          }
          
          .table-cell {
            padding: 2px;
            font-size: 6px;
            text-align: center;
            border-right: 1px solid ${PRIMARY_BLUE};
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .table-cell:last-child {
            border-right: none;
          }
          
          .product-cell {
            text-align: left;
            justify-content: flex-start;
          }
          
          /* IGST/CGST/SGST Styles */
          .igst-header {
            display: flex;
            flex-direction: column;
            font-size: 6px;
            font-weight: bold;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-main-header {
            font-size: 6px;
            font-weight: bold;
            text-align: center;
            padding: 1px;
          }
          
          .igst-sub-header {
            display: flex;
            flex-direction: row;
            border-top: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-sub-text {
            font-size: 5px;
            font-weight: bold;
            width: 70%;
            text-align: center;
            padding: 1px;
          }
          
          .igst-sub-percentage {
            font-size: 5px;
            font-weight: bold;
            width: 30%;
            text-align: center;
            padding: 1px;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-cell {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            gap: 5px;
            text-align: center;
            padding: 2px 0;
            font-size: 6px;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-percent {
            font-size: 6px;
            text-align: center;
            padding: 1px;
            width: 30%;
          }
          
          .igst-amount {
            font-size: 6px;
            text-align: center;
            padding: 1px;
            width: 70%;
          }
          
          /* Bottom Section Styles */
          .bottom-section {
            display: flex;
            flex-direction: row;
            border: 1.5px solid ${PRIMARY_BLUE};
            border-top: none;
          }
          
          .left-section {
            width: 65%;
            padding: 4px;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .right-section {
            width: 35%;
            padding: 4px;
          }
          
          .total-in-words {
            font-size: 6px;
            font-weight: bold;
            border-bottom: 1px solid ${PRIMARY_BLUE};
            padding: 2px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          
          .total-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            border-bottom: 1px solid ${PRIMARY_BLUE};
            padding: 2px;
          }
          
          .label {
            font-size: 7px;
            font-weight: bold;
          }
          
          .value {
            font-size: 7px;
            font-weight: bold;
          }
          
          .label-bold {
            font-size: 7px;
            font-weight: bold;
          }
          
          .value-bold {
            font-size: 7px;
            font-weight: bold;
          }
          
          .highlight-row {
            background-color: ${LIGHT_BLUE_BG};
          }
          
          /* HSN Tax Table */
          .hsn-tax-table {
            margin-top: 4px;
            border: 1px solid ${PRIMARY_BLUE};
          }
          
          .hsn-tax-table-header {
            display: flex;
            flex-direction: row;
            background-color: #f0f8ff;
            border-bottom: 1px solid ${PRIMARY_BLUE};
          }
          
          .hsn-tax-header-cell {
            padding: 1px;
            font-size: 6px;
            font-weight: bold;
            border-right: 1px solid ${PRIMARY_BLUE};
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .hsn-tax-table-row {
            display: flex;
            flex-direction: row;
            border-bottom: 1px solid ${PRIMARY_BLUE};
          }
          
          .hsn-tax-cell {
            padding: 1px;
            font-size: 6px;
            border-right: 1px solid ${PRIMARY_BLUE};
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .hsn-tax-table-total-row {
            display: flex;
            flex-direction: row;
            background-color: rgba(3, 113, 193, 0.2);
          }
          
          .hsn-tax-total-cell {
            padding: 1px;
            font-size: 6px;
            font-weight: bold;
            border-right: 1px solid ${PRIMARY_BLUE};
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          /* Bank Details */
          .bank-details {
            margin-top: 4px;
          }
          
          .bank-row {
            display: flex;
            flex-direction: row;
            margin-bottom: 1px;
            font-size: 6px;
          }
          
          .bank-details-container {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
          }
          
          .bank-info {
            flex: 1;
          }
          
          .qr-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-left: 5px;
          }
          
          .qr-image {
            width: 50px;
            height: 50px;
            object-fit: contain;
          }
          
          /* Terms and Conditions */
          .terms-box {
            border: 1px solid ${PRIMARY_BLUE};
            border-top: none;
            padding: 4px;
            font-size: 6px;
            line-height: 1.2;
          }
          
          .terms-content {
            font-size: 6px;
            line-height: 1.2;
          }
          
          .page-number {
            position: absolute;
            bottom: 5px;
            right: 10px;
            font-size: 6px;
            text-align: right;
          }
          
          /* Utility classes */
          .text-left { text-align: left; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .bg-highlight { background-color: ${LIGHT_BLUE_BG}; }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Three Columns Section -->
          <div class="three-col-section">
            <!-- Column 1 - Company details -->
            <div class="column" style="border-left: none;">
              <div class="column-header">
                <div class="threecol-table-header">
                  ${capitalizeWords(
                    company?.businessName ||
                      company?.companyName ||
                      'Company Name',
                  )}
                </div>
              </div>
              <div class="data-row">
                <div class="table-label">Address</div>
                <div class="table-value">
                  ${
                    [
                      company?.address,
                      company?.City,
                      company?.addressState,
                      company?.Country,
                      company?.Pincode,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Address Line 1'
                  }
                </div>
              </div>
              <div class="data-row">
                <div class="table-label">Phone</div>
                <div class="table-value">
                  ${
                    company?.mobileNumber
                      ? safeFormatPhoneNumber(String(company.mobileNumber))
                      : company?.Telephone
                      ? safeFormatPhoneNumber(String(company.Telephone))
                      : '-'
                  }
                </div>
              </div>
              <div class="data-row">
                <div class="table-label">GSTIN</div>
                <div class="table-value">${company?.gstin || '-'}</div>
              </div>
              <div class="data-row">
                <div class="table-label">PAN</div>
                <div class="table-value">${company?.PANNumber || '-'}</div>
              </div>
            </div>

            <!-- Column 2 - Invoice Details -->
            <div class="column">
              <div class="column-header">
                <div class="threecol-table-header">
                  ${
                    transaction.type === 'proforma'
                      ? 'PROFORMA INVOICE'
                      : isGSTApplicable
                      ? 'TAX INVOICE'
                      : 'INVOICE'
                  }
                </div>
              </div>
              <div class="data-row">
                <div class="table-label">Invoice No.</div>
                <div class="table-value">${
                  transaction.invoiceNumber || 'N/A'
                }</div>
              </div>
              <div class="data-row">
                <div class="table-label">Invoice Date</div>
                <div class="table-value">${formatDateSafe(
                  transaction.date,
                )}</div>
              </div>
              <div class="data-row">
                <div class="table-label">Due Date</div>
                <div class="table-value">${formatDateSafe(
                  transaction.dueDate,
                )}</div>
              </div>
              <div class="data-row">
                <div class="table-label"></div>
                <div class="table-value"></div>
              </div>
              <div class="data-row">
                <div class="table-label"></div>
                <div class="table-value"></div>
              </div>
            </div>

            <!-- Column 3 - Details of Buyer -->
            <div class="column">
              <div class="column-header">
                <div class="threecol-table-header">
                  To, ${capitalizeWords(party?.name || 'N/A')}
                </div>
              </div>
              <div class="data-row">
                <div class="table-label">Address</div>
                <div class="table-value">
                  ${capitalizeWords(getBillingAddress(party)) || '-'}
                </div>
              </div>
              <div class="data-row">
                <div class="table-label">Phone</div>
                <div class="table-value">
                  ${
                    party?.contactNumber
                      ? safeFormatPhoneNumber(party.contactNumber)
                      : '-'
                  }
                </div>
              </div>
              <div class="data-row">
                <div class="table-label">GSTIN</div>
                <div class="table-value">${party?.gstin || '-'}</div>
              </div>
              <div class="data-row">
                <div class="table-label">PAN</div>
                <div class="table-value">${party?.pan || '-'}</div>
              </div>
              <div class="data-row">
                <div class="table-label">Place of Supply</div>
                <div class="table-value">
                  ${
                    shippingAddress?.state
                      ? `${capitalizeWords(shippingAddress.state)} (${
                          getStateCode(shippingAddress.state) || '-'
                        })`
                      : party?.state
                      ? `${capitalizeWords(party.state)} (${
                          getStateCode(party.state) || '-'
                        })`
                      : '-'
                  }
                </div>
              </div>
            </div>

            <!-- Column 4 - Details of Consigned -->
            <div class="column">
              <div class="column-header">
                <div class="threecol-table-header">
                  Shipped To, ${capitalizeWords(
                    shippingAddress?.label || party?.name || 'N/A',
                  )}
                </div>
              </div>
              <div class="data-row">
                <div class="table-label">Address</div>
                <div class="table-value">
                  ${capitalizeWords(
                    getShippingAddress(
                      shippingAddress,
                      getBillingAddress(party),
                    ),
                  )}
                </div>
              </div>
              <div class="data-row">
                <div class="table-label">Country</div>
                <div class="table-value">India</div>
              </div>
              <div class="data-row">
                <div class="table-label">Phone</div>
                <div class="table-value">
                  ${
                    shippingAddress?.contactNumber
                      ? safeFormatPhoneNumber(
                          String(shippingAddress.contactNumber),
                        )
                      : party?.contactNumber
                      ? safeFormatPhoneNumber(String(party.contactNumber))
                      : '-'
                  }
                </div>
              </div>
              <div class="data-row">
                <div class="table-label">GSTIN</div>
                <div class="table-value">${party?.gstin || '-'}</div>
              </div>
              <div class="data-row">
                <div class="table-label">State</div>
                <div class="table-value">
                  ${
                    shippingAddress?.state
                      ? `${capitalizeWords(shippingAddress.state)} (${
                          getStateCode(shippingAddress.state) || '-'
                        })`
                      : party?.state
                      ? `${capitalizeWords(party.state)} (${
                          getStateCode(party.state) || '-'
                        })`
                      : '-'
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="table-container">
            <!-- Table Header -->
            <div class="items-table-header">
              <div class="header-cell" style="width: ${
                colWidths[0]
              }">Sr. No.</div>
              <div class="header-cell product-cell" style="width: ${
                colWidths[1]
              }">Name of Product/Service</div>
              <div class="header-cell" style="width: ${
                colWidths[2]
              }">HSN/SAC</div>
              <div class="header-cell" style="width: ${colWidths[3]}">Qty</div>
              <div class="header-cell" style="width: ${
                colWidths[4]
              }">Rate (Rs.)</div>
              <div class="header-cell bg-highlight" style="width: ${
                colWidths[5]
              }">Taxable Value (Rs.)</div>

              ${
                showIGST
                  ? `
                <div class="igst-header" style="width: ${colWidths[6]}">
                  <div class="igst-main-header">IGST</div>
                  <div class="igst-sub-header">
                    <div class="igst-sub-percentage">%</div>
                    <div class="igst-sub-text">Amount (Rs.)</div>
                  </div>
                </div>
                `
                  : showCGSTSGST
                  ? `
                <div class="igst-header" style="width: ${colWidths[6]}">
                  <div class="igst-main-header">CGST</div>
                  <div class="igst-sub-header">
                    <div class="igst-sub-percentage">%</div>
                    <div class="igst-sub-text">Amount (Rs.)</div>
                  </div>
                </div>
                <div class="igst-header" style="width: ${colWidths[7]}">
                  <div class="igst-main-header">SGST</div>
                  <div class="igst-sub-header">
                    <div class="igst-sub-percentage">%</div>
                    <div class="igst-sub-text">Amount (Rs.)</div>
                  </div>
                </div>
                `
                  : ''
              }

              <div class="header-cell bg-highlight" style="width: ${
                colWidths[totalColumnIndex]
              }">Total (Rs.)</div>
            </div>

            <!-- Table Rows -->
            ${itemsWithGST
              .map(
                (item, index) => `
              <div class="items-table-row">
                <div class="table-cell" style="width: ${colWidths[0]}">${
                  index + 1
                }</div>
                <div class="table-cell product-cell" style="width: ${
                  colWidths[1]
                }">${capitalizeWords(item.name)}</div>
                <div class="table-cell" style="width: ${colWidths[2]}">${
                  item.code || '-'
                }</div>
                <div class="table-cell" style="width: ${colWidths[3]}">
                  ${
                    item.itemType === 'service'
                      ? '-'
                      : formatQuantity(item.quantity || 0, item.unit)
                  }
                </div>
                <div class="table-cell" style="width: ${
                  colWidths[4]
                }">${formatCurrency(item.pricePerUnit || 0)}</div>
                <div class="table-cell bg-highlight" style="width: ${
                  colWidths[5]
                }">${formatCurrency(item.taxableValue)}</div>
                
                ${
                  showIGST
                    ? `
                <div class="igst-cell" style="width: ${colWidths[6]}">
                  <div class="igst-percent">${item.gstRate}</div>
                  <div class="igst-amount">${formatCurrency(item.igst)}</div>
                </div>
                `
                    : showCGSTSGST
                    ? `
                <div class="igst-cell" style="width: ${colWidths[6]}">
                  <div class="igst-percent">${item.gstRate / 2}</div>
                  <div class="igst-amount">${formatCurrency(item.cgst)}</div>
                </div>
                <div class="igst-cell" style="width: ${colWidths[7]}">
                  <div class="igst-percent">${item.gstRate / 2}</div>
                  <div class="igst-amount">${formatCurrency(item.sgst)}</div>
                </div>
                `
                    : ''
                }
                
                <div class="table-cell bg-highlight" style="width: ${
                  colWidths[totalColumnIndex]
                }">${formatCurrency(item.total)}</div>
              </div>
            `,
              )
              .join('')}

            <!-- Total Row -->
            <div class="items-table-total-row">
              <div class="table-cell" style="width: ${colWidths[0]}"></div>
              <div class="table-cell" style="width: ${colWidths[1]}"></div>
              <div class="table-cell font-bold" style="width: ${
                colWidths[2]
              }">Total</div>
              <div class="table-cell font-bold" style="width: ${
                colWidths[3]
              }">${totalQty}</div>
              <div class="table-cell" style="width: ${colWidths[4]}"></div>
              <div class="table-cell font-bold bg-highlight" style="width: ${
                colWidths[5]
              }">${formatCurrency(totalTaxable)}</div>
              
              ${
                showIGST
                  ? `
                <div class="table-cell font-bold" style="width: ${
                  colWidths[6]
                }">${formatCurrency(totalIGST)}</div>
                `
                  : showCGSTSGST
                  ? `
                <div class="table-cell font-bold" style="width: ${
                  colWidths[6]
                }">${formatCurrency(totalCGST)}</div>
                <div class="table-cell font-bold" style="width: ${
                  colWidths[7]
                }">${formatCurrency(totalSGST)}</div>
                `
                  : ''
              }
              
              <div class="table-cell font-bold bg-highlight" style="width: ${
                colWidths[totalColumnIndex]
              }">${formatCurrency(totalAmount)}</div>
            </div>
          </div>

          <!-- Bottom Sections -->
          <div class="bottom-section">
            <div class="left-section">
              <div class="total-in-words">
                Total in words : ${safeNumberToWords(totalAmount)}
              </div>

              ${isGSTApplicable ? generateHsnSummaryHTML() : ''}
            </div>

            <div class="right-section">
              <div class="total-row">
                <div class="label">Taxable Amount</div>
                <div class="value">Rs.${formatCurrency(totalTaxable)}</div>
              </div>

              ${
                isGSTApplicable
                  ? `
                <div class="total-row">
                  <div class="label">Total Tax</div>
                  <div class="value">
                    Rs.${formatCurrency(
                      showIGST ? totalIGST : totalCGST + totalSGST,
                    )}
                  </div>
                </div>
                `
                  : ''
              }

              <div class="total-row ${isGSTApplicable ? 'highlight-row' : ''}">
                <div class="${isGSTApplicable ? 'label-bold' : 'label'}">
                  ${isGSTApplicable ? 'Total Amount After Tax' : 'Total Amount'}
                </div>
                <div class="${isGSTApplicable ? 'value-bold' : 'value'}">
                  Rs.${formatCurrency(totalAmount)}
                </div>
              </div>

              <div class="total-row">
                <div class="label">
                  For ${capitalizeWords(
                    company?.businessName ||
                      company?.companyName ||
                      'Company Name',
                  )}
                </div>
                <div class="value">(E & O.E.)</div>
              </div>

              <!-- Bank Details Section -->
              ${
                transaction.type !== 'proforma' && isBankDetailAvailable
                  ? `
                <div class="bank-details">
                  <div style="font-size: 7px; font-weight: bold; margin-bottom: 3px;">Bank Details:</div>
                  <div class="bank-details-container">
                    <div class="bank-info">
                      ${
                        bankData?.bankName
                          ? `
                      <div class="bank-row">
                        <span style="width: 50px; font-weight: bold;">Name:</span>
                        <span>${capitalizeWords(bankData.bankName)}</span>
                      </div>
                      `
                          : ''
                      }
                      
                      ${
                        bankData?.accountNo
                          ? `
                      <div class="bank-row">
                        <span style="width: 50px; font-weight: bold;">Acc. No:</span>
                        <span>${bankData.accountNo}</span>
                      </div>
                      `
                          : ''
                      }
                      
                      ${
                        bankData?.ifscCode
                          ? `
                      <div class="bank-row">
                        <span style="width: 50px; font-weight: bold;">IFSC:</span>
                        <span>${bankData.ifscCode}</span>
                      </div>
                      `
                          : ''
                      }
                      
                      ${
                        bankData?.branchAddress
                          ? `
                      <div class="bank-row">
                        <span style="width: 50px; font-weight: bold;">Branch:</span>
                        <span style="flex: 1;">${bankData.branchAddress}</span>
                      </div>
                      `
                          : ''
                      }
                      
                      ${
                        bankData?.upiDetails?.upiId
                          ? `
                      <div class="bank-row">
                        <span style="width: 50px; font-weight: bold;">UPI ID:</span>
                        <span>${bankData.upiDetails.upiId}</span>
                      </div>
                      `
                          : ''
                      }

                      ${
                        bankData?.upiDetails?.upiName
                          ? `
                      <div class="bank-row">
                        <span style="width: 50px; font-weight: bold;">UPI Name:</span>
                        <span>${bankData.upiDetails.upiName}</span>
                      </div>
                      `
                          : ''
                      }

                      ${
                        bankData?.upiDetails?.upiMobile
                          ? `
                      <div class="bank-row">
                        <span style="width: 50px; font-weight: bold;">UPI Mobile:</span>
                        <span>${bankData.upiDetails.upiMobile}</span>
                      </div>
                      `
                          : ''
                      }
                    </div>
                    
                    ${
                      bankData?.qrCode
                        ? `
                    <div class="qr-container">
                      <div style="font-size: 7px; font-weight: bold; margin-bottom: 3px;">QR Code</div>
                      <img src="${BASE_URL}${bankData.qrCode}" class="qr-image" />
                    </div>
                    `
                        : ''
                    }
                  </div>
                </div>
                `
                  : ''
              }
            </div>
          </div>

          <!-- Terms and Conditions -->
          ${
            transaction?.notes
              ? `
            <div class="terms-box">
              <div class="terms-content">
                ${renderNotesHTML(transaction.notes)}
              </div>
            </div>
            `
              : ''
          }

          <!-- Page Number -->
          <div class="page-number">1 / 1 page</div>
        </div>
      </body>
      </html>
    `;
  };

  return generateHTML();
};

// --- PDF Generation Function ---
export const generatePdfForTemplateA5 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
  client,
) => {
  try {
    const htmlContent = TemplateA5({
      transaction,
      company,
      party,
      shippingAddress,
      bank,
      client,
    });

    const options = {
      html: htmlContent,
      fileName: `invoice_${transaction.invoiceNumber || 'document'}`,
      directory: 'Documents',
      width: 595, // A5 landscape width
      height: 420, // A5 landscape height
    };

    const file = await RNHTMLtoPDF.convert(options);
    return file;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Utility function to use the component directly
export const generateTemplateA5HTML = props => {
  return TemplateA5(props);
};

export default TemplateA5;
