import { paymentService } from '../services/paymentService.js';
import { handleSuccessfulPayment } from './successfulPaymentHandler.js';

/**
 * Обработчик вебхука от ЮKassa
 *
 * Отличие от Telegram-версии:
 * - Telegram: 'pre_checkout_query' — синхронная валидация до списания денег
 * - VK/ЮKassa: вебхук — асинхронное уведомление ПОСЛЕ завершения платежа
 *              Регистрируется в личном кабинете ЮKassa: Интеграция → HTTP-уведомления
 *              URL: https://YOUR_SERVER/payment/webhook
 *
 * ЮKassa присылает уведомления при событиях:
 *   - payment.succeeded  — платёж успешно завершён
 *   - payment.canceled   — платёж отменён
 *   - refund.succeeded   — возврат средств
 *
 * @param {import('vk-io').VK} vk - Экземпляр VK из vk-io
 * @param {Object} webhookBody - Тело POST-запроса от ЮKassa
 * @returns {boolean} true если вебхук обработан успешно
 */
export async function handlePaymentWebhook(vk, webhookBody) {
    const { event, object: paymentObject } = webhookBody;

    try {
        if (event === 'payment.succeeded') {
            console.log(`✅ Получено уведомление об успешной оплате: ${paymentObject.id}`);

            // Проверяем, что платёж действительно прошёл (дополнительная защита)
            const isValid = await paymentService.verifyPayment(paymentObject);

            if (!isValid) {
                console.error(`❌ Валидация платежа не пройдена: ${paymentObject.id}`);
                return false;
            }

            await handleSuccessfulPayment(vk, paymentObject);

        } else if (event === 'payment.canceled') {
            console.log(`ℹ️ Платёж отменён: ${paymentObject.id}`);
            // Опционально: уведомить пользователя об отмене платежа
            const { peerId } = paymentObject.metadata || {};
            if (peerId) {
                const { sendVkMessage } = await import('../utils/vkHelper.js');
                await sendVkMessage(vk, peerId, '❌ Платёж был отменён. Пожалуйста, попробуйте снова.');
            }

        } else {
            console.log(`ℹ️ Получено событие ЮKassa: ${event}`);
        }

        return true;
    } catch (error) {
        console.error('Ошибка обработки вебхука ЮKassa:', error);
        return false;
    }
}
