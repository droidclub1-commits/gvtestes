import { showToast, getInitials, getStatusInfo, formatarData, getFaixaEtaria } from './js/utils.js';
import { SUPABASE_URL, SUPABASE_KEY, EDGE_FUNCTION_URL, sb } from './js/config.js';
import { backupData, renderBackupHistory } from './js/backup.js';
import { generateExcelReport, exportCoberturaExcel } from './js/reports.js';
import {
    initCidadaos, getCidadaosServerSearchState, getTotalCidadaosCount,
    loadBairrosDistintos, loadCidadaosPage, handleCidadaoFormSubmit,
    renderCidadaos, renderMoreCidadaos,
    updateBairroFilter, clearCidadaoFilters,
    openCidadaoModal, closeCidadaoModal, updateChildrenInputs,
    handleCEPBlur, openDetailsModal, closeDetailsModal,
    setupLeaderAutocomplete
} from './js/cidadaos.js';
import {
    initDemandas,
    handleDemandaFormSubmit, openDemandaDetailsModal,
    handleAddNoteSubmit, loadDemandasPage, clearDemandaFilters,
    openDemandaModal, closeDemandaModal, closeDemandaDetailsModal
} from './js/demandas.js';

import { state } from './js/state.js';
// state.userRole carregado após login ('admin' ou 'cadastrador')
let allUsers = []; // lista de utilizadores (só admin)
// Paginação server-side de cidadãos e demandas — encapsuladas em
// js/cidadaos.js e js/demandas.js respetivamente
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
    cidadaoZona, cidadaoSecao,
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
            state.user = session.user;
            loginPage.classList.add('hidden');
            appContainer.style.display = 'flex';
            if (!appInitialized && !_initLock) {
                _initLock = true;
                initializeMainApp().finally(() => { _initLock = false; });
            }
        } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
            state.user = null;
            state.userRole = null;
            state.allCidadaos = []; state.allDemandas = []; state.allLeaders = [];
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
            state.user = session.user;
            loginPage.classList.add('hidden');
            appContainer.style.display = 'flex';
            if (!appInitialized && !_initLock) {
                _initLock = true;
                try { await initializeMainApp(); }
                finally { _initLock = false; }
            }
        } else {
            state.user = null;
            loginPage.classList.remove('hidden');
            appContainer.style.display = 'none';
        }
    }
    manageSessionOnLoad();
    async function initializeMainApp() {
        if (appInitialized) return;
        state.allCidadaos = []; state.allDemandas = []; state.allLeaders = []; allUsers = [];
        state.userRole = null;
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
        // Injeta em cidadaos.js os comportamentos que dependem de outros módulos/app.js,
        // evitando import circular (app.js já importa de cidadaos.js).
        initCidadaos({
            onOpenDemanda: (cidadaoId) => openDemandaModal(cidadaoId),
            onRequestDelete: (id, type) => requestDelete(id, type),
            onLeadersChanged: () => updateLeaderSelects(),
            onOpenMap: (cidadaosToPlot) => openMapModal(cidadaosToPlot)
        });
        initDemandas({
            onRequestDelete: (id, type) => requestDelete(id, type),
            onDashboardChanged: () => updateDashboard()
        });
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
        if (excelReportBtn) excelReportBtn.addEventListener('click', () => generateExcelReport(getCidadaosServerSearchState()));
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
        document.getElementById('cobertura-excel-btn')?.addEventListener('click', () => exportCoberturaExcel(coberturaData));
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
    // ── Paginação de demandas: agora encapsulada em js/demandas.js ────────

    async function loadInitialData() {
        if (!state.user) return;
        try {
            // ── 1. Perfil primeiro — define state.userRole antes de tudo ───────
            const { data: profileData, error: profileError } = await sb
                .from('profiles')
                .select('role')
                .eq('id', state.user.id)
                .single();
            if (profileError || !profileData) {
                await sb.auth.signOut();
                showToast('Acesso negado. O seu utilizador não tem perfil atribuído.', 'error');
                throw new Error('Perfil não encontrado.');
            }
            state.userRole = profileData.role;
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
            state.allLeaders = leadersRes.data;

            updateLeaderSelects();
            updateBairroFilter();
            await loadDemandasPage(true);

            // ── 3. Cidadãos + dashboard + utilizadores em paralelo ───────
            await Promise.all([
                loadCidadaosPage(true),
                updateDashboard(),
                state.userRole === 'admin' ? loadUsers() : Promise.resolve()
            ]);

            return true;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    // ── Ajusta interface conforme o perfil do utilizador ────────────────
    function applyRoleUI() {
        if (state.userRole === 'cadastrador') {
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
            // Botão delete nos cards é ocultado em buildCidadaoCard via state.userRole
        }
    }

    async function handleDeleteConfirmation() {
        const { id, type } = itemToDelete;
        if (!id || !type || !state.user) return;
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
                 // Apaga as notas vinculadas primeiro — evita erro de FK constraint
                 // caso a coluna notes.demanda_id não tenha ON DELETE CASCADE no banco.
                 const { error: notesError } = await sb
                    .from('notes')
                    .delete()
                    .eq('demanda_id', id);
                 if (notesError) throw notesError;
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
                state.allCidadaos = state.allCidadaos.filter(c => c.id !== id);
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
    // Constrói um card de demanda e retorna o elemento
    function updateLeaderSelects() {
        // Filtro, demanda e cobertura — selects normais, ordenados alfabeticamente
        setupCoberturaLiderAutocomplete();
        const selects = [filterLeader, demandaFilterLeader];
        selects.forEach(select => {
            if (!select) return;
            const currentValue = select.value;
            select.innerHTML = '<option value="">Filtrar por Liderança</option>';
            [...state.allLeaders].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).forEach(l => {
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

    function setupCoberturaLiderAutocomplete() {
        const searchInput = document.getElementById('cobertura-lider-search');
        const dropdown    = document.getElementById('cobertura-lider-dropdown');
        const hiddenInput = document.getElementById('cobertura-filter-lider');
        if (!searchInput || !dropdown || !hiddenInput) return;
        if (searchInput._autocompleteReady) return;
        searchInput._autocompleteReady = true;

        const sorted = [...state.allLeaders].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

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

    async function updateDashboard() {
        const totalEl = document.getElementById('dashboard-total-cidadaos');
        // As duas contagens (cidadãos/demandas) em paralelo — nenhuma depende da outra
        await Promise.all([
            (async () => {
                // Admin vê totais globais; cadastrador vê só os seus (RLS já filtra automaticamente)
                if (state.userRole === 'admin' && getTotalCidadaosCount() > 0) {
                    totalEl.textContent = getTotalCidadaosCount();
                } else {
                    const { count } = await sb.from('cidadaos').select('*', { count: 'exact', head: true });
                    totalEl.textContent = count || 0;
                }
            })(),
            (async () => {
                // Contador de demandas — busca do servidor para reflectir total real
                try {
                    const { count: cntDemandas } = await sb
                        .from('demandas').select('*', { count: 'exact', head: true });
                    document.getElementById('dashboard-total-demandas').textContent = cntDemandas || 0;
                } catch(e) { /* mantém o valor anterior */ }
            })()
        ]);
        // Gráficos e widgets em paralelo — não dependem uns dos outros
        updateDemandasRecentes();
        updateCidadaosPorTipoChart();
        updateDemandasPorStatusChart(); // async — não bloqueia
        await Promise.all([
            updateAniversariantes(),
            updateCidadaosPorBairroChart(),
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
        const recentes = state.allDemandas.slice(0, 5);
        listEl.innerHTML = '';
        if (recentes.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-gray-500">Nenhuma demanda recente.</p>';
            return;
        }
        recentes.forEach(d => {
            const nomeSolicitante = d.cidadao ? d.cidadao.name : (state.allCidadaos.find(c => c.id === d.cidadao_id)?.name || 'Desconhecido');
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
    function requestDelete(itemId, type) {
        itemToDelete = { id: itemId, type: type };
        const modal = document.getElementById('confirmation-modal');
        const title = document.getElementById('confirmation-title');
        const message = document.getElementById('confirmation-message');
        if (type === 'cidadao') {
            const cidadao = state.allCidadaos.find(c => c.id === itemId);
            title.textContent = 'Excluir Cidadão';
            message.textContent = `Tem a certeza que quer excluir "${cidadao.name}"?`;
        } else if (type === 'demanda') {
            const demanda = state.allDemandas.find(d => d.id === itemId);
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
        const s = getCidadaosServerSearchState();
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
            const isCurrentUser = u.id === state.user.id;
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

                const liderNome = state.allLeaders.find(l => l.id === liderId)?.name || 'Liderança';
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

    // ═══════════════════════════════════════════════════════════════
    // BACKUP DE DADOS
    // ═══════════════════════════════════════════════════════════════
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
});
