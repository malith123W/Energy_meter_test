import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export function Layout() {
  const role = useAuthStore((s) => s.role)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold">Energy Metering Reports</Link>
          <nav className="flex items-center gap-4">
            {role ? (
              <>
                <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'text-blue-600' : 'text-gray-600'}>Dashboard</NavLink>
                <button className="px-3 py-1 rounded bg-gray-100" onClick={() => { logout(); navigate('/login') }}>Logout</button>
              </>
            ) : (
              <NavLink to="/login" className={({ isActive }) => isActive ? 'text-blue-600' : 'text-gray-600'}>Login</NavLink>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

