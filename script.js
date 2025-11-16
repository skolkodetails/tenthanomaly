// Главный класс приложения
class ChemotherapyOptimizer {
    constructor() {
        this.currentSection = 'form';
        this.simulationData = null;
        this.init();
    }

    // Инициализация приложения
    init() {
        console.log('Приложение инициализировано');
        this.loadPatientForm();
        this.setupEventListeners();
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработчики уже встроены в HTML через onclick
        console.log('Обработчики событий настроены');
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

    // Загрузка формы ввода данных пациента
    loadPatientForm() {
        const container = document.getElementById('patient-form-container');
        if (!container) return;

        container.innerHTML = `
            <form class="patient-form" onsubmit="app.handleFormSubmit(event)">
                <h2>Данные пациента с РМЖ II стадии</h2>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Возраст *</label>
                        <input type="number" name="age" min="18" max="120" required>
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

                <div class="form-group">
                    <label>Исходный размер опухоли (мм) *</label>
                    <input type="number" name="tumour_size_mm" step="0.1" min="1" max="200" required>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>ER статус</label>
                        <select name="ER_status">
                            <option value="">Не указан</option>
                            <option value="positive">Положительный</option>
                            <option value="negative">Отрицательный</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>PR статус</label>
                        <select name="PR_status">
                            <option value="">Не указан</option>
                            <option value="positive">Положительный</option>
                            <option value="negative">Отрицательный</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>HER2 статус</label>
                        <select name="HER2_status">
                            <option value="">Не указан</option>
                            <option value="positive">Положительный</option>
                            <option value="negative">Отрицательный</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Вес (кг)</label>
                        <input type="number" name="weight" step="0.1" min="30" placeholder="Введите вес">
                    </div>

                    <div class="form-group">
                        <label>Рост (см)</label>
                        <input type="number" name="height" min="100" placeholder="Введите рост">
                    </div>
                </div>

                <div class="form-group">
                    <label>Предлагаемая схема лечения</label>
                    <select name="treatment_type">
                        <option value="chemo">Химиотерапия</option>
                        <option value="hormonal">Гормональная терапия</option>
                        <option value="target">Таргетная терапия</option>
                        <option value="combo">Комбинированная терапия</option>
                    </select>
                </div>

                <button type="submit" class="submit-btn">Запустить моделирование</button>
            </form>
        `;
    }

    // Обработка отправки формы
    async handleFormSubmit(event) {
        event.preventDefault();
        console.log('Форма отправлена');
        
        // Собираем данные формы
        const formData = new FormData(event.target);
        const patientData = {};
        for (let [key, value] of formData.entries()) {
            patientData[key] = value;
        }
        
        // Валидация данных
        const errors = this.validatePatientData(patientData);
        if (errors.length > 0) {
            alert('Пожалуйста, исправьте ошибки:\n' + errors.join('\n'));
            return;
        }

        // Показываем состояние загрузки
        const submitBtn = event.target.querySelector('.submit-btn');
        submitBtn.textContent = 'Моделирование...';
        submitBtn.disabled = true;

        try {
            // Имитируем запрос к бэкенду
            this.simulationData = await this.simulateTreatment(patientData);
            this.showSection('results');
        } catch (error) {
            alert('Ошибка при моделировании: ' + error.message);
            console.error('Ошибка:', error);
        } finally {
            // Восстанавливаем кнопку
            submitBtn.textContent = 'Запустить моделирование';
            submitBtn.disabled = false;
        }
    }

    // Валидация данных пациента
    validatePatientData(data) {
        const errors = [];
        
        if (!data.age || data.age < 18 || data.age > 120) {
            errors.push('Возраст должен быть от 18 до 120 лет');
        }
        
        if (!data.tumour_size_mm || data.tumour_size_mm <= 0 || data.tumour_size_mm > 200) {
            errors.push('Размер опухоли должен быть от 1 до 200 мм');
        }
        
        if (!data.sex) {
            errors.push('Пожалуйста, укажите пол пациента');
        }

        // Проверка на персональные данные
        const piiPatterns = [
            /[А-Я][а-я]+\s[А-Я][а-я]+\s[А-Я][а-я]+/i, // ФИО
            /\d{6,}/, // Длинные числовые последовательности
            /@\w+\.\w+/ // Email
        ];

        Object.values(data).forEach(value => {
            if (typeof value === 'string') {
                piiPatterns.forEach(pattern => {
                    if (pattern.test(value)) {
                        errors.push('Обнаружены персональные данные. Пожалуйста, удалите их для анонимности.');
                    }
                });
            }
        });
        
        return errors;
    }

    // Имитация моделирования лечения
    async simulateTreatment(patientData) {
        console.log('Начинаем моделирование для:', patientData);
        
        // Имитация задержки вычислений (1-3 секунды)
        const delay = 1000 + Math.random() * 2000;
        
        return new Promise((resolve) => {
            setTimeout(() => {
                // Генерируем реалистичные моковые данные
                const initialSize = parseFloat(patientData.tumour_size_mm);
                const timePoints = [0, 7, 14, 21, 28, 35, 42, 49, 56, 63];
                
                // Моделируем уменьшение опухоли
                const tumourSize = timePoints.map(day => {
                    if (day === 0) return initialSize;
                    const reduction = initialSize * (0.85 - (0.1 * Math.random()));
                    return Math.max(initialSize * 0.3, reduction * (1 - day/70));
                });
                
                // Моделируем концентрацию препарата
                const drugConcentration = timePoints.map(day => {
                    if (day === 0) return 0;
                    // Пики после введения препарата
                    const base = day % 7 === 0 ? 45 : 20;
                    return base + (Math.random() * 10 - 5);
                });

                const recommendations = this.generateRecommendations(patientData, tumourSize);
                
                resolve({
                    time: timePoints,
                    tumourSize: tumourSize.map(size => Math.round(size * 10) / 10),
                    drugConcentration: drugConcentration.map(conc => Math.round(conc * 10) / 10),
                    recommendations: recommendations,
                    patientData: patientData
                });
            }, delay);
        });
    }

    // Генерация рекомендаций на основе результатов
    generateRecommendations(patientData, tumourSize) {
        const finalSize = tumourSize[tumourSize.length - 1];
        const initialSize = tumourSize[0];
        const reduction = ((initialSize - finalSize) / initialSize) * 100;
        
        if (reduction > 50) {
            return "Отличный ответ на лечение! Рекомендуется продолжить текущую схему. Размер опухоли уменьшился на " + Math.round(reduction) + "%.";
        } else if (reduction > 20) {
            return "Хороший ответ на лечение. Рассмотрите возможность увеличения дозы на 10% для достижения лучшего эффекта. Текущее уменьшение: " + Math.round(reduction) + "%.";
        } else {
            return "Ответ на лечение недостаточный. Рекомендуется пересмотреть схему лечения: рассмотреть комбинированную терапию или увеличение дозировки. Текущее уменьшение: " + Math.round(reduction) + "%.";
        }
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

        const { tumourSize, drugConcentration, time, recommendations, patientData } = this.simulationData;
        
        container.innerHTML = `
            <div class="results-container">
                <div class="results-header">
                    <h2>Результаты моделирования лечения</h2>
                    <button onclick="app.showSection('form')" class="nav-btn">Новый расчет</button>
                </div>
                
                <div class="patient-summary">
                    <h3>Данные пациента:</h3>
                    <p>Возраст: ${patientData.age} лет, Пол: ${patientData.sex === 'female' ? 'женский' : 'мужской'}, 
                    Исходный размер опухоли: ${patientData.tumour_size_mm} мм</p>
                </div>
                
                <div id="chart-container" style="width: 100%; height: 400px;"></div>
                
                <div class="recommendations">
                    <h3>Рекомендации по оптимизации лечения</h3>
                    <div class="recommendation-card">
                        <p>${recommendations}</p>
                    </div>
                </div>
            </div>
        `;

        // Отрисовываем график
        this.renderChart(tumourSize, drugConcentration, time);
    }

    // Отрисовка графика
    renderChart(tumourSize, drugConcentration, time) {
        const trace1 = {
            x: time,
            y: tumourSize,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Размер опухоли (мм)',
            line: { color: '#e74c3c', width: 3 },
            marker: { size: 6, color: '#e74c3c' }
        };

        const trace2 = {
            x: time,
            y: drugConcentration,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Концентрация препарата (мг/л)',
            yaxis: 'y2',
            line: { color: '#3498db', width: 3, dash: 'dot' },
            marker: { size: 6, color: '#3498db' }
        };

        const layout = {
            title: 'Динамика изменения размера опухоли и концентрации препарата',
            xaxis: { 
                title: 'Время (дни)',
                gridcolor: '#ecf0f1'
            },
            yaxis: { 
                title: 'Размер опухоли (мм)',
                gridcolor: '#ecf0f1'
            },
            yaxis2: {
                title: 'Концентрация препарата (мг/л)',
                overlaying: 'y',
                side: 'right',
                gridcolor: '#ecf0f1'
            },
            plot_bgcolor: '#f8f9fa',
            paper_bgcolor: '#ffffff',
            legend: { 
                orientation: 'h',
                y: -0.2
            }
        };

        Plotly.newPlot('chart-container', [trace1, trace2], layout, {
            displayModeBar: true,
            displaylogo: false,
            responsive: true
        });
    }

    // Загрузка CSV загрузчика
    loadCSVUploader() {
        const container = document.getElementById('csv-uploader-container');
        if (!container) return;

        container.innerHTML = `
            <div class="patient-form">
                <h2>Пакетная обработка данных</h2>
                
                <div class="form-group">
                    <label>Загрузка CSV файла с данными пациентов</label>
                    <input type="file" id="csv-file" accept=".csv" onchange="app.handleCSVUpload(event)">
                    <p style="margin-top: 10px; font-size: 0.9em; color: #666;">
                        Поддерживается загрузка CSV файлов с данными пациентов. Максимальный размер: 5MB
                    </p>
                </div>
                
                <div style="margin: 2rem 0;">
                    <h3>Шаблон CSV файла</h3>
                    <p>Скачайте шаблон для правильного форматирования данных:</p>
                    <button onclick="app.downloadTemplate()" class="submit-btn">
                        📥 Скачать шаблон CSV
                    </button>
                </div>
            </div>
        `;
    }

    // Обработка загрузки CSV
    handleCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Проверка типа файла
        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Пожалуйста, выберите CSV файл');
            return;
        }

        // Проверка размера файла
        if (file.size > 5 * 1024 * 1024) {
            alert('Файл слишком большой. Максимальный размер: 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvData = e.target.result;
                this.processCSVData(csvData);
            } catch (error) {
                alert('Ошибка при чтении файла: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    // Обработка CSV данных
    processCSVData(csvData) {
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Базовая валидация структуры
        const requiredHeaders = ['age', 'sex', 'tumour_size_mm'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            alert(`В файле отсутствуют обязательные колонки: ${missingHeaders.join(', ')}`);
            return;
        }

        alert(`Файл успешно загружен! Обнаружено ${lines.length - 1} записей пациентов.`);
        console.log('CSV данные:', lines);
        // Здесь можно добавить обработку каждой строки
    }

    // Скачивание шаблона CSV
    downloadTemplate() {
        const template = `age,sex,tumour_size_mm,ER_status,PR_status,HER2_status,weight,height,treatment_type
45,female,25,positive,positive,negative,65,165,chemo
52,female,18,negative,negative,positive,72,160,hormonal
38,female,30,positive,negative,negative,58,170,target
67,female,22,positive,positive,negative,78,162,combo`;

        const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'patient_data_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Создаем глобальный экземпляр приложения
const app = new ChemotherapyOptimizer();

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница загружена, приложение готово к работе');
});