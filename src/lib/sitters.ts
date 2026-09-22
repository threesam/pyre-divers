// who sits by the fire. one row per person: the head cutout in static/sitters,
// which log they're on (index into LOGS), and what the card says when their
// head is clicked. hosts link the latest dive; a guest carries their episode.
export interface Sitter {
  name: string;
  full: string;
  head: string;
  /** intrinsic px of `head` (240 tall), so the layout never guesses */
  w: number;
  /** rendered head height in viewport heights */
  h: number;
  log: number;
  role: 'host' | 'guest';
  /** the guest's episode slug; hosts are in every dive */
  episode?: string;
  /** where to find them, shown on the head's card */
  links: { label: string; href: string }[];
}

export const SITTERS: Sitter[] = [
  {
    name: 'sam',
    full: "Salvatore D'Angelo",
    head: '/sitters/sam.png',
    w: 204,
    h: 5.8,
    log: 0,
    role: 'host',
    links: [
      { label: 'threesam.com', href: 'https://threesam.com' },
      { label: 'linkedin', href: 'https://linkedin.com/in/threesam' },
    ],
  },
  {
    name: 'steve',
    full: 'Steve Tullius',
    head: '/sitters/steve.png',
    w: 219,
    h: 5.8,
    log: 1,
    role: 'host',
    // ponytail: steve's links go here once he says which
    links: [],
  },
];
