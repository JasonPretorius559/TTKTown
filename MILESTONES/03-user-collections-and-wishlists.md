# Milestone 3 — User Collections & Wishlists

## Goal
Allow users to build a personal digital collection and wishlist.

## Data Model

Add:

```prisma
model CollectionItem {
  id         String   @id @default(cuid())
  userId     String
  figurineId String
  quantity   Int      @default(1)
  condition  String?
  notes      String?
  acquiredAt DateTime?
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id])
  figurine   Figurine @relation(fields: [figurineId], references: [id])

  @@unique([userId, figurineId])
}

model WishlistItem {
  id         String   @id @default(cuid())
  userId     String
  figurineId String
  priority   Int      @default(3)
  notes      String?
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id])
  figurine   Figurine @relation(fields: [figurineId], references: [id])

  @@unique([userId, figurineId])
}
```

## Required Features

### 1. Add to collection
From a figurine page, users can choose:

```text
Add to Collection
```

Optional fields:
- Quantity
- Condition
- Acquisition date
- Notes

### 2. Add to wishlist
From a figurine page:

```text
Add to Wishlist
```

Fields:
- Priority
- Notes

Suggested priority values:
- Low
- Medium
- High
- Grail

### 3. Collection page

Create:

```text
/collection
```

Display:
- Total figure count
- Unique figure count
- Franchise breakdown
- Collection grid

Filters:
- Franchise
- Manufacturer
- Condition

Sort:
- Recently added
- Name
- Release year

### 4. Wishlist page

Create:

```text
/wishlist
```

Display:
- Figurine
- Priority
- Number of marketplace listings
- Lowest current marketplace price

The price can remain unavailable until marketplace listings exist.

### 5. Remove and edit
Users must be able to:
- Edit collection metadata
- Remove collection items
- Edit wishlist priority
- Remove wishlist items

### 6. Public collections
User profile pages should have:

```text
/profile/[username]/collection
/profile/[username]/wishlist
```

Privacy setting can be added later.

### 7. Collection statistics
Show:
- Total items
- Unique collectibles
- Top franchises
- Top manufacturers

## UI Components
Create:
- `CollectionCard`
- `WishlistCard`
- `CollectionStats`
- `CollectionFilters`
- `AddToCollectionDialog`
- `AddToWishlistButton`

## Business Rules
- Same figurine cannot have duplicate collection rows per user.
- Quantity can increase instead.
- Same figurine cannot appear twice in a wishlist.
- Removing a figurine from wishlist should not affect collection data.

## Acceptance Criteria
- User can add a figure to their collection.
- User can add a figure to their wishlist.
- Collection page updates immediately.
- Wishlist page updates immediately.
- Duplicate entries are prevented.
- Public profile can display the collection.

## Definition of Done
Users now have a meaningful reason to maintain a profile even if they never buy or sell anything.
