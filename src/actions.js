import { setState, getState } from './state.js';
import { apiService } from './apiService.js';
import { storageService } from './storageService.js';
import { speechService } from './speechService.js';
import { wakeLockService } from './wakeLockService.js';
import { showToast } from './app.js';

export const actions = {
    async translateText() {
        const { appStatus } = getState();
        if (appStatus === 'loading') return;

        const apiKey = document.getElementById('apiKey').value.trim();
        const sourceText = document.getElementById('sourceText').value.trim();

        if (!apiKey) { showToast('Vui lòng nhập API Key.', 'error'); return; }
        if (!sourceText) { showToast('Vui lòng nhập văn bản cần dịch.', 'error'); return; }

        this.stop();
        setState({ appStatus: 'loading' });

        try {
            const translation = await apiService.translate(apiKey, sourceText);
            storageService.setApiKey(apiKey);
            
            setState({
                appStatus: 'ready',
                translationText: translation.trim(),
                activeTab: 'translation',
                error: null,
                triggerAutoPlay: getState().isAutoPlay
            });

        } catch (error) {
            console.error(error);
            setState({ appStatus: 'error', error: error.message, activeTab: 'translation' });
        }
    },

    async play() {
        const { appStatus } = getState();
        if (appStatus !== 'ready' && appStatus !== 'paused') return;

        await wakeLockService.acquire();
        
        // FIX: The resume() function is highly unreliable on mobile browsers.
        // The most robust solution is to always treat a "play" action as a fresh start
        // from the current sentence. This ensures highlighting and speech work consistently.
        setState({ appStatus: 'playing' });
        const startIndex = speechService.getCurrentIndex() >= 0 ? speechService.getCurrentIndex() : 0;
        speechService.play(startIndex, () => {
            actions.stop(); 
        });
    },

    pause() {
        if (getState().appStatus !== 'playing') return;
        setState({ appStatus: 'paused' });
        speechService.pause();
        wakeLockService.release();
    },

    stop() {
        if (['ready', 'initial', 'error'].includes(getState().appStatus)) return;
        setState({ appStatus: 'ready' });
        speechService.stop();
    },
    
    jumpToSentence(index) {
        const { isClickToPlayLocked, appStatus } = getState();
        if (isClickToPlayLocked) return;

        if (appStatus === 'playing' || appStatus === 'paused') {
            this.stop();
        }

        setTimeout(() => {
            // Directly set the state to playing and call the speech service.
            setState({ appStatus: 'playing' });
            speechService.play(index, () => {
                actions.stop();
            });
        }, 100);
    },
    
    toggleLock() {
        const { isClickToPlayLocked } = getState();
        setState({ isClickToPlayLocked: !isClickToPlayLocked });
        showToast(getState().isClickToPlayLocked ? "Đã khóa chọn câu" : "Đã mở khóa chọn câu");
    },

    enterEditMode() {
        this.stop();
        setState({ appStatus: 'editing' });
    },

    saveEdit() {
        const newText = document.getElementById('result-editor').value;
        setState({ appStatus: 'ready', translationText: newText });
    },

    copyToClipboard() {
        const { translationText } = getState();
        if (!translationText) return;
        navigator.clipboard.writeText(translationText)
            .then(() => showToast("Đã sao chép vào clipboard!"))
            .catch(err => showToast("Lỗi khi sao chép.", 'error'));
    },
    
    changeTab(tab) {
        setState({ activeTab: tab });
    },

    toggleAutoPlay(isChecked) {
        storageService.setAutoPlay(isChecked);
        setState({ isAutoPlay: isChecked });
    }
};
