// Ideario · la web, v2 (D-75). Sin dependencias, y la web se lee entera sin este archivo. Aquí viven: el filtro por
// tema y el buscador de la portada (busca en lo que dice cada episodio y da «Lo dice en m:ss»), el viaje de las
// tarjetas (FLIP), las pestañas de la ficha, el vídeo que solo se carga al pulsar y la franja del especial, que se
// retira sola pasada su fecha. No guarda nada en el navegador.
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const quieto = matchMedia("(prefers-reduced-motion: reduce)");
  const VIAJE = "cubic-bezier(.65,.05,.25,1)";
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
  const VACIAS = new Set("a al con de del el en es la las lo los o para por que se su sus un una uno y".split(" "));
  const raiz = (w) => (w.length > 5 && w.endsWith("es") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
  const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mmss = (t) => { t = Math.max(0, Math.floor(t)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
  const cambiaHash = (h) => { try { history.replaceState(null, "", h || location.pathname + location.search); } catch { /* la copia de revisión puede no dejar */ } };

  // el bloque y la barra del especial se retiran solos el día después de su fecha, sin esperar a un despliegue
  $$("[data-hasta]").forEach((el) => { if (new Date() > new Date(el.dataset.hasta + "T23:59:59")) el.hidden = true; });

  // ---------- el vídeo, solo al pulsar ----------
  $$(".video[data-yt]").forEach((v) => {
    const play = () => {
      if (v.classList.contains("sonando")) return;
      v.classList.add("sonando");
      const marco = document.createElement("div");
      marco.className = "video__marco";
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.dataset.yt)}?autoplay=1&rel=0`;
      f.title = v.dataset.titulo || "Vídeo";
      f.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      marco.append(f);
      $(".video__img", v).replaceWith(marco);
      $(".video__play", v)?.remove();
      $(".video__nota", v)?.remove();
      if (!quieto.matches) marco.animate([{ clipPath: "inset(0 50% 0 50% round 16px)" }, { clipPath: "inset(0 0 0 0 round 16px)" }], { duration: 450, easing: VIAJE });
    };
    $(".video__img", v)?.addEventListener("click", (e) => { e.preventDefault(); play(); });
    $(".video__play", v)?.addEventListener("click", play);
  });

  // ---------- pestañas de la ficha ----------
  const lista = $(".pestanas[role=tablist]");
  if (lista) {
    const tabs = $$("[role=tab]", lista);
    const paneles = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls")));
    const linea = document.createElement("span");
    linea.className = "pestanas__linea"; linea.setAttribute("aria-hidden", "true");
    lista.append(linea);
    const colocar = (t, animar) => {
      const x = t.offsetLeft, w = t.offsetWidth;
      if (animar && !quieto.matches) linea.animate([{ transform: linea.style.transform || "none", width: linea.style.width || `${w}px` }, { transform: `translateX(${x}px)`, width: `${w}px` }], { duration: 380, easing: VIAJE });
      linea.style.transform = `translateX(${x}px)`; linea.style.width = `${w}px`;
    };
    const abrir = (i, { foco = false, animar = true, hash = true } = {}) => {
      tabs.forEach((t, k) => { t.setAttribute("aria-selected", k === i); t.tabIndex = k === i ? 0 : -1; paneles[k].hidden = k !== i; });
      const p = paneles[i];
      if (animar && !quieto.matches) { p.classList.remove("entra"); void p.offsetWidth; p.classList.add("entra"); }
      colocar(tabs[i], animar);
      if (foco) tabs[i].focus();
      if (hash) cambiaHash(`#${p.id}`);
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", (e) => {
        e.preventDefault(); abrir(i);
        const barra = $(".pestanas-barra"), top = barra.getBoundingClientRect().top;
        if (top > innerHeight * 0.6 || top < 0) barra.scrollIntoView({ behavior: quieto.matches ? "auto" : "smooth" });
      });
      t.addEventListener("keydown", (e) => {
        const k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (k === undefined) return;
        e.preventDefault(); abrir((k + tabs.length) % tabs.length, { foco: true });
      });
    });
    // los enlaces de la página a una pestaña («Lee el guion», «En redes») la abren
    $$('a[href^="#"]').forEach((a) => {
      const i = paneles.findIndex((p) => `#${p.id}` === a.getAttribute("href"));
      if (i >= 0 && !tabs.includes(a)) a.addEventListener("click", (e) => { e.preventDefault(); abrir(i); $(".pestanas-barra").scrollIntoView({ behavior: quieto.matches ? "auto" : "smooth" }); });
    });
    const desde = paneles.findIndex((p) => `#${p.id}` === location.hash);
    abrir(desde >= 0 ? desde : 0, { animar: false, hash: false });
    addEventListener("hashchange", () => { const k = paneles.findIndex((p) => `#${p.id}` === location.hash); if (k >= 0) abrir(k, { hash: false }); });
    addEventListener("resize", () => colocar(tabs.find((t) => t.getAttribute("aria-selected") === "true"), false));
    document.fonts?.ready.then(() => colocar(tabs.find((t) => t.getAttribute("aria-selected") === "true"), false));
  }

  // ---------- capítulos: la marca y su fila se señalan juntas ----------
  const marcas = $$(".escala__marca"), filas = $$(".capitulos a");
  [...marcas, ...filas].forEach((el) => {
    const i = +el.dataset.i, on = (v) => { marcas[i]?.classList.toggle("activo", v); filas[i]?.classList.toggle("activo", v); };
    el.addEventListener("mouseenter", () => on(true)); el.addEventListener("mouseleave", () => on(false));
    el.addEventListener("focusin", () => on(true)); el.addEventListener("focusout", () => on(false));
  });

  // ---------- portada: tema, buscador y viaje de las tarjetas ----------
  const rejilla = $(".episodios .rejilla");
  if (!rejilla) return;
  const tarjetas = $$(".tarjeta", rejilla);
  const botones = $$(".tema[data-pilar]");
  const entrada = $("#buscar"), limpiar = $(".buscar .limpiar");
  const estado = $(".estado"), vacio = $(".sin-resultados");
  const base = document.documentElement.dataset.base || "";
  let tema = "", q = "", indice = null, cargando = null, turno = 0;
  const ancla = decodeURIComponent(location.hash.slice(1));
  if (botones.some((b) => b.dataset.pilar && b.dataset.pilar === ancla)) tema = ancla;

  botones.forEach((b) => b.addEventListener("click", () => {
    tema = b.dataset.pilar === tema ? "" : b.dataset.pilar;
    aplicar(true);
    cambiaHash(tema ? `#${tema}` : "");
  }));

  const cargar = () => cargando ||= fetch(`${base}datos/busqueda.json`).then((r) => r.json()).then((d) => {
    indice = d.map((e) => { const inicios = []; let texto = " "; for (const [t, s] of e.c) { inicios.push([texto.length, t]); texto += s + " "; } return { ...e, texto, inicios }; });
  }).catch(() => { indice = []; });
  entrada?.addEventListener("focus", cargar, { once: true });
  let espera;
  entrada?.addEventListener("input", () => {
    clearTimeout(espera);
    espera = setTimeout(async () => { q = entrada.value; if (norm(q).length >= 2) await cargar(); aplicar(true); }, 110);
    limpiar.hidden = !entrada.value;
  });
  limpiar?.addEventListener("click", () => { entrada.value = ""; q = ""; limpiar.hidden = true; aplicar(true); entrada.focus(); });
  addEventListener("keydown", (e) => {
    if (e.key === "/" && !/^(input|textarea|select)$/i.test(document.activeElement?.tagName || "")) { e.preventDefault(); entrada?.focus(); }
    if (e.key === "Escape" && document.activeElement === entrada && entrada.value) limpiar.click();
  });
  $$(".sugerencias button").forEach((b) => b.addEventListener("click", async () => { entrada.value = b.textContent; q = b.textContent; limpiar.hidden = false; await cargar(); aplicar(true); }));

  function buscar(e, consulta) {
    const palabras = norm(consulta).split(" ").filter(Boolean);
    if (!palabras.length) return null;
    const corta = palabras.length === 1 && palabras[0].length < 3;
    const pat = (w) => (corta ? `${esc(w)}(?= )` : `${esc(raiz(w))}[a-z0-9]*`);
    const frase = new RegExp(` ${palabras.map(pat).join(" ")}`, "g");
    const veces = [...e.texto.matchAll(frase)];
    const momento = (i) => { let lo = 0, hi = e.inicios.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (e.inicios[m][0] <= i) lo = m; else hi = m - 1; } return e.inicios[lo]?.[1] ?? 0; };
    if (veces.length) return { t: momento(veces[0].index + 1), n: veces.length, donde: "voz" };
    const llenas = palabras.filter((w) => !VACIAS.has(w));
    if (llenas.length > 1 && llenas.every((w) => new RegExp(` ${pat(w)}`).test(e.texto)))
      return { t: momento(e.texto.search(new RegExp(` ${pat(llenas[0])}`)) + 1), n: 1, donde: "voz", sueltas: true };
    const una = new RegExp(` ${palabras.map(pat).join(" ")}`);
    const cap = (e.k || []).find(([, titulo]) => una.test(` ${norm(titulo)} `));
    if (cap) return { t: cap[0], donde: "capitulo", titulo: cap[1] };
    return una.test(` ${e.m} `) ? { donde: "ficha" } : null;
  }

  function hallazgo(tarjeta, r) {
    const p = $(".tarjeta__hallazgo", tarjeta);
    if (!r) { p.hidden = true; p.replaceChildren(); return; }
    const yt = tarjeta.dataset.yt;
    const enlace = (t, texto) => {
      if (!yt || t == null) { const b = document.createElement("b"); b.textContent = texto; return b; }
      const a = document.createElement("a");
      a.href = `https://www.youtube.com/watch?v=${yt}&t=${Math.max(0, Math.floor(t) - 1)}s`; a.target = "_blank"; a.rel = "noopener"; a.textContent = texto;
      return a;
    };
    const span = (t) => { const s = document.createElement("span"); s.textContent = t; return s; };
    if (r.donde === "voz") {
      if (tarjeta.dataset.tiempos === "no") p.replaceChildren(span("Lo dice en el vídeo"));
      else p.replaceChildren(enlace(r.t, `Lo dice en ${mmss(r.t)}`), span(r.n > 1 ? `y ${r.n - 1} ${r.n === 2 ? "vez" : "veces"} más` : r.sueltas ? "(las palabras, por separado)" : ""));
    } else if (r.donde === "capitulo") p.replaceChildren(enlace(r.t, `Capítulo en ${mmss(r.t)}`), span(`«${r.titulo}»`));
    else p.replaceChildren(span("En la ficha del episodio"));
    p.hidden = false;
  }

  function aplicar(animar) {
    const yo = ++turno;
    const consulta = norm(q).length >= 2 ? q : "";
    const antes = new Map(tarjetas.filter((t) => !t.hidden).map((t) => [t, t.getBoundingClientRect()]));
    const res = new Map(); let n = 0;
    tarjetas.forEach((t) => {
      let ok = !tema || t.dataset.pilar === tema, r = null;
      if (ok && consulta) { const e = indice?.find((x) => x.id === t.dataset.ep); r = e ? buscar(e, consulta) : null; ok = !!r; }
      res.set(t, { ok, r }); if (ok) n++;
    });
    const salen = tarjetas.filter((t) => !t.hidden && !res.get(t).ok);
    const mover = animar && !quieto.matches;
    const despues = () => {
      if (yo !== turno) return;
      tarjetas.forEach((t) => { const { ok, r } = res.get(t); t.hidden = !ok; hallazgo(t, ok ? r : null); });
      if (!mover) return;
      tarjetas.forEach((t, i) => {
        if (t.hidden) return;
        const a = antes.get(t), b = t.getBoundingClientRect();
        if (a) { const dx = a.left - b.left, dy = a.top - b.top; if (dx || dy) t.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 520, easing: VIAJE }); }
        else t.animate([{ clipPath: "inset(0 100% 0 0 round 18px)" }, { clipPath: "inset(0 0 0 0 round 18px)" }], { duration: 560, delay: 80 + 40 * i, easing: VIAJE, fill: "backwards" });
      });
    };
    if (animar) {
      const top = rejilla.getBoundingClientRect().top;
      if (top < 0) scrollTo({ top: scrollY + top - 160, behavior: quieto.matches ? "auto" : "smooth" });
    }
    if (mover && salen.length) Promise.all(salen.map((t) => t.animate([{ clipPath: "inset(0 0 0 0 round 18px)" }, { clipPath: "inset(0 0 0 100% round 18px)" }], { duration: 220, easing: "ease-in", fill: "forwards" }).finished.catch(() => {})))
      .then(() => { salen.forEach((t) => t.getAnimations().forEach((a) => a.cancel())); despues(); });
    else despues();

    botones.forEach((b) => b.setAttribute("aria-pressed", b.dataset.pilar === tema));
    const total = tarjetas.length, palabra = (k) => (k === 1 ? "vídeo" : "vídeos");
    let txt = consulta || tema ? `${n} de ${total} ${palabra(total)}` : `${total} ${palabra(total)}`;
    if (tema) txt += ` · ${botones.find((b) => b.dataset.pilar === tema)?.dataset.nombre}`;
    if (consulta) txt += ` · «${q.trim()}»`;
    estado.firstChild.textContent = txt;
    $("button", estado).hidden = !(consulta || tema);
    vacio.hidden = n > 0;
  }
  $("button", estado)?.addEventListener("click", () => { tema = ""; if (entrada) entrada.value = ""; q = ""; if (limpiar) limpiar.hidden = true; aplicar(true); cambiaHash(""); });
  aplicar(false);
})();

// ---------- propón un tema (2026-11-23): el comprobador, mientras escribes, y el envío ----------
// El comprobador mira en datos/temas.json (lo publicado y la lista del cockpit) sin enviar nada. El envío va al
// Apps Script de la cuenta de Google de Ideario si la página lo trae (data-endpoint); si no, o si falla, la página
// escribe el correo para que lo mande quien propone.
(() => {
  "use strict";
  const form = document.getElementById("propuesta");
  if (!form) return;
  const $ = (s) => form.querySelector(s);
  const base = document.documentElement.dataset.base || "";
  const endpoint = form.dataset.endpoint, correoIdeario = form.dataset.correo;
  const t0 = Date.now();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
  const VACIAS = new Set(("a al algo ante antes asi cada como con contra cual cuando de del desde donde dos el ella ellas ellos en entre era es esa ese " +
    "eso esta este esto estos estas fue ha hace hasta hay la las le les lo los mas me mi mis mucho muy nada ni no nos o otra otro otros para pero " +
    "poco por porque que quien se sea ser si sin sobre son su sus tambien te tiene tu tus un una uno unos unas y ya yo libro libros tema idea").split(" "));
  // raíz corta: sin plural y con cinco letras, para que «ahorro» y «ahorrar» o «hábito» y «hábitos» se encuentren
  const raiz = (w) => {
    if (w.endsWith("ciones")) w = w.slice(0, -6) + "cion";
    else if (w.length > 5 && w.endsWith("es")) w = w.slice(0, -2);
    else if (w.length > 3 && w.endsWith("s")) w = w.slice(0, -1);
    return w.slice(0, 5);
  };
  const raices = (s) => [...new Set(norm(s).split(" ").filter((w) => (w.length >= 3 || /^\d+$/.test(w)) && !VACIAS.has(w)).map(raiz))];
  const PILARES = new Set(["productividad", "mente", "personas", "vida", "ambicion", "dinero"]);
  const ETIQUETA = { publicado: "Publicado", preparacion: "En preparación", lista: "En nuestra lista" };
  const ORDEN = { publicado: 0, preparacion: 1, lista: 2 };
  const FLECHA = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';

  const texto = $("#p-texto"), check = $("#p-check"), correo = $("#p-correo"), acepto = $("#p-acepto"), aceptoC = $("#p-acepto-c");
  const estado = $("#p-estado"), boton = $("#p-enviar"), respaldo = $("#p-respaldo");
  const TIPOS = {
    tema: ["El tema, en una línea", "Por ejemplo: por qué nos cuesta tanto pedir perdón", "Un tema"],
    libro: ["El libro: su título y su autor", "Por ejemplo: el título del libro y quién lo escribió", "Un libro"],
    idea: ["La idea, en una línea", "Por ejemplo: la regla de los dos minutos para empezar algo", "Una idea"],
  };
  const tipo = () => form.querySelector('input[name="tipo"]:checked')?.value || "tema";
  form.querySelectorAll('input[name="tipo"]').forEach((r) => r.addEventListener("change", () => {
    const [l, ph] = TIPOS[tipo()];
    $("#p-texto-l").textContent = l;
    texto.placeholder = ph;
  }));
  if (!endpoint) $("#p-enviar span").textContent = "Preparar el correo";

  // ---------- el comprobador ----------
  let items = null, cargando = null, ultimas = [], turno = 0;
  const cargar = () => cargando ||= fetch(`${base}datos/temas.json`).then((r) => r.json()).then((d) => {
    items = d.map((x) => ({ ...x, T: new Set(raices(x.t)), W: new Set(raices(x.w || "")), B: new Set(raices((x.l || []).join(" "))) }));
  }).catch(() => { cargando = null; });
  function buscar(q) {
    const Q = raices(q);
    if (!Q.length || !items) return [];
    return items.map((x) => {
      let s = 0, fuerte = 0;
      for (const k of Q) {
        if (x.T.has(k) || x.B.has(k)) { s += 2; fuerte++; } else if (x.W.has(k)) s += 1;
      }
      const libros = (x.l || []).filter((b) => raices(b).some((k) => Q.includes(k)));
      return { x, s, r: s / (2 * Q.length), fuerte, libros };
    }).filter((m) => (m.fuerte ? m.r >= 0.34 || m.s >= 4 : m.s >= 2 && m.r >= 0.5))
      .sort((a, b) => b.r - a.r || b.s - a.s || ORDEN[a.x.s] - ORDEN[b.x.s]).slice(0, 4);
  }
  const fila = ({ x, libros }) => `<li class="p-${PILARES.has(x.p) ? x.p : "especial"}"><span class="coincide__t">${esc(x.t)}</span>` +
    `<span class="coincide__estado coincide__estado--${x.s}">${ETIQUETA[x.s]}</span>` +
    (libros.length ? `<span class="coincide__libro">Sale el libro: ${libros.map(esc).join(" · ")}</span>` : "") +
    (x.u ? `<a href="${base}${esc(x.u)}">${x.p === "especial" ? "Ver el especial" : "Ver el episodio"} ${FLECHA}</a>` : "") + "</li>";
  async function pintar() {
    const q = texto.value, mio = ++turno;
    if (norm(q).length < 3) { check.innerHTML = ""; ultimas = []; return; }
    await cargar();
    if (mio !== turno || !items) return;
    const ms = buscar(q);
    ultimas = ms.map((m) => `${m.x.t} (${ETIQUETA[m.x.s].toLowerCase()})`);
    check.innerHTML = ms.length
      ? `<p class="comprobar__titulo">Lo que ya tenemos parecido</p><ul class="coincide">${ms.map(fila).join("")}</ul>` +
        `<p class="comprobar__pie">Si lo tuyo es otra cosa, o lo ves desde otro ángulo, envíalo igualmente.</p>`
      : `<p class="comprobar__nada"><b>No lo tenemos todavía.</b> Cuéntanoslo: es justo lo que buscamos.</p>`;
  }
  let espera = 0;
  const cuenta = $("#p-cuenta");
  const contar = () => { if (cuenta) cuenta.textContent = `${texto.value.length}/${texto.maxLength}`; };
  texto.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(pintar, 180); texto.removeAttribute("aria-invalid"); contar(); });
  texto.addEventListener("focus", cargar, { once: true });

  // ---------- el correo, solo si quieres respuesta ----------
  const verCasilla = () => { aceptoC.hidden = !correo.value.trim(); if (aceptoC.hidden) acepto.checked = false; };
  correo.addEventListener("input", () => { verCasilla(); correo.removeAttribute("aria-invalid"); });

  // ---------- el envío ----------
  const aviso = (msg, cls) => { estado.textContent = msg; estado.className = "propuesta__estado" + (cls ? " " + cls : ""); };
  function datos() {
    const mail = correo.value.trim();
    // what the checker finds for the text as sent, not as it was 180 ms ago
    if (items) ultimas = norm(texto.value).length < 3 ? [] : buscar(texto.value).map((m) => `${m.x.t} (${ETIQUETA[m.x.s].toLowerCase()})`);
    return { tipo: tipo(), propuesta: texto.value.trim(), detalle: $("#p-detalle").value.trim(), nombre: $("#p-nombre").value.trim(),
      correo: mail, responder: !!mail && acepto.checked, coincidencias: ultimas, web: $("#p-web").value, t: Date.now() - t0 };
  }
  function porCorreo(d, fallo) {
    const lineas = [`Propuesta para Ideario (${TIPOS[d.tipo][2].toLowerCase()})`, "", d.propuesta];
    if (d.detalle) lineas.push("", d.detalle);
    if (d.nombre) lineas.push("", `Nombre: ${d.nombre}`);
    if (d.coincidencias.length) lineas.push("", `Parecido en la web: ${d.coincidencias.join("; ")}`);
    const cuerpo = lineas.join("\n");
    $("#p-respaldo-txt").value = cuerpo;
    $("#p-mailto").href = `mailto:${correoIdeario}?subject=${encodeURIComponent("Propuesta para Ideario: " + d.propuesta.slice(0, 80))}&body=${encodeURIComponent(cuerpo)}`;
    $("#p-respaldo-t").textContent = fallo ? "No hemos podido enviarla desde aquí. Envíanosla desde tu correo" : "Envíanosla desde tu correo";
    respaldo.hidden = false;
    aviso("", "");
    respaldo.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }
  $("#p-copiar").addEventListener("click", () => {
    const ta = $("#p-respaldo-txt");
    const marcar = () => { ta.focus(); ta.select(); };
    try {
      navigator.clipboard.writeText(ta.value).then(() => aviso("Texto copiado. Pégalo en un correo a " + correoIdeario + ".", "ok"), marcar);
    } catch { marcar(); }
  });
  $("#p-otra").addEventListener("click", () => {
    $("#p-gracias").hidden = true;
    $("#p-cuerpo").hidden = false;
    aviso("", "");
    texto.focus();
  });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    aviso("", "");
    if (!texto.value.trim()) {
      texto.setAttribute("aria-invalid", "true"); aviso("Escribe tu propuesta antes de enviarla.", "mal"); texto.focus(); return;
    }
    const mail = correo.value.trim();
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) {
      correo.setAttribute("aria-invalid", "true"); aviso("Revisa tu correo: parece que le falta algo.", "mal"); correo.focus(); return;
    }
    if (mail && !acepto.checked) { aviso("Marca la casilla para que podamos responderte, o deja el correo vacío.", "mal"); acepto.focus(); return; }
    const d = datos();
    if (!endpoint) { porCorreo(d, false); return; }
    boton.disabled = true;
    aviso("Enviando…", "");
    try {
      // text/plain: una petición simple, sin consulta previa; el Apps Script responde con {ok}
      const r = await fetch(endpoint, { method: "POST", body: JSON.stringify(d) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "error");
      ["#p-texto", "#p-detalle", "#p-nombre", "#p-correo"].forEach((s) => { $(s).value = ""; });
      check.innerHTML = ""; ultimas = []; verCasilla(); respaldo.hidden = true; contar();
      // the card turns into the thank-you, with its check drawn (R3: a stroke, never a fade)
      $("#p-cuerpo").hidden = true;
      $("#p-gracias").hidden = false;
      $("#p-gracias").focus({ preventScroll: true });
      form.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    } catch {
      porCorreo(d, true);
    } finally {
      boton.disabled = false;
    }
  });
})();
