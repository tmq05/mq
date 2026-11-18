import { prisma } from '../config/prisma.js';

export interface CreateAuditLogParams {
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetTitle?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  async log(params: CreateAuditLogParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: params.userId,
          userEmail: params.userEmail,
          userName: params.userName,
          action: params.action,
          targetType: params.targetType,
          targetId: params.targetId,
          targetTitle: params.targetTitle,
          details: params.details,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (err) {
      console.error('Failed to create audit log:', err);
      return null;
    }
  }

  async getLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.action && params.action !== 'all') {
      where.action = params.action;
    }

    if (params.search && params.search.trim()) {
      const term = params.search.trim();
      where.OR = [
        { userName: { contains: term, mode: 'insensitive' } },
        { userEmail: { contains: term, mode: 'insensitive' } },
        { targetTitle: { contains: term, mode: 'insensitive' } },
        { action: { contains: term, mode: 'insensitive' } },
        { details: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      logs,
      total,
      page,
      limit,
      totalPages,
      pagination: { total, page, limit, totalPages },
    };
  }

  async exportCsv(params: { action?: string; search?: string } = {}) {
    const where: any = {};
    if (params.action && params.action !== 'all') {
      where.action = params.action;
    }
    if (params.search && params.search.trim()) {
      const term = params.search.trim();
      where.OR = [
        { userName: { contains: term, mode: 'insensitive' } },
        { userEmail: { contains: term, mode: 'insensitive' } },
        { targetTitle: { contains: term, mode: 'insensitive' } },
        { action: { contains: term, mode: 'insensitive' } },
        { details: { contains: term, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // Generate CSV string
    const headers = ['ID', 'Thời gian', 'Người thực hiện', 'Email', 'Hành động', 'Mục tiêu', 'Chi tiết', 'IP'];
    const rows = logs.map((l) => [
      l.id,
      new Date(l.createdAt).toLocaleString('vi-VN'),
      `"${(l.userName || 'Hệ thống').replace(/"/g, '""')}"`,
      `"${(l.userEmail || '').replace(/"/g, '""')}"`,
      l.action,
      `"${(l.targetTitle || l.targetType || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.ipAddress || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return csvContent;
  }
}

export const auditService = new AuditService();
