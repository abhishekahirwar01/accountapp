// pdf-templateA5-3-updated.js - Matches the provided image exactly
import React from 'react';
import { generatePDF } from 'react-native-html-to-pdf';
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
import { BASE_URL } from '../config';

const getClientName = client => {
  if (!client) return 'Client Name';
  if (typeof client === 'string') return client;
  return client.companyName || client.contactName || 'Client Name';
};

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
    return notes;
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
    bankData?.qrCode ||
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

  // Generate table headers exactly as in image
  const generateTableHeaders = () => {
    if (!isGSTApplicable || showNoTax) {
      return `
        <tr>
          <th class="header-cell" rowspan="2" style="width: 5%;">Sr. No.</th>
          <th class="header-cell" rowspan="2" style="width: 28%; text-align: left;">Name of Product/Service</th>
          <th class="header-cell" rowspan="2" style="width: 10%;">HSN/SAC</th>
          <th class="header-cell" rowspan="2" style="width: 7%;">Qty</th>
          <th class="header-cell" rowspan="2" style="width: 10%;">Rate (Rs.)</th>
          <th class="header-cell" rowspan="2" style="width: 15%;">Taxable Value (Rs.)</th>
          <th class="header-cell" rowspan="2" style="width: 15%;">Total (Rs.)</th>
        </tr>
      `;
    } else if (showIGST) {
      return `
        <tr>
          <th class="header-cell" rowspan="2" style="width: 5%;">Sr. No.</th>
          <th class="header-cell" rowspan="2" style="width: 22%; text-align: left;">Name of Product/Service</th>
          <th class="header-cell" rowspan="2" style="width: 8%;">HSN/SAC</th>
          <th class="header-cell" rowspan="2" style="width: 6%;">Qty</th>
          <th class="header-cell" rowspan="2" style="width: 9%;">Rate (Rs.)</th>
          <th class="header-cell" rowspan="2" style="width: 12%;">Taxable Value (Rs.)</th>
          <th class="header-cell tax-header" colspan="2" style="width: 18%;">IGST</th>
          <th class="header-cell" rowspan="2" style="width: 12%;">Total (Rs.)</th>
        </tr>
        <tr>
          <th class="sub-header-cell" style="width: 6%;">%</th>
          <th class="sub-header-cell" style="width: 12%;">Amount</th>
        </tr>
      `;
    } else {
      return `
        <tr>
          <th class="header-cell" rowspan="2" style="width: 5%;">Sr. No.</th>
          <th class="header-cell" rowspan="2" style="width: 20%; text-align: left;">Name of Product/Service</th>
          <th class="header-cell" rowspan="2" style="width: 7%;">HSN/SAC</th>
          <th class="header-cell" rowspan="2" style="width: 5%;">Qty</th>
          <th class="header-cell" rowspan="2" style="width: 8%;">Rate (Rs.)</th>
          <th class="header-cell" rowspan="2" style="width: 10%;">Taxable Value (Rs.)</th>
          <th class="header-cell tax-header" colspan="2" style="width: 15%;">CGST</th>
          <th class="header-cell tax-header" colspan="2" style="width: 15%;">SGST</th>
          <th class="header-cell" rowspan="2" style="width: 10%;">Total (Rs.)</th>
        </tr>
        <tr>
          <th class="sub-header-cell" style="width: 5%;">%</th>
          <th class="sub-header-cell" style="width: 10%;">Amount</th>
          <th class="sub-header-cell" style="width: 5%;">%</th>
          <th class="sub-header-cell" style="width: 10%;">Amount</th>
        </tr>
      `;
    }
  };

  // Generate table rows
  const generateTableRows = () => {
    if (!itemsWithGST || itemsWithGST.length === 0) {
      return '<tr><td colspan="11" class="no-items">No items found</td></tr>';
    }

    if (showIGST) {
      return itemsWithGST
        .map((item, index) => {
          const itemName = getItemName(item);
          return `
            <tr class="item-row">
              <td class="item-cell">${index + 1}</td>
              <td class="item-cell text-left">${capitalizeWords(itemName)}</td>
              <td class="item-cell">${item.code || '-'}</td>
              <td class="item-cell">${
                item.itemType === 'service'
                  ? '-'
                  : formatQuantity(item.quantity || 0, item.unit)
              }</td>
              <td class="item-cell">${formatCurrency(item.pricePerUnit || 0)}</td>
              <td class="item-cell">${formatCurrency(item.taxableValue)}</td>
              <td class="item-cell">${item.gstRate}%</td>
              <td class="item-cell">${formatCurrency(item.igst)}</td>
              <td class="item-cell">${formatCurrency(item.total)}</td>
            </tr>
          `;
        })
        .join('');
    }

    if (showCGSTSGST) {
      return itemsWithGST
        .map((item, index) => {
          const itemName = getItemName(item);
          return `
            <tr class="item-row">
              <td class="item-cell">${index + 1}</td>
              <td class="item-cell text-left">${capitalizeWords(itemName)}</td>
              <td class="item-cell">${item.code || '-'}</td>
              <td class="item-cell">${
                item.itemType === 'service'
                  ? '-'
                  : formatQuantity(item.quantity || 0, item.unit)
              }</td>
              <td class="item-cell">${formatCurrency(item.pricePerUnit || 0)}</td>
              <td class="item-cell">${formatCurrency(item.taxableValue)}</td>
              <td class="item-cell">${(item.gstRate / 2).toFixed(2)}%</td>
              <td class="item-cell">${formatCurrency(item.cgst)}</td>
              <td class="item-cell">${(item.gstRate / 2).toFixed(2)}%</td>
              <td class="item-cell">${formatCurrency(item.sgst)}</td>
              <td class="item-cell">${formatCurrency(item.total)}</td>
            </tr>
          `;
        })
        .join('');
    }

    return itemsWithGST
      .map((item, index) => {
        const itemName = getItemName(item);
        return `
          <tr class="item-row">
            <td class="item-cell">${index + 1}</td>
            <td class="item-cell text-left">${capitalizeWords(itemName)}</td>
            <td class="item-cell">${item.code || '-'}</td>
            <td class="item-cell">${
              item.itemType === 'service'
                ? '-'
                : formatQuantity(item.quantity || 0, item.unit)
            }</td>
            <td class="item-cell">${formatCurrency(item.pricePerUnit || 0)}</td>
            <td class="item-cell">${formatCurrency(item.taxableValue)}</td>
            <td class="item-cell">${formatCurrency(item.total)}</td>
          </tr>
        `;
      })
      .join('');
  };

  const generateTotalRow = () => {
    if (!isGSTApplicable || showNoTax) {
      return `
        <tr class="total-row">
          <td colspan="3" class="total-label-cell">Total</td>
          <td class="total-cell">${totalQty}</td>
          <td class="total-cell"></td>
          <td class="total-cell">${formatCurrency(totalTaxable)}</td>
          <td class="total-cell grand-total-cell">${formatCurrency(totalAmount)}</td>
        </tr>
      `;
    } else if (showIGST) {
      return `
        <tr class="total-row">
          <td colspan="3" class="total-label-cell">Total</td>
          <td class="total-cell">${totalQty}</td>
          <td class="total-cell"></td>
          <td class="total-cell">${formatCurrency(totalTaxable)}</td>
          <td class="total-cell"></td>
          <td class="total-cell">${formatCurrency(totalIGST)}</td>
          <td class="total-cell grand-total-cell">${formatCurrency(totalAmount)}</td>
        </tr>
      `;
    } else {
      return `
        <tr class="total-row">
          <td colspan="3" class="total-label-cell">Total</td>
          <td class="total-cell">${totalQty}</td>
          <td class="total-cell"></td>
          <td class="total-cell">${formatCurrency(totalTaxable)}</td>
          <td class="total-cell"></td>
          <td class="total-cell">${formatCurrency(totalCGST)}</td>
          <td class="total-cell"></td>
          <td class="total-cell">${formatCurrency(totalSGST)}</td>
          <td class="total-cell grand-total-cell">${formatCurrency(totalAmount)}</td>
        </tr>
      `;
    }
  };

  // Generate HSN Summary exactly as in image
  const generateHsnSummary = () => {
    if (!isGSTApplicable) return '';

    const hsnSummary = getHsnSummary(itemsWithGST, showIGST, showCGSTSGST);

    const createHsnHeaders = () => {
      if (showIGST) {
        return `
          <tr>
            <th class="hsn-header" rowspan="2" style="width: 15%;">HSN / SAC</th>
            <th class="hsn-header" rowspan="2" style="width: 20%;">Taxable Value (Rs.)</th>
            <th class="hsn-header tax-header" colspan="2" style="width: 30%;">IGST</th>
            <th class="hsn-header" rowspan="2" style="width: 20%;">Total (Rs.)</th>
          </tr>
          <tr>
            <th class="hsn-sub-header" style="width: 8%;">%</th>
            <th class="hsn-sub-header" style="width: 22%;">Amount</th>
          </tr>
        `;
      } else if (showCGSTSGST) {
        return `
          <tr>
            <th class="hsn-header" rowspan="2" style="width: 12%;">HSN / SAC</th>
            <th class="hsn-header" rowspan="2" style="width: 18%;">Taxable Value (Rs.)</th>
            <th class="hsn-header tax-header" colspan="2" style="width: 23%;">CGST</th>
            <th class="hsn-header tax-header" colspan="2" style="width: 23%;">SGST</th>
            <th class="hsn-header" rowspan="2" style="width: 12%;">Total (Rs.)</th>
          </tr>
          <tr>
            <th class="hsn-sub-header" style="width: 6%;">%</th>
            <th class="hsn-sub-header" style="width: 17%;">Amount</th>
            <th class="hsn-sub-header" style="width: 6%;">%</th>
            <th class="hsn-sub-header" style="width: 17%;">Amount</th>
          </tr>
        `;
      }
    };

    const createHsnRows = () => {
      return hsnSummary
        .map(
          (hsnItem, index) => {
            if (showIGST) {
              return `
                <tr class="hsn-row">
                  <td class="hsn-cell">${hsnItem.hsnCode}</td>
                  <td class="hsn-cell">${formatCurrency(hsnItem.taxableValue)}</td>
                  <td class="hsn-cell">${hsnItem.taxRate}%</td>
                  <td class="hsn-cell">${formatCurrency(hsnItem.taxAmount)}</td>
                  <td class="hsn-cell">${formatCurrency(hsnItem.total)}</td>
                </tr>
              `;
            } else if (showCGSTSGST) {
              return `
                <tr class="hsn-row">
                  <td class="hsn-cell">${hsnItem.hsnCode}</td>
                  <td class="hsn-cell">${formatCurrency(hsnItem.taxableValue)}</td>
                  <td class="hsn-cell">${(hsnItem.taxRate / 2).toFixed(2)}%</td>
                  <td class="hsn-cell">${formatCurrency(hsnItem.cgstAmount)}</td>
                  <td class="hsn-cell">${(hsnItem.taxRate / 2).toFixed(2)}%</td>
                  <td class="hsn-cell">${formatCurrency(hsnItem.sgstAmount)}</td>
                  <td class="hsn-cell">${formatCurrency(hsnItem.total)}</td>
                </tr>
              `;
            }
          }
        )
        .join('');
    };

    const createHsnTotalRow = () => {
      if (showIGST) {
        return `
          <tr class="hsn-total-row">
            <td class="hsn-total-cell">Total</td>
            <td class="hsn-total-cell">${formatCurrency(totalTaxable)}</td>
            <td class="hsn-total-cell"></td>
            <td class="hsn-total-cell">${formatCurrency(totalIGST)}</td>
            <td class="hsn-total-cell">${formatCurrency(totalAmount)}</td>
          </tr>
        `;
      } else if (showCGSTSGST) {
        return `
          <tr class="hsn-total-row">
            <td class="hsn-total-cell">Total</td>
            <td class="hsn-total-cell">${formatCurrency(totalTaxable)}</td>
            <td class="hsn-total-cell"></td>
            <td class="hsn-total-cell">${formatCurrency(totalCGST)}</td>
            <td class="hsn-total-cell"></td>
            <td class="hsn-total-cell">${formatCurrency(totalSGST)}</td>
            <td class="hsn-total-cell">${formatCurrency(totalAmount)}</td>
          </tr>
        `;
      }
    };

    return `
      <div class="hsn-section">
        
        <table class="hsn-table">
          <thead>
            ${createHsnHeaders()}
          </thead>
          <tbody>
            ${createHsnRows()}
            ${createHsnTotalRow()}
          </tbody>
        </table>
      </div>
    `;
  };

  const formattedNotes = getTransactionValue('notes')
    ? formatNotesHtml(getTransactionValue('notes'))
    : '';

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
          <!-- Top Header with Company Name -->
          <div class="top-header">
            <div class="company-name-large">${capitalizeWords(
              getCompanyValue('businessName') ||
                getCompanyValue('companyName') ||
                'Tech Solutions Bhopal Pvt. Ltd.',
            )}</div>
            <div class="company-address-small">${
              [
                getCompanyValue('address'),
                getCompanyValue('City'),
                getCompanyValue('addressState'),
                getCompanyValue('Pincode'),
              ]
                .filter(Boolean)
                .join(', ') || '123, Commercial Area, Gandhi Nagar, Bhopal, Madhya Pradesh, 462036'
            }</div>
            <div class="company-contact-small">
              <strong>Name :</strong> ${capitalizeWords(getClientName(client))} | 
              <strong>Phone :</strong> ${
                getCompanyValue('mobileNumber')
                  ? formatPhoneNumber(String(getCompanyValue('mobileNumber')))
                  : '98765-43250'
              }
            </div>
          </div>

          <!-- GSTIN and Invoice Title Row -->
          <div class="title-row">
            <div class="gstin-box">
              <strong>GSTIN :</strong> ${getCompanyValue('gstin') || '23AABCP1234D1ZS'}
            </div>
            <div class="invoice-title-box">
              <strong>${
                getTransactionValue('type') === 'proforma'
                  ? 'PROFORMA INVOICE'
                  : isGSTApplicable
                  ? 'TAX INVOICE'
                  : 'INVOICE'
              }</strong>
            </div>
            <div class="recipient-box">
              <strong>ORIGINAL FOR RECIPIENT</strong>
            </div>
          </div>

          <!-- Three Column Information Section -->
          <div class="info-grid">
            <!-- Column 1 - Buyer Details -->
            <div class="info-box">
              <div class="box-title">Details of Buyer | Billed to:</div>
              <div class="info-content">
                <div class="info-line"><strong>Name</strong><span>${capitalizeWords(
                  getPartyValue('name') || 'N/A',
                )}</span></div>
                <div class="info-line"><strong>Address</strong><span>${
                  capitalizeWords(getBillingAddress(party)) || 'Bhopal, Bhopal, Madhya Pradesh, 462016'
                }</span></div>
                <div class="info-line"><strong>Phone</strong><span>${
                  getPartyValue('contactNumber')
                    ? formatPhoneNumber(getPartyValue('contactNumber'))
                    : '98265-21255'
                }</span></div>
                <div class="info-line"><strong>GSTIN</strong><span>${
                  getPartyValue('gstin') || '23FFFPS1634H1ZT'
                }</span></div>
                <div class="info-line"><strong>PAN</strong><span>${
                  getPartyValue('pan') || '432188PIB5'
                }</span></div>
                <div class="info-line"><strong>Place of Supply</strong><span>${
                  shippingAddress?.state
                    ? `${capitalizeWords(shippingAddress.state)} (${
                        getStateCode(shippingAddress.state) || '23'
                      })`
                    : getPartyValue('state')
                    ? `${capitalizeWords(getPartyValue('state'))} (${
                        getStateCode(getPartyValue('state')) || '23'
                      })`
                    : 'Madhya Pradesh (23)'
                }</span></div>
              </div>
            </div>

            <!-- Column 2 - Consignee Details -->
            <div class="info-box">
              <div class="box-title">Details of Consigned | Shipped to:</div>
              <div class="info-content">
                <div class="info-line"><strong>Name</strong><span>${capitalizeWords(
                  actualShippingAddress?.label || getPartyValue('name') || 'N/A',
                )}</span></div>
                <div class="info-line"><strong>Address</strong><span>${capitalizeWords(
                  getShippingAddress(
                    actualShippingAddress,
                    getBillingAddress(party),
                  ),
                )}</span></div>
                <div class="info-line"><strong>Country</strong><span>India</span></div>
                <div class="info-line"><strong>Phone</strong><span>${
                  actualShippingAddress?.contactNumber
                    ? formatPhoneNumber(String(actualShippingAddress.contactNumber))
                    : getPartyValue('contactNumber')
                    ? formatPhoneNumber(String(getPartyValue('contactNumber')))
                    : '98265-21255'
                }</span></div>
                <div class="info-line"><strong>GSTIN</strong><span>${
                  getPartyValue('gstin') || '23FFFPS1634H1ZT'
                }</span></div>
                <div class="info-line"><strong>State</strong><span>${
                  actualShippingAddress?.state
                    ? `${capitalizeWords(actualShippingAddress.state)} (${
                        getStateCode(actualShippingAddress.state) || '23'
                      })`
                    : getPartyValue('state')
                    ? `${capitalizeWords(getPartyValue('state'))} (${
                        getStateCode(getPartyValue('state')) || '23'
                      })`
                    : 'Madhya Pradesh (23)'
                }</span></div>
              </div>
            </div>

            <!-- Column 3 - Invoice Details -->
            <div class="info-box">
              <div class="box-title">&nbsp;</div>
              <div class="info-content">
                <div class="info-line"><strong>Invoice No.</strong><span>${
                  getTransactionValue('invoiceNumber') || 'INV-001'
                }</span></div>
                <div class="info-line"><strong>Date</strong><span>${
                  getTransactionValue('date')
                    ? new Date(getTransactionValue('date')).toLocaleDateString('en-IN')
                    : new Date().toLocaleDateString('en-IN')
                }</span></div>
                <div class="info-line"><strong>Invoice Date</strong><span>${
                  getTransactionValue('date')
                    ? new Date(getTransactionValue('date')).toLocaleDateString('en-IN')
                    : '31/12/2025'
                }</span></div>
                <div class="info-line"><strong>Due Date</strong><span>${
                  getTransactionValue('dueDate')
                    ? new Date(getTransactionValue('dueDate')).toLocaleDateString('en-IN')
                    : '-'
                }</span></div>
                <div class="info-line"><strong>P.O. No.</strong><span>${
                  getTransactionValue('voucher') || 'P.O/48'
                }</span></div>
                <div class="info-line"><strong>E-Way No.</strong><span>${
                  getTransactionValue('eway') || '-'
                }</span></div>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              ${generateTableHeaders()}
            </thead>
            <tbody>
              ${generateTableRows()}
              ${generateTotalRow()}
            </tbody>
          </table>

          <!-- Total in Words -->
          <div class="words-section">
            <strong>TOTAL IN WORDS :</strong> ${numberToWords(totalAmount).toUpperCase()}
          </div>

          <!-- HSN Summary -->
          ${generateHsnSummary()}

          <!-- Bank and Total Section -->
          <div class="bottom-grid">
            <!-- Bank Details -->
            <div class="bank-details-box">
              ${
                getTransactionValue('type') !== 'proforma' &&
                isBankDetailAvailable
                  ? `
                <div class="section-title">Bank Details:</div>
                ${
                  bankData.bankName
                    ? `<div class="detail-line"><strong>Name:</strong> ${capitalizeWords(bankData.bankName)}</div>`
                    : ''
                }
                ${
                  bankData.accountNo
                    ? `<div class="detail-line"><strong>Acc. No:</strong> ${bankData.accountNo}</div>`
                    : ''
                }
                ${
                  bankData.ifscCode
                    ? `<div class="detail-line"><strong>IFSC:</strong> ${bankData.ifscCode}</div>`
                    : ''
                }
                ${
                  bankData.branchAddress
                    ? `<div class="detail-line"><strong>Branch:</strong> ${bankData.branchAddress}</div>`
                    : ''
                }
                ${
                  bankData?.upiDetails?.upiId
                    ? `<div class="detail-line"><strong>UPI ID:</strong> ${bankData.upiDetails.upiId}</div>`
                    : ''
                }
                ${
                  bankData?.upiDetails?.upiName
                    ? `<div class="detail-line"><strong>UPI Name:</strong> ${bankData.upiDetails.upiName}</div>`
                    : ''
                }
                ${
                  bankData?.upiDetails?.upiMobile
                    ? `<div class="detail-line"><strong>UPI Mobile:</strong> ${bankData.upiDetails.upiMobile}</div>`
                    : ''
                }
              `
                  : '<div class="section-title">Bank Details:</div>'
              }
            </div>

            <!-- QR Code -->
            <div class="qr-box">
              ${
                bankData?.qrCode
                  ? `
                <div class="section-title">QR Code</div>
                <img src="${BASE_URL}${bankData.qrCode}" class="qr-image" />
              `
                  : '<div class="section-title">QR Code</div>'
              }
            </div>

            <!-- Total Amounts -->
            <div class="totals-box">
              <div class="total-line">
                <span>Taxable Amount</span>
                <span>${formatCurrency(totalTaxable)}</span>
              </div>
              ${
                isGSTApplicable
                  ? `
                <div class="total-line">
                  <span>Total Tax</span>
                  <span>${formatCurrency(
                    showIGST ? totalIGST : totalCGST + totalSGST,
                  )}</span>
                </div>
              `
                  : ''
              }
              <div class="grand-total-line">
                <span><strong>Total Amount After Tax</strong></span>
                <span><strong>${formatCurrency(totalAmount)}</strong></span>
              </div>
              <div class="signature-line">
                <span>For ${capitalizeWords(
                  getCompanyValue('businessName') ||
                    getCompanyValue('companyName') ||
                    'Tech Solutions Bhopal Pvt. Ltd.',
                )}</span>
                <span>(E & O.E.)</span>
              </div>
            </div>
          </div>

          <!-- Terms and Notes -->
          ${
            formattedNotes
              ? `
            <div class="notes-box">
              <div class="section-title">Notes/Terms:</div>
              <div class="notes-content">${formattedNotes}</div>
            </div>
          `
              : ''
          }

          <!-- Page Number -->
          <div class="page-footer">
            1 / 1 page
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return generateHTMLContent();
};

// Complete CSS matching the image layout
const styles = {
  css: `
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 8px;
      color: #000;
      background: #fff;
      width: 148mm;
      margin: 0 auto;
      padding-top: 5mm;
    }
    
    .page {
      width: 148mm;
      min-height: 210mm;
      position: relative;
    }
    
    /* Top Header */
    .top-header {
      text-align: center;
      padding-bottom: 5px;
      margin-bottom: 5px;
    }
    
    .company-name-large {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .company-address-small {
      font-size: 7px;
      margin-bottom: 2px;
    }
    
    .company-contact-small {
      font-size: 7px;
    }
    
    /* Title Row */
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #0066cc;
      padding: 3px 3px;
      font-size: 8px;
      margin-bottom: 0;
    }
    
    .gstin-box {
      flex: 1;
      text-align: left;
    }
    
    .invoice-title-box {
      flex: 1;
      text-align: center;
      font-size: 11px;
    }
    
    .recipient-box {
      flex: 1;
      text-align: right;
      font-size: 7px;
    }
    
    /* Info Grid - Three Columns */
    .info-grid {
      display: flex;
      border: 1px solid #0066cc;
      border-top: none;
      margin-bottom: 0;
    }
    
    .info-box {
      flex: 1;
      padding: 0;
      border-right: 1px solid #0066cc;
    }
    
    .info-box:last-child {
      border-right: none;
    }
    
    .box-title {
      background: rgba(3, 113, 193, 0.2);
      padding: 3px 5px;
      font-weight: bold;
      border-bottom: 1px solid #0066cc;
      font-size: 7px;
    }
    
    .info-content {
      padding: 5px;
    }
    
    .info-line {
      display: flex;
      margin-bottom: 3px;
      line-height: 1.3;
    }
    
    .info-line strong {
      min-width: 75px;
      flex-shrink: 0;
    }
    
    .info-line span {
      flex: 1;
      word-wrap: break-word;
    }
    
    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #0066cc;
      border-top: none;
      margin-bottom: 0;
      font-size: 7px;
    }
    
    .items-table thead {
      background: rgba(3, 113, 193, 0.2)
    }
    
    .header-cell {
      border: 1px solid #0066cc;
      border-top: none;
      padding: 3px;
      text-align: center;
      font-weight: bold;
      font-size: 7px;
    }
    
    .tax-header {
      // background: rgba(3, 113, 193, 0.2);
    }
    
    .sub-header-cell {
      border: 1px solid #0066cc;
      border-top: none;
      padding: 2px;
      text-align: center;
      font-weight: bold;
      font-size: 6px;
      // background: rgba(3, 113, 193, 0.2);
    }
    
    .item-row {
      border-bottom: 1px solid #0066cc;
    }
    
    .item-cell {
      border: 1px solid #0066cc;
      padding: 3px;
      text-align: center;
      font-size: 7px;
    }
    
    .text-left {
      text-align: left !important;
      padding-left: 5px;
    }
    
    .no-items {
      padding: 10px;
      text-align: center;
      font-style: italic;
      color: #666;
    }
    
    /* Total Row */
    .total-row {
      background: rgba(3, 113, 193, 0.2);
      font-weight: bold;
    }
    
    .total-label-cell {
      border: 1px solid #0066cc;
      padding: 4px;
      text-align: left;
      padding-left: 10px;
      font-weight: bold;
    }
    
    .total-cell {
      border: 1px solid #0066cc;
      padding: 4px;
      text-align: center;
      font-weight: bold;
    }
    
    .grand-total-cell {
      // background: rgba(3, 113, 193, 0.2);
      font-weight: bold;
    }
    
    /* Words Section */
    .words-section {
      border: 1px solid #0066cc;
      border-top: none;
      padding: 5px;
      margin-bottom: 0;
      font-size: 7px;
      text-transform: uppercase;
    }
    
    /* HSN Summary */
    .hsn-section {
      border: 1px solid #0066cc;
      border-top: none;
      margin-bottom: 0;
    }
    
    .hsn-title-row {
      background: rgba(3, 113, 193, 0.2);
      border-bottom: 1px solid #0066cc;
      padding: 3px 5px;
    }
    
    .hsn-title {
      font-weight: bold;
      font-size: 8px;
    }
    
    .hsn-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .hsn-header {
      background: rgba(3, 113, 193, 0.2);
      border: 1px solid #0066cc;
      border-top: none;
      padding: 3px;
      text-align: center;
      font-weight: bold;
      font-size: 7px;
    }
    
    .hsn-sub-header {
      background: rgba(3, 113, 193, 0.2);
      border: 1px solid #0066cc;
      border-top: none;
      padding: 2px;
      text-align: center;
      font-weight: bold;
      font-size: 6px;
    }
    
    .hsn-row {
      border-bottom: 1px solid #0066cc;
    }
    
    .hsn-cell {
      border: 1px solid #0066cc;
      // border-left:none;
      // border-right:none;
      padding: 3px;
      text-align: center;
      font-size: 7px;
    }
    
    .hsn-total-row {
      background: rgba(3, 113, 193, 0.2);
      font-weight: bold;
    }
    
    .hsn-total-cell {
      // border: 1px solid #000;
      padding: 4px;
      text-align: center;
      font-weight: bold;
      font-size: 7px;
    }
    
    /* Bottom Grid */
    .bottom-grid {
      display: flex;
      border: 1px solid #0066cc;
      border-top: none;
      margin-bottom: 0;
    }
    
    .bank-details-box {
      flex: 2;
      // border-right: 1px solid #000;
      padding: 5px;
      font-size: 7px;
      margin-right:-50px;
    }
    
    .qr-box {
      width: 80px;
      border-right: 1px solid #0066cc;
      padding: 5px;
      text-align: center;
      font-size: 7px; 
    }
    
    .qr-image {
      width: 70px;
      height: 70px;
      object-fit: contain;
      margin-top: 5px;
    }
    
    .totals-box {
      flex: 1.5;
      padding: 5px;
      font-size: 7px;
    }
    
    .section-title {
      font-weight: bold;
      margin-bottom: 5px;
      font-size: 8px;
    }
    
    .detail-line {
      margin-bottom: 3px;
      line-height: 1.4;
    }
    
    .total-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      padding: 2px 0;
    }
    
    .grand-total-line {
      display: flex;
      justify-content: space-between;
      padding: 5px;
      margin: 5px -4.5px;
      background: rgba(3, 113, 193, 0.2);
      border-top: 1px solid #0066cc;
      border-bottom: 1px solid #0066cc;
      font-weight: bold;
    }
    
    .signature-line {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      padding-top: 5px;
      border-top: 1px dashed #999;
      font-style: italic;
      font-size: 7px;
    }
    
    /* Notes Box */
    .notes-box {
      border: 1px solid #0066cc;
      border-top: none;
      padding: 5px;
      margin-bottom: 5px;
      font-size: 7px;
    }
    
    .notes-content {
      margin-top: 3px;
      line-height: 1.4;
    }
    
    /* Page Footer */
    .page-footer {
      text-align: right;
      font-size: 7px;
      color: #666;
      margin-top: 5px;
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
      height: 595,
      width: 420,
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

export default TemplateA5_3PDF;