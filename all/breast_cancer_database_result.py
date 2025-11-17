import sqlite3
import hashlib
import secrets
from datetime import datetime
from typing import Optional, Dict, Any

class BreastCancerDB:
    def __init__(self, db_name='breast_cancer_database.db'):
        self.connection = sqlite3.connect(db_name, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.cursor = self.connection.cursor()
        self._create_tables()
    
    def _create_tables(self):
        # Создаем таблицу для пациентов
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_code TEXT UNIQUE NOT NULL,
            age INTEGER CHECK (age BETWEEN 0 AND 120),
            gender TEXT CHECK (gender IN ('Мужской', 'Женский', 'Male', 'Female')),
            weight REAL CHECK (weight BETWEEN 1 AND 700),
            height INTEGER CHECK (height BETWEEN 20 AND 300),
            cancer_type TEXT NOT NULL,
            cancer_stage TEXT CHECK (cancer_stage IN ('1', '2', '3')),
            initial_tumor_size REAL CHECK (initial_tumor_size BETWEEN 0.01 AND 20),
            distant_metastases_count INTEGER DEFAULT 0,
            treatment_type TEXT,
            menopausal_status TEXT,
            histological_grading TEXT CHECK (histological_grading IN ('G1', 'G2', 'G3', 'G4')),
            ecog INTEGER CHECK (ecog BETWEEN 0 AND 4),
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Таблица динамики опухоли
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS tumor_dynamics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_code TEXT NOT NULL,
            measurement_date DATE DEFAULT CURRENT_DATE,
            tumor_size REAL NOT NULL,
            measurement_type TEXT CHECK (measurement_type IN ('before', '3m', '6m', '12m', '24m')),
            FOREIGN KEY (patient_code) REFERENCES patients(patient_code) ON DELETE CASCADE,
            UNIQUE(patient_code, measurement_type)
        )
        ''')
        
        # Таблица результатов лечения
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS treatment_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_code TEXT NOT NULL,
            survival_months REAL CHECK (survival_months >= 0),
            performance_status INTEGER CHECK (performance_status BETWEEN 0 AND 4),
            treatment_response TEXT,
            distant_metastases_count INTEGER DEFAULT 0,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_code) REFERENCES patients(patient_code) ON DELETE CASCADE
        )
        ''')
        
        # Индексы для ускорения поиска
        self.cursor.executescript('''
        CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code);
        CREATE INDEX IF NOT EXISTS idx_patients_stage ON patients(cancer_stage);
        CREATE INDEX IF NOT EXISTS idx_tumor_patient ON tumor_dynamics(patient_code);
        CREATE INDEX IF NOT EXISTS idx_results_patient ON treatment_results(patient_code);
        ''')
        # performance_status INTEGER CHECK (BETWEEN 0 AND 5) описание
        # Статус работоспособности по шкале ECOG:
        # 0 = Полностью активен
        # 1 = Ограниченно активен
        # 2 = Более 50% времени бодрствования
        # 3 = Ограниченная способность к самообслуживанию
        # 4 = Полная нетрудоспособность

        self.connection.commit()

    # Хэширование:
    def create_patient_code(self, patient_data: Dict[str, Any]) -> str:
        """Создание уникального кода пациента"""
        medical_info = f"{patient_data['age']}_{patient_data['cancer_type']}_{patient_data.get('cancer_stage', 'Unknown')}"
        random_part = secrets.token_hex(4)
        full_string = f"{medical_info}_{random_part}_{datetime.now().timestamp()}"
        patient_hash = hashlib.sha256(full_string.encode()).hexdigest()[:8]
        return f"BC_{patient_hash.upper()}"

    def add_patient(self, patient_info: Dict[str, Any]) -> Optional[str]:
        """Добавление нового пациента с ФИО и стадией"""
        try:
            patient_code = self.create_patient_code(patient_info)
            
            self.cursor.execute('''
                INSERT INTO patients (
                    patient_code, age, gender, weight, height, cancer_type, cancer_stage,
                    initial_tumor_size, distant_metastases_count, histological_grading, ecog,
                    menopausal_status, treatment_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                patient_code,
                patient_info.get('age'),
                patient_info.get('gender', 'Женский'),
                patient_info.get('weight'),
                patient_info.get('height'),
                patient_info.get('cancer_type'),
                patient_info.get('cancer_stage'),
                patient_info.get('initial_tumor_size'),
                patient_info.get('distant_metastases_count', 0),
                patient_info.get('histological_grading'),
                patient_info.get('ecog', 0),
                patient_info.get('menopausal_status'),
                patient_info.get('treatment_type')
            ))
            
            self.connection.commit()
            print(f"Пациент добавлен со стадией: {patient_info.get('cancer_stage')}")
            return patient_code
            
        except sqlite3.Error as e:
            print(f"Ошибка при добавлении пациента: {e}")
            self.connection.rollback()
            return None

    def add_tumor_measurement(self, patient_code: str, measurement_data: Dict[str, Any]) -> bool:
        # Добавление измерения опухоли
        try:
            query = '''
                INSERT OR REPLACE INTO tumor_dynamics 
                (patient_code, measurement_date, tumor_size, measurement_type)
                VALUES (?, COALESCE(?, CURRENT_DATE), ?, ?)
            '''
            self.cursor.execute(query, (
                patient_code,
                measurement_data.get('measurement_date'),
                measurement_data['tumor_size'],
                measurement_data['measurement_type']
            ))
            self.connection.commit()
            return True
            
        except sqlite3.Error as e:
            print(f"Ошибка при добавлении измерения: {e}")
            self.connection.rollback()
            return False
        
# Результаты лечения:
    def add_treatment_result(self, patient_code: str, result_data: Dict[str, Any]) -> bool:
        # Результаты лечения
        try:
            self.cursor.execute('''
                INSERT INTO treatment_results (
                    patient_code, survival_months, performance_status,
                    treatment_response, distant_metastases_count
                ) VALUES (?, ?, ?, ?, ?)
            ''', (
                patient_code,
                result_data.get('survival_months'),
                result_data.get('performance_status'),
                result_data.get('treatment_response'),
                result_data.get('distant_metastases_count', 0)
            ))
            
            self.connection.commit()
            return True
            
        except sqlite3.Error as e:
            print(f"Ошибка при добавлении результатов: {e}")
            self.connection.rollback()
            return False

    # МЕТОДЫ ДЛЯ РАБОТЫ СО СТАДИЯМИ
    def get_patients_by_stage(self, stage: str) -> list:
        # Получение пациентов по стадии рака (1, 2, 3)
        if stage not in ['1', '2', '3']:
            raise ValueError("Стадия должна быть '1', '2' или '3'")
            
        self.cursor.execute('''
            SELECT * FROM patients 
            WHERE cancer_stage = ? 
            ORDER BY created_date DESC
        ''', (stage,))
        return [dict(row) for row in self.cursor.fetchall()]

    def get_stage_statistics(self) -> Dict:
        """Статистика по трём стадиям рака"""
        self.cursor.execute('''
            SELECT cancer_stage, COUNT(*) as count 
            FROM patients 
            GROUP BY cancer_stage 
            ORDER BY cancer_stage
        ''')
        stats = {row['cancer_stage']: row['count'] for row in self.cursor.fetchall()}
        
        # Гарантируем, что все три стадии будут в результатах
        for stage in ['1', '2', '3']:
            if stage not in stats:
                stats[stage] = 0
                
        return stats

    def get_stage_info(self) -> Dict:
        return {
            '1': {
                'name': 'Первая стадия',
                'description': 'Ранняя стадия, небольшая локальная опухоль'
            },
            '2': {
                'name': 'Вторая стадия', 
                'description': 'Локально распространенный рак'
            },
            '3': {
                'name': 'Третья стадия',
                'description': 'Местно-распространенный рак с поражением лимфоузлов'
            }
        }

    # ОСНОВНЫЕ МЕТОДЫ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ
    def get_patient(self, patient_code: str) -> Optional[Dict]:
        """Получение данных пациента"""
        self.cursor.execute('SELECT * FROM patients WHERE patient_code = ?', (patient_code,))
        row = self.cursor.fetchone()
        return dict(row) if row else None

    def get_patient_tumor_history(self, patient_code: str) -> list:
        """Получение истории измерений опухоли"""
        self.cursor.execute('''
            SELECT * FROM tumor_dynamics 
            WHERE patient_code = ? 
            ORDER BY measurement_date
        ''', (patient_code,))
        return [dict(row) for row in self.cursor.fetchall()]

    def get_all_patients(self, limit: int = 100) -> list:
        """Получение списка всех пациентов"""
        self.cursor.execute('SELECT * FROM patients ORDER BY created_date DESC LIMIT ?', (limit,))
        return [dict(row) for row in self.cursor.fetchall()]

    def close(self):
        """Закрытие соединения с бд"""
        self.connection.close()

# Пример использования с ФИО
def example_usage():
    db = BreastCancerDB()
    
    # Примеры пациентов с ФИО и разными стадиями
    patients = [
        {
            'age': 45,
            'gender': 'Женский',
            'weight': 62.0,
            'height': 165,
            'cancer_type': 'HR+HER2-',
            'cancer_stage': '1',
            'initial_tumor_size': 1.5,
            'distant_metastases_count': 0,
            'histological_grading': 'G1',
            'ecog': 0,
            'menopausal_status': 'premenopausal',
            'treatment_type': 'lumpectomy'
        },
        {
            'age': 52,
            'gender': 'Женский',
            'weight': 68.2,
            'height': 162,
            'cancer_type': 'HR+HER2-',
            'cancer_stage': '2',
            'initial_tumor_size': 3.2,
            'distant_metastases_count': 2,
            'histological_grading': 'G2',
            'ecog': 1,
            'menopausal_status': 'postmenopausal', 
            'treatment_type': 'mastectomy_chemo'
        },
        {
            'age': 58,
            'gender': 'Женский',
            'weight': 71.5,
            'height': 158,
            'cancer_type': 'Triple Negative',
            'cancer_stage': '3',
            'initial_tumor_size': 5.1,
            'distant_metastases_count': 5,
            'histological_grading': 'G3',
            'ecog': 1,
            'menopausal_status': 'postmenopausal',
            'treatment_type': 'neoadjuvant_chemo'
        }
    ]
    
    # Добавляем пациентов
    for patient in patients:
        code = db.add_patient(patient)
        if code:
            print(f"Добавлен пациент со стадией {patient['cancer_stage']}, код: {code}")
    
    # Получаем статистику
    stats = db.get_stage_statistics()
    print("\nСтатистика по стадиям:")
    for stage, count in stats.items():
        print(f"  Стадия {stage}: {count} пациентов")
    
    # Получаем информацию о стадиях
    stage_info = db.get_stage_info()
    print("\nИнформация о стадиях:")
    for stage, info in stage_info.items():
        print(f"  Стадия {stage}: {info['name']} - {info['description']}")
    
    db.close()

# Быстрый тест
def quick_test():
    """Минимальная проверка работы БД"""
    db = BreastCancerDB()
    
    test_patient = {
        'age': 47,
        'gender': 'Женский',
        'weight': 65.5,
        'height': 165,
        'cancer_type': 'HR+HER2-',
        'cancer_stage': '2',
        'initial_tumor_size': 2.1,
        'distant_metastases_count': 1,
        'histological_grading': 'G2',
        'ecog': 0,
        'menopausal_status': 'premenopausal',
        'treatment_type': 'surgery_only'
    }
    
    patient_code = db.add_patient(test_patient)
    if patient_code:
        print(f"Тестовый пациент создан: {patient_code}")
        
        # Проверяем поиск по коду
        found = db.get_patient(patient_code)
        if found:
            print(f"Найден пациент с кодом: {found['patient_code']}")
    
    db.close()

if __name__ == "__main__":
    quick_test()  # тест
    example_usage()