import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RespondSupportTicketDto {
  @IsString()
  adminReply: string;

  @IsIn(['OPEN', 'PENDING', 'RESOLVED'])
  status: 'OPEN' | 'PENDING' | 'RESOLVED';
}

export class UpdateVerificationDto {
  @IsBoolean()
  isVerified: boolean;
}

export class UpdateRefundStatusDto {
  @IsIn(['Pending', 'Approved', 'Rejected'])
  status: 'Pending' | 'Approved' | 'Rejected';
}

export class UpdateProductStatusDto {
  @IsBoolean()
  isActive: boolean;
}

export class UpdateStoreSettingsDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  baseDeliveryFee?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  platformFeePerProduct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maintenanceFeePerProduct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  cancellationDeductionPercent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  referralReward?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  affiliateCommission?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minimumRewardPurchase?: number;

  @IsString()
  @IsOptional()
  supportEmail?: string;
}
