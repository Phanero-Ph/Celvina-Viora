import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { InstallmentStatus, InstallmentType, OrderStatus, RefundMethod } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    const { items, installmentType, duration, deliveryAddress, voucherCode, affiliateCode } = createOrderDto;
    this.validatePlan(installmentType, duration);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const settings = await this.getStoreSettings();

    const uniqueProductIds = [...new Set(items.map(item => item.productId))];
    const existingProducts = await this.prisma.product.findMany({ where: { id: { in: uniqueProductIds } } });
    const productsById = new Map(existingProducts.map(product => [product.id, product]));
    
    for (const item of items) {
      if (productsById.has(item.productId)) continue;
      if (!item.name || item.price === undefined || !item.image || !item.description) {
        throw new BadRequestException('One or more products are not available for checkout.');
      }
      const product = await this.prisma.product.create({
        data: {
          id: item.productId,
          name: item.name.trim(),
          category: item.category || 'Lifestyle',
          price: Number(item.price),
          image: item.image,
          description: item.description,
          brand: item.brand,
          color: item.color,
          sizes: item.sizes || [],
          inStock: true,
          isActive: true,
          stockQuantity: Math.max(100, item.quantity),
        },
      });
      productsById.set(product.id, product);
    }

    let totalItemsAmount = 0;
    const orderItemsData: Array<{ productId: string; name: string; price: number; quantity: number }> = [];

    for (const item of items) {
      const product = productsById.get(item.productId);
      if (!product) throw new BadRequestException('One or more products not found.');
      if (!product.inStock || product.stockQuantity < item.quantity) {
        throw new BadRequestException(`Product ${product.name} is out of stock or insufficient quantity.`);
      }
      if (!product.isActive) {
        throw new BadRequestException(`Product ${product.name} is no longer active.`);
      }

      let itemPrice = product.price;
      // Apply bulk discount logic (e.g., 5+ items)
      if (item.quantity >= settings.bulkThreshold && product.bulkDiscountEligible) {
        itemPrice = itemPrice * (1 - settings.wholesaleDiscountPercent / 100);
      }

      totalItemsAmount += itemPrice * item.quantity;
      orderItemsData.push({
        productId: product.id,
        name: product.name,
        price: itemPrice,
        quantity: item.quantity,
      });
    }

    const deliveryFee = settings.baseDeliveryFee;
    let subTotal = totalItemsAmount + deliveryFee;
    let discountAmount = 0;

    if (voucherCode) {
      const voucher = await this.prisma.voucher.findUnique({ where: { code: voucherCode } });
      if (voucher && voucher.active) {
        if (voucher.endsAt && new Date(voucher.endsAt) < new Date()) {
          throw new BadRequestException('Voucher has expired.');
        }
        if (subTotal >= voucher.minSpend) {
          if (voucher.discountType === 'fixed') {
            discountAmount = voucher.discountValue;
          } else {
            discountAmount = subTotal * (voucher.discountValue / 100);
            if (voucher.maxDiscountCap) {
              discountAmount = Math.min(discountAmount, voucher.maxDiscountCap);
            }
          }
        }
      }
    }

    const totalAmount = Math.max(0, subTotal - discountAmount);

    const installmentAmount = totalAmount / duration;
    const now = new Date();
    const paymentsCompleted = 1;

    const scheduleData = Array.from({ length: duration }, (_, index) => {
      const installmentNumber = index + 1;
      const dueDate = new Date(now);
      if (installmentType === InstallmentType.WEEKLY) {
        dueDate.setDate(now.getDate() + (installmentNumber * 7));
      } else if (installmentType === InstallmentType.MONTHLY) {
        dueDate.setMonth(now.getMonth() + installmentNumber);
      }

      return {
        installmentNumber,
        dueDate,
        amount: installmentAmount,
        status: installmentNumber === 1 ? InstallmentStatus.PAID : InstallmentStatus.PENDING,
        paidAt: installmentNumber === 1 ? now : null,
        paymentMethod: installmentNumber === 1 ? 'Checkout' : null,
        paymentRef: installmentNumber === 1 ? `CV-PAY-${Date.now()}-${userId.slice(0, 8)}` : null,
      };
    });

    const initialStatus = installmentType === InstallmentType.PAY_ONCE
      ? OrderStatus.PAY_ONCE_100_DELIVERED
      : OrderStatus.ONGOING_0_DELIVERED;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          totalItemsAmount,
          deliveryFee,
          totalAmount,
          installmentType,
          duration,
          installmentAmount,
          paymentsCompleted,
          paymentsRemaining: Math.max(0, duration - paymentsCompleted),
          status: initialStatus,
          deliveryAddress,
          trackingNumber: installmentType === InstallmentType.PAY_ONCE ? this.makeTrackingNumber() : null,
          voucherCode: voucherCode || null,
          discountAmount: discountAmount > 0 ? discountAmount : null,
          orderSource: 'Customer Self-Service',
          conciergeMeta: affiliateCode ? { affiliateCode } : undefined,
          schedule: {
            create: scheduleData,
          },
          items: {
            create: orderItemsData,
          },
        },
        include: {
          schedule: true,
          items: true,
        },
      });

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { decrement: item.quantity },
            inStock: productsById.get(item.productId)!.stockQuantity - item.quantity > 0,
          },
        });
      }

      if (voucherCode && discountAmount > 0) {
        await tx.voucher.update({
          where: { code: voucherCode },
          data: { claimsCount: { increment: 1 } },
        });
        await tx.voucherRedemption.create({
          data: {
            voucherCode,
            userId,
            orderId: order.id,
            discountAmount,
            orderSource: 'Customer Self-Service',
          }
        });
      }

      await tx.notification.create({
        data: {
          userId,
          title: 'Order created',
          message: installmentType === InstallmentType.PAY_ONCE
            ? 'Your order is fully paid and is now being prepared for nationwide delivery.'
            : 'Your installment order is active. Products will be released after full payment is completed.',
          channel: 'In App',
          type: 'success',
        },
      });

      return order;
    });
  }

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        schedule: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        schedule: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async payNextInstallment(userId: string, orderId: string) {
    const order = await this.getOrderById(userId, orderId);
    if (order.status === OrderStatus.DELIVERED_100_COMPLETED || order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('This order cannot receive installment payments.');
    }

    const nextInstallment = order.schedule.find(item => item.status === InstallmentStatus.PENDING);
    if (!nextInstallment) {
      throw new BadRequestException('This order is already fully paid.');
    }

    const paidAt = new Date();
    const fullyPaid = order.paymentsCompleted + 1 >= order.duration;
    return this.prisma.$transaction(async tx => {
      await tx.installmentSchedule.update({
        where: { id: nextInstallment.id },
        data: {
          status: InstallmentStatus.PAID,
          paidAt,
          paymentMethod: 'Customer Wallet/Paystack',
          paymentRef: `CV-PAY-${Date.now()}-${userId.slice(0, 8)}`,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentsCompleted: { increment: 1 },
          paymentsRemaining: { decrement: 1 },
          status: fullyPaid ? OrderStatus.ELIGIBLE_100_DELIVERY : order.status,
          trackingNumber: fullyPaid ? order.trackingNumber || this.makeTrackingNumber() : order.trackingNumber,
        },
        include: {
          items: true,
          schedule: { orderBy: { installmentNumber: 'asc' } },
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: fullyPaid ? 'Installment complete' : 'Installment paid',
          message: fullyPaid
            ? `Order ${orderId} is fully paid and ready for delivery processing.`
            : `Installment ${nextInstallment.installmentNumber} for order ${orderId} has been paid.`,
          channel: 'In App',
          type: 'success',
        },
      });

      return updatedOrder;
    });
  }

  async confirmDelivery(userId: string, orderId: string) {
    const order = await this.getOrderById(userId, orderId);
    const canConfirmDelivery = order.status === OrderStatus.PAY_ONCE_100_DELIVERED || order.status === OrderStatus.ELIGIBLE_100_DELIVERY;
    if (!canConfirmDelivery) {
      throw new BadRequestException('Only fully paid orders can be confirmed as delivered.');
    }

    return this.prisma.$transaction(async tx => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DELIVERED_100_COMPLETED,
          dispatchStatus: 'DELIVERED',
        },
        include: {
          items: true,
          schedule: { orderBy: { installmentNumber: 'asc' } },
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: 'Delivery confirmed',
          message: 'Thank you. Your delivery has been confirmed.',
          channel: 'In App',
          type: 'success',
        },
      });

      return updatedOrder;
    });
  }

  async requestRefund(userId: string, orderId: string, reason: string) {
    const order = await this.getOrderById(userId, orderId);
    if (order.status === OrderStatus.DELIVERED_100_COMPLETED || order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('This order is not eligible for cancellation refund.');
    }

    const settings = await this.getStoreSettings();
    const amountPaid = order.paymentsCompleted * order.installmentAmount;
    if (amountPaid <= 0) {
      throw new BadRequestException('No paid balance is available for refund.');
    }

    const deduction = amountPaid * (settings.refundWindowDays >= 0 ? 0.1 : 0.1);
    const refundedAmount = Math.max(0, amountPaid - deduction);

    return this.prisma.$transaction(async tx => {
      const refund = await tx.refund.create({
        data: {
          userId,
          orderId,
          requestedAmount: amountPaid,
          deduction,
          amount: refundedAmount,
          method: RefundMethod.WALLET_CREDIT,
          reason: reason.trim(),
          status: 'Approved',
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REFUNDED },
        include: {
          items: true,
          schedule: { orderBy: { installmentNumber: 'asc' } },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: refundedAmount } },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'Refund',
          amount: refundedAmount,
          status: 'Completed',
          note: `Refund for ${orderId} after 10% cancellation deduction.`,
          reference: `CV-REFUND-${Date.now()}-${userId.slice(0, 8)}`,
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: 'Refund approved',
          message: `A refund of ₦${refundedAmount.toLocaleString()} has been credited to your wallet.`,
          channel: 'In App',
          type: 'success',
        },
      });

      return { order: updatedOrder, refund };
    });
  }

  async listRefunds(userId: string) {
    return this.prisma.refund.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.order.findMany({
      include: {
        user: { select: { fullName: true, email: true } },
        items: true,
        schedule: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private validatePlan(installmentType: InstallmentType, duration: number) {
    if (installmentType === InstallmentType.PAY_ONCE && duration !== 1) {
      throw new BadRequestException('Pay once orders must use a duration of 1.');
    }
    if (installmentType === InstallmentType.WEEKLY && (duration < 1 || duration > 30)) {
      throw new BadRequestException('Weekly plans must be 1 to 30 weeks.');
    }
    if (installmentType === InstallmentType.MONTHLY && (duration < 1 || duration > 8)) {
      throw new BadRequestException('Monthly plans must be 1 to 8 months.');
    }
  }

  private async getStoreSettings() {
    return this.prisma.storeSettings.upsert({
      where: { id: 'global_settings' },
      create: { id: 'global_settings', baseDeliveryFee: 5000 },
      update: {},
    });
  }

  private makeTrackingNumber() {
    return `CV-NG-${Math.floor(100000 + Math.random() * 900000)}`;
  }
}
