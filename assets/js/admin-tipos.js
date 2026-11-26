import { supabase } from './supabase.js'
import { usuarioLogado, ehAdministrador, ligarBotaoSair } from './sessao.js'

function escapar(texto) {
  const d = document.createElement('div')
  d.textContent = texto == null ? '' : texto
  return d.innerHTML
}

function toastErro(msg) {
  const el = document.createElement('div')
  el.className = 'aviso erro'
  el.textContent = msg
  el.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;max-width:380px;box-shadow:0 4px 16px rgba(0,0,0,.2)'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 5000)
}

const paineis = document.querySelectorAll('.painel.painel-tipos')
const [painelProduto, painelServico, painelCategoria] = paineis

async function iniciar() {
  const usuario = await usuarioLogado()
  if (!usuario || !(await ehAdministrador(usuario.id))) {
    document.querySelector('main').innerHTML =
      '<div class="situacao"><h1 class="titulo-pagina">Acesso restrito</h1>' +
      '<p>Esta área é exclusiva da administração.</p>' +
      '<div class="acoes centralizado"><a class="botao" href="entrar.html">Entrar</a></div></div>'
    return
  }
  const nomeEl = document.getElementById('topo-nome') || document.querySelector('.quem .apagado')
  if (nomeEl) nomeEl.textContent = usuario.nome || usuario.email
  ligarBotaoSair()
  ligarAbas()
  await carregarTudo()
}

function ligarAbas() {
  const abas = document.querySelectorAll('.abas a')
  paineis.forEach((p, i) => {
    p.style.display = i === 0 ? '' : 'none'
  })
  abas.forEach((aba, i) => {
    aba.addEventListener('click', (e) => {
      e.preventDefault()
      abas.forEach(a => a.removeAttribute('aria-current'))
      aba.setAttribute('aria-current', 'page')
      paineis.forEach(p => p.style.display = 'none')
      paineis[i].style.display = ''
    })
  })
}

async function carregarTudo() {
  await Promise.all([
    carregarTipos(painelProduto, 1),
    carregarTipos(painelServico, 2),
    carregarCategorias()
  ])
}

function limparLinhas(painel) {
  const form = painel.querySelector('.adicionar-rapido')
  if (!form) return
  let next = form.nextElementSibling
  while (next) {
    const toRemove = next
    next = next.nextElementSibling
    toRemove.remove()
  }
}

function renderLinha(registro, painel, aoRenomear, aoExcluir) {
  const div = document.createElement('div')
  div.className = 'linha-simples'
  div.dataset.id = registro.id
  div.innerHTML = `
    <span>${escapar(registro.nome)}</span>
    <div class="botoes">
      <button class="botao vazado pequeno" type="button" data-acao="renomear">Renomear</button>
      <button class="botao perigo pequeno" type="button" data-acao="excluir">Excluir</button>
    </div>`
  div.querySelector('[data-acao="renomear"]').addEventListener('click', () => aoRenomear(registro, div))
  div.querySelector('[data-acao="excluir"]').addEventListener('click', () => aoExcluir(registro, div))
  painel.append(div)
}

async function carregarTipos(painel, idNatureza) {
  limparLinhas(painel)

  const { data, error } = await supabase
    .from('tipo_de_item')
    .select('id, nome')
    .eq('id_natureza', idNatureza)
    .order('nome')

  if (error) {
    const p = document.createElement('p')
    p.className = 'aviso erro'
    p.textContent = 'Erro ao carregar: ' + error.message
    painel.append(p)
    return
  }

  if (!data.length) {
    const p = document.createElement('p')
    p.className = 'apagado'
    p.textContent = 'Nenhum tipo ainda.'
    painel.append(p)
  }

  for (const tipo of data) {
    renderLinha(tipo, painel,
      async (t) => {
        const novo = prompt('Novo nome:', t.nome)
        if (!novo || novo.trim() === t.nome) return
        const { error } = await supabase.from('tipo_de_item').update({ nome: novo.trim() }).eq('id', t.id)
        if (error) { toastErro('Erro ao renomear: ' + error.message); return }
        await carregarTipos(painel, idNatureza)
      },
      async (t) => {
        if (!confirm(`Excluir "${t.nome}"?`)) return
        const { error } = await supabase.from('tipo_de_item').delete().eq('id', t.id)
        if (error) { toastErro('Erro ao excluir: ' + error.message); return }
        await carregarTipos(painel, idNatureza)
      }
    )
  }

  ligarFormAdicionar(painel, async (nome) => {
    const { error } = await supabase.from('tipo_de_item').insert({ nome, id_natureza: idNatureza })
    if (error) throw error
    await carregarTipos(painel, idNatureza)
  })
}

async function carregarCategorias() {
  const painel = painelCategoria
  limparLinhas(painel)

  const { data, error } = await supabase
    .from('categoria_de_empreendimento')
    .select('id, nome')
    .order('nome')

  if (error) {
    const p = document.createElement('p')
    p.className = 'aviso erro'
    p.textContent = 'Erro ao carregar: ' + error.message
    painel.append(p)
    return
  }

  if (!data.length) {
    const p = document.createElement('p')
    p.className = 'apagado'
    p.textContent = 'Nenhuma categoria ainda.'
    painel.append(p)
  }

  for (const cat of data) {
    renderLinha(cat, painel,
      async (c) => {
        const novo = prompt('Novo nome:', c.nome)
        if (!novo || novo.trim() === c.nome) return
        const { error } = await supabase.from('categoria_de_empreendimento').update({ nome: novo.trim() }).eq('id', c.id)
        if (error) { toastErro('Erro ao renomear: ' + error.message); return }
        await carregarCategorias()
      },
      async (c) => {
        if (!confirm(`Excluir "${c.nome}"?`)) return
        const { error } = await supabase.from('categoria_de_empreendimento').delete().eq('id', c.id)
        if (error) { toastErro('Erro ao excluir: ' + error.message); return }
        await carregarCategorias()
      }
    )
  }

  ligarFormAdicionar(painel, async (nome) => {
    const { error } = await supabase.from('categoria_de_empreendimento').insert({ nome })
    if (error) throw error
    await carregarCategorias()
  })
}

function ligarFormAdicionar(painel, aoSalvar) {
  const form = painel.querySelector('.adicionar-rapido')
  if (!form || form.dataset.ligado) return
  form.dataset.ligado = '1'

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const input = form.querySelector('input[type="text"]')
    const nome = input.value.trim()
    if (!nome) return
    const botao = form.querySelector('button[type="submit"]')
    botao.disabled = true
    botao.textContent = 'Adicionando...'
    try {
      await aoSalvar(nome)
      input.value = ''
    } catch (erro) {
      const jaDupe = erro.code === '23505' || (erro.message || '').toLowerCase().includes('duplicate key')
      const msgErro = jaDupe
        ? 'Já existe um item com esse nome nesta categoria.'
        : 'Não foi possível adicionar: ' + erro.message
      let errEl = form.querySelector('.form-erro-add')
      if (!errEl) {
        errEl = document.createElement('p')
        errEl.className = 'aviso erro form-erro-add'
        errEl.style.cssText = 'margin-top:10px;font-size:.85rem'
        botao.after(errEl)
      }
      errEl.textContent = msgErro
      clearTimeout(errEl._timer)
      errEl._timer = setTimeout(() => errEl.remove(), 6000)
    } finally {
      botao.disabled = false
      botao.textContent = 'Adicionar'
    }
  })
}

iniciar()