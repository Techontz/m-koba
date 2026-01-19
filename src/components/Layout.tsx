
import React, { useState } from 'react';
import { UserRole, Profile } from '../types';
import { LogOut, User, Shield, BarChart3, Users, Lock, Bell, Search, Menu, X, AlertTriangle, Phone, Calendar, BadgeCheck, IdCard } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: Profile | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, setActiveTab }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const roleColors: Record<UserRole, string> = {
    user: 'bg-slate-100 text-slate-700',
    katibu: 'bg-indigo-100 text-indigo-700',
    mweka_hazina: 'bg-emerald-100 text-emerald-700',
    mwenyekiti: 'bg-purple-100 text-purple-700'
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: BarChart3, roles: ['user', 'katibu', 'mweka_hazina', 'mwenyekiti'] },
    { id: 'contributions', label: 'Payments', icon: Lock, roles: ['user', 'katibu', 'mweka_hazina', 'mwenyekiti'] },
    { id: 'members', label: 'Directory', icon: Users, roles: ['katibu', 'mweka_hazina', 'mwenyekiti'] },
    { id: 'audit', label: 'Security', icon: Shield, roles: ['katibu', 'mwenyekiti'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role || 'user'));

  return (
    <div className="min-h-screen flex bg-[#f6f8fb] flex-col xl:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden xl:flex flex-col w-64 bg-white border-r border-slate-200/60 h-screen sticky top-0 z-50 transition-all duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
            <Lock size={20} strokeWidth={2.5} />
          </div>
          <h1 className="font-extrabold text-xl tracking-tight text-slate-800 truncate">
            AGAPE <span className="text-indigo-600">M-KOBA</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {filteredNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id 
                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
                : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} className="shrink-0" />
              <span className={`font-semibold text-sm transition-all ${activeTab === item.id ? 'translate-x-1' : ''}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-4 px-4 py-3.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all group"
          >
            <LogOut size={22} />
            <span className="font-semibold text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 xl:pb-0">
        <header className="h-16 xl:h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 md:px-10 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3 flex-1">
            <div className="xl:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0">
              <Lock size={16} strokeWidth={2.5} />
            </div>
            <h1 className="xl:hidden font-extrabold text-base tracking-tight text-slate-800 truncate">
              AGAPE <span className="text-indigo-600">M-KOBA</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            {/* Avatar Button */}
            <button 
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 group hover:bg-slate-50 p-1 rounded-2xl transition-all"
            >
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-800 leading-none group-hover:text-indigo-600 transition-colors">{user?.full_name}</p>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${roleColors[user?.role || 'user']} px-1.5 py-0.5 rounded-md mt-0.5 inline-block`}>
                  {user?.role}
                </span>
              </div>
              <div className="w-9 h-9 xl:w-11 xl:h-11 rounded-xl xl:rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-sm xl:text-lg shadow-sm border border-white shrink-0 group-hover:scale-105 transition-transform">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 lg:p-10">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Static Bottom Nav */}
      <nav className="xl:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200 flex justify-around p-2 fixed bottom-0 left-0 right-0 z-[60] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] h-20">
        {filteredNav.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
              activeTab === item.id ? 'text-indigo-600 bg-indigo-50/50 scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-bold">{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl text-slate-400 hover:text-red-500 transition-all"
        >
          <LogOut size={24} strokeWidth={2} />
          <span className="text-[10px] mt-1 font-bold">Sign Out</span>
        </button>
      </nav>

      {/* Personal Details Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowProfile(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-12 duration-500">
            <div className="h-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative">
               <button onClick={() => setShowProfile(false)} className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors backdrop-blur-md">
                 <X size={20} />
               </button>
            </div>
            
            <div className="px-8 pb-10">
              <div className="relative -mt-12 mb-6">
                <div className="w-24 h-24 rounded-[32px] bg-white p-1.5 shadow-xl mx-auto">
                  <div className="w-full h-full rounded-[26px] bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center text-indigo-600 text-4xl font-black">
                    {user?.full_name?.charAt(0)}
                  </div>
                </div>
                <div className="absolute bottom-0 right-1/2 translate-x-12 translate-y-1 w-8 h-8 bg-emerald-500 text-white rounded-full border-4 border-white flex items-center justify-center">
                  <BadgeCheck size={16} fill="currentColor" />
                </div>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{user?.full_name}</h2>
                <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${roleColors[user?.role || 'user']}`}>
                  <Shield size={12} />
                  {user?.role} Official
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Contact Number</p>
                    <p className="font-bold text-slate-900">{user?.phone || 'Not Provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Official Since</p>
                    <p className="font-bold text-slate-900">{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '---'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                    <IdCard size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">System Identifier</p>
                    <p className="font-bold text-slate-900 text-xs truncate max-w-[200px]">{user?.id}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowProfile(false)}
                className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowLogoutConfirm(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Sign Out?</h2>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">Are you sure you want to end your session?</p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button onClick={() => setShowLogoutConfirm(false)} className="px-6 py-4 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm">Cancel</button>
                <button onClick={() => { setShowLogoutConfirm(false); onLogout(); }} className="px-6 py-4 rounded-2xl bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-100">Log Out</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
