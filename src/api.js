import { State } from './state.js';
import { showToast, showLogin } from './ui.js';

// Store password in temporary memory, NOT in browser storage
let currentPassword = '';

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': currentPassword
});

const handleResponse = async (res) => {
    if (res.status === 401) {
        currentPassword = ''; // Reset password if rejected
        showLogin();
        throw new Error('Session expired or invalid password');
    }
    if (!res.ok) throw new Error('Server error occurred');
    return res.json();
};

export const API = {
    async verifyPassword(password) {
        try {
            const res = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (res.ok) {
                currentPassword = password; // Store in temporary variable
                return true;
            }
            return false;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    async loadData() {
        try {
            const data = await fetch('/api/data', { headers: getHeaders() }).then(handleResponse);
            Object.assign(State, data);
            if (data.playlist) {
                State.playlist = data.playlist;
            }
            return true;
        } catch (e) {
            console.error("Failed to load data:", e);
            return false;
        }
    },

    async saveData() {
        try {
            const dataToSave = {
                poems: State.poems,
                photos: State.photos.map(p => ({
                    id: p.id,
                    type: p.type,
                    caption: p.caption,
                    date: p.date,
                    src: p.src
                })),
                playlist: State.playlist.map(({ title, artist, url }) => ({ title, artist, url })),
                anniversary: State.anniversary,
                name1: State.name1,
                name2: State.name2,
            };

            await fetch('/api/data', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(dataToSave)
            }).then(handleResponse);

            showToast("Memory saved 💕");
        } catch (e) {
            console.error("Failed to save data:", e);
            showToast("Failed to save data", true);
        }
    },
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': currentPassword // Use variable
            },
            body: formData
        });
        return handleResponse(res);
    }
};
