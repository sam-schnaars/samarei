import { useCallback, useEffect, useRef, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { getToolBySlug } from "./toolsData";

type Visual =
  | { kind: "image"; src: string; alt: string; portrait?: boolean; bg?: string }
  | { kind: "video"; src: string; poster: string; bg: string }
  | { kind: "text"; label: string };

type Project = {
  title: string;
  blurb: string;
  details: string[];
  cta: string;
  visual: Visual;
  // Either an outside link, or the slug of a tool that opens in place.
  href?: string;
  tool?: string;
};

// Drone and Sammy Word first, then hardest to easiest to build.
const projects: Project[] = [
  {
    title: "drone sim",
    blurb: "I reverse-engineered a $40 drone so I can fly it from Python, then built a 3D sim that speaks its real protocol.",
    details: [
      "Live video decoding, YOLO and AI vision missions, and a 3D-printed latch that drops payloads over ESP-NOW.",
      "The sim has the full write-up underneath.",
    ],
    cta: "fly the sim",
    tool: "drone",
    visual: { kind: "video", src: "/drone/payload_drop.mp4", poster: "/drone/payload_drop_poster.webp", bg: "#e9e5dc" },
  },
  {
    title: "sammy word",
    blurb: "A game of the day for your group chat, inside iMessage.",
    details: [
      "Play without leaving Messages; your score drops into the chat as pixel art so friends can try to beat it.",
      "Word Hunt, Flag Match, Deep Cut and Scroll Recall, plus a featured daily game and streaks.",
    ],
    cta: "play in messages",
    href: "/sammyword",
    visual: {
      kind: "image",
      src: "/projects/sammyword.webp",
      alt: "Sammy Word's pixel-art game menu: Word Hunt, Flag Match, Deep Cut and Scroll Recall",
      portrait: true,
      bg: "#1c1838",
    },
  },
  {
    title: "muselist",
    blurb: "A classifieds board where every post is a task somebody's AI agent is running for them.",
    details: [
      "Browse what other people have their muse doing, ask questions about any task, and clone one onto your own.",
      "AI drafts listings from plain English and searches by intent, and falls back to plain search if the model is down.",
    ],
    cta: "visit the board",
    href: "https://muselist.vercel.app",
    visual: {
      kind: "image",
      src: "/projects/muselist.webp",
      alt: "The muselist board: a dense list of agent tasks with categories, budgets and run counts",
    },
  },
  {
    title: "computer vision for denim",
    blurb: "A model that tells bootcut from straight-leg jeans, trained on 122 scraped photos.",
    details: ["EfficientNet with an attention layer, 80% test accuracy, and Grad-CAM maps showing it looks at the hem."],
    cta: "see the model",
    tool: "denim-cv",
    visual: {
      kind: "image",
      src: "/projects/denim-cv.webp",
      alt: "Model diagram next to a pair of jeans and its Grad-CAM heatmap",
    },
  },
  {
    title: "us construction maps",
    blurb: "Live maps of where 5 major US cities are building, from city permit data.",
    details: ["Bring your own Mapbox key; it stays in your browser."],
    cta: "open the maps",
    tool: "construction-maps",
    visual: { kind: "text", label: "permits, mapped" },
  },
  {
    title: "fake text meme generator",
    blurb: "Build fake group-chat screenshots in seconds.",
    details: ["Pick names and colors, write the thread, and download or share the image."],
    cta: "make one",
    tool: "fake-text-meme",
    visual: {
      kind: "image",
      src: "/projects/fake-text-meme.webp",
      alt: "The meme generator's message editor next to a chat preview",
    },
  },
  {
    title: "3d vector visualizer",
    blurb: "Interactive linear algebra in the browser with three.js.",
    details: ["Add vectors, edit their coordinates, and orbit around them."],
    cta: "play with vectors",
    tool: "3d-vectors",
    visual: {
      kind: "image",
      src: "/projects/3d-vectors.webp",
      alt: "A vector drawn on 3D axes with a coordinate editor",
    },
  },
  {
    title: "synonym generator",
    blurb: "Synonyms and quotes from Llama on Groq.",
    details: ["Bring your own Groq key; it stays in your browser."],
    cta: "find synonyms",
    tool: "synonyms",
    visual: { kind: "text", label: "words for words" },
  },
];

function VisualBlock({ v }: { v: Visual }) {
  if (v.kind === "video") {
    return (
      <div className="flex justify-center rounded-lg py-8" style={{ background: v.bg }}>
        <video
          src={v.src}
          poster={v.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Real footage of the drone taking off, flying and dropping its payload"
          className="h-[420px] md:h-[480px] w-auto aspect-[9/16] rounded-[28px] border-4 border-black/80 shadow-xl bg-black"
        />
      </div>
    );
  }
  if (v.kind === "text") {
    return (
      <div className="aspect-[16/9] w-full flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:bg-gray-100">
        <span className="font-serif text-3xl md:text-4xl text-gray-500 italic">{v.label}</span>
      </div>
    );
  }
  if (v.portrait) {
    return (
      <div className="flex justify-center rounded-lg py-8" style={{ background: v.bg }}>
        <img
          src={v.src}
          alt={v.alt}
          loading="lazy"
          decoding="async"
          className="h-[420px] md:h-[480px] w-auto rounded-[28px] border-4 border-black/80 shadow-xl"
        />
      </div>
    );
  }
  return (
    <img
      src={v.src}
      alt={v.alt}
      loading="lazy"
      decoding="async"
      className="w-full h-auto rounded-lg border border-gray-200 shadow-md transition-shadow hover:shadow-lg"
    />
  );
}

export default function Projects() {
  const { toolSlug } = useParams<{ toolSlug: string }>();
  const navigate = useNavigate();
  const openSlug = toolSlug && getToolBySlug(toolSlug) ? toolSlug : null;
  const openRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => navigate("/", { preventScrollReset: true }), [navigate]);

  useEffect(() => {
    if (!openSlug) return;
    const tool = getToolBySlug(openSlug);
    const previous = document.title;
    if (tool) document.title = `${tool.title} — samarei.com`;
    const id = window.setTimeout(
      () => openRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      60,
    );
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.title = previous;
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [openSlug, close]);

  return (
    <section className="w-full flex flex-col items-center px-[5vw] py-16 font-serif text-black">
      <h2 className="text-4xl font-thin mb-14 md:mb-20">things i've made</h2>
      <div className="w-full max-w-6xl flex flex-col gap-20 md:gap-28">
        {projects.map((p, i) => {
          const external = !!p.href?.startsWith("http");
          const isOpen = !!p.tool && openSlug === p.tool;
          const Tool = p.tool ? getToolBySlug(p.tool)?.component : undefined;

          const linkProps = p.tool
            ? {
                href: `/${p.tool}`,
                onClick: (e: MouseEvent) => {
                  e.preventDefault();
                  if (isOpen) close();
                  else navigate(`/${p.tool}`, { preventScrollReset: true });
                },
                "aria-expanded": isOpen,
              }
            : { href: p.href, target: external ? "_blank" : undefined, rel: external ? "noreferrer" : undefined };

          return (
            <div key={p.title}>
              <article
                className={`flex flex-col gap-8 md:gap-14 md:items-center ${
                  i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
                }`}
              >
                <a {...linkProps} className="block md:w-3/5" aria-label={`${p.cta}: ${p.title}`}>
                  <VisualBlock v={p.visual} />
                </a>
                <div className="md:w-2/5">
                  <h3 className="text-3xl md:text-4xl">{p.title}</h3>
                  <p className="mt-3 text-xl leading-relaxed">{p.blurb}</p>
                  {p.details.map((d) => (
                    <p key={d} className="mt-3 font-sans text-[15px] leading-relaxed text-gray-700">
                      {d}
                    </p>
                  ))}
                  <a
                    {...linkProps}
                    className="inline-block mt-6 bg-white text-black border border-black px-6 py-2 text-lg hover:bg-gray-100 transition-colors"
                  >
                    {isOpen ? "close" : p.cta} {isOpen ? "×" : p.tool ? "↓" : "→"}
                  </a>
                </div>
              </article>

              {isOpen && Tool && (
                <motion.div
                  ref={openRef}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-10 rounded-lg border border-gray-300 shadow-lg overflow-hidden bg-white scroll-mt-24"
                >
                  <button
                    onClick={close}
                    className="w-full flex items-baseline justify-between px-4 md:px-6 py-3 border-b border-gray-200 text-left hover:bg-gray-50"
                  >
                    <span className="text-xl font-serif">{p.title}</span>
                    <span className="font-sans text-sm text-gray-500">close ×</span>
                  </button>
                  <div className="w-full h-[75vh]">
                    <Tool />
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
