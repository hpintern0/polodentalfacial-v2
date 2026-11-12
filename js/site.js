/* Polo Dental Facial · comportamento do site, v4 "Catálogo de exposição" (sem bibliotecas).
   Igual à v1, menos a entrada animada ao rolar. As dúvidas usam <details> nativo
   (a resposta já está na página; o JS só registra o evento). */
(function () {
  'use strict';

  var cfgEl = document.getElementById('polo-config');
  var CFG = {};
  try { CFG = JSON.parse(cfgEl.textContent); } catch (e) {}
  var dl = (window.dataLayer = window.dataLayer || []);
  var gtag = window.gtag || function () { dl.push(arguments); };

  function lerLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravarLS(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function apagarLS(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function lerSS(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function gravarSS(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function cada(sel, fn, raiz) { Array.prototype.forEach.call((raiz || document).querySelectorAll(sel), fn); }

  /* ---------- consentimento (LGPD + Modo de Consentimento v2) ---------- */
  var CHAVE_COOKIES = 'polo_cookies';
  function consentiu() { return lerLS(CHAVE_COOKIES) === 'aceito'; }

  /* ---------- origem da visita (utm, gclid) ----------
     Sempre guardada na sessão (aba aberta). Com aceite de cookies, também no
     navegador por 90 dias. Uma nova visita com marcação substitui a anterior. */
  var CHAVES = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];
  var origem = null;
  try { origem = JSON.parse(lerSS('polo_origem') || 'null'); } catch (e) {}
  if (!origem && consentiu()) {
    try {
      var salvo = JSON.parse(lerLS('polo_origem') || 'null');
      if (salvo && salvo.expira > Date.now()) origem = salvo.dados;
    } catch (e) {}
  }
  origem = origem || {};
  (function () {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var novo = CHAVES.some(function (k) { return q.get(k); });
    if (novo) {
      origem = {};
      CHAVES.forEach(function (k) { var v = q.get(k); if (v) origem[k] = v.slice(0, 200); });
    }
    if (novo || !origem.entrada) {
      origem.entrada = location.pathname;
      origem.referrer = (document.referrer || '').slice(0, 300);
      origem.data = new Date().toISOString();
    }
  })();
  function salvarOrigem() {
    gravarSS('polo_origem', JSON.stringify(origem));
    if (consentiu()) gravarLS('polo_origem', JSON.stringify({ dados: origem, expira: Date.now() + 90 * 864e5 }));
  }
  salvarOrigem();

  function canal(o) {
    var s = (o.utm_source || '').toLowerCase();
    var m = (o.utm_medium || '').toLowerCase();
    var r = (o.referrer || '').toLowerCase();
    if (o.gclid || o.gbraid || o.wbraid) return 'google-ads';
    if (s === 'google') return /cpc|ppc|paid|ads/.test(m) ? 'google-ads' : 'google-organico';
    if (/instagram|^ig$/.test(s) || /instagram\.com/.test(r)) return 'instagram';
    if (/facebook|^fb$|meta/.test(s) || /facebook\.com|fb\.com/.test(r)) return 'facebook';
    if (s) return s;
    if (/google\./.test(r)) return 'google-organico';
    if (r && r.indexOf(location.hostname) === -1) return 'outro-site';
    return 'direto';
  }

  /* ---------- WhatsApp ---------- */
  function abertura() {
    var A = CFG.msg.abertura;
    if (CFG.pagina === 'campos') return A.camposDeJulio;
    var c = canal(origem);
    return c === 'google-ads' || c === 'google-organico' ? A.google : A.padrao;
  }
  function mensagem(tratamento) {
    var P = CFG.msg.pedido;
    return abertura() + (tratamento ? P.tratamento.replace('{tratamento}', tratamento) : P.avaliacao);
  }
  function linkWa(texto) {
    return 'https://wa.me/' + (CFG.whatsapp || '') + '?text=' + encodeURIComponent(texto);
  }

  var waPendente = CFG.pagina === 'obrigado' ? lerSS('polo_wa') : null;
  cada('.js-wa', function (a) {
    var trat = a.getAttribute('data-tratamento') || '';
    var fixo = a.id === 'obrigado-wa' && waPendente;
    if (fixo) a.href = waPendente;
    else a.href = linkWa(mensagem(trat));
    a.addEventListener('click', function () {
      if (!fixo) a.href = linkWa(mensagem(trat));
      dl.push({ event: 'clique_whatsapp', posicao: a.getAttribute('data-posicao') || '', tratamento: trat });
    });
  });
  if (CFG.pagina === 'obrigado') {
    dl.push({ event: 'pagina_obrigado' });
    var aviso = document.getElementById('obrigado-bloqueado');
    if (waPendente && aviso) aviso.hidden = false;
  }

  /* ---------- telefone, dúvidas, mapa, vídeo ---------- */
  document.addEventListener('click', function (e) {
    var alvo = e.target;
    if (!alvo.closest) return;
    if (alvo.closest('a[href^="tel:"]')) dl.push({ event: 'clique_telefone' });

    var bMapa = alvo.closest('[data-mapa]');
    if (bMapa) {
      var caixa = bMapa.closest('.mapa');
      var f = document.createElement('iframe');
      f.src = bMapa.getAttribute('data-mapa');
      f.title = 'Mapa da Polo Dental Facial em Sapezal';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.allowFullscreen = true;
      caixa.innerHTML = '';
      caixa.appendChild(f);
    }

    var bVideo = alvo.closest('[data-youtube]');
    if (bVideo) {
      var v = document.createElement('iframe');
      v.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(bVideo.getAttribute('data-youtube')) + '?autoplay=1&rel=0';
      v.title = 'Depoimento em vídeo';
      v.allow = 'autoplay; encrypted-media; picture-in-picture';
      v.allowFullscreen = true;
      bVideo.parentNode.replaceChild(v, bVideo);
    }
  });
  cada('details.duvida', function (d) {
    d.addEventListener('toggle', function () {
      // sem o texto da pergunta: algumas citam condições de saúde (diabetes, pouco osso)
      if (d.open) dl.push({ event: 'abriu_duvida' });
    });
  });

  /* ---------- menu do celular e sombra do topo ---------- */
  var topo = document.getElementById('topo');
  var botaoMenu = topo && topo.querySelector('.topo__menu');
  function fecharMenu() {
    topo.classList.remove('aberto');
    botaoMenu.setAttribute('aria-expanded', 'false');
    botaoMenu.setAttribute('aria-label', 'Abrir menu');
  }
  if (botaoMenu) {
    botaoMenu.addEventListener('click', function () {
      var abrir = !topo.classList.contains('aberto');
      topo.classList.toggle('aberto', abrir);
      botaoMenu.setAttribute('aria-expanded', String(abrir));
      botaoMenu.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
    });
    cada('.topo__nav a', function (a) { a.addEventListener('click', fecharMenu); }, topo);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && topo.classList.contains('aberto')) { fecharMenu(); botaoMenu.focus(); }
    });
  }
  if (topo) {
    var rolou = null;
    var aoRolar = function () {
      var r = window.scrollY > 8;
      if (r !== rolou) { rolou = r; topo.classList.toggle('rolou', r); }
    };
    window.addEventListener('scroll', aoRolar, { passive: true });
    aoRolar();
  }

  /* ---------- barra fixa do celular: aparece quando o topo da página sai da tela ---------- */
  var barra = document.getElementById('barra-fixa');
  var hero = document.getElementById('inicio');
  if (barra && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      var fora = !es[0].isIntersecting;
      barra.classList.toggle('visivel', fora);
      document.body.classList.toggle('barra-ativa', fora);
    }).observe(hero);
  }

  /* ---------- faixa de campanha ---------- */
  var camp = document.getElementById('campanha');
  if (camp) {
    var ate = camp.getAttribute('data-ate');
    var expirou = ate && new Date(ate + 'T23:59:59') < new Date();
    if (expirou || lerSS('polo_campanha_fechada')) camp.hidden = true;
    var fx = camp.querySelector('.campanha__fechar');
    if (fx) fx.addEventListener('click', function () { camp.hidden = true; gravarSS('polo_campanha_fechada', '1'); });
  }

  /* ---------- aviso de cookies ---------- */
  var banner = document.getElementById('cookies');
  function mostrarCookies(v) {
    if (!banner) return;
    banner.hidden = !v;
    document.body.classList.toggle('cookies-abertas', v);
  }
  if (!lerLS(CHAVE_COOKIES)) mostrarCookies(true);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-cookies]');
    if (!b) return;
    var acao = b.getAttribute('data-cookies');
    if (acao === 'abrir') {
      mostrarCookies(true);
      var primeiro = banner && banner.querySelector('button');
      if (primeiro) primeiro.focus();
      return;
    }
    var aceito = acao === 'aceitar';
    var estado = aceito ? 'granted' : 'denied';
    gravarLS(CHAVE_COOKIES, aceito ? 'aceito' : 'recusado');
    gtag('consent', 'update', { ad_storage: estado, ad_user_data: estado, ad_personalization: estado, analytics_storage: estado });
    dl.push({ event: aceito ? 'consentimento_aceito' : 'consentimento_recusado' });
    if (aceito) salvarOrigem(); else apagarLS('polo_origem');
    mostrarCookies(false);
  });

  /* ---------- formulário ---------- */
  var form = document.getElementById('form-avaliacao');
  if (form) {
    var tel = form.querySelector('#f-whats');
    var erro = document.getElementById('form-erro');
    var mascara = function (v) {
      var d = v.replace(/\D/g, '').slice(0, 11);
      if (!d) return '';
      if (d.length < 3) return '(' + d;
      var resto = d.slice(2);
      var r = '(' + d.slice(0, 2) + ') ';
      if (d.length <= 10) r += resto.slice(0, 4) + (resto.length > 4 ? '-' + resto.slice(4) : '');
      else r += resto.slice(0, 5) + '-' + resto.slice(5);
      return r;
    };
    tel.addEventListener('input', function () { tel.value = mascara(tel.value); });

    var preencherOcultos = function () {
      ['utm_source', 'utm_medium', 'utm_campaign', 'gclid'].forEach(function (k) {
        var i = form.querySelector('[name="' + k + '"]');
        if (i) i.value = origem[k] || '';
      });
      form.querySelector('[name="pagina"]').value = location.href.split('#')[0];
    };
    preencherOcultos();

    form.addEventListener('change', function (e) {
      var c = e.target.closest('.campo');
      if (c) c.classList.remove('erro');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valor = function (n) { var el = form.querySelector('[name="' + n + '"]:checked'); return el ? el.value : ''; };
      var nome = form.querySelector('[name="nome"]').value.trim();
      var whats = tel.value.replace(/\D/g, '');
      var cidade = valor('cidade');
      var problema = valor('problema');
      var lgpd = form.querySelector('[name="consentimento"]').checked;

      var faltas = [];
      if (nome.length < 2) faltas.push(['nome', 'seu nome']);
      if (whats.length < 10) faltas.push(['whatsapp', 'o WhatsApp com DDD']);
      if (!cidade) faltas.push(['cidade', 'a cidade']);
      if (!problema) faltas.push(['problema', 'o que você quer resolver']);
      if (!lgpd) faltas.push(['consentimento', 'a autorização de contato']);
      ['nome', 'whatsapp', 'cidade', 'problema', 'consentimento'].forEach(function (n) {
        var c = form.querySelector('[name="' + n + '"]').closest('.campo');
        if (c) c.classList.toggle('erro', faltas.some(function (f) { return f[0] === n; }));
      });
      if (faltas.length) {
        erro.textContent = 'Falta preencher: ' + faltas.map(function (f) { return f[1]; }).join(', ') + '.';
        form.querySelector('[name="' + faltas[0][0] + '"]').focus();
        return;
      }
      erro.textContent = '';
      preencherOcultos();

      var texto = abertura() + CFG.msg.pedido.avaliacao +
        '\nNome: ' + nome + '\nCidade: ' + cidade + '\nO que quero resolver: ' + problema;
      var url = linkWa(texto);

      // 1. dados para o CRM (sem esperar resposta, para não travar o WhatsApp)
      if (CFG.webhook) {
        var dados = {
          nome: nome, whatsapp: whats, cidade: cidade, problema: problema, consentimento: true,
          canal: canal(origem), utm_source: origem.utm_source || '', utm_medium: origem.utm_medium || '',
          utm_campaign: origem.utm_campaign || '', gclid: origem.gclid || '', pagina: location.href.split('#')[0],
          entrada: origem.entrada || '', referrer: origem.referrer || '', enviado_em: new Date().toISOString()
        };
        try {
          var corpo = JSON.stringify(dados);
          var foi = navigator.sendBeacon && navigator.sendBeacon(CFG.webhook, new Blob([corpo], { type: 'text/plain;charset=UTF-8' }));
          if (!foi) fetch(CFG.webhook, { method: 'POST', body: corpo, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=UTF-8' } });
        } catch (err) {}
      }
      // as respostas do formulário não vão para o Google
      dl.push({ event: 'envio_formulario' });
      dl.push({ event: 'generate_lead' });

      // 2. WhatsApp com as respostas (abre na hora do clique, para não ser bloqueado)
      gravarSS('polo_wa', url);
      var janela = null;
      try { janela = window.open(url, '_blank'); if (janela) janela.opener = null; } catch (err) {}

      // 3. página de obrigado (conversão)
      setTimeout(function () { location.href = CFG.obrigado; }, janela ? 400 : 0);
    });
  }
})();
