import '@fontsource/pixelify-sans/400.css'
import '@fontsource/pixelify-sans/700.css'
import '@fontsource/vt323/400.css'
import '@fontsource/dotgothic16/400.css'
import vt323Url from '@fontsource/vt323/files/vt323-latin-400-normal.woff2?url'

// Body text is DotGothic16 (see psx-ui.css). Pixelify Sans, used for big display
// text, has digits that blur together (2/3/8, 5/S). "Dream Digits" is VT323
// restricted to 0-9; listed first in --display, it draws the numbers while
// Pixelify draws the letters.
const alreadyAdded = () => [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Dream Digits')
if (typeof FontFace !== 'undefined' && !alreadyAdded()) {
  const face = new FontFace('Dream Digits', `url(${vt323Url})`, {
    unicodeRange: 'U+0030-0039',
    sizeAdjust: '125%', // VT323 runs small next to Pixelify
  })
  document.fonts.add(face)
  face.load()
}
