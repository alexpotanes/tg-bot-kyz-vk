/**
 * Тесты для rate limiting
 */

import { RateLimiter } from '../src/middleware/rateLimiter.js';
import { MAX_REQUESTS_PER_WINDOW, RATE_LIMIT_WINDOW } from '../src/config/constants.js';

describe('RateLimiter', () => {
    let rateLimiter;

    beforeEach(() => {
        rateLimiter = new RateLimiter();
    });

    test('должен разрешать первый запрос', () => {
        const userId = 'user1';
        expect(rateLimiter.checkLimit(userId)).toBe(true);
    });

    test('должен разрешать запросы до лимита', () => {
        const userId = 'user1';

        for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
            expect(rateLimiter.checkLimit(userId)).toBe(true);
        }
    });

    test('должен отклонять запросы после превышения лимита', () => {
        const userId = 'user1';

        // Делаем MAX_REQUESTS_PER_WINDOW запросов
        for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
            rateLimiter.checkLimit(userId);
        }

        // Следующий запрос должен быть отклонен
        expect(rateLimiter.checkLimit(userId)).toBe(false);
    });

    test('должен изолировать лимиты между разными пользователями', () => {
        const user1 = 'user1';
        const user2 = 'user2';

        // User1 исчерпывает свой лимит
        for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
            rateLimiter.checkLimit(user1);
        }

        // User2 все еще может делать запросы
        expect(rateLimiter.checkLimit(user2)).toBe(true);
    });

    test('должен сбрасывать лимит после окна времени', async () => {
        const userId = 'user1';

        // Исчерпываем лимит
        for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
            rateLimiter.checkLimit(userId);
        }

        // Должен быть заблокирован
        expect(rateLimiter.checkLimit(userId)).toBe(false);

        // Ждем чуть больше, чем окно rate limit
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WINDOW + 100));

        // Теперь должен быть разрешен
        expect(rateLimiter.checkLimit(userId)).toBe(true);
    }, RATE_LIMIT_WINDOW + 5000); // Увеличиваем timeout для теста

    test('должен правильно обрабатывать частичное истечение окна', async () => {
        const userId = 'user1';

        // Делаем 4 запроса
        rateLimiter.checkLimit(userId);
        rateLimiter.checkLimit(userId);
        rateLimiter.checkLimit(userId);
        rateLimiter.checkLimit(userId);

        // Ждем половину окна
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WINDOW / 2));

        // Делаем еще 1 запрос (всего 5, достигли лимита)
        rateLimiter.checkLimit(userId);

        // Следующий должен быть отклонен
        expect(rateLimiter.checkLimit(userId)).toBe(false);

        // Ждем еще половину окна (первые 2 запроса должны истечь)
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WINDOW / 2 + 100));

        // Теперь должен быть разрешен (старые запросы истекли)
        expect(rateLimiter.checkLimit(userId)).toBe(true);
    }, RATE_LIMIT_WINDOW + 5000);

    test('reset должен сбрасывать лимит для пользователя', () => {
        const userId = 'user1';

        // Исчерпываем лимит
        for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
            rateLimiter.checkLimit(userId);
        }

        // Должен быть заблокирован
        expect(rateLimiter.checkLimit(userId)).toBe(false);

        // Сбрасываем
        rateLimiter.reset(userId);

        // Теперь должен быть разрешен
        expect(rateLimiter.checkLimit(userId)).toBe(true);
    });

    test('getRemainingRequests должен возвращать правильное количество', () => {
        const userId = 'user1';

        expect(rateLimiter.getRemainingRequests(userId)).toBe(MAX_REQUESTS_PER_WINDOW);

        rateLimiter.checkLimit(userId);
        expect(rateLimiter.getRemainingRequests(userId)).toBe(MAX_REQUESTS_PER_WINDOW - 1);

        rateLimiter.checkLimit(userId);
        expect(rateLimiter.getRemainingRequests(userId)).toBe(MAX_REQUESTS_PER_WINDOW - 2);
    });

    test('getRemainingRequests должен возвращать 0 после превышения лимита', () => {
        const userId = 'user1';

        // Исчерпываем лимит
        for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
            rateLimiter.checkLimit(userId);
        }

        expect(rateLimiter.getRemainingRequests(userId)).toBe(0);
    });

    test('cleanup должен удалять устаревшие записи', async () => {
        const userId = 'user1';

        rateLimiter.checkLimit(userId);

        // Ждем больше окна времени
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WINDOW + 100));

        // Вызываем cleanup
        rateLimiter.cleanup();

        // Проверяем, что записи удалены (новый запрос должен получить полный лимит)
        expect(rateLimiter.getRemainingRequests(userId)).toBe(MAX_REQUESTS_PER_WINDOW);
    }, RATE_LIMIT_WINDOW + 5000);

    test('cleanup не должен удалять активные записи', () => {
        const userId = 'user1';

        rateLimiter.checkLimit(userId);
        rateLimiter.cleanup();

        // Записи не должны быть удалены
        expect(rateLimiter.getRemainingRequests(userId)).toBe(MAX_REQUESTS_PER_WINDOW - 1);
    });

    test('должен обрабатывать множество пользователей одновременно', () => {
        const userCount = 10;
        const users = Array.from({ length: userCount }, (_, i) => `user${i}`);

        // Каждый пользователь делает 1 запрос
        users.forEach(userId => {
            expect(rateLimiter.checkLimit(userId)).toBe(true);
        });

        // У каждого должно остаться 2 запроса
        users.forEach(userId => {
            expect(rateLimiter.getRemainingRequests(userId)).toBe(MAX_REQUESTS_PER_WINDOW - 1);
        });
    });
});
