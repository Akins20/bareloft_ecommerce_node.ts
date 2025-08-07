// src/repositories/SupportMessageRepository.ts
import { 
  SupportTicketMessage, 
  SupportMessageType, 
  SupportChannelType, 
  SupportMessageDirection,
  Prisma,
  PrismaClient 
} from '@prisma/client';
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

export interface MessageFilters {
  ticketId?: string;
  senderId?: string;
  agentId?: string;
  type?: SupportMessageType[];
  channel?: SupportChannelType[];
  direction?: SupportMessageDirection[];
  isInternal?: boolean;
  isRead?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string;
}

export interface MessageWithDetails extends SupportTicketMessage {
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  agent?: {
    id: string;
    agentNumber: string;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
  ticket: {
    id: string;
    ticketNumber: string;
    subject: string;
  };
  replies: MessageWithDetails[];
  replyTo?: MessageWithDetails | null;
}

export class SupportMessageRepository extends BaseRepository<SupportTicketMessage> {
  protected db: PrismaClient;

  constructor(prisma?: PrismaClient) {
    super(prisma);
    this.db = this.prisma;
  }
  async create(data: {
    ticketId: string;
    senderId?: string;
    agentId?: string;
    type: SupportMessageType;
    channel: SupportChannelType;
    direction: SupportMessageDirection;
    subject?: string;
    content: string;
    htmlContent?: string;
    attachments?: any[];
    isInternal?: boolean;
    messageId?: string;
    threadId?: string;
    replyToId?: string;
    template?: string;
    metadata?: any;
  }): Promise<SupportTicketMessage> {
    return this.db.supportTicketMessage.create({
      data: {
        ...data,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findById(id: string): Promise<MessageWithDetails | null> {
    return this.db.supportTicketMessage.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        agent: {
          select: {
            id: true,
            agentNumber: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
          },
        },
        replies: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            agent: {
              select: {
                id: true,
                agentNumber: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                subject: true,
              },
            },
            replies: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            agent: {
              select: {
                id: true,
                agentNumber: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                subject: true,
              },
            },
            replies: true,
          },
        },
      },
    }) as Promise<MessageWithDetails | null>;
  }

  async findByTicketId(
    ticketId: string,
    includeInternal: boolean = true,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<MessageWithDetails> | MessageWithDetails[]> {
    const where: Prisma.SupportTicketMessageWhereInput = {
      ticketId,
    };

    if (!includeInternal) {
      where.isInternal = false;
    }

    if (pagination) {
      const skip = (pagination.page - 1) * pagination.limit;

      const [items, total] = await Promise.all([
        this.db.supportTicketMessage.findMany({
          where,
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            agent: {
              select: {
                id: true,
                agentNumber: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                subject: true,
              },
            },
            replies: {
              include: {
                sender: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                agent: {
                  select: {
                    id: true,
                    agentNumber: true,
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                ticket: {
                  select: {
                    id: true,
                    ticketNumber: true,
                    subject: true,
                  },
                },
                replies: true,
              },
            },
            replyTo: {
              include: {
                sender: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                agent: {
                  select: {
                    id: true,
                    agentNumber: true,
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                ticket: {
                  select: {
                    id: true,
                    ticketNumber: true,
                    subject: true,
                  },
                },
                replies: true,
              },
            },
          },
          skip,
          take: pagination.limit,
          orderBy: {
            createdAt: 'asc',
          },
        }) as Promise<MessageWithDetails[]>,
        this.db.supportTicketMessage.count({ where }),
      ]);

      return {
        items,
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages: Math.ceil(total / pagination.limit),
      };
    }

    return this.db.supportTicketMessage.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        agent: {
          select: {
            id: true,
            agentNumber: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
          },
        },
        replies: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            agent: {
              select: {
                id: true,
                agentNumber: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                subject: true,
              },
            },
            replies: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            agent: {
              select: {
                id: true,
                agentNumber: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                subject: true,
              },
            },
            replies: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    }) as Promise<MessageWithDetails[]>;
  }

  async findMany(
    filters: MessageFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<MessageWithDetails>> {
    const where: Prisma.SupportTicketMessageWhereInput = {};

    // Apply filters
    if (filters.ticketId) {
      where.ticketId = filters.ticketId;
    }

    if (filters.senderId) {
      where.senderId = filters.senderId;
    }

    if (filters.agentId) {
      where.agentId = filters.agentId;
    }

    if (filters.type?.length) {
      where.type = { in: filters.type };
    }

    if (filters.channel?.length) {
      where.channel = { in: filters.channel };
    }

    if (filters.direction?.length) {
      where.direction = { in: filters.direction };
    }

    if (typeof filters.isInternal === 'boolean') {
      where.isInternal = filters.isInternal;
    }

    if (typeof filters.isRead === 'boolean') {
      where.isRead = filters.isRead;
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

    if (filters.search) {
      where.OR = [
        { content: { contains: filters.search, mode: 'insensitive' } },
        { subject: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [items, total] = await Promise.all([
      this.db.supportTicketMessage.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          agent: {
            select: {
              id: true,
              agentNumber: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              subject: true,
            },
          },
          replies: {
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              agent: {
                select: {
                  id: true,
                  agentNumber: true,
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
              ticket: {
                select: {
                  id: true,
                  ticketNumber: true,
                  subject: true,
                },
              },
              replies: true,
            },
          },
          replyTo: true,
        },
        skip,
        take: pagination.limit,
        orderBy: {
          createdAt: 'desc',
        },
      }) as Promise<MessageWithDetails[]>,
      this.db.supportTicketMessage.count({ where }),
    ]);

    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      pages: Math.ceil(total / pagination.limit),
    };
  }

  async markAsRead(id: string): Promise<SupportTicketMessage> {
    return this.db.supportTicketMessage.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markMultipleAsRead(ids: string[]): Promise<void> {
    await this.db.supportTicketMessage.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markTicketMessagesAsRead(ticketId: string, excludeInternal = false): Promise<void> {
    const where: any = { ticketId };
    
    if (excludeInternal) {
      where.isInternal = false;
    }

    await this.db.supportTicketMessage.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getUnreadCount(ticketId: string, isInternal = false): Promise<number> {
    return this.db.supportTicketMessage.count({
      where: {
        ticketId,
        isRead: false,
        isInternal,
      },
    });
  }

  async getLastMessage(ticketId: string): Promise<MessageWithDetails | null> {
    return this.db.supportTicketMessage.findFirst({
      where: { ticketId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        agent: {
          select: {
            id: true,
            agentNumber: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
          },
        },
        replies: true,
        replyTo: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as Promise<MessageWithDetails | null>;
  }

  async updateDeliveryStatus(id: string, deliveredAt: Date): Promise<SupportTicketMessage> {
    return this.db.supportTicketMessage.update({
      where: { id },
      data: {
        deliveredAt,
      },
    });
  }

  async deleteMessage(id: string): Promise<void> {
    await this.db.supportTicketMessage.delete({
      where: { id },
    });
  }

  async getMessageStats(ticketId?: string): Promise<{
    total: number;
    unread: number;
    internal: number;
    external: number;
    byChannel: Record<string, number>;
    byDirection: Record<string, number>;
  }> {
    const where: any = {};
    
    if (ticketId) {
      where.ticketId = ticketId;
    }

    const [
      total,
      unread,
      internal,
      external,
      byChannel,
      byDirection,
    ] = await Promise.all([
      this.db.supportTicketMessage.count({ where }),
      this.db.supportTicketMessage.count({
        where: { ...where, isRead: false },
      }),
      this.db.supportTicketMessage.count({
        where: { ...where, isInternal: true },
      }),
      this.db.supportTicketMessage.count({
        where: { ...where, isInternal: false },
      }),
      this.db.supportTicketMessage.groupBy({
        by: ['channel'],
        where,
        _count: true,
      }),
      this.db.supportTicketMessage.groupBy({
        by: ['direction'],
        where,
        _count: true,
      }),
    ]);

    const channelStats = byChannel.reduce((acc, item) => {
      acc[item.channel] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const directionStats = byDirection.reduce((acc, item) => {
      acc[item.direction] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      unread,
      internal,
      external,
      byChannel: channelStats,
      byDirection: directionStats,
    };
  }
}