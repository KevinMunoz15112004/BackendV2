# Documentación técnica del backend - PoliRed

Esta documentación describe la arquitectura, estructura, componentes clave y funcionamiento interno del backend de PoliRed. Explica decisiones de diseño, flujo de datos, dependencias y aspectos operativos.

## Resumen ejecutivo

PoliRed es un backend en Node.js (ECMAScript Modules) que expone una API REST organizada en controladores y routers, usa MongoDB (Mongoose) como base de datos, integra servicios externos (Cloudinary para media, Pusher para eventos en tiempo real y Nodemailer para correos) y aplica autenticación basada en JWT. Está preparado para desplegarse en entornos serverless (Vercel).

## Estructura del proyecto (relevante)

- **package.json**: scripts y dependencias principales. Ver [package.json](package.json)
- **src/index.js**: handler de entrada. Se asegura de la conexión con la base de datos antes de delegar en la app express. Ver [src/index.js](src/index.js)
- **src/server.js**: configuración de Express, middlewares globales y montaje de rutas. Ver [src/server.js](src/server.js)
- **src/database.js**: conexión a MongoDB usando Mongoose. Ver [src/database.js](src/database.js)
- **src/routers/**: definición de rutas agrupadas por dominio (auth, estudiantes, social, mensajes, admin, superadmin). Ej: [src/routers/socialRoutes.js](src/routers/socialRoutes.js)
- **src/controllers/**: lógica por caso de uso. Ej: [src/controllers/socialController.js](src/controllers/socialController.js)
- **src/models/**: esquemas Mongoose (Estudiantes, Publicaciones, Comentarios, RedComunitaria, etc.). Ej: [src/models/Estudiantes.js](src/models/Estudiantes.js)
- **src/config/**: integraciones con servicios externos (Cloudinary, Nodemailer, Pusher). Ej: [src/config/nodemailer.js](src/config/nodemailer.js), [src/config/pusher.js](src/config/pusher.js)
- **src/middlewares/**: autenticación, autorización, validaciones y verificaciones de perfil.
- **src/helpers/** y **src/services/**: utilidades y lógica reutilizable (resolución de posts, notificaciones, media management).

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

La aplicación está basada en variables de entorno. Las más importantes encontradas en el código:

- `MONGODB_URI_LOCAL` — URI de conexión a MongoDB. (src/database.js)
- `JWT_SECRET` — secreto para firmar/verificar tokens JWT. (authController, middlewares)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — para Cloudinary (src/server.js)
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` — para Pusher (src/config/pusher.js)
- `USER_MAILTRAP`, `PASS_MAILTRAP`, `FRONTEND_URL`, `LOGO_URL` — para Nodemailer/plantillas (src/config/nodemailer.js)
- `PORT` — puerto por defecto (src/local.js, server.js)

Recomiendo mantener un `.env.example` con estas claves (no incluir secretos reales en el repo).

## Modelos y diseño de datos (resumen)

Se usa Mongoose con esquemas que modelan usuarios, publicaciones, comentarios, redes comunitarias, notificaciones, mensajes y roles.

- `Estudiante` (`src/models/Estudiantes.js`): campos relevantes: `nombre`, `apellido`, `username`, `email`, `password`, `roles` (ej. `estudiante`, `admin_red`), `perfilCompleto`, `publicacionesGuardadas`, `redComunitaria`. Métodos de instancia: `encrypPassword`, `matchPassword`, `crearToken`, y hooks `pre('save')` para normalizar email.
- `Publicacion` / `Articulo` (en `src/models/`): contienen arrays de `likes`, contadores `likesCount`, `commentsCount`, referencias a `autorId` y `comunidadId`.
- `Comentario` mantiene `parentId` para construir árboles de respuestas (estructura de hilos).
- `Notificacion` agrupa emisores para evitar spam (agrega emisores en eventos recurrentes de tipo `like` y mantiene `totalEmisores`).

Decisiones de diseño destacadas:

- Uso de arrays de ObjectId con operaciones atómicas MongoDB (`$addToSet`, `$inc`, `$pull`) para consistencia y evitar condiciones de carrera.
- Normalización de emails y validaciones de schema para mantener integridad.

## Rutas y controladores (visión general)

Las rutas se agrupan bajo el prefijo `/api` (configurado en `src/server.js`) y se dividen por responsabilidad:

- Autenticación: `src/routers/authRoutes.js` -> login, registro, recuperación.
- Estudiantes: `src/routers/estudiantesRoutes.js` -> perfil, modificaciones.
- Social: `src/routers/socialRoutes.js` -> likes, comentarios, guardados, reportes, notificaciones. (ver [src/routers/socialRoutes.js](src/routers/socialRoutes.js) y [src/controllers/socialController.js](src/controllers/socialController.js))
- Mensajes y conversaciones: `src/routers/mensajesRoutes.js`.
- Admin / SuperAdmin: endpoints para gestión y aprobación de redes.

 Ejemplos importantes:

- POST `/api/redes/solicitar-creacion` — crea una solicitud de red comunitaria (controlada por `socialController.solicitarCreacionRed`).
- POST `/api/publicaciones/:id/like` — añade un like (operación atómica `$addToSet` + `$inc`) y genera notificación con agregación de emisores para reducir ruido.
- POST `/api/publicaciones/:id/comentarios` — crea comentario y actualiza `commentsCount` de forma atómica.

## Autenticación y autorización

- JWT: emisión y verificación mediante `jsonwebtoken` y la variable `JWT_SECRET`.
- Middlewares:
  - `verifyToken` — valida token y añade `req.user`.
  - `requireRole('admin_red')` — control de acceso por roles.
  - `requirePerfilCompleto` — ciertos endpoints requieren perfil completo.

 Nota: el middleware centraliza la verificación y permite aplicar políticas por ruta, mejorando trazabilidad y seguridad.

## Notificaciones en tiempo real y correos

- Notificaciones internas: modelo `Notificacion`, lógica en `helpers/notificaciones.js` y creación desde controladores.
- Eventos en tiempo real: `src/config/pusher.js` expone `triggerUserChannel(userId, event, payload)` para emitir eventos a canales privados `private-user-{userId}`.
- Emails: `src/config/nodemailer.js` centraliza plantillas HTML y funciones de envío (`sendMailToRecoveryPassword`, `sendMailRedAprobada`, etc.).

Integración combinada: acciones que generan notificaciones (likes, comentarios, aprobaciones) disparan tanto registros en BD como eventos Pusher y correos cuando aplica.

## Gestión de media

- Cloudinary está configurado en `src/server.js` mediante variables `CLOUDINARY_*`.
- `express-fileupload` se usa para recibir archivos; los servicios en `src/services` encapsulan subida y manipulación.

## Validaciones y sanitización

- `express-validator` + conjunto de validadores en `src/validators` garantizan sanidad de los inputs (ej.: `mongoIdParam`, `trimAndNotEmpty`, validadores de reportes).
- `validateResult` centraliza el manejo de errores de validación.

## Consideraciones de concurrencia y diseño escalable

- Uso de operaciones atómicas de MongoDB para evitar races (`$addToSet`, `$inc`, `$pull`).
- Notificaciones agrupadas (notificación madre para likes) reduce I/O y spam de notificaciones.
- Pusher externa permite escalar reparto de eventos sin mantener WebSocket state en el servidor.

## Seguridad y buenas prácticas

- Guardar `JWT_SECRET`, credenciales de DB, credenciales de Pusher/Nodemailer en variables de entorno.
- No loguear información sensible en producción.
- Validar y sanitizar todo input (ya implementado con `express-validator`).
- Usar HTTPS en despliegue y forzar cabeceras CORS y políticas apropiadas.

## Despliegue y ejecución local

Comandos útiles (desde la raíz):

```
npm install
npm run dev        # modo desarrollo (observa cambios con node --watch src/local.js)
npm start          # arrancar con node src/index.js (útil en entornos tradicionales)
```

Notas:
 Para despliegue en Vercel u otro serverless, `src/index.js` actúa como handler y la primera invocación realiza la conexión a MongoDB.

## Archivos clave (para lectura rápida)

- [package.json](package.json)
- [src/index.js](src/index.js)
- [src/server.js](src/server.js)
- [src/database.js](src/database.js)
- [src/routers/socialRoutes.js](src/routers/socialRoutes.js)
- [src/controllers/socialController.js](src/controllers/socialController.js)
- [src/models/Estudiantes.js](src/models/Estudiantes.js)
- [src/config/nodemailer.js](src/config/nodemailer.js)
- [src/config/pusher.js](src/config/pusher.js)

---
