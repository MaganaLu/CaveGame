// Low-poly browser window the parody apps run inside (tab + address bar)
export default function AppWindow({ icon, tab, url, className = '', children }) {
  return (
    <div className={`app-window ${className}`}>
      <div className="app-chrome">
        <div className="app-tab">
          <span className="app-favicon">{icon}</span>
          {tab}
        </div>
        <div className="app-url">🔒 {url}</div>
      </div>
      <div className="app-content">{children}</div>
    </div>
  )
}
