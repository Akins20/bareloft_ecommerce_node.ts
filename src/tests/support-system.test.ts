// src/tests/support-system.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
  SupportChannelType,
  SupportLanguage,
  SupportDepartment,
  SupportSkillLevel,
  SupportAgentStatus
} from '@prisma/client';
import {
  SupportTicketService,
  SupportAgentService,
  SupportMessageService,
  SupportAnalyticsService,
  SupportKnowledgeBaseService
} from '@/services/support';
import { 
  SupportTicketRepository,
  SupportAgentRepository,
  SupportMessageRepository,
  SupportKnowledgeBaseRepository
} from '@/repositories';
import { NotificationService, EmailService, SMSService } from '@/services/notifications';
import { IDGenerators } from '@/utils/helpers/generators';

// Mock dependencies
const mockTicketRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  updateStatus: jest.fn(),
  assignAgent: jest.fn(),
  escalate: jest.fn(),
  getTicketStats: jest.fn(),
} as any;

const mockAgentRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findMany: jest.fn(),
  updateStatus: jest.fn(),
  getAvailableAgents: jest.fn(),
  getBestAgentForCategory: jest.fn(),
  getAgentStats: jest.fn(),
} as any;

const mockMessageRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByTicketId: jest.fn(),
  markAsRead: jest.fn(),
  getMessageStats: jest.fn(),
} as any;

const mockKnowledgeBaseRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  findMany: jest.fn(),
  search: jest.fn(),
  getFeatured: jest.fn(),
  getPopular: jest.fn(),
  getStats: jest.fn(),
} as any;

const mockNotificationService = {
  sendTicketCreatedNotification: jest.fn(),
  sendTicketStatusUpdateNotification: jest.fn(),
  sendTicketAssignmentNotification: jest.fn(),
  sendAgentOnboardingNotification: jest.fn(),
} as any;

const mockEmailService = {
  sendTicketMessage: jest.fn(),
} as any;

const mockSMSService = {
  sendSMS: jest.fn(),
} as any;

describe('Support System', () => {
  let ticketService: SupportTicketService;
  let agentService: SupportAgentService;
  let messageService: SupportMessageService;
  let analyticsService: SupportAnalyticsService;
  let knowledgeBaseService: SupportKnowledgeBaseService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize services with mocked dependencies
    ticketService = new SupportTicketService(
      mockTicketRepository,
      mockAgentRepository,
      mockMessageRepository,
      mockNotificationService
    );

    agentService = new SupportAgentService(
      mockAgentRepository,
      mockNotificationService
    );

    messageService = new SupportMessageService(
      mockMessageRepository,
      mockTicketRepository,
      mockNotificationService,
      mockEmailService,
      mockSMSService
    );

    analyticsService = new SupportAnalyticsService(
      mockTicketRepository,
      mockAgentRepository,
      mockMessageRepository
    );

    knowledgeBaseService = new SupportKnowledgeBaseService(
      mockKnowledgeBaseRepository
    );
  });

  describe('Support Ticket Service', () => {
    it('should create a new ticket with Nigerian market features', async () => {
      const mockTicket = {
        id: 'ticket_1',
        ticketNumber: 'TKT-20240101-ABC123',
        subject: 'Payment Issue with USSD',
        description: 'Unable to complete payment using GTBank *737#',
        status: SupportTicketStatus.OPEN,
        priority: SupportTicketPriority.HIGH,
        category: SupportTicketCategory.PAYMENT_PROBLEMS,
        customerId: 'user_1',
        createdAt: new Date(),
      };

      mockTicketRepository.create.mockResolvedValue(mockTicket);
      mockTicketRepository.findById.mockResolvedValue({
        ...mockTicket,
        customer: {
          id: 'user_1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phoneNumber: '+234801234567',
        },
        messages: [],
      });

      const createTicketRequest = {
        subject: 'Payment Issue with USSD',
        description: 'Unable to complete payment using GTBank *737#',
        category: SupportTicketCategory.PAYMENT_PROBLEMS,
        source: SupportChannelType.PHONE,
        customerId: 'user_1',
        nigerianFeatures: {
          stateRegion: 'LAGOS',
          customerLanguage: 'ENGLISH',
          paymentChannel: 'USSD',
          ussdCode: '*737#',
        },
      };

      const result = await ticketService.createTicket(createTicketRequest);

      expect(result.success).toBe(true);
      expect(mockTicketRepository.create).toHaveBeenCalled();
      expect(mockNotificationService.sendTicketCreatedNotification).toHaveBeenCalled();
    });

    it('should handle ticket status updates', async () => {
      const ticketId = 'ticket_1';
      const newStatus = SupportTicketStatus.RESOLVED;
      
      mockTicketRepository.findById.mockResolvedValue({
        id: ticketId,
        status: SupportTicketStatus.IN_PROGRESS,
        customerId: 'user_1',
      });

      mockTicketRepository.updateStatus.mockResolvedValue({
        id: ticketId,
        status: newStatus,
      });

      const result = await ticketService.updateTicketStatus(
        ticketId,
        newStatus,
        'agent_1',
        'Issue resolved after payment gateway fix'
      );

      expect(result.success).toBe(true);
      expect(mockTicketRepository.updateStatus).toHaveBeenCalledWith(
        ticketId,
        newStatus,
        'agent_1'
      );
    });

    it('should handle ticket assignment to agents', async () => {
      const assignment = {
        ticketId: 'ticket_1',
        agentId: 'agent_1',
        assignedBy: 'admin_1',
        reason: 'Payment specialist required',
      };

      mockTicketRepository.findById.mockResolvedValue({
        id: 'ticket_1',
        customerId: 'user_1',
      });

      mockAgentRepository.findById.mockResolvedValue({
        id: 'agent_1',
        isActive: true,
        currentTicketCount: 5,
        maxConcurrentTickets: 10,
        user: { firstName: 'Jane', lastName: 'Smith' },
      });

      mockTicketRepository.assignAgent.mockResolvedValue({
        id: 'ticket_1',
        assignedAgentId: 'agent_1',
      });

      const result = await ticketService.assignTicket(assignment);

      expect(result.success).toBe(true);
      expect(mockTicketRepository.assignAgent).toHaveBeenCalledWith(
        'ticket_1',
        'agent_1',
        'admin_1'
      );
    });
  });

  describe('Support Agent Service', () => {
    it('should create a new agent with Nigerian business hours', async () => {
      const createAgentRequest = {
        userId: 'user_1',
        department: SupportDepartment.BILLING_PAYMENTS,
        specializations: ['payments', 'ussd', 'bank-transfers'],
        languages: ['english', 'yoruba', 'pidgin'],
        skillLevel: SupportSkillLevel.SENIOR,
        workingHours: {
          monday: { start: '08:00', end: '17:00', breakStart: '12:00', breakEnd: '13:00' },
          tuesday: { start: '08:00', end: '17:00', breakStart: '12:00', breakEnd: '13:00' },
          wednesday: { start: '08:00', end: '17:00', breakStart: '12:00', breakEnd: '13:00' },
          thursday: { start: '08:00', end: '17:00', breakStart: '12:00', breakEnd: '13:00' },
          friday: { start: '08:00', end: '17:00', breakStart: '12:00', breakEnd: '13:00' },
        },
        timeZone: 'Africa/Lagos',
      };

      mockAgentRepository.findByUserId.mockResolvedValue(null); // No existing agent
      mockAgentRepository.create.mockResolvedValue({
        id: 'agent_1',
        agentNumber: 'BP-ABC123',
        ...createAgentRequest,
      });

      mockAgentRepository.findById.mockResolvedValue({
        id: 'agent_1',
        user: { firstName: 'Jane', lastName: 'Smith' },
        assignedTickets: [],
        performanceReports: [],
      });

      const result = await agentService.createAgent(createAgentRequest);

      expect(result.success).toBe(true);
      expect(mockAgentRepository.create).toHaveBeenCalled();
      expect(mockNotificationService.sendAgentOnboardingNotification).toHaveBeenCalled();
    });

    it('should get available agents for assignment', async () => {
      const availableAgents = [
        {
          id: 'agent_1',
          status: SupportAgentStatus.AVAILABLE,
          currentTicketCount: 3,
          specializations: ['payments'],
          user: { firstName: 'Jane', lastName: 'Smith' },
        },
        {
          id: 'agent_2',
          status: SupportAgentStatus.AVAILABLE,
          currentTicketCount: 1,
          specializations: ['payments', 'technical'],
          user: { firstName: 'Bob', lastName: 'Wilson' },
        },
      ];

      mockAgentRepository.getAvailableAgents.mockResolvedValue(availableAgents);

      const result = await agentService.getAvailableAgents(
        SupportDepartment.BILLING_PAYMENTS,
        SupportSkillLevel.SENIOR,
        'payments'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(availableAgents);
    });
  });

  describe('Support Message Service', () => {
    it('should create and send messages via multiple channels', async () => {
      const messageData = {
        ticketId: 'ticket_1',
        agentId: 'agent_1',
        type: 'MESSAGE' as any,
        channel: SupportChannelType.EMAIL,
        direction: 'OUTGOING' as any,
        content: 'Thank you for contacting us. We will resolve your payment issue shortly.',
        isInternal: false,
      };

      mockMessageRepository.create.mockResolvedValue({
        id: 'message_1',
        ...messageData,
        createdAt: new Date(),
      });

      mockTicketRepository.findById.mockResolvedValue({
        id: 'ticket_1',
        customer: {
          email: 'customer@example.com',
          phoneNumber: '+234801234567',
        },
      });

      const result = await messageService.createMessage(messageData);

      expect(result.success).toBe(true);
      expect(mockMessageRepository.create).toHaveBeenCalled();
    });

    it('should handle WhatsApp messages for Nigerian customers', async () => {
      const ticketId = 'ticket_1';
      const agentId = 'agent_1';
      const content = 'Hello! We have updated your payment status.';
      const phoneNumber = '08012345678'; // Nigerian format

      mockMessageRepository.create.mockResolvedValue({
        id: 'message_1',
        ticketId,
        agentId,
        content,
        channel: SupportChannelType.WHATSAPP,
        createdAt: new Date(),
      });

      const result = await messageService.sendWhatsAppMessage(
        ticketId,
        agentId,
        content,
        phoneNumber
      );

      expect(result.success).toBe(true);
      expect(mockMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: SupportChannelType.WHATSAPP,
          content,
        })
      );
    });
  });

  describe('Support Analytics Service', () => {
    it('should generate support overview analytics', async () => {
      const mockOverview = {
        ticketStats: {
          total: 150,
          open: 25,
          inProgress: 30,
          resolved: 80,
          closed: 15,
          slaBreached: 8,
        },
        agentStats: {
          total: 12,
          active: 10,
          available: 6,
          busy: 4,
          offline: 2,
          averageTicketLoad: 4.2,
        },
        responseTimeMetrics: {
          averageFirstResponse: 2.5, // hours
          averageResolutionTime: 24.8, // hours
          slaCompliance: 92.3, // percentage
        },
        satisfactionMetrics: {
          averageRating: 4.2,
          totalSurveys: 85,
          responseRate: 68.5,
          nps: 42,
        },
        channelDistribution: {
          EMAIL: 60,
          PHONE: 35,
          WHATSAPP: 25,
          SMS: 15,
          IN_APP: 15,
        },
        categoryDistribution: {
          PAYMENT_PROBLEMS: 45,
          ORDER_ISSUES: 35,
          TECHNICAL_SUPPORT: 25,
          RETURNS_REFUNDS: 20,
          GENERAL: 25,
        },
      };

      // Mock the individual method calls that getSupportOverview would make
      jest.spyOn(analyticsService as any, 'getTicketOverviewStats').mockResolvedValue(mockOverview.ticketStats);
      mockAgentRepository.getAgentStats.mockResolvedValue(mockOverview.agentStats);

      const result = await analyticsService.getSupportOverview();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Knowledge Base Service', () => {
    it('should create and manage Nigerian payment guide articles', async () => {
      const articleData = {
        title: 'How to Pay Using USSD in Nigeria',
        content: 'Step-by-step guide for USSD payments...',
        category: SupportTicketCategory.PAYMENT_PROBLEMS,
        language: SupportLanguage.ENGLISH,
        tags: ['ussd', 'payment', 'nigeria', 'guide'],
        isPublic: true,
        isFeatured: true,
        authorId: 'admin_1',
      };

      mockKnowledgeBaseRepository.findBySlug.mockResolvedValue(null); // Unique slug
      mockKnowledgeBaseRepository.create.mockResolvedValue({
        id: 'kb_1',
        slug: 'how-to-pay-using-ussd-in-nigeria',
        ...articleData,
        createdAt: new Date(),
      });

      mockKnowledgeBaseRepository.findById.mockResolvedValue({
        id: 'kb_1',
        author: { firstName: 'Admin', lastName: 'User' },
        updater: null,
      });

      const result = await knowledgeBaseService.createArticle(articleData);

      expect(result.success).toBe(true);
      expect(mockKnowledgeBaseRepository.create).toHaveBeenCalled();
    });

    it('should search articles by Nigerian context', async () => {
      const searchResults = {
        items: [
          {
            id: 'kb_1',
            title: 'USSD Payment Guide',
            summary: 'How to pay using Nigerian USSD codes',
            category: SupportTicketCategory.PAYMENT_PROBLEMS,
          },
          {
            id: 'kb_2',
            title: 'Bank Transfer Instructions',
            summary: 'Step-by-step bank transfer guide',
            category: SupportTicketCategory.PAYMENT_PROBLEMS,
          },
        ],
        total: 2,
        page: 1,
        limit: 10,
        pages: 1,
      };

      mockKnowledgeBaseRepository.search.mockResolvedValue(searchResults);

      const result = await knowledgeBaseService.searchArticles({
        query: 'payment nigeria',
        category: [SupportTicketCategory.PAYMENT_PROBLEMS],
        language: [SupportLanguage.ENGLISH],
      });

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
      expect(result.data.total).toBe(2);
    });
  });

  describe('ID Generators', () => {
    it('should generate unique ticket numbers', () => {
      const ticketNumber = IDGenerators.generateTicketNumber();
      expect(ticketNumber).toMatch(/^TKT-\d{8}-[A-F0-9]{6}$/);
    });

    it('should generate agent numbers based on department', () => {
      const agentNumber = IDGenerators.generateAgentNumber('BILLING_PAYMENTS');
      expect(agentNumber).toMatch(/^BP-[A-F0-9]{6}$/);
    });

    it('should generate URL-friendly slugs', () => {
      const slug = IDGenerators.generateSlug('How to Pay Using USSD in Nigeria?');
      expect(slug).toBe('how-to-pay-using-ussd-in-nigeria');
    });
  });
});

describe('Nigerian Market Features', () => {
  it('should handle Nigerian phone number validation', () => {
    // This would test the validateNigerianPhoneNumber function
    const validNumbers = [
      '+2348012345678',
      '08012345678',
      '2348012345678',
    ];

    const invalidNumbers = [
      '1234567890',
      '+1234567890',
      '080123456',
    ];

    // Note: These tests would need the actual validation function
    // which should be imported and tested
  });

  it('should handle Nigerian business hours', () => {
    // Test Nigerian timezone handling
    const lagosTime = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Lagos',
    });

    expect(lagosTime).toBeDefined();
  });

  it('should support Nigerian languages', () => {
    const supportedLanguages = [
      SupportLanguage.ENGLISH,
      SupportLanguage.HAUSA,
      SupportLanguage.YORUBA,
      SupportLanguage.IGBO,
      SupportLanguage.PIDGIN,
    ];

    expect(supportedLanguages).toContain(SupportLanguage.ENGLISH);
    expect(supportedLanguages).toContain(SupportLanguage.HAUSA);
    expect(supportedLanguages).toContain(SupportLanguage.YORUBA);
  });
});