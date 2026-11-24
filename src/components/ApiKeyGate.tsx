import React, { useState } from "react";

/**
 * Wraps a tool whose shared API key was pulled after abuse. Visitors paste
 * their own key; it lives only in this browser (localStorage) and is sent
 * straight to the provider (or through our API route without being stored).
 */
interface ApiKeyGateProps {
  /** localStorage key, e.g. "samarei:groq-key" */
  storageKey: string;
  provider: string;
  /** Where to get a key. */
  getKeyUrl: string;
  placeholder?: string;
  /** Optional sanity check before saving, return an error message or null. */
  validate?: (key: string) => string | null;
  children: (apiKey: string, clearKey: () => void) => React.ReactNode;
}

function readKey(storageKey: string): string {
  try {
    return localStorage.getItem(storageKey) ?? "";
  } catch {
    return "";
  }
}

export default function ApiKeyGate({
  storageKey,
  provider,
  getKeyUrl,
  placeholder,
  validate,
  children,
}: ApiKeyGateProps) {
  const [apiKey, setApiKey] = useState(() => readKey(storageKey));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const clearKey = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* private mode */
    }
    setApiKey("");
  };

  if (apiKey) return <>{children(apiKey, clearKey)}</>;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const key = draft.trim();
    if (!key) return;
    const problem = validate?.(key) ?? null;
    if (problem) {
      setError(problem);
      return;
    }
    try {
      localStorage.setItem(storageKey, key);
    } catch {
      /* still works for this visit */
    }
    setApiKey(key);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-neutral-50 px-6">
      <form
        onSubmit={save}
        className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-6 md:p-8 shadow-sm font-serif"
      >
        <h3 className="text-2xl text-black">bring your own key</h3>
        <p className="mt-3 text-gray-700 leading-relaxed">
          Due to abuse, you must supply your own {provider} API key to use this tool.
        </p>
        <p className="mt-2 text-sm text-gray-500 font-sans">
          It's saved only in this browser and never stored on our server.{" "}
          <a href={getKeyUrl} target="_blank" rel="noreferrer" className="underline hover:text-black">
            Get a {provider} key
          </a>
        </p>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          placeholder={placeholder ?? `${provider} API key`}
          aria-label={`${provider} API key`}
          className="mt-5 w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm text-black focus:outline-none focus:border-black"
        />
        {error && <p className="mt-2 text-sm text-red-600 font-sans">{error}</p>}
        <button
          type="submit"
          disabled={!draft.trim()}
          className="mt-4 w-full bg-black text-white py-2 rounded-md hover:opacity-85 disabled:opacity-30 transition font-sans"
        >
          use my key
        </button>
      </form>
    </div>
  );
}

/** Small "forget my key" link to place inside a gated tool. */
export function ForgetKeyButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-sans text-gray-500 underline hover:text-black ${className}`}
    >
      forget my key
    </button>
  );
}
