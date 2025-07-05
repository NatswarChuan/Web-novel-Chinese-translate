import { wakeLockService } from './wakeLockService.js';

// --- Constants and Helpers ---
const MOBILE_BREAKPOINT = 1024; // Ngưỡng để xác định là thiết bị di động/máy tính bảng
const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT;

// --- State Variables ---
let vietnameseVoice = null;
let currentSentenceIndex = -1;
let sentenceSpans = [];
let lastHighlightedWord = null;
let lastHighlightedSentence = null; // Biến mới để theo dõi câu được tô sáng
let onDoneCallback = () => {};

/**
 * Xóa tất cả các hiệu ứng tô sáng (cả từ và câu).
 * Được gọi trước khi đọc câu mới hoặc khi dừng lại.
 */
function clearAllHighlights() {
    if (lastHighlightedWord) {
        lastHighlightedWord.classList.remove('highlight-word');
        lastHighlightedWord = null;
    }
    if (lastHighlightedSentence) {
        lastHighlightedSentence.classList.remove('highlight-sentence');
        lastHighlightedSentence = null;
    }
}

/**
 * Tìm kiếm và lưu trữ giọng đọc tiếng Việt có sẵn trong trình duyệt.
 */
function findVietnameseVoice() {
    return new Promise((resolve) => {
        if (vietnameseVoice) return resolve(vietnameseVoice);
        const getVoices = () => {
            const voices = speechSynthesis.getVoices();
            const foundVoice = voices.find(v => v.lang.startsWith('vi'));
            if (foundVoice) {
                vietnameseVoice = foundVoice;
                resolve(vietnameseVoice);
            }
            return foundVoice;
        };
        if (!getVoices()) {
            speechSynthesis.onvoiceschanged = () => {
                if (getVoices()) speechSynthesis.onvoiceschanged = null;
            };
        }
    });
}

/**
 * Hàm chính để đọc câu tiếp theo trong danh sách.
 * Logic tô sáng sẽ được quyết định dựa trên kích thước màn hình.
 */
function playNext() {
    // Xóa các highlight của câu trước đó
    clearAllHighlights();

    // Nếu đã đọc hết, gọi callback và kết thúc
    if (currentSentenceIndex < 0 || currentSentenceIndex >= sentenceSpans.length) {
        onDoneCallback();
        return;
    }

    const currentSentenceSpan = sentenceSpans[currentSentenceIndex];
    currentSentenceSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const textToRead = currentSentenceSpan.textContent;
    
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.voice = vietnameseVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // **LOGIC CHÍNH: Lựa chọn kiểu tô sáng dựa trên thiết bị**
    if (isMobile()) {
        // Trên Mobile/Tablet: Tô sáng cả câu
        currentSentenceSpan.classList.add('highlight-sentence');
        lastHighlightedSentence = currentSentenceSpan;
    } else {
        // Trên PC: Tô sáng từng từ bằng onboundary
        const wordSpansForCurrentSentence = currentSentenceSpan.wordSpans || [];
        utterance.onboundary = (event) => {
            if (event.name !== 'word' || !wordSpansForCurrentSentence.length) return;
            
            // Xóa highlight của từ trước đó
            if (lastHighlightedWord) {
                lastHighlightedWord.classList.remove('highlight-word');
            }

            let charCounter = 0;
            let wordToHighlight = null;
            for (const wordSpan of wordSpansForCurrentSentence) {
                const wordLength = wordSpan.textContent.length;
                if (event.charIndex >= charCounter && event.charIndex < charCounter + wordLength) {
                    wordToHighlight = wordSpan;
                    break;
                }
                charCounter += wordLength + 1; // +1 cho khoảng trắng
            }
            if (wordToHighlight) {
                wordToHighlight.classList.add('highlight-word');
                lastHighlightedWord = wordToHighlight;
            }
        };
    }
    
    // Khi đọc xong một câu
    utterance.onend = () => {
        currentSentenceIndex++;
        playNext(); // Tự động chuyển sang câu tiếp theo
    };
    
    // Xử lý lỗi
    utterance.onerror = (e) => {
        if (e.error !== 'interrupted') {
            console.error(`Lỗi đọc: ${e.error}`, e);
            onDoneCallback();
        }
    };

    speechSynthesis.speak(utterance);
}

// --- Public Speech Service ---
export const speechService = {
    isSupported: 'speechSynthesis' in window,
    getCurrentIndex() { return currentSentenceIndex; },
    
    async init() {
        if (!this.isSupported) return;
        await findVietnameseVoice();
        console.log("Speech service initialized with device-specific highlighting.");
    },

    setSentences(spans) {
        sentenceSpans = spans;
    },

    play(index, onDone) {
        onDoneCallback = onDone || (() => {});
        if (typeof index !== 'undefined') {
            currentSentenceIndex = index;
        }
        speechSynthesis.cancel(); // Luôn hủy bỏ tác vụ cũ để bắt đầu mới
        playNext();
    },

    pause() {
        speechSynthesis.pause();
    },

    resume() {
        speechSynthesis.resume();
    },

    stop() {
        currentSentenceIndex = -1;
        speechSynthesis.cancel();
        clearAllHighlights(); // Đảm bảo xóa mọi highlight khi dừng
        wakeLockService.release();
    },
};
