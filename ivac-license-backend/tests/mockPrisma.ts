import { vi } from 'vitest';
import crypto from 'crypto';

export class InMemoryDb {
  public admins: any[] = [];
  public adminSessions: any[] = [];
  public licenses: any[] = [];
  public licenseInstallations: any[] = [];
  public paymentPlans: any[] = [];
  public paymentSettings: any = {
    id: 'default',
    bkashNumber: '01700000000',
    nagadNumber: '01800000000',
    bankInstructions: 'City Bank AC: 1102938472910',
    whatsappNumber: '+8801700000000',
    instructionText: 'Payment instructions text',
    updatedAt: new Date(),
  };
  public paymentRequests: any[] = [];
  public auditLogs: any[] = [];

  public reset() {
    this.admins = [];
    this.adminSessions = [];
    this.licenses = [];
    this.licenseInstallations = [];
    this.paymentPlans = [
      { id: '1', code: 'PLAN_7D', name: '7 Days', validityDays: 7, price: 300, maxInstallations: 1, currency: 'BDT', isActive: true, sortOrder: 1 },
      { id: '2', code: 'PLAN_30D', name: '30 Days', validityDays: 30, price: 1000, maxInstallations: 1, currency: 'BDT', isActive: true, sortOrder: 2 },
      { id: '3', code: 'PLAN_90D', name: '90 Days', validityDays: 90, price: 2700, maxInstallations: 2, currency: 'BDT', isActive: true, sortOrder: 3 },
    ];
    this.paymentRequests = [];
    this.auditLogs = [];
  }
}

export const inMemoryDb = new InMemoryDb();
inMemoryDb.reset();

export const mockPrisma = {
  admin: {
    findFirst: vi.fn(async ({ where }: any) => {
      return inMemoryDb.admins.find((a) => {
        if (where?.OR) {
          return where.OR.some((cond: any) => {
            if (cond.email) return a.email.toLowerCase() === cond.email.equals?.toLowerCase() || a.email === cond.email;
            if (cond.username) return a.username.toLowerCase() === cond.username.equals?.toLowerCase() || a.username === cond.username;
            return false;
          });
        }
        return false;
      }) || null;
    }),
    findUnique: vi.fn(async ({ where }: any) => {
      if (where.id) return inMemoryDb.admins.find((a) => a.id === where.id) || null;
      if (where.email) return inMemoryDb.admins.find((a) => a.email === where.email) || null;
      if (where.username) return inMemoryDb.admins.find((a) => a.username === where.username) || null;
      return null;
    }),
    create: vi.fn(async ({ data }: any) => {
      const record = { id: data.id || crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data };
      inMemoryDb.admins.push(record);
      return record;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const index = inMemoryDb.admins.findIndex((a) => a.id === where.id);
      if (index === -1) throw new Error('Admin not found');
      inMemoryDb.admins[index] = { ...inMemoryDb.admins[index], ...data, updatedAt: new Date() };
      return inMemoryDb.admins[index];
    }),
  },
  adminSession: {
    create: vi.fn(async ({ data }: any) => {
      const record = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
      inMemoryDb.adminSessions.push(record);
      return record;
    }),
    deleteMany: vi.fn(async ({ where }: any) => {
      inMemoryDb.adminSessions = inMemoryDb.adminSessions.filter((s) => s.adminId !== where.adminId);
      return { count: 1 };
    }),
  },
  license: {
    create: vi.fn(async ({ data }: any) => {
      const record = {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        activatedAt: null,
        expiresAt: null,
        lastValidatedAt: null,
        ...data,
      };
      inMemoryDb.licenses.push(record);
      return record;
    }),
    findUnique: vi.fn(async ({ where, include, select }: any) => {
      let lic: any = null;
      if (where.id) lic = inMemoryDb.licenses.find((l) => l.id === where.id);
      if (where.keyHash) lic = inMemoryDb.licenses.find((l) => l.keyHash === where.keyHash);
      if (!lic) return null;

      const result = { ...lic };
      if (include?.installations || select?.installations) {
        result.installations = inMemoryDb.licenseInstallations.filter((i) => i.licenseId === lic.id);
      }
      if (include?.paymentRequests || select?.paymentRequests) {
        result.paymentRequests = inMemoryDb.paymentRequests.filter((p) => p.licenseId === lic.id);
      }
      return result;
    }),
    findMany: vi.fn(async ({ where, skip = 0, take = 50 }: any) => {
      let list = [...inMemoryDb.licenses];
      if (where?.status) {
        list = list.filter((l) => l.status === where.status);
      }
      return list.slice(skip, skip + take).map((l) => ({
        ...l,
        _count: {
          installations: inMemoryDb.licenseInstallations.filter((i) => i.licenseId === l.id && i.status === 'ACTIVE').length,
        },
      }));
    }),
    count: vi.fn(async ({ where }: any = {}) => {
      let list = [...inMemoryDb.licenses];
      if (where?.status) {
        if (where.status === 'ACTIVE' && where.expiresAt?.gt) {
          list = list.filter((l) => l.status === 'ACTIVE' && l.expiresAt && l.expiresAt > where.expiresAt.gt);
        } else {
          list = list.filter((l) => l.status === where.status);
        }
      }
      return list.length;
    }),
    update: vi.fn(async ({ where, data, include }: any) => {
      const index = inMemoryDb.licenses.findIndex((l) => l.id === where.id);
      if (index === -1) throw new Error('License not found');
      inMemoryDb.licenses[index] = { ...inMemoryDb.licenses[index], ...data, updatedAt: new Date() };
      const res = { ...inMemoryDb.licenses[index] };
      if (include?.installations) {
        res.installations = inMemoryDb.licenseInstallations.filter((i) => i.licenseId === res.id);
      }
      return res;
    }),
  },
  licenseInstallation: {
    create: vi.fn(async ({ data }: any) => {
      if (inMemoryDb.licenseInstallations.some((i) => i.installationId === data.installationId)) {
        const error = new Error('Unique constraint failed on the fields: (installationId)') as any;
        error.code = 'P2002';
        error.meta = { target: ['installationId'] };
        throw error;
      }
      const record = { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data };
      inMemoryDb.licenseInstallations.push(record);
      return record;
    }),
    findUnique: vi.fn(async ({ where, include }: any) => {
      let inst: any = null;
      if (where.id) inst = inMemoryDb.licenseInstallations.find((i) => i.id === where.id);
      if (where.installationId) inst = inMemoryDb.licenseInstallations.find((i) => i.installationId === where.installationId);
      if (!inst) return null;
      const res = { ...inst };
      if (include?.license) {
        res.license = inMemoryDb.licenses.find((l) => l.id === inst.licenseId);
      }
      return res;
    }),
    findMany: vi.fn(async ({ where }: any) => {
      let list = [...inMemoryDb.licenseInstallations];
      if (where?.licenseId) list = list.filter((i) => i.licenseId === where.licenseId);
      if (where?.status) list = list.filter((i) => i.status === where.status);
      return list;
    }),
    count: vi.fn(async ({ where }: any) => {
      let list = [...inMemoryDb.licenseInstallations];
      if (where?.licenseId) list = list.filter((i) => i.licenseId === where.licenseId);
      if (where?.status) list = list.filter((i) => i.status === where.status);
      return list.length;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const index = inMemoryDb.licenseInstallations.findIndex((i) => i.id === where.id);
      if (index === -1) throw new Error('Installation not found');
      inMemoryDb.licenseInstallations[index] = { ...inMemoryDb.licenseInstallations[index], ...data, updatedAt: new Date() };
      return inMemoryDb.licenseInstallations[index];
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      let count = 0;
      inMemoryDb.licenseInstallations.forEach((inst, idx) => {
        if (where.licenseId && inst.licenseId !== where.licenseId) return;
        if (where.status && inst.status !== where.status) return;
        inMemoryDb.licenseInstallations[idx] = { ...inst, ...data, updatedAt: new Date() };
        count++;
      });
      return { count };
    }),
  },
  paymentPlan: {
    findMany: vi.fn(async ({ where, orderBy, include }: any = {}) => {
      let list = [...inMemoryDb.paymentPlans];
      if (where?.isActive !== undefined) {
        list = list.filter((p) => p.isActive === where.isActive);
      }
      if (where?.OR && Array.isArray(where.OR)) {
        list = list.filter((p) => {
          return where.OR.some((cond: any) => {
            if (cond.name?.contains) {
              return p.name.toLowerCase().includes(cond.name.contains.toLowerCase());
            }
            if (cond.code?.contains) {
              return p.code.toLowerCase().includes(cond.code.contains.toLowerCase());
            }
            return false;
          });
        });
      }
      if (orderBy) {
        list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
      return list.map((p) => {
        const item: any = { ...p };
        if (include?._count?.select?.paymentRequests) {
          item._count = {
            paymentRequests: inMemoryDb.paymentRequests.filter((pr) => pr.planId === p.id || pr.planCode === p.code).length,
          };
        }
        return item;
      });
    }),
    findUnique: vi.fn(async ({ where, include }: any) => {
      let plan = inMemoryDb.paymentPlans.find((p) => (where.id ? p.id === where.id : p.code === where.code));
      if (!plan) return null;
      const res: any = { ...plan };
      if (include?._count?.select?.paymentRequests) {
        res._count = {
          paymentRequests: inMemoryDb.paymentRequests.filter((pr) => pr.planId === plan.id || pr.planCode === plan.code).length,
        };
      }
      return res;
    }),
    create: vi.fn(async ({ data }: any) => {
      const record = {
        id: data.id || crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        currency: 'BDT',
        maxInstallations: 1,
        sortOrder: 0,
        isActive: true,
        ...data,
      };
      inMemoryDb.paymentPlans.push(record);
      return record;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const index = inMemoryDb.paymentPlans.findIndex((p) => (where.id ? p.id === where.id : p.code === where.code));
      if (index === -1) throw new Error('PaymentPlan not found');
      inMemoryDb.paymentPlans[index] = { ...inMemoryDb.paymentPlans[index], ...data, updatedAt: new Date() };
      return inMemoryDb.paymentPlans[index];
    }),
    delete: vi.fn(async ({ where }: any) => {
      const index = inMemoryDb.paymentPlans.findIndex((p) => (where.id ? p.id === where.id : p.code === where.code));
      if (index === -1) throw new Error('PaymentPlan not found');
      const deleted = inMemoryDb.paymentPlans.splice(index, 1)[0];
      return deleted;
    }),
    createMany: vi.fn(async ({ data }: any) => {
      inMemoryDb.paymentPlans.push(...data);
      return { count: data.length };
    }),
  },
  paymentSettings: {
    findUnique: vi.fn(async () => inMemoryDb.paymentSettings),
    create: vi.fn(async ({ data }: any) => {
      inMemoryDb.paymentSettings = { ...data, updatedAt: new Date() };
      return inMemoryDb.paymentSettings;
    }),
    upsert: vi.fn(async ({ update, create }: any) => {
      inMemoryDb.paymentSettings = { ...inMemoryDb.paymentSettings, ...update, updatedAt: new Date() };
      return inMemoryDb.paymentSettings;
    }),
  },
  paymentRequest: {
    findUnique: vi.fn(async ({ where, include }: any) => {
      let req: any = null;
      if (where.id) req = inMemoryDb.paymentRequests.find((p) => p.id === where.id);
      if (where.transactionId) req = inMemoryDb.paymentRequests.find((p) => p.transactionId === where.transactionId);
      if (!req) return null;
      const res = { ...req };
      if (include?.license) {
        res.license = inMemoryDb.licenses.find((l) => l.id === req.licenseId) || null;
      }
      if (include?.plan) {
        res.plan = inMemoryDb.paymentPlans.find((p) => (req.planId ? p.id === req.planId : p.code === req.planCode)) || null;
      }
      return res;
    }),
    findMany: vi.fn(async ({ where, skip = 0, take = 50, include }: any) => {
      let list = [...inMemoryDb.paymentRequests];
      if (where?.status) list = list.filter((p) => p.status === where.status);
      return list.slice(skip, skip + take).map((req) => {
        const res = { ...req };
        if (include?.license) {
          res.license = inMemoryDb.licenses.find((l) => l.id === req.licenseId) || null;
        }
        if (include?.plan) {
          res.plan = inMemoryDb.paymentPlans.find((p) => (req.planId ? p.id === req.planId : p.code === req.planCode)) || null;
        }
        return res;
      });
    }),
    count: vi.fn(async ({ where }: any = {}) => {
      let list = [...inMemoryDb.paymentRequests];
      if (where?.status) list = list.filter((p) => p.status === where.status);
      return list.length;
    }),
    create: vi.fn(async ({ data }: any) => {
      const record = { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data };
      inMemoryDb.paymentRequests.push(record);
      return record;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const index = inMemoryDb.paymentRequests.findIndex((p) => p.id === where.id);
      if (index === -1) throw new Error('PaymentRequest not found');
      inMemoryDb.paymentRequests[index] = { ...inMemoryDb.paymentRequests[index], ...data, updatedAt: new Date() };
      return inMemoryDb.paymentRequests[index];
    }),
  },
  auditLog: {
    create: vi.fn(async ({ data }: any) => {
      const record = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
      inMemoryDb.auditLogs.push(record);
      return record;
    }),
    findMany: vi.fn(async () => inMemoryDb.auditLogs),
    count: vi.fn(async () => inMemoryDb.auditLogs.length),
  },
  $transaction: vi.fn(async (cb: any, _options?: any) => {
    if (typeof cb === 'function') {
      return cb(mockPrisma);
    }
    return Promise.all(cb);
  }),
};
