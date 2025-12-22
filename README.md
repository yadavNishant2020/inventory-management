# Inventory Management System

A modern, full-stack inventory management application for tracking product stock, incoming/outgoing inventory, and transaction history.

## Features

- **Dashboard**: Overview of total stock, product count, and daily entries
- **Products IN**: Add incoming stock with name, variety, and quantity
- **Products OUT**: Remove outgoing stock with validation
- **Entries**: Full transaction history with filtering

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router
- **Backend**: Node.js, Express.js
- **Database**: MySQL

## Prerequisites

- Node.js 18+
- MySQL 8.0+

## Setup

### 1. Database Setup

Create a MySQL database:

```sql
CREATE DATABASE inventory_db;
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your MySQL credentials
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=inventory_db

# Start the server
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/items | List all items |
| GET | /api/items/stats | Get dashboard statistics |
| POST | /api/items | Create/update item |
| DELETE | /api/items/:id | Delete item |
| GET | /api/entries | List entries (with optional filters) |
| GET | /api/entries/today | Get today's entries |
| POST | /api/entries | Create IN/OUT entry |

## Deployment on Hostinger

### Backend (VPS)

1. Upload backend files to your VPS
2. Create MySQL database via hPanel
3. Update `.env` with production credentials
4. Install PM2: `npm install -g pm2`
5. Start server: `pm2 start src/index.js --name inventory-api`

### Frontend

1. Build: `npm run build`
2. Upload `dist/` folder to `public_html`
3. Configure API proxy or update API base URL

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.js         # Express server
│   │   ├── db.js            # MySQL connection
│   │   └── routes/
│   │       ├── items.js     # Items API
│   │       └── entries.js   # Entries API
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── api/             # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## License

MIT






# inventory-management
