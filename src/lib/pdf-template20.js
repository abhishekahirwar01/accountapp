// src/lib/pdf-template20.js
import React from 'react';
import {
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  prepareTemplate8Data,
  numberToWords,
  getStateCode,
  formatPhoneNumber,
  formatQuantity,
} from './pdf-utils';
import { parseNotesHtml, capitalizeWords } from './utils';
import { BASE_URL } from '../config';
import RNHTMLtoPDF from 'react-native-html-to-pdf';

// --- Constants ---
const PRIMARY_BLUE = '#0070c0';
const LIGHT_GRAY = '#f8f8f8';
const DARK_TEXT = '#333333';
const BORDER_COLOR = '#BABABA';

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
        '<div style="font-size: 14px; font-weight: bold; margin: 10px 0 5px 0; color: #0070c0;">$1</div>',
      )
      .replace(
        /<h2>(.*?)<\/h2>/gi,
        '<div style="font-size: 12px; font-weight: bold; margin: 8px 0 4px 0; color: #0070c0;">$1</div>',
      )
      .replace(
        /<h3>(.*?)<\/h3>/gi,
        '<div style="font-size: 11px; font-weight: bold; margin: 6px 0 3px 0; color: #0070c0;">$1</div>',
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

// --- Main PDF Component ---
const Template20 = ({ transaction, company, party, shippingAddress, bank }) => {
  const preparedData = prepareTemplate8Data(
    transaction,
    company,
    party,
    shippingAddress,
  );

  const {
    totalTaxable,
    totalAmount,
    items: allItems,
    totalItems,
    totalQty,
    totalCGST,
    totalSGST,
    totalIGST,
    isGSTApplicable,
    showIGST,
    showCGSTSGST,
    showNoTax,
  } = preparedData;

  const typedItems = preparedData.itemsWithGST || allItems;

  const shouldHideBankDetails = transaction.type === 'proforma';

  const logoSrc = company?.logo ? `${BASE_URL}${company.logo}` : null;

  const itemsToRender = typedItems;

  // Buyer Phone Logic
  const partyAsAny = party;
  const buyerPhone =
    (partyAsAny?.mobileNumber && typeof partyAsAny.mobileNumber === 'string'
      ? formatPhoneNumber(partyAsAny.mobileNumber.trim())
      : '') ||
    (partyAsAny?.phone && typeof partyAsAny.phone === 'string'
      ? formatPhoneNumber(partyAsAny.phone.trim())
      : '') ||
    (partyAsAny?.contactNumber && typeof partyAsAny.contactNumber === 'string'
      ? formatPhoneNumber(partyAsAny.contactNumber.trim())
      : '') ||
    '-';

  // Consignee Phone Logic
  const shippingAsAny = shippingAddress;
  const consigneePhone =
    (shippingAsAny?.phone && typeof shippingAsAny.phone === 'string'
      ? formatPhoneNumber(shippingAsAny.phone.trim())
      : '') ||
    (shippingAsAny?.mobileNumber &&
    typeof shippingAsAny.mobileNumber === 'string'
      ? formatPhoneNumber(shippingAsAny.mobileNumber.trim())
      : '') ||
    (shippingAsAny?.contactNumber &&
    typeof shippingAsAny.contactNumber === 'string'
      ? formatPhoneNumber(shippingAsAny.contactNumber.trim())
      : '') ||
    buyerPhone;

  const bankData = bank || {};
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  const amountInWords = safeNumberToWords(Math.round(totalAmount));

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
    // Column width calculations
    const getColWidths = () => {
      if (!isGSTApplicable || showNoTax) {
        return ['5%', '35%', '10%', '10%', '8%', '15%', '17%'];
      } else if (showIGST) {
        return ['5%', '30%', '8%', '8%', '7%', '12%', '10%', '10%', '12%'];
      } else {
        return [
          '5%',
          '25%',
          '7%',
          '7%',
          '6%',
          '10%',
          '8%',
          '8%',
          '8%',
          '8%',
          '8%',
        ];
      }
    };

    const colWidths = getColWidths();
    const getTotalColumnIndex = () => {
      if (!isGSTApplicable || showNoTax) return 6;
      if (showIGST) return 8;
      return 10;
    };
    const totalColumnIndex = getTotalColumnIndex();

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
            padding: 20px 30px;
            color: ${DARK_TEXT};
            font-size: 9px;
            line-height: 1.2;
          }
          
          .page {
            position: relative;
            min-height: 100vh;
          }
          
          /* Header Styles */
          .header-container {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 5px;
            border-bottom: 1.5px solid ${PRIMARY_BLUE};
            padding-bottom: 5px;
          }
          
          .logo-and-name-block {
            display: flex;
            flex-direction: row;
            align-items: center;
            width: 80%;
          }
          
          .logo-container {
            margin-right: 10px;
          }
          
          .logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
          }
          
          .company-name {
            font-size: 18px;
            font-weight: 800;
            color: ${PRIMARY_BLUE};
            margin-bottom: 2px;
          }
          
          .company-details-block {
            border-left: 1px solid ${LIGHT_GRAY};
            padding-left: 5px;
          }
          
          .gstin {
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 2px;
          }
          
          .address-text {
            font-size: 9.5px;
            line-height: 1.2;
            color: ${DARK_TEXT};
            margin-bottom: 1px;
          }
          
          .bold-text {
            font-weight: bold;
          }
          
          /* Invoice Info */
          .invoice-info-block {
            width: 30%;
            text-align: right;
          }
          
          .tax-invoice-title {
            font-size: 12px;
            font-weight: bold;
            color: ${PRIMARY_BLUE};
            margin-bottom: 5px;
            text-decoration: underline;
          }
          
          .invoice-date-row {
            display: flex;
            flex-direction: row;
            justify-content: flex-end;
            margin-bottom: 2px;
            align-items: center;
          }
          
          .invoice-label {
            font-size: 9px;
            width: 80px;
            text-align: left;
            font-weight: bold;
            margin-left: 35px;
          }
          
          .invoice-value {
            font-size: 9px;
            width: 100px;
            text-align: right;
            font-weight: bold;
          }
          
          /* Party Section */
          .party-section {
            display: flex;
            flex-direction: row;
            justify-content: space-around;
            margin-bottom: 1px;
            border-top: 1px solid ${LIGHT_GRAY};
            border-bottom: 1px solid ${LIGHT_GRAY};
            padding: 4px 0;
          }
          
          .combined-party-block {
            width: 60%;
            padding-right: 5px;
          }
          
          .transaction-details-block {
            width: 38%;
            padding-left: 10px;
            border-left: 1px solid ${LIGHT_GRAY};
          }
          
          .party-header {
            font-size: 9px;
            font-weight: bold;
            color: ${PRIMARY_BLUE};
            padding-bottom: 2px;
            margin-bottom: 3px;
          }
          
          /* Items Table */
          .table {
            width: 100%;
            border: 1px solid ${BORDER_COLOR};
            margin-bottom: 5px;
          }
          
          .table-header {
            display: flex;
            flex-direction: row;
            background-color: ${PRIMARY_BLUE};
            color: white;
            text-align: center;
            font-weight: bold;
            font-size: 7px;
          }
          
          .table-row {
            display: flex;
            flex-direction: row;
            border-bottom: 0.5px solid ${BORDER_COLOR};
            align-items: stretch;
          }
          
          .table-cell-header {
            border-right: 1px solid white;
            padding: 4px;
            text-align: center;
            font-size: 7px;
          }
          
          .table-cell {
            border-right: 0.5px solid ${BORDER_COLOR};
            padding: 4px;
            font-size: 7px;
            text-align: right;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .table-cell:last-child {
            border-right: none;
          }
          
          .table-cell-left {
            text-align: left;
            justify-content: flex-start;
            padding-left: 6px;
          }
          
          .table-cell-center {
            text-align: center;
          }
          
          /* Totals Section */
          .totals-section {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          
          .left-totals {
            width: 60%;
          }
          
          .right-totals {
            width: 38%;
          }
          
          .totals-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            padding: 1px 8px;
            font-size: 9px;
          }
          
          .total-amount-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            padding: 1px 8px;
            background-color: ${LIGHT_GRAY};
            font-size: 9px;
          }
          
          .amount-in-words {
            font-size: 8px;
            font-weight: normal;
            margin-top: 4px;
          }
          
          /* Bank & Terms Section */
          .bank-terms-section {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            margin-top: 1px;
            border-top: 1px solid ${PRIMARY_BLUE};
            padding-top: 5px;
          }
          
          .bank-header {
            font-size: 10px;
            font-weight: bold;
            color: ${PRIMARY_BLUE};
            margin-bottom: 5px;
          }
          
          .bank-row {
            display: flex;
            flex-direction: row;
            margin-bottom: 2px;
            font-size: 8px;
          }
          
          .bank-label {
            width: 65px;
            font-weight: bold;
            margin-right: 5px;
          }
          
          .small-text {
            font-size: 9px;
          }
          
          /* Signature Section */
          .signature-section {
            width: 38%;
            text-align: right;
            align-items: flex-end;
            padding-top: 5px;
            padding-left: 10px;
            margin-top: 20px;
            border-left: 1px solid ${BORDER_COLOR};
          }
          
          .signature-placeholder {
            height: 55px;
            width: 88px;
            margin-bottom: 4px;
            display: flex;
            justify-content: center;
            align-items: center;
            border: 1px dashed #ccc;
          }
          
          /* Terms and Conditions */
          .terms-container {
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid ${PRIMARY_BLUE};
          }
          
          .terms-content {
            font-size: 8px;
            line-height: 1.4;
          }
          
          .terms-content strong {
            font-weight: bold;
          }
          
          .terms-content em {
            font-style: italic;
          }
          
          .terms-content u {
            text-decoration: underline;
          }
          
          .terms-content div {
            margin-bottom: 6px;
          }
          
          .terms-content br {
            display: block;
            content: "";
            margin-bottom: 4px;
          }
          
          .terms-content ul {
            padding-left: 15px;
            margin-bottom: 8px;
          }
          
          .terms-content li {
            margin-bottom: 4px;
            list-style-type: disc;
          }
          
          .page-number {
            position: absolute;
            bottom: 5px;
            right: 30px;
            text-align: right;
            font-size: 7px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header Section -->
          <div class="header-container">
            <div class="logo-and-name-block">
              ${
                logoSrc
                  ? `
                <div class="logo-container">
                  <img src="${logoSrc}" class="logo" />
                </div>
              `
                  : ''
              }
              
              <div style="width: auto;">
                <div class="company-name">
                  ${company?.businessName || company?.companyName || ''}
                </div>
                
                <div class="company-details-block">
                  ${
                    company?.gstin
                      ? `
                    <div class="gstin">
                      GSTIN: <span style="font-weight: normal;">${company.gstin}</span>
                    </div>
                  `
                      : ''
                  }
                  
                  <div class="address-text">${company?.address || ''}</div>
                  <div class="address-text">
                    ${company?.addressState || ''}${
      company?.Country ? `, ${company.Country}` : ''
    }${company?.Pincode ? `, ${company.Pincode}` : ''}
                  </div>
                  <div class="address-text">
                    <span class="bold-text">Phone:</span> 
                    ${
                      company?.mobileNumber
                        ? safeFormatPhoneNumber(company.mobileNumber)
                        : company?.Telephone
                        ? safeFormatPhoneNumber(company.Telephone)
                        : '-'
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- Invoice Title & Number/Date -->
            <div class="invoice-info-block">
              <div class="tax-invoice-title">
                ${
                  transaction.type === 'proforma'
                    ? 'PROFORMA INVOICE'
                    : isGSTApplicable
                    ? 'TAX INVOICE'
                    : 'INVOICE'
                }
              </div>
              <div class="invoice-date-row">
                <div class="invoice-label">Invoice #:</div>
                <div class="invoice-value">${
                  transaction?.invoiceNumber?.toString() || ''
                }</div>
              </div>
              <div class="invoice-date-row">
                <div class="invoice-label">Invoice Date:</div>
                <div class="invoice-value">${formatDateSafe(
                  transaction?.date,
                )}</div>
              </div>
            </div>
          </div>

          <!-- Address Block -->
          <div class="party-section">
            <!-- Left Block - Buyer and Consignee Combined -->
            <div class="combined-party-block">
              <!-- Buyer Details -->
              <div style="margin-bottom: 4px;">
                <div class="party-header">Details of Buyer | Billed to :</div>
                
                <div class="address-text">
                  <span class="bold-text">Name:</span> ${capitalizeWords(
                    party?.name || '',
                  )}
                </div>
                
                <div class="address-text">
                  <span class="bold-text">Address:</span> ${capitalizeWords(
                    getBillingAddress(party),
                  )}
                </div>
                
                <div class="address-text">
                  <span class="bold-text">Phone:</span> ${safeFormatPhoneNumber(
                    buyerPhone,
                  )}
                </div>
                
                <div class="address-text">
                  <span class="bold-text">GSTIN:</span> ${party?.gstin || '-'}
                </div>
                
                <div class="address-text">
                  <span class="bold-text">PAN:</span> ${party?.pan || '-'}
                </div>
                
                <div class="address-text">
                  <span class="bold-text">Place of Supply:</span> 
                  ${
                    shippingAddress?.state
                      ? `${shippingAddress.state} (${
                          getStateCode(shippingAddress.state) || '-'
                        })`
                      : party?.state
                      ? `${party.state} (${getStateCode(party.state) || '-'})`
                      : '-'
                  }
                </div>
              </div>

              <!-- Consignee Details -->
              <div style="margin-top: 5px; padding-top: 1px;">
                <div class="party-header">Details of Consigned | Shipped to :</div>
                
                <div class="address-text">
                  <span class="bold-text">Name:</span> ${capitalizeWords(
                    shippingAddress?.label || party?.name || '',
                  )}
                </div>
                
                <div class="address-text">
                  <span class="bold-text">Address:</span> ${capitalizeWords(
                    getShippingAddress(
                      shippingAddress,
                      getBillingAddress(party),
                    ),
                  )}
                </div>
                
                ${
                  company?.Country
                    ? `
                  <div class="address-text">
                    <span class="bold-text">Country:</span> ${capitalizeWords(
                      company.Country,
                    )}
                  </div>
                `
                    : ''
                }
                
                ${
                  consigneePhone !== '-'
                    ? `
                  <div class="address-text">
                    <span class="bold-text">Phone:</span> ${safeFormatPhoneNumber(
                      consigneePhone,
                    )}
                  </div>
                `
                    : ''
                }
                
                <div class="address-text">
                  <span class="bold-text">GSTIN:</span> ${party?.gstin || '-'}
                </div>
                
                ${
                  shippingAddress?.state
                    ? `
                  <div class="address-text">
                    <span class="bold-text">State:</span> ${capitalizeWords(
                      shippingAddress.state,
                    )} (${getStateCode(shippingAddress.state) || '-'})
                  </div>
                `
                    : ''
                }
              </div>
            </div>

            <!-- Right Block - Transaction Details -->
            <div class="transaction-details-block">
              <div style="margin-top: 0; margin-left: 0; padding-top: 5px;">
                <div class="address-text" style="margin-bottom: 3px;">
                  <span class="bold-text">P.O. No.:</span> ${
                    transaction?.voucher || '-'
                  }
                </div>
                
                <div class="address-text" style="margin-bottom: 3px;">
                  <span class="bold-text">P.O. Date:</span> ${formatDateSafe(
                    transaction?.poDate,
                  )}
                </div>
                
                <div class="address-text" style="margin-bottom: 3px;">
                  <span class="bold-text">E-Way No.:</span> ${
                    transaction?.eway || '-'
                  }
                </div>
                
                <div class="address-text" style="margin-bottom: 3px;">
                  <span class="bold-text">Due Date:</span> ${formatDateSafe(
                    transaction?.dueDate,
                  )}
                </div>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="table">
            <!-- Table Header -->
            <div class="table-header">
              <div class="table-cell-header" style="width: ${
                colWidths[0]
              }">Sr. No.</div>
              <div class="table-cell-header table-cell-left" style="width: ${
                colWidths[1]
              }">Name of Product / Service</div>
              <div class="table-cell-header table-cell-center" style="width: ${
                colWidths[2]
              }">HSN / SAC</div>
              <div class="table-cell-header table-cell-center" style="width: ${
                colWidths[3]
              }">Rate (Rs.)</div>
              <div class="table-cell-header table-cell-center" style="width: ${
                colWidths[4]
              }">Qty</div>
              <div class="table-cell-header table-cell-center" style="width: ${
                colWidths[5]
              }">Taxable Value (Rs.)</div>

              ${
                showIGST
                  ? `
                <div class="table-cell-header table-cell-center" style="width: ${colWidths[6]}">IGST %</div>
                <div class="table-cell-header table-cell-center" style="width: ${colWidths[7]}">IGST Amt (Rs.)</div>
              `
                  : showCGSTSGST
                  ? `
                <div class="table-cell-header table-cell-center" style="width: ${colWidths[6]}">CGST %</div>
                <div class="table-cell-header table-cell-center" style="width: ${colWidths[7]}">CGST Amt (Rs.)</div>
                <div class="table-cell-header table-cell-center" style="width: ${colWidths[8]}">SGST %</div>
                <div class="table-cell-header table-cell-center" style="width: ${colWidths[9]}">SGST Amt (Rs.)</div>
              `
                  : ''
              }

              <div class="table-cell-header" style="width: ${
                colWidths[totalColumnIndex]
              }; border-right: none;">Total (Rs.)</div>
            </div>

            <!-- Table Rows -->
            ${itemsToRender
              .map(
                (item, index) => `
              <div class="table-row">
                <div class="table-cell table-cell-center" style="width: ${
                  colWidths[0]
                }">${index + 1}</div>
                <div class="table-cell table-cell-left" style="width: ${
                  colWidths[1]
                }">${item.name}</div>
                <div class="table-cell table-cell-center" style="width: ${
                  colWidths[2]
                }">${item.code || '-'}</div>
                <div class="table-cell table-cell-center" style="width: ${
                  colWidths[3]
                }">${formatCurrency(item.pricePerUnit || 0)}</div>
                <div class="table-cell table-cell-center" style="width: ${
                  colWidths[4]
                }">
                  ${
                    item.itemType === 'service'
                      ? '-'
                      : formatQuantity(item.quantity || 0, item.unit)
                  }
                </div>
                <div class="table-cell table-cell-center" style="width: ${
                  colWidths[5]
                }">${formatCurrency(item.taxableValue)}</div>

                ${
                  showIGST
                    ? `
                  <div class="table-cell table-cell-center" style="width: ${
                    colWidths[6]
                  }">${item.gstRate.toFixed(2)}</div>
                  <div class="table-cell table-cell-center" style="width: ${
                    colWidths[7]
                  }">${formatCurrency(item.igst)}</div>
                `
                    : showCGSTSGST
                    ? `
                  <div class="table-cell table-cell-center" style="width: ${
                    colWidths[6]
                  }">${(item.gstRate / 2).toFixed(2)}</div>
                  <div class="table-cell table-cell-center" style="width: ${
                    colWidths[7]
                  }">${formatCurrency(item.cgst)}</div>
                  <div class="table-cell table-cell-center" style="width: ${
                    colWidths[8]
                  }">${(item.gstRate / 2).toFixed(2)}</div>
                  <div class="table-cell table-cell-center" style="width: ${
                    colWidths[9]
                  }">${formatCurrency(item.sgst)}</div>
                `
                    : ''
                }

                <div class="table-cell table-cell-center" style="width: ${
                  colWidths[totalColumnIndex]
                }; border-right: none; font-weight: bold;">
                  ${formatCurrency(item.total)}
                </div>
              </div>
            `,
              )
              .join('')}
          </div>

          <!-- Totals Section -->
          <div class="totals-section">
            <!-- Left Section -->
            <div class="left-totals">
              <div style="margin-top: 1px; margin-bottom: 2px; padding: 6px 0; width: 100%;">
                <div style="font-size: 8px;">
                  Total Items / Qty : <span class="bold-text">${totalItems} / ${totalQty}</span>
                </div>
              </div>

              <div style="height: 10px;"></div>

              <div>
                <div style="margin-bottom: 4px; font-size: 9px; font-weight: bold;">
                  Total amount (in words):
                </div>
                <div class="amount-in-words">${amountInWords}</div>
              </div>
            </div>

            <!-- Right Section -->
            <div class="right-totals">
              <div class="totals-row">
                <div class="bold-text">Taxable Amount</div>
                <div>Rs.${formatCurrency(totalTaxable)}</div>
              </div>

              ${
                isGSTApplicable
                  ? `
                ${
                  showIGST
                    ? `
                  <div class="totals-row">
                    <div class="bold-text">IGST</div>
                    <div>Rs.${formatCurrency(totalIGST)}</div>
                  </div>
                `
                    : showCGSTSGST
                    ? `
                  <div class="totals-row">
                    <div class="bold-text">CGST</div>
                    <div>Rs.${formatCurrency(totalCGST)}</div>
                  </div>
                  <div class="totals-row">
                    <div class="bold-text">SGST</div>
                    <div>Rs.${formatCurrency(totalSGST)}</div>
                  </div>
                `
                    : ''
                }
              `
                  : ''
              }

              <div class="total-amount-row">
                <div class="bold-text">Total Amount</div>
                <div>Rs.${formatCurrency(totalAmount)}</div>
              </div>
            </div>
          </div>

          <!-- Bank and Signature Section -->
          <div class="bank-terms-section">
            <!-- Bank Details -->
            ${
              !shouldHideBankDetails
                ? `
              <div style="width: 60%; padding: 5px;">
                <div class="bank-header" style="margin-bottom: 3px;">Bank Details:</div>
                ${
                  isBankDetailAvailable
                    ? `
                  <div style="margin-top: 2px;">
                    ${
                      bankData.bankName
                        ? `
                      <div class="bank-row" style="margin-bottom: 1px;">
                        <div class="bank-label">Name:</div>
                        <div class="small-text">${capitalizeWords(
                          bankData.bankName,
                        )}</div>
                      </div>
                    `
                        : ''
                    }
                    
                    ${
                      bankData.ifscCode
                        ? `
                      <div class="bank-row" style="margin-bottom: 1px;">
                        <div class="bank-label">IFSC:</div>
                        <div class="small-text">${capitalizeWords(
                          bankData.ifscCode,
                        )}</div>
                      </div>
                    `
                        : ''
                    }
                    
                    ${
                      bankData?.accountNo
                        ? `
                      <div class="bank-row" style="margin-bottom: 1px;">
                        <div class="bank-label">Acc. No:</div>
                        <div class="small-text">${bankData.accountNo}</div>
                      </div>
                    `
                        : ''
                    }
                    
                    ${
                      bankData.branchAddress
                        ? `
                      <div class="bank-row" style="margin-bottom: 1px;">
                        <div class="bank-label">Branch:</div>
                        <div class="small-text" style="flex: 1;">${capitalizeWords(
                          bankData.branchAddress,
                        )}</div>
                      </div>
                    `
                        : ''
                    }
                    
                    ${
                      bankData?.upiDetails?.upiId
                        ? `
                      <div class="bank-row" style="margin-bottom: 1px;">
                        <div class="bank-label">UPI ID:</div>
                        <div class="small-text">${bankData.upiDetails.upiId}</div>
                      </div>
                    `
                        : ''
                    }
                    
                    ${
                      bankData?.upiDetails?.upiName
                        ? `
                      <div class="bank-row" style="margin-bottom: 1px;">
                        <div class="bank-label">UPI Name:</div>
                        <div class="small-text">${capitalizeWords(
                          bankData.upiDetails.upiName,
                        )}</div>
                      </div>
                    `
                        : ''
                    }
                    
                    ${
                      bankData?.upiDetails?.upiMobile
                        ? `
                      <div class="bank-row" style="margin-bottom: 1px;">
                        <div class="bank-label">UPI Mobile:</div>
                        <div class="small-text">${bankData.upiDetails.upiMobile}</div>
                      </div>
                    `
                        : ''
                    }
                  </div>
                `
                    : `
                  <div style="font-size: 8px; margin-top: 3px; color: #666;">
                    BANK DETAILS NOT AVAILABLE
                  </div>
                `
                }
              </div>
              
              ${
                bankData?.qrCode
                  ? `
                <div style="align-items: center; justify-content: center; padding: 5px; margin-left: 15px;">
                  <div style="font-size: 9px; font-weight: bold; margin-left: -2px;">QR Code</div>
                  <div style="background-color: #fff;">
                    <img src="${BASE_URL}${bankData.qrCode}" style="width: 80px; height: 80px; object-fit: contain;" />
                  </div>
                </div>
              `
                  : ''
              }
            `
                : ''
            }

            <!-- Signature Section -->
            <div class="signature-section">
              <div class="signature-placeholder">
                <div style="font-size: 7px; text-align: center;">
                  ${company?.businessName || 'Company'}
                </div>
              </div>
              <div style="font-size: 7px; margin-top: 3px; text-align: center;">
                AUTHORISED SIGNATORY
              </div>
            </div>
          </div>

          <!-- Terms and Conditions -->
          ${
            transaction?.notes
              ? `
            <div class="terms-container">
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
export const generatePdfForTemplate20 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
) => {
  try {
    const htmlContent = Template20({
      transaction,
      company,
      party,
      shippingAddress,
      bank,
    });

    const options = {
      html: htmlContent,
      fileName: `invoice_${transaction.invoiceNumber || 'document'}`,
      directory: 'Documents',
      width: 595, // A4 width in points
      height: 842, // A4 height in points
    };

    const file = await RNHTMLtoPDF.convert(options);
    return file;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Utility function to use the component directly
export const generateTemplate20HTML = props => {
  return Template20(props);
};

export default Template20;
