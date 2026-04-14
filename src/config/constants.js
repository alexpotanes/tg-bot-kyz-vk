// Константы для расчета цен (в рублях)
export const PRICE_PER_ARTICLE = 600;
export const PRICE_PER_PHOTO = 40;

// Константа для индекса листа Google Sheets
export const GOOGLE_SHEET_INDEX = 4;

// Константы для rate limiting
export const RATE_LIMIT_WINDOW = 10000; // 10 секунд
export const MAX_REQUESTS_PER_WINDOW = 5; // максимум 5 запроса за 10 секунд

// Константы валидации
export const VALIDATION_RULES = {
    articles: {
        min: 1, // минимум 1 артикул (0 не имеет смысла для заказа)
        max: 1000,
    },
    photo: {
        min: 0, // 0 фото допустимо (только артикулы без фото)
        max: 1000,
    },
    email: {
        regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    }
};

// Результат проверки членства в сообществе VK
// groups.isMember возвращает 1 (состоит) или 0 (не состоит)
// В Telegram-версии здесь был массив строк ['creator', 'administrator', 'member']
// VK API упрощает это до числа, логика перенесена в subscriptionChecker.js
export const VK_MEMBER = 1;
