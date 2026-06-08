import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubscriptionsService {
  private razorpay: Razorpay;

  constructor(
    @Inject(DB_POOL) private readonly db: Pool,
    private readonly config: ConfigService,
  ) {
    this.razorpay = new Razorpay({
      key_id: config.get('RAZORPAY_KEY_ID') || 'rzp_test_placeholder',
      key_secret: config.get('RAZORPAY_KEY_SECRET') || 'placeholder',
    });
  }

  async getCurrentSubscription(userId: string) {
    const result = await this.db.query(
      'SELECT * FROM subscriptions WHERE user_id = $1',
      [userId],
    );
    return result.rows[0];
  }

  async createOrder(userId: string, plan: 'premium_monthly' | 'premium_yearly') {
    const amounts = {
      premium_monthly: this.config.get('PREMIUM_MONTHLY_PRICE', 199),
      premium_yearly: this.config.get('PREMIUM_YEARLY_PRICE', 1499),
    };

    const amount = amounts[plan] * 100; // Razorpay expects paise

    const order = await this.razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `order_${uuidv4()}`,
      notes: { userId, plan },
    });

    // Save pending payment
    await this.db.query(
      `INSERT INTO payments (id, user_id, amount, currency, status, payment_method, razorpay_order_id, metadata)
       VALUES ($1, $2, $3, 'INR', 'pending', 'razorpay', $4, $5)`,
      [uuidv4(), userId, amount / 100, order.id, JSON.stringify({ plan })],
    );

    return {
      orderId: order.id,
      amount,
      currency: 'INR',
      keyId: this.config.get('RAZORPAY_KEY_ID'),
    };
  }

  async verifyPayment(userId: string, data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.get<string>('RAZORPAY_KEY_SECRET', ''))
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== data.razorpaySignature) {
      throw new BadRequestException('Payment verification failed');
    }

    const paymentRecord = await this.db.query(
      'SELECT * FROM payments WHERE razorpay_order_id = $1 AND user_id = $2',
      [data.razorpayOrderId, userId],
    );

    if (!paymentRecord.rows[0]) throw new NotFoundException('Payment record not found');

    const plan = paymentRecord.rows[0].metadata?.plan;
    const durationDays = plan === 'premium_yearly' ? 365 : 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE payments SET status = 'success', razorpay_payment_id = $1, razorpay_signature = $2
         WHERE razorpay_order_id = $3`,
        [data.razorpayPaymentId, data.razorpaySignature, data.razorpayOrderId],
      );

      await client.query(
        `INSERT INTO subscriptions (user_id, plan, status, expires_at, razorpay_subscription_id)
         VALUES ($1, $2, 'active', $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET
           plan = EXCLUDED.plan, status = 'active', expires_at = EXCLUDED.expires_at,
           razorpay_subscription_id = EXCLUDED.razorpay_subscription_id`,
        [userId, plan, expiresAt, data.razorpayPaymentId],
      );

      await client.query(
        'UPDATE users SET is_premium = true WHERE id = $1',
        [userId],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { success: true, plan, expiresAt };
  }

  async handleWebhook(payload: string, signature: string) {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.get<string>('RAZORPAY_WEBHOOK_SECRET', ''))
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(payload);
    this.handleWebhookEvent(event);
    return { status: 'ok' };
  }

  private async handleWebhookEvent(event: any) {
    if (event.event === 'subscription.charged') {
      // Handle subscription renewal
    } else if (event.event === 'subscription.cancelled') {
      const subscriptionId = event.payload?.subscription?.entity?.id;
      if (subscriptionId) {
        await this.db.query(
          'UPDATE subscriptions SET status = $1 WHERE razorpay_subscription_id = $2',
          ['cancelled', subscriptionId],
        );
      }
    }
  }

  async getPaymentHistory(userId: string) {
    const result = await this.db.query(
      `SELECT * FROM payments WHERE user_id = $1 AND status = 'success' ORDER BY created_at DESC LIMIT 20`,
      [userId],
    );
    return result.rows;
  }
}
