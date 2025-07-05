import { subscribe, setState, getState } from './state.js';
import { storageService } from './storageService.js';
import { speechService } from './speechService.js';
import { actions } from './actions.js';

// --- Constants ---
const MOBILE_BREAKPOINT = 1024;

// --- DOM Elements ---
const dom = {
    container: document.querySelector('.container'),
    apiKeyInput: document.getElementById('apiKey'),
    autoPlayToggle: document.getElementById('autoPlayToggle'),
    translateBtn: document.getElementById('translateBtn'),
    sourceTextarea: document.getElementById('sourceText'),
    charCounter: document.getElementById('char-counter'),
    pasteBtn: document.getElementById('pasteBtn'),
    clearBtn: document.getElementById('clearBtn'),
    resultDisplay: document.getElementById('result-display'),
    resultEditor: document.getElementById('result-editor'),
    errorDetails: document.getElementById('error-details'),
    audioControls: document.getElementById('audio-controls'),
    mobileTabs: document.querySelectorAll('.tab-btn'),
    toast: document.getElementById('toast'),
    
    // --- New elements for dynamic layout ---
    headerControlsContainer: document.getElementById('header-controls-container'),
    desktopActionContainer: document.getElementById('desktop-action-container'),
    desktopAudioControlsContainer: document.getElementById('desktop-audio-controls-container'),
    mobileFooter: document.getElementById('mobile-footer'),
    
    // --- Modal elements ---
    settingsModal: document.getElementById('settings-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    modalApiKeyContainer: document.getElementById('modal-api-key-container'),
    modalAutoPlayContainer: document.getElementById('modal-auto-play-container'),

    // --- Original desktop containers ---
    desktopMainControls: document.getElementById('desktop-main-controls'),
    settingsPanel: document.querySelector('.settings-panel .toggle-switch'),
};

// --- Toast Notification Utility ---
export function showToast(message, type = 'success', duration = 3000) {
    dom.toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i><span>${message}</span>`;
    lucide.createIcons();
    dom.toast.className = `show ${type}`;
    setTimeout(() => { dom.toast.className = ''; }, duration);
}

// --- Dynamic Layout Management ---
let settingsBtn; // To hold the created settings button

function setupDynamicLayout() {
    // Create settings button once
    settingsBtn = document.createElement('button');
    settingsBtn.id = 'settings-btn';
    settingsBtn.className = 'icon-btn';
    settingsBtn.title = 'Cài đặt';
    settingsBtn.innerHTML = '<i data-lucide="settings"></i>';
    settingsBtn.addEventListener('click', () => dom.settingsModal.classList.add('show'));

    // Function to update layout based on screen size
    const updateLayout = () => {
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

        if (isMobile) {
            // Move controls to mobile positions
            dom.headerControlsContainer.appendChild(settingsBtn);
            dom.mobileFooter.appendChild(dom.translateBtn);
            dom.mobileFooter.appendChild(dom.audioControls);
            
            // Move settings from modal placeholders to the modal itself
            dom.modalApiKeyContainer.appendChild(dom.apiKeyInput);
            dom.modalAutoPlayContainer.appendChild(dom.settingsPanel);

        } else {
            // Move controls back to desktop positions
            dom.desktopMainControls.style.display = 'grid';
            dom.desktopActionContainer.appendChild(dom.translateBtn);
            dom.desktopAudioControlsContainer.appendChild(dom.audioControls);
            
            // Move settings back to desktop panels
            document.querySelector('.api-key-panel').appendChild(dom.apiKeyInput);
            document.querySelector('.settings-panel').appendChild(dom.settingsPanel);

            // Remove settings button from header
            if (dom.headerControlsContainer.contains(settingsBtn)) {
                dom.headerControlsContainer.removeChild(settingsBtn);
            }
        }
        lucide.createIcons();
    };

    // Initial layout check and add resize listener
    updateLayout();
    window.addEventListener('resize', updateLayout);
}


// --- MAIN UI RENDERER ---
function renderUI(appState) {
    const isNowLoading = appState.appStatus === 'loading';
    const isNowEditing = appState.appStatus === 'editing';
    const isPlaying = appState.appStatus === 'playing';
    const isPaused = appState.appStatus === 'paused';
    const isReading = isPlaying || isPaused;

    // --- Icons ---
    const translateBtnContent = isNowLoading
        ? `<i data-lucide="loader-2" class="animate-spin"></i><span>Đang dịch...</span>`
        : `<i data-lucide="sparkles"></i><span>Dịch</span>`;
    if (dom.translateBtn.innerHTML !== translateBtnContent) {
        dom.translateBtn.innerHTML = translateBtnContent;
    }
    const editBtn = dom.audioControls.querySelector('#edit-btn');
    const editBtnContent = isNowEditing ? `<i data-lucide="check-square"></i>` : `<i data-lucide="edit"></i>`;
    if (editBtn.innerHTML !== editBtnContent) {
        editBtn.innerHTML = editBtnContent;
    }
    lucide.createIcons();
    
    // --- Main container attributes ---
    dom.container.dataset.status = appState.appStatus;
    dom.container.dataset.mode = isNowEditing ? 'editing' : 'display';
    // **FIX:** Set activeTab on both container and body
    dom.container.dataset.activeTab = appState.activeTab;
    document.body.dataset.activeTab = appState.activeTab;


    // --- Conditional class toggles ---
    dom.mobileTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === appState.activeTab));
    dom.audioControls.querySelector('#lock-btn').classList.toggle('active', appState.isClickToPlayLocked);

    // --- Conditional property updates (disabled, style, etc.) ---
    dom.translateBtn.disabled = isNowLoading || isReading || isNowEditing;
    const isSourceInteractable = ['initial', 'ready', 'error'].includes(appState.appStatus);
    dom.sourceTextarea.disabled = !isSourceInteractable;
    dom.pasteBtn.disabled = !isSourceInteractable;
    dom.clearBtn.disabled = !isSourceInteractable || dom.sourceTextarea.value.length === 0;

    if (isNowEditing) {
        if (dom.resultEditor.value !== appState.translationText) dom.resultEditor.value = appState.translationText;
    } else {
        if (dom.resultDisplay.innerHTML === '' || dom.resultDisplay.textContent !== appState.translationText) {
            renderTranslationResult(appState.translationText);
        }
    }
    
    const isContentAvailable = appState.translationText.length > 0;
    const audioControlsButtons = dom.audioControls.querySelectorAll('.icon-btn');
    audioControlsButtons.forEach(btn => {
        switch(btn.id) {
            case 'edit-btn': btn.disabled = !isContentAvailable || isPlaying; break;
            case 'copy-btn': btn.disabled = !isContentAvailable; break;
            case 'lock-btn': btn.disabled = !isContentAvailable || isNowEditing; break;
            case 'play-btn': btn.disabled = !isContentAvailable || isPlaying || isNowEditing; break;
            case 'pause-btn': btn.disabled = !isPlaying; break;
            case 'stop-btn': btn.disabled = !isReading; break;
        }
    });

    // --- Visibility of play/pause/stop ---
    dom.audioControls.querySelector('#play-btn').style.display = isPlaying ? 'none' : 'flex';
    dom.audioControls.querySelector('#pause-btn').style.display = isPlaying ? 'flex' : 'none';
    dom.audioControls.querySelector('#stop-btn').style.display = isReading ? 'flex' : 'none';
    
    editBtn.title = isNowEditing ? "Lưu thay đổi" : "Sửa bản dịch";
    
    if (appState.appStatus === 'error') {
        dom.errorDetails.textContent = appState.error;
    }
}

function splitSentences(text) {
    if (!text) return [];
    const sentences = text.match(/[^.!?…]+[.!?…]?/g) || [];
    return sentences.filter(s => s.trim().length > 0);
}

function renderTranslationResult(text) {
    dom.resultDisplay.innerHTML = '';
    if (!text) {
        speechService.setSentences([]);
        return;
    }
    const fragment = document.createDocumentFragment();
    const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
    const allSentenceSpans = [];
    paragraphs.forEach(paragraphText => {
        const pElement = document.createElement('p');
        pElement.className = 'paragraph';
        const sentences = splitSentences(paragraphText);
        sentences.forEach(sentenceText => {
            const sentenceSpan = document.createElement('span');
            sentenceSpan.className = 'sentence';
            const globalSentenceIndex = allSentenceSpans.length;
            sentenceSpan.dataset.index = globalSentenceIndex;
            sentenceSpan.addEventListener('click', () => actions.jumpToSentence(globalSentenceIndex));
            const words = sentenceText.trim().split(/\s+/);
            const wordSpans = words.map(wordText => {
                const wordSpan = document.createElement('span');
                wordSpan.className = 'word';
                wordSpan.textContent = wordText;
                sentenceSpan.appendChild(wordSpan);
                sentenceSpan.appendChild(document.createTextNode(' '));
                return wordSpan;
            });
            sentenceSpan.wordSpans = wordSpans;
            pElement.appendChild(sentenceSpan);
            allSentenceSpans.push(sentenceSpan);
        });
        fragment.appendChild(pElement);
    });
    dom.resultDisplay.appendChild(fragment);
    speechService.setSentences(allSentenceSpans);
}

// --- Event Listeners Setup ---
let speechEnginePrimed = false;
function setupEventListeners() {
    dom.translateBtn.addEventListener('click', () => {
        if (!speechEnginePrimed && 'speechSynthesis' in window) {
            const primer = new SpeechSynthesisUtterance('');
            primer.volume = 0;
            speechSynthesis.speak(primer);
            speechSynthesis.cancel();
            speechEnginePrimed = true;
        }
        actions.translateText();
    });
    dom.sourceTextarea.addEventListener('input', () => {
        dom.charCounter.textContent = `${dom.sourceTextarea.value.length} ký tự`;
    });
    dom.clearBtn.addEventListener('click', () => {
        dom.sourceTextarea.value = '';
        dom.charCounter.textContent = '0 ký tự';
        dom.sourceTextarea.dispatchEvent(new Event('input'));
    });
    dom.pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                dom.sourceTextarea.value = text;
                dom.sourceTextarea.dispatchEvent(new Event('input'));
            } else { showToast('Clipboard rỗng.', 'error'); }
        } catch (err) { showToast('Không thể truy cập clipboard.', 'error'); }
    });

    // --- Audio Controls Delegation ---
    dom.audioControls.addEventListener('click', (e) => {
        const button = e.target.closest('.icon-btn');
        if (!button) return;
        switch(button.id) {
            case 'edit-btn':
                getState().appStatus === 'editing' ? actions.saveEdit() : actions.enterEditMode();
                break;
            case 'play-btn': actions.play(); break;
            case 'pause-btn': actions.pause(); break;
            case 'stop-btn': actions.stop(); break;
            case 'copy-btn': actions.copyToClipboard(); break;
            case 'lock-btn': actions.toggleLock(); break;
        }
    });
    
    dom.mobileTabs.forEach(tab => {
        tab.addEventListener('click', () => actions.changeTab(tab.dataset.tab));
    });
    dom.autoPlayToggle.addEventListener('change', (e) => {
        actions.toggleAutoPlay(e.target.checked);
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && getState().appStatus === 'playing') {
            actions.pause();
        }
    });

    // --- Modal Listeners ---
    dom.closeModalBtn.addEventListener('click', () => dom.settingsModal.classList.remove('show'));
    dom.settingsModal.addEventListener('click', (e) => {
        if (e.target === dom.settingsModal) {
            dom.settingsModal.classList.remove('show');
        }
    });
}

// --- App Initialization ---
function initializeApp() {
    dom.apiKeyInput.value = storageService.getApiKey();
    const isAutoPlay = storageService.getAutoPlay();
    dom.autoPlayToggle.checked = isAutoPlay;
    
    setState({ isAutoPlay });
    
    setupDynamicLayout(); // Setup layout first
    speechService.init();
    setupEventListeners();
    
    subscribe(appState => {
        renderUI(appState);
        if (appState.triggerAutoPlay) {
            setState({ triggerAutoPlay: false });
            actions.play();
        }
    });
    
    renderUI(getState());
    lucide.createIcons();
    console.log("Application initialized with dynamic mobile layout.");
}

initializeApp();
