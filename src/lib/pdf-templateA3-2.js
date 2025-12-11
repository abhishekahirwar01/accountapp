// pdf-templateA5_2.js - Updated to match image layout exactly
import React from 'react';
import { generatePDF } from 'react-native-html-to-pdf';
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
import { BASE_URL } from '../config';

const getClientName = client => {
  if (!client) return 'Client Name';
  if (typeof client === 'string') return client;
  return client.companyName || client.contactName || 'Client Name';
};

// Simple HTML parser for PDF notes
const parseHtmlToElements = (html, fontSize = 7) => {
  try {
    const elements = [];
    let currentHtml = html;
    
    currentHtml = currentHtml.replace(/<br\s*\/?>/gi, '{{BR}}');
    currentHtml = currentHtml.replace(/<p>/gi, '{{P_START}}');
    currentHtml = currentHtml.replace(/<\/p>/gi, '{{P_END}}');
    currentHtml = currentHtml.replace(/<strong>/gi, '{{B_START}}');
    currentHtml = currentHtml.replace(/<\/strong>/gi, '{{B_END}}');
    currentHtml = currentHtml.replace(/<b>/gi, '{{B_START}}');
    currentHtml = currentHtml.replace(/<\/b>/gi, '{{B_END}}');
    currentHtml = currentHtml.replace(/<em>/gi, '{{I_START}}');
    currentHtml = currentHtml.replace(/<\/em>/gi, '{{I_END}}');
    currentHtml = currentHtml.replace(/<i>/gi, '{{I_START}}');
    currentHtml = currentHtml.replace(/<\/i>/gi, '{{I_END}}');
    currentHtml = currentHtml.replace(/<u>/gi, '{{U_START}}');
    currentHtml = currentHtml.replace(/<\/u>/gi, '{{U_END}}');
    currentHtml = currentHtml.replace(/<li>/gi, '{{LI_START}}');
    currentHtml = currentHtml.replace(/<\/li>/gi, '{{LI_END}}');
    currentHtml = currentHtml.replace(/<ul>/gi, '{{UL_START}}');
    currentHtml = currentHtml.replace(/<\/ul>/gi, '{{UL_END}}');
    currentHtml = currentHtml.replace(/<\/?([a-z][a-z0-9]*)[^>]*>/gi, '');
    
    const tokens = currentHtml.split(/({{[A-Z_]+}})/);
    
    let inParagraph = false;
    let inBold = false;
    let inItalic = false;
    let inUnderline = false;
    let inListItem = false;
    let inList = false;
    let currentText = '';
    
    tokens.forEach(token => {
      if (!token.trim() && token !== '{{BR}}') return;
      
      switch (token) {
        case '{{BR}}':
          if (currentText) {
            elements.push(createElement(currentText, inParagraph, inBold, inItalic, inUnderline, inListItem));
            currentText = '';
          }
          elements.push({ type: 'lineBreak' });
          break;
        case '{{P_START}}':
          inParagraph = true;
          break;
        case '{{P_END}}':
          if (currentText) {
            elements.push(createElement(currentText, inParagraph, inBold, inItalic, inUnderline, inListItem));
            currentText = '';
          }
          inParagraph = false;
          break;
        case '{{B_START}}':
          inBold = true;
          break;
        case '{{B_END}}':
          if (currentText) {
            elements.push(createElement(currentText, inParagraph, inBold, inItalic, inUnderline, inListItem));
            currentText = '';
          }
          inBold = false;
          break;
        case '{{I_START}}':
          inItalic = true;
          break;
        case '{{I_END}}':
          if (currentText) {
            elements.push(createElement(currentText, inParagraph, inBold, inItalic, inUnderline, inListItem));
            currentText = '';
          }
          inItalic = false;
          break;
        case '{{U_START}}':
          inUnderline = true;
          break;
        case '{{U_END}}':
          if (currentText) {
            elements.push(createElement(currentText, inParagraph, inBold, inItalic, inUnderline, inListItem));
            currentText = '';
          }
          inUnderline = false;
          break;
        case '{{LI_START}}':
          inListItem = true;
          break;
        case '{{LI_END}}':
          if (currentText) {
            elements.push({ type: 'listItem', content: currentText.trim() });
            currentText = '';
          }
          inListItem = false;
          break;
        case '{{UL_START}}':
          inList = true;
          break;
        case '{{UL_END}}':
          inList = false;
          break;
        default:
          currentText += token;
      }
    });
    
    if (currentText) {
      elements.push(createElement(currentText, inParagraph, inBold, inItalic, inUnderline, inListItem));
    }
    
    function createElement(text, isParagraph, isBold, isItalic, isUnderline, isListItem) {
      const trimmedText = text.trim();
      if (!trimmedText) return null;
      
      if (isListItem) {
        return { type: 'listItem', content: trimmedText };
      } else if (isBold) {
        return { type: 'bold', content: trimmedText };
      } else if (isItalic) {
        return { type: 'italic', content: trimmedText };
      } else if (isUnderline) {
        return { type: 'underline', content: trimmedText };
      } else if (isParagraph) {
        return { type: 'paragraph', content: trimmedText };
      } else {
        return { type: 'text', content: trimmedText };
      }
    }
    
    return elements.filter(el => el && (el.content || el.type === 'lineBreak'));
  } catch (error) {
    console.error('Error in simple HTML parser:', error);
    return [{ type: 'text', content: html }];
  }
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
    return notes
      .replace(/<br\s*\/?>/gi, '<br>')
      .replace(/<p>/gi, '<div style="margin-bottom: 3px; font-size: 7px; color: #333; line-height: 1.4;">')
      .replace(/<\/p>/gi, '</div>');
  }
};

const TemplateA5_2PDF = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  client,
  serviceNameById = new Map(),
}) => {
  const actualShippingAddress = shippingAddress || transaction?.shippingAddress;
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
  const bankData = bank || transaction?.bank || {};
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

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

  // Generate table headers based on GST type
  const generateTableHeaders = () => {
    if (!isGSTApplicable || showNoTax) {
      return `
        <tr>
          <th class="header-cell" style="width: 8%;">Sr. No.</th>
          <th class="header-cell header-left" style="width: 25%;">Name of Product/Service</th>
          <th class="header-cell" style="width: 12%;">HSN/SAC</th>
          <th class="header-cell" style="width: 10%;">Qty</th>
          <th class="header-cell" style="width: 12%;">Rate<br/>(Rs.)</th>
          <th class="header-cell" style="width: 15%;">Taxable<br/>Value (Rs.)</th>
          <th class="header-cell" style="width: 18%;">Total (Rs.)</th>
        </tr>
      `;
    } else if (showIGST) {
      return `
        <tr>
          <th class="header-cell" rowspan="2" style="width: 6%;">Sr.<br/>No.</th>
          <th class="header-cell header-left" rowspan="2" style="width: 20%;">Name of Prod-<br/>uct/Service</th>
          <th class="header-cell" rowspan="2" style="width: 10%;">HSN/SAC</th>
          <th class="header-cell" rowspan="2" style="width: 8%;">Qty</th>
          <th class="header-cell" rowspan="2" style="width: 10%;">Rate<br/>(Rs.)</th>
          <th class="header-cell" rowspan="2" style="width: 13%;">Taxable<br/>Value (Rs.)</th>
          <th class="header-cell" colspan="2" style="width: 18%;">IGST</th>
          <th class="header-cell" rowspan="2" style="width: 15%;">Total (Rs.)</th>
        </tr>
        <tr>
          <th class="header-cell sub-header" style="width: 6%;">%</th>
          <th class="header-cell sub-header" style="width: 12%;">Amount<br/>(Rs.)</th>
        </tr>
      `;
    } else {
      return `
        <tr>
          <th class="header-cell" rowspan="2" style="width: 5%;">Sr.<br/>No.</th>
          <th class="header-cell header-left" rowspan="2" style="width: 18%;">Name of<br/>Product/Service</th>
          <th class="header-cell" rowspan="2" style="width: 9%;">HSN/SAC</th>
          <th class="header-cell" rowspan="2" style="width: 7%;">Qty</th>
          <th class="header-cell" rowspan="2" style="width: 9%;">Rate<br/>(Rs.)</th>
          <th class="header-cell" rowspan="2" style="width: 12%;">Taxable Value<br/>(Rs.)</th>
          <th class="header-cell" colspan="2" style="width: 18%;">CGST</th>
          <th class="header-cell" colspan="2" style="width: 18%;">SGST</th>
          <th class="header-cell" rowspan="2" style="width: 14%;">Total (Rs.)</th>
        </tr>
        <tr>
          <th class="header-cell sub-header" style="width: 5%;">%</th>
          <th class="header-cell sub-header" style="width: 8%;">Amount(Rs.)</th>
          <th class="header-cell sub-header" style="width: 5%;">%</th>
          <th class="header-cell sub-header" style="width: 8%;">Amount(Rs.)</th>
        </tr>
      `;
    }
  };

  // Generate table rows
  const generateTableRows = () => {
    if (!itemsWithGST || itemsWithGST.length === 0) {
      return '<tr><td colspan="11" style="padding: 8px; text-align: center;">No items found</td></tr>';
    }

    return itemsWithGST
      .map((item, index) => {
        const itemName = getItemName(item);

        if (!isGSTApplicable || showNoTax) {
          return `
          <tr>
            <td class="body-cell">${index + 1}</td>
            <td class="body-cell body-left">${capitalizeWords(itemName)}</td>
            <td class="body-cell">${item.code || '-'}</td>
            <td class="body-cell">${
              item.itemType === 'service'
                ? '-'
                : formatQuantity(item.quantity || 0, item.unit)
            }</td>
            <td class="body-cell">${formatCurrency(item.pricePerUnit || 0)}</td>
            <td class="body-cell">${formatCurrency(item.taxableValue)}</td>
            <td class="body-cell">${formatCurrency(item.total)}</td>
          </tr>
        `;
        } else if (showIGST) {
          return `
          <tr>
            <td class="body-cell">${index + 1}</td>
            <td class="body-cell body-left">${capitalizeWords(itemName)}</td>
            <td class="body-cell">${item.code || '-'}</td>
            <td class="body-cell">${
              item.itemType === 'service'
                ? '-'
                : formatQuantity(item.quantity || 0, item.unit)
            }</td>
            <td class="body-cell">${formatCurrency(item.pricePerUnit || 0)}</td>
            <td class="body-cell">${formatCurrency(item.taxableValue)}</td>
            <td class="body-cell">${item.gstRate}</td>
            <td class="body-cell">${formatCurrency(item.igst)}</td>
            <td class="body-cell">${formatCurrency(item.total)}</td>
          </tr>
        `;
        } else {
          return `
          <tr>
            <td class="body-cell">${index + 1}</td>
            <td class="body-cell body-left">${capitalizeWords(itemName)}</td>
            <td class="body-cell">${item.code || '-'}</td>
            <td class="body-cell">${
              item.itemType === 'service'
                ? '-'
                : formatQuantity(item.quantity || 0, item.unit)
            }</td>
            <td class="body-cell">${formatCurrency(item.pricePerUnit || 0)}</td>
            <td class="body-cell">${formatCurrency(item.taxableValue)}</td>
            <td class="body-cell">${(item.gstRate / 2).toFixed(2)}</td>
            <td class="body-cell">${formatCurrency(item.cgst)}</td>
            <td class="body-cell">${(item.gstRate / 2).toFixed(2)}</td>
            <td class="body-cell">${formatCurrency(item.sgst)}</td>
            <td class="body-cell">${formatCurrency(item.total)}</td>
          </tr>
        `;
        }
      })
      .join('');
  };

  // Generate total row
  const generateTotalRow = () => {
    if (!isGSTApplicable || showNoTax) {
      return `
        <tr class="total-row">
          <td colspan="2" class="total-empty"></td>
          <td class="total-label">Total</td>
          <td class="total-value">${totalQty}</td>
          <td class="total-empty"></td>
          <td class="total-value">${formatCurrency(totalTaxable)}</td>
          <td class="total-value grand-total">${formatCurrency(totalAmount)}</td>
        </tr>
      `;
    } else if (showIGST) {
      return `
        <tr class="total-row">
          <td colspan="2" class="total-empty"></td>
          <td class="total-label">Total</td>
          <td class="total-value">${totalQty}</td>
          <td class="total-empty"></td>
          <td class="total-value">${formatCurrency(totalTaxable)}</td>
          <td colspan="2" class="total-value">${formatCurrency(totalIGST)}</td>
          <td class="total-value grand-total">${formatCurrency(totalAmount)}</td>
        </tr>
      `;
    } else {
      return `
        <tr class="total-row">
          <td colspan="2" class="total-empty"></td>
          <td class="total-label">Total</td>
          <td class="total-value">${totalQty}</td>
          <td class="total-empty"></td>
          <td class="total-value">${formatCurrency(totalTaxable)}</td>
          <td colspan="2" class="total-value">${formatCurrency(totalCGST)}</td>
          <td colspan="2" class="total-value">${formatCurrency(totalSGST)}</td>
          <td class="total-value grand-total">${formatCurrency(totalAmount)}</td>
        </tr>
      `;
    }
  };

  // Generate HSN Summary table
  const generateHsnSummary = () => {
    if (!isGSTApplicable) return '';

    const hsnSummary = getHsnSummary(itemsWithGST, showIGST, showCGSTSGST);

    return `
      <div class="hsn-summary-section">
        
        <table class="hsn-table">
          <thead>
            ${
              showIGST
                ? `
              <tr>
                <th class="hsn-header" rowspan="2" style="width: 25%;">HSN/SAC</th>
                <th class="hsn-header" rowspan="2" style="width: 25%;">Taxable Value (Rs.)</th>
                <th class="hsn-header" colspan="2" style="width: 30%;">IGST</th>
                <th class="hsn-header" rowspan="2" style="width: 20%;">Total (Rs.)</th>
              </tr>
              <tr>
                <th class="hsn-header sub-header" style="width: 10%;">%</th>
                <th class="hsn-header sub-header" style="width: 20%;">Amount (Rs.)</th>
              </tr>
            `
                : showCGSTSGST
                ? `
              <tr>
                <th class="hsn-header" rowspan="2" style="width: 18%;">HSN/SAC</th>
                <th class="hsn-header" rowspan="2" style="width: 18%;">Taxable Value (Rs.)</th>
                <th class="hsn-header" colspan="2" style="width: 21%;">CGST</th>
                <th class="hsn-header" colspan="2" style="width: 21%;">SGST</th>
                <th class="hsn-header" rowspan="2" style="width: 22%;">Total (Rs.)</th>
              </tr>
              <tr>
                <th class="hsn-header sub-header" style="width: 7%;">%</th>
                <th class="hsn-header sub-header" style="width: 14%;">Amount (Rs.)</th>
                <th class="hsn-header sub-header" style="width: 7%;">%</th>
                <th class="hsn-header sub-header" style="width: 14%;">Amount (Rs.)</th>
              </tr>
            `
                : ''
            }
          </thead>
          <tbody>
            ${hsnSummary
              .map(
                (hsnItem, index) => `
              <tr>
                <td class="hsn-cell">${hsnItem.hsnCode}</td>
                <td class="hsn-cell">${formatCurrency(hsnItem.taxableValue)}</td>
                ${
                  showIGST
                    ? `
                  <td class="hsn-cell">${hsnItem.taxRate}</td>
                  <td class="hsn-cell">${formatCurrency(hsnItem.taxAmount)}</td>
                `
                    : ''
                }
                ${
                  showCGSTSGST
                    ? `
                  <td class="hsn-cell">${(hsnItem.taxRate / 2).toFixed(2)}</td>
                  <td class="hsn-cell">${formatCurrency(hsnItem.cgstAmount)}</td>
                  <td class="hsn-cell">${(hsnItem.taxRate / 2).toFixed(2)}</td>
                  <td class="hsn-cell">${formatCurrency(hsnItem.sgstAmount)}</td>
                `
                    : ''
                }
                <td class="hsn-cell">${formatCurrency(hsnItem.total)}</td>
              </tr>
            `,
              )
              .join('')}
            <tr class="hsn-total-row">
              <td class="hsn-total-cell">Total</td>
              <td class="hsn-total-cell">${formatCurrency(totalTaxable)}</td>
              ${
                showIGST
                  ? `
                <td colspan="2" class="hsn-total-cell">${formatCurrency(totalIGST)}</td>
              `
                  : ''
              }
              ${
                showCGSTSGST
                  ? `
                <td colspan="2" class="hsn-total-cell">${formatCurrency(totalCGST)}</td>
                <td colspan="2" class="hsn-total-cell">${formatCurrency(totalSGST)}</td>
              `
                  : ''
              }
              <td class="hsn-total-cell">${formatCurrency(totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  };

  // Generate HTML content
  const generateHTMLContent = () => {
    const formattedNotes = getTransactionValue('notes')
      ? formatNotesHtml(getTransactionValue('notes'))
      : '';
    
    // Generate total in words
    const totalInWords = numberToWords(totalAmount) || 'FIFTY FIVE RUPEES ONLY';
    
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
          <div class="company-header">
            <div class="company-header-content">
              ${logoSrc ? `<img src="${logoSrc}" class="header-logo" />` : ''}
              <div class="company-info">
                <div class="company-name-header">${capitalizeWords(
                  getCompanyValue('businessName') ||
                    getCompanyValue('companyName') ||
                    'Tech Solutions Bhopal Pvt. Ltd.',
                )}</div>
                <div class="company-address-header">${
                  [
                    getCompanyValue('address'),
                    getCompanyValue('City'),
                    getCompanyValue('addressState'),
                    getCompanyValue('Country'),
                    getCompanyValue('Pincode'),
                  ]
                    .filter(Boolean)
                    .join(', ') || '123, Commercial Complex, MP Nagar Zone 2, Bhopal, Madhya Pradesh, India, 462011'
                }</div>
                <div class="company-contact-header">
                  <span><strong>Name :</strong> ${capitalizeWords(
                    getClientName(client),
                  )}</span>
                  <span style="margin-left: 15px;"><strong>| Phone :</strong> ${
                    getCompanyValue('mobileNumber')
                      ? formatPhoneNumber(getCompanyValue('mobileNumber'))
                      : getCompanyValue('Telephone')
                      ? formatPhoneNumber(getCompanyValue('Telephone'))
                      : '98765-43250'
                  }</span>
                </div>
              </div>
            </div>
          </div>

          <!-- GSTIN and Tax Invoice Section -->
          <div class="tax-invoice-section">
            <div class="gstin-tax-row">
              <div class="gstin-part">
                <span class="label">GSTIN : </span>
                <span class="value">${getCompanyValue('gstin') || company.gstin}</span>
              </div>
              <div class="tax-invoice-part">
                <span class="tax-invoice-title">${
                  getTransactionValue('type') === 'proforma'
                    ? 'PROFORMA INVOICE'
                    : isGSTApplicable
                    ? 'TAX INVOICE'
                    : 'INVOICE'
                }</span>
              </div>
              <div class="recipient-part">
                <span class="recipient-text">ORIGINAL FOR RECIPIENT</span>
              </div>
            </div>
          </div>

          <!-- Main Content Grid - 2 Columns -->
          <div class="info-grid">
            <!-- Left Column - Buyer & Consignee Details -->
            <div class="info-column left-column">
              <div class="section-box">
                <div class="section-title">Details of Buyer | Billed to:</div>
                <div class="info-row">
                  <span class="info-label">Name :</span>
                  <span class="info-value">${capitalizeWords(
                    getPartyValue('name') || 'N/A',
                  )}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Address :</span>
                  <span class="info-value">${
                    capitalizeWords(getBillingAddress(party)) || '-'
                  }</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Phone :</span>
                  <span class="info-value">${
                    getPartyValue('contactNumber')
                      ? formatPhoneNumber(getPartyValue('contactNumber'))
                      : '-'
                  }</span>
                </div>
                <div class="info-row">
                  <span class="info-label">GSTIN :</span>
                  <span class="info-value">${
                    getPartyValue('gstin') || '-'
                  }</span>
                </div>
                <div class="info-row">
                  <span class="info-label">PAN :</span>
                  <span class="info-value">${getPartyValue('pan') || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Place of Supply :</span>
                  <span class="info-value">${
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

              <div class="section-box">
                <div class="section-title">Details of Consigned | Shipped to:</div>
                <div class="info-row">
                  <span class="info-label">Name :</span>
                  <span class="info-value">${capitalizeWords(
                    actualShippingAddress?.label || getPartyValue('name') || 'N/A',
                  )}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Address :</span>
                  <span class="info-value">${capitalizeWords(
                    getShippingAddress(
                      actualShippingAddress,
                      getBillingAddress(party),
                    ),
                  )}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Country :</span>
                  <span class="info-value">${company?.Country}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Phone :</span>
                  <span class="info-value">${
                    actualShippingAddress?.contactNumber
                      ? formatPhoneNumber(actualShippingAddress.contactNumber)
                      : getPartyValue('contactNumber')
                      ? formatPhoneNumber(getPartyValue('contactNumber'))
                      : '-'
                  }</span>
                </div>
                <div class="info-row">
                  <span class="info-label">GSTIN :</span>
                  <span class="info-value">${
                    getPartyValue('gstin') || '-'
                  }</span>
                </div>
                <div class="info-row">
                  <span class="info-label">State :</span>
                  <span class="info-value">${
                    actualShippingAddress?.state
                      ? `${capitalizeWords(actualShippingAddress.state)} (${
                          getStateCode(actualShippingAddress.state) || '-'
                        })`
                      : getPartyValue('state')
                      ? `${capitalizeWords(getPartyValue('state'))} (${
                          getStateCode(getPartyValue('state')) || '-'
                        })`
                      : '-'
                  }</span>
                </div>
              </div>
            </div>

            <!-- Right Column - Invoice Details + QR Code -->
            <div class="info-column right-column">
              <div class="invoice-details-full">
                <div class="section-box invoice-details-box">
                  <div class="info-row">
                    <span class="info-label">Invoice No.:</span>
                    <span class="info-value">${
                      getTransactionValue('invoiceNumber') || 'INV001'
                    }</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Invoice Date</span>
                    <span class="info-value">${
                      getTransactionValue('date')
                        ? new Date(
                            getTransactionValue('date'),
                          ).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        : '3/12/2025'
                    }</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Due Date</span>
                    <span class="info-value">${
                      getTransactionValue('dueDate')
                        ? new Date(
                            getTransactionValue('dueDate'),
                          ).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        : '3/12/2025'
                    }</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">P.O. No.</span>
                    <span class="info-value">${
                      getTransactionValue('voucher') || '-'
                    }</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">E-Way No.</span>
                    <span class="info-value">${
                      getTransactionValue('eway') || '-'
                    }</span>
                  </div>
                </div>
                
                <div class="qr-container">
                  <div class="qr-title">QR Code</div>
                  ${
                    getTransactionValue('type') !== 'proforma' && bankData?.qrCode
                      ? `<img src="${BASE_URL}${bankData.qrCode}" class="qr-code" />`
                      : '<div class="qr-placeholder">QR Code</div>'
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="items-section">
            <table class="items-table">
              <thead>
                ${generateTableHeaders()}
              </thead>
              <tbody>
                ${generateTableRows()}
                ${generateTotalRow()}
              </tbody>
            </table>
          </div>

          <!-- Total in Words -->
          <div class="total-words">
            TOTAL IN WORDS : ${totalInWords.toUpperCase()}
          </div>

          <!-- HSN Summary -->
          ${generateHsnSummary()}

          <!-- Combined Bank & Amount Details -->
          <div class="bottom-section-combined">
            <div class="combined-box">
              <!-- Left side - Bank Details -->
              <div class="bank-amount-left">
                ${
                  getTransactionValue('type') !== 'proforma'
                    ? `
                  <div class="bank-details-simple">
                    <div class="section-title">Bank Details</div>
                    ${
                      bankData && isBankDetailAvailable
                        ? `
                      ${
                        bankData.bankName
                          ? `
                        <div class="bank-row-simple">
                          <span class="bank-label-simple">Name:</span>
                          <span>${capitalizeWords(bankData.bankName)}</span>
                        </div>
                      `
                          : ''
                      }
                      ${
                        bankData.accountNo
                          ? `
                        <div class="bank-row-simple">
                          <span class="bank-label-simple">Acc. No:</span>
                          <span>${bankData.accountNo}</span>
                        </div>
                      `
                          : ''
                      }
                      ${
                        bankData.ifscCode
                          ? `
                        <div class="bank-row-simple">
                          <span class="bank-label-simple">IFSC:</span>
                          <span>${bankData.ifscCode}</span>
                        </div>
                      `
                          : ''
                      }
                      ${
                        bankData.branchAddress
                          ? `
                        <div class="bank-row-simple">
                          <span class="bank-label-simple">Branch:</span>
                          <span>${bankData.branchAddress}</span>
                        </div>
                      `
                          : ''
                      }
                      ${
                        bankData?.upiDetails?.upiId
                          ? `
                        <div class="bank-row-simple">
                          <span class="bank-label-simple">UPI ID:</span>
                          <span>${bankData.upiDetails.upiId}</span>
                        </div>
                      `
                          : ''
                      }
                       ${
                        bankData?.upiDetails?.upiName
                          ? `
                        <div class="bank-row-simple">
                          <span class="bank-label-simple">UPI Name:</span>
                          <span>${bankData.upiDetails.upiName}</span>
                        </div>
                      `
                          : ''
                      }
                      ${
                        bankData?.upiDetails?.upiMobile
                          ? `
                        <div class="bank-row-simple">
                          <span class="bank-label-simple">UPI Mobile:</span>
                          <span>${bankData.upiDetails.upiMobile}</span>
                        </div>
                      `
                          : ''
                      }
                    
                    `
                        : ''
                    }
                  </div>
                `
                    : ''
                }
              </div>
              
              <!-- Vertical separator -->
              <div class="vertical-separator"></div>
              
              <!-- Right side - Amount Details -->
              <div class="bank-amount-right">
                <div class="amount-details">
                  <div class="amount-row">
                    <span class="amount-label">Taxable Amount</span>
                    <span class="amount-value">${formatCurrency(
                      totalTaxable,
                    )}</span>
                  </div>
                  ${
                    isGSTApplicable
                      ? `
                    <div class="amount-row">
                      <span class="amount-label">Total Tax</span>
                      <span class="amount-value">${formatCurrency(
                        showIGST ? totalIGST : totalCGST + totalSGST,
                      )}</span>
                    </div>
                  `
                      : ''
                  }
                  <div class="amount-row amount-total">
                    <span class="amount-label-total">
                      ${
                        isGSTApplicable
                          ? 'Total Amount After Tax'
                          : 'Total Amount'
                      }
                    </span>
                    <span class="amount-value-total">${formatCurrency(
                      totalAmount,
                    )}</span>
                  </div>
                  <div class="amount-row signature">
                    <span class="amount-label-signature">
                      For ${capitalizeWords(
                        getCompanyValue('businessName') ||
                          getCompanyValue('companyName') ||
                          'Company Name',
                      )}
                    </span>
                    <span class="amount-value-signature">(E & O.E.)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes Section -->
          ${
            formattedNotes
              ? `
            <div class="notes-section">
              ${formattedNotes}
            </div>
          `
              : ''
          }

          <!-- Page Number -->
          <div class="page-number">1 / 2 page</div>
        </div>
      </body>
      </html>
    `;
  };

  return generateHTMLContent();
};

// Enhanced CSS Styles to match the image exactly
const styles = {
  css: `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
    
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8px;
      color: #000;
      line-height: 1.3;
      background: #fff;
      padding-top: 5mm;
    }

    .page {
      width: 148mm;
      min-height: 210mm;
      margin: 0 auto;
      background: white;
      position: relative;
    }

    /* Company Header */
    .company-header {
      margin-bottom: 3px;
      padding-bottom: 4px;
      border-bottom: 2px solid #0066cc;
    }

    .company-header-content {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .header-logo {
      width: 50px;
      height: 50px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .company-info {
      flex: 1;
    }

    .company-name-header {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 2px;
    }

    .company-address-header {
      font-size: 7px;
      margin-bottom: 2px;
      line-height: 1.3;
    }

    .company-contact-header {
      font-size: 7px;
      margin-top: 2px;
    }

    /* GSTIN and Tax Invoice Section */
    .tax-invoice-section {
      border: 1px solid #0066cc;
      margin-bottom: 0;
      background: white;
    }

    .gstin-tax-row {
      display: flex;
      align-items: center;
      padding: 3px 5px;
    }

    .gstin-part {
      flex: 0 0 35%;
      font-size: 7px;
    }

    .gstin-part .label {
      font-weight: bold;
    }

    .tax-invoice-part {
      flex: 0 0 30%;
      text-align: center;
    }

    .tax-invoice-title {
      font-size: 10px;
      font-weight: bold;
    }

    .recipient-part {
      flex: 0 0 35%;
      text-align: right;
    }

    .recipient-text {
      font-size: 7px;
      font-weight: bold;
    }

    /* Info Grid - 2 Columns */
    .info-grid {
      display: flex;
      border: 1px solid #0066cc;
      border-top: none;
      margin-bottom: 2px;
      background: white;
    }

    .info-column {
      border-right: 1px solid #0066cc;
      padding: 5px;
      vertical-align: top;
      min-height: 180px;
    }

    .info-column:last-child {
      border-right: none;
    }

    .left-column {
      width: 50%;
    }

    .right-column {
      width: 50%;
    }

    .invoice-details-full {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .invoice-details-box {
      flex: 1;
      margin-bottom: 0;
    }

    .qr-container {
      text-align: center;
      // border-top: 1px solid #ddd;
      padding-top: 8px;
      margin-top: 8px;
    }

    .qr-title {
      font-size: 8px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #333;
    }

    .qr-code {
      width: 80px;
      height: 80px;
      border: 1px solid #ccc;
      background: white;
    }

    .qr-placeholder {
      width: 80px;
      height: 80px;
      border: 1px solid #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      font-size: 8px;
      color: #999;
      background: #f5f5f5;
    }

    .section-box {
      margin-bottom: 10px;
    }

    .section-box:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 7px;
      font-weight: bold;
      margin-bottom: 1px;
      // padding-bottom: 2px;
      // border-bottom: 1px solid #0066cc;
      color: #000;
    }

    .info-row {
      display: flex;
      font-size: 7px;
      margin-bottom: 2px;
      line-height: 1.4;
    }

    .info-label {
      width: 70px;
      font-weight: bold;
      flex-shrink: 0;
    }

    .info-value {
      flex: 1;
      word-wrap: break-word;
    }

    /* Items Table */
    .items-section {
      // border: 1px solid #0066cc;
      border-top: none;
      border-bottom: none;
      margin-bottom: 2px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table thead tr {
      background: rgba(3, 113, 193, 0.2);
    }

    .header-cell {
      border: 1px solid #0066cc;
      padding: 3px 2px;
      text-align: center;
      font-size: 7px;
      font-weight: bold;
      vertical-align: middle;
      line-height: 1.2;
    }

    .header-left {
      text-align: left;
      padding-left: 4px;
    }

    .sub-header {
      font-size: 6px;
      font-weight: normal;
    }

    .items-table tbody tr {
      border-bottom: 1px solid #0066cc;
      border-right: 1px solid #0066cc;
      border-left: 1px solid #0066cc;
    }

    .body-cell {
      border-right: 1px solid #0066cc;
      padding: 3px 2px;
      text-align: center;
      font-size: 7px;
      vertical-align: middle;
    }

    .body-cell:last-child {
      border-right: none;
    }

    .body-left {
      text-align: left;
      padding-left: 4px;
    }

    .total-row {
      background: rgba(3, 113, 193, 0.2);
      font-weight: bold;
    }

    .total-row td {
      padding: 4px 2px;
      text-align: center;
      font-size: 7px;
      border-right: 1px solid #0066cc;
    }

    .total-row td:last-child {
      border-right: none;
    }

    .total-empty {
      background: transparent;
      border-right: none !important;
    }

    .total-label {
      text-align: center;
      font-weight: bold;
    }

    .total-value {
      text-align: center;
      font-weight: bold;
    }

    .grand-total {
      // background: rgba(3, 113, 193, 0.2);
      font-weight: bold;
    }

    /* Total in Words */
    .total-words {
      border: 1px solid #0066cc;  
      // border-top: none;
      padding: 7px;
      font-size: 7px;
      font-weight: bold;
    }

    /* HSN Summary */
    .hsn-summary-section {
      // border: 1px solid #0066cc;
     
      margin-bottom: 2px;
    }

    .hsn-table {
      width: 100%;
      border-collapse: collapse;
    }

    .hsn-table thead tr {
      background: rgba(3, 113, 193, 0.2);
    }

    .hsn-header {
      border: 1px solid #0066cc;
      border-top:none;
      padding: 3px 2px;
      text-align: center;
      font-size: 7px;
      font-weight: bold;
      line-height: 1.2;
    }

    .hsn-cell {
      border: 1px solid #0066cc;
      border-top: none;
      padding: 3px 2px;
      text-align: center;
      font-size: 7px;
    }

    .hsn-total-row {
      background: rgba(3, 113, 193, 0.2);
      font-weight: bold;
    }

    .hsn-total-cell {
      border: 1px solid #0066cc;
      border-top: 1px solid #0066cc;
      padding: 4px 2px;
      text-align: center;
      font-size: 7px;
      font-weight: bold;
    }

    /* Combined Bottom Section */
    .bottom-section-combined {
      border: 1px solid #0066cc;
      margin-bottom: 2px;
      background: white;
    }

    .combined-box {
      display: flex;
      min-height: 100px;
    }

    .bank-amount-left {
      flex: 1;
      padding: 8px;
    }

    .bank-amount-right {
      flex: 1;
      padding: 8px;
    }

    .vertical-separator {
      width: 1px;
      background: #0066cc;
      // margin: 2px 0;
    }

    .bank-details-simple {
      font-size: 7px;
    }

    .bank-row-simple {
      display: flex;
      margin-bottom: 3px;
      line-height: 1.4;
    }

    .bank-label-simple {
      width: 50px;
      font-weight: bold;
      margin-right: 5px;
      flex-shrink: 0;
    }

    .amount-details {
      font-size: 7px;
    }

    .amount-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      padding-bottom: 2px;
    }

    .amount-label {
      font-weight: normal;
      color: #333;
    }

    .amount-value {
      font-weight: normal;
      text-align: right;
      color: #333;
    }

    .amount-total {
      background: rgba(3, 113, 193, 0.2);
      margin: 4px -8px;
      padding: 4px 8px;
      // border-top: 1px solid #ccc;
      // border-bottom: 1px solid #ccc;
    }

    .amount-label-total {
      font-weight: bold;
      color: #000;
    }

    .amount-value-total {
      font-weight: bold;
      text-align: right;
      color: #000;
    }

    .signature {
      margin-top: 8px;
      padding-top: 4px;
      border-top: 1px dashed #999;
    }

    .amount-label-signature {
      font-style: italic;
      color: #333;
    }

    .amount-value-signature {
      font-style: italic;
      text-align: right;
      color: #333;
    }

    /* Notes Section */
    .notes-section {
      border: 1px solid #0066cc;
      padding: 4px;
      font-size: 7px;
      margin-bottom: 2px;
      line-height: 1.4;
      background: white;
    }

    /* Page Number */
    .page-number {
      text-align: right;
      font-size: 7px;
      color: #666;
      margin-top: 4px;
    }
  `,
};

// Generate PDF function
export const generatePdfForTemplateA5_2 = async (
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

    const HTMLContent = TemplateA5_2PDF({
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
      height: 595, // A5 height in points
      width: 420,  // A5 width in points
    };

    const file = await generatePDF(options);

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

export default TemplateA5_2PDF;