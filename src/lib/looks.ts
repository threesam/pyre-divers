// The splash has two finished treatments. They are not interchangeable palettes
// — each one is a bundle that only holds together as a set:
//
//   inverse — ink "pyre" on the light side, WHITE "divers" over a core the
//             crowd fills with solid ink. The gradient is mirrored so each word
//             sits on its opposite.
//   ember   — the original. White "pyre", ink "divers", original gradient, and
//             a core that FADES toward the eye.
//
// Why they can't be mixed: the core sits under the bowl of the "d". Fill it
// with ink and a dark "divers" loses that bowl — the word reads "livers". So a
// filled core forces white divers, and a dark divers forces a faded core. The
// gradient has to mirror alongside, or whichever word turned dark lands on the
// darkest corner. Flip one thing and the set breaks; flip the look and it holds.
export type Look = 'inverse' | 'ember';

export interface LookConfig {
  /** false lets the crowd go solid at the drain; true fades it to an eye. */
  fadeCore: boolean;
}

export const LOOKS: Record<Look, LookConfig> = {
  inverse: { fadeCore: false },
  ember: { fadeCore: true },
};

export const DEFAULT_LOOK: Look = 'inverse';
