import { supabase } from './supabase.js'

// ── Intercepta link de recuperação de senha ─────────────────
// Quando o Supabase redireciona sem redirectTo customizado,
// o usuário cai no index.html#access_token=...&type=recovery
;(function interceptarRecuperacao() {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  if (hash.get('type') === 'recovery' && hash.get('access_token')) {
    // Supabase JS já parseou o token; redireciona para a página de redefinição
    window.location.replace('pages/redefinir-senha.html?recovery=1')
  }
})()

// ── Carrossel e textos dinâmicos ────────────────────────────
;(async () => {
  const { data: cfg } = await supabase
    .from('config_home')
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!cfg) return

  // Título e subtítulo do hero
  if (cfg.hero_titulo) {
    const h1 = document.querySelector('.hero-texto h1')
    if (h1) h1.textContent = cfg.hero_titulo
  }
  if (cfg.hero_subtitulo) {
    const p = document.querySelector('.hero-texto > p:not(.hero-eyebrow)')
    if (p) p.textContent = cfg.hero_subtitulo
  }

  // Banner
  if (cfg.banner_texto) {
    const el = document.getElementById('banner-p')
    if (el) el.textContent = cfg.banner_texto
  }
  if (cfg.banner_cta) {
    const el = document.getElementById('banner-cta-link')
    if (el) el.textContent = cfg.banner_cta + ' →'
  }

  // Carrossel de imagens
  const imagens = Array.isArray(cfg.hero_imagens) && cfg.hero_imagens.length
    ? cfg.hero_imagens
    : cfg.hero_imagem ? [cfg.hero_imagem] : []

  if (!imagens.length) return

  const carrossel = document.getElementById('hero-carrossel')
  const dotsDiv   = document.getElementById('hero-dots')
  if (!carrossel) return

  // Injeta slides: foto como fundo full-bleed do hero
  carrossel.innerHTML = imagens.map((url, i) =>
    `<div class="hero-slide${i === 0 ? ' ativo' : ''}" style="background-image:url('${url}')"></div>`
  ).join('')

  if (imagens.length < 2) return   // 1 imagem = estática, sem dots

  // Injeta dots
  if (dotsDiv) {
    dotsDiv.innerHTML = imagens.map((_, i) =>
      `<button class="hero-dot${i === 0 ? ' ativo' : ''}" data-i="${i}" aria-label="Ir para imagem ${i + 1}"></button>`
    ).join('')
  }

  let atual = 0
  const slides = carrossel.querySelectorAll('.hero-slide')
  const dots   = dotsDiv ? dotsDiv.querySelectorAll('.hero-dot') : []

  function irPara(idx) {
    slides[atual].classList.remove('ativo')
    if (dots[atual]) dots[atual].classList.remove('ativo')
    atual = idx
    slides[atual].classList.add('ativo')
    if (dots[atual]) dots[atual].classList.add('ativo')
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      clearInterval(timer)
      irPara(parseInt(dot.dataset.i))
      timer = setInterval(avancar, 4500)
    })
  })

  function avancar() { irPara((atual + 1) % imagens.length) }
  let timer = setInterval(avancar, 4500)
})()

// ── Busca e interações da home ──────────────────────────────
function buscarDaHome() {
  const q = document.getElementById('hero-busca-input').value.trim()
  if (q) window.location.href = 'index.html?q=' + encodeURIComponent(q)
}

function filtrarNatureza(natureza) {
  window.location.href = 'index.html?natureza=' + natureza
}

document.getElementById('hero-busca-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') buscarDaHome()
})
document.getElementById('btn-buscar-home').addEventListener('click', buscarDaHome)
document.getElementById('tag-produtos').addEventListener('click', () => filtrarNatureza('produto'))
document.getElementById('tag-servicos').addEventListener('click', () => filtrarNatureza('servico'))
document.getElementById('tag-categorias').addEventListener('click', () => {
  document.getElementById('secao-categorias').scrollIntoView({ behavior: 'smooth' })
})
document.getElementById('tag-resultados').addEventListener('click', () => {
  document.getElementById('secao-resultados').scrollIntoView({ behavior: 'smooth' })
})

const overlay = document.getElementById('menu-overlay')

function fecharMenu() {
  overlay.classList.remove('aberto')
  document.body.style.overflow = ''
}

document.getElementById('btn-menu').addEventListener('click', () => {
  overlay.classList.add('aberto')
  document.body.style.overflow = 'hidden'
})
document.getElementById('btn-fechar-menu').addEventListener('click', fecharMenu)
overlay.addEventListener('click', e => { if (e.target === overlay) fecharMenu() })
document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharMenu() })