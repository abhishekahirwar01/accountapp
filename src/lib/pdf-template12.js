// src/components/Template12PDF.js

import React from 'react';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import {
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  prepareTemplate8Data,
  getStateCode,
  formatQuantity,
  formatPhoneNumber,
  numberToWords,
} from './pdf-utils';
import { parseHtmlToElements } from './HtmlNoteRenderer';
import { capitalizeWords } from './utils';
import { BASE_URL } from '../config';

// Enhanced number to words function (same as web version)
const convertNumberToWords = num => {
  if (num === 0) return 'Zero';
  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const inWords = n => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        ' Hundred' +
        (n % 100 ? ' ' + inWords(n % 100) : '')
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        ' Thousand' +
        (n % 1000 ? ' ' + inWords(n % 1000) : '')
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        ' Lakh' +
        (n % 100000 ? ' ' + inWords(n % 100000) : '')
      );
    return (
      inWords(Math.floor(n / 10000000)) +
      ' Crore' +
      (n % 10000000 ? ' ' + inWords(n % 10000000) : '')
    );
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let words = inWords(integerPart);

  if (decimalPart > 0) {
    words += ' and ' + inWords(decimalPart) + ' Paise';
  }

  return words;
};

// Enhanced HTML notes formatting
const formatNotesHtml = notes => {
  if (!notes) return '';

  try {
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
    // Fallback to basic replacement
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
      .replace(/<\/li>/gi, '</div>');
  }
};

const Template12PDF = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
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

  const {
    totalTaxable,
    totalAmount,
    totalCGST,
    totalSGST,
    totalIGST,
    totalItems,
    totalQty,
    isGSTApplicable,
    showIGST,
    showCGSTSGST,
    itemsWithGST,
  } = prepareData();

  const logoSrc = company?.logo ? `${BASE_URL}${company.logo}` : null;
  const shouldHideBankDetails = transaction?.type === 'proforma';
  const showNoGST = !isGSTApplicable || (!showIGST && !showCGSTSGST);

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

  // Generate GST summary table rows
  const generateGSTSummaryRows = () => {
    if (!itemsWithGST || itemsWithGST.length === 0) {
      return '<tr><td colspan="7" style="padding: 8px; text-align: center; border: 0.5px solid #1976d2;">No items found</td></tr>';
    }

    return itemsWithGST
      .map((item, idx) => {
        const taxable = item.taxableValue || 0;
        const totalLine =
          item.total ??
          taxable + (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);

        if (showIGST && !showNoGST) {
          return `
          <tr style="border-bottom: 0.5px solid #1976d2;">
            <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;">${
              item.code || '-'
            }</td>
            <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;">${formatCurrency(
              taxable,
            )}</td>
            <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;">${Number(
              item.gstRate || 0,
            ).toFixed(2)}%</td>
            <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;">${formatCurrency(
              item.igst || 0,
            )}</td>
            <td style="padding: 4px; text-align: center; font-size: 8px;">${formatCurrency(
              totalLine,
            )}</td>
          </tr>
        `;
        }

        if (showCGSTSGST && !showNoGST) {
          const halfRate = Number((item.gstRate || 0) / 2);
          return `
          <tr style="border-bottom: 0.5px solid #1976d2;">
            <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;">${
              item.code || '-'
            }</td>
            <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;">${formatCurrency(
              taxable,
            )}</td>
            <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;">${halfRate.toFixed(
              2,
            )}%</td>
            <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;">${formatCurrency(
              item.cgst || 0,
            )}</td>
            <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;">${halfRate.toFixed(
              2,
            )}%</td>
            <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;">${formatCurrency(
              item.sgst || 0,
            )}</td>
            <td style="padding: 4px; text-align: center; font-size: 8px;">${formatCurrency(
              totalLine,
            )}</td>
          </tr>
        `;
        }

        if (showNoGST) {
          return `
          <tr style="border-bottom: 0.5px solid #1976d2;">
            <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;">${
              item.code || '-'
            }</td>
            <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;">${formatCurrency(
              taxable,
            )}</td>
            <td style="padding: 4px; text-align: center; font-size: 8px; font-weight: bold;">${formatCurrency(
              taxable,
            )}</td>
          </tr>
        `;
        }

        return '';
      })
      .join('');
  };

  // Generate GST summary table header
  const generateGSTSummaryHeader = () => {
    if (showIGST && !showNoGST) {
      return `
        <th style="padding: 4px; background-color: #1976d2; color: white; border-right: 0.5px solid #1976d2; font-size: 8px; font-weight: bold; text-align: center;">HSN/SAC</th>
        <th style="padding: 4px; background-color: #1976d2; color: white; border-right: 0.5px solid #1976d2; font-size: 8px; font-weight: bold; text-align: center;">Taxable Value (Rs.)</th>
        <th style="padding: 4px; background-color: #1976d2; color: white; border-right: 0.5px solid #1976d2; font-size: 8px; font-weight: bold; text-align: center;">IGST %</th>
        <th style="padding: 4px; background-color: #1976d2; color: white; border-right: 0.5px solid #1976d2; font-size: 8px; font-weight: bold; text-align: center;">IGST Amt (Rs.)</th>
        <th style="padding: 4px; background-color: #1976d2; color: white; font-size: 8px; font-weight: bold; text-align: center;">Total (Rs.)</th>
      `;
    }

    if (showCGSTSGST && !showNoGST) {
      return `
        <th style="padding: 4px; background-color: #1976d2; color: white; border-right: 0.5px solid #1976d2; font-size: 8px; font-weight: bold; text-align: center;">HSN/SAC</th>
        <th style="padding: 4px; background-color: #1976d2; color: white; border-right: 0.5px solid #1976d2; font-size: 8px; font-weight: bold; text-align: center;">Taxable Value (Rs.)</th>
        <th style="padding: 4px; background-color: #1976d2; color: white; border-right: 0.5px solid #1976d2; font-size: 8px; font-weight: bold; text-align: center;">CGST %</th>
        <th style="padding: 4px; background-color: #1976d2; color: white; border-right: 0.5px solid #1976d2; font-size: 8px; font-weight: bold; text-align: center;">CGST Amt (Rs.)</th>
        <th style="padding: 4px; background-color: #1976d2; color: white; border-right: 0.5px solid #1976d2; font-size: 8px; font-weight: bold; text-align: center;">SGST %</th>
        <th style="padding: 4px; background-color: #1976d2; color: white; border-right: 0.5px solid #1976d2; font-size: 8px; font-weight: bold; text-align: center;">SGST Amt (Rs.)</th>
        <th style="padding: 4px; background-color: #1976d2; color: white; font-size: 8px; font-weight: bold; text-align: center;">Total (Rs.)</th>
      `;
    }

    if (showNoGST) {
      return `
        <th style="padding: 4px; background-color: #1976d2; color: white; border-right: 0.5px solid #1976d2; font-size: 8px; font-weight: bold; text-align: center;">HSN/SAC</th>
        <th style="padding: 4px; background-color: #1976d2; color: white; border-right: 0.5px solid #1976d2; font-size: 8px; font-weight: bold; text-align: center;">Taxable Value (Rs.)</th>
        <th style="padding: 4px; background-color: #1976d2; color: white; font-size: 8px; font-weight: bold; text-align: center;">Total (Rs.)</th>
      `;
    }

    return '';
  };

  // Generate GST summary table total row
  const generateGSTSummaryTotal = () => {
    if (showIGST && !showNoGST) {
      return `
        <tr>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px; font-weight: bold;">TOTAL</td>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px; font-weight: bold;">${formatCurrency(
            totalTaxable,
          )}</td>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;"></td>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px; font-weight: bold;">${formatCurrency(
            totalIGST,
          )}</td>
          <td style="padding: 4px; text-align: center; font-size: 8px; font-weight: bold;">${formatCurrency(
            totalAmount,
          )}</td>
        </tr>
      `;
    }

    if (showCGSTSGST && !showNoGST) {
      return `
        <tr>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px; font-weight: bold;">TOTAL</td>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px; font-weight: bold;">${formatCurrency(
            totalTaxable,
          )}</td>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;"></td>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px; font-weight: bold;">${formatCurrency(
            totalCGST,
          )}</td>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px;"></td>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px; font-weight: bold;">${formatCurrency(
            totalSGST,
          )}</td>
          <td style="padding: 4px; text-align: center; font-size: 8px; font-weight: bold;">${formatCurrency(
            totalAmount,
          )}</td>
        </tr>
      `;
    }

    if (showNoGST) {
      return `
        <tr>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px; font-weight: bold;">TOTAL</td>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px; font-weight: bold;">${formatCurrency(
            totalTaxable,
          )}</td>
          <td style="padding: 4px; text-align: center; font-size: 8px; font-weight: bold;">${formatCurrency(
            totalTaxable,
          )}</td>
        </tr>
      `;
    }

    return '';
  };

  // Generate main items table rows
  const generateItemsTableRows = () => {
    if (!itemsWithGST || itemsWithGST.length === 0) {
      return '<tr><td colspan="6" style="padding: 8px; text-align: center; border: 0.5px solid #1976d2;">No items found</td></tr>';
    }

    return itemsWithGST
      .map((item, idx) => {
        const itemName = getItemName(item);
        return `
        <tr style="border-bottom: 0.5px solid #1976d2;">
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px; width: 8%;">${
            idx + 1
          }</td>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: left; font-size: 8px; width: 42%;">${capitalizeWords(
            itemName,
          )}</td>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px; width: 12%;">${
            item.code || '-'
          }</td>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px; width: 12%;">${
            item.itemType === 'service'
              ? '-'
              : formatQuantity(item.quantity || 0, item.unit)
          }</td>
          <td style="padding: 4px; border-right: 0.5px solid #1976d2; text-align: center; font-size: 8px; width: 13%;">${
            item.pricePerUnit != null ? formatCurrency(item.pricePerUnit) : '-'
          }</td>
          <td style="padding: 4px; text-align: center; font-size: 8px; width: 13%;">${formatCurrency(
            item.taxableValue || 0,
          )}</td>
        </tr>
      `;
      })
      .join('');
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
          <!-- Header Section -->
          <div class="header">
            <div class="header-content">
              ${logoSrc ? `<img src="${logoSrc}" class="logo" />` : ''}
              <div class="company-details">
                <div class="company-name">${capitalizeWords(
                  getCompanyValue('businessName') ||
                    getCompanyValue('companyName') ||
                    'Company Name',
                )}</div>
                ${
                  getCompanyValue('gstin')
                    ? `
                  <div class="company-info">
                    <span class="label">GSTIN: </span>
                    <span>${getCompanyValue('gstin')}</span>
                  </div>
                `
                    : ''
                }
                <div class="company-info">${capitalizeWords(
                  getCompanyValue('address') || 'Address Line 1',
                )}</div>
                <div class="company-info">
                  ${capitalizeWords(getCompanyValue('City') || 'City')}, 
                  ${capitalizeWords(
                    getCompanyValue('addressState') || 'State',
                  )} - 
                  ${getCompanyValue('Pincode') || 'Pincode'}
                </div>
              </div>
            </div>

            <!-- Title -->
            <div class="title">
              ${
                getTransactionValue('type') === 'proforma'
                  ? 'PROFORMA INVOICE'
                  : isGSTApplicable
                  ? 'TAX INVOICE'
                  : 'INVOICE'
              }
            </div>

            <div class="divider-blue"></div>

            <!-- Customer Details | Consignee | Invoice Info - 3 Columns -->
            <div class="details-section">
              <!-- Customer Details (Left) -->
              <div class="details-column">
                <div class="section-header">Details of Buyer | Billed to :</div>
                <div class="detail-row">
                  <span class="label">Name:</span>
                  <span class="value">${
                    capitalizeWords(getPartyValue('name')) || '-'
                  }</span>
                </div>
                <div class="detail-row">
                  <span class="label">Phone:</span>
                  <span class="value">${
                    getPartyValue('contactNumber')
                      ? formatPhoneNumber(getPartyValue('contactNumber'))
                      : '-'
                  }</span>
                </div>
                <div class="detail-row">
                  <span class="label">Address:</span>
                  <span class="value">${capitalizeWords(
                    getBillingAddress(party),
                  )}</span>
                </div>
                <div class="detail-row">
                  <span class="label">PAN:</span>
                  <span class="value">${getPartyValue('pan') || '-'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">GSTIN:</span>
                  <span class="value">${getPartyValue('gstin') || '-'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Place of Supply:</span>
                  <span class="value">${
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

              <!-- Consignee Details (Middle) -->
              <div class="details-column">
                <div class="section-header">Details of Consigned | Shipped to :</div>
                <div class="detail-row">
                  <span class="label">Name:</span>
                  <span class="value">${capitalizeWords(
                    shippingAddress?.label || getPartyValue('name') || '-',
                  )}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Address:</span>
                  <span class="value">${capitalizeWords(
                    getShippingAddress(
                      shippingAddress,
                      getBillingAddress(party),
                    ),
                  )}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Country:</span>
                  <span class="value">${
                    getCompanyValue('Country') || '-'
                  }</span>
                </div>
                <div class="detail-row">
                  <span class="label">Phone:</span>
                  <span class="value">${formatPhoneNumber(
                    shippingAddress?.phone ||
                      shippingAddress?.mobileNumber ||
                      getPartyValue('contactNumber') ||
                      '-',
                  )}</span>
                </div>
                ${
                  isGSTApplicable
                    ? `
                  <div class="detail-row">
                    <span class="label">GSTIN:</span>
                    <span class="value">${shippingAddress?.gstin || '-'}</span>
                  </div>
                `
                    : ''
                }
                <div class="detail-row">
                  <span class="label">State:</span>
                  <span class="value">${
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

              <!-- Invoice Info (Right) -->
              <div class="details-column invoice-info">
                <div class="section-header placeholder">Placeholder</div>
                <div class="detail-row">
                  <span class="label">Invoice #:</span>
                  <span class="value">${
                    getTransactionValue('invoiceNumber') || '—'
                  }</span>
                </div>
                <div class="detail-row">
                  <span class="label">Invoice Date:</span>
                  <span class="value">${
                    getTransactionValue('date')
                      ? new Date(
                          getTransactionValue('date'),
                        ).toLocaleDateString('en-GB')
                      : '—'
                  }</span>
                </div>
                <div class="detail-row">
                  <span class="label">P.O. Date:</span>
                  <span class="value">${
                    getTransactionValue('dueDate')
                      ? new Date(
                          getTransactionValue('dueDate'),
                        ).toLocaleDateString('en-GB')
                      : '-'
                  }</span>
                </div>
                <div class="detail-row">
                  <span class="label">E-Way No.:</span>
                  <span class="value">-</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Items Table -->
          <div class="table-section">
            <table class="main-table">
              <thead>
                <tr>
                  <th style="width: 8%">Sr. No</th>
                  <th style="width: 42%">Name of Product / Service</th>
                  <th style="width: 12%">HSN/SAC</th>
                  <th style="width: 12%">Qty</th>
                  <th style="width: 13%">Rate (Rs.)</th>
                  <th style="width: 13%">Taxable Value(Rs.)</th>
                </tr>
              </thead>
              <tbody>
                ${generateItemsTableRows()}
              </tbody>
            </table>
          </div>

          <!-- Total Items/Qty -->
          <div class="total-items">
            <span class="bold">Total Items / Qty: </span>
            ${totalItems} / ${Number(totalQty || 0)}
          </div>

          <!-- Totals Section -->
          <div class="totals-section">
            <div class="totals-right">
              <div class="total-row">
                <span class="bold">Taxable Amount: </span>
                <span>Rs.${formatCurrency(totalTaxable)}</span>
              </div>
              ${
                isGSTApplicable && showIGST
                  ? `
                <div class="total-row">
                  <span class="bold">IGST: </span>
                  <span>Rs.${formatCurrency(totalIGST)}</span>
                </div>
              `
                  : ''
              }
              ${
                isGSTApplicable && showCGSTSGST
                  ? `
                <div class="total-row">
                  <span class="bold">CGST: </span>
                  <span>Rs.${formatCurrency(totalCGST)}</span>
                </div>
                <div class="total-row">
                  <span class="bold">SGST: </span>
                  <span>Rs.${formatCurrency(totalSGST)}</span>
                </div>
              `
                  : ''
              }
              <div class="total-row final-total">
                <span class="bold">Total Amount: </span>
                <span class="bold">Rs.${formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <!-- Total in Words -->
          <div class="total-words">
            <span class="bold">Total (in words): </span>
            <span>${convertNumberToWords(Math.round(totalAmount))} only</span>
          </div>

          <!-- GST Summary Table -->
          <div class="gst-summary">
            <table class="gst-table">
              <thead>
                <tr>
                  ${generateGSTSummaryHeader()}
                </tr>
              </thead>
              <tbody>
                ${generateGSTSummaryRows()}
                ${generateGSTSummaryTotal()}
              </tbody>
            </table>
          </div>

          <!-- Bank Details + Signatory Row -->
          <div class="bank-signatory-section">
            ${
              !shouldHideBankDetails
                ? `
              <div class="bank-details">
                <div class="bank-title">Bank Details:</div>
                ${
                  bank && typeof bank === 'object'
                    ? `
                  ${
                    bank.bankName
                      ? `
                    <div class="bank-row">
                      <span class="label">Name:</span>
                      <span>${capitalizeWords(bank.bankName)}</span>
                    </div>
                  `
                      : ''
                  }
                  ${
                    bank.ifscCode
                      ? `
                    <div class="bank-row">
                      <span class="label">IFSC:</span>
                      <span>${capitalizeWords(bank.ifscCode)}</span>
                    </div>
                  `
                      : ''
                  }
                  ${
                    bank.accountNo || bank.accountNumber
                      ? `
                    <div class="bank-row">
                      <span class="label">Account No:</span>
                      <span>${bank.accountNo || bank.accountNumber}</span>
                    </div>
                  `
                      : ''
                  }
                  ${
                    bank.branchAddress
                      ? `
                    <div class="bank-row">
                      <span class="label">Branch:</span>
                      <span>${capitalizeWords(bank.branchAddress)}</span>
                    </div>
                  `
                      : ''
                  }
                  ${
                    bank?.upiDetails?.upiId
                      ? `
                    <div class="bank-row">
                      <span class="label">UPI ID:</span>
                      <span>${bank.upiDetails.upiId}</span>
                    </div>
                  `
                      : ''
                  }
                  ${
                    bank?.upiDetails?.upiName
                      ? `
                    <div class="bank-row">
                      <span class="label">UPI Name:</span>
                      <span>${capitalizeWords(bank.upiDetails.upiName)}</span>
                    </div>
                  `
                      : ''
                  }
                  ${
                    bank?.upiDetails?.upiMobile
                      ? `
                    <div class="bank-row">
                      <span class="label">UPI Mobile:</span>
                      <span>${bank.upiDetails.upiMobile}</span>
                    </div>
                  `
                      : ''
                  }
                `
                    : `
                  <div class="no-bank-details">No bank details available</div>
                `
                }
              </div>

              ${
                bank?.qrCode
                  ? `
                <div class="qr-code-section">
                  <div class="qr-title">QR Code</div>
                  <div class="qr-code-container">
                    <img src="${BASE_URL}${bank.qrCode}" class="qr-code" />
                  </div>
                </div>
              `
                  : '<div class="qr-placeholder"></div>'
              }

            `
                : ''
            }

            <div class="signatory-section">
              <div class="for-company">For ${capitalizeWords(
                getCompanyValue('businessName') || 'Company',
              )}</div>
              <div class="signature-box"></div>
              <div class="signatory-text">Authorised Signatory</div>
            </div>
          </div>

          <!-- Terms and Conditions -->
          ${
            formattedNotes
              ? `
            <div class="notes-section">
              <div class="notes-content">${formattedNotes}</div>
            </div>
          `
              : ''
          }

          <!-- Page Number -->
          <div class="page-number">Page 1</div>
        </div>
      </body>
      </html>
    `;
  };

  return generateHTMLContent();
};

// CSS Styles matching the original design
const styles = {
  css: `
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
    
    body {
      font-family: 'Helvetica', Arial, sans-serif;
      font-size: 9px;
      color: #000;
      margin: 0;
      padding: 20px;
      padding-bottom: 60px;
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
      margin-bottom: 8px;
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .logo {
      width: 70px;
      height: 70px;
      object-fit: contain;
    }
    .company-details {
      text-align: right;
      flex: 1;
      margin-left: 10px;
    }
    .company-name {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .company-info {
      font-size: 8px;
      margin-bottom: 2px;
    }
    .label {
      font-weight: bold;
    }
    .title {
      text-align: center;
      font-size: 15px;
      font-weight: bold;
      color: #1976d2;
      margin-bottom: 6px;
    }
    .divider-blue {
      height: 1.5px;
      background-color: #1976d2;
      width: 100%;
      margin-bottom: 8px;
    }
    .details-section {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      gap: 12px;
    }
    .details-column {
      flex: 1;
    }
    .invoice-info {
      flex: 0.7;
    }
    .section-header {
      font-size: 9px;
      font-weight: bold;
      margin-bottom: 6px;
    }
    .placeholder {
      opacity: 0;
    }
    .detail-row {
      display: flex;
      margin-bottom: 3px;
      align-items: flex-start;
    }
    .detail-row .label {
      width: 65px;
      flex-shrink: 0;
    }
    .detail-row .value {
      flex: 1;
    }
    .invoice-info .detail-row .label {
      width: 75px;
    }
    .table-section {
      margin-top: 8px;
    }
    .main-table {
      width: 100%;
      border-collapse: collapse;
      border: 0.5px solid #1976d2;
    }
    .main-table th {
      background-color: #1976d2;
      color: white;
      padding: 4px;
      border-right: 0.5px solid #1976d2;
      border-bottom: 0.5px solid #1976d2;
      font-size: 8px;
      font-weight: bold;
      text-align: center;
    }
    .main-table td {
      padding: 4px;
      border-right: 0.5px solid #1976d2;
      border-bottom: 0.5px solid #1976d2;
      font-size: 8px;
      vertical-align: top;
    }
    .main-table td:last-child,
    .main-table th:last-child {
      border-right: none;
    }
    .total-items {
      font-size: 8px;
      margin-top: 8px;
      margin-bottom: 4px;
    }
    .bold {
      font-weight: bold;
    }
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }
    .totals-right {
      min-width: 200px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: 8px;
    }
    .final-total {
      margin-top: 2px;
      padding-top: 2px;
      border-top: 0.5px solid #000;
      font-size: 9px;
    }
    .total-words {
      font-size: 9px;
      margin-top: 6px;
      margin-bottom: 10px;
    }
    .gst-summary {
      margin-top: 16px;
      margin-bottom: 10px;
    }
    .gst-table {
      width: 100%;
      border-collapse: collapse;
      border: 0.5px solid #1976d2;
    }
    .gst-table th {
      background-color: #1976d2;
      color: white;
      padding: 4px;
      border-right: 0.5px solid #1976d2;
      font-size: 8px;
      font-weight: bold;
      text-align: center;
    }
    .gst-table td {
      padding: 4px;
      border-right: 0.5px solid #1976d2;
      border-bottom: 0.5px solid #1976d2;
      font-size: 8px;
      text-align: center;
    }
    .gst-table td:last-child,
    .gst-table th:last-child {
      border-right: none;
    }
    .bank-signatory-section {
      display: flex;
      margin-top: 16px;
      margin-bottom: 20px;
      justify-content: space-between;
      align-items: flex-start;
    }
    .bank-details {
      flex: 2;
    }
    .bank-title {
      font-weight: bold;
      font-size: 9px;
      margin-bottom: 4px;
    }
    .bank-row {
      display: flex;
      margin-bottom: 3px;
      align-items: flex-start;
    }
    .bank-row .label {
      width: 70px;
      flex-shrink: 0;
    }
    .bank-row span:last-child {
      flex: 1;
    }
    .no-bank-details {
      font-size: 8px;
      color: #666;
      margin-top: 4px;
    }
    .qr-code-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .qr-placeholder {
      flex: 1;
    }
    .qr-title {
      font-size: 9px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .qr-code-container {
      background-color: #fff;
    }
    .qr-code {
      width: 76px;
      height: 76px;
      object-fit: contain;
    }
    .signatory-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: flex-end;
    }
    .for-company {
      font-size: 9px;
      font-weight: bold;
    }
    .signature-box {
      width: 100px;
      height: 50px;
      border: 1px solid #ddd;
      margin: 5px 0;
      margin-left: auto;
    }
    .signatory-text {
      font-size: 8px;
      margin-top: 30px;
    }
    .notes-section {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #2583C6;
    }
    .notes-content {
      font-size: 8px;
      color: #333;
      line-height: 1.4;
    }
    .page-number {
      position: absolute;
      bottom: 15px;
      right: 20px;
      font-size: 8px;
      color: #666;
    }
  `,
};

// Generate PDF function
export const generatePdfForTemplate12 = async (
  transaction,
  company,
  party,
  serviceNameById = new Map(),
  shippingAddress,
  bank,
) => {
  try {
    if (!transaction) {
      throw new Error('Transaction data is required for PDF generation');
    }

    const HTMLContent = Template12PDF({
      transaction,
      company: company || {},
      party: party || {},
      shippingAddress,
      bank,
      serviceNameById,
    });

    const options = {
      html: HTMLContent,
      fileName: `invoice_${
        transaction?.invoiceNumber || 'document'
      }_${Date.now()}`,
      directory: 'Documents',
      base64: false,
      height: 842,
      width: 595,
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

export default Template12PDF;
