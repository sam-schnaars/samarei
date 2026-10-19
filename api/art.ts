// TV art feed: the pictures Sam's living-room TV shows behind its home screen and as its screensaver.
//
//   GET    /api/art              list pictures (Authorization: Bearer <read or write token>)
//   POST   /api/art              add one       (Bearer <write token>) JSON: { imageUrl | imageBase64, title, artist?, source? }
//   DELETE /api/art?id=<id>      remove one    (Bearer <write token>)
//
// Pictures are resized to fit 1920x1080 and stored in the `tv-art` Vercel Blob store:
// images/<id>-<random>.jpg for the picture and items/<id>.json for its details.
import { del, list, put } from "@vercel/blob";
import sharp from "sharp";
import { randomBytes, timingSafeEqual } from "node:crypto";

type Item = {
  id: string;
  title: string;
  artist: string;
  source: string;
  image: string;
  width: number;
  height: number;
  addedAt: string;
};

const MAX_DOWNLOAD = 30 * 1024 * 1024;

function tokenMatches(given: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function auth(request: Request, needWrite: boolean): boolean {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;
  if (tokenMatches(token, process.env.TV_ART_WRITE_TOKEN)) return true;
  return !needWrite && tokenMatches(token, process.env.TV_ART_READ_TOKEN);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function allItems(): Promise<Item[]> {
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

async function download(url: string): Promise<Buffer> {
  const u = new URL(url);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("imageUrl must be http(s)");
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

export async function GET(request: Request): Promise<Response> {
  if (!auth(request, false)) return json({ error: "unauthorized" }, 401);
  const items = await allItems();
  return json({ count: items.length, items });
}

export async function POST(request: Request): Promise<Response> {
  if (!auth(request, true)) return json({ error: "unauthorized" }, 401);
  let body: { imageUrl?: string; imageBase64?: string; title?: string; artist?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "send JSON: { imageUrl | imageBase64, title, artist?, source? }" }, 400);
  }
  const title = (body.title ?? "").trim().slice(0, 120);
  if (!title) return json({ error: "title is required" }, 400);
  if (!body.imageUrl && !body.imageBase64) return json({ error: "imageUrl or imageBase64 is required" }, 400);

  let input: Buffer;
  try {
    input = body.imageBase64
      ? Buffer.from(body.imageBase64.replace(/^data:[^,]+,/, ""), "base64")
      : await download(body.imageUrl!);
  } catch (e) {
    return json({ error: (e as Error).message }, 422);
  }

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
    return json({ error: "that file isn't an image I can read" }, 422);
  }

  const id = `${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
  const image = await put(`images/${id}.jpg`, jpeg, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: true,
  });
  const item: Item = {
    id,
    title,
    artist: (body.artist ?? "").trim().slice(0, 120),
    source: (body.source ?? body.imageUrl ?? "").slice(0, 500),
    image: image.url,
    width: info.width,
    height: info.height,
    addedAt: new Date().toISOString(),
  };
  await put(`items/${id}.json`, JSON.stringify(item), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
  return json(item, 201);
}

export async function DELETE(request: Request): Promise<Response> {
  if (!auth(request, true)) return json({ error: "unauthorized" }, 401);
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[a-z0-9]+-[a-f0-9]{6}$/.test(id)) return json({ error: "id is required" }, 400);
  const item = (await allItems()).find((i) => i.id === id);
  if (!item) return json({ error: "no picture with that id" }, 404);
  const itemBlob = (await list({ prefix: `items/${id}.json` })).blobs[0];
  await del([item.image, ...(itemBlob ? [itemBlob.url] : [])]);
  return json({ removed: id });
}
