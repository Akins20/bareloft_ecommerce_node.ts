// src/types/support.types.ts
import { 
  SupportTicketStatus, 
  SupportTicketPriority, 
  SupportTicketCategory,
  SupportChannelType,
  SupportLanguage,
  SupportAgentStatus,
  SupportDepartment,
  SupportSkillLevel,
  SupportMessageType,
  SupportMessageDirection,
  KnowledgeBaseStatus
} from '@prisma/client';

// Support Ticket Types
export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category: SupportTicketCategory;
  subcategory?: string;
  source: SupportChannelType;
  language: SupportLanguage;
  customerId: string;
  assignedAgentId?: string;
  orderId?: string;
  returnRequestId?: string;
  estimatedResolution?: Date;
  actualResolution?: Date;
  firstResponseTime?: Date;
  resolutionTime?: Date;
  slaBreached: boolean;
  customerSatisfaction?: number;
  satisfactionComment?: string;
  internalNotes?: string;
  tags?: string[];
  metadata?: any;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  escalatedAt?: Date;
  lastReplyAt?: Date;
}

// Support Agent Types
export interface SupportAgent {
  id: string;
  userId: string;
  agentNumber: string;
  department: SupportDepartment;
  specializations: string[];
  languages: string[];
  status: SupportAgentStatus;
  skillLevel: SupportSkillLevel;
  maxConcurrentTickets: number;
  currentTicketCount: number;
  workingHours: any;
  timeZone: string;
  performanceRating?: number;
  totalTicketsResolved: number;
  averageResolutionTime?: number;
  averageResponseTime?: number;
  customerSatisfactionRate?: number;
  isActive: boolean;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Support Message Types
export interface SupportMessage {
  id: string;
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
  isInternal: boolean;
  messageId?: string;
  threadId?: string;
  replyToId?: string;
  isRead: boolean;
  readAt?: Date;
  deliveredAt?: Date;
  template?: string;
  metadata?: any;
  createdAt: Date;
}

// Knowledge Base Types
export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary?: string;
  category: SupportTicketCategory;
  subcategory?: string;
  tags?: string[];
  language: SupportLanguage;
  status: KnowledgeBaseStatus;
  viewCount: number;
  helpfulVotes: number;
  unhelpfulVotes: number;
  isPublic: boolean;
  isFeatured: boolean;
  publishedAt?: Date;
  authorId: string;
  lastUpdatedBy?: string;
  searchKeywords?: string;
  relatedArticles?: string[];
  attachments?: string[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

// Support Analytics Types
export interface SupportTicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  slaBreached: number;
}

export interface SupportAgentStats {
  total: number;
  active: number;
  available: number;
  busy: number;
  offline: number;
  averageTicketLoad: number;
}

export interface SupportResponseTimeMetrics {
  averageFirstResponse: number;
  averageResolutionTime: number;
  slaCompliance: number;
}

export interface SupportSatisfactionMetrics {
  averageRating: number;
  totalSurveys: number;
  responseRate: number;
  nps: number;
}

// Request/Response Types
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

export interface CreateAgentRequest {
  userId: string;
  department: SupportDepartment;
  specializations: string[];
  languages: string[];
  skillLevel: SupportSkillLevel;
  maxConcurrentTickets?: number;
  workingHours: {
    monday: { start: string; end: string; breakStart?: string; breakEnd?: string };
    tuesday: { start: string; end: string; breakStart?: string; breakEnd?: string };
    wednesday: { start: string; end: string; breakStart?: string; breakEnd?: string };
    thursday: { start: string; end: string; breakStart?: string; breakEnd?: string };
    friday: { start: string; end: string; breakStart?: string; breakEnd?: string };
    saturday?: { start: string; end: string; breakStart?: string; breakEnd?: string };
    sunday?: { start: string; end: string; breakStart?: string; breakEnd?: string };
  };
  timeZone?: string;
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

export interface CreateKnowledgeBaseRequest {
  title: string;
  content: string;
  summary?: string;
  category: SupportTicketCategory;
  subcategory?: string;
  tags?: string[];
  language: SupportLanguage;
  isPublic?: boolean;
  isFeatured?: boolean;
  authorId: string;
  searchKeywords?: string;
  relatedArticles?: string[];
  attachments?: string[];
  metadata?: any;
}

// Nigerian Market Specific Types
export interface NigerianSupportFeatures {
  id: string;
  ticketId: string;
  stateRegion?: string;
  customerLanguage?: string;
  paymentChannel?: string;
  shippingCarrier?: string;
  bankIssue?: string;
  ussdCode?: string;
  culturalContext?: any;
  localHolidays?: any;
  businessHoursAdjust?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface NigerianBusinessHours {
  timezone: string;
  workingDays: string[];
  standardHours: {
    start: string;
    end: string;
  };
  holidays: Array<{
    date: string;
    name: string;
    type: 'national' | 'religious' | 'cultural';
  }>;
  regionalAdjustments?: {
    [state: string]: {
      workingDays?: string[];
      hours?: {
        start: string;
        end: string;
      };
    };
  };
}

// Filter Types
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

export interface AgentFilters {
  department?: SupportDepartment[];
  status?: SupportAgentStatus[];
  skillLevel?: SupportSkillLevel[];
  specializations?: string[];
  languages?: string[];
  isActive?: boolean;
  search?: string;
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

// Export all Prisma enums for convenience
export {
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
  SupportChannelType,
  SupportLanguage,
  SupportAgentStatus,
  SupportDepartment,
  SupportSkillLevel,
  SupportMessageType,
  SupportMessageDirection,
  KnowledgeBaseStatus,
};