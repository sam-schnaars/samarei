// Shared by /api/art (Sam's agents and the TV) and /api/submit (the public form). Files under api/_lib
// are not deployed as routes.
import { list, put } from "@vercel/blob";
import sharp from "sharp";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type Item = {
  id: string;
  title: string;
  /** What the TV shows under the title: the artist, plus "sent by …" for submissions. */
  artist: string;
  source: string;
  image: string;
  width: number;
  height: number;
  addedAt: string;
  /** Present on pieces sent through samarei.com/submit. */
  submittedBy?: string;
  /** Hash of the submitter's IP, for rate limits; never returned to the public. */
  ipHash?: string;
};

const MAX_DOWNLOAD = 30 * 1024 * 1024;

function tokenMatches(given: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function auth(request: Request, needWrite: boolean): boolean {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;
  if (tokenMatches(token, process.env.TV_ART_WRITE_TOKEN)) return true;
  return !needWrite && tokenMatches(token, process.env.TV_ART_READ_TOKEN);
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/** Trims, drops control characters and caps the length. */
export function clean(s: unknown, max: number): string {
  return typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function ipHash(request: Request): string {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  return createHash("sha256").update(`${ip}|${process.env.TV_ART_WRITE_TOKEN ?? ""}`).digest("hex").slice(0, 16);
}

export async function allItems(): Promise<Item[]> {
  const blobs = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "items/", cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const items = await Promise.all(
    blobs.map(async (b) => {
      const res = await fetch(b.url);
      return res.ok ? ((await res.json()) as Item) : null;
    }),
  );
  return items.filter((i): i is Item => i !== null).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export async function download(url: string): Promise<Buffer> {
  const u = new URL(url);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("the image link must start with http(s)");
  const res = await fetch(u, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
      accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`couldn't download the image (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_DOWNLOAD) throw new Error("image is larger than 30 MB");
  return buf;
}

export function decodeBase64(data: string): Buffer {
  return Buffer.from(data.replace(/^data:[^,]+,/, ""), "base64");
}

/**
 * Resizes to fit 1920x1080 (re-encoding also strips metadata like location), stores the picture and its
 * details in the Blob store, and returns the new item. Throws "not an image" for unreadable input.
 */
export async function addPicture(
  input: Buffer,
  fields: Omit<Item, "id" | "image" | "width" | "height" | "addedAt">,
): Promise<Item> {
  let jpeg: Buffer;
  let info: sharp.OutputInfo;
  try {
    ({ data: jpeg, info } = await sharp(input, { failOn: "none", limitInputPixels: 300_000_000 })
      .rotate()
      .resize({ width: 1920, height: 1080, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#000000" })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer({ resolveWithObject: true }));
  } catch {
    throw new Error("not an image");
  }
  const id = `${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
  const image = await put(`images/${id}.jpg`, jpeg, { access: "public", contentType: "image/jpeg", addRandomSuffix: true });
  const item: Item = { ...fields, id, image: image.url, width: info.width, height: info.height, addedAt: new Date().toISOString() };
  await put(`items/${id}.json`, JSON.stringify(item), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
  return item;
}

type SubmitConfig = { paused: boolean };

export async function readConfig(): Promise<SubmitConfig> {
  const blob = (await list({ prefix: "config/submissions.json" })).blobs[0];
  if (!blob) return { paused: false };
  const res = await fetch(`${blob.url}?v=${Date.now()}`, { cache: "no-store" });
  return res.ok ? ((await res.json()) as SubmitConfig) : { paused: false };
}

export async function writeConfig(config: SubmitConfig): Promise<void> {
  await put("config/submissions.json", JSON.stringify(config), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
}
