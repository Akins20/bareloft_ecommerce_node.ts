# Customer Support Ticket System - Implementation Documentation

## Overview

This document provides comprehensive documentation for the Customer Support Ticket System implemented for the Bareloft Nigerian E-commerce Platform. The system enables efficient customer service management with Nigerian market-specific features and multi-channel support.

## System Architecture

### Layered Architecture Pattern

```
┌─────────────────────────────────────────┐
│              API Routes Layer           │
│     /api/admin/support/*                │
├─────────────────────────────────────────┤
│            Controllers Layer            │
│     AdminSupportController              │
├─────────────────────────────────────────┤
│             Services Layer              │
│  TicketService | AgentService          │
│  MessageService | AnalyticsService     │
│  KnowledgeBaseService                   │
├─────────────────────────────────────────┤
│           Repositories Layer            │
│  TicketRepo | AgentRepo | MessageRepo  │
│  KnowledgeBaseRepo                      │
├─────────────────────────────────────────┤
│            Database Layer               │
│     PostgreSQL with Prisma ORM         │
└─────────────────────────────────────────┘
```

## Database Schema

### Core Models

#### SupportTicket
- **Purpose**: Main ticket entity
- **Key Fields**: ticketNumber, subject, description, status, priority, category
- **Nigerian Features**: language support, state region tracking
- **Relations**: Customer, Agent, Messages, Order, ReturnRequest

#### SupportAgent
- **Purpose**: Support agent management
- **Key Fields**: agentNumber, department, specializations, languages
- **Performance Tracking**: ticketsResolved, responseTime, satisfaction
- **Scheduling**: workingHours with Nigerian business hours support

#### SupportTicketMessage
- **Purpose**: Communication history
- **Channels**: Email, SMS, WhatsApp, Phone, In-App
- **Features**: Threading, templates, attachments
- **Nigerian Support**: Multi-language content

#### SupportKnowledgeBase
- **Purpose**: Self-service articles
- **Nigerian Content**: Payment guides, local carrier info
- **Languages**: English, Hausa, Yoruba, Igbo, Pidgin
- **SEO**: Slug, keywords, view tracking

#### SupportNigerianFeature
- **Purpose**: Nigerian market-specific data
- **Features**: State tracking, payment channels, USSD codes
- **Cultural Context**: Holiday considerations, business hours

## API Endpoints

### Ticket Management

#### `GET /api/admin/support/tickets`
**Purpose**: List all support tickets with advanced filtering

**Query Parameters**:
```typescript
{
  page?: number;           // Pagination
  limit?: number;          // Items per page
  status?: string[];       // Filter by status
  priority?: string[];     // Filter by priority
  category?: string[];     // Filter by category
  assignedAgentId?: string; // Filter by agent
  customerId?: string;     // Filter by customer
  source?: string[];       // Filter by channel
  language?: string[];     // Filter by language
  createdAfter?: string;   // Date filter
  createdBefore?: string;  // Date filter
  slaBreached?: boolean;   // SLA filter
  search?: string;         // Full-text search
  tags?: string[];         // Tag filter
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    items: TicketWithDetails[],
    total: number,
    page: number,
    limit: number,
    pages: number
  }
}
```

#### `POST /api/admin/support/tickets`
**Purpose**: Create new support ticket

**Request Body**:
```typescript
{
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
  };
}
```

#### `PUT /api/admin/support/tickets/:ticketId/status`
**Purpose**: Update ticket status with automatic notifications

**Request Body**:
```typescript
{
  status: SupportTicketStatus;
  reason?: string;
}
```

#### `POST /api/admin/support/tickets/:ticketId/assign`
**Purpose**: Assign ticket to support agent

**Request Body**:
```typescript
{
  agentId: string;
  reason?: string;
}
```

#### `POST /api/admin/support/tickets/:ticketId/escalate`
**Purpose**: Escalate ticket to higher level support

**Request Body**:
```typescript
{
  fromAgentId?: string;
  toAgentId?: string;
  escalationType: EscalationType;
  reason: string;
  priority: SupportTicketPriority;
  urgencyLevel: UrgencyLevel;
  notes?: string;
}
```

#### `POST /api/admin/support/tickets/:ticketId/reply`
**Purpose**: Send reply to customer via multiple channels

**Request Body**:
```typescript
{
  content: string;
  htmlContent?: string;
  attachments?: string[];
  isInternal?: boolean;
  template?: string;
  channel?: SupportChannelType;
}
```

### Agent Management

#### `GET /api/admin/support/agents`
**Purpose**: List support agents with filtering

#### `POST /api/admin/support/agents`
**Purpose**: Create new support agent

**Request Body**:
```typescript
{
  userId: string;
  department: SupportDepartment;
  specializations: string[];
  languages: string[];
  skillLevel: SupportSkillLevel;
  maxConcurrentTickets?: number;
  workingHours: {
    monday: { start: string; end: string; breakStart?: string; breakEnd?: string };
    tuesday: { start: string; end: string; breakStart?: string; breakEnd?: string };
    // ... other days
  };
  timeZone?: string; // Default: "Africa/Lagos"
}
```

#### `GET /api/admin/support/agents/:agentId/performance`
**Purpose**: Get detailed agent performance metrics

**Response**:
```typescript
{
  success: true,
  data: [
    {
      periodType: "MONTHLY",
      ticketsResolved: number,
      averageResponseTime: number,
      customerSatisfactionAvg: number,
      slaCompliance: number,
      createdAt: Date
    }
  ]
}
```

#### `POST /api/admin/support/agents/schedule`
**Purpose**: Schedule agent shifts with Nigerian business hours

### Knowledge Base Management

#### `GET /api/admin/support/knowledge-base`
**Purpose**: Manage knowledge base articles

#### `POST /api/admin/support/knowledge-base`
**Purpose**: Create new article

**Request Body**:
```typescript
{
  title: string;
  content: string;
  summary?: string;
  category: SupportTicketCategory;
  language: SupportLanguage;
  tags?: string[];
  isPublic?: boolean;
  isFeatured?: boolean;
  searchKeywords?: string;
}
```

### Analytics and Reporting

#### `GET /api/admin/support/analytics/overview`
**Purpose**: Comprehensive support performance overview

**Response**:
```typescript
{
  ticketStats: {
    total: number,
    open: number,
    inProgress: number,
    resolved: number,
    slaBreached: number
  },
  agentStats: {
    total: number,
    active: number,
    available: number,
    averageTicketLoad: number
  },
  responseTimeMetrics: {
    averageFirstResponse: number,
    averageResolutionTime: number,
    slaCompliance: number
  },
  satisfactionMetrics: {
    averageRating: number,
    totalSurveys: number,
    responseRate: number,
    nps: number
  },
  channelDistribution: Record<string, number>,
  categoryDistribution: Record<string, number>
}
```

## Nigerian Market Features

### Language Support
- **English**: Primary language
- **Pidgin**: Nigerian Pidgin English
- **Hausa**: Northern Nigeria
- **Yoruba**: Southwest Nigeria
- **Igbo**: Southeast Nigeria

### Payment Channel Integration
- **USSD Codes**: *737#, *894#, *901#, *919#, *966#
- **Bank Transfer**: Nigerian bank account validation
- **Mobile Money**: MTN, Airtel, 9mobile wallets
- **POS**: Point of sale terminals
- **QR Codes**: Quick response payments

### Business Hours Configuration
```typescript
{
  timezone: "Africa/Lagos",
  workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  standardHours: {
    start: "08:00",
    end: "17:00"
  },
  holidays: [
    { date: "2024-01-01", name: "New Year's Day", type: "national" },
    { date: "2024-10-01", name: "Independence Day", type: "national" },
    // Eid, Christmas, regional holidays
  ],
  regionalAdjustments: {
    "LAGOS": {
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    }
  }
}
```

### Cultural Considerations
- **Greeting Customs**: Respectful acknowledgments
- **Communication Style**: Professional yet friendly
- **Religious Sensitivity**: Appropriate scheduling around prayers
- **Regional Variations**: State-specific business practices

## Multi-Channel Communication

### Supported Channels

#### Email
- **Templates**: Professional HTML templates
- **Attachments**: File support up to 25MB
- **Threading**: Automatic conversation threading
- **Delivery**: SMTP with tracking

#### SMS
- **Providers**: Nigerian SMS gateways
- **Format**: Plain text, 160 characters
- **Delivery**: Real-time with status updates
- **Shortcodes**: Custom sender IDs

#### WhatsApp Business
- **API**: WhatsApp Business API integration
- **Templates**: Pre-approved message templates
- **Media**: Image, document, location sharing
- **Status**: Read receipts, delivery confirmation

#### Phone
- **Call Logging**: Automatic call recording
- **Notes**: Call summary and outcomes
- **Follow-up**: Scheduled callback system
- **Integration**: VoIP system compatibility

#### In-App Notifications
- **Real-time**: WebSocket connections
- **Push**: Mobile app notifications
- **Badge**: Unread message counts
- **Deep Links**: Direct navigation to tickets

## Ticket Workflow and SLA Management

### Status Transitions
```
OPEN → IN_PROGRESS → WAITING_FOR_CUSTOMER → RESOLVED → CLOSED
                  ↓
              WAITING_FOR_INTERNAL → IN_PROGRESS
                  ↓
              ESCALATED (priority change)
```

### SLA Rules

#### Priority-Based SLA
- **CRITICAL**: 1 hour response, 4 hours resolution
- **HIGH**: 2 hours response, 8 hours resolution
- **MEDIUM**: 4 hours response, 24 hours resolution
- **LOW**: 8 hours response, 72 hours resolution

#### Nigerian Business Hours
- **Working Days**: Monday - Friday
- **Working Hours**: 08:00 - 17:00 WAT
- **Holiday Exclusions**: Nigerian national holidays
- **Regional Adjustments**: State-specific variations

#### SLA Breach Handling
- **Automatic Escalation**: When SLA thresholds are exceeded
- **Manager Notification**: Email alerts to supervisors
- **Priority Adjustment**: Automatic priority increase
- **Reporting**: SLA compliance tracking

## Performance Metrics and Analytics

### Agent Performance
- **Response Time**: First response and average response
- **Resolution Time**: Average ticket resolution
- **Customer Satisfaction**: Post-resolution surveys
- **Ticket Volume**: Assigned vs resolved tickets
- **Escalation Rate**: Percentage of escalated tickets
- **SLA Compliance**: Percentage meeting SLA targets

### System Performance
- **Ticket Volume**: Daily, weekly, monthly trends
- **Channel Distribution**: Usage across communication channels
- **Category Analysis**: Most common issue types
- **Geographic Distribution**: Issues by Nigerian state
- **Resolution Patterns**: Common resolution paths

### Customer Satisfaction
- **CSAT**: Customer Satisfaction Score (1-5 scale)
- **NPS**: Net Promoter Score (-100 to +100)
- **FCR**: First Contact Resolution rate
- **Feedback**: Qualitative customer comments
- **Survey Response**: Response rate tracking

## Security and Compliance

### Data Protection
- **Encryption**: AES-256 for data at rest
- **Transmission**: TLS 1.3 for data in transit
- **Access Control**: Role-based permissions
- **Audit Logging**: Complete activity tracking
- **Data Retention**: Configurable retention policies

### Nigerian Compliance
- **NDPR**: Nigeria Data Protection Regulation
- **Privacy**: Customer consent management
- **Data Localization**: Nigerian data residency options
- **Consumer Protection**: Federal Competition and Consumer Protection Act

### Authentication
- **JWT Tokens**: Secure authentication
- **Session Management**: Multi-session support
- **Two-Factor Authentication**: Optional 2FA
- **API Keys**: Service-to-service authentication

## Integration Points

### Existing Systems
- **User Management**: Seamless user integration
- **Order System**: Automatic ticket creation for order issues
- **Payment System**: Paystack integration for payment-related tickets
- **Inventory System**: Stock-related issue tracking
- **Shipping System**: Delivery problem management

### External Services
- **Email Providers**: SMTP, SendGrid, Mailgun
- **SMS Gateways**: Nigerian SMS providers
- **WhatsApp API**: Meta Business API
- **Cloud Storage**: File attachments storage
- **Analytics**: Custom reporting and dashboards

## Deployment and Configuration

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/bareloft_ecommerce"

# Redis (for caching)
REDIS_URL="redis://localhost:6379"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="noreply@bareloft.com"
SMTP_PASS="app-specific-password"

# SMS Configuration
SMS_PROVIDER="nigerian_sms_gateway"
SMS_API_KEY="your-sms-api-key"
SMS_SENDER_ID="BARELOFT"

# WhatsApp Configuration
WHATSAPP_API_URL="https://graph.facebook.com/v18.0"
WHATSAPP_ACCESS_TOKEN="your-whatsapp-token"
WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"

# Support System
SUPPORT_ADMIN_EMAIL="support-admin@bareloft.com"
SUPPORT_DEFAULT_SLA_HOURS="24"
SUPPORT_MAX_ATTACHMENTS="5"
SUPPORT_MAX_ATTACHMENT_SIZE="25MB"
```

### Database Migration
```bash
# Generate Prisma client
npm run db:generate

# Create migration
npm run db:migrate -- --name support_system

# Deploy to production
npm run db:migrate:prod
```

### Testing
```bash
# Run support system tests
npm test -- support-system.test.ts

# Run integration tests
npm run test:integration

# Run full test suite
npm test
```

## Usage Examples

### Creating a Ticket (Admin)
```javascript
const ticketData = {
  subject: "Payment Issue with GTBank USSD",
  description: "Customer unable to complete payment using *737# code",
  category: "PAYMENT_PROBLEMS",
  source: "PHONE",
  customerId: "user_12345",
  nigerianFeatures: {
    stateRegion: "LAGOS",
    customerLanguage: "ENGLISH",
    paymentChannel: "USSD",
    ussdCode: "*737#"
  }
};

const response = await fetch('/api/admin/support/tickets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify(ticketData)
});
```

### Sending Multi-Channel Reply
```javascript
const replyData = {
  content: "Hello! We've resolved your payment issue. Please try the transaction again.",
  channel: "WHATSAPP",
  template: "payment_resolution"
};

await fetch(`/api/admin/support/tickets/${ticketId}/reply`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${agentToken}`
  },
  body: JSON.stringify(replyData)
});
```

### Getting Analytics
```javascript
const analytics = await fetch('/api/admin/support/analytics/overview?startDate=2024-01-01&endDate=2024-01-31', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});

const data = await analytics.json();
console.log('Ticket Stats:', data.ticketStats);
console.log('Agent Performance:', data.agentStats);
```

## Best Practices

### Ticket Management
1. **Quick Response**: Acknowledge tickets within 2 hours
2. **Clear Communication**: Use simple, customer-friendly language
3. **Documentation**: Record all customer interactions
4. **Follow-up**: Ensure customer satisfaction after resolution
5. **Escalation**: Don't hesitate to escalate complex issues

### Agent Performance
1. **Specialization**: Assign tickets based on agent expertise
2. **Load Balancing**: Monitor and distribute workload evenly
3. **Training**: Regular training on Nigerian market specifics
4. **Feedback**: Regular performance reviews and coaching
5. **Recognition**: Acknowledge excellent customer service

### System Maintenance
1. **Regular Backups**: Automated daily backups
2. **Performance Monitoring**: Track response times and availability
3. **Security Updates**: Regular system updates and patches
4. **Data Cleanup**: Archive old tickets and maintain database performance
5. **Disaster Recovery**: Tested disaster recovery procedures

## Troubleshooting

### Common Issues

#### Database Connection Timeout
```
Error: P1002 - Database timeout
Solution: Check PostgreSQL connection and increase timeout settings
```

#### SLA Breach Alerts Not Working
```
Issue: SLA notifications not being sent
Check: Notification service configuration and Nigerian business hours setup
```

#### WhatsApp Messages Not Delivering
```
Issue: WhatsApp API returning errors
Check: API credentials, phone number verification, and message templates
```

#### Agent Performance Calculation Errors
```
Issue: Incorrect performance metrics
Check: Database queries for time zone handling and business hours calculation
```

## Future Enhancements

### Planned Features
1. **AI Chatbot**: Automated first-line support
2. **Voice Recognition**: Phone call transcription
3. **Predictive Analytics**: Ticket volume forecasting
4. **Mobile App**: Dedicated agent mobile application
5. **Integration Hub**: Third-party service integrations

### Nigerian Market Expansions
1. **Additional Languages**: More local languages support
2. **Payment Methods**: New Nigerian payment solutions
3. **Regional Offices**: Support for multiple Nigerian locations
4. **Government Integration**: Compliance with new regulations
5. **Carrier Partnerships**: Direct integrations with Nigerian logistics

---

## Support and Maintenance

For technical support or system issues, contact:
- **Email**: tech-support@bareloft.com
- **Emergency**: +234-800-SUPPORT
- **Documentation**: https://docs.bareloft.com/support

Last Updated: January 2025
Version: 1.0.0