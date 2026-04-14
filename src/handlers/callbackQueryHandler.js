import { buttonsDeposit, buttonsSub } from '../../buttons.js';
import { depositText } from '../../descriptions.js';

export async function handleCallbackQuery(vk, ctx) {
    const payload = ctx.messagePayload;

    try {
        if (payload?.cmd === 'deposit') {
            await ctx.send(depositText, { keyboard: buttonsDeposit.toString() });
        }
    } catch (error) {
        console.error('Ошибка в handleCallbackQuery:', error);
    }
}
