# Naqshlab — Backend API Specification

This document is the single source of truth for the backend service that powers the Naqshlab print-on-demand storefront. The Next.js frontend calls your API for all data — there is no database connection in the frontend.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Security](#2-authentication--security)
3. [Data Models](#3-data-models)
4. [Endpoint Reference](#4-endpoint-reference)
   - [Auth](#41-auth)
   - [Products](#42-products)
   - [Orders — Customer](#43-orders--customer)
   - [Admin Stats](#44-admin-stats)
   - [Admin Orders](#45-admin-orders)
   - [Stripe Webhook Proxy](#46-stripe-webhook-proxy)
5. [Error Handling](#5-error-handling)
6. [Environment Variables](#6-environment-variables)
7. [Stripe Integration Flow](#7-stripe-integration-flow)
8. [Implementation Checklist](#8-implementation-checklist)

---

## 1. Architecture Overview

```
Browser
  │
  ▼
Next.js 16 (port 3000)          ← serves UI, holds Stripe secret, JWT session
  │  server-to-server calls
  │  every request carries:
  │    x-api-key:    <shared secret>
  │    x-user-id:   <user UUID>   (when signed in)
  │    x-user-role: CUSTOMER|ADMIN  (when signed in)
  ▼
Your Backend API (port 8000)    ← owns the database, password hashing, business logic
  │
  ▼
Database (PostgreSQL / any)
```

**Key rules:**
- The frontend **never** stores a database password or user passwords.
- All passwords are **hashed by the backend**.
- The Next.js JWT session contains only `{ id, name, email, role }` — values returned by `POST /auth/login`.
- The backend must treat `x-api-key` as a bearer token and reject requests without it.

---

## 2. Authentication & Security

### Request headers sent on every call

| Header | Required | Value |
|--------|----------|-------|
| `x-api-key` | Always | Value of `API_SECRET_KEY` env var on the frontend |
| `x-user-id` | When user is signed in | UUID of the authenticated user |
| `x-user-role` | When user is signed in | `"CUSTOMER"` or `"ADMIN"` |
| `Content-Type` | When body present | `"application/json"` |

### Backend validation rules

1. **Always** verify `x-api-key` matches your stored secret. Return `401` if missing or wrong.
2. For user-scoped endpoints, verify `x-user-id` is present and refers to a real user.
3. For admin endpoints, verify `x-user-role === "ADMIN"`. Do not rely on the header alone — cross-check against your own user record to prevent header spoofing.
4. The two auth endpoints (`POST /auth/login` and `POST /auth/register`) are called **without** `x-user-id`/`x-user-role` but **still require** `x-api-key`.

### Password handling

The frontend sends **plaintext** passwords to `POST /auth/login` and `POST /auth/register` over the server-to-server channel (protected by `x-api-key` + TLS in production). **Your backend must hash passwords** using bcrypt (cost factor ≥ 12) before storing, and compare via `bcrypt.compare` on login.

---

## 3. Data Models

All timestamps are **ISO 8601 strings** (e.g. `"2026-04-22T10:00:00.000Z"`).  
All monetary values are **floats** representing the amount in the currency unit (e.g. `29.99` = $29.99).

### User

```json
{
  "id":        "cuid or uuid",
  "name":      "Jane Doe",
  "email":     "jane@example.com",
  "role":      "CUSTOMER",
  "createdAt": "2026-04-22T10:00:00.000Z",
  "updatedAt": "2026-04-22T10:00:00.000Z"
}
```

`role` enum: `CUSTOMER` | `ADMIN`

### Product

```json
{
  "id":             "prod_abc123",
  "name":           "Classic White Tee",
  "slug":           "classic-white-tee",
  "description":    "100% cotton unisex tee.",
  "basePrice":      24.99,
  "category":       "APPAREL",
  "isCustomizable": true,
  "images":         ["https://cdn.example.com/img1.jpg"],
  "variantCount":   3,
  "variants": [
    {
      "id":            "var_123",
      "productId":     "prod_abc123",
      "label":         "Small",
      "priceModifier": 0.00,
      "stock":         50
    }
  ],
  "presetDesigns": [
    {
      "id":        "preset_123",
      "productId": "prod_abc123",
      "name":      "Floral Pattern",
      "imageUrl":  "https://cdn.example.com/floral.jpg"
    }
  ],
  "createdAt": "2026-04-22T10:00:00.000Z",
  "updatedAt": "2026-04-22T10:00:00.000Z"
}
```

`category` enum: `APPAREL` | `MUG` | `ACCESSORY` | `POSTER` | `OTHER`

- `variants` and `presetDesigns` are only included when fetching a single product by slug (`GET /products/slug/:slug`) or by ID (`GET /products/:id`).
- `variantCount` is a convenience integer for list views; include it in `GET /products` responses.

### Order

```json
{
  "id":                     "ord_abc123",
  "userId":                 "usr_abc123",
  "totalAmount":            49.98,
  "shippingAddress": {
    "fullName":      "Jane Doe",
    "addressLine1":  "123 Main St",
    "addressLine2":  "Apt 4B",
    "city":          "New York",
    "postalCode":    "10001",
    "country":       "US"
  },
  "stripePaymentIntentId":  "pi_3xxx",
  "status":                 "PENDING",
  "items": [
    {
      "id":                "item_abc123",
      "orderId":           "ord_abc123",
      "productId":         "prod_abc123",
      "variantId":         "var_123",
      "presetDesignId":    null,
      "quantity":          2,
      "unitPrice":         24.99,
      "customizationData": null,
      "product":  { "name": "Classic White Tee", "slug": "classic-white-tee", "images": ["https://..."] },
      "variant":  { "label": "Small" },
      "presetDesign": null
    }
  ],
  "user": { "name": "Jane Doe", "email": "jane@example.com" },
  "createdAt": "2026-04-22T10:00:00.000Z",
  "updatedAt": "2026-04-22T10:00:00.000Z"
}
```

`status` enum: `PENDING` | `PROCESSING` | `SHIPPED` | `DELIVERED` | `CANCELLED`

- `user` field is only required on admin endpoints.
- `customizationData` is an arbitrary JSON object (Fabric.js canvas JSON) or `null`.

### AdminStats

```json
{
  "totalOrders":   142,
  "pendingOrders": 12,
  "totalRevenue":  3894.50,
  "totalProducts": 24
}
```

`totalRevenue` excludes orders with status `CANCELLED`.

---

## 4. Endpoint Reference

### 4.1 Auth

---

#### `POST /auth/register`

Create a new customer account.

**Headers:** `x-api-key`

**Request body:**
```json
{
  "name":     "Jane Doe",
  "email":    "jane@example.com",
  "password": "plaintext_password"
}
```

**Validation:**
- `name` — min 2 characters
- `email` — valid email format
- `password` — min 8 characters

**Success response:** `201 Created`
```json
{ "id": "usr_abc123", "name": "Jane Doe", "email": "jane@example.com", "role": "CUSTOMER" }
```

**Error responses:**

| Status | When |
|--------|------|
| `409 Conflict` | Email already registered — body: `{ "message": "An account with this email already exists." }` |
| `422 Unprocessable Entity` | Validation failed |
| `401 Unauthorized` | Missing or invalid `x-api-key` |

---

#### `POST /auth/login`

Authenticate a user. The Next.js Auth.js `authorize()` callback calls this.

**Headers:** `x-api-key`

**Request body:**
```json
{
  "email":    "jane@example.com",
  "password": "plaintext_password"
}
```

**Success response:** `200 OK`
```json
{
  "id":    "usr_abc123",
  "name":  "Jane Doe",
  "email": "jane@example.com",
  "role":  "CUSTOMER"
}
```

This exact shape is stored in the Next.js JWT. The `id` and `role` fields are mandatory.

**Error responses:**

| Status | When |
|--------|------|
| `401 Unauthorized` | Wrong password or user not found — body: `{ "message": "Invalid credentials" }` |
| `401 Unauthorized` | Missing or invalid `x-api-key` |

> **Note:** Do not distinguish between "user not found" and "wrong password" in the response — return `401` for both to prevent user enumeration.

---

### 4.2 Products

---

#### `GET /products`

List products with optional filters.

**Headers:** `x-api-key`  
**Auth required:** No (public endpoint, but still validate `x-api-key`)

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category enum value: `APPAREL`, `MUG`, `ACCESSORY`, `POSTER`, `OTHER` |
| `customizable` | `"true"` | When present, return only products where `isCustomizable = true` |
| `take` | integer string | Limit results (e.g. `"3"` for homepage featured products) |
| `orderBy` | string | e.g. `"createdAt:desc"` — implement sensible default if absent |
| `includeVariantCount` | `"true"` | When present, include `variantCount` in each product object |

**Success response:** `200 OK`
```json
[
  {
    "id":             "prod_abc123",
    "name":           "Classic White Tee",
    "slug":           "classic-white-tee",
    "description":    "100% cotton.",
    "basePrice":      24.99,
    "category":       "APPAREL",
    "isCustomizable": true,
    "images":         ["https://cdn.example.com/img.jpg"],
    "variantCount":   3,
    "createdAt":      "2026-04-22T10:00:00.000Z",
    "updatedAt":      "2026-04-22T10:00:00.000Z"
  }
]
```

> `variants` and `presetDesigns` are **not** included in list responses.

---

#### `GET /products/slug/:slug`

Get a single product by its URL slug, including variants and preset designs.

**Headers:** `x-api-key`  
**Auth required:** No

**Success response:** `200 OK` — full `Product` object with `variants` and `presetDesigns` arrays included.

**Error responses:**

| Status | When |
|--------|------|
| `404 Not Found` | No product with that slug |

---

#### `GET /products/:id`

Get a single product by ID (used by the admin edit page).

**Headers:** `x-api-key`, `x-user-id`, `x-user-role: ADMIN`

**Success response:** `200 OK` — full `Product` object with `variants` included.

**Error responses:**

| Status | When |
|--------|------|
| `404 Not Found` | No product with that ID |
| `403 Forbidden` | Not an admin |

---

#### `POST /products`

Create a new product.

**Headers:** `x-api-key`, `x-user-id`, `x-user-role: ADMIN`

**Request body:**
```json
{
  "name":           "Classic White Tee",
  "slug":           "classic-white-tee",
  "description":    "100% cotton.",
  "basePrice":      24.99,
  "category":       "APPAREL",
  "isCustomizable": true,
  "images":         []
}
```

**Validation:**
- `slug` must match `/^[a-z0-9-]+$/` and be unique
- `basePrice` must be a positive number
- `category` must be a valid enum value

**Success response:** `201 Created` — full `Product` object

**Error responses:**

| Status | When |
|--------|------|
| `409 Conflict` | Slug already exists |
| `403 Forbidden` | Not an admin |

---

#### `PUT /products/:id`

Replace a product's fields (full update).

**Headers:** `x-api-key`, `x-user-id`, `x-user-role: ADMIN`

**Request body:** Same shape as `POST /products` (without `images`; images managed separately).

**Success response:** `200 OK` — updated `Product` object

---

#### `POST /products/:id/variants`

Add a variant to a product.

**Headers:** `x-api-key`, `x-user-id`, `x-user-role: ADMIN`

**Request body:**
```json
{
  "label":         "Small",
  "priceModifier": 0.00,
  "stock":         50
}
```

**Success response:** `201 Created`
```json
{
  "id":            "var_123",
  "productId":     "prod_abc123",
  "label":         "Small",
  "priceModifier": 0.00,
  "stock":         50
}
```

---

#### `DELETE /products/:id/variants/:variantId`

Remove a variant from a product.

**Headers:** `x-api-key`, `x-user-id`, `x-user-role: ADMIN`

**Success response:** `204 No Content`

---

### 4.3 Orders — Customer

---

#### `POST /orders`

Create an order after Stripe PaymentIntent is created on the frontend.

**Headers:** `x-api-key`, `x-user-id`

**Request body:**
```json
{
  "totalAmount": 49.98,
  "shippingAddress": {
    "fullName":     "Jane Doe",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city":         "New York",
    "postalCode":   "10001",
    "country":      "US"
  },
  "stripePaymentIntentId": "pi_3xxx",
  "items": [
    {
      "productId":         "prod_abc123",
      "variantId":         "var_123",
      "presetDesignId":    null,
      "customizationData": null,
      "quantity":          2,
      "unitPrice":         24.99
    }
  ]
}
```

**Notes:**
- Set `userId` from `x-user-id` header — do not accept it in the body.
- Initial `status` must be `"PENDING"`.
- `customizationData` is a Fabric.js canvas JSON object or `null`.

**Success response:** `201 Created` — full `Order` object (with `items` embedded, `user` not required)

---

#### `GET /orders`

List the authenticated user's own orders, newest first.

**Headers:** `x-api-key`, `x-user-id`

**Success response:** `200 OK`

Array of `Order` objects. Each item must include:
- `items` array with `product: { name }` and `quantity`
- `status`, `totalAmount`, `createdAt`

```json
[
  {
    "id":          "ord_abc123",
    "userId":      "usr_abc123",
    "totalAmount": 49.98,
    "status":      "PENDING",
    "createdAt":   "2026-04-22T10:00:00.000Z",
    "items": [
      {
        "quantity": 2,
        "product":  { "name": "Classic White Tee" }
      }
    ]
  }
]
```

> Filter by `userId === x-user-id`. Never return another user's orders.

---

#### `GET /orders/:id`

Get a single order (full detail) for the authenticated user.

**Headers:** `x-api-key`, `x-user-id`

**Success response:** `200 OK` — full `Order` object including:
- `items` with `product: { name, slug, images }`, `variant: { label }`, `presetDesign: { name, imageUrl }`
- `shippingAddress`
- `stripePaymentIntentId`

**Error responses:**

| Status | When |
|--------|------|
| `404 Not Found` | Order not found, or `order.userId !== x-user-id` (never leak other users' orders) |

---

### 4.4 Admin Stats

---

#### `GET /admin/stats`

Dashboard summary numbers.

**Headers:** `x-api-key`, `x-user-id`, `x-user-role: ADMIN`

**Success response:** `200 OK`
```json
{
  "totalOrders":   142,
  "pendingOrders": 12,
  "totalRevenue":  3894.50,
  "totalProducts": 24
}
```

- `totalRevenue` = sum of `totalAmount` for all orders where `status != "CANCELLED"`.
- `pendingOrders` = count where `status == "PENDING"`.

---

### 4.5 Admin Orders

---

#### `GET /admin/orders`

List all orders (any user), newest first.

**Headers:** `x-api-key`, `x-user-id`, `x-user-role: ADMIN`

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | OrderStatus | Filter by status (e.g. `PENDING`) |

**Success response:** `200 OK`

Array of `Order` objects. Each must include:
- `user: { name, email }`
- `items` array with `quantity` (for total item count)
- `totalAmount`, `status`, `createdAt`

---

#### `GET /admin/orders/:id`

Get full detail of any order.

**Headers:** `x-api-key`, `x-user-id`, `x-user-role: ADMIN`

**Success response:** `200 OK` — full `Order` object including:
- `user: { name, email }`
- `items` with `product: { name }`, `variant: { label }`, `presetDesign: { name }`
- `shippingAddress`, `stripePaymentIntentId`, `status`

**Error responses:**

| Status | When |
|--------|------|
| `404 Not Found` | Order not found |

---

#### `PATCH /orders/:id/status`

Update an order's status (admin action from the order detail page).

**Headers:** `x-api-key`, `x-user-id`, `x-user-role: ADMIN`

**Request body:**
```json
{ "status": "SHIPPED" }
```

`status` must be a valid `OrderStatus` enum value.

**Success response:** `200 OK` — updated `Order` object, or `204 No Content`

---

### 4.6 Stripe Webhook Proxy

This endpoint is called by the **Next.js server** (not Stripe directly). Stripe webhooks arrive at `POST /api/webhooks/stripe` on the Next.js app, which verifies the Stripe signature and then forwards status updates to your backend.

---

#### `PATCH /orders/by-payment-intent/:intentId`

Update the status of whichever order has this Stripe PaymentIntent ID.

**Headers:** `x-api-key` (no user ID — this is a server-to-server internal call)

**Request body:**
```json
{ "status": "PROCESSING" }
```

or

```json
{ "status": "CANCELLED" }
```

**Triggered by:**

| Stripe event | Status set |
|---|---|
| `payment_intent.succeeded` | `PROCESSING` |
| `payment_intent.payment_failed` | `CANCELLED` |

**Success response:** `200 OK` or `204 No Content`

**Error responses:**

| Status | When |
|--------|------|
| `404 Not Found` | No order found with that `stripePaymentIntentId` — acceptable to return `200` silently instead |

---

## 5. Error Handling

All error responses should use this JSON shape:

```json
{ "message": "Human-readable description of the error" }
```

Standard HTTP status codes:

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `204` | No Content (successful delete or update with no body) |
| `400` | Bad Request — malformed JSON or missing required fields |
| `401` | Unauthorized — missing or invalid `x-api-key` |
| `403` | Forbidden — valid key but insufficient role |
| `404` | Not Found |
| `409` | Conflict — duplicate slug, duplicate email |
| `422` | Unprocessable Entity — validation failed |
| `500` | Internal Server Error |

---

## 6. Environment Variables

### Frontend (Next.js) — `.env.local`

```env
API_BASE_URL="http://localhost:8000"          # your backend URL
API_SECRET_KEY="long-random-secret-here"      # shared with backend

AUTH_SECRET="..."                             # openssl rand -base64 32
AUTH_URL="http://localhost:3000"

STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Backend (you configure these)

```env
PORT=8000
DATABASE_URL="postgresql://user:pass@localhost:5432/naqshlab"
API_SECRET_KEY="long-random-secret-here"      # must match frontend value
```

`API_SECRET_KEY` must be **identical** on both sides. Generate with:
```sh
openssl rand -hex 32
```

---

## 7. Stripe Integration Flow

```
1. User fills address + clicks "Pay"
        │
        ▼
2. Next.js Server Action (createCheckout):
   a. Validates address with Zod
   b. Calls Stripe API → creates PaymentIntent
   c. Calls POST /orders on your backend (with stripePaymentIntentId)
   d. Returns { clientSecret, orderId } to browser
        │
        ▼
3. Browser renders Stripe Elements <PaymentElement>
   User enters card → Stripe confirms payment
        │
        ▼
4. Stripe sends webhook → Next.js POST /api/webhooks/stripe
   Next.js verifies Stripe signature
   Next.js calls PATCH /orders/by-payment-intent/:intentId
        │
        ▼
5. Your backend updates order.status:
   payment_intent.succeeded      → PROCESSING
   payment_intent.payment_failed → CANCELLED
```

The order is always created **before** payment is confirmed (status `PENDING`). This is intentional — the order exists as soon as the user intends to pay.

---

## 8. Implementation Checklist

### Security
- [ ] Validate `x-api-key` on every request before any other processing
- [ ] Cross-check role from `x-user-role` against your database for admin endpoints
- [ ] Hash passwords with bcrypt (cost ≥ 12) — never store plaintext
- [ ] Use parameterised queries / ORM to prevent SQL injection
- [ ] Filter orders by `userId === x-user-id` for customer endpoints

### Auth endpoints
- [ ] `POST /auth/register` — create user, hash password, return `{ id, name, email, role }`
- [ ] `POST /auth/login` — verify password, return `{ id, name, email, role }`

### Product endpoints
- [ ] `GET /products` — with `category`, `customizable`, `take`, `includeVariantCount` filters
- [ ] `GET /products/slug/:slug` — with `variants` + `presetDesigns`
- [ ] `GET /products/:id` — admin, with `variants`
- [ ] `POST /products` — admin, unique slug check
- [ ] `PUT /products/:id` — admin
- [ ] `POST /products/:id/variants` — admin
- [ ] `DELETE /products/:id/variants/:variantId` — admin

### Order endpoints
- [ ] `POST /orders` — create with `PENDING` status, embed items
- [ ] `GET /orders` — customer's own orders
- [ ] `GET /orders/:id` — customer's single order (full detail)
- [ ] `GET /admin/orders` — all orders with `?status` filter
- [ ] `GET /admin/orders/:id` — full order with user info
- [ ] `PATCH /orders/:id/status` — admin status update
- [ ] `PATCH /orders/by-payment-intent/:intentId` — Stripe webhook handler

### Admin
- [ ] `GET /admin/stats` — aggregate stats

### Infrastructure
- [ ] CORS: allow origin `http://localhost:3000` (and production domain)
- [ ] All endpoints return `Content-Type: application/json`
- [ ] Timestamps stored as UTC, returned as ISO 8601 strings
- [ ] Monetary values stored as `DECIMAL(10,2)`, returned as JSON `number`
