/**
 * Classe que representa um nó/processo no sistema distribuído
 * Cada nó tem um ID único e pode ser coordenador (líder) ou não
 */
class Processo {
    constructor(id, isLeader = false) {
        this.id = id;
        this.isLeader = isLeader;       // Indica se este nó é o coordenador
        this.isActive = true;          // Indica se o nó está ativo ou falho
        this.coordinator = null;        // Referência ao nó coordenador
        this.electionInProgress = false;// Flag para evitar múltiplas eleições simultâneas
        this.position = { x: 0, y: 0 }; // Posição na visualização gráfica
    }
    
    /**
     * Inicia uma eleição Bully
     * @param {Array<Processo>} processos - Lista de todos os processos no sistema
     */
    iniciarEleicao(processos) {
        if (!this.isActive) return;
        
        this.electionInProgress = true;
        registrarEvento(`Nó P${this.id} iniciou uma eleição`, 'warning');
        
        // Encontra todos os processos com ID maior que o atual
        const processosSuperiores = processos.filter(p => p.id > this.id && p.isActive);
        
        if (processosSuperiores.length === 0) {
            // Se não há processos superiores, este nó se torna o líder
            this.tornarSeLider(processos);
        } else {
            let respostaRecebida = false;
            
            // Envia mensagem de ELEIÇÃO para todos os processos superiores
            processosSuperiores.forEach(processo => {
                animarMensagem(this, processo, "ELEIÇÃO", () => {
                    // Quando o processo superior recebe a mensagem
                    if (processo.receberEleicao(this)) {
                        respostaRecebida = true;
                        // Responde com OK se assumir a eleição
                        animarMensagem(processo, this, "OK");
                    }
                    
                    // Se foi o último processo e não recebeu resposta, assume liderança
                    if (processo === processosSuperiores[processosSuperiores.length - 1] && !respostaRecebida) {
                        this.tornarSeLider(processos);
                    }
                });
            });
        }
    }
    
    /**
     * Processa uma mensagem de eleição recebida
     * @param {Processo} sender - Nó que enviou a mensagem de eleição
     * @returns {boolean} - True se respondeu à eleição (quando tem ID maior)
     */
    receberEleicao(sender) {
        if (!this.isActive) return false;
        
        // Se este nó tem ID maior que o remetente, responde iniciando sua própria eleição
        if (this.id > sender.id) {
            registrarEvento(`Nó P${this.id} respondeu à eleição de P${sender.id} iniciando nova eleição`, 'info');
            this.iniciarEleicao(processos);
            return true;
        }
        return false;
    }
    
    /**
     * Torna este nó o líder do sistema e notifica todos os outros nós
     * @param {Array<Processo>} processos - Lista de todos os processos
     */
    tornarSeLider(processos) {
        this.isLeader = true;
        this.electionInProgress = false;
        
        // Atualiza todos os processos com o novo líder
        processos.forEach(p => {
            p.coordinator = this;
            p.isLeader = (p === this);
        });
        
        registrarEvento(`Nó P${this.id} foi eleito como novo coordenador!`, 'success');
        atualizarEstatisticas();
        atualizarVisualizacao();
    }
    
    /**
     * Simula a falha deste nó
     */
    falhar() {
        if (this.isActive) {
            const eraLider = this.isLeader;
            this.isActive = false;
            this.isLeader = false;
            registrarEvento(`Nó P${this.id} falhou!`, 'error');
            atualizarEstatisticas();
            atualizarVisualizacao();
            
            // Se o nó que falhou era o líder, inicia uma nova eleição
            if (eraLider) {
                setTimeout(() => {
                    const processosAtivos = processos.filter(p => p.isActive);
                    if (processosAtivos.length > 0) {
                        // QUALQUER nó ativo pode iniciar a eleição (diferente do Bully tradicional)
                        const iniciador = processosAtivos[Math.floor(Math.random() * processosAtivos.length)];
                        registrarEvento(`Nó P${iniciador.id} detectou falha do coordenador e iniciou eleição`, 'warning');
                        iniciador.iniciarEleicao(processos);
                    }
                }, 800);
            }
        }
    }
    
    /**
     * Recupera um nó que estava falho
     */
    recuperar() {
        if (!this.isActive) {
            this.isActive = true;
            this.isLeader = false;
            registrarEvento(`Nó P${this.id} foi recuperado!`, 'success');
            atualizarEstatisticas();
            atualizarVisualizacao();
        }
    }
}

// Variáveis globais
let processos = [];                    // Lista de todos os processos no sistema
let intervaloSimulacao;                // Referência para o intervalo de simulação automática
const networkView = document.getElementById('networkView'); // Elemento da visualização da rede
const logPanel = document.getElementById('logPanel');       // Painel de logs
const processCountInput = document.getElementById('processCount'); // Input do número de nós
const initialLeaderSelect = document.getElementById('initialLeader'); // Select do líder inicial
const controlPanel = document.getElementById('controlPanel'); // Painel de controle

// Elementos de estatísticas
const activeNodesEl = document.getElementById('activeNodes');
const failedNodesEl = document.getElementById('failedNodes');
const currentLeaderEl = document.getElementById('currentLeader');

/**
 * Inicia uma eleição quando o coordenador atual falha
 * Diferente do Bully tradicional, QUALQUER nó pode iniciar a eleição
 */
function iniciarEleicaoAposFalha() {
    const processosAtivos = processos.filter(p => p.isActive);
    if (processosAtivos.length > 0) {
        // Seleciona aleatoriamente um nó ativo para iniciar a eleição
        const iniciador = processosAtivos[Math.floor(Math.random() * processosAtivos.length)];
        registrarEvento(`Nó P${iniciador.id} detectou falha do coordenador e iniciou eleição`, 'warning');
        
        // Pequeno delay para melhor visualização
        setTimeout(() => {
            iniciador.iniciarEleicao(processos);
        }, 500);
    } else {
        registrarEvento("Todos os nós estão falhos! Não há coordenador.", 'error');
    }
}

/**
 * Inicializa o sistema com os parâmetros configurados
 */
function inicializar() {
    const numProcessos = parseInt(processCountInput.value);
    const idLiderInicial = parseInt(initialLeaderSelect.value);
    
    // Validação básica
    if (numProcessos < 3 || numProcessos > 10) {
        alert("O número de nós deve ser entre 3 e 10 para uma simulação eficaz");
        return;
    }
    
    // Limpa processos existentes e a visualização
    processos = [];
    networkView.innerHTML = '';
    logPanel.innerHTML = '';
    
    // Cria novos processos
    for (let i = 1; i <= numProcessos; i++) {
        processos.push(new Processo(i, i === idLiderInicial));
    }
    
    // Posiciona os processos na visualização
    posicionarProcessos();
    atualizarVisualizacao();
    atualizarEstatisticas();
    
    // Mostra o painel de controle
    controlPanel.style.display = 'flex';
    
    registrarEvento(`Rede inicializada com ${numProcessos} nós. P${idLiderInicial} é o coordenador inicial.`, 'info');
}

/**
 * Atualiza as opções de líder inicial no select
 */
function atualizarOpcoesLider() {
    const numProcessos = parseInt(processCountInput.value);
    initialLeaderSelect.innerHTML = '';
    
    for (let i = 1; i <= numProcessos; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Nó P${i}`;
        initialLeaderSelect.appendChild(option);
    }
    
    // Define o maior ID como padrão (comum no Bully tradicional)
    initialLeaderSelect.value = numProcessos;
}

/**
 * Posiciona os processos em um círculo na visualização
 */
function posicionarProcessos() {
    const centroX = networkView.offsetWidth / 2;
    const centroY = networkView.offsetHeight / 2;
    const raio = Math.min(centroX, centroY) * 0.7;
    
    // Remove conexões antigas
    const conexoesAntigas = document.querySelectorAll('.connection');
    conexoesAntigas.forEach(conn => conn.remove());
    
    // Posiciona cada processo em um círculo
    processos.forEach((processo, indice) => {
        const angulo = (indice * (2 * Math.PI / processos.length)) - Math.PI/2;
        processo.position = {
            x: centroX + raio * Math.cos(angulo) - 35,
            y: centroY + raio * Math.sin(angulo) - 35
        };
    });
    
    // Cria conexões entre todos os nós
    for (let i = 0; i < processos.length; i++) {
        for (let j = i + 1; j < processos.length; j++) {
            criarConexao(processos[i], processos[j]);
        }
    }
}

/**
 * Cria uma conexão visual entre dois nós
 * @param {Processo} node1 - Primeiro nó
 * @param {Processo} node2 - Segundo nó
 */
function criarConexao(node1, node2) {
    const x1 = node1.position.x + 35;
    const y1 = node1.position.y + 35;
    const x2 = node2.position.x + 35;
    const y2 = node2.position.y + 35;
    
    const comprimento = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const angulo = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    
    const conexao = document.createElement('div');
    conexao.className = 'connection';
    conexao.style.width = `${comprimento}px`;
    conexao.style.left = `${x1}px`;
    conexao.style.top = `${y1}px`;
    conexao.style.transform = `rotate(${angulo}deg)`;
    
    networkView.appendChild(conexao);
}

/**
 * Atualiza a visualização dos nós na tela
 */
function atualizarVisualizacao() {
    // Remove apenas os nós (mantém as conexões)
    const nosAntigos = document.querySelectorAll('.node');
    nosAntigos.forEach(node => node.remove());
    
    // Cria elementos visuais para cada processo
    processos.forEach(processo => {
        const elementoNo = document.createElement('div');
        elementoNo.className = 'node';
        elementoNo.classList.add(processo.isActive ? 
            (processo.isLeader ? 'leader' : 'active') : 'failed');
        elementoNo.style.left = `${processo.position.x}px`;
        elementoNo.style.top = `${processo.position.y}px`;
        elementoNo.innerHTML = `
            <div class="node-id">P${processo.id}</div>
            <div class="node-status">${processo.isLeader ? 'Coordenador' : processo.isActive ? 'Ativo' : 'Falho'}</div>
        `;
        networkView.appendChild(elementoNo);
    });
}

/**
 * Atualiza as estatísticas mostradas no painel
 */
function atualizarEstatisticas() {
    const numAtivos = processos.filter(p => p.isActive).length;
    const numFalhos = processos.length - numAtivos;
    const lider = processos.find(p => p.isLeader && p.isActive);
    
    activeNodesEl.textContent = numAtivos;
    failedNodesEl.textContent = numFalhos;
    currentLeaderEl.textContent = lider ? `P${lider.id}` : 'Nenhum';
}

/**
 * Anima a troca de mensagens entre nós
 * @param {Processo} from - Nó remetente
 * @param {Processo} to - Nó destinatário
 * @param {string} text - Texto da mensagem
 * @param {function} callback - Função chamada quando a animação termina
 */
function animarMensagem(from, to, text, callback) {
    const xInicio = from.position.x + 35;
    const yInicio = from.position.y + 35;
    const xFim = to.position.x + 35;
    const yFim = to.position.y + 35;
    
    // Cria elemento da mensagem (ponto que se move)
    const mensagem = document.createElement('div');
    mensagem.className = 'message';
    mensagem.style.left = `${xInicio}px`;
    mensagem.style.top = `${yInicio}px`;
    networkView.appendChild(mensagem);
    
    // Cria rótulo da mensagem (texto)
    const rotuloMensagem = document.createElement('div');
    rotuloMensagem.className = 'message-label';
    rotuloMensagem.textContent = text;
    rotuloMensagem.style.left = `${xInicio}px`;
    rotuloMensagem.style.top = `${yInicio}px`;
    networkView.appendChild(rotuloMensagem);
    
    let progresso = 0;
    const duracao = 1000;
    const inicio = Date.now();
    
    /**
     * Função de animação que move a mensagem do remetente ao destinatário
     */
    function animar() {
        const decorrido = Date.now() - inicio;
        progresso = Math.min(decorrido / duracao, 1);
        
        // Calcula posição atual da mensagem
        const xAtual = xInicio + (xFim - xInicio) * progresso;
        const yAtual = yInicio + (yFim - yInicio) * progresso;
        
        // Atualiza posição dos elementos
        mensagem.style.left = `${xAtual}px`;
        mensagem.style.top = `${yAtual}px`;
        rotuloMensagem.style.left = `${xAtual}px`;
        rotuloMensagem.style.top = `${yAtual - 20}px`;
        
        if (progresso < 1) {
            requestAnimationFrame(animar);
        } else {
            // Remove elementos e chama callback quando a animação termina
            mensagem.remove();
            rotuloMensagem.remove();
            if (callback) callback();
        }
    }
    
    animar();
}

/**
 * Alterna a simulação automática (verifica periodicamente se o líder falhou)
 */
function alternarSimulacao() {
    const btn = document.getElementById('startBtn');
    
    if (intervaloSimulacao) {
        clearInterval(intervaloSimulacao);
        intervaloSimulacao = null;
        btn.textContent = 'Iniciar Simulação Automática';
        registrarEvento("Simulação automática parada", 'info');
    } else {
        intervaloSimulacao = setInterval(() => {
            // Verifica periodicamente se o coordenador atual está falho
            const lider = processos.find(p => p.isLeader);
            if (lider && !lider.isActive) {
                iniciarEleicaoAposFalha();
            }
        }, 3000);
        btn.textContent = 'Parar Simulação';
        registrarEvento("Simulação automática iniciada - verificando falhas do coordenador a cada 3 segundos", 'info');
    }
}

/**
 * Simula a falha do coordenador atual
 */
function falharCoordenador() {
    const lider = processos.find(p => p.isLeader);
    if (lider) {
        lider.falhar();
    }
}

/**
 * Simula a falha aleatória de um nó que não é o coordenador
 */
function falharNoAleatorio() {
    const nosAtivosNaoLideres = processos.filter(p => p.isActive && !p.isLeader);
    if (nosAtivosNaoLideres.length > 0) {
        const processoAleatorio = nosAtivosNaoLideres[Math.floor(Math.random() * nosAtivosNaoLideres.length)];
        processoAleatorio.falhar();
    }
}

/**
 * Recupera todos os nós que estão falhos
 */
function recuperarProcessos() {
    processos.forEach(p => {
        if (!p.isActive) {
            p.recuperar();
        }
    });
}

/**
 * Registra um evento no painel de logs
 * @param {string} mensagem - Texto do evento
 * @param {string} tipo - Tipo do evento (info, warning, error, success)
 */
function registrarEvento(mensagem, tipo = 'info') {
    const entradaLog = document.createElement('div');
    entradaLog.className = 'log-entry';
    
    const icone = document.createElement('div');
    icone.className = `log-icon ${tipo}`;
    
    // Define ícone baseado no tipo
    switch(tipo) {
        case 'warning': icone.textContent = '!'; break;
        case 'error': icone.textContent = '×'; break;
        case 'success': icone.textContent = '✓'; break;
        default: icone.textContent = 'i';
    }
    
    const tempo = document.createElement('div');
    tempo.className = 'log-time';
    tempo.textContent = new Date().toLocaleTimeString();
    
    const msg = document.createElement('div');
    msg.className = 'log-message';
    msg.textContent = mensagem;
    
    entradaLog.appendChild(icone);
    entradaLog.appendChild(tempo);
    entradaLog.appendChild(msg);
    
    logPanel.appendChild(entradaLog);
    // Mantém o scroll no final do painel de logs
    logPanel.scrollTop = logPanel.scrollHeight;
}

// Event Listeners
document.getElementById('initBtn').addEventListener('click', inicializar);
document.getElementById('startBtn').addEventListener('click', alternarSimulacao);
document.getElementById('failLeaderBtn').addEventListener('click', falharCoordenador);
document.getElementById('failRandomBtn').addEventListener('click', falharNoAleatorio);
document.getElementById('recoverBtn').addEventListener('click', recuperarProcessos);

// Atualiza as opções de líder quando o número de nós muda
processCountInput.addEventListener('change', atualizarOpcoesLider);

// Inicializa as opções de líder
atualizarOpcoesLider();

// Redimensiona os processos quando a janela muda de tamanho
window.addEventListener('resize', () => {
    if (processos.length > 0) {
        posicionarProcessos();
        atualizarVisualizacao();
    }
});