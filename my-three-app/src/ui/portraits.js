// 16×16 pixel portraits for the people who talk to you. One character per pixel
// ('.' is transparent); each portrait has its own little palette.
export const PORTRAITS = {
  // You: the monkey on call
  YOU: {
    rows: [
      '................',
      '.....ffffff.....',
      '...ffffffffff...',
      '..ffffffffffff..',
      '.pffssssssssffp.',
      'ppfssskssskssfpp',
      '.pfssskssskssfp.',
      '..fssssssssssf..',
      '..fsmmmmmmmmsf..',
      '..fmmmnmmnmmmf..',
      '..fmmmmmmmmmmf..',
      '...fmmkkkkmmf...',
      '....fmmmmmmf....',
      '.....ffffff.....',
      '....bbbwwbbb....',
      '...bbbbwwbbbb...',
    ],
    palette: { f: '#6b4220', p: '#d99a86', s: '#e8b98a', k: '#1a120c', m: '#f2d2a8', n: '#6b4220', b: '#2f6fd6', w: '#f4f1ea' },
  },
  GREG: {
    rows: [
      '................',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hssssssssh...',
      '..esssssssssse..',
      '..egwkgsgwkgse..',
      '..esssssssssse..',
      '..esssssdsssse..',
      '..eesssssssse...',
      '...essmmmmss....',
      '...e.ssssss.....',
      '......dssd......',
      '...pppwwwwppp...',
      '..ppppPwwPpppp..',
      '.pppppppppppppp.',
      '.pppppppppppppp.',
    ],
    palette: { h: '#5a3a22', s: '#e2a97c', d: '#b9805a', g: '#151515', w: '#ffffff', k: '#151515', m: '#8a3a2a', p: '#2f6fd6', P: '#1f4a96', e: '#3a3a3a' },
  },
}
