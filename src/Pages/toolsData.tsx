import React from "react";
import Spinning3DObject from "./3dVectors";
import JeanModelWithFixedLayout from "./JeanModelVisual";
import GroqPage from "./GroqPage";
import FakeTextMeme from "./FakeTextMeme";
import ConstructionMaps from "./ConstructionMaps";
import DroneSim from "./DroneSim";

export interface Tool {
  slug: string;
  title: string;
  description: string;
  component: React.ComponentType;
}

export const tools: Tool[] = [
  {
    slug: "drone",
    title: "drone sim",
    description: "fly the $40 drone i reverse-engineered, in 3d, with its real control protocol",
    component: DroneSim,
  },
  {
    slug: "construction-maps",
    title: "us construction maps",
    description: "live maps of where 5 major us cities are building, from city permit data (bring your own mapbox key)",
    component: ConstructionMaps,
  },
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
    description: "synonyms and quotes from llama on groq (bring your own key)",
    component: GroqPage,
  },
];

export const getToolBySlug = (slug: string): Tool | undefined =>
  tools.find((t) => t.slug === slug);
