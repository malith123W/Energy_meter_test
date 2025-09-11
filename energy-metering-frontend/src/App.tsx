import { Navigate, Outlet, RouteObject, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { Layout } from './components/Layout'
import TechnicalOfficerDashboard from './pages/TechnicalOfficerDashboard'
import ChiefEngineerDashboard from './pages/ChiefEngineerDashboard'
import BranchViewerDashboard from './pages/BranchViewerDashboard'
import ReportView from './pages/ReportView'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

function RoleGuard({ roles }: { roles: Array<'TECHNICAL_OFFICER' | 'CHIEF_ENGINEER' | 'BRANCH_VIEWER'> }) {
  const userRole = useAuthStore((s) => s.role)
  if (!userRole) return <Navigate to="/login" replace />
  if (!roles.includes(userRole)) return <Navigate to="/" replace />
  return <Outlet />
}

function App() {
  const userRole = useAuthStore((s) => s.role)

  const routes: RouteObject[] = [
    {
      path: '/',
      element: <Layout />,
      children: [
        { index: true, element: <Navigate to={userRole ? `/dashboard` : '/login'} replace /> },
        { path: 'login', element: <Login /> },
        {
          path: 'dashboard',
          children: [
            {
              element: <RoleGuard roles={['TECHNICAL_OFFICER']} />,
              children: [{ index: true, element: <TechnicalOfficerDashboard /> }],
            },
            {
              element: <RoleGuard roles={['CHIEF_ENGINEER']} />,
              children: [{ index: true, element: <ChiefEngineerDashboard /> }],
            },
            {
              element: <RoleGuard roles={['BRANCH_VIEWER']} />,
              children: [{ index: true, element: <BranchViewerDashboard /> }],
            },
          ],
        },
        {
          element: <RoleGuard roles={['TECHNICAL_OFFICER', 'CHIEF_ENGINEER', 'BRANCH_VIEWER']} />,
          children: [
            { path: 'reports/:id', element: <ReportView /> },
          ],
        },
        { path: '*', element: <NotFound /> },
      ],
    },
  ]

  const router = createBrowserRouter(routes)
  return <RouterProvider router={router} />
}

export default App
