// who sits by the fire. one row per person: the head cutout in static/sitters,
// which log they're on (index into LOGS), and what the card says when their
// head is clicked. hosts link the latest dive; a guest carries their episode.
export interface Sitter {
  name: string;
  full: string;
  head: string;
  /** intrinsic px of `head` (240 tall), so the layout never guesses */
  w: number;
  log: number;
  role: 'host' | 'guest';
  /** the guest's episode slug; hosts get the latest dive instead */
  episode?: string;
  url?: string;
}

export const SITTERS: Sitter[] = [
  {
    name: 'sam',
    full: "Salvatore D'Angelo",
    head: '/sitters/sam.png',
    w: 194,
    log: 0,
    role: 'host',
    url: 'https://threesam.com',
  },
  // steve's cutout looks to his right, so he sits on the right log, facing in
  {
    name: 'steve',
    full: 'Steve Tullius',
    head: '/sitters/steve.png',
    w: 144,
    log: 1,
    role: 'host',
  },
];
