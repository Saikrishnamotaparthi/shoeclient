import rateLimit from 'express-rate-limit';

// Auth routes — keep strict to prevent brute-force
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 30,                     // 30 login/signup attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

// General API — raised substantially for normal app usage
// A typical page loads 5-10 requests; 1000 per 15 min = ~100 page loads before limit
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 1000,                   // 1000 requests per IP (was 100)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Never rate-limit health checks
    return req.path === '/health';
  },
  message: { error: 'Too many requests. Please try again shortly.' },
});

// Admin API — generous for active admin sessions with many GET calls
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 800,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests. Please try again shortly.' },
});
