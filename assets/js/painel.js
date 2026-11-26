import { meuEmpreendimento, ligarBotaoSair } from './sessao.js'
import { supabase } from './supabase.js'

const mnavSair = document.getElementById('mnav-sair-emp')
if (mnavSair) {
  mnavSair.addEventListener('click', e => {
    e.preventDefault()
    document.getElementById('btn-sair').click()
  })
}

async function init() {
  const dados = await meuEmpreendimento()
  if (!dados?.empreendimento) { window.location.href = 'cadastrar.html'; return }

  const { usuario: info, empreendimento: emp } = dados

  const nome = info.nome || info.email || 'você'
  document.getElementById('painel-saudacao').textContent = `Olá, ${nome.split(' ')[0]}!`
  document.getElementById('topo-nome').textContent = nome
  document.getElementById('sidebar-nome').textContent = nome
  const ini = nome[0].toUpperCase()
  document.getElementById('topo-inicial').textContent = ini
  document.getElementById('sidebar-inicial').textContent = ini

  ligarBotaoSair()

  if (emp) {
    const [{ count: total }, { count: disp }, { count: pend }, { count: usuarios }] = await Promise.all([
      supabase.from('item').select('*', { count: 'exact', head: true }).eq('id_empreendimento', emp.id),
      supabase.from('item').select('*', { count: 'exact', head: true }).eq('id_empreendimento', emp.id).eq('id_situacao', 2),
      supabase.from('item').select('*', { count: 'exact', head: true }).eq('id_empreendimento', emp.id).eq('id_situacao', 1),
      supabase.from('usuario_empreendimento').select('*', { count: 'exact', head: true }).eq('id_empreendimento', emp.id)
    ])

    document.getElementById('stat-total').textContent = total ?? 0
    document.getElementById('stat-usuarios').textContent = usuarios ?? 0
    document.getElementById('stat-disponiveis').textContent = disp ?? 0
    document.getElementById('stat-pendentes').textContent = pend ?? 0

    const { data: itens } = await supabase
      .from('item')
      .select('id, nome, id_situacao, foto_item(url_imagem, seq)')
      .eq('id_empreendimento', emp.id)
      .order('criado_em', { ascending: false })
      .limit(4)

    const grid = document.getElementById('itens-recentes')
    if (itens && itens.length) {
      grid.innerHTML = itens.map(it => {
        const sit = { 1: 'warn', 2: 'ok', 3: 'dead', 4: 'off', 5: 'bad' }[it.id_situacao] || 'off'
        const sitNome = { 1: 'Pendente', 2: 'Disponível', 3: 'Excluído', 4: 'Suspenso', 5: 'Recusado' }[it.id_situacao] || '—'
        const fotos = (it.foto_item || []).sort((a, b) => a.seq - b.seq)
        const fotoUrl = fotos[0]?.url_imagem
        const fotoHtml = fotoUrl
          ? `<img src="${fotoUrl}" alt="${it.nome}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`
        return `<div class="item-card">
          <div class="item-card-foto${fotoUrl ? '' : ' item-card-foto-placeholder'}">
            ${fotoHtml}
          </div>
          <div class="item-card-body">
            <div class="item-card-nome">${it.nome}</div>
            <span class="badge ${sit} dot">${sitNome}</span>
          </div>
        </div>`
      }).join('')
    } else {
      grid.innerHTML = '<div class="vazio"><p>Nenhum item ainda.</p></div>'
    }

    const statusEmp = { 1: 'Pendente', 2: 'Ativo', 3: 'Excluído', 4: 'Suspenso', 5: 'Recusado' }[emp.id_situacao] || '—'
    document.getElementById('sidebar-status-label').textContent = statusEmp
    if (emp.id_situacao !== 2) document.getElementById('sidebar-status-dot').style.background = 'var(--warn)'

    const bars = document.getElementById('chart-bars')
    if (bars) {
      const dispVal   = disp   ?? 0
      const pendVal   = pend   ?? 0
      const outrosVal = Math.max(0, (total ?? 0) - dispVal - pendVal)
      const chartData = [
        { label: 'Disponíveis', val: dispVal,   destaque: true  },
        { label: 'Pendentes',   val: pendVal,   destaque: false },
        { label: 'Outros',      val: outrosVal, destaque: false }
      ]
      const maxVal = Math.max(...chartData.map(d => d.val), 1)
      bars.innerHTML = chartData.map(d => `
        <div class="chart-bar-col">
          <div class="chart-bar-fill${d.destaque ? ' destaque' : ''}" style="height:${Math.round(d.val / maxVal * 120)}px" title="${d.val}"></div>
          <div class="chart-bar-label">${d.label}</div>
        </div>`).join('')
    }
  }
}

init()

import './mnav-ativo.js'
