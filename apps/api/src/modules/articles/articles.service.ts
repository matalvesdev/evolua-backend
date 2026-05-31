import { prisma } from '../../lib/prisma.js';

export interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  image: string | null;
  date: string;
  readTime: string;
}

export interface PaginatedArticles {
  data: Article[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export class ArticlesService {
  async list(page: number, pageSize: number): Promise<PaginatedArticles> {
    const where = { type: 'article', deletedAt: null };

    const total = await prisma.therapeuticMaterial.count({ where });
    const data = await prisma.therapeuticMaterial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      data: data.map((m) => ({
        id: m.id,
        title: m.title,
        excerpt: m.description,
        category: m.area,
        image: m.fileUrl,
        date: m.createdAt.toISOString(),
        readTime: '5 min',
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }
}

export const articlesService = new ArticlesService();
