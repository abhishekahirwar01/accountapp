// pdf-template1.js
import React from 'react';
import { View, Text, Image } from 'react-native';
import {
  deriveTotals,
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  getItemsBody,
  calculateGST,
  getUnifiedLines,
  prepareTemplate8Data,
  getStateCode,
  numberToWords,
  getHsnSummary,
  formatPhoneNumber,
  formatQuantity,
} from './pdf-utils';

import { capitalizeWords } from './utils';
import { BASE_URL } from '../config';
import { generatePDF } from 'react-native-html-to-pdf';
import { parseHtmlToElements, renderParsedElements } from './HtmlNoteRenderer';

// Constants
const ITEMS_PER_PAGE = 28; // Maximum items per page
const A4_WIDTH = 595; // A4 width in points
const A4_HEIGHT = 842; // A4 height in points

// --- Interface Definition ---
/**
 * @param {Object} transaction - Transaction data
 * @param {Object} company - Company data
 * @param {Object} party - Party data
 * @param {Object} shippingAddress - Shipping address data
 * @param {Object} bank - Bank details
 * @param {Object} client - Client data
 * @param {Object} clientName - Client name
 */

// Advanced HTML Notes Rendering Function with WebView compatible HTML
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

// Safe Phone Number Formatting
const safeFormatPhoneNumber = phoneNumber => {
  try {
    if (!phoneNumber) return '-';
    return formatPhoneNumber(phoneNumber);
  } catch (error) {
    return phoneNumber || '-';
  }
};

// Safe Number to Words
const safeNumberToWords = amount => {
  try {
    return numberToWords(amount);
  } catch (error) {
    return `Rupees ${formatCurrency(amount)} Only`;
  }
};

// Split items into chunks for pagination
const splitItemsIntoPages = (items, itemsPerPage = ITEMS_PER_PAGE) => {
  const pages = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }
  return pages;
};

// Generate HSN Summary HTML for a specific page or all items
const generateHsnSummaryHTML = (
  items,
  showIGST,
  showCGSTSGST,
  isGSTApplicable,
  totalTaxable,
  totalIGST,
  totalCGST,
  totalSGST,
  totalAmount,
) => {
  if (!isGSTApplicable) return '';

  try {
    const hsnSummary = getHsnSummary(items, showIGST, showCGSTSGST);
    const hsnColWidths = showIGST
      ? ['25%', '20%', '30%', '25%']
      : showCGSTSGST
      ? ['20%', '20%', '25%', '25%', '10%']
      : ['40%', '30%', '30%'];

    const hsnTotalColumnIndex = showIGST ? 3 : showCGSTSGST ? 4 : 2;

    const taxHeaderWrapperWidth = showIGST
      ? hsnColWidths[2]
      : showCGSTSGST
      ? '50%'
      : '0%';

    return `
      <div class="hsn-tax-table" style="border: 1px solid #0371C1; margin-top: 5px;">
        <div class="hsn-tax-table-header">
          <div class="hsn-tax-header-cell" style="width: ${
            hsnColWidths[0]
          }">HSN / SAC</div>
          
          <div class="hsn-tax-header-cell" style="width: ${
            hsnColWidths[1]
          }">Taxable Value (Rs.)</div>
          
          ${
            showIGST || showCGSTSGST
              ? `
          <div class="hsn-tax-header-tax-wrapper" style="width: ${taxHeaderWrapperWidth};">
            ${
              showIGST
                ? `
              <div class="igst-header" style="width: 100%; border-right:1px solid #0371C1;">
                <div class="igst-main-header">IGST</div>
                <div class="igst-sub-header">
                  <div class="igst-sub-percentage">%</div>
                  <div class="igst-sub-text">Amount (Rs.)</div>
                </div>
              </div>
            `
                : showCGSTSGST
                ? `
              <div class="igst-header" style="width: 50%; border-right: 1px solid #0371C1;">
                <div class="igst-main-header">CGST</div>
                <div class="igst-sub-header">
                  <div class="igst-sub-percentage">%</div>
                  <div class="igst-sub-text">Amount (Rs.)</div>
                </div>
              </div>
              <div class="igst-header" style="width: 50%; border-right: 1px solid #0371C1;">
                <div class="igst-main-header">SGST</div>
                <div class="igst-sub-header">
                  <div class="igst-sub-percentage">%</div>
                  <div class="igst-sub-text">Amount (Rs.)</div>
                </div>
              </div>
            `
                : ''
            }
          </div>
          `
              : ''
          }

          <div class="hsn-tax-header-cell" style="width: ${
            hsnColWidths[hsnTotalColumnIndex]
          }; border-right: none;">Total</div>
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
              showIGST || showCGSTSGST
                ? `
            <div class="hsn-tax-tax-wrapper" style="width: ${taxHeaderWrapperWidth};">
            ${
              showIGST
                ? `
              <div class="igst-cell-hsn" style="width: 100%; border-right: 1px solid #0371C1;">
                <div class="igst-percent">${hsnItem.taxRate}</div>
                <div class="igst-amount">${formatCurrency(
                  hsnItem.taxAmount,
                )}</div>
              </div>
            `
                : showCGSTSGST
                ? `
              <div class="igst-cell-hsn" style="width: 50%; border-right: 1px solid #0371C1;">
                <div class="igst-percent">${hsnItem.taxRate / 2}</div>
                <div class="igst-amount">${formatCurrency(
                  hsnItem.cgstAmount,
                )}</div>
              </div>
              <div class="igst-cell-hsn" style="width: 50%; border-right: 1px solid #0371C1;">
                <div class="igst-percent">${hsnItem.taxRate / 2}</div>
                <div class="igst-amount">${formatCurrency(
                  hsnItem.sgstAmount,
                )}</div>
              </div>
            `
                : ''
            }
            </div>
            `
                : ''
            }
            
            <div class="hsn-tax-cell" style="width: ${
              hsnColWidths[hsnTotalColumnIndex]
            }; border-right: none;">${formatCurrency(hsnItem.total)}</div>
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
            showIGST || showCGSTSGST
              ? `
          <div class="hsn-tax-total-tax-wrapper" style="width: ${taxHeaderWrapperWidth};">
          ${
            showIGST
              ? `
            <div class="hsn-tax-total-cell" style="width: 100%;border-right: 1px solid #0371C1; display: flex; flex-direction: row; justify-content: center; align-items: center; padding: 0;">
              <div style="width: 30%; font-weight: bold; text-align: center; border-right: 1px solid #0371C1; padding: 2px;">-</div>
              <div style="width: 70%; font-weight: bold; text-align: center; padding: 2px;">${formatCurrency(
                totalIGST,
              )}</div>
            </div>
          `
              : showCGSTSGST
              ? `
            <div class="hsn-tax-total-cell" style="width: 50%; border-right: 1px solid #0371C1; display: flex; flex-direction: row; justify-content: center; align-items: center; padding: 0;">
              <div style="width: 30%; font-weight: bold; text-align: center; border-right: 1px solid #0371C1; padding: 2px;">-</div>
              <div style="width: 70%; font-weight: bold; text-align: center; padding: 2px;">${formatCurrency(
                totalCGST,
              )}</div>
            </div>
            <div class="hsn-tax-total-cell" style="width: 50%; border-right:1px solid #0371C1; display: flex; flex-direction: row; justify-content: center; align-items: center; padding: 0;">
              <div style="width: 30%; font-weight: bold; text-align: center; border-right: 1px solid #0371C1; padding: 2px;">-</div>
              <div style="width: 70%; font-weight: bold; text-align: center; padding: 2px;">${formatCurrency(
                totalSGST,
              )}</div>
            </div>
          `
              : ''
          }
          </div>
          `
              : ''
          }
          
          <div class="hsn-tax-total-cell" style="width: ${
            hsnColWidths[hsnTotalColumnIndex]
          }; border-right: none;">${formatCurrency(totalAmount)}</div>
        </div>
      </div>
    `;
  } catch (error) {
    return '';
  }
};

// Generate items table HTML for a specific page
const generateItemsTableHTML = (
  items,
  pageIndex,
  totalPages,
  colWidths,
  totalColumnIndex,
  showIGST,
  showCGSTSGST,
  startIndex = 0,
) => {
  return items
    .map(
      (item, index) => `
    <div class="items-table-row">
      <div class="table-cell" style="width: ${colWidths[0]}">${
        startIndex + index + 1
      }</div>
      <div class="table-cell product-cell" style="width: ${
        colWidths[1]
      }">${capitalizeWords(item.name)}</div>
      <div class="table-cell" style="width: ${colWidths[2]}">${
        item.code || '-'
      }</div>
      <div class="table-cell" style="width: ${colWidths[3]}">
        ${
          item.itemType === 'service'
            ? '-'
            : formatQuantity(item.quantity || 0, item.unit)
        }
      </div>
      <div class="table-cell" style="width: ${colWidths[4]}">${formatCurrency(
        item.pricePerUnit || 0,
      )}</div>
      <div class="table-cell" style="width: ${colWidths[5]}">${formatCurrency(
        item.taxableValue,
      )}</div>
      
      ${
        showIGST
          ? `
      <div class="igst-cell" style="width: ${colWidths[6]}">
        <div class="igst-percent">${item.gstRate}</div>
        <div class="igst-amount">${formatCurrency(item.igst)}</div>
      </div>
      `
          : showCGSTSGST
          ? `
      <div class="igst-cell" style="width: ${colWidths[6]}">
        <div class="igst-percent">${item.gstRate / 2}</div>
        <div class="igst-amount">${formatCurrency(item.cgst)}</div>
      </div>
      <div class="igst-cell" style="width: ${colWidths[7]}">
        <div class="igst-percent">${item.gstRate / 2}</div>
        <div class="igst-amount">${formatCurrency(item.sgst)}</div>
      </div>
      `
          : ''
      }
      
      <div class="table-cell" style="width: ${
        colWidths[totalColumnIndex]
      }">${formatCurrency(item.total)}</div>
    </div>
  `,
    )
    .join('');
};

// Generate page HTML
const generatePageHTML = (
  pageData,
  pageIndex,
  totalPages,
  transaction,
  company,
  party,
  actualShippingAddress,
  logoSrc,
  bankData,
  isBankDetailAvailable,
  colWidths,
  totalColumnIndex,
  showIGST,
  showCGSTSGST,
  isGSTApplicable,
  totalTaxable,
  totalIGST,
  totalCGST,
  totalSGST,
  totalAmount,
  itemsWithGST,
  startIndex = 0,
  isLastPage = false,
) => {
  const formatDateSafe = dateString => {
    try {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch (error) {
      return dateString || '-';
    }
  };

  const companyName =
    company?.businessName || company?.companyName || 'Company Name';

  // Calculate the width for the merged 'Total' cell in the Item Table
  const totalLabelCellWidth =
    parseFloat(colWidths[0].replace('%', '')) +
    parseFloat(colWidths[1].replace('%', '')) +
    parseFloat(colWidths[2].replace('%', '')) +
    parseFloat(colWidths[4].replace('%', '')) +
    '%';

  return `
    <div class="page">
      <div class="invoice-wrapper">
        <!-- Header -->
        <div class="header">
          ${
            logoSrc
              ? `
          <div class="header-left">
            <img src="${logoSrc}" class="logo" />
          </div>
          `
              : ''
          }
          <div class="header-right" style="${logoSrc ? '' : 'width: 100%;'}">
            <div class="company-name">${capitalizeWords(companyName)}</div>
            <div class="address">
              ${capitalizeWords(
                [
                  company?.address,
                  company?.City,
                  company?.addressState,
                  company?.Country,
                  company?.Pincode,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Address Line 1',
              )}
            </div>
            <div class="contact-info">
              <span class="contact-label">Phone No: </span>
              <span class="contact-value">
                ${safeFormatPhoneNumber(
                  company?.mobileNumber || company?.Telephone,
                )}
              </span>
            </div>
          </div>
        </div>

        <!-- Invoice Header Section -->
        <div class="section1">
          <div class="section">
            <div class="table-header">
              ${
                company?.gstin
                  ? `
              <div class="gst-row">
                <span class="gst-label">GSTIN : </span>
                <span class="gst-value">${company.gstin}</span>
              </div>
              `
                  : ''
              }
              
              <div class="invoice-title-row">
                <div class="invoice-title">
                  ${
                    transaction.type === 'proforma'
                      ? 'PROFORMA INVOICE'
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
              <div class="column">
                <div class="column-header">
                  <div class="threecol-table-header">Details of Buyer | Billed to:</div>
                </div>
                <div class="data-row">
                  <div class="table-label">Name:</div>
                  <div class="table-value">${capitalizeWords(
                    party?.name || 'N/A',
                  )}</div>
                </div>
                <div class="data-row">
                  <div class="table-label">Address:</div>
                  <div class="table-value">${capitalizeWords(
                    getBillingAddress(party),
                  )}</div>
                </div>
                <div class="data-row">
                  <div class="table-label">Phone:</div>
                  <div class="table-value">
                    ${safeFormatPhoneNumber(party?.contactNumber)}
                  </div>
                </div>
                <div class="data-row">
                  <div class="table-label">GSTIN:</div>
                  <div class="table-value">${party?.gstin || '-'}</div>
                </div>
                <div class="data-row">
                  <div class="table-label">PAN:</div>
                  <div class="table-value">${party?.pan || '-'}</div>
                </div>
                <div class="data-row">
                  <div class="table-label">Place of Supply:</div>
                  <div class="table-value">
                    ${
                      actualShippingAddress?.state
                        ? `${actualShippingAddress.state} (${
                            getStateCode(actualShippingAddress.state) || '-'
                          })`
                        : party?.state
                        ? `${party.state} (${getStateCode(party.state) || '-'})`
                        : '-'
                    }
                  </div>
                </div>
              </div>

              <div class="column">
                <div class="column-header">
                  <div class="threecol-table-header">Details of Consigned | Shipped to:</div>
                </div>
                <div class="data-row">
                  <div class="table-label">Name:</div>
                  <div class="table-value">
                    ${capitalizeWords(
                      actualShippingAddress?.label || party?.name || 'N/A',
                    )}
                  </div>
                </div>
                <div class="data-row">
                  <div class="table-label">Address:</div>
                  <div class="table-value">
                    ${capitalizeWords(
                      getShippingAddress(
                        actualShippingAddress,
                        getBillingAddress(party),
                      ),
                    )}
                  </div>
                </div>
                <div class="data-row">
                  <div class="table-label">Country:</div>
                  <div class="table-value">${company?.Country}</div>
                </div>
                <div class="data-row">
                  <div class="table-label">Phone:</div>
                  <div class="table-value">
                    ${safeFormatPhoneNumber(
                      actualShippingAddress?.contactNumber ||
                        party?.contactNumber,
                    )}
                  </div>
                </div>
                <div class="data-row">
                  <div class="table-label">GSTIN:</div>
                  <div class="table-value">${party?.gstin || '-'}</div>
                </div>
                <div class="data-row">
                  <div class="table-label">State:</div>
                  <div class="table-value">
                    ${
                      actualShippingAddress?.state
                        ? `${actualShippingAddress.state} (${
                            getStateCode(actualShippingAddress.state) || '-'
                          })`
                        : party?.state
                        ? `${party.state} (${getStateCode(party.state) || '-'})`
                        : '-'
                    }
                  </div>
                </div>
              </div>

              <div class="column">
                <div class="data-row" style="gap: 5px;">
                  <div class="table-label">Invoice No:</div>
                  <div class="table-value" style="text-align: right;">${
                    transaction.invoiceNumber || 'N/A'
                  }</div>
                </div>
                <div class="data-row" style="gap: 5px;">
                  <div class="table-label">Invoice Date:</div>
                  <div class="table-value" style="text-align: right;">
                    ${formatDateSafe(transaction.date)}
                  </div>
                </div>
                <div class="data-row" style="gap: 5px;">
                  <div class="table-label">Due Date:</div>
                  <div class="table-value" style="text-align: right;">
                    ${formatDateSafe(transaction.dueDate)}
                  </div>
                </div>
                <div class="data-row" style="gap: 5px;">
                  <div class="table-label">P.O. No:</div>
                  <div class="table-value" style="text-align: right;">${
                    transaction.voucher || '-'
                  }</div>
                </div>
                <div class="data-row" style="gap: 5px;">
                  <div class="table-label">E-Way No:</div>
                  <div class="table-value" style="text-align: right;">${
                    transaction.eway || '-'
                  }</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="section">
            <div class="table-container">
              <div class="items-table-header">
                <div class="header-cell" style="width: ${
                  colWidths[0]
                }">Sr. No.</div>
                <div class="header-cell product-cell" style="width: ${
                  colWidths[1]
                }">Name of Product/Service</div>
                <div class="header-cell" style="width: ${
                  colWidths[2]
                }">HSN/SAC</div>
                <div class="header-cell" style="width: ${
                  colWidths[3]
                }">Qty</div>
                <div class="header-cell" style="width: ${
                  colWidths[4]
                }">Rate (Rs.)</div>
                <div class="header-cell" style="width: ${
                  colWidths[5]
                }">Taxable Value (Rs.)</div>

                ${
                  showIGST
                    ? `
                <div class="igst-header" style="width: ${colWidths[6]}">
                  <div class="igst-main-header">IGST</div>
                  <div class="igst-sub-header">
                    <div class="igst-sub-percentage">%</div>
                    <div class="igst-sub-text">Amount (Rs.)</div>
                  </div>
                </div>
                `
                    : showCGSTSGST
                    ? `
                <div class="igst-header" style="width: ${colWidths[6]}">
                  <div class="igst-main-header">CGST</div>
                  <div class="igst-sub-header">
                    <div class="igst-sub-percentage">%</div>
                    <div class="igst-sub-text">Amount (Rs.)</div>
                  </div>
                </div>
                <div class="igst-header" style="width: ${colWidths[7]}">
                  <div class="igst-main-header">SGST</div>
                  <div class="igst-sub-header">
                    <div class="igst-sub-percentage">%</div>
                    <div class="igst-sub-text">Amount (Rs.)</div>
                  </div>
                </div>
                `
                    : ''
                }

                <div class="header-cell" style="width: ${
                  colWidths[totalColumnIndex]
                }">Total (Rs.)</div>
              </div>

              ${generateItemsTableHTML(
                pageData,
                pageIndex,
                totalPages,
                colWidths,
                totalColumnIndex,
                showIGST,
                showCGSTSGST,
                startIndex,
              )}

             ${
               isLastPage
                 ? `
    <!-- Total Row (only on last page) -->
    <div class="items-table-total-row">
      <!-- Sr. No. Column: Show dash -->
      <div class="table-cell font-bold" style="width: ${
        colWidths[0]
      }; text-align: center;">-</div>
      
      <!-- Product Name Column: Show "Total" text -->
      <div class="table-cell font-bold" style="width: ${
        colWidths[1]
      }; text-align: left; padding-left: 5px;">Total</div>
      
      <!-- HSN/SAC Column: Show dash -->
      <div class="table-cell font-bold" style="width: ${
        colWidths[2]
      }; text-align: center;">-</div>
      
      <!-- Quantity Column: Show total quantity of ALL items -->
      <div class="table-cell font-bold" style="width: ${
        colWidths[3]
      }; text-align: center;">
        ${itemsWithGST.reduce((sum, item) => sum + (item.quantity || 0), 0)}
      </div>
      
      <!-- Rate Column: Show dash -->
      <div class="table-cell font-bold" style="width: ${
        colWidths[4]
      }; text-align: center;">-</div>
      
      <!-- Taxable Value Column: Show total taxable amount -->
      <div class="table-cell font-bold" style="width: ${
        colWidths[5]
      }; text-align: center;">
        ${formatCurrency(totalTaxable)}
      </div>
      
      <!-- Tax Columns: Show based on IGST or CGST/SGST -->
      ${
        showIGST
          ? `
      <!-- IGST Column -->
      <div class="igst-cell font-bold" style="width: ${
        colWidths[6]
      }; text-align: center;">
        <div class="igst-percent">-</div>
        <div class="igst-amount">${formatCurrency(totalIGST)}</div>
      </div>
      `
          : showCGSTSGST
          ? `
      <!-- CGST Column -->
      <div class="igst-cell font-bold" style="width: ${
        colWidths[6]
      }; text-align: center;">
        <div class="igst-percent">-</div>
        <div class="igst-amount">${formatCurrency(totalCGST)}</div>
      </div>
      <!-- SGST Column -->
      <div class="igst-cell font-bold" style="width: ${
        colWidths[7]
      }; text-align: center;">
        <div class="igst-percent">-</div>
        <div class="igst-amount">${formatCurrency(totalSGST)}</div>
      </div>
      `
          : ''
      }
      
      <!-- Total Amount Column: Show final total -->
      <div class="table-cell font-bold" style="width: ${
        colWidths[totalColumnIndex]
      }; text-align: center;">
        ${formatCurrency(totalAmount)}
      </div>
    </div>
    `
                 : ''
             }
            </div>

            ${
              isLastPage
                ? `
            <!-- Bottom Section (only on last page) -->
            <div class="bottom-section-column">
              <div class="total-in-words">
                TOTAL IN WORDS: ${safeNumberToWords(totalAmount)}
              </div>
              ${
                isGSTApplicable
                  ? generateHsnSummaryHTML(
                      itemsWithGST,
                      showIGST,
                      showCGSTSGST,
                      isGSTApplicable,
                      totalTaxable,
                      totalIGST,
                      totalCGST,
                      totalSGST,
                      totalAmount,
                    )
                  : ''
              }
            </div>
            
            <div class="bottom-section-row">
              <div class="left-section">
                ${
                  transaction.type !== 'proforma' && isBankDetailAvailable
                    ? `
                <div class="bank-details">
                  <div style="font-size: 9px; font-weight: bold; margin-bottom: 5px;">Bank Details:</div>
                  <div style="display: flex; flex-direction: row; gap: 60px;">
                    <div class="bank-info">
                      ${
                        bankData?.bankName
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">Name:</span>
                        <span>${capitalizeWords(bankData.bankName)}</span>
                      </div>
                      `
                          : ''
                      }
                      
                      ${
                        bankData?.accountNo
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">Acc. No:</span>
                        <span>${bankData.accountNo}</span>
                      </div>
                      `
                          : ''
                      }
                      
                      ${
                        bankData?.ifscCode
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">IFSC:</span>
                        <span>${bankData.ifscCode}</span>
                      </div>
                      `
                          : ''
                      }
                      
                      ${
                        bankData?.branchAddress
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">Branch:</span>
                        <span style="flex: 1; word-wrap: break-word;">${bankData.branchAddress}</span>
                      </div>
                      `
                          : ''
                      }
                      
                      ${
                        bankData?.upiDetails?.upiId
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">UPI ID:</span>
                        <span>${bankData.upiDetails.upiId}</span>
                      </div>
                      `
                          : ''
                      }

                      ${
                        bankData?.upiDetails?.upiName
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">UPI Name:</span>
                        <span>${bankData.upiDetails.upiName}</span>
                      </div>
                      `
                          : ''
                      }

                      ${
                        bankData?.upiDetails?.upiMobile
                          ? `
                      <div class="bank-row">
                        <span style="width: 70px; font-weight: bold;">UPI Mobile:</span>
                        <span>${bankData.upiDetails.upiMobile}</span>
                      </div>
                      `
                          : ''
                      }
                    </div>
                    
                    ${
                      bankData?.qrCode
                        ? `
                    <div style="flex-direction: column;  margin-left: 60px;">
                      <div style="font-size: 9px; font-weight: bold; margin-bottom: 5px;">QR Code</div>
                      <img src="${BASE_URL}${bankData.qrCode}" class="qr-image" style="max-width: 100%;" />
                    </div>
                    `
                        : ''
                    }
                  </div>
                </div>
                `
                    : ''
                }

                ${
                  transaction?.notes
                    ? `
                <div class="terms-container">
                  <div class="terms-content">
                    ${renderNotesHTML(transaction.notes)}
                  </div>
                </div>
                `
                    : ''
                }
              </div>

              <div class="right-section">
                <!-- Compact amount/tax box -->
                <div class="amount-tax-box">
                  <div class="total-row-container">
                    <div class="total-row">
                      <div class="label">Taxable Amount</div>
                      <div class="value">${formatCurrency(totalTaxable)}</div>
                    </div>

                    ${
                      isGSTApplicable
                        ? `
                    <div class="total-row">
                      <div class="label">Total Tax</div>
                      <div class="value">
                        ${formatCurrency(
                          showIGST ? totalIGST : totalCGST + totalSGST,
                        )}
                      </div>
                    </div>
                    `
                        : ''
                    }
                  </div>

                  <div class="highlight-row">
                    <div class="label font-bold">
                      ${
                        isGSTApplicable
                          ? 'Total Amount After Tax'
                          : 'Total Amount'
                      }
                    </div>
                    <div class="value font-bold">
                      ${formatCurrency(totalAmount)}
                    </div>
                  </div>
                </div>

                <!-- Compact signature box -->
                <div class="signature-box">
                  <div class="signature-title">For ${capitalizeWords(
                    companyName,
                  )}</div>
                  <div class="authorized-text-container">
                    <div class="signature-line"></div>
                    <div class="authorized-text">Authorised Signatory</div>
                  </div>
                </div>
              </div>
            </div>
            `
                : ''
            }
          </div>
        </div>

        <!-- Page Number -->
        <div class="page-number">Page ${pageIndex + 1} of ${totalPages}</div>
      </div>
    </div>
  `;
};

// --- Main PDF Component ---
const Template1 = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  client,
  clientName,
}) => {
  // 1. Data Preparation and Calculations
  const actualShippingAddress = shippingAddress || transaction?.shippingAddress;

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

  const bankData = bank || transaction?.bank || {};

  // Check if any bank detail is available
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.qrCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  // 2. Dynamic Column Widths for Items Table - FIXED WIDTHS
  const colWidthsIGST = ['5%', '30%', '10%', '7%', '8%', '15%', '15%', '10%'];
  const totalColumnIndexIGST = 7;

  const colWidthsCGSTSGST = [
    '5%',
    '28%',
    '10%',
    '7%',
    '8%',
    '10%',
    '11%',
    '11%',
    '10%',
  ];
  const totalColumnIndexCGSTSGST = 8;

  const colWidthsNoTax = ['8%', '35%', '10%', '8%', '10%', '14%', '15%'];
  const totalColumnIndexNoTax = 6;

  const colWidths = showIGST
    ? colWidthsIGST
    : showCGSTSGST
    ? colWidthsCGSTSGST
    : colWidthsNoTax;
  const totalColumnIndex = showIGST
    ? totalColumnIndexIGST
    : showCGSTSGST
    ? totalColumnIndexCGSTSGST
    : totalColumnIndexNoTax;

  // Split items into pages
  const itemPages = splitItemsIntoPages(itemsWithGST, ITEMS_PER_PAGE);
  const totalPages = itemPages.length;

  // Generate HTML for all pages
  const generateHTML = () => {
    let startIndex = 0;
    const pageHTMLs = itemPages.map((pageItems, pageIndex) => {
      const pageHTML = generatePageHTML(
        pageItems,
        pageIndex,
        totalPages,
        transaction,
        company,
        party,
        actualShippingAddress,
        logoSrc,
        bankData,
        isBankDetailAvailable,
        colWidths,
        totalColumnIndex,
        showIGST,
        showCGSTSGST,
        isGSTApplicable,
        totalTaxable,
        totalIGST,
        totalCGST,
        totalSGST,
        totalAmount,
        itemsWithGST,
        startIndex,
        pageIndex === totalPages - 1, // isLastPage
      );
      startIndex += pageItems.length;
      return pageHTML;
    });

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
          
          html, body {
            height: auto !important;
            min-height: 100vh !important;
            width: 100%;
            overflow: visible !important;
          }
          
          body {
            font-family: Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #000;
            font-size: 12px;
            line-height: 1.2;
            min-height: 100vh;
            width: 100%;
            overflow: visible;
            background: white;
          }
          
          /* Page Break Support */
          .page {
            page-break-after: always;
            position: relative;
            min-height: ${A4_HEIGHT}pt;
            width: ${A4_WIDTH}pt;
            padding: 25pt;
            margin: 0 auto;
            box-sizing: border-box;
            overflow: visible;
          }
          
          .page:last-child {
            page-break-after: auto;
          }
          
          /* NEW WRAPPER: Applies outer borders only around the content */
          .invoice-wrapper {
            width: 100%;
            display: flex;
            flex-direction: column;
            overflow: visible;
            min-height: calc(${A4_HEIGHT}pt - 50pt);
            border-radius: 2pt;
          }

          /* Header Styles */
          .header {
            display: flex;
            flex-direction: row;
            margin-bottom: 0;
            align-items: center;
            // padding: 10pt 5pt 10pt 5pt; 
          }
          
          .header-left {
            width: 12%; 
            display: flex;
            // justify-content: center;
            align-items: center;
            // margin-right: 10pt;
          }
          
          .header-right {
            align-items: flex-start;
            width: 85%;
            margin-left: 0;
            padding-bottom: 10pt; 
          }
          
          .logo {
            width: 50pt; 
            height: 50pt;
            object-fit: contain;
            border: none; 
            // padding: 2pt;
          }
          
          .company-name {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 5pt;
            margin-left: 0;
            word-wrap: break-word;
          }
          
          .address {
            font-size: 10pt;
            margin-bottom: 3pt;
            line-height: 1.2;
            margin-left: 0;
            text-align: left;
            word-wrap: break-word;
          }
          
          .contact-info {
            font-size: 10pt;
            line-height: 1.2;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 4pt;
            align-items: center;
          }
          
          .contact-label {
            font-size: 10pt;
            font-weight: bold;
          }
          
          .contact-value {
            font-size: 10pt;
            font-weight: normal;
          }
          
          /* Section Styles */
          .section {
            padding: 0;
          }
          
          .table-header {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            border-top: 1.5pt solid #0371C1; 
            border-bottom: 1.5pt solid #0371C1; 
            background-color: #EAF4FF; 
            margin-left: 0.8pt;
          }
          
          .gst-row {
            display: flex;
            flex-direction: row;
            padding: 7pt 5pt; 
            width: 33.3%; 
            align-items: center;
            border-right: 1pt solid #0371C1;
          }
          
          .gst-label {
            font-size: 10pt;
            font-weight: bold;
            margin-right: 4pt;
          }
          
          .gst-value {
            font-size: 10pt;
            font-weight: normal;
          }
          
          .invoice-title-row {
            padding: 3pt;
            width: 33.3%;
          }
          
          .invoice-title {
            font-size: 16pt;
            font-weight: 800;
            text-align: center;
            color: #0371C1;
          }
          
          .recipient-row {
            padding: 7pt 5pt; 
            margin-right: 1pt;
            width: 33.3%;
            display: flex;
            justify-content: flex-end; 
            align-items: center;
            border-left: 1pt solid #0371C1;
          }
          
          .recipient-text {
            font-size: 10pt;
            font-weight: bold;
            text-align: right;
          }
          
          /* Three Column Section */
          .three-col-section {
            display: flex;
            flex-direction: row;
            border-bottom: 1.5pt solid #0371C1;
          }
          
          .section1 {
            border-bottom: 1.5pt solid #0371C1;
            border-left: 1.5pt solid #0371C1;
            border-right: 1.5pt solid #0371C1;
            overflow: hidden;
          }
          
          .column {
            width: 33.3%;
            padding: 4pt; 
            border-left: 1pt solid #0371C1;
          }
          
          .column:first-child {
            border-left: none;
          }
          
          .column-header {
            margin-bottom: 5pt;
          }
          
          .data-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
            padding: 1pt 0;
            line-height: 1.2;
          }
          
          .threecol-table-header {
            font-size: 8pt;
            font-weight: bold;
          }
          
          .table-label {
            font-size: 8pt;
            font-weight: bold;
            width: 40%;
            flex-shrink: 0;
            word-wrap: break-word;
          }
          
          .table-value {
            font-size: 8pt;
            font-weight: normal;
            width: 60%; 
            flex-shrink: 1;
            text-align: left;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          /* Items Table Styles */
          .table-container {
            position: relative;
            width: 100%;
            border-bottom: 1.5pt solid #0371C1;
            overflow: hidden;
          }
          
          .items-table-header {
            display: flex;
            flex-direction: row;
            background-color: rgba(3, 113, 193, 0.2); 
            border-bottom: 1pt solid #0371C1;
          }
          
          .header-cell {
            padding: 2pt;
            text-align: center;
            font-size: 7pt;
            font-weight: bold;
            border-right: 1pt solid #0371C1;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .header-cell:last-child {
            border-right: none;
          }
          
          .items-table-row {
            display: flex;
            flex-direction: row;
            align-items: stretch; 
            border-bottom: 1pt solid #0371C1;
          }
          
          .items-table-total-row {
            display: flex;
            flex-direction: row;
            background-color: rgba(3, 113, 193, 0.2);
            align-items: stretch;
            border-top: 1pt solid #0371C1;
            min-height: 18pt;
          }
          
          .table-cell {
            padding: 2pt;
            font-size: 7pt;
            text-align: center;
            border-right: 1pt solid #0371C1;
            display: flex;
            align-items: center;
            justify-content: center;
            word-wrap: break-word;
            overflow: hidden;
          }
          
          .table-cell:last-child {
            border-right: none;
          }
          
          .product-cell {
            text-align: left;
            justify-content: flex-start;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          /* IGST/CGST/SGST Styles (Items Table) */
          .igst-header {
            display: flex;
            flex-direction: column;
            font-size: 7pt;
            font-weight: bold;
            border-right: 1pt solid #0371C1;
          }
          
          .igst-main-header {
            font-size: 7pt;
            font-weight: bold;
            text-align: center;
            padding: 1pt;
          }
          
          .igst-sub-header {
            display: flex;
            flex-direction: row;
            border-top: 1pt solid #0371C1;
          }
          
          .igst-sub-text {
            font-size: 6pt;
            font-weight: bold;
            width: 70%;
            text-align: center;
            padding: 1pt;
          }
          
          .igst-sub-percentage {
            font-size: 6pt;
            font-weight: bold;
            width: 30%;
            text-align: center;
            padding: 1pt;
            border-right: 1pt solid #0371C1;
          }
          
          .igst-cell {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            gap: 0; 
            text-align: center;
            padding: 0; 
            font-size: 7pt;
            border-right: 1pt solid #0371C1;
            min-height: 100%; 
          }
          
          .igst-percent {
            font-size: 7pt;
            text-align: center;
            padding: 2pt; 
            width: 30%;
            border-right: 1pt solid #0371C1;
          }
          
          .igst-amount {
            font-size: 7pt;
            text-align: center;
            padding: 2pt 0; 
            width: 70%;
          }
          
          /* Bottom Section Styles */
          .bottom-section-column {
            display: flex;
            flex-direction: column;
            width: 100%;
            font-size: 7pt;
          }
          
          .bottom-section-row {
            display: flex;
            flex-direction: row;
            width: 100%;
            font-size: 7pt;
            align-items: flex-start;
            min-height: auto;
            // margin-top: 5pt;
          }
          
          .left-section {
            width: 65%;
            // border-right: 1.5pt solid #0371C1; 
            padding: 5pt;
            display: flex;
            flex-direction: column;
            min-height: auto;
            overflow: hidden;
          }
          
          .right-section {
            width: 35%;
            border-left: 1pt solid #0371C1; 
            // padding: 5pt;
            display: flex;
            flex-direction: column;
            min-height: auto;
            justify-content: flex-start;
          }
          
          .amount-tax-box {
            flex-shrink: 0;
            margin-bottom: 10pt;
            // border: 1pt solid #0371C1;
            border-radius: 2pt;
            // padding: 3pt;
          }
          
          .total-in-words {
            font-size: 7pt;
            font-weight: bold;
            border-bottom: 1pt solid #0371C1;
            padding: 3pt 5pt; 
            text-transform: uppercase;
            word-wrap: break-word;
          }
          
          /* HSN TAX TABLE STYLES */
          .hsn-tax-table {
            margin-top: 0;
            border: none;
            border-top: 1pt solid #0371C1; 
          }
          
          .hsn-tax-table-header {
            display: flex;
            flex-direction: row;
            background-color: rgba(3, 113, 193, 0.2);
            border-bottom: 1pt solid #0371C1;
          }

          .hsn-tax-header-tax-wrapper {
            display: flex;
            flex-direction: row;
          }
          
          .hsn-tax-header-cell {
            padding: 2pt;
            font-size: 7pt;
            font-weight: bold;
            border-right: 1pt solid #0371C1;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .hsn-tax-table-row {
            display: flex;
            flex-direction: row;
            border-bottom: 1pt solid #0371C1;
          }

          .hsn-tax-tax-wrapper {
            display: flex;
            flex-direction: row;
          }
          
          .hsn-tax-cell {
            padding: 2pt;
            font-size: 7pt;
            border-right: 1pt solid #0371C1;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .hsn-tax-table-total-row {
            display: flex;
            flex-direction: row;
            background-color: rgba(3, 113, 193, 0.2);
          }

          .hsn-tax-total-tax-wrapper {
            display: flex;
            flex-direction: row;
          }
          
          .hsn-tax-total-cell {
            padding: 2pt;
            font-size: 7pt;
            font-weight: bold;
            border-right: 1pt solid #0371C1;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .igst-cell-hsn {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            gap: 0;
            text-align: center;
            padding: 0;
            font-size: 7pt;
            min-height: 100%;
          }
          
          /* Total Rows in Right Section */
          .total-row-container {
            padding: 2pt;
            flex-shrink: 0;
            height: auto;
          }
          
          .total-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            padding: 1pt 0;
            line-height: 1;
            font-size: 8pt;
          }
          
          .label {
            font-size: 8pt;
            font-weight: normal;
          }
          
          .value {
            font-size: 8pt;
            font-weight: normal;
          }
          
          /* Highlight for the final amount */
          .highlight-row {
            padding: 3pt;
            border-top: 1pt solid #0371C1;
            border-bottom: 1pt solid #0371C1;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            margin-top: 0;
            font-size: 9pt;
            background-color: rgba(3, 113, 193, 0.1);
          }
          
          .highlight-row .label, .highlight-row .value {
            font-weight: bold;
          }
          
          /* Signature Block */
          .signature-box {
            border-top: 1pt solid #0371C1;
            // border-left: 1px solid #0371C1;
            width: 100%;
            min-height: 84pt;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding-top: 2pt;
            flex-grow: 0;
            margin-top: 5pt;
          }

          .signature-title {
            font-size: 9pt;
            font-weight: bold;
            color: #000000;
            padding: 3pt;
            text-align: center;
            width: 100%;
          }
          
          .authorized-text-container {
            width: 100%;
            text-align: center;
            padding-bottom: 2pt;
            padding-top: 2pt;
          }
          
          .signature-line {
            border-top: 1pt solid #0371C1; 
            width: 80%;
            margin: 0 auto;
            margin-bottom: 1pt;
            margin-top: 10pt; 
          }
          
          .authorized-text {
            font-size: 7pt;
            text-align: center;
            font-weight: bold;
          }
          
          .page-number {
            position: absolute;
            bottom: 20pt;
            right: 20pt;
            font-size: 8pt;
            text-align: right;
          }
          
          /* Bank Details - Left Section */
          .bank-details {
            margin-bottom: 6pt;
          }
          
          .bank-row {
            display: flex;
            flex-direction: row;
            // margin-bottom: 1pt;
            font-size: 8pt;
          }
          
          /* Terms and Conditions */
          .terms-container {
            // margin-top: 5pt;
            font-size: 8pt;
            width: 110%;
            
            margin-left: -10px;
            border-top: 1pt solid #0371C1;
            padding-top: 5pt;
            padding-left: 15pt;
          }
          
          .terms-content {
            font-size: 8pt;
            line-height: 1.4;
            // padding: 5pt 0;
            text-align: justify;
            white-space: normal;
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: break-word;
            width: 100%;
            max-width: 100%;
          }
          
          /* Text wrapping utilities */
          .text-wrap {
            white-space: normal !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          
          .no-overflow {
            overflow: hidden !important;
          }
          
          /* Utility classes */
          .text-left { text-align: left; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .bg-highlight { background-color: rgba(3, 113, 193, 0.2); }
          .word-break { word-break: break-all; }
          .overflow-wrap { overflow-wrap: break-word; }
        </style>
      </head>
      <body>
        ${pageHTMLs.join('')}
      </body>
      </html>
    `;
  };

  return generateHTML();
};

// --- PDF Generation Function ---
export const generatePdfForTemplate1 = async (
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
    const htmlContent = Template1({
      transaction,
      company,
      party,
      shippingAddress,
      bank,
      client,
      clientName,
    });

    const options = {
      html: htmlContent,
      fileName: `invoice_${transaction.invoiceNumber || 'document'}`,
      directory: 'Documents',
      width: A4_WIDTH,
      height: A4_HEIGHT,
      base64: true,
    };

    const file = await generatePDF(options);

    // Return a wrapper object with the output method
    const wrapper = {
      ...file,
      output: (format = 'base64') => {
        if (format === 'base64') {
          return file.base64;
        }
        if (format === 'filePath') {
          return file.filePath;
        }
        return file.base64;
      },
    };

    return wrapper;
  } catch (error) {
    throw error;
  }
};

// Utility function to use the component directly
export const generateTemplate1HTML = props => {
  return Template1(props);
};

export default Template1;
