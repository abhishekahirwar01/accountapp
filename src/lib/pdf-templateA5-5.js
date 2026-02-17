// pdf-templateA5-ReactNative-FINAL.js
import React from 'react';
import {
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  prepareTemplate8Data,
  getStateCode,
  numberToWords,
  formatPhoneNumber,
  formatQuantity,
} from './pdf-utils';
import { capitalizeWords } from './utils';
import { BASE_URL } from '../config';
import { generatePDF } from 'react-native-html-to-pdf';

// Constants
const PRIMARY_BLUE = '#0371C1';
const LIGHT_BLUE_BG = 'rgba(3, 113, 193, 0.2)';
const ITEMS_PER_PAGE = 15; // Items per page for pagination

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

// Safe date formatting
const formatDateSafe = dateString => {
  try {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  } catch (error) {
    return dateString || '-';
  }
};

// Split items into pages
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

  // Column configurations based on GST type
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

  // Generate header section - SHOWN ON EVERY PAGE
  const generateHeaderSection = () => {
    const companyName = company?.businessName || company?.companyName || 'Company Name';

    return `
      <!-- Header Section - Company Info -->
      <div class="header-wrapper">
        <div class="header-content">
          <div class="header-left">
            ${logoSrc ? `<img src="${logoSrc}" class="logo" alt="Company Logo" />` : ''}
          </div>
          <div class="header-right">
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
              <span class="contact-item">Phone: ${
                company?.mobileNumber
                  ? safeFormatPhoneNumber(String(company.mobileNumber))
                  : '-'
              }</span>
              <span class="contact-item">E-mail: ${company?.email || '-'}</span>
              <span class="contact-item">Telephone: ${
                company?.Telephone
                  ? safeFormatPhoneNumber(String(company.Telephone))
                  : '-'
              }</span>
            </div>
          </div>
        </div>
      </div>

      <!-- GSTIN and Invoice Type Section -->
      <div class="gstin-invoice-section">
        <div class="gstin-left">
          ${company?.gstin ? `GSTIN: ${company.gstin}` : ''}
        </div>
        <div class="invoice-center">
          ${
            transaction.type === 'proforma'
              ? 'PROFORMA INVOICE'
              : isGSTApplicable
              ? 'TAX INVOICE'
              : 'INVOICE'
          }
        </div>
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
            <span class="info-value">${company?.Country || 'India'}</span>
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

  // Generate table header
  const generateTableHeader = () => {
    return `
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
    `;
  };

  // Generate item rows
  const generateItemRows = (pageItems, startIndex) => {
    return pageItems
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
      .join('');
  };

  // Generate total row
  const generateTotalRow = () => {
    return `
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
    `;
  };

  // Generate footer section - ONLY ON LAST PAGE
  const generateFooterSection = () => {
    const companyName = company?.businessName || company?.companyName || '-';

    return `
      <!-- Footer Section -->
      <div class="footer-wrapper">
        <!-- Total in Words -->
        <div class="total-in-words-full">
          TOTAL IN WORDS: ${safeNumberToWords(totalAmount).toUpperCase()}
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
                <div class="bank-grid">
                  ${bankData?.bankName ? `<div class="bank-item"><span class="bank-key">Name:</span> <span class="bank-val">${capitalizeWords(bankData.bankName)}</span></div>` : ''}
                  ${bankData?.accountNo ? `<div class="bank-item"><span class="bank-key">Acc. No:</span> <span class="bank-val">${bankData.accountNo}</span></div>` : ''}
                  ${bankData?.ifscCode ? `<div class="bank-item"><span class="bank-key">IFSC:</span> <span class="bank-val">${bankData.ifscCode}</span></div>` : ''}
                  ${bankData?.branchAddress ? `<div class="bank-item"><span class="bank-key">Branch:</span> <span class="bank-val">${bankData.branchAddress}</span></div>` : ''}
                  ${bankData?.upiDetails?.upiId ? `<div class="bank-item"><span class="bank-key">UPI ID:</span> <span class="bank-val">${bankData.upiDetails.upiId}</span></div>` : ''}
                  ${bankData?.upiDetails?.upiName ? `<div class="bank-item"><span class="bank-key">UPI Name:</span> <span class="bank-val">${bankData.upiDetails.upiName}</span></div>` : ''}
                  ${bankData?.upiDetails?.upiMobile ? `<div class="bank-item"><span class="bank-key">UPI Mobile:</span> <span class="bank-val">${bankData.upiDetails.upiMobile}</span></div>` : ''}
                </div>
                ${
                  bankData?.qrCode
                    ? `
                  <div class="qr-container">
                    <div class="qr-title">QR Code</div>
                    <img src="${BASE_URL}/${bankData.qrCode}" class="qr-image" alt="QR Code" />
                  </div>
                `
                    : ''
                }
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

    const pagesHTML = itemPages
      .map((pageItems, pageIndex) => {
        const isLastPage = pageIndex === itemPages.length - 1;
        const pageNumber = pageIndex + 1;

        const pageHTML = `
        <div class="page" style="${pageIndex > 0 ? 'page-break-before: always;' : ''}">
          <!-- HEADER - SHOWN ON EVERY PAGE -->
          ${generateHeaderSection()}
          
          <!-- TABLE -->
          <div class="table-container">
            ${generateTableHeader()}
            ${generateItemRows(pageItems, startIndex)}
            ${isLastPage ? generateTotalRow() : ''}
          </div>

          <!-- FOOTER - ONLY ON LAST PAGE -->
          ${isLastPage ? generateFooterSection() : ''}
          
          <!-- PAGE NUMBER - ON EVERY PAGE AT BOTTOM RIGHT -->
          <div class="page-number">
            Page ${pageNumber} of ${totalPages}
          </div>
        </div>
      `;

        startIndex += pageItems.length;
        return pageHTML;
      })
      .join('');

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
          
          html {
            height: auto;
            overflow-y: auto;
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 8px;
            color: #000;
            font-size: 7px;
            line-height: 1.2;
            max-width: 595px;
            width: 100%;
            background: white;
            min-height: 100vh;
            height: auto;
            overflow-y: visible;
            position: relative;
          }
          
          .page {
            position: relative;
            width: 100%;
            min-height: 400px;
            height: auto;
            border: 1.5px solid ${PRIMARY_BLUE};
            margin-bottom: 10px;
            background: white;
            page-break-after: always;
            overflow: visible;
            padding-bottom: 15px; /* Space for page number */
          }
          
          .page:last-child {
            page-break-after: auto;
            margin-bottom: 0;
          }
          
          /* Page Number - Outside border at bottom right */
          .page-number {
            position: absolute;
            bottom: -12px; /* Position outside the border */
            right: 10px;
            font-size: 8px;
            color: #000;
            font-weight: bold;
            text-align: right;
            background: white;
            padding: 0 5px;
            z-index: 100;
          }
          
          /* Remove the old page number footer style */
          .page-number-footer {
            display: none;
          }
          
          /* Header Section */
          .header-wrapper {
            border-bottom: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .header-content {
            display: flex;
            padding: 4px 8px;
            gap: 10px;
            align-items: center;
          }
          
          .header-left {
            flex-shrink: 0;
          }
          
          .logo {
            width: 60px;
            height: 60px;
            object-fit: contain;
          }
          
          .header-right {
            flex: 1;
          }
          
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 3px;
            
          }
          
          .company-address {
            font-size: 10px;
            margin-bottom: 2px;
            
          }
          
          .company-contact {
            font-size: 10px;
            
          }
          
          .contact-item {
            margin-right: 10px;
          }
          
          /* GSTIN Invoice Section */
          .gstin-invoice-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3px 8px;
            border-bottom: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .gstin-left {
            font-size: 10px;
            font-weight: bold;
          }
          
          .invoice-center {
            font-size: 16px;
            font-weight: bold;
            color: ${PRIMARY_BLUE};
          }
          
          .original-right {
            font-size: 10px;
            font-weight: bold;
          }
          
          /* Three Column Wrapper */
          .three-col-wrapper {
            display: flex;
            border-bottom: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .info-column {
            flex: 1;
            padding: 3px 5px;
            border-right: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .info-column:last-child {
            border-right: none;
          }
          
          .column-header {
            font-size: 8px;
            font-weight: bold;
            color: ${PRIMARY_BLUE};
            margin-bottom: 2px;
          }
          
          .info-row {
            display: flex;
            font-size: 8px;
            margin-bottom: 1px;
            line-height: 1.2;
          }
          
          .info-label {
            font-weight: bold;
            min-width: 80px;
            flex-shrink: 0;
          }
          
          .info-value {
            flex: 1;
            word-break: break-word;
          }
          
          /* Items Table */
          .table-container {
            width: 100%;
            overflow: visible;
          }
          
          .items-table-header {
            display: flex;
            background-color: ${LIGHT_BLUE_BG};
            border-bottom: 1px solid ${PRIMARY_BLUE};
          }
          
          .header-cell {
            padding: 2px;
            text-align: center;
            font-size: 7px;
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
            border-bottom: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .table-cell {
            padding: 2px;
            font-size: 7px;
            text-align: center;
            border-right: 1px solid ${PRIMARY_BLUE};
            display: flex;
            align-items: center;
            justify-content: center;
            word-break: break-word;
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
          
          .igst-header:last-child {
            border-right: none;
          }
          
          .igst-main-header {
            font-size: 7px;
            font-weight: bold;
            text-align: center;
            padding: 2px;
          }
          
          .igst-sub-header {
            display: flex;
            border-top: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-sub-percentage {
            font-size: 6px;
            font-weight: bold;
            width: 30%;
            text-align: center;
            padding: 2px;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-sub-text {
            font-size: 6px;
            font-weight: bold;
            width: 70%;
            text-align: center;
            padding: 2px;
          }
          
          .igst-cell {
            display: flex;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-cell:last-child {
            border-right: none;
          }
          
          .igst-percent {
            font-size: 7px;
            width: 30%;
            text-align: center;
            padding: 2px;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-amount {
            font-size: 7px;
            width: 70%;
            text-align: center;
            padding: 2px;
          }
          
          /* Footer Section */
          .footer-wrapper {
            border-top: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .total-in-words-full {
            padding: 4px 8px;
            font-size: 8px;
            font-weight: bold;
            border-bottom: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .bottom-two-columns {
            display: flex;
          }
          
          /* Left Side: Bank + Terms */
          .left-bottom-section {
            flex: 1;
            padding: 4px;
            border-right: 1.5px solid ${PRIMARY_BLUE};
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          
          .bank-details-box {
            font-size: 8px;
          }
          
          .bank-title {
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          
          .bank-grid {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          
          .bank-item {
            font-size: 8px;
            display: flex;
            margin-bottom: 1px;
          }
          
          .bank-key {
            font-weight: bold;
            min-width: 70px;
          }
          
          .bank-val {
            flex: 1;
          }
          
          .qr-container {
            margin-top: 10px;
            text-align: center;
          }
          
          .qr-title {
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          
          .qr-image {
            width: 70px;
            height: 70px;
            object-fit: contain;
          }
          
          .terms-box-bottom {
            margin-left: -4px;
            margin-right: -4px;
            font-size: 8px;
            line-height: 1.3;
            padding-top: 4px;
            padding-left: 10px;
            border-top: 1px solid ${PRIMARY_BLUE};
          }
          
          .terms-content {
            font-size: 8px;
            line-height: 1.3;
            word-wrap: break-word;
          }
          
          /* Right Side: Totals */
          .right-bottom-section {
            width: 220px;
            padding: 4px 0;
            display: flex;
            flex-direction: column;
          }
          
          .total-line {
            display: flex;
            justify-content: space-between;
            padding: 3px 6px;
            font-size: 8px;
            border-bottom: 1px solid #ddd;
          }
          
          .total-label, .total-value {
            font-size: 8px;
          }
          
          .highlight-total {
            background-color: ${LIGHT_BLUE_BG};
            font-weight: bold;
          }
          
          .total-label-bold, .total-value-bold {
            font-size: 8px;
            font-weight: bold;
          }
          
          /* Utility */
          .bg-highlight {
            background-color: ${LIGHT_BLUE_BG};
          }
          
          .font-bold {
            font-weight: bold;
          }

          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            
            .page {
              page-break-inside: avoid;
              margin-bottom: 0;
              position: relative;
            }
            
            .page-number {
              position: absolute;
              bottom: -12px;
              right: 10px;
              background: white;
              padding: 0 5px;
            }
          }
        </style>
      </head>
      <body>
        ${pagesHTML}
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
    console.log('🟡 PDF Generation Started - TemplateA5_5');
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
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
};

// Utility function
export const generateTemplateA5_5HTML = props => {
  return TemplateA5_5(props);
};

export default TemplateA5_5;