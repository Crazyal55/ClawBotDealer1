# Car Scraper - Polish Wishlist

## Goal
Make this a solid, polished data manipulation tool for Alex to work with inventory data before building Parts 2 & 3.

---

## Data Manipulation Features (Priority)

### 📋 Bulk Operations
- [ ] Select multiple cars (checkboxes in table)
- [ ] Bulk delete selected
- [ ] Bulk export selected
- [ ] Select all / deselect all
- [ ] Bulk edit (update fields on multiple cars)

### 🔍 Advanced Filtering
- [ ] Year range slider
- [ ] Price range slider
- [ ] Mileage range slider
- [ ] Make dropdown (auto-populated from data)
- [ ] Model dropdown (cascades from make)
- [ ] "Has VIN" checkbox
- [ ] "With Images" checkbox
- [ ] "High Quality Only" (80%+)
- [ ] "Has Dealer Info" checkbox

### ✏️ Inline Editing
- [ ] Click to edit cells in inventory table
- [ ] Edit VIN, price, mileage directly
- [ ] Save on blur or Enter
- [ ] Undo support

### 🔄 Data Transformation
- [ ] Normalize prices (clean formatting)
- [ ] Fix VINs (remove spaces, uppercase)
- [ ] Fill missing years from VIN (decoder)
- [ ] Batch update source names
- [ ] Bulk add tags/categories

### 📊 Pivot/Group Views
- [ ] Group by Make → see all models
- [ ] Group by Source → see inventory by dealer
- [ ] Group by Year → see distribution
- [ ] Count summaries per group

### 📤 Enhanced Export
- [ ] Custom field selection (choose which columns)
- [ ] Export filtered data only
- [ ] Export to Excel (.xlsx)
- [ ] Export to Google Sheets (direct link)
- [ ] Save export templates (reusable configs)

---

## UI/UX Polish

### 🎨 Professional Dashboard
- [ ] Logo/branding area
- [ ] Better color scheme (refine dark theme)
- [ ] Consistent spacing and typography
- [ ] Loading skeletons (better UX while loading)
- [ ] Toast notifications (success/error messages)
- [ ] Confirmation modals (delete, clear all)
- [ ] Keyboard navigation (Tab, Enter, Esc)

### 📱 Responsive Improvements
- [ ] Better mobile table view
- [ ] Collapsible panels on mobile
- [ ] Touch-friendly buttons
- [ ] Swipe actions for mobile

### 🖱️ Power User Features
- [ ] Right-click context menu on rows
- [ ] Double-click to edit
- [ ] Column sorting (click headers)
- [ ] Column resizing (drag borders)
- [ ] Column show/hide (choose columns)
- [ ] Persist column state (remember layout)

---

## Scraping Improvements

### 🚀 Enhanced Scraping
- [ ] Save curl commands to library (reusable)
- [ ] Named scraping profiles (e.g., "Cars.com Template")
- [ ] Scheduled scraping (set up cron jobs from UI)
- [ ] Scraping history log (when/what/source)
- [ ] Re-scrape failed URLs
- [ ] Auto-retry on failure (with backoff)

### 📡 Source Management
- [ ] Source profiles (name + domain + notes)
- [ ] Source health tracking (success rate, avg quality)
- [ ] Test source button (quick quality check)
- [ ] Disable/enable sources
- [ ] Source tags (e.g., "high-quality", "unreliable")

### 🧪 Testing
- [ ] Test suite runner (run all saved tests)
- [ ] Regression tests (compare new vs old extraction)
- [ ] Expected results validator (define what to expect)
- [ ] Test history log (track over time)
- [ ] Export test reports (PDF/JSON)

---

## Data Quality Tools

### 🎯 Quality Management
- [ ] Quality trend chart (improving/degrading)
- [ ] Quality by source (which dealers give best data?)
- [ ] Manual quality override (adjust scores)
- [ ] Bulk quality recalculation (re-score all)
- [ ] Quality filters saved as presets

### 🚨 Data Cleaning
- [ ] Find and fix invalid VINs
- [ ] Fix price formatting ($1,000 vs 1000)
- [ ] Remove duplicates wizard (advanced options)
- [ ] Merge duplicate entries (combine best data)
- [ ] Fill missing data from VIN decoder

---

## Analytics & Reporting

### 📈 Better Analytics
- [ ] Price distribution histogram (Chart.js)
- [ ] Year distribution bar chart
- [ ] Make/model pie chart
- [ ] Quality score trend line
- [ ] Scraping performance over time

### 📊 Reports
- [ ] Data quality report (scorecard)
- [ ] Source performance report
- [ ] Scraping summary report
- [ ] Export all reports as PDF

---

## Technical Polish

### ⚡ Performance
- [ ] Lazy load images (only load when visible)
- [ ] Virtual scrolling for huge tables (1000+ cars)
- [ ] Pagination option (instead of infinite scroll)
- [ ] Debounced search input (don't search on every keystroke)

### 🗄️ Database
- [ ] Database export/backup (download .db file)
- [ ] Database restore from backup
- [ ] Database reset (clear and reinit schema)
- [ ] Vacuum/optimize database button

### 🔒 Security
- [ ] Simple password protection (optional)
- [ ] Rate limiting (prevent abuse)
- [ ] Input sanitization (prevent XSS)
- [ ] CORS configuration

---

## Developer Experience

### 🛠️ Dev Tools
- [ ] API endpoint tester (try endpoints from UI)
- [ ] Request/response viewer
- [ ] Database query builder (run SQL from UI)
- [ ] Database inspector (view all tables/rows)
- [ ] Raw data viewer (see JSON-LD, HTML)

### 📝 Documentation
- [ ] Inline help tooltips
- [ ] Getting started wizard
- [ ] Contextual help (click "?" for help)
- [ ] Keyboard shortcut reference

---

## Quick Wins (Tonight/This Week)

### Must Have
- [ ] Select all / bulk delete
- [ ] Year/price/mileage filters
- [ ] Sort columns
- [ ] Better notifications (toasts)
- [ ] Confirm modals

### Nice to Have
- [ ] Column show/hide
- [ ] Persist table state
- [ ] Bulk edit
- [ ] Save filter presets
- [ ] Database backup/restore

---

## Priority Order

1. **Bulk Operations** - Select, delete, export selected
2. **Advanced Filters** - Year/price/mileage sliders
3. **Sorting** - Click column headers
4. **Column Management** - Show/hide, reorder
5. **Bulk Edit** - Update multiple records
6. **Data Cleaning** - Fix VINs, prices, formatting
7. **Charts** - Price/year distribution
8. **Test Runner** - Saved test suite

---

**Focus**: Make it EASY to work with and manipulate data.
