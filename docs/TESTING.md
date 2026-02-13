# Testing Guide

This guide covers comprehensive testing procedures for the Car Dealership Scraper Platform.

## Localhost Testing Checklist

### ✅ Pre-Flight Checks

```bash
# 1. Verify Node.js is installed
node --version

# 2. Verify npm is available
npm --version

# 3. Check dependencies are installed
ls node_modules/

# 4. Verify database exists
ls -la cars.db
```

---

## Test Suite A: Basic Functionality

### Test A1: Server Startup
**Objective:** Verify server starts without errors

**Steps:**
```bash
npm start
```

**Expected Output:**
```
Car Scraper Dashboard running at http://localhost:3000
Database initialized
```

**Pass Criteria:**
- Server starts successfully
- No error messages in console
- Port 3000 is listening

---

### Test A2: Dashboard Loading
**Objective:** Verify UI loads and displays data

**Steps:**
1. Open browser to http://localhost:3000
2. Verify page loads completely
3. Check for sample data (59 vehicles)

**Expected Output:**
- Dashboard displays with vehicle table
- Sample vehicles are visible
- Filters and search bar are present

**Pass Criteria:**
- Dashboard loads in <3 seconds
- Vehicle count shows "59 vehicles"
- No JavaScript errors in browser console

---

## Test Suite B: Data Quality

### Test B1: Quality Score Display
**Objective:** Verify quality scoring is working

**Steps:**
1. Scroll to "Quality Distribution" section
2. Verify bar chart appears
3. Check quality score numbers

**Expected Output:**
- Bar chart shows distribution
- Quality scores range 0-100
- Percentages add up to 100%

**Pass Criteria:**
- Chart renders correctly
- No "N/A" or empty values
- Color coding matches quality levels

---

### Test B2: Quality Flagging
**Objective:** Verify vehicles with issues are flagged

**Steps:**
1. Click "Show Quality Issues" button
2. Review flagged vehicles
3. Check flag reasons

**Expected Output:**
- List of vehicles with low quality scores
- Flag reasons displayed (missing VIN, etc.)

**Pass Criteria:**
- Only vehicles with issues shown
- Flag reasons are clear
- Clicking vehicle shows details

---

## Test Suite C: Filtering & Search

### Test C1: Make Filter
**Objective:** Verify filtering by vehicle make

**Steps:**
1. Click make filter dropdown
2. Select "Toyota"
3. Verify results update

**Expected Output:**
- Only Toyota vehicles displayed
- Count updates (e.g., "12 vehicles")

**Pass Criteria:**
- Filter works correctly
- Results update instantly
- Count is accurate

---

### Test C2: Price Range Filter
**Objective:** Verify filtering by price range

**Steps:**
1. Enter min price: 15000
2. Enter max price: 30000
3. Verify results update

**Expected Output:**
- Only vehicles in price range shown
- Sorted by default

**Pass Criteria:**
- Price filter works correctly
- Boundary values included
- No vehicles outside range

---

### Test C3: Year Filter
**Objective:** Verify filtering by model year

**Steps:**
1. Enter min year: 2018
2. Enter max year: 2023
3. Verify results update

**Expected Output:**
- Only vehicles from 2018-2023 shown

**Pass Criteria:**
- Year filter works correctly
- Results accurate
- No outdated vehicles

---

### Test C4: Quality Filter
**Objective:** Verify filtering by quality score

**Steps:**
1. Enter min quality: 80
2. Verify results update
3. Check if vehicle count decreases

**Expected Output:**
- Only high-quality vehicles shown
- Quality indicator visible

**Pass Criteria:**
- Quality filter works
- Score threshold respected
- Only quality ≥80 displayed

---

### Test C5: Text Search
**Objective:** Verify free-text search

**Steps:**
1. Enter "SUV" in search box
2. Verify results update
3. Try "Toyota Camry"

**Expected Output:**
- Results match search terms
- Case-insensitive search works

**Pass Criteria:**
- Search is fast (<1 second)
- Results are relevant
- Multiple terms work together

---

## Test Suite D: API Endpoints

### Test D1: Get All Vehicles
**Objective:** Verify API returns inventory

**Steps:**
```bash
curl http://localhost:3000/api/inventory
```

**Expected Output:**
- JSON array of vehicles
- Count: 59 vehicles
- All fields present

**Pass Criteria:**
- Response is valid JSON
- No errors
- Data matches dashboard

---

### Test D2: Get Statistics
**Objective:** Verify stats endpoint

**Steps:**
```bash
curl http://localhost:3000/api/stats
```

**Expected Output:**
```json
{
  "total": 59,
  "averagePrice": 28450.55,
  "qualityDistribution": {...}
}
```

**Pass Criteria:**
- All stats present
- Numbers are reasonable
- Quality distribution sums to 100%

---

### Test D3: Filtered API Calls
**Objective:** Verify API filtering

**Steps:**
```bash
# Filter by make
curl "http://localhost:3000/api/inventory?make=Toyota"

# Filter by price
curl "http://localhost:3000/api/inventory?minPrice=10000&maxPrice=30000"

# Filter by year
curl "http://localhost:3000/api/inventory?minYear=2015"
```

**Expected Output:**
- Filtered results
- Count matches filters
- No vehicles outside criteria

**Pass Criteria:**
- All filters work
- Results are accurate
- No errors in response

---

## Test Suite E: Data Operations

### Test E1: View Vehicle Details
**Objective:** Verify detail view works

**Steps:**
1. Click any vehicle in table
2. Verify modal/panel opens
3. Check all fields display

**Expected Output:**
- Detailed view appears
- All fields populated
- Images visible

**Pass Criteria:**
- Modal opens smoothly
- No missing fields
- Images load correctly

---

### Test E2: Delete Vehicle
**Objective:** Verify delete functionality

**Steps:**
1. Click delete button on a vehicle
2. Confirm deletion
3. Verify vehicle is removed

**Expected Output:**
- Confirmation prompt appears
- Vehicle removed from list
- Count decreases by 1

**Pass Criteria:**
- Delete works correctly
- Count updates
- No errors

---

## Test Suite F: Scraping (Optional)

### Test F1: Scrape Single Vehicle
**Objective:** Verify scraping works

**Steps:**
1. Get curl command from car listing
2. Paste into dashboard scrape box
3. Enter source name
4. Click "Scrape & Add"

**Expected Output:**
- Success message appears
- New vehicle in inventory
- Data is complete

**Pass Criteria:**
- Scraping completes successfully
- VIN is valid
- Quality score calculated

---

### Test F2: Handle Invalid URL
**Objective:** Verify error handling

**Steps:**
1. Paste invalid URL
2. Attempt to scrape

**Expected Output:**
- Error message appears
- No vehicle added

**Pass Criteria:**
- Clear error message
- No crash
- Server remains stable

---

## Test Suite G: Edge Cases

### Test G1: Empty Database
**Objective:** Verify behavior with no data

**Steps:**
```bash
# Stop server (Ctrl+C)
rm cars.db
npm start
```

**Expected Output:**
- Server starts successfully
- Dashboard shows "No vehicles"
- Auto-loads sample data

**Pass Criteria:**
- No crashes
- Empty state handled gracefully
- Sample data loads

---

### Test G2: Large Dataset
**Objective:** Verify performance with many vehicles

**Steps:**
```bash
# Generate 500 fake vehicles
node scripts/generate_fake_data.js 500

# Restart server
```

**Expected Output:**
- Dashboard loads in <5 seconds
- Filtering still fast
- No lag in UI

**Pass Criteria:**
- Performance acceptable
- No memory leaks
- UI remains responsive

---

## Regression Testing

### Before Each Test Run:
```bash
# Reset to clean state
rm cars.db
node scripts/load_placeholder_data.js
npm start
```

### After Each Test Run:
1. Check server console for errors
2. Check browser console for errors
3. Verify database integrity
4. Document any issues

---

## Performance Benchmarks

### Expected Performance:
- **Dashboard load:** <3 seconds
- **Filter update:** <500ms
- **Search response:** <1 second
- **API response:** <200ms
- **Scrape single vehicle:** <5 seconds

### If Performance Degraded:
1. Check database size
2. Verify indexing
3. Review queries
4. Consider pagination

---

## Common Issues & Solutions

### Issue: Dashboard won't load
**Solution:**
```bash
# Clear database
rm cars.db

# Restart server
npm start
```

---

### Issue: Filters not working
**Solution:**
1. Refresh browser
2. Check console for errors
3. Verify server is running

---

### Issue: API returns errors
**Solution:**
```bash
# Check server logs
tail -f server.log

# Verify database
sqlite3 cars.db ".schema"
```

---

### Issue: Scraping fails
**Solution:**
1. Verify curl command is valid
2. Check internet connection
3. Try different website

---

## Test Report Template

```
Date: ___________
Tester: ___________
Environment: Localhost

Test Suite Results:
A. Basic Functionality: ___/3 passed
B. Data Quality: ___/2 passed
C. Filtering & Search: ___/5 passed
D. API Endpoints: ___/3 passed
E. Data Operations: ___/2 passed
F. Scraping: ___/2 passed
G. Edge Cases: ___/2 passed

Overall: ___/19 tests passed

Notes:
___________________
___________________
___________________

Issues Found:
1. ___________________
2. ___________________
3. ___________________
```

---

## Next Steps After Testing

1. ✅ All tests pass → Deploy to production
2. ⚠️ Some tests fail → Debug and fix
3. ❌ Critical failures → Review with team

**Ready for Production Checklist:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Performance benchmarks met
- [ ] No console errors
- [ ] Documentation updated
- [ ] Database backed up
- [ ] Secrets secured
