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
  │  ├─ apelacionController.js
  │  ├─ authController.js
  │  ├─ estudiantesController.js
  │  ├─ mensajesController.js
  │  ├─ reportesSolicitudesController.js
  │  ├─ socialController.js
  │  └─ SuperAdminController.js
  ├─ models/
  │  ├─ adminRedes.js
  │  ├─ Apelaciones.js
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
  │  ├─ apelacionRoutes.js
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
  │  ├─ postResolver.js
  │  └─ reportHelpers.js
  ├─ services/
  │  ├─ cloudinaryService.js
  │  ├─ mediaService.js
  │  ├─ profileService.js
  │  ├─ redService.js
  │  └─ reportesService.js
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
  ├─ tests/
  │  ├─ e2e/
  │  │  ├─ 01_auth.test.js
  │  │  ├─ 02_estudiantes.test.js
  │  │  ├─ 03_redesComunitarias.test.js
  │  │  ├─ 04_social.test.js
  │  │  └─ 05_moderacion.test.js
  │  ├─ helpers/
  │  │  ├─ authHelpers.js
  │  │  ├─ seeders.js
  │  │  ├─ setupDB.js
  │  │  └─ setupMocks.js  
  │  ├─ unit/
  │  │  ├─ middlewares.test.js
  │  │  └─ validators.test.js  

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


## Estrategia de pruebas

El backend cuenta con dos niveles de prueba automatizada, ejecutables desde la raíz del proyecto:

| Comando | Alcance | Ubicación |
|---------|---------|-----------|
| `npm run test:e2e` | Flujos HTTP completos con Supertest y MongoDB de prueba | `src/tests/e2e/` |
| `npm run test:unit` | Validadores y middlewares aislados, sin levantar la app | `src/tests/unit/` |

Los mocks de servicios externos (Nodemailer, Pusher, Cloudinary) viven en `src/tests/helpers/setupMocks.js` y se cargan automáticamente vía Jest para evitar efectos secundarios en red durante las pruebas.

---

### Pruebas E2E — rutas cubiertas

Las pruebas E2E validan **flujos de negocio completos**: autenticación, persistencia en MongoDB, encadenamiento de middlewares y respuestas HTTP reales. Se eligieron rutas representativas de cada dominio funcional, priorizando los caminos críticos y los casos de error más frecuentes (401, 403, 404, 409).

#### 1. Autenticación (`01_auth.test.js`)

| Método | Ruta | Motivo de elección |
|--------|------|--------------------|
| `POST` | `/api/login` | Login del SuperAdmin; punto de entrada del panel administrativo global. Cubre credenciales válidas, usuario inexistente, contraseña incorrecta y email no confirmado. |
| `POST` | `/api/auth/login` | Login de estudiantes; flujo principal de la app móvil. Cubre éxito, errores de credenciales, cuenta suspendida, email sin confirmar y acceso al panel admin sin rol `admin_red`. |

**Por qué es correcta esta selección:** la autenticación es prerrequisito de casi todos los demás flujos. Probar ambos endpoints de login garantiza que los tokens JWT emitidos en E2E posteriores (redes, social, moderación) se generan con la misma lógica que usa producción.

#### 2. Estudiantes y perfil (`02_estudiantes.test.js`)

| Método | Ruta | Motivo de elección |
|--------|------|--------------------|
| `POST` | `/api/registro-estudiantes` | Alta de nuevos usuarios; valida reglas de negocio (email duplicado, email reservado al superadmin, campos requeridos). |
| `GET` | `/api/confirmar/:token` | Confirmación de cuenta por correo; verifica generación y consumo del token en BD. |
| `PATCH` | `/api/completar/perfil` | Completar perfil obligatorio antes de acciones sociales; cubre username duplicado, longitud mínima y perfil ya completado. |
| `GET` | `/api/perfil-estudiante` | Lectura del perfil autenticado; confirma que campos sensibles (`password`, `token`) no se exponen. |

**Por qué es correcta esta selección:** el ciclo registro → confirmación → completar perfil es la puerta de entrada al resto de funcionalidades. Muchas rutas sociales exigen `requirePerfilCompleto`; sin probar este flujo, los E2E de publicaciones y reportes serían incompletos.

#### 3. Redes comunitarias (`03_redesComunitarias.test.js`)

| Método | Ruta | Motivo de elección |
|--------|------|--------------------|
| `POST` | `/api/redes/solicitar-creacion` | Solicitud de creación de red por un estudiante; estados `pendiente`, conflictos de nombre y solicitudes duplicadas. |
| `PATCH` | `/api/superadmin/redes/:redId/aprobacion` | Aprobación o rechazo por SuperAdmin; transición de estado, asignación de rol `admin_red` y control de acceso por rol. |

**Por qué es correcta esta selección:** las redes comunitarias son el contenedor de publicaciones, miembros y moderación. Este par de rutas modela el ciclo completo solicitud → revisión → activación, que es reutilizado como setup en los tests sociales y de moderación.

#### 4. Interacción social (`04_social.test.js`)

| Método | Ruta | Motivo de elección |
|--------|------|--------------------|
| `POST` | `/api/estudiantes/unirse/red` | Membresía en red; sincroniza `Estudiante.redComunitaria` y `RedComunitaria.miembros`. |
| `POST` | `/api/estudiantes/publicaciones` | Creación de contenido dentro de una red; requiere pertenencia previa. |
| `POST` | `/api/publicaciones/:id/like` | Like atómico; genera notificaciones. |
| `DELETE` | `/api/publicaciones/:id/like` | Retirada de like; valida idempotencia y estado 409. |
| `POST` | `/api/publicaciones/:id/comentarios` | Comentarios con populate del autor. |
| `GET` | `/api/notificaciones` | Listado de notificaciones disparadas por likes. |
| `DELETE` | `/api/publicaciones/eliminar/:id` | Eliminación por autor; control de permisos entre miembros. |

**Por qué es correcta esta selección:** cubre el núcleo social de PoliRed (publicar, reaccionar, comentar, notificar y eliminar) sin repetir cada variante de feed. Las rutas elegidas ejercitan operaciones atómicas en MongoDB y la integración con Pusher (mockeado).

#### 5. Moderación (`05_moderacion.test.js`)

| Método | Ruta | Motivo de elección |
|--------|------|--------------------|
| `POST` | `/api/reportes/publicacion` | Creación de reportes sobre publicaciones; valida tipos permitidos y existencia del recurso. |
| `PATCH` | `/api/admin/reportes/:id/resolver` | Resolución por `admin_red`: rechazar reporte, resolver con eliminación y strike, estados inválidos y permisos. |

**Por qué es correcta esta selección:** la moderación cierra el ciclo de contenido reportado. Estas rutas verifican la cadena reporte → decisión administrativa → consecuencias (publicación eliminada, strike al autor), que es crítica para la gobernanza de la plataforma.

---

### Pruebas unitarias — módulos cubiertos

Las pruebas unitarias se concentran en **lógica pura y repetible** que no requiere base de datos ni HTTP. Se priorizaron los módulos cuya falla provoca errores en cascada en E2E y cuyo comportamiento es determinista.

#### Validadores (`validators.test.js`)

| Módulo | Qué se prueba | Por qué es relevante |
|--------|---------------|----------------------|
| `stringValidators.js` — `nameValidator` | Longitud mínima (2 caracteres), caracteres prohibidos | Evita registros inválidos; la regla de apellido de 1 carácter fue causa directa de fallos E2E previos. |
| `stringValidators.js` — `usernameValidator` | Longitud mínima del username | Alineado con `/api/completar/perfil`; mismo criterio que valida la API en producción. |
| `mongoValidators.js` — `mongoIdBody` | Formato de ObjectId en body | Protege rutas que reciben `publicacionId`, `redId`, etc.; rechaza IDs mal formados antes de consultar MongoDB. |
| `reportValidators.js` — `reportPublicacionValidator` | Catálogo de tipos (`Contenido Inapropiado`, `Spam`, …) y descripción obligatoria para `"Otro"` | Los tipos son sensibles a mayúsculas y acentos; un valor incorrecto devuelve 400 en lugar de crear el reporte. |
| `validateResult.js` | Respuesta 400 estandarizada vs. llamada a `next()` | Centraliza el formato `{ errors: [...] }` usado en registro y otras rutas con `express-validator`. |

#### Middlewares (`middlewares.test.js`)

| Módulo | Qué se prueba | Por qué es relevante |
|--------|---------------|----------------------|
| `authSuperAdmin.js` — `isSuperAdmin` | Rol exacto `SuperAdmin` (case-sensitive) | Un rol mal escrito (`superadmin`) provocaba 403 en todas las rutas de aprobación de redes durante E2E. |
| `checkPerfilCompleto.js` — `requirePerfilCompleto` | Bloqueo cuando `perfilCompleto === false` | Protege publicaciones, likes, reportes y unirse a red; es el guard más usado tras `verifyToken`. |
| `checkPerfilCompleto.js` — `disallowPerfilCompleto` | Bloqueo cuando el perfil ya está completo | Evita repetir `/api/completar/perfil`; complementa el flujo probado en E2E. |
| `auth.js` — `requireRole` | Acceso denegado sin rol requerido (`admin_red`) | Base de autorización para panel de moderación y rutas administrativas de red. |

**Por qué no se unit-testean controladores completos:** los controladores mezclan persistencia, servicios externos y reglas de negocio extensas; eso ya se cubre en E2E. Unit-testear validadores y middlewares ofrece la mejor relación costo/beneficio: son pequeños, deterministas y protegen las mismas reglas que fallaron al configurar los datos de prueba E2E.

---

### Comandos de ejecución

```bash
npm run test:e2e    # 64 pruebas — flujos HTTP completos (--runInBand)
npm run test:unit   # 22 pruebas — validadores y middlewares
npm test            # ejecuta todas las pruebas en src/tests/
```

Variables de entorno requeridas para E2E: `MONGODB_URI_TEST` (definida en `.env`, usada por `src/tests/helpers/setupDB.js`).