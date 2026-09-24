export default function Table({
  columns = [],
  rows = [],
  rowKey,
  containerClassName = '',
  tableClassName = '',
  minWidth = '820px',
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-[#dfe7ef] bg-white ${containerClassName}`}
    >
      <div className="overflow-x-auto">
        <table
          style={{ minWidth }}
          className={`w-full table-auto border-collapse text-left text-[13px] text-slate-600 ${tableClassName}`}
        >
          <thead className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`border-b border-[#e7edf3] px-3 py-3 align-middle font-semibold ${
                    column.headerClass || ''
                  } ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const isLastRow = rowIndex === rows.length - 1
              const stableRowKey = rowKey ? rowKey(row) : row.id

              return (
                <tr key={stableRowKey} className="align-middle text-slate-700">
                  {columns.map((column) => (
                    <td
                      key={`${stableRowKey}-${column.key}`}
                      className={`px-3 py-2.5 align-middle ${column.cellClass || ''} ${
                        column.align === 'right' ? 'text-right' : 'text-left'
                      } ${isLastRow ? 'border-b-0' : 'border-b border-[#edf1f5]'}`}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
