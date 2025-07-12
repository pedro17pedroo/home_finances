import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import Stripe from "stripe";
import { storage } from "./storage";
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
  loginUser, 
  registerUser, 
  logoutUser, 
  getCurrentUser 
} from "./auth";

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

  app.post("/api/accounts", isAuthenticated, async (req, res) => {
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

  app.post("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const validatedData = insertTransactionSchema.parse({
        ...req.body,
        userId
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

  // Loans
  app.get("/api/loans", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const loans = await storage.getLoans(userId);
      res.json(loans);
    } catch (error) {
      console.error("Error fetching loans:", error);
      res.status(500).json({ message: "Erro ao buscar empréstimos" });
    }
  });

  app.post("/api/loans", isAuthenticated, async (req, res) => {
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

  app.put("/api/loans/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/loans/:id", isAuthenticated, async (req, res) => {
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

  // Debts
  app.get("/api/debts", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const debts = await storage.getDebts(userId);
      res.json(debts);
    } catch (error) {
      console.error("Error fetching debts:", error);
      res.status(500).json({ message: "Erro ao buscar dívidas" });
    }
  });

  app.post("/api/debts", isAuthenticated, async (req, res) => {
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

  app.put("/api/debts/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/debts/:id", isAuthenticated, async (req, res) => {
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