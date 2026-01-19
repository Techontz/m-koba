import { User as SupabaseUser } from '@supabase/supabase-js'
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import ContributionTable from './components/ContributionTable';
import { Profile, Member, Contribution, Payout, ContributionPeriod, AuditLog, Month, MONTHS, UserRole } from './types';
import { Wallet, Users, Lock, Unlock, ArrowUpRight, ShieldCheck, Clock, Download, Plus, Search, User, CreditCard, PieChart, TrendingUp, MoreHorizontal, Mail, Phone, ArrowLeft, Save, Trash2, Edit, CheckCircle2, HandCoins, Settings, Scale, Filter, CalendarDays, History } from 'lucide-react';
import { supabase } from './lib/supabase'
import { generateMonthsFromStart } from '@/utils/date';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });  
  const [members, setMembers] = useState<Member[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<Profile | null>(null)
  const [loginIdentifier, setLoginIdentifier] = useState('agape@mkoba.com');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [periods, setPeriods] = useState<ContributionPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [enabledMonths, setEnabledMonths] = useState<Month[]>([]);

  // Filtering states
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  
  // Optional Feature: Payout Tracking
  const [enablePayouts, setEnablePayouts] = useState(true);
  
  const [startMonth, setStartMonth] = useState<Month | null>(null);

  // Member UI States
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    phone: '',
    role: 'user' as UserRole,
    active: true,
  });  
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleAddMonth = () => {
    setEnabledMonths(prev => {
      const last = prev[prev.length - 1];
      const [y, m] = last.split('-').map(Number);
  
      const next: Month =
        m === 12
          ? `${y + 1}-01`
          : `${y}-${String(m + 1).padStart(2, '0')}`;
  
      return [...prev, next];
    });
  };
  
  console.log('ENV CHECK:', {
    url: import.meta.env.VITE_SUPABASE_URL,
    anon: import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 20),
  })

  useEffect(() => {
    if (!selectedPeriodId) return;
  
    const loadLedgerStartMonth = async () => {
      const { data, error } = await supabase
        .from('contribution_periods')
        .select('start_month')
        .eq('id', selectedPeriodId)
        .single();
  
      if (error) {
        console.error(error);
        return;
      }
  
      if (data?.start_month) {
        const start = data.start_month as Month;
        setStartMonth(start);
        setEnabledMonths(generateMonthsFromStart(start));
      } else {
        // Period not initialized yet
        setStartMonth(null);
        setEnabledMonths([]);
      }
    };
  
    loadLedgerStartMonth();
  }, [selectedPeriodId]);
  
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);
  
  useEffect(() => {
    const loadMembers = async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: true });
  
      if (error) {
        console.error(error);
        return;
      }
  
      setMembers(data);
    };
  
    loadMembers();
  }, []);
  
  useEffect(() => {
    const loadPeriods = async () => {
      const { data, error } = await supabase
        .from('contribution_periods')
        .select('*')
        .order('year', { ascending: false });
  
      if (error) {
        console.error('LOAD PERIODS ERROR:', error);
        return;
      }
  
      // ✅ Normal flow
      setPeriods(data);
      setSelectedPeriodId(data[0].id);
    };
  
    loadPeriods();
  }, []);  
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthUser(data.session?.user ?? null)
      setIsLoggedIn(!!data.session)
    })
  
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthUser(session?.user ?? null)
        setIsLoggedIn(!!session)
      }
    )
  
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])
  
  useEffect(() => {
    if (!authUser) {
      setUser(null);
      return;
    }
  
    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, phone, created_at')
        .eq('id', authUser.id)
        .single();
  
      if (error) {
        console.error('PROFILE LOAD ERROR:', error);
        return;
      }
  
      setUser(data);
    };
  
    loadProfile();
  }, [authUser]);
  
  useEffect(() => {
    if (!authUser) return;
  
    const ensureGroupExists = async () => {
      // 1️⃣ Check if this admin already has a group
      const { data: existingGroup, error: fetchError } = await supabase
        .from('groups')
        .select('id')
        .eq('owner_id', authUser.id)
        .single();
  
      if (existingGroup) {
        // ✅ Group already exists → do nothing
        return;
      }
  
      if (fetchError && fetchError.code !== 'PGRST116') {
        // Real error (not "no rows")
        console.error('GROUP CHECK ERROR:', fetchError);
        return;
      }
  
      // 2️⃣ Create group ONLY if none exists
      const { error: insertError } = await supabase
        .from('groups')
        .insert({
          name: 'Agape M-KOBA',
          owner_id: authUser.id,
        });
  
      if (insertError) {
        console.error('GROUP CREATE ERROR:', insertError);
      }
    };
  
    ensureGroupExists();
  }, [authUser]);
  
  useEffect(() => {
    if (!selectedPeriodId) return;
  
    const loadContributions = async () => {
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .eq('period_id', selectedPeriodId);
  
      if (!error) setContributions(data || []);
    };
  
    loadContributions();
  }, [selectedPeriodId]);
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setAuthUser(null)
    setUser(null)
    setIsLoggedIn(false)
  }
  
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!newMember.name) {
      alert('Member name is required');
      return;
    }
  
    // 1️⃣ Insert into Supabase
    const { data, error } = await supabase
      .from('members')
      .insert([
        {
          name: newMember.name,
          phone: newMember.phone,
          role: newMember.role,
          active: newMember.active,
        }
      ])      
      .select()
      .single();
  
    if (error) {
      console.error('ADD MEMBER ERROR:', error);
      alert(error.message);
      return;
    }
  
    // 2️⃣ Update UI state using DB response
    setMembers(prev => [...prev, data]);
  
    // 3️⃣ Reset UI
    setNewMember({ name: '', phone: '', active: true });
    setIsAddingMember(false);
  
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };
  
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
  
    const { error } = await supabase
      .from('members')
      .update({
        name: newMember.name,
        phone: newMember.phone,
        role: newMember.role,
        active: newMember.active,
      })
      .eq('id', editingMember.id);
  
    if (error) {
      alert(error.message);
      return;
    }
  
    setMembers(prev =>
      prev.map(m =>
        m.id === editingMember.id
          ? { ...m, ...newMember }
          : m
      )
    );
  
    setEditingMember(null);
    setIsAddingMember(false);
  };
  
  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Delete this member permanently?')) return;
  
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId);
  
    if (error) {
      alert(error.message);
      return;
    }
  
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };
  
  const updateContribution = async (
    memberId: string,
    month: Month,
    amount: number
  ) => {
    if (!selectedPeriodId) {
      alert('No active contribution period selected');
      return;
    }
  
    const { error } = await supabase
      .from('contributions')
      .upsert(
        {
          member_id: memberId,
          period_id: selectedPeriodId,
          month,
          amount,
          updated_by: user?.id,
        },
        { onConflict: 'member_id,period_id,month' }
      );
  
    if (error) {
      console.error('UPSERT ERROR:', error);
      alert(error.message);
      return;
    }
  
    const { data } = await supabase
      .from('contributions')
      .select('*')
      .eq('period_id', selectedPeriodId);
  
    setContributions(data || []);
  };
  
  const updatePayout = (memberId: string, received: boolean, amount: number = 0) => {
    setMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, received_payout: received, payout_amount: amount } : m
    ));
    
    setAuditLogs(prev => [{
      id: Math.random().toString(36),
      user_id: user?.id || '',
      action: 'UPDATE',
      table_name: 'payouts',
      record_id: memberId,
      created_at: new Date().toISOString()
    }, ...prev]);
  };

  const filteredContributions = useMemo(() => {
    return contributions.filter(c => c.period_id === selectedPeriodId);
  }, [contributions, selectedPeriodId]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()));
  }, [members, memberSearchQuery]);

  const totals = useMemo(() => {
    const collected = filteredContributions.reduce((acc, c) => acc + c.amount, 0);
    const disbursed = members.reduce((acc, m) => acc + (m.payout_amount || 0), 0);
    return {
      totalCollected: collected,
      totalDisbursed: disbursed,
      netBalance: collected - disbursed,
      memberCount: members.length,
      payoutCount: members.filter(m => m.received_payout).length
    };
  }, [filteredContributions, members]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8faff] animate-page-enter">
        <div className="bg-white p-6 md:p-10 rounded-[32px] shadow-2xl shadow-indigo-100/50 w-full max-w-md border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
          <div className="text-center mb-10 stagger-item stagger-1">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-indigo-50 rounded-[22px] flex items-center justify-center mx-auto mb-6">
              <Lock className="text-indigo-600" size={32} />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Agape M-KOBA</h1>
            <p className="text-slate-500 font-medium text-sm text-center tracking-tight">Secure Ledger Access Portal</p>
          </div>
          <div className="space-y-5 stagger-item stagger-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Identifier</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {loginIdentifier.includes('@') ? <Mail size={18} /> : <Phone size={18} />}
                </div>
                <input 
                  type="text" 
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full px-5 pl-12 py-3.5 md:py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all font-medium text-sm md:text-base"
                  placeholder="Official Email or Phone"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Password</label>
              <input 
                type="password" 
                className="w-full px-5 py-3.5 md:py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all font-medium text-sm md:text-base"
                defaultValue="********"
              />
            </div>
            <button
              onClick={async () => {
                console.log('LOGIN ATTEMPT', loginIdentifier)
              
                try {
                  const identifier = loginIdentifier.includes('@')
                    ? loginIdentifier
                    : `${loginIdentifier}@mkoba.local`;

                  const res = await supabase.auth.signInWithPassword({
                    email: identifier,
                    password: '12345678',
                  });
              
                  console.log('LOGIN RESPONSE:', res)
              
                  if (res.error) {
                    console.error('SUPABASE AUTH ERROR:', res.error)
                    alert(res.error.message)
                  }
                } catch (err) {
                  console.error('FETCH CRASH:', err)
                  alert('Network crash — see console')
                }
              }}
              
              className="w-full bg-slate-900 text-white py-3.5 md:py-4 rounded-2xl font-bold"
            >
              Enter Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      <div key={activeTab} className="animate-page-enter">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 md:space-y-10 pb-10">
            {/* Dashboard Header */}
            <div className="flex flex-col xl:flex-row gap-6 md:gap-8 stagger-item stagger-1">
              <div className="flex-1 glass-card p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity hidden sm:block">
                  <Wallet size={120} />
                </div>
                <div className="relative z-10 flex items-center gap-4 md:gap-8">
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[32px] bg-white shadow-xl shadow-indigo-100 flex items-center justify-center p-0.5 md:p-1 border-2 border-slate-100 shrink-0">
                    <div className="w-full h-full rounded-[14px] md:rounded-[28px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl md:text-3xl font-black">
                      {user?.full_name?.charAt(0)}
                    </div>
                  </div>
                  <div className="min-w-0">
                  <h2 className="text-slate-400 font-bold text-[10px] md:text-sm uppercase tracking-widest mb-1 truncate">
                    Current Liquidity
                  </h2>
                    <div className="flex items-baseline gap-1 md:gap-2 overflow-hidden">
                      <span className="text-2xl md:text-5xl font-black text-slate-900 tracking-tighter truncate">
                        {totals.netBalance.toLocaleString()}
                      </span>
                      <span className="text-sm md:text-xl font-bold text-slate-400 shrink-0">TZS</span>
                    </div>
                  </div>
                </div>
                <div className="flex w-full md:w-auto">
                  <button 
                    onClick={() => setActiveTab('contributions')}
                    className="w-full md:w-auto px-6 md:px-8 py-3.5 md:py-4 bg-slate-900 text-white rounded-2xl md:rounded-3xl font-bold text-sm md:text-base hover:scale-105 transition-transform shadow-xl shadow-slate-200"
                  >
                    View Ledger
                  </button>
                </div>
              </div>

              {/* Info Card */}
              <div className="w-full xl:w-[420px] bg-gradient-to-br from-slate-800 via-slate-900 to-black p-6 md:p-10 rounded-[32px] md:rounded-[40px] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[220px]">
                 <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                 <div className="relative z-10">
                   <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight mb-2 md:mb-4 uppercase italic">Premium<br className="hidden md:block"/>Accounting</h2>
                   <p className="text-white/60 font-medium text-xs md:text-sm mb-6 md:mb-8 max-w-[280px]">
                    Automated balance tracking. Unified ledger enabled.
                  </p>
                 </div>
                 <button 
                  onClick={() => setActiveTab('contributions')}
                  className="relative z-10 w-fit px-6 md:px-8 py-3 md:py-4 bg-white text-slate-900 rounded-2xl md:rounded-3xl font-bold text-sm md:text-base hover:bg-slate-50 transition-colors shadow-lg active:scale-95"
                 >
                   Verify Sync
                 </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 stagger-item stagger-2">
              {[
                { label: 'Total Collected', value: totals.totalCollected.toLocaleString(), sub: 'In treasury', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: 'Disbursed', value: totals.totalDisbursed.toLocaleString(), sub: `${totals.payoutCount} Paid Out`, icon: HandCoins, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                { label: 'Official Members', value: totals.memberCount.toString(), sub: 'Verified profiles', icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
                { label: 'Liquidity Ratio', value: ((totals.netBalance / (totals.totalCollected || 1)) * 100).toFixed(0) + '%', sub: 'Net Cash Flow', icon: Scale, color: 'text-amber-500', bg: 'bg-amber-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <div className={`p-2 md:p-4 ${stat.bg} ${stat.color} rounded-xl md:rounded-2xl group-hover:rotate-12 transition-transform`}>
                      <stat.icon size={20} className="md:w-6 md:h-6" />
                    </div>
                  </div>
                  <h3 className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest truncate">{stat.label}</h3>
                  <p className="text-xl md:text-2xl font-black text-slate-900 mt-1 truncate">{stat.value}</p>
                  <p className="text-[9px] md:text-[10px] text-slate-500 font-medium mt-1 md:mt-2 truncate uppercase tracking-wider">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Cycle Selector */}
            <div className="stagger-item stagger-3 bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm">
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                 <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner"><History size={20} /></div>
                   <div>
                     <h3 className="text-lg font-black text-slate-900 leading-none">Fiscal Periods</h3>
                     <p className="text-xs text-slate-500 mt-1">Select a cycle to load 12-month payment history.</p>
                   </div>
                 </div>
                 <div className="flex gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                 {periods.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPeriodId(p.id)}
                      className={`px-6 py-3 rounded-2xl font-bold text-sm ${
                        selectedPeriodId === p.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 border'
                      }`}
                    >
                      {p.year} Ledger
                    </button>
                  ))}
                 </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'contributions' && (
          <>
            {/* INITIAL MONTH SETUP */}
            {(user?.role === 'mwenyekiti' || user?.role === 'mweka_hazina') &&
              enabledMonths.length === 0 && (
                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm stagger-item mb-6">
                  <h3 className="text-lg font-black text-slate-900 mb-4">
                    Initialize Ledger Start Month
                  </h3>

                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* MONTH */}
                    <select
                      className="px-4 py-3 rounded-xl border font-bold"
                      onChange={(e) => {
                        const month = String(Number(e.target.value)).padStart(2, '0');
                        setStartMonth((prev) =>
                          prev
                            ? (`${prev.split('-')[0]}-${month}` as Month)
                            : (`2025-${month}` as Month)
                        );
                      }}
                    >
                      <option value="">Select Month</option>
                      {[
                        '01','02','03','04','05','06',
                        '07','08','09','10','11','12'
                      ].map((m, i) => (
                        <option key={m} value={m}>
                          {new Date(0, i).toLocaleString('en', { month: 'long' })}
                        </option>
                      ))}
                    </select>

                    {/* YEAR */}
                    <select
                      className="px-4 py-3 rounded-xl border font-bold"
                      onChange={(e) => {
                        const year = e.target.value;
                        setStartMonth((prev) =>
                          prev
                            ? (`${year}-${prev.split('-')[1]}` as Month)
                            : (`${year}-01` as Month)
                        );
                      }}
                    >
                      <option value="">Select Year</option>
                      {Array.from({ length: 10 }).map((_, i) => {
                        const y = 2020 + i;
                        return <option key={y}>{y}</option>;
                      })}
                    </select>

                    {/* BUTTON */}
                    <button
                      disabled={!startMonth || !selectedPeriodId}
                      onClick={async () => {
                        if (!startMonth || !selectedPeriodId) return;

                        // 1️⃣ SAVE INITIAL MONTH TO DATABASE
                        const { error } = await supabase
                          .from('contribution_periods')
                          .update({ start_month: startMonth })
                          .eq('id', selectedPeriodId);

                        if (error) {
                          alert(error.message);
                          return;
                        }

                        // 2️⃣ GENERATE MONTHS FROM START → NOW
                        const months = generateMonthsFromStart(startMonth);

                        // 3️⃣ UPDATE UI
                        setEnabledMonths(months);
                      }}
                      className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-black disabled:opacity-50"
                    >
                      Initialize Ledger
                    </button>
                  </div>
                </div>
              )}

            {/* MAIN CONTRIBUTIONS CONTENT */}
            <div className="space-y-6 md:space-y-8 pb-10">
              {/* Payment View Header */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 stagger-item stagger-1">
                <h1 className="text-2xl md:text-4xl font-black text-slate-900">
                  Official Payments
                </h1>
              </div>

              {/* SEARCH */}
              <div className="bg-white p-4 md:p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Filter official by name..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 rounded-2xl py-4 pl-14 pr-6 font-semibold outline-none"
                  />
                </div>
              </div>

              {/* TABLE */}
              <ContributionTable
                members={filteredMembers}
                contributions={filteredContributions}
                enabledMonths={enabledMonths}
                userRole={user?.role || 'user'}
                selectedPeriodId={selectedPeriodId}
                onUpdateContribution={updateContribution}
                onAddMonth={handleAddMonth}
              />
            </div>
          </>
        )}

        {/* Directory & Audit */}
        {activeTab === 'members' && (
          <div className="space-y-6 md:space-y-8">
            {!isAddingMember ? (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 stagger-item stagger-1">
                  <div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Directory</h1>
                    <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">{members.length} Registered Officials</p>
                  </div>
                  {(user?.role === 'mweka_hazina' || user?.role === 'mwenyekiti') && (
                    <button 
                      onClick={() => setIsAddingMember(true)}
                      className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 text-xs md:text-sm w-full sm:w-auto justify-center"
                    >
                      <Plus size={18} />
                      Register Official
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 stagger-item stagger-2 pb-10">
                  {members.map((member, idx) => (
                    <div key={member.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center">
                          <User size={28} />
                        </div>

                        {user?.role === 'mwenyekiti' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingMember(member);
                                setIsAddingMember(true);
                                setNewMember({
                                  name: member.name,
                                  phone: member.phone,
                                  role: member.role,
                                  active: member.active,
                                });
                              }}
                              className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50"
                            >
                              <Edit size={16} />
                            </button>

                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="p-2 rounded-xl text-red-500 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-xl mb-1 truncate">{member.name}</h3>
                      <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">
                        {member.role}
                      </p>
                      <p className="text-xs md:text-sm text-slate-400 font-bold mt-4">
                        {member.phone || 'No phone recorded'}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="flex items-center justify-between">
                  <button onClick={() => setIsAddingMember(false)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors group">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Back
                  </button>
                  <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">New Official</h1>
                </div>

                <form
                    onSubmit={editingMember ? handleUpdateMember : handleAddMember}
                    className="bg-white p-12 rounded-[40px] shadow-2xl shadow-indigo-100 border border-slate-100 space-y-8"
                  >
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Full Legal Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Conrad Bubex"
                      value={newMember.name}
                      onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">
                      Official Role
                    </label>

                    <select
                      value={newMember.role}
                      onChange={(e) =>
                        setNewMember({ ...newMember, role: e.target.value as UserRole })
                      }
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100
                                focus:bg-white focus:ring-4 focus:ring-indigo-500/10
                                focus:border-indigo-500 focus:outline-none transition-all font-bold"
                    >
                      <option value="user">Member</option>
                      <option value="katibu">Katibu</option>
                      <option value="mweka_hazina">Mweka Hazina</option>
                      <option value="mwenyekiti">Mwenyekiti</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Contact Phone</label>
                    <input 
                      type="tel" 
                      placeholder="07XX XXX XXX"
                      value={newMember.phone}
                      onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all font-bold"
                    />
                  </div>

                  <div className="pt-4 grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setIsAddingMember(false)} className="w-full py-4 rounded-2xl bg-slate-100 text-slate-700 font-bold">Cancel</button>
                    <button type="submit" className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 transition-all active:scale-95">
                      <Save size={20} />
                      Save Record
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6 md:space-y-8 pb-10">
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight stagger-item stagger-1">
              Audit Ledger
            </h1>

            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden stagger-item stagger-2">
              <div className="overflow-x-auto relative">
                <div className="min-w-max">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Timestamp
                        </th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Action
                        </th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Official
                        </th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Resource
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-50">
                      {auditLogs.length > 0 ? (
                        auditLogs.map(log => (
                          <tr
                            key={log.id}
                            className="text-sm hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="p-6 text-slate-500 font-bold">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </td>

                            <td className="p-6">
                              <span
                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                  log.action === 'UPDATE'
                                    ? 'bg-indigo-50 text-indigo-600'
                                    : 'bg-emerald-50 text-emerald-600'
                                }`}
                              >
                                {log.action}
                              </span>
                            </td>

                            <td className="p-6 font-bold text-slate-800">
                              {user?.full_name?.split(' ')[0]}
                            </td>

                            <td className="p-6 text-slate-500 font-medium">
                              Mod <span className="text-slate-900 font-bold">{log.table_name}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs"
                          >
                            Security protocols active. No anomalies detected.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSuccessToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-slate-900 text-white px-8 py-5 rounded-[24px] flex items-center gap-4 shadow-2xl border border-slate-800">
            <CheckCircle2 className="text-emerald-400" size={24} />
            <p className="font-black text-sm uppercase tracking-widest">Database Synchronized</p>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
