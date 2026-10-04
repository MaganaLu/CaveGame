// SLA bar that drains over `duration` ms as a single compositor animation
// (no React re-renders). Re-key it to restart.
export default function TimerBar({ duration }) {
  return (
    <div className="tf-timer">
      <div style={{ animationDuration: `${duration}ms` }} />
    </div>
  )
}
