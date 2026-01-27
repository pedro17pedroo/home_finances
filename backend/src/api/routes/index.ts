import { Router } from "express";
import authRoutes from "./auth.routes.js";
import transactionRoutes from "./transaction.routes.js";
import accountRoutes from "./account.routes.js";
import savingsGoalRoutes from "./savings-goal.routes.js";
import categoryRoutes from "./category.routes.js";
import transferRoutes from "./transfer.routes.js";
import loanRoutes from "./loans.js";
import debtRoutes from "./debts.js";
import recurringTransactionRoutes from "./recurring-transactions.js";
import notificationRoutes from "./notifications.js";
import advancedReportsRoutes from "./advanced-reports.js";
import exportRoutes from "./export.js";
import adminRoutes from "./admin.js";
import publicRoutes from "./public.js";
import whatsappRoutes from "./whatsapp.js";
import receiptsRoutes from "./receipts.js";
import subscriptionRoutes from "./subscription.routes.js";
import organizationRoutes from "./organization.routes.js";
import passwordResetRoutes from "./password-reset.routes.js";
import landingContentRoutes from "./landing-content.routes.js";
import accountTypesRoutes from "./account-types.js";
import budgetRoutes from "./budget.routes.js";
import appDownloadRoutes from "./app-download.routes.js";

const router = Router();

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
router.use("/auth/forgot-password", passwordResetRoutes);
router.use("/auth", authRoutes);
router.use("/transactions", transactionRoutes);
router.use("/accounts", accountRoutes);
router.use("/account-types", accountTypesRoutes);
router.use("/savings-goals", savingsGoalRoutes);
router.use("/categories", categoryRoutes);
router.use("/transfers", transferRoutes);
router.use("/loans", loanRoutes);
router.use("/debts", debtRoutes);
router.use("/recurring-transactions", recurringTransactionRoutes);
router.use("/notifications", notificationRoutes);
router.use("/advanced-reports", advancedReportsRoutes);
router.use("/export", exportRoutes);
router.use("/admin", adminRoutes);
router.use("/public", publicRoutes);
router.use("/whatsapp", whatsappRoutes);
router.use("/receipts", receiptsRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/organizations", organizationRoutes);
router.use("/landing-content", landingContentRoutes);
router.use("/budgets", budgetRoutes);
router.use("/app-downloads", appDownloadRoutes);

export default router;