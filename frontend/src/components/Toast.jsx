function Toast({ message, type = 'success', onClose }) {
  const styles = {
    success: {
      bg: 'bg-success-50 border-success-200',
      text: 'text-success-800',
      icon: 'text-success-500',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: 'text-red-500',
    },
    warning: {
      bg: 'bg-warning-50 border-warning-200',
      text: 'text-warning-800',
      icon: 'text-warning-500',
    },
    info: {
      bg: 'bg-primary-50 border-primary-200',
      text: 'text-primary-800',
      icon: 'text-primary-500',
    },
  }

  const style = styles[type] || styles.success

  return (
    <div className="fixed bottom-24 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 z-50 toast-enter">
      <div className={`flex items-center gap-3 px-4 py-3 lg:px-5 lg:py-4 rounded-xl border shadow-elevated ${style.bg}`}>
        <div className={style.icon}>
          {type === 'success' && <CheckIcon className="w-5 h-5" />}
          {type === 'error' && <XIcon className="w-5 h-5" />}
          {type === 'warning' && <WarningIcon className="w-5 h-5" />}
          {type === 'info' && <InfoIcon className="w-5 h-5" />}
        </div>
        <p className={`text-sm font-medium flex-1 ${style.text}`}>{message}</p>
        <button
          onClick={onClose}
          className={`p-1 rounded-lg hover:bg-black/5 transition-smooth ${style.text}`}
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function XIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function WarningIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function InfoIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

function CloseIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default Toast
