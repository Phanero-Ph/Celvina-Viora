import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto, user?: { id: string; role: UserRole }) {
    const vendor = user?.role === UserRole.VENDOR
      ? await this.prisma.user.findUnique({ where: { id: user.id } })
      : null;

    return this.prisma.product.create({
      data: {
        ...createProductDto,
        vendorId: vendor ? vendor.id : createProductDto.vendorId,
        vendorName: vendor ? vendor.businessName || vendor.fullName : createProductDto.vendorName || 'Celvina Viora',
        source: vendor ? 'Vendor' : createProductDto.source || 'Celvina Viora',
        sizes: createProductDto.sizes || [],
      },
    });
  }

  async findAll(category?: string, search?: string, isActive?: boolean, inStock?: boolean) {
    const where: any = {};
    
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;
    if (inStock !== undefined) where.inStock = inStock;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async findMine(vendorId: string) {
    return this.prisma.product.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto, user?: { id: string; role: UserRole }) {
    const product = await this.findOne(id);
    if (user?.role === UserRole.VENDOR && product.vendorId !== user.id) {
      throw new ForbiddenException('Vendors can only update their own products');
    }
    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(id: string, user?: { id: string; role: UserRole }) {
    const product = await this.findOne(id);
    if (user?.role === UserRole.VENDOR && product.vendorId !== user.id) {
      throw new ForbiddenException('Vendors can only remove their own products');
    }
    return this.prisma.product.delete({ where: { id } });
  }
}
