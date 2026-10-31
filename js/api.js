/**
 * api.js — работа с API курсов валют.
 * Только запрос и проверка ответа, никакой работы с DOM.
 */

const API_BASE_URL = 'https://open.er-api.com/v6/latest/';

/**
 * Загружает курсы всех валют относительно базовой.
 * @param {string} base — код базовой валюты, например "USD".
 * @returns {Promise<Object<string, number>>} объект вида { EUR: 0.92, RUB: 91.5, ... }
 * @throws {Error} при ошибке сети или неуспешном ответе API.
 */
async function fetchRates(base) {
  const res = await fetch(`${API_BASE_URL}${encodeURIComponent(base)}`);
  if (!res.ok) throw new Error('Network error');

  const data = await res.json();
  if (data.result !== 'success') throw new Error('API error');

  return data.rates;
}
