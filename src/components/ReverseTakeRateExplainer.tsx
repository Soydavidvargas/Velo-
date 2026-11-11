import React, { useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { calculateCommission, REVERSE_TAKE_RATE_TIERS } from '../utils/reverseTakeRate';
import { formatCOP } from '../utils/formatCurrency';

export const ReverseTakeRateExplainer: React.FC = () => {
  const [calcPrice, setCalcPrice] = useState<number>(120000);
  const [calcJobNumber, setCalcJobNumber] = useState<number>(3);

  const calc = calculateCommission(calcPrice, calcJobNumber);

  return (
    <div className="space-y-8">
      {/* Friendly Explanation Banner */}
      <div className="cord-card p-6 lg:p-8 relative overflow-hidden bg-white border border-[#dde7ee]">
        <div className="max-w-3xl space-y-3">
          <div className="cord-badge">
            <Sparkles className="w-3.5 h-3.5 text-[#4e9ad9]" />
            <span>Tarifas Justas y Transparentes en Colombia</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-[#0b3658] tracking-tight leading-tight">
            Entre más confías en el mismo técnico, menos comisión se cobra
          </h2>
          <p className="text-sm text-[#486984] leading-relaxed">
            En la mayoría de plataformas en Colombia, los técnicos pierden un 25% o 30% en cada visita para siempre. En Velo premiamos la fidelidad: la tarifa de gestión empieza en el 15% y baja progresivamente hasta solo el 5%. El técnico conserva hasta el 95% de sus ingresos y tú recibes garantía por escrito y factura legal.
          </p>
        </div>
      </div>

      {/* Calculadora de Ahorro y Comisiones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Controls Column */}
        <div className="lg:col-span-5 cord-card p-6 flex flex-col justify-between space-y-6 bg-white border border-[#dde7ee]">
          <div>
            <h3 className="text-base font-bold text-[#0b3658] mb-1">
              Calculadora de Ahorro en Pesos (COP)
            </h3>
            <p className="text-xs text-[#486984]">
              Mueve los controles para ver cómo disminuye la comisión con cada servicio repetido.
            </p>

            <div className="mt-5 space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-semibold text-[#0b3658] mb-1.5">
                  <span>Valor del Servicio:</span>
                  <span className="font-mono text-[#0b3658] font-bold text-sm">{formatCOP(calcPrice)}</span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="600000"
                  step="10000"
                  value={calcPrice}
                  onChange={e => setCalcPrice(parseFloat(e.target.value))}
                  className="w-full accent-[#4e9ad9] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#486984] font-mono mt-1">
                  <span>$ 50.000</span>
                  <span>$ 300.000</span>
                  <span>$ 600.000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-[#0b3658] mb-1.5">
                  <span>¿Cuántas veces has contratado a este técnico?</span>
                  <span className="font-mono text-[#4e9ad9] font-bold">
                    {calcJobNumber === 1 ? '1ª vez (Inicio)' : calcJobNumber >= 5 ? '5 o más (Tarifa VIP)' : `${calcJobNumber}ª vez`}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setCalcJobNumber(n)}
                      className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                        calcJobNumber === n
                          ? 'bg-[#4e9ad9] text-white shadow-sm'
                          : 'bg-[#e6f1fa] text-[#0b3658] hover:bg-[#dde7ee]'
                      }`}
                    >
                      {n === 5 ? '5+' : `${n}º`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Key Advantages */}
          <div className="p-4 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] text-xs space-y-2">
            <div className="flex items-center gap-2 text-[#0b3658] font-bold">
              <Check className="w-4 h-4 shrink-0 text-[#4e9ad9]" />
              <span>0 $ cobrados por cotizar (0 pesos por lead)</span>
            </div>
            <div className="flex items-center gap-2 text-[#0b3658] font-bold">
              <Check className="w-4 h-4 shrink-0 text-[#4e9ad9]" />
              <span>Custodia fiduciaria protegida contra fraudes</span>
            </div>
          </div>
        </div>

        {/* Calculation Result */}
        <div className="lg:col-span-7 cord-card p-6 lg:p-8 flex flex-col justify-between space-y-6 bg-white border border-[#dde7ee]">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#dde7ee]">
              <span className="text-xs font-bold text-[#688dac] uppercase tracking-wider">
                Desglose Claro de la Tarifa
              </span>
              <span className="cord-badge text-xs font-bold">
                Comisión Velo: solo {calc.effectiveRatePercent}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {/* Pro Net Earnings */}
              <div className="p-5 rounded-2xl bg-[#e6f1fa]/60 border border-[#dde7ee]">
                <span className="text-[10px] text-[#486984] uppercase tracking-wider block font-semibold">
                  El Profesional Recibe Íntegro
                </span>
                <div className="text-2xl lg:text-3xl font-black text-[#0b3658] font-mono mt-1 tabular-nums">
                  {formatCOP(calc.proNetEarnings)}
                </div>
                <span className="text-xs text-[#486984] mt-1 block">
                  El {100 - calc.effectiveRatePercent}% del total va directo a su bolsillo
                </span>
              </div>

              {/* Platform Fee */}
              <div className="p-5 rounded-2xl bg-white border border-[#dde7ee]">
                <span className="text-[10px] text-[#688dac] uppercase tracking-wider block font-semibold">
                  Coste de Gestión Velo
                </span>
                <div className="text-2xl lg:text-3xl font-black text-[#4e9ad9] font-mono mt-1 tabular-nums">
                  {formatCOP(calc.platformFee)}
                </div>
                <span className="text-xs text-[#486984] mt-1 block">
                  Cubre la custodia de fondos, garantía de 6 meses y soporte local
                </span>
              </div>
            </div>

            {/* Savings indicator */}
            {calc.fidelitySavings > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-[#e6f1fa] border border-[#4e9ad9]/30 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-[#0b3658] block">
                    Bonificación por Cliente Habitual:
                  </span>
                  <span className="text-[#486984]">
                    Al ser el servicio nº {calc.transactionNumberWithPro}, el profesional se queda con {formatCOP(calc.fidelitySavings)} más gracias a la comisión reducida.
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-[#4e9ad9] font-mono tabular-nums">
                    +{calc.discountPercent}%
                  </span>
                  <span className="text-[10px] text-[#486984] block font-semibold">Ahorro</span>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-[#486984] border-t border-[#dde7ee] pt-4">
            Al tener comisiones justas y decrecientes, se evita la desintermediación y todos ganan en Colombia con total seguridad.
          </div>
        </div>
      </div>

      {/* Simple Schedule Table */}
      <div className="cord-card p-6 lg:p-8 bg-white border border-[#dde7ee]">
        <h3 className="text-base font-bold text-[#0b3658] mb-4">
          Escalafón de Tarifas según la Antigüedad
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#dde7ee] text-[#486984] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Repetición del Encargo</th>
                <th className="py-3 px-4 font-semibold text-right">Comisión de Gestión</th>
                <th className="py-3 px-4 font-semibold text-right">El Profesional Conserva</th>
                <th className="py-3 px-4 font-semibold">Beneficio Obtenido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde7ee] text-[#0b3658] font-mono">
              {REVERSE_TAKE_RATE_TIERS.map((tier, idx) => (
                <tr key={idx} className="hover:bg-[#e6f1fa]/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#0b3658] font-sans">
                    {tier.transaction}
                  </td>
                  <td className="py-3 px-4 text-right text-[#4e9ad9] font-bold tabular-nums">
                    {tier.rate}%
                  </td>
                  <td className="py-3 px-4 text-right text-[#0b3658] font-bold tabular-nums">
                    {tier.proRetains}%
                  </td>
                  <td className="py-3 px-4 font-sans text-xs">
                    <span className="cord-badge">
                      {tier.badge}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
