// pdf-template8.js - Updated with Pagination
import { generatePDF } from 'react-native-html-to-pdf';
import {
  prepareTemplate8Data,
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  getStateCode,
  numberToWords,
  formatPhoneNumber,
  formatQuantity,
} from './pdf-utils';
import { BASE_URL } from '../config';
import { capitalizeWords } from './utils';

// Constants
const ITEMS_PER_PAGE = 28; // Adjust based on your needs
const A4_WIDTH = 595; // A4 width in points
const A4_HEIGHT = 842; // A4 height in points

// Split items into pages
const splitItemsIntoPages = (items, itemsPerPage = ITEMS_PER_PAGE) => {
  const pages = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }
  return pages;
};

// --- Main Template Component ---
const Template8 = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  client,
  clientName,
}) => {
  const actualShippingAddress = shippingAddress || transaction?.shippingAddress;

  // Prepare data
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
  } = prepareTemplate8Data(transaction, company, party, actualShippingAddress);

  const logoSrc = company?.logo ? `${BASE_URL}${company.logo}` : null;
  const shouldHideBankDetails = transaction.type === 'proforma';

  const bankData = bank || transaction?.bank || {};

  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.qrCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  // Column widths
  const getColWidths = () => {
    if (!isGSTApplicable) {
      return ['4%', '26%', '14%', '14%', '8%', '15%', '25%'];
    } else if (showIGST) {
      return ['4%', '20%', '8%', '10%', '8%', '12%', '8%', '12%', '18%'];
    } else {
      return [
        '4%',
        '16%',
        '7%',
        '8%',
        '7%',
        '10%',
        '7%',
        '10%',
        '7%',
        '10%',
        '14%',
      ];
    }
  };

  const colWidths = getColWidths();
  const totalColumnIndex = !isGSTApplicable ? 6 : showIGST ? 8 : 10;

  // Split items into pages
  const itemPages = splitItemsIntoPages(itemsWithGST, ITEMS_PER_PAGE);
  const totalPages = itemPages.length;

  // Safe phone number formatting
  const safeFormatPhoneNumber = phoneNumber => {
    try {
      if (!phoneNumber) return '-';
      return formatPhoneNumber(phoneNumber);
    } catch (error) {
      return phoneNumber || '-';
    }
  };

  // Safe number to words
  const safeNumberToWords = amount => {
    try {
      return numberToWords(amount);
    } catch (error) {
      return `Rupees ${formatCurrency(amount)} Only`;
    }
  };

  // Format date
  const formatDateSafe = dateString => {
    try {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch (error) {
      return dateString || '-';
    }
  };

  // Render HTML notes
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

  // Generate Header HTML (repeatable)
  const generateHeaderHTML = () => {
    return `
      <!-- Header -->
      <div class="header">
        <div class="invoice-title">
          ${
            transaction.type === 'proforma'
              ? 'PROFORMA INVOICE'
              : isGSTApplicable
              ? 'TAX INVOICE'
              : 'INVOICE'
          }
        </div>
        
        <div class="company-name">
          ${capitalizeWords(
            company?.businessName || company?.companyName || 'Company Name',
          )}
        </div>
        
        <div class="company-details">
          ${
            company?.gstin
              ? `<div><span class="bold">GSTIN</span> ${company.gstin}</div>`
              : ''
          }
          <div>${capitalizeWords(company?.address || 'Address Line 1')}</div>
          <div>${capitalizeWords(company?.City || 'City')}</div>
          <div>${capitalizeWords(company?.addressState || 'State')} - ${
      company?.Pincode || 'Pincode'
    }</div>
          <div><span class="bold">Phone</span> ${safeFormatPhoneNumber(
            company?.mobileNumber || company?.Telephone || 'Phone',
          )}</div>
        </div>
        
        ${logoSrc ? `<img src="${logoSrc}" class="logo" />` : ''}
      </div>
      
      <div class="divider-blue"></div>
      
      <!-- Two Column Section -->
      <div class="two-columns">
        <!-- Left Column -->
        <div class="left-column">
          <!-- Bill To -->
          <div class="mb-10">
            <div class="section-header">Details of Buyer | Billed to :</div>
            <div class="client-name">${capitalizeWords(
              party?.name || 'N/A',
            )}</div>
            <div class="address-text">${capitalizeWords(
              getBillingAddress(party),
            )}</div>
            ${
              party?.contactNumber
                ? `<div class="address-text"><span class="bold">Phone:</span> ${safeFormatPhoneNumber(
                    party.contactNumber,
                  )}</div>`
                : ''
            }
            <div class="address-text"><span class="bold">GSTIN:</span> ${
              party?.gstin || '-'
            }</div>
            <div class="address-text"><span class="bold">PAN:</span> ${
              party?.pan || '-'
            }</div>
            <div class="address-text"><span class="bold">Place of Supply:</span> ${
              actualShippingAddress?.state
                ? `${actualShippingAddress.state} (${
                    getStateCode(actualShippingAddress.state) || '-'
                  })`
                : party?.state
                ? `${party.state} (${getStateCode(party.state) || '-'})`
                : '-'
            }</div>
          </div>
          
          <!-- Ship To -->
          <div>
            <div class="section-header" style="margin-top:10px;">Details of Consigned | Shipped to :</div>
            <div class="client-name">${capitalizeWords(
              actualShippingAddress?.label || party?.name || 'N/A',
            )}</div>
            <div class="address-text">${capitalizeWords(
              getShippingAddress(
                actualShippingAddress,
                getBillingAddress(party),
              ),
            )}</div>
            ${
              company?.Country
                ? `<div class="address-text"><span class="bold">Country:</span> ${company.Country}</div>`
                : ''
            }
            ${
              party?.contactNumber
                ? `<div class="address-text"><span class="bold">Phone:</span> ${safeFormatPhoneNumber(
                    party.contactNumber,
                  )}</div>`
                : ''
            }
            <div class="address-text"><span class="bold">GSTIN:</span> ${
              party?.gstin || '-'
            }</div>
            <div class="address-text"><span class="bold">State:</span> ${
              actualShippingAddress?.state
                ? `${actualShippingAddress.state} (${
                    getStateCode(actualShippingAddress.state) || '-'
                  })`
                : party?.state
                ? `${party.state} (${getStateCode(party.state) || '-'})`
                : '-'
            }</div>
          </div>
        </div>
        
        <!-- Right Column -->
        <div class="right-column">
          <div class="invoice-details">
            <div class="detail-row">
              <span class="bold">Invoice #:</span>
              <span>${transaction?.invoiceNumber || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="bold">Invoice Date:</span>
              <span>${formatDateSafe(transaction?.date)}</span>
            </div>
            <div class="detail-row">
              <span class="bold">P.O. No.:</span>
              <span>${transaction?.voucher || '-'}</span>
            </div>
            <div class="detail-row">
              <span class="bold">P.O. Date:</span>
              <span>${
                transaction?.poDate ? formatDateSafe(transaction.poDate) : '-'
              }</span>
            </div>
            ${
              isGSTApplicable
                ? `
            <div class="detail-row">
              <span class="bold">E-Way No.:</span>
              <span>${transaction?.eway || '-'}</span>
            </div>
            `
                : ''
            }
          </div>
        </div>
      </div>
    `;
  };

  // Generate Table Header HTML
  const generateTableHeaderHTML = () => {
    let tableHeader = `
      <tr style="background-color: #2583C6; color: white; font-weight: bold; font-size: 9px;">
        <th style="width: ${colWidths[0]}; text-align: center; padding: 4px; border-right: 1px solid white;">Sr.No</th>
        <th style="width: ${colWidths[1]}; text-align: left; padding: 4px; border-right: 1px solid white;">Name of Product / Service</th>
        <th style="width: ${colWidths[2]}; text-align: center; padding: 4px; border-right: 1px solid white;">HSN/SAC</th>
        <th style="width: ${colWidths[3]}; text-align: center; padding: 4px; border-right: 1px solid white;">Rate (Rs.)</th>
        <th style="width: ${colWidths[4]}; text-align: center; padding: 4px; border-right: 1px solid white;">Qty</th>
        <th style="width: ${colWidths[5]}; text-align: center; padding: 4px; border-right: 1px solid white;">Taxable Value (Rs.)</th>
    `;

    if (showIGST) {
      tableHeader += `
        <th style="width: ${colWidths[6]}; text-align: center; padding: 4px; border-right: 1px solid white;">IGST%</th>
        <th style="width: ${colWidths[7]}; text-align: center; padding: 4px; border-right: 1px solid white;">IGST Amount (Rs.)</th>
      `;
    } else if (showCGSTSGST) {
      tableHeader += `
        <th style="width: ${colWidths[6]}; text-align: center; padding: 4px; border-right: 1px solid white;">CGST%</th>
        <th style="width: ${colWidths[7]}; text-align: center; padding: 4px; border-right: 1px solid white;">CGST Amount (Rs.)</th>
        <th style="width: ${colWidths[8]}; text-align: center; padding: 4px; border-right: 1px solid white;">SGST%</th>
        <th style="width: ${colWidths[9]}; text-align: center; padding: 4px; border-right: 1px solid white;">SGST Amount (Rs.)</th>
      `;
    }

    tableHeader += `
        <th style="width: ${colWidths[totalColumnIndex]}; text-align: center; padding: 4px;">Total (Rs.)</th>
      </tr>
    `;

    return tableHeader;
  };

  // Generate Table Rows HTML for specific page
  const generateItemRowsHTML = (pageItems, startIndex) => {
    return pageItems
      .map((item, index) => {
        let row = `
        <tr style="border-bottom: 1px solid #bfbfbf;">
          <td style="width: ${
            colWidths[0]
          }; text-align: center; padding: 3px; font-size: 8px; border-right: 1px solid #bfbfbf;">${
          startIndex + index + 1
        }</td>
          <td style="width: ${
            colWidths[1]
          }; padding: 3px; font-size: 8px; border-right: 1px solid #bfbfbf; text-align: left;">${capitalizeWords(
          item.name,
        )}</td>
          <td style="width: ${
            colWidths[2]
          }; text-align: center; padding: 3px; font-size: 8px; border-right: 1px solid #bfbfbf;">${
          item.code || '-'
        }</td>
          <td style="width: ${
            colWidths[3]
          }; text-align: center; padding: 3px; font-size: 8px; border-right: 1px solid #bfbfbf;">${formatCurrency(
          item.pricePerUnit || 0,
        )}</td>
          <td style="width: ${
            colWidths[4]
          }; text-align: center; padding: 3px; font-size: 8px; border-right: 1px solid #bfbfbf;">${
          item.itemType === 'service'
            ? '-'
            : formatQuantity(item.quantity || 0, item.unit)
        }</td>
          <td style="width: ${
            colWidths[5]
          }; text-align: center; padding: 3px; font-size: 8px; border-right: 1px solid #bfbfbf;">${formatCurrency(
          item.taxableValue,
        )}</td>
      `;

        if (showIGST) {
          row += `
          <td style="width: ${
            colWidths[6]
          }; text-align: center; padding: 3px; font-size: 8px; border-right: 1px solid #bfbfbf;">${item.gstRate.toFixed(
            2,
          )}</td>
          <td style="width: ${
            colWidths[7]
          }; text-align: center; padding: 3px; font-size: 8px; border-right: 1px solid #bfbfbf;">${formatCurrency(
            item.igst,
          )}</td>
        `;
        } else if (showCGSTSGST) {
          row += `
          <td style="width: ${
            colWidths[6]
          }; text-align: center; padding: 3px; font-size: 8px; border-right: 1px solid #bfbfbf;">${(
            item.gstRate / 2
          ).toFixed(2)}</td>
          <td style="width: ${
            colWidths[7]
          }; text-align: center; padding: 3px; font-size: 8px; border-right: 1px solid #bfbfbf;">${formatCurrency(
            item.cgst,
          )}</td>
          <td style="width: ${
            colWidths[8]
          }; text-align: center; padding: 3px; font-size: 8px; border-right: 1px solid #bfbfbf;">${(
            item.gstRate / 2
          ).toFixed(2)}</td>
          <td style="width: ${
            colWidths[9]
          }; text-align: center; padding: 3px; font-size: 8px; border-right: 1px solid #bfbfbf;">${formatCurrency(
            item.sgst,
          )}</td>
        `;
        }

        row += `
          <td style="width: ${
            colWidths[totalColumnIndex]
          }; text-align: center; padding: 3px; font-size: 8px; font-weight: bold;">${formatCurrency(
          item.total,
        )}</td>
        </tr>
      `;

        return row;
      })
      .join('');
  };

  // Generate Page HTML
  const generatePageHTML = (pageItems, pageIndex, startIndex, isLastPage) => {
    return `
      <div class="page">
        ${generateHeaderHTML()}
        
        <!-- Items Table -->
        <table class="items-table">
          <thead>
            ${generateTableHeaderHTML()}
          </thead>
          <tbody>
            ${generateItemRowsHTML(pageItems, startIndex)}
          </tbody>
        </table>
        
        ${
          isLastPage
            ? `
        <!-- Totals Section (only on last page) -->
        <div class="totals-section">
          <div class="totals-left">
            <div>Total Items / Qty : ${totalItems} / ${totalQty}</div>
          </div>
          <div class="totals-right">
            ${
              isGSTApplicable
                ? `
              ${
                showIGST
                  ? `
                <div class="totals-row">
                  <span class="bold">IGST</span>
                  <span>Rs. ${formatCurrency(totalIGST)}</span>
                </div>
              `
                  : ''
              }
              ${
                showCGSTSGST
                  ? `
                <div class="totals-row">
                  <span class="bold">CGST</span>
                  <span>Rs. ${formatCurrency(totalCGST)}</span>
                </div>
                <div class="totals-row">
                  <span class="bold">SGST</span>
                  <span>Rs. ${formatCurrency(totalSGST)}</span>
                </div>
              `
                  : ''
              }
            `
                : ''
            }
            <div class="totals-row">
              <span class="bold">${
                isGSTApplicable ? 'Total Amount After Tax' : 'Total Amount'
              }</span>
              <span>Rs. ${formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
        
        <!-- Total in Words -->
        <div class="total-in-words">
          <span class="bold">Total in words :</span> ${safeNumberToWords(
            totalAmount,
          )}
        </div>
        
        <div class="divider-gray"></div>
        
        <!-- Bank Details and Signature -->
        ${
          !shouldHideBankDetails && isBankDetailAvailable
            ? `
        <div class="bank-section">
          <div style="display: flex; justify-content: space-between;">
            <!-- Bank Details -->
            <div style="width: 60%;">
              <div class="bold">Bank Details:</div>
              ${
                bankData.bankName
                  ? `
                <div class="bank-row">
                  <span class="bank-label">Name:</span>
                  <span class="bank-value">${capitalizeWords(
                    bankData.bankName,
                  )}</span>
                </div>
              `
                  : ''
              }
              ${
                bankData.branchAddress
                  ? `
                <div class="bank-row">
                  <span class="bank-label">Branch:</span>
                  <span class="bank-value">${capitalizeWords(
                    bankData.branchAddress,
                  )}</span>
                </div>
              `
                  : ''
              }
              ${
                bankData.ifscCode
                  ? `
                <div class="bank-row">
                  <span class="bank-label">IFSC:</span>
                  <span class="bank-value">${bankData.ifscCode}</span>
                </div>
              `
                  : ''
              }
              ${
                bankData.accountNo
                  ? `
                <div class="bank-row">
                  <span class="bank-label">Acc. No:</span>
                  <span class="bank-value">${bankData.accountNo}</span>
                </div>
              `
                  : ''
              }
              ${
                bankData.upiDetails?.upiId
                  ? `
                <div class="bank-row">
                  <span class="bank-label">UPI ID:</span>
                  <span class="bank-value">${bankData.upiDetails.upiId}</span>
                </div>
              `
                  : ''
              }
              ${
                bankData.upiDetails?.upiName
                  ? `
                <div class="bank-row">
                  <span class="bank-label">UPI Name:</span>
                  <span class="bank-value">${bankData.upiDetails.upiName}</span>
                </div>
              `
                  : ''
              }
              ${
                bankData.upiDetails?.upiMobile
                  ? `
                <div class="bank-row">
                  <span class="bank-label">UPI Mobile:</span>
                  <span class="bank-value">${bankData.upiDetails.upiMobile}</span>
                </div>
              `
                  : ''
              }
            </div>
            
            <!-- QR Code -->
            ${
              bankData.qrCode
                ? `
              <div style="width: 20%; text-align: center;">
                <div class="bold mb-2">QR Code</div>
                <img src="${BASE_URL}${bankData.qrCode}" class="qr-code" />
              </div>
            `
                : ''
            }
            
            <!-- Signature -->
            <div style="width: 30%; padding-left:50px; padding-top:10px;">
              <div class="signature" style="text-align:center;">
                <div>For ${capitalizeWords(
                  company?.businessName || 'Company',
                )}</div>
                <div style="text-align:center; padding-top:50px;">
                  <div class="signature-line"></div>
                  <div>Authorised Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        `
            : ''
        }
        
        <!-- Notes Section -->
        ${
          transaction?.notes
            ? `
          <div class="notes-section">
            ${renderNotesHTML(transaction.notes)}
          </div>
        `
            : ''
        }
        `
            : ''
        }
        
        <!-- Page Number -->
        <div class="page-number">${pageIndex + 1} / ${totalPages} page${
      totalPages > 1 ? 's' : ''
    }</div>
      </div>
    `;
  };

  // Generate HTML for all pages
  const generateHTML = () => {
    let startIndex = 0;
    const pageHTMLs = itemPages.map((pageItems, pageIndex) => {
      const pageHTML = generatePageHTML(
        pageItems,
        pageIndex,
        startIndex,
        pageIndex === totalPages - 1, // isLastPage
      );
      startIndex += pageItems.length;
      return pageHTML;
    });

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
          
          html, body {
            height: auto !important;
            min-height: 100vh !important;
            width: 100%;
            overflow: visible !important;
          }
          
          body {
            font-family: Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #000;
            font-size: 12px;
            line-height: 1.2;
            min-height: 100vh;
            width: 100%;
            overflow: visible;
            background: white;
          }
          
          /* Page Break Support */
          .page {
            page-break-after: always;
            position: relative;
            min-height: ${A4_HEIGHT}pt;
            width: ${A4_WIDTH}pt;
            padding: 25pt;
            margin: 0 auto;
            box-sizing: border-box;
            overflow: visible;
          }
          
          .page:last-child {
            page-break-after: auto;
          }
          
          /* Header Styles */
          .header {
            margin-bottom: 15px;
          }
          
          .invoice-title {
            font-size: 16px;
            font-weight: bold;
            color: #2583C6;
            margin-bottom: 5px;
          }
          
          .company-name {
            font-size: 12px;
            font-weight: bold;
            color: #232323;
            margin-bottom: 3px;
          }
          
          .company-details {
            font-size: 9px;
            color: #262626;
            line-height: 1.2;
          }
          
          .company-details div {
            margin-bottom: 2px;
          }
          
          .logo {
            position: absolute;
            right: 25pt;
            top: 25pt;
            width: 70px;
            height: 70px;
          }
          
          /* Divider */
          .divider-blue {
            border-bottom: 3px solid #2583C6;
            margin: 15px 0;
          }
          
          .divider-gray {
            border-bottom: 2px solid #bfbfbf;
            margin: 10px 0;
          }
          
          /* Two Column Layout */
          .two-columns {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          
          .left-column {
            flex: 2;
            padding-right: 20px;
          }
          
          .right-column {
            width: 30%;
          }
          
          .section-header {
            font-size: 11px;
            font-weight: bold;
            color: #262626;
            margin-bottom: 5px;
          }
          
          .client-name {
            font-size: 10px;
            font-weight: bold;
            color: #262626;
            margin-bottom: 5px;
          }
          
          .address-text {
            font-size: 9px;
            color: #262626;
            line-height: 1.1;
            margin-bottom: 3px;
          }
          
          .invoice-details {
            font-size: 9px;
            color: #262626;
          }
          
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          
          /* Table Styles */
          .items-table {
            width: 100%;
            border: 1px solid #bfbfbf;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          
          .items-table th,
          .items-table td {
            border: 1px solid #bfbfbf;
          }
          
          /* Totals Section */
          .totals-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
          }
          
          .totals-left {
            font-size: 8px;
          }
          
          .totals-right {
            font-size: 10px;
            text-align: right;
          }
          
          .totals-row {
            display: flex;
            justify-content: space-between;
            gap: 32px;
            margin-bottom: 4px;
          }
          
          .total-in-words {
            font-size: 9px;
            margin: 10px 0;
            font-weight: bold;
          }
          
          /* Bank Details */
          .bank-section {
            margin-top: 15px;
          }
          
          .bank-details {
            font-size: 9px;
            margin-bottom: 10px;
          }
          
          .bank-row {
            display: flex;
            margin-bottom: 2px;
          }
          
          .bank-label {
            width: 70px;
            font-weight: bold;
          }
          
          .bank-value {
            flex: 1;
          }
          
          .qr-code {
            width: 80px;
            height: 80px;
            object-fit: contain;
            margin: 0 auto;
            display: block;
          }
          
          /* Signature */
          .signature {
            text-align: right;
            margin-top: 20px;
            font-size: 9px;
          }
          
          .signature-line {
            width: 100px;
            height: 1px;
            border-top: 1px solid #ddd;
            margin: 5px 0;
            display: inline-block;
          }
          
          /* Notes */
          .notes-section {
            margin-top: 20px;
            border-top: 3px solid #2583C6;
            padding-top: 10px;
            padding-left: 10px;
            font-size: 8px;
            line-height: 1.4;
          }
          
          /* Page Number */
          .page-number {
            position: absolute;
            bottom: 10px;
            right: 24px;
            font-size: 8px;
            text-align: right;
          }
          
          /* Utility Classes */
          .bold {
            font-weight: bold;
            margin-bottom: 4px;
          }
          
          .text-center {
            text-align: center;
          }
          
          .text-right {
            text-align: right;
          }
          
          .mb-2 {
            margin-bottom: 2px;
          }
          
          .mb-5 {
            margin-bottom: 5px;
          }
          
          .mb-10 {
            margin-bottom: 10px;
          }
          
          .mt-10 {
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        ${pageHTMLs.join('')}
      </body>
      </html>
    `;
  };

  return generateHTML();
};

// --- PDF Generation Function ---
export const generatePdfForTemplate8 = async (
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
    const htmlContent = Template8({
      transaction,
      company,
      party,
      shippingAddress,
      bank,
      client,
      clientName,
    });

    const options = {
      html: htmlContent,
      fileName: `invoice_${transaction.invoiceNumber || 'document'}_template8`,
      directory: 'Documents',
      width: A4_WIDTH,
      height: A4_HEIGHT,
      base64: true,
    };

    const file = await generatePDF(options);

    return {
      ...file,
      output: (format = 'base64') => {
        if (format === 'base64') return file.base64;
        if (format === 'filePath') return file.filePath;
        return file.base64;
      },
    };
  } catch (error) {
    throw error;
  }
};

export default Template8;
