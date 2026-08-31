# Milestone 10 — Admin, Moderation, Security & Launch

## Goal
Prepare the platform for real users.

## Admin Roles
Add roles:

```text
USER
MODERATOR
ADMIN
```

Store authorization server-side.

## Admin Dashboard

Create:

```text
/admin
```

Sections:
- Users
- Figurines
- Listings
- Posts
- Reports
- Orders
- Platform statistics

## Moderation

Create a report system.

Users should be able to report:
- Listings
- Posts
- Comments
- Users

Possible reasons:
- Scam
- Counterfeit
- Harassment
- Spam
- Inappropriate content
- Misleading listing
- Other

Suggested model:

```prisma
model Report {
  id          String       @id @default(cuid())
  reporterId  String
  targetType  ReportTarget
  targetId    String
  reason      String
  details     String?
  status      ReportStatus @default(OPEN)
  createdAt   DateTime     @default(now())
}

enum ReportTarget {
  USER
  LISTING
  POST
  COMMENT
}

enum ReportStatus {
  OPEN
  REVIEWING
  RESOLVED
  DISMISSED
}
```

## Admin Actions
Moderators should be able to:
- Remove listing
- Remove post
- Remove comment
- Suspend user
- Restore content
- Resolve report

Actions should be logged.

## Audit Log
Create admin audit entries for:
- Suspension
- Content removal
- Figure edits
- Report resolution

## Security Review

### Authentication
Verify:
- Protected routes
- Server-side authorization
- Session security

### API
Verify:
- Rate limits
- Input validation
- Authentication checks
- Ownership checks
- CSRF considerations
- No sensitive error leaks

### Uploads
Verify:
- MIME validation
- File size limits
- Image-only uploads
- No executable uploads

### Database
Verify:
- Unique constraints
- Foreign keys
- Cascades
- Appropriate indexes
- Backups

## Marketplace Safety
Add:
- Clear listing condition definitions
- Seller identity indicators
- Report button
- Scam warning guidance
- Counterfeit reporting

## Legal Pages
Create:

```text
/terms
/privacy
/community-guidelines
/marketplace-rules
```

Payment-related legal requirements should be reviewed before production launch.

## Observability
Add:
- Application logging
- Error tracking
- Performance monitoring

Suggested:
- Sentry
- Vercel Analytics

## Testing

### Unit Tests
Focus on:
- Pricing logic
- Offer transitions
- Order transitions
- Permissions

### Integration Tests
Test:
- Authentication
- Listing creation
- Offer acceptance
- Order creation
- Reviews

### End-to-End
Critical flow:

```text
Register
→ Add figure to collection
→ Create listing
→ Another user finds listing
→ Makes offer
→ Seller accepts
→ Buyer purchases
→ Seller ships
→ Buyer reviews seller
```

## Deployment
Production checklist:
- Environment variables configured
- Database migrations applied
- Production database backed up
- Cloudinary production config
- Payment webhooks configured
- Error tracking enabled
- Domain configured
- HTTPS verified

## Launch Metrics
Track:
- Signups
- Daily active users
- Figures added to collections
- Listings created
- Offers submitted
- Completed sales
- Posts created
- Retention

## Future Features
Not required for launch:
- Auctions
- Trades
- Barcode scanning
- AI figure recognition
- Collector groups
- Events/conventions
- Seller verification
- Shipping integration
- Mobile app
- Recommendation engine
- Collection rankings
- Achievement system

## Acceptance Criteria
- Admin dashboard works.
- Reports can be submitted and resolved.
- Moderation actions require correct roles.
- Critical user flows have automated tests.
- Production monitoring is enabled.
- Platform is deployable using documented configuration.

## Definition of Done
The figurine marketplace/social network is secure enough, moderated enough, and operationally prepared for an initial public release.
