import React, { useState, useEffect, useMemo, useRef } from 'react';

const STAGES = ['A Fazer', 'Em Andamento', 'Aguardando Retorno', 'Finalizados'];

// Cores temáticas por categoria (Estilo SwiftHub)
const CATEGORY_STYLES = {
  'Multas': {
    iconBg: 'bg-rose-100 text-rose-600 border-rose-200',
    flagText: 'text-rose-600',
    flagBg: 'bg-rose-50 border-rose-200',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500'
  },
  'Licenciamento': {
    iconBg: 'bg-sky-100 text-sky-600 border-sky-200',
    flagText: 'text-sky-600',
    flagBg: 'bg-sky-50 border-sky-200',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500'
  },
  'Financeiro': {
    iconBg: 'bg-amber-100 text-amber-600 border-amber-200',
    flagText: 'text-amber-600',
    flagBg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500'
  },
  'ANTT': {
    iconBg: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    flagText: 'text-indigo-600',
    flagBg: 'bg-indigo-50 border-indigo-200',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500'
  },
  'Transferência': {
    iconBg: 'bg-purple-100 text-purple-600 border-purple-200',
    flagText: 'text-purple-600',
    flagBg: 'bg-purple-50 border-purple-200',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500'
  },
  'Padrão': {
    iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
    flagText: 'text-slate-600',
    flagBg: 'bg-slate-50 border-slate-200',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-500'
  }
};

export default function App() {
  const [companies, setCompanies] = useState([]);
  const [cards, setCards] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navegação: 'company' (Kanban individual), 'matrix' (Todas as empresas), 'ai_chat' (Central de IA full)
  const [activeView, setActiveView] = useState('company');
  const [selectedCompany, setSelectedCompany] = useState('');
  
  // Modo dentro da tela de empresa: 'split' (Kanban + IA lado a lado) ou 'kanban' (Kanban full)
  const [companyViewMode, setCompanyViewMode] = useState('split');

  // Filtro de busca na barra superior
  const [searchQuery, setSearchQuery] = useState('');

  // Mensagens e Memória Operacional por empresa
  const [companyMessages, setCompanyMessages] = useState({});
  const [companyContext, setCompanyContext] = useState(null);

  // Drag and drop state
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);

  // Modais
  const [activeCard, setActiveCard] = useState(null);
  const [cardAiInput, setCardAiInput] = useState('');
  const [cardAiFeedback, setCardAiFeedback] = useState(null);
  const [cardAiLoading, setCardAiLoading] = useState(false);

  // Modal de E-mail
  const [emailModal, setEmailModal] = useState({
    isOpen: false,
    card: null,
    subject: '',
    body: '',
    copied: false,
    loading: false
  });

  // Modal: Nova Empresa
  const [newCompanyModal, setNewCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyFleet, setNewCompanyFleet] = useState(15);
  const [selectedRoutines, setSelectedRoutines] = useState([]);

  // Modal: Novo Card
  const [newCardModal, setNewCardModal] = useState({
    isOpen: false,
    isBroadcast: false,
    title: '',
    category: 'Multas',
    frequency: 'Semanal',
    returnDeadline: '17/09 às 17h',
    technique: '',
    notes: ''
  });

  // Modal: Relatório Diário
  const [dailyReportModal, setDailyReportModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('15/09/2026');
  const [dailyAiSummary, setDailyAiSummary] = useState('');
  const [dailyAiLoading, setDailyAiLoading] = useState(false);

  // Entrada de Chat da Empresa
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [attachedPdf, setAttachedPdf] = useState(null);
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);

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

      if (compData.length > 0 && !selectedCompany) {
        setSelectedCompany(compData[0].name);
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carrega mensagens e contexto ao trocar de empresa
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

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [companyMessages, chatLoading]);

  // Helper para empresa selecionada
  const currentCompanyObj = useMemo(() => {
    return companies.find(c => c.name === selectedCompany || c.id === selectedCompany) || null;
  }, [companies, selectedCompany]);

  const currentCompanyId = currentCompanyObj?.id || selectedCompany;

  // Filtragem de cards por pesquisa e empresa
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
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (c.responsible && c.responsible.toLowerCase().includes(q))
      );
    }

    return result;
  }, [cards, activeView, selectedCompany, currentCompanyId, searchQuery]);

  // Exclusão de Card
  const handleDeleteCard = async (e, cardId) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Deseja realmente excluir este card de operação?')) return;

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

  // Clipboard Handler: "COLE AQUI"
  const handlePasteHere = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      setChatInput(prev => (prev ? `${prev}\n${text}` : text));
      const textarea = document.getElementById('operational-chat-input');
      textarea?.focus();
    } catch (err) {
      console.warn('Área de transferência não autorizada diretamente:', err);
      const fallbackMsg = "Notificação de infração DER-SP / Renainf recebida. Placa BRA2E19 com 40% de desconto SNE disponível até hoje.";
      setChatInput(prev => (prev ? `${prev}\n${fallbackMsg}` : fallbackMsg));
    }
  };

  // Envio de mensagem operacional com IA
  const handleOperationalMessageSubmit = async (e) => {
    if (e) e.preventDefault();
    if ((!chatInput.trim() && !attachedPdf) || !currentCompanyId) return;

    const fileToSend = attachedPdf;
    const textToSend = chatInput;
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
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setChatLoading(false);
    }
  };

  // Confirmação de atividades detectadas pela IA
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

  // Descarte de análise da IA
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

  // Criação de Nova Empresa
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
        setSelectedCompany(data.company.name);
        setNewCompanyModal(false);
        setNewCompanyName('');
        setNewCompanyFleet(15);
      }
    } catch (err) {
      console.error('Erro ao criar empresa:', err);
    }
  };

  // Criação de Novo Card
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

  // Preparar E-mail Formal
  const openEmailPreparer = async (card) => {
    setEmailModal({
      isOpen: true,
      card,
      subject: `[COMUNICADO DESPACHANTE] ${card.title} - Frota ${card.company}`,
      body: `Prezado Gestor / Setor Financeiro,\n\nIdentificamos pendências referentes ao processo: "${card.title}".\n\nPor favor, providencie o retorno ou comprovante de pagamento até o vencimento operacional para que possamos efetivar a baixa junto ao órgão competente.\n\nAtenciosamente,\nEquipe Despachante StarTrek`,
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
      setEmailModal(prev => ({ ...prev, loading: false }));
    }
  };

  const copyEmailToClipboard = () => {
    const fullText = `Assunto: ${emailModal.subject}\n\n${emailModal.body}`;
    navigator.clipboard.writeText(fullText);
    setEmailModal(prev => ({ ...prev, copied: true }));
    setTimeout(() => setEmailModal(prev => ({ ...prev, copied: false })), 2500);
  };

  // Relatório Diário com IA
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
      setDailyAiSummary('Não foi possível gerar a síntese com a IA. As rotinas prioritárias continuam listadas abaixo.');
    } finally {
      setDailyAiLoading(false);
    }
  };

  // Upload de PDF
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor, selecione um arquivo em formato PDF.');
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

  // Mensagens da empresa atual
  const activeMessages = useMemo(() => {
    return companyMessages[currentCompanyId] || [];
  }, [companyMessages, currentCompanyId]);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#f5f7fb] text-slate-800 font-sans antialiased select-none">

      {/* ========================================================================= */}
      {/* 1. SIDEBAR LATERAL ESQUERDA (DARK NAVY - ESTILO SWIFTHUB)                  */}
      {/* ========================================================================= */}
      <aside className="w-64 sidebar-bg flex flex-col justify-between flex-shrink-0 z-20 border-r border-slate-800 shadow-2xl">
        
        <div className="flex flex-col h-full overflow-y-auto dark-scrollbar p-4 space-y-6">
          
          {/* LOGO & PROFILE DO SWIFTHUB / STARTREK */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/25">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <div>
                <h1 className="font-bold text-sm text-white tracking-tight">StarTrek CRM</h1>
                <p className="text-[11px] text-slate-400">operacoes@startrek.io</p>
              </div>
            </div>
            <button className="text-slate-400 hover:text-white transition text-xs">
              <i className="fa-solid fa-arrows-up-down"></i>
            </button>
          </div>

          {/* SELETOR DE EMPRESA COM DROPDOWN ELEGANTE */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Frota / Empresa Ativa
            </label>
            <div className="relative">
              <select
                value={selectedCompany}
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  setActiveView('company');
                }}
                className="w-full bg-[#1b1f33] hover:bg-[#232842] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white appearance-none cursor-pointer focus:outline-none focus:border-indigo-500 transition shadow-sm font-medium"
              >
                {companies.map(comp => (
                  <option key={comp.id} value={comp.name} className="bg-[#131625] text-white">
                    {comp.name} ({comp.fleetCount || 0} veíc.)
                  </option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-3 top-3 text-[10px] text-slate-400 pointer-events-none"></i>
            </div>
          </div>

          {/* SEÇÃO DE NAVEGAÇÃO: MENU */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
              Menu Principal
            </span>

            {/* DASHBOARDS / BATALHA NAVAL */}
            <button
              onClick={() => setActiveView('matrix')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeView === 'matrix' ? 'sidebar-item-active shadow-sm' : 'text-slate-400 sidebar-item-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-table-cells-large text-xs w-4"></i>
                <span>Visão Geral (Todas)</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {companies.length}
              </span>
            </button>

            {/* PROCESSOS / KANBAN */}
            <button
              onClick={() => {
                setActiveView('company');
                setCompanyViewMode('kanban');
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeView === 'company' && companyViewMode === 'kanban' ? 'sidebar-item-active shadow-sm' : 'text-slate-400 sidebar-item-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-layer-group text-xs w-4"></i>
                <span>Quadro Kanban</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                {cards.filter(c => c.stage !== 'Finalizados').length}
              </span>
            </button>

            {/* COCKPIT INTEGRADO (KANBAN + IA) */}
            <button
              onClick={() => {
                setActiveView('company');
                setCompanyViewMode('split');
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeView === 'company' && companyViewMode === 'split' ? 'sidebar-item-active shadow-sm' : 'text-slate-400 sidebar-item-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-columns text-xs w-4"></i>
                <span>Kanban + Chat IA</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>

            {/* CENTRAL DE IA & MEMÓRIA */}
            <button
              onClick={() => {
                setActiveView('company');
                setCompanyViewMode('chat');
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeView === 'company' && companyViewMode === 'chat' ? 'sidebar-item-active shadow-sm' : 'text-slate-400 sidebar-item-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-brain text-xs w-4"></i>
                <span>Central de IA & PDFs</span>
              </div>
              {activeMessages.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono">
                  {activeMessages.length}
                </span>
              )}
            </button>

            {/* PAUTA & CALENDÁRIO DIÁRIO */}
            <button
              onClick={() => setDailyReportModal(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 sidebar-item-hover transition"
            >
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-calendar-check text-xs w-4"></i>
                <span>Pauta & Relatório Diário</span>
              </div>
            </button>
          </div>

          {/* SEÇÃO AÇÕES RÁPIDAS */}
          <div className="pt-2 space-y-2 border-t border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block">
              Ações Rápidas
            </span>

            <button
              onClick={() => setNewCardModal({
                isOpen: true,
                isBroadcast: false,
                title: '',
                category: 'Multas',
                frequency: 'Semanal',
                returnDeadline: '17/09 às 17h',
                technique: '',
                notes: ''
              })}
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
            >
              <i className="fa-solid fa-plus text-[10px]"></i>
              <span>Novo Card para Frota</span>
            </button>

            <button
              onClick={() => setNewCompanyModal(true)}
              className="w-full py-2 px-3 rounded-xl bg-[#1c2035] hover:bg-[#252b45] text-slate-300 font-medium text-xs flex items-center justify-center gap-2 border border-slate-700/60 transition"
            >
              <i className="fa-solid fa-building text-[10px]"></i>
              <span>Cadastrar Nova Frota</span>
            </button>
          </div>

        </div>

        {/* RODAPÉ DA SIDEBAR: PERFIL MRFELPS */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0e111d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-bold text-xs flex items-center justify-center shadow-md">
              MF
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">MrFelps</p>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online
              </span>
            </div>
          </div>
          <button onClick={() => alert("StarTrek CRM 2.0 • 9Router Conectado")} className="text-slate-400 hover:text-white p-1.5 transition">
            <i className="fa-solid fa-gear text-xs"></i>
          </button>
        </div>

      </aside>

      {/* ========================================================================= */}
      {/* 2. ÁREA DE TRABALHO PRINCIPAL (CLEAN MODERN OFF-WHITE)                    */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#f5f7fb]">
        
        {/* CABEÇALHO SUPERIOR (ESTILO SWIFTHUB) */}
        <header className="px-6 py-4 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4 shadow-sm z-10">
          
          {/* TÍTULO E STATUS DA PÁGINA */}
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {activeView === 'matrix' ? 'Todas as Frotas' : selectedCompany}
              </h2>
              {activeView === 'company' && currentCompanyObj && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                  {currentCompanyObj.fleetCount || 0} Veículos Ativos
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestão de rotinas, controle de multas SNE e atendimento operacional despachante
            </p>
          </div>

          {/* BOTÕES DE AÇÃO NO TOPO DIREITO */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDailyReportModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 shadow-sm transition"
            >
              <i className="fa-solid fa-arrow-up-from-bracket text-xs text-slate-400"></i>
              <span>Exportar / Pauta</span>
            </button>

            <button
              onClick={() => setNewCardModal({
                isOpen: true,
                isBroadcast: false,
                title: '',
                category: 'Multas',
                frequency: 'Semanal',
                returnDeadline: '17/09 às 17h',
                technique: '',
                notes: ''
              })}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>+ Adicionar Card</span>
            </button>
          </div>

        </header>

        {/* BARRA DE FILTROS, ABAS (CARD VIEW / TABLE VIEW) E BUSCA */}
        <div className="px-6 py-3 bg-white/70 border-b border-slate-200/60 flex flex-wrap items-center justify-between gap-4">
          
          {/* ABAS ESTILO SWIFTHUB COM LINHA ATIVA */}
          <div className="flex items-center gap-1 border-b-2 border-transparent">
            <button
              onClick={() => {
                setActiveView('company');
                setCompanyViewMode('kanban');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeView === 'company' && companyViewMode === 'kanban'
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fa-solid fa-square-poll-vertical text-xs"></i>
              <span>Card View (Kanban)</span>
            </button>

            <button
              onClick={() => {
                setActiveView('company');
                setCompanyViewMode('split');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeView === 'company' && companyViewMode === 'split'
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fa-solid fa-columns text-xs"></i>
              <span>Kanban + Chat IA</span>
            </button>

            <button
              onClick={() => setActiveView('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeView === 'matrix'
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fa-solid fa-table-cells text-xs"></i>
              <span>Table View (Batalha Naval)</span>
            </button>
          </div>

          {/* BARRA DE BUSCA COM LUPA */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-xs text-slate-400"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por placa, processo..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition w-56"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            <span className="text-xs text-slate-400 font-medium px-2">
              {visibleCards.length} cards listados
            </span>
          </div>

        </div>

        {/* ===================================================================== */}
        {/* 3. CONTEÚDO: KANBAN COM CARDS ESTILO SWIFTHUB                         */}
        {/* ===================================================================== */}
        {activeView === 'company' && (
          <div className="flex-1 flex overflow-hidden p-6 gap-6">
            
            {/* ÁREA KANBAN (PODE SER SPLIT OU FULL) */}
            <div className={`${companyViewMode === 'split' ? 'w-[64%]' : 'w-full'} flex gap-5 overflow-x-auto custom-scrollbar pb-2 transition-all`}>
              
              {STAGES.map(stage => {
                const stageCards = visibleCards.filter(c => c.stage === stage);
                const zoneId = `company-${stage}`;
                const isOver = dragOverZone === zoneId;

                // Cores dos contadores de estágio
                let badgeColor = 'bg-slate-100 text-slate-700';
                if (stage === 'A Fazer') badgeColor = 'bg-rose-100 text-rose-700 font-bold';
                if (stage === 'Em Andamento') badgeColor = 'bg-sky-100 text-sky-700 font-bold';
                if (stage === 'Aguardando Retorno') badgeColor = 'bg-amber-100 text-amber-700 font-bold';
                if (stage === 'Finalizados') badgeColor = 'bg-emerald-100 text-emerald-700 font-bold';

                return (
                  <div
                    key={stage}
                    className="flex-1 min-w-[280px] max-w-[340px] flex flex-col rounded-2xl bg-slate-100/70 border border-slate-200/80 p-3"
                  >
                    
                    {/* CABEÇALHO DA COLUNA DO SWIFTHUB */}
                    <div className="flex items-center justify-between pb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-800 tracking-tight">{stage}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${badgeColor}`}>
                          {stageCards.length}
                        </span>
                      </div>
                      <button className="text-slate-400 hover:text-slate-700 text-xs p-1">
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                      </button>
                    </div>

                    {/* ÁREA DE SOLTURA E LISTA DE CARDS */}
                    <div
                      className={`flex-1 overflow-y-auto custom-scrollbar space-y-3.5 pr-1 drop-zone p-1 rounded-xl ${
                        isOver ? 'drag-over' : ''
                      }`}
                      onDragOver={(e) => handleDragOver(e, zoneId)}
                      onDragLeave={(e) => handleDragLeave(e, zoneId)}
                      onDrop={(e) => handleDrop(e, stage, selectedCompany)}
                    >
                      {stageCards.map(card => {
                        const style = CATEGORY_STYLES[card.category] || CATEGORY_STYLES['Padrão'];

                        return (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, card)}
                            onDragEnd={handleDragEnd}
                            className={`swifthub-card p-4 space-y-3 ${draggedCard?.id === card.id ? 'dragging' : ''}`}
                          >
                            
                            {/* LINHA 1 DO CARD: ÍCONE CIRCULAR + TÍTULO + MENU */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border ${style.iconBg}`}>
                                  {card.category ? card.category[0] : 'C'}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                                    {card.title}
                                  </h4>
                                </div>
                              </div>

                              <button
                                onClick={(e) => handleDeleteCard(e, card.id)}
                                title="Excluir card"
                                className="text-slate-300 hover:text-rose-500 transition text-xs p-1"
                              >
                                <i className="fa-solid fa-trash-can text-[10px]"></i>
                              </button>
                            </div>

                            {/* LINHA 2 DO CARD: GRADE DE DETALHES EM 2 COLUNAS */}
                            <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[11px] pt-1">
                              
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Categoria</span>
                                <span className={`inline-flex items-center gap-1 font-semibold text-[10px] px-1.5 py-0.5 rounded border ${style.flagBg} ${style.flagText}`}>
                                  <i className="fa-solid fa-flag text-[9px]"></i>
                                  {card.category}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Prazo / Retorno</span>
                                <span className="font-bold text-slate-800 text-[11px]">
                                  {card.returnDeadline || card.routineFrequency || 'Hoje'}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Veículo / Frota</span>
                                <span className="font-mono text-slate-600 text-[10px] bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                                  {card.responsible || card.company || 'Geral'}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Status</span>
                                <span className="inline-flex items-center gap-1 font-medium text-slate-700 text-[10px]">
                                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                                  {stage}
                                </span>
                              </div>

                            </div>

                            {/* LINHA 3: RODAPÉ DO CARD COM AVATAR E LINK DE DETALHES */}
                            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold flex items-center justify-center">
                                  {card.responsible ? card.responsible[0] : 'D'}
                                </div>
                                <span className="text-[11px] text-slate-600 font-medium truncate max-w-[90px]">
                                  {card.responsible || 'Despachante'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEmailPreparer(card)}
                                  title="Preparar e-mail formal"
                                  className="text-slate-400 hover:text-indigo-600 transition"
                                >
                                  <i className="fa-regular fa-envelope text-xs"></i>
                                </button>
                                <button
                                  onClick={() => setActiveCard(card)}
                                  className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] flex items-center gap-1 transition"
                                >
                                  <span>Ver detalhes</span>
                                  <i className="fa-solid fa-chevron-right text-[8px]"></i>
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })}

                      {stageCards.length === 0 && (
                        <div className="h-28 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs">
                          <i className="fa-regular fa-folder-open text-base mb-1 text-slate-300"></i>
                          <span>Nenhum card aqui</span>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}

            </div>

            {/* PAINEL LATERAL: CENTRAL OPERACIONAL DE IA (QUANDO EM SPLIT OU CHAT) */}
            {(companyViewMode === 'split' || companyViewMode === 'chat') && (
              <div className={`${companyViewMode === 'split' ? 'w-[36%]' : 'w-full'} flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-md p-4 overflow-hidden transition-all`}>
                
                {/* CABEÇALHO DO CHAT */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-600/20">
                      <i className="fa-solid fa-brain"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                        Central de IA & Memória
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      </h3>
                      <p className="text-[10px] text-slate-400">Transcrições, atas de reunião e leitura de PDFs</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setCompanyViewMode(companyViewMode === 'split' ? 'kanban' : 'split')}
                    className="text-slate-400 hover:text-slate-600 p-1 text-xs"
                    title="Alternar tela cheia do Kanban"
                  >
                    <i className="fa-solid fa-compress text-xs"></i>
                  </button>
                </div>

                {/* FEED DE MENSAGENS */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 text-xs mb-3">
                  {activeMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-lg mb-3 shadow-inner">
                        <i className="fa-solid fa-comment-dots"></i>
                      </div>
                      <h4 className="font-bold text-xs text-slate-700">Central Pronta para Operar</h4>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                        Cole aqui conversas do WhatsApp, e-mails ou anexe um PDF de multa. A IA extrairá os prazos e sugerirá os cards no Kanban.
                      </p>
                    </div>
                  ) : (
                    activeMessages.map(msg => (
                      <div key={msg.id} className="space-y-2">
                        
                        {/* MENSAGEM DO USUÁRIO */}
                        <div className="flex flex-col items-end">
                          <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-sm max-w-[90%] shadow-sm">
                            <p className="text-xs leading-relaxed whitespace-pre-line">{msg.content}</p>
                            {msg.fileData && (
                              <div className="mt-2 pt-2 border-t border-indigo-400/50 flex items-center gap-2 text-[10px] text-indigo-100">
                                <i className="fa-solid fa-file-pdf text-rose-300"></i>
                                <span>{msg.fileData.name} ({msg.fileData.sizeFormatted})</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 mr-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* ANÁLISE OPERACIONAL DA IA */}
                        {msg.aiAnalysis && (
                          <div className="flex flex-col items-start">
                            <div className="bg-slate-50 border border-indigo-100 rounded-2xl rounded-tl-sm p-3.5 max-w-[95%] shadow-sm space-y-2.5">
                              
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1.5">
                                  <i className="fa-solid fa-wand-magic-sparkles text-indigo-500"></i>
                                  Análise Operacional 9Router
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100/80 text-indigo-700 font-mono">
                                  {msg.aiAnalysis.status === 'applied' ? '✔ Aplicado' : 'Aguardando Ação'}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                {msg.aiAnalysis.rawOutput || 'Identifiquei as seguintes atividades a serem registradas:'}
                              </p>

                              {/* ATIVIDADES SUGERIDAS */}
                              {msg.aiAnalysis.activitiesToCreate && msg.aiAnalysis.activitiesToCreate.length > 0 && (
                                <div className="space-y-2 pt-1">
                                  {msg.aiAnalysis.activitiesToCreate.map((act, idx) => (
                                    <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-sm">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-800 text-xs">{act.title}</span>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                                          {act.returnDeadline || 'Prazo'}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 mt-0.5">
                                        Categoria: {act.category || 'Geral'} • Frequência: {act.frequency || 'Pontual'}
                                      </p>
                                    </div>
                                  ))}

                                  {msg.aiAnalysis.status !== 'applied' && (
                                    <div className="flex items-center gap-2 pt-1">
                                      <button
                                        onClick={() => handleConfirmActivities(msg.id, msg.aiAnalysis.activitiesToCreate, msg.aiAnalysis.updatesToApply)}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                                      >
                                        <i className="fa-solid fa-check"></i>
                                        <span>Confirmar & Criar no Kanban</span>
                                      </button>
                                      <button
                                        onClick={() => handleDismissAnalysis(msg.id)}
                                        className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs transition"
                                      >
                                        Descartar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                            </div>
                          </div>
                        )}

                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* ENTRADA DE TEXTO COM BOTÃO "COLE AQUI" EM DESTAQUE */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  
                  {/* BARRA DE AÇÕES: COLE AQUI + ANEXAR PDF */}
                  <div className="flex items-center justify-between gap-2">
                    
                    <div className="flex items-center gap-2">
                      {/* BOTÃO "COLE AQUI" ESTILO SWIFTHUB */}
                      <button
                        type="button"
                        onClick={handlePasteHere}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                        title="Colar texto da área de transferência com um clique"
                      >
                        <i className="fa-solid fa-paste text-xs"></i>
                        <span>Cole Aqui</span>
                      </button>

                      {/* ANEXAR PDF */}
                      <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition">
                        <i className="fa-solid fa-paperclip text-xs"></i>
                        <span>Anexar PDF</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {attachedPdf && (
                      <span className="text-[11px] text-slate-600 flex items-center gap-1.5 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                        <i className="fa-solid fa-file-pdf text-rose-500"></i>
                        <span className="truncate max-w-[120px] font-semibold">{attachedPdf.name}</span>
                        <button onClick={() => setAttachedPdf(null)} className="text-slate-400 hover:text-rose-600">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </span>
                    )}
                  </div>

                  {/* CAMPO DE DIGITAÇÃO */}
                  <form onSubmit={handleOperationalMessageSubmit} className="relative flex items-center">
                    <textarea
                      id="operational-chat-input"
                      rows={2}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Cole aqui ou digite atas, multas, mensagens de clientes..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-12 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 custom-scrollbar resize-none"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading}
                      className="absolute right-2 top-2.5 w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition shadow-sm disabled:opacity-50"
                    >
                      {chatLoading ? (
                        <i className="fa-solid fa-spinner animate-spin text-xs"></i>
                      ) : (
                        <i className="fa-solid fa-arrow-up text-xs"></i>
                      )}
                    </button>
                  </form>

                </div>

              </div>
            )}

          </div>
        )}

        {/* ===================================================================== */}
        {/* 4. VISÃO BATALHA NAVAL / TABLE VIEW (TODAS AS FROTAS)                */}
        {/* ===================================================================== */}
        {activeView === 'matrix' && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex-1 flex flex-col overflow-hidden">
              
              {/* CABEÇALHO DA TABELA */}
              <div className="grid grid-cols-12 gap-3 px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600">
                <div className="col-span-3 flex items-center gap-2">
                  <i className="fa-solid fa-truck text-slate-400"></i>
                  <span>Empresa / Frota</span>
                </div>
                <div className="col-span-2 text-center text-rose-600">A Fazer</div>
                <div className="col-span-2 text-center text-sky-600">Em Andamento</div>
                <div className="col-span-3 text-center text-amber-600">Aguardando Retorno</div>
                <div className="col-span-2 text-center text-emerald-600">Ação Rápida</div>
              </div>

              {/* LINHAS DAS EMPRESAS */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {companies.map(company => {
                  const compCards = cards.filter(c => c.company === company.name || c.companyId === company.id);
                  const waitingCount = compCards.filter(c => c.stage === 'Aguardando Retorno').length;

                  return (
                    <div
                      key={company.id}
                      className="grid grid-cols-12 gap-3 p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/70 items-start transition shadow-sm"
                    >
                      {/* Empresa */}
                      <div className="col-span-3 pr-2">
                        <h4 className="font-extrabold text-xs text-slate-900">{company.name}</h4>
                        <span className="text-[11px] text-slate-500">
                          {company.fleetCount || 0} veículos • {compCards.length} cards totais
                        </span>
                        <button
                          onClick={() => {
                            setSelectedCompany(company.name);
                            setActiveView('company');
                          }}
                          className="mt-2 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                        >
                          <span>Abrir Central</span>
                          <i className="fa-solid fa-arrow-right text-[9px]"></i>
                        </button>
                      </div>

                      {/* 3 Colunas de Estágios */}
                      {['A Fazer', 'Em Andamento', 'Aguardando Retorno'].map(stage => {
                        const stageCards = compCards.filter(c => c.stage === stage);
                        const colSpan = stage === 'Aguardando Retorno' ? 'col-span-3' : 'col-span-2';

                        return (
                          <div key={stage} className={`${colSpan} space-y-2`}>
                            {stageCards.slice(0, 2).map(c => (
                              <div
                                key={c.id}
                                onClick={() => setActiveCard(c)}
                                className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs shadow-2xs hover:border-indigo-300 cursor-pointer transition"
                              >
                                <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                                  <span className="font-semibold">{c.category}</span>
                                  <span className="font-mono">{c.returnDeadline || 'Hoje'}</span>
                                </div>
                                <p className="font-bold text-slate-800 truncate text-[11px]">{c.title}</p>
                              </div>
                            ))}
                            {stageCards.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-semibold pl-1 block">
                                +{stageCards.length - 2} outros cards
                              </span>
                            )}
                            {stageCards.length === 0 && (
                              <span className="text-[10px] text-slate-300 italic block py-2 text-center">
                                Vazio
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Ação */}
                      <div className="col-span-2 flex items-center justify-center">
                        <button
                          onClick={() => {
                            setSelectedCompany(company.name);
                            setActiveView('company');
                            setCompanyViewMode('split');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition"
                        >
                          Cockpit IA
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* 5. MODAIS DA APLICAÇÃO (REDESENHADOS PARA O TEMA SWIFTHUB)                 */}
      {/* ========================================================================= */}

      {/* MODAL: DETALHES DO CARD */}
      {activeCard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center">
                  {activeCard.category ? activeCard.category[0] : 'C'}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{activeCard.category}</span>
                  <h3 className="text-base font-extrabold text-slate-900">{activeCard.title}</h3>
                </div>
              </div>
              <button onClick={() => setActiveCard(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">Empresa</span>
                <span className="font-bold text-slate-800">{activeCard.company}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">Estágio</span>
                <span className="font-bold text-slate-800">{activeCard.stage}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">Prazo / Retorno</span>
                <span className="font-bold text-slate-800">{activeCard.returnDeadline || 'Hoje'}</span>
              </div>
            </div>

            {activeCard.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Notas Operacionais:</span>
                <p className="text-slate-600 leading-relaxed">{activeCard.notes}</p>
              </div>
            )}

            {/* AÇÃO COM IA: "O QUE VOCÊ FEZ?" */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800">
                <i className="fa-solid fa-wand-magic-sparkles text-indigo-600"></i>
                <span>Orientação do Despachante IA</span>
              </div>
              <p className="text-[11px] text-indigo-600">
                Diga o que você fez ou recebeu (ex: "cliente pagou DAE" ou "protocolo deferido") para a IA mover o card ou gerar a resposta.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cardAiInput}
                  onChange={(e) => setCardAiInput(e.target.value)}
                  placeholder="Ex: Pagamento confirmado, aguardando compensação..."
                  className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={async () => {
                    if (!cardAiInput.trim()) return;
                    setCardAiLoading(true);
                    try {
                      const res = await fetch('/api/ai/card-action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cardId: activeCard.id, userActionText: cardAiInput })
                      });
                      const data = await res.json();
                      setCardAiFeedback(data);
                      if (data.updatedCard) {
                        setCards(prev => prev.map(c => c.id === data.updatedCard.id ? data.updatedCard : c));
                        setActiveCard(data.updatedCard);
                      }
                      setCardAiInput('');
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setCardAiLoading(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm"
                >
                  {cardAiLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Analisar'}
                </button>
              </div>

              {cardAiFeedback && (
                <div className="mt-2 p-2.5 bg-white rounded-xl border border-indigo-200 text-xs text-slate-700">
                  <p className="font-bold text-indigo-700">{cardAiFeedback.advice}</p>
                  {cardAiFeedback.nextStage && (
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                      ➔ Movido automaticamente para: {cardAiFeedback.nextStage}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => openEmailPreparer(activeCard)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <i className="fa-regular fa-envelope"></i>
                <span>Minuta de E-mail</span>
              </button>

              <button
                onClick={() => setActiveCard(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: PREPARAR E-MAIL FORMAL */}
      {emailModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-envelope text-indigo-600"></i>
                <h3 className="font-bold text-sm text-slate-900">Minuta Formal de E-mail</h3>
              </div>
              <button onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Assunto:</label>
                <input
                  type="text"
                  value={emailModal.subject}
                  onChange={(e) => setEmailModal(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Corpo do Comunicado:</label>
                <textarea
                  rows={6}
                  value={emailModal.body}
                  onChange={(e) => setEmailModal(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-500 custom-scrollbar"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={copyEmailToClipboard}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition"
              >
                <i className="fa-solid fa-copy"></i>
                <span>{emailModal.copied ? '✔ Copiado para Área de Transferência!' : 'Copiar E-mail'}</span>
              </button>

              <button
                onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO CARD */}
      {newCardModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateCardSubmit} className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                {newCardModal.isBroadcast ? 'Criar Atividade Geral (Para Todas)' : `Novo Card para ${selectedCompany}`}
              </h3>
              <button type="button" onClick={() => setNewCardModal(prev => ({ ...prev, isOpen: false }))} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Título da Atividade:</label>
                <input
                  type="text"
                  required
                  value={newCardModal.title}
                  onChange={(e) => setNewCardModal(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Defesa Prévia Auto R549219 ou Emissão CRLV-e"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Categoria:</label>
                  <select
                    value={newCardModal.category}
                    onChange={(e) => setNewCardModal(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                  >
                    <option value="Multas">Multas & Infrações</option>
                    <option value="Licenciamento">Licenciamento Anual</option>
                    <option value="Financeiro">Financeiro / Taxas</option>
                    <option value="ANTT">ANTT & RNTRC</option>
                    <option value="Transferência">Transferência de Propriedade</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prazo de Retorno:</label>
                  <input
                    type="text"
                    value={newCardModal.returnDeadline}
                    onChange={(e) => setNewCardModal(prev => ({ ...prev, returnDeadline: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observações ou Placas:</label>
                <textarea
                  rows={3}
                  value={newCardModal.notes}
                  onChange={(e) => setNewCardModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Placas envolvidas, órgãos (Detran, DER, PRF)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 custom-scrollbar"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewCardModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20 transition"
              >
                Salvar Card
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: NOVA EMPRESA / FROTA */}
      {newCompanyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateCompanySubmit} className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Cadastrar Nova Frota / Empresa</h3>
              <button type="button" onClick={() => setNewCompanyModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nome da Empresa:</label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Ex: Rodoviário Estrela Dourada"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Quantidade de Veículos:</label>
                <input
                  type="number"
                  min="1"
                  value={newCompanyFleet}
                  onChange={(e) => setNewCompanyFleet(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Rotinas Automáticas a Aplicar:</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {catalog.map(r => (
                    <label key={r.id} className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRoutines.includes(r.id)}
                        onChange={() => {
                          setSelectedRoutines(prev =>
                            prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id]
                          );
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-medium">{r.title} ({r.category})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewCompanyModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20 transition"
              >
                Cadastrar Frota
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: RELATÓRIO DIÁRIO */}
      {dailyReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-calendar-day text-indigo-600"></i>
                <h3 className="font-bold text-sm text-slate-900">Pauta & Relatório Operacional do Dia</h3>
              </div>
              <button onClick={() => setDailyReportModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
              />
              <button
                onClick={handleGenerateDailyAiSummary}
                disabled={dailyAiLoading}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                {dailyAiLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-sparkles"></i>}
                <span>Gerar Síntese com IA</span>
              </button>
            </div>

            {dailyAiSummary && (
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-xl">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                  Resumo Estratégico 9Router:
                </span>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{dailyAiSummary}</p>
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-800 mb-2">Rotinas com Vencimento Hoje ({selectedDate}):</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {cards.filter(c => c.stage !== 'Finalizados').slice(0, 6).map(c => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">{c.title}</span>
                      <span className="text-[10px] text-slate-500">{c.company} • {c.category}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                      {c.returnDeadline || 'Hoje'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDailyReportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition"
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
