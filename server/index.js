require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const aiService = require('./services/aiService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 1. Catálogo Oficial do Doc On-line
app.get('/api/routines/catalog', (req, res) => {
  res.json(db.getCatalog());
});

// 2. Empresas
app.get('/api/companies', (req, res) => {
  res.json(db.getCompanies());
});

// Cadastrar nova empresa (com seleção de rotinas padrão)
app.post('/api/companies', (req, res) => {
  const { name, vehiclesCount, cnpj, fleetType, email, routineSchedule, selectedTemplateIds } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
  const result = db.createCompanyWithCards(
    { name, vehiclesCount, cnpj, fleetType, email, routineSchedule },
    selectedTemplateIds || []
  );
  res.status(201).json(result);
});

// 3. Cards (Batalha Naval e Quadro)
app.get('/api/cards', (req, res) => {
  res.json(db.getCards());
});

// Excluir card
app.delete('/api/cards/:id', (req, res) => {
  const success = db.deleteCard(req.params.id);
  if (!success) return res.status(404).json({ error: 'Card não encontrado' });
  res.json({ message: 'Card excluído com sucesso', id: req.params.id });
});

// Atualizar estágio do card (Drag & Drop ou ação da IA)
app.patch('/api/cards/:id/stage', (req, res) => {
  const { stage, returnDeadline } = req.body;
  if (!stage) return res.status(400).json({ error: 'Stage é obrigatório' });
  const updated = db.updateCardStage(req.params.id, stage, returnDeadline);
  if (!updated) return res.status(404).json({ error: 'Card não encontrado' });
  res.json(updated);
});

// Atualizar campos do card (Anotações, checklist, etc)
app.patch('/api/cards/:id', (req, res) => {
  const updated = db.updateCard(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Card não encontrado' });
  res.json(updated);
});

// Criar novo card individual
app.post('/api/cards', (req, res) => {
  const newCard = db.createCard(req.body);
  res.status(201).json(newCard);
});

// Criar card em lote para todas as empresas
app.post('/api/cards/broadcast', (req, res) => {
  const { cardData, companyIds } = req.body;
  if (!cardData || !cardData.title) return res.status(400).json({ error: 'Título do card é obrigatório' });
  const createdCards = db.createCardForCompanies(cardData, companyIds);
  res.status(201).json(createdCards);
});

// 3. IA: Chat Geral da Empresa (com suporte a anexo de PDF)
app.post('/api/ai/company-chat', async (req, res) => {
  const { companyName, message, history, file } = req.body;
  if (!message && !file) return res.status(400).json({ error: 'Mensagem ou arquivo obrigatório' });
  try {
    const reply = await aiService.chatCompany(companyName || 'Geral', message, history || [], file || null);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. IA: Preparar E-mail
app.post('/api/ai/prepare-email', async (req, res) => {
  const { cardTitle, companyName, category, notes } = req.body;
  try {
    const emailData = await aiService.prepareEmail(cardTitle, companyName, category, notes);
    res.json(emailData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. IA: Processar Ação do Card ("O que você fez" -> "Faça isso agora" e mover card)
app.post('/api/ai/card-action', async (req, res) => {
  const { userActionText, cardId } = req.body;
  const cards = db.getCards();
  const card = cards.find(c => c.id === cardId);
  if (!card) return res.status(404).json({ error: 'Card não encontrado' });

  try {
    const result = await aiService.processCardAction(userActionText, card);
    
    // Atualiza automaticamente o estágio do card no banco
    if (result.targetStage) {
      db.updateCardStage(cardId, result.targetStage, result.suggestedReturnDeadline);
      if (result.markAllChecklist && card.checklist) {
        card.checklist.forEach(item => item.done = true);
        db.updateCard(cardId, { checklist: card.checklist });
      }
    }

    res.json({
      ...result,
      updatedCard: db.getCards().find(c => c.id === cardId)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. MEMÓRIA & CENTRAL OPERACIONAL POR EMPRESA (9Router)
// Listar histórico de mensagens da empresa
app.get('/api/companies/:id/messages', (req, res) => {
  const messages = db.getCompanyMessages(req.params.id);
  res.json(messages);
});

// Obter Contexto Consolidado da Empresa
app.get('/api/companies/:id/context', (req, res) => {
  const context = db.getCompanyContext(req.params.id);
  if (!context) return res.status(404).json({ error: 'Empresa não encontrada' });
  res.json(context);
});

// Enviar nova entrada (Reunião, WhatsApp, texto bruto, PDF) e analisar com 9Router
app.post('/api/companies/:id/messages', async (req, res) => {
  const companyId = req.params.id;
  const { content, fileData, sender, currentDate } = req.body;

  if (!content && !fileData) {
    return res.status(400).json({ error: 'Conteúdo ou arquivo é obrigatório' });
  }

  try {
    // 1. Salva a mensagem inicial no histórico
    const savedMsg = db.saveMessage(companyId, {
      sender: sender || 'user',
      content: content || (fileData ? `[Arquivo Anexado: ${fileData.name}]` : ''),
      fileData: fileData || null,
      aiAnalysis: { status: 'analyzing' }
    });

    // 2. Busca o contexto atualizado da empresa e cards abertos
    const context = db.getCompanyContext(companyId);
    const company = context ? context.company : null;
    const openCards = context ? context.openCards : [];
    const recentHistory = context ? context.recentMessages.slice(-5) : [];

    // 3. Executa a análise semântica com o 9Router
    const analysis = await aiService.analyzeOperationalInput({
      company,
      messageText: content,
      history: recentHistory,
      openCards,
      fileData,
      currentDate: currentDate || new Date().toISOString()
    });

    analysis.status = (analysis.activities.length > 0 || analysis.updates.length > 0) ? 'pending_review' : 'informational';

    // 4. Atualiza a mensagem com o resultado da análise
    const updatedMsg = db.updateMessageAnalysis(savedMsg.id, analysis);

    // 5. Atualiza o resumo operacional da empresa se houver
    if (analysis.companySummaryUpdate) {
      db.updateCompanySummary(companyId, analysis.companySummaryUpdate);
    }

    res.status(201).json({
      message: updatedMsg,
      analysis,
      companyContext: db.getCompanyContext(companyId)
    });
  } catch (err) {
    console.error('Erro ao processar mensagem operacional:', err);
    res.status(500).json({ error: err.message });
  }
});

// Confirmar e aplicar atividades/atualizações sugeridas pela IA
app.post('/api/companies/:id/confirm-activities', (req, res) => {
  const companyId = req.params.id;
  const { messageId, activitiesToCreate, updatesToApply } = req.body;

  try {
    const result = db.confirmAiActivities(
      companyId,
      messageId,
      activitiesToCreate || [],
      updatesToApply || []
    );

    res.json({
      success: true,
      ...result,
      allCards: db.getCards(),
      companyContext: db.getCompanyContext(companyId)
    });
  } catch (err) {
    console.error('Erro ao confirmar atividades:', err);
    res.status(500).json({ error: err.message });
  }
});

// Servir frontend estático em produção se compilado
const clientDist = path.join(__dirname, '../client/dist');
if (fsExists(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

function fsExists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

app.listen(PORT, () => {
  console.log(`⚡ Servidor CRM rodando na porta http://localhost:${PORT}`);
});
