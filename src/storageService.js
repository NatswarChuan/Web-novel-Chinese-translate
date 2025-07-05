import { STORAGE_KEYS } from './config.js';

export const storageService = {
    getApiKey: () => localStorage.getItem(STORAGE_KEYS.API_KEY) || '',
    setApiKey: (key) => localStorage.setItem(STORAGE_KEYS.API_KEY, key),
    getAutoPlay: () => localStorage.getItem(STORAGE_KEYS.AUTO_PLAY) === 'true',
    setAutoPlay: (value) => localStorage.setItem(STORAGE_KEYS.AUTO_PLAY, value),
};
