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

const TemplateA5_4 = ({
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
    totalQty,
    itemsWithGST,
    totalCGST,
    totalSGST,
    totalIGST,
    isGSTApplicable,
    showIGST,
    showCGSTSGST,
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

  const getColWidths = () => {
    if (showIGST) {
      return ['4%', '24%', '10%', '6%', '10%', '15%', '8%', '10%', '25%'];
    } else if (showCGSTSGST) {
      return ['4%', '20%', '10%', '6%', '10%', '10%', '6%', '8%', '6%', '8%', '18%'];
    } else {
      return ['10%', '25%', '10%', '10%', '10%', '15%', '20%'];
    }
  };

  const colWidths = getColWidths();
  const totalColumnIndex = showIGST ? 8 : showCGSTSGST ? 10 : 6;

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

  const generateHeaderHTML = () => {
    return `
     
      
      <div style="text-align: center; margin-bottom: 8px;">
        <h2 style="color: #0371C1; font-size: 14px; margin-bottom: 5px;">
          ${transaction.type === 'proforma' ? 'PROFORMA INVOICE' : isGSTApplicable ? 'TAX INVOICE' : 'INVOICE'}
        </h2>
      </div>
      
      <div class="four-columns">
        <div class="column">
          <div class="column-header">
            ${capitalizeWords(company?.businessName || company?.companyName || 'Company Name')}
          </div>
          <div class="data-row">
            <div class="table-label">Address</div>
            <div class="table-value">${[company?.address, company?.City, company?.addressState, company?.Country, company?.Pincode].filter(Boolean).join(', ') || 'Address Line 1'}</div>
          </div>
          <div class="data-row">
            <div class="table-label">Phone</div>
            <div class="table-value">${safeFormatPhoneNumber(company?.mobileNumber || company?.Telephone)}</div>
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
        
        <div class="column">
          <div class="column-header">
            ${transaction.type === 'proforma' ? 'PROFORMA INVOICE' : isGSTApplicable ? 'TAX INVOICE' : 'INVOICE'}
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
        
        <div class="column">
          <div class="column-header">
            To, ${capitalizeWords(party?.name || 'N/A')}
          </div>
          <div class="data-row">
            <div class="table-label">Address</div>
            <div class="table-value">${capitalizeWords(getBillingAddress(party)) || '-'}</div>
          </div>
          <div class="data-row">
            <div class="table-label">Phone</div>
            <div class="table-value">${safeFormatPhoneNumber(party?.contactNumber)}</div>
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
            <div class="table-value">${shippingAddress?.state ? `${capitalizeWords(shippingAddress.state)} (${getStateCode(shippingAddress.state) || '-'})` : party?.state ? `${capitalizeWords(party.state)} (${getStateCode(party.state) || '-'})` : '-'}</div>
          </div>
        </div>
        
        <div class="column">
          <div class="column-header">
            Shipped To, ${capitalizeWords(shippingAddress?.label || party?.name || 'N/A')}
          </div>
          <div class="data-row">
            <div class="table-label">Address</div>
            <div class="table-value">${capitalizeWords(getShippingAddress(shippingAddress, getBillingAddress(party)))}</div>
          </div>
          <div class="data-row">
            <div class="table-label">Country</div>
            <div class="table-value">${company?.Country}</div>
          </div>
          <div class="data-row">
            <div class="table-label">Phone</div>
            <div class="table-value">${safeFormatPhoneNumber(shippingAddress?.contactNumber || party?.contactNumber)}</div>
          </div>
          <div class="data-row">
            <div class="table-label">GSTIN</div>
            <div class="table-value">${party?.gstin || '-'}</div>
          </div>
          <div class="data-row">
            <div class="table-label">State</div>
            <div class="table-value">${shippingAddress?.state ? `${capitalizeWords(shippingAddress.state)} (${getStateCode(shippingAddress.state) || '-'})` : party?.state ? `${capitalizeWords(party.state)} (${getStateCode(party.state) || '-'})` : '-'}</div>
          </div>
        </div>
      </div>
    `;
  };

  const generateItemRows = (itemsList, startIndex) => {
    return itemsList.map((item, localIndex) => {
        const globalIndex = startIndex + localIndex;
        let row = `
        <tr style="border-bottom: 1px solid #bfbfbf;">
          <td style="width: ${colWidths[0]}; text-align: center; padding: 6px 2px; font-size: 7px; ">${globalIndex + 1}</td>
          <td style="width: ${colWidths[1]}; padding: 4px 2px; font-size: 7px;  text-align: left;">${capitalizeWords(item.name)}</td>
          <td style="width: ${colWidths[2]}; text-align: center; padding: 4px 2px; font-size: 7px; ">${item.code || '-'}</td>
          <td style="width: ${colWidths[3]}; text-align: center; padding: 4px 2px; font-size: 7px; ">${item.itemType === 'service' ? '-' : formatQuantity(item.quantity || 0, item.unit)}</td>
          <td style="width: ${colWidths[4]}; text-align: center; padding: 4px 2px; font-size: 7px; ">${formatCurrency(item.pricePerUnit || 0)}</td>
          <td style="width: ${colWidths[5]}; text-align: center; padding: 4px 2px; font-size: 7px;  background-color: rgba(3, 113, 193, 0.1);">${formatCurrency(item.taxableValue)}</td>
      `;

        if (showIGST) {
          row += `<td style="width: ${colWidths[6]}; text-align: center; padding: 4px 2px; font-size: 7px; ">${item.gstRate.toFixed(2)}</td>`;
          row += `<td style="width: ${colWidths[7]}; text-align: center; padding: 4px 2px; font-size: 7px; ">${formatCurrency(item.igst)}</td>`;
        } else if (showCGSTSGST) {
          row += `<td style="width: ${colWidths[6]}; text-align: center; padding: 4px 2px; font-size: 7px; ">${(item.gstRate / 2).toFixed(2)}</td>`;
          row += `<td style="width: ${colWidths[7]}; text-align: center; padding: 4px 2px; font-size: 7px;">${formatCurrency(item.cgst)}</td>`;
          row += `<td style="width: ${colWidths[8]}; text-align: center; padding: 4px 2px; font-size: 7px; ">${(item.gstRate / 2).toFixed(2)}</td>`;
          row += `<td style="width: ${colWidths[9]}; text-align: center; padding: 4px 2px; font-size: 7px;;">${formatCurrency(item.sgst)}</td>`;
        }

        row += `<td style="width: ${colWidths[totalColumnIndex]}; text-align: center; padding: 4px 2px; font-size: 7px; font-weight: bold; background-color: rgba(3, 113, 193, 0.1);">${formatCurrency(item.total)}</td></tr>`;
        return row;
      }).join('');
  };

  const generateTableHeader = () => {
    let tableHeader = `<tr style="background-color: #2583C6; color: white; font-weight: bold; font-size: 8px;">
        <th style="width: ${colWidths[0]}; text-align: center; padding: 3px; " rowspan="2">Sr.No.</th>
        <th style="width: ${colWidths[1]}; text-align: left; padding: 3px; " rowspan="2">Name of Product/Service</th>
        <th style="width: ${colWidths[2]}; text-align: center; padding: 3px; " rowspan="2">HSN/SAC</th>
        <th style="width: ${colWidths[3]}; text-align: center; padding: 3px; " rowspan="2">Qty</th>
        <th style="width: ${colWidths[4]}; text-align: center; padding: 3px; " rowspan="2">Rate (Rs.)</th>
        <th style="width: ${colWidths[5]}; text-align: center; padding: 3px;  background-color: rgba(3, 113, 193, 0.2);" rowspan="2">Taxable Value (Rs.)</th>`;

    if (showIGST) {
      tableHeader += `<th style="text-align: center; padding: 3px;" colspan="2">IGST</th>`;
      tableHeader += `<th style="width: ${colWidths[totalColumnIndex]}; text-align: center; padding: 3px; background-color: rgba(3, 113, 193, 0.2);" rowspan="2">Total (Rs.)</th></tr>`;
      tableHeader += `<tr style="background-color: #2583C6; color: white; font-weight: bold; font-size: 7px;">`;
      tableHeader += `<th style="width: ${colWidths[6]}; text-align: center; padding: 3px;">%</th>`;
      tableHeader += `<th style="width: ${colWidths[7]}; text-align: center; padding: 3px;">Amount(Rs.)</th>`;
    } else if (showCGSTSGST) {
      tableHeader += `<th style="text-align: center; padding: 3px;" colspan="2">CGST</th>`;
      tableHeader += `<th style="text-align: center; padding: 3px;" colspan="2">SGST</th>`;
      tableHeader += `<th style="width: ${colWidths[totalColumnIndex]}; text-align: center; padding: 3px; background-color: rgba(3, 113, 193, 0.2);" rowspan="2">Total (Rs.)</th></tr>`;
      tableHeader += `<tr style="background-color: #2583C6; color: white; font-weight: bold; font-size: 7px;">`;
      tableHeader += `<th style="width: ${colWidths[6]}; text-align: center; padding: 3px;">%</th>`;
      tableHeader += `<th style="width: ${colWidths[7]}; text-align: center; padding: 3px;">Amount (Rs.)</th>`;
      tableHeader += `<th style="width: ${colWidths[8]}; text-align: center; padding: 3px;">%</th>`;
      tableHeader += `<th style="width: ${colWidths[9]}; text-align: center; padding: 3px;">Amount (Rs.)</th>`;
    } else {
      tableHeader += `<th style="width: ${colWidths[totalColumnIndex]}; text-align: center; padding: 3px; background-color: rgba(3, 113, 193, 0.2);" rowspan="2">Total (Rs.)</th></tr>`;
    }

    tableHeader += `</tr>`;
    return tableHeader;
  };

  const generateHSNRows = () => {
    const hsnSummary = getHsnSummary(itemsWithGST, showIGST, showCGSTSGST);
    return hsnSummary.map((hsnItem) => {
        let row = `<tr style="border-bottom: 1px solid #0371C1;">
          <td style="width: 14%; padding: 2px; font-size: 7px; border-right: 1px solid #0371C1; text-align: center;">${hsnItem.hsnCode}</td>
          <td style="width: 18%; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #0371C1;">${formatCurrency(hsnItem.taxableValue)}</td>`;

        if (showIGST) {
          row += `
            <td style="width: 10%; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #0371C1;">${hsnItem.taxRate}</td>
            <td style="width: 15%; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #0371C1;">${formatCurrency(hsnItem.taxAmount)}</td>
            <td style="width: 25%; text-align: center; padding: 2px; font-size: 7px; font-weight: bold; border-left: 1px solid #bfbfbf;">${formatCurrency(hsnItem.total)}</td>`;
        } else if (showCGSTSGST) {
          row += `
            <td style="width: 6%; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #0371C1;">${(hsnItem.taxRate / 2).toFixed(2)}</td>
            <td style="width: 18%; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #0371C1;">${formatCurrency(hsnItem.cgstAmount)}</td>
            <td style="width: 6%; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #0371C1;">${(hsnItem.taxRate / 2).toFixed(2)}</td>
            <td style="width: 18%; text-align: center; padding: 2px; font-size: 7px; border-right: 1px solid #0371C1;">${formatCurrency(hsnItem.sgstAmount)}</td>
            <td style="width: 20%; text-align: center; padding: 2px; font-size: 7px; font-weight: bold; border-left: 1px solid #0371C1;">${formatCurrency(hsnItem.total)}</td>`;
        } else {
          row += `<td style="width: 30%; text-align: center; padding: 2px; font-size: 7px; font-weight: bold; border-left: 1px solid #0371C1;">${formatCurrency(hsnItem.total)}</td>`;
        }

        row += `</tr>`;
        return row;
      }).join('');
  };

  const generateBottomSection = () => {
    const getTaxColumns = () => {
      if (showIGST) {
        return `
          <th class="hsn-tax-header-cell" style="width: 10%;">IGST %</th>
          <th class="hsn-tax-header-cell" style="width: 15%;">IGST Amount (Rs.)</th>
          <th class="hsn-tax-header-cell" style="width: 25%; border-left: 1px solid white;">Total (Rs.)</th>
        `;
      } else if (showCGSTSGST) {
        return `
          <th class="hsn-tax-header-cell" style="width: 8%;">CGST %</th>
          <th class="hsn-tax-header-cell" style="width: 12%;">CGST Amount(Rs.)</th>
          <th class="hsn-tax-header-cell" style="width: 8%;">SGST %</th>
          <th class="hsn-tax-header-cell" style="width: 12%;">SGST Amount(Rs.)</th>
          <th class="hsn-tax-header-cell" style="width: 25%; border-left: 1px solid white;">Total (Rs.)</th>
        `;
      } else {
        return `
          <th class="hsn-tax-header-cell" style="width: 30%; border-left: 1px solid white;">Total (Rs.)</th>
        `;
      }
    };

    const getTotalRowCells = () => {
      if (showIGST) {
        return `
          <td class="hsn-tax-cell"></td>
          <td class="hsn-tax-cell">${formatCurrency(totalIGST)}</td>
          <td class="hsn-tax-cell" style="border-left: 1px solid #0371C1;">${formatCurrency(totalAmount)}</td>
        `;
      } else if (showCGSTSGST) {
        return `
          <td class="hsn-tax-cell"></td>
          <td class="hsn-tax-cell">${formatCurrency(totalCGST)}</td>
          <td class="hsn-tax-cell"></td>
          <td class="hsn-tax-cell">${formatCurrency(totalSGST)}</td>
          <td class="hsn-tax-cell" style="border-left: 1px solid #0371C1;">${formatCurrency(totalAmount)}</td>
        `;
      } else {
        return `
          <td class="hsn-tax-cell" style="border-left: 1px solid #0371C1;">${formatCurrency(totalAmount)}</td>
        `;
      }
    };

    return `
      <div class="bottom-section">
        <div class="left-section">
          <div class="total-in-words">Total in words : ${safeNumberToWords(totalAmount)}</div>
          ${isGSTApplicable ? `
            <table class="hsn-tax-table">
              <thead>
                <tr>
                  <th class="hsn-tax-header-cell" style="width: 12%;">HSN / SAC</th>
                  <th class="hsn-tax-header-cell" style="width: 18%;">Taxable Value (Rs.)</th>
                  ${getTaxColumns()}
                </tr>
              </thead>
              <tbody>
                ${generateHSNRows()}
                <tr style="font-weight: bold; font-size: 8px;">
                  <td class="hsn-tax-cell">Total</td>
                  <td class="hsn-tax-cell">${formatCurrency(totalTaxable)}</td>
                  ${getTotalRowCells()}
                </tr>
              </tbody>
            </table>
          ` : ''}
        </div>
        
        <div class="right-section">
          <div style="margin-bottom: 10px;">
            <div class="total-row"><div class="label">Taxable Amount</div><div class="value">Rs. ${formatCurrency(totalTaxable)}</div></div>
            ${isGSTApplicable ? `<div class="total-row"><div class="label">Total Tax</div><div class="value">Rs. ${formatCurrency(showIGST ? totalIGST : totalCGST + totalSGST)}</div></div>` : ''}
            <div class="total-row ${isGSTApplicable ? 'highlight-row' : ''}" style="padding-left: 5px; padding-right: 5px; padding-top:5px;">
              <div class="${isGSTApplicable ? 'label-bold' : 'label'}" >${isGSTApplicable ? 'Total Amount After Tax' : 'Total Amount'}</div>
              <div class="${isGSTApplicable ? 'value-bold' : 'value'}">Rs. ${formatCurrency(totalAmount)}</div>
            </div>
            <div class="total-row" style="margin-top: 10px;">
              <div class="label">For ${capitalizeWords(company?.businessName || company?.companyName || 'Company Name')}</div>
              <div class="value">(E & O.E.)</div>
            </div>
          </div>
          
          ${transaction.type !== 'proforma' && isBankDetailAvailable && !shouldHideBankDetails ? `
            <div class="bank-details">
              <div class="bold mb-2">Bank Details:</div>
              ${bankData.bankName ? `<div class="bank-row"><div class="bank-label">Name:</div><div>${capitalizeWords(bankData.bankName)}</div></div>` : ''}
              ${bankData.branchAddress ? `<div class="bank-row"><div class="bank-label">Branch:</div><div>${bankData.branchAddress}</div></div>` : ''}
              ${bankData.accountNo ? `<div class="bank-row"><div class="bank-label">Acc. No:</div><div>${bankData.accountNo}</div></div>` : ''}
              ${bankData.ifscCode ? `<div class="bank-row"><div class="bank-label">IFSC:</div><div>${bankData.ifscCode}</div></div>` : ''}
              ${bankData.upiDetails?.upiId ? `<div class="bank-row"><div class="bank-label">UPI ID:</div><div>${bankData.upiDetails.upiId}</div></div>` : ''}
              ${bankData.upiDetails?.upiName ? `<div class="bank-row"><div class="bank-label">UPI Name:</div><div>${bankData.upiDetails.upiName}</div></div>` : ''}
              ${bankData.upiDetails?.upiMobile ? `<div class="bank-row"><div class="bank-label">UPI Mobile:</div><div>${bankData.upiDetails.upiMobile}</div></div>` : ''}
              ${bankData.qrCode ? `<div style="text-align: center; margin-top: 5px;"><div class="bold mb-2">QR Code</div><img src="${BASE_URL}${bankData.qrCode}" class="qr-code" /></div>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
      ${transaction?.notes ? `<div class="terms-box">${renderNotesHTML(transaction.notes)}</div>` : ''}
    `;
  };

  const generateHTML = () => {
    const itemsPerPage = 34;
    const totalItems = itemsWithGST.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    const baseStyles = `
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #000; font-size: 10px; line-height: 1.1; }
      .page { position: relative; padding: 10px; page-break-inside: avoid; }
      .page-break { page-break-after: always; display: block; }
      .four-columns { display: flex; border: 1px solid #0371C1; }
      .column { flex: 1; border-right: 1px solid #0371C1; padding: 5px; min-height: 100px; }
      .column:last-child { border-right: none; }
      .column-header {  color: black; padding: 2px 2px;  font-weight: bold; font-size: 10px;  }
      .data-row { display: flex; margin-bottom: 3px; margin-top: 2px; font-size: 8px; padding: 1px 2px; }
      .table-label { width: 50px; font-weight: bold; flex-shrink: 0; }
      .table-value { flex: 1; margin-left: 5px; }
      .items-table { width: 100%; border: 1px solid #0371C1; border-collapse: collapse;  }
      .items-table th, .items-table td { border: 1px solid #0371C1; padding: 4px 2px; font-size: 7px; }
      .bottom-section { display: flex;  border: 1px solid #0371C1; }
      .left-section { flex: 2; padding-right: 10px; }
      .right-section { flex: 1; border-left: 1px solid #0371C1;  }
      .total-in-words { font-size: 8px; margin-bottom: 8px; font-weight: bold; margin-top: 5px; padding-top: 5px; }
      .hsn-tax-table { border: 1px solid #0371C1; border-collapse: collapse; width: 102%; margin-bottom: 10px; }
      .hsn-tax-table th, .hsn-tax-table td { border: 1px solid #0371C1; padding: 2px; font-size: 7px; }
      .hsn-tax-header-cell { background-color: #0371C1; color: white; text-align: center; font-weight: bold; padding: 3px; }
      .hsn-tax-cell { text-align: center; padding: 2px; }
      .total-row { display: flex; justify-content: space-between;  font-size: 9px; padding: 6px;  padding-bottom: 0; }
      .label { font-weight: normal; }
      .value { font-weight: normal; }
      .highlight-row { border-top: 1px solid #0371C1; border-bottom: 1px solid #0371C1; padding: 2px 0; margin: 4px 0; font-weight: bold; }
      .label-bold { font-weight: bold; }
      .value-bold { font-weight: bold; }
      .bank-details { font-size: 8px; margin-top: 10px; padding: 5px; border-top: 1px solid #0371C1; }
      .bank-row { display: flex; margin-bottom: 1px; }
      .bank-label { width: 60px; font-weight: bold; flex-shrink: 0; }
      .qr-code { width: 70px; height: 70px; object-fit: contain; }
      .terms-box { border: 1px solid #0371C1; border-top: none; padding: 5px; font-size: 7px; line-height: 1.2; margin-bottom: 10px; }
      .page-number { position: absolute;  margin-top: 20px; right: 10px; font-size: 7px; text-align: right; }
      .bold { font-weight: bold; }
      .mb-2 { margin-bottom: 2px; }
    `;

    if (totalPages <= 1) {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseStyles}</style></head><body style="margin: 0; padding: 0;">
        <div class="page">
          ${generateHeaderHTML()}
          <table class="items-table">
            <thead>${generateTableHeader()}</thead>
            <tbody>
              ${generateItemRows(itemsWithGST, 0)}
              <tr style="font-weight: bold; font-size: 8px;">
                <td style="text-align: center;"></td>
                <td style="text-align: center;"></td>
                <td style="text-align: center; background-color: rgba(3, 113, 193, 0.1);">Total</td>
                <td style="text-align: center; background-color: rgba(3, 113, 193, 0.1);">${totalQty}</td>
                <td style="text-align: center;"></td>
                <td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);">${formatCurrency(totalTaxable)}</td>
                ${showIGST ? `<td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);"></td><td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);">${formatCurrency(totalIGST)}</td>` : ''}
                ${showCGSTSGST ? `<td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);"></td><td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);">${formatCurrency(totalCGST)}</td><td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);"></td><td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);">${formatCurrency(totalSGST)}</td>` : ''}
                <td style="text-align: center; background-color: rgba(3, 113, 193, 0.2); font-weight: bold;">${formatCurrency(totalAmount)}</td>
              </tr>
            </tbody>
          </table>
          ${generateBottomSection()}
        
        </div>
      </body></html>`;
    }
    
    const pages = [];
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const startIndex = pageNum * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
      const pageItems = itemsWithGST.slice(startIndex, endIndex);
      const isLastPage = pageNum === totalPages - 1;
      
      pages.push(`
        <div class="page${!isLastPage ? ' page-break' : ''}">
          ${generateHeaderHTML()}
          <table class="items-table">
            <thead>${generateTableHeader()}</thead>
            <tbody>
              ${generateItemRows(pageItems, startIndex)}
              ${isLastPage ? `
                <tr style="font-weight: bold; font-size: 8px;">
                  <td style="text-align: center;"></td>
                  <td style="text-align: center;"></td>
                  <td style="text-align: center; background-color: rgba(3, 113, 193, 0.1);">Total</td>
                  <td style="text-align: center; background-color: rgba(3, 113, 193, 0.1);">${totalQty}</td>
                  <td style="text-align: center;"></td>
                  <td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);">${formatCurrency(totalTaxable)}</td>
                  ${showIGST ? `<td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);"></td><td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);">${formatCurrency(totalIGST)}</td>` : ''}
                  ${showCGSTSGST ? `<td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);"></td><td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);">${formatCurrency(totalCGST)}</td><td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);"></td><td style="text-align: center; background-color: rgba(3, 113, 193, 0.2);">${formatCurrency(totalSGST)}</td>` : ''}
                  <td style="text-align: center; background-color: rgba(3, 113, 193, 0.2); font-weight: bold;">${formatCurrency(totalAmount)}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
          ${isLastPage ? generateBottomSection() : ''}
          <div class="page-number">${pageNum + 1} / ${totalPages} page</div>
        </div>
      `);
    }

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseStyles}</style></head><body style="margin: 0; padding: 0;">${pages.join('')}</body></html>`;
  };

  return generateHTML();
};

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
      width: 595,
      height: 842,
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