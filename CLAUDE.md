# CLAUDE.md

## Descripción general

**Box Planner App** está evolucionando hacia una plataforma web para la gestión y seguimiento del progreso de entrenamiento en múltiples disciplinas:

- CrossFit  
- Levantamiento Olímpico (OLY)  
- Gimnasio / Musculación  
- Funcional  

La aplicación está diseñada tanto para **alumnos** como para **docentes**, proporcionando herramientas para visualizar entrenamientos, registrar métricas y analizar el progreso.

---

## Visión del producto

El objetivo es construir un **MVP (Producto Mínimo Viable) escalable** que permita:

### Alumnos
- Visualizar **rutinas de entrenamiento** según la disciplina
- Registrar **métricas de rendimiento** (por clase o semanalmente)
- Hacer seguimiento del progreso:
  - Corto plazo (clase / semana)
  - Mediano plazo (mensual)
  - Largo plazo (anual)

### Docentes
- Monitorear el progreso de todos los alumnos
- Analizar métricas de rendimiento
- Crear y gestionar **rutinas de forma dinámica**
- Trabajar con múltiples disciplinas en simultáneo

---

## Objetivos del MVP

### 1. Base de la aplicación

- Definir un **modelo de datos claro**:
  - Alumnos
  - Disciplinas
  - Rutinas
  - Métricas
- Separar la lógica de datos del frontend
- Mantener el modo demo para pruebas

---

### 2. Sistema de usuarios

- Implementar autenticación:
  - Email y contraseña
- Definir roles:
  - Alumno
  - Docente / Administrador
- Persistencia de sesión

---

### 3. Sistema de métricas escalable

- Soportar múltiples disciplinas con una estructura flexible

**Tipos de métricas:**
- Peso (kg)
- Tiempo (segundos)
- Repeticiones

**Funcionalidades:**
- Carga por clase o por semana
- Visualización de progreso
- Registro de marcas personales (PR)

---

### 4. Gestión dinámica de rutinas

- Permitir a los docentes:
  - Crear rutinas por disciplina
  - Asignar rutinas por grupo o alumno
- Eliminar la dependencia de rutinas hardcodeadas

---

### 5. Panel para docentes

- Vista general de todos los alumnos
- Análisis básicos:
  - Seguimiento de progreso
  - Nivel de actividad
- Alertas simples:
  - Falta de carga de datos
  - Estancamiento en el rendimiento

---

### 6. Infraestructura y hosting

**Objetivo:** desplegar un MVP estable y escalable

**Stack recomendado:**
- Frontend: Vercel o Netlify
- Backend / Base de datos:
  - Firebase
  - Supabase (recomendado)

**Requisitos:**
- Bajo costo inicial
- Fácil despliegue
- Arquitectura escalable

---

### 7. Experiencia de usuario (UX)

- Interfaz simple e intuitiva
- Navegación acotada (máximo tres secciones principales)
- Carga de datos rápida (menos de 10 segundos)
- Diseño orientado a dispositivos móviles

---

### 8. Estrategia comercial

**Validación inicial:**
- Probar con uno o dos gimnasios reales
- Acceso gratuito en fase beta
- Recolección de feedback

**Modelo futuro:**
- Suscripción por gimnasio (no por alumno)

---

## Concepto clave

Esta aplicación no es solo un visor de rutinas.

Es una herramienta de **seguimiento de rendimiento deportivo y gestión de entrenamiento**.

Esto permite:
- Diferenciarse de aplicaciones genéricas
- Aportar valor real a docentes y centros de entrenamiento
- Evolucionar hacia un producto tipo SaaS para gimnasios

---

## Estado actual del código

El modelo de datos ya está definido. Los pasos 1 y 2 del MVP están implementados.

### Estructura de archivos

```
box-planner-app/
├── index.html          ← CSS + HTML (sin JS inline)
└── js/
    ├── db.demo.js      ← Modelo de datos + datos demo + adaptadores
    ├── data.js         ← CONFIG, fetchSheet, parseCSV, isDemoMode, getWeekNumber
    ├── render.js       ← Todas las funciones de renderizado (solo lee state)
    └── app.js          ← state global, login, logout, loadData, navegación, init
```

Los scripts se cargan en ese orden en `index.html`. Sin bundler, sin módulos ES.

### Flujo de datos

1. `init()` (app.js) detecta PIN en URL (`?pin=XXX`) o `sessionStorage`
2. `handleLogin()` valida el PIN — en demo: `getAlumnoDemo()` (db.demo.js); en sheet real: fetch CSV
3. `loadData()` popula `state.rms` y `state.rutinas` → llama `renderAll()`
4. Cada `render*()` lee `state` y escribe el DOM directamente

### Modo demo

`isDemoMode()` devuelve `true` si `CONFIG.SHEET_ID === "<<ID_DE_TU_GOOGLE_SHEET>>"`.
En demo, `loadData()` usa `getRMsDemo(pin)` y `getRutinasDemo(pin)` de `db.demo.js`.

### Correr localmente

No requiere build. Abrir `index.html` en el browser **o** usar un servidor estático:

```bash
# Python (cualquier versión)
python -m http.server 8080

# Node (si está instalado npx)
npx serve .
```

Luego abrir `http://localhost:8080` y usar uno de los PINs demo: `MAR001`, `LUC002`, `DIE003`.

También funciona con PIN en URL: `http://localhost:8080?pin=MAR001`

### Reglas técnicas activas

- Sin frameworks (React, Vue, etc.) — vanilla JS ES6+
- Todo debe correr como archivo estático (sin servidor backend)
- El modo demo nunca debe romperse al agregar nuevas funcionalidades
- `render.js` no modifica `state`; `db.demo.js` no accede al DOM