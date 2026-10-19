import React, { useCallback, useEffect, useState } from "react";

// Private review page (samarei.com/tv-art, not linked anywhere): everything on Sam's TV, newest first,
// with Remove buttons and a switch to pause public submissions. Unlocked with the TV art write key.

type Item = {
  id: string;
  title: string;
  artist: string;
  image: string;
  addedAt: string;
  submittedBy?: string;
};

const KEY_STORE = "tvArtKey";

function readKey(): string {
  try {
    return localStorage.getItem(KEY_STORE) ?? "";
  } catch {
    return "";
  }
}

function saveKey(k: string) {
  try {
    if (k) localStorage.setItem(KEY_STORE, k);
    else localStorage.removeItem(KEY_STORE);
  } catch {
    // private window: the key just won't be remembered
  }
}

function when(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TvArtReview() {
  const [key, setKey] = useState(readKey());
  const [draft, setDraft] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [open, setOpen] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<"all" | "submissions">("submissions");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "TV art — samarei.com";
  }, []);

  const load = useCallback(async () => {
    if (!key) return;
    setError("");
    const res = await fetch("/api/art", { headers: { Authorization: `Bearer ${key}` } });
    if (res.status === 401) {
      setError("That key didn't work.");
      saveKey("");
      setKey("");
      return;
    }
    const data = await res.json();
    setItems(data.items);
    const s = await fetch("/api/submit").then((r) => r.json());
    setOpen(!!s.open);
  }, [key]);

  useEffect(() => {
    load().catch(() => setError("Couldn't load the art. Try again."));
  }, [load]);

  const remove = async (id: string) => {
    const res = await fetch(`/api/art?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) setItems((all) => (all ?? []).filter((i) => i.id !== id));
    else setError("Couldn't remove that one. Try again.");
    setConfirming(null);
  };

  const togglePause = async () => {
    const res = await fetch("/api/submit", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ paused: !!open }),
    });
    if (res.ok) setOpen((await res.json()).open);
    else setError("Couldn't change submissions. Try again.");
  };

  if (!key) {
    return (
      <div className="bg-white mx-[5vw] min-h-[80vh]">
      <div className="max-w-md mx-auto px-4 py-16 font-serif text-black">
        <h1 className="text-3xl italic">TV art</h1>
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveKey(draft.trim());
            setKey(draft.trim());
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Write key</span>
            <input
              id="review-key"
              type="password"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </label>
          {error && <p className="text-red-700">{error}</p>}
          <button className="self-start bg-black text-white py-2 px-6 rounded-full">Unlock</button>
        </form>
      </div>
      </div>
    );
  }

  const shown = (items ?? []).filter((i) => filter === "all" || i.submittedBy !== undefined);

  return (
    <div className="bg-white mx-[5vw] min-h-[80vh]">
    <div className="max-w-5xl mx-auto px-4 py-12 font-serif text-black">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl italic">TV art</h1>
          <p className="text-gray-600 mt-1">
            {items ? `${items.length} on the TV, ${items.filter((i) => i.submittedBy).length} sent in through /submit.` : "Loading…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">
            Submissions are{" "}
            <strong className={open ? "text-green-700" : "text-red-700"}>{open === null ? "…" : open ? "open" : "paused"}</strong>
          </span>
          <button onClick={togglePause} className="border border-black rounded-full py-1.5 px-4 text-sm">
            {open ? "Pause submissions" : "Open submissions"}
          </button>
          <button
            onClick={() => {
              saveKey("");
              setKey("");
            }}
            className="text-sm underline text-gray-600"
          >
            Lock
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-2" role="tablist">
        {(["submissions", "all"] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full py-1 px-4 text-sm border ${filter === f ? "bg-black text-white border-black" : "border-gray-300"}`}
          >
            {f === "submissions" ? "Sent in" : "Everything"}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-red-700">{error}</p>}

      {items && shown.length === 0 && (
        <p className="mt-10 text-gray-600">
          Nothing sent in yet. Share samarei.com/submit and new pictures will show up here and on the TV.
        </p>
      )}

      <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {shown.map((i) => (
          <li key={i.id} className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-gray-100 aspect-video flex items-center justify-center">
              <img src={i.image} alt={i.title} loading="lazy" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="p-3 flex flex-col gap-1 min-w-0">
              <p className="text-lg leading-snug break-words">{i.title}</p>
              <p className="text-sm text-gray-600 break-words">{i.artist || " "}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">{when(i.addedAt)}</span>
                {confirming === i.id ? (
                  <span className="flex gap-2">
                    <button onClick={() => remove(i.id)} className="text-sm bg-red-700 text-white rounded-full py-1 px-3">
                      Remove from TV
                    </button>
                    <button onClick={() => setConfirming(null)} className="text-sm underline">
                      Keep
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setConfirming(i.id)} className="text-sm underline">
                    Remove
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}
