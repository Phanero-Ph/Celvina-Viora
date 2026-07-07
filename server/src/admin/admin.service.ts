import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditCategory, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  RespondSupportTicketDto,
  UpdateProductStatusDto,
  UpdateRefundStatusDto,
  UpdateStoreSettingsDto,
  UpdateVerificationDto,
} from './dto/admin-actions.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listSupportTickets() {
    return this.prisma.supportTicket.findMany({
      include: { user: { select: { fullName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondSupportTicket(adminId: string, ticketId: string, dto: RespondSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Support ticket not found');

    return this.prisma.$transaction(async tx => {
      const updatedTicket = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          adminReply: dto.adminReply.trim(),
          status: dto.status,
        },
      });

      await tx.notification.create({
        data: {
          userId: ticket.userId,
          title: 'Support ticket updated',
          message: `Your ticket "${ticket.subject}" has been updated by customer support.`,
          channel: 'In App',
          type: dto.status === 'RESOLVED' ? 'success' : 'info',
        },
      });

      await this.audit(tx, adminId, 'Responded to support ticket', AuditCategory.SUPPORT, ticketId);
      return updatedTicket;
    });
  }

  async updateUserVerification(adminId: string, userId: string, dto: UpdateVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: dto.isVerified,
        emailVerifiedAt: dto.isVerified ? user.emailVerifiedAt || new Date() : null,
      },
    });
    await this.audit(this.prisma, adminId, `${dto.isVerified ? 'Verified' : 'Unverified'} user`, AuditCategory.SECURITY, userId);

    const { password, emailVerificationTokenHash, emailVerificationExpiresAt, ...safeUser } = updatedUser;
    return safeUser;
  }

  async updateProductStatus(adminId: string, productId: string, dto: UpdateProductStatusDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: { isActive: dto.isActive, inStock: dto.isActive ? product.stockQuantity > 0 : false },
    });
    await this.audit(this.prisma, adminId, `${dto.isActive ? 'Activated' : 'Deactivated'} product`, AuditCategory.CATALOG, productId);
    return updatedProduct;
  }

  async updateRefundStatus(adminId: string, refundId: string, dto: UpdateRefundStatusDto) {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId } });
    if (!refund) throw new NotFoundException('Refund not found');
    if (refund.status === dto.status) return refund;

    return this.prisma.$transaction(async tx => {
      const updatedRefund = await tx.refund.update({
        where: { id: refundId },
        data: { status: dto.status },
      });

      await tx.notification.create({
        data: {
          userId: refund.userId,
          title: 'Refund status updated',
          message: `Your refund for order ${refund.orderId || 'N/A'} is now ${dto.status}.`,
          channel: 'In App',
          type: dto.status === 'Rejected' ? 'warning' : 'success',
        },
      });

      await this.audit(tx, adminId, `Updated refund status to ${dto.status}`, AuditCategory.FINANCE, refundId);
      return updatedRefund;
    });
  }

  async getStoreSettings() {
    const settings = await this.prisma.storeSettings.upsert({
      where: { id: 'global_settings' },
      create: { id: 'global_settings', baseDeliveryFee: 5000 },
      update: {},
    });
    return this.mapSettings(settings);
  }

  async updateStoreSettings(adminId: string, dto: UpdateStoreSettingsDto) {
    const data: Record<string, number | string> = {};
    if (dto.baseDeliveryFee !== undefined) data.baseDeliveryFee = dto.baseDeliveryFee;
    if (dto.cancellationDeductionPercent !== undefined) data.refundWindowDays = Math.max(0, Math.round(dto.cancellationDeductionPercent));
    if (dto.supportEmail !== undefined) data.maintenanceMessage = dto.supportEmail.trim();

    if (dto.platformFeePerProduct !== undefined || dto.maintenanceFeePerProduct !== undefined) {
      data.maxGoodwillCredit = (dto.platformFeePerProduct || 2500) + (dto.maintenanceFeePerProduct || 1000);
    }
    if (dto.referralReward !== undefined) data.defaultCreditLimit = dto.referralReward;
    if (dto.affiliateCommission !== undefined) data.minCreditLimit = dto.affiliateCommission;
    if (dto.minimumRewardPurchase !== undefined) data.maxCreditLimit = dto.minimumRewardPurchase;

    if (!Object.keys(data).length) {
      throw new BadRequestException('No settings supplied');
    }

    const settings = await this.prisma.storeSettings.upsert({
      where: { id: 'global_settings' },
      create: { id: 'global_settings', baseDeliveryFee: Number(data.baseDeliveryFee || 5000) },
      update: data,
    });
    await this.audit(this.prisma, adminId, 'Updated platform settings', AuditCategory.SECURITY, 'global_settings');
    return this.mapSettings(settings);
  }

  private mapSettings(settings: any) {
    const feeTotal = Number(settings.maxGoodwillCredit || 3500);
    return {
      deliveryFee: Number(settings.baseDeliveryFee || 5000),
      platformFeePerProduct: 2500,
      maintenanceFeePerProduct: Math.max(0, feeTotal - 2500),
      cancellationDeductionPercent: Number(settings.refundWindowDays || 10),
      referralReward: Number(settings.defaultCreditLimit || 1000),
      affiliateCommission: Number(settings.minCreditLimit || 1000),
      minimumRewardPurchase: Number(settings.maxCreditLimit || 15000),
      adOneDayCost: 3500,
      adTwoDayCost: 7000,
      supportEmail: settings.maintenanceMessage?.includes('@') ? settings.maintenanceMessage : 'celvinaviora@gmail.com',
    };
  }

  private async audit(tx: any, adminId: string, action: string, category: AuditCategory, details: string) {
    const admin = await tx.user.findUnique({ where: { id: adminId }, select: { role: true } });
    if (!admin || (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN)) return;
    await tx.auditLog.create({
      data: {
        action,
        category,
        performedBy: adminId,
        details,
      },
    });
  }
}
