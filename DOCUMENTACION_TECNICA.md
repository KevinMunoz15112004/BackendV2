# Documentación técnica del backend - PoliRed

Esta documentación describe la arquitectura, estructura, componentes clave y funcionamiento interno del backend de PoliRed. Explica decisiones de diseño, flujo de datos, dependencias y aspectos operativos.

## Resumen principal

PoliRed es un backend en Node.js (ES Modules) que expone una API REST organizada por controladores y routers. Usa MongoDB (Mongoose) como datastore, integra servicios externos (Cloudinary para media, Pusher para eventos en tiempo real y Nodemailer para correos) y aplica autenticación basada en JWT. Está preparado para desplegarse en entornos tradicionales y serverless (ej. Vercel), siguiendo el patrón de un `handler` que garantiza la conexión a la base de datos antes de atender peticiones.

## Estructura del proyecto

A continuación se puede visualizar la estructura completa del backend:

```
PoliRed/
├─ package.json
├─ README.md
├─ Documentacion Tecnica.md
├─ vercel.json
└─ src/
  ├─ index.js
  ├─ server.js
  ├─ database.js
  ├─ config/
  │  ├─ nodemailer.js
  │  ├─ pusher.js
  │  └─ cloudinary.js
  ├─ controllers/
  │  ├─ adminRedController.js
  │  ├─ authController.js
  │  ├─ estudiantesController.js
  │  ├─ mensajesController.js
  │  ├─ reportesSolicitudesController.js
  │  ├─ socialController.js
  │  └─ SuperAdminController.js
  ├─ models/
  │  ├─ adminRedes.js
  │  ├─ Articulos.js
  │  ├─ Comentarios.js
  │  ├─ Conversaciones.js
  │  ├─ Estudiantes.js
  │  ├─ Mensajes.js
  │  ├─ Notificaciones.js
  │  ├─ Publicaciones.js
  │  ├─ RedComunitaria.js
  │  ├─ Reportes.js
  │  ├─ Solicitudes.js
  │  └─ SuperAdmin.js
  ├─ routers/
  │  ├─ adminRedRoutes.js
  │  ├─ authRoutes.js
  │  ├─ estudiantesRoutes.js
  │  ├─ mensajesRoutes.js
  │  ├─ socialRoutes.js
  │  └─ superAdminRoutes.js
  ├─ middlewares/
  │  ├─ auth.js
  │  ├─ authSuperAdmin.js
  │  ├─ checkPerfilCompleto.js
  ├─ helpers/
  │  ├─ globalRed.js
  │  ├─ notificaciones.js
  │  └─ postResolver.js
  ├─ services/
  │  ├─ cloudinaryService.js
  │  ├─ mediaService.js
  │  └─ profileService.js
  ├─ validators/
  │  ├─ authValidators.js
  │  ├─ commonValidators.js
  │  ├─ contentValidators.js
  │  ├─ index.js
  │  ├─ mongoValidators.js
  │  ├─ redValidators.js
  │  ├─ reportValidators.js
  │  ├─ stringValidators.js
  │  └─ validateResult.js
  └─ tests/
```

Información relevante:

- **package.json**: scripts y dependencias principales. Ver [package.json](package.json)
- **src/index.js**: handler de entrada. Se asegura de la conexión con la base de datos antes de delegar en la app express. Ver [src/index.js](src/index.js)
- **src/server.js**: configuración de Express, middlewares globales y montaje de rutas. Ver [server.js](src/server.js)
- **src/database.js**: conexión a MongoDB usando Mongoose. Ver [database.js](src/database.js)
- **src/routers/**: definición de rutas agrupadas por dominio (auth, estudiantes, social, mensajes, admin, superadmin). Ej: [socialRoutes.js](src/routers/socialRoutes.js)
- **src/controllers/**: lógica por caso de uso. Ej: [socialController.js](src/controllers/socialController.js)
- **src/models/**: esquemas Mongoose (Estudiantes, Publicaciones, Comentarios, RedComunitaria, etc.). Ej: [Estudiantes.js](src/models/Estudiantes.js)
- **src/config/**: integraciones con servicios externos (Cloudinary, Nodemailer, Pusher). Ej: [nodemailer.js](src/config/nodemailer.js), [pusher.js](src/config/pusher.js)
- **src/middlewares/**: autenticación, autorización, validaciones y verificaciones de perfil.
- **src/helpers/** y **src/services/**: utilidades y lógica reutilizable (resolución de posts, notificaciones, media management).

A continuación se presenta una vista más completa de la estructura de archivos y carpetas que componen el backend.

## Flujo de arranque

1. El entry point usado en despliegue serverless es `src/index.js`, que exporta una función `handler(req, res)`.
2. En la primera invocación llama a `src/database.js` para conectar Mongoose a `process.env.MONGODB_URI_LOCAL`.
3. `src/server.js` exporta la aplicación Express configurada (middlewares, Cloudinary, rutas). `index.js` delega todas las peticiones a esa app.

Este patrón (handler que garantiza conexión DB) es idóneo para entornos serverless ya que evita reconexiones innecesarias.

## Dependencias principales

- `express` (v5): servidor HTTP y manejo de rutas.
- `mongoose`: ODM para MongoDB.
- `jsonwebtoken`: JWT para autenticación.
- `bcryptjs`: hashing de contraseñas.
- `cloudinary`: gestión de media.
- `pusher`: notificaciones en tiempo real (websockets/pubsub).
- `nodemailer`: envío de correos.
- `express-validator`: validación de input.

Ver lista completa en [package.json](package.json).

## Variables de entorno esenciales

La aplicación está basada en variables de entorno:

- `MONGODB_URI_LOCAL` — URI de conexión a MongoDB. (src/database.js)
- `JWT_SECRET` — secreto para firmar/verificar tokens JWT. (authController, middlewares)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — para Cloudinary (src/server.js)
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` — para Pusher (src/config/pusher.js)
- `USER_MAILTRAP`, `PASS_MAILTRAP`, `FRONTEND_URL`, `LOGO_URL` — para Nodemailer/plantillas (src/config/nodemailer.js)
- `PORT` — puerto por defecto (src/local.js, server.js)

## Modelos y diseño de datos (resumen)

Se usa Mongoose con esquemas que modelan usuarios, publicaciones, comentarios, redes comunitarias, notificaciones, mensajes y roles.

- `Estudiante` (`src/models/Estudiantes.js`): campos relevantes: `nombre`, `apellido`, `username`, `email`, `password`, `roles` (ej. `estudiante`, `admin_red`), `perfilCompleto`, `publicacionesGuardadas`, `redComunitaria`. Métodos de instancia: `encrypPassword`, `matchPassword`, `crearToken`, y hooks `pre('save')` para normalizar email.
- `Publicacion` / `Articulo` (en `src/models/`): contienen arrays de `likes`, contadores `likesCount`, `commentsCount`, referencias a `autorId` y `comunidadId`.
- `Comentario` mantiene `parentId` para construir árboles de respuestas (estructura de hilos).
- `Notificacion` agrupa emisores para evitar spam (agrega emisores en eventos recurrentes de tipo `like` y mantiene `totalEmisores`).

Decisiones de diseño destacadas:

- Uso de arrays de ObjectId con operaciones atómicas MongoDB (`$addToSet`, `$inc`, `$pull`) para consistencia y evitar condiciones de carrera.
- Normalización de emails y validaciones de schema para mantener integridad.

Modelos relevantes:

- `Estudiantes` (`src/models/Estudiantes.js`): usuario principal. Campos: `nombre`, `apellido`, `username`, `email`, `password`, `roles`, `perfilCompleto`, `publicacionesGuardadas`, `redComunitaria`, `avatar`, `bio`. Métodos: `encryptPassword`, `matchPassword`, `crearToken`. Hooks: `pre('save')` (normalización/email).
- `Publicaciones` / `Articulos` (`src/models/Publicaciones.js` o `Articulos.js`): campos: `titulo`, `contenido`, `media`, `autorId`, `comunidadId`, `likes` (array de ObjectId), `likesCount`, `commentsCount`, `createdAt`.
- `Comentarios` (`src/models/Comentarios.js`): soporta `parentId` para hilos, referencia a `autorId` y `publicacionId`.
- `Conversaciones` y `Mensajes` (`src/models/Conversaciones.js`, `src/models/Mensajes.js`): estructura de chats entre usuarios, índices por participantes, mensajes con marcadores de leído.
- `Notificaciones` (`src/models/Notificaciones.js`): registro por usuario receptor, puede agrupar emisores para eventos repetitivos (p. ej. likes múltiples).
- `RedComunitaria`, `Solicitudes`, `Reportes`, `AdminRedes`, `SuperAdmin` — modelos para gestión de comunidades, solicitudes y roles administrativos.

Relaciones y patrones:

- Referencias entre documentos (ObjectId) para autor / comunidad / conversacion.
- Campos contadores (`likesCount`, `commentsCount`) actualizados de forma atómica con `$inc` para rendimiento.
- Uso de `$addToSet` para evitar duplicados en arrays (likes, guardados).

## Rutas y controladores (visión general)

Las rutas se agrupan bajo el prefijo `/api` (configurado en [server.js](src/server.js)) y se dividen por responsabilidad:

- Autenticación: `src/routers/authRoutes.js` -> login, registro, recuperación.
- Estudiantes: `src/routers/estudiantesRoutes.js` -> perfil, modificaciones.
- Social: `src/routers/socialRoutes.js` -> likes, comentarios, guardados, reportes, notificaciones. (ver [socialRoutes.js](src/routers/socialRoutes.js) y [socialController.js](src/controllers/socialController.js))
- Mensajes y conversaciones: ver en [mensajesRoutes.js](src/routers/mensajesRoutes.js).
- Admin / SuperAdmin: endpoints para gestión y aprobación de redes.

 Ejemplos importantes:

- POST `/api/redes/solicitar-creacion` — crea una solicitud de red comunitaria (controlada por `socialController.solicitarCreacionRed`).
- POST `/api/publicaciones/:id/like` — añade un like (operación atómica `$addToSet` + `$inc`) y genera notificación con agregación de emisores para reducir ruido.
- POST `/api/publicaciones/:id/comentarios` — crea comentario y actualiza `commentsCount` de forma atómica.

Convenciones de API

- Autenticación: Bearer JWT en `Authorization: Bearer <token>`.
- Respuestas: estructura JSON consistente (ver en los controladores para formato exacto).

Endpoints importantes (resumen):

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`
- Estudiantes: `GET /api/estudiantes/me`, `PUT /api/estudiantes/:id` (perfil)
- Social/Publicaciones: `GET /api/publicaciones`, `POST /api/publicaciones`, `POST /api/publicaciones/:id/like`, `POST /api/publicaciones/:id/comentarios`, `POST /api/publicaciones/:id/reportar`
- Redes: `POST /api/redes/solicitar-creacion`, `GET /api/redes`, administracion en rutas de admin/superadmin
- Mensajes: `POST /api/conversaciones`, `GET /api/conversaciones/:id`, `POST /api/mensajes`

Consultar la colección Postman (URL en README) para la lista completa y ejemplos.

## Autenticación y autorización

- JWT: emisión y verificación mediante `jsonwebtoken` y la variable `JWT_SECRET`.
- Middlewares:
  - `verifyToken` — valida token y añade `req.user`.
  - `requireRole('admin_red')` — control de acceso por roles.
  - `requirePerfilCompleto` — ciertos endpoints requieren perfil completo.

 Nota: el middleware centraliza la verificación y permite aplicar políticas por ruta, mejorando trazabilidad y seguridad.

  Detalles de seguridad

  - JWT: tokens firmados con `JWT_SECRET`. Los middleware (`verifyToken`) verifican el token y añaden `req.user`.
  - Contraseñas: almacenadas con hashing `bcryptjs` (sal + hash) y comparadas con `matchPassword`.
  - Roles: control de acceso por rol (`admin_red`, `superadmin`, etc.) implementado en middlewares de autorización.
  - Validación de entrada: `express-validator` evita inyecciones y entrada inválida; `validateResult` estandariza errores.
  - CORS: gestionado en `server.js` para permitir llamadas desde frontend autorizado (variable `FRONTEND_URL`).

## Notificaciones en tiempo real y correos

- Notificaciones internas: modelo `Notificacion`, lógica en `helpers/notificaciones.js` y creación desde controladores.
- Eventos en tiempo real: `src/config/pusher.js` expone `triggerUserChannel(userId, event, payload)` para emitir eventos a canales privados `private-user-{userId}`.
- Emails: [nodemailer.js](src/config/nodemailer.js) centraliza plantillas HTML y funciones de envío (`sendMailToRecoveryPassword`, `sendMailRedAprobada`, etc.).

Integración combinada: acciones que generan notificaciones (likes, comentarios, aprobaciones) disparan tanto registros en BD como eventos Pusher y correos cuando aplica.

## Gestión de media

- Cloudinary está configurado en `src/server.js` mediante variables `CLOUDINARY_*`.
- `express-fileupload` se usa para recibir archivos; los servicios en `src/services` encapsulan subida y manipulación.

## Validaciones

- `express-validator` + conjunto de validadores en `src/validators` garantizan sanidad de los inputs (ej.: `mongoIdParam`, `trimAndNotEmpty`, validadores de reportes).
- `validateResult` centraliza el manejo de errores de validación.

## Consideraciones de concurrencia y diseño escalable

- Uso de operaciones atómicas de MongoDB para evitar races (`$addToSet`, `$inc`, `$pull`).
- Notificaciones agrupadas (notificación madre para likes) reduce I/O y spam de notificaciones.
- Pusher permite escalar reparto de eventos sin mantener WebSocket state en el servidor.

## Despliegue y ejecución local

Comandos útiles (desde la raíz):

```
npm install
npm run dev        # modo desarrollo (observa cambios con node --watch src/local.js)
npm start          # arrancar con node src/index.js (útil en entornos serveless)
```

Notas de despliegue

- Handler serverless: `src/index.js` está diseñado para entornos serverless (Vercel, etc.). En la primera invocación garantiza la conexión a Mongoose y reutiliza la conexión en llamadas subsecuentes.

## Resumen de archivos clave para dar lectura breve

- [package.json](package.json)
- [index.js](src/index.js)
- [server.js](src/server.js)
- [database.js](src/database.js)
- [socialRoutes.js](src/routers/socialRoutes.js)
- [socialController.js](src/controllers/socialController.js)
- [Estudiantes.js](src/models/Estudiantes.js)
- [nodemailer.js](src/config/nodemailer.js)
- [pusher.js](src/config/pusher.js)

