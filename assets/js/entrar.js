import { supabase } from './supabase.js'

async function redirecionarAposLogin() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: u } = await supabase.from('usuario').select('id').eq('auth_id', user.id).maybeSingle()
  if (!u) { window.location.href = 'cadastrar.html'; return }

  const { data: adm } = await supabase.from('administrador').select('id_usuario').eq('id_usuario', u.id).maybeSingle()
  if (adm) { window.location.href = 'admin.html'; return }

  const { data: vinculo } = await supabase
    .from('usuario_empreendimento')
    .select('id_empreendimento')
    .eq('id_usuario', u.id)
    .maybeSingle()

  if (!vinculo) { window.location.href = 'cadastrar.html'; return }

  const { data: emp } = await supabase
    .from('empreendimento')
    .select('id_situacao')
    .eq('id', vinculo.id_empreendimento)
    .maybeSingle()

  const paginaPorSit = {
    1: 'status-pendente.html',
    2: 'painel.html',
    3: 'status-excluido.html',
    4: 'status-suspenso.html',
    5: 'status-recusado.html'
  }
  window.location.href = paginaPorSit[emp?.id_situacao] ?? 'painel.html'
}

async function init() {
  const [{ count: emps }, { count: itens }] = await Promise.all([
    supabase.from('empreendimento').select('*', { count: 'exact', head: true }).eq('id_situacao', 2),
    supabase.from('item').select('*', { count: 'exact', head: true }).eq('id_situacao', 2)
  ])
  const elEmps = document.getElementById('stat-emps')
  const elItens = document.getElementById('stat-itens-pub')
  if (elEmps) elEmps.textContent = emps ?? '—'
  if (elItens) elItens.textContent = itens ?? '—'

  const form   = document.getElementById('form-entrar')
  const btn    = document.getElementById('btn-entrar')
  const msgDiv = document.getElementById('msg-erro')
  const msgTxt = document.getElementById('msg-erro-texto')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('campo-email').value.trim()
    const senha = document.getElementById('campo-senha').value
    if (!email || !senha) return

    btn.disabled = true
    btn.textContent = 'Entrando...'
    msgDiv.style.display = 'none'

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      msgTxt.textContent = 'E-mail ou senha incorretos. Verifique e tente novamente.'
      msgDiv.style.display = 'flex'
      btn.disabled = false
      btn.textContent = 'Entrar na conta'
      return
    }

    await redirecionarAposLogin()
  })
}

init()