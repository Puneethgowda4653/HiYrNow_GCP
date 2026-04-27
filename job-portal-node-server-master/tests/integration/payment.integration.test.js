/**
 * Integration Tests - Payment Flow
 * 
 * Tests the complete payment workflow:
 * - Payment initiation
 * - Idempotency (prevent duplicate charges)
 * - Webhook handling
 * - Credit points integration
 * - Premium subscription
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const {
  connectTestDB,
  disconnectTestDB,
  clearTestDB,
} = require('../setup');

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }));

  // Mount services
  require('../../services/user.service.server')(app);
  require('../../services/payment.service.server')(app);
  require('../../services/credit-points.service.server')(app);

  return app;
}

describe('Payment Flow - Integration Tests', () => {
  let app;
  let userCookie;
  let userId;

  beforeAll(async () => {
    await connectTestDB();
    app = createTestApp();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Create and login as user
    const userRegister = await request(app)
      .post('/api/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      });

    userId = userRegister.body._id;

    const userLogin = await request(app)
      .post('/api/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

    userCookie = userLogin.headers['set-cookie'];
  });

  describe('Credit Points Purchase', () => {
    it('should initiate credit points purchase', async () => {
      const response = await request(app)
        .post('/api/credit-points/purchase')
        .set('Cookie', userCookie)
        .send({
          amount: 1000, // 1000 points
          paymentMethod: 'stripe',
        })
        .expect(201);

      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('paymentUrl');
      expect(response.body.amount).toBe(1000);
      expect(response.body.status).toBe('pending');
    });

    it('should reject purchase with invalid amount', async () => {
      await request(app)
        .post('/api/credit-points/purchase')
        .set('Cookie', userCookie)
        .send({
          amount: -100, // Negative amount
          paymentMethod: 'stripe',
        })
        .expect(400);

      await request(app)
        .post('/api/credit-points/purchase')
        .set('Cookie', userCookie)
        .send({
          amount: 0, // Zero amount
          paymentMethod: 'stripe',
        })
        .expect(400);
    });

    it('should require authentication for purchase', async () => {
      await request(app)
        .post('/api/credit-points/purchase')
        .send({
          amount: 1000,
          paymentMethod: 'stripe',
        })
        .expect(401);
    });
  });

  describe('Payment Idempotency', () => {
    it('should prevent duplicate payments with same idempotency key', async () => {
      const idempotencyKey = 'test-payment-key-123';

      // First request
      const response1 = await request(app)
        .post('/api/credit-points/purchase')
        .set('Cookie', userCookie)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          amount: 1000,
          paymentMethod: 'stripe',
        })
        .expect(201);

      const orderId1 = response1.body.orderId;

      // Second request with same key (should return cached response)
      const response2 = await request(app)
        .post('/api/credit-points/purchase')
        .set('Cookie', userCookie)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          amount: 1000,
          paymentMethod: 'stripe',
        })
        .expect(201);

      const orderId2 = response2.body.orderId;

      // Should return same order ID (idempotent)
      expect(orderId1).toBe(orderId2);
    });

    it('should allow different requests with different idempotency keys', async () => {
      // First request
      const response1 = await request(app)
        .post('/api/credit-points/purchase')
        .set('Cookie', userCookie)
        .set('Idempotency-Key', 'key-1')
        .send({
          amount: 1000,
          paymentMethod: 'stripe',
        })
        .expect(201);

      // Second request with different key
      const response2 = await request(app)
        .post('/api/credit-points/purchase')
        .set('Cookie', userCookie)
        .set('Idempotency-Key', 'key-2')
        .send({
          amount: 2000,
          paymentMethod: 'stripe',
        })
        .expect(201);

      // Should create different orders
      expect(response1.body.orderId).not.toBe(response2.body.orderId);
    });
  });

  describe('Payment Webhook (Verification)', () => {
    let orderId;

    beforeEach(async () => {
      // Create a pending payment
      const purchaseResponse = await request(app)
        .post('/api/credit-points/purchase')
        .set('Cookie', userCookie)
        .send({
          amount: 1000,
          paymentMethod: 'stripe',
        });

      orderId = purchaseResponse.body.orderId;
    });

    it('should verify successful payment via webhook', async () => {
      const response = await request(app)
        .post('/api/payment/webhook/stripe')
        .send({
          event: 'payment_intent.succeeded',
          data: {
            object: {
              id: orderId,
              amount: 1000,
              status: 'succeeded',
            },
          },
        })
        .expect(200);

      expect(response.body.status).toBe('success');

      // Verify credit points were added
      const balanceResponse = await request(app)
        .get('/api/credit-points/balance')
        .set('Cookie', userCookie);

      expect(balanceResponse.body.balance).toBeGreaterThanOrEqual(1000);
    });

    it('should handle failed payment via webhook', async () => {
      await request(app)
        .post('/api/payment/webhook/stripe')
        .send({
          event: 'payment_intent.payment_failed',
          data: {
            object: {
              id: orderId,
              amount: 1000,
              status: 'failed',
            },
          },
        })
        .expect(200);

      // Verify credit points were not added
      const balanceResponse = await request(app)
        .get('/api/credit-points/balance')
        .set('Cookie', userCookie);

      expect(balanceResponse.body.balance).toBe(0);
    });

    it('should be idempotent for webhook processing', async () => {
      const webhookPayload = {
        event: 'payment_intent.succeeded',
        data: {
          object: {
            id: orderId,
            amount: 1000,
            status: 'succeeded',
          },
        },
      };

      // Process webhook twice
      await request(app)
        .post('/api/payment/webhook/stripe')
        .send(webhookPayload)
        .expect(200);

      await request(app)
        .post('/api/payment/webhook/stripe')
        .send(webhookPayload)
        .expect(200);

      // Verify credit points added only once
      const balanceResponse = await request(app)
        .get('/api/credit-points/balance')
        .set('Cookie', userCookie);

      expect(balanceResponse.body.balance).toBe(1000); // Not 2000
    });
  });

  describe('Credit Points Usage', () => {
    beforeEach(async () => {
      // Add credit points to user
      await request(app)
        .post('/api/credit-points/add')
        .set('Cookie', userCookie)
        .send({
          amount: 1000,
        });
    });

    it('should check credit points balance', async () => {
      const response = await request(app)
        .get('/api/credit-points/balance')
        .set('Cookie', userCookie)
        .expect(200);

      expect(response.body).toHaveProperty('balance');
      expect(response.body.balance).toBe(1000);
    });

    it('should deduct credit points for feature usage', async () => {
      // Use a feature that costs points (e.g., view recruiter contact)
      await request(app)
        .post('/api/credit-points/deduct')
        .set('Cookie', userCookie)
        .send({
          feature: 'view_contact',
          amount: 50,
        })
        .expect(200);

      // Check balance after deduction
      const balanceResponse = await request(app)
        .get('/api/credit-points/balance')
        .set('Cookie', userCookie);

      expect(balanceResponse.body.balance).toBe(950);
    });

    it('should reject deduction when insufficient balance', async () => {
      // Try to deduct more than available
      await request(app)
        .post('/api/credit-points/deduct')
        .set('Cookie', userCookie)
        .send({
          feature: 'premium_feature',
          amount: 2000, // More than balance (1000)
        })
        .expect(400);

      // Balance should remain unchanged
      const balanceResponse = await request(app)
        .get('/api/credit-points/balance')
        .set('Cookie', userCookie);

      expect(balanceResponse.body.balance).toBe(1000);
    });

    it('should track credit point transactions', async () => {
      // Deduct points
      await request(app)
        .post('/api/credit-points/deduct')
        .set('Cookie', userCookie)
        .send({
          feature: 'view_contact',
          amount: 50,
        });

      // Add more points
      await request(app)
        .post('/api/credit-points/add')
        .set('Cookie', userCookie)
        .send({
          amount: 500,
        });

      // Get transaction history
      const historyResponse = await request(app)
        .get('/api/credit-points/history')
        .set('Cookie', userCookie)
        .expect(200);

      expect(Array.isArray(historyResponse.body)).toBeTruthy();
      expect(historyResponse.body.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Premium Subscription', () => {
    it('should upgrade user to premium', async () => {
      const response = await request(app)
        .post('/api/premium/subscribe')
        .set('Cookie', userCookie)
        .send({
          plan: 'monthly',
          paymentMethod: 'stripe',
        })
        .expect(201);

      expect(response.body).toHaveProperty('subscriptionId');
      expect(response.body.status).toBe('active');
    });

    it('should check premium status', async () => {
      // Subscribe to premium
      await request(app)
        .post('/api/premium/subscribe')
        .set('Cookie', userCookie)
        .send({
          plan: 'monthly',
          paymentMethod: 'stripe',
        });

      // Check status
      const statusResponse = await request(app)
        .get('/api/premium/status')
        .set('Cookie', userCookie)
        .expect(200);

      expect(statusResponse.body.isPremium).toBeTruthy();
      expect(statusResponse.body.plan).toBe('monthly');
    });

    it('should allow premium user to access premium features', async () => {
      // Subscribe to premium
      await request(app)
        .post('/api/premium/subscribe')
        .set('Cookie', userCookie)
        .send({
          plan: 'monthly',
          paymentMethod: 'stripe',
        });

      // Access premium feature
      const response = await request(app)
        .get('/api/premium-only-feature')
        .set('Cookie', userCookie)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should deny non-premium user from accessing premium features', async () => {
      await request(app)
        .get('/api/premium-only-feature')
        .set('Cookie', userCookie)
        .expect(403);
    });

    it('should cancel premium subscription', async () => {
      // Subscribe
      await request(app)
        .post('/api/premium/subscribe')
        .set('Cookie', userCookie)
        .send({
          plan: 'monthly',
          paymentMethod: 'stripe',
        });

      // Cancel
      await request(app)
        .post('/api/premium/cancel')
        .set('Cookie', userCookie)
        .expect(200);

      // Verify status
      const statusResponse = await request(app)
        .get('/api/premium/status')
        .set('Cookie', userCookie);

      expect(statusResponse.body.isPremium).toBeFalsy();
    });
  });

  describe('Refund Processing', () => {
    let orderId;

    beforeEach(async () => {
      // Create and complete a payment
      const purchaseResponse = await request(app)
        .post('/api/credit-points/purchase')
        .set('Cookie', userCookie)
        .send({
          amount: 1000,
          paymentMethod: 'stripe',
        });

      orderId = purchaseResponse.body.orderId;

      // Simulate successful payment
      await request(app)
        .post('/api/payment/webhook/stripe')
        .send({
          event: 'payment_intent.succeeded',
          data: {
            object: {
              id: orderId,
              amount: 1000,
              status: 'succeeded',
            },
          },
        });
    });

    it('should process refund and deduct credit points', async () => {
      // Get balance before refund
      const balanceBefore = await request(app)
        .get('/api/credit-points/balance')
        .set('Cookie', userCookie);

      // Request refund
      await request(app)
        .post('/api/payment/refund')
        .set('Cookie', userCookie)
        .send({
          orderId: orderId,
          reason: 'Changed my mind',
        })
        .expect(200);

      // Verify credit points were deducted
      const balanceAfter = await request(app)
        .get('/api/credit-points/balance')
        .set('Cookie', userCookie);

      expect(balanceAfter.body.balance).toBeLessThan(balanceBefore.body.balance);
    });

    it('should not allow refund if points already used', async () => {
      // Use all the credit points
      await request(app)
        .post('/api/credit-points/deduct')
        .set('Cookie', userCookie)
        .send({
          feature: 'bulk_action',
          amount: 1000,
        });

      // Try to refund
      const response = await request(app)
        .post('/api/payment/refund')
        .set('Cookie', userCookie)
        .send({
          orderId: orderId,
          reason: 'Changed my mind',
        })
        .expect(400);

      expect(response.body.error).toContain('insufficient');
    });
  });

  describe('Payment Error Handling', () => {
    it('should handle payment gateway timeout', async () => {
      // Simulate timeout
      const response = await request(app)
        .post('/api/credit-points/purchase')
        .set('Cookie', userCookie)
        .send({
          amount: 1000,
          paymentMethod: 'slow_gateway', // Mock slow gateway
        })
        .expect(503);

      expect(response.body.error).toContain('timeout');
    });

    it('should handle invalid payment method', async () => {
      await request(app)
        .post('/api/credit-points/purchase')
        .set('Cookie', userCookie)
        .send({
          amount: 1000,
          paymentMethod: 'invalid_method',
        })
        .expect(400);
    });

    it('should rollback on payment processing error', async () => {
      const balanceBefore = await request(app)
        .get('/api/credit-points/balance')
        .set('Cookie', userCookie);

      // Attempt payment that will fail
      await request(app)
        .post('/api/credit-points/purchase')
        .set('Cookie', userCookie)
        .send({
          amount: 1000,
          paymentMethod: 'failing_gateway',
        })
        .expect(500);

      // Balance should remain unchanged
      const balanceAfter = await request(app)
        .get('/api/credit-points/balance')
        .set('Cookie', userCookie);

      expect(balanceAfter.body.balance).toBe(balanceBefore.body.balance);
    });
  });
});

