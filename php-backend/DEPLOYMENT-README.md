# 🚀 Inventory Management System - Hostinger Deployment

## 📦 What's Included

```
php-backend/
├── index.html              # Frontend (React build)
├── assets/                 # Frontend assets (CSS, JS)
├── .htaccess              # URL routing rules
├── config.php             # ⚠️ UPDATE THIS WITH YOUR CREDENTIALS
├── api/
│   ├── index.php          # API router
│   ├── .htaccess          # API routing
│   ├── test.php           # Test script (DELETE AFTER TESTING)
│   ├── config/
│   │   ├── config.php     # App configuration
│   │   └── database.php   # Database connection
│   ├── middleware/
│   │   └── auth.php       # Authentication
│   ├── routes/
│   │   ├── auth.php       # Auth endpoints
│   │   ├── items.php      # Items endpoints
│   │   └── entries.php    # Entries endpoints
│   └── utils/
│       └── jwt.php        # JWT implementation
└── DEPLOYMENT-README.md   # This file
```

---

## 🚀 Quick Deployment Steps

### Step 1: Create Database in Hostinger

1. Go to **hPanel** → **Databases** → **MySQL Databases**
2. Create a new database:
   - Database name: `inventory_db`
   - Username: `inventory_user`
   - Password: (create a strong password)
3. **Save these credentials!**

### Step 2: Update config.php

Edit `config.php` and update with your credentials:

```php
putenv('DB_USER=u746913984_inventory_user');  // Your DB username
putenv('DB_PASSWORD=YOUR_PASSWORD_HERE');      // Your DB password
putenv('DB_NAME=u746913984_inventory_db');     // Your DB name
putenv('JWT_SECRET=change-this-to-random-string');  // Change this!
putenv('CORS_ORIGIN=https://yourdomain.com');  // Your domain
```

### Step 3: Upload Files

1. Go to **File Manager** in hPanel
2. Navigate to `public_html` folder
3. **Delete all existing files** (or upload to a subdirectory)
4. Upload ALL files from this package
5. Make sure the structure looks like:
   ```
   public_html/
   ├── index.html
   ├── assets/
   ├── .htaccess
   ├── config.php
   └── api/
   ```

### Step 4: Test the API

1. Visit: `https://yourdomain.com/api/test.php`
2. All tests should pass ✅
3. **DELETE test.php after testing!**

### Step 5: Access Your Application

1. Visit: `https://yourdomain.com`
2. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`
3. **CHANGE THE PASSWORD IMMEDIATELY!**

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/verify` | Verify token |
| POST | `/api/auth/change-password` | Change password |
| GET | `/api/auth/users` | List users (admin) |
| POST | `/api/auth/users` | Create user (admin) |
| DELETE | `/api/auth/users/{id}` | Delete user (admin) |
| GET | `/api/items` | List items |
| GET | `/api/items/stats` | Dashboard stats |
| POST | `/api/items` | Create item |
| DELETE | `/api/items/{id}` | Delete item |
| GET | `/api/entries` | List entries |
| GET | `/api/entries/today` | Today's entries |
| GET | `/api/entries/trucks` | Truck transactions |
| GET | `/api/entries/trucks/{id}` | Truck details |
| POST | `/api/entries/truck` | Create truck transaction |

---

## ⚠️ Security Checklist

After deployment:

- [ ] Change admin password immediately
- [ ] Delete `api/test.php`
- [ ] Update `JWT_SECRET` to a long random string
- [ ] Ensure `.htaccess` files are working
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set up database backups

---

## 🐛 Troubleshooting

### "Database connection failed"
- Check credentials in `config.php`
- Ensure database exists in phpMyAdmin
- Verify `DB_HOST` is `localhost`

### "500 Internal Server Error"
- Check PHP error logs in hPanel
- Verify `.htaccess` files are present
- Ensure mod_rewrite is enabled

### "API returns 404"
- Check if `.htaccess` is uploaded
- Verify URL structure: `/api/health`

### "CORS errors"
- Update `CORS_ORIGIN` in `config.php`
- Include `https://` in the origin

---

## 📊 Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |

**⚠️ Change this password immediately after first login!**

---

## 📞 Support

If you encounter issues:
1. Run `/api/test.php` to check database
2. Check Hostinger error logs
3. Verify all files are uploaded correctly



