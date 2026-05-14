"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { tools, getToolBySlug } from "./toolsData";

export default function FunTools() {
  const { toolSlug } = useParams<{ toolSlug: string }>();
  const navigate = useNavigate();

  const expandedCardRef = useRef<HTMLDivElement | null>(null);

  const resolvedInitial = toolSlug && getToolBySlug(toolSlug) ? toolSlug : null;
  const [openSlug, setOpenSlug] = useState<string | null>(resolvedInitial);
  // Only set once the card's layout animation has finished. On a direct
  // URL hit (deep link) the container is already inflated, so seed it.
  const [inflatedSlug, setInflatedSlug] = useState<string | null>(
    resolvedInitial,
  );

  // Keep state in sync with URL (e.g. back/forward navigation).
  useEffect(() => {
    setOpenSlug(toolSlug && getToolBySlug(toolSlug) ? toolSlug : null);
  }, [toolSlug]);

  // When the open card changes (or closes / swaps), tear down the previously
  // mounted tool immediately so its UI doesn't ride the collapse animation.
  useEffect(() => {
    if (openSlug !== inflatedSlug) {
      setInflatedSlug(null);
    }
  }, [openSlug, inflatedSlug]);

  // Update document title for nicer share previews / tab labels.
  useEffect(() => {
    const tool = openSlug ? getToolBySlug(openSlug) : null;
    const previous = document.title;
    document.title = tool ? `${tool.title} — samarei.com` : previous;
    return () => {
      document.title = previous;
    };
  }, [openSlug]);

  // Smoothly bring the expanded card into view once it has been laid out.
  useEffect(() => {
    if (!openSlug) return;
    const id = window.setTimeout(() => {
      expandedCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
    return () => window.clearTimeout(id);
  }, [openSlug]);

  const handleClose = useCallback(() => {
    setOpenSlug(null);
    navigate("/");
  }, [navigate]);

  // Close on Escape while a tool is open.
  useEffect(() => {
    if (!openSlug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSlug, handleClose]);

  const handleOpen = (slug: string) => {
    setOpenSlug(slug);
    navigate(`/${slug}`);
  };

  return (
    <div className="w-full flex flex-col items-center bg-white py-16">
      <div className="w-full max-w-7xl px-4 md:px-8 lg:px-12">
        <div className="flex flex-col items-center mb-10 md:mb-14">
          <h1 className="text-4xl font-thin text-black mt-2">fun tools</h1>
          <p className="text-sm font-extralight text-gray-600 mt-3">
            click a preview to expand it
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3 sm:gap-5 md:gap-6">
          {tools.map((tool) => {
            const isOpen = openSlug === tool.slug;
            const isInflated = inflatedSlug === tool.slug;
            const ActiveComponent = tool.component;

            return (
              <motion.div
                key={tool.slug}
                layout
                ref={isOpen ? expandedCardRef : undefined}
                transition={{ type: "spring", stiffness: 160, damping: 26 }}
                onLayoutAnimationComplete={() => {
                  if (openSlug === tool.slug) {
                    setInflatedSlug(tool.slug);
                  }
                }}
                className={`relative rounded-lg overflow-hidden border bg-white ${
                  isOpen
                    ? "col-span-4 border-gray-300 shadow-lg cursor-default"
                    : "border-gray-200 hover:border-black/40 hover:shadow-md cursor-pointer"
                }`}
                onClick={isOpen ? undefined : () => handleOpen(tool.slug)}
                role={isOpen ? undefined : "button"}
                tabIndex={isOpen ? -1 : 0}
                onKeyDown={(e) => {
                  if (isOpen) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpen(tool.slug);
                  }
                }}
                aria-label={isOpen ? undefined : `open ${tool.title}`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isOpen ? (
                    <motion.div
                      key="expanded"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: 1,
                        transition: { duration: 0.25, delay: 0.4 },
                      }}
                      exit={{
                        opacity: 0,
                        transition: { duration: 0.08 },
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClose();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleClose();
                          }
                        }}
                        aria-label={`close ${tool.title}`}
                        className="block w-full text-left px-4 md:px-6 py-4 border-b border-gray-200 transition-opacity hover:opacity-60 cursor-pointer"
                      >
                        <h2 className="text-2xl md:text-3xl font-serif text-black truncate">
                          {tool.title}
                        </h2>
                        <p className="text-sm font-extralight text-gray-600 mt-1">
                          {tool.description}
                        </p>
                      </div>
                      <div className="w-full h-[75vh] bg-white">
                        {isInflated && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="w-full h-full"
                          >
                            <ActiveComponent />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: 1,
                        transition: { duration: 0.25, delay: 0.4 },
                      }}
                      exit={{
                        opacity: 0,
                        transition: { duration: 0.08 },
                      }}
                    >
                      <div className="aspect-[16/10] w-full flex flex-col items-center justify-center text-center px-3 py-4 bg-white">
                        <h2 className="text-black text-sm sm:text-base md:text-2xl font-serif leading-tight">
                          {tool.title}
                        </h2>
                        <p className="hidden md:block text-xs sm:text-sm text-gray-600 font-extralight mt-2">
                          {tool.description}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
