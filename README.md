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
| `supervisor` | `sirai2026` | Supervisor (Carlos Méndez) | Tablero, Seguimiento de faltas, Historial de pases, Estancias, Grupos, Alumnos, Tutores, Registrar usuario |

Los otros docentes de los datos de ejemplo (`rhernandez`, `jramirez`, `lsanchez`) también usan `sirai2026`. El supervisor puede crear más usuarios en «Registrar usuario».

La sesión dura 15 minutos (lo que dura el token). Dos minutos antes, SIRAI pregunta si quieres seguir conectado; si no respondes, te regresa al login.

