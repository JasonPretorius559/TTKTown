# Milestone 7 — Messaging, Offers & Notifications

## Goal
Allow buyers and sellers to communicate and negotiate.

## Data Model

Add:

```prisma
model Conversation {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ConversationMember {
  id             String @id @default(cuid())
  conversationId String
  userId         String

  @@unique([conversationId, userId])
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  senderId       String
  content        String
  createdAt      DateTime @default(now())
  readAt         DateTime?
}

model Offer {
  id          String      @id @default(cuid())
  listingId   String
  buyerId     String
  amountCents Int
  status      OfferStatus @default(PENDING)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

enum OfferStatus {
  PENDING
  ACCEPTED
  REJECTED
  WITHDRAWN
  EXPIRED
}
```

Add notification support:

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String
  title     String
  body      String?
  link      String?
  readAt    DateTime?
  createdAt DateTime @default(now())
}
```

## Messaging

Create:

```text
/messages
/messages/[conversationId]
```

Users should be able to:
- Start conversation from listing
- Send message
- See unread indicator
- Mark conversation as read

## Offers
From a listing:

```text
Make Offer
```

Buyer enters price.

Seller can:
- Accept
- Reject

Buyer can:
- Withdraw

### Business Rules
- Seller cannot offer on own listing.
- Offer must be positive.
- Accepted offer should reserve listing.
- Only one accepted offer per listing.
- Sold listings reject new offers.

## Notifications
Generate notifications for:
- New follower
- Post like
- Post comment
- New message
- New offer
- Offer accepted
- Offer rejected
- Listing sold

Create:

```text
/notifications
```

Navigation should show unread count.

## Real-Time Options
MVP:
- Polling
- Server refresh

Later:
- Pusher
- Ably
- Supabase Realtime
- WebSockets

Do not make full real-time infrastructure mandatory for this milestone.

## Acceptance Criteria
- Buyer can message seller.
- Conversations persist.
- User sees unread messages.
- Buyer can submit an offer.
- Seller can accept or reject an offer.
- Accepted offer reserves listing.
- Notifications are created for key events.
- Notification links open relevant pages.

## Definition of Done
Marketplace participants can negotiate and communicate without leaving the platform.
