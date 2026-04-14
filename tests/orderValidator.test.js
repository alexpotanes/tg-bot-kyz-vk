/**
 * Тесты для валидации заказов
 */

import { validateOrderData, validateDataExists } from '../src/validators/orderValidator.js';

describe('validateOrderData', () => {
    test('должен принимать валидные данные заказа', () => {
        const validOrder = {
            articles: 10,
            photo: 5,
            email: 'test@example.com'
        };

        const errors = validateOrderData(validOrder);
        expect(errors).toEqual([]);
    });

    test('должен отклонять количество артикулов меньше минимума', () => {
        const invalidOrder = {
            articles: 0,
            photo: 5,
            email: 'test@example.com'
        };

        const errors = validateOrderData(invalidOrder);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('артикулов');
    });

    test('должен отклонять количество артикулов больше максимума', () => {
        const invalidOrder = {
            articles: 1001,
            photo: 5,
            email: 'test@example.com'
        };

        const errors = validateOrderData(invalidOrder);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('артикулов');
    });

    test('должен отклонять нецелое количество артикулов', () => {
        const invalidOrder = {
            articles: 10.5,
            photo: 5,
            email: 'test@example.com'
        };

        const errors = validateOrderData(invalidOrder);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('целым числом');
    });

    test('должен отклонять отрицательное количество фото', () => {
        const invalidOrder = {
            articles: 10,
            photo: -1,
            email: 'test@example.com'
        };

        const errors = validateOrderData(invalidOrder);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('фото');
    });

    test('должен отклонять количество фото больше максимума', () => {
        const invalidOrder = {
            articles: 10,
            photo: 1001,
            email: 'test@example.com'
        };

        const errors = validateOrderData(invalidOrder);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('фото');
    });

    test('должен отклонять некорректный email', () => {
        const invalidOrder = {
            articles: 10,
            photo: 5,
            email: 'invalid-email'
        };

        const errors = validateOrderData(invalidOrder);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('email');
    });

    test('должен отклонять email без домена', () => {
        const invalidOrder = {
            articles: 10,
            photo: 5,
            email: 'test@'
        };

        const errors = validateOrderData(invalidOrder);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('email');
    });

    test('должен отклонять пустой email', () => {
        const invalidOrder = {
            articles: 10,
            photo: 5,
            email: ''
        };

        const errors = validateOrderData(invalidOrder);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('email');
    });

    test('должен возвращать несколько ошибок для нескольких некорректных полей', () => {
        const invalidOrder = {
            articles: 0,
            photo: -1,
            email: 'bad-email'
        };

        const errors = validateOrderData(invalidOrder);
        expect(errors.length).toBe(3);
    });

    test('должен принимать граничные значения', () => {
        const edgeCaseOrder = {
            articles: 1, // минимум
            photo: 100, // максимум
            email: 'a@b.c'
        };

        const errors = validateOrderData(edgeCaseOrder);
        expect(errors).toEqual([]);
    });

    test('должен принимать 0 фото', () => {
        const orderWithNoPhotos = {
            articles: 10,
            photo: 0,
            email: 'test@example.com'
        };

        const errors = validateOrderData(orderWithNoPhotos);
        expect(errors).toEqual([]);
    });
});

describe('validateDataExists', () => {
    test('должен возвращать true для валидного объекта', () => {
        expect(validateDataExists({ key: 'value' })).toBe(true);
    });

    test('должен возвращать false для null', () => {
        expect(validateDataExists(null)).toBe(false);
    });

    test('должен возвращать false для undefined', () => {
        expect(validateDataExists(undefined)).toBe(false);
    });

    test('должен возвращать false для не-объекта', () => {
        expect(validateDataExists('string')).toBe(false);
        expect(validateDataExists(123)).toBe(false);
        expect(validateDataExists(true)).toBe(false);
    });
});
