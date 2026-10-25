import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import prisma from './prisma.js';
import authRoutes from './routes/auth.js';
import branchRoutes from './routes/branches.js';
import categoryRoutes from './routes/categories.js';
import menuRoutes from './routes/menu.js';
import inventoryRoutes from './routes/inventory.js';
import recipeRoutes from './routes/recipes.js';
import orderRoutes from './routes/orders.js';
import shiftRoutes from './routes/shifts.js';
import expenseRoutes from './routes/expenses.js';
import reportRoutes from './routes/reports.js';
import replicaRoutes from './replica/routes.js';
import { initializeReplica, readState } from './replica/state.js';
import { startShopWorker, systemStatus } from './replica/worker.js';
import { authenticateToken } from './middleware/auth.js';

dotenv.config();

const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares: Allow all cross-device network connections (laptop, phone, POS tablet)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-branch-id'],
}));
app.use(express.json({ limit: '8mb' }));
app.use('/api/replica', replicaRoutes);
app.get('/api/system/status', authenticateToken, async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ...systemStatus, localDatabase: 'connected',
    ready: process.env.SITE_MODE !== 'shop' || !!await readState('enrolled'),
    ownership: process.env.SITE_MODE === 'shop' ? 'All shop changes are made on this computer' : 'Hosted system',
    syncIntervalMinutes: 20, backupIntervalMinutes: 60 });
});
app.use('/api', async (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/auth/login') return next();
  if (process.env.SITE_MODE === 'cloud' && process.env.REPLICA_CLOUD_READONLY === 'true') {
    res.status(409).json({ error: 'The shop computer owns changes. Use the shop POS; this domain is a reporting copy.' }); return;
  }
  if (process.env.SITE_MODE === 'shop' && !await readState('enrolled')) {
    res.status(503).json({ error: 'Shop setup is incomplete. Fresh cloud data must be paired before trading.' }); return;
  }
  if (process.env.SITE_MODE === 'shop' && req.method === 'DELETE') {
    res.status(409).json({ error: 'Permanent deletion is disabled on the shop replica. Deactivate or cancel the record to retain its history.' }); return;
  }
  next();
});


// Request logger for development
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error: any) {
    // Log a diagnostic code privately without credentials or query contents.
    console.error('Database health failed:', error?.code || error?.name || 'UnknownError');
    res.status(503).json({ status: 'unavailable', database: 'unavailable' });
    return;
  }
  res.json({
    status: 'healthy',
    database: 'connected',
    system: 'NANI FRYS Hotel & Restaurant POS Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);

// Static files for client
app.use(express.static(clientDistPath));

// Fallback for SPA routing on port 5000
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

async function start() {
  if (['shop', 'cloud'].includes(process.env.SITE_MODE || '')) await initializeReplica();
  app.listen(Number(PORT), process.env.BIND_HOST || '0.0.0.0', () => {
  console.log(`🍟 NANI FRYS POS Server running on port ${PORT}`);
  console.log(`🌍 Multi-device POS (Laptop, Phone, POS screen) synchronized on 0.0.0.0:${PORT}`);
  });
  if (process.env.SITE_MODE === 'shop') await startShopWorker();
}
start().catch(() => { console.error('Startup failed: check private database configuration.'); process.exitCode = 1; });

export default app;
