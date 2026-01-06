// Основной объект приложения
const App = {
    user: null,
    currentPage: 'home',
    
    init() {
        this.loadUser();
        this.initTelegram();
        this.bindEvents();
        this.loadProducts();
        this.updateProfile();
    },
    
    // Загрузка пользователя
    loadUser() {
        const savedUser = localStorage.getItem('hotwheels_user');
        if (savedUser) {
            this.user = JSON.parse(savedUser);
            this.showApp();
        }
    },
    
    // Инициализация Telegram Web App
    initTelegram() {
        if (window.Telegram?.WebApp) {
            const tg = Telegram.WebApp;
            tg.ready();
            tg.expand();
            
            // Если пользователь авторизован в Telegram
            if (tg.initDataUnsafe?.user) {
                const tgUser = tg.initDataUnsafe.user;
                this.user = {
                    id: tgUser.id,
                    username: tgUser.username,
                    first_name: tgUser.first_name,
                    last_name: tgUser.last_name,
                    avatar: tgUser.first_name?.[0] || 'TG',
                    registration_date: new Date().toISOString()
                };
                
                localStorage.setItem('hotwheels_user', JSON.stringify(this.user));
                this.showApp();
                this.saveToServer();
            }
        }
    },
    
    // Привязка событий
    bindEvents() {
        // Кнопка входа через Telegram
        document.getElementById('tg-login-btn')?.addEventListener('click', () => {
            if (window.Telegram?.WebApp) {
                Telegram.WebApp.openTelegramLink('https://t.me/HotWheelsEliteBot');
            } else {
                window.open('https://t.me/HotWheelsEliteBot', '_blank');
            }
        });
        
        // Навигация
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.switchPage(page);
            });
        });
        
        // Вкладки категорий
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.loadProducts();
            });
        });
        
        // Кнопка поиска
        document.querySelector('.search-btn')?.addEventListener('click', () => {
            this.performSearch();
        });
        
        document.querySelector('.search-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
    },
    
    // Переключение страниц
    switchPage(page) {
        this.currentPage = page;
        
        // Обновляем активные элементы меню
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        
        // Показываем нужную страницу
        document.querySelectorAll('.content-page').forEach(content => {
            content.classList.toggle('active', content.id === `${page}-content`);
        });
        
        // Обновляем заголовок
        const titles = {
            home: 'Главная',
            search: 'Поиск',
            sell: 'Продать',
            favorites: 'Избранное',
            profile: 'Профиль'
        };
        document.getElementById('app-title').textContent = titles[page];
        
        // Загружаем данные для страницы
        if (page === 'profile') {
            this.updateProfile();
        } else if (page === 'home') {
            this.loadProducts();
        }
    },
    
    // Показать основное приложение
    showApp() {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        
        // Обновляем аватар в шапке
        if (this.user) {
            const avatar = this.user.first_name?.[0] || this.user.username?.[0] || 'TG';
            document.getElementById('user-avatar').textContent = avatar;
        }
    },
    
    // Загрузка товаров
    loadProducts() {
        const products = [
            {
                id: 1,
                image: 'https://images.unsplash.com/photo-1566474595102-2f7606e8b533?w=400&h=200&fit=crop',
                title: 'Ferrari F40 Limited Edition',
                price: '5 900 ₽',
                location: 'Москва',
                rating: '★★★★★ 4.9',
                seller: 'Иван П.'
            },
            {
                id: 2,
                image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=200&fit=crop',
                title: 'Lamborghini Set 2023',
                price: '12 500 ₽',
                location: 'СПб',
                rating: '★★★★☆ 4.5',
                seller: 'Алексей К.'
            },
            {
                id: 3,
                image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=200&fit=crop',
                title: 'Blue Porsche 911',
                price: '3 200 ₽',
                location: 'Казань',
                rating: '★★★★★ 5.0',
                seller: 'Мария С.'
            },
            {
                id: 4,
                image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=200&fit=crop',
                title: 'Track Complex Pro',
                price: '8 700 ₽',
                location: 'Екатеринбург',
                rating: '★★★★☆ 4.7',
                seller: 'Дмитрий В.'
            }
        ];
        
        const grid = document.querySelector('.product-grid');
        if (!grid) return;
        
        grid.innerHTML = products.map(product => `
            <div class="product-card" onclick="App.showProduct(${product.id})">
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
    },
    
    // Поиск
    performSearch() {
        const input = document.querySelector('.search-input');
        const query = input.value.trim().toLowerCase();
        
        if (!query) return;
        
        // Здесь можно добавить реальный поиск
        console.log('Поиск:', query);
        alert(`Поиск: "${query}"\n\nВ демо-версии поиск не реализован`);
    },
    
    // Обновление профиля
    updateProfile() {
        if (!this.user) return;
        
        // Обновляем аватар
        const avatar = this.user.first_name?.[0] || this.user.username?.[0] || 'TG';
        document.getElementById('profile-avatar').textContent = avatar;
        document.getElementById('user-avatar').textContent = avatar;
        
        // Обновляем имя
        const fullName = `${this.user.first_name || ''} ${this.user.last_name || ''}`.trim() || 'Пользователь';
        document.getElementById('profile-name').textContent = fullName;
        
        // Загружаем данные профиля
        this.loadProfileData();
    },
    
    // Загрузка данных профиля
    loadProfileData() {
        // Мои товары (демо данные)
        const myProducts = [
            { id: 1, name: 'Ferrari F40', price: '5 900 ₽', status: 'active' },
            { id: 2, name: 'Lamborghini Aventador', price: '8 500 ₽', status: 'sold' },
            { id: 3, name: 'Porsche 911 GT3', price: '4 200 ₽', status: 'active' }
        ];
        
        const productsContainer = document.getElementById('my-products');
        productsContainer.innerHTML = myProducts.map(product => `
            <div class="my-product">
                <div class="product-header">
                    <div class="product-name">${product.name}</div>
                    <div class="product-status status-${product.status}">
                        ${product.status === 'active' ? 'Активен' : 'Продан'}
                    </div>
                </div>
                <div class="product-price">${product.price}</div>
            </div>
        `).join('');
        
        // Отзывы (демо данные)
        const reviews = [
            {
                reviewer: 'Алексей Иванов',
                date: '15.12.2023',
                rating: '★★★★★',
                text: 'Отличный продавец! Модель пришла в идеальном состоянии, упаковка была надёжной. Рекомендую!'
            },
            {
                reviewer: 'Мария Петрова',
                date: '10.12.2023',
                rating: '★★★★☆',
                text: 'Всё хорошо, но доставка заняла чуть дольше чем ожидалось. Модель качественная.'
            }
        ];
        
        const reviewsContainer = document.getElementById('reviews-list');
        reviewsContainer.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <div class="reviewer">${review.reviewer}</div>
                    <div class="review-date">${review.date}</div>
                </div>
                <div class="review-text">${review.text}</div>
                <div class="review-rating">${review.rating}</div>
            </div>
        `).join('');
        
        // Обновляем статистику
        document.getElementById('reviews-count').textContent = reviews.length;
        document.getElementById('products-count').textContent = myProducts.filter(p => p.status === 'active').length;
        document.getElementById('rating-value').textContent = '4.8';
        
        // Обновляем счетчик отзывов
        document.querySelector('.reviews-count').textContent = `(${reviews.length})`;
    },
    
    // Показать товар
    showProduct(id) {
        alert(`Товар #${id}\n\nВ демо-версии детали товара не доступны`);
    },
    
    // Сохранение на сервер (демо)
    saveToServer() {
        if (!this.user) return;
        
        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.user)
        }).catch(() => {
            // Игнорируем ошибки в демо-версии
        });
    },
    
    // Выход
    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('hotwheels_user');
            this.user = null;
            
            document.getElementById('app-screen').classList.remove('active');
            document.getElementById('auth-screen').classList.add('active');
        }
    }
};

// Глобальные функции для вызова из HTML
function showProfile() {
    App.switchPage('profile');
}

function editProfile() {
    const modal = document.getElementById('edit-profile-modal');
    const nameInput = document.getElementById('edit-name');
    const usernameInput = document.getElementById('edit-username');
    
    if (App.user) {
        nameInput.value = App.user.first_name || '';
        usernameInput.value = App.user.username || '';
    }
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('edit-profile-modal').classList.remove('active');
}

function saveProfile() {
    const nameInput = document.getElementById('edit-name');
    const usernameInput = document.getElementById('edit-username');
    
    if (App.user) {
        App.user.first_name = nameInput.value;
        App.user.username = usernameInput.value;
        
        localStorage.setItem('hotwheels_user', JSON.stringify(App.user));
        App.updateProfile();
    }
    
    closeModal();
}

function logout() {
    App.logout();
}

// Запуск приложения при загрузке
document.addEventListener('DOMContentLoaded', () => App.init());