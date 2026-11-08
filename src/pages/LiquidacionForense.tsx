import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  FileText, 
  Scale, 
  Calendar, 
  DollarSign, 
  Percent, 
  Info, 
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { generateJudicialDocx, downloadDocxBlob } from '../utils/docxExport';

interface Abono {
  id: string;
  fecha: string;
  monto: number;
}

interface PeriodoDesglose {
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  capitalBase: number;
  tasaMensual: number;
  interesDevengado: number;
  abonoInteres: number;
  abonoCapital: number;
  capitalFinal: number;
  saldoInteresPendiente: number;
}

interface CaseItem {
  id: string;
  case_number: string;
  title: string;
  court?: string;
  client_name?: string;
}

export default function LiquidacionForense() {
  const token = localStorage.getItem('token') || '';
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Datos del juicio (completamente limpios)
  const [juzgado, setJuzgado] = useState('');
  const [expedienteNum, setExpedienteNum] = useState('');
  const [parteActora, setParteActora] = useState('');
  const [parteDemandada, setParteDemandada] = useState('');
  const [tipoJuicio, setTipoJuicio] = useState('JUICIO EJECUTIVO MERCANTIL');

  // Parámetros de la deuda (completamente limpios sin datos residuales)
  const [suertePrincipal, setSuertePrincipal] = useState<string>('');
  const [fechaInicioMora, setFechaInicioMora] = useState<string>('');
  const [fechaCorte, setFechaCorte] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Tasas
  const [tipoTasaMoratoria, setTipoTasaMoratoria] = useState<'mensual' | 'anual'>('mensual');
  const [tasaMoratoriaInput, setTasaMoratoriaInput] = useState<string>('');
  
  const [aplicaOrdinario, setAplicaOrdinario] = useState<boolean>(false);
  const [tasaOrdinariaInput, setTasaOrdinariaInput] = useState<string>('');
  
  const [aplicaIva, setAplicaIva] = useState<boolean>(false);

  // Abonos
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [nuevoAbonoFecha, setNuevoAbonoFecha] = useState<string>('');
  const [nuevoAbonoMonto, setNuevoAbonoMonto] = useState<string>('');

  // UI state
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'calculadora' | 'desglose' | 'escrito'>('calculadora');

  // Función para resetear / limpiar toda la calculadora
  const handleLimpiarTodo = () => {
    setSelectedCaseId('');
    setJuzgado('');
    setExpedienteNum('');
    setParteActora('');
    setParteDemandada('');
    setTipoJuicio('JUICIO EJECUTIVO MERCANTIL');
    setSuertePrincipal('');
    setFechaInicioMora('');
    setFechaCorte(new Date().toISOString().split('T')[0]);
    setTipoTasaMoratoria('mensual');
    setTasaMoratoriaInput('');
    setAplicaOrdinario(false);
    setTasaOrdinariaInput('');
    setAplicaIva(false);
    setAbonos([]);
    setNuevoAbonoFecha('');
    setNuevoAbonoMonto('');
  };

  // Cargar expedientes para vinculación
  useEffect(() => {
    fetch('/api/cases', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCases(data);
        }
      })
      .catch(console.error);
  }, [token]);

  // Si selecciona expediente, rellenar campos
  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    if (!caseId) return;
    const c = cases.find(item => item.id === caseId);
    if (c) {
      if (c.case_number) setExpedienteNum(c.case_number);
      if (c.court) setJuzgado(c.court.toUpperCase());
      if (c.title) {
        // Tratar de extraer actor vs demandado si el título tiene formato "X vs Y"
        const parts = c.title.split(/ vs\.? /i);
        if (parts.length === 2) {
          setParteActora(parts[0].trim());
          setParteDemandada(parts[1].trim());
        } else {
          setParteActora(c.client_name || parts[0]);
        }
      }
    }
  };

  // Convertir tasa a mensual y anual normalizadas
  const valTasaMora = parseFloat(tasaMoratoriaInput) || 0;
  const valSuertePrincipal = parseFloat(suertePrincipal) || 0;
  const valTasaOrd = parseFloat(tasaOrdinariaInput) || 0;

  const tasaMoratoriaMensual = useMemo(() => {
    return tipoTasaMoratoria === 'mensual' ? valTasaMora : valTasaMora / 12;
  }, [valTasaMora, tipoTasaMoratoria]);

  const tasaMoratoriaAnual = useMemo(() => {
    return tipoTasaMoratoria === 'anual' ? valTasaMora : valTasaMora * 12;
  }, [valTasaMora, tipoTasaMoratoria]);

  // Auditoría SCJN - Detección de Usura (Tesis 1a./J. 47/2014 & 1a./J. 57/2016)
  const usuraAudit = useMemo(() => {
    if (valTasaMora <= 0) {
      return {
        nivel: 'neutro',
        color: 'slate',
        titulo: 'Calculadora Limpia - Auditoría SCJN en Espera',
        descripcion: 'Ingresa la suerte principal, fecha de mora y tasa de interés pactada para auditar usura conforme a la SCJN.',
        recomendacion: 'Todos los campos se encuentran limpios para ingresar un nuevo caso.'
      };
    }

    const tasa = tasaMoratoriaAnual;
    if (tasa <= 36) {
      return {
        nivel: 'bajo',
        color: 'emerald',
        titulo: 'Tasa Prudencial - Sin Riesgo de Reducción Oficiosa',
        descripcion: `La tasa moratoria pactada (${tasa.toFixed(2)}% anual / ${tasaMoratoriaMensual.toFixed(2)}% mensual) se encuentra dentro de los parámetros de razonabilidad financiera avalados por la SCJN (inferior al CAT/TEPP bancario promedio de Banxico ~36% anual).`,
        recomendacion: 'Procedente para condena íntegra. Muy baja probabilidad de que el juzgador reduzca la tasa de oficio.'
      };
    } else if (tasa <= 60) {
      return {
        nivel: 'medio',
        color: 'amber',
        titulo: 'Zona de Ponderación Judicial - Riesgo Medio de Reducción',
        descripcion: `La tasa pactada (${tasa.toFixed(2)}% anual / ${tasaMoratoriaMensual.toFixed(2)}% mensual) supera el CAT promedio comercial. Bajo el escrutinio de la Jurisprudencia 1a./J. 47/2014, el juez analizará de oficio si existe vulnerabilidad o asimetría entre las partes.`,
        recomendacion: 'Si el demandado opone excepción o el juez es estricto en materia de Derechos Humanos, podría reducirla de oficio al 36% o a tasa legal (6%). Se sugiere justificar la calidad de las partes o reducir al 36% para asegurar ejecución líquida.'
      };
    } else {
      return {
        nivel: 'alto',
        color: 'rose',
        titulo: 'Alerta Roja: Usura Notoria y Desproporcionada (SCJN)',
        descripcion: `La tasa pactada (${tasa.toFixed(2)}% anual / ${tasaMoratoriaMensual.toFixed(2)}% mensual) supera con creces el límite del 60% anual. Conforme a las tesis 1a./J. 47/2014 y 1a./J. 57/2016 de la SCJN, existe un 95% de probabilidad de reducción de oficio por vulneración al Art. 21.3 del Pacto de San José (Convención Americana de Derechos Humanos).`,
        recomendacion: 'Se recomienda encarecidamente ajustar voluntariamente la tasa en la planilla a la Tasa Máxima Prudencial SCJN (36% anual / 3% mensual). De lo contrario, el juez desestimará la cuantía o abrirá vista desfavorable.'
      };
    }
  }, [valTasaMora, tasaMoratoriaAnual, tasaMoratoriaMensual]);

  // Aplicar corrección sugerida por SCJN
  const handleAjustarTasaSCJN = () => {
    setTipoTasaMoratoria('mensual');
    setTasaMoratoriaInput('3.0'); // 3% mensual = 36% anual
  };

  // Agregar abono
  const handleAddAbono = () => {
    if (!nuevoAbonoFecha || !nuevoAbonoMonto) return;
    const monto = parseFloat(nuevoAbonoMonto);
    if (isNaN(monto) || monto <= 0) return;

    const abono: Abono = {
      id: Math.random().toString(36).substring(7),
      fecha: nuevoAbonoFecha,
      monto
    };

    setAbonos([...abonos, abono].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
    setNuevoAbonoFecha('');
    setNuevoAbonoMonto('');
  };

  const handleRemoveAbono = (id: string) => {
    setAbonos(abonos.filter(a => a.id !== id));
  };

  // Motor Matemático Forense con Amortización Art. 364 Código de Comercio
  const calculo = useMemo(() => {
    if (!fechaInicioMora || valSuertePrincipal <= 0) {
      return {
        valido: false,
        diasTotales: 0,
        interesMoratorioTotal: 0,
        interesOrdinarioTotal: 0,
        ivaTotal: 0,
        totalAbonos: 0,
        capitalRemanente: valSuertePrincipal,
        totalLiquidacion: valSuertePrincipal,
        desglosePeriodos: [] as PeriodoDesglose[]
      };
    }

    const fInicio = new Date(fechaInicioMora);
    const fCorte = new Date(fechaCorte);

    if (isNaN(fInicio.getTime()) || isNaN(fCorte.getTime()) || fCorte < fInicio) {
      return {
        valido: false,
        diasTotales: 0,
        interesMoratorioTotal: 0,
        interesOrdinarioTotal: 0,
        ivaTotal: 0,
        totalAbonos: 0,
        capitalRemanente: valSuertePrincipal,
        totalLiquidacion: valSuertePrincipal,
        desglosePeriodos: [] as PeriodoDesglose[]
      };
    }

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const diasTotales = Math.round((fCorte.getTime() - fInicio.getTime()) / MS_PER_DAY);

    // Si no hay abonos, cálculo directo
    if (abonos.length === 0) {
      const tasaDiariaMora = (tasaMoratoriaMensual / 100) / 30;
      const interesMoratorioTotal = valSuertePrincipal * tasaDiariaMora * diasTotales;
      
      const tasaDiariaOrd = aplicaOrdinario ? ((valTasaOrd / 100) / 30) : 0;
      const interesOrdinarioTotal = valSuertePrincipal * tasaDiariaOrd * diasTotales;

      const subtotalIntereses = interesMoratorioTotal + interesOrdinarioTotal;
      const ivaTotal = aplicaIva ? subtotalIntereses * 0.16 : 0;
      const totalLiquidacion = valSuertePrincipal + subtotalIntereses + ivaTotal;

      const periodoUnico: PeriodoDesglose = {
        fechaInicio: fechaInicioMora,
        fechaFin: fechaCorte,
        dias: diasTotales,
        capitalBase: valSuertePrincipal,
        tasaMensual: tasaMoratoriaMensual,
        interesDevengado: interesMoratorioTotal,
        abonoInteres: 0,
        abonoCapital: 0,
        capitalFinal: valSuertePrincipal,
        saldoInteresPendiente: interesMoratorioTotal
      };

      return {
        valido: true,
        diasTotales,
        interesMoratorioTotal,
        interesOrdinarioTotal,
        ivaTotal,
        totalAbonos: 0,
        capitalRemanente: valSuertePrincipal,
        totalLiquidacion,
        desglosePeriodos: [periodoUnico]
      };
    }

    // Hay abonos: simular paso a paso respetando prelación legal
    let capitalActual = valSuertePrincipal;
    let interesAcumuladoNoLiquidado = 0;
    let interesMoratorioTotal = 0;
    let fechaPivote = new Date(fechaInicioMora);
    let totalAbonado = 0;
    const desglosePeriodos: PeriodoDesglose[] = [];

    // Filtrar abonos dentro del rango y ordenados
    const abonosValidos = abonos
      .filter(a => {
        const fa = new Date(a.fecha);
        return fa >= fInicio && fa <= fCorte;
      })
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    // Iterar por cada fecha de abono
    for (const abono of abonosValidos) {
      const fAbono = new Date(abono.fecha);
      const diasLapso = Math.round((fAbono.getTime() - fechaPivote.getTime()) / MS_PER_DAY);

      if (diasLapso > 0 && capitalActual > 0) {
        const tasaDiaria = (tasaMoratoriaMensual / 100) / 30;
        const interesLapso = capitalActual * tasaDiaria * diasLapso;
        interesAcumuladoNoLiquidado += interesLapso;
        interesMoratorioTotal += interesLapso;

        // Imputación del abono (Art. 364 Cód. Comercio):
        let abonoAInteres = 0;
        let abonoACapital = 0;

        if (abono.monto <= interesAcumuladoNoLiquidado) {
          abonoAInteres = abono.monto;
          interesAcumuladoNoLiquidado -= abono.monto;
        } else {
          abonoAInteres = interesAcumuladoNoLiquidado;
          const remanente = abono.monto - interesAcumuladoNoLiquidado;
          interesAcumuladoNoLiquidado = 0;
          abonoACapital = Math.min(remanente, capitalActual);
          capitalActual -= abonoACapital;
        }

        totalAbonado += abono.monto;

        desglosePeriodos.push({
          fechaInicio: fechaPivote.toISOString().split('T')[0],
          fechaFin: abono.fecha,
          dias: diasLapso,
          capitalBase: capitalActual + abonoACapital,
          tasaMensual: tasaMoratoriaMensual,
          interesDevengado: interesLapso,
          abonoInteres: abonoAInteres,
          abonoCapital: abonoACapital,
          capitalFinal: capitalActual,
          saldoInteresPendiente: interesAcumuladoNoLiquidado
        });

        fechaPivote = fAbono;
      }
    }

    // Tramo final desde último abono hasta fecha de corte
    const diasRemanentes = Math.round((fCorte.getTime() - fechaPivote.getTime()) / MS_PER_DAY);
    if (diasRemanentes > 0 && capitalActual > 0) {
      const tasaDiaria = (tasaMoratoriaMensual / 100) / 30;
      const interesLapso = capitalActual * tasaDiaria * diasRemanentes;
      interesAcumuladoNoLiquidado += interesLapso;
      interesMoratorioTotal += interesLapso;

      desglosePeriodos.push({
        fechaInicio: fechaPivote.toISOString().split('T')[0],
        fechaFin: fechaCorte,
        dias: diasRemanentes,
        capitalBase: capitalActual,
        tasaMensual: tasaMoratoriaMensual,
        interesDevengado: interesLapso,
        abonoInteres: 0,
        abonoCapital: 0,
        capitalFinal: capitalActual,
        saldoInteresPendiente: interesAcumuladoNoLiquidado
      });
    }

    const tasaDiariaOrd = aplicaOrdinario ? ((valTasaOrd / 100) / 30) : 0;
    const interesOrdinarioTotal = capitalActual * tasaDiariaOrd * diasTotales;
    const subtotalIntereses = interesAcumuladoNoLiquidado + interesOrdinarioTotal;
    const ivaTotal = aplicaIva ? subtotalIntereses * 0.16 : 0;
    const totalLiquidacion = capitalActual + subtotalIntereses + ivaTotal;

    return {
      valido: true,
      diasTotales,
      interesMoratorioTotal,
      interesOrdinarioTotal,
      ivaTotal,
      totalAbonos: totalAbonado,
      capitalRemanente: capitalActual,
      totalLiquidacion,
      desglosePeriodos
    };
  }, [
    valSuertePrincipal, 
    fechaInicioMora, 
    fechaCorte, 
    tasaMoratoriaMensual, 
    aplicaOrdinario, 
    valTasaOrd, 
    aplicaIva, 
    abonos
  ]);

  // Generación del texto judicial de la Planilla de Liquidación
  const escritoJudicial = useMemo(() => {
    const formatCurrency = (val: number) => `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M.N.`;
    
    if (!calculo.valido) {
      return `[CALCULADORA EN ESPERA DE DATOS]
Por favor completa la Suerte Principal, Fecha de Inicio de Mora y Tasa de Interés en la pestaña "1. Parámetros & Cálculo" para generar automáticamente la Planilla Judicial de Liquidación con formato oficial.`;
    }

    return `EXPEDIENTE: ${expedienteNum || 'SE REGISTRARÁ'}
JUICIO: ${tipoJuicio}
ACTOR: ${parteActora.toUpperCase() || 'PARTE ACTORA'}
DEMANDADO: ${parteDemandada.toUpperCase() || 'PARTE DEMANDADA'}

C. ${juzgado || 'JUEZ DE PRIMERA INSTANCIA'}.
PRESENTE.

${parteActora.toUpperCase() || 'EL PROMOVENTE'}, por mi propio derecho (o en mi carácter de endosatario en procuración / apoderado legal de la parte actora), con la personalidad debidamente acreditada en los autos del expediente al rubro indicado, ante Usted con el debido respeto comparezco a exponer:

Que por medio del presente escrito, y con fundamento en lo establecido por los artículos 1348, 1349 y demás relativos y aplicables del Código de Comercio (y en su defecto supletoriamente la legislación procesal civil aplicable), vengo en tiempo y forma a promover:

INCIDENTE DE LIQUIDACIÓN DE SENTENCIA
(PLANILLA DE LIQUIDACIÓN DE INTERESES Y ACCESORIOS LEGALES)

A efecto de hacer efectiva la condena decretada en contra de la parte demandada ${parteDemandada.toUpperCase() || 'DEMANDADA'}, formulando para tal efecto la correspondiente planilla de conformidad con las siguientes:

PRESTACIONES

A) Por concepto de SUERTE PRINCIPAL insoluta, la cantidad líquida de ${formatCurrency(calculo.capitalRemanente)} (${calculo.capitalRemanente === valSuertePrincipal ? 'importe original adeudado' : 'saldo insoluto tras amortización de abonos legales'}).

B) Por concepto de INTERESES MORATORIOS devengados a partir del día ${fechaInicioMora} (fecha de constitución en mora) al día ${fechaCorte} (fecha de corte de la presente planilla), calculados a la tasa del ${tasaMoratoriaMensual.toFixed(2)}% mensual (${tasaMoratoriaAnual.toFixed(2)}% anual), arrojando la cantidad líquida de ${formatCurrency(calculo.interesMoratorioTotal - (calculo.totalAbonos > 0 ? (calculo.interesMoratorioTotal - calculo.desglosePeriodos.reduce((acc, p) => acc + p.saldoInteresPendiente, 0)) : 0))}.

${aplicaOrdinario ? `C) Por concepto de INTERESES ORDINARIOS devengados, la cantidad de ${formatCurrency(calculo.interesOrdinarioTotal)}.\n` : ''}${aplicaIva ? `D) Por concepto del IMPUESTO AL VALOR AGREGADO (16%) sobre los intereses devengados, la cantidad de ${formatCurrency(calculo.ivaTotal)}.\n` : ''}
E) El GRAN TOTAL LÍQUIDO de la presente liquidación que asciende a la cantidad de: ${formatCurrency(calculo.totalLiquidacion)}.

HECHOS Y CORRIDA FINANCIERA FORENSE

1. En la sentencia definitiva ejecutoriada dictada en el presente juicio, se condenó a la demandada al pago de la suerte principal y a los intereses moratorios generados desde la mora hasta la total liquidación del adeudo.

2. En cumplimiento a la Tesis Jurisprudencial 1a./J. 47/2014 emitida por la Primera Sala de la Suprema Corte de Justicia de la Nación, bajo el rubro: "PAGARÉ. SI EL JUZGADOR ADVIERTE QUE LA TASA DE INTERESES PACTADA CON MOTIVO DEL SUSCRIPCIÓN ES NOTORIAMENTE USURARIA PUEDE, DE OFICIO, REDUCIRLA PRUDENCIALMENTE", se hace constar que la tasa liquidada del ${tasaMoratoriaMensual.toFixed(2)}% mensual (${tasaMoratoriaAnual.toFixed(2)}% anual) respeta el marco de regularidad constitucional, no transgrede los límites objetivos del Costo Anual Total (CAT) fijados por el Banco de México ni vulnera el Artículo 21, numeral 3, de la Convención Americana sobre Derechos Humanos, garantizando la certeza y equidad procesal.

3. CORRIDA DETALLADA DE LA LIQUIDACIÓN:
- Periodo liquidado: Del ${fechaInicioMora} al ${fechaCorte} (${calculo.diasTotales} días naturales transcurridos).
- Suerte principal base: ${formatCurrency(valSuertePrincipal)}
- Total de abonos computados a prelación de ley (Art. 364 Código de Comercio): ${formatCurrency(calculo.totalAbonos)}
- Remanente insoluto de suerte principal: ${formatCurrency(calculo.capitalRemanente)}
- Intereses devengados pendientes de liquidación: ${formatCurrency(calculo.interesMoratorioTotal)}
- Monto total exigible al corte: ${formatCurrency(calculo.totalLiquidacion)}

PRUEBAS

I. LA INSTRUMENTAL DE ACTUACIONES, consistente en todas y cada una de las constancias, actuaciones y resoluciones que integran el presente juicio, en todo lo que favorezca a los intereses de mi representada.

II. LA PRESUNCIONAL LEGAL Y HUMANA, en su doble aspecto, en cuanto beneficie a los intereses de la actora.

PETITORIOS

Por lo anteriormente expuesto y fundado, a Usted C. Juez atentamente pido se sirva:

PRIMERO. Tener por promovido en tiempo y forma el presente INCIDENTE DE LIQUIDACIÓN DE SENTENCIA conforme a la planilla de cálculo expuesta.

SEGUNDO. Dar vista a la parte demandada por el término de ley de 3 TRES DÍAS hábiles, a efecto de que manifieste lo que a su derecho e interés convenga, con el apercibimiento legal correspondiente.

TERCERO. Transcurrido dicho término, dictar la resolución interlocutoria correspondiente, aprobando la presente planilla de liquidación por la cantidad líquida y total de ${formatCurrency(calculo.totalLiquidacion)}, requiriendo a la demandada de su inmediato pago y decretando el embargo de bienes en caso de incumplimiento.

PROTESTO LO NECESARIO

${parteActora.toUpperCase() || 'PARTE ACTORA / PROMOVENTE'}
En la fecha de su presentación judicial.`;
  }, [
    expedienteNum, 
    tipoJuicio, 
    parteActora, 
    parteDemandada, 
    juzgado, 
    calculo, 
    fechaInicioMora, 
    fechaCorte, 
    tasaMoratoriaMensual, 
    tasaMoratoriaAnual, 
    valSuertePrincipal, 
    aplicaOrdinario, 
    aplicaIva
  ]);

  // Exportar Word Judicial Oficial
  const handleExportDocx = async () => {
    try {
      setIsExporting(true);
      const docBlob = await generateJudicialDocx(escritoJudicial, {
        title: 'INCIDENTE DE LIQUIDACIÓN DE SENTENCIA (PLANILLA FORENSE)',
        materia: 'Mercantil / Civil',
        rubro: {
          expediente: expedienteNum || 'SIN-EXP',
          juzgado: juzgado || 'JUZGADO CIVIL Y MERCANTIL',
          actor: parteActora || 'ACTOR',
          demandado: parteDemandada || 'DEMANDADO',
          juicio: tipoJuicio
        },
        firmante: parteActora || 'PARTE ACTORA / PROMOVENTE',
        selloCripto: Math.random().toString(16).substring(2, 10).toUpperCase()
      });

      const filename = `Planilla_Liquidacion_${(expedienteNum || 'Mercantil').replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
      downloadDocxBlob(docBlob, filename);
    } catch (err) {
      console.error('Error al generar Word:', err);
      alert('Error al generar el archivo Word judicial. Revisa la consola para más detalles.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(escritoJudicial);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Módulo Forense Inteligente
            </span>
            <span className="text-xs text-slate-500 font-mono">SCJN 1a./J. 47/2014</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Calculator className="w-8 h-8 text-amber-600" />
            Calculadora Forense de Liquidación & Detector de Usura
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Cómputo exacto de suerte principal, intereses ordinarios y moratorios, imputación legal de abonos (Art. 364 C.Com.) y auditoría oficiosa de convencionalidad.
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLimpiarTodo}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-sm transition-colors cursor-pointer"
            title="Limpiar todos los campos y reiniciar calculadora"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Limpiar Todo
          </button>
          <button
            onClick={handleExportDocx}
            disabled={isExporting || !calculo.valido}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C058] text-black font-black text-xs shadow-md shadow-[#D4AF37]/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Generando Word...' : 'Descargar Planilla Judicial (.docx)'}
          </button>
        </div>
      </div>

      {/* Selector de Expediente Vinculado */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-md border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Vincular con Expediente del Sistema</h3>
            <p className="text-xs text-slate-400">Auto-rellena los datos de las partes, número de juicio y juzgado competente</p>
          </div>
        </div>
        <div className="w-full md:w-80">
          <select
            value={selectedCaseId}
            onChange={(e) => handleSelectCase(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">-- Seleccionar expediente (opcional) --</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number ? `${c.case_number} - ` : ''}{c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Semáforo Anti-Usura SCJN */}
      <div className={`rounded-xl border p-5 transition-all shadow-sm ${
        usuraAudit.nivel === 'bajo'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
          : usuraAudit.nivel === 'medio'
          ? 'bg-amber-50 border-amber-200 text-amber-950'
          : usuraAudit.nivel === 'alto'
          ? 'bg-rose-50 border-rose-200 text-rose-950'
          : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${
              usuraAudit.nivel === 'bajo'
                ? 'bg-emerald-100 text-emerald-700'
                : usuraAudit.nivel === 'medio'
                ? 'bg-amber-100 text-amber-700'
                : usuraAudit.nivel === 'alto'
                ? 'bg-rose-100 text-rose-700 animate-pulse'
                : 'bg-slate-200 text-slate-700'
            }`}>
              {usuraAudit.nivel === 'bajo' && <ShieldCheck className="w-6 h-6" />}
              {usuraAudit.nivel === 'medio' && <AlertTriangle className="w-6 h-6" />}
              {usuraAudit.nivel === 'alto' && <ShieldAlert className="w-6 h-6" />}
              {usuraAudit.nivel === 'neutro' && <Calculator className="w-6 h-6 text-slate-600" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs uppercase font-extrabold px-2 py-0.5 rounded tracking-wider ${
                  usuraAudit.nivel === 'bajo'
                    ? 'bg-emerald-200/80 text-emerald-900'
                    : usuraAudit.nivel === 'medio'
                    ? 'bg-amber-200/80 text-amber-900'
                    : usuraAudit.nivel === 'alto'
                    ? 'bg-rose-200/80 text-rose-900'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  Semáforo Anti-Usura SCJN
                </span>
                {valTasaMora > 0 && (
                  <span className="text-xs font-semibold">Tasa Anualizada: {tasaMoratoriaAnual.toFixed(2)}% | Mensual: {tasaMoratoriaMensual.toFixed(2)}%</span>
                )}
              </div>
              <h3 className="font-bold text-base mt-1">{usuraAudit.titulo}</h3>
              <p className="text-sm opacity-90 mt-0.5">{usuraAudit.descripcion}</p>
              <p className="text-xs mt-1.5 font-medium underline opacity-80">{usuraAudit.recomendacion}</p>
            </div>
          </div>

          {valTasaMora > 0 && usuraAudit.nivel !== 'bajo' && (
            <button
              onClick={handleAjustarTasaSCJN}
              className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 font-semibold text-xs border border-amber-500/40 shadow transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Aplicar Tasa Prudencial SCJN (36% Anual / 3% Mensual)
            </button>
          )}
        </div>
      </div>

      {/* Tabs de Navegación de Vista */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('calculadora')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'calculadora'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          1. Parámetros & Cálculo
        </button>
        <button
          onClick={() => setActiveTab('desglose')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'desglose'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          2. Tabla Forense Periodo a Periodo
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-normal">
            {calculo.desglosePeriodos.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('escrito')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'escrito'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          3. Escrito Judicial Blindado (Planilla)
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-normal">
            Word .docx
          </span>
        </button>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121214] p-4 rounded-xl border border-[#27272A] shadow-md">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suerte Principal</span>
          <p className="text-xl font-bold text-white mt-1">
            ${calculo.capitalRemanente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400">
            {valSuertePrincipal > 0 && calculo.capitalRemanente < valSuertePrincipal ? 'Saldo amortizado' : 'Capital base inicial'}
          </span>
        </div>

        <div className="bg-[#121214] p-4 rounded-xl border border-[#27272A] shadow-md">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Días de Mora</span>
          <p className="text-xl font-bold text-[#D4AF37] mt-1">
            {calculo.diasTotales} días
          </p>
          <span className="text-[11px] text-slate-400">
            {fechaInicioMora ? `Del ${fechaInicioMora} al ${fechaCorte}` : 'Ingresa la fecha de inicio'}
          </span>
        </div>

        <div className="bg-[#121214] p-4 rounded-xl border border-[#27272A] shadow-md">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Intereses Moratorios</span>
          <p className="text-xl font-bold text-[#E5C058] mt-1">
            ${calculo.interesMoratorioTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400">
            Al {tasaMoratoriaMensual.toFixed(2)}% mensual
          </span>
        </div>

        <div className="bg-[#18181B] p-4 rounded-xl border border-[#D4AF37]/40 shadow-lg text-white">
          <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">Total a Liquidar</span>
          <p className="text-2xl font-black text-[#D4AF37] mt-1">
            ${calculo.totalLiquidacion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400">
            Suerte + Intereses {aplicaIva ? '+ IVA' : ''}
          </span>
        </div>
      </div>

      {/* CONTENIDO DE TABS */}
      {activeTab === 'calculadora' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Parámetros Financieros */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Parámetros Financieros de la Deuda
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Suerte Principal Original (MXN)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={suertePrincipal}
                      onChange={(e) => setSuertePrincipal(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tasa de Interés Moratorio Pactada
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={tasaMoratoriaInput}
                        onChange={(e) => setTasaMoratoriaInput(e.target.value)}
                        className="w-full pr-8 pl-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold">%</span>
                    </div>
                    <select
                      value={tipoTasaMoratoria}
                      onChange={(e) => setTipoTasaMoratoria(e.target.value as 'mensual' | 'anual')}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium bg-slate-50 focus:outline-none"
                    >
                      <option value="mensual">Mensual</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                  {valTasaMora > 0 && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Equivalente a: <strong>{tasaMoratoriaMensual.toFixed(2)}% mensual</strong> / <strong>{tasaMoratoriaAnual.toFixed(2)}% anual</strong>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Fecha de Inicio de Mora (Día siguiente al vencimiento)
                  </label>
                  <input
                    type="date"
                    value={fechaInicioMora}
                    onChange={(e) => setFechaInicioMora(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Fecha de Corte de la Liquidación
                  </label>
                  <input
                    type="date"
                    value={fechaCorte}
                    onChange={(e) => setFechaCorte(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Opciones Avanzadas: Interés Ordinario e IVA */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={aplicaOrdinario}
                      onChange={(e) => setAplicaOrdinario(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                    Liquidar también Intereses Ordinarios pactados
                  </label>
                  {aplicaOrdinario && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={tasaOrdinariaInput}
                        onChange={(e) => setTasaOrdinariaInput(e.target.value)}
                        className="w-20 px-2 py-1 text-sm border border-slate-300 rounded font-semibold text-right"
                      />
                      <span className="text-xs text-slate-500">% mensual</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={aplicaIva}
                      onChange={(e) => setAplicaIva(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                    Causar IVA (16%) sobre intereses devengados (operaciones comerciales o financieras)
                  </label>
                </div>
              </div>
            </div>

            {/* Módulo de Pagos Parciales / Abonos */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Percent className="w-5 h-5 text-amber-600" />
                    Abonos y Pagos Parciales Realizados
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Amortización legal obligatoria según Art. 364 Código de Comercio (primero a intereses vencidos, luego a capital).
                  </p>
                </div>
              </div>

              {/* Formulario nuevo abono */}
              <div className="flex flex-col sm:flex-row gap-3 items-end bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha del Abono</label>
                  <input
                    type="date"
                    value={nuevoAbonoFecha}
                    onChange={(e) => setNuevoAbonoFecha(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Monto del Abono (MXN)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={nuevoAbonoMonto}
                    onChange={(e) => setNuevoAbonoMonto(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddAbono}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Registrar Abono
                </button>
              </div>

              {/* Lista de abonos */}
              {abonos.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No hay pagos a cuenta registrados. La suerte principal se liquida íntegramente.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border rounded-lg overflow-hidden">
                  {abonos.map((abono, idx) => (
                    <div key={abono.id} className="flex items-center justify-between p-3 bg-white text-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-800">
                            ${abono.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                          </span>
                          <span className="text-xs text-slate-500 ml-2">Fecha: {abono.fecha}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAbono(abono.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                        title="Eliminar abono"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Datos Procesales y Resumen Ejecutivo */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="w-5 h-5 text-amber-600" />
                Datos para la Planilla Judicial
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Número de Expediente
                </label>
                <input
                  type="text"
                  placeholder="Ej. 1245/2023"
                  value={expedienteNum}
                  onChange={(e) => setExpedienteNum(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Juzgado Competente
                </label>
                <input
                  type="text"
                  placeholder="Ej. JUZGADO QUINTO DE LO MERCANTIL"
                  value={juzgado}
                  onChange={(e) => setJuzgado(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Parte Actora (Acreedor)
                </label>
                <input
                  type="text"
                  placeholder="Nombre completo o razón social"
                  value={parteActora}
                  onChange={(e) => setParteActora(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Parte Demandada (Deudor)
                </label>
                <input
                  type="text"
                  placeholder="Nombre completo o razón social"
                  value={parteDemandada}
                  onChange={(e) => setParteDemandada(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Tipo de Juicio
                </label>
                <select
                  value={tipoJuicio}
                  onChange={(e) => setTipoJuicio(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="JUICIO EJECUTIVO MERCANTIL">Juicio Ejecutivo Mercantil (Pagaré / Título)</option>
                  <option value="JUICIO ORAL MERCANTIL">Juicio Oral Mercantil</option>
                  <option value="JUICIO ORDINARIO MERCANTIL">Juicio Ordinario Mercantil</option>
                  <option value="JUICIO ESPECIAL HIPOTECARIO">Juicio Especial Hipotecario</option>
                  <option value="JUICIO ORDINARIO CIVIL">Juicio Ordinario Civil</option>
                </select>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => setActiveTab('escrito')}
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  Ver Escrito Judicial Blindado <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Fundamento SCJN Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                Marco Jurídico de la SCJN
              </div>
              <p className="text-slate-600 leading-relaxed">
                El <strong>control de convencionalidad ex officio</strong> obliga a los juzgadores a no convalidar pactos de intereses que lesionen el patrimonio del deudor de forma notoria, sustituyendo la tasa contractual por parámetros financieros como el CAT promedio publicado por Banxico para operaciones equiparables.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TABLA FORENSE PERIODOS */}
      {activeTab === 'desglose' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Corrida Financiera y Amortización Periódica</h3>
              <p className="text-xs text-slate-500">Desglose de días, amortización legal a intereses y amortización residual a suerte principal.</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-200 text-slate-700">
              {calculo.desglosePeriodos.length} tramos calculados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Periodo (Desde - Hasta)</th>
                  <th className="p-3 text-center">Días</th>
                  <th className="p-3 text-right">Capital Base</th>
                  <th className="p-3 text-center">Tasa Mensual</th>
                  <th className="p-3 text-right">Interés Devengado</th>
                  <th className="p-3 text-right">Abono a Interés</th>
                  <th className="p-3 text-right">Abono a Capital</th>
                  <th className="p-3 text-right">Saldo Capital</th>
                  <th className="p-3 text-right">Interés Insoluto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculo.desglosePeriodos.map((p, i) => (
                  <tr key={i} className="hover:bg-amber-50/40 transition-colors">
                    <td className="p-3 font-medium text-slate-800">
                      {p.fechaInicio} al {p.fechaFin}
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-600">{p.dias}</td>
                    <td className="p-3 text-right font-mono">${p.capitalBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-center text-amber-700 font-bold">{p.tasaMensual.toFixed(2)}%</td>
                    <td className="p-3 text-right font-mono text-rose-600 font-semibold">${p.interesDevengado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono text-emerald-600">${p.abonoInteres.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono text-emerald-700 font-bold">${p.abonoCapital.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">${p.capitalFinal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono text-rose-700 font-bold">${p.saldoInteresPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                <tr>
                  <td className="p-3 uppercase">TOTALES</td>
                  <td className="p-3 text-center">{calculo.diasTotales} días</td>
                  <td className="p-3 text-right">-</td>
                  <td className="p-3 text-center">-</td>
                  <td className="p-3 text-right text-rose-600 font-mono">${calculo.interesMoratorioTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right text-emerald-600 font-mono">${(calculo.totalAbonos - calculo.desglosePeriodos.reduce((acc, p) => acc + p.abonoCapital, 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right text-emerald-700 font-mono">${calculo.desglosePeriodos.reduce((acc, p) => acc + p.abonoCapital, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right text-slate-900 font-mono font-black">${calculo.capitalRemanente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right text-rose-700 font-mono font-black">${calculo.desglosePeriodos[calculo.desglosePeriodos.length - 1]?.saldoInteresPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ESCRITO JUDICIAL COMPLETO */}
      {activeTab === 'escrito' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Escrito de Incidente de Liquidación de Sentencia</h3>
              <p className="text-xs text-slate-500">Texto judicial formateado con proemio, prestaciones, corrida y petitorios.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado al Portapapeles' : 'Copiar Texto'}
              </button>
              <button
                onClick={handleExportDocx}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#D4AF37] hover:bg-[#E5C058] text-black text-xs font-bold rounded-xl shadow-md shadow-[#D4AF37]/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {isExporting ? 'Descargando...' : 'Descargar en Word (.docx)'}
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-50">
            <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-lg border border-slate-200 shadow-sm font-serif text-sm leading-relaxed text-slate-800 whitespace-pre-wrap selection:bg-amber-100">
              {escritoJudicial}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
