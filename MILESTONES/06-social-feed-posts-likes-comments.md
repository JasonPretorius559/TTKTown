# Milestone 6 — Social Feed, Posts, Likes & Comments

## Goal
Create a collector-focused social feed.

## Data Model

Add:

```prisma
model Post {
  id        String   @id @default(cuid())
  authorId  String
  caption   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  author    User     @relation(fields: [authorId], references: [id])
  images    PostImage[]
  likes     PostLike[]
  comments  Comment[]
}

model PostImage {
  id     String @id @default(cuid())
  postId String
  url    String
  order  Int    @default(0)
}

model PostLike {
  id     String @id @default(cuid())
  userId String
  postId String

  @@unique([userId, postId])
}

model Comment {
  id        String   @id @default(cuid())
  authorId  String
  postId    String
  content   String
  createdAt DateTime @default(now())
}
```

## Required Features

### 1. Create post
Users can create posts containing:
- Caption
- 1 or more images

Optional future feature:
- Attach figurines from catalogue
- Attach marketplace listings

### 2. Feed
Create:

```text
/home
```

Feed should prioritize:
1. People the user follows
2. New posts
3. Future recommended content

For MVP, chronological ordering is acceptable.

### 3. Post component
Display:
- Author avatar
- Username
- Timestamp
- Images
- Caption
- Like count
- Comment count

Actions:
- Like
- Comment
- Share link
- Delete own post

### 4. Comments
Users can:
- Add comments
- Delete their own comments
- View existing comments

Nested replies are optional and should not be required for MVP.

### 5. Likes
Users can:
- Like a post
- Unlike a post

Prevent duplicate likes.

### 6. User post page
Create:

```text
/posts/[id]
```

Display complete post and comments.

### 7. Profile integration
User profiles should show posts under:

```text
/profile/[username]
```

### 8. Empty feed
If a user follows nobody:
- Suggest collectors
- Show recent popular posts
- Encourage catalogue browsing

## Moderation Preparation
Posts should support future:
- Reporting
- Admin removal
- Soft deletion

## Performance
- Paginate feed
- Lazy load images
- Avoid N+1 database queries

## Acceptance Criteria
- User can create a post.
- Post appears in feed.
- Followers can see the post.
- Likes work.
- Comments work.
- User can delete their own post.
- Feed is paginated.

## Definition of Done
The application now behaves like a collector social network rather than only an online marketplace.
