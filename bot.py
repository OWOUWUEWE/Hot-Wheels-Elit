import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
import json
import os
from datetime import datetime

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Файл для хранения пользователей
USERS_FILE = 'users.json'

# Загрузка пользователей из файла
def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

# Сохранение пользователей в файл
def save_users(users):
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

# Команда /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    users = load_users()
    
    # Проверяем, новый ли пользователь
    if str(user.id) not in users:
        users[str(user.id)] = {
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'registration_date': datetime.now().isoformat(),
            'is_active': True
        }
        save_users(users)
        
        welcome_text = f"""🎉 Добро пожаловать, {user.first_name}!

Вы успешно зарегистрировались в Hot Wheels Elite!

📱 *Что дальше?*
1. Нажмите кнопку "Меню" ниже
2. Выберите "Открыть веб-приложение"
3. Начните пользоваться всеми функциями!

✨ *Доступные функции:*
• Просмотр коллекционных моделей
• Продажа своих моделей
• Общение с коллекционерами
• Уведомления о новых поступлениях

Наш сайт: ваш_сайт.com"""
        
        await update.message.reply_text(welcome_text, parse_mode='Markdown')
        
        # Отправляем кнопку для открытия веб-приложения
        await update.message.reply_text(
            "Нажмите кнопку ниже, чтобы открыть приложение:",
            reply_markup={
                'inline_keyboard': [[
                    {
                        'text': '🚀 Открыть Hot Wheels Elite',
                        'web_app': {'url': 'https://ваш_сайт.com'}
                    }
                ]]
            }
        )
    else:
        await update.message.reply_text(
            f"С возвращением, {user.first_name}! 🏎️\n\n"
            "Используйте кнопку ниже, чтобы открыть приложение:",
            reply_markup={
                'inline_keyboard': [[
                    {
                        'text': '🚀 Открыть Hot Wheels Elite',
                        'web_app': {'url': 'https://ваш_сайт.com'}
                    }
                ]]
            }
        )

# Команда /profile
async def profile(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    users = load_users()
    
    if str(user.id) in users:
        user_data = users[str(user.id)]
        reg_date = datetime.fromisoformat(user_data['registration_date']).strftime('%d.%m.%Y')
        
        profile_text = f"""📋 *Ваш профиль*

👤 *Имя:* {user_data['first_name']} {user_data.get('last_name', '')}
🔗 *Username:* @{user_data['username']}
📅 *Дата регистрации:* {reg_date}
🏎️ *Статус:* Активный коллекционер

*Статистика:*
• Просмотрено моделей: 0
• В избранном: 0
• Продано: 0
• Куплено: 0"""
        
        await update.message.reply_text(profile_text, parse_mode='Markdown')
    else:
        await update.message.reply_text(
            "Вы еще не зарегистрированы. Используйте /start для регистрации."
        )

# Команда /help
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = """🔧 *Помощь*

*Доступные команды:*
/start - Регистрация и начало работы
/profile - Просмотр вашего профиля
/catalog - Просмотр каталога моделей
/sell - Разместить модель на продажу
/help - Получить помощь

*Как пользоваться:*
1. Зарегистрируйтесь через /start
2. Откройте веб-приложение
3. Просматривайте и покупайте модели
4. Продавайте свои модели

*Поддержка:*
По вопросам пишите: @ваш_саппорт"""
    
    await update.message.reply_text(help_text, parse_mode='Markdown')

# Обработка текстовых сообщений
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.lower()
    
    if any(word in text for word in ['привет', 'hello', 'hi']):
        await update.message.reply_text(f"Привет, {update.effective_user.first_name}! 🏎️")
    elif any(word in text for word in ['каталог', 'модели', 'машинки']):
        await update.message.reply_text(
            "Просмотр каталога доступен в веб-приложении!\n\n"
            "Нажмите кнопку ниже:",
            reply_markup={
                'inline_keyboard': [[
                    {
                        'text': '📁 Открыть каталог',
                        'web_app': {'url': 'https://ваш_сайт.com'}
                    }
                ]]
            }
        )
    else:
        await update.message.reply_text(
            "Используйте команды:\n"
            "/start - начать работу\n"
            "/help - помощь\n\n"
            "Или откройте веб-приложение:",
            reply_markup={
                'inline_keyboard': [[
                    {
                        'text': '🚀 Открыть приложение',
                        'web_app': {'url': 'https://ваш_сайт.com'}
                    }
                ]]
            }
        )

# Основная функция
def main():
    # Замените 'YOUR_BOT_TOKEN' на токен вашего бота
    TOKEN = 'YOUR_BOT_TOKEN_HERE'
    
    # Создаем Application
    application = Application.builder().token(TOKEN).build()
    
    # Добавляем обработчики команд
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("profile", profile))
    application.add_handler(CommandHandler("help", help_command))
    
    # Добавляем обработчик текстовых сообщений
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Запускаем бота
    print("Бот запущен...")
    application.run_polling(allowed_updates=Update.ALL_UPDATES)

if __name__ == '__main__':
    main()