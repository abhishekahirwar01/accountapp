// pdf-templateA5-3-updated.js - Complete fixed code for A5 with increased items per page
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

const renderNotesHTML = notes => {
  if (!notes) return '';
  try {
    return notes
      .replace(/\n/g, '<br>')
      .replace(/<br\s*\/?>/gi, '<br>')
      .replace(/<p>/gi, '<div style="margin-bottom: 8px;">')
      .replace(/<\/p>/gi, '</div>')
      .replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>')
      .replace(/<i>(.*?)<\/i>/gi, '<em>$1</em>')
      .replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')
      .replace(/<ul>/gi, '<ul style="padding-left: 15px;">')
      .replace(/<li>/gi, '<li style="margin-bottom: 4px;">');
  } catch (error) {
    return notes.replace(/\n/g, '<br>');
  }
};



// Extract header section to a separate function so it can be reused on every page
const generateHeaderSection = (data) => {
  const {
    company,
    client,
    party,
    actualShippingAddress,
    shippingAddress,
    transaction,
    getCompanyValue,
    getPartyValue,
    getTransactionValue,
    getStateCode,
    getBillingAddress,
    getShippingAddress,
    capitalizeWords,
    formatPhoneNumber,
    isGSTApplicable
  } = data;

  return `
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
          <div class="info-line"><strong>Country</strong><span>${company?.Country}</span></div>
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
  `;
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
          <th class="header-cell" rowspan="2" style="width: 5%;">Sr.No.</th>
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

  // Generate table rows for a specific page
  const generatePageTableRows = (pageItems, startIndex) => {
    if (!pageItems || pageItems.length === 0) {
      return '<tr><td colspan="11" class="no-items">No items found</td></tr>';
    }

    if (showIGST) {
      return pageItems
        .map((item, index) => {
          const itemName = getItemName(item);
          return `
            <tr class="item-row">
              <td class="item-cell">${startIndex + index + 1}</td>
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
      return pageItems
        .map((item, index) => {
          const itemName = getItemName(item);
          return `
            <tr class="item-row">
              <td class="item-cell">${startIndex + index + 1}</td>
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

    return pageItems
      .map((item, index) => {
        const itemName = getItemName(item);
        return `
          <tr class="item-row">
            <td class="item-cell">${startIndex + index + 1}</td>
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

  

  // Split items into pages if needed - INCREASED items per page for A5
  const itemsPerPage = 35; 
  const itemsCount = itemsWithGST?.length || 0;
  const totalPages = Math.max(1, Math.ceil(itemsCount / itemsPerPage));

  // Generate content for each page
  const generatePageContent = (pageNumber) => {
    const isFirstPage = pageNumber === 1;
    const isLastPage = pageNumber === totalPages;
    
    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, itemsCount);
    const pageItems = itemsWithGST?.slice(startIndex, endIndex) || [];

    return `
      <div class="page">
        <!-- Header Section (repeats on every page) -->
        ${generateHeaderSection({
          company,
          client,
          party,
          actualShippingAddress,
          shippingAddress,
          transaction,
          getCompanyValue,
          getPartyValue,
          getTransactionValue,
          getStateCode,
          getBillingAddress,
          getShippingAddress,
          capitalizeWords,
          formatPhoneNumber,
          isGSTApplicable
        })}

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            ${generateTableHeaders()}
          </thead>
          <tbody>
            ${generatePageTableRows(pageItems, startIndex)}
            ${isLastPage ? generateTotalRow() : ''}
          </tbody>
        </table>

        ${
          isLastPage
            ? `
              <!-- Total in Words (only on last page) -->
              <div class="words-section">
                <strong>TOTAL IN WORDS :</strong> ${numberToWords(totalAmount).toUpperCase()}
              </div>

              <!-- HSN Summary (only on last page) -->
              ${generateHsnSummary()}

              <!-- Bank and Total Section (only on last page) -->
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

              <!-- Terms and Notes (only on last page) -->
              ${
                 transaction?.notes
                  ? `
                <div class="notes-box">
                  
                  <div class="notes-content">${renderNotesHTML(transaction.notes)}</div>
                </div>
              `
                  : ''
              }
            `
            : ''
        }

        <!-- Page Number (dynamic on every page) -->
        <div class="page-footer">
          ${pageNumber} / ${totalPages} page
        </div>
      </div>
    `;
  };

  const generateHTMLContent = () => {
    // Generate all pages
    let allPagesHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      allPagesHTML += generatePageContent(i);
      
      // Add page break for all pages except the last one
      if (i < totalPages) {
        allPagesHTML += '<div style="page-break-before: always;"></div>';
      }
    }

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
        ${allPagesHTML}
      </body>
      </html>
    `;
  };

  return generateHTMLContent();
};

// Updated CSS for proper A5 sizing and page breaks with increased items per page
const styles = {
  css: `
    @media print {
      body { 
        -webkit-print-color-adjust: exact;
        margin: 0;
        padding: 0;
      }
      .page-break {
        page-break-before: always;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
    }
    
    body {
      font-size: 7px;
      color: #000;
      background: #fff;
      width: 148mm; /* A5 width */
      margin: 0 auto;
      padding: 0;
    }
    
    .page {
      width: 148mm;
      min-height: 210mm; /* A5 height */
      padding: 6mm 5mm;
      position: relative;
      overflow: hidden;
    }
    
    /* Top Header */
    .top-header {
      text-align: center;
      padding-bottom: 2px;
      margin-bottom: 2px;
    }
    
    .company-name-large {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 1px;
      line-height: 1.2;
    }
    
    .company-address-small {
      font-size: 6px;
      margin-bottom: 1px;
      line-height: 1.2;
    }
    
    .company-contact-small {
      font-size: 6px;
      line-height: 1.2;
    }
    
    /* Title Row */
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #0066cc;
      padding: 2px 3px;
      font-size: 6px;
      // margin-bottom: 2px;
    }
    
    .gstin-box {
      flex: 1;
      text-align: left;
    }
    
    .invoice-title-box {
      flex: 1;
      text-align: center;
      font-size: 8px;
    }
    
    .recipient-box {
      flex: 1;
      text-align: right;
      font-size: 5px;
    }
    
    /* Info Grid - Three Columns */
    .info-grid {
      display: flex;
      border: 1px solid #0066cc;
      border-top: none;
      // margin-bottom: 2px;
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
      padding: 2px 3px;
      font-weight: bold;
      border-bottom: 1px solid #0066cc;
      font-size: 6px;
    }
    
    .info-content {
      padding: 2px;
    }
    
    .info-line {
      display: flex;
      margin-bottom: 1px;
      line-height: 1.1;
      min-height: 8px;
    }
    
    .info-line strong {
      min-width: 65px;
      flex-shrink: 0;
      font-size: 6px;
    }
    
    .info-line span {
      flex: 1;
      word-wrap: break-word;
      font-size: 6px;
    }
    
    /* Items Table - Reduced height for more rows */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #0066cc;
      border-top: none;
      // margin-bottom: 2px;
      font-size: 6px;
    }
    
    .items-table thead {
      background: rgba(3, 113, 193, 0.2)
    }
    
    .header-cell {
      border: 1px solid #0066cc;
      border-top: none;
      padding: 2px;
      text-align: center;
      font-weight: bold;
      font-size: 6px;
      height: 16px;
    }
    
    .tax-header {
      // background: rgba(3, 113, 193, 0.2);
    }
    
    .sub-header-cell {
      border: 1px solid #0066cc;
      border-top: none;
      padding: 1px;
      text-align: center;
      font-weight: bold;
      font-size: 5px;
      // background: rgba(3, 113, 193, 0.2);
    }
    
    .item-row {
      border-bottom: 1px solid #0066cc;
    }
    
    .item-cell {
      border: 1px solid #0066cc;
      padding: 2px;
      text-align: center;
      font-size: 6px;
      height: 14px; /* Reduced from 16px */
    }
    
    .text-left {
      text-align: left !important;
      padding-left: 3px;
    }
    
    .no-items {
      padding: 8px;
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
      padding: 2px;
      text-align: left;
      padding-left: 5px;
      font-weight: bold;
      font-size: 6px;
    }
    
    .total-cell {
      border: 1px solid #0066cc;
      padding: 2px;
      text-align: center;
      font-weight: bold;
      font-size: 6px;
    }
    
    .grand-total-cell {
      font-weight: bold;
      font-size: 6px;
    }
    
    /* Words Section */
    .words-section {
      border: 1px solid #0066cc;
      border-top: none;
      padding: 2px;
      // margin-bottom: 2px;
      font-size: 6px;
      text-transform: uppercase;
      line-height: 1.2;
    }
    
    /* HSN Summary */
    .hsn-section {
      border: 1px solid #0066cc;
      border-top: none;
      // margin-bottom: 2px;
    }
    
    .hsn-title-row {
      background: rgba(3, 113, 193, 0.2);
      border-bottom: 1px solid #0066cc;
      padding: 2px 3px;
    }
    
    .hsn-title {
      font-weight: bold;
      font-size: 7px;
    }
    
    .hsn-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 6px;
    }
    
    .hsn-header {
      background: rgba(3, 113, 193, 0.2);
      border: 1px solid #0066cc;
      border-top: none;
      padding: 2px;
      text-align: center;
      font-weight: bold;
      font-size: 6px;
    }
    
    .hsn-sub-header {
      background: rgba(3, 113, 193, 0.2);
      border: 1px solid #0066cc;
      border-top: none;
      padding: 1px;
      text-align: center;
      font-weight: bold;
      font-size: 5px;
    }
    
    .hsn-row {
      border-bottom: 1px solid #0066cc;
    }
    
    .hsn-cell {
      border: 1px solid #0066cc;
      padding: 2px;
      text-align: center;
      font-size: 6px;
    }
    
    .hsn-total-row {
      background: rgba(3, 113, 193, 0.2);
      font-weight: bold;
    }
    
    .hsn-total-cell {
      padding: 2px;
      text-align: center;
      font-weight: bold;
      font-size: 6px;
    }
    
    /* Bottom Grid - Reduced height */
    .bottom-grid {
      display: flex;
      border: 1px solid #0066cc;
      border-top: none;
      // margin-bottom: 2px;
      min-height: 50px;
    }
    
    .bank-details-box {
      flex: 2;
      padding: 2px;
      font-size: 6px;
      padding-right: 8px;
    }
    
    .qr-box {
      width: 60px;
      border-right: 1px solid #0066cc;
      padding: 2px;
      text-align: center;
      font-size: 6px; 
    }
    
    .qr-image {
      width: 50px;
      height: 50px;
      object-fit: contain;
      margin-top: 2px;
    }
    
    .totals-box {
      flex: 1.5;
      padding: 2px;
      font-size: 6px;
    }
    
    .section-title {
      font-weight: bold;
      margin-bottom: 2px;
      font-size: 6px;
    }
    
    .detail-line {
      margin-bottom: 1px;
      line-height: 1.2;
      font-size: 5px;
    }
    
    .total-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1px;
      padding: 1px 0;
      font-size: 6px;
    }
    
    .grand-total-line {
      display: flex;
      justify-content: space-between;
      padding: 2px;
      margin: 2px -2px;
      background: rgba(3, 113, 193, 0.2);
      border-top: 1px solid #0066cc;
      border-bottom: 1px solid #0066cc;
      font-weight: bold;
      font-size: 6px;
    }
    
    .signature-line {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      padding-top: 2px;
      border-top: 1px dashed #999;
      font-style: italic;
      font-size: 6px;
    }
    
    /* Notes Box - Reduced height */
    .notes-box {
      border: 1px solid #0066cc;
      border-top: none;
      padding: 2px;
      margin-bottom: 3px;
      font-size: 6px;
      min-height: 25px;
      padding-left: 15px;
    }
    
    .notes-content {
      margin-top: 1px;
      line-height: 1.2;
      font-size: 6px;
    }
    
    /* Page Footer */
    .page-footer {
      position: absolute;
      bottom: 6mm;
      right: 5mm;
      font-size: 6px;
      color: #666;
      text-align: right;
    }
  `,
};

// Generate PDF function with A5 dimensions
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
      height: 595,  // A5 height in points (210mm)
      width: 420,   // A5 width in points (148mm)
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