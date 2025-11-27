// Template8PDF.js (React Native HTML-to-PDF version - COMPLETE & UPDATED)
import React from 'react';
import RNHTMLtoPDF from 'react-native-html-to-pdf';

// Import ALL utility functions from web version
import {
  deriveTotals,
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  getItemsBody,
  calculateGST,
  getUnifiedLines,
  getStateCode,
  prepareTemplate8Data,
  numberToWords,
  formatQuantity,
  formatPhoneNumber,
} from './pdf-utils';
import { parseHtmlToElements } from './HtmlNoteRenderer';
import { capitalizeWords } from './utils';
import { BASE_URL } from '../config';

// Add missing utility functions if they don't exist in your pdf-utils
const formatNumber = num => {
  if (!num) return '0';
  return parseFloat(num).toLocaleString('en-IN');
};

const getGstBreakdown = items => {
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  items.forEach(item => {
    totalCGST += item.cgst || 0;
    totalSGST += item.sgst || 0;
    totalIGST += item.igst || 0;
  });

  return { totalCGST, totalSGST, totalIGST };
};

const Template8PDF = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  serviceNameById = new Map(), // ✅ ADDED MISSING PROP WITH DEFAULT
}) => {
  // ✅ ENHANCED ERROR HANDLING
  const prepareData = () => {
    try {
      // Data validation
      if (!transaction) {
        console.warn('No transaction data provided');
        return getFallbackData();
      }

      const result = prepareTemplate8Data(
        transaction,
        company,
        party,
        shippingAddress,
      );

      // Validate result
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

  // ✅ FALLBACK DATA FUNCTION
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
  } = prepareData();

  const logoSrc = company?.logo ? `${BASE_URL}${company.logo}` : null;
  const shouldHideBankDetails = transaction?.type === 'proforma';

  // ✅ ADDED SERVICE NAME MAPPING (Web version jaisa)
  const getItemName = item => {
    if (!item) return 'Unnamed Item';

    try {
      // First check serviceNameById mapping (web version functionality)
      if (serviceNameById && item.serviceId) {
        const serviceName = serviceNameById.get(item.serviceId);
        if (serviceName) return serviceName;
      }

      // Fallback to item name
      return item.name || item.description || 'Unnamed Item';
    } catch (error) {
      console.error('Error getting item name:', error);
      return 'Unnamed Item';
    }
  };

  // Define column widths based on GST applicability - Match web version exactly
  const getColWidths = () => {
    if (!isGSTApplicable) {
      // Non-GST layout: Sr.No, Name, HSN/SAC, Rate, Qty, Taxable Value, Total
      return [35, 150, 60, 60, 50, 100, 135]; // Sum: 590
    } else if (showIGST) {
      // IGST layout: Sr.No, Name, HSN/SAC, Rate, Qty, Taxable Value, IGST%, IGST Amt, Total
      return [35, 120, 50, 70, 80, 90, 44, 90, 100]; // Sum: 590
    } else {
      // CGST/SGST layout: Sr.No, Name, HSN/SAC, Rate, Qty, Taxable Value, CGST%, CGST Amt, SGST%, SGST Amt, Total
      return [
        30, // 0: Sr. No.
        100, // 1: Name of Product / Service
        50, // 2: HSN / SAC
        50, // 3: Rate
        45, // 4: Qty
        60, // 5: Taxable Value
        40, // 6: CGST %
        60, // 7: CGST Amount
        40, // 8: SGST %
        60, // 9: SGST Amount
        70, // 10: Total
      ]; // Sum: 590
    }
  };

  const colWidths = getColWidths();

  // Helper function to get total column index based on GST type
  const getTotalColumnIndex = () => {
    if (!isGSTApplicable) return 6;
    if (showIGST) return 8;
    return 10;
  };

  const totalColumnIndex = getTotalColumnIndex();

  // ✅ ENHANCED HTML NOTES FORMATTING - Match web version functionality
  const formatNotesHtml = notes => {
    if (!notes) return '';

    try {
      // Use the same parsing logic as web version
      const parsedElements = parseHtmlToElements(notes, 8);

      let htmlContent = '';
      parsedElements.forEach((element, index) => {
        switch (element.type) {
          case 'text':
            htmlContent += `<span style="font-size: 8px; color: #333; line-height: 1.4;">${element.content}</span>`;
            break;
          case 'paragraph':
            htmlContent += `<div style="margin-bottom: 4px; font-size: 8px; color: #333; line-height: 1.4;">${element.content}</div>`;
            break;
          case 'bold':
            htmlContent += `<strong style="font-size: 8px; color: #333; font-weight: bold;">${element.content}</strong>`;
            break;
          case 'italic':
            htmlContent += `<em style="font-size: 8px; color: #333; font-style: italic;">${element.content}</em>`;
            break;
          case 'underline':
            htmlContent += `<u style="font-size: 8px; color: #333; text-decoration: underline;">${element.content}</u>`;
            break;
          case 'lineBreak':
            htmlContent += '<br>';
            break;
          case 'listItem':
            htmlContent += `<div style="margin-bottom: 2px; font-size: 8px; color: #333; padding-left: 10px;">• ${element.content}</div>`;
            break;
          default:
            htmlContent += `<span style="font-size: 8px; color: #333;">${element.content}</span>`;
        }
      });

      return htmlContent;
    } catch (error) {
      console.error('Error parsing notes HTML:', error);
      // Enhanced fallback HTML parsing
      return notes
        .replace(/<br\s*\/?>/gi, '<br>')
        .replace(
          /<p>/gi,
          '<div style="margin-bottom: 4px; font-size: 8px; color: #333; line-height: 1.4;">',
        )
        .replace(/<\/p>/gi, '</div>')
        .replace(/<strong>/gi, '<strong style="font-weight: bold;">')
        .replace(/<\/strong>/gi, '</strong>')
        .replace(/<b>/gi, '<strong style="font-weight: bold;">')
        .replace(/<\/b>/gi, '</strong>')
        .replace(/<em>/gi, '<em style="font-style: italic;">')
        .replace(/<\/em>/gi, '</em>')
        .replace(/<i>/gi, '<em style="font-style: italic;">')
        .replace(/<\/i>/gi, '</em>')
        .replace(/<u>/gi, '<u style="text-decoration: underline;">')
        .replace(/<\/u>/gi, '</u>')
        .replace(/<ul>/gi, '<div style="padding-left: 15px;">')
        .replace(/<\/ul>/gi, '</div>')
        .replace(/<li>/gi, '<div style="margin-bottom: 2px;">• ')
        .replace(/<\/li>/gi, '</div>')
        .replace(
          /<h[1-6]>/gi,
          '<div style="font-weight: bold; margin-bottom: 4px;">',
        )
        .replace(/<\/h[1-6]>/gi, '</div>');
    }
  };

  // ✅ SAFE DATA ACCESS FUNCTIONS
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

  // Generate HTML content for the PDF
  const generateHTMLContent = () => {
    const tableHeaders = () => {
      if (!isGSTApplicable) {
        return `
          <th style="${styles.tableCellHeader} width:${colWidths[0]}px; text-align:center;">Sr.No</th>
          <th style="${styles.tableCellHeader} width:${colWidths[1]}px;">Name of Product / Service</th>
          <th style="${styles.tableCellHeader} width:${colWidths[2]}px; text-align:center;">HSN/SAC</th>
          <th style="${styles.tableCellHeader} width:${colWidths[3]}px; text-align:center; font-family: 'Times-Roman';">Rate (Rs.)</th>
          <th style="${styles.tableCellHeader} width:${colWidths[4]}px; text-align:center;">Qty</th>
          <th style="${styles.tableCellHeader} width:${colWidths[5]}px; text-align:center;">Taxable Value (Rs.)</th>
          <th style="${styles.tableCellHeader} width:${colWidths[6]}px; text-align:center;">Total (Rs.)</th>
        `;
      } else if (showIGST) {
        return `
          <th style="${styles.tableCellHeader} width:${colWidths[0]}px; text-align:center;">Sr.No</th>
          <th style="${styles.tableCellHeader} width:${colWidths[1]}px;">Name of Product / Service</th>
          <th style="${styles.tableCellHeader} width:${colWidths[2]}px; text-align:center;">HSN/SAC</th>
          <th style="${styles.tableCellHeader} width:${colWidths[3]}px; text-align:center; font-family: 'Times-Roman';">Rate (Rs.)</th>
          <th style="${styles.tableCellHeader} width:${colWidths[4]}px; text-align:center;">Qty</th>
          <th style="${styles.tableCellHeader} width:${colWidths[5]}px; text-align:center;">Taxable Value (Rs.)</th>
          <th style="${styles.tableCellHeader} width:${colWidths[6]}px; text-align:center;">IGST%</th>
          <th style="${styles.tableCellHeader} width:${colWidths[7]}px; text-align:center;">IGST Amount (Rs.)</th>
          <th style="${styles.tableCellHeader} width:${colWidths[8]}px; text-align:center;">Total (Rs.)</th>
        `;
      } else {
        return `
          <th style="${styles.tableCellHeader} width:${colWidths[0]}px; text-align:center;">Sr.No</th>
          <th style="${styles.tableCellHeader} width:${colWidths[1]}px;">Name of Product / Service</th>
          <th style="${styles.tableCellHeader} width:${colWidths[2]}px; text-align:center;">HSN/SAC</th>
          <th style="${styles.tableCellHeader} width:${colWidths[3]}px; text-align:center; font-family: 'Times-Roman';">Rate (Rs.)</th>
          <th style="${styles.tableCellHeader} width:${colWidths[4]}px; text-align:center;">Qty</th>
          <th style="${styles.tableCellHeader} width:${colWidths[5]}px; text-align:center;">Taxable Value (Rs.)</th>
          <th style="${styles.tableCellHeader} width:${colWidths[6]}px; text-align:center;">CGST%</th>
          <th style="${styles.tableCellHeader} width:${colWidths[7]}px; text-align:center;">CGST Amount (Rs.)</th>
          <th style="${styles.tableCellHeader} width:${colWidths[8]}px; text-align:center;">SGST%</th>
          <th style="${styles.tableCellHeader} width:${colWidths[9]}px; text-align:center;">SGST Amount (Rs.)</th>
          <th style="${styles.tableCellHeader} width:${colWidths[10]}px; text-align:center;">Total (Rs.)</th>
        `;
      }
    };

    const tableRows =
      itemsWithGST && itemsWithGST.length > 0
        ? itemsWithGST
            .map((item, index) => {
              const itemName = getItemName(item); // ✅ USING SERVICE MAPPING

              if (!isGSTApplicable) {
                return `
            <tr style="${styles.tableRow}">
              <td style="${styles.tableCell} width:${
                  colWidths[0]
                }px; text-align:center;">${index + 1}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[1]
                }px; text-align:left;">${capitalizeWords(itemName)}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[2]
                }px; text-align:center;">${
                  item.code || item.hsnCode || '-'
                }</td>
              <td style="${styles.tableCell} width:${
                  colWidths[3]
                }px; text-align:center; font-family: 'Times-Roman';">${formatCurrency(
                  item.pricePerUnit || item.rate || 0,
                )}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[4]
                }px; text-align:center;">${
                  item.itemType === 'service' || item.type === 'service'
                    ? '-'
                    : formatQuantity(item.quantity || 0, item.unit)
                }</td>
              <td style="${styles.tableCell} width:${
                  colWidths[5]
                }px; text-align:center;">${formatCurrency(
                  item.taxableValue || item.amount || 0,
                )}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[6]
                }px; text-align:center;">${formatCurrency(
                  item.total || item.amount || 0,
                )}</td>
            </tr>
          `;
              } else if (showIGST) {
                return `
            <tr style="${styles.tableRow}">
              <td style="${styles.tableCell} width:${
                  colWidths[0]
                }px; text-align:center;">${index + 1}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[1]
                }px; text-align:left;">${capitalizeWords(itemName)}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[2]
                }px; text-align:center;">${
                  item.code || item.hsnCode || '-'
                }</td>
              <td style="${styles.tableCell} width:${
                  colWidths[3]
                }px; text-align:center; font-family: 'Times-Roman';">${formatCurrency(
                  item.pricePerUnit || item.rate || 0,
                )}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[4]
                }px; text-align:center;">${
                  item.itemType === 'service' || item.type === 'service'
                    ? '-'
                    : formatQuantity(item.quantity || 0, item.unit)
                }</td>
              <td style="${styles.tableCell} width:${
                  colWidths[5]
                }px; text-align:center;">${formatCurrency(
                  item.taxableValue || item.amount || 0,
                )}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[6]
                }px; text-align:center;">${(
                  item.gstRate ||
                  item.taxRate ||
                  0
                ).toFixed(2)}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[7]
                }px; text-align:center;">${formatCurrency(item.igst || 0)}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[8]
                }px; text-align:center;">${formatCurrency(
                  item.total || item.amount || 0,
                )}</td>
            </tr>
          `;
              } else {
                return `
            <tr style="${styles.tableRow}">
              <td style="${styles.tableCell} width:${
                  colWidths[0]
                }px; text-align:center;">${index + 1}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[1]
                }px; text-align:left;">${capitalizeWords(itemName)}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[2]
                }px; text-align:center;">${
                  item.code || item.hsnCode || '-'
                }</td>
              <td style="${styles.tableCell} width:${
                  colWidths[3]
                }px; text-align:center; font-family: 'Times-Roman';">${formatCurrency(
                  item.pricePerUnit || item.rate || 0,
                )}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[4]
                }px; text-align:center;">${
                  item.itemType === 'service' || item.type === 'service'
                    ? '-'
                    : formatQuantity(item.quantity || 0, item.unit)
                }</td>
              <td style="${styles.tableCell} width:${
                  colWidths[5]
                }px; text-align:center;">${formatCurrency(
                  item.taxableValue || item.amount || 0,
                )}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[6]
                }px; text-align:center;">${(
                  (item.gstRate || item.taxRate || 0) / 2
                ).toFixed(2)}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[7]
                }px; text-align:center;">${formatCurrency(item.cgst || 0)}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[8]
                }px; text-align:center;">${(
                  (item.gstRate || item.taxRate || 0) / 2
                ).toFixed(2)}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[9]
                }px; text-align:center;">${formatCurrency(item.sgst || 0)}</td>
              <td style="${styles.tableCell} width:${
                  colWidths[10]
                }px; text-align:center;">${formatCurrency(
                  item.total || item.amount || 0,
                )}</td>
            </tr>
          `;
              }
            })
            .join('')
        : `<tr><td colspan="${totalColumnIndex + 1}" style="${
            styles.tableCell
          } text-align:center;">No items found</td></tr>`;

    // Format notes if they exist
    const formattedNotes = getTransactionValue('notes')
      ? formatNotesHtml(getTransactionValue('notes'))
      : '';

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
          <!-- Header Section -->
          <div class="header">
            <div class="header-content">
              <div class="header-text">
                <div class="title">${
                  getTransactionValue('type') === 'proforma'
                    ? 'PROFORMA INVOICE'
                    : isGSTApplicable
                    ? 'TAX INVOICE'
                    : 'INVOICE'
                }</div>
                <div class="companyName">${capitalizeWords(
                  getCompanyValue('businessName') ||
                    getCompanyValue('companyName') ||
                    'Company Name',
                )}</div>
                <div class="companyDetails">
                  ${
                    getCompanyValue('gstin')
                      ? `
                    <div class="addressText">
                      <span class="boldText">GSTIN </span>
                      <span style="color: #3d3d3d; font-weight: 600;">${getCompanyValue(
                        'gstin',
                      )}</span>
                    </div>
                  `
                      : ''
                  }
                  <div class="addressText">${capitalizeWords(
                    getCompanyValue('address') || 'Address Line 1',
                  )}</div>
                  <div class="addressText">${capitalizeWords(
                    getCompanyValue('City') || 'City',
                  )}</div>
                  <div class="addressText">${capitalizeWords(
                    getCompanyValue('addressState') || 'State',
                  )} - ${getCompanyValue('Pincode') || 'Pincode'}</div>
                  <div class="addressText">
                    <span class="boldText">Phone </span>
                    <span>${
                      getCompanyValue('mobileNumber')
                        ? formatPhoneNumber(getCompanyValue('mobileNumber'))
                        : getCompanyValue('Telephone')
                        ? formatPhoneNumber(getCompanyValue('Telephone'))
                        : 'Phone'
                    }</span>
                  </div>
                </div>
              </div>
              ${logoSrc ? `<img src="${logoSrc}" class="logo" />` : ''}
            </div>
          </div>

          <div class="dividerBlue"></div>

          <!-- Two Column Section -->
          <div class="twoColumnSection">
            <!-- Left Side - Address Sections -->
            <div class="leftColumn">
              <!-- Customer Details - Top Section -->
              <div class="addressSection">
                <div class="sectionHeader">Details of Buyer | Billed to :</div>
                <div class="partyName">${capitalizeWords(
                  getPartyValue('name') || 'N/A',
                )}</div>
                <div class="addressText" style="width: 70%;">${capitalizeWords(
                  getBillingAddress(party),
                )}</div>
                ${
                  getPartyValue('contactNumber')
                    ? `
                  <div class="addressText">
                    <span class="boldText">Phone: </span>
                    <span>${formatPhoneNumber(
                      getPartyValue('contactNumber'),
                    )}</span>
                  </div>
                `
                    : ''
                }
                <div class="addressText">
                  <span class="boldText">GSTIN: </span>
                  <span>${getPartyValue('gstin') || '-'}</span>
                </div>
                <div class="addressText">
                  <span class="boldText">PAN: </span>
                  <span>${getPartyValue('pan') || '-'}</span>
                </div>
                <div class="row">
                  <span class="boldText" style="margin-right: 5px;">Place of Supply:</span>
                  <span>${
                    shippingAddress?.state
                      ? `${shippingAddress.state} (${
                          getStateCode(shippingAddress.state) || '-'
                        })`
                      : getPartyValue('state')
                      ? `${getPartyValue('state')} (${
                          getStateCode(getPartyValue('state')) || '-'
                        })`
                      : '-'
                  }</span>
                </div>
              </div>

              <!-- Shipping Address - Bottom Section -->
              <div class="addressSection">
                <div class="sectionHeader">Details of Consigned | Shipped to :</div>
                <div class="partyName">${capitalizeWords(
                  shippingAddress?.label || getPartyValue('name') || 'N/A',
                )}</div>
                <div class="addressText">${capitalizeWords(
                  getShippingAddress(shippingAddress, getBillingAddress(party)),
                )}</div>
                ${
                  getCompanyValue('Country')
                    ? `
                  <div class="addressText">
                    <span class="boldText">Country: </span>
                    <span>${getCompanyValue('Country')}</span>
                  </div>
                `
                    : ''
                }
                ${
                  getPartyValue('contactNumber')
                    ? `
                  <div class="addressText">
                    <span class="boldText">Phone: </span>
                    <span>${formatPhoneNumber(
                      getPartyValue('contactNumber'),
                    )}</span>
                  </div>
                `
                    : ''
                }
                <div class="addressText">
                  <span class="boldText">GSTIN: </span>
                  <span>${getPartyValue('gstin') || '-'}</span>
                </div>
                <div class="addressText">
                  <span class="boldText">State: </span>
                  <span>${
                    shippingAddress?.state
                      ? `${shippingAddress.state} (${
                          getStateCode(shippingAddress.state) || '-'
                        })`
                      : getPartyValue('state')
                      ? `${getPartyValue('state')} (${
                          getStateCode(getPartyValue('state')) || '-'
                        })`
                      : '-'
                  }</span>
                </div>
              </div>
            </div>

            <!-- Right Side - Invoice Details -->
            <div class="rightColumn">
              <div class="invoiceDetail">
                <span class="boldText">Invoice #:</span>
                <span>${
                  getTransactionValue('invoiceNumber')?.toString() || 'N/A'
                }</span>
              </div>
              <div class="invoiceDetail">
                <span class="boldText">Invoice Date:</span>
                <span class="boldText">${
                  getTransactionValue('date')
                    ? new Date(getTransactionValue('date')).toLocaleDateString(
                        'en-GB',
                      )
                    : 'N/A'
                }</span>
              </div>
              <div class="invoiceDetail">
                <span class="boldText">P.O. No.:</span>
                <span>${getTransactionValue('poNumber') || '-'}</span>
              </div>
              <div class="invoiceDetail">
                <span class="boldText">P.O. Date:</span>
                <span>${
                  getTransactionValue('poDate')
                    ? new Date(
                        getTransactionValue('poDate'),
                      ).toLocaleDateString('en-GB')
                    : '-'
                }</span>
              </div>
              ${
                isGSTApplicable
                  ? `
                <div class="invoiceDetail">
                  <span class="boldText">E-Way No.:</span>
                  <span>${getTransactionValue('ewayNumber') || '-'}</span>
                </div>
              `
                  : ''
              }
            </div>
          </div>

          <!-- Items Table -->
          <table class="table">
            <thead>
              <tr>
                ${tableHeaders()}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="dividerLight"></div>

          <!-- Footer Content -->
          <div class="footer">
            <div class="totalsSection">
              <div class="totalsLeft">
                <div class="totalItems">Total Items / Qty : ${totalItems} / ${totalQty}</div>
              </div>
              <div class="totalsRight">
                ${
                  isGSTApplicable
                    ? `
                  ${
                    showIGST
                      ? `
                    <div class="totalsRow">
                      <span class="boldText">IGST</span>
                      <span>
                        <span class="smallRs">Rs</span>
                        <span style="font-size: 9px;">
                          ${totalIGST.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </span>
                    </div>
                  `
                      : ''
                  }
                  ${
                    showCGSTSGST
                      ? `
                    <div class="totalsRow">
                      <span class="boldText">CGST</span>
                      <span>
                        <span class="smallRs">Rs</span>
                        <span style="font-size: 9px;">
                          ${totalCGST.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </span>
                    </div>
                    <div class="totalsRow">
                      <span class="boldText">SGST</span>
                      <span>
                        <span class="smallRs">Rs</span>
                        <span style="font-size: 9px;">
                          ${totalSGST.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </span>
                    </div>
                  `
                      : ''
                  }
                `
                    : ''
                }
                <div class="totalsRow finalTotal">
                  <span class="boldText">${
                    isGSTApplicable ? 'Total Amount After Tax' : 'Total Amount'
                  }</span>
                  <span>
                    <span class="smallRs">Rs</span>
                    <span style="font-size: 9px;">
                      ${totalAmount.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Total in words -->
            <div class="totalInWords">
              <span class="boldText">Total in words : </span>
              <span>${numberToWords(totalAmount)}</span>
            </div>

            <div class="divider"></div>

            <!-- Payment Section -->
            ${
              !shouldHideBankDetails
                ? `
              <div class="paymentSection">
                <div class="bankDetails">
                  <div class="boldText bankTitle">Bank Details:</div>
                  ${
                    bank && typeof bank === 'object' && bank.bankName
                      ? `
                    ${
                      bank.bankName
                        ? `
                      <div class="bankRow">
                        <span class="boldText">Name:</span>
                        <span>${capitalizeWords(bank.bankName)}</span>
                      </div>
                    `
                        : ''
                    }
                    ${
                      bank.branchAddress
                        ? `
                      <div class="bankRow">
                        <span class="boldText">Branch:</span>
                        <span>${capitalizeWords(bank.branchAddress)}</span>
                      </div>
                    `
                        : ''
                    }
                    ${
                      bank.ifscCode
                        ? `
                      <div class="bankRow">
                        <span class="boldText">IFSC:</span>
                        <span>${capitalizeWords(bank.ifscCode)}</span>
                      </div>
                    `
                        : ''
                    }
                    ${
                      bank.accountNo
                        ? `
                      <div class="bankRow">
                        <span class="boldText">Acc. No:</span>
                        <span>${bank.accountNo}</span>
                      </div>
                    `
                        : ''
                    }
                    ${
                      bank.upiDetails?.upiId
                        ? `
                      <div class="bankRow">
                        <span class="boldText">UPI ID:</span>
                        <span>${bank.upiDetails?.upiId}</span>
                      </div>
                    `
                        : ''
                    }
                    ${
                      bank.upiDetails?.upiName
                        ? `
                      <div class="bankRow">
                        <span class="boldText">UPI Name:</span>
                        <span>${bank.upiDetails?.upiName}</span>
                      </div>
                    `
                        : ''
                    }
                    ${
                      bank.upiDetails?.upiMobile
                        ? `
                      <div class="bankRow">
                        <span class="boldText">UPI Mobile:</span>
                        <span>${bank.upiDetails?.upiMobile}</span>
                      </div>
                    `
                        : ''
                    }
                  `
                      : '<div class="noBankDetails">No bank details available</div>'
                  }
                </div>

                ${
                  bank?.qrCode
                    ? `
                  <div class="qrCodeSection">
                    <div class="boldText qrTitle">QR Code</div>
                    <div style="background-color: #fff;">
                      <img src="${BASE_URL}${bank.qrCode}" class="qrCode" />
                    </div>
                  </div>
                `
                    : ''
                }

                <div class="signatureSection">
                  <div class="forCompany">For ${capitalizeWords(
                    getCompanyValue('businessName') || 'Company',
                  )}</div>
                  <div class="signatureBox"></div>
                  <div class="signatoryText">Authorised Signatory</div>
                </div>
              </div>
            `
                : ''
            }

            ${
              getTransactionValue('notes')
                ? `
              <div class="notesSection">
                <div class="boldText notesTitle"></div>
                <div class="notesContent">${formattedNotes}</div>
              </div>
            `
                : ''
            }
          </div>

          <!-- Page Number -->
          <div class="pageNumber">
            <span class="pageNumberText">Page 1</span>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return generateHTMLContent();
};

// Enhanced CSS styles matching the original template8Styles exactly
const styles = {
  css: `
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
    
    body {
      font-family: 'Helvetica', Arial, sans-serif;
      font-size: 10px;
      color: #333;
      margin: 0;
      padding: 25px;
      padding-bottom: 34px;
      line-height: 1.3;
      background: #FFFFFF;
    }
    .page {
      width: 100%;
      max-width: 595px;
      margin: 0 auto;
      position: relative;
      min-height: 842px;
    }
    .header {
      margin-bottom: 0;
      position: relative;
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-text {
      flex: 1;
      text-align: center;
    }
    .title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #2583C6;
    }
    .companyName {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #232323;
    }
    .companyDetails {
      margin-bottom: 10px;
    }
    .addressText {
      font-size: 9px;
      margin-bottom: 3px;
      color: #262626;
      line-height: 1.2;
    }
    .boldText {
      font-weight: bold;
      font-size: 8px;
    }
    .logo {
      width: 70px;
      height: 70px;
      object-fit: contain;
      position: absolute;
      right: 0;
      top: 0;
    }
    .dividerBlue {
      height: 3px;
      background-color: #2583C6;
      margin: 8px 0;
      margin-bottom: 6px;
      width: 100%;
    }
    .divider {
      height: 2px;
      background-color: #bfbfbf;
      margin: 10px 0;
      margin-bottom: 6px;
      width: 100%;
    }
    .dividerLight {
      height: 1px;
      background-color: #d3d3d3;
      margin: 10px 0;
      width: 100%;
    }
    .twoColumnSection {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      gap: 15px;
    }
    .leftColumn {
      flex: 2;
      padding-right: 10px;
    }
    .rightColumn {
      width: 30%;
      text-align: right;
    }
    .addressSection {
      margin-bottom: 15px;
    }
    .sectionHeader {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 6px;
      color: #262626;
    }
    .partyName {
      font-size: 10px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #262626;
    }
    .row {
      display: flex;
      align-items: center;
      margin-bottom: 3px;
    }
    .invoiceDetail {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      padding: 2px 0;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      border: 1px solid #bfbfbf;
    }
    .tableCellHeader {
      background-color: #2583C6 !important;
      color: #FFFFFF !important;
      padding: 4px;
      border: 1px solid #ffffff;
      font-weight: bold;
      font-size: 7px;
      text-align: center;
    }
    .tableRow {
      border-bottom: 1px solid #bfbfbf;
    }
    .tableCell {
      padding: 4px;
      border-right: 1px solid #bfbfbf;
      font-size: 7px;
      color: #262626;
      vertical-align: top;
    }
    .tableCell:last-child {
      border-right: none;
    }
    .footer {
      margin-top: 8px;
    }
    .totalsSection {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      align-items: flex-start;
    }
    .totalsLeft {
      flex: 1;
    }
    .totalItems {
      font-size: 8px;
      color: #333;
    }
    .totalsRight {
      text-align: right;
      min-width: 200px;
    }
    .totalsRow {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      padding: 2px 0;
      gap: 32px;
    }
    .totalsRow.finalTotal {
      font-weight: bold;
    }
    .smallRs {
      font-size: 10px;
      margin-right: 2px;
    }
    .totalInWords {
      font-size: 8px;
      margin: 8px 0;
      margin-top: 4px;
    }
    .paymentSection {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      align-items: flex-start;
      gap: 15px;
      flex-wrap: wrap;
    }
    .bankDetails {
      width: 240px;
    }
    .bankTitle {
      font-size: 8px;
      margin-bottom: 8px;
      text-align: left;
    }
    .bankRow {
      display: flex;
      margin-bottom: 1px;
    }
    .bankRow .boldText {
      width: 70px;
      text-align: left;
      flex-shrink: 0;
    }
    .bankRow span:last-child {
      width: 150px;
      text-align: left;
    }
    .noBankDetails {
      font-size: 8px;
      color: #666;
    }
    .qrCodeSection {
      text-align: center;
      padding: 5px;
    }
    .qrTitle {
      font-size: 9px;
      margin-bottom: 3px;
      color: #333;
    }
    .qrCode {
      width: 80px;
      height: 80px;
      object-fit: contain;
    }
    .signatureSection {
      width: 210px;
      margin-top: 10px;
      text-align: right;
    }
    .forCompany {
      font-size: 9px;
      margin-bottom: 5px;
    }
    .signatureBox {
      width: 100px;
      height: 50px;
      border: 1px solid #ddd;
      margin: 5px 0;
      margin-left: auto;
    }
    .signatoryText {
      font-size: 9px;
      margin-top: 5px;
      text-align: center;
    }
    .notesSection {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 3px solid #2583C6;
    }
    .notesTitle {
      font-size: 8px;
      margin-bottom: 6px;
      color: #2583C6;
    }
    .notesContent {
      font-size: 8px;
      color: #333;
      line-height: 1.4;
    }
    .pageNumber {
      position: absolute;
      bottom: -20px;
      right: 24px;
      font-size: 8px;
      text-align: right;
    }
    .pageNumberText {
      font-size: 8px;
    }
  `,
};

// ✅ UPDATED generatePdfForTemplate8 function with all parameters from web version
export const generatePdfForTemplate8 = async (
  transaction,
  company,
  party,
  serviceNameById = new Map(), // ✅ ADDED MISSING PARAMETER WITH DEFAULT
  shippingAddress,
  bank,
) => {
  try {
    // Enhanced validation
    if (!transaction) {
      throw new Error('Transaction data is required for PDF generation');
    }

    const HTMLContent = Template8PDF({
      transaction,
      company: company || {},
      party: party || {},
      shippingAddress,
      bank,
      serviceNameById, // ✅ PASSING THE MISSING PROP
    });

    const options = {
      html: HTMLContent,
      fileName: `invoice_${
        transaction?.invoiceNumber || 'document'
      }_${Date.now()}`,
      directory: 'Documents',
      base64: false,
      height: 842, // A4 height in points
      width: 595, // A4 width in points
    };

    const file = await RNHTMLtoPDF.convert(options);

    if (!file || !file.filePath) {
      throw new Error('PDF generation failed - no file path returned');
    }

    console.log('PDF generated successfully:', file.filePath);
    return file;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

export default Template8PDF;
