/**
 * Ondalık aritmetik (BigInt tabanlı, harici bağımlılık yok).
 *
 * Kurallar (docs/DECISIONS.md D-011):
 * - Kaynak değerler string olarak alınır; float'a çevrilmeden işlenir.
 * - Toplama, çıkarma, çarpma ve 10'un kuvvetine bölme TAMDIR (yuvarlama yok).
 * - Genel bölme (ortalama, yüzde) `DIV_SCALE` ondalık basamakta "half-even" (bankacı) yuvarlamayla yapılır.
 * - Gösterim yuvarlaması yalnızca formatting katmanında yapılır.
 */

export const DIV_SCALE = 12;

const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

export class Decimal {
  /** value = units / 10^scale */
  private constructor(
    readonly units: bigint,
    readonly scale: number,
  ) {}

  static parse(input: string): Decimal {
    const s = input.trim();
    if (!DECIMAL_RE.test(s)) {
      throw new Error(`Geçersiz ondalık değer: "${input}"`);
    }
    const negative = s.startsWith('-');
    const body = negative ? s.slice(1) : s;
    const [intPart, fracPart = ''] = body.split('.') as [string, string?];
    const units = BigInt(intPart + fracPart) * (negative ? -1n : 1n);
    return new Decimal(units, fracPart.length).normalize();
  }

  static isValid(input: string): boolean {
    return DECIMAL_RE.test(input.trim());
  }

  static fromBigInt(value: bigint): Decimal {
    return new Decimal(value, 0);
  }

  static readonly ZERO = new Decimal(0n, 0);

  /** Sondaki gereksiz sıfırları atar (değer değişmez). */
  private normalize(): Decimal {
    let { units, scale } = this;
    if (units === 0n) return new Decimal(0n, 0);
    while (scale > 0 && units % 10n === 0n) {
      units /= 10n;
      scale -= 1;
    }
    return new Decimal(units, scale);
  }

  private static align(a: Decimal, b: Decimal): [bigint, bigint, number] {
    const scale = Math.max(a.scale, b.scale);
    return [a.units * 10n ** BigInt(scale - a.scale), b.units * 10n ** BigInt(scale - b.scale), scale];
  }

  add(other: Decimal): Decimal {
    const [x, y, scale] = Decimal.align(this, other);
    return new Decimal(x + y, scale).normalize();
  }

  sub(other: Decimal): Decimal {
    const [x, y, scale] = Decimal.align(this, other);
    return new Decimal(x - y, scale).normalize();
  }

  mul(other: Decimal): Decimal {
    return new Decimal(this.units * other.units, this.scale + other.scale).normalize();
  }

  /** 10^n'e tam bölme (ör. 2005 para reformu: n = 6). */
  shiftLeft(n: number): Decimal {
    return new Decimal(this.units, this.scale + n).normalize();
  }

  /** 10^n ile tam çarpma. */
  shiftRight(n: number): Decimal {
    return new Decimal(this.units * 10n ** BigInt(n), this.scale).normalize();
  }

  /** Bölme: sonuç `scale` basamakta half-even yuvarlanır. Sıfıra bölme hata fırlatır. */
  div(other: Decimal, scale = DIV_SCALE): Decimal {
    if (other.units === 0n) throw new Error('Sıfıra bölme');
    // this/other = (a/10^sa) / (b/10^sb) = a*10^sb / (b*10^sa)
    let num = this.units * 10n ** BigInt(other.scale);
    let den = other.units * 10n ** BigInt(this.scale);
    if (den < 0n) {
      num = -num;
      den = -den;
    }
    const scaled = num * 10n ** BigInt(scale);
    let q = scaled / den;
    const r = scaled % den;
    // half-even yuvarlama
    const twiceR = (r < 0n ? -r : r) * 2n;
    if (twiceR > den || (twiceR === den && (q % 2n !== 0n))) {
      q += scaled < 0n ? -1n : 1n;
    }
    return new Decimal(q, scale).normalize();
  }

  /** Belirtilen basamağa half-even yuvarlar. */
  round(scale: number): Decimal {
    if (this.scale <= scale) return this;
    return this.div(Decimal.fromBigInt(1n), scale);
  }

  cmp(other: Decimal): -1 | 0 | 1 {
    const [x, y] = Decimal.align(this, other);
    return x < y ? -1 : x > y ? 1 : 0;
  }

  eq(other: Decimal): boolean {
    return this.cmp(other) === 0;
  }

  isZero(): boolean {
    return this.units === 0n;
  }

  isNegative(): boolean {
    return this.units < 0n;
  }

  abs(): Decimal {
    return this.units < 0n ? new Decimal(-this.units, this.scale) : this;
  }

  /** Kanonik string: sondaki sıfırlar yok, bilimsel gösterim yok. */
  toString(): string {
    const negative = this.units < 0n;
    const digits = (negative ? -this.units : this.units).toString();
    if (this.scale === 0) return (negative ? '-' : '') + digits;
    const padded = digits.padStart(this.scale + 1, '0');
    const intPart = padded.slice(0, padded.length - this.scale);
    const fracPart = padded.slice(padded.length - this.scale);
    return `${negative ? '-' : ''}${intPart}.${fracPart}`;
  }

  /** Yalnızca grafik/sıralama gibi yaklaşık işler için. Hesaplamada kullanılmaz. */
  toNumber(): number {
    return Number(this.toString());
  }

  toJSON(): string {
    return this.toString();
  }
}

export function dec(value: string): Decimal {
  return Decimal.parse(value);
}

/** Yüzde değişim: ((yeni − eski) / eski) × 100. Eski sıfırsa null. */
export function percentChange(oldValue: Decimal, newValue: Decimal, scale = DIV_SCALE): Decimal | null {
  if (oldValue.isZero()) return null;
  return newValue.sub(oldValue).mul(Decimal.fromBigInt(100n)).div(oldValue, scale);
}

/** Aritmetik ortalama. Boş liste için null. */
export function mean(values: readonly Decimal[], scale = DIV_SCALE): Decimal | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc.add(v), Decimal.ZERO);
  return sum.div(Decimal.fromBigInt(BigInt(values.length)), scale);
}
