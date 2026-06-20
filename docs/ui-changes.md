# UI Changes & Fixes Log

Running record of all UI modifications. Intended as a porting reference for the React Native mobile app.

---

## 1. Bottom Sheet z-index Fix

**Problem:** All bottom sheets/modals used `z-50`, the same as the fixed bottom tab bar. Since the tab bar is later in the DOM, it rendered on top of modal buttons (e.g. the "Create Category" save button was hidden behind the tab bar).

**Fix:** All modal overlay containers changed from `z-50` → `z-[60]`.

**Affected files:**
- `apps/web/src/pages/settings/Categories.tsx`
- `apps/web/src/pages/settings/Accounts.tsx`
- `apps/web/src/pages/app/Budget.tsx`
- `apps/web/src/pages/app/GoalDetail.tsx`
- `apps/web/src/pages/app/Transactions.tsx`
- `apps/web/src/pages/app/ImportTransactions.tsx`
- `apps/web/src/components/modals/AddTransactionModal.tsx`

**Mobile note:** In React Native, modals render in a portal above all navigation UI, so this issue doesn't apply. Ensure bottom sheets (e.g. `react-native-bottom-sheet`) are presented at a higher z-order than the tab bar.

---

## 2. Transaction Comments

**Context:** The backend `TransactionHeader` already has a `note` TEXT column. It was shown as a plain inline "Note" label. User wanted it surfaced as "Comment" with better presentation.

**Changes:**

### AddTransactionModal (`src/components/modals/AddTransactionModal.tsx`)
- Changed from always-visible plain `<input>` to a **collapsible toggle**:
  - Default state: shows `+ Add comment` link button
  - On click: expands a 3-row `<textarea>` with a "Comment" label and a "Remove" link
  - Collapsing (Remove) resets note to `''`

### Transaction Detail Sheet (`src/pages/app/Transactions.tsx` — `TxDetailSheet`)
- Removed inline `<Row label="Note" value={tx.note} />` key-value display
- Replaced with a dedicated full-width block:
  ```
  COMMENT
  ┌─────────────────────────────┐
  │ note text here, multi-line  │
  └─────────────────────────────┘
  ```
- Uses `whitespace-pre-wrap` to preserve line breaks
- Section hidden entirely when `tx.note` is null/empty

**Mobile note:** Use a collapsible `<TextInput multiline>` for the add flow. In the detail view, use a `<Text>` with `style={{ flexWrap: 'wrap' }}` inside a tinted container.

---

## 3. Import Transactions (Excel Bulk Import)

**New feature:** 3-step wizard to bulk-import past transactions from an Excel file.

**Files:**
- `apps/web/src/lib/excelImport.ts` — parse & generate logic
- `apps/web/src/pages/app/ImportTransactions.tsx` — wizard component
- `apps/web/src/App.tsx` — route `/import`
- `apps/web/src/pages/app/Transactions.tsx` — "Import" button in header

**Dependency added:** `xlsx` (SheetJS) in `apps/web/package.json`

### Step 1 — Upload
- Drag-and-drop zone + file picker (`.xlsx`, `.csv`)
- "Download Template" button generates and downloads a blank `.xlsx` with example rows
- Parses on file select; parse errors shown inline

### Excel Template columns
| Column | Required | Notes |
|--------|----------|-------|
| Date | Yes | DD/MM/YYYY, YYYY-MM-DD, or Excel serial |
| Amount | Yes | Positive number |
| Type | Yes | `Expense` or `Income` (case-insensitive prefix match) |
| Account | Yes | Matched case-insensitively to user's account names |
| Comment | No | Also accepts `note`, `description`, `memo`, `remarks` headers |

### Step 2 — Review & Categorize
- Table of parsed rows; each shows type badge, amount, date, editable comment
- Account dropdown pre-matched by name from Excel; falls back to manual select
- Category picker (same overlay as AddTransactionModal) filtered by row's type; required before submit
- Row delete button (✕)
- Submit disabled until every row has Account + Category

### Step 3 — Done
- Progress bar: calls `POST /api/v1/transactions` per row in sequence
- Failures shown per row (batch doesn't abort on single failure)
- Summary count; "View Transactions" navigates to `/transactions`

**Mobile note:** For mobile, implement file picking via `expo-document-picker` or `react-native-document-picker`. Parse with the same `xlsx` library (works in RN). Steps map well to a `<FlatList>`-based wizard with a step indicator.

---

## 4. Category Expand/Collapse Arrow Fix

**Problem:** The ▼/▲ expand arrow in category lists was a `<span>` with no click handler. Only the category name text triggered the toggle.

**Fix pattern applied everywhere:**

### Categories Settings (`src/pages/settings/Categories.tsx`)
`<span>` → `<button onClick={() => toggle(id)}>` with same handler as the name button.

### CategoryPicker overlays (AddTransactionModal + ImportTransactions)
The original code had a single full-row `<button>` that toggled expansion. Refactored to two independent elements inside a `<div>`:
- **Category name button** → always calls `onSelect(id)` (even for root categories with children)
- **Arrow button** → calls `setExpanded(toggle)` only

```
Before: <button onClick={hasKids ? expand : select}>Name ▼</button>
After:  <div><button onClick={select}>Name</button><button onClick={expand}>▼</button></div>
```

**Mobile note:** Use `TouchableOpacity` for each zone. The refactored separation (select vs expand) is the correct pattern for mobile too.

---

## 5. Multi-level Category Hierarchy

**Problem:** Category list was hardcoded to 2 levels (root → children). User wanted unlimited nesting plus an easy way to add subcategories from the list.

**Changes in `src/pages/settings/Categories.tsx`:**

### Recursive `CategoryNode` component
Replaces the old flat mapping. Renders each category and recursively renders its children when expanded:
- Indentation: `16px` per depth level (`paddingLeft = 4 + depth * 16`)
- Connector: `└─` prefix on non-root nodes
- Expand state: `Set<string>` (replaces `string | null`) — multiple nodes can be open simultaneously

### `+ Sub` button on every row
Every category row (any depth) has a `+ Sub` button that opens `CreateCategorySheet` with that category pre-selected as the parent.

### `CreateCategorySheet` enhancements
- Accepts `initialParent: CategoryResponse | null` prop
- When `initialParent` is set: title shows `Add under "Food & Dining"`, type toggle is disabled (locked to parent's type), parent dropdown is disabled
- Parent dropdown built with `buildFlatOptions()` — a recursive flatten that shows the full hierarchy with `└─` depth indicators for all levels (not just roots)

**Mobile note:** Use a recursive `FlatList` or a recursive render function. For the parent picker, a modal with indented rows works better than a `Picker` component on mobile.

---

## 6. Modal Close Buttons + Esc Key

**Problem:** Several bottom sheets had no explicit close button (only backdrop tap to close). No modal closed on Escape key.

**Shared hook:** `src/lib/useEscKey.ts`
```ts
export function useEscKey(onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
}
```

Called at the top of every modal component.

### Modals updated — ✕ button added + Esc wired:

| Modal | File | ✕ added | Esc added |
|-------|------|---------|-----------|
| CreateCategorySheet | `settings/Categories.tsx` | Yes | Yes |
| RenameSheet | `settings/Categories.tsx` | Yes (extracted to component) | Yes |
| AddAccountSheet | `settings/Accounts.tsx` | Yes | Yes |
| CreateGoalSheet | `app/Budget.tsx` | Yes | Yes |
| TxDetailSheet | `app/Transactions.tsx` | Yes (top-right of handle bar) | Yes |
| AddTransactionModal | `modals/AddTransactionModal.tsx` | Already had | Yes |
| CategoryPicker (AddTransactionModal) | `modals/AddTransactionModal.tsx` | Already had | Yes |
| CategoryPicker (ImportTransactions) | `app/ImportTransactions.tsx` | Already had | Yes |
| Category picker (GoalDetail) | `app/GoalDetail.tsx` | Already had | Yes (conditional on `showCatPicker`) |

### ✕ button placement pattern
- Sheets with a title: `flex items-center justify-between` row with title + ✕
- Sheets with a centered amount (TxDetailSheet): `relative` wrapper around the handle bar, ✕ as `absolute top-0 right-0`

**Mobile note:** `useEscKey` is web-only (hardware back button on Android is the equivalent). On React Native, use the `BackHandler` API for Android back-press and add a visible ✕ `TouchableOpacity` in the sheet header on both platforms. React Navigation bottom sheets handle back-press automatically when using `@gorhom/bottom-sheet` with `enablePanDownToClose`.

---

## 7. Line Item Delete Button (AddTransactionModal)

**Problem:** The ✕ button to remove a line item was only present in the card header (tiny text "Item 1 ✕") and not visible enough to use.

**Fix:** Restructured line item cards to place a dedicated `w-8 h-8` `bg-expense/20 text-expense` button inline with the category picker field. The ✕ is always visible on every line item.

```
Before: [Item 1                              ✕]
         [category picker            ]
         ...

After:  [category picker        ] [✕]
         ...
```

When removing the last line item, a fresh empty line replaces it (list never goes to 0).

**Mobile note:** Place a red/destructive `TouchableOpacity` (circle with ✕ icon) at the trailing end of the category row.

---

## 8. AddTransactionModal Save Fixes

Three bugs fixed that caused a saved transaction to not appear in the list:

### a) transactionDate timezone
- **Before:** `new Date(date).toISOString()` — midnight UTC, which is the previous day in IST (e.g. 2026-06-15 → 2026-06-14T18:30:00Z, falls in previous month's query window)
- **After:** `new Date(\`${date}T12:00:00\`).toISOString()` — local noon, always within the selected calendar day in any timezone

### b) Note whitespace
- **Before:** Clicking "+ Add comment" set `note = ' '` (a space) to expand the textarea; if the user never typed anything and saved, the backend received `note: " "` (not null). This could cause issues.
- **After:** `note.trim()` before sending; only included in the request body when non-empty.

### c) Category validation
- **Before:** Save was enabled even when no category was selected on a line item, causing a backend 422.
- **After:** `allCategorised = type === 'TRANSFER' || lineItems.every(li => li.categoryId)` — Save button is disabled and a yellow hint is shown until every line item has a category.

**Mobile note:** All three fixes apply identically to the mobile add-transaction flow.

---

## 9. Transactions Page Error State

**Problem:** When `/api/v1/reports/ledger` returns a 500, TanStack Query sets `isError = true` and `data = undefined`. The page rendered nothing — no transactions, no empty-state message, no error indication.

**Fix:** Destructure `isError` and `refetch` from `useQuery`. When `isError` is true, show a full-page error state with a Retry button:

```tsx
{isError && (
  <div className="text-center py-20">
    <p className="text-4xl mb-3">⚠️</p>
    <p className="text-gray-400 mb-4">Could not load transactions.</p>
    <button onClick={() => refetch()} className="btn-ghost text-sm">Retry</button>
  </div>
)}
```

**Backend note:** `ReportingService.getLedgerReport` now catches `RestClientException` and logs `[month, year, page, size, exceptionClass, message]` before re-throwing, so the actual failure mode is visible in the reporting-service log.

**Mobile note:** Show a similar error/retry state when the API call fails.
