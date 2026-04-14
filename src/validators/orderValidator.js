import { VALIDATION_RULES } from '../config/constants.js';

/**
 * Валидация данных заказа
 * @param {Object} data - Данные заказа
 * @param {number} data.articles - Количество артикулов
 * @param {number} data.photo - Количество фото
 * @param {string} data.email - Email пользователя
 * @returns {string[]} Массив ошибок валидации (пустой массив если нет ошибок)
 */
export function validateOrderData(data) {
    const { articles, photo, email } = data;
    const errors = [];

    // Проверка количества артикулов
    if (!Number.isInteger(articles) ||
        articles < VALIDATION_RULES.articles.min ||
        articles > VALIDATION_RULES.articles.max) {
        errors.push(`Количество артикулов должно быть целым числом от ${VALIDATION_RULES.articles.min} до ${VALIDATION_RULES.articles.max}`);
    }

    // Проверка количества фото
    if (!Number.isInteger(photo) ||
        photo < VALIDATION_RULES.photo.min ||
        photo > VALIDATION_RULES.photo.max) {
        errors.push(`Количество фото должно быть целым числом от ${VALIDATION_RULES.photo.min} до ${VALIDATION_RULES.photo.max}`);
    }

    // Проверка email
    if (!email || !VALIDATION_RULES.email.regex.test(email)) {
        errors.push('Некорректный email адрес');
    }

    return errors;
}

/**
 * Проверка, что данные существуют и не null/undefined
 * @param {Object} data - Данные для проверки
 * @returns {boolean} true если данные валидны
 */
export function validateDataExists(data) {
    return data !== null && data !== undefined && typeof data === 'object';
}
