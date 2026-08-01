<script>
  // Epilogue is the reading face — body copy, episode descriptions, transcripts.
  // Same family the garden uses for essays, so the two properties read as one
  // voice. Pyre Display stays on the wordmark and headings: it is a display cut
  // with a single weight, fine set large and short, but it has no bold and no
  // italic, and a transcript runs thousands of words with speakers to mark.
  //
  // Four faces, no more: regular and bold, each with an italic. 500 was dropped
  // because nothing sets it and every unused weight is a ~14KB latin subset.
  // fontsource splits by unicode-range, so a reader of english fetches only the
  // latin cuts and never the latin-ext or vietnamese ones.
  import '@fontsource/epilogue/400.css';
  import '@fontsource/epilogue/400-italic.css';
  import '@fontsource/epilogue/700.css';
  import '@fontsource/epilogue/700-italic.css';
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
