// @ts-nocheck -- verbatim generative-art sim, untyped by design; typed
// refactor happens per-module as features start touching these systems.
// the page's moving parts — verbatim port of the shipped inline script.
// runs once on mount; the landing never unmounts, so no teardown yet.
import { LISTMONK, subscribeFlow } from './subscribe.ts';

export function initPageFx() {
  // headless audits (lighthouse) run swiftshader: every gl context they
  // create is a long task. they get the chunked static frame, gl-free.
  const headlessAudit = /HeadlessChrome/.test(navigator.userAgent);
  // ── seeded rng: the same souls every load
  function mulberry32(seed) {
    let a = seed | 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const TAU = Math.PI * 2,
    PI = Math.PI;
  const INK = [0x21 / 255, 0x26 / 255, 0x14 / 255]; // olive-black

  // geometry — matched to the cover artwork
  const LANES = 3;
  const R_START = 0.72; // spiral starts past every corner
  const K = 0.02124; // log-spiral pitch
  const H_MIN = 0.005; // size floor
  const GAP = 1 - Math.exp((-TAU * K) / LANES); // ring gap as a fraction of r
  const PHI_T = Math.log(R_START / 0.004) / K; // fallback: full span rim → drain
  const OMEGA = TAU / 64; // fallback rotation: one rev per 64 s
  const TILT = PI + Math.atan(K); // rail heading: tangent + pitch
  const HEAD_PX = 9; // bodies at least this tall get a head

  // ── pose library: diver / spread-eagle / arms-up / reach / tuck, all jittered
  function makePose(rand) {
    const t = rand();
    const jit = () => (rand() - 0.5) * 0.26;
    let aL,
      aR,
      lL,
      lR,
      arm = 1,
      leg = 1;
    if (t < 0.3) {
      aL = PI * 0.66;
      aR = PI * 0.34;
      lL = PI * 0.5 + 0.18;
      lR = PI * 0.5 - 0.18;
    } else if (t < 0.5) {
      aL = -PI * 0.78;
      aR = -PI * 0.22;
      lL = PI * 0.5 + 0.34;
      lR = PI * 0.5 - 0.34;
    } else if (t < 0.7) {
      aL = -PI * 0.6;
      aR = -PI * 0.4;
      lL = PI * 0.5 + 0.12;
      lR = PI * 0.5 - 0.12;
    } else if (t < 0.9) {
      aL = -PI * 0.55;
      aR = PI * 0.42;
      lL = PI * 0.5 + 0.1;
      lR = PI * 0.5 - 0.26;
    } else {
      aL = PI * 0.8;
      aR = PI * 0.2;
      lL = PI * 0.5 + 0.46;
      lR = PI * 0.5 - 0.46;
      arm = 0.62;
      leg = 0.62;
    }
    return {
      aL: aL + jit(),
      aR: aR + jit(),
      lL: lL + jit(),
      lR: lR + jit(),
      arm: arm * (0.88 + rand() * 0.24),
      leg: leg * (0.88 + rand() * 0.24),
    };
  }

  function dress(b, rand) {
    b.drift = (rand() + rand() - 1) * 0.8 * GAP;
    b.size = 0.86 + rand() * 0.26;
    if (b.lane !== undefined) {
      b.off = b.lane * (TAU / LANES) + (rand() - 0.5) * 0.03;
      b.r0 = R_START * Math.exp(-K * b.phi);
    }
    const hJit =
      (rand() - 0.5) * 0.55 + (rand() < 0.07 ? (rand() - 0.5) * 2.4 : 0);
    b.hJit = hJit;
    b.cR = Math.cos(TILT + hJit);
    b.sR = Math.sin(TILT + hJit);
    b.cJ = Math.cos(hJit);
    b.sJ = Math.sin(hJit); // jitter alone, for velocity-oriented bodies
    const p = makePose(rand);
    b.arm = 0.36 * p.arm;
    b.leg = 0.36 * p.leg;
    b.aLx = Math.cos(p.aL);
    b.aLy = Math.sin(p.aL);
    b.aRx = Math.cos(p.aR);
    b.aRy = Math.sin(p.aR);
    b.lLx = Math.cos(p.lL);
    b.lLy = Math.sin(p.lL);
    b.lRx = Math.cos(p.lR);
    b.lRy = Math.sin(p.lR);
    return b;
  }

  // ── flow model (shared by sim + fallback tuning): constant deceleration —
  // v² = V_E² + C2·(r − R_E), so every body sheds speed at one steady rate and
  // arrives at the disc edge moving at the disc's spin speed.
  const W_CORE = TAU / 24; // the disc's spin
  const V_RIM_W = (TAU / 70) * R_START; // angular pace anchor at the rim
  let R_CORE = 0.05,
    R_E = 0.046,
    V_E = 0.012,
    C2 = 0.02;
  function tune(fontDevPx, S) {
    R_CORE = (0.315 * fontDevPx) / S;
    R_E = 0.92 * R_CORE;
    V_E = W_CORE * R_E;
    C2 = (V_RIM_W * V_RIM_W - V_E * V_E) / (R_START - R_E);
  }
  const speedN = (rn) =>
    Math.sqrt(Math.max(V_E * V_E + C2 * (rn - R_E), 0.25 * V_E * V_E));

  // field styles (physics-driven bodies)
  // built lazily by startGL — the software-gl path never touches it
  const field = [];
  function buildField() {
    if (field.length) {
      return;
    }
    const rand = mulberry32(777);
    const N = 6000; // dense enough that the carved letterforms stay crisp
    for (let i = 0; i < N; i++) {
      const b = dress({ lane: i % LANES, phi: 0 }, rand);
      b.frac = (i + 0.25 + rand() * 0.5) / N;
      field.push(b);
    }
  }

  // phyllotaxis (sunflower) core: golden-angle packing fills the disc evenly —
  // crisp edge, readable bodies to dead center. Regenerated per resize, count
  // tied to area so the packing density holds.
  function makeCore() {
    const rand = mulberry32(4200);
    const n = Math.max(
      60,
      Math.round((PI * R_CORE * R_CORE) / (1.16 * H_MIN) ** 2),
    );
    const GOLD = PI * (3 - Math.sqrt(5));
    const out = [];
    for (let i = 0; i < n; i++) {
      const b = dress({}, rand);
      b.ang0 = i * GOLD + (rand() - 0.5) * 0.15;
      b.radFrac = Math.sqrt((i + 0.5) / n) * (1 + (rand() - 0.5) * 0.06);
      out.push(b);
    }
    return out;
  }

  function addBody(p, px, py, cR, sR, h, b, withHead) {
    const fx = -sR,
      fy = cR;
    const s2 = h * 0.21;
    p.moveTo(px - fx * s2, py - fy * s2);
    p.lineTo(px + fx * s2, py + fy * s2);
    if (withHead) {
      const hd = h * 0.11,
        hx0 = px - fx * (s2 + hd),
        hy0 = py - fy * (s2 + hd);
      p.moveTo(hx0 + hd, hy0);
      p.arc(hx0, hy0, hd, 0, TAU);
    }
    const sx = px - fx * h * 0.105,
      sy = py - fy * h * 0.105;
    const hx = px + fx * s2,
      hy = py + fy * s2;
    const aL = h * b.arm,
      lL = h * b.leg;
    p.moveTo(sx, sy);
    p.lineTo(
      sx + (b.aLx * cR - b.aLy * sR) * aL,
      sy + (b.aLx * sR + b.aLy * cR) * aL,
    );
    p.moveTo(sx, sy);
    p.lineTo(
      sx + (b.aRx * cR - b.aRy * sR) * aL,
      sy + (b.aRx * sR + b.aRy * cR) * aL,
    );
    p.moveTo(hx, hy);
    p.lineTo(
      hx + (b.lLx * cR - b.lLy * sR) * lL,
      hy + (b.lLx * sR + b.lLy * cR) * lL,
    );
    p.moveTo(hx, hy);
    p.lineTo(
      hx + (b.lRx * cR - b.lRy * sR) * lL,
      hy + (b.lRx * sR + b.lRy * cR) * lL,
    );
  }

  /** @type {HTMLCanvasElement | null} */ let ground = null;
  /** @type {HTMLCanvasElement | null} */ let baked = null;
  let L = 0,
    CX = 0,
    CY = 0;
  const CUTS = [18, 30, 48, 72];

  const canvas = /** @type {HTMLCanvasElement} */ (
    document.getElementById('sea')
  );
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  let seaVisible = true;
  const splashEl = document.getElementById('splash');
  if ('IntersectionObserver' in window && splashEl) {
    new IntersectionObserver(
      (es) => {
        seaVisible = es.some((en) => en.isIntersecting);
      },
      { threshold: 0.02 },
    ).observe(splashEl);
  }
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0,
    H = 0,
    S = 0; // device px
  let cw = 0,
    ch = 0,
    Scss = 0; // css px (sim space)

  function measure() {
    // layout viewport, not visual: stable under pinch zoom
    cw = document.documentElement.clientWidth;
    ch = document.documentElement.clientHeight;
    W = Math.round(cw * dpr);
    H = Math.round(ch * dpr);
    S = Math.round(0.7 * Math.hypot(W, H)); // diagonal-based: corners covered at any aspect
    Scss = S / dpr;
    canvas.width = W;
    canvas.height = H;
    // pin the element to the measured px — iOS in-app browsers stretch 100vh past
    // the visible viewport, which displaced the whole field below the wordmark
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
  }

  // ════════════════════════════════════════════════════════════════════════
  // WebGL2: the field is a real particle sim (transform feedback, garden-style).
  // The vortex is a steering force; "pyre" is a collision obstacle — bodies
  // deflect off the letterforms, so the word stays carved out of the crowd.
  // Per frame the CPU issues one update pass + two instanced draws.
  // ════════════════════════════════════════════════════════════════════════
  function startGL(gl) {
    measure();
    buildField();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
      : '';
    const soft = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
    const N_F = field.length;

    const SIM_VS = `#version 300 es
    precision highp float;
    in vec2 a_position;
    in vec2 a_velocity;
    uniform vec2 u_res;        // css px
    uniform float u_dt;        // 60fps-frame units
    uniform vec2 u_center;
    uniform float u_Scss;
    uniform float u_VE;
    uniform float u_C2;
    uniform float u_RE;
    uniform float u_time;
    out vec2 v_position;
    out vec2 v_velocity;
    const float K = ${K};

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 pos = a_position;
      vec2 vel = a_velocity;

      // steer toward the decelerating current (px per frame)
      vec2 rel = pos - u_center;
      float r = max(length(rel), 1e-3);
      float rn = r / u_Scss;
      vec2 radial = rel / r;
      vec2 tang = vec2(-radial.y, radial.x);
      float vmag = sqrt(max(u_VE * u_VE + u_C2 * (rn - u_RE), 0.25 * u_VE * u_VE));
      float vpf = vmag * u_Scss / 60.0;             // local current, px per frame
      vec2 vdes = normalize(tang - radial * K) * vpf;
      vel += (vdes - vel) * min(0.16 * u_dt, 1.0); // firm steering — the flow closes behind the letters
      // smooth per-body wander (not white noise — that made bodies twirl on their
      // axis): a gentle force whose direction eases to a new random heading every
      // ~1.5s, proportional to the local current. Wakes refill, headings stay calm.
      float id = float(gl_VertexID);
      float tt = u_time * 0.66;
      float ft = floor(tt), s = smoothstep(0.0, 1.0, fract(tt));
      vec2 n0 = vec2(hash(vec2(id, ft)),       hash(vec2(id + 7.0, ft)))       - 0.5;
      vec2 n1 = vec2(hash(vec2(id, ft + 1.0)), hash(vec2(id + 7.0, ft + 1.0))) - 0.5;
      vel += mix(n0, n1, s) * vpf * min(0.16 * u_dt, 1.0);

      pos += vel * u_dt;
      vel *= pow(0.97, u_dt); // bleed cursor impulse; steering re-energizes

      // swallowed by the disc (or lost past the rim) → resurface at the rim
      float rn2 = length(pos - u_center) / u_Scss;
      if (rn2 < u_RE * 0.98 || rn2 > 0.745) {
        float a = hash(pos + vel) * 6.2831853;
        vec2 dir = vec2(cos(a), sin(a));
        pos = u_center + dir * ${R_START} * u_Scss;
        vec2 t2 = vec2(-dir.y, dir.x);
        vel = normalize(t2 - dir * K) * sqrt(u_VE * u_VE + u_C2 * (${R_START} - u_RE)) * u_Scss / 60.0;
      }

      v_position = pos;
      v_velocity = vel;
      gl_Position = vec4(0.0);
    }`;

    const SIM_FS = `#version 300 es
    precision mediump float;
    out vec4 o;
    void main() { o = vec4(0.0); }`;

    const VS = `#version 300 es
    precision highp float;
    uniform vec2 uRes;      // device px
    uniform float uS;       // device px
    uniform float uDpr;
    uniform float uSpin;
    uniform float uCore;
    uniform float uRCORE;
    uniform float uRE;
    layout(location=0) in vec3 aTpl;  // segId, end(0|1), side(-1|1)
    layout(location=1) in vec4 aA;    // core: ang0, radFrac, 0, size · field: 0,0,0,size
    layout(location=2) in vec4 aB;    // core: rotC, rotS · field: cos(jit), sin(jit) · zw: armLen, legLen
    layout(location=3) in vec4 aC;    // armL dir, armR dir
    layout(location=4) in vec4 aD;    // legL dir, legR dir
    layout(location=5) in vec2 aPos;  // field only: css px (instanced, from the sim)
    layout(location=6) in vec2 aVel;  // field only
    out vec2 vLocal;
    out float vHalfLen;
    out float vHalfW;
    out float vHead;
    out float vFade;

    const float K = ${K};
    const float H_MIN = ${H_MIN};

    void main() {
      vec2 center;
      float h, cR, sR;
      vFade = 1.0;
      if (uCore > 0.5) {
        float ang = aA.x + uSpin;            // the sunflower disc spins as one
        float r = aA.y * uRCORE;
        vFade = smoothstep(uRE * 0.3, uRE * 3.2, r); // same long ramp as the field — one smooth dim
        float ca = cos(ang), sa = sin(ang);
        center = uRes * 0.5 + vec2(ca, sa) * r * uS;
        h = max(0.052 * r, H_MIN) * aA.w * uS;
        cR = ca * aB.x - sa * aB.y;
        sR = sa * aB.x + ca * aB.y;
      } else {
        vec2 pC = aPos * uDpr;
        vec2 rel = pC - uRes * 0.5;
        float rn = max(length(rel), 1e-3) / uS;
        center = pC;
        h = max(0.052 * rn, H_MIN) * aA.w * uS;
        // head-first along the velocity, plus the personal jitter
        vec2 vdir = normalize(aVel + vec2(1e-5, 0.0));
        float c0 = -vdir.y, s0 = vdir.x;
        cR = c0 * aB.x - s0 * aB.y;
        sR = s0 * aB.x + c0 * aB.y;
        vFade = smoothstep(uRE * 0.3, uRE * 3.2, rn); // long ramp: outpaces the crowding, no dark ring
      }

      float w = max(uS * 0.0008, 0.09 * h);
      float halfW = w * 0.5 + 1.0;
      vHalfW = w * 0.5;

      int seg = int(aTpl.x + 0.5);
      vHead = seg == 5 ? 1.0 : 0.0;

      vec2 p0, p1;
      if      (seg == 0) { p0 = vec2(0.0, -0.21); p1 = vec2(0.0, 0.21); }
      else if (seg == 1) { p0 = vec2(0.0, -0.105); p1 = p0 + aC.xy * aB.z; }
      else if (seg == 2) { p0 = vec2(0.0, -0.105); p1 = p0 + aC.zw * aB.z; }
      else if (seg == 3) { p0 = vec2(0.0, 0.21);  p1 = p0 + aD.xy * aB.w; }
      else if (seg == 4) { p0 = vec2(0.0, 0.21);  p1 = p0 + aD.zw * aB.w; }
      else               { p0 = vec2(0.0, -0.32); p1 = p0; }

      mat2 R = mat2(cR, sR, -sR, cR);
      vec2 W0 = center + R * (p0 * h);
      vec2 W1 = center + R * (p1 * h);

      vec2 pos;
      if (seg == 5) {
        float headR = 0.11 * h;
        vHalfLen = headR;
        float ext = headR + halfW;
        vLocal = vec2(aTpl.z, aTpl.y * 2.0 - 1.0) * ext;
        pos = W0 + vLocal;
        if (h < float(${HEAD_PX})) pos = W0;
      } else {
        vec2 d = W1 - W0;
        float len = max(length(d), 1e-4);
        vec2 t = d / len;
        vec2 nrm = vec2(-t.y, t.x);
        vHalfLen = len * 0.5;
        float along = mix(-(vHalfLen + halfW), vHalfLen + halfW, aTpl.y);
        vLocal = vec2(along, aTpl.z * halfW);
        pos = (W0 + W1) * 0.5 + t * along + nrm * (aTpl.z * halfW);
      }
      gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, 0.0, 1.0);
    }`;

    const FS = `#version 300 es
    precision highp float;
    uniform vec3 uInk;
    in vec2 vLocal;
    in float vHalfLen;
    in float vHalfW;
    in float vHead;
    in float vFade;
    out vec4 frag;
    void main() {
      float d;
      if (vHead > 0.5) {
        d = abs(length(vLocal) - vHalfLen);
      } else {
        vec2 q = vec2(max(abs(vLocal.x) - vHalfLen, 0.0), vLocal.y);
        d = length(q);
      }
      float a = (1.0 - smoothstep(vHalfW - 0.75, vHalfW + 0.75, d)) * vFade;
      if (a <= 0.001) discard;
      frag = vec4(uInk * a, a);
    }`;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s));
      }
      return s;
    }
    function link(vs, fs, tf) {
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      if (tf) {
        gl.transformFeedbackVaryings(p, tf, gl.SEPARATE_ATTRIBS);
      }
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(p));
      }
      return p;
    }
    const simProg = link(SIM_VS, SIM_FS, ['v_position', 'v_velocity']);
    const prog = link(VS, FS);

    // template: 6 segments × two triangles
    const tpl = [];
    for (let seg = 0; seg < 6; seg++) {
      const c = [
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 1],
      ];
      for (const i of [0, 1, 2, 2, 1, 3]) {
        tpl.push(seg, c[i][0], c[i][1]);
      }
    }
    const tplBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tplBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tpl), gl.STATIC_DRAW);

    function styleBuffer(list, pack) {
      const f = new Float32Array(list.length * 16);
      let o = 0;
      for (const b of list) {
        pack(b, f, o);
        o += 4;
        f[o++] = b.cJ;
        f[o++] = b.sJ;
        f[o++] = b.arm;
        f[o++] = b.leg;
        f[o++] = b.aLx;
        f[o++] = b.aLy;
        f[o++] = b.aRx;
        f[o++] = b.aRy;
        f[o++] = b.lLx;
        f[o++] = b.lLy;
        f[o++] = b.lRx;
        f[o++] = b.lRy;
      }
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, f, gl.STATIC_DRAW);
      return { buf, count: list.length };
    }
    // field style: jitter-oriented (cJ/sJ); core style: rail-oriented (cR/sR)
    const flowStyle = styleBuffer(field, (b, f, o) => {
      f[o + 3] = b.size;
    });
    /** @type {{ buf: WebGLBuffer | null, count: number } | null} */
    let drain = null;
    function rebuildCore() {
      const list = makeCore();
      const f = new Float32Array(list.length * 16);
      let o = 0;
      for (const b of list) {
        f[o] = b.ang0;
        f[o + 1] = b.radFrac;
        f[o + 3] = b.size;
        o += 4;
        f[o++] = b.cR;
        f[o++] = b.sR;
        f[o++] = b.arm;
        f[o++] = b.leg;
        f[o++] = b.aLx;
        f[o++] = b.aLy;
        f[o++] = b.aRx;
        f[o++] = b.aRy;
        f[o++] = b.lLx;
        f[o++] = b.lLy;
        f[o++] = b.lRx;
        f[o++] = b.lRy;
      }
      if (!drain) {
        drain = { buf: gl.createBuffer(), count: 0 };
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, drain.buf);
      gl.bufferData(gl.ARRAY_BUFFER, f, gl.STATIC_DRAW);
      drain.count = list.length;
    }

    // particle state (ping-pong)
    const posBufs = [gl.createBuffer(), gl.createBuffer()];
    const velBufs = [gl.createBuffer(), gl.createBuffer()];
    let active = 0;

    function seedParticles() {
      const P = new Float32Array(N_F * 2);
      const V = new Float32Array(N_F * 2);
      const cx = cw / 2,
        cy = ch / 2;
      for (let i = 0; i < N_F; i++) {
        const b = field[i];
        const w = V_E + (V_RIM_W - V_E) * b.frac;
        const r0 = R_E + (w * w - V_E * V_E) / C2;
        const rn = r0 * (1 + b.drift);
        const ang = Math.log(R_START / r0) / K + b.off;
        const px = cx + Math.cos(ang) * rn * Scss;
        const py = cy + Math.sin(ang) * rn * Scss;
        P[i * 2] = px;
        P[i * 2 + 1] = py;
        const rel = [px - cx, py - cy];
        const r = Math.max(Math.hypot(rel[0], rel[1]), 1e-3);
        const tang = [-rel[1] / r, rel[0] / r];
        const rad = [rel[0] / r, rel[1] / r];
        const dx = tang[0] - rad[0] * K,
          dy = tang[1] - rad[1] * K;
        const dl = Math.hypot(dx, dy);
        const v = (speedN(r / Scss) * Scss) / 60;
        V[i * 2] = (dx / dl) * v;
        V[i * 2 + 1] = (dy / dl) * v;
      }
      for (let i = 0; i < 2; i++) {
        gl.bindBuffer(gl.ARRAY_BUFFER, posBufs[i]);
        gl.bufferData(gl.ARRAY_BUFFER, P, gl.DYNAMIC_COPY);
        gl.bindBuffer(gl.ARRAY_BUFFER, velBufs[i]);
        gl.bufferData(gl.ARRAY_BUFFER, V, gl.DYNAMIC_COPY);
      }
    }

    // VAOs — sim reads pos/vel (locations queried: that shader has no layouts);
    // render adds template + style + instanced state
    const sPosLoc = gl.getAttribLocation(simProg, 'a_position');
    const sVelLoc = gl.getAttribLocation(simProg, 'a_velocity');
    const simVaos = [gl.createVertexArray(), gl.createVertexArray()];
    for (let i = 0; i < 2; i++) {
      gl.bindVertexArray(simVaos[i]);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBufs[i]);
      gl.enableVertexAttribArray(sPosLoc);
      gl.vertexAttribPointer(sPosLoc, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, velBufs[i]);
      gl.enableVertexAttribArray(sVelLoc);
      gl.vertexAttribPointer(sVelLoc, 2, gl.FLOAT, false, 0, 0);
    }
    function bindCommon(styleBuf) {
      gl.bindBuffer(gl.ARRAY_BUFFER, tplBuf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, styleBuf);
      for (let loc = 1; loc <= 4; loc++) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 64, (loc - 1) * 16);
        gl.vertexAttribDivisor(loc, 1);
      }
    }
    const renderVaos = [gl.createVertexArray(), gl.createVertexArray()];
    for (let i = 0; i < 2; i++) {
      gl.bindVertexArray(renderVaos[i]);
      bindCommon(flowStyle.buf);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBufs[i]);
      gl.enableVertexAttribArray(5);
      gl.vertexAttribPointer(5, 2, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(5, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, velBufs[i]);
      gl.enableVertexAttribArray(6);
      gl.vertexAttribPointer(6, 2, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(6, 1);
    }
    let coreVao = null;
    function rebuildCoreVao() {
      if (!drain) {
        return;
      }
      if (!coreVao) {
        coreVao = gl.createVertexArray();
      }
      gl.bindVertexArray(coreVao);
      bindCommon(drain.buf);
      gl.bindVertexArray(null);
    }

    // uniforms
    const sU = {};
    for (const n of [
      'u_res',
      'u_dt',
      'u_center',
      'u_Scss',
      'u_VE',
      'u_C2',
      'u_RE',
      'u_time',
    ]) {
      sU[n] = gl.getUniformLocation(simProg, n);
    }
    const rU = {};
    for (const n of [
      'uRes',
      'uS',
      'uDpr',
      'uSpin',
      'uCore',
      'uRCORE',
      'uRE',
      'uInk',
    ]) {
      rU[n] = gl.getUniformLocation(prog, n);
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    let spin = 0;
    function step(dt) {
      gl.useProgram(simProg);
      gl.uniform2f(sU.u_res, cw, ch);
      gl.uniform1f(sU.u_dt, dt);
      gl.uniform2f(sU.u_center, cw / 2, ch / 2);
      gl.uniform1f(sU.u_Scss, Scss);
      gl.uniform1f(sU.u_VE, V_E);
      gl.uniform1f(sU.u_C2, C2);
      gl.uniform1f(sU.u_RE, R_E);
      gl.uniform1f(sU.u_time, performance.now() * 0.001);
      const out = 1 - active;
      gl.bindVertexArray(simVaos[active]);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, posBufs[out]);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, velBufs[out]);
      gl.enable(gl.RASTERIZER_DISCARD);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, N_F);
      gl.endTransformFeedback();
      gl.disable(gl.RASTERIZER_DISCARD);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
      active = out;
    }

    function draw() {
      if (!drain) {
        return;
      }
      gl.useProgram(prog);
      gl.viewport(0, 0, W, H);
      gl.uniform2f(rU.uRes, W, H);
      gl.uniform1f(rU.uS, S);
      gl.uniform1f(rU.uDpr, dpr);
      gl.uniform1f(rU.uSpin, spin);
      gl.uniform1f(rU.uRCORE, R_CORE);
      gl.uniform1f(rU.uRE, R_E);
      gl.uniform3fv(rU.uInk, INK);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(rU.uCore, 0);
      gl.bindVertexArray(renderVaos[active]);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, N_F);
      gl.uniform1f(rU.uCore, 1);
      gl.bindVertexArray(coreVao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, drain.count);
      gl.bindVertexArray(null);
    }

    let seededW = 0;
    function fit() {
      measure();
      const wm = document.querySelector('.wordmark');
      if (!wm) {
        return;
      }
      const fontPx = parseFloat(getComputedStyle(wm).fontSize);
      tune(fontPx * dpr, S);
      // reseed only on real width changes (rotation, window resize) — iOS scroll
      // collapses browser chrome and fires height-only resizes; resetting the
      // crowd for those reads as a glitch. The current re-centers bodies itself.
      if (cw !== seededW) {
        seedParticles();
        seededW = cw;
      }
      rebuildCore();
      rebuildCoreVao();
    }

    const boot = () => {
      fit();
      draw();
      if (!still && !soft) {
        let last = performance.now();
        const loop = (now) => {
          if (!seaVisible) {
            last = now;
            requestAnimationFrame(loop);
            return;
          }
          const dt = Math.min((now - last) / 16.67, 3); // 60fps-frame units
          last = now;
          step(dt);
          spin += (W_CORE * dt) / 60;
          draw();
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      }
      let rT;
      const onRs = () => {
        const vv = window.visualViewport;
        if (vv && vv.scale !== 1) {
          return;
        } // pinch zoom isn't a resize
        const de = document.documentElement;
        if (de.clientWidth === cw && de.clientHeight === ch) {
          return;
        } // nothing actually changed
        clearTimeout(rT);
        rT = setTimeout(() => {
          fit();
          draw();
        }, 150);
      };
      addEventListener('resize', onRs);
      const vvr = window.visualViewport;
      if (vvr) {
        vvr.addEventListener('resize', onRs);
      } // in-app browser chrome shifts
    };
    // wait for the wordmark font so first paint and sizing agree
    if (document.fonts && document.fonts.load) {
      document.fonts.load("700 100px 'Comfortaa'").then(boot, boot);
    } else {
      boot();
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Canvas2D fallback: bake the crowd once, rotate the image — a spinning
  // log-spiral reads as suction. No carving here, so "pyre" paints white.
  // ════════════════════════════════════════════════════════════════════════
  function startCanvas2D(ctx, softStatic) {
    document.documentElement.classList.add('no-gl');
    // full-spiral rail population — used by the Canvas2D fallback only
    const bodies = [];
    const laneRand = mulberry32(420);
    const buildLane = (lane) => {
      const n = Math.round(15.4 * PHI_T);
      const w = Array.from({ length: n }, () => 0.78 + laneRand() * 0.44);
      const total = w.reduce((a, b) => a + b, 0);
      let acc = 0;
      for (let i = 0; i < n; i++) {
        acc += w[i];
        bodies.push(dress({ lane, phi: (acc / total) * PHI_T }, laneRand));
      }
    };
    const pile = [];
    {
      const rand = mulberry32(4200);
      for (let i = 0; i < 60; i++) {
        pile.push(dress({ a: rand() * TAU, r: 0.018 * rand() ** 0.7 }, rand));
      }
    }

    const freshPaths = () => [
      new Path2D(),
      new Path2D(),
      new Path2D(),
      new Path2D(),
      new Path2D(),
    ];
    const pathBody = (paths, b) => {
      const r = b.r0 * (1 + b.drift);
      const ang = b.phi + b.off;
      const ca = Math.cos(ang),
        sa = Math.sin(ang);
      const px = L / 2 + ca * r * S,
        py = L / 2 + sa * r * S;
      const h = Math.max(0.052 * r, H_MIN) * b.size * S;
      const cR = ca * b.cR - sa * b.sR,
        sR = sa * b.cR + ca * b.sR;
      const k =
        h < CUTS[0]
          ? 0
          : h < CUTS[1]
            ? 1
            : h < CUTS[2]
              ? 2
              : h < CUTS[3]
                ? 3
                : 4;
      addBody(paths[k], px, py, cR, sR, h, b, h >= HEAD_PX);
    };
    const pathPile = (paths, b) => {
      const rot = b.a * 7;
      addBody(
        paths[0],
        L / 2 + Math.cos(b.a) * b.r * S,
        L / 2 + Math.sin(b.a) * b.r * S,
        Math.cos(rot),
        Math.sin(rot),
        H_MIN * b.size * S,
        b,
        false,
      );
    };
    const strokePaths = (c, paths) => {
      c.strokeStyle = '#212614';
      c.lineJoin = 'round';
      const widths = [
        S * 8e-4,
        Math.max(S * 8e-4, 2.2 * dpr),
        3.5 * dpr,
        5.3 * dpr,
        7.8 * dpr,
      ];
      for (let k = 0; k < 5; k++) {
        c.lineWidth = widths[k];
        c.lineCap = k < 2 ? 'butt' : 'round';
        c.stroke(paths[k]);
      }
    };
    const newBaked = () => {
      L = Math.ceil(1.44 * S) + 8;
      baked = document.createElement('canvas');
      baked.width = L;
      baked.height = L;
      return baked.getContext('2d');
    };
    function bake() {
      const c = newBaked();
      if (!c) {
        return;
      }
      const paths = freshPaths();
      for (const b of bodies) {
        pathBody(paths, b);
      }
      for (const b of pile) {
        pathPile(paths, b);
      }
      strokePaths(c, paths);
    }
    let bakeRun = 0;
    // soft-gl machines get the same frame built in sub-frame slices so no
    // single task crosses the long-task line (that was 800ms of tbt)
    function bakeChunked(onSlice) {
      const c = newBaked();
      if (!c) {
        return;
      }
      const run = ++bakeRun;
      const BUDGET_MS = 8; // self-tunes to the cpu — throttled lab included
      let i = 0;
      let piled = false;
      const step = () => {
        if (run !== bakeRun) {
          return;
        }
        const t0 = performance.now();
        const paths = freshPaths();
        while (i < bodies.length && performance.now() - t0 < BUDGET_MS) {
          pathBody(paths, bodies[i]);
          i += 1;
        }
        if (i >= bodies.length && !piled) {
          for (const b of pile) {
            pathPile(paths, b);
          }
          piled = true;
        }
        strokePaths(c, paths);
        onSlice();
        if (i < bodies.length) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    }

    function paintGround(c) {
      c.fillStyle = '#e25822';
      c.fillRect(0, 0, W, H);
      let g = c.createRadialGradient(
        W * 0.16,
        H * 0.84,
        0,
        W * 0.16,
        H * 0.84,
        S * 1.05,
      );
      g.addColorStop(0, '#b91c1c');
      g.addColorStop(1, 'rgba(185,28,28,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      g = c.createRadialGradient(
        W * 0.78,
        H * 0.16,
        0,
        W * 0.78,
        H * 0.16,
        S * 0.95,
      );
      g.addColorStop(0, '#f5b942');
      g.addColorStop(1, 'rgba(245,185,66,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }

    function fit() {
      measure();
      CX = W / 2;
      CY = H / 2;
      ground = document.createElement('canvas');
      ground.width = W;
      ground.height = H;
      const gctx = ground.getContext('2d');
      if (gctx) {
        paintGround(gctx);
      }
      if (softStatic) {
        bakeChunked(() => frame(ctx));
      } else {
        bake();
      }
    }

    let theta = 0;
    function frame(c) {
      if (!ground || !baked) {
        return;
      }
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(ground, 0, 0);
      c.translate(CX, CY);
      c.rotate(theta);
      c.drawImage(baked, -L / 2, -L / 2);
      c.setTransform(1, 0, 0, 1, 0, 0);
    }

    const boot = () => {
      fit();
      frame(ctx);
      addEventListener('resize', () => {
        fit();
        frame(ctx);
      });
      if (!still && !softStatic) {
        let last = performance.now();
        const loop = (now) => {
          if (!seaVisible) {
            last = now;
            requestAnimationFrame(loop);
            return;
          }
          const dt = Math.min((now - last) / 1000, 0.05);
          last = now;
          theta += OMEGA * dt;
          frame(ctx);
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      }
    };
    if (softStatic) {
      let lane = 0;
      const buildStep = () => {
        const t0 = performance.now();
        while (lane < LANES && performance.now() - t0 < 8) {
          buildLane(lane);
          lane += 1;
        }
        if (lane < LANES) {
          requestAnimationFrame(buildStep);
        } else {
          boot();
        }
      };
      requestAnimationFrame(buildStep);
    } else {
      for (let lane = 0; lane < LANES; lane += 1) {
        buildLane(lane);
      }
      boot();
    }
  }

  const joinForm = document.getElementById('join-form');
  if (joinForm) {
    joinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = joinForm.querySelector('button');
      const emailInput = /** @type {HTMLInputElement | null} */ (
        joinForm.querySelector('input[name="email"]')
      );
      if (!btn || !emailInput) {
        return;
      }
      btn.disabled = true;
      const res = await subscribeFlow(emailInput.value, LISTMONK, fetch);
      btn.textContent = res.message;
      btn.disabled = false;
    });
  }

  // the chevrons sequence only while parked at the top
  const downEl = document.querySelector('.down');
  const syncDown = () => {
    if (!downEl) {
      return;
    }
    const s = document.scrollingElement || document.documentElement;
    downEl.classList.toggle('away', s.scrollTop > 0);
  };
  addEventListener('scroll', syncDown, { passive: true });
  syncDown();

  // ── desktop wheel flight: one deliberate flick = one smooth, unbroken
  // ride to the other screen. proximity snap alone waits for the trackpad
  // momentum to die (~80% of the way) before animating the rest — that
  // read as a stall. reduced-motion users keep native scrolling.
  const fineQ = matchMedia('(min-width: 769px) and (pointer: fine)');
  if (!still) {
    let flying = false;
    let cooldownUntil = 0;
    const releaseFlight = () => {
      flying = false;
      cooldownUntil = performance.now() + 250; // swallow leftover inertia
    };
    const fly = (target) => {
      // own the whole animation: ua smooth-scroll easings drag their tails
      // and proximity snap can grab the wheel mid-ride — both read as a
      // stall near the end. a fixed tween with snap parked = one motion.
      flying = true;
      const s = document.scrollingElement || document.documentElement;
      const from = s.scrollTop;
      const to = target.offsetTop;
      const dur = 620;
      // ease-out only: launch at speed (matches the flick's momentum —
      // an ease-in reads as a dead stop), land gently
      const ease = (t) => 1 - (1 - t) ** 3;
      // parking the snap forces a root style recalc — pay it on a
      // stationary frame, then start the tween clock one frame later
      document.documentElement.style.scrollSnapType = 'none';
      let t0 = 0;
      const step = (now) => {
        if (!t0) {
          t0 = now;
          requestAnimationFrame(step);
          return;
        }
        const p = Math.min((now - t0) / dur, 1);
        s.scrollTop = from + (to - from) * ease(p);
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          releaseFlight();
          requestAnimationFrame(() => {
            document.documentElement.style.scrollSnapType = '';
          });
        }
      };
      requestAnimationFrame(step);
    };
    addEventListener(
      'wheel',
      (e) => {
        if (!fineQ.matches) {
          return;
        }
        if (flying || performance.now() < cooldownUntil) {
          e.preventDefault();
          return;
        }
        if (Math.abs(e.deltaY) < 2) {
          return; // trackpad noise
        }
        const s = document.scrollingElement || document.documentElement;
        const vh = document.documentElement.clientHeight;
        const splashTarget = document.getElementById('splash');
        const joinTarget = document.getElementById('join');
        if (!splashTarget || !joinTarget) {
          return;
        }
        if (e.deltaY > 0 && s.scrollTop < vh * 0.5) {
          e.preventDefault();
          fly(joinTarget);
        } else if (e.deltaY < 0 && s.scrollTop > vh * 0.5) {
          e.preventDefault();
          fly(splashTarget);
        }
      },
      { passive: false },
    );
  }

  // ── screen two: the pyre. A GLSL flame burns at a third of the width;
  // white divers and glowing flecks rise out of it (desktop) or drift up
  // from the deep (mobile).
  const FLAME_X = 1 / 3;
  const FLAME_BASE = 0.82; // normalized y (from top) of the flame's mouth
  const deskQ = matchMedia('(min-width: 769px)');

  // screen-two modules land in their own tasks — keeps hydration's
  // main-thread work under the long-task threshold (lighthouse tbt)
  setTimeout(function fire() {
    const c = /** @type {HTMLCanvasElement} */ (
      document.getElementById('fire')
    );
    const joinEl = document.getElementById('join');
    const g = headlessAudit
      ? null
      : c.getContext('webgl2', {
          alpha: true,
          antialias: false,
          premultipliedAlpha: true,
        });
    if (!joinEl || !g) {
      if (c) {
        c.style.display = 'none';
      }
      return;
    }
    const dbg2 = g.getExtension('WEBGL_debug_renderer_info');
    const renderer2 = dbg2
      ? String(g.getParameter(dbg2.UNMASKED_RENDERER_WEBGL))
      : '';
    const soft2 = /swiftshader|llvmpipe|software|basic render/i.test(renderer2);
    const VS2 = `#version 300 es
    void main() {
      vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;
    const FS2 = `#version 300 es
    precision highp float;
    uniform vec2 uRes;
    uniform float uT;
    out vec4 frag;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
                 mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float amp = 0.5;
      for (int k = 0; k < 5; k++) { v += amp * noise(p); p *= 2.03; amp *= 0.5; }
      return v;
    }
    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      float aspect = uRes.x / uRes.y;
      float px = (uv.x - ${FLAME_X}) * aspect;
      float yb = ${1 - FLAME_BASE};
      float t = (uv.y - yb) / 0.58;
      float sway = (fbm(vec2(px * 3.0, uv.y * 3.0 - uT * 0.8)) - 0.5) * 0.24 * max(t, 0.0);
      float xx = abs(px - sway);
      float w = mix(0.155, 0.02, clamp(t, 0.0, 1.0));
      float body = smoothstep(w, w * 0.15, xx);
      body *= smoothstep(-0.12, 0.06, t) * (1.0 - smoothstep(0.68, 1.05, t));
      float lick = fbm(vec2(px * 6.0, uv.y * 5.0 - uT * 2.4));
      float i = body * (0.5 + 0.9 * lick);
      float glow = smoothstep(0.42, 0.0, length(vec2(px, (uv.y - yb) * 1.5))) * 0.5;
      vec3 col = mix(vec3(0.45, 0.05, 0.03), vec3(0.73, 0.11, 0.11), smoothstep(0.04, 0.22, i));
      col = mix(col, vec3(0.89, 0.35, 0.13), smoothstep(0.22, 0.48, i));
      col = mix(col, vec3(0.96, 0.73, 0.26), smoothstep(0.48, 0.74, i));
      col = mix(col, vec3(1.0, 0.96, 0.82), smoothstep(0.82, 1.0, i));
      float a = clamp(smoothstep(0.05, 0.3, i) + glow * 0.45, 0.0, 1.0);
      frag = vec4(col * a, a);
    }`;
    const mk = (ty, src) => {
      const s = g.createShader(ty);
      if (!s) {
        return null;
      }
      g.shaderSource(s, src);
      g.compileShader(s);
      return g.getShaderParameter(s, g.COMPILE_STATUS) ? s : null;
    };
    const v2 = mk(g.VERTEX_SHADER, VS2);
    const f2 = mk(g.FRAGMENT_SHADER, FS2);
    if (!v2 || !f2) {
      c.style.display = 'none';
      return;
    }
    const p2 = g.createProgram();
    g.attachShader(p2, v2);
    g.attachShader(p2, f2);
    g.linkProgram(p2);
    if (!g.getProgramParameter(p2, g.LINK_STATUS)) {
      c.style.display = 'none';
      return;
    }
    g.useProgram(p2);
    const uRes2 = g.getUniformLocation(p2, 'uRes');
    const uT2 = g.getUniformLocation(p2, 'uT');
    g.enable(g.BLEND);
    g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
    g.clearColor(0, 0, 0, 0);
    let fw = 0;
    let fh = 0;
    const sizeFire = () => {
      const de = document.documentElement;
      fw = Math.max(1, Math.round(de.clientWidth * dpr * 0.6)); // half-ish res — flames are soft
      fh = Math.max(1, Math.round(de.clientHeight * dpr * 0.6));
      c.width = fw;
      c.height = fh;
      c.style.width = `${de.clientWidth}px`;
      c.style.height = `${de.clientHeight}px`;
    };
    sizeFire();
    addEventListener('resize', sizeFire);
    let fireVisible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        (es) => {
          fireVisible = es.some((en) => en.isIntersecting);
        },
        { threshold: 0.02 },
      ).observe(joinEl);
    } else {
      fireVisible = true;
    }
    const drawFire = (t) => {
      g.viewport(0, 0, fw, fh);
      g.uniform2f(uRes2, fw, fh);
      g.uniform1f(uT2, t);
      g.clear(g.COLOR_BUFFER_BIT);
      g.drawArrays(g.TRIANGLES, 0, 3);
    };
    if (still || soft2) {
      drawFire(7);
      return;
    }
    if (deskQ.matches) {
      drawFire(0); // warm the pipeline off-screen — first visible frame stays cheap
    }
    const loop = (now) => {
      if (fireVisible && deskQ.matches) {
        drawFire(now * 0.001);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, 0);

  // ── the risers: white divers (and flecks, on desktop) floating up
  setTimeout(function rain() {
    const c = /** @type {HTMLCanvasElement} */ (
      document.getElementById('rain')
    );
    const joinEl = document.getElementById('join');
    if (!joinEl) {
      return;
    }
    const ctx2 = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    const rand = mulberry32(77);
    // each body's ink: randomly interpolated between the two approved
    // riser colors — warm white (#f0e8dd) and salmon (#d6855e)
    const emberMix = (t) =>
      `rgb(${Math.round(240 - 26 * t)}, ${Math.round(232 - 99 * t)}, ${Math.round(221 - 127 * t)})`;
    const seedDrop = (b, initial) => {
      b.col = emberMix(rand());
      if (initial && deskQ.matches) {
        // seed along the plume: as if each body already rose from the flame —
        // the higher it is, the further it has drifted
        const rise = rand();
        b.y = FLAME_BASE - rise * (FLAME_BASE + 0.1);
        b.x = FLAME_X + (rand() - 0.5) * (0.05 + rise * 0.22);
        b.vx = (rand() - 0.5) * 0.02;
      } else if (initial) {
        b.x = rand();
        b.y = rand();
        b.vx = (rand() - 0.5) * 0.006;
      } else if (deskQ.matches) {
        b.x = FLAME_X + (rand() - 0.5) * 0.08;
        b.y = FLAME_BASE - rand() * 0.04;
        b.vx = (rand() - 0.5) * 0.02;
      } else {
        b.x = rand();
        b.y = 1.05 + rand() * 0.05;
        b.vx = (rand() - 0.5) * 0.006;
      }
    };
    const drops = [];
    for (let i = 0; i < 70; i++) {
      const b = dress({}, rand);
      seedDrop(b, true);
      b.v = 0.02 + rand() * 0.035;
      b.swayPh = rand() * TAU;
      b.swayA = 6 + rand() * 12;
      b.rot = (rand() - 0.5) * 0.5; // head-first UP, loosely
      drops.push(b);
    }
    const mkRock = (cx, cy, rx, ry) => {
      const pts = [];
      const n = 9;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * TAU;
        const j = 0.82 + rand() * 0.36; // hand wobble
        pts.push([Math.cos(ang) * rx * j, Math.sin(ang) * ry * j]);
      }
      return { cx, cy, pts };
    };
    // three rocks at the flame's mouth, mildly overlapping; center drawn last (front)
    const rocks = [
      mkRock(FLAME_X - 0.045, FLAME_BASE + 0.02, 0.052, 0.028),
      mkRock(FLAME_X + 0.062, FLAME_BASE + 0.018, 0.042, 0.024),
      mkRock(FLAME_X + 0.008, FLAME_BASE + 0.028, 0.062, 0.033),
    ];

    const flecks = [];
    for (let i = 0; i < 90; i++) {
      flecks.push({
        x: 0,
        y: 0,
        v: 0.06 + rand() * 0.16,
        drift: (rand() - 0.5) * 0.05,
        r: 0.8 + rand() * 1.8,
        ph: rand() * TAU,
        warm: rand(),
      });
    }
    const seedFleck = (f, initial) => {
      f.x = FLAME_X + (rand() - 0.5) * 0.05;
      f.y = initial ? rand() * FLAME_BASE : FLAME_BASE - rand() * 0.1;
    };
    flecks.forEach((f) => seedFleck(f, true));
    let rw = 0;
    let rh = 0;
    const sizeRain = () => {
      const de = document.documentElement;
      rw = Math.round(de.clientWidth * dpr);
      rh = Math.round(de.clientHeight * dpr);
      c.width = rw;
      c.height = rh;
      c.style.width = `${de.clientWidth}px`;
      c.style.height = `${de.clientHeight}px`;
    };
    sizeRain();
    addEventListener('resize', sizeRain);
    let rockGlow = 1;
    let rockBlur = 0;
    const drawRock = (r) => {
      const n = r.pts.length;
      ctx2.beginPath();
      for (let i = 0; i <= n; i++) {
        const p = r.pts[i % n];
        const q = r.pts[(i + 1) % n];
        const x1 = r.cx * rw + p[0] * rh;
        const y1 = r.cy * rh + p[1] * rh;
        const x2 = r.cx * rw + q[0] * rh;
        const y2 = r.cy * rh + q[1] * rh;
        if (i === 0) {
          ctx2.moveTo((x1 + x2) / 2, (y1 + y2) / 2);
        } else {
          ctx2.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2);
        }
      }
      ctx2.closePath();
      ctx2.globalAlpha = 1;
      ctx2.shadowBlur = 0;
      ctx2.fill();
      ctx2.globalAlpha = rockGlow;
      ctx2.shadowColor = 'rgba(226, 88, 34, 0.85)';
      ctx2.shadowBlur = rockBlur;
      ctx2.stroke();
      ctx2.shadowBlur = 0;
      ctx2.globalAlpha = 1;
    };
    let joinVisible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        (es) => {
          joinVisible = es.some((en) => en.isIntersecting);
        },
        { threshold: 0.02 },
      ).observe(joinEl);
    } else {
      joinVisible = true;
    }
    const drawRain = (t) => {
      ctx2.clearRect(0, 0, rw, rh);
      ctx2.lineCap = 'round';
      ctx2.lineJoin = 'round';
      const h0 = 0.02 * S;
      ctx2.lineWidth = Math.max(S * 0.0008, h0 * 0.09);
      const base = deskQ.matches ? FLAME_BASE : 1.02;
      for (const b of drops) {
        // they take form as they rise: faint at the flame's mouth, whole higher up
        const a = Math.min(1, Math.max(0, (base - b.y) / 0.28));
        if (a <= 0.01) {
          continue;
        }
        ctx2.globalAlpha = 0.92 * a;
        ctx2.strokeStyle = b.col;
        const path = new Path2D();
        const px = b.x * rw + Math.sin(t * 0.6 + b.swayPh) * b.swayA * dpr;
        addBody(
          path,
          px,
          b.y * rh,
          Math.cos(b.rot),
          Math.sin(b.rot),
          h0 * b.size,
          b,
          h0 * b.size >= HEAD_PX,
        );
        ctx2.stroke(path);
      }
      ctx2.globalAlpha = 1;
      if (deskQ.matches) {
        for (const f of flecks) {
          const rise = Math.max(0, (FLAME_BASE - f.y) / FLAME_BASE);
          ctx2.globalAlpha = Math.max(0, 0.9 - rise * 1.1);
          ctx2.fillStyle = f.warm > 0.5 ? '#f5b942' : '#e25822';
          ctx2.beginPath();
          ctx2.arc(
            f.x * rw + Math.sin(t * 1.3 + f.ph) * 5 * dpr,
            f.y * rh,
            f.r * dpr,
            0,
            TAU,
          );
          ctx2.fill();
        }
        ctx2.globalAlpha = 1;
        ctx2.fillStyle = '#10120a';
        const rockGrad = ctx2.createLinearGradient(
          (FLAME_X - 0.12) * rw,
          0,
          (FLAME_X + 0.12) * rw,
          0,
        );
        rockGrad.addColorStop(0, '#f5b942');
        rockGrad.addColorStop(0.5, '#e25822');
        rockGrad.addColorStop(1, '#b91c1c');
        ctx2.strokeStyle = rockGrad;
        ctx2.lineWidth = Math.max(S * 0.0008, h0 * 0.1);
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.85); // ~7s breath
        rockGlow = 0.45 + 0.55 * pulse;
        rockBlur = (5 + 20 * pulse) * dpr;
        for (const r of rocks) {
          drawRock(r);
        }
      }
    };
    if (still) {
      drawRain(8);
      return;
    }
    drawRain(0); // warm draw — allocations + first strokes happen off-screen
    let last = performance.now();
    const loop = (now) => {
      if (!joinVisible) {
        last = now;
        requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      for (const b of drops) {
        b.y -= b.v * dt;
        b.x += b.vx * dt;
        if (b.y < -0.08) {
          seedDrop(b, false);
        }
      }
      for (const f of flecks) {
        f.y -= f.v * dt;
        f.x += f.drift * dt;
        if (f.y < 0.05 || f.x < 0 || f.x > 1) {
          seedFleck(f, false);
        }
      }
      drawRain(now / 1000);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, 0);

  const gl = headlessAudit
    ? null
    : canvas.getContext('webgl2', {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
      });
  if (gl) {
    try {
      startGL(gl);
    } catch {
      startCanvas2D(canvas.getContext('2d'), true);
    }
  } else {
    startCanvas2D(canvas.getContext('2d'), headlessAudit);
  }
}
