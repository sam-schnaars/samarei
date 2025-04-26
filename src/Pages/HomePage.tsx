import React from 'react';
import { useTypewriter } from 'react-simple-typewriter';
import { detailedBio, siteData } from '../../siteData';
import ScrollableShowcase from "./FunTools";
import SimpleAnimatedArrow from './AnimatedArrow';

const Hero = () => {
  const {
    github,
    externalHireLink,
    externalHireLinkName,
    description,
    linkedin,
    author,
    largeProfileImage,
  } = siteData;

  const [text] = useTypewriter({
    words: [description || ""],
    typeSpeed: 20,
    loop: 2,
    deleteSpeed: 5,
  });

  const { detailedBio1, detailedBio2, detailedBio3, detailedBio4 } = detailedBio;

  return (
    <>
      <section className="bg-white text-black font-serif">
        {/* Hero Header Section */}
        <div className="h-screen w-full flex flex-col justify-center">
            <h1 className="ml-[5vw] mb-[15vh] text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-normal text-black leading-tight tracking-tight">
                {text}
            </h1>
          <div className="absolute mt-[70vh] ml-[5vw]">
            <section className="flex gap-8">
              <a 
                href={github} 
                target="_blank" 
                rel="noreferrer"
                className="transition-opacity hover:opacity-70"
              >
                <img
                  src="/icons/github.svg"
                  alt={`github logo for ${author}`}
                  width={30}
                  height={30}
                  loading="eager"
                />
              </a>
              <a 
                href={linkedin} 
                target="_blank" 
                rel="noreferrer"
                className="transition-opacity hover:opacity-70"
              >
                <img
                  src="/icons/linkedin.svg"
                  alt={`linkedin logo for ${author}`}
                  width={30}
                  height={30}
                  loading="eager"
                />
              </a>
            </section>
          </div>
        </div>
        
        {/* Scrollable Showcase Component */}
        <div className="mb-32">
          <ScrollableShowcase />
        </div>
        
        {/* Biography Section */}
        <div className="flex flex-col justify-center items-center w-full px-[5vw] mb-32">
          <article className="flex flex-col md:flex-row justify-between items-start w-full max-w-6xl gap-16">
            {/* Text Content */}
            <div className="flex-1">
              <p className="text-xl text-black leading-relaxed mb-8">{detailedBio1}</p>
              <p className="text-xl text-black leading-relaxed mb-8">{detailedBio2}</p>
              <p className="text-xl text-black leading-relaxed mb-8">{detailedBio3}</p>
              <p className="text-xl text-black leading-relaxed mb-10">{detailedBio4}</p>
              <a 
                href={externalHireLink} 
                target="_blank" 
                rel="noreferrer"
              >
                <button className="bg-white text-black border border-black px-8 py-3 text-lg font-serif hover:bg-gray-100 transition-colors">
                  {externalHireLinkName}
                </button>
              </a>
            </div>
            
            {/* img */}
            <div className="flex-1 flex flex-col w-full md:mt-0 mt-16">
              <div className="overflow-hidden">
                <img
                  src={largeProfileImage}
                  alt={`${author}'s profile picture`}
                  loading="eager"
                  width={700}
                  height={500}
                  className="w-full h-auto object-cover"
                />
              </div>
              <p className="mt-3 text-sm italic text-center text-black">
                Me and my CalHacks team (9th place 🤩)
              </p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
};

export default Hero;