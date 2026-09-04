import React, { useState, useRef, useEffect } from 'react';
import { 
  LogIn, 
  Eye, 
  EyeOff, 
  User as UserIcon, 
  Lock, 
  AlertCircle,
  Shield
} from 'lucide-react';
import { User } from '../types';
import { fsLoadLogo } from '../utils/firestoreSync';

// Biểu tượng Logo Thống Kê chuẩn Vector SVG (đồng bộ toàn hệ thống)
const DefaultStatLogo = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="24" cy="24" r="22" fill="#b91c1c" stroke="#fbbf24" strokeWidth="2.5" />
    <circle cx="24" cy="24" r="18.5" fill="#dc2626" />
    {/* Biểu tượng cột thống kê vàng kim */}
    <rect x="13" y="25" width="4" height="10" rx="1" fill="#fef08a" />
    <rect x="19" y="19" width="4" height="16" rx="1" fill="#fde047" />
    <rect x="25" y="14" width="4" height="21" rx="1" fill="#facc15" />
    <rect x="31" y="21" width="4" height="14" rx="1" fill="#eab308" />
    {/* Đường xu hướng tăng trưởng */}
    <path d="M12 23L19 16L27 12L35 18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* Ngôi sao vàng 5 cánh ở đỉnh */}
    <path d="M24 6L25.3 9.2L28.8 9.5L26.1 11.7L26.9 15.1L24 13.3L21.1 15.1L21.9 11.7L19.2 9.5L22.7 9.2L24 6Z" fill="#fde047" />
  </svg>
);

interface LoginScreenProps {
  onLogin: (user: User) => void;
  users: User[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Logo cơ quan từ localStorage hoặc Firestore
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('app_custom_logo') || null;
    } catch {
      return null;
    }
  });
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    usernameRef.current?.focus();
    
    // Tải logo mới nhất nếu có
    try {
      const local = localStorage.getItem('app_custom_logo');
      if (local) {
        setLogoUrl(local);
        setImgError(false);
      }
    } catch {}

    fsLoadLogo().then(cloudLogo => {
      if (cloudLogo) {
        setLogoUrl(cloudLogo);
        setImgError(false);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const inputUser = username.trim();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    setIsLoading(true);

    // Giả lập xử lý nhanh tạo hiệu ứng đăng nhập mượt mà
    await new Promise(resolve => setTimeout(resolve, 350));

    const normalizeStr = (s: string) => 
      s.normalize('NFC').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

    const normInput = normalizeStr(inputUser);

    // 1. Tìm trong danh sách users hệ thống
    let matchedUser = users.find(u => {
      const normUsername = normalizeStr(u.username || '');
      const normFull = normalizeStr(u.fullName || '');
      return (normUsername && normUsername === normInput) || (normFull && normFull === normInput);
    });

    // 2. Dự phòng tài khoản Admin nếu chưa kịp load users từ bộ nhớ
    if (!matchedUser && (normInput === 'admin' || normInput === 'quantri' || normInput === 'administrator')) {
      const existingAdmin = users.find(u => u.role === 'ADMIN' || (u.username || '').toLowerCase() === 'admin');
      matchedUser = existingAdmin || {
        id: 'usr_system_admin',
        fullName: 'Quản trị viên hệ thống',
        username: 'admin',
        password: 'admin',
        role: 'ADMIN',
        department: 'Lãnh đạo',
        position: 'Quản trị hệ thống',
        workUnit: 'Thống kê tỉnh Hưng Yên',
        createdAt: new Date().toISOString()
      };
    }

    if (matchedUser) {
      const userPass = matchedUser.password || '123456';
      // Hỗ trợ đăng nhập linh hoạt cho admin (chấp nhận cả admin và 123456 nếu dùng mật khẩu mặc định)
      const isPassCorrect = 
        inputPass === userPass || 
        (matchedUser.role === 'ADMIN' && (userPass === 'admin' || userPass === '123456') && (inputPass === 'admin' || inputPass === '123456'));

      if (isPassCorrect) {
        setIsLoading(false);
        onLogin(matchedUser);
        return;
      }
    }

    setError('Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-[#EBF4EE] via-[#F2F7F3] to-[#E5F0E8] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 selection:bg-[#007A44] selection:text-white">
      {/* Top Bar Trang trọng */}
      <header className="w-full bg-[#007A44] text-white shadow-md border-b border-[#006638] px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              {logoUrl && !imgError ? (
                <img 
                  src={logoUrl} 
                  alt="Logo Thống Kê" 
                  onError={() => setImgError(true)}
                  className="max-w-full max-h-full object-contain drop-shadow"
                />
              ) : (
                <DefaultStatLogo />
              )}
            </div>
            <div>
              <h1 className="text-sm md:text-base font-extrabold uppercase tracking-wider text-amber-300 drop-shadow-xs">
                CỤC THỐNG KÊ TỈNH HƯNG YÊN
              </h1>
              <p className="text-[11px] md:text-xs text-white/90 font-medium">
                Hệ thống đánh giá hiệu quả công tác & quản lý tiến độ nhiệm vụ (KPI)
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-100 bg-white/15 px-3 py-1.5 rounded-full border border-white/20">
            <Shield className="w-3.5 h-3.5 text-amber-300" />
            <span>Cổng đăng nhập an toàn</span>
          </div>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Card Banner Header */}
          <div className="bg-[#007A44] px-6 py-6 text-center text-white relative overflow-hidden border-b border-[#006638]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A9153] via-[#007A44] to-[#006639] opacity-95" />
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 mb-2.5 flex items-center justify-center drop-shadow-md">
                {logoUrl && !imgError ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo Thống Kê" 
                    onError={() => setImgError(true)}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <DefaultStatLogo />
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-amber-300 drop-shadow-sm">
                ĐĂNG NHẬP HỆ THỐNG
              </h2>
            </div>
          </div>

          {/* Form với khoảng đệm trắng dưới nút đăng nhập ~2cm (pb-20 sm:pb-24 ~ 80-96px) cho cân đối */}
          <form onSubmit={handleSubmit} className="px-6 pt-6 pb-20 sm:px-8 sm:pt-8 sm:pb-24 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs animate-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#007A44] dark:text-emerald-400" />
                <span>Tên đăng nhập / Mã tài khoản</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={usernameRef}
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007A44] focus:border-transparent transition-all font-medium"
                  autoComplete="username"
                  disabled={isLoading}
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#007A44] dark:text-emerald-400" />
                <span>Mật khẩu truy cập</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007A44] focus:border-transparent transition-all font-medium"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#007A44] dark:hover:text-emerald-400 transition-colors p-1"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-[#007A44] hover:bg-[#006639] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>ĐĂNG NHẬP</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer Bản Quyền */}
      <footer className="w-full py-3 px-4 text-center text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs">
        <p className="font-medium">
          © {new Date().getFullYear()} Cục Thống kê tỉnh Hưng Yên. Bản quyền phần mềm đánh giá KPI & quản lý công tác.
        </p>
      </footer>
    </div>
  );
};
