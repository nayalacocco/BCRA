# BCRA Macro Intelligence

Aplicación web institucional para análisis macro-financiero argentino basada en la API pública del BCRA.

## Importante: primer arranque con datos

Para que carguen datos desde el BCRA, **no abras `index.html` directo** y **no uses `python -m http.server`**.

Esta app usa un backend local (`server.mjs`) que hace proxy a BCRA:

```bash
node server.mjs
# abrir http://localhost:4173
```

### ¿Por qué?

- Evita problemas de CORS en navegador.
- Permite manejar fallback de endpoints BCRA (`v4.0` → `v3.0`).
- Da trazabilidad de errores de conexión para debug.


## ¿Tengo que correr algo manual?

Sí, en local tenés que levantar el backend proxy:

```bash
node server.mjs
```

Luego abrís `http://localhost:4173`.

Chequeos rápidos:

```bash
curl http://localhost:4173/api/health
curl http://localhost:4173/api/series/1
```

- Si `/api/health` da `ok: true`, el server está levantado.
- Si `/api/series/1` da `data` vacío o `502`, el problema es conectividad del servidor hacia BCRA o ID de serie no disponible en ese endpoint.

## Qué incluye esta V1

- **Dashboard general** con KPIs ejecutivos, variaciones diaria/mensual/interanual e indicadores derivados.
- **Explorador de series** con búsqueda, visualización en gráfico y tabla de observaciones.
- **Comparador** con normalización a índice base 100 para comparación relativa.
- **Módulos temáticos**: Reservas, Monetario, Tasas, Tipo de cambio, Depósitos y crédito, Liquidez/Esterilización.
- **Capa de servicios API** con proxy backend y normalización consistente.

## Arquitectura

```txt
index.html
server.mjs        # servidor local + proxy API BCRA
api/              # funciones serverless (deploy, ej. Vercel)
src/
  main.js         # shell de producto + navegación + vistas
  bcra-api.js     # cliente frontend contra /api/series/:id
  chart.js        # render de gráfico lineal institucional en canvas
  config.js       # catálogo de series y módulos
  styles.css      # design system (tokens, layout, componentes)
```


## Deploy (Vercel)

El repositorio incluye funciones serverless en `api/` para que también cargue datos en producción:

- `GET /api/health`
- `GET /api/series/:id`

Si en Vercel ves `0/8 series disponibles`, abrí `https://tu-dominio.vercel.app/api/series/1` para confirmar que el backend del deploy puede salir a `api.bcra.gob.ar`.

## Decisiones de diseño inspiradas en Atlas

- Paleta **oscura-neutra premium**, contraste controlado, acentos fríos sobrios.
- Tipografía editorial para títulos + sans refinada para datos.
- Ritmo visual con whitespace, cards discretas y separadores de baja intensidad.
- Tono de interfaz profesional, preciso y no marketinero.

## API BCRA

El backend local intenta en orden:

1. `https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/{id}`
2. `https://api.bcra.gob.ar/estadisticas/v4.0/principalesvariables/{id}`
3. `https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/{id}`
4. `https://api.bcra.gob.ar/estadisticas/v3.0/principalesvariables/{id}`

Si encuentra datos, devuelve un arreglo normalizado:

```json
[{ "date": "YYYY-MM-DD", "value": 123.45 }]
```

## Troubleshooting rápido

- Si ves la UI sin datos, probá `http://localhost:4173/api/series/1`.
- Si responde `502`, la red local está bloqueando acceso a `api.bcra.gob.ar`.
- Si responde `200` con `data`, la app debería mostrar datos automáticamente.
