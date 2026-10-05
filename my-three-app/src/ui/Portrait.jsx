import { PORTRAITS } from './portraits'

// A pixel portrait (ui/portraits.js) as crisp SVG squares
export default function Portrait({ who, label = who }) {
  const p = PORTRAITS[who] ?? PORTRAITS.GREG
  const cells = []
  p.rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (p.palette[c]) cells.push(<rect key={`${x},${y}`} x={x} y={y} width="1" height="1" fill={p.palette[c]} />)
    })
  )
  return (
    <svg className="portrait" viewBox={`0 0 ${p.rows[0].length} ${p.rows.length}`} shapeRendering="crispEdges" role="img" aria-label={label}>
      {cells}
    </svg>
  )
}
