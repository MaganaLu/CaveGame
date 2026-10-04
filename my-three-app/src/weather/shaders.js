// GLSL for the rain. Everything moves on the GPU: the CPU only updates a handful
// of shared uniforms (weatherState.js) per frame.
//
// uPixelAngle is the size of one PSX pixel (240p) at 1 m, so effects can stay at
// least a pixel or two wide at any distance instead of shimmering away.

const HASH = /* glsl */ `
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`

// ------------------------------------------------------------------ falling streaks
// One quad per drop. Each drop falls from TOP to BOTTOM and wraps, drifts with the
// wind (wrapped inside its layer's box around the apartment) and is billboarded
// around its own fall direction. Lit by streetlights, the apartment's windows and
// lightning; hidden inside the apartment.
export const streakVertex = /* glsl */ `
  uniform float uTime;
  uniform float uFlash;
  uniform float uPixelAngle;
  uniform vec2 uWind;
  uniform vec2 uWindOffset;
  uniform vec3 uLamps[MAX_LAMPS];
  uniform int uLampCount;
  uniform vec3 uSodium;

  attribute vec4 aDrop;   // start x, start z, phase 0..1, fall speed (m/s)
  attribute vec3 aCorner; // side -1..1, along 0 (head) .. 1 (tail), layer half-size

  varying vec3 vColor;
  varying float vAlpha;
  varying float vAlong;

  bool insideApartment(vec3 p) {
    return abs(p.x) < APT_X && abs(p.z) < APT_Z && p.y > -0.6 && p.y < 3.4;
  }

  void main() {
    float halfSize = aCorner.z;
    vec2 xz = mod(aDrop.xy + uWindOffset + halfSize, 2.0 * halfSize) - halfSize;
    float span = TOP - BOTTOM;
    float y = TOP - mod(uTime * aDrop.w + aDrop.z * span, span);
    vec3 head = vec3(xz.x, y, xz.y);

    vec3 dir = normalize(vec3(uWind.x, -aDrop.w, uWind.y));
    vec3 toCam = cameraPosition - head;
    float dist = length(toCam);
    float px = dist * uPixelAngle;
    // Motion-blur length and width, never thinner than ~1.5 PSX pixels
    float len = max(0.45, 7.0 * px);
    float width = max(0.012, 1.5 * px);
    vec3 tail = head - dir * len;

    if (insideApartment(head) || insideApartment(tail)) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // off screen
      return;
    }

    vec3 side = normalize(cross(dir, toCam));
    vec3 pos = head - dir * len * aCorner.y + side * width * aCorner.x;

    // Light: a cold base, sodium glow near each streetlight, warm spill from the
    // apartment's own windows, and a white-blue lightning flash
    vec3 c = vec3(0.11, 0.14, 0.2);
    for (int i = 0; i < MAX_LAMPS; i++) {
      if (i >= uLampCount) break;
      vec3 d = uLamps[i] - head;
      float k = max(0.0, 1.0 - dot(d, d) / 90.0);
      c += uSodium * 2.4 * k * k;
    }
    float fromWindows = length(max(abs(head.xz) - vec2(5.0, 7.5), 0.0));
    float level = step(0.2, head.y) * step(head.y, 2.6);
    c += vec3(0.75, 0.68, 0.52) * 0.7 * level * max(0.0, 1.0 - fromWindows / 2.2);
    c += vec3(0.85, 0.9, 1.0) * uFlash * 1.8;

    vColor = c;
    vAlpha = 0.5 * (1.0 - smoothstep(35.0, 95.0, dist));
    vAlong = aCorner.y;
    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  }
`

export const streakFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vAlong;
  void main() {
    // Bright head, fading tail
    float a = vAlpha * (1.0 - vAlong) * smoothstep(0.0, 0.12, vAlong + 0.04);
    gl_FragColor = vec4(vColor, a);
  }
`

// ------------------------------------------------------------------ rain sheets
// Big open cylinders around the block with scrolling streak columns: the far,
// dense curtain of rain between the buildings. Lower down they pick up the
// orange haze of the streetlights.
export const sheetVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

export const sheetFragment = /* glsl */ `
  ${HASH}
  uniform float uTime;
  uniform float uFlash;
  uniform vec2 uWind;
  uniform float uColumns;
  uniform float uSpeed;
  uniform float uAlpha;
  uniform vec3 uSodium;
  varying vec2 vUv;
  varying vec3 vWorld;

  void main() {
    // Columns slant with the wind
    float slant = uWind.x / uSpeed;
    float x = vUv.x * uColumns + vWorld.y * slant * 1.6;
    float col = floor(x);
    float h = hash(col);
    float h2 = hash(col + 17.0);
    float period = 3.5 + h2 * 3.0;
    float phase = (vWorld.y + uTime * uSpeed * (0.85 + 0.3 * h)) / period + h * 9.0;
    float streak = step(fract(phase), 0.32) * step(0.45, h2);
    // Keep each column thin inside its cell
    streak *= step(abs(fract(x) - 0.5), 0.3);

    float fade = smoothstep(-16.0, -10.0, vWorld.y) * (1.0 - smoothstep(18.0, 40.0, vWorld.y));
    vec3 c = vec3(0.3, 0.36, 0.48);
    c = mix(c, uSodium, 0.55 * (1.0 - smoothstep(-14.0, -4.0, vWorld.y)));
    c += vec3(0.85, 0.9, 1.0) * uFlash * 1.5;
    gl_FragColor = vec4(c, streak * fade * uAlpha * (1.0 + uFlash));
  }
`

// ------------------------------------------------------------------ splashes
// Points that bounce briefly and then move somewhere else. Two flavors:
//  - street: within a streetlight's pool, so they glow orange
//  - sill: on the outside ledges of the apartment windows, close up
const SPLASH_COMMON = /* glsl */ `
  ${HASH}
  uniform float uTime;
  uniform float uFlash;
  uniform float uPixelAngle;
  varying vec3 vColor;
  varying float vAlpha;

  void finish(vec3 pos, float worldSize, float alpha, vec3 color) {
    vec4 view = viewMatrix * vec4(pos, 1.0);
    float dist = -view.z;
    gl_PointSize = max(1.0, worldSize / (dist * uPixelAngle));
    vColor = color + vec3(0.85, 0.9, 1.0) * uFlash;
    vAlpha = alpha;
    gl_Position = projectionMatrix * view;
  }
`

export const streetSplashVertex = /* glsl */ `
  ${SPLASH_COMMON}
  uniform vec3 uSodium;
  attribute vec3 aLamp;  // ground point under the lamp head
  attribute vec2 aSeed;  // seed, rate (splashes per second)

  void main() {
    float t = uTime * aSeed.y + aSeed.x * 11.0;
    float cycle = floor(t);
    float s = fract(t);
    // A new random spot in the lamp's pool every cycle
    float r = 6.5 * sqrt(hash(cycle * 1.31 + aSeed.x * 7.0));
    float a = 6.2832 * hash(cycle * 2.17 + aSeed.x * 3.0);
    vec3 pos = aLamp + vec3(cos(a) * r, 0.05 + 0.18 * s * (1.0 - s) * 4.0, sin(a) * r);
    float lit = pow(1.0 - r / 7.0, 2.0);
    float alpha = step(s, 0.3) * (1.0 - s / 0.3) * lit;
    finish(pos, 0.1, alpha, uSodium * 1.6 + 0.15);
  }
`

export const sillSplashVertex = /* glsl */ `
  ${SPLASH_COMMON}
  attribute vec4 aSill;  // window from, to, wall plane, ledge top height
  attribute vec4 aInfo;  // runs along x (1) or z (0), outward sign, seed, rate

  void main() {
    float t = uTime * aInfo.w + aInfo.z * 13.0;
    float cycle = floor(t);
    float s = fract(t);
    float life = s / 0.35;
    float alive = step(life, 1.0);

    float u = mix(aSill.x + 0.06, aSill.y - 0.06, hash(cycle * 1.7 + aInfo.z * 5.0));
    u += (hash(cycle * 3.1 + aInfo.z) - 0.5) * 0.16 * life;               // spray sideways
    float outward = aInfo.y * (0.03 + 0.07 * hash(cycle * 2.3 + aInfo.z * 9.0)); // ledge depth
    float y = aSill.w + 0.01 + 0.1 * 4.0 * life * (1.0 - life);           // little hop

    vec3 pos = aInfo.x > 0.5 ? vec3(u, y, aSill.z + outward) : vec3(aSill.z + outward, y, u);
    finish(pos, 0.022, alive * (1.0 - life), vec3(0.78, 0.84, 0.92));
  }
`

export const splashFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    if (vAlpha <= 0.0) discard;
    gl_FragColor = vec4(vColor, vAlpha);
  }
`

// ------------------------------------------------------------------ wet street
// The streetlights reflected in the wet road: a long streak on the ground under
// each lamp, stretched toward the viewer and broken up by rain ripples. Each
// quad's corners are placed in the shader so it always faces the camera.
export const reflectionVertex = /* glsl */ `
  uniform float uStreetY;
  attribute vec3 aHead;   // lamp head (world)
  attribute vec2 aCorner; // across -1..1, along -1..1
  varying vec2 vCorner;
  varying vec3 vWorld;
  varying float vFade;

  void main() {
    vec2 toCam = cameraPosition.xz - aHead.xz;
    float d = max(length(toCam), 0.001);
    vec2 dir = toCam / d;
    vec2 perp = vec2(-dir.y, dir.x);
    // The mirror image of the lamp sits where the line from the eye to the lamp's
    // reflection (below the street) meets the street
    float eye = cameraPosition.y - uStreetY;
    float lamp = aHead.y - uStreetY;
    vec2 center = aHead.xz + dir * d * lamp / (eye + lamp);
    float len = 2.5 + d * 0.22;
    vec2 xz = center + dir * aCorner.y * len + perp * aCorner.x * 0.9;
    vWorld = vec3(xz.x, uStreetY + 0.06, xz.y);
    vCorner = aCorner;
    vFade = 1.0 - smoothstep(60.0, 120.0, d);
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }
`

export const reflectionFragment = /* glsl */ `
  ${HASH}
  uniform float uTime;
  uniform vec3 uSodium;
  varying vec2 vCorner;
  varying vec3 vWorld;
  varying float vFade;

  void main() {
    float across = exp(-vCorner.x * vCorner.x * 5.0);
    float along = exp(-vCorner.y * vCorner.y * 3.0);
    // Ripples: the reflection breaks into flickering dashes
    float ripple = hash2(floor(vWorld.xz * vec2(2.5, 6.0)) + floor(uTime * 9.0));
    float a = across * along * (0.45 + 0.55 * ripple) * vFade * 0.7;
    gl_FragColor = vec4(uSodium * 1.3, a);
  }
`

// ------------------------------------------------------------------ window glass
// Coordinates are meters on the pane (along the wall, height), snapped to ~8 mm
// texels so the droplets stay chunky like everything else.
export const glassVertex = /* glsl */ `
  varying vec2 vP;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vec2 along = normalize(modelMatrix[0].xz);
    vP = vec2(dot(w.xz, along), w.y);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

export const glassFragment = /* glsl */ `
  ${HASH}
  uniform float uTime;
  uniform float uFlash;
  varying vec2 vP;

  void main() {
    vec2 p = floor(vP * 120.0) / 120.0;
    float drops = 0.0;

    // Beads: appear, sit, slowly evaporate
    vec2 cell = floor(p / 0.035);
    vec2 f = fract(p / 0.035) - 0.5;
    float h = hash2(cell);
    vec2 off = vec2(hash2(cell + 3.1), hash2(cell + 7.7)) - 0.5;
    float life = fract(uTime * 0.07 + h * 7.0);
    float radius = 0.08 + 0.1 * hash2(cell + 1.3);
    drops = max(drops, step(0.88, h) * step(length(f - off * 0.5), radius) * (1.0 - life) * 0.35);

    // Sliding drops: one per narrow column, meandering down and leaving a trail
    float colW = 0.08;
    float col = floor(p.x / colW);
    float hc = hash(col * 1.37 + 4.0);
    float speed = 0.08 + hc * 0.22;
    float cycle = 1.8 + hc * 1.4; // longer than a pane, so columns rest between drops
    float headY = 2.5 - mod(uTime * speed + hc * 10.0, cycle);
    float wobble = sin(p.y * 21.0 + hc * 6.0) * 0.01 + sin(p.y * 6.0 + hc * 3.0) * 0.008;
    float cx = (col + 0.5) * colW + (hc - 0.5) * 0.03 + wobble;
    float dx = p.x - cx;
    float dy = p.y - headY;
    float head = step(length(vec2(dx, dy * 0.75)), 0.011);
    float trail = step(abs(dx), 0.0045) * step(0.0, dy) * step(dy, 0.4) * (1.0 - dy / 0.4) * 0.55;
    // A few beads left behind in the trail
    float beadAt = fract(p.y * 9.0 + hc * 5.0);
    float trailBead = step(abs(dx), 0.008) * step(0.0, dy) * step(dy, 0.7) * step(beadAt, 0.12)
                    * step(0.5, hash(floor(p.y * 9.0 + hc * 5.0) + col)) * 0.6;
    drops = max(drops, max(head, max(trail, trailBead)));

    vec3 glass = vec3(0.55, 0.65, 0.8);
    vec3 c = mix(glass, vec3(0.8, 0.88, 0.98), drops) * (1.0 + uFlash * 1.5);
    gl_FragColor = vec4(c, 0.1 + drops * 0.4 + uFlash * 0.1);
  }
`
