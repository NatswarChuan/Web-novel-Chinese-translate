import { MODEL_NAME, PROMPT_TEMPLATE } from './config.js';

export const apiService = {
    async translate(apiKey, sourceText) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
        const prompt = PROMPT_TEMPLATE.replace('{SOURCE_TEXT}', sourceText);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            let msg = errorBody.error?.message || 'Lỗi không xác định từ API';
            if (msg.includes('API key not valid')) msg = "API Key không hợp lệ hoặc đã hết hạn.";
            throw new Error(msg);
        }

        const result = await response.json();
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            return result.candidates[0].content.parts[0].text;
        }
        throw new Error("Phản hồi từ API có cấu trúc không hợp lệ.");
    }
};
