// src/services/support/SupportTicketService.ts
import { 
  SupportTicketStatus, 
  SupportTicketPriority, 
  SupportTicketCategory,
  SupportChannelType,
  SupportLanguage
} from '@prisma/client';
import { BaseService } from '../BaseService';
import { SupportTicketRepository } from '../../repositories/SupportTicketRepository';
import { SupportAgentRepository } from '../../repositories/SupportAgentRepository';
import { SupportMessageRepository } from '../../repositories/SupportMessageRepository';
import { TicketFilters, TicketWithDetails } from '../../repositories/SupportTicketRepository';
import { PrismaClient } from '@prisma/client';

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

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// Mock services
class NotificationService {
  async sendTicketCreatedNotification(customerId: string, ticketNumber: string): Promise<void> {
    console.log(`Ticket created notification sent to customer ${customerId}: ${ticketNumber}`);
  }
  
  async sendTicketAssignedNotification(agentId: string, ticketId: string): Promise<void> {
    console.log(`Ticket assigned notification sent to agent ${agentId}: ${ticketId}`);
  }
  
  async sendTicketEscalatedNotification(agentId: string, ticketId: string): Promise<void> {
    console.log(`Ticket escalated notification sent to agent ${agentId}: ${ticketId}`);
  }
  
  async sendTicketClosedNotification(customerId: string, ticketNumber: string): Promise<void> {
    console.log(`Ticket closed notification sent to customer ${customerId}: ${ticketNumber}`);
  }
}

// Mock utility functions
class IDGenerators {
  static generateTicketNumber(): string {
    return `TKT-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  }
}

const validateNigerianPhoneNumber = (phoneNumber: string) => {
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  const patterns = [
    /^\+234[0-9]{10}$/, // +234XXXXXXXXXX
    /^234[0-9]{10}$/, // 234XXXXXXXXXX
    /^0[0-9]{10}$/, // 0XXXXXXXXXX
  ];
  const isValid = patterns.some(pattern => pattern.test(cleanNumber));
  return {
    isValid,
    formatted: isValid ? (cleanNumber.startsWith('+') ? cleanNumber : `+234${cleanNumber.substring(1)}`) : phoneNumber
  };
};

export interface CreateTicketRequest {
  subject: string;
  description: string;
  category: SupportTicketCategory;
  subcategory?: string;
  priority?: SupportTicketPriority;
  source: SupportChannelType;
  language?: SupportLanguage;
  customerId: string;
  orderId?: string;
  returnRequestId?: string;
  tags?: string[];
  nigerianFeatures?: {
    stateRegion?: string;
    customerLanguage?: string;
    paymentChannel?: string;
    shippingCarrier?: string;
    bankIssue?: string;
    ussdCode?: string;
    culturalContext?: any;
  };
  metadata?: any;
}

export interface UpdateTicketRequest {
  subject?: string;
  description?: string;
  category?: SupportTicketCategory;
  subcategory?: string;
  priority?: SupportTicketPriority;
  tags?: string[];
  internalNotes?: string;
  metadata?: any;
}

export interface TicketAssignment {
  ticketId: string;
  agentId: string;
  assignedBy: string;
  reason?: string;
}

export interface TicketEscalation {
  ticketId: string;
  fromAgentId?: string;
  toAgentId?: string;
  escalationType: string;
  reason: string;
  priority: SupportTicketPriority;
  urgencyLevel: string;
  notes?: string;
  escalatedBy: string;
}

export class SupportTicketService extends BaseService {
  protected db: PrismaClient;
  private ticketRepository: SupportTicketRepository;
  private agentRepository: SupportAgentRepository;
  private messageRepository: SupportMessageRepository;
  private notificationService: NotificationService;

  constructor() {
    super();
    this.db = new PrismaClient();
    this.ticketRepository = new SupportTicketRepository();
    this.agentRepository = new SupportAgentRepository();
    this.messageRepository = new SupportMessageRepository();
    this.notificationService = new NotificationService();
  }

  // Helper method to create success response
  protected createSuccessResponse<T>(
    data: T,
    message: string,
    statusCode: number = HTTP_STATUS.OK
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  async createTicket(data: CreateTicketRequest): Promise<ApiResponse<TicketWithDetails>> {
    try {
      // Generate unique ticket number
      const ticketNumber = IDGenerators.generateTicketNumber();

      // Set default priority based on category and Nigerian market considerations
      let priority = data.priority || SupportTicketPriority.MEDIUM;
      
      // Auto-escalate certain categories for Nigerian market
      if (data.category === SupportTicketCategory.PAYMENT_PROBLEMS) {
        priority = SupportTicketPriority.HIGH;
      }

      if (data.category === SupportTicketCategory.RETURNS_REFUNDS) {
        priority = SupportTicketPriority.HIGH;
      }

      // Create the ticket
      const ticket = await this.ticketRepository.create({
        ticketNumber,
        subject: data.subject,
        description: data.description,
        category: data.category,
        subcategory: data.subcategory,
        priority,
        source: data.source,
        language: data.language || SupportLanguage.ENGLISH,
        customerId: data.customerId,
        orderId: data.orderId,
        returnRequestId: data.returnRequestId,
        tags: data.tags || [],
        metadata: data.metadata,
      });

      // Create Nigerian market features if provided
      if (data.nigerianFeatures) {
        await this.db.supportNigerianFeature.create({
          data: {
            ticketId: ticket.id,
            stateRegion: data.nigerianFeatures.stateRegion as any,
            customerLanguage: data.nigerianFeatures.customerLanguage as any,
            paymentChannel: data.nigerianFeatures.paymentChannel as any,
            shippingCarrier: data.nigerianFeatures.shippingCarrier,
            bankIssue: data.nigerianFeatures.bankIssue,
            ussdCode: data.nigerianFeatures.ussdCode,
            culturalContext: data.nigerianFeatures.culturalContext,
          },
        });
      }

      // Create initial message from the ticket description
      await this.messageRepository.create({
        ticketId: ticket.id,
        senderId: data.customerId,
        type: 'MESSAGE',
        channel: data.source,
        direction: 'INCOMING',
        subject: data.subject,
        content: data.description,
        isInternal: false,
        metadata: { isInitialMessage: true },
      });

      // Try to auto-assign based on category and agent availability
      await this.autoAssignTicket(ticket.id, data.category, priority);

      // Send notifications
      await this.notificationService.sendTicketCreatedNotification(ticket.id);

      // Get the complete ticket with details
      const ticketWithDetails = await this.ticketRepository.findById(ticket.id);

      return this.createSuccessResponse(
        ticketWithDetails!,
        'Support ticket created successfully',
        HTTP_STATUS.CREATED
      );
    } catch (error) {
      throw new AppError(
        'Failed to create support ticket',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'TICKET_CREATION_FAILED'
      );
    }
  }

  async getTicket(id: string, userId?: string): Promise<ApiResponse<TicketWithDetails>> {
    try {
      const ticket = await this.ticketRepository.findById(id);

      if (!ticket) {
        throw new AppError(
          'Ticket not found',
          HTTP_STATUS.NOT_FOUND,
          'TICKET_NOT_FOUND'
        );
      }

      // Check access permissions
      if (userId && ticket.customerId !== userId) {
        // Allow access if user is an agent assigned to this ticket
        const agent = await this.agentRepository.findByUserId(userId);
        if (!agent || ticket.assignedAgentId !== agent.id) {
          throw new AppError(
            'Access denied',
            HTTP_STATUS.FORBIDDEN,
            'ACCESS_DENIED'
          );
        }
      }

      return this.createSuccessResponse(ticket, 'Ticket retrieved successfully');
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to retrieve ticket',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'TICKET_RETRIEVAL_FAILED'
      );
    }
  }

  async getTickets(
    filters: TicketFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<ApiResponse<PaginatedResult<TicketWithDetails>>> {
    try {
      const tickets = await this.ticketRepository.findMany(filters, pagination);
      return this.createSuccessResponse(tickets, 'Tickets retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve tickets',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'TICKETS_RETRIEVAL_FAILED'
      );
    }
  }

  async updateTicket(
    id: string, 
    data: UpdateTicketRequest,
    updatedBy: string
  ): Promise<ApiResponse<TicketWithDetails>> {
    try {
      const ticket = await this.ticketRepository.findById(id);

      if (!ticket) {
        throw new AppError(
          'Ticket not found',
          HTTP_STATUS.NOT_FOUND,
          'TICKET_NOT_FOUND'
        );
      }

      // Update ticket data
      await this.db.supportTicket.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Log the update as a system message
      await this.messageRepository.create({
        ticketId: id,
        agentId: updatedBy,
        type: 'SYSTEM_UPDATE',
        channel: 'IN_APP',
        direction: 'INTERNAL',
        content: `Ticket updated: ${Object.keys(data).join(', ')}`,
        isInternal: true,
        metadata: { updateData: data },
      });

      const updatedTicket = await this.ticketRepository.findById(id);

      return this.createSuccessResponse(
        updatedTicket!,
        'Ticket updated successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to update ticket',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'TICKET_UPDATE_FAILED'
      );
    }
  }

  async updateTicketStatus(
    id: string,
    status: SupportTicketStatus,
    updatedBy: string,
    reason?: string
  ): Promise<ApiResponse<TicketWithDetails>> {
    try {
      const ticket = await this.ticketRepository.findById(id);

      if (!ticket) {
        throw new AppError(
          'Ticket not found',
          HTTP_STATUS.NOT_FOUND,
          'TICKET_NOT_FOUND'
        );
      }

      // Update ticket status
      await this.ticketRepository.updateStatus(id, status, updatedBy);

      // Create status update message
      await this.messageRepository.create({
        ticketId: id,
        agentId: updatedBy,
        type: 'SYSTEM_UPDATE',
        channel: 'IN_APP',
        direction: 'INTERNAL',
        content: `Ticket status changed to ${status}${reason ? `: ${reason}` : ''}`,
        isInternal: false, // Make visible to customer
        metadata: { 
          statusChange: { from: ticket.status, to: status },
          reason 
        },
      });

      // Send notifications
      await this.notificationService.sendTicketStatusUpdateNotification(id, status);

      // If ticket is resolved or closed, trigger satisfaction survey
      if ([SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED].includes(status)) {
        await this.triggerSatisfactionSurvey(id, ticket.customerId);
      }

      const updatedTicket = await this.ticketRepository.findById(id);

      return this.createSuccessResponse(
        updatedTicket!,
        'Ticket status updated successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to update ticket status',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'TICKET_STATUS_UPDATE_FAILED'
      );
    }
  }

  async assignTicket(assignment: TicketAssignment): Promise<ApiResponse<TicketWithDetails>> {
    try {
      const [ticket, agent] = await Promise.all([
        this.ticketRepository.findById(assignment.ticketId),
        this.agentRepository.findById(assignment.agentId),
      ]);

      if (!ticket) {
        throw new AppError(
          'Ticket not found',
          HTTP_STATUS.NOT_FOUND,
          'TICKET_NOT_FOUND'
        );
      }

      if (!agent || !agent.isActive) {
        throw new AppError(
          'Agent not found or inactive',
          HTTP_STATUS.BAD_REQUEST,
          'AGENT_UNAVAILABLE'
        );
      }

      // Check if agent has capacity
      if (agent.currentTicketCount >= agent.maxConcurrentTickets) {
        throw new AppError(
          'Agent has reached maximum concurrent tickets',
          HTTP_STATUS.BAD_REQUEST,
          'AGENT_AT_CAPACITY'
        );
      }

      // Assign ticket
      await this.ticketRepository.assignAgent(
        assignment.ticketId,
        assignment.agentId,
        assignment.assignedBy
      );

      // Increment agent's ticket count
      await this.agentRepository.incrementTicketCount(assignment.agentId);

      // Create assignment message
      await this.messageRepository.create({
        ticketId: assignment.ticketId,
        agentId: assignment.assignedBy,
        type: 'ASSIGNMENT',
        channel: 'IN_APP',
        direction: 'INTERNAL',
        content: `Ticket assigned to ${agent.user.firstName} ${agent.user.lastName}`,
        isInternal: true,
        metadata: { assignment },
      });

      // Send notifications
      await this.notificationService.sendTicketAssignmentNotification(
        assignment.ticketId,
        assignment.agentId
      );

      const updatedTicket = await this.ticketRepository.findById(assignment.ticketId);

      return this.createSuccessResponse(
        updatedTicket!,
        'Ticket assigned successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to assign ticket',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'TICKET_ASSIGNMENT_FAILED'
      );
    }
  }

  async escalateTicket(escalation: TicketEscalation): Promise<ApiResponse<TicketWithDetails>> {
    try {
      const ticket = await this.ticketRepository.findById(escalation.ticketId);

      if (!ticket) {
        throw new AppError(
          'Ticket not found',
          HTTP_STATUS.NOT_FOUND,
          'TICKET_NOT_FOUND'
        );
      }

      // Perform escalation
      await this.ticketRepository.escalate(escalation.ticketId, escalation);

      // Update agent ticket counts if reassigning
      if (ticket.assignedAgentId && escalation.toAgentId && 
          ticket.assignedAgentId !== escalation.toAgentId) {
        await Promise.all([
          this.agentRepository.decrementTicketCount(ticket.assignedAgentId),
          this.agentRepository.incrementTicketCount(escalation.toAgentId),
        ]);
      }

      // Create escalation message
      await this.messageRepository.create({
        ticketId: escalation.ticketId,
        agentId: escalation.escalatedBy,
        type: 'ESCALATION',
        channel: 'IN_APP',
        direction: 'INTERNAL',
        content: `Ticket escalated: ${escalation.reason}`,
        isInternal: true,
        metadata: { escalation },
      });

      // Send notifications
      await this.notificationService.sendTicketEscalationNotification(escalation.ticketId);

      const updatedTicket = await this.ticketRepository.findById(escalation.ticketId);

      return this.createSuccessResponse(
        updatedTicket!,
        'Ticket escalated successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to escalate ticket',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'TICKET_ESCALATION_FAILED'
      );
    }
  }

  async mergeTickets(
    parentTicketId: string,
    childTicketIds: string[],
    mergedBy: string,
    reason: string
  ): Promise<ApiResponse<TicketWithDetails>> {
    try {
      const parentTicket = await this.ticketRepository.findById(parentTicketId);

      if (!parentTicket) {
        throw new AppError(
          'Parent ticket not found',
          HTTP_STATUS.NOT_FOUND,
          'PARENT_TICKET_NOT_FOUND'
        );
      }

      // Verify all child tickets exist
      const childTickets = await Promise.all(
        childTicketIds.map(id => this.ticketRepository.findById(id))
      );

      const invalidTickets = childTickets.filter(ticket => !ticket);
      if (invalidTickets.length > 0) {
        throw new AppError(
          'Some child tickets not found',
          HTTP_STATUS.BAD_REQUEST,
          'INVALID_CHILD_TICKETS'
        );
      }

      // Merge tickets
      await this.ticketRepository.mergeTickets(parentTicketId, childTicketIds);

      // Create merge messages
      const mergePromises = childTicketIds.map(ticketId =>
        this.messageRepository.create({
          ticketId,
          agentId: mergedBy,
          type: 'SYSTEM_UPDATE',
          channel: 'IN_APP',
          direction: 'INTERNAL',
          content: `Ticket merged into ${parentTicket.ticketNumber}: ${reason}`,
          isInternal: false,
          metadata: { 
            mergeOperation: { 
              parentTicketId, 
              parentTicketNumber: parentTicket.ticketNumber,
              reason 
            } 
          },
        })
      );

      await Promise.all(mergePromises);

      const updatedTicket = await this.ticketRepository.findById(parentTicketId);

      return this.createSuccessResponse(
        updatedTicket!,
        'Tickets merged successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to merge tickets',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'TICKET_MERGE_FAILED'
      );
    }
  }

  async getCustomerTickets(
    customerId: string,
    limit = 10
  ): Promise<ApiResponse<TicketWithDetails[]>> {
    try {
      const tickets = await this.ticketRepository.getTicketsByCustomer(customerId, limit);
      return this.createSuccessResponse(tickets, 'Customer tickets retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve customer tickets',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'CUSTOMER_TICKETS_RETRIEVAL_FAILED'
      );
    }
  }

  async getAgentTickets(
    agentId: string,
    status?: SupportTicketStatus[]
  ): Promise<ApiResponse<TicketWithDetails[]>> {
    try {
      const tickets = await this.ticketRepository.getTicketsByAgent(agentId, status);
      return this.createSuccessResponse(tickets, 'Agent tickets retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve agent tickets',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AGENT_TICKETS_RETRIEVAL_FAILED'
      );
    }
  }

  async getTicketStats(): Promise<ApiResponse<any>> {
    try {
      const stats = await this.ticketRepository.getTicketStats();
      return this.createSuccessResponse(stats, 'Ticket statistics retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve ticket statistics',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'TICKET_STATS_RETRIEVAL_FAILED'
      );
    }
  }

  private async autoAssignTicket(
    ticketId: string,
    category: SupportTicketCategory,
    priority: SupportTicketPriority
  ): Promise<void> {
    try {
      // Find the best agent for this category and priority
      const agent = await this.agentRepository.getBestAgentForCategory(
        category.toString(),
        priority.toString()
      );

      if (agent && agent.currentTicketCount < agent.maxConcurrentTickets) {
        await this.assignTicket({
          ticketId,
          agentId: agent.id,
          assignedBy: 'SYSTEM',
          reason: 'Auto-assigned based on category and availability',
        });
      }
    } catch (error) {
      // Auto-assignment failure should not fail ticket creation
      console.error('Auto-assignment failed:', error);
    }
  }

  private async triggerSatisfactionSurvey(ticketId: string, customerId: string): Promise<void> {
    try {
      await this.db.supportSatisfactionSurvey.create({
        data: {
          ticketId,
          customerId,
          surveyType: 'POST_RESOLUTION',
          isCompleted: false,
          sentAt: new Date(),
        },
      });

      // Send survey notification
      await this.notificationService.sendSatisfactionSurveyNotification(ticketId, customerId);
    } catch (error) {
      // Survey creation failure should not affect ticket resolution
      console.error('Failed to create satisfaction survey:', error);
    }
  }
}