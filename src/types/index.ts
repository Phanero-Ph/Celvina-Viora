export type UserRole = 'customer' | 'vendor' | 'affiliate' | 'admin' | 'super_admin';

export type ProductCategory = 'Clothing' | 'Shoes' | 'Bags' | 'Accessories' | 'Lifestyle';

export type PaymentPlanType = 'pay_once' | 'weekly' | 'monthly';

export type OrderStatus =
  | 'Payment Pending'
  | 'Installment Active'
  | 'Fully Paid'
  | 'Processing Delivery'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Refund Requested'
  | 'Refunded';

export type WalletTransactionType =
  | 'Funding'
  | 'Refund'
  | 'Referral Reward'
  | 'Affiliate Commission'
  | 'Withdrawal'
  | 'Vendor Earning'
  | 'Purchase';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  role: UserRole;
  isVerified: boolean;
  avatar?: string;
  address?: string;
  residentialAddress?: string;
  businessName?: string;
  businessDescription?: string;
  businessLogo?: string;
  socialMediaLinks?: Record<string, string>;
  savedAddresses?: string[];
  notificationPreferences?: NotificationPreferences;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  adminPermissions?: string[];
  referralCode?: string;
  affiliateCode?: string;
  walletBalance: number;
  vendorMoneyBox?: number;
  createdAt: string;
}

export interface VendorProfile {
  id: string;
  userId: string;
  storeName: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  moneyBoxBalance: number;
  totalSales: number;
  activeAds: number;
  rating: number;
}

export interface Product {
  id: string;
  vendorId?: string;
  vendorName: string;
  name: string;
  category: ProductCategory;
  price: number;
  image: string;
  description: string;
  inStock: boolean;
  isActive: boolean;
  stockQuantity: number;
  rating: number;
  reviewCount: number;
  source: 'Celvina Viora' | 'Vendor';
  sponsored?: boolean;
  featured?: boolean;
  flashSale?: boolean;
  seasonalPromo?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface PaymentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending';
}

export interface Order {
  id: string;
  userId: string;
  userFullName: string;
  items: Array<{
    productId: string;
    vendorId?: string;
    vendorName: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    delivered?: boolean;
    reviewed?: boolean;
  }>;
  paymentPlan: PaymentPlanType;
  duration: number;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  amountPaid: number;
  status: OrderStatus;
  schedule: PaymentScheduleItem[];
  deliveryAddress: string;
  trackingNumber?: string;
  deliveryConfirmed: boolean;
  refundRequested?: boolean;
  refundReason?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userFullName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  createdAt: string;
  read: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  whatsapp: boolean;
  push: boolean;
  orders: boolean;
  payments: boolean;
  promotions: boolean;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'Open' | 'Pending' | 'Resolved';
  adminReply?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: WalletTransactionType;
  amount: number;
  status: 'Completed' | 'Pending';
  note: string;
  createdAt: string;
}

export interface RefundRequest {
  id: string;
  userId: string;
  orderId: string;
  requestedAmount: number;
  deduction: number;
  refundedAmount: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface AffiliateRecord {
  id: string;
  affiliateUserId: string;
  customerName: string;
  orderAmount: number;
  commission: number;
  status: 'Pending' | 'Paid';
  createdAt: string;
}

export interface VendorAd {
  id: string;
  vendorId: string;
  productId: string;
  placement: 'Homepage placement' | 'Sponsored products' | 'Featured products';
  days: 1 | 2;
  cost: number;
  status: 'Active' | 'Expired';
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  userFullName: string;
  title: string;
  body: string;
  likes: number;
  createdAt: string;
}

export interface PlatformSettings {
  deliveryFee: number;
  platformFeePerProduct: number;
  maintenanceFeePerProduct: number;
  cancellationDeductionPercent: number;
  referralReward: number;
  affiliateCommission: number;
  minimumRewardPurchase: number;
  adOneDayCost: number;
  adTwoDayCost: number;
  supportEmail: string;
}
