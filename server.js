const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Файл для хранения пользователей
const USERS_FILE = path.join(__dirname, 'users.json');

// Загрузка пользователей
async function loadUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Сохранение пользователей
async function saveUsers(users) {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// API для регистрации
app.post('/register', async (req, res) => {
    try {
        const userData = req.body;
        
        if (!userData.telegram_id) {
            return res.status(400).json({ error: 'Telegram ID required' });
        }
        
        const users = await loadUsers();
        const userId = userData.telegram_id.toString();
        
        // Проверяем, есть ли пользователь
        if (!users[userId]) {
            users[userId] = {
                ...userData,
                registration_date: new Date().toISOString(),
                is_active: true,
                last_login: new Date().toISOString()
            };
            
            await saveUsers(users);
            console.log(`Новый пользователь: ${userData.first_name} (ID: ${userId})`);
            
            return res.json({
                success: true,
                message: 'User registered successfully',
                user: users[userId]
            });
        } else {
            // Обновляем время последнего входа
            users[userId].last_login = new Date().toISOString();
            await saveUsers(users);
            
            return res.json({
                success: true,
                message: 'User already exists',
                user: users[userId]
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для получения пользователя
app.get('/user/:telegram_id', async (req, res) => {
    try {
        const users = await loadUsers();
        const user = users[req.params.telegram_id];
        
        if (user) {
            res.json({ success: true, user });
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Обслуживание HTML файлов
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script.js'));
});

// Старт сервера
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});