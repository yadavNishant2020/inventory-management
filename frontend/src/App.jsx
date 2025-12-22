import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, createContext } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Toast from './components/Toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AddItem from './pages/AddItem'
import TruckIn from './pages/TruckIn'
import TruckOut from './pages/TruckOut'
import Entries from './pages/Entries'
import Settings from './pages/Settings'

// Toast context for global notifications
export const ToastContext = createContext()

// Protected Route component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Main App Layout (for authenticated pages)
function AppLayout({ children }) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 pb-20 lg:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-4 lg:py-8 max-w-7xl">
        {children}
      </main>
    </div>
  )
}

function AppRoutes() {
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const hideToast = () => setToast(null)

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Routes>
        {/* Public Route - Login */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/add-item" element={
          <ProtectedRoute>
            <AppLayout><AddItem /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/truck-in" element={
          <ProtectedRoute>
            <AppLayout><TruckIn /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/truck-out" element={
          <ProtectedRoute>
            <AppLayout><TruckOut /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/entries" element={
          <ProtectedRoute>
            <AppLayout><Entries /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <AppLayout><Settings /></AppLayout>
          </ProtectedRoute>
        } />
        
        {/* Legacy routes redirect */}
        <Route path="/products-in" element={<Navigate to="/truck-in" replace />} />
        <Route path="/products-out" element={<Navigate to="/truck-out" replace />} />
        
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
    </ToastContext.Provider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
