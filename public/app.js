// Mobile Menu Toggle
        function toggleMobileMenu() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            if (sidebar && overlay) {
                sidebar.classList.toggle('mobile-open');
                overlay.classList.toggle('active');
            }
        }

        function closeMobileMenu() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            if (sidebar && overlay) {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('active');
            }
        }

        function selectTab(tabName, element) {
            document.querySelectorAll('.nav-item').forEach((item) => {
                item.classList.remove('active');
                const indicator = item.querySelector('.nav-indicator');
                if (indicator) indicator.classList.remove('active');
            });

            if (element) {
                element.classList.add('active');
                const indicator = element.querySelector('.nav-indicator');
                if (indicator) indicator.classList.add('active');
            }

            const route = tabName;
            const pages = ['dashboard', 'scraper', 'inventory', 'quality', 'database', 'dealership', 'chatbot', 'settings'];
            pages.forEach((name) => {
                const page = document.getElementById(`page-${name}`);
                if (page) page.style.display = name === route ? 'block' : 'none';
            });

            // Close mobile menu after selecting a tab
            closeMobileMenu();

            if (route === 'dealership') {
                loadDealershipOverview();
                applyDealershipFilters();
            }
            if (route === 'inventory') {
                loadInventoryRows();
            }
            if (route === 'quality') {
                loadQualityRows();
            }
            if (route === 'database') {
                loadDatabaseRows();
            }
            if (route === 'settings') {
                loadChatDashboard();
            }
        }

        let inventoryRowsCache = [];
        let databaseRowsCache = [];
        let selectedDatabaseRowId = null;

        function setInlineStatus(id, message, tone = 'muted') {
            const el = document.getElementById(id);
            if (!el) return;
            el.textContent = message;
            if (tone === 'error') el.style.color = 'var(--accent-error)';
            else if (tone === 'success') el.style.color = 'var(--accent-success)';
            else el.style.color = 'var(--text-muted)';
        }

        function textValue(value) {
            if (value === null || value === undefined || value === '') return '-';
            return String(value);
        }

        function formatMiles(value) {
            const n = Number(value);
            return Number.isFinite(n) ? n.toLocaleString() : '-';
        }

        function filterInventoryRows(searchValue) {
            const value = (searchValue || '').toLowerCase().trim();
            const rows = document.querySelectorAll('#inventory-table-body tr');
            rows.forEach((row) => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(value) ? '' : 'none';
            });
        }

        async function loadInventoryRows() {
            const tbody = document.getElementById('inventory-table-body');
            if (!tbody) return;
            setInlineStatus('inventory-status', 'Loading inventory...', 'muted');

            try {
                const response = await fetch('/api/inventory');
                if (!response.ok) throw new Error('Inventory API unavailable');
                const rows = await response.json();
                if (!Array.isArray(rows)) throw new Error('Unexpected inventory response');

                inventoryRowsCache = rows;
                tbody.innerHTML = '';

                rows.slice(0, 200).forEach((row) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${textValue(row.vin)}</td>
                        <td>${textValue(row.make)}</td>
                        <td>${textValue(row.model)}</td>
                        <td>${textValue(row.year)}</td>
                        <td>${formatMiles(row.mileage)}</td>
                        <td>${formatCurrency(row.price)}</td>
                        <td>${textValue(row.source)}</td>
                    `;
                    tbody.appendChild(tr);
                });

                if (!rows.length) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = '<td colspan="7">No inventory rows returned.</td>';
                    tbody.appendChild(tr);
                }
                setInlineStatus('inventory-status', `Loaded ${rows.length} inventory records.`, 'success');
            } catch (error) {
                setInlineStatus('inventory-status', `Inventory load failed: ${error.message}`, 'error');
            }
        }

        async function loadQualityRows() {
            const tbody = document.getElementById('quality-table-body');
            const flagged = document.getElementById('quality-flagged-count');
            const scanned = document.getElementById('quality-scanned-count');
            if (!tbody || !flagged || !scanned) return;
            setInlineStatus('quality-status', 'Running quality verification...', 'muted');

            try {
                const response = await fetch('/api/quality/verify?limit=200');
                if (!response.ok) throw new Error('Quality API unavailable');
                const payload = await response.json();
                if (!payload.success) throw new Error(payload.message || 'Quality fetch failed');

                const findings = Array.isArray(payload.findings) ? payload.findings : [];
                flagged.textContent = String(payload.flagged ?? findings.length);
                scanned.textContent = String(payload.scanned ?? 0);

                tbody.innerHTML = '';
                findings.slice(0, 200).forEach((item) => {
                    const issues = Array.isArray(item.issues) ? item.issues : [];
                    const severity = issues.length >= 3 ? 'Error' : issues.length ? 'Warning' : 'Info';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${textValue(item.vin)}</td>
                        <td>${Math.max(0, 100 - issues.length * 20)}</td>
                        <td>${severity}</td>
                        <td>${issues.length ? issues.join(', ') : 'None'}</td>
                    `;
                    tbody.appendChild(tr);
                });

                if (!findings.length) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = '<td colspan="4">No quality issues detected.</td>';
                    tbody.appendChild(tr);
                }
                setInlineStatus(
                    'quality-status',
                    `Scanned ${payload.scanned || 0} rows, flagged ${payload.flagged || 0}.`,
                    findings.length ? 'muted' : 'success'
                );
            } catch (error) {
                setInlineStatus('quality-status', `Quality scan failed: ${error.message}`, 'error');
            }
        }

        function filterDatabaseTable(searchValue) {
            const value = (searchValue || '').toLowerCase().trim();
            const rows = document.querySelectorAll('#db-vehicles-table tbody tr');

            rows.forEach((row) => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(value) ? '' : 'none';
            });
        }

        function applyDatabaseFieldVisibility() {
            const checkboxes = document.querySelectorAll('#db-field-picker input[type="checkbox"][data-field]');
            checkboxes.forEach((checkbox) => {
                const field = checkbox.getAttribute('data-field');
                const visible = checkbox.checked;
                const cells = document.querySelectorAll(`#db-vehicles-table [data-col="${field}"]`);
                cells.forEach((cell) => {
                    cell.style.display = visible ? '' : 'none';
                });
            });
        }

        function initDatabaseFieldPicker() {
            const checkboxes = document.querySelectorAll('#db-field-picker input[type="checkbox"][data-field]');
            checkboxes.forEach((checkbox) => {
                checkbox.addEventListener('change', applyDatabaseFieldVisibility);
            });
            applyDatabaseFieldVisibility();
        }

        function markSelectedDatabaseRow() {
            const rows = document.querySelectorAll('#db-vehicles-table-body tr');
            rows.forEach((row) => {
                const rowId = Number(row.getAttribute('data-id') || 0);
                row.classList.toggle('row-selected', rowId === Number(selectedDatabaseRowId));
            });
        }

        function renderDatabaseRows(rows) {
            const tbody = document.getElementById('db-vehicles-table-body');
            if (!tbody) return;

            tbody.innerHTML = '';
            rows.forEach((row) => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-id', String(row.id));
                tr.innerHTML = `
                    <td data-col="vin">${textValue(row.vin)}</td>
                    <td data-col="year">${textValue(row.year)}</td>
                    <td data-col="make">${textValue(row.make)}</td>
                    <td data-col="model">${textValue(row.model)}</td>
                    <td data-col="trim">${textValue(row.trim)}</td>
                    <td data-col="body">${textValue(row.body_type)}</td>
                    <td data-col="powertrain">${textValue(row.drivetrain)}</td>
                    <td data-col="transmission">${textValue(row.transmission)}</td>
                    <td data-col="fuel">${textValue(row.fuel_type)}</td>
                    <td data-col="mileage">${formatMiles(row.mileage)}</td>
                    <td data-col="color">${textValue(row.exterior_color)}</td>
                    <td data-col="stock">${textValue(row.stock_number)}</td>
                    <td data-col="source">${textValue(row.source)}</td>
                    <td data-col="customer">${textValue(row.customer_name || row.customer || 'Open Lead')}</td>
                    <td data-col="price">${formatCurrency(row.price)}</td>
                    <td data-col="quality">${textValue(row.quality_score)}</td>
                `;
                tr.addEventListener('click', () => {
                    selectedDatabaseRowId = Number(row.id);
                    markSelectedDatabaseRow();
                    setInlineStatus('database-status', `Selected inventory id ${selectedDatabaseRowId}.`, 'muted');
                });
                tbody.appendChild(tr);
            });

            if (!rows.length) {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td colspan="16">No database rows returned.</td>';
                tbody.appendChild(tr);
            }

            markSelectedDatabaseRow();
            applyDatabaseFieldVisibility();
            filterDatabaseTable(document.getElementById('db-table-search')?.value || '');
        }

        async function loadDatabaseRows() {
            setInlineStatus('database-status', 'Loading live SQL rows...', 'muted');
            try {
                const response = await fetch('/api/inventory');
                if (!response.ok) throw new Error('Database inventory API unavailable');
                const rows = await response.json();
                if (!Array.isArray(rows)) throw new Error('Unexpected database response');

                databaseRowsCache = rows;
                if (selectedDatabaseRowId && !rows.some((r) => Number(r.id) === Number(selectedDatabaseRowId))) {
                    selectedDatabaseRowId = null;
                }

                renderDatabaseRows(rows.slice(0, 400));
                setInlineStatus('database-status', `Loaded ${rows.length} database rows.`, 'success');
            } catch (error) {
                setInlineStatus('database-status', `Database load failed: ${error.message}`, 'error');
            }
        }

        async function runDatabaseQueryPrompt() {
            const defaultQuery = 'SELECT id, vin, year, make, model, price, quality_score FROM vehicles ORDER BY scraped_at DESC LIMIT 25';
            const raw = window.prompt('Enter a read-only SQL query (SELECT only):', defaultQuery);
            if (!raw) return;
            const query = String(raw).trim();
            if (!/^select\s+/i.test(query)) {
                setInlineStatus('database-status', 'Only SELECT queries are allowed in UI runner.', 'error');
                return;
            }
            setInlineStatus('database-status', `Query captured: ${query}`, 'success');
            alert('Query runner backend is not exposed yet. Captured query has been validated as SELECT-only.');
        }

        function buildDatabasePayloadTemplate(row = {}) {
            return {
                vin: row.vin || '',
                make: row.make || '',
                model: row.model || '',
                year: row.year || new Date().getFullYear(),
                price: row.price || 0,
                stock_number: row.stock_number || '',
                drivetrain: row.drivetrain || '',
                body_type: row.body_type || '',
                transmission: row.transmission || '',
                fuel_type: row.fuel_type || '',
                mileage: row.mileage || null,
                source: row.source || 'manual',
                url: row.url || ''
            };
        }

        function promptForDatabasePayload(title, template) {
            const raw = window.prompt(`${title}\n\nEdit JSON payload:`, JSON.stringify(template, null, 2));
            if (!raw) return null;
            try {
                return JSON.parse(raw);
            } catch (error) {
                throw new Error('Invalid JSON payload.');
            }
        }

        async function createDatabaseVehicle() {
            try {
                const payload = promptForDatabasePayload('Create vehicle', buildDatabasePayloadTemplate());
                if (!payload) return;
                const response = await fetch('/api/inventory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (!response.ok || result.success === false) {
                    throw new Error(result.message || 'Create failed');
                }
                setInlineStatus('database-status', `Created inventory id ${result.data?.id || '-'}.`, 'success');
                await loadDatabaseRows();
            } catch (error) {
                setInlineStatus('database-status', `Create failed: ${error.message}`, 'error');
            }
        }

        async function updateSelectedDatabaseVehicle() {
            if (!selectedDatabaseRowId) {
                setInlineStatus('database-status', 'Select a row first.', 'error');
                return;
            }

            try {
                const selected = databaseRowsCache.find((row) => Number(row.id) === Number(selectedDatabaseRowId));
                const payload = promptForDatabasePayload(
                    `Update vehicle id ${selectedDatabaseRowId}`,
                    buildDatabasePayloadTemplate(selected || {})
                );
                if (!payload) return;

                const response = await fetch(`/api/inventory/${selectedDatabaseRowId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (!response.ok || result.success === false) {
                    throw new Error(result.message || 'Update failed');
                }
                setInlineStatus('database-status', `Updated inventory id ${selectedDatabaseRowId}.`, 'success');
                await loadDatabaseRows();
            } catch (error) {
                setInlineStatus('database-status', `Update failed: ${error.message}`, 'error');
            }
        }

        async function deleteSelectedDatabaseVehicle() {
            if (!selectedDatabaseRowId) {
                setInlineStatus('database-status', 'Select a row first.', 'error');
                return;
            }
            const confirmed = window.confirm(`Delete inventory id ${selectedDatabaseRowId}? This cannot be undone.`);
            if (!confirmed) return;

            try {
                const response = await fetch(`/api/inventory/${selectedDatabaseRowId}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                if (!response.ok || result.success === false) {
                    throw new Error(result.message || 'Delete failed');
                }
                const deletedId = selectedDatabaseRowId;
                selectedDatabaseRowId = null;
                setInlineStatus('database-status', `Deleted inventory id ${deletedId}.`, 'success');
                await loadDatabaseRows();
            } catch (error) {
                setInlineStatus('database-status', `Delete failed: ${error.message}`, 'error');
            }
        }

        function parseDealershipMetric(row, field) {
            const raw = row.getAttribute(`data-${field}`);
            const value = Number(raw);
            return Number.isFinite(value) ? value : 0;
        }

        function formatCurrency(value) {
            const n = Number(value);
            if (!Number.isFinite(n)) return '$0';
            return `$${n.toLocaleString()}`;
        }

        function safePercent(value) {
            const n = Number(value);
            if (!Number.isFinite(n)) return '0%';
            return `${Math.max(0, Math.min(100, Math.round(n)))}%`;
        }

        function populateSelectOptions(selectId, values, placeholder) {
            const select = document.getElementById(selectId);
            if (!select) return;
            const current = select.value;
            select.innerHTML = '';

            const base = document.createElement('option');
            base.value = '';
            base.textContent = placeholder;
            select.appendChild(base);

            values.forEach((value) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
            });

            if (current && values.includes(current)) {
                select.value = current;
            }
        }

        async function loadDealershipOverview() {
            setInlineStatus('dealership-status', 'Loading dealership overview...', 'muted');
            try {
                const response = await fetch('/api/dealerships/overview');
                if (!response.ok) throw new Error('Dealership overview API unavailable');
                const payload = await response.json();
                if (!payload.success) throw new Error(payload.message || 'Dealership overview failed');

                const businesses = Array.isArray(payload.businesses) ? payload.businesses : [];
                const locations = Array.isArray(payload.locations) ? payload.locations : [];
                const businessMap = new Map(businesses.map((b) => [String(b.id), b]));
                const tbody = document.getElementById('dealership-table-body');
                if (!tbody || locations.length === 0) {
                    setInlineStatus('dealership-status', 'No dealership rows returned.', 'muted');
                    return;
                }

                tbody.innerHTML = '';
                const businessNames = new Set();
                const locationNames = new Set();

                locations.forEach((loc) => {
                    const business = businessMap.get(String(loc.dealer_id));
                    const businessName = business?.name || 'Unknown Business';
                    const locationName = loc.city || loc.name || 'Unknown Location';
                    businessNames.add(businessName);
                    locationNames.add(locationName);

                    const vehicleCount = Number(loc.vehicle_count || 0);
                    const avgQuality = Number(loc.avg_quality || 0);
                    const avgPrice = Number(loc.avg_price || 0);
                    const estimatedAwd4wd = avgQuality >= 88 ? 60 : avgQuality >= 80 ? 50 : 40;

                    const tr = document.createElement('tr');
                    tr.setAttribute('data-business', businessName);
                    tr.setAttribute('data-location', locationName);
                    tr.setAttribute('data-vehicle_count', String(vehicleCount));
                    tr.setAttribute('data-avg_quality', String(avgQuality));
                    tr.setAttribute('data-avg_price', String(avgPrice));
                    tr.innerHTML = `
                        <td>${businessName}</td>
                        <td>${locationName}</td>
                        <td>${vehicleCount}</td>
                        <td>${avgQuality.toFixed(1)}</td>
                        <td>${formatCurrency(avgPrice)}</td>
                        <td>${safePercent(estimatedAwd4wd)}</td>
                    `;
                    tbody.appendChild(tr);
                });

                populateSelectOptions('dealership-business-filter', Array.from(businessNames).sort(), 'All Businesses');
                populateSelectOptions('dealership-location-filter', Array.from(locationNames).sort(), 'All Locations');
                setInlineStatus(
                    'dealership-status',
                    `Loaded ${locations.length} location rows across ${businesses.length} businesses.`,
                    'success'
                );
            } catch (error) {
                setInlineStatus('dealership-status', `Dealership load failed: ${error.message}`, 'error');
            }
        }

        async function refreshDealershipSnapshot() {
            await loadDealershipOverview();
            applyDealershipFilters();
        }

        function applyDealershipFilters() {
            const business = document.getElementById('dealership-business-filter')?.value || '';
            const location = document.getElementById('dealership-location-filter')?.value || '';
            const sortField = document.getElementById('dealership-sort-field')?.value || 'vehicle_count';
            const table = document.getElementById('dealership-table');
            if (!table) return;

            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));

            rows.forEach((row) => {
                const matchBusiness = !business || row.getAttribute('data-business') === business;
                const matchLocation = !location || row.getAttribute('data-location') === location;
                row.style.display = matchBusiness && matchLocation ? '' : 'none';
            });

            rows.sort((a, b) => parseDealershipMetric(b, sortField) - parseDealershipMetric(a, sortField));
            rows.forEach((row) => tbody.appendChild(row));
        }

        function addChatMessage(role, text) {
            const log = document.getElementById('chat-sim-log');
            if (!log) return;
            const div = document.createElement('div');
            div.className = `chat-msg ${role}`;
            div.textContent = text;
            log.appendChild(div);
            log.scrollTop = log.scrollHeight;
        }

        function getChatSimulatorResponse(message) {
            const business = document.getElementById('chat-sim-business')?.value || 'Summit Automotive Group';
            const location = document.getElementById('chat-sim-location')?.value || 'Denver';
            const m = message.toLowerCase();

            if (m.includes('awd') || m.includes('4wd') || m.includes('snow') || m.includes('powertrain')) {
                return `At ${business} (${location}), I can prioritize AWD/4WD inventory. Example matches: 2019 Toyota RAV4 AWD, 2022 Mazda CX-5 AWD, 2021 Ford F-150 4WD.`;
            }
            if (m.includes('under') || m.includes('$') || m.includes('budget') || m.includes('price')) {
                return `For ${location}, budget-friendly options under $35k include RAV4 ($26,995), Civic Touring ($22,995), and Model 3 ($32,995).`;
            }
            if (m.includes('suv')) {
                return `SUV options in ${location}: Toyota RAV4, Mazda CX-5, Jeep Cherokee, and Toyota Highlander. I can filter by AWD, mileage, and quality score.`;
            }
            if (m.includes('test drive') || m.includes('schedule')) {
                return `I can start a test-drive request for ${business} - ${location}. Use "Simulate Lead Handoff" to create a customer handoff event.`;
            }
            return `I can help with inventory at ${business} (${location}). Ask by price range, body type, powertrain (FWD/RWD/AWD/4WD), or specific make/model.`;
        }

        async function sendChatSimulatorMessage() {
            const input = document.getElementById('chat-sim-input');
            if (!input) return;
            const text = (input.value || '').trim();
            if (!text) return;

            addChatMessage('user', text);
            setInlineStatus('chat-status', 'Sending message to chat API...', 'muted');
            input.value = '';

            const business = document.getElementById('chat-sim-business')?.value || 'Summit Automotive Group';
            const location = document.getElementById('chat-sim-location')?.value || 'Denver';

            try {
                const response = await fetch('/api/chat/sessions/demo/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text, business, location })
                });
                const payload = await response.json();
                if (!response.ok || payload.success === false) {
                    throw new Error(payload.message || 'Chat API failed');
                }
                addChatMessage('bot', payload.data?.reply || 'No response');
                setInlineStatus('chat-status', 'Chat response from backend scaffold.', 'success');
            } catch (error) {
                const response = getChatSimulatorResponse(text);
                setTimeout(() => addChatMessage('bot', response), 220);
                setInlineStatus('chat-status', `Chat backend unavailable, used local simulator: ${error.message}`, 'error');
            }
        }

        function simulateLeadHandoff() {
            const business = document.getElementById('chat-sim-business')?.value || 'Summit Automotive Group';
            const location = document.getElementById('chat-sim-location')?.value || 'Denver';
            addChatMessage('bot', `Lead handoff created: customer inquiry routed to ${business} (${location}) sales queue.`);
        }

        function resetChatSimulator() {
            const log = document.getElementById('chat-sim-log');
            const input = document.getElementById('chat-sim-input');
            if (log) log.innerHTML = '';
            if (input) input.value = '';
            setInlineStatus('chat-status', 'Chat API scaffold mode.', 'muted');
            addChatMessage('bot', 'Chat simulator ready. Ask about inventory, powertrain, budget, or schedule a test drive.');
        }

        async function loadChatDashboard() {
            const chatsValue = document.getElementById('settings-past-chats');
            const customersValue = document.getElementById('settings-unique-customers');
            const tbody = document.getElementById('settings-chat-table-body');
            setInlineStatus('settings-chat-status', 'Loading chat sessions...', 'muted');
            if (!chatsValue || !customersValue || !tbody) return;

            try {
                const response = await fetch('/api/chat/sessions?limit=50');
                if (!response.ok) throw new Error('Chat sessions API unavailable');
                const payload = await response.json();
                if (!payload.success) throw new Error(payload.message || 'Chat sessions request failed');
                const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];

                chatsValue.textContent = String(sessions.length);
                const customers = new Set(
                    sessions
                        .map((s) => String(s.customer_name || '').trim())
                        .filter(Boolean)
                );
                customersValue.textContent = String(customers.size);

                tbody.innerHTML = '';
                sessions.slice(0, 25).forEach((s) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${textValue(s.session_key)}</td>
                        <td>${textValue(s.customer_name || 'Unknown')}</td>
                        <td>Inventory Q&A</td>
                        <td>${textValue(s.business || 'Unknown')}</td>
                        <td>${textValue(s.location || 'Unknown')}</td>
                        <td>${Number(s.message_count || 0) > 0 ? 'Active' : 'Open'}</td>
                    `;
                    tbody.appendChild(tr);
                });

                if (!sessions.length) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = '<td colspan="6">No chat sessions found yet.</td>';
                    tbody.appendChild(tr);
                }

                setInlineStatus('settings-chat-status', `Loaded ${sessions.length} chat sessions.`, 'success');
            } catch (error) {
                setInlineStatus('settings-chat-status', `Chat dashboard load failed: ${error.message}`, 'error');
            }
        }

        function extractUrlFromCurl(curlCommand) {
            if (!curlCommand) return '';
            const match = curlCommand.match(/curl\s+(?:-[^\s]+\s+)*['"]?(https?:\/\/[^\s'"]+)['"]?/i);
            return match ? match[1] : '';
        }

        function normalizeUrl(url) {
            if (!url) return '';
            const trimmed = url.trim();
            if (!trimmed) return '';
            if (/^https?:\/\//i.test(trimmed)) return trimmed;
            return `https://${trimmed}`;
        }

        function updateScraperPreview() {
            const urlInput = document.getElementById('scraper-target-url');
            const curlInput = document.getElementById('scraper-curl-command');
            const frame = document.getElementById('scraper-preview-frame');
            const link = document.getElementById('scraper-preview-link');
            const status = document.getElementById('scraper-preview-status');

            if (!urlInput || !curlInput || !frame || !link || !status) return;

            const explicitUrl = normalizeUrl(urlInput.value);
            const curlUrl = normalizeUrl(extractUrlFromCurl(curlInput.value));
            const resolvedUrl = explicitUrl || curlUrl;

            if (!resolvedUrl) {
                frame.removeAttribute('src');
                link.href = '#';
                status.textContent = 'Enter a URL or paste a curl command to preview the target site.';
                return;
            }

            if (!explicitUrl && curlUrl) {
                urlInput.value = curlUrl;
            }

            frame.src = resolvedUrl;
            link.href = resolvedUrl;
            status.textContent = `Preview target: ${resolvedUrl}`;
        }

        const scraperRunHistory = [];

        function setScraperButtonsDisabled(disabled) {
            ['scraper-btn-save', 'scraper-btn-test', 'scraper-btn-batch'].forEach((id) => {
                const button = document.getElementById(id);
                if (button) button.disabled = disabled;
            });
        }

        function setScraperRunStatus(message, tone = 'muted') {
            const status = document.getElementById('scraper-run-status');
            if (!status) return;
            status.textContent = message;
            if (tone === 'error') status.style.color = 'var(--accent-error)';
            else if (tone === 'success') status.style.color = 'var(--accent-success)';
            else status.style.color = 'var(--text-secondary)';
        }

        function setScraperRunOutput(payload) {
            const output = document.getElementById('scraper-run-output');
            if (!output) return;
            output.textContent = payload ? JSON.stringify(payload, null, 2) : '';
        }

        function addScraperHistoryEntry(entry) {
            scraperRunHistory.unshift(entry);
            if (scraperRunHistory.length > 12) {
                scraperRunHistory.pop();
            }

            const tbody = document.getElementById('scraper-run-history-body');
            if (!tbody) return;
            tbody.innerHTML = '';

            scraperRunHistory.forEach((row) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.time}</td>
                    <td>${row.source}</td>
                    <td>${row.cars}</td>
                    <td>${row.status}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function getScraperSourceName() {
            return document.getElementById('scraper-source-name')?.value?.trim() || 'manual-source';
        }

        function getScraperCurlCommand() {
            return document.getElementById('scraper-curl-command')?.value?.trim() || '';
        }

        function parseBatchCurlCommands(raw) {
            const matches = raw.match(/curl[\s\S]*?(?=\ncurl\s|$)/gi) || [];
            return matches.map((item) => item.trim()).filter(Boolean);
        }

        async function runScrapeAction(mode) {
            const sourceName = getScraperSourceName();
            const curlCommand = getScraperCurlCommand();

            if (!curlCommand) {
                setScraperRunStatus('Paste at least one curl command first.', 'error');
                return;
            }

            setScraperButtonsDisabled(true);
            setScraperRunStatus('Running scraper request...', 'muted');

            try {
                let endpoint = '/api/test';
                let payload = { curlCommand, sourceName };
                if (mode === 'save') endpoint = '/api/scrape';
                if (mode === 'batch') {
                    endpoint = '/api/scrape/batch';
                    payload = {
                        curlCommands: parseBatchCurlCommands(curlCommand),
                        sourceName
                    };
                    if (!payload.curlCommands.length) {
                        throw new Error('Batch mode expects one curl command per line.');
                    }
                }

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                if (!response.ok || result.success === false) {
                    throw new Error(result.message || 'Scraper request failed');
                }

                const carsCount = mode === 'batch'
                    ? Number(result.totalCars || 0)
                    : Array.isArray(result.data) ? result.data.length : 0;
                const metrics = result.metrics ? ` (inserted: ${result.metrics.inserted || 0}, updated: ${result.metrics.updated || 0}, skipped: ${result.metrics.skipped || 0})` : '';
                const successMessage = `${mode.toUpperCase()} successful: ${carsCount} cars${metrics}`;

                setScraperRunStatus(successMessage, 'success');
                setScraperRunOutput(result);
                addScraperHistoryEntry({
                    time: new Date().toLocaleTimeString(),
                    source: sourceName,
                    cars: carsCount,
                    status: 'Success'
                });
            } catch (error) {
                setScraperRunStatus(`Error: ${error.message}`, 'error');
                setScraperRunOutput({ error: error.message });
                addScraperHistoryEntry({
                    time: new Date().toLocaleTimeString(),
                    source: sourceName,
                    cars: 0,
                    status: 'Failed'
                });
            } finally {
                setScraperButtonsDisabled(false);
            }
        }

        function escapeCsvValue(value) {
            if (value === null || value === undefined) return '';
            const raw = String(value);
            if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
                return `"${raw.replace(/"/g, '""')}"`;
            }
            return raw;
        }

        function exportInventoryCsv() {
            if (!inventoryRowsCache.length) {
                setInlineStatus('inventory-status', 'No inventory data to export yet.', 'error');
                return;
            }

            const headers = ['vin', 'year', 'make', 'model', 'trim', 'price', 'mileage', 'drivetrain', 'fuel_type', 'source', 'stock_number', 'url'];
            const lines = [
                headers.join(',')
            ];

            inventoryRowsCache.forEach((row) => {
                const values = headers.map((key) => escapeCsvValue(row[key]));
                lines.push(values.join(','));
            });

            const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.href = url;
            a.download = `inventory-export-${stamp}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setInlineStatus('inventory-status', `Exported ${inventoryRowsCache.length} inventory rows to CSV.`, 'success');
        }

        function setupEventBindings() {
            document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleMobileMenu);
            document.getElementById('sidebar-overlay')?.addEventListener('click', closeMobileMenu);

            document.querySelectorAll('.nav-item[data-tab]').forEach((item) => {
                item.addEventListener('click', () => {
                    const tab = item.getAttribute('data-tab');
                    if (tab) selectTab(tab, item);
                });
            });

            document.getElementById('scraper-target-url')?.addEventListener('input', updateScraperPreview);
            document.getElementById('scraper-curl-command')?.addEventListener('input', updateScraperPreview);
            document.getElementById('scraper-btn-save')?.addEventListener('click', () => runScrapeAction('save'));
            document.getElementById('scraper-btn-test')?.addEventListener('click', () => runScrapeAction('test'));
            document.getElementById('scraper-btn-batch')?.addEventListener('click', () => runScrapeAction('batch'));

            document.getElementById('inventory-search-input')?.addEventListener('input', (event) => {
                filterInventoryRows(event.target.value);
            });
            document.getElementById('inventory-export-csv-btn')?.addEventListener('click', exportInventoryCsv);
            document.getElementById('quality-recalculate-btn')?.addEventListener('click', loadQualityRows);

            document.getElementById('db-table-search')?.addEventListener('input', (event) => {
                filterDatabaseTable(event.target.value);
            });
            document.getElementById('database-refresh-btn')?.addEventListener('click', loadDatabaseRows);
            document.getElementById('database-add-btn')?.addEventListener('click', createDatabaseVehicle);
            document.getElementById('database-edit-btn')?.addEventListener('click', updateSelectedDatabaseVehicle);
            document.getElementById('database-delete-btn')?.addEventListener('click', deleteSelectedDatabaseVehicle);
            document.getElementById('database-run-query-btn')?.addEventListener('click', runDatabaseQueryPrompt);

            document.getElementById('dealership-business-filter')?.addEventListener('change', applyDealershipFilters);
            document.getElementById('dealership-location-filter')?.addEventListener('change', applyDealershipFilters);
            document.getElementById('dealership-sort-field')?.addEventListener('change', applyDealershipFilters);
            document.getElementById('dealership-refresh-btn')?.addEventListener('click', refreshDealershipSnapshot);

            document.getElementById('chat-reset-btn')?.addEventListener('click', resetChatSimulator);
            document.getElementById('chat-send-btn')?.addEventListener('click', sendChatSimulatorMessage);
            document.getElementById('chat-handoff-btn')?.addEventListener('click', simulateLeadHandoff);
            document.getElementById('chat-sim-input')?.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') sendChatSimulatorMessage();
            });
        }

        document.addEventListener('DOMContentLoaded', () => {
            setupEventBindings();
            initDatabaseFieldPicker();
            loadInventoryRows();
            loadQualityRows();
            loadDatabaseRows();
            loadDealershipOverview();
            applyDealershipFilters();
            loadChatDashboard();
            resetChatSimulator();
            addScraperHistoryEntry({
                time: '--',
                source: 'No runs yet',
                cars: '--',
                status: 'Idle'
            });
        });
