# BCRA Macro Intelligence

Aplicación web institucional para análisis macro-financiero argentino basada en la API pública del BCRA.

## Qué incluye esta V1

- **Dashboard general** con KPIs ejecutivos, variaciones diaria/mensual/interanual e indicadores derivados.
- **Explorador de series** con búsqueda, visualización en gráfico y tabla de observaciones.
- **Comparador** con normalización a índice base 100 para comparación relativa.
- **Módulos temáticos**: Reservas, Monetario, Tasas, Tipo de cambio, Depósitos y crédito, Liquidez/Esterilización.
- **Capa de servicios API** preparada para múltiples endpoints/versiones (`v4.0` y fallback `v3.0`).

## Arquitectura

```txt
index.html
src/
  main.js         # Shell de producto + navegación + vistas
  bcra-api.js     # Cliente API y normalización de payloads
  chart.js        # Render de gráfico lineal institucional en canvas
  config.js       # Catálogo de series y módulos
  styles.css      # Design system (tokens, layout, componentes)
```

## Decisiones de diseño inspiradas en Atlas

- Paleta **oscura-neutra premium**, contraste controlado, acentos fríos sobrios.
- Tipografía editorial para títulos + sans refinada para datos.
- Ritmo visual con whitespace, cards discretas y separadores de baja intensidad.
- Tono de interfaz profesional, preciso y no marketinero.

## API BCRA

La app utiliza `https://api.bcra.gob.ar/estadisticas/` con estrategia de compatibilidad:

1. Intenta `v4.0`.
2. Si falla o no devuelve datos, cae a `v3.0`.
3. Normaliza formatos de respuesta a `{ date, value }`.

> Nota: si alguna serie no está disponible por endpoint o permisos de red, la UI mantiene consistencia y refleja faltantes sin romper el flujo.

## Ejecutar local

```bash
python3 -m http.server 4173
# luego abrir http://localhost:4173
```

