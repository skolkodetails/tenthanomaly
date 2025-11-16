document.addEventListener('DOMContentLoaded', function() { //Ожидание загрузки DOM
    const form = document.getElementById('patient-form'); //Находим форму
    
    form.addEventListener('submit', function(event) { //Добавляем обработчик отправки формы
        event.preventDefault(); //Предотвращаем стандартное поведение
        
        const age = form.age.value;
        const tumourSize = form.tumour_size.value; //Получаем значения полей
        
        if (!age || !tumourSize) {
            alert('Пожалуйста, заполните все поля');
            return;
        } //Валидация данных
        
        // Показываем сообщение об успехе
        alert(`Данные приняты!\nВозраст: ${age} лет\nРазмер опухоли: ${tumourSize} мм\n\nМоделирование запущено...`);
        
        // Здесь будет интеграция с бэкендом
        console.log('Данные для отправки:', { age, tumourSize });
    });
});