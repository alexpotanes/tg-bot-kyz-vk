import { validateOrderData } from '../validators/orderValidator.js';
import { paymentService } from '../services/paymentService.js';
import { sendVkMessage } from '../utils/vkHelper.js';

/**
 * Обработчик данных формы заказа
 *
 * Отличие от Telegram-версии:
 * - Telegram: данные приходят через msg.web_app_data.data (встроенный WebApp)
 * - VK:       данные приходят через POST-запрос на Express-эндпоинт /webapp-data
 *             Веб-приложение на Vercel должно отправить POST с полями:
 *             { peerId, articles, photo, email, fashion, product, references, hair, race, productImg, acceptResult, acceptQuantity }
 *
 *             Для этого в React-приложении замените:
 *               window.Telegram.WebApp.sendData(JSON.stringify(data))
 *             на:
 *               fetch('https://YOUR_SERVER/webapp-data', { method: 'POST', body: JSON.stringify({ peerId: userId, ...data }) })
 *             где userId — VK user_id, полученный через vk-bridge:
 *               bridge.send('VKWebAppGetUserInfo').then(({ id }) => ...)
 *
 * @param {import('vk-io').VK} vk - Экземпляр VK из vk-io
 * @param {number|string} peerId - ID пользователя VK (peer_id для отправки сообщений)
 * @param {Object} rawData - Данные формы из тела POST-запроса
 */
export async function handleWebAppData(vk, peerId, rawData) {
    // peerId используется как chatId для хранения данных заказа
    const chatId = String(peerId);

    try {
        const parsedData = {
            articles: Number(rawData.articles),
            photo: Number(rawData.photo),
            email: rawData.email,
            fashion: rawData.fashion || '',
            product: rawData.product || '',
            references: rawData.references || '',
            hair: rawData.hair || '',
            race: rawData.race || '',
            productImg: rawData.productImg || '',
            acceptResult: rawData.acceptResult || '',
            acceptQuantity: rawData.acceptQuantity || '',
        };

        // Валидация входных данных (без изменений)
        const validationErrors = validateOrderData(parsedData);
        if (validationErrors.length > 0) {
            await sendVkMessage(vk, peerId, `❌ Ошибка валидации:\n${validationErrors.join('\n')}`);
            return;
        }

        // Сохраняем данные заказа для дальнейшей обработки после оплаты
        paymentService.saveUserOrder(chatId, parsedData);

        // Создаём платёж через ЮKassa и отправляем пользователю ссылку на оплату
        await paymentService.createPaymentLink(vk, peerId, parsedData);

    } catch (error) {
        console.error('Ошибка обработки данных формы:', error);
        // Пробуем уведомить пользователя в VK, но не даём этой ошибке скрыть основную
        sendVkMessage(vk, peerId, '❌ Произошла ошибка при обработке заказа. Пожалуйста, попробуйте ещё раз.')
            .catch(e => console.error('Не удалось отправить сообщение об ошибке пользователю:', e.message));
        throw error;
    }
}

// sendVkMessage реэкспортируется для обратной совместимости с другими модулями
export { sendVkMessage };
