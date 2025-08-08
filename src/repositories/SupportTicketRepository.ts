// src/repositories/SupportTicketRepository.ts
import { SupportTicket, SupportTicketStatus, SupportTicketPriority, SupportTicketCategory, Prisma, PrismaClient } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

// Local type definitions
interface PaginationOptions {
  page: number;
  limit: number;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface TicketFilters {
  status?: SupportTicketStatus[];
  priority?: SupportTicketPriority[];
  category?: SupportTicketCategory[];
  assignedAgentId?: string;
  customerId?: string;
  source?: string[];
  language?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  slaBreached?: boolean;
  isArchived?: boolean;
  search?: string;
  tags?: string[];
}

export interface TicketWithDetails extends SupportTicket {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phoneNumber: string;
  };
  assignedAgent?: {
    id: string;
    agentNumber: string;
    user: {
      firstName: string;
      lastName: string;
    };
    department: string;
  } | null;
  order?: {
    id: string;
    orderNumber: string;
  } | null;
  returnRequest?: {
    id: string;
    returnNumber: string;
  } | null;
  messages: Array<{
    id: string;
    content: string;
    direction: string;
    isInternal: boolean;
    createdAt: Date;
  }>;
  nigerianFeatures?: {
    stateRegion: string | null;
    customerLanguage: string | null;
    paymentChannel: string | null;
  } | null;
}

export class SupportTicketRepository extends BaseRepository<SupportTicket, any, any> {
  protected db: PrismaClient;

  constructor(prisma?: PrismaClient) {
    super(prisma || new PrismaClient(), 'supportTicket');
    this.db = this.prisma;
  }
  async create(data: {
    ticketNumber: string;
    subject: string;
    description: string;
    priority: SupportTicketPriority;
    category: SupportTicketCategory;
    subcategory?: string;
    source: string;
    language: string;
    customerId: string;
    orderId?: string;
    returnRequestId?: string;
    tags?: string[];
    metadata?: any;
  }): Promise<SupportTicket> {
    return this.db.supportTicket.create({
      data: {
        ...data,
        status: SupportTicketStatus.OPEN, // Default status
        priority: data.priority,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findById(id: string): Promise<TicketWithDetails | null> {
    return this.db.supportTicket.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            agentNumber: true,
            department: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        returnRequest: {
          select: {
            id: true,
            returnNumber: true,
          },
        },
        messages: {
          select: {
            id: true,
            content: true,
            direction: true,
            isInternal: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        nigerianFeatures: {
          select: {
            stateRegion: true,
            customerLanguage: true,
            paymentChannel: true,
          },
        },
      },
    }) as Promise<TicketWithDetails | null>;
  }

  async findByTicketNumber(ticketNumber: string): Promise<TicketWithDetails | null> {
    return this.db.supportTicket.findUnique({
      where: { ticketNumber },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            agentNumber: true,
            department: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        returnRequest: {
          select: {
            id: true,
            returnNumber: true,
          },
        },
        messages: {
          select: {
            id: true,
            content: true,
            direction: true,
            isInternal: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        nigerianFeatures: {
          select: {
            stateRegion: true,
            customerLanguage: true,
            paymentChannel: true,
          },
        },
      },
    }) as Promise<TicketWithDetails | null>;
  }

  async findManyWithFilters(
    filters: TicketFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<TicketWithDetails>> {
    const where: Prisma.SupportTicketWhereInput = {};

    // Apply filters
    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.priority?.length) {
      where.priority = { in: filters.priority };
    }

    if (filters.category?.length) {
      where.category = { in: filters.category };
    }

    if (filters.assignedAgentId) {
      where.assignedAgentId = filters.assignedAgentId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.source?.length) {
      where.source = { in: filters.source as any };
    }

    if (filters.language?.length) {
      where.language = { in: filters.language as any };
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) {
        where.createdAt.gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        where.createdAt.lte = filters.createdBefore;
      }
    }

    if (typeof filters.slaBreached === 'boolean') {
      where.slaBreached = filters.slaBreached;
    }

    if (typeof filters.isArchived === 'boolean') {
      where.isArchived = filters.isArchived;
    }

    if (filters.search) {
      where.OR = [
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
              { phoneNumber: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (filters.tags?.length) {
      where.tags = {
        hasEvery: filters.tags,
      };
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [items, total] = await Promise.all([
      this.db.supportTicket.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          assignedAgent: {
            select: {
              id: true,
              agentNumber: true,
              department: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
          returnRequest: {
            select: {
              id: true,
              returnNumber: true,
            },
          },
          messages: {
            select: {
              id: true,
              content: true,
              direction: true,
              isInternal: true,
              createdAt: true,
            },
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
          },
          nigerianFeatures: {
            select: {
              stateRegion: true,
              customerLanguage: true,
              paymentChannel: true,
            },
          },
        },
        skip,
        take: pagination.limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      }) as Promise<TicketWithDetails[]>,
      this.db.supportTicket.count({ where }),
    ]);

    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      pages: Math.ceil(total / pagination.limit),
    };
  }

  async updateStatus(id: string, status: SupportTicketStatus, userId?: string): Promise<SupportTicket> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === SupportTicketStatus.RESOLVED) {
      updateData.actualResolution = new Date();
      updateData.resolutionTime = new Date();
    } else if (status === SupportTicketStatus.CLOSED) {
      updateData.closedAt = new Date();
    }

    return this.db.supportTicket.update({
      where: { id },
      data: updateData,
    });
  }

  async assignAgent(id: string, agentId: string, assignedBy: string): Promise<SupportTicket> {
    // Update ticket assignment
    const ticket = await this.db.supportTicket.update({
      where: { id },
      data: {
        assignedAgentId: agentId,
        updatedAt: new Date(),
      },
    });

    // Create assignment record
    await this.db.supportTicketAssignment.create({
      data: {
        ticketId: id,
        agentId,
        assignedBy,
        assignmentType: 'MANUAL',
        reason: 'Manual assignment',
      },
    });

    return ticket;
  }

  async unassignAgent(id: string): Promise<SupportTicket> {
    // Update current assignment to inactive
    await this.db.supportTicketAssignment.updateMany({
      where: {
        ticketId: id,
        isActive: true,
      },
      data: {
        isActive: false,
        unassignedAt: new Date(),
      },
    });

    return this.db.supportTicket.update({
      where: { id },
      data: {
        assignedAgentId: null,
        updatedAt: new Date(),
      },
    });
  }

  async escalate(
    id: string,
    escalationData: {
      fromAgentId?: string;
      toAgentId?: string;
      escalationType: string;
      reason: string;
      priority: SupportTicketPriority;
      urgencyLevel: string;
      notes?: string;
      escalatedBy: string;
    }
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      // Update ticket priority and escalation timestamp
      await tx.supportTicket.update({
        where: { id },
        data: {
          priority: escalationData.priority,
          escalatedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create escalation record
      await tx.supportTicketEscalation.create({
        data: {
          ticketId: id,
          fromAgentId: escalationData.fromAgentId,
          toAgentId: escalationData.toAgentId,
          escalationType: escalationData.escalationType as any,
          reason: escalationData.reason,
          priority: escalationData.priority,
          urgencyLevel: escalationData.urgencyLevel as any,
          notes: escalationData.notes,
          escalatedBy: escalationData.escalatedBy,
        },
      });

      // If escalating to a specific agent, assign the ticket
      if (escalationData.toAgentId) {
        await tx.supportTicket.update({
          where: { id },
          data: {
            assignedAgentId: escalationData.toAgentId,
          },
        });

        await tx.supportTicketAssignment.create({
          data: {
            ticketId: id,
            agentId: escalationData.toAgentId,
            assignedBy: escalationData.escalatedBy,
            assignmentType: 'MANUAL',
            reason: 'Escalation assignment',
          },
        });
      }
    });
  }

  async updateSatisfaction(
    id: string,
    satisfaction: number,
    comment?: string
  ): Promise<SupportTicket> {
    return this.db.supportTicket.update({
      where: { id },
      data: {
        customerSatisfaction: satisfaction,
        satisfactionComment: comment,
        updatedAt: new Date(),
      },
    });
  }

  async archiveTicket(id: string): Promise<SupportTicket> {
    return this.db.supportTicket.update({
      where: { id },
      data: {
        isArchived: true,
        updatedAt: new Date(),
      },
    });
  }

  async getTicketsByCustomer(customerId: string, limit = 10): Promise<TicketWithDetails[]> {
    return this.db.supportTicket.findMany({
      where: {
        customerId,
        isArchived: false,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            agentNumber: true,
            department: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        returnRequest: {
          select: {
            id: true,
            returnNumber: true,
          },
        },
        messages: {
          select: {
            id: true,
            content: true,
            direction: true,
            isInternal: true,
            createdAt: true,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
        nigerianFeatures: {
          select: {
            stateRegion: true,
            customerLanguage: true,
            paymentChannel: true,
          },
        },
      },
      take: limit,
      orderBy: {
        updatedAt: 'desc',
      },
    }) as Promise<TicketWithDetails[]>;
  }

  async getTicketsByAgent(agentId: string, status?: SupportTicketStatus[]): Promise<TicketWithDetails[]> {
    const where: any = { assignedAgentId: agentId };
    
    if (status?.length) {
      where.status = { in: status };
    }

    return this.db.supportTicket.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            agentNumber: true,
            department: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        returnRequest: {
          select: {
            id: true,
            returnNumber: true,
          },
        },
        messages: {
          select: {
            id: true,
            content: true,
            direction: true,
            isInternal: true,
            createdAt: true,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
        nigerianFeatures: {
          select: {
            stateRegion: true,
            customerLanguage: true,
            paymentChannel: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' },
      ],
    }) as Promise<TicketWithDetails[]>;
  }

  async mergeTickets(parentTicketId: string, childTicketIds: string[]): Promise<void> {
    await this.db.supportTicket.updateMany({
      where: {
        id: { in: childTicketIds },
      },
      data: {
        parentTicketId,
        status: SupportTicketStatus.CLOSED,
        updatedAt: new Date(),
      },
    });
  }

  async getTicketStats(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    slaBreached: number;
  }> {
    const [total, open, inProgress, resolved, closed, slaBreached] = await Promise.all([
      this.db.supportTicket.count({ where: { isArchived: false } }),
      this.db.supportTicket.count({ 
        where: { 
          status: SupportTicketStatus.OPEN,
          isArchived: false 
        } 
      }),
      this.db.supportTicket.count({ 
        where: { 
          status: SupportTicketStatus.IN_PROGRESS,
          isArchived: false 
        } 
      }),
      this.db.supportTicket.count({ 
        where: { 
          status: SupportTicketStatus.RESOLVED,
          isArchived: false 
        } 
      }),
      this.db.supportTicket.count({ 
        where: { 
          status: SupportTicketStatus.CLOSED,
          isArchived: false 
        } 
      }),
      this.db.supportTicket.count({ 
        where: { 
          slaBreached: true,
          isArchived: false 
        } 
      }),
    ]);

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
      slaBreached,
    };
  }
}