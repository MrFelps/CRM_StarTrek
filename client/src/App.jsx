import React, { useState, useEffect, useMemo, useRef } from 'react';

const STAGES = ['A Fazer', 'Em Andamento', 'Aguardando Retorno', 'Finalizados'];

export default function App() {
  const [companies, setCompanies] = useState([]);
  const [cards, setCards] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navegação: 'matrix' (Todas as empresas) ou 'company' (Visão individual)
  const [activeView, setActiveView] = useState('matrix');
  const [selectedCompany, setSelectedCompany] = useState('');

  // Modo de exibição dentro da empresa: 'split' (Kanban + Chat), 'kanban' (só kanban), 'chat' (só central operacional)
  const [companyViewMode, setCompanyViewMode] = useState('split');

  // Mensagens e Memória Operacional por empresa
  const [companyMessages, setCompanyMessages] = useState({});
  const [companyContext, setCompanyContext] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  // Dropdown do menu '+' no painel geral
  const [generalMenuOpen, setGeneralMenuOpen] = useState(false);

  // Drag and drop state
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);

  // Modais
  const [activeCard, setActiveCard] = useState(null);
  const [cardAiInput, setCardAiInput] = useState('');
  const [cardAiFeedback, setCardAiFeedback] = useState(null);
  const [cardAiLoading, setCardAiLoading] = useState(false);

  // Email preparer modal
  const [emailModal, setEmailModal] = useState({
    isOpen: false,
    card: null,
    subject: '',
    body: '',
    copied: false,
    loading: false
  });

  // Entrada de Chat da Empresa
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Anexo de arquivo PDF para a IA
  const [attachedPdf, setAttachedPdf] = useState(null); // { name, sizeFormatted, base64 }
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Modal: Nova Empresa com seleção de rotinas
  const [newCompanyModal, setNewCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyFleet, setNewCompanyFleet] = useState(15);
  const [selectedRoutines, setSelectedRoutines] = useState([]);

  // Modal: Novo Card (Geral para todas ou Individual para empresa atual)
  const [newCardModal, setNewCardModal] = useState({
    isOpen: false,
    isBroadcast: false,
    title: '',
    category: 'Multas',
    frequency: 'Semanal',
    returnDeadline: '14/09 às 17h',
    technique: '',
    notes: ''
  });

  // Modal: Relatório Diário com Calendário e Técnicas
  const [dailyReportModal, setDailyReportModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('15/09/2026');
  const [dailyAiSummary, setDailyAiSummary] = useState('');
  const [dailyAiLoading, setDailyAiLoading] = useState(false);

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
      setSelectedRoutines(catData.map(r => r.id));
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carrega mensagens e contexto ao selecionar uma empresa
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
      console.error('Erro ao carregar mensagens da empresa:', err);
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      loadCompanyData(selectedCompany);
    }
  }, [selectedCompany, companies]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [companyMessages, chatLoading]);

  // Helper para obter ID da empresa selecionada
  const currentCompanyObj = useMemo(() => {
    return companies.find(c => c.name === selectedCompany || c.id === selectedCompany) || null;
  }, [companies, selectedCompany]);

  const currentCompanyId = currentCompanyObj?.id || selectedCompany;

  // --- EXCLUSÃO DE CARD ---
  const handleDeleteCard = async (e, cardId) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir este card?')) return;

    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      if (res.ok) {
        setCards(prev => prev.filter(c => c.id !== cardId));
        if (activeCard && activeCard.id === cardId) {
          setActiveCard(null);
        }
      }
    } catch (err) {
      console.error('Erro ao excluir card:', err);
    }
  };

  // --- DRAG & DROP HANDLERS ---
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
      if (!res.ok) {
        setCards(oldCards);
      } else {
        const updated = await res.json();
        setCards(prev => prev.map(c => c.id === updated.id ? updated : c));
      }
    } catch (err) {
      console.error('Erro ao mover card:', err);
      setCards(oldCards);
    }
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDragOverZone(null);
  };

  // --- NAVEGAÇÃO ENTRE TELAS ---
  const showMatrixView = () => {
    setActiveView('matrix');
    setSelectedCompany('');
    setGeneralMenuOpen(false);
  };

  const handleCompanySelectChange = (companyName) => {
    setGeneralMenuOpen(false);
    if (!companyName) {
      showMatrixView();
    } else {
      setSelectedCompany(companyName);
      setActiveView('company');
      loadCompanyData(companyName);
    }
  };

  // --- CRIAÇÃO DE NOVA EMPRESA COM ROTINAS SELECIONADAS ---
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
          selectedTemplateIds: selectedRoutines
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCompanies(prev => [...prev, data.company]);
        if (data.cards && data.cards.length > 0) {
          setCards(prev => [...prev, ...data.cards]);
        }
        setNewCompanyModal(false);
        setNewCompanyName('');
        setNewCompanyFleet(15);
      }
    } catch (err) {
      console.error('Erro ao criar empresa:', err);
    }
  };

  const toggleRoutineSelection = (routineId) => {
    setSelectedRoutines(prev =>
      prev.includes(routineId) ? prev.filter(id => id !== routineId) : [...prev, routineId]
    );
  };

  // --- CRIAÇÃO DE NOVO CARD (GERAL OU INDIVIDUAL) ---
  const handleCreateCardSubmit = async (e) => {
    e.preventDefault();
    if (!newCardModal.title.trim()) return;

    try {
      if (newCardModal.isBroadcast) {
        const res = await fetch('/api/cards/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardData: {
              title: newCardModal.title.trim(),
              category: newCardModal.category,
              routineFrequency: newCardModal.frequency,
              returnDeadline: newCardModal.returnDeadline,
              technique: newCardModal.technique,
              notes: newCardModal.notes
            }
          })
        });
        if (res.ok) {
          const createdCards = await res.json();
          setCards(prev => [...prev, ...createdCards]);
        }
      } else {
        const targetComp = companies.find(c => c.name === selectedCompany);
        const res = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: selectedCompany,
            companyId: targetComp?.id || '',
            title: newCardModal.title.trim(),
            category: newCardModal.category,
            routineFrequency: newCardModal.frequency,
            returnDeadline: newCardModal.returnDeadline,
            technique: newCardModal.technique,
            notes: newCardModal.notes
          })
        });
        if (res.ok) {
          const newCard = await res.json();
          setCards(prev => [...prev, newCard]);
        }
      }

      setNewCardModal(prev => ({ ...prev, isOpen: false, title: '', technique: '', notes: '' }));
    } catch (err) {
      console.error('Erro ao criar card:', err);
    }
  };

  // --- MODAL DE DETALHE DO CARD ---
  const openCardModal = (card) => {
    setActiveCard(card);
    setCardAiInput('');
    setCardAiFeedback(null);
  };

  const closeCardModal = () => {
    setActiveCard(null);
    setCardAiFeedback(null);
  };

  const toggleChecklistItem = async (cardId, itemIndex) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || !card.checklist) return;

    const updatedChecklist = card.checklist.map((item, idx) => {
      if (idx === itemIndex) return { ...item, done: !item.done };
      return item;
    });

    setCards(prev => prev.map(c => c.id === cardId ? { ...c, checklist: updatedChecklist } : c));
    if (activeCard && activeCard.id === cardId) {
      setActiveCard(prev => ({ ...prev, checklist: updatedChecklist }));
    }

    try {
      await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist: updatedChecklist })
      });
    } catch (err) {
      console.error('Erro ao atualizar checklist:', err);
    }
  };

  // IA dentro do card: "O que você fez" -> Orientação e movimentação
  const handleCardAiSubmit = async (e) => {
    e.preventDefault();
    if (!cardAiInput.trim() || !activeCard) return;

    setCardAiLoading(true);
    try {
      const res = await fetch('/api/ai/card-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: activeCard.id,
          userActionText: cardAiInput
        })
      });
      const data = await res.json();
      setCardAiFeedback(data);

      if (data.updatedCard) {
        setCards(prev => prev.map(c => c.id === data.updatedCard.id ? data.updatedCard : c));
        setActiveCard(data.updatedCard);
      }
      setCardAiInput('');
    } catch (err) {
      console.error('Erro na IA do card:', err);
    } finally {
      setCardAiLoading(false);
    }
  };

  // --- PREPARAR E-MAIL FORMAL ---
  const openEmailPreparer = async (card) => {
    setEmailModal({
      isOpen: true,
      card,
      subject: `[COMUNICADO] ${card.title} - Frota ${card.company}`,
      body: `Prezado Setor Financeiro,\n\nIdentificamos pendências operacionais referentes a "${card.title}".\n\nPor favor, nos enviem o retorno/comprovante até amanhã às 17h para que possamos protocolar a baixa no órgão responsável.\n\nAtenciosamente,\nEquipe Despachante`,
      copied: false,
      loading: true
    });

    try {
      const res = await fetch('/api/ai/prepare-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardTitle: card.title,
          companyName: card.company,
          category: card.category,
          notes: card.notes || ''
        })
      });
      const data = await res.json();
      setEmailModal(prev => ({
        ...prev,
        subject: data.subject || prev.subject,
        body: data.body || prev.body,
        loading: false
      }));
    } catch (err) {
      console.warn('Usando minuta padrão de e-mail:', err);
      setEmailModal(prev => ({ ...prev, loading: false }));
    }
  };

  const copyEmailToClipboard = () => {
    const fullText = `Assunto: ${emailModal.subject}\n\n${emailModal.body}`;
    navigator.clipboard.writeText(fullText);
    setEmailModal(prev => ({ ...prev, copied: true }));
    setTimeout(() => {
      setEmailModal(prev => ({ ...prev, copied: false }));
    }, 2500);
  };

  // --- RELATÓRIO DIÁRIO & CALENDÁRIO ---
  const handleGenerateDailyAiSummary = async () => {
    setDailyAiLoading(true);
    try {
      const res = await fetch('/api/ai/daily-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          cards: cards
        })
      });
      const data = await res.json();
      setDailyAiSummary(data.summary);
    } catch (err) {
      console.error('Erro na síntese do dia:', err);
      setDailyAiSummary('Não foi possível gerar a síntese com a IA. As rotinas prioritárias continuam listadas abaixo.');
    } finally {
      setDailyAiLoading(false);
    }
  };

  const dailyCards = useMemo(() => {
    return cards.filter(c => c.stage !== 'Finalizados').slice(0, 8);
  }, [cards]);

  // --- SELEÇÃO DE ARQUIVO PDF ---
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor, selecione um arquivo no formato PDF.');
      return;
    }

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

  const removeAttachedPdf = () => {
    setAttachedPdf(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- CENTRAL OPERACIONAL (ENVIO DE MENSAGENS / TRANSCRIÇÕES / REUNIÕES COM 9ROUTER) ---
  const handleOperationalMessageSubmit = async (e, overrideText = null) => {
    if (e) e.preventDefault();
    const textToSend = overrideText || chatInput;
    if ((!textToSend.trim() && !attachedPdf) || !currentCompanyId) return;

    const fileToSend = attachedPdf;
    setChatInput('');
    setAttachedPdf(null);
    setChatLoading(true);

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
        setCompanyMessages(prev => {
          const currentList = prev[currentCompanyId] || [];
          return {
            ...prev,
            [currentCompanyId]: [...currentList, data.message]
          };
        });
        if (data.companyContext) {
          setCompanyContext(data.companyContext);
        }
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem operacional:', err);
    } finally {
      setChatLoading(false);
    }
  };

  // --- CONFIRMAÇÃO DE ATIVIDADES IDENTIFICADAS PELA IA ---
  const handleConfirmActivities = async (messageId, activitiesToCreate, updatesToApply) => {
    if (!currentCompanyId) return;

    try {
      const res = await fetch(`/api/companies/${currentCompanyId}/confirm-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          activitiesToCreate,
          updatesToApply
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.allCards) {
          setCards(data.allCards);
        }
        // Atualiza status da mensagem localmente para 'applied'
        setCompanyMessages(prev => {
          const list = prev[currentCompanyId] || [];
          return {
            ...prev,
            [currentCompanyId]: list.map(m => {
              if (m.id === messageId && m.aiAnalysis) {
                return {
                  ...m,
                  aiAnalysis: { ...m.aiAnalysis, status: 'applied' }
                };
              }
              return m;
            })
          };
        });
        if (data.companyContext) {
          setCompanyContext(data.companyContext);
        }
      }
    } catch (err) {
      console.error('Erro ao confirmar atividades:', err);
    }
  };

  const handleDismissAnalysis = (messageId) => {
    setCompanyMessages(prev => {
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(m => {
          if (m.id === messageId && m.aiAnalysis) {
            return {
              ...m,
              aiAnalysis: { ...m.aiAnalysis, status: 'dismissed' }
            };
          }
          return m;
        })
      };
    });
  };

  // Mensagens da empresa selecionada
  const activeMessages = useMemo(() => {
    return companyMessages[currentCompanyId] || [];
  }, [companyMessages, currentCompanyId]);

  return (
    <div className="min-h-screen text-neutral-200 antialiased select-none font-sans overflow-hidden flex flex-col justify-between relative bg-[#0c0c0e]">
      
      {/* CENÁRIO DE FUNDO TRANSLÚCIDO CINZA DARK (SEM TOM AZUL) */}
      <div className="absolute inset-0 z-0 bg-[#0c0c0e] bg-[radial-gradient(ellipse_at_top,_#25252b_0%,_#141417_50%,_#0a0a0c_100%)]" />

      {/* APLICAÇÃO CRM COM FUNDO FOSCO */}
      <main className="relative z-10 flex-1 p-4 flex items-center justify-center overflow-hidden">
        <div className="frosted-window rounded-2xl w-full max-w-[1520px] h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-white/10">

          {/* ===================================================================== */}
          {/* TOPO: SELETOR, NAVEGAÇÃO E AÇÕES GERAIS                               */}
          {/* ===================================================================== */}
          <header className="px-6 py-2.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            
            <div className="flex items-center gap-3">
              {/* Botão de Visão Geral (Batalha Naval) */}
              <button
                onClick={showMatrixView}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  activeView === 'matrix'
                    ? 'bg-white/15 text-white border border-white/20 shadow-sm'
                    : 'bg-white/[0.04] text-neutral-400 border border-white/5 hover:bg-white/10 hover:text-neutral-200'
                }`}
              >
                <i className="fa-solid fa-table-cells-large text-[11px]"></i>
                <span>Todas as Empresas</span>
              </button>

              {/* Seletor de Empresa */}
              <div className="relative">
                <select
                  value={selectedCompany}
                  onChange={(e) => handleCompanySelectChange(e.target.value)}
                  className="appearance-none bg-neutral-900/80 hover:bg-neutral-800/90 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-white/30 cursor-pointer min-w-[220px]"
                >
                  <option value="" className="bg-neutral-900 text-neutral-300">Selecione uma empresa...</option>
                  {companies.map(comp => (
                    <option key={comp.id} value={comp.name} className="bg-neutral-900 text-neutral-300">
                      {comp.name} {comp.fleetCount ? `(${comp.fleetCount} veíc.)` : ''}
                    </option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-3 top-2.5 text-neutral-400 text-[9px] pointer-events-none"></i>
              </div>

              {/* Se estiver dentro de uma empresa, exibe o seletor de abas */}
              {activeView === 'company' && (
                <div className="flex items-center gap-1 bg-neutral-900/80 p-0.5 rounded-lg border border-white/5 ml-2 text-xs">
                  <button
                    onClick={() => setCompanyViewMode('split')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1.5 ${
                      companyViewMode === 'split' ? 'bg-white/15 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <i className="fa-solid fa-columns text-[10px]"></i>
                    <span>Kanban + Chat</span>
                  </button>
                  <button
                    onClick={() => setCompanyViewMode('kanban')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1.5 ${
                      companyViewMode === 'kanban' ? 'bg-white/15 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <i className="fa-solid fa-table-columns text-[10px]"></i>
                    <span>Só Kanban</span>
                  </button>
                  <button
                    onClick={() => setCompanyViewMode('chat')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1.5 ${
                      companyViewMode === 'chat' ? 'bg-white/15 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <i className="fa-solid fa-comments text-[10px]"></i>
                    <span>Central & Memória</span>
                    {activeMessages.length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-neutral-800 text-[9px] flex items-center justify-center text-neutral-300">
                        {activeMessages.length}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* BOTÃO AÇÕES NO PAINEL GERAL */}
              {activeView === 'matrix' && (
                <div className="relative">
                  <button
                    onClick={() => setGeneralMenuOpen(!generalMenuOpen)}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                  >
                    <i className="fa-solid fa-plus text-[10px]"></i>
                    <span>Ações</span>
                    <i className="fa-solid fa-chevron-down text-[8px] text-neutral-400 ml-0.5"></i>
                  </button>

                  {generalMenuOpen && (
                    <div className="absolute left-0 mt-2 w-64 bg-[#18181b] border border-neutral-700/80 rounded-xl shadow-2xl py-1.5 z-50 text-xs text-neutral-200">
                      <button
                        onClick={() => {
                          setGeneralMenuOpen(false);
                          setDailyReportModal(true);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-neutral-200"
                      >
                        <i className="fa-solid fa-calendar-day text-neutral-400 text-xs w-4"></i>
                        <div>
                          <p className="font-medium text-white">Relatório Diário & Calendário</p>
                          <p className="text-[10px] text-neutral-400">Pauta e técnicas recomendadas do dia</p>
                        </div>
                      </button>

                      <div className="h-px bg-neutral-800 my-1"></div>

                      <button
                        onClick={() => {
                          setGeneralMenuOpen(false);
                          setNewCompanyModal(true);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-neutral-200"
                      >
                        <i className="fa-solid fa-building text-neutral-400 text-xs w-4"></i>
                        <div>
                          <p className="font-medium text-white">Nova Empresa / Frota</p>
                          <p className="text-[10px] text-neutral-400">Cadastrar e aplicar rotinas padrão</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setGeneralMenuOpen(false);
                          setNewCardModal({
                            isOpen: true,
                            isBroadcast: true,
                            title: '',
                            category: 'Multas',
                            frequency: 'Semanal',
                            returnDeadline: '14/09 às 17h',
                            technique: '',
                            notes: ''
                          });
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-neutral-200"
                      >
                        <i className="fa-solid fa-bullhorn text-neutral-400 text-xs w-4"></i>
                        <div>
                          <p className="font-medium text-white">Nova Atividade Geral (Broadcast)</p>
                          <p className="text-[10px] text-neutral-400">Criar card para todas as empresas</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Lado Direito do Topo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>9Router Ativo</span>
              </div>
            </div>
          </header>

          {/* ===================================================================== */}
          {/* TELA 1: BATALHA NAVAL (VISÃO GERAL MULTI-EMPRESAS)                    */}
          {/* ===================================================================== */}
          {activeView === 'matrix' && (
            <section className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
              
              {/* Cabeçalho das 4 Colunas */}
              <div className="grid grid-cols-9 gap-2 px-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-xs font-semibold text-neutral-300">
                <div className="col-span-2 flex items-center gap-2">
                  <i className="fa-solid fa-building text-neutral-400"></i>
                  <span>Empresas / Frotas</span>
                </div>
                <div className="col-span-2 text-center text-neutral-400">A Fazer</div>
                <div className="col-span-2 text-center text-neutral-400">Em Andamento</div>
                <div className="col-span-3 text-center text-amber-300 flex items-center justify-center gap-1.5">
                  <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                  <span>Aguardando Retorno</span>
                </div>
              </div>

              {/* Matriz Batalha Naval */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
                {companies.map(company => {
                  const compCards = cards.filter(c => c.company === company.name || c.companyId === company.id);
                  const openCount = compCards.filter(c => c.stage !== 'Finalizados').length;
                  const waitingCount = compCards.filter(c => c.stage === 'Aguardando Retorno').length;

                  return (
                    <div
                      key={company.id}
                      className="grid grid-cols-9 gap-2 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.035] border border-white/5 transition items-start"
                    >
                      {/* Coluna da Empresa */}
                      <div className="col-span-2 p-2 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1">
                        <button
                          onClick={() => handleCompanySelectChange(company.name)}
                          className="font-medium text-xs text-white hover:text-neutral-300 text-left flex items-center justify-between w-full group"
                        >
                          <span className="truncate">{company.name}</span>
                          <i className="fa-solid fa-arrow-right text-[10px] text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition"></i>
                        </button>

                        <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                          <span>{company.fleetCount || 0} veículos</span>
                          <span>•</span>
                          <span className={waitingCount > 0 ? 'text-amber-300 font-mono' : 'text-neutral-500'}>
                            {waitingCount} aguardando
                          </span>
                        </div>
                      </div>

                      {/* As 3 Colunas Principais de Cards */}
                      {['A Fazer', 'Em Andamento', 'Aguardando Retorno'].map(stage => {
                        const stageCards = compCards.filter(c => c.stage === stage);
                        const zoneId = `matrix-${company.id}-${stage}`;
                        const isOver = dragOverZone === zoneId;
                        const colSpan = stage === 'Aguardando Retorno' ? 'col-span-3' : 'col-span-2';

                        return (
                          <div
                            key={stage}
                            className={`${colSpan} drop-zone p-1.5 rounded-lg border space-y-2 ${
                              isOver ? 'drag-over border-white/30 bg-white/[0.06]' : 'border-transparent'
                            }`}
                            onDragOver={(e) => handleDragOver(e, zoneId)}
                            onDragLeave={(e) => handleDragLeave(e, zoneId)}
                            onDrop={(e) => handleDrop(e, stage, company.name)}
                          >
                            {stageCards.map(card => (
                              <div
                                key={card.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, card)}
                                onDragEnd={handleDragEnd}
                                className={`minimal-card p-2.5 rounded-lg group relative ${
                                  card.stage === 'Aguardando Retorno' ? 'border-l-2 border-l-neutral-300' : ''
                                } ${draggedCard?.id === card.id ? 'dragging' : ''}`}
                              >
                                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                                  <div className="flex items-center gap-1.5">
                                    <span>{card.category}</span>
                                    {card.source === 'ai_chat' && (
                                      <span className="px-1 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-[9px] text-neutral-300 font-mono">
                                        Chat
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {card.stage === 'Aguardando Retorno' ? (
                                      <span className="text-neutral-300 font-mono">
                                        {card.returnDeadline || '24h'}
                                      </span>
                                    ) : (
                                      <span>{card.responsible || card.routineFrequency || 'Rotina'}</span>
                                    )}
                                    <button
                                      onClick={(e) => handleDeleteCard(e, card.id)}
                                      title="Excluir card"
                                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-neutral-500 transition p-0.5"
                                    >
                                      <i className="fa-solid fa-trash-can text-[9px]"></i>
                                    </button>
                                  </div>
                                </div>

                                <h4 className="text-xs text-neutral-100 font-medium mt-1">
                                  {card.title}
                                </h4>

                                <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-400">
                                  <button
                                    onClick={() => openCardModal(card)}
                                    className="hover:text-white cursor-pointer underline text-left"
                                  >
                                    Abrir detalhes
                                  </button>
                                  <button
                                    onClick={() => openEmailPreparer(card)}
                                    className="text-neutral-300 hover:text-white px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 flex items-center gap-1 transition"
                                  >
                                    <i className="fa-solid fa-envelope text-[9px]"></i>
                                    <span>{card.stage === 'Aguardando Retorno' ? 'Cobrar' : 'E-mail'}</span>
                                  </button>
                                </div>
                              </div>
                            ))}

                            {stageCards.length === 0 && (
                              <div className="h-12 border border-dashed border-white/5 rounded-lg flex items-center justify-center text-[10px] text-neutral-600 pointer-events-none">
                                Solte aqui
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

            </section>
          )}

          {/* ===================================================================== */}
          {/* TELA 2: CENTRAL OPERACIONAL DA EMPRESA (KANBAN + CHAT/MEMÓRIA)        */}
          {/* ===================================================================== */}
          {activeView === 'company' && (
            <section className="flex-1 flex flex-col overflow-hidden">
              
              {/* Barra superior com Informações da Empresa */}
              <div className="px-6 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={showMatrixView}
                    className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-neutral-300 flex items-center gap-1.5 transition"
                  >
                    <i className="fa-solid fa-arrow-left text-[10px]"></i>
                    <span>Todas as Empresas</span>
                  </button>
                  <div>
                    <h2 className="font-semibold text-white text-xs">{selectedCompany}</h2>
                    <p className="text-[10px] text-neutral-400">
                      {currentCompanyObj?.fleetCount || 0} veículos cadastrados • Central Operacional 9Router
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setNewCardModal({
                        isOpen: true,
                        isBroadcast: false,
                        title: '',
                        category: 'Multas',
                        frequency: 'Semanal',
                        returnDeadline: '14/09 às 17h',
                        technique: '',
                        notes: ''
                      });
                    }}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-medium border border-neutral-700 flex items-center gap-1 transition"
                  >
                    <i className="fa-solid fa-plus text-[9px]"></i>
                    <span>Criar Card Manual</span>
                  </button>
                </div>
              </div>

              {/* Corpo Principal Dividido: Kanban (Esquerda) + Central de Conversa & Memória (Direita) */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* 1. QUADRO KANBAN DA EMPRESA */}
                {(companyViewMode === 'split' || companyViewMode === 'kanban') && (
                  <div className={`${companyViewMode === 'split' ? 'flex-1' : 'w-full'} p-3.5 overflow-x-auto custom-scrollbar grid grid-cols-4 gap-3 bg-black/10`}>
                    {STAGES.map(stage => {
                      const stageCards = cards.filter(
                        c => (c.company === selectedCompany || c.companyId === currentCompanyId) && c.stage === stage
                      );
                      const zoneId = `company-${stage}`;
                      const isOver = dragOverZone === zoneId;

                      return (
                        <div
                          key={stage}
                          className={`flex flex-col h-full rounded-xl bg-white/[0.02] border p-2.5 space-y-2 ${
                            isOver ? 'drag-over border-white/30 bg-white/[0.05]' : 'border-white/5'
                          }`}
                          onDragOver={(e) => handleDragOver(e, zoneId)}
                          onDragLeave={(e) => handleDragLeave(e, zoneId)}
                          onDrop={(e) => handleDrop(e, stage, selectedCompany)}
                        >
                          {/* Topo da Coluna */}
                          <div className="flex items-center justify-between pb-1.5 border-b border-white/5 text-xs">
                            <span className="font-semibold text-neutral-300">{stage}</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-[10px] text-neutral-400 font-mono">
                              {stageCards.length}
                            </span>
                          </div>

                          {/* Lista de Cards da Coluna */}
                          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-0.5">
                            {stageCards.map(card => (
                              <div
                                key={card.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, card)}
                                onDragEnd={handleDragEnd}
                                className={`minimal-card p-2.5 rounded-lg group relative ${
                                  card.stage === 'Aguardando Retorno' ? 'border-l-2 border-l-amber-300' : ''
                                } ${card.stage === 'Finalizados' ? 'opacity-60' : ''} ${
                                  draggedCard?.id === card.id ? 'dragging' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-neutral-300">{card.category}</span>
                                    {card.source === 'ai_chat' && (
                                      <button
                                        onClick={() => {
                                          setCompanyViewMode('split');
                                          setHighlightedMessageId(card.sourceMessageId);
                                        }}
                                        title="Clique para ver a mensagem original no chat"
                                        className="px-1.5 py-0.2 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[9px] text-neutral-300 font-mono flex items-center gap-1"
                                      >
                                        <i className="fa-solid fa-comment-dots text-[8px]"></i>
                                        <span>Chat</span>
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] text-neutral-300">
                                      {card.returnDeadline || '24h'}
                                    </span>
                                    <button
                                      onClick={(e) => handleDeleteCard(e, card.id)}
                                      title="Excluir card"
                                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-neutral-500 transition p-0.5"
                                    >
                                      <i className="fa-solid fa-trash-can text-[9px]"></i>
                                    </button>
                                  </div>
                                </div>

                                <h4 className={`text-xs text-neutral-100 font-medium mt-1 ${
                                  card.stage === 'Finalizados' ? 'line-through text-neutral-500' : ''
                                }`}>
                                  {card.title}
                                </h4>

                                {card.responsible && card.responsible !== 'Não definido' && (
                                  <div className="mt-1.5 text-[10px] text-neutral-400 flex items-center gap-1">
                                    <i className="fa-regular fa-user text-[9px] text-neutral-500"></i>
                                    <span>{card.responsible}</span>
                                  </div>
                                )}

                                <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-400">
                                  <button
                                    onClick={() => openCardModal(card)}
                                    className="hover:text-white cursor-pointer underline text-left"
                                  >
                                    Abrir card
                                  </button>
                                  <button
                                    onClick={() => openEmailPreparer(card)}
                                    className="text-neutral-300 hover:text-white px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 flex items-center gap-1 transition"
                                  >
                                    <i className="fa-solid fa-envelope text-[9px]"></i>
                                    <span>E-mail</span>
                                  </button>
                                </div>
                              </div>
                            ))}

                            {stageCards.length === 0 && (
                              <div className="h-16 border border-dashed border-white/5 rounded-lg flex items-center justify-center text-[10px] text-neutral-600 pointer-events-none">
                                Solte aqui
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. CENTRAL OPERACIONAL (CHAT & MEMÓRIA POR EMPRESA) */}
                {(companyViewMode === 'split' || companyViewMode === 'chat') && (
                  <aside className={`${companyViewMode === 'split' ? 'w-[440px]' : 'w-full'} bg-white/[0.015] border-l border-white/10 flex flex-col h-full flex-shrink-0`}>
                    
                    {/* Topo do Chat */}
                    <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                          <i className="fa-solid fa-brain text-neutral-300 text-xs"></i>
                        </div>
                        <div>
                          <span className="font-semibold text-xs text-white block">
                            Central Operacional & Memória
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Cole reuniões, WhatsApp ou anexe PDFs
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono">
                        9Router
                      </span>
                    </div>

                    {/* Resumo Operacional da Empresa (se houver) */}
                    {companyContext?.operationalSummary && (
                      <div className="px-3 py-2 bg-neutral-900/40 border-b border-neutral-800/80 text-[11px] text-neutral-300 flex items-start gap-2">
                        <i className="fa-solid fa-circle-info text-neutral-400 text-xs mt-0.5"></i>
                        <div>
                          <b className="text-white">Memória Operacional:</b> {companyContext.operationalSummary}
                        </div>
                      </div>
                    )}

                    {/* Feed de Mensagens e Análises */}
                    <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3.5 text-xs">
                      
                      {activeMessages.length === 0 && (
                        <div className="bg-white/[0.02] p-4 rounded-xl text-center space-y-2 border border-white/5 mt-4">
                          <i className="fa-solid fa-inbox text-neutral-500 text-2xl"></i>
                          <p className="text-white font-medium text-xs">Nenhum registro ainda nesta empresa</p>
                          <p className="text-[11px] text-neutral-400 leading-relaxed max-w-xs mx-auto">
                            Cole aqui a transcrição de uma reunião, conversa de WhatsApp, anotações ou anexe um PDF de multa/CRLV. A IA interpretará e sugerirá as atividades operacionais.
                          </p>
                        </div>
                      )}

                      {activeMessages.map((msg) => {
                        const isHighlighted = highlightedMessageId === msg.id;
                        const analysis = msg.aiAnalysis;
                        const hasPendingReview = analysis && analysis.status === 'pending_review';
                        const isApplied = analysis && analysis.status === 'applied';

                        return (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-xl text-xs leading-relaxed space-y-2 transition border ${
                              isHighlighted
                                ? 'bg-neutral-800/90 border-amber-400/50 shadow-lg'
                                : 'bg-white/[0.03] border-white/5'
                            }`}
                          >
                            {/* Cabeçalho da Mensagem */}
                            <div className="flex items-center justify-between text-[10px] text-neutral-400 pb-1 border-b border-white/5">
                              <span className="font-medium text-neutral-300 flex items-center gap-1.5">
                                <i className="fa-solid fa-user-pen text-[9px]"></i>
                                <span>Entrada Operacional</span>
                              </span>
                              <span className="font-mono text-[9px]">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Conteúdo Bruto / PDF */}
                            {msg.fileData && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-300 font-mono">
                                <i className="fa-solid fa-file-pdf text-rose-400"></i>
                                <span>{msg.fileData.name}</span>
                              </div>
                            )}

                            <p className="text-neutral-200 whitespace-pre-wrap text-[11px]">
                              {msg.content}
                            </p>

                            {/* BLOCO DE SUGESTÕES DE IA (9ROUTER) */}
                            {analysis && analysis.status !== 'analyzing' && (
                              <div className="pt-2 border-t border-white/10 space-y-2">
                                
                                {/* Resumo da Análise */}
                                {analysis.summary && (
                                  <div className="text-[11px] text-neutral-300 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800 flex items-start gap-1.5">
                                    <i className="fa-solid fa-robot text-neutral-400 text-xs mt-0.5"></i>
                                    <span>{analysis.summary}</span>
                                  </div>
                                )}

                                {/* Fatos Registrados */}
                                {analysis.facts && analysis.facts.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[9px] uppercase font-semibold text-neutral-400 tracking-wider">
                                      Memória Registrada:
                                    </span>
                                    {analysis.facts.map((fact, fIdx) => (
                                      <div key={fIdx} className="text-[10px] text-neutral-300 flex items-start gap-1.5 pl-1">
                                        <span className="text-neutral-500">•</span>
                                        <span>{fact}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Lista de Atividades Identificadas */}
                                {analysis.activities && analysis.activities.length > 0 && (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] uppercase font-semibold text-neutral-300 tracking-wider">
                                        🎯 Atividades Identificadas ({analysis.activities.length}):
                                      </span>
                                      {hasPendingReview && (
                                        <button
                                          onClick={() => handleConfirmActivities(msg.id, analysis.activities, analysis.updates || [])}
                                          className="px-2 py-0.5 rounded bg-white text-black hover:bg-neutral-200 font-semibold text-[10px] transition shadow-sm"
                                        >
                                          Criar Todas ({analysis.activities.length})
                                        </button>
                                      )}
                                    </div>

                                    <div className="space-y-1">
                                      {analysis.activities.map((act, aIdx) => (
                                        <div
                                          key={aIdx}
                                          className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] space-y-1"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium text-white">{act.title}</span>
                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-mono">
                                              {act.stage}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-0.5">
                                            <span>Resp: <b className="text-neutral-300">{act.responsible}</b></span>
                                            <span>Prazo: <b className="text-amber-200 font-mono">{act.deadlineText || act.deadline || 'Não definido'}</b></span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Lista de Atualizações Sugeridas */}
                                {analysis.updates && analysis.updates.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-semibold text-amber-300 tracking-wider block">
                                      🔄 Atualizações Sugeridas em Cards Abertos:
                                    </span>
                                    {analysis.updates.map((upd, uIdx) => (
                                      <div
                                        key={uIdx}
                                        className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] flex items-center justify-between"
                                      >
                                        <div>
                                          <p className="text-white font-medium">{upd.cardTitle}</p>
                                          <p className="text-neutral-400">{upd.reason}</p>
                                        </div>
                                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200 font-mono text-[9px]">
                                          Mudar para {upd.suggestedStage}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Status de Aprovação */}
                                {isApplied && (
                                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono pt-1">
                                    <i className="fa-solid fa-check text-[9px]"></i>
                                    <span>Atividades e atualizações registradas no Kanban</span>
                                  </div>
                                )}

                                {hasPendingReview && (
                                  <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                      onClick={() => handleDismissAnalysis(msg.id)}
                                      className="text-neutral-500 hover:text-neutral-300 text-[10px] transition"
                                    >
                                      Ignorar Sugestões
                                    </button>
                                  </div>
                                )}

                              </div>
                            )}

                          </div>
                        );
                      })}

                      {chatLoading && (
                        <div className="text-[11px] text-neutral-400 italic flex items-center gap-2 p-2.5 bg-neutral-900/60 rounded-xl border border-neutral-800">
                          <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                          <span>9Router interpretando a entrada e cruzando com o contexto da empresa...</span>
                        </div>
                      )}

                      <div ref={chatBottomRef} />
                    </div>

                    {/* Caixa de Entrada Operacional */}
                    <div className="p-2.5 border-t border-white/10 space-y-2 bg-white/[0.01]">
                      
                      {/* Pré-visualização do PDF Anexado com Chips Rápidos */}
                      {attachedPdf && (
                        <div className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-700 space-y-2 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-6 h-6 rounded bg-rose-950/70 border border-rose-900/70 flex items-center justify-center flex-shrink-0">
                                <i className="fa-solid fa-file-pdf text-rose-400 text-[11px]"></i>
                              </div>
                              <div className="truncate">
                                <p className="text-white text-[11px] font-medium truncate">{attachedPdf.name}</p>
                                <p className="text-[9px] text-neutral-400 font-mono">{attachedPdf.sizeFormatted}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={removeAttachedPdf}
                              className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition"
                            >
                              <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                          </div>

                          {/* Chips de Análise Rápida */}
                          <div className="flex flex-wrap gap-1 text-[10px] pt-1 border-t border-neutral-800">
                            <button
                              type="button"
                              onClick={() => handleOperationalMessageSubmit(null, 'Por favor, extraia todos os dados da autuação deste PDF: placa, número do auto, valor original e valor com desconto de 20% no SNE, órgão autuador e datas de vencimento.')}
                              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
                            >
                              📋 Extrair Dados da Multa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOperationalMessageSubmit(null, 'Verifique se cabe indicação de condutor dentro do prazo legal e oriente a emissão do formulário.')}
                              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
                            >
                              🪪 Indicação de Condutor
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOperationalMessageSubmit(null, 'Prepare uma minuta de e-mail formal para enviar esta guia ao financeiro do cliente cobrando aprovação até amanhã.')}
                              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
                            >
                              ✉️ Preparar E-mail
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Input Principal com Textarea para Colar Transcrições Longas */}
                      <form onSubmit={(e) => handleOperationalMessageSubmit(e)} className="flex items-end gap-1.5">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".pdf,application/pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          title="Anexar PDF (Multa, CRLV, Guia)"
                          className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 transition flex-shrink-0"
                        >
                          <i className="fa-solid fa-paperclip text-xs"></i>
                        </button>

                        <textarea
                          rows={2}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleOperationalMessageSubmit(e);
                            }
                          }}
                          placeholder="Cole reuniões, WhatsApp, anotações ou digite aqui..."
                          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 resize-none custom-scrollbar"
                        />

                        <button
                          type="submit"
                          disabled={chatLoading || (!chatInput.trim() && !attachedPdf)}
                          className="p-2 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-40 disabled:hover:bg-white font-semibold transition flex-shrink-0"
                          title="Enviar e Analisar com 9Router"
                        >
                          <i className="fa-solid fa-arrow-up text-xs"></i>
                        </button>
                      </form>

                    </div>

                  </aside>
                )}

              </div>

            </section>
          )}

          {/* ===================================================================== */}
          {/* MODAL 1: RELATÓRIO DIÁRIO & CALENDÁRIO COM TÉCNICAS RECOMENDADAS     */}
          {/* ===================================================================== */}
          {dailyReportModal && (
            <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
              <div className="bg-[#18181b] border border-neutral-700/70 rounded-2xl max-w-3xl w-full h-[82vh] p-6 shadow-2xl flex flex-col space-y-4">
                
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                      <i className="fa-solid fa-calendar-day text-xs text-white"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-white">Pauta Diária & Calendário Operacional</h3>
                      <p className="text-[11px] text-neutral-400">
                        Selecione um dia para ver o resumo das tarefas mais próximas e técnicas recomendadas
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDailyReportModal(false)}
                    className="w-6 h-6 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition"
                  >
                    <i className="fa-solid fa-xmark text-xs"></i>
                  </button>
                </div>

                <div className="flex-1 flex gap-4 overflow-hidden">
                  
                  {/* Lado Esquerdo: Mini Calendário */}
                  <div className="w-72 flex flex-col space-y-3">
                    <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-white">
                        <span>Setembro 2026</span>
                        <span className="text-[10px] text-neutral-400 font-mono">Hoje: 15/09</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-500">
                        <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                        {[...Array(30)].map((_, i) => {
                          const dayNum = i + 1;
                          const dayStr = `${dayNum.toString().padStart(2, '0')}/09/2026`;
                          const isSelected = selectedDate === dayStr;
                          const isToday = dayNum === 15;

                          return (
                            <button
                              key={dayNum}
                              onClick={() => setSelectedDate(dayStr)}
                              className={`h-7 rounded flex items-center justify-center transition font-mono text-xs ${
                                isSelected
                                  ? 'bg-white text-black font-semibold shadow'
                                  : isToday
                                  ? 'bg-neutral-800 text-white font-medium border border-neutral-600'
                                  : 'hover:bg-neutral-800/80 text-neutral-300'
                              }`}
                            >
                              {dayNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateDailyAiSummary}
                      disabled={dailyAiLoading}
                      className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium border border-neutral-700 flex items-center justify-center gap-2 transition"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                      <span>{dailyAiLoading ? 'Gerando com 9Router...' : 'Gerar Briefing com IA'}</span>
                    </button>
                  </div>

                  {/* Lado Direito: Tarefas Prioritárias */}
                  <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                    {dailyAiSummary && (
                      <div className="p-3 bg-neutral-900/90 border border-neutral-700 rounded-xl text-xs text-neutral-200 overflow-y-auto max-h-36 custom-scrollbar space-y-1">
                        <div className="whitespace-pre-wrap leading-relaxed text-[11px] text-neutral-300">
                          {dailyAiSummary}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-white">
                        Rotinas em Destaque para <span className="font-mono text-amber-200">{selectedDate}</span>
                      </h4>
                      <span className="text-[11px] text-neutral-400">
                        {dailyCards.length} tarefas pendentes de atenção
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                      {dailyCards.map(card => (
                        <div
                          key={card.id}
                          className="p-3 bg-neutral-900/50 hover:bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-1.5 transition"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-white">{card.company}</span>
                            <span className="text-neutral-400 font-mono text-[10px] bg-neutral-800 px-2 py-0.5 rounded">
                              {card.stage} • Prazo: {card.returnDeadline || '24h'}
                            </span>
                          </div>

                          <h5 className="text-xs text-neutral-200 font-medium">
                            {card.title}
                          </h5>

                          <div className="pt-1 border-t border-neutral-800/80 text-[11px] text-neutral-400 flex items-start gap-1.5">
                            <i className="fa-solid fa-wrench text-neutral-500 text-[10px] mt-0.5"></i>
                            <span className="leading-snug">
                              <b className="text-neutral-300">Técnica Recomendada:</b> {card.technique || 'Consultar sistema Detran/SNE, emitir guias com desconto e registrar protocolo.'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>

                </div>

              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* MODAL 2: NOVA EMPRESA COM SELEÇÃO DE ROTINAS PADRÃO DO DOC ON-LINE    */}
          {/* ===================================================================== */}
          {newCompanyModal && (
            <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
              <div className="bg-[#18181b] border border-neutral-700/70 rounded-2xl max-w-2xl w-full h-[82vh] p-6 shadow-2xl flex flex-col space-y-4">
                
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div>
                    <h3 className="font-semibold text-sm text-white">Cadastrar Nova Empresa</h3>
                    <p className="text-[11px] text-neutral-400">
                      Adicione uma nova frota e selecione quais rotinas padrão do Doc On-line deseja ativar
                    </p>
                  </div>
                  <button
                    onClick={() => setNewCompanyModal(false)}
                    className="w-6 h-6 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition"
                  >
                    <i className="fa-solid fa-xmark text-xs"></i>
                  </button>
                </div>

                <form onSubmit={handleCreateCompanySubmit} className="flex-1 flex flex-col space-y-4 overflow-hidden">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Nome da Empresa / Cliente *</label>
                      <input
                        type="text"
                        required
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        placeholder="Ex: Expresso São Paulo Logística"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Quantidade de Veículos da Frota</label>
                      <input
                        type="number"
                        min="1"
                        value={newCompanyFleet}
                        onChange={(e) => setNewCompanyFleet(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-neutral-300 text-xs block">
                          Rotinas Padrão do Doc On-line
                        </span>
                        <p className="text-[10px] text-neutral-500">
                          Selecione as rotinas a serem criadas para esta empresa
                        </p>
                      </div>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSelectedRoutines(catalog.map(r => r.id))}
                          className="text-neutral-400 hover:text-white underline"
                        >
                          Marcar todas
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRoutines([])}
                          className="text-neutral-400 hover:text-white underline"
                        >
                          Desmarcar todas
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 border border-neutral-800 rounded-xl p-2 bg-neutral-950/60">
                      {catalog.map(routine => {
                        const isSelected = selectedRoutines.includes(routine.id);
                        return (
                          <label
                            key={routine.id}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition text-xs ${
                              isSelected
                                ? 'bg-neutral-900 border-neutral-700 text-white'
                                : 'bg-neutral-950 border-neutral-900 text-neutral-400 opacity-60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRoutineSelection(routine.id)}
                              className="mt-0.5 rounded text-neutral-800 focus:ring-0"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-white">{routine.title}</span>
                                <span className="text-[10px] text-neutral-500 font-mono">{routine.frequency}</span>
                              </div>
                              <p className="text-[10px] text-neutral-400 mt-0.5">{routine.technique}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setNewCompanyModal(false)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-semibold text-xs transition"
                    >
                      Salvar Empresa & Criar Cards
                    </button>
                  </div>
                </form>

              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* MODAL 3: NOVO CARD INDIVIDUAL OU BROADCAST GERAL                     */}
          {/* ===================================================================== */}
          {newCardModal.isOpen && (
            <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
              <div className="bg-[#18181b] border border-neutral-700/70 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col space-y-4">
                
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div>
                    <h3 className="font-semibold text-sm text-white">
                      {newCardModal.isBroadcast ? 'Criar Atividade Geral (Broadcast)' : `Criar Card para ${selectedCompany}`}
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      {newCardModal.isBroadcast ? 'Esta atividade será adicionada em todas as empresas' : 'Card individual na empresa atual'}
                    </p>
                  </div>
                  <button
                    onClick={() => setNewCardModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-6 h-6 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition"
                  >
                    <i className="fa-solid fa-xmark text-xs"></i>
                  </button>
                </div>

                <form onSubmit={handleCreateCardSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Título da Atividade *</label>
                    <input
                      type="text"
                      required
                      value={newCardModal.title}
                      onChange={(e) => setNewCardModal(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Captura periódica de multas e débitos"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Categoria</label>
                      <input
                        type="text"
                        value={newCardModal.category}
                        onChange={(e) => setNewCardModal(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Frequência</label>
                      <input
                        type="text"
                        value={newCardModal.frequency}
                        onChange={(e) => setNewCardModal(prev => ({ ...prev, frequency: e.target.value }))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Técnica / Procedimento Recomendado:</label>
                    <textarea
                      rows={2}
                      value={newCardModal.technique}
                      onChange={(e) => setNewCardModal(prev => ({ ...prev, technique: e.target.value }))}
                      placeholder="Descreva a técnica ou passo a passo operacional..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 resize-none focus:outline-none focus:border-neutral-600"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setNewCardModal(prev => ({ ...prev, isOpen: false }))}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-semibold transition"
                    >
                      Criar Card
                    </button>
                  </div>
                </form>

              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* MODAL 4: DETALHES DO CARD (CHECKLIST, HISTÓRICO, E-MAIL E IA)          */}
          {/* ===================================================================== */}
          {activeCard && (
            <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
              <div className="bg-[#18181b] border border-neutral-700/60 rounded-2xl max-w-2xl w-full max-h-[88vh] p-5 shadow-2xl flex flex-col space-y-4 overflow-hidden">
                
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-white">{activeCard.title}</h3>
                      {activeCard.source === 'ai_chat' && (
                        <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-300 font-mono">
                          Origem: Chat
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {activeCard.company} • Estágio: <span className="text-neutral-200 font-medium">{activeCard.stage}</span>
                      {activeCard.returnDeadline && ` • Prazo: ${activeCard.returnDeadline}`}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeleteCard(e, activeCard.id)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-rose-950 text-neutral-400 hover:text-rose-300 text-xs font-medium border border-neutral-700 hover:border-rose-800 flex items-center gap-1.5 transition"
                      title="Excluir este card permanentemente"
                    >
                      <i className="fa-solid fa-trash-can text-[10px]"></i>
                      <span>Excluir</span>
                    </button>

                    <button
                      onClick={() => {
                        const c = activeCard;
                        closeCardModal();
                        openEmailPreparer(c);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition"
                    >
                      <i className="fa-solid fa-envelope text-[10px]"></i>
                      <span>Preparar E-mail</span>
                    </button>

                    <button
                      onClick={closeCardModal}
                      className="w-6 h-6 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition"
                    >
                      <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                  </div>
                </div>

                {/* Conteúdo: Técnica, Checklist, Histórico e IA */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3.5 text-xs pr-1">
                  
                  {/* Técnica Recomendada */}
                  {activeCard.technique && (
                    <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 text-[11px] text-neutral-300">
                      <b className="text-white">Técnica Operacional:</b> {activeCard.technique}
                    </div>
                  )}

                  {/* Checklist */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                      Checklist Operacional
                    </span>
                    {(activeCard.checklist || []).map((item, idx) => (
                      <label
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900/60 border border-neutral-800 cursor-pointer hover:bg-neutral-900 transition"
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => toggleChecklistItem(activeCard.id, idx)}
                          className="rounded text-neutral-800 focus:ring-0"
                        />
                        <span className={`text-neutral-300 ${item.done ? 'line-through text-neutral-500' : ''}`}>
                          {item.item || item.text}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Linha do Tempo / Histórico da Atividade */}
                  {activeCard.history && activeCard.history.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                      <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                        Histórico & Rastreabilidade do Card
                      </span>
                      <div className="space-y-1">
                        {activeCard.history.map((h, hIdx) => (
                          <div key={hIdx} className="text-[10px] text-neutral-300 flex items-start gap-1.5">
                            <span className="font-mono text-neutral-500">
                              {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}:
                            </span>
                            <span className="text-neutral-300">{h.note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* IA Dentro do Card: "Faça isso agora" */}
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-neutral-200 flex items-center gap-1.5">
                        <i className="fa-solid fa-robot text-neutral-400"></i>
                        <span>Assistente deste Card</span>
                      </span>
                      <span className="text-[10px] text-neutral-500">Muda o card ao relatar sua ação</span>
                    </div>

                    <div className="text-[11px] text-neutral-300 bg-neutral-950/80 border border-neutral-800/80 p-2.5 rounded-lg leading-relaxed">
                      {cardAiFeedback ? (
                        <div className="space-y-1.5">
                          <p className="text-white font-medium">Faça isso agora:</p>
                          <p className="whitespace-pre-wrap">{cardAiFeedback.advice}</p>
                          {cardAiFeedback.targetStage && (
                            <p className="text-[10px] text-neutral-400">
                              O card foi movido para: <b className="text-white">{cardAiFeedback.targetStage}</b>
                              {cardAiFeedback.suggestedReturnDeadline && ` (Prazo: ${cardAiFeedback.suggestedReturnDeadline})`}
                            </p>
                          )}
                        </div>
                      ) : cardAiLoading ? (
                        <span className="text-neutral-400 italic">Consultando 9Router...</span>
                      ) : (
                        <span>
                          Diga o que você fez neste card (ex: <i>"Consultei e já mandei o e-mail pro cliente aprovar"</i>). A IA te orienta o próximo passo e move o card.
                        </span>
                      )}
                    </div>

                    <form onSubmit={handleCardAiSubmit} className="flex gap-2">
                      <input
                        type="text"
                        value={cardAiInput}
                        onChange={(e) => setCardAiInput(e.target.value)}
                        placeholder="Escreva o que você fez aqui..."
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                      />
                      <button
                        type="submit"
                        disabled={cardAiLoading}
                        className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium border border-neutral-700 transition"
                      >
                        Enviar
                      </button>
                    </form>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* MODAL 5: PREPARAR E-MAIL (GERADO PELA IA)                             */}
          {/* ===================================================================== */}
          {emailModal.isOpen && (
            <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
              <div className="bg-[#18181b] border border-neutral-700/70 rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col space-y-4">
                
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                      <i className="fa-solid fa-envelope text-xs text-white"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-white">Minuta de E-mail para o Cliente</h3>
                      <p className="text-[11px] text-neutral-400">
                        {emailModal.card?.company} • {emailModal.card?.title}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-6 h-6 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition"
                  >
                    <i className="fa-solid fa-xmark text-xs"></i>
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Assunto:</label>
                    <input
                      type="text"
                      value={emailModal.subject}
                      onChange={(e) => setEmailModal(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-neutral-600 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Corpo do E-mail:</label>
                    <textarea
                      rows={8}
                      value={emailModal.body}
                      onChange={(e) => setEmailModal(prev => ({ ...prev, body: e.target.value }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 resize-none focus:outline-none focus:border-neutral-600 leading-relaxed custom-scrollbar font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
                  <span className="text-[11px] text-neutral-400">
                    {emailModal.loading ? 'Gerando minuta personalizada...' : 'Pronto para copiar e colar no Outlook ou Gmail'}
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                    >
                      Fechar
                    </button>
                    <button
                      onClick={copyEmailToClipboard}
                      className="px-4 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-semibold flex items-center gap-1.5 transition shadow"
                    >
                      <i className={`fa-solid ${emailModal.copied ? 'fa-check text-emerald-600' : 'fa-copy'}`}></i>
                      <span>{emailModal.copied ? 'Copiado!' : 'Copiar E-mail'}</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* RODAPÉ DISCRETO */}
      <footer className="relative z-10 px-6 py-2 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400 bg-[#0c0c0e]/80">
        <div className="flex items-center gap-2">
          <span>CRM Inteligente</span>
          <span>•</span>
          <span>Doc On-line & Gestão de Frotas</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span>Central Operacional 9Router</span>
        </div>
      </footer>

    </div>
  );
}
