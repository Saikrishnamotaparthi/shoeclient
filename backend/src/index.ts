import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth';
import productsRoutes from './routes/products';
import couponsRoutes from './routes/coupons';
import ordersRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import checkoutRoutes from './routes/checkout';
import webhooksRoutes from './routes/webhooks';
import reviewRoutes from './routes/reviews';
import wishlistRoutes from './routes/wishlist';
import notificationRoutes from './routes/notifications';
import addressRoutes from './routes/addresses';

import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter, adminRateLimiter } from './middleware/rateLimiter';

const app = express();

// Middleware
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://checkout.razorpay.com", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://firebasestorage.googleapis.com"],
      connectSrc: ["'self'", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://api.razorpay.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://api.razorpay.com"],
    },
  },
}));
// Normalize FRONTEND_URL — strip trailing slashes to avoid CORS mismatch
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));

// Webhooks must be parsed as raw before global json middleware
app.use('/api/webhooks', webhooksRoutes);

app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Apply general API rate limiting
app.use('/api', apiRateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRateLimiter, adminRoutes);
app.use('/api', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/checkout', checkoutRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
