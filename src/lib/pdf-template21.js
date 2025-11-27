// template21.js (UPDATED VERSION with react-native-html-to-pdf)
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
import { capitalizeWords, parseNotesHtml } from './utils';
import { BASE_URL } from '../config';
import RNHTMLtoPDF from 'react-native-html-to-pdf';

// --- Constants ---
const PRIMARY_BLUE = '#0066cc';
const LIGHT_GRAY = '#f5f5f5';
const DARK_TEXT = '#000000';
const BORDER_COLOR = '#b2b2b2';
const TABLE_HEADER_BG = '#0066cc';
const PAGE_WIDTH = 595; // A4 width in points
const PAGE_HEIGHT = 842; // A4 height in points

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
        '<div style="font-size: 14px; font-weight: bold; margin: 10px 0 5px 0; color: #0066cc;">$1</div>',
      )
      .replace(
        /<h2>(.*?)<\/h2>/gi,
        '<div style="font-size: 12px; font-weight: bold; margin: 8px 0 4px 0; color: #0066cc;">$1</div>',
      )
      .replace(
        /<h3>(.*?)<\/h3>/gi,
        '<div style="font-size: 11px; font-weight: bold; margin: 6px 0 3px 0; color: #0066cc;">$1</div>',
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
const Template21 = ({ transaction, company, party, shippingAddress, bank }) => {
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
  } = preparedData;

  const typedItems = preparedData.itemsWithGST || allItems;

  const shouldHideBankDetails = transaction.type === 'proforma';

  const COL_WIDTH_SR_NO = 25;
  const COL_WIDTH_NAME = showIGST ? 130 : showCGSTSGST ? 110 : 195;
  const COL_WIDTH_HSN = showIGST ? 55 : showCGSTSGST ? 45 : 65;
  const COL_WIDTH_QTY = showIGST ? 45 : showCGSTSGST ? 35 : 55;
  const COL_WIDTH_RATE = showIGST ? 58 : showCGSTSGST ? 48 : 70;
  const COL_WIDTH_TAXABLE = showIGST ? 72 : showCGSTSGST ? 58 : 80;
  const COL_WIDTH_GST_PCT_HALF = 35;
  const COL_WIDTH_GST_AMT_HALF = 50;
  const COL_WIDTH_IGST_PCT = 40;
  const COL_WIDTH_IGST_AMT = 60;
  const COL_WIDTH_TOTAL = showIGST ? 50 : showCGSTSGST ? 65 : 90;

  const getColWidths = () => {
    let widths = [
      COL_WIDTH_SR_NO,
      COL_WIDTH_NAME,
      COL_WIDTH_HSN,
      COL_WIDTH_QTY,
      COL_WIDTH_RATE,
      COL_WIDTH_TAXABLE,
    ];

    if (showIGST) {
      widths.push(COL_WIDTH_IGST_PCT, COL_WIDTH_IGST_AMT);
    } else if (showCGSTSGST) {
      widths.push(
        COL_WIDTH_GST_PCT_HALF,
        COL_WIDTH_GST_AMT_HALF,
        COL_WIDTH_GST_PCT_HALF,
        COL_WIDTH_GST_AMT_HALF,
      );
    }
    widths.push(COL_WIDTH_TOTAL);

    return widths;
  };

  const colWidths = getColWidths();
  const totalColumnIndex = colWidths.length - 1;

  const calculateTotalLabelWidth = () => {
    if (showIGST) {
      return (
        COL_WIDTH_SR_NO +
        COL_WIDTH_NAME +
        COL_WIDTH_HSN +
        COL_WIDTH_QTY +
        COL_WIDTH_RATE +
        COL_WIDTH_TAXABLE +
        COL_WIDTH_IGST_PCT +
        COL_WIDTH_IGST_AMT
      );
    } else if (showCGSTSGST) {
      return (
        COL_WIDTH_SR_NO +
        COL_WIDTH_NAME +
        COL_WIDTH_HSN +
        COL_WIDTH_QTY +
        COL_WIDTH_RATE +
        COL_WIDTH_TAXABLE +
        COL_WIDTH_GST_PCT_HALF * 2 +
        COL_WIDTH_GST_AMT_HALF * 2
      );
    } else {
      return (
        COL_WIDTH_SR_NO +
        COL_WIDTH_NAME +
        COL_WIDTH_HSN +
        COL_WIDTH_QTY +
        COL_WIDTH_RATE +
        COL_WIDTH_TAXABLE
      );
    }
  };

  const getAddressLines = address =>
    address ? address.split('\n').filter(line => line.trim() !== '') : [];

  const bankData = bank || {};
  const totalAmountRounded = Math.round(totalAmount);
  const amountInWords = safeNumberToWords(totalAmountRounded);

  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  const extendedTransaction = transaction;

  const taxSummary = typedItems.reduce((acc, item) => {
    const key = `${item.code || '-'}-${item.gstRate || 0}`;

    if (!acc[key]) {
      acc[key] = {
        hsn: item.code || '-',
        taxableValue: 0,
        rate: item.gstRate || 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        total: 0,
      };
    }

    acc[key].taxableValue += item.taxableValue || 0;
    acc[key].igst += item.igst || 0;
    acc[key].cgst += item.cgst || 0;
    acc[key].sgst += item.sgst || 0;
    acc[key].total += (item.igst || 0) + (item.cgst || 0) + (item.sgst || 0);

    return acc;
  }, {});

  const taxSummaryArray = Object.values(taxSummary);

  const {
    title,
    isList,
    items: notesItems,
  } = parseNotesHtml(transaction?.notes || '');
  const termsTitle = title || 'Terms and Conditions';

  const termsItems =
    notesItems.length > 0 ? notesItems : ['No terms and conditions specified'];

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
    const companyName = company?.businessName || company?.companyName || '-';
    const partyAddress = getBillingAddress(party);
    const shippingAddressString = getShippingAddress(
      shippingAddress,
      partyAddress,
    );

    const totalLabelWidth = calculateTotalLabelWidth();

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
            padding: 15px 32px 30px 32px;
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
            margin-bottom: 2px;
            padding-bottom: 6px;
          }
          
          .left-header-block {
            width: 65%;
          }
          
          .tax-invoice-title {
            font-size: 16px;
            font-weight: bold;
            color: ${PRIMARY_BLUE};
            margin-bottom: 4px;
          }
          
          .company-name {
            font-size: 11px;
            font-weight: bold;
            color: ${DARK_TEXT};
            margin-bottom: 2px;
          }
          
          .gstin {
            font-size: 8px;
            font-weight: bold;
            margin-bottom: 2px;
            color: ${DARK_TEXT};
          }
          
          .address-text {
            font-size: 9px;
            line-height: 1.3;
            color: ${DARK_TEXT};
          }
          
          .right-header-block {
            width: 35%;
            align-items: flex-end;
          }
          
          .original-for-recipient {
            font-size: 8px;
            font-weight: bold;
            color: ${DARK_TEXT};
            margin-bottom: 4px;
            text-align: right;
          }
          
          .logo-container img {
            width: 70px;
            height: 70px;
            object-fit: contain;
          }
          
          .gray-color {
            color: #262626;
          }
          
          .section-header {
            font-size: 9px;
            margin-bottom: 3px;
          }
          
          .bold-text {
            font-weight: bold;
          }
          
          /* Table Styles */
          .table {
            width: auto;
            border-top: 1px solid ${BORDER_COLOR};
            border-left: 1px solid ${BORDER_COLOR};
            border-right: 1px solid ${BORDER_COLOR};
            margin-bottom: 5px;
          }
          
          .table-header {
            display: flex;
            flex-direction: row;
            background-color: ${TABLE_HEADER_BG};
            color: white;
            text-align: center;
            font-weight: bold;
            font-size: 7px;
            border-bottom: 1px solid ${TABLE_HEADER_BG};
          }
          
          .table-row {
            display: flex;
            flex-direction: row;
            border-bottom: 0.5px solid ${BORDER_COLOR};
            min-height: 16px;
          }
          
          .table-cell-header {
            border-right: 0.5px solid white;
            padding: 3px;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .table-cell {
            border-right: 0.5px solid ${BORDER_COLOR};
            padding: 2.5px;
            font-size: 7px;
            text-align: right;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .table-cell-center {
            text-align: center;
          }
          
          .table-cell-left {
            text-align: left;
            justify-content: flex-start;
          }
          
          /* Tax Summary Table */
          .tax-summary-table {
            margin-top: 2px;
            width: 100%;
            border: 1px solid ${BORDER_COLOR};
            margin-bottom: 6px;
          }
          
          .tax-header {
            display: flex;
            flex-direction: row;
            background-color: ${TABLE_HEADER_BG};
            color: white;
            text-align: center;
            font-weight: bold;
            font-size: 8px;
            border-bottom: 1px solid ${BORDER_COLOR};
          }
          
          .tax-row {
            display: flex;
            flex-direction: row;
            border-bottom: 0.5px solid ${BORDER_COLOR};
          }
          
          .tax-cell {
            padding: 2.5px;
            font-size: 8px;
            text-align: right;
            border-right: 0.5px solid ${BORDER_COLOR};
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          /* QR Bank Section */
          .qr-bank-section {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            margin-bottom: 6px;
            border: 1px solid ${BORDER_COLOR};
            min-height: 90px;
          }
          
          .qr-block {
            width: 25%;
            border-right: 1px solid ${BORDER_COLOR};
            align-items: center;
            text-align: center;
          }
          
          .bank-block {
            width: 55%;
            padding: 5px;
            border-right: 1px solid ${BORDER_COLOR};
          }
          
          .signature-block {
            width: 20%;
            padding: 5px;
            align-items: center;
            justify-content: space-between;
          }
          
          .section-title {
            font-size: 8px;
            font-weight: bold;
            color: ${DARK_TEXT};
            margin-bottom: 3px;
          }
          
          .bank-row {
            display: flex;
            flex-direction: row;
            margin-bottom: 1.5px;
            font-size: 7px;
          }
          
          .bank-label {
            width: 55px;
            font-weight: bold;
            margin-right: 4px;
            text-align: left;
          }
          
          .terms-section {
            width: 100%;
            border: 1px solid ${BORDER_COLOR};
            padding: 5px;
            padding-top: 0;
          }
          
          .term-line {
            font-size: 8px;
            line-height: 1.3;
          }
          
          .small-text {
            font-size: 7px;
          }
          
          .amount-in-words {
            font-size: 7.5px;
            margin-bottom: 2px;
            padding: 2px;
          }
          
          .grant-total-amount {
            font-size: 8px;
            margin-bottom: 2px;
            text-align: right;
            padding: 2px;
          }
          
          .page-number {
            position: absolute;
            bottom: 5px;
            right: 20px;
            text-align: right;
            font-size: 7px;
            color: #666;
          }
          
          .separator {
            height: 1.5px;
            background-color: ${PRIMARY_BLUE};
            margin: 6px 0;
          }
          
          .light-gray-bg {
            background-color: ${LIGHT_GRAY};
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header -->
          <div class="header-container">
            <div class="left-header-block">
              <div class="tax-invoice-title">
                ${
                  transaction.type === 'proforma'
                    ? 'PROFORMA INVOICE'
                    : isGSTApplicable
                    ? 'TAX INVOICE'
                    : 'INVOICE'
                }
              </div>

              <div class="company-name">${capitalizeWords(companyName)}</div>

              ${
                company?.gstin
                  ? `
                <div class="gstin">GSTIN: ${company.gstin}</div>
              `
                  : ''
              }
              
              ${getAddressLines(company?.address)
                .map(
                  (line, idx) => `
                <div class="address-text">${line}</div>
              `,
                )
                .join('')}
              
              ${
                company?.addressState
                  ? `
                <div class="address-text">
                  ${capitalizeWords(company.City)}, ${capitalizeWords(
                      company.addressState,
                    )}, ${capitalizeWords(company.Country)}${
                      company?.Pincode ? `, ${company.Pincode}` : ''
                    }
                </div>
              `
                  : ''
              }
              
              <div class="address-text">
                <span class="bold-text">Phone: </span>
                ${
                  company?.mobileNumber
                    ? safeFormatPhoneNumber(company.mobileNumber)
                    : company?.Telephone
                    ? safeFormatPhoneNumber(company.Telephone)
                    : '-'
                }
              </div>
            </div>

            <div class="right-header-block">
              <div class="original-for-recipient">ORIGINAL FOR RECIPIENT</div>
              ${
                company?.logo
                  ? `
                <div class="logo-container">
                  <img src="${BASE_URL}${company.logo}" />
                </div>
              `
                  : `
                <div style="width: 80px; height: 80px; border-radius: 40px;"></div>
              `
              }
            </div>
          </div>

          <!-- Address Sections -->
          <div style="display: flex; flex-direction: row; justify-content: space-between; margin-bottom: 10px; position: relative;">
            <div style="position: absolute; top: -6px; left: 0; right: 0; height: 1.5px; background-color: #007AFF;"></div>

            <div style="flex: 2; padding-right: 10px;">
              <div style="margin-bottom: 8px;">
                <div class="section-header gray-color" style="font-size: 10px; font-weight: bold;">
                  Details of Buyer | Billed to :
                </div>
                <div class="company-name gray-color" style="font-size: 9px;">
                  ${capitalizeWords(party?.name || '-')}
                </div>
                <div class="address-text gray-color" style="width: 90%; font-size: 9px;">
                  ${capitalizeWords(partyAddress || '-')}
                </div>

                <div class="address-text gray-color" style="font-size: 9px;">
                  <span class="bold-text" style="font-size: 9px;">GSTIN: </span>
                  <span>${party?.gstin || '-'}</span>
                </div>

                <div style="font-size: 9px;">
                  <span class="bold-text">Phone: </span>
                  <span>${
                    party?.contactNumber
                      ? safeFormatPhoneNumber(party.contactNumber)
                      : '-'
                  }</span>
                </div>

                <div class="address-text gray-color" style="font-size: 10px; margin-top: 3px;">
                  <span class="bold-text" style="font-size: 9px;">PAN: </span>
                  <span style="font-size: 9px;">${party?.pan || '-'}</span>
                </div>

                <div class="address-text gray-color" style="font-size: 9px; margin-bottom: 1px;">
                  <span class="bold-text" style="font-size: 9px;">Place of Supply: </span>
                  <span>
                    ${
                      shippingAddress?.state
                        ? `${shippingAddress.state} (${
                            getStateCode(shippingAddress.state) || '-'
                          })`
                        : party?.state
                        ? `${party.state} (${getStateCode(party.state) || '-'})`
                        : '-'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div style="flex: 2; padding-right: 10px;">
              <div>
                <div class="section-header gray-color" style="font-size: 10px; font-weight: bold;">
                  Details of Consigned | Shipped to :
                </div>
                <div class="company-name gray-color" style="font-size: 9px;">
                  ${capitalizeWords(
                    shippingAddress?.label || party?.name || ' ',
                  )}
                </div>
                <div class="address-text gray-color" style="font-size: 9px; margin-bottom: 1px;">
                  ${capitalizeWords(shippingAddressString || '-')}
                </div>
                <div class="address-text gray-color" style="font-size: 9px;">
                  <span class="bold-text" style="font-size: 9px; margin-bottom: 2px;">Country: </span>
                  <span>
                    ${
                      company?.Country ||
                      getShippingAddress(
                        shippingAddress,
                        getBillingAddress(party),
                      )
                        ?.split(',')[4]
                        ?.trim() ||
                      '-'
                    }
                  </span>
                </div>

                <div style="font-size: 9px; margin-bottom: 2px;">
                  <span class="bold-text">Phone: </span>
                  <span>
                    ${
                      shippingAddress?.contactNumber
                        ? safeFormatPhoneNumber(party?.contactNumber || '')
                        : party?.contactNumber
                        ? safeFormatPhoneNumber(party?.contactNumber || '')
                        : '-'
                    }
                  </span>
                </div>

                <div class="address-text gray-color" style="font-size: 9px;">
                  <span class="bold-text" style="font-size: 9px;">GSTIN: </span>
                  <span>${party?.gstin || '-'}</span>
                </div>

                <div class="address-text gray-color" style="font-size: 9px; margin-bottom: 1px;">
                  <span class="bold-text" style="font-size: 9px;">State: </span>
                  <span>
                    ${capitalizeWords(
                      shippingAddress?.state
                        ? `${shippingAddress.state} (${
                            getStateCode(shippingAddress.state) || '-'
                          })`
                        : party?.state
                        ? `${party.state} (${getStateCode(party.state) || '-'})`
                        : '-',
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div style="width: 20%; text-align: right;">
              <div style="display: flex; flex-direction: row; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 9px; font-weight: bold;">Invoice #:</span>
                <span style="font-size: 9px;">${
                  transaction?.invoiceNumber?.toString() || '-'
                }</span>
              </div>
              <div style="display: flex; flex-direction: row; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 9px; font-weight: bold;">Invoice Date:</span>
                <span style="font-size: 9px; font-weight: bold;">${formatDateSafe(
                  transaction?.date,
                )}</span>
              </div>
              <div style="display: flex; flex-direction: row; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 9px;">P.O. No.:</span>
                <span style="font-size: 9px;">${
                  extendedTransaction?.poNumber || '-'
                }</span>
              </div>
              <div style="display: flex; flex-direction: row; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 9px;">P.O. Date:</span>
                <span style="font-size: 9px;">${formatDateSafe(
                  extendedTransaction?.poDate,
                )}</span>
              </div>
              ${
                isGSTApplicable
                  ? `
                <div style="display: flex; flex-direction: row; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 9px;">E-Way No.:</span>
                  <span style="font-size: 9px;">${
                    extendedTransaction?.ewayNumber || '-'
                  }</span>
                </div>
              `
                  : ''
              }
            </div>
          </div>

          <!-- Items Table -->
          <div class="table">
            <!-- Table Header -->
            <div class="table-header">
              <div class="table-cell-header" style="width: ${
                colWidths[0]
              }px;">Sr.No</div>
              <div class="table-cell-header" style="width: ${
                colWidths[1]
              }px; text-align: center;">Name of Product / Service</div>
              <div class="table-cell-header" style="width: ${
                colWidths[2]
              }px;">HSN/SAC</div>
              <div class="table-cell-header" style="width: ${
                colWidths[3]
              }px;">Qty</div>
              <div class="table-cell-header" style="width: ${
                colWidths[4]
              }px;">Rate (Rs.)</div>
              <div class="table-cell-header" style="width: ${
                colWidths[5]
              }px;">Taxable Value (Rs.)</div>

              ${
                showIGST
                  ? `
                <div class="table-cell-header" style="width: ${colWidths[6]}px;">IGST%</div>
                <div class="table-cell-header" style="width: ${colWidths[7]}px;">IGST Amt (Rs.)</div>
              `
                  : showCGSTSGST
                  ? `
                <div class="table-cell-header" style="width: ${colWidths[6]}px;">CGST%</div>
                <div class="table-cell-header" style="width: ${colWidths[7]}px;">CGST Amt (Rs.)</div>
                <div class="table-cell-header" style="width: ${colWidths[8]}px;">SGST%</div>
                <div class="table-cell-header" style="width: ${colWidths[9]}px;">SGST Amt (Rs.)</div>
              `
                  : ''
              }

              <div class="table-cell-header" style="width: ${
                colWidths[totalColumnIndex]
              }px; border-right: none;">Total (Rs.)</div>
            </div>

            <!-- Table Rows -->
            ${typedItems
              .map((item, index) => {
                const isLastItemInList = index === typedItems.length - 1;
                return `
                <div class="table-row" ${
                  isLastItemInList
                    ? 'style="border-bottom: 1px solid ' + BORDER_COLOR + ';"'
                    : ''
                }>
                  <div class="table-cell table-cell-center" style="width: ${
                    colWidths[0]
                  }px; padding: 4px;">${index + 1}</div>

                  <div class="table-cell table-cell-left" style="width: ${
                    colWidths[1]
                  }px; padding: 3px; text-align: left; align-items: flex-start;">
                    <div class="small-text">${item.name}</div>
                    ${(item.details || [])
                      .map(
                        (detail, dIdx) => `
                      <div class="small-text" style="font-size: 6px; color: #666; margin-top: 0.5px;">${detail}</div>
                    `,
                      )
                      .join('')}
                  </div>

                  <div class="table-cell table-cell-center" style="width: ${
                    colWidths[2]
                  }px; padding: 4px;">${item.code || ''}</div>
                  <div class="table-cell table-cell-center" style="width: ${
                    colWidths[3]
                  }px; padding: 2px;">
                    ${
                      item.itemType === 'service'
                        ? '-'
                        : formatQuantity(item.quantity || 0, item.unit)
                    }
                  </div>
                  <div class="table-cell" style="width: ${
                    colWidths[4]
                  }px; padding: 4px;">${formatCurrency(
                  item.pricePerUnit || 0,
                )}</div>
                  <div class="table-cell" style="width: ${
                    colWidths[5]
                  }px; padding: 4px;">${formatCurrency(
                  item.taxableValue || 0,
                )}</div>

                  ${
                    showIGST
                      ? `
                    <div class="table-cell table-cell-center" style="width: ${
                      colWidths[6]
                    }px; padding: 4px;">${(item.gstRate || 0).toFixed(2)}</div>
                    <div class="table-cell" style="width: ${
                      colWidths[7]
                    }px; padding: 4px;">${formatCurrency(item.igst || 0)}</div>
                  `
                      : showCGSTSGST
                      ? `
                    <div class="table-cell table-cell-center" style="width: ${
                      colWidths[6]
                    }px; padding: 4px;">${((item.gstRate || 0) / 2).toFixed(
                          2,
                        )}</div>
                    <div class="table-cell" style="width: ${
                      colWidths[7]
                    }px; padding: 4px;">${formatCurrency(item.cgst || 0)}</div>
                    <div class="table-cell table-cell-center" style="width: ${
                      colWidths[8]
                    }px; padding: 4px;">${((item.gstRate || 0) / 2).toFixed(
                          2,
                        )}</div>
                    <div class="table-cell" style="width: ${
                      colWidths[9]
                    }px; padding: 4px;">${formatCurrency(item.sgst || 0)}</div>
                  `
                      : ''
                  }

                  <div class="table-cell" style="width: ${
                    colWidths[totalColumnIndex]
                  }px; font-weight: bold; border-right: none; padding: 4px;">
                    ${formatCurrency(item.total || 0)}
                  </div>
                </div>
              `;
              })
              .join('')}

            <!-- Total Row -->
            <div class="table-row light-gray-bg" style="border-bottom: 1px solid ${BORDER_COLOR};">
              <div class="table-cell" style="width: ${
                totalLabelWidth - colWidths[4] - colWidths[5]
              }px; font-weight: bold; text-align: left; padding-left: 3px; border-right: 0.5px solid ${BORDER_COLOR};">
                Total Items / Qty: ${totalItems} / ${totalQty}
              </div>
              <div class="table-cell" style="width: ${
                colWidths[4] + colWidths[5]
              }px; font-weight: bold; text-align: right; padding-right: 5px; border-right: ${
      isGSTApplicable ? '0.5px solid ' + BORDER_COLOR : 'none'
    };">
                Taxable Total:
              </div>
              <div class="table-cell" style="width: ${
                colWidths[totalColumnIndex]
              }px; font-weight: bold; border-right: none; padding: 4px;">
                ${formatCurrency(totalTaxable)}
              </div>
            </div>
          </div>

          <div style="height: 1px; background-color: #d3d3d3; width: 100%;"></div>

          <!-- Totals and Summary -->
          <div class="grant-total-amount">
            <div style="font-weight: normal; margin-bottom: 2px;">
              <span class="bold-text">Taxable Amount: </span>${formatCurrency(
                totalTaxable,
              )}
            </div>
            <div style="font-weight: normal; margin-bottom: 2px;">
              <span class="bold-text">Total GST: </span>${formatCurrency(
                isGSTApplicable
                  ? showIGST
                    ? totalIGST
                    : totalCGST + totalSGST
                  : 0,
              )}
            </div>
            <div class="bold-text">Grand Total: Rs. ${formatCurrency(
              totalAmount,
            )}</div>
          </div>

          <div class="amount-in-words">
            <div>
              <span style="font-size: 9px; font-weight: bold;">Total Amount (in words): </span>
              <span>${amountInWords}</span>
            </div>
          </div>

          <!-- Tax Summary Table -->
          ${
            isGSTApplicable && taxSummaryArray.length > 0
              ? `
            <div class="tax-summary-table">
              <div class="tax-header">
                <div class="tax-cell" style="width: 100px; border-right: 0.5px solid white;">HSN/SAC</div>
                <div class="tax-cell" style="width: 150px; border-right: 0.5px solid white;">Taxable Value (Rs.)</div>
                <div class="tax-cell" style="width: 50px; border-right: 0.5px solid white;">%</div>
                ${
                  showIGST
                    ? `
                  <div class="tax-cell" style="width: 120px; border-right: 0.5px solid white;">IGST (Rs.)</div>
                  <div class="tax-cell" style="width: 135px; border-right: none;">Total (Rs.)</div>
                `
                    : `
                  <div class="tax-cell" style="width: 90px; border-right: 0.5px solid white;">CGST (Rs.)</div>
                  <div class="tax-cell" style="width: 90px; border-right: 0.5px solid white;">SGST (Rs.)</div>
                  <div class="tax-cell" style="width: 75px; border-right: none;">Total (Rs.)</div>
                `
                }
              </div>

              ${taxSummaryArray
                .map(
                  (summary, index) => `
                <div class="tax-row" ${
                  index === taxSummaryArray.length - 1
                    ? 'style="border-bottom: none;"'
                    : ''
                }>
                  <div class="tax-cell" style="width: 100px; text-align: center;">${
                    summary.hsn
                  }</div>
                  <div class="tax-cell" style="width: 150px;">${formatCurrency(
                    summary.taxableValue,
                  )}</div>
                  <div class="tax-cell" style="width: 50px; text-align: center;">${summary.rate.toFixed(
                    2,
                  )}</div>
                  ${
                    showIGST
                      ? `
                    <div class="tax-cell" style="width: 120px;">${formatCurrency(
                      summary.igst,
                    )}</div>
                    <div class="tax-cell" style="width: 135px; border-right: none;">${formatCurrency(
                      summary.total,
                    )}</div>
                  `
                      : `
                    <div class="tax-cell" style="width: 90px;">${formatCurrency(
                      summary.cgst,
                    )}</div>
                    <div class="tax-cell" style="width: 90px;">${formatCurrency(
                      summary.sgst,
                    )}</div>
                    <div class="tax-cell" style="width: 75px; border-right: none;">${formatCurrency(
                      summary.total,
                    )}</div>
                  `
                  }
                </div>
              `,
                )
                .join('')}

              <div class="tax-row light-gray-bg" style="border-bottom: none;">
                <div class="tax-cell" style="width: 100px; font-weight: bold; text-align: center;">Total Tax</div>
                <div class="tax-cell" style="width: 150px; font-weight: bold;">${formatCurrency(
                  totalTaxable,
                )}</div>
                <div class="tax-cell" style="width: 50px;"> </div>
                ${
                  showIGST
                    ? `
                  <div class="tax-cell" style="width: 120px; font-weight: bold;">${formatCurrency(
                    totalIGST,
                  )}</div>
                  <div class="tax-cell" style="width: 135px; font-weight: bold; border-right: none;">${formatCurrency(
                    totalIGST,
                  )}</div>
                `
                    : `
                  <div class="tax-cell" style="width: 90px; font-weight: bold;">${formatCurrency(
                    totalCGST,
                  )}</div>
                  <div class="tax-cell" style="width: 90px; font-weight: bold;">${formatCurrency(
                    totalSGST,
                  )}</div>
                  <div class="tax-cell" style="width: 75px; font-weight: bold; border-right: none;">${formatCurrency(
                    totalCGST + totalSGST,
                  )}</div>
                `
                }
              </div>
            </div>
          `
              : ''
          }

          <!-- Bank and Signature Section -->
          <div class="qr-bank-section">
            ${
              !shouldHideBankDetails
                ? `
              <div class="bank-block">
                <div class="section-title">Bank Details:</div>
                <div style="margin-top: 2px;">
                  ${
                    bankData?.bankName
                      ? `
                    <div class="bank-row">
                      <div class="bank-label">Name:</div>
                      <div class="small-text">${capitalizeWords(
                        bankData.bankName,
                      )}</div>
                    </div>
                  `
                      : ''
                  }

                  ${
                    bankData?.accountNo
                      ? `
                    <div class="bank-row">
                      <div class="bank-label">Acc. No:</div>
                      <div class="small-text">${bankData.accountNo}</div>
                    </div>
                  `
                      : ''
                  }

                  ${
                    bankData?.ifscCode
                      ? `
                    <div class="bank-row">
                      <div class="bank-label">IFSC:</div>
                      <div class="small-text">${bankData.ifscCode}</div>
                    </div>
                  `
                      : ''
                  }

                  ${
                    bankData?.branchAddress
                      ? `
                    <div class="bank-row">
                      <div class="bank-label">Branch:</div>
                      <div class="small-text">${bankData.branchAddress}</div>
                    </div>
                  `
                      : ''
                  }

                  ${
                    bankData?.upiDetails?.upiId
                      ? `
                    <div class="bank-row">
                      <div class="bank-label">UPI ID:</div>
                      <div class="small-text">${bankData.upiDetails.upiId}</div>
                    </div>
                  `
                      : ''
                  }

                  ${
                    bankData?.upiDetails?.upiName
                      ? `
                    <div class="bank-row">
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
                    <div class="bank-row">
                      <div class="bank-label">UPI Mobile:</div>
                      <div class="small-text">${bankData.upiDetails.upiMobile}</div>
                    </div>
                  `
                      : ''
                  }
                </div>
              </div>
            `
                : ''
            }

            ${
              !shouldHideBankDetails && bankData?.qrCode
                ? `
              <div class="qr-block">
                <div style="align-items: center; justify-content: center; margin-top: 4px;">
                  <div style="font-size: 9px; font-weight: bold;">QR Code</div>
                  <div style="background-color: #fff;">
                    <img src="${BASE_URL}${bankData.qrCode}" style="width: 80px; height: 80px; object-fit: contain;" />
                  </div>
                </div>
              </div>
            `
                : ''
            }

            <div class="signature-block" style="border-left: none; border-left-color: transparent; padding-left: 5px;">
              <div class="section-title" style="text-align: center; font-size: 7px;">For ${companyName}</div>

              <div style="height: 40px; width: 100%; align-items: center; justify-content: center;"></div>

              <div style="border-top: 1px solid ${BORDER_COLOR}; width: 100%; padding-top: 2px;">
                <div style="font-size: 6px; text-align: center;">Authorised Signatory</div>
              </div>
            </div>
          </div>

          <!-- Terms and Conditions -->
          ${
            transaction?.notes
              ? `
            <div class="terms-section">
              <div class="terms-content">
                ${renderNotesHTML(transaction.notes)}
              </div>
            </div>
          `
              : ''
          }

          <!-- Page Number -->
          <div class="page-number">1 / 1 Page</div>
        </div>
      </body>
      </html>
    `;
  };

  return generateHTML();
};

// --- PDF Generation Function ---
export const generatePdfForTemplate21 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
) => {
  try {
    const htmlContent = Template21({
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
export const generateTemplate21HTML = props => {
  return Template21(props);
};

export default Template21;
