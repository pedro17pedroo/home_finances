import { db } from '../../core/database/db.js';
import { campaigns, campaignUsage, users, plans } from '../../core/database/schema.js';
import { eq, desc, and, gte, lte, or, isNull, sql } from 'drizzle-orm';

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_trial';

export interface CampaignData {
  id: number;
  name: string;
  description: string | null;
  discountType: DiscountType | null;
  discountValue: number | null;
  couponCode: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  applicablePlans: number[];
  minAmount: number;
  maxDiscount: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  couponCode: string;
  validFrom?: Date;
  validUntil?: Date;
  usageLimit?: number;
  applicablePlans?: number[];
  minAmount?: number;
  maxDiscount?: number;
  isActive?: boolean;
}

export interface UpdateCampaignInput extends Partial<CreateCampaignInput> {}

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  campaign?: CampaignData;
  discountAmount?: number;
  finalPrice?: number;
}

export interface CampaignUsageData {
  id: number;
  campaignId: number;
  userId: number;
  userName: string;
  userEmail: string | null;
  usedAt: Date | null;
  discountAmount: number | null;
  originalPrice: number | null;
  finalPrice: number | null;
  planType: string;
}

class CampaignService {
  // Get all campaigns
  async getAllCampaigns(includeInactive = false): Promise<CampaignData[]> {
    const query = includeInactive
      ? db.select().from(campaigns).orderBy(desc(campaigns.createdAt))
      : db.select().from(campaigns).where(eq(campaigns.isActive, true)).orderBy(desc(campaigns.createdAt));

    const dbCampaigns = await query;

    return dbCampaigns.map(this.mapCampaign);
  }

  // Get campaign by ID
  async getCampaignById(campaignId: number): Promise<CampaignData | null> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
    if (!campaign) return null;
    return this.mapCampaign(campaign);
  }

  // Get campaign by coupon code
  async getCampaignByCode(couponCode: string): Promise<CampaignData | null> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.couponCode, couponCode.toUpperCase()));
    if (!campaign) return null;
    return this.mapCampaign(campaign);
  }

  // Create campaign
  async createCampaign(input: CreateCampaignInput): Promise<CampaignData> {
    // Check if coupon code already exists
    const existing = await this.getCampaignByCode(input.couponCode);
    if (existing) {
      throw new Error('Código de cupão já existe');
    }

    const [campaign] = await db
      .insert(campaigns)
      .values({
        name: input.name,
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue.toString(),
        couponCode: input.couponCode.toUpperCase(),
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        usageLimit: input.usageLimit,
        usageCount: 0,
        applicablePlans: input.applicablePlans || [],
        minAmount: (input.minAmount || 0).toString(),
        maxDiscount: input.maxDiscount?.toString(),
        isActive: input.isActive ?? true,
      })
      .returning();

    return this.mapCampaign(campaign);
  }

  // Update campaign
  async updateCampaign(campaignId: number, input: UpdateCampaignInput): Promise<CampaignData | null> {
    // If updating coupon code, check for duplicates
    if (input.couponCode) {
      const existing = await this.getCampaignByCode(input.couponCode);
      if (existing && existing.id !== campaignId) {
        throw new Error('Código de cupão já existe');
      }
    }

    const updateData: any = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.discountType !== undefined) updateData.discountType = input.discountType;
    if (input.discountValue !== undefined) updateData.discountValue = input.discountValue.toString();
    if (input.couponCode !== undefined) updateData.couponCode = input.couponCode.toUpperCase();
    if (input.validFrom !== undefined) updateData.validFrom = input.validFrom;
    if (input.validUntil !== undefined) updateData.validUntil = input.validUntil;
    if (input.usageLimit !== undefined) updateData.usageLimit = input.usageLimit;
    if (input.applicablePlans !== undefined) updateData.applicablePlans = input.applicablePlans;
    if (input.minAmount !== undefined) updateData.minAmount = input.minAmount.toString();
    if (input.maxDiscount !== undefined) updateData.maxDiscount = input.maxDiscount?.toString();
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    updateData.updatedAt = new Date();

    if (Object.keys(updateData).length === 1) {
      return this.getCampaignById(campaignId);
    }

    const [campaign] = await db
      .update(campaigns)
      .set(updateData)
      .where(eq(campaigns.id, campaignId))
      .returning();

    if (!campaign) return null;
    return this.mapCampaign(campaign);
  }

  // Toggle campaign status
  async toggleCampaignStatus(campaignId: number): Promise<CampaignData | null> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) return null;
    return this.updateCampaign(campaignId, { isActive: !campaign.isActive });
  }

  // Delete campaign
  async deleteCampaign(campaignId: number): Promise<{ success: boolean; message: string }> {
    // Check for usage
    const usage = await db
      .select()
      .from(campaignUsage)
      .where(eq(campaignUsage.campaignId, campaignId))
      .limit(1);

    if (usage.length > 0) {
      return {
        success: false,
        message: 'Não é possível eliminar a campanha. Já existem utilizações registadas.',
      };
    }

    await db.delete(campaigns).where(eq(campaigns.id, campaignId));

    return {
      success: true,
      message: 'Campanha eliminada com sucesso.',
    };
  }

  // Validate coupon
  async validateCoupon(
    couponCode: string,
    userId: number,
    planId: number,
    amount: number
  ): Promise<CouponValidationResult> {
    const campaign = await this.getCampaignByCode(couponCode);

    if (!campaign) {
      return { valid: false, message: 'Cupão não encontrado' };
    }

    if (!campaign.isActive) {
      return { valid: false, message: 'Cupão inactivo' };
    }

    const now = new Date();

    // Check validity period
    if (campaign.validFrom && now < campaign.validFrom) {
      return { valid: false, message: 'Cupão ainda não está válido' };
    }

    if (campaign.validUntil && now > campaign.validUntil) {
      return { valid: false, message: 'Cupão expirado' };
    }

    // Check usage limit
    if (campaign.usageLimit && campaign.usageCount >= campaign.usageLimit) {
      return { valid: false, message: 'Cupão esgotado' };
    }

    // Check if user already used this coupon
    const [userUsage] = await db
      .select()
      .from(campaignUsage)
      .where(and(eq(campaignUsage.campaignId, campaign.id), eq(campaignUsage.userId, userId)));

    if (userUsage) {
      return { valid: false, message: 'Já utilizou este cupão' };
    }

    // Check applicable plans
    if (campaign.applicablePlans.length > 0 && !campaign.applicablePlans.includes(planId)) {
      return { valid: false, message: 'Cupão não aplicável a este plano' };
    }

    // Check minimum amount
    if (amount < campaign.minAmount) {
      return {
        valid: false,
        message: `Valor mínimo para este cupão: ${campaign.minAmount} Kz`,
      };
    }

    // Calculate discount
    let discountAmount = 0;

    if (campaign.discountType === 'percentage' && campaign.discountValue) {
      discountAmount = (amount * campaign.discountValue) / 100;
    } else if (campaign.discountType === 'fixed_amount' && campaign.discountValue) {
      discountAmount = campaign.discountValue;
    } else if (campaign.discountType === 'free_trial') {
      // Free trial doesn't reduce price, just extends trial
      discountAmount = 0;
    }

    // Apply max discount cap
    if (campaign.maxDiscount && discountAmount > campaign.maxDiscount) {
      discountAmount = campaign.maxDiscount;
    }

    // Ensure discount doesn't exceed amount
    if (discountAmount > amount) {
      discountAmount = amount;
    }

    const finalPrice = amount - discountAmount;

    return {
      valid: true,
      message: 'Cupão válido',
      campaign,
      discountAmount,
      finalPrice,
    };
  }

  // Apply coupon (record usage)
  async applyCoupon(
    campaignId: number,
    userId: number,
    planType: 'basic' | 'premium' | 'enterprise',
    originalPrice: number,
    discountAmount: number,
    finalPrice: number
  ): Promise<void> {
    // Record usage
    await db.insert(campaignUsage).values({
      campaignId,
      userId,
      planType,
      originalPrice: originalPrice.toString(),
      discountAmount: discountAmount.toString(),
      finalPrice: finalPrice.toString(),
    });

    // Increment usage count
    await db
      .update(campaigns)
      .set({
        usageCount: sql`${campaigns.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));
  }

  // Get campaign usage statistics
  async getCampaignUsage(campaignId: number): Promise<CampaignUsageData[]> {
    const usageRecords = await db
      .select({
        id: campaignUsage.id,
        campaignId: campaignUsage.campaignId,
        userId: campaignUsage.userId,
        usedAt: campaignUsage.usedAt,
        discountAmount: campaignUsage.discountAmount,
        originalPrice: campaignUsage.originalPrice,
        finalPrice: campaignUsage.finalPrice,
        planType: campaignUsage.planType,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(campaignUsage)
      .leftJoin(users, eq(campaignUsage.userId, users.id))
      .where(eq(campaignUsage.campaignId, campaignId))
      .orderBy(desc(campaignUsage.usedAt));

    return usageRecords.map((record) => ({
      id: record.id,
      campaignId: record.campaignId,
      userId: record.userId,
      userName: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'N/A',
      userEmail: record.email,
      usedAt: record.usedAt,
      discountAmount: record.discountAmount ? parseFloat(record.discountAmount) : null,
      originalPrice: record.originalPrice ? parseFloat(record.originalPrice) : null,
      finalPrice: record.finalPrice ? parseFloat(record.finalPrice) : null,
      planType: record.planType,
    }));
  }

  // Get campaign statistics
  async getCampaignStats(campaignId: number): Promise<{
    totalUsage: number;
    totalDiscount: number;
    totalRevenue: number;
  }> {
    const usage = await this.getCampaignUsage(campaignId);

    const totalDiscount = usage.reduce((sum, u) => sum + (u.discountAmount || 0), 0);
    const totalRevenue = usage.reduce((sum, u) => sum + (u.finalPrice || 0), 0);

    return {
      totalUsage: usage.length,
      totalDiscount,
      totalRevenue,
    };
  }

  private mapCampaign(campaign: any): CampaignData {
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      discountType: campaign.discountType as DiscountType | null,
      discountValue: campaign.discountValue ? parseFloat(campaign.discountValue) : null,
      couponCode: campaign.couponCode,
      validFrom: campaign.validFrom,
      validUntil: campaign.validUntil,
      usageLimit: campaign.usageLimit,
      usageCount: campaign.usageCount || 0,
      isActive: campaign.isActive ?? true,
      applicablePlans: (campaign.applicablePlans as number[]) || [],
      minAmount: campaign.minAmount ? parseFloat(campaign.minAmount) : 0,
      maxDiscount: campaign.maxDiscount ? parseFloat(campaign.maxDiscount) : null,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }
}

export const campaignService = new CampaignService();
export default campaignService;
