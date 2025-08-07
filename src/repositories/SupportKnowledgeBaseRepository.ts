// src/repositories/SupportKnowledgeBaseRepository.ts
import { 
  SupportKnowledgeBase, 
  SupportTicketCategory, 
  SupportLanguage,
  KnowledgeBaseStatus,
  Prisma 
} from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import { PaginationMeta } from '../types';

interface PaginationOptions {
  page: number;
  limit: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface KnowledgeBaseFilters {
  category?: SupportTicketCategory[];
  language?: SupportLanguage[];
  status?: KnowledgeBaseStatus[];
  isPublic?: boolean;
  isFeatured?: boolean;
  authorId?: string;
  search?: string;
  tags?: string[];
}

export interface KnowledgeBaseWithDetails extends SupportKnowledgeBase {
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  updater?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
}

export class SupportKnowledgeBaseRepository extends BaseRepository<SupportKnowledgeBase, any, any> {
  constructor() {
    super(new (require('@prisma/client')).PrismaClient(), 'supportKnowledgeBase');
  }
  async create(data: {
    title: string;
    slug: string;
    content: string;
    summary?: string;
    category: SupportTicketCategory;
    subcategory?: string;
    tags?: string[];
    language: SupportLanguage;
    status?: KnowledgeBaseStatus;
    isPublic?: boolean;
    isFeatured?: boolean;
    authorId: string;
    searchKeywords?: string;
    relatedArticles?: string[];
    attachments?: string[];
    metadata?: any;
  }): Promise<SupportKnowledgeBase> {
    return this.prisma.supportKnowledgeBase.create({
      data: {
        ...data,
        viewCount: 0,
        helpfulVotes: 0,
        unhelpfulVotes: 0,
      },
    });
  }

  async findById(id: string): Promise<KnowledgeBaseWithDetails | null> {
    return this.prisma.supportKnowledgeBase.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        updater: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }) as Promise<KnowledgeBaseWithDetails | null>;
  }

  async findBySlug(slug: string): Promise<KnowledgeBaseWithDetails | null> {
    return this.prisma.supportKnowledgeBase.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        updater: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }) as Promise<KnowledgeBaseWithDetails | null>;
  }

  async findManyKnowledgeBase(
    filters: KnowledgeBaseFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<KnowledgeBaseWithDetails>> {
    const where: Prisma.SupportKnowledgeBaseWhereInput = {};

    // Apply filters
    if (filters.category?.length) {
      where.category = { in: filters.category };
    }

    if (filters.language?.length) {
      where.language = { in: filters.language };
    }

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (typeof filters.isPublic === 'boolean') {
      where.isPublic = filters.isPublic;
    }

    if (typeof filters.isFeatured === 'boolean') {
      where.isFeatured = filters.isFeatured;
    }

    if (filters.authorId) {
      where.authorId = filters.authorId;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
        { summary: { contains: filters.search, mode: 'insensitive' } },
        { searchKeywords: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Note: Tags filtering disabled due to JSON field complexity
    // if (filters.tags?.length) {
    //   where.tags = {
    //     hasSome: filters.tags,
    //   };
    // }

    const skip = (pagination.page - 1) * pagination.limit;

    const [items, total] = await Promise.all([
      this.prisma.supportKnowledgeBase.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          updater: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        skip,
        take: pagination.limit,
        orderBy: [
          { isFeatured: 'desc' },
          { viewCount: 'desc' },
          { updatedAt: 'desc' },
        ],
      }) as Promise<KnowledgeBaseWithDetails[]>,
      this.prisma.supportKnowledgeBase.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        currentPage: pagination.page,
        totalPages: Math.ceil(total / pagination.limit),
        totalItems: total,
        itemsPerPage: pagination.limit,
        hasNextPage: pagination.page < Math.ceil(total / pagination.limit),
        hasPreviousPage: pagination.page > 1,
      }
    };
  }

  async update(
    id: string,
    data: {
      title?: string;
      slug?: string;
      content?: string;
      summary?: string;
      category?: SupportTicketCategory;
      subcategory?: string;
      tags?: string[];
      language?: SupportLanguage;
      status?: KnowledgeBaseStatus;
      isPublic?: boolean;
      isFeatured?: boolean;
      lastUpdatedBy?: string;
      searchKeywords?: string;
      relatedArticles?: string[];
      attachments?: string[];
      metadata?: any;
    }
  ): Promise<SupportKnowledgeBase> {
    const updateData: any = { ...data };

    if (data.status === KnowledgeBaseStatus.PUBLISHED && !updateData.publishedAt) {
      updateData.publishedAt = new Date();
    }

    return this.prisma.supportKnowledgeBase.update({
      where: { id },
      data: updateData,
    });
  }

  async publish(id: string, publishedBy: string): Promise<SupportKnowledgeBase> {
    return this.prisma.supportKnowledgeBase.update({
      where: { id },
      data: {
        status: KnowledgeBaseStatus.PUBLISHED,
        publishedAt: new Date(),
        lastUpdatedBy: publishedBy,
      },
    });
  }

  async archive(id: string, archivedBy: string): Promise<SupportKnowledgeBase> {
    return this.prisma.supportKnowledgeBase.update({
      where: { id },
      data: {
        status: KnowledgeBaseStatus.ARCHIVED,
        lastUpdatedBy: archivedBy,
      },
    });
  }

  async incrementViewCount(id: string): Promise<SupportKnowledgeBase> {
    return this.prisma.supportKnowledgeBase.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  }

  async voteHelpful(id: string): Promise<SupportKnowledgeBase> {
    return this.prisma.supportKnowledgeBase.update({
      where: { id },
      data: {
        helpfulVotes: {
          increment: 1,
        },
      },
    });
  }

  async voteUnhelpful(id: string): Promise<SupportKnowledgeBase> {
    return this.prisma.supportKnowledgeBase.update({
      where: { id },
      data: {
        unhelpfulVotes: {
          increment: 1,
        },
      },
    });
  }

  async searchKnowledgeBase(
    query: string,
    filters: Omit<KnowledgeBaseFilters, 'search'> = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PaginatedResult<KnowledgeBaseWithDetails>> {
    const where: Prisma.SupportKnowledgeBaseWhereInput = {
      status: KnowledgeBaseStatus.PUBLISHED,
      isPublic: true,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { summary: { contains: query, mode: 'insensitive' } },
        { searchKeywords: { contains: query, mode: 'insensitive' } },
      ],
    };

    // Apply additional filters
    if (filters.category?.length) {
      where.category = { in: filters.category };
    }

    if (filters.language?.length) {
      where.language = { in: filters.language };
    }

    // Note: Tags filtering disabled due to JSON field complexity
    // if (filters.tags?.length) {
    //   where.tags = {
    //     hasSome: filters.tags,
    //   };
    // }

    const skip = (pagination.page - 1) * pagination.limit;

    const [items, total] = await Promise.all([
      this.prisma.supportKnowledgeBase.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          updater: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        skip,
        take: pagination.limit,
        orderBy: [
          { isFeatured: 'desc' },
          { viewCount: 'desc' },
          // Text relevance could be added with full-text search
        ],
      }) as Promise<KnowledgeBaseWithDetails[]>,
      this.prisma.supportKnowledgeBase.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        currentPage: pagination.page,
        totalPages: Math.ceil(total / pagination.limit),
        totalItems: total,
        itemsPerPage: pagination.limit,
        hasNextPage: pagination.page < Math.ceil(total / pagination.limit),
        hasPreviousPage: pagination.page > 1,
      }
    };
  }

  async getFeatured(
    category?: SupportTicketCategory,
    language?: SupportLanguage,
    limit = 5
  ): Promise<KnowledgeBaseWithDetails[]> {
    const where: any = {
      isFeatured: true,
      status: KnowledgeBaseStatus.PUBLISHED,
      isPublic: true,
    };

    if (category) {
      where.category = category;
    }

    if (language) {
      where.language = language;
    }

    return this.prisma.supportKnowledgeBase.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        updater: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      take: limit,
      orderBy: {
        viewCount: 'desc',
      },
    }) as Promise<KnowledgeBaseWithDetails[]>;
  }

  async getPopular(
    category?: SupportTicketCategory,
    language?: SupportLanguage,
    limit = 10
  ): Promise<KnowledgeBaseWithDetails[]> {
    const where: any = {
      status: KnowledgeBaseStatus.PUBLISHED,
      isPublic: true,
    };

    if (category) {
      where.category = category;
    }

    if (language) {
      where.language = language;
    }

    return this.prisma.supportKnowledgeBase.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        updater: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      take: limit,
      orderBy: {
        viewCount: 'desc',
      },
    }) as Promise<KnowledgeBaseWithDetails[]>;
  }

  async getRelated(id: string, limit = 5): Promise<KnowledgeBaseWithDetails[]> {
    const article = await this.prisma.supportKnowledgeBase.findUnique({
      where: { id },
      select: {
        category: true,
        tags: true,
        relatedArticles: true,
      },
    });

    if (!article) {
      return [];
    }

    // Get explicitly related articles first
    const relatedIds = (article.relatedArticles as string[]) || [];
    
    if (relatedIds.length > 0) {
      const explicitRelated = await this.prisma.supportKnowledgeBase.findMany({
        where: {
          id: { in: relatedIds },
          status: KnowledgeBaseStatus.PUBLISHED,
          isPublic: true,
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          updater: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        take: limit,
      }) as KnowledgeBaseWithDetails[];

      if (explicitRelated.length >= limit) {
        return explicitRelated;
      }
    }

    // If not enough explicit relations, find by category and tags
    const remaining = limit - (relatedIds.length || 0);
    const similarArticles = await this.prisma.supportKnowledgeBase.findMany({
      where: {
        id: { not: id, notIn: relatedIds },
        category: article.category,
        status: KnowledgeBaseStatus.PUBLISHED,
        isPublic: true,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        updater: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      take: remaining,
      orderBy: {
        viewCount: 'desc',
      },
    }) as KnowledgeBaseWithDetails[];

    return [...(relatedIds.length > 0 ? await this.prisma.supportKnowledgeBase.findMany({
      where: { id: { in: relatedIds } },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
        updater: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }) as KnowledgeBaseWithDetails[] : []), ...similarArticles];
  }

  async getStats(): Promise<{
    total: number;
    published: number;
    draft: number;
    archived: number;
    totalViews: number;
    totalVotes: number;
    byCategory: Record<string, number>;
    byLanguage: Record<string, number>;
  }> {
    const [
      total,
      published,
      draft,
      archived,
      totalViews,
      totalVotes,
      byCategory,
      byLanguage,
    ] = await Promise.all([
      this.prisma.supportKnowledgeBase.count(),
      this.prisma.supportKnowledgeBase.count({
        where: { status: KnowledgeBaseStatus.PUBLISHED },
      }),
      this.prisma.supportKnowledgeBase.count({
        where: { status: KnowledgeBaseStatus.DRAFT },
      }),
      this.prisma.supportKnowledgeBase.count({
        where: { status: KnowledgeBaseStatus.ARCHIVED },
      }),
      this.prisma.supportKnowledgeBase.aggregate({
        _sum: { viewCount: true },
      }),
      this.prisma.supportKnowledgeBase.aggregate({
        _sum: { helpfulVotes: true, unhelpfulVotes: true },
      }),
      this.prisma.supportKnowledgeBase.groupBy({
        by: ['category'],
        _count: true,
      }),
      this.prisma.supportKnowledgeBase.groupBy({
        by: ['language'],
        _count: true,
      }),
    ]);

    const categoryStats = byCategory.reduce((acc, item) => {
      acc[item.category] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const languageStats = byLanguage.reduce((acc, item) => {
      acc[item.language] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      published,
      draft,
      archived,
      totalViews: totalViews._sum.viewCount || 0,
      totalVotes: (totalVotes._sum.helpfulVotes || 0) + (totalVotes._sum.unhelpfulVotes || 0),
      byCategory: categoryStats,
      byLanguage: languageStats,
    };
  }

  async deleteKnowledgeBase(id: string): Promise<void> {
    await this.prisma.supportKnowledgeBase.delete({
      where: { id },
    });
  }
}