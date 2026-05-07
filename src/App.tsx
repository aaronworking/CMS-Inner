import { useState, useMemo, FormEvent } from 'react';
import { 
  Search, Plus, Hammer, CheckCircle2, Clock, AlertTriangle, 
  ChevronRight, Users, MessageSquare, ArrowLeft, Send,
  ClipboardList, Settings, User as UserIcon,
  Filter, MoreVertical, X, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, ChevronLeft,
  Pencil, Trash2, LogOut, Calendar, AlertCircle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket, TicketStatus, Priority, User, TimelineEvent, SchedulingPersonnel, Part, Product } from './types';
import { INITIAL_TICKETS, DUMMY_USERS, GRANDTECH_THEME, DUMMY_SCHEDULING, PRODUCT_CATALOG } from './constants';

// --- Helpers ---

const formatDate = (date: Date) => {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;
};

// --- Sub-components ---

const StatusBadge = ({ status }: { status: TicketStatus }) => {
  const configs: Record<TicketStatus, { label: string; class: string; icon: any }> = {
    pending: { label: '未處理', class: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    processing: { label: '處理中', class: 'bg-blue-100 text-blue-700 border-blue-200', icon: Hammer },
    quoting: { label: '報價中', class: 'bg-brand-light text-brand-primary border-brand-primary/20', icon: MessageSquare },
    delivering: { label: '交機中', class: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: RefreshCw },
    completed: { label: '結案', class: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    cancelled: { label: '取消', class: 'bg-slate-100 text-slate-700 border-slate-200', icon: X },
  };
  const config = configs[status];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.class}`}>
      <Icon size={12} className="mr-1" />
      {config.label}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const configs: Record<Priority, { label: string; class: string }> = {
    low: { label: '低', class: 'text-slate-500' },
    medium: { label: '中', class: 'text-blue-500' },
    high: { label: '高', class: 'text-amber-500' },
    urgent: { label: '緊急', class: 'text-red-500' },
  };
  const config = configs[priority];
  return (
    <span className={`text-xs font-bold uppercase tracking-wider ${config.class}`}>
      {config.label}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<{ id?: string; password?: string }>({});
  const [showToast, setShowToast] = useState(false);
  
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [personnel, setPersonnel] = useState<User[]>(DUMMY_USERS);
  const [view, setView] = useState<'list' | 'detail' | 'create' | 'scheduling'>('list');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [ticketStartDate, setTicketStartDate] = useState('');
  const [ticketEndDate, setTicketEndDate] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Scheduling filters
  const [schedulingSearch, setSchedulingSearch] = useState('');
  const [schedulingStartDate, setSchedulingStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [schedulingEndDate, setSchedulingEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const schedulingDateLimits = useMemo(() => {
    const now = new Date();
    const minD = new Date(now);
    minD.setDate(now.getDate() - 30);
    const maxD = new Date(now);
    maxD.setDate(now.getDate() + 30);
    return {
      min: minD.toISOString().split('T')[0],
      max: maxD.toISOString().split('T')[0]
    };
  }, []);
  
  // Note editing state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Personnel management state
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [newPersonName, setNewPersonName] = useState('');

  // Product Selector state
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [activePartId, setActivePartId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [selectionStage, setSelectionStage] = useState<'product' | 'serial'>('product');
  const [tempSelectedProduct, setTempSelectedProduct] = useState<Product | null>(null);
  const [tempSN, setTempSN] = useState('');
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: keyof Ticket | ''; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const selectedTicket = useMemo(() => 
    tickets.find(t => t.id === selectedTicketId), 
    [tickets, selectedTicketId]
  );

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      
      const ticketDate = t.createdAt.toISOString().split('T')[0];
      const matchStartDate = !ticketStartDate || ticketDate >= ticketStartDate;
      const matchEndDate = !ticketEndDate || ticketDate <= ticketEndDate;
      
      return matchSearch && matchStatus && matchStartDate && matchEndDate;
    });
  }, [tickets, searchQuery, statusFilter, ticketStartDate, ticketEndDate]);

  const sortedTickets = useMemo(() => {
    if (!sortConfig.key) return filteredTickets;

    return [...filteredTickets].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof Ticket];
      const bVal = b[sortConfig.key as keyof Ticket];

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortConfig.direction === 'asc' 
          ? aVal.getTime() - bVal.getTime() 
          : bVal.getTime() - aVal.getTime();
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }

      return 0;
    });
  }, [filteredTickets, sortConfig]);

  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTickets.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTickets, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedTickets.length / itemsPerPage);

  const handleSort = (key: keyof Ticket) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  // Actions
  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: { id?: string; password?: string } = {};
    if (!loginId) newErrors.id = '必填';
    if (!loginPassword) newErrors.password = '必填';

    if (Object.keys(newErrors).length > 0) {
      setLoginErrors(newErrors);
      return;
    }

    if (loginId === '3112' && loginPassword === '123456') {
      setIsLoggedIn(true);
      setLoginErrors({});
    } else {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleLogout = () => {
    if (confirm('確定要登出系統嗎？')) {
      setIsLoggedIn(false);
      setView('list');
      setSelectedTicketId(null);
    }
  };

  // Mock Device Database for Auto-population
  const DEVICE_DB: Record<string, any> = {
    'SERV-001': {
      deviceType: 'Server',
      deviceId: 'SRV-882',
      deviceName: 'Dell PowerEdge R750',
      deviceBrand: 'Dell',
      deviceModel: 'PowerEdge R750 Rack Server',
      warrantyEndDate: '2027-12-31',
      siteCode: 'F18A',
      customerName: '陳大明 (IT Admin)',
      customerPhone: '0912-345-678',
      customerEmail: 'admin@tsmc.com'
    },
    'LATE-8821': {
      deviceType: 'Notebook',
      deviceId: 'NB-229',
      deviceName: 'Latitude 5430',
      deviceBrand: 'Dell',
      deviceModel: 'Latitude 5430 Business Laptop',
      warrantyEndDate: '2026-06-15',
      siteCode: 'F12',
      customerName: '李小姐',
      customerPhone: '0922-111-222',
      customerEmail: 'jlee@quicktech.com'
    },
    'NB-9920': {
      deviceType: 'Notebook',
      deviceId: 'NB-992',
      deviceName: 'ThinkPad X1 Carbon',
      deviceBrand: 'Lenovo',
      deviceModel: 'X1 Carbon Gen 10',
      warrantyEndDate: '2025-11-20',
      siteCode: 'HC-01',
      customerName: '張經理',
      customerPhone: '0933-444-555',
      customerEmail: 'manager.z@global.com'
    }
  };

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    customerName: '',
    customerPhone: '',
    customerExtension: '',
    customerEmail: '',
    priority: 'medium' as Priority,
    deviceSN: '',
    deviceType: '',
    deviceId: '',
    deviceName: '',
    deviceBrand: '',
    deviceModel: '',
    warrantyEndDate: '',
    siteCode: '',
  });

  const handleDeviceSNChange = (sn: string) => {
    const snUpper = sn.toUpperCase();
    const deviceInfo = DEVICE_DB[snUpper];
    
    if (deviceInfo) {
      setCreateForm(prev => ({
        ...prev,
        deviceSN: snUpper,
        ...deviceInfo,
        // Optional: Auto-generate a title if none exists
        title: prev.title || `${deviceInfo.deviceName} 報修`
      }));
    } else {
      setCreateForm(prev => ({ 
        ...prev, 
        deviceSN: sn,
        // Clear auto-populated fields if SN doesn't match
        deviceType: '',
        deviceId: '',
        deviceName: '',
        deviceBrand: '',
        deviceModel: '',
        warrantyEndDate: '',
        siteCode: '',
        customerName: '',
        customerPhone: '',
        customerEmail: ''
      }));
    }
  };

  const handleCreateTicket = (data: Partial<Ticket>) => {
    const newTicket: Ticket = {
      id: `TK-${String(tickets.length + 1).padStart(3, '0')}`,
      title: data.title || '',
      description: data.description || '',
      status: 'pending',
      priority: data.priority || 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedTo: [],
      
      // Reporter
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      customerExtension: data.customerExtension || '',
      customerEmail: data.customerEmail || '',
      creatorName: '系統管理員',
      
      // Equipment
      deviceSN: data.deviceSN || '',
      deviceType: data.deviceType || '',
      deviceId: data.deviceId || '',
      deviceName: data.deviceName || '',
      deviceBrand: data.deviceBrand || '',
      deviceModel: data.deviceModel || '',
      warrantyEndDate: data.warrantyEndDate || '',
      siteCode: data.siteCode || '',
      
      parts: [],
      
      events: [
        {
          id: Math.random().toString(36).substr(2, 9),
          type: 'created',
          content: '報修單已建立',
          timestamp: new Date(),
          actor: { name: '系統', role: 'system' }
        }
      ]
    };
    setTickets([newTicket, ...tickets]);
    setView('list');
  };

  const handleUpdateStatus = (id: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        const event: TimelineEvent = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'status_change',
          content: `狀態更新為：${
            status === 'pending' ? '未處理' : 
            status === 'processing' ? '處理中' : 
            status === 'quoting' ? '報價中' : 
            status === 'delivering' ? '交機中' : 
            status === 'completed' ? '結案' : '取消'
          }`,
          timestamp: new Date(),
          actor: { name: '管理員', role: 'admin' }
        };
        return { ...t, status, updatedAt: new Date(), events: [...t.events, event] };
      }
      return t;
    }));
  };

  const handleAssignTo = (ticketId: string, userIds: string[]) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const users = personnel.filter(u => userIds.includes(u.id));
        const names = users.map(u => u.name).join(', ');
        const event: TimelineEvent = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'assignment',
          content: `專案人員變更：${names || '無'}`,
          timestamp: new Date(),
          actor: { name: '管理員', role: 'admin' }
        };
        return { ...t, assignedTo: userIds, events: [...t.events, event] };
      }
      return t;
    }));
  };

  const handleAddPersonnel = () => {
    if (!newPersonName.trim()) return;
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPersonName.trim(),
      role: 'technician'
    };
    setPersonnel(prev => [...prev, newUser]);
    setNewPersonName('');
  };

  const handleDeletePersonnel = (userId: string) => {
    setPersonnel(prev => prev.filter(u => u.id !== userId));
    // Also remove from all tickets
    setTickets(prev => prev.map(t => ({
      ...t,
      assignedTo: t.assignedTo.filter(id => id !== userId)
    })));
  };

  const handleUpdatePart = (ticketId: string, partId: string, updates: Partial<Part>) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const newParts = t.parts.map(p => p.id === partId ? { ...p, ...updates } : p);
        return { ...t, parts: newParts };
      }
      return t;
    }));
  };

  const handleAddPart = (ticketId: string) => {
    const newPart: Part = {
      id: Math.random().toString(36).substr(2, 9),
      name: '新增零件',
      serialNumber: `SN-${Math.floor(100000 + Math.random() * 900000)}`,
      quantity: 1,
      status: 'inspecting'
    };

    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          parts: [...(t.parts || []), newPart]
        };
      }
      return t;
    }));
  };

  const handleDeletePart = (ticketId: string, partId: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          parts: t.parts.filter(p => p.id !== partId)
        };
      }
      return t;
    }));
  };

  const handleUpdateNote = (ticketId: string, eventId: string, newContent: string) => {
    if (!newContent.trim()) return;
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          events: t.events.map(e => e.id === eventId ? { ...e, content: newContent, timestamp: new Date() } : e),
          updatedAt: new Date()
        };
      }
      return t;
    }));
    setEditingEventId(null);
  };

  const handleDeleteNote = (ticketId: string, eventId: string) => {
    if (!confirm('確定要刪除此備註嗎？')) return;
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          events: t.events.filter(e => e.id !== eventId),
          updatedAt: new Date()
        };
      }
      return t;
    }));
  };

  const handleAddNote = (ticketId: string, content: string) => {
    if (!content.trim()) return;
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const event: TimelineEvent = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'note',
          content,
          timestamp: new Date(),
          actor: { name: '管理員', role: 'admin' }
        };
        return { ...t, updatedAt: new Date(), events: [...t.events, event] };
      }
      return t;
    }));
  };


  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative">
        <AnimatePresence>
          {showToast && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 20 }}
              exit={{ opacity: 0, y: -50 }}
              className="absolute top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            >
              <div className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
                <AlertTriangle size={20} />
                <span className="font-bold">登入失敗，請重新檢查</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-brand-primary p-4 rounded-2xl mb-4 text-white">
              <ClipboardList size={40} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">客服維修系統</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">員工編號</label>
              <input 
                type="text" 
                value={loginId}
                onChange={(e) => {
                  setLoginId(e.target.value);
                  if (loginErrors.id) setLoginErrors(prev => ({ ...prev, id: undefined }));
                }}
                className={`w-full px-4 py-3 rounded-xl border ${loginErrors.id ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-brand-primary'} outline-none transition-all`}
                placeholder="請輸入員工編號"
              />
              {loginErrors.id && <p className="text-red-500 text-xs font-medium ml-1">{loginErrors.id}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">密碼</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  if (loginErrors.password) setLoginErrors(prev => ({ ...prev, password: undefined }));
                }}
                className={`w-full px-4 py-3 rounded-xl border ${loginErrors.password ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-brand-primary'} outline-none transition-all`}
                placeholder="請輸入密碼"
              />
              {loginErrors.password && <p className="text-red-500 text-xs font-medium ml-1">{loginErrors.password}</p>}
            </div>
            <button 
              type="submit"
              className="w-full bg-brand-primary hover:bg-brand-hover text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-primary/20 transition-all active:scale-95"
            >
              登入
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-mono italic">GrandTech Support v1.2.0</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 border-none">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        <div className="p-6 flex items-center gap-3">
          <div className="bg-brand-primary p-2 rounded-lg transition-colors">
            <ClipboardList className="text-white" size={20} />
          </div>
          <h1 className="text-lg font-bold tracking-tight">客服維修系統</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <button 
            onClick={() => { setView('list'); setSelectedTicketId(null); setMobileMenuOpen(false); setCurrentPage(1); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'list' || view === 'detail' || view === 'create' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <ClipboardList size={20} />
            <span className="font-medium">報修單作業</span>
          </button>
          <button 
            onClick={() => { setView('scheduling'); setSelectedTicketId(null); setMobileMenuOpen(false); setCurrentPage(1); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'scheduling' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Calendar size={20} />
            <span className="font-medium">值班班表</span>
          </button>
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="flex items-center justify-between gap-3 px-3 py-3 bg-slate-800 rounded-xl relative group">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="bg-slate-700 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <UserIcon className="text-slate-300" size={18} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">王小明</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              title="登出"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 z-10">
          {/* Header Title */}
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 md:hidden hover:bg-slate-100 rounded-lg"
            >
              <ClipboardList size={20} />
            </button>
            <h2 className="text-lg font-semibold">
              {view === 'list' ? '報修單作業' : view === 'create' ? '新增報修單' : view === 'scheduling' ? '值班班表' : `維修單詳情 ${selectedTicket?.id}`}
            </h2>
          </div>

          {view === 'list' && (
            <button 
              onClick={() => {
                setCreateForm({
                  title: '',
                  description: '',
                  customerName: '',
                  customerPhone: '',
                  customerExtension: '',
                  customerEmail: '',
                  priority: 'medium',
                  deviceSN: '',
                  deviceType: '',
                  deviceId: '',
                  deviceName: '',
                  deviceBrand: '',
                  deviceModel: '',
                  warrantyEndDate: '',
                  siteCode: '',
                });
                setView('create');
              }}
              className="bg-brand-primary hover:bg-brand-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all shadow-sm active:scale-95"
              id="create_ticket_btn"
            >
              <Plus size={18} />
              <span>建立報修單</span>
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {view === 'list' && (
              <motion.div 
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 md:p-6 max-w-6xl mx-auto"
              >
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-brand-primary transition-all overflow-hidden group">
                    <div className="flex items-center pl-3 pr-1 text-slate-400 group-focus-within:text-brand-primary transition-colors">
                      <Calendar size={18} />
                    </div>
                    <input 
                      type="date" 
                      className="bg-transparent border-none py-2 px-2 focus:ring-0 outline-none text-sm w-[130px] cursor-pointer"
                      value={ticketStartDate}
                      onChange={(e) => setTicketStartDate(e.target.value)}
                      title="起始日期"
                    />
                    <span className="text-slate-300 font-medium px-1">~</span>
                    <input 
                      type="date" 
                      className="bg-transparent border-none py-2 px-2 focus:ring-0 outline-none text-sm w-[130px] cursor-pointer"
                      value={ticketEndDate}
                      onChange={(e) => setTicketEndDate(e.target.value)}
                      title="結束日期"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select 
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary shadow-sm min-w-[120px]"
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value as any);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">所有狀態</option>
                      <option value="pending">未處理</option>
                      <option value="processing">處理中</option>
                      <option value="quoting">報價中</option>
                      <option value="delivering">交機中</option>
                      <option value="completed">結案</option>
                      <option value="cancelled">取消</option>
                    </select>

                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setTicketStartDate('');
                        setTicketEndDate('');
                        setCurrentPage(1);
                      }}
                      className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      重設
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  {/* Pagination Controls - Moved to Top */}
                  <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-500">
                      顯示第 <span className="font-medium">{sortedTickets.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> 至 <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedTickets.length)}</span> 筆，共 <span className="font-medium">{sortedTickets.length}</span> 筆
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                        <button 
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="p-2 hover:bg-slate-50 disabled:opacity-30 transition-colors border-r border-slate-100"
                        >
                          <ChevronsLeft size={16} />
                        </button>
                        <button 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 hover:bg-slate-50 disabled:opacity-30 transition-colors border-r border-slate-100"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        
                        <div className="flex items-center px-4 py-1 gap-1">
                          <span className="text-sm font-bold text-brand-primary">{currentPage}</span>
                          <span className="text-slate-400 text-sm">/ {totalPages || 1}</span>
                        </div>

                        <button 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages || totalPages === 0}
                          className="p-2 hover:bg-slate-50 disabled:opacity-30 transition-colors border-l border-slate-100"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <button 
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages || totalPages === 0}
                          className="p-2 hover:bg-slate-50 disabled:opacity-30 transition-colors border-l border-slate-100"
                        >
                          <ChevronsRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th 
                            onClick={() => handleSort('id')}
                            className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center justify-center gap-1">
                              工單編號
                              {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                            </div>
                          </th>
                          <th 
                            onClick={() => handleSort('priority')}
                            className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center justify-center gap-1">
                              優先級
                              {sortConfig.key === 'priority' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">廠區 / 設備編號</th>
                          <th 
                            onClick={() => handleSort('title')}
                            className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              故障主旨 / 報修人
                              {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                            </div>
                          </th>
                          <th 
                            onClick={() => handleSort('status')}
                            className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center justify-center gap-1">
                              目前狀態
                              {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">服務工程師</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedTickets.map(ticket => (
                          <tr 
                            key={ticket.id} 
                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                            onClick={() => { setSelectedTicketId(ticket.id); setView('detail'); }}
                          >
                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400 text-center tracking-tighter">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{ticket.id}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <PriorityBadge priority={ticket.priority} />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{ticket.siteCode || 'N/A'}</span>
                                <span className="text-[10px] text-slate-500 font-mono tracking-tight uppercase">{ticket.deviceId || '設備未編號'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900 group-hover:text-brand-primary transition-colors line-clamp-1">{ticket.title}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{ticket.customerName}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <StatusBadge status={ticket.status} />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                {ticket.assignedTo.length > 0 ? (
                                  <div className="flex -space-x-2">
                                    {ticket.assignedTo.map(uid => {
                                      const user = personnel.find(p => p.id === uid);
                                      return (
                                        <div key={uid} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm" title={user?.name}>
                                          {user?.name.charAt(0)}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-black text-slate-300 uppercase italic">Unassigned</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {paginatedTickets.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                      <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
                      <p>查無符合條件的報修單</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {view === 'create' && (
              <motion.div 
                key="create"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 max-w-4xl mx-auto"
              >
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateTicket(createForm);
                  }} className="space-y-8">
                    {/* Equipment Info - Now at the Top for SN entry */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-l-4 border-brand-primary pl-3 mb-6">
                        <h3 className="text-lg font-bold text-slate-800">1. 設備序號識別</h3>
                        <p className="text-xs text-slate-400 font-medium italic">請輸入序號如: SERV-001, LATE-8821 或 NB-9920</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            設備序號 <span className="text-brand-primary text-xs">(輸入後將自動帶出資料)</span>
                          </label>
                          <input 
                            required 
                            name="deviceSN" 
                            className="w-full px-6 py-4 rounded-2xl border-2 border-brand-primary/20 focus:border-brand-primary outline-none text-lg font-bold tracking-wider transition-all shadow-sm" 
                            placeholder="請在此輸入設備序號..." 
                            value={createForm.deviceSN}
                            onChange={(e) => handleDeviceSNChange(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-500">設備廠牌</label>
                          <input readOnly value={createForm.deviceBrand} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 font-medium cursor-not-allowed" placeholder="自動帶出..." />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-500">設備型號</label>
                          <input readOnly value={createForm.deviceModel} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 font-medium cursor-not-allowed" placeholder="自動帶出..." />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-500">設備編號</label>
                          <input readOnly value={createForm.deviceId} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 font-medium cursor-not-allowed" placeholder="自動帶出..." />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-500">廠區 (Site Code)</label>
                          <input readOnly value={createForm.siteCode} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 font-medium cursor-not-allowed" placeholder="自動帶出..." />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-50">
                      {/* Sub-section: Reporter */}
                      <div className="space-y-6">
                        <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                          2. 報修連繫資訊
                        </h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">連絡人</label>
                            <input readOnly value={createForm.customerName} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 font-medium cursor-not-allowed" placeholder="自動識別..." />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">電話 / 電子郵件</label>
                            <div className="space-y-2">
                              <input readOnly value={createForm.customerPhone} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 font-medium cursor-not-allowed" placeholder="系統自動帶入" />
                              <input readOnly value={createForm.customerEmail} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 font-medium cursor-not-allowed text-xs" placeholder="系統自動帶入" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sub-section: Issue */}
                      <div className="space-y-6">
                        <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                          3. 故障與紀錄
                        </h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">故障主旨 *</label>
                            <input 
                              required 
                              name="title" 
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none shadow-sm" 
                              placeholder="例如：主機無法進入系統" 
                              value={createForm.title}
                              onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">優先等級</label>
                            <div className="flex gap-2">
                              {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setCreateForm(prev => ({ ...prev, priority: p }))}
                                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                                    createForm.priority === p 
                                      ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                  }`}
                                >
                                  {p === 'low' ? '低' : p === 'medium' ? '中' : p === 'high' ? '高' : '緊急'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">故障詳細描述 *</label>
                            <textarea 
                              required 
                              name="description" 
                              rows={3} 
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none resize-none shadow-sm" 
                              placeholder="請描述詳細故障狀況..." 
                              value={createForm.description}
                              onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-8 border-t border-slate-100">
                      <button type="button" onClick={() => setView('list')} className="px-8 py-4 rounded-2xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors">取消</button>
                      <button type="submit" className="flex-1 px-8 py-4 rounded-2xl bg-brand-primary text-white font-black uppercase tracking-widest hover:bg-brand-hover shadow-xl shadow-brand-primary/20 active:scale-95 transition-all">建立維修工單</button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {view === 'scheduling' && (
              <motion.div 
                key="scheduling"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 md:p-6 max-w-7xl mx-auto space-y-4"
              >
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-brand-primary transition-all overflow-hidden group">
                      <div className="flex items-center pl-3 pr-1 text-slate-400 group-focus-within:text-brand-primary transition-colors">
                        <Calendar size={18} />
                      </div>
                      <input 
                        type="date" 
                        min={schedulingDateLimits.min}
                        max={schedulingDateLimits.max}
                        className="bg-transparent border-none py-2 px-2 focus:ring-0 outline-none text-sm w-[130px] cursor-pointer"
                        value={schedulingStartDate}
                        onChange={(e) => setSchedulingStartDate(e.target.value)}
                        title="起始日期"
                      />
                      <span className="text-slate-300 font-medium px-1">~</span>
                      <input 
                        type="date" 
                        min={schedulingDateLimits.min}
                        max={schedulingDateLimits.max}
                        className="bg-transparent border-none py-2 px-2 focus:ring-0 outline-none text-sm w-[130px] cursor-pointer"
                        value={schedulingEndDate}
                        onChange={(e) => setSchedulingEndDate(e.target.value)}
                        title="結束日期"
                      />
                    </div>
                    <button 
                      onClick={() => { 
                        setSchedulingSearch(''); 
                        const dStart = new Date();
                        dStart.setDate(dStart.getDate() - 7);
                        setSchedulingStartDate(dStart.toISOString().split('T')[0]);
                        const dEnd = new Date();
                        dEnd.setDate(dEnd.getDate() + 7);
                        setSchedulingEndDate(dEnd.toISOString().split('T')[0]);
                      }}
                      className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      重設篩選
                    </button>
                  </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  {/* Pagination Controls - Matching Scheduling */}
                  <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-500">
                      顯示第 <span className="font-medium">1</span> 至 <span className="font-medium">{DUMMY_SCHEDULING.length}</span> 筆，共 <span className="font-medium">{DUMMY_SCHEDULING.length}</span> 筆
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                        <button 
                          className="p-2 opacity-30 cursor-not-allowed border-r border-slate-100"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center px-4 py-1 gap-1">
                          <span className="text-sm font-bold text-brand-primary">1</span>
                          <span className="text-slate-400 text-sm">/ 1</span>
                        </div>
                        <button 
                          className="p-2 opacity-30 cursor-not-allowed border-l border-slate-100"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">員工編號</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">員工姓名</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">職稱</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">信箱</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">電話</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">值班日期</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">值班時間</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {DUMMY_SCHEDULING.filter(person => {
                          const matchSearch = person.name.includes(schedulingSearch) || 
                                              person.employeeId.includes(schedulingSearch);
                          
                          const personDate = person.dutyDate.replace(/\//g, '-');
                          const matchDate = (!schedulingStartDate || personDate >= schedulingStartDate) && 
                                           (!schedulingEndDate || personDate <= schedulingEndDate);
                          
                          return matchSearch && matchDate;
                        }).map(person => (
                          <tr key={person.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-mono text-sm text-slate-600">{person.employeeId}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">{person.name}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{person.jobTitle}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{person.email}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{person.phone}</td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-700">{person.dutyDate}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                person.dutyTime.includes('日間') 
                                  ? 'bg-orange-50 text-orange-600 border-orange-100' 
                                  : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                              }`}>
                                {person.dutyTime}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {DUMMY_SCHEDULING.filter(person => {
                    const matchSearch = person.name.includes(schedulingSearch) || 
                                        person.employeeId.includes(schedulingSearch);
                    const personDate = person.dutyDate.replace(/\//g, '-');
                    const matchDate = (!schedulingStartDate || personDate >= schedulingStartDate) && 
                                     (!schedulingEndDate || personDate <= schedulingEndDate);
                    return matchSearch && matchDate;
                  }).length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                      <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                      <p>查無符合條件的值班紀錄</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {view === 'detail' && selectedTicket && (
              <motion.div 
                key="detail"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-6 max-w-5xl mx-auto space-y-6"
              >
                {/* Main Ticket Content */}
                <div className="space-y-6">
                  {/* Basic & Device Info */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-8">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{selectedTicket.id}</span>
                          <span className="bg-brand-primary/10 text-brand-primary text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest leading-normal">{selectedTicket.siteCode || '未定義廠區'}</span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">{selectedTicket.title}</h3>
                        <p className="text-slate-400 text-sm flex items-center gap-1 font-medium">
                          <Clock size={14} /> 建立於 {formatDate(selectedTicket.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <StatusBadge status={selectedTicket.status} />
                        <PriorityBadge priority={selectedTicket.priority} />
                      </div>
                    </div>

                    {/* Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {/* Column 1: Reporter Info */}
                      <div className="space-y-5">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <UserIcon size={14} className="text-brand-primary" />
                          報修聯繫窗口 (客戶端)
                        </h4>
                        <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-3">
                          <div className="flex justify-between items-center group">
                            <span className="text-xs font-bold text-slate-400">連絡人名稱</span>
                            <span className="text-sm font-bold text-slate-900 group-hover:text-brand-primary transition-colors">{selectedTicket.customerName}</span>
                          </div>
                          <div className="flex justify-between items-center group">
                            <span className="text-xs font-bold text-slate-400">聯絡電話 / 分機</span>
                            <span className="text-sm font-bold text-slate-900">{selectedTicket.customerPhone} <span className="text-brand-primary font-black ml-1">{selectedTicket.customerExtension}</span></span>
                          </div>
                          <div className="flex justify-between items-center group">
                            <span className="text-xs font-bold text-slate-400">電子郵件信箱</span>
                            <span className="text-xs font-medium text-slate-500 underline decoration-slate-200">{selectedTicket.customerEmail}</span>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Device Info */}
                      <div className="space-y-5">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Hammer size={14} className="text-brand-primary" />
                          故障設備資訊 (S/N)
                        </h4>
                        <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400">設備描述</span>
                            <span className="text-sm font-bold text-slate-700">{selectedTicket.deviceName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400">設備序號 S/N</span>
                            <span className="text-sm font-mono font-black text-brand-primary bg-white px-2 py-0.5 rounded border border-brand-primary/10">{selectedTicket.deviceSN}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400">廠牌 / 型號</span>
                            <span className="text-sm font-bold text-slate-700">{selectedTicket.deviceBrand} {selectedTicket.deviceModel}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400">保固截止日</span>
                            <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{selectedTicket.warrantyEndDate}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Problem Description & Assignment Row */}
                    <div className="space-y-10 pt-4">
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">客戶端故障詳情描述</h4>
                        <div className="p-8 bg-slate-50 border border-slate-100 rounded-3xl relative overflow-hidden group min-h-[120px]">
                          <AlertTriangle className="absolute -right-4 -bottom-4 text-slate-100 w-24 h-24 rotate-12 transition-transform group-hover:scale-110" />
                          <p className="text-slate-700 leading-relaxed text-sm relative z-10 whitespace-pre-wrap font-medium">
                            {selectedTicket.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">負責工程師指定</h4>
                          <div className="flex items-center gap-1">
                            <input 
                              type="text" 
                              placeholder="新增..." 
                              className="text-[10px] px-2 py-1 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-primary w-24"
                              value={newPersonName}
                              onChange={(e) => setNewPersonName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddPersonnel()}
                            />
                            <button 
                              onClick={handleAddPersonnel}
                              className="p-1 bg-brand-primary text-white rounded-lg hover:bg-brand-hover transition-colors"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pr-1">
                          {personnel.filter(p => p.role === 'technician').map(p => {
                            const isAssigned = selectedTicket.assignedTo.includes(p.id);
                            return (
                              <div key={p.id} className="relative group/person">
                                <button 
                                  onClick={() => {
                                    const newAssigned = isAssigned 
                                      ? selectedTicket.assignedTo.filter(id => id !== p.id)
                                      : [...selectedTicket.assignedTo, p.id];
                                    handleAssignTo(selectedTicket.id, newAssigned);
                                  }}
                                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all ${
                                    isAssigned 
                                      ? 'bg-brand-primary border-brand-primary text-white shadow-md' 
                                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${isAssigned ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {p.name.charAt(0)}
                                  </div>
                                  <span className="text-sm font-bold whitespace-nowrap">{p.name}</span>
                                </button>
                                
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeletePersonnel(p.id); }}
                                  className="absolute -top-1 -right-1 p-1 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 opacity-0 group-hover/person:opacity-100 transition-all shadow-sm z-10"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Parts List Section */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
                    <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Settings size={20} className="text-brand-primary" />
                      零件明細與更換紀錄
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[1000px]">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="pb-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">零件名稱 / 序號</th>
                            <th className="pb-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">排查問題 (註記)</th>
                            <th className="pb-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">更換後零件 (點擊選擇)</th>
                            <th className="pb-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">更換後序號</th>
                            <th className="pb-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">狀態</th>
                            <th className="pb-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {selectedTicket.parts?.map(part => (
                            <tr key={part.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-5">
                                <input 
                                  className="font-bold text-slate-900 text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-brand-primary/30 rounded px-1 w-full"
                                  value={part.name}
                                  onChange={(e) => handleUpdatePart(selectedTicket.id, part.id, { name: e.target.value })}
                                />
                                <input 
                                  className="text-slate-400 text-[10px] font-mono bg-transparent border-none outline-none focus:ring-1 focus:ring-brand-primary/30 rounded px-1 w-full"
                                  value={part.serialNumber}
                                  onChange={(e) => handleUpdatePart(selectedTicket.id, part.id, { serialNumber: e.target.value })}
                                />
                              </td>
                              <td className="py-5 min-w-[200px]">
                                <textarea 
                                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-primary bg-white/50 resize-none h-12"
                                  placeholder="填寫排查狀況..."
                                  value={part.inspectionNote || ''}
                                  onChange={(e) => handleUpdatePart(selectedTicket.id, part.id, { inspectionNote: e.target.value })}
                                />
                              </td>
                              <td className="py-5 min-w-[200px]">
                                <div 
                                  onClick={() => { setActivePartId(part.id); setIsProductSelectorOpen(true); }}
                                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-primary bg-white/50 cursor-pointer hover:border-brand-primary/50 transition-colors flex items-center justify-between group/sel"
                                >
                                  <span className={part.replacedPartName ? 'text-slate-900 font-bold' : 'text-slate-400 italic'}>
                                    {part.replacedPartName || '選擇更換零件...'}
                                  </span>
                                  <Search size={12} className="text-slate-300 group-hover/sel:text-brand-primary" />
                                </div>
                              </td>
                              <td className="py-5 min-w-[150px]">
                                <input 
                                  className="w-full text-xs px-3 py-2 border border-slate-100 rounded-lg bg-slate-50/50 font-mono text-slate-600 outline-none focus:ring-1 focus:ring-brand-primary/30"
                                  placeholder="更換後序號..."
                                  value={part.replacedSerialNumber || ''}
                                  onChange={(e) => handleUpdatePart(selectedTicket.id, part.id, { replacedSerialNumber: e.target.value })}
                                />
                              </td>
                              <td className="py-5 text-center px-2">
                                <select 
                                  className={`text-[10px] font-black uppercase px-3 py-2 rounded-lg border-none appearance-none shadow-sm transition-all ${
                                    part.status === 'replacing' ? 'bg-emerald-100 text-emerald-600' :
                                    part.status === 'repairing' ? 'bg-blue-100 text-blue-600' :
                                    part.status === 'functional' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'
                                  } ${part.replacedPartName ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer focus:ring-2 focus:ring-brand-primary'}`}
                                  value={part.status}
                                  disabled={!!part.replacedPartName}
                                  onChange={(e) => handleUpdatePart(selectedTicket.id, part.id, { status: e.target.value as any })}
                                >
                                  <option value="inspecting">排查</option>
                                  <option value="repairing">維修</option>
                                  <option value="replacing">更換</option>
                                  <option value="functional">正常</option>
                                </select>
                              </td>
                              <td className="py-5 text-center">
                                <button 
                                  onClick={() => handleDeletePart(selectedTicket.id, part.id)}
                                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {(!selectedTicket.parts || selectedTicket.parts.length === 0) && (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400 text-sm italic font-medium">尚無零件紀錄</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Status Control & Progress Log */}
                  <div className="space-y-6">
                    {/* Status Operations */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">維修狀態作業</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {(['pending', 'processing', 'quoting', 'delivering', 'completed', 'cancelled'] as TicketStatus[]).map(s => (
                            <button 
                              key={s}
                              onClick={() => handleUpdateStatus(selectedTicket.id, s)}
                              className={`py-5 rounded-2xl text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-3 group ${
                                selectedTicket.status === s 
                                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' 
                                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full ${
                                s === 'pending' ? 'bg-amber-400' :
                                s === 'processing' ? 'bg-blue-400' :
                                s === 'quoting' ? 'bg-brand-primary' :
                                s === 'delivering' ? 'bg-indigo-400' :
                                s === 'completed' ? 'bg-emerald-400' : 'bg-slate-300'
                              }`} />
                              {
                                s === 'pending' ? '未處理' : 
                                s === 'processing' ? '處理中' : 
                                s === 'quoting' ? '報價中' : 
                                s === 'delivering' ? '交機中' : 
                                s === 'completed' ? '結案' : '取消'
                              }
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Progress Log */}
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
                      <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock size={18} className="text-slate-400" />
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">維修日誌節點</h4>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-8 space-y-8 relative max-h-[600px]">
                        <div className="absolute left-[31px] top-6 bottom-6 w-0.5 bg-slate-100" />
                        {selectedTicket.events.map((event) => (
                          <div key={event.id} className="relative pl-10 group/event">
                            <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 
                              ${event.type === 'created' ? 'bg-slate-400' : 
                                event.type === 'status_change' ? 'bg-blue-500' : 
                                event.type === 'assignment' ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            />
                            <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl transition-all hover:bg-white hover:shadow-md">
                              <div className="flex justify-between items-start mb-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase">{event.actor.name} · {formatDate(event.timestamp).split(' ')[1]}</p>
                                {event.type === 'note' && (
                                  <button onClick={() => handleDeleteNote(selectedTicket.id, event.id)} className="text-slate-300 hover:text-red-400">
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-700 leading-relaxed">{event.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            const input = e.currentTarget.elements.namedItem('note') as HTMLInputElement;
                            if (!input.value.trim()) return;
                            handleAddNote(selectedTicket.id, input.value);
                            input.value = '';
                          }}
                          className="relative"
                        >
                          <input 
                            name="note"
                            autoComplete="off"
                            placeholder="新增工程備註..."
                            className="w-full pl-4 pr-12 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none bg-white shadow-sm text-sm"
                          />
                          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors">
                            <Send size={16} />
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Product Selector Modal */}
          <AnimatePresence>
            {isProductSelectorOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200"
                >
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectionStage === 'product' ? '選擇產品' : '輸入更換序號'}
                    </h3>
                    <button 
                      onClick={() => {
                        setIsProductSelectorOpen(false);
                        setSelectionStage('product');
                        setProductSearch('');
                      }} 
                      className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                      <X size={20} className="text-slate-400" />
                    </button>
                  </div>

                  <div className="p-6">
                    {selectionStage === 'product' ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text" 
                            placeholder="搜尋產品名稱或編號..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none text-sm"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                          />
                        </div>

                        <div className="overflow-y-auto max-h-[400px] space-y-2 pr-2">
                          {PRODUCT_CATALOG.filter(p => 
                            p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                            p.id.toLowerCase().includes(productSearch.toLowerCase())
                          ).map(product => (
                            <button 
                              key={product.id}
                              onClick={() => {
                                setTempSelectedProduct(product);
                                setSelectionStage('serial');
                              }}
                              className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-brand-primary hover:bg-brand-light transition-all text-left group"
                            >
                              <div>
                                <p className="font-bold text-slate-900 group-hover:text-brand-primary">{product.name}</p>
                                <p className="text-xs text-slate-400 font-medium">{product.model} · {product.category}</p>
                              </div>
                              <div className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary transition-colors">
                                {product.id}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-brand-light p-4 rounded-2xl border border-brand-primary/10">
                          <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">已選中產品</p>
                          <p className="font-bold text-slate-900">{tempSelectedProduct?.name}</p>
                          <p className="text-xs text-slate-500">{tempSelectedProduct?.model}</p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">請輸入更換零件序號 S/N</label>
                          <input 
                            autoFocus
                            type="text" 
                            placeholder="例如：SN-XXXXXXXXX"
                            className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-brand-primary outline-none font-mono font-bold"
                            value={tempSN}
                            onChange={(e) => setTempSN(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && tempSN.trim()) {
                                if (selectedTicket && activePartId && tempSelectedProduct) {
                                  handleUpdatePart(selectedTicket.id, activePartId, { 
                                    replacedPartName: `${tempSelectedProduct.name} (${tempSelectedProduct.model})`,
                                    replacedSerialNumber: tempSN,
                                    status: 'replacing'
                                  });
                                }
                                setIsProductSelectorOpen(false);
                                setSelectionStage('product');
                                setTempSN('');
                                setProductSearch('');
                              }
                            }}
                          />
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button 
                            onClick={() => setSelectionStage('product')}
                            className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                          >
                            上一步
                          </button>
                          <button 
                            disabled={!tempSN.trim()}
                            onClick={() => {
                              if (selectedTicket && activePartId && tempSelectedProduct) {
                                handleUpdatePart(selectedTicket.id, activePartId, { 
                                  replacedPartName: `${tempSelectedProduct.name} (${tempSelectedProduct.model})`,
                                  replacedSerialNumber: tempSN,
                                  status: 'replacing'
                                });
                              }
                              setIsProductSelectorOpen(false);
                              setSelectionStage('product');
                              setTempSN('');
                              setProductSearch('');
                            }}
                            className="flex-[2] py-3 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-brand-hover shadow-lg shadow-brand-primary/20 disabled:opacity-50 transition-all"
                          >
                            確認並儲存
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
