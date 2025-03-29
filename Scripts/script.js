// Variáveis globais
let processos = [];
let coordenadorAtual = null;

// Elementos DOM
const numProcessosInput = document.getElementById('numProcessos');
const btnConfigurar = document.getElementById('btnConfigurar');
const idInputsSection = document.getElementById('idInputs');
const inputsContainer = document.getElementById('inputsContainer');
const btnIniciar = document.getElementById('btnIniciar');
const sistemaSection = document.getElementById('sistemaSection');
const processosContainer = document.getElementById('processosContainer');
const btnFalha = document.getElementById('btnFalha');
const mensagensDiv = document.getElementById('mensagens');

// Event Listeners
btnConfigurar.addEventListener('click', configurarSistema);
btnIniciar.addEventListener('click', iniciarSistema);
btnFalha.addEventListener('click', simularFalha);

// Funções
function configurarSistema() {
    const numProcessos = parseInt(numProcessosInput.value);
    
    if (numProcessos < 1) {
        alert('O número de processos deve ser pelo menos 1');
        return;
    }
    
    // Limpar inputs anteriores
    inputsContainer.innerHTML = '';
    
    // Criar inputs para IDs
    for (let i = 0; i < numProcessos; i++) {
        const div = document.createElement('div');
        div.className = 'id-input';
        div.innerHTML = `
            <label for="idProcesso${i}">Processo ${i + 1}:</label>
            <input type="number" id="idProcesso${i}" required>
        `;
        inputsContainer.appendChild(div);
    }
    
    idInputsSection.classList.remove('hidden');
}

function iniciarSistema() {
    const numProcessos = parseInt(numProcessosInput.value);
    processos = [];
    
    // Coletar IDs
    const ids = new Set();
    for (let i = 0; i < numProcessos; i++) {
        const id = parseInt(document.getElementById(`idProcesso${i}`).value);
        
        if (isNaN(id)) {
            alert(`Por favor, insira um ID válido para o processo ${i + 1}`);
            return;
        }
        
        if (ids.has(id)) {
            alert(`IDs devem ser únicos. O ID ${id} está duplicado.`);
            return;
        }
        
        ids.add(id);
        processos.push({ id, estado: 'ESPERA' });
    }
    
    // Encontrar coordenador inicial (maior ID)
    const maiorId = Math.max(...ids);
    coordenadorAtual = maiorId;
    processos.find(p => p.id === maiorId).estado = 'PRINCIPAL';
    
    // Atualizar interface
    atualizarProcessosView();
    idInputsSection.classList.add('hidden');
    sistemaSection.classList.remove('hidden');
    btnFalha.disabled = false;
    
    adicionarMensagem(`Sistema iniciado com ${numProcessos} processos.`, 'info');
    adicionarMensagem(`Processo ${coordenadorAtual} é o coordenador inicial.`, 'info');
}

function atualizarProcessosView() {
    processosContainer.innerHTML = '';
    
    processos.forEach(processo => {
        const div = document.createElement('div');
        div.className = `process-box ${processo.estado.toLowerCase()}`;
        div.innerHTML = `
            <div>ID: ${processo.id}</div>
            <div>${processo.estado}</div>
        `;
        processosContainer.appendChild(div);
    });
}

function simularFalha() {
    if (processos.filter(p => p.estado !== 'CAIDO').length <= 1) {
        adicionarMensagem('Não é possível simular mais falhas - apenas um processo ativo restante.', 'erro');
        btnFalha.disabled = true;
        return;
    }
    
    // Encontrar coordenador atual e simular falha
    const coordenador = processos.find(p => p.estado === 'PRINCIPAL');
    if (!coordenador) {
        adicionarMensagem('Não há coordenador ativo no momento.', 'erro');
        return;
    }
    
    coordenador.estado = 'CAIDO';
    adicionarMensagem(`Processo ${coordenador.id} (coordenador) falhou!`, 'erro');
    
    // Iniciar eleição
    iniciarEleicao();
    
    // Atualizar view
    atualizarProcessosView();
    
    // Verificar se ainda é possível simular falhas
    if (processos.filter(p => p.estado !== 'CAIDO').length <= 1) {
        btnFalha.disabled = true;
    }
}

function iniciarEleicao() {
    // Encontrar processos ativos (não caídos)
    const processosAtivos = processos.filter(p => p.estado !== 'CAIDO');
    
    if (processosAtivos.length === 0) {
        adicionarMensagem('Todos os processos estão caídos!', 'erro');
        return;
    }
    
    // Escolher um processo aleatório para iniciar a eleição
    const iniciador = processosAtivos[Math.floor(Math.random() * processosAtivos.length)];
    adicionarMensagem(`Processo ${iniciador.id} está iniciando uma eleição...`, 'eleicao');
    
    // Encontrar processos com ID maior que o iniciador
    const processosMaiores = processosAtivos.filter(p => p.id > iniciador.id);
    
    if (processosMaiores.length === 0) {
        // Nenhum processo maior encontrado - iniciador vira coordenador
        processos.forEach(p => {
            if (p.estado === 'PRINCIPAL') p.estado = 'ESPERA';
        });
        
        iniciador.estado = 'PRINCIPAL';
        coordenadorAtual = iniciador.id;
        adicionarMensagem(`Nenhum processo maior encontrado. Processo ${iniciador.id} se torna o novo coordenador.`, 'info');
    } else {
        // Enviar mensagens para processos maiores
        processosMaiores.forEach(processo => {
            adicionarMensagem(`${iniciador.id} → ELEIÇÃO → ${processo.id}`, 'eleicao');
            
            if (processo.estado === 'ESPERA') {
                adicionarMensagem(`${iniciador.id} ← OK ← ${processo.id}`, 'resposta');
                
                // Processo maior respondeu - ele deve iniciar sua própria eleição
                iniciarEleicaoPorProcesso(processo);
            }
        });
    }
}

function iniciarEleicaoPorProcesso(processo) {
    adicionarMensagem(`Processo ${processo.id} está iniciando sua própria eleição...`, 'eleicao');
    
    // Encontrar processos com ID maior que este processo
    const processosAtivos = processos.filter(p => p.estado !== 'CAIDO');
    const processosMaiores = processosAtivos.filter(p => p.id > processo.id);
    
    if (processosMaiores.length === 0) {
        // Nenhum processo maior encontrado - este processo vira coordenador
        processos.forEach(p => {
            if (p.estado === 'PRINCIPAL') p.estado = 'ESPERA';
        });
        
        processo.estado = 'PRINCIPAL';
        coordenadorAtual = processo.id;
        adicionarMensagem(`Nenhum processo maior encontrado. Processo ${processo.id} se torna o novo coordenador.`, 'info');
    } else {
        // Enviar mensagens para processos maiores
        processosMaiores.forEach(p => {
            adicionarMensagem(`${processo.id} → ELEIÇÃO → ${p.id}`, 'eleicao');
            
            if (p.estado === 'ESPERA') {
                adicionarMensagem(`${processo.id} ← OK ← ${p.id}`, 'resposta');
                
                // Processo maior respondeu - ele deve iniciar sua própria eleição
                iniciarEleicaoPorProcesso(p);
            }
        });
    }
}

function adicionarMensagem(texto, tipo) {
    const p = document.createElement('p');
    p.textContent = texto;
    p.className = `mensagem-${tipo}`;
    mensagensDiv.appendChild(p);
    mensagensDiv.scrollTop = mensagensDiv.scrollHeight;
}