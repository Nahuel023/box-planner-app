# ⚡ Box Planner — App Web para Alumnos

App web que permite a cada alumno ver sus RMs, rutina e historial de progreso
escaneando un QR único. Los datos se leen en tiempo real desde tu Google Sheet.

---

## 📁 Archivos

```
box-planner-app/
├── index.html     ← La app completa (un solo archivo)
└── README.md      ← Esta guía
```

---

## 🚀 Pasos para publicar (30 minutos total)

### PASO 1 — Preparar tu Google Sheet

1. Abrí tu Google Sheet con la planilla de gimnasio
2. Andá a **Archivo → Compartir → Publicar en la web**
3. En "Toda la hoja de cálculo" elegí **Valores separados por comas (.csv)**
4. Hacé clic en **Publicar** y confirmá
5. Copiá el **ID** de tu sheet desde la URL:
   ```
   https://docs.google.com/spreadsheets/d/ <<ACÁ ESTÁ EL ID>> /edit
   ```

### PASO 2 — Configurar la app

Abrí `index.html` con cualquier editor de texto (Notepad, VS Code, etc.)
y buscá la sección `CONFIG`:

```javascript
const CONFIG = {
  SHEET_ID: "<<ID_DE_TU_GOOGLE_SHEET>>",   // ← pegá tu ID acá
  HOJA_ALUMNOS:   "👥 Alumnos",            // nombre exacto de tu hoja
  HOJA_RMS:       "📊 RMs Maestro",
  HOJA_RUTINAS:   "📅 Rutinas Anuales",
  ...
}
```

⚠️ Los nombres de hoja deben ser EXACTAMENTE iguales a los de tu Google Sheet,
incluyendo el emoji.

### PASO 3 — Subir a GitHub Pages (hosting gratis)

1. Creá una cuenta en https://github.com (si no tenés)
2. Creá un repositorio nuevo llamado `box-planner` (público)
3. Subí el archivo `index.html` al repositorio
4. Andá a **Settings → Pages → Source: Deploy from branch → main → / (root)**
5. Guardá. En 2 minutos tenés tu URL pública:
   ```
   https://TU_USUARIO.github.io/box-planner/
   ```

### PASO 4 — Agregar PINs a tus alumnos

En tu Google Sheet, en la hoja **👥 Alumnos**, la columna **A (ID)** es el PIN
de cada alumno. Usá códigos simples y únicos:

| Alumno          | PIN    | URL del alumno                                         |
|-----------------|--------|--------------------------------------------------------|
| Martín Rodríguez| MAR001 | tuusuario.github.io/box-planner/?pin=MAR001            |
| Lucía González  | LUC002 | tuusuario.github.io/box-planner/?pin=LUC002            |
| Diego Martínez  | DIE003 | tuusuario.github.io/box-planner/?pin=DIE003            |

### PASO 5 — Generar QR para cada alumno

**Opción A — Manual (gratis):**
1. Entrá a https://www.qr-code-generator.com
2. Pegá la URL del alumno (con su PIN)
3. Descargá el QR como imagen
4. Lo mandás por WhatsApp o lo imprimís

**Opción B — Automático desde Google Sheets:**
Agregá esta fórmula en una columna de tu hoja de Alumnos:
```
=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://TU_USUARIO.github.io/box-planner/?pin="&A2)
```
Reemplazá `TU_USUARIO` con tu usuario de GitHub y `A2` por la celda con el PIN.
¡Se generan los QR automáticamente dentro de la planilla!

---

## 📱 ¿Qué ve el alumno?

Al escanear el QR, el alumno ve:

**Pestaña Progreso:**
- Sus 3 RMs principales del mes actual
- Tabla completa de RMs con comparación al mes anterior
- Gráficos de evolución mes a mes para cada ejercicio

**Pestaña Rutina:**
- Su rutina de la semana actual en el mismo formato que usás vos
- Bloques por color: STRUCTURE (violeta), STRENGTH (naranja),
  WEIGHTLIFTING (verde), METCON (azul), CORE (violeta), TABATA (amarillo)

**Pestaña Historial:**
- Todos sus RMs organizados mes a mes desde que arrancó

---

## 🔒 Seguridad

- Los alumnos NO pueden ver datos de otros alumnos (el PIN filtra solo los suyos)
- Los alumnos tienen acceso de **solo lectura** — no pueden modificar nada
- El docente sigue siendo el dueño de toda la data en Google Sheets
- Si querés revocar el acceso de un alumno, simplemente cambiás su PIN en el Sheet

---

## 🛠 Personalización

### Cambiar el nombre del box
En `index.html` buscá `BOX<span>PLANNER</span>` y reemplazalo.

### Cambiar los colores
En la sección `:root` al inicio del CSS:
```css
--accent:  #e8ff47;   /* color principal (lima) */
--accent2: #ff6b35;   /* color secundario (naranja) */
```

### Modo demo
Si el `SHEET_ID` es `<<ID_DE_TU_GOOGLE_SHEET>>`, la app corre en modo demo
con datos de ejemplo. Útil para mostrarle a alumnos cómo va a quedar.

---

## ❓ Preguntas frecuentes

**¿Funciona en iPhone?** Sí, funciona en todos los navegadores móviles.

**¿El alumno necesita cuenta de Google?** No, solo el PIN.

**¿Puedo tener más de 200 alumnos?** Sí, no hay límite.

**¿Cuánto tarda en actualizarse?** Los datos de Google Sheets se actualizan
en segundos. El alumno puede tocar "Actualizar datos" para refrescar.

**¿Puedo usarlo sin GitHub?** Sí, podés hostearlo en Netlify (netlify.com),
Vercel (vercel.com), o cualquier servidor web. Todos tienen plan gratis.

---

## 📞 Estructura esperada en Google Sheets

### Hoja "👥 Alumnos" (fila 5 en adelante, encabezados en fila 4):
```
A: ID/PIN | B: Nombre | C: Edad | D: Género | E: Teléfono | F: Estado
G: Lesiones | H: Objetivo Principal | I: Objetivo Secundario | J: Fecha inicio
K: Disciplina | L: Días/sem | M: Rutina | N: Snatch | O: C&J | P: Squat
```

### Hoja "📊 RMs Maestro" (fila 4 en adelante, encabezados en fila 3):
```
A: Alumno | B: Ejercicio | C: Categoría
D-O: Meses (Ene-Dic) | P: Mejor RM | Q: Progreso %
```

### Hoja "📅 Rutinas Anuales" (fila 5 en adelante):
```
A: Semana | B: Fechas | C: Mes | D: Bloque | E: Disciplina
F: Objetivo | G: Contenidos | H: Carga | I: Volumen | J: Método
K: Alumnos | L: Completada | M: Mes | N: Observaciones | O: Docente
```
