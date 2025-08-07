// src/repositories/SupportAgentRepository.ts
import { SupportAgent, SupportAgentStatus, SupportDepartment, SupportSkillLevel, Prisma } from '@prisma/client';
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

export interface AgentFilters {
  department?: SupportDepartment[];
  status?: SupportAgentStatus[];
  skillLevel?: SupportSkillLevel[];
  specializations?: string[];
  languages?: string[];
  isActive?: boolean;
  search?: string;
}

export interface AgentWithDetails extends SupportAgent {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phoneNumber: string;
  };
  assignedTickets: Array<{
    id: string;
    ticketNumber: string;
    subject: string;
    priority: string;
    status: string;
    createdAt: Date;
  }>;
  performanceReports: Array<{
    id: string;
    periodType: string;
    ticketsResolved: number;
    averageResponseTime: number | null;
    customerSatisfactionAvg: number | null;
    createdAt: Date;
  }>;
}

export class SupportAgentRepository extends BaseRepository<SupportAgent, any, any> {
  constructor() {
    super(new (require('@prisma/client')).PrismaClient(), 'supportAgent');
  }
  async create(data: {
    userId: string;
    agentNumber: string;
    department: SupportDepartment;
    specializations: string[];
    languages: string[];
    skillLevel: SupportSkillLevel;
    maxConcurrentTickets?: number;
    workingHours: any;
    timeZone?: string;
  }): Promise<SupportAgent> {
    return this.prisma.supportAgent.create({
      data: {
        ...data,
        status: SupportAgentStatus.OFFLINE,
        currentTicketCount: 0,
        totalTicketsResolved: 0,
        isActive: true,
      },
    });
  }

  async findById(id: string): Promise<AgentWithDetails | null> {
    return this.prisma.supportAgent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        assignedTickets: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            priority: true,
            status: true,
            createdAt: true,
          },
          where: {
            status: {
              in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_INTERNAL'],
            },
          },
          orderBy: {
            priority: 'desc',
          },
        },
        performanceReports: {
          select: {
            id: true,
            periodType: true,
            ticketsResolved: true,
            averageResponseTime: true,
            customerSatisfactionAvg: true,
            createdAt: true,
          },
          take: 5,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    }) as unknown as Promise<AgentWithDetails | null>;
  }

  async findByUserId(userId: string): Promise<AgentWithDetails | null> {
    return this.prisma.supportAgent.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        assignedTickets: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            priority: true,
            status: true,
            createdAt: true,
          },
          where: {
            status: {
              in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_INTERNAL'],
            },
          },
          orderBy: {
            priority: 'desc',
          },
        },
        performanceReports: {
          select: {
            id: true,
            periodType: true,
            ticketsResolved: true,
            averageResponseTime: true,
            customerSatisfactionAvg: true,
            createdAt: true,
          },
          take: 5,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    }) as unknown as Promise<AgentWithDetails | null>;
  }

  async findByAgentNumber(agentNumber: string): Promise<AgentWithDetails | null> {
    return this.prisma.supportAgent.findUnique({
      where: { agentNumber },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        assignedTickets: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            priority: true,
            status: true,
            createdAt: true,
          },
          where: {
            status: {
              in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_INTERNAL'],
            },
          },
          orderBy: {
            priority: 'desc',
          },
        },
        performanceReports: {
          select: {
            id: true,
            periodType: true,
            ticketsResolved: true,
            averageResponseTime: true,
            customerSatisfactionAvg: true,
            createdAt: true,
          },
          take: 5,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    }) as unknown as Promise<AgentWithDetails | null>;
  }

  async findManyAgents(
    filters: AgentFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<AgentWithDetails>> {
    const where: Prisma.SupportAgentWhereInput = {};

    // Apply filters
    if (filters.department?.length) {
      where.department = { in: filters.department };
    }

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.skillLevel?.length) {
      where.skillLevel = { in: filters.skillLevel };
    }

    if (typeof filters.isActive === 'boolean') {
      where.isActive = filters.isActive;
    }

    // Note: Specializations and languages filtering disabled due to JSON field complexity
    // if (filters.specializations?.length) {
    //   where.specializations = {
    //     hasEvery: filters.specializations,
    //   };
    // }
    //
    // if (filters.languages?.length) {
    //   where.languages = {
    //     hasEvery: filters.languages,
    //   };
    // }

    if (filters.search) {
      where.OR = [
        { agentNumber: { contains: filters.search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [items, total] = await Promise.all([
      this.prisma.supportAgent.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          assignedTickets: {
            select: {
              id: true,
              ticketNumber: true,
              subject: true,
              priority: true,
              status: true,
              createdAt: true,
            },
            where: {
              status: {
                in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_INTERNAL'],
              },
            },
            take: 5,
            orderBy: {
              priority: 'desc',
            },
          },
          performanceReports: {
            select: {
              id: true,
              periodType: true,
              ticketsResolved: true,
              averageResponseTime: true,
              customerSatisfactionAvg: true,
              createdAt: true,
            },
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        skip,
        take: pagination.limit,
        orderBy: [
          { isActive: 'desc' },
          { status: 'asc' },
          { user: { firstName: 'asc' } },
        ],
      }) as unknown as Promise<AgentWithDetails[]>,
      this.prisma.supportAgent.count({ where }),
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

  async updateStatus(id: string, status: SupportAgentStatus): Promise<SupportAgent> {
    const updateData: any = {
      status,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    };

    return this.prisma.supportAgent.update({
      where: { id },
      data: updateData,
    });
  }

  async updateWorkingHours(id: string, workingHours: any): Promise<SupportAgent> {
    return this.prisma.supportAgent.update({
      where: { id },
      data: {
        workingHours,
        updatedAt: new Date(),
      },
    });
  }

  async updateSpecializations(id: string, specializations: string[]): Promise<SupportAgent> {
    return this.prisma.supportAgent.update({
      where: { id },
      data: {
        specializations,
        updatedAt: new Date(),
      },
    });
  }

  async updateLanguages(id: string, languages: string[]): Promise<SupportAgent> {
    return this.prisma.supportAgent.update({
      where: { id },
      data: {
        languages,
        updatedAt: new Date(),
      },
    });
  }

  async incrementTicketCount(id: string): Promise<SupportAgent> {
    return this.prisma.supportAgent.update({
      where: { id },
      data: {
        currentTicketCount: {
          increment: 1,
        },
        updatedAt: new Date(),
      },
    });
  }

  async decrementTicketCount(id: string): Promise<SupportAgent> {
    return this.prisma.supportAgent.update({
      where: { id },
      data: {
        currentTicketCount: {
          decrement: 1,
        },
        updatedAt: new Date(),
      },
    });
  }

  async updatePerformanceMetrics(
    id: string,
    metrics: {
      totalTicketsResolved?: number;
      averageResolutionTime?: number;
      averageResponseTime?: number;
      customerSatisfactionRate?: number;
      performanceRating?: number;
    }
  ): Promise<SupportAgent> {
    return this.prisma.supportAgent.update({
      where: { id },
      data: {
        ...metrics,
        updatedAt: new Date(),
      },
    });
  }

  async getAvailableAgents(
    department?: SupportDepartment,
    skillLevel?: SupportSkillLevel,
    specialization?: string
  ): Promise<AgentWithDetails[]> {
    const where: any = {
      isActive: true,
      status: {
        in: [SupportAgentStatus.AVAILABLE, SupportAgentStatus.AWAY],
      },
    };

    if (department) {
      where.department = department;
    }

    if (skillLevel) {
      where.skillLevel = skillLevel;
    }

    // Note: Specialization filtering disabled due to JSON field complexity
    // if (specialization) {
    //   where.specializations = {
    //     has: specialization,
    //   };
    // }

    return this.prisma.supportAgent.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        assignedTickets: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            priority: true,
            status: true,
            createdAt: true,
          },
          where: {
            status: {
              in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_INTERNAL'],
            },
          },
        },
        performanceReports: {
          select: {
            id: true,
            periodType: true,
            ticketsResolved: true,
            averageResponseTime: true,
            customerSatisfactionAvg: true,
            createdAt: true,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: [
        { currentTicketCount: 'asc' },
        { performanceRating: 'desc' },
      ],
    }) as unknown as Promise<AgentWithDetails[]>;
  }

  async getBestAgentForCategory(
    category: string,
    priority: string
  ): Promise<AgentWithDetails | null> {
    const agents = await this.prisma.supportAgent.findMany({
      where: {
        isActive: true,
        status: {
          in: [SupportAgentStatus.AVAILABLE, SupportAgentStatus.AWAY],
        },
        // Note: Specializations filtering disabled due to JSON field complexity
        // specializations: {
        //   has: category,
        // },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        assignedTickets: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            priority: true,
            status: true,
            createdAt: true,
          },
          where: {
            status: {
              in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_INTERNAL'],
            },
          },
        },
        performanceReports: {
          select: {
            id: true,
            periodType: true,
            ticketsResolved: true,
            averageResponseTime: true,
            customerSatisfactionAvg: true,
            createdAt: true,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: [
        { currentTicketCount: 'asc' },
        { performanceRating: 'desc' },
      ],
      take: 1,
    });

    return agents.length > 0 ? (agents[0] as unknown as AgentWithDetails) : null;
  }

  async getAgentStats(): Promise<{
    total: number;
    active: number;
    available: number;
    busy: number;
    offline: number;
    averageTicketLoad: number;
  }> {
    const [total, active, available, busy, offline, ticketCount] = await Promise.all([
      this.prisma.supportAgent.count(),
      this.prisma.supportAgent.count({ where: { isActive: true } }),
      this.prisma.supportAgent.count({ where: { status: SupportAgentStatus.AVAILABLE } }),
      this.prisma.supportAgent.count({ where: { status: SupportAgentStatus.BUSY } }),
      this.prisma.supportAgent.count({ where: { status: SupportAgentStatus.OFFLINE } }),
      this.prisma.supportAgent.aggregate({
        _avg: {
          currentTicketCount: true,
        },
        where: {
          isActive: true,
        },
      }),
    ]);

    return {
      total,
      active,
      available,
      busy,
      offline,
      averageTicketLoad: ticketCount._avg.currentTicketCount || 0,
    };
  }

  async deactivateAgent(id: string): Promise<SupportAgent> {
    return this.prisma.supportAgent.update({
      where: { id },
      data: {
        isActive: false,
        status: SupportAgentStatus.OFFLINE,
        updatedAt: new Date(),
      },
    });
  }

  async activateAgent(id: string): Promise<SupportAgent> {
    return this.prisma.supportAgent.update({
      where: { id },
      data: {
        isActive: true,
        status: SupportAgentStatus.AVAILABLE,
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}