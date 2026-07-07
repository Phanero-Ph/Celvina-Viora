import { Body, Controller, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import {
  RespondSupportTicketDto,
  UpdateProductStatusDto,
  UpdateRefundStatusDto,
  UpdateStoreSettingsDto,
  UpdateVerificationDto,
} from './dto/admin-actions.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('support-tickets')
  listSupportTickets() {
    return this.adminService.listSupportTickets();
  }

  @Patch('support-tickets/:id/respond')
  respondSupportTicket(@Request() req, @Param('id') id: string, @Body() dto: RespondSupportTicketDto) {
    return this.adminService.respondSupportTicket(req.user.id, id, dto);
  }

  @Patch('users/:id/verification')
  updateUserVerification(@Request() req, @Param('id') id: string, @Body() dto: UpdateVerificationDto) {
    return this.adminService.updateUserVerification(req.user.id, id, dto);
  }

  @Patch('products/:id/status')
  updateProductStatus(@Request() req, @Param('id') id: string, @Body() dto: UpdateProductStatusDto) {
    return this.adminService.updateProductStatus(req.user.id, id, dto);
  }

  @Patch('refunds/:id/status')
  updateRefundStatus(@Request() req, @Param('id') id: string, @Body() dto: UpdateRefundStatusDto) {
    return this.adminService.updateRefundStatus(req.user.id, id, dto);
  }

  @Get('settings')
  getStoreSettings() {
    return this.adminService.getStoreSettings();
  }

  @Patch('settings')
  updateStoreSettings(@Request() req, @Body() dto: UpdateStoreSettingsDto) {
    return this.adminService.updateStoreSettings(req.user.id, dto);
  }
}
