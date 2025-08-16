import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    user?: {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      planType: string;
      subscriptionStatus: string;
    };
    adminUserId?: number;
  }
}