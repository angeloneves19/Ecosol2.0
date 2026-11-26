import { supabase } from './supabase.js'

const grade = document.getElementById('grade') || document.querySelector('.grade')
const contador = document.querySelector('[role="status"]')
const form = document.querySelector('.formulario-filtros')
const selectOrdem = document.querySelector('[name="ordem"]')

// Substituir conteúdo estático imediatamente
grade.innerHTML = '<p class="apagado" style="padding:2rem">Carregando...</p>'

const BAIRROS = {
  'Centro':          { lat: -30.0809, lng: -51.0219 },
  'Estalagem':       { lat: -30.0960, lng: -51.0130 },
  'Santa Isabel':    { lat: -30.0631, lng: -51.0580 },
  'Águas Claras':    { lat: -30.1200, lng: -51.0300 },
  'Passo do Vigário':{ lat: -30.0700, lng: -51.0800 },
  'Espigão':         { lat: -30.0500, lng: -51.0100 },
  'Itapuã':          { lat: -30.1500, lng: -51.0700 }
}

const POR_PAGINA = 12
let minhaLocalizacao = null
let itensFiltrados = []
const params = new URLSearchParams(location.search)

const texturas = ['textura1', 'textura2', 'textura3', 'textura4', 'textura0']
const cores    = ['#2E7D5B', '#8A3F7C', '#1F6F8B', '#B0771A', '#27337A']

function escapar(texto) {
  const d = document.createElement('div')
  d.textContent = texto == null ? '' : texto
  return d.innerHTML
}

function normalizar(texto) {
  return (texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distanciaItem(item) {
  const origem = minhaLocalizacao
  if (!origem) return null
  const end = (item.empreendimento?.endereco || []).find(e => e.latitude)
  if (!end) return null
  return haversine(origem.lat, origem.lng, end.latitude, end.longitude)
}

function cartao(item, indice) {
  const emp = item.empreendimento
  const end = (emp?.endereco || []).find(e => e.visivel) || emp?.endereco?.[0]
  const local = end ? `${end.bairro ? end.bairro + ', ' : ''}${end.cidade || 'Viamão'}` : 'Viamão'
  const preco = item.preco_atual_visivel
    ? `R$ ${Number(item.preco_atual).toFixed(2).replace('.', ',')}`
    : 'Preço sob consulta'
  const natureza = item.natureza_de_item?.nome || ''
  const tipos = (item.tipos || []).join(', ')
  const etiqueta = tipos ? `${natureza} · ${tipos}` : natureza
  const fotos = (item.foto_item || []).sort((a, b) => a.seq - b.seq)
  const fotoUrl = fotos[0]?.url_imagem
  const zap = emp
    ? [emp.whatsapp1_visivel && emp.whatsapp1, emp.telefone1_visivel && emp.telefone1].find(Boolean)
    : null
  const zapNum = zap ? zap.replace(/\D/g, '') : null
  const texto = encodeURIComponent(`Olá! Vi "${item.nome}" na Trama Viamão.`)
  let contato = ''
  if (zapNum) contato += `<a class="botao zap pequeno" href="https://wa.me/55${zapNum}?text=${texto}" target="_blank" rel="noopener">WhatsApp</a>`
  if (emp?.email_visivel) contato += `<a class="botao vazado pequeno" href="mailto:${emp.email}?subject=Interesse em: ${encodeURIComponent(item.nome)}">E-mail</a>`
  const imgHtml = fotoUrl
    ? `<img src="${escapar(fotoUrl)}" alt="${escapar(item.nome)}" style="width:100%;height:100%;object-fit:cover">`
    : `<div class="foto-vazia ${texturas[indice % 5]}" style="--c1:${cores[indice % 5]}" role="img" aria-label="Sem foto"></div>`
  const dist = distanciaItem(item)
  const distTexto = dist !== null ? ` · ${dist.toFixed(1)} km` : ''
  const indisponivel = item.id_situacao === 3
  return `
    <article class="cartao">
      <a class="cartao-link" href="pages/item.html?id=${item.id}">
        <div class="foto-capa" style="aspect-ratio:4/3;overflow:hidden;border-radius:8px 8px 0 0">${imgHtml}</div>
        <div class="corpo">
          <span class="etiqueta">${escapar(etiqueta)}</span>
          ${indisponivel ? '<span class="selo sit-indisponivel">Indisponível</span>' : ''}
          <h3>${escapar(item.nome)}</h3>
          <div class="preco${!item.preco_atual_visivel ? ' preco-oculto' : ''}">${preco}</div>
          <div class="origem">${escapar(emp?.nome || '')}<br>${escapar(local)}${distTexto}</div>
        </div>
      </a>
      ${contato ? `<div class="cartao-contato">${contato}</div>` : ''}
    </article>`
}

function lerFiltros() {
  return {
    nome:        normalizar(params.get('q') || params.get('nome') || ''),
    desc:        normalizar(params.get('desc') || ''),
    natureza:    normalizar(params.get('natureza') || ''),
    tipoProduto: normalizar(params.get('tipoProduto') || ''),
    tipoServico: normalizar(params.get('tipoServico') || ''),
    precoMin:    params.get('precoMin') ? Number(params.get('precoMin')) : null,
    precoMax:    params.get('precoMax') ? Number(params.get('precoMax')) : null,
    empNome:     normalizar(params.get('empNome') || ''),
    empDoc:      (params.get('empDoc') || '').replace(/\D/g, ''),
    empTelefone: normalizar(params.get('empTelefone') || ''),
    empEmail:    normalizar(params.get('empEmail') || ''),
    empRede:     normalizar(params.get('empRede') || ''),
    empCategoria:normalizar(params.get('empCategoria') || ''),
    rua:         normalizar(params.get('rua') || ''),
    bairro:      normalizar(params.get('bairro') || ''),
    cidade:      normalizar(params.get('cidade') || ''),
    uf:          normalizar(params.get('uf') || ''),
    raio:        params.get('raio') ? Number(params.get('raio')) : null,
    ref:         params.get('ref') || '',
    modo:        params.get('modo') || 'E'
  }
}

function temValor(v) { return v !== '' && v !== null }

function filtrar(itens, f) {
  return itens.filter(item => {
    const emp = item.empreendimento
    const end = (emp?.endereco || []).find(e => e.visivel) || emp?.endereco?.[0]
    const testes = []
    if (temValor(f.nome)) testes.push(normalizar(item.nome).includes(f.nome))
    if (temValor(f.desc)) testes.push(normalizar(item.descricao || '').includes(f.desc))
    if (temValor(f.natureza)) testes.push(normalizar(item.natureza_de_item?.nome || '') === f.natureza)
    if (temValor(f.tipoProduto)) testes.push((item.tipos || []).some(t => normalizar(t) === f.tipoProduto))
    if (temValor(f.tipoServico)) testes.push((item.tipos || []).some(t => normalizar(t) === f.tipoServico))
    if (f.precoMin !== null && item.preco_atual_visivel) testes.push(Number(item.preco_atual) >= f.precoMin)
    if (f.precoMax !== null && item.preco_atual_visivel) testes.push(Number(item.preco_atual) <= f.precoMax)
    if (temValor(f.empNome)) {
      const nomes = [emp?.nome, emp?.nome_fantasia_visivel && emp?.nome_fantasia].filter(Boolean).map(normalizar)
      testes.push(nomes.some(n => n.includes(f.empNome)))
    }
    if (temValor(f.empDoc)) {
      const doc = [(emp?.cpf_visivel && emp?.cpf), (emp?.cnpj_visivel && emp?.cnpj)].filter(Boolean).join('').replace(/\D/g, '')
      testes.push(doc.includes(f.empDoc))
    }
    if (temValor(f.empTelefone)) {
      const tels = [emp?.telefone1, emp?.telefone2, emp?.telefone3].filter(Boolean).map(normalizar).join(' ')
      testes.push(tels.includes(f.empTelefone))
    }
    if (temValor(f.empEmail)) testes.push(Boolean(emp?.email_visivel && normalizar(emp?.email || '').includes(f.empEmail)))
    if (temValor(f.empRede)) {
      const redes = [emp?.site_visivel && emp?.site, emp?.facebook_visivel && emp?.facebook, emp?.instagram_visivel && emp?.instagram]
        .filter(Boolean).map(normalizar).join(' ')
      testes.push(redes.includes(f.empRede))
    }
    if (temValor(f.empCategoria)) testes.push(normalizar(emp?.categoria_de_empreendimento?.nome || '') === f.empCategoria)
    if (temValor(f.rua))    testes.push(normalizar(end?.rua    || '').includes(f.rua))
    if (temValor(f.bairro)) testes.push(normalizar(end?.bairro || '').includes(f.bairro))
    if (temValor(f.cidade)) testes.push(normalizar(end?.cidade || '').includes(f.cidade))
    if (temValor(f.uf))     testes.push(normalizar(end?.uf     || '') === f.uf)
    if (f.raio) {
      const origem = minhaLocalizacao || BAIRROS[f.ref] || null
      if (origem && end?.latitude) testes.push(haversine(origem.lat, origem.lng, end.latitude, end.longitude) <= f.raio)
    }
    if (!testes.length) return true
    return f.modo === 'OU' ? testes.some(Boolean) : testes.every(Boolean)
  })
}

function ordenar(itens) {
  const ordem = selectOrdem?.value || 'Nome'
  return [...itens].sort((a, b) => {
    if (ordem === 'Menor preço') return Number(a.preco_atual) - Number(b.preco_atual)
    if (ordem === 'Maior preço') return Number(b.preco_atual) - Number(a.preco_atual)
    if (ordem === 'Mais perto') return (distanciaItem(a) ?? Infinity) - (distanciaItem(b) ?? Infinity)
    return normalizar(a.nome).localeCompare(normalizar(b.nome))
  })
}

async function carregar() {
  grade.innerHTML = '<p class="apagado" style="padding:2rem">Carregando...</p>'

  // Busca itens aprovados com empreendimento ativo
  const { data: itensData, error: erroItens } = await supabase
    .from('item')
    .select(`
      id, nome, descricao, preco_atual, preco_atual_visivel, id_situacao,
      empreendimento(
        id, nome, email, email_visivel, id_situacao,
        telefone1, telefone1_visivel, telefone2, telefone3,
        whatsapp1, whatsapp1_visivel,
        cpf, cpf_visivel, cnpj, cnpj_visivel,
        nome_fantasia, nome_fantasia_visivel,
        site, site_visivel, facebook, facebook_visivel, instagram, instagram_visivel,
        categoria_de_empreendimento(nome),
        endereco(cidade, bairro, uf, rua, latitude, longitude, seq, visivel)
      )
    `)
    .in('id_situacao', [2, 3])

  if (erroItens) {
    grade.innerHTML = `<div class="aviso erro" style="padding:1rem">Erro ao carregar: ${escapar(erroItens.message)}</div>`
    console.error('Erro busca:', erroItens)
    return
  }

  // Busca tipos separadamente para evitar falha no join composto
  const idsItens = (itensData || []).map(i => i.id)
  let tiposPorItem = {}
  let naturezaPorItem = {}
  let fotosPorItem = {}

  if (idsItens.length) {
    const { data: tiposData } = await supabase
      .from('item_tipo_de_item')
      .select('id_item, tipo_de_item(nome, natureza_de_item!id_natureza(nome))')
      .in('id_item', idsItens)

    for (const linha of (tiposData || [])) {
      if (!tiposPorItem[linha.id_item]) tiposPorItem[linha.id_item] = []
      if (linha.tipo_de_item?.nome) tiposPorItem[linha.id_item].push(linha.tipo_de_item.nome)
      if (!naturezaPorItem[linha.id_item] && linha.tipo_de_item?.natureza_de_item?.nome) {
        naturezaPorItem[linha.id_item] = linha.tipo_de_item.natureza_de_item.nome
      }
    }

    const { data: fotosData } = await supabase
      .from('foto_item')
      .select('id_item, url_imagem, seq')
      .in('id_item', idsItens)
      .order('seq')

    for (const foto of (fotosData || [])) {
      if (!fotosPorItem[foto.id_item]) fotosPorItem[foto.id_item] = []
      fotosPorItem[foto.id_item].push(foto)
    }
  }

  const f = lerFiltros()

  let itens = (itensData || [])
    .filter(i => i.empreendimento && i.empreendimento.id_situacao === 2)
    .map(item => ({
      ...item,
      tipos: tiposPorItem[item.id] || [],
      natureza_de_item: naturezaPorItem[item.id] ? { nome: naturezaPorItem[item.id] } : null,
      foto_item: (fotosPorItem[item.id] || []).sort((a, b) => a.seq - b.seq)
    }))

  itens = filtrar(itens, f)
  itens = ordenar(itens)

  if (contador) {
    contador.textContent = `${itens.length} ${itens.length === 1 ? 'item encontrado' : 'itens encontrados'}`
  }

  if (!itens.length) {
    const temFiltro = [...params.keys()].filter(k => k !== 'modo').length > 0
    grade.innerHTML = temFiltro
      ? '<div class="vazio"><h3>Nenhum item encontrado</h3><p>Tente remover alguns filtros.</p></div>'
      : '<div class="vazio"><h3>Nenhum item disponível ainda</h3><p>Os itens aparecem aqui após aprovação da administração.</p></div>'
    document.getElementById('btn-ver-mais')?.remove()
    return
  }

  itensFiltrados = itens
  mostrar(0)
}

function mostrar(pagina) {
  const ate = (pagina + 1) * POR_PAGINA
  const fatia = itensFiltrados.slice(0, ate)

  grade.innerHTML = fatia.map(cartao).join('')

  // Atualiza ou remove o botão "Ver mais"
  let btn = document.getElementById('btn-ver-mais')
  if (itensFiltrados.length > ate) {
    const restam = itensFiltrados.length - ate
    if (!btn) {
      btn = document.createElement('button')
      btn.id = 'btn-ver-mais'
      btn.className = 'botao vazado'
      btn.style.cssText = 'display:block;margin:2rem auto;min-width:200px'
      grade.after(btn)
    }
    btn.textContent = `Ver mais (${restam} restante${restam === 1 ? '' : 's'})`
    btn.onclick = () => mostrar(pagina + 1)
  } else {
    btn?.remove()
  }
}

function preencherForm() {
  for (const [chave, valor] of params) {
    for (const campo of form.querySelectorAll(`[name="${chave}"]`)) {
      if (campo.type === 'radio') { if (campo.value === valor) campo.checked = true }
      else campo.value = valor
    }
  }
  const buscaRapida = document.querySelector('.busca-rapida [name="nome"]')
  if (buscaRapida && params.get('nome')) buscaRapida.value = params.get('nome')
}

const botaoGeo = form?.querySelector('button[type="button"]')
if (botaoGeo) {
  botaoGeo.addEventListener('click', () => {
    botaoGeo.textContent = 'Obtendo localização...'
    botaoGeo.disabled = true
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        minhaLocalizacao = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        botaoGeo.textContent = '📍 Localização obtida'
        carregar()
      },
      () => {
        botaoGeo.textContent = 'Usar minha localização'
        botaoGeo.disabled = false
        alert('Não consegui sua localização. Escolha um bairro de referência.')
      }
    )
  })
}

if (selectOrdem) selectOrdem.addEventListener('change', carregar)
if (form) preencherForm()
carregar()