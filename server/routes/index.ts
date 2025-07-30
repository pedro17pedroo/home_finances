import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";

// Import routes
import authRoutes from './authRoutes';
import accountRoutes from './accountRoutes';
import transactionRoutes from './transactionRoutes';
import adminRoutes from './adminRoutes';
import paymentRoutes from './paymentRoutes';

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  }));

  // Register route modules
  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payments', paymentRoutes);

  return createServer(app);
}