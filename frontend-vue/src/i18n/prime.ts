import type {PrimeVueLocaleOptions} from "@primevue/core/config";
import type {Language} from "./index";

const russian: Partial<PrimeVueLocaleOptions> = {
    accept: "Да", reject: "Нет", choose: "Выбрать", upload: "Загрузить", cancel: "Отмена",
    clear: "Очистить", apply: "Применить", completed: "Завершено", pending: "Ожидание",
    dayNames: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
    dayNamesShort: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
    dayNamesMin: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
    monthNames: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    monthNamesShort: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
    firstDayOfWeek: 1,
    dateFormat: "dd.mm.yy",
    today: "Сегодня",
    emptyMessage: "Нет данных",
    emptyFilterMessage: "Результатов нет",
    searchMessage: "Результатов: {0}",
    selectionMessage: "Выбрано: {0}",
    aria: {close: "Закрыть", selectAll: "Выбрать всё", unselectAll: "Снять выделение"}
};

export function primeLocale(language: Language): Partial<PrimeVueLocaleOptions> {
    return language === "ru" ? russian : {
        accept: "Yes", reject: "No", choose: "Choose", upload: "Upload", cancel: "Cancel",
        clear: "Clear", apply: "Apply", completed: "Completed", pending: "Pending",
        dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        dayNamesMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
        monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        firstDayOfWeek: 0,
        dateFormat: "mm/dd/yy",
        today: "Today",
        emptyMessage: "No results found",
        emptyFilterMessage: "No results found",
        searchMessage: "{0} results are available",
        selectionMessage: "{0} items selected",
        aria: {close: "Close", selectAll: "Select all", unselectAll: "Unselect all"}
    };
}
