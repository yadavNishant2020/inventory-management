import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { ToastContext } from '../App'
import { entriesApi } from '../api/client'

function Entries() {
  const { showToast } = useContext(ToastContext)
  const [trucks, setTrucks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, IN, OUT
  const [expandedTruck, setExpandedTruck] = useState(null)
  const [truckDetails, setTruckDetails] = useState({})

  const fetchTrucks = async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? { type: filter } : {}
      const data = await entriesApi.getTrucks(params)
      // Filter out empty transactions (orphaned from deleted items before history fix)
      const validTrucks = data.filter(truck => truck.item_count > 0 || truck.total_quantity > 0)
      setTrucks(validTrucks)
    } catch (error) {
      showToast('Failed to load history', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrucks()
  }, [filter])

  const handleExpandTruck = async (truckId) => {
    if (expandedTruck === truckId) {
      setExpandedTruck(null)
      return
    }

    setExpandedTruck(truckId)

    // Fetch details if not already loaded
    if (!truckDetails[truckId]) {
      try {
        const details = await entriesApi.getTruckDetails(truckId)
        setTruckDetails(prev => ({ ...prev, [truckId]: details }))
      } catch (error) {
        showToast('Failed to load truck details', 'error')
      }
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
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
          <h1 className="text-lg font-bold text-slate-800">History</h1>
          <p className="text-slate-500 text-xs">All truck transactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 mr-1">Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth ${
              filter === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-slate-100 text-slate-600 active:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('IN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth flex items-center gap-1 ${
              filter === 'IN'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600 active:bg-slate-200'
            }`}
          >
            <TruckInIcon className="w-3.5 h-3.5" />
            Truck IN
          </button>
          <button
            onClick={() => setFilter('OUT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth flex items-center gap-1 ${
              filter === 'OUT'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-600 active:bg-slate-200'
            }`}
          >
            <TruckOutIcon className="w-3.5 h-3.5" />
            Truck OUT
          </button>
        </div>
      </div>

      {/* Truck Transactions List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-8 h-8 mx-auto border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : trucks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <TruckIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">No truck transactions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trucks.map(truck => (
            <div 
              key={truck.id} 
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              {/* Truck Header */}
              <button
                onClick={() => handleExpandTruck(truck.id)}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 transition-smooth"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    truck.type === 'IN' 
                      ? 'bg-emerald-100' 
                      : 'bg-amber-100'
                  }`}>
                    {truck.type === 'IN' ? (
                      <TruckInIcon className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <TruckOutIcon className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${
                        truck.type === 'IN' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        Truck {truck.type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(truck.transaction_date)} • {formatTime(truck.transaction_date)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {truck.remark || 'No remark'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`font-bold ${
                      truck.type === 'IN' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {truck.type === 'IN' ? '+' : '-'}{truck.total_quantity || 0}
                    </p>
                    <p className="text-[10px] text-slate-400">{truck.item_count} items</p>
                  </div>
                  <ChevronIcon className={`w-5 h-5 text-slate-400 transition-transform ${
                    expandedTruck === truck.id ? 'rotate-180' : ''
                  }`} />
                </div>
              </button>

              {/* Expanded Details */}
              {expandedTruck === truck.id && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  {truckDetails[truck.id]?.items ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr,60px] pb-2 border-b border-slate-200">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Item</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase text-center">Qty</span>
                      </div>
                      {truckDetails[truck.id].items.map(item => (
                        <div key={item.id} className="grid grid-cols-[1fr,60px] py-2">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{item.name}</p>
                            <p className="text-xs text-slate-400">({item.variety})</p>
                          </div>
                          <p className={`text-center font-semibold ${
                            truck.type === 'IN' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {truck.type === 'IN' ? '+' : '-'}{item.quantity}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 mx-auto border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && trucks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{trucks.length}</span> trucks
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs text-slate-600">
                  IN: <span className="font-semibold text-slate-800">
                    +{trucks.filter(t => t.type === 'IN').reduce((sum, t) => sum + (parseInt(t.total_quantity) || 0), 0)}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-xs text-slate-600">
                  OUT: <span className="font-semibold text-slate-800">
                    -{trucks.filter(t => t.type === 'OUT').reduce((sum, t) => sum + (parseInt(t.total_quantity) || 0), 0)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
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
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  )
}

function TruckInIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  )
}

function TruckOutIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  )
}

function ChevronIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

export default Entries
