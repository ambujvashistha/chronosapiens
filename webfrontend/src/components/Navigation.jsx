import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const Navigation = () => {
  const location = useLocation()

  const navigationItems = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/profile', label: 'Profile' },
    { path: '/connections', label: 'Connections' },
    { path: '/applications', label: 'Applications' },
    { path: '/admin', label: 'Admin' },
    { path: '/settings', label: 'Settings' },
  ]

  const [theme, setTheme] = useState(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null
    return saved || 'light'
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
    window.localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <header className="nav">
      <div className="nav-left">JobSync</div>
      <nav className="nav-links">
        {navigationItems.map((item) => (
          <Link key={item.path} to={item.path} className={location.pathname === item.path ? 'active' : ''}>
            {item.label}
          </Link>
        ))}
        <Link to="/login">Login</Link>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? 'Dark' : 'Light'} mode
        </button>
      </nav>
    </header>
  )
}

export default Navigation
