'use client';

import React, { useMemo, useState } from 'react';

interface Message {
  id: string;
  name: string;
  text: string;
}

const FONT_FAMILY =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// Renders the meme to an offscreen canvas and returns a PNG Blob.
// Drawing directly to canvas keeps text crisp and avoids any html2canvas-style deps.
async function renderMemeToBlob(
  messages: Message[],
  colorFor: (name: string) => string,
): Promise<Blob | null> {
  const width = 900;
  const padding = 40;
  const nameFontSize = 26;
  const bodyFontSize = 24;
  const nameLineHeight = Math.round(nameFontSize * 1.3);
  const bodyLineHeight = Math.round(bodyFontSize * 1.4);
  const gapAfterName = 6;
  const gapBetweenMessages = 28;
  const scale = Math.min(
    3,
    Math.max(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 2),
  );

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) return null;

  const wrapLines = (text: string, weight: 'bold' | 'normal', size: number): string[] => {
    measureCtx.font = `${weight === 'bold' ? 'bold ' : ''}${size}px ${FONT_FAMILY}`;
    const maxWidth = width - padding * 2;
    const paragraphs = text.length === 0 ? [''] : text.split(/\r?\n/);
    const out: string[] = [];
    for (const para of paragraphs) {
      if (!para) {
        out.push('');
        continue;
      }
      const words = para.split(/\s+/).filter(Boolean);
      let line = '';
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (measureCtx.measureText(candidate).width <= maxWidth) {
          line = candidate;
        } else {
          if (line) out.push(line);
          // If a single word is wider than maxWidth, hard-break it.
          if (measureCtx.measureText(word).width > maxWidth) {
            let chunk = '';
            for (const ch of word) {
              if (measureCtx.measureText(chunk + ch).width <= maxWidth) {
                chunk += ch;
              } else {
                if (chunk) out.push(chunk);
                chunk = ch;
              }
            }
            line = chunk;
          } else {
            line = word;
          }
        }
      }
      if (line) out.push(line);
    }
    return out.length ? out : [''];
  };

  const layout = messages.map((m) => ({
    color: colorFor(m.name),
    nameLines: wrapLines(m.name || ' ', 'bold', nameFontSize),
    bodyLines: wrapLines(m.text || '', 'normal', bodyFontSize),
  }));

  let totalHeight = padding;
  for (let i = 0; i < layout.length; i++) {
    const item = layout[i];
    totalHeight += item.nameLines.length * nameLineHeight;
    totalHeight += gapAfterName;
    totalHeight += item.bodyLines.length * bodyLineHeight;
    if (i < layout.length - 1) totalHeight += gapBetweenMessages;
  }
  totalHeight += padding;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(totalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, totalHeight);
  ctx.textBaseline = 'top';

  let y = padding;
  for (const item of layout) {
    ctx.fillStyle = item.color;
    ctx.font = `bold ${nameFontSize}px ${FONT_FAMILY}`;
    for (const ln of item.nameLines) {
      ctx.fillText(ln, padding, y);
      y += nameLineHeight;
    }
    y += gapAfterName;

    ctx.fillStyle = '#000000';
    ctx.font = `${bodyFontSize}px ${FONT_FAMILY}`;
    for (const ln of item.bodyLines) {
      ctx.fillText(ln, padding, y);
      y += bodyLineHeight;
    }
    y += gapBetweenMessages;
  }

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const PALETTE: string[] = [
  '#ED2024', // red
  '#1E64F0', // blue
  '#0F9D58', // green
  '#8E44AD', // purple
  '#E67E22', // orange
  '#16A085', // teal
  '#C2185B', // pink
  '#34495E', // slate
];

const DEFAULT_MESSAGES: Message[] = [
  {
    id: 'm1',
    name: 'Elon Musk',
    text: 'I love sam schnaars',
  },
  {
    id: 'm2',
    name: 'Sam Schnaars',
    text: 'same',
  },
];

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function FakeTextMeme(): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>(DEFAULT_MESSAGES);
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState<null | 'download' | 'share'>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  // Which panel is visible on mobile. Desktop (≥ lg) shows both side-by-side
  // regardless of this state.
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    // Probe with a tiny file; if the browser doesn't even accept the shape,
    // canShare will return false and we'll hide the Share button.
    (() => {
      try {
        const probe = new File([new Uint8Array()], 'probe.png', { type: 'image/png' });
        return navigator.canShare({ files: [probe] });
      } catch {
        return false;
      }
    })();

  // Stable color per unique name, in the order names first appear.
  const autoColorByName = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    let i = 0;
    for (const m of messages) {
      const key = m.name.trim().toLowerCase();
      if (!key) continue;
      if (!(key in map)) {
        map[key] = PALETTE[i % PALETTE.length];
        i += 1;
      }
    }
    return map;
  }, [messages]);

  const uniqueNames = useMemo<string[]>(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const m of messages) {
      const key = m.name.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(m.name.trim());
    }
    return out;
  }, [messages]);

  const colorFor = (name: string): string => {
    const key = name.trim().toLowerCase();
    return colorOverrides[key] || autoColorByName[key] || '#111111';
  };

  const updateMessage = (id: string, patch: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const moveMessage = (id: string, dir: -1 | 1) => {
    setMessages((prev) => {
      const i = prev.findIndex((m) => m.id === id);
      if (i === -1) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const addMessage = () => {
    const lastName = messages[messages.length - 1]?.name || '';
    setMessages((prev) => [
      ...prev,
      { id: newId(), name: lastName || 'New Person', text: '' },
    ]);
  };

  const resetAll = () => {
    setMessages(DEFAULT_MESSAGES);
    setColorOverrides({});
  };

  const clearAll = () => {
    setMessages([{ id: newId(), name: 'You', text: 'Type something...' }]);
    setColorOverrides({});
  };

  const setOverride = (name: string, color: string) => {
    const key = name.trim().toLowerCase();
    setColorOverrides((prev) => ({ ...prev, [key]: color }));
  };

  const clearOverride = (name: string) => {
    const key = name.trim().toLowerCase();
    setColorOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const buildFilename = (): string => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `fake-text-meme-${stamp}.png`;
  };

  const handleDownload = async () => {
    if (exporting) return;
    setExporting('download');
    setStatusMessage('Rendering image...');
    try {
      const blob = await renderMemeToBlob(messages, colorFor);
      if (!blob) {
        setStatusMessage('Sorry, your browser blocked the export.');
        return;
      }
      triggerDownload(blob, buildFilename());
      setStatusMessage('Downloaded!');
    } catch (err) {
      console.error(err);
      setStatusMessage('Something went wrong while exporting.');
    } finally {
      setExporting(null);
      setTimeout(() => setStatusMessage(''), 2500);
    }
  };

  const handleShare = async () => {
    if (exporting) return;
    setExporting('share');
    setStatusMessage('Rendering image...');
    try {
      const blob = await renderMemeToBlob(messages, colorFor);
      if (!blob) {
        setStatusMessage('Sorry, your browser blocked the export.');
        return;
      }
      const file = new File([blob], buildFilename(), { type: 'image/png' });
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: 'Fake text meme',
        });
        setStatusMessage('Shared!');
      } else {
        triggerDownload(blob, file.name);
        setStatusMessage('Sharing not supported here — downloaded instead.');
      }
    } catch (err) {
      const aborted =
        err instanceof DOMException &&
        (err.name === 'AbortError' || err.name === 'NotAllowedError');
      if (!aborted) {
        console.error(err);
        setStatusMessage('Something went wrong while sharing.');
      } else {
        setStatusMessage('');
      }
    } finally {
      setExporting(null);
      setTimeout(() => setStatusMessage(''), 2500);
    }
  };

  const downloadIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="w-4 h-4"
    >
      <path d="M10 3a.75.75 0 0 1 .75.75v7.69l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V3.75A.75.75 0 0 1 10 3Z" />
      <path d="M3.5 13.75a.75.75 0 0 1 .75.75v1.5c0 .138.112.25.25.25h11a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 15.5 17.5h-11a1.75 1.75 0 0 1-1.75-1.75v-1.5a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );

  const shareIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="w-4 h-4"
    >
      <path d="M13 4.5a2.5 2.5 0 1 1 .83 1.86l-5.1 2.94a2.5 2.5 0 0 1 0 1.4l5.1 2.94a2.5 2.5 0 1 1-.75 1.3l-5.1-2.94a2.5 2.5 0 1 1 0-3.96l5.1-2.94A2.5 2.5 0 0 1 13 4.5Z" />
    </svg>
  );

  return (
    <div className="w-full h-full overflow-auto bg-gray-50 flex flex-col">
      {/* Mobile tab bar - sticky to the top of the scrolling tool container */}
      <div className="lg:hidden sticky top-0 z-20 bg-gray-50/95 backdrop-blur border-b border-gray-200">
        <div
          role="tablist"
          aria-label="Meme generator panels"
          className="mx-auto max-w-6xl px-3 py-2 flex gap-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'edit'}
            onClick={() => setMobileTab('edit')}
            className={`flex-1 text-sm font-medium py-2.5 rounded-md transition ${
              mobileTab === 'edit'
                ? 'bg-black text-white shadow-sm'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'preview'}
            onClick={() => setMobileTab('preview')}
            className={`flex-1 text-sm font-medium py-2.5 rounded-md transition ${
              mobileTab === 'preview'
                ? 'bg-black text-white shadow-sm'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl w-full p-3 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1">
        {/* Editor */}
        <div
          className={`lg:w-1/2 flex-col gap-4 ${
            mobileTab === 'edit' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addMessage}
                  className="text-sm bg-black text-white px-3 py-2 rounded-md hover:opacity-90 transition"
                >
                  <span className="sm:hidden">+ Add</span>
                  <span className="hidden sm:inline">+ Add message</span>
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-sm border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100 transition"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-sm border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100 transition"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {messages.map((m, idx) => (
                <div
                  key={m.id}
                  className="border border-gray-200 rounded-md p-3 bg-gray-50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full border border-gray-300 shrink-0"
                      style={{ backgroundColor: colorFor(m.name) }}
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => updateMessage(m.id, { name: e.target.value })}
                      placeholder="Name"
                      className="flex-1 min-w-0 text-base sm:text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded px-2 py-2 sm:py-1 focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveMessage(m.id, -1)}
                        disabled={idx === 0}
                        className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 text-sm sm:text-xs px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMessage(m.id, 1)}
                        disabled={idx === messages.length - 1}
                        className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 text-sm sm:text-xs px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMessage(m.id)}
                        disabled={messages.length <= 1}
                        className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 text-sm sm:text-xs px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Delete message"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={m.text}
                    onChange={(e) => updateMessage(m.id, { text: e.target.value })}
                    placeholder="Message text..."
                    rows={3}
                    className="w-full text-base sm:text-sm text-gray-800 bg-white border border-gray-300 rounded px-2 py-2 sm:py-1.5 focus:outline-none focus:ring-1 focus:ring-black resize-y"
                  />
                </div>
              ))}

              {/* Mobile-friendly footer add button so users don't have to scroll
                  back to the top to add another message. */}
              <button
                type="button"
                onClick={addMessage}
                className="sm:hidden text-sm font-medium border border-dashed border-gray-300 text-gray-700 rounded-md py-3 hover:bg-gray-100 transition"
              >
                + Add another message
              </button>
            </div>
          </div>

          {/* Color controls */}
          <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Name colors</h3>
            {uniqueNames.length === 0 ? (
              <p className="text-sm text-gray-500">Add a name to assign a color.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {uniqueNames.map((name) => {
                  const key = name.toLowerCase();
                  const current = colorFor(name);
                  const overridden = key in colorOverrides;
                  return (
                    <div
                      key={key}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
                    >
                      <div className="flex items-center justify-between gap-2 sm:max-w-[40%]">
                        <span
                          className="font-semibold text-sm truncate"
                          style={{ color: current }}
                          title={name}
                        >
                          {name}
                        </span>
                        <button
                          type="button"
                          onClick={() => clearOverride(name)}
                          disabled={!overridden}
                          className="sm:hidden text-xs px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Auto
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:gap-1.5 flex-1">
                        {PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setOverride(name, c)}
                            className={`w-7 h-7 sm:w-5 sm:h-5 rounded-full border ${
                              current.toLowerCase() === c.toLowerCase()
                                ? 'border-black ring-2 ring-offset-1 ring-black'
                                : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: c }}
                            aria-label={`Set ${name} color to ${c}`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => clearOverride(name)}
                        disabled={!overridden}
                        className="hidden sm:inline-block text-xs px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Auto
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div
          className={`lg:w-1/2 ${
            mobileTab === 'preview' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="lg:sticky lg:top-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm uppercase tracking-wider text-gray-500">
                Preview
              </h2>
              {/* Desktop-only action buttons — on mobile they live in the
                  sticky bottom bar so they're always reachable. */}
              <div className="hidden lg:flex flex-wrap items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={exporting !== null}
                  className="text-sm bg-black text-white px-4 py-2 rounded-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {downloadIcon}
                  {exporting === 'download' ? 'Rendering…' : 'Download'}
                </button>
                {canShareFiles && (
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={exporting !== null}
                    className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {shareIcon}
                    {exporting === 'share' ? 'Preparing…' : 'Share'}
                  </button>
                )}
              </div>
            </div>
            {statusMessage && (
              <span
                role="status"
                aria-live="polite"
                className="text-xs text-gray-500"
              >
                {statusMessage}
              </span>
            )}
            <div
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6 lg:p-8"
              style={{
                fontFamily:
                  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
              }}
            >
              {messages.length === 0 ? (
                <p className="text-gray-400 italic">No messages yet.</p>
              ) : (
                <div className="flex flex-col gap-5">
                  {messages.map((m) => (
                    <div key={m.id}>
                      <div
                        className="text-lg sm:text-xl font-bold leading-snug"
                        style={{ color: colorFor(m.name) }}
                      >
                        {m.name || '\u00A0'}
                      </div>
                      <div className="text-base sm:text-lg text-black leading-snug whitespace-pre-wrap break-words">
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-only sticky action bar so Download/Share are always reachable */}
      <div className="lg:hidden sticky bottom-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200">
        <div className="mx-auto max-w-6xl px-3 py-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={exporting !== null}
            className="flex-1 text-sm font-medium bg-black text-white px-4 py-3 rounded-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {downloadIcon}
            {exporting === 'download' ? 'Rendering…' : 'Download'}
          </button>
          {canShareFiles && (
            <button
              type="button"
              onClick={handleShare}
              disabled={exporting !== null}
              className="flex-1 text-sm font-medium border border-gray-300 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {shareIcon}
              {exporting === 'share' ? 'Preparing…' : 'Share'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
