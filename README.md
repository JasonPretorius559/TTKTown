# TinkerTown

TinkerTown is a responsive social marketplace for collectible figurines, built from the ten specifications in `MILESTONES/`.

## Stack

- Next.js 16 App Router and strict TypeScript
- Firebase Authentication (email/password and Google)
- Cloud Firestore and Firebase Storage
- Private Vercel Blob storage for user-uploaded images
- CSS design system based on the supplied TinkerTown brand kit
- Zod and React Hook Form ready for production-backed forms

## Start locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The application requires a configured Firebase project. There is no local demo-data fallback.

Add the Firebase web application keys from Firebase Project Settings. The configured project id is `tinkertown-6563f`. Deploy database and upload protection with:

```powershell
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Production checklist

1. Add Firebase web keys and a production service account for trusted server operations.
2. Connect a private Vercel Blob store and configure `BLOB_READ_WRITE_TOKEN` in every deployment environment.
3. Create Cloud Functions or a trusted API for offers, orders, audit logs, and payment webhooks. Firestore rules intentionally prevent browser-created orders and audit entries.
4. Choose a South African payment provider after commercial review. Never mark an order paid from a browser callback.
5. Review Firestore query limits and indexes as production traffic grows.
6. Add error tracking and analytics, verify the custom domain, and complete legal review.
7. Run `npm run typecheck`, `npm run lint`, and `npm run build` before deployment.

## Milestone coverage

The application includes authentication and onboarding; responsive app navigation; catalogue and figure market pages; collection and wishlist tools; marketplace browse, listing, selling and report flows; public profiles; feed, likes, comments and posts; messaging, offers, and notifications; buyer orders and seller fulfilment; discovery and grouped global search; admin catalogue and moderation; legal pages; Firestore indexes; and role, ownership, and upload security rules.
