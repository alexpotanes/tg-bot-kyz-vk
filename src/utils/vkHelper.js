/**
 * Вспомогательные функции для работы с VK API
 *
 * Вынесены в отдельный модуль чтобы избежать циклических зависимостей
 * между handlers и services.
 */

/**
 * Отправка сообщения пользователю VK вне контекста ctx
 * (аналог bot.sendMessage(chatId, text, options) из Telegram)
 *
 * В Telegram-версии каждый handler получал экземпляр bot и вызывал
 * bot.sendMessage(chatId, text, options).
 * В VK-версии внутри обработчиков событий есть ctx.send(),
 * но для отправки из вебхуков ЮKassa (без ctx) нужен прямой вызов API.
 *
 * @param {import('vk-io').VK} vk - Экземпляр VK из vk-io
 * @param {number|string} peerId - VK peer_id получателя
 * @param {string} message - Текст сообщения
 * @param {Object} [options] - Дополнительные параметры (keyboard и т.д.)
 */
export async function sendVkMessage(vk, peerId, message, options = {}) {
    await vk.api.messages.send({
        peer_id: Number(peerId),
        message,
        // random_id обязателен для VK API — предотвращает дублирование сообщений
        random_id: Math.floor(Math.random() * 2147483647),
        ...options,
    });
}
