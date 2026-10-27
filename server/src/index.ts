import 'dotenv/config';
import activityRoutes from './routes/activity.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
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
import prisma from './prisma.js';
import replicaRoutes from './replica/routes.js';
import { initializeReplica, readState } from './replica/state.js';
import { startShopWorker, systemStatus, syncOnce } from './replica/worker.js';
import { authenticateToken, requireOwner } from './middleware/auth.js';

dotenv.config();

const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CORS_ORIGINS || 'https://nanifrys.com,https://www.nanifrys.com').split(',').map(origin => origin.trim());
app.disable('x-powered-by');

// Middlewares: Allow all cross-device network connections (laptop, phone, POS tablet)
app.use(cors({
  origin: (origin, callback) => {
    const localDevelopment = process.env.NODE_ENV !== 'production' && !!origin && /^http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(?::\d+)?$/.test(origin);
    callback(null, !origin || allowedOrigins.includes(origin) || localDevelopment);
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-branch-id', 'x-analytics-token'],
}));
app.use(express.json({limit:'8mb'}));
app.use('/api/replica',replicaRoutes);
app.get('/api/system/status',authenticateToken,async(_req,res)=>{
  try{
    const cloud=process.env.SITE_MODE==='cloud',received=cloud?await readState('receiver-last'):null;
    res.setHeader('Cache-Control','no-store');
    res.json({...systemStatus,...(cloud?{lastSync:received?.acceptedAt||null,syncState:received?'two-way-active':'waiting-for-shop',lastReceivedChanges:received?.recordChanges||0}:{}),
      localDatabase:'connected',ready:process.env.SITE_MODE!=='shop'||!!await readState('enrolled'),syncIntervalMinutes:240,backupIntervalMinutes:60,version:process.env.APP_VERSION||'development'});
  }catch{res.status(503).json({error:'System status unavailable'});}
});
app.post('/api/system/sync',authenticateToken,requireOwner,async(_req,res)=>{
  if(process.env.SITE_MODE!=='shop'){res.status(400).json({error:'Synchronization is initiated by the shop server'});return;}
  try{await syncOnce();res.json(systemStatus);}catch(e:any){res.status(409).json({error:e.message});}
});
app.use('/api',async(req,res,next)=>{
  if(process.env.SITE_MODE==='shop'&&!['GET','HEAD','OPTIONS'].includes(req.method)&&req.path!=='/auth/login'){
    try{if(!await readState('enrolled')){res.status(503).json({error:'Pair and verify the shop database before trading'});return;}}
    catch{res.status(503).json({error:'Shop database unavailable'});return;}
  }next();
});


// Request logger (clean, skips static assets and background health checks)
app.use((req, res, next) => {
  if (req.originalUrl !== '/api/health' && !req.originalUrl.startsWith('/assets')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try{await prisma.$queryRaw`SELECT 1`;}catch{res.status(503).json({status:'unavailable',database:'unavailable'});return;}
  res.json({
    status: 'healthy',
    database: 'connected',
    mode: process.env.SITE_MODE || 'hosted',
    release: process.env.APP_VERSION || 'development',
    system: 'NANI FRYS Hotel & Restaurant POS Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/activity', activityRoutes);
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
  });
});

async function start(){
  if(['shop','cloud'].includes(process.env.SITE_MODE||''))await initializeReplica();
app.listen(Number(PORT), process.env.BIND_HOST || '0.0.0.0', () => {
  console.log(`🍟 NANI FRYS POS Server running on port ${PORT}`);
  console.log(`🌍 Multi-device POS (Laptop, Phone, POS screen) synchronized on 0.0.0.0:${PORT}`);
});
  if(process.env.SITE_MODE==='shop')await startShopWorker();
}
start().catch(()=>{console.error('Startup failed. Check private database configuration.');process.exitCode=1;});

export default app;
