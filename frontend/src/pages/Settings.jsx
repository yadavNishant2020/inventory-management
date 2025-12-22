import { useState, useEffect, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ToastContext } from '../App'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/client'

function Settings() {
  const { showToast } = useContext(ToastContext)
  const { user, logout, changePassword } = useAuth()
  const navigate = useNavigate()
  
  // User management state
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(null)
  
  // Form states
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' })
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [resetPasswordInput, setResetPasswordInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isAdmin = user?.role === 'admin'

  // Fetch users (admin only)
  const fetchUsers = async () => {
    if (!isAdmin) return
    setLoadingUsers(true)
    try {
      const data = await authApi.getUsers()
      setUsers(data)
    } catch (error) {
      showToast('Failed to load users', 'error')
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

  // Handle add new user
  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!newUser.username || !newUser.password) {
      showToast('Username and password are required', 'error')
      return
    }
    if (newUser.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }

    setSubmitting(true)
    try {
      await authApi.createUser(newUser)
      showToast(`User "${newUser.username}" created successfully`, 'success')
      setNewUser({ username: '', password: '', role: 'user' })
      setShowAddUser(false)
      fetchUsers()
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to create user', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete user
  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Delete user "${username}"?`)) return
    
    try {
      await authApi.deleteUser(userId)
      showToast(`User "${username}" deleted`, 'success')
      fetchUsers()
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to delete user', 'error')
    }
  }

  // Handle reset user password
  const handleResetPassword = async (userId) => {
    if (!resetPasswordInput || resetPasswordInput.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }

    setSubmitting(true)
    try {
      await authApi.resetUserPassword(userId, resetPasswordInput)
      showToast('Password reset successfully', 'success')
      setShowResetPassword(null)
      setResetPasswordInput('')
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to reset password', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle change own password
  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!passwordForm.current || !passwordForm.new) {
      showToast('Please fill all fields', 'error')
      return
    }
    if (passwordForm.new !== passwordForm.confirm) {
      showToast('New passwords do not match', 'error')
      return
    }
    if (passwordForm.new.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }

    setSubmitting(true)
    try {
      await changePassword(passwordForm.current, passwordForm.new)
      showToast('Password changed successfully', 'success')
      setPasswordForm({ current: '', new: '', confirm: '' })
      setShowChangePassword(false)
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to change password', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle logout
  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/">
          <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-smooth">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Settings</h1>
          <p className="text-slate-500 text-xs">Account & preferences</p>
        </div>
      </div>

      {/* Current User Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-800 text-lg">{user?.username}</p>
            <p className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block ${
              isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {user?.role?.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Account</h2>
        </div>
        
        <button
          onClick={() => setShowChangePassword(!showChangePassword)}
          className="w-full px-4 py-3.5 text-left flex items-center justify-between hover:bg-slate-50 transition-smooth border-b border-slate-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
              <KeyIcon className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <span className="font-medium text-slate-700">Change Password</span>
          </div>
          <ChevronRightIcon className={`w-5 h-5 text-slate-400 transition-transform ${showChangePassword ? 'rotate-90' : ''}`} />
        </button>

        {showChangePassword && (
          <form onSubmit={handleChangePassword} className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
            <input
              type="password"
              placeholder="Current Password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            <input
              type="password"
              placeholder="New Password (min 6 chars)"
              value={passwordForm.new}
              onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-primary-500 text-white rounded-lg font-medium text-sm disabled:opacity-50"
            >
              {submitting ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        )}

        <button
          onClick={handleLogout}
          className="w-full px-4 py-3.5 text-left flex items-center gap-3 hover:bg-red-50 transition-smooth text-red-600"
        >
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
            <LogoutIcon className="w-4.5 h-4.5 text-red-600" />
          </div>
          <span className="font-medium">Sign Out</span>
        </button>
      </div>

      {/* Admin: User Management */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-purple-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldIcon className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-semibold text-purple-700">User Management</h2>
            </div>
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="text-xs font-medium text-purple-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-purple-100"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add User
            </button>
          </div>

          {/* Add User Form */}
          {showAddUser && (
            <form onSubmit={handleAddUser} className="p-4 bg-purple-50/50 border-b border-slate-200 space-y-3">
              <input
                type="text"
                placeholder="Username (min 3 chars)"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-white"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 py-2.5 bg-slate-200 text-slate-700 rounded-lg font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-purple-500 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          )}

          {/* Users List */}
          {loadingUsers ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 mx-auto border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map(u => (
                <div key={u.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                        u.role === 'admin' ? 'bg-purple-500' : 'bg-slate-400'
                      }`}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{u.username}</p>
                        <p className={`text-[10px] font-medium ${
                          u.role === 'admin' ? 'text-purple-600' : 'text-slate-500'
                        }`}>
                          {u.role.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    
                    {u.id !== user.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setShowResetPassword(showResetPassword === u.id ? null : u.id)
                            setResetPasswordInput('')
                          }}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-smooth"
                          title="Reset Password"
                        >
                          <KeyIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-smooth"
                          title="Delete User"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    
                    {u.id === user.id && (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">You</span>
                    )}
                  </div>

                  {/* Reset Password Form */}
                  {showResetPassword === u.id && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="password"
                        placeholder="New password"
                        value={resetPasswordInput}
                        onChange={(e) => setResetPasswordInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      />
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        disabled={submitting}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* App Info */}
      <div className="text-center py-4">
        <p className="text-xs text-slate-400">InventoryPro v1.0</p>
      </div>
    </div>
  )
}

// Icons
function ArrowLeftIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function KeyIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  )
}

function LogoutIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  )
}

function ShieldIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function TrashIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function ChevronRightIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

export default Settings






