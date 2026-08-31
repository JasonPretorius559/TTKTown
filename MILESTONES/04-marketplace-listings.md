# Milestone 4 — Marketplace Listings

## Goal
Allow users to list figurines for sale and browse available listings.

## Data Model

Add:

```prisma
model Listing {
  id           String        @id @default(cuid())
  sellerId     String
  figurineId   String
  title        String
  description  String?
  priceCents   Int
  currency     String        @default("ZAR")
  condition    ListingCondition
  status       ListingStatus @default(ACTIVE)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  seller       User          @relation(fields: [sellerId], references: [id])
  figurine     Figurine      @relation(fields: [figurineId], references: [id])
  images       ListingImage[]
}

model ListingImage {
  id        String  @id @default(cuid())
  listingId String
  url       String
  order     Int     @default(0)

  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
}

enum ListingCondition {
  SEALED
  NEW_OPENED
  LIKE_NEW
  GOOD
  FAIR
  DAMAGED
}

enum ListingStatus {
  DRAFT
  ACTIVE
  RESERVED
  SOLD
  REMOVED
}
```

## Required Features

### 1. Create listing
Create:

```text
/marketplace/sell
```

Steps:
1. Select figurine
2. Upload listing photos
3. Select condition
4. Enter title
5. Enter description
6. Enter price
7. Preview
8. Publish

### 2. Listing images
Allow multiple photos.

Requirements:
- Minimum 1 image
- Maximum configurable
- Reorder images
- Delete images
- First image becomes cover

### 3. Marketplace browse page
Create:

```text
/marketplace
```

Listing cards should show:
- Image
- Figurine name
- Listing title
- Price
- Condition
- Seller username
- Seller avatar

### 4. Filters
Support:
- Price range
- Franchise
- Manufacturer
- Condition
- Seller
- Newly listed

### 5. Sorting
Support:
- Newest
- Price low to high
- Price high to low

### 6. Listing page
Create:

```text
/marketplace/listings/[id]
```

Display:
- Image gallery
- Listing title
- Figurine information
- Seller information
- Condition
- Price
- Description
- Created date
- Seller rating placeholder
- Offer / Buy buttons as placeholders for later milestones

### 7. Seller listing management
Create:

```text
/selling
```

Tabs:
- Active
- Draft
- Reserved
- Sold

Allow:
- Edit
- Mark sold
- Remove listing
- Duplicate listing

## Security
Only the seller may edit their listing.

Admin may remove any listing.

## Validation
- Price > 0
- Minimum one image
- Valid figurine
- Description length limited
- Seller must be authenticated

## Acceptance Criteria
- User can create a listing.
- Listing appears in marketplace.
- Listing detail page works.
- Seller can edit their own listing.
- Other users cannot edit the listing.
- Filters and sorting work.
- Seller can mark a listing as sold.

## Definition of Done
The platform functions as a usable peer-to-peer collectible marketplace, even before integrated payments are added.
