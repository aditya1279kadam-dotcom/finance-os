/**
 * API Client - Interacts with the Node.js backend
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const API = {
    async uploadFile(type, file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${BASE_URL}/api/upload/${type}`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Upload failed');
        }
        return response.json();
    },

    async calculateReport(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        const response = await fetch(`${BASE_URL}/api/calculate${query ? '?' + query : ''}`);
        if (!response.ok) throw new Error('Calculation failed');
        return response.json();
    },

    async uploadAttendanceFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${BASE_URL}/api/upload/attendance`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Attendance upload failed');
        }
        return response.json();
    },

    async calculateResourceReport(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        const response = await fetch(`${BASE_URL}/api/calculate-resource${query ? '?' + query : ''}`);
        if (!response.ok) throw new Error('Resource calculation failed');
        return response.json();
    },

    async fetchJira() {
        const response = await fetch(`${BASE_URL}/api/jira/worklogs`);
        if (!response.ok) throw new Error('Jira fetch failed');
        return response.json();
    },

    async getMetadata() {
        const response = await fetch(`${BASE_URL}/api/metadata`);
        if (!response.ok) throw new Error('Failed to fetch metadata');
        return response.json();
    },

    async saveMetadata(data) {
        const response = await fetch(`${BASE_URL}/api/metadata`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to save metadata');
        return response.json();
    },

    async clearData() {
        const response = await fetch(`${BASE_URL}/api/clear`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to clear data');
        return response.json();
    }
};

window.API = API;
