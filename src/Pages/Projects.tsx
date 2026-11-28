type Project = {
  title: string;
  blurb: string;
  details: string[];
  href: string;
  cta: string;
  image: string;
  alt: string;
  portrait?: boolean;
};

const projects: Project[] = [
  {
    title: "sammy word",
    blurb: "A game of the day for your group chat, inside iMessage.",
    details: [
      "Play without leaving Messages; your score drops into the chat as pixel art so friends can try to beat it.",
      "Word Hunt, Flag Match, Deep Cut and Scroll Recall, plus a featured daily game and streaks.",
    ],
    href: "/sammyword",
    cta: "play in messages",
    image: "/projects/sammyword.webp",
    alt: "Sammy Word's pixel-art game menu: Word Hunt, Flag Match, Deep Cut and Scroll Recall",
    portrait: true,
  },
  {
    title: "muselist",
    blurb: "A classifieds board where every post is a task somebody's AI agent is running for them.",
    details: [
      "Browse what other people have their muse doing, ask questions about any task, and clone one onto your own.",
      "AI drafts listings from plain English and searches by intent, and falls back to plain search if the model is down.",
    ],
    href: "https://muselist.vercel.app",
    cta: "visit the board",
    image: "/projects/muselist.webp",
    alt: "The muselist board: a dense list of agent tasks with categories, budgets and run counts",
  },
];

export default function Projects() {
  return (
    <section className="w-full flex flex-col items-center px-[5vw] py-16 font-serif text-black">
      <h2 className="text-4xl font-thin mb-14 md:mb-20">things i've made</h2>
      <div className="w-full max-w-6xl flex flex-col gap-20 md:gap-28">
        {projects.map((p, i) => {
          const external = p.href.startsWith("http");
          return (
            <article
              key={p.title}
              className={`flex flex-col gap-8 md:gap-14 md:items-center ${
                i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
              }`}
            >
              <a
                href={p.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                className={`block md:w-3/5 ${
                  p.portrait ? "flex justify-center bg-[#1c1838] rounded-lg py-8" : ""
                }`}
              >
                <img
                  src={p.image}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  className={
                    p.portrait
                      ? "h-[420px] md:h-[480px] w-auto rounded-[28px] border-4 border-black/80 shadow-xl"
                      : "w-full h-auto rounded-lg border border-gray-200 shadow-md transition-shadow hover:shadow-lg"
                  }
                />
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
                  href={p.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  className="inline-block mt-6 bg-white text-black border border-black px-6 py-2 text-lg hover:bg-gray-100 transition-colors"
                >
                  {p.cta} →
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
