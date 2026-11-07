# TANAKA LEGAL IQ - Edilia Tanaka y Asociados

Tanaka Legal IQ es una suite jurídica de alta tecnología desarrollada exclusivamente para la firma **Edilia Tanaka y Asociados** ("La Abogada de Tu Familia"), dirigida por la **Lic. Dora Edilia Tanaka Cervantes**. Impulsada por IA forense (Google Gemini) y adaptada a la legislación del Estado de Coahuila y federal mexicana.

## Características de Alto Valor
- **Liquidación Forense Mercantil + Semáforo Anti-Usura SCJN**: Cálculo de intereses moratorios/ordinarios con tesis 1a./J. 47/2014 y generación de planilla judicial en Word (.docx).
- **Duelo Procesal**: Confrontación cruzada de Demanda vs Contestación con fijación de litis, Onus Probandi y generación de pliego de posiciones e interrogatorios.
- **Cómputo Inteligente de Términos Judiciales**: Calendario judicial oficial con días inhábiles y términos de gracia para vencimientos fatales.
- **Línea de Tiempo Procesal (Tracking)**: Cronología de 6 etapas e informes ejecutivos automáticos para clientes en Word y WhatsApp.
- **Auditoría Forense con Visión de Juez**: Análisis y blindaje inatacable de escritos judiciales con exportación oficial a Microsoft Word (.docx).
- **Scanner con OCR**: Digitalización inmediata de autos, acuerdos y expedientes.
- **Firma Legal-Contable-Psicológica**: Tareas, clientes, expedientes y control financiero.

---
© 2026 Edilia Tanaka y Asociados - Firma Legal-Contable-Psicológica.

## Despliegue en Producción (Independent)

Esta aplicación es 100% independiente y puede ser desplegada en diversas plataformas.

### Vercel / Netlify

1. **Base de Datos**: Dado que Vercel y Netlify usan sistemas de archivos efímeros, la base de datos SQLite (`legal.db`) se borrará en cada despliegue. Para producción, se recomienda migrar a una base de datos remota (como Supabase/PostgreSQL) o usar un servicio de almacenamiento persistente.
2. **Variables de Entorno**: Configura las variables definidas en `.env.example` en el panel de control de tu plataforma de despliegue.
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist` (para el frontend estático) o configuración de servidor para el backend.

### Docker (Recomendado para VPS)

Puedes contenerizar la aplicación para ejecutarla en cualquier servidor con persistencia de disco para el archivo `.db`.

---

---
© 2026 Edilia Tanaka y Asociados - Firma Legal-Contable-Psicológica. Todos los derechos reservados.
