/**
 * Uploader - Handles file selection and Jira API fetching
 */

class Uploader {
    constructor() {
        this.form = document.getElementById('uploadForm');
        this.statusMsg = document.getElementById('statusMsg');
    }

    async parseCSV(file, requiredHeaders = []) {
        // Validation: Extension
        if (!file.name.toLowerCase().endsWith('.csv')) {
            throw new Error(`File "${file.name}" must be a .csv file.`);
        }

        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: (results) => {
                    const headers = results.meta.fields;
                    // Validation: Headers
                    const missing = requiredHeaders.filter(h => !headers.includes(h));
                    if (missing.length > 0) {
                        reject(new Error(`File "${file.name}" is missing required columns: ${missing.join(', ')}`));
                    } else {
                        resolve(results.data);
                    }
                },
                error: (error) => reject(error)
            });
        });
    }

    showStatus(msg, type = 'info') {
        this.statusMsg.textContent = msg;
        this.statusMsg.className = `status-indicator status-${type === 'error' ? 'red' : 'info'}`;
        this.statusMsg.style.display = 'block';
        this.statusMsg.style.marginBottom = '20px';
        if (type === 'error') {
            this.statusMsg.style.backgroundColor = '#fee2e2';
            this.statusMsg.style.color = '#991b1b';
            this.statusMsg.style.border = '1px solid #fecaca';
        }
    }

    async getFiles() {
        const fileConfigs = {
            jiraDump: { id: 'jiraDump', headers: ['Author', 'Issue', 'Time Spent (hrs)'] },
            rateCard: { id: 'rateCard', headers: ['Name', 'Monthly Salary'] },
            resourceList: { id: 'resourceList', headers: ['Name', 'Required Hours (Formula)'] },
            projectMaster: { id: 'projectMaster', headers: ['Customer Name', 'Client Code', 'PO Amount'] },
            overheadPool: { id: 'overheadPool', headers: [] } // Optional
        };

        const data = {};
        for (const [key, config] of Object.entries(fileConfigs)) {
            const file = document.getElementById(config.id).files[0];
            if (file) {
                data[key] = await this.parseCSV(file, config.headers);
            } else if (key !== 'overheadPool') {
                throw new Error(`Please select the ${config.id.split(/(?=[A-Z])/).join(' ')} file.`);
            } else {
                data[key] = [];
            }
        }
        return data;
    }
}

// Initialize
const uploader = new Uploader();

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const data = await uploader.getFiles();
        processor.init(data);
    } catch (err) {
        uploader.showStatus(err.message, 'error');
    }
});

document.getElementById('jiraFetchBtn').addEventListener('click', async () => {
    uploader.showStatus('Fetching data from Jira API...', 'info');
    try {
        // In a real scenario, this would call our backend proxy
        const response = await fetch('/api/jira/worklogs');
        if (!response.ok) throw new Error('Jira API fetch failed. Check server/env.');
        const jiraData = await response.json();
        uploader.showStatus('Jira data fetched successfully!', 'green');
        // Handle integration...
    } catch (err) {
        uploader.showStatus(err.message, 'error');
    }
});
