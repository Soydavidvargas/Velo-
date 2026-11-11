/**
 * Formato oficial para Pesos Colombianos (COP) en Velo Colombia
 * En Colombia los servicios residenciales se expresan sin decimales (ej. $ 95.000).
 */
export function formatCOP(amount: number, includeCode = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '$ 0';
  }
  const formatted = `$ ${Math.round(amount).toLocaleString('es-CO')}`;
  return includeCode ? `${formatted} COP` : formatted;
}
