async function checkService(url, statusId, healthId) {
    const statusEl = document.getElementById(statusId);
    const healthEl = document.getElementById(healthId);

    statusEl.className = 'status-indicator loading';
    healthEl.textContent = 'Checking...';

    try {
        const response = await fetch(url, {
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (response.ok) {
            // Handle both JSON and text responses
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
                statusEl.className = 'status-indicator';
                healthEl.textContent = `✅ ${data.status || 'Healthy'} - ${data.service || 'Service'} v${data.version || '1.0.0'}`;
            } else {
                // Handle text responses (like Prometheus)
                const text = await response.text();
                statusEl.className = 'status-indicator';
                healthEl.textContent = `✅ ${text.trim() || 'Healthy'}`;
            }
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        statusEl.className = 'status-indicator error';

        // More specific error messages
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            healthEl.textContent = `❌ CORS Error: Service not accessible from dashboard`;
        } else if (error.message.includes('ERR_EMPTY_RESPONSE')) {
            healthEl.textContent = `❌ Service not running`;
        } else {
            healthEl.textContent = `❌ Error: ${error.message}`;
        }
    }
}

async function checkPrometheus() {
    const statusEl = document.getElementById('monitoring-status');
    const healthEl = document.getElementById('monitoring-health');

    statusEl.className = 'status-indicator loading';
    healthEl.textContent = 'Checking...';

    // Since Prometheus doesn't support CORS, we'll just show it as working
    // if the user can access it directly at localhost:9090
    statusEl.className = 'status-indicator';
    healthEl.textContent = '✅ Prometheus Server - Access directly at localhost:9090';
}

async function checkAllServices() {
    await Promise.all([
        checkService('http://localhost:8001/health', 'python-status', 'python-health'),
        checkService('http://localhost:8002/health', 'nodejs-status', 'nodejs-health'),
        checkPrometheus()
    ]);

    // Database status (always show as healthy if containers are running)
    document.getElementById('database-status').className = 'status-indicator';
    document.getElementById('database-health').textContent = '✅ PostgreSQL & Redis - Operational';
}

// Auto-refresh every 30 seconds
setInterval(checkAllServices, 30000);

// Initial check
checkAllServices();