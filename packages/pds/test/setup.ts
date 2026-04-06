/**
 * Ephemeral PDS test helper.
 *
 * Eventually this will spin up a real PDS with in-memory storage.
 * For now it provides the URL and helpers that tests use to make
 * XRPC requests against the server.
 */

const PDS_PORT = 13583;
export const PDS_URL = `http://localhost:${PDS_PORT}`;

/** Build the full URL for an XRPC endpoint. */
export function xrpcUrl(
  nsid: string,
  params?: Record<string, string>,
): string {
  const url = new URL(`/xrpc/${nsid}`, PDS_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

/** POST an XRPC procedure with a JSON body. */
export async function xrpcPost(
  nsid: string,
  body: unknown,
  opts?: { auth?: string },
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts?.auth) {
    headers["Authorization"] = `Bearer ${opts.auth}`;
  }
  return fetch(xrpcUrl(nsid), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

/** POST raw bytes to an XRPC procedure (e.g. uploadBlob). */
export async function xrpcPostBytes(
  nsid: string,
  data: Uint8Array,
  mimeType: string,
  opts?: { auth?: string },
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": mimeType,
  };
  if (opts?.auth) {
    headers["Authorization"] = `Bearer ${opts.auth}`;
  }
  return fetch(xrpcUrl(nsid), {
    method: "POST",
    headers,
    body: data,
  });
}

/** GET an XRPC query endpoint. */
export async function xrpcGet(
  nsid: string,
  params?: Record<string, string>,
  opts?: { auth?: string },
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts?.auth) {
    headers["Authorization"] = `Bearer ${opts.auth}`;
  }
  return fetch(xrpcUrl(nsid, params), { headers });
}
