# 🚀 Quick Start - New Features Guide

## Pro Features You Can Use Now

### 1. Batch Scraping ⚡

**Perfect for:** Scraping multiple dealer listings at once

```
1. Open http://localhost:3000
2. Go to "Scrape" tab
3. Select "Batch Multiple URLs" from Mode dropdown
4. Open 5-10 car listings in browser tabs
5. Copy curl commands from each (DevTools → Copy as cURL)
6. Paste all into the text area (one per line)
7. Add source name (e.g., "Local Dealership Group")
8. Click "Scrape & Add to Database"
9. Watch the progress bar fill
10. See results summary (success/failure per URL)
```

**Time saved:** What used to take 10 minutes now takes 30 seconds!

---

### 2. Test API 🧪

**Perfect for:** Debugging extraction before committing data

```
1. Go to "Test API" tab
2. Paste a curl command
3. Click "Test Extract"
4. See what will be extracted:
   - Quality score (0-100%)
   - All data fields
   - Any quality flags (warnings/errors)
5. Fix issues if needed
6. When satisfied, go to Scrape tab and add for real
```

**Why use it:**
- No bad data in your database
- See quality flags before saving
- Debug extraction issues instantly
- Compare different sources

---

### 3. Quality Scores 📊

**What they mean:**

| Score | Quality | Description |
|-------|---------|-------------|
| 80-100% | 🟢 High | Complete data: VIN, price, specs, details, images, dealer |
| 50-79% | 🟡 Medium | Core data present, some details missing |
| 0-49% | 🔴 Low | Minimal data, missing core fields |

**How to use:**
1. Go to Inventory tab
2. Filter by quality: "High (80%+)"
3. Export only high-quality records
4. Send to your main platform with confidence

---

### 4. Duplicate Detection 🔄

**How it works:**
- Automatically detects duplicate VINs
- Shows "DUP" badge on duplicates
- Check duplicates: Click "Check for Duplicate VINs"
- Cleanup: Click "Auto-Cleanup Duplicates"

**Cleanup behavior:**
- Keeps the newest entry (latest scrape)
- Deletes all older entries with same VIN
- Shows summary of deletions

**When to use:**
- After bulk scraping from same source
- When re-scraping old listings
- To keep database clean

---

### 5. Analytics Dashboard 📈

**What you see:**
- Total records
- Records with VIN/price/mileage
- Average price and mileage
- Data sources breakdown (with counts)
- Duplicate VINs summary

**How to use:**
1. Go to "Analytics" tab
2. See overall data health
3. Check which sources have most data
4. Identify quality issues
5. Track progress over time

---

### 6. Quality Flags 🚩

**Color-coded warnings:**

🔴 **Error** (Fix before using)
- Invalid VIN length
- Missing make or model

⚠️ **Warning** (Review before using)
- Missing VIN
- Missing/Unusual price
- Older car missing mileage
- Unusual year

ℹ️ **Info** (FYI)
- No images
- Minimal description

**Where to see them:**
- Test API tab: See flags before saving
- Inventory detail: Click any car to see flags
- Quality score badge: Hover for quick check

---

## Typical Workflow

### Scenario 1: New Source (Dealer Website)

```
1. Go to Test API tab
2. Scrape a few sample listings
3. Check quality scores and flags
4. If quality is good:
   a. Go to Scrape tab
   b. Use Batch mode
   c. Scrape all listings
5. Go to Analytics tab
6. Check data quality stats
7. Go to Inventory tab
8. Filter by quality (80%+)
9. Export to CSV/JSON
10. Import to your main platform
```

### Scenario 2: Daily Updates

```
1. Check Analytics tab
2. Review data quality trends
3. Click "Check for Duplicate VINs"
4. Use Test API for any new sources
5. Batch scrape new listings
6. Auto-cleanup duplicates
7. Export only high-quality new records
```

### Scenario 3: Data Cleanup

```
1. Go to Inventory tab
2. Filter by quality: "Low (<50%)"
3. Review low-quality records
4. Delete junk data (bulk select - coming soon)
5. Check duplicates
6. Auto-cleanup
7. Verify with Analytics tab
```

---

## Keyboard Shortcuts (Planned)

Coming soon:
- `Ctrl+F` - Focus search
- `Ctrl+E` - Export
- `Ctrl+N` - New scrape
- `Ctrl+T` - Test API

---

## Pro Tips

1. **Start with Test API**: Always test new sources before bulk scraping
2. **Watch quality scores**: Aim for 80%+ quality for main platform
3. **Use batch mode**: 5 concurrent URLs = 5x faster
4. **Check duplicates often**: Keep database clean
5. **Export by quality**: Only export high-quality records
6. **Review analytics daily**: Track data quality trends

---

## Export Options

### CSV Export
- Best for: Excel, Google Sheets
- Format: Standard CSV with all fields
- Use: Data analysis, reporting

### JSON Export
- Best for: API integration, main platform
- Format: Structured JSON array
- Use: Direct import to your platform

---

## Performance Tips

- **Batch size**: 10-20 URLs is optimal
- **Sources**: Try to group by source for batch scraping
- **Filters**: Use filters before large exports
- **Duplicates**: Cleanup regularly to keep DB fast

---

## Troubleshooting

### Scraping fails
- Use Test API to debug
- Check if site blocked
- Try different user agent in curl

### Low quality scores
- Missing VIN: Check if site has VIN
- No images: Image URLs might be lazy-loaded
- Missing price: Price might be in a modal

### Too many duplicates
- Same VIN from different sources (legit)
- Re-scraped listings (auto-cleanup fixes this)
- Bad data (delete and re-scrape)

---

**Need help?** Check the full docs:
- `ALL_NIGHT_FEATURES.md` - Detailed feature breakdown
- `README.md` - Original documentation
- `START.md` - Quick start guide

---

Built by Jarvis 📺
*Making car scraping easy since 2026*
