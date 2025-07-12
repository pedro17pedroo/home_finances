import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema, insertAccountSchema, insertSavingsGoalSchema, insertLoanSchema, insertDebtSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Accounts routes
  app.get("/api/accounts", async (req, res) => {
    try {
      const accounts = await storage.getAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar contas" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const validatedData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(validatedData);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar conta" });
      }
    }
  });

  app.put("/api/accounts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertAccountSchema.partial().parse(req.body);
      const account = await storage.updateAccount(id, validatedData);
      res.json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar conta" });
      }
    }
  });

  app.delete("/api/accounts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAccount(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar conta" });
    }
  });

  // Transactions routes
  app.get("/api/transactions", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const transactions = await storage.getTransactions(limit);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar transações" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar transação" });
      }
    }
  });

  app.put("/api/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTransactionSchema.partial().parse(req.body);
      const transaction = await storage.updateTransaction(id, validatedData);
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar transação" });
      }
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTransaction(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar transação" });
    }
  });

  // Savings Goals routes
  app.get("/api/savings-goals", async (req, res) => {
    try {
      const goals = await storage.getSavingsGoals();
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar metas de poupança" });
    }
  });

  app.post("/api/savings-goals", async (req, res) => {
    try {
      const validatedData = insertSavingsGoalSchema.parse(req.body);
      const goal = await storage.createSavingsGoal(validatedData);
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar meta de poupança" });
      }
    }
  });

  app.put("/api/savings-goals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSavingsGoalSchema.partial().parse(req.body);
      const goal = await storage.updateSavingsGoal(id, validatedData);
      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar meta de poupança" });
      }
    }
  });

  app.delete("/api/savings-goals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSavingsGoal(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar meta de poupança" });
    }
  });

  // Loans routes
  app.get("/api/loans", async (req, res) => {
    try {
      const loans = await storage.getLoans();
      res.json(loans);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar empréstimos" });
    }
  });

  app.post("/api/loans", async (req, res) => {
    try {
      const validatedData = insertLoanSchema.parse(req.body);
      const loan = await storage.createLoan(validatedData);
      res.status(201).json(loan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar empréstimo" });
      }
    }
  });

  app.put("/api/loans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertLoanSchema.partial().parse(req.body);
      const loan = await storage.updateLoan(id, validatedData);
      res.json(loan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar empréstimo" });
      }
    }
  });

  app.delete("/api/loans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLoan(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar empréstimo" });
    }
  });

  // Debts routes
  app.get("/api/debts", async (req, res) => {
    try {
      const debts = await storage.getDebts();
      res.json(debts);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar dívidas" });
    }
  });

  app.post("/api/debts", async (req, res) => {
    try {
      const validatedData = insertDebtSchema.parse(req.body);
      const debt = await storage.createDebt(validatedData);
      res.status(201).json(debt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar dívida" });
      }
    }
  });

  app.put("/api/debts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDebtSchema.partial().parse(req.body);
      const debt = await storage.updateDebt(id, validatedData);
      res.json(debt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar dívida" });
      }
    }
  });

  app.delete("/api/debts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDebt(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar dívida" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/financial-summary", async (req, res) => {
    try {
      const summary = await storage.getFinancialSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar resumo financeiro" });
    }
  });

  app.get("/api/dashboard/monthly-transactions", async (req, res) => {
    try {
      const summary = await storage.getMonthlyTransactionsSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar resumo mensal" });
    }
  });

  app.get("/api/dashboard/expenses-by-category", async (req, res) => {
    try {
      const expenses = await storage.getExpensesByCategory();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar gastos por categoria" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
