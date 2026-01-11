// pdf-templateA5.js

import React from 'react';
import { generatePDF } from 'react-native-html-to-pdf';
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
} from './pdf-utils';
import { capitalizeWords, parseNotesHtml } from './utils';
import { formatQuantity } from './pdf-utils';
import { formatPhoneNumber } from './pdf-utils';
import { BASE_URL } from '../config';

// **START: ADDED IMPORT FOR HTML RENDERING UTILITIES**
import { parseHtmlToElements, renderParsedElements } from './HtmlNoteRenderer';
// **END: ADDED IMPORT FOR HTML RENDERING UTILITIES'

/**
 * Derives the client's name from the client object or a string.
 * @param client - The client object or a string name.
 * @returns The client's name.
 */
const getClientName = client => {
  console.log('getClientName called with:', client);
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

/**
 * Generate HTML content for the PDF
 */
const generateHTMLContent = (transaction, company, party) => {
  // Use the shipping address from transaction if available
  const shippingAddress = transaction?.shippingAddress || null;
  const bank = company?.bankDetails || null;
  const client = party || null;

  // --- Data Preparation and State Derivation ---
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

  // Bank Data Check - Added from Template 1
  const bankData = bank || transaction?.bank || {};

  // Check if any bank detail is available (used for conditional rendering)
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.qrCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  // Pagination logic - 27 items per page
  const ITEMS_PER_PAGE = 40;
  const totalItemsCount = itemsWithGST.length;
  const totalPages = Math.max(1, Math.ceil(totalItemsCount / ITEMS_PER_PAGE));

  // Function to generate item rows for a specific page
  const generateItemRowsForPage = (pageNumber) => {
    const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItemsCount);
    const pageItems = itemsWithGST.slice(startIndex, endIndex);

    return pageItems
      .map((item, index) => {
        const itemIndex = startIndex + index;
        const igstHtml = showIGST
          ? `
        <td style="border: 1px solid #0371C1; padding: 2px; width: 12%;">
          <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
            <span style="width: 30%; text-align: center; font-size: 7px;">${
              item.gstRate
            }</span>
            <span style="width: 70%; text-align: center; font-size: 7px;">${formatCurrency(
              item.igst,
            )}</span>
          </div>
        </td>
      `
          : '';

        const cgstSgstHtml = showCGSTSGST
          ? `
        <td style="border: 1px solid #0371C1; padding: 2px; width: 12%;">
          <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
            <span style="width: 30%; text-align: center; font-size: 7px;">${
              item.gstRate / 2
            }</span>
            <span style="width: 70%; text-align: center; font-size: 7px;">${formatCurrency(
              item.cgst,
            )}</span>
          </div>
        </td>
        <td style="border: 1px solid #0371C1; padding: 2px; width: 12%;">
          <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
            <span style="width: 30%; text-align: center; font-size: 7px;">${
              item.gstRate / 2
            }</span>
            <span style="width: 70%; text-align: center; font-size: 7px;">${formatCurrency(
              item.sgst,
            )}</span>
          </div>
        </td>
      `
          : '';

        return `
        <tr style="border-bottom: 1px solid #0371C1;">
          <td style="border: 1px solid #0371C1; padding: 2px; width: 8%; text-align: center; font-size: 7px;">${
            itemIndex + 1
          }</td>
          <td style="border: 1px solid #0371C1; padding: 2px; width: 25%; text-align: left; font-size: 7px;">${capitalizeWords(
            item.name,
          )}</td>
          <td style="border: 1px solid #0371C1; padding: 2px; width: 10%; text-align: center; font-size: 7px;">${
            item.code || '-'
          }</td>
          <td style="border: 1px solid #0371C1; padding: 2px; width: 8%; text-align: center; font-size: 7px;">
            ${
              item.itemType === 'service'
                ? '-'
                : formatQuantity(item.quantity || 0, item.unit)
            }
          </td>
          <td style="border: 1px solid #0371C1; padding: 2px; width: 10%; text-align: center; font-size: 7px;">${formatCurrency(
            item.pricePerUnit || 0,
          )}</td>
          <td style="border: 1px solid #0371C1; padding: 2px; width: 12%; text-align: center; font-size: 7px;">${formatCurrency(
            item.taxableValue,
          )}</td>
          ${igstHtml}
          ${cgstSgstHtml}
          <td style="border: 1px solid #0371C1; padding: 2px; width: 15%; text-align: center; font-size: 7px; font-weight: bold;">${formatCurrency(
            item.total,
          )}</td>
        </tr>
      `;
      })
      .join('');
  };

  // Generate table header HTML
  const generateTableHeader = () => {
    const igstHeader = showIGST
      ? `
      <th style="border: 1px solid #0371C1; padding: 1px; width: 12%;">
        <div style="text-align: center; font-weight: bold; font-size: 7px;">IGST</div>
        <div style="display: flex; border-top: 1px solid #0371C1;">
          <div style="width: 30%; text-align: center; border-right: 1px solid #0371C1; font-size: 6px; font-weight: bold; padding: 1px;">%</div>
          <div style="width: 70%; text-align: center; font-size: 6px; font-weight: bold; padding: 1px;">Amount (Rs.)</div>
        </div>
      </th>
    `
      : '';

    const cgstSgstHeader = showCGSTSGST
      ? `
      <th style="border: 1px solid #0371C1; padding: 1px; width: 12%;">
        <div style="text-align: center; font-weight: bold; font-size: 7px;">CGST</div>
        <div style="display: flex; border-top: 1px solid #0371C1;">
          <div style="width: 30%; text-align: center; border-right: 1px solid #0371C1; font-size: 6px; font-weight: bold; padding: 1px;">%</div>
          <div style="width: 70%; text-align: center; font-size: 6px; font-weight: bold; padding: 1px;">Amount (Rs.)</div>
        </div>
      </th>
      <th style="border: 1px solid #0371C1; padding: 1px; width: 12%;">
        <div style="text-align: center; font-weight: bold; font-size: 7px;">SGST</div>
        <div style="display: flex; border-top: 1px solid #0371C1;">
          <div style="width: 30%; text-align: center; border-right: 1px solid #0371C1; font-size: 6px; font-weight: bold; padding: 1px;">%</div>
          <div style="width: 70%; text-align: center; font-size: 6px; font-weight: bold; padding: 1px;">Amount (Rs.)</div>
        </div>
      </th>
    `
      : '';

    return `
      <tr style="background-color: rgba(3, 113, 193, 0.2);">
        <th style="border: 1px solid #0371C1; padding: 2px; width: 8%; text-align: center; font-size: 7px; font-weight: bold;">Sr. No.</th>
        <th style="border: 1px solid #0371C1; padding: 2px; width: 25%; text-align: center; font-size: 7px; font-weight: bold;">Name of Product/Service</th>
        <th style="border: 1px solid #0371C1; padding: 2px; width: 10%; text-align: center; font-size: 7px; font-weight: bold;">HSN/SAC</th>
        <th style="border: 1px solid #0371C1; padding: 2px; width: 8%; text-align: center; font-size: 7px; font-weight: bold;">Qty</th>
        <th style="border: 1px solid #0371C1; padding: 2px; width: 10%; text-align: center; font-size: 7px; font-weight: bold;">Rate (Rs.)</th>
        <th style="border: 1px solid #0371C1; padding: 2px; width: 12%; text-align: center; font-size: 7px; font-weight: bold;">Taxable Value (Rs.)</th>
        ${igstHeader}
        ${cgstSgstHeader}
        <th style="border: 1px solid #0371C1; padding: 2px; width: 15%; text-align: center; font-size: 7px; font-weight: bold;">Total (Rs.)</th>
      </tr>
    `;
  };

  // Generate total row HTML - only shown on last page
  const generateTotalRow = (isLastPage) => {
    if (!isLastPage) return '';
    
    const igstTotal = showIGST
      ? `
      <td style="border: 1px solid #0371C1; padding: 2px; width: 12%;">
        <div style="text-align: right; padding-right: 20px; font-size: 7px; font-weight: bold;">${formatCurrency(
          totalIGST,
        )}</div>
      </td>
    `
      : '';

    const cgstSgstTotal = showCGSTSGST
      ? `
      <td style="border: 1px solid #0371C1; padding: 2px; width: 12%;">
        <div style="text-align: right; padding-right: 9px; font-size: 7px; font-weight: bold;">${formatCurrency(
          totalCGST,
        )}</div>
      </td>
      <td style="border: 1px solid #0371C1; padding: 2px; width: 12%;">
        <div style="text-align: right; padding-right: 13px; font-size: 7px; font-weight: bold;">${formatCurrency(
          totalSGST,
        )}</div>
      </td>
    `
      : '';

    return `
      <tr style="background-color: rgba(3, 113, 193, 0.2);">
        <td style="border: 1px solid #0371C1; padding: 2px; width: 8%;"></td>
        <td style="border: 1px solid #0371C1; padding: 2px; width: 25%;"></td>
        <td style="border: 1px solid #0371C1; padding: 2px; width: 10%; text-align: center; font-size: 7px; font-weight: bold;">Total</td>
        <td style="border: 1px solid #0371C1; padding: 2px; width: 8%; text-align: center; font-size: 7px; font-weight: bold;">${totalQty}</td>
        <td style="border: 1px solid #0371C1; padding: 2px; width: 10%;"></td>
        <td style="border: 1px solid #0371C1; padding: 2px; width: 12%; text-align: center; font-size: 7px; font-weight: bold;">${formatCurrency(
          totalTaxable,
        )}</td>
        ${igstTotal}
        ${cgstSgstTotal}
        <td style="border: 1px solid #0371C1; padding: 2px; width: 15%; text-align: center; font-size: 7px; font-weight: bold;">${formatCurrency(
          totalAmount,
        )}</td>
      </tr>
    `;
  };

  // Generate bank details HTML
  const generateBankDetails = () => {
    if (!isBankDetailAvailable || transaction.type === 'proforma') {
      return '';
    }

    let bankDetailsHTML = `
      <div style="flex: 1;">
        <div style="font-size: 9px; font-weight: bold; margin-bottom: 2px;">Bank Details:</div>
    `;

    if (bankData?.bankName) {
      bankDetailsHTML += `
        <div style="display: flex; margin-bottom: 1px; font-size: 8px;">
          <div style="width: 70px; font-weight: bold;">Name:</div>
          <div>${capitalizeWords(bankData.bankName)}</div>
        </div>
      `;
    }

    if (bankData?.accountNo) {
      bankDetailsHTML += `
        <div style="display: flex; margin-bottom: 1px; font-size: 8px;">
          <div style="width: 70px; font-weight: bold;">Acc. No:</div>
          <div>${bankData.accountNo}</div>
        </div>
      `;
    }

    if (bankData?.ifscCode) {
      bankDetailsHTML += `
        <div style="display: flex; margin-bottom: 1px; font-size: 8px;">
          <div style="width: 70px; font-weight: bold;">IFSC:</div>
          <div>${bankData.ifscCode}</div>
        </div>
      `;
    }

    if (bankData?.branchAddress) {
      bankDetailsHTML += `
        <div style="display: flex; margin-bottom: 1px; font-size: 8px;">
          <div style="width: 70px; font-weight: bold;">Branch:</div>
          <div style="flex: 1;">${bankData.branchAddress}</div>
        </div>
      `;
    }

    if (bankData?.upiDetails?.upiId) {
      bankDetailsHTML += `
        <div style="display: flex; margin-bottom: 1px; font-size: 8px;">
          <div style="width: 70px; font-weight: bold;">UPI ID:</div>
          <div>${bankData.upiDetails.upiId}</div>
        </div>
      `;
    }

    if (bankData?.upiDetails?.upiName) {
      bankDetailsHTML += `
        <div style="display: flex; margin-bottom: 1px; font-size: 8px;">
          <div style="width: 70px; font-weight: bold;">UPI Name:</div>
          <div>${bankData.upiDetails.upiName}</div>
        </div>
      `;
    }

    if (bankData?.upiDetails?.upiMobile) {
      bankDetailsHTML += `
        <div style="display: flex; margin-bottom: 1px; font-size: 8px;">
          <div style="width: 70px; font-weight: bold;">UPI Mobile:</div>
          <div>${bankData.upiDetails.upiMobile}</div>
        </div>
      `;
    }

    bankDetailsHTML += `</div>`;

    // Add QR code if available
    if (bankData?.qrCode) {
      bankDetailsHTML += `
        <div style="align-items: center; justify-content: center; padding: 5px; margin-left: 10px;">
          <div style="font-size: 9px; font-weight: bold; margin-bottom: 5px;">QR Code</div>
          <img src="${BASE_URL}/${bankData.qrCode}" style="width: 70px; height: 70px; background-color: #fff;" />
        </div>
      `;
    }

    return bankDetailsHTML;
  };

  // Function to generate page HTML
  const generatePageHTML = (pageNumber) => {
    const isLastPage = pageNumber === totalPages;
    const hasNextPage = pageNumber < totalPages;
    
    // Calculate the height needed for the items table
    const itemRowsHeight = Math.min(ITEMS_PER_PAGE, totalItemsCount - ((pageNumber - 1) * ITEMS_PER_PAGE)) * 20;
    const tableHeight = itemRowsHeight + 40; // Add header height

    return `
      <div class="page" style="page-break-after: ${hasNextPage ? 'always' : 'auto'};">
        <!-- Header Section -->
        <div class="header">
          <div class="header-left">
            ${logoSrc ? `<img src="${logoSrc}" class="logo" />` : ''}
          </div>
          <div class="header-right">
            <div class="company-name">
              ${capitalizeWords(
                company?.businessName || company?.companyName || 'Company Name',
              )}
            </div>
            <div class="address">
              ${
                [
                  company?.address,
                  company?.City,
                  company?.addressState,
                  company?.Country,
                  company?.Pincode,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Address Line 1'
              }
            </div>
            <div class="contact-info">
              <span class="contact-label">Name : </span>
              <span class="contact-value">${capitalizeWords(
                getClientName(client),
              )}</span>
              <span class="contact-label"> | Phone : </span>
              <span class="contact-value">
                ${
                  company?.mobileNumber
                    ? formatPhoneNumber(String(company.mobileNumber))
                    : company?.Telephone
                    ? formatPhoneNumber(String(company.Telephone))
                    : '-'
                }
              </span>
            </div>
          </div>
        </div>

        <!-- Main Content Section -->
        <div class="main-section">
          <!-- Invoice Title and GSTIN -->
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

          <!-- Three Column Details Section -->
          <div class="three-col-section">
            <!-- Column 1 - Details of Buyer -->
            <div class="column no-left-border">
              <div class="column-header">
                <div class="threecoltable-header">Details of Buyer | Billed to:</div>
              </div>
              <div class="data-row">
                <div class="table-label">Name</div>
                <div class="table-value">${capitalizeWords(
                  party?.name || 'N/A',
                )}</div>
              </div>
              <div class="data-row">
                <div class="table-label">Address</div>
                <div class="table-value">${
                  capitalizeWords(getBillingAddress(party)) || '-'
                }</div>
              </div>
              <div class="data-row">
                <div class="table-label">Phone</div>
                <div class="table-value">
                  ${
                    party?.contactNumber
                      ? formatPhoneNumber(party.contactNumber)
                      : '-'
                  }
                </div>
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
                <div class="table-value">
                  ${
                    shippingAddress?.state
                      ? `${capitalizeWords(shippingAddress.state)} (${
                          getStateCode(shippingAddress.state) || '-'
                        })`
                      : party?.state
                      ? `${capitalizeWords(party.state)} (${
                          getStateCode(party.state) || '-'
                        })`
                      : '-'
                  }
                </div>
              </div>
            </div>

            <!-- Column 2 - Details of Consigned -->
            <div class="column">
              <div class="column-header">
                <div class="threecoltable-header">Details of Consigned | Shipped to:</div>
              </div>
              <div class="data-row">
                <div class="table-label">Name</div>
                <div class="table-value">
                  ${capitalizeWords(
                    shippingAddress?.label || party?.name || 'N/A',
                  )}
                </div>
              </div>
              <div class="data-row">
                <div class="table-label">Address</div>
                <div class="table-value">
                  ${capitalizeWords(
                    getShippingAddress(
                      shippingAddress,
                      getBillingAddress(party),
                    ),
                  )}
                </div>
              </div>
              <div class="data-row">
                <div class="table-label">Country</div>
                <div class="table-value">India</div>
              </div>
              <div class="data-row">
                <div class="table-label">Phone</div>
                <div class="table-value">
                  ${
                    shippingAddress?.contactNumber
                      ? formatPhoneNumber(String(shippingAddress.contactNumber))
                      : party?.contactNumber
                      ? formatPhoneNumber(String(party.contactNumber))
                      : '-'
                  }
                </div>
              </div>
              <div class="data-row">
                <div class="table-label">GSTIN</div>
                <div class="table-value">${party?.gstin || '-'}</div>
              </div>
              <div class="data-row">
                <div class="table-label">State</div>
                <div class="table-value">
                  ${
                    shippingAddress?.state
                      ? `${capitalizeWords(shippingAddress.state)} (${
                          getStateCode(shippingAddress.state) || '-'
                        })`
                      : party?.state
                      ? `${capitalizeWords(party.state)} (${
                          getStateCode(party.state) || '-'
                        })`
                      : '-'
                  }
                </div>
              </div>
            </div>

            <!-- Column 3 - Invoice Details -->
            <div class="column no-right-border">
              <div class="data-row invoice-detail-row">
                <div class="table-label">Invoice No.</div>
                <div class="table-value">${
                  transaction.invoiceNumber || 'N/A'
                }</div>
              </div>
              <div class="data-row invoice-detail-row">
                <div class="table-label">Invoice Date</div>
                <div class="table-value">
                  ${new Date(transaction.date).toLocaleDateString('en-IN')}
                </div>
              </div>
              <div class="data-row invoice-detail-row">
                <div class="table-label">Due Date</div>
                <div class="table-value">
                  ${new Date(transaction.dueDate).toLocaleDateString('en-IN')}
                </div>
              </div>
              <div class="data-row invoice-detail-row">
                <div class="table-label">P.O. No.</div>
                <div class="table-value">${transaction.voucher || '-'}</div>
              </div>
              <div class="data-row invoice-detail-row">
                <div class="table-label">E-Way No.</div>
                <div class="table-value">${transaction.eway || '-'}</div>
              </div>
            </div>
          </div>

          <!-- Items Table - Main Content -->
          <div class="table-container" ">
            <table>
              <thead>
                ${generateTableHeader()}
              </thead>
              <tbody>
                ${generateItemRowsForPage(pageNumber)}
                ${generateTotalRow(isLastPage)}
              </tbody>
            </table>
          </div>

          <!-- Bottom Section (only on last page) -->
          ${
            isLastPage
              ? `
          <div class="bottom-section">
            <!-- Left Column: Total in words + Bank Details -->
            <div class="left-section">
              <div class="total-in-words">
                Total in words : ${numberToWords(totalAmount)}
              </div>

              <!-- Bank Details Section -->
              ${
                transaction.type !== 'proforma' && isBankDetailAvailable
                  ? `
                <div class="bank-details-wrapper">
                  ${generateBankDetails()}
                </div>
              `
                  : ''
              }
            </div>

            <!-- Right Column: Totals -->
            <div class="right-section">
              <div class="total-row">
                <div class="label">Taxable Amount</div>
                <div class="value">Rs.${formatCurrency(totalTaxable)}</div>
              </div>

              ${
                isGSTApplicable
                  ? `
                <div class="total-row">
                  <div class="label">Total Tax</div>
                  <div class="value">
                    Rs.${formatCurrency(
                      showIGST ? totalIGST : totalCGST + totalSGST,
                    )}
                  </div>
                </div>
              `
                  : ''
              }

              <div class="total-row ${isGSTApplicable ? 'highlight-row' : ''}">
                <div class="${isGSTApplicable ? 'label bold-text' : 'label'}">
                  ${isGSTApplicable ? 'Total Amount After Tax' : 'Total Amount'}
                </div>
                <div class="${isGSTApplicable ? 'value bold-text' : 'value'}">
                  Rs.${formatCurrency(totalAmount)}
                </div>
              </div>

              <div class="total-row">
                <div class="label">
                  For-${
                    company?.businessName ||
                    company?.companyName ||
                    'Company Name'
                  }
                </div>
                <div class="value">(E & O.E.)</div>
              </div>
            </div>
          </div>

          <!-- Terms and Conditions (only on last page) -->
          ${
            transaction?.notes
              ? `
            <div class="terms-box">
              <div class="term-line bold-text"></div>
              <div class="term-line">${renderNotesHTML(transaction.notes)}</div>
            </div>
          `
              : ''
          }
          `
              : ''
          }
        </div>

        <!-- Page Number Footer -->
        <div class="page-number">
          Page ${pageNumber} of ${totalPages}
        </div>
      </div>
    `;
  };

  // Generate all pages HTML
  let allPagesHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    allPagesHTML += generatePageHTML(i);
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        body {
          font-family: 'Helvetica', Arial, sans-serif;
          margin: 16px;
          padding: 0;
          color: #000;
          background-color: #FFFFFF;
          position: relative;
          min-height: 864px; /* A4 height in pixels at 96 DPI */
        }
        .page {
          position: relative;
          width: 100%;
          min-height: 864px; /* A4 height minus margins */
        }
        .page-number {
          position: absolute;
          bottom: 0;
          right: 0;
          font-size: 10px;
          color: #666;
          padding: 5px 10px;
        }
        .container {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .header {
          display: flex;
          margin-bottom: 8px;
          padding-bottom: 4px;
          align-items: center;
          gap: 6px;
        }
        .header-left {
          flex: 1;
        }
        .header-right {
          flex: 8;
        }
        .logo {
          width: 70px;
          height: 70px;
          object-fit: contain;
        }
        .company-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #000;
        }
        .address {
          font-size: 10px;
          margin-bottom: 3px;
          line-height: 14px;
          color: #000;
        }
        .contact-info {
          font-size: 10px;
          line-height: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          align-items: center;
        }
        .contact-label {
          font-size: 10px;
          font-weight: bold;
          color: #000;
        }
        .contact-value {
          font-size: 10px;
          font-weight: normal;
          color: #000;
        }
        .main-section {
          border: 1px solid #0371C1;
          padding: 0;
          margin-top: 10px;
        }
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          // border: 1.5px solid #0371C1;
        }
        .gst-row {
          padding: 3px;
        }
        .gst-label {
          font-size: 10px;
          font-weight: bold;
          color: #000;
        }
        .gst-value {
          font-size: 10px;
          font-weight: normal;
          color: #000;
        }
        .invoice-title-row {
          padding: 3px;
        }
        .invoice-title {
          font-size: 16px;
          font-weight: 800;
          text-align: center;
          color: #0371C1;
        }
        .recipient-row {
          padding: 3px;
        }
        .recipient-text {
          font-size: 10px;
          font-weight: bold;
          text-align: center;
          color: #000;
        }
        .three-col-section {
          display: flex;
          // border-bottom: 1.5px solid #0371C1;
          // border-left: 1.5px solid #0371C1;
          // border-right: 1.5px solid #0371C1;
           border-top: 1.5px solid #0371C1;
        }
        .column {
          width: 33.3%;
          padding: 4px 4px;
          border-left: 1px solid #0371C1;
        }
        .no-left-border {
          border-left: none;
        }
        .no-right-border {
          border-right: none;
        }
        .column-header {
          margin-bottom: 5px;
        }
        .threecoltable-header {
          font-size: 8px;
          font-weight: bold;
          color: #000;
        }
        .data-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 2px 0;
        }
        .invoice-detail-row {
          gap: 30px;
        }
        .table-label {
          font-size: 8px;
          font-weight: bold;
          width: 40%;
          color: #000;
        }
        .table-value {
          font-size: 8px;
          font-weight: normal;
          width: 70%;
          color: #000;
        }
        .table-container {
          // border-left: 1.5px solid #0371C1;
          // border-right: 1.5px solid #0371C1;
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .bottom-section {
          display: flex;
          // border-top: 1px solid #0371C1;
          // border-left: 1.5px solid #0371C1;
          // border-right: 1.5px solid #0371C1;
          border-bottom: 1.5px solid #0371C1;
          font-size: 7px;
        }
        .left-section {
          width: 65%;
          border-right: 1px solid #0371C1;
        }
        .total-in-words {
          font-size: 7px;
          font-weight: bold;
          border-bottom: 1px solid #0371C1;
          padding: 3px;
          text-transform: uppercase;
          color: #000;
        }
        .bank-details-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 4px;
        }
        .right-section {
          width: 35%;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #0371C1;
          padding: 3px;
        }
        .label {
          font-size: 8px;
          font-weight: bold;
          color: #000;
        }
        .value {
          font-size: 8px;
          font-weight: bold;
          color: #000;
        }
        .highlight-row {
          background-color: #EAF4FF;
        }
        .terms-box {
        margin-left: -20px;
        }
        .term-line {
          font-size: 10px;
          // margin-bottom: 2px;
          padding-left:25px;
          color: #000000;
          text-align: left;
          text-decoration: none;
          background-color: transparent;
        }
        .bold-text {
          font-weight: bold;
        }
        .flex {
          display: flex;
        }
        .items-center {
          align-items: center;
        }
        .justify-center {
          justify-content: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${allPagesHTML}
      </div>
    </body>
    </html>
  `;

  return html;
};

// MAIN EXPORT FUNCTION - This is what InvoicePreview.js expects
export const generatePdfForTemplateA5 = async (
  transaction,
  company,
  party,
  serviceNameMap,
) => {
  try {
    // Generate HTML content
    const htmlContent = generateHTMLContent(transaction, company, party);

    // Generate PDF using react-native-html-to-pdf
    const options = {
      html: htmlContent,
      fileName: `invoice_${transaction.invoiceNumber || Date.now()}`,
      directory: 'Documents',
      // A4 size in points: 595 x 842 points (21.0 x 29.7 cm)
      width: 595,
      height: 842,
      padding: 16,
      baseUrl: BASE_URL,
    };

    const file = await generatePDF(options);
    return file;
  } catch (error) {
    console.error('Template A5 PDF generation error:', error);

    // Fallback: Create a simpler PDF if the main generation fails
    try {
      const fallbackHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .invoice-title { text-align: center; font-size: 24px; font-weight: bold; color: #0371C1; margin-bottom: 20px; }
              .company-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
              .address { font-size: 12px; margin-bottom: 20px; }
              .section { border: 2px solid #0371C1; padding: 10px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="company-name">${
              company?.businessName || company?.companyName || 'Company Name'
            }</div>
            <div class="address">
              ${
                [
                  company?.address,
                  company?.City,
                  company?.addressState,
                  company?.Country,
                  company?.Pincode,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Address'
              }
            </div>
            <div class="invoice-title">
              ${
                transaction.type === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE'
              }
            </div>
            <div class="section">
              <p><strong>Invoice No:</strong> ${
                transaction.invoiceNumber || 'N/A'
              }</p>
              <p><strong>Invoice Date:</strong> ${new Date(
                transaction.date,
              ).toLocaleDateString('en-IN')}</p>
              <p><strong>Client:</strong> ${party?.name || 'N/A'}</p>
              <p><strong>Total Amount:</strong> Rs. ${formatCurrency(
                transaction.totalAmount || 0,
              )}</p>
            </div>
            <p>Generated with Template A5</p>
          </body>
        </html>
      `;

      const options = {
        html: fallbackHtml,
        fileName: `invoice_${transaction.invoiceNumber || Date.now()}_fallback`,
        directory: 'Documents',
      };

      const file = await generatePDF(options);
      return file;
    } catch (fallbackError) {
      console.error('Fallback PDF generation also failed:', fallbackError);
      throw new Error(`Failed to generate PDF: ${fallbackError.message}`);
    }
  }
};

// Also export the HTML generation function for other uses
export { generateHTMLContent };