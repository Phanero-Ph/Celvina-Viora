import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { InstallmentType, OrderStatus, BNPLStatus, InstallmentStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    const { items, installmentType, duration, deliveryAddress, voucherCode } = createOrderDto;

    // 1. Fetch User and Settings
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const settings = await this.prisma.storeSettings.findUnique({ where: { id: 'global_settings' } });
    if (!settings) throw new BadRequestException('System settings not configured');

    // 2. Validate BNPL Status for Installments
    if (installmentType !== InstallmentType.PAY_ONCE) {
      if (user.bnplStatus !== BNPLStatus.APPROVED) {
        throw new ForbiddenException('BNPL profile must be APPROVED to use installment plans.');
      }
    }

    // 3. Fetch Products and Validate Stock
    const productIds = items.map(item => item.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    
    if (products.length !== items.length) {
      throw new BadRequestException('One or more products not found.');
    }

    let totalItemsAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
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

    // 4. Calculate Delivery Fee (Simplified: Base fee + 10% of items)
    // In a real app, this would use the complex zone/category logic from settings
    const deliveryFee = settings.baseDeliveryFee + (totalItemsAmount * 0.05); 
    let subTotal = totalItemsAmount + deliveryFee;
    let discountAmount = 0;

    // 5. Apply Voucher (Basic Implementation)
    if (voucherCode) {
      const voucher = await this.prisma.voucher.findUnique({ where: { code: voucherCode } });
      if (voucher && voucher.active) {
        // Check expiry
        if (voucher.endsAt && new Date(voucher.endsAt) < new Date()) {
          throw new BadRequestException('Voucher has expired.');
        }
        // Check min spend
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

    // 6. Check Credit Limit (for BNPL)
    if (installmentType !== InstallmentType.PAY_ONCE) {
      // Calculate current outstanding balance
      const existingOrders = await this.prisma.order.findMany({
        where: { userId, status: { not: OrderStatus.DELIVERED_100_COMPLETED } }, // Simplified check
        select: { totalAmount: true, paymentsCompleted: true, duration: true, installmentAmount: true }
      });
      
      const currentExposure = existingOrders.reduce((acc, order) => {
        const remaining = (order.duration - order.paymentsCompleted) * order.installmentAmount;
        return acc + remaining;
      }, 0);

      if (currentExposure + totalAmount > user.creditLimit) {
        throw new ForbiddenException(`Order exceeds credit limit. Available: ${user.creditLimit - currentExposure}`);
      }
    }

    // 7. Generate Installment Schedule
    const scheduleData = [];
    const installmentAmount = totalAmount / duration;
    const now = new Date();

    for (let i = 1; i <= duration; i++) {
      const dueDate = new Date(now);
      if (installmentType === InstallmentType.WEEKLY) {
        dueDate.setDate(now.getDate() + (i * 7));
      } else if (installmentType === InstallmentType.MONTHLY) {
        dueDate.setMonth(now.getMonth() + i);
      } else {
        // PAY_ONCE
        dueDate.setDate(now.getDate() + 1); // Due tomorrow
      }

      scheduleData.push({
        installmentNumber: i,
        dueDate: dueDate,
        amount: installmentAmount,
        status: InstallmentStatus.PENDING,
      });
    }

    let initialStatus: OrderStatus = OrderStatus.ONGOING_0_DELIVERED;
    if (installmentType === InstallmentType.PAY_ONCE) {
      initialStatus = OrderStatus.PAY_ONCE_100_DELIVERED; // Technically pending payment, but status logic varies
    }

    // 8. Execute Transaction
    return this.prisma.$transaction(async (tx) => {
      // Create Order
      const order = await tx.order.create({
        data: {
          userId,
          totalItemsAmount,
          deliveryFee,
          totalAmount,
          installmentType,
          duration,
          installmentAmount,
          paymentsCompleted: 0,
          paymentsRemaining: duration,
          status: initialStatus,
          deliveryAddress,
          voucherCode: voucherCode || null,
          discountAmount: discountAmount > 0 ? discountAmount : null,
          orderSource: 'Customer Self-Service',
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

      // Deduct Stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      // Increment Voucher Claims (if used)
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
}
