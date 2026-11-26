import { supabase } from './supabase.js'
import { meuEmpreendimento, ligarBotaoSair } from './sessao.js'

const mnavSair = document.getElementById('mnav-sair-emp')
if (mnavSair) {
  mnavSair.addEventListener('click', e => {
    e.preventDefault()
    document.getElementById('btn-sair').click()
  })
}

let tipos = []
let naturezaSelecionada = null

// Estado das fotos
let fotosExistentes = []  // { id, url_imagem, seq } — carregadas do BD
let fotosNovas      = []  // { file: File, preview: objectURL }
let fotosRemover    = []  // ids de foto_item a deletar

// ── Notificações inline ───────────────────────────────────────
function mostrarMensagem(msg, tipo = 'erro', persistente = false) {
  const el = document.getElementById('msg-topo')
  if (!el) return
  el.className = `aviso ${tipo}`
  el.textContent = msg
  el.style.display = ''
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  if (!persistente) setTimeout(() => { el.style.display = 'none' }, 5000)
}

// ── Fotos ─────────────────────────────────────────────────────
function renderFotos() {
  const galeria = document.getElementById('fotos-galeria')
  galeria.innerHTML = ''

  const totalExistentes = fotosExistentes.length
  const total = totalExistentes + fotosNovas.length
  if (!total) return

  // Fotos já salvas no BD
  fotosExistentes.forEach((f, i) => {
    const div = document.createElement('div')
    div.className = 'foto-mini'
    div.innerHTML = `
      <img src="${f.url_imagem}" alt="Foto">
      ${i === 0 ? '<span class="foto-mini-label">Capa</span>' : ''}
      <button type="button" class="foto-mini-remover" aria-label="Remover foto">✕</button>
    `
    div.querySelector('.foto-mini-remover').addEventListener('click', () => {
      fotosRemover.push(f.id)
      fotosExistentes = fotosExistentes.filter(x => x.id !== f.id)
      renderFotos()
    })
    galeria.appendChild(div)
  })

  // Novas fotos (ainda não enviadas)
  fotosNovas.forEach((f, i) => {
    const eCapa = totalExistentes === 0 && i === 0
    const div = document.createElement('div')
    div.className = 'foto-mini'
    div.innerHTML = `
      <img src="${f.preview}" alt="Nova foto">
      ${eCapa ? '<span class="foto-mini-label">Capa</span>' : ''}
      <button type="button" class="foto-mini-remover" aria-label="Remover foto">✕</button>
    `
    div.querySelector('.foto-mini-remover').addEventListener('click', () => {
      URL.revokeObjectURL(f.preview)
      fotosNovas.splice(i, 1)
      renderFotos()
    })
    galeria.appendChild(div)
  })
}

function adicionarArquivos(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      mostrarMensagem(`"${file.name}" não é uma imagem válida.`)
      continue
    }
    if (file.size > 5 * 1024 * 1024) {
      mostrarMensagem(`"${file.name}" passa de 5 MB — reduza e tente de novo.`)
      continue
    }
    fotosNovas.push({ file, preview: URL.createObjectURL(file) })
  }
  renderFotos()
}

// ── Tipos ─────────────────────────────────────────────────────
function renderTipos(idNatureza, tiposPreSelecionados = []) {
  const grid = document.getElementById('tipos-grid')
  grid.innerHTML = ''
  tipos
    .filter(t => t.id_natureza === idNatureza)
    .forEach(t => {
      const label = document.createElement('label')
      label.className = 'tipo-chip'

      const cb = document.createElement('input')
      cb.type = 'checkbox'
      cb.value = t.id
      cb.checked = tiposPreSelecionados.includes(t.id)
      if (cb.checked) label.classList.add('marcado')

      cb.addEventListener('change', () => label.classList.toggle('marcado', cb.checked))

      label.appendChild(cb)
      label.appendChild(document.createTextNode(t.nome))
      grid.appendChild(label)
    })
  document.getElementById('campo-tipos').style.display = ''
}

function selecionarNatureza(idNatureza, tiposPreSelecionados = []) {
  naturezaSelecionada = idNatureza
  document.querySelectorAll('.natureza-btn').forEach(btn => {
    btn.classList.toggle('ativo', parseInt(btn.dataset.natureza) === idNatureza)
  })
  renderTipos(idNatureza, tiposPreSelecionados)
}

function getTiposSelecionados() {
  return Array.from(document.querySelectorAll('#tipos-grid input:checked'))
    .map(cb => parseInt(cb.value))
}

async function sincronizarTipos(idItem, tiposIds) {
  const { error: delErr } = await supabase.from('item_tipo_de_item').delete().eq('id_item', idItem)
  if (delErr) console.warn('Erro ao limpar tipos:', delErr.message)

  if (tiposIds.length > 0) {
    const rows = tiposIds.map(id_tipo => ({ id_item: idItem, id_tipo_de_item: id_tipo }))
    const { error: insErr } = await supabase.from('item_tipo_de_item').insert(rows)
    if (insErr) console.warn('Erro ao inserir tipos:', insErr.message)
  }
}

async function sincronizarFotos(idItem, empId) {
  // 1) Remove fotos marcadas para exclusão
  for (const idFoto of fotosRemover) {
    const { data: fotoRow } = await supabase
      .from('foto_item').select('url_imagem').eq('id', idFoto).single()

    if (fotoRow?.url_imagem) {
      try {
        const url = new URL(fotoRow.url_imagem)
        const path = decodeURIComponent(url.pathname).split('/fotos/').pop()
        if (path) await supabase.storage.from('fotos').remove([path])
      } catch (_) {}
    }
    await supabase.from('foto_item').delete().eq('id', idFoto)
  }

  // 2) Próximo seq a partir das existentes
  const seqBase = fotosExistentes.length
    ? Math.max(...fotosExistentes.map(f => f.seq)) + 1
    : 1

  // 3) Upload das novas fotos e inserção na foto_item
  for (let i = 0; i < fotosNovas.length; i++) {
    const { file } = fotosNovas[i]
    const rawExt = file.name.split('.').pop().toLowerCase()
    const ext = /^(jpg|jpeg|png|webp|gif)$/.test(rawExt) ? rawExt : 'jpg'
    const path = `itens/${empId}/${Date.now()}-${i}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('fotos').upload(path, file, { upsert: true })
    if (upErr) { console.warn('Erro upload foto:', upErr.message); continue }
    const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
    await supabase.from('foto_item').insert({ id_item: idItem, url_imagem: publicUrl, seq: seqBase + i })
  }
}

// ── Init ─────────────────────────────────────────────────────
async function init() {
  const dados = await meuEmpreendimento()
  if (!dados?.empreendimento) { window.location.href = 'cadastrar.html'; return }

  const { usuario: info, empreendimento: empDados } = dados
  const empId = empDados?.id

  if (!empId) {
    document.querySelector('.app-content').innerHTML =
      '<div class="aviso warn" style="margin:32px">Você não possui um empreendimento vinculado. <a href="perfil.html">Configure o seu perfil</a>.</div>'
    return
  }

  const nome = info?.nome || info?.email || '?'
  document.getElementById('topo-nome').textContent = nome
  document.getElementById('sidebar-nome').textContent = nome
  const ini = nome[0].toUpperCase()
  document.getElementById('topo-inicial').textContent = ini
  document.getElementById('sidebar-inicial').textContent = ini
  ligarBotaoSair()

  // Carrega tipos disponíveis
  const { data: tiposData } = await supabase
    .from('tipo_de_item').select('id, nome, id_natureza').order('id')
  tipos = tiposData || []

  document.querySelectorAll('.natureza-btn').forEach(btn => {
    btn.addEventListener('click', () => selecionarNatureza(parseInt(btn.dataset.natureza)))
  })

  const params = new URLSearchParams(window.location.search)
  const itemId = params.get('id')

  if (itemId) {
    document.getElementById('titulo-pagina').textContent = 'Editar item'
    document.getElementById('subtitulo-pagina').textContent = 'Atualize as informações deste item.'

    const { data: item } = await supabase
      .from('item')
      .select('id, nome, descricao, preco_atual, unidade, id_tipo, id_empreendimento')
      .eq('id', itemId)
      .single()

    if (!item || item.id_empreendimento !== empId) {
      mostrarMensagem('Item não encontrado ou sem permissão de acesso.', 'erro', true)
      setTimeout(() => window.location.href = 'itens.html', 2000)
      return
    }

    document.getElementById('item-nome').value = item.nome || ''
    document.getElementById('item-descricao').value = item.descricao || ''
    document.getElementById('item-preco').value = item.preco_atual || ''
    document.getElementById('item-unidade').value = item.unidade || ''

    // Carrega fotos existentes via foto_item
    const { data: fotosDB } = await supabase
      .from('foto_item').select('id, url_imagem, seq').eq('id_item', itemId).order('seq')
    fotosExistentes = fotosDB || []
    renderFotos()

    // Carrega tipos vinculados
    const { data: itemTipos } = await supabase
      .from('item_tipo_de_item').select('id_tipo_de_item').eq('id_item', itemId)
    const tiposExistentes = (itemTipos || []).map(r => r.id_tipo_de_item)

    if (tiposExistentes.length > 0) {
      const primTipo = tipos.find(t => t.id === tiposExistentes[0])
      if (primTipo) selecionarNatureza(primTipo.id_natureza, tiposExistentes)
    } else if (item.id_tipo) {
      const tipo = tipos.find(t => t.id === item.id_tipo)
      if (tipo) selecionarNatureza(tipo.id_natureza, [item.id_tipo])
    }
  }

  // ── Área de upload ───────────────────────────────────────────
  const uploadArea = document.getElementById('upload-area')
  const inputFoto  = document.getElementById('input-foto')

  document.getElementById('btn-escolher-foto').addEventListener('click', () => inputFoto.click())

  uploadArea.addEventListener('dragover',  e => { e.preventDefault(); uploadArea.classList.add('drag-over') })
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'))
  uploadArea.addEventListener('drop', e => {
    e.preventDefault()
    uploadArea.classList.remove('drag-over')
    adicionarArquivos(e.dataTransfer.files)
  })
  inputFoto.addEventListener('change', e => {
    adicionarArquivos(e.target.files)
    e.target.value = ''
  })

  // ── Salvar ───────────────────────────────────────────────────
  document.getElementById('btn-salvar').addEventListener('click', async () => {
    const btn = document.getElementById('btn-salvar')
    const nomeVal = document.getElementById('item-nome').value.trim()
    const tiposIds = getTiposSelecionados()

    if (!nomeVal) {
      mostrarMensagem('Informe o nome do item antes de salvar.')
      return
    }
    if (!naturezaSelecionada) {
      mostrarMensagem('Selecione se é Produto ou Serviço.')
      return
    }
    if (tiposIds.length === 0) {
      mostrarMensagem('Marque pelo menos um tipo para este item.')
      return
    }

    btn.disabled = true
    btn.textContent = 'Salvando…'

    const precoVal = parseFloat(document.getElementById('item-preco').value) || 0

    const payload = {
      nome:                nomeVal,
      descricao:           document.getElementById('item-descricao').value.trim() || null,
      preco_atual:         precoVal,
      preco_atual_visivel: precoVal > 0,
      unidade:             document.getElementById('item-unidade').value.trim() || null,
      id_tipo:             tiposIds[0],
      id_natureza:         naturezaSelecionada,
      id_empreendimento:   empId
    }

    let err = null
    let idItemSalvo = itemId ? parseInt(itemId) : null

    if (itemId) {
      const { error } = await supabase.from('item').update(payload).eq('id', itemId)
      err = error
    } else {
      payload.id_situacao = 2  // aprovado automaticamente ao cadastrar
      const { data: novoItem, error } = await supabase.from('item').insert(payload).select('id').single()
      err = error
      if (!err) idItemSalvo = novoItem.id
    }

    if (err) {
      mostrarMensagem('Não foi possível salvar: ' + err.message, 'erro', true)
      btn.disabled = false
      btn.textContent = 'Salvar item'
      return
    }

    await sincronizarTipos(idItemSalvo, tiposIds)
    await sincronizarFotos(idItemSalvo, empId)

    window.location.href = 'itens.html'
  })
}

init()

import './mnav-ativo.js'