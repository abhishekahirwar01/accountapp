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
import { generatePDF } from 'react-native-html-to-pdf';

// --- Constants ---
const PRIMARY_BLUE = '#0070c0';
const LIGHT_GRAY = '#f8f8f8';
const DARK_TEXT = '#333333';
const BORDER_COLOR = '#BABABA';
const ITEMS_PER_PAGE = 27; // Number of items per page for pagination

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

// Split items into pages
const splitItemsIntoPages = (items, itemsPerPage = ITEMS_PER_PAGE) => {
  const pages = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }
  return pages;
};

// Generate items table HTML for a specific page
const generateItemsTableHTML = (items, colWidths, showIGST, showCGSTSGST, startIndex = 0) => {
  return items
    .map((item, index) => {
      return `
        <div class="table-row">
          <div class="table-cell table-cell-center" style="width: ${colWidths[0]}">${startIndex + index + 1}</div>
          <div class="table-cell table-cell-left" style="width: ${colWidths[1]}">${item.name}</div>
          <div class="table-cell table-cell-center" style="width: ${colWidths[2]}">${item.code || '-'}</div>
          <div class="table-cell table-cell-center" style="width: ${colWidths[3]}">${formatCurrency(item.pricePerUnit || 0)}</div>
          <div class="table-cell table-cell-center" style="width: ${colWidths[4]}">
            ${item.itemType === 'service' ? '-' : formatQuantity(item.quantity || 0, item.unit)}
          </div>
          <div class="table-cell table-cell-center" style="width: ${colWidths[5]}">${formatCurrency(item.taxableValue)}</div>

          ${showIGST
            ? `
              <div class="table-cell table-cell-center" style="width: ${colWidths[6]}">${item.gstRate?.toFixed(2) || '0.00'}</div>
              <div class="table-cell table-cell-center" style="width: ${colWidths[7]}">${formatCurrency(item.igst || 0)}</div>
            `
            : showCGSTSGST
            ? `
              <div class="table-cell table-cell-center" style="width: ${colWidths[6]}">${(item.gstRate / 2).toFixed(2)}</div>
              <div class="table-cell table-cell-center" style="width: ${colWidths[7]}">${formatCurrency(item.cgst || 0)}</div>
              <div class="table-cell table-cell-center" style="width: ${colWidths[8]}">${(item.gstRate / 2).toFixed(2)}</div>
              <div class="table-cell table-cell-center" style="width: ${colWidths[9]}">${formatCurrency(item.sgst || 0)}</div>
            `
            : ''}

          <div class="table-cell table-cell-center" style="width: ${colWidths[showIGST ? 8 : showCGSTSGST ? 10 : 6]}; border-right: none; font-weight: bold;">
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
  isLastPage = false
) => {
  const logoSrc = company?.logo ? `${BASE_URL}${company.logo}` : null;
  
  return `
    <div class="page">
      <!-- Header Section -->
      <div class="header-container">
        <div class="logo-and-name-block">
          ${logoSrc
            ? `
              <div class="logo-container">
                <img src="${logoSrc}" class="logo" />
              </div>
            `
            : ''}
          
          <div style="flex: 1;">
            <div class="company-name">
              ${company?.businessName || company?.companyName || ''}
            </div>
            
            <div class="company-details-block">
              ${company?.gstin
                ? `
                  <div class="gstin">
                    GSTIN: <span style="font-weight: normal;">${company.gstin}</span>
                  </div>
                `
                : ''}
              
              <div class="address-text">${company?.address || ''}</div>
              <div class="address-text">
                ${company?.addressState || ''}${company?.Country ? `, ${company.Country}` : ''}${company?.Pincode ? `, ${company.Pincode}` : ''}
              </div>
              <div class="address-text">
                <span class="bold-text">Phone:</span> 
                ${company?.mobileNumber
                  ? safeFormatPhoneNumber(company.mobileNumber)
                  : company?.Telephone
                  ? safeFormatPhoneNumber(company.Telephone)
                  : '-'}
              </div>
            </div>
          </div>
        </div>

        <!-- Invoice Title & Number/Date -->
        <div class="invoice-info-block">
          <div class="tax-invoice-title">
            ${title}
          </div>
          <div class="invoice-date-row">
            <div class="invoice-label">Invoice #:</div>
            <div class="invoice-value">${transaction?.invoiceNumber?.toString() || ''}</div>
          </div>
          <div class="invoice-date-row">
            <div class="invoice-label">Invoice Date:</div>
            <div class="invoice-value">${formatDateSafe(transaction?.date)}</div>
          </div>
        </div>
      </div>

      <!-- Address Block -->
      <div class="party-section">
        <!-- Left Block - Buyer and Consignee Combined -->
        <div class="combined-party-block">
          <!-- Buyer Details -->
          <div style="margin-bottom: 8px;">
            <div class="party-header">Details of Buyer | Billed to :</div>
            
            <div class="address-text mb-2">
              <span class="bold-text">Name:</span> ${capitalizeWords(party?.name || '')}
            </div>
            
            <div class="address-text mb-2">
              <span class="bold-text">Address:</span> ${capitalizeWords(getBillingAddress(party))}
            </div>
            
            <div class="address-text mb-2">
              <span class="bold-text">Phone:</span> ${safeFormatPhoneNumber(buyerPhone)}
            </div>
            
            <div class="address-text mb-2">
              <span class="bold-text">GSTIN:</span> ${party?.gstin || '-'}
            </div>
            
            <div class="address-text mb-2">
              <span class="bold-text">PAN:</span> ${party?.pan || '-'}
            </div>
            
            <div class="address-text">
              <span class="bold-text">Place of Supply:</span> 
              ${shippingAddress?.state
                ? `${shippingAddress.state} (${getStateCode(shippingAddress.state) || '-'})`
                : party?.state
                ? `${party.state} (${getStateCode(party.state) || '-'})`
                : '-'}
            </div>
          </div>

          <!-- Consignee Details -->
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid ${LIGHT_GRAY};">
            <div class="party-header">Details of Consigned | Shipped to :</div>
            
            <div class="address-text mb-2">
              <span class="bold-text">Name:</span> ${capitalizeWords(shippingAddress?.label || party?.name || '')}
            </div>
            
            <div class="address-text mb-2">
              <span class="bold-text">Address:</span> ${capitalizeWords(getShippingAddress(shippingAddress, getBillingAddress(party)))}
            </div>
            
            ${company?.Country
              ? `
                <div class="address-text mb-2">
                  <span class="bold-text">Country:</span> ${capitalizeWords(company.Country)}
                </div>
              `
              : ''}
            
            ${consigneePhone !== '-'
              ? `
                <div class="address-text mb-2">
                  <span class="bold-text">Phone:</span> ${safeFormatPhoneNumber(consigneePhone)}
                </div>
              `
              : ''}
            
            <div class="address-text mb-2">
              <span class="bold-text">GSTIN:</span> ${party?.gstin || '-'}
            </div>
            
            ${shippingAddress?.state
              ? `
                <div class="address-text">
                  <span class="bold-text">State:</span> ${capitalizeWords(shippingAddress.state)} (${getStateCode(shippingAddress.state) || '-'})
                </div>
              `
              : ''}
          </div>
        </div>

        <!-- Right Block - Transaction Details -->
        <div class="transaction-details-block">
          <div style="margin-top: 0;">
            <div class="address-text mb-3">
              <span class="bold-text">P.O. No.:</span> ${transaction?.voucher || '-'}
            </div>
            
            <div class="address-text mb-3">
              <span class="bold-text">P.O. Date:</span> ${formatDateSafe(transaction?.poDate)}
            </div>
            
            ${transaction?.eway
              ? `
                <div class="address-text mb-3">
                  <span class="bold-text">E-Way No.:</span> ${transaction.eway}
                </div>
              `
              : ''}
            
            ${transaction?.dueDate
              ? `
                <div class="address-text">
                  <span class="bold-text">Due Date:</span> ${formatDateSafe(transaction.dueDate)}
                </div>
              `
              : ''}
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="table">
        <!-- Table Header -->
        <div class="table-header">
          <div class="table-cell-header" style="width: ${colWidths[0]}">Sr. No.</div>
          <div class="table-cell-header table-cell-left" style="width: ${colWidths[1]}">Name of Product / Service</div>
          <div class="table-cell-header table-cell-center" style="width: ${colWidths[2]}">HSN / SAC</div>
          <div class="table-cell-header table-cell-center" style="width: ${colWidths[3]}">Rate (Rs.)</div>
          <div class="table-cell-header table-cell-center" style="width: ${colWidths[4]}">Qty</div>
          <div class="table-cell-header table-cell-center" style="width: ${colWidths[5]}">Taxable Value (Rs.)</div>

          ${showIGST
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
            : ''}

          <div class="table-cell-header" style="width: ${colWidths[showIGST ? 8 : showCGSTSGST ? 10 : 6]}; border-right: none;">Total (Rs.)</div>
        </div>

        <!-- Table Rows -->
        ${generateItemsTableHTML(pageData, colWidths, showIGST, showCGSTSGST, startIndex)}
      </div>

      ${isLastPage ? `
        <!-- Totals Section -->
        <div class="totals-section">
          <!-- Left Section -->
          <div class="left-totals">
            <div class="total-items-row">
              <span class="bold-text">Total Items / Qty :</span> ${totalItems} / ${totalQty}
            </div>

            <div class="amount-words-row">
              <div style="margin-bottom: 5px; font-size: 9px; font-weight: bold;">
                Total amount (in words):
              </div>
              <div class="amount-in-words">${amountInWords}</div>
            </div>
          </div>

          <!-- Right Section -->
          <div class="right-totals">
            <div class="totals-row">
              <div class="bold-text">Taxable Amount</div>
              <div>Rs. ${formatCurrency(totalTaxable)}</div>
            </div>

            ${isGSTApplicable
              ? `
                ${showIGST
                  ? `
                    <div class="totals-row">
                      <div class="bold-text">IGST</div>
                      <div>Rs. ${formatCurrency(totalIGST)}</div>
                    </div>
                  `
                  : showCGSTSGST
                  ? `
                    <div class="totals-row">
                      <div class="bold-text">CGST</div>
                      <div>Rs. ${formatCurrency(totalCGST)}</div>
                    </div>
                    <div class="totals-row">
                      <div class="bold-text">SGST</div>
                      <div>Rs. ${formatCurrency(totalSGST)}</div>
                    </div>
                  `
                  : ''}
              `
              : ''}

            <div class="total-amount-row">
              <div class="bold-text">Total Amount</div>
              <div>Rs. ${formatCurrency(totalAmount)}</div>
            </div>
          </div>
        </div>

        <!-- Bank and Signature Section -->
        <div class="bank-terms-section">
          <!-- Bank Details -->
          <div class="bank-details-container">
            ${!shouldHideBankDetails && isBankDetailAvailable
              ? `
                <div class="bank-details">
                  <div class="bank-header">Bank Details:</div>
                  <div style="margin-top: 5px;">
                    ${bankData.bankName
                      ? `
                        <div class="bank-row">
                          <div class="bank-label">Name:</div>
                          <div class="small-text">${capitalizeWords(bankData.bankName)}</div>
                        </div>
                      `
                      : ''}
                    
                    ${bankData.ifscCode
                      ? `
                        <div class="bank-row">
                          <div class="bank-label">IFSC:</div>
                          <div class="small-text">${capitalizeWords(bankData.ifscCode)}</div>
                        </div>
                      `
                      : ''}
                    
                    ${bankData?.accountNo
                      ? `
                        <div class="bank-row">
                          <div class="bank-label">Acc. No:</div>
                          <div class="small-text">${bankData.accountNo}</div>
                        </div>
                      `
                      : ''}
                    
                    ${bankData.branchAddress
                      ? `
                        <div class="bank-row">
                          <div class="bank-label">Branch:</div>
                          <div class="small-text">${capitalizeWords(bankData.branchAddress)}</div>
                        </div>
                      `
                      : ''}
                    
                    ${bankData?.upiDetails?.upiId
                      ? `
                        <div class="bank-row">
                          <div class="bank-label">UPI ID:</div>
                          <div class="small-text">${bankData.upiDetails.upiId}</div>
                        </div>
                      `
                      : ''}
                    
                    ${bankData?.upiDetails?.upiName
                      ? `
                        <div class="bank-row">
                          <div class="bank-label">UPI Name:</div>
                          <div class="small-text">${capitalizeWords(bankData.upiDetails.upiName)}</div>
                        </div>
                      `
                      : ''}
                    
                    ${bankData?.upiDetails?.upiMobile
                      ? `
                        <div class="bank-row">
                          <div class="bank-label">UPI Mobile:</div>
                          <div class="small-text">${bankData.upiDetails.upiMobile}</div>
                        </div>
                      `
                      : ''}
                  </div>
                </div>
              `
              : !shouldHideBankDetails
              ? `
                <div class="bank-details">
                  <div class="bank-header">Bank Details:</div>
                  <div style="font-size: 8px; margin-top: 10px; color: #666;">
                    BANK DETAILS NOT AVAILABLE
                  </div>
                </div>
              `
              : ''}
            
            ${bankData?.qrCode
              ? `
                <div class="qr-code-container">
                  <div style="font-size: 9px; font-weight: bold; margin-bottom: 5px;">QR Code</div>
                  <div style="background-color: #fff;">
                    <img src="${BASE_URL}/${bankData.qrCode}" style="width: 80px; height: 80px; object-fit: contain;" />
                  </div>
                </div>
              `
              : ''}
          </div>

          <!-- Signature Section -->
          <div class="signature-section">
            <div style="font-size: 8px; font-weight: bold; margin-top: 5px; margin-bottom:60px;">
              For ${company?.businessName || 'Company'}
            </div>
            <div style="font-size: 7px; margin-top: 15px; padding-top: 5px; border-top: 1px solid #ccc;">
              AUTHORISED SIGNATORY
            </div>
          </div>
        </div>

        <!-- Terms and Conditions -->
        ${transaction?.notes
          ? `
            <div class="terms-container">
              <div class="terms-content">
                ${renderNotesHTML(transaction.notes)}
              </div>
            </div>
          `
          : ''}
      ` : ''}

      <!-- Page Number -->
      <div class="page-number">Page ${pageIndex + 1} of ${totalPages}</div>
    </div>
  `;
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

// --- Main PDF Component ---
const Template20 = ({ transaction, company, party, shippingAddress, bank }) => {
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
    showNoTax,
  } = preparedData;

  const typedItems = preparedData.itemsWithGST || allItems;
  const itemsToRender = typedItems;

  const shouldHideBankDetails = transaction.type === 'proforma';

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

  const bankData = bank || transaction?.bank || {};
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  const amountInWords = safeNumberToWords(Math.round(totalAmount));

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
  
  const title =
    transaction.type === 'proforma'
      ? 'PROFORMA INVOICE'
      : isGSTApplicable
      ? 'TAX INVOICE'
      : 'INVOICE';

  // Split items into pages
  const itemPages = splitItemsIntoPages(itemsToRender, ITEMS_PER_PAGE);
  const totalPages = itemPages.length;

  // Generate HTML content for PDF
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
        pageIndex === totalPages - 1 // isLastPage
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
      font-family: Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: ${DARK_TEXT};
      font-size: 9px;
      line-height: 1.2;
    }
    
    .page {
      width: 595pt;
      min-height: 842pt;
      padding: 20px 30px;
      padding-bottom: 50px;
      page-break-after: always;
      position: relative;
    }
    
    .page:last-child {
      page-break-after: auto;
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
      align-items: flex-start;
      width: 70%;
    }
    
    .logo-container {
      margin-right: 15px;
      margin-top: 5px;
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
      margin-bottom: 3px;
    }
    
    .company-details-block {
      border-left: 1px solid ${LIGHT_GRAY};
      padding-left: 10px;
      margin-top: 2px;
    }
    
    .gstin {
      font-size: 9px;
      font-weight: bold;
      margin-bottom: 3px;
    }
    
    .address-text {
      font-size: 9.5px;
      line-height: 1.3;
      color: ${DARK_TEXT};
      margin-bottom: 2px;
    }
    
    .bold-text {
      font-weight: bold;
    }
    
    /* Invoice Info */
    .invoice-info-block {
      width: 18%;
      text-align: right;
      margin-top: 5px;
    }
    
    .tax-invoice-title {
      font-size: 12px;
      font-weight: bold;
      color: ${PRIMARY_BLUE};
      margin-bottom: 8px;
      text-decoration: underline;
    }
    
    .invoice-date-row {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      margin-bottom: 4px;
      align-items: center;
    }
    
    .invoice-label {
      font-size: 9px;
      width: 70px;
      text-align: left;
      font-weight: bold;
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
      justify-content: space-between;
      margin-bottom: 5px;
      border-top: 1px solid ${LIGHT_GRAY};
      border-bottom: 1px solid ${LIGHT_GRAY};
      padding: 8px 0;
    }
    
    .combined-party-block {
      width: 65%;
      padding-right: 10px;
      border-right: 1px solid ${LIGHT_GRAY};
    }
    
    .transaction-details-block {
      width: 20%;
      padding-left: 45px;
    }
    
    .party-header {
      font-size: 10px;
      font-weight: bold;
      color: ${PRIMARY_BLUE};
      padding-bottom: 2px;
      margin-bottom: 5px;
      border-bottom: 1px solid ${LIGHT_GRAY};
    }
    
    /* Items Table */
    .table {
      width: 100%;
      border: 1px solid ${BORDER_COLOR};
      margin-bottom: 8px;
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
      min-height: 25px;
    }
    
    .table-cell-header {
      border-right: 1px solid white;
      padding: 5px 2px;
      text-align: center;
      font-size: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .table-cell {
      border-right: 0.5px solid ${BORDER_COLOR};
      padding: 4px 2px;
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
      padding-left: 8px;
    }
    
    .table-cell-center {
      text-align: center;
    }
    
    /* Totals Section */
    .totals-section {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    
    .left-totals {
      width: 60%;
      padding-right: 10px;
    }
    
    .right-totals {
      width: 40%;
      padding: 8px;
    }
    
    .total-items-row {
      margin-bottom: 10px;
      font-size: 9px;
    }
    
    .amount-words-row {
      margin-top: 15px;
    }
    
    .amount-in-words {
      font-size: 8.5px;
      font-weight: normal;
    }
    
    .totals-row {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      font-size: 9px;
      border-bottom: 0.5px solid ${LIGHT_GRAY};
    }
    
    .totals-row:last-child {
      border-bottom: none;
    }
    
    .total-amount-row {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 10px;
      font-weight: bold;
      border-top: 1px solid ${BORDER_COLOR};
      margin-top: 5px;
    }
    
    /* Bank & Terms Section */
    .bank-terms-section {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      margin-top: 10px;
      border-top: 1px solid ${PRIMARY_BLUE};
      padding-top: 10px;
    }
    
    .bank-details-container {
      width: 65%;
      display: flex;
      flex-direction: row;
      gap: 15px;
    }
    
    .bank-details {
      flex: 1;
    }
    
    .qr-code-container {
      width: 120px;
      text-align: center;
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
      margin-bottom: 3px;
      font-size: 8px;
    }
    
    .bank-label {
      width: 70px;
      font-weight: bold;
      margin-right: 8px;
      flex-shrink: 0;
    }
    
    .small-text {
      font-size: 8px;
    }
    
    /* Signature Section */
    .signature-section {
      width: 20%;
      text-align: center;
      padding-left: 15px;
      border-left: 1px solid ${BORDER_COLOR};
      margin-right:10px;
    }
    
    .signature-placeholder {
      height: 60px;
      width: 100%;
      margin-bottom: 8px;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 1px dashed #ccc;
      background-color: #fafafa;
    }
    
    .signature-text {
      font-size: 7px;
      color: #666;
    }
    
    /* Terms and Conditions */
    .terms-container {
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid ${PRIMARY_BLUE};
    }
    
    .terms-title {
      font-size: 10px;
      font-weight: bold;
      color: ${PRIMARY_BLUE};
      margin-bottom: 8px;
    }
    
    .terms-content {
      padding-left:12px;
      font-size: 8px;
      line-height: 1.4;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    
   
    
    .page-number {
      position: absolute;
      bottom: 5px;
      right: 30px;
      text-align: right;
      font-size: 7px;
      color: #666;
    }
    
    /* Alignment Utilities */
    .align-left {
      text-align: left;
    }
    
    .align-center {
      text-align: center;
    }
    
    .align-right {
      text-align: right;
    }
    
    .mb-2 {
      margin-bottom: 2px;
    }
    
    .mb-3 {
      margin-bottom: 3px;
    }
    
    .mb-5 {
      margin-bottom: 5px;
    }
    
    .mt-2 {
      margin-top: 2px;
    }
    
    .mt-5 {
      margin-top: 5px;
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

    const file = await generatePDF(options);
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