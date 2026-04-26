/**
 * Кнопки для VK Keyboard API (vk-io)
 *
 * Отличия от Telegram:
 * - inline_keyboard → Keyboard.builder().inline()  (прикреплена к сообщению)
 * - reply keyboard  → Keyboard.builder()            (постоянная клавиатура внизу экрана)
 * - web_app         → urlButton()                   (VK открывает внешний URL)
 * - callback_data   → callbackButton()              (генерирует событие message_event)
 */

import { Keyboard } from 'vk-io';
import { WEB_PORTFOLIO, WEB_APP_URL, VK_APP_ID } from './keys.js';

/**
 * Кнопки для незарегистрированного пользователя (аналог Telegram buttonsStart)
 * Показывает портфолио и ссылку для оформления подписки
 */
export const buttonsStart = Keyboard.builder()
    .urlButton({
        label: 'Посмотреть примеры работ',
        url: WEB_PORTFOLIO,
    })
    .urlButton({
        label: 'Оформить подписку и начать',
        url: 'https://vk.com/ai_for_seller?analytics_screen=group&levelId=2506&source=donut_banner&w=donut_payment-237223290',
    })
    .inline();

/**
 * Кнопки для подписчика (аналог Telegram buttonsSub)
 * Позволяет внести депозит или обратиться в поддержку
 */
export const buttonsSub = Keyboard.builder()
    .textButton({
        label: 'Внести депозит',
        payload: { cmd: 'deposit' },
        color: Keyboard.PRIMARY_COLOR,
    })
    .urlButton({
        label: 'Поддержка',
        url: 'https://vk.com/write-YOUR_SUPPORT_ID',
    });

/**
 * Кнопка открытия калькулятора (аналог Telegram buttonsDeposit)
 * В Telegram был web_app, в VK — обычная URL-кнопка открывающая внешний сайт
 * Внимание: веб-приложение должно отправлять данные на наш Express-сервер,
 *           а не через Telegram WebApp API
 */
export const buttonsDeposit = Keyboard.builder()
    .applicationButton({
        label: '🔘 Открыть калькулятор',
        appId: VK_APP_ID,
        hash: 'form',
    });

/**
 * Кнопки для заполнения ТЗ (аналог Telegram buttonsTask)
 */
export const buttonsTask = Keyboard.builder()
    .urlButton({
        label: 'Заполнить ТЗ',
        url: 'https://docs.google.com/forms/d/e/1FAIpQLSdw5pbOVkshGv5P5bje2SxRcZSwmlkqfrJGilUHZrZ00VnT4A/viewform',
    })
    .urlButton({
        label: 'Поддержка',
        // TODO: заменить на актуальный VK-аккаунт поддержки
        url: 'https://vk.com/write-YOUR_SUPPORT_ID',
    });
