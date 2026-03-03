/**
 * Processor - Orchestrates engine and storage
 */

class Processor {
    constructor() {
        this.engine = new FinanceEngine();
    }

    init(data) {
        console.log('Starting financial processing...', data);
        try {
            const results = this.engine.process(data);
            
            // Save to localStorage for dashboard to pick up
            localStorage.setItem('pl_dashboard_results', JSON.stringify(results));
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (err) {
            console.error('Processing error:', err);
            alert('Financial Engine Error: ' + err.message);
        }
    }
}

const processor = new Processor();
window.processor = processor;
