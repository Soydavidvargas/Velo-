export type UserRole = 'client' | 'professional' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  city?: string;
  avatarUrl?: string;
  // Professional specific fields
  trade?: string; // e.g. "Plomería & Gas", "Electricidad Residencial"
  bio?: string;
  rating?: number;
  completedJobsCount?: number;
  repeatClientsCount?: number;
  verifiedIdentity?: boolean;
  insuranceActive?: boolean;
  hourlyRate?: number;
  availableDays?: string[];
  stripeConnected?: boolean;
  escrowBalancePending?: number;
  escrowBalanceAvailable?: number;
}

export type EscrowStatus = 
  | 'PENDING'            // Creada, esperando pago en custodia
  | 'ESCROW_HELD'       // Pagado por cliente, retenido en custodia segura
  | 'IN_PROGRESS'       // Técnico en camino / trabajando
  | 'COMPLETED_BY_PRO'  // Técnico marca terminado, esperando aprobación del cliente o 24h
  | 'RELEASED'          // Fondos liberados al técnico (pago completado)
  | 'DISPUTED'          // Cliente abrió mediación; fondos bloqueados en custodia
  | 'REFUNDED';         // Resuelto por mediación a favor de cliente

export interface ServiceItem {
  id: string;
  title: string;
  category: 'plumbing' | 'electricity' | 'climatization' | 'locksmith' | 'painting' | 'appliances';
  categoryLabel: string;
  description: string;
  basePrice: number; // All-in price for client
  estimatedHours: number;
  includedTasks: string[];
  popular?: boolean;
  imageUrl?: string;
}

export interface CommissionBreakdown {
  transactionNumberWithPro: number; // 1 = 1st time, 2 = 2nd time, etc.
  baseRatePercent: number;          // Standard 15%
  effectiveRatePercent: number;     // e.g. 15%, 12%, 9%, 7%, 5%
  discountPercent: number;          // e.g. 0%, 3%, 6%, 8%, 10%
  totalClientPaid: number;          // All-in price
  platformFee: number;              // Velo fee
  proNetEarnings: number;           // Técnico takes this home
  fidelitySavings: number;          // Money kept in the pocket of pro/client vs standard
}

export interface DisputeMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole | 'system';
  message: string;
  timestamp: string;
}

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'alert' | 'push';
  title: string;
  message: string;
  timestamp: string;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  proId: string;
  proName: string;
  proTrade: string;
  serviceId: string;
  serviceTitle: string;
  category: string;
  scheduledDate: string; // ISO string
  scheduledTimeSlot: string; // e.g. "10:00 - 12:00"
  address: string;
  notes?: string;
  allInPrice: number;
  commission: CommissionBreakdown;
  escrowStatus: EscrowStatus;
  escrowTransactionId: string;
  escrowLockedAt?: string;
  completedAt?: string;
  releasedAt?: string;
  autoReleaseDeadline?: string; // 24h after completion
  disputeReason?: string;
  disputeCreatedAt?: string;
  disputeResolutionNotes?: string;
  disputeMessages?: DisputeMessage[];
  proAccepted?: boolean;
  rejectedByPros?: string[]; // Pro IDs who declined without penalties
  clientReview?: {
    rating: number;
    comment: string;
    createdAt: string;
    proReply?: string;
    proReplyAt?: string;
  };
}

export interface Invoice {
  invoiceNumber: string;
  orderId: string;
  issueDate: string;
  dueDate: string;
  client: {
    name: string;
    email: string;
    address: string;
  };
  professional: {
    name: string;
    trade: string;
    taxId: string;
    city: string;
  };
  serviceTitle: string;
  subtotal: number;
  vatRate: number; // 21%
  vatAmount: number;
  totalAllIn: number;
  escrowStatus: EscrowStatus;
  stripeChargeId: string;
}

export interface AiRecommendation {
  detectedCategory: 'plumbing' | 'electricity' | 'climatization' | 'locksmith' | 'painting' | 'appliances';
  confidence: number;
  suggestedServiceTitle: string;
  estimatedPriceRange: {
    min: number;
    max: number;
  };
  urgencyLevel: 'baja' | 'media' | 'alta' | 'urgencia_inmediata';
  diagnosticSummary: string;
  suggestedQuestions: string[];
}
