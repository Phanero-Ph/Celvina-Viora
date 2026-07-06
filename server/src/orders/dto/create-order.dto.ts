import { IsString, IsNumber, IsEnum, IsOptional, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InstallmentType } from '@prisma/client';

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsEnum(InstallmentType)
  installmentType: InstallmentType;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  duration: number; // e.g., 6 months or 12 weeks. If PAY_ONCE, usually 1.

  @IsString()
  deliveryAddress: string;

  @IsString()
  @IsOptional()
  voucherCode?: string;
}
