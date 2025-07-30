import { SubscriptionService } from '../services/subscriptionService';

/**
 * Daily subscription check job
 * This should be run daily using a cron job or similar scheduler
 */
export async function runDailySubscriptionCheck() {
  console.log('🕐 Starting daily subscription check...');
  
  try {
    // Check expired subscriptions
    const expiredResult = await SubscriptionService.checkExpiredSubscriptions();
    console.log(`✅ Processed ${expiredResult.expiredTrials} expired trials`);

    // Check upcoming expirations
    const upcomingResult = await SubscriptionService.checkUpcomingExpirations();
    console.log(`📧 Sent ${upcomingResult.expiring3Days} 3-day warnings and ${upcomingResult.expiring1Day} 1-day warnings`);

    console.log('✅ Daily subscription check completed successfully');
    
    return {
      success: true,
      expiredTrials: expiredResult.expiredTrials,
      notifications: upcomingResult.expiring3Days + upcomingResult.expiring1Day
    };
  } catch (error) {
    console.error('❌ Daily subscription check failed:', error);
    throw error;
  }
}

// Run immediately if called directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  runDailySubscriptionCheck()
    .then((result) => {
      console.log('Job completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Job failed:', error);
      process.exit(1);
    });
}