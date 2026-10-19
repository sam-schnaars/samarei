import React, { useEffect, useRef, useState } from "react";

// Public form: anything sent here shows up on Sam's living-room TV within a few minutes (/api/submit).

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; title: string }
  | { kind: "error"; message: string };

/** Shrinks a picture to at most 1920px on its long side and re-encodes it as JPEG (drops location data). */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("unreadable"));
      i.src = url;
    });
    const scale = Math.min(1, 1920 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("unreadable");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function SubmitArt() {
  const [open, setOpen] = useState<boolean | null>(null);
  const [image, setImage] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [previewFailed, setPreviewFailed] = useState(false);
  const startedAt = useRef(Date.now());
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.title = "Send art to Sam's TV — samarei.com";
    fetch("/api/submit")
      .then((r) => r.json())
      .then((d) => setOpen(!!d.open))
      .catch(() => setOpen(true));
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setImage(await shrink(file));
      setImageUrl("");
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 80));
      setStatus({ kind: "idle" });
    } catch {
      setStatus({ kind: "error", message: "This browser can't read that file. Try a JPG or PNG." });
    }
  };

  const preview = image || (/^https?:\/\//.test(imageUrl) ? imageUrl : "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image && !imageUrl.trim()) {
      setStatus({ kind: "error", message: "Choose a picture or paste an image link." });
      return;
    }
    if (!title.trim()) {
      setStatus({ kind: "error", message: "Give the picture a title." });
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: image || undefined,
          imageUrl: image ? undefined : imageUrl.trim(),
          title,
          artist,
          name,
          website,
          startedAt: startedAt.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: "error", message: data.error ?? "Something went wrong. Try again." });
        return;
      }
      setStatus({ kind: "sent", title });
    } catch {
      setStatus({ kind: "error", message: "Couldn't reach the server. Check your connection and try again." });
    }
  };

  const reset = () => {
    setImage("");
    setImageUrl("");
    setTitle("");
    setArtist("");
    setStatus({ kind: "idle" });
    if (fileInput.current) fileInput.current.value = "";
  };

  const field = "w-full border border-gray-300 rounded-md p-2 text-black bg-white focus:outline-none focus:border-black";

  return (
    <div className="bg-white mx-[5vw] min-h-[80vh]">
    <div className="max-w-xl mx-auto px-4 py-12 font-serif text-black">
      <h1 className="text-4xl italic">Put something on my TV</h1>
      <p className="mt-3 text-lg text-gray-600">
        Send a picture and it shows up on the TV in my living room within a few minutes, hanging between the
        Hoppers and the Magrittes. Paintings, photos, anything you'd put on a wall. Keep it kind.
      </p>

      {open === false && (
        <p className="mt-8 p-4 border border-gray-300 rounded-lg">Submissions are paused right now. Check back later.</p>
      )}

      {status.kind === "sent" ? (
        <div className="mt-10 p-6 border border-gray-300 rounded-lg">
          <p className="text-2xl italic">“{status.title}” is on its way.</p>
          <p className="mt-2 text-gray-600">It should be on the TV in a few minutes. Thank you.</p>
          <button onClick={reset} className="mt-6 bg-black text-white py-2 px-6 rounded-full">
            Send another
          </button>
        </div>
      ) : (
        open !== false && (
          <form onSubmit={submit} className="mt-10 flex flex-col gap-6">
            <label
              className="flex flex-col items-center justify-center gap-2 border border-dashed border-gray-400 rounded-lg p-6 cursor-pointer hover:border-black text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFile(e.dataTransfer.files?.[0]);
              }}
            >
              {preview && !previewFailed ? (
                <img
                  src={preview}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setPreviewFailed(true)}
                  className="max-h-72 rounded shadow"
                />
              ) : preview && previewFailed ? (
                <span className="text-sm text-gray-500">Can't preview that link. Check it opens as an image.</span>
              ) : (
                <>
                  <span className="text-lg">Choose a picture</span>
                  <span className="text-sm text-gray-500">or drop it here. JPG, PNG or a phone photo.</span>
                </>
              )}
              <input
                ref={fileInput}
                id="art-file"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Or paste a link to an image</span>
              <input
                id="art-url"
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setPreviewFailed(false);
                  if (e.target.value) setImage("");
                }}
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Title</span>
              <input id="art-title" required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <label className="flex flex-col gap-1 min-w-0">
                <span className="text-sm text-gray-600">Artist (optional)</span>
                <input id="art-artist" maxLength={60} value={artist} onChange={(e) => setArtist(e.target.value)} className={field} />
              </label>
              <label className="flex flex-col gap-1 min-w-0">
                <span className="text-sm text-gray-600">Your name (optional)</span>
                <input id="art-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} className={field} />
              </label>
            </div>

            {/* Honeypot: hidden from people, irresistible to bots. */}
            <input
              id="art-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />

            {status.kind === "error" && <p className="text-red-700">{status.message}</p>}

            <button
              type="submit"
              disabled={status.kind === "sending"}
              className="self-start bg-black text-white py-3 px-8 rounded-full text-lg disabled:opacity-50"
            >
              {status.kind === "sending" ? "Sending…" : "Send to the TV"}
            </button>
            <p className="text-sm text-gray-500">Your name shows under the picture on the TV.</p>
          </form>
        )
      )}
    </div>
    </div>
  );
}
