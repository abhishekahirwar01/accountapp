// template17.js - Tax Invoice FINAL CORRECTED VERSION
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
import { capitalizeWords } from './utils';
import { generatePDF } from 'react-native-html-to-pdf';
import { BASE_URL } from '../config';

// --- Constants ---
const PRIMARY_BLUE = '#0066cc';
const LIGHT_BLUE = '#e6f2ff';
const TABLE_ROW_ALT = '#f0f8ff';
const DARK_TEXT = '#000000';
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN = 15;
const PAGE_MARGIN_BOTTOM = 30;

// --- Helper Functions ---
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
    console.error('Error formatting phone number:', error);
    return phoneNumber || '-';
  }
};

const safeNumberToWords = amount => {
  try {
    return numberToWords(amount);
  } catch (error) {
    console.error('Error converting number to words:', error);
    return `Rupees ${formatCurrency(amount)} Only`;
  }
};

const formatDateSafe = dateString => {
  try {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  } catch (error) {
    return dateString || '-';
  }
};

// --- Pagination helpers ---
const NAME_FONT_SIZE = 9;
const CHAR_WIDTH_FACTOR = 0.5;
const NAME_LINE_HEIGHT = 10;
const ROW_VERTICAL_PADDING = 8;
const HEADER_EST = 200;
const FOOTER_RESERVE = 160;

const estimateWrappedLines = (text, colWidth, fontSize = NAME_FONT_SIZE) => {
  if (!text) return 1;
  const str = String(text).replace(/<br\s*\/?>(\s*)/gi, '\n');
  const linesFromBreaks = str.split('\n');
  const width = Math.max(40, colWidth - 8);
  const avgCharWidth = fontSize * CHAR_WIDTH_FACTOR;

  const estimateForLine = line => {
    const words = line.split(/\s+/).filter(Boolean);
    let lines = 1;
    let current = 0;
    for (const w of words) {
      const wWidth = w.length * avgCharWidth + avgCharWidth;
      if (current + wWidth > width) {
        lines++;
        current = wWidth;
      } else {
        current += wWidth;
      }
    }
    return lines;
  };

  let total = 0;
  for (const ln of linesFromBreaks) total += estimateForLine(ln);
  return Math.max(1, total);
};

const splitItemsIntoPages = (items, colWidths, pageHeight = PAGE_HEIGHT) => {
  const pages = [];
  if (!Array.isArray(items) || items.length === 0) return pages;

  const availableHeight = Math.max(
    200,
    pageHeight - PAGE_MARGIN - PAGE_MARGIN_BOTTOM - HEADER_EST - FOOTER_RESERVE,
  );

  let currentPage = [];
  let usedHeight = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const nameColWidth = colWidths[1] || 150;
    const nameLines = estimateWrappedLines(item.name || '', nameColWidth);
    const itemHeight = nameLines * NAME_LINE_HEIGHT + ROW_VERTICAL_PADDING;

    if (usedHeight + itemHeight > availableHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      usedHeight = 0;
    }

    currentPage.push(item);
    usedHeight += itemHeight;
  }

  if (currentPage.length) pages.push(currentPage);
  return pages;
};

const generateTableHeader = (showIGST, showCGSTSGST) => {
  return `
    <thead>
      <tr class="table-header-row">
        <th rowspan="2" style="width: 35px; vertical-align: middle;">Sr.No.</th>
        <th rowspan="2" style="width: 150px; vertical-align: middle;">Name of Product / Service</th>
        <th rowspan="2" style="width: 60px; vertical-align: middle;">HSN/SAC</th>
        <th rowspan="2" style="width: 40px; vertical-align: middle;">Qty</th>
        <th rowspan="2" style="width: 45px; vertical-align: middle;">Unit</th>
        <th rowspan="2" style="width: 65px; vertical-align: middle;">Rate (Rs.)</th>
        <th rowspan="2" style="width: 75px; vertical-align: middle;">Taxable Value (Rs.)</th>
        ${
          showIGST
            ? `
          <th colspan="2" style="vertical-align: middle;">IGST</th>
        `
            : showCGSTSGST
            ? `
          <th colspan="2" style="vertical-align: middle;">CGST</th>
          <th colspan="2" style="vertical-align: middle;">SGST</th>
        `
            : ''
        }
        <th rowspan="2" style="width: 70px; vertical-align: middle;">Total (Rs.)</th>
      </tr>
      ${
        showIGST || showCGSTSGST
          ? `
      <tr class="table-header-row">
        ${
          showIGST
            ? `
          <th style="width: 30px;">%</th>
          <th style="width: 60px;">Amount(Rs.)</th>
        `
            : showCGSTSGST
            ? `
          <th style="width: 30px;">%</th>
          <th style="width: 55px;">Amount(Rs.)</th>
          <th style="width: 30px;">%</th>
          <th style="width: 55px;">Amount(Rs.)</th>
        `
            : ''
        }
      </tr>
      `
          : ''
      }
    </thead>
  `;
};

// --- Main Component ---
const Template17 = ({ transaction, company, party, shippingAddress, bank }) => {
  const actualShippingAddress = shippingAddress || transaction?.shippingAddress;
  const preparedData = prepareTemplate8Data(
    transaction,
    company,
    party,
    actualShippingAddress,
  );

  const {
    totalTaxable,
    totalAmount,
    items: allItems,
    totalQty,
    totalCGST,
    totalSGST,
    totalIGST,
    isGSTApplicable,
    showIGST,
    showCGSTSGST,
  } = preparedData;

  const logoSrc = company?.logo ? `${BASE_URL}${company.logo}` : null;

  const typedItems = preparedData.itemsWithGST || allItems;
  const shouldHideBankDetails = transaction.type === 'proforma';
  const bankData = bank || transaction?.bank || {};
  const totalAmountRounded = Math.round(totalAmount);
  const amountInWords = safeNumberToWords(totalAmountRounded);
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

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
  const companyName = company?.businessName || company?.companyName || '-';
  const partyAddress = getBillingAddress(party);
  const shippingAddressString = getShippingAddress(
    actualShippingAddress,
    partyAddress,
  );

  // Calculate column widths
  const COL_WIDTH_NAME = 150;
  let colWidths = [35, COL_WIDTH_NAME, 60, 40, 45, 65, 75];
  if (showIGST) {
    colWidths.push(30, 60);
  } else if (showCGSTSGST) {
    colWidths.push(30, 55, 30, 55);
  }
  colWidths.push(70);

  const itemPages = splitItemsIntoPages(
    typedItems || [],
    colWidths,
    PAGE_HEIGHT,
  );

  const generateHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { margin: ${PAGE_MARGIN}px; margin-bottom: ${PAGE_MARGIN_BOTTOM}px; size: A4 portrait; }
          body { font-family: Arial, sans-serif; color: ${DARK_TEXT}; font-size: 9px; line-height: 1.2; }
          .invoice-container { background: white; }
          .page {
            width: 210mm;
            min-height: 296mm;
            padding: 15mm;
            margin: 0 auto;
            margin-bottom: 5mm;
            background: white;
            position: relative;
            page-break-after: always;
            page-break-inside: avoid;
            box-sizing: border-box;
          }
          .page:last-child { page-break-after: auto; margin-bottom: 0; }
          
          /* ⭐ FIX 1: Title OUTSIDE border - no border on title */
          .header-title { 
            text-align: center; 
            padding: 8px 0; 
            font-size: 20px; 
            color: ${PRIMARY_BLUE}; 
            font-weight: bold; 
            letter-spacing: 1px; 
            margin: 0 0 5px 0;
            /* NO BORDER */
          }

          .logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
          }

          .company-header {
            display: flex;
            gap: 12px;
            align-items: flex-start;
          }

          .logo-container {
            flex-shrink: 0;
            width: 70px;
            height: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .company-details {
            flex: 1;
          }
          
          
          /* Main wrapper - border starts from header section */
          .invoice-wrapper {
            border: 2px solid ${PRIMARY_BLUE};
            padding: 0;
            margin: 0;
          }
          
          .page-footer {
            position: absolute;
            bottom: 10px;
            right: 20px;
            font-size: 8px;
            color: #6b7280;
          }
          
          .header-section {
            border-bottom: 1px solid ${PRIMARY_BLUE};
          }
          
          .header-content {
            display: table;
            width: 100%;
            border-collapse: collapse;
          }
          
          .company-col { 
            display: table-cell;
            width: 60%; 
            padding: 8px 10px; 
            vertical-align: top; 
            border-right: 1px solid ${PRIMARY_BLUE}; 
          }
          
          .invoice-col { 
            display: table-cell;
            width: 40%; 
            padding: 8px; 
            vertical-align: top; 
          }
          
          .company-name { 
            font-size: 12px; 
            font-weight: bold; 
            margin-bottom: 2px; 
          }
          
          .company-line { 
            font-size: 7.5px; 
            margin-bottom: 1px; 
            line-height: 1.2; 
          }
          
          .invoice-grid { 
            width: 100%; 
            border-collapse: collapse; 
          }
          
          .invoice-cell { 
            width: 50%; 
            padding: 4px 6px; 
            font-size: 7.5px; 
            border: 1px solid ${PRIMARY_BLUE}; 
            vertical-align: top; 
          }
          
          .invoice-label { 
            font-weight: bold; 
            margin-bottom: 1px; 
          }
          
          .invoice-value { 
            font-size: 8px; 
             color: ${PRIMARY_BLUE}; 
          }
          
          .party-section {
            display: table;
            width: 100%;
            border-collapse: collapse;
            border-bottom: 1px solid ${PRIMARY_BLUE};
          }
          
          .party-col { 
            display: table-cell;
            width: 50%; 
            padding: 8px 10px; 
            vertical-align: top; 
          }
          
          .party-col-right { 
            border-left: 1px solid ${PRIMARY_BLUE}; 
          }
          
          .party-heading { 
            font-size: 8px; 
            font-weight: bold; 
            margin-bottom: 3px; 
        
              padding: 4px 6px;
             border-bottom: 1px solid ${PRIMARY_BLUE};
             margin: -8px -10px 8px -10px; 
          }
          
          .party-name { 
            font-size: 9px; 
            font-weight: bold; 
            margin-bottom: 2px; 
          }
          
          .party-line { 
            font-size: 7.5px; 
            margin-bottom: 1px; 
            line-height: 1.2; 
          }
          
          .items-section {
            /* No additional border */
          }
          
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
          }
          
          .items-table .table-header-row { 
            background-color: ${LIGHT_BLUE}; 
          }
          
          .items-table th { 
            background-color: ${LIGHT_BLUE}; 
            color: ${DARK_TEXT}; 
            font-weight: bold; 
            padding: 6px 4px; 
            text-align: center; 
            font-size: 7.5px; 
            border: 1px solid ${PRIMARY_BLUE}; 
            line-height: 1.2; 
          }
          
          .items-table td { 
            padding: 5px 4px; 
            text-align: center; 
            font-size: 8px; 
            border: 1px solid ${PRIMARY_BLUE}; 
            vertical-align: middle; 
          }
          
          .items-table tbody tr:nth-child(even) { 
            background-color: ${TABLE_ROW_ALT}; 
          }
          
          .items-table tbody tr:nth-child(odd) { 
            background-color: white; 
          }
          
          .items-table td.left { 
            text-align: left; 
            padding-left: 6px; 
          }
          
          .items-table td.right { 
            text-align: right; 
            padding-right: 6px; 
          }
          
          .footer-total-row td { 
            font-weight: bold; 
            border: 1px solid ${PRIMARY_BLUE}; 
            padding: 6px 4px; 
            font-size: 8px; 
            color: ${DARK_TEXT}; 
            background-color: white; 
          }
          
          /* ⭐ FIX 2: Tax summary full width with proper padding */
          .tax-summary-section {
            padding: 10px 0;
            border-top: 1px solid ${PRIMARY_BLUE};
          }
          
          .amount-words { 
            padding: 8px 10px; 
            font-size: 8px; 
          }
          
          .tax-summary-table { 
            width: 100%; 
            border-collapse: collapse; 
          }
          
          .tax-summary-table th { 
            background-color: ${LIGHT_BLUE}; 
            padding: 4px; 
            font-size: 7.5px; 
            border: 1px solid ${PRIMARY_BLUE}; 
            font-weight: bold; 
          }
          
          .tax-summary-table td { 
            padding: 3px 4px; 
            font-size: 7.5px; 
            border: 1px solid ${PRIMARY_BLUE}; 
            text-align: right; 
          }
          
          /* ⭐ FIX 3: Footer NO internal borders */
          .footer-section {
            border-top: 1px solid ${PRIMARY_BLUE};
            padding: 10px;
            min-height: 120px;
          }
          
          .footer-content {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            /* NO border-right between columns */
          }
          
          .terms-col {
            flex: 0 0 45%;
            font-size: 8px;
            padding-left: 10px;
            line-height: 1.4;
            /* NO border */
          }
          
          .bank-sign-col {
            flex: 0 0 50%;
            font-size: 8px;
            /* NO border */
          }
          
          .section-heading { 
            font-size: 8px; 
            font-weight: bold; 
            margin-bottom: 4px; 
          }
          
          .bank-line { 
            font-size: 7.5px; 
            margin-bottom: 2px; 
          }
          
          .signature-area {
            margin-top: 30px;
            text-align: right;
          }
          
          .signature-line { 
            padding-top: 5px; 
            border-top: 1px solid #000; 
            font-size: 7.5px; 
            display: inline-block; 
            width: 120px; 
            text-align: center; 
            margin-top: 40px;
          }
          
          .bold { 
            font-weight: bold; 
          }
          
          .keep-together { 
            page-break-inside: avoid; 
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          ${itemPages
            .map(
              (pageItems, pageIndex) => `
            <div class="page">
              <!-- ⭐ FIX 1: Title OUTSIDE wrapper -->
              <div class="header-title">${
                transaction.type === 'proforma'
                  ? 'PROFORMA INVOICE'
                  : isGSTApplicable
                  ? 'TAX INVOICE'
                  : 'INVOICE'
              }</div>
              
              <!-- Border starts HERE -->
              <div class="invoice-wrapper">
                <!-- Header Section -->
                <div class="header-section">
                  <div class="header-content">
                    <div class="company-col" style="${
                      !logoSrc
                        ? 'width:60%;border-right:1px solid ' +
                          PRIMARY_BLUE +
                          ';'
                        : ''
                    }">
                      <div class="company-header" style="${
                        !logoSrc ? 'gap:0;' : ''
                      }">
                        ${
                          logoSrc
                            ? `<div class="logo-container"><img src="${logoSrc}" class="logo" alt="Company Logo" /></div>`
                            : ''
                        }
                        <div class="company-details" style="${
                          !logoSrc ? 'margin-left:0;width:100%;' : ''
                        }">
                          <div class="company-name">${capitalizeWords(
                            companyName,
                          )}</div>
                          ${
                            company?.address
                              ? `<div class="company-line">${company.address}</div>`
                              : ''
                          }
                          <div class="company-line">
                            ${
                              company?.City
                                ? capitalizeWords(company.City) + ', '
                                : ''
                            }${
                company?.addressState
                  ? capitalizeWords(company.addressState) + ', '
                  : ''
              }${company?.Pincode || ''}
                          </div>
                          ${
                            company?.Country
                              ? `<div class="company-line">${capitalizeWords(
                                  company.Country,
                                )}</div>`
                              : ''
                          }
                          ${
                            company?.gstin
                              ? `<div class="company-line"><span class="bold">GSTIN:</span> ${company.gstin}</div>`
                              : ''
                          }
                          <div class="company-line">
                            <span class="bold">Phone:</span> ${
                              company?.mobileNumber
                                ? safeFormatPhoneNumber(company.mobileNumber)
                                : company?.Telephone
                                ? safeFormatPhoneNumber(company.Telephone)
                                : '-'
                            }
                          </div>
                          ${
                            company?.email
                              ? `<div class="company-line"><span class="bold">Email:</span> ${company.email}</div>`
                              : ''
                          }
                        </div>
                      </div>
                    </div>

                    
                    <div class="invoice-col">
                      <table class="invoice-grid">
                        <tr>
                          <td class="invoice-cell">
                            <div class="invoice-label">Invoice No.:</div>
                            <div class="invoice-value">${
                              transaction?.invoiceNumber?.toString() || '-'
                            }</div>
                          </td>
                          <td class="invoice-cell">
                            <div class="invoice-label">Invoice Date:</div>
                            <div class="invoice-value">${formatDateSafe(
                              transaction?.date,
                            )}</div>
                          </td>
                        </tr>
                        <tr>
                          <td class="invoice-cell">
                            <div class="invoice-label">P.O. No.:</div>
                            <div class="invoice-value">${
                              transaction?.poNumber || '-'
                            }</div>
                          </td>
                          <td class="invoice-cell">
                            <div class="invoice-label">P.O. Date:</div>
                            <div class="invoice-value">${formatDateSafe(
                              transaction?.poDate,
                            )}</div>
                          </td>
                        </tr>
                        <tr>
                          <td class="invoice-cell">
                            <div class="invoice-label">Due Date:</div>
                            <div class="invoice-value">${formatDateSafe(
                              transaction?.dueDate,
                            )}</div>
                          </td>
                          <td class="invoice-cell">
                            <div class="invoice-label">E-Way No.:</div>
                            <div class="invoice-value">${
                              transaction?.ewayNumber || '-'
                            }</div>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </div>
                </div>
                
                <!-- Party Section -->
                <div class="party-section">
                  <div class="party-col">
                    <div class="party-heading">Details of Buyer | Billed to:</div>
                    <div class="party-name">${capitalizeWords(
                      party?.name || '-',
                    )}</div>
                    <div class="party-line">${capitalizeWords(
                      partyAddress || '-',
                    )}</div>
                    ${
                      party?.gstin
                        ? `<div class="party-line"><span class="bold">GSTIN:</span> ${party.gstin}</div>`
                        : ''
                    }
                    ${
                      party?.pan
                        ? `<div class="party-line"><span class="bold">PAN:</span> ${party.pan}</div>`
                        : ''
                    }
                    <div class="party-line">
                      <span class="bold">Phone:</span> ${
                        party?.contactNumber
                          ? safeFormatPhoneNumber(party.contactNumber)
                          : '-'
                      }
                    </div>
                    <div class="party-line">
                      <span class="bold">Place of Supply:</span> 
                      ${
                        actualShippingAddress?.state
                          ? `${actualShippingAddress.state} (${
                              getStateCode(actualShippingAddress.state) || '-'
                            })`
                          : party?.state
                          ? `${party.state} (${
                              getStateCode(party.state) || '-'
                            })`
                          : '-'
                      }
                    </div>
                  </div>
                  <div class="party-col party-col-right">
                    <div class="party-heading">Details of Consignee | Shipped to:</div>
                    <div class="party-name">${capitalizeWords(
                      actualShippingAddress?.label || party?.name || '-',
                    )}</div>
                    <div class="party-line">${capitalizeWords(
                      shippingAddressString || '-',
                    )}</div>
                    ${
                      company?.Country
                        ? `<div class="party-line"><span class="bold">Country:</span> ${company.Country}</div>`
                        : ''
                    }
                    <div class="party-line">
                      <span class="bold">Phone:</span> ${
                        actualShippingAddress?.contactNumber
                          ? safeFormatPhoneNumber(
                              actualShippingAddress.contactNumber,
                            )
                          : party?.contactNumber
                          ? safeFormatPhoneNumber(party.contactNumber)
                          : '-'
                      }
                    </div>
                    ${
                      party?.gstin
                        ? `<div class="party-line"><span class="bold">GSTIN:</span> ${party.gstin}</div>`
                        : ''
                    }
                    <div class="party-line">
                      <span class="bold">State:</span> 
                      ${
                        actualShippingAddress?.state
                          ? `${actualShippingAddress.state} (${
                              getStateCode(actualShippingAddress.state) || '-'
                            })`
                          : party?.state
                          ? `${party.state} (${
                              getStateCode(party.state) || '-'
                            })`
                          : '-'
                      }
                    </div>
                  </div>
                </div>
                
                <!-- Items Section -->
                <div class="items-section">
                  <table class="items-table">
                    ${generateTableHeader(showIGST, showCGSTSGST)}
                    <tbody>
                      ${pageItems
                        .map((item, index) => {
                          const startIndex = itemPages
                            .slice(0, pageIndex)
                            .reduce((acc, p) => acc + p.length, 0);
                          const globalIndex = startIndex + index;
                          return `
                        <tr>
                          <td>${globalIndex + 1}</td>
                          <td class="left">${item.name}</td>
                          <td>${item.code || '-'}</td>
                          <td>${
                            item.itemType === 'service'
                              ? '-'
                              : formatQuantity(item.quantity || 0)
                          }</td>
                  <td>${
                    item.itemType === 'service' ? '-' : item.unit || 'Piece'
                  }</td>
                          <td class="center">${formatCurrency(
                            item.pricePerUnit || 0,
                          )}</td>
                          <td class="center">${formatCurrency(
                            item.taxableValue || 0,
                          )}</td>
                          ${
                            showIGST
                              ? `
                            <td>${(item.gstRate || 0).toFixed(0)}</td>
                            <td class="center">${formatCurrency(
                              item.igst || 0,
                            )}</td>
                          `
                              : showCGSTSGST
                              ? `
                            <td>${((item.gstRate || 0) / 2).toFixed(0)}</td>
                            <td class="center">${formatCurrency(
                              item.cgst || 0,
                            )}</td>
                            <td>${((item.gstRate || 0) / 2).toFixed(0)}</td>
                            <td class="center">${formatCurrency(
                              item.sgst || 0,
                            )}</td>
                          `
                              : ''
                          }
                          <td class="center bold">${formatCurrency(
                            item.total || 0,
                          )}</td>
                        </tr>`;
                        })
                        .join('')}
                      ${
                        pageIndex === itemPages.length - 1
                          ? `
                        <tr class="footer-total-row">
                          <td colspan="2" style="text-align: center;">Total</td>
                          <td></td>
                          <td>${totalQty}</td>
                          <td></td>
                          <td></td>
                          <td style="text-align: center;">${formatCurrency(
                            totalTaxable,
                          )}</td>
                          ${
                            showIGST
                              ? `
                            <td></td>
                            <td style="text-align: center;">${formatCurrency(
                              totalIGST,
                            )}</td>
                          `
                              : showCGSTSGST
                              ? `
                            <td></td>
                            <td style="text-align: center;">${formatCurrency(
                              totalCGST,
                            )}</td>
                            <td></td>
                            <td style="text-align: center;">${formatCurrency(
                              totalSGST,
                            )}</td>
                          `
                              : ''
                          }
                          <td style="text-align: center;">${formatCurrency(
                            totalAmount,
                          )}</td>
                        </tr>
                      `
                          : ''
                      }
                    </tbody>
                  </table>
                </div>
                
                ${
                  pageIndex === itemPages.length - 1
                    ? `
                  <!-- ⭐ FIX 2: Tax Summary Section - Full Width -->
                  ${
                    isGSTApplicable && taxSummaryArray.length > 0
                      ? `
                  <div class="tax-summary-section">
                    <table class="tax-summary-table">
                      <thead>
                        <tr>
                          <th rowspan="${
                            showIGST || showCGSTSGST ? '2' : '1'
                          }" style="width: 80px; vertical-align: middle;">HSN/SAC</th>
                          <th rowspan="${
                            showIGST || showCGSTSGST ? '2' : '1'
                          }" style="width: 100px; vertical-align: middle;">Taxable Value (Rs.)</th>
                          ${
                            showIGST
                              ? `<th colspan="2" style="vertical-align: middle;">IGST</th>`
                              : showCGSTSGST
                              ? `
                            <th colspan="2" style="vertical-align: middle;">CGST</th>
                            <th colspan="2" style="vertical-align: middle;">SGST</th>
                          `
                              : ''
                          }
                          <th rowspan="${
                            showIGST || showCGSTSGST ? '2' : '1'
                          }" style="width: 100px; vertical-align: middle;">Total (Rs.)</th>
                        </tr>
                        ${
                          showIGST || showCGSTSGST
                            ? `
                        <tr>
                          ${
                            showIGST
                              ? `
                            <th style="width: 30px;">%</th>
                            <th style="width: 60px;">Amount(Rs.)</th>
                          `
                              : showCGSTSGST
                              ? `
                            <th style="width: 30px;">%</th>
                            <th style="width: 55px;">Amount(Rs.)</th>
                            <th style="width: 30px;">%</th>
                            <th style="width: 55px;">Amount(Rs.)</th>
                          `
                              : ''
                          }
                        </tr>
                        `
                            : ''
                        }
                      </thead>
                      <tbody>
                        ${taxSummaryArray
                          .map(
                            summary => `
                          <tr>
                            <td style="text-align: center;">${summary.hsn}</td>
                            <td style="text-align: right; padding-right: 5px;">${formatCurrency(
                              summary.taxableValue,
                            )}</td>
                            ${
                              showIGST
                                ? `
                              <td style="text-align: center;">${
                                summary.rate
                              }</td>
                              <td style="text-align: right; padding-right: 5px;">${formatCurrency(
                                summary.igst,
                              )}</td>
                            `
                                : showCGSTSGST
                                ? `
                              <td style="text-align: center;">${
                                summary.rate / 2
                              }</td>
                              <td style="text-align: right; padding-right: 5px;">${formatCurrency(
                                summary.cgst,
                              )}</td>
                              <td style="text-align: center;">${
                                summary.rate / 2
                              }</td>
                              <td style="text-align: right; padding-right: 5px;">${formatCurrency(
                                summary.sgst,
                              )}</td>
                            `
                                : ''
                            }
                            <td style="text-align: right; padding-right: 5px; font-weight: bold;">${formatCurrency(
                              summary.taxableValue +
                                summary.igst +
                                summary.cgst +
                                summary.sgst,
                            )}</td>
                          </tr>
                        `,
                          )
                          .join('')}
                        
                        <tr style="background-color: ${LIGHT_BLUE}; font-weight: bold;">
                          <td style="text-align: center;">Total</td>
                          <td style="text-align: right; padding-right: 5px;">${formatCurrency(
                            totalTaxable,
                          )}</td>
                          ${
                            showIGST
                              ? `
                            <td></td>
                            <td style="text-align: right; padding-right: 5px;">${formatCurrency(
                              totalIGST,
                            )}</td>
                          `
                              : showCGSTSGST
                              ? `
                            <td></td>
                            <td style="text-align: right; padding-right: 5px;">${formatCurrency(
                              totalCGST,
                            )}</td>
                            <td></td>
                            <td style="text-align: right; padding-right: 5px;">${formatCurrency(
                              totalSGST,
                            )}</td>
                          `
                              : ''
                          }
                          <td style="text-align: right; padding-right: 5px;">${formatCurrency(
                            totalAmount,
                          )}</td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <div class="amount-words">
                      <span class="bold">Total Tax in words:</span> ${amountInWords}
                    </div>
                  </div>
                  `
                      : ''
                  }
                  
                  <!-- ⭐ FIX 3: Footer Section - NO internal borders -->
                  <div class="footer-section">
                    <div class="footer-content">
                      <div class="terms-col">
                        ${
                          transaction?.notes
                            ? renderNotesHTML(transaction.notes)
                            : ''
                        }
                      </div>
                      
                      <div class="bank-sign-col">
                        ${
                          !shouldHideBankDetails && isBankDetailAvailable
                            ? `
                          <div class="section-heading">Bank Details:</div>
                          <div style="display: flex; flex-direction: row; gap: 10px; align-items: flex-start;">
                            <div style="flex: 1;">
                              <div class="bank-line"><span class="bold">Bank Name:</span> ${capitalizeWords(
                                bankData?.bankName || '-',
                              )}</div>
                              <div class="bank-line"><span class="bold">Account No:</span> ${
                                bankData?.accountNo || '-'
                              }</div>
                              <div class="bank-line"><span class="bold">IFSC Code:</span> ${
                                bankData?.ifscCode || '-'
                              }</div>
                              <div class="bank-line"><span class="bold">Branch:</span> ${
                                bankData?.branchAddress || '-'
                              }</div>
                              ${
                                bankData?.upiDetails?.upiId
                                  ? `<div class="bank-line"><span class="bold">UPI ID:</span> ${bankData.upiDetails.upiId}</div>`
                                  : ''
                              }
                            </div>
                            ${
                              bankData?.qrCode
                                ? `<div style="display: flex; flex-direction: column; align-items: center; margin-left: 20px; width: fit-content;"><div style="font-size: 9px; font-weight: bold; margin-bottom: 0px;">QR Code</div><img src="${BASE_URL}/${bankData.qrCode}" class="qr-image" alt="QR Code" style="max-width: 80px; max-height: 80px; display: block; border: 1px solid #eee; padding: 2px; background: #fff;" /></div>`
                                : ''
                            }
                          </div>
                        `
                            : ''
                        }
                        <div class="signature-area">
                          <div style="font-weight: bold; font-size: 9px;">For ${companyName}</div>
                          <div class="signature-line">Authorised Signatory</div>
                        </div>
                      </div>
                    </div>
                  </div>
                `
                    : ''
                }
              </div>
              
              <div class="page-footer">Page ${pageIndex + 1} / ${
                itemPages.length
              }</div>
            </div>
          `,
            )
            .join('')}
        </div>
      </body>
      </html>
    `;
  };

  return generateHTML();
};

// --- PDF Generation ---
export const generatePdfForTemplate17 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
) => {
  try {
    const htmlContent = Template17({
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
    const file = await generatePDF(options);
    return file;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const generateTemplate17HTML = props => {
  return Template17(props);
};

export default Template17;
