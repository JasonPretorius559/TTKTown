# Milestone 9 — Search, Discovery, Market Data & Product Polish

## Goal
Make the platform useful for discovering collectibles and understanding the market.

## Global Search
Search should cover:
- Figurines
- Listings
- Users
- Franchises

Create:

```text
/search?q=
```

Group results by type.

## Search Technology
Start with PostgreSQL.

Possible upgrades:
- PostgreSQL full-text search
- Meilisearch
- Typesense
- Algolia

Do not add a separate search engine until database search becomes limiting.

## Discovery

Create:

```text
/discover
```

Sections:
- Trending figures
- Newly listed
- Popular collectors
- Most wishlisted
- Recently added to collections
- Popular franchises

## Market Statistics
On each figurine page, calculate:

```text
Active Listings
Lowest Price
Average Asking Price
Highest Price
Number Owned
Number Wanted
```

If order history exists, also calculate:
- Recent sale price
- Average sold price
- 30-day average
- Price trend

## Price History Model

Optional model:

```prisma
model SaleRecord {
  id          String   @id @default(cuid())
  figurineId  String
  orderId     String   @unique
  priceCents  Int
  currency    String
  soldAt      DateTime
}
```

## Figurine Market Page
Expand:

```text
/figures/[slug]
```

Add:
- Price stats
- Active listings
- Recent sales
- Ownership stats
- Wishlist stats

## Collection Value
Calculate estimated user collection value using:
1. Recent sales where possible
2. Marketplace median otherwise
3. No value if insufficient data

Display:

```text
Estimated Collection Value
R 42,650
```

Make clear that the figure is an estimate.

## UI Polish
Improve:
- Skeleton loaders
- Empty states
- Responsive design
- Error handling
- Mobile navigation
- Image optimization
- Infinite scroll where appropriate

## Performance
Review:
- Database indexes
- Query counts
- Server response times
- Image sizes
- Caching
- Pagination

Potential indexes:
- Figurine slug
- Listing status
- Listing price
- Listing figurine ID
- Follow relations
- Post creation time
- Notification user/read state

## Acceptance Criteria
- Global search works across key entities.
- Discovery page provides useful recommendations.
- Figurine pages show marketplace stats.
- Collection can show estimated value.
- Core pages are responsive.
- Major database queries are indexed and paginated.

## Definition of Done
The application feels like a dedicated collectibles platform rather than a CRUD marketplace.
