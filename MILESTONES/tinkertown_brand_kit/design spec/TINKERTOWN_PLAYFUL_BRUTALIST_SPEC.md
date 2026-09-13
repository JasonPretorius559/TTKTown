# Tinkertown Brand Implementation Spec
## Direction: Playful Brutalist

Implement the full Tinkertown visual identity across the product using a **Playful Brutalist** design system.

The goal is to make Tinkertown feel **bold, playful, collectible, modern, slightly rebellious, community-driven, memorable, and simple to use**.

The product should feel like a mix of a collectible toy marketplace, a modern social platform, and an editorial design brand.

Do not make it look childish, overly corporate, overly luxurious, or like a generic SaaS dashboard.

---

## 1. Brand Essence

Tinkertown is a modern collectibles platform built around:

- collecting
- trading
- discovering
- selling
- sharing
- community
- stories behind figures

### Primary brand line

**Little People. Big Stories.**

### Secondary brand phrases

Use these sparingly and intentionally:

- Collect Something Kinder.
- Good Figures. Good People.
- A Happier Shelf. A Brighter World.
- A Smaller World. A Brighter Tomorrow.
- Toys. People. Places.
- Collect. Trade. Share. Play.
- Every Figure Has a Story.
- Made for Collectors.
- Your Collection, Your Story.

Suitable placements:

- hero sections
- onboarding
- empty states
- collection pages
- profile pages
- marketplace promotional blocks
- community moments
- packaging-inspired UI panels

---

## 2. Visual Personality

The visual language should combine:

- heavy typography
- strong black-and-white contrast
- clean whitespace
- simple geometric shapes
- bold borders
- oversized headings
- flat color blocks
- playful iconography
- rounded product imagery
- sticker-style badges
- deliberate asymmetry
- editorial layouts

The interface should feel energetic without becoming cluttered.

### Avoid

- excessive gradients
- glassmorphism
- soft pastel SaaS aesthetics
- generic blue primary buttons
- excessive shadows
- excessive border radius
- tiny typography
- dense enterprise dashboards
- ornamental decoration without purpose
- overly cute children’s-toy styling

---

## 3. Core Color System

### Primary Palette

| Token | Hex | Usage |
|---|---|---|
| Black | `#000000` | Primary text, outlines, strong surfaces, CTA buttons |
| White | `#FFFFFF` | Primary background, inverse text |
| Tomato Red | `#FF3830` | Main brand accent, primary highlight, active states |
| Soft Yellow | `#FFE600` | Secondary highlight, stickers, discovery moments |
| Neutral Gray | `#9CA3AF` | Metadata, neutral accents |

### Supporting Neutrals

| Token | Hex |
|---|---|
| Background Soft | `#F7F7F5` |
| Border Light | `#E5E7EB` |
| Gray Medium | `#6B7280` |
| Gray Dark | `#1F1F1F` |

### Functional / Rarity Accents

| Meaning | Hex |
|---|---|
| Rare | `#FF3830` |
| Uncommon | `#FFE600` |
| Epic | `#8B5CF6` |
| Success | `#22C55E` |
| Info | `#3B82F6` |

Do not introduce unrelated large accent palettes. Most screens should remain predominantly white, black, red, and yellow.

### Recommended design tokens

```css
:root {
  --tt-black: #000000;
  --tt-white: #ffffff;
  --tt-red: #ff3830;
  --tt-yellow: #ffe600;
  --tt-gray-100: #f7f7f5;
  --tt-gray-200: #e5e7eb;
  --tt-gray-500: #9ca3af;
  --tt-gray-600: #6b7280;
  --tt-gray-900: #1f1f1f;
  --tt-purple: #8b5cf6;
  --tt-green: #22c55e;
  --tt-blue: #3b82f6;
}
```

---

## 4. Typography

Typography is one of the most important parts of the identity.

### Display Typeface

Preferred:

- Montserrat Black
- Montserrat ExtraBold

Use for:

- hero statements
- page titles
- section headings
- marketing callouts
- large stats
- major empty-state messages
- sticker text

Use uppercase selectively, especially for strong editorial statements.

Examples:

**LITTLE PEOPLE.\nBIG STORIES.**

**GOOD FIGURES.\nGOOD PEOPLE.**

### Supporting Typeface

Use **Inter** for:

- body text
- product metadata
- navigation
- forms
- filters
- button labels
- profile information
- messages

### Suggested scale

| Role | Desktop | Mobile |
|---|---:|---:|
| Hero XL | 72–96px | 44–56px |
| Hero | 56–72px | 36–44px |
| Page H1 | 44–56px | 32–40px |
| H2 | 32–40px | 26–32px |
| H3 | 22–28px | 20–24px |
| Body | 15–17px | 15–16px |
| Small | 12–14px | 12–14px |

### Typography behavior

- Keep display text tightly tracked.
- Prefer strong line breaks instead of long single-line headings.
- Body copy must remain highly readable.
- Avoid using the display font for long paragraphs.
- Do not use more than two font families in the product.

---

## 5. Logo System

The preferred logo system consists of:

1. **Primary horizontal lockup** — house/town icon + TINKERTOWN wordmark.
2. **Stacked lockup** — icon above or beside compact wordmark.
3. **Icon-only mark** — simplified house character.
4. **Monochrome variants** — black-on-white and white-on-black.

### Logo personality

The icon should feel like:

- a tiny house
- a toy silhouette
- a friendly character
- a collectible mark

Keep it geometric, simple, and recognizable at small sizes.

### Logo rules

- Never stretch the logo.
- Never rotate it.
- Never add drop shadows.
- Never place the full-color mark on visually noisy backgrounds.
- Maintain a minimum clear space equal to approximately the icon width around the full lockup.
- Use icon-only treatment for compact mobile contexts and avatars.

### Minimum sizing guidance

- Digital full logo: approximately 24px high minimum.
- Digital icon: approximately 20px minimum.
- Print icon: approximately 8mm minimum.

---

## 6. Shape Language

Tinkertown should use a controlled brutalist geometry.

### Borders

- Default border: 1px solid black or neutral gray.
- Strong editorial border: 2px solid black.
- Avoid faint, barely visible card borders where hierarchy matters.

### Radius

Use radius sparingly.

Suggested scale:

- `0px`: editorial panels, banners
- `6px`: controls
- `10px`: product cards
- `16px`: hero image containers
- fully rounded: pills, avatars, small badges only

Do not make every surface a rounded floating card.

### Shadows

Default: no shadow.

When separation is necessary, use a hard offset shadow rather than soft SaaS shadows.

Example:

```css
box-shadow: 4px 4px 0 #000;
```

Use this only for important playful moments.

---

## 7. Spacing System

Use a consistent 4px-based spacing system.

Recommended tokens:

- 4px
- 8px
- 12px
- 16px
- 24px
- 32px
- 48px
- 64px
- 96px
- 128px

Prioritize generous whitespace around major sections.

Dense data layouts may use tighter spacing, but the visual identity should still feel intentional and breathable.

---

## 8. Grid and Layout

### Desktop

- Max content width: approximately 1440px.
- Default content width: 1200–1320px.
- Horizontal padding: 24–48px.
- Use a 12-column grid where appropriate.

### Mobile

- Horizontal padding: 16px.
- Use single-column layouts where possible.
- Product cards may use two-column grids if the minimum readable card width remains usable.

### Editorial composition

Not every screen should be a symmetrical grid.

Use deliberate compositions such as:

- giant statement on left + product imagery on right
- oversized heading spanning multiple columns
- colored callout blocks inside neutral layouts
- sticker overlapping a card edge
- split-screen collection features

---

## 9. Iconography

Icons should be:

- bold
- simple
- recognizable
- mostly monochrome
- slightly rounded or geometric

Prefer outline icons with a consistent 2px stroke.

Core icon concepts:

- Home
- Search / Discover
- Collection
- Wishlist
- Marketplace
- Trade
- Messages
- Notifications
- Profile
- Add
- Sell
- Like
- Comment
- Share
- Filter
- Sort
- Camera

Use filled icons for active navigation where useful.

Do not mix multiple unrelated icon styles.

---

## 10. Buttons

### Primary CTA

Black surface, white text.

Example:

`ADD TO COLLECTION →`

Characteristics:

- bold Inter or Montserrat SemiBold
- medium-to-large hit area
- minimal radius
- high contrast

### Brand CTA

Tomato-red surface with white or black text based on accessibility.

Use for high-priority transactional actions such as:

- Buy Now
- List Figure
- Send Offer

### Secondary Button

White background, black 1–2px border, black text.

### Yellow Highlight Button

Use rarely for discovery or promotional interactions.

### Interaction

Hover should feel physical and immediate.

Possible behavior:

- translate 1–2px
- invert foreground/background
- hard offset shadow appears/disappears

Avoid long animations.

---

## 11. Tags, Badges and Pills

Tags are important for the collectible identity.

Examples:

- New
- Limited
- Rare
- Epic
- Verified
- For Trade
- Wanted
- Sold
- Series 02
- Complete

Use compact high-contrast treatments.

Suggested forms:

- yellow pill + black text
- red pill + white text
- black pill + white text
- white outlined pill

Rarity should never rely on color alone; pair color with text or iconography.

---

## 12. Product / Figure Cards

Product cards are one of the primary brand surfaces.

Each card can contain:

- image
- wishlist heart
- status / rarity badge
- figure name
- creator or brand
- series
- figure number
- price or estimated value
- seller information where relevant
- CTA

### Visual rules

- Product image should dominate the card.
- Use clean neutral image backgrounds.
- Metadata should be visually quieter than the figure name.
- Avoid putting every available field directly on the card.
- Cards should be easy to scan.

### Example hierarchy

**BOBO**

by Tinkertown  
Series 01 / #001

**R380**

`ADD TO CART →`

---

## 13. Imagery Direction

The figures themselves are the heroes.

Use:

- isolated figure photography
- clean backgrounds
- shelves and collection environments
- detailed close-ups
- authentic collector imagery
- packaging photography

The product should avoid generic stock photography.

### Image backgrounds

Preferred:

- white
- warm off-white
- concrete gray
- black
- brand red
- brand yellow

### Cropping

Figures may be dramatically cropped for marketing sections but should be fully visible in marketplace/collection cards.

---

## 14. Illustration and Mascot Direction

Use simple vinyl-figure-like characters and flat geometric illustration.

Characters should have:

- simplified proportions
- large personality
- minimal facial detail
- toy-like silhouettes

Illustration is supportive, not mandatory on every screen.

It works best for:

- onboarding
- empty states
- campaigns
- achievements
- community messaging
- error states

---

## 15. Sticker System

Stickers are a core expressive brand device.

Examples:

- GOOD FIGURES GOOD PEOPLE
- LITTLE PEOPLE BIG STORIES
- TINKERTOWN
- COLLECT SOMETHING KINDER
- heart
- smile face
- house icon
- collector stamp

Stickers may use:

- white background + black border
- black background + white text
- tomato-red background
- yellow background

They may overlap imagery slightly but must never cover critical information.

Do not overload screens with stickers. Treat them as emphasis.

---

## 16. Navigation

### Desktop navigation

Preferred top-level destinations:

- Discover
- Marketplace
- Collection
- Community
- Messages

Secondary actions:

- Search
- Notifications
- Profile
- Sell / Add Figure

### Mobile navigation

Prefer bottom navigation with a maximum of five primary destinations.

Recommended:

1. Home
2. Discover
3. Trade / Market
4. Messages
5. Profile

A prominent floating or centrally placed add action can be considered where UX testing proves it useful.

Navigation must remain obvious. Do not sacrifice usability for styling.

---

## 17. Marketplace UI

The marketplace should feel closer to a curated collector shop than an enterprise catalog.

### Marketplace homepage

Include:

- bold editorial heading
- search
- filter chips
- featured drops
- recently listed
- rare finds
- trending figures
- price movement / market insights where available

### Filters

Possible filters:

- brand
- series
- rarity
- condition
- price
- availability
- location
- verified seller

Use drawers on mobile rather than overcrowding the main view.

### Listing page

Prioritize:

1. figure imagery
2. figure identity
3. price
4. condition
5. seller trust
6. primary purchase action
7. collectible metadata
8. description
9. shipping / transaction details

Do not bury purchasing actions under long metadata sections.

---

## 18. Collection UI

Collections should feel personal and satisfying.

Important components:

- collection count
- estimated collection value
- completion percentage
- favorite figures
- recent additions
- missing figures
- series progress
- rarity distribution

Allow users to switch between:

- visual shelf/grid
- compact list

Use progress visuals in a playful but understandable way.

Example:

**SERIES 01**  
`8 / 12 COLLECTED`

---

## 19. Add-a-Figure UX

This flow must be extremely easy to use.

The preferred interaction model is **image-first**.

### Step 1 — Photos

Ask the user to upload/take photos first.

Support multiple photos with clear reordering and removal.

### Step 2 — Recognition / Suggestions

If automated recognition is available, suggest:

- figure name
- collection/brand
- series
- variant

Never silently commit uncertain recognition.

### Step 3 — Minimal required information

Only require fields that are essential.

Potential required fields:

- figure identity
- ownership state

Optional information can include:

- condition
- purchase price
- purchase date
- notes
- custom tags
- packaging status

### Step 4 — Confirm

Present a highly visual confirmation card.

Primary action:

**ADD TO MY COLLECTION**

Avoid long intimidating forms.

---

## 20. Create Marketplace Listing UX

Reuse information already known from the user's collection.

Do not make users re-enter figure metadata.

### Suggested flow

1. Choose figure.
2. Add/confirm photos.
3. Choose condition.
4. Set price.
5. Choose shipping / meetup options.
6. Optional description.
7. Review.
8. Publish.

Clearly display:

- seller fees
- expected earnings
- listing status
- shipping responsibilities

The review screen should visually resemble the final marketplace listing.

---

## 21. Social / Community UI

Community should complement collecting rather than dominate the product.

Post types can include:

- new pickup
- collection showcase
- wishlist item
- trade request
- shelf setup
- marketplace listing share
- collector story

Use imagery heavily.

Avoid turning the platform into a generic social network clone.

---

## 22. Profile Design

Profiles should communicate collector identity quickly.

Include:

- avatar
- username
- location at a safe/general level
- collector since date
- collection size
- favorites
- reputation / seller rating
- follower/following counts if enabled
- badges
- showcase shelf

Use a strong profile header rather than a standard SaaS account page.

---

## 23. Empty States

Empty states are brand moments.

Examples:

### Empty collection

**YOUR SHELF IS LOOKING VERY QUIET.**

Start adding figures and build your collection.

`ADD YOUR FIRST FIGURE →`

### No wishlist items

**NOTHING TO HUNT. YET.**

Discover figures worth chasing.

### No marketplace results

**NO FIGURES HIDING HERE.**

Try changing your filters.

Use simple character illustrations or brand stickers where appropriate.

---

## 24. Forms

Forms should be simple and direct.

### Fields

- visible labels
- black or gray borders
- clear focus state
- 44px minimum practical control height on touch devices
- minimal placeholder dependency

### Focus state

Use a strong black, red, or accessible branded outline.

### Validation

Errors should explain what needs correction rather than only showing red borders.

---

## 25. Toasts and System Feedback

Keep messaging conversational and concise.

Examples:

- Added to your collection.
- Listing published.
- Offer sent.
- Saved to wishlist.
- Photo removed.

Success states may use green, but brand personality can be added through iconography and typography.

---

## 26. Motion

Motion should be fast and tactile.

Recommended duration:

- micro-interaction: 100–160ms
- component transition: 160–240ms
- page-level transition: 200–300ms

Suitable effects:

- subtle scale
- short slide
- hard-shadow shift
- sticker pop
- card lift of 1–2px

Avoid:

- slow floating animations
- excessive parallax
- long spring animations
- decorative motion that delays actions

Respect `prefers-reduced-motion`.

---

## 27. Responsive Rules

The experience is mobile-first but should feel premium on desktop.

### Mobile

- thumb-friendly navigation
- image-first interfaces
- simple single-column flows
- filters in sheets/drawers
- avoid tiny metadata
- sticky transactional CTAs where appropriate

### Desktop

- use wider editorial compositions
- richer multi-column discovery
- sticky side panels on listing/detail pages where helpful
- preserve whitespace

Do not simply stretch the mobile design.

---

## 28. Accessibility

Accessibility is mandatory.

Requirements:

- WCAG AA contrast minimum where practical
- visible keyboard focus states
- semantic heading structure
- meaningful button labels
- alt text for collectible imagery
- accessible form labels
- keyboard-operable dialogs and menus
- correct ARIA only where semantic HTML is insufficient
- minimum practical touch targets around 44x44px

Do not use color alone to communicate status or rarity.

---

## 29. Tone of Voice

Tinkertown should sound:

- friendly
- concise
- inclusive
- playful
- genuine
- collector-aware
- optimistic

### Good

“Your collection just got bigger.”

“Found something worth trading?”

“Good figures. Good people.”

### Avoid

Corporate wording such as:

“Your asset has successfully been added to inventory.”

Prefer:

“Added to your collection.”

Do not overuse jokes or slang.

---

## 30. Design System Component Inventory

Codex should build reusable components rather than one-off styled pages.

Minimum expected components:

- Logo
- AppHeader
- MobileNav
- DesktopNav
- Button
- IconButton
- Input
- Textarea
- Select
- Checkbox
- Radio
- Toggle
- SearchInput
- Badge
- RarityBadge
- Tag
- Avatar
- UserChip
- FigureCard
- MarketplaceCard
- CollectionCard
- SellerCard
- StatBlock
- PriceDisplay
- Sticker
- EmptyState
- Modal
- Drawer
- Toast
- Tabs
- FilterChip
- Pagination
- Skeleton
- ImageUploader
- PhotoReorderGrid
- FigureGallery
- ListingSummary

Build Storybook examples if Storybook is already part of the codebase.

---

## 31. Recommended Design Tokens

Prefer centralized tokens over hardcoded values.

Define tokens for:

- colors
- font families
- type sizes
- font weights
- spacing
- borders
- radii
- shadows
- z-index
- animation durations
- breakpoints

If Tailwind is used, extend the Tailwind theme rather than scattering arbitrary values throughout components.

---

## 32. Page-Level Visual Direction

### Home / Discover

- statement-led hero
- featured figures
- trending collections
- marketplace highlights
- collector stories
- oversized editorial typography

### Marketplace

- product-first
- prominent search/filtering
- crisp cards
- black/red transactional CTAs

### Figure Detail

- large gallery
- bold name
- series/variant metadata
- collection actions
- market information
- community context

### My Collection

- visual shelf
- high-level stats
- completion progress
- fast add action

### Profile

- collector identity
- showcase figures
- activity
- reputation

### Messages

Keep this screen more utilitarian while preserving typography, borders, color, and navigation identity.

---

## 33. Brutalism Guardrails

The goal is **playful brutalism**, not unusable brutalism.

Never compromise:

- readability
- navigation clarity
- form comprehension
- accessibility
- purchasing confidence
- mobile ergonomics

Use brutalist styling mostly through:

- typography
- strong borders
- contrast
- layout composition
- flat blocks
- sticker treatments
- deliberate asymmetry

Do not use intentionally confusing layouts.

---

## 34. Implementation Requirements for Codex

When implementing this redesign:

1. Audit the current application before changing components.
2. Identify existing reusable primitives.
3. Introduce central design tokens first.
4. Update global typography and colors.
5. Build/refactor reusable components.
6. Update navigation.
7. Update high-traffic screens first.
8. Ensure all forms and dialogs still function.
9. Test desktop and mobile breakpoints.
10. Check keyboard accessibility.
11. Check contrast.
12. Verify loading, empty, error, and success states.
13. Do not remove existing product functionality unless specifically required.
14. Do not invent backend behavior purely to satisfy a visual design.
15. Keep business logic separated from presentation components.

---

## 35. UI Review Requirements

After each significant page implementation, review it at minimum at:

- 375px mobile
- 430px large mobile
- 768px tablet
- 1024px laptop
- 1440px desktop

Inspect:

- clipping
- overflow
- awkward wrapping
- CTA visibility
- image aspect ratios
- excessively long cards
- navigation behavior
- modal/drawer usability
- empty states
- error states

For flows such as adding a figure or creating a marketplace listing, prioritize ease of completion over visual novelty.

---

## 36. Acceptance Criteria

The redesign is complete when:

- the product has a recognizable Tinkertown identity without needing the logo on every screen
- typography feels bold and editorial
- colors follow the defined palette
- buttons and interactions follow a unified system
- cards are reusable and consistent
- the figure/add-listing experiences are easy to complete
- marketplace pages feel collectible-first rather than generic ecommerce
- mobile usability is strong
- accessibility basics are respected
- no major functionality is broken
- the design remains coherent across collection, marketplace, social, profile, messaging, and administration-facing user flows where applicable

---

# Final Creative Direction

Tinkertown should feel like a **small independent collectible brand that somehow grew into the best platform for collectors**.

It should have personality without looking amateur.

It should be playful without looking childish.

It should be bold without becoming difficult to use.

Every screen should reinforce the idea:

> **Little People. Big Stories.**

And the broader philosophy:

> **Good Figures. Good People.**
