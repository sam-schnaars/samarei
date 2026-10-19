// Public art submissions (samarei.com/submit). Anything sent here goes straight onto Sam's TV, so it is
// guarded: a hidden honeypot field, a minimum time on the form, 3 pictures per person per hour, 40 per
// day overall, and a pause switch on the private review page (samarei.com/tv-art).
//
//   GET   /api/submit                       { open: boolean }
//   POST  /api/submit                       { imageBase64 | imageUrl, title, artist?, name?, website, startedAt }
//   PATCH /api/submit  (Bearer write token) { paused: boolean }
import { addPicture, allItems, auth, clean, decodeBase64, download, ipHash, json, readConfig, writeConfig } from "./_lib/art";

const PER_PERSON_PER_HOUR = 3;
const PER_DAY = 40;
const MIN_FORM_MS = 3_000;

export async function GET(): Promise<Response> {
  const { paused } = await readConfig();
  return json({ open: !paused });
}

export async function POST(request: Request): Promise<Response> {
  let body: {
    imageBase64?: string;
    imageUrl?: string;
    title?: string;
    artist?: string;
    name?: string;
    website?: string;
    startedAt?: number;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Something went wrong sending that. Try again." }, 400);
  }

  // Bots fill the hidden "website" field or post instantly: pretend it worked and drop it.
  if (body.website || !body.startedAt || Date.now() - body.startedAt < MIN_FORM_MS) {
    return json({ ok: true }, 201);
  }
  if ((await readConfig()).paused) return json({ error: "Submissions are paused right now. Try again later." }, 503);

  const title = clean(body.title, 80);
  if (!title) return json({ error: "Give the picture a title." }, 400);
  if (!body.imageBase64 && !body.imageUrl) return json({ error: "Choose a picture or paste an image link." }, 400);

  const who = ipHash(request);
  const now = Date.now();
  const recent = (await allItems()).filter((i) => i.submittedBy !== undefined);
  if (recent.filter((i) => i.ipHash === who && now - Date.parse(i.addedAt) < 3_600_000).length >= PER_PERSON_PER_HOUR) {
    return json({ error: "That's three pictures this hour. Come back in a bit." }, 429);
  }
  if (recent.filter((i) => now - Date.parse(i.addedAt) < 86_400_000).length >= PER_DAY) {
    return json({ error: "The TV has had enough art for today. Try again tomorrow." }, 429);
  }

  let input: Buffer;
  try {
    input = body.imageBase64 ? decodeBase64(body.imageBase64) : await download(body.imageUrl!);
  } catch {
    return json({ error: "Couldn't get that image. Try uploading the file instead." }, 422);
  }

  const name = clean(body.name, 40) || "a friend";
  const artist = clean(body.artist, 60);
  try {
    const item = await addPicture(input, {
      title,
      artist: artist ? `${artist} · sent by ${name}` : `sent by ${name}`,
      source: body.imageUrl ? body.imageUrl.slice(0, 500) : "upload",
      submittedBy: name,
      ipHash: who,
    });
    return json({ ok: true, title: item.title }, 201);
  } catch {
    return json({ error: "That file isn't an image the TV can show." }, 422);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  if (!auth(request, true)) return json({ error: "unauthorized" }, 401);
  let body: { paused?: boolean };
  try {
    body = await request.json();
  } catch {
    return json({ error: "send JSON: { paused }" }, 400);
  }
  await writeConfig({ paused: !!body.paused });
  return json({ open: !body.paused });
}
