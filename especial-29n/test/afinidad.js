/* Afinidad · especial 29N. El único cálculo del test: lo usan la página (index.html) y las pruebas (pruebas.mjs).
   La fórmula está publicada en metodo.md §7 y en «Cómo funciona». */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Afinidad = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const K = 2;          // dos afirmaciones «neutras» virtuales (metodo.md §7)
  const EMPATE = 0.02;  // a menos de 2 puntos, empatados

  function peso(importante, ev) {
    return (importante ? 2 : 1) * (ev === "limitada" ? 0.5 : 1);
  }

  /* respuestas: {af: {u: -2..2 | null, imp: bool}} · posturas: {af: {p: {q, ev}}} · partidos: ids en el orden base.
     Devuelve los partidos ordenados por afinidad (0–1), con n = afirmaciones que cuentan y puesto = 1 + cuántos
     partidos le sacan 2 puntos o más. Dos partidos a menos de 2 puntos no se separan: comparten puesto. */
  function afinidades(respuestas, posturas, partidos) {
    const out = partidos.map(function (p, orden) {
      let sw = 0, swa = 0, n = 0;
      for (const af in respuestas) {
        const r = respuestas[af];
        const d = posturas[af] && posturas[af][p];
        if (!d || r.u === null || r.u === undefined) continue;
        const w = peso(r.imp, d.ev);
        sw += w;
        swa += w * (1 - Math.abs(r.u - d.q) / 4);
        n++;
      }
      return { p: p, orden: orden, n: n, afinidad: n ? (swa + K * 0.5) / (sw + K) : null };
    });
    out.sort(function (a, b) {
      if (a.afinidad === null || b.afinidad === null) return (a.afinidad === null) - (b.afinidad === null) || a.orden - b.orden;
      return b.afinidad - a.afinidad || a.orden - b.orden;
    });
    out.forEach(function (x) {
      x.puesto = x.afinidad === null ? null : 1 + out.filter(function (y) {
        return y.afinidad !== null && y.afinidad - x.afinidad >= EMPATE - 1e-9;
      }).length;
    });
    return out;
  }

  /* Posición en un eje (metodo.md §6): media(valor × polaridad) / 2, de −1 a +1.
     valores: {af: número}; afirmaciones: [{id, eje, acuerdo}]; eje: "izq-der" | "territorial".
     Devuelve {x, n}; x es null si hay menos de `minimo` afirmaciones. */
  function posicion(valores, afirmaciones, eje, minimo) {
    const derecha = eje === "izq-der" ? "derecha" : "autogobierno";
    let s = 0, n = 0;
    afirmaciones.forEach(function (a) {
      if (a.eje !== eje) return;
      const v = valores[a.id];
      if (v === null || v === undefined) return;
      s += v * (a.acuerdo === derecha ? 1 : -1);
      n++;
    });
    return { x: n >= (minimo || 1) ? s / n / 2 : null, n: n };
  }

  return { K: K, EMPATE: EMPATE, peso: peso, afinidades: afinidades, posicion: posicion };
});
