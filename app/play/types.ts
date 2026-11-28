export type PlayLink = {
  id: string;
  label: string;
  href: string;
  external: boolean;
};

export type PlayPublication = {
  title: string;
  label: string;
  venue: string;
  year: string;
  authors: string;
  projectHref?: string;
  paperHref?: string;
  codeHref?: string;
};

export type PlayPost = {
  title: string;
  description: string;
  href: string;
  date: string;
};

export type PlayEducation = {
  degree: string;
  institution: string;
  period: string;
  note?: string;
};

export type PlayNews = {
  date: string;
  content: string;
  link?: string;
};

export type PlayAward = {
  year: string;
  title: string;
  detail?: string;
};

export type PlayContent = {
  profile: {
    name: string;
    role: string;
    affiliation: string;
    bio: string[];
  };
  links: PlayLink[];
  publications: PlayPublication[];
  posts: PlayPost[];
  education: PlayEducation[];
  news: PlayNews[];
  awards: PlayAward[];
};
