const axios = require('axios');
const crypto = require('crypto');

// Simulate a Paystack webhook for successful payment
async function simulateWebhook() {
  const orderNumber = 'BL250812021'; // The order number from the log
  
  const webhookData = {
    event: 'charge.success',
    data: {
      reference: orderNumber,
      amount: 2502500, // Amount in kobo (25025 naira)
      status: 'success',
      gateway_response: 'Successful',
      paid_at: new Date().toISOString(),
      customer: {
        email: 'ogunbiyi456@gmail.com'
      },
      metadata: {
        orderNumber: orderNumber
      }
    }
  };

  // Create signature (for testing, use a simple signature)
  const secret = process.env.PAYSTACK_SECRET_KEY || 'sk_test_your_secret_key';
  const signature = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(webhookData))
    .digest('hex');

  try {
    console.log('🚀 Sending webhook to simulate successful payment...');
    console.log('📦 Webhook data:', JSON.stringify(webhookData, null, 2));
    
    const response = await axios.post('http://localhost:3007/api/v1/payments/webhook/paystack', webhookData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Paystack-Signature': signature
      }
    });
    
    console.log('✅ Webhook response:', response.status, response.data);
  } catch (error) {
    console.error('❌ Webhook error:', error.response?.status, error.response?.data || error.message);
  }
}

simulateWebhook();