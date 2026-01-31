import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Ensure these imports point to your actual location
import { BASE_URL } from '../../../config';
// HSNCode and SACCode are typically used for type definition in JS via JSDoc
// but they represent the structure of the selected object.
import { HSNCode } from '../../../lib/hsnProduct';
import { SACCode } from '../../../lib/sacService';

/**
 * ✅ ENRICH TRANSACTION: Add product and service names to transaction items
 * Maps product/service IDs to actual names from the available products/services arrays
 */
const enrichTransactionWithNames = (
  transaction,
  products = [],
  services = [],
) => {
  if (!transaction) return transaction;

  const enriched = { ...transaction };

  // Enrich products with names
  if (Array.isArray(enriched.products)) {
    enriched.products = enriched.products.map(productItem => {
      const product = products.find(p => p._id === productItem.product);

      return {
        ...productItem,
        productName: product?.name || 'Unknown Product',
        product: product
          ? { ...product, name: product.name }
          : productItem.product,
      };
    });
  }

  // Enrich services with names
  if (Array.isArray(enriched.services)) {
    enriched.services = enriched.services.map(serviceItem => {
      const service = services.find(s => s._id === serviceItem.service);
 
      return {
        ...serviceItem,
        serviceName: service?.serviceName || 'Unknown Service',
        service: service
          ? { ...service, serviceName: service.serviceName }
          : serviceItem.service,
      };
    });
  }

  return enriched;
};

/**
 * Scrolls the form to the first field with a validation error and sets focus.
 * NOTE: The scrolling part relies on correctly implemented form field refs
 * and passing the main ScrollView ref to this function.
 *
 * @param {object} form The object returned by useForm (or useFormContext).
 * @param {React.RefObject<ScrollView>} scrollViewRef A ref to the main ScrollView component.
 */
export const scrollToFirstError = (form, scrollViewRef) => {
  const errors = form.formState.errors;
  const currentType = form.getValues('type');

  // Define the order of fields to check for errors (top to bottom), filtered by transaction type
  let fieldOrder = [];

  // Common fields for all types
  fieldOrder.push('company', 'date');

  // Party field logic
  if (
    ['sales', 'purchases', 'receipt'].includes(currentType) ||
    (currentType === 'payment' && !form.getValues('isExpense'))
  ) {
    fieldOrder.push('party');
  }

  // Expense field
  if (currentType === 'payment' && form.getValues('isExpense')) {
    fieldOrder.push('expense');
  }

  // Payment method
  if (['sales', 'purchases', 'receipt', 'payment'].includes(currentType)) {
    fieldOrder.push('paymentMethod');
  }

  fieldOrder.push('bank');

  // Item fields
  if (['sales', 'purchases'].includes(currentType)) {
    // We only check the first item's fields as a placeholder for array validation
    fieldOrder.push(
      'items.0.product',
      'items.0.quantity',
      'items.0.unitType',
      'items.0.pricePerUnit',
      'items.0.amount',
      'items.0.gstPercentage',
      'items.0.lineTotal',
    );
  }

  // Amount fields
  if (
    ['sales', 'purchases', 'receipt', 'payment', 'journal'].includes(
      currentType,
    )
  ) {
    fieldOrder.push('totalAmount');
  }

  // GST fields
  if (['sales', 'purchases'].includes(currentType)) {
    fieldOrder.push('taxAmount', 'invoiceTotal');
  }

  fieldOrder.push('referenceNumber');
  fieldOrder.push('description', 'narration');

  if (currentType === 'journal') {
    fieldOrder.push('fromAccount', 'toAccount');
  }

  fieldOrder.push('notes');

  // Find the first field in order that has an error
  for (const fieldName of fieldOrder) {
    if (errors[fieldName]) {
      // 1. Set Focus (using RHF)
      form.setFocus(fieldName);

      // 2. Scroll to the field (React Native Specific Logic Placeholder)
      if (scrollViewRef.current) {
        // You would typically use a map of fieldName to component ref
        // and then call ref.measure/ref.measureLayout to get the position,
        // and finally use scrollViewRef.current.scrollTo to scroll.
     
      }
      break; // Stop after finding the first error
    }
  }
};

/**
 * Generates an HTML string for an invoice email.
 *
 * @param {object} opts
 * @param {string} opts.companyName
 * @param {string} [opts.partyName='Customer']
 * @param {string} [opts.supportEmail='']
 * @param {string} [opts.supportPhone='']
 * @param {string} [opts.logoUrl]
 * @returns {string} The HTML email template string.
 */
export function buildInvoiceEmailHTML(opts) {
  const {
    companyName,
    partyName = 'Customer',
    supportEmail = '',
    supportPhone = '',
    logoUrl,
  } = opts;

  // Use mailto: for email contact
  const contactLine = supportEmail
    ? `for any queries, feel free to contact us at <a href="mailto:${supportEmail}" style="color:#2563eb;text-decoration:none;">${supportEmail}</a>${
        supportPhone ? ` or ${supportPhone}` : ''
      }.`
    : `for any queries, feel free to contact us${
        supportPhone ? ` at ${supportPhone}` : ''
      }.`;

  // Retain the table structure for robust HTML email compatibility across clients
  return `
 <table role="presentation" width="100%" style="background:#f5f7fb;padding:24px 12px;margin:0;">
   <tr>
     <td align="center">
       <table role="presentation" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
         <tr>
           <td style="background:#111827;color:#fff;padding:16px 24px;">
             <div style="display:flex;align-items:center;gap:12px;">
               ${
                 logoUrl
                   ? `<img src="${logoUrl}" alt="${companyName}" width="32" height="32" style="border-radius:6px;display:inline-block;">`
                   : ``
               }
               <span style="font-size:18px;font-weight:700;letter-spacing:.3px;">${companyName}</span>
             </div>
           </td>
         </tr>

         <tr>
           <td style="padding:24px 24px 8px;">
             <p style="margin:0 0 12px 0;font-size:16px;color:#111827;">Dear ${partyName},</p>
             <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#374151;">
               Thank you for choosing ${companyName}. Please find attached the invoice for your recent purchase.
               We appreciate your business and look forward to serving you again.
             </p>

             <div style="margin:18px 0;padding:14px 16px;border:1px solid #e5e7eb;background:#f9fafb;border-radius:10px;font-size:14px;color:#111827;">
               Your invoice is attached as a PDF.
             </div>

             <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#374151;">
               ${contactLine}
             </p>

             <p style="margin:24px 0 0 0;font-size:14px;color:#111827;">
               Warm regards,<br>
               <strong>${companyName}</strong><br>
               ${
                 supportEmail
                   ? `<a href="mailto:${supportEmail}" style="color:#2563eb;text-decoration:none;">${supportEmail}</a>`
                   : ``
               }
             </p>
           </td>
         </tr>

         <tr>
           <td style="background:#f9fafb;color:#6b7280;font-size:12px;text-align:center;padding:12px 24px;border-top:1px solid #e5e7eb;">
             This is an automated message regarding your invoice. Please reply to the address above if you need help.
           </td>
         </tr>
       </table>
     </td>
   </tr>
 </table>`;
}

/**
 * Handles form submission with validation, transaction creation, and invoice preview generation (for sales).
 *
 * @param {object} opts
 * @param {object} opts.form The react-hook-form object.
 * @param {function} opts.setIsSubmitting State setter for submission status.
 * @param {function} opts.onSubmit Main function to submit form data to the backend.
 * @param {function} opts.setSavedTransactionData State setter for transaction data.
 * @param {function} opts.setIsTransactionSaved State setter for transaction saved status.
 * @param {function} opts.setGeneratedInvoice State setter for the invoice preview data.
 * @param {function} opts.setInvoicePreviewOpen State setter to open the preview modal.
 * @param {Array<object>} opts.companies Local list of company objects.
 * @param {Array<object>} opts.parties Local list of party/customer objects.
 * @param {Array<object>} opts.banks Local list of bank objects.
 * @param {Array<object>} opts.shippingAddresses Local list of shipping addresses.
 * @param {string} opts.BASE_URL The API base URL.
 */
export const handleCreateTransactionWithPreview = async ({
  form,
  setIsSubmitting,
  onSubmit,
  setSavedTransactionData,
  setIsTransactionSaved,
  setGeneratedInvoice,
  setInvoicePreviewOpen,
  companies,
  parties,
  banks,
  shippingAddresses,
  BASE_URL,
  products = [],
  services = [],
}) => {
  const isValid = await form.trigger();
  if (!isValid) {
    // In RN, show error toast
    Toast.show({
      type: 'error',
      text1: 'Validation Error',
      text2: 'Please fix the errors in the form before submitting.',
    });
    // NOTE: If you need scrolling, call scrollToFirstError here with the ref.
    return;
  }

  try {
    setIsSubmitting(true);

    const values = form.getValues();

    if (values.paymentMethod === 'Others' && values.customPaymentMethod) {
      values.paymentMethod = values.customPaymentMethod;
    }

    if (values.type === 'sales') {
      const result = await onSubmit(values, false);

      if (result && result.entry) {
        const savedTransaction = result.entry;

        setSavedTransactionData(savedTransaction);
        setIsTransactionSaved(true);

        // Fetch complete Party Details
        let partyToUse = null;
        const partyId = savedTransaction.party?._id || savedTransaction.party;

        if (partyId) {
          try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/api/parties/${partyId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
              partyToUse = await response.json();
            }
          } catch (error) {
            console.error('Error fetching party details:', error);
          }
        }

        // Fetch complete Company Details
        let companyToUse = null;
        const companyId =
          savedTransaction.company?._id || savedTransaction.company;

        if (companyId) {
          try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(
              `${BASE_URL}/api/companies/${companyId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (response.ok) {
              companyToUse = await response.json();
            }
          } catch (error) {
            console.error('Error fetching company details:', error);
          }
        }

        // Fetch Bank Details
        let bankDetails = null;
        const bankId =
          savedTransaction.bank?._id || savedTransaction.bank || values.bank;

        if (bankId) {
          try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(
              `${BASE_URL}/api/bank-details/${bankId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (response.ok) {
              bankDetails = await response.json();
            } else {
              bankDetails = banks.find(bank => bank._id === bankId);
            }
          } catch (error) {
            console.error('Error fetching bank details:', error);
            bankDetails = banks.find(bank => bank._id === bankId);
          }
        }

        // Determine Shipping Address
        let shippingAddressData = null;

        if (!values.sameAsBilling) {
          if (values.shippingAddress && values.shippingAddress !== 'new') {
            shippingAddressData = shippingAddresses.find(
              addr => addr._id === values.shippingAddress,
            );
          } else if (
            values.shippingAddress === 'new' &&
            values.shippingAddressDetails
          ) {
            shippingAddressData = {
              _id: 'new-address',
              ...values.shippingAddressDetails,
            };
          }
        } else {
          shippingAddressData = {
            label: 'Billing Address',
            address: partyToUse?.address || '',
            city: partyToUse?.city || '',
            state: partyToUse?.state || '',
            pincode: partyToUse?.pincode || '',
            contactNumber: partyToUse?.contactNumber || '',
          };
        }

        // Fetch default template from backend
        let selectedTemplate = 'template1';
        try {
          const token = await AsyncStorage.getItem('token');
          if (token) {
            const templateRes = await fetch(
              `${BASE_URL}/api/settings/default-template`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (templateRes.ok) {
              const templateData = await templateRes.json();
              selectedTemplate = templateData.defaultTemplate || 'template1';
            }
          }
        } catch (error) {
          console.error('Error fetching default template:', error);
          // Fall back to template1 if fetch fails
          selectedTemplate = 'template1';
        }

        // ✅ Enrich transaction with product and service names
        const enrichedTransaction = enrichTransactionWithNames(
          savedTransaction,
          products,
          services,
        );

        // Create final preview data
        const previewData = {
          ...enrichedTransaction,
          company:
            companyToUse ||
            companies.find(
              c =>
                c._id ===
                (enrichedTransaction.company?._id ||
                  enrichedTransaction.company),
            ),
          party:
            partyToUse ||
            parties.find(
              p =>
                p._id ===
                (enrichedTransaction.party?._id || enrichedTransaction.party),
            ),
          bank: bankDetails?.data || bankDetails,
          shippingAddress: shippingAddressData,
          sameAsBilling: values.sameAsBilling,
          paymentMethod: values.paymentMethod,
          selectedTemplate: selectedTemplate,
        };

        setGeneratedInvoice(previewData);
        setInvoicePreviewOpen(true);
      }
    } else {
      await onSubmit(values, true);
    }
  } catch (error) {
    console.error('Error creating transaction:', error);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to create transaction',
    });
  } finally {
    setIsSubmitting(false);
  }
};

/**
 * Fetches the outstanding balance for a selected party/vendor for the given company.
 *
 * @param {string} partyId The ID of the selected Party or Vendor.
 * @param {string} type The transaction type ('sales', 'receipt', 'purchases', 'payment').
 * @param {string} selectedCompanyIdWatch The ID of the currently selected Company.
 * @param {Array<object>} parties Local list of customers/parties.
 * @param {Array<object>} vendors Local list of vendors.
 * @param {function(number|null): void} setPartyBalance State setter for customer balance.
 * @param {function(number|null): void} setVendorBalance State setter for vendor balance.
 * @param {function(number|null): void} setBalance State setter for the overall balance display.
 * @param {function(string): Promise<void>} [fetchShippingAddresses] Optional function to fetch shipping addresses (used only for sales).
 * @param {object} [form] The react-hook-form object.
 * @param {function} [setParties] Optional setter to update local parties list.
 * @param {function} [setVendors] Optional setter to update local vendors list.
 */
export const handlePartyChange = async (
  partyId,
  type,
  selectedCompanyIdWatch,
  parties,
  vendors,
  setPartyBalance,
  setVendorBalance,
  setBalance,
  fetchShippingAddresses,
  form,
  setParties,
  setVendors,
) => {
  if (!partyId) {
    setPartyBalance(null);
    setVendorBalance(null);
    setBalance(null);
    return;
  }

  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found.');
    }

    if (type === 'sales' || type === 'receipt') {
      const selectedParty = parties.find(p => p._id === partyId);
      if (!selectedParty) {
        setPartyBalance(null);
        return;
      }

      const endpoint = `${BASE_URL}/api/parties/${partyId}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const balances = data.balances || {};
      const companyBalance = balances[selectedCompanyIdWatch] ?? 0;
      setPartyBalance(companyBalance);

      if (setParties) {
        setParties(prev => {
          const exists = prev.find(p => p._id === partyId);
          if (!exists) return [...prev, data];
          return prev.map(p => (p._id === partyId ? data : p));
        });
      }

      if (type === 'sales' && fetchShippingAddresses) {
        await fetchShippingAddresses(partyId);
        if (form && form.setValue) {
          form.setValue('shippingAddress', '');
          form.setValue('sameAsBilling', true);
        }
      }
    } else if (type === 'purchases' || type === 'payment') {
      const selectedVendor = vendors.find(v => v._id === partyId);
      if (!selectedVendor) {
        setVendorBalance(null);
        return;
      }

      const endpoint = `${BASE_URL}/api/vendors/${partyId}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const balances = data.balances || {};
      const companyBalance = balances[selectedCompanyIdWatch] ?? 0;
      setVendorBalance(companyBalance);

      if (setVendors) {
        setVendors(prev => {
          const exists = prev.find(v => v._id === partyId);
          if (!exists) return [...prev, data];
          return prev.map(v => (v._id === partyId ? data : v));
        });
      }
    }
  } catch (error) {
    console.error(`Error in handlePartyChange for ${type}:`, error);

    const shouldShowError =
      ((type === 'sales' || type === 'receipt') &&
        parties.find(p => p._id === partyId)) ||
      ((type === 'purchases' || type === 'payment') &&
        vendors.find(v => v._id === partyId));

    if (shouldShowError) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Failed to fetch ${
          type === 'sales' || type === 'receipt' ? 'customer' : 'vendor'
        } balance.`,
      });
    }

    if (type === 'sales' || type === 'receipt') {
      setPartyBalance(null);
    } else if (type === 'purchases' || type === 'payment') {
      setVendorBalance(null);
    }
    setBalance(null);
  }
};

/**
 * Loads the initial outstanding balance when editing a transaction.
 *
 * @param {object} opts
 * @param {object} [opts.form] The react-hook-form object.
 * @param {string} opts.type The transaction type.
 * @param {string} opts.selectedCompanyIdWatch The selected Company ID.
 * @param {Array<object>} opts.parties Local list of customers/parties.
 * @param {Array<object>} opts.vendors Local list of vendors.
 * @param {function(number|null): void} opts.setPartyBalance State setter for customer balance.
 * @param {function(number|null): void} opts.setVendorBalance State setter for vendor balance.
 * @param {function(number|null): void} opts.setBalance State setter for the overall balance display.
 * @param {function} [opts.fetchShippingAddresses] Optional function to fetch shipping addresses.
 * @param {function} [opts.setParties] Optional setter to update local parties list.
 * @param {function} [opts.setVendors] Optional setter to update local vendors list.
 */
export const loadInitialBalances = async ({
  form,
  type,
  selectedCompanyIdWatch,
  parties,
  vendors,
  setPartyBalance,
  setVendorBalance,
  setBalance,
  fetchShippingAddresses,
  setParties,
  setVendors,
}) => {
  const partyId = form?.getValues ? form.getValues('party') : undefined;
  if (!partyId) return;

  await handlePartyChange(
    partyId,
    type,
    selectedCompanyIdWatch,
    parties,
    vendors,
    setPartyBalance,
    setVendorBalance,
    setBalance,
    fetchShippingAddresses,
    form,
    setParties,
    setVendors,
  );
};

/**
 * Saves the selected HSN Code to the product in the backend and updates local state.
 *
 * @param {HSNCode} hsnCode The selected HSNCode object (must contain a 'code' property).
 * @param {number} index The index of the item in the form array.
 * @param {object} form The react-hook-form object.
 * @param {function(Array<object> | function): void} setProducts State setter for the local products list.
 */
export const handleHSNSelect = async (hsnCode, index, form, setProducts) => {
  const productId = form.watch(`items.${index}.product`);
  if (!productId) return;

  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found.');

    const res = await fetch(`${BASE_URL}/api/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ hsn: hsnCode.code }), // Accessing the 'code' property
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to update product HSN');
    }

    // Update local products state
    setProducts(prev =>
      prev.map(p => (p._id === productId ? { ...p, hsn: hsnCode.code } : p)),
    );

    Toast.show({
      type: 'success',
      text1: 'HSN Updated',
      text2: `HSN ${hsnCode.code} saved to product.`,
    });
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Update Failed',
      text2:
        error instanceof Error
          ? error.message
          : 'Failed to save HSN to product.',
    });
  }
};

/**
 * Saves the selected SAC Code to the service in the backend and updates local state.
 *
 * @param {SACCode} sacCode The selected SACCode object (must contain a 'code' property).
 * @param {number} index The index of the item in the form array.
 * @param {object} form The react-hook-form object.
 * @param {function(Array<object> | function): void} setServices State setter for the local services list.
 */
export const handleSACSelect = async (sacCode, index, form, setServices) => {
  const serviceId = form.watch(`items.${index}.service`);
  if (!serviceId) return;

  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found.');

    const res = await fetch(`${BASE_URL}/api/services/${serviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sac: sacCode.code }), // Accessing the 'code' property
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to update service SAC');
    }

    // Update local services state
    setServices(prev =>
      prev.map(s => (s._id === serviceId ? { ...s, sac: sacCode.code } : s)),
    );

    Toast.show({
      type: 'success',
      text1: 'SAC Updated',
      text2: `SAC ${sacCode.code} saved to service.`,
    });
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Update Failed',
      text2:
        error instanceof Error
          ? error.message
          : 'Failed to save SAC to service.',
    });
  }
};
