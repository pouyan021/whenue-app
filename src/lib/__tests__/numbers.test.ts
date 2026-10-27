import { formatNumber, formatPointsChange, nationalMobile, rialToToman, toLatinDigits } from '../numbers';

describe('numbers', () => {
  it('reads digits typed on a Persian or Arabic keyboard', () => {
    expect(toLatinDigits('۰۹۱۲ ١٢٣')).toBe('0912 123');
  });

  it('writes numbers in Persian digits with separators', () => {
    expect(formatNumber(0)).toBe('۰');
    expect(formatNumber(1250)).toBe('۱٬۲۵۰');
    expect(formatNumber(-1000000)).toBe('−۱٬۰۰۰٬۰۰۰');
  });

  it('keeps the sign of a points change in front of the number', () => {
    expect(formatPointsChange(120)).toBe('⁦+۱۲۰⁩');
    expect(formatPointsChange(-50)).toBe('⁦−۵۰⁩');
  });

  it('shows Rial as Toman', () => {
    expect(rialToToman(1_000_000)).toBe(100_000);
  });

  it('shows a stored mobile number the way people in Iran write it', () => {
    expect(nationalMobile('+989121234567')).toBe('۰۹۱۲ ۱۲۳ ۴۵۶۷');
    expect(nationalMobile('+441234')).toBe('+441234');
  });
});
