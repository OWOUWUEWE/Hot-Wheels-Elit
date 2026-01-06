// Основной объект приложения
const App = {
    user: null,
    currentPage: 'home',
    products: [],
    favorites: new Set(),
    selectedRarity: 'main',
    selectedCondition: 'new',
    uploadedPhotos: [],
    
    init() {
        this.loadUser();
        this.loadProducts();
        this.loadFavorites();
        this.initTelegram();
        this.bindEvents();
        this.setupPhotoUpload();
        this.setupRaritySelection();
        this.setupConditionSelection();
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
            
            if (tg.initDataUnsafe?.user) {
                const tgUser = tg.initDataUnsafe.user;
                this.user = {
                    id: tgUser.id,
                    username: tgUser.username || `user_${tgUser.id}`,
                    first_name: tgUser.first_name || 'Пользователь',
                    last_name: tgUser.last_name || '',
                    avatar: tgUser.first_name?.[0] || 'TG',
                    city: '',
                    registration_date: new Date().toISOString()
                };
                
                localStorage.setItem('hotwheels_user', JSON.stringify(this.user));
                this.showApp();
                this.saveToServer();
            }
        }
    },
    
    // Показать демо-версию
    showDemo() {
        this.user = {
            id: 'demo',
            username: 'demo_user',
            first_name: 'Демо',
            last_name: 'Пользователь',
            avatar: 'D',
            city: 'Москва',
            registration_date: new Date().toISOString()
        };
        
        localStorage.setItem('hotwheels_user', JSON.stringify(this.user));
        this.showApp();
        this.loadDemoProducts();
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
                const filter = tab.dataset.filter;
                this.filterProducts(filter);
            });
        });
        
        // Поиск
        document.getElementById('search-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
    },
    
    // Настройка загрузки фото
    setupPhotoUpload() {
        const photoInput = document.getElementById('photo-input');
        if (!photoInput) return;
        
        photoInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.uploadedPhotos = this.uploadedPhotos.concat(files.slice(0, 3 - this.uploadedPhotos.length));
            this.updatePhotoPreviews();
            photoInput.value = '';
        });
    },
    
    // Обновление превью фото
    updatePhotoPreviews() {
        const previews = document.querySelectorAll('.photo-preview');
        
        previews.forEach((preview, index) => {
            preview.innerHTML = '';
            
            if (this.uploadedPhotos[index]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    preview.appendChild(img);
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-photo';
                    removeBtn.innerHTML = '×';
                    removeBtn.onclick = () => this.removePhoto(index);
                    preview.appendChild(removeBtn);
                };
                reader.readAsDataURL(this.uploadedPhotos[index]);
            }
        });
    },
    
    // Удаление фото
    removePhoto(index) {
        this.uploadedPhotos.splice(index, 1);
        this.updatePhotoPreviews();
    },
    
    // Настройка выбора редкости
    setupRaritySelection() {
        document.querySelectorAll('.rarity-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.rarity-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.selectedRarity = item.dataset.rarity;
            });
        });
    },
    
    // Настройка выбора состояния
    setupConditionSelection() {
        document.querySelectorAll('.condition-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.condition-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedCondition = btn.dataset.condition;
            });
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
            this.renderProducts();
        } else if (page === 'favorites') {
            this.renderFavorites();
        } else if (page === 'sell') {
            this.resetSellForm();
        }
    },
    
    // Сброс формы продажи
    resetSellForm() {
        this.uploadedPhotos = [];
        this.selectedRarity = 'main';
        this.selectedCondition = 'new';
        this.updatePhotoPreviews();
        
        document.getElementById('product-title').value = '';
        document.getElementById('product-description').value = '';
        document.getElementById('product-price').value = '';
        document.getElementById('contact-city').value = this.user?.city || '';
        document.getElementById('contact-phone').value = '';
        document.getElementById('contact-telegram').value = this.user?.username || '';
        
        document.querySelectorAll('.rarity-item').forEach(item => {
            item.classList.toggle('active', item.dataset.rarity === 'main');
        });
        
        document.querySelectorAll('.condition-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.condition === 'new');
        });
    },
    
    // Показать основное приложение
    showApp() {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        
        if (this.user) {
            const avatar = this.user.first_name?.[0] || this.user.username?.[0] || 'TG';
            document.getElementById('user-avatar').textContent = avatar;
            document.getElementById('profile-avatar').textContent = avatar;
        }
        
        this.switchPage('home');
    },
    
    // Загрузка продуктов
    loadProducts() {
        const savedProducts = localStorage.getItem('hotwheels_products');
        if (savedProducts) {
            this.products = JSON.parse(savedProducts);
        } else {
            this.loadDemoProducts();
        }
        this.renderProducts();
    },
    
    // Демо-продукты
    loadDemoProducts() {
        this.products = [
            {
                id: 1,
                title: 'Hot Wheels Ferrari F40',
                price: 2500,
                description: 'Коллекционная модель Ferrari F40 в идеальном состоянии. Упаковка не вскрывалась.',
                rarity: 'main',
                condition: 'new',
                city: 'Москва',
                seller: {
                    name: 'Иван П.',
                    avatar: 'И'
                },
                images: ['https://images.unsplash.com/photo-1566474595102-2f7606e8b533?w=400&h=300&fit=crop'],
                date: '2024-01-15',
                status: 'active'
            },
            {
                id: 2,
                title: 'Lamborghini Countach STH',
                price: 8900,
                description: 'Редкий супер треже хант! Идеальное состояние, с сертификатом.',
                rarity: 'sth',
                condition: 'like_new',
                city: 'Санкт-Петербург',
                seller: {
                    name: 'Алексей К.',
                    avatar: 'А'
                },
                images: ['https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=300&fit=crop'],
                date: '2024-01-14',
                status: 'active'
            }
        ];
        localStorage.setItem('hotwheels_products', JSON.stringify(this.products));
    },
    
    // Рендер продуктов
    renderProducts(filter = 'all') {
        const container = document.getElementById('products-container');
        if (!container) return;
        
        let filtered = this.products.filter(p => p.status === 'active');
        
        if (filter !== 'all') {
            filtered = filtered.filter(p => p.rarity === filter);
        }
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px;">
                    <div class="empty-icon">🏎️</div>
                    <h4>Нет объявлений</h4>
                    <p>Станьте первым, кто выставит модель на продажу!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filtered.map(product => `
            <div class="product-card" onclick="App.showProduct(${product.id})">
                <img src="${product.images[0]}" class="product-image" alt="${product.title}">
                <div class="product-info">
                    <div class="product-title">${product.title}</div>
                    <div class="product-price">${product.price.toLocaleString()} ₽</div>
                    <div class="product-meta">
                        <span>${product.city}</span>
                        <span class="product-rarity-tag" style="background: ${this.getRarityColor(product.rarity)}">
                            ${this.getRarityName(product.rarity)}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    // Фильтрация продуктов
    filterProducts(filter) {
        this.renderProducts(filter);
    },
    
    // Получить название редкости
    getRarityName(rarity) {
        const names = {
            main: 'Мейн',
            sth: 'STH',
            th: 'TH',
            set: 'Набор',
            special: 'Спецки',
            limited: 'Лимитки'
        };
        return names[rarity] || rarity;
    },
    
    // Получить цвет редкости
    getRarityColor(rarity) {
        const colors = {
            main: 'rgba(0, 212, 255, 0.1)',
            sth: 'rgba(255, 215, 0, 0.1)',
            th: 'rgba(255, 107, 107, 0.1)',
            set: 'rgba(147, 51, 234, 0.1)',
            special: 'rgba(34, 197, 94, 0.1)',
            limited: 'rgba(234, 179, 8, 0.1)'
        };
        return colors[rarity] || 'rgba(255, 255, 255, 0.1)';
    },
    
    // Показать товар
    showProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;
        
        const modal = document.getElementById('product-modal');
        document.getElementById('modal-product-title').textContent = product.title;
        document.getElementById('modal-product-price').textContent = `${product.price.toLocaleString()} ₽`;
        document.getElementById('modal-product-rarity').textContent = this.getRarityName(product.rarity);
        document.getElementById('modal-product-condition').textContent = this.getConditionName(product.condition);
        document.getElementById('modal-product-description').textContent = product.description;
        document.getElementById('modal-seller-avatar').textContent = product.seller.avatar;
        document.getElementById('modal-seller-name').textContent = product.seller.name;
        document.getElementById('modal-seller-city').textContent = product.city;
        
        const mainImage = document.getElementById('modal-main-image');
        mainImage.src = product.images[0];
        mainImage.alt = product.title;
        
        const thumbsContainer = document.querySelector('.slider-thumbs');
        thumbsContainer.innerHTML = product.images.map((img, index) => `
            <div class="thumb-item ${index === 0 ? 'active' : ''}" onclick="App.changeMainImage('${img}')">
                <img src="${img}" alt="Фото ${index + 1}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">
            </div>
        `).join('');
        
        modal.classList.add('active');
    },
    
    // Смена главного изображения
    changeMainImage(src) {
        document.getElementById('modal-main-image').src = src;
        document.querySelectorAll('.thumb-item').forEach(thumb => {
            thumb.classList.toggle('active', thumb.querySelector('img').src.includes(src));
        });
    },
    
    // Закрыть модалку товара
    closeProductModal() {
        document.getElementById('product-modal').classList.remove('active');
    },
    
    // Получить название состояния
    getConditionName(condition) {
        const names = {
            new: 'Новый',
            like_new: 'Как новый',
            good: 'Хорошее',
            used: 'Б/у'
        };
        return names[condition] || condition;
    },
    
    // Связаться с продавцом
    contactSeller() {
        alert('Функция связи будет доступна после подключения Telegram бота');
    },
    
    // Добавить/удалить из избранного
    toggleFavorite() {
        // Здесь будет логика добавления в избранное
        alert('Добавлено в избранное!');
    },
    
    // Публикация товара
    publishProduct() {
        const title = document.getElementById('product-title').value.trim();
        const price = parseInt(document.getElementById('product-price').value);
        const description = document.getElementById('product-description').value.trim();
        const city = document.getElementById('contact-city').value.trim();
        
        if (!title || !price || price <= 0) {
            alert('Заполните обязательные поля: название и цена');
            return;
        }
        
        if (this.uploadedPhotos.length === 0) {
            alert('Добавьте хотя бы одну фотографию');
            return;
        }
        
        const newProduct = {
            id: Date.now(),
            title,
            price,
            description,
            rarity: this.selectedRarity,
            condition: this.selectedCondition,
            city: city || this.user?.city || 'Не указан',
            seller: {
                name: this.user?.first_name || 'Аноним',
                avatar: this.user?.avatar || '?'
            },
            images: this.uploadedPhotos.map((file, index) => 
                `https://images.unsplash.com/photo-${1566474595102 + index}?w=400&h=300&fit=crop`
            ),
            date: new Date().toISOString(),
            status: 'active'
        };
        
        this.products.unshift(newProduct);
        localStorage.setItem('hotwheels_products', JSON.stringify(this.products));
        
        alert('Товар успешно опубликован!');
        this.resetSellForm();
        this.switchPage('home');
        this.renderProducts();
    },
    
    // Поиск
    performSearch() {
        const query = document.getElementById('search-input').value.trim().toLowerCase();
        const resultsContainer = document.getElementById('search-results');
        
        if (!query) {
            resultsContainer.innerHTML = '<p style="color: #8b949e; text-align: center;">Введите поисковый запрос</p>';
            return;
        }
        
        const results = this.products.filter(p => 
            p.title.toLowerCase().includes(query) || 
            p.description.toLowerCase().includes(query)
        );
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h4>Ничего не найдено</h4>
                    <p>Попробуйте изменить поисковый запрос</p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = results.map(product => `
            <div class="product-card" onclick="App.showProduct(${product.id})" style="margin-bottom: 15px;">
                <img src="${product.images[0]}" class="product-image" alt="${product.title}">
                <div class="product-info">
                    <div class="product-title">${product.title}</div>
                    <div class="product-price">${product.price.toLocaleString()} ₽</div>
                    <div class="product-meta">
                        <span>${product.city}</span>
                        <span class="product-rarity-tag" style="background: ${this.getRarityColor(product.rarity)}">
                            ${this.getRarityName(product.rarity)}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    // Загрузка избранного
    loadFavorites() {
        const saved = localStorage.getItem('hotwheels_favorites');
        if (saved) {
            this.favorites = new Set(JSON.parse(saved));
        }
    },
    
    // Рендер избранного
    renderFavorites() {
        const container = document.getElementById('favorites-list');
        if (!container) return;
        
        const favoriteProducts = this.products.filter(p => this.favorites.has(p.id));
        
        if (favoriteProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">❤️</div>
                    <h4>Нет избранного</h4>
                    <p>Добавляйте понравившиеся модели в избранное</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = favoriteProducts.map(product => `
            <div class="product-card" onclick="App.showProduct(${product.id})">
                <img src="${product.images[0]}" class="product-image" alt="${product.title}">
                <div class="product-info">
                    <div class="product-title">${product.title}</div>
                    <div class="product-price">${product.price.toLocaleString()} ₽</div>
                    <div class="product-meta">
                        <span>${product.city}</span>
                        <button class="btn-favorite" onclick="event.stopPropagation(); App.removeFavorite(${product.id})">
                            ❌ Удалить
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    // Удалить из избранного
    removeFavorite(id) {
        this.favorites.delete(id);
        localStorage.setItem('hotwheels_favorites', JSON.stringify([...this.favorites]));
        this.renderFavorites();
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
        
        // Загружаем мои объявления
        this.loadMyProducts();
    },
    
    // Загрузка моих объявлений
    loadMyProducts() {
        if (!this.user) return;
        
        const myProducts = this.products.filter(p => 
            p.seller.name === (this.user.first_name || 'Аноним')
        );
        
        const container = document.getElementById('my-products');
        if (myProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 20px 0;">
                    <p style="color: #8b949e;">У вас нет активных объявлений</p>
                </div>
            `;
        } else {
            container.innerHTML = myProducts.map(product => `
                <div class="my-product" onclick="App.showProduct(${product.id})">
                    <div class="product-header">
                        <div class="product-name">${product.title}</div>
                        <div class="product-status status-${product.status}">
                            ${product.status === 'active' ? 'Активен' : 'Продано'}
                        </div>
                    </div>
                    <div class="product-price">${product.price.toLocaleString()} ₽</div>
                    <div style="font-size: 12px; color: #8b949e; margin-top: 5px;">
                        ${new Date(product.date).toLocaleDateString('ru-RU')}
                    </div>
                </div>
            `).join('');
        }
        
        // Обновляем статистику
        const active = myProducts.filter(p => p.status === 'active').length;
        const sold = myProducts.filter(p => p.status === 'sold').length;
        
        document.getElementById('active-count').textContent = active;
        document.getElementById('sold-count').textContent = sold;
        document.getElementById('total-count').textContent = myProducts.length;
    },
    
    // Сохранение на сервер (демо)
    saveToServer() {
        // В демо-версии сохраняем только в localStorage
        console.log('User saved to localStorage');
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
    const cityInput = document.getElementById('edit-city');
    
    if (App.user) {
        nameInput.value = App.user.first_name || '';
        usernameInput.value = App.user.username || '';
        cityInput.value = App.user.city || '';
    }
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('edit-profile-modal').classList.remove('active');
}

function saveProfile() {
    const nameInput = document.getElementById('edit-name');
    const usernameInput = document.getElementById('edit-username');
    const cityInput = document.getElementById('edit-city');
    
    if (App.user) {
        App.user.first_name = nameInput.value;
        App.user.username = usernameInput.value;
        App.user.city = cityInput.value;
        App.user.avatar = App.user.first_name?.[0] || '?';
        
        localStorage.setItem('hotwheels_user', JSON.stringify(App.user));
        App.updateProfile();
        
        // Обновляем аватар в шапке
        document.getElementById('user-avatar').textContent = App.user.avatar;
    }
    
    closeModal();
}

function logout() {
    App.logout();
}

// Запуск приложения при загрузке
document.addEventListener('DOMContentLoaded', () => App.init());