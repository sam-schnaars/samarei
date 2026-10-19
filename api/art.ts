// TV art feed: the pictures Sam's living-room TV shows behind its home screen and as its screensaver.
//
//   GET    /api/art              list pictures (Authorization: Bearer <read or write token>)
//   POST   /api/art              add one       (Bearer <write token>) JSON: { imageUrl | imageBase64, title, artist?, source? }
//   DELETE /api/art?id=<id>      remove one    (Bearer <write token>)
//
// Pictures are resized to fit 1920x1080 and stored in the `tv-art` Vercel Blob store:
// images/<id>-<random>.jpg for the picture and items/<id>.json for its details.
// Anyone can also send a picture through /api/submit (the samarei.com/submit page).
import { del, list } from "@vercel/blob";
import { addPicture, allItems, auth, clean, decodeBase64, download, json } from "./_lib/art.js";

export async function GET(request: Request): Promise<Response> {
  if (!auth(request, false)) return json({ error: "unauthorized" }, 401);
  const items = (await allItems()).map(({ ipHash: _ip, ...rest }) => rest);
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
  const title = clean(body.title, 120);
  if (!title) return json({ error: "title is required" }, 400);
  if (!body.imageUrl && !body.imageBase64) return json({ error: "imageUrl or imageBase64 is required" }, 400);

  let input: Buffer;
  try {
    input = body.imageBase64 ? decodeBase64(body.imageBase64) : await download(body.imageUrl!);
  } catch (e) {
    return json({ error: (e as Error).message }, 422);
  }
  try {
    const item = await addPicture(input, {
      title,
      artist: clean(body.artist, 120),
      source: (body.source ?? body.imageUrl ?? "").slice(0, 500),
    });
    return json(item, 201);
  } catch {
    return json({ error: "that file isn't an image I can read" }, 422);
  }
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
