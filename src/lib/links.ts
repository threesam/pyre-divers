// the show's addresses, in one place: the stones on the landing page, the
// sameAs in its json-ld, the feed's self link and llms.txt all read from here,
// so a listing cannot be linked from one surface and forgotten on another.
export const SITE = 'https://pyredivers.com';
export const FEED = `${SITE}/feed.xml`;

export const SHOW: Record<
  'instagram' | 'spotify' | 'youtube' | 'apple' | 'x',
  string | null
> = {
  instagram: 'https://instagram.com/pyredivers',
  spotify: 'https://open.spotify.com/show/0x25C9ki9Squ3L7HGFQ6qG',
  youtube: 'https://youtube.com/@pyredivers',
  // apple podcasts review was submitted 2026-09-21; the show url goes here
  apple: null,
  x: 'https://x.com/pyredivers',
};

/** every listing that exists today, for json-ld sameAs */
export const SAME_AS = Object.values(SHOW).filter(
  (url): url is string => url !== null,
);

export const HOSTS = [
  {
    '@type': 'Person',
    name: "Salvatore D'Angelo",
    url: 'https://threesam.com',
  },
  { '@type': 'Person', name: 'Steve Tullius' },
];
