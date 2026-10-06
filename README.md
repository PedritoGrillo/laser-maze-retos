# Laser Maze · Retos de nivel medio

12 retos **inventados** de nivel medio para jugar con el tablero de *Laser Maze* (ThinkFun / Ravensburger).
Cada reto tiene **una única solución**, comprobada por ordenador.

**Web:** https://pedritogrillo.github.io/laser-maze-retos/

- Cada tarjeta se gira para ver la solución, con el rayo animado.
- Puedes marcar los retos que vayas resolviendo; el progreso se guarda en tu navegador.
- Al imprimir, cada reto sale con su solución al lado.

## Cómo se han hecho

- `generador.js` simula el láser con las reglas del juego, inventa tableros siguiendo el rayo y resuelve cada reto
  por fuerza bruta. Solo acepta los que tienen exactamente una solución (`node generador.js 80 777` → `pool.json`).
- `seleccionar.js` elige 12 retos variados, los ordena por dificultad, vuelve a comprobar que la solución es única
  y monta la página a partir de `plantilla.html` (`node seleccionar.js` → `index.html`).

Proyecto hecho por fans, sin relación con ThinkFun ni con Ravensburger.
