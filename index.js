/**
 * VK Bot — Точка входа
 *
 * Отличие от Telegram-версии:
 * - new TgApi(token, {polling: true}) → new VK({ token }) + vk.updates.startPolling()
 * - bot.setMyCommands()  — в VK команды не регистрируются через API
 * - bot.on('message')    → vk.updates.on('message_new', ctx => ...)
 * - bot.on('callback_query') → vk.updates.on('message_event', ctx => ...)
 * - bot.on('pre_checkout_query') / 'successful_payment' — заменены на Express-вебхук ЮKassa
 * - bot.stopPolling()    → vk.updates.stopPolling()
 *
 * Добавлен Express-сервер (зависимость уже была):
 *   POST /webapp-data       — принимает данные формы-калькулятора из веб-приложения
 *   POST /payment/webhook   — принимает уведомления об оплате от ЮKassa
 */

import { VK } from 'vk-io';
import express from 'express';
import cors from 'cors';
import { config } from './src/config/env.js';
import { rateLimiter } from './src/middleware/rateLimiter.js';
import { googleSheetsService } from './src/services/googleSheetsService.js';

// Импорт обработчиков
import { handleStart } from './src/handlers/startHandler.js';
import { handleWebAppData } from './src/handlers/webAppDataHandler.js';
import { handleCallbackQuery } from './src/handlers/callbackQueryHandler.js';
import { handlePaymentWebhook } from './src/handlers/preCheckoutHandler.js';

// Инициализация VK бота
// Токен сообщества берётся из VK_TOKEN (замена BOT_TOKEN)
const vk = new VK({
    token: config.bot.token,
});

// Инициализация Express-сервера
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/**
 * Эндпоинт для получения данных из веб-приложения (калькулятора)
 *
 * Веб-приложение на Vercel должно отправлять POST-запрос сюда вместо
 * window.Telegram.WebApp.sendData()
 *
 * Ожидаемое тело запроса:
 * {
 *   peerId: <VK user_id>,  // получить через vk-bridge: bridge.send('VKWebAppGetUserInfo')
 *   articles: number,
 *   photo: number,
 *   email: string,
 *   ... (остальные поля формы)
 * }
 */
app.post('/webapp-data', async (req, res) => {
    const { peerId, ...orderData } = req.body;

    if (!peerId) {
        return res.status(400).json({ ok: false, error: 'peerId обязателен' });
    }

    // Проверка rate limiting по peerId (единый лимит для бота и веб-формы)
    if (!rateLimiter.checkLimit(String(peerId))) {
        console.warn(`Rate limit exceeded for user ${peerId} (webapp-data)`);
        return res.status(429).json({ ok: false, error: 'Слишком много запросов' });
    }

    try {
        await handleWebAppData(vk, peerId, orderData);
        res.json({ ok: true });
    } catch (error) {
        console.error('Ошибка /webapp-data:', error);
        res.status(500).json({ ok: false, error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * Эндпоинт для вебхуков ЮKassa
 *
 * Настройте URL в личном кабинете ЮKassa:
 *   Интеграция → HTTP-уведомления → URL: https://YOUR_SERVER/payment/webhook
 *
 * Рекомендуется добавить IP-фильтрацию на уровне nginx/firewall:
 *   разрешить только IP-адреса ЮKassa (185.71.76.0/27, 185.71.77.0/27, 77.75.153.0/25 и др.)
 */
app.post('/payment/webhook', async (req, res) => {
    // Сначала отвечаем 200 — ЮKassa требует быстрый ответ,
    // иначе будет повторная отправка уведомления
    res.json({ ok: true });

    try {
        await handlePaymentWebhook(vk, req.body);
    } catch (error) {
        console.error('Ошибка /payment/webhook:', error);
    }
});

/**
 * Обработчик новых сообщений (аналог bot.on('message') в Telegram)
 */
vk.updates.use((ctx, next) => {
    console.log('[UPDATE]', ctx.type, JSON.stringify(ctx['payload'] || ctx['eventPayload'] || '').slice(0, 100));
    return next();
});

vk.updates.on('message_new', async (ctx) => {
    // Пропускаем исходящие сообщения бота — VK возвращает их обратно в Long Poll,
    // что создаёт бесконечную петлю ответов
    if (ctx.isOutbox) return;

    const userId = String(ctx.senderId);

    // Проверка rate limiting
    if (!rateLimiter.checkLimit(userId)) {
        console.warn(`Rate limit exceeded for user ${userId}`);
        return;
    }

    const payload = ctx.messagePayload;
    const isStartCommand =
        ctx.text?.toLowerCase() === 'start' ||
        ctx.text === '/start' ||
        payload?.command === 'start';

    if (isStartCommand) {
        await handleStart(vk, ctx);
        return;
    }

    if (payload?.cmd === 'deposit') {
        await handleCallbackQuery(vk, ctx);
        return;
    }

    // Любое другое сообщение — показать стартовый экран
    await handleStart(vk, ctx);
});

/**
 * Обработчик нажатий на callback-кнопки (аналог bot.on('callback_query') в Telegram)
 * Срабатывает при нажатии на кнопки типа callbackButton в vk-io
 */
vk.updates.on('message_event', async (ctx) => {
    console.log('[message_event] peerId:', ctx.peerId, 'payload:', JSON.stringify(ctx.eventPayload));
    await ctx.answer();
    await handleCallbackQuery(vk, ctx);
});

/**
 * Обработчик данных из VK Mini App (VKWebAppSendPayload)
 * Срабатывает когда форма-калькулятор отправляет данные через vk-bridge
 */
vk.updates.on('app_payload', async (ctx) => {
    const userId = ctx.userId;
    console.log('[app_payload] userId:', userId, 'payload:', JSON.stringify(ctx.payload).slice(0, 200));

    if (!rateLimiter.checkLimit(String(userId))) {
        console.warn(`Rate limit exceeded for user ${userId} (app_payload)`);
        return;
    }

    try {
        const orderData = typeof ctx.payload === 'string'
            ? JSON.parse(ctx.payload)
            : ctx.payload;

        await handleWebAppData(vk, userId, orderData);
    } catch (error) {
        console.error('Ошибка обработки app_payload:', error);
    }
});

/**
 * Обработчик ошибок Long Poll
 */
vk.updates.on('error', (error) => {
    console.error('❌ Ошибка VK Long Poll:', error);
});

/**
 * Инициализация сервисов (Google Sheets — без изменений)
 */
async function initializeServices() {
    try {
        console.log('🚀 Инициализация сервисов...');
        await googleSheetsService.initialize();
        console.log('✅ Все сервисы инициализированы');
    } catch (error) {
        console.error('❌ Ошибка инициализации сервисов:', error);
        process.exit(1);
    }
}

/**
 * Запуск бота и Express-сервера
 */
async function start() {
    try {
        await initializeServices();

        // Запуск Express-сервера для вебхуков и данных веб-формы
        app.listen(PORT, () => {
            console.log(`✅ Express-сервер запущен на порту ${PORT}`);
            console.log(`   POST /webapp-data      — данные из веб-калькулятора`);
            console.log(`   POST /payment/webhook  — уведомления от ЮKassa`);
        });

        // Запуск VK Long Poll (замена Telegram polling)
        await vk.updates.startPolling();
        console.log('✅ VK бот запущен (Long Poll)');

    } catch (error) {
        console.error('❌ Ошибка запуска бота:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Остановка бота...');
    vk.updates.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Остановка бота...');
    vk.updates.stop();
    process.exit(0);
});

// Запуск
start();
