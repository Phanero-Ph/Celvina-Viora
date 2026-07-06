import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateCommunityPostDto, CreateSupportTicketDto, UpdateCustomerProfileDto, UpdateNotificationPreferencesDto } from './dto/customer-profile.dto';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const normalizedEmail = createUserDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName: createUserDto.fullName.trim(),
        phone: createUserDto.phone.trim(),
        role: createUserDto.role,
        isVerified: createUserDto.isVerified,
        whatsappNumber: createUserDto.whatsappNumber?.trim(),
        address: createUserDto.address?.trim(),
        residentialAddress: createUserDto.residentialAddress?.trim(),
        picture: createUserDto.picture?.trim(),
        businessName: createUserDto.businessName?.trim(),
        businessDescription: createUserDto.businessDescription?.trim(),
        businessLogo: createUserDto.businessLogo?.trim(),
        socialMediaLinks: createUserDto.socialMediaLinks,
        bankName: createUserDto.bankName?.trim(),
        accountName: createUserDto.accountName?.trim(),
        accountNumber: createUserDto.accountNumber?.trim(),
        password: hashedPassword,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createAdmin(createAdminDto: CreateAdminDto) {
    const normalizedEmail = createAdminDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

    const admin = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        fullName: createAdminDto.fullName.trim(),
        phone: createAdminDto.phone.trim(),
        role: UserRole.ADMIN,
        isVerified: true,
        emailVerifiedAt: new Date(),
        adminPermissions: createAdminDto.permissions,
      },
    });
    const { password, emailVerificationTokenHash, emailVerificationExpiresAt, ...safeAdmin } = admin;
    return safeAdmin;
  }

  async updateAdminPermissions(adminId: string, permissions: string[]) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.role !== UserRole.ADMIN) {
      throw new BadRequestException('Only admin account permissions can be reassigned');
    }

    const updatedAdmin = await this.prisma.user.update({
      where: { id: adminId },
      data: {
        adminPermissions: permissions,
      },
    });
    const { password, emailVerificationTokenHash, emailVerificationExpiresAt, ...safeAdmin } = updatedAdmin;
    return safeAdmin;
  }

  async updateCustomerProfile(userId: string, updateProfileDto: UpdateCustomerProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: updateProfileDto.fullName?.trim(),
        phone: updateProfileDto.phone?.trim(),
        whatsappNumber: updateProfileDto.whatsappNumber?.trim(),
        picture: updateProfileDto.picture?.trim(),
        address: updateProfileDto.address?.trim(),
        savedAddresses: updateProfileDto.savedAddresses,
      },
    });
    const { password, emailVerificationTokenHash, emailVerificationExpiresAt, ...safeUser } = updatedUser;
    return safeUser;
  }

  async updateNotificationPreferences(userId: string, preferencesDto: UpdateNotificationPreferencesDto) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: { ...preferencesDto },
      },
    });
    const { password, emailVerificationTokenHash, emailVerificationExpiresAt, ...safeUser } = updatedUser;
    return safeUser;
  }

  async listSupportTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSupportTicket(userId: string, createSupportTicketDto: CreateSupportTicketDto) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        subject: createSupportTicketDto.subject.trim(),
        message: createSupportTicketDto.message.trim(),
      },
    });
  }

  async listWishlist(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleWishlist(userId: string, productId: string) {
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await this.prisma.wishlistItem.delete({ where: { id: existing.id } });
      return { productId, saved: false };
    }

    await this.prisma.wishlistItem.create({
      data: { userId, productId },
    });
    return { productId, saved: true };
  }

  async listCommunityPosts() {
    const posts = await this.prisma.communityPost.findMany({
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return posts.map(post => ({
      id: post.id,
      userFullName: post.user.fullName,
      title: post.title,
      body: post.body,
      likes: post.likes,
      createdAt: post.createdAt,
    }));
  }

  async createCommunityPost(userId: string, createCommunityPostDto: CreateCommunityPostDto) {
    const post = await this.prisma.communityPost.create({
      data: {
        userId,
        title: createCommunityPostDto.title.trim(),
        body: createCommunityPostDto.body.trim(),
      },
      include: { user: { select: { fullName: true } } },
    });

    return {
      id: post.id,
      userFullName: post.user.fullName,
      title: post.title,
      body: post.body,
      likes: post.likes,
      createdAt: post.createdAt,
    };
  }

  async listWalletTransactions(userId: string) {
    return this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async fundWallet(userId: string, amount: number) {
    const cleanAmount = Number(amount);
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      throw new BadRequestException('Enter a valid wallet funding amount');
    }

    return this.prisma.$transaction(async tx => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: cleanAmount } },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          type: 'Funding',
          amount: cleanAmount,
          status: 'Completed',
          note: 'Wallet funding completed.',
          reference: `CV-FUND-${Date.now()}-${userId.slice(0, 8)}`,
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId,
          title: 'Wallet funded',
          message: `Your wallet has been credited with ₦${cleanAmount.toLocaleString()}.`,
          channel: 'In App',
          type: 'success',
        },
      });

      const { password, emailVerificationTokenHash, emailVerificationExpiresAt, ...safeUser } = user;
      return { user: safeUser, transaction, notification };
    });
  }

  async withdrawWallet(userId: string, amount: number) {
    const cleanAmount = Number(amount);
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      throw new BadRequestException('Enter a valid withdrawal amount');
    }

    return this.prisma.$transaction(async tx => {
      const currentUser = await tx.user.findUnique({ where: { id: userId } });
      if (!currentUser) {
        throw new NotFoundException('User not found');
      }

      if (currentUser.walletBalance < cleanAmount) {
        throw new BadRequestException('Insufficient eligible wallet balance.');
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: cleanAmount } },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          type: 'Withdrawal',
          amount: cleanAmount,
          status: 'Completed',
          note: 'Wallet withdrawal requested to saved bank account.',
          reference: `CV-WITHDRAW-${Date.now()}-${userId.slice(0, 8)}`,
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId,
          title: 'Wallet withdrawal',
          message: `Your withdrawal request for ₦${cleanAmount.toLocaleString()} has been completed.`,
          channel: 'In App',
          type: 'success',
        },
      });

      const { password, emailVerificationTokenHash, emailVerificationExpiresAt, ...safeUser } = user;
      return { user: safeUser, transaction, notification };
    });
  }

  async withdrawVendorMoneyBox(userId: string, amount: number) {
    const cleanAmount = Number(amount);
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      throw new BadRequestException('Enter a valid withdrawal amount');
    }

    return this.prisma.$transaction(async tx => {
      const vendor = await tx.user.findUnique({ where: { id: userId } });
      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }

      if (vendor.role !== UserRole.VENDOR) {
        throw new BadRequestException('Only vendor accounts can withdraw from Vendor Money Box');
      }

      if (vendor.vendorMoneyBox < cleanAmount) {
        throw new BadRequestException('Insufficient Vendor Money Box balance.');
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: { vendorMoneyBox: { decrement: cleanAmount } },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          type: 'Withdrawal',
          amount: cleanAmount,
          status: 'Completed',
          note: 'Vendor Money Box withdrawal requested to saved bank account.',
          reference: `CV-VENDOR-WITHDRAW-${Date.now()}-${userId.slice(0, 8)}`,
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId,
          title: 'Vendor withdrawal',
          message: `Your Vendor Money Box withdrawal of ₦${cleanAmount.toLocaleString()} has been completed.`,
          channel: 'In App',
          type: 'success',
        },
      });

      const { password, emailVerificationTokenHash, emailVerificationExpiresAt, ...safeUser } = user;
      return { user: safeUser, transaction, notification };
    });
  }

  async listNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async setEmailVerificationToken(userId: string, token: string, expiresAt: Date) {
    return this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt,
      },
    });
  }

  async findByVerificationToken(token: string) {
    return this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash: this.hashToken(token),
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
  }

  async markEmailVerified(userId: string, tokenId?: string) {
    const verifiedAt = new Date();
    const result = await this.prisma.$transaction(async tx => {
      if (tokenId) {
        await tx.emailVerificationToken.update({
          where: { id: tokenId },
          data: { usedAt: verifiedAt },
        });
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          isVerified: true,
          emailVerifiedAt: verifiedAt,
          emailVerificationTokenHash: null,
          emailVerificationExpiresAt: null,
        },
      });
    });

    return result;
  }

  async createEmailVerificationOtp(userId: string, otp: string, expiresAt: Date) {
    await this.prisma.emailVerificationOtp.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    return this.prisma.emailVerificationOtp.create({
      data: {
        userId,
        otpHash: this.hashToken(otp),
        expiresAt,
      },
    });
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    await this.prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    return this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt,
      },
    });
  }

  async resetPassword(token: string, password: string) {
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: this.hashToken(token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetToken) return null;

    const hashedPassword = await bcrypt.hash(password, 10);
    const usedAt = new Date();
    return this.prisma.$transaction(async tx => {
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt },
      });

      await tx.passwordResetToken.updateMany({
        where: { userId: resetToken.userId, usedAt: null },
        data: { usedAt },
      });

      return tx.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });
    });
  }

  async verifyEmailOtp(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return null;

    const otpRecord = await this.prisma.emailVerificationOtp.findFirst({
      where: {
        userId: user.id,
        otpHash: this.hashToken(otp),
        usedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      await this.prisma.emailVerificationOtp.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { attempts: { increment: 1 } },
      });
      return null;
    }

    const verifiedAt = new Date();
    return this.prisma.$transaction(async tx => {
      await tx.emailVerificationOtp.update({
        where: { id: otpRecord.id },
        data: { usedAt: verifiedAt },
      });

      await tx.emailVerificationOtp.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: verifiedAt },
      });

      return tx.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          emailVerifiedAt: verifiedAt,
          emailVerificationTokenHash: null,
          emailVerificationExpiresAt: null,
        },
      });
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        whatsappNumber: true,
        address: true,
        picture: true,
        savedAddresses: true,
        notificationPreferences: true,
        role: true,
        bnplStatus: true,
        creditLimit: true,
        walletBalance: true,
        vendorMoneyBox: true,
        totalVendorSales: true,
        isVerified: true,
        adminPermissions: true,
        createdAt: true,
      },
    });
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
