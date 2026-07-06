import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  vendorName?: string;

  @IsString()
  @IsOptional()
  source?: string;

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

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sizes?: string[];

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
  sponsored?: boolean;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsBoolean()
  @IsOptional()
  bulkDiscountEligible?: boolean;
}
