// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════
// Mesma URL e anon key públicas usadas em app.js — não são segredo,
// a proteção real é a senha verificada no servidor (Edge Function).
const SUPABASE_URL = 'https://gccxghayghuqrwdmtwnn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjY3hnaGF5Z2h1cXJ3ZG10d25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MzA3NDcsImV4cCI6MjEwMzAwNjc0N30.kUaWnK6Wx-M6Y3BGZM1JYo0a80DF-tNPCsxvZN054CM';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/public-cadastro`;

// Senha fica só na memória desta aba — nunca é salva em localStorage
// nem escrita neste arquivo. Some ao recarregar a página.
let accessPassword = null;

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bg = type === 'error' ? 'bg-red-600' : 'bg-green-600';
    toast.className = `${bg} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium`;
    toast.textContent = message; // textContent — nunca innerHTML com dados externos
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ── Máscaras de preenchimento (mesma lógica do app principal) ──
function applyMask(id, mask) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
        let v = this.value.replace(/\D/g, '');
        let out = '', vi = 0;
        for (let mi = 0; mi < mask.length && vi < v.length; mi++) {
            if (mask[mi] === '9') { out += v[vi++]; }
            else { out += mask[mi]; if (v[vi] === mask[mi]) vi++; }
        }
        this.value = out;
    });
}

function resetFormPageState() {
    accessPassword = null;
    document.getElementById('form-page').classList.add('hidden');
    document.getElementById('gate-page').classList.remove('hidden');
}

async function callFunction(payload) {
    const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
    });
    let json;
    try { json = await res.json(); } catch (_) { json = {}; }
    return { ok: res.ok && json.ok, status: res.status, data: json };
}

document.addEventListener('DOMContentLoaded', () => {
    applyMask('c-cpf', '999.999.999-99');
    applyMask('c-phone', '(99) 99999-9999');
    applyMask('c-cep', '99999-999');

    const gatePage = document.getElementById('gate-page');
    const formPage = document.getElementById('form-page');
    const gateForm = document.getElementById('gate-form');
    const gateBtn = document.getElementById('gate-btn');
    const gatePassword = document.getElementById('gate-password');
    const cidadaoForm = document.getElementById('cidadao-form-public');
    const saveBtn = document.getElementById('save-btn-public');

    gateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        gateBtn.disabled = true;
        gateBtn.innerHTML = '<div class="spinner"></div>';
        try {
            const { ok, status, data } = await callFunction({ action: 'verify', password: gatePassword.value });
            if (!ok) {
                if (status === 401) showToast('Chave de acesso incorreta.', 'error');
                else showToast(data.error || 'Erro ao verificar a chave.', 'error');
                return;
            }
            accessPassword = gatePassword.value;
            gatePassword.value = '';
            gatePage.classList.add('hidden');
            formPage.classList.remove('hidden');
        } catch (err) {
            console.error(err);
            showToast('Erro de conexão. Tente novamente.', 'error');
        } finally {
            gateBtn.disabled = false;
            gateBtn.innerHTML = 'Entrar';
        }
    });

    cidadaoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = s => (s && s.trim()) ? s.trim() : null;
        const name = document.getElementById('c-name').value.trim();
        if (!name) {
            showToast('O nome é obrigatório.', 'error');
            return;
        }
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<div class="spinner"></div>';

        // "Indicado por" não tem coluna própria no banco — é anexado ao
        // campo Complemento do endereço como observação de texto.
        const complementoBase = v(document.getElementById('c-complemento').value);
        const indicadoPor = v(document.getElementById('c-indicadopor').value);
        let complementoFinal = complementoBase;
        if (indicadoPor) {
            complementoFinal = complementoBase
                ? `${complementoBase} | Indicado por: ${indicadoPor}`
                : `Indicado por: ${indicadoPor}`;
        }

        const payload = {
            action: 'create',
            password: accessPassword,
            honeypot: document.getElementById('website').value,
            cidadao: {
                name,
                dob: document.getElementById('c-dob').value || null,
                sexo: document.getElementById('c-sexo').value || null,
                type: document.getElementById('c-type').value || 'Outro',
                cpf: v(document.getElementById('c-cpf').value),
                localtrabalho: v(document.getElementById('c-escola').value),
                phone: v(document.getElementById('c-phone').value),
                whatsapp: document.getElementById('c-whatsapp').checked,
                cep: v(document.getElementById('c-cep').value),
                logradouro: v(document.getElementById('c-logradouro').value),
                numero: v(document.getElementById('c-numero').value),
                complemento: complementoFinal,
                bairro: v(document.getElementById('c-bairro').value),
                cidade: v(document.getElementById('c-cidade').value),
                estado: v(document.getElementById('c-estado').value)
            }
        };
        try {
            const { ok, status, data } = await callFunction(payload);
            if (!ok) {
                if (status === 401) {
                    showToast('Sua sessão expirou. Digite a chave novamente.', 'error');
                    resetFormPageState();
                    return;
                }
                throw new Error(data.error || 'Erro ao cadastrar.');
            }
            showToast('Cidadão cadastrado com sucesso!', 'success');
            cidadaoForm.reset();
            document.getElementById('c-name').focus();
        } catch (err) {
            console.error(err);
            showToast(err.message || 'Erro ao cadastrar. Tente novamente.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Cadastrar';
        }
    });
});
