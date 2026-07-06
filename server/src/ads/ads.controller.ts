import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdsService } from './ads.service';
import { CreateVendorAdDto } from './dto/create-vendor-ad.dto';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get()
  listActiveAds() {
    return this.adsService.listActiveAds();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('vendor/mine')
  listMyVendorAds(@Request() req) {
    return this.adsService.listVendorAds(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Post('vendor')
  createVendorAd(@Request() req, @Body() createVendorAdDto: CreateVendorAdDto) {
    return this.adsService.createVendorAd(req.user.id, createVendorAdDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  listAllAds() {
    return this.adsService.listAllAds();
  }
}
