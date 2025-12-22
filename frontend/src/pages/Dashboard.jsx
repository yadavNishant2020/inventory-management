import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { ToastContext } from '../App'
import { itemsApi } from '../api/client'
import DataTable from '../components/DataTable'
import Button from '../components/Button'
import Modal from '../components/Modal'

function Dashboard() {
  const { showToast } = useContext(ToastContext)
  const [items, setItems] = useState([])
  const [stats, setStats] = useState({ totalStock: 0, itemCount: 0, todayEntries: 0 })
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null })
  const [sortBy, setSortBy] = useState('name') // 'name' or 'quantity'
  const [sortOrder, setSortOrder] = useState('asc') // 'asc' or 'desc'

  const fetchData = async () => {
    try {
      const [itemsData, statsData] = await Promise.all([
        itemsApi.getAll(),
        itemsApi.getStats()
      ])
      setItems(itemsData)
      setStats(statsData)
    } catch (error) {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Sort items based on current sort settings
  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === 'name') {
      const nameCompare = a.name.localeCompare(b.name)
      return sortOrder === 'asc' ? nameCompare : -nameCompare
    } else {
      const qtyCompare = a.quantity - b.quantity
      return sortOrder === 'asc' ? qtyCompare : -qtyCompare
    }
  })

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder(field === 'quantity' ? 'desc' : 'asc')
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.item) return
    
    try {
      await itemsApi.delete(deleteModal.item.id)
      showToast(`${deleteModal.item.name} (${deleteModal.item.variety}) deleted`, 'success')
      setDeleteModal({ open: false, item: null })
      fetchData()
    } catch (error) {
      showToast('Failed to delete item', 'error')
    }
  }

  const columns = [
    {
      header: 'Name',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.name}</p>
          <p className="text-slate-500 text-xs">({row.variety})</p>
        </div>
      ),
    },
    {
      header: 'Qty',
      render: (row) => (
        <span className={`font-bold ${
          row.quantity > 50 
            ? 'text-emerald-600'
            : row.quantity > 10
            ? 'text-amber-600'
            : row.quantity > 0
            ? 'text-red-600'
            : 'text-slate-400'
        }`}>
          {row.quantity}
        </span>
      ),
    },
  ]

  // Mobile card renderer
  const mobileCard = (row, actions) => (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="font-semibold text-slate-800">{row.name}</p>
        <p className="text-slate-500 text-xs">({row.variety})</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-lg font-bold ${
          row.quantity > 50 
            ? 'text-emerald-600'
            : row.quantity > 10
            ? 'text-amber-600'
            : row.quantity > 0
            ? 'text-red-600'
            : 'text-slate-400'
        }`}>
          {row.quantity}
        </span>
        {actions && actions(row)}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm">Current inventory overview</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/truck-in" className="block">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <TruckIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-base">Truck IN</p>
                <p className="text-emerald-100 text-xs">Add Stock</p>
              </div>
            </div>
          </div>
        </Link>
        <Link to="/truck-out" className="block">
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <TruckIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-base">Truck OUT</p>
                <p className="text-amber-100 text-xs">Remove Stock</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <div className="p-4 text-center">
            <div className="w-9 h-9 mx-auto bg-indigo-50 rounded-xl flex items-center justify-center mb-2">
              <BoxIcon className="w-4.5 h-4.5 text-indigo-500" />
            </div>
            <p className="text-xl font-bold text-slate-800">{stats.totalStock}</p>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Total Stock</p>
          </div>
          <div className="p-4 text-center">
            <div className="w-9 h-9 mx-auto bg-emerald-50 rounded-xl flex items-center justify-center mb-2">
              <TagIcon className="w-4.5 h-4.5 text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-slate-800">{stats.itemCount}</p>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Products</p>
          </div>
          <div className="p-4 text-center">
            <div className="w-9 h-9 mx-auto bg-amber-50 rounded-xl flex items-center justify-center mb-2">
              <ClockIcon className="w-4.5 h-4.5 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-slate-800">{stats.todayEntries}</p>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Today</p>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">Inventory</h2>
          <div className="flex items-center gap-2">
            <Link to="/add-item">
              <button className="text-xs text-primary-600 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary-50">
                <PlusIcon className="w-3.5 h-3.5" />
                Add Item
              </button>
            </Link>
            <Link to="/entries">
              <button className="text-xs text-slate-500 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100">
                <ListIcon className="w-3.5 h-3.5" />
                History
              </button>
            </Link>
          </div>
        </div>

        {/* Table Header for Mobile */}
        {items.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-[1fr,60px,40px] bg-slate-50 border-b border-slate-200 px-4 py-2">
              <button 
                onClick={() => handleSort('name')}
                className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1 text-left"
              >
                Name
                {sortBy === 'name' && (
                  <SortIcon className="w-3 h-3" direction={sortOrder} />
                )}
              </button>
              <button 
                onClick={() => handleSort('quantity')}
                className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1 justify-center"
              >
                Qty
                {sortBy === 'quantity' && (
                  <SortIcon className="w-3 h-3" direction={sortOrder} />
                )}
              </button>
              <span></span>
            </div>
            <div className="divide-y divide-slate-100">
              {sortedItems.map(item => (
                <div key={item.id} className="grid grid-cols-[1fr,60px,40px] items-center px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">({item.variety})</p>
                  </div>
                  <p className={`text-center font-bold ${
                    item.quantity > 50 
                      ? 'text-emerald-600'
                      : item.quantity > 10
                      ? 'text-amber-600'
                      : item.quantity > 0
                      ? 'text-red-600'
                      : 'text-slate-400'
                  }`}>
                    {item.quantity}
                  </p>
                  <button
                    onClick={() => setDeleteModal({ open: true, item })}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-smooth"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500 text-sm mb-2">No items in database</p>
            <Link to="/add-item" className="text-primary-600 font-medium text-sm">
              Add your first item
            </Link>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        title="Delete Item"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-14 h-14 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <TrashIcon className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-slate-600 mb-6 text-sm">
            Delete{' '}
            <span className="font-semibold text-slate-800">
              {deleteModal.item?.name} ({deleteModal.item?.variety})
            </span>
            ?
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteModal({ open: false, item: null })}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Icons
function BoxIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
}

function TagIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  )
}

function ClockIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function ListIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
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

function SortIcon({ className, direction }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      {direction === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      )}
    </svg>
  )
}

export default Dashboard
