export type MockupStatus = "PENDING" | "READY" | "FAILED";

export type Mockup = {
  cacheKey: string;
  templateId: string;
  status: MockupStatus;
  url: string | null;
  width: number | null;
  height: number | null;
  failureReason: string | null;
};

export type MockupRequest = {
  design: string;
  productId?: string;
  category?: string;
};

/**
 * Ask the backend to composite this artwork onto every template that applies.
 * A render it has seen before comes back READY immediately; anything new comes
 * back PENDING for `resolveMockups` to wait on.
 */
export async function requestMockups(
  input: MockupRequest,
  signal?: AbortSignal
): Promise<Mockup[]> {
  const response = await fetch("/api/mockups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });

  // 404 means the product has no templates yet, which is not an error --
  // the studio just falls back to the product's own photos.
  if (response.status === 404) return [];

  if (!response.ok) {
    throw new Error(`Mockup request failed (${response.status})`);
  }

  return (await response.json()) as Mockup[];
}

const POLL_INTERVAL_MS = 900;
const POLL_TIMEOUT_MS = 25_000;

/**
 * Poll the pending renders until they settle, then return the URLs that made
 * it, in the order the backend listed them. A render that fails or outruns the
 * timeout is dropped rather than surfaced -- the caller shows the product's own
 * photos instead of a broken tile.
 */
export async function resolveMockups(
  mockups: Mockup[],
  signal?: AbortSignal
): Promise<string[]> {
  const settled = new Map(
    mockups.filter((m) => m.status !== "PENDING").map((m) => [m.cacheKey, m])
  );
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  let pending = mockups.filter((m) => m.status === "PENDING");

  while (pending.length > 0 && !signal?.aborted && Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS, signal);

    const results = await Promise.all(
      pending.map((mockup) => fetchMockup(mockup.cacheKey, signal))
    );

    for (const result of results) {
      if (result && result.status !== "PENDING") settled.set(result.cacheKey, result);
    }

    pending = pending.filter((mockup) => !settled.has(mockup.cacheKey));
  }

  return mockups
    .map((mockup) => settled.get(mockup.cacheKey))
    .filter((mockup): mockup is Mockup => mockup?.status === "READY" && Boolean(mockup.url))
    .map((mockup) => mockup.url as string);
}

async function fetchMockup(cacheKey: string, signal?: AbortSignal): Promise<Mockup | null> {
  const controller = new AbortController();

  function abort() {
    controller.abort();
  }

  if (signal) {
    if (signal.aborted) {
      abort();
    } else {
      signal.addEventListener("abort", abort, { once: true });
    }
  }

  const timeout = setTimeout(() => abort(), 8_000);

  try {
    const response = await fetch(`/api/mockups/${cacheKey}`, { signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as Mockup;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
