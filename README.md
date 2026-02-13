# Car Scraper Dashboard

Dev tool for building car inventory databases from curl commands.

## Features

- **Paste any curl command** from browser DevTools → extracts car data automatically
- **Maximal data extraction**: VIN, price, mileage, specs, features, images, dealer info
- **Smart parsing**: Detects single car pages vs search results
- **SQLite database**: Persistent storage for all scraped vehicles
- **Dashboard UI**: Search, filter, view details, export CSV
- **JSON-LD support**: Extracts structured data when available

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open dashboard
# Navigate to http://localhost:3000
```

## Usage

1. **Get a curl command**:
   - Open Chrome DevTools (F12) on any car listing page
   - Right-click the request → Copy → Copy as cURL
   - Paste it into the dashboard

2. **Add a source name** (optional):
   - e.g., "Cars.com", "AutoTrader", "Local Dealership"

3. **Click "Scrape & Add"**
   - The tool fetches the page and extracts all car data
   - Data is saved to SQLite database

4. **View & Export**:
   - Click any row to see full details
   - Search by make, model, or VIN
   - Export to CSV for your main platform

## What Gets Extracted

### Core Data
- VIN (validated to 17 characters)
- Year, Make, Model, Trim
- Price
- Mileage
- Stock Number

### Vehicle Specs
- Body Type
- Transmission
- Drivetrain
- Fuel Type
- Engine (including cylinders, displacement, horsepower)
- MPG (City/Highway)

### Colors
- Exterior Color
- Interior Color

### Features & Details
- Feature list (parsed from features section)
- Full description
- Multiple images (extracts all image URLs)

### Dealer Info
- Dealer Name
- Address
- Phone
- Email

### Metadata
- Source (name you provide)
- Original URL
- Scrape timestamp
- Raw data (HTML/JSON for debugging)

## Database Schema

The tool uses SQLite (`cars.db`) with the following columns:
- All extracted fields above
- `features` (JSON array)
- `images` (JSON array)
- `raw_data` (JSON object)
- `scraped_at` (timestamp)

## Tips

- **Single car pages (VDP)**: Extracts maximum detail
- **Search results pages (SRP)**: Extracts multiple cars with basic info
- **JSON-LD pages**: Uses structured data when available (most accurate)
- **Headers are preserved**: The tool extracts `-H` flags from your curl command
- **User-Agent is set automatically** if not provided

## Example Curl Command

```
curl 'https://www.cars.com/vehicledetail/detail/12345/' \
  -H 'User-Agent: Mozilla/5.0...' \
  -H 'Cookie: session=xyz...'
```

## API Endpoints

- `GET /api/inventory` - Get all vehicles
- `POST /api/scrape` - Scrape from curl command
- `DELETE /api/inventory/:id` - Delete single vehicle
- `DELETE /api/inventory` - Clear all vehicles

## Next Steps for Main Platform

This tool gives you:
- ✅ Clean, structured car data
- ✅ Valid VINs
- ✅ Normalized pricing
- ✅ Consistent database schema
- ✅ CSV export for import

Ready to plug into your AI car dealership platform!
