import { useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { ToastContext } from '../App'
import { itemsApi } from '../api/client'

function AddItem() {
  const { showToast } = useContext(ToastContext)
  const [formData, setFormData] = useState({ name: '', variety: '' })
  const [submitting, setSubmitting] = useState(false)
  const [recentlyAdded, setRecentlyAdded] = useState([])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.variety.trim()) {
      showToast('Please fill all fields', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const result = await itemsApi.create({
        name: formData.name.trim(),
        variety: formData.variety.trim()
      })
      
      showToast(`Added: ${formData.name} (${formData.variety})`, 'success')
      setRecentlyAdded(prev => [{ 
        name: formData.name.trim(), 
        variety: formData.variety.trim(),
        id: Date.now() 
      }, ...prev])
      setFormData({ name: '', variety: '' })
    } catch (error) {
      if (error.message?.includes('Duplicate')) {
        showToast('This item already exists', 'error')
      } else {
        showToast('Failed to add item', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/">
          <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-smooth">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Add Item</h1>
          <p className="text-slate-500 text-xs">Add new product to database</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Product Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Apple, Orange, Mango"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-smooth"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Variety
          </label>
          <input
            type="text"
            name="variety"
            value={formData.variety}
            onChange={handleChange}
            placeholder="e.g., Lot200, RG, Indian, Imported"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-smooth"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 shadow-lg shadow-primary-500/25 transition-smooth flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <LoadingSpinner className="w-5 h-5" />
              Adding...
            </>
          ) : (
            <>
              <PlusIcon className="w-5 h-5" />
              Add Item
            </>
          )}
        </button>
      </form>

      {/* Recently Added */}
      {recentlyAdded.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-800 mb-2">Recently Added</h2>
          <div className="space-y-2">
            {recentlyAdded.map(item => (
              <div key={item.id} className="bg-success-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                  <CheckIcon className="w-4 h-4 text-success-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.variety}</p>
                </div>
                <span className="ml-auto text-xs text-slate-400">Qty: 0</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-xs text-slate-500">
          <span className="font-medium text-slate-700">Note:</span> Items are added with 0 quantity. 
          Use <span className="font-medium">Truck IN</span> to add stock when a truck arrives.
        </p>
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

function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function LoadingSpinner({ className }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export default AddItem






