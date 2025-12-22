function DataTable({ columns, data, emptyMessage = 'No data available', onRowClick, actions, mobileCard }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-8 lg:p-12 text-center">
          <div className="w-14 h-14 lg:w-16 lg:h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
            <EmptyIcon className="w-7 h-7 lg:w-8 lg:h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium text-sm lg:text-base">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {data.map((row, rowIdx) => (
          <div
            key={row.id || rowIdx}
            className={`bg-white rounded-xl border border-slate-200 shadow-card p-4 ${onRowClick ? 'cursor-pointer active:bg-slate-50' : ''}`}
            onClick={() => onRowClick && onRowClick(row)}
          >
            {mobileCard ? (
              mobileCard(row, actions)
            ) : (
              <div className="space-y-2">
                {columns.map((col, colIdx) => (
                  <div key={colIdx} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium uppercase">{col.header}</span>
                    <span className="text-sm text-slate-800">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </span>
                  </div>
                ))}
                {actions && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                    {actions(row)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
                {actions && (
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  className={`transition-smooth ${onRowClick ? 'cursor-pointer' : ''} hover:bg-slate-50`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-6 py-4 text-sm ${col.cellClassName || ''}`}
                    >
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function EmptyIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
}

export default DataTable
