const express = require('express');
const cors = require('cors');

const app = express();
const port = 3003;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Bareloft API Test Server is running',
    timestamp: new Date().toISOString(),
    environment: 'test',
    version: '1.0.0'
  });
});

// Welcome endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Bareloft E-commerce API - Test Mode',
    documentation: '/api-docs',
    health: '/health',
    version: '1.0.0'
  });
});

// Mock API v1 endpoints structure
const mockAuth = {
  login: { message: 'Auth login endpoint - mock mode' },
  register: { message: 'Auth register endpoint - mock mode' },
  'verify-otp': { message: 'OTP verification endpoint - mock mode' },
  'refresh-token': { message: 'Token refresh endpoint - mock mode' }
};

const mockProducts = [
  { id: 1, name: 'Nigerian Gele Head Wrap', price: 25000, currency: 'NGN' },
  { id: 2, name: 'Ankara Print Dress', price: 15000, currency: 'NGN' },
  { id: 3, name: 'Traditional Agbada', price: 45000, currency: 'NGN' }
];

// Auth endpoints
app.post('/api/v1/auth/login', (req, res) => {
  res.json({ success: true, data: mockAuth.login });
});

app.post('/api/v1/auth/register', (req, res) => {
  res.json({ success: true, data: mockAuth.register });
});

app.post('/api/v1/auth/verify-otp', (req, res) => {
  res.json({ success: true, data: mockAuth['verify-otp'] });
});

app.post('/api/v1/auth/refresh-token', (req, res) => {
  res.json({ success: true, data: mockAuth['refresh-token'] });
});

// Products endpoints
app.get('/api/v1/products', (req, res) => {
  res.json({ 
    success: true, 
    data: mockProducts,
    meta: { total: mockProducts.length, page: 1, limit: 10 }
  });
});

app.get('/api/v1/products/:id', (req, res) => {
  const product = mockProducts.find(p => p.id === parseInt(req.params.id));
  if (product) {
    res.json({ success: true, data: product });
  } else {
    res.status(404).json({ success: false, error: 'Product not found' });
  }
});

// Cart endpoints
app.get('/api/v1/cart', (req, res) => {
  res.json({ 
    success: true, 
    data: { items: [], total: 0, currency: 'NGN' }
  });
});

app.post('/api/v1/cart/add', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Item added to cart - mock mode',
    data: { itemCount: 1 }
  });
});

// Orders endpoints
app.get('/api/v1/orders', (req, res) => {
  res.json({ 
    success: true, 
    data: [],
    message: 'No orders found - mock mode'
  });
});

app.post('/api/v1/orders', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Order created - mock mode',
    data: { 
      orderId: 'BL' + Date.now(),
      status: 'pending',
      total: 15000,
      currency: 'NGN'
    }
  });
});

// Users endpoints
app.get('/api/v1/users/profile', (req, res) => {
  res.json({ 
    success: true, 
    data: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      phone: '+2348012345678'
    }
  });
});

// Nigerian market specific test endpoint
app.post('/api/v1/auth/validate-phone', (req, res) => {
  const { phone } = req.body;
  const nigerianPhoneRegex = /^(\+234|234|0)([789][01])\d{8}$/;
  const isValid = nigerianPhoneRegex.test(phone);
  
  res.json({
    success: true,
    data: {
      phone,
      isValid,
      formatted: isValid ? phone.replace(/^(\+234|234|0)/, '+234') : null
    }
  });
});

// Currency conversion test endpoint
app.get('/api/v1/utils/currency/:amount', (req, res) => {
  const amount = parseInt(req.params.amount);
  res.json({
    success: true,
    data: {
      kobo: amount,
      naira: amount / 100,
      formatted: `₦${(amount / 100).toLocaleString()}`
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `${req.method} ${req.originalUrl} is not a valid endpoint`
  });
});

// Error handler
app.use((error, req, res, next) => {
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

app.listen(port, () => {
  console.log(`
🚀 Bareloft API Test Server Started!

📊 Server Information:
   Environment: test
   Port: ${port}
   Mode: Mock/Testing

🌐 Test Endpoints:
   Health: http://localhost:${port}/health
   Welcome: http://localhost:${port}
   
🔐 Auth Endpoints:
   POST /api/v1/auth/login
   POST /api/v1/auth/register
   POST /api/v1/auth/verify-otp
   POST /api/v1/auth/validate-phone

🛍️ Products:
   GET /api/v1/products
   GET /api/v1/products/:id

🛒 Cart:
   GET /api/v1/cart
   POST /api/v1/cart/add

📦 Orders:
   GET /api/v1/orders
   POST /api/v1/orders

👤 Users:
   GET /api/v1/users/profile

🇳🇬 Nigerian Features:
   POST /api/v1/auth/validate-phone
   GET /api/v1/utils/currency/:amount

Ready for testing! 🎉
`);
});