// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  interface Window {
    // injected by the umami tag in app.html. OPTIONAL on purpose: it is a
    // third-party script, so ad-blockers, a failed request, or the ?test
    // eject all leave it undefined. Typing it as present would let a call
    // site throw inside a handler that had real work left to do.
    umami?: {
      track: (
        event: string,
        data?: Record<string, string | number | boolean>,
      ) => void;
    };
  }
}

export {};
