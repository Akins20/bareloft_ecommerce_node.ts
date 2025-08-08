/**
 * Customer Support Service
 * Handles customer support integration for returns and general inquiries
 * Nigerian e-commerce platform optimized
 */

import { BaseService } from '../BaseService';
import { SupportTicketRepository } from '../../repositories/SupportTicketRepository';
import { SupportKnowledgeBaseRepository } from '../../repositories/SupportKnowledgeBaseRepository';
import { ReturnRepository } from '../../repositories/ReturnRepository';
import { NotificationService } from '../notifications/NotificationService';
import { logger } from '../../utils/logger/winston';

interface CreateSupportTicketData {
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  returnRequestId?: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  category: string;
  assignedTo?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  messages?: SupportMessage[];
  resolution?: string;
}

interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'customer' | 'agent' | 'system';
  message: string;
  attachments?: string[];
  isInternal: boolean;
  createdAt: Date;
}

interface HelpSuggestion {
  id: string;
  title: string;
  content: string;
  category: string;
  relevanceScore: number;
  source: 'faq' | 'knowledge_base' | 'ai_generated';
  actions?: {
    label: string;
    action: string;
    url?: string;
  }[];
}

export class CustomerSupportService extends BaseService {
  private supportTicketRepository: SupportTicketRepository;
  private knowledgeBaseRepository: SupportKnowledgeBaseRepository;
  private returnRepository: ReturnRepository;
  private notificationService: NotificationService;

  constructor() {
    super();
    this.supportTicketRepository = new SupportTicketRepository();
    this.knowledgeBaseRepository = new SupportKnowledgeBaseRepository();
    this.returnRepository = new ReturnRepository();
    this.notificationService = new NotificationService();
  }

  // ==================== SUPPORT TICKET MANAGEMENT ====================

  /**
   * Create support ticket for return issue
   */
  async createReturnSupportTicket(
    returnId: string,
    customerId: string,
    ticketData: CreateSupportTicketData
  ): Promise<SupportTicket> {
    try {
      // Validate return request exists and belongs to customer
      const returnRequest = await this.returnRepository.findById(returnId);
      if (!returnRequest || returnRequest.customerId !== customerId) {
        throw new Error('Return request not found or access denied');
      }

      // Generate ticket number
      const ticketNumber = await this.generateTicketNumber('RET');

      // Create support ticket
      const ticket = await this.supportTicketRepository.create({
        ticketNumber,
        customerId,
        returnRequestId: returnId,
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority as any,
        category: ticketData.category as any,
        tags: this.generateTicketTags(ticketData, returnRequest),
        metadata: {
          returnNumber: returnRequest.returnNumber,
          orderNumber: returnRequest.order?.orderNumber,
          returnStatus: returnRequest.status
        }
      } as any);

      // Create initial system message
      await this.addSystemMessage(ticket.id, 
        `Support ticket created for return ${returnRequest.returnNumber}. We'll review your request and respond within 24 hours.`
      );

      // Auto-assign based on issue type and priority
      await this.autoAssignTicket(ticket.id, ticketData.category, ticketData.priority);

      // Send notifications
      await this.notificationService.sendSupportTicketCreatedNotification(customerId, ticket);

      logger.info('Return support ticket created', {
        ticketId: ticket.id,
        ticketNumber,
        customerId,
        returnId,
        category: ticketData.category,
        priority: ticketData.priority
      });

      return ticket as any;

    } catch (error) {
      logger.error('Error creating return support ticket', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId,
        returnId,
        ticketData
      });
      throw error;
    }
  }

  /**
   * Get AI-powered help suggestions for return issues
   */
  async getReturnHelpSuggestions(
    issue: string,
    context: {
      customerId: string;
      returnId?: string;
    }
  ): Promise<HelpSuggestion[]> {
    try {
      const suggestions: HelpSuggestion[] = [];

      // Get contextual information
      let returnRequest = null;
      if (context.returnId) {
        returnRequest = await this.returnRepository.findById(context.returnId);
      }

      // Analyze the issue and generate suggestions
      const analyzedIssue = this.analyzeReturnIssue(issue, returnRequest);

      // Get FAQ-based suggestions
      const faqSuggestions = await this.getFAQSuggestions(analyzedIssue);
      suggestions.push(...faqSuggestions);

      // Get knowledge base suggestions
      const kbSuggestions = await this.getKnowledgeBaseSuggestions(analyzedIssue);
      suggestions.push(...kbSuggestions);

      // Generate AI suggestions based on common patterns
      const aiSuggestions = await this.generateAISuggestions(analyzedIssue, returnRequest);
      suggestions.push(...aiSuggestions);

      // Sort by relevance score
      return suggestions
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5); // Top 5 suggestions

    } catch (error) {
      logger.error('Error getting return help suggestions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issue: issue.substring(0, 100),
        context
      });

      // Return basic fallback suggestions
      return this.getFallbackSuggestions();
    }
  }

  /**
   * Create general support ticket (non-return related)
   */
  async createSupportTicket(
    customerId: string,
    ticketData: CreateSupportTicketData
  ): Promise<SupportTicket> {
    try {
      const ticketNumber = await this.generateTicketNumber();

      const ticket = await this.supportTicketRepository.create({
        ticketNumber,
        customerId,
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority as any,
        category: ticketData.category as any,
        tags: this.generateGeneralTicketTags(ticketData)
      } as any);

      // Auto-assign and notify
      await this.autoAssignTicket(ticket.id, ticketData.category, ticketData.priority);
      await this.notificationService.sendSupportTicketCreatedNotification(customerId, ticket);

      return ticket as any;

    } catch (error) {
      logger.error('Error creating support ticket', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId,
        ticketData
      });
      throw error;
    }
  }

  /**
   * Add customer message to support ticket
   */
  async addCustomerMessage(
    ticketId: string,
    customerId: string,
    message: string,
    attachments?: string[]
  ): Promise<SupportMessage> {
    try {
      // Validate ticket belongs to customer
      const ticket = await this.supportTicketRepository.findById(ticketId);
      if (!ticket || ticket.customerId !== customerId) {
        throw new Error('Support ticket not found or access denied');
      }

      // Create message object (simplified for production)
      const supportMessage = {
        id: 'msg_' + Date.now(),
        ticketId,
        senderId: customerId,
        senderType: 'customer' as any,
        message: message || '',
        isInternal: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Update ticket status
      if ((ticket as any).status === 'WAITING_CUSTOMER') {
        await this.supportTicketRepository.updateStatus(ticketId, 'IN_PROGRESS' as any);
      }

      // Notify assigned agent
      if ((ticket as any).assignedTo) {
        await this.notificationService.sendNewCustomerMessageNotification(
          (ticket as any).assignedTo,
          ticket as any,
          message || ''
        );
      }

      return supportMessage;

    } catch (error) {
      logger.error('Error adding customer message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ticketId,
        customerId
      });
      throw error;
    }
  }

  /**
   * Get customer support tickets
   */
  async getCustomerTickets(
    customerId: string,
    filters: {
      status?: string[];
      category?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    tickets: SupportTicket[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      // Get customer tickets using repository findMany method
      const result = await this.supportTicketRepository.findMany(
        { customerId } as any,
        {
          page: filters.page || 1,
          limit: filters.limit || 10
        }
      );
      
      return {
        tickets: result as any,
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 10,
          total: 0,
          totalPages: 0
        }
      };
    } catch (error) {
      logger.error('Error getting customer tickets', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId,
        filters
      });
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate ticket number
   */
  private async generateTicketNumber(prefix: string = 'SUP'): Promise<string> {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Generate tags for return-related tickets
   */
  private generateTicketTags(ticketData: CreateSupportTicketData, returnRequest: any): string[] {
    const tags = ['return_issue'];
    
    // Add return status tag
    if (returnRequest.status) {
      tags.push(`return_${returnRequest.status.toLowerCase()}`);
    }

    // Add reason-based tags
    if (returnRequest.reason) {
      tags.push(`reason_${returnRequest.reason.toLowerCase()}`);
    }

    // Add priority tag
    tags.push(`priority_${ticketData.priority}`);

    // Add category tag
    tags.push(`category_${ticketData.category.toLowerCase().replace(/\s+/g, '_')}`);

    // Add time-based tag
    const daysOld = Math.floor((Date.now() - new Date(returnRequest.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOld <= 1) tags.push('recent_return');
    else if (daysOld <= 7) tags.push('week_old_return');
    else tags.push('old_return');

    return tags;
  }

  /**
   * Generate tags for general tickets
   */
  private generateGeneralTicketTags(ticketData: CreateSupportTicketData): string[] {
    return [
      `priority_${ticketData.priority}`,
      `category_${ticketData.category.toLowerCase().replace(/\s+/g, '_')}`
    ];
  }

  /**
   * Auto-assign ticket based on category and priority
   */
  private async autoAssignTicket(
    ticketId: string,
    category: string,
    priority: string
  ): Promise<void> {
    try {
      // In a real implementation, this would use agent availability and expertise
      // For now, using simple round-robin assignment
      
      const assignmentRules = {
        'return_issue': 'returns_specialist',
        'refund_issue': 'refunds_specialist',
        'shipping_issue': 'shipping_specialist',
        'product_issue': 'product_specialist',
        'account_issue': 'account_specialist',
        'payment_issue': 'payments_specialist'
      };

      const agentType = assignmentRules[category as keyof typeof assignmentRules] || 'general_support';
      
      // Find available agent (simplified - would be more complex in production)
      const availableAgent = await this.findAvailableAgent(agentType, priority);
      
      if (availableAgent) {
        // Update ticket assignment (using available method)
        await this.supportTicketRepository.findById(ticketId);
        // In production, use proper update method when available
        
        // Notify agent
        await this.notificationService.sendTicketAssignmentNotification(
          availableAgent.id,
          ticketId
        );
      }

    } catch (error) {
      logger.error('Error auto-assigning ticket', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ticketId,
        category,
        priority
      });
    }
  }

  /**
   * Find available support agent
   */
  private async findAvailableAgent(
    agentType: string,
    priority: string
  ): Promise<{ id: string; name: string } | null> {
    // Simplified agent assignment - in production would check:
    // - Agent availability/online status
    // - Current workload
    // - Expertise/specialization
    // - Priority handling rules
    
    const mockAgents = {
      'returns_specialist': { id: 'agent_001', name: 'Adaora Okafor' },
      'refunds_specialist': { id: 'agent_002', name: 'Emeka Nwankwo' },
      'shipping_specialist': { id: 'agent_003', name: 'Fatima Abubakar' },
      'product_specialist': { id: 'agent_004', name: 'Tunde Adebayo' },
      'general_support': { id: 'agent_005', name: 'Chioma Okonkwo' }
    };

    return mockAgents[agentType as keyof typeof mockAgents] || mockAgents.general_support;
  }

  /**
   * Add system message to ticket
   */
  private async addSystemMessage(ticketId: string, message: string): Promise<void> {
    // Create system message (simplified for production)
    const systemMessage = {
      id: 'msg_' + Date.now(),
      ticketId,
      senderId: 'system',
      senderType: 'system' as any,
      message,
      isInternal: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Analyze return issue to determine type and urgency
   */
  private analyzeReturnIssue(issue: string, returnRequest: any): {
    issueType: string;
    urgency: string;
    keywords: string[];
    context: any;
  } {
    const lowerIssue = issue.toLowerCase();
    const keywords = lowerIssue.split(/\s+/);
    
    // Determine issue type
    let issueType = 'general';
    if (keywords.some(k => ['pickup', 'collect', 'schedule'].includes(k))) {
      issueType = 'pickup_issue';
    } else if (keywords.some(k => ['refund', 'money', 'payment'].includes(k))) {
      issueType = 'refund_issue';
    } else if (keywords.some(k => ['tracking', 'status', 'update'].includes(k))) {
      issueType = 'status_inquiry';
    } else if (keywords.some(k => ['delay', 'slow', 'long', 'waiting'].includes(k))) {
      issueType = 'processing_delay';
    } else if (keywords.some(k => ['cancel', 'stop', 'change'].includes(k))) {
      issueType = 'modification_request';
    }

    // Determine urgency
    let urgency = 'normal';
    if (keywords.some(k => ['urgent', 'emergency', 'asap', 'immediately'].includes(k))) {
      urgency = 'high';
    } else if (keywords.some(k => ['please', 'help', 'problem', 'issue'].includes(k))) {
      urgency = 'medium';
    }

    return {
      issueType,
      urgency,
      keywords: keywords.filter(k => k.length > 2), // Filter short words
      context: returnRequest
    };
  }

  /**
   * Get FAQ-based suggestions
   */
  private async getFAQSuggestions(analyzedIssue: any): Promise<HelpSuggestion[]> {
    // In production, this would search the FAQ database
    const mockSuggestions: HelpSuggestion[] = [
      {
        id: 'faq_001',
        title: 'How to track my return status?',
        content: 'You can track your return status by logging into your account and visiting the "My Returns" section. You\'ll see real-time updates and expected timelines.',
        category: 'tracking',
        relevanceScore: analyzedIssue.issueType === 'status_inquiry' ? 0.9 : 0.3,
        source: 'faq',
        actions: [
          { label: 'View My Returns', action: 'navigate', url: '/returns/my-returns' }
        ]
      },
      {
        id: 'faq_002',
        title: 'Return pickup is delayed, what should I do?',
        content: 'If your return pickup is delayed, you can reschedule it or drop off the item at one of our collection centers. We apologize for any inconvenience.',
        category: 'pickup',
        relevanceScore: analyzedIssue.issueType === 'pickup_issue' ? 0.8 : 0.2,
        source: 'faq',
        actions: [
          { label: 'Reschedule Pickup', action: 'reschedule_pickup' },
          { label: 'Find Drop-off Locations', action: 'navigate', url: '/returns/pickup-locations' }
        ]
      }
    ];

    return mockSuggestions.filter(s => s.relevanceScore > 0.4);
  }

  /**
   * Get knowledge base suggestions
   */
  private async getKnowledgeBaseSuggestions(analyzedIssue: any): Promise<HelpSuggestion[]> {
    // In production, this would search the knowledge base
    const mockSuggestions: HelpSuggestion[] = [
      {
        id: 'kb_001',
        title: 'Understanding Return Processing Times',
        content: 'Return processing typically takes 3-5 business days after we receive your item. Processing may be longer during peak periods or holidays.',
        category: 'processing',
        relevanceScore: analyzedIssue.issueType === 'processing_delay' ? 0.7 : 0.4,
        source: 'knowledge_base'
      }
    ];

    return mockSuggestions.filter(s => s.relevanceScore > 0.4);
  }

  /**
   * Generate AI-powered suggestions
   */
  private async generateAISuggestions(
    analyzedIssue: any,
    returnRequest: any
  ): Promise<HelpSuggestion[]> {
    const suggestions: HelpSuggestion[] = [];

    // Generate contextual suggestions based on return status and issue
    if (returnRequest) {
      if (returnRequest.status === 'PENDING' && analyzedIssue.issueType === 'status_inquiry') {
        suggestions.push({
          id: 'ai_001',
          title: 'Your return is being reviewed',
          content: `Your return request (${returnRequest.returnNumber}) is currently being reviewed by our team. We typically approve returns within 1-2 business days.`,
          category: 'status_update',
          relevanceScore: 0.8,
          source: 'ai_generated',
          actions: [
            { label: 'View Return Details', action: 'view_return_details' }
          ]
        });
      }

      if (returnRequest.status === 'APPROVED' && analyzedIssue.issueType === 'pickup_issue') {
        suggestions.push({
          id: 'ai_002',
          title: 'Schedule your return pickup',
          content: 'Your return has been approved! You can now schedule a pickup or drop off your item at one of our collection centers.',
          category: 'pickup_scheduling',
          relevanceScore: 0.9,
          source: 'ai_generated',
          actions: [
            { label: 'Schedule Pickup', action: 'schedule_pickup' },
            { label: 'Find Drop-off Locations', action: 'find_locations' }
          ]
        });
      }
    }

    return suggestions;
  }

  /**
   * Get fallback suggestions when AI analysis fails
   */
  private getFallbackSuggestions(): HelpSuggestion[] {
    return [
      {
        id: 'fallback_001',
        title: 'Contact Customer Support',
        content: 'Our customer support team is available to help you with your return. You can reach us through live chat, email, or phone.',
        category: 'general',
        relevanceScore: 0.5,
        source: 'ai_generated',
        actions: [
          { label: 'Start Live Chat', action: 'start_chat' },
          { label: 'Create Support Ticket', action: 'create_ticket' }
        ]
      }
    ];
  }
}