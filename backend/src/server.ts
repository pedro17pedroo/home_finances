import 'dotenv/config';
import app from "./app.js";
import { config } from "./core/config/index.js";
import { logger } from "./core/utils/logger.js";
import { RecurringTransactionsJob } from "./core/jobs/recurring-transactions.job.js";

const server = app.listen(config.PORT, "0.0.0.0", () => {
  logger.info(`🚀 Server running on port ${config.PORT}`);
  logger.info(`📊 Environment: ${config.NODE_ENV}`);
  logger.info(`🔗 Frontend URL: ${config.FRONTEND_URL}`);
  
  // Iniciar jobs em background
  RecurringTransactionsJob.start();
  logger.info(`⏰ Jobs iniciados`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  RecurringTransactionsJob.stop();
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  RecurringTransactionsJob.stop();
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

export default server;