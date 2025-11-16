
# Импортируем нужные инструменты 
import sqlite3
import hashlib # Для хэширования 
import secrets  # Для создания случайных чисел

# Создаем базу данных 
connection = sqlite3.connect('breast_cancer_database.db')
cursor = connection.cursor()

# Создаем таблицу для пациентов 
cursor.execute('''
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_code TEXT UNIQUE,
    age INTEGER CHECK (age BETWEEN 0 AND 120),
    gender TEXT CHECK (gender IN ('Мужской', 'Женский', 'Male', 'Female')),
    weight REAL CHECK (weight BETWEEN 0.1 AND 700),
    height INTEGER CHECK (height BETWEEN 20 AND 300),
    cancer_type TEXT NOT NULL,
    initial_tumor_size REAL CHECK (initial_tumor_size BETWEEN 1 AND 200),
    distant_metastases BOOLEAN,
    histological_grading TEXT CHECK (histological_grading IN ('G1', 'G2', 'G3', 'G4')),
    ecog INTEGER CHECK (ecog BETWEEN 0 AND 5),
    
    treatment TEXT
    
)
''')

# Были в датасете но нет в остальных, надо? Если да, то поставить повыше
# menopausal_status TEXT,
# treatment_type TEXT,
# surgery_type TEXT,
# Если надо будет отобразить дату и время создания каждой записи(тоже наверх):
# created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP

# Таблицу отслеживания изменений опухоли
cursor.execute('''
CREATE TABLE IF NOT EXISTS tumor_dynamics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_code TEXT,
    measurement_date DATE,
    tumor_size REAL,
    measurement_type TEXT CHECK (measurement_type IN ('before', '3m', '6m', '12m', '24m')),
    
    FOREIGN KEY (patient_code) REFERENCES patients(patient_code)
)
''')

# Таблица для результатов лечения
cursor.execute('''
CREATE TABLE IF NOT EXISTS treatment_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_code TEXT,
    survival_months REAL,
    performance_status INTEGER CHECK (performance_status BETWEEN 0 AND 5),
    treatment_response TEXT,
    distant_metastases BOOLEAN,
    
    FOREIGN KEY (patient_code) REFERENCES patients(patient_code)
)
''')
# performance_status INTEGER CHECK (BETWEEN 0 AND 5) описание
# Статус работоспособности по шкале ECOG:
# 0 = Полностью активен
# 1 = Ограниченно активен
# 2 = Более 50% времени бодрствования
# 3 = Ограниченная способность к самообслуживанию
# 4 = Полная нетрудоспособность
# 5 - смерть

connection.commit()

# Хэширование:
def create_patient_code(patient_data):

    # Медицинские данные для создания кода
    medical_info = f"{patient_data['age']}_{patient_data['cancer_type']}_{patient_data['initial_tumor_size']}"
    
    # Случайная часть для уникальности
    random_part = secrets.token_hex(6)  # 6 байт случайности
    
    # Создание хеша (превращаем в набор букв и цифр)
    full_string = f"{medical_info}_{random_part}"
    patient_hash = hashlib.sha256(full_string.encode()).hexdigest()[:10]
    
    return f"BC_{patient_hash.upper()}"

# Пример 
test_data = {
    'age': 45,
    'cancer_type': 'HR+HER2-', 
    'initial_tumor_size': 2.1
}
test_code = create_patient_code(test_data)
print(f"Пример кода пациента: {test_code}")


class BreastCancerDB:
    def __init__(self, db_name='breast_cancer_database.db'):
        self.connection = sqlite3.connect(db_name)
        self.cursor = self.connection.cursor()
        print("База данных готова к работе!")
    
    def add_patient(self, patient_info):
        # Добавляем нового пациента
        
        # Создаем секретный код
        patient_code = create_patient_code(patient_info)
        
        try:
            distant_metastases_bool = patient_info.get('distant_metastases', 'No').lower() == 'yes'
            # Вставляем данные в таблицу patients
            self.cursor.execute('''
                INSERT INTO patients (
                    patient_code, age, gender, weight, height, cancer_type,
                    initial_tumor_size, distant_metastases, histological_grading, ecog,
                    menopausal_status, treatment_type, surgery_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                patient_code,
                patient_info.get('age'),
                patient_info.get('gender', 'Женский'),
                patient_info.get('weight'),
                patient_info.get('height'),
                patient_info.get('cancer_type'),
                patient_info.get('initial_tumor_size'),
                patient_info.get('distant_metastases', 'No'),
                patient_info.get('histological_grading'),
                patient_info.get('ecog', 0),
                patient_info.get('menopausal_status'),
                patient_info.get('treatment_type'),
                patient_info.get('surgery_type')
            ))
            
            # Сохраняем изменения
            self.connection.commit()
            print(f"Пациент добавлен. Персональный код: {patient_code}")
            return patient_code
            
        except sqlite3.Error as e:
            print(f"Ошибка при добавлении пациента: {e}")
            return None
    
    def add_tumor_measurement(self, patient_code, measurement_data):
        # Динамика
        try:
            self.cursor.execute('''
                INSERT INTO tumor_dynamics (
                    patient_code, measurement_date, tumor_size, measurement_type
                ) VALUES (?, ?, ?, ?)
            ''', (
                patient_code,
                measurement_data.get('measurement_date'),
                measurement_data.get('tumor_size'),
                measurement_data.get('measurement_type')
            ))
            
            self.connection.commit()
            print(f"Измерение добавлено для пациента {patient_code}")
            
        except sqlite3.Error as e:
            print(f"Ошибка при добавлении измерения: {e}")
    
    def add_treatment_result(self, patient_code, result_data):
        # Результаты лечения
        try:
            self.cursor.execute('''
                INSERT INTO treatment_results (
                    patient_code, survival_months, performance_status,
                    treatment_response, has_metastasis, metastasis_sites,
                    lymph_node_status, positive_lymph_nodes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                patient_code,
                result_data.get('survival_months'),
                result_data.get('performance_status'),
                result_data.get('treatment_response'),
                result_data.get('has_metastasis', False),
                result_data.get('metastasis_sites'),
                result_data.get('lymph_node_status'),
                result_data.get('positive_lymph_nodes', 0)
            ))
            
            self.connection.commit()
            print(f"Результаты лечения добавлены для {patient_code}")
            
        except sqlite3.Error as e:
            print(f"Ошибка при добавлении результатов: {e}")

    

def test_complete_database():
# Тест

    db = BreastCancerDB()
    
    # ДАННЫЕ ДЛЯ ТЕСТОВОГО ПАЦИЕНТА
    test_patient = {
        'age': 45,
        'gender': 'Женский',
        'weight': 65.5,
        'height': 165,
        'cancer_type': 'HR+HER2-',
        'initial_tumor_size': 2.1,
        'distant_metastases': 'No',
        'histological_grading': 'G2',
        'ecog': 0,
        'menopausal_status': 'premenopausal',
        'treatment_type': 'surgery_only',
        'surgery_type': 'lumpectomy'
    }
    
    # ДОБАВЛЯЕМ ПАЦИЕНТА
    patient_code = db.add_patient(test_patient)
    
    if patient_code:
        print(f"Пациент добавлен. Персональный код: {patient_code}")
        
        # ДОБАВЛЯЕМ ИЗМЕРЕНИЯ ОПУХОЛИ 
        # Передаем только код пациента, размер опухоли и тип измерения
        db.add_tumor_measurement(patient_code, 2.1, 'before')
        db.add_tumor_measurement(patient_code, 1.2, '3m') 
        db.add_tumor_measurement(patient_code, 1.1, '6m')
        
        # ДОБАВЛЯЕМ РЕЗУЛЬТАТЫ ЛЕЧЕНИЯ
        treatment_results = {
            'survival_months': 24.5,
            'performance_status': 0,
            'treatment_response': 'stable',
            'has_metastasis': False,
            'lymph_node_status': 'negative',
            'positive_lymph_nodes': 0
        }
        
        db.add_treatment_result(patient_code, treatment_results)
        
        # ПРОВЕРЯЕМ ЧТО ПОЛУЧИЛОСЬ
        print("\nПроверка:")
        db.cursor.execute('''
            SELECT measurement_date, tumor_size, measurement_type 
            FROM tumor_dynamics 
            WHERE patient_code = ?
        ''', (patient_code,))
        
        measurements = db.cursor.fetchall()
        for date, size, m_type in measurements:
            print(f"  Дата: {date}, Размер: {size}см, Тип: {m_type}")
    
    # Закрываем соединение с базой
    db.connection.close()
    print("Тестирование завершено! База данных работает!")

# Запускаем тест
if __name__ == "__main__":
    test_complete_database()