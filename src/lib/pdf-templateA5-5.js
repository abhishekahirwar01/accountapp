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
import { capitalizeWords } from './utils';
import { BASE_URL } from '../config';
import { generatePDF } from 'react-native-html-to-pdf';

// Constants
const PRIMARY_BLUE = '#0371C1';
const LIGHT_BLUE_BG = 'rgba(3, 113, 193, 0.2)';
const ITEMS_PER_PAGE = 18;

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

// Split items into chunks for pagination
const splitItemsIntoPages = (items, itemsPerPage = ITEMS_PER_PAGE) => {
  const pages = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }
  return pages;
};

// Main PDF Component
const TemplateA5_5 = ({
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
  const bankData = bank || transaction?.bank || {};

  // Check if any bank detail is available
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.qrCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  // Column configurations
  const colWidthsIGST = ['5%', '28%', '8%', '6%', '8%', '15%', '18%', '12%'];
  const totalColumnIndexIGST = 7;

  const colWidthsCGSTSGST = [
    '5%',
    '26%',
    '8%',
    '6%',
    '8%',
    '12%',
    '12%',
    '12%',
    '11%',
  ];
  const totalColumnIndexCGSTSGST = 8;

  const colWidthsNoTax = ['8%', '32%', '8%', '8%', '10%', '17%', '17%'];
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

  // Split items into pages
  const itemPages = splitItemsIntoPages(itemsWithGST, ITEMS_PER_PAGE);
  const totalPages = itemPages.length;

  // Safe date formatting
  const formatDateSafe = dateString => {
    try {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch (error) {
      return dateString || '-';
    }
  };

  // Generate items table for each page
  const generateItemsTable = (pageItems, isLastPage, startIndex) => {
    return `
      <!-- Table Header -->
      <div class="items-table-header">
        <div class="header-cell" style="width: ${colWidths[0]}">Sr. No.</div>
        <div class="header-cell product-cell" style="width: ${colWidths[1]}">Name of Product/Service</div>
        <div class="header-cell" style="width: ${colWidths[2]}">HSN/SAC</div>
        <div class="header-cell" style="width: ${colWidths[3]}">Qty</div>
        <div class="header-cell" style="width: ${colWidths[4]}">Rate (Rs.)</div>
        <div class="header-cell bg-highlight" style="width: ${colWidths[5]}">Taxable Value (Rs.)</div>

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

        <div class="header-cell bg-highlight" style="width: ${colWidths[totalColumnIndex]}">Total (Rs.)</div>
      </div>

      <!-- Table Rows -->
      ${pageItems
        .map(
          (item, index) => `
        <div class="items-table-row">
          <div class="table-cell" style="width: ${colWidths[0]}">${startIndex + index + 1}</div>
          <div class="table-cell product-cell" style="width: ${colWidths[1]}">${capitalizeWords(item.name)}</div>
          <div class="table-cell" style="width: ${colWidths[2]}">${item.code || '-'}</div>
          <div class="table-cell" style="width: ${colWidths[3]}">
            ${item.itemType === 'service' ? '-' : formatQuantity(item.quantity || 0, item.unit)}
          </div>
          <div class="table-cell" style="width: ${colWidths[4]}">${formatCurrency(item.pricePerUnit || 0)}</div>
          <div class="table-cell bg-highlight" style="width: ${colWidths[5]}">${formatCurrency(item.taxableValue)}</div>
          
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
          
          <div class="table-cell bg-highlight" style="width: ${colWidths[totalColumnIndex]}">${formatCurrency(item.total)}</div>
        </div>
      `,
        )
        .join('')}

      ${
        isLastPage
          ? `
      <!-- Total Row -->
      <div class="items-table-total-row">
        <div class="table-cell" style="width: ${colWidths[0]}"></div>
        <div class="table-cell" style="width: ${colWidths[1]}"></div>
        <div class="table-cell font-bold" style="width: ${colWidths[2]}">Total</div>
        <div class="table-cell font-bold" style="width: ${colWidths[3]}">${totalQty}</div>
        <div class="table-cell" style="width: ${colWidths[4]}"></div>
        <div class="table-cell font-bold bg-highlight" style="width: ${colWidths[5]}">${formatCurrency(totalTaxable)}</div>
        
        ${
          showIGST
            ? `
          <div class="table-cell font-bold" style="width: ${colWidths[6]}">${formatCurrency(totalIGST)}</div>
          `
            : showCGSTSGST
            ? `
          <div class="table-cell font-bold" style="width: ${colWidths[6]}">${formatCurrency(totalCGST)}</div>
          <div class="table-cell font-bold" style="width: ${colWidths[7]}">${formatCurrency(totalSGST)}</div>
          `
            : ''
        }
        
        <div class="table-cell font-bold bg-highlight" style="width: ${colWidths[totalColumnIndex]}">${formatCurrency(totalAmount)}</div>
      </div>
      `
          : ''
      }
    `;
  };

  // Generate header section matching the image EXACTLY
  const generateHeaderSection = () => {
    const companyName = company?.businessName || company?.companyName || 'Ak Electronics Shop';

    return `
      <!-- Top Company Info Section -->
      <div class="top-company-info">
        <div class="company-name">${capitalizeWords(companyName)}</div>
        <div class="company-address">
          ${[
            company?.address,
            company?.City,
            company?.addressState,
            company?.Country,
            company?.Pincode,
          ]
            .filter(Boolean)
            .join(', ')}
        </div>
        <div class="company-contact">
          <span class="contact-item">Phone : ${
            company?.mobileNumber
              ? safeFormatPhoneNumber(String(company.mobileNumber))
              : '-'
          }</span>
          <span class="contact-item">E-mail : ${company?.email || '-'}</span>
          <span class="contact-item">Telephone : ${
            company?.Telephone
              ? safeFormatPhoneNumber(String(company.Telephone))
              : '-'
          }</span>
        </div>
      </div>

      <!-- GSTIN and Invoice Type Section -->
      <div class="gstin-invoice-section">
        <div class="gstin-left">GSTIN : ${company?.gstin || '-'}</div>
        <div class="invoice-center">${
          transaction.type === 'proforma'
            ? 'PROFORMA INVOICE'
            : isGSTApplicable
            ? 'TAX INVOICE'
            : 'INVOICE'
        }</div>
        <div class="original-right">ORIGINAL FOR RECIPIENT</div>
      </div>

      <!-- Three Columns Section -->
      <div class="three-col-wrapper">
        <!-- Column 1 - Details of Buyer -->
        <div class="info-column">
          <div class="column-header">Details of Buyer | Billed to:</div>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${capitalizeWords(party?.name || '-')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Address:</span>
            <span class="info-value">${capitalizeWords(getBillingAddress(party)) || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phone:</span>
            <span class="info-value">${
              party?.contactNumber ? safeFormatPhoneNumber(party.contactNumber) : '-'
            }</span>
          </div>
          <div class="info-row">
            <span class="info-label">GSTIN:</span>
            <span class="info-value">${party?.gstin || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">PAN:</span>
            <span class="info-value">${party?.pan || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Place of Supply:</span>
            <span class="info-value">${
              party?.state
                ? `${capitalizeWords(party.state)} (${getStateCode(party.state) || '-'})`
                : '-'
            }</span>
          </div>
        </div>

        <!-- Column 2 - Details of Consigned -->
        <div class="info-column">
          <div class="column-header">Details of Consigned | Shipped to:</div>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${capitalizeWords(
              shippingAddress?.label || party?.name || '-'
            )}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Address:</span>
            <span class="info-value">${capitalizeWords(
              getShippingAddress(shippingAddress, getBillingAddress(party))
            )}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Country:</span>
            <span class="info-value">${company?.Country || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phone:</span>
            <span class="info-value">${
              shippingAddress?.contactNumber
                ? safeFormatPhoneNumber(String(shippingAddress.contactNumber))
                : party?.contactNumber
                ? safeFormatPhoneNumber(String(party.contactNumber))
                : '-'
            }</span>
          </div>
          <div class="info-row">
            <span class="info-label">GSTIN:</span>
            <span class="info-value">${party?.gstin || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">State:</span>
            <span class="info-value">${
              shippingAddress?.state
                ? `${capitalizeWords(shippingAddress.state)} (${getStateCode(shippingAddress.state) || '-'})`
                : party?.state
                ? `${capitalizeWords(party.state)} (${getStateCode(party.state) || '-'})`
                : '-'
            }</span>
          </div>
        </div>

        <!-- Column 3 - Invoice Details -->
        <div class="info-column">
          
          <div class="info-row">
            <span class="info-label">Invoice No.:</span>
            <span class="info-value">${transaction.invoiceNumber || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Invoice Date:</span>
            <span class="info-value">${formatDateSafe(transaction.date) || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Due Date:</span>
            <span class="info-value">${formatDateSafe(transaction.dueDate) || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">P.O. No:</span>
            <span class="info-value">${transaction.voucher || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">E-Way Bill No.:</span>
            <span class="info-value">${transaction.eway || '-'}</span>
          </div>
        </div>
      </div>
    `;
  };

  // Generate footer section for last page - MODIFIED LAYOUT
  const generateFooterSection = (pageNumber, totalPages) => {
    const companyName = company?.businessName || company?.companyName || '-';

    return `
      <!-- Bottom Section - NEW LAYOUT -->
      <div class="bottom-wrapper">
        <!-- Total in Words (Full Width) -->
        <div class="total-in-words-full">
          TOTAL IN WORDS : ${safeNumberToWords(totalAmount).toUpperCase()}
        </div>

        <!-- Two Column Layout: Bank/Terms on Left, Totals on Right -->
        <div class="bottom-two-columns">
          <!-- Left Side: Bank Details and Terms -->
          <div class="left-bottom-section">
            ${
              transaction.type !== 'proforma' && isBankDetailAvailable
                ? `
              <div class="bank-details-box">
                <div class="bank-title">Bank Details:</div>
                <div style="display: flex; flex-deirection: row;">
                  <div>
                  ${bankData?.bankName ? `<div class="bank-item"><span class="bank-key">Name:</span> <span class="bank-val">${capitalizeWords(bankData.bankName)}</span></div>` : ''}
                  ${bankData?.accountNo ? `<div class="bank-item"><span class="bank-key">Acc. No:</span> <span class="bank-val">${bankData.accountNo}</span></div>` : ''}
                  ${bankData?.ifscCode ? `<div class="bank-item"><span class="bank-key">IFSC:</span> <span class="bank-val">${bankData.ifscCode}</span></div>` : ''}
                  ${bankData?.branchAddress ? `<div class="bank-item"><span class="bank-key">Branch:</span> <span class="bank-val">${bankData.branchAddress}</span></div>` : ''}
                  ${bankData?.upiDetails?.upiId ? `<div class="bank-item"><span class="bank-key">UPI ID:</span> <span class="bank-val">${bankData.upiDetails.upiId}</span></div>` : ''}
                  ${bankData?.upiDetails?.upiName ? `<div class="bank-item"><span class="bank-key">UPI Name:</span> <span class="bank-val">${bankData.upiDetails.upiName}</span></div>` : ''}
                  ${bankData?.upiDetails?.upiMobile ? `<div class="bank-item"><span class="bank-key">UPI Mobile:</span> <span class="bank-val">${bankData.upiDetails.upiMobile}</span></div>` : ''}
                  </div>

                

                </div>
              </div>
            `
                : ''
            }
            
            ${
              transaction?.notes
                ? `
              <div class="terms-box-bottom">
                <div class="terms-content">
                  ${renderNotesHTML(transaction.notes)}
                </div>
              </div>
            `
                : ''
            }
          </div>

          <!-- Right Side: Totals -->
          <div class="right-bottom-section">
            <div class="total-line">
              <span class="total-label">Taxable Amount</span>
              <span class="total-value">${formatCurrency(totalTaxable)}</span>
            </div>
            ${
              isGSTApplicable
                ? `
              <div class="total-line">
                <span class="total-label">Total Tax</span>
                <span class="total-value">${formatCurrency(showIGST ? totalIGST : totalCGST + totalSGST)}</span>
              </div>
            `
                : ''
            }
            <div class="total-line highlight-total">
              <span class="total-label-bold">${isGSTApplicable ? 'Total Amount After Tax' : 'Total Amount'}</span>
              <span class="total-value-bold">${formatCurrency(totalAmount)}</span>
            </div>
            <div class="total-line">
              <span class="total-label">For ${capitalizeWords(companyName)}</span>
              <span class="total-value">(E & O.E.)</span>
            </div>
          </div>
        </div>
      </div>

    `;
  };

  // Generate HTML content for PDF
  const generateHTML = () => {
    let startIndex = 0;
    const pagesHTML = itemPages.map((pageItems, pageIndex) => {
      const isLastPage = pageIndex === itemPages.length - 1;
      const pageNumber = pageIndex + 1;

      const pageHTML = `
        <div class="page-wrapper">
          <div class="page">
            ${generateHeaderSection()}
            
            <div class="table-container">
              ${generateItemsTable(pageItems, isLastPage, startIndex)}
            </div>

            ${isLastPage ? generateFooterSection(pageNumber, totalPages) : ''}
          </div>
          
          <!-- Page Number Outside Box -->
          <div class="page-number-outside">
            ${pageNumber} / ${totalPages} page
          </div>
        </div>
      `;

      startIndex += pageItems.length;
      return pageHTML;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 8px;
            color: #000;
            font-size: 7px;
            line-height: 1.2;
            width: 595px;
          }
          
          .page-wrapper {
            position: relative;
            margin-bottom: 15px;
          }
          
          .page {
            position: relative;
            width: 100%;
            min-height: 400px;
            page-break-after: always;
            border: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .page:last-child {
            page-break-after: auto;
          }
          
          /* Page Number Outside Box */
          .page-number-outside {
            text-align: right;
            padding: 4px 0;
            font-size: 6px;
            color: #000;
          }
          
          /* Top Company Info */
          .top-company-info {
            padding: 6px 8px;
            border-bottom: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .company-name {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 3px;
          }
          
          .company-address {
            font-size: 8px;
            text-align: center;
            margin-bottom: 3px;
          }
          
          .company-contact {
            font-size: 7px;
            text-align: center;
          }
          
          .contact-item {
            margin: 0 8px;
          }
          
          /* GSTIN Invoice Section */
          .gstin-invoice-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 8px;
            border-bottom: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .gstin-left {
            font-size: 8px;
            font-weight: bold;
          }
          
          .invoice-center {
            font-size: 12px;
            font-weight: bold;
            color: ${PRIMARY_BLUE};
          }
          
          .original-right {
            font-size: 8px;
            font-weight: bold;
          }
          
          /* Three Column Wrapper */
          .three-col-wrapper {
            display: flex;
            border-bottom: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .info-column {
            flex: 1;
            padding: 4px 6px;
            border-right: 1.5px solid ${PRIMARY_BLUE};
            min-height: 100px;
          }
          
          .info-column:last-child {
            border-right: none;
          }
          
          .column-header {
            font-size: 7px;
            font-weight: bold;
            color: ${PRIMARY_BLUE};
            margin-bottom: 4px;
          }
          
          .info-row {
            display: flex;
            font-size: 6px;
            margin-bottom: 2px;
            line-height: 1.3;
          }
          
          .info-label {
            font-weight: bold;
            min-width: 70px;
            flex-shrink: 0;
          }
          
          .info-value {
            flex: 1;
          }
          
          /* Items Table */
          .table-container {
            width: 100%;
          }
          
          .items-table-header {
            display: flex;
            background-color: ${LIGHT_BLUE_BG};
            border-bottom: 1px solid ${PRIMARY_BLUE};
          }
          
          .header-cell {
            padding: 3px 2px;
            text-align: center;
            font-size: 6px;
            font-weight: bold;
            border-right: 1px solid ${PRIMARY_BLUE};
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .header-cell:last-child {
            border-right: none;
          }
          
          .items-table-row {
            display: flex;
            border-bottom: 1px solid ${PRIMARY_BLUE};
          }
          
          .items-table-total-row {
            display: flex;
            background-color: ${LIGHT_BLUE_BG};
            font-weight: bold;
          }
          
          .table-cell {
            padding: 3px 2px;
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
            padding-left: 4px;
          }
          
          /* IGST/CGST/SGST */
          .igst-header {
            display: flex;
            flex-direction: column;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-main-header {
            font-size: 6px;
            font-weight: bold;
            text-align: center;
            padding: 2px;
          }
          
          .igst-sub-header {
            display: flex;
            border-top: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-sub-percentage {
            font-size: 5px;
            font-weight: bold;
            width: 30%;
            text-align: center;
            padding: 2px;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-sub-text {
            font-size: 5px;
            font-weight: bold;
            width: 70%;
            text-align: center;
            padding: 2px;
          }
          
          .igst-cell {
            display: flex;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-percent {
            font-size: 6px;
            width: 30%;
            text-align: center;
            padding: 2px;
          }
          
          .igst-amount {
            font-size: 6px;
            width: 70%;
            text-align: center;
            padding: 2px;
          }
          
          /* Bottom Section - NEW LAYOUT */
          .bottom-wrapper {
            border-top: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .total-in-words-full {
            padding: 4px 8px;
            font-size: 7px;
            font-weight: bold;
            border-bottom: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .bottom-two-columns {
            display: flex;
            min-height: 100px;
            border-bottom: 1.5px solid ${PRIMARY_BLUE};
          }
          
          /* Left Side: Bank + Terms */
          .left-bottom-section {
            flex: 1;
            padding: 6px;
            border-right: 1.5px solid ${PRIMARY_BLUE};
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .bank-details-box {
            font-size: 7px;
          }
          
          .bank-title {
            font-size: 7px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          
          .bank-grid {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          
          .bank-item {
            font-size: 6px;
            display: flex;
          }
          
          .bank-key {
            font-weight: bold;
            min-width: 50px;
          }
          
          .bank-val {
            flex: 1;
          }
          
          .terms-box-bottom {
            font-size: 6px;
            line-height: 1.3;
            padding-left: 15px;
            padding-top: 8px;
            border-top: 1px solid #0371C1;
            width: 103.8%;
            margin-left: -6px;
          }
          
          .terms-content {
            font-size: 6px;
            line-height: 1.3;
            word-wrap: break-word;
          }
          
          /* Right Side: Totals */
          .right-bottom-section {
            width: 220px;
            padding: 4px 0px;
            display: flex;
            flex-direction: column;
          }
          
          .total-line {
            display: flex;
            justify-content: space-between;
            padding: 3px 6px;
            font-size: 7px;
            border-bottom: 1px solid #ddd;
          }
          
          .total-line.last-line {
            border-bottom: none;
          }
          
          .total-label, .total-value {
            font-size: 7px;
          }
          
          .highlight-total {
            background-color: ${LIGHT_BLUE_BG};
            font-weight: bold;
          }
          
          .total-label-bold, .total-value-bold {
            font-size: 7px;
            font-weight: bold;
          }
          
          /* Bottom Padding Space */
          .bottom-padding {
            height: 15px;
          }
          
          /* Page Footer - Remove border-top since page number is outside */
          .page-footer {
            text-align: right;
            padding: 4px 8px;
            font-size: 6px;
          }
          
          /* Utility */
          .bg-highlight {
            background-color: ${LIGHT_BLUE_BG};
          }
          
          .font-bold {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        ${pagesHTML.join('')}
      </body>
      </html>
    `;
  };

  return generateHTML();
};

// --- PDF Generation Function ---
export const generatePdfForTemplateA5_5 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
  client,
) => {
  try {
    console.log('🟡 PDF Generation Started - TemplateA5');
    const htmlContent = TemplateA5_5({
      transaction,
      company,
      party,
      shippingAddress,
      bank,
      client,
    });

    console.log('🟢 HTML Content Generated Successfully');
    console.log('HTML Length:', htmlContent.length);

    const options = {
      html: htmlContent,
      fileName: `invoice_${transaction.invoiceNumber || 'document'}`,
      directory: 'Documents',
      width: 595,
      height: 420,
      base64: true,
    };

    const file = await generatePDF(options);
    console.log('🟢 PDF Generated Successfully!');

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

// Utility function
export const generateTemplateA5_5HTML = props => {
  return TemplateA5_5(props);
};

export default TemplateA5_5;