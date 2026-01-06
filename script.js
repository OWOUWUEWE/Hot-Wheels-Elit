// Данные продуктов
const products = [
    {
        id: 1,
        image: 'https://images.unsplash.com/photo-1566474595102-2f7606e8b533?w=400&h=200&fit=crop',
        title: 'Ferrari F40 Limited Edition',
        price: '5 900 ₽',
        location: 'Москва',
        rating: '★★★★★ 4.9'
    },
    {
        id: 2,
        image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=200&fit=crop',
        title: 'Lamborghini Set 2023',
        price: '12 500 ₽',
        location: 'СПб',
        rating: '★★★★☆ 4.5'
    },
    {
        id: 3,
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=200&fit=crop',
        title: 'Blue Porsche 911',
        price: '3 200 ₽',
        location: 'Казань',
        rating: '★★★★★ 5.0'
    },
    {
        id: 4,
        image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=200&fit=crop',
        title: 'Track Complex Pro',
        price: '8 700 ₽',
        location: 'Екатеринбург',
        rating: '★★★★☆ 4.7'
    }
];

// Загрузка продуктов
function loadProducts() {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) return;
    
    productGrid.innerHTML = products.map(product => `
        <div class="product-card" data-id="${product.id}">
            <img src="${product.image}" class="product-img">
            <div class="product-info">
                <div class="product-title">${product.title}</div>
                <div class="product-price">${product.price}</div>
                <div class="product-meta">
                    <span>${product.location}</span>
                    <span class="rating">${product.rating}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Навигация
function setupNavigation() {
    // Вкладки категорий
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Нижнее меню
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Здесь можно добавить логику переключения экранов
            const navText = this.querySelector('span').textContent;
            console.log('Переход на:', navText);
        });
    });
    
    // Кнопка регистрации через Telegram
    const authBtn = document.getElementById('telegram-auth-btn');
    if (authBtn) {
        authBtn.addEventListener('click', function() {
            const tg = window.Telegram.WebApp;
            
            // Если запущено внутри Telegram
            if (tg.initDataUnsafe.user) {
                const user = tg.initDataUnsafe.user;
                
                // Сохраняем пользователя в localStorage
                localStorage.setItem('telegram_user', JSON.stringify({
                    id: user.id,
                    username: user.username,
                    first_name: user.first_name,
                    last_name: user.last_name
                }));
                
                // Переключаем экраны
                document.getElementById('welcome-screen').classList.remove('active');
                document.getElementById('main-screen').classList.add('active');
                
                // Обновляем иконку профиля
                const profileIcon = document.getElementById('user-profile');
                if (profileIcon) {
                    profileIcon.textContent = user.first_name ? user.first_name[0] : 'TG';
                }
                
                // Загружаем продукты
                loadProducts();
                
                // Отправляем данные на сервер (если бот запущен)
                sendRegistrationData(user);
            } else {
                // Если запущено вне Telegram - открываем бота
                window.open('https://t.me/your_bot_username', '_blank');
            }
        });
    }
    
    // Проверяем, есть ли сохраненный пользователь
    const savedUser = localStorage.getItem('telegram_user');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        document.getElementById('welcome-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');
        
        const profileIcon = document.getElementById('user-profile');
        if (profileIcon) {
            profileIcon.textContent = user.first_name ? user.first_name[0] : 'TG';
        }
        
        loadProducts();
    }
}

// Отправка данных регистрации на сервер
function sendRegistrationData(user) {
    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            telegram_id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            registration_date: new Date().toISOString()
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Регистрация успешна:', data);
    })
    .catch(error => {
        console.error('Ошибка регистрации:', error);
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    setupNavigation();
    
    // Проверка Web App Telegram
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.ready();
    }
});