from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import hashlib
import secrets
from datetime import datetime
from typing import Optional, Dict, Any

app = Flask(__name__)
CORS(app)  # Разрешаем запросы от фронтенда

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
            er_status BOOLEAN,
            pr_status BOOLEAN,
            her2_status BOOLEAN,
            ki67 REAL,
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
        
        self.connection.commit()

    def create_patient_code(self, patient_data: Dict[str, Any]) -> str:
        """Создание уникального кода пациента"""
        medical_info = f"{patient_data['age']}_{patient_data['cancer_type']}_{patient_data.get('cancer_stage', 'Unknown')}"
        random_part = secrets.token_hex(4)
        full_string = f"{medical_info}_{random_part}_{datetime.now().timestamp()}"
        patient_hash = hashlib.sha256(full_string.encode()).hexdigest()[:8]
        return f"BC_{patient_hash.upper()}"

    def add_patient(self, patient_info: Dict[str, Any]) -> Optional[str]:
        """Добавление нового пациента"""
        try:
            patient_code = self.create_patient_code(patient_info)
            
            self.cursor.execute('''
                INSERT INTO patients (
                    patient_code, age, gender, weight, height, cancer_type, cancer_stage,
                    initial_tumor_size, distant_metastases_count, histological_grading, ecog,
                    menopausal_status, treatment_type, er_status, pr_status, her2_status, ki67
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                patient_info.get('histological_grading', 'G2'),
                patient_info.get('ecog', 0),
                patient_info.get('menopausal_status'),
                patient_info.get('treatment_type'),
                patient_info.get('er_status'),
                patient_info.get('pr_status'),
                patient_info.get('her2_status'),
                patient_info.get('ki67')
            ))
            
            self.connection.commit()
            print(f"Пациент добавлен со стадией: {patient_info.get('cancer_stage')}")
            return patient_code
            
        except sqlite3.Error as e:
            print(f"Ошибка при добавлении пациента: {e}")
            self.connection.rollback()
            return None

    def get_all_patients(self, limit: int = 100) -> list:
        """Получение списка всех пациентов"""
        self.cursor.execute('SELECT * FROM patients ORDER BY created_date DESC LIMIT ?', (limit,))
        return [dict(row) for row in self.cursor.fetchall()]

    def get_stage_statistics(self) -> Dict:
        """Статистика по стадиям рака"""
        self.cursor.execute('''
            SELECT cancer_stage, COUNT(*) as count 
            FROM patients 
            GROUP BY cancer_stage 
            ORDER BY cancer_stage
        ''')
        stats = {row['cancer_stage']: row['count'] for row in self.cursor.fetchall()}
        
        for stage in ['1', '2', '3']:
            if stage not in stats:
                stats[stage] = 0
                
        return stats

    def close(self):
        """Закрытие соединения с бд"""
        self.connection.close()

# Инициализация базы данных
db = BreastCancerDB()

# API endpoints
@app.route('/api/patients', methods=['POST'])
def add_patient():
    try:
        data = request.json
        print("Получены данные пациента:", data)
        
        # Преобразуем данные из фронтенда в формат БД
        patient_data = {
            'age': data.get('age'),
            'gender': 'Женский' if data.get('sex') == 'female' else 'Мужской',
            'weight': data.get('weight'),
            'height': data.get('height'),
            'cancer_type': data.get('molecular_subtype', {}).get('code', 'Unknown'),
            'cancer_stage': data.get('cancer_stage'),
            'initial_tumor_size': data.get('tumour_size_cm'),
            'distant_metastases_count': data.get('distant_metastasis_count', 0),
            'histological_grading': 'G2',
            'ecog': 0,
            'menopausal_status': data.get('menopause_status'),
            'treatment_type': data.get('recommended_treatment', {}).get('therapy_type', 'unknown'),
            'er_status': data.get('ER_status'),
            'pr_status': data.get('PR_status'),
            'her2_status': data.get('HER2_status'),
            'ki67': data.get('ki67')
        }
        
        patient_code = db.add_patient(patient_data)
        
        if patient_code:
            return jsonify({
                'success': True,
                'patient_code': patient_code,
                'message': 'Пациент успешно добавлен в базу данных'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Ошибка при добавлении пациента в базу данных'
            }), 400
            
    except Exception as e:
        print(f"Ошибка при добавлении пациента: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Ошибка сервера: {str(e)}'
        }), 500

@app.route('/api/patients', methods=['GET'])
def get_patients():
    try:
        patients = db.get_all_patients()
        return jsonify({
            'success': True,
            'patients': patients
        })
    except Exception as e:
        print(f"Ошибка при получении пациентов: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Ошибка при получении пациентов: {str(e)}'
        }), 500

@app.route('/api/stage-statistics', methods=['GET'])
def get_stage_statistics():
    try:
        stats = db.get_stage_statistics()
        return jsonify({
            'success': True,
            'statistics': stats
        })
    except Exception as e:
        print(f"Ошибка при получении статистики: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Ошибка при получении статистики: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Проверка работоспособности API"""
    return jsonify({
        'success': True,
        'message': 'API работает корректно',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("Запуск сервера Breast Cancer API...")
    print("API доступно по адресу: http://localhost:5000")
    print("Доступные endpoints:")
    print("  POST /api/patients - добавление пациента")
    print("  GET  /api/patients - получение списка пациентов")
    print("  GET  /api/health - проверка работоспособности")
    app.run(debug=True, host='0.0.0.0', port=5000)
    