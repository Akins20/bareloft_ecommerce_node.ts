// src/services/support/SupportAgentService.ts
import { 
  SupportAgentStatus, 
  SupportDepartment,
  SupportSkillLevel,
  PeriodType
} from '@prisma/client';
import { BaseService } from '../BaseService';
import { 
  SupportAgentRepository,
  AgentFilters,
  AgentWithDetails 
} from '@/repositories';
import { PaginationOptions, PaginatedResult, ApiResponse, AppError, HTTP_STATUS } from '@/types';
import { IDGenerators } from '@/utils/helpers/generators';
import { NotificationService } from '@/services/notifications';

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

export interface UpdateAgentRequest {
  department?: SupportDepartment;
  specializations?: string[];
  languages?: string[];
  skillLevel?: SupportSkillLevel;
  maxConcurrentTickets?: number;
  workingHours?: any;
  timeZone?: string;
}

export interface AgentScheduleRequest {
  agentId: string;
  scheduleDate: Date;
  shiftType: string;
  startTime: Date;
  endTime: Date;
  breakStartTime?: Date;
  breakEndTime?: Date;
  notes?: string;
}

export interface AgentPerformanceMetrics {
  agentId: string;
  periodStart: Date;
  periodEnd: Date;
  periodType: PeriodType;
  ticketsAssigned: number;
  ticketsResolved: number;
  ticketsEscalated: number;
  averageResponseTime?: number;
  averageResolutionTime?: number;
  firstContactResolution: number;
  customerSatisfactionAvg?: number;
  slaCompliance?: number;
  totalWorkingHours?: number;
  productivityScore?: number;
  qualityScore?: number;
}

export class SupportAgentService extends BaseService {
  constructor(
    private agentRepository: SupportAgentRepository,
    private notificationService: NotificationService
  ) {
    super();
  }

  async createAgent(data: CreateAgentRequest): Promise<ApiResponse<AgentWithDetails>> {
    try {
      // Check if user is already an agent
      const existingAgent = await this.agentRepository.findByUserId(data.userId);
      if (existingAgent) {
        throw new AppError(
          'User is already a support agent',
          HTTP_STATUS.BAD_REQUEST,
          'AGENT_ALREADY_EXISTS'
        );
      }

      // Generate unique agent number
      const agentNumber = IDGenerators.generateAgentNumber(data.department.toString());

      // Validate Nigerian business hours for working hours
      this.validateWorkingHours(data.workingHours);

      // Create agent
      const agent = await this.agentRepository.create({
        userId: data.userId,
        agentNumber,
        department: data.department,
        specializations: data.specializations,
        languages: data.languages,
        skillLevel: data.skillLevel,
        maxConcurrentTickets: data.maxConcurrentTickets || 10,
        workingHours: data.workingHours,
        timeZone: data.timeZone || 'Africa/Lagos',
      });

      // Send welcome notification
      await this.notificationService.sendAgentOnboardingNotification(agent.id);

      const agentWithDetails = await this.agentRepository.findById(agent.id);

      return this.createSuccessResponse(
        agentWithDetails!,
        'Support agent created successfully',
        HTTP_STATUS.CREATED
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to create support agent',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AGENT_CREATION_FAILED'
      );
    }
  }

  async getAgent(id: string): Promise<ApiResponse<AgentWithDetails>> {
    try {
      const agent = await this.agentRepository.findById(id);

      if (!agent) {
        throw new AppError(
          'Agent not found',
          HTTP_STATUS.NOT_FOUND,
          'AGENT_NOT_FOUND'
        );
      }

      return this.createSuccessResponse(agent, 'Agent retrieved successfully');
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to retrieve agent',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AGENT_RETRIEVAL_FAILED'
      );
    }
  }

  async getAgents(
    filters: AgentFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<ApiResponse<PaginatedResult<AgentWithDetails>>> {
    try {
      const agents = await this.agentRepository.findMany(filters, pagination);
      return this.createSuccessResponse(agents, 'Agents retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve agents',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AGENTS_RETRIEVAL_FAILED'
      );
    }
  }

  async updateAgent(
    id: string, 
    data: UpdateAgentRequest
  ): Promise<ApiResponse<AgentWithDetails>> {
    try {
      const agent = await this.agentRepository.findById(id);

      if (!agent) {
        throw new AppError(
          'Agent not found',
          HTTP_STATUS.NOT_FOUND,
          'AGENT_NOT_FOUND'
        );
      }

      // Validate working hours if provided
      if (data.workingHours) {
        this.validateWorkingHours(data.workingHours);
      }

      // Update agent data
      const updatePromises = [];

      if (data.specializations) {
        updatePromises.push(
          this.agentRepository.updateSpecializations(id, data.specializations)
        );
      }

      if (data.languages) {
        updatePromises.push(
          this.agentRepository.updateLanguages(id, data.languages)
        );
      }

      if (data.workingHours) {
        updatePromises.push(
          this.agentRepository.updateWorkingHours(id, data.workingHours)
        );
      }

      // Update other fields
      if (Object.keys(data).some(key => !['specializations', 'languages', 'workingHours'].includes(key))) {
        const otherUpdates = Object.fromEntries(
          Object.entries(data).filter(([key]) => 
            !['specializations', 'languages', 'workingHours'].includes(key)
          )
        );

        updatePromises.push(
          this.db.supportAgent.update({
            where: { id },
            data: otherUpdates,
          })
        );
      }

      await Promise.all(updatePromises);

      const updatedAgent = await this.agentRepository.findById(id);

      return this.createSuccessResponse(
        updatedAgent!,
        'Agent updated successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to update agent',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AGENT_UPDATE_FAILED'
      );
    }
  }

  async updateAgentStatus(
    id: string,
    status: SupportAgentStatus
  ): Promise<ApiResponse<AgentWithDetails>> {
    try {
      const agent = await this.agentRepository.findById(id);

      if (!agent) {
        throw new AppError(
          'Agent not found',
          HTTP_STATUS.NOT_FOUND,
          'AGENT_NOT_FOUND'
        );
      }

      await this.agentRepository.updateStatus(id, status);

      // Send status change notification if going offline with active tickets
      if (status === SupportAgentStatus.OFFLINE && agent.currentTicketCount > 0) {
        await this.notificationService.sendAgentOfflineWithTicketsNotification(id);
      }

      const updatedAgent = await this.agentRepository.findById(id);

      return this.createSuccessResponse(
        updatedAgent!,
        'Agent status updated successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to update agent status',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AGENT_STATUS_UPDATE_FAILED'
      );
    }
  }

  async getAvailableAgents(
    department?: SupportDepartment,
    skillLevel?: SupportSkillLevel,
    specialization?: string
  ): Promise<ApiResponse<AgentWithDetails[]>> {
    try {
      const agents = await this.agentRepository.getAvailableAgents(
        department,
        skillLevel,
        specialization
      );

      return this.createSuccessResponse(
        agents,
        'Available agents retrieved successfully'
      );
    } catch (error) {
      throw new AppError(
        'Failed to retrieve available agents',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AVAILABLE_AGENTS_RETRIEVAL_FAILED'
      );
    }
  }

  async scheduleAgent(schedule: AgentScheduleRequest): Promise<ApiResponse<any>> {
    try {
      const agent = await this.agentRepository.findById(schedule.agentId);

      if (!agent) {
        throw new AppError(
          'Agent not found',
          HTTP_STATUS.NOT_FOUND,
          'AGENT_NOT_FOUND'
        );
      }

      // Validate schedule doesn't conflict with existing shifts
      const existingShift = await this.db.supportAgentShift.findUnique({
        where: {
          agentId_shiftDate: {
            agentId: schedule.agentId,
            shiftDate: schedule.scheduleDate,
          },
        },
      });

      if (existingShift) {
        throw new AppError(
          'Agent already has a shift scheduled for this date',
          HTTP_STATUS.BAD_REQUEST,
          'SHIFT_CONFLICT'
        );
      }

      // Create shift schedule
      const shift = await this.db.supportAgentShift.create({
        data: {
          agentId: schedule.agentId,
          shiftDate: schedule.scheduleDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStartTime: schedule.breakStartTime,
          breakEndTime: schedule.breakEndTime,
          shiftType: schedule.shiftType as any,
          status: 'SCHEDULED',
          notes: schedule.notes,
        },
      });

      // Send schedule notification
      await this.notificationService.sendAgentScheduleNotification(schedule.agentId, shift.id);

      return this.createSuccessResponse(
        shift,
        'Agent scheduled successfully',
        HTTP_STATUS.CREATED
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to schedule agent',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AGENT_SCHEDULE_FAILED'
      );
    }
  }

  async getAgentPerformance(
    agentId: string,
    periodType: PeriodType = PeriodType.MONTHLY,
    periods = 6
  ): Promise<ApiResponse<any[]>> {
    try {
      const agent = await this.agentRepository.findById(agentId);

      if (!agent) {
        throw new AppError(
          'Agent not found',
          HTTP_STATUS.NOT_FOUND,
          'AGENT_NOT_FOUND'
        );
      }

      const performanceReports = await this.db.supportAgentPerformance.findMany({
        where: {
          agentId,
          periodType,
        },
        orderBy: {
          periodStart: 'desc',
        },
        take: periods,
      });

      return this.createSuccessResponse(
        performanceReports,
        'Agent performance retrieved successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to retrieve agent performance',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AGENT_PERFORMANCE_RETRIEVAL_FAILED'
      );
    }
  }

  async recordPerformanceMetrics(
    metrics: AgentPerformanceMetrics
  ): Promise<ApiResponse<any>> {
    try {
      const agent = await this.agentRepository.findById(metrics.agentId);

      if (!agent) {
        throw new AppError(
          'Agent not found',
          HTTP_STATUS.NOT_FOUND,
          'AGENT_NOT_FOUND'
        );
      }

      // Create or update performance record
      const performance = await this.db.supportAgentPerformance.upsert({
        where: {
          agentId_periodStart_periodEnd_periodType: {
            agentId: metrics.agentId,
            periodStart: metrics.periodStart,
            periodEnd: metrics.periodEnd,
            periodType: metrics.periodType,
          },
        },
        create: metrics,
        update: {
          ticketsAssigned: metrics.ticketsAssigned,
          ticketsResolved: metrics.ticketsResolved,
          ticketsEscalated: metrics.ticketsEscalated,
          averageResponseTime: metrics.averageResponseTime,
          averageResolutionTime: metrics.averageResolutionTime,
          firstContactResolution: metrics.firstContactResolution,
          customerSatisfactionAvg: metrics.customerSatisfactionAvg,
          slaCompliance: metrics.slaCompliance,
          totalWorkingHours: metrics.totalWorkingHours,
          productivityScore: metrics.productivityScore,
          qualityScore: metrics.qualityScore,
        },
      });

      // Update agent's overall performance metrics
      await this.agentRepository.updatePerformanceMetrics(metrics.agentId, {
        totalTicketsResolved: agent.totalTicketsResolved + metrics.ticketsResolved,
        averageResolutionTime: metrics.averageResolutionTime,
        averageResponseTime: metrics.averageResponseTime,
        customerSatisfactionRate: metrics.customerSatisfactionAvg ? 
          metrics.customerSatisfactionAvg / 5 : undefined,
        performanceRating: this.calculateOverallRating(metrics),
      });

      return this.createSuccessResponse(
        performance,
        'Performance metrics recorded successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to record performance metrics',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'PERFORMANCE_RECORDING_FAILED'
      );
    }
  }

  async deactivateAgent(id: string, reason: string): Promise<ApiResponse<AgentWithDetails>> {
    try {
      const agent = await this.agentRepository.findById(id);

      if (!agent) {
        throw new AppError(
          'Agent not found',
          HTTP_STATUS.NOT_FOUND,
          'AGENT_NOT_FOUND'
        );
      }

      // Check if agent has active tickets
      if (agent.currentTicketCount > 0) {
        throw new AppError(
          'Cannot deactivate agent with active tickets',
          HTTP_STATUS.BAD_REQUEST,
          'AGENT_HAS_ACTIVE_TICKETS'
        );
      }

      await this.agentRepository.deactivateAgent(id);

      // Send deactivation notification
      await this.notificationService.sendAgentDeactivationNotification(id, reason);

      const deactivatedAgent = await this.agentRepository.findById(id);

      return this.createSuccessResponse(
        deactivatedAgent!,
        'Agent deactivated successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to deactivate agent',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AGENT_DEACTIVATION_FAILED'
      );
    }
  }

  async activateAgent(id: string): Promise<ApiResponse<AgentWithDetails>> {
    try {
      const agent = await this.agentRepository.findById(id);

      if (!agent) {
        throw new AppError(
          'Agent not found',
          HTTP_STATUS.NOT_FOUND,
          'AGENT_NOT_FOUND'
        );
      }

      await this.agentRepository.activateAgent(id);

      // Send activation notification
      await this.notificationService.sendAgentActivationNotification(id);

      const activatedAgent = await this.agentRepository.findById(id);

      return this.createSuccessResponse(
        activatedAgent!,
        'Agent activated successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to activate agent',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AGENT_ACTIVATION_FAILED'
      );
    }
  }

  async getAgentStats(): Promise<ApiResponse<any>> {
    try {
      const stats = await this.agentRepository.getAgentStats();
      return this.createSuccessResponse(stats, 'Agent statistics retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve agent statistics',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AGENT_STATS_RETRIEVAL_FAILED'
      );
    }
  }

  private validateWorkingHours(workingHours: any): void {
    const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    for (const day of requiredDays) {
      if (!workingHours[day] || !workingHours[day].start || !workingHours[day].end) {
        throw new AppError(
          `Working hours must be specified for ${day}`,
          HTTP_STATUS.BAD_REQUEST,
          'INVALID_WORKING_HOURS'
        );
      }

      // Validate Nigerian business hours (typically 8 AM - 6 PM WAT)
      const start = new Date(`2023-01-01T${workingHours[day].start}`);
      const end = new Date(`2023-01-01T${workingHours[day].end}`);

      if (start >= end) {
        throw new AppError(
          `Invalid working hours for ${day}: start time must be before end time`,
          HTTP_STATUS.BAD_REQUEST,
          'INVALID_TIME_RANGE'
        );
      }
    }
  }

  private calculateOverallRating(metrics: AgentPerformanceMetrics): number {
    let rating = 3.0; // Base rating

    // Factor in resolution rate
    const resolutionRate = metrics.ticketsResolved / Math.max(metrics.ticketsAssigned, 1);
    rating += (resolutionRate - 0.8) * 2; // +/- 0.4 based on resolution rate

    // Factor in customer satisfaction
    if (metrics.customerSatisfactionAvg) {
      rating += (metrics.customerSatisfactionAvg - 3) * 0.5; // +/- 1.0 based on satisfaction
    }

    // Factor in SLA compliance
    if (metrics.slaCompliance) {
      rating += (metrics.slaCompliance - 0.85) * 2; // +/- 0.3 based on SLA compliance
    }

    // Factor in escalation rate (lower is better)
    const escalationRate = metrics.ticketsEscalated / Math.max(metrics.ticketsAssigned, 1);
    rating -= escalationRate * 2; // -0.4 for high escalation rates

    return Math.max(1.0, Math.min(5.0, rating));
  }
}