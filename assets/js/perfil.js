import { supabase } from './supabase.js'
import { meuEmpreendimento, ligarBotaoSair } from './sessao.js'

const mnavSair = document.getElementById('mnav-sair-emp')
if (mnavSair) {
  mnavSair.addEventListener('click', e => {
    e.preventDefault()
    document.getElementById('btn-sair').click()
  })
}

// ── ViaCEP ──────────────────────────────────────────────────
function formatarCep(valor) {
  return valor.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9)
}

async function buscarCep(cep) {
  const limpo = cep.replace(/\D/g, '')
  if (limpo.length !== 8) return
  try {
    const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
    const d = await r.json()
    if (d.erro) return
    document.getElementById('emp-rua').value         = d.logradouro || ''
    document.getElementById('emp-bairro').value      = d.bairro     || ''
    document.getElementById('emp-cidade').value      = d.localidade || ''
    document.getElementById('emp-uf').value          = d.uf         || ''
    document.getElementById('emp-numero').focus()
  } catch {}
}

document.getElementById('emp-cep').addEventListener('input', e => {
  e.target.value = formatarCep(e.target.value)
})
document.getElementById('emp-cep').addEventListener('blur', e => {
  buscarCep(e.target.value)
})

// ── Init ─────────────────────────────────────────────────────
async function init() {
  const dados = await meuEmpreendimento()
  if (!dados?.empreendimento) {
    window.location.href = dados ? 'cadastrar.html' : 'entrar.html'
    return
  }

  const { usuario: info, empreendimento: emp } = dados

  const nome = info?.nome || info?.email || '?'
  document.getElementById('topo-nome').textContent = nome
  document.getElementById('sidebar-nome').textContent = nome
  const ini = nome[0].toUpperCase()
  document.getElementById('topo-inicial').textContent = ini
  document.getElementById('sidebar-inicial').textContent = ini
  document.getElementById('campo-nome').value = info?.nome || ''
  document.getElementById('campo-email').value = info?.email || ''
  ligarBotaoSair()

  const { data: cats } = await supabase.from('categoria_de_empreendimento').select('id, nome').order('nome')
  const sel = document.getElementById('emp-categoria')
  if (cats) cats.forEach(c => {
    const opt = document.createElement('option')
    opt.value = c.id
    opt.textContent = c.nome
    sel.appendChild(opt)
  })

  const empId = emp?.id || null
  if (emp) {
    document.getElementById('emp-nome').value = emp.nome || ''
    document.getElementById('emp-descricao').value = emp.descricao || ''
    document.getElementById('emp-telefone').value = emp.telefone1 || ''
    if (emp.id_categoria) sel.value = emp.id_categoria
    if (emp.foto_url) {
      document.getElementById('emp-foto-preview').innerHTML =
        `<img src="${emp.foto_url}" alt="Foto do empreendimento" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`
    }
  }

  // ── Carrega endereço da tabela endereco ──────────────────
  if (empId) {
    const { data: end } = await supabase
      .from('endereco')
      .select('*')
      .eq('id_empreendimento', empId)
      .eq('seq', 1)
      .maybeSingle()

    if (end) {
      document.getElementById('emp-cep').value         = end.cep          ? formatarCep(end.cep) : ''
      document.getElementById('emp-rua').value         = end.rua          || ''
      document.getElementById('emp-numero').value      = end.numero       || ''
      document.getElementById('emp-complemento').value = end.complemento  || ''
      document.getElementById('emp-bairro').value      = end.bairro       || ''
      document.getElementById('emp-cidade').value      = end.cidade       || ''
      document.getElementById('emp-uf').value          = end.uf           || ''
    }
  }

  document.getElementById('btn-trocar-foto').addEventListener('click', () =>
    document.getElementById('input-foto').click()
  )
  document.getElementById('input-foto').addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file || !empId) return
    const ext = file.name.split('.').pop()
    const path = `empreendimentos/${empId}/logo.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(path, file, { upsert: true })
    if (error) { alert('Erro ao enviar foto: ' + error.message); return }
    const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
    await supabase.from('empreendimento').update({ foto_url: publicUrl }).eq('id', empId)
    document.getElementById('emp-foto-preview').innerHTML =
      `<img src="${publicUrl}" alt="Foto" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`
  })

  document.getElementById('btn-salvar').addEventListener('click', async () => {
    const btn = document.getElementById('btn-salvar')
    btn.disabled = true
    btn.textContent = 'Salvando…'

    const novoNome = document.getElementById('campo-nome').value.trim()
    const { error: eu } = await supabase.from('usuario').update({ nome: novoNome }).eq('id', info.id)

    if (empId) {
      const { error: ee } = await supabase.from('empreendimento').update({
        nome:         document.getElementById('emp-nome').value.trim(),
        descricao:    document.getElementById('emp-descricao').value.trim() || null,
        telefone1:    document.getElementById('emp-telefone').value.trim() || emp?.telefone1 || '',
        id_categoria: document.getElementById('emp-categoria').value || null
      }).eq('id', empId)

      if (ee) {
        alert('Erro ao salvar empreendimento: ' + ee.message)
        btn.disabled = false
        btn.textContent = 'Salvar alterações'
        return
      }

      // ── Salva endereço na tabela endereco ──────────────
      const cep         = document.getElementById('emp-cep').value.replace(/\D/g, '') || null
      const rua         = document.getElementById('emp-rua').value.trim() || null
      const numero      = document.getElementById('emp-numero').value.trim() || null
      const complemento = document.getElementById('emp-complemento').value.trim() || null
      const bairro      = document.getElementById('emp-bairro').value.trim() || null
      const cidade      = document.getElementById('emp-cidade').value.trim() || null
      const uf          = document.getElementById('emp-uf').value.trim().toUpperCase() || null

      if (rua || cep) {
        const payload = { id_empreendimento: empId, seq: 1, cep, rua, numero, complemento, bairro, cidade, uf }

        const { data: endExist } = await supabase
          .from('endereco')
          .select('id')
          .eq('id_empreendimento', empId)
          .eq('seq', 1)
          .maybeSingle()

        if (endExist) {
          await supabase.from('endereco').update(payload).eq('id', endExist.id)
        } else {
          await supabase.from('endereco').insert(payload)
        }
      }
    }

    if (eu) {
      alert('Erro ao salvar perfil: ' + eu.message)
    } else {
      const msgDiv = document.getElementById('msg-topo')
      msgDiv.innerHTML = '<div class="aviso ok"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Perfil atualizado com sucesso!</div>'
      msgDiv.style.display = 'block'
      setTimeout(() => msgDiv.style.display = 'none', 3000)
    }
    btn.disabled = false
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Salvar alterações'
  })
}

init()

import './mnav-ativo.js'
