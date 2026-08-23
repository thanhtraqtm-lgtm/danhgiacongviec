import React, { useState, useRef, useEffect } from 'react';
import { 
  LogIn, 
  Eye, 
  EyeOff, 
  User, 
  Lock, 
  AlertCircle
} from 'lucide-react';
import { User as UserType } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserType) => void;
  users: UserType[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  users,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => usernameRef.current?.focus(), 100);
      setError('');
      setUsername('');
      setPassword('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const normalizeStr = (s: string) => 
      s.normalize('NFC').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    
    const normInput = normalizeStr(username);
    
    const matchedUser = users.find(u => {
      const normUser = normalizeStr(u.username || u.fullName || '');
      const normFull = normalizeStr(u.fullName || '');
      return normUser === normInput || normFull === normInput;
    });
    
    if (matchedUser && matchedUser.password === password.trim()) {
      onLogin(matchedUser);
      onClose();
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không chính xác');
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-[#005C35] px-6 py-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#004A2A] to-[#005C35] opacity-90" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-yellow-400/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
          
          <div className="relative flex flex-col items-center text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shadow-xl backdrop-blur-sm">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight drop-shadow-lg">
              HỆ THỐNG KPI
            </h2>
            <p className="text-sm text-white/80 mt-1 tracking-wide uppercase">
              Đăng nhập tài khoản
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-700 dark:text-rose-300 text-sm animate-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Tên đăng nhập
            </label>
            <div className="relative">
              <input
                ref={usernameRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc họ tên"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005C35] focus:border-transparent transition-all"
                autoComplete="username"
                disabled={isLoading}
              />
              <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005C35] focus:border-transparent transition-all"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#005C35] transition-colors p-1"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-[#005C35] to-[#004A2A] hover:from-[#004A2A] hover:to-[#003D22] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#005C35]/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
{isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang đăng nhập...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Đăng Nhập
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-4">
            Sử dụng tài khoản nhân sự đã được nhập trong hệ thống
          </p>
        </form>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-[#005C35] transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};