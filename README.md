# SIRAI

Sistema de asistencia para las estancias infantiles (EBDI) del ISSSTE.
Frontend con React Admin y backend con Express + MongoDB, igual que el proyecto de clase.

Equipo: Leonardo Flores, Gonzalo Zamarrón y Patricio Carreras.

```
sirai/
├── backend/    Express + MongoDB + HTTPS + JWT (index.js, cargarDatos.js)
└── frontend/   React Admin + Vite (HTTPS)
```

## Cómo correrlo (Mac)

Necesitas [Homebrew](https://brew.sh), Google Chrome y Node **20.19 o más nuevo** (Vite 7 no arranca con versiones anteriores). Revisa tu versión con `node -v`; si no tienes Node o es más viejo:

```sh
brew install node
```

### 1. Clonar el repositorio (una vez)

El repositorio es privado:

1. Acepta la invitación que te llegó por correo (o entra a https://github.com/pcarrerasb/sirai/invitations).
2. Inicia sesión en GitHub desde la terminal, una sola vez:

```sh
brew install gh
gh auth login
```

`gh auth login` hace cuatro preguntas. Responde:

1. **GitHub.com**
2. **HTTPS**
3. **Yes** (autenticar Git)
4. **Login with a web browser**

Luego clona el repo:

```sh
git clone https://github.com/pcarrerasb/sirai.git
cd sirai
```

Todos los comandos que siguen se corren desde esa carpeta `sirai`.

### 2. Instalar MongoDB y dejarlo corriendo

```sh
brew tap mongodb/brew
brew trust --formula mongodb/brew/mongodb-community
brew trust --formula mongodb/brew/mongodb-database-tools
brew install mongodb-community
brew services start mongodb-community
```

MongoDB queda corriendo como servicio en `mongodb://localhost:27017`, también después de reiniciar la Mac. Si tu versión de Homebrew no tiene `brew trust`, sáltate esas dos líneas.

### 3. Generar tus propios certificados (una vez)

Son autofirmados, solo para `localhost`, y **no van en git**. Desde la raíz del proyecto:

```sh
cd backend
openssl req -x509 -newkey rsa:2048 -nodes -days 365 -keyout backend.key -out backend.crt \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"

cd ../frontend
openssl req -x509 -newkey rsa:2048 -nodes -days 365 -keyout frontend.key -out frontend.crt \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"
cd ..
```

### 4. Copiar los `.env`

```sh
cp backend/.env.ejemplo backend/.env
cp frontend/.env.ejemplo frontend/.env
```

En `backend/.env` cambia `LLAVESECRETA` por una llave larga. Puedes generar una con `openssl rand -hex 32`. El `frontend/.env` se queda como viene.

### 5. Instalar y cargar los datos de ejemplo

```sh
cd backend && npm install && npm run cargar && cd ..
cd frontend && npm install && cd ..
```

`npm run cargar` borra la base de datos `sirai` (también los logs) y vuelve a cargar `frontend/db.inicial.json`. Úsalo cada vez que quieras regresar la demo a su estado original.

### 6. Levantar backend y frontend (dos terminales)

```sh
# Terminal 1 → https://localhost:3000
cd backend && node index.js

# Terminal 2 → https://localhost:5173
cd frontend && npm run dev
```

### 7. Aceptar los certificados en Chrome (una vez) y entrar

1. Entra a **https://localhost:3000**. Chrome dice «La conexión no es privada»: da clic en **Configuración avanzada → Acceder a localhost (no seguro)**. Verás «Cannot GET /», y eso está bien.
2. Haz lo mismo en **https://localhost:5173**. Ahí aparece el login de SIRAI: entra con alguno de los [usuarios de prueba](#usuarios-de-prueba).

Si al iniciar sesión con datos correctos sale «Usuario o contraseña incorrectos», casi siempre es porque falta aceptar el certificado de **:3000**.

### Para traer los cambios de tus compañeros

```sh
git pull
cd backend && npm install && cd ../frontend && npm install && cd ..
```

Los `npm install` solo hacen falta si alguien agregó dependencias. Si cambiaron los datos de ejemplo, corre también `npm run cargar` en `backend`.

## Scripts y dependencias

`package.json` no admite comentarios, así que aquí explicamos qué hay en cada uno.

### `backend/package.json`

Son las mismas dependencias que el backend de clase, menos `body-parser`: Express 5 ya trae `express.json()`.

| Script | Qué hace |
|---|---|
| `npm run cargar` | Corre `cargarDatos.js`, que regresa la demo a su estado original. Borra la base `sirai`, carga `frontend/db.inicial.json` (todo con `eliminado: false`), crea las contraseñas con argon2, los contadores de ids, los índices únicos y los 54 pases cerrados de la demo. |
| `npm test` | No hace nada: lo dejó así `npm init`. Las pruebas las corrimos aparte con `curl` y Playwright. |

El servidor se levanta con `node index.js`. No hay script para eso, igual que en clase.

| Dependencia | Para qué la usamos |
|---|---|
| `express` | El servidor web: define los endpoints (`app.get`, `app.post`…) y lee el JSON de las peticiones. |
| `mongodb` | El driver para hablar con MongoDB: `find`, `insertOne`, `updateOne`, `countDocuments`… |
| `cors` | Deja que el frontend (puerto 5173) le hable al backend (puerto 3000), que es otro origen. |
| `argon2` | Hashea y verifica contraseñas con argon2id (requisito 1 del profesor). |
| `jsonwebtoken` | Firma (`jwt.sign`) y revisa (`jwt.verify`) el token de sesión (requisito 3). |

`https`, `fs` y `crypto` no aparecen en `package.json` porque ya vienen con Node.

### `frontend/package.json`

| Script | Qué hace |
|---|---|
| `npm run dev` | Levanta Vite en https://localhost:5173 con recarga automática. Es el que usamos para trabajar. |
| `npm run build` | Arma la versión final en `dist/`. Sirve para comprobar que todo compila. |
| `npm run serve` | Sirve lo que quedó en `dist/` (vista previa de la versión final). |
| `npm run type-check` | Revisa los tipos de TypeScript sin generar nada (`tsc --noEmit`). |
| `npm run lint` | Revisa el código con ESLint. Ojo: lleva `--fix`, así que también **corrige** lo que pueda. |
| `npm run format` | Le da formato a todo `src/` con Prettier. |

| Dependencia | Para qué la usamos |
|---|---|
| `react`, `react-dom` | La base de la interfaz: componentes y dibujarlos en la página. |
| `react-admin` | El framework de la clase: listas, formularios, menú, login, permisos y notificaciones. |
| `ra-data-json-server` | El dataProvider: convierte lo que pide React Admin en peticiones REST a nuestro backend (`GET /alumnos?_sort=…`). |
| `ra-i18n-polyglot` | Pone los textos de React Admin en español (`i18nProvider.ts` con `mensajesEspañol.ts`). |
| `react-router`, `react-router-dom` | Las rutas de la app (`#/alumnos`, `#/credenciales/1`) y las `CustomRoutes`. |
| `@mui/material`, `@mui/icons-material` | Los componentes visuales (botones, tarjetas, chips, diálogos) y los íconos. React Admin está hecho con MUI. |
| `@emotion/react`, `@emotion/styled` | El motor de estilos que usa MUI por dentro (`sx`). |
| `qrcode.react` | Dibuja el QR de la credencial como SVG. |
| `@yudiel/react-qr-scanner` | Lee el QR con la cámara en el pase de lista. |

Las de desarrollo (`devDependencies`) solo se usan mientras programamos, no llegan al navegador:
- `vite` y `@vitejs/plugin-react` compilan y sirven el frontend;
- `typescript` y los `@types/*` revisan los tipos;
- `eslint` (con sus plugins para React, hooks y TypeScript), `prettier` y `eslint-config-prettier`/`eslint-plugin-prettier` revisan el estilo y el formato;
- `globals` y `@eslint/js` son la configuración base de ESLint.

## Usuarios de prueba

| Usuario | Contraseña | Rol | Qué ve |
|---|---|---|---|
| `docente` | `sirai2026` | Docente (Ana López) | Inicio, Pase de lista, Seguimiento de faltas (solo lectura), Historial de pases, Alumnos, Tutores |
| `enfermeria` | `sirai2026` | Enfermería / Trabajo social (Marta Ruiz) | Inicio, Seguimiento de faltas (llamar, clasificar y dar alta) |
| `admin` | `sirai2026` | Administrador (Sofía Torres) | Tablero, Historial de pases (con corrección), Estancias, Grupos, Alumnos, Tutores |
| `supervisor` | `sirai2026` | Supervisor (Carlos Méndez) | Tablero (solo números), Usuarios, Bitácora, Registrar usuario |

Los otros docentes de los datos de ejemplo (`rhernandez`, `jramirez`, `lsanchez`) también usan `sirai2026`. El supervisor puede crear más usuarios en «Registrar usuario».

### Pantallas por rol

| Pantalla | docente | enfermeria | administrador | supervisor |
|---|---|---|---|---|
| Inicio | Pases de hoy, Alumnos con seguimiento, Mis alumnos | Sin clasificar, Requieren alta, Seguimientos abiertos | Tablero de asistencia | Tablero de asistencia |
| Pase de lista | marcar, escanear, terminar, exportar | — | — | — |
| Seguimiento de faltas | solo alumno y estado | llamar, clasificar, dar alta, nuevo, exportar | — | — |
| Historial de pases | ver y exportar | — | ver, exportar y corregir pases cerrados | — |
| Estancias, Grupos | — | — | ver, crear, editar, eliminar | — |
| Alumnos, Tutores | ver, crear, editar | — | ver, crear, editar, eliminar | — |
| Usuarios | — | — | — | ver (sin contraseña) |
| Registrar usuario | — | — | — | crear cuentas de los 4 roles |
| Bitácora | — | — | — | ver y filtrar (solo lectura) |

La sesión dura 15 minutos (lo que dura el token). Dos minutos antes, SIRAI pregunta si quieres seguir conectado; si no respondes, te regresa al login.

## Seguridad

- **Contraseñas:** se guardan con argon2id en la colección `usuarios`. Nunca se guardan ni se regresan en texto plano.
- **HTTPS:** el backend y el frontend usan certificados autofirmados.
- **Token:** todos los endpoints piden el token en el header `Authentication`; solo `/login` está libre. Sin token o con un token inválido, el backend responde **401** y React Admin te regresa al login.
- **Permisos por rol:** si el rol no tiene permiso, el backend responde **403**. React Admin avisa «No tienes permiso para esta acción» (o el mensaje que mande el backend, como el del candado) y el usuario sigue dentro.
- **Logs:** cada consulta, alta, cambio, borrado, exportación, login e intento sin permiso se guarda en la colección `logs` con `timestamp`, `sujeto`, `rol`, `ip`, `navegador` (user-agent), `accion`, `objeto` y `registro`. Al editar también guarda `antes` y `despues` completos (sin contraseña ni `codigoQR`).
- **Bitácora:** el supervisor ve los logs en la pantalla «Bitácora». El backend solo tiene `GET /logs`; no hay `POST`, `PUT` ni `DELETE` de logs (responden 404), así que nadie la puede editar ni borrar desde SIRAI. Consultarla también queda en el log.
- **Borrado lógico:** «Eliminar» ya no borra. Marca el registro con `eliminado: true`, `fechaEliminado` y `eliminadoPor`; las listas, el detalle y los conteos ya no lo muestran (ver más abajo).

### Permisos

| Recurso | docente | enfermeria | administrador | supervisor |
|---|---|---|---|---|
| estadisticas (`GET /estadisticas`, solo números por estancia) | — | — | leer | leer |
| estancias, grupos | leer | leer | leer, crear, editar, borrar | — |
| alumnos, tutores | leer, crear, editar | leer | leer, crear, editar, borrar | — |
| asistencias (incluye «Marcar a todos presentes») | leer, crear\*, editar\* (solo sus grupos) | — | leer, editar\*\* (cualquier grupo), borrar\* | — |
| asistencias · marcar por QR (`POST /asistencias/qr`) | solo sus grupos\* | — | — | — |
| seguimientos | leer (solo alumno y estado) | leer, crear, editar, ver detalle (llamar, clasificar, dar alta) | — | — |
| pases (pases de lista cerrados) | leer, crear (solo sus grupos) | — | leer, editar, borrar | — |
| credenciales (`GET /credenciales/:id`, el único lugar con `codigoQR`) | leer | — | leer | — |
| usuarios | — | — | leer (sin contraseña) | leer (sin contraseña), crear (`/registrarse`) |
| logs (`GET /logs`, la bitácora) | — | — | — | leer |

\* Solo mientras el pase de ese grupo y fecha no esté cerrado. Si ya se cerró, el backend responde 403 y lo guarda en el log como «acceso denegado: editar pase cerrado», aunque alguien se salte el botón. Además, a un alumno con el candado de «Requiere alta para ingresar» no se le puede poner Presente (403 y log «acceso denegado: presente sin alta»).
\*\* El administrador sí puede corregir un pase cerrado. Queda en el log como «corregir pase cerrado» con antes y después, y los totales del pase se recalculan.

- **«Borrar» siempre es borrado lógico.**
- **Docente y grupos:** el docente solo edita asistencias de sus grupos. Si edita una de otro grupo, el backend responde 403 y deja el log «acceso denegado: editar asistencia de otro grupo».
- **«Ver detalle»:** sin este permiso (el docente), los GET de seguimientos no regresan `notas`, `causa`, `fechaLlamada` ni `fechaRetorno`, y tampoco se puede filtrar ni ordenar por esos campos.
- **Pase cerrado:** no gana ni pierde alumnos. Crear o borrar asistencias en él da 403 a cualquier rol, y el grupo, la fecha y el alumno de una asistencia nunca se cambian (el servidor los toma de la base). Si de verdad hay que reabrirlo, el administrador borra el pase.

- **Supervisor solo con estadísticas:** no lee alumnos, tutores, asistencias, seguimientos, pases ni credenciales (403 y log). Su tablero usa `GET /estadisticas`, que regresa por estancia solo números (inscritos, presentes, marcados, grupos, pases cerrados y seguimientos abiertos), sin ningún nombre de alumno.

El docente lee estancias y grupos aunque no estén en su menú, porque los necesitan los filtros y las columnas de Alumnos y Pase de lista. El administrador lee usuarios para elegir al docente de cada grupo y ver quién cerró cada pase.

### Cerrar el pase de lista e historial

- En **Pase de lista**, «Terminar pase de lista» se habilita cuando ya no queda ningún alumno «Sin marcar». Pide confirmación y guarda un registro en la colección `pases`: grupo, estancia, fecha, quién lo cerró, hora de cierre, presentes, faltas (`ausentes`) y estado «Cerrado». Esos datos los calcula el servidor, no el navegador.
- Al cerrar, **cada falta abre un seguimiento** para Enfermería, o se suma al que el alumno ya tenía abierto (ver «Seguimiento de faltas»).
- Ya cerrado, el docente ve «Pase cerrado a las 09:42» y la incidencia de cada alumno como chip, sin poder cambiarla.
- El docente solo ve sus grupos en el filtro y solo puede cerrar los pases de esos grupos.
- **Historial de pases** (en el menú del docente y del administrador) lista los pases cerrados con filtros por fecha y grupo. Al abrir uno se ven sus alumnos; el administrador puede corregirlos desde ahí.
- En el **tablero** (inicio del administrador y del supervisor), la columna «Pase de lista» dice «Completo» solo cuando todos los grupos de la estancia tienen su pase cerrado ese día.
- `npm run cargar` crea los pases cerrados de los días de demo (22 al 29 de septiembre): 54 pases.

### Las 5 incidencias del pase de lista

Cada alumno tiene una de estas incidencias (además de «Sin marcar» mientras nadie lo marca):

| Incidencia | Valor en la base | ¿Cuenta como asistencia? |
|---|---|---|
| Presente | `presente` | **sí** |
| Ausente justificado | `ausente_justificado` | no (falta) |
| Falta injustificada | `falta_injustificada` | no (falta) |
| Comisión médica | `comision_medica` | no (falta) |
| Filtro sanitario | `filtro_sanitario` | no (falta) |

- **Cómo se elige:** en el pase de lista cada alumno tiene un `<select>` nativo («Incidencia de Lizbeth Peralta»). Es una sola parada de Tab por alumno, el texto siempre se ve y guarda al cambiar. Con el pase cerrado se ve un chip con ícono y texto.
- **«Marcar a todos presentes»:** marca Presente a todos los que siguen «Sin marcar», menos a los que tienen candado. Luego solo hay que cambiar a los que faltaron.
- **% de asistencia** (tablero, resumen e historial): Presente ÷ alumnos ya marcados. Las 4 faltas cuentan en contra; «Sin marcar» no cuenta. Los límites siguen igual: Normal ≥ 90 %, Atención 60–89 %, Crítico < 60 %.

### Seguimiento de faltas y rol Enfermería

- **Automático:** al cerrar el pase, cada alumno con una de las 4 faltas recibe un seguimiento abierto.
  - Si ya tenía uno abierto, la falta se le suma.
  - Las faltas se guardan como fechas (`fechasFalta`), así que el mismo día no cuenta dos veces.
  - Solo hay un seguimiento abierto por alumno (índice único parcial).
- **Enfermería / Trabajo social** (usuario `enfermeria`):
  - llama al tutor («Llamar tutor» guarda la fecha);
  - clasifica el seguimiento con su **causa** y la **fecha probable de retorno**;
  - lo **da de alta** (con confirmación).
- **Causas:**

| Causa | En pantalla | Candado |
|---|---|---|
| `SIN_CLASIFICAR` | Sin clasificar | no |
| `ENF_CASA` | Enfermedad en casa | **sí** |
| `ACC_EXT` | Accidente fuera de la estancia | **sí** |
| `PER_TUT` | Permiso del tutor | no |
| `NO_LOC` | No se localizó al tutor | no |

- **Candado «Requiere alta para ingresar»:**
  - lo calcula el servidor (`requiereAlta`): seguimiento abierto con causa `ENF_CASA` o `ACC_EXT`;
  - mientras exista, en el pase de lista ese alumno no se puede marcar Presente: ni con el select, ni con «Marcar a todos», ni con el QR;
  - el backend responde 403 con el mensaje «… requiere alta de Enfermería para ingresar.» y lo deja en el log;
  - en pantalla, el alumno trae el chip del candado y la opción dice «Presente (requiere alta)».
- **El docente** solo ve qué alumnos tienen seguimiento (alumno y estado). No ve notas ni causa, no llama ni da altas.
- **En la demo**, Joaquín Ramírez Juárez (Maternal A) tiene el candado por varicela.

### Borrado lógico

- `DELETE` marca el registro con `eliminado: true`, `fechaEliminado` y `eliminadoPor`, y lo deja en el log.
- Lo eliminado no sale en listas, conteos ni detalle (responde 404), y no se puede editar ni borrar otra vez.
- Las búsquedas por id (`getMany`) sí lo regresan, para que el historial siga mostrando el nombre de un alumno borrado.
- Los índices únicos de asistencias y pases solo cuentan lo no eliminado, así un pase borrado se puede volver a cerrar.

### Exportar a CSV

- **Dónde:** el botón «Exportar CSV» está en Pase de lista, Historial de pases y Seguimiento de faltas.
- **Qué exporta:** lo que se ve en la lista, con los mismos filtros.
- **Columnas:** en español y con nombres en vez de ids, sin campos internos (`id`, `codigoQR`, `eliminado`, `usuarioId`). El CSV del docente no trae notas ni causa.
- **Excel:** el archivo empieza con BOM para que Excel lea bien los acentos. Si un texto empieza con `=`, `+`, `-` o `@`, se le antepone `'` para que no se ejecute como fórmula.
- **Log:** cada exportación queda como «exportar».

### Credenciales y pase de lista con QR

**La credencial:**
- Cada alumno tiene un `codigoQR`: un código al azar (UUID), que no es su id.
- Los 106 de la demo vienen **fijos** en `frontend/db.inicial.json`, así que las credenciales impresas siguen sirviendo después de cada `npm run cargar`.
- Los alumnos nuevos reciben uno al azar en el servidor.
- El código no se puede editar. Tampoco sale en ninguna lista ni detalle: solo en `GET /credenciales/:id`, para que no se pueda copiar de la red.
- En **Alumnos**, «Ver credencial» abre una tarjeta imprimible del tamaño de una credencial (85.6 × 54 mm): nombre, grupo, estancia y QR.
  - En la lista está en cada renglón cuando la pantalla mide 1200 px o más.
  - En «Editar alumno» está siempre.
- «Imprimir» saca solo la tarjeta.

**Escanear en el pase de lista:**
- Con el pase empezado y sin cerrar aparece «**Escanear credencial**». Abre la cámara de la compu en un diálogo (el permiso se pide hasta ese momento).
- Para escanear, muestra la credencial (impresa o en otra pantalla) a la cámara de la compu.
- Cada credencial leída deja al alumno en Presente (`POST /asistencias/qr`, con log «marcar por QR») y se anuncia, por ejemplo «Lizbeth Peralta: Presente». Solo cambia a quien estaba «Sin marcar» o en «Falta injustificada» (llegó tarde); si tiene otra incidencia, como Filtro sanitario, avisa y no la cambia. Con candado, avisa que requiere alta.
- El escáner sigue abierto para el siguiente alumno.
- Si el código no existe, es de otro grupo, el pase ya se cerró o el alumno ya estaba presente, lo dice con un mensaje claro.
- **El select de incidencia sigue en cada renglón:** el escaneo es un atajo. Si niegan la cámara, el mensaje lo recuerda.

**Librerías:**
- `qrcode.react` dibuja el QR.
- `@yudiel/react-qr-scanner` lo lee. Su lector en WebAssembly (`zxing_reader.wasm`) lo sirve nuestro Vite, no un CDN, así que funciona sin internet.

Para ver los logs y las contraseñas en Mongo:

```sh
mongosh sirai --eval 'db.logs.find().sort({timestamp:-1}).limit(10)'
mongosh sirai --eval 'db.usuarios.find({}, {usuario:1, password:1})'
```

## Datos de ejemplo

- Los datos de demo son del 22 al 29 de septiembre de 2026. En el tablero, elige la fecha **29/09/2026** para ver Coyoacán en Normal (96 %), Iztapalapa en Atención (74 %) y Tláhuac en Crítico (43 %).
- Las faltas de la demo están repartidas en las 4 incidencias. Hay 6 seguimientos: 5 abiertos y 1 dado de alta. Uno de los abiertos tiene el candado.
- Todos los nombres, teléfonos y correos son ficticios.

## Accesibilidad (WCAG 2.2 AA)

Auditada con Lighthouse, IBM Equal Access, axe-core y revisión manual (teclado, lector de pantalla, zoom y reflow, espaciado de texto). Los reportes están en `sirai-evidencias/accesibilidad/antes` y `.../despues`.

Lo que hace SIRAI para cumplir:

- **Títulos y encabezados:** cada pantalla tiene su título de pestaña («Alumnos · SIRAI») y un solo `h1`. El título de la barra de arriba es texto, no encabezado.
- **Teclado:** todo se puede hacer sin mouse; el foco siempre se ve; «Ir al contenido» aparece con el primer Tab. Los diálogos atrapan el foco, se cierran con Escape y regresan el foco al botón que los abrió; mientras están abiertos, el fondo queda `inert`.
- **Avisos:**
  - guardados, errores, 403 y «Pase de lista cerrado» se anuncian (`role="alert"`);
  - el número de resultados de cada lista y «Faltan N alumnos por marcar» también (`role="status"`).
- **Formularios:** cada error aparece junto a su campo y dice cómo corregirlo.
- **Sesión:** 2 minutos antes de que venza aparece «Tu sesión está por terminar» con «Seguir conectado», que renueva el token con `POST /renovar` (queda en el log).
- **Pantallas chicas y zoom:** sin desplazamiento horizontal a 320 px ni con zoom de 200 %. Las listas anchas se vuelven listas simples debajo de 900 px (Alumnos, que tiene 7 columnas, debajo de 1200 px) y las tarjetas del tablero van a una columna.
- **QR:**
  - el código lleva una etiqueta accesible («Código QR de la credencial de Lizbeth Peralta»);
  - el escáner es un diálogo con fondo `inert`, botón «Cerrar» y Escape;
  - cada lectura se anuncia (`role="status"`);
  - el select de incidencia sigue siendo la alternativa sin cámara.
- **Botones con texto:** «Nuevo alumno», «Nuevo seguimiento», «Exportar CSV», etc. en todas las pantallas. Ya no hay «+» flotante ni «Agregar filtro».
- **Incidencias y candado:** un `<select>` nativo por alumno con nombre accesible («Incidencia de …»); el chip del candado lleva ícono y texto, y la ayuda de por qué Presente está deshabilitado se conecta con `aria-describedby`. El foco no se pierde al guardar.
- **Listas desplegables nativas:** filtros, formularios y «Filas por página» usan `<select>` del navegador (`SelectNativo` en `comunes.tsx` y `MuiTablePagination` en el tema).
  - Así cada etiqueta queda conectada a su control y no hay `input` escondidos sin etiqueta (hallazgos de WAVE).
- **«Ir al contenido»:** blanco sobre guinda (9.29:1) también mientras está escondido. Antes era blanco sobre gris claro (1.04:1).
- **Errores del login:** cada error dice lo que pasó (WCAG 3.3.1):
  - usuario o contraseña mal → «Usuario o contraseña incorrectos»;
  - backend apagado o certificado sin aceptar → «No se pudo conectar con el servidor…».
- **Idioma:** `lang="es"`; la paginación y el resto de los nombres están en español (locale `esES` de MUI).
- **Movimiento:** si el sistema pide menos movimiento (`prefers-reduced-motion`), se apagan las animaciones.

### Lo que no se puede arreglar sin salirse de React Admin

| Qué | Por qué |
|---|---|
| IBM marca «Ir al contenido» fuera de un landmark (1 aviso por pantalla) | El `Layout` de React Admin lo dibuja antes del encabezado. WCAG no lo exige; es una regla de IBM. |
| Menú (☰), Actualizar (↻) y las flechas de paginación son solo ícono | Tienen nombre en español y el menú y Actualizar tienen tooltip. Para darles texto visible habría que rehacer la barra de React Admin. |
| «Mostrar contraseña» del login sin tooltip | Es parte del formulario de login de React Admin; tiene nombre en español. |
| En el diálogo de confirmación, IBM marca los dos «centinelas» de foco de MUI | MUI los necesita para atrapar el foco. |
| El título de la barra se corta con «…» en pantallas chicas | Es el estilo de React Admin; el texto completo está en el `h1` de la pantalla. |

### WAVE (paso manual)

WAVE no se puede correr automático sin su API de pago:

1. Instala la extensión **«WAVE Evaluation Tool»** en Chrome.
2. Entra a SIRAI.
3. En cada pantalla da clic en el ícono de WAVE y anota el **AIM Score**, Errors, Contrast Errors y Alerts del panel Summary.
