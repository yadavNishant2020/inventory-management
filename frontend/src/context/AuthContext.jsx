import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('auth_token'))
  const [loading, setLoading] = useState(true)

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await authApi.verify()
          setUser(response.user)
        } catch (error) {
          // Token invalid, clear it
          localStorage.removeItem('auth_token')
          setToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }
    verifyToken()
  }, [token])

  const login = async (username, password) => {
    const response = await authApi.login(username, password)
    const { token: newToken, user: userData } = response
    
    localStorage.setItem('auth_token', newToken)
    setToken(newToken)
    setUser(userData)
    
    return response
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setToken(null)
    setUser(null)
  }

  const changePassword = async (currentPassword, newPassword) => {
    return await authApi.changePassword(currentPassword, newPassword)
  }

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    logout,
    changePassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext






