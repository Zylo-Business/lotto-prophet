import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ override: true });
import express, { type Request, type Response } from 'express';
import { dbRun, dbAll, dbGet, initDb, closeDb } from './db/db.js';
import authRoutes from './routes/auth.js';
import drawRoutes from './routes/draws.js';
import adminRoutes from './routes/admin.js';
import universityRoutes from './routes/university.js';
import toolsRoutes from './routes/tools.js';
import communityRoutes from './routes/community.js';
import aiPredictRoutes from './routes/ai-predict.js';
import morgan from 'morgan';
import cors from 'cors';
import { setupSyncCron } from './utils/schedule-sync.js';
import { syncGoogleDrive } from './utils/sync-google-drive.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Serve uploaded files (avatars, post images)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/university', universityRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/ai-predict', aiPredictRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to the Lotto Prophet API!');
});
 
// Start server after DB initialization
initDb().then(async () => {
  // Setup scheduled sync
  setupSyncCron();
  
  // Run an initial sync on startup
  syncGoogleDrive();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await closeDb();
    console.log('Database closed');
    process.exit(0);
  } catch (err) {
    console.error('Error closing database:', err);
    process.exit(1);
  }
});
