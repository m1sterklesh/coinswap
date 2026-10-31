/**
 * main.js — точка входа: обработчики событий, валидация, кеш курсов, localStorage.
 * Зависит от api.js (fetchRates) и ui.js (ui, fillSelects, renderResult, ...).
 */

const STORAGE_KEY = 'coinswap:last';
const DEFAULT_STATE = { from: 'USD', to: 'EUR', amount: 100 };
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 минут

const MESSAGES = {
  amountNotPositive: 'Введите сумму больше нуля',
  amountNotNumber: 'Введите корректное число',
  network: 'Не удалось получить курсы, попробуйте позже',
  sameCurrency: 'Выберите разные валюты',
};

/** Кеш курсов по базовой валюте: { USD: { rates, time } } */
const ratesCache = {};

/** Номер последнего запроса — чтобы игнорировать устаревшие ответы. */
let requestId = 0;

/** Удалось ли загрузить список валют. */
let currenciesReady = false;

/**
 * Возвращает курсы для базовой валюты: из кеша или свежим запросом.
 * @param {string} base
 * @returns {Promise<Object<string, number>>}
 */
async function getRates(base) {
  const cached = ratesCache[base];
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.rates;
  }
  const rates = await fetchRates(base);
  ratesCache[base] = { rates, time: Date.now() };
  return rates;
}

/**
 * Проверяет сумму из поля ввода.
 * @returns {{ ok: true, value: number } | { ok: false, message: string }}
 */
function validateAmount() {
  const input = ui.amount;
  const raw = input.value.trim();

  // type="number" отдаёт пустую строку, если введено «не число» — ловим через badInput
  if (input.validity.badInput) {
    return { ok: false, message: MESSAGES.amountNotNumber };
  }
  if (raw === '') {
    return { ok: false, message: MESSAGES.amountNotPositive };
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return { ok: false, message: MESSAGES.amountNotNumber };
  }
  if (value <= 0) {
    return { ok: false, message: MESSAGES.amountNotPositive };
  }
  return { ok: true, value };
}

/**
 * Читает последнюю сохранённую пару из localStorage.
 * @returns {{ from: string, to: string, amount: number }}
 */
function loadSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved.from === 'string' && typeof saved.to === 'string' && saved.amount > 0) {
      return { from: saved.from, to: saved.to, amount: Number(saved.amount) };
    }
  } catch (err) {
    // localStorage недоступен или данные битые — используем дефолт
  }
  return { ...DEFAULT_STATE };
}

/**
 * Сохраняет пару и сумму в localStorage.
 * @param {{ from: string, to: string, amount: number }} state
 */
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Например, приватный режим — просто не сохраняем
  }
}

/**
 * Основной сценарий: валидация → получение курса → вывод результата.
 * Запрос к API не отправляется, если данные некорректны.
 */
async function convert() {
  if (!currenciesReady) {
    await init();
    return;
  }

  const amountCheck = validateAmount();
  if (!amountCheck.ok) {
    markAmountInvalid(true);
    showError(amountCheck.message);
    ui.amount.focus();
    return;
  }
  markAmountInvalid(false);

  const from = ui.from.value;
  const to = ui.to.value;
  if (from === to) {
    showError(MESSAGES.sameCurrency);
    return;
  }

  const currentRequest = ++requestId;
  const needsFetch = !ratesCache[from] || Date.now() - ratesCache[from].time >= CACHE_TTL_MS;
  if (needsFetch) showLoading(true);

  try {
    const rates = await getRates(from);
    if (currentRequest !== requestId) return; // пришёл ответ на устаревший запрос

    const rate = rates[to];
    if (typeof rate !== 'number') throw new Error('Rate not found');

    renderResult(amountCheck.value, from, to, rate);
    saveState({ from, to, amount: amountCheck.value });
  } catch (err) {
    if (currentRequest !== requestId) return;
    showError(MESSAGES.network);
  } finally {
    if (needsFetch && currentRequest === requestId) showLoading(false);
  }
}

/** Меняет валюты местами и сразу пересчитывает. */
function handleSwap() {
  const from = ui.from.value;
  ui.from.value = ui.to.value;
  ui.to.value = from;
  animateSwap();
  convert();
}

/**
 * Смена валюты в списках. При смене «Из» курсы перезапрашиваются
 * (API отдаёт их относительно базы) — это делает convert() через getRates().
 */
function handleCurrencyChange() {
  convert();
}

/**
 * Инициализация: загружаем список валют (база USD), заполняем форму
 * сохранёнными значениями и сразу показываем результат.
 */
async function init() {
  const saved = loadSavedState();
  ui.amount.value = saved.amount;

  showLoading(true);
  ui.from.disabled = true;
  ui.to.disabled = true;

  try {
    const rates = await getRates('USD');
    fillSelects(Object.keys(rates), saved.from, saved.to);
    currenciesReady = true;
  } catch (err) {
    showLoading(false);
    ui.from.disabled = true;
    ui.to.disabled = true;
    ui.swapBtn.disabled = true;
    ui.convertBtn.disabled = false; // даём возможность повторить попытку
    showError(MESSAGES.network);
    return;
  }

  showLoading(false);
  convert();
}

ui.form.addEventListener('submit', (event) => {
  event.preventDefault();
  convert();
});
ui.swapBtn.addEventListener('click', handleSwap);
ui.from.addEventListener('change', handleCurrencyChange);
ui.to.addEventListener('change', handleCurrencyChange);
ui.amount.addEventListener('input', () => markAmountInvalid(false));

init();
