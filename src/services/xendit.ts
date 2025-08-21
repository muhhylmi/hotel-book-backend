import axios from 'axios';

const XENDIT_BASE_URL = 'https://api.xendit.co';
const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;

export interface CreateInvoiceParams {
  externalId: string;
  amount: number;
  description: string;
  payerEmail: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
}

export async function createXenditInvoice(params: CreateInvoiceParams) {
  try {
    const response = await axios.post(
      `${XENDIT_BASE_URL}/v2/invoices`,
      {
        external_id: params.externalId,
        amount: params.amount,
        description: params.description,
        payer_email: params.payerEmail,
        success_redirect_url: params.successRedirectUrl,
        failure_redirect_url: params.failureRedirectUrl,
        currency: 'IDR',
        invoice_duration: 86400, // 24 hours
      },
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Xendit API error:', error);
    throw new Error('Failed to create invoice');
  }
}

export function verifyXenditWebhook(token: string): boolean {
  return token === process.env.XENDIT_WEBHOOK_TOKEN;
}