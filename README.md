# Backend PoliRed

## Estructura resumida

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
	├─ local.js
	├─ config/
	├─ controllers/
	├─ models/
	├─ routers/
	├─ middlewares/
	├─ services/
	├─ helpers/
	└─ validators/
```

## Información general

Para tener mejor información sobre el backend dirigirse a la [Documentación Técnica](DOCUMENTACION_TECNICA.md)

Este repositorio muestra el componente Backend completamente desarrollado con sus respectivos endpoints.

Para clonar este respositorio se lo hace mediante:

<pre>git clone https://github.com/KevinMunoz15112004/BackendV2</pre>

Este backend fue desplegado en Vercel, se puede acceder mediante la siguiente URL:
<pre>proximamente</pre>

La documentación de cada uno de los endpoints se encuentra en:
<pre>https://documenter.getpostman.com/view/45783834/2sB2x6nCWY</pre>

---

## Instalación
 
- Requisitos: Node.js (recomendado v16+), npm, y una instancia de MongoDB (o URI de MongoDB Atlas).
- Clonar el repositorio (ya indicado arriba) y entrar en la carpeta:

```bash
cd PoliRed
npm install
```

- Variables de entorno: crear un archivo `.env` con (como mínimo) las claves indicadas en [.env.example](.env.example)

Ejecución

- Modo desarrollo:

```bash
npm run dev
```

- Producción:

```bash
npm start
```

Tecnologías principales

- Node.js (ES Modules) + Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`) para autenticación
- `bcryptjs` para hashing de contraseñas
- Cloudinary para gestión de media
- Pusher para eventos en tiempo real
- Nodemailer para envío de correos
- `express-validator` para validación de inputs
