import { type NextRequest } from "next/server";
import { composePeep, peepViewBox } from "@/lib/peeps/compose.js";
import { specFromQuery } from "@/lib/peeps";
import bounds from "@/lib/peeps/bounds.json";
import parts from "@/lib/peeps/parts.json";

/** An Open Peeps bust assembled from the parts in the query. Same query, same drawing, so it caches for good. Framed to
 * its own parts, so nothing is cut off. */
export async function GET(request: NextRequest) {
  const spec = specFromQuery(request.nextUrl.searchParams);
  if (!spec) return new Response("Unknown drawing", { status: 400 });
  return new Response(composePeep(parts, spec, peepViewBox(bounds, parts, spec)), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
