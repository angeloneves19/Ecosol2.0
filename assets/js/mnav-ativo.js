/**
 * Marca a aba ativa no mobile-nav de acordo com a página atual.
 * Importar no final de cada script de página do painel.
 */
;(function marcarAbaAtiva() {
  const pagina = window.location.pathname.split('/').pop() || 'index.html'
  const mapa = {
    'painel.html':    'mnav-painel',
    'perfil.html':    'mnav-perfil',
    'itens.html':     'mnav-itens',
    'item-form.html': 'mnav-novo'
  }
  const id = mapa[pagina]
  if (!id) return
  const el = document.getElementById(id)
  if (el) {
    el.setAttribute('aria-current', 'page')
    // Remove eventual active em outros (safe-guard)
    document.querySelectorAll('.mobile-nav-item').forEach(a => {
      if (a.id !== id) a.removeAttribute('aria-current')
    })
  }
})()
