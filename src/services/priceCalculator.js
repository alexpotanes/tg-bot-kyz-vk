import { PRICE_PER_ARTICLE, PRICE_PER_PHOTO } from '../config/constants.js';

/**
 * Расчет цены заказа
 * @param {number} articles - Количество артикулов
 * @param {number} photo - Количество фото на артикул
 * @returns {number} Цена в рублях
 */
export function calculatePrice(articles, photo) {
    if (!Number.isInteger(articles) || !Number.isInteger(photo)) {
        throw new Error('Articles and photo must be integers');
    }

    if (articles < 0 || photo < 0) {
        throw new Error('Articles and photo must be non-negative');
    }

    return (articles * PRICE_PER_ARTICLE) + ((articles * photo) * PRICE_PER_PHOTO);
}

/**
 * Конвертация рублей в копейки для платежного API
 * @param {number} rubles - Сумма в рублях
 * @returns {number} Сумма в копейках
 */
export function rublesToKopecks(rubles) {
    return Math.round(rubles * 100);
}

/**
 * Конвертация копеек в рубли
 * @param {number} kopecks - Сумма в копейках
 * @returns {number} Сумма в рублях
 */
export function kopecksToRubles(kopecks) {
    return kopecks / 100;
}
