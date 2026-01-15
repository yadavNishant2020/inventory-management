import { useState, useEffect, useContext, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { ToastContext } from "../App";
import { cratesApi } from "../api/client";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function CratesLedger() {
  const { showToast } = useContext(ToastContext);
  const { customerId } = useParams();
  const printRef = useRef();

  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const params = {};
      if (fromDate) {
        params.from = formatDateForAPI(fromDate);
      }
      if (toDate) {
        params.to = formatDateForAPI(toDate);
      }

      const data = await cratesApi.getLedger(customerId, params);
      setLedgerData(data);
    } catch (error) {
      showToast("Failed to load ledger", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [customerId]);

  const handleFilter = () => {
    fetchLedger();
  };

  const handleClearFilter = () => {
    setFromDate(null);
    setToDate(null);
    // Fetch without filters
    setTimeout(() => {
      fetchLedger();
    }, 0);
  };

  const formatDateForAPI = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateShort = (dateInput) => {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Generate print HTML - called with current data
  const generatePrintHTML = (customerData, entriesData, summaryData) => {
    const netBalanceColor =
      summaryData.net_balance > 0
        ? "#dc2626"
        : summaryData.net_balance < 0
        ? "#059669"
        : "#374151";
    const balanceText =
      summaryData.net_balance > 0
        ? "Dr"
        : summaryData.net_balance < 0
        ? "Cr"
        : "";
    const balanceNote =
      summaryData.net_balance > 0
        ? "(Customer owes)"
        : summaryData.net_balance < 0
        ? "(We owe)"
        : "";

    let entriesHtml = "";
    entriesData.forEach((entry) => {
      const isDebit = entry.type === "OUT";
      entriesHtml += `
        <tr>
          <td style="border: 1px solid #e5e7eb; padding: 10px 12px; font-size: 13px;">${formatDateShort(
            entry.entry_date
          )}${
        entry.remark
          ? `<br><span style="font-size: 11px; color: #9ca3af;">${entry.remark}</span>`
          : ""
      }</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px 12px; text-align: right; font-weight: 600; color: #dc2626;">${
            isDebit ? entry.quantity : ""
          }</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px 12px; text-align: right; font-weight: 600; color: #059669;">${
            !isDebit ? entry.quantity : ""
          }</td>
        </tr>
      `;
    });

    // Build date range text for PDF
    const fromDateStr = fromDate ? formatDateShort(fromDate) : null;
    const toDateStr = toDate ? formatDateShort(toDate) : null;
    let dateRangeDisplay = "";
    if (fromDateStr && toDateStr) {
      dateRangeDisplay = `${fromDateStr} से ${toDateStr} तक`;
    } else if (fromDateStr) {
      dateRangeDisplay = `${fromDateStr} से आज तक`;
    } else if (toDateStr) {
      dateRangeDisplay = `शुरू से ${toDateStr} तक`;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ledger - ${customerData?.name_en || ""}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page {
            margin: 0;
            size: auto;
          }
          @media print {
            html, body {
              margin: 0;
              padding: 0;
            }
          }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            padding: 15mm 30mm;
            color: #374151;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="font-size: 20px; font-weight: bold; margin-bottom: 2px;">${
            customerData?.name_en || ""
          }</h1>
          ${
            customerData?.name_hi
              ? `<p style="color: #6b7280; font-size: 13px; margin-bottom: 6px;">${customerData.name_hi}</p>`
              : ""
          }
          ${
            dateRangeDisplay
              ? `<p style="color: #374151; font-size: 12px; font-weight: 500; margin-top: 6px; padding: 4px 12px; background: #f3f4f6; display: inline-block; border-radius: 4px;">${dateRangeDisplay}</p>`
              : ""
          }
        </div>
        
        <!-- Summary Box -->
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 25%; padding: 16px; text-align: center; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">पुरानी बाकि</div>
                <div style="font-size: 18px; font-weight: bold;">${
                  summaryData.opening_balance || 0
                }</div>
              </td>
              <td style="width: 25%; padding: 16px; text-align: center; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">कुल उधार (-)</div>
                <div style="font-size: 18px; font-weight: bold; color: #dc2626;">${
                  summaryData.total_out || 0
                }</div>
              </td>
              <td style="width: 25%; padding: 16px; text-align: center; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">कुल जमा (+)</div>
                <div style="font-size: 18px; font-weight: bold; color: #059669;">${
                  summaryData.total_in || 0
                }</div>
              </td>
              <td style="width: 25%; padding: 16px; text-align: center;">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">बाकि</div>
                <div style="font-size: 18px; font-weight: bold; color: ${netBalanceColor};">${Math.abs(
      summaryData.net_balance || 0
    )} <span style="font-size: 12px;">${balanceText}</span></div>
                ${
                  balanceNote
                    ? `<div style="font-size: 10px; color: #9ca3af;">${balanceNote}</div>`
                    : ""
                }
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Entries Info -->
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">No. of Entries: <strong style="color: #374151;">${
          entriesData.length
        }</strong></p>
        
        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #374151;">तारीख</th>
              <th style="border: 1px solid #e5e7eb; padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #374151;">उधार (-)</th>
              <th style="border: 1px solid #e5e7eb; padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #374151;">जमा (+)</th>
            </tr>
          </thead>
          <tbody>
            ${entriesHtml}
            <tr style="background: #f3f4f6; font-weight: bold;">
              <td style="border: 1px solid #e5e7eb; padding: 10px 12px; font-size: 13px;">कुल योग</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px 12px; text-align: right; color: #dc2626;">${
                summaryData.total_out || 0
              }</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px 12px; text-align: right; color: #059669;">${
                summaryData.total_in || 0
              }</td>
            </tr>
          </tbody>
        </table>
        
        <!-- Footer -->
        <p style="text-align: right; margin-top: 20px; font-size: 11px; color: #9ca3af;">
          Report Generated: ${new Date()
            .toLocaleString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              day: "2-digit",
              month: "short",
              year: "2-digit",
            })
            .replace(",", " |")}
        </p>
      </body>
      </html>
    `;
  };

  if (loading && !ledgerData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const customer = ledgerData?.customer;
  const entries = ledgerData?.entries || [];
  const summary = ledgerData?.summary || {};

  // Print function - defined after data variables are available
  const handlePrint = () => {
    const htmlContent = generatePrintHTML(customer, entries, summary);

    // Open new window and write content directly
    const printWindow = window.open("", "PrintWindow", "width=800,height=600");
    if (!printWindow) {
      showToast("Please allow popups to print", "error");
      return;
    }

    // Write the HTML content
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Use a longer delay to ensure content is fully rendered
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  const handleSavePDF = () => {
    handlePrint();
    showToast('Use "Save as PDF" in the print dialog', "info");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/crates/customers">
            <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-smooth">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              {customer?.name_en}
            </h1>
            {customer?.name_hi && (
              <p className="text-slate-500 text-xs">{customer?.name_hi}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-smooth"
          >
            <PrinterIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={handleSavePDF}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-smooth"
          >
            <DownloadIcon className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 pl-8">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              From Date
            </label>
            <DatePicker
              selected={fromDate}
              onChange={(date) => setFromDate(date)}
              dateFormat="dd/MM/yyyy"
              className="w-36 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholderText="Start date"
              popperClassName="z-50"
              popperPlacement="bottom-start"
              isClearable
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              To Date
            </label>
            <DatePicker
              selected={toDate}
              onChange={(date) => setToDate(date)}
              dateFormat="dd/MM/yyyy"
              className="w-36 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholderText="End date"
              popperClassName="z-50"
              popperPlacement="bottom-start"
              isClearable
            />
          </div>
          <button
            onClick={handleFilter}
            disabled={loading}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:bg-slate-300 transition-smooth"
          >
            {loading ? "Loading..." : "Apply Filter"}
          </button>
          {(fromDate || toDate) && (
            <button
              onClick={handleClearFilter}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-smooth"
            >
              Clear
            </button>
          )}
        </div>
        {(fromDate || toDate) && (
          <p className="text-xs text-slate-500 mt-2">
            Showing entries {fromDate ? `from ${formatDate(fromDate)}` : ""}{" "}
            {toDate ? `to ${formatDate(toDate)}` : ""}
          </p>
        )}
      </div>

      {/* Printable Content */}
      <div ref={printRef}>
        {/* Header for print */}
        <div className="header hidden print:block">
          <h1>{customer?.name_en} Statement</h1>
          {(fromDate || toDate) && (
            <p>
              ({fromDate ? formatDate(fromDate) : "Beginning"} -{" "}
              {toDate ? formatDate(toDate) : "Today"})
            </p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">पुरानी बाकि</p>
            <p className="text-xl font-bold text-slate-700">
              {summary.opening_balance || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">कुल उधार (-)</p>
            <p className="text-xl font-bold text-amber-600">
              {summary.total_out || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">कुल जमा (+)</p>
            <p className="text-xl font-bold text-emerald-600">
              {summary.total_in || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">बाकि</p>
            <p
              className={`text-xl font-bold ${
                summary.net_balance > 0
                  ? "text-red-600"
                  : summary.net_balance < 0
                  ? "text-emerald-600"
                  : "text-slate-600"
              }`}
            >
              {Math.abs(summary.net_balance || 0)}
              <span className="text-xs ml-1">
                {summary.net_balance > 0
                  ? "Dr"
                  : summary.net_balance < 0
                  ? "Cr"
                  : ""}
              </span>
            </p>
            <p className="text-[10px] text-slate-400">
              {summary.net_balance > 0
                ? "(Customer owes)"
                : summary.net_balance < 0
                ? "(We owe)"
                : "(Settled)"}
            </p>
          </div>
        </div>

        {/* Entries Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <p className="text-xs font-medium text-slate-600">
              No. of Entries:{" "}
              <span className="font-bold text-slate-800">{entries.length}</span>
            </p>
          </div>

          {entries.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">
                No entries found for this period
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      तारीख
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                      उधार (-)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                      जमा (+)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-700">
                          {formatDateShort(entry.entry_date)}
                        </span>
                        {entry.remark && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {entry.remark}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.type === "OUT" && (
                          <span className="font-semibold text-amber-600">
                            {entry.quantity}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.type === "IN" && (
                          <span className="font-semibold text-emerald-600">
                            {entry.quantity}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Grand Total Row */}
                  <tr className="bg-slate-100 font-semibold">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      कुल योग
                    </td>
                    <td className="px-4 py-3 text-center text-amber-600">
                      {summary.total_out || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-emerald-600">
                      {summary.total_in || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Generated timestamp */}
        <div className="footer text-right mt-4">
          <p className="text-xs text-slate-400">
            Report Generated:{" "}
            {new Date(ledgerData?.generated_at || new Date()).toLocaleString(
              "en-GB",
              {
                day: "2-digit",
                month: "short",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// Icons
function ArrowLeftIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
      />
    </svg>
  );
}

function PrinterIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
      />
    </svg>
  );
}

function DownloadIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function DocumentIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

export default CratesLedger;
