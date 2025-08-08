/**
 * Return Shipping Service
 * Manages return shipping, pickup scheduling, and tracking
 * Nigerian e-commerce platform optimized
 */

import { BaseService } from '../BaseService';
import { ReturnRepository } from '../../repositories/ReturnRepository';
import { OrderRepository } from '../../repositories/OrderRepository';
import { AddressRepository } from '../../repositories/AddressRepository';
import { NotificationService } from '../notifications/NotificationService';
import { PrismaClient } from '@prisma/client';
import { 
  ReturnShippingMethod,
  ReturnStatus
} from '../../types/return.types';
import { logger } from '../../utils/logger/winston';
import { generateTrackingNumber } from '../../utils/generators/numberGenerator';
import { validateNigerianPhoneNumber } from '../../utils/validation/phoneValidator';
import { calculateShippingCost } from '../../utils/shipping/shippingCalculator';

interface PickupScheduleData {
  preferredDate: Date;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  specialInstructions?: string;
  contactPhone: string;
}

interface PickupScheduleResult {
  success: boolean;
  message?: string;
  pickupSchedule?: {
    scheduledDate: Date;
    timeSlot: string;
    estimatedWindow: string;
    confirmationNumber: string;
    instructions: string[];
    contactPhone: string;
  };
  confirmationNumber?: string;
}

interface PickupLocation {
  id: string;
  name: string;
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode?: string;
    landmark?: string;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  businessHours: {
    weekdays: { open: string; close: string };
    saturday: { open: string; close: string };
    sunday: { open: string; close: string };
  };
  services: string[];
  contactPhone: string;
  email?: string;
  isActive: boolean;
  capacity: 'low' | 'medium' | 'high';
  averageWaitTime: string;
  features: string[];
}

interface ShippingCostEstimate {
  returnMethods: {
    method: ReturnShippingMethod;
    available: boolean;
    cost: number;
    estimatedTime: string;
    description: string;
    includes: string[];
    restrictions?: string[];
  }[];
  recommendations: {
    fastest: ReturnShippingMethod;
    cheapest: ReturnShippingMethod;
    mostReliable: ReturnShippingMethod;
  };
  factors: {
    distance: string;
    weight: string;
    size: string;
    specialHandling?: string;
  };
  freeShippingThreshold?: number;
  discounts?: {
    type: string;
    description: string;
    savings: number;
  }[];
}

interface ReturnTracking {
  returnId: string;
  trackingNumber: string;
  status: ReturnStatus;
  currentLocation?: string;
  estimatedDelivery?: Date;
  events: {
    timestamp: Date;
    status: string;
    location: string;
    description: string;
    isDelivered: boolean;
  }[];
  carrier: {
    name: string;
    phone: string;
    website?: string;
    trackingUrl?: string;
  };
  shipmentDetails: {
    origin: string;
    destination: string;
    weight?: string;
    dimensions?: string;
    service: string;
  };
}

export class ReturnShippingService extends BaseService {
  private returnRequestRepository: ReturnRepository;
  private orderRepository: OrderRepository;
  private addressRepository: AddressRepository;
  private notificationService: NotificationService;

  constructor() {
    super();
    this.returnRequestRepository = new ReturnRepository();
    this.orderRepository = new OrderRepository(new PrismaClient());
    this.addressRepository = new AddressRepository();
    this.notificationService = new NotificationService();
  }

  // ==================== PICKUP SCHEDULING ====================

  /**
   * Schedule return pickup
   */
  async schedulePickup(
    returnId: string,
    customerId: string,
    scheduleData: PickupScheduleData
  ): Promise<PickupScheduleResult> {
    try {
      // Validate return request
      const returnRequest = await this.returnRequestRepository.findById(returnId);
      if (!returnRequest || returnRequest.customerId !== customerId) {
        return { 
          success: false, 
          message: 'Return request not found or access denied' 
        };
      }

      if (returnRequest.status !== ReturnStatus.APPROVED) {
        return { 
          success: false, 
          message: 'Only approved returns can schedule pickup' 
        };
      }

      // Validate phone number
      if (!validateNigerianPhoneNumber(scheduleData.contactPhone)) {
        return { 
          success: false, 
          message: 'Invalid Nigerian phone number format' 
        };
      }

      // Validate pickup date (must be at least 24 hours from now, max 7 days)
      const now = new Date();
      const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      if (scheduleData.preferredDate < minDate || scheduleData.preferredDate > maxDate) {
        return { 
          success: false, 
          message: 'Pickup date must be between 1-7 days from now' 
        };
      }

      // Generate confirmation number and tracking number
      const confirmationNumber = this.generatePickupConfirmation();
      const trackingNumber = await generateTrackingNumber('RETURN');

      // Calculate time window based on time slot
      const timeWindows = {
        morning: '8:00 AM - 12:00 PM',
        afternoon: '12:00 PM - 4:00 PM',
        evening: '4:00 PM - 8:00 PM'
      };

      const estimatedWindow = timeWindows[scheduleData.timeSlot];

      // Update return request with pickup details
      await this.returnRequestRepository.update(returnId, {
        estimatedPickupDate: scheduleData.preferredDate,
        returnTrackingNumber: trackingNumber,
        customerNotes: scheduleData.specialInstructions
          ? `${returnRequest.customerNotes || ''}\n\nPickup instructions: ${scheduleData.specialInstructions}`
          : returnRequest.customerNotes
      });

      // Create pickup schedule record (in a real system, this would be in the database)
      const pickupSchedule = {
        scheduledDate: scheduleData.preferredDate,
        timeSlot: scheduleData.timeSlot,
        estimatedWindow,
        confirmationNumber,
        instructions: [
          'Please have items ready for pickup at the scheduled time',
          'Ensure items are properly packaged',
          'Have your return confirmation ready',
          'Someone 18+ must be present to hand over items'
        ],
        contactPhone: scheduleData.contactPhone
      };

      // Send SMS confirmation
      await this.notificationService.sendPickupScheduledNotification(
        customerId,
        {
          confirmationNumber,
          scheduledDate: scheduleData.preferredDate,
          timeSlot: scheduleData.timeSlot,
          contactPhone: scheduleData.contactPhone
        }
      );

      // Create timeline event
      await this.returnRequestRepository.addTimelineEvent(returnId, {
        type: 'pickup_scheduled',
        title: 'Pickup Scheduled',
        description: `Pickup scheduled for ${scheduleData.preferredDate.toLocaleDateString()} (${scheduleData.timeSlot})`,
        data: {
          scheduledDate: scheduleData.preferredDate,
          timeSlot: scheduleData.timeSlot,
          confirmationNumber
        },
        isVisible: true
      });

      logger.info('Return pickup scheduled successfully', {
        returnId,
        customerId,
        scheduledDate: scheduleData.preferredDate,
        confirmationNumber
      });

      return {
        success: true,
        pickupSchedule,
        confirmationNumber
      };

    } catch (error) {
      logger.error('Error scheduling return pickup', {
        error: error instanceof Error ? error.message : 'Unknown error',
        returnId,
        customerId
      });
      throw error;
    }
  }

  /**
   * Get pickup/drop-off locations
   */
  async getPickupLocations(filters: {
    state?: string;
    city?: string;
  }): Promise<PickupLocation[]> {
    try {
      // In a real implementation, this would come from database
      const allLocations: PickupLocation[] = [
        {
          id: 'loc_lagos_island',
          name: 'Bareloft Lagos Island Service Center',
          address: {
            addressLine1: '12 Broad Street',
            city: 'Lagos Island',
            state: 'Lagos',
            postalCode: '101001',
            landmark: 'Near First Bank Building'
          },
          coordinates: {
            latitude: 6.4541, 
            longitude: 3.3947
          },
          businessHours: {
            weekdays: { open: '8:00 AM', close: '6:00 PM' },
            saturday: { open: '9:00 AM', close: '4:00 PM' },
            sunday: { open: 'Closed', close: 'Closed' }
          },
          services: ['Return Drop-off', 'Inspection', 'Customer Support'],
          contactPhone: '+2341234567890',
          email: 'lagos-island@bareloft.com',
          isActive: true,
          capacity: 'high',
          averageWaitTime: '5-10 minutes',
          features: ['Air Conditioning', 'Free WiFi', 'Parking Available', 'Wheelchair Accessible']
        },
        {
          id: 'loc_ikeja',
          name: 'Bareloft Ikeja Hub',
          address: {
            addressLine1: '45 Obafemi Awolowo Way',
            city: 'Ikeja',
            state: 'Lagos',
            postalCode: '100271',
            landmark: 'Computer Village Area'
          },
          coordinates: {
            latitude: 6.6018, 
            longitude: 3.3515
          },
          businessHours: {
            weekdays: { open: '8:00 AM', close: '6:00 PM' },
            saturday: { open: '9:00 AM', close: '4:00 PM' },
            sunday: { open: 'Closed', close: 'Closed' }
          },
          services: ['Return Drop-off', 'Inspection', 'Customer Support', 'Express Processing'],
          contactPhone: '+2341234567891',
          email: 'ikeja@bareloft.com',
          isActive: true,
          capacity: 'high',
          averageWaitTime: '10-15 minutes',
          features: ['Air Conditioning', 'Free WiFi', 'Parking Available']
        },
        {
          id: 'loc_abuja',
          name: 'Bareloft Abuja Center',
          address: {
            addressLine1: '23 Aminu Kano Crescent',
            addressLine2: 'Wuse II',
            city: 'Abuja',
            state: 'FCT',
            postalCode: '900211',
            landmark: 'Near Sheraton Hotel'
          },
          coordinates: {
            latitude: 9.0579, 
            longitude: 7.4951
          },
          businessHours: {
            weekdays: { open: '8:00 AM', close: '6:00 PM' },
            saturday: { open: '9:00 AM', close: '4:00 PM' },
            sunday: { open: 'Closed', close: 'Closed' }
          },
          services: ['Return Drop-off', 'Inspection', 'Customer Support'],
          contactPhone: '+2341234567892',
          email: 'abuja@bareloft.com',
          isActive: true,
          capacity: 'medium',
          averageWaitTime: '5-10 minutes',
          features: ['Air Conditioning', 'Free WiFi', 'Parking Available', 'Wheelchair Accessible']
        },
        {
          id: 'loc_portharcourt',
          name: 'Bareloft Port Harcourt Office',
          address: {
            addressLine1: '15 Aba Road',
            city: 'Port Harcourt',
            state: 'Rivers',
            postalCode: '500272',
            landmark: 'Near Mile 1 Market'
          },
          coordinates: {
            latitude: 4.8156, 
            longitude: 7.0498
          },
          businessHours: {
            weekdays: { open: '8:00 AM', close: '6:00 PM' },
            saturday: { open: '9:00 AM', close: '4:00 PM' },
            sunday: { open: 'Closed', close: 'Closed' }
          },
          services: ['Return Drop-off', 'Customer Support'],
          contactPhone: '+2341234567893',
          email: 'portharcourt@bareloft.com',
          isActive: true,
          capacity: 'medium',
          averageWaitTime: '5-10 minutes',
          features: ['Air Conditioning', 'Parking Available']
        },
        {
          id: 'loc_ibadan',
          name: 'Bareloft Ibadan Partner Location',
          address: {
            addressLine1: '78 University Road',
            city: 'Ibadan',
            state: 'Oyo',
            postalCode: '200284',
            landmark: 'Near University of Ibadan'
          },
          businessHours: {
            weekdays: { open: '9:00 AM', close: '5:00 PM' },
            saturday: { open: '10:00 AM', close: '3:00 PM' },
            sunday: { open: 'Closed', close: 'Closed' }
          },
          services: ['Return Drop-off'],
          contactPhone: '+2341234567894',
          isActive: true,
          capacity: 'low',
          averageWaitTime: '15-20 minutes',
          features: ['Basic Facility']
        }
      ];

      // Filter locations based on criteria
      let filteredLocations = allLocations.filter(loc => loc.isActive);

      if (filters.state) {
        filteredLocations = filteredLocations.filter(
          loc => loc.address.state.toLowerCase() === filters.state!.toLowerCase()
        );
      }

      if (filters.city) {
        filteredLocations = filteredLocations.filter(
          loc => loc.address.city.toLowerCase().includes(filters.city!.toLowerCase())
        );
      }

      return filteredLocations;

    } catch (error) {
      logger.error('Error retrieving pickup locations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters
      });
      throw error;
    }
  }

  /**
   * Track return shipment
   */
  async trackReturnShipment(returnId: string, customerId: string): Promise<ReturnTracking | null> {
    try {
      const returnRequest = await this.returnRequestRepository.findById(returnId);
      if (!returnRequest || returnRequest.customerId !== customerId) {
        return null;
      }

      if (!returnRequest.returnTrackingNumber) {
        return null;
      }

      // In a real implementation, this would integrate with courier APIs
      const tracking: ReturnTracking = {
        returnId,
        trackingNumber: returnRequest.returnTrackingNumber,
        status: returnRequest.status as ReturnStatus,
        currentLocation: this.getCurrentLocation(returnRequest.status as ReturnStatus),
        estimatedDelivery: returnRequest.estimatedReturnDate,
        events: this.generateTrackingEvents(returnRequest),
        carrier: {
          name: 'Nigerian Postal Service',
          phone: '+234123456789',
          website: 'https://nipost.gov.ng',
          trackingUrl: `https://track.nipost.gov.ng/${returnRequest.returnTrackingNumber}`
        },
        shipmentDetails: {
          origin: 'Customer Location',
          destination: 'Bareloft Fulfillment Center',
          service: 'Return Pickup Service'
        }
      };

      return tracking;

    } catch (error) {
      logger.error('Error tracking return shipment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        returnId,
        customerId
      });
      throw error;
    }
  }

  /**
   * Get shipping cost estimate
   */
  async getShippingCostEstimate(
    orderId: string,
    customerId: string,
    options: {
      returnMethod?: string;
      pickupState?: string;
    }
  ): Promise<ShippingCostEstimate> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order || order.userId !== customerId) {
        throw new Error('Order not found or access denied');
      }

      const returnMethods = [
        {
          method: ReturnShippingMethod.PICKUP_SERVICE,
          available: this.isPickupAvailable(options.pickupState),
          cost: 0, // Free pickup for most states
          estimatedTime: this.getPickupEstimatedTime(options.pickupState),
          description: 'We pick up the item from your location',
          includes: ['Door-to-door service', 'Tracking', 'Insurance'],
          restrictions: this.isPickupAvailable(options.pickupState) ? undefined : ['Not available in your area']
        },
        {
          method: ReturnShippingMethod.CUSTOMER_DROP_OFF,
          available: true,
          cost: 0, // Free drop-off
          estimatedTime: 'Immediate',
          description: 'Drop off at one of our service centers',
          includes: ['Immediate processing', 'Receipt confirmation', 'Free']
        },
        {
          method: ReturnShippingMethod.COURIER_SERVICE,
          available: true,
          cost: await calculateShippingCost({
            origin: order.shippingAddress.state,
            destination: 'Lagos',
            weight: this.estimateReturnWeight(order),
            service: 'return'
          }),
          estimatedTime: '2-5 business days',
          description: 'Send via courier service of your choice',
          includes: ['Flexible timing', 'Various courier options'],
          restrictions: ['Customer arranges courier', 'Must provide tracking']
        },
        {
          method: ReturnShippingMethod.POSTAL_SERVICE,
          available: true,
          cost: 1500, // Estimated ₦1,500 for postal service
          estimatedTime: '5-10 business days',
          description: 'Send via Nigerian Postal Service',
          includes: ['Affordable option', 'Nationwide coverage'],
          restrictions: ['Longer delivery time', 'Limited tracking']
        }
      ];

      const recommendations = {
        fastest: ReturnShippingMethod.CUSTOMER_DROP_OFF,
        cheapest: ReturnShippingMethod.CUSTOMER_DROP_OFF,
        mostReliable: ReturnShippingMethod.PICKUP_SERVICE
      };

      const factors = {
        distance: this.calculateDistance(order.shippingAddress.state),
        weight: this.estimateReturnWeight(order),
        size: 'Standard package',
        specialHandling: this.requiresSpecialHandling(order) ? 'Fragile items require special care' : undefined
      };

      return {
        returnMethods,
        recommendations,
        factors,
        freeShippingThreshold: 50000,
        discounts: order.total >= 50000 ? [
          {
            type: 'High Value Order',
            description: 'Free return shipping for orders above ₦50,000',
            savings: Math.max(...returnMethods.map(m => m.cost))
          }
        ] : undefined
      };

    } catch (error) {
      logger.error('Error calculating shipping cost estimate', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
        customerId
      });
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  private generatePickupConfirmation(): string {
    const timestamp = Date.now().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `PKP${timestamp}${randomStr}`;
  }

  private getCurrentLocation(status: ReturnStatus): string {
    const locationMap = {
      [ReturnStatus.PENDING]: 'Awaiting pickup',
      [ReturnStatus.APPROVED]: 'Ready for pickup',
      [ReturnStatus.IN_TRANSIT]: 'In transit to fulfillment center',
      [ReturnStatus.RECEIVED]: 'Received at fulfillment center',
      [ReturnStatus.INSPECTED]: 'Inspection completed',
      [ReturnStatus.COMPLETED]: 'Return processed',
      [ReturnStatus.CANCELLED]: 'Return cancelled',
      [ReturnStatus.REJECTED]: 'Return rejected'
    };
    return locationMap[status] || 'Unknown';
  }

  private generateTrackingEvents(returnRequest: any): any[] {
    const events = [];
    
    events.push({
      timestamp: returnRequest.createdAt,
      status: 'Return Created',
      location: 'Online',
      description: 'Return request submitted',
      isDelivered: false
    });

    if (returnRequest.status !== ReturnStatus.PENDING) {
      events.push({
        timestamp: returnRequest.updatedAt,
        status: 'Return Approved',
        location: 'Bareloft System',
        description: 'Return request approved, pickup scheduled',
        isDelivered: false
      });
    }

    if (returnRequest.actualPickupDate) {
      events.push({
        timestamp: returnRequest.actualPickupDate,
        status: 'Item Picked Up',
        location: returnRequest.pickupAddress?.city || 'Customer Location',
        description: 'Item collected from customer',
        isDelivered: false
      });
    }

    if (returnRequest.status === ReturnStatus.RECEIVED) {
      events.push({
        timestamp: returnRequest.actualReturnDate || returnRequest.updatedAt,
        status: 'Received',
        location: 'Bareloft Fulfillment Center',
        description: 'Item received at processing center',
        isDelivered: true
      });
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private isPickupAvailable(state?: string): boolean {
    const pickupStates = [
      'Lagos', 'FCT', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 
      'Ogun', 'Delta', 'Anambra', 'Enugu'
    ];
    return !state || pickupStates.some(s => 
      s.toLowerCase() === state.toLowerCase()
    );
  }

  private getPickupEstimatedTime(state?: string): string {
    if (!state) return '2-3 business days';
    
    const fastStates = ['Lagos', 'FCT'];
    if (fastStates.some(s => s.toLowerCase() === state.toLowerCase())) {
      return '1-2 business days';
    }
    
    return '2-4 business days';
  }

  private estimateReturnWeight(order: any): string {
    // Estimate weight based on order items
    const totalItems = order.items?.length || 1;
    if (totalItems <= 2) return '0.5-1 kg';
    if (totalItems <= 5) return '1-2 kg';
    return '2-5 kg';
  }

  private calculateDistance(state: string): string {
    // Distance from Lagos (main fulfillment center)
    const distanceMap: Record<string, string> = {
      'Lagos': '0-50 km',
      'Ogun': '50-100 km',
      'FCT': '500-600 km',
      'Rivers': '400-500 km',
      'Kano': '800-900 km'
    };
    return distanceMap[state] || '500+ km';
  }

  private requiresSpecialHandling(order: any): boolean {
    // Check if order contains fragile items
    const fragileCategories = ['Electronics', 'Glass', 'Ceramics'];
    return order.items?.some((item: any) => 
      fragileCategories.includes(item.category)
    ) || false;
  }
}