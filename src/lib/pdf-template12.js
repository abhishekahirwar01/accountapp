// pdf-template12.js
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

// --- Main Template Component ---
const Template12 = ({
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

  // Generate HTML
  const generateHTML = () => {
    // Generate table rows for main items
    const itemRows = itemsWithGST
      .map((item, index) => {
        return `
        <tr>
          <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf;">${
            index + 1
          }</td>
          <td style="padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; text-align: left;">${capitalizeWords(
            item.name,
          )}</td>
          <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf;">${
            item.code || '-'
          }</td>
          <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf;">${
            item.itemType === 'service'
              ? '-'
              : formatQuantity(item.quantity || 0, item.unit)
          }</td>
          <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf;">${formatCurrency(
            item.pricePerUnit || 0,
          )}</td>
          <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf;">${formatCurrency(
            item.taxableValue,
          )}</td>
        </tr>
      `;
      })
      .join('');

    // Generate GST summary table rows
    const gstSummaryRows = itemsWithGST
      .map((item, index) => {
        if (showIGST) {
          return `
          <tr>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${
              item.code || '-'
            }</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.taxableValue,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${item.gstRate.toFixed(
              2,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.igst,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.total,
            )}</td>
          </tr>
        `;
        } else if (showCGSTSGST) {
          return `
          <tr>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${
              item.code || '-'
            }</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.taxableValue,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${(
              item.gstRate / 2
            ).toFixed(2)}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.cgst,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${(
              item.gstRate / 2
            ).toFixed(2)}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.sgst,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.total,
            )}</td>
          </tr>
        `;
        } else {
          return `
          <tr>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${
              item.code || '-'
            }</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.taxableValue,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.total,
            )}</td>
          </tr>
        `;
        }
      })
      .join('');

    // GST summary table TOTAL row
    let gstTotalRow = '';
    if (showIGST) {
      gstTotalRow = `
      <tr>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">-</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">${formatCurrency(
          totalTaxable,
        )}</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">-</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">${formatCurrency(
          totalIGST,
        )}</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; font-weight: bold;">${formatCurrency(
          totalAmount,
        )}</td>
      </tr>
    `;
    } else if (showCGSTSGST) {
      gstTotalRow = `
      <tr>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">-</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">${formatCurrency(
          totalTaxable,
        )}</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">-</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">${formatCurrency(
          totalCGST,
        )}</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">-</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">${formatCurrency(
          totalSGST,
        )}</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; font-weight: bold;">${formatCurrency(
          totalAmount,
        )}</td>
      </tr>
    `;
    } else {
      gstTotalRow = `
      <tr>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">-</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">${formatCurrency(
          totalTaxable,
        )}</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; font-weight: bold;">${formatCurrency(
          totalAmount,
        )}</td>
      </tr>
    `;
    }

    // Calculate page count (simple calculation)
    const calculatePageCount = () => {
      // Basic calculation based on content length
      const baseLength = itemsWithGST.length * 50 + 1000; // Rough estimate
      return Math.ceil(baseLength / 2000); // 2000 chars per page estimate
    };

    const totalPages = calculatePageCount();

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
            padding: 15px 20px;
            color: #000;
            font-size: 12px;
            line-height: 1.2;
          }
          
          .page {
            position: relative;
            min-height: 100vh;
          }
          
          /* Header Section - Updated with logo on left, details on right */
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
            
          }
          
          .logo-container {
            flex: 0 0 auto;
            margin-right: 20px;
          }
          
          .company-logo {
            width: 70px;
            height: 70px;
          }
          
          .company-details-right {
            flex: 1;
            text-align: right;
          }
          
          .company-name {
            font-size: 16px;
            font-weight: bold;
            color: #000;
            margin-bottom: 2px;
            line-height: 1.4;
          }
          
          .gstin {
            font-size: 10px;
            margin-bottom: 3px;
            line-height: 1.4;
          }
          
          .company-address {
            font-size: 10px;
            color: #000;
            line-height: 1.4;
          }
          
          .company-address div {
            margin-bottom: 2px;
          }
          
          .invoice-title {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin: 10px 0;
            color: #2583C6;
          }
          
          /* Blue divider line */
          .divider-blue {
            height: 1px;
            background-color: #2583C6;
            margin: 5px 0 15px 0;
          }
          
          /* Three column layout with proper alignment */
          .three-columns {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            gap: 15px;
          }
          
          .column-left {
            flex: 1;
            text-align: left;
          }
          
          .column-center {
            flex: 1;
            text-align: center;
            padding: 0 10px;
            margin-left:50px;
          }
            .column-center-details{
            text-align: left;
            }
          
          .column-right {
            flex: 1;
            text-align: right;
          }
          
          .column-title {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #000;
          }
          
          .detail-row {
            display: flex;
            margin-bottom: 3px;
            font-size: 9px;
            line-height: 1.3;
          }
          
          .detail-row-left {
            display: flex;
            margin-bottom: 3px;
            font-size: 9px;
            line-height: 1.3;
            text-align: left;
          }
          
          .detail-row-right {
            display: flex;
            margin-bottom: 3px;
            font-size: 9px;
            line-height: 1.3;
            justify-content: flex-end;
          }
          
          .detail-label {
            width: 85px;
            font-weight: bold;
            flex-shrink: 0;
          }
          
          .detail-value {
            flex: 1;
          }
          
          /* Items Table */
          .items-table {
            width: 100%;
            border: 1px solid #bfbfbf;
            border-collapse: collapse;
            margin: 15px 0 5px 0;
          }
          
          .items-table th {
            background-color: #2583C6;
            color: white;
            font-weight: bold;
            font-size: 10px;
            padding: 6px;
            border-right: 1px solid white;
            text-align: center;
          }
          
          .items-table td {
            padding: 5px;
            font-size: 10px;
            border-right: 1px solid #bfbfbf;
            border-bottom: 1px solid #bfbfbf;
          }
          
          .items-table tr:last-child td {
            border-bottom: 1px solid #bfbfbf;
          }
          
          /* Total items/qty */
          .total-items {
            font-size: 9px;
            margin-bottom: 10px;
            line-height: 1.3;
          }
          
          /* Totals section */
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 10px;
          }
          
          .totals-box {
            width: 250px;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10px;
            line-height: 1.3;
          }
          
          .total-label {
            font-weight: bold;
          }
          
          .total-value {
            font-weight: normal;
          }
          
          .total-final {
            border-top: 1px solid #000;
            padding-top: 3px;
            margin-top: 3px;
            font-weight: bold;
          }
          
          /* Total in words */
          .total-words {
            font-size: 10px;
            margin-bottom: 15px;
            line-height: 1.3;
          }
          
          .total-words-label {
            font-weight: bold;
          }
          
          /* GST Summary Table */
          .gst-summary-table {
            width: 100%;
            border: 1px solid #bfbfbf;
            border-collapse: collapse;
            margin: 15px 0;
          }
          
          .gst-summary-table th {
            background-color: #2583C6;
            color: white;
            font-weight: bold;
            font-size: 10px;
            padding: 6px;
            border-right: 1px solid white;
            text-align: center;
          }
          
          .gst-summary-table td {
            padding: 5px;
            font-size: 10px;
            border-right: 1px solid #bfbfbf;
            border-bottom: 1px solid #bfbfbf;
            text-align: center;
          }
          
          /* Bank details section */
          .bank-section {
            // margin-top: 20px;
          }
          
          .bank-row {
            display: flex;
            font-size: 9px;
            margin-bottom: 2px;
            line-height: 1.3;
          }
          
          .bank-label {
            width: 80px;
            font-weight: bold;
            flex-shrink: 0;
          }
          
          .bank-value {
            flex: 1;
          }
          
          /* Bank + QR + Signature row */
          .bottom-section {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
          }
          
          .bank-details-column {
            flex: 2;
          }
          
          .qr-column {
            flex: 1;
            text-align: center;
            margin-right:50px;
          }
          
          .signature-column {
            flex: 1;
            text-align: left;
            margin-left:80px;
            margin-top:20px;
          }
            .Authorised{
            text-align:center;
            }
          
          .qr-image {
            width: 80px;
            height: 80px;
            margin-top: 5px;
          }
          
          .signature-line {
            margin-top: 40px;
            border-top: 1px solid #000;
            width: 150px;
            display: inline-block;
          }
          
          /* Notes section */
          .notes-section {
            margin-top: 20px;
            border-top: 1px solid #2583C6;
            padding-top: 10px;
            font-size: 9px;
            line-height: 1.4;
          }
          
          /* Page number - Dynamic */
          .page-number-container {
            position: absolute;
            bottom: 10px;
            right: 20px;
            font-size: 9px;
            color: #666;
          }
          
          /* Utility */
          .bold {
            font-weight: bold;
            margin-bottom:5px;
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
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header - Logo on left, details on right -->
          <div class="header-section">
            ${logoSrc ? `
              <div class="logo-container">
                <img src="${logoSrc}" class="company-logo" />
              </div>
            ` : ''}
            
            <div class="company-details-right">
              <div class="company-name">
                ${capitalizeWords(company?.businessName || company?.companyName || 'Company Name')}
              </div>
              
              ${company?.gstin ? `
                <div class="gstin">
                  <span class="bold">GSTIN:</span> ${company.gstin}
                </div>
              ` : ''}
              
              <div class="company-address">
                <div>${capitalizeWords(company?.address || 'Address Line 1')}</div>
                <div>${capitalizeWords(company?.City || 'City')}, ${capitalizeWords(company?.addressState || 'State')} - ${company?.Pincode || 'Pincode'}</div>
                <div><span class="bold">Phone:</span> ${safeFormatPhoneNumber(company?.mobileNumber || company?.Telephone || 'Phone')}</div>
              </div>
            </div>
          </div>
          
          <!-- Invoice Title -->
          <div class="invoice-title">
            ${transaction.type === 'proforma' ? 'PROFORMA INVOICE' : isGSTApplicable ? 'TAX INVOICE' : 'INVOICE'}
          </div>
          
          <!-- Blue Divider -->
          <div class="divider-blue"></div>
          
          <!-- Three Column Section with proper alignment -->
          <div class="three-columns">
            <!-- Bill To - Left aligned -->
            <div class="column-left">
              <div class="column-title">Details of Buyer | Billed to :</div>
              
              <div class="detail-row-left">
                <div class="detail-label">Name:</div>
                <div class="detail-value">${capitalizeWords(party?.name || 'N/A')}</div>
              </div>
              
              <div class="detail-row-left">
                <div class="detail-label">Phone:</div>
                <div class="detail-value">${safeFormatPhoneNumber(party?.contactNumber || '-')}</div>
              </div>
              
              <div class="detail-row-left">
                <div class="detail-label">Address:</div>
                <div class="detail-value">${capitalizeWords(getBillingAddress(party))}</div>
              </div>
              
              <div class="detail-row-left">
                <div class="detail-label">PAN:</div>
                <div class="detail-value">${party?.pan || '-'}</div>
              </div>
              
              <div class="detail-row-left">
                <div class="detail-label">GSTIN:</div>
                <div class="detail-value">${party?.gstin || '-'}</div>
              </div>
              
              <div class="detail-row-left">
                <div class="detail-label">Place of Supply:</div>
                <div class="detail-value">
                  ${actualShippingAddress?.state
                    ? `${actualShippingAddress.state} (${getStateCode(actualShippingAddress.state) || '-'})`
                    : party?.state
                    ? `${party.state} (${getStateCode(party.state) || '-'})`
                    : '-'}
                </div>
              </div>
            </div>
            
            <!-- Ship To - Center aligned -->
            <div class="column-center">
              <div class="column-center-details">
              <div class="column-title">Details of Consigned | Shipped to :</div>
              
              <div class="detail-row">
                <div class="detail-label">Name:</div>
                <div class="detail-value">${capitalizeWords(actualShippingAddress?.label || party?.name || 'N/A')}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Address:</div>
                <div class="detail-value">
                  ${capitalizeWords(getShippingAddress(actualShippingAddress, getBillingAddress(party)))}
                </div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Country:</div>
                <div class="detail-value">${company?.Country || 'India'}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Phone:</div>
                <div class="detail-value">
                  ${safeFormatPhoneNumber(
                    actualShippingAddress?.phone ||
                      actualShippingAddress?.mobileNumber ||
                      party?.contactNumber ||
                      '-'
                  )}
                </div>
              </div>
              
               <div class="detail-row">
                <div class="detail-label">GSTIN:</div>
                <div class="detail-value">${party?.gstin || '-'}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">State:</div>
                <div class="detail-value">
                  ${actualShippingAddress?.state
                    ? `${actualShippingAddress.state} (${getStateCode(actualShippingAddress.state) || '-'})`
                    : party?.state
                    ? `${party.state} (${getStateCode(party.state) || '-'})`
                    : '-'}
                </div>
              </div>
              </div>
            </div>
            
            <!-- Invoice Details - Right aligned -->
            <div class="column-right">
              <div class="column-title" style="visibility: hidden;">Placeholder</div>
              
              <div class="detail-row-right">
                <div class="detail-label">Invoice #:</div>
                <div class="detail-value">${transaction?.invoiceNumber || 'N/A'}</div>
              </div>
              
              <div class="detail-row-right">
                <div class="detail-label">Invoice Date:</div>
                <div class="detail-value">${formatDateSafe(transaction?.date)}</div>
              </div>
              
              <div class="detail-row-right">
                <div class="detail-label">P.O. No.:</div>
                <div class="detail-value">${transaction?.voucher || '-'}</div>
              </div>
              
              <div class="detail-row-right">
                <div class="detail-label">P.O. Date:</div>
                <div class="detail-value">
                  ${transaction?.poDate ? formatDateSafe(transaction.poDate) : '-'}
                </div>
              </div>
              
              ${isGSTApplicable ? `
                <div class="detail-row-right">
                  <div class="detail-label">E-Way No.:</div>
                  <div class="detail-value">${transaction?.eway || '-'}</div>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th>Sr. No</th>
                <th>Name of Product / Service</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Rate (Rs.)</th>
                <th>Taxable Value(Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
          
          <!-- Total Items/Qty -->
          <div class="total-items">
            <span class="bold">Total Items / Qty :</span> ${totalItems} / ${totalQty}
          </div>
          
          <!-- Totals Section -->
          <div class="totals-section">
            <div class="totals-box">
              <div class="total-row">
                <div class="total-label">Taxable Amount:</div>
                <div class="total-value">Rs. ${formatCurrency(totalTaxable)}</div>
              </div>
              
              ${showIGST ? `
                <div class="total-row">
                  <div class="total-label">IGST:</div>
                  <div class="total-value">Rs. ${formatCurrency(totalIGST)}</div>
                </div>
              ` : ''}
              
              ${showCGSTSGST ? `
                <div class="total-row">
                  <div class="total-label">CGST:</div>
                  <div class="total-value">Rs. ${formatCurrency(totalCGST)}</div>
                </div>
                <div class="total-row">
                  <div class="total-label">SGST:</div>
                  <div class="total-value">Rs. ${formatCurrency(totalSGST)}</div>
                </div>
              ` : ''}
              
              <div class="total-row total-final">
                <div class="total-label">
                  ${isGSTApplicable ? 'Total Amount After Tax' : 'Total Amount'}:
                </div>
                <div class="total-value">Rs. ${formatCurrency(totalAmount)}</div>
              </div>
            </div>
          </div>
          
          <!-- Total in Words -->
          <div class="total-words">
            <span class="total-words-label">Total (in words):</span> ${safeNumberToWords(totalAmount)}
          </div>
          
          <!-- GST Summary Table -->
          <table class="gst-summary-table">
            <thead>
              <tr>
                ${showIGST ? `
                  <th>HSN/SAC</th>
                  <th>Taxable Value (Rs.)</th>
                  <th>IGST %</th>
                  <th>IGST Amt (Rs.)</th>
                  <th>Total (Rs.)</th>
                ` : ''}
                
                ${showCGSTSGST ? `
                  <th>HSN/SAC</th>
                  <th>Taxable Value (Rs.)</th>
                  <th>CGST %</th>
                  <th>CGST Amt (Rs.)</th>
                  <th>SGST %</th>
                  <th>SGST Amt (Rs.)</th>
                  <th>Total (Rs.)</th>
                ` : ''}
                
                ${!isGSTApplicable ? `
                  <th>HSN/SAC</th>
                  <th>Taxable Value (Rs.)</th>
                  <th>Total (Rs.)</th>
                ` : ''}
              </tr>
            </thead>
            <tbody>
              ${gstSummaryRows}
              ${gstTotalRow}
            </tbody>
          </table>
          
          <!-- Bank Details, QR Code, and Signature -->
          <div class="bottom-section">
            <!-- Bank Details -->
            <div class="bank-details-column">
              ${!shouldHideBankDetails && isBankDetailAvailable ? `
                <div class="bank-section">
                  <div class="bold">Bank Details:</div>
                  
                  ${bankData.bankName ? `
                    <div class="bank-row">
                      <div class="bank-label">Name:</div>
                      <div class="bank-value">${capitalizeWords(bankData.bankName)}</div>
                    </div>
                  ` : ''}
                  
                  ${bankData.branchAddress ? `
                    <div class="bank-row">
                      <div class="bank-label">Branch:</div>
                      <div class="bank-value">${capitalizeWords(bankData.branchAddress)}</div>
                    </div>
                  ` : ''}
                  
                  ${bankData.ifscCode ? `
                    <div class="bank-row">
                      <div class="bank-label">IFSC:</div>
                      <div class="bank-value">${bankData.ifscCode}</div>
                    </div>
                  ` : ''}
                  
                  ${bankData.accountNo ? `
                    <div class="bank-row">
                      <div class="bank-label">Acc. No:</div>
                      <div class="bank-value">${bankData.accountNo}</div>
                    </div>
                  ` : ''}
                  
                  ${bankData.upiDetails?.upiId ? `
                    <div class="bank-row">
                      <div class="bank-label">UPI ID:</div>
                      <div class="bank-value">${bankData.upiDetails.upiId}</div>
                    </div>
                  ` : ''}
                  
                  ${bankData.upiDetails?.upiName ? `
                    <div class="bank-row">
                      <div class="bank-label">UPI Name:</div>
                      <div class="bank-value">${bankData.upiDetails.upiName}</div>
                    </div>
                  ` : ''}
                  
                  ${bankData.upiDetails?.upiMobile ? `
                    <div class="bank-row">
                      <div class="bank-label">UPI Mobile:</div>
                      <div class="bank-value">${bankData.upiDetails.upiMobile}</div>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
            
            <!-- QR Code -->
            ${bankData?.qrCode ? `
              <div class="qr-column">
                <div class="bold">QR Code</div>
                <img src="${BASE_URL}${bankData.qrCode}" class="qr-image" />
              </div>
            ` : '<div class="qr-column"></div>'}
            
            <!-- Signature -->
            <div class="signature-column">
              <div class="bold">For ${capitalizeWords(company?.businessName || 'Company')}</div>
              <div class="signature-line"></div>
              <div class="Authorised">Authorised Signatory</div>
            </div>
          </div>
          
          <!-- Notes Section -->
          ${transaction?.notes ? `
            <div class="notes-section">
              ${transaction.notes.replace(/\n/g, '<br>')}
            </div>
          ` : ''}
          
          <!-- Page Number - Dynamic -->
          <div class="page-number-container">
            Page 1 of ${totalPages}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return generateHTML();
};

// --- PDF Generation Function ---
export const generatePdfForTemplate12 = async (
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
    console.log('🟡 PDF Generation Started - Template12');

    const htmlContent = Template12({
      transaction,
      company,
      party,
      shippingAddress,
      bank,
      client,
      clientName,
    });

    console.log('🟢 HTML Content Generated Successfully');
    console.log('HTML Length:', htmlContent.length);

    const options = {
      html: htmlContent,
      fileName: `invoice_${transaction.invoiceNumber || 'document'}_template12`,
      directory: 'Documents',
      width: 595, // A4 width in points
      height: 842, // A4 height in points
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