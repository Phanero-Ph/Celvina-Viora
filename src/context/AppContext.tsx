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
  loadProducts: () => Promise<Product[]>;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  loadWishlist: () => Promise<string[]>;
  createOrder: (input: CreateOrderInput) => Promise<{ success: boolean; message: string }>;
  loadOrders: () => Promise<Order[]>;
  loadRefunds: () => Promise<RefundRequest[]>;
  payNextInstallment: (orderId: string) => Promise<{ success: boolean; message: string }>;
  confirmDelivery: (orderId: string) => Promise<{ success: boolean; message: string }>;
  requestRefund: (orderId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  fundWallet: (amount: number) => Promise<{ success: boolean; message: string }>;
  withdrawWallet: (amount: number) => Promise<{ success: boolean; message: string }>;
  loadWalletTransactions: () => Promise<WalletTransaction[]>;
  loadNotifications: () => Promise<AppNotification[]>;
  addReview: (productId: string, rating: number, comment: string) => void;
  markNotificationRead: (id: string) => void;
  vendorAddProduct: (product: Omit<Product, 'id' | 'vendorName' | 'source' | 'rating' | 'reviewCount'>) => Promise<Product | void>;
  vendorCreateAd: (productId: string, placement: VendorAd['placement'], days: 1 | 2) => void;
  vendorWithdraw: (amount: number) => Promise<{ success: boolean; message: string }>;
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
  vendorMoneyBox: apiUser.role === 'VENDOR' ? Number(apiUser.vendorMoneyBox || 0) : undefined,
  createdAt: apiUser.createdAt || new Date().toISOString(),
});

const adaptApiProduct = (apiProduct: any, index = 0): Product => enrichProduct({
  id: apiProduct.id,
  vendorId: apiProduct.vendorId || undefined,
  vendorName: apiProduct.vendorName || (apiProduct.source === 'Vendor' ? 'Vendor' : 'Celvina Viora'),
  name: apiProduct.name,
  category: apiProduct.category,
  price: Number(apiProduct.price || 0),
  image: apiProduct.image,
  description: apiProduct.description,
  brand: apiProduct.brand || undefined,
  color: apiProduct.color || undefined,
  sizes: Array.isArray(apiProduct.sizes) ? apiProduct.sizes : [],
  inStock: Boolean(apiProduct.inStock),
  isActive: Boolean(apiProduct.isActive),
  stockQuantity: Number(apiProduct.stockQuantity || 0),
  rating: Number(apiProduct.rating || 0),
  reviewCount: Number(apiProduct.reviewCount || 0),
  source: apiProduct.source === 'Vendor' ? 'Vendor' : 'Celvina Viora',
  sponsored: Boolean(apiProduct.sponsored),
  featured: Boolean(apiProduct.featured),
  flashSale: Boolean(apiProduct.flashSaleEnabled),
}, index);

const adaptApiWalletTransaction = (txn: any): WalletTransaction => ({
  id: txn.id,
  userId: txn.userId,
  type: txn.type,
  amount: Number(txn.amount || 0),
  status: txn.status || 'Completed',
  note: txn.note || '',
  createdAt: txn.createdAt || new Date().toISOString(),
});

const adaptApiNotification = (notification: any): AppNotification => ({
  id: notification.id,
  userId: notification.userId,
  title: notification.title,
  message: notification.message,
  type: notification.type === 'danger' ? 'warning' : notification.type || 'info',
  createdAt: notification.createdAt || new Date().toISOString(),
  read: Boolean(notification.read),
});

const planFromApi = (installmentType: string): PaymentPlanType => {
  if (installmentType === 'WEEKLY') return 'weekly';
  if (installmentType === 'MONTHLY') return 'monthly';
  return 'pay_once';
};

const planToApi = (paymentPlan: PaymentPlanType) => {
  if (paymentPlan === 'weekly') return 'WEEKLY';
  if (paymentPlan === 'monthly') return 'MONTHLY';
  return 'PAY_ONCE';
};

const statusFromApi = (status: string): Order['status'] => {
  if (status === 'DELIVERED_100_COMPLETED') return 'Delivered';
  if (status === 'REFUND_REQUESTED') return 'Refund Requested';
  if (status === 'REFUNDED') return 'Refunded';
  if (status === 'PAY_ONCE_100_DELIVERED' || status === 'ELIGIBLE_100_DELIVERY') return 'Processing Delivery';
  if (status === 'ONGOING_0_DELIVERED' || status === 'DELIVERED_50_ONGOING') return 'Installment Active';
  return 'Payment Pending';
};

const adaptApiOrder = (apiOrder: any, productCatalog: Product[] = []): Order => {
  const paymentPlan = planFromApi(apiOrder.installmentType);
  const schedule = (apiOrder.schedule || []).map((item: any) => ({
    installmentNumber: item.installmentNumber,
    dueDate: String(item.dueDate).slice(0, 10),
    amount: Number(item.amount || 0),
    status: item.status === 'PAID' ? 'Paid' as const : 'Pending' as const,
  }));
  const amountPaid = schedule.filter(item => item.status === 'Paid').reduce((sum, item) => sum + item.amount, 0);

  return {
    id: apiOrder.id,
    userId: apiOrder.userId,
    userFullName: apiOrder.user?.fullName || '',
    items: (apiOrder.items || []).map((item: any) => {
      const product = productCatalog.find(entry => entry.id === item.productId);
      return {
        productId: item.productId,
        vendorId: product?.vendorId,
        vendorName: product?.vendorName || 'Celvina Viora',
        name: item.name,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        image: product?.image || '',
      };
    }),
    paymentPlan,
    duration: Number(apiOrder.duration || 1),
    subtotal: Number(apiOrder.totalItemsAmount || 0),
    deliveryFee: Number(apiOrder.deliveryFee || 0),
    totalAmount: Number(apiOrder.totalAmount || 0),
    amountPaid,
    status: statusFromApi(apiOrder.status),
    schedule,
    deliveryAddress: apiOrder.deliveryAddress || '',
    trackingNumber: apiOrder.trackingNumber || undefined,
    deliveryConfirmed: apiOrder.status === 'DELIVERED_100_COMPLETED',
    refundRequested: apiOrder.status === 'REFUND_REQUESTED' || apiOrder.status === 'REFUNDED',
    createdAt: apiOrder.createdAt || new Date().toISOString(),
  };
};

const adaptApiRefund = (apiRefund: any): RefundRequest => ({
  id: apiRefund.id,
  userId: apiRefund.userId,
  orderId: apiRefund.orderId,
  requestedAmount: Number(apiRefund.requestedAmount || apiRefund.amount || 0),
  deduction: Number(apiRefund.deduction || 0),
  refundedAmount: Number(apiRefund.amount || 0),
  reason: apiRefund.reason || '',
  status: apiRefund.status === 'Approved' ? 'Approved' : apiRefund.status === 'Rejected' ? 'Rejected' : 'Pending',
  createdAt: apiRefund.createdAt || new Date().toISOString(),
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
        if (apiUser.role === 'vendor') {
          setVendorProfiles(prev => prev.some(vendor => vendor.userId === apiUser.id)
            ? prev.map(vendor => vendor.userId === apiUser.id ? { ...vendor, moneyBoxBalance: apiUser.vendorMoneyBox || 0 } : vendor)
            : [{
              id: makeId('vendor'),
              userId: apiUser.id,
              storeName: apiUser.businessName || `${apiUser.fullName} Store`,
              bankName: apiUser.bankName || 'Pending setup',
              accountNumber: apiUser.accountNumber || 'Pending setup',
              accountName: apiUser.accountName || apiUser.fullName,
              moneyBoxBalance: apiUser.vendorMoneyBox || 0,
              totalSales: 0,
              activeAds: 0,
              rating: 0,
            }, ...prev]);
        }
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
        moneyBoxBalance: newUser.vendorMoneyBox || 0,
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
        moneyBoxBalance: user.vendorMoneyBox || 0,
        totalSales: 0,
        activeAds: 0,
        rating: 0,
      }, ...prev]);
    } else if (user.role === 'vendor') {
      setVendorProfiles(prev => prev.map(vendor => vendor.userId === user.id ? {
        ...vendor,
        moneyBoxBalance: user.vendorMoneyBox || 0,
      } : vendor));
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

  const loadProducts = async () => {
    const response = await apiClient.get('/products');
    const nextProducts = response.data.map(adaptApiProduct);
    if (!nextProducts.length) return products;
    setProducts(nextProducts);
    return nextProducts;
  };

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

  const createOrder = async ({ paymentPlan, duration, deliveryAddress, affiliateCode }: CreateOrderInput) => {
    if (!cart.length) return { success: false, message: 'Your cart is empty.' };
    if (paymentPlan === 'weekly' && (duration < 1 || duration > 30)) return { success: false, message: 'Weekly plans must be 1 to 30 weeks.' };
    if (paymentPlan === 'monthly' && (duration < 1 || duration > 8)) return { success: false, message: 'Monthly plans must be 1 to 8 months.' };

    if (isAuthenticated) {
      try {
        const response = await apiClient.post('/orders', {
          items: cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            name: item.product.name,
            vendorId: item.product.vendorId,
            vendorName: item.product.vendorName,
            source: item.product.source,
            category: item.product.category,
            price: item.product.price,
            image: item.product.image,
            description: item.product.description,
            brand: item.product.brand,
            color: item.product.color,
            sizes: item.product.sizes,
          })),
          installmentType: planToApi(paymentPlan),
          duration: paymentPlan === 'pay_once' ? 1 : duration,
          deliveryAddress,
          affiliateCode,
        });
        const order = adaptApiOrder(response.data, products);
        setOrders(prev => [order, ...prev.filter(item => item.id !== order.id)]);
        setProducts(prev => prev.map(product => {
          const item = cart.find(cartItem => cartItem.product.id === product.id);
          if (!item) return product;
          const stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
          return { ...product, stockQuantity, inStock: stockQuantity > 0 };
        }));
        clearCart();
        await loadNotifications().catch(() => undefined);
        return { success: true, message: `Order ${order.id} created successfully.` };
      } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Unable to create order right now.' };
      }
    }

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

  const loadOrders = async () => {
    const response = await apiClient.get('/orders');
    const nextOrders = response.data.map((order: any) => adaptApiOrder(order, products));
    setOrders(prev => {
      const otherUsers = prev.filter(order => order.userId !== currentUser.id);
      return [...nextOrders, ...otherUsers];
    });
    return nextOrders;
  };

  const loadRefunds = async () => {
    const response = await apiClient.get('/orders/me/refunds');
    const nextRefunds = response.data.map(adaptApiRefund);
    setRefunds(prev => {
      const otherUsers = prev.filter(refund => refund.userId !== currentUser.id);
      return [...nextRefunds, ...otherUsers];
    });
    return nextRefunds;
  };

  const payNextInstallment = async (orderId: string) => {
    if (isAuthenticated) {
      try {
        const response = await apiClient.patch(`/orders/${orderId}/pay-next`);
        const order = adaptApiOrder(response.data, products);
        setOrders(prev => prev.map(item => item.id === order.id ? { ...item, ...order } : item));
        await loadNotifications().catch(() => undefined);
        return { success: true, message: 'Installment payment completed.' };
      } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Unable to pay installment right now.' };
      }
    }

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
    return { success: true, message: 'Installment payment completed.' };
  };

  const confirmDelivery = async (orderId: string) => {
    const order = orders.find(item => item.id === orderId);
    if (!order) return { success: false, message: 'Order not found.' };
    if (order.deliveryConfirmed) return { success: false, message: 'Delivery has already been confirmed.' };
    if (isAuthenticated) {
      try {
        const response = await apiClient.patch(`/orders/${orderId}/confirm-delivery`);
        const updatedOrder = adaptApiOrder(response.data, products);
        setOrders(prev => prev.map(item => item.id === updatedOrder.id ? { ...item, ...updatedOrder } : item));
        await loadNotifications().catch(() => undefined);
        return { success: true, message: 'Delivery confirmed.' };
      } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Unable to confirm delivery right now.' };
      }
    }

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
    return { success: true, message: 'Delivery confirmed.' };
  };

  const requestRefund = async (orderId: string, reason: string) => {
    const order = orders.find(item => item.id === orderId);
    if (!order) return { success: false, message: 'Order not found.' };
    if (isAuthenticated) {
      try {
        const response = await apiClient.post(`/orders/${orderId}/refund`, { reason });
        const updatedOrder = adaptApiOrder(response.data.order, products);
        const refund = adaptApiRefund(response.data.refund);
        setOrders(prev => prev.map(item => item.id === updatedOrder.id ? { ...item, ...updatedOrder } : item));
        setRefunds(prev => [refund, ...prev.filter(item => item.id !== refund.id)]);
        await loadWalletTransactions().catch(() => undefined);
        await loadNotifications().catch(() => undefined);
        const userResponse = await apiClient.get('/auth/me').catch(() => null);
        if (userResponse) {
          const updatedUser = adaptApiUser(userResponse.data);
          setUsers(prev => prev.map(user => user.id === updatedUser.id ? { ...user, ...updatedUser } : user));
        }
        return { success: true, message: 'Refund approved and credited to wallet.' };
      } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Unable to request refund right now.' };
      }
    }

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
    return { success: true, message: 'Refund approved and credited to wallet.' };
  };

  const fundWallet = async (amount: number) => {
    if (amount <= 0) return { success: false, message: 'Enter a valid wallet funding amount.' };
    if (isAuthenticated) {
      try {
        const response = await apiClient.post('/users/me/wallet/fund', { amount });
        const updatedUser = adaptApiUser(response.data.user);
        const transaction = adaptApiWalletTransaction(response.data.transaction);
        const notification = adaptApiNotification(response.data.notification);
        setUsers(prev => prev.map(user => user.id === updatedUser.id ? { ...user, ...updatedUser } : user));
        setWalletTransactions(prev => [transaction, ...prev.filter(item => item.id !== transaction.id)]);
        setNotifications(prev => [notification, ...prev.filter(item => item.id !== notification.id)]);
        return { success: true, message: 'Wallet funded successfully.' };
      } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Unable to fund wallet right now.' };
      }
    }

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
    notify(currentUser.id, 'Wallet funded', `Your wallet has been credited with ₦${amount.toLocaleString()}.`, 'success');
    return { success: true, message: 'Wallet funded successfully.' };
  };

  const withdrawWallet = async (amount: number) => {
    if (amount <= 0 || amount > currentUser.walletBalance) return { success: false, message: 'Insufficient eligible wallet balance.' };
    if (isAuthenticated) {
      try {
        const response = await apiClient.post('/users/me/wallet/withdraw', { amount });
        const updatedUser = adaptApiUser(response.data.user);
        const transaction = adaptApiWalletTransaction(response.data.transaction);
        const notification = adaptApiNotification(response.data.notification);
        setUsers(prev => prev.map(user => user.id === updatedUser.id ? { ...user, ...updatedUser } : user));
        setWalletTransactions(prev => [transaction, ...prev.filter(item => item.id !== transaction.id)]);
        setNotifications(prev => [notification, ...prev.filter(item => item.id !== notification.id)]);
        return { success: true, message: 'Withdrawal request completed.' };
      } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Unable to withdraw wallet balance right now.' };
      }
    }

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
    notify(currentUser.id, 'Wallet withdrawal', `Your withdrawal request for ₦${amount.toLocaleString()} has been completed.`, 'success');
    return { success: true, message: 'Withdrawal request completed.' };
  };

  const loadWalletTransactions = async () => {
    const response = await apiClient.get('/users/me/wallet-transactions');
    const transactions = response.data.map(adaptApiWalletTransaction);
    setWalletTransactions(prev => {
      const otherUsers = prev.filter(txn => txn.userId !== currentUser.id);
      return [...transactions, ...otherUsers];
    });
    return transactions;
  };

  const loadNotifications = async () => {
    const response = await apiClient.get('/users/me/notifications');
    const nextNotifications = response.data.map(adaptApiNotification);
    setNotifications(prev => {
      const otherUsers = prev.filter(notification => notification.userId !== currentUser.id);
      return [...nextNotifications, ...otherUsers];
    });
    return nextNotifications;
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
    if (isAuthenticated) {
      apiClient.patch(`/users/me/notifications/${id}/read`).catch(() => undefined);
    }
  };

  const vendorAddProduct = async (product: Omit<Product, 'id' | 'vendorName' | 'source' | 'rating' | 'reviewCount'>) => {
    const vendor = vendorProfiles.find(item => item.userId === currentUser.id);
    if (!vendor) return undefined;
    if (isAuthenticated) {
      const response = await apiClient.post('/products/vendor', {
        ...product,
        source: 'Vendor',
        vendorName: vendor.storeName,
      });
      const createdProduct = adaptApiProduct(response.data);
      setProducts(prev => [createdProduct, ...prev.filter(item => item.id !== createdProduct.id)]);
      return createdProduct;
    }

    const createdProduct: Product = {
      ...product,
      id: makeId('prod'),
      vendorId: vendor.id,
      vendorName: vendor.storeName,
      source: 'Vendor',
      rating: 0,
      reviewCount: 0,
    };
    setProducts(prev => [createdProduct, ...prev]);
    return createdProduct;
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

  const vendorWithdraw = async (amount: number) => {
    const vendor = vendorProfiles.find(item => item.userId === currentUser.id);
    if (!vendor || amount <= 0 || amount > vendor.moneyBoxBalance) return { success: false, message: 'Insufficient Vendor Money Box balance.' };
    if (isAuthenticated) {
      try {
        const response = await apiClient.post('/users/me/vendor-money-box/withdraw', { amount });
        const updatedUser = adaptApiUser(response.data.user);
        const transaction = adaptApiWalletTransaction(response.data.transaction);
        const notification = adaptApiNotification(response.data.notification);
        setUsers(prev => prev.map(user => user.id === updatedUser.id ? { ...user, ...updatedUser } : user));
        setVendorProfiles(prev => prev.map(item => item.userId === updatedUser.id ? {
          ...item,
          moneyBoxBalance: updatedUser.vendorMoneyBox || 0,
        } : item));
        setWalletTransactions(prev => [transaction, ...prev.filter(item => item.id !== transaction.id)]);
        setNotifications(prev => [notification, ...prev.filter(item => item.id !== notification.id)]);
        return { success: true, message: 'Vendor withdrawal sent to bank account.' };
      } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Unable to withdraw from Vendor Money Box right now.' };
      }
    }

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
    loadProducts,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    toggleWishlist,
    loadWishlist,
    createOrder,
    loadOrders,
    loadRefunds,
    payNextInstallment,
    confirmDelivery,
    requestRefund,
    fundWallet,
    withdrawWallet,
    loadWalletTransactions,
    loadNotifications,
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
