import type { Instrumentation } from "next";

// Diagnostic: production hides Server Component error messages behind a digest.
// This prints the real message, route and render context to the server log.
export const onRequestError: Instrumentation.onRequestError = (
  err,
  request,
  context
) => {
  const { message, stack, digest } = (err ?? {}) as {
    message?: string;
    stack?: string;
    digest?: string;
  };

  console.error(
    `[onRequestError] ${context.routeType} ${request.method} ${request.path}\n` +
      `  route:    ${context.routePath}\n` +
      `  digest:   ${digest ?? "—"}\n` +
      `  renderer: ${context.renderSource ?? "—"} (${context.revalidateReason ?? "normal request"})\n` +
      `  message:  ${message ?? String(err)}\n` +
      `${stack ?? ""}`
  );
};
