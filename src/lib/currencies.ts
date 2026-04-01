export interface CurrencyInfo {
  code: string;
  slug: string;
  nameTr: string;
  nameEn: string;
  symbol: string;
  flag: string;
  type: 'fiat' | 'crypto' | 'metal';
  unit: number;
}

export const currencies: CurrencyInfo[] = [
  { code: 'USD', slug: 'usd', nameTr: 'ABD Doları', nameEn: 'US Dollar', symbol: '$', flag: '🇺🇸', type: 'fiat', unit: 1 },
  { code: 'EUR', slug: 'eur', nameTr: 'Euro', nameEn: 'Euro', symbol: '€', flag: '🇪🇺', type: 'fiat', unit: 1 },
  { code: 'GBP', slug: 'gbp', nameTr: 'İngiliz Sterlini', nameEn: 'British Pound', symbol: '£', flag: '🇬🇧', type: 'fiat', unit: 1 },
  { code: 'CHF', slug: 'chf', nameTr: 'İsviçre Frangı', nameEn: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭', type: 'fiat', unit: 1 },
  { code: 'JPY', slug: 'jpy', nameTr: 'Japon Yeni', nameEn: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', type: 'fiat', unit: 100 },
  { code: 'SAR', slug: 'sar', nameTr: 'Suudi Arabistan Riyali', nameEn: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦', type: 'fiat', unit: 1 },
  { code: 'CAD', slug: 'cad', nameTr: 'Kanada Doları', nameEn: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', type: 'fiat', unit: 1 },
  { code: 'AUD', slug: 'aud', nameTr: 'Avustralya Doları', nameEn: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', type: 'fiat', unit: 1 },
  { code: 'CNY', slug: 'cny', nameTr: 'Çin Yuanı', nameEn: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', type: 'fiat', unit: 1 },
  { code: 'NOK', slug: 'nok', nameTr: 'Norveç Kronu', nameEn: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴', type: 'fiat', unit: 1 },
  { code: 'SEK', slug: 'sek', nameTr: 'İsveç Kronu', nameEn: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪', type: 'fiat', unit: 1 },
  { code: 'DKK', slug: 'dkk', nameTr: 'Danimarka Kronu', nameEn: 'Danish Krone', symbol: 'kr', flag: '🇩🇰', type: 'fiat', unit: 1 },
  { code: 'RON', slug: 'ron', nameTr: 'Romanya Leyi', nameEn: 'Romanian Leu', symbol: 'lei', flag: '🇷🇴', type: 'fiat', unit: 1 },
  { code: 'RUB', slug: 'rub', nameTr: 'Rus Rublesi', nameEn: 'Russian Ruble', symbol: '₽', flag: '🇷🇺', type: 'fiat', unit: 1 },
  { code: 'KRW', slug: 'krw', nameTr: 'Güney Kore Wonu', nameEn: 'South Korean Won', symbol: '₩', flag: '🇰🇷', type: 'fiat', unit: 1 },
  { code: 'AZN', slug: 'azn', nameTr: 'Azerbaycan Manatı', nameEn: 'Azerbaijani Manat', symbol: '₼', flag: '🇦🇿', type: 'fiat', unit: 1 },
  { code: 'AED', slug: 'aed', nameTr: 'BAE Dirhemi', nameEn: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', type: 'fiat', unit: 1 },
  { code: 'KWD', slug: 'kwd', nameTr: 'Kuveyt Dinarı', nameEn: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼', type: 'fiat', unit: 1 },
  { code: 'QAR', slug: 'qar', nameTr: 'Katar Riyali', nameEn: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦', type: 'fiat', unit: 1 },
  { code: 'PKR', slug: 'pkr', nameTr: 'Pakistan Rupisi', nameEn: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰', type: 'fiat', unit: 1 },
  { code: 'KZT', slug: 'kzt', nameTr: 'Kazak Tengesi', nameEn: 'Kazakhstani Tenge', symbol: '₸', flag: '🇰🇿', type: 'fiat', unit: 1 },
  { code: 'BTC', slug: 'btc', nameTr: 'Bitcoin', nameEn: 'Bitcoin', symbol: '₿', flag: '🪙', type: 'crypto', unit: 1 },
  { code: 'ETH', slug: 'eth', nameTr: 'Ethereum', nameEn: 'Ethereum', symbol: 'Ξ', flag: '🪙', type: 'crypto', unit: 1 },
  { code: 'XAU', slug: 'gram', nameTr: 'Gram Altın', nameEn: 'Gram Gold', symbol: 'g', flag: '🥇', type: 'metal', unit: 1 },
];

export function getCurrency(slug: string): CurrencyInfo | undefined {
  return currencies.find(c => c.slug === slug);
}

export const fiatCurrencies = currencies.filter(c => c.type === 'fiat');
export const cryptoCurrencies = currencies.filter(c => c.type === 'crypto');
export const metalCurrencies = currencies.filter(c => c.type === 'metal');
