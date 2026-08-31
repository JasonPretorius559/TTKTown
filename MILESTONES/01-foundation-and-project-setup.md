# Milestone 1 — Foundation & Project Setup

## Goal
Create the base application architecture for the figurine marketplace/social platform.

## Outcome
At the end of this milestone, the project should run locally, have authentication, a database connection, a reusable UI shell, and protected application routes.

## Recommended Stack
- Next.js 15+
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL
- Prisma ORM
- Firebase Auth, Auth.js, or Clerk
- Cloudinary for images
- Vercel for deployment

## Core Tasks

### 1. Create the Next.js project
Create a new application using:
- App Router
- TypeScript
- ESLint
- Tailwind CSS

Suggested structure:

```text
src/
  app/
    (auth)/
    (app)/
    api/
  components/
  lib/
  services/
  types/
  hooks/
  prisma/
```

### 2. Configure environment variables
Create `.env.local`.

Required values should include:

```env
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
AUTH_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Do not commit secrets.

### 3. Configure PostgreSQL and Prisma
Create the Prisma configuration.

Initial models:

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  username    String   @unique
  displayName String?
  avatarUrl   String?
  bio         String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Generate and apply the first migration.

### 4. Authentication
Implement:
- Sign up
- Sign in
- Sign out
- Google sign-in
- Protected routes

Routes:

```text
/login
/register
/onboarding
```

### 5. Onboarding
After first login, require:
- Username
- Display name
- Optional avatar
- Optional bio

Usernames must be unique.

### 6. Application shell
Build:
- Top navigation
- Desktop sidebar
- Mobile navigation
- User dropdown
- Search placeholder
- Notification icon placeholder

Primary navigation:
- Home
- Marketplace
- Collection
- Wishlist
- Profile

### 7. Shared UI
Create reusable components:
- `PageHeader`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `UserAvatar`
- `ConfirmDialog`

## Pages Required

```text
/
 /login
 /register
 /onboarding
 /home
 /marketplace
 /collection
 /wishlist
 /profile/[username]
```

The non-authenticated `/` route should redirect appropriately.

## Technical Requirements
- Strict TypeScript
- Server-side validation where applicable
- Central database client
- No duplicated layout code
- Authentication available server-side
- Proper loading and error states

## Acceptance Criteria
- Application runs without errors.
- User can register.
- User can log in with Google.
- User can complete onboarding.
- Protected pages cannot be accessed while logged out.
- User remains logged in after refresh.
- Prisma can read/write the database.
- Main application navigation works on desktop and mobile.

## Definition of Done
The project has a stable base suitable for adding marketplace and social features without restructuring the entire application.
