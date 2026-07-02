# Documentación técnica del backend - PoliRed

Esta documentación resume la arquitectura, los módulos principales y el comportamiento real del backend de PoliRed. El proyecto está construido con Node.js en modo ES Modules, Express como capa HTTP, MongoDB con Mongoose como persistencia y servicios externos para media, notificaciones y correo.

## Resumen principal

PoliRed expone una API REST organizada por rutas y controladores. La aplicación cubre autenticación, perfiles de estudiantes, redes comunitarias, publicaciones, comentarios, guardados, mensajes, reportes, apelaciones y flujos de administración para red y superadmin. Usa JWT para autenticación, Cloudinary para archivos, Pusher para eventos en tiempo real y Nodemailer para correos.

El backend tiene dos puntos de entrada: `src/index.js` para despliegues serverless y `src/local.js` para ejecución local. Ambos reutilizan `src/server.js` como aplicación Express central.

## Estructura del proyecto

```
PoliRed/
├─ package.json
├─ README.md
├─ DOCUMENTACION_TECNICA.md
├─ .env.example
├─ vercel.json
└─ src/
  ├─ index.js
  ├─ local.js
  ├─ server.js
  ├─ database.js
  ├─ config/
  │  ├─ nodemailer.js
  │  └─ pusher.js
  ├─ controllers/
  │  ├─ adminRedController.js
  │  ├─ apelacionController.js
  │  ├─ authController.js
  │  ├─ estudiantesController.js
  │  ├─ mensajesController.js
  │  ├─ reportesSolicitudesController.js
  │  ├─ socialController.js
  │  └─ SuperAdminController.js
  ├─ helpers/
  │  ├─ globalRed.js
  │  ├─ notificaciones.js
  │  ├─ postResolver.js
  │  └─ reportHelpers.js
  ├─ middlewares/
  │  ├─ auth.js
  │  ├─ authSuperAdmin.js
  │  └─ checkPerfilCompleto.js
  ├─ models/
  │  ├─ adminRedes.js
  │  ├─ Apelacion.js
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
  ├─ services/
  │  ├─ cloudinaryService.js
  │  ├─ mediaService.js
  │  ├─ profileService.js
  │  ├─ redService.js
  │  └─ reportesService.js
  ├─ tests/
  │  ├─ e2e/
  │  ├─ helpers/
  │  └─ unit/
  └─ validators/
     ├─ apelacionValidators.js
     ├─ authValidators.js
     ├─ commonValidators.js
     ├─ contentValidators.js
     ├─ index.js
     ├─ mongoValidators.js
     ├─ redValidators.js
     ├─ reportValidators.js
     ├─ stringValidators.js
     └─ validateResult.js
```

## Información relevante por carpeta

Información relevante:

- **package.json**: scripts y dependencias principales. Ver [package.json](package.json)
- **src/index.js**: handler de entrada. Se asegura de la conexión con la base de datos antes de delegar en la app express. Ver [src/index.js](src/index.js)
- **src/local.js**: arranque local. Es el archivo que se ejecuta en desarrollo y, si no viene en el repositorio, debe crearse manualmente en `src/local.js`.
- **src/server.js**: configuración de Express, middlewares globales y montaje de rutas. Ver [src/server.js](src/server.js)
- **src/database.js**: conexión a MongoDB usando Mongoose. Ver [src/database.js](src/database.js)
- **src/routers/**: definición de rutas agrupadas por dominio (auth, estudiantes, social, mensajes, admin, superadmin, apelaciones). Ej: [src/routers/socialRoutes.js](src/routers/socialRoutes.js)
- **src/controllers/**: lógica por caso de uso. Ej: [src/controllers/socialController.js](src/controllers/socialController.js)
- **src/models/**: esquemas Mongoose (Estudiantes, Publicaciones, Comentarios, RedComunitaria, Notificaciones, Mensajes, etc.). Ej: [src/models/Estudiantes.js](src/models/Estudiantes.js)
- **src/config/**: integraciones con servicios externos (Cloudinary, Nodemailer, Pusher). Ej: [src/config/nodemailer.js](src/config/nodemailer.js), [src/config/pusher.js](src/config/pusher.js)
- **src/middlewares/**: autenticación, autorización, validaciones y verificaciones de perfil. Ej: [src/middlewares/auth.js](src/middlewares/auth.js)
- **src/helpers/** y **src/services/**: utilidades y lógica reutilizable (resolución de posts, notificaciones, media management, reglas de red). Ej: [src/helpers/notificaciones.js](src/helpers/notificaciones.js), [src/services/redService.js](src/services/redService.js)

### Detalle de uso de Nodemailer

- `src/config/nodemailer.js` concentra los transportadores, plantillas HTML y funciones de envío de correos. Se usa desde [src/controllers/estudiantesController.js](src/controllers/estudiantesController.js) para registro y recuperación de contraseña, desde [src/controllers/SuperAdminController.js](src/controllers/SuperAdminController.js) para recuperación de contraseña y nuevo admin, desde [src/controllers/apelacionController.js](src/controllers/apelacionController.js) para notificaciones de apelaciones y desde [src/services/redService.js](src/services/redService.js) para aprobación o rechazo de redes.
- `src/controllers/authController.js` no usa Nodemailer en esta versión del proyecto.

### Detalle de uso de Cloudinary

- `src/server.js` configura la conexión base con Cloudinary usando `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`, y además habilita `express-fileupload` para recibir archivos desde el frontend.
- `src/services/cloudinaryService.js` contiene la lógica de subida real con `cloudinary.uploader.upload_stream`, manejo de timeouts, limpieza de archivos temporales y normalización de errores [src/services/cloudinaryService.js](src/services/cloudinaryService.js).
- `src/services/mediaService.js` actúa como capa de orquestación: lee URLs ya existentes desde el body, toma archivos del request y combina todo antes de delegar la subida [src/services/mediaService.js](src/services/mediaService.js).
- `src/services/profileService.js` reutiliza la subida a Cloudinary para imágenes de perfil y flujos similares donde se necesita procesar archivos antes de persistirlos [src/services/profileService.js](src/services/profileService.js).
- `src/controllers/estudiantesController.js` usa Cloudinary para avatar, perfil público y contenido multimedia del estudiante [src/controllers/estudiantesController.js](src/controllers/estudiantesController.js).
- `src/controllers/adminRedController.js` usa Cloudinary en la actualización de la red comunitaria cuando se envían imágenes [src/controllers/adminRedController.js](src/controllers/adminRedController.js).
- `src/controllers/SuperAdminController.js` también consume Cloudinary para actualizar recursos gráficos asociados a su foto de perfil [src/controllers/SuperAdminController.js](src/controllers/SuperAdminController.js).
- `src/tests/helpers/setupMocks.js` mockea Cloudinary para evitar subidas reales durante las pruebas automatizadas [src/tests/helpers/setupMocks.js](src/tests/helpers/setupMocks.js).

## Flujo de arranque

1. `src/index.js` exporta un `handler(req, res)` para entornos serverless y conecta MongoDB solo en la primera invocación.
2. `src/local.js` se usa en desarrollo: conecta a la base de datos y levanta el servidor HTTP local.
3. `src/server.js` configura Express, CORS, `express.json`, `express.urlencoded`, `express-fileupload`, Cloudinary y el montaje de rutas.

Este esquema evita duplicar lógica de inicialización entre desarrollo local y despliegue en Vercel.

## Dependencias principales

- `express`: servidor HTTP y enrutado.
- `mongoose`: ODM para MongoDB.
- `jsonwebtoken`: emisión y verificación de JWT.
- `bcryptjs`: hashing de contraseñas.
- `cloudinary`: almacenamiento de media.
- `pusher`: notificaciones en tiempo real.
- `nodemailer`: envío de correos.
- `express-validator`: validación de entradas.
- `cors` y `express-fileupload`: soporte de frontend y subida de archivos.

## Variables de entorno esenciales

La configuración depende de las variables definidas en [.env.example](.env.example):

- `MONGODB_URI_LOCAL`: cadena de conexión a MongoDB.
- `FRONTEND_URL`: origen permitido por CORS y enlaces generados desde correo.
- `JWT_SECRET`: secreto para firmar y verificar tokens.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: credenciales de Cloudinary.
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`: credenciales de Pusher.
- `USER_MAILTRAP`, `PASS_MAILTRAP`: credenciales de correo.
- `PORT`: puerto para ejecución local.

## Modelos y diseño de datos

El proyecto usa Mongoose para modelar usuarios, redes, publicaciones, comentarios, mensajes, reportes y notificaciones.

- `Estudiantes`: usuario principal del sistema, con datos de perfil, roles, estado de perfil completo y referencias a red y publicaciones guardadas.
- `Publicaciones` y `Articulos`: contenido social con referencias a autor, red o comunidad, además de contadores de likes y comentarios.
- `Comentarios`: soporta respuestas anidadas mediante `parentId`.
- `Conversaciones` y `Mensajes`: estructuran el chat privado entre usuarios.
- `Notificaciones`: registra eventos como likes, comentarios, aprobaciones y reportes.
- `RedComunitaria`, `Solicitudes`, `Reportes`, `AdminRedes`, `SuperAdmin` y `Apelacion`: cubren la administración de redes, moderación y revisiones.

Patrones aplicados:

- Uso de referencias `ObjectId` entre documentos para autor, red, conversación y receptor.
- Operaciones atómicas como `$addToSet`, `$inc` y `$pull` para mantener consistencia.
- Validaciones a nivel de esquema y de request para reducir estados inválidos.

## Rutas y controladores

Todas las rutas se montan bajo `/api` en `src/server.js`.

### Autenticación

- `POST /api/login` para SuperAdmin.
- `POST /api/auth/login` para acceso a los demás roles.
- `POST /api/recuperar-password`, `GET /api/recuperar-password/:token`, `POST /api/nuevo-password/:token` para procesos con recuperación de contraseña.

### Estudiantes

- `POST /api/registro-estudiantes`.
- `GET /api/confirmar/:token`.
- `POST /api/recuperar-password-e`, `GET /api/recuperar-password-e/:token`, `POST /api/nuevo-password-e/:token`.
- `GET /api/perfil-estudiante`, `PATCH /api/perfil/username`, `PATCH /api/completar/perfil`, `PATCH /api/estudiante/:id`, `PATCH /api/estudiante/actualizarpassword/:id`.
- `POST /api/estudiantes/publicaciones`, `DELETE /api/publicaciones/eliminar/:id`.
- `GET /api/publicaciones/global`, `GET /api/publicaciones/comunitarias`, `GET /api/publicaciones/red/:redId`.
- `POST /api/publicaciones/articulos`, `GET /api/publicaciones/articulos/global`, `GET /api/publicaciones/articulos/comunitarias`, `DELETE /api/publicaciones/articulo/eliminar/:id`.
- `GET /api/redes/listar`, `GET /api/redes/:redId`, `POST /api/estudiantes/unirse/red`, `POST /api/estudiantes/salirse/red`.
- `GET /api/cargar/estudiantes`, `GET /api/perfil-publico/:usuarioId/info`, `GET /api/perfil-publico/:usuarioId/feed`.
- `POST /api/estudiantes/reportes/red` y `POST /api/estudiantes/solicitud/postular/admin-red`.

### Social

- `POST /api/redes/solicitar-creacion`.
- `GET /api/usuarios/guardados`, `GET /api/usuarios/likes`.
- `GET /api/notificaciones` y `PATCH /api/notificaciones/:id/leida`.

### Mensajes

- `POST /api/send`.
- `GET /api/entre/:otherId`.
- `GET /api/conversaciones`.
- `GET /api/conversacion/:id`.
- `POST /api/:conversacionId/leidos`.
- `POST /api/pusher/auth` y `POST /api/pusher/status`.

### Admin Red

- `GET /api/perfil/admin-red`.
- `GET /api/red/admin/informacion`, `PATCH /api/admin/actualizar/red`.
- `GET /api/admin/estudiantes/listar`, `DELETE /api/admin/estudiantes/eliminar/:estudianteId`.
- `GET /api/admin/red/reportes`, `PATCH /api/admin/reportes/:id/resolver`, `DELETE /api/admin/reportes/:subtype/:id`.
- `GET /api/solicitudes/:subtype`.
- `POST /api/redes/solicitar-verificacion`, `POST /api/redes/solicitar-oficializacion`, `POST /api/redes/solicitar/revocar-admin`.

### SuperAdmin

- `GET /api/perfil-superadmin`.
- `GET /api/redes`, `GET /api/red/:id`, `DELETE /api/eliminar-red/:id`.
- `GET /api/estudiantes`, `GET /api/estudiantes/:id`.
- Gestión de reportes, solicitudes, strikes, apelaciones y aprobación de redes pendientes.

### Apelaciones

- `POST /api/apelaciones`.
- `POST /api/apelaciones/red` para apelaciones asociadas a una red y protegidas por rol `admin_red`.

## Autenticación y autorización

- JWT para sesiones autenticadas.
- `verifyToken` y `optionalVerifyToken` en rutas de estudiantes y social.
- `requireRole('admin_red')` para funciones de administración de red.
- `autenticarToken` e `isSuperAdmin` para panel global.
- `requirePerfilCompleto` y `disallowPerfilCompleto` para controlar el ciclo de onboarding del estudiante.

## Notificaciones en tiempo real y correos

- `src/config/pusher.js` centraliza la emisión de eventos a canales privados por usuario.
- `src/config/nodemailer.js` centraliza el envío de correos y plantillas HTML.
- `helpers/notificaciones.js` y los controladores generan los registros de notificación en base a acciones de negocio.

## Validaciones

- `src/validators` agrupa validaciones reutilizables para strings, IDs de Mongo, reportes, contenidos y apelaciones.
- `validateResult` estandariza la respuesta de error cuando una validación falla.

## Consideraciones de concurrencia y diseño escalable

- Operaciones atómicas para likes, guardados y contadores.
- Reducción de ruido en notificaciones mediante agrupación de emisores.
- Separación entre capa HTTP, controladores, servicios y helpers para simplificar mantenimiento.

## Despliegue y ejecución local

Comandos útiles desde la raíz:

```
npm install
npm run dev
npm start
```

`src/index.js` está pensado para Vercel y otros entornos serverless, mientras que `src/local.js` ofrece una ejecución local tradicional con `app.listen`.

## Resumen de archivos clave para lectura rápida

- [package.json](package.json)
- [src/index.js](src/index.js)
- [src/server.js](src/server.js)
- [src/database.js](src/database.js)
- [src/routers/socialRoutes.js](src/routers/socialRoutes.js)
- [src/controllers/socialController.js](src/controllers/socialController.js)
- [src/models/Estudiantes.js](src/models/Estudiantes.js)
- [src/config/nodemailer.js](src/config/nodemailer.js)
- [src/config/pusher.js](src/config/pusher.js)


## Estrategia de pruebas

El backend cuenta con dos niveles de prueba automatizada, ejecutables desde la raíz del proyecto:

| Comando | Alcance | Ubicación |
|---------|---------|-----------|
| `npm run test:e2e:auth` | Flujos HTTP de autenticación con Supertest y MongoDB de prueba | `src/tests/e2e/01_auth.test.js` |
| `npm run test:e2e:estudiantes` | Flujos de registro, confirmación y perfil de estudiantes | `src/tests/e2e/02_estudiantes.test.js` |
| `npm run test:e2e:redes` | Solicitud y aprobación de redes comunitarias | `src/tests/e2e/03_redesComunitarias.test.js` |
| `npm run test:e2e:social` | Interacción social: publicaciones, likes, comentarios y notificaciones | `src/tests/e2e/04_social.test.js` |
| `npm run test:e2e:moderacion` | Reportes, resolución y acciones de moderación | `src/tests/e2e/05_moderacion.test.js` |
| `npm run test:unit:middleware` | Validadores de middleware y control de acceso aislado | `src/tests/unit/middlewares.test.js` |
| `npm run test:unit:validators` | Validaciones de entradas y formato aisladas | `src/tests/unit/validators.test.js` |

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
npm run test:e2e:auth
npm run test:e2e:estudiantes
npm run test:e2e:redes
npm run test:e2e:social
npm run test:e2e:moderacion
npm run test:unit:middleware
npm run test:unit:validators
```

Variables de entorno requeridas para E2E: `MONGODB_URI_TEST` (definida en `.env`, usada por `src/tests/helpers/setupDB.js`).