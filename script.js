/**
 * KOBRA LANDING PAGE — script.js
 * GSAP ScrollTrigger + Intersection Observer + Form Validation
 */

/* ============================================================
   1. HEADER SCROLL BEHAVIOR
   ============================================================ */
(function initHeader() {
  const header = document.getElementById('header');
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');

  // Header frosted glass branco por padrão (fundo do hero é claro)
  // .scrolled adiciona box-shadow de elevação
  function handleScroll() {
    if (window.scrollY > 60) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Hamburger menu toggle
  menuToggle.addEventListener('click', function () {
    const isOpen = navMenu.classList.toggle('open');
    this.setAttribute('aria-expanded', isOpen);
  });

  // Fechar menu ao clicar em link
  navMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Smooth scroll com offset para o header fixo
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = 72;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });
})();


/* ============================================================
   2. HERO ANIMATIONS — Scroll-Driven Video Scrubbing
   ============================================================ */
(function initHero() {

  /* ── Referências ── */
  var video       = document.getElementById('heroVideo');
  var container   = document.getElementById('heroPinContainer');
  var heroTagline = document.getElementById('heroTagline');
  var heroHeadline= document.getElementById('heroHeadline');
  var heroSub     = document.getElementById('heroSub');
  var heroCtas    = document.getElementById('heroCtas');
  var heroStats   = document.getElementById('heroStats');
  var scrollInd   = document.getElementById('scrollIndicator');

  if (!video || !container) return;

  // Garante que o vídeo nunca tente tocar sozinho em autoplay
  video.pause();

  /* ── Estado do scrubbing ── */
  var rafId         = null;
  var targetTime    = 0;   // currentTime alvo proporcional ao scroll
  var currentTime   = 0;   // currentTime suavizado (interpolado via lerp)
  var videoDuration = 0;
  var isReady       = false;

  // Limite mínimo de diferença antes de disparar um novo seek.
  // Evita seeks microscópicos (~1 frame a 30fps) que sobrecarregam o decoder.
  var SEEK_THRESHOLD = 1 / 30;

  // Salto máximo de currentTime permitido por frame de rAF.
  // Evita que um "fling" de scroll rápido force um seek gigante para trás,
  // que é a operação mais cara (decodificar desde o keyframe anterior)
  // e é a principal causa de a página "congelar" e o scroll parecer travado.
  var MAX_JUMP_PER_FRAME = 0.35;

  /* ── Calcula progresso do scroll estritamente dentro da seção Hero ── */
  function getScrollProgress() {
    var heroRect = container.getBoundingClientRect();
    var scrollDistance = container.offsetHeight - window.innerHeight;
    if (scrollDistance <= 0) return 0;
    return Math.min(Math.max(-heroRect.top / scrollDistance, 0), 1);
  }

  /* ── Loop contínuo de animação via requestAnimationFrame ── */
  function animLoop() {
    if (isReady && videoDuration > 0) {
      var progress = getScrollProgress();
      targetTime = progress * videoDuration;

      // Interpolação suave (fator menor = mais suave, menos exigente pro decoder)
      currentTime += (targetTime - currentTime) * 0.08;

      // Clampa o salto por frame para nunca pedir um seek muito longe do
      // ponto atual do vídeo — protege contra scroll rápido/fling.
      var videoNow = video.currentTime;
      var delta = currentTime - videoNow;
      if (delta > MAX_JUMP_PER_FRAME) currentTime = videoNow + MAX_JUMP_PER_FRAME;
      if (delta < -MAX_JUMP_PER_FRAME) currentTime = videoNow - MAX_JUMP_PER_FRAME;

      // Só dispara um novo seek se:
      //   1) o vídeo não estiver no meio de outro seek (video.seeking)
      //   2) já houver dados decodificados suficientes (readyState >= 2)
      //   3) a diferença for perceptível (evita seeks de fração de frame)
      // Sem essas 3 guardas, seeks se acumulam numa fila e bloqueiam a
      // thread principal — é isso que trava o scroll e "prende" a página
      // dentro da seção hero.
      if (
        !video.seeking &&
        video.readyState >= 2 &&
        Math.abs(videoNow - currentTime) > SEEK_THRESHOLD
      ) {
        try {
          video.currentTime = currentTime;
        } catch (err) {
          // Seek fora do range "seekable" (ex.: vídeo ainda bufferizando) — ignora com segurança
        }
      }

      // Oculta indicador de scroll quando o usuário inicia a rolagem
      if (scrollInd) {
        scrollInd.classList.toggle('is-hidden', progress > 0.02);
      }
    }

    rafId = requestAnimationFrame(animLoop);
  }

  /* ── Inicializa quando os metadados do vídeo estiverem disponíveis ── */
  function onVideoReady() {
    if (isFinite(video.duration) && video.duration > 0) {
      videoDuration = video.duration;
      video.currentTime = 0;
      video.pause();
      isReady = true;
    }
  }

  if (video.readyState >= 1 && isFinite(video.duration) && video.duration > 0) {
    onVideoReady();
  } else {
    video.addEventListener('loadedmetadata', onVideoReady, { once: true });
    video.addEventListener('loadeddata', onVideoReady, { once: true });
    video.addEventListener('canplay', onVideoReady, { once: true });
    video.addEventListener('canplaythrough', onVideoReady, { once: true });
  }

  // Inicia o loop contínuo de renderização
  rafId = requestAnimationFrame(animLoop);

  // Força carregamento do recurso
  try {
    video.load();
  } catch (err) {
    console.warn('Hero video preload notice:', err);
  }

  /* ── Animações de entrada do conteúdo de texto ── */
  function animateTextIn() {
    var els = [heroTagline, heroHeadline, heroSub, heroCtas, heroStats];
    var delays = [0.3, 0.55, 0.8, 1.0, 1.2];

    if (typeof gsap !== 'undefined') {
      var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.to(heroTagline,  { opacity: 1, y: 0, duration: 0.8 }, delays[0])
        .to(heroHeadline, { opacity: 1, y: 0, duration: 0.9 }, delays[1])
        .to(heroSub,      { opacity: 1, y: 0, duration: 0.8 }, delays[2])
        .to(heroCtas,     { opacity: 1, y: 0, duration: 0.7 }, delays[3])
        .to(heroStats,    { opacity: 1, y: 0, duration: 0.6 }, delays[4]);
    } else {
      // Fallback CSS sem GSAP
      els.forEach(function (el, i) {
        if (!el) return;
        setTimeout(function () {
          el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
          el.style.opacity    = '1';
          el.style.transform  = 'none';
        }, delays[i] * 1000);
      });
    }
  }

  // Dispara animação de entrada do texto
  if (document.readyState === 'complete') {
    setTimeout(animateTextIn, 150);
  } else {
    window.addEventListener('load', function () {
      setTimeout(animateTextIn, 150);
    });
  }

  /* ── Limpeza do rAF ao sair da página ── */
  window.addEventListener('beforeunload', function () {
    if (rafId) cancelAnimationFrame(rafId);
  });

})();



/* ============================================================
   3. DIMENSIONS SECTION — Tab Switcher
   ============================================================ */
(function initDimensionsSection() {

  var shapeTabs   = document.querySelectorAll('.dim-shape-tab');
  var shapePanels = document.querySelectorAll('.dim-panel');

  if (!shapeTabs.length) return;

  /* ── Troca de formato (Round / Rectangular / Oblong) ── */
  shapeTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var shape = this.dataset.shape;

      // Atualizar tabs de formato
      shapeTabs.forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');

      // Atualizar painéis
      shapePanels.forEach(function (p) { p.classList.remove('active'); });
      var target = document.getElementById('panel-' + shape);
      if (target) target.classList.add('active');
    });
  });

  /* ── Troca de material (Polyethylene / PP Blend) — delegada ao documento ── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.dim-mat-tab');
    if (!btn) return;

    var matId   = btn.dataset.mat;
    var panel   = btn.closest('.dim-panel-inner');
    if (!panel) return;

    // Atualizar sub-abas dentro do painel atual
    panel.querySelectorAll('.dim-mat-tab').forEach(function (t) {
      t.classList.remove('active');
    });
    btn.classList.add('active');

    // Atualizar tabelas dentro do painel atual
    panel.querySelectorAll('.dim-table-panel').forEach(function (tp) {
      tp.classList.remove('active');
    });
    var targetTable = document.getElementById(matId);
    if (targetTable) targetTable.classList.add('active');
  });

})();



/* ============================================================
   4. SCROLL REVEAL — Intersection Observer
   ============================================================ */
(function initScrollReveal() {
  const revealEls = document.querySelectorAll(
    '.reveal-up, .reveal-left, .reveal-right'
  );

  if (!revealEls.length) return;

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;

      const el = entry.target;
      const delay = parseInt(el.dataset.delay || '0', 10);

      setTimeout(function () {
        el.classList.add('visible');
      }, delay);

      observer.unobserve(el);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealEls.forEach(function (el) {
    observer.observe(el);
  });
})();


/* ============================================================
   4. PRODUCT CARDS — TILT 3D HOVER
   ============================================================ */
(function initTiltCards() {
  const cards = document.querySelectorAll('.tilt-card');

  // Desativar em touch devices
  const isTouch = window.matchMedia('(hover: none)').matches;
  if (isTouch) return;

  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;

      card.style.transform = [
        'perspective(800px)',
        'rotateX(' + rotateX + 'deg)',
        'rotateY(' + rotateY + 'deg)',
        'translateZ(6px)',
        'scale(1.02)'
      ].join(' ');
      card.style.transition = 'transform 0.1s ease';
    });

    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
      card.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    });
  });
})();


/* ============================================================
   5. CONTACT FORM — Validation & Submit
   ============================================================ */
(function initContactForm() {
  const form = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');
  const submitBtn = document.getElementById('submitBtn');
  if (!form) return;

  function validateField(field) {
    const errorEl = document.getElementById(field.id + '-error');
    let message = '';

    if (field.required && !field.value.trim()) {
      message = 'Este campo é obrigatório.';
    } else if (field.type === 'email' && field.value.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(field.value.trim())) {
        message = 'Insira um e-mail válido.';
      }
    }

    if (errorEl) errorEl.textContent = message;

    if (message) {
      field.classList.add('error');
      return false;
    } else {
      field.classList.remove('error');
      return true;
    }
  }

  // Validação em tempo real (blur)
  const requiredFields = form.querySelectorAll('[required]');
  requiredFields.forEach(function (field) {
    field.addEventListener('blur', function () {
      validateField(field);
    });
    field.addEventListener('input', function () {
      if (field.classList.contains('error')) validateField(field);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Validar todos os campos obrigatórios
    let valid = true;
    requiredFields.forEach(function (field) {
      if (!validateField(field)) valid = false;
    });

    if (!valid) {
      // Focar no primeiro campo inválido
      const firstError = form.querySelector('.form-input.error');
      if (firstError) firstError.focus();
      return;
    }

    // Coletar dados
    const formData = new FormData(form);

    // Envio real via Netlify Forms (fetch AJAX)
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').style.display = 'none';
    submitBtn.querySelector('.btn-loading').style.display = 'inline';
    submitBtn.style.opacity = '0.7';

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString()
    })
      .then(function () {
        form.style.display = 'none';
        formSuccess.style.display = 'block';
        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(function (err) {
        console.error('Erro ao enviar formulário:', err);
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').style.display = 'inline';
        submitBtn.querySelector('.btn-loading').style.display = 'none';
        submitBtn.style.opacity = '1';
        alert('Não foi possível enviar sua solicitação agora. Tente novamente ou escreva para contato@kobratec.com.br.');
      });
  });
})();


/* ============================================================
   6. FEATURE CARDS — Animação staggered com IntersectionObserver
   ============================================================ */
(function initFeatureCards() {
  const featureCards = document.querySelectorAll('.feature-card');
  if (!featureCards.length) return;

  featureCards.forEach(function (card) {
    card.style.opacity = '0';
    card.style.transform = 'translateX(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  });

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      const index = parseInt(card.dataset.index || '0', 10);
      setTimeout(function () {
        card.style.opacity = '1';
        card.style.transform = 'none';
      }, index * 150);
      observer.unobserve(card);
    });
  }, { threshold: 0.2 });

  featureCards.forEach(function (card) {
    observer.observe(card);
  });
})();


/* ============================================================
   7. MATERIAL BADGES — contador animado ao entrar na viewport
   ============================================================ */
(function initMaterialBadges() {
  const badges = document.querySelectorAll('.material-badge');
  if (!badges.length) return;

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.style.animation = 'none';
      // Trigger reflow
      void entry.target.offsetWidth;
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.3 });

  badges.forEach(function (badge) { observer.observe(badge); });
})();


/* ============================================================
   8. ACTIVE NAV LINK — highlight conforme seção visível
   ============================================================ */
(function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach(function (link) {
        link.style.color = '';
        link.style.fontWeight = '';
        if (link.getAttribute('href') === '#' + id) {
          link.style.color = 'var(--kobra-green)';
        }
      });
    });
  }, { threshold: 0.4 });

  sections.forEach(function (section) { observer.observe(section); });
})();


/* ============================================================
   9. PERFORMANCE: Lazy load fallback para navegadores antigos
   ============================================================ */
(function initLazyLoad() {
  if ('loading' in HTMLImageElement.prototype) return; // suportado nativamente

  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  if (!lazyImages.length) return;

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      if (img.dataset.src) img.src = img.dataset.src;
      observer.unobserve(img);
    });
  });

  lazyImages.forEach(function (img) { observer.observe(img); });
})();
