import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminPermissionsDto } from './dto/update-admin-permissions.dto';
import { CreateSupportTicketDto, UpdateCustomerProfileDto, UpdateNotificationPreferencesDto } from './dto/customer-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('admins')
  createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.usersService.createAdmin(createAdminDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch('admins/:id/permissions')
  updateAdminPermissions(@Param('id') id: string, @Body() updateAdminPermissionsDto: UpdateAdminPermissionsDto) {
    return this.usersService.updateAdminPermissions(id, updateAdminPermissionsDto.permissions);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  updateMyProfile(@Request() req, @Body() updateCustomerProfileDto: UpdateCustomerProfileDto) {
    return this.usersService.updateCustomerProfile(req.user.id, updateCustomerProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/notification-preferences')
  updateMyNotificationPreferences(@Request() req, @Body() updateNotificationPreferencesDto: UpdateNotificationPreferencesDto) {
    return this.usersService.updateNotificationPreferences(req.user.id, updateNotificationPreferencesDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/support-tickets')
  listMySupportTickets(@Request() req) {
    return this.usersService.listSupportTickets(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/support-tickets')
  createMySupportTicket(@Request() req, @Body() createSupportTicketDto: CreateSupportTicketDto) {
    return this.usersService.createSupportTicket(req.user.id, createSupportTicketDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
