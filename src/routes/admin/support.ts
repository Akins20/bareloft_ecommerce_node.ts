// src/routes/admin/support.ts
import { Router } from 'express';
import { AdminSupportController } from '../../controllers/admin/AdminSupportController';
import { authenticate } from '../../middleware/auth/authenticate';
import { authorize } from '../../middleware/auth/authorize';
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
import { NotificationService } from '../../services/notifications/NotificationService';
import { EmailService } from '../../services/notifications/EmailService';
import { SMSService } from '../../services/auth/SMSService';

const router = Router();

// Initialize services with proper constructors
const ticketRepository = new SupportTicketRepository();
const agentRepository = new SupportAgentRepository();
const messageRepository = new SupportMessageRepository();
const knowledgeBaseRepository = new SupportKnowledgeBaseRepository();

// Initialize services directly with no constructor arguments for now
const notificationService = new NotificationService();
const emailService = new EmailService();
const smsService = new SMSService();

const ticketService = new SupportTicketService();
const agentService = new SupportAgentService();
const messageService = new SupportMessageService();
const analyticsService = new SupportAnalyticsService(
  ticketRepository,
  agentRepository,
  messageRepository
);
const knowledgeBaseService = new SupportKnowledgeBaseService();

const supportController = new AdminSupportController();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN']));

// =================
// TICKET ROUTES
// =================

// List all support tickets with filtering
router.get('/tickets', (req, res) => supportController.getTickets(req, res));

// Get detailed ticket information
router.get('/tickets/:ticketId', (req, res) => supportController.getTicket(req, res));

// Create a new support ticket (admin created)
router.post('/tickets', (req, res) => supportController.createTicket(req, res));

// Update ticket information
router.put('/tickets/:ticketId', (req, res) => supportController.updateTicket(req, res));

// Update ticket status
router.put('/tickets/:ticketId/status', (req, res) => supportController.updateTicketStatus(req, res));

// Assign ticket to agent
router.post('/tickets/:ticketId/assign', (req, res) => supportController.assignTicket(req, res));

// Escalate ticket
router.post('/tickets/:ticketId/escalate', (req, res) => supportController.escalateTicket(req, res));

// Reply to customer ticket
router.post('/tickets/:ticketId/reply', (req, res) => supportController.replyToTicket(req, res));

// View ticket conversation history
router.get('/tickets/:ticketId/history', (req, res) => supportController.getTicketHistory(req, res));

// Merge multiple tickets
router.post('/tickets/merge', (req, res) => supportController.mergeTickets(req, res));

// =================
// AGENT ROUTES
// =================

// List support agents and availability
router.get('/agents', (req, res) => supportController.getAgents(req, res));

// Add new support agent
router.post('/agents', (req, res) => supportController.createAgent(req, res));

// Update agent information
router.put('/agents/:agentId', (req, res) => supportController.updateAgent(req, res));

// Get agent performance metrics
router.get('/agents/:agentId/performance', (req, res) => supportController.getAgentPerformance(req, res));

// Manage agent schedules
router.post('/agents/schedule', (req, res) => supportController.scheduleAgent(req, res));

// ===================
// KNOWLEDGE BASE ROUTES
// ===================

// Manage knowledge base articles
router.get('/knowledge-base', (req, res) => supportController.getKnowledgeBaseArticles(req, res));

// Create new knowledge base article
router.post('/knowledge-base', (req, res) => supportController.createKnowledgeBaseArticle(req, res));

// Update knowledge base article
router.put('/knowledge-base/:articleId', (req, res) => supportController.updateKnowledgeBaseArticle(req, res));

// ===================
// ANALYTICS ROUTES
// ===================

// Support performance overview
router.get('/analytics/overview', (req, res) => supportController.getSupportOverview(req, res));

// Agent performance metrics
router.get('/analytics/agents', (req, res) => supportController.getAgentAnalytics(req, res));

// Ticket analytics and trends
router.get('/analytics/tickets', (req, res) => supportController.getTicketAnalytics(req, res));

// Customer satisfaction scores
router.get('/analytics/satisfaction', (req, res) => supportController.getSatisfactionAnalytics(req, res));

export default router;