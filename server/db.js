const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'crm_store.json');

// CATÁLOGO OFICIAL DE ROTINAS E TÉCNICAS OPERACIONAIS DO DOC ON-LINE
const DOC_ONLINE_CATALOG = [
  {
    id: 'tmpl-indicacao',
    category: 'Indicação de Condutor',
    title: 'Verificação de multas pendentes de indicação dentro do prazo legal',
    frequency: 'Semanal',
    technique: 'Identificar infrações autuadas que geram pontos, emitir formulário oficial de indicação e notificar o motorista para colher assinatura antes do vencimento do prazo legal no Detran.',
    checklist: [
      { id: 1, text: 'Consultar infrações autuadas que geram pontos na CNH', done: false },
      { id: 2, text: 'Gerar formulário de indicação do condutor', done: false },
      { id: 3, text: 'Colher assinatura do condutor e protocolar no órgão', done: false }
    ]
  },
  {
    id: 'tmpl-multas',
    category: 'Multas',
    title: 'Acompanhamento de captura periódica de multas nos órgãos',
    frequency: 'Semanal',
    technique: 'Varredura periódica no Detran, Renainf e prefeituras; levantar débitos com desconto de 20% pelo SNE e emitir comunicado com guia para o financeiro aprovar.',
    checklist: [
      { id: 1, text: 'Consultar autuações no Detran e órgãos municipais', done: false },
      { id: 2, text: 'Emitir guias com desconto de 20% via SNE', done: false },
      { id: 3, text: 'Enviar comunicado ao financeiro do cliente com prazo', done: false }
    ]
  },
  {
    id: 'tmpl-licenc-venc',
    category: 'Licenciamento',
    title: 'Verificação de vencimento de licenciamento por veículo',
    frequency: 'Mensal',
    technique: 'Conferir calendário oficial do Detran pelo final da placa e antecipar pagamento das taxas para evitar apreensão e multas gravíssimas na frota.',
    checklist: [
      { id: 1, text: 'Filtrar veículos com vencimento no mês corrente', done: false },
      { id: 2, text: 'Verificar taxa de licenciamento e débitos vinculados', done: false },
      { id: 3, text: 'Gerar DAE e enviar para aprovação', done: false }
    ]
  },
  {
    id: 'tmpl-licenc-pend',
    category: 'Licenciamento',
    title: 'Verificação de pendências que impedem o licenciamento',
    frequency: 'Mensal',
    technique: 'Checagem rigorosa de multas em cobrança, parcelamentos rompidos ou IPVA pendente que bloqueiam a emissão do CRLV digital.',
    checklist: [
      { id: 1, text: 'Consultar bloqueios administrativos e judiciais', done: false },
      { id: 2, text: 'Verificar quitação de IPVA e multas exigíveis', done: false },
      { id: 3, text: 'Sanar pendências junto à Secretaria da Fazenda', done: false }
    ]
  },
  {
    id: 'tmpl-licenc-crlv',
    category: 'Licenciamento',
    title: 'Emissão e armazenamento do comprovante de licenciamento',
    frequency: 'Mensal',
    technique: 'Baixar o CRLV-e atualizado no portal do Detran/Senatran e disponibilizar na pasta do cliente e app dos motoristas.',
    checklist: [
      { id: 1, text: 'Consultar compensação bancária da taxa de licenciamento', done: false },
      { id: 2, text: 'Emitir CRLV-e atualizado (PDF/QR Code)', done: false },
      { id: 3, text: 'Armazenar no sistema e notificar o gestor da frota', done: false }
    ]
  },
  {
    id: 'tmpl-cnh-docs',
    category: 'CNH',
    title: 'Solicitação de documentos (CNH e CRLVs para cadastro/atualização)',
    frequency: 'Por manutenção',
    technique: 'Cobrança ativa de CNH de novos motoristas admitidos ou CRLVs de veículos recém-adquiridos para manter o sistema em dia.',
    checklist: [
      { id: 1, text: 'Solicitar via e-mail e WhatsApp documentação atualizada', done: false },
      { id: 2, text: 'Validar autenticidade e validade dos documentos', done: false },
      { id: 3, text: 'Cadastrar motorista/veículo na base operacional', done: false }
    ]
  },
  {
    id: 'tmpl-cnh-pontos',
    category: 'CNH',
    title: 'Verificação de pontuação de CNH por condutor',
    frequency: 'Mensal',
    technique: 'Monitorar prontuário de cada motorista para evitar suspensão da CNH (limite de 20/30/40 pontos).',
    checklist: [
      { id: 1, text: 'Consultar pontuação no Detran de registro de cada motorista', done: false },
      { id: 2, text: 'Emitir alerta para condutores acima de 15 pontos', done: false }
    ]
  },
  {
    id: 'tmpl-cnh-validade',
    category: 'CNH',
    title: 'Verificação de validade da CNH e exame toxicológico',
    frequency: 'Mensal',
    technique: 'Checar vencimento da habilitação e prazo do exame toxicológico periódico (categorias C, D, E) com 30 dias de antecedência.',
    checklist: [
      { id: 1, text: 'Levantar CNHs a vencer nos próximos 30 dias', done: false },
      { id: 2, text: 'Verificar status do exame toxicológico periódico', done: false },
      { id: 3, text: 'Orientar renovação prévia ao condutor', done: false }
    ]
  },
  {
    id: 'tmpl-cronotacografo',
    category: 'Cronotacógrafo',
    title: 'Verificação da validade de aferição dos tacógrafos',
    frequency: 'Mensal',
    technique: 'Consultar certificados metrológicos no Inmetro; garantir agendamento do ensaio antes do vencimento do selo/disco.',
    checklist: [
      { id: 1, text: 'Acessar portal cronotacografo.inmetro.gov.br', done: false },
      { id: 2, text: 'Identificar caminhões com certificado vencendo em 20 dias', done: false },
      { id: 3, text: 'Acionar posto credenciado e enviar guia de agendamento', done: false }
    ]
  },
  {
    id: 'tmpl-pagamentos',
    category: 'Pagamentos',
    title: 'Execução de pagamentos de multas e débitos aprovados',
    frequency: 'Diária',
    technique: 'Conferir código de barras, validar lote de guias aprovadas e pagar via internet banking/PIX dentro do horário bancário com 20% de desconto.',
    checklist: [
      { id: 1, text: 'Separar guias com vencimento no dia', done: false },
      { id: 2, text: 'Efetuar pagamento no banco e coletar autenticação', done: false },
      { id: 3, text: 'Anexar comprovantes e atualizar controle', done: false }
    ]
  },
  {
    id: 'tmpl-dash-recorrencia',
    category: 'Dashboard',
    title: 'Análise de recorrência (veículo, condutor, via, horário)',
    frequency: 'Mensal',
    technique: 'Cruzar dados de infrações para apontar gargalos operacionais e rotas com maior incidência de autuações.',
    checklist: [
      { id: 1, text: 'Gerar relatório de infrações por placa e motorista', done: false },
      { id: 2, text: 'Mapear vias e horários críticos para o gestor', done: false }
    ]
  },
  {
    id: 'tmpl-dash-fechamento',
    category: 'Dashboard',
    title: 'Fechamento e leitura do dashboard mensal da frota',
    frequency: 'Mensal',
    technique: 'Consolidar economia obtida com descontos SNE, pendências baixadas e índice de regularidade da frota.',
    checklist: [
      { id: 1, text: 'Calcular total economizado com desconto de 20%', done: false },
      { id: 2, text: 'Emitir relatório gerencial consolidado para o cliente', done: false }
    ]
  },
  {
    id: 'tmpl-dash-reuniao',
    category: 'Dashboard',
    title: 'Reunião de revisão mensal com gestor do cliente',
    frequency: 'Mensal',
    technique: 'Apresentar KPIs operacionais, condutores notificados e plano de ação preventiva para o próximo ciclo.',
    checklist: [
      { id: 1, text: 'Enviar pauta e relatório prévio ao gestor', done: false },
      { id: 2, text: 'Registrar ata e prazos de retorno acertados', done: false }
    ]
  },
  {
    id: 'tmpl-governanca',
    category: 'Governança',
    title: 'Revisão dos limites de alerta (antecedência, pontuação)',
    frequency: 'Trimestral',
    technique: 'Ajustar parâmetros de notificação de acordo com o perfil de risco e volume de frota de cada cliente.',
    checklist: [
      { id: 1, text: 'Revisar faixas de tolerância de dias de antecedência', done: false },
      { id: 2, text: 'Atualizar configurações de avisos automáticos', done: false }
    ]
  }
];

const INITIAL_DATA = {
  companies: [
    {
      id: 'comp-1',
      name: 'Transportadora Rápido Sol',
      cnpj: '34.567.890/0001-12',
      vehiclesCount: 42,
      fleetType: 'Caminhões e Cavalos Mecânicos',
      email: 'financeiro@rapidosol.com.br',
      routineSchedule: 'Toda 2ª às 08h'
    },
    {
      id: 'comp-2',
      name: 'Logística & Cargas Brasil',
      cnpj: '12.890.123/0001-45',
      vehiclesCount: 78,
      fleetType: 'Carretas e VUCs',
      email: 'operacao@logbrasil.com.br',
      routineSchedule: 'Todo dia 10'
    },
    {
      id: 'comp-3',
      name: 'Locadora Prime Motors',
      cnpj: '08.123.456/0001-99',
      vehiclesCount: 110,
      fleetType: 'Veículos Leves e Utilitários',
      email: 'frota@primemotors.com.br',
      routineSchedule: 'Quinzenal'
    }
  ],
  cards: [
    {
      id: 'card-1',
      companyId: 'comp-1',
      company: 'Transportadora Rápido Sol',
      category: 'Multas',
      title: 'Acompanhamento de captura periódica de multas nos órgãos',
      stage: 'Aguardando Retorno',
      routineFrequency: 'Semanal',
      responsible: 'Felipe Gabriel',
      returnDeadline: '14/09 às 17h',
      technique: 'Varredura no Detran/Renainf, emissão de guias SNE com 20% de desconto e cobrança de aprovação do cliente.',
      notes: 'Acompanhar e levantar novos débitos inclusos nas assinaturas para envio dos comunicados ou pagamento.',
      checklist: [
        { id: 1, text: 'Consultar autuações no Detran e órgãos municipais', done: true },
        { id: 2, text: 'Emitir guias com desconto de 20% via SNE', done: true },
        { id: 3, text: 'Enviar comunicado ao financeiro do cliente com prazo', done: true }
      ]
    },
    {
      id: 'card-2',
      companyId: 'comp-1',
      company: 'Transportadora Rápido Sol',
      category: 'Indicação de Condutor',
      title: 'Verificação de multas pendentes de indicação dentro do prazo legal',
      stage: 'Em Andamento',
      routineFrequency: 'Semanal',
      responsible: 'Felipe Gabriel',
      returnDeadline: '14/09/2026',
      technique: 'Identificar infrações autuadas que geram pontos e colher assinatura antes do prazo legal.',
      notes: '2 motoristas notificados para assinar o formulário antes de vencer.',
      checklist: [
        { id: 1, text: 'Consultar infrações autuadas que geram pontos na CNH', done: true },
        { id: 2, text: 'Gerar formulário de indicação do condutor', done: true },
        { id: 3, text: 'Colher assinatura do condutor e protocolar no órgão', done: false }
      ]
    },
    {
      id: 'card-3',
      companyId: 'comp-1',
      company: 'Transportadora Rápido Sol',
      category: 'CNH',
      title: 'Solicitação de documentos (CNH e CRLVs para cadastro ou atualização)',
      stage: 'Aguardando Retorno',
      routineFrequency: 'Por manutenção',
      responsible: 'Isabella Passos',
      returnDeadline: '14/09 às 17h',
      technique: 'Cobrança ativa de CNH de novos motoristas e CRLVs de veículos novos.',
      notes: 'Notificado via e-mail e WhatsApp. Aguardando envio dos documentos dos motoristas.',
      checklist: [
        { id: 1, text: 'Solicitar via e-mail e WhatsApp documentação atualizada', done: true },
        { id: 2, text: 'Validar autenticidade e validade dos documentos', done: false },
        { id: 3, text: 'Cadastrar motorista/veículo na base operacional', done: false }
      ]
    },
    {
      id: 'card-4',
      companyId: 'comp-1',
      company: 'Transportadora Rápido Sol',
      category: 'Licenciamento',
      title: 'Verificação de pendências que impedem o licenciamento (multas/IPVA)',
      stage: 'Finalizados',
      routineFrequency: 'Mensal',
      responsible: 'Felipe Gabriel',
      returnDeadline: '07/10/2026',
      technique: 'Checagem de taxas e quitação de débitos impeditivos.',
      notes: 'Todas as taxas e IPVA pagos. CRLV emitido com sucesso.',
      checklist: [
        { id: 1, text: 'Consultar bloqueios administrativos e judiciais', done: true },
        { id: 2, text: 'Verificar quitação de IPVA e multas exigíveis', done: true },
        { id: 3, text: 'Sanar pendências junto à Secretaria da Fazenda', done: true }
      ]
    },
    {
      id: 'card-5',
      companyId: 'comp-2',
      company: 'Logística & Cargas Brasil',
      category: 'Cronotacógrafo',
      title: 'Verificação da validade de aferição dos tacógrafos',
      stage: 'A Fazer',
      routineFrequency: 'Mensal',
      responsible: 'Isabella Passos',
      returnDeadline: '18/09/2026',
      technique: 'Consultar certificados metrológicos no Inmetro e antecipar agendamento do ensaio.',
      notes: 'Verificar certificados de ensaio metrológico dos caminhões.',
      checklist: [
        { id: 1, text: 'Acessar portal cronotacografo.inmetro.gov.br', done: false },
        { id: 2, text: 'Identificar caminhões com certificado vencendo em 20 dias', done: false },
        { id: 3, text: 'Acionar posto credenciado e enviar guia de agendamento', done: false }
      ]
    },
    {
      id: 'card-6',
      companyId: 'comp-2',
      company: 'Logística & Cargas Brasil',
      category: 'Pagamentos',
      title: 'Execução de pagamentos de multas e débitos aprovados',
      stage: 'Em Andamento',
      routineFrequency: 'Diária',
      responsible: 'Felipe Gabriel',
      returnDeadline: 'Hoje às 16h',
      technique: 'Validação de guias aprovadas e pagamento via banco com 20% de desconto.',
      notes: 'Lote de guias com vencimento hoje para aproveitar 20% de desconto.',
      checklist: [
        { id: 1, text: 'Separar guias com vencimento no dia', done: true },
        { id: 2, text: 'Efetuar pagamento no banco e coletar autenticação', done: false },
        { id: 3, text: 'Anexar comprovantes e atualizar controle', done: false }
      ]
    },
    {
      id: 'card-7',
      companyId: 'comp-2',
      company: 'Logística & Cargas Brasil',
      category: 'Indicação de Condutor',
      title: 'Verificação de multas pendentes de indicação dentro do prazo legal',
      stage: 'Aguardando Retorno',
      routineFrequency: 'Semanal',
      responsible: 'Isabella Passos',
      returnDeadline: '14/09 às 18h',
      technique: 'Envio de formulários aos motoristas em viagem e cobrança de foto assinada.',
      notes: 'Motoristas notificados aguardando retorno dos comprovantes assinados.',
      checklist: [
        { id: 1, text: 'Consultar infrações autuadas que geram pontos na CNH', done: true },
        { id: 2, text: 'Gerar formulário de indicação do condutor', done: true },
        { id: 3, text: 'Colher assinatura do condutor e protocolar no órgão', done: false }
      ]
    }
  ]
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
  }
}

function readDb() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return data;
  } catch (err) {
    console.error('Erro ao ler banco de dados, recriando inicial:', err.message);
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    return INITIAL_DATA;
  }
}

function writeDb(data) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function ensureMessagesArray(data) {
  if (!data.messages) {
    data.messages = [];
  }
}

// Retorna cards com nome da empresa garantido
function getEnrichedCards() {
  const db = readDb();
  const compMap = new Map(db.companies.map(c => [c.id, c.name]));
  const compNameMap = new Map(db.companies.map(c => [c.name, c.id]));

  return db.cards.map(c => {
    const companyName = c.company || compMap.get(c.companyId) || 'Empresa';
    const companyId = c.companyId || compNameMap.get(c.company) || 'comp-unknown';
    return {
      ...c,
      company: companyName,
      companyId: companyId
    };
  });
}

module.exports = {
  getCatalog: () => DOC_ONLINE_CATALOG,
  getCompanies: () => readDb().companies,
  getCards: () => getEnrichedCards(),
  
  // --- MENSAGENS E MEMÓRIA POR EMPRESA ---
  getCompanyMessages: (companyId) => {
    const db = readDb();
    ensureMessagesArray(db);
    return db.messages.filter(m => m.companyId === companyId);
  },

  saveMessage: (companyId, msgData) => {
    const db = readDb();
    ensureMessagesArray(db);
    const companyObj = db.companies.find(c => c.id === companyId || c.name === companyId);
    const resolvedCompanyId = companyObj ? companyObj.id : companyId;

    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      companyId: resolvedCompanyId,
      sender: msgData.sender || 'user',
      content: msgData.content || '',
      type: msgData.type || (msgData.fileData ? 'file' : 'text'),
      fileData: msgData.fileData || null,
      aiAnalysis: msgData.aiAnalysis || null,
      timestamp: msgData.timestamp || new Date().toISOString()
    };
    db.messages.push(newMsg);
    writeDb(db);
    return newMsg;
  },

  updateMessageAnalysis: (messageId, analysis) => {
    const db = readDb();
    ensureMessagesArray(db);
    const idx = db.messages.findIndex(m => m.id === messageId);
    if (idx === -1) return null;
    db.messages[idx].aiAnalysis = analysis;
    writeDb(db);
    return db.messages[idx];
  },

  getCompanyContext: (companyId) => {
    const db = readDb();
    ensureMessagesArray(db);
    const company = db.companies.find(c => c.id === companyId || c.name === companyId);
    if (!company) return null;

    const companyCards = db.cards.filter(c => c.companyId === company.id || c.company === company.name);
    const messages = db.messages.filter(m => m.companyId === company.id);
    const recentMessages = messages.slice(-10);

    return {
      company,
      openCards: companyCards.filter(c => c.stage !== 'Finalizados'),
      recentCards: companyCards.slice(-10),
      recentMessages,
      operationalSummary: company.operationalSummary || ''
    };
  },

  updateCompanySummary: (companyId, summary) => {
    const db = readDb();
    const idx = db.companies.findIndex(c => c.id === companyId || c.name === companyId);
    if (idx === -1) return null;
    db.companies[idx].operationalSummary = summary;
    writeDb(db);
    return db.companies[idx];
  },

  confirmAiActivities: (companyId, messageId, activitiesToCreate = [], updatesToApply = []) => {
    const db = readDb();
    ensureMessagesArray(db);
    const companyObj = db.companies.find(c => c.id === companyId || c.name === companyId);
    const compName = companyObj ? companyObj.name : 'Empresa';
    const compId = companyObj ? companyObj.id : companyId;

    const createdCards = [];
    const updatedCards = [];

    // 1. Criar novas atividades confirmadas
    for (const act of activitiesToCreate) {
      const newCard = {
        id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        companyId: compId,
        company: compName,
        category: act.category || 'Geral',
        title: act.title,
        stage: act.stage || 'A Fazer',
        routineFrequency: act.routineFrequency || 'Avulso',
        responsible: act.responsible || 'Não definido',
        returnDeadlineText: act.deadlineText || '',
        returnDeadline: act.deadline || act.returnDeadline || 'Não definido',
        technique: act.technique || 'Identificado a partir da análise operacional do chat.',
        notes: act.notes || act.description || '',
        checklist: act.checklist || [
          { id: 1, text: act.title, done: act.stage === 'Finalizados' }
        ],
        source: 'ai_chat',
        sourceMessageId: messageId || null,
        confidence: act.confidence || 0.9,
        createdAt: new Date().toISOString(),
        history: [
          {
            timestamp: new Date().toISOString(),
            action: 'created_from_chat',
            note: `Atividade criada a partir da mensagem (${messageId || 'chat'}).`
          }
        ]
      };
      db.cards.push(newCard);
      createdCards.push(newCard);
    }

    // 2. Aplicar atualizações em cards existentes
    for (const upd of updatesToApply) {
      const cardIdx = db.cards.findIndex(c => c.id === upd.cardId);
      if (cardIdx !== -1) {
        const prevStage = db.cards[cardIdx].stage;
        if (upd.suggestedStage) {
          db.cards[cardIdx].stage = upd.suggestedStage;
        }
        if (upd.deadline) {
          db.cards[cardIdx].returnDeadline = upd.deadline;
        }
        if (!db.cards[cardIdx].history) {
          db.cards[cardIdx].history = [];
        }
        db.cards[cardIdx].history.push({
          timestamp: new Date().toISOString(),
          action: 'ai_updated_from_chat',
          note: upd.reason || `Atualizado de [${prevStage}] para [${db.cards[cardIdx].stage}] via chat (${messageId || 'chat'}).`
        });
        updatedCards.push(db.cards[cardIdx]);
      }
    }

    // 3. Marcar análise da mensagem como 'applied'
    if (messageId) {
      const msg = db.messages.find(m => m.id === messageId);
      if (msg && msg.aiAnalysis) {
        msg.aiAnalysis.status = 'applied';
        msg.aiAnalysis.appliedAt = new Date().toISOString();
      }
    }

    writeDb(db);
    return { createdCards, updatedCards };
  },

  updateCardStage: (cardId, newStage, newDeadline = null) => {
    const db = readDb();
    const card = db.cards.find(c => c.id === cardId);
    if (!card) return null;
    const prevStage = card.stage;
    card.stage = newStage;
    if (newDeadline) card.returnDeadline = newDeadline;
    if (!card.history) card.history = [];
    card.history.push({
      timestamp: new Date().toISOString(),
      action: 'stage_changed',
      note: `Estágio alterado de [${prevStage}] para [${newStage}].`
    });
    writeDb(db);
    return card;
  },

  updateCard: (cardId, updates) => {
    const db = readDb();
    const idx = db.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return null;
    db.cards[idx] = { ...db.cards[idx], ...updates };
    writeDb(db);
    return db.cards[idx];
  },

  deleteCard: (cardId) => {
    const db = readDb();
    const initialLen = db.cards.length;
    db.cards = db.cards.filter(c => c.id !== cardId);
    if (db.cards.length !== initialLen) {
      writeDb(db);
      return true;
    }
    return false;
  },

  createCard: (cardData) => {
    const db = readDb();
    const companyObj = db.companies.find(c => c.name === cardData.company || c.id === cardData.companyId);
    const newCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      stage: cardData.stage || 'A Fazer',
      company: cardData.company || companyObj?.name || '',
      companyId: cardData.companyId || companyObj?.id || '',
      category: cardData.category || 'Geral',
      title: cardData.title || 'Nova Rotina',
      routineFrequency: cardData.routineFrequency || cardData.frequency || 'Semanal',
      responsible: cardData.responsible || 'Felipe Gabriel',
      returnDeadline: cardData.returnDeadline || '24h',
      technique: cardData.technique || 'Procedimento operacional padrão do despachante.',
      notes: cardData.notes || '',
      source: cardData.source || 'manual',
      sourceMessageId: cardData.sourceMessageId || null,
      history: [
        {
          timestamp: new Date().toISOString(),
          action: 'created_manually',
          note: 'Card criado manualmente.'
        }
      ],
      checklist: cardData.checklist || [
        { id: 1, text: 'Consultar órgãos e levantar dados', done: false },
        { id: 2, text: 'Executar procedimento operacional', done: false },
        { id: 3, text: 'Notificar cliente / anexar comprovante', done: false }
      ]
    };
    db.cards.push(newCard);
    writeDb(db);
    return newCard;
  },

  createCardForCompanies: (cardData, companyIds = null) => {
    const db = readDb();
    const targetCompanies = (companyIds && companyIds.length > 0)
      ? db.companies.filter(c => companyIds.includes(c.id))
      : db.companies;

    const created = [];
    for (const comp of targetCompanies) {
      const newCard = {
        id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        stage: 'A Fazer',
        company: comp.name,
        companyId: comp.id,
        category: cardData.category || 'Geral',
        title: cardData.title,
        routineFrequency: cardData.routineFrequency || cardData.frequency || 'Semanal',
        responsible: cardData.responsible || 'Felipe Gabriel',
        returnDeadline: cardData.returnDeadline || '14/09 às 17h',
        technique: cardData.technique || 'Procedimento operacional padrão.',
        notes: cardData.notes || '',
        source: 'broadcast',
        history: [
          {
            timestamp: new Date().toISOString(),
            action: 'created_broadcast',
            note: 'Card criado via broadcast geral.'
          }
        ],
        checklist: cardData.checklist ? JSON.parse(JSON.stringify(cardData.checklist)) : [
          { id: 1, text: 'Levantamento no sistema', done: false },
          { id: 2, text: 'Execução e protocolo', done: false }
        ]
      };
      db.cards.push(newCard);
      created.push(newCard);
    }
    writeDb(db);
    return created;
  },

  createCompanyWithCards: (companyData, selectedTemplateIds = []) => {
    const db = readDb();
    const compId = `comp-${Date.now()}`;
    const newCompany = {
      id: compId,
      name: companyData.name,
      vehiclesCount: Number(companyData.vehiclesCount) || 0,
      cnpj: companyData.cnpj || '',
      fleetType: companyData.fleetType || 'Frota Geral',
      email: companyData.email || '',
      routineSchedule: companyData.routineSchedule || 'Semanal',
      operationalSummary: ''
    };
    db.companies.push(newCompany);

    const generatedCards = [];
    if (selectedTemplateIds && selectedTemplateIds.length > 0) {
      for (const tmplId of selectedTemplateIds) {
        const tmpl = DOC_ONLINE_CATALOG.find(t => t.id === tmplId);
        if (tmpl) {
          const card = {
            id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            stage: 'A Fazer',
            company: newCompany.name,
            companyId: newCompany.id,
            category: tmpl.category,
            title: tmpl.title,
            routineFrequency: tmpl.frequency,
            responsible: 'Felipe Gabriel',
            returnDeadline: tmpl.frequency === 'Semanal' ? '7 dias' : '30 dias',
            technique: tmpl.technique,
            notes: '',
            source: 'template_catalog',
            history: [
              {
                timestamp: new Date().toISOString(),
                action: 'created_from_catalog',
                note: `Criado a partir da rotina do catálogo: ${tmpl.title}`
              }
            ],
            checklist: JSON.parse(JSON.stringify(tmpl.checklist))
          };
          db.cards.push(card);
          generatedCards.push(card);
        }
      }
    }

    writeDb(db);
    return { company: newCompany, cards: generatedCards };
  }
};
