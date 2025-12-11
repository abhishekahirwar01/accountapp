// pdf-templateA5.js
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
  getHsnSummary,
} from './pdf-utils';
import { BASE_URL } from '../config';
import { capitalizeWords } from './utils';

// --- Main Template Component ---
const TemplateA5_4 = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  client,
}) => {
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
  } = prepareTemplate8Data(transaction, company, party, shippingAddress);

  const logoSrc = company?.logo ? `${BASE_URL}${company.logo}` : null;
  
  const shouldHideBankDetails = transaction.type === 'proforma';
  const bankData = bank || {};

  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.qrCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  // Column widths based on tax type
  const getColWidths = () => {
    if (showIGST) {
      return ['4%', '30%', '10%', '8%', '10%', '15%', '20%', '12%'];
    } else if (showCGSTSGST) {
      return ['4%', '30%', '10%', '8%', '10%', '12%', '12%', '12%', '15%'];
    } else {
      return ['10%', '25%', '10%', '10%', '10%', '15%', '20%'];
    }
  };

  const colWidths = getColWidths();
  const totalColumnIndex = showIGST ? 7 : showCGSTSGST ? 8 : 6;

  // Helper functions
  const safeFormatPhoneNumber = phoneNumber => {
    try {
      if (!phoneNumber) return '-';
      return formatPhoneNumber(phoneNumber);
    } catch (error) {
      return phoneNumber || '-';
    }
  };

  const safeNumberToWords = amount => {
    try {
      return numberToWords(amount);
    } catch (error) {
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

  // Render HTML notes
  const renderNotesHTML = notes => {
    if (!notes) return '';
    try {
      return notes
        .replace(/\n/g, '<br>')
        .replace(/<br\s*\/?>/gi, '<br>')
        .replace(/<p>/gi, '<div style="margin-bottom: 4px;">')
        .replace(/<\/p>/gi, '</div>')
        .replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>')
        .replace(/<i>(.*?)<\/i>/gi, '<em>$1</em>')
        .replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')
        .replace(/<ul>/gi, '<ul style="padding-left: 12px;">')
        .replace(/<li>/gi, '<li style="margin-bottom: 2px;">');
    } catch (error) {
      return notes.replace(/\n/g, '<br>');
    }
  };

  // Generate HTML
  const generateHTML = () => {
    // Generate item rows
    const itemRows = itemsWithGST
      .map((item, index) => {
        let row = `
        <tr style="border-bottom: 1px solid #bfbfbf;">
          <td style="width: ${
            colWidths[0]
          }; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf;">${
          index + 1
        }</td>
          <td style="width: ${
            colWidths[1]
          }; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf; text-align: left;">${capitalizeWords(
          item.name,
        )}</td>
          <td style="width: ${
            colWidths[2]
          }; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf;">${
          item.code || '-'
        }</td>
          <td style="width: ${
            colWidths[3]
          }; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf;">${
          item.itemType === 'service'
            ? '-'
            : formatQuantity(item.quantity || 0, item.unit)
        }</td>
          <td style="width: ${
            colWidths[4]
          }; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf;">${formatCurrency(
          item.pricePerUnit || 0,
        )}</td>
          <td style="width: ${
            colWidths[5]
          }; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf; background-color: rgba(3, 113, 193, 0.1);">${formatCurrency(
          item.taxableValue,
        )}</td>
      `;

        if (showIGST) {
          row += `
          <td style="width: ${
            colWidths[6]
          }; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf;">
            <div>${item.gstRate.toFixed(2)}</div>
            <div>${formatCurrency(item.igst)}</div>
          </td>
        `;
        } else if (showCGSTSGST) {
          row += `
          <td style="width: ${
            colWidths[6]
          }; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf;">
            <div>${(item.gstRate / 2).toFixed(2)}</div>
            <div>${formatCurrency(item.cgst)}</div>
          </td>
          <td style="width: ${
            colWidths[7]
          }; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf;">
            <div>${(item.gstRate / 2).toFixed(2)}</div>
            <div>${formatCurrency(item.sgst)}</div>
          </td>
        `;
        }

        row += `
          <td style="width: ${
            colWidths[totalColumnIndex]
          }; text-align: center; padding: 2px; font-size: 7px; font-weight: bold; background-color: rgba(3, 113, 193, 0.1);">${formatCurrency(
          item.total,
        )}</td>
        </tr>
      `;

        return row;
      })
      .join('');

    // Table header
    let tableHeader = `
      <tr style="background-color: #2583C6; color: white; font-weight: bold; font-size: 8px;">
        <th style="width: ${colWidths[0]}; text-align: center; padding: 3px; border-right: 1px solid white;">Sr. No.</th>
        <th style="width: ${colWidths[1]}; text-align: left; padding: 3px; border-right: 1px solid white;">Name of Product/Service</th>
        <th style="width: ${colWidths[2]}; text-align: center; padding: 3px; border-right: 1px solid white;">HSN/SAC</th>
        <th style="width: ${colWidths[3]}; text-align: center; padding: 3px; border-right: 1px solid white;">Qty</th>
        <th style="width: ${colWidths[4]}; text-align: center; padding: 3px; border-right: 1px solid white;">Rate (Rs.)</th>
        <th style="width: ${colWidths[5]}; text-align: center; padding: 3px; border-right: 1px solid white; background-color: rgba(3, 113, 193, 0.2);">Taxable Value (Rs.)</th>
    `;

    if (showIGST) {
      tableHeader += `
        <th style="width: ${colWidths[6]}; text-align: center; padding: 3px; border-right: 1px solid white;">
          <div>IGST</div>
          <div style="display: flex; border-top: 1px solid white; margin-top: 1px;">
            <div style="flex: 1; text-align: center; border-right: 1px solid white;">%</div>
            <div style="flex: 1; text-align: center;">Amount (Rs.)</div>
          </div>
        </th>
      `;
    } else if (showCGSTSGST) {
      tableHeader += `
        <th style="width: ${colWidths[6]}; text-align: center; padding: 3px; border-right: 1px solid white;">
          <div>CGST</div>
          <div style="display: flex; border-top: 1px solid white; margin-top: 1px;">
            <div style="flex: 1; text-align: center; border-right: 1px solid white;">%</div>
            <div style="flex: 1; text-align: center;">Amount (Rs.)</div>
          </div>
        </th>
        <th style="width: ${colWidths[7]}; text-align: center; padding: 3px; border-right: 1px solid white;">
          <div>SGST</div>
          <div style="display: flex; border-top: 1px solid white; margin-top: 1px;">
            <div style="flex: 1; text-align: center; border-right: 1px solid white;">%</div>
            <div style="flex: 1; text-align: center;">Amount (Rs.)</div>
          </div>
        </th>
      `;
    }

    tableHeader += `
        <th style="width: ${colWidths[totalColumnIndex]}; text-align: center; padding: 3px; background-color: rgba(3, 113, 193, 0.2);">Total (Rs.)</th>
      </tr>
    `;

    // Generate HSN Summary rows
    const hsnSummary = getHsnSummary(itemsWithGST, showIGST, showCGSTSGST);
    const hsnRows = hsnSummary
      .map((hsnItem, index) => {
        let row = `
        <tr style="border-bottom: 1px solid #bfbfbf;">
          <td style="width: 25%; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf;">${hsnItem.hsnCode}</td>
          <td style="width: 20%; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf;">${formatCurrency(
            hsnItem.taxableValue,
          )}</td>
      `;

        if (showIGST) {
          row += `
          <td style="width: 30%; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf;">
            <div>${hsnItem.taxRate}</div>
            <div>${formatCurrency(hsnItem.taxAmount)}</div>
          </td>
        `;
        } else if (showCGSTSGST) {
          row += `
          <td style="width: 22%; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf;">
            <div>${(hsnItem.taxRate / 2).toFixed(2)}</div>
            <div>${formatCurrency(hsnItem.cgstAmount)}</div>
          </td>
          <td style="width: 22%; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #bfbfbf;">
            <div>${(hsnItem.taxRate / 2).toFixed(2)}</div>
            <div>${formatCurrency(hsnItem.sgstAmount)}</div>
          </td>
        `;
        }

        row += `
          <td style="width: ${
            showIGST ? '25%' : showCGSTSGST ? '20%' : '30%'
          }; text-align: center; padding: 2px; font-size: 7px; font-weight: bold; border-left: 1px solid #bfbfbf;">${formatCurrency(
          hsnItem.total,
        )}</td>
        </tr>
      `;

        return row;
      })
      .join('');

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
            padding: 10px;
            color: #000;
            font-size: 10px;
            line-height: 1.1;
          }
          
          .page {
            position: relative;
            min-height: 100vh;
          }
          
          /* Four Column Layout */
          .four-columns {
            display: flex;
            border: 1px solid #0371C1;
            margin-bottom: 10px;
          }
          
          .column {
            flex: 1;
            border-right: 1px solid #0371C1;
            padding: 5px;
            min-height: 120px;
          }
          
          .column:last-child {
            border-right: none;
          }
          
          .column-header {
            background-color: #0371C1;
            color: white;
            padding: 2px 5px;
            margin: -5px -5px 5px -5px;
            font-weight: bold;
            font-size: 9px;
            text-align: center;
          }
          
          .data-row {
            display: flex;
            margin-bottom: 2px;
            font-size: 8px;
          }
          
          .table-label {
            width: 50px;
            font-weight: bold;
            flex-shrink: 0;
          }
          
          .table-value {
            flex: 1;
            margin-left: 5px;
          }
          
          /* Table Styles */
          .items-table {
            width: 100%;
            border: 1px solid #0371C1;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          
          .items-table th,
          .items-table td {
            border: 1px solid #0371C1;
            padding: 2px;
            font-size: 7px;
          }
          
          /* Bottom Section */
          .bottom-section {
            display: flex;
            margin-bottom: 10px;
          }
          
          .left-section {
            flex: 2;
            padding-right: 10px;
          }
          
          .right-section {
            flex: 1;
            border-left: 1px solid #0371C1;
            padding-left: 10px;
          }
          
          .total-in-words {
            font-size: 8px;
            margin-bottom: 8px;
            font-weight: bold;
          }
          
          /* HSN Tax Table */
          .hsn-tax-table {
            border: 1px solid #0371C1;
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 10px;
          }
          
          .hsn-tax-table th,
          .hsn-tax-table td {
            border: 1px solid #0371C1;
            padding: 2px;
            font-size: 7px;
          }
          
          .hsn-tax-header-cell {
            background-color: #0371C1;
            color: white;
            text-align: center;
            font-weight: bold;
            padding: 3px;
          }
          
          .hsn-tax-cell {
            text-align: center;
            padding: 2px;
          }
          
          /* Total Rows */
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 9px;
          }
          
          .label {
            font-weight: normal;
          }
          
          .value {
            font-weight: normal;
          }
          
          .highlight-row {
            border-top: 1px solid #0371C1;
            border-bottom: 1px solid #0371C1;
            padding: 2px 0;
            margin: 4px 0;
            font-weight: bold;
          }
          
          .label-bold {
            font-weight: bold;
          }
          
          .value-bold {
            font-weight: bold;
          }
          
          /* Bank Details */
          .bank-details {
            font-size: 8px;
            margin-top: 10px;
          }
          
          .bank-row {
            display: flex;
            margin-bottom: 1px;
          }
          
          .bank-label {
            width: 60px;
            font-weight: bold;
            flex-shrink: 0;
          }
          
          .qr-code {
            width: 70px;
            height: 70px;
            object-fit: contain;
          }
          
          /* Terms Section */
          .terms-box {
            border: 1px solid #0371C1;
            border-top: none;
            padding: 5px;
            font-size: 7px;
            line-height: 1.2;
            margin-bottom: 10px;
          }
          
          /* Page Number */
          .page-number {
            position: absolute;
            bottom: 5px;
            right: 10px;
            font-size: 7px;
            text-align: right;
          }
          
          /* Utility Classes */
          .bold {
            font-weight: bold;
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
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Invoice Title -->
          <div style="text-align: center; margin-bottom: 8px;">
            <h2 style="color: #0371C1; font-size: 14px; margin-bottom: 5px;">
              ${
                transaction.type === 'proforma'
                  ? 'PROFORMA INVOICE'
                  : isGSTApplicable
                  ? 'TAX INVOICE'
                  : 'INVOICE'
              }
            </h2>
          </div>
          
          <!-- Four Column Section -->
          <div class="four-columns">
            <!-- Column 1: Company Details -->
            <div class="column">
              <div class="column-header">
                ${capitalizeWords(
                  company?.businessName || company?.companyName || 'Company Name',
                )}
              </div>
              <div class="data-row">
                <div class="table-label">Address</div>
                <div class="table-value">${[
                  company?.address,
                  company?.City,
                  company?.addressState,
                  company?.Country,
                  company?.Pincode,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Address Line 1'}</div>
              </div>
              <div class="data-row">
                <div class="table-label">Phone</div>
                <div class="table-value">${safeFormatPhoneNumber(
                  company?.mobileNumber || company?.Telephone,
                )}</div>
              </div>
              <div class="data-row">
                <div class="table-label">GSTIN</div>
                <div class="table-value">${company?.gstin || '-'}</div>
              </div>
              <div class="data-row">
                <div class="table-label">PAN</div>
                <div class="table-value">${company?.PANNumber || '-'}</div>
              </div>
            </div>
            
            <!-- Column 2: Invoice Details -->
            <div class="column">
              <div class="column-header">
                ${transaction.type === 'proforma'
                  ? 'PROFORMA INVOICE'
                  : isGSTApplicable
                  ? 'TAX INVOICE'
                  : 'INVOICE'}
              </div>
              <div class="data-row">
                <div class="table-label">Invoice No.</div>
                <div class="table-value">${transaction.invoiceNumber || 'N/A'}</div>
              </div>
              <div class="data-row">
                <div class="table-label">Invoice Date</div>
                <div class="table-value">${formatDateSafe(transaction.date)}</div>
              </div>
              <div class="data-row">
                <div class="table-label">Due Date</div>
                <div class="table-value">${formatDateSafe(transaction.dueDate)}</div>
              </div>
            </div>
            
            <!-- Column 3: Buyer Details -->
            <div class="column">
              <div class="column-header">
                To, ${capitalizeWords(party?.name || 'N/A')}
              </div>
              <div class="data-row">
                <div class="table-label">Address</div>
                <div class="table-value">${capitalizeWords(
                  getBillingAddress(party),
                ) || '-'}</div>
              </div>
              <div class="data-row">
                <div class="table-label">Phone</div>
                <div class="table-value">${safeFormatPhoneNumber(
                  party?.contactNumber,
                )}</div>
              </div>
              <div class="data-row">
                <div class="table-label">GSTIN</div>
                <div class="table-value">${party?.gstin || '-'}</div>
              </div>
              <div class="data-row">
                <div class="table-label">PAN</div>
                <div class="table-value">${party?.pan || '-'}</div>
              </div>
              <div class="data-row">
                <div class="table-label">Place of Supply</div>
                <div class="table-value">${
                  shippingAddress?.state
                    ? `${capitalizeWords(shippingAddress.state)} (${
                        getStateCode(shippingAddress.state) || '-'
                      })`
                    : party?.state
                    ? `${capitalizeWords(party.state)} (${
                        getStateCode(party.state) || '-'
                      })`
                    : '-'
                }</div>
              </div>
            </div>
            
            <!-- Column 4: Consigned Details -->
            <div class="column">
              <div class="column-header">
                Shipped To, ${capitalizeWords(
                  shippingAddress?.label || party?.name || 'N/A',
                )}
              </div>
              <div class="data-row">
                <div class="table-label">Address</div>
                <div class="table-value">${capitalizeWords(
                  getShippingAddress(shippingAddress, getBillingAddress(party)),
                )}</div>
              </div>
              <div class="data-row">
                <div class="table-label">Country</div>
                <div class="table-value">India</div>
              </div>
              <div class="data-row">
                <div class="table-label">Phone</div>
                <div class="table-value">${safeFormatPhoneNumber(
                  shippingAddress?.contactNumber || party?.contactNumber,
                )}</div>
              </div>
              <div class="data-row">
                <div class="table-label">GSTIN</div>
                <div class="table-value">${party?.gstin || '-'}</div>
              </div>
              <div class="data-row">
                <div class="table-label">State</div>
                <div class="table-value">${
                  shippingAddress?.state
                    ? `${capitalizeWords(shippingAddress.state)} (${
                        getStateCode(shippingAddress.state) || '-'
                      })`
                    : party?.state
                    ? `${capitalizeWords(party.state)} (${
                        getStateCode(party.state) || '-'
                      })`
                    : '-'
                }</div>
              </div>
            </div>
          </div>
          
          <!-- Items Table -->
          <table class="items-table">
            <thead>
              ${tableHeader}
            </thead>
            <tbody>
              ${itemRows}
              <!-- Total Row -->
              <tr style="font-weight: bold; font-size: 8px;">
                <td style="text-align: center;"></td>
                <td style="text-align: center;"></td>
                <td style="text-align: center; background-color: rgba(3, 113, 193, 0.1);">Total</td>
                <td style="text-align: center; background-color: rgba(3, 113, 193, 0.1);">${totalQty}</td>
                <td style="text-align: center;"></td>
                <td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);">${formatCurrency(
                  totalTaxable,
                )}</td>
                ${
                  showIGST
                    ? `
                  <td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);">
                    <div></div>
                    <div>${formatCurrency(totalIGST)}</div>
                  </td>
                `
                    : ''
                }
                ${
                  showCGSTSGST
                    ? `
                  <td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);">
                    <div></div>
                    <div>${formatCurrency(totalCGST)}</div>
                  </td>
                  <td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);">
                    <div></div>
                    <div>${formatCurrency(totalSGST)}</div>
                  </td>
                `
                    : ''
                }
                <td style="text-align: center; background-color: rgba(3, 113, 193, 0.2); font-weight: bold;">
                  ${formatCurrency(totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- Bottom Section -->
          <div class="bottom-section">
            <div class="left-section">
              <!-- Total in Words -->
              <div class="total-in-words">
                Total in words : ${safeNumberToWords(totalAmount)}
              </div>
              
              <!-- HSN Tax Table -->
              ${
                isGSTApplicable
                  ? `
                <table class="hsn-tax-table">
                  <thead>
                    <tr>
                      <th class="hsn-tax-header-cell" style="width: 25%;">HSN / SAC</th>
                      <th class="hsn-tax-header-cell" style="width: 20%;">Taxable Value (Rs.)</th>
                      ${
                        showIGST
                          ? `
                        <th class="hsn-tax-header-cell" style="width: 30%;">
                          <div>IGST</div>
                          <div style="display: flex; border-top: 1px solid white;">
                            <div style="flex: 1; border-right: 1px solid white;">%</div>
                            <div style="flex: 1;">Amount (Rs.)</div>
                          </div>
                        </th>
                      `
                          : ''
                      }
                      ${
                        showCGSTSGST
                          ? `
                        <th class="hsn-tax-header-cell" style="width: 22%;">
                          <div>CGST</div>
                          <div style="display: flex; border-top: 1px solid white;">
                            <div style="flex: 1; border-right: 1px solid white;">%</div>
                            <div style="flex: 1;">Amount (Rs.)</div>
                          </div>
                        </th>
                        <th class="hsn-tax-header-cell" style="width: 22%;">
                          <div>SGST</div>
                          <div style="display: flex; border-top: 1px solid white;">
                            <div style="flex: 1; border-right: 1px solid white;">%</div>
                            <div style="flex: 1;">Amount (Rs.)</div>
                          </div>
                        </th>
                      `
                          : ''
                      }
                      <th class="hsn-tax-header-cell" style="width: ${
                        showIGST ? '25%' : showCGSTSGST ? '20%' : '30%'
                      }; border-left: 1px solid white;">Total (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${hsnRows}
                    <!-- HSN Total Row -->
                    <tr style="font-weight: bold; font-size: 8px;">
                      <td class="hsn-tax-cell">Total</td>
                      <td class="hsn-tax-cell">${formatCurrency(totalTaxable)}</td>
                      ${
                        showIGST
                          ? `
                        <td class="hsn-tax-cell">
                          <div></div>
                          <div>${formatCurrency(totalIGST)}</div>
                        </td>
                      `
                          : ''
                      }
                      ${
                        showCGSTSGST
                          ? `
                        <td class="hsn-tax-cell">
                          <div></div>
                          <div>${formatCurrency(totalCGST)}</div>
                        </td>
                        <td class="hsn-tax-cell">
                          <div></div>
                          <div>${formatCurrency(totalSGST)}</div>
                        </td>
                      `
                          : ''
                      }
                      <td class="hsn-tax-cell" style="border-left: 1px solid #0371C1;">
                        ${formatCurrency(totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              `
                  : ''
              }
            </div>
            
            <!-- Right Section: Totals and Bank Details -->
            <div class="right-section">
              <!-- Totals -->
              <div style="margin-bottom: 10px;">
                <div class="total-row">
                  <div class="label">Taxable Amount</div>
                  <div class="value">Rs. ${formatCurrency(totalTaxable)}</div>
                </div>
                
                ${
                  isGSTApplicable
                    ? `
                  <div class="total-row">
                    <div class="label">Total Tax</div>
                    <div class="value">Rs. ${formatCurrency(
                      showIGST ? totalIGST : totalCGST + totalSGST,
                    )}</div>
                  </div>
                `
                    : ''
                }
                
                <div class="total-row ${
                  isGSTApplicable ? 'highlight-row' : ''
                }">
                  <div class="${isGSTApplicable ? 'label-bold' : 'label'}">
                    ${isGSTApplicable ? 'Total Amount After Tax' : 'Total Amount'}
                  </div>
                  <div class="${isGSTApplicable ? 'value-bold' : 'value'}">
                    Rs. ${formatCurrency(totalAmount)}
                  </div>
                </div>
                
                <div class="total-row" style="margin-top: 10px;">
                  <div class="label">For ${capitalizeWords(
                    company?.businessName || company?.companyName || 'Company Name',
                  )}</div>
                  <div class="value">(E & O.E.)</div>
                </div>
              </div>
              
              <!-- Bank Details -->
              ${
                transaction.type !== 'proforma' &&
                isBankDetailAvailable &&
                !shouldHideBankDetails
                  ? `
                <div class="bank-details">
                  <div class="bold mb-2">Bank Details:</div>
                  ${
                    bankData.bankName
                      ? `
                    <div class="bank-row">
                      <div class="bank-label">Name:</div>
                      <div>${capitalizeWords(bankData.bankName)}</div>
                    </div>
                  `
                      : ''
                  }
                  ${
                    bankData.branchAddress
                      ? `
                    <div class="bank-row">
                      <div class="bank-label">Branch:</div>
                      <div>${bankData.branchAddress}</div>
                    </div>
                  `
                      : ''
                  }
                  ${
                    bankData.accountNo
                      ? `
                    <div class="bank-row">
                      <div class="bank-label">Acc. No:</div>
                      <div>${bankData.accountNo}</div>
                    </div>
                  `
                      : ''
                  }
                  ${
                    bankData.ifscCode
                      ? `
                    <div class="bank-row">
                      <div class="bank-label">IFSC:</div>
                      <div>${bankData.ifscCode}</div>
                    </div>
                  `
                      : ''
                  }
                  ${
                    bankData.upiDetails?.upiId
                      ? `
                    <div class="bank-row">
                      <div class="bank-label">UPI ID:</div>
                      <div>${bankData.upiDetails.upiId}</div>
                    </div>
                  `
                      : ''
                  }
                  ${
                    bankData.upiDetails?.upiName
                      ? `
                    <div class="bank-row">
                      <div class="bank-label">UPI Name:</div>
                      <div>${bankData.upiDetails.upiName}</div>
                    </div>
                  `
                      : ''
                  }
                  ${
                    bankData.upiDetails?.upiMobile
                      ? `
                    <div class="bank-row">
                      <div class="bank-label">UPI Mobile:</div>
                      <div>${bankData.upiDetails.upiMobile}</div>
                    </div>
                  `
                      : ''
                  }
                  ${
                    bankData.qrCode
                      ? `
                    <div style="text-align: center; margin-top: 5px;">
                      <div class="bold mb-2">QR Code</div>
                      <img src="${BASE_URL}${bankData.qrCode}" class="qr-code" />
                    </div>
                  `
                      : ''
                  }
                </div>
              `
                  : ''
              }
            </div>
          </div>
          
          <!-- Terms and Conditions -->
          ${
            transaction?.notes
              ? `
            <div class="terms-box">
              ${renderNotesHTML(transaction.notes)}
            </div>
          `
              : ''
          }
          
          <!-- Page Number -->
          <div class="page-number">1 / 1 page</div>
        </div>
      </body>
      </html>
    `;
  };

  return generateHTML();
};

// --- PDF Generation Function ---
export const generatePdfForTemplateA5_4 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
  client,
) => {
  try {
    console.log('🟡 PDF Generation Started - TemplateA5_4');

    const htmlContent = TemplateA5_4({
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
      fileName: `invoice_${transaction.invoiceNumber || 'document'}_templateA5_4`,
      directory: 'Documents',
      width: 595, // A5 landscape width (approximation for A4 portrait)
      height: 420, // A5 landscape height
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

export default TemplateA5_4;