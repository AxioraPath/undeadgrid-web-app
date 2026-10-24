import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/authContext'

/** Route guard: logged-out users are sent to /login and returned to `from` after signing in. */
export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname, fromState: location.state }} />
  return <Outlet />
}
