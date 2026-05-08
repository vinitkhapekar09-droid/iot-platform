import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'
import DevicePage from './pages/DevicePage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{padding: '2rem', color: '#94a3b8'}}>Loading...</div>
  if (!user) return <Navigate to="/" />
  return children
}

function PublicRoute({ children }) {
  const auth = useAuth()
  if (!auth) return <div style={{padding: '2rem', color: '#94a3b8'}}>Loading...</div>
  const { user, loading } = auth
  if (loading) return <div style={{padding: '2rem', color: '#94a3b8'}}>Loading...</div>
  if (user) return <Navigate to="/dashboard" />
  return children
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/projects/:id/devices/:deviceId" element={
            <ProtectedRoute><DevicePage /></ProtectedRoute>
          } />
          <Route path="/projects/:id/devices/:deviceId/analytics/:metric" element={
            <ProtectedRoute><AnalyticsPage /></ProtectedRoute>
          } />
          <Route path="/login" element={
            <PublicRoute><LoginPage /></PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute><RegisterPage /></PublicRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/projects/:id" element={
            <ProtectedRoute><ProjectPage /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><SettingsPage /></ProtectedRoute>
          } />
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App