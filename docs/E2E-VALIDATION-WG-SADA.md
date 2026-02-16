# E2E Validation: WG + Sada Crate Tracking

Manual end-to-end validation steps for the WG/Sada split quantity feature.

## Prerequisites

- Backend running (PHP API)
- Frontend running (React)
- Database initialized (`initTables()` run at least once so migrations and data backfill have executed)

## 1. Customer creation with split opening balance

1. Go to **Customers** (Crates section).
2. Click **Add Customer**.
3. Enter Name (English), optionally Name (Hindi).
4. Enter **Opening Balance**: WG (e.g. 10) and Sada (e.g. 20).
5. Submit. Customer should be created.
6. In the list, opening/balance behaviour should reflect WG + Sada (backend returns `opening_balance_wg`, `opening_balance_normal` and derived totals).

**Pass:** Customer is created and stored with separate WG and Sada opening balances.

---

## 2. Crate entry form – WG + Sada quantities and date buttons

1. Go to **Entry** (Add Crate Entries).
2. Select a customer.
3. For **Entry 1**:
   - Choose OUT (Debit) or IN (Credit).
   - Use **Date** field and the **−** / **+** buttons; date should change by one day each click.
   - Enter **WG** (e.g. 5) and **Sada** (e.g. 10). At least one must be &gt; 0.
4. Click **Add Entry**, add a second entry with different WG/Sada values.
5. Click **Save X Entries**.

**Pass:** Entries save successfully. Ledger shows these entries with “WG + Sada = Total” format.

---

## 3. Ledger display – WG + Sada = Total

1. Go to **Ledger** for a customer that has entries (or the one used in step 2).
2. Check **Summary cards**: पुरानी बाकि, कुल उधार, कुल जमा, बाकि should show “X + Y = Z” (WG + Sada = Total) where applicable.
3. Check **Entries table**: each row’s उधार (-) and जमा (+) cells should show “wg + sada = total” (e.g. `5 + 10 = 15`).
4. Check **कुल योग** row: totals should use the same “WG + Sada = Total” format.

**Pass:** All summary and entry amounts use the WG + Sada = Total format.

---

## 4. PDF export – font size and bottom space

1. On the same Ledger page, click **PDF** (or Print then “Save as PDF”).
2. Check the generated document:
   - Table and body text use **smaller font** (e.g. ~9px) than before.
   - There is **extra blank space at the bottom** of the page.
   - Table and summary still show **WG + Sada = Total** for entries and totals.

**Pass:** PDF has reduced font size, bottom spacing, and correct WG/Sada formatting.

---

## 5. Data consistency (backend + DB)

1. Create a customer with Opening Balance WG = 5, Sada = 10.
2. Add one OUT entry: WG = 2, Sada = 3.
3. Open Ledger. Expect:
   - Opening: 5 + 10 = 15
   - Total OUT: 2 + 3 = 5
   - Balance (e.g. Dr): 7 + 13 = 20 (opening + out when no IN).

**Pass:** Numbers on the ledger match the stored opening balance and entry quantities.

---

## Gaps / notes

- No automated E2E test suite is run for this project; the above steps are manual.
- If the database was created before this feature, ensure **initTables()** is run once (e.g. via the API test script or a setup route) so that `migrateCrateSchema` and `migrateCrateData` execute and existing rows get backfilled (existing quantity → normal, WG = 0).
