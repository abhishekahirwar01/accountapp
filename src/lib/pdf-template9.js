// template9.js - New Invoice Template
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
import { generatePDF } from 'react-native-html-to-pdf';

// --- Constants ---
const PRIMARY_COLOR = '#1e40af';
const LIGHT_BLUE = '#dbeafe';
const DARK_TEXT = '#1f2937';
const BORDER_COLOR = '#e5e7eb';
const TABLE_HEADER_BG = '#3b82f6';
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const ITEMS_PER_PAGE = 34;
const MAX_DETAIL_LINES_PER_ITEM = 3; // approximate extra rows when items have details

// Layout measurement constants (used for dynamic pagination)
const PAGE_PADDING_TOP = 18; // matches .page padding-top
const PAGE_PADDING_BOTTOM = 24; // matches .page padding-bottom
const HEADER_EST = 180; // estimated height consumed by header/address section (px)
const FOOTER_RESERVE = 140; // reserve for totals/bank/notes to avoid orphaning

const NAME_FONT_SIZE = 8; // font size used for item name column
const DETAIL_FONT_SIZE = 6; // font size used for item detail lines
const NAME_LINE_HEIGHT = 10; // approximate px per line for names
const DETAIL_LINE_HEIGHT = 8; // approximate px per line for details
const ROW_VERTICAL_PADDING = 8; // padding (top+bottom) per row in px
const CHAR_WIDTH_FACTOR = 0.5; // average char width multiplier vs font-size (approx)

// HTML Notes Rendering Function
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

// Estimate how many wrapped lines a text will use in a column of given width
const estimateWrappedLines = (text, colWidth, fontSize = NAME_FONT_SIZE) => {
  if (!text) return 1;
  const str = String(text).replace(/<br\s*\/?>(\s*)/gi, '\n');
  const linesFromBreaks = str.split('\n');

  const width = Math.max(20, colWidth - 8); // allow for padding
  const avgCharWidth = fontSize * CHAR_WIDTH_FACTOR;

  const estimateForLine = line => {
    // basic word wrap simulation using avg char width
    const words = line.split(/\s+/).filter(Boolean);
    let lines = 1;
    let current = 0;
    for (const w of words) {
      const wWidth = w.length * avgCharWidth + avgCharWidth; // plus space
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
  for (const ln of linesFromBreaks) {
    total += estimateForLine(ln);
  }
  return Math.max(1, total);
};

// Split items into pages (height-based) — uses column widths to estimate row heights
const splitItemsIntoPages = (items, colWidths, pageHeight = PAGE_HEIGHT) => {
  const pages = [];
  if (!Array.isArray(items) || items.length === 0) return pages;

  const availableHeight = Math.max(
    200,
    pageHeight -
      PAGE_PADDING_TOP -
      PAGE_PADDING_BOTTOM -
      HEADER_EST -
      FOOTER_RESERVE,
  );

  let currentPage = [];
  let usedHeight = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Estimate name wrapping using name column width
    const nameColWidth = colWidths[1] || 180;
    const nameLines = estimateWrappedLines(
      item.name || '',
      nameColWidth,
      NAME_FONT_SIZE,
    );

    // Estimate details lines using same name column width (details are small text)
    const details = Array.isArray(item.details) ? item.details : [];
    let detailsLines = 0;
    for (const d of details) {
      detailsLines += estimateWrappedLines(
        d || '',
        nameColWidth,
        DETAIL_FONT_SIZE,
      );
    }

    // Basic per-item height in px
    const itemHeight =
      nameLines * NAME_LINE_HEIGHT +
      detailsLines * DETAIL_LINE_HEIGHT +
      ROW_VERTICAL_PADDING;

    // If adding this item exceeds available height, and page already has content -> push page
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

// Safe date formatting
const formatDateSafe = dateString => {
  try {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  } catch (error) {
    return dateString || '-';
  }
};

// Get address lines
const getAddressLines = address =>
  address ? address.split('\n').filter(line => line.trim() !== '') : [];

// Generate items table HTML for a specific page
const generateItemsTableHTML = (
  items,
  colWidths,
  showIGST,
  showCGSTSGST,
  totalColumnIndex,
  startIndex = 0,
) => {
  return items
    .map((item, index) => {
      return `
        <div class="table-row">
          <div class="table-cell cell-center" style="width: ${
            colWidths[0]
          }px;">${startIndex + index + 1}</div>
          <div class="table-cell cell-left" style="width: ${colWidths[1]}px;">
            <div style="font-weight: 500;">${item.name}</div>
            ${(item.details || [])
              .map(
                detail =>
                  `<div style="font-size: 6px; color: #666; margin-top: 1px;">${detail}</div>`,
              )
              .join('')}
          </div>
          <div class="table-cell cell-center" style="width: ${
            colWidths[2]
          }px;">${item.code || '-'}</div>
          <div class="table-cell cell-center" style="width: ${colWidths[3]}px;">
            ${
              item.itemType === 'service'
                ? '-'
                : formatQuantity(item.quantity || 0, item.unit)
            }
          </div>
          <div class="table-cell cell-center" style="width: ${
            colWidths[4]
          }px;">${formatCurrency(item.pricePerUnit || 0)}</div>
          <div class="table-cell cell-center" style="width: ${
            colWidths[5]
          }px;">${formatCurrency(item.taxableValue || 0)}</div>
          ${
            showIGST
              ? `
              <div class="table-cell cell-center" style="width: ${
                colWidths[6]
              }px;">${(item.gstRate || 0).toFixed(2)}</div>
              <div class="table-cell cell-center" style="width: ${
                colWidths[7]
              }px;">${formatCurrency(item.igst || 0)}</div>
            `
              : showCGSTSGST
              ? `
              <div class="table-cell cell-center" style="width: ${
                colWidths[6]
              }px;">${((item.gstRate || 0) / 2).toFixed(2)}</div>
              <div class="table-cell cell-center" style="width: ${
                colWidths[7]
              }px;">${formatCurrency(item.cgst || 0)}</div>
              <div class="table-cell cell-center" style="width: ${
                colWidths[8]
              }px;">${((item.gstRate || 0) / 2).toFixed(2)}</div>
              <div class="table-cell cell-center" style="width: ${
                colWidths[9]
              }px;">${formatCurrency(item.sgst || 0)}</div>
            `
              : ''
          }
          <div class="table-cell cell-center" style="width: ${
            colWidths[totalColumnIndex]
          }px; font-weight: 600; border-right: none;">
            ${formatCurrency(item.total || 0)}
          </div>
        </div>
      `;
    })
    .join('');
};

// Generate page HTML
const generatePageHTML = (
  pageData,
  pageIndex,
  totalPages,
  company,
  transaction,
  party,
  shippingAddress,
  buyerPhone,
  consigneePhone,
  isGSTApplicable,
  totalItems,
  totalQty,
  amountInWords,
  totalTaxable,
  totalIGST,
  totalCGST,
  totalSGST,
  totalAmount,
  shouldHideBankDetails,
  isBankDetailAvailable,
  bankData,
  colWidths,
  showIGST,
  showCGSTSGST,
  title,
  startIndex = 0,
  isLastPage = false,
) => {
  const companyName = company?.businessName || company?.companyName || '-';
  const partyAddress = getBillingAddress(party);
  const shippingAddressString = getShippingAddress(
    shippingAddress,
    partyAddress,
  );

  // Prepare shipping fallbacks and state code display (show like Template1)
  const shippingLabel = capitalizeWords(
    shippingAddress?.label || party?.name || '-',
  );
  const shippingAddrContent = shippingAddress?.address
    ? capitalizeWords(shippingAddressString)
    : capitalizeWords(partyAddress || '-');
  const shippingState = shippingAddress?.state
    ? `${capitalizeWords(shippingAddress.state)} (${
        getStateCode(shippingAddress.state) || '-'
      })`
    : party?.state
    ? `${capitalizeWords(party.state)} (${getStateCode(party.state) || '-'})`
    : '-';
  const shippingPhone = shippingAddress?.contactNumber
    ? safeFormatPhoneNumber(shippingAddress.contactNumber)
    : party?.contactNumber
    ? safeFormatPhoneNumber(party.contactNumber)
    : '-';
  const totalColumnIndex = colWidths.length - 1;
  const tableWidth = Array.isArray(colWidths)
    ? colWidths.reduce((acc, w) => acc + w, 0)
    : 0;
  const tableWidthAdjusted = tableWidth + 2; // small tweak for borders/padding

  return `
    <div class="page">
      <!-- Header Section -->
      <div style="width: ${tableWidthAdjusted}px; margin-left: auto;">
        <div class="company-subtitle">${title}</div>
        <div class="header-section">
        <div class="header-left">
          <div class="company-title">${capitalizeWords(companyName)}</div>
           <div class="company-contact">
           
            ${
              company?.gstin
                ? `<div><strong>GSTIN:</strong> ${company.gstin}</div>`
                : ''
            }
             <div><strong>Phone:</strong> ${
               company?.mobileNumber
                 ? safeFormatPhoneNumber(company.mobileNumber)
                 : company?.Telephone
                 ? safeFormatPhoneNumber(company.Telephone)
                 : '-'
             }</div>
          </div>
         
          <div class="company-info">
            ${getAddressLines(company?.address)
              .map(line => `<div>${line}</div>`)
              .join('')}
            ${
              company?.addressState
                ? `<div>${capitalizeWords(
                    company.City || '',
                  )}, ${capitalizeWords(
                    company.addressState,
                  )}, ${capitalizeWords(company.Country || '')}${
                    company?.Pincode ? ` - ${company.Pincode}` : ''
                  }</div>`
                : ''
            }
          </div>
         
          <div class="company-state">
            <strong>State:</strong> ${
              company?.addressState || '-'
            } - Pincode: ${company?.Pincode || '-'}
          </div>
        </div>
        <div class="header-right">
          ${
            company?.logo
              ? `<img src="${BASE_URL}${company.logo}" class="company-logo" />`
              : '<div style="width: 80px; height: 80px;"></div>'
          }
        </div>
      </div>
      </div>

      <!-- Invoice Details and Party Info -->
      <div class="address-invoice-container">
        <div class="address-section">
          <div class="address-column">
            <div class="address-title">Details of Buyer | Billed to :</div>
            <div class="address-content">
              <div class="address-name">${capitalizeWords(
                party?.name || '-',
              )}</div>
              <div class="address-name"><span class="address-label">Address:</span>${capitalizeWords(
                partyAddress || '-',
              )}</div>
              <div class="address-line"><span class="address-label">GSTIN:</span> ${
                party.gstin || '-'
              }</div>
              <div class="address-line"><span class="address-label">PAN:</span> ${
                party?.pan || '-'
              }</div>
              <div class="address-line"><span class="address-label">Phone:</span> ${
                party?.contactNumber
                  ? safeFormatPhoneNumber(party.contactNumber)
                  : '-'
              }</div>
              <div class="address-line"><span class="address-label">Place of Supply:</span> ${
                shippingAddress?.state
                  ? `${shippingAddress.state} (${
                      getStateCode(shippingAddress.state) || '-'
                    })`
                  : party?.state
                  ? `${party.state} (${getStateCode(party.state) || '-'})`
                  : '-'
              }</div> 
            </div>
          </div>
          
          <div class="address-column">
            <div class="address-title">Details of Consigned | Shipped to :</div>
            <div class="address-content">
              <div class="address-name">${shippingLabel}</div>
              <div class="address-line">${shippingAddrContent}</div>
              <div class="address-line"><span class="address-label">Country:</span> ${
                company?.Country || '-'
              }</div>
              <div class="address-line"><span class="address-label">Phone:</span> ${shippingPhone}</div>
              <div class="address-line"><span class="address-label">GSTIN:</span> ${
                party?.gstin || '-'
              }</div>
              <div class="address-line"><span class="address-label">State:</span> ${shippingState}</div>
            </div>
          </div>
        </div>

        <div class="invoice-info-box">
          <div class="invoice-row">
            <span class="invoice-label">Invoice #:</span>
            <span class="invoice-value">${
              transaction?.invoiceNumber?.toString() || 'AES5250016'
            }</span>
          </div>
          <div class="invoice-row">
            <span class="invoice-label">Invoice Date:</span>
            <span class="invoice-value">${formatDateSafe(
              transaction?.date,
            )}</span>
          </div>
          <div class="invoice-row">
            <span class="invoice-label">P.O. No.:</span>
            <span class="invoice-value">${transaction?.poNumber || '-'}</span>
          </div>
          <div class="invoice-row">
            <span class="invoice-label">P.O. Date:</span>
            <span class="invoice-value">${formatDateSafe(
              transaction?.poDate,
            )}</span>
          </div>
          <div class="invoice-row">
            <span class="invoice-label">E-Way No.:</span>
            <span class="invoice-value">${transaction?.ewayNumber || '-'}</span>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="table-container">
        <table class="invoice-table">
          <thead>
            <tr>
              <th style="width: ${
                colWidths[0]
              }px; text-align:center;">Sr.No</th>
              <th style="width: ${
                colWidths[1]
              }px; text-align:left;">Name of Product / Service</th>
              <th style="width: ${
                colWidths[2]
              }px; text-align:center;">HSN/SAC</th>
              <th style="width: ${colWidths[3]}px; text-align:center;">Qty</th>
              <th style="width: ${
                colWidths[4]
              }px; text-align:center;">Rate (Rs.)</th>
              <th style="width: ${
                colWidths[5]
              }px; text-align:center;">Taxable Value (Rs.)</th>
              ${
                showIGST
                  ? `
                    <th style="width: ${colWidths[6]}px; text-align:center;">IGST%</th>
                    <th style="width: ${colWidths[7]}px; text-align:center;">IGST Amt (Rs.)</th>
                  `
                  : showCGSTSGST
                  ? `
                    <th style="width: ${colWidths[6]}px; text-align:center;">CGST%</th>
                    <th style="width: ${colWidths[7]}px; text-align:center;">CGST Amt (Rs.)</th>
                    <th style="width: ${colWidths[8]}px; text-align:center;">SGST%</th>
                    <th style="width: ${colWidths[9]}px; text-align:center;">SGST Amt (Rs.)</th>
                  `
                  : ''
              }
              <th style="width: ${
                colWidths[totalColumnIndex]
              }px; text-align:center;">Total (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${pageData
              .map(
                (item, index) => `
                <tr class="item-row">
                  <td style="text-align:center; padding:6px;">${
                    startIndex + index + 1
                  }</td>
                  <td style="padding:6px; text-align:left; vertical-align: top;">
                    <div style="font-weight:500;">${item.name}</div>
                    ${(item.details || [])
                      .map(
                        detail =>
                          `<div style="font-size: 6px; color: #666; margin-top: 1px;">${detail}</div>`,
                      )
                      .join('')}
                  </td>
                  <td style="text-align:center; padding:6px;">${
                    item.code || '-'
                  }</td>
                  <td style="text-align:center; padding:6px;">${
                    item.itemType === 'service'
                      ? '-'
                      : formatQuantity(item.quantity || 0, item.unit)
                  }</td>
                  <td style="text-align:center; padding:6px;">${formatCurrency(
                    item.pricePerUnit || 0,
                  )}</td>
                  <td style="text-align:center; padding:6px;">${formatCurrency(
                    item.taxableValue || 0,
                  )}</td>
                  ${
                    showIGST
                      ? `
                        <td style="text-align:center; padding:6px;">${(
                          item.gstRate || 0
                        ).toFixed(2)}</td>
                        <td style="text-align:center; padding:6px;">${formatCurrency(
                          item.igst || 0,
                        )}</td>
                      `
                      : showCGSTSGST
                      ? `
                        <td style="text-align:center; padding:6px;">${(
                          (item.gstRate || 0) / 2
                        ).toFixed(2)}</td>
                        <td style="text-align:center; padding:6px;">${formatCurrency(
                          item.cgst || 0,
                        )}</td>
                        <td style="text-align:center; padding:6px;">${(
                          (item.gstRate || 0) / 2
                        ).toFixed(2)}</td>
                        <td style="text-align:center; padding:6px;">${formatCurrency(
                          item.sgst || 0,
                        )}</td>
                      `
                      : ''
                  }
                  <td style="text-align:center; padding:6px; font-weight:600;">${formatCurrency(
                    item.total || 0,
                  )}</td>
                </tr>
              `,
              )
              .join('')}
          </tbody>
        </table>
        ${
          isLastPage
            ? `
          <div class="final-qty-row-container" style="width: ${tableWidthAdjusted}px; margin-left: auto;">
            <div class="final-qty-row">
              <strong>Total Items / Qty :</strong> ${totalItems} / ${totalQty}
            </div>
          </div>
        `
            : ''
        }
      </div>

      ${
        isLastPage
          ? `
        <!-- Summary Section -->
        <div class="summary-container" style="width: ${tableWidthAdjusted}px; margin-left: auto;">
          <div class="summary-box" style="margin-left: auto; width: 300px;">
            <div class="summary-row">
              <span class="summary-label">Taxable Amount</span>
              <span class="summary-value">Rs ${formatCurrency(
                totalTaxable,
              )}</span>
            </div>
            ${
              isGSTApplicable && showCGSTSGST
                ? `
              <div class="summary-row">
                <span class="summary-label">CGST</span>
                <span class="summary-value">Rs ${formatCurrency(
                  totalCGST,
                )}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">SGST</span>
                <span class="summary-value">Rs ${formatCurrency(
                  totalSGST,
                )}</span>
              </div>
            `
                : ''
            }
            ${
              isGSTApplicable && showIGST
                ? `
              <div class="summary-row">
                <span class="summary-label">IGST</span>
                <span class="summary-value">Rs ${formatCurrency(
                  totalIGST,
                )}</span>
              </div>
            `
                : ''
            }
            <div class="summary-row total-row">
              <span class="summary-label-total">Total Amount</span>
              <span class="summary-value-total">Rs. ${formatCurrency(
                totalAmount,
              )}</span>
            </div>
          </div>
        </div>

        <div class="amount-words">
          <strong>Total in words :</strong> ${amountInWords}
        </div>

        <!-- Bank Details and Signature -->
        <div style="width: ${tableWidthAdjusted}px; margin-left: auto;">
          <div class="bank-signature-section">
            ${
              !shouldHideBankDetails && isBankDetailAvailable
                ? `
                <div class="bank-details">
                  <div class="section-header">Bank Details:</div>
                  ${
                    bankData?.bankName
                      ? `<div class="bank-row"><span class="bank-label">Name:</span> ${capitalizeWords(
                          bankData.bankName,
                        )}</div>`
                      : ''
                  }
                  ${
                    bankData?.ifscCode
                      ? `<div class="bank-row"><span class="bank-label">IFSC:</span> ${bankData.ifscCode}</div>`
                      : ''
                  }
                  ${
                    bankData?.accountNo
                      ? `<div class="bank-row"><span class="bank-label">Acc No:</span> ${bankData.accountNo}</div>`
                      : ''
                  }
                  ${
                    bankData?.branchAddress
                      ? `<div class="bank-row"><span class="bank-label">Branch:</span> ${bankData.branchAddress}</div>`
                      : ''
                  }
                  ${
                    bankData?.upiDetails?.upiMobile
                      ? `<div class="bank-row"><span class="bank-label">UPI Mobile:</span> ${bankData.upiDetails.upiMobile}</div>`
                      : ''
                  }
                </div>
              `
                : ''
            }
            
            <div class="signature-block">
              <div class="signature-title">For ${companyName}</div>
              <div class="signature-space"></div>
              <div class="signature-label">AUTHORISED SIGNATORY</div>
            </div>
          </div>

          ${
            transaction?.notes
              ? `
              <div class="notes-section">
                ${renderNotesHTML(transaction.notes)}
              </div>
            `
              : ''
          }
        </div> 
      `
          : ''
      }

      <div class="page-footer">${pageIndex + 1} / ${totalPages} page</div>
    </div>
  `;
};

// --- Main PDF Component ---
const Template9 = ({ transaction, company, party, shippingAddress, bank }) => {
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
    totalItems,
    totalQty,
    totalCGST,
    totalSGST,
    totalIGST,
    isGSTApplicable,
    showIGST,
    showCGSTSGST,
  } = preparedData;

  const typedItems = preparedData.itemsWithGST || allItems || [];
  const itemsToRender = typedItems || [];

  const shouldHideBankDetails = transaction.type === 'proforma';

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

  const bankData = bank || transaction?.bank || {};
  const totalAmountRounded = Math.round(totalAmount);
  const amountInWords = safeNumberToWords(totalAmountRounded);

  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  // Column width calculations
  const COL_WIDTH_SR_NO = 30;
  const COL_WIDTH_NAME = showIGST ? 170 : showCGSTSGST ? 145 : 220;
  const COL_WIDTH_HSN = showIGST ? 70 : showCGSTSGST ? 50 : 80;
  const COL_WIDTH_QTY = showIGST ? 55 : showCGSTSGST ? 45 : 75;
  const COL_WIDTH_RATE = showIGST ? 75 : showCGSTSGST ? 55 : 85;
  const COL_WIDTH_TAXABLE = showIGST ? 95 : showCGSTSGST ? 85 : 100;
  const COL_WIDTH_GST_PCT_HALF = 45;
  const COL_WIDTH_GST_AMT_HALF = 70;
  const COL_WIDTH_IGST_PCT = 45;
  const COL_WIDTH_IGST_AMT = 85;
  const COL_WIDTH_TOTAL = showIGST ? 100 : showCGSTSGST ? 90 : 130;

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
  const tableWidth = colWidths.reduce((acc, w) => acc + w, 0);

  const title =
    transaction.type === 'proforma'
      ? 'PROFORMA INVOICE'
      : isGSTApplicable
      ? 'TAX INVOICE'
      : 'INVOICE';

  const itemPages = splitItemsIntoPages(
    itemsToRender || [],
    colWidths,
    PAGE_HEIGHT,
  );
  const totalPages = Math.max(1, itemPages.length || 1);

  const generateHTML = () => {
    let startIndex = 0;
    const pageHTMLs = itemPages.map((pageItems, pageIndex) => {
      const pageHTML = generatePageHTML(
        pageItems,
        pageIndex,
        totalPages,
        company,
        transaction,
        party,
        actualShippingAddress,
        buyerPhone,
        consigneePhone,
        isGSTApplicable,
        totalItems,
        totalQty,
        amountInWords,
        totalTaxable,
        totalIGST,
        totalCGST,
        totalSGST,
        totalAmount,
        shouldHideBankDetails,
        isBankDetailAvailable,
        bankData,
        colWidths,
        showIGST,
        showCGSTSGST,
        title,
        startIndex,
        pageIndex === totalPages - 1,
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
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: ${DARK_TEXT};
      font-size: 8px;
      line-height: 1.4;
    }
    
    /* FIX: Page breaking logic to avoid extra blank pages and A4 rounding issues */
    .page {
      width: 210mm;
      /* Keep slightly smaller than exact A4 to avoid rounding overflow */
      min-height: 296mm;
      padding: 15mm;
      margin: 0 auto; /* avoid large margins that become part of page height */
      margin-bottom: 5mm; /* visual gap in preview only */
      background: white;
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid #ccc; /* small visual separator in preview */
      /* Page-break rules optimized */
      page-break-after: always;
      page-break-inside: avoid;
      box-sizing: border-box;
    }

    /* Last page should not force another blank page */
    .page:last-child {
      page-break-after: auto;
      margin-bottom: 0;
    }
    
    .header-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${PRIMARY_COLOR};
    }
    
    .header-left {
      flex: 1;
    }
    
    .company-title {
      font-size: 16px;
      font-weight: bold;
      color: ${PRIMARY_COLOR};
      margin-bottom: 2px;
    }
    
    .company-subtitle {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 10px;
      text-align: center;
    }
    
    .company-info {
      font-size: 8px;
    //   margin-bottom: 4px;
      line-height: 1.3;
    }
    
    .company-contact {
      font-size: 8px;
      margin-bottom: 2px;
    }
    
    .company-state {
      font-size: 8px;
    }
    
    .header-right {
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
    }
    
    .company-logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
    }
    
    .address-invoice-container {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      gap: 10px;
    //   border: 1px solid ${BORDER_COLOR};
    }
    
    .address-section {
      flex: 1;
      display: flex;
    //   border-right: 1px solid ${BORDER_COLOR};
    }
    
    .address-column {
      flex: 1;
    //   padding: 8px;
    }
    
    .address-column:first-child {
    //   border-right: 1px solid ${BORDER_COLOR};
    }
    
    .address-title {
      font-size: 8px;
      font-weight: 600;
      margin-bottom: 6px;
      color: ${DARK_TEXT};
    }
    
    .address-content {
      font-size: 7.5px;
    }
    
    .address-name {
      font-weight: 600;
      margin-bottom: 4px;
      font-size: 8px;
    }
    
    .address-line {
      margin-bottom: 2px;
      line-height: 1.4;
    }
    
    .address-label {
      font-weight: 600;
    }
    
    .invoice-info-box {
      width: 160px;
    //   padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    
    .invoice-row {
      display: flex;
      justify-content: space-between;
      font-size: 7.5px;
      line-height: 1.4;
    }
    
    .invoice-label {
      font-weight: 400;
      color: #4b5563;
    }
    
    .invoice-value {
      font-weight: 400;
      color: ${DARK_TEXT};
      text-align: right;
    }
    
    .table-container {
      width: 100%;
      margin-top: 10px;
    }

    /* Use native table layout for reliable column alignment and header repetition */
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .invoice-table thead {
      display: table-header-group; /* ensure header repeats on each page */
    }

    .invoice-table th {
      background-color: ${TABLE_HEADER_BG};
      color: white;
      font-weight: bold;
      font-size: 8px;
      padding: 6px 6px;
      border: 1px solid #ddd;
      text-align: center;
      vertical-align: middle;
    }

    .invoice-table td {
      padding: 6px;
      border: 1px solid #ddd;
      font-size: 8px;
      vertical-align: top;
      overflow: hidden;
      word-wrap: break-word;
    }

    .item-row {
      page-break-inside: avoid; /* prevents a single row splitting across pages */
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
    }

    .final-qty-row {
      background-color:#ffffff;
      padding: 8px;
      border: 1px solid ${BORDER_COLOR};
      border-top: none;
      font-size: 9px;
      width: 100%;
      display: block;
    }
    
    .cell-center {
      text-align: center;
      justify-content: center;
    }
    
    .cell-left {
      text-align: left;
      justify-content: flex-start;
    }
    
    .cell-right {
      text-align: right;
      justify-content: flex-end;
    }
    
    .table-footer-row {
      display: flex;
      background-color: #f3f4f6;
      border-top: 1px solid ${BORDER_COLOR};
      padding: 6px 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .footer-items-qty {
      font-size: 8px;
      font-weight: 600;
    }
    
    .summary-container {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 10px;
      margin-top: 10px;
    }
    
    .summary-box {
      width: 300px;
      border: 1px solid ${BORDER_COLOR};
      border-radius: 4px;
      overflow: hidden;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid ${BORDER_COLOR};
      background-color: white;
    }
    
    .summary-row:last-child {
      border-bottom: none;
    }
    
    .summary-label {
      font-size: 9px;
      font-weight: 600;
      color: ${DARK_TEXT};
    }
    
    .summary-value {
      font-size: 9px;
      font-weight: 400;
      color: ${DARK_TEXT};
    }
    
    .total-row {
      background-color: #f3f4f6;
      border-top: 2px solid ${BORDER_COLOR};
    }
    
    .summary-label-total {
      font-size: 10px;
      font-weight: 700;
      color: ${DARK_TEXT};
    }
    
    .summary-value-total {
      font-size: 10px;
      font-weight: 700;
      color: ${DARK_TEXT};
    }
    
    .amount-words {
      font-size: 8px;
      padding: 8px;
    //   background-color: #fffbeb;
    //   border: 1px solid #fbbf24;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    
    .bank-signature-section {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      border-top: 1px solid ${TABLE_HEADER_BG};
      border-bottom: 1px solid ${TABLE_HEADER_BG}; /* added bottom border */
      width: 100%;
      box-sizing: border-box;
      padding: 10px 0;
    }
    
    .bank-details {
      flex: 1;
      padding: 10px;
    //   border: 1px solid ${BORDER_COLOR};
      border-radius: 4px;
    //   background-color: #f9fafb;
    }
    
    .section-header {
      font-size: 8px;
      font-weight: bold;
      margin-bottom: 6px;
      color: ${PRIMARY_COLOR};
    }
    
    .bank-row {
      font-size: 7.5px;
      margin-bottom: 3px;
      line-height: 1.3;
    }
    
    .bank-label {
      font-weight: 600;
      display: inline-block;
      width: 60px;
    }
    
    .signature-block {
      width: 200px;
      padding: 10px;
    //   border: 1px solid ${BORDER_COLOR};
      border-radius: 4px;
    //   background-color: #f9fafb;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .signature-title {
      font-size: 8px;
      font-weight: bold;
      text-align: center;
      // margin-bottom: 10px;
    }
    
    .signature-space {
      height: 50px;
      width: 100%;
    }
    
    .signature-label {
      font-size: 7px;
      font-weight: 600;
      text-align: center;
      padding-top: 8px;
      border-top: 1px solid ${BORDER_COLOR};
      width: 100%;
    }
    
    .notes-section {
      padding: 10px;
      /* Removed border-top to let bank/signature section control the line */
      margin-bottom: 12px;
      font-size: 7.5px;
      line-height: 1.4;
      padding-left: 15px;
      width: 100%;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .page-footer {
      position: absolute;
      bottom: 10px;
      right: 30px;
      font-size: 7px;
      color: #6b7280;
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

// --- PDF Generation Function ---
export const generatePdfForTemplate9 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
) => {
  try {
    const htmlContent = Template9({
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

// Utility function to use the component directly
export const generateTemplate9HTML = props => {
  return Template9(props);
};

export default Template9;
