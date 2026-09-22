<script>
  import '../app.css';
  let { children } = $props();
</script>

<!-- the hand-drawn wobble filters: every page's slabs and icons use them -->
<svg
  width="0"
  height="0"
  style="position:absolute"
  aria-hidden="true"
  focusable="false"
>
  <filter id="wobble-a" x="-8%" y="-40%" width="116%" height="180%">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.011 0.045"
      numOctaves="2"
      seed="11"
      result="n"
    />
    <feDisplacementMap
      in="SourceGraphic"
      in2="n"
      scale="5"
      xChannelSelector="R"
      yChannelSelector="G"
    />
  </filter>
  <filter id="wobble-b" x="-8%" y="-40%" width="116%" height="180%">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.014 0.04"
      numOctaves="2"
      seed="4"
      result="n"
    />
    <feDisplacementMap
      in="SourceGraphic"
      in2="n"
      scale="6"
      xChannelSelector="R"
      yChannelSelector="G"
    />
  </filter>
  <!-- the icon-scale wobble. a/b/c are tuned for the card frame and the
       button slab, hundreds of px wide; at 27px their scale of 5-7 would
       tear a stroke apart. these icons are 32 user units, so the noise has
       to be ~3 waves across that and the displacement under one unit. -->
  <filter id="wobble-i" x="-14%" y="-14%" width="128%" height="128%">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.09 0.07"
      numOctaves="2"
      seed="7"
      result="n"
    />
    <feDisplacementMap
      in="SourceGraphic"
      in2="n"
      scale="0.9"
      xChannelSelector="R"
      yChannelSelector="G"
    />
  </filter>
</svg>

{@render children()}
