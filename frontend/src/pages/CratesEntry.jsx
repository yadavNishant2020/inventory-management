import { useState, useEffect, useContext } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ToastContext } from "../App";
import { cratesApi } from "../api/client";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function CratesEntry() {
  const { showToast } = useContext(ToastContext);
  const [searchParams] = useSearchParams();
  const preselectedCustomer = searchParams.get("customer");

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(
    preselectedCustomer || "",
  );
  const [entries, setEntries] = useState([
    {
      id: 1,
      type: "OUT",
      wg_quantity: "",
      normal_quantity: "",
      entry_date: new Date(),
      remark: "",
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      const data = await cratesApi.getCustomers();
      setCustomers(data);
    } catch (error) {
      showToast("Failed to load customers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "OUT",
        wg_quantity: "",
        normal_quantity: "",
        entry_date: new Date(),
        remark: "",
      },
    ]);
  };

  const removeEntry = (id) => {
    if (entries.length === 1) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (id, field, value) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      showToast("Please select a customer", "warning");
      return;
    }

    const validEntries = entries.filter((e) => {
      const wg = parseInt(e.wg_quantity) || 0;
      const normal = parseInt(e.normal_quantity) || 0;
      return wg + normal > 0 && wg >= 0 && normal >= 0;
    });

    if (validEntries.length === 0) {
      showToast("Add at least one entry with WG or Sada quantity", "warning");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        customer_id: parseInt(selectedCustomer),
        entries: validEntries.map((e) => ({
          type: e.type,
          wg_quantity: parseInt(e.wg_quantity) || 0,
          normal_quantity: parseInt(e.normal_quantity) || 0,
          entry_date: formatDateForAPI(e.entry_date),
          remark: e.remark.trim() || null,
        })),
      };

      await cratesApi.createBulkEntries(payload);
      showToast(
        `${validEntries.length} entries created successfully`,
        "success",
      );

      // Reset form
      setEntries([
        {
          id: 1,
          type: "OUT",
          wg_quantity: "",
          normal_quantity: "",
          entry_date: new Date(),
          remark: "",
        },
      ]);
    } catch (error) {
      const msg = error.response?.data?.error || "Failed to create entries";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateForAPI = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const entryTotal = (e) =>
    (parseInt(e.wg_quantity) || 0) + (parseInt(e.normal_quantity) || 0);
  const totalOut = entries.reduce(
    (sum, e) => sum + (e.type === "OUT" ? entryTotal(e) : 0),
    0,
  );
  const totalIn = entries.reduce(
    (sum, e) => sum + (e.type === "IN" ? entryTotal(e) : 0),
    0,
  );
  const validEntryCount = entries.filter(
    (e) =>
      entryTotal(e) > 0 &&
      (parseInt(e.wg_quantity) || 0) >= 0 &&
      (parseInt(e.normal_quantity) || 0) >= 0,
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/crates">
          <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-smooth">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            Add Crate Entries
          </h1>
          <p className="text-slate-500 text-xs">Record crates in or out</p>
        </div>
      </div>

      {/* Customer Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <label className="block text-xs font-medium text-slate-500 mb-2">
          Select Customer <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-white"
        >
          <option value="">-- Select Customer --</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_en}
            </option>
          ))}
        </select>
      </div>

      {/* Entries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Entries</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Out:{" "}
              <span className="font-semibold text-amber-600">{totalOut}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              In:{" "}
              <span className="font-semibold text-emerald-600">{totalIn}</span>
            </span>
          </div>
        </div>

        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="bg-white rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500">
                Entry {index + 1}
              </span>
              {entries.length > 1 && (
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-smooth"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {/* Type Toggle */}
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  onClick={() => updateEntry(entry.id, "type", "OUT")}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-smooth ${
                    entry.type === "OUT"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  OUT (Debit)
                </button>
                <button
                  onClick={() => updateEntry(entry.id, "type", "IN")}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-smooth ${
                    entry.type === "IN"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  IN (Credit)
                </button>
              </div>

              {/* Date with increment/decrement buttons */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Date
                </label>
                <div className="flex items-center gap-2">
                  <DatePicker
                    selected={entry.entry_date}
                    onChange={(date) =>
                      updateEntry(entry.id, "entry_date", date)
                    }
                    dateFormat="dd/MM/yyyy"
                    className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    popperClassName="z-50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(entry.entry_date);
                      d.setDate(d.getDate() - 1);
                      updateEntry(entry.id, "entry_date", d);
                    }}
                    className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                    title="Decrease date by 1 day"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(entry.entry_date);
                      d.setDate(d.getDate() + 1);
                      updateEntry(entry.id, "entry_date", d);
                    }}
                    className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                    title="Increase date by 1 day"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Quantity: WG + Sada */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Quantity (WG + Sada)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      min="0"
                      value={entry.wg_quantity}
                      onChange={(e) =>
                        updateEntry(entry.id, "wg_quantity", e.target.value)
                      }
                      placeholder="WG"
                      className={`w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-center focus:ring-2 ${
                        entry.type === "OUT"
                          ? "text-amber-600 focus:border-amber-500 focus:ring-amber-500/20"
                          : "text-emerald-600 focus:border-emerald-500 focus:ring-emerald-500/20"
                      }`}
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5 text-center">
                      WG
                    </p>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      value={entry.normal_quantity}
                      onChange={(e) =>
                        updateEntry(entry.id, "normal_quantity", e.target.value)
                      }
                      placeholder="Sada"
                      className={`w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-center focus:ring-2 ${
                        entry.type === "OUT"
                          ? "text-amber-600 focus:border-amber-500 focus:ring-amber-500/20"
                          : "text-emerald-600 focus:border-emerald-500 focus:ring-emerald-500/20"
                      }`}
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5 text-center">
                      Sada
                    </p>
                  </div>
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Remark (optional)
                </label>
                <input
                  type="text"
                  value={entry.remark}
                  onChange={(e) =>
                    updateEntry(entry.id, "remark", e.target.value)
                  }
                  placeholder="Optional note..."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Entry Button */}
      <button
        onClick={addEntry}
        className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-medium hover:border-amber-400 hover:text-amber-600 transition-smooth flex items-center justify-center gap-2"
      >
        <PlusIcon className="w-5 h-5" />
        Add Entry
      </button>

      {/* Submit Button - Fixed at bottom */}
      <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-96">
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedCustomer || validEntryCount === 0}
          className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 ${
            selectedCustomer && validEntryCount > 0
              ? "bg-amber-500 shadow-amber-500/30 hover:bg-amber-600"
              : "bg-slate-300"
          }`}
        >
          {submitting ? (
            <>
              <LoadingSpinner className="w-5 h-5" />
              Saving...
            </>
          ) : (
            <>
              <CheckIcon className="w-5 h-5" />
              Save {validEntryCount} Entries
            </>
          )}
        </button>
      </div>

      {/* Spacer for fixed button */}
      <div className="h-24"></div>
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

function PlusIcon({ className }) {
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
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

function TrashIcon({ className }) {
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
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function CheckIcon({ className }) {
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
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function LoadingSpinner({ className }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default CratesEntry;
