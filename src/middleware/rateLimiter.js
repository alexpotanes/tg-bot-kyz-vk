import { RATE_LIMIT_WINDOW, MAX_REQUESTS_PER_WINDOW } from '../config/constants.js';

/**
 * Класс для управления rate limiting
 */
export class RateLimiter {
    constructor() {
        // Хранилище временных меток запросов по userId
        this.userRequestTimestamps = new Map();
    }

    /**
     * Проверка, не превышен ли лимит запросов для пользователя
     * @param {string} userId - ID пользователя
     * @returns {boolean} true если запрос разрешен, false если превышен лимит
     */
    checkLimit(userId) {
        const now = Date.now();
        const userRequests = this.userRequestTimestamps.get(userId) || [];

        // Фильтруем запросы за последние RATE_LIMIT_WINDOW миллисекунд
        const recentRequests = userRequests.filter(
            timestamp => now - timestamp < RATE_LIMIT_WINDOW
        );

        if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
            return false; // Превышен лимит
        }

        // Добавляем текущий запрос
        recentRequests.push(now);
        this.userRequestTimestamps.set(userId, recentRequests);

        return true; // Запрос разрешен
    }

    /**
     * Очистка старых записей (для экономии памяти)
     * Вызывается периодически
     */
    cleanup() {
        const now = Date.now();
        for (const [userId, timestamps] of this.userRequestTimestamps.entries()) {
            const recentRequests = timestamps.filter(
                timestamp => now - timestamp < RATE_LIMIT_WINDOW
            );

            if (recentRequests.length === 0) {
                this.userRequestTimestamps.delete(userId);
            } else {
                this.userRequestTimestamps.set(userId, recentRequests);
            }
        }
    }

    /**
     * Сброс лимита для конкретного пользователя
     * @param {string} userId - ID пользователя
     */
    reset(userId) {
        this.userRequestTimestamps.delete(userId);
    }

    /**
     * Получение количества оставшихся запросов
     * @param {string} userId - ID пользователя
     * @returns {number} Количество доступных запросов
     */
    getRemainingRequests(userId) {
        const now = Date.now();
        const userRequests = this.userRequestTimestamps.get(userId) || [];
        const recentRequests = userRequests.filter(
            timestamp => now - timestamp < RATE_LIMIT_WINDOW
        );

        return Math.max(0, MAX_REQUESTS_PER_WINDOW - recentRequests.length);
    }
}

export const rateLimiter = new RateLimiter();

setInterval(() => {
    rateLimiter.cleanup();
}, 5 * 60 * 1000);
