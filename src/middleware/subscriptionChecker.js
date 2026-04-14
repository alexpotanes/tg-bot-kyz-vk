import { config } from '../config/env.js';

/**
 * Проверка подписки пользователя на сообщество VK
 *
 * @param {import('vk-io').VK} vk - Экземпляр VK из vk-io
 * @param {number} userId - ID пользователя VK
 * @returns {Promise<boolean>} true если пользователь состоит в сообществе
 */
export async function checkSubscription(vk, userId) {
    try {
        console.log(`[checkSubscription] userId=${userId}, group_id=${config.groups.id1}`);
        const result = await vk.api.groups.isMember({
            group_id: config.groups.id1,
            user_id: userId,
        });
        console.log(`[checkSubscription] isMember result=${result}`);
        return result === 1;
    } catch (error) {
        console.error('Ошибка проверки подписки VK:', error.message, error.code);
        return false;
    }
}
