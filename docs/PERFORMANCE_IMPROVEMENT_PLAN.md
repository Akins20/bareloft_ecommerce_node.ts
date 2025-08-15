# Performance Improvement & Background Processing Plan

## Executive Summary

This document outlines a comprehensive plan to improve the Bareloft e-commerce platform's performance, user experience, and scalability through enhanced token management and a robust background job processing system.

## Current Issues

### 1. Token Management Problems
- JWT tokens expire in 1 hour causing frequent logouts
- Poor user experience with constant re-authentication
- Token refresh process is not optimized
- Users lose session during active browsing

### 2. Performance Bottlenecks
- Email sending blocks API responses
- Notification processing slows down requests
- Analytics calculations happen in real-time
- Cache updates block user interactions
- Background tasks mixed with user-facing operations

## 🔐 Token Management Strategy

### Current State
```typescript
// Current problematic configuration
JWT_EXPIRY: '1h'         // Too short
REFRESH_TOKEN_EXPIRY: '7d'
```

### Recommended Solution: Sliding Session with Activity-Based Extension

#### Implementation Strategy
```typescript
// New configuration
export const AUTH_CONFIG = {
  JWT_EXPIRY: '7d',           // Initial 7-day expiry
  REFRESH_THRESHOLD: '1d',     // Extend if < 1 day remaining
  EXTENSION_PERIOD: '3d',      // Add 3 more days on activity
  MAX_INACTIVE_DAYS: 7,        // Auto-logout after 7 days inactive
  SLIDING_WINDOW: true         // Enable sliding session
};
```

#### Benefits
- ✅ Users stay logged in while active (up to 7 days)
- ✅ Automatic logout for inactive users (security)
- ✅ No frontend changes required
- ✅ Reduced server load from token refreshes
- ✅ Better user experience

#### Security Considerations
- Track last activity timestamp
- Implement device fingerprinting
- Add suspicious activity detection
- Maintain session audit logs

## 🤖 CRON System Architecture

### Phase 1: Background Task Categories

#### High Priority Tasks (Move First)
```typescript
interface HighPriorityJobs {
  email: {
    - welcomeEmails: 'Send new user welcome emails',
    - orderConfirmations: 'Order confirmation emails', 
    - otpEmails: 'OTP verification emails',
    - marketingCampaigns: 'Promotional email campaigns'
  },
  notifications: {
    - pushNotifications: 'Mobile push notifications',
    - inAppNotifications: 'In-app notification delivery',
    - smsNotifications: 'SMS notifications for orders'
  },
  analytics: {
    - userActivity: 'Track user interaction events',
    - productViews: 'Record product view analytics',
    - salesMetrics: 'Calculate real-time sales data'
  }
}
```

#### Medium Priority Tasks
```typescript
interface MediumPriorityJobs {
  caching: {
    - productDataCache: 'Update product information cache',
    - categoryTreeCache: 'Rebuild category hierarchy cache',
    - searchIndexUpdate: 'Update search indices',
    - priceCalculations: 'Recalculate dynamic pricing'
  },
  maintenance: {
    - sessionCleanup: 'Remove expired sessions',
    - logRotation: 'Rotate and compress log files',
    - tempFileCleanup: 'Clean temporary uploaded files',
    - databaseOptimization: 'Database maintenance tasks'
  }
}
```

#### Low Priority Tasks
```typescript
interface LowPriorityJobs {
  reporting: {
    - dailyReports: 'Generate daily sales reports',
    - weeklyReports: 'Weekly performance analytics',
    - customerInsights: 'Customer behavior analysis',
    - performanceMetrics: 'System performance reporting'
  }
}
```

### Phase 2: Job Queue System Design

#### Technology Stack
- **Primary**: Bull Queue (Redis-based) - Scalable, reliable
- **Alternative**: Agenda (MongoDB-based) - Simpler setup
- **Fallback**: Node-cron - Basic scheduled tasks

#### Job Architecture
```typescript
enum JobType {
  EMAIL = 'email',
  NOTIFICATION = 'notification',
  ANALYTICS = 'analytics', 
  CACHE_UPDATE = 'cache_update',
  MAINTENANCE = 'maintenance',
  REPORTING = 'reporting'
}

enum JobPriority {
  CRITICAL = 0,  // Process immediately (OTP emails)
  HIGH = 1,      // Process within 30 seconds  
  MEDIUM = 5,    // Process within 5 minutes
  LOW = 10,      // Process within 1 hour
  BATCH = 20     // Process during off-peak hours
}

interface JobData {
  type: JobType;
  priority: JobPriority;
  payload: any;
  userId?: string;
  orderId?: string;
  attemptCount: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledFor?: Date;
}
```

#### Queue Configuration
```typescript
// Queue setup per job type
const queueConfig = {
  email: {
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: 'exponential'
    }
  },
  notification: {
    defaultJobOptions: {
      removeOnComplete: 200,
      removeOnFail: 100, 
      attempts: 5,
      backoff: 'fixed'
    }
  }
};
```

### Phase 3: Migration Strategy

#### Week 1-2: Infrastructure Setup
**Deliverables:**
- [ ] Install and configure Bull Queue + Redis
- [ ] Create job worker architecture
- [ ] Set up job monitoring dashboard
- [ ] Implement error handling and retry logic
- [ ] Add job queue health checks

**Technical Tasks:**
```bash
npm install bull @types/bull ioredis @types/ioredis
npm install bull-board @types/bull-board  # Monitoring dashboard
```

#### Week 3-4: Email System Migration
**Deliverables:**
- [ ] Move all email sending to background jobs
- [ ] Implement email template system
- [ ] Add email delivery status tracking
- [ ] Create email retry mechanism
- [ ] Add email analytics

**Technical Implementation:**
```typescript
// Before: Blocking email send
await emailService.sendWelcomeEmail(user.email);
res.json({ success: true });

// After: Non-blocking job queue
await emailQueue.add('send-welcome-email', {
  userId: user.id,
  email: user.email,
  template: 'welcome'
});
res.json({ success: true }); // Returns immediately
```

#### Week 5-6: Notification System
**Deliverables:**
- [ ] Migrate notification creation to background jobs
- [ ] Implement real-time notification delivery
- [ ] Add notification preferences system
- [ ] Create notification analytics
- [ ] Add push notification support

#### Week 7-8: Analytics & Caching
**Deliverables:**
- [ ] Move analytics processing to background
- [ ] Implement smart caching system
- [ ] Add cache invalidation strategies
- [ ] Create performance monitoring
- [ ] Add real-time dashboard updates

## 📊 Expected Performance Improvements

### Before Implementation
- Average API response time: 800ms - 2000ms
- Email sending blocks responses: 3-5 seconds
- Concurrent user limit: ~500 users
- Database query bottlenecks during peak hours
- Memory usage spikes during analytics calculations

### After Implementation
- Average API response time: 150ms - 400ms (60-70% improvement)
- Immediate API responses: < 200ms
- Concurrent user capacity: 5000+ users
- Background processing handles heavy operations
- Optimized memory usage patterns

### Key Metrics Tracking
```typescript
interface PerformanceMetrics {
  apiResponseTimes: {
    p50: number;
    p95: number; 
    p99: number;
  };
  jobProcessingTimes: {
    email: number;
    notifications: number;
    analytics: number;
  };
  systemResources: {
    cpuUsage: number;
    memoryUsage: number;
    redisConnections: number;
  };
  userExperience: {
    sessionDuration: number;
    bounceRate: number;
    errorRate: number;
  };
}
```

## 🎯 Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- **Day 1**: Fix token expiry configuration
- **Day 2-3**: Install and configure job queue system
- **Day 4-5**: Create job worker infrastructure
- **Week 2**: Add monitoring and error handling

### Phase 2: Core Migrations (Week 3-6)
- **Week 3**: Email system background processing
- **Week 4**: Email templates and delivery tracking
- **Week 5**: Notification system migration
- **Week 6**: Real-time notification delivery

### Phase 3: Optimization (Week 7-10)
- **Week 7**: Analytics background processing
- **Week 8**: Smart caching implementation
- **Week 9**: Performance monitoring setup
- **Week 10**: Testing and optimization

### Phase 4: Advanced Features (Week 11-12)
- **Week 11**: Advanced job scheduling
- **Week 12**: Production deployment and monitoring

## 🛠 Technical Implementation Details

### Token Management Implementation
```typescript
// New JWT middleware with sliding session
export const slidingSessionMiddleware = async (req, res, next) => {
  const token = extractTokenFromRequest(req);
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // Check if token needs extension
  const timeUntilExpiry = decoded.exp - Date.now() / 1000;
  const shouldExtend = timeUntilExpiry < (24 * 60 * 60); // < 1 day
  
  if (shouldExtend) {
    // Extend token expiry in database (no new token needed)
    await updateTokenExpiry(decoded.jti, '3d');
  }
  
  // Update last activity
  await updateLastActivity(decoded.userId);
  next();
};
```

### Job Queue Implementation
```typescript
// Job processor example
export const emailJobProcessor = async (job: Job) => {
  const { type, payload } = job.data;
  
  try {
    switch (type) {
      case 'welcome-email':
        await sendWelcomeEmail(payload);
        break;
      case 'order-confirmation':
        await sendOrderConfirmation(payload);
        break;
    }
    
    // Update job status
    await job.progress(100);
    return { status: 'completed' };
    
  } catch (error) {
    // Log error and potentially retry
    console.error('Email job failed:', error);
    throw error;
  }
};
```

## 🔍 Monitoring & Observability

### Key Monitoring Points
- Job queue health and processing times
- API response time improvements
- User session duration increases
- Error rates and retry patterns
- Resource usage optimization

### Alerting Thresholds
- Job queue backlog > 1000 items
- API response time > 1 second  
- Job failure rate > 5%
- Redis memory usage > 80%

## 📈 Success Criteria

### Performance Targets
- [ ] API response times under 400ms (95th percentile)
- [ ] Zero email-related API blocking
- [ ] Support 5000+ concurrent users
- [ ] Job processing latency < 30 seconds for high priority
- [ ] 99.9% job completion rate

### User Experience Targets
- [ ] Users stay logged in for entire sessions (no forced logouts)
- [ ] Immediate API responses for all user actions
- [ ] Real-time notifications delivered within 5 seconds
- [ ] Zero user-facing downtime during deployments

## 🚧 Risk Management

### Technical Risks
- **Redis downtime**: Implement Redis clustering
- **Job queue failures**: Add job persistence
- **Memory leaks**: Implement proper job cleanup
- **Token security**: Add token rotation for suspicious activity

### Mitigation Strategies
- Gradual rollout with feature flags
- Comprehensive monitoring and alerting
- Rollback procedures for each phase
- Load testing before production deployment

---

**Document Version**: 1.0  
**Created**: 2025-08-14  
**Last Updated**: 2025-08-14  
**Next Review**: 2025-08-21