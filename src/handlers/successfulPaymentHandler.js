import { paymentService } from '../services/paymentService.js';
import { googleSheetsService } from '../services/googleSheetsService.js';
import { buttonsSub } from '../../buttons.js';
import { sendVkMessage } from '../utils/vkHelper.js';

/**
 * Обработчик успешного платежа
 *
 * Отличие от Telegram-версии:
 * - Telegram: вызывается событием 'successful_payment' внутри бота (встроенные платежи)
 * - VK:       вызывается из обработчика вебхука ЮKassa (/payment/webhook в index.js)
 *             когда ЮKassa присылает уведомление { event: 'payment.succeeded', object: { metadata: { peerId, chatId } } }
 *
 * @param {import('vk-io').VK} vk - Экземпляр VK из vk-io
 * @param {Object} paymentObject - Объект платежа из уведомления ЮKassa
 */
export async function handleSuccessfulPayment(vk, paymentObject) {
    // peerId и chatId сохранялись в metadata при создании платежа
    const { peerId, chatId } = paymentObject.metadata || {};

    if (!peerId || !chatId) {
        console.error('handleSuccessfulPayment: metadata платежа не содержит peerId/chatId', paymentObject.id);
        return;
    }

    try {
        // Получаем данные пользователя, сохранённые при отправке формы
        const userData = paymentService.getUserOrder(chatId);

        if (!userData) {
            console.error(`Данные заказа не найдены для пользователя ${chatId} при обработке платежа`);
            await sendVkMessage(vk, peerId, '❌ Ошибка: данные заказа не найдены. Пожалуйста, свяжитесь с поддержкой.');
            return;
        }

        // Получаем имя и username пользователя из VK API
        let name = String(chatId);
        let username = '';
        try {
            const [userInfo] = await vk.api.users.get({ user_ids: String(peerId) });
            name = `${userInfo.first_name} ${userInfo.last_name}`.trim();
            // VK username — screen_name (например 'id123456' или 'durov')
            username = userInfo.screen_name || '';
        } catch (e) {
            console.warn('Не удалось получить данные пользователя VK:', e.message);
        }

        // Сохраняем заказ в Google Sheets (логика без изменений)
        await googleSheetsService.saveOrder(userData, chatId, name, username);

        // Удаляем временные данные заказа
        paymentService.deleteUserOrder(chatId);

        await sendVkMessage(
            vk,
            peerId,
            '✅ Оплата прошла успешно! Ваш заказ принят.\n\nПо кнопке ниже можете подсчитать стоимость, заполнить ТЗ, а затем оплатить услугу',
            { keyboard: buttonsSub.toString() }
        );

    } catch (error) {
        console.error('Ошибка обработки успешного платежа:', error);
        await sendVkMessage(vk, peerId, '❌ Произошла ошибка при обработке платежа. Пожалуйста, свяжитесь с поддержкой.');
    }
}
