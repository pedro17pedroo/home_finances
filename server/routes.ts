import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import Stripe from "stripe";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { 
  insertAccountSchema, 
  insertTransactionSchema, 
  insertSavingsGoalSchema, 
  insertLoanSchema, 
  insertDebtSchema, 
  insertCategorySchema,
  insertTransferSchema,
  insertPaymentMethodSchema,
  insertCampaignSchema,
  insertLandingContentSchema,
  insertLegalContentSchema,
  insertSystemSettingSchema,
  paymentMethods,
  campaigns,
  landingContent,
  legalContent,
  systemSettings,
  auditLogs,
  adminUsers
} from "@shared/schema";
import { 
  isAuthenticated, 
  requireActiveSubscription, 
  requirePlan,
  loginUser, 
  registerUser, 
  logoutUser, 
  getCurrentUser 
} from "./auth";
import { validateAccountLimit, validateTransactionLimit, getUserLimitsStatus } from "./plan-limits";
import { 
  loginAdmin, 
  logoutAdmin, 
  getCurrentAdmin, 
  isAdminAuthenticated, 
  requireAdminRole,
  requireAdminPermission,
  logAdminAction,
  ADMIN_PERMISSIONS
} from "./admin-auth";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
});

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

  // Auth routes
  app.post("/api/auth/login", loginUser);
  app.post("/api/auth/register", registerUser);
  app.post("/api/auth/logout", logoutUser);
  app.get("/api/auth/user", getCurrentUser);
  
  // Admin Auth routes
  app.post("/api/admin/auth/login", loginAdmin);
  app.post("/api/admin/auth/logout", logoutAdmin);
  app.get("/api/admin/auth/me", isAdminAuthenticated, getCurrentAdmin);

  // Admin Dashboard routes
  app.get("/api/admin/dashboard/metrics", isAdminAuthenticated, async (req, res) => {
    try {
      const usersCount = await db.select({ count: sql<number>`count(*)` }).from(users);
      const activeUsersCount = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.subscriptionStatus, 'active'));
      
      const planDistribution = await db.select({
        planType: users.planType,
        count: sql<number>`count(*)`
      }).from(users).groupBy(users.planType);
      
      const distribution = planDistribution.reduce((acc, row) => {
        acc[row.planType] = Number(row.count);
        return acc;
      }, {} as Record<string, number>);

      const metrics = {
        totalUsers: Number(usersCount[0]?.count || 0),
        activeUsers: Number(activeUsersCount[0]?.count || 0),
        monthlyRevenue: 0, // TODO: Calculate from payments
        trialConversionRate: 0, // TODO: Calculate conversion rate
        churnRate: 0, // TODO: Calculate churn rate
        planDistribution: {
          basic: distribution.basic || 0,
          premium: distribution.premium || 0,
          enterprise: distribution.enterprise || 0
        }
      };

      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Users routes
  app.get("/api/admin/users", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.USERS.VIEW), async (req, res) => {
    try {
      const { search, status } = req.query;
      
      let query = db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        subscriptionStatus: users.subscriptionStatus,
        planType: users.planType,
        organizationId: users.organizationId,
        createdAt: users.createdAt
      }).from(users);

      // Add filters if provided
      if (status && status !== 'all') {
        query = query.where(eq(users.subscriptionStatus, status as string));
      }

      const usersList = await query;
      
      // Filter by search term if provided
      let filteredUsers = usersList;
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredUsers = usersList.filter(user => 
          user.email?.toLowerCase().includes(searchTerm) ||
          `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm)
        );
      }

      res.json(filteredUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Plans routes
  app.get("/api/admin/plans", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.PLANS.VIEW), async (req, res) => {
    try {
      const allPlans = await storage.getPlans();
      res.json(allPlans);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/plans", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.PLANS.CREATE), async (req, res) => {
    try {
      const adminUserId = req.session.adminUserId!;
      const planData = req.body;
      
      const newPlan = await storage.createPlan(planData);
      
      // Log the action
      await logAdminAction(adminUserId, 'create_plan', 'plan', newPlan.id, null, newPlan, req);
      
      res.json(newPlan);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/plans/:id", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.PLANS.UPDATE), async (req, res) => {
    try {
      const adminUserId = req.session.adminUserId!;
      const planId = parseInt(req.params.id);
      const planData = req.body;
      
      const oldPlan = await storage.getPlan(planId);
      const updatedPlan = await storage.updatePlan(planId, planData);
      
      // Log the action
      await logAdminAction(adminUserId, 'update_plan', 'plan', planId, oldPlan, updatedPlan, req);
      
      res.json(updatedPlan);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/plans/:id", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.PLANS.DELETE), async (req, res) => {
    try {
      const adminUserId = req.session.adminUserId!;
      const planId = parseInt(req.params.id);
      
      const oldPlan = await storage.getPlan(planId);
      await storage.deletePlan(planId);
      
      // Log the action
      await logAdminAction(adminUserId, 'delete_plan', 'plan', planId, oldPlan, null, req);
      
      res.json({ message: 'Plan deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  app.get("/api/auth/me", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      // Always get fresh user data from database to ensure latest plan
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Always update session with current database data
      req.session.user = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        subscriptionStatus: user.subscriptionStatus || 'trialing',
        planType: user.planType || 'basic',
        organizationId: user.organizationId,
        role: user.role || 'member'
      };

      await req.session.save();
      
      res.json(req.session.user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Profile management routes
  app.put("/api/auth/profile", isAuthenticated, async (req, res) => {
    try {
      const { firstName, lastName, email, phone } = req.body;
      const userId = req.session.userId;
      
      const updatedUser = await storage.updateUser(userId, {
        firstName,
        lastName,
        email,
        phone
      });
      
      res.json({ 
        message: "Perfil atualizado com sucesso",
        user: updatedUser 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Erro ao atualizar perfil: " + error.message });
    }
  });
  
  app.put("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.userId;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      const { verifyPassword, hashPassword } = await import("./auth");
      const isValidPassword = await verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashedPassword });
      
      res.json({ message: "Senha alterada com sucesso" });
    } catch (error: any) {
      res.status(500).json({ message: "Erro ao alterar senha: " + error.message });
    }
  });

  // Stripe routes
  app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.post('/api/create-subscription', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        return res.json({
          subscriptionId: subscription.id,
          clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        });
      }

      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          phone: user.phone || undefined,
        });
        stripeCustomerId = customer.id;
        await storage.updateUserStripeInfo(userId, stripeCustomerId);
      }

      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: "price_1234567890" }], // Replace with your actual price ID
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(userId, stripeCustomerId, subscription.id);

      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Subscription Management Routes
  app.get("/api/subscription/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let subscriptionDetails = null;
      if (user.stripeSubscriptionId) {
        subscriptionDetails = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      }

      res.json({
        subscriptionStatus: user.subscriptionStatus,
        planType: user.planType,
        trialEndsAt: user.trialEndsAt,
        subscriptionDetails
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/subscription/cancel", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      }

      await storage.cancelUserSubscription(userId);
      res.json({ message: "Subscription cancelled successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/subscription/change-plan", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const { planType } = req.body;
      
      const user = await storage.getUser(userId);
      const plans = await storage.getPlans();
      const targetPlan = plans.find(p => p.type === planType);
      
      if (!user || !targetPlan) {
        return res.status(404).json({ message: "User or plan not found" });
      }

      if (user.stripeSubscriptionId && targetPlan.stripePriceId) {
        // Update Stripe subscription
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          items: [{
            id: subscription.items.data[0].id,
            price: targetPlan.stripePriceId,
          }],
          proration_behavior: 'create_prorations',
        });
      }

      await storage.updateUserSubscription(userId, user.subscriptionStatus || 'active', planType);
      
      // Update session with new plan
      if (req.session.user) {
        req.session.user.planType = planType;
        await req.session.save();
      }
      
      res.json({ 
        message: "Plan changed successfully",
        user: req.session.user 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/subscription/billing-portal", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ message: "User or customer not found" });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.protocol}://${req.get('host')}/subscription`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe Webhooks
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      // Handle the event
      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object;
          
          // Find user by Stripe subscription ID
          const user = await db.select().from(users).where(
            eq(users.stripeSubscriptionId, subscription.id)
          );
          
          if (user[0]) {
            await storage.updateUserSubscription(
              user[0].id,
              subscription.status,
              user[0].planType || 'basic'
            );
          }
          break;
        
        case 'invoice.payment_succeeded':
          const invoice = event.data.object;
          if (invoice.subscription) {
            // Update subscription status to active
            const user = await db.select().from(users).where(
              eq(users.stripeSubscriptionId, invoice.subscription)
            );
            
            if (user[0]) {
              await storage.updateUserSubscription(
                user[0].id,
                'active',
                user[0].planType || 'basic'
              );
            }
          }
          break;
          
        case 'invoice.payment_failed':
          const failedInvoice = event.data.object;
          if (failedInvoice.subscription) {
            // Update subscription status to past_due
            const user = await db.select().from(users).where(
              eq(users.stripeSubscriptionId, failedInvoice.subscription)
            );
            
            if (user[0]) {
              await storage.updateUserSubscription(
                user[0].id,
                'past_due',
                user[0].planType || 'basic'
              );
            }
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // Plans
  app.get("/api/plans", async (req, res) => {
    try {
      const plans = await storage.getPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Erro ao buscar planos" });
    }
  });

  // Get user limits status
  app.get("/api/user/limits", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const user = req.session!.user;
      
      if (!user || !user.planType) {
        return res.status(400).json({ message: 'Plano do usuário não encontrado' });
      }

      const limitsStatus = await getUserLimitsStatus(userId, user.planType);
      res.json(limitsStatus);
    } catch (error) {
      console.error("Error fetching user limits:", error);
      res.status(500).json({ message: "Erro ao buscar limites do usuário" });
    }
  });

  // Accounts
  app.get("/api/accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const accounts = await storage.getAccounts(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Erro ao buscar contas" });
    }
  });

  app.get("/api/accounts/savings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const accounts = await storage.getAccounts(userId);
      const savingsAccounts = accounts.filter(account => account.type === 'poupanca');
      res.json(savingsAccounts);
    } catch (error) {
      console.error("Error fetching savings accounts:", error);
      res.status(500).json({ message: "Erro ao buscar contas poupança" });
    }
  });

  app.post("/api/accounts", isAuthenticated, validateAccountLimit, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const validatedData = insertAccountSchema.parse({
        ...req.body,
        userId
      });
      const account = await storage.createAccount(validatedData);
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      res.status(500).json({ message: "Erro ao criar conta" });
    }
  });

  app.put("/api/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session!.userId;
      const validatedData = insertAccountSchema.partial().parse(req.body);
      const account = await storage.updateAccount(id, validatedData, userId);
      res.json(account);
    } catch (error) {
      console.error("Error updating account:", error);
      res.status(500).json({ message: "Erro ao atualizar conta" });
    }
  });

  app.delete("/api/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session!.userId;
      await storage.deleteAccount(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Erro ao deletar conta" });
    }
  });

  // Transactions
  app.get("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const transactions = await storage.getTransactions(userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Erro ao buscar transações" });
    }
  });

  app.post("/api/transactions", isAuthenticated, validateTransactionLimit, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const validatedData = insertTransactionSchema.parse({
        ...req.body,
        userId,
        date: new Date(req.body.date), // Converter string para Date
      });
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Erro ao criar transação" });
    }
  });

  app.put("/api/transactions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session!.userId;
      const validatedData = insertTransactionSchema.partial().parse(req.body);
      const transaction = await storage.updateTransaction(id, validatedData, userId);
      res.json(transaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Erro ao atualizar transação" });
    }
  });

  app.delete("/api/transactions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session!.userId;
      await storage.deleteTransaction(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Erro ao deletar transação" });
    }
  });

  // Transfers
  app.get("/api/transfers", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const transfers = await storage.getTransfers(userId);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ message: "Erro ao buscar transferências" });
    }
  });

  app.post("/api/transfers", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const validatedData = insertTransferSchema.parse({
        ...req.body,
        userId,
        date: new Date(req.body.date),
      });
      const transfer = await storage.createTransfer(validatedData);
      res.status(201).json(transfer);
    } catch (error) {
      console.error("Error creating transfer:", error);
      res.status(500).json({ message: "Erro ao criar transferência" });
    }
  });

  // Savings Goals
  app.get("/api/savings-goals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const goals = await storage.getSavingsGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching savings goals:", error);
      res.status(500).json({ message: "Erro ao buscar metas de poupança" });
    }
  });

  app.post("/api/savings-goals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const data = { ...req.body, userId };
      
      // Convert targetDate string to Date object if provided
      if (data.targetDate && typeof data.targetDate === 'string') {
        data.targetDate = new Date(data.targetDate);
      }
      const validatedData = insertSavingsGoalSchema.parse(data);
      const goal = await storage.createSavingsGoal(validatedData);
      res.status(201).json(goal);
    } catch (error) {
      console.error("Error creating savings goal:", error);
      res.status(500).json({ message: "Erro ao criar meta de poupança" });
    }
  });

  app.put("/api/savings-goals/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session!.userId;
      const data = { ...req.body };
      
      // Convert targetDate string to Date object if provided
      if (data.targetDate && typeof data.targetDate === 'string') {
        data.targetDate = new Date(data.targetDate);
      }
      
      const validatedData = insertSavingsGoalSchema.partial().parse(data);
      const goal = await storage.updateSavingsGoal(id, validatedData, userId);
      res.json(goal);
    } catch (error) {
      console.error("Error updating savings goal:", error);
      res.status(500).json({ message: "Erro ao atualizar meta de poupança" });
    }
  });

  app.delete("/api/savings-goals/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session!.userId;
      await storage.deleteSavingsGoal(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting savings goal:", error);
      res.status(500).json({ message: "Erro ao deletar meta de poupança" });
    }
  });

  // Loans - Premium feature
  app.get("/api/loans", isAuthenticated, requirePlan('premium'), async (req, res) => {
    try {
      const userId = req.session!.userId;
      const loans = await storage.getLoans(userId);
      res.json(loans);
    } catch (error) {
      console.error("Error fetching loans:", error);
      res.status(500).json({ message: "Erro ao buscar empréstimos" });
    }
  });

  app.post("/api/loans", isAuthenticated, requirePlan('premium'), async (req, res) => {
    try {
      const userId = req.session!.userId;
      const data = { ...req.body, userId };
      
      // Convert dueDate string to Date object if provided
      if (data.dueDate && typeof data.dueDate === 'string') {
        data.dueDate = new Date(data.dueDate);
      }
      
      const validatedData = insertLoanSchema.parse(data);
      const loan = await storage.createLoan(validatedData);
      
      // Create corresponding expense transaction for the loan amount
      const transactionData = {
        userId,
        accountId: validatedData.accountId,
        amount: validatedData.amount,
        description: `Empréstimo dado a ${validatedData.borrower}`,
        category: 'Empréstimos',
        type: 'despesa' as const,
        date: new Date(),
      };
      await storage.createTransaction(transactionData);
      
      res.status(201).json(loan);
    } catch (error) {
      console.error("Error creating loan:", error);
      res.status(500).json({ message: "Erro ao criar empréstimo" });
    }
  });

  app.put("/api/loans/:id", isAuthenticated, requirePlan('premium'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session!.userId;
      const data = { ...req.body };
      
      // Convert dueDate string to Date object if provided
      if (data.dueDate && typeof data.dueDate === 'string') {
        data.dueDate = new Date(data.dueDate);
      }
      
      // Get the original loan to check status change
      const originalLoan = await storage.getLoan(id, userId);
      if (!originalLoan) {
        return res.status(404).json({ message: "Empréstimo não encontrado" });
      }
      
      const validatedData = insertLoanSchema.partial().parse(data);
      const loan = await storage.updateLoan(id, validatedData, userId);
      
      // If status changed from pendente to pago, create income transaction
      if (originalLoan.status === 'pendente' && validatedData.status === 'pago') {
        const amount = originalLoan.amount;
        const interestRate = originalLoan.interestRate ? parseFloat(originalLoan.interestRate) : 0;
        const totalAmount = parseFloat(amount) * (1 + interestRate / 100);
        
        // Use provided accountId from request or default to original account
        const accountId = req.body.accountId || originalLoan.accountId;
        
        const transactionData = {
          userId,
          accountId: parseInt(accountId),
          amount: totalAmount.toFixed(2),
          description: `Recebimento de empréstimo de ${originalLoan.borrower}${interestRate > 0 ? ` (com ${interestRate}% juros)` : ''}`,
          category: 'Empréstimos',
          type: 'receita' as const,
          date: new Date(),
        };
        await storage.createTransaction(transactionData);
      }
      
      res.json(loan);
    } catch (error) {
      console.error("Error updating loan:", error);
      res.status(500).json({ message: "Erro ao atualizar empréstimo" });
    }
  });

  app.delete("/api/loans/:id", isAuthenticated, requirePlan('premium'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session!.userId;
      await storage.deleteLoan(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting loan:", error);
      res.status(500).json({ message: "Erro ao deletar empréstimo" });
    }
  });

  // Debts - Premium feature
  app.get("/api/debts", isAuthenticated, requirePlan('premium'), async (req, res) => {
    try {
      const userId = req.session!.userId;
      const debts = await storage.getDebts(userId);
      res.json(debts);
    } catch (error) {
      console.error("Error fetching debts:", error);
      res.status(500).json({ message: "Erro ao buscar dívidas" });
    }
  });

  app.post("/api/debts", isAuthenticated, requirePlan('premium'), async (req, res) => {
    try {
      const userId = req.session!.userId;
      const data = { ...req.body, userId };
      
      // Convert dueDate string to Date object if provided
      if (data.dueDate && typeof data.dueDate === 'string') {
        data.dueDate = new Date(data.dueDate);
      }
      
      const validatedData = insertDebtSchema.parse(data);
      const debt = await storage.createDebt(validatedData);
      
      // Create corresponding income transaction for the debt amount
      const transactionData = {
        userId,
        accountId: validatedData.accountId,
        amount: validatedData.amount,
        description: `Dívida recebida de ${validatedData.creditor}`,
        category: 'Dívidas',
        type: 'receita' as const,
        date: new Date(),
      };
      await storage.createTransaction(transactionData);
      
      res.status(201).json(debt);
    } catch (error) {
      console.error("Error creating debt:", error);
      res.status(500).json({ message: "Erro ao criar dívida" });
    }
  });

  app.put("/api/debts/:id", isAuthenticated, requirePlan('premium'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session!.userId;
      const data = { ...req.body };
      
      // Convert dueDate string to Date object if provided
      if (data.dueDate && typeof data.dueDate === 'string') {
        data.dueDate = new Date(data.dueDate);
      }
      
      // Get the original debt to check status change
      const originalDebt = await storage.getDebt(id, userId);
      if (!originalDebt) {
        return res.status(404).json({ message: "Dívida não encontrada" });
      }
      
      const validatedData = insertDebtSchema.partial().parse(data);
      const debt = await storage.updateDebt(id, validatedData, userId);
      
      // If status changed from pendente to pago, create expense transaction
      if (originalDebt.status === 'pendente' && validatedData.status === 'pago') {
        const amount = originalDebt.amount;
        const interestRate = originalDebt.interestRate ? parseFloat(originalDebt.interestRate) : 0;
        const totalAmount = parseFloat(amount) * (1 + interestRate / 100);
        
        // Use provided accountId from request or default to original account
        const accountId = req.body.accountId || originalDebt.accountId;
        
        const transactionData = {
          userId,
          accountId: parseInt(accountId),
          amount: totalAmount.toFixed(2),
          description: `Pagamento de dívida para ${originalDebt.creditor}${interestRate > 0 ? ` (com ${interestRate}% juros)` : ''}`,
          category: 'Dívidas',
          type: 'despesa' as const,
          date: new Date(),
        };
        await storage.createTransaction(transactionData);
      }
      
      res.json(debt);
    } catch (error) {
      console.error("Error updating debt:", error);
      res.status(500).json({ message: "Erro ao atualizar dívida" });
    }
  });

  app.delete("/api/debts/:id", isAuthenticated, requirePlan('premium'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session!.userId;
      await storage.deleteDebt(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting debt:", error);
      res.status(500).json({ message: "Erro ao deletar dívida" });
    }
  });

  // Team management routes (Enterprise only)
  app.get("/api/team/members", isAuthenticated, requirePlan("enterprise"), async (req, res) => {
    try {
      const user = req.session!.user;
      if (!user.organizationId) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      const members = await storage.getOrganizationMembers(user.organizationId);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/team/invitations", isAuthenticated, requirePlan("enterprise"), async (req, res) => {
    try {
      const user = req.session!.user;
      if (!user.organizationId) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      const invitations = await storage.getTeamInvitations(user.organizationId);
      res.json(invitations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/team/invite", isAuthenticated, requirePlan("enterprise"), async (req, res) => {
    try {
      const { email, role } = req.body;
      const user = req.session!.user;
      
      if (!user.organizationId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check if user is already a member
      const existingUser = await storage.getUserByEmailOrPhone(email);
      if (existingUser && existingUser.organizationId === user.organizationId) {
        return res.status(400).json({ message: "User is already a member of this organization" });
      }

      // Generate invitation token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const invitation = await storage.createTeamInvitation({
        organizationId: user.organizationId,
        email,
        role: role || 'member',
        invitedBy: user.id,
        token,
        expiresAt
      });

      // TODO: Send email invitation (for now just return the token)
      res.json({ 
        ...invitation,
        inviteLink: `${req.protocol}://${req.get('host')}/invite/${token}`
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/team/members/:userId", isAuthenticated, requirePlan("enterprise"), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = req.session!.user;
      
      if (!user.organizationId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Can't remove yourself or the owner
      if (userId === user.id) {
        return res.status(400).json({ message: "Cannot remove yourself" });
      }

      await storage.removeUserFromOrganization(userId, user.organizationId);
      res.json({ message: "User removed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/team/invitations/:invitationId", isAuthenticated, requirePlan("enterprise"), async (req, res) => {
    try {
      const invitationId = parseInt(req.params.invitationId);
      await storage.deleteTeamInvitation(invitationId);
      res.json({ message: "Invitation cancelled successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/team/accept-invitation/:token", isAuthenticated, async (req, res) => {
    try {
      const { token } = req.params;
      const userId = req.session!.userId;
      
      await storage.acceptTeamInvitation(token, userId);
      res.json({ message: "Invitation accepted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard
  app.get("/api/dashboard/financial-summary", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const summary = await storage.getFinancialSummary(userId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ message: "Erro ao buscar resumo financeiro" });
    }
  });

  app.get("/api/dashboard/monthly-transactions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const data = await storage.getMonthlyTransactionsSummary(userId);
      res.json(data);
    } catch (error) {
      console.error("Error fetching monthly transactions:", error);
      res.status(500).json({ message: "Erro ao buscar transações mensais" });
    }
  });

  app.get("/api/dashboard/expenses-by-category", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const data = await storage.getExpensesByCategory(userId);
      res.json(data);
    } catch (error) {
      console.error("Error fetching expenses by category:", error);
      res.status(500).json({ message: "Erro ao buscar despesas por categoria" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Erro ao buscar categorias" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Erro ao criar categoria" });
    }
  });

  // Admin dashboard routes
  app.get("/api/admin/dashboard/stats", isAdminAuthenticated, async (req, res) => {
    try {
      // Get basic stats
      const activeUsers = await db.execute(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE subscription_status = 'active'
      `);
      
      const activeSubscriptions = await db.execute(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE subscription_status IN ('active', 'trialing')
      `);
      
      const monthlyRevenue = await db.execute(`
        SELECT SUM(CASE 
          WHEN plan_type = 'basic' THEN 14500
          WHEN plan_type = 'premium' THEN 29500
          WHEN plan_type = 'enterprise' THEN 74500
          ELSE 0
        END) as total
        FROM users 
        WHERE subscription_status = 'active'
      `);
      
      const stats = {
        activeUsers: Number(activeUsers[0]?.count || 0),
        activeSubscriptions: Number(activeSubscriptions[0]?.count || 0),
        monthlyRevenue: Number(monthlyRevenue[0]?.total || 0)
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // Phase 3 - Payment Methods Admin Routes
  app.get("/api/admin/payment-methods", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.PAYMENTS.VIEW), async (req, res) => {
    try {
      const methods = await db.select().from(paymentMethods).orderBy(paymentMethods.id);
      res.json(methods);
    } catch (error: any) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/payment-methods", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.PAYMENTS.MANAGE), async (req, res) => {
    try {
      const validatedData = insertPaymentMethodSchema.parse(req.body);
      const [method] = await db.insert(paymentMethods).values(validatedData).returning();
      
      await logAdminAction(req, 'create', 'payment_method', method.id, validatedData);
      res.status(201).json(method);
    } catch (error: any) {
      console.error("Error creating payment method:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/payment-methods/:id", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.PAYMENTS.MANAGE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPaymentMethodSchema.partial().parse(req.body);
      
      const [updated] = await db.update(paymentMethods)
        .set(validatedData)
        .where(eq(paymentMethods.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      
      await logAdminAction(req, 'update', 'payment_method', id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating payment method:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/payment-methods/:id", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.PAYMENTS.MANAGE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const [deleted] = await db.delete(paymentMethods)
        .where(eq(paymentMethods.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      
      await logAdminAction(req, 'delete', 'payment_method', id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting payment method:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Phase 3 - Campaigns Admin Routes
  app.get("/api/admin/campaigns", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.CAMPAIGNS.VIEW), async (req, res) => {
    try {
      const { status } = req.query;
      
      let query = db.select().from(campaigns);
      
      if (status) {
        query = query.where(eq(campaigns.status, status as string));
      }
      
      const allCampaigns = await query.orderBy(campaigns.createdAt);
      res.json(allCampaigns);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/campaigns", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.CAMPAIGNS.MANAGE), async (req, res) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      const [campaign] = await db.insert(campaigns).values(validatedData).returning();
      
      await logAdminAction(req, 'create', 'campaign', campaign.id, validatedData);
      res.status(201).json(campaign);
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/campaigns/:id", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.CAMPAIGNS.MANAGE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCampaignSchema.partial().parse(req.body);
      
      const [updated] = await db.update(campaigns)
        .set(validatedData)
        .where(eq(campaigns.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      await logAdminAction(req, 'update', 'campaign', id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/campaigns/:id", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.CAMPAIGNS.MANAGE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const [deleted] = await db.delete(campaigns)
        .where(eq(campaigns.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      await logAdminAction(req, 'delete', 'campaign', id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Phase 4 - Landing Content Admin Routes
  app.get("/api/admin/landing-content", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.CONTENT.MANAGE_LANDING), async (req, res) => {
    try {
      const content = await db.select().from(landingContent).orderBy(landingContent.section);
      res.json(content);
    } catch (error: any) {
      console.error("Error fetching landing content:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/landing-content", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.CONTENT.MANAGE_LANDING), async (req, res) => {
    try {
      const validatedData = insertLandingContentSchema.parse(req.body);
      const [content] = await db.insert(landingContent).values(validatedData).returning();
      
      await logAdminAction(req, 'create', 'landing_content', content.id, validatedData);
      res.status(201).json(content);
    } catch (error: any) {
      console.error("Error creating landing content:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/landing-content/:id", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.CONTENT.MANAGE_LANDING), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertLandingContentSchema.partial().parse(req.body);
      
      const [updated] = await db.update(landingContent)
        .set(validatedData)
        .where(eq(landingContent.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Landing content not found" });
      }
      
      await logAdminAction(req, 'update', 'landing_content', id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating landing content:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/landing-content/:id", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.CONTENT.MANAGE_LANDING), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const [deleted] = await db.delete(landingContent)
        .where(eq(landingContent.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "Landing content not found" });
      }
      
      await logAdminAction(req, 'delete', 'landing_content', id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting landing content:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Phase 4 - Legal Content Admin Routes
  app.get("/api/admin/legal-content", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.CONTENT.MANAGE_LEGAL), async (req, res) => {
    try {
      const content = await db.select().from(legalContent).orderBy(legalContent.type, legalContent.createdAt);
      res.json(content);
    } catch (error: any) {
      console.error("Error fetching legal content:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/legal-content", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.CONTENT.MANAGE_LEGAL), async (req, res) => {
    try {
      const validatedData = insertLegalContentSchema.parse(req.body);
      const [content] = await db.insert(legalContent).values(validatedData).returning();
      
      await logAdminAction(req, 'create', 'legal_content', content.id, validatedData);
      res.status(201).json(content);
    } catch (error: any) {
      console.error("Error creating legal content:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/legal-content/:id", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.CONTENT.MANAGE_LEGAL), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertLegalContentSchema.partial().parse(req.body);
      
      const [updated] = await db.update(legalContent)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(legalContent.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Legal content not found" });
      }
      
      await logAdminAction(req, 'update', 'legal_content', id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating legal content:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/legal-content/:id", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.CONTENT.MANAGE_LEGAL), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const [deleted] = await db.delete(legalContent)
        .where(eq(legalContent.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "Legal content not found" });
      }
      
      await logAdminAction(req, 'delete', 'legal_content', id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting legal content:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Phase 4 - System Settings Admin Routes
  app.get("/api/admin/system-settings", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.VIEW_SETTINGS), async (req, res) => {
    try {
      const settings = await db.select().from(systemSettings).orderBy(systemSettings.category, systemSettings.key);
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/system-settings", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.MANAGE_SETTINGS), async (req, res) => {
    try {
      const validatedData = insertSystemSettingSchema.parse(req.body);
      const [setting] = await db.insert(systemSettings).values(validatedData).returning();
      
      await logAdminAction(req, 'create', 'system_setting', setting.id, validatedData);
      res.status(201).json(setting);
    } catch (error: any) {
      console.error("Error creating system setting:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/system-settings/:id", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.MANAGE_SETTINGS), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSystemSettingSchema.partial().parse(req.body);
      
      const [updated] = await db.update(systemSettings)
        .set(validatedData)
        .where(eq(systemSettings.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "System setting not found" });
      }
      
      await logAdminAction(req, 'update', 'system_setting', id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating system setting:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/system-settings/:id", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.MANAGE_SETTINGS), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const [deleted] = await db.delete(systemSettings)
        .where(eq(systemSettings.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "System setting not found" });
      }
      
      await logAdminAction(req, 'delete', 'system_setting', id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting system setting:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Phase 5 - Analytics API Routes
  app.get("/api/admin/analytics", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS), async (req, res) => {
    try {
      const { range = '30d', metric = 'revenue' } = req.query;
      
      // Mock analytics data - In real implementation, this would come from actual metrics
      const mockData = {
        totalRevenue: 125000,
        revenueGrowth: 15.5,
        conversionRate: 8.2,
        conversionGrowth: 2.1,
        avgLTV: 85000,
        ltvGrowth: 12.3,
        churnRate: 3.2,
        churnChange: -0.8,
        revenueChart: [
          { month: 'Jan', revenue: 95000 },
          { month: 'Feb', revenue: 105000 },
          { month: 'Mar', revenue: 115000 },
          { month: 'Apr', revenue: 125000 },
        ],
        revenueByPlan: [
          { name: 'Basic', value: 45.2 },
          { name: 'Premium', value: 38.7 },
          { name: 'Enterprise', value: 16.1 },
        ],
        mrrTrends: [
          { month: 'Jan', mrr: 32000 },
          { month: 'Feb', mrr: 35000 },
          { month: 'Mar', mrr: 38000 },
          { month: 'Apr', mrr: 42000 },
        ],
        userGrowth: [
          { month: 'Jan', totalUsers: 245, activeUsers: 198, trialUsers: 47 },
          { month: 'Feb', totalUsers: 298, activeUsers: 245, trialUsers: 53 },
          { month: 'Mar', totalUsers: 356, activeUsers: 289, trialUsers: 67 },
          { month: 'Apr', totalUsers: 412, activeUsers: 335, trialUsers: 77 },
        ]
      };
      
      res.json(mockData);
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/analytics/conversions", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS), async (req, res) => {
    try {
      const mockConversions = {
        funnel: [
          { stage: 'Visitantes', count: 5420, percentage: 100 },
          { stage: 'Registro', count: 1084, percentage: 20 },
          { stage: 'Trial Ativo', count: 865, percentage: 16 },
          { stage: 'Conversão Paga', count: 346, percentage: 6.4 },
          { stage: 'Retenção 30d', count: 298, percentage: 5.5 },
        ]
      };
      
      res.json(mockConversions);
    } catch (error: any) {
      console.error("Error fetching conversions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/analytics/churn", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS), async (req, res) => {
    try {
      const mockChurn = {
        monthly: [
          { month: 'Jan', churnRate: 4.2 },
          { month: 'Feb', churnRate: 3.8 },
          { month: 'Mar', churnRate: 3.1 },
          { month: 'Apr', churnRate: 3.2 },
        ],
        reasons: [
          { reason: 'Preço muito alto', percentage: 35.2 },
          { reason: 'Funcionalidades insuficientes', percentage: 28.7 },
          { reason: 'Interface confusa', percentage: 18.3 },
          { reason: 'Problemas técnicos', percentage: 12.8 },
          { reason: 'Outros', percentage: 5.0 },
        ]
      };
      
      res.json(mockChurn);
    } catch (error: any) {
      console.error("Error fetching churn data:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/analytics/cohort", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS), async (req, res) => {
    try {
      const mockCohort = {
        cohorts: [
          { month: '2024-01', retention: [100, 85, 75, 68, 62, 58, 55] },
          { month: '2024-02', retention: [100, 88, 78, 71, 65, 61, 0] },
          { month: '2024-03', retention: [100, 90, 82, 74, 68, 0, 0] },
          { month: '2024-04', retention: [100, 92, 84, 77, 0, 0, 0] },
        ]
      };
      
      res.json(mockCohort);
    } catch (error: any) {
      console.error("Error fetching cohort data:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/analytics/export", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS), async (req, res) => {
    try {
      const { format = 'csv' } = req.query;
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics-report.csv');
        res.send('Date,Revenue,Users,Conversions\n2024-01,95000,245,47\n2024-02,105000,298,53\n');
      } else {
        res.status(400).json({ message: 'Unsupported format' });
      }
    } catch (error: any) {
      console.error("Error exporting analytics:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Phase 5 - Audit Logs API Routes
  app.get("/api/admin/audit-logs", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS), async (req, res) => {
    try {
      const { search = '', action = '', entityType = '', adminUser = '', page = '1', limit = '50' } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      let query = db.select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        oldData: auditLogs.oldData,
        newData: auditLogs.newData,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        adminUser: {
          id: adminUsers.id,
          firstName: adminUsers.firstName,
          lastName: adminUsers.lastName,
          email: adminUsers.email
        }
      })
      .from(auditLogs)
      .leftJoin(adminUsers, eq(auditLogs.adminUserId, adminUsers.id))
      .orderBy(auditLogs.createdAt);

      // Apply filters
      if (search) {
        query = query.where(
          sql`${auditLogs.ipAddress} ILIKE ${'%' + search + '%'} OR ${auditLogs.userAgent} ILIKE ${'%' + search + '%'}`
        );
      }
      if (action) {
        query = query.where(eq(auditLogs.action, action));
      }
      if (entityType) {
        query = query.where(eq(auditLogs.entityType, entityType));
      }
      if (adminUser) {
        query = query.where(eq(auditLogs.adminUserId, parseInt(adminUser as string)));
      }

      const logs = await query.limit(parseInt(limit as string)).offset(offset);
      const totalCount = await db.select({ count: sql`count(*)` }).from(auditLogs);
      const totalPages = Math.ceil(Number(totalCount[0]?.count || 0) / parseInt(limit as string));

      res.json({
        logs,
        totalCount: Number(totalCount[0]?.count || 0),
        totalPages,
        currentPage: parseInt(page as string)
      });
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/audit-logs/filters", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS), async (req, res) => {
    try {
      const actions = await db.selectDistinct({ action: auditLogs.action }).from(auditLogs);
      const entityTypes = await db.selectDistinct({ entityType: auditLogs.entityType }).from(auditLogs);
      const adminUsersData = await db.select({
        id: adminUsers.id,
        firstName: adminUsers.firstName,
        lastName: adminUsers.lastName,
        email: adminUsers.email
      }).from(adminUsers);

      res.json({
        actions: actions.map(a => a.action),
        entityTypes: entityTypes.map(e => e.entityType),
        adminUsers: adminUsersData
      });
    } catch (error: any) {
      console.error("Error fetching filter options:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/audit-logs/export", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS), async (req, res) => {
    try {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      res.send('Date,Action,Entity,Admin,IP\nSample audit log export data\n');
    } catch (error: any) {
      console.error("Error exporting audit logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Phase 5 - Security Logs API Routes  
  app.get("/api/admin/security-logs", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS), async (req, res) => {
    try {
      const { search = '', severity = '', eventType = '', page = '1', limit = '50' } = req.query;
      
      // Mock security events data
      const mockEvents = [
        {
          id: 1,
          severity: 'high',
          eventType: 'failed_login',
          description: 'Múltiplas tentativas de login falhadas',
          ipAddress: '192.168.1.100',
          location: 'Luanda, Angola',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          timestamp: new Date(),
          details: 'Usuário tentou fazer login 15 vezes em 5 minutos'
        },
        {
          id: 2,
          severity: 'critical',
          eventType: 'brute_force',
          description: 'Ataque de força bruta detectado',
          ipAddress: '10.0.0.1',
          location: 'Benguela, Angola',
          userAgent: 'Python-requests/2.28.1',
          timestamp: new Date(Date.now() - 3600000),
          details: 'Tentativas automáticas de quebra de senha'
        }
      ];

      res.json({
        events: mockEvents,
        totalCount: mockEvents.length,
        totalPages: 1,
        currentPage: 1
      });
    } catch (error: any) {
      console.error("Error fetching security logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/security-stats", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS), async (req, res) => {
    try {
      const mockStats = {
        failedLogins24h: 47,
        blockedIPs: 12,
        attacks24h: 3,
        securityScore: 92,
        criticalAlerts: [
          { message: 'Novo IP suspeito detectado', severity: 'critical' }
        ],
        recentBlockedIPs: [
          { address: '192.168.1.100', blockedAt: new Date(), reason: 'Força bruta' },
          { address: '10.0.0.1', blockedAt: new Date(Date.now() - 3600000), reason: 'Múltiplas falhas' }
        ]
      };
      
      res.json(mockStats);
    } catch (error: any) {
      console.error("Error fetching security stats:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/security/block-ip", isAdminAuthenticated, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM.MANAGE_SETTINGS), async (req, res) => {
    try {
      const { ip } = req.body;
      
      // In real implementation, this would add IP to firewall/blocking system
      await logAdminAction(req, 'block_ip', 'security', null, null, { ip });
      
      res.json({ message: `IP ${ip} foi bloqueado com sucesso` });
    } catch (error: any) {
      console.error("Error blocking IP:", error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}