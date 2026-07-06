import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { ForgotPasswordDto, RegisterDto, LoginDto, ResendVerificationDto, ResetPasswordDto, VerifyEmailDto, VerifyEmailOtpDto } from './dto/auth.dto';
import { User, UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  private sanitizeUser(user: User) {
    const { password, emailVerificationTokenHash, emailVerificationExpiresAt, ...result } = user;
    return result;
  }

  private signUser(user: User) {
    return this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create({
      ...registerDto,
      picture: registerDto.profilePicture,
      role: registerDto.role || UserRole.CUSTOMER,
      isVerified: false,
    });
    const emailDelivery = await this.sendOtpForUser(user);

    return {
      message: emailDelivery.delivered
        ? 'Account created successfully. Please enter the OTP sent to your email to verify your account.'
        : 'Account created successfully. Email delivery is not configured, so the OTP was logged on the server.',
      user: this.sanitizeUser(user),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email address before logging in.');
    }

    return {
      user: this.sanitizeUser(user),
      access_token: this.signUser(user),
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const verificationToken = await this.usersService.findByVerificationToken(verifyEmailDto.token);
    if (!verificationToken) {
      throw new BadRequestException('Verification link is invalid or has expired.');
    }

    if (verificationToken.user.isVerified) {
      return {
        message: 'Email is already verified. You can log in.',
        user: this.sanitizeUser(verificationToken.user),
      };
    }

    const verifiedUser = await this.usersService.markEmailVerified(verificationToken.userId, verificationToken.id);
    return {
      message: 'Email verified successfully. You can now log in.',
      user: this.sanitizeUser(verifiedUser),
    };
  }

  async verifyEmailOtp(verifyEmailOtpDto: VerifyEmailOtpDto) {
    const verifiedUser = await this.usersService.verifyEmailOtp(verifyEmailOtpDto.email, verifyEmailOtpDto.otp);
    if (!verifiedUser) {
      throw new BadRequestException('Invalid or expired OTP. Please request a new code.');
    }

    return {
      message: 'Email verified successfully. You can now log in.',
      user: this.sanitizeUser(verifiedUser),
    };
  }

  async resendVerification(resendDto: ResendVerificationDto) {
    const user = await this.usersService.findByEmail(resendDto.email);
    if (!user) {
      return { message: 'If an account exists, a verification email has been sent.' };
    }

    if (user.isVerified) {
      return { message: 'This email address is already verified. You can log in.' };
    }

    const emailDelivery = await this.sendOtpForUser(user);
    return {
      message: emailDelivery.delivered
        ? 'Verification OTP sent. Please check your inbox.'
        : 'Email delivery is not configured, so the OTP was logged on the server.',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      return { message: 'If an account exists, a password reset email has been sent.' };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.usersService.createPasswordResetToken(user.id, token, expiresAt);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://127.0.0.1:5173');
    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/?resetPassword=${token}`;
    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      resetUrl,
    });

    return { message: 'If an account exists, a password reset email has been sent.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.usersService.resetPassword(resetPasswordDto.token, resetPasswordDto.password);
    if (!user) {
      throw new BadRequestException('Password reset link is invalid or has expired.');
    }

    return { message: 'Password reset successfully. You can now log in.' };
  }

  me(user: User) {
    return this.sanitizeUser(user);
  }

  private async sendVerificationForUser(user: User) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.usersService.setEmailVerificationToken(user.id, token, expiresAt);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://127.0.0.1:5173');
    const verificationUrl = `${frontendUrl.replace(/\/$/, '')}/?verifyEmail=${token}`;
    const emailDelivery = await this.emailService.sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      verificationUrl,
    });
    return { userWithVerification: user, emailDelivery };
  }

  private async sendOtpForUser(user: User) {
    const otp = randomBytes(4).readUInt32BE(0).toString().slice(0, 6).padStart(6, '0');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.usersService.createEmailVerificationOtp(user.id, otp, expiresAt);

    const emailDelivery = await this.emailService.sendVerificationOtp({
      to: user.email,
      fullName: user.fullName,
      otp,
    });

    return emailDelivery;
  }
}
