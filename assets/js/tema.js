;(function () {
  const CHAVE = 'trama-tema'
  function aplicar(tema) {
    const radio = document.getElementById('tema-' + tema)
    if (radio) radio.checked = true
  }
  const salvo = localStorage.getItem(CHAVE)
  if (salvo) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => aplicar(salvo))
    } else {
      aplicar(salvo)
    }
  }
  document.addEventListener('change', (e) => {
    const input = e.target
    if (input.name === 'tema') {
      localStorage.setItem(CHAVE, input.id.replace('tema-', ''))
    }
  })
})()
