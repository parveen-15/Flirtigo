import { Controller, Get, Post, Body, UseGuards, Headers, RawBody } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getCurrent(@GetUser('sub') userId: string) {
    return this.subscriptionsService.getCurrentSubscription(userId);
  }

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  createOrder(@GetUser('sub') userId: string, @Body() body: { plan: 'premium_monthly' | 'premium_yearly' }) {
    return this.subscriptionsService.createOrder(userId, body.plan);
  }

  @Post('verify-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  verifyPayment(
    @GetUser('sub') userId: string,
    @Body() body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ) {
    return this.subscriptionsService.verifyPayment(userId, body);
  }

  @Post('webhook')
  handleWebhook(@RawBody() payload: Buffer, @Headers('x-razorpay-signature') signature: string) {
    return this.subscriptionsService.handleWebhook(payload.toString(), signature);
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getPaymentHistory(@GetUser('sub') userId: string) {
    return this.subscriptionsService.getPaymentHistory(userId);
  }
}
