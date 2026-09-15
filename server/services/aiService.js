const https = require('https');
const http = require('http');
const pdfParse = require('pdf-parse');

const CLOUD_BASE_URL = process.env.OPENAI_BASE_URL || 'https://ninerouter-cloud-22uw.onrender.com/v1';
const CLOUD_API_KEY = process.env.OPENAI_API_KEY || 'sk-b73e8bd298f87967-8weuql-300f6a48';
const LOCAL_BASE_URL = process.env.LOCAL_OPENAI_BASE_URL || 'http://localhost:20128/v1';
const LOCAL_API_KEY = process.env.LOCAL_OPENAI_API_KEY || 'sk-0cb1d1a8a1b5852e-k0l7s8-6b777e61';
const MODEL = process.env.LLM_MODEL || 'claude-sonnet-5';

function callOpenAiCompatible(baseUrl, apiKey, messages, temperature = 0.3) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(`${baseUrl.replace(/\/$/, '')}/chat/completions`);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const payload = JSON.stringify({
        model: MODEL,
        messages,
        temperature
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 15000
      };

      const req = lib.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              const reply = parsed.choices?.[0]?.message?.content || '';
              resolve(reply);
            } catch (err) {
              reject(new Error('Resposta da IA não veio em JSON válido: ' + body.slice(0, 100)));
            }
          } else {
            reject(new Error(`9Router status ${res.statusCode}: ${body.slice(0, 150)}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout de conexão com o 9Router'));
      });

      req.write(payload);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function call9RouterWithFallback(messages, temperature = 0.3) {
  // 1. Tenta Cloud
  try {
    return await callOpenAiCompatible(CLOUD_BASE_URL, CLOUD_API_KEY, messages, temperature);
  } catch (cloudErr) {
    console.warn('[9Router Cloud indisponível, tentando local]:', cloudErr.message);
  }

  // 2. Tenta Local
  try {
    return await callOpenAiCompatible(LOCAL_BASE_URL, LOCAL_API_KEY, messages, temperature);
  } catch (localErr) {
    console.warn('[9Router Local também indisponível]:', localErr.message);
  }

  return null;
}

// 1. Chat Geral Contextualizado da Empresa (com suporte a anexos PDF)
async function chatCompany(companyName, userMessage, history = [], fileData = null) {
  let promptContent = userMessage || '';

  if (fileData && fileData.base64) {
    try {
      const base64Clean = fileData.base64.replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(base64Clean, 'base64');
      const parsed = await pdfParse(buffer);
      const text = (parsed.text || '').trim();
      
      if (text.length > 0) {
        promptContent = `[ARQUIVO PDF ANEXADO: "${fileData.name}"]\n--- CONTEÚDO EXTRAÍDO DO PDF ---\n${text.slice(0, 5000)}\n--- FIM DO DOCUMENTO ---\n\nInstrução do Operador: ${userMessage || 'Analise os dados deste PDF (auto de infração, placa, valores, prazos de desconto SNE ou licenciamento) e oriente os próximos passos operacionais.'}`;
      } else {
        promptContent = `[ARQUIVO PDF ANEXADO: "${fileData.name}"]\n\nInstrução do Operador: ${userMessage || 'Analise e oriente os procedimentos operacionais para este documento.'}`;
      }
    } catch (err) {
      console.warn('[Erro ao ler PDF com pdf-parse]:', err.message);
      promptContent = `[ARQUIVO PDF ANEXADO: "${fileData.name}"]\n\nInstrução do Operador: ${userMessage}`;
    }
  }

  const systemPrompt = `Você é o Copilot de IA do despachante na empresa "${companyName}".
Você responde de forma ultra concisa, prática e direta, sem enrolação e sem saudações longas.
Foco: multas de trânsito, autuações, guias de pagamento, prazos de desconto de 20% no SNE, indicação de condutor, licenciamento (CRLV), CNH e cronotacógrafo.
Quando um PDF de multa, guia ou documento veicular for anexado, extraia com máxima precisão os dados encontrados (Placa, Auto de Infração, Órgão autuador, Valor com Desconto de 20%, Vencimento, Prazo de Indicação) e oriente exatamente os próximos passos operacionais.
Responda em português brasileiro profissional.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-4),
    { role: 'user', content: promptContent }
  ];

  const aiResponse = await call9RouterWithFallback(messages);
  if (aiResponse) return aiResponse;

  // Resposta fallback se o 9Router estiver dormindo
  return `Recebi o documento "${fileData ? fileData.name : 'PDF'}". Recomendo validar o código de barras, confirmar o desconto de 20% no portal do SNE/Detran e fixar o prazo de retorno em 24h para o cliente aprovar.`;
}

// 2. Preparador de E-mail Limpo e Direto
async function prepareEmail(cardTitle, companyName, category, notes) {
  const prompt = `Você é um despachante veicular. Prepare uma minuta de e-mail formal e objetiva para o cliente "${companyName}".
Atividade: "${cardTitle}".
Categoria: "${category}".
Anotações: "${notes}".
Retorne APENAS um objeto JSON no formato exato:
{
  "subject": "[COMUNICADO] ...",
  "body": "Prezado Setor Financeiro,\\n\\nTexto direto..."
}`;

  const messages = [
    { role: 'system', content: 'Você retorna estritamente JSON válido sem markdown em volta.' },
    { role: 'user', content: prompt }
  ];

  const aiResponse = await call9RouterWithFallback(messages);
  if (aiResponse) {
    try {
      const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn('Falha no parse do JSON de e-mail, gerando padrão.');
    }
  }

  // Padrão estruturado e profissional
  return {
    subject: `[COMUNICADO] ${cardTitle} - Frota ${companyName}`,
    body: `Prezado Setor Financeiro,\n\nIdentificamos pendências operacionais referentes a "${cardTitle}".\n\nPor favor, nos enviem o retorno/comprovante até amanhã às 17h para que possamos protocolar a baixa no órgão responsável.\n\nAtenciosamente,\nEquipe Despachante`
  };
}

// 3. Rede de Ações de IA: O que você fez -> "Faça isso agora" e move o card
async function processCardAction(userActionText, card) {
  const prompt = `O operador de despachante relatou a seguinte ação na tarefa "${card.title}" (Status atual: "${card.stage}"):
Relato: "${userActionText}"

Você deve decidir como orientar o operador e para qual coluna mover o card.
As colunas possíveis são: "A Fazer", "Em Andamento", "Aguardando Retorno", "Finalizados".

Retorne APENAS um JSON no formato:
{
  "targetStage": "Aguardando Retorno",
  "advice": "1. Baixe as guias agora... 2. Marque a etapa correspondente...",
  "suggestedReturnDeadline": "14/09 às 17h",
  "markAllChecklist": true
}`;

  const messages = [
    { role: 'system', content: 'Você retorna estritamente JSON válido sem markdown em volta.' },
    { role: 'user', content: prompt }
  ];

  const aiResponse = await call9RouterWithFallback(messages);
  if (aiResponse) {
    try {
      const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn('Falha no parse do JSON de ação de card, usando fallback.');
    }
  }

  // Fallback inteligente baseado em palavras-chave operacionais
  const lower = (userActionText || '').toLowerCase();
  let targetStage = 'Em Andamento';
  let advice = 'Continue o levantamento das guias e anexe o protocolo.';
  let suggestedReturnDeadline = '24h';

  if (lower.includes('mandei') || lower.includes('enviei') || lower.includes('e-mail') || lower.includes('aguardo') || lower.includes('cobrei')) {
    targetStage = 'Aguardando Retorno';
    advice = '1. O comunicado foi preparado e registrado.\n2. Fixe o prazo de retorno em 24h e aguarde o comprovante do cliente.';
    suggestedReturnDeadline = '14/09 às 17h';
  } else if (lower.includes('pago') || lower.includes('pagou') || lower.includes('comprovante') || lower.includes('finaliz') || lower.includes('conclu')) {
    targetStage = 'Finalizados';
    advice = '1. Comprovante validado com sucesso.\n2. O processo pode ser finalizado e o próximo ciclo agendado.';
    suggestedReturnDeadline = 'Concluído';
  }

  return {
    targetStage,
    advice,
    suggestedReturnDeadline,
    markAllChecklist: true
  };
}

// 4. IA: Resumo da Pauta Diária e Técnicas Aplicadas
async function generateDailySummary(dateStr, cardsList = []) {
  const cardsSummary = cardsList.slice(0, 12).map(c => 
    `- [${c.stage}] ${c.company}: ${c.title} (Prazo: ${c.returnDeadline || 'Sem prazo'}) - Técnica: ${c.technique || 'Padrão'}`
  ).join('\n');

  const prompt = `Você é o Copilot de IA do despachante veicular e gestor de frotas.
Data de referência: ${dateStr}.
Lista de atividades prioritárias:
${cardsSummary}

Gere uma síntese operacional concisa com:
1. 🎯 Foco de Hoje (prioridades com técnicas de desconto SNE ou indicação)
2. ⚠️ Prazos Mais Próximos
3. 🛠️ Técnicas Operacionais a Aplicar
Mantenha o tom profissional, direto e em markdown limpo.`;

  const messages = [
    { role: 'system', content: 'Você é um assistente despachante veicular objetivo e prático.' },
    { role: 'user', content: prompt }
  ];

  const aiResponse = await call9RouterWithFallback(messages);
  if (aiResponse) return aiResponse;

  return `### 📋 Pauta Diária Operacional - ${dateStr}

1. **Foco de Hoje**:
- Pagamento das guias com 20% de desconto via SNE com vencimento imediato.
- Cobrança dos formulários de condutores notificados para evitar penalidade NIC.

2. **Prazos Mais Próximos**:
- Acompanhamento das empresas com retorno fixado para hoje às 17h.
- Varredura periódica de novas autuações no Detran/PRF.

3. **Técnicas Recomendadas**:
- Protocolar no órgão assim que receber o comprovante e emitir a baixa no sistema.`;
}

// 5. Motor Central de Inteligência Operacional: Interpretação de Reuniões, WhatsApp, Textos Brutos e PDFs
async function analyzeOperationalInput({ company, messageText, history = [], openCards = [], fileData = null, currentDate = null }) {
  const refDate = currentDate ? new Date(currentDate) : new Date();
  const dateFormatted = refDate.toISOString().split('T')[0];
  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const dayOfWeek = dayNames[refDate.getDay()];
  const companyName = company ? (company.name || company) : 'Empresa';

  let textToAnalyze = messageText || '';
  let pdfInfo = '';

  if (fileData && fileData.base64) {
    try {
      const base64Clean = fileData.base64.replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(base64Clean, 'base64');
      const parsed = await pdfParse(buffer);
      const text = (parsed.text || '').trim();
      if (text.length > 0) {
        pdfInfo = `\n[ARQUIVO PDF ANEXADO: "${fileData.name}"]\n--- CONTEÚDO EXTRAÍDO DO PDF ---\n${text.slice(0, 4000)}\n--- FIM DO DOCUMENTO ---`;
      }
    } catch (err) {
      console.warn('[Erro ao ler PDF no analyzeOperationalInput]:', err.message);
      pdfInfo = `\n[ARQUIVO PDF ANEXADO: "${fileData.name}"] (Não foi possível extrair o texto binário)`;
    }
  }

  const openCardsFormatted = openCards.length > 0
    ? openCards.map(c => `- ID: "${c.id}" | Título: "${c.title}" | Estágio atual: "${c.stage}" | Responsável: "${c.responsible}" | Prazo: "${c.returnDeadline}"`).join('\n')
    : 'Nenhum card aberto no momento.';

  const recentHistoryFormatted = history.slice(-4).map(m => `${m.sender === 'user' ? 'Operador' : 'IA'}: ${m.content}`).join('\n');

  const systemPrompt = `Você é o Motor de Inteligência e Memória Operacional do CRM de Despachante Veicular e Frotas.
Sua missão é atuar como uma camada de ORGANIZAÇÃO OPERACIONAL para a empresa "${companyName}".
DATA ATUAL DO SISTEMA: ${dateFormatted} (${dayOfWeek}).

REGRAS DE INTERPRETAÇÃO:
1. SEPARE FATOS DE AÇÕES:
   - "Fato/Informação": Guarde em "facts" (ex: "Frota possui 80 veículos", "Cliente prefere contato por WhatsApp"). NÃO crie tarefa para simples constatação.
   - "Ação/Decisão/Pendência": Crie em "activities" apenas se houver uma tarefa concreta a fazer, cobrança a realizar, documento a enviar ou retorno a aguardar.
2. PREVENÇÃO DE DUPLICIDADE & ATUALIZAÇÕES:
   - Analise os cards já abertos da empresa:
${openCardsFormatted}
   - Se o texto indicar que um card aberto já foi feito, avançou ou teve prazo alterado (ex: "já enviei as guias", "cliente pediu mais prazo"), crie um item em "updates" referenciando o "cardId" em vez de criar um card duplicado.
3. DATAS E PRAZOS (NUNCA INVENTAR):
   - Traduza termos relativos usando a DATA ATUAL (${dateFormatted}):
     * "amanhã" -> data do dia seguinte (YYYY-MM-DD)
     * "sexta", "segunda", etc -> próxima data daquele dia da semana (YYYY-MM-DD)
     * "semana que vem" -> data em 7 dias (YYYY-MM-DD)
   - Preserve o texto original em "deadlineText" (ex: "sexta", "24h").
   - Se não houver prazo mencionado, use "deadline": null e "deadlineText": "Não definido". NUNCA INVENTE DATAS.
4. RESPONSÁVEIS (NUNCA INVENTAR):
   - Se mencionado nome ou cliente ("João", "Felipe", "Cliente", "Financeiro"), atribua. Se não souber, use "Não definido".
5. ESTÁGIOS DAS ATIVIDADES:
   - "A Fazer": tarefas internas a iniciar.
   - "Em Andamento": tarefas já em execução.
   - "Aguardando Retorno": quando estamos aguardando cliente, motorista ou órgão público.
   - "Finalizados": tarefas que o texto relatou como concluídas.

FORMATO DE RESPOSTA OBRIGATÓRIO (APENAS JSON VÁLIDO SEM MARKDOWN EM VOLTA):
{
  "summary": "Resumo executivo de 1 a 2 linhas do que foi tratado.",
  "facts": ["Fato relevante 1 para a memória da empresa", "Fato 2"],
  "activities": [
    {
      "title": "Título conciso e direto da atividade",
      "category": "Multas | Licenciamento | CNH | Cronotacógrafo | Documentação | Pagamentos | Geral",
      "responsible": "Nome da pessoa ou 'Cliente' ou 'Não definido'",
      "stage": "A Fazer | Em Andamento | Aguardando Retorno | Finalizados",
      "deadlineText": "Texto do prazo falado (ex: amanhã, sexta)",
      "deadline": "YYYY-MM-DD ou null",
      "confidence": 0.95,
      "action": "create",
      "technique": "Técnica operacional envolvida",
      "notes": "Contexto extraído da mensagem"
    }
  ],
  "updates": [
    {
      "cardId": "card-id-existente",
      "cardTitle": "Título do card",
      "suggestedStage": "A Fazer | Em Andamento | Aguardando Retorno | Finalizados",
      "deadline": "YYYY-MM-DD ou null",
      "reason": "Motivo da sugestão de atualização baseado no texto"
    }
  ],
  "companySummaryUpdate": "Resumo operacional atualizado caso haja mudança no perfil da frota"
}`;

  const promptContent = `HISTÓRICO RECENTE:
${recentHistoryFormatted || 'Sem histórico recente.'}

NOVA ENTRADA BRUTA DO OPERADOR:
${textToAnalyze}${pdfInfo}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: promptContent }
  ];

  const aiResponse = await call9RouterWithFallback(messages, 0.2);
  if (aiResponse) {
    try {
      const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return sanitizeAiResult(parsed, dateFormatted);
    } catch (e) {
      console.warn('Falha no parse do JSON do 9Router no analyzeOperationalInput, ativando fallback heurístico.');
    }
  }

  // Fallback Heurístico Local Robusto
  return fallbackHeuristicExtraction(textToAnalyze, openCards, dateFormatted, fileData);
}

function sanitizeAiResult(parsed, todayStr) {
  return {
    summary: parsed.summary || 'Análise operacional registrada.',
    facts: Array.isArray(parsed.facts) ? parsed.facts : [],
    activities: Array.isArray(parsed.activities) ? parsed.activities.map(a => ({
      title: a.title || 'Nova atividade',
      category: a.category || 'Geral',
      responsible: a.responsible || 'Não definido',
      stage: ['A Fazer', 'Em Andamento', 'Aguardando Retorno', 'Finalizados'].includes(a.stage) ? a.stage : 'A Fazer',
      deadlineText: a.deadlineText || '',
      deadline: a.deadline || null,
      confidence: a.confidence || 0.9,
      action: 'create',
      technique: a.technique || 'Identificado via IA no chat.',
      notes: a.notes || ''
    })) : [],
    updates: Array.isArray(parsed.updates) ? parsed.updates : [],
    companySummaryUpdate: parsed.companySummaryUpdate || null
  };
}

// Fallback Heurístico caso 9Router Cloud/Local estejam offline
function fallbackHeuristicExtraction(text, openCards, todayStr, fileData) {
  const activities = [];
  const updates = [];
  const facts = [];
  const baseDate = new Date(todayStr);

  function getNextDayOfWeek(dayIndex) {
    const d = new Date(baseDate);
    const currentDay = d.getDay();
    let distance = dayIndex - currentDay;
    if (distance <= 0) distance += 7;
    d.setDate(d.getDate() + distance);
    return d.toISOString().split('T')[0];
  }

  function parseDeadlines(str) {
    const lower = str.toLowerCase();
    if (lower.includes('amanhã') || lower.includes('amanha')) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + 1);
      return { deadline: d.toISOString().split('T')[0], text: 'amanhã' };
    }
    if (lower.includes('sexta')) {
      return { deadline: getNextDayOfWeek(5), text: 'sexta-feira' };
    }
    if (lower.includes('segunda')) {
      return { deadline: getNextDayOfWeek(1), text: 'segunda-feira' };
    }
    if (lower.includes('semana que vem')) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + 7);
      return { deadline: d.toISOString().split('T')[0], text: 'semana que vem' };
    }
    return { deadline: null, text: '' };
  }

  // Divide o texto por quebras de linha ou frases
  const sentences = (text || '')
    .split(/[\n\.\!\?]/)
    .map(s => s.trim())
    .filter(s => s.length > 8);

  const fullTextLower = (text || '').toLowerCase();

  // 1. Checa atualizações em cards existentes
  for (const card of openCards) {
    const titleLower = card.title.toLowerCase();
    const isRelated = (titleLower.includes('guia') && fullTextLower.includes('guia')) ||
                      (titleLower.includes('multa') && fullTextLower.includes('multa')) ||
                      (titleLower.includes('documento') && fullTextLower.includes('doc')) ||
                      (titleLower.includes('indica') && fullTextLower.includes('indica')) ||
                      (titleLower.includes('licenc') && fullTextLower.includes('licenc'));

    if (isRelated) {
      if (fullTextLower.includes('enviei') || fullTextLower.includes('mandei') || fullTextLower.includes('paguei') || fullTextLower.includes('conclu') || fullTextLower.includes('feito') || fullTextLower.includes('termin') || fullTextLower.includes('pronto')) {
        const dl = parseDeadlines(text);
        updates.push({
          cardId: card.id,
          cardTitle: card.title,
          suggestedStage: fullTextLower.includes('aguard') ? 'Aguardando Retorno' : 'Finalizados',
          deadline: dl.deadline,
          reason: `Evidência de avanço/conclusão encontrada no texto.`
        });
      }
    }
  }

  // 2. Analisa cada sentença individual para extrair atividades ou fatos
  for (const sentence of sentences) {
    const sLower = sentence.toLowerCase();
    const dl = parseDeadlines(sentence);

    const isAction = sLower.includes('enviar') || sLower.includes('mandar') || sLower.includes('cobrar') ||
                     sLower.includes('protocolar') || sLower.includes('levantar') || sLower.includes('verificar') ||
                     sLower.includes('aguardar') || sLower.includes('esperar') || sLower.includes('atualizar') ||
                     sLower.includes('preciso') || sLower.includes('ficou de') || sLower.includes('vai mandar') ||
                     sLower.includes('vai enviar') || sLower.includes('conferir') || sLower.includes('pagar');

    if (isAction) {
      let responsible = 'Não definido';
      if (sLower.includes('joão') || sLower.includes('joao')) responsible = 'João';
      else if (sLower.includes('felipe') || sLower.includes('eu vou') || sLower.includes('eu preciso') || sLower.includes('tenho que')) responsible = 'Felipe Gabriel';
      else if (sLower.includes('cliente') || sLower.includes('ela ') || sLower.includes('ele ')) responsible = 'Cliente';

      let stage = 'A Fazer';
      if (sLower.includes('aguardar') || sLower.includes('esperando') || sLower.includes('cliente ficou de') || sLower.includes('cliente confirmou que manda')) {
        stage = 'Aguardando Retorno';
      }

      let category = 'Geral';
      if (sLower.includes('guia') || sLower.includes('multa') || sLower.includes('sne')) category = 'Multas';
      else if (sLower.includes('licenc') || sLower.includes('crlv')) category = 'Licenciamento';
      else if (sLower.includes('cnh') || sLower.includes('toxicolog')) category = 'CNH';
      else if (sLower.includes('doc') || sLower.includes('placa')) category = 'Documentação';

      let cleanTitle = sentence.replace(/^(reunião de hoje|falamos com o cliente hoje|ficou combinado que|depois de|também|ah e)\s*[:,\-]?\s*/i, '').trim();
      if (cleanTitle.length > 80) cleanTitle = cleanTitle.slice(0, 77) + '...';

      // Evita adicionar atividades idênticas
      if (!activities.some(a => a.title.toLowerCase() === cleanTitle.toLowerCase())) {
        activities.push({
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          category,
          responsible,
          stage,
          deadlineText: dl.text || 'Não definido',
          deadline: dl.deadline,
          confidence: 0.88,
          action: 'create',
          technique: 'Extraído automaticamente do relato do operador.',
          notes: sentence
        });
      }
    } else {
      // Sentenças informativas viram fatos para a memória
      if (sentence.length > 15 && !facts.includes(sentence)) {
        facts.push(sentence);
      }
    }
  }

  if (fileData) {
    facts.push(`Documento PDF "${fileData.name}" anexado e registrado.`);
  }

  return {
    summary: sentences.slice(0, 2).join('. ') || text.slice(0, 90),
    facts: facts.slice(0, 4),
    activities: activities.slice(0, 6),
    updates: updates.slice(0, 4),
    companySummaryUpdate: null
  };
}

module.exports = {
  chatCompany,
  prepareEmail,
  processCardAction,
  generateDailySummary,
  analyzeOperationalInput
};

