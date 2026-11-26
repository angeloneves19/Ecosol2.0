import { supabase } from './supabase.js'
import { meuEmpreendimento, ligarBotaoSair } from './sessao.js'

const mnavSair = document.getElementById('mnav-sair-emp')
if (mnavSair) {
  mnavSair.addEventListener('click', e => {
    e.preventDefault()
    document.getElementById('btn-sair').click()
  })
}

let todosItens = []
let filtroAtual = 'todos'

function renderTabela(itens) {
  const tbody = document.getElementById('tabela-itens')
  const q = document.getElementById('busca-meus-itens').value.toLowerCase()
  const filtrados = itens.filter(it => {
    const passaSit = filtroAtual === 'todos' || String(it.id_situacao) === filtroAtual
    const passaBusca = !q || it.nome.toLowerCase().includes(q)
    return passaSit && passaBusca
  })

  if (!filtrados.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="vazio"><p>Nenhum item encontrado.</p></div></td></tr>'
    return
  }

  const sitMap = { 1: ['warn', 'Pendente'], 2: ['ok', 'Disponível'], 3: ['dead', 'Excluído'], 4: ['off', 'Suspenso'], 5: ['bad', 'Recusado'] }

  tbody.innerHTML = filtrados.map(it => {
    const [cls, label] = sitMap[it.id_situacao] || ['off', '—']
    return `<tr>
      <td>
        <div style="width:36px;height:36px;background:var(--surface2);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--muted)">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </div>
      </td>
      <td><strong>${it.nome}</strong></td>
      <td><span style="font-size:.82rem;color:var(--muted)">${it.tipo_de_item?.nome || '—'}</span></td>
      <td><span class="badge ${cls} dot">${label}</span></td>
      <td><span style="font-size:.82rem;color:var(--muted)">${new Date(it.criado_em).toLocaleDateString('pt-BR')}</span></td>
      <td>
        <div class="acoes-tabela">
          <a href="item-form.html?id=${it.id}" class="botao vazado pequeno">Editar</a>
          <a href="item.html?id=${it.id}" class="botao ghost pequeno">Ver</a>
        </div>
      </td>
    </tr>`
  }).join('')
}

async function init() {
  const dados = await meuEmpreendimento()
  if (!dados?.empreendimento) { window.location.href = 'cadastrar.html'; return }

  const { usuario: info, empreendimento: empData } = dados

  const nome = info?.nome || info?.email || '?'
  document.getElementById('topo-nome').textContent = nome
  document.getElementById('sidebar-nome').textContent = nome
  const ini = nome[0].toUpperCase()
  document.getElementById('topo-inicial').textContent = ini
  document.getElementById('sidebar-inicial').textContent = ini
  ligarBotaoSair()

  if (empData) {
    const { data: itens } = await supabase
      .from('item')
      .select('id, nome, id_situacao, criado_em, tipo_de_item(nome)')
      .eq('id_empreendimento', empData.id)
      .order('criado_em', { ascending: false })

    todosItens = itens || []

    const contagens = { 2: 0, 1: 0, 4: 0, 5: 0 }
    todosItens.forEach(it => { if (contagens[it.id_situacao] !== undefined) contagens[it.id_situacao]++ })
    document.getElementById('cnt-todos').textContent = todosItens.length
    document.getElementById('cnt-disp').textContent = contagens[2]
    document.getElementById('cnt-pend').textContent = contagens[1]
    document.getElementById('cnt-susp').textContent = contagens[4]
    document.getElementById('cnt-rec').textContent = contagens[5]

    renderTabela(todosItens)
  }

  document.getElementById('abas-itens').addEventListener('click', e => {
    const a = e.target.closest('[data-sit]')
    if (!a) return
    e.preventDefault()
    document.querySelectorAll('#abas-itens [data-sit]').forEach(x => x.removeAttribute('aria-current'))
    a.setAttribute('aria-current', 'page')
    filtroAtual = a.dataset.sit
    renderTabela(todosItens)
  })

  document.getElementById('busca-meus-itens').addEventListener('input', () => renderTabela(todosItens))
}

init()

import './mnav-ativo.js'
