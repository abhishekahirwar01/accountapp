// Template8PDF.js
import React from 'react';
import { Platform } from 'react-native';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import {
  getBillingAddress,
  getShippingAddress,
  prepareTemplate8Data,
  numberToWords,
  getStateCode,
} from './pdf-utils';
import { capitalizeWords } from './utils';
import {
  formatQuantity,
  formatPhoneNumber,
  formatCurrency,
} from '@/lib/pdf-utils';
import { BASE_URL } from '../config';

export const generatePdfForTemplate8 = async (
  transaction,
  company,
  party,
  shippingAddress,
  bank,
) => {
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

  const bankData = bank;
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  const shouldHideBankDetails = transaction.type === 'proforma';

  // Define column widths based on GST applicability
  const getColWidths = () => {
    if (!isGSTApplicable) {
      return ['5%', '25%', '10%', '10%', '8%', '17%', '25%'];
    } else if (showIGST) {
      return ['5%', '20%', '8%', '13%', '13%', '13%', '7%', '12%', '19%'];
    } else {
      return [
        '5%', // Sr. No.
        '17%', // Name
        '8%', // HSN/SAC
        '8%', // Rate
        '7%', // Qty
        '10%', // Taxable Value
        '7%', // CGST %
        '10%', // CGST Amount
        '7%', // SGST %
        '10%', // SGST Amount
        '11%', // Total
      ];
    }
  };

  const colWidths = getColWidths();
  const totalColumnIndex = !isGSTApplicable ? 6 : showIGST ? 8 : 10;

  // Enhanced CSS Styles for better mobile compatibility
  const styles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Helvetica+Neue:wght@300;400;500;600;700&display=swap');
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
      
      body {
        padding: 15px;
        color: #262626;
        font-size: 9px;
        line-height: 1.2;
        background: white;
      }
      
      .page {
        position: relative;
        min-height: 100vh;
        width: 100%;
      }
      
      .header {
        text-align: center;
        margin-bottom: 8px;
        padding: 0 5px;
      }
      
      .company-name {
        font-size: 18px;
        font-weight: bold;
        color: #232323;
        margin-bottom: 4px;
        text-transform: uppercase;
      }
      
      .title {
        font-size: 16px;
        font-weight: bold;
        color: #0785E5;
        text-transform: uppercase;
        margin-bottom: 8px;
      }
      
      .address-text {
        font-size: 9px;
        color: #3d3d3d;
        margin-bottom: 2px;
        line-height: 1.3;
      }
      
      .bold-text {
        font-weight: bold;
      }
      
      .gray-color {
        color: #262626;
      }
      
      .divider-blue {
        border-bottom: 3px solid #2583C6;
        margin: 8px 0;
        width: 100%;
      }
      
      .divider {
        border-bottom: 2px solid #bfbfbf;
        margin: 8px 0;
        width: 100%;
      }
      
      .two-column-section {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        flex-wrap: wrap;
        gap: 10px;
      }
      
      .left-column {
        width: 35%;
        min-width: 200px;
      }
      
      .middle-column {
        width: 34%;
        min-width: 200px;
        margin-left: 0;
      }
      
      .right-column {
        width: 25%;
        min-width: 150px;
        text-align: right;
      }
      
      .section-header {
        font-size: 11px;
        font-weight: bold;
        margin-bottom: 4px;
        color: #262626;
        text-transform: uppercase;
      }
      
      .detail-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
        align-items: flex-start;
      }
      
      .table-container {
        width: 100%;
        overflow-x: auto;
        margin-bottom: 12px;
      }
      
      .table {
        width: 100%;
        border: 1px solid #bfbfbf;
        border-collapse: collapse;
        table-layout: fixed;
      }
      
      .table-header {
        background-color: #2583C6;
        color: white;
      }
      
      .table-header-cell {
        padding: 6px 4px;
        font-size: 7px;
        border-right: 1px solid white;
        text-align: center;
        font-weight: bold;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      .table-row {
        border-top: 1px solid #bfbfbf;
      }
      
      .table-cell {
        padding: 6px 4px;
        font-size: 7px;
        border-right: 1px solid #bfbfbf;
        vertical-align: top;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      .table-cell-last {
        padding: 6px 4px;
        font-size: 7px;
        vertical-align: top;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      .totals-section {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        flex-wrap: wrap;
        gap: 10px;
      }
      
      .totals-left {
        font-size: 9px;
        min-width: 150px;
      }
      
      .totals-right {
        border: 1px solid #bfbfbf;
        width: 300px;
        max-width: 100%;
      }
      
      .totals-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 6px;
        border-bottom: 1px solid #bfbfbf;
        align-items: center;
      }
      
      .total-amount-row {
        background-color: #E2E2E2;
        padding: 6px;
        display: flex;
        justify-content: space-between;
        font-weight: bold;
        align-items: center;
      }
      
      .small-rs {
        font-size: 8px;
        font-weight: normal;
      }
      
      .payment-section {
        display: flex;
        justify-content: space-between;
        margin: 12px 0;
        flex-wrap: wrap;
        gap: 15px;
      }
      
      .bank-details {
        width: 45%;
        min-width: 200px;
      }
      
      .bank-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
        align-items: flex-start;
      }
      
      .signature-section {
        width: 30%;
        min-width: 150px;
        text-align: right;
      }
      
      .stamp-placeholder {
        height: 50px;
        width: 120px;
        border: 1px dashed #999;
        margin: 6px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: auto;
        margin-right: 4px;
        background: #f9f9f9;
      }
      
      .page-number {
        position: absolute;
        bottom: 10px;
        right: 20px;
        font-size: 8px;
        text-align: right;
        color: #666;
      }
      
      .logo {
        position: absolute;
        right: 10px;
        top: 20px;
        width: 70px;
        height: 70px;
        object-fit: contain;
      }
      
      .text-center {
        text-align: center;
      }
      
      .text-right {
        text-align: right;
      }
      
      .text-left {
        text-align: left;
      }
      
      .notes-section {
        margin-top: 12px;
        padding-top: 8px;
        border-top: 1px solid #2583C6;
        font-size: 8px;
        line-height: 1.4;
      }
      
      .qr-code-container {
        text-align: center;
        margin: 10px 0;
        padding: 5px;
        background: white;
      }
      
      .qr-code-image {
        width: 80px;
        height: 80px;
        object-fit: contain;
        border: 1px solid #ddd;
        padding: 5px;
        background: white;
      }
      
      @media print {
        body {
          padding: 0;
          margin: 0;
        }
        .page {
          page-break-after: always;
          min-height: 99vh;
        }
      }
    </style>
  `;

  // Generate table headers based on GST type
  const generateTableHeaders = () => {
    let headers = `
      <th class="table-header-cell" style="width: ${colWidths[0]}">Sr.No</th>
      <th class="table-header-cell" style="width: ${colWidths[1]}; text-align: left">Name of Product / Service</th>
      <th class="table-header-cell" style="width: ${colWidths[2]}">HSN/SAC</th>
      <th class="table-header-cell" style="width: ${colWidths[3]}">Rate (Rs.)</th>
      <th class="table-header-cell" style="width: ${colWidths[4]}">Qty</th>
      <th class="table-header-cell" style="width: ${colWidths[5]}">Taxable Value (Rs.)</th>
    `;

    if (showIGST) {
      headers += `
        <th class="table-header-cell" style="width: ${colWidths[6]}">IGST%</th>
        <th class="table-header-cell" style="width: ${colWidths[7]}">IGST Amount (Rs.)</th>
      `;
    } else if (showCGSTSGST) {
      headers += `
        <th class="table-header-cell" style="width: ${colWidths[6]}">CGST%</th>
        <th class="table-header-cell" style="width: ${colWidths[7]}">CGST Amount (Rs.)</th>
        <th class="table-header-cell" style="width: ${colWidths[8]}">SGST%</th>
        <th class="table-header-cell" style="width: ${colWidths[9]}">SGST Amount (Rs.)</th>
      `;
    }

    headers += `
      <th class="table-header-cell" style="width: ${colWidths[totalColumnIndex]}">Total (Rs.)</th>
    `;

    return headers;
  };

  // Generate table rows with enhanced error handling
  const generateTableRows = () => {
    if (!itemsWithGST || itemsWithGST.length === 0) {
      return `
        <tr class="table-row">
          <td class="table-cell text-center" colspan="${
            totalColumnIndex + 1
          }" style="padding: 20px;">
            No items found
          </td>
        </tr>
      `;
    }

    return itemsWithGST
      .map((item, index) => {
        const itemName = capitalizeWords(item.name || 'Unnamed Item');
        const hsnCode = item.code || '-';
        const rate = formatCurrency(item.pricePerUnit || 0);
        const quantity =
          item.itemType === 'service'
            ? '-'
            : formatQuantity(item.quantity || 0, item.unit);
        const taxableValue = formatCurrency(item.taxableValue || 0);
        const total = formatCurrency(item.total || 0);

        let row = `
        <tr class="table-row">
          <td class="table-cell text-center" style="width: ${colWidths[0]}">${
          index + 1
        }</td>
          <td class="table-cell text-left" style="width: ${
            colWidths[1]
          }">${itemName}</td>
          <td class="table-cell text-center" style="width: ${
            colWidths[2]
          }">${hsnCode}</td>
          <td class="table-cell text-center" style="width: ${
            colWidths[3]
          }">${rate}</td>
          <td class="table-cell text-center" style="width: ${
            colWidths[4]
          }">${quantity}</td>
          <td class="table-cell text-center" style="width: ${
            colWidths[5]
          }">${taxableValue}</td>
      `;

        if (showIGST) {
          const igstRate = (item.gstRate || 0).toFixed(2);
          const igstAmount = formatCurrency(item.igst || 0);
          row += `
          <td class="table-cell text-center" style="width: ${colWidths[6]}">${igstRate}</td>
          <td class="table-cell text-center" style="width: ${colWidths[7]}">${igstAmount}</td>
        `;
        } else if (showCGSTSGST) {
          const halfRate = ((item.gstRate || 0) / 2).toFixed(2);
          const cgstAmount = formatCurrency(item.cgst || 0);
          const sgstAmount = formatCurrency(item.sgst || 0);
          row += `
          <td class="table-cell text-center" style="width: ${colWidths[6]}">${halfRate}</td>
          <td class="table-cell text-center" style="width: ${colWidths[7]}">${cgstAmount}</td>
          <td class="table-cell text-center" style="width: ${colWidths[8]}">${halfRate}</td>
          <td class="table-cell text-center" style="width: ${colWidths[9]}">${sgstAmount}</td>
        `;
        }

        row += `
        <td class="table-cell-last text-center" style="width: ${colWidths[totalColumnIndex]}">${total}</td>
        </tr>
      `;

        return row;
      })
      .join('');
  };

  // Generate GST breakdown
  const generateGSTBreakdown = () => {
    if (!isGSTApplicable) return '';

    if (showIGST) {
      return `
        <div class="totals-row">
          <span class="bold-text">IGST</span>
          <span><span class="small-rs">Rs</span> ${formatCurrency(
            totalIGST || 0,
          )}</span>
        </div>
      `;
    } else if (showCGSTSGST) {
      return `
        <div class="totals-row">
          <span class="bold-text">CGST</span>
          <span><span class="small-rs">Rs</span> ${formatCurrency(
            totalCGST || 0,
          )}</span>
        </div>
        <div class="totals-row">
          <span class="bold-text">SGST</span>
          <span><span class="small-rs">Rs</span> ${formatCurrency(
            totalSGST || 0,
          )}</span>
        </div>
      `;
    }
    return '';
  };

  // Generate bank details with enhanced formatting
  const generateBankDetails = () => {
    if (!bankData || !isBankDetailAvailable || shouldHideBankDetails) {
      return '<div class="address-text">Bank details not provided</div>';
    }

    const bankDetails = [];

    if (bankData.bankName) {
      bankDetails.push(`
        <div class="bank-row">
          <span class="bold-text">Name:</span>
          <span>${capitalizeWords(bankData.bankName)}</span>
        </div>
      `);
    }

    if (bankData.ifscCode) {
      bankDetails.push(`
        <div class="bank-row">
          <span class="bold-text">IFSC:</span>
          <span>${bankData.ifscCode.toUpperCase()}</span>
        </div>
      `);
    }

    if (bankData.accountNo) {
      bankDetails.push(`
        <div class="bank-row">
          <span class="bold-text">Acc. No:</span>
          <span>${bankData.accountNo}</span>
        </div>
      `);
    }

    if (bankData.branchAddress) {
      bankDetails.push(`
        <div class="bank-row">
          <span class="bold-text">Branch:</span>
          <span>${capitalizeWords(bankData.branchAddress)}</span>
        </div>
      `);
    }

    const upiDetails = bankData.upiDetails;
    if (upiDetails?.upiId) {
      bankDetails.push(`
        <div class="bank-row">
          <span class="bold-text">UPI ID:</span>
          <span>${upiDetails.upiId}</span>
        </div>
      `);
    }

    if (upiDetails?.upiName) {
      bankDetails.push(`
        <div class="bank-row">
          <span class="bold-text">UPI Name:</span>
          <span>${capitalizeWords(upiDetails.upiName)}</span>
        </div>
      `);
    }

    if (upiDetails?.upiMobile) {
      bankDetails.push(`
        <div class="bank-row">
          <span class="bold-text">UPI Mobile:</span>
          <span>${formatPhoneNumber(upiDetails.upiMobile)}</span>
        </div>
      `);
    }

    return bankDetails.join('');
  };

  // Generate QR code section if available
  const generateQRCode = () => {
    if (!bankData || shouldHideBankDetails || !bankData.qrCode) {
      return '';
    }

    return `
      <div class="qr-code-container">
        <div class="bold-text" style="margin-bottom: 5px; font-size: 9px;">QR Code</div>
        <img src="${BASE_URL}/${bankData.qrCode}" class="qr-code-image" />
      </div>
    `;
  };

  // Generate notes section
  const generateNotes = () => {
    if (!transaction?.notes) return '';

    // Simple HTML to plain text conversion for notes
    const cleanNotes = transaction.notes
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .trim();

    if (!cleanNotes) return '';

    return `
      <div class="notes-section">
        <div class="bold-text" style="margin-bottom: 4px; font-size: 10px;">Terms & Conditions:</div>
        <div style="font-size: 8px; line-height: 1.4;">${cleanNotes}</div>
      </div>
    `;
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${
        transaction.type === 'proforma' ? 'Proforma Invoice' : 'Invoice'
      } - ${transaction.invoiceNumber || 'Document'}</title>
      ${styles}
    </head>
    <body>
      <div class="page">
        ${
          logoSrc
            ? `<img src="${logoSrc}" class="logo" alt="Company Logo" />`
            : ''
        }
        
        <!-- Header Section -->
        <div class="header">
          <div class="company-name">
            ${
              transaction.type === 'proforma'
                ? 'PROFORMA INVOICE'
                : isGSTApplicable
                ? 'TAX INVOICE'
                : 'INVOICE'
            }
          </div>
          <div class="title">
            ${capitalizeWords(
              company?.businessName || company?.companyName || 'Company Name',
            )}
          </div>
          <div>
            ${
              company?.gstin
                ? `
              <div class="address-text">
                <span class="bold-text">GSTIN </span>
                <span>${company.gstin}</span>
              </div>
            `
                : ''
            }
            <div class="address-text">${capitalizeWords(
              company?.address || 'Address Line 1',
            )}</div>
            <div class="address-text">${capitalizeWords(
              company?.City || 'City',
            )}</div>
            <div class="address-text">
              <span class="bold-text">Phone: </span>
              <span>${
                company?.mobileNumber || company?.Telephone
                  ? formatPhoneNumber(
                      String(company?.mobileNumber || company?.Telephone),
                    )
                  : '-'
              }</span>
            </div>
            <div class="address-text">
              <span class="bold-text">State: </span>
              <span>${capitalizeWords(company?.addressState || 'State')} - ${
    company?.Pincode || 'Pincode'
  }</span>
            </div>
          </div>
        </div>

        <div class="divider-blue"></div>

        <!-- Two Column Section -->
        <div class="two-column-section">
          <!-- Left Column - Buyer Details -->
          <div class="left-column">
            <div class="section-header">Details of Buyer | Billed to :</div>
            <div class="company-name" style="font-size: 10px;">${capitalizeWords(
              party?.name || 'Jay Enterprises',
            )}</div>
            <div class="address-text">${capitalizeWords(
              getBillingAddress(party),
            )}</div>
            <div class="address-text">
              <span class="bold-text">GSTIN: </span>
              <span>${party?.gstin || '-'}</span>
            </div>
            <div class="address-text">
              <span class="bold-text">PAN: </span>
              <span>${party?.pan || '-'}</span>
            </div>
            ${
              party?.contactNumber
                ? `
              <div class="address-text">
                <span class="bold-text">Phone: </span>
                <span>${formatPhoneNumber(party.contactNumber)}</span>
              </div>
            `
                : ''
            }
            <div class="address-text">
              <span class="bold-text">Place of Supply: </span>
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

          <!-- Middle Column - Shipping Details -->
          <div class="middle-column">
            <div class="section-header">Details of Consigned | Shipped to :</div>
            <div class="company-name" style="font-size: 10px;">${capitalizeWords(
              shippingAddress?.label || party?.name || 'N/A',
            )}</div>
            <div class="address-text">${capitalizeWords(
              getShippingAddress(shippingAddress, getBillingAddress(party)),
            )}</div>
            ${
              company?.Country
                ? `
              <div class="address-text">
                <span class="bold-text">Country: </span>
                <span>${company.Country}</span>
              </div>
            `
                : ''
            }
            ${
              party?.contactNumber
                ? `
              <div class="address-text">
                <span class="bold-text">Phone: </span>
                <span>${formatPhoneNumber(party.contactNumber)}</span>
              </div>
            `
                : ''
            }
            <div class="address-text">
              <span class="bold-text">GSTIN: </span>
              <span>${party?.gstin || '-'}</span>
            </div>
            <div class="address-text">
              <span class="bold-text">State: </span>
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

          <!-- Right Column - Invoice Details -->
          <div class="right-column">
            <div class="detail-row">
              <span class="bold-text">Invoice #:</span>
              <span>${transaction?.invoiceNumber?.toString() || '2'}</span>
            </div>
            <div class="detail-row">
              <span class="bold-text">Invoice Date:</span>
              <span>${
                transaction?.date
                  ? new Date(transaction.date).toLocaleDateString('en-GB')
                  : '14-Oct-2022'
              }</span>
            </div>
            <div class="detail-row">
              <span>P.O. No.:</span>
              <span>${transaction?.poNumber || '-'}</span>
            </div>
            <div class="detail-row">
              <span>P.O. Date:</span>
              <span>${
                transaction?.poDate
                  ? new Date(transaction.poDate).toLocaleDateString('en-GB')
                  : '-'
              }</span>
            </div>
            ${
              isGSTApplicable
                ? `
              <div class="detail-row">
                <span>E-Way No.:</span>
                <span>${transaction?.ewayNumber || '-'}</span>
              </div>
            `
                : ''
            }
          </div>
        </div>

        <!-- Items Table -->
        <div class="table-container">
          <table class="table">
            <thead class="table-header">
              <tr>
                ${generateTableHeaders()}
              </tr>
            </thead>
            <tbody>
              ${generateTableRows()}
            </tbody>
          </table>
        </div>

        <div class="divider"></div>

        <!-- Totals Section -->
        <div class="totals-section">
          <div class="totals-left">
            <div class="address-text">Total Items / Qty : ${totalItems} / ${totalQty}</div>
          </div>
          <div class="totals-right">
            <div class="totals-row">
              <span class="bold-text">Taxable Amount</span>
              <span><span class="small-rs">Rs</span> ${formatCurrency(
                totalTaxable,
              )}</span>
            </div>
            ${generateGSTBreakdown()}
            <div class="total-amount-row">
              <span class="bold-text">Total Amount</span>
              <span class="bold-text"><span class="small-rs">Rs.</span> ${formatCurrency(
                totalAmount,
              )}</span>
            </div>
          </div>
        </div>

        <!-- Total in words -->
        <div style="margin-top: 8px;">
          <span class="bold-text">Total in words : </span>
          <span>${numberToWords(totalAmount)}</span>
        </div>

        <div class="divider"></div>

        <!-- Payment and Signature Section -->
        ${
          !shouldHideBankDetails
            ? `
          <div class="payment-section">
            <!-- Bank Details -->
            <div class="bank-details">
              <div class="bold-text">Bank Details:</div>
              ${generateBankDetails()}
            </div>

            <!-- QR Code -->
            ${generateQRCode()}

            <!-- Signature Section -->
            <div class="signature-section">
              <div class="bold-text">For ${
                company?.businessName || company?.companyName || 'Company Name'
              }</div>
              <div class="stamp-placeholder">
                Stamp / Signature
              </div>
              <div style="font-size: 7px; margin-top: 3px; text-align: center; margin-right: 10px;">
                AUTHORISED SIGNATORY
              </div>
            </div>
          </div>
        `
            : ''
        }

        <!-- Terms and Conditions -->
        ${generateNotes()}

        <!-- Page Number -->
        <div class="page-number">
          Page 1 of 1
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const options = {
      html: htmlContent,
      fileName: `invoice_${
        transaction.invoiceNumber || 'document'
      }_${Date.now()}`,
      directory: 'Documents',
      height: 842, // A4 height in points
      width: 595, // A4 width in points
      padding: 10,
      base64: false,
    };

    console.log('Generating PDF with options:', {
      fileName: options.fileName,
      itemsCount: itemsWithGST?.length,
    });

    const file = await RNHTMLtoPDF.convert(options);

    if (!file.filePath) {
      throw new Error('PDF generation failed - no file path returned');
    }

    console.log('PDF generated successfully:', file.filePath);
    return file.filePath;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(
      `Failed to generate PDF: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
};

// React Component for PDF generation
export const Template8PDF = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  onPdfGenerated,
  onError,
}) => {
  const generatePDF = async () => {
    try {
      const filePath = await generatePdfForTemplate8(
        transaction,
        company,
        party,
        shippingAddress,
        bank,
      );

      if (onPdfGenerated) {
        onPdfGenerated(filePath);
      }

      return filePath;
    } catch (error) {
      console.error('PDF generation failed:', error);

      if (onError) {
        onError(error);
      }

      throw error;
    }
  };

  // This component doesn't render anything visible
  // It's used as a utility component for PDF generation
  return null;
};

// Enhanced hook for using template 8 PDF
export const useTemplate8PDF = () => {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState(null);

  const generatePDF = async (
    transaction,
    company,
    party,
    shippingAddress,
    bank,
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      const filePath = await generatePdfForTemplate8(
        transaction,
        company,
        party,
        shippingAddress,
        bank,
      );

      setIsGenerating(false);
      return filePath;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'PDF generation failed';
      setError(errorMessage);
      setIsGenerating(false);
      throw err;
    }
  };

  const resetError = () => setError(null);

  return {
    generatePDF,
    isGenerating,
    error,
    resetError,
  };
};

export default generatePdfForTemplate8;
