// template17.js - Tax Invoice with A4 size, repeating header on every page
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

// --- Constants ---
const PRIMARY_BLUE = '#0066cc';
const LIGHT_BLUE = '#e6f2ff';
const TABLE_ROW_ALT = '#f0f8ff';
const DARK_TEXT = '#000000';
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN = 15;
const PAGE_MARGIN_BOTTOM = 30;
const ITEMS_PER_PAGE = 38;

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

// --- Generate Header Function ---
const generateHeaderContent = (transaction, company, party, actualShippingAddress, isGSTApplicable) => {
  const companyName = company?.businessName || company?.companyName || '-';
  const partyAddress = getBillingAddress(party);
  const shippingAddressString = getShippingAddress(actualShippingAddress, partyAddress);

  return `
    <div class="page-header">
      <div class="header-title">${
        transaction.type === 'proforma' ? 'PROFORMA INVOICE' : isGSTApplicable ? 'TAX INVOICE' : 'INVOICE'
      }</div>
      
      <table class="header-table">
        <tr>
          <td class="company-col">
            <div class="company-name">${capitalizeWords(companyName)}</div>
            ${company?.address ? `<div class="company-line">${company.address}</div>` : ''}
            <div class="company-line">
              ${company?.City ? capitalizeWords(company.City) + ', ' : ''}${
                company?.addressState ? capitalizeWords(company.addressState) + ', ' : ''
              }${company?.Pincode || ''}
            </div>
            ${company?.Country ? `<div class="company-line">${capitalizeWords(company.Country)}</div>` : ''}
            ${company?.gstin ? `<div class="company-line"><span class="bold">GSTIN:</span> ${company.gstin}</div>` : ''}
            <div class="company-line">
              <span class="bold">Phone:</span> ${
                company?.mobileNumber
                  ? safeFormatPhoneNumber(company.mobileNumber)
                  : company?.Telephone ? safeFormatPhoneNumber(company.Telephone) : '-'
              }
            </div>
            ${company?.email ? `<div class="company-line"><span class="bold">Email:</span> ${company.email}</div>` : ''}
          </td>
          <td class="invoice-col">
            <table class="invoice-grid">
              <tr>
                <td class="invoice-cell">
                  <div class="invoice-label">Invoice No.:</div>
                  <div class="invoice-value">${transaction?.invoiceNumber?.toString() || '-'}</div>
                </td>
                <td class="invoice-cell">
                  <div class="invoice-label">Invoice Date:</div>
                  <div class="invoice-value">${formatDateSafe(transaction?.date)}</div>
                </td>
              </tr>
              <tr>
                <td class="invoice-cell">
                  <div class="invoice-label">P.O. No.:</div>
                  <div class="invoice-value">${transaction?.poNumber || '-'}</div>
                </td>
                <td class="invoice-cell">
                  <div class="invoice-label">P.O. Date:</div>
                  <div class="invoice-value">${formatDateSafe(transaction?.poDate)}</div>
                </td>
              </tr>
              <tr>
                <td class="invoice-cell">
                  <div class="invoice-label">Due Date:</div>
                  <div class="invoice-value">${formatDateSafe(transaction?.dueDate)}</div>
                </td>
                <td class="invoice-cell">
                  <div class="invoice-label">E-Way No.:</div>
                  <div class="invoice-value">${transaction?.ewayNumber || '-'}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <table class="party-table">
        <tr>
          <td class="party-col">
            <div class="party-heading">Details of Buyer | Billed to:</div>
            <div class="party-name">${capitalizeWords(party?.name || '-')}</div>
            <div class="party-line">${capitalizeWords(partyAddress || '-')}</div>
            ${party?.gstin ? `<div class="party-line"><span class="bold">GSTIN:</span> ${party.gstin}</div>` : ''}
            ${party?.pan ? `<div class="party-line"><span class="bold">PAN:</span> ${party.pan}</div>` : ''}
            <div class="party-line">
              <span class="bold">Phone:</span> ${party?.contactNumber ? safeFormatPhoneNumber(party.contactNumber) : '-'}
            </div>
            <div class="party-line">
              <span class="bold">Place of Supply:</span> 
              ${
                actualShippingAddress?.state
                  ? `${actualShippingAddress.state} (${getStateCode(actualShippingAddress.state) || '-'})`
                  : party?.state ? `${party.state} (${getStateCode(party.state) || '-'})` : '-'
              }
            </div>
          </td>
          <td class="party-col party-col-right">
            <div class="party-heading">Details of Consignee | Shipped to:</div>
            <div class="party-name">${capitalizeWords(actualShippingAddress?.label || party?.name || '-')}</div>
            <div class="party-line">${capitalizeWords(shippingAddressString || '-')}</div>
            ${company?.Country ? `<div class="party-line"><span class="bold">Country:</span> ${company.Country}</div>` : ''}
            <div class="party-line">
              <span class="bold">Phone:</span> ${
                actualShippingAddress?.contactNumber
                  ? safeFormatPhoneNumber(actualShippingAddress.contactNumber)
                  : party?.contactNumber ? safeFormatPhoneNumber(party.contactNumber) : '-'
              }
            </div>
            ${party?.gstin ? `<div class="party-line"><span class="bold">GSTIN:</span> ${party.gstin}</div>` : ''}
            <div class="party-line">
              <span class="bold">State:</span> 
              ${
                actualShippingAddress?.state
                  ? `${actualShippingAddress.state} (${getStateCode(actualShippingAddress.state) || '-'})`
                  : party?.state ? `${party.state} (${getStateCode(party.state) || '-'})` : '-'
              }
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
};

const generateTableHeader = (showIGST, showCGSTSGST) => {
  return `
    <tr class="table-header-row">
      <th style="width: 35px;">Sr.No.</th>
      <th style="width: 150px;">Name of Product / Service</th>
      <th style="width: 65px;">HSN/SAC</th>
      <th style="width: 40px;">Qty</th>
      <th style="width: 50px;">Unit</th>
      <th style="width: 70px;">Rate (Rs.)</th>
      <th style="width: 85px;">Taxable Value (Rs.)</th>
      ${
        showIGST
          ? `<th style="width: 40px;">IGST %</th><th style="width: 70px;">Amount (Rs.)</th>`
          : showCGSTSGST
          ? `<th style="width: 40px;">CGST %</th><th style="width: 60px;">Amount (Rs.)</th><th style="width: 40px;">SGST %</th><th style="width: 60px;">Amount (Rs.)</th>`
          : ''
      }
      <th style="width: 75px;">Total (Rs.)</th>
    </tr>
  `;
};

// --- Main Component ---
const Template17 = ({ transaction, company, party, shippingAddress, bank }) => {
  const actualShippingAddress = shippingAddress || transaction?.shippingAddress;
  const preparedData = prepareTemplate8Data(transaction, company, party, actualShippingAddress);

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

  const typedItems = preparedData.itemsWithGST || allItems;
  const shouldHideBankDetails = transaction.type === 'proforma';
  const bankData = bank || transaction?.bank || {};
  const totalAmountRounded = Math.round(totalAmount);
  const amountInWords = safeNumberToWords(totalAmountRounded);
  const isBankDetailAvailable =
    bankData?.bankName || bankData?.ifscCode || bankData?.branchAddress || 
    bankData?.accountNo || bankData?.upiDetails?.upiId;

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

  const itemPages = [];
  for (let i = 0; i < typedItems.length; i += ITEMS_PER_PAGE) {
    itemPages.push(typedItems.slice(i, i + ITEMS_PER_PAGE));
  }

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
          .page { page-break-after: always; }
          .page:last-child { page-break-after: auto; }
          .page-header { margin-bottom: 10px; }
          .header-title { text-align: center; padding: 5px; font-size: 14px; font-weight: bold; letter-spacing: 1px; margin-bottom: 5px; }
          .header-table { width: 100%; border-collapse: collapse; border: 1px solid ${PRIMARY_BLUE}; margin-bottom: 0; }
          .company-col { width: 60%; padding: 8px 10px; vertical-align: top; border-right: 1px solid ${PRIMARY_BLUE}; }
          .invoice-col { width: 40%; padding: 0; vertical-align: top; }
          .company-name { font-size: 12px; font-weight: bold; margin-bottom: 2px; }
          .company-line { font-size: 7.5px; margin-bottom: 1px; line-height: 1.2; }
          .invoice-grid { width: 100%; border-collapse: collapse; }
          .invoice-cell { width: 50%; padding: 4px 6px; font-size: 7.5px; border: 1px solid ${PRIMARY_BLUE}; vertical-align: top; }
          .invoice-label { font-weight: bold; margin-bottom: 1px; }
          .invoice-value { font-size: 8px; }
          .party-table { width: 100%; border-collapse: collapse; border: 1px solid ${PRIMARY_BLUE}; border-top: none; margin-bottom: 10px; }
          .party-col { width: 50%; padding: 8px 10px; vertical-align: top; }
          .party-col-right { border-left: 2px solid ${PRIMARY_BLUE}; }
          .party-heading { font-size: 8px; font-weight: bold; margin-bottom: 3px; color: ${PRIMARY_BLUE}; }
          .party-name { font-size: 9px; font-weight: bold; margin-bottom: 2px; }
          .party-line { font-size: 7.5px; margin-bottom: 1px; line-height: 1.2; }
          .items-table { width: 100%; border-collapse: collapse;  }
          .items-table .table-header-row { background-color: ${LIGHT_BLUE}; }
          .items-table th { background-color: ${LIGHT_BLUE}; color: ${DARK_TEXT}; font-weight: bold; padding: 6px 4px; text-align: center; font-size: 7.5px; border: 1px solid ${PRIMARY_BLUE}; line-height: 1.2; }
          .items-table td { padding: 5px 4px; text-align: center; font-size: 8px; border: 1px solid ${PRIMARY_BLUE}; vertical-align: middle; }
          .items-table tbody tr:nth-child(even) { background-color: ${TABLE_ROW_ALT}; }
          .items-table tbody tr:nth-child(odd) { background-color: white; }
          .items-table td.left { text-align: left; padding-left: 6px; }
          .items-table td.right { text-align: right; padding-right: 6px; }
          .footer-total-row td { font-weight: bold; border: 1px solid ${PRIMARY_BLUE}; padding: 6px 4px; font-size: 8px; color: ${DARK_TEXT}; background-color: white; }
          .amount-words {  padding: 4px; font-size: 8px; }
          .tax-summary {   }
          .tax-summary table { width: 100%; border-collapse: collapse; }
          .tax-summary th { background-color: ${LIGHT_BLUE}; padding: 4px; font-size: 7.5px; border: 1px solid ${PRIMARY_BLUE};  border-bottom: none; font-weight: bold; }
          .tax-summary td { padding: 3px 4px; font-size: 7.5px; border: 1px solid ${PRIMARY_BLUE}; text-align: right; }
          .bank-sign-section { display: table; width: 100%; border: 1px solid ${PRIMARY_BLUE}; border-top:none;   min-height: 100px; }
          .bank-col-section { display: table-cell; width: 60%; padding: 8px 10px; vertical-align: top;  border-right: 1px solid ${PRIMARY_BLUE}; }
          .sign-col { display: table-cell; width: 40%; padding: 8px 10px; vertical-align: top; text-align: right; }
          .section-heading { font-size: 8px; font-weight: bold; margin-bottom: 4px; }
          .bank-line { font-size: 7.5px; margin-bottom: 2px; }
          .signature-line { margin-top: 50px; padding-top: 5px; border-top: 1px solid #000; font-size: 7.5px; display: inline-block; width: 120px; text-align: center; }
          .terms-section { padding: 8px 15px; border: 1px solid ${PRIMARY_BLUE};  font-size: 7.5px; line-height: 1.3; margin-bottom: 20px; }
          .bold { font-weight: bold; }
          .keep-together { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          ${itemPages.map((pageItems, pageIndex) => `
            <div class="page">
              ${generateHeaderContent(transaction, company, party, actualShippingAddress, isGSTApplicable)}
              <table class="items-table">
                <thead>${generateTableHeader(showIGST, showCGSTSGST)}</thead>
                <tbody>
                  ${pageItems.map((item, index) => {
                    const globalIndex = pageIndex * ITEMS_PER_PAGE + index;
                    return `
                    <tr>
                      <td>${globalIndex + 1}</td>
                      <td class="left">${item.name}</td>
                      <td>${item.code || '-'}</td>
                      <td>${item.itemType === 'service' ? '-' : formatQuantity(item.quantity || 0)}</td>
                      <td>${item.unit || 'Piece'}</td>
                      <td class="center">${formatCurrency(item.pricePerUnit || 0)}</td>
                      <td class="center">${formatCurrency(item.taxableValue || 0)}</td>
                      ${showIGST ? `
                        <td>${(item.gstRate || 0).toFixed(0)}</td>
                        <td class="center">${formatCurrency(item.igst || 0)}</td>
                      ` : showCGSTSGST ? `
                        <td>${((item.gstRate || 0) / 2).toFixed(0)}</td>
                        <td class="center">${formatCurrency(item.cgst || 0)}</td>
                        <td>${((item.gstRate || 0) / 2).toFixed(0)}</td>
                        <td class="center">${formatCurrency(item.sgst || 0)}</td>
                      ` : ''}
                      <td class="center bold">${formatCurrency(item.total || 0)}</td>
                    </tr>`;
                  }).join('')}
                  ${pageIndex === itemPages.length - 1 ? `
                    <tr class="footer-total-row">
                      <td></td>
                      <td style="text-align: center; padding-left: 8px;">Total</td>
                      <td></td>
                      <td>${totalQty}</td>
                      <td></td>
                      <td></td>
                      <td style="text-align: center;">${formatCurrency(totalTaxable)}</td>
                      ${showIGST ? `
                        <td></td>
                        <td style="text-align: center;">${formatCurrency(totalIGST)}</td>
                      ` : showCGSTSGST ? `
                        <td></td>
                        <td style="text-align: center;">${formatCurrency(totalCGST)}</td>
                        <td></td>
                        <td style="text-align: center;">${formatCurrency(totalSGST)}</td>
                      ` : ''}
                      <td style="text-align: center;">${formatCurrency(totalAmount)}</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
              ${pageIndex === itemPages.length - 1 ? `
                <div class="amount-words keep-together">
                  <span class="bold">Total Amount (in words):</span> ${amountInWords}
                </div>
                ${isGSTApplicable && taxSummaryArray.length > 0 ? `
                  <div class="tax-summary keep-together">
                    <table>
                      <thead>
                        <tr>
                          <th style="width: 80px;">HSN/SAC</th>
                          <th style="width: 100px;">Taxable Value (Rs.)</th>
                          <th style="width: 50px;">Rate %</th>
                          ${showIGST ? `
                            <th style="width: 100px;">IGST (Rs.)</th>
                            <th style="width: 100px;">Total(Rs.)</th>
                          ` : `
                            <th style="width: 85px;">CGST(Rs.)</th>
                            <th style="width: 85px;">SGST(Rs.)</th>
                            <th style="width: 85px;">Total(Rs.)</th>
                          `}
                        </tr>
                      </thead>
                      <tbody>
                        ${taxSummaryArray.map(summary => `
                          <tr>
                            <td style="text-align: center;">${summary.hsn}</td>
                            <td style="text-align: center;">${formatCurrency(summary.taxableValue)}</td>
                            <td style="text-align: center;">${summary.rate.toFixed(2)}</td>
                            ${showIGST ? `
                              <td style="text-align: center;">${formatCurrency(summary.igst)}</td>
                              <td style="text-align: center;">${formatCurrency(summary.total)}</td>
                            ` : `
                              <td style="text-align: center;">${formatCurrency(summary.cgst)}</td>
                              <td style="text-align: center;">${formatCurrency(summary.sgst)}</td>
                              <td style="text-align: center;">${formatCurrency(summary.total)}</td>
                            `}
                          </tr>
                        `).join('')}
                        <tr style="background-color: ${LIGHT_BLUE}; font-weight: bold;">
                          <td style="text-align:center;">Total</td>
                          <td style="text-align: center;">${formatCurrency(totalTaxable)}</td>
                          <td></td>
                          ${showIGST ? `
                            <td style="text-align: center;">${formatCurrency(totalIGST)}</td>
                            <td style="text-align: center;">${formatCurrency(totalIGST)}</td>
                          ` : `
                            <td style="text-align: center;">${formatCurrency(totalCGST)}</td>
                            <td style="text-align: center;">${formatCurrency(totalSGST)}</td>
                            <td style="text-align: center;">${formatCurrency(totalCGST + totalSGST)}</td>
                          `}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ` : ''}
                <div class="bank-sign-section keep-together">
                  <div class="bank-col-section">
                    ${!shouldHideBankDetails && isBankDetailAvailable ? `
                      <div class="section-heading">Bank Details:</div>
                      ${bankData?.bankName ? `<div class="bank-line"><span class="bold">Bank Name:</span> ${capitalizeWords(bankData.bankName)}</div>` : ''}
                      ${bankData?.accountNo ? `<div class="bank-line"><span class="bold">Account No:</span> ${bankData.accountNo}</div>` : ''}
                      ${bankData?.ifscCode ? `<div class="bank-line"><span class="bold">IFSC Code:</span> ${bankData.ifscCode}</div>` : ''}
                      ${bankData?.branchAddress ? `<div class="bank-line"><span class="bold">Branch:</span> ${bankData.branchAddress}</div>` : ''}
                      ${bankData?.upiDetails?.upiId ? `<div class="bank-line"><span class="bold">UPI ID:</span> ${bankData.upiDetails.upiId}</div>` : ''}
                      ${bankData?.upiDetails?.upiName ? `<div class="bank-line"><span class="bold">UPI Name:</span> ${bankData.upiDetails.upiName}</div>` : ''}
                      ${bankData?.upiDetails?.upiMobile ? `<div class="bank-line"><span class="bold">UPI Mobile:</span> ${bankData.upiDetails.upiMobile}</div>` : ''}
                    ` : ''}
                  </div>
                  <div class="sign-col">
                    <div class="section-heading">For ${companyName}</div>
                    <div class="signature-line">Authorised Signatory</div>
                  </div>
                </div>
                ${transaction?.notes ? `
                  <div class="terms-section keep-together">
                    <div style="margin-top: 3px;">${renderNotesHTML(transaction.notes)}</div>
                  </div>
                ` : ''}
              ` : ''}
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;
  };

  return generateHTML();
};

// --- PDF Generation ---
export const generatePdfForTemplate17 = async (transaction, company, party, serviceNameById, shippingAddress, bank) => {
  try {
    const htmlContent = Template17({ transaction, company, party, shippingAddress, bank });
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