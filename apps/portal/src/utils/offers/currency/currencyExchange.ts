// API from https://github.com/fawazahmed0/exchange-api#readme
import fetch from 'cross-fetch';

// Tried in order until one returns the rate. jsDelivr is the primary host and
// pages.dev is the fallback recommended by the exchange-api README. The last
// URL (allratestoday.com) serves the same JSON, latest and dated, for ~30 ECB
// currencies and returns 404 for the rest.
const RATE_URLS = [
  (version: string, currency: string) =>
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies/${currency}.json`,
  (version: string, currency: string) =>
    `https://${version}.currency-api.pages.dev/v1/currencies/${currency}.json`,
  (version: string, currency: string) =>
    `https://allratestoday.com/api/compat/currency-api/${version}/v1/currencies/${currency}.json`,
];

// `version` is 'latest' or a YYYY-MM-DD date.
const fetchRate = async (
  fromCurrency: string,
  toCurrency: string,
  version: string,
): Promise<number | null> => {
  for (const url of RATE_URLS) {
    try {
      const res = await fetch(url(version, fromCurrency));
      if (!res.ok) {
        continue;
      }
      const data = await res.json();
      const rate = data?.[fromCurrency]?.[toCurrency];
      if (typeof rate === 'number') {
        return rate;
      }
    } catch {
      // Try the next URL.
    }
  }
  return null;
};

export const convert = async (
  value: number,
  fromCurrency: string,
  toCurrency: string,
) => {
  fromCurrency = fromCurrency.trim().toLowerCase();
  toCurrency = toCurrency.trim().toLowerCase();

  const rate = await fetchRate(fromCurrency, toCurrency, 'latest');
  if (rate == null) {
    throw new Error(`No exchange rate for ${fromCurrency} to ${toCurrency}`);
  }
  return value * rate;
};

export const convertWithDate = async (
  value: number,
  fromCurrency: string,
  toCurrency: string,
  date: Date,
) => {
  // Dated releases are named YYYY-MM-DD (UTC).
  const formattedDate = date.toISOString().substring(0, 10);
  if (formattedDate === new Date().toISOString().substring(0, 10)) {
    return await convert(value, fromCurrency, toCurrency);
  }

  fromCurrency = fromCurrency.trim().toLowerCase();
  toCurrency = toCurrency.trim().toLowerCase();

  const rate = await fetchRate(fromCurrency, toCurrency, formattedDate);
  if (rate == null) {
    // No release for that date (jsDelivr and pages.dev start in March 2024),
    // so use the latest rate as before.
    return await convert(value, fromCurrency, toCurrency);
  }
  return value * rate;
};
