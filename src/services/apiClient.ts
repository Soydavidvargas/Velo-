import { User, ServiceItem, Order, AiRecommendation, CommissionBreakdown } from '../types';

export const apiClient = {
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Error al cargar usuarios');
    return res.json();
  },

  async getUser(id: string): Promise<User> {
    const res = await fetch(`/api/users/${id}`);
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

    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar servicios');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items || []);
  },

  async getQuote(clientId: string, proId: string, servicePrice: number): Promise<{ transactionNumber: number; breakdown: CommissionBreakdown }> {
    const res = await fetch(`/api/services/quote?clientId=${encodeURIComponent(clientId)}&proId=${encodeURIComponent(proId)}&servicePrice=${servicePrice}`);
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
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener órdenes');
    return res.json();
  },

  async getOrder(id: string): Promise<Order> {
    const res = await fetch(`/api/orders/${id}`);
    if (!res.ok) throw new Error('Error al obtener la orden');
    return res.json();
  },

  async createOrder(data: {
    clientId: string;
    proId: string;
    serviceId: string;
    scheduledDate: string;
    scheduledTimeSlot: string;
    address: string;
    notes?: string;
  }): Promise<Order> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear la orden');
    }
    return res.json();
  },

  async completeOrderByPro(orderId: string): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proReply }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al responder a la reseña');
    }
    return res.json();
  },

  async getPlatformStats() {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Error al obtener estadísticas');
    return res.json();
  },

  async getAiRecommendation(problemDescription: string): Promise<AiRecommendation> {
    const res = await fetch('/api/ai/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemDescription }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error en recomendación IA');
    }
    return res.json();
  },
};
