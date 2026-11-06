import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  AlignmentType, 
  LineRuleType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  NumberFormat
} from 'docx';

export interface JudicialDocxOptions {
  title?: string;
  materia?: string;
  rubro?: {
    actor?: string;
    demandado?: string;
    juicio?: string;
    expediente?: string;
    juzgado?: string;
  };
  firmante?: string;
  selloCripto?: string;
}

/**
 * Convierte un texto jurídico en un documento Word (.docx) formal con formato de juzgado mexicano:
 * - Margen de costura judicial (3.5 cm izquierdo, 2 cm derecho, 2.5 cm superior/inferior)
 * - Tipografía Arial 12pt con interlineado 1.5 y texto justificado
 * - Detección inteligente de secciones (Proemio, Prestaciones, Hechos, Derecho, Pruebas, Petitorios, Protesto)
 * - Calce formal de firmas y sello de auditoría forense Lexmarcorp IQ
 */
export async function generateJudicialDocx(
  text: string, 
  options: JudicialDocxOptions = {}
): Promise<Blob> {
  const { title = 'Escrito Judicial', materia = 'Civil', rubro, firmante, selloCripto } = options;

  const paragraphs: Paragraph[] = [];

  // 1. Rubro judicial (si existe) - Alineado a la derecha en negrita y tamaño compacto
  if (rubro && (rubro.actor || rubro.demandado || rubro.expediente || rubro.juicio)) {
    const rubroLines: string[] = [];
    if (rubro.actor && rubro.demandado) {
      rubroLines.push(`${rubro.actor.toUpperCase()} VS ${rubro.demandado.toUpperCase()}`);
    } else if (rubro.actor) {
      rubroLines.push(`PROMOVENTE: ${rubro.actor.toUpperCase()}`);
    }
    if (rubro.juicio) rubroLines.push(`JUICIO: ${rubro.juicio.toUpperCase()}`);
    if (rubro.expediente) rubroLines.push(`EXPEDIENTE: ${rubro.expediente}`);
    if (rubro.juzgado) rubroLines.push(`JUZGADO: ${rubro.juzgado.toUpperCase()}`);
    rubroLines.push('ESCRITO INICIAL / PROMOCIÓN');

    for (const line of rubroLines) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { line: 240, lineRule: LineRuleType.AUTO, after: 60 },
          children: [
            new TextRun({
              text: line,
              bold: true,
              size: 20, // 10pt
              font: 'Arial',
              color: '1E293B',
            }),
          ],
        })
      );
    }

    // Separador tras rubro
    paragraphs.push(new Paragraph({ spacing: { after: 240 } }));
  }

  // 2. Procesar el texto del escrito línea por línea o párrafo por párrafo
  const rawParagraphs = text.split(/\r?\n\r?\n/);

  for (const rawPara of rawParagraphs) {
    const trimmed = rawPara.trim();
    if (!trimmed) continue;

    // Detectar encabezados principales de juzgado (C. JUEZ, PRESENTE, HECHOS, PRESTACIONES, DERECHO, PRUEBAS, PETITORIOS, PROTESTO)
    const upper = trimmed.toUpperCase();
    const isMainSectionHeader = 
      /^(PRESTACIONES|HECHOS|DERECHO|PRUEBAS|PETITORIOS|PUNTOS PETITORIOS|CAPÍTULO DE PRUEBAS|CAPITULO DE PRUEBAS|SUSPENSIÓN DEL ACTO RECLAMADO|CONCEPTOS DE VIOLACIÓN|AGRAVIOS)[\s:.-]*$/i.test(trimmed) ||
      /^([IVXLCDM]+\.|\d+\.)\s+(PRESTACIONES|HECHOS|DERECHO|PRUEBAS|PETITORIOS)/i.test(trimmed);

    const isJudicialAuthority = 
      /^(C\.\s*JUEZ|C\.\s*MAGISTRADO|H\.\s*TRIBUNAL|A\s+LA\s+OFICIALÍA|AL\s+C\.\s*JUEZ)/i.test(trimmed) ||
      trimmed === 'PRESENTE.' || trimmed === 'P R E S E N T E .';

    const isProtesto = 
      trimmed.includes('PROTESTO LO NECESARIO') || 
      trimmed.includes('P R O T E S T O   L O   N E C E S A R I O') ||
      trimmed.includes('PROTESTAMOS LO NECESARIO');

    if (isMainSectionHeader) {
      // Título de sección destacado
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 280, after: 140, line: 360, lineRule: LineRuleType.AUTO },
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              underline: {},
              size: 24, // 12pt
              font: 'Arial',
              color: '0F172A',
            }),
          ],
        })
      );
    } else if (isJudicialAuthority) {
      // Proemio dirigido al juez
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 180, after: 100, line: 300, lineRule: LineRuleType.AUTO },
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              size: 24,
              font: 'Arial',
              color: '0F172A',
            }),
          ],
        })
      );
    } else if (isProtesto) {
      // Cierre solemne
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 300, line: 360, lineRule: LineRuleType.AUTO },
          children: [
            new TextRun({
              text: 'PROTESTO LO NECESARIO',
              bold: true,
              size: 24,
              font: 'Arial',
              color: '0F172A',
            }),
          ],
        })
      );

      // Línea de firma
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 100 },
          children: [
            new TextRun({
              text: '____________________________________________________',
              font: 'Arial',
              size: 24,
              color: '475569',
            }),
          ],
        })
      );

      // Nombre del firmante
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: firmante ? firmante.toUpperCase() : 'FIRMA DEL PROMOVENTE Y/O ABOGADO PATRONO',
              bold: true,
              font: 'Arial',
              size: 22,
              color: '1E293B',
            }),
          ],
        })
      );
    } else {
      // Párrafo de texto judicial ordinario (Justificado, interlineado 1.5, sangría de 1.25 cm en primera línea)
      const linesInPara = trimmed.split(/\r?\n/);
      const runs: TextRun[] = [];

      for (let i = 0; i < linesInPara.length; i++) {
        const lineText = linesInPara[i];
        
        // Detectar si una sub-línea tiene marcadores como [___DATOS___]
        const hasPlaceholder = lineText.includes('[___') || lineText.includes('{{');

        runs.push(
          new TextRun({
            text: lineText,
            size: 24, // 12pt
            font: 'Arial',
            color: hasPlaceholder ? 'B45309' : '1E293B', // Color ámbar sutil para llamar atención a los marcadores pendientes
            bold: hasPlaceholder,
            break: i < linesInPara.length - 1 ? 1 : 0,
          })
        );
      }

      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 709 }, // 1.25 cm
          spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 140 }, // Interlineado 1.5 líneas
          children: runs,
        })
      );
    }
  }

  // 3. Sello criptográfico de auditoría forense (si se adjuntó)
  if (selloCripto) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 100 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
          left: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
          right: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
        },
        children: [
          new TextRun({
            text: `[ VALIDACIÓN FORENSE LEXMARCORP IQ - SELLO: ${selloCripto} ]`,
            font: 'Courier New',
            size: 18,
            color: '64748B',
            bold: true,
          }),
        ],
      })
    );
  }

  // Crear el documento Word con configuración de página judicial mexicana
  const doc = new Document({
    title,
    description: `Escrito Judicial en Materia ${materia} generado con Lexmarcorp IQ`,
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 24,
            color: '1E293B',
          },
          paragraph: {
            spacing: { line: 360, lineRule: LineRuleType.AUTO },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1418,    // 2.5 cm
              bottom: 1418, // 2.5 cm
              left: 1985,   // 3.5 cm (Margen de costura para expediente de juzgado)
              right: 1134,  // 2.0 cm
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Lexmarcorp IQ | Materia ${materia}`,
                    size: 16,
                    color: '94A3B8',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Página ',
                    size: 18,
                    color: '94A3B8',
                    font: 'Arial',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: '94A3B8',
                    font: 'Arial',
                  }),
                  new TextRun({
                    text: ' de ',
                    size: 18,
                    color: '94A3B8',
                    font: 'Arial',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: '94A3B8',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Dispara la descarga del archivo .docx directamente en el navegador
 */
export function downloadDocxBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
