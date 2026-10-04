import { initials, avatarColor } from './people'

export default function Avatar({ name, size = 12 }) {
  return (
    <span className="avatar" style={{ background: avatarColor(name), width: size, height: size, fontSize: size * 0.55 }}>
      {initials(name)}
    </span>
  )
}
