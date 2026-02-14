# JavaScript Functions Documentation

**Date**: 2025-02-13
**File**: `public/index.html` (inline script)
**Status**: ✅ Documented

---

## **Navigation Functions**

### `selectTab(tabName, element)`
Switches between different page sections in the application.

**Parameters**:
- `tabName` (string): The name of the tab to activate (e.g., 'dashboard', 'scraper', 'inventory')
- `element` (HTMLElement): The clicked navigation element

**Behavior**:
- Removes 'active' class from all navigation items
- Adds 'active' class to the clicked element
- Shows the corresponding page section
- Hides all other page sections
- Closes mobile menu (if open)
- Loads dealership data if 'dealership' tab is selected

**Usage Example**:
```html
<div class="nav-item" onclick="selectTab('dashboard', this)">Dashboard</div>
```

---

## **Database Functions**

### `filterDatabaseTable(searchValue)`
Filters the database vehicles table based on search input.

**Parameters**:
- `searchValue` (string): The search term to filter by

**Behavior**:
- Converts search value to lowercase
- Searches across all table cells
- Shows rows that match the search term
- Hides rows that don't match

**Usage Example**:
```html
<input type="text" oninput="filterDatabaseTable(this.value)" placeholder="Search vehicles...">
```

### `applyDatabaseFieldVisibility()`
Shows or hides table columns based on checkbox selections.

**Behavior**:
- Reads all checkboxes in the field picker
- Shows columns for checked fields
- Hides columns for unchecked fields

### `initDatabaseFieldPicker()`
Initializes the database field picker by adding change event listeners to checkboxes.

**Behavior**:
- Attaches `change` event listener to each checkbox
- Calls `applyDatabaseFieldVisibility()` on initialization

---

## **Dealership Functions**

### `parseDealershipMetric(row, field)`
Extracts and parses a numeric metric from a table row's data attribute.

**Parameters**:
- `row` (HTMLElement): The table row element
- `field` (string): The metric field name (e.g., 'vehicle_count', 'avg_quality')

**Returns**: Number - The parsed numeric value, or 0 if invalid

### `formatCurrency(value)`
Formats a number as a currency string.

**Parameters**:
- `value` (number): The numeric value to format

**Returns**: String - Formatted currency (e.g., "$36,500")

### `safePercent(value)`
Formats a number as a percentage, clamped between 0-100.

**Parameters**:
- `value` (number): The numeric value to format

**Returns**: String - Percentage (e.g., "87%")

### `populateSelectOptions(selectId, values, placeholder)`
Populates a select dropdown with options.

**Parameters**:
- `selectId` (string): The ID of the select element
- `values` (Array<string>): Array of option values
- `placeholder` (string): Text for the default empty option

**Behavior**:
- Clears existing options
- Adds placeholder option as first option
- Adds option for each value in array
- Attempts to restore previously selected value

### `loadDealershipOverview()`
Loads dealership data from the API and populates the dealership table.

**Behavior**:
- Fetches data from `/api/dealerships/overview`
- Populates table rows with dealership data
- Updates business and location filter dropdowns
- Handles API errors gracefully (keeps static data)

**API Endpoint**: `GET /api/dealerships/overview`
**Response Shape**:
```json
{
  "success": true,
  "businesses": [{ "id": 1, "name": "Summit Automotive Group" }],
  "locations": [{ "dealer_id": 1, "city": "Denver", "vehicle_count": 22 }]
}
```

### `applyDealershipFilters()`
Filters and sorts the dealership table based on selected criteria.

**Behavior**:
- Filters by business name (if selected)
- Filters by location name (if selected)
- Sorts by selected metric field (vehicle_count, avg_quality, avg_price)
- Shows/hides table rows based on filter match

---

## **Chat Simulator Functions**

### `addChatMessage(role, text)`
Adds a message to the chat simulator log.

**Parameters**:
- `role` (string): Either 'user' or 'bot'
- `text` (string): The message content

**Behavior**:
- Creates message element with appropriate styling
- Appends to chat log
- Auto-scrolls to bottom

### `getChatSimulatorResponse(message)`
Generates a bot response based on the user's message.

**Parameters**:
- `message` (string): The user's message text

**Returns**: String - The bot's response

**Behavior**:
- Checks message for keywords (awd, under, suv, test drive, etc.)
- Returns contextual response based on current business/location
- Defaults to generic help message if no keywords matched

### `sendChatSimulatorMessage()`
Sends a user message in the chat simulator.

**Behavior**:
- Gets text from input field
- Adds user message to chat log
- Generates and displays bot response after 220ms delay
- Clears input field

### `simulateLeadHandoff()`
Simulates a lead handoff to the dealership sales queue.

**Behavior**:
- Adds bot message indicating lead was created
- Uses currently selected business and location

### `resetChatSimulator()`
Clears the chat log and displays welcome message.

**Behavior**:
- Clears all messages from chat log
- Clears input field
- Adds welcome/instructions message

---

## **Scraper Functions**

### `extractUrlFromCurl(curlCommand)`
Extracts the target URL from a curl command string.

**Parameters**:
- `curlCommand` (string): The curl command to parse

**Returns**: String - The extracted URL, or empty string if not found

**Regex Pattern**: `/curl\s+(?:-[^\s]+\s+)*['"]?(https?:\/\/[^\s'"]+)['"]?/i`

### `normalizeUrl(url)`
Normalizes a URL by ensuring it has a protocol.

**Parameters**:
- `url` (string): The URL to normalize

**Returns**: String - Normalized URL with https:// prefix

**Behavior**:
- Returns empty string if URL is empty/whitespace
- Returns URL as-is if it already has a protocol
- Prepends "https://" if protocol is missing

### `updateScraperPreview()`
Updates the scraper URL preview iframe.

**Behavior**:
- Gets URL from explicit URL input field
- Extracts URL from curl command if explicit URL is empty
- Updates iframe src with resolved URL
- Updates preview link href
- Updates status text with current target
- Handles empty URL case

---

## **Mobile Menu Functions**

### `toggleMobileMenu()`
Toggles the mobile navigation menu open/closed.

**Behavior**:
- Toggles 'mobile-open' class on sidebar
- Toggles 'active' class on overlay
- Enables slide-in animation on mobile

### `closeMobileMenu()`
Closes the mobile navigation menu.

**Behavior**:
- Removes 'mobile-open' class from sidebar
- Removes 'active' class from overlay
- Called when clicking overlay or selecting a tab

---

## **Initialization**

### `DOMContentLoaded` Event Listener
Runs when the page finishes loading.

**Calls**:
- `initDatabaseFieldPicker()` - Setup field checkboxes
- `loadDealershipOverview()` - Load dealership data
- `applyDealershipFilters()` - Apply initial filters
- `resetChatSimulator()` - Initialize chat with welcome message

---

## **Utility Functions Summary**

| Function | Purpose | Returns |
|----------|---------|---------|
| `parseDealershipMetric` | Extract numeric data from table row | Number |
| `formatCurrency` | Format number as USD currency | String |
| `safePercent` | Format and clamp percentage | String |
| `populateSelectOptions` | Populate dropdown with options | void |
| `extractUrlFromCurl` | Parse URL from curl command | String |
| `normalizeUrl` | Ensure URL has protocol | String |

---

## **Event Handlers Summary**

| Event | Handler | Purpose |
|-------|----------|---------|
| `onclick` (nav items) | `selectTab()` | Navigate between pages |
| `oninput` (search) | `filterDatabaseTable()` | Filter table rows |
| `onchange` (checkboxes) | `applyDatabaseFieldVisibility()` | Toggle columns |
| `onchange` (filters) | `applyDealershipFilters()` | Filter/sort table |
| `onclick` (menu toggle) | `toggleMobileMenu()` | Open/close mobile menu |
| `onclick` (overlay) | `closeMobileMenu()` | Close mobile menu |
| `onkeydown` (chat input) | `sendChatSimulatorMessage()` | Send on Enter key |
| `oninput` (scraper) | `updateScraperPreview()` | Update URL preview |

---

## **Dependencies**

**None** - All functions are vanilla JavaScript with no external library dependencies.

---

## **Browser Compatibility**

- Modern ES6+ JavaScript (arrow functions, template literals, const/let)
- Requires DOM API (querySelector, querySelectorAll, addEventListener)
- Uses modern CSS features (Grid, Flexbox, CSS Variables)
- Mobile responsive with media queries

---

## **Notes**

- All functions are defined inline in `public/index.html`
- No async/await error handling (assumes modern browser support)
- API calls are not authenticated (uses public endpoints)
- Chat simulator uses static responses (not connected to backend)
- Dealership data can fall back to static HTML if API is unavailable
