/**
 * ui.js — всё, что касается отрисовки: списки, результат, ошибки, загрузка.
 * Логики и запросов здесь нет.
 */

/** Русские названия популярных валют. Для остальных показываем только код. */
const currencyNames = {
  USD: 'Доллар США',
  EUR: 'Евро',
  RUB: 'Российский рубль',
  GBP: 'Фунт стерлингов',
  JPY: 'Японская иена',
  CNY: 'Китайский юань',
  CHF: 'Швейцарский франк',
  KZT: 'Казахстанский тенге',
  BYN: 'Белорусский рубль',
  UAH: 'Украинская гривна',
  TRY: 'Турецкая лира',
  AED: 'Дирхам ОАЭ',
  GEL: 'Грузинский лари',
  AMD: 'Армянский драм',
  CAD: 'Канадский доллар',
};

const ui = {
  form: document.getElementById('converter-form'),
  amount: document.getElementById('amount'),
  from: document.getElementById('from'),
  to: document.getElementById('to'),
  swapBtn: document.getElementById('swap-btn'),
  convertBtn: document.getElementById('convert-btn'),
  status: document.getElementById('status'),
  result: document.getElementById('result'),
  resultMain: document.getElementById('result-main'),
  resultRate: document.getElementById('result-rate'),
};

/**
 * Возвращает подпись для пункта списка: «USD — Доллар США» или просто «XAF».
 * @param {string} code
 * @returns {string}
 */
function getCurrencyLabel(code) {
  return currencyNames[code] ? `${code} — ${currencyNames[code]}` : code;
}

/**
 * Заполняет оба выпадающих списка кодами валют (по алфавиту).
 * @param {string[]} codes — коды валют.
 * @param {string} from — выбранная валюта «Из».
 * @param {string} to — выбранная валюта «В».
 */
function fillSelects(codes, from, to) {
  const sorted = [...codes].sort();

  [ui.from, ui.to].forEach((select) => {
    const fragment = document.createDocumentFragment();
    sorted.forEach((code) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = getCurrencyLabel(code);
      fragment.appendChild(option);
    });
    select.replaceChildren(fragment);
    select.disabled = false;
  });

  ui.from.value = sorted.includes(from) ? from : 'USD';
  ui.to.value = sorted.includes(to) ? to : 'EUR';
}

/**
 * Форматирует число: точка как десятичный разделитель, пробел между тысячами.
 * Пример: formatNumber(12345.6, 2) → "12 345.60"
 * @param {number} value
 * @param {number} digits — знаков после точки.
 * @returns {string}
 */
function formatNumber(value, digits) {
  return value
    .toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    .replace(/,/g, ' ');
}

/**
 * Показывает результат конвертации и курс за единицу.
 * @param {number} amount — исходная сумма.
 * @param {string} from — код исходной валюты.
 * @param {string} to — код целевой валюты.
 * @param {number} rate — курс 1 from = rate to.
 */
function renderResult(amount, from, to, rate) {
  const converted = amount * rate;
  // Для очень маленьких курсов (например, 1 RUB → BTC-подобные) даём больше знаков
  const rateDigits = rate < 0.0001 ? 8 : 4;

  ui.resultMain.textContent = `${formatNumber(amount, 2)} ${from} = ${formatNumber(converted, 2)} ${to}`;
  ui.resultRate.textContent = `1 ${from} = ${formatNumber(rate, rateDigits)} ${to}`;
  ui.result.hidden = false;
  clearStatus();
  setBackground('success');
}

/** Прячет блок результата. */
function hideResult() {
  ui.result.hidden = true;
}

/**
 * Показывает сообщение об ошибке под формой.
 * @param {string} message — понятный пользователю текст.
 */
function showError(message) {
  ui.status.className = 'status status--error';
  ui.status.textContent = message;
  hideResult();
  setBackground('error');
}

/** Убирает сообщение под формой. */
function clearStatus() {
  ui.status.className = 'status';
  ui.status.textContent = '';
}

/**
 * Включает/выключает состояние загрузки: спиннер, текст, блокировка кнопок.
 * @param {boolean} isLoading
 */
function showLoading(isLoading) {
  ui.convertBtn.disabled = isLoading;
  ui.convertBtn.classList.toggle('is-loading', isLoading);
  ui.swapBtn.disabled = isLoading;
  ui.from.disabled = isLoading;
  ui.to.disabled = isLoading;

  if (isLoading) {
    ui.status.className = 'status status--loading';
    ui.status.textContent = 'Загрузка курсов...';
  } else if (ui.status.classList.contains('status--loading')) {
    clearStatus();
  }
}

/**
 * Меняет «настроение» фона страницы под текущее состояние.
 * Работает через классы на <body>, без инлайн-стилей.
 * @param {'neutral'|'success'|'error'} state
 */
function setBackground(state) {
  document.body.classList.remove('bg--success', 'bg--error');
  if (state === 'success' || state === 'error') {
    document.body.classList.add(`bg--${state}`);
  }
}

/** Отмечает поле суммы как некорректное (для подсветки рамки). */
function markAmountInvalid(isInvalid) {
  ui.amount.setAttribute('aria-invalid', String(isInvalid));
}

/** Короткая анимация поворота иконки swap. */
function animateSwap() {
  ui.swapBtn.classList.toggle('is-rotated');
}
