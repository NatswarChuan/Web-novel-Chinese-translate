let wakeLock = null;

export const wakeLockService = {
    async acquire() {
        // Kiểm tra xem trình duyệt có hỗ trợ Wake Lock không
        if (!('wakeLock' in navigator)) return;

        // FIX: Chỉ yêu cầu Wake Lock nếu trang đang hiển thị.
        // Điều này ngăn lỗi "NotAllowedError" khi tab chạy trong nền.
        if (document.visibilityState !== 'visible') {
            console.log("Không thể kích hoạt Wake Lock vì trang không hiển thị.");
            return;
        }

        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { 
                wakeLock = null; 
            });
            console.log('Wake Lock đã được kích hoạt.');
        } catch (err) {
            // Ghi lại lỗi nếu nó vẫn xảy ra (ví dụ: trong trường hợp race condition)
            console.error(`Lỗi Wake Lock: ${err.name}, ${err.message}`);
        }
    },
    
    async release() {
        if (wakeLock !== null) {
            await wakeLock.release();
            wakeLock = null;
        }
    }
};
