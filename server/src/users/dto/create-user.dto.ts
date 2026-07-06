import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsIn([UserRole.CUSTOMER, UserRole.VENDOR])
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  whatsappNumber?: string;

  @IsString()
  @IsOptional()
  residentialAddress?: string;

  @IsString()
  @IsOptional()
  picture?: string;

  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  businessDescription?: string;

  @IsString()
  @IsOptional()
  businessLogo?: string;

  @IsObject()
  @IsOptional()
  socialMediaLinks?: Record<string, string>;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;
}
