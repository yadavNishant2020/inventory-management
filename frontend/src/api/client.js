import axios from "axios";

// Use ngrok URL for external access, or local proxy for development
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "/api"
    : "https://51d0ef2e84c7.ngrok-free.app/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Add token to all requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear it
      localStorage.removeItem("auth_token");
      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth API (no token required for login)
export const authApi = {
  login: async (username, password) => {
    const response = await api.post("/auth/login", { username, password });
    return response.data;
  },

  verify: async () => {
    const response = await api.get("/auth/verify");
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  // User management (admin only)
  getUsers: async () => {
    const response = await api.get("/auth/users");
    return response.data;
  },

  createUser: async (data) => {
    const response = await api.post("/auth/users", data);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/auth/users/${id}`);
    return response.data;
  },

  resetUserPassword: async (id, newPassword) => {
    const response = await api.put(`/auth/users/${id}/reset-password`, {
      newPassword,
    });
    return response.data;
  },
};

// Items API
export const itemsApi = {
  getAll: async () => {
    const response = await api.get("/items");
    return response.data;
  },

  getStats: async () => {
    const response = await api.get("/items/stats");
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/items", data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/items/${id}`);
    return response.data;
  },
};

// Entries API
export const entriesApi = {
  getAll: async (params = {}) => {
    const response = await api.get("/entries", { params });
    return response.data;
  },

  getToday: async (type) => {
    const params = type ? { type } : {};
    const response = await api.get("/entries/today", { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/entries", data);
    return response.data;
  },

  // Truck-level transactions
  getTrucks: async (params = {}) => {
    const response = await api.get("/entries/trucks", { params });
    return response.data;
  },

  getTruckDetails: async (id) => {
    const response = await api.get(`/entries/trucks/${id}`);
    return response.data;
  },

  createTruckTransaction: async (data) => {
    const response = await api.post("/entries/truck", data);
    return response.data;
  },
};

// Crates API
export const cratesApi = {
  // Customers
  getCustomers: async () => {
    const response = await api.get("/crates/customers");
    return response.data;
  },

  createCustomer: async (data) => {
    const response = await api.post("/crates/customers", data);
    return response.data;
  },

  updateCustomer: async (id, data) => {
    const response = await api.put(`/crates/customers/${id}`, data);
    return response.data;
  },

  deleteCustomer: async (id) => {
    const response = await api.delete(`/crates/customers/${id}`);
    return response.data;
  },

  // Entries
  getEntries: async (params = {}) => {
    const response = await api.get("/crates/entries", { params });
    return response.data;
  },

  createEntry: async (data) => {
    const response = await api.post("/crates/entries", data);
    return response.data;
  },

  createBulkEntries: async (data) => {
    const response = await api.post("/crates/entries/bulk", data);
    return response.data;
  },

  deleteEntry: async (id) => {
    const response = await api.delete(`/crates/entries/${id}`);
    return response.data;
  },

  // Ledger
  getLedger: async (customerId, params = {}) => {
    const response = await api.get(`/crates/ledger/${customerId}`, { params });
    return response.data;
  },

  // Stats
  getStats: async () => {
    const response = await api.get("/crates/stats");
    return response.data;
  },
};

export default api;
