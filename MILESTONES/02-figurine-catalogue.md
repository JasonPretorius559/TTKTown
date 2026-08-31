# Milestone 2 — Figurine Catalogue

## Goal
Build the master catalogue of collectible figurines.

## Important Design Rule
A `Figurine` is not the same as a `Listing`.

A figurine represents the collectible itself.

Example:

```text
S.H.Figuarts Super Saiyan Goku
```

A listing represents a specific seller offering their copy of that figurine for sale.

## Data Model

Add:

```prisma
model Figurine {
  id               String   @id @default(cuid())
  name             String
  slug             String   @unique
  franchise        String?
  character        String?
  manufacturer     String?
  series           String?
  scale            String?
  releaseYear      Int?
  description      String?
  primaryImageUrl  String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

Optional future normalization:
- Franchise
- Manufacturer
- Character
- Series
- Category

## Required Features

### 1. Browse catalogue
Create:

```text
/catalogue
```

The page should display figurine cards.

Each card should show:
- Image
- Name
- Franchise
- Manufacturer
- Character

### 2. Figurine detail page
Create:

```text
/figures/[slug]
```

Display:
- Name
- Main image
- Franchise
- Character
- Manufacturer
- Series
- Scale
- Release year
- Description
- Number of collectors who own it
- Number of active listings
- Number of wishlists

Initially, stats may display `0`.

### 3. Search
Users must be able to search by:
- Name
- Character
- Franchise
- Manufacturer

### 4. Filtering
Provide filters for:
- Franchise
- Manufacturer
- Scale
- Release year

### 5. Pagination
Do not load the entire catalogue at once.

Use:
- Cursor pagination, or
- Page-based pagination

### 6. Admin catalogue creation
Create an admin-only route:

```text
/admin/figures/new
```

Fields:
- Name
- Franchise
- Character
- Manufacturer
- Series
- Scale
- Release year
- Description
- Main image

### 7. Image upload
Integrate Cloudinary.

Requirements:
- Validate MIME type
- Validate size
- Save returned URL
- Show upload progress where practical

## UI Components

Create:
- `FigurineCard`
- `FigurineGrid`
- `FigurineSearch`
- `CatalogueFilters`
- `FigurineDetails`

## API / Server Actions

Suggested operations:

```text
getFigures()
getFigureBySlug()
searchFigures()
createFigure()
updateFigure()
```

## Validation
Use Zod or equivalent.

Required:
- Name
- Slug
- Main image for published catalogue items

## Acceptance Criteria
- Admin can add a figurine.
- Figurine appears in catalogue.
- Search finds matching figures.
- Filters narrow the catalogue.
- Clicking a figurine opens its detail page.
- Images load correctly.
- Duplicate slugs are prevented.

## Definition of Done
The platform has a reusable master catalogue that can power collections, wishlists, marketplace listings, and price history.
