import { useState } from 'react'

function ItemForm({ onSubmit, items = [], type = 'IN', loading = false }) {
  const isInForm = type === 'IN'
  
  const [formData, setFormData] = useState({
    name: '',
    variety: '',
    quantity: '',
    remark: '',
    item_id: '',
  })
  
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleItemSelect = (e) => {
    const itemId = e.target.value
    setFormData(prev => ({ ...prev, item_id: itemId }))
    if (errors.item_id) {
      setErrors(prev => ({ ...prev, item_id: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (isInForm) {
      if (!formData.name.trim()) newErrors.name = 'Name is required'
      if (!formData.variety.trim()) newErrors.variety = 'Variety is required'
    } else {
      if (!formData.item_id) newErrors.item_id = 'Please select an item'
    }
    
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) return
    
    const data = isInForm
      ? {
          name: formData.name.trim(),
          variety: formData.variety.trim(),
          quantity: parseInt(formData.quantity),
          type: 'IN',
          remark: formData.remark.trim() || null,
        }
      : {
          item_id: parseInt(formData.item_id),
          quantity: parseInt(formData.quantity),
          type: 'OUT',
          remark: formData.remark.trim() || null,
        }
    
    const success = await onSubmit(data)
    
    if (success) {
      setFormData({
        name: '',
        variety: '',
        quantity: '',
        remark: '',
        item_id: '',
      })
    }
  }

  const selectedItem = items.find(i => i.id === parseInt(formData.item_id))

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl lg:rounded-2xl border border-slate-200 shadow-card p-4 lg:p-6">
      <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4 lg:mb-6 flex items-center gap-2">
        {isInForm ? (
          <>
            <ArrowDownIcon className="w-5 h-5 text-success-500" />
            Add Stock (IN)
          </>
        ) : (
          <>
            <ArrowUpIcon className="w-5 h-5 text-warning-500" />
            Remove Stock (OUT)
          </>
        )}
      </h3>

      <div className="space-y-4">
        {isInForm ? (
          <>
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Product Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Apple, Orange"
                className={`w-full px-4 py-3 rounded-xl border text-base ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'
                } focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-smooth`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Variety Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Variety
              </label>
              <input
                type="text"
                name="variety"
                value={formData.variety}
                onChange={handleChange}
                placeholder="e.g., No2, Imported, Indian"
                className={`w-full px-4 py-3 rounded-xl border text-base ${
                  errors.variety ? 'border-red-300 bg-red-50' : 'border-slate-200'
                } focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-smooth`}
              />
              {errors.variety && <p className="mt-1 text-sm text-red-500">{errors.variety}</p>}
            </div>
          </>
        ) : (
          /* Item Dropdown for OUT */
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Select Item
            </label>
            <select
              name="item_id"
              value={formData.item_id}
              onChange={handleItemSelect}
              className={`w-full px-4 py-3 rounded-xl border text-base ${
                errors.item_id ? 'border-red-300 bg-red-50' : 'border-slate-200'
              } focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-smooth`}
            >
              <option value="">Choose an item...</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.variety}) — Stock: {item.quantity}
                </option>
              ))}
            </select>
            {errors.item_id && <p className="mt-1 text-sm text-red-500">{errors.item_id}</p>}
            {selectedItem && (
              <p className="mt-2 text-sm text-slate-500">
                Available: <span className="font-semibold text-slate-700">{selectedItem.quantity}</span>
              </p>
            )}
          </div>
        )}

        {/* Quantity Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Quantity
          </label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            placeholder="Enter quantity"
            min="1"
            max={!isInForm && selectedItem ? selectedItem.quantity : undefined}
            className={`w-full px-4 py-3 rounded-xl border text-base ${
              errors.quantity ? 'border-red-300 bg-red-50' : 'border-slate-200'
            } focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-smooth`}
          />
          {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
        </div>

        {/* Remark Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Remark <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            name="remark"
            value={formData.remark}
            onChange={handleChange}
            placeholder={isInForm ? "e.g., From supplier" : "e.g., Sold"}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-smooth"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3.5 rounded-xl font-semibold text-white transition-smooth flex items-center justify-center gap-2 text-base ${
            isInForm
              ? 'bg-success-500 hover:bg-success-600 active:bg-success-700 shadow-lg shadow-success-500/25'
              : 'bg-warning-500 hover:bg-warning-600 active:bg-warning-700 shadow-lg shadow-warning-500/25'
          } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <>
              <LoadingSpinner className="w-5 h-5" />
              Processing...
            </>
          ) : (
            <>
              {isInForm ? <PlusIcon className="w-5 h-5" /> : <MinusIcon className="w-5 h-5" />}
              {isInForm ? 'Add to Stock' : 'Remove from Stock'}
            </>
          )}
        </button>
      </div>
    </form>
  )
}

// Icons
function ArrowDownIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
    </svg>
  )
}

function ArrowUpIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
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

function MinusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
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

export default ItemForm
