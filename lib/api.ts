/**
 * Lightweight fetch wrapper for server-side calls to the backend API.
 *
 * Expected environment variables:
 *   API_BASE_URL   – backend origin, e.g. "http://localhost:8000"
 *   API_SECRET_KEY – shared secret; backend validates via "x-api-key" header
 *
 * The backend should honour these request headers:
 *   x-api-key    – the shared secret (required on every call)
 *   x-user-id    – authenticated user's ID (when available)
 *   x-user-role  – "CUSTOMER" | "ADMIN"   (when available)
 *
 * Expected API endpoints
 * ──────────────────────
 * Public:
 *   GET  /products                       list products (?category=&customizable=&take=)
 *   GET  /products/slug/:slug            get product by slug (with variants + presetDesigns)
 *
 * Authenticated user (x-user-id required):
 *   POST /orders/quote                   server-priced cart total (no side effects)
 *   GET  /orders                         user's own orders (with items + product names)
 *   GET  /orders/:id                     single order (full item detail)
 *   POST /orders                         create order
 *
 * Admin (x-user-role: ADMIN required):
 *   GET  /admin/stats                    { totalOrders, pendingOrders, totalRevenue, totalProducts }
 *   POST /products                       create product
 *   PUT  /products/:id                   update product
 *   POST /products/:id/variants          add variant
 *   DEL  /products/:id/variants/:vid     remove variant
 *   GET  /admin/orders                   all orders (?status=) with user info
 *   GET  /admin/orders/:id              single order with user + item detail
 *   PATCH /orders/:id/status            { status: OrderStatus }
 *
 * Internal webhook (x-api-key required):
 *   PATCH /orders/by-payment-intent/:intentId   { status: OrderStatus }
 */

/**
 * Thrown for any non-2xx response. `message` prefers the backend's own
 * validation text (e.g. "Only 2 left in stock") so it can be shown to the user.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function readableMessage(body: unknown, status: number, fallback: string): string {
  if (typeof body === "object" && body !== null) {
    const { errors, message } = body as {
      errors?: Record<string, string[]>;
      message?: string;
    };

    const firstField = errors && Object.values(errors)[0]?.[0];
    if (firstField) return firstField;
    if (message) return message;
  }

  return `API ${status}: ${fallback}`;
}

const BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:8000").replace(
  /\/$/,
  ""
);

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  userId?: string;
  role?: string;
  searchParams?: Record<string, string | undefined>;
  cache?: RequestCache;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    userId,
    role,
    searchParams,
    cache = "no-store",
  } = options;

  const url = new URL(BASE_URL + path);
  if (searchParams) {
    for (const [key, val] of Object.entries(searchParams)) {
      if (val !== undefined) url.searchParams.set(key, val);
    }
  }

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": process.env.API_SECRET_KEY ?? "",
  };
  if (userId) reqHeaders["x-user-id"] = userId;
  if (role) reqHeaders["x-user-role"] = role;

  const res = await fetch(url.toString(), {
    method,
    headers: reqHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");

    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    throw new ApiError(
      res.status,
      body,
      readableMessage(body, res.status, text || res.statusText)
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
