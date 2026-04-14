import axios from 'axios';
import { config } from '../config/env.js';
import { calculatePrice } from './priceCalculator.js';
// Утилита вынесена в отдельный модуль чтобы избежать циклической зависимости
// paymentService → webAppDataHandler → paymentService
import { sendVkMessage } from '../utils/vkHelper.js';

/**
 * Базовый URL ЮKassa REST API
 */
const YOOKASSA_API = 'https://api.yookassa.ru/v3';

/**
 * Класс для управления платежами и данными пользователей
 *
 * Отличие от Telegram-версии:
 * - Telegram: bot.sendInvoice() — встроенные платежи через Telegram Payments API
 * - VK/ЮKassa: создаём платёж через ЮKassa REST API → получаем confirmation_url
 *              → отправляем ссылку пользователю сообщением в VK
 *
 * Поток оплаты:
 *   1. createPaymentLink() создаёт платёж в ЮKassa, сохраняет peerId в metadata
 *   2. Пользователь переходит по ссылке и оплачивает
 *   3. ЮKassa присылает вебхук на /payment/webhook
 *   4. handlePaymentWebhook() → handleSuccessfulPayment() → saveOrder() в Google Sheets
 */
export class PaymentService {
    constructor() {
        // Хранилище данных заказов пользователей (по chatId = String(peerId))
        this.userDataMap = new Map();
    }

    /**
     * Сохранение данных заказа пользователя
     * @param {string} chatId - ID пользователя (строка)
     * @param {Object} orderData - Данные заказа
     */
    saveUserOrder(chatId, orderData) {
        this.userDataMap.set(chatId, orderData);
    }

    /**
     * Получение данных заказа пользователя
     * @param {string} chatId
     * @returns {Object|null}
     */
    getUserOrder(chatId) {
        return this.userDataMap.get(chatId) || null;
    }

    /**
     * Удаление данных заказа после успешной обработки
     * @param {string} chatId
     */
    deleteUserOrder(chatId) {
        this.userDataMap.delete(chatId);
    }

    /**
     * Создание платежа в ЮKassa и отправка ссылки пользователю VK
     *
     * Замена bot.sendInvoice() из Telegram-версии.
     * Вместо встроенного счёта — ссылка на страницу оплаты ЮKassa.
     *
     * @param {import('vk-io').VK} vk
     * @param {number|string} peerId - VK peer_id пользователя
     * @param {Object} orderData - Данные заказа
     */
    async createPaymentLink(vk, peerId, orderData) {
        const { articles, photo, email } = orderData;
        const price = calculatePrice(articles, photo);
        const chatId = String(peerId);

        // Idempotence-Key предотвращает создание дублирующих платежей
        // при повторных запросах (требование ЮKassa API)
        const idempotenceKey = `${chatId}-${Date.now()}`;

        const response = await axios.post(
            `${YOOKASSA_API}/payments`,
            {
                amount: {
                    value: price.toFixed(2),
                    currency: 'RUB',
                },
                // redirect — пользователь оплачивает на странице ЮKassa
                // После оплаты перенаправляется на return_url
                confirmation: {
                    type: 'redirect',
                    // TODO: можно заменить на страницу "спасибо за оплату" вашего сайта
                    return_url: 'https://vk.com',
                },
                capture: true, // автоматическое подтверждение платежа
                description: `Заказ: ${articles} арт. × ${photo} фото`,
                receipt: {
                    customer: {
                        email: email,
                    },
                    items: [
                        {
                            description: 'Контент-генерация (артикулы и фото)',
                            quantity: 1,
                            amount: {
                                value: price.toFixed(2),
                                currency: 'RUB',
                            },
                            vat_code: 1,
                            payment_mode: 'full_payment',
                            payment_subject: 'service',
                        },
                    ],
                },
                // metadata сохраняется в объекте платежа и будет доступна в вебхуке
                // Используем для идентификации пользователя при подтверждении оплаты
                metadata: {
                    peerId: String(peerId),
                    chatId: chatId,
                },
            },
            {
                // Аутентификация ЮKassa: shopId:secretKey
                auth: {
                    username: config.payment.shopId,
                    password: config.payment.secretKey,
                },
                headers: {
                    'Idempotence-Key': idempotenceKey,
                    'Content-Type': 'application/json',
                },
            }
        );

        const payment = response.data;
        const paymentUrl = payment.confirmation?.confirmation_url;

        if (!paymentUrl) {
            throw new Error(`ЮKassa не вернула ссылку на оплату. Статус: ${payment.status}`);
        }

        // Отправляем пользователю ссылку на оплату
        await sendVkMessage(
            vk,
            peerId,
            `💳 Ваш заказ:\n` +
            `• Артикулов: ${articles}\n` +
            `• Фото на артикул: ${photo}\n` +
            `• Итого: ${price} ₽\n\n` +
            `Для оплаты перейдите по ссылке:\n${paymentUrl}`
        );
    }

    /**
     * Проверка платежа перед обработкой (защита от поддельных вебхуков)
     *
     * Запрашивает актуальные данные платежа у ЮKassa API и проверяет статус.
     * Рекомендуется также настроить IP-фильтрацию вебхуков в nginx/firewall
     * (разрешить только IP-адреса ЮKassa).
     *
     * @param {Object} paymentObject - Объект платежа из вебхука
     * @returns {Promise<boolean>} true если платёж действителен
     */
    async verifyPayment(paymentObject) {
        try {
            const response = await axios.get(
                `${YOOKASSA_API}/payments/${paymentObject.id}`,
                {
                    auth: {
                        username: config.payment.shopId,
                        password: config.payment.secretKey,
                    },
                }
            );

            // Сверяем статус и сумму с ожидаемыми значениями
            const verified = response.data;
            const { peerId, chatId } = verified.metadata || {};
            const userData = this.getUserOrder(chatId);

            if (!userData) {
                console.warn(`verifyPayment: данные заказа не найдены для chatId=${chatId}`);
                // Данные могут быть уже удалены при повторном вебхуке — не блокируем
                return verified.status === 'succeeded';
            }

            const expectedPrice = calculatePrice(userData.articles, userData.photo);
            const actualPrice = parseFloat(verified.amount.value);

            if (Math.abs(expectedPrice - actualPrice) > 0.01) {
                console.error(
                    `Несовпадение суммы: ожидалось ${expectedPrice} ₽, пришло ${actualPrice} ₽ (платёж ${paymentObject.id})`
                );
                return false;
            }

            return verified.status === 'succeeded';
        } catch (error) {
            console.error('Ошибка верификации платежа ЮKassa:', error.message);
            return false;
        }
    }
}

// Singleton instance
export const paymentService = new PaymentService();
