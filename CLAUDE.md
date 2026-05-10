@AGENTS.md

# Naqshlab — Codebase Guide for AI Assistants

Naqshlab is a **print-on-demand storefront** built with Next.js 16, React 19, and TypeScript. Customers browse products, customise them in a design studio (Konva/Three.js canvas), and pay via Stripe. The frontend has **no database connection** — all persistence goes through a separate backend API documented in `BACKEND.md`.

---

## Critical: Next.js 16 Breaking Changes

This project uses **Next.js 16.2.4** with **React 19.2.4**. APIs, conventions, and file structure may differ significantly from training data. Before writing any Next.js-specific code:

1. Read the relevant guide in `node_modules/next/dist/docs/`
2. Heed deprecation notices in compiler output
3. Do not assume Next.js 13/14/15 patterns apply

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4 + PostCSS |
| State | Zustand 5 (cart, persisted), NextAuth 5 (auth/session) |
| 3D / Canvas | Three.js 0.184, React Three Fiber 9, Drei 10, Konva 10, Fabric.js |
| Payments | Stripe 22, @stripe/react-stripe-js 6 |
| File uploads | UploadThing 6 + Sharp |
| Validation | Zod 4 |
| i18n | Custom JSON dictionaries (en, ru, tg) |
| Linting | ESLint 9 |
| Package manager | npm (package-lock.json) and Bun (bun.lock) — both present |

---

## Directory Structure

```
/
├── app/                        # Next.js App Router
│   ├── globals.css
│   ├── layout.tsx              # Root layout (minimal shell)
│   └── [lang]/                 # Dynamic locale prefix on every route
│       ├── layout.tsx          # HTML/body, fonts, metadata
│       ├── dictionaries.ts     # i18n file loader
│       ├── (store)/            # Public customer routes (no URL impact)
│       │   ├── layout.tsx      # Navbar + Footer wrapper
│       │   ├── page.tsx        # Homepage
│       │   ├── products/
│       │   │   ├── page.tsx            # Product listing
│       │   │   └── [slug]/page.tsx     # Product detail
│       │   ├── studio/[slug]/page.tsx  # Design customisation studio
│       │   ├── checkout/page.tsx       # Stripe payment form
│       │   ├── orders/page.tsx         # Customer order history
│       │   └── orders/[id]/page.tsx    # Order detail
│       ├── (auth)/             # Auth routes
│       │   ├── login/page.tsx
│       │   └── register/page.tsx
│       ├── admin/              # Admin dashboard (ADMIN role required)
│       │   ├── page.tsx                # Stats dashboard
│       │   ├── products/page.tsx       # Product list
│       │   ├── products/new/page.tsx   # Create product
│       │   ├── products/[id]/page.tsx  # Edit product + variants
│       │   ├── orders/page.tsx         # All orders
│       │   └── orders/[id]/page.tsx    # Order detail (admin)
│       └── api/
│           ├── auth/[...nextauth]/route.ts
│           ├── uploadthing/{core,route}.ts
│           ├── products/upload-image/route.ts
│           ├── image-proxy/route.ts
│           ├── mockups/route.ts        # Sharp-powered mockup generation
│           └── webhooks/stripe/route.ts
├── components/                 # Client components ("use client")
│   ├── Navbar.tsx
│   ├── CartDrawer.tsx
│   ├── CartStoreHydration.tsx  # Hydrates Zustand from localStorage
│   ├── CheckoutClient.tsx      # Stripe PaymentElement form
│   ├── ProductDetailClient.tsx # Variant selector + add to cart
│   ├── ProductDetailWrapper.tsx
│   ├── ProductStudioClient.tsx # Design customisation UI
│   ├── DesignEditor.tsx        # Konva/Fabric.js canvas editor
│   ├── Studio3DPreview.tsx     # Three.js 3D preview
│   ├── LanguageSwitcher.tsx
│   ├── OrderStatusUpdater.tsx  # Admin order status dropdown
│   └── EditProductClient.tsx   # Admin product edit form
├── lib/
│   ├── types.ts                # Shared TypeScript types
│   ├── auth.ts                 # NextAuth configuration
│   ├── api.ts                  # Generic fetch wrapper (adds auth headers)
│   ├── cart-store.ts           # Zustand cart store + localStorage persistence
│   ├── uploadthing.ts          # UploadThing React helpers
│   ├── apparel-editor.ts       # Design editor utilities
│   ├── mug-wrap.ts             # Mug-specific product logic
│   ├── brand-assets.ts         # Logo, colours, brand constants
│   ├── mockup-templates.ts     # Mockup generation templates
│   ├── dictionaries.ts         # i18n utilities
│   ├── hooks/useImageUpload.ts
│   ├── backend/                # Server-only API callers
│   │   ├── auth.ts             # register / login
│   │   ├── store.ts            # products + customer orders
│   │   └── admin.ts            # admin products + orders
│   └── actions/                # Next.js Server Actions ("use server")
│       ├── auth.ts
│       ├── admin.ts
│       └── checkout.ts         # Creates Stripe PaymentIntent + order
├── dictionaries/               # i18n JSON files
│   ├── en.json
│   ├── ru.json
│   └── tg.json                 # Tajik
├── public/                     # Static assets
├── proxy.ts                    # Next.js middleware (locale routing + auth guard)
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── BACKEND.md                  # Full backend API specification (read this)
└── AGENTS.md                   # Next.js 16 agent rules (always read first)
```

---

## Architecture: Frontend ↔ Backend

The Next.js app is a **pure frontend**. It calls a separate REST API at `API_BASE_URL` (default `http://localhost:8000`) for all data. See `BACKEND.md` for the full API spec.

Every server-to-server request adds three headers via `lib/api.ts`:

```
x-api-key:    <API_SECRET_KEY env var>
x-user-id:    <session.user.id>      (when signed in)
x-user-role:  CUSTOMER | ADMIN       (when signed in)
```

The fetch wrapper lives in `lib/api.ts`. All backend calls go through `lib/backend/` (server-only) or `lib/actions/` (server actions).

---

## Authentication

**NextAuth 5** with JWT strategy and a Credentials provider.

- `lib/auth.ts` — NextAuth config
- `app/[lang]/api/auth/[...nextauth]/route.ts` — handler
- Login flow: frontend → `POST /auth/login` on backend → NextAuth stores `{ id, name, email, role }` in JWT
- Session shape: `session.user = { id, name, email, role: "CUSTOMER" | "ADMIN" }`

**Route protection** in `proxy.ts` (middleware):
- `/[lang]/admin/*` — requires `role === "ADMIN"`
- `/[lang]/orders/*` — requires any authenticated session
- Redirects unauthenticated users to `/[lang]/login`

---

## Internationalisation (i18n)

Every URL is prefixed with a language code: `/en/...`, `/ru/...`, `/tg/...`.

- `proxy.ts` detects the user's `Accept-Language` header and redirects to the correct locale.
- Dictionary files: `dictionaries/{en,ru,tg}.json`
- Loader: `lib/dictionaries.ts` and `app/[lang]/dictionaries.ts`
- Supported locales: `en` (English), `ru` (Russian), `tg` (Tajik)

When adding UI text, add the key to **all three** dictionary files.

---

## State Management

**Cart:** Zustand store in `lib/cart-store.ts`
- Persisted to `localStorage` via Zustand middleware
- Hydrated on mount by `components/CartStoreHydration.tsx`
- Do not read cart state during SSR (it will be empty until hydration)

**Auth session:** NextAuth — access via `auth()` server-side or `useSession()` client-side.

---

## Stripe Payment Flow

1. User submits checkout form → Server Action `checkout.ts`
2. Server Action: validates address (Zod) → calls Stripe API → `POST /orders` on backend
3. Returns `{ clientSecret, orderId }` to browser
4. Browser renders `<PaymentElement>` → user pays
5. Stripe webhook → `POST /api/webhooks/stripe` → Next.js verifies signature → `PATCH /orders/by-payment-intent/:id` on backend
6. Backend sets `status: PROCESSING` or `CANCELLED`

---

## File Uploads

UploadThing handles file uploads (`lib/uploadthing.ts`). Configuration in `app/[lang]/api/uploadthing/core.ts`. Product images are uploaded through the admin UI and stored on UploadThing's CDN (`utfs.io` / `*.ufs.sh`).

Sharp runs server-side in `app/[lang]/api/mockups/route.ts` to composite design layers onto product mockup images.

---

## Image Configuration

Remote image hosts allowed in `next.config.ts`:
- `utfs.io` (UploadThing production)
- `**.ufs.sh` (UploadThing wildcard)
- `localhost` / `127.0.0.1` / `naqshlab.test` (local dev)

If adding a new external image source, add it to the `remotePatterns` array in `next.config.ts`.

---

## Environment Variables

### Frontend `.env.local`

```env
# Backend
API_BASE_URL="http://localhost:8000"
API_SECRET_KEY="<openssl rand -hex 32>"   # must match backend

# NextAuth
AUTH_SECRET="<openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

`NEXT_PUBLIC_*` variables are exposed to the browser; all others are server-only.

---

## Development Commands

```sh
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test runner is configured. Verification is manual.

---

## TypeScript Conventions

- Strict mode enabled
- Path alias: `@/*` maps to the repo root (e.g. `import { Product } from "@/lib/types"`)
- All shared types live in `lib/types.ts`
- Server-only code goes in `lib/backend/` or `lib/actions/`
- Client components must have `"use client"` at the top
- Server actions must have `"use server"` at the top

---

## Key Data Models (summary)

See `lib/types.ts` and `BACKEND.md §3` for full shapes.

- **Product** — `id, name, slug, description, basePrice, category, isCustomizable, images[], variants[], presetDesigns[]`
- **Variant** — `id, productId, label, priceModifier, stock, imageUrl?`
- **Order** — `id, userId, totalAmount, shippingAddress, stripePaymentIntentId, status, items[]`
- **OrderStatus** — `PENDING | PROCESSING | SHIPPED | DELIVERED | CANCELLED`
- **Category** — `APPAREL | MUG | ACCESSORY | POSTER | OTHER`
- **User role** — `CUSTOMER | ADMIN`

---

## Coding Conventions

- **No comments** unless the *why* is non-obvious
- **No premature abstractions** — prefer duplication over a wrong abstraction
- **No error handling** for scenarios that cannot happen
- Prefer server components; only add `"use client"` when interactivity is required
- Zustand store: never access during SSR — guard with `typeof window !== "undefined"` or rely on `CartStoreHydration`
- Tailwind CSS 4 syntax — class names may differ from v3; check `node_modules/tailwindcss/` docs if uncertain
