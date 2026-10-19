// Synonym AI (/synonyms page): runs the page's two prompts on Groq server-side, so the Groq key never
// reaches the browser. The prompts are fixed here; visitors only send the word and optional context,
// which keeps this from working as an open LLM proxy.
//
//   POST /api/synonyms  { word, context? }  ->  { synonyms: string, quotes: string }

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

async function complete(prompt: string): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], max_tokens: 400 }),
  });
  if (!res.ok) throw new Error(`groq ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.GROQ_API_KEY) return json({ error: "not configured" }, 503);
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
    const [synonyms, quotes] = await Promise.all([complete(synonymsPrompt), complete(quotesPrompt)]);
    return json({ synonyms, quotes });
  } catch {
    return json({ error: "the word service is unavailable, try again" }, 502);
  }
}
