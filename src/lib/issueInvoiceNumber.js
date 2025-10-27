import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

export async function issueInvoiceNumber(companyId, date) {
  if (!companyId) throw new Error('companyId is required');

  let token = null;

  try {
    // Get token from AsyncStorage instead of localStorage
    token = await AsyncStorage.getItem('token');
  } catch (error) {
    console.warn(
      '[issueInvoiceNumber] Could not retrieve token from storage:',
      error,
    );
  }

  const payload = { companyId };
  if (date) {
    // Use the same date formatting logic as Next.js version
    const iso = typeof date === 'string' ? date : new Date(date).toISOString();
    payload.date = iso;
  }

  try {
    const res = await axios.post(
      `${BASE_URL}/api/invoices/issue-number`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        // withCredentials: true, // uncomment if your BE uses cookies + CORS
      },
    );

    console.log('[issueInvoiceNumber] ✅ Response:', res.data);
    const invoiceNumber = res?.data?.invoiceNumber;

    if (!invoiceNumber) {
      console.error('[issueInvoiceNumber] ❌ No invoiceNumber in response');
      throw new Error('Backend did not return invoiceNumber');
    }

    return invoiceNumber;
  } catch (err) {
    console.error('[issueInvoiceNumber] ❌ Error:', err?.response?.data || err);
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      'Failed to issue invoice number';
    throw new Error(msg);
  }
}
