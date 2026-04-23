import { buttonsDeposit } from '../../buttons.js';
import { depositText } from '../../descriptions.js';
import { handleWebAppData } from './webAppDataHandler.js';

export async function handleCallbackQuery(vk, ctx) {
    // message_event использует eventPayload, message_new — messagePayload
    const payload = ctx.eventPayload ?? ctx.messagePayload;

    try {
        if (payload?.cmd === 'deposit') {
            await ctx.send(depositText, { keyboard: buttonsDeposit.toString() });
            return;
        }

        // Данные формы-калькулятора из VK Mini App (VKWebAppSendPayload)
        if (payload?.articles !== undefined) {
            await handleWebAppData(vk, ctx.peerId, payload);
            return;
        }
    } catch (error) {
        console.error('Ошибка в handleCallbackQuery:', error);
    }
}