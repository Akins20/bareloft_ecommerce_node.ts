// src/services/support/SupportMessageService.ts
import { 
  SupportMessageType,
  SupportChannelType,
  SupportMessageDirection
} from '@prisma/client';
import { BaseService } from '../BaseService';
import { 
  SupportMessageRepository,
  SupportTicketRepository,
  MessageFilters,
  MessageWithDetails 
} from '@/repositories';
import { PaginationOptions, PaginatedResult, ApiResponse, AppError, HTTP_STATUS } from '@/types';
import { NotificationService } from '@/services/notifications';
import { EmailService } from '@/services/notifications/EmailService';
import { SMSService } from '@/services/notifications/SMSService';
import { validateNigerianPhoneNumber } from '@/utils/helpers/nigerian';

export interface CreateMessageRequest {
  ticketId: string;
  senderId?: string;
  agentId?: string;
  type: SupportMessageType;
  channel: SupportChannelType;
  direction: SupportMessageDirection;
  subject?: string;
  content: string;
  htmlContent?: string;
  attachments?: string[];
  isInternal?: boolean;
  replyToId?: string;
  template?: string;
  metadata?: any;
}

export interface SendReplyRequest {
  ticketId: string;
  agentId: string;
  content: string;
  htmlContent?: string;
  attachments?: string[];
  isInternal?: boolean;
  template?: string;
  channel?: SupportChannelType;
}

export interface BulkMessageOperation {
  messageIds: string[];
  operation: 'mark_read' | 'mark_unread' | 'delete';
}

export interface TemplateVariables {
  customerName?: string;
  ticketNumber?: string;
  agentName?: string;
  orderNumber?: string;
  issueDescription?: string;
  resolutionSteps?: string;
  estimatedResolution?: string;
  contactInfo?: string;
  [key: string]: any;
}

export class SupportMessageService extends BaseService {
  constructor(
    private messageRepository: SupportMessageRepository,
    private ticketRepository: SupportTicketRepository,
    private notificationService: NotificationService,
    private emailService: EmailService,
    private smsService: SMSService
  ) {
    super();
  }

  async createMessage(data: CreateMessageRequest): Promise<ApiResponse<MessageWithDetails>> {
    try {
      // Verify ticket exists
      const ticket = await this.ticketRepository.findById(data.ticketId);
      if (!ticket) {
        throw new AppError(
          'Ticket not found',
          HTTP_STATUS.NOT_FOUND,
          'TICKET_NOT_FOUND'
        );
      }

      // Create the message
      const message = await this.messageRepository.create(data);

      // Update ticket's last reply timestamp
      await this.db.supportTicket.update({
        where: { id: data.ticketId },
        data: { 
          lastReplyAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // If this is an agent's first response, record the first response time
      if (data.agentId && data.direction === SupportMessageDirection.OUTGOING && 
          !ticket.firstResponseTime) {
        const responseTime = new Date().getTime() - ticket.createdAt.getTime();
        await this.db.supportTicket.update({
          where: { id: data.ticketId },
          data: { firstResponseTime: new Date() },
        });
      }

      // Send notifications and multi-channel delivery
      if (!data.isInternal) {
        await this.deliverMessage(message.id, data.channel);
      }

      const messageWithDetails = await this.messageRepository.findById(message.id);

      return this.createSuccessResponse(
        messageWithDetails!,
        'Message created successfully',
        HTTP_STATUS.CREATED
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to create message',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'MESSAGE_CREATION_FAILED'
      );
    }
  }

  async sendReply(data: SendReplyRequest): Promise<ApiResponse<MessageWithDetails>> {
    try {
      const ticket = await this.ticketRepository.findById(data.ticketId);
      if (!ticket) {
        throw new AppError(
          'Ticket not found',
          HTTP_STATUS.NOT_FOUND,
          'TICKET_NOT_FOUND'
        );
      }

      // Apply template if specified
      let content = data.content;
      let htmlContent = data.htmlContent;

      if (data.template) {
        const templatedContent = await this.applyTemplate(data.template, {
          customerName: `${ticket.customer.firstName} ${ticket.customer.lastName}`,
          ticketNumber: ticket.ticketNumber,
          agentName: ticket.assignedAgent ? 
            `${ticket.assignedAgent.user.firstName} ${ticket.assignedAgent.user.lastName}` : 
            'Support Agent',
        });

        content = templatedContent.content;
        htmlContent = templatedContent.htmlContent;
      }

      // Create the reply message
      const message = await this.messageRepository.create({
        ticketId: data.ticketId,
        agentId: data.agentId,
        type: SupportMessageType.MESSAGE,
        channel: data.channel || SupportChannelType.EMAIL,
        direction: SupportMessageDirection.OUTGOING,
        content,
        htmlContent,
        attachments: data.attachments,
        isInternal: data.isInternal || false,
        template: data.template,
      });

      // Update ticket status if it was waiting for agent response
      if (ticket.status === 'WAITING_FOR_INTERNAL') {
        await this.ticketRepository.updateStatus(
          data.ticketId, 
          'IN_PROGRESS' as any,
          data.agentId
        );
      }

      // Deliver message through appropriate channel
      if (!data.isInternal) {
        await this.deliverMessage(message.id, data.channel || SupportChannelType.EMAIL);
      }

      const messageWithDetails = await this.messageRepository.findById(message.id);

      return this.createSuccessResponse(
        messageWithDetails!,
        'Reply sent successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to send reply',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'REPLY_SEND_FAILED'
      );
    }
  }

  async getMessage(id: string): Promise<ApiResponse<MessageWithDetails>> {
    try {
      const message = await this.messageRepository.findById(id);

      if (!message) {
        throw new AppError(
          'Message not found',
          HTTP_STATUS.NOT_FOUND,
          'MESSAGE_NOT_FOUND'
        );
      }

      return this.createSuccessResponse(message, 'Message retrieved successfully');
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to retrieve message',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'MESSAGE_RETRIEVAL_FAILED'
      );
    }
  }

  async getTicketMessages(
    ticketId: string,
    includeInternal = false,
    pagination?: PaginationOptions
  ): Promise<ApiResponse<PaginatedResult<MessageWithDetails> | MessageWithDetails[]>> {
    try {
      // Verify ticket exists
      const ticket = await this.ticketRepository.findById(ticketId);
      if (!ticket) {
        throw new AppError(
          'Ticket not found',
          HTTP_STATUS.NOT_FOUND,
          'TICKET_NOT_FOUND'
        );
      }

      const messages = await this.messageRepository.findByTicketId(
        ticketId,
        includeInternal,
        pagination
      );

      return this.createSuccessResponse(
        messages,
        'Ticket messages retrieved successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to retrieve ticket messages',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'TICKET_MESSAGES_RETRIEVAL_FAILED'
      );
    }
  }

  async getMessages(
    filters: MessageFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<ApiResponse<PaginatedResult<MessageWithDetails>>> {
    try {
      const messages = await this.messageRepository.findMany(filters, pagination);
      return this.createSuccessResponse(messages, 'Messages retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve messages',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'MESSAGES_RETRIEVAL_FAILED'
      );
    }
  }

  async markAsRead(messageId: string): Promise<ApiResponse<any>> {
    try {
      await this.messageRepository.markAsRead(messageId);
      return this.createSuccessResponse(null, 'Message marked as read');
    } catch (error) {
      throw new AppError(
        'Failed to mark message as read',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'MESSAGE_READ_FAILED'
      );
    }
  }

  async markTicketMessagesAsRead(
    ticketId: string,
    excludeInternal = false
  ): Promise<ApiResponse<any>> {
    try {
      await this.messageRepository.markTicketMessagesAsRead(ticketId, excludeInternal);
      return this.createSuccessResponse(null, 'Ticket messages marked as read');
    } catch (error) {
      throw new AppError(
        'Failed to mark ticket messages as read',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'TICKET_MESSAGES_READ_FAILED'
      );
    }
  }

  async bulkOperation(operation: BulkMessageOperation): Promise<ApiResponse<any>> {
    try {
      switch (operation.operation) {
        case 'mark_read':
          await this.messageRepository.markMultipleAsRead(operation.messageIds);
          break;
        case 'mark_unread':
          await this.db.supportTicketMessage.updateMany({
            where: { id: { in: operation.messageIds } },
            data: { isRead: false, readAt: null },
          });
          break;
        case 'delete':
          await Promise.all(
            operation.messageIds.map(id => this.messageRepository.deleteMessage(id))
          );
          break;
        default:
          throw new AppError(
            'Invalid bulk operation',
            HTTP_STATUS.BAD_REQUEST,
            'INVALID_OPERATION'
          );
      }

      return this.createSuccessResponse(
        null,
        `Bulk ${operation.operation} operation completed successfully`
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to perform bulk operation',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'BULK_OPERATION_FAILED'
      );
    }
  }

  async getMessageStats(ticketId?: string): Promise<ApiResponse<any>> {
    try {
      const stats = await this.messageRepository.getMessageStats(ticketId);
      return this.createSuccessResponse(stats, 'Message statistics retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve message statistics',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'MESSAGE_STATS_RETRIEVAL_FAILED'
      );
    }
  }

  async sendWhatsAppMessage(
    ticketId: string,
    agentId: string,
    content: string,
    phoneNumber: string
  ): Promise<ApiResponse<any>> {
    try {
      // Validate Nigerian phone number
      const validatedPhone = validateNigerianPhoneNumber(phoneNumber);
      if (!validatedPhone.isValid) {
        throw new AppError(
          'Invalid Nigerian phone number',
          HTTP_STATUS.BAD_REQUEST,
          'INVALID_PHONE_NUMBER'
        );
      }

      // Create message record
      const message = await this.createMessage({
        ticketId,
        agentId,
        type: SupportMessageType.MESSAGE,
        channel: SupportChannelType.WHATSAPP,
        direction: SupportMessageDirection.OUTGOING,
        content,
        metadata: { phoneNumber: validatedPhone.formatted },
      });

      // Send via WhatsApp (implement WhatsApp Business API integration)
      await this.sendWhatsAppBusinessMessage(validatedPhone.formatted, content);

      return this.createSuccessResponse(
        message.data,
        'WhatsApp message sent successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to send WhatsApp message',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'WHATSAPP_SEND_FAILED'
      );
    }
  }

  async sendSMSMessage(
    ticketId: string,
    agentId: string,
    content: string,
    phoneNumber: string
  ): Promise<ApiResponse<any>> {
    try {
      // Validate Nigerian phone number
      const validatedPhone = validateNigerianPhoneNumber(phoneNumber);
      if (!validatedPhone.isValid) {
        throw new AppError(
          'Invalid Nigerian phone number',
          HTTP_STATUS.BAD_REQUEST,
          'INVALID_PHONE_NUMBER'
        );
      }

      // Create message record
      const message = await this.createMessage({
        ticketId,
        agentId,
        type: SupportMessageType.MESSAGE,
        channel: SupportChannelType.SMS,
        direction: SupportMessageDirection.OUTGOING,
        content,
        metadata: { phoneNumber: validatedPhone.formatted },
      });

      // Send SMS
      await this.smsService.sendSMS(validatedPhone.formatted, content);

      return this.createSuccessResponse(
        message.data,
        'SMS message sent successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to send SMS message',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'SMS_SEND_FAILED'
      );
    }
  }

  private async deliverMessage(messageId: string, channel: SupportChannelType): Promise<void> {
    try {
      const message = await this.messageRepository.findById(messageId);
      if (!message) return;

      const ticket = await this.ticketRepository.findById(message.ticketId);
      if (!ticket) return;

      switch (channel) {
        case SupportChannelType.EMAIL:
          await this.emailService.sendTicketMessage(
            ticket.customer.email!,
            message.subject || `Re: ${ticket.subject}`,
            message.htmlContent || message.content,
            message.attachments as string[] || []
          );
          break;

        case SupportChannelType.SMS:
          if (ticket.customer.phoneNumber) {
            await this.smsService.sendSMS(
              ticket.customer.phoneNumber,
              message.content
            );
          }
          break;

        case SupportChannelType.WHATSAPP:
          if (ticket.customer.phoneNumber) {
            await this.sendWhatsAppBusinessMessage(
              ticket.customer.phoneNumber,
              message.content
            );
          }
          break;

        case SupportChannelType.IN_APP:
          await this.notificationService.sendInAppNotification(
            ticket.customerId,
            'New message on your support ticket',
            message.content
          );
          break;
      }

      // Update delivery status
      await this.messageRepository.updateDeliveryStatus(messageId, new Date());
    } catch (error) {
      console.error('Message delivery failed:', error);
    }
  }

  private async applyTemplate(
    templateName: string,
    variables: TemplateVariables
  ): Promise<{ content: string; htmlContent?: string }> {
    try {
      const template = await this.db.supportTemplate.findFirst({
        where: {
          name: templateName,
          isActive: true,
        },
      });

      if (!template) {
        return { content: '', htmlContent: undefined };
      }

      let content = template.content;
      let htmlContent = template.htmlContent;

      // Replace template variables
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        content = content.replace(new RegExp(placeholder, 'g'), String(value || ''));
        if (htmlContent) {
          htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), String(value || ''));
        }
      });

      // Update template usage count
      await this.db.supportTemplate.update({
        where: { id: template.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      return { content, htmlContent };
    } catch (error) {
      console.error('Template application failed:', error);
      return { content: '', htmlContent: undefined };
    }
  }

  private async sendWhatsAppBusinessMessage(phoneNumber: string, content: string): Promise<void> {
    // Implement WhatsApp Business API integration
    // This would typically integrate with WhatsApp Business API
    // For now, we'll log the message
    console.log(`WhatsApp message to ${phoneNumber}: ${content}`);
    
    // In a real implementation, you would:
    // 1. Use WhatsApp Business API
    // 2. Handle message templates
    // 3. Manage conversation sessions
    // 4. Process webhooks for delivery status
  }
}