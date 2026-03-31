import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateLeadDto,
  UpdateLeadDto,
  SearchLeadsDto,
  CreateFollowUpDto,
  CreateContentPostDto,
  UpdateContentPostDto,
  SearchContentPostsDto,
} from './dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Leads
  // ─────────────────────────────────────────────────────────────────────────

  async createLead(clinicId: string, dto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        clinicId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        source: dto.source,
        status: dto.status ?? 'new',
        potential: dto.potential ?? 'medium',
        notes: dto.notes,
        interests: dto.interests ?? [],
      },
    });
  }

  async findAllLeads(clinicId: string, query: SearchLeadsDto) {
    const where: Prisma.LeadWhereInput = { clinicId };

    if (query.status) where.status = query.status;
    if (query.potential) where.potential = query.potential;
    if (query.source) where.source = query.source;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    const [leads, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { followUps: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return new PaginatedResponseDto(leads, total, query.page ?? 1, query.limit ?? 20);
  }

  async findOneLead(id: string, clinicId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, clinicId },
      include: { followUps: { orderBy: { createdAt: 'desc' } } },
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }

  async updateLead(id: string, clinicId: string, dto: UpdateLeadDto) {
    await this.findOneLead(id, clinicId);

    return this.prisma.lead.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.source && { source: dto.source }),
        ...(dto.status && {
          status: dto.status,
          ...(dto.status === 'contacted' && { lastContactAt: new Date() }),
          ...(dto.status === 'converted' && { convertedAt: new Date() }),
        }),
        ...(dto.potential && { potential: dto.potential }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.interests && { interests: dto.interests }),
      },
    });
  }

  async removeLead(id: string, clinicId: string): Promise<void> {
    await this.findOneLead(id, clinicId);
    await this.prisma.lead.delete({ where: { id } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Follow-ups
  // ─────────────────────────────────────────────────────────────────────────

  async createFollowUp(leadId: string, clinicId: string, dto: CreateFollowUpDto) {
    await this.findOneLead(leadId, clinicId);

    const [followUp] = await this.prisma.$transaction([
      this.prisma.leadFollowUp.create({
        data: { leadId, channel: dto.channel, notes: dto.notes },
      }),
      this.prisma.lead.update({
        where: { id: leadId },
        data: { lastContactAt: new Date() },
      }),
    ]);

    return followUp;
  }

  async findFollowUps(leadId: string, clinicId: string) {
    await this.findOneLead(leadId, clinicId);
    return this.prisma.leadFollowUp.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Content Posts
  // ─────────────────────────────────────────────────────────────────────────

  async createContentPost(clinicId: string, dto: CreateContentPostDto) {
    return this.prisma.contentPost.create({
      data: {
        clinicId,
        platform: dto.platform,
        format: dto.format,
        title: dto.title,
        hook: dto.hook,
        script: dto.script,
        cta: dto.cta,
        status: dto.status ?? 'draft',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  async findAllContentPosts(clinicId: string, query: SearchContentPostsDto) {
    const where: Prisma.ContentPostWhereInput = { clinicId };

    if (query.status) where.status = query.status;
    if (query.platform) where.platform = query.platform;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { hook: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.contentPost.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contentPost.count({ where }),
    ]);

    return new PaginatedResponseDto(posts, total, query.page ?? 1, query.limit ?? 20);
  }

  async findOneContentPost(id: string, clinicId: string) {
    const post = await this.prisma.contentPost.findFirst({ where: { id, clinicId } });
    if (!post) throw new NotFoundException('Conteúdo não encontrado');
    return post;
  }

  async updateContentPost(id: string, clinicId: string, dto: UpdateContentPostDto) {
    await this.findOneContentPost(id, clinicId);

    return this.prisma.contentPost.update({
      where: { id },
      data: {
        ...(dto.platform && { platform: dto.platform }),
        ...(dto.format && { format: dto.format }),
        ...(dto.title && { title: dto.title }),
        ...(dto.hook && { hook: dto.hook }),
        ...(dto.script !== undefined && { script: dto.script }),
        ...(dto.cta !== undefined && { cta: dto.cta }),
        ...(dto.status && { status: dto.status }),
        ...(dto.scheduledAt !== undefined && {
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        }),
        ...(dto.publishedAt !== undefined && {
          publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
        }),
        ...(dto.views !== undefined && { views: dto.views }),
        ...(dto.engagement !== undefined && { engagement: dto.engagement }),
        ...(dto.clicks !== undefined && { clicks: dto.clicks }),
        ...(dto.leadsCount !== undefined && { leadsCount: dto.leadsCount }),
      },
    });
  }

  async removeContentPost(id: string, clinicId: string): Promise<void> {
    await this.findOneContentPost(id, clinicId);
    await this.prisma.contentPost.delete({ where: { id } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Analytics
  // ─────────────────────────────────────────────────────────────────────────

  async getAnalytics(clinicId: string) {
    const [
      totalLeads,
      convertedLeads,
      leads,
      totalPosts,
      posts,
      topPosts,
    ] = await this.prisma.$transaction([
      this.prisma.lead.count({ where: { clinicId } }),
      this.prisma.lead.count({ where: { clinicId, status: 'converted' } }),
      this.prisma.lead.findMany({ where: { clinicId }, select: { status: true, source: true, potential: true } }),
      this.prisma.contentPost.count({ where: { clinicId } }),
      this.prisma.contentPost.findMany({ where: { clinicId }, select: { status: true, platform: true, views: true, engagement: true, clicks: true, leadsCount: true } }),
      this.prisma.contentPost.findMany({
        where: { clinicId, status: 'published' },
        orderBy: { views: 'desc' },
        take: 5,
        select: { id: true, title: true, platform: true, views: true, engagement: true, clicks: true, leadsCount: true },
      }),
    ]);

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const tally = <T extends object>(arr: T[], key: keyof T): Record<string, number> =>
      arr.reduce<Record<string, number>>((acc, item) => {
        const val = String(item[key] ?? 'unknown');
        acc[val] = (acc[val] ?? 0) + 1;
        return acc;
      }, {});

    const platformStats = posts.reduce<Record<string, { posts: number; views: number; engagement: number; clicks: number; leads: number }>>(
      (acc, p) => {
        const pl = p.platform;
        if (!acc[pl]) acc[pl] = { posts: 0, views: 0, engagement: 0, clicks: 0, leads: 0 };
        acc[pl].posts += 1;
        acc[pl].views += p.views;
        acc[pl].engagement += p.engagement;
        acc[pl].clicks += p.clicks;
        acc[pl].leads += p.leadsCount;
        return acc;
      },
      {},
    );

    return {
      leads: {
        total: totalLeads,
        conversionRate: Math.round(conversionRate * 100) / 100,
        byStatus: tally(leads, 'status'),
        bySource: tally(leads, 'source'),
        byPotential: tally(leads, 'potential'),
      },
      content: {
        total: totalPosts,
        byStatus: tally(posts, 'status'),
        byPlatform: Object.entries(platformStats).map(([platform, stats]) => ({ platform, ...stats })),
        topPosts,
      },
    };
  }
}
