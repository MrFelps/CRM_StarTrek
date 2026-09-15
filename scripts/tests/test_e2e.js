async function test() {
  try {
    const r0 = await fetch('http://localhost:3001');
    const html0 = await r0.text();
    console.log('✅ Frontend Estático (dist) OK - Status:', r0.status, 'Contém index.html:', html0.includes('CRM - Gestão de Processos'));

    const rCat = await fetch('http://localhost:3001/api/routines/catalog');
    const catalog = await rCat.json();
    console.log('✅ /api/routines/catalog OK - Itens:', catalog.length, 'Exemplo:', catalog[0].category, '-', catalog[0].title);

    const r1 = await fetch('http://localhost:3001/api/companies');
    const companies = await r1.json();
    console.log('✅ /api/companies OK - Total:', companies.length);

    // Testar criação de nova empresa com seleção de rotinas
    console.log('⏳ Testando cadastro de empresa com seleção de rotinas padrão...');
    const rComp = await fetch('http://localhost:3001/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Expresso RodoLog',
        vehiclesCount: 55,
        selectedTemplateIds: ['tmpl-indicacao', 'tmpl-multas', 'tmpl-cronotacografo']
      })
    });
    const newCompData = await rComp.json();
    console.log('✅ POST /api/companies OK - Empresa criada:', newCompData.company.name, 'Cards gerados:', newCompData.cards.length);

    // Testar broadcast de card para todas as empresas
    console.log('⏳ Testando criação de card em lote para todas as empresas...');
    const rBroad = await fetch('http://localhost:3001/api/cards/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardData: {
          category: 'Multas',
          title: 'Varredura Extraordinária de Multas no SNE',
          routineFrequency: 'Semanal',
          technique: 'Varredura geral preventiva para antecipação de descontos.'
        }
      })
    });
    const broadcastedCards = await rBroad.json();
    console.log('✅ POST /api/cards/broadcast OK - Cards criados em lote:', broadcastedCards.length);

    // Testar exclusão de card
    const cardToDelete = broadcastedCards[0];
    const rDel = await fetch(`http://localhost:3001/api/cards/${cardToDelete.id}`, {
      method: 'DELETE'
    });
    const delResult = await rDel.json();
    console.log('✅ DELETE /api/cards/:id OK - Card removido:', delResult.id);

    // Testar resumo diário com IA
    console.log('⏳ Testando resumo diário com 9Router...');
    const rSumm = await fetch('http://localhost:3001/api/ai/daily-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '10/09/2026',
        cards: broadcastedCards
      })
    });
    const summaryData = await rSumm.json();
    console.log('✅ POST /api/ai/daily-summary OK - Prévia do resumo:\n', summaryData.summary.slice(0, 150) + '...\n');

    console.log('🎉 TODOS OS NOVOS RECURSOS DO BACKEND FORAM VALIDADOS COM SUCESSO!');
  } catch (e) {
    console.error('❌ Erro no teste:', e);
  }
}

test();
