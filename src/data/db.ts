import fs from 'fs';
import path from 'path';
import { User, ServiceItem, Order } from '../types';
import { calculateCommission } from '../utils/reverseTakeRate';
import { INITIAL_USERS, INITIAL_SERVICES, INITIAL_ORDERS } from './mockStore';

export interface QueryFilter<T> {
  [key: string]: any;
}

export interface FindOptions {
  projection?: string[];
  sort?: { [field: string]: 1 | -1 };
  skip?: number;
  limit?: number;
}

// In-Memory Redis-like TTL Cache
export class RedisLikeCache {
  private cache: Map<string, { value: any; expiry: number }> = new Map();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  set(key: string, value: any, ttlSeconds: number = 60): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  del(key: string): void {
    this.cache.delete(key);
  }

  flush(): void {
    this.cache.clear();
  }
}

// Background Job Queue for Async Non-blocking Tasks
export class BackgroundJobQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  enqueue(task: () => Promise<void>): void {
    this.queue.push(task);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const task = this.queue.shift();
    if (task) {
      try {
        await task();
      } catch (err) {
        console.error('JobQueue Task execution error:', err);
      }
    }
    this.isProcessing = false;
    if (this.queue.length > 0) {
      setImmediate(() => this.processNext());
    }
  }
}

// Generic MongoDB-like Collection
export class MongoCollection<T extends { id: string; [key: string]: any }> {
  private items: Map<string, T> = new Map();
  private indexByCategory: Map<string, Set<string>> = new Map();
  private indexByClientId: Map<string, Set<string>> = new Map();
  private indexByProId: Map<string, Set<string>> = new Map();

  constructor(initialData: T[] = []) {
    for (const item of initialData) {
      this.insertOne(item, false);
    }
  }

  insertOne(doc: T, triggerSave = true): T {
    this.items.set(doc.id, { ...doc });
    this.buildIndexes(doc);
    if (triggerSave) {
      veloDb.schedulePersistence();
    }
    return doc;
  }

  private buildIndexes(doc: T): void {
    if ('category' in doc && typeof doc.category === 'string') {
      if (!this.indexByCategory.has(doc.category)) {
        this.indexByCategory.set(doc.category, new Set());
      }
      this.indexByCategory.get(doc.category)!.add(doc.id);
    }
    if ('clientId' in doc && typeof doc.clientId === 'string') {
      if (!this.indexByClientId.has(doc.clientId)) {
        this.indexByClientId.set(doc.clientId, new Set());
      }
      this.indexByClientId.get(doc.clientId)!.add(doc.id);
    }
    if ('proId' in doc && typeof doc.proId === 'string') {
      if (!this.indexByProId.has(doc.proId)) {
        this.indexByProId.set(doc.proId, new Set());
      }
      this.indexByProId.get(doc.proId)!.add(doc.id);
    }
  }

  findById(id: string): T | null {
    const item = this.items.get(id);
    return item ? { ...item } : null;
  }

  findOne(filter: QueryFilter<T>): T | null {
    const results = this.find(filter, { limit: 1 });
    return results.items[0] || null;
  }

  find(
    filter: QueryFilter<T> = {},
    options: FindOptions = {}
  ): { items: T[]; total: number; page: number; limit: number; totalPages: number } {
    let candidateIds: Set<string> | null = null;

    // Use fast secondary index lookups when possible (avoids full table scan)
    if (filter.category && this.indexByCategory.has(filter.category)) {
      candidateIds = new Set(this.indexByCategory.get(filter.category));
    }
    if (filter.clientId && this.indexByClientId.has(filter.clientId)) {
      const clientMatches = this.indexByClientId.get(filter.clientId)!;
      candidateIds = candidateIds 
        ? new Set([...candidateIds].filter(id => clientMatches.has(id))) 
        : new Set(clientMatches);
    }
    if (filter.proId && this.indexByProId.has(filter.proId)) {
      const proMatches = this.indexByProId.get(filter.proId)!;
      candidateIds = candidateIds 
        ? new Set([...candidateIds].filter(id => proMatches.has(id))) 
        : new Set(proMatches);
    }

    const pool = candidateIds 
      ? Array.from(candidateIds).map(id => this.items.get(id)!).filter(Boolean)
      : Array.from(this.items.values());

    // Apply predicate filters
    let matched = pool.filter(item => {
      for (const [key, val] of Object.entries(filter)) {
        if (key === 'category' || key === 'clientId' || key === 'proId') continue; // already filtered
        if (key === '$search' && typeof val === 'string') {
          const q = val.toLowerCase();
          const title = (item.title || item.name || '').toLowerCase();
          const desc = (item.description || item.trade || item.bio || '').toLowerCase();
          if (!title.includes(q) && !desc.includes(q)) return false;
        } else if (item[key] !== val) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    if (options.sort) {
      const [field, direction] = Object.entries(options.sort)[0];
      matched.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA < valB) return direction === 1 ? -1 : 1;
        if (valA > valB) return direction === 1 ? 1 : -1;
        return 0;
      });
    }

    const total = matched.length;
    const page = options.skip && options.limit ? Math.floor(options.skip / options.limit) + 1 : 1;
    const limit = options.limit || total;
    const skip = options.skip || 0;

    const paged = matched.slice(skip, skip + limit);

    // Apply projection (avoid transferring unneeded columns)
    const projected = options.projection && options.projection.length > 0
      ? paged.map(item => {
          const proj: any = {};
          for (const key of options.projection!) {
            if (key in item) proj[key] = (item as any)[key];
          }
          return proj as T;
        })
      : paged.map(item => ({ ...item }));

    return {
      items: projected,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  updateOne(id: string, update: Partial<T>): T | null {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...update };
    this.items.set(id, updated);
    this.buildIndexes(updated);
    veloDb.schedulePersistence();
    return updated;
  }

  count(): number {
    return this.items.size;
  }

  toArray(): T[] {
    return Array.from(this.items.values()).map(i => ({ ...i }));
  }
}

// Complete Document Database with File Persistence
export class VeloDatabase {
  public users: MongoCollection<User>;
  public services: MongoCollection<ServiceItem>;
  public orders: MongoCollection<Order>;
  public cache: RedisLikeCache;
  public jobQueue: BackgroundJobQueue;
  private dbPath: string;
  private persistScheduled = false;

  constructor() {
    this.cache = new RedisLikeCache();
    this.jobQueue = new BackgroundJobQueue();
    this.dbPath = path.resolve(process.cwd(), 'data', 'velo_db.json');

    // Try loading persisted data from disk
    const persisted = this.loadFromDisk();

    this.users = new MongoCollection<User>(persisted?.users || INITIAL_USERS);
    this.services = new MongoCollection<ServiceItem>(persisted?.services || INITIAL_SERVICES);
    this.orders = new MongoCollection<Order>(persisted?.orders || INITIAL_ORDERS);
  }

  private loadFromDisk(): { users: User[]; services: ServiceItem[]; orders: Order[] } | null {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read persisted velo_db.json, initializing fresh store:', e);
    }
    return null;
  }

  schedulePersistence(): void {
    if (this.persistScheduled) return;
    this.persistScheduled = true;
    this.jobQueue.enqueue(async () => {
      try {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const data = {
          users: this.users.toArray(),
          services: this.services.toArray(),
          orders: this.orders.toArray(),
          lastSavedAt: new Date().toISOString(),
        };
        fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
      } catch (err) {
        console.error('Error persisting database:', err);
      } finally {
        this.persistScheduled = false;
      }
    });
  }

  // Batch query to prevent N+1 overhead when returning orders
  getOrdersWithPopulatedUsers(filter: QueryFilter<Order> = {}): Order[] {
    const ordersResult = this.orders.find(filter, { sort: { escrowLockedAt: -1 } });
    
    // Create an O(1) user hash index to avoid N+1 queries per order
    const usersMap = new Map<string, User>();
    for (const u of this.users.toArray()) {
      usersMap.set(u.id, u);
    }

    return ordersResult.items.map(order => {
      const proUser = usersMap.get(order.proId);
      const clientUser = usersMap.get(order.clientId);
      return {
        ...order,
        proName: proUser?.name || order.proName,
        proTrade: proUser?.trade || order.proTrade,
        clientName: clientUser?.name || order.clientName,
        clientPhone: clientUser?.phone || order.clientPhone,
      };
    });
  }

  countHistoricalOrdersBetween(clientId: string, proId: string): number {
    const orders = this.orders.find({ clientId, proId }).items;
    return orders.filter(
      o => o.escrowStatus === 'RELEASED' || o.escrowStatus === 'COMPLETED_BY_PRO' || o.escrowStatus === 'ESCROW_HELD'
    ).length;
  }

  createOrder(data: {
    clientId: string;
    proId: string;
    serviceId: string;
    scheduledDate: string;
    scheduledTimeSlot: string;
    address: string;
    notes?: string;
  }): Order {
    const client = this.users.findById(data.clientId) || this.users.toArray()[0];
    const pro = this.users.findById(data.proId) || this.users.toArray()[1];
    const service = this.services.findById(data.serviceId) || this.services.toArray()[0];

    const pastOrdersCount = this.countHistoricalOrdersBetween(client.id, pro.id);
    const transactionNumber = pastOrdersCount + 1;
    const commission = calculateCommission(service.basePrice, transactionNumber);

    const newOrder: Order = {
      id: `ord_velo_${Date.now().toString().slice(-6)}`,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone || '+57 300 000 0000',
      proId: pro.id,
      proName: pro.name,
      proTrade: pro.trade || 'Profesional Velo',
      serviceId: service.id,
      serviceTitle: service.title,
      category: service.category,
      scheduledDate: data.scheduledDate,
      scheduledTimeSlot: data.scheduledTimeSlot,
      address: data.address,
      notes: data.notes,
      allInPrice: service.basePrice,
      commission,
      escrowStatus: 'ESCROW_HELD',
      escrowTransactionId: `tx_velo_sec_${Math.floor(10000000 + Math.random() * 90000000)}`,
      escrowLockedAt: new Date().toISOString(),
    };

    this.orders.insertOne(newOrder);

    // Update Pro pending balance
    if (pro.escrowBalancePending !== undefined) {
      this.users.updateOne(pro.id, {
        escrowBalancePending: pro.escrowBalancePending + commission.proNetEarnings,
      });
    }

    this.cache.del('platform_stats');
    return newOrder;
  }

  markCompletedByPro(orderId: string): Order {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error('Orden no encontrada');
    if (order.escrowStatus !== 'ESCROW_HELD') {
      throw new Error('Solo órdenes en custodia activa pueden marcarse como terminadas');
    }

    const now = new Date();
    const autoRelease = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const updated = this.orders.updateOne(orderId, {
      escrowStatus: 'COMPLETED_BY_PRO',
      completedAt: now.toISOString(),
      autoReleaseDeadline: autoRelease.toISOString(),
    });

    this.cache.del('platform_stats');
    return updated!;
  }

  releaseEscrowFunds(orderId: string, authorizedByRole: 'client' | 'admin' | 'auto_timer'): Order {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error('Orden no encontrada');
    if (order.escrowStatus !== 'COMPLETED_BY_PRO' && order.escrowStatus !== 'DISPUTED') {
      throw new Error('No se pueden liberar fondos en este estado');
    }

    const updated = this.orders.updateOne(orderId, {
      escrowStatus: 'RELEASED',
      releasedAt: new Date().toISOString(),
    });

    const pro = this.users.findById(order.proId);
    if (pro) {
      this.users.updateOne(pro.id, {
        escrowBalancePending: Math.max(0, (pro.escrowBalancePending || 0) - order.commission.proNetEarnings),
        escrowBalanceAvailable: (pro.escrowBalanceAvailable || 0) + order.commission.proNetEarnings,
        completedJobsCount: (pro.completedJobsCount || 0) + 1,
      });
    }

    this.cache.del('platform_stats');
    return updated!;
  }

  openDispute(orderId: string, reason: string): Order {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error('Orden no encontrada');

    const updated = this.orders.updateOne(orderId, {
      escrowStatus: 'DISPUTED',
      disputeReason: reason,
      disputeCreatedAt: new Date().toISOString(),
    });

    this.cache.del('platform_stats');
    return updated!;
  }

  resolveDispute(orderId: string, resolution: 'release_to_pro' | 'refund_client', notes: string): Order {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error('Orden no encontrada');

    this.orders.updateOne(orderId, {
      disputeResolutionNotes: notes,
    });

    if (resolution === 'release_to_pro') {
      return this.releaseEscrowFunds(orderId, 'admin');
    } else {
      const updated = this.orders.updateOne(orderId, {
        escrowStatus: 'REFUNDED',
      });
      const pro = this.users.findById(order.proId);
      if (pro && pro.escrowBalancePending !== undefined) {
        this.users.updateOne(pro.id, {
          escrowBalancePending: Math.max(0, pro.escrowBalancePending - order.commission.proNetEarnings),
        });
      }
      this.cache.del('platform_stats');
      return updated!;
    }
  }

  addReview(orderId: string, rating: number, comment: string): Order {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error('Orden no encontrada');

    const updated = this.orders.updateOne(orderId, {
      clientReview: {
        rating,
        comment,
        createdAt: new Date().toISOString(),
      },
    });
    return updated!;
  }

  acceptOrderByPro(orderId: string): Order {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error('Orden no encontrada');
    const updated = this.orders.updateOne(orderId, { proAccepted: true });
    return updated!;
  }

  rejectOrderByPro(orderId: string, rejectingProId: string): { order: Order; newPro: User } {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error('Orden no encontrada');

    const rejectedList = order.rejectedByPros ? [...order.rejectedByPros] : [];
    if (!rejectedList.includes(rejectingProId)) {
      rejectedList.push(rejectingProId);
    }

    const otherPros = this.users.toArray().filter(
      u => u.role === 'professional' && !rejectedList.includes(u.id)
    );
    const newPro = otherPros.length > 0 ? otherPros[0] : this.users.toArray().find(u => u.role === 'professional')!;

    const updated = this.orders.updateOne(orderId, {
      proId: newPro.id,
      proName: newPro.name,
      proTrade: newPro.trade || 'Profesional Velo',
      proAccepted: false,
      rejectedByPros: rejectedList,
    });

    return { order: updated!, newPro };
  }

  addDisputeMessage(orderId: string, messageData: { senderId: string; senderName: string; senderRole: any; message: string }): Order {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error('Orden no encontrada');

    const messages = order.disputeMessages ? [...order.disputeMessages] : [];
    const now = new Date();
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    messages.push({
      id: `msg_${Date.now()}`,
      orderId,
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      senderRole: messageData.senderRole,
      message: messageData.message,
      timestamp: timeFormatted,
    });

    const updated = this.orders.updateOne(orderId, { disputeMessages: messages });
    return updated!;
  }

  replyToReview(orderId: string, proReply: string): Order {
    const order = this.orders.findById(orderId);
    if (!order || !order.clientReview) throw new Error('Review no encontrada');

    const updated = this.orders.updateOne(orderId, {
      clientReview: {
        ...order.clientReview,
        proReply,
        proReplyAt: new Date().toISOString(),
      },
    });
    return updated!;
  }

  getPlatformStats() {
    const cached = this.cache.get('platform_stats');
    if (cached) return cached;

    const allOrders = this.orders.toArray();
    const totalTransactions = allOrders.length;
    const releasedOrders = allOrders.filter(o => o.escrowStatus === 'RELEASED');
    const totalGMV = allOrders.reduce((sum, o) => sum + o.allInPrice, 0);
    const totalReleasedFunds = releasedOrders.reduce((sum, o) => sum + o.commission.proNetEarnings, 0);
    const totalPlatformRevenue = releasedOrders.reduce((sum, o) => sum + o.commission.platformFee, 0);
    const activeEscrowHeld = allOrders
      .filter(o => o.escrowStatus === 'ESCROW_HELD' || o.escrowStatus === 'COMPLETED_BY_PRO' || o.escrowStatus === 'DISPUTED')
      .reduce((sum, o) => sum + o.allInPrice, 0);
    
    const repeatOrders = allOrders.filter(o => o.commission.transactionNumberWithPro > 1).length;
    const repeatOrderSharePercent = totalTransactions > 0 
      ? Math.round((repeatOrders / totalTransactions) * 100) 
      : 0;

    const totalFees = allOrders.reduce((acc, o) => acc + o.commission.platformFee, 0);
    const effectiveTakeRate = totalGMV > 0 
      ? Math.round((totalFees / totalGMV) * 1000) / 10 
      : 15.0;

    const stats = {
      totalGMV,
      totalReleasedFunds,
      totalPlatformRevenue,
      activeEscrowHeld,
      totalTransactions,
      repeatOrderSharePercent,
      effectiveTakeRate,
      disputedCount: allOrders.filter(o => o.escrowStatus === 'DISPUTED').length,
    };

    this.cache.set('platform_stats', stats, 10); // Cache for 10 seconds
    return stats;
  }
}

export const veloDb = new VeloDatabase();
