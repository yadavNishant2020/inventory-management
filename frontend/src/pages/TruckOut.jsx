import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { ToastContext } from '../App'
import { itemsApi, entriesApi } from '../api/client'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

function TruckOut() {
  const { showToast } = useContext(ToastContext)
  const [items, setItems] = useState([])
  const [quantities, setQuantities] = useState({})
  const [remark, setRemark] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [timeInput, setTimeInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchItems = async () => {
    try {
      const data = await itemsApi.getAll()
      // Only show items with stock > 0
      const availableItems = data.filter(item => item.quantity > 0)
      setItems(availableItems)
      // Initialize quantities to empty
      const initialQty = {}
      availableItems.forEach(item => {
        initialQty[item.id] = ''
      })
      setQuantities(initialQty)
    } catch (error) {
      showToast('Failed to load items', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    // Set default time to current time in 12-hour format
    const now = new Date()
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
    setTimeInput(timeString)
  }, [])

  const handleQuantityChange = (itemId, value, maxQty) => {
    // Don't allow more than available stock
    const numValue = parseInt(value) || 0
    if (numValue > maxQty) {
      showToast(`Only ${maxQty} available`, 'warning')
      setQuantities(prev => ({ ...prev, [itemId]: maxQty.toString() }))
    } else {
      setQuantities(prev => ({ ...prev, [itemId]: value }))
    }
  }

  const handleSubmitAll = async () => {
    // Get items with quantities > 0
    const itemsToRemove = items.filter(item => {
      const qty = parseInt(quantities[item.id])
      return qty > 0
    }).map(item => ({
      item_id: item.id,
      quantity: parseInt(quantities[item.id])
    }))

    if (itemsToRemove.length === 0) {
      showToast('Enter quantity for at least one item', 'warning')
      return
    }

    // Validate quantities don't exceed stock
    for (const item of items) {
      const qty = parseInt(quantities[item.id]) || 0
      if (qty > item.quantity) {
        showToast(`${item.name}: Only ${item.quantity} available`, 'error')
        return
      }
    }

    setSubmitting(true)

    try {
      // Combine date and time
      const transactionDate = new Date(selectedDate)
      // Parse time input (e.g., "12:30 PM")
      if (timeInput) {
        const timeMatch = timeInput.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
        if (timeMatch) {
          let hours = parseInt(timeMatch[1])
          const minutes = parseInt(timeMatch[2])
          const period = timeMatch[3]?.toUpperCase()
          
          if (period === 'PM' && hours !== 12) hours += 12
          if (period === 'AM' && hours === 12) hours = 0
          
          transactionDate.setHours(hours, minutes, 0, 0)
        }
      }

      await entriesApi.createTruckTransaction({
        type: 'OUT',
        remark: remark.trim() || null,
        transaction_date: transactionDate.toISOString(),
        items: itemsToRemove
      })

      showToast(`Truck OUT: Removed ${itemsToRemove.length} item(s) from stock`, 'success')
      
      // Reset form
      setRemark('')
      fetchItems()
      
      // Reset date/time to current
      setSelectedDate(new Date())
      const now = new Date()
      setTimeInput(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }))
      
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to process truck'
      showToast(errorMsg, 'error')
    }

    setSubmitting(false)
  }

  const totalItemsToRemove = Object.values(quantities).filter(q => parseInt(q) > 0).length
  const totalQuantity = Object.values(quantities).reduce((sum, q) => sum + (parseInt(q) || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
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
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Truck OUT
          </h1>
          <p className="text-slate-500 text-xs">Truck leaving - remove stock</p>
        </div>
      </div>

      {/* Date/Time & Remark */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Date</label>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              dateFormat="dd/MM/yyyy"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              placeholderText="Select date"
              popperClassName="z-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Time</label>
            <input
              type="text"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              placeholder="12:30 PM"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>
        <input
          type="text"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Remark (e.g., Sold to XYZ)"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
        />
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr,60px,80px] bg-slate-50 border-b border-slate-200 px-4 py-2.5">
          <span className="text-xs font-semibold text-slate-600 uppercase">Name</span>
          <span className="text-xs font-semibold text-slate-600 uppercase text-center">Stock</span>
          <span className="text-xs font-semibold text-slate-600 uppercase text-center">Out</span>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 text-sm">No items with available stock.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-[1fr,60px,80px] items-center px-4 py-3">
                <div>
                  <p className="font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">({item.variety})</p>
                </div>
                <p className={`text-center font-semibold ${
                  item.quantity > 50 ? 'text-emerald-600' : 
                  item.quantity > 10 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {item.quantity}
                </p>
                <input
                  type="number"
                  min="0"
                  max={item.quantity}
                  placeholder="0"
                  value={quantities[item.id] || ''}
                  onChange={(e) => handleQuantityChange(item.id, e.target.value, item.quantity)}
                  className="w-full px-2 py-2 rounded-lg border border-slate-200 text-center font-semibold text-amber-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button - Fixed at bottom */}
      {items.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-96">
          <button
            onClick={handleSubmitAll}
            disabled={submitting || totalItemsToRemove === 0}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 ${
              totalItemsToRemove > 0
                ? 'bg-amber-500 shadow-amber-500/30'
                : 'bg-slate-300'
            }`}
          >
            {submitting ? (
              <>
                <LoadingSpinner className="w-5 h-5" />
                Processing...
              </>
            ) : (
              <>
                <TruckIcon className="w-5 h-5" />
                Truck OUT ({totalItemsToRemove} items, -{totalQuantity})
              </>
            )}
          </button>
        </div>
      )}

      {/* Spacer for fixed button */}
      <div className="h-20"></div>
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

function TruckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
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

export default TruckOut

