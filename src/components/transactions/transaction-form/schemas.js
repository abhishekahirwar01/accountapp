import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';

// Define item schema for transactions
export const itemSchema = z
  .object({
    itemType: z.enum(['product', 'service']),
    product: z.string().optional(),
    service: z.string().optional(),
    quantity: z.coerce.number().optional(),
    unitType: z.string().optional(),
    otherUnit: z.string().optional(),
    pricePerUnit: z.coerce.number().optional(),
    description: z.string().optional(),
    amount: z.coerce.number(),
    gstPercentage: z.coerce.number().min(0).max(100).optional(),
    lineTax: z.coerce.number().min(0).optional(),
    lineTotal: z.coerce.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    // Custom validation logic for products
    if (data.itemType === 'product') {
      if (!data.product) {
        ctx.addIssue({
          code: 'invalid_type', // Use string literal directly
          path: ['product'],
          message: 'Select a product',
        });
      }
      if (!data.quantity || data.quantity <= 0) {
        ctx.addIssue({
          code: 'too_small', // Use string literal directly
          path: ['quantity'],
          message: 'Quantity must be > 0',
          minimum: 1,
        });
      }
      if (data.pricePerUnit == null || data.pricePerUnit < 0) {
        ctx.addIssue({
          code: 'too_small', // Use string literal directly
          path: ['pricePerUnit'],
          message: 'Price/Unit must be ≥ 0',
          minimum: 0,
        });
      }
      // Validation for "otherUnit" if unitType is "Other"
      if (data.unitType === 'Other' && !data.otherUnit) {
        ctx.addIssue({
          code: 'invalid_type', // Use string literal directly
          path: ['otherUnit'],
          message: 'Please specify the unit type',
        });
      }
    }
  });

// Define form schema for transactions
export const formSchema = z
  .object({
    type: z.enum([
      'sales',
      'purchases',
      'receipt',
      'payment',
      'journal',
      'proforma',
    ]),
    company: z.string().min(1, 'Please select a company.'),
    party: z.string().optional(),
    expense: z.string().optional(),
    isExpense: z.boolean().optional(),
    date: z.date({ required_error: 'A date is required.' }),
    dueDate: z.date().optional(),
    items: z.array(itemSchema).optional(),
    totalAmount: z.coerce
      .number()
      .positive('Amount must be a positive number.')
      .optional(), // Main amount for non-item transactions
    description: z.string().optional(),
    customPaymentMethod: z.string().optional(),
    referenceNumber: z.string().optional(),
    fromAccount: z.string().optional(), // For Journal Debit
    toAccount: z.string().optional(), // For Journal Credit
    narration: z.string().optional(),
    paymentMethod: z.string().optional(),
    paymentMethodsForReceipt: z.string().optional(),
    taxAmount: z.coerce.number().min(0).optional(),
    invoiceTotal: z.coerce.number().min(0).optional(),
    subTotal: z.coerce.number().min(0).optional(),
    dontSendInvoice: z.boolean().optional(),
    bank: z.string().optional(),
    notes: z.string().optional(),
    // Shipping address fields
    sameAsBilling: z.boolean().optional(),
    shippingAddress: z.string().optional(),
    shippingAddressDetails: z
      .object({
        label: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        contactNumber: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Validation for party based on transaction type
    if (['sales', 'purchases', 'receipt'].includes(data.type)) {
      if (!data.party) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['party'],
          message: 'This field is required for this transaction type.',
        });
      }
    } else if (data.type === 'payment' && !data.isExpense) {
      if (!data.party) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['party'],
          message: 'This field is required for this transaction type.',
        });
      }
    }

    // Validation for expense category in payment transactions
    if (data.type === 'payment' && data.isExpense) {
      if (!data.expense) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expense'],
          message: 'This field is required for this transaction type.',
        });
      }
    }

    // Validation for items in sales or purchases
    if (data.type === 'sales' || data.type === 'purchases') {
      if (!data.items || data.items.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items'],
          message: 'At least one item is required for a sale or purchase.',
        });
      }
    }

    // Validation for journal entries
    if (data.type === 'journal') {
      if (!data.fromAccount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fromAccount'],
          message: 'Debit account is required for journal entry',
        });
      }
      if (!data.toAccount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['toAccount'],
          message: 'Credit account is required for journal entry',
        });
      }
      if (!data.totalAmount || data.totalAmount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['totalAmount'],
          message: 'Amount must be a positive number only',
        });
      }
    }

    // Validation for payment method
    if (['sales', 'purchases', 'receipt', 'payment'].includes(data.type)) {
      if (!data.paymentMethod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['paymentMethod'],
          message: 'Payment method is required for this transaction type.',
        });
      }
    }
  });

// Default constant for product items
export const PRODUCT_DEFAULT = {
  itemType: 'product',
  product: '',
  service: '',
  quantity: 1,
  unitType: 'Piece',
  otherUnit: '',
  pricePerUnit: 0,
  amount: 0,
  gstPercentage: 18,
  lineTax: 0,
  lineTotal: 0,
  description: '',
};

export const useTransactionForm = (
  prefillFrom,
  defaultType = 'sales',
  selectedCompanyId = '',
) => {
  return useForm({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: React.useMemo(() => {
      // If prefillFrom is provided (e.g., from proforma), use its data
      if (prefillFrom) {
        // Combine products and services from proforma, similar to transactionToEdit logic
        let prefillItems = [];

        // 1) New unified shape already on the doc
        if (Array.isArray(prefillFrom.items) && prefillFrom.items.length) {
          prefillItems = prefillFrom.items.map(item => ({
            itemType: item.itemType || (item.product ? 'product' : 'service'),
            product: item.product?._id || item.product || '',
            service: item.service?._id || item.service || '',
            quantity: item.quantity || 1,
            unitType: item.unitType || 'Piece',
            otherUnit: item.otherUnit || '',
            pricePerUnit: item.pricePerUnit || 0,
            amount: item.amount || 0,
            gstPercentage: item.gstPercentage || 18,
            lineTax: item.lineTax || 0,
            lineTotal: item.lineTotal || item.amount || 0,
            description: item.description || '',
          }));
        } else {
          // 2) Legacy/new arrays - combine both products and services
          const prodArr = Array.isArray(prefillFrom.products)
            ? prefillFrom.products.map(p => ({
                itemType: 'product',
                product: p.product?._id || p.product || '',
                service: '',
                quantity: p.quantity || 1,
                unitType: p.unitType || 'Piece',
                otherUnit: p.otherUnit || '',
                pricePerUnit: p.pricePerUnit || 0,
                amount: p.amount || 0,
                gstPercentage: p.gstPercentage || 18,
                lineTax: p.lineTax || 0,
                lineTotal: p.lineTotal || p.amount || 0,
                description: p.description || '',
              }))
            : [];

          const svcArr = Array.isArray(prefillFrom.services)
            ? prefillFrom.services.map(s => ({
                itemType: 'service',
                product: '',
                service: s.service?._id || s.service || '',
                quantity: undefined, // services don't have quantity
                unitType: undefined,
                otherUnit: undefined,
                pricePerUnit: undefined,
                amount: s.amount || 0,
                gstPercentage: s.gstPercentage || 18,
                lineTax: s.lineTax || 0,
                lineTotal: s.lineTotal || s.amount || 0,
                description: s.description || '',
              }))
            : [];

          prefillItems = [...prodArr, ...svcArr];
        }

        const normalizedItems =
          prefillItems.length > 0 ? prefillItems : [PRODUCT_DEFAULT];

        return {
          party:
            typeof prefillFrom.party === 'object' && prefillFrom.party?._id
              ? prefillFrom.party._id
              : typeof prefillFrom.party === 'string'
              ? prefillFrom.party
              : '',
          expense: '',
          isExpense: false,
          description: prefillFrom.description || '',
          totalAmount: prefillFrom.totalAmount || 0,
          items: normalizedItems,
          type: 'sales', // Force to sales when converting from proforma
          referenceNumber: '',
          fromAccount: '',
          toAccount: '',
          narration: '',
          company:
            typeof prefillFrom.company === 'object' && prefillFrom.company?._id
              ? prefillFrom.company._id
              : typeof prefillFrom.company === 'string'
              ? prefillFrom.company
              : selectedCompanyId || '',
          date: new Date(),
          taxAmount: prefillFrom.taxAmount || 0,
          invoiceTotal:
            prefillFrom.invoiceTotal || prefillFrom.totalAmount || 0,
          notes: '',
          sameAsBilling: true,
          shippingAddress:
            prefillFrom.shippingAddress &&
            typeof prefillFrom.shippingAddress === 'object'
              ? String(prefillFrom.shippingAddress._id || '')
              : String(prefillFrom.shippingAddress || ''),
          shippingAddressDetails:
            prefillFrom.shippingAddress &&
            typeof prefillFrom.shippingAddress === 'object'
              ? {
                  label: prefillFrom.shippingAddress.label || '',
                  address: prefillFrom.shippingAddress.address || '',
                  city: prefillFrom.shippingAddress.city || '',
                  state: prefillFrom.shippingAddress.state || '',
                  pincode: prefillFrom.shippingAddress.pincode || '',
                  contactNumber:
                    prefillFrom.shippingAddress.contactNumber || '',
                }
              : {
                  label: '',
                  address: '',
                  city: '',
                  state: '',
                  pincode: '',
                  contactNumber: '',
                },
        };
      }

      // Default values for new transactions
      return {
        party: '',
        expense: '',
        isExpense: false,
        description: '',
        totalAmount: 0,
        items: [PRODUCT_DEFAULT],
        type: defaultType,
        referenceNumber: '',
        fromAccount: '',
        toAccount: '',
        narration: '',
        company: selectedCompanyId || '',
        date: new Date(),
        taxAmount: 0,
        invoiceTotal: 0,
        notes: '',
        sameAsBilling: true,
        shippingAddress: '',
        shippingAddressDetails: {
          label: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          contactNumber: '',
        },
      };
    }, [prefillFrom, defaultType, selectedCompanyId]),
  });
};
