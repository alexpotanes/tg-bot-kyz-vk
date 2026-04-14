import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from 'google-auth-library';
import { GOOGLE_TABLE_ID, GOOGLE_CLIENT_EMAIL, SCOPES } from '../../keys.js';
import { config } from '../config/env.js';
import { GOOGLE_SHEET_INDEX } from '../config/constants.js';
import { calculatePrice } from './priceCalculator.js';

/**
 * Класс для работы с Google Sheets
 */
export class GoogleSheetsService {
    constructor() {
        this.doc = null;
        this.sheet = null;
    }

    /**
     * Инициализация подключения к Google Sheets
     */
    async initialize() {
        const serviceAccountAuth = new JWT({
            email: GOOGLE_CLIENT_EMAIL,
            key: config.google.privateKey,
            scopes: SCOPES,
        });

        this.doc = new GoogleSpreadsheet(GOOGLE_TABLE_ID, serviceAccountAuth);
        await this.doc.loadInfo();
        this.sheet = this.doc.sheetsByIndex[GOOGLE_SHEET_INDEX];

        if (!this.sheet) {
            throw new Error(`Google Sheet с индексом ${GOOGLE_SHEET_INDEX} не найден`);
        }

        // Загружаем заголовки таблицы для корректной работы addRow()
        await this.sheet.loadHeaderRow();

        console.log(`✅ Google Sheets подключен: ${this.doc.title}`);
    }

    /**
     * Сохранение заказа в Google Sheets
     * @param {Object} orderData - Данные заказа
     * @param {string} chatId - ID чата
     * @param {string} name - Имя пользователя
     * @param {string} username - Username пользователя
     */
    async saveOrder(orderData, chatId, name, username) {
        if (!this.sheet) {
            throw new Error('Google Sheets не инициализирован. Вызовите initialize() сначала.');
        }

        const {
            articles,
            photo,
            fashion,
            product,
            references,
            hair,
            race,
            productImg,
            acceptResult,
            acceptQuantity,
        } = orderData;

        const price = calculatePrice(articles, photo);

        try {
            // Загружаем заголовки и строки для корректного определения места добавления
            await this.sheet.loadHeaderRow();
            await this.sheet.getRows(); // Загружаем строки, чтобы addRow знал, где конец таблицы

            // Добавляем новую строку в конец таблицы с опцией insert: true
            await this.sheet.addRow({
                "Отметка времени": new Date().toISOString(),
                "ID ТЗ": chatId,
                "ФИО": name,
                "TgUsername": username,
                "Кол-во артикулов": articles,
                "Кол-во фото": photo,
                "Цена": price,
                "Есть ли пожелания по фону или образу?": fashion,
                "Какой товар?": product,
                "Если есть ссылки на референсы - прикрепите.": references,
                "волосы модели": hair,
                "расса модели": race,
                "Загрузить фото  товара": productImg,
                "Я подтверждаю что мои фото сделаны качественно, текстуру видно хорошо, фон однородный.  Чем лучше исходник - тем точнее результат.": acceptResult,
                "Я осведомлен с тем, что фото и артикулы с большим кол-вом деталей, сложными принтами- не будут переданы в точности.": acceptQuantity
            }, { insert: true });

            console.log(`✅ Заказ сохранен в Google Sheets: ${chatId}`);
        } catch (error) {
            console.error('❌ Ошибка сохранения в Google Sheets:', error);
            throw error;
        }
    }

    /**
     * Получение листа для ручных операций
     * @returns {Object} Лист Google Sheets
     */
    getSheet() {
        return this.sheet;
    }
}

// Создаем singleton instance
export const googleSheetsService = new GoogleSheetsService();
