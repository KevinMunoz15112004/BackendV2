# Backend PoliRed

Backend de PoliRed construido con Node.js, Express y MongoDB. El proyecto expone una API REST organizada por dominio, con autenticación JWT, gestión de redes comunitarias, publicaciones, mensajes, reportes, apelaciones y paneles de administración para red y superadmin.

## Estructura resumida

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
	├─ controllers/
	├─ helpers/
	├─ middlewares/
	├─ models/
	├─ routers/
	├─ services/
	├─ tests/
	└─ validators/
```

## Información general

Para una descripción más completa de la arquitectura y los flujos internos, revisa la [Documentación Técnica](DOCUMENTACION_TECNICA.md).

Este repositorio contiene el backend finalizado del proyecto, listo para desplegarse en Vercel y para ejecutarse localmente con su configuración de desarrollo.

Repositorio original:
<pre>git clone https://github.com/KevinMunoz15112004/PoliRed</pre>

Despliegue público:
<pre>https://polired-api.vercel.app/</pre>

Colección de endpoints:
<pre>https://documenter.getpostman.com/view/45783834/2sBXwqqAF5</pre>

## Instalación

1. Requisitos: Node.js, npm y acceso a MongoDB local o MongoDB Atlas.
2. Clona el repositorio y entra en la carpeta del proyecto.
3. Instala dependencias con `npm install`.
4. Crea un archivo `.env` basado en [.env.example](.env.example).
5. Para ejecutar el proyecto en local el archivo `src/local.js` se debe crear manualmente en esa ruta antes de usar `npm run dev`.

Variables principales: `MONGODB_URI_LOCAL`, `FRONTEND_URL`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `USER_MAILTRAP` y `PASS_MAILTRAP`.

## Ejecución

Modo desarrollo:

```bash
npm run dev
```

Producción:

```bash
npm start
```

## Tecnologías principales

- `Node.js` con ES Modules y Express
- `MongoDB` con Mongoose
- `JWT` para autenticación y autorización
- `bcryptjs` para hashing de contraseñas
- `Cloudinary` para gestión de archivos multimedia
- `Pusher` para eventos en tiempo real
- `Nodemailer` para envío de correos
- `express-validator` para validación de entradas

## Módulos principales

- Autenticación y perfiles de estudiantes
- Publicaciones, comentarios, guardados y notificaciones
- Redes comunitarias y administración de red
- Mensajes y conversaciones privadas
- Reportes, solicitudes, apelaciones y moderación
