function StatCard({ title, value, icon: Icon, color = 'primary', subtitle }) {
  const colors = {
    primary: {
      gradient: 'from-indigo-500 to-indigo-600',
      bg: 'bg-indigo-500',
      light: 'bg-indigo-50',
      text: 'text-indigo-600',
    },
    success: {
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-500',
      light: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    warning: {
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-500',
      light: 'bg-amber-50',
      text: 'text-amber-600',
    },
  }

  const style = colors[color] || colors.primary

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Colored top accent */}
      <div className={`h-1 bg-gradient-to-r ${style.gradient}`}></div>
      
      <div className="p-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl ${style.light} flex items-center justify-center mb-3`}>
          <Icon className={`w-5 h-5 ${style.text}`} />
        </div>
        
        {/* Value */}
        <p className="text-2xl font-bold text-slate-800 tracking-tight">{value}</p>
        
        {/* Title */}
        <p className="text-xs font-medium text-slate-500 mt-0.5">{title}</p>
      </div>
    </div>
  )
}

export default StatCard
