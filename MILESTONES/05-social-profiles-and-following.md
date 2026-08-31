# Milestone 5 — Social Profiles & Following

## Goal
Turn marketplace accounts into collector identities.

## Data Model

Add:

```prisma
model Follow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())

  @@unique([followerId, followingId])
}
```

Expand `User` with optional profile fields:

```text
location
website
bannerUrl
collectorSince
```

## User Profile

Route:

```text
/profile/[username]
```

Header:
- Avatar
- Banner
- Username
- Display name
- Bio
- Location
- Join date
- Follower count
- Following count
- Follow button

Stats:
- Collection count
- Listings count
- Wishlist count
- Sold count

Tabs:
- Overview
- Collection
- Listings
- Wishlist
- Posts

## Profile Editing
Create:

```text
/settings/profile
```

Editable:
- Display name
- Bio
- Avatar
- Banner
- Location
- Website

Username changes should have restrictions.

## Following
Users can:
- Follow other collectors
- Unfollow collectors
- View followers
- View following

Routes:

```text
/profile/[username]/followers
/profile/[username]/following
```

## Collector Highlights
Profile overview should show:
- Recent collection additions
- Featured figures
- Current listings
- Wishlist grails

## Featured Collection Items
Allow users to pin a small number of collection items to their profile.

Suggested limit:
- 3 to 6 figures

## Search Users
Global search should now support:
- Figures
- Listings
- Users

## Notifications
Prepare for follow notifications:

```text
Jason followed you.
```

Actual notification system may be implemented in Milestone 7.

## Abuse Prevention
- Cannot follow yourself.
- Duplicate follows prevented.
- Block future support should be considered in schema design.

## Acceptance Criteria
- Every user has a public profile.
- Users can follow/unfollow one another.
- Follower counts update correctly.
- Profiles display collections and active listings.
- Users can edit profile information.
- User search works.

## Definition of Done
Collectors now have identities, audiences, and profiles worth returning to.
