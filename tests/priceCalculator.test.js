/**
 * Тесты для расчета цен
 */

import { calculatePrice, rublesToKopecks, kopecksToRubles } from '../src/services/priceCalculator.js';
import { PRICE_PER_ARTICLE, PRICE_PER_PHOTO } from '../src/config/constants.js';

describe('calculatePrice', () => {
    test('должен правильно рассчитывать цену для стандартного заказа', () => {
        const articles = 10;
        const photo = 5;
        const expectedPrice = (10 * 600) + ((10 * 5) * 40); // 6000 + 2000 = 8000

        expect(calculatePrice(articles, photo)).toBe(expectedPrice);
    });

    test('должен рассчитывать цену только за артикулы когда фото = 0', () => {
        const articles = 5;
        const photo = 0;
        const expectedPrice = 5 * PRICE_PER_ARTICLE; // 3000

        expect(calculatePrice(articles, photo)).toBe(expectedPrice);
    });

    test('должен правильно работать с минимальными значениями', () => {
        const articles = 1;
        const photo = 0;
        const expectedPrice = 1 * PRICE_PER_ARTICLE; // 600

        expect(calculatePrice(articles, photo)).toBe(expectedPrice);
    });

    test('должен правильно работать с максимальными значениями', () => {
        const articles = 1000;
        const photo = 100;
        const expectedPrice = (1000 * 600) + ((1000 * 100) * 40); // 600000 + 4000000 = 4600000

        expect(calculatePrice(articles, photo)).toBe(expectedPrice);
    });

    test('должен выбрасывать ошибку для нецелых артикулов', () => {
        expect(() => calculatePrice(10.5, 5)).toThrow('must be integers');
    });

    test('должен выбрасывать ошибку для нецелых фото', () => {
        expect(() => calculatePrice(10, 5.5)).toThrow('must be integers');
    });

    test('должен выбрасывать ошибку для отрицательных артикулов', () => {
        expect(() => calculatePrice(-1, 5)).toThrow('must be non-negative');
    });

    test('должен выбрасывать ошибку для отрицательных фото', () => {
        expect(() => calculatePrice(10, -1)).toThrow('must be non-negative');
    });

    test('должен возвращать 0 для 0 артикулов', () => {
        // Технически это не валидный заказ, но математически корректно
        // В реальной системе это должно быть отклонено валидацией
        expect(calculatePrice(0, 0)).toBe(0);
    });

    test('должен правильно применять формулу расчета', () => {
        // Тест проверяет правильность формулы
        const articles = 7;
        const photo = 3;

        const manualCalculation = (articles * PRICE_PER_ARTICLE) + ((articles * photo) * PRICE_PER_PHOTO);
        expect(calculatePrice(articles, photo)).toBe(manualCalculation);
    });
});

describe('rublesToKopecks', () => {
    test('должен конвертировать рубли в копейки', () => {
        expect(rublesToKopecks(100)).toBe(10000);
    });

    test('должен правильно округлять дробные копейки', () => {
        expect(rublesToKopecks(100.005)).toBe(10001);
        expect(rublesToKopecks(100.004)).toBe(10000);
    });

    test('должен обрабатывать 0', () => {
        expect(rublesToKopecks(0)).toBe(0);
    });

    test('должен обрабатывать дробные рубли', () => {
        expect(rublesToKopecks(1.5)).toBe(150);
    });

    test('должен обрабатывать большие суммы', () => {
        expect(rublesToKopecks(10000)).toBe(1000000);
    });
});

describe('kopecksToRubles', () => {
    test('должен конвертировать копейки в рубли', () => {
        expect(kopecksToRubles(10000)).toBe(100);
    });

    test('должен обрабатывать 0', () => {
        expect(kopecksToRubles(0)).toBe(0);
    });

    test('должен обрабатывать нечетные копейки', () => {
        expect(kopecksToRubles(150)).toBe(1.5);
    });

    test('должен обрабатывать большие суммы', () => {
        expect(kopecksToRubles(1000000)).toBe(10000);
    });

    test('конвертация туда-обратно должна быть идемпотентной', () => {
        const rubles = 12345.67;
        const roundedRubles = Math.round(rubles * 100) / 100;
        expect(kopecksToRubles(rublesToKopecks(rubles))).toBe(roundedRubles);
    });
});

describe('Integration: calculatePrice with currency conversion', () => {
    test('должен правильно работать с конвертацией в копейки для платежного API', () => {
        const articles = 10;
        const photo = 5;
        const priceInRubles = calculatePrice(articles, photo);
        const priceInKopecks = rublesToKopecks(priceInRubles);

        // Проверяем, что конвертация корректна
        expect(priceInKopecks).toBe(priceInRubles * 100);
    });
});
