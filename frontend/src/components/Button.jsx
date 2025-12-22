function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon,
  onClick, 
  disabled = false,
  className = '',
  type = 'button'
}) {
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-lg shadow-primary-500/25',
    secondary: 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700',
    success: 'bg-success-500 hover:bg-success-600 active:bg-success-700 text-white shadow-lg shadow-success-500/25',
    warning: 'bg-warning-500 hover:bg-warning-600 active:bg-warning-700 text-white shadow-lg shadow-warning-500/25',
    danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-lg shadow-red-500/25',
    ghost: 'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600',
    outline: 'bg-white border-2 border-slate-200 hover:border-slate-300 active:bg-slate-50 text-slate-700',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs lg:text-sm',
    md: 'px-3 lg:px-4 py-2 lg:py-2.5 text-sm',
    lg: 'px-4 lg:px-6 py-2.5 lg:py-3 text-sm lg:text-base',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-1.5 lg:gap-2 
        font-semibold rounded-lg lg:rounded-xl transition-smooth
        ${variants[variant]} 
        ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  )
}

export default Button
