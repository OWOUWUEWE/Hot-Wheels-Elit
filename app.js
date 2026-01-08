// Основной объект приложения
const App = {
    user: null,
    currentPage: 'home',
    products: [],
    favorites: new Set(),
    selectedRarity: 'main',
    selectedCondition: 'new',
    uploadedPhotos: [],
    editingProductId: null,
    currentProductId: null,
    
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
            id: 'demo_user_123',
            username: 'demo_user',
            first_name: 'Демо',
            last_name: 'Пользователь',
            avatar: 'D',
            city: 'Москва',
            telegram: '@demo_user',
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
        
        // Быстрый поиск при вводе
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            if (e.target.value.trim() === '') {
                this.clearSearch();
            }
        });
    },
    
    // Настройка загрузки фото
    setupPhotoUpload() {
        const photoInput = document.getElementById('photo-input');
        if (!photoInput) return;
        
        photoInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handlePhotoUpload(files);
            photoInput.value = '';
        });
    },
    
    // Обработка загрузки фото
    handlePhotoUpload(files) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        files.forEach(file => {
            if (!allowedTypes.includes(file.type)) {
                this.showNotification('Только JPG, PNG и WebP файлы', 'error');
                return;
            }
            
            if (file.size > maxSize) {
                this.showNotification('Файл слишком большой (макс. 5MB)', 'error');
                return;
            }
            
            if (this.uploadedPhotos.length >= 3) {
                this.showNotification('Максимум 3 фотографии', 'error');
                return;
            }
            
            this.uploadedPhotos.push(file);
        });
        
        this.updatePhotoPreviews();
    },
    
    // Обновление превью фото
    updatePhotoPreviews() {
        const grid = document.getElementById('photos-grid');
        if (!grid) return;
        
        // Очищаем и добавляем кнопку загрузки
        grid.innerHTML = '<div class="photo-upload-box" onclick="document.getElementById(\'photo-input\').click()"><div class="upload-icon">📷</div><span>Добавить фото</span></div>';
        
        // Добавляем превью загруженных фото
        this.uploadedPhotos.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.createElement('div');
                preview.className = 'photo-preview-container';
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Фото ${index + 1}">
                    <button class="remove-photo-btn" onclick="App.removePhoto(${index})">×</button>
                `;
                grid.insertBefore(preview, grid.firstChild);
            };
            reader.readAsDataURL(file);
        });
    },
    
    // Удаление фото
    removePhoto(index) {
        this.uploadedPhotos.splice(index, 1);
        this.updatePhotoPreviews();
    },
    
    // Сохранение фото в localStorage
    savePhotosToStorage(productId, photos) {
        const photoData = {};
        photos.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                photoData[`${productId}_${index}`] = e.target.result;
                localStorage.setItem('product_photos', JSON.stringify(photoData));
            };
            reader.readAsDataURL(file);
        });
    },
    
    // Загрузка фото из localStorage
    getPhotosFromStorage(productId, count) {
        const photoData = JSON.parse(localStorage.getItem('product_photos') || '{}');
        const photos = [];
        
        for (let i = 0; i < count; i++) {
            const key = `${productId}_${i}`;
            if (photoData[key]) {
                photos.push(photoData[key]);
            }
        }
        
        return photos;
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
        } else if (page === 'search') {
            this.clearSearch();
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
        document.getElementById('contact-telegram').value = this.user?.telegram || '';
        
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
            
            // Загружаем фото из localStorage для каждого продукта
            this.products.forEach(product => {
                if (product.hasPhotos) {
                    product.images = this.getPhotosFromStorage(product.id, product.photoCount || 1);
                }
            });
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
                title: 'Hot Wheels Ferrari F40 - Красная',
                price: 2500,
                description: 'Коллекционная модель Ferrari F40 в идеальном состоянии. Упаковка не вскрывалась. Полностью оригинальная.',
                rarity: 'main',
                condition: 'new',
                city: 'Москва',
                seller: {
                    id: 'seller1',
                    name: 'Иван П.',
                    avatar: 'И',
                    telegram: '@ivan_hotwheels'
                },
                images: ['https://images.unsplash.com/photo-1566474595102-2f7606e8b533?w=400&h=300&fit=crop'],
                date: '2024-01-15',
                status: 'active',
                hasPhotos: false,
                photoCount: 1
            },
            {
                id: 2,
                title: 'Lamborghini Countach STH 2023',
                price: 8900,
                description: 'Редкий супер треже хант! Идеальное состояние, с сертификатом подлинности. Без дефектов.',
                rarity: 'sth',
                condition: 'like_new',
                city: 'Санкт-Петербург',
                seller: {
                    id: 'seller2',
                    name: 'Алексей К.',
                    avatar: 'А',
                    telegram: '@alexey_collector'
                },
                images: ['https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=300&fit=crop'],
                date: '2024-01-14',
                status: 'active',
                hasPhotos: false,
                photoCount: 1
            },
            {
                id: 3,
                title: 'Porsche 911 Turbo Treasure Hunt',
                price: 4200,
                description: 'TH модель 2022 года. В отличном состоянии, колеса не потерты.',
                rarity: 'th',
                condition: 'good',
                city: 'Казань',
                seller: {
                    id: 'seller3',
                    name: 'Мария С.',
                    avatar: 'М',
                    telegram: '@maria_cars'
                },
                images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop'],
                date: '2024-01-13',
                status: 'active',
                hasPhotos: false,
                photoCount: 1
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
                    <p>${filter === 'all' ? 'Станьте первым, кто выставит модель на продажу!' : 'В этой категории пока нет объявлений'}</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filtered.map(product => `
            <div class="product-card" onclick="App.showProduct(${product.id})">
                <img src="${product.images[0] || 'https://images.unsplash.com/photo-1566474595102-2f7606e8b533?w=400&h=300&fit=crop'}" 
                     class="product-image" 
                     alt="${product.title}"
                     onerror="this.src='https://images.unsplash.com/photo-1566474595102-2f7606e8b533?w=400&h=300&fit=crop'">
                <div class="product-info">
                    <div class="product-title">${product.title}</div>
                    <div class="product-price">${product.price.toLocaleString()} ₽</div>
                    <div class="product-meta">
                        <span>${product.city}</span>
                        <span class="product-rarity-tag" style="background: ${this.getRarityColor(product.rarity)}; color: ${this.getRarityTextColor(product.rarity)}">
                            ${this.getRarityName(product.rarity)}
                        </span>
                    </div>
                    <div class="product-actions-inline">
                        <button class="btn-favorite-small ${this.favorites.has(product.id) ? 'favorited' : ''}" 
                                onclick="event.stopPropagation(); App.toggleFavorite(${product.id})">
                            ${this.favorites.has(product.id) ? '❤️' : '🤍'} 
                            ${this.favorites.has(product.id) ? 'В избранном' : 'В избранное'}
                        </button>
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
            sth: 'rgba(255, 215, 0, 0.2)',
            th: 'rgba(255, 107, 107, 0.1)',
            set: 'rgba(147, 51, 234, 0.1)',
            special: 'rgba(34, 197, 94, 0.1)',
            limited: 'rgba(234, 179, 8, 0.2)'
        };
        return colors[rarity] || 'rgba(255, 255, 255, 0.1)';
    },
    
    // Получить цвет текста для редкости
    getRarityTextColor(rarity) {
        const colors = {
            main: '#00d4ff',
            sth: '#eab308',
            th: '#ff6b6b',
            set: '#9333ea',
            special: '#22c55e',
            limited: '#eab308'
        };
        return colors[rarity] || '#ffffff';
    },
    
    // Показать товар
    showProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;
        
        this.currentProductId = id;
        const modal = document.getElementById('product-modal');
        
        // Заполняем информацию
        document.getElementById('modal-product-title').textContent = product.title;
        document.getElementById('modal-product-price').textContent = `${product.price.toLocaleString()} ₽`;
        document.getElementById('modal-product-rarity').textContent = this.getRarityName(product.rarity);
        document.getElementById('modal-product-condition').textContent = this.getConditionName(product.condition);
        document.getElementById('modal-product-description').textContent = product.description;
        document.getElementById('modal-seller-avatar').textContent = product.seller.avatar;
        document.getElementById('modal-seller-name').textContent = product.seller.name;
        document.getElementById('modal-seller-city').textContent = product.city;
        document.getElementById('modal-seller-telegram').textContent = product.seller.telegram || 'Не указан';
        
        // Загружаем фото
        const mainImage = document.getElementById('modal-main-image');
        if (product.images && product.images.length > 0) {
            mainImage.src = product.images[0];
            mainImage.alt = product.title;
        }
        
        // Создаем миниатюры
        const thumbsContainer = document.getElementById('modal-thumbs');
        if (product.images && product.images.length > 1) {
            thumbsContainer.innerHTML = product.images.map((img, index) => `
                <div class="thumb-item ${index === 0 ? 'active' : ''}" onclick="App.changeMainImage('${img}')">
                    <img src="${img}" alt="Фото ${index + 1}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">
                </div>
            `).join('');
            thumbsContainer.style.display = 'flex';
        } else {
            thumbsContainer.innerHTML = '';
            thumbsContainer.style.display = 'none';
        }
        
        // Кнопка избранного
        const favoriteBtn = document.getElementById('modal-favorite-btn');
        if (this.favorites.has(id)) {
            favoriteBtn.innerHTML = '❤️ Удалить из избранного';
            favoriteBtn.style.background = 'rgba(255, 107, 107, 0.3)';
        } else {
            favoriteBtn.innerHTML = '🤍 В избранное';
            favoriteBtn.style.background = 'rgba(255, 107, 107, 0.1)';
        }
        
        // Показываем/скрываем кнопки владельца
        const ownerActions = document.getElementById('owner-actions');
        if (this.user && product.seller.id === this.user.id) {
            ownerActions.style.display = 'flex';
        } else {
            ownerActions.style.display = 'none';
        }
        
        modal.classList.add('active');
    },
    
    // Смена главного изображения
    changeMainImage(src) {
        document.getElementById('modal-main-image').src = src;
        document.querySelectorAll('.thumb-item').forEach(thumb => {
            const img = thumb.querySelector('img');
            thumb.classList.toggle('active', img && img.src.includes(src));
        });
    },
    
    // Закрыть модалку товара
    closeProductModal() {
        document.getElementById('product-modal').classList.remove('active');
        this.currentProductId = null;
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
        const product = this.products.find(p => p.id === this.currentProductId);
        if (!product || !product.seller.telegram) {
            this.showNotification('Продавец не указал контакты', 'error');
            return;
        }
        
        const telegramLink = `https://t.me/${product.seller.telegram.replace('@', '')}`;
        
        if (window.Telegram?.WebApp) {
            Telegram.WebApp.openTelegramLink(telegramLink);
        } else {
            window.open(telegramLink, '_blank');
        }
        
        this.showNotification(`Открывается чат с ${product.seller.name}`);
    },
    
    // Поделиться ссылкой
    shareProduct() {
        const product = this.products.find(p => p.id === this.currentProductId);
        if (!product) return;
        
        const link = `${window.location.origin}${window.location.pathname}#product=${product.id}`;
        
        // Показываем поле для копирования
        const linkInput = document.getElementById('product-link');
        linkInput.value = link;
        linkInput.style.display = 'block';
        
        // Копируем в буфер обмена
        linkInput.select();
        document.execCommand('copy');
        
        this.showNotification('Ссылка скопирована в буфер обмена!');
        
        // Скрываем поле через 3 секунды
        setTimeout(() => {
            linkInput.style.display = 'none';
        }, 3000);
    },
    
    // Добавить/удалить из избранного
    toggleFavorite(productId = null) {
        const id = productId || this.currentProductId;
        if (!id) return;
        
        if (this.favorites.has(id)) {
            this.favorites.delete(id);
            this.showNotification('Удалено из избранного');
        } else {
            this.favorites.add(id);
            this.showNotification('Добавлено в избранное!');
        }
        
        // Сохраняем в localStorage
        localStorage.setItem('hotwheels_favorites', JSON.stringify([...this.favorites]));
        
        // Обновляем UI
        if (this.currentPage === 'favorites') {
            this.renderFavorites();
        } else if (this.currentPage === 'home') {
            this.renderProducts();
        }
        
        // Обновляем кнопку в модалке
        if (this.currentProductId === id) {
            const favoriteBtn = document.getElementById('modal-favorite-btn');
            if (this.favorites.has(id)) {
                favoriteBtn.innerHTML = '❤️ Удалить из избранного';
                favoriteBtn.style.background = 'rgba(255, 107, 107, 0.3)';
            } else {
                favoriteBtn.innerHTML = '🤍 В избранное';
                favoriteBtn.style.background = 'rgba(255, 107, 107, 0.1)';
            }
        }
    },
    
    // Публикация товара
    publishProduct() {
        const title = document.getElementById('product-title').value.trim();
        const price = parseInt(document.getElementById('product-price').value);
        const description = document.getElementById('product-description').value.trim();
        const city = document.getElementById('contact-city').value.trim();
        const telegram = document.getElementById('contact-telegram').value.trim();
        
        // Валидация
        if (!title) {
            this.showNotification('Введите название модели', 'error');
            return;
        }
        
        if (!price || price <= 0) {
            this.showNotification('Введите корректную цену', 'error');
            return;
        }
        
        if (!city) {
            this.showNotification('Введите город', 'error');
            return;
        }
        
        if (this.uploadedPhotos.length === 0) {
            this.showNotification('Добавьте хотя бы одну фотографию', 'error');
            return;
        }
        
        const productId = Date.now();
        
        // Сохраняем фото
        this.savePhotosToStorage(productId, this.uploadedPhotos);
        
        const newProduct = {
            id: productId,
            title,
            price,
            description: description || 'Нет описания',
            rarity: this.selectedRarity,
            condition: this.selectedCondition,
            city,
            seller: {
                id: this.user?.id || 'anonymous',
                name: this.user?.first_name || 'Аноним',
                avatar: this.user?.avatar || '?',
                telegram: telegram || this.user?.telegram || ''
            },
            images: this.uploadedPhotos.map((file, index) => 
                `data:${file.type};base64,${btoa(String.fromCharCode(...new Uint8Array(file.arrayBuffer)))}`
            ),
            date: new Date().toISOString(),
            status: 'active',
            hasPhotos: true,
            photoCount: this.uploadedPhotos.length
        };
        
        this.products.unshift(newProduct);
        localStorage.setItem('hotwheels_products', JSON.stringify(this.products));
        
        this.showNotification('Товар успешно опубликован!');
        this.resetSellForm();
        this.switchPage('home');
        this.renderProducts();
    },
    
    // Поиск
    performSearch() {
        const query = document.getElementById('search-input').value.trim().toLowerCase();
        const resultsContainer = document.getElementById('search-results');
        
        if (!query) {
            this.clearSearch();
            return;
        }
        
        const results = this.products.filter(p => 
            p.status === 'active' && (
                p.title.toLowerCase().includes(query) || 
                p.description.toLowerCase().includes(query) ||
                p.city.toLowerCase().includes(query) ||
                this.getRarityName(p.rarity).toLowerCase().includes(query)
            )
        );
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px;">
                    <div class="empty-icon">🔍</div>
                    <h4>Ничего не найдено</h4>
                    <p>Попробуйте изменить поисковый запрос</p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = results.map(product => `
            <div class="product-card" onclick="App.showProduct(${product.id})" style="margin-bottom: 15px;">
                <img src="${product.images[0] || 'https://images.unsplash.com/photo-1566474595102-2f7606e8b533?w=400&h=300&fit=crop'}" 
                     class="product-image" 
                     alt="${product.title}">
                <div class="product-info">
                    <div class="product-title">${product.title}</div>
                    <div class="product-price">${product.price.toLocaleString()} ₽</div>
                    <div class="product-meta">
                        <span>${product.city}</span>
                        <span class="product-rarity-tag" style="background: ${this.getRarityColor(product.rarity)}; color: ${this.getRarityTextColor(product.rarity)}">
                            ${this.getRarityName(product.rarity)}
                        </span>
                    </div>
                    <div class="product-actions-inline">
                        <button class="btn-favorite-small ${this.favorites.has(product.id) ? 'favorited' : ''}" 
                                onclick="event.stopPropagation(); App.toggleFavorite(${product.id})">
                            ${this.favorites.has(product.id) ? '❤️' : '🤍'} 
                            ${this.favorites.has(product.id) ? 'В избранном' : 'В избранное'}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    // Очистить поиск
    clearSearch() {
        document.getElementById('search-input').value = '';
        document.getElementById('search-results').innerHTML = '';
    },
    
    // Рендер избранного
    renderFavorites() {
        const container = document.getElementById('favorites-list');
        if (!container) return;
        
        const favoriteProducts = this.products.filter(p => this.favorites.has(p.id) && p.status === 'active');
        
        if (favoriteProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px;">
                    <div class="empty-icon">❤️</div>
                    <h4>Нет избранного</h4>
                    <p>Добавляйте понравившиеся модели в избранное</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = favoriteProducts.map(product => `
            <div class="product-card" onclick="App.showProduct(${product.id})" style="margin-bottom: 15px;">
                <img src="${product.images[0] || 'https://images.unsplash.com/photo-1566474595102-2f7606e8b533?w=400&h=300&fit=crop'}" 
                     class="product-image" 
                     alt="${product.title}">
                <div class="product-info">
                    <div class="product-title">${product.title}</div>
                    <div class="product-price">${product.price.toLocaleString()} ₽</div>
                    <div class="product-meta">
                        <span>${product.city}</span>
                        <span class="product-rarity-tag" style="background: ${this.getRarityColor(product.rarity)}; color: ${this.getRarityTextColor(product.rarity)}">
                            ${this.getRarityName(product.rarity)}
                        </span>
                    </div>
                    <div class="product-actions-inline">
                        <button class="btn-favorite-small favorited" 
                                onclick="event.stopPropagation(); App.toggleFavorite(${product.id})">
                            ❌ Удалить из избранного
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    // Редактировать товар
    editProduct() {
        const product = this.products.find(p => p.id === this.currentProductId);
        if (!product) return;
        
        this.editingProductId = product.id;
        
        // Заполняем форму
        document.getElementById('edit-product-id').value = product.id;
        document.getElementById('edit-title').value = product.title;
        document.getElementById('edit-description').value = product.description;
        document.getElementById('edit-price').value = product.price;
        document.getElementById('edit-city').value = product.city;
        
        // Устанавливаем статус
        document.querySelectorAll('.status-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.status === product.status);
        });
        
        // Показываем модалку
        document.getElementById('edit-product-modal').classList.add('active');
    },
    
    // Закрыть модалку редактирования
    closeEditModal() {
        document.getElementById('edit-product-modal').classList.remove('active');
        this.editingProductId = null;
    },
    
    // Сохранить изменения товара
    saveProductChanges() {
        const productId = parseInt(document.getElementById('edit-product-id').value);
        const productIndex = this.products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) return;
        
        const product = this.products[productIndex];
        
        // Обновляем данные
        product.title = document.getElementById('edit-title').value.trim();
        product.description = document.getElementById('edit-description').value.trim();
        product.price = parseInt(document.getElementById('edit-price').value);
        product.city = document.getElementById('edit-city').value.trim();
        
        // Обновляем статус
        const activeStatusBtn = document.querySelector('.status-btn.active');
        if (activeStatusBtn) {
            product.status = activeStatusBtn.dataset.status;
        }
        
        // Сохраняем
        this.products[productIndex] = product;
        localStorage.setItem('hotwheels_products', JSON.stringify(this.products));
        
        this.showNotification('Изменения сохранены!');
        this.closeEditModal();
        this.closeProductModal();
        
        // Обновляем UI
        if (this.currentPage === 'profile') {
            this.updateProfile();
        } else if (this.currentPage === 'home') {
            this.renderProducts();
        }
    },
    
    // Удалить товар
    deleteProduct() {
        if (!confirm('Вы уверены, что хотите удалить это объявление?')) return;
        
        const productIndex = this.products.findIndex(p => p.id === this.currentProductId);
        if (productIndex === -1) return;
        
        // Удаляем фото из localStorage
        const product = this.products[productIndex];
        if (product.hasPhotos) {
            const photoData = JSON.parse(localStorage.getItem('product_photos') || '{}');
            for (let i = 0; i < product.photoCount; i++) {
                delete photoData[`${product.id}_${i}`];
            }
            localStorage.setItem('product_photos', JSON.stringify(photoData));
        }
        
        // Удаляем из массива
        this.products.splice(productIndex, 1);
        localStorage.setItem('hotwheels_products', JSON.stringify(this.products));
        
        // Удаляем из избранного
        this.favorites.delete(this.currentProductId);
        localStorage.setItem('hotwheels_favorites', JSON.stringify([...this.favorites]));
        
        this.showNotification('Объявление удалено');
        this.closeProductModal();
        
        // Обновляем UI
        if (this.currentPage === 'profile') {
            this.updateProfile();
        } else if (this.currentPage === 'home') {
            this.renderProducts();
        } else if (this.currentPage === 'favorites') {
            this.renderFavorites();
        }
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
            p.seller.id === this.user.id
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
                        ${new Date(product.date).toLocaleDateString('ru-RU')} • 
                        ${this.getRarityName(product.rarity)}
                    </div>
                    <div class="product-actions-inline" style="margin-top: 10px;">
                        <button class="btn-edit" style="padding: 6px 12px; font-size: 12px;" onclick="event.stopPropagation(); App.editProductDirect(${product.id})">
                            ✏️ Редактировать
                        </button>
                        <button class="btn-delete" style="padding: 6px 12px; font-size: 12px;" onclick="event.stopPropagation(); App.deleteProductDirect(${product.id})">
                            🗑️ Удалить
                        </button>
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
    
    // Редактировать товар прямо из профиля
    editProductDirect(id) {
        this.currentProductId = id;
        this.editProduct();
    },
    
    // Удалить товар прямо из профиля
    deleteProductDirect(id) {
        if (!confirm('Вы уверены, что хотите удалить это объявление?')) return;
        
        const productIndex = this.products.findIndex(p => p.id === id);
        if (productIndex === -1) return;
        
        const product = this.products[productIndex];
        
        // Удаляем фото
        if (product.hasPhotos) {
            const photoData = JSON.parse(localStorage.getItem('product_photos') || '{}');
            for (let i = 0; i < product.photoCount; i++) {
                delete photoData[`${product.id}_${i}`];
            }
            localStorage.setItem('product_photos', JSON.stringify(photoData));
        }
        
        // Удаляем товар
        this.products.splice(productIndex, 1);
        localStorage.setItem('hotwheels_products', JSON.stringify(this.products));
        
        // Удаляем из избранного
        this.favorites.delete(id);
        localStorage.setItem('hotwheels_favorites', JSON.stringify([...this.favorites]));
        
        this.showNotification('Объявление удалено');
        this.updateProfile();
        
        if (this.currentPage === 'home') {
            this.renderProducts();
        }
    },
    
    // Показать уведомление
    showNotification(message, type = 'success') {
        // Удаляем старое уведомление
        const oldNotification = document.querySelector('.notification');
        if (oldNotification) oldNotification.remove();
        
        // Создаем новое
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.background = type === 'error' ? '#ef4444' : '#22c55e';
        
        document.body.appendChild(notification);
        
        // Удаляем через 3 секунды
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },
    
    // Загрузка избранного
    loadFavorites() {
        const saved = localStorage.getItem('hotwheels_favorites');
        if (saved) {
            this.favorites = new Set(JSON.parse(saved));
        }
    },
    
    // Сохранение на сервер
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
        usernameInput.value = App.user.telegram || App.user.username || '';
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
        App.user.telegram = usernameInput.value;
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

// Обработка хэша в URL для прямых ссылок на товары
function handleUrlHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#product=')) {
        const productId = parseInt(hash.split('=')[1]);
        if (productId) {
            // Ждем загрузки приложения
            setTimeout(() => {
                const product = App.products.find(p => p.id === productId);
                if (product) {
                    App.showProduct(productId);
                }
            }, 500);
        }
    }
}

// Запуск приложения при загрузке
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    handleUrlHash();
    
    // Слушаем изменения хэша
    window.addEventListener('hashchange', handleUrlHash);
});