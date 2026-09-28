import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/index.js';
import './config/supabase.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware setup
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

// Allow local, LAN private IP addresses (RFC 1918) for cross-device development
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV !== 'production') return true;
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Mount all API routes under /api
app.use('/api', apiRouter);

// Health check endpoint (available at both /health and /api/health)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Eva-Ai Backend API is operational',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    name: 'Eva-Ai Backend Service',
    healthCheck: '/api/health'
  });
});

// Handle 404 for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('[Eva-Ai Error]', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected internal server error occurred',
  });
});

// Start listening if running directly
const server = app.listen(PORT, HOST, () => {
  console.log(`[Eva-Ai] Server is running on http://${HOST}:${PORT}`);
  console.log(`[Eva-Ai] Health check available at: http://localhost:${PORT}/health and http://localhost:${PORT}/api/health`);
});

export default app;
export { server };
