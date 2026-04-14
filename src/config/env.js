import dotenv from 'dotenv';

dotenv.config();

// Валидация обязательных переменных окружения при старте
const requiredEnvVars = [
    'VK_TOKEN',
    'VK_GROUP_ID',
    'GOOGLE_PRIVATE_KEY',
    'YOOKASSA_SHOP_ID',
    'YOOKASSA_SECRET_KEY',
    'VK_GROUP_ID_1'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error(`❌ ОШИБКА: Отсутствуют обязательные переменные окружения: ${missingVars.join(', ')}`);
    console.error('Пожалуйста, проверьте файл .env');
    process.exit(1);
}

// Экспорт переменных окружения
export const config = {
    bot: {
        // Токен сообщества VK (заменяет BOT_TOKEN из Telegram)
        token: process.env.VK_TOKEN,
        // ID основного сообщества бота
        groupId: Number(process.env.VK_GROUP_ID),
    },
    google: {
        privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/^"|"$/g, '').split(String.raw`\n`).join('\n'),
    },
    payment: {
        // ЮKassa shopId (заменяет PAYMENT_TOKEN из Telegram)
        shopId: process.env.YOOKASSA_SHOP_ID,
        // ЮKassa секретный ключ
        secretKey: process.env.YOOKASSA_SECRET_KEY,
    },
    // URL для вебхуков ЮKassa (должен быть публично доступен)
    webhookUrl: process.env.WEBHOOK_URL || 'http://localhost:3000',
    groups: {
        id1: Number(process.env.VK_GROUP_ID_1),
    }
};
