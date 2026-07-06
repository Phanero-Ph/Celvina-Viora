import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCustomerProfileDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  whatsappNumber?: string;

  @IsString()
  @IsOptional()
  picture?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  savedAddresses?: string[];
}

export class UpdateNotificationPreferencesDto {
  @IsBoolean()
  @IsOptional()
  email?: boolean;

  @IsBoolean()
  @IsOptional()
  whatsapp?: boolean;

  @IsBoolean()
  @IsOptional()
  push?: boolean;

  @IsBoolean()
  @IsOptional()
  orders?: boolean;

  @IsBoolean()
  @IsOptional()
  payments?: boolean;

  @IsBoolean()
  @IsOptional()
  promotions?: boolean;

  @IsObject()
  @IsOptional()
  extra?: Record<string, boolean>;
}

export class CreateSupportTicketDto {
  @IsString()
  subject: string;

  @IsString()
  message: string;
}

export class WishlistProductDto {
  @IsString()
  productId: string;
}

export class CreateCommunityPostDto {
  @IsString()
  title: string;

  @IsString()
  body: string;
}

export class WalletAmountDto {
  @IsNumber()
  @Min(1)
  amount: number;
}
