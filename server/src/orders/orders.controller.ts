import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, RefundOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    // req.user is populated by JwtAuthGuard
    return this.ordersService.createOrder(req.user.id, createOrderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req) {
    return this.ordersService.getMyOrders(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  findAllAdmin() {
    return this.ordersService.findAllAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/refunds')
  listMyRefunds(@Request() req) {
    return this.ordersService.listRefunds(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/pay-next')
  payNextInstallment(@Request() req, @Param('id') id: string) {
    return this.ordersService.payNextInstallment(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/confirm-delivery')
  confirmDelivery(@Request() req, @Param('id') id: string) {
    return this.ordersService.confirmDelivery(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/refund')
  requestRefund(@Request() req, @Param('id') id: string, @Body() refundOrderDto: RefundOrderDto) {
    return this.ordersService.requestRefund(req.user.id, id, refundOrderDto.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.ordersService.getOrderById(req.user.id, id);
  }
}
