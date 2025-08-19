// src/controllers/admin/AdminSupportController.ts
import { Request, Response } from 'express';

// Extend Request to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    phoneNumber: string;
    email?: string;
    firstName: string;
    lastName: string;
    role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
    isVerified: boolean;
    sessionId?: string;
  };
}

import { BaseAdminController } from '../BaseAdminController';
import { HTTP_STATUS, createSuccessResponse, createErrorResponse, AppError, ERROR_CODES, PaginationMeta } from '../../types';
import { 
  SupportTicketService,
  SupportAgentService,
  SupportMessageService,
  SupportAnalyticsService,
  SupportKnowledgeBaseService
} from '../../services/support';
import { 
  SupportTicketRepository,
  SupportAgentRepository,
  SupportMessageRepository,
  SupportKnowledgeBaseRepository
} from '../../repositories';

interface PaginationOptions {
  page: number;
  limit: number;
}

export class AdminSupportController extends BaseAdminController {
  private ticketService: SupportTicketService;
  private agentService: SupportAgentService;
  private messageService: SupportMessageService;
  private analyticsService: SupportAnalyticsService;
  private knowledgeBaseService: SupportKnowledgeBaseService;

  constructor(
    ticketService?: SupportTicketService,
    agentService?: SupportAgentService,
    messageService?: SupportMessageService,
    analyticsService?: SupportAnalyticsService,
    knowledgeBaseService?: SupportKnowledgeBaseService
  ) {
    super();
    
    // Initialize repositories
    const ticketRepository = new SupportTicketRepository();
    const agentRepository = new SupportAgentRepository();
    const messageRepository = new SupportMessageRepository();
    const knowledgeBaseRepository = new SupportKnowledgeBaseRepository();
    
    // Initialize services with proper dependencies
    this.ticketService = ticketService || new SupportTicketService();
    this.agentService = agentService || new SupportAgentService();
    this.messageService = messageService || new SupportMessageService();
    this.analyticsService = analyticsService || new SupportAnalyticsService(
      ticketRepository,
      agentRepository,
      messageRepository
    );
    this.knowledgeBaseService = knowledgeBaseService || new SupportKnowledgeBaseService();
  }

  // =================
  // TICKET MANAGEMENT
  // =================

  /**
   * GET /api/admin/support/tickets
   * List all support tickets with filtering
   */
  async getTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        category,
        assignedAgentId,
        customerId,
        source,
        language,
        createdAfter,
        createdBefore,
        slaBreached,
        isArchived,
        search,
        tags
      } = req.query;

      const pagination: PaginationOptions = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const filters: any = {};

      if (status) {
        filters.status = Array.isArray(status) ? status : [status];
      }
      if (priority) {
        filters.priority = Array.isArray(priority) ? priority : [priority];
      }
      if (category) {
        filters.category = Array.isArray(category) ? category : [category];
      }
      if (assignedAgentId) {
        filters.assignedAgentId = assignedAgentId as string;
      }
      if (customerId) {
        filters.customerId = customerId as string;
      }
      if (source) {
        filters.source = Array.isArray(source) ? source : [source];
      }
      if (language) {
        filters.language = Array.isArray(language) ? language : [language];
      }
      if (createdAfter) {
        filters.createdAfter = new Date(createdAfter as string);
      }
      if (createdBefore) {
        filters.createdBefore = new Date(createdBefore as string);
      }
      if (slaBreached !== undefined) {
        filters.slaBreached = slaBreached === 'true';
      }
      if (isArchived !== undefined) {
        filters.isArchived = isArchived === 'true';
      }
      if (search) {
        filters.search = search as string;
      }
      if (tags) {
        filters.tags = Array.isArray(tags) ? tags : [tags];
      }

      const result = await this.ticketService.getTickets(filters, pagination);
      
      // Transform the result to match expected format
      const responseData = {
        tickets: result.data.items || [],
        pagination: {
          currentPage: result.data.page,
          totalPages: result.data.pages,
          totalItems: result.data.total,
          itemsPerPage: result.data.limit
        }
      };
      
      this.sendAdminSuccess(res, responseData, 'Tickets retrieved successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/support/tickets/:ticketId
   * Get detailed ticket information
   */
  async getTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const result = await this.ticketService.getTicket(ticketId);
      this.sendAdminSuccess(res, { ticket: result.data }, 'Ticket retrieved successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/support/tickets
   * Create a new support ticket (admin created)
   */
  // @validateRequest(createTicketSchema) // Disabled for now
  async createTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const ticketData = {
        ...req.body,
        customerId: req.body.customerId,
        source: req.body.source || 'WEB',
        language: req.body.language || 'ENGLISH',
        priority: req.body.priority || 'MEDIUM',
        category: req.body.category || 'GENERAL'
      };

      const result = await this.ticketService.createTicket(ticketData);
      this.sendAdminSuccess(res, { ticket: result.data }, 'Ticket created successfully', 201);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * PUT /api/admin/support/tickets/:ticketId
   * Update ticket information
   */
  // @validateRequest(updateTicketSchema) // Disabled for now
  async updateTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const result = await this.ticketService.updateTicket(
        ticketId,
        req.body,
        req.user!.id
      );
      this.sendAdminSuccess(res, { ticket: result.data }, 'Ticket updated successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * PUT /api/admin/support/tickets/:ticketId/status
   * Update ticket status
   */
  async updateTicketStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { status, reason } = req.body;

      // Validate status using Prisma enums
      const validStatuses = ['OPEN', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED'];
      if (!validStatuses.includes(status)) {
        return this.sendError(res, 'Invalid ticket status', HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR');
      }

      const result = await this.ticketService.updateTicketStatus(
        ticketId,
        status,
        req.user!.id,
        reason
      );
      this.sendAdminSuccess(res, { ticket: result.data }, 'Ticket status updated successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/support/tickets/:ticketId/assign
   * Assign ticket to agent
   */
  // @validateRequest(assignTicketSchema) // Disabled for now
  async assignTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { agentId, reason } = req.body;

      const assignment = {
        ticketId,
        agentId,
        assignedBy: req.user!.id,
        reason,
      };

      const result = await this.ticketService.assignTicket(assignment);
      this.sendAdminSuccess(res, { assignment: result.data }, 'Ticket assigned successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/support/tickets/:ticketId/escalate
   * Escalate ticket
   */
  // @validateRequest(escalateTicketSchema) // Disabled for now
  async escalateTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const {
        fromAgentId,
        toAgentId,
        escalationType,
        reason,
        priority,
        urgencyLevel,
        notes,
      } = req.body;

      const escalation = {
        ticketId,
        fromAgentId,
        toAgentId,
        escalationType,
        reason,
        priority,
        urgencyLevel,
        notes,
        escalatedBy: req.user!.id,
      };

      const result = await this.ticketService.escalateTicket(escalation);
      this.sendAdminSuccess(res, result, 'Operation completed successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/support/tickets/:ticketId/reply
   * Reply to customer ticket
   */
  // @validateRequest(sendReplySchema) // Disabled for now
  async replyToTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const {
        content,
        htmlContent,
        attachments,
        isInternal,
        template,
        channel,
      } = req.body;

      // Get agent ID from user - for now, we'll assume the user ID can be used directly
      // In a real implementation, you'd need to check if the user is an agent
      const agentId = req.user!.id;

      const replyData = {
        ticketId,
        agentId,
        content,
        htmlContent,
        attachments,
        isInternal: isInternal || false,
        template,
        channel: channel || 'email',
      };

      const result = await this.messageService.sendReply(replyData);
      this.sendAdminSuccess(res, result, 'Created successfully', 201);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/support/tickets/:ticketId/history
   * View ticket conversation history
   */
  async getTicketHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { includeInternal = 'true', page = 1, limit = 50 } = req.query;

      const pagination: PaginationOptions = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const result = await this.messageService.getTicketMessages(
        ticketId,
        includeInternal === 'true',
        pagination
      );
      this.sendAdminSuccess(res, result, 'Operation completed successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/support/tickets/merge
   * Merge multiple tickets
   */
  async mergeTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { parentTicketId, childTicketIds, reason } = req.body;

      if (!Array.isArray(childTicketIds) || childTicketIds.length === 0) {
        return this.sendError(res, 'Child ticket IDs must be a non-empty array', HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR');
      }

      const result = await this.ticketService.mergeTickets(
        parentTicketId,
        childTicketIds,
        req.user!.id,
        reason
      );
      this.sendAdminSuccess(res, result, 'Operation completed successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // =================
  // AGENT MANAGEMENT
  // =================

  /**
   * GET /api/admin/support/agents
   * List support agents and availability
   */
  async getAgents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        department,
        status,
        skillLevel,
        specializations,
        languages,
        isActive,
        search
      } = req.query;

      const pagination: PaginationOptions = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const filters: any = {};
      
      if (department) {
        filters.department = Array.isArray(department) ? department : [department];
      }
      if (status) {
        filters.status = Array.isArray(status) ? status : [status];
      }
      if (skillLevel) {
        filters.skillLevel = Array.isArray(skillLevel) ? skillLevel : [skillLevel];
      }
      if (specializations) {
        filters.specializations = Array.isArray(specializations) ? specializations : [specializations];
      }
      if (languages) {
        filters.languages = Array.isArray(languages) ? languages : [languages];
      }
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      if (search) {
        filters.search = search as string;
      }

      const result = await this.agentService.getAgents(filters, pagination);
      this.sendAdminSuccess(res, result, 'Operation completed successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/support/agents
   * Add new support agent
   */
  // @validateRequest(createAgentSchema) // Disabled for now
  async createAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await this.agentService.createAgent(req.body);
      this.sendAdminSuccess(res, result, 'Created successfully', 201);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * PUT /api/admin/support/agents/:agentId
   * Update agent information
   */
  // @validateRequest(updateAgentSchema) // Disabled for now
  async updateAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const result = await this.agentService.updateAgent(agentId, req.body);
      this.sendAdminSuccess(res, result, 'Operation completed successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/support/agents/:agentId/performance
   * Agent performance metrics
   */
  async getAgentPerformance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const { 
        periodType = 'MONTHLY',
        periods = 6 
      } = req.query;

      const result = await this.agentService.getAgentPerformance(
        agentId,
        periodType as any,
        parseInt(periods as string)
      );
      this.sendAdminSuccess(res, result, 'Operation completed successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/support/agents/schedule
   * Manage agent schedules
   */
  async scheduleAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        agentId,
        scheduleDate,
        shiftType,
        startTime,
        endTime,
        breakStartTime,
        breakEndTime,
        notes,
      } = req.body;

      const scheduleData = {
        agentId,
        scheduleDate: new Date(scheduleDate),
        shiftType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        breakStartTime: breakStartTime ? new Date(breakStartTime) : undefined,
        breakEndTime: breakEndTime ? new Date(breakEndTime) : undefined,
        notes,
      };

      const result = await this.agentService.scheduleAgent(scheduleData);
      this.sendAdminSuccess(res, result, 'Created successfully', 201);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // ===================
  // KNOWLEDGE BASE
  // ===================

  /**
   * GET /api/admin/support/knowledge-base
   * Manage knowledge base articles
   */
  async getKnowledgeBaseArticles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        language,
        status,
        isPublic,
        isFeatured,
        authorId,
        search,
        tags
      } = req.query;

      const pagination: PaginationOptions = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const filters: any = {};
      
      if (category) {
        filters.category = Array.isArray(category) ? category : [category];
      }
      if (language) {
        filters.language = Array.isArray(language) ? language : [language];
      }
      if (status) {
        filters.status = Array.isArray(status) ? status : [status];
      }
      if (isPublic !== undefined) {
        filters.isPublic = isPublic === 'true';
      }
      if (isFeatured !== undefined) {
        filters.isFeatured = isFeatured === 'true';
      }
      if (authorId) {
        filters.authorId = authorId as string;
      }
      if (search) {
        filters.search = search as string;
      }
      if (tags) {
        filters.tags = Array.isArray(tags) ? tags : [tags];
      }

      const result = await this.knowledgeBaseService.getArticles(filters, pagination);
      this.sendAdminSuccess(res, result, 'Operation completed successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/support/knowledge-base
   * Create new knowledge base article
   */
  // @validateRequest(createKnowledgeBaseSchema) // Disabled for now
  async createKnowledgeBaseArticle(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const articleData = {
        ...req.body,
        authorId: req.user!.id,
      };

      const result = await this.knowledgeBaseService.createArticle(articleData);
      this.sendAdminSuccess(res, result, 'Created successfully', 201);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * PUT /api/admin/support/knowledge-base/:articleId
   * Update knowledge base article
   */
  // @validateRequest(updateKnowledgeBaseSchema) // Disabled for now
  async updateKnowledgeBaseArticle(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { articleId } = req.params;
      const result = await this.knowledgeBaseService.updateArticle(
        articleId,
        req.body,
        req.user!.id
      );
      this.sendAdminSuccess(res, result, 'Operation completed successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // ===================
  // ANALYTICS
  // ===================

  /**
   * GET /api/admin/support/analytics/overview
   * Support performance overview
   */
  async getSupportOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const result = await this.analyticsService.getSupportOverview(start, end);
      this.sendAdminSuccess(res, result, 'Operation completed successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/support/analytics/agents
   * Agent performance metrics
   */
  async getAgentAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { 
        agentIds,
        period = 'MONTHLY',
        startDate,
        endDate 
      } = req.query;

      const agents = agentIds ? 
        (Array.isArray(agentIds) ? agentIds : [agentIds]) as string[] : 
        undefined;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const result = await this.analyticsService.getAgentPerformance(
        agents,
        period as any,
        start,
        end
      );
      this.sendAdminSuccess(res, result, 'Operation completed successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/support/analytics/tickets
   * Ticket analytics and trends
   */
  async getTicketAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const result = await this.analyticsService.getTicketAnalytics(start, end);
      this.sendAdminSuccess(res, result, 'Operation completed successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/support/analytics/satisfaction
   * Customer satisfaction scores
   */
  async getSatisfactionAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const result = await this.analyticsService.getSatisfactionAnalytics(start, end);
      this.sendAdminSuccess(res, result, 'Operation completed successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

}