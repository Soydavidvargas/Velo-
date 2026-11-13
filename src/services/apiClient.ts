import {
  User,
  UserRole,
  ServiceItem,
  Order,
  AiRecommendation,
  CommissionBreakdown,
  WorkerAd,
  DirectMessage,
  PurchaseOrder,
  SaleOrder,
} from '../types';

let activeSessionHeaders: Record<string, string> = {};

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    ...activeSessionHeaders,
    ...(extra || {}),
  };
}

export const apiClient = {
  setSessionContext(user: User | null) {
    if (user) {
      activeSessionHeaders = {
        'x-user-id': user.id,
        'x-user-role': user.role,
      };
    } else {
      activeSessionHeaders = {};
    }
  },

  async login(payload: {
    email?: string;
    password?: string;
    role?: UserRole;
    quickDemoUserId?: string;
  }): Promise<User> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al iniciar sesión');
    }
    return res.json();
  },

  async register(payload: {
    role: 'client' | 'professional';
    email: string;
    password?: string;
    phone?: string;
    city?: string;
    name?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    secondLastName?: string;
    cedula?: string;
    faceVerified?: boolean;
    verificationSkipped?: boolean;
    trade?: string;
    bio?: string;
    hourlyRate?: number;
    category?: string;
  }): Promise<User> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar cuenta');
    }
    return res.json();
  },

  async switchToWorker(payload: {
    clientId: string;
    mode: 'login' | 'register';
    email?: string;
    password?: string;
    phone?: string;
    city?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    secondLastName?: string;
    cedula?: string;
    faceVerified?: boolean;
    verificationSkipped?: boolean;
    trade?: string;
    category?: string;
    hourlyRate?: number;
  }): Promise<User> {
    const res = await fetch('/api/auth/switch-to-worker', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al cambiar a rol de trabajador');
    }
    return res.json();
  },

  async switchToClient(proId: string): Promise<User> {
    const res = await fetch('/api/auth/switch-to-client', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ proId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al cambiar a rol de cliente');
    }
    return res.json();
  },

  async getUsers(role?: UserRole): Promise<User[]> {
    const url = role ? `/api/users?role=${encodeURIComponent(role)}` : '/api/users';
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error('Error al cargar usuarios');
    return res.json();
  },

  async getUser(id: string): Promise<User> {
    const res = await fetch(`/api/users/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Error al obtener usuario');
    return res.json();
  },

  async getServices(params?: { category?: string; search?: string; page?: number; limit?: number }): Promise<ServiceItem[]> {
    let url = '/api/services';
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (query.toString()) url += `?${query.toString()}`;

    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error('Error al cargar servicios');
    const data = await res.json();
    return Array.isArray(data) ? data : data.items || [];
  },

  // Worker Ads (Anuncios de Trabajadores)
  async getWorkerAds(params?: {
    category?: string;
    city?: string;
    maxPrice?: number;
    minRating?: number;
    verifiedOnly?: boolean;
    search?: string;
    proId?: string;
    includeInactive?: boolean;
  }): Promise<WorkerAd[]> {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.append('category', params.category);
    if (params?.city && params.city !== 'all') query.append('city', params.city);
    if (params?.maxPrice && params.maxPrice > 0) query.append('maxPrice', String(params.maxPrice));
    if (params?.minRating && params.minRating > 0) query.append('minRating', String(params.minRating));
    if (params?.verifiedOnly) query.append('verifiedOnly', 'true');
    if (params?.search) query.append('search', params.search);
    if (params?.proId) query.append('proId', params.proId);
    if (params?.includeInactive) query.append('includeInactive', 'true');
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`/api/worker-ads${qs}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Error al cargar anuncios de trabajadores');
    return res.json();
  },

  async createWorkerAd(payload: {
    proId: string;
    title: string;
    description: string;
    category: string;
    priceFrom: number;
    city?: string;
  }): Promise<WorkerAd> {
    const res = await fetch('/api/worker-ads', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al publicar anuncio');
    }
    return res.json();
  },

  async updateWorkerAd(id: string, update: Partial<WorkerAd>): Promise<WorkerAd> {
    const res = await fetch(`/api/worker-ads/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(update),
    });
    if (!res.ok) throw new Error('Error al actualizar anuncio');
    return res.json();
  },

  // Real-time Chat & Email API
  async getMessages(userId: string, partnerId?: string): Promise<DirectMessage[]> {
    const query = new URLSearchParams({ userId });
    if (partnerId) query.append('partnerId', partnerId);
    const res = await fetch(`/api/messages?${query.toString()}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Error al cargar mensajes');
    return res.json();
  },

  async sendChatMessage(payload: {
    clientId: string;
    proId: string;
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    text: string;
  }): Promise<DirectMessage> {
    const res = await fetch('/api/messages/chat', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error enviando mensaje');
    }
    return res.json();
  },

  async sendEmailMessage(payload: {
    clientId: string;
    proId: string;
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    subject: string;
    body: string;
  }): Promise<{ success: boolean; deliveredTo?: string; message: DirectMessage }> {
    const res = await fetch('/api/messages/email', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error enviando correo');
    }
    return res.json();
  },

  async getQuote(clientId: string, proId: string, servicePrice: number): Promise<{ transactionNumber: number; breakdown: CommissionBreakdown }> {
    const res = await fetch(
      `/api/services/quote?clientId=${encodeURIComponent(clientId)}&proId=${encodeURIComponent(proId)}&servicePrice=${servicePrice}`,
      { headers: authHeaders() }
    );
    if (!res.ok) throw new Error('Error al calcular presupuesto');
    return res.json();
  },

  async getOrders(filter?: { clientId?: string; proId?: string }): Promise<Order[]> {
    let url = '/api/orders';
    if (filter?.clientId) {
      url += `?clientId=${encodeURIComponent(filter.clientId)}`;
    } else if (filter?.proId) {
      url += `?proId=${encodeURIComponent(filter.proId)}`;
    }
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error('Error al obtener órdenes');
    return res.json();
  },

  async getOrder(id: string): Promise<Order> {
    const res = await fetch(`/api/orders/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Error al obtener la orden');
    return res.json();
  },

  async createOrder(data: {
    clientId: string;
    proId: string;
    serviceId?: string;
    workerAdId?: string;
    customTitle?: string;
    customPrice?: number;
    category?: string;
    scheduledDate: string;
    scheduledTimeSlot: string;
    address: string;
    notes?: string;
  }): Promise<Order> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear la orden');
    }
    return res.json();
  },

  async verifyArrivalCode(orderId: string, code: string, proId?: string): Promise<Order> {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/verify-arrival`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ code, proId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Código de llegada incorrecto');
    }
    return res.json();
  },

  async completeOrderByPro(orderId: string): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/complete`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al marcar orden como completada');
    }
    return res.json();
  },

  async releaseEscrowFunds(orderId: string, role: 'client' | 'admin' | 'auto_timer' = 'client'): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/release`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al liberar fondos en custodia');
    }
    return res.json();
  },

  async openDispute(orderId: string, reason: string): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/dispute`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al abrir mediación');
    }
    return res.json();
  },

  async acceptOrderByPro(orderId: string): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/accept-pro`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al aceptar el servicio');
    }
    return res.json();
  },

  async rejectOrderByPro(orderId: string, proId: string): Promise<{ order: Order; newPro: User }> {
    const res = await fetch(`/api/orders/${orderId}/reject-pro`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ proId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al declinar el servicio');
    }
    return res.json();
  },

  async sendDisputeMessage(orderId: string, senderId: string, senderName: string, senderRole: string, message: string): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/dispute-message`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ senderId, senderName, senderRole, message }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al enviar mensaje');
    }
    return res.json();
  },

  async resolveDispute(orderId: string, resolution: 'release_to_pro' | 'refund_client', notes: string): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/resolve-dispute`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ resolution, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al resolver disputa');
    }
    return res.json();
  },

  async submitReview(orderId: string, rating: number, comment: string): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/review`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ rating, comment }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al enviar reseña');
    }
    return res.json();
  },

  async replyToReview(orderId: string, proReply: string): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/reply`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ proReply }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al responder a la reseña');
    }
    return res.json();
  },

  async getPlatformStats() {
    const res = await fetch('/api/stats', { headers: authHeaders() });
    if (!res.ok) throw new Error('Error al obtener estadísticas');
    return res.json();
  },

  async getAiRecommendation(problemDescription: string): Promise<AiRecommendation> {
    const res = await fetch('/api/ai/recommend', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ problemDescription }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error en recomendación IA');
    }
    return res.json();
  },

  // Gestión de Compras (Solo Clientes)
  async getPurchases(filter?: { clientId?: string; status?: string; search?: string }): Promise<PurchaseOrder[]> {
    const query = new URLSearchParams();
    if (filter?.clientId) query.append('clientId', filter.clientId);
    if (filter?.status) query.append('status', filter.status);
    if (filter?.search) query.append('search', filter.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`/api/purchases${qs}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Error al cargar órdenes de compra');
    return res.json();
  },

  async createPurchase(data: {
    clientId?: string;
    clientName?: string;
    supplier: string;
    deliveryDate: string;
    amount: number;
    items: number;
    priority: string;
    description: string;
    paymentMethod?: string;
  }): Promise<PurchaseOrder> {
    const res = await fetch('/api/purchases', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear orden de compra');
    }
    return res.json();
  },

  async updatePurchase(id: string, update: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const res = await fetch(`/api/purchases/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(update),
    });
    if (!res.ok) throw new Error('Error al actualizar orden de compra');
    return res.json();
  },

  async deletePurchase(id: string): Promise<void> {
    const res = await fetch(`/api/purchases/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Error al eliminar orden de compra');
  },

  // Gestión de Ventas (Solo Trabajadores)
  async getSales(filter?: { proId?: string; status?: string; search?: string }): Promise<SaleOrder[]> {
    const query = new URLSearchParams();
    if (filter?.proId) query.append('proId', filter.proId);
    if (filter?.status) query.append('status', filter.status);
    if (filter?.search) query.append('search', filter.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`/api/sales${qs}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Error al cargar órdenes de venta');
    return res.json();
  },

  async createSale(data: {
    proId?: string;
    customer: string;
    dueDate: string;
    amount: number;
    items: number;
    paymentTerms: string;
    salesRep: string;
    description?: string;
  }): Promise<SaleOrder> {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear orden de venta');
    }
    return res.json();
  },

  async updateSale(id: string, update: Partial<SaleOrder>): Promise<SaleOrder> {
    const res = await fetch(`/api/sales/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(update),
    });
    if (!res.ok) throw new Error('Error al actualizar orden de venta');
    return res.json();
  },

  async deleteSale(id: string): Promise<void> {
    const res = await fetch(`/api/sales/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Error al eliminar orden de venta');
  },
};
