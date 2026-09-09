# ODYSS3D

Sitio web oficial de ODYSS3D — Impresión 3D, diseño, prototipado y fabricación.

Minimalista, moderna y tecnológica. Fondo negro, blanco y azul eléctrico `#0066FF`.
Tipografías: Exo 2 (principal) y Montserrat (secundaria).

## Requisitos

- Node.js 18 o superior

## Puesta en marcha

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173`.

Build de producción:

```bash
npm run build
npm run preview
```

## Estructura

```
src/
├── components/
│   ├── Navbar.jsx        Navegación sticky
│   ├── Hero.jsx          Hero + elemento 3D decorativo
│   ├── HeroScene.jsx     Escena WebGL (Three.js / R3F)
│   ├── Products.jsx      Sección de productos dinámica
│   ├── Services.jsx      Servicios
│   ├── About.jsx         Nosotros
│   ├── CTASection.jsx    CTA final
│   └── Footer.jsx
├── data/
│   └── products.json     Fuente de datos de productos
└── index.css             Sistema de diseño
```

## Agregar productos

Los productos se muestran automáticamente en el Home. No hay que tocar ningún
componente. Solo se edita la fuente de datos:

1. Editar `src/data/products.json` y agregar un objeto por producto:

```json
{
  "products": [
    {
      "id": "soporte-gpu",
      "name": "Soporte para GPU",
      "price": "$12.000",
      "category": "Accesorios",
      "image": "soporte-gpu.png",
      "url": "/contacto"
    }
  ]
}
```

2. Colocar la imagen del producto en `public/images/products/` con el nombre
   indicado en `image`. También puedes usar una URL externa completa
   (`https://...`) en lugar de un nombre de archivo.

3. La tarjeta aparece automáticamente en la sección *Productos* del Home.

Campos soportados por producto:

| Campo      | Tipo   | Descripción                           |
| ---------- | ------ | ------------------------------------- |
| `id`       | texto  | Identificador único                   |
| `name`     | texto  | Nombre del producto *(obligatorio)*   |
| `price`    | texto  | Precio, ej. `$15.500`                 |
| `category` | texto  | Categoría, ej. `Impreso 3D`           |
| `image`    | texto  | Archivo en `/images/products/` o URL   |
| `url`      | texto  | Enlace al hacer clic (por defecto CTA) |

Si `products` está vacío, el Home muestra el estado *"Próximamente — Estamos
preparando nuevos productos."*

## Marca

- Logos en `public/images/branding/` (`logo-horizontal.png`, `logo-icon.png`).
- Sustituir estos archivos actualiza el Navbar, Hero, Footer y favicon.

## Rendimiento

- Three.js se carga de forma diferida (lazy) y solo en pantallas ≥ 768px,
  por lo que no retrasa la carga inicial.
- El DPR del canvas está limitado a 1.5.