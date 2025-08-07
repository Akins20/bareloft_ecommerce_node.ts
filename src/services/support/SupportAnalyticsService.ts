// src/services/support/SupportAnalyticsService.ts
import { PeriodType, SupportTicketStatus, SupportTicketCategory } from '@prisma/client';
import { BaseService } from '../BaseService';
import { SupportTicketRepository } from '../../repositories/SupportTicketRepository';
import { SupportAgentRepository } from '../../repositories/SupportAgentRepository';
import { SupportMessageRepository } from '../../repositories/SupportMessageRepository';
import { PrismaClient } from '@prisma/client';

// Local type definitions
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

export interface SupportOverviewAnalytics {
  ticketStats: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    slaBreached: number;
  };
  agentStats: {
    total: number;
    active: number;
    available: number;
    busy: number;
    offline: number;
    averageTicketLoad: number;
  };
  responseTimeMetrics: {
    averageFirstResponse: number; // in hours
    averageResolutionTime: number; // in hours
    slaCompliance: number; // percentage
  };
  satisfactionMetrics: {
    averageRating: number;
    totalSurveys: number;
    responseRate: number; // percentage
    nps: number; // Net Promoter Score
  };
  channelDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  trendsData: {
    ticketVolume: Array<{ date: string; count: number }>;
    resolutionRate: Array<{ date: string; rate: number }>;
    satisfactionTrend: Array<{ date: string; rating: number }>;
  };
}

export interface AgentPerformanceAnalytics {
  agentId: string;
  agentName: string;
  department: string;
  performanceScore: number;
  ticketMetrics: {
    assigned: number;
    resolved: number;
    escalated: number;
    resolutionRate: number;
    escalationRate: number;
  };
  timeMetrics: {
    averageResponseTime: number; // in hours
    averageResolutionTime: number; // in hours
    workingHours: number;
    productivity: number; // tickets per hour
  };
  qualityMetrics: {
    customerSatisfaction: number;
    firstContactResolution: number;
    qualityScore: number;
  };
  slaMetrics: {
    compliance: number; // percentage
    breaches: number;
  };
  monthlyTrends: Array<{
    month: string;
    ticketsResolved: number;
    satisfaction: number;
    responseTime: number;
  }>;
}

export interface TicketAnalytics {
  volumeAnalysis: {
    total: number;
    daily: Array<{ date: string; count: number; day: string }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
    hourly: Array<{ hour: number; count: number }>;
  };
  categoryAnalysis: {
    distribution: Record<string, number>;
    resolutionTimes: Record<string, number>;
    satisfactionByCategory: Record<string, number>;
    escalationRates: Record<string, number>;
  };
  priorityAnalysis: {
    distribution: Record<string, number>;
    averageResolutionTime: Record<string, number>;
    slaCompliance: Record<string, number>;
  };
  channelAnalysis: {
    distribution: Record<string, number>;
    responseTime: Record<string, number>;
    resolutionRate: Record<string, number>;
  };
  geographicAnalysis: {
    stateDistribution: Record<string, number>;
    languageDistribution: Record<string, number>;
    paymentChannelIssues: Record<string, number>;
  };
  trends: {
    createdVsResolved: Array<{ date: string; created: number; resolved: number }>;
    backlogTrend: Array<{ date: string; backlog: number }>;
    slaBreachTrend: Array<{ date: string; breaches: number }>;
  };
}

export interface SatisfactionAnalytics {
  overallMetrics: {
    averageRating: number;
    totalResponses: number;
    responseRate: number;
    nps: number;
    csat: number; // Customer Satisfaction Score
  };
  segmentation: {
    byCategory: Record<string, { rating: number; count: number }>;
    byAgent: Record<string, { rating: number; count: number; agentName: string }>;
    byChannel: Record<string, { rating: number; count: number }>;
    byResolutionTime: {
      under24h: { rating: number; count: number };
      '24h-72h': { rating: number; count: number };
      over72h: { rating: number; count: number };
    };
  };
  trends: {
    monthly: Array<{ month: string; rating: number; count: number }>;
    daily: Array<{ date: string; rating: number; count: number }>;
  };
  feedback: {
    commonPraises: Array<{ theme: string; count: number }>;
    commonComplaints: Array<{ theme: string; count: number }>;
    improvementAreas: Array<{ area: string; priority: number }>;
  };
}

export class SupportAnalyticsService extends BaseService {
  protected db: PrismaClient;

  constructor(
    private ticketRepository: SupportTicketRepository,
    private agentRepository: SupportAgentRepository,
    private messageRepository: SupportMessageRepository
  ) {
    super();
    this.db = new PrismaClient();
  }

  // Helper method to create success response
  protected createSuccessResponse<T>(data: T, message: string, statusCode: number = HTTP_STATUS.OK): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  async getSupportOverview(
    startDate?: Date,
    endDate?: Date
  ): Promise<ApiResponse<SupportOverviewAnalytics>> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const [
        ticketStats,
        agentStats,
        responseTimeMetrics,
        satisfactionMetrics,
        channelDistribution,
        categoryDistribution,
        priorityDistribution,
        trendsData,
      ] = await Promise.all([
        this.getTicketOverviewStats(dateFilter),
        this.agentRepository.getAgentStats(),
        this.getResponseTimeMetrics(dateFilter),
        this.getSatisfactionOverview(dateFilter),
        this.getChannelDistribution(dateFilter),
        this.getCategoryDistribution(dateFilter),
        this.getPriorityDistribution(dateFilter),
        this.getTrendsData(dateFilter),
      ]);

      const overview: SupportOverviewAnalytics = {
        ticketStats,
        agentStats,
        responseTimeMetrics,
        satisfactionMetrics,
        channelDistribution,
        categoryDistribution,
        priorityDistribution,
        trendsData,
      };

      return this.createSuccessResponse(
        overview,
        'Support overview analytics retrieved successfully'
      );
    } catch (error) {
      throw new AppError(
        'Failed to retrieve support overview analytics',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'ANALYTICS_OVERVIEW_FAILED'
      );
    }
  }

  async getAgentPerformance(
    agentIds?: string[],
    period: PeriodType = PeriodType.MONTHLY,
    startDate?: Date,
    endDate?: Date
  ): Promise<ApiResponse<AgentPerformanceAnalytics[]>> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);
      const agentFilter = agentIds ? { id: { in: agentIds } } : {};

      const agents = await this.db.supportAgent.findMany({
        where: {
          ...agentFilter,
          isActive: true,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          performanceReports: {
            where: {
              periodType: period,
              ...dateFilter,
            },
            orderBy: {
              periodStart: 'desc',
            },
          },
          assignedTickets: {
            where: {
              ...dateFilter,
            },
          },
        },
      });

      const analyticsPromises = agents.map(async (agent) => {
        const [
          ticketMetrics,
          timeMetrics,
          qualityMetrics,
          slaMetrics,
          monthlyTrends,
        ] = await Promise.all([
          this.getAgentTicketMetrics(agent.id, dateFilter),
          this.getAgentTimeMetrics(agent.id, dateFilter),
          this.getAgentQualityMetrics(agent.id, dateFilter),
          this.getAgentSLAMetrics(agent.id, dateFilter),
          this.getAgentMonthlyTrends(agent.id),
        ]);

        const performanceScore = this.calculatePerformanceScore({
          ticketMetrics,
          timeMetrics,
          qualityMetrics,
          slaMetrics,
        });

        return {
          agentId: agent.id,
          agentName: `${agent.user.firstName} ${agent.user.lastName}`,
          department: agent.department,
          performanceScore,
          ticketMetrics,
          timeMetrics,
          qualityMetrics,
          slaMetrics,
          monthlyTrends,
        };
      });

      const analytics = await Promise.all(analyticsPromises);

      return this.createSuccessResponse(
        analytics,
        'Agent performance analytics retrieved successfully'
      );
    } catch (error) {
      throw new AppError(
        'Failed to retrieve agent performance analytics',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AGENT_ANALYTICS_FAILED'
      );
    }
  }

  async getTicketAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<ApiResponse<TicketAnalytics>> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const [
        volumeAnalysis,
        categoryAnalysis,
        priorityAnalysis,
        channelAnalysis,
        geographicAnalysis,
        trends,
      ] = await Promise.all([
        this.getVolumeAnalysis(dateFilter),
        this.getCategoryAnalysis(dateFilter),
        this.getPriorityAnalysis(dateFilter),
        this.getChannelAnalysis(dateFilter),
        this.getGeographicAnalysis(dateFilter),
        this.getTicketTrends(dateFilter),
      ]);

      const analytics: TicketAnalytics = {
        volumeAnalysis,
        categoryAnalysis,
        priorityAnalysis,
        channelAnalysis,
        geographicAnalysis,
        trends,
      };

      return this.createSuccessResponse(
        analytics,
        'Ticket analytics retrieved successfully'
      );
    } catch (error) {
      throw new AppError(
        'Failed to retrieve ticket analytics',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'TICKET_ANALYTICS_FAILED'
      );
    }
  }

  async getSatisfactionAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<ApiResponse<SatisfactionAnalytics>> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const [
        overallMetrics,
        segmentation,
        trends,
        feedback,
      ] = await Promise.all([
        this.getSatisfactionOverallMetrics(dateFilter),
        this.getSatisfactionSegmentation(dateFilter),
        this.getSatisfactionTrends(dateFilter),
        this.getSatisfactionFeedback(dateFilter),
      ]);

      const analytics: SatisfactionAnalytics = {
        overallMetrics,
        segmentation,
        trends,
        feedback,
      };

      return this.createSuccessResponse(
        analytics,
        'Satisfaction analytics retrieved successfully'
      );
    } catch (error) {
      throw new AppError(
        'Failed to retrieve satisfaction analytics',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'SATISFACTION_ANALYTICS_FAILED'
      );
    }
  }

  async generateReport(
    reportType: 'overview' | 'agents' | 'tickets' | 'satisfaction',
    format: 'json' | 'csv' | 'pdf',
    startDate?: Date,
    endDate?: Date,
    filters?: any
  ): Promise<ApiResponse<{ reportUrl: string; reportId: string }>> {
    try {
      const reportId = `report_${reportType}_${Date.now()}`;
      let data: any;

      // Generate the appropriate report data
      switch (reportType) {
        case 'overview':
          data = await this.getSupportOverview(startDate, endDate);
          break;
        case 'agents':
          data = await this.getAgentPerformance(filters?.agentIds, 'MONTHLY', startDate, endDate);
          break;
        case 'tickets':
          data = await this.getTicketAnalytics(startDate, endDate);
          break;
        case 'satisfaction':
          data = await this.getSatisfactionAnalytics(startDate, endDate);
          break;
        default:
          throw new AppError('Invalid report type', HTTP_STATUS.BAD_REQUEST, 'INVALID_REPORT_TYPE');
      }

      // Generate the report in the requested format
      let reportUrl: string;
      
      switch (format) {
        case 'json':
          reportUrl = await this.generateJSONReport(reportId, data.data);
          break;
        case 'csv':
          reportUrl = await this.generateCSVReport(reportId, data.data);
          break;
        case 'pdf':
          reportUrl = await this.generatePDFReport(reportId, reportType, data.data);
          break;
        default:
          throw new AppError('Invalid report format', HTTP_STATUS.BAD_REQUEST, 'INVALID_REPORT_FORMAT');
      }

      return this.createSuccessResponse(
        { reportUrl, reportId },
        'Report generated successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to generate report',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'REPORT_GENERATION_FAILED'
      );
    }
  }

  // Private helper methods
  private buildDateFilter(startDate?: Date, endDate?: Date): any {
    if (!startDate && !endDate) return {};
    
    const filter: any = {};
    if (startDate) filter.gte = startDate;
    if (endDate) filter.lte = endDate;
    
    return { createdAt: filter };
  }

  private async getTicketOverviewStats(dateFilter: any): Promise<any> {
    const whereClause = dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {};
    
    return {
      total: await this.db.supportTicket.count({ where: whereClause }),
      open: await this.db.supportTicket.count({ 
        where: { ...whereClause, status: SupportTicketStatus.OPEN } 
      }),
      inProgress: await this.db.supportTicket.count({ 
        where: { ...whereClause, status: SupportTicketStatus.IN_PROGRESS } 
      }),
      resolved: await this.db.supportTicket.count({ 
        where: { ...whereClause, status: SupportTicketStatus.RESOLVED } 
      }),
      closed: await this.db.supportTicket.count({ 
        where: { ...whereClause, status: SupportTicketStatus.CLOSED } 
      }),
      slaBreached: await this.db.supportTicket.count({ 
        where: { ...whereClause, slaBreached: true } 
      }),
    };
  }

  private async getResponseTimeMetrics(dateFilter: any): Promise<any> {
    const tickets = await this.db.supportTicket.findMany({
      where: {
        ...dateFilter,
        firstResponseTime: { not: null },
        actualResolution: { not: null },
      },
      select: {
        createdAt: true,
        firstResponseTime: true,
        actualResolution: true,
        slaBreached: true,
      },
    });

    if (tickets.length === 0) {
      return {
        averageFirstResponse: 0,
        averageResolutionTime: 0,
        slaCompliance: 100,
      };
    }

    const firstResponseTimes = tickets
      .filter(t => t.firstResponseTime)
      .map(t => 
        (t.firstResponseTime!.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60)
      );

    const resolutionTimes = tickets
      .filter(t => t.actualResolution)
      .map(t => 
        (t.actualResolution!.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60)
      );

    const slaCompliantTickets = tickets.filter(t => !t.slaBreached).length;

    return {
      averageFirstResponse: firstResponseTimes.length > 0 ? 
        firstResponseTimes.reduce((a, b) => a + b, 0) / firstResponseTimes.length : 0,
      averageResolutionTime: resolutionTimes.length > 0 ? 
        resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0,
      slaCompliance: (slaCompliantTickets / tickets.length) * 100,
    };
  }

  private async getSatisfactionOverview(dateFilter: any): Promise<any> {
    const surveys = await this.db.supportSatisfactionSurvey.findMany({
      where: {
        ...dateFilter,
        isCompleted: true,
      },
    });

    if (surveys.length === 0) {
      return {
        averageRating: 0,
        totalSurveys: 0,
        responseRate: 0,
        nps: 0,
      };
    }

    const totalSurveysSent = await this.db.supportSatisfactionSurvey.count({
      where: dateFilter,
    });

    const averageRating = surveys.reduce((sum, s) => sum + s.rating, 0) / surveys.length;
    const nps = this.calculateNPS(surveys.map(s => s.rating));

    return {
      averageRating,
      totalSurveys: surveys.length,
      responseRate: (surveys.length / totalSurveysSent) * 100,
      nps,
    };
  }

  private async getChannelDistribution(dateFilter: any): Promise<Record<string, number>> {
    const distribution = await this.db.supportTicket.groupBy({
      by: ['source'],
      where: dateFilter,
      _count: true,
    });

    return distribution.reduce((acc, item) => {
      acc[item.source] = item._count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getCategoryDistribution(dateFilter: any): Promise<Record<string, number>> {
    const distribution = await this.db.supportTicket.groupBy({
      by: ['category'],
      where: dateFilter,
      _count: true,
    });

    return distribution.reduce((acc, item) => {
      acc[item.category] = item._count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getPriorityDistribution(dateFilter: any): Promise<Record<string, number>> {
    const distribution = await this.db.supportTicket.groupBy({
      by: ['priority'],
      where: dateFilter,
      _count: true,
    });

    return distribution.reduce((acc, item) => {
      acc[item.priority] = item._count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getTrendsData(dateFilter: any): Promise<any> {
    // Implement trend calculations for ticket volume, resolution rate, and satisfaction
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const ticketVolume = await this.db.supportTicket.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by date and calculate trends
    const volumeByDate = this.groupTicketsByDate(ticketVolume);
    
    return {
      ticketVolume: volumeByDate,
      resolutionRate: [], // Implement resolution rate calculation
      satisfactionTrend: [], // Implement satisfaction trend calculation
    };
  }

  private groupTicketsByDate(tickets: { createdAt: Date }[]): Array<{ date: string; count: number }> {
    const grouped = tickets.reduce((acc, ticket) => {
      const date = ticket.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  }

  private calculateNPS(ratings: number[]): number {
    if (ratings.length === 0) return 0;

    const promoters = ratings.filter(r => r >= 4).length; // 4-5 stars as promoters
    const detractors = ratings.filter(r => r <= 2).length; // 1-2 stars as detractors
    
    return ((promoters - detractors) / ratings.length) * 100;
  }

  private calculatePerformanceScore(metrics: any): number {
    // Implement performance score calculation based on various metrics
    const {
      ticketMetrics: { resolutionRate },
      qualityMetrics: { customerSatisfaction },
      slaMetrics: { compliance },
    } = metrics;

    return (resolutionRate * 0.4 + customerSatisfaction * 0.3 + compliance * 0.3);
  }

  // Placeholder methods for complex analytics calculations
  private async getAgentTicketMetrics(agentId: string, dateFilter: any): Promise<any> {
    // Implement detailed agent ticket metrics calculation
    return {
      assigned: 0,
      resolved: 0,
      escalated: 0,
      resolutionRate: 0,
      escalationRate: 0,
    };
  }

  private async getAgentTimeMetrics(agentId: string, dateFilter: any): Promise<any> {
    // Implement agent time metrics calculation
    return {
      averageResponseTime: 0,
      averageResolutionTime: 0,
      workingHours: 0,
      productivity: 0,
    };
  }

  private async getAgentQualityMetrics(agentId: string, dateFilter: any): Promise<any> {
    // Implement agent quality metrics calculation
    return {
      customerSatisfaction: 0,
      firstContactResolution: 0,
      qualityScore: 0,
    };
  }

  private async getAgentSLAMetrics(agentId: string, dateFilter: any): Promise<any> {
    // Implement agent SLA metrics calculation
    return {
      compliance: 0,
      breaches: 0,
    };
  }

  private async getAgentMonthlyTrends(agentId: string): Promise<any[]> {
    // Implement agent monthly trends calculation
    return [];
  }

  // Additional placeholder methods for comprehensive analytics
  private async getVolumeAnalysis(dateFilter: any): Promise<any> {
    return { total: 0, daily: [], weekly: [], monthly: [], hourly: [] };
  }

  private async getCategoryAnalysis(dateFilter: any): Promise<any> {
    return { distribution: {}, resolutionTimes: {}, satisfactionByCategory: {}, escalationRates: {} };
  }

  private async getPriorityAnalysis(dateFilter: any): Promise<any> {
    return { distribution: {}, averageResolutionTime: {}, slaCompliance: {} };
  }

  private async getChannelAnalysis(dateFilter: any): Promise<any> {
    return { distribution: {}, responseTime: {}, resolutionRate: {} };
  }

  private async getGeographicAnalysis(dateFilter: any): Promise<any> {
    return { stateDistribution: {}, languageDistribution: {}, paymentChannelIssues: {} };
  }

  private async getTicketTrends(dateFilter: any): Promise<any> {
    return { createdVsResolved: [], backlogTrend: [], slaBreachTrend: [] };
  }

  private async getSatisfactionOverallMetrics(dateFilter: any): Promise<any> {
    return { averageRating: 0, totalResponses: 0, responseRate: 0, nps: 0, csat: 0 };
  }

  private async getSatisfactionSegmentation(dateFilter: any): Promise<any> {
    return { byCategory: {}, byAgent: {}, byChannel: {}, byResolutionTime: {} };
  }

  private async getSatisfactionTrends(dateFilter: any): Promise<any> {
    return { monthly: [], daily: [] };
  }

  private async getSatisfactionFeedback(dateFilter: any): Promise<any> {
    return { commonPraises: [], commonComplaints: [], improvementAreas: [] };
  }

  // Report generation methods (simplified implementations)
  private async generateJSONReport(reportId: string, data: any): Promise<string> {
    // In a real implementation, save to file storage and return URL
    return `https://storage.example.com/reports/${reportId}.json`;
  }

  private async generateCSVReport(reportId: string, data: any): Promise<string> {
    // In a real implementation, convert to CSV and save to file storage
    return `https://storage.example.com/reports/${reportId}.csv`;
  }

  private async generatePDFReport(reportId: string, reportType: string, data: any): Promise<string> {
    // In a real implementation, generate PDF and save to file storage
    return `https://storage.example.com/reports/${reportId}.pdf`;
  }
}