// Synonym AI (/synonyms page): runs the page's two prompts on Groq. The shared key was pulled after
// abuse, so visitors bring their own Groq key in the `x-groq-key` header. It is used for this one
// request and never stored or logged. The prompts are fixed here; visitors only send the word and
// optional context, which keeps this from working as an open LLM proxy.
//
//   POST /api/synonyms  { word, context? }  (x-groq-key: gsk_...)  ->  { synonyms: string, quotes: string }

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function clean(s: unknown, max: number): string {
  return typeof s === "string" ? s.replace(/[\u0000-\u001f"]/g, " ").trim().slice(0, max) : "";
}

async function complete(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], max_tokens: 400 }),
  });
  if (!res.ok) throw Object.assign(new Error(`groq ${res.status}`), { status: res.status });
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = (request.headers.get("x-groq-key") ?? "").trim() || process.env.GROQ_API_KEY || "";
  if (!apiKey) return json({ error: "a Groq API key is required" }, 401);
  let body: { word?: unknown; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "send JSON: { word, context? }" }, 400);
  }
  const word = clean(body.word, 60);
  const context = clean(body.context, 300);
  if (!word) return json({ error: "word is required" }, 400);

  const synonymsPrompt = `Given the context: "${context}", give me exactly ten single word synonyms of "${word}". Return no other text, such as any kind of introduction. Separate each synonym with a space and then a |.`;
  const quotesPrompt = `Given the context: "${context}", give me three artistic artistic quotes / lines on "${word}" from incredible people. Separate each with a | and return no other text. Lets say I ask for quotes about love you should return this:
    “Love is composed of a single soul inhabiting two bodies.” — Aristotle | “Where there is love there is life.” — Mahatma Gandhi | “To love and be loved is to feel the sun from both sides.” — David Viscott`;

  try {
    const [synonyms, quotes] = await Promise.all([complete(synonymsPrompt, apiKey), complete(quotesPrompt, apiKey)]);
    return json({ synonyms, quotes });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) return json({ error: "that Groq key was rejected" }, 401);
    return json({ error: "the word service is unavailable, try again" }, 502);
  }
}
