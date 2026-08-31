# Milestone 8 — Orders, Payments & Seller Reputation

## Goal
Convert accepted marketplace deals into trackable transactions.

## Important Scope Decision
Payments should be built only after the marketplace flow works correctly without them.

For South Africa, investigate:
- Paystack
- Peach Payments
- Yoco
- Ozow

Stripe availability and product support should be verified before implementation.

## Data Model

Add:

```prisma
model Order {
  id            String      @id @default(cuid())
  listingId     String
  buyerId       String
  sellerId      String
  amountCents   Int
  currency      String
  status        OrderStatus @default(PENDING_PAYMENT)
  paymentRef    String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
  DISPUTED
}
```

Reviews:

```prisma
model Review {
  id        String   @id @default(cuid())
  orderId   String   @unique
  reviewerId String
  sellerId  String
  rating    Int
  comment   String?
  createdAt DateTime @default(now())
}
```

## Order Flow

### Buy Now
1. Buyer clicks Buy Now.
2. Server validates listing is active.
3. Order is created.
4. Payment session is created.
5. Buyer completes payment.
6. Webhook validates payment.
7. Order becomes `PAID`.
8. Listing becomes `RESERVED` or `SOLD`.

### Accepted Offer
Accepted offers should be convertible into an order.

## Security
Never trust browser confirmation for payment success.

Payment state must be verified using:
- Payment provider webhook
- Server-side payment lookup

## Buyer Pages

```text
/orders
/orders/[id]
```

Display:
- Item
- Seller
- Price
- Payment status
- Order status

## Seller Pages

```text
/sales
/sales/[id]
```

Seller can:
- View paid orders
- Mark processing
- Mark shipped
- Add tracking number

## Reviews
After an order reaches `DELIVERED`:
- Buyer may leave 1–5 stars
- Optional review text

Seller profile should show:
- Average rating
- Review count

## Marketplace Trust UI
Display:
- Seller rating
- Total completed sales
- Account age

Future:
- Verified seller badge

## Payment Edge Cases
Handle:
- Duplicate webhook
- Failed payment
- Cancelled checkout
- Payment timeout
- Listing purchased by another user
- Refund state

Use idempotency.

## Acceptance Criteria
- Active listing can become an order.
- Payment status is server verified.
- Listing cannot be purchased twice.
- Buyer can view orders.
- Seller can manage sales.
- Buyer can review completed transaction.
- Seller rating updates correctly.

## Definition of Done
The platform can support a complete buyer-to-seller transaction lifecycle.
