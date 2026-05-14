interface SiteProps {
  siteTitle?: string;
  secondaryTitle?: string;
  email?: string;
  author?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  externalHireLink?: string;
  externalHireLinkName?: string;
  description?: string;
  detailedBio1?: string;
  detailedBio2?: string;
  detailedBio3?: string;
  detailedBio4?: string;
  footerBriefBio?: string;
  siteKeywords?: string;
  largeProfileImage?: string;
  footerHeadshotImage?: string;
}

type DetailedBioProps = {
  detailedBio1?: string;
  detailedBio2?: string;
  detailedBio3?: string;
  detailedBio4?: string;
};

export const siteData: SiteProps = {
  siteTitle: 'samarei.com',
  secondaryTitle: '',
  email: 'samschnaars@berkeley.edu',
  author: '@samschnaars',
  github: 'https://github.com/sam-schnaars',
  linkedin: 'https://linkedin.com/in/sam-schnaars',
  externalHireLink: 'https://linkedin.com/in/sam-schnaars',
  externalHireLinkName: 'Linkedin',
  // in this case, upwork | change it if you want
  description: `I'm Sam Schnaars - a software / product engineer; scroll down to learn more about me.`,
  footerBriefBio:
    'If you like what you see, please contact me anytime. Click the below gif!',
  siteKeywords:
    'sam schnaars, samuel schnaars, sam schnaars data science, data engineer, data scientist, NLP Engineer, NLP Intern',

  largeProfileImage: '/IMG_0210.webp',
  footerHeadshotImage: '/pic/casual_headshot.webp',
};

export const detailedBio: DetailedBioProps = {
  detailedBio2: `Last month I built a robot that ranked investor pitches with a Chromebook, a speech-to-speech model, and a dynamic frontend leaderboard.`,
};
