import { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContext } from "../App";
import { cratesApi } from "../api/client";

function CratesCustomers() {
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name_en: "",
    name_hi: "",
    opening_balance_wg: "",
    opening_balance_normal: "",
  });
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

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name_en.trim()) {
      showToast("English name is required", "warning");
      return;
    }

    setSubmitting(true);

    try {
      await cratesApi.createCustomer({
        name_en: formData.name_en.trim(),
        name_hi: formData.name_hi.trim() || null,
        opening_balance_wg: parseInt(formData.opening_balance_wg) || 0,
        opening_balance_normal: parseInt(formData.opening_balance_normal) || 0,
      });

      showToast("Customer added successfully", "success");
      setFormData({
        name_en: "",
        name_hi: "",
        opening_balance_wg: "",
        opening_balance_normal: "",
      });
      setShowAddForm(false);
      fetchCustomers();
    } catch (error) {
      const msg = error.response?.data?.error || "Failed to add customer";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customer) => {
    if (
      !window.confirm(
        `Delete customer "${customer.name_en}"? This will also delete all their crate entries.`,
      )
    ) {
      return;
    }

    try {
      await cratesApi.deleteCustomer(customer.id);
      showToast("Customer deleted", "success");
      fetchCustomers();
    } catch (error) {
      showToast("Failed to delete customer", "error");
    }
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/crates">
            <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-smooth">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Customers</h1>
            <p className="text-slate-500 text-xs">
              {customers.length} customers
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-smooth"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Add Customer</span>
        </button>
      </div>

      {/* Add Customer Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Add New Customer
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Name (English) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => handleInputChange("name_en", e.target.value)}
                  placeholder="Customer name"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Name (Hindi)
                </label>
                <input
                  type="text"
                  value={formData.name_hi}
                  onChange={(e) => handleInputChange("name_hi", e.target.value)}
                  placeholder="ग्राहक का नाम"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Opening Balance (पुरानी बाकि) – WG + Sada
              </label>
              <div className="flex flex-wrap gap-3">
                <div>
                  <input
                    type="number"
                    min="0"
                    value={formData.opening_balance_wg}
                    onChange={(e) =>
                      handleInputChange("opening_balance_wg", e.target.value)
                    }
                    placeholder="WG"
                    className="w-full sm:w-32 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">WG</p>
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    value={formData.opening_balance_normal}
                    onChange={(e) =>
                      handleInputChange(
                        "opening_balance_normal",
                        e.target.value,
                      )
                    }
                    placeholder="Sada"
                    className="w-full sm:w-32 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Sada</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-slate-300 transition-smooth"
              >
                {submitting ? "Adding..." : "Add Customer"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-smooth"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customers List */}
      {customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <UsersIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">No customers yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-3 text-blue-600 text-sm font-medium"
          >
            Add your first customer
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">
                      {customer.name_en.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {customer.name_en}
                    </p>
                    {customer.name_hi && (
                      <p className="text-xs text-slate-500">
                        {customer.name_hi}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${customer.current_balance > 0 ? "text-red-600" : customer.current_balance < 0 ? "text-emerald-600" : "text-slate-600"}`}
                    >
                      {customer.current_balance > 0
                        ? customer.current_balance
                        : customer.current_balance < 0
                          ? Math.abs(customer.current_balance)
                          : 0}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {customer.current_balance > 0
                        ? "Pending"
                        : customer.current_balance < 0
                          ? "Extra"
                          : "Settled"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/crates/ledger/${customer.id}`)}
                      className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-smooth"
                      title="View Ledger"
                    >
                      <DocumentIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/crates/entry?customer=${customer.id}`)
                      }
                      className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 transition-smooth"
                      title="Add Entry"
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(customer)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-smooth"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500">Opening:</span>
                  <span className="font-medium text-slate-700">
                    {customer.opening_balance}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="text-slate-500">Out:</span>
                  <span className="font-medium text-amber-600">
                    {customer.total_out}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-slate-500">In:</span>
                  <span className="font-medium text-emerald-600">
                    {customer.total_in}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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

function UsersIcon({ className }) {
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
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
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
      strokeWidth={2}
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

export default CratesCustomers;
