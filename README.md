# ERP Pocket v2.0

Aplicación web tipo PWA, offline y sin frameworks, pensada para inventario, kardex, compras, ventas, producción, pérdidas, gastos y reportes.

## Cómo usar
1. Abre `index.html` desde un servidor local o publícalo en hosting estático.
2. Carga la demo con `Cargar Empresa Demo`.
3. Usa la navegación inferior para cambiar de módulo.
4. Los datos se guardan en `localStorage`.
5. El `Service Worker` cachea los archivos para uso offline cuando se ejecuta en `https` o `localhost`.

## Archivos principales
- `index.html`
- `styles.css`
- `db.js`
- `charts.js`
- `app.js`
- `manifest.json`
- `sw.js`

## Nota
La app está preparada para seguir ampliándose sin cambiar la estructura general.
