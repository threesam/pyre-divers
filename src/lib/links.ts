// the show's addresses, in one place: the stones on the landing page, the
// sameAs in its json-ld, the feed's self link and llms.txt all read from here,
// so a listing cannot be linked from one surface and forgotten on another.
export const SITE = 'https://pyredivers.com';
export const FEED = `${SITE}/feed.xml`;

export const SHOW: Record<
  'instagram' | 'spotify' | 'youtube' | 'apple' | 'x',
  string
> = {
  instagram: 'https://instagram.com/pyredivers',
  spotify: 'https://open.spotify.com/show/0x25C9ki9Squ3L7HGFQ6qG',
  youtube: 'https://youtube.com/@pyredivers',
  apple: 'https://podcasts.apple.com/us/podcast/pyre-divers/id6814542793',
  x: 'https://x.com/pyredivers',
};

/** every listing, for json-ld sameAs */
export const SAME_AS = Object.values(SHOW);

// json-ld nodes, inlined whole on every page that names them: google reads
// each page's graph on its own, so a bare {"@id"} pointing at the home page
// would lose the name. the profile links are the ones on the hosts' cards
// (src/lib/sitters.ts).
export const HOSTS = [
  {
    '@type': 'Person',
    '@id': `${SITE}/#sam`,
    name: "Sam D'Angelo",
    alternateName: ["Salvatore D'Angelo", 'threesam'],
    url: 'https://threesam.com',
    sameAs: ['https://threesam.com', 'https://linkedin.com/in/threesam'],
  },
  {
    '@type': 'Person',
    '@id': `${SITE}/#steve`,
    name: 'Steve Tullius',
    url: 'https://waitlistworkshops.com',
    sameAs: [
      'https://waitlistworkshops.com',
      'https://www.linkedin.com/in/drtullius/',
    ],
  },
];

export const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'pyre divers',
  url: `${SITE}/`,
  logo: `${SITE}/podcast-cover.jpg`,
  sameAs: SAME_AS,
};
