import { supabase } from './supabase.js'

const form      = document.getElementById('form-cadastrar')
const btn       = document.getElementById('btn-cadastrar')
const msgErr    = document.getElementById('msg-erro')
const msgErrTxt = document.getElementById('msg-erro-texto')
const msgOk     = document.getElementById('msg-ok')

function mostrarErro(txt) {
  msgErrTxt.textContent = txt
  msgErr.style.display = 'flex'
  msgOk.style.display  = 'none'
}

async function carregarCategorias() {
  const { data: cats } = await supabase.from('categoria_de_empreendimento').select('id, nome').order('nome')
  const sel = document.getElementById('campo-categoria')
  if (cats) cats.forEach(c => {
    const opt = document.createElement('option')
    opt.value = c.id
    opt.textContent = c.nome
    sel.appendChild(opt)
  })
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  msgErr.style.display = 'none'
  msgOk.style.display  = 'none'

  const nome        = document.getElementById('campo-nome').value.trim()
  const email       = document.getElementById('campo-email').value.trim().toLowerCase()
  const empNome     = document.getElementById('campo-emp-nome').value.trim()
  const categoriaId = document.getElementById('campo-categoria').value
  const telefone    = document.getElementById('campo-telefone').value.trim()
  const senha       = document.getElementById('campo-senha').value
  const senha2      = document.getElementById('campo-senha2').value
  const termos      = document.getElementById('campo-termos').checked

  if (!nome || !email || !empNome || !categoriaId || !telefone || !senha)
    return mostrarErro('Preencha todos os campos obrigatórios.')
  if (senha !== senha2) return mostrarErro('As senhas não coincidem.')
  if (senha.length < 8) return mostrarErro('A senha deve ter pelo menos 8 caracteres.')
  if (!termos) return mostrarErro('Aceite os termos de uso para continuar.')

  btn.disabled = true
  btn.textContent = 'Criando conta...'

  const { error: errAuth } = await supabase.auth.signUp({ email, password: senha })
  if (errAuth) {
    mostrarErro(errAuth.message.includes('already registered')
      ? 'Este e-mail já tem cadastro. Entre na sua conta.'
      : (errAuth.message || 'Erro ao criar conta. Tente novamente.'))
    btn.disabled = false
    btn.textContent = 'Criar minha conta'
    return
  }

  const { data: resCad, error: errCad } = await supabase.rpc('cadastrar_empreendimento', {
    dados: {
      nome_empreendimento: empNome,
      nome_usuario:        nome,
      email_usuario:       email,
      id_categoria:        parseInt(categoriaId),
      telefone1:           telefone
    }
  })

  if (errCad || !resCad?.ok) {
    mostrarErro(
      errCad?.message ||
      resCad?.mensagem ||
      'Conta criada, mas houve erro ao registrar o empreendimento. Tente novamente.'
    )
    btn.disabled = false
    btn.textContent = 'Criar minha conta'
    return
  }

  window.location.href = 'status-pendente.html'
})

carregarCategorias()
