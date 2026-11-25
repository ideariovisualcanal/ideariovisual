(function () {
  "use strict";
  const D = window.DATOS, A = window.Afinidad;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PARTY = Object.fromEntries(D.partidos.map((p) => [p.id, p]));
  const IDS = D.partidos.map((p) => p.id);
  const TEMA = Object.fromEntries(D.temas.map((t) => [t.id, t]));
  const SHORT = { compromis: "Compromís", adelante: "Adelante", pnv: "PNV", ehbildu: "Bildu", fa: "F. Amplio" };
  const ANS = [[2, "Muy de acuerdo"], [1, "De acuerdo"], [0, "Ni de acuerdo ni en desacuerdo"], [-1, "En desacuerdo"], [-2, "Muy en desacuerdo"]];
  const UTXT = Object.fromEntries(ANS);
  const QTXT = { 2: "Muy a favor", 1: "A favor, en parte", 0: "Postura intermedia", "-1": "En contra, en parte", "-2": "Muy en contra" };
  const VTXT = { si: "Votó sí", no: "Votó no", abst: "Se abstuvo" };
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fecha = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MES[m - 1]} ${y}`; };
  const pct = (x) => Math.round(x * 100) + " %";
  const y = (xs) => xs.length > 1 ? xs.slice(0, -1).join(", ") + " y " + xs[xs.length - 1] : xs.join("");

  /* Circunscripción (BOE del 3 de noviembre): qué partidos están en la papeleta del Congreso y con qué nombre. */
  const CIRC = Object.fromEntries(D.circunscripciones.map((c) => [c.id, c]));
  let circ = "";
  const onBallot = (p) => !circ || p in CIRC[circ].partidos || p in CIRC[circ].dentro;
  const ballotName = (p) => (circ && CIRC[circ].partidos[p]) || null;
  const inside = (p) => (circ && CIRC[circ].dentro[p]) || null;
  const whyOff = () => `No se presenta en ${CIRC[circ].nombre}`;
  /* Con circunscripción, cada partido se llama como en tu papeleta (UPN-PP en Navarra) y se dice de quién son las
     posturas. En el mapa, los nombres largos de papeleta dejan su sitio al corto; el completo va en la etiqueta. */
  const label = (p) => ballotName(p) || PARTY[p].nombre;
  const mapLabel = (p) => { const b = ballotName(p); return b && b.length <= 13 ? b : SHORT[p] || PARTY[p].nombre; };
  const de = (p) => ({ pp: "del PP", psoe: "del PSOE" }[p] || "de " + PARTY[p].nombre);

  /* Estado: la lista del test, la afirmación actual (i) y tus respuestas. «cola» son las que faltaban cuando pediste
     responderlas (se recorren solo esas); «alRepaso», que abriste una desde el repaso y vuelves a él al responder. */
  let modo = null, lista = [], i = 0, resp = {}, cola = null, pos = 0, alRepaso = false;
  const respondida = (a) => !!resp[a.id] && resp[a.id].u !== null && resp[a.id].u !== undefined;
  const pendientes = () => lista.map((a, k) => respondida(a) ? -1 : k).filter((k) => k >= 0);

  function show(id) {
    ["inicio", "pregunta", "repaso", "resultados", "como"].forEach((s) => { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }
  let antesDeComo = "inicio";
  $("go-como").onclick = () => { const v = ["inicio", "pregunta", "repaso", "resultados"].find((s) => !$(s).hidden); if (v) antesDeComo = v; show("como"); };
  $("como-back").onclick = () => show(antesDeComo);

  function frame(p) {
    const d = PARTY[p];
    return `<span class="frame">${d.logo ? `<img src="${esc(d.logo)}" alt="">` : `<b>${esc(SHORT[p] || d.nombre)}</b>`}</span>`;
  }

  /* ---------- Inicio ---------- */
  const nr = D.afirmaciones.filter((a) => a.rapido).length, nc = D.afirmaciones.length;
  $("n-rapido").textContent = nr + " afirmaciones";
  $("n-completo").textContent = nc + " afirmaciones";
  $("f-partidos").textContent = D.partidos.length + " partidos: " + D.partidos.map((p) => p.nombre).join(", ") + ".";
  $("f-corte").textContent = "Programas y votaciones leídos hasta el " + fecha(D.corte) + ". Si un partido publica su programa, se añade y queda registrado.";
  $("foot-corte").textContent = "Datos a " + fecha(D.corte) + " · versión del " + fecha(D.generado) + ".";
  document.querySelectorAll(".mode").forEach((b) => { b.onclick = () => start(b.dataset.modo); });
  [$("circ"), $("r-circ")].forEach((sel) => {
    if (sel.id === "r-circ") sel.add(new Option("Todas: ver los 14 partidos", ""));
    D.circunscripciones.forEach((c) => sel.add(new Option(c.nombre, c.id)));
  });
  function setCirc(v) {
    circ = v; $("circ").value = v; $("r-circ").value = v;
    const cera = " Si votas desde el extranjero, elige la provincia en la que estás inscrito.";
    if (!v) {
      $("circ-on").textContent = "Opcional. Con tu circunscripción, los resultados ponen primero los partidos que estarán en tu papeleta del Congreso." + cera;
      return;
    }
    const c = CIRC[v], ps = IDS.filter((p) => p in c.partidos), ins = IDS.filter((p) => p in c.dentro);
    $("circ-on").textContent = `En ${c.nombre} están en tu papeleta ${ps.length + ins.length} de los ${IDS.length} partidos del test: ` +
      y(ps.map((p) => c.partidos[p] || PARTY[p].nombre).concat(ins.map((p) => `${PARTY[p].nombre} (dentro de ${c.dentro[p]})`))) + "." + cera;
  }
  $("circ").onchange = () => setCirc($("circ").value);
  $("r-circ").onchange = () => { setCirc($("r-circ").value); renderResults(); };
  setCirc("");

  function start(m) {
    const seguir = m === "completo" && modo === "rapido";  // del rápido al completo: tus respuestas se conservan
    if (!seguir) resp = {};
    modo = m; alRepaso = false;
    lista = D.afirmaciones.filter((a) => m === "completo" || a.rapido);
    cola = seguir ? pendientes() : null; pos = 0;
    if (cola && !cola.length) { cola = null; return results(); }
    i = cola ? cola[0] : 0;
    show("pregunta"); render();
  }

  /* ---------- Pregunta ---------- */
  const answers = $("q-answers");
  ANS.forEach(([v, t], k) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "ans"; b.dataset.v = v;
    b.innerHTML = `<span>${t}</span><kbd>${k + 1}</kbd>`;
    b.onclick = () => answer(v);
    answers.appendChild(b);
  });
  function render() {
    const a = lista[i], r = resp[a.id];
    $("q-bar").style.width = ((lista.length - pendientes().length) / lista.length * 100) + "%";
    $("q-count").textContent = cola ? `Te faltaban: ${pos + 1} de ${cola.length}` : (i + 1) + " / " + lista.length;
    $("q-tema").textContent = TEMA[a.tema].nombre;
    $("q-text").textContent = a.texto;
    $("q-sig").hidden = !a.significa; $("q-sig").open = false;
    $("q-sig-text").textContent = a.significa || "";
    $("q-sig-src").innerHTML = (a.fuentes_significa || []).length
      ? "Fuente: " + a.fuentes_significa.map((s) => `<a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.t)} ↗</a>`).join(" · ")
      : "";
    $("q-imp").checked = !!(r && r.imp);
    answers.querySelectorAll(".ans").forEach((b) => b.setAttribute("aria-pressed", String(!!r && r.u === Number(b.dataset.v))));
    $("q-back").disabled = cola ? pos === 0 : i === 0;
  }
  function answer(u) {
    resp[lista[i].id] = { u: u, imp: $("q-imp").checked };
    advance();
  }
  /* Avanzar nunca borra una respuesta. Al final: si falta alguna, el repaso; si no, los resultados. */
  function advance() {
    if (alRepaso) { alRepaso = false; return repaso(); }
    if (cola) {
      if (pos < cola.length - 1) { pos++; i = cola[pos]; render(); return; }
      cola = null;
    } else if (i < lista.length - 1) { i++; render(); return; }
    if (pendientes().length) repaso(); else results();
  }
  $("q-next").onclick = () => { alRepaso = false; advance(); };
  $("q-back").onclick = () => {
    alRepaso = false;
    if (cola) { if (pos > 0) { pos--; i = cola[pos]; render(); } }
    else if (i > 0) { i--; render(); }
  };
  $("q-all").onclick = () => { cola = null; alRepaso = false; repaso(); };
  $("q-imp").onchange = () => { const id = lista[i].id; resp[id] = { u: resp[id] ? resp[id].u : null, imp: $("q-imp").checked }; };
  document.addEventListener("keydown", (e) => {
    if ($("pregunta").hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[1-5]$/.test(e.key)) { answer(ANS[Number(e.key) - 1][0]); e.preventDefault(); }
    else if (e.key === "ArrowLeft") $("q-back").click();
    else if (e.key === "ArrowRight") $("q-next").click();
  });

  /* ---------- Repaso ---------- */
  function repaso() {
    const pend = pendientes(), n = lista.length;
    $("rp-lede").textContent = pend.length
      ? `Has respondido ${n - pend.length} de ${n}. ${pend.length === 1 ? "Te queda 1 sin responder" : `Te quedan ${pend.length} sin responder`}: ` +
        "puedes responderlas ahora o ver los resultados sin ellas. Toca cualquier afirmación para ver o cambiar tu respuesta."
      : `Has respondido las ${n}. Toca cualquier afirmación para ver o cambiar tu respuesta.`;
    $("rp-pend").hidden = !pend.length;
    $("rp-pend").textContent = pend.length === 1 ? "Responder la que falta" : `Responder las ${pend.length} que faltan`;
    $("rp-list").innerHTML = lista.map((a, k) => {
      const r = resp[a.id], ok = respondida(a);
      return `<button class="rv" type="button" data-k="${k}"><span class="rv-n">${k + 1}</span><span class="rv-t">${esc(a.texto)}</span>` +
        `<span class="rv-a">${esc(TEMA[a.tema].nombre)} · ${ok ? esc(UTXT[r.u]) + (r.imp ? " · importante" : "") : `<b class="pend">Sin responder</b>`}</span></button>`;
    }).join("");
    $("rp-list").querySelectorAll(".rv").forEach((b) => {
      b.onclick = () => { cola = null; alRepaso = true; i = Number(b.dataset.k); show("pregunta"); render(); };
    });
    show("repaso");
  }
  $("rp-pend").onclick = () => { cola = pendientes(); pos = 0; alRepaso = false; i = cola[0]; show("pregunta"); render(); };
  $("rp-res").onclick = () => results();

  /* ---------- Resultados ---------- */
  function results() { renderResults(); show("resultados"); }
  function partyRow(x, total, off) {
    const li = document.createElement("li");
    const sub = off ? whyOff(x.p) : inside(x.p) ? `En tu papeleta, dentro de ${inside(x.p)}` : ballotName(x.p) ? `En tu papeleta · posturas ${de(x.p)}` : "";
    li.innerHTML = `<button class="party${off ? " off" : ""}" type="button" data-p="${x.p}">
      <span class="pos">${off ? "" : x.puesto}</span>${frame(x.p)}
      <span class="who"><span class="name">${esc(label(x.p))}</span>
        ${sub ? `<span class="ballot">${esc(sub)}</span>` : ""}
        <span class="cov">Se pronuncia en ${x.n} de tus ${total}</span>
        <span class="meter"><i style="width:${(x.afinidad * 100).toFixed(1)}%"></i></span></span>
      <span class="pct">${pct(x.afinidad)}</span></button>`;
    li.firstElementChild.onclick = () => { $("c-party").value = x.p; compare(); $("c-party").scrollIntoView({ behavior: "smooth", block: "center" }); };
    return li;
  }
  function renderResults() {
    const answered = lista.filter((a) => resp[a.id] && resp[a.id].u !== null);
    const vis = IDS.filter(onBallot), off = IDS.filter((p) => !onBallot(p));
    const res = A.afinidades(resp, D.posturas, vis);
    const con = res.filter((x) => x.afinidad !== null);
    const sin = res.filter((x) => x.afinidad === null);
    $("r-lede").textContent = answered.length
      ? `Sobre ${answered.length} afirmaciones respondidas${answered.length < lista.length ? ` (${lista.length - answered.length} sin responder)` : ""}. ` +
        "La afinidad mide cuánto se parecen tus respuestas a las posturas de cada partido; un 50 % es lo que sale sin coincidencias ni diferencias."
      : "No has respondido ninguna afirmación, así que no hay afinidad que calcular.";

    const ol = $("r-ranking"); ol.innerHTML = "";
    $("r-tie").hidden = !con.some((x) => con.some((z) => z !== x && z.puesto === x.puesto));
    con.forEach((x) => ol.appendChild(partyRow(x, answered.length, false)));
    const nd = $("r-nodata");
    const sinNada = sin.filter((x) => !D.afirmaciones.some((a) => D.posturas[a.id][x.p]));
    const sinAqui = sin.filter((x) => !sinNada.includes(x));
    const parts = [];
    if (sinNada.length) parts.push(`<b>${sinNada.map((x) => esc(PARTY[x.p].nombre)).join(" y ")}:</b> sin programa publicado a ${fecha(D.corte)} y sin diputados en el Congreso saliente, así que aún no hay de dónde sacar sus posturas.`);
    if (sinAqui.length) parts.push(`<b>${sinAqui.map((x) => esc(label(x.p))).join(", ")}:</b> no se pronuncia en ninguna de las afirmaciones que respondiste.`);
    nd.innerHTML = parts.join("<br>"); nd.hidden = !parts.length;

    // Los partidos que no están en tu papeleta, aparte y plegados.
    const resOff = off.length ? A.afinidades(resp, D.posturas, off) : [];
    const conOff = resOff.filter((x) => x.afinidad !== null);
    $("r-others").hidden = !conOff.length; $("r-others").open = false;
    if (conOff.length) {
      $("r-others-sum").textContent = `${conOff.length === 1 ? "El otro partido" : `Los otros ${conOff.length} partidos`} del test, que no se ${conOff.length === 1 ? "presenta" : "presentan"} en ${CIRC[circ].nombre}`;
      const lo = $("r-others-list"); lo.innerHTML = "";
      conOff.forEach((x) => lo.appendChild(partyRow(x, answered.length, true)));
    }

    $("r-full").hidden = modo === "completo";
    const sel = $("c-party"), prev = sel.value; sel.innerHTML = "";
    con.concat(sinAqui).forEach((x) => sel.add(new Option(label(x.p), x.p)));
    if (conOff.length) {
      const g = document.createElement("optgroup"); g.label = `No se presentan en ${CIRC[circ].nombre}`;
      conOff.forEach((x) => g.appendChild(new Option(PARTY[x.p].nombre, x.p)));
      sel.appendChild(g);
    }
    if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
    drawAxes(vis); compare(); shareResults(con, answered.length);
  }
  $("r-again").onclick = () => { modo = null; resp = {}; show("inicio"); };
  $("r-review").onclick = () => repaso();
  $("r-full").onclick = () => start("completo");
  $("c-party").onchange = compare;

  /* ---------- Compartir ----------
     La imagen se dibuja en un canvas y el texto se escribe aquí: nada sale del navegador hasta que la persona lo envía
     con el menú de compartir de su dispositivo, WhatsApp o su correo. La página sigue sin poder conectarse a ningún sitio. */
  const ENLACE = "https://ideariovisual.com/especial-29n/test/";
  const TOP = 5;
  let shWhat = "res", shTop = [], shMeta = null, shCard = null, shGen = 0;
  const radio = (v) => document.querySelector(`input[name="sh-what"][value="${v}"]`);
  document.querySelectorAll('input[name="sh-what"]').forEach((r) => { r.onchange = () => { shWhat = r.value; shUpdate(); }; });
  $("sh-native").hidden = typeof navigator.share !== "function";

  function shTexts() {
    if (shWhat === "res" && shTop.length) {
      return { subject: "Mis resultados en el test de afinidad 29N",
        text: [`Mis resultados en el test de afinidad del 29N de Ideario (test ${modo === "completo" ? "completo" : "rápido"}, ${shMeta.answered} afirmaciones):`]
          .concat(shTop.map((x) => `${x.puesto}. ${label(x.p)}: ${pct(x.afinidad)}`))
          .concat(["¿Y tú? Compara tus ideas con las posturas de los partidos, con la cita y la página de cada una. No es una encuesta y no guarda nada:", ENLACE])
          .join("\n") };
    }
    return { subject: "Test de afinidad 29N de Ideario",
      text: `He hecho el test de afinidad del 29N de Ideario. Compara tus ideas con las posturas de ${IDS.length} partidos, sacadas de sus ` +
        `programas y de sus votaciones en el Congreso, con la cita y la página de cada una. El rápido dura unos 3 minutos y no guarda nada. Hazlo tú:\n${ENLACE}` };
  }
  function shUpdate() {
    const res = shWhat === "res" && shTop.length > 0, t = shTexts();
    $("sh-text").textContent = t.text;
    // En el móvil, con la imagen delante, el texto va plegado; la invitación es solo texto y se ve siempre.
    $("sh-sum").textContent = res ? "Ver el texto que acompaña a la imagen" : "El texto de la invitación";
    $("sh-det").open = !res || window.matchMedia("(min-width: 521px)").matches;
    $("sh-wa").href = "https://wa.me/?text=" + encodeURIComponent(t.text);
    $("sh-mail").href = "mailto:?subject=" + encodeURIComponent(t.subject) + "&body=" + encodeURIComponent(t.text);
    $("sh-prev").classList.toggle("inv", !res);
    $("sh-img").hidden = $("sh-down").hidden = !res || !shCard;
    $("sh-status").textContent = "";
  }
  function shareResults(con, answered) {
    shTop = con.slice(0, TOP); shMeta = { answered, total: con.length };
    radio("res").disabled = !shTop.length;
    if (!shTop.length) { shWhat = "inv"; radio("inv").checked = true; }
    if (shCard) URL.revokeObjectURL(shCard.url);
    shCard = null; shUpdate();
    const gen = ++shGen;
    if (shTop.length) drawCard(shTop, shMeta).then((c) => {
      if (gen !== shGen) { URL.revokeObjectURL(c.url); return; }
      shCard = c;
      $("sh-img").src = c.data;
      $("sh-img").alt = "Imagen para compartir: " + shTop.map((x) => `${x.puesto}. ${label(x.p)}, ${pct(x.afinidad)}`).join("; ") + ".";
      $("sh-down").href = c.url;
      shUpdate();
    }).catch(() => {});
  }
  $("sh-native").onclick = async () => {
    const t = shTexts(), data = { title: t.subject, text: t.text };
    if (shWhat === "res" && shCard && navigator.canShare && navigator.canShare({ files: [shCard.file] })) data.files = [shCard.file];
    try { await navigator.share(data); }
    catch (e) { if (!e || e.name !== "AbortError") $("sh-status").textContent = "No se ha podido abrir el menú de compartir: usa los otros botones."; }
  };
  $("sh-down").onclick = (e) => { if (!shCard) e.preventDefault(); };
  $("sh-copy").onclick = () => {
    const st = $("sh-status");
    const select = () => {
      $("sh-det").open = true;
      const r = document.createRange(); r.selectNodeContents($("sh-text"));
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      st.textContent = "Texto seleccionado: cópialo con el menú o con Ctrl+C.";
    };
    try { navigator.clipboard.writeText(shTexts().text).then(() => { st.textContent = "Texto copiado."; }, select); } catch (e) { select(); }
  };

  /* La imagen: 1080 × 1350, siempre en la paleta clara, solo tinta (sin colores de partido), los logotipos sin alterar.
     Cada texto se mide antes de dibujarlo, así nada se monta encima de nada (VISUAL_DNA R13). */
  const loadImg = (src) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
  async function drawCard(top, meta) {
    const W = 1080, H = 1350, M = 72, CW = W - 2 * M;
    const C = { bg: "#FAF2E5", raised: "#FFFBF4", ink: "#040E18", muted: "#5E5D5A", line: "#D9D1C3", frame: "#FFFFFF" };
    const SANS = '"Schibsted Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', SERIF = 'Newsreader, Georgia, "Times New Roman", serif';
    try { await Promise.all([document.fonts.load(`600 64px ${SERIF}`), document.fonts.load(`700 36px ${SANS}`), document.fonts.load(`400 28px ${SANS}`)]); } catch (e) { /* se dibuja con la fuente de reserva */ }
    const logos = await Promise.all(top.map((x) => PARTY[x.p].logo ? loadImg(PARTY[x.p].logo) : Promise.resolve(null)));
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    const font = (w, s, fam) => { g.font = `${w} ${s}px ${fam}`; };
    const box = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    // Parte un texto en líneas que caben en maxW (cortes tras espacio o guion); null si necesita más de n líneas.
    const wrap = (text, maxW, n) => {
      const parts = text.match(/[^\s-]*-|[^\s-]+|\s+/g) || [text], lines = [];
      let cur = "";
      for (const p of parts) {
        const next = cur + p;
        if (cur.trim() && g.measureText(next.trimEnd()).width > maxW) { lines.push(cur.trimEnd()); cur = p.trimStart(); }
        else cur = next;
      }
      if (cur.trim()) lines.push(cur.trimEnd());
      return lines.length <= n && lines.every((l) => g.measureText(l).width <= maxW) ? lines : null;
    };
    const fit = (text, maxW, sizes, n, w, fam) => {
      for (const s of sizes) { font(w, s, fam); const l = wrap(text, maxW, n); if (l) return { s, lines: l }; }
      const s = sizes[sizes.length - 1]; font(w, s, fam);
      let t = text; while (t.length > 1 && g.measureText(t + "…").width > maxW) t = t.slice(0, -1);
      return { s, lines: [t.trimEnd() + "…"] };
    };
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    g.textBaseline = "top"; g.textAlign = "left";

    // Cabecera
    let y = M;
    font(700, 24, SANS); g.fillStyle = C.muted;
    g.fillText("IDEARIO · ESPECIAL ELECCIONES 29N", M, y);
    y += 50; g.fillStyle = C.line; g.fillRect(M, y, CW, 2);
    y += 34;
    // El título, en dos líneas equilibradas (sin una palabra sola en la segunda).
    const tt = { s: 64, lines: ["Mis resultados en el", "test de afinidad"] };
    font(600, tt.s, SERIF);
    g.fillStyle = C.ink; tt.lines.forEach((l, k) => g.fillText(l, M, y + k * tt.s * 1.12));
    y += tt.lines.length * tt.s * 1.12 + 14;
    const sub = `Test ${modo === "completo" ? "completo" : "rápido"} · ${meta.answered} afirmaciones respondidas · ` +
      (meta.total > top.length ? `los ${top.length} primeros de ${meta.total} partidos` : `${meta.total} partidos`);
    const st = fit(sub, CW, [28, 25], 2, 400, SANS);
    g.fillStyle = C.muted; st.lines.forEach((l, k) => g.fillText(l, M, y + k * st.s * 1.3));
    y += st.lines.length * st.s * 1.3 + 30;

    // Pie, anclado abajo
    const foot = H - M - 150;
    g.fillStyle = C.line; g.fillRect(M, foot, CW, 2);
    font(400, 30, SANS); g.fillStyle = C.ink; g.fillText("¿Y tú? Haz el test en", M, foot + 26);
    const url = ENLACE.replace(/^https:\/\//, "").replace(/\/$/, "");
    const uf = fit(url, CW, [38, 34, 30], 1, 700, SANS); g.fillText(uf.lines[0], M, foot + 66);
    const df = fit("No es una encuesta ni una recomendación de voto.", CW, [24, 22], 1, 400, SANS);
    g.fillStyle = C.muted; g.fillText(df.lines[0], M, foot + 120);

    // Filas: posición, logotipo, nombre con su barra y porcentaje
    const gap = 14, RH = Math.min(124, (foot - 34 - y - gap * (top.length - 1)) / top.length);
    font(700, 56, SANS); const pctW = g.measureText("100 %").width;
    top.forEach((x, k) => {
      const ry = y + k * (RH + gap), cy = ry + RH / 2;
      box(M, ry, CW, RH, 18); g.fillStyle = C.raised; g.fill(); g.lineWidth = 2; g.strokeStyle = C.line; g.stroke();
      font(700, 32, SANS); g.fillStyle = C.muted; g.textAlign = "right"; g.textBaseline = "middle";
      g.fillText(String(x.puesto), M + 62, cy);
      const fx = M + 82, fw = 140, fh = Math.min(84, RH - 28), fy = cy - fh / 2;
      box(fx, fy, fw, fh, 14); g.fillStyle = C.frame; g.fill(); g.lineWidth = 2; g.strokeStyle = C.line; g.stroke();
      const im = logos[k];
      let drawn = false;
      if (im) {
        try {
          const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, bw = fw - 22, bh = fh - 20;
          const sc = Math.min(bw / iw, bh / ih), dw = iw * sc, dh = ih * sc;
          if (dw > 0 && dh > 0) { g.drawImage(im, fx + (fw - dw) / 2, fy + (fh - dh) / 2, dw, dh); drawn = true; }
        } catch (e) { drawn = false; }
      }
      if (!drawn) {
        g.textAlign = "center"; g.fillStyle = C.ink;
        const lf = fit(SHORT[x.p] || PARTY[x.p].nombre, fw - 16, [24, 20, 17], 2, 700, SANS);
        lf.lines.forEach((l, j) => g.fillText(l, fx + fw / 2, cy + (j - (lf.lines.length - 1) / 2) * lf.s * 1.1));
      }
      font(700, 56, SANS); g.fillStyle = C.ink; g.textAlign = "right";
      g.fillText(pct(x.afinidad), M + CW - 26, cy);
      const nx = fx + fw + 24, nw = M + CW - 26 - pctW - 24 - nx;
      const nf = fit(label(x.p), nw, [36, 32, 28], 2, 600, SANS);
      const lh = nf.s * 1.15, bh = nf.lines.length * lh + 14 + 10, by = cy - bh / 2;
      g.textAlign = "left"; g.textBaseline = "top"; g.fillStyle = C.ink;
      nf.lines.forEach((l, j) => g.fillText(l, nx, by + j * lh));
      const my = by + nf.lines.length * lh + 14;
      box(nx, my, nw, 10, 5); g.fillStyle = C.line; g.fill();
      if (x.afinidad > 0) { box(nx, my, Math.max(10, nw * x.afinidad), 10, 5); g.fillStyle = C.ink; g.fill(); }
    });
    g.textAlign = "left"; g.textBaseline = "top";

    const blob = await new Promise((ok, ko) => cv.toBlob((b) => b ? ok(b) : ko(new Error("toBlob")), "image/png"));
    return { data: cv.toDataURL("image/png"), url: URL.createObjectURL(blob), file: new File([blob], "test-29n-ideario.png", { type: "image/png" }) };
  }

  /* Mapa: dos ejes, como gráfico de puntos. */
  function partyVals(p) {
    const v = {};
    D.afirmaciones.forEach((a) => { const d = D.posturas[a.id][p]; if (d) v[a.id] = d.q; });
    return v;
  }
  function userVals() {
    const v = {};
    lista.forEach((a) => { const r = resp[a.id]; if (r && r.u !== null) v[a.id] = r.u; });
    return v;
  }
  function drawAxes(ids) {
    axis($("axis-lr"), "izq-der", ["← Izquierda", "Derecha →"], "Izquierda y derecha", ids);
    axis($("axis-ter"), "territorial", ["← Más Estado central", "Más autogobierno →"], "Modelo territorial", ids);
  }
  function axis(el, eje, ends, title, ids) {
    const me = A.posicion(userVals(), D.afirmaciones, eje, 2);
    const parties = ids.map((p) => ({ p, ...A.posicion(partyVals(p), D.afirmaciones, eje, 2) })).filter((x) => x.x !== null)
      .sort((a, b) => a.x - b.x);
    const out = ids.filter((p) => !parties.some((x) => x.p === p) && D.afirmaciones.some((a) => D.posturas[a.id][p]));
    const left = (x) => ((x + 1) / 2 * 100).toFixed(2) + "%";
    const row = (label, x, you, tip) => `<div class="dl">${label}</div>` +
      `<div class="dt" title="${esc(tip)}"><i style="left:${left(x)}"></i></div>`;
    let rows = `<div class="ends"><span>${ends[0]}</span><span>${ends[1]}</span></div>`;
    if (me.x !== null) rows += `<div class="you" style="display:contents">${row("Tú", me.x, true, `Tú: ${me.x.toFixed(2)} (${me.n} respuestas)`)}</div><div class="sep"></div>`;
    parties.forEach((x) => {
      const d = PARTY[x.p], name = esc(mapLabel(x.p));
      rows += row((d.logo ? `<img src="${esc(d.logo)}" alt="">` : "") + `<span>${name}</span>`, x.x, false,
        `${label(x.p)}: ${x.x >= 0 ? "+" : ""}${x.x.toFixed(2)} (${x.n} afirmaciones)`);
    });
    el.innerHTML = `<h3>${esc(title)}</h3><div class="dots">${rows}</div>` +
      `<p class="small">${me.x === null ? "Respondiste menos de dos afirmaciones de este eje, así que no podemos situarte. " : ""}` +
      (out.length ? `Sin posición en este eje, por tener menos de dos posturas en él: ${out.map((p) => esc(label(p))).join(", ")}.` : "") + `</p>`;
  }

  /* Comparación por partido */
  function source(p, d) {
    const party = PARTY[p];
    if (d.fuente === "voto") {
      const v = D.votos[d.voto];
      return `<span class="src">${esc(VTXT[d.sentido] || d.sentido)} · ${esc(v.tipo)}, ${fecha(v.fecha)}: ` +
        `${v.url ? `<a href="${esc(v.url)}" rel="noopener" target="_blank">${esc(v.titulo)} ↗</a>` : esc(v.titulo)}</span>`;
    }
    let url = party.programa, pag = String(d.pag), label = "Programa, p. " + pag + (party.copia ? " (copia publicada por " + party.copia + ")" : "");
    if (d.fuente === "campaña") {
      url = (party.propuestas || {})[pag] || party.campana; pag = null;
      label = party.propuestas ? "Página de propuestas de su web" : "Propuesta de su web de campaña";
    } else if (d.fuente === "europeas") {
      url = party.europeas; label = "Programa de las europeas de 2024, p. " + pag;
    } else if (pag.startsWith("d")) { url = party.decalogo; pag = pag.slice(1); label = "Decálogo de compromisos, p. " + pag; }
    const link = url ? `<a href="${esc(url)}${pag ? "#page=" + esc(pag) : ""}" rel="noopener" target="_blank">${esc(label)} ↗</a>` : esc(label);
    const q = d.cita_es
      ? `<blockquote class="quote">«${esc(d.cita_es)}»<span class="orig">Original: «${esc(d.cita)}» · traducción de Ideario</span></blockquote>`
      : `<blockquote class="quote">«${esc(d.cita)}»</blockquote>`;
    return q + `<span class="src">${link}${d.ev === "limitada" ? " · evidencia limitada, cuenta la mitad" : ""}</span>` +
      (d.nota ? `<span class="note">Nota: ${esc(d.nota)}</span>` : "");
  }
  function compare() {
    const p = $("c-party").value, out = $("c-list");
    if (!p) { out.innerHTML = ""; return; }
    let html = "";
    D.temas.forEach((t) => {
      const afs = lista.filter((a) => a.tema === t.id);
      if (!afs.length) return;
      const sub = {}; afs.forEach((a) => { if (resp[a.id]) sub[a.id] = resp[a.id]; });
      const r = A.afinidades(sub, D.posturas, [p])[0];
      html += `<div class="topic"><h3><span>${esc(t.nombre)}</span><span>${r.afinidad === null ? "sin datos" : pct(r.afinidad) + " en este tema"}</span></h3>`;
      afs.forEach((a) => {
        const u = resp[a.id], d = D.posturas[a.id][p];
        html += `<div class="item"><div class="st">${esc(a.texto)}</div><div class="pair">` +
          `<div><span class="lab">Tú</span><br>${u && u.u !== null ? esc(UTXT[u.u]) + (u.imp ? " · importante" : "") : "Sin responder"}</div>` +
          `<div><span class="lab">${esc(label(p))}</span><br>${d ? esc(QTXT[d.q]) : "No se pronuncia"}</div></div>` +
          (d ? source(p, d) : "") + `</div>`;
      });
      html += `</div>`;
    });
    out.innerHTML = html;
  }

  /* ---------- Cómo funciona: tablas con los datos ---------- */
  const tb = document.querySelector("#m-partidos tbody");
  D.partidos.forEach((p) => {
    const n = D.afirmaciones.filter((a) => D.posturas[a.id][p.id]).length;
    const nv = D.afirmaciones.filter((a) => (D.posturas[a.id][p.id] || {}).fuente === "voto").length;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${esc(p.nombre)}</td><td>${p.programa ? `<a href="${esc(p.programa)}" rel="noopener" target="_blank">${p.copia ? "Copia publicada por " + esc(p.copia) : "En su web"} ↗</a>` : "No publicado a " + fecha(D.corte) +
        (p.campana ? ` · <a href="${esc(p.campana)}" rel="noopener" target="_blank">${p.propuestas ? "páginas de propuestas de su web" : "propuestas de campaña"} ↗</a>` : "") +
        (p.europeas ? ` · <a href="${esc(p.europeas)}" rel="noopener" target="_blank">programa de las europeas de 2024 ↗</a>` : "")}</td>` +
      `<td>${n} de ${D.afirmaciones.length}${nv ? ` (${nv} de votaciones)` : ""}</td>`;
    tb.appendChild(tr);
  });
  $("m-boe").href = D.candidaturas.url;
  const tcirc = document.querySelector("#m-circ tbody");
  const byName = (pairs) => { const g = {}; pairs.forEach(([k, c]) => { if (k) (g[k] = g[k] || []).push(c); }); return Object.entries(g); };
  D.partidos.forEach((p) => {
    const yes = D.circunscripciones.filter((c) => p.id in c.partidos);
    const no = D.circunscripciones.filter((c) => !(p.id in c.partidos));
    let t = yes.length === D.circunscripciones.length ? `En las ${yes.length} circunscripciones.`
      : yes.length * 2 >= D.circunscripciones.length ? `En ${yes.length} de ${D.circunscripciones.length}: en todas menos ${y(no.map((c) => c.nombre))}.`
      : `En ${yes.length}: ${y(yes.map((c) => c.nombre))}.`;
    const alias = byName(yes.map((c) => [c.partidos[p.id], c.nombre]));
    if (alias.length) t += " Con otro nombre: " + alias.map(([n, cs]) => `${n} en ${y(cs)}`).join("; ") + ".";
    const inside = byName(D.circunscripciones.map((c) => [c.dentro[p.id], c.nombre]));
    if (inside.length) t += " Dentro de otra candidatura: " + inside.map(([n, cs]) => `${n} en ${y(cs)}`).join("; ") + ".";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${esc(p.nombre)}</td><td>${esc(t)}</td>`;
    tcirc.appendChild(tr);
  });
  $("m-corr").innerHTML = D.correcciones.length
    ? `<div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Qué cambió</th><th>Por qué y con qué fuente</th></tr></thead><tbody>` +
      D.correcciones.map((c) => `<tr><td>${fecha(c.fecha)}</td><td>${esc(c.cambio)}</td><td>${esc(c.motivo)}</td></tr>`).join("") + `</tbody></table></div>`
    : `<p class="small">Sin correcciones por ahora.</p>`;
})();
