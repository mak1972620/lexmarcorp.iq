/**
 * Utilidades especializadas para el Cómputo Forense de Términos Judiciales en México
 * Fundamentado en:
 * - Ley de Amparo (Arts. 18, 19, 21, 22, 31)
 * - Código de Comercio (Arts. 1075, 1076, 1079)
 * - Código Federal de Procedimientos Civiles (CFPC Arts. 284, 285)
 * - Ley Federal del Trabajo (Arts. 74, 747)
 * - Ley Orgánica del Poder Judicial de la Federación (Art. 163) y Acuerdos Generales del Pleno del CJF
 */

export interface DiaComputo {
  fecha: string; // YYYY-MM-DD
  diaSemana: string;
  esHabil: boolean;
  motivoInhabil?: string;
  etapa: 'notificacion' | 'surtimiento' | 'computo' | 'vencimiento' | 'gracia' | 'inhabil';
  numeroDiaHabil?: number;
}

export interface ResultadoComputo {
  materia: string;
  diasTermino: number;
  fechaNotificacion: string;
  fechaSurtimiento: string;
  fechaInicioComputo: string;
  fechaVencimientoFatal: string;
  fechaTerminoGracia: string;
  diasInhabilesEnMedio: number;
  cronologia: DiaComputo[];
  reglaSurtimiento: string;
  fundamentoLegal: string;
  alertaVencimiento: 'critico' | 'urgente' | 'normal' | 'vencido';
  horasRestantesTexto: string;
}

// Catálogo de días festivos oficiales y judiciales en México
export function esDiaInhabilOficial(date: Date, fuero: 'federal' | 'local' = 'federal'): { inhabil: boolean; motivo?: string } {
  const anio = date.getFullYear();
  const mes = date.getMonth(); // 0 a 11
  const diaMes = date.getDate();
  const diaSemana = date.getDay(); // 0 = Domingo, 6 = Sábado

  if (diaSemana === 0) return { inhabil: true, motivo: 'Domingo (Inhábil por ley)' };
  if (diaSemana === 6) return { inhabil: true, motivo: 'Sábado (Inhábil por ley)' };

  // 1 de Enero
  if (mes === 0 && diaMes === 1) return { inhabil: true, motivo: 'Año Nuevo (Art. 74 LFT / Art. 19 Ley de Amparo)' };

  // Primer lunes de febrero (5 de febrero - Día de la Constitución)
  if (mes === 1 && diaSemana === 1 && diaMes <= 7) {
    return { inhabil: true, motivo: 'Día de la Constitución Mexicana (Primer lunes de febrero)' };
  }

  // Tercer lunes de marzo (21 de marzo - Natalicio de Benito Juárez)
  if (mes === 2 && diaSemana === 1 && diaMes >= 15 && diaMes <= 21) {
    return { inhabil: true, motivo: 'Natalicio de Benito Juárez (Tercer lunes de marzo)' };
  }

  // 1 de Mayo - Día del Trabajo
  if (mes === 4 && diaMes === 1) return { inhabil: true, motivo: 'Día del Trabajo (Art. 74 LFT)' };

  // 5 de Mayo - Batalla de Puebla (Festivo judicial oficial en PJF y Tribunales)
  if (mes === 4 && diaMes === 5) return { inhabil: true, motivo: 'Batalla de Puebla (Acuerdo Plenario CJF)' };

  // 16 de Septiembre - Día de la Independencia
  if (mes === 8 && diaMes === 16) return { inhabil: true, motivo: 'Independencia de México (Art. 74 LFT / Art. 19 Ley de Amparo)' };

  // 1 de Octubre (cada 6 años por cambio de poder ejecutivo, o festivo administrativo)
  if (mes === 9 && diaMes === 1 && anio === 2024) {
    return { inhabil: true, motivo: 'Transmisión del Poder Ejecutivo Federal' };
  }

  // 1 y 2 de Noviembre - Días de Muertos (Acuerdos del CJF y TSJ)
  if (mes === 10 && (diaMes === 1 || diaMes === 2)) {
    return { inhabil: true, motivo: 'Día de Muertos (Acuerdo General CJF / TSJ)' };
  }

  // Tercer lunes de noviembre (20 de noviembre - Revolución Mexicana)
  if (mes === 10 && diaSemana === 1 && diaMes >= 15 && diaMes <= 21) {
    return { inhabil: true, motivo: 'Revolución Mexicana (Tercer lunes de noviembre)' };
  }

  // 25 de Diciembre - Navidad
  if (mes === 11 && diaMes === 25) return { inhabil: true, motivo: 'Navidad (Art. 74 LFT)' };

  // Periodos Vacacionales Judiciales tradicionales (Segunda quincena de julio y segunda de diciembre)
  // Semana Santa (aproximada para días santos comunes)
  return { inhabil: false };
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function formatearFechaISO(d: Date): string {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function parseFechaLocal(str: string): Date {
  const parts = str.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
}

/**
 * Realiza el cómputo del término judicial con las reglas específicas de la materia seleccionada.
 */
export function calcularTerminoJudicial(params: {
  fechaNotificacionStr: string;
  diasTermino: number;
  materia: 'amparo' | 'mercantil' | 'civil' | 'laboral' | 'penal';
  tipoNotificacion?: 'personal' | 'lista' | 'electronica';
  fuero?: 'federal' | 'local';
}): ResultadoComputo {
  const { fechaNotificacionStr, diasTermino, materia, tipoNotificacion = 'personal', fuero = 'federal' } = params;

  const cronologia: DiaComputo[] = [];
  const fechaNotif = parseFechaLocal(fechaNotificacionStr);

  // 1. Registrar día de notificación
  const checkNotif = esDiaInhabilOficial(fechaNotif, fuero);
  cronologia.push({
    fecha: formatearFechaISO(fechaNotif),
    diaSemana: DIAS_SEMANA[fechaNotif.getDay()],
    esHabil: !checkNotif.inhabil,
    motivoInhabil: checkNotif.motivo,
    etapa: 'notificacion'
  });

  // 2. Determinar fecha en que surte efectos según la materia
  let cursor = new Date(fechaNotif);
  let reglaSurtimiento = '';
  let fundamentoLegal = '';

  if (materia === 'amparo') {
    // Amparo: Surte efectos al día hábil siguiente (Art. 31 Ley de Amparo)
    // Excepción en electrónicas donde surte dos días hábiles después si no se consulta, pero asumimos personal/lista estándar
    reglaSurtimiento = 'Surte efectos al día hábil siguiente a la notificación (Art. 31 Ley de Amparo). El plazo corre al día hábil siguiente a aquel en que surta efectos.';
    fundamentoLegal = 'Artículos 18, 19, 22 y 31 de la Ley de Amparo.';
    
    // Avanzar hasta encontrar el siguiente día hábil para el surtimiento
    do {
      cursor.setDate(cursor.getDate() + 1);
    } while (esDiaInhabilOficial(cursor, fuero).inhabil);

    cronologia.push({
      fecha: formatearFechaISO(cursor),
      diaSemana: DIAS_SEMANA[cursor.getDay()],
      esHabil: true,
      etapa: 'surtimiento'
    });

  } else if (materia === 'mercantil') {
    // Mercantil: Surte efectos al día siguiente (hábil) de practicada (Art. 1075 Código de Comercio)
    reglaSurtimiento = 'Surte efectos al día siguiente de practicada (Art. 1075 Código de Comercio). El término empieza a correr al día siguiente de aquel en que surtió efectos.';
    fundamentoLegal = 'Artículos 1075, 1076 y 1079 del Código de Comercio.';

    do {
      cursor.setDate(cursor.getDate() + 1);
    } while (esDiaInhabilOficial(cursor, fuero).inhabil);

    cronologia.push({
      fecha: formatearFechaISO(cursor),
      diaSemana: DIAS_SEMANA[cursor.getDay()],
      esHabil: true,
      etapa: 'surtimiento'
    });

  } else if (materia === 'laboral') {
    // Laboral: Surte efectos el mismo día en que se practica (Art. 747 LFT)
    reglaSurtimiento = 'Surte efectos el mismo día de la notificación (Art. 747 Ley Federal del Trabajo). El término corre al día siguiente.';
    fundamentoLegal = 'Artículos 74, 733, 735 y 747 de la Ley Federal del Trabajo.';

    cronologia.push({
      fecha: formatearFechaISO(cursor),
      diaSemana: DIAS_SEMANA[cursor.getDay()],
      esHabil: true,
      etapa: 'surtimiento'
    });

  } else {
    // Civil / Familiar Local:
    reglaSurtimiento = 'Surte efectos al día siguiente de practicada. El término empieza a correr a partir del día hábil siguiente.';
    fundamentoLegal = 'Código de Procedimientos Civiles / Código Federal de Procedimientos Civiles Arts. 284-288.';

    do {
      cursor.setDate(cursor.getDate() + 1);
    } while (esDiaInhabilOficial(cursor, fuero).inhabil);

    cronologia.push({
      fecha: formatearFechaISO(cursor),
      diaSemana: DIAS_SEMANA[cursor.getDay()],
      esHabil: true,
      etapa: 'surtimiento'
    });
  }

  const fechaSurtimientoStr = formatearFechaISO(cursor);

  // 3. Comenzar a computar los días hábiles del término
  let diasComputados = 0;
  let fechaInicioComputoStr = '';
  let diasInhabilesEnMedio = 0;

  while (diasComputados < diasTermino) {
    cursor.setDate(cursor.getDate() + 1);
    const check = esDiaInhabilOficial(cursor, fuero);

    if (check.inhabil) {
      diasInhabilesEnMedio++;
      cronologia.push({
        fecha: formatearFechaISO(cursor),
        diaSemana: DIAS_SEMANA[cursor.getDay()],
        esHabil: false,
        motivoInhabil: check.motivo,
        etapa: 'inhabil'
      });
    } else {
      diasComputados++;
      if (diasComputados === 1) {
        fechaInicioComputoStr = formatearFechaISO(cursor);
      }

      const esUltimo = diasComputados === diasTermino;
      cronologia.push({
        fecha: formatearFechaISO(cursor),
        diaSemana: DIAS_SEMANA[cursor.getDay()],
        esHabil: true,
        etapa: esUltimo ? 'vencimiento' : 'computo',
        numeroDiaHabil: diasComputados
      });
    }
  }

  const fechaVencimientoFatalStr = formatearFechaISO(cursor);

  // 4. Determinar término de gracia (primeras horas del día hábil siguiente)
  const cursorGracia = new Date(cursor);
  do {
    cursorGracia.setDate(cursorGracia.getDate() + 1);
  } while (esDiaInhabilOficial(cursorGracia, fuero).inhabil);

  const fechaTerminoGraciaStr = `${formatearFechaISO(cursorGracia)} (Primeras horas hábiles / Oficialía de Partes Común)`;

  // 5. Determinar estado de alerta
  const hoy = new Date();
  const fVence = parseFechaLocal(fechaVencimientoFatalStr);
  const diffTime = fVence.getTime() - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let alertaVencimiento: 'critico' | 'urgente' | 'normal' | 'vencido' = 'normal';
  let horasRestantesTexto = '';

  if (diffDays < 0) {
    alertaVencimiento = 'vencido';
    horasRestantesTexto = `Venció hace ${Math.abs(diffDays)} día(s)`;
  } else if (diffDays === 0) {
    alertaVencimiento = 'critico';
    horasRestantesTexto = '¡VENCE HOY! (Término fatal en curso)';
  } else if (diffDays === 1) {
    alertaVencimiento = 'urgente';
    horasRestantesTexto = 'Vence mañana';
  } else {
    horasRestantesTexto = `Quedan ${diffDays} días hábiles/naturales`;
  }

  return {
    materia: materia.toUpperCase(),
    diasTermino,
    fechaNotificacion: fechaNotificacionStr,
    fechaSurtimiento: fechaSurtimientoStr,
    fechaInicioComputo: fechaInicioComputoStr,
    fechaVencimientoFatal: fechaVencimientoFatalStr,
    fechaTerminoGracia: fechaTerminoGraciaStr,
    diasInhabilesEnMedio,
    cronologia,
    reglaSurtimiento,
    fundamentoLegal,
    alertaVencimiento,
    horasRestantesTexto
  };
}
