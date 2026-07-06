import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AffiliateRecord,
  AppNotification,
  CartItem,
  CommunityPost,
  Order,
  PaymentPlanType,
  PlatformSettings,
  Product,
  RefundRequest,
  Review,
  NotificationPreferences,
  SupportTicket,
  User,
  UserRole,
  VendorAd,
  VendorProfile,
  WalletTransaction,
} from '../types';
import {
  INITIAL_AFFILIATE_RECORDS,
  INITIAL_COMMUNITY_POSTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_REFUNDS,
  INITIAL_REVIEWS,
  INITIAL_USERS,
  INITIAL_VENDOR_ADS,
  INITIAL_VENDOR_PROFILES,
  INITIAL_WALLET_TRANSACTIONS,
  PLATFORM_SETTINGS,
} from '../data/mockData';
import apiClient from '../api/client';

interface CreateOrderInput {
  paymentPlan: PaymentPlanType;
  duration: number;
  deliveryAddress: string;
  affiliateCode?: string;
}

interface AppContextType {
  settings: PlatformSettings;
  isAuthenticated: boolean;
  currentUser: User;
  users: User[];
  products: Product[];
  cart: CartItem[];
  wishlist: string[];
  orders: Order[];
  reviews: Review[];
  notifications: AppNotification[];
  walletTransactions: WalletTransaction[];
  refunds: RefundRequest[];
  vendorProfiles: VendorProfile[];
  vendorAds: VendorAd[];
  affiliateRecords: AffiliateRecord[];
  communityPosts: CommunityPost[];
  supportTickets: SupportTicket[];
  switchUser: (roleOrId: UserRole | string) => void;
  registerUser: (payload: RegistrationPayload) => Promise<User>;
  loginUser: (payload: { email: string; password: string }) => Promise<User>;
  verifyEmail: (token: string) => Promise<string>;
  verifyEmailOtp: (payload: { email: string; otp: string }) => Promise<string>;
  resendEmailVerification: (email: string) => Promise<string>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (payload: { token: string; password: string }) => Promise<string>;
  logoutUser: () => void;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  loadWishlist: () => Promise<string[]>;
  createOrder: (input: CreateOrderInput) => { success: boolean; message: string };
  payNextInstallment: (orderId: string) => void;
  confirmDelivery: (orderId: string) => void;
  requestRefund: (orderId: string, reason: string) => void;
  fundWallet: (amount: number) => void;
  withdrawWallet: (amount: number) => { success: boolean; message: string };
  addReview: (productId: string, rating: number, comment: string) => void;
  markNotificationRead: (id: string) => void;
  vendorAddProduct: (product: Omit<Product, 'id' | 'vendorName' | 'source' | 'rating' | 'reviewCount'>) => void;
  vendorCreateAd: (productId: string, placement: VendorAd['placement'], days: 1 | 2) => void;
  vendorWithdraw: (amount: number) => { success: boolean; message: string };
  addCommunityPost: (title: string, body: string) => Promise<CommunityPost | void>;
  loadCommunityPosts: () => Promise<CommunityPost[]>;
  updateCustomerProfile: (payload: { fullName: string; phone: string; whatsappNumber?: string; picture?: string; address?: string; savedAddresses?: string[] }) => Promise<User>;
  updateNotificationPreferences: (preferences: NotificationPreferences) => Promise<User>;
  loadSupportTickets: () => Promise<SupportTicket[]>;
  createSupportTicket: (payload: { subject: string; message: string }) => Promise<SupportTicket>;
  createAdminUser: (payload: { fullName: string; email: string; phone: string; password: string; permissions: string[] }) => Promise<User>;
  updateAdminPermissions: (adminId: string, permissions: string[]) => Promise<User>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

type RegistrationPayload = {
  fullName: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  password: string;
  role: UserRole;
  address?: string;
  residentialAddress?: string;
  profilePicture?: string;
  businessName?: string;
  businessDescription?: string;
  businessLogo?: string;
  socialMediaLinks?: Record<string, string>;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
};

const readSaved = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const addWeeks = (date: Date, weeks: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const makeId = (prefix: string) => `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

const enrichProduct = (product: Product, index = 0): Product => ({
  ...product,
  brand: product.brand || (product.source === 'Celvina Viora' ? 'Celvina Viora' : product.vendorName),
  color: product.color || ['Black', 'Blue', 'Gold', 'Green', 'Pink', 'White'][index % 6],
  sizes: product.sizes || (product.category === 'Accessories' || product.category === 'Bags' ? ['One Size'] : ['S', 'M', 'L', 'XL']),
});

const roleFromApi = (role: string): UserRole => {
  const normalized = role.toLowerCase();
  if (normalized === 'vendor' || normalized === 'affiliate' || normalized === 'admin') return normalized;
  if (normalized === 'super_admin') return 'super_admin';
  return 'customer';
};

const roleToApi = (role: UserRole) => role.toUpperCase();

const adaptApiUser = (apiUser: any): User => ({
  id: apiUser.id,
  fullName: apiUser.fullName,
  email: apiUser.email,
  phone: apiUser.phone,
  whatsappNumber: apiUser.whatsappNumber || undefined,
  role: roleFromApi(apiUser.role),
  isVerified: Boolean(apiUser.isVerified),
  avatar: apiUser.picture || undefined,
  address: apiUser.address || undefined,
  residentialAddress: apiUser.residentialAddress || undefined,
  businessName: apiUser.businessName || undefined,
  businessDescription: apiUser.businessDescription || undefined,
  businessLogo: apiUser.businessLogo || undefined,
  socialMediaLinks: apiUser.socialMediaLinks || undefined,
  savedAddresses: Array.isArray(apiUser.savedAddresses) ? apiUser.savedAddresses : undefined,
  notificationPreferences: apiUser.notificationPreferences || undefined,
  bankName: apiUser.bankName || undefined,
  accountName: apiUser.accountName || undefined,
  accountNumber: apiUser.accountNumber || undefined,
  adminPermissions: Array.isArray(apiUser.adminPermissions) ? apiUser.adminPermissions : undefined,
  referralCode: apiUser.role === 'CUSTOMER' ? `${apiUser.fullName?.split(' ')[0] || 'CV'}-${apiUser.id.slice(0, 4)}`.toUpperCase() : undefined,
  affiliateCode: apiUser.role === 'AFFILIATE' ? `${apiUser.fullName?.split(' ')[0] || 'AFF'}STYLE`.toUpperCase() : undefined,
  walletBalance: Number(apiUser.walletBalance || 0),
  vendorMoneyBox: apiUser.role === 'VENDOR' ? 0 : undefined,
  createdAt: apiUser.createdAt || new Date().toISOString(),
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('cv_auth_token')));
  const [users, setUsers] = useState<User[]>(() => readSaved('cv_market_users', INITIAL_USERS));
  const [currentUserId, setCurrentUserId] = useState(() => readSaved('cv_market_current_user', INITIAL_USERS[0].id));
  const [products, setProducts] = useState<Product[]>(() => readSaved('cv_market_products', INITIAL_PRODUCTS).map(enrichProduct));
  const [cart, setCart] = useState<CartItem[]>(() => readSaved('cv_market_cart', []));
  const [wishlistByUser, setWishlistByUser] = useState<Record<string, string[]>>(() => readSaved('cv_market_wishlist', {}));
  const [orders, setOrders] = useState<Order[]>(() => readSaved('cv_market_orders', INITIAL_ORDERS));
  const [reviews, setReviews] = useState<Review[]>(() => readSaved('cv_market_reviews', INITIAL_REVIEWS));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => readSaved('cv_market_notifications', INITIAL_NOTIFICATIONS));
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() => readSaved('cv_market_wallet_txns', INITIAL_WALLET_TRANSACTIONS));
  const [refunds, setRefunds] = useState<RefundRequest[]>(() => readSaved('cv_market_refunds', INITIAL_REFUNDS));
  const [vendorProfiles, setVendorProfiles] = useState<VendorProfile[]>(() => readSaved('cv_market_vendors', INITIAL_VENDOR_PROFILES));
  const [vendorAds, setVendorAds] = useState<VendorAd[]>(() => readSaved('cv_market_ads', INITIAL_VENDOR_ADS));
  const [affiliateRecords, setAffiliateRecords] = useState<AffiliateRecord[]>(() => readSaved('cv_market_affiliates', INITIAL_AFFILIATE_RECORDS));
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(() => readSaved('cv_market_community', INITIAL_COMMUNITY_POSTS));
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => readSaved('cv_market_support_tickets', []));

  const currentUser = users.find(user => user.id === currentUserId) || users[0];
  const wishlist = wishlistByUser[currentUser.id] || [];

  useEffect(() => {
    const token = localStorage.getItem('cv_auth_token');
    if (!token) return;

    let cancelled = false;
    apiClient.get('/auth/me')
      .then(response => {
        if (cancelled) return;
        const apiUser = adaptApiUser(response.data);
        setUsers(prev => prev.some(user => user.id === apiUser.id)
          ? prev.map(user => user.id === apiUser.id ? { ...user, ...apiUser } : user)
          : [apiUser, ...prev]);
        setCurrentUserId(apiUser.id);
        setIsAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem('cv_auth_token');
        setIsAuthenticated(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => { localStorage.setItem('cv_market_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('cv_market_current_user', JSON.stringify(currentUserId)); }, [currentUserId]);
  useEffect(() => { localStorage.setItem('cv_market_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('cv_market_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('cv_market_wishlist', JSON.stringify(wishlistByUser)); }, [wishlistByUser]);
  useEffect(() => { localStorage.setItem('cv_market_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('cv_market_reviews', JSON.stringify(reviews)); }, [reviews]);
  useEffect(() => { localStorage.setItem('cv_market_notifications', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('cv_market_wallet_txns', JSON.stringify(walletTransactions)); }, [walletTransactions]);
  useEffect(() => { localStorage.setItem('cv_market_refunds', JSON.stringify(refunds)); }, [refunds]);
  useEffect(() => { localStorage.setItem('cv_market_vendors', JSON.stringify(vendorProfiles)); }, [vendorProfiles]);
  useEffect(() => { localStorage.setItem('cv_market_ads', JSON.stringify(vendorAds)); }, [vendorAds]);
  useEffect(() => { localStorage.setItem('cv_market_affiliates', JSON.stringify(affiliateRecords)); }, [affiliateRecords]);
  useEffect(() => { localStorage.setItem('cv_market_community', JSON.stringify(communityPosts)); }, [communityPosts]);
  useEffect(() => { localStorage.setItem('cv_market_support_tickets', JSON.stringify(supportTickets)); }, [supportTickets]);

  const notify = (userId: string, title: string, message: string, type: AppNotification['type'] = 'info') => {
    setNotifications(prev => [{
      id: makeId('notif'),
      userId,
      title,
      message,
      type,
      createdAt: new Date().toISOString(),
      read: false,
    }, ...prev]);
  };

  const switchUser = (roleOrId: UserRole | string) => {
    const user = users.find(item => item.id === roleOrId || item.role === roleOrId);
    if (user) {
      setCurrentUserId(user.id);
      setCart([]);
    }
  };

  const registerUser = async (payload: RegistrationPayload) => {
    const response = await apiClient.post('/auth/register', {
      fullName: payload.fullName,
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone,
      whatsappNumber: payload.whatsappNumber,
      password: payload.password,
      role: roleToApi(payload.role),
      address: payload.address,
      residentialAddress: payload.residentialAddress,
      profilePicture: payload.profilePicture,
      businessName: payload.businessName,
      businessDescription: payload.businessDescription,
      businessLogo: payload.businessLogo,
      socialMediaLinks: payload.socialMediaLinks,
      bankName: payload.bankName,
      accountName: payload.accountName,
      accountNumber: payload.accountNumber,
    });
    const newUser = adaptApiUser(response.data.user);
    setUsers(prev => prev.some(user => user.id === newUser.id)
      ? prev.map(user => user.id === newUser.id ? { ...user, ...newUser } : user)
      : [newUser, ...prev]);
    if (newUser.role === 'vendor' && !vendorProfiles.some(vendor => vendor.userId === newUser.id)) {
      setVendorProfiles(prev => [{
        id: makeId('vendor'),
        userId: newUser.id,
        storeName: `${newUser.fullName} Store`,
        bankName: 'Pending setup',
        accountNumber: 'Pending setup',
        accountName: newUser.fullName,
        moneyBoxBalance: 0,
        totalSales: 0,
        activeAds: 0,
        rating: 0,
      }, ...prev]);
    }
    return newUser;
  };

  const loginUser = async (payload: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    });
    localStorage.setItem('cv_auth_token', response.data.access_token);
    setIsAuthenticated(true);
    const user = adaptApiUser(response.data.user);
    setUsers(prev => prev.some(item => item.id === user.id)
      ? prev.map(item => item.id === user.id ? { ...item, ...user } : item)
      : [user, ...prev]);
    if (user.role === 'vendor' && !vendorProfiles.some(vendor => vendor.userId === user.id)) {
      setVendorProfiles(prev => [{
        id: makeId('vendor'),
        userId: user.id,
        storeName: `${user.fullName} Store`,
        bankName: 'Pending setup',
        accountNumber: 'Pending setup',
        accountName: user.fullName,
        moneyBoxBalance: 0,
        totalSales: 0,
        activeAds: 0,
        rating: 0,
      }, ...prev]);
    }
    setCurrentUserId(user.id);
    setCart([]);
    return user;
  };

  const verifyEmail = async (token: string) => {
    const response = await apiClient.post('/auth/verify-email', { token });
    const verifiedUser = adaptApiUser(response.data.user);
    setUsers(prev => prev.some(item => item.id === verifiedUser.id)
      ? prev.map(item => item.id === verifiedUser.id ? { ...item, ...verifiedUser } : item)
      : [verifiedUser, ...prev]);
    return response.data.message || 'Email verified successfully. You can now log in.';
  };

  const verifyEmailOtp = async (payload: { email: string; otp: string }) => {
    const response = await apiClient.post('/auth/verify-email-otp', {
      email: payload.email.trim().toLowerCase(),
      otp: payload.otp.trim(),
    });
    const verifiedUser = adaptApiUser(response.data.user);
    setUsers(prev => prev.some(item => item.id === verifiedUser.id)
      ? prev.map(item => item.id === verifiedUser.id ? { ...item, ...verifiedUser } : item)
      : [verifiedUser, ...prev]);
    return response.data.message || 'Email verified successfully. You can now log in.';
  };

  const resendEmailVerification = async (email: string) => {
    const response = await apiClient.post('/auth/resend-verification', { email: email.trim().toLowerCase() });
    return response.data.message || 'Verification email sent. Please check your inbox.';
  };

  const forgotPassword = async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
    return response.data.message || 'If an account exists, a password reset email has been sent.';
  };

  const resetPassword = async (payload: { token: string; password: string }) => {
    const response = await apiClient.post('/auth/reset-password', payload);
    return response.data.message || 'Password reset successfully. You can now log in.';
  };

  const createAdminUser = async (payload: { fullName: string; email: string; phone: string; password: string; permissions: string[] }) => {
    const response = await apiClient.post('/users/admins', {
      fullName: payload.fullName,
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone,
      password: payload.password,
      permissions: payload.permissions,
    });
    const adminUser = adaptApiUser(response.data);
    setUsers(prev => prev.some(user => user.id === adminUser.id)
      ? prev.map(user => user.id === adminUser.id ? { ...user, ...adminUser } : user)
      : [adminUser, ...prev]);
    return adminUser;
  };

  const updateAdminPermissions = async (adminId: string, permissions: string[]) => {
    const response = await apiClient.patch(`/users/admins/${adminId}/permissions`, {
      permissions,
    });
    const adminUser = adaptApiUser(response.data);
    setUsers(prev => prev.map(user => user.id === adminUser.id ? { ...user, ...adminUser } : user));
    return adminUser;
  };

  const logoutUser = () => {
    localStorage.removeItem('cv_auth_token');
    setIsAuthenticated(false);
    setCurrentUserId(INITIAL_USERS[0].id);
    setCart([]);
  };

  const addToCart = (product: Product, quantity = 1) => {
    if (currentUser.role !== 'customer') return;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { product, quantity }];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity } : item));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const toggleWishlist = (productId: string) => {
    setWishlistByUser(prev => {
      const current = prev[currentUser.id] || [];
      const next = current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId];
      return { ...prev, [currentUser.id]: next };
    });
    if (isAuthenticated) {
      apiClient.post('/users/me/wishlist/toggle', { productId }).catch(() => undefined);
    }
  };

  const loadWishlist = async () => {
    const response = await apiClient.get('/users/me/wishlist');
    const productIds = response.data.map((item: any) => item.productId);
    setWishlistByUser(prev => ({ ...prev, [currentUser.id]: productIds }));
    return productIds;
  };

  const createOrder = ({ paymentPlan, duration, deliveryAddress, affiliateCode }: CreateOrderInput) => {
    if (!cart.length) return { success: false, message: 'Your cart is empty.' };
    if (paymentPlan === 'weekly' && (duration < 1 || duration > 30)) return { success: false, message: 'Weekly plans must be 1 to 30 weeks.' };
    if (paymentPlan === 'monthly' && (duration < 1 || duration > 8)) return { success: false, message: 'Monthly plans must be 1 to 8 months.' };

    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const totalAmount = subtotal + PLATFORM_SETTINGS.deliveryFee;
    const paidNow = paymentPlan === 'pay_once' ? totalAmount : totalAmount / duration;
    const now = new Date();
    const schedule = Array.from({ length: duration }, (_, index) => {
      const dueDate = paymentPlan === 'weekly'
        ? addWeeks(now, index + 1)
        : paymentPlan === 'monthly'
          ? addMonths(now, index + 1)
          : now;
      return {
        installmentNumber: index + 1,
        dueDate: dueDate.toISOString().slice(0, 10),
        amount: totalAmount / duration,
        status: index === 0 ? 'Paid' as const : 'Pending' as const,
      };
    });

    const order: Order = {
      id: `CV-${Math.floor(2000 + Math.random() * 7000)}`,
      userId: currentUser.id,
      userFullName: currentUser.fullName,
      items: cart.map(item => ({
        productId: item.product.id,
        vendorId: item.product.vendorId,
        vendorName: item.product.vendorName,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        image: item.product.image,
      })),
      paymentPlan,
      duration,
      subtotal,
      deliveryFee: PLATFORM_SETTINGS.deliveryFee,
      totalAmount,
      amountPaid: paidNow,
      status: paymentPlan === 'pay_once' ? 'Processing Delivery' : 'Installment Active',
      schedule: paymentPlan === 'pay_once' ? [{ installmentNumber: 1, dueDate: now.toISOString().slice(0, 10), amount: totalAmount, status: 'Paid' }] : schedule,
      deliveryAddress,
      trackingNumber: paymentPlan === 'pay_once' ? makeId('CV-NG') : undefined,
      deliveryConfirmed: false,
      createdAt: now.toISOString(),
    };

    setOrders(prev => [order, ...prev]);
    setProducts(prev => prev.map(product => {
      const item = cart.find(cartItem => cartItem.product.id === product.id);
      if (!item) return product;
      const stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
      return { ...product, stockQuantity, inStock: stockQuantity > 0 };
    }));

    if (affiliateCode && subtotal >= PLATFORM_SETTINGS.minimumRewardPurchase) {
      const affiliate = users.find(user => user.affiliateCode === affiliateCode);
      if (affiliate) {
        setAffiliateRecords(prev => [{
          id: makeId('aff'),
          affiliateUserId: affiliate.id,
          customerName: currentUser.fullName,
          orderAmount: subtotal,
          commission: PLATFORM_SETTINGS.affiliateCommission,
          status: 'Paid',
          createdAt: now.toISOString(),
        }, ...prev]);
        setUsers(prev => prev.map(user => user.id === affiliate.id ? { ...user, walletBalance: user.walletBalance + PLATFORM_SETTINGS.affiliateCommission } : user));
      }
    }

    notify(currentUser.id, 'Order created', paymentPlan === 'pay_once'
      ? 'Your order is fully paid and is now being prepared for nationwide delivery.'
      : 'Your installment order is active. Products will be released only after full payment is completed.', 'success');
    clearCart();
    return { success: true, message: `Order ${order.id} created successfully.` };
  };

  const payNextInstallment = (orderId: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      const nextInstallment = order.schedule.find(item => item.status === 'Pending');
      if (!nextInstallment) return order;
      const schedule = order.schedule.map(item => item.installmentNumber === nextInstallment.installmentNumber ? { ...item, status: 'Paid' as const } : item);
      const amountPaid = Math.min(order.totalAmount, order.amountPaid + nextInstallment.amount);
      const fullyPaid = schedule.every(item => item.status === 'Paid');
      if (fullyPaid) notify(order.userId, 'Installment complete', `Order ${order.id} is fully paid and ready for delivery processing.`, 'success');
      return {
        ...order,
        schedule,
        amountPaid,
        status: fullyPaid ? 'Processing Delivery' : 'Installment Active',
        trackingNumber: fullyPaid ? makeId('CV-NG') : order.trackingNumber,
      };
    }));
  };

  const confirmDelivery = (orderId: string) => {
    const order = orders.find(item => item.id === orderId);
    if (!order || order.deliveryConfirmed) return;
    setOrders(prev => prev.map(item => item.id === orderId ? { ...item, status: 'Delivered', deliveryConfirmed: true } : item));

    const vendorTotals = new Map<string, number>();
    order.items.forEach(item => {
      if (!item.vendorId) return;
      const gross = item.price * item.quantity;
      const fees = (PLATFORM_SETTINGS.platformFeePerProduct + PLATFORM_SETTINGS.maintenanceFeePerProduct) * item.quantity;
      vendorTotals.set(item.vendorId, (vendorTotals.get(item.vendorId) || 0) + Math.max(0, gross - fees));
    });

    setVendorProfiles(prev => prev.map(vendor => {
      const earning = vendorTotals.get(vendor.id) || 0;
      if (!earning) return vendor;
      return {
        ...vendor,
        moneyBoxBalance: vendor.moneyBoxBalance + earning,
        totalSales: vendor.totalSales + earning,
      };
    }));
    notify(order.userId, 'Delivery confirmed', 'Thank you. Vendor earnings have been released after company fee deductions.', 'success');
  };

  const requestRefund = (orderId: string, reason: string) => {
    const order = orders.find(item => item.id === orderId);
    if (!order) return;
    const deduction = order.amountPaid * (PLATFORM_SETTINGS.cancellationDeductionPercent / 100);
    const refundedAmount = Math.max(0, order.amountPaid - deduction);
    const request: RefundRequest = {
      id: makeId('RFD'),
      userId: currentUser.id,
      orderId,
      requestedAmount: order.amountPaid,
      deduction,
      refundedAmount,
      reason,
      status: 'Approved',
      createdAt: new Date().toISOString(),
    };
    setRefunds(prev => [request, ...prev]);
    setOrders(prev => prev.map(item => item.id === orderId ? { ...item, status: 'Refunded', refundRequested: true, refundReason: reason } : item));
    setUsers(prev => prev.map(user => user.id === currentUser.id ? { ...user, walletBalance: user.walletBalance + refundedAmount } : user));
    setWalletTransactions(prev => [{
      id: makeId('txn'),
      userId: currentUser.id,
      type: 'Refund',
      amount: refundedAmount,
      status: 'Completed',
      note: `Refund for ${orderId} after ${PLATFORM_SETTINGS.cancellationDeductionPercent}% cancellation deduction.`,
      createdAt: new Date().toISOString(),
    }, ...prev]);
  };

  const fundWallet = (amount: number) => {
    if (amount <= 0) return;
    setUsers(prev => prev.map(user => user.id === currentUser.id ? { ...user, walletBalance: user.walletBalance + amount } : user));
    setWalletTransactions(prev => [{
      id: makeId('txn'),
      userId: currentUser.id,
      type: 'Funding',
      amount,
      status: 'Completed',
      note: 'Wallet funding completed.',
      createdAt: new Date().toISOString(),
    }, ...prev]);
  };

  const withdrawWallet = (amount: number) => {
    if (amount <= 0 || amount > currentUser.walletBalance) return { success: false, message: 'Insufficient eligible wallet balance.' };
    setUsers(prev => prev.map(user => user.id === currentUser.id ? { ...user, walletBalance: user.walletBalance - amount } : user));
    setWalletTransactions(prev => [{
      id: makeId('txn'),
      userId: currentUser.id,
      type: 'Withdrawal',
      amount,
      status: 'Completed',
      note: 'Wallet withdrawal requested to saved bank account.',
      createdAt: new Date().toISOString(),
    }, ...prev]);
    return { success: true, message: 'Withdrawal request completed.' };
  };

  const addReview = (productId: string, rating: number, comment: string) => {
    setReviews(prev => [{
      id: makeId('review'),
      productId,
      userId: currentUser.id,
      userFullName: currentUser.fullName,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    setProducts(prev => prev.map(product => product.id === productId ? {
      ...product,
      reviewCount: product.reviewCount + 1,
      rating: Number(((product.rating * product.reviewCount + rating) / (product.reviewCount + 1)).toFixed(1)),
    } : product));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(item => item.id === id ? { ...item, read: true } : item));
  };

  const vendorAddProduct = (product: Omit<Product, 'id' | 'vendorName' | 'source' | 'rating' | 'reviewCount'>) => {
    const vendor = vendorProfiles.find(item => item.userId === currentUser.id);
    if (!vendor) return;
    setProducts(prev => [{
      ...product,
      id: makeId('prod'),
      vendorId: vendor.id,
      vendorName: vendor.storeName,
      source: 'Vendor',
      rating: 0,
      reviewCount: 0,
    }, ...prev]);
  };

  const vendorCreateAd = (productId: string, placement: VendorAd['placement'], days: 1 | 2) => {
    const vendor = vendorProfiles.find(item => item.userId === currentUser.id);
    if (!vendor) return;
    const cost = days === 1 ? PLATFORM_SETTINGS.adOneDayCost : PLATFORM_SETTINGS.adTwoDayCost;
    setVendorAds(prev => [{
      id: makeId('ad'),
      vendorId: vendor.id,
      productId,
      placement,
      days,
      cost,
      status: 'Active',
      createdAt: new Date().toISOString(),
    }, ...prev]);
    setVendorProfiles(prev => prev.map(item => item.id === vendor.id ? { ...item, activeAds: item.activeAds + 1 } : item));
    setProducts(prev => prev.map(product => product.id === productId ? { ...product, sponsored: placement !== 'Featured products', featured: placement === 'Featured products' } : product));
  };

  const vendorWithdraw = (amount: number) => {
    const vendor = vendorProfiles.find(item => item.userId === currentUser.id);
    if (!vendor || amount <= 0 || amount > vendor.moneyBoxBalance) return { success: false, message: 'Insufficient Vendor Money Box balance.' };
    setVendorProfiles(prev => prev.map(item => item.id === vendor.id ? { ...item, moneyBoxBalance: item.moneyBoxBalance - amount } : item));
    return { success: true, message: 'Vendor withdrawal sent to bank account.' };
  };

  const addCommunityPost = async (title: string, body: string) => {
    if (isAuthenticated) {
      const response = await apiClient.post('/users/community/posts', { title, body });
      setCommunityPosts(prev => [response.data, ...prev]);
      return response.data;
    }

    const post = {
      id: makeId('post'),
      userFullName: currentUser.fullName,
      title,
      body,
      likes: 0,
      createdAt: new Date().toISOString(),
    };
    setCommunityPosts(prev => [post, ...prev]);
    return post;
  };

  const loadCommunityPosts = async () => {
    const response = await apiClient.get('/users/community/posts');
    setCommunityPosts(response.data);
    return response.data;
  };

  const updateCustomerProfile = async (payload: { fullName: string; phone: string; whatsappNumber?: string; picture?: string; address?: string; savedAddresses?: string[] }) => {
    const response = await apiClient.patch('/users/me/profile', payload);
    const updatedUser = adaptApiUser(response.data);
    setUsers(prev => prev.map(user => user.id === updatedUser.id ? { ...user, ...updatedUser } : user));
    return updatedUser;
  };

  const updateNotificationPreferences = async (preferences: NotificationPreferences) => {
    const response = await apiClient.patch('/users/me/notification-preferences', preferences);
    const updatedUser = adaptApiUser(response.data);
    setUsers(prev => prev.map(user => user.id === updatedUser.id ? { ...user, ...updatedUser } : user));
    return updatedUser;
  };

  const loadSupportTickets = async () => {
    const response = await apiClient.get('/users/me/support-tickets');
    setSupportTickets(response.data);
    return response.data;
  };

  const createSupportTicket = async (payload: { subject: string; message: string }) => {
    const response = await apiClient.post('/users/me/support-tickets', payload);
    setSupportTickets(prev => [response.data, ...prev]);
    return response.data;
  };

  const value = useMemo<AppContextType>(() => ({
    settings: PLATFORM_SETTINGS,
    isAuthenticated,
    currentUser,
    users,
    products,
    cart,
    wishlist,
    orders,
    reviews,
    notifications,
    walletTransactions,
    refunds,
    vendorProfiles,
    vendorAds,
    affiliateRecords,
    communityPosts,
    supportTickets,
    switchUser,
    registerUser,
    loginUser,
    verifyEmail,
    verifyEmailOtp,
    resendEmailVerification,
    forgotPassword,
    resetPassword,
    logoutUser,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    toggleWishlist,
    loadWishlist,
    createOrder,
    payNextInstallment,
    confirmDelivery,
    requestRefund,
    fundWallet,
    withdrawWallet,
    addReview,
    markNotificationRead,
    vendorAddProduct,
    vendorCreateAd,
    vendorWithdraw,
    addCommunityPost,
    loadCommunityPosts,
    updateCustomerProfile,
    updateNotificationPreferences,
    loadSupportTickets,
    createSupportTicket,
    createAdminUser,
    updateAdminPermissions,
  }), [isAuthenticated, currentUser, users, products, cart, wishlist, orders, reviews, notifications, walletTransactions, refunds, vendorProfiles, vendorAds, affiliateRecords, communityPosts, supportTickets]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
