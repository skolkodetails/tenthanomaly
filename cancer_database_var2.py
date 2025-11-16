import sqlite3
import pandas as pd

class BreastCancerDB:
    def __init__(self, db_name='breast_cancer_database.db'):
        self.connection = sqlite3.connect(db_name)
        self.cursor = self.connection.cursor()
        self._create_tables()
    
    def _create_tables(self):
        """Создание таблиц с улучшенной структурой"""
        # Основная таблица пациентов
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS patients (
            patient_id TEXT PRIMARY KEY,
            age INTEGER,
            gender TEXT,
            menopausal_status TEXT,
            family_history BOOLEAN,
            molecular_subtype TEXT,
            er_status BOOLEAN,
            pr_status BOOLEAN,
            her2_status BOOLEAN,
            brca_mutation BOOLEAN,
            ki67_level REAL,
            treatment TEXT,
            surgery_type TEXT,
            tumor_size_before REAL,
            tumor_size_3m REAL,
            tumor_size_6m REAL,
            tumor_size_12m REAL,
            tumor_size_24m REAL,
            has_metastasis BOOLEAN,
            metastasis_sites TEXT,
            survival_months REAL,
            performance_status INTEGER,
            tumor_grade INTEGER,
            lymph_node_status TEXT,
            positive_lymph_nodes INTEGER,
            treatment_response TEXT
        )
        ''')
        self.connection.commit()

    def load_dataset(self, excel_file_path):
        """Загрузка данных из Excel в базу данных"""
        try:
            # Чтение данных из Excel
            df = pd.read_excel(excel_file_path, sheet_name='Стадия 1')
            
            # Преобразование булевых значений
            bool_columns = ['family_history', 'er_status', 'pr_status', 'her2_status', 
                          'brca_mutation', 'has_metastasis']
            for col in bool_columns:
                if col in df.columns:
                    df[col] = df[col].astype(bool)
            
            # Вставка данных в базу
            df.to_sql('patients', self.connection, if_exists='replace', index=False)
            print(f"Загружено {len(df)} записей в базу данных")
            
        except Exception as e:
            print(f"Ошибка при загрузке данных: {e}")

    def get_patient_data(self, patient_id=None):
        """Получение данных о пациентах"""
        if patient_id:
            query = "SELECT * FROM patients WHERE patient_id = ?"
            return pd.read_sql_query(query, self.connection, params=[patient_id])
        else:
            return pd.read_sql_query("SELECT * FROM patients", self.connection)

    def get_filtered_data(self, **filters):
        """Получение отфильтрованных данных"""
        query = "SELECT * FROM patients WHERE 1=1"
        params = []
        
        for key, value in filters.items():
            query += f" AND {key} = ?"
            params.append(value)
            
        return pd.read_sql_query(query, self.connection, params=params)

    def close(self):
        """Закрытие соединения с базой данных"""
        self.connection.close()

# Пример использования
if __name__ == "__main__":
    # Инициализация базы данных
    db = BreastCancerDB()
    
    # Загрузка данных из Excel файла
    db.load_dataset('breast_cancer_data.xlsx')
    
    # Примеры запросов
    patients_data = db.get_patient_data()
    print(f"Всего пациентов: {len(patients_data)}")
    
    # Фильтрация по подтипу
    hr_her2_patients = db.get_filtered_data(molecular_subtype='HR+HER2-')
    print(f"Пациентов HR+HER2-: {len(hr_her2_patients)}")
    
    # Получение данных конкретного пациента
    patient = db.get_patient_data('BC_1_0001')
    print(f"Данные пациента BC_1_0001: {len(patient)} записей")
    
    db.close()