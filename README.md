# LEXMARCORP IQ - Plataforma Legal con IA

Lexmarcorp IQ es una plataforma integral de gestión legal impulsada por Inteligencia Artificial (Google Gemini). Permite la gestión de expedientes, auditoría forense de escritos con "Visión de Juez", escaneo de documentos con OCR y gestión automatizada de pagos.

## Caracteristicas

- **Auditoría Forense con Visión de Juez**: Análisis profundo de escritos legales basado en el marco jurídico de Coahuila.
- **Scanner de Documentos**: Extracción de texto mediante OCR (PDF, Word, Imágenes) y clasificación automática.
- **Gestión de Expedientes**: Control total de casos, clientes, abogados y tareas.
- **Centro de Mensajería**: Comunicación vinculada a expedientes específicos.
- **Pasarela de Pagos**: Integración con Stripe para cobros automatizados.

## Guía de Instalación Local

Para ejecutar Lexmarcorp IQ en tu propia computadora, sigue estos pasos:

### 1. Requisitos Previos

- **Node.js**: Versión 18 o superior.
- **NPM**: Incluido con Node.js.
- **Clave API de Gemini**: Consíguela gratis en [Google AI Studio](https://aistudio.google.com/app/apikey).

### 2. Instalación

1. Clona este repositorio o descarga los archivos.
2. Abre una terminal en la carpeta del proyecto.
3. Instala las dependencias:
   ```bash
   npm install
   ```

### 3. Configuración

1. Copia el archivo de ejemplo de variables de entorno:
   ```bash
   cp .env.example .env
   ```
2. Edita el archivo `.env` y añade tu `GEMINI_API_KEY`.
3. (Opcional) Configura tus llaves de Stripe si deseas usar la pasarela de pagos.

### 4. Ejecución

Para iniciar el servidor de desarrollo (Frontend y Backend simultáneamente):
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

---

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

## Contribución

Si deseas mejorar Lexmarcorp IQ, siéntete libre de abrir un Pull Request o reportar problemas en GitHub.

---
© 2024 Lexmarcorp Legal Tech.
