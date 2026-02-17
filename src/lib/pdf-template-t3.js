// src/components/Template_t3.js
import React from 'react';

import { generatePDF } from 'react-native-html-to-pdf';
import {
  prepareTemplate8Data,
  formatCurrency,
  numberToWords,
  formatQuantity,
  formatPhoneNumber,
} from './pdf-utils';
import { capitalizeWords } from './utils';
import { BASE_URL } from '../config';

// Enhanced HTML notes formatting for thermal receipt
const formatNotesHtml = notes => {
  if (!notes) return '';

  try {
    // Simple text formatting for thermal receipts
    return notes
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p>/gi, '')
      .replace(/<\/p>/gi, '\n')
      .replace(/<strong>/gi, '**')
      .replace(/<\/strong>/gi, '**')
      .replace(/<b>/gi, '**')
      .replace(/<\/b>/gi, '**')
      .replace(/<em>/gi, '*')
      .replace(/<\/em>/gi, '*')
      .replace(/<i>/gi, '*')
      .replace(/<\/i>/gi, '*')
      .replace(/<u>/gi, '')
      .replace(/<\/u>/gi, '')
      .replace(/<ul>/gi, '')
      .replace(/<\/ul>/gi, '')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]*>/g, '') // Remove all other HTML tags
      .trim();
  } catch (error) {
    console.error('Error parsing notes HTML:', error);
    return notes.replace(/<[^>]*>/g, ''); // Fallback: remove all HTML tags
  }
};

const Template_t3 = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  client,
  terms = 'Goods once sold will not be taken back. Subject to {city} jurisdiction.',
  serviceNameById = new Map(),
}) => {
   const actualShippingAddress =  transaction?.shippingAddress;
  // Enhanced error handling
  const prepareData = () => {
    try {
      if (!transaction) {
        console.warn('No transaction data provided');
        return getFallbackData();
      }

      const result = prepareTemplate8Data(
        transaction,
        company,
        party,
        actualShippingAddress,
      );

      if (!result || typeof result !== 'object') {
        console.warn('Invalid data from prepareTemplate8Data');
        return getFallbackData();
      }

      return result;
    } catch (error) {
      console.error('Error in prepareTemplate8Data:', error);
      return getFallbackData();
    }
  };

  const getFallbackData = () => {
    return {
      totals: { total: 0, taxable: 0, tax: 0 },
      totalTaxable: 0,
      totalAmount: 0,
      items: [],
      totalItems: 0,
      totalQty: 0,
      itemsBody: [],
      itemsWithGST: [],
      totalCGST: 0,
      totalSGST: 0,
      totalIGST: 0,
      isGSTApplicable: false,
      isInterstate: false,
      showIGST: false,
      showCGSTSGST: false,
      showNoTax: true,
    };
  };

  const preparedData = prepareData();
  const {
    totalTaxable,
    totalAmount,
    itemsWithGST,
    totalCGST,
    totalSGST,
    totalIGST,
    isGSTApplicable,
    showIGST,
    showCGSTSGST,
    showNoTax,
  } = preparedData;

  const bankData = bank || transaction?.bank || {};
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  // Safe data access functions
  const getTransactionValue = (key, defaultValue = '') => {
    try {
      return transaction?.[key] || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  const getCompanyValue = (key, defaultValue = '') => {
    try {
      return company?.[key] || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  const getPartyValue = (key, defaultValue = '') => {
    try {
      return party?.[key] || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  // Enhanced item name mapping
  const getItemName = item => {
    if (!item) return 'Unnamed Item';

    try {
      if (serviceNameById && item.serviceId) {
        const serviceName = serviceNameById.get(item.serviceId);
        if (serviceName) return serviceName;
      }

      return item.name || item.description || 'Unnamed Item';
    } catch (error) {
      console.error('Error getting item name:', error);
      return 'Unnamed Item';
    }
  };

  // Check if shipping address is different from billing address
  const hasDifferentShippingAddress =
    shippingAddress &&
    party &&
    (shippingAddress.address !== party.address ||
      shippingAddress.city !== party.city);

  // Format terms with dynamic city
  const formattedTerms = terms.replace(
    '{city}',
    getCompanyValue('City') || getCompanyValue('addressState') || 'your',
  );

  // Generate table rows for items
  const generateTableRows = () => {
    if (!itemsWithGST || itemsWithGST.length === 0) {
      return '<div class="table-row"><div class="col-item">No items found</div></div>';
    }

    return itemsWithGST
      .map((item, index) => {
        const itemName = getItemName(item);
        return `
        <div class="table-row">
          <div class="col-item">
            <div class="item-name">${capitalizeWords(itemName)}</div>
            ${
              item.itemType !== 'service'
                ? `
              <div class="item-detail">Qty: ${formatQuantity(
                item.quantity || 0,
                item.unit,
              )}</div>
            `
                : ''
            }
            <div class="item-detail">
              ${item.itemType === 'service' ? 'SAC' : 'HSN'}: ${
          item.code || '-'
        }
            </div>
          </div>
          <div class="col-gst">
            ${formatCurrency(item.pricePerUnit || 0)}
          </div>
          <div class="col-gst">
            ${
              isGSTApplicable
                ? `
              ${
                showIGST
                  ? `
                <div class="gst-line">IGST-${item.gstRate}%</div>
              `
                  : ''
              }
              ${
                showCGSTSGST
                  ? `
                <div class="gst-line">CGST-${(item.gstRate || 0) / 2}%</div>
                <div class="gst-line">SGST-${(item.gstRate || 0) / 2}%</div>
              `
                  : ''
              }
              ${
                !showIGST && !showCGSTSGST
                  ? `
                <div class="gst-line">No Tax</div>
              `
                  : ''
              }
            `
                : `
              <div class="gst-line">No Tax</div>
            `
            }
          </div>
          <div class="col-total">
            ${formatCurrency(item.total || 0)}
          </div>
        </div>
      `;
      })
      .join('');
  };

  // Generate HTML content
  const generateHTMLContent = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          ${styles.css}
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Company Header -->
          <div class="header">
            <div class="company-name">${capitalizeWords(
              getCompanyValue('businessName') ||
                getCompanyValue('companyName') ||
                'Company Name',
            )}</div>
            <div class="company-address">${capitalizeWords(
              [
                getCompanyValue('address'),
                getCompanyValue('City'),
                getCompanyValue('addressState'),
              ]
                .filter(Boolean)
                .join(', '),
            )}</div>
            <div class="company-location">
              ${capitalizeWords(getCompanyValue('Country') || 'India')} - ${
      getCompanyValue('Pincode') || ''
    }
            </div>
            <div class="company-phone">
              ${
                getCompanyValue('mobileNumber')
                  ? formatPhoneNumber(String(getCompanyValue('mobileNumber')))
                  : getCompanyValue('Telephone')
                  ? formatPhoneNumber(String(getCompanyValue('Telephone')))
                  : ''
              }
            </div>
            ${
              getCompanyValue('gstin')
                ? `
              <div class="company-gstin">GSTIN: ${getCompanyValue(
                'gstin',
              )}</div>
            `
                : ''
            }
          </div>

          <div class="border-line">========================================================================</div>

          <!-- Invoice Title -->
          <div class="invoice-title">
            ${
              getTransactionValue('type') === 'proforma'
                ? 'PROFORMA INVOICE'
                : isGSTApplicable
                ? 'TAX INVOICE'
                : 'INVOICE'
            }
          </div>

          <div class="border-line">========================================================================</div>

          <!-- Billed To and Invoice Details -->
          <div class="billing-section">
            <div class="billing-container">
              <!-- Left side - Billed To section -->
              <div class="billed-to">
                <div class="section-title">BILLED TO</div>
                <div class="billed-details">
                  <div>${capitalizeWords(getPartyValue('name') || 'N/A')}</div>
                 
                  <div>
                    ${
                      getPartyValue('contactNumber')
                        ? formatPhoneNumber(getPartyValue('contactNumber'))
                        : 'N/A'
                    }
                  </div>
                  <div>${getPartyValue('gstin') || 'N/A'}</div>
                </div>
              </div>

              <!-- Right side - Invoice # and Date -->
              <div class="invoice-details">
                <div class="invoice-detail">
                  <span class="detail-label">INVOICE # :</span>
                  <span class="detail-value">${
                    getTransactionValue('invoiceNumber') || 'N/A'
                  }</span>
                </div>
                <div class="invoice-detail">
                  <span class="detail-label">DATE :</span>
                  <span class="detail-value">${
                    getTransactionValue('date')
                      ? new Date(
                          getTransactionValue('date'),
                        ).toLocaleDateString('en-IN')
                      : 'N/A'
                  }</span>
                </div>
                  
                ${
                  getTransactionValue('poNumber')
                    ? `
                  <div class="invoice-detail">
                    <span class="detail-label">PO # :</span>
                    <span class="detail-value">${getTransactionValue(
                      'poNumber',
                    )}</span>
                  </div>
                `
                    : ''
                }
              </div>
            </div>
          </div>

          <div class="border-line">========================================================================</div>

          <!-- Table Header -->
          <div class="table-header">
            <div class="col-item">Item</div>
            <div class="col-gst">Amount (Rs.)</div>
            <div class="col-gst">GST</div>
            <div class="col-total">Total(Rs.)</div>
          </div>

          <div class="border-line">========================================================================</div>

          <!-- Table Rows -->
          ${generateTableRows()}

          <div class="border-line">========================================================================</div>

          <!-- Totals Section -->
          <div class="totals-section">
            <div class="section-title" style="text-align:center;">TOTAL AMOUNT</div>
            <div class="border-line">========================================================================</div>

            <div class="total-row">
              <span class="total-label">Subtotal:</span>
              <span class="total-value">Rs ${formatCurrency(
                totalTaxable,
              )}</span>
            </div>

            ${
              isGSTApplicable
                ? `
              ${
                showIGST
                  ? `
                <div class="total-row">
                  <span class="total-label">IGST:</span>
                  <span class="total-value">Rs ${formatCurrency(
                    totalIGST,
                  )}</span>
                </div>
              `
                  : ''
              }
              ${
                showCGSTSGST
                  ? `
                <div class="total-row">
                  <span class="total-label">CGST:</span>
                  <span class="total-value">Rs ${formatCurrency(
                    totalCGST,
                  )}</span>
                </div>
                <div class="total-row">
                  <span class="total-label">SGST:</span>
                  <span class="total-value">Rs ${formatCurrency(
                    totalSGST,
                  )}</span>
                </div>
              `
                  : ''
              }
            `
                : ''
            }

            ${
              getTransactionValue('roundOff') &&
              getTransactionValue('roundOff') !== 0
                ? `
              <div class="total-row">
                <span class="total-label">Round Off:</span>
                <span class="total-value">Rs ${formatCurrency(
                  getTransactionValue('roundOff'),
                )}</span>
              </div>
            `
                : ''
            }

            <div class="border-line">========================================================================</div>

            <div class="total-row final-total">
              <span class="total-label">
                ${isGSTApplicable ? 'Total Amount After Tax' : 'Total Amount'}:
              </span>
              <span class="total-value">Rs ${formatCurrency(totalAmount)}</span>
            </div>

            <div class="amount-words">
               ${numberToWords(totalAmount)}
            </div>
          </div>

          <!-- Payment Terms -->
          

          <!-- UPI Payment Section -->
          ${
            bankData && bankData?.upiDetails?.upiId
              ? `
            <div class="upi-section">
              <div class="border-line">========================================================================</div>

              ${
                bankData?.qrCode
                  ? `
                <div class="qr-section">
                  <div class="qr-title">OR Code</div>
                  <div class="qr-container">
                    <img src="${BASE_URL}/${bankData.qrCode}" class="qr-code" />
                  </div>
                </div>
              `
                  : ''
              }

              <!-- UPI Details -->
              <div class="upi-details">
                <div class="upi-detail">
                  <span class="upi-label">UPI ID: </span>
                  <span class="upi-value">${bankData.upiDetails.upiId}</span>
                </div>
                <div class="upi-detail">
                  <span class="upi-label">UPI Name: </span>
                  <span class="upi-value">${bankData.upiDetails.upiName}</span>
                </div>
                ${
                  bankData.upiDetails.upiMobile
                    ? `
                  <div class="upi-detail">
                    <span class="upi-label">UPI Mobile No: </span>
                    <span class="upi-value">${bankData.upiDetails.upiMobile}</span>
                  </div>
                `
                    : ''
                }
              </div>

              <div class="border-line">========================================================================</div>
            </div>
          `
              : ''
          }

          <!-- Bank Details Section (if UPI not available) -->
          ${
            bankData && isBankDetailAvailable && !bankData?.upiDetails?.upiId
              ? `
            <div class="bank-section">
              <div class="border-line">=============================================</div>
              <div class="section-title">Bank Details</div>

              ${
                bankData.bankName
                  ? `
                <div class="bank-detail">
                  <span class="bank-label">Bank Name:</span>
                  <span class="bank-value">${capitalizeWords(
                    bankData.bankName,
                  )}</span>
                </div>
              `
                  : ''
              }

              ${
                bankData?.accountNo
                  ? `
                <div class="bank-detail">
                  <span class="bank-label">Account No:</span>
                  <span class="bank-value">${bankData.accountNo}</span>
                </div>
              `
                  : ''
              }

              ${
                bankData.ifscCode
                  ? `
                <div class="bank-detail">
                  <span class="bank-label">IFSC Code:</span>
                  <span class="bank-value">${bankData.ifscCode.toUpperCase()}</span>
                </div>
              `
                  : ''
              }

              ${
                bankData.branchAddress
                  ? `
                <div class="bank-detail">
                  <span class="bank-label">Branch:</span>
                  <span class="bank-value">${capitalizeWords(
                    bankData.branchAddress,
                  )}</span>
                </div>
              `
                  : ''
              }

             
            </div>
          `
              : ''
          }

        

          <!-- Footer -->
            <div class="border-line">========================================================================</div>
          <div class="footer">
            <div class="company-signature">
              For ${capitalizeWords(
                getCompanyValue('businessName') ||
                  getCompanyValue('companyName') ||
                  'Company Name',
              )}
            </div>
            <div class="computer-generated">
             <div>E. & O.E.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return generateHTMLContent();
};

// CSS Styles optimized for thermal receipt (80mm width)
const styles = {
  css: `
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
    
    body {
      // font-family: 'Courier New', Courier, monospace;
      font-size: 8px;
      color: #000;
      margin: 0 auto; 
      padding-top: 10px;
      line-height: 1.2;
      background: #FFFFFF;
      width: 280px; /* 80mm thermal receipt width */
    }
    .page {
      width: 100%;
      max-width: 280px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 5px;
    }
    .company-name {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 2px;
    }
    .company-address {
      font-size: 7px;
      margin-bottom: 1px;
    }
    .company-location {
      font-size: 7px;
      margin-bottom: 1px;
    }
    .company-phone {
      font-size: 7px;
      margin-bottom: 1px;
    }
    .company-gstin {
      font-size: 7px;
      margin-bottom: 1px;
    }
    .border-line {
      text-align: center;
      margin: 2px 0;
      font-size: 8px;
      letter-spacing: -0.5px;
    }
    .invoice-title {
      text-align: center;
      font-weight: bold;
      font-size: 10px;
      margin: 3px 0;
    }
    .billing-section {
      margin-bottom: 5px;
    }
    .billing-container {
      display: flex;
      justify-content: space-between;
    }
    .billed-to {
      width: 60%;
    }
    .invoice-details {
      width: 40%;
      text-align: right;
    }
    .section-title {
      font-weight: bold;
      font-size: 8px;
      margin-bottom: 2px;
    }
    .billed-details {
      font-size: 7px;
    }
    .billed-details div {
      margin-bottom: 1px;
    }
    .invoice-detail {
      margin-bottom: 2px;
      font-size: 7px;
    }
    .detail-label {
      font-weight: bold;
    }
    .detail-value {
      font-weight: normal;
    }
    .shipping-address {
      margin: 5px 0;
      padding: 3px;
      border: 0.5px solid #ccc;
      font-size: 7px;
    }
    .shipping-details div {
      margin-bottom: 1px;
    }
    .table-header {
      display: flex;
      font-weight: bold;
      margin-top: 4px;
      font-size: 7px;
    }
    .col-item {
      width: 30%;
      text-align: left;
    }
    .col-gst {
      width: 30%;
      text-align: center;
    }
    .col-total {
      width: 20%;
      text-align: right;
    }
    .table-row {
      display: flex;
      font-size: 6px;
      margin: 2px 0;
      align-items: flex-start;
    }
    .item-name {
      font-weight: bold;
      margin-bottom: 1.5px;
    }
    .item-detail {
      font-size: 5px;
      margin-bottom: 1px;
    }
    .gst-line {
      margin-bottom: 1px;
      text-align: center;
    }
    .totals-section {
      margin: 5px 0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
      font-size: 7px;
    }
    .total-label {
      font-weight: normal;
    }
    .total-value {
      font-weight: normal;
    }
    .final-total .total-label,
    .final-total .total-value {
      font-weight: bold;
    }
    .amount-words {
      margin-top: 4px;
      font-size: 6px;
      text-align: left;
    }
    .terms-section {
      margin-top: 5px;
      font-size: 6px;
    }
    .terms-title {
      font-weight: bold;
      margin-bottom: 1px;
    }
    .terms-content {
      font-weight: normal;
    }
    .upi-section {
      margin-top: 8px;
      text-align: right;
    }
    .qr-section {
      margin: 5px 0;
    }
    .qr-title {
      font-size: 8px;
      font-weight: bold;
      margin-bottom: 3px;
    }
    .qr-container {
      background-color: #fff;
      display: inline-block;
    }
    .qr-code {
      width: 70px;
      height: 70px;
      object-fit: contain;
    }
    .upi-details {
      font-size: 6px;
      margin-top: 3px;
    }
    .upi-detail {
      margin-bottom: 1px;
    }
    .upi-label {
      font-weight: bold;
    }
    .upi-value {
      font-weight: normal;
    }
    .bank-section {
      margin-top: 8px;
    }
    .bank-detail {
      display: flex;
      justify-content: space-between;
      margin: 1px 0;
      font-size: 7px;
    }
    .bank-label {
      font-weight: bold;
    }
    .bank-value {
      font-weight: normal;
    }
    .footer {
      margin-top: 4px;
      text-align: center;
    }
    .company-signature {
      font-size: 7px;
      margin-bottom: 3px;
    }
    .computer-generated {
      font-size: 6px;
    }
  `,
};

// Generate PDF function for thermal receipt
export const generatePdfForTemplatet3 = async (
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  client,
  terms,
  serviceNameById = new Map(),
) => {
  try {
    if (!transaction) {
      throw new Error('Transaction is required to generate PDF');
    }

    const HTMLContent = Template_t3({
      transaction,
      company: company || {},
      party: party || {},
      shippingAddress,
      bank,
      client,
      terms,
      serviceNameById,
    });

const options = {
  html: HTMLContent,
  fileName: `receipt_${
    transaction?.invoiceNumber || 'document'
  }_${Date.now()}`,
  directory: 'Documents',
  base64: false,
  // Remove the height property entirely, or set it to a number if needed
  width: 280, // 80mm thermal receipt width
};

    const file = await generatePDF(options);

    if (!file || !file.filePath) {
      throw new Error('PDF generation failed - no file path returned');
    }

    console.log('Thermal receipt PDF generated successfully:', file.filePath);
    return file;
  } catch (error) {
    console.error('Error generating thermal receipt PDF:', error);
    throw new Error(`Thermal receipt PDF generation failed: ${error.message}`);
  }
};

export default Template_t3;
