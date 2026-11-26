import { supabase } from './supabase.js'
import { ehAdministrador } from './sessao.js'

// ── Utilitários ──────────────────────────────────────────────────────────────

function aviso(elId, msg, tipo) {
  const el = document.getElementById(elId)
  if (!el) return
  el.textContent = msg
  el.className = 'aviso ' + tipo
  el.hidden = false
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

function esconderAviso(elId) {
  const el = document.getElementById(elId)
  if (el) el.hidden = true
}

function iniciais(nome = '') {
  return nome.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?'
}

function corAvatar(nome = '') {
  const cores = ['#176849','#2D6A4F','#40916C','#1B4332','#52796F','#C77C50','#6B705C']
  let hash = 0
  for (const c of nome) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return cores[Math.abs(hash) % cores.length]
}

// ── Estado global ─────────────────────────────────────────────────────────────

let usuarioAtual = null  // { id, nome, email, fone }

// ── Carregar e renderizar equipe ──────────────────────────────────────────────

async function carregarEquipe() {
  // fone fica em administrador, não em usuario
  const { data, error } = await supabase
    .from('administrador')
    .select('id_usuario, situacao, fone, usuario(id, nome, email)')
    .order('id_usuario')

  const lista = document.getElementById('lista-equipe')
  if (error) {
    lista.innerHTML = `<p class="aviso bad">Erro ao carregar equipe: ${error.message}</p>`
    return
  }

  lista.innerHTML = ''
  for (const adm of data ?? []) {
    const u = adm.usuario ?? {}
    const ehEu = u.id === usuarioAtual?.id
    const ativo = adm.situacao === 'ativo'
    const cor = corAvatar(u.nome)
    const ini = iniciais(u.nome)

    const item = document.createElement('div')
    item.className = 'equipe-item'
    item.dataset.idUsuario = u.id
    item.innerHTML = `
      <div class="equipe-avatar" style="background:${cor}">${ini}</div>
      <div class="equipe-info">
        <div class="equipe-nome">
          ${u.nome || '—'}
          ${ehEu ? '<span class="badge-voce">Você</span>' : ''}
        </div>
        <div class="equipe-sub">${u.email || ''}${adm.fone ? ' · ' + adm.fone : ''}</div>
      </div>
      <span class="adm-status ${ativo ? 'ativo' : 'inativo'}">${ativo ? 'Ativo' : 'Inativo'}</span>
      ${ehEu ? '' : `
        <div class="equipe-acoes">
          <button class="botao ghost pequeno btn-toggle" data-id="${u.id}" data-sit="${adm.situacao}">
            ${ativo ? 'Inativar' : 'Reativar'}
          </button>
          <button class="botao danger pequeno btn-remover" data-id="${u.id}" data-nome="${u.nome}">
            Remover
          </button>
        </div>
      `}
    `
    lista.appendChild(item)
  }

  // Eventos dos botões
  for (const btn of lista.querySelectorAll('.btn-toggle')) {
    btn.addEventListener('click', () => toggleSituacao(btn.dataset.id, btn.dataset.sit))
  }
  for (const btn of lista.querySelectorAll('.btn-remover')) {
    btn.addEventListener('click', () => removerAdmin(btn.dataset.id, btn.dataset.nome))
  }
}

// ── Inativar / Reativar ───────────────────────────────────────────────────────

async function toggleSituacao(idUsuario, situacaoAtual) {
  const nova = situacaoAtual === 'ativo' ? 'inativo' : 'ativo'
  const { error } = await supabase
    .from('administrador')
    .update({ situacao: nova })
    .eq('id_usuario', idUsuario)

  if (error) {
    alert('Erro: ' + error.message)
    return
  }
  carregarEquipe()
}

// ── Remover admin ─────────────────────────────────────────────────────────────

async function removerAdmin(idUsuario, nome) {
  if (!confirm(`Remover "${nome}" da equipe de administradores? A conta de acesso será mantida, mas ela perderá o acesso ao painel.`)) return

  const { error } = await supabase
    .from('administrador')
    .delete()
    .eq('id_usuario', idUsuario)

  if (error) {
    alert('Erro: ' + error.message)
    return
  }
  carregarEquipe()
}

// ── Meus dados ────────────────────────────────────────────────────────────────

function carregarMeusDados() {
  if (!usuarioAtual) return
  document.getElementById('meus-nome').value = usuarioAtual.nome ?? ''
  document.getElementById('meus-email').value = usuarioAtual.email ?? ''
  // fone vem de administrador.fone, carregado no boot
  document.getElementById('meus-telefone').value = usuarioAtual.fone ?? ''
}

document.getElementById('form-meus-dados')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  esconderAviso('aviso-meus-dados')

  const nome = document.getElementById('meus-nome').value.trim()
  const email = document.getElementById('meus-email').value.trim()
  const fone = document.getElementById('meus-telefone').value.trim()
  const senha = document.getElementById('meus-senha').value
  const senhaConfirma = document.getElementById('meus-senha-confirma').value

  if (!nome || !email) return aviso('aviso-meus-dados', 'Nome e e-mail são obrigatórios.', 'bad')
  if (senha && senha.length < 6) return aviso('aviso-meus-dados', 'A senha precisa ter pelo menos 6 caracteres.', 'bad')
  if (senha && senha !== senhaConfirma) return aviso('aviso-meus-dados', 'As senhas não conferem.', 'bad')

  const btn = e.target.querySelector('button[type="submit"]')
  btn.disabled = true
  btn.textContent = 'Salvando...'

  // Atualiza nome em usuario
  const { error: errU } = await supabase
    .from('usuario')
    .update({ nome })
    .eq('id', usuarioAtual.id)

  if (errU) {
    aviso('aviso-meus-dados', 'Erro ao salvar dados: ' + errU.message, 'bad')
    btn.disabled = false
    btn.textContent = 'Salvar meus dados'
    return
  }

  // Atualiza fone em administrador
  const { error: errF } = await supabase
    .from('administrador')
    .update({ fone })
    .eq('id_usuario', usuarioAtual.id)

  if (errF) {
    aviso('aviso-meus-dados', 'Erro ao salvar telefone: ' + errF.message, 'bad')
    btn.disabled = false
    btn.textContent = 'Salvar meus dados'
    return
  }

  // Atualiza email/senha no auth se mudou
  const authUpdate = {}
  if (email !== usuarioAtual.email) authUpdate.email = email
  if (senha) authUpdate.password = senha

  if (Object.keys(authUpdate).length > 0) {
    const { error: errA } = await supabase.auth.updateUser(authUpdate)
    if (errA) {
      aviso('aviso-meus-dados', 'Dados salvos, mas erro ao atualizar autenticação: ' + errA.message, 'warn')
      btn.disabled = false
      btn.textContent = 'Salvar meus dados'
      return
    }
    // Atualiza email também em usuario (campo denormalizado)
    if (authUpdate.email) {
      await supabase.from('usuario').update({ email }).eq('id', usuarioAtual.id)
    }
  }

  usuarioAtual.nome = nome
  usuarioAtual.email = email
  usuarioAtual.fone = fone
  document.getElementById('meus-senha').value = ''
  document.getElementById('meus-senha-confirma').value = ''

  aviso('aviso-meus-dados', 'Dados salvos com sucesso!', 'ok')
  carregarEquipe()

  btn.disabled = false
  btn.textContent = 'Salvar meus dados'
})

// ── Adicionar administrador ───────────────────────────────────────────────────

document.getElementById('form-add-admin')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  esconderAviso('aviso-add-admin')

  const nome = document.getElementById('add-nome').value.trim()
  const email = document.getElementById('add-email').value.trim().toLowerCase()
  const fone = document.getElementById('add-telefone').value.trim()
  const senha = document.getElementById('add-senha').value
  const senhaConfirma = document.getElementById('add-senha-confirma').value

  if (!nome || !email || !senha) return aviso('aviso-add-admin', 'Nome, e-mail e senha são obrigatórios.', 'bad')
  if (senha.length < 6) return aviso('aviso-add-admin', 'A senha precisa ter pelo menos 6 caracteres.', 'bad')
  if (senha !== senhaConfirma) return aviso('aviso-add-admin', 'As senhas não conferem.', 'bad')

  const btn = e.target.querySelector('button[type="submit"]')
  btn.disabled = true
  btn.textContent = 'Adicionando...'

  // 1. Cria conta no Supabase Auth
  const { data: authData, error: errAuth } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } }
  })

  if (errAuth) {
    aviso('aviso-add-admin', errAuth.message.includes('already registered')
      ? 'Este e-mail já tem cadastro na plataforma.'
      : 'Erro ao criar conta: ' + errAuth.message, 'bad')
    btn.disabled = false
    btn.textContent = '+ Adicionar administrador'
    return
  }

  // 2. Insere na tabela usuario (sem telefone — não existe essa coluna)
  const { data: novoUsuario, error: errU } = await supabase
    .from('usuario')
    .insert({ nome, email, auth_id: authData.user.id, id_tipo: 1, id_situacao: 2 })
    .select('id')
    .maybeSingle()

  if (errU) {
    aviso('aviso-add-admin', 'Conta criada, mas erro ao salvar usuário: ' + errU.message, 'warn')
    btn.disabled = false
    btn.textContent = '+ Adicionar administrador'
    return
  }

  // 3. Insere na tabela administrador com fone
  const { error: errAdm } = await supabase
    .from('administrador')
    .insert({ id_usuario: novoUsuario.id, situacao: 'ativo', fone: fone || null })

  if (errAdm) {
    aviso('aviso-add-admin', 'Usuário criado, mas erro ao definir como admin: ' + errAdm.message, 'warn')
    btn.disabled = false
    btn.textContent = '+ Adicionar administrador'
    return
  }

  aviso('aviso-add-admin', `${nome} adicionado(a) com sucesso! Ele(a) precisará confirmar o e-mail antes de entrar.`, 'ok')
  e.target.reset()
  btn.disabled = false
  btn.textContent = '+ Adicionar administrador'
  carregarEquipe()
})

// ── Botão sair ────────────────────────────────────────────────────────────────

document.getElementById('btn-sair')?.addEventListener('click', async (e) => {
  e.preventDefault()
  await supabase.auth.signOut()
  window.location.href = '../index.html'
})

// ── Inicialização ─────────────────────────────────────────────────────────────

;(async () => {
  const sessao = await supabase.auth.getSession()
  if (!sessao.data.session) {
    window.location.href = 'entrar.html'
    return
  }

  // Busca usuario (sem telefone — coluna não existe em usuario)
  const { data: u } = await supabase
    .from('usuario')
    .select('id, nome, email')
    .eq('auth_id', sessao.data.session.user.id)
    .maybeSingle()

  if (!u) { window.location.href = 'entrar.html'; return }

  const isAdm = await ehAdministrador(u.id)
  if (!isAdm) { window.location.href = 'entrar.html'; return }

  // Busca fone do administrador
  const { data: admDados } = await supabase
    .from('administrador')
    .select('fone')
    .eq('id_usuario', u.id)
    .maybeSingle()

  usuarioAtual = { ...u, fone: admDados?.fone ?? '' }

  // Preenche topo
  const topoNome = document.getElementById('topo-nome')
  const topoInicial = document.getElementById('topo-inicial')
  if (topoNome) topoNome.textContent = u.nome
  if (topoInicial) topoInicial.textContent = iniciais(u.nome)

  // Preenche sidebar
  const sbFoto = document.getElementById('sidebar-foto')
  if (sbFoto) {
    sbFoto.innerHTML = `<span style="font-size:1.1rem;font-weight:700;color:#fff">${iniciais(u.nome)}</span>`
    sbFoto.style.background = corAvatar(u.nome)
  }
  const sbNome = document.querySelector('.sidebar-nome')
  if (sbNome) sbNome.textContent = u.nome

  carregarMeusDados()
  await carregarEquipe()
})()
