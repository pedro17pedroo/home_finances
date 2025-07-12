import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import Stripe from "stripe";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { 
  insertAccountSchema, 
  insertTransactionSchema, 
  insertSavingsGoalSchema, 
  insertLoanSchema, 
  insertDebtSchema, 
  insertCategorySchema 
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
      const validatedData = insertSavingsGoalSchema.parse({
        ...req.body,
        userId
      });
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
      const validatedData = insertSavingsGoalSchema.partial().parse(req.body);
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
      const validatedData = insertLoanSchema.parse({
        ...req.body,
        userId
      });
      const loan = await storage.createLoan(validatedData);
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
      const validatedData = insertLoanSchema.partial().parse(req.body);
      const loan = await storage.updateLoan(id, validatedData, userId);
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
      const validatedData = insertDebtSchema.parse({
        ...req.body,
        userId
      });
      const debt = await storage.createDebt(validatedData);
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
      const validatedData = insertDebtSchema.partial().parse(req.body);
      const debt = await storage.updateDebt(id, validatedData, userId);
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

  const httpServer = createServer(app);
  return httpServer;
}