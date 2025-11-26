// pdf-templateA5-3.js
import React from 'react';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import {
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  prepareTemplate8Data,
  getStateCode,
  numberToWords,
  getHsnSummary,
  formatQuantity,
  formatPhoneNumber,
} from './pdf-utils';
import { capitalizeWords, parseNotesHtml } from './utils';
import { parseHtmlToElements } from './HtmlNoteRenderer';
import { BASE_URL } from '../config';

const getClientName = client => {
  if (!client) return 'Client Name';
  if (typeof client === 'string') return client;
  return client.companyName || client.contactName || 'Client Name';
};

// Enhanced HTML notes formatting
const formatNotesHtml = notes => {
  if (!notes) return '';

  try {
    const parsedElements = parseHtmlToElements(notes, 7);

    let htmlContent = '';
    parsedElements.forEach((element, index) => {
      switch (element.type) {
        case 'text':
          htmlContent += `<span style="font-size: 7px; color: #333; line-height: 1.4;">${element.content}</span>`;
          break;
        case 'paragraph':
          htmlContent += `<div style="margin-bottom: 3px; font-size: 7px; color: #333; line-height: 1.4;">${element.content}</div>`;
          break;
        case 'bold':
          htmlContent += `<strong style="font-size: 7px; color: #333; font-weight: bold;">${element.content}</strong>`;
          break;
        case 'italic':
          htmlContent += `<em style="font-size: 7px; color: #333; font-style: italic;">${element.content}</em>`;
          break;
        case 'underline':
          htmlContent += `<u style="font-size: 7px; color: #333; text-decoration: underline;">${element.content}</u>`;
          break;
        case 'lineBreak':
          htmlContent += '<br>';
          break;
        case 'listItem':
          htmlContent += `<div style="margin-bottom: 2px; font-size: 7px; color: #333; padding-left: 8px;">• ${element.content}</div>`;
          break;
        default:
          htmlContent += `<span style="font-size: 7px; color: #333;">${element.content}</span>`;
      }
    });

    return htmlContent;
  } catch (error) {
    console.error('Error parsing notes HTML:', error);
    // Fallback to basic replacement
    return notes
      .replace(/<br\s*\/?>/gi, '<br>')
      .replace(
        /<p>/gi,
        '<div style="margin-bottom: 3px; font-size: 7px; color: #333; line-height: 1.4;">',
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
      .replace(/<ul>/gi, '<div style="padding-left: 12px;">')
      .replace(/<\/ul>/gi, '</div>')
      .replace(/<li>/gi, '<div style="margin-bottom: 2px;">• ')
      .replace(/<\/li>/gi, '</div>');
  }
};

const TemplateA5_3PDF = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  client,
  serviceNameById = new Map(),
}) => {
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
        shippingAddress,
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
    totalItems,
    totalQty,
    itemsWithGST,
    totalCGST,
    totalSGST,
    totalIGST,
    isGSTApplicable,
    showIGST,
    showCGSTSGST,
    showNoTax,
  } = preparedData;

  const logoSrc = company?.logo ? `${BASE_URL}${company.logo}` : null;
  const bankData = bank || {};
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.qrCode ||
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

  // Column Width Logic
  const colWidthsIGST = ['5%', '22%', '11%', '8%', '11%', '15%', '16%', '12%'];
  const colWidthsCGSTSGST = [
    '5%',
    '20%',
    '11%',
    '8%',
    '10%',
    '11%',
    '11%',
    '12%',
    '12%',
  ];
  const colWidthsNoTax = ['6%', '32%', '12%', '10%', '11%', '14%', '15%'];

  const colWidths = showIGST
    ? colWidthsIGST
    : showCGSTSGST
    ? colWidthsCGSTSGST
    : colWidthsNoTax;

  const totalColumnIndex = showIGST ? 7 : showCGSTSGST ? 8 : 6;

  // Generate table headers based on GST type
  const generateTableHeaders = () => {
    if (!isGSTApplicable || showNoTax) {
      return `
        <th style="${styles.tableCellHeader} width:${colWidths[0]}">Sr. No.</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellLeft} width:${colWidths[1]}">Name of Product/Service</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellCenter} width:${colWidths[2]}">HSN/SAC</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellCenter} width:${colWidths[3]}">Qty</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellCenter} width:${colWidths[4]}">Rate (Rs.)</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellCenter} width:${colWidths[5]}">Taxable Value (Rs.)</th>
        <th style="${styles.tableCellHeader} width:${colWidths[6]}">Total (Rs.)</th>
      `;
    } else if (showIGST) {
      return `
        <th style="${styles.tableCellHeader} width:${colWidths[0]}">Sr. No.</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellLeft} width:${colWidths[1]}">Name of Product/Service</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellCenter} width:${colWidths[2]}">HSN/SAC</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellCenter} width:${colWidths[3]}">Qty</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellCenter} width:${colWidths[4]}">Rate (Rs.)</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellCenter} width:${colWidths[5]}">Taxable Value (Rs.)</th>
        <th style="${styles.igstHeader} width:${colWidths[6]}">
          <div class="igst-main-header">IGST</div>
          <div class="igst-sub-header">
            <span class="igst-sub-percentage">%</span>
            <span class="igst-sub-text">Amount (Rs.)</span>
          </div>
        </th>
        <th style="${styles.tableCellHeader} width:${colWidths[7]}">Total (Rs.)</th>
      `;
    } else {
      return `
        <th style="${styles.tableCellHeader} width:${colWidths[0]}">Sr. No.</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellLeft} width:${colWidths[1]}">Name of Product/Service</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellCenter} width:${colWidths[2]}">HSN/SAC</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellCenter} width:${colWidths[3]}">Qty</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellCenter} width:${colWidths[4]}">Rate (Rs.)</th>
        <th style="${styles.tableCellHeader} ${styles.tableCellCenter} width:${colWidths[5]}">Taxable Value (Rs.)</th>
        <th style="${styles.igstHeader} width:${colWidths[6]}">
          <div class="igst-main-header">CGST</div>
          <div class="igst-sub-header">
            <span class="igst-sub-percentage">%</span>
            <span class="igst-sub-text">Amount (Rs.)</span>
          </div>
        </th>
        <th style="${styles.igstHeader} width:${colWidths[7]}">
          <div class="igst-main-header">SGST</div>
          <div class="igst-sub-header">
            <span class="igst-sub-percentage">%</span>
            <span class="igst-sub-text">Amount (Rs.)</span>
          </div>
        </th>
        <th style="${styles.tableCellHeader} width:${colWidths[8]}">Total (Rs.)</th>
      `;
    }
  };

  // Generate table rows
  const generateTableRows = () => {
    if (!itemsWithGST || itemsWithGST.length === 0) {
      return '<tr><td colspan="9" style="padding: 8px; text-align: center; border: 0.5px solid #0371C1;">No items found</td></tr>';
    }

    return itemsWithGST
      .map((item, index) => {
        const itemName = getItemName(item);

        if (!isGSTApplicable || showNoTax) {
          return `
          <tr style="${styles.tableRow}">
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[0]
          }">${index + 1}</td>
            <td style="${styles.tableCell} ${styles.tableCellLeft} width:${
            colWidths[1]
          }">${capitalizeWords(itemName)}</td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[2]
          }">${item.code || '-'}</td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[3]
          }">${
            item.itemType === 'service'
              ? '-'
              : formatQuantity(item.quantity || 0, item.unit)
          }</td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[4]
          }">${formatCurrency(item.pricePerUnit || 0)}</td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[5]
          }">${formatCurrency(item.taxableValue)}</td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[6]
          }">${formatCurrency(item.total)}</td>
          </tr>
        `;
        } else if (showIGST) {
          return `
          <tr style="${styles.tableRow}">
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[0]
          }">${index + 1}</td>
            <td style="${styles.tableCell} ${styles.tableCellLeft} width:${
            colWidths[1]
          }">${capitalizeWords(itemName)}</td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[2]
          }">${item.code || '-'}</td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[3]
          }">${
            item.itemType === 'service'
              ? '-'
              : formatQuantity(item.quantity || 0, item.unit)
          }</td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[4]
          }">${formatCurrency(item.pricePerUnit || 0)}</td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[5]
          }">${formatCurrency(item.taxableValue)}</td>
            <td style="${styles.igstCell} width:${colWidths[6]}">
              <span class="igst-percent">${item.gstRate}</span>
              <span class="igst-amount">${formatCurrency(item.igst)}</span>
            </td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[7]
          }">${formatCurrency(item.total)}</td>
          </tr>
        `;
        } else {
          return `
          <tr style="${styles.tableRow}">
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[0]
          }">${index + 1}</td>
            <td style="${styles.tableCell} ${styles.tableCellLeft} width:${
            colWidths[1]
          }">${capitalizeWords(itemName)}</td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[2]
          }">${item.code || '-'}</td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[3]
          }">${
            item.itemType === 'service'
              ? '-'
              : formatQuantity(item.quantity || 0, item.unit)
          }</td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[4]
          }">${formatCurrency(item.pricePerUnit || 0)}</td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[5]
          }">${formatCurrency(item.taxableValue)}</td>
            <td style="${styles.igstCell} width:${colWidths[6]}">
              <span class="igst-percent">${(item.gstRate / 2).toFixed(2)}</span>
              <span class="igst-amount">${formatCurrency(item.cgst)}</span>
            </td>
            <td style="${styles.igstCell} width:${colWidths[7]}">
              <span class="igst-percent">${(item.gstRate / 2).toFixed(2)}</span>
              <span class="igst-amount">${formatCurrency(item.sgst)}</span>
            </td>
            <td style="${styles.tableCell} ${styles.tableCellCenter} width:${
            colWidths[8]
          }">${formatCurrency(item.total)}</td>
          </tr>
        `;
        }
      })
      .join('');
  };

  // Generate HSN Summary table
  const generateHsnSummary = () => {
    if (!isGSTApplicable) return '';

    const hsnSummary = getHsnSummary(itemsWithGST, showIGST, showCGSTSGST);

    const hsnColWidths = showIGST
      ? ['25%', '20%', '30%', '25%']
      : showCGSTSGST
      ? ['18%', '20%', '22%', '22%', '18%']
      : ['40%', '30%', '30%'];

    const hsnTotalColumnIndex = showIGST ? 3 : showCGSTSGST ? 4 : 2;

    return `
      <div class="hsn-tax-table">
        <div class="hsn-tax-table-header">
          <div class="hsn-tax-header-cell" style="width: ${
            hsnColWidths[0]
          }">HSN / SAC</div>
          <div class="hsn-tax-header-cell" style="width: ${
            hsnColWidths[1]
          }">Taxable Value (Rs.)</div>
          ${
            showIGST
              ? `
            <div class="igst-header" style="width: ${hsnColWidths[2]}">
              <div class="igst-main-header">IGST</div>
              <div class="igst-sub-header">
                <span class="igst-sub-percentage">%</span>
                <span class="igst-sub-text">Amount (Rs.)</span>
              </div>
            </div>
          `
              : ''
          }
          ${
            showCGSTSGST
              ? `
            <div class="igst-header" style="width: ${hsnColWidths[2]}">
              <div class="igst-main-header">CGST</div>
              <div class="igst-sub-header">
                <span class="igst-sub-percentage">%</span>
                <span class="igst-sub-text">Amount (Rs.)</span>
              </div>
            </div>
            <div class="igst-header" style="width: ${hsnColWidths[3]}">
              <div class="igst-main-header">SGST</div>
              <div class="igst-sub-header">
                <span class="igst-sub-percentage">%</span>
                <span class="igst-sub-text">Amount (Rs.)</span>
              </div>
            </div>
          `
              : ''
          }
          <div class="hsn-tax-header-cell" style="width: ${
            hsnColWidths[hsnTotalColumnIndex]
          }">Total (Rs.)</div>
        </div>

        ${hsnSummary
          .map(
            (hsnItem, index) => `
          <div class="hsn-tax-table-row">
            <div class="hsn-tax-cell" style="width: ${hsnColWidths[0]}">${
              hsnItem.hsnCode
            }</div>
            <div class="hsn-tax-cell" style="width: ${
              hsnColWidths[1]
            }">${formatCurrency(hsnItem.taxableValue)}</div>
            ${
              showIGST
                ? `
              <div class="igst-cell" style="width: ${hsnColWidths[2]}">
                <span class="igst-percent">${hsnItem.taxRate}</span>
                <span class="igst-amount">${formatCurrency(
                  hsnItem.taxAmount,
                )}</span>
              </div>
            `
                : ''
            }
            ${
              showCGSTSGST
                ? `
              <div class="igst-cell" style="width: ${hsnColWidths[2]}">
                <span class="igst-percent">${(hsnItem.taxRate / 2).toFixed(
                  2,
                )}</span>
                <span class="igst-amount">${formatCurrency(
                  hsnItem.cgstAmount,
                )}</span>
              </div>
              <div class="igst-cell" style="width: ${hsnColWidths[3]}">
                <span class="igst-percent">${(hsnItem.taxRate / 2).toFixed(
                  2,
                )}</span>
                <span class="igst-amount">${formatCurrency(
                  hsnItem.sgstAmount,
                )}</span>
              </div>
            `
                : ''
            }
            <div class="hsn-tax-cell" style="width: ${
              hsnColWidths[hsnTotalColumnIndex]
            }">${formatCurrency(hsnItem.total)}</div>
          </div>
        `,
          )
          .join('')}

        <div class="hsn-tax-table-total-row">
          <div class="hsn-tax-total-cell" style="width: ${
            hsnColWidths[0]
          }">Total</div>
          <div class="hsn-tax-total-cell" style="width: ${
            hsnColWidths[1]
          }">${formatCurrency(totalTaxable)}</div>
          ${
            showIGST
              ? `
            <div class="igst-total" style="width: ${hsnColWidths[2]}">
              <span class="total-igst-amount">${formatCurrency(
                totalIGST,
              )}</span>
            </div>
          `
              : ''
          }
          ${
            showCGSTSGST
              ? `
            <div class="igst-total" style="width: ${hsnColWidths[2]}">
              <span class="total-igst-amount">${formatCurrency(
                totalCGST,
              )}</span>
            </div>
            <div class="igst-total" style="width: ${hsnColWidths[3]}">
              <span class="total-igst-amount">${formatCurrency(
                totalSGST,
              )}</span>
            </div>
          `
              : ''
          }
          <div class="hsn-tax-total-cell" style="width: ${
            hsnColWidths[hsnTotalColumnIndex]
          }">${formatCurrency(totalAmount)}</div>
        </div>
      </div>
    `;
  };

  // Format notes
  const formattedNotes = getTransactionValue('notes')
    ? formatNotesHtml(getTransactionValue('notes'))
    : '';

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
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              ${logoSrc ? `<img src="${logoSrc}" class="logo" />` : ''}
            </div>
            <div class="header-right">
              <div class="company-name">${capitalizeWords(
                getCompanyValue('businessName') ||
                  getCompanyValue('companyName') ||
                  'Company Name',
              )}</div>
              <div class="address">${
                [
                  getCompanyValue('address'),
                  getCompanyValue('City'),
                  getCompanyValue('addressState'),
                  getCompanyValue('Country'),
                  getCompanyValue('Pincode'),
                ]
                  .filter(Boolean)
                  .join(', ') || 'Address Line 1'
              }</div>
              <div class="contact-info">
                <span class="contact-label">Name : </span>
                <span class="contact-value">${capitalizeWords(
                  getClientName(client),
                )}</span>
                <span class="contact-label"> | Phone : </span>
                <span class="contact-value">${
                  getCompanyValue('mobileNumber')
                    ? formatPhoneNumber(String(getCompanyValue('mobileNumber')))
                    : getCompanyValue('Telephone')
                    ? formatPhoneNumber(String(getCompanyValue('Telephone')))
                    : '-'
                }</span>
              </div>
            </div>
          </div>

          <!-- Body - Items Table -->
          <div class="section">
            <!-- Table Header -->
            <div class="table-header">
              ${
                getCompanyValue('gstin')
                  ? `
                <div class="gst-row">
                  <span class="gst-label">GSTIN : </span>
                  <span class="gst-value">${getCompanyValue('gstin')}</span>
                </div>
              `
                  : ''
              }

              <div class="invoice-title-row">
                <div class="invoice-title">
                  ${
                    getTransactionValue('type') === 'proforma'
                      ? 'PROFORMA'
                      : isGSTApplicable
                      ? 'TAX INVOICE'
                      : 'INVOICE'
                  }
                </div>
              </div>

              <div class="recipient-row">
                <div class="recipient-text">ORIGINAL FOR RECIPIENT</div>
              </div>
            </div>

            <!-- Three Column Section -->
            <div class="three-col-section">
              <!-- Column 1 - Details of Buyer -->
              <div class="column">
                <div class="column-header">Details of Buyer | Billed to:</div>
                <div class="data-row">
                  <span class="table-label">Name</span>
                  <span class="table-value">${capitalizeWords(
                    getPartyValue('name') || 'N/A',
                  )}</span>
                </div>
                <div class="data-row">
                  <span class="table-label">Address</span>
                  <span class="table-value">${
                    capitalizeWords(getBillingAddress(party)) || '-'
                  }</span>
                </div>
                <div class="data-row">
                  <span class="table-label">Phone</span>
                  <span class="table-value">${
                    getPartyValue('contactNumber')
                      ? formatPhoneNumber(getPartyValue('contactNumber'))
                      : '-'
                  }</span>
                </div>
                <div class="data-row">
                  <span class="table-label">GSTIN</span>
                  <span class="table-value">${
                    getPartyValue('gstin') || '-'
                  }</span>
                </div>
                <div class="data-row">
                  <span class="table-label">PAN</span>
                  <span class="table-value">${
                    getPartyValue('pan') || '-'
                  }</span>
                </div>
                <div class="data-row">
                  <span class="table-label">Place of Supply</span>
                  <span class="table-value">${
                    shippingAddress?.state
                      ? `${capitalizeWords(shippingAddress.state)} (${
                          getStateCode(shippingAddress.state) || '-'
                        })`
                      : getPartyValue('state')
                      ? `${capitalizeWords(getPartyValue('state'))} (${
                          getStateCode(getPartyValue('state')) || '-'
                        })`
                      : '-'
                  }</span>
                </div>
              </div>

              <!-- Column 2 - Details of Consigned -->
              <div class="column">
                <div class="column-header">Details of Consigned | Shipped to:</div>
                <div class="data-row">
                  <span class="table-label">Name</span>
                  <span class="table-value">${capitalizeWords(
                    shippingAddress?.label || getPartyValue('name') || 'N/A',
                  )}</span>
                </div>
                <div class="data-row">
                  <span class="table-label">Address</span>
                  <span class="table-value">${capitalizeWords(
                    getShippingAddress(
                      shippingAddress,
                      getBillingAddress(party),
                    ),
                  )}</span>
                </div>
                <div class="data-row">
                  <span class="table-label">Country</span>
                  <span class="table-value">India</span>
                </div>
                <div class="data-row">
                  <span class="table-label">Phone</span>
                  <span class="table-value">${
                    shippingAddress?.contactNumber
                      ? formatPhoneNumber(String(shippingAddress.contactNumber))
                      : getPartyValue('contactNumber')
                      ? formatPhoneNumber(
                          String(getPartyValue('contactNumber')),
                        )
                      : '-'
                  }</span>
                </div>
                <div class="data-row">
                  <span class="table-label">GSTIN</span>
                  <span class="table-value">${
                    getPartyValue('gstin') || '-'
                  }</span>
                </div>
                <div class="data-row">
                  <span class="table-label">State</span>
                  <span class="table-value">${
                    shippingAddress?.state
                      ? `${capitalizeWords(shippingAddress.state)} (${
                          getStateCode(shippingAddress.state) || '-'
                        })`
                      : getPartyValue('state')
                      ? `${capitalizeWords(getPartyValue('state'))} (${
                          getStateCode(getPartyValue('state')) || '-'
                        })`
                      : '-'
                  }</span>
                </div>
              </div>

              <!-- Column 3 - Invoice Details -->
              <div class="column">
                <div class="data-row">
                  <span class="table-label">Invoice No.</span>
                  <span class="table-value">${
                    getTransactionValue('invoiceNumber') || 'N/A'
                  }</span>
                </div>
                <div class="data-row">
                  <span class="table-label">Invoice Date</span>
                  <span class="table-value">${
                    getTransactionValue('date')
                      ? new Date(
                          getTransactionValue('date'),
                        ).toLocaleDateString('en-IN')
                      : 'N/A'
                  }</span>
                </div>
                <div class="data-row">
                  <span class="table-label">Due Date</span>
                  <span class="table-value">${
                    getTransactionValue('dueDate')
                      ? new Date(
                          getTransactionValue('dueDate'),
                        ).toLocaleDateString('en-IN')
                      : '-'
                  }</span>
                </div>
                <div class="data-row">
                  <span class="table-label">P.O. No.</span>
                  <span class="table-value">${
                    getTransactionValue('voucher') || '-'
                  }</span>
                </div>
                <div class="data-row">
                  <span class="table-label">E-Way No.</span>
                  <span class="table-value">${
                    getTransactionValue('eway') || '-'
                  }</span>
                </div>
                <div class="data-row">
                  <span class="table-label"></span>
                  <span class="table-value"></span>
                </div>
                <div class="data-row">
                  <span class="table-label"></span>
                  <span class="table-value"></span>
                </div>
              </div>
            </div>

            <!-- Items Table -->
            <div class="table-container">
              <table class="items-table">
                <thead>
                  <tr>
                    ${generateTableHeaders()}
                  </tr>
                </thead>
                <tbody>
                  ${generateTableRows()}
                </tbody>
              </table>

              <!-- Total Row -->
              <div class="items-table-total-row">
                <div class="total-empty" style="width: ${colWidths[0]}"></div>
                <div class="total-empty" style="width: ${colWidths[1]}"></div>
                <div class="total-label" style="width: ${
                  colWidths[2]
                }">Total</div>
                <div class="total-qty" style="width: ${
                  colWidths[3]
                }">${totalQty}</div>
                <div class="total-empty" style="width: ${colWidths[4]}"></div>
                <div class="total-taxable" style="width: ${
                  colWidths[5]
                }">${formatCurrency(totalTaxable)}</div>
                ${
                  showIGST
                    ? `
                  <div class="igst-total" style="width: ${colWidths[6]}">
                    <span class="total-igst-amount">${formatCurrency(
                      totalIGST,
                    )}</span>
                  </div>
                `
                    : ''
                }
                ${
                  showCGSTSGST
                    ? `
                  <div class="igst-total" style="width: ${colWidths[6]}">
                    <span class="total-igst-amount">${formatCurrency(
                      totalCGST,
                    )}</span>
                  </div>
                  <div class="igst-total" style="width: ${colWidths[7]}">
                    <span class="total-igst-amount">${formatCurrency(
                      totalSGST,
                    )}</span>
                  </div>
                `
                    : ''
                }
                <div class="grand-total" style="width: ${
                  colWidths[totalColumnIndex]
                }">${formatCurrency(totalAmount)}</div>
              </div>
            </div>

            <!-- Bottom Section -->
            <div class="bottom-section">
              <div class="total-in-words">Total in words : ${numberToWords(
                totalAmount,
              )}</div>
              
              ${isGSTApplicable ? generateHsnSummary() : ''}

              <div class="bank-totals-section">
                <!-- Left Column: Bank Details -->
                <div class="left-section">
                  ${
                    getTransactionValue('type') !== 'proforma' &&
                    isBankDetailAvailable
                      ? `
                    <div class="bank-details-container">
                      <div class="bank-title">Bank Details:</div>
                      <div class="bank-content">
                        ${
                          bankData.bankName
                            ? `
                          <div class="bank-row">
                            <span class="bank-label">Name:</span>
                            <span>${capitalizeWords(bankData.bankName)}</span>
                          </div>
                        `
                            : ''
                        }
                        ${
                          bankData.accountNo
                            ? `
                          <div class="bank-row">
                            <span class="bank-label">Acc. No:</span>
                            <span>${bankData.accountNo}</span>
                          </div>
                        `
                            : ''
                        }
                        ${
                          bankData.ifscCode
                            ? `
                          <div class="bank-row">
                            <span class="bank-label">IFSC:</span>
                            <span>${bankData.ifscCode}</span>
                          </div>
                        `
                            : ''
                        }
                        ${
                          bankData.branchAddress
                            ? `
                          <div class="bank-row">
                            <span class="bank-label">Branch:</span>
                            <span>${bankData.branchAddress}</span>
                          </div>
                        `
                            : ''
                        }
                        ${
                          bankData?.upiDetails?.upiId
                            ? `
                          <div class="bank-row">
                            <span class="bank-label">UPI ID:</span>
                            <span>${bankData.upiDetails.upiId}</span>
                          </div>
                        `
                            : ''
                        }
                        ${
                          bankData?.upiDetails?.upiName
                            ? `
                          <div class="bank-row">
                            <span class="bank-label">UPI Name:</span>
                            <span>${bankData.upiDetails.upiName}</span>
                          </div>
                        `
                            : ''
                        }
                        ${
                          bankData?.upiDetails?.upiMobile
                            ? `
                          <div class="bank-row">
                            <span class="bank-label">UPI Mobile:</span>
                            <span>${bankData.upiDetails.upiMobile}</span>
                          </div>
                        `
                            : ''
                        }
                      </div>
                      ${
                        bankData?.qrCode
                          ? `
                        <div class="qr-code-section">
                          <div class="qr-title">QR Code</div>
                          <div class="qr-container">
                            <img src="${BASE_URL}${bankData.qrCode}" class="qr-code" />
                          </div>
                        </div>
                      `
                          : ''
                      }
                    </div>
                  `
                      : ''
                  }
                </div>

                <!-- Right Column: Totals -->
                <div class="right-section">
                  <div class="total-row">
                    <span class="label">Taxable Amount</span>
                    <span class="value">Rs.${formatCurrency(
                      totalTaxable,
                    )}</span>
                  </div>
                  ${
                    isGSTApplicable
                      ? `
                    <div class="total-row">
                      <span class="label">Total Tax</span>
                      <span class="value">Rs.${formatCurrency(
                        showIGST ? totalIGST : totalCGST + totalSGST,
                      )}</span>
                    </div>
                  `
                      : ''
                  }
                  <div class="total-row ${
                    isGSTApplicable ? 'highlight-row' : ''
                  }">
                    <span class="${isGSTApplicable ? 'label-bold' : 'label'}">
                      ${
                        isGSTApplicable
                          ? 'Total Amount After Tax'
                          : 'Total Amount'
                      }
                    </span>
                    <span class="${isGSTApplicable ? 'value-bold' : 'value'}">
                      Rs.${formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div class="total-row">
                    <span class="label" style="flex: 1;">
                      For ${
                        getCompanyValue('businessName') ||
                        getCompanyValue('companyName') ||
                        'Company Name'
                      }
                    </span>
                    <span class="value">(E & O.E.)</span>
                  </div>
                </div>
              </div>

              <!-- Terms and Conditions -->
              ${
                formattedNotes
                  ? `
                <div class="terms-box notes-section">
                  ${formattedNotes}
                </div>
              `
                  : ''
              }
            </div>
          </div>

          <!-- Page Number -->
          <div class="page-number">Page 1 / 1 page</div>
        </div>
      </body>
      </html>
    `;
  };

  return generateHTMLContent();
};

// CSS Styles matching the original A5_3 design
const styles = {
  css: `
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
    
    body {
      font-family: 'Helvetica', Arial, sans-serif;
      font-size: 7px;
      color: #000;
      margin: 0;
      padding: 10px;
      line-height: 1.2;
      background: #FFFFFF;
      width: 148mm;
      height: 210mm;
    }
    .page {
      width: 100%;
      max-width: 148mm;
      margin: 0 auto;
      position: relative;
      min-height: 210mm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 5px;
      border-bottom: 1px solid #0371C1;
      padding-bottom: 5px;
    }
    .header-left {
      flex: 0 0 auto;
    }
    .logo {
      width: 50px;
      height: 50px;
      object-fit: contain;
    }
    .header-right {
      flex: 1;
      margin-left: 8px;
    }
    .company-name {
      font-size: 10px;
      font-weight: bold;
      margin-bottom: 2px;
      color: #0371C1;
    }
    .address {
      font-size: 6px;
      margin-bottom: 2px;
      color: #333;
    }
    .contact-info {
      font-size: 6px;
      color: #333;
    }
    .contact-label {
      font-weight: bold;
    }
    .contact-value {
      font-weight: normal;
    }
    .section {
      margin-top: 5px;
    }
    .table-header {
      margin-bottom: 5px;
    }
    .gst-row {
      font-size: 6px;
      margin-bottom: 2px;
    }
    .gst-label {
      font-weight: bold;
    }
    .gst-value {
      font-weight: normal;
    }
    .invoice-title-row {
      text-align: center;
      margin-bottom: 2px;
    }
    .invoice-title {
      font-size: 9px;
      font-weight: bold;
      color: #0371C1;
    }
    .recipient-row {
      text-align: center;
    }
    .recipient-text {
      font-size: 6px;
      font-weight: bold;
      color: #0371C1;
    }
    .three-col-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      border: 0.5px solid #0371C1;
    }
    .column {
      flex: 1;
      padding: 3px;
      border-right: 0.5px solid #0371C1;
    }
    .column:last-child {
      border-right: none;
    }
    .column-header {
      font-size: 6px;
      font-weight: bold;
      color: #0371C1;
      margin-bottom: 2px;
      padding-bottom: 1px;
      border-bottom: 0.5px solid #0371C1;
    }
    .data-row {
      display: flex;
      margin-bottom: 1px;
      font-size: 6px;
    }
    .table-label {
      font-weight: bold;
      width: 45px;
      flex-shrink: 0;
    }
    .table-value {
      flex: 1;
    }
    .table-container {
      border: 0.5px solid #0371C1;
      margin-bottom: 5px;
      position: relative;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
    }
    .tableCellHeader {
      background-color: #0371C1;
      color: white;
      padding: 2px;
      border-right: 0.5px solid white;
      text-align: center;
      font-weight: bold;
      font-size: 5px;
    }
    .tableCellLeft {
      text-align: left;
      padding-left: 3px;
    }
    .tableCellCenter {
      text-align: center;
    }
    .tableRow {
      border-bottom: 0.5px solid #0371C1;
    }
    .tableCell {
      border-right: 0.5px solid #0371C1;
      padding: 2px;
      font-size: 5px;
      text-align: right;
    }
    .igst-header {
      background-color: #0371C1;
      color: white;
      padding: 0;
      border-right: 0.5px solid white;
      font-size: 5px;
    }
    .igst-main-header {
      font-weight: bold;
      padding: 1px;
      border-bottom: 0.5px solid white;
    }
    .igst-sub-header {
      display: flex;
      border-top: 0.5px solid #0371C1;
    }
    .igst-sub-percentage {
      width: 30%;
      text-align: center;
      padding: 1px 0;
      border-right: 0.5px solid white;
    }
    .igst-sub-text {
      width: 70%;
      text-align: center;
      padding: 1px 0;
    }
    .igst-cell {
      display: flex;
      border-right: 0.5px solid #0371C1;
      padding: 0;
      font-size: 5px;
    }
    .igst-percent {
      width: 30%;
      text-align: center;
      padding: 2px 0;
      border-right: 0.5px solid #0371C1;
    }
    .igst-amount {
      width: 70%;
      text-align: center;
      padding: 2px 0;
    }
    .items-table-total-row {
      display: flex;
      border-top: 0.5px solid #0371C1;
      font-size: 5px;
      font-weight: bold;
    }
    .total-empty {
      padding: 2px;
      text-align: center;
    }
    .total-label {
      padding: 2px;
      text-align: center;
      font-weight: bold;
    }
    .total-qty {
      padding: 2px;
      text-align: center;
    }
    .total-taxable {
      padding: 2px;
      text-align: center;
    }
    .igst-total {
      padding: 2px;
      text-align: center;
    }
    .total-igst-amount {
      font-weight: bold;
    }
    .grand-total {
      padding: 2px;
      text-align: center;
      font-weight: bold;
    }
    .bottom-section {
      margin-top: 5px;
    }
    .total-in-words {
      font-size: 6px;
      margin-bottom: 3px;
      padding-bottom: 2px;
      border-bottom: 0.5px solid #0371C1;
    }
    .hsn-tax-table {
      border: 0.5px solid #0371C1;
      margin-bottom: 5px;
    }
    .hsn-tax-table-header {
      display: flex;
      background-color: #0371C1;
      color: white;
      font-size: 5px;
      font-weight: bold;
    }
    .hsn-tax-header-cell {
      padding: 2px;
      border-right: 0.5px solid white;
      text-align: center;
    }
    .hsn-tax-table-row {
      display: flex;
      border-bottom: 0.5px solid #0371C1;
      font-size: 5px;
    }
    .hsn-tax-cell {
      padding: 2px;
      border-right: 0.5px solid #0371C1;
      text-align: center;
    }
    .hsn-tax-table-total-row {
      display: flex;
      border-top: 0.5px solid #0371C1;
      font-size: 5px;
      font-weight: bold;
    }
    .hsn-tax-total-cell {
      padding: 2px;
      border-right: 0.5px solid #0371C1;
      text-align: center;
    }
    .bank-totals-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .left-section {
      width: 60%;
    }
    .right-section {
      width: 38%;
    }
    .bank-details-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .bank-content {
      flex: 1;
    }
    .bank-title {
      font-weight: bold;
      margin-bottom: 2px;
      font-size: 7px;
    }
    .bank-row {
      display: flex;
      margin-bottom: 1px;
      font-size: 6px;
    }
    .bank-label {
      width: 45px;
      font-weight: bold;
      margin-right: 3px;
      flex-shrink: 0;
    }
    .qr-code-section {
      text-align: center;
      margin-left: 10px;
      margin-top: 4px;
    }
    .qr-title {
      font-size: 7px;
      font-weight: bold;
      margin-bottom: 2px;
    }
    .qr-container {
      background-color: #fff;
    }
    .qr-code {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1px;
      font-size: 6px;
    }
    .label {
      font-weight: normal;
    }
    .label-bold {
      font-weight: bold;
    }
    .value {
      font-weight: normal;
    }
    .value-bold {
      font-weight: bold;
    }
    .highlight-row {
      background-color: rgba(3, 113, 193, 0.1);
      padding: 1px 2px;
    }
    .terms-box {
      border-left: 0.5px solid #0371C1;
      border-right: 0.5px solid #0371C1;
      width: 100%;
      padding: 3px;
      font-size: 6px;
    }
    .notes-section {
      border-top: 0;
      border-bottom: 0;
    }
    .page-number {
      position: absolute;
      bottom: 5px;
      right: 10px;
      font-size: 5px;
      color: #666;
    }
  `,
};

// Generate PDF function
export const generatePdfForTemplateA5_3 = async (
  transaction,
  company,
  party,
  serviceNameById = new Map(),
  shippingAddress,
  bank,
  client,
) => {
  try {
    if (!transaction) {
      throw new Error('Transaction is required to generate PDF');
    }

    const HTMLContent = TemplateA5_3PDF({
      transaction,
      company: company || {},
      party: party || {},
      shippingAddress,
      bank,
      client,
      serviceNameById,
    });

    const options = {
      html: HTMLContent,
      fileName: `invoice_${
        transaction?.invoiceNumber || 'document'
      }_${Date.now()}`,
      directory: 'Documents',
      base64: false,
      height: 595, // A5 height in points (210mm)
      width: 420, // A5 width in points (148mm)
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

export default TemplateA5_3PDF;
