import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminPermissionsDto } from './dto/update-admin-permissions.dto';
import { CreateCommunityPostDto, CreateSupportTicketDto, UpdateCustomerProfileDto, UpdateNotificationPreferencesDto, WalletAmountDto, WishlistProductDto } from './dto/customer-profile.dto';
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

  @UseGuards(JwtAuthGuard)
  @Get('me/wishlist')
  listMyWishlist(@Request() req) {
    return this.usersService.listWishlist(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/wishlist/toggle')
  toggleMyWishlist(@Request() req, @Body() wishlistProductDto: WishlistProductDto) {
    return this.usersService.toggleWishlist(req.user.id, wishlistProductDto.productId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/wallet-transactions')
  listMyWalletTransactions(@Request() req) {
    return this.usersService.listWalletTransactions(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/wallet/fund')
  fundMyWallet(@Request() req, @Body() walletAmountDto: WalletAmountDto) {
    return this.usersService.fundWallet(req.user.id, walletAmountDto.amount);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/wallet/withdraw')
  withdrawFromMyWallet(@Request() req, @Body() walletAmountDto: WalletAmountDto) {
    return this.usersService.withdrawWallet(req.user.id, walletAmountDto.amount);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/notifications')
  listMyNotifications(@Request() req) {
    return this.usersService.listNotifications(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/notifications/:id/read')
  markMyNotificationRead(@Request() req, @Param('id') id: string) {
    return this.usersService.markNotificationRead(req.user.id, id);
  }

  @Get('community/posts')
  listCommunityPosts() {
    return this.usersService.listCommunityPosts();
  }

  @UseGuards(JwtAuthGuard)
  @Post('community/posts')
  createCommunityPost(@Request() req, @Body() createCommunityPostDto: CreateCommunityPostDto) {
    return this.usersService.createCommunityPost(req.user.id, createCommunityPostDto);
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
