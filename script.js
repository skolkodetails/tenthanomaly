// Главный класс приложения
class ChemotherapyOptimizer {
    constructor() {
        this.currentSection = 'form';
        this.simulationData = null;
        this.currentTheme = 'light';
        this.selectedTherapy = 'none'; // По умолчанию - без лечения
        this.init();
    }

    init() {
        console.log('Приложение инициализировано');
        this.loadTheme();
        this.loadPatientForm();
        this.setupEventListeners();
    }

    defineBreastCancerSubtype(er, pr, her2, ki67) {
        ki67 = parseFloat(ki67);

        if (!er && !pr && !her2) {
            return { name: 'Базальноподобный', code: 'TNBC' };
        }

        if (her2 && !er && !pr) {
            return { name: 'HER2 положительный (не люминальный)', code: 'HR-HER2+' };
        }

        if (er) {
            if (her2) {
                return { name: 'Люминальный В (HER2 положительный)', code: 'HR+HER2+B' };
            } else if (ki67 >= 20 || !pr) {
                return { name: 'Люминальный В (HER2 отрицательный)', code: 'HR+HER2-B' };
            } else {
                return { name: 'Люминальный А', code: 'HR+HER2-A' };
            }
        }

        return { name: 'Неопределенный', code: 'Unknown' };
    }

    defineBreastCancerTreatment(molecularSubtype) {
        const treatments = {
            "TNBC": {
                "subtype": "TNBC",
                "main_therapy": "ХТ с включением антрациклинов и таксанов",
                "recommendations": [
                    "При T1a (≤ 5 мм) и N0: системная терапия не показана",
                    "при T1b и N0 возможно проведение 4 циклов ХТ DC (доцетаксел + циклофосфамид)",
                    "при T1c — T3 или N (+) — ХТ антрациклинами и таксанами: 4 цикла АС/ЕС → 12 еженедельных введений паклитаксела ± карбоплатин"
                ],
                "therapy_type": "chemotherapy"
            },
            "HR-HER2+": {
                "subtype": "HR-HER2+",
                "main_therapy": "ХТ + анти-HER2-терапия",
                "recommendations": [
                    "При T1a (≤ 5 мм) и N0 системная терапия не показана",
                    "при T1b, c (> 5 мм, но ≤ 20 мм) и N0: трастузумаб 12 мес. + ХТ без антрациклинов",
                    "при T2 — T3 (> 20 мм) или N (+): трастузумаб ± пертузумаб 12 мес. + ХТ"
                ],
                "therapy_type": "chemotherapy_her2"
            },
            "HR+HER2+B": {
                "subtype": "HR+HER2+B",
                "main_therapy": "ХТ + анти-HER2-терапия + ГТ",
                "recommendations": [
                    "При T1a (≤ 5 мм) и N0: только адъювантная ГТ",
                    "при T1b, c (> 5 мм, но ≤ 20 мм) и N0: трастузумаб + ХТ без антрациклинов",
                    "при T2 — T3 (> 20 мм) или N (+): трастузумаб ± пертузумаб + ХТ",
                    "после завершения ХТ - адъювантная ГТ с анти-HER2 терапией"
                ],
                "therapy_type": "chemotherapy_her2_hormone"
            },
            "HR+HER2-B": {
                "subtype": "HR+HER2-B",
                "main_therapy": "ХТ в большинстве случаев + ГТ",
                "recommendations": [
                    "При T1a-b (≤10 мм) и N0: только адъювантная ГТ",
                    "при T1c — T2 и N0-1: рассмотреть ХТ при С3, низком РЭ, высоком KI67",
                    "при T3 или N2: ХТ в большинстве случаев",
                    "в пременопаузе: возможен отказ от ХТ в пользу овариальной супрессии"
                ],
                "therapy_type": "chemotherapy_hormone"
            },
            "HR+HER2-A": {
                "subtype": "HR+HER2-A",
                "main_therapy": "Только ГТ в большинстве случаев",
                "recommendations": [
                    "ХТ рассматривать при поражении ≥ 4 лимфоузлов",
                    "режимы ХТ: DC (4 цикла) или AC/EC (4 цикла)"
                ],
                "therapy_type": "hormone_therapy"
            }
        };

        return treatments[molecularSubtype] || {
            "subtype": molecularSubtype,
            "main_therapy": "информация о типе отсутствует",
            "recommendations": [],
            "therapy_type": "unknown"
        };
    }

    loadPatientForm() {
        const container = document.getElementById('patient-form-container');
        if (!container) return;

        container.innerHTML = `
            <form class="patient-form" onsubmit="app.handleFormSubmit(event)">
                <h2>Данные пациента с РМЖ</h2>
                
                <div class="personal-data-section">
                    <h3>Персональные данные</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>ФИО пациента</label>
                            <input type="text" name="patient_name" placeholder="Введите фамилию, имя, отчество" 
                                   oninput="app.checkPII(this)">
                            <div class="input-hint">ФИО используется только для идентификации в системе и не передается третьим лицам</div>
                            <div id="pii-warning" class="warning-message" style="display: none;">
                                ⚠️ Обнаружены возможные персональные данные. Убедитесь в необходимости их ввода.
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Возраст *</label>
                            <input type="number" name="age" min="0" max="120" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Пол *</label>
                            <select name="sex" required>
                                <option value="">Выберите пол</option>
                                <option value="female">Женский</option>
                                <option value="male">Мужской</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Вес (кг)</label>
                            <input type="number" name="weight" step="0.1" min="30" max="1000" placeholder="Введите вес">
                        </div>

                        <div class="form-group">
                            <label>Рост (см)</label>
                            <input type="number" name="height" min="20" max="300" placeholder="Введите рост">
                        </div>
                    </div>
                </div>

                <!-- Клинические данные -->
                <div class="personal-data-section">
                    <h3>Клинические данные</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Стадия рака *</label>
                            <select name="cancer_stage" required>
                                <option value="">Выберите стадию</option>
                                <option value="1">Первая стадия</option>
                                <option value="2">Вторая стадия</option> 
                                <option value="3">Третья стадия</option>
                                <option value="4">Четвертая стадия</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Период менопаузы *</label>
                            <div class="radio-group-horizontal">
                                <label class="radio-label">
                                    <input type="radio" name="menopause_status" value="premenopausal" required>
                                    <span class="radio-custom"></span>
                                    Пременопауза
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="menopause_status" value="perimenopausal" required>
                                    <span class="radio-custom"></span>
                                    Перименопауза
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="menopause_status" value="postmenopausal" required>
                                    <span class="radio-custom"></span>
                                    Постменопауза
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Биомаркеры опухоли -->
                <div class="biomarkers-section">
                    <h3>Биомаркеры опухоли *</h3>
                    
                    <div class="biomarkers-grid">
                        <div class="biomarker-group">
                            <h4>Рецепторный статус *</h4>
                            <div class="checkbox-group-vertical">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="ER_status" value="positive" onchange="app.updateSubtype()">
                                    <span class="checkbox-custom"></span>
                                    ER (Эстрогеновый рецептор) +
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="PR_status" value="positive" onchange="app.updateSubtype()">
                                    <span class="checkbox-custom"></span>
                                    PR (Прогестероновый рецептор) +
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="HER2_status" value="positive" onchange="app.updateSubtype()">
                                    <span class="checkbox-custom"></span>
                                    HER2 (Рецептор 2-го типа) +
                                </label>
                            </div>
                        </div>

                        <div class="subtype-display" id="subtype-display">
                            <h4>Определённый подтип:</h4>
                            <div class="subtype-placeholder">
                                Введите данные биомаркеров для определения подтипа
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Ki67 (%) *</label>
                            <input type="number" name="ki67" min="0" max="100" step="0.1" required 
                                   placeholder="Введите значение от 0 до 100" oninput="app.updateSubtype()">
                            <div class="input-hint">Индекс пролиферативной активности</div>
                        </div>
                        
                        <div class="form-group">
                            <label>Исходный размер опухоли (см) *</label>
                            <input type="number" name="tumour_size_mm" step="0.01" min="0.01" max="20" required>
                        </div>
                    </div>

                    <!-- Скрывающаяся справка по параметрам -->
                    <details class="biomarker-info-collapsible">
                        <summary>Справка по параметрам</summary>
                        <div class="biomarker-info-content">
                            <h4>Справка по параметрам:</h4>
                            <ul>
                                <li><strong>Ki67</strong> - маркер пролиферативной активности. Высокие значения (>20%) указывают на быстрый рост опухоли</li>
                                <li><strong>ER/PR+</strong> - чувствительность к гормональной терапии</li>
                                <li><strong>HER2+</strong> - показание для таргетной терапии</li>
                                <li><strong>Размер опухоли</strong> - исходный диаметр опухолевого образования в сантиметрах</li>
                            </ul>
                        </div>
                    </details>
                </div>

                <button type="submit" class="submit-btn">Спрогнозировать лечение</button>
            </form>
        `;
    }

    // Обновление отображения подтипа в реальном времени
    updateSubtype() {
        const er = document.querySelector('input[name="ER_status"]')?.checked || false;
        const pr = document.querySelector('input[name="PR_status"]')?.checked || false;
        const her2 = document.querySelector('input[name="HER2_status"]')?.checked || false;
        const ki67Input = document.querySelector('input[name="ki67"]');
        const ki67 = ki67Input?.value ? parseFloat(ki67Input.value) : 0;

        const subtypeDisplay = document.getElementById('subtype-display');
        
        if (!er && !pr && !her2 && !ki67) {
            subtypeDisplay.innerHTML = `
                <h4>Определённый подтип:</h4>
                <div class="subtype-placeholder">
                    Введите данные биомаркеров для определения подтипа
                </div>
            `;
            return;
        }

        const subtype = this.defineBreastCancerSubtype(er, pr, her2, ki67);
        const treatment = this.defineBreastCancerTreatment(subtype.code);

        subtypeDisplay.innerHTML = `
            <h4>Определённый подтип:</h4>
            <div class="subtype-badge">${subtype.name}</div>
            <div class="subtype-code">${subtype.code}</div>
            <div class="subtype-therapy">
                <strong>Рекомендуемая терапия:</strong><br>
                ${treatment.main_therapy}
            </div>
            <div class="subtype-recommendations">
                <strong>Рекомендации:</strong>
                <ul>
                    ${treatment.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработчик переключения темы
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        console.log('Обработчики событий настроены');
    }

    // Переключение темы
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', this.currentTheme);
        
        const themeBtn = document.getElementById('theme-toggle');
        themeBtn.textContent = this.currentTheme === 'light' ? '🌙 Тёмная тема' : '☀️ Светлая тема';
        
        // Сохраняем выбор темы в localStorage
        localStorage.setItem('theme', this.currentTheme);
    }

    // Загрузка сохранённой темы
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.currentTheme = savedTheme;
            document.body.setAttribute('data-theme', this.currentTheme);
            
            const themeBtn = document.getElementById('theme-toggle');
            themeBtn.textContent = this.currentTheme === 'light' ? '🌙 Тёмная тема' : '☀️ Светлая тема';
        }
    }

    // Показать определённую секцию
    showSection(sectionName) {
        console.log('Переключаемся на секцию:', sectionName);
        
        // Скрываем все секции
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Убираем активный класс у всех кнопок навигации
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Показываем выбранную секцию
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Активируем соответствующую кнопку навигации
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if (btn.textContent.toLowerCase().includes(this.getSectionKey(sectionName))) {
                btn.classList.add('active');
            }
        });

        this.currentSection = sectionName;
        
        // Загружаем контент для секции
        this.loadSectionContent(sectionName);
    }

    // Вспомогательная функция для ключей секций
    getSectionKey(sectionName) {
        const keys = {
            'form': 'одиночный',
            'batch': 'пакетная', 
            'results': 'результаты'
        };
        return keys[sectionName] || '';
    }

    // Загрузка контента для секции
    loadSectionContent(sectionName) {
        switch(sectionName) {
            case 'form':
                this.loadPatientForm();
                break;
            case 'batch':
                this.loadCSVUploader();
                break;
            case 'results':
                this.loadResults();
                break;
        }
    }

    // Проверка на персональные данные
    checkPII(inputElement) {
        const value = inputElement.value;
        const warningElement = document.getElementById('pii-warning');
        
        // Паттерны для обнаружения ПДн
        const piiPatterns = [
            /[А-Я][а-я]+\s[А-Я][а-я]+\s[А-Я][а-я]+/i, // ФИО (3 слова с заглавными)
            /\d{4}\s?\d{4}\s?\d{4}\s?\d{4}/, // Номер банковской карты
            /\+\d{1,3}\s?\(?\d{3}\)?\s?\d{3}[\s-]?\d{2}[\s-]?\d{2}/, // Телефон
            /@\w+\.\w+/i, // Email
            /\d{6}/ // Почтовый индекс
        ];
        
        const hasPII = piiPatterns.some(pattern => pattern.test(value));
        
        if (hasPII && value.length > 0) {
            warningElement.style.display = 'block';
            inputElement.style.borderColor = '#e74c3c';
        } else {
            warningElement.style.display = 'none';
            inputElement.style.borderColor = '';
        }
    }

    // Хеширование ФИО для анонимизации
    hashPatientName(name) {
        if (!name || name.trim() === '') {
            return 'Анонимный пациент';
        }
        
        // Простое хеширование для демонстрации
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            const char = name.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return `Пациент_${Math.abs(hash).toString(36).substring(0, 8).toUpperCase()}`;
    }

    // Обработка отправки формы
    async handleFormSubmit(event) {
        event.preventDefault();
        console.log('Форма отправлена');
        
        // Собираем данные формы
        const formData = new FormData(event.target);
        const patientData = {};
        
        // Обрабатываем обычные поля
        for (let [key, value] of formData.entries()) {
            // Для чекбоксов собираем булевы значения
            if (['ER_status', 'PR_status', 'HER2_status'].includes(key)) {
                patientData[key] = true; // Если чекбокс отмечен
            } else {
                patientData[key] = value;
            }
        }
        
        // Для неотмеченных чекбоксов устанавливаем false
        const checkboxes = ['ER_status', 'PR_status', 'HER2_status'];
        checkboxes.forEach(checkbox => {
            if (!patientData[checkbox]) {
                patientData[checkbox] = false;
            }
        });
        
        // Обработка ФИО - хеширование для конфиденциальности
        if (patientData.patient_name && patientData.patient_name.trim() !== '') {
            patientData.hashed_name = this.hashPatientName(patientData.patient_name);
        } else {
            patientData.hashed_name = 'Анонимный пациент';
        }
        
        // Валидация данных
        const errors = this.validatePatientData(patientData);
        if (errors.length > 0) {
            alert('Пожалуйста, исправьте ошибки:\n' + errors.join('\n'));
            return;
        }

        // ПРИМЕНЕНИЕ МАТЕМАТИЧЕСКИХ МОДЕЛЕЙ
        // 1. Определяем молекулярный подтип
        const subtype = this.defineBreastCancerSubtype(
            patientData.ER_status,
            patientData.PR_status,
            patientData.HER2_status,
            patientData.ki67
        );
        
        // 2. Определяем рекомендованную терапию
        const treatment = this.defineBreastCancerTreatment(subtype.code);
        
        // Сохраняем результаты моделей
        patientData.molecular_subtype = subtype;
        patientData.recommended_treatment = treatment;

        // Показываем состояние загрузки
        const submitBtn = event.target.querySelector('.submit-btn');
        submitBtn.textContent = 'Моделирование...';
        submitBtn.disabled = true;

        try {
            // СОХРАНЕНИЕ В БАЗУ ДАННЫХ
            await this.saveToDatabase(patientData);
            
            // Имитируем запрос к бэкенду
            this.simulationData = await this.simulateTreatment(patientData);
            this.showSection('results');
        } catch (error) {
            alert('Ошибка при моделировании: ' + error.message);
            console.error('Ошибка:', error);
        } finally {
            // Восстанавливаем кнопку
            submitBtn.textContent = 'Спрогнозировать лечение';
            submitBtn.disabled = false;
        }
    }

    // Метод для сохранения данных в БД
    async saveToDatabase(patientData) {
        try {
            // Подготовка данных для отправки
            const dbData = {
                patient_name: patientData.hashed_name,
                age: patientData.age,
                sex: patientData.sex,
                weight: patientData.weight,
                height: patientData.height,
                cancer_stage: patientData.cancer_stage,
                menopause_status: patientData.menopause_status,
                tumour_size_mm: patientData.tumour_size_mm,
                ki67: patientData.ki67,
                ER_status: patientData.ER_status,
                PR_status: patientData.PR_status,
                HER2_status: patientData.HER2_status,
                molecular_subtype: patientData.molecular_subtype.code,
                recommended_therapy: patientData.recommended_treatment.main_therapy,
                created_at: new Date().toISOString()
            };

            // ЗАМЕНИТЕ ЭТОТ URL НА ВАШ БЭКЕНД ЭНДПОИНТ
            const response = await fetch('https://your-backend-domain.com/api/patients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dbData)
            });

            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }

            const result = await response.json();
            console.log('Данные успешно сохранены в БД:', result);
            return result;

        } catch (error) {
            console.error('Ошибка при сохранении в БД:', error);
            // Можно показать уведомление, но не прерывать процесс
        }
    }

    // Валидация данных пациента
    validatePatientData(data) {
        const errors = [];
        
        if (!data.age || data.age < 0 || data.age > 120) {
            errors.push('Возраст должен быть от 0 до 120 лет');
        }
        
        if (!data.tumour_size_mm || data.tumour_size_mm <= 0 || data.tumour_size_mm > 200) {
            errors.push('Размер опухоли должен быть от 0,01 до 20 см');
        }
        
        if (!data.sex) {
            errors.push('Пожалуйста, укажите пол пациента');
        }

        // Валидация Ki67
        if (!data.ki67 || data.ki67 < 0 || data.ki67 > 100) {
            errors.push('Ki67 должен быть в диапазоне от 0 до 100%');
        }
        
        // Валидация новых обязательных полей
        if (!data.cancer_stage) {
            errors.push('Пожалуйста, укажите стадию рака');
        }
        
        if (!data.menopause_status) {
            errors.push('Пожалуйста, укажите период менопаузы');
        }
        
        // Проверка данных для молекулярных моделей
        if (!data.ki67) {
            errors.push('Ki67 необходим для определения молекулярного подтипа');
        }
        return errors;
    }

    // Имитация моделирования лечения
    async simulateTreatment(patientData) {
        console.log('Начинаем моделирование для:', patientData);
        
        // Имитация задержки вычислений (1-3 секунды)
        const delay = 1000 + Math.random() * 2000;
        
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    patientData: patientData
                });
            }, delay);
        });
    }

    // Генерация данных для 5-летнего прогноза
    generateFiveYearData(patientData) {
        const initialSize = parseFloat(patientData.tumour_size_mm);
        const months = Array.from({length: 61}, (_, i) => i); // 0-60 месяцев (5 лет)
        
        // Кривые для разных типов терапии
        const noTreatment = months.map(month => {
            // Без лечения - опухоль растет
            return initialSize * Math.exp(0.02 * month);
        });
        
        const targetImmuno = months.map(month => {
            // Таргетная иммунная - быстрый ответ, затем стабилизация
            if (month < 12) {
                return initialSize * Math.exp(-0.05 * month);
            } else {
                return Math.max(5, initialSize * 0.3 * Math.exp(-0.01 * (month - 12)));
            }
        });
        
        const targetHormonal = months.map(month => {
            // Таргетная гормональная - медленный, но устойчивый ответ
            return initialSize * Math.exp(-0.03 * month);
        });
        
        const combined = months.map(month => {
            // Комбинированная терапия - максимальный эффект
            return Math.max(2, initialSize * Math.exp(-0.08 * month));
        });
        
        return {
            months,
            noTreatment: noTreatment.map(size => Math.round(size * 10) / 10),
            targetImmuno: targetImmuno.map(size => Math.round(size * 10) / 10),
            targetHormonal: targetHormonal.map(size => Math.round(size * 10) / 10),
            combined: combined.map(size => Math.round(size * 10) / 10)
        };
    }

    // Расчет вероятностей для выбранной терапии
    calculateProbabilities(patientData, therapyType) {
        const age = parseInt(patientData.age);
        const tumorSize = parseFloat(patientData.tumour_size_mm);
        const ki67 = parseFloat(patientData.ki67);
        
        // Базовые вероятности
        let baseSurvival = 85;
        let baseMetastasis = 25;
        let baseSuccess = 70;
        
        // Модификаторы на основе данных пациента
        if (age > 60) baseSurvival -= 10;
        if (age > 70) baseSurvival -= 5;
        
        if (tumorSize > 30) {
            baseSurvival -= 15;
            baseMetastasis += 20;
            baseSuccess -= 10;
        }
        
        // Модификаторы Ki67
        if (ki67 > 30) {
            baseSurvival -= 15;
            baseMetastasis += 15;
            baseSuccess -= 10;
        } else if (ki67 > 20) {
            baseSurvival -= 8;
            baseMetastasis += 8;
            baseSuccess -= 5;
        }
        
        // Положительные эффекты от чувствительности
        if (patientData.ER_status && therapyType.includes('Hormonal')) {
            baseSurvival += 10;
            baseSuccess += 15;
        }
        
        if (patientData.HER2_status && therapyType.includes('Immuno')) {
            baseSurvival += 8;
            baseSuccess += 12;
        }
        
        // Модификаторы на основе терапии
        const therapyModifiers = {
            'none': { survival: 0.6, metastasis: 1.8, success: 0.3 },
            'targetImmuno': { survival: 1.1, metastasis: 0.7, success: 1.2 },
            'targetHormonal': { survival: 1.2, metastasis: 0.6, success: 1.3 },
            'combined': { survival: 1.4, metastasis: 0.4, success: 1.5 }
        };
        
        const modifier = therapyModifiers[therapyType] || therapyModifiers.none;
        
        return {
            survival: Math.max(0, Math.min(100, Math.round(baseSurvival * modifier.survival))),
            metastasis: Math.max(0, Math.min(100, Math.round(baseMetastasis * modifier.metastasis))),
            success: Math.max(0, Math.min(100, Math.round(baseSuccess * modifier.success)))
        };
    }

    // Обработчик выбора терапии
    handleTherapyChange(therapyType) {
        this.selectedTherapy = therapyType;
        this.updateChart();
        this.updateProbabilities();
    }

    // Обновление графика
    updateChart() {
        if (!this.simulationData) return;
        
        const { patientData } = this.simulationData;
        const fiveYearData = this.generateFiveYearData(patientData);
        this.renderFiveYearChart(fiveYearData, this.selectedTherapy);
    }

    // Обновление вероятностей
    updateProbabilities() {
        if (!this.simulationData) return;
        
        const { patientData } = this.simulationData;
        const probabilities = this.calculateProbabilities(patientData, this.selectedTherapy);
        
        document.getElementById('survival-prob').textContent = probabilities.survival + '%';
        document.getElementById('metastasis-prob').textContent = probabilities.metastasis + '%';
        document.getElementById('success-prob').textContent = probabilities.success + '%';
    }

    // Отрисовка графика 5-летнего прогноза
    renderFiveYearChart(data, selectedTherapy) {
        // Цвета для разных терапий
        const colors = {
            'none': '#e74c3c',
            'targetImmuno': '#3498db', 
            'targetHormonal': '#2ecc71',
            'combined': '#9b59b6'
        };
        
        const traces = [
            {
                x: data.months,
                y: data.noTreatment,
                type: 'scatter',
                mode: 'lines',
                name: 'Без лечения',
                line: { 
                    color: colors.none,
                    width: selectedTherapy === 'none' ? 4 : 2,
                    dash: 'solid'
                }
            },
            {
                x: data.months,
                y: data.targetImmuno,
                type: 'scatter',
                mode: 'lines',
                name: 'Таргетная иммунная',
                line: { 
                    color: colors.targetImmuno,
                    width: selectedTherapy === 'targetImmuno' ? 4 : 2,
                    dash: 'solid'
                }
            },
            {
                x: data.months,
                y: data.targetHormonal,
                type: 'scatter',
                mode: 'lines',
                name: 'Таргетная гормональная',
                line: { 
                    color: colors.targetHormonal,
                    width: selectedTherapy === 'targetHormonal' ? 4 : 2,
                    dash: 'solid'
                }
            },
            {
                x: data.months,
                y: data.combined,
                type: 'scatter',
                mode: 'lines',
                name: 'Комбинированная терапия',
                line: { 
                    color: colors.combined,
                    width: selectedTherapy === 'combined' ? 4 : 2,
                    dash: 'solid'
                }
            }
        ];

        const layout = {
            title: 'Прогноз изменения размера опухоли в течение 5 лет',
            xaxis: { 
                title: 'Время (месяцы)',
                gridcolor: '#ecf0f1',
                range: [0, 60]
            },
            yaxis: { 
                title: 'Размер опухоли (см)',
                gridcolor: '#ecf0f1'
            },
            plot_bgcolor: '#f8f9fa',
            paper_bgcolor: '#ffffff',
            legend: { 
                orientation: 'h',
                y: -0.3
            },
            hovermode: 'closest'
        };

        Plotly.newPlot('chart-container', traces, layout, {
            displayModeBar: true,
            displaylogo: false,
            responsive: true
        });

        // Добавляем обработчик клика по легенде
        document.getElementById('chart-container').on('plotly_legendclick', (data) => {
            const therapyMap = {
                'Без лечения': 'none',
                'Таргетная иммунная': 'targetImmuno',
                'Таргетная гормональная': 'targetHormonal',
                'Комбинированная терапия': 'combined'
            };
            
            const therapyType = therapyMap[data.node.textContent];
            if (therapyType) {
                this.handleTherapyChange(therapyType);
                // Обновляем радио-кнопки
                document.querySelector(`input[name="therapy"][value="${therapyType}"]`).checked = true;
            }
            return false; // Предотвращаем скрытие кривой
        });
    }

    // Загрузка секции результатов
    loadResults() {
        const container = document.getElementById('results-container');
        if (!container) return;
        
        if (!this.simulationData) {
            container.innerHTML = `
                <div class="no-data">
                    <h3>Нет данных для отображения</h3>
                    <p>Запустите моделирование для просмотра результатов</p>
                    <button onclick="app.showSection('form')" class="submit-btn">Вернуться к форме ввода</button>
                </div>
            `;
            return;
        }

        const { patientData } = this.simulationData;
        const fiveYearData = this.generateFiveYearData(patientData);
        const initialProbabilities = this.calculateProbabilities(patientData, this.selectedTherapy);
        
        container.innerHTML = `
            <div class="results-container">
                <div class="results-header">
                    <h2>Результаты прогнозирования лечения</h2>
                    <button onclick="app.showSection('form')" class="nav-btn">Новый расчет</button>
                </div>
                
                <div class="patient-summary">
                    <h3>Данные пациента:</h3>
                    <p><strong>Идентификатор:</strong> ${patientData.hashed_name}</p>
                    <p>Возраст: ${patientData.age} лет, Пол: ${patientData.sex === 'female' ? 'женский' : 'мужской'}, 
                    Размер опухоли: ${patientData.tumour_size_mm} см, Ki67: ${patientData.ki67}%</p>
                    <p>Стадия рака: ${patientData.cancer_stage}, Менопауза: ${patientData.menopause_status}</p>
                    <p>Биомаркеры: 
                        ${patientData.ER_status ? 'ER+ ' : 'ER- '}
                        ${patientData.PR_status ? 'PR+ ' : 'PR- '}
                        ${patientData.HER2_status ? 'HER2+ ' : 'HER2- '}
                    </p>
                </div>

                <!-- Молекулярный анализ -->
                <div class="molecular-analysis">
                    <h3>Молекулярный анализ</h3>
                    <div class="analysis-results">
                        <div class="subtype-card">
                            <h4>Определённый подтип:</h4>
                            <div class="subtype-badge">${patientData.molecular_subtype.name}</div>
                            <div class="subtype-code">${patientData.molecular_subtype.code}</div>
                        </div>
                        
                        <div class="treatment-card">
                            <h4>Рекомендованная терапия:</h4>
                            <div class="main-therapy">${patientData.recommended_treatment.main_therapy}</div>
                            
                            <div class="recommendations-list">
                                <h5>Рекомендации:</h5>
                                <ul>
                                    ${patientData.recommended_treatment.recommendations.map(rec => 
                                        `<li>${rec}</li>`
                                    ).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="therapy-selection">
                    <h3>Выберите вариант терапии для прогноза:</h3>
                    <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" name="therapy" value="none" checked>
                            <span class="radio-custom"></span>
                            Без лечения
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="therapy" value="targetImmuno">
                            <span class="radio-custom"></span>
                            Таргетная иммунная
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="therapy" value="targetHormonal">
                            <span class="radio-custom"></span>
                            Таргетная гормональная
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="therapy" value="combined">
                            <span class="radio-custom"></span>
                            Комбинированная терапия
                        </label>
                    </div>
                </div>
                
                <div id="chart-container" style="width: 100%; height: 500px; margin: 2rem 0;"></div>
                
                <div class="probabilities-container">
                    <h3>Прогноз для выбранной терапии (5 лет):</h3>
                    <div class="probabilities-grid">
                        <div class="probability-card">
                            <div class="prob-icon">📊</div>
                            <div class="prob-content">
                                <h4>Вероятность выживания</h4>
                                <div class="prob-value" id="survival-prob">${initialProbabilities.survival}%</div>
                                <p>Шанс пациента прожить более 5 лет</p>
                            </div>
                        </div>
                        <div class="probability-card">
                            <div class="prob-icon">⚠️</div>
                            <div class="prob-content">
                                <h4>Вероятность метастазов</h4>
                                <div class="prob-value" id="metastasis-prob">${initialProbabilities.metastasis}%</div>
                                <p>Риск развития отдаленных метастазов</p>
                            </div>
                        </div>
                        <div class="probability-card">
                            <div class="prob-icon">✅</div>
                            <div class="prob-content">
                                <h4>Вероятность успеха</h4>
                                <div class="prob-value" id="success-prob">${initialProbabilities.success}%</div>
                                <p>Шанс достижения ремиссии</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="recommendations">
                    <h3>Рекомендации</h3>
                    <div class="recommendation-card">
                        <p>${this.generateRecommendation(patientData, this.selectedTherapy)}</p>
                    </div>
                </div>
            </div>
        `;

        // Отрисовываем график
        this.renderFiveYearChart(fiveYearData, this.selectedTherapy);

        // Настраиваем обработчики для радио-кнопок
        this.setupTherapyListeners();
    }

    // Настройка обработчиков для выбора терапии
    setupTherapyListeners() {
        const radioButtons = document.querySelectorAll('input[name="therapy"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (event) => {
                if (event.target.checked) {
                    this.handleTherapyChange(event.target.value);
                }
            });
        });
    }

    // Генерация рекомендаций
    generateRecommendation(patientData, therapyType) {
        const probabilities = this.calculateProbabilities(patientData, therapyType);
        
        if (therapyType === 'none') {
            return "Рекомендуется рассмотреть варианты активного лечения для улучшения прогноза.";
        } else if (probabilities.success > 80) {
            return "Отличный прогноз! Рекомендуется выбранная схема лечения с регулярным мониторингом.";
        } else if (probabilities.success > 60) {
            return "Хороший прогноз. Рекомендуется выбранная терапия с возможностью коррекции дозировки.";
        } else {
            return "Рассмотрите альтернативные схемы лечения или комбинированные подходы для улучшения результатов.";
        }
    }
}

// Создаем глобальный экземпляр приложения
const app = new ChemotherapyOptimizer();

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница загружена, приложение готово к работе');
});