import React from "react";
import Spinning3DObject from "./3dVectors";
import JeanModelWithFixedLayout from "./JeanModelVisual";
import GroqPage from "./GroqPage";
import FakeTextMeme from "./FakeTextMeme";

export interface Tool {
  slug: string;
  title: string;
  description: string;
  component: React.ComponentType;
}

export const tools: Tool[] = [
  {
    slug: "fake-text-meme",
    title: "fake text meme generator",
    description: "build fake group-chat screenshots in seconds",
    component: FakeTextMeme,
  },
  {
    slug: "3d-vectors",
    title: "3d vector visualizer",
    description: "interactive linear algebra in the browser with three.js",
    component: Spinning3DObject,
  },
  {
    slug: "denim-cv",
    title: "computer vision for denim",
    description: "gradcam visualizations on used 505 jeans",
    component: JeanModelWithFixedLayout,
  },
  {
    slug: "synonyms",
    title: "synonym generator",
    description: "a tiny chatgpt wrapper for finding synonyms",
    component: GroqPage,
  },
];

export const getToolBySlug = (slug: string): Tool | undefined =>
  tools.find((t) => t.slug === slug);
