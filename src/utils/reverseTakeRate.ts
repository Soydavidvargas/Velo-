import { CommissionBreakdown } from '../types';

export const BASE_COMMISSION_PERCENT = 15;
export const FLOOR_COMMISSION_PERCENT = 5;

/**
 * Escala del Reverse Take Rate en Velo Colombia:
 * Servicio 1: 15% (Comisión estándar)
 * Servicio 2: 12% (3% de ahorro por recurrencia)
 * Servicio 3: 9%  (6% de ahorro)
 * Servicio 4: 7%  (8% de ahorro)
 * Servicio 5+: 5% (10% de ahorro - El 95% queda en el bolsillo del técnico)
 */
export function getTakeRatePercentage(transactionNumber: number): number {
  if (transactionNumber <= 1) return 15;
  if (transactionNumber === 2) return 12;
  if (transactionNumber === 3) return 9;
  if (transactionNumber === 4) return 7;
  return 5;
}

export function calculateCommission(
  totalClientPaid: number,
  transactionNumberWithPro: number
): CommissionBreakdown {
  const effectiveRate = getTakeRatePercentage(transactionNumberWithPro);
  const discountPercent = BASE_COMMISSION_PERCENT - effectiveRate;
  
  // Platform fee in COP (rounded to integer pesos)
  const platformFee = Math.round(totalClientPaid * (effectiveRate / 100));
  
  // Pro net earnings in COP
  const proNetEarnings = Math.round(totalClientPaid - platformFee);
  
  // Theoretical standard fee under 15%
  const standardFee = Math.round(totalClientPaid * (BASE_COMMISSION_PERCENT / 100));
  const fidelitySavings = Math.max(0, standardFee - platformFee);

  return {
    transactionNumberWithPro,
    baseRatePercent: BASE_COMMISSION_PERCENT,
    effectiveRatePercent: effectiveRate,
    discountPercent,
    totalClientPaid,
    platformFee,
    proNetEarnings,
    fidelitySavings,
  };
}

export const REVERSE_TAKE_RATE_TIERS = [
  { transaction: '1º Servicio', rate: 15, proRetains: 85, badge: 'Comisión Estándar' },
  { transaction: '2º Servicio', rate: 12, proRetains: 88, badge: 'Ahorro Fidelidad -3%' },
  { transaction: '3º Servicio', rate: 9, proRetains: 91, badge: 'Ahorro Fidelidad -6%' },
  { transaction: '4º Servicio', rate: 7, proRetains: 93, badge: 'Ahorro Fidelidad -8%' },
  { transaction: '5º+ Servicio', rate: 5, proRetains: 95, badge: 'Cliente Habitual VIP' },
];
