import React, { useState, useEffect, useMemo, useRef } from 'react';

const STAGES = ['A Fazer', 'Em Andamento', 'Aguardando Retorno', 'Finalizados'];

export default function App() {
  const [companies, setCompanies] = useState([]);
  const [cards, setCards] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navegação: 'company' (Kanban individual) ou 'matrix' (Todas as empresas)
  const [activeView, setActiveView] = useState('company');
  const [selectedCompany, setSelectedCompany] = useState('');

  // Busca rápida
  const [searchQuery, setSearchQuery] = useState('');

  // Mensagens e Memória da IA
  const [companyMessages, setCompanyMessages] = useState({});
  const [companyContext, setCompanyContext] = useState(null);
  const [lastAiAction, setLastAiAction] = useState(null);

  // Drag & Drop
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);

  // Entrada de IA
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [attachedPdf, setAttachedPdf] = useState(null);
  const fileInputRef = useRef(null);

  // Modais
  const [activeCard, setActiveCard] = useState(null);
  const [cardActionText, setCardActionText] = useState('');
  const [cardActionLoading, setCardActionLoading] = useState(false);
  const [cardActionAdvice, setCardActionAdvice] = useState(null);

  const [newCardModal, setNewCardModal] = useState({
    isOpen: false,
    stage: 'A Fazer',
    title: '',
    category: 'Multas',
    returnDeadline: 'Hoje às 17h',
    notes: ''
  });

  const [newCompanyModal, setNewCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyFleet, setNewCompanyFleet] = useState(10);

  const [emailModal, setEmailModal] = useState({
    isOpen: false,
    card: null,
    subject: '',
    body: '',
    copied: false
  });

  // Carregar dados iniciais
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [compRes, cardsRes, catRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/cards'),
        fetch('/api/routines/catalog')
      ]);
      const compData = await compRes.json();
      const cardsData = await cardsRes.json();
      const catData = await catRes.json();

      setCompanies(compData);
      setCards(cardsData);
      setCatalog(catData);

      if (compData.length > 0 && !selectedCompany) {
        setSelectedCompany(compData[0].name);
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carrega mensagens ao selecionar empresa
  const loadCompanyData = async (compNameOrId) => {
    if (!compNameOrId) return;
    const compObj = companies.find(c => c.name === compNameOrId || c.id === compNameOrId);
    const targetId = compObj ? compObj.id : compNameOrId;

    try {
      const [msgRes, ctxRes] = await Promise.all([
        fetch(`/api/companies/${targetId}/messages`),
        fetch(`/api/companies/${targetId}/context`)
      ]);
      if (msgRes.ok) {
        const msgs = await msgRes.json();
        setCompanyMessages(prev => ({ ...prev, [targetId]: msgs }));
      }
      if (ctxRes.ok) {
        const ctx = await ctxRes.json();
        setCompanyContext(ctx);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      loadCompanyData(selectedCompany);
      setLastAiAction(null);
    }
  }, [selectedCompany, companies]);

  const currentCompanyObj = useMemo(() => {
    return companies.find(c => c.name === selectedCompany || c.id === selectedCompany) || null;
  }, [companies, selectedCompany]);

  const currentCompanyId = currentCompanyObj?.id || selectedCompany;

  // Filtragem de cards
  const visibleCards = useMemo(() => {
    let result = cards;

    if (activeView === 'company' && selectedCompany) {
      result = result.filter(c => c.company === selectedCompany || c.companyId === currentCompanyId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    return result;
  }, [cards, activeView, selectedCompany, currentCompanyId, searchQuery]);

  // BOTÃO "COLE AQUI" (Lê direto da área de transferência)
  const handlePasteHere = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setAiInput(prev => (prev ? `${prev}\n${text}` : text));
      }
    } catch (err) {
      // Exemplo prático caso permissão não esteja concedida
      const exampleText = "Recebemos notificação de penalidade da PRF para o veículo BRA2E19. Prazo de desconto SNE de 40% vence hoje às 17h.";
      setAiInput(prev => (prev ? `${prev}\n${exampleText}` : exampleText));
    }
  };

  // PROCESSAR ENTRADA COM A IA (A IA ORGANIZA OS CARDS)
  const handleProcessWithAi = async (e) => {
    if (e) e.preventDefault();
    if ((!aiInput.trim() && !attachedPdf) || !currentCompanyId) return;

    const fileToSend = attachedPdf;
    const textToSend = aiInput;
    setAiInput('');
    setAttachedPdf(null);
    setAiLoading(true);
    setLastAiAction(null);

    try {
      const res = await fetch(`/api/companies/${currentCompanyId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: textToSend,
          fileData: fileToSend ? { name: fileToSend.name, sizeFormatted: fileToSend.sizeFormatted, base64: fileToSend.base64 } : null,
          sender: 'user',
          currentDate: new Date().toISOString()
        })
      });

      if (res.ok) {
        const data = await res.json();
        const msg = data.message;
        
        setCompanyMessages(prev => {
          const currentList = prev[currentCompanyId] || [];
          return {
            ...prev,
            [currentCompanyId]: [...currentList, msg]
          };
        });

        // Se a IA gerou atividades, confirmamos e inserimos diretamente no Kanban!
        if (msg.aiAnalysis && msg.aiAnalysis.activitiesToCreate && msg.aiAnalysis.activitiesToCreate.length > 0) {
          const confirmRes = await fetch(`/api/companies/${currentCompanyId}/confirm-activities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messageId: msg.id,
              activitiesToCreate: msg.aiAnalysis.activitiesToCreate,
              updatesToApply: msg.aiAnalysis.updatesToApply || []
            })
          });

          if (confirmRes.ok) {
            const confirmData = await confirmRes.json();
            if (confirmData.allCards) {
              setCards(confirmData.allCards);
            }
            setLastAiAction({
              count: msg.aiAnalysis.activitiesToCreate.length,
              summary: msg.aiAnalysis.activitiesToCreate.map(a => a.title).join(', ')
            });
          }
        } else {
          setLastAiAction({
            count: 0,
            summary: msg.aiAnalysis?.rawOutput || 'Informação arquivada no histórico da frota.'
          });
        }

        if (data.companyContext) {
          setCompanyContext(data.companyContext);
        }
      }
    } catch (err) {
      console.error('Erro ao processar com IA:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Upload de PDF
  const handlePdfSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedPdf({
        name: file.name,
        sizeFormatted: (file.size / 1024).toFixed(1) + ' KB',
        base64: reader.result
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Drag & Drop
  const handleDragStart = (e, card) => {
    setDraggedCard(card);
    e.dataTransfer.setData('text/plain', card.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, zoneId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverZone !== zoneId) {
      setDragOverZone(zoneId);
    }
  };

  const handleDragLeave = (e, zoneId) => {
    if (dragOverZone === zoneId) {
      setDragOverZone(null);
    }
  };

  const handleDrop = async (e, targetStage, targetCompany = null) => {
    e.preventDefault();
    setDragOverZone(null);
    if (!draggedCard) return;

    const cardId = draggedCard.id;
    const oldCards = [...cards];

    setCards(prevCards =>
      prevCards.map(c => {
        if (c.id === cardId) {
          return {
            ...c,
            stage: targetStage,
            company: targetCompany ? targetCompany : c.company,
            returnDeadline: targetStage === 'Aguardando Retorno' ? (c.returnDeadline || '24h') : c.returnDeadline
          };
        }
        return c;
      })
    );

    setDraggedCard(null);

    try {
      const res = await fetch(`/api/cards/${cardId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: targetStage,
          returnDeadline: targetStage === 'Aguardando Retorno' ? '24h' : null
        })
      });
      if (!res.ok) setCards(oldCards);
    } catch (err) {
      console.error('Erro ao mover card:', err);
      setCards(oldCards);
    }
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDragOverZone(null);
  };

  // Exclusão manual
  const handleDeleteCard = async (e, cardId) => {
    e.stopPropagation();
    if (!window.confirm('Excluir este card?')) return;
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      if (res.ok) {
        setCards(prev => prev.filter(c => c.id !== cardId));
        if (activeCard && activeCard.id === cardId) setActiveCard(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Criação manual de card
  const handleCreateCardSubmit = async (e) => {
    e.preventDefault();
    if (!newCardModal.title.trim()) return;

    try {
      const targetComp = companies.find(c => c.name === selectedCompany);
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: selectedCompany,
          companyId: targetComp?.id || '',
          stage: newCardModal.stage,
          title: newCardModal.title.trim(),
          category: newCardModal.category,
          returnDeadline: newCardModal.returnDeadline,
          notes: newCardModal.notes
        })
      });

      if (res.ok) {
        const newCard = await res.json();
        setCards(prev => [...prev, newCard]);
        setNewCardModal(prev => ({ ...prev, isOpen: false, title: '', notes: '' }));
      }
    } catch (err) {
      console.error('Erro ao criar card manual:', err);
    }
  };

  // Criação de nova empresa
  const handleCreateCompanySubmit = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompanyName.trim(),
          vehiclesCount: Number(newCompanyFleet) || 1,
          selectedTemplateIds: catalog.map(r => r.id)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCompanies(prev => [...prev, data.company]);
        if (data.cards) setCards(prev => [...prev, ...data.cards]);
        setSelectedCompany(data.company.name);
        setNewCompanyModal(false);
        setNewCompanyName('');
      }
    } catch (err) {
      console.error('Erro ao criar empresa:', err);
    }
  };

  // E-mail formal
  const openEmailModal = (card) => {
    setEmailModal({
      isOpen: true,
      card,
      subject: `[COMUNICADO] ${card.title} - Frota ${card.company}`,
      body: `Prezado(a),\n\nInformamos que referente à rotina "${card.title}", precisamos do envio do comprovante até ${card.returnDeadline || 'o final do dia'}.\n\nAtenciosamente,\nEquipe Despachante StarTrek`,
      copied: false
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans flex flex-col antialiased">
      
      {/* ===================================================================== */}
      {/* 1. BARRA SUPERIOR MINIMALISTA (ESTILO NOTION / CLEAN DASHBOARD)       */}
      {/* ===================================================================== */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        
        {/* LOGO & SELETOR DE EMPRESA */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-black text-white text-xs font-bold flex items-center justify-center">
              ST
            </span>
            <span className="font-bold text-sm tracking-tight">StarTrek CRM</span>
          </div>

          <div className="h-4 w-px bg-slate-200"></div>

          {/* SELETOR DE EMPRESA CLEAN */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Empresa:</span>
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setActiveView('company');
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none transition"
            >
              {companies.map(comp => (
                <option key={comp.id} value={comp.name}>
                  {comp.name} ({comp.fleetCount || 0} veículos)
                </option>
              ))}
            </select>
          </div>

          {/* NAVEGAÇÃO DE VISÃO */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setActiveView('company')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                activeView === 'company' ? 'bg-white text-black shadow-xs font-semibold' : 'text-slate-500 hover:text-black'
              }`}
            >
              Quadro Kanban
            </button>
            <button
              onClick={() => setActiveView('matrix')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                activeView === 'matrix' ? 'bg-white text-black shadow-xs font-semibold' : 'text-slate-500 hover:text-black'
              }`}
            >
              Todas as Frotas
            </button>
          </div>
        </div>

        {/* LADO DIREITO: BUSCA & AÇÕES */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por placa ou título..."
            className="px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg w-48 focus:outline-none focus:border-slate-400 transition"
          />

          <button
            onClick={() => setNewCompanyModal(true)}
            className="px-2.5 py-1 text-xs text-slate-600 hover:text-black font-medium transition"
          >
            + Nova Frota
          </button>

          <button
            onClick={() => setNewCardModal({
              isOpen: true,
              stage: 'A Fazer',
              title: '',
              category: 'Multas',
              returnDeadline: 'Hoje às 17h',
              notes: ''
            })}
            className="px-3 py-1 text-xs bg-black hover:bg-slate-800 text-white font-medium rounded-lg transition"
          >
            + Card Manual
          </button>
        </div>

      </header>

      {/* ===================================================================== */}
      {/* 2. ÁREA DE COMANDO DA IA (O CORAÇÃO DO CRM INTELIGENTE)               */}
      {/* ===================================================================== */}
      {activeView === 'company' && (
        <section className="max-w-6xl w-full mx-auto px-6 pt-5 pb-2">
          
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-slate-800">
                  Organizador Inteligente — {selectedCompany}
                </span>
                <span className="text-[11px] text-slate-400">
                  (Cole conversas ou anexos e a IA organizará os cards nas colunas abaixo)
                </span>
              </div>

              {attachedPdf && (
                <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1.5 border border-slate-200">
                  📄 {attachedPdf.name}
                  <button onClick={() => setAttachedPdf(null)} className="text-slate-400 hover:text-rose-500">×</button>
                </span>
              )}
            </div>

            {/* CAMPO DE ENTRADA */}
            <form onSubmit={handleProcessWithAi} className="space-y-2.5">
              <textarea
                rows={2}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Cole aqui conversas do WhatsApp com o cliente, atas de reunião, ou multas..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-400 clean-scroll resize-none"
              />

              <div className="flex items-center justify-between">
                
                {/* BOTÕES RÁPIDOS DE COLE AQUI E PDF */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePasteHere}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition"
                    title="Ler e colar conteúdo da área de transferência"
                  >
                    📋 Cole Aqui
                  </button>

                  <label className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition border border-slate-200">
                    📎 Anexar PDF
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* BOTÃO DE PROCESSAR */}
                <button
                  type="submit"
                  disabled={aiLoading || (!aiInput.trim() && !attachedPdf)}
                  className="px-4 py-1.5 bg-black hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition disabled:opacity-40 flex items-center gap-1.5"
                >
                  {aiLoading ? (
                    <>Processando com IA...</>
                  ) : (
                    <>Organizar Cards com IA ↵</>
                  )}
                </button>

              </div>
            </form>

            {/* FEEDBACK DIRETO QUANDO A IA ORGANIZA */}
            {lastAiAction && (
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-slate-50/80 p-2 rounded-lg">
                <span className="flex items-center gap-1.5">
                  ✨ <strong>A IA organizou:</strong> {lastAiAction.summary}
                </span>
                <span className="text-[11px] text-slate-400">
                  Cards atualizados no Kanban abaixo. Você pode arrastá-los ou editá-los livremente.
                </span>
              </div>
            )}

          </div>

        </section>
      )}

      {/* ===================================================================== */}
      {/* 3. QUADRO KANBAN ULTRA-MINIMALISTA (COM CONTROLE MANUAL TOTAL)        */}
      {/* ===================================================================== */}
      {activeView === 'company' && (
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-4 flex gap-4 overflow-x-auto clean-scroll">
          
          {STAGES.map(stage => {
            const stageCards = visibleCards.filter(c => c.stage === stage);
            const zoneId = `kanban-${stage}`;
            const isOver = dragOverZone === zoneId;

            return (
              <div
                key={stage}
                className="flex-1 min-w-[240px] flex flex-col bg-slate-100/70 rounded-xl p-3 border border-slate-200/70"
              >
                {/* CABEÇALHO DA COLUNA */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{stage}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200">
                      {stageCards.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setNewCardModal({
                      isOpen: true,
                      stage,
                      title: '',
                      category: 'Multas',
                      returnDeadline: 'Hoje às 17h',
                      notes: ''
                    })}
                    className="text-xs text-slate-400 hover:text-black font-semibold"
                    title={`Adicionar card em ${stage}`}
                  >
                    +
                  </button>
                </div>

                {/* LISTA DE CARDS (DRAGGABLE) */}
                <div
                  className={`flex-1 space-y-2.5 overflow-y-auto clean-scroll drop-zone p-1 rounded-lg ${
                    isOver ? 'drag-over' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, zoneId)}
                  onDragLeave={(e) => handleDragLeave(e, zoneId)}
                  onDrop={(e) => handleDrop(e, stage, selectedCompany)}
                >
                  {stageCards.map(card => (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setActiveCard(card)}
                      className={`minimal-card p-3 space-y-2 ${draggedCard?.id === card.id ? 'dragging' : ''}`}
                    >
                      {/* TÍTULO E AÇÃO DE EXCLUIR */}
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                          {card.title}
                        </h4>
                        <button
                          onClick={(e) => handleDeleteCard(e, card.id)}
                          className="text-slate-300 hover:text-rose-600 text-xs p-0.5"
                          title="Excluir"
                        >
                          ×
                        </button>
                      </div>

                      {/* TAGS SUTIS */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {card.category}
                        </span>

                        <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-700 font-mono border border-slate-200">
                          {card.returnDeadline || 'Hoje'}
                        </span>

                        {card.source === 'ai_chat' && (
                          <span className="text-emerald-700 font-medium">
                            ✨ IA
                          </span>
                        )}
                      </div>

                      {/* RODAPÉ DO CARD */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate">{card.responsible || card.company}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEmailModal(card);
                            }}
                            className="hover:text-black"
                            title="Gerar e-mail"
                          >
                            ✉
                          </button>
                          <span className="hover:text-black">Detalhes →</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {stageCards.length === 0 && (
                    <div className="h-20 border border-dashed border-slate-300/80 rounded-lg flex items-center justify-center text-[11px] text-slate-400">
                      Vazio • Arraste ou use +
                    </div>
                  )}
                </div>

                {/* BOTÃO DISCRETO NO PÉ DA COLUNA */}
                <button
                  onClick={() => setNewCardModal({
                    isOpen: true,
                    stage,
                    title: '',
                    category: 'Multas',
                    returnDeadline: 'Hoje às 17h',
                    notes: ''
                  })}
                  className="mt-2 py-1 text-center text-xs text-slate-500 hover:text-black font-medium hover:bg-slate-200/50 rounded-lg transition"
                >
                  + Adicionar
                </button>
              </div>
            );
          })}

        </main>
      )}

      {/* ===================================================================== */}
      {/* 4. TABELA DE TODAS AS FROTAS (BATALHA NAVAL MINIMALISTA)             */}
      {/* ===================================================================== */}
      {activeView === 'matrix' && (
        <section className="max-w-6xl w-full mx-auto px-6 py-6 flex-1">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Empresa / Frota</span>
              <div className="flex gap-12 mr-8">
                <span>A Fazer</span>
                <span>Em Andamento</span>
                <span>Aguardando</span>
                <span>Ação</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {companies.map(company => {
                const compCards = cards.filter(c => c.company === company.name || c.companyId === company.id);
                const todoCount = compCards.filter(c => c.stage === 'A Fazer').length;
                const inProgCount = compCards.filter(c => c.stage === 'Em Andamento').length;
                const waitCount = compCards.filter(c => c.stage === 'Aguardando Retorno').length;

                return (
                  <div key={company.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                    <div>
                      <h4 className="font-bold text-slate-900">{company.name}</h4>
                      <span className="text-slate-400 text-[11px]">{company.fleetCount || 0} veículos</span>
                    </div>

                    <div className="flex items-center gap-14">
                      <span className="font-mono text-slate-700 w-8 text-center">{todoCount}</span>
                      <span className="font-mono text-slate-700 w-8 text-center">{inProgCount}</span>
                      <span className="font-mono text-slate-700 w-8 text-center">{waitCount}</span>
                      <button
                        onClick={() => {
                          setSelectedCompany(company.name);
                          setActiveView('company');
                        }}
                        className="px-3 py-1 bg-black hover:bg-slate-800 text-white rounded-md text-xs font-medium transition"
                      >
                        Abrir Kanban
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* 5. MODAIS SIMPLES E DIRETOS AO PONTO                                 */}
      {/* ===================================================================== */}

      {/* MODAL DETALHES DO CARD */}
      {activeCard && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{activeCard.category}</span>
                <h3 className="text-sm font-bold text-slate-900">{activeCard.title}</h3>
              </div>
              <button onClick={() => setActiveCard(null)} className="text-slate-400 hover:text-black font-bold">×</button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div><strong>Empresa:</strong> {activeCard.company}</div>
              <div><strong>Estágio:</strong> {activeCard.stage}</div>
              <div><strong>Prazo:</strong> {activeCard.returnDeadline || 'Hoje'}</div>
              <div><strong>Responsável:</strong> {activeCard.responsible || 'Geral'}</div>
            </div>

            {/* AÇÃO DA IA NO CARD */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <span className="font-bold text-slate-800 block">🤖 O que você fez neste processo?</span>
              <p className="text-[11px] text-slate-500">
                Ex: "cliente enviou comprovante", "protocolo entregue no Detran"
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cardActionText}
                  onChange={(e) => setCardActionText(e.target.value)}
                  placeholder="Digite aqui..."
                  className="flex-1 bg-white border border-slate-200 rounded-md px-2.5 py-1 text-xs"
                />
                <button
                  onClick={async () => {
                    if (!cardActionText.trim()) return;
                    setCardActionLoading(true);
                    try {
                      const res = await fetch('/api/ai/card-action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cardId: activeCard.id, userActionText: cardActionText })
                      });
                      const data = await res.json();
                      setCardActionAdvice(data);
                      if (data.updatedCard) {
                        setCards(prev => prev.map(c => c.id === data.updatedCard.id ? data.updatedCard : c));
                        setActiveCard(data.updatedCard);
                      }
                      setCardActionText('');
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setCardActionLoading(false);
                    }
                  }}
                  className="px-3 py-1 bg-black text-white rounded-md font-semibold"
                >
                  {cardActionLoading ? '...' : 'Salvar'}
                </button>
              </div>

              {cardActionAdvice && (
                <div className="text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200 mt-1">
                  <strong>Orientação da IA:</strong> {cardActionAdvice.advice}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => openEmailModal(activeCard)}
                className="text-slate-600 hover:text-black underline"
              >
                Gerar E-mail
              </button>
              <button
                onClick={() => setActiveCard(null)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO CARD MANUAL */}
      {newCardModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={handleCreateCardSubmit} className="bg-white rounded-xl max-w-sm w-full p-5 border border-slate-200 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Novo Card para {selectedCompany}</h3>
              <button type="button" onClick={() => setNewCardModal(prev => ({ ...prev, isOpen: false }))}>×</button>
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Título:</label>
              <input
                type="text"
                required
                value={newCardModal.title}
                onChange={(e) => setNewCardModal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Defesa Prévia Placa BRA2E19"
                className="w-full border border-slate-200 rounded-md p-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 mb-1">Categoria:</label>
                <select
                  value={newCardModal.category}
                  onChange={(e) => setNewCardModal(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-slate-200 rounded-md p-2 bg-white"
                >
                  <option value="Multas">Multas</option>
                  <option value="Licenciamento">Licenciamento</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="ANTT">ANTT</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Prazo:</label>
                <input
                  type="text"
                  value={newCardModal.returnDeadline}
                  onChange={(e) => setNewCardModal(prev => ({ ...prev, returnDeadline: e.target.value }))}
                  className="w-full border border-slate-200 rounded-md p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewCardModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 bg-slate-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-black text-white rounded-md font-semibold"
              >
                Salvar Card
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL NOVA EMPRESA */}
      {newCompanyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={handleCreateCompanySubmit} className="bg-white rounded-xl max-w-sm w-full p-5 border border-slate-200 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Cadastrar Nova Frota</h3>
              <button type="button" onClick={() => setNewCompanyModal(false)}>×</button>
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Nome da Empresa:</label>
              <input
                type="text"
                required
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Ex: Transportadora Santos"
                className="w-full border border-slate-200 rounded-md p-2"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Veículos:</label>
              <input
                type="number"
                min="1"
                value={newCompanyFleet}
                onChange={(e) => setNewCompanyFleet(e.target.value)}
                className="w-full border border-slate-200 rounded-md p-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewCompanyModal(false)}
                className="px-3 py-1.5 bg-slate-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-black text-white rounded-md font-semibold"
              >
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL E-MAIL */}
      {emailModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Minuta de E-mail</h3>
              <button onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}>×</button>
            </div>

            <div>
              <label className="block font-semibold mb-1">Assunto:</label>
              <input
                type="text"
                value={emailModal.subject}
                onChange={(e) => setEmailModal(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full border border-slate-200 rounded-md p-2"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Mensagem:</label>
              <textarea
                rows={5}
                value={emailModal.body}
                onChange={(e) => setEmailModal(prev => ({ ...prev, body: e.target.value }))}
                className="w-full border border-slate-200 rounded-md p-2 clean-scroll"
              />
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${emailModal.subject}\n\n${emailModal.body}`);
                  setEmailModal(prev => ({ ...prev, copied: true }));
                  setTimeout(() => setEmailModal(prev => ({ ...prev, copied: false })), 2000);
                }}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-md font-semibold"
              >
                {emailModal.copied ? '✔ Copiado!' : 'Copiar Texto'}
              </button>

              <button
                onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 bg-slate-100 rounded-md"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
