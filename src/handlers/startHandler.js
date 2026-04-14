import { checkSubscription } from '../middleware/subscriptionChecker.js';
import { buttonsSub, buttonsStart } from '../../buttons.js';
import { startText } from '../../descriptions.js';

/**
 * Обработчик команды /start (или первого сообщения пользователя)
 *
 * Отличие от Telegram-версии:
 * - Принимает vk-io ctx вместо (bot, msg)
 * - ctx.senderId — ID пользователя (аналог msg.from.id)
 * - ctx.send() — отправить сообщение (аналог bot.sendMessage)
 * - parse_mode: 'HTML' не нужен — тексты переписаны без HTML-тегов
 *
 * @param {import('vk-io').VK} vk - Экземпляр VK из vk-io
 * @param {Object} ctx - Контекст сообщения vk-io
 */
export async function handleStart(vk, ctx) {
    const userId = ctx.senderId;

    try {
        const isSubscribed = await checkSubscription(vk, userId);

        if (isSubscribed) {
            await ctx.send(
                'По кнопке ниже можете подсчитать стоимость, заполнить ТЗ, а затем оплатить услугу',
                { keyboard: buttonsSub.toString() }
            );
        } else {
            await ctx.send(startText, { keyboard: buttonsStart.toString() });
        }
    } catch (error) {
        console.error('Ошибка в handleStart:', error);
        await ctx.send(startText, { keyboard: buttonsStart.toString() });
    }
}
