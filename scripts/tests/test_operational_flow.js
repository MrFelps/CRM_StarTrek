const db = require('./server/db');
const { analyzeOperationalInput } = require('./server/services/aiService');

async function testFlow() {
  console.log('=== TESTANDO FLUXO DE CENTRAL OPERACIONAL ===');
  const companies = db.getCompanies();
  const comp = companies[0];
  console.log(`Empresa: ${comp.name} (${comp.id})`);

  // 1. Mensagem simulando reunião com WhatsApp e transcrição
  const rawInput = "Reunião de hoje: João ficou de levantar as placas dos caminhões novos. Eu preciso mandar as guias com desconto SNE para o financeiro aprovar até amanhã. A cliente confirmou que manda os documentos da CNH até sexta-feira.";
  console.log('\n--- ENTRADA BRUTA ---');
  console.log(rawInput);

  const context = db.getCompanyContext(comp.id);
  const result = await analyzeOperationalInput({
    company: comp,
    messageText: rawInput,
    history: context.recentMessages,
    openCards: context.openCards,
    currentDate: '2026-09-15T18:00:00.000Z'
  });

  console.log('\n--- RESULTADO DA IA (9ROUTER / FALLBACK) ---');
  console.log(JSON.stringify(result, null, 2));

  // 2. Salva a mensagem no banco
  const saved = db.saveMessage(comp.id, {
    sender: 'user',
    content: rawInput,
    aiAnalysis: result
  });
  console.log('\nMensagem salva com ID:', saved.id);

  // 3. Simula aprovação do usuário para criar as atividades sugeridas
  if (result.activities && result.activities.length > 0) {
    console.log('\n--- CONFIRMANDO CRIAÇÃO DE ATIVIDADES ---');
    const confirmed = db.confirmAiActivities(comp.id, saved.id, result.activities, result.updates);
    console.log(`Cards criados: ${confirmed.createdCards.length}`);
    confirmed.createdCards.forEach(c => {
      console.log(` -> [${c.stage}] ${c.title} | Resp: ${c.responsible} | Prazo: ${c.returnDeadline} (${c.returnDeadlineText}) | Origem: ${c.source}`);
    });
  }

  // 4. Teste de atualização: mensagem seguinte informando que a tarefa foi feita
  const followUp = "Enviei as guias para o financeiro e agora estou aguardando a aprovação.";
  console.log('\n--- TESTE DE ATUALIZAÇÃO ---');
  console.log(`Segunda mensagem: "${followUp}"`);

  const updatedContext = db.getCompanyContext(comp.id);
  const followUpResult = await analyzeOperationalInput({
    company: comp,
    messageText: followUp,
    history: updatedContext.recentMessages,
    openCards: updatedContext.openCards,
    currentDate: '2026-09-15T18:00:00.000Z'
  });
  console.log('Sugestões de atualização detectadas:', JSON.stringify(followUpResult.updates, null, 2));

  console.log('\n=== TESTE FINALIZADO COM SUCESSO ===');
}

testFlow().catch(console.error);
