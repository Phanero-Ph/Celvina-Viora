import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Heart,
  Info,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Package,
  Percent,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  UserPlus,
  Wallet,
  Award,
  Clock,
  LogIn,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Zap,
} from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { PaymentPlanType, Product, ProductCategory, User, VendorAd } from './types';

const money = (value: number) => `\u20a6${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

const categories: Array<'All' | ProductCategory> = ['All', 'Clothing', 'Shoes', 'Bags', 'Accessories', 'Lifestyle'];

type View = 'home' | 'customer' | 'vendor' | 'affiliate' | 'admin' | 'super_admin' | 'community';

const Shell: React.FC = () => {
  const { currentUser, isAuthenticated, cart, notifications, logoutUser, verifyEmail } = useApp();
  const [view, setView] = useState<View>('home');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationNotice, setVerificationNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [pendingVerificationToken, setPendingVerificationToken] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const unread = isAuthenticated ? notifications.filter(item => item.userId === currentUser.id && !item.read).length : 0;
  const dashboardViewFor = (user: User): View => user.role === 'super_admin' ? 'super_admin' : user.role === 'admin' ? 'admin' : user.role === 'affiliate' ? 'affiliate' : user.role;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('verifyEmail')?.trim();
    if (!token) return;

    setPendingVerificationToken(token);
    setVerificationNotice({ type: 'info', message: 'Ready to verify your email address. Click the Verify Email button to continue.' });
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const confirmEmailVerification = async () => {
    if (!pendingVerificationToken || isVerifyingEmail) return;

    setIsVerifyingEmail(true);
    try {
      const message = await verifyEmail(pendingVerificationToken);
      setPendingVerificationToken('');
      setVerificationNotice({ type: 'success', message });
      setAuthMode('login');
      setAuthOpen(true);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Verification link is invalid or has expired. Please request a new link.';
      setVerificationNotice({ type: 'error', message });
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900">
      <header className="sticky top-0 z-40 bg-white text-gray-800 shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <button onClick={() => setView('home')} className="text-left cursor-pointer flex flex-col items-start shrink-0">
            <span className="text-2xl sm:text-3xl font-black tracking-tighter text-[#282828] hover:text-[#374880] transition flex items-center">
              CELVINA<span className="text-[#374880]">VIORA</span>
            </span>
            <span className="text-[9px] tracking-widest text-[#374880] uppercase font-bold font-sans -mt-1">
              Fashion Marketplace & Installments
            </span>
          </button>

          <div className="flex-1 max-w-2xl hidden md:flex items-center">
            <div className="relative w-full flex items-center">
              <div className="absolute left-3 text-gray-400 font-bold">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Search fashion items, vendors, sponsored products, wallets..."
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className="w-full pl-10 pr-24 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#374880] focus:ring-1 focus:ring-[#374880]"
              />
              <button onClick={() => setView('home')} className="absolute right-0 top-0 bottom-0 bg-[#374880] hover:bg-[#0A0E2B] text-white px-6 font-bold text-sm rounded-r-lg transition shadow-sm flex items-center">
                SEARCH
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            {!isAuthenticated ? (
              <button onClick={() => { setAuthMode('login'); setAuthOpen(true); }} className="bg-gray-900 hover:bg-[#374880] text-white px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 transition shadow-sm">
                <LogIn size={16} className="text-[#AD9EB4]" />
                <span className="hidden sm:inline">LOGIN</span>
              </button>
            ) : (
              <div className="relative" onMouseEnter={() => setShowAccountMenu(true)} onMouseLeave={() => setShowAccountMenu(false)}>
                <button
                  onClick={() => setView(dashboardViewFor(currentUser))}
                  className="flex items-center space-x-1.5 p-2 text-gray-700 hover:text-[#374880] font-bold text-sm rounded-lg hover:bg-gray-100 transition"
                >
                  <UserIcon size={20} />
                  <span className="hidden lg:inline">Hi, {currentUser.fullName.split(' ')[0]}</span>
                  <ChevronDown size={14} />
                </button>
                {showAccountMenu && (
                  <div className="absolute right-0 mt-0 w-64 bg-white rounded-lg shadow-2xl py-2 z-50 text-gray-800 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <span className="text-xs text-gray-500 block">Logged in as</span>
                      <span className="text-sm font-bold text-gray-900 truncate block">{currentUser.fullName}</span>
                    </div>
                    {[
                      ['home', 'Fashion Catalog', Star],
                      [dashboardViewFor(currentUser), `${currentUser.role[0].toUpperCase()}${currentUser.role.slice(1)} Dashboard`, LayoutDashboard],
                      ['community', 'Fashion Community', MessageCircle],
                    ].map(([target, label, Icon]) => (
                      <button key={target as string} onClick={() => { setView(target as View); setShowAccountMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 hover:text-[#374880] transition flex items-center space-x-2">
                        <Icon size={16} />
                        <span>{label as string}</span>
                      </button>
                    ))}
                    <button onClick={() => { logoutUser(); setView('home'); setShowAccountMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 hover:text-[#374880] transition flex items-center space-x-2 border-t border-gray-100">
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="relative hidden sm:block" onMouseEnter={() => setShowHelpMenu(true)} onMouseLeave={() => setShowHelpMenu(false)}>
              <button className="flex items-center space-x-1 p-2 text-gray-700 hover:text-[#374880] font-bold text-sm rounded-lg hover:bg-gray-100 transition">
                <Bot size={20} />
                <span className="hidden lg:inline">Help</span>
                <ChevronDown size={14} />
              </button>
              {showHelpMenu && (
                <div className="absolute right-0 mt-0 w-72 bg-white rounded-lg shadow-2xl py-2 z-50 text-gray-800 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-100 font-bold text-xs text-gray-500 uppercase">Customer Assistance</div>
                  {['Pay Once and Installments', 'Products release after full payment', 'Wallets and refunds', 'Vendor Money Box', 'Referral and affiliate rewards'].map(item => (
                    <button key={item} onClick={() => setAssistantOpen(true)} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 hover:text-[#374880]">{item}</button>
                  ))}
                </div>
              )}
            </div>

            {isAuthenticated && (
              <button onClick={() => setView(dashboardViewFor(currentUser))} className="relative p-2 text-gray-700 hover:text-[#374880] hover:bg-gray-100 rounded-lg transition" title="Notifications">
                <Bell size={22} />
                {unread > 0 && <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{unread}</span>}
              </button>
            )}

            {isAuthenticated && currentUser.role === 'customer' && (
              <button onClick={() => setCartOpen(true)} className="bg-[#374880] hover:bg-[#0A0E2B] text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 shadow-md transition transform active:scale-95">
                <ShoppingBag size={20} />
                <span className="hidden sm:inline">Cart</span>
                <span className="bg-white text-[#374880] text-xs px-2 py-0.5 rounded-full font-black shadow-sm">{cartCount}</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-3 bg-gray-50 border-t border-gray-200 md:hidden flex items-center">
          <div className="relative w-full flex items-center">
            <Search size={16} className="absolute left-3 text-gray-400" />
            <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} type="text" placeholder="Search fashion items..." className="w-full pl-9 pr-20 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#374880]" />
            <button onClick={() => setView('home')} className="absolute right-0 top-0 bottom-0 bg-[#374880] text-white px-4 font-bold text-xs rounded-r-lg">SEARCH</button>
          </div>
        </div>
      </header>

      {verificationNotice && (
        <div className={`${verificationNotice.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : verificationNotice.type === 'info' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-red-50 text-red-800 border-red-200'} border-b px-4 py-3 text-sm font-bold text-center`}>
          <span>{verificationNotice.message}</span>
          {pendingVerificationToken && verificationNotice.type === 'info' && (
            <button onClick={confirmEmailVerification} disabled={isVerifyingEmail} className="ml-3 rounded-lg bg-[#374880] px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-60">
              {isVerifyingEmail ? 'Verifying...' : 'Verify Email'}
            </button>
          )}
        </div>
      )}

      <main>
        {view === 'home' && <MarketplaceHome onOpenCart={() => setCartOpen(true)} />}
        {view === 'customer' && <CustomerDashboard />}
        {view === 'vendor' && <VendorDashboard />}
        {view === 'affiliate' && <AffiliateDashboard />}
        {view === 'admin' && <AdminDashboard />}
        {view === 'super_admin' && <SuperAdminDashboard />}
        {view === 'community' && <Community />}
      </main>

      <MarketplaceFooter onOpenAssistant={() => setAssistantOpen(true)} onOpenSignup={() => { setAuthMode('signup'); setAuthOpen(true); }} />

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />
      <CheckoutModal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
      <AssistantPanel isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} onAuthenticated={user => setView(dashboardViewFor(user))} />
    </div>
  );
};

const MarketplaceHome: React.FC<{ onOpenCart: () => void }> = ({ onOpenCart }) => {
  const { products, wishlist, addToCart, toggleWishlist, settings } = useApp();
  const [category, setCategory] = useState<'All' | ProductCategory>('All');
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80',
      title: 'CELVINA VIORA FASHION MARKETPLACE',
      subtitle: 'Shop Celvina Viora and verified vendor products through Pay Once or flexible installment plans.',
      tag: 'WEB & MOBILE COMMERCE',
      cta: 'Explore Marketplace',
    },
    {
      image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1200&q=80',
      title: 'VENDOR MONEY BOX EARNINGS',
      subtitle: `${money(settings.platformFeePerProduct + settings.maintenanceFeePerProduct)} company charge per product sold, then vendor earnings are released after delivery confirmation.`,
      tag: 'VENDOR PLATFORM',
      cta: 'View Sponsored Products',
    },
    {
      image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=80',
      title: 'FULL PAYMENT DELIVERY RELEASE',
      subtitle: `Weekly plans run 1-30 weeks, monthly plans run 1-8 months, and nationwide delivery is ${money(settings.deliveryFee)}.`,
      tag: 'INSTALLMENT RULES',
      cta: 'Learn Payment Options',
    },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const visibleProducts = useMemo(() => {
    const filtered = products.filter(product => product.isActive && product.inStock && (category === 'All' || product.category === category));
    return [...filtered].sort((a, b) => {
      const rank = (product: Product) => product.source === 'Celvina Viora' ? 0 : product.sponsored ? 1 : 2;
      return rank(a) - rank(b);
    });
  }, [products, category]);

  return (
    <div className="bg-[#f5f5f5] pb-16 pt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="hidden lg:block lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Fashion Categories</span>
              <Sparkles size={14} className="text-[#AD9EB4]" />
            </div>
            <nav className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
              {[
                ['Clothing', Award, 'Clothing & Evening Gowns'],
                ['Shoes', Zap, 'Designer Shoes & Sandals'],
                ['Bags', ShoppingBag, 'Luxury Bags & Totes'],
                ['Accessories', Star, 'Jewelry & Accessories'],
                ['Lifestyle', Package, 'Lifestyle Essentials'],
              ].map(([cat, Icon, label]) => (
                <button key={cat as string} onClick={() => setCategory(cat as ProductCategory)} className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 hover:text-[#374880] transition ${category === cat ? 'bg-gray-50 font-bold text-[#374880]' : ''}`}>
                  <span className="flex items-center space-x-2">
                    <Icon size={16} />
                    <span>{label as string}</span>
                  </span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              ))}

              <div className="bg-gray-50 px-4 py-2 font-bold text-[10px] text-gray-400 uppercase tracking-wider">Marketplace Rules</div>
              {[
                ['Pay Once or Installment', Clock],
                ['Wallet, Refunds & Withdrawals', Wallet],
                ['Referral & Affiliate Rewards', Percent],
                ['Vendor Sponsored Products', Megaphone],
              ].map(([label, Icon]) => (
                <button key={label as string} onClick={() => setCategory('All')} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 hover:text-[#374880] transition">
                  <span className="flex items-center space-x-2 font-bold text-gray-800">
                    <Icon size={16} />
                    <span>{label as string}</span>
                  </span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              ))}
            </nav>
          </div>

          <div className="col-span-1 lg:col-span-9 bg-white rounded-lg shadow-sm overflow-hidden relative min-h-[320px] flex flex-col group border border-gray-200">
            <div className="absolute inset-0 bg-cover bg-center transition-all duration-700 transform group-hover:scale-105" style={{ backgroundImage: `url(${slides[currentSlide].image})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="relative z-10 p-8 flex-1 flex flex-col justify-end text-white space-y-3">
              <span className="bg-[#374880] text-white font-black text-[10px] px-3 py-1 rounded w-max uppercase tracking-widest shadow-md">{slides[currentSlide].tag}</span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight font-brand">{slides[currentSlide].title}</h1>
              <p className="text-xs sm:text-sm text-gray-200 max-w-lg leading-relaxed">{slides[currentSlide].subtitle}</p>
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button onClick={() => setCategory('All')} className="bg-[#374880] hover:bg-[#0A0E2B] text-white px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg transition active:scale-95">{slides[currentSlide].cta}</button>
                <button onClick={onOpenCart} className="bg-white/15 hover:bg-white/25 border border-white/30 text-white px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg transition backdrop-blur-sm">View Cart & Checkout</button>
              </div>
            </div>
            <button onClick={() => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition z-20">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setCurrentSlide(prev => (prev + 1) % slides.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition z-20">
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-4 right-6 flex space-x-2 z-20">
              {slides.map((_, index) => (
                <button key={index} onClick={() => setCurrentSlide(index)} className={`h-2.5 rounded-full transition ${currentSlide === index ? 'bg-[#AD9EB4] w-6' : 'bg-white/60 w-2.5'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 text-center">
            {[
              ['Celvina Picks', Award, 'Clothing'],
              ['Pay Once', CreditCard, 'All'],
              ['Installments', Clock, 'All'],
              ['Flash Sales', Zap, 'All'],
              ['Secure Wallet', Wallet, 'All'],
              ['Nationwide Delivery', Truck, 'All'],
              ['Affiliate Links', Percent, 'All'],
              ['Vendor Ads', Megaphone, 'All'],
            ].map(([label, Icon, target]) => (
              <button key={label as string} onClick={() => setCategory(target as 'All' | ProductCategory)} className="flex flex-col items-center space-y-2 group">
                <div className="w-14 h-14 bg-gray-50 text-[#374880] rounded-2xl flex items-center justify-center group-hover:bg-[#374880] group-hover:text-white transition duration-300 shadow-sm border border-gray-200">
                  <Icon size={26} />
                </div>
                <span className="text-xs font-bold text-gray-700 group-hover:text-[#374880] transition">{label as string}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#374880] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Zap size={24} />
              <h2 className="text-lg font-black tracking-wide uppercase">Flash Marketplace Deals</h2>
              <span className="hidden md:inline text-xs bg-black text-[#AD9EB4] px-2 py-0.5 rounded font-bold ml-2">FULL PAYMENT RELEASE</span>
            </div>
            <div className="flex items-center space-x-3 bg-black/20 px-4 py-1.5 rounded-lg w-max text-xs font-bold">
              <span>Delivery:</span>
              <span className="bg-white text-gray-900 px-2 py-0.5 rounded">{money(settings.deliveryFee)}</span>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 bg-gray-50/40">
            {visibleProducts.filter(product => product.flashSale || product.sponsored).slice(0, 4).map(product => (
              <ProductCard key={`flash-${product.id}`} product={product} saved={wishlist.includes(product.id)} compact onWishlist={() => toggleWishlist(product.id)} onAdd={() => { addToCart(product); onOpenCart(); }} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight font-brand uppercase flex items-center space-x-2">
                <span>Recommended Marketplace Picks</span>
                <span className="bg-[#374880] text-white text-[10px] px-2 py-0.5 rounded font-sans font-bold">VERIFIED</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Celvina Viora products first, sponsored vendor products second, regular vendor products third.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(item => (
                <button key={item} onClick={() => setCategory(item)} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${category === item ? 'bg-[#374880] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}>{item}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleProducts.map(product => (
              <ProductCard key={product.id} product={product} saved={wishlist.includes(product.id)} onWishlist={() => toggleWishlist(product.id)} onAdd={() => { addToCart(product); onOpenCart(); }} />
            ))}
          </div>
        </div>

        <div className="bg-gray-900 text-white rounded-lg p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-gray-800">
          <div className="space-y-2 max-w-2xl">
            <span className="bg-[#374880] text-white text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-widest">MARKETPLACE RULES</span>
            <h2 className="text-xl font-black font-brand tracking-wide text-white pt-1">How Celvina Viora Payments Work</h2>
            <p className="text-gray-300 text-xs leading-relaxed">
              Customers can pay once or choose weekly and monthly installment plans. Products are released only after full payment is completed. After delivery confirmation, Celvina Viora deducts company fees and credits vendor earnings to the Vendor Money Box.
            </p>
          </div>
          <button onClick={onOpenCart} className="bg-[#374880] hover:bg-[#0A0E2B] text-white px-8 py-4 rounded-lg font-bold text-xs tracking-wider uppercase shadow-xl transition shrink-0">View Cart & Setup Payment</button>
        </div>
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: Product; saved: boolean; onWishlist: () => void; onAdd: () => void; compact?: boolean }> = ({ product, saved, onWishlist, onAdd, compact }) => (
  <article className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition duration-300 border border-gray-200 flex flex-col group relative">
    <div className="absolute top-2 left-2 bg-black text-[#AD9EB4] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider z-10 shadow">
      {product.source === 'Celvina Viora' ? 'Celvina Priority' : product.sponsored ? 'Sponsored Vendor' : 'Vendor Product'}
    </div>
    <div className={`relative w-full overflow-hidden bg-gray-100 ${compact ? 'h-48' : 'h-64'}`}>
      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
      <button onClick={onWishlist} className={`absolute top-2 right-2 p-2 rounded-full shadow ${saved ? 'bg-red-600 text-white' : 'bg-white text-gray-800'}`} title="Save to wishlist">
        <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
      </button>
      {product.featured && <div className="absolute bottom-2 left-2 bg-[#374880] text-white px-2 py-0.5 rounded text-[10px] font-black uppercase shadow">Featured</div>}
      {product.flashSale && <div className="absolute bottom-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase shadow">Flash Sale</div>}
    </div>
    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase font-black text-gray-400">{product.category} by {product.vendorName}</span>
          <span className="flex items-center gap-1 text-xs font-black text-amber-500"><Star size={13} fill="currentColor" /> {product.rating}</span>
        </div>
        <h3 className="font-bold text-sm text-gray-900 mb-1 group-hover:text-[#374880] transition line-clamp-2">{product.name}</h3>
        <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">{product.description}</p>
        <div className="mt-2 text-[11px] font-bold text-gray-600">{product.inStock && product.stockQuantity > 0 ? `Available stock: ${product.stockQuantity}` : 'Currently unavailable'}</div>
      </div>
      <div>
        <div className="flex items-baseline space-x-2 mb-1">
          <span className="text-lg font-black text-gray-900">{money(product.price)}</span>
          <span className="text-xs text-gray-400 line-through font-bold">{money(product.price * 1.15)}</span>
        </div>
        <div className="text-[11px] text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded mb-3 inline-block border border-blue-200">Installment from {money(product.price / 8)}/mo (8 months)</div>
        <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200/80">
          <div className="text-[11px] text-gray-500 flex items-center space-x-1">
            <Info size={12} />
            <span>Products release after full payment. Reviews: {product.reviewCount}</span>
          </div>
        </div>
        <button onClick={onAdd} disabled={!product.inStock || product.stockQuantity <= 0} className="w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-[#374880] hover:bg-[#0A0E2B] text-white">
          <ShoppingBag size={16} />
          <span>{product.inStock ? 'Add to Cart' : 'Out of Stock'}</span>
        </button>
      </div>
    </div>
  </article>
);

const CustomerDashboard: React.FC = () => {
  const { currentUser, orders, wishlist, products, walletTransactions, refunds, notifications, fundWallet, withdrawWallet, payNextInstallment, confirmDelivery, requestRefund, addReview, settings } = useApp();
  const [fundAmount, setFundAmount] = useState('10000');
  const [withdrawAmount, setWithdrawAmount] = useState('5000');
  const [refundReason, setRefundReason] = useState('Approved cancellation request');
  const [notice, setNotice] = useState('');
  const myOrders = orders.filter(order => order.userId === currentUser.id);
  const myTransactions = walletTransactions.filter(txn => txn.userId === currentUser.id);
  const myRefunds = refunds.filter(refund => refund.userId === currentUser.id);
  const savedProducts = products.filter(product => wishlist.includes(product.id));

  const handleWithdraw = () => {
    const result = withdrawWallet(Number(withdrawAmount));
    setNotice(result.message);
  };

  return (
    <DashboardFrame title="Customer Dashboard" subtitle="Orders, wallet, wishlist, refunds, reviews, referrals, and delivery confirmation.">
      <div className="grid md:grid-cols-4 gap-4">
        <Metric label="Wallet balance" value={money(currentUser.walletBalance)} icon={<Wallet size={18} />} />
        <Metric label="Referral link" value={currentUser.referralCode || 'Pending'} icon={<UserPlus size={18} />} />
        <Metric label="Wishlist" value={`${wishlist.length} saved`} icon={<Heart size={18} />} />
        <Metric label="Delivery fee" value={money(settings.deliveryFee)} icon={<Truck size={18} />} />
      </div>

      <TwoColumn>
        <Panel title="Wallet">
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="number" value={fundAmount} onChange={e => setFundAmount(e.target.value)} className="input" />
            <button onClick={() => fundWallet(Number(fundAmount))} className="btn-primary">Fund wallet</button>
            <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="input" />
            <button onClick={handleWithdraw} className="btn-dark">Withdraw eligible balance</button>
          </div>
          {notice && <p className="mt-3 text-xs font-bold text-[#374880]">{notice}</p>}
          <List items={myTransactions.slice(0, 4)} render={txn => <span>{txn.type}: <strong>{money(txn.amount)}</strong> • {txn.note}</span>} empty="No wallet transactions yet." />
        </Panel>

        <Panel title="Notifications">
          <List items={notifications.filter(item => item.userId === currentUser.id).slice(0, 5)} render={item => <span><strong>{item.title}</strong> — {item.message}</span>} empty="No notifications." />
        </Panel>
      </TwoColumn>

      <Panel title="Orders">
        <div className="space-y-4">
          {myOrders.map(order => (
            <div key={order.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="font-black">{order.id} • {order.status}</div>
                  <div className="text-xs text-gray-500 mt-1">{order.paymentPlan.replace('_', ' ')} • Paid {money(order.amountPaid)} of {money(order.totalAmount)} • Products release after full payment</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.status === 'Installment Active' && <button onClick={() => payNextInstallment(order.id)} className="btn-primary">Pay next installment</button>}
                  {order.status === 'Processing Delivery' && <button onClick={() => confirmDelivery(order.id)} className="btn-dark">Confirm delivery</button>}
                  {!order.refundRequested && order.status !== 'Delivered' && <button onClick={() => requestRefund(order.id, refundReason)} className="btn-light">Request refund</button>}
                </div>
              </div>
              <input value={refundReason} onChange={e => setRefundReason(e.target.value)} className="input mt-3" />
              <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {order.items.map(item => (
                  <div key={item.productId} className="flex gap-3 bg-white rounded-lg border border-gray-200 p-2">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                    <div className="text-xs">
                      <div className="font-black">{item.name}</div>
                      <div className="text-gray-500">{item.vendorName} • {money(item.price)}</div>
                      {order.status === 'Delivered' && <button onClick={() => addReview(item.productId, 5, 'Great product and smooth delivery.')} className="mt-2 text-[#374880] font-black">Leave 5-star review</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <TwoColumn>
        <Panel title="Wishlist">
          <List items={savedProducts} render={product => <span>{product.name} • {money(product.price)}</span>} empty="No saved products yet." />
        </Panel>
        <Panel title="Refunds">
          <List items={myRefunds} render={refund => <span>{refund.orderId}: refunded {money(refund.refundedAmount)} after {money(refund.deduction)} deduction</span>} empty="No refund requests yet." />
        </Panel>
      </TwoColumn>
    </DashboardFrame>
  );
};

const VendorDashboard: React.FC = () => {
  const { currentUser, vendorProfiles, products, orders, vendorAds, settings, vendorAddProduct, vendorCreateAd, vendorWithdraw } = useApp();
  const [activePage, setActivePage] = useState<'overview' | 'products' | 'sales' | 'advertising' | 'moneyBox' | 'analytics'>('overview');
  const vendor = vendorProfiles.find(item => item.userId === currentUser.id);
  const vendorProducts = products.filter(product => product.vendorId === vendor?.id);
  const vendorOrders = orders.filter(order => order.items.some(item => item.vendorId === vendor?.id));
  const activeAds = vendor ? vendorAds.filter(ad => ad.vendorId === vendor.id) : [];
  const [productName, setProductName] = useState('New Vendor Fashion Item');
  const [price, setPrice] = useState('35000');
  const [withdrawAmount, setWithdrawAmount] = useState('10000');
  const [notice, setNotice] = useState('');

  if (!vendor) return <DashboardFrame title="Vendor Console" subtitle="Switch to the vendor persona to manage products and earnings."><EmptyState text="No vendor profile selected." /></DashboardFrame>;

  const createProduct = () => {
    vendorAddProduct({
      name: productName,
      category: 'Clothing',
      price: Number(price),
      image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80',
      description: 'Vendor uploaded fashion product.',
      inStock: true,
      isActive: true,
      stockQuantity: 10,
    });
  };

  return (
    <DashboardSidebarFrame
      title="Vendor Console"
      subtitle="Upload products, manage inventory, advertise listings, track sales, and withdraw from Vendor Money Box."
      active={activePage}
      onChange={setActivePage}
      items={[
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={17} /> },
        { id: 'products', label: 'Products', icon: <Package size={17} /> },
        { id: 'sales', label: 'Sales', icon: <CreditCard size={17} /> },
        { id: 'advertising', label: 'Advertising', icon: <Megaphone size={17} /> },
        { id: 'moneyBox', label: 'Money Box', icon: <Wallet size={17} /> },
        { id: 'analytics', label: 'Analytics', icon: <Sparkles size={17} /> },
      ]}
    >
      <div className={activePage === 'overview' ? 'grid md:grid-cols-4 gap-4' : 'hidden'}>
        <Metric label="Money Box" value={money(vendor.moneyBoxBalance)} icon={<Wallet size={18} />} />
        <Metric label="Total sales" value={money(vendor.totalSales)} icon={<CreditCard size={18} />} />
        <Metric label="Active ads" value={`${activeAds.length}`} icon={<Megaphone size={18} />} />
        <Metric label="Fee per product sold" value={money(settings.platformFeePerProduct + settings.maintenanceFeePerProduct)} icon={<Store size={18} />} />
      </div>

      <>
        {activePage === 'products' && <Panel title="Upload Product">
          <div className="grid gap-3">
            <input value={productName} onChange={e => setProductName(e.target.value)} className="input" />
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="input" />
            <button onClick={createProduct} className="btn-primary">Upload product</button>
          </div>
        </Panel>}
        {activePage === 'moneyBox' && <Panel title="Withdraw Earnings">
          <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="input" />
          <button onClick={() => { const result = vendorWithdraw(Number(withdrawAmount)); setNotice(result.message); }} className="btn-dark mt-3">Withdraw to bank</button>
          {notice && <p className="mt-3 text-xs font-bold text-[#374880]">{notice}</p>}
        </Panel>}
      </>

      {(activePage === 'products' || activePage === 'advertising') && <Panel title={activePage === 'products' ? 'Inventory' : 'Products and Advertising'}>
        <div className="grid md:grid-cols-2 gap-4">
          {vendorProducts.map(product => (
            <div key={product.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="font-black">{product.name}</div>
              <div className="text-xs text-gray-500 mt-1">{money(product.price)} • Stock {product.stockQuantity}</div>
              <div className={activePage === 'advertising' ? 'flex flex-wrap gap-2 mt-3' : 'hidden'}>
                {(['Homepage placement', 'Sponsored products', 'Featured products'] as VendorAd['placement'][]).map(placement => (
                  <button key={placement} onClick={() => vendorCreateAd(product.id, placement, placement === 'Homepage placement' ? 2 : 1)} className="btn-light">{placement}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>}

      <>
        {activePage === 'sales' && <Panel title="Sales">
          <List items={vendorOrders} render={order => <span>{order.id} • {order.status} • {money(order.totalAmount)}</span>} empty="No vendor sales yet." />
        </Panel>}
        {activePage === 'advertising' && <Panel title="Advertisements">
          <List items={vendorAds.filter(ad => ad.vendorId === vendor.id)} render={ad => <span>{ad.placement} • {ad.days} day(s) • {money(ad.cost)}</span>} empty="No active ads yet." />
        </Panel>}
      </>

      {activePage === 'analytics' && (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Metric label="Products" value={`${vendorProducts.length}`} icon={<Package size={18} />} />
            <Metric label="Orders" value={`${vendorOrders.length}`} icon={<ShoppingBag size={18} />} />
            <Metric label="Ads" value={`${activeAds.length}`} icon={<Megaphone size={18} />} />
            <Metric label="Rating" value={`${vendor.rating}`} icon={<Star size={18} />} />
          </div>
          <Panel title="Performance Notes">
            <p className="text-sm text-gray-600 leading-6">Analytics summarize inventory, sales, advertising, and Vendor Money Box performance for this vendor account.</p>
          </Panel>
        </>
      )}
    </DashboardSidebarFrame>
  );
};

const AffiliateDashboard: React.FC = () => {
  const { currentUser, affiliateRecords, settings } = useApp();
  const records = affiliateRecords.filter(item => item.affiliateUserId === currentUser.id);
  const total = records.reduce((sum, item) => sum + item.commission, 0);
  return (
    <DashboardFrame title="Affiliate Program" subtitle="Share affiliate links and earn commission when referred purchases meet the minimum order value.">
      <div className="grid md:grid-cols-3 gap-4">
        <Metric label="Affiliate code" value={currentUser.affiliateCode || 'TENISTYLE'} icon={<Sparkles size={18} />} />
        <Metric label="Commission" value={money(settings.affiliateCommission)} icon={<Wallet size={18} />} />
        <Metric label="Total earned" value={money(total)} icon={<CheckCircle2 size={18} />} />
      </div>
      <Panel title="Affiliate Rules">
        <p className="text-sm text-gray-600">Earn {money(settings.affiliateCommission)} when a customer purchases at least {money(settings.minimumRewardPurchase)} through your affiliate link.</p>
      </Panel>
      <Panel title="Commission History">
        <List items={records} render={record => <span>{record.customerName} • Order {money(record.orderAmount)} • Commission {money(record.commission)} • {record.status}</span>} empty="No affiliate conversions yet." />
      </Panel>
    </DashboardFrame>
  );
};

type AdminPage = 'overview' | 'users' | 'vendors' | 'products' | 'orders' | 'payments' | 'deliveries' | 'refunds' | 'ads' | 'affiliates' | 'analytics' | 'support' | 'settings';

const ADMIN_PERMISSION_OPTIONS = [
  'Customer Management',
  'Customer Verification',
  'Vendor Management',
  'Vendor Approval',
  'Vendor Suspension',
  'Product Management',
  'Product Approval',
  'Category Management',
  'Order Management',
  'Order Disputes',
  'Payment Management',
  'Installment Monitoring',
  'Wallet Management',
  'Withdrawal Approval',
  'Refund Management',
  'Refund Approval',
  'Delivery Management',
  'Delivery Tracking',
  'Advertisement Management',
  'Ad Approval',
  'Affiliate & Referral Management',
  'Commission Payouts',
  'Review & Community Moderation',
  'Promotion Management',
  'Support Management',
  'Analytics Access',
  'Finance Reports',
  'Audit Logs',
  'Platform Settings',
];

const ADMIN_PAGE_PERMISSIONS: Record<Exclude<AdminPage, 'overview'>, string[]> = {
  users: ['Customer Management', 'Customer Verification', 'Customers'],
  vendors: ['Vendor Management', 'Vendor Approval', 'Vendor Suspension', 'Vendors'],
  products: ['Product Management', 'Product Approval', 'Category Management', 'Products'],
  orders: ['Order Management', 'Order Disputes', 'Orders'],
  payments: ['Payment Management', 'Installment Monitoring', 'Wallet Management', 'Payments'],
  deliveries: ['Delivery Management', 'Delivery Tracking', 'Deliveries'],
  refunds: ['Refund Management', 'Refund Approval', 'Refunds'],
  ads: ['Advertisement Management', 'Ad Approval', 'Advertisements'],
  affiliates: ['Affiliate & Referral Management', 'Commission Payouts', 'Affiliates'],
  analytics: ['Analytics Access', 'Finance Reports', 'Audit Logs', 'Analytics'],
  support: ['Support Management', 'Review & Community Moderation', 'Support'],
  settings: ['Platform Settings', 'Settings'],
};

const LEGACY_ADMIN_PERMISSION_MAP: Record<string, string[]> = {
  Customers: ['Customer Management', 'Customer Verification'],
  Vendors: ['Vendor Management', 'Vendor Approval'],
  Products: ['Product Management', 'Product Approval'],
  Orders: ['Order Management'],
  Payments: ['Payment Management', 'Installment Monitoring'],
  Deliveries: ['Delivery Management', 'Delivery Tracking'],
  Refunds: ['Refund Management', 'Refund Approval'],
  Advertisements: ['Advertisement Management', 'Ad Approval'],
  Affiliates: ['Affiliate & Referral Management', 'Commission Payouts'],
  Analytics: ['Analytics Access', 'Finance Reports'],
  Support: ['Support Management'],
  Settings: ['Platform Settings'],
};

const normalizeAdminPermissionsForEditing = (permissions: string[] = []) => Array.from(new Set(
  permissions.flatMap(permission => LEGACY_ADMIN_PERMISSION_MAP[permission] || [permission])
));

const AdminDashboard: React.FC = () => {
  const { currentUser, users, products, orders, refunds, vendorProfiles, vendorAds, affiliateRecords, settings } = useApp();
  const [activePage, setActivePage] = useState<AdminPage>('overview');
  const gross = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const fees = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity * (settings.platformFeePerProduct + settings.maintenanceFeePerProduct), 0), 0);
  const adminItems: DashboardNavItem<AdminPage>[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={17} /> },
    { id: 'users', label: 'Users', icon: <UserIcon size={17} /> },
    { id: 'vendors', label: 'Vendors', icon: <Store size={17} /> },
    { id: 'products', label: 'Products', icon: <Package size={17} /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingBag size={17} /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={17} /> },
    { id: 'deliveries', label: 'Deliveries', icon: <Truck size={17} /> },
    { id: 'refunds', label: 'Refunds', icon: <Wallet size={17} /> },
    { id: 'ads', label: 'Advertisements', icon: <Megaphone size={17} /> },
    { id: 'affiliates', label: 'Affiliates', icon: <Percent size={17} /> },
    { id: 'analytics', label: 'Analytics', icon: <Sparkles size={17} /> },
    { id: 'support', label: 'Support', icon: <MessageCircle size={17} /> },
    { id: 'settings', label: 'Settings', icon: <Info size={17} /> },
  ];
  const assignedPermissions = currentUser.role === 'super_admin' ? ADMIN_PERMISSION_OPTIONS : (currentUser.adminPermissions || []);
  const canOpenPage = (page: AdminPage) => page === 'overview' || ADMIN_PAGE_PERMISSIONS[page].some(permission => assignedPermissions.includes(permission));
  const navItems = adminItems.filter(item => canOpenPage(item.id));

  useEffect(() => {
    if (!canOpenPage(activePage)) setActivePage('overview');
  }, [activePage, assignedPermissions.join('|')]);

  return (
    <DashboardSidebarFrame
      title="Admin Management System"
      subtitle="Platform-wide management for customers, vendors, affiliates, products, payments, delivery, refunds, ads, and analytics."
      active={activePage}
      onChange={setActivePage}
      items={navItems}
    >
      {activePage === 'overview' && <div className="grid md:grid-cols-4 gap-4">
        <Metric label="Users" value={`${users.length}`} icon={<LayoutDashboard size={18} />} />
        <Metric label="Products" value={`${products.length}`} icon={<Package size={18} />} />
        <Metric label="Gross orders" value={money(gross)} icon={<CreditCard size={18} />} />
        <Metric label="Company fees" value={money(fees)} icon={<Wallet size={18} />} />
      </div>}
      <div className={activePage === 'overview' ? 'grid lg:grid-cols-3 gap-4' : 'hidden'}>
        <Panel title="User Groups"><List items={users} render={user => <span>{user.fullName} • {user.role} • {user.isVerified ? 'Verified' : 'Pending'}</span>} empty="No users." /></Panel>
        <Panel title="Vendors"><List items={vendorProfiles} render={vendor => <span>{vendor.storeName} • Money Box {money(vendor.moneyBoxBalance)}</span>} empty="No vendors." /></Panel>
        <Panel title="Refunds"><List items={refunds} render={refund => <span>{refund.orderId} • {refund.status} • {money(refund.refundedAmount)}</span>} empty="No refunds." /></Panel>
      </div>
      {activePage === 'overview' && <TwoColumn>
        <Panel title="Advertisements"><List items={vendorAds} render={ad => <span>{ad.placement} • {money(ad.cost)} • {ad.status}</span>} empty="No ads." /></Panel>
        <Panel title="Affiliate Commissions"><List items={affiliateRecords} render={record => <span>{record.customerName} • {money(record.commission)} • {record.status}</span>} empty="No affiliate records." /></Panel>
      </TwoColumn>}
      {activePage === 'users' && <Panel title="User Groups"><List items={users} render={user => <span>{user.fullName} - {user.role} - {user.isVerified ? 'Verified' : 'Pending'}</span>} empty="No users." /></Panel>}
      {activePage === 'vendors' && <Panel title="Vendors"><List items={vendorProfiles} render={vendor => <span>{vendor.storeName} - Money Box {money(vendor.moneyBoxBalance)}</span>} empty="No vendors." /></Panel>}
      {activePage === 'products' && <Panel title="Products"><List items={products} render={product => <span>{product.name} - {product.vendorName} - {money(product.price)} - {product.isActive ? 'Active' : 'Inactive'}</span>} empty="No products." /></Panel>}
      {activePage === 'orders' && <Panel title="Orders"><List items={orders} render={order => <span>{order.id} - {order.userFullName} - {order.status} - {money(order.totalAmount)}</span>} empty="No orders." /></Panel>}
      {activePage === 'payments' && <Panel title="Payments"><List items={orders} render={order => <span>{order.id} - Paid {money(order.amountPaid)} of {money(order.totalAmount)} - {order.paymentPlan.replace('_', ' ')}</span>} empty="No payments." /></Panel>}
      {activePage === 'deliveries' && <Panel title="Deliveries"><List items={orders} render={order => <span>{order.id} - {order.deliveryAddress} - {order.deliveryConfirmed ? 'Confirmed' : 'Pending confirmation'}</span>} empty="No deliveries." /></Panel>}
      {activePage === 'refunds' && <Panel title="Refunds"><List items={refunds} render={refund => <span>{refund.orderId} - {refund.status} - {money(refund.refundedAmount)}</span>} empty="No refunds." /></Panel>}
      {activePage === 'ads' && <Panel title="Advertisements"><List items={vendorAds} render={ad => <span>{ad.placement} - {money(ad.cost)} - {ad.status}</span>} empty="No ads." /></Panel>}
      {activePage === 'affiliates' && <Panel title="Affiliate Commissions"><List items={affiliateRecords} render={record => <span>{record.customerName} - {money(record.commission)} - {record.status}</span>} empty="No affiliate records." /></Panel>}
      {activePage === 'analytics' && (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Metric label="Vendors" value={`${vendorProfiles.length}`} icon={<Store size={18} />} />
            <Metric label="Refunds" value={`${refunds.length}`} icon={<Wallet size={18} />} />
            <Metric label="Ads" value={`${vendorAds.length}`} icon={<Megaphone size={18} />} />
            <Metric label="Affiliate records" value={`${affiliateRecords.length}`} icon={<Percent size={18} />} />
          </div>
          <Panel title="Analytics Dashboard">
            <p className="text-sm text-gray-600 leading-6">Operational analytics cover marketplace users, vendor activity, orders, refunds, advertisements, and affiliate commissions.</p>
          </Panel>
        </>
      )}
      {activePage === 'support' && <Panel title="Support"><p className="text-sm text-gray-600 leading-6">Support admins handle customer and vendor questions about products, orders, deliveries, installments, wallets, refunds, vendors, and platform policies.</p></Panel>}
      {activePage === 'settings' && <Panel title="Settings"><List items={[`Delivery fee: ${money(settings.deliveryFee)}`, `Refund deduction: ${settings.cancellationDeductionPercent}%`, `Support email: ${settings.supportEmail}`]} render={item => <span>{item}</span>} empty="No settings." /></Panel>}
    </DashboardSidebarFrame>
  );
};

const SuperAdminDashboard: React.FC = () => {
  const { users, products, orders, refunds, vendorProfiles, vendorAds, affiliateRecords, settings, createAdminUser, updateAdminPermissions } = useApp();
  const [fullName, setFullName] = useState('New Celvina Viora Admin');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+234');
  const [password, setPassword] = useState('Admin123!');
  const [permissions, setPermissions] = useState<string[]>(['Customer Management', 'Vendor Management', 'Order Management']);
  const [editingAdminId, setEditingAdminId] = useState('');
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [permissionMessage, setPermissionMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [activePage, setActivePage] = useState<AdminPage | 'admins' | 'finance' | 'operations'>('overview');

  const admins = users.filter(user => user.role === 'admin' || user.role === 'super_admin');
  const gross = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const fees = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity * (settings.platformFeePerProduct + settings.maintenanceFeePerProduct), 0), 0);

  const togglePermission = (permission: string) => {
    setPermissions(prev => prev.includes(permission)
      ? prev.filter(item => item !== permission)
      : [...prev, permission]);
  };

  const startEditingAdmin = (adminId: string, adminPermissions: string[] = []) => {
    setEditingAdminId(adminId);
    setEditingPermissions(normalizeAdminPermissionsForEditing(adminPermissions));
    setPermissionMessage('');
  };

  const toggleEditingPermission = (permission: string) => {
    setEditingPermissions(prev => prev.includes(permission)
      ? prev.filter(item => item !== permission)
      : [...prev, permission]);
  };

  const saveAdminPermissions = async () => {
    setPermissionMessage('');
    if (!editingAdminId) {
      setPermissionMessage('Select an admin before saving permissions.');
      return;
    }
    if (!editingPermissions.length) {
      setPermissionMessage('Select at least one access area for this admin.');
      return;
    }

    setIsSavingPermissions(true);
    try {
      const admin = await updateAdminPermissions(editingAdminId, editingPermissions);
      setPermissionMessage(`${admin.fullName}'s permissions were updated.`);
      setEditingAdminId('');
      setEditingPermissions([]);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message;
      setPermissionMessage(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage || 'Unable to update admin permissions.');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const submitAdmin = async () => {
    setMessage('');
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setMessage('Complete admin name, email, phone, and password.');
      return;
    }
    if (!permissions.length) {
      setMessage('Select at least one access area for this admin.');
      return;
    }

    setIsCreating(true);
    try {
      const admin = await createAdminUser({ fullName, email, phone, password, permissions });
      setMessage(`${admin.fullName} was created as an admin.`);
      setEmail('');
      setPassword('Admin123!');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message;
      setMessage(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage || 'Unable to create admin.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardSidebarFrame
      title="Super Admin Command Center"
      subtitle="Highest-level control for platform governance, admin creation, permissions, finance, operations, and analytics."
      active={activePage}
      onChange={setActivePage}
      items={[
        { id: 'overview', label: 'Overview', icon: <ShieldCheck size={17} /> },
        { id: 'admins', label: 'Admins & Roles', icon: <UserPlus size={17} /> },
        { id: 'users', label: 'Users', icon: <UserIcon size={17} /> },
        { id: 'vendors', label: 'Vendors', icon: <Store size={17} /> },
        { id: 'products', label: 'Products', icon: <Package size={17} /> },
        { id: 'orders', label: 'Orders', icon: <ShoppingBag size={17} /> },
        { id: 'payments', label: 'Payments', icon: <CreditCard size={17} /> },
        { id: 'deliveries', label: 'Deliveries', icon: <Truck size={17} /> },
        { id: 'refunds', label: 'Refunds', icon: <Wallet size={17} /> },
        { id: 'ads', label: 'Advertisements', icon: <Megaphone size={17} /> },
        { id: 'affiliates', label: 'Affiliates', icon: <Percent size={17} /> },
        { id: 'finance', label: 'Finance Rules', icon: <Wallet size={17} /> },
        { id: 'operations', label: 'Operations', icon: <Store size={17} /> },
        { id: 'analytics', label: 'Analytics', icon: <Sparkles size={17} /> },
        { id: 'support', label: 'Support', icon: <MessageCircle size={17} /> },
        { id: 'settings', label: 'Settings', icon: <Info size={17} /> },
      ]}
    >
      {activePage === 'overview' && <div className="grid md:grid-cols-4 gap-4">
        <Metric label="Admins" value={`${admins.length}`} icon={<ShieldCheck size={18} />} />
        <Metric label="Users" value={`${users.length}`} icon={<LayoutDashboard size={18} />} />
        <Metric label="Gross orders" value={money(gross)} icon={<CreditCard size={18} />} />
        <Metric label="Company fees" value={money(fees)} icon={<Wallet size={18} />} />
      </div>}

        {activePage === 'admins' && <TwoColumn>
        <Panel title="Create Admin">
          <div className="grid gap-3">
            <p className="text-sm text-gray-600 leading-6">Select the exact areas this admin should see in their dashboard sidebar. Super admin always keeps full access.</p>
            <input value={fullName} onChange={e => setFullName(e.target.value)} className="input" placeholder="Full name" />
            <input value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="Email address" type="email" />
            <input value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="Phone number" />
            <input value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="Temporary password" />
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_PERMISSION_OPTIONS.map(permission => (
                <label key={permission} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700">
                  <input type="checkbox" checked={permissions.includes(permission)} onChange={() => togglePermission(permission)} className="accent-[#374880]" />
                  <span>{permission}</span>
                </label>
              ))}
            </div>
            {message && <p className="text-xs font-bold text-[#374880]">{message}</p>}
            <button onClick={submitAdmin} disabled={isCreating} className="btn-primary disabled:opacity-50">{isCreating ? 'Creating...' : 'Create admin'}</button>
          </div>
        </Panel>
        <Panel title="Admin Access">
          <div className="space-y-3">
            {admins.map(user => (
              <div key={user.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-black text-sm">{user.fullName}</div>
                    <div className="mt-1 text-xs text-gray-500">{user.email} - {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}</div>
                    <div className="mt-2 text-xs font-bold text-gray-600">
                      {user.role === 'super_admin' ? 'Full platform access' : (user.adminPermissions || []).join(', ') || 'No permissions assigned'}
                    </div>
                  </div>
                  {user.role === 'admin' && (
                    <button onClick={() => startEditingAdmin(user.id, user.adminPermissions || [])} className="btn-light shrink-0">Edit permissions</button>
                  )}
                </div>

                {editingAdminId === user.id && (
                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {ADMIN_PERMISSION_OPTIONS.map(permission => (
                        <label key={permission} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700">
                          <input type="checkbox" checked={editingPermissions.includes(permission)} onChange={() => toggleEditingPermission(permission)} className="accent-[#374880]" />
                          <span>{permission}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={saveAdminPermissions} disabled={isSavingPermissions} className="btn-primary disabled:opacity-50">{isSavingPermissions ? 'Saving...' : 'Save permissions'}</button>
                      <button onClick={() => { setEditingAdminId(''); setEditingPermissions([]); setPermissionMessage(''); }} className="btn-light">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!admins.length && <EmptyState text="No admin accounts." />}
            {permissionMessage && <p className="text-xs font-bold text-[#374880]">{permissionMessage}</p>}
          </div>
        </Panel>
      </TwoColumn>}

      <div className={activePage === 'operations' ? 'grid lg:grid-cols-3 gap-4' : 'hidden'}>
        <Panel title="Platform Users"><List items={users} render={user => <span>{user.fullName} • {user.role} • {user.isVerified ? 'Verified' : 'Pending'}</span>} empty="No users." /></Panel>
        <Panel title="Vendors"><List items={vendorProfiles} render={vendor => <span>{vendor.storeName} • Money Box {money(vendor.moneyBoxBalance)}</span>} empty="No vendors." /></Panel>
        <Panel title="Refunds"><List items={refunds} render={refund => <span>{refund.orderId} • {refund.status} • {money(refund.refundedAmount)}</span>} empty="No refunds." /></Panel>
      </div>
      {activePage === 'operations' && <TwoColumn>
        <Panel title="Advertisements"><List items={vendorAds} render={ad => <span>{ad.placement} • {money(ad.cost)} • {ad.status}</span>} empty="No ads." /></Panel>
        <Panel title="Affiliate Commissions"><List items={affiliateRecords} render={record => <span>{record.customerName} • {money(record.commission)} • {record.status}</span>} empty="No affiliate records." /></Panel>
      </TwoColumn>}
      {activePage === 'operations' && <Panel title="Catalog Control">
        <List items={products.slice(0, 8)} render={product => <span>{product.name} • {product.vendorName} • {money(product.price)} • {product.isActive ? 'Active' : 'Inactive'}</span>} empty="No products." />
      </Panel>}
      {activePage === 'users' && <Panel title="Platform Users"><List items={users} render={user => <span>{user.fullName} - {user.role} - {user.isVerified ? 'Verified' : 'Pending'}</span>} empty="No users." /></Panel>}
      {activePage === 'vendors' && <Panel title="Vendors"><List items={vendorProfiles} render={vendor => <span>{vendor.storeName} - Money Box {money(vendor.moneyBoxBalance)}</span>} empty="No vendors." /></Panel>}
      {activePage === 'products' && <Panel title="Products"><List items={products} render={product => <span>{product.name} - {product.vendorName} - {money(product.price)} - {product.isActive ? 'Active' : 'Inactive'}</span>} empty="No products." /></Panel>}
      {activePage === 'orders' && <Panel title="Orders"><List items={orders} render={order => <span>{order.id} - {order.userFullName} - {order.status} - {money(order.totalAmount)}</span>} empty="No orders." /></Panel>}
      {activePage === 'payments' && <Panel title="Payments"><List items={orders} render={order => <span>{order.id} - Paid {money(order.amountPaid)} of {money(order.totalAmount)} - {order.paymentPlan.replace('_', ' ')}</span>} empty="No payments." /></Panel>}
      {activePage === 'deliveries' && <Panel title="Deliveries"><List items={orders} render={order => <span>{order.id} - {order.deliveryAddress} - {order.deliveryConfirmed ? 'Confirmed' : 'Pending confirmation'}</span>} empty="No deliveries." /></Panel>}
      {activePage === 'refunds' && <Panel title="Refunds"><List items={refunds} render={refund => <span>{refund.orderId} - {refund.status} - {money(refund.refundedAmount)}</span>} empty="No refunds." /></Panel>}
      {activePage === 'ads' && <Panel title="Advertisements"><List items={vendorAds} render={ad => <span>{ad.placement} - {money(ad.cost)} - {ad.status}</span>} empty="No ads." /></Panel>}
      {activePage === 'affiliates' && <Panel title="Affiliate Commissions"><List items={affiliateRecords} render={record => <span>{record.customerName} - {money(record.commission)} - {record.status}</span>} empty="No affiliate records." /></Panel>}
      {activePage === 'finance' && (
        <TwoColumn>
          <Panel title="Company Fees">
            <List items={[`Platform fee per product: ${money(settings.platformFeePerProduct)}`, `Maintenance fee per product: ${money(settings.maintenanceFeePerProduct)}`, `Total charge per product sold: ${money(settings.platformFeePerProduct + settings.maintenanceFeePerProduct)}`]} render={item => <span>{item}</span>} empty="No finance rules." />
          </Panel>
          <Panel title="Payment Flow">
            <p className="text-sm text-gray-600 leading-6">All customer payments go through Celvina Viora. After delivery confirmation, company fees are deducted and vendor earnings are credited to the Vendor Money Box.</p>
          </Panel>
        </TwoColumn>
      )}
      {activePage === 'analytics' && (
        <div className="grid md:grid-cols-4 gap-4">
          <Metric label="Products" value={`${products.length}`} icon={<Package size={18} />} />
          <Metric label="Orders" value={`${orders.length}`} icon={<ShoppingBag size={18} />} />
          <Metric label="Vendors" value={`${vendorProfiles.length}`} icon={<Store size={18} />} />
          <Metric label="Ads" value={`${vendorAds.length}`} icon={<Megaphone size={18} />} />
        </div>
      )}
      {activePage === 'support' && <Panel title="Support"><p className="text-sm text-gray-600 leading-6">Super admin can oversee support handling for products, orders, deliveries, installments, wallets, refunds, vendors, and platform policies.</p></Panel>}
      {activePage === 'settings' && <Panel title="Platform Settings"><List items={[`Delivery fee: ${money(settings.deliveryFee)}`, `Refund deduction: ${settings.cancellationDeductionPercent}%`, `Referral reward: ${money(settings.referralReward)}`, `Affiliate commission: ${money(settings.affiliateCommission)}`, `Minimum reward purchase: ${money(settings.minimumRewardPurchase)}`, `Support email: ${settings.supportEmail}`]} render={item => <span>{item}</span>} empty="No settings." /></Panel>}
    </DashboardSidebarFrame>
  );
};

const Community: React.FC = () => {
  const { communityPosts, addCommunityPost } = useApp();
  const [title, setTitle] = useState('Today\'s styling idea');
  const [body, setBody] = useState('Share a useful fashion tip with the Celvina Viora community.');
  return (
    <DashboardFrame title="Fashion Community" subtitle="Community styling ideas, seasonal inspiration, loyalty engagement, and fashion conversations.">
      <TwoColumn>
        <Panel title="Create Post">
          <input value={title} onChange={e => setTitle(e.target.value)} className="input" />
          <textarea value={body} onChange={e => setBody(e.target.value)} className="input mt-3 min-h-28" />
          <button onClick={() => addCommunityPost(title, body)} className="btn-primary mt-3">Post to community</button>
        </Panel>
        <Panel title="Styling Assistant">
          <p className="text-sm text-gray-600">Try pairing one statement product with two quiet essentials. For installment shopping, choose a plan that completes before the event date because products are released only after full payment.</p>
        </Panel>
      </TwoColumn>
      <div className="grid md:grid-cols-2 gap-4">
        {communityPosts.map(post => (
          <article key={post.id} className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="text-xs font-black uppercase text-[#374880]">{post.userFullName}</div>
            <h3 className="mt-2 font-black text-lg">{post.title}</h3>
            <p className="mt-2 text-sm text-gray-600 leading-6">{post.body}</p>
            <div className="mt-4 text-xs font-bold text-gray-500">{post.likes} likes</div>
          </article>
        ))}
      </div>
    </DashboardFrame>
  );
};

const CartDrawer: React.FC<{ isOpen: boolean; onClose: () => void; onCheckout: () => void }> = ({ isOpen, onClose, onCheckout }) => {
  const { cart, settings, updateCartQuantity, removeFromCart } = useApp();
  if (!isOpen) return null;
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  return (
    <ModalShell title="Cart" onClose={onClose} width="max-w-lg">
      <div className="space-y-3">
        {cart.map(item => (
          <div key={item.product.id} className="flex gap-3 border border-gray-200 rounded-lg p-3">
            <img src={item.product.image} alt={item.product.name} className="w-20 h-20 object-cover rounded" />
            <div className="flex-1">
              <div className="font-black text-sm">{item.product.name}</div>
              <div className="text-xs text-gray-500">{item.product.vendorName} • {money(item.product.price)}</div>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} className="qty">-</button>
                <span className="text-sm font-black w-8 text-center">{item.quantity}</span>
                <button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} className="qty">+</button>
                <button onClick={() => removeFromCart(item.product.id)} className="ml-auto text-xs font-black text-red-600">Remove</button>
              </div>
            </div>
          </div>
        ))}
        {!cart.length && <EmptyState text="Your cart is empty." />}
      </div>
      <div className="mt-5 border-t border-gray-200 pt-4 space-y-2 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
        <div className="flex justify-between"><span>Nationwide delivery</span><strong>{money(settings.deliveryFee)}</strong></div>
        <div className="flex justify-between text-lg"><span className="font-black">Total</span><strong>{money(subtotal + settings.deliveryFee)}</strong></div>
        <button disabled={!cart.length} onClick={onCheckout} className="btn-primary w-full mt-4 disabled:opacity-40">Checkout</button>
      </div>
    </ModalShell>
  );
};

const CheckoutModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { currentUser, cart, settings, createOrder } = useApp();
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlanType>('pay_once');
  const [weeks, setWeeks] = useState(4);
  const [months, setMonths] = useState(2);
  const [address, setAddress] = useState(currentUser.address || 'Lagos, Nigeria');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [message, setMessage] = useState('');
  if (!isOpen) return null;
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const duration = paymentPlan === 'weekly' ? weeks : paymentPlan === 'monthly' ? months : 1;
  const total = subtotal + settings.deliveryFee;
  const dueNow = paymentPlan === 'pay_once' ? total : total / duration;

  const submit = () => {
    const result = createOrder({ paymentPlan, duration, deliveryAddress: address, affiliateCode });
    setMessage(result.message);
    if (result.success) setTimeout(onClose, 900);
  };

  return (
    <ModalShell title="Secure Checkout" onClose={onClose} width="max-w-2xl">
      <div className="space-y-5">
        <div className="grid sm:grid-cols-3 gap-3">
          {(['pay_once', 'weekly', 'monthly'] as PaymentPlanType[]).map(plan => (
            <button key={plan} onClick={() => setPaymentPlan(plan)} className={`rounded-lg border p-4 text-left ${paymentPlan === plan ? 'border-[#374880] bg-[#374880] text-white' : 'border-gray-200 bg-white'}`}>
              <span className="block text-sm font-black uppercase">{plan.replace('_', ' ')}</span>
              <span className="text-xs opacity-80">{plan === 'weekly' ? '1-30 weeks' : plan === 'monthly' ? '1-8 months' : 'Full payment'}</span>
            </button>
          ))}
        </div>
        {paymentPlan === 'weekly' && <Range label="Weekly duration" value={weeks} min={1} max={30} suffix="weeks" onChange={setWeeks} />}
        {paymentPlan === 'monthly' && <Range label="Monthly duration" value={months} min={1} max={8} suffix="months" onChange={setMonths} />}
        <input value={address} onChange={e => setAddress(e.target.value)} className="input" placeholder="Delivery address" />
        <input value={affiliateCode} onChange={e => setAffiliateCode(e.target.value.toUpperCase())} className="input" placeholder="Affiliate code (optional)" />
        <div className="bg-gray-950 text-white rounded-lg p-5 grid sm:grid-cols-3 gap-4">
          <Metric label="Total" value={money(total)} />
          <Metric label="Due now" value={money(dueNow)} />
          <Metric label="Release rule" value="Full payment" />
        </div>
        <p className="text-xs text-gray-500">All customer payments go directly through Celvina Viora. Products are released only after full payment is completed.</p>
        {message && <p className="text-sm font-bold text-[#374880]">{message}</p>}
        <button onClick={submit} className="btn-primary w-full">Authorize payment</button>
      </div>
    </ModalShell>
  );
};

const AssistantPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { settings } = useApp();
  const [question, setQuestion] = useState('How do installments and delivery work?');
  if (!isOpen) return null;
  const answer = question.toLowerCase().includes('refund')
    ? `Approved cancellations attract a ${settings.cancellationDeductionPercent}% deduction, and the balance is refunded to the customer wallet.`
    : question.toLowerCase().includes('vendor')
      ? `Vendor earnings are credited to the Vendor Money Box after delivery confirmation. Celvina Viora deducts ${money(settings.platformFeePerProduct + settings.maintenanceFeePerProduct)} per product sold.`
      : question.toLowerCase().includes('affiliate') || question.toLowerCase().includes('referral')
        ? `Referral and affiliate rewards are ${money(settings.referralReward)} after a referred purchase of at least ${money(settings.minimumRewardPurchase)}.`
        : `Customers may pay once or use weekly/monthly installments. Products are released only after full payment is completed. Nationwide delivery is ${money(settings.deliveryFee)}.`;
  return (
    <ModalShell title="Customer Service Assistant" onClose={onClose} width="max-w-lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Ask about products, orders, deliveries, installments, wallets, refunds, vendors, or platform policies.</p>
        <textarea value={question} onChange={e => setQuestion(e.target.value)} className="input min-h-24" />
        <div className="bg-[#0A0E2B] text-white rounded-lg p-4 text-sm leading-6">
          <div className="font-black mb-1 flex items-center gap-2"><MessageCircle size={16} /> Celvina Viora Assistant</div>
          {answer}
          <div className="mt-3 text-xs text-gray-300">Support email: {settings.supportEmail}</div>
        </div>
      </div>
    </ModalShell>
  );
};

const AuthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialMode: 'login' | 'signup';
  onAuthenticated: (user: User) => void;
}> = ({ isOpen, onClose, initialMode, onAuthenticated }) => {
  const { registerUser, loginUser, resendEmailVerification, verifyEmailOtp } = useApp();
  const [mode, setMode] = useState<'login' | 'signup' | 'otp'>(initialMode);
  const [role, setRole] = useState<'customer' | 'vendor'>('customer');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessLogo, setBusinessLogo] = useState('');
  const [businessLogoName, setBusinessLogoName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      setSuccess('');
    }
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const switchMode = (nextMode: 'login' | 'signup' | 'otp') => {
    setMode(nextMode);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  const validateAuth = () => {
    if (!email.trim()) return 'Enter your email address.';
    if (mode === 'otp') {
      if (!/^\d{6}$/.test(otp.trim())) return 'Enter the 6 digit OTP sent to your email.';
      return '';
    }
    if (!password) return 'Enter your password.';
    if (mode === 'login') return '';
    if (!fullName.trim()) return 'Enter your full name.';
    if (!phone.trim()) return 'Enter your phone number.';
    if (!whatsappNumber.trim()) return 'Enter your WhatsApp number.';
    if (role === 'vendor') {
      if (!businessName.trim()) return 'Enter your business name.';
      if (!residentialAddress.trim()) return 'Enter your residential address.';
      if (!bankName.trim()) return 'Enter your bank name.';
      if (!accountName.trim()) return 'Enter your account name.';
      if (!accountNumber.trim()) return 'Enter your account number.';
      if (!businessDescription.trim()) return 'Enter your business description.';
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return 'Password must be at least 8 characters and include a letter and a number.';
    }
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!acceptedTerms) return 'Please accept the marketplace terms to continue.';
    return '';
  };

  const submitAuth = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError('');
    setSuccess('');
    const validationError = validateAuth();
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsLoading(true);
    try {
      if (mode === 'login') {
        const user = await loginUser({ email, password });
        setSuccess(`Welcome back, ${user.fullName.split(' ')[0]}. Opening your dashboard...`);
        setTimeout(() => {
          onClose();
          onAuthenticated(user);
        }, 700);
      } else if (mode === 'otp') {
        const message = await verifyEmailOtp({ email, otp });
        setSuccess(message);
        setPassword('');
        setConfirmPassword('');
        setOtp('');
        setTimeout(() => {
          switchMode('login');
          setSuccess('Email verified. Please log in to continue.');
        }, 900);
      } else {
        await registerUser({
          fullName,
          email,
          phone,
          whatsappNumber,
          password,
          role,
          address: role === 'vendor' ? residentialAddress : undefined,
          residentialAddress: role === 'vendor' ? residentialAddress : undefined,
          profilePicture: undefined,
          businessName: role === 'vendor' ? businessName : undefined,
          businessDescription: role === 'vendor' ? businessDescription : undefined,
          businessLogo: role === 'vendor' ? businessLogo : undefined,
          socialMediaLinks: role === 'vendor' ? { instagram, facebook, tiktok } : undefined,
          bankName: role === 'vendor' ? bankName : undefined,
          accountName: role === 'vendor' ? accountName : undefined,
          accountNumber: role === 'vendor' ? accountNumber : undefined,
        });
        setPassword('');
        setConfirmPassword('');
        setAcceptedTerms(false);
        setSuccess('Account created successfully. Enter the OTP sent to your email.');
        setMode('otp');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message;
      const normalizedMessage = Array.isArray(message) ? message.join(', ') : message;
      if (mode === 'login' && normalizedMessage?.toLowerCase().includes('verify your email')) {
        setMode('otp');
        setSuccess('Enter the OTP sent to your email address to verify your account.');
        return;
      }
      setError(normalizedMessage || 'Authentication failed. Check your details and make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    setError('');
    setSuccess('');
    if (!email.trim()) {
      setError('Enter your email address so we can resend the verification OTP.');
      return;
    }
    setIsLoading(true);
    try {
      const message = await resendEmailVerification(email);
      setSuccess(message);
      setMode('otp');
    } catch (err: any) {
      const message = err?.response?.data?.message;
      const fallback = err?.code === 'ERR_NETWORK'
        ? 'Cannot reach the Celvina Viora API. Please make sure the backend server is running, then try again.'
        : 'Unable to resend verification email right now.';
      setError(Array.isArray(message) ? message.join(', ') : message || fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBusinessLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for your business logo.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Business logo must be 2MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBusinessLogo(String(reader.result || ''));
      setBusinessLogoName(file.name);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  return (
    <ModalShell title={mode === 'login' ? 'Log in to Celvina Viora' : mode === 'otp' ? 'Verify your email' : 'Create your Celvina Viora account'} onClose={onClose} width={mode === 'signup' ? 'max-w-xl' : 'max-w-md'}>
      <form onSubmit={submitAuth} className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-black text-gray-900">
            <ShieldCheck size={18} className="text-[#374880]" />
            {mode === 'login' ? 'Secure marketplace access' : mode === 'otp' ? 'Email verification by OTP' : 'Customer and vendor onboarding'}
          </div>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            {mode === 'login'
              ? 'Customers, vendors, admins, and super admins use this same login page.'
              : mode === 'otp'
                ? 'Enter the 6 digit OTP sent to your email address.'
                : 'Choose customer or vendor registration. Admin and super admin accounts are created by platform management.'}
          </p>
        </div>

        {mode === 'signup' && (
          <>
            <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-lg p-1">
              <button type="button" onClick={() => setRole('customer')} className={`py-2 rounded-lg text-xs font-black uppercase ${role === 'customer' ? 'bg-[#374880] text-white' : 'text-gray-700'}`}>Customer</button>
              <button type="button" onClick={() => setRole('vendor')} className={`py-2 rounded-lg text-xs font-black uppercase ${role === 'vendor' ? 'bg-[#374880] text-white' : 'text-gray-700'}`}>Vendor</button>
            </div>
            <input value={fullName} onChange={e => setFullName(e.target.value)} className="input" placeholder="Full name" autoComplete="name" />
            {role === 'vendor' && <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="input" placeholder="Business name" />}
            <input value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="Email address" type="email" autoComplete="email" />
            <input value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="Phone number" autoComplete="tel" />
            <input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} className="input" placeholder="WhatsApp number" autoComplete="tel" />
            {role === 'vendor' && (
              <>
                <input value={residentialAddress} onChange={e => setResidentialAddress(e.target.value)} className="input" placeholder="Residential address" autoComplete="street-address" />
                <div className="grid sm:grid-cols-3 gap-3">
                  <input value={bankName} onChange={e => setBankName(e.target.value)} className="input" placeholder="Bank name" />
                  <input value={accountName} onChange={e => setAccountName(e.target.value)} className="input" placeholder="Account name" />
                  <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="input" placeholder="Account number" />
                </div>
                <textarea value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} className="input min-h-24" placeholder="Business description" />
                <label className="block rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-600">
                  <span className="mb-2 block text-xs font-black uppercase text-gray-500">Business logo</span>
                  <input type="file" accept="image/*" onChange={handleBusinessLogoUpload} className="block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#374880] file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white" />
                  {businessLogoName && <span className="mt-2 block text-xs font-bold text-[#374880]">{businessLogoName}</span>}
                  {businessLogo && <img src={businessLogo} alt="Business logo preview" className="mt-3 h-16 w-16 rounded-lg border border-gray-200 object-cover" />}
                </label>
                <div className="grid sm:grid-cols-3 gap-3">
                  <input value={instagram} onChange={e => setInstagram(e.target.value)} className="input" placeholder="Instagram link" />
                  <input value={facebook} onChange={e => setFacebook(e.target.value)} className="input" placeholder="Facebook link" />
                  <input value={tiktok} onChange={e => setTiktok(e.target.value)} className="input" placeholder="TikTok link" />
                </div>
              </>
            )}
          </>
        )}

        {mode !== 'signup' && <input value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="Email address" type="email" autoComplete="email" />}
        {mode === 'otp' && <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className="input text-center text-2xl font-black tracking-[0.5em]" placeholder="000000" inputMode="numeric" />}
        {mode !== 'otp' && <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="Password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />}

        {mode === 'signup' && (
          <>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input" placeholder="Confirm password" autoComplete="new-password" />
            <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-5 text-gray-600">
              <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1 accent-[#374880]" />
              <span>I agree to Celvina Viora marketplace terms, wallet rules, refund policy, delivery policy, and installment release conditions.</span>
            </label>
          </>
        )}

        {mode === 'login' && (
          <div className="flex items-center justify-between text-xs font-bold">
            <button type="button" onClick={() => switchMode('signup')} className="text-[#374880] hover:text-[#0A0E2B]">
              Create an account
            </button>
            <a href={`mailto:celvinaviora@gmail.com?subject=Celvina%20Viora%20password%20help`} className="text-gray-500 hover:text-[#374880]">
              Forgot password?
            </a>
          </div>
        )}

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</div>}
        {success && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-700">{success}</div>}

        {mode === 'otp' && (
          <button type="button" onClick={resendVerification} disabled={isLoading} className="w-full rounded-lg border border-[#374880]/20 bg-white px-4 py-2 text-xs font-black uppercase text-[#374880] hover:bg-[#374880]/5 disabled:opacity-50">
            Resend verification OTP
          </button>
        )}

        <button type="submit" disabled={isLoading} className="btn-primary w-full disabled:opacity-50">
          {isLoading ? 'Please wait...' : mode === 'login' ? 'Login' : mode === 'otp' ? 'Verify email' : 'Create account'}
        </button>

        {mode === 'signup' ? (
          <p className="text-center text-xs text-gray-500">
            Already have an account?{' '}
            <button type="button" onClick={() => switchMode('login')} className="font-black text-[#374880] hover:text-[#0A0E2B]">
              Sign in
            </button>
          </p>
        ) : mode === 'otp' ? (
          <p className="text-center text-xs text-gray-500">
            Already verified?{' '}
            <button type="button" onClick={() => switchMode('login')} className="font-black text-[#374880] hover:text-[#0A0E2B]">
              Return to login
            </button>
          </p>
        ) : null}
      </form>
    </ModalShell>
  );
};

const MarketplaceFooter: React.FC<{ onOpenAssistant: () => void; onOpenSignup: () => void }> = ({ onOpenAssistant, onOpenSignup }) => {
  const { settings } = useApp();

  return (
    <footer className="bg-[#282828] text-white pt-16 pb-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4 md:col-span-1">
            <span className="text-2xl font-black tracking-widest font-brand text-white block">
              CELVINA<span className="text-[#AD9EB4]">VIORA</span>
            </span>
            <p className="text-xs text-gray-400 leading-relaxed">
              A fashion-tech marketplace for customers, vendors, affiliates, and administrators. Shop fashion and lifestyle products through full payment or flexible installment plans.
            </p>
            <div className="flex items-center space-x-2 text-xs text-[#AD9EB4] font-black">
              <ShieldCheck size={16} />
              <span>Verified Marketplace • Nationwide Nigeria Delivery</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-black text-white uppercase tracking-wider font-brand">Marketplace Rules</h4>
            <ul className="text-xs text-gray-400 space-y-2">
              <li><span className="text-gray-300 font-bold">Payment:</span> Pay Once, weekly 1-30 weeks, or monthly 1-8 months</li>
              <li><span className="text-gray-300 font-bold">Release:</span> Products are released only after full payment</li>
              <li><span className="text-gray-300 font-bold">Delivery:</span> Nationwide delivery fee is {money(settings.deliveryFee)}</li>
              <li><span className="text-gray-300 font-bold">Refunds:</span> Approved cancellations attract {settings.cancellationDeductionPercent}% deduction</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-black text-white uppercase tracking-wider font-brand">Vendor & Affiliate</h4>
            <ul className="text-xs text-gray-400 space-y-2">
              <li className="flex items-center space-x-2"><Store size={12} className="text-[#AD9EB4]" /> <span>Vendor Money Box earnings after delivery confirmation</span></li>
              <li className="flex items-center space-x-2"><Wallet size={12} className="text-[#AD9EB4]" /> <span>{money(settings.platformFeePerProduct + settings.maintenanceFeePerProduct)} company charge per product sold</span></li>
              <li className="flex items-center space-x-2"><Percent size={12} className="text-[#AD9EB4]" /> <span>{money(settings.referralReward)} referral and affiliate reward on eligible purchases</span></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-black text-white uppercase tracking-wider font-brand">System Portal Access</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Access customer, vendor, affiliate, and admin workflows. The customer service assistant can answer questions about products, orders, deliveries, installments, wallets, refunds, vendors, and platform policies.
            </p>
            <div className="text-xs text-gray-300 font-bold">
              Support: <span className="text-[#AD9EB4]">{settings.supportEmail}</span>
            </div>
            <div className="pt-2 flex flex-wrap gap-2">
              <button onClick={onOpenAssistant} className="bg-[#374880] hover:bg-[#0A0E2B] text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition shadow-md flex items-center space-x-1">
                <Bot size={14} />
                <span>Ask Assistant</span>
              </button>
              <button onClick={onOpenSignup} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-md">
                Create Account
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
          <p>&copy; 2026 Celvina Viora Fashion-Tech Marketplace. All rights reserved.</p>
          <div className="mt-4 sm:mt-0 flex flex-wrap justify-center gap-x-6 gap-y-2">
            <button onClick={onOpenAssistant} className="hover:text-[#AD9EB4]">Customer Service</button>
            <button onClick={onOpenAssistant} className="hover:text-[#AD9EB4]">Refund Policy</button>
            <button onClick={onOpenAssistant} className="hover:text-[#AD9EB4]">Vendor Terms</button>
            <button onClick={onOpenAssistant} className="hover:text-[#AD9EB4]">Affiliate Program</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

type DashboardNavItem<T extends string> = {
  id: T;
  label: string;
  icon: React.ReactNode;
};

const DashboardSidebarFrame = <T extends string,>({
  title,
  subtitle,
  items,
  active,
  onChange,
  children,
}: {
  title: string;
  subtitle: string;
  items: DashboardNavItem<T>[];
  active: T;
  onChange: (value: T) => void;
  children: React.ReactNode;
}) => (
  <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h1 className="text-2xl font-black font-brand">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
    <div className="grid lg:grid-cols-[240px_1fr] gap-5 items-start">
      <aside className="bg-white border border-gray-200 rounded-lg p-2 lg:sticky lg:top-24">
        <nav className="grid gap-1">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-black transition ${active === item.id ? 'bg-[#374880] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="space-y-5 min-w-0">{children}</div>
    </div>
  </section>
);

const DashboardFrame: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h1 className="text-2xl font-black font-brand">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
    {children}
  </section>
);

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="bg-white border border-gray-200 rounded-lg p-5">
    <h2 className="font-black text-base mb-4">{title}</h2>
    {children}
  </section>
);

const Metric: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-white/95 border border-gray-200 rounded-lg p-4 text-gray-950">
    <div className="flex items-center gap-2 text-[11px] font-black uppercase text-gray-500">{icon}{label}</div>
    <div className="mt-2 text-xl font-black">{value}</div>
  </div>
);

const TwoColumn: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="grid lg:grid-cols-2 gap-4">{children}</div>;

const List = <T,>({ items, render, empty }: { items: T[]; render: (item: T) => React.ReactNode; empty: string }) => (
  <div className="space-y-2">
    {items.length ? items.map((item, index) => <div key={index} className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{render(item)}</div>) : <EmptyState text={empty} />}
  </div>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4">{text}</div>;

const ModalShell: React.FC<{ title: string; onClose: () => void; width: string; children: React.ReactNode }> = ({ title, onClose, width, children }) => (
  <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
    <div className={`bg-white rounded-lg shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto border border-gray-200`}>
      <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
        <h2 className="font-black text-lg">{title}</h2>
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-black">Close</button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const Range: React.FC<{ label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }> = ({ label, value, min, max, suffix, onChange }) => (
  <div>
    <div className="flex justify-between text-xs font-black uppercase text-gray-500 mb-2"><span>{label}</span><span>{value} {suffix}</span></div>
    <input type="range" min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} className="w-full accent-[#374880]" />
  </div>
);

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
