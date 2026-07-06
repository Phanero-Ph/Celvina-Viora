import { IsString, IsNumber, IsBoolean, IsOptional, Min, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  category: string; // Clothing, Shoes, Bags, Accessories

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsUrl()
  image: string;

  @IsString()
  description: string;

  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  stockQuantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  reorderLevel?: number;

  @IsBoolean()
  @IsOptional()
  flashSaleEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  bulkDiscountEligible?: boolean;
}
