import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorAdDto } from './dto/create-vendor-ad.dto';

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService) {}

  async listActiveAds() {
    await this.expireOldAds();
    return this.prisma.vendorAdvertisement.findMany({
      where: { status: 'Active' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listVendorAds(vendorId: string) {
    await this.expireOldAds();
    return this.prisma.vendorAdvertisement.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAllAds() {
    await this.expireOldAds();
    return this.prisma.vendorAdvertisement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVendorAd(vendorId: string, dto: CreateVendorAdDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException('Vendors can only advertise their own products');
    }

    if (!product.isActive) {
      throw new BadRequestException('Inactive products cannot be advertised');
    }

    const cost = dto.days === 1 ? 3500 : 7000;
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + dto.days);

    return this.prisma.$transaction(async tx => {
      const ad = await tx.vendorAdvertisement.create({
        data: {
          vendorId,
          productId: dto.productId,
          placement: dto.placement,
          days: dto.days,
          cost,
          endsAt,
        },
      });

      await tx.product.update({
        where: { id: dto.productId },
        data: {
          sponsored: dto.placement !== 'Featured products',
          featured: dto.placement === 'Featured products',
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: vendorId,
          type: 'Purchase',
          amount: cost,
          status: 'Completed',
          note: `${dto.placement} advertisement for ${dto.days} day(s).`,
          reference: `CV-AD-${Date.now()}-${vendorId.slice(0, 8)}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: vendorId,
          title: 'Advertisement activated',
          message: `${dto.placement} is active for ${dto.days} day(s).`,
          channel: 'In App',
          type: 'success',
        },
      });

      return ad;
    });
  }

  private async expireOldAds() {
    const expiredAds = await this.prisma.vendorAdvertisement.findMany({
      where: {
        status: 'Active',
        endsAt: { lt: new Date() },
      },
    });

    if (!expiredAds.length) return;

    await this.prisma.$transaction(async tx => {
      await tx.vendorAdvertisement.updateMany({
        where: { id: { in: expiredAds.map(ad => ad.id) } },
        data: { status: 'Expired' },
      });

      for (const ad of expiredAds) {
        const stillActive = await tx.vendorAdvertisement.findFirst({
          where: {
            productId: ad.productId,
            status: 'Active',
            id: { not: ad.id },
          },
        });

        if (!stillActive) {
          await tx.product.update({
            where: { id: ad.productId },
            data: { sponsored: false, featured: false },
          });
        }
      }
    });
  }
}
