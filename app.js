const SUPABASE_URL = 'https://gccxghayghuqrwdmtwnn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjY3hnaGF5Z2h1cXJ3ZG10d25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MzA3NDcsImV4cCI6MjEwMzAwNjc0N30.kUaWnK6Wx-M6Y3BGZM1JYo0a80DF-tNPCsxvZN054CM';
const EDGE_FUNCTION_URL = 'https://gccxghayghuqrwdmtwnn.supabase.co/functions/v1/manage-users';
const { createClient } = supabase;
let sb, user = null, userRole = null; // userRole: 'admin' | 'cadastrador'
try {
    sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
    });
} catch (error) {
    console.error("Erro ao inicializar:", error);
    alert("Erro crítico de conexão.");
}
let allCidadaos = [], allDemandas = [], allLeaders = [];
// userRole carregado após login ('admin' ou 'cadastrador')
let allUsers = []; // lista de utilizadores (só admin)
// Paginação server-side — controlada por CIDADAOS_PAGE_SIZE e cidadaosServerOffset
let currentEditingId = null;
let currentCidadaoIdForDemanda = null;
let currentCidadaoIdForDetails = null;
let currentEditingDemandaId = null;
let viewingDemandaId = null;
let appInitialized = false;
let _initLock = false;
let logoBtn, logoutBtn, sidebarNav, addCidadaoBtn, addDemandaGeralBtn,
    closeModalBtn, cancelBtn, saveBtn, closeDetailsModalBtn, closeDemandaModalBtn,
    cancelDemandaBtn, closeDemandaDetailsBtn, closeMapBtn, cidadaoModal,
    modalContent, cidadaoDetailsModal, demandaModal, demandaDetailsModal,
    mapModal, confirmationModal, cidadaoForm, demandaForm, addNoteForm,
    searchInput, filterType, filterBairro, filterCidade, filterLeader, filterSexo,
    filterFaixaEtaria, filterLocalTrabalho, clearFiltersBtn, generateReportBtn, viewMapBtn,
    demandaFilterStatus, demandaFilterLeader, demandaSearchNome, demandaClearFiltersBtn,
    cidadaosGrid, allDemandasList, cidadaoLeaderSelect, demandaCidadaoSelect,
    cancelDeleteBtn, confirmDeleteBtn, cidadaoName, cidadaoEmail, cidadaoDob,
    cidadaoSexo, cidadaoType, cidadaoCPF, cidadaoRG, cidadaoVoterId,
    cidadaoPhone, cidadaoWhatsapp, cidadaoProfissao, cidadaoLocalTrabalho,
    cidadaoCEP, cidadaoLogradouro, cidadaoNumero, cidadaoComplemento,
    cidadaoBairro, cidadaoCidade, cidadaoEstado, cidadaoSons, cidadaoDaughters,
    childrenDetailsContainer, cidadaoPhotoUrl, cidadaoPhotoUpload, fileNameDisplay,
    loadMoreBtn, cidadaoLat, cidadaoLong,
    itemToDelete = { id: null, type: null }, 
    map = null, markers = [], cidadaosChart = null, demandasChart = null, 
    cidadaosBairroChart = null, cidadaosSexoChart = null, cidadaosFaixaEtariaChart = null, cidadaosMunicipioChart = null; 
document.addEventListener('DOMContentLoaded', () => {
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('email-address');
    const passwordInput = document.getElementById('password');
    sb.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            user = session.user;
            loginPage.classList.add('hidden');
            appContainer.style.display = 'flex';
            if (!appInitialized && !_initLock) {
                _initLock = true;
                initializeMainApp().finally(() => { _initLock = false; });
            }
        } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
            user = null;
            userRole = null;
            allCidadaos = []; allDemandas = []; allLeaders = [];
            appInitialized = false;
            _initLock = false;
            // Restaura botão — independente de qual elemento está no DOM agora
            const lb = document.getElementById('logout-btn');
            if (lb) { lb.disabled = false; lb.innerHTML = 'Sair'; }
            loginPage.classList.remove('hidden');
            appContainer.style.display = 'none';
        }
    });
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<div class="spinner"></div>';
        try {
            const { error } = await sb.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) throw error;
        } catch (error) {
            console.error(error.message);
            showToast("Credenciais inválidas.", "error");
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Entrar';
        }
    });
    async function manageSessionOnLoad() {
        const { data: { session } } = await sb.auth.getSession();
        if (session && session.user) {
            user = session.user;
            loginPage.classList.add('hidden');
            appContainer.style.display = 'flex';
            if (!appInitialized && !_initLock) {
                _initLock = true;
                try { await initializeMainApp(); }
                finally { _initLock = false; }
            }
        } else {
            user = null;
            loginPage.classList.remove('hidden');
            appContainer.style.display = 'none';
        }
    }
    manageSessionOnLoad();
    async function initializeMainApp() {
        if (appInitialized) return;
        allCidadaos = []; allDemandas = []; allLeaders = []; allUsers = [];
        userRole = null;
        await new Promise(resolve => setTimeout(resolve, 50)); 
        logoBtn = document.getElementById('logo-btn'); 
        logoutBtn = document.getElementById('logout-btn');
        sidebarNav = document.getElementById('sidebar-nav');
        addCidadaoBtn = document.getElementById('add-cidadao-btn');
        addDemandaGeralBtn = document.getElementById('add-demanda-geral-btn');
        closeModalBtn = document.getElementById('close-modal-btn');
        cancelBtn = document.getElementById('cancel-btn');
        saveBtn = document.getElementById('save-btn');
        closeDetailsModalBtn = document.getElementById('close-details-modal-btn');
        closeDemandaModalBtn = document.getElementById('close-demanda-modal-btn');
        cancelDemandaBtn = document.getElementById('cancel-demanda-btn');
        closeDemandaDetailsBtn = document.getElementById('close-demanda-details-btn');
        closeMapBtn = document.getElementById('close-map-btn');
        cidadaoModal = document.getElementById('cidadao-modal');
        modalContent = document.getElementById('modal-content');
        cidadaoDetailsModal = document.getElementById('cidadao-details-modal');
        demandaModal = document.getElementById('demanda-modal');
        demandaDetailsModal = document.getElementById('demanda-details-modal');
        mapModal = document.getElementById('map-modal');
        confirmationModal = document.getElementById('confirmation-modal');
        cidadaoForm = document.getElementById('cidadao-form');
        demandaForm = document.getElementById('demanda-form');
        addNoteForm = document.getElementById('add-note-form');
        searchInput = document.getElementById('search-input');
        filterType = document.getElementById('filter-type');
        filterBairro = document.getElementById('filter-bairro');
        filterCidade = document.getElementById('filter-cidade');
        filterCidade = document.getElementById('filter-cidade');
        filterLeader = document.getElementById('filter-leader');
        filterSexo = document.getElementById('filter-sexo');
        filterFaixaEtaria = document.getElementById('filter-faixa-etaria');
        filterLocalTrabalho = document.getElementById('filter-local-trabalho');
        clearFiltersBtn = document.getElementById('clear-filters-btn');
        generateReportBtn = document.getElementById('generate-report-btn');
        viewMapBtn = document.getElementById('view-map-btn');
        demandaFilterStatus  = document.getElementById('demanda-filter-status');
        demandaFilterLeader  = document.getElementById('demanda-filter-leader');
        demandaSearchNome    = document.getElementById('demanda-search-nome');
        demandaClearFiltersBtn = document.getElementById('demanda-clear-filters-btn');
        cidadaosGrid = document.getElementById('cidadaos-grid');
        loadMoreBtn = document.getElementById('load-more-btn');
        allDemandasList = document.getElementById('all-demandas-list');
        cidadaoLeaderSelect = document.getElementById('cidadao-leader');
        demandaCidadaoSelect = document.getElementById('demanda-cidadao-select');
        cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        cidadaoName = document.getElementById('cidadao-name');
        cidadaoEmail = document.getElementById('cidadao-email');
        cidadaoDob = document.getElementById('cidadao-dob');
        cidadaoSexo = document.getElementById('cidadao-sexo');
        cidadaoType = document.getElementById('cidadao-type');
        cidadaoCPF = document.getElementById('cidadao-cpf');
        cidadaoRG = document.getElementById('cidadao-rg');
        cidadaoVoterId = document.getElementById('cidadao-voterid');
        cidadaoZona = document.getElementById('cidadao-zona');
        cidadaoSecao = document.getElementById('cidadao-secao');
        cidadaoPhone = document.getElementById('cidadao-phone');
        cidadaoWhatsapp = document.getElementById('cidadao-whatsapp');
        cidadaoProfissao = document.getElementById('cidadao-profissao');
        cidadaoLocalTrabalho = document.getElementById('cidadao-local-trabalho');
        cidadaoCEP = document.getElementById('cidadao-cep');
        cidadaoLogradouro = document.getElementById('cidadao-logradouro');
        cidadaoNumero = document.getElementById('cidadao-numero');
        cidadaoComplemento = document.getElementById('cidadao-complemento');
        cidadaoBairro = document.getElementById('cidadao-bairro');
        cidadaoCidade = document.getElementById('cidadao-cidade');
        cidadaoEstado = document.getElementById('cidadao-estado');
        cidadaoSons = document.getElementById('cidadao-sons');
        cidadaoDaughters = document.getElementById('cidadao-daughters');
        childrenDetailsContainer = document.getElementById('children-details-container');
        cidadaoPhotoUrl = document.getElementById('cidadao-photo-url');
        cidadaoPhotoUpload = document.getElementById('cidadao-photo-upload');
        fileNameDisplay = document.getElementById('file-name-display');
        cidadaoLat = document.getElementById('cidadao-lat');
        cidadaoLong = document.getElementById('cidadao-long');
        if (!logoutBtn || !cidadaoForm) {
            appInitialized = false; 
            return; 
        }
        if (logoBtn) {
            logoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                switchPage('dashboard-page');
            });
        }
        // Listener de logout — flag evita duplicatas sem precisar de cloneNode
        if (!logoutBtn._listenerAdded) {
            logoutBtn._listenerAdded = true;
            logoutBtn.addEventListener('click', async () => {
                if (logoutBtn.disabled) return;
                try {
                    logoutBtn.disabled = true;
                    logoutBtn.innerHTML = '<div class="spinner mx-auto"></div>';
                    await sb.auth.signOut();
                    // onAuthStateChange (SIGNED_OUT) restaura o botão e limpa o estado
                } catch (error) {
                    logoutBtn.disabled = false;
                    logoutBtn.innerHTML = 'Sair';
                    showToast("Erro ao terminar sessão.", "error");
                }
            });
        }
        sidebarNav.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
                e.preventDefault();
                const page = link.getAttribute('href').substring(1);
                if (page === 'mapa') {
                    openMapModal();
                } else {
                    switchPage(page + '-page');
                }
            }
        });
        addCidadaoBtn.addEventListener('click', () => openCidadaoModal());
        addDemandaGeralBtn.addEventListener('click', () => openDemandaModal());
        viewMapBtn.addEventListener('click', () => openMapModal());
        closeModalBtn.addEventListener('click', closeCidadaoModal);
        cancelBtn.addEventListener('click', closeCidadaoModal);
        closeDetailsModalBtn.addEventListener('click', closeDetailsModal);
        closeDemandaModalBtn.addEventListener('click', closeDemandaModal);
        cancelDemandaBtn.addEventListener('click', closeDemandaModal);
        closeDemandaDetailsBtn.addEventListener('click', closeDemandaDetailsModal);
        closeMapBtn.addEventListener('click', closeMapModal);
        cidadaoForm.addEventListener('submit', handleCidadaoFormSubmit);
        demandaForm.addEventListener('submit', handleDemandaFormSubmit);
        addNoteForm.addEventListener('submit', handleAddNoteSubmit);
        // PERFORMANCE: debounce de 350ms — evita query a cada tecla digitada
        let searchDebounce;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => renderCidadaos(), 350);
        });
        filterType.addEventListener('change', () => renderCidadaos());
        filterBairro.addEventListener('change', () => renderCidadaos());
        if (filterCidade) filterCidade.addEventListener('change', () => renderCidadaos());
        if (filterCidade) filterCidade.addEventListener('change', () => renderCidadaos());
        filterLeader.addEventListener('change', () => renderCidadaos());
        filterSexo.addEventListener('change', () => renderCidadaos());
        filterFaixaEtaria.addEventListener('change', () => renderCidadaos());
        let filterLocalTrabalhoDebounce;
        filterLocalTrabalho.addEventListener('input', () => {
            clearTimeout(filterLocalTrabalhoDebounce);
            filterLocalTrabalhoDebounce = setTimeout(() => renderCidadaos(), 350);
        });
        clearFiltersBtn.addEventListener('click', clearCidadaoFilters);
        loadMoreBtn.addEventListener('click', renderMoreCidadaos);
        demandaFilterStatus.addEventListener('change', () => loadDemandasPage(true));
        demandaFilterLeader.addEventListener('change',  () => loadDemandasPage(true));
        demandaSearchNome?.addEventListener('input', () => {
            clearTimeout(demandaSearchNome._t);
            demandaSearchNome._t = setTimeout(() => loadDemandasPage(true), 400);
        });
        demandaClearFiltersBtn.addEventListener('click', clearDemandaFilters);
        document.getElementById('demandas-load-more-btn')?.addEventListener('click', () => loadDemandasPage(false));
        generateReportBtn.addEventListener('click', generatePrintReport);
        const excelReportBtn = document.getElementById('generate-excel-btn');
        if (excelReportBtn) excelReportBtn.addEventListener('click', generateExcelReport);
        // Cobertura Eleitoral
        document.getElementById('cobertura-load-btn')?.addEventListener('click', loadCoberturaEleitoral);
        // Listeners modal aniversariantes
        document.getElementById('close-aniversariantes-modal')?.addEventListener('click', closeAniversariantesModal);
        document.getElementById('aniv-modal-prev')?.addEventListener('click', () => { _anivModalPagina--; renderAniversariantesModal(); });
        document.getElementById('aniv-modal-next')?.addEventListener('click', () => { _anivModalPagina++; renderAniversariantesModal(); });
        document.getElementById('aniversariantes-modal')?.addEventListener('click', e => {
            if (e.target === document.getElementById('aniversariantes-modal')) closeAniversariantesModal();
        });
        document.getElementById('cobertura-clear-btn')?.addEventListener('click', clearCoberturaFiltros);
        document.getElementById('cobertura-excel-btn')?.addEventListener('click', exportCoberturaExcel);
        // Backup
        document.getElementById('backup-json-btn')?.addEventListener('click', () => backupData('json'));
        document.getElementById('backup-csv-btn')?.addEventListener('click', () => backupData('csv'));
        const addUserBtn = document.getElementById('add-user-btn');
        if (addUserBtn) addUserBtn.addEventListener('click', () => openUserModal());
        const closeUserModalBtn = document.getElementById('close-user-modal-btn');
        if (closeUserModalBtn) closeUserModalBtn.addEventListener('click', closeUserModal);
        const cancelUserBtn = document.getElementById('cancel-user-btn');
        if (cancelUserBtn) cancelUserBtn.addEventListener('click', closeUserModal);
        const userForm = document.getElementById('user-form');
        if (userForm) userForm.addEventListener('submit', handleUserFormSubmit);
        cancelDeleteBtn.addEventListener('click', closeConfirmationModal);
        confirmDeleteBtn.addEventListener('click', handleDeleteConfirmation);
        cidadaoCEP.addEventListener('blur', handleCEPBlur);
        cidadaoPhotoUpload.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                fileNameDisplay.textContent = e.target.files[0].name;
                cidadaoPhotoUrl.value = '';
            } else {
                fileNameDisplay.textContent = 'Nenhum ficheiro selecionado';
            }
        });
        cidadaoSons.addEventListener('input', () => updateChildrenInputs('filho'));
        cidadaoDaughters.addEventListener('input', () => updateChildrenInputs('filha'));
        try {
             await loadInitialData(); 
             appInitialized = true; 
             switchPage('dashboard-page');
        } catch (e) {
             console.error(e);
             showToast("Erro fatal de dados. Por favor, faça login novamente.", "error");
             await sb.auth.signOut(); 
        }
    }
    // ── PERFORMANCE: controle de estado de busca server-side ──────────────────
    let serverSearchState = { search: '', type: '', bairro: '', cidade: '', leader: '', sexo: '', faixaEtaria: '', localTrabalho: '' };

    // ── Paginação server-side de demandas ─────────────────────────────────
    const DEMANDAS_PAGE_SIZE = 15;
    let demandasServerOffset = 0;
    let totalDemandasCount = 0;
    let demandasSearchState = { status: '', leader: '' };
    const CIDADAOS_PAGE_SIZE = 12;
    let totalCidadaosCount = 0;
    let cidadaosServerOffset = 0;

    async function loadInitialData() {
        if (!user) return;
        try {
            // ── 1. Perfil primeiro — define userRole antes de tudo ───────
            const { data: profileData, error: profileError } = await sb
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (profileError || !profileData) {
                await sb.auth.signOut();
                showToast('Acesso negado. O seu utilizador não tem perfil atribuído.', 'error');
                throw new Error('Perfil não encontrado.');
            }
            userRole = profileData.role;
            applyRoleUI();

            // ── 2. Líderes + demandas + bairros em paralelo ──────────────
            const [leadersRes, demandasRes] = await Promise.all([
                sb.from('cidadaos')
                    .select('id, name, type')
                    .eq('type', 'Liderança')
                    .order('name', { ascending: true }),
                loadBairrosDistintos()
            ]);
            if (leadersRes.error) throw leadersRes.error;
            allLeaders = leadersRes.data;

            updateLeaderSelects();
            updateBairroFilter();
            await loadDemandasPage(true);

            // ── 3. Cidadãos + dashboard + utilizadores em paralelo ───────
            await Promise.all([
                loadCidadaosPage(true),
                updateDashboard(),
                userRole === 'admin' ? loadUsers() : Promise.resolve()
            ]);

            return true;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    // ── Ajusta interface conforme o perfil do utilizador ────────────────
    function applyRoleUI() {
        if (userRole === 'cadastrador') {
            // Esconde funcionalidades exclusivas do admin
            const els = [
                document.getElementById('generate-report-btn'), // relatório global
                document.getElementById('generate-excel-btn'),  // excel global
                document.getElementById('view-map-btn'),        // mapa global
            ];
            els.forEach(el => { if (el) el.classList.add('hidden'); });
            // Esconde links Mapa e Utilizadores na sidebar para cadastrador
            document.querySelectorAll('#sidebar-nav a').forEach(a => {
                const href = a.getAttribute('href');
                if (href === '#mapa' || href === '#utilizadores' || href === '#cobertura' || href === '#backup') {
                    a.parentElement.classList.add('hidden');
                }
            });
            // Botão delete nos cards é ocultado em buildCidadaoCard via userRole
        }
    }

    async function loadBairrosDistintos() {
        try {
            const { data, error } = await sb
                .from('cidadaos')
                .select('bairro')
                .not('bairro', 'is', null)
                .order('bairro', { ascending: true });
            if (error) throw error;
            const bairrosUnicos = [...new Set(data.map(c => c.bairro).filter(Boolean))];
            // Guarda para o filtro sem precisar de allCidadaos
            window._bairrosDisponiveis = bairrosUnicos;
        } catch (e) {
            console.warn('Não foi possível carregar bairros:', e);
            window._bairrosDisponiveis = [];
        }
    }

    // ── PERFORMANCE: busca paginada no servidor ────────────────────────────────
    async function loadCidadaosPage(reset = false) {
        if (!cidadaosGrid) return;
        if (reset) {
            cidadaosServerOffset = 0;
            cidadaosGrid.innerHTML = '';
            allCidadaos = []; // limpa cache local
        }

        const s = serverSearchState;
        let query = sb.from('cidadaos').select('*', { count: 'exact' });

        // Filtros aplicados no servidor
        if (s.search) {
            query = query.or(`name.ilike.%${s.search}%,email.ilike.%${s.search}%,cpf.ilike.%${s.search}%,voterid.ilike.%${s.search}%`);
        }
        if (s.type)    query = query.eq('type', s.type);
        if (s.bairro)  query = query.eq('bairro', s.bairro);
        if (s.cidade)  query = query.eq('cidade', s.cidade);
        if (s.leader)  query = query.eq('leader', s.leader);
        if (s.sexo)    query = query.eq('sexo', s.sexo);
        if (s.localTrabalho) query = query.ilike('localtrabalho', `%${s.localTrabalho}%`);

        // Faixa etária: calcula intervalo de datas no servidor
        if (s.faixaEtaria && s.faixaEtaria !== 'N/A') {
            const hoje = new Date();
            const faixas = {
                '0-17':  [0, 17], '18-25': [18, 25], '26-35': [26, 35],
                '36-50': [36, 50], '51-65': [51, 65], '66+':   [66, 150]
            };
            const [minAge, maxAge] = faixas[s.faixaEtaria] || [0, 150];
            const maxDate = new Date(hoje); maxDate.setFullYear(hoje.getFullYear() - minAge);
            const minDate = new Date(hoje); minDate.setFullYear(hoje.getFullYear() - maxAge - 1);
            query = query.gte('dob', minDate.toISOString().split('T')[0])
                         .lte('dob', maxDate.toISOString().split('T')[0]);
        }

        query = query
            .order('name', { ascending: true })
            .range(cidadaosServerOffset, cidadaosServerOffset + CIDADAOS_PAGE_SIZE - 1);

        const { data, error, count } = await query;
        if (error) { console.error(error); showToast('Erro ao carregar cidadãos.', 'error'); return; }

        totalCidadaosCount = count ?? totalCidadaosCount;
        allCidadaos = reset ? data : [...allCidadaos, ...data];
        cidadaosServerOffset += data.length;

        // Renderiza somente o batch novo
        if (reset) cidadaosGrid.innerHTML = '';
        if (allCidadaos.length === 0) {
            cidadaosGrid.innerHTML = '<p class="text-gray-500 col-span-full text-center">Nenhum cidadão encontrado.</p>';
        } else {
            data.forEach(cidadao => cidadaosGrid.appendChild(buildCidadaoCard(cidadao)));
        }

        const loadMoreContainer = document.getElementById('load-more-container');
        if (cidadaosServerOffset < totalCidadaosCount) {
            loadMoreContainer.classList.remove('hidden');
        } else {
            loadMoreContainer.classList.add('hidden');
        }

        // Atualiza contador no topo
        const countEl = document.getElementById('cidadaos-count');
        if (countEl) countEl.textContent = `${totalCidadaosCount} encontrado(s)`;
    }
    async function handleCidadaoFormSubmit(e) {
    e.preventDefault();
    if (!user) {
        showToast("Sessão expirada. Faça login novamente.", "error");
        return;
    }
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner"></div>';
    const cpf = cidadaoCPF.value.trim() || null;
    const voterid = cidadaoVoterId.value.trim() || null;
    try {
        let photoUrl = cidadaoPhotoUrl.value;
        const file = cidadaoPhotoUpload.files[0];
        if (file) {
            const filePath = `${user.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await sb.storage
                .from('fotos-cidadaos') 
                .upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data } = sb.storage
                .from('fotos-cidadaos')
                .getPublicUrl(filePath);
            photoUrl = data.publicUrl;
        }
        let lat = null, long = null;
        const address = `${cidadaoLogradouro.value}, ${cidadaoBairro.value}, ${cidadaoCidade.value}, ${cidadaoEstado.value}`;
        if (cidadaoLogradouro.value && cidadaoCidade.value) {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
                const data = await response.json();
                if (data && data.length > 0) {
                    lat = parseFloat(data[0].lat);
                    long = parseFloat(data[0].lon);
                }
            } catch (geocodeError) {
                console.error(geocodeError);
            }
        }
        const v = s => s && s.trim() ? s.trim() : null; // helper: vazio → null
        const cidadaoData = {
            name: cidadaoName.value.trim(), // único obrigatório
            email: v(cidadaoEmail.value),
            dob: cidadaoDob.value || null,
            sexo: cidadaoSexo.value || null,
            type: cidadaoType.value || 'Outro',
            leader: (document.getElementById('cidadao-leader') || cidadaoLeaderSelect)?.value || null,
            cpf: cpf,
            rg: v(cidadaoRG.value),
            voterid: voterid,
            zona: cidadaoZona ? v(cidadaoZona.value) : null,
            secao: cidadaoSecao ? v(cidadaoSecao.value) : null,
            phone: v(cidadaoPhone.value),
            whatsapp: cidadaoWhatsapp.checked,
            profissao: v(cidadaoProfissao.value),
            cep: v(cidadaoCEP.value),
            logradouro: v(cidadaoLogradouro.value),
            numero: v(cidadaoNumero.value),
            complemento: v(cidadaoComplemento.value),
            bairro: v(cidadaoBairro.value),
            cidade: v(cidadaoCidade.value),
            estado: v(cidadaoEstado.value),
            sons: parseInt(cidadaoSons.value, 10) || 0,
            daughters: parseInt(cidadaoDaughters.value, 10) || 0,
            children: getChildrenData(),
            localtrabalho: v(cidadaoLocalTrabalho.value),
            photourl: photoUrl || null,
            latitude: lat,
            longitude: long, 
            updated_at: new Date().toISOString(), 
            user_id: user.id 
        };
        if (currentEditingId) {
            const { error } = await sb
                .from('cidadaos')
                .update(cidadaoData)
                .eq('id', currentEditingId);
            if (error) throw error;
            showToast("Atualizado com sucesso!", "success");
        } else {
            delete cidadaoData.updated_at; 
            const { error } = await sb
                .from('cidadaos')
                .insert(cidadaoData);
            if (error) throw error;
            showToast("Adicionado com sucesso!", "success");
        }
        closeCidadaoModal();
        // Recarrega página e lista de bairros em paralelo (pode ter bairro novo)
        await Promise.all([
            renderCidadaos(),
            loadBairrosDistintos().then(() => updateBairroFilter())
        ]);
        // Atualiza os selects de lideranças se o tipo mudou
        if (cidadaoType.value === 'Liderança') {
            const { data } = await sb.from('cidadaos').select('id, name, type').eq('type', 'Liderança').order('name');
            if (data) { allLeaders = data; updateLeaderSelects(); }
        }
    } catch (error) {
        console.error(error);
        let msg = "Erro ao salvar.";
        if (error.message.includes('duplicate key value violates unique constraint "cidadaos_cpf_key"')) {
            msg = "Este CPF já está cadastrado.";
        } else if (error.message.includes('duplicate key value violates unique constraint "cidadaos_voterid_key"')) {
            msg = "Este Título já está cadastrado.";
        }
        showToast(msg, "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Salvar';
    }
}
    async function handleDemandaFormSubmit(e) {
        e.preventDefault();
        if (!user) {
            showToast("Sessão expirada.", "error");
            return;
        }
        const saveBtn = document.getElementById('save-demanda-btn');
        saveBtn.disabled = true;
        try {
            const demandaData = {
                cidadao_id: document.getElementById('demanda-cidadao-select').value,
                title: document.getElementById('demanda-title').value,
                description: document.getElementById('demanda-description').value,
                status: 'pending',
                user_id: user.id
            };
            const { error } = await sb.from('demandas').insert(demandaData);
            if (error) throw error;
            showToast("Demanda adicionada!", "success");
            closeDemandaModal();
            // Recarrega demandas com JOIN para manter nome do solicitante
            await loadDemandasPage(true);
            await updateDashboard();
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar.", "error");
        } finally {
            saveBtn.disabled = false;
        }
    }
    async function openDemandaDetailsModal(demandaId) {
        viewingDemandaId = demandaId;
        let demanda = allDemandas.find(d => d.id === demandaId);
        if (!demanda) {
            // Não está no cache da página actual — busca do servidor
            const { data } = await sb.from('demandas')
                .select('*, cidadao:cidadaos(id, name, leader)')
                .eq('id', demandaId).single();
            demanda = data;
        }
        if (!demanda) return;
        const nomeSolicitante = demanda.cidadao ? demanda.cidadao.name : (allCidadaos.find(c => c.id === demanda.cidadao_id)?.name || 'Desconhecido');
        document.getElementById('details-demanda-title').textContent = demanda.title;
        document.getElementById('details-demanda-cidadao').textContent = `Solicitante: ${nomeSolicitante}`;
        document.getElementById('details-demanda-description').textContent = demanda.description || 'Sem descrição.';
        const statusSelect = document.getElementById('details-demanda-status');
        statusSelect.value = demanda.status;
        statusSelect.onchange = null; 
        statusSelect.onchange = (e) => updateDemandaStatus(demandaId, e.target.value);
        document.getElementById('delete-demanda-btn').onclick = () => requestDelete(demandaId, 'demanda');
        await loadDemandaNotes(demandaId); 
        demandaDetailsModal.classList.remove('hidden');
    }
    async function updateDemandaStatus(demandaId, newStatus) {
        if (!user) return;
        try {
            const { error } = await sb
                .from('demandas')
                .update({ 
                    status: newStatus, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', demandaId);
            if (error) throw error;
            const { error: noteError } = await sb
                .from('notes')
                .insert({
                    text: `Status alterado para: ${getStatusInfo(newStatus).text}`,
                    author: "Sistema",
                    demanda_id: demandaId,
                    user_id: user.id
                });
            if (noteError) throw noteError;
            showToast("Status atualizado!", "success");
            // PERFORMANCE: atualiza apenas o objeto local da demanda
            // Actualiza o card localmente sem re-fetch (performance)
            const idx = allDemandas.findIndex(d => d.id === demandaId);
            if (idx !== -1) {
                allDemandas[idx].status = newStatus;
                allDemandas[idx].updated_at = new Date().toISOString();
                // Actualiza o badge de status no card já renderizado
                const cards = allDemandasList?.querySelectorAll('.bg-white');
                const card = [...(cards||[])].find(el => el._demandaId === demandaId);
                if (card) {
                    const badge = card.querySelector('span[class*="status"]');
                    if (badge) { const si = getStatusInfo(newStatus); badge.className = si.classes; badge.textContent = si.text; }
                } else {
                    // Card não visível na página actual — ignorar
                }
            }
            await updateDashboard();
            await loadDemandaNotes(demandaId);
        } catch (error) {
            console.error(error);
            showToast("Erro ao atualizar status.", "error");
        }
    }
    async function loadDemandaNotes(demandaId) {
        if (!user) return;
        const notesListEl = document.getElementById('demanda-notes-list');
        notesListEl.innerHTML = '<p class="text-sm text-gray-500">A carregar...</p>';
        try {
            const { data: notes, error } = await sb
                .from('notes')
                .select('*')
                .eq('demanda_id', demandaId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            if (!notes || notes.length === 0) {
                notesListEl.innerHTML = '<p class="text-sm text-gray-500">Nenhum registo.</p>';
                return;
            }
            notesListEl.innerHTML = '';
            notes.forEach(note => {
                const noteEl = document.createElement('div');
                noteEl.className = 'p-3 bg-gray-100 rounded-lg';
                noteEl.innerHTML = `<p class="text-sm text-gray-800">${note.text}</p><p class="text-xs text-gray-500 text-right">${note.author || 'Utilizador'} - ${new Date(note.created_at).toLocaleString('pt-BR')}</p>`;
                notesListEl.appendChild(noteEl);
            });
            notesListEl.scrollTop = notesListEl.scrollHeight;
        } catch (error) {
            console.error(error);
            notesListEl.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar.</p>';
        }
    }
    async function handleAddNoteSubmit(e) {
        e.preventDefault();
        if (!user || !viewingDemandaId) return;
        const newNoteText = document.getElementById('new-note-text');
        const text = newNoteText.value.trim();
        if (!text) return;
        try {
            const { error } = await sb
                .from('notes')
                .insert({
                    text: text,
                    author: user.email || "Utilizador",
                    demanda_id: viewingDemandaId,
                    user_id: user.id
                });
            if (error) throw error;
            newNoteText.value = ''; 
            await loadDemandaNotes(viewingDemandaId); 
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar.", "error");
        }
    }
    async function handleDeleteConfirmation() {
        const { id, type } = itemToDelete;
        if (!id || !type || !user) return;
        const btn = document.getElementById('confirm-delete-btn');
        btn.disabled = true;
        try {
            if (type === 'cidadao') {
                const { error } = await sb
                    .from('cidadaos')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                showToast("Cidadão excluído.", "success");
            } else if (type === 'demanda') {
                 const { error } = await sb
                    .from('demandas')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                closeDemandaDetailsModal(); 
                showToast("Demanda excluída.", "success");
            }
            // PERFORMANCE: remove do cache local e re-renderiza sem ir ao servidor
            if (type === 'cidadao') {
                allCidadaos = allCidadaos.filter(c => c.id !== id);
                await renderCidadaos();
            } else {
                await loadDemandasPage(true);
            }
            await updateDashboard();
        } catch (error) {
            console.error(error);
            showToast(`Erro ao excluir.`, "error");
        } finally {
            btn.disabled = false;
            closeConfirmationModal();
        }
    }
    function getFilteredCidadaos() {
        const searchTerm = searchInput.value.toLowerCase();
        const type = filterType.value;
        const bairro = filterBairro.value;
        const leader = filterLeader.value;
        const sexo = filterSexo.value;
        const faixaEtaria = filterFaixaEtaria.value;
        const filtered = allCidadaos.filter(cidadao => {
            const nameMatch = searchInput.value && cidadao.name.toLowerCase().includes(searchTerm);
            const emailMatch = (cidadao.email || '').toLowerCase().includes(searchTerm);
            const cpfMatch = (cidadao.cpf || '').includes(searchTerm);
            const typeMatch = !type || cidadao.type === type;
            const bairroMatch = !bairro || cidadao.bairro === bairro;
            const leaderMatch = !leader || cidadao.leader === leader;
            const sexoMatch = !sexo || (cidadao.sexo || 'Não Informar') === sexo;
            const ageMatch = !faixaEtaria || getFaixaEtaria(cidadao.dob) === faixaEtaria;
            const generalMatch = !searchTerm || nameMatch || emailMatch || cpfMatch;
            return generalMatch && typeMatch && bairroMatch && leaderMatch && sexoMatch && ageMatch;
        });
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        return filtered;
    }
    // ── PERFORMANCE: card construído como elemento DOM (sem innerHTML com dados de usuário) ─
    function buildCidadaoCard(cidadao) {
        const card = document.createElement('div');
        card.className = 'bg-white p-5 rounded-lg shadow-md flex flex-col transition-shadow hover:shadow-lg';
        const initials = getInitials(cidadao.name);
        const photoUrl = cidadao.photourl;
        card.innerHTML = `
            <div class="flex items-center gap-4 mb-4">
                ${photoUrl
                    ? `<img src="${photoUrl}" alt="" class="w-16 h-16 rounded-full object-cover bg-gray-200" onerror="this.src='https://placehold.co/100x100/E2E8F0/64748B?text=${encodeURIComponent(initials)}'">`
                    : `<div class="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold">${initials}</div>`}
                <div class="flex-1 min-w-0"><h3 class="text-lg font-bold text-gray-800 truncate"></h3><p class="text-sm text-gray-600 card-type"></p></div>
            </div>
            <div class="space-y-2 text-sm text-gray-700 mb-4 flex-1">
                <p class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0 1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span class="truncate email-cell"></span></p>
                <p class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span class="phone-cell"></span></p>
                <p class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span class="bairro-cell"></span></p>
            </div>
            <div class="border-t pt-4 flex gap-2">
                <button class="btn-view-details flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium">Ver Detalhes</button>
                <button class="btn-edit flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium">Editar</button>
                <button class="btn-add-demanda bg-purple-500 hover:bg-purple-600 text-white py-2 px-3 rounded-lg text-sm font-medium">Demanda</button>
                <button class="btn-delete bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-medium"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
            </div>`;
        // textContent para prevenir XSS
        card.querySelector('h3').textContent = cidadao.name;
        card.querySelector('.card-type').textContent = cidadao.type;
        card.querySelector('.email-cell').textContent = cidadao.email || 'N/A';
        card.querySelector('.phone-cell').textContent = cidadao.phone || 'Não informado';
        card.querySelector('.bairro-cell').textContent = cidadao.bairro || 'Não informado';
        card.querySelector('.btn-view-details').addEventListener('click', () => openDetailsModal(cidadao.id));
        card.querySelector('.btn-edit').addEventListener('click', () => openCidadaoModal(cidadao.id));
        card.querySelector('.btn-add-demanda').addEventListener('click', () => openDemandaModal(cidadao.id));
        const deleteBtn = card.querySelector('.btn-delete');
        if (userRole === 'cadastrador') {
            deleteBtn.classList.add('hidden'); // cadastrador não pode excluir
        } else {
            deleteBtn.addEventListener('click', () => requestDelete(cidadao.id, 'cidadao'));
        }
        return card;
    }

    // renderCidadaos dispara busca no servidor com os filtros atuais
    function renderCidadaos() {
        serverSearchState = {
            search:      searchInput.value.toLowerCase().trim(),
            type:        filterType.value,
            bairro:      filterBairro.value,
            cidade:      filterCidade ? filterCidade.value : '',
            leader:      filterLeader.value,
            sexo:        filterSexo.value,
            faixaEtaria: filterFaixaEtaria.value,
            localTrabalho: filterLocalTrabalho.value.trim()
        };
        loadCidadaosPage(true);
    }

    // "Carregar mais" — próxima página server-side
    function renderMoreCidadaos() {
        loadCidadaosPage(false);
    }
    // Constrói um card de demanda e retorna o elemento
    function buildDemandaCard(demanda) {
        const nomeSolicitante = demanda.cidadao ? demanda.cidadao.name : 'Desconhecido';
        const statusInfo = getStatusInfo(demanda.status);
        const item = document.createElement('div');
        item.className = 'bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow';
        const titleEl = document.createElement('h3');
        titleEl.className = 'text-lg font-semibold text-gray-800';
        titleEl.textContent = demanda.title;
        const solicitanteEl = document.createElement('p');
        solicitanteEl.className = 'text-sm text-gray-600';
        solicitanteEl.innerHTML = 'Solicitante: <span class="font-medium text-blue-600"></span>';
        solicitanteEl.querySelector('span').textContent = nomeSolicitante;
        const dataEl = document.createElement('p');
        dataEl.className = 'text-sm text-gray-500';
        dataEl.textContent = `Data: ${demanda.created_at ? new Date(demanda.created_at).toLocaleDateString('pt-BR') : 'N/A'}`;
        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-1';
        infoDiv.appendChild(titleEl);
        infoDiv.appendChild(solicitanteEl);
        infoDiv.appendChild(dataEl);
        const statusSpan = document.createElement('span');
        statusSpan.className = statusInfo.classes;
        statusSpan.textContent = statusInfo.text;
        item.appendChild(infoDiv);
        item.appendChild(statusSpan);
        item.addEventListener('click', () => openDemandaDetailsModal(demanda.id));
        return item;
    }

    async function loadDemandasPage(reset = true) {
        if (!allDemandasList) return;

        if (reset) {
            demandasServerOffset = 0;
            allDemandas = [];
            allDemandasList.innerHTML = '<p class="text-gray-400 text-center py-6">A carregar...</p>';
        }

        demandasSearchState = {
            status: demandaFilterStatus?.value || '',
            leader: demandaFilterLeader?.value || '',
            nome:   demandaSearchNome?.value.trim() || ''
        };

        try {
            // ── PASSO 1: pré-filtro por liderança e/ou nome do solicitante ──
            // O Supabase NÃO suporta .eq() em colunas de relações (JOINs).
            // Filtrar por leader diretamente causaria cidadao: null nos resultados.
            // Solução: buscar os cidadao_ids que correspondem ao critério, depois .in()
            let cidadaoIdsFilter = null;

            if (demandasSearchState.leader || demandasSearchState.nome) {
                let qCid = sb.from('cidadaos').select('id');
                if (demandasSearchState.leader)
                    qCid = qCid.eq('leader', demandasSearchState.leader);
                if (demandasSearchState.nome)
                    qCid = qCid.ilike('name', `%${demandasSearchState.nome}%`);

                const { data: cids, error: eCid } = await qCid;
                if (eCid) throw eCid;

                cidadaoIdsFilter = (cids || []).map(c => c.id);

                // Zero correspondências — resultado imediato sem query adicional
                if (cidadaoIdsFilter.length === 0) {
                    allDemandas = [];
                    if (reset) allDemandasList.innerHTML = '';
                    allDemandasList.innerHTML = '<p class="text-gray-500 text-center py-8">Nenhuma demanda encontrada para este filtro.</p>';
                    const label = document.getElementById('demandas-count-label');
                    if (label) label.textContent = '0 demanda(s) encontrada(s)';
                    document.getElementById('demandas-load-more-wrap')?.classList.add('hidden');
                    return;
                }
            }

            // ── PASSO 2: query principal com JOIN limpo ──────────────────────
            // O select do cidadao usa apenas id e name — sem filtros na relação,
            // garantindo que o JOIN sempre retorna os dados correctamente.
            let query = sb.from('demandas')
                .select('id, title, description, status, created_at, updated_at, cidadao_id, cidadao:cidadaos(id, name)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(demandasServerOffset, demandasServerOffset + DEMANDAS_PAGE_SIZE - 1);

            if (demandasSearchState.status)   query = query.eq('status', demandasSearchState.status);
            if (cidadaoIdsFilter !== null)     query = query.in('cidadao_id', cidadaoIdsFilter);

            const { data, error, count } = await query;
            if (error) throw error;

            // Guardar count total para o dashboard e gráfico
            if (reset || totalDemandasCount === 0) totalDemandasCount = count || 0;

            // Acrescentar ao cache local (só a página corrente)
            allDemandas = reset ? (data || []) : [...allDemandas, ...(data || [])];
            demandasServerOffset += (data || []).length;

            // Renderizar
            if (reset) allDemandasList.innerHTML = '';

            if (allDemandas.length === 0) {
                allDemandasList.innerHTML = '<p class="text-gray-500 text-center py-8">Nenhuma demanda encontrada.</p>';
            } else {
                const fragment = document.createDocumentFragment();
                (data || []).forEach(d => fragment.appendChild(buildDemandaCard(d)));
                allDemandasList.appendChild(fragment);
            }

            // Contador
            const label = document.getElementById('demandas-count-label');
            if (label) {
                const temFiltro = demandasSearchState.status || demandasSearchState.leader || demandasSearchState.nome;
                label.textContent = temFiltro
                    ? `${allDemandas.length} demanda(s) encontrada(s)`
                    : `Exibindo ${allDemandas.length} de ${totalDemandasCount} demanda(s)`;
            }

            // Botão "Carregar Mais"
            const wrap = document.getElementById('demandas-load-more-wrap');
            if (wrap) wrap.classList.toggle('hidden', demandasServerOffset >= totalDemandasCount);

        } catch(e) {
            console.error(e);
            showToast('Erro ao carregar demandas: ' + e.message, 'error');
        }
    }

    // Mantida para compatibilidade com updateDemandaStatus (actualiza card localmente)
    function renderAllDemandas() { loadDemandasPage(true); }
    function updateLeaderSelects() {
        // Filtro, demanda e cobertura — selects normais, ordenados alfabeticamente
        setupCoberturaLiderAutocomplete();
        const selects = [filterLeader, demandaFilterLeader];
        selects.forEach(select => {
            if (!select) return;
            const currentValue = select.value;
            select.innerHTML = '<option value="">Filtrar por Liderança</option>';
            [...allLeaders].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).forEach(l => {
                const option = document.createElement('option');
                option.value = l.id;
                option.textContent = l.name;
                select.appendChild(option);
            });
            select.value = currentValue;
        });
        // Autocomplete de liderança no modal de cadastro
        setupLeaderAutocomplete();
    }

    function setupLeaderAutocomplete() {
        const searchInput = document.getElementById('cidadao-leader-search');
        const dropdown = document.getElementById('cidadao-leader-dropdown');
        const hiddenInput = document.getElementById('cidadao-leader');
        if (!searchInput || !dropdown || !hiddenInput) return;
        if (searchInput._autocompleteReady) return;
        searchInput._autocompleteReady = true;

        const sorted = [...allLeaders].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        function showDropdown(term) {
            const filtered = term
                ? sorted.filter(l => l.name.toLowerCase().includes(term.toLowerCase()))
                : sorted;
            dropdown.innerHTML = '';
            const none = document.createElement('div');
            none.className = 'px-3 py-2 cursor-pointer hover:bg-gray-100 text-gray-500 text-sm';
            none.textContent = 'Nenhuma';
            none.addEventListener('mousedown', () => {
                hiddenInput.value = '';
                searchInput.value = '';
                dropdown.classList.add('hidden');
            });
            dropdown.appendChild(none);
            filtered.forEach(l => {
                const item = document.createElement('div');
                item.className = 'px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm';
                item.textContent = l.name;
                item.addEventListener('mousedown', () => {
                    hiddenInput.value = l.id;
                    searchInput.value = l.name;
                    dropdown.classList.add('hidden');
                });
                dropdown.appendChild(item);
            });
            dropdown.classList.toggle('hidden', filtered.length === 0 && !term);
        }

        searchInput.addEventListener('input', () => showDropdown(searchInput.value));
        searchInput.addEventListener('focus', () => showDropdown(searchInput.value));
        searchInput.addEventListener('blur', () => {
            setTimeout(() => dropdown.classList.add('hidden'), 150);
            const match = sorted.find(l => l.name.toLowerCase() === searchInput.value.toLowerCase());
            if (!match) { hiddenInput.value = ''; searchInput.value = ''; }
        });
    }
    function setupCoberturaLiderAutocomplete() {
        const searchInput = document.getElementById('cobertura-lider-search');
        const dropdown    = document.getElementById('cobertura-lider-dropdown');
        const hiddenInput = document.getElementById('cobertura-filter-lider');
        if (!searchInput || !dropdown || !hiddenInput) return;
        if (searchInput._autocompleteReady) return;
        searchInput._autocompleteReady = true;

        const sorted = [...allLeaders].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        function showDropdown(term) {
            const filtered = term
                ? sorted.filter(l => l.name.toLowerCase().includes(term.toLowerCase()))
                : sorted;
            dropdown.innerHTML = '';
            // Opção "Todas"
            const all = document.createElement('div');
            all.className = 'px-3 py-2 cursor-pointer hover:bg-gray-100 text-gray-500 text-sm italic';
            all.textContent = 'Todas as Lideranças';
            all.addEventListener('mousedown', () => {
                hiddenInput.value = '';
                searchInput.value = '';
                dropdown.classList.add('hidden');
            });
            dropdown.appendChild(all);
            filtered.forEach(l => {
                const item = document.createElement('div');
                item.className = 'px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm';
                item.textContent = l.name;
                item.addEventListener('mousedown', () => {
                    hiddenInput.value = l.id;
                    searchInput.value = l.name;
                    dropdown.classList.add('hidden');
                });
                dropdown.appendChild(item);
            });
            dropdown.classList.toggle('hidden', filtered.length === 0 && !term);
        }

        searchInput.addEventListener('input', () => showDropdown(searchInput.value));
        searchInput.addEventListener('focus', () => showDropdown(searchInput.value));
        searchInput.addEventListener('blur', () => {
            setTimeout(() => dropdown.classList.add('hidden'), 150);
            // Se o texto não bate com nenhuma liderança, limpa
            const match = sorted.find(l => l.name.toLowerCase() === searchInput.value.toLowerCase());
            if (!match) { hiddenInput.value = ''; searchInput.value = ''; }
        });
    }

    function updateBairroFilter() {
        if (!filterBairro) return;
        const currentValue = filterBairro.value;
        // PERFORMANCE: usa lista de bairros carregada uma única vez no servidor
        const bairros = window._bairrosDisponiveis || [];
        filterBairro.innerHTML = '<option value="">Filtrar por Bairro</option>';
        bairros.forEach(bairro => {
            const option = document.createElement('option');
            option.value = bairro;
            option.textContent = bairro;
            filterBairro.appendChild(option);
        });
        filterBairro.value = currentValue;
    }
    function clearCidadaoFilters() {
        searchInput.value = '';
        filterType.value = '';
        filterBairro.value = '';
        if (filterCidade) filterCidade.value = '';
        filterLeader.value = '';
        filterSexo.value = '';
        filterFaixaEtaria.value = '';
        filterLocalTrabalho.value = '';
        renderCidadaos();
    }
    function clearDemandaFilters() {
        demandaFilterStatus.value = '';
        demandaFilterLeader.value = '';
        if (demandaSearchNome) demandaSearchNome.value = '';
        loadDemandasPage(true);
    }
    async function updateDashboard() {
        const totalEl = document.getElementById('dashboard-total-cidadaos');
        // Admin vê totais globais; cadastrador vê só os seus (RLS já filtra automaticamente)
        if (userRole === 'admin' && totalCidadaosCount > 0) {
            totalEl.textContent = totalCidadaosCount;
        } else {
            const { count } = await sb.from('cidadaos').select('*', { count: 'exact', head: true });
            totalCidadaosCount = count || 0;
            totalEl.textContent = totalCidadaosCount;
        }
        // Contador de demandas — busca do servidor para reflectir total real
        try {
            const { count: cntDemandas } = await sb
                .from('demandas').select('*', { count: 'exact', head: true });
            totalDemandasCount = cntDemandas || 0;
        } catch(e) { /* mantém o valor anterior */ }
        document.getElementById('dashboard-total-demandas').textContent = totalDemandasCount;
        // Gráficos e widgets em paralelo — não dependem uns dos outros
        updateDemandasRecentes();
        updateCidadaosPorTipoChart();
        updateDemandasPorStatusChart(); // async — não bloqueia
        await Promise.all([
            updateAniversariantes(),
            updateCidadaosPorBairroChart(),
            updateCidadaosPorMunicipioChart(),
            updateCidadaosPorMunicipioChart(),
            updateCidadaosPorSexoChart(),
            updateCidadaosPorFaixaEtariaChart()
        ]);
    }
    // ── Cache para o modal (evita re-fetch ao paginar) ─────────────────
    let _aniversariantesTodos = [];
    let _anivModalPagina      = 1;
    const ANIV_MODAL_POR_PAG  = 12;

    async function updateAniversariantes() {
        const listEl     = document.getElementById('aniversariantes-list');
        const totalEl    = document.getElementById('aniversariantes-total');
        const verMais    = document.getElementById('aniversariantes-ver-mais');
        const verMaisBtn = document.getElementById('aniversariantes-ver-mais-btn');
        if (!listEl) return;
        listEl.innerHTML = '<p class="text-sm text-gray-400">A carregar...</p>';

        try {
            const now     = new Date();
            const mes     = now.getMonth() + 1;
            const diaHoje = now.getDate();

            // dob é tipo DATE no Postgres — ilike não funciona em DATE.
            // Busca 3 campos leves, filtra mês no cliente. Limit 2000 = cap de segurança.
            const { data, error } = await sb
                .from('cidadaos')
                .select('id, name, dob')
                .not('dob', 'is', null)
                .order('dob', { ascending: true })
                .limit(2000);
            if (error) throw error;

            // Lista completa do mês ordenada por dia 01→31 (usada no modal)
            const doMes = (data || [])
                .filter(c => parseInt(c.dob.split('-')[1], 10) === mes)
                .sort((a, b) => parseInt(a.dob.split('-')[2], 10) - parseInt(b.dob.split('-')[2], 10));

            _aniversariantesTodos = doMes; // cache para o modal

            // Widget: apenas de HOJE até o fim do mês, limitado a 10
            const LIMITE_WIDGET = 10;
            const daqui = doMes.filter(c => parseInt(c.dob.split('-')[2], 10) >= diaHoje);
            const visiveis = daqui.slice(0, LIMITE_WIDGET);

            listEl.innerHTML = '';

            if (doMes.length === 0) {
                listEl.innerHTML = '<p class="text-sm text-gray-500">Nenhum aniversariante este mês.</p>';
                if (totalEl) totalEl.textContent = '';
                if (verMais) verMais.classList.add('hidden');
                return;
            }

            if (totalEl) totalEl.textContent = `${doMes.length} este mês`;

            if (daqui.length === 0) {
                listEl.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhum aniversariante pelos próximos dias.</p>';
            } else {
                visiveis.forEach(c => {
                    const dia   = parseInt(c.dob.split('-')[2], 10);
                    const eHoje = dia === diaHoje;
                    const item  = document.createElement('div');
                    item.className = 'flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer'
                        + (eHoje ? ' bg-yellow-50 border border-yellow-200' : '');
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'font-medium text-gray-700 text-sm truncate mr-2';
                    nameSpan.textContent = c.name + (eHoje ? ' 🎂' : '');
                    const diaSpan = document.createElement('span');
                    diaSpan.className = 'font-bold flex-shrink-0 text-sm '
                        + (eHoje ? 'text-yellow-600' : 'text-blue-600');
                    diaSpan.textContent = `dia ${String(dia).padStart(2, '0')}`;
                    item.appendChild(nameSpan);
                    item.appendChild(diaSpan);
                    item.addEventListener('click', () => openDetailsModal(c.id));
                    listEl.appendChild(item);
                });
            }

            // Botão — sempre visível, abre o modal com todos do mês paginados
            if (verMais) verMais.classList.remove('hidden');
            if (verMaisBtn) {
                const novo = verMaisBtn.cloneNode(true);
                verMaisBtn.replaceWith(novo);
                document.getElementById('aniversariantes-ver-mais-btn').textContent =
                    `Ver todos os ${doMes.length} aniversariantes do mês →`;
                document.getElementById('aniversariantes-ver-mais-btn')
                    .addEventListener('click', () => openAniversariantesModal());
            }

        } catch(e) {
            console.error(e);
            listEl.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar.</p>';
        }
    }

    function openAniversariantesModal() {
        _anivModalPagina = 1;
        renderAniversariantesModal();
        document.getElementById('aniversariantes-modal').classList.remove('hidden');
    }

    function closeAniversariantesModal() {
        document.getElementById('aniversariantes-modal').classList.add('hidden');
    }

    function renderAniversariantesModal() {
        const lista   = _aniversariantesTodos;
        const total   = lista.length;
        const totPag  = Math.ceil(total / ANIV_MODAL_POR_PAG) || 1;
        const inicio  = (_anivModalPagina - 1) * ANIV_MODAL_POR_PAG;
        const fim     = Math.min(inicio + ANIV_MODAL_POR_PAG, total);
        const pagina  = lista.slice(inicio, fim);
        const diaHoje = new Date().getDate();
        const mesNome = new Date().toLocaleDateString('pt-BR', { month: 'long' });

        const subtitle = document.getElementById('aniv-modal-subtitle');
        if (subtitle) subtitle.textContent =
            `${total} aniversariante(s) em ${mesNome} — página ${_anivModalPagina} de ${totPag}`;

        const listEl = document.getElementById('aniv-modal-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        pagina.forEach(c => {
            const dia   = parseInt(c.dob.split('-')[2], 10);
            const eHoje = dia === diaHoje;
            const row   = document.createElement('div');
            row.className = 'flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors '
                + (eHoje ? 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'
                         : 'hover:bg-gray-50 border border-transparent');
            const left = document.createElement('div');
            left.className = 'flex items-center gap-3';
            const av = document.createElement('div');
            av.className = 'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 '
                + (eHoje ? 'bg-yellow-500' : 'bg-blue-500');
            av.textContent = c.name.charAt(0).toUpperCase();
            const name = document.createElement('span');
            name.className = 'font-medium text-gray-800 text-sm';
            name.textContent = c.name + (eHoje ? ' 🎂' : '');
            left.appendChild(av);
            left.appendChild(name);
            const diaTag = document.createElement('span');
            diaTag.className = 'text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 '
                + (eHoje ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-50 text-blue-700');
            diaTag.textContent = `dia ${String(dia).padStart(2, '0')}`;
            row.appendChild(left);
            row.appendChild(diaTag);
            row.addEventListener('click', () => {
                closeAniversariantesModal();
                openDetailsModal(c.id);
            });
            listEl.appendChild(row);
        });

        // Controles de paginação
        const pagesEl = document.getElementById('aniv-modal-pages');
        if (pagesEl) pagesEl.textContent = `${_anivModalPagina} / ${totPag}`;
        const prevBtn = document.getElementById('aniv-modal-prev');
        const nextBtn = document.getElementById('aniv-modal-next');
        if (prevBtn) prevBtn.disabled = _anivModalPagina <= 1;
        if (nextBtn) nextBtn.disabled = _anivModalPagina >= totPag;
    }

    function updateDemandasRecentes() {
        const listEl = document.getElementById('demandas-recentes-list');
        if (!listEl) return;
        const recentes = allDemandas.slice(0, 5);
        listEl.innerHTML = '';
        if (recentes.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-gray-500">Nenhuma demanda recente.</p>';
            return;
        }
        recentes.forEach(d => {
            const nomeSolicitante = d.cidadao ? d.cidadao.name : (allCidadaos.find(c => c.id === d.cidadao_id)?.name || 'Desconhecido');
            const statusInfo = getStatusInfo(d.status);
            const item = document.createElement('div');
            item.className = 'p-2 rounded-lg hover:bg-gray-50 border-b last:border-b-0 cursor-pointer';
            const topDiv = document.createElement('div');
            topDiv.className = 'flex justify-between items-center mb-1';
            const titleSpan = document.createElement('span');
            titleSpan.className = 'font-semibold text-gray-800';
            titleSpan.textContent = d.title;
            const statusSpan = document.createElement('span');
            statusSpan.className = statusInfo.classes + ' !py-0.5 !px-2';
            statusSpan.textContent = statusInfo.text;
            topDiv.appendChild(titleSpan);
            topDiv.appendChild(statusSpan);
            const infoP = document.createElement('p');
            infoP.className = 'text-sm text-gray-600';
            infoP.textContent = `${nomeSolicitante} - ${d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : 'N/A'}`;
            item.appendChild(topDiv);
            item.appendChild(infoP);
            item.addEventListener('click', () => { openDemandaDetailsModal(d.id); });
            listEl.appendChild(item);
        });
    }
    async function updateCidadaosPorTipoChart() {
        const ctx = document.getElementById('cidadaos-por-tipo-chart');
        if (!ctx) return;
        try {
            // Busca todos os tipos existentes no banco — sem hardcode, pega qualquer tipo cadastrado
            const { data, error } = await sb
                .from('cidadaos')
                .select('type')
                .not('type', 'is', null);
            if (error) throw error;

            // Agrupa por tipo no cliente
            const contagem = (data || []).reduce((acc, c) => {
                acc[c.type] = (acc[c.type] || 0) + 1;
                return acc;
            }, {});

            const labels = Object.keys(contagem);
            const values = Object.values(contagem);
            const cores = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6B7280'];

            if (cidadaosChart) cidadaosChart.destroy();
            cidadaosChart = new Chart(ctx, {
                type: 'pie',
                data: { labels, datasets: [{ label: 'Cidadãos por Tipo', data: values, backgroundColor: cores.slice(0, labels.length) }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        } catch(e) { console.warn('Chart tipo:', e); }
    }
    async function updateDemandasPorStatusChart() {
        const ctx = document.getElementById('demandas-por-status-chart');
        if (!ctx) return;
        try {
            // Busca contagem por status directamente do servidor — reflecte TODAS as demandas
            const { data, error } = await sb
                .from('demandas')
                .select('status');
            if (error) throw error;
            const contagem = (data || []).reduce((acc, d) => {
                acc[d.status] = (acc[d.status] || 0) + 1;
                return acc;
            }, {});
            const labels = Object.keys(contagem).map(s => getStatusInfo(s).text);
            const values = Object.values(contagem);
            const colors = Object.keys(contagem).map(s => getStatusInfo(s).color);
            if (demandasChart) demandasChart.destroy();
            demandasChart = new Chart(ctx, {
                type: 'doughnut',
                data: { labels, datasets: [{ label: 'Demandas por Status', data: values, backgroundColor: colors }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        } catch(e) { console.error('Erro gráfico demandas:', e); }
    }
    async function updateCidadaosPorMunicipioChart() {
        const ctx = document.getElementById('cidadaos-por-municipio-chart');
        if (!ctx) return;
        try {
            const { data, error } = await sb.from('cidadaos').select('cidade');
            if (error) throw error;
            const contagem = (data || []).reduce((acc, c) => {
                const cidade = c.cidade || 'Não Informado';
                acc[cidade] = (acc[cidade] || 0) + 1;
                return acc;
            }, {});
            const sorted = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
            const labels = sorted.map(([k]) => k);
            const values = sorted.map(([, v]) => v);
            const colors = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16','#F97316'];
            if (cidadaosMunicipioChart) cidadaosMunicipioChart.destroy();
            cidadaosMunicipioChart = new Chart(ctx, {
                type: 'doughnut',
                data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length) }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: (c) => {
                                    const total = c.dataset.data.reduce((a, b) => a + b, 0);
                                    return ` ${c.label}: ${c.parsed} (${((c.parsed/total)*100).toFixed(1)}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch(e) { console.warn('Chart município:', e); }
    }

    async function updateCidadaosPorMunicipioChart() {
        const ctx = document.getElementById('cidadaos-por-municipio-chart');
        if (!ctx) return;
        try {
            const { data, error } = await sb.from('cidadaos').select('cidade');
            if (error) throw error;
            const contagem = (data || []).reduce((acc, c) => {
                const cidade = c.cidade || 'Não Informado';
                acc[cidade] = (acc[cidade] || 0) + 1;
                return acc;
            }, {});
            const sorted = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
            const labels = sorted.map(([k]) => k);
            const values = sorted.map(([, v]) => v);
            const colors = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16','#F97316'];
            if (cidadaosMunicipioChart) cidadaosMunicipioChart.destroy();
            cidadaosMunicipioChart = new Chart(ctx, {
                type: 'doughnut',
                data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length) }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: { callbacks: { label: (c) => {
                            const total = c.dataset.data.reduce((a, b) => a + b, 0);
                            return ` ${c.label}: ${c.parsed} (${((c.parsed/total)*100).toFixed(1)}%)`;
                        }}}
                    }
                }
            });
        } catch(e) { console.warn('Chart município:', e); }
    }

    async function updateCidadaosPorBairroChart() {
        const ctx = document.getElementById('cidadaos-por-bairro-chart');
        if (!ctx) return;
        // PERFORMANCE: usa dados do servidor para gráfico preciso com 25k registros
        try {
            const { data, error } = await sb.rpc('count_by_bairro');
            // Se a RPC não existir, usa bairros já disponíveis
            if (error || !data) {
                // Fallback: agrupa os bairros disponíveis (pode não ser 100% preciso sem RPC)
                const bairros = window._bairrosDisponiveis || [];
                if (cidadaosBairroChart) cidadaosBairroChart.destroy();
                cidadaosBairroChart = new Chart(ctx, {
                    type: 'bar',
                    data: { labels: bairros.slice(0, 10), datasets: [{ label: 'Bairros', data: new Array(Math.min(bairros.length,10)).fill(0), backgroundColor: '#10B981' }] },
                    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } }
                });
                return;
            }
            const labels = data.map(r => r.bairro || 'N/A');
            const values = data.map(r => r.total);
            if (cidadaosBairroChart) cidadaosBairroChart.destroy();
            cidadaosBairroChart = new Chart(ctx, {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Cidadãos por Bairro (Top 10)', data: values, backgroundColor: '#10B981' }] },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
            });
        } catch(e) { console.warn('Chart bairro:', e); }
    }
    async function updateCidadaosPorSexoChart() {
        const ctx = document.getElementById('cidadaos-por-sexo-chart');
        if (!ctx) return;
        try {
            const { data, error } = await sb.from('cidadaos').select('sexo');
            if (error) throw error;
            const contagem = (data || []).reduce((acc, c) => {
                const sexo = c.sexo || 'Não Informar';
                acc[sexo] = (acc[sexo] || 0) + 1;
                return acc;
            }, {});
            const labels = Object.keys(contagem);
            const values = Object.values(contagem);
            if (cidadaosSexoChart) cidadaosSexoChart.destroy();
            cidadaosSexoChart = new Chart(ctx, {
                type: 'pie',
                data: { labels, datasets: [{ label: 'Cidadãos por Sexo', data: values, backgroundColor: ['#3B82F6', '#EC4899', '#F59E0B', '#6B7280'] }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        } catch(e) { console.warn('Chart sexo:', e); }
    }
    async function updateCidadaosPorFaixaEtariaChart() {
        const ctx = document.getElementById('cidadaos-por-faixa-etaria-chart');
        if (!ctx) return;
        try {
            const { data, error } = await sb.from('cidadaos').select('dob');
            if (error) throw error;
            const faixas = { '0-17': 0, '18-25': 0, '26-35': 0, '36-50': 0, '51-65': 0, '66+': 0, 'N/A': 0 };
            (data || []).forEach(c => { const faixa = getFaixaEtaria(c.dob); faixas[faixa]++; });
            const labels = Object.keys(faixas);
            const values = Object.values(faixas);
            if (cidadaosFaixaEtariaChart) cidadaosFaixaEtariaChart.destroy();
            cidadaosFaixaEtariaChart = new Chart(ctx, {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Cidadãos por Faixa Etária', data: values, backgroundColor: '#8B5CF6' }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
            });
        } catch(e) { console.warn('Chart faixa etária:', e); }
    }
    async function openCidadaoModal(cidadaoId = null) {
        currentEditingId = cidadaoId;
        cidadaoForm.reset();
        fileNameDisplay.textContent = 'Nenhum ficheiro selecionado';
        childrenDetailsContainer.innerHTML = '';
        const titleEl = document.getElementById('cidadao-modal-title');
        if (cidadaoId) {
            titleEl.textContent = 'Editar Cidadão';
            const cidadao = allCidadaos.find(c => c.id === cidadaoId);
            if (cidadao) {
                cidadaoName.value = cidadao.name || '';
                cidadaoEmail.value = cidadao.email || '';
                cidadaoDob.value = cidadao.dob || '';
                cidadaoSexo.value = cidadao.sexo || 'Não Informar';
                cidadaoType.value = cidadao.type || 'Outro';
                // Autocomplete liderança — preenche texto e valor oculto
                const leaderHidden = document.getElementById('cidadao-leader');
                const leaderSearch = document.getElementById('cidadao-leader-search');
                if (leaderHidden && leaderSearch) {
                    leaderHidden.value = cidadao.leader || '';
                    const ldr = allLeaders.find(l => l.id === cidadao.leader);
                    leaderSearch.value = ldr ? ldr.name : '';
                }
                cidadaoCPF.value = cidadao.cpf || '';
                cidadaoRG.value = cidadao.rg || '';
                cidadaoVoterId.value = cidadao.voterid || '';
                cidadaoPhone.value = cidadao.phone || '';
                cidadaoWhatsapp.checked = cidadao.whatsapp || false;
                cidadaoProfissao.value = cidadao.profissao || '';
                cidadaoLocalTrabalho.value = cidadao.localtrabalho || '';
                cidadaoPhotoUrl.value = cidadao.photourl || '';
                cidadaoLat.value = cidadao.latitude || ''; 
                cidadaoLong.value = cidadao.longitude || ''; 
                cidadaoCEP.value = cidadao.cep || '';
                cidadaoLogradouro.value = cidadao.logradouro || '';
                cidadaoNumero.value = cidadao.numero || '';
                cidadaoComplemento.value = cidadao.complemento || '';
                cidadaoBairro.value = cidadao.bairro || '';
                cidadaoCidade.value = cidadao.cidade || '';
                cidadaoEstado.value = cidadao.estado || '';
                cidadaoSons.value = cidadao.sons || 0;
                cidadaoDaughters.value = cidadao.daughters || 0;
                updateChildrenInputs('filho', cidadao.children);
                updateChildrenInputs('filha', cidadao.children);
            }
        } else {
            titleEl.textContent = 'Adicionar Novo Cidadão';
        }
        cidadaoModal.classList.remove('hidden');
        setTimeout(() => { modalContent.classList.remove('scale-95', 'opacity-0'); }, 10);
    }
    function closeCidadaoModal() {
        const leaderSearch = document.getElementById('cidadao-leader-search');
        const leaderHidden = document.getElementById('cidadao-leader');
        if (leaderSearch) { leaderSearch.value = ''; leaderSearch._autocompleteReady = false; }
        if (leaderHidden) leaderHidden.value = '';
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { cidadaoModal.classList.add('hidden'); }, 300);
    }
    function updateChildrenInputs(type, childrenData = null) {
        const count = (type === 'filho' ? cidadaoSons.value : cidadaoDaughters.value) || 0;
        const containerId = type === 'filho' ? 'sons-inputs' : 'daughters-inputs';
        const label = type === 'filho' ? 'Filho' : 'Filha';
        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'space-y-3 p-4 bg-gray-50 rounded-lg';
            childrenDetailsContainer.appendChild(container);
        }
        container.innerHTML = '';
        if (count > 0) {
            container.innerHTML += `<h4 class="font-medium text-gray-700">${label}s:</h4>`;
        }
        for (let i = 0; i < count; i++) {
            const existingChild = (childrenData || []).find(c => c.type === type && c.index === i);
            container.innerHTML += `<div class="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label class="block text-xs font-medium text-gray-600">${label} ${i + 1} - Nome</label><input type="text" data-type="${type}" data-index="${i}" data-field="name" class="w-full border border-gray-300 p-2 rounded-lg mt-1" value="${existingChild?.name || ''}"></div><div><label class="block text-xs font-medium text-gray-600">${label} ${i + 1} - Data Nasc.</label><input type="date" data-type="${type}" data-index="${i}" data-field="dob" class="w-full border border-gray-300 p-2 rounded-lg mt-1" value="${existingChild?.dob || ''}"></div></div>`;
        }
    }
    function getChildrenData() {
        const children = [];
        const inputs = childrenDetailsContainer.querySelectorAll('input[data-type]');
        inputs.forEach(input => {
            const type = input.dataset.type;
            const index = parseInt(input.dataset.index, 10);
            const field = input.dataset.field;
            const value = input.value;
            let child = children.find(c => c.type === type && c.index === index);
            if (!child) {
                child = { type, index };
                children.push(child);
            }
            child[field] = value;
        });
        return children.filter(c => c.name && c.dob);
    }
    async function handleCEPBlur(e) {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                if (!response.ok) throw new Error('CEP não encontrado');
                const data = await response.json();
                if (data.erro) {
                    showToast("CEP não encontrado.", "warning");
                } else {
                    cidadaoLogradouro.value = data.logradouro;
                    cidadaoBairro.value = data.bairro;
                    cidadaoCidade.value = data.localidade;
                    cidadaoEstado.value = data.uf;
                    cidadaoNumero.focus();
                }
            } catch (error) {
                console.error(error);
                showToast("Erro ao consultar o CEP.", "error");
            }
        }
    }
    async function openDetailsModal(cidadaoId) {
        currentCidadaoIdForDetails = cidadaoId;
        // Tenta achar no cache local primeiro; se não estiver (paginação), busca no servidor
        let cidadao = allCidadaos.find(c => c.id === cidadaoId);
        if (!cidadao) {
            const { data, error } = await sb
                .from('cidadaos')
                .select('*')
                .eq('id', cidadaoId)
                .single();
            if (error || !data) return;
            cidadao = data;
        }
        const detailsModal = document.getElementById('cidadao-details-modal');
        const content = detailsModal.querySelector('.transform');
        const photoEl = document.getElementById('details-photo');
        if (cidadao.photourl) { 
            photoEl.innerHTML = `<img src="${cidadao.photourl}" alt="${cidadao.name}" class="w-24 h-24 rounded-full object-cover bg-gray-200" onerror="this.src='https://placehold.co/100x100/E2E8F0/64748B?text=${getInitials(cidadao.name)}'">`;
        } else {
            photoEl.innerHTML = `<div class="w-24 h-24 rounded-full bg-blue-500 text-white flex items-center justify-center text-4xl font-bold">${getInitials(cidadao.name)}</div>`;
        }
        document.getElementById('details-name').textContent = cidadao.name;
        document.getElementById('details-type').textContent = cidadao.type;
        document.getElementById('details-email').textContent = cidadao.email || 'Não informado';
        document.getElementById('details-phone').textContent = cidadao.phone ? `${cidadao.phone} ${cidadao.whatsapp ? '(WhatsApp)' : ''}` : 'Não informado';
        const addressParts = [cidadao.logradouro, cidadao.numero, cidadao.complemento, cidadao.bairro, cidadao.cidade, cidadao.estado, cidadao.cep].filter(Boolean);
        document.getElementById('details-address').textContent = addressParts.join(', ') || 'Não informado';
        document.getElementById('details-cpf').textContent = cidadao.cpf || 'Não informado';
        document.getElementById('details-rg').textContent = cidadao.rg || 'Não informado';
        const voterId = cidadao.voterid || '';
        const zona = cidadao.zona || '';
        const secao = cidadao.secao || '';
        let voterText = voterId || 'Não informado';
        if (zona || secao) voterText += ` | Zona: ${zona || '—'} | Seção: ${secao || '—'}`;
        document.getElementById('details-voterid').textContent = voterText;
        document.getElementById('details-dob').textContent = cidadao.dob ? formatarData(cidadao.dob) : 'Não informado';
        document.getElementById('details-sexo').textContent = cidadao.sexo || 'Não Informar';
        document.getElementById('details-profissao').textContent = cidadao.profissao || 'Não informado';
        document.getElementById('details-local-trabalho').textContent = cidadao.localtrabalho || 'Não informado';
        const leader = allLeaders.find(l => l.id === cidadao.leader);
        document.getElementById('details-leader').textContent = leader ? leader.name : 'Nenhuma';
        const childrenEl = document.getElementById('details-children');
        const totalFilhos = (cidadao.sons || 0) + (cidadao.daughters || 0);
        childrenEl.innerHTML = `<strong>Família:</strong> ${totalFilhos} filho(s)`;
        if (cidadao.children && cidadao.children.length > 0) {
            const childrenList = cidadao.children.map(c => `<li class="text-sm ml-4">${c.name} (${formatarData(c.dob)})</li>`).join('');
            childrenEl.innerHTML += `<ul class="list-disc list-inside">${childrenList}</ul>`;
        }
        document.getElementById('details-view-map-btn').onclick = () => {
            closeDetailsModal();
            openMapModal([cidadao]);
        };
        document.getElementById('details-share-location-btn').onclick = () => shareLocation(cidadao);
        detailsModal.classList.remove('hidden');
        setTimeout(() => { content.classList.remove('scale-95', 'opacity-0'); }, 10);
    }
    function closeDetailsModal() {
        const detailsModal = document.getElementById('cidadao-details-modal');
        const content = detailsModal.querySelector('.transform');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            detailsModal.classList.add('hidden');
            currentCidadaoIdForDetails = null;
        }, 300);
    }
    function shareLocation(cidadao) {
        if (!cidadao.logradouro || !cidadao.cidade) {
            showToast("Endereço incompleto.", "warning");
            return;
        }
        const address = `${cidadao.logradouro}, ${cidadao.numero || 'S/N'}, ${cidadao.bairro}, ${cidadao.cidade}, ${cidadao.estado}`;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        const text = `Olá! Aqui está a localização de ${cidadao.name}:\n${address}\n\nVer no mapa:\n${url}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    }
    async function openDemandaModal(cidadaoId = null) {
        currentEditingDemandaId = null;
        demandaForm.reset();
        currentCidadaoIdForDemanda = cidadaoId;
        const searchEl = document.getElementById('demanda-cidadao-search');
        const demandaCidadaoSelect = document.getElementById('demanda-cidadao-select');
        searchEl.value = '';
        demandaCidadaoSelect.innerHTML = '<option value="" disabled selected>Digite o nome para buscar...</option>';

        // Se veio com um cidadão específico (botão "Demanda" no card), pré-carrega ele
        if (cidadaoId) {
            const cidadao = allCidadaos.find(c => c.id === cidadaoId);
            if (cidadao) {
                const opt = document.createElement('option');
                opt.value = cidadao.id;
                opt.textContent = cidadao.name;
                demandaCidadaoSelect.appendChild(opt);
                demandaCidadaoSelect.value = cidadaoId;
            }
        }

        // PERFORMANCE: busca cidadãos dinamicamente conforme o usuário digita (não carrega 25k)
        let demandaSearchDebounce;
        searchEl.oninput = () => {
            clearTimeout(demandaSearchDebounce);
            demandaSearchDebounce = setTimeout(async () => {
                const term = searchEl.value.trim();
                if (term.length < 2) return;
                const { data } = await sb
                    .from('cidadaos')
                    .select('id, name')
                    .ilike('name', `%${term}%`)
                    .order('name')
                    .limit(20);
                if (!data) return;
                const currentVal = demandaCidadaoSelect.value;
                demandaCidadaoSelect.innerHTML = '<option value="" disabled>Selecione...</option>';
                data.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    demandaCidadaoSelect.appendChild(opt);
                });
                if (currentVal) demandaCidadaoSelect.value = currentVal;
            }, 300);
        };

        demandaModal.classList.remove('hidden');
    }
    function closeDemandaModal() {
        demandaModal.classList.add('hidden');
    }
    function closeDemandaDetailsModal() {
        demandaDetailsModal.classList.add('hidden');
        viewingDemandaId = null;
    }
    function requestDelete(itemId, type) {
        itemToDelete = { id: itemId, type: type };
        const modal = document.getElementById('confirmation-modal');
        const title = document.getElementById('confirmation-title');
        const message = document.getElementById('confirmation-message');
        if (type === 'cidadao') {
            const cidadao = allCidadaos.find(c => c.id === itemId);
            title.textContent = 'Excluir Cidadão';
            message.textContent = `Tem a certeza que quer excluir "${cidadao.name}"?`;
        } else if (type === 'demanda') {
            const demanda = allDemandas.find(d => d.id === itemId);
            title.textContent = 'Excluir Demanda';
            message.textContent = `Tem a certeza que quer excluir "${demanda ? demanda.title : 'esta demanda'}"?`;
        }
        modal.classList.remove('hidden');
    }
    function closeConfirmationModal() {
        document.getElementById('confirmation-modal').classList.add('hidden');
        itemToDelete = { id: null, type: null };
    }
    function initializeMap() {
    if (map) { map.remove(); }
    map = L.map('map').setView([-0.03964, -51.18182], 13); 
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    markers = [];
}
async function openMapModal(cidadaosToPlot = null) {
    mapModal.classList.remove('hidden');
    if (!map) {
        initializeMap();
        await new Promise(resolve => setTimeout(resolve, 200));
    } else {
        markers.forEach(m => { try { m.remove(); } catch(e) {} });
        markers = [];
        // Remove cluster anterior se existir
        if (map._clusterGroup) { map.removeLayer(map._clusterGroup); map._clusterGroup = null; }
    }
    if (map) map.invalidateSize();

    // PERFORMANCE: se não recebeu lista específica, busca só cidadãos com coordenadas do servidor
    let cidadaos = cidadaosToPlot;
    if (!cidadaos) {
        const { data } = await sb
            .from('cidadaos')
            .select('id, name, type, latitude, longitude, logradouro, numero')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .limit(5000); // limite razoável para o mapa
        cidadaos = data || [];
    }

    const bounds = [];
    // PERFORMANCE: usa MarkerClusterGroup se disponível, senão marcadores normais
    const useCluster = typeof L.markerClusterGroup === 'function';
    const clusterGroup = useCluster ? L.markerClusterGroup({ chunkedLoading: true }) : null;
    if (clusterGroup) { map._clusterGroup = clusterGroup; }

    for (const cidadao of cidadaos) {
        if (cidadao.latitude && cidadao.longitude) {
            try {
                const latLng = [parseFloat(cidadao.latitude), parseFloat(cidadao.longitude)];
                const marker = L.marker(latLng);
                const popupEl = document.createElement('div');
                const nameEl = document.createElement('strong');
                nameEl.textContent = cidadao.name;
                const typeEl = document.createElement('span');
                typeEl.textContent = ' — ' + cidadao.type;
                popupEl.appendChild(nameEl);
                popupEl.appendChild(typeEl);
                marker.bindPopup(popupEl);
                if (clusterGroup) { clusterGroup.addLayer(marker); } else { marker.addTo(map); }
                markers.push(marker);
                bounds.push(latLng);
            } catch (error) { console.warn(error); }
        }
    }
    if (clusterGroup) map.addLayer(clusterGroup);

    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    } else {
        map.setView([-0.03964, -51.18182], 13);
    }
}
function closeMapModal() {
    mapModal.classList.add('hidden');
}
    async function generatePrintReport() {
        // Busca TODOS os cidadãos com os filtros ativos — não apenas a página atual
        showToast("A gerar relatório...", "info");
        const s = serverSearchState;
        let query = sb.from('cidadaos').select('name, type, phone, whatsapp, email, logradouro, numero, complemento, bairro, cidade, estado, cep');
        if (s.search)  query = query.or(`name.ilike.%${s.search}%,email.ilike.%${s.search}%,cpf.ilike.%${s.search}%,voterid.ilike.%${s.search}%`);
        if (s.type)    query = query.eq('type', s.type);
        if (s.bairro)  query = query.eq('bairro', s.bairro);
        if (s.cidade)  query = query.eq('cidade', s.cidade);
        if (s.leader)  query = query.eq('leader', s.leader);
        if (s.sexo)    query = query.eq('sexo', s.sexo);
        if (s.localTrabalho) query = query.ilike('localtrabalho', `%${s.localTrabalho}%`);
        query = query.order('name', { ascending: true });

        const { data, error } = await query;
        if (error || !data || data.length === 0) {
            showToast("Nenhum cidadão encontrado.", "warning");
            return;
        }
        const reportWindow = window.open('', '', 'width=800,height=600');
        reportWindow.document.write('<html><head><title>Relatório</title>');
        reportWindow.document.write(`<style> body { font-family: Arial, sans-serif; margin: 20px; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; } h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; } @media print { button { display: none; } } </style>`);
        reportWindow.document.write('</head><body>');
        reportWindow.document.write('<h1>Relatório de Cidadãos</h1>');
        reportWindow.document.write(`<p>Total: ${data.length}</p>`);
        reportWindow.document.write('<button onclick="window.print()">Imprimir</button>');
        reportWindow.document.write('<table>');
        reportWindow.document.write(`<thead><tr><th>Nome</th><th>Tipo</th><th>Telefone</th><th>Email</th><th>Endereço</th></tr></thead><tbody>`);
        data.forEach(cidadao => {
            const addressParts = [cidadao.logradouro, cidadao.numero, cidadao.complemento, cidadao.bairro, cidadao.cidade, cidadao.estado, cidadao.cep].filter(Boolean);
            const endereco = addressParts.join(', ') || 'Não informado';
            // Escapa HTML para evitar XSS no relatório
            const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            reportWindow.document.write(`<tr><td>${esc(cidadao.name)}</td><td>${esc(cidadao.type)}</td><td>${esc(cidadao.phone)} ${cidadao.whatsapp ? '(W)' : ''}</td><td>${esc(cidadao.email)}</td><td>${esc(endereco)}</td></tr>`);
        });
        reportWindow.document.write('</tbody></table></body></html>');
        reportWindow.document.close();
    }
    async function generateExcelReport() {
        showToast("A gerar Excel...", "info");
        const s = serverSearchState;
        let query = sb.from('cidadaos').select(
            'name, cpf, rg, voterid, zona, secao, dob, sexo, type, phone, whatsapp, email, profissao, localtrabalho, logradouro, numero, complemento, bairro, cidade, estado, cep'
        );
        if (s.search)  query = query.or(`name.ilike.%${s.search}%,email.ilike.%${s.search}%,cpf.ilike.%${s.search}%,voterid.ilike.%${s.search}%`);
        if (s.type)    query = query.eq('type', s.type);
        if (s.bairro)  query = query.eq('bairro', s.bairro);
        if (s.cidade)  query = query.eq('cidade', s.cidade);
        if (s.leader)  query = query.eq('leader', s.leader);
        if (s.sexo)    query = query.eq('sexo', s.sexo);
        if (s.localTrabalho) query = query.ilike('localtrabalho', `%${s.localTrabalho}%`);
        query = query.order('name', { ascending: true });

        const { data, error } = await query;
        if (error || !data || data.length === 0) {
            showToast("Nenhum cidadão encontrado.", "warning");
            return;
        }

        // Cabeçalhos do Excel
        const headers = [
            'Nome', 'CPF', 'RG', 'Título de Eleitor', 'Zona', 'Seção', 'Data Nasc.', 'Sexo', 'Tipo',
            'Telefone', 'WhatsApp', 'Email', 'Profissão', 'Local de Trabalho',
            'Logradouro', 'Número', 'Complemento', 'Bairro', 'Cidade', 'Estado', 'CEP'
        ];

        const rows = data.map(c => [
            c.name || '',
            c.cpf || '',
            c.rg || '',
            c.voterid || '',
            c.zona || '',
            c.secao || '',
            c.dob ? formatarData(c.dob) : '',
            c.sexo || '',
            c.type || '',
            c.phone || '',
            c.whatsapp ? 'Sim' : 'Não',
            c.email || '',
            c.profissao || '',
            c.localtrabalho || '',
            c.logradouro || '',
            c.numero || '',
            c.complemento || '',
            c.bairro || '',
            c.cidade || '',
            c.estado || '',
            c.cep || ''
        ]);

        // Gera CSV compatível com Excel (separador ponto-e-vírgula para pt-BR)
        const esc = v => {
            const s = String(v);
            return (s.includes(';') || s.includes('"') || s.includes('\n'))
                ? ('"' + s.replace(/"/g, '""') + '"') : s;
        };
        const csvLines = [
            headers.map(esc).join(';'),
            ...rows.map(r => r.map(esc).join(';'))
        ];
        const csvContent = '\uFEFF' + csvLines.join('\r\n'); // BOM para Excel reconhecer UTF-8

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        a.download = `cidadaos_${hoje}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Excel gerado — ${data.length} cidadão(s).`, "success");
    }

    // ═══════════════════════════════════════════════════════════════
    // GESTÃO DE UTILIZADORES (só admin)
    // ═══════════════════════════════════════════════════════════════

    async function callEdgeFunction(payload) {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) throw new Error('Sessão expirada.');
        const res = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro na Edge Function.');
        return json;
    }

    async function loadUsers() {
        const listEl = document.getElementById('users-list');
        if (!listEl) return;
        listEl.innerHTML = '<p class="text-gray-400 text-sm">A carregar...</p>';
        try {
            const { users } = await callEdgeFunction({ action: 'list' });
            allUsers = users;
            renderUsersList();
        } catch(e) {
            console.error(e);
            listEl.innerHTML = '<p class="text-red-500 text-sm">Erro ao carregar utilizadores.</p>';
        }
    }

    function renderUsersList() {
        const listEl = document.getElementById('users-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        if (!allUsers.length) {
            listEl.innerHTML = '<p class="text-gray-500 text-center">Nenhum utilizador encontrado.</p>';
            return;
        }
        allUsers.forEach(u => {
            const isCurrentUser = u.id === user.id;
            const roleLabel = u.role === 'admin' ? 'Administrador' : 'Cadastrador';
            const roleBadgeColor = u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
            const lastLogin = u.last_sign_in
                ? new Date(u.last_sign_in).toLocaleDateString('pt-BR')
                : 'Nunca';

            const row = document.createElement('div');
            row.className = 'bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between gap-4';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'flex-1 min-w-0';

            const emailEl = document.createElement('p');
            emailEl.className = 'font-semibold text-gray-800 truncate';
            emailEl.textContent = u.email;

            const metaEl = document.createElement('p');
            metaEl.className = 'text-sm text-gray-500';
            metaEl.textContent = `Último acesso: ${lastLogin}`;

            infoDiv.appendChild(emailEl);
            infoDiv.appendChild(metaEl);

            const badgeSpan = document.createElement('span');
            badgeSpan.className = `px-3 py-1 rounded-full text-xs font-semibold ${roleBadgeColor}`;
            badgeSpan.textContent = roleLabel;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'flex gap-2';

            if (!isCurrentUser) {
                const editBtn = document.createElement('button');
                editBtn.className = 'bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-lg text-sm';
                editBtn.textContent = 'Editar';
                editBtn.addEventListener('click', () => openUserModal(u));

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-lg text-sm';
                deleteBtn.textContent = 'Remover';
                deleteBtn.addEventListener('click', () => confirmDeleteUser(u));

                actionsDiv.appendChild(editBtn);
                actionsDiv.appendChild(deleteBtn);
            } else {
                const youSpan = document.createElement('span');
                youSpan.className = 'text-xs text-gray-400 italic';
                youSpan.textContent = '(você)';
                actionsDiv.appendChild(youSpan);
            }

            row.appendChild(infoDiv);
            row.appendChild(badgeSpan);
            row.appendChild(actionsDiv);
            listEl.appendChild(row);
        });
    }

    let editingUserId = null;

    function openUserModal(userToEdit = null) {
        editingUserId = userToEdit ? userToEdit.id : null;
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('user-modal-title');
        const emailInput = document.getElementById('user-email');
        const passwordGroup = document.getElementById('user-password-group');
        const roleSelect = document.getElementById('user-role');

        document.getElementById('user-form').reset();

        if (userToEdit) {
            title.textContent = 'Editar Utilizador';
            emailInput.value = userToEdit.email;
            emailInput.disabled = true;
            passwordGroup.classList.add('hidden');
            roleSelect.value = userToEdit.role;
        } else {
            title.textContent = 'Novo Utilizador';
            emailInput.disabled = false;
            passwordGroup.classList.remove('hidden');
            roleSelect.value = 'cadastrador';
        }
        modal.classList.remove('hidden');
    }

    function closeUserModal() {
        document.getElementById('user-modal').classList.add('hidden');
        editingUserId = null;
    }

    async function handleUserFormSubmit(e) {
        e.preventDefault();
        const saveBtn = document.getElementById('save-user-btn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<div class="spinner"></div>';
        try {
            if (editingUserId) {
                // Apenas altera o perfil
                const role = document.getElementById('user-role').value;
                await callEdgeFunction({ action: 'update_role', userId: editingUserId, role });
                showToast('Perfil atualizado!', 'success');
            } else {
                // Cria novo utilizador
                const email = document.getElementById('user-email').value.trim();
                const password = document.getElementById('user-password').value;
                const role = document.getElementById('user-role').value;
                if (password.length < 6) {
                    showToast('A senha deve ter pelo menos 6 caracteres.', 'warning');
                    return;
                }
                await callEdgeFunction({ action: 'create', email, password, role });
                showToast('Utilizador criado com sucesso!', 'success');
            }
            closeUserModal();
            await loadUsers();
        } catch(e) {
            console.error(e);
            showToast(e.message || 'Erro ao salvar.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Salvar';
        }
    }

    async function confirmDeleteUser(u) {
        if (!confirm(`Remover o utilizador "${u.email}"? Esta ação não pode ser desfeita.`)) return;
        try {
            await callEdgeFunction({ action: 'delete', userId: u.id });
            showToast('Utilizador removido.', 'success');
            await loadUsers();
        } catch(e) {
            showToast(e.message || 'Erro ao remover.', 'error');
        }
    }


    // ═══════════════════════════════════════════════════════════════
    // COBERTURA ELEITORAL
    // ═══════════════════════════════════════════════════════════════
    let coberturaData = [];

    function clearCoberturaFiltros() {
        const el = id => document.getElementById(id);
        if (el('cobertura-filter-cidade')) el('cobertura-filter-cidade').value = '';
        if (el('cobertura-filter-zona'))   el('cobertura-filter-zona').value   = '';
        if (el('cobertura-filter-secao'))  el('cobertura-filter-secao').value  = '';
        if (el('cobertura-filter-lider'))  el('cobertura-filter-lider').value  = '';
        const cobSearchInput = el('cobertura-lider-search');
        if (cobSearchInput) { cobSearchInput.value = ''; cobSearchInput._autocompleteReady = false; }
        // Limpa resultados
        const tbody = el('cobertura-tbody'); if (tbody) tbody.innerHTML = '';
        const liderTbody = el('cobertura-lider-tbody'); if (liderTbody) liderTbody.innerHTML = '';
        const summary = el('cobertura-summary'); if (summary) summary.innerHTML = '';
        el('cobertura-table-wrap')?.classList.remove('hidden');
        el('cobertura-lider-wrap')?.classList.add('hidden');
        el('cobertura-empty')?.classList.remove('hidden');
        el('cobertura-lider-empty')?.classList.add('hidden');
        coberturaData = [];
    }

    async function loadCoberturaEleitoral() {
        const el     = id => document.getElementById(id);
        const btn    = el('cobertura-load-btn');
        const summary = el('cobertura-summary');
        if (!btn) return;

        const cidade  = el('cobertura-filter-cidade')?.value || '';
        const zona    = el('cobertura-filter-zona')?.value.trim() || '';
        const secao   = el('cobertura-filter-secao')?.value.trim() || '';
        const liderId = el('cobertura-filter-lider')?.value || '';

        btn.disabled = true;
        btn.innerHTML = '<div class="spinner mx-auto" style="display:inline-block"></div>';

        try {
            if (liderId) {
                // ── MODO LIDERANÇA: tabela individual com nome/título/zona/seção ──
                el('cobertura-table-wrap')?.classList.add('hidden');
                el('cobertura-lider-wrap')?.classList.remove('hidden');

                const liderTbody = el('cobertura-lider-tbody');
                const liderEmpty = el('cobertura-lider-empty');
                const liderHeader = el('cobertura-lider-header');
                liderTbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400">A carregar...</td></tr>';
                if (liderEmpty) liderEmpty.classList.add('hidden');

                let query = sb.from('cidadaos')
                    .select('name, voterid, zona, secao, cidade, type')
                    .eq('leader', liderId)
                    .not('zona', 'is', null)
                    .not('zona', 'eq', '');
                if (cidade) query = query.eq('cidade', cidade);
                if (zona)   query = query.ilike('zona', `%${zona}%`);
                if (secao)  query = query.ilike('secao', `%${secao}%`);
                query = query.order('zona', { ascending: true }).order('secao', { ascending: true }).order('name', { ascending: true });

                // ── Paginação server-side: chunks de 1000, limite de segurança 5000 ──
                let data = [];
                let _lOffset = 0;
                const _LPAGE = 1000;
                const _LMAX  = 5000;
                let _lTruncated = false;
                while (true) {
                    const { data: chunk, error } = await query.range(_lOffset, _lOffset + _LPAGE - 1);
                    if (error) throw error;
                    data = [...data, ...(chunk || [])];
                    if (!chunk || chunk.length < _LPAGE) break;
                    _lOffset += _LPAGE;
                    if (data.length >= _LMAX) { _lTruncated = true; break; }
                }

                const liderNome = allLeaders.find(l => l.id === liderId)?.name || 'Liderança';
                if (liderHeader) {
                    liderHeader.innerHTML = `<span class="font-semibold text-blue-800">Liderança: ${liderNome}</span> <span class="text-blue-600 ml-2">${(data||[]).length} cidadão(s) com zona/seção cadastrada</span>${_lTruncated ? ' <span class="text-orange-600 font-semibold ml-2">⚠️ Exibindo os primeiros 5.000 resultados — use filtros para refinar.</span>' : ''}`;
                }

                liderTbody.innerHTML = '';
                if (!data || data.length === 0) {
                    if (liderEmpty) liderEmpty.classList.remove('hidden');
                } else {
                    // Cards resumo por zona/seção
                    const gruposLider = {};
                    data.forEach(c => {
                        const key = `${c.zona}||${c.secao}`;
                        gruposLider[key] = (gruposLider[key] || 0) + 1;
                    });
                    if (summary) {
                        const zonas = new Set(data.map(c => c.zona)).size;
                        const secoes = Object.keys(gruposLider).length;
                        summary.innerHTML = `
                            <div class="bg-white rounded-lg shadow-sm p-4 text-center border">
                                <p class="text-3xl font-bold text-blue-600">${data.length}</p>
                                <p class="text-sm text-gray-500 mt-1">Cidadãos da Liderança</p>
                            </div>
                            <div class="bg-white rounded-lg shadow-sm p-4 text-center border">
                                <p class="text-3xl font-bold text-green-600">${zonas}</p>
                                <p class="text-sm text-gray-500 mt-1">Zonas</p>
                            </div>
                            <div class="bg-white rounded-lg shadow-sm p-4 text-center border">
                                <p class="text-3xl font-bold text-purple-600">${secoes}</p>
                                <p class="text-sm text-gray-500 mt-1">Seções</p>
                            </div>
                            <div class="bg-white rounded-lg shadow-sm p-4 text-center border">
                                <p class="text-xl font-bold text-orange-600 truncate">${liderNome.split(' ')[0]}</p>
                                <p class="text-sm text-gray-500 mt-1">Liderança Selecionada</p>
                            </div>`;
                    }
                    data.forEach(c => {
                        const tr = document.createElement('tr');
                        tr.className = 'hover:bg-gray-50';
                        tr.innerHTML = `
                            <td class="px-4 py-3 font-medium text-gray-800">${c.name}</td>
                            <td class="px-4 py-3 text-gray-600 font-mono text-xs">${c.voterid || '—'}</td>
                            <td class="px-4 py-3"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold text-xs">${c.zona || '—'}</span></td>
                            <td class="px-4 py-3"><span class="bg-purple-100 text-purple-800 px-2 py-1 rounded font-semibold text-xs">${c.secao || '—'}</span></td>
                            <td class="px-4 py-3 text-gray-600 text-sm">${c.cidade || '—'}</td>
                            <td class="px-4 py-3 text-gray-500 text-xs">${c.type || 'Outro'}</td>`;
                        liderTbody.appendChild(tr);
                    });
                }
            } else {
                // ── MODO PADRÃO: agrupado por município/zona/seção ──
                el('cobertura-lider-wrap')?.classList.add('hidden');
                el('cobertura-table-wrap')?.classList.remove('hidden');

                const tbody = el('cobertura-tbody');
                const empty = el('cobertura-empty');
                tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">A carregar...</td></tr>';
                if (empty) empty.classList.add('hidden');

                // ── Paginação server-side: chunks de 1000 para suportar 25k+ cadastros ──
                let data = [];
                let _offset = 0;
                const _PAGE = 1000;
                while (true) {
                    let q = sb.from('cidadaos')
                        .select('cidade, zona, secao, type')
                        .not('zona', 'is', null)
                        .not('zona', 'eq', '');
                    if (cidade) q = q.eq('cidade', cidade);
                    if (zona)   q = q.ilike('zona', `%${zona}%`);
                    if (secao)  q = q.ilike('secao', `%${secao}%`);
                    q = q.range(_offset, _offset + _PAGE - 1);
                    const { data: chunk, error } = await q;
                    if (error) throw error;
                    data = [...data, ...(chunk || [])];
                    if (!chunk || chunk.length < _PAGE) break;
                    _offset += _PAGE;
                }

                if (!data || data.length === 0) {
                    tbody.innerHTML = '';
                    if (empty) empty.classList.remove('hidden');
                    if (summary) summary.innerHTML = '';
                    coberturaData = [];
                    return;
                }

                const grupos = {};
                data.forEach(c => {
                    const key = `${c.cidade||'—'}||${c.zona||'—'}||${c.secao||'—'}`;
                    if (!grupos[key]) grupos[key] = { cidade: c.cidade||'—', zona: c.zona||'—', secao: c.secao||'—', total: 0, tipos: {} };
                    grupos[key].total++;
                    grupos[key].tipos[c.type||'Outro'] = (grupos[key].tipos[c.type||'Outro'] || 0) + 1;
                });

                coberturaData = Object.values(grupos).sort((a, b) => {
                    const cc = a.cidade.localeCompare(b.cidade, 'pt-BR');
                    if (cc !== 0) return cc;
                    const zn = String(a.zona).localeCompare(String(b.zona), 'pt-BR', { numeric: true });
                    if (zn !== 0) return zn;
                    return String(a.secao).localeCompare(String(b.secao), 'pt-BR', { numeric: true });
                });

                const totalCidadaos = coberturaData.reduce((s, g) => s + g.total, 0);
                const totalSecoes   = coberturaData.length;
                const totalZonas    = new Set(coberturaData.map(g => `${g.cidade}||${g.zona}`)).size;
                const topSecao      = coberturaData.reduce((a, b) => b.total > (a?.total||0) ? b : a, null);

                if (summary) {
                    summary.innerHTML = `
                        <div class="bg-white rounded-lg shadow-sm p-4 text-center border">
                            <p class="text-3xl font-bold text-blue-600">${totalCidadaos}</p>
                            <p class="text-sm text-gray-500 mt-1">Cidadãos com Zona/Seção</p>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm p-4 text-center border">
                            <p class="text-3xl font-bold text-green-600">${totalZonas}</p>
                            <p class="text-sm text-gray-500 mt-1">Zonas</p>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm p-4 text-center border">
                            <p class="text-3xl font-bold text-purple-600">${totalSecoes}</p>
                            <p class="text-sm text-gray-500 mt-1">Seções</p>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm p-4 text-center border">
                            <p class="text-3xl font-bold text-orange-600">${topSecao ? topSecao.total : 0}</p>
                            <p class="text-sm text-gray-500 mt-1">Maior Seção${topSecao ? ` (Z${topSecao.zona}/S${topSecao.secao})` : ''}</p>
                        </div>`;
                }

                tbody.innerHTML = '';
                coberturaData.forEach(g => {
                    const tiposStr = Object.entries(g.tipos).sort((a, b) => b[1]-a[1]).map(([t,n]) => `${t}: ${n}`).join(' · ');
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-gray-50';
                    tr.innerHTML = `
                        <td class="px-4 py-3 text-gray-800">${g.cidade}</td>
                        <td class="px-4 py-3 font-semibold">${g.zona}</td>
                        <td class="px-4 py-3 font-semibold">${g.secao}</td>
                        <td class="px-4 py-3 text-center"><span class="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-sm">${g.total}</span></td>
                        <td class="px-4 py-3 text-gray-500 text-xs">${tiposStr}</td>`;
                    tbody.appendChild(tr);
                });
            }
        } catch(e) {
            console.error(e);
            showToast('Erro ao carregar cobertura: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Buscar';
        }
    }

    function exportCoberturaExcel() {
        // Verifica qual modo está activo
        const liderWrap = document.getElementById('cobertura-lider-wrap');
        const isLiderMode = liderWrap && !liderWrap.classList.contains('hidden');
        if (isLiderMode) {
            // Exportar tabela de liderança
            const rows = [];
            document.querySelectorAll('#cobertura-lider-tbody tr').forEach(tr => {
                const tds = tr.querySelectorAll('td');
                if (tds.length) rows.push([tds[0].textContent, tds[1].textContent, tds[2].textContent, tds[3].textContent, tds[4].textContent, tds[5].textContent]);
            });
            if (!rows.length) { showToast('Sem dados para exportar.', 'warning'); return; }
            const headers = ['Nome','Título de Eleitor','Zona','Seção','Município','Tipo'];
            const esc = v => { const s = String(v??''); return (s.includes(';')||s.includes('"')) ? '"'+s.replace(/"/g,'""')+'"' : s; };
            const csv = '\uFEFF' + [headers.map(esc).join(';'), ...rows.map(r => r.map(esc).join(';'))].join('\r\n');
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
            a.download = `cobertura_lideranca_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            showToast('Exportado!', 'success'); return;
        }
        if (!coberturaData.length) {
            showToast('Carregue os dados primeiro clicando em "Buscar".', 'warning');
            return;
        }
        const headers = ['Município', 'Zona', 'Seção', 'Total Cidadãos', 'Distribuição por Tipo'];
        const rows = coberturaData.map(g => [
            g.cidade, g.zona, g.secao, g.total,
            Object.entries(g.tipos).map(([t, n]) => `${t}: ${n}`).join(' | ')
        ]);
        const esc = v => {
            const s = String(v ?? '');
            return (s.includes(';') || s.includes('"') || s.includes('\n'))
                ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        const csv = ['\uFEFF',
            headers.map(esc).join(';'),
            ...rows.map(r => r.map(esc).join(';'))
        ].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `cobertura_eleitoral_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        showToast('Cobertura exportada com sucesso!', 'success');
    }

    // ═══════════════════════════════════════════════════════════════
    // BACKUP DE DADOS
    // ═══════════════════════════════════════════════════════════════
    async function backupData(format) {
        const jsonBtn = document.getElementById('backup-json-btn');
        const csvBtn  = document.getElementById('backup-csv-btn');
        const status  = document.getElementById('backup-status');
        const btn = format === 'json' ? jsonBtn : csvBtn;
        if (!btn) return;

        btn.disabled = true;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<div class="spinner" style="display:inline-block;margin-right:6px"></div> A exportar...';
        if (status) {
            status.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800';
            status.textContent = 'A exportar todos os dados do Supabase... Aguarde, pode demorar alguns segundos.';
            status.classList.remove('hidden');
        }

        try {
            // Cidadãos — busca paginada para suportar 25k+ registos
            let cidadaos = [];
            let offset = 0;
            const PAGE = 1000;
            while (true) {
                const { data, error } = await sb.from('cidadaos')
                    .select('*')
                    .order('name', { ascending: true })
                    .range(offset, offset + PAGE - 1);
                if (error) throw error;
                cidadaos = [...cidadaos, ...(data || [])];
                if (!data || data.length < PAGE) break;
                offset += PAGE;
            }

            // Demandas — todas de uma vez (geralmente menos registos)
            const { data: demandas, error: errDemandas } = await sb
                .from('demandas').select('*').order('created_at', { ascending: false });
            if (errDemandas) throw errDemandas;

            const hoje  = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
            const agora = new Date().toLocaleString('pt-BR');

            if (format === 'json') {
                const payload = {
                    exportado_em:    agora,
                    total_cidadaos:  cidadaos.length,
                    total_demandas:  (demandas||[]).length,
                    cidadaos,
                    demandas: demandas || []
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `backup_completo_${hoje}.json`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);

            } else {
                // CSV com todos os campos dos cidadãos
                const headers = [
                    'Nome','CPF','RG','Título Eleitor','Zona','Seção',
                    'Data Nasc.','Sexo','Tipo','Telefone','WhatsApp','Email',
                    'Profissão','Local Trabalho','Logradouro','Número',
                    'Complemento','Bairro','Cidade','Estado','CEP',
                    'Liderança','Filhos','Filhas','Cadastrado em'
                ];
                const esc = v => {
                    const s = String(v ?? '');
                    return (s.includes(';') || s.includes('"') || s.includes('\n'))
                        ? '"' + s.replace(/"/g, '""') + '"' : s;
                };
                const rows = cidadaos.map(c => [
                    c.name, c.cpf, c.rg, c.voterid, c.zona, c.secao,
                    c.dob ? formatarData(c.dob) : '',
                    c.sexo, c.type,
                    c.phone, c.whatsapp ? 'Sim' : 'Não', c.email,
                    c.profissao, c.localtrabalho,
                    c.logradouro, c.numero, c.complemento, c.bairro,
                    c.cidade, c.estado, c.cep,
                    allLeaders.find(l => l.id === c.leader)?.name || '',
                    c.sons ?? 0, c.daughters ?? 0,
                    c.created_at ? new Date(c.created_at).toLocaleString('pt-BR') : ''
                ]);
                const csv = ['\uFEFF',
                    headers.map(esc).join(';'),
                    ...rows.map(r => r.map(esc).join(';'))
                ].join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `backup_cidadaos_${hoje}.csv`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
            }

            // Regista no histórico local
            const hist = JSON.parse(localStorage.getItem('backupHistory') || '[]');
            hist.unshift({ data: agora, formato: format.toUpperCase(), total: cidadaos.length });
            localStorage.setItem('backupHistory', JSON.stringify(hist.slice(0, 10)));
            renderBackupHistory();

            if (status) {
                status.className = 'bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800';
                status.textContent = `✅ Backup concluído! ${cidadaos.length} cidadãos exportados em ${agora}.`;
            }
            showToast(`Backup ${format.toUpperCase()} concluído!`, 'success');

        } catch(e) {
            console.error(e);
            if (status) {
                status.className = 'bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800';
                status.textContent = '❌ Erro ao exportar: ' + e.message;
                status.classList.remove('hidden');
            }
            showToast('Erro no backup: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    }

    function renderBackupHistory() {
        const el = document.getElementById('backup-history');
        if (!el) return;
        const hist = JSON.parse(localStorage.getItem('backupHistory') || '[]');
        if (!hist.length) {
            el.innerHTML = '<p class="text-gray-400 text-sm">Nenhum backup registado neste dispositivo.</p>';
            return;
        }
        el.innerHTML = hist.map(h =>
            `<div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span class="text-gray-700 text-sm">${h.data}</span>
                <div class="flex gap-3 text-xs items-center">
                    <span class="bg-gray-100 px-2 py-1 rounded font-medium">${h.formato}</span>
                    <span class="text-gray-500">${h.total} cidadãos</span>
                </div>
            </div>`
        ).join('');
    }

    function switchPage(pageId) {
        if (pageId === 'backup-page') setTimeout(renderBackupHistory, 50);
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
            page.classList.remove('flex', 'flex-col');
        });
        const newPage = document.getElementById(pageId);
        if (newPage) {
            newPage.classList.remove('hidden');
            const flexPages = ['dashboard-page','cidadaos-page','demandas-page','cobertura-page','backup-page'];
            if (flexPages.includes(pageId)) newPage.classList.add('flex', 'flex-col');
        }
        document.querySelectorAll('#sidebar-nav a').forEach(link => {
            link.classList.remove('bg-slate-900', 'font-semibold');
            if (link.getAttribute('href') === `#${pageId.replace('-page', '')}`) {
                link.classList.add('bg-slate-900', 'font-semibold');
            }
        });
        if (pageId === 'dashboard-page') {
            updateDashboard();
        }
        if (pageId === 'utilizadores-page') {
            loadUsers();
        }
    }
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        let bgColor, textColor, icon;
        switch (type) {
            case 'success': bgColor = 'bg-green-500'; textColor = 'text-white'; icon = '✓'; break;
            case 'error': bgColor = 'bg-red-500'; textColor = 'text-white'; icon = '✖'; break;
            case 'warning': bgColor = 'bg-yellow-400'; textColor = 'text-black'; icon = '!' ; break;
            default: bgColor = 'bg-blue-500'; textColor = 'text-white'; icon = 'ℹ'; break;
        }
        toast.className = `p-4 rounded-lg shadow-lg flex items-center gap-3 ${bgColor} ${textColor} transform translate-x-full opacity-0 transition-all duration-300 ease-out`;
        toast.innerHTML = `<span class="font-bold text-lg">${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.remove('translate-x-full', 'opacity-0'); }, 10);
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => { toast.remove(); }, 300);
        }, 3000);
    }
    function getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return (name[0]).toUpperCase();
    }
    function getStatusInfo(status) {
        switch (status) {
            case 'pending': return { text: 'Pendente', classes: 'status-badge status-pending', color: '#F59E0B' };
            case 'inprogress': return { text: 'Em Andamento', classes: 'status-badge status-inprogress', color: '#3B82F6' };
            case 'completed': return { text: 'Concluída', classes: 'status-badge status-completed', color: '#10B981' };
            default: return { text: 'N/A', classes: 'status-badge', color: '#6B7280' };
        }
    }
    function formatarData(dateString) {
        if (!dateString) return 'N/A';
        try {
            const parts = dateString.split('-');
            if (parts.length !== 3) return dateString;
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        } catch (e) { return dateString; }
    }
    function getFaixaEtaria(dob) {
        if (!dob) return 'N/A';
        try {
            const birthDate = new Date(dob);
            if (isNaN(birthDate.getTime())) return 'N/A';
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
            if (age <= 17) return '0-17';
            if (age <= 25) return '18-25';
            if (age <= 35) return '26-35';
            if (age <= 50) return '36-50';
            if (age <= 65) return '51-65';
            if (age >= 66) return '66+';
            return 'N/A';
        } catch (e) { return 'N/A'; }
    }
});
