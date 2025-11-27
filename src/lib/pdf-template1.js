// pdf-template1.js
import React from 'react';
import { View, Text, Image } from 'react-native';
import {
  deriveTotals,
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  getItemsBody,
  calculateGST,
  getUnifiedLines,
  prepareTemplate8Data,
  getStateCode,
  numberToWords,
  getHsnSummary,
  formatPhoneNumber,
  formatQuantity,
} from './pdf-utils';

import { capitalizeWords } from './utils';
import { BASE_URL } from '../config';
import { generatePDF } from 'react-native-html-to-pdf';

// --- Interface Definition ---
/**
 * @param {Object} transaction - Transaction data
 * @param {Object} company - Company data
 * @param {Object} party - Party data
 * @param {Object} shippingAddress - Shipping address data
 * @param {Object} bank - Bank details
 * @param {Object} client - Client data
 * @param {Object} clientName - Client name
 */

// Advanced HTML Notes Rendering Function with WebView compatible HTML
const renderNotesHTML = (notes, isForPDF = true) => {
  if (!notes) return '';

  try {
    // For PDF generation, we need to convert HTML to PDF-compatible HTML
    if (isForPDF) {
      let formattedNotes = notes
        // Convert newlines to breaks
        .replace(/\n/g, '<br>')
        // Standardize line breaks
        .replace(/<br\s*\/?>/gi, '<br>')
        // Convert paragraphs to divs with proper styling
        .replace(/<p>/gi, '<div style="margin-bottom: 8px;">')
        .replace(/<\/p>/gi, '</div>')
        // Handle bold text
        .replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>')
        .replace(
          /<strong>(.*?)<\/strong>/gi,
          '<strong style="font-weight: bold;">$1</strong>',
        )
        // Handle italic text
        .replace(/<i>(.*?)<\/i>/gi, '<em style="font-style: italic;">$1</em>')
        // Handle underline
        .replace(
          /<u>(.*?)<\/u>/gi,
          '<span style="text-decoration: underline;">$1</span>',
        )
        // Handle lists
        .replace(/<ul>/gi, '<div style="padding-left: 15px;">')
        .replace(/<\/ul>/gi, '</div>')
        .replace(/<li>/gi, '<div style="margin-bottom: 4px;">• ')
        .replace(/<\/li>/gi, '</div>')
        // Handle headings
        .replace(
          /<h1>(.*?)<\/h1>/gi,
          '<div style="font-size: 16px; font-weight: bold; margin: 10px 0 5px 0;">$1</div>',
        )
        .replace(
          /<h2>(.*?)<\/h2>/gi,
          '<div style="font-size: 14px; font-weight: bold; margin: 8px 0 4px 0;">$1</div>',
        )
        .replace(
          /<h3>(.*?)<\/h3>/gi,
          '<div style="font-size: 12px; font-weight: bold; margin: 6px 0 3px 0;">$1</div>',
        )
        // Remove any unsafe tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Ensure proper spacing
        .replace(/\s+/g, ' ')
        .trim();

      return formattedNotes;
    } else {
      // For WebView display (if needed separately)
      return notes;
    }
  } catch (error) {
    console.error('Error rendering notes HTML:', error);
    // Fallback: simple line break replacement
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
const Template1 = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  client,
  clientName,
}) => {
  // 1. Data Preparation and Calculations
  const {
    totals,
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

  const bankData = bank || {};

  // Check if any bank detail is available
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.qrCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  console.log('Bank data:', bankData);

  // 2. Dynamic Column Widths for Items Table
  const colWidthsIGST = ['4%', '30%', '10%', '8%', '10%', '15%', '20%', '12%'];
  const totalColumnIndexIGST = 7;

  const colWidthsCGSTSGST = [
    '4%',
    '30%',
    '10%',
    '8%',
    '10%',
    '10%',
    '13%',
    '13%',
    '10%',
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

  const getClientName = client => {
    if (!client) return 'Client Name';
    if (typeof client === 'string') return client;
    return client.companyName || client.contactName || 'Client Name';
  };

  const companyName =
    company?.businessName || company?.companyName || 'Company Name';

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
                <div class="igst-header" style="width: ${hsnColWidths[2]}; border-right: 1px solid #0371C1;">
                  <div class="igst-main-header">IGST</div>
                  <div class="igst-sub-header">
                    <div class="igst-sub-percentage">%</div>
                    <div class="igst-sub-text">Amount (Rs.)</div>
                  </div>
                </div>
              `
                  : showCGSTSGST
                  ? `
                <div class="igst-header" style="width: ${hsnColWidths[2]}; border-right: 1px solid #0371C1;">
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
              }; border-left: 1px solid #0371C1; border-right: none;">Total</div>
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
                  }; border-right: 1px solid #0371C1;">
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
                }; border-left: 1px solid #0371C1; border-right: none;">${formatCurrency(
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
                }; border-right: 1px solid #0371C1;">${formatCurrency(
                      totalIGST,
                    )}</div>
              `
                  : showCGSTSGST
                  ? `
                <div class="hsn-tax-total-cell" style="width: ${
                  hsnColWidths[2]
                }; border-right: 1px solid #0371C1;">${formatCurrency(
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
              }; border-left: 1px solid #0371C1; border-right: none;">${formatCurrency(
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

    // Safe date formatting
    const formatDateSafe = dateString => {
      try {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-IN');
      } catch (error) {
        return dateString || '-';
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
            padding: 25px;
            color: #000;
            font-size: 12px;
            line-height: 1.2;
          }
          
          .page {
            position: relative;
            min-height: 100vh;
          }
          
          /* Header Styles */
          .header {
            display: flex;
            flex-direction: row;
            margin-bottom: 10px;
            align-items: center;
            padding-bottom: 4px;
          }
          
          .header-left {
            align-items: flex-start;
          }
          
          .header-right {
            align-items: flex-start;
            width: 100%;
            margin-left: 20px;
          }
          
          .logo {
            width: 70px;
            height: 70px;
            margin-right: 5px;
          }
          
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
            margin-left: 2px;
          }
          
          .address {
            font-size: 10px;
            margin-bottom: 3px;
            line-height: 1.2;
            margin-left: 2px;
            text-align: left;
          }
          
          .contact-info {
            font-size: 10px;
            line-height: 1.2;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 4px;
            align-items: center;
          }
          
          .contact-label {
            font-size: 10px;
            font-weight: bold;
          }
          
          .contact-value {
            font-size: 10px;
            font-weight: normal;
          }
          
          /* Section Styles */
          .section {
            padding: 0;
          }
          
          .table-header {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            border: 1.5px solid #0371C1;
          }
          
          .gst-row {
            display: flex;
            flex-direction: row;
            padding: 3px;
          }
          
          .gst-label {
            font-size: 10px;
            font-weight: bold;
          }
          
          .gst-value {
            font-size: 10px;
            font-weight: normal;
          }
          
          .invoice-title-row {
            padding: 3px;
          }
          
          .invoice-title {
            font-size: 16px;
            font-weight: 800;
            text-align: center;
            color: #0371C1;
          }
          
          .recipient-row {
            padding: 3px;
          }
          
          .recipient-text {
            font-size: 10px;
            font-weight: bold;
            text-align: center;
          }
          
          /* Three Column Section */
          .three-col-section {
            display: flex;
            flex-direction: row;
            border-bottom: 1.5px solid #0371C1;
            border-left: 1.5px solid #0371C1;
            border-right: 1.5px solid #0371C1;
          }
          
          .column {
            width: 33.3%;
            padding: 0 4px;
            border-left: 1px solid #0371C1;
          }
          
          .column:first-child {
            border-left: none;
          }
          
          .column:last-child {
            border-right: none;
          }
          
          .column-header {
            margin-bottom: 5px;
          }
          
          .data-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
            padding: 2px 0;
          }
          
          .threecol-table-header {
            font-size: 8px;
            font-weight: bold;
          }
          
          .table-label {
            font-size: 8px;
            font-weight: bold;
            width: 40%;
            flex-shrink: 0;
          }
          
          .table-value {
            font-size: 8px;
            font-weight: normal;
            width: 70%;
            flex-shrink: 1;
          }
          
          /* Items Table Styles */
          .table-container {
            position: relative;
            width: 100%;
            border-bottom: 1.5px solid #0371C1;
            border-left: 1.5px solid #0371C1;
            border-right: 1.5px solid #0371C1;
          }
          
          .items-table-header {
            display: flex;
            flex-direction: row;
            background-color: rgba(3, 113, 193, 0.2);
            border-bottom: 1px solid #0371C1;
          }
          
          .header-cell {
            padding: 2px;
            text-align: center;
            font-size: 7px;
            font-weight: bold;
            border-right: 1px solid #0371C1;
          }
          
          .header-cell:last-child {
            border-right: none;
          }
          
          .items-table-row {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            border-bottom: 1px solid #0371C1;
          }
          
          .items-table-total-row {
            display: flex;
            flex-direction: row;
            background-color: rgba(3, 113, 193, 0.2);
            align-items: center;
            border-top: 1px solid #0371C1;
          }
          
          .table-cell {
            padding: 3px;
            font-size: 7px;
            text-align: center;
            border-right: 1px solid #0371C1;
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
            font-size: 7px;
            font-weight: bold;
            border-right: 1px solid #0371C1;
          }
          
          .igst-main-header {
            font-size: 7px;
            font-weight: bold;
            text-align: center;
            padding: 1px;
          }
          
          .igst-sub-header {
            display: flex;
            flex-direction: row;
            border-top: 1px solid #0371C1;
          }
          
          .igst-sub-text {
            font-size: 6px;
            font-weight: bold;
            width: 70%;
            text-align: center;
            padding: 1px;
          }
          
          .igst-sub-percentage {
            font-size: 6px;
            font-weight: bold;
            width: 30%;
            text-align: center;
            padding: 1px;
            border-right: 1px solid #0371C1;
          }
          
          .igst-cell {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            gap: 10px;
            text-align: center;
            padding: 3px 0;
            font-size: 7px;
            border-right: 1px solid #0371C1;
          }
          
          .igst-percent {
            font-size: 7px;
            text-align: center;
            padding: 1px;
            width: 30%;
          }
          
          .igst-amount {
            font-size: 7px;
            text-align: center;
            padding: 1px;
            width: 70%;
          }
          
          /* Bottom Section Styles */
          .bottom-section-column {
            display: flex;
            flex-direction: column;
            width: 100%;
            font-size: 7px;
            border-left: 1.5px solid #0371C1;
            border-right: 1.5px solid #0371C1;
            border-bottom: 1.5px solid #0371C1;
          }
          
          .bottom-section-row {
            display: flex;
            flex-direction: row;
            width: 100%;
            font-size: 7px;
          }
          
          .left-section {
            width: 65%;
            border-right: 1px solid #0371C1;
            padding: 5px;
          }
          
          .right-section {
            width: 35%;
            padding: 5px;
          }
          
          .total-in-words {
            font-size: 7px;
            font-weight: bold;
            border-bottom: 1px solid #0371C1;
            padding: 3px;
            text-transform: uppercase;
          }
          
          .total-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            border-bottom: 1px solid #0371C1;
            padding: 3px;
          }
          
          .label {
            font-size: 8px;
            font-weight: bold;
          }
          
          .value {
            font-size: 8px;
            font-weight: bold;
          }
          
          .highlight-row {
            background-color: #EAF4FF;
          }
          
          /* Signature Block */
          .signature-block {
            width: 100%;
            padding: 5px;
            align-items: center;
            margin-top: 20px;
            text-align: center;
          }
          
          .signature-title {
            font-size: 9px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 3px;
            text-align: center;
          }
          
          .signature-line {
            border-top: 1px solid #0371C1;
            width: 100%;
            padding-top: 2px;
            margin-top: 40px;
          }
          
          .authorized-text {
            font-size: 7px;
            text-align: center;
          }
          
          .page-number {
            position: absolute;
            bottom: 20px;
            right: 20px;
            font-size: 8px;
            text-align: right;
          }
          
          /* HSN Tax Table */
          .hsn-tax-table {
            margin-top: 10px;
            border: 1px solid #0371C1;
          }
          
          .hsn-tax-table-header {
            display: flex;
            flex-direction: row;
            background-color: #f0f8ff;
            border-bottom: 1px solid #0371C1;
          }
          
          .hsn-tax-header-cell {
            padding: 1px;
            font-size: 7px;
            font-weight: bold;
            border-right: 1px solid #0371C1;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .hsn-tax-table-row {
            display: flex;
            flex-direction: row;
            border-bottom: 1px solid #0371C1;
          }
          
          .hsn-tax-cell {
            padding: 1px;
            font-size: 7px;
            border-right: 1px solid #0371C1;
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
            font-size: 7px;
            font-weight: bold;
            border-right: 1px solid #0371C1;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          /* Bank Details */
          .bank-details {
            margin-bottom: 10px;
          }
          
          .bank-row {
            display: flex;
            flex-direction: row;
            margin-bottom: 2px;
            font-size: 8px;
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
            margin-top: 4px;
            margin-left: 10px;
          }
          
          .qr-image {
            width: 80px;
            height: 80px;
            object-fit: contain;
          }
          
          /* Terms and Conditions - Enhanced Styles */
          .terms-container {
            margin-top: 10px;
            padding: 5px;
            border-top: 1px solid #0371C1;
            font-size: 8px;
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
          
          /* List styles for terms */
          .terms-content ul {
            padding-left: 15px;
            margin-bottom: 8px;
          }
          
          .terms-content li {
            margin-bottom: 4px;
            list-style-type: disc;
          }
          
          /* Heading styles */
          .terms-content h1 {
            font-size: 12px;
            font-weight: bold;
            margin: 10px 0 5px 0;
            color: #0371C1;
          }
          
          .terms-content h2 {
            font-size: 11px;
            font-weight: bold;
            margin: 8px 0 4px 0;
            color: #0371C1;
          }
          
          .terms-content h3 {
            font-size: 10px;
            font-weight: bold;
            margin: 6px 0 3px 0;
            color: #0371C1;
          }
          
          /* Utility classes */
          .text-left { text-align: left; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .bg-highlight { background-color: rgba(3, 113, 193, 0.2); }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header -->
          <div class="header">
            ${
              logoSrc
                ? `
            <div class="header-left">
              <img src="${logoSrc}" class="logo" />
            </div>
            `
                : ''
            }
            <div class="header-right" style="${
              logoSrc ? '' : 'margin-left: 0;'
            }">
              <div class="company-name">${capitalizeWords(companyName)}</div>
              <div class="address">
                ${capitalizeWords(
                  [
                    company?.address,
                    company?.City,
                    company?.addressState,
                    company?.Country,
                    company?.Pincode,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Address Line 1',
                )}
              </div>
              <div class="contact-info">
                <span class="contact-label">Phone No: </span>
                <span class="contact-value">
                  ${safeFormatPhoneNumber(
                    company?.mobileNumber || company?.Telephone,
                  )}
                </span>
              </div>
            </div>
          </div>

          <!-- Main Section -->
          <div class="section">
            <!-- Table Header -->
            <div class="table-header">
              ${
                company?.gstin
                  ? `
              <div class="gst-row">
                <span class="gst-label">GSTIN : </span>
                <span class="gst-value">${company.gstin}</span>
              </div>
              `
                  : ''
              }
              
              <div class="invoice-title-row">
                <div class="invoice-title">
                  ${
                    transaction.type === 'proforma'
                      ? 'PROFORMA INVOICE'
                      : isGSTApplicable
                      ? 'TAX INVOICE'
                      : 'INVOICE'
                  }
                </div>
              </div>
              
              <div class="recipient-row">
                <div class="recipient-text">ORIGINAL FOR RECIPIENT</div>
              </div>
            </div>

            <!-- Three Columns Section -->
            <div class="three-col-section">
              <!-- Column 1 - Details of Buyer -->
              <div class="column">
                <div class="column-header">
                  <div class="threecol-table-header">Details of Buyer | Billed to:</div>
                </div>
                <div class="data-row">
                  <div class="table-label">Name:</div>
                  <div class="table-value">${capitalizeWords(
                    party?.name || 'N/A',
                  )}</div>
                </div>
                <div class="data-row">
                  <div class="table-label">Address:</div>
                  <div class="table-value">${capitalizeWords(
                    getBillingAddress(party),
                  )}</div>
                </div>
                <div class="data-row">
                  <div class="table-label">Phone:</div>
                  <div class="table-value">
                    ${safeFormatPhoneNumber(party?.contactNumber)}
                  </div>
                </div>
                <div class="data-row">
                  <div class="table-label">GSTIN:</div>
                  <div class="table-value">${party?.gstin || '-'}</div>
                </div>
                <div class="data-row">
                  <div class="table-label">PAN:</div>
                  <div class="table-value">${party?.pan || '-'}</div>
                </div>
                <div class="data-row">
                  <div class="table-label">Place of Supply:</div>
                  <div class="table-value">
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
              </div>

              <!-- Column 2 - Details of Consigned -->
              <div class="column">
                <div class="column-header">
                  <div class="threecol-table-header">Details of Consigned | Shipped to:</div>
                </div>
                <div class="data-row">
                  <div class="table-label">Name:</div>
                  <div class="table-value">
                    ${capitalizeWords(
                      shippingAddress?.label || party?.name || 'N/A',
                    )}
                  </div>
                </div>
                <div class="data-row">
                  <div class="table-label">Address:</div>
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
                  <div class="table-label">Country:</div>
                  <div class="table-value">${company?.Country || 'India'}</div>
                </div>
                <div class="data-row">
                  <div class="table-label">Phone:</div>
                  <div class="table-value">
                    ${safeFormatPhoneNumber(
                      shippingAddress?.contactNumber || party?.contactNumber,
                    )}
                  </div>
                </div>
                <div class="data-row">
                  <div class="table-label">GSTIN:</div>
                  <div class="table-value">${party?.gstin || '-'}</div>
                </div>
                <div class="data-row">
                  <div class="table-label">State:</div>
                  <div class="table-value">
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
              </div>

              <!-- Column 3 - Invoice Details -->
              <div class="column">
                <div class="data-row" style="display: flex; gap: 30px;">
                  <div class="table-label">Invoice No:</div>
                  <div class="table-value">${
                    transaction.invoiceNumber || 'N/A'
                  }</div>
                </div>
                <div class="data-row" style="display: flex; gap: 30px;">
                  <div class="table-label">Invoice Date:</div>
                  <div class="table-value">
                    ${formatDateSafe(transaction.date)}
                  </div>
                </div>
                <div class="data-row" style="display: flex; gap: 30px;">
                  <div class="table-label">Due Date:</div>
                  <div class="table-value">
                    ${formatDateSafe(transaction.dueDate)}
                  </div>
                </div>
                <div class="data-row" style="display: flex; gap: 30px;">
                  <div class="table-label">P.O. No:</div>
                  <div class="table-value">${transaction.voucher || '-'}</div>
                </div>
                <div class="data-row" style="display: flex; gap: 30px;">
                  <div class="table-label">E-Way No:</div>
                  <div class="table-value">${transaction.eway || '-'}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="section">
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
                <div class="header-cell" style="width: ${
                  colWidths[3]
                }">Qty</div>
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
            <div class="bottom-section-column">
              <div class="total-in-words">
                Total in words : ${safeNumberToWords(totalAmount)}
              </div>

              ${isGSTApplicable ? generateHsnSummaryHTML() : ''}
            </div>

            <div class="bottom-section-row">
              <div class="left-section">
                <!-- Bank Details -->
                ${
                  transaction.type !== 'proforma' && isBankDetailAvailable
                    ? `
                <div class="bank-details">
                  <div style="font-size: 9px; font-weight: bold; margin-bottom: 5px;">Bank Details:</div>
                  <div class="bank-details-container">
                    <div class="bank-info">
                      ${
                        bankData?.bankName
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">Name:</span>
                        <span>${capitalizeWords(bankData.bankName)}</span>
                      </div>
                      `
                          : ''
                      }
                      
                      ${
                        bankData?.accountNo
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">Acc. No:</span>
                        <span>${bankData.accountNo}</span>
                      </div>
                      `
                          : ''
                      }
                      
                      ${
                        bankData?.ifscCode
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">IFSC:</span>
                        <span>${bankData.ifscCode}</span>
                      </div>
                      `
                          : ''
                      }
                      
                      ${
                        bankData?.branchAddress
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">Branch:</span>
                        <span style="flex: 1;">${bankData.branchAddress}</span>
                      </div>
                      `
                          : ''
                      }
                      
                      ${
                        bankData?.upiDetails?.upiId
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">UPI ID:</span>
                        <span>${bankData.upiDetails.upiId}</span>
                      </div>
                      `
                          : ''
                      }

                      ${
                        bankData?.upiDetails?.upiName
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">UPI Name:</span>
                        <span>${bankData.upiDetails.upiName}</span>
                      </div>
                      `
                          : ''
                      }

                      ${
                        bankData?.upiDetails?.upiMobile
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">UPI Mobile:</span>
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
                      <div style="font-size: 9px; font-weight: bold; margin-bottom: 5px;">QR Code</div>
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

                <!-- Terms and Conditions with Enhanced HTML Support -->
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

                <div class="total-row ${
                  isGSTApplicable ? 'highlight-row' : ''
                }">
                  <div class="${isGSTApplicable ? 'label font-bold' : 'label'}">
                    ${
                      isGSTApplicable
                        ? 'Total Amount After Tax'
                        : 'Total Amount'
                    }
                  </div>
                  <div class="${isGSTApplicable ? 'value font-bold' : 'value'}">
                    Rs.${formatCurrency(totalAmount)}
                  </div>
                </div>

                <!-- Signature Block -->
                <div class="signature-block">
                  <div class="signature-title">For ${capitalizeWords(
                    companyName,
                  )}</div>
                  <div style="height: 40px;"></div>
                  <div class="signature-line">
                    <div class="authorized-text">Authorised Signatory</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
export const generatePdfForTemplate1 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
  client,
  clientName,
) => {
  try {
    console.log('🟡 PDF Generation Started - Template1');
    const htmlContent = Template1({
      transaction,
      company,
      party,
      shippingAddress,
      bank,
      client,
      clientName,
    });

    console.log('🟢 HTML Content Generated Successfully');
    console.log('HTML Length:', htmlContent.length);

    const options = {
      html: htmlContent,
      fileName: `invoice_${transaction.invoiceNumber || 'document'}`,
      directory: 'Documents',
      width: 595, // A4 width in points
      height: 842, // A4 height in points
      base64: true, // Add this to get base64 output
    };

    // Use generatePDF instead of RNHTMLtoPDF.convert
    const file = await generatePDF(options);
    console.log('🟢 PDF Generated Successfully!');

    // Return an object with output method for compatibility
    return {
      ...file,
      output: (format = 'base64') => {
        if (format === 'base64') return file.base64;
        if (format === 'filePath') return file.filePath;
        return file.base64;
      },
    };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Utility function to use the component directly
export const generateTemplate1HTML = props => {
  return Template1(props);
};

export default Template1;
