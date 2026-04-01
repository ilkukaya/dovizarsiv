import { useState, useEffect, useCallback } from 'react';
import { calculateTimeMachine } from '../../lib/calculations';
import { formatMoney, formatPercent } from '../../lib/formatters';

interface TimeMachineProps {
  allData: Record<string, Record<string, { buy?: number; sell?: number; price?: number }>>;
}

const ASSETS = [
  { value: 'usd', label: 'Dolar ($)' },
  { value: 'eur', label: 'Euro (€)' },
  { value: 'gbp', label: 'Sterlin (£)' },
  { value: 'chf', label: 'İsviçre Frangı' },
  { value: 'gold', label: 'Gram Altın' },
  { value: 'btc', label: 'Bitcoin (₿)' },
];

const ASSET_NAMES: Record<string, string> = {
  usd: 'ABD Doları',
  eur: 'Euro',
  gbp: 'İngiliz Sterlini',
  chf: 'İsviçre Frangı',
  gold: 'Gram Altın',
  btc: 'Bitcoin',
};

interface Result {
  unitsBought: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  years: number;
  cagr: number;
  buyPrice: number;
}

export default function TimeMachine({ allData }: TimeMachineProps) {
  const [asset, setAsset] = useState('usd');
  const [amount, setAmount] = useState(10000);
  const [date, setDate] = useState('2026-01-02');
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('asset')) setAsset(params.get('asset')!);
    if (params.get('amount')) setAmount(Number(params.get('amount')));
    if (params.get('date')) setDate(params.get('date')!);
    if (params.get('asset') && params.get('amount') && params.get('date')) {
      handleCalculate();
    }
  }, []);

  const handleCalculate = useCallback(() => {
    const assetData = allData[asset];
    if (!assetData) return;

    const dates = Object.keys(assetData).sort();
    const buyDate = dates.find(d => d >= date) || dates[0];
    const latestDate = dates[dates.length - 1];

    const buyRecord = assetData[buyDate];
    const latestRecord = assetData[latestDate];

    const buyPrice = asset === 'gold' || asset === 'btc'
      ? (buyRecord?.price ?? 0)
      : (buyRecord?.buy ?? 0);

    const sellPrice = asset === 'gold' || asset === 'btc'
      ? (latestRecord?.price ?? 0)
      : (latestRecord?.sell ?? 0);

    if (!buyPrice || !sellPrice) return;

    const calc = calculateTimeMachine(amount, buyPrice, sellPrice, buyDate, latestDate);

    setResult({
      ...calc,
      buyPrice,
    });
  }, [asset, amount, date, allData]);

  const handleShare = () => {
    const url = `${window.location.origin}/hesaplayicilar/zaman-makinesi?asset=${asset}&amount=${amount}&date=${date}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isProfit = result ? result.profitLoss >= 0 : true;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h2 className="font-mono text-2xl font-bold text-white mb-6">
          Ne kadar kazanırdınız?
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Varlık</label>
            <select
              value={asset}
              onChange={e => setAsset(e.target.value)}
              className="w-full"
            >
              {ASSETS.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">Tutar (₺)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              placeholder="₺ cinsinden tutar"
              min={0}
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">Tarih</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min="2026-01-02"
              max="2026-04-01"
            />
          </div>
          <button
            onClick={handleCalculate}
            className="w-full bg-accent text-black font-bold py-4 rounded-xl text-lg hover:bg-accent-hover transition"
          >
            Hesapla
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-gradient-to-br from-bg-card to-bg-hover rounded-2xl p-8 border border-accent/20">
          <div className="space-y-4">
            <div>
              <div className="text-gray-400 text-sm">O gün alınan miktar</div>
              <div className="text-2xl font-mono font-bold text-white">
                {result.unitsBought.toFixed(4)} {ASSET_NAMES[asset]}
              </div>
            </div>

            <div className="border-t border-white/10 my-4" />

            <div>
              <div className="text-gray-400 text-sm">Bugünkü değeri</div>
              <div className="text-4xl font-mono font-bold text-accent">
                {formatMoney(result.currentValue)}
              </div>
            </div>

            <div className="border-t border-white/10 my-4" />

            <div>
              <div className="text-gray-400 text-sm">Net kar/zarar</div>
              <div className={`text-2xl font-mono ${isProfit ? 'text-up' : 'text-down'}`}>
                {isProfit ? '+' : ''}{formatMoney(result.profitLoss)}
              </div>
            </div>

            <div>
              <div className={`text-lg font-mono ${isProfit ? 'text-up' : 'text-down'}`}>
                {formatPercent(result.profitLossPercent)} getiri
              </div>
            </div>

            <div className="border-t border-white/10 my-4" />

            <div>
              <div className="text-gray-400 text-sm">Yıllık bileşik getiri (CAGR)</div>
              <div className="text-xl font-mono font-bold text-white">
                %{result.cagr.toFixed(2).replace('.', ',')}
              </div>
            </div>

            <button
              onClick={handleShare}
              className="w-full mt-4 bg-bg-hover hover:bg-white/10 text-gray-300 font-medium py-3 rounded-xl transition"
            >
              {copied ? '✓ Kopyalandı!' : '📋 Sonucu Paylaş'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
