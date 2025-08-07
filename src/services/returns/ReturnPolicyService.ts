/**
 * Return Policy Service
 * Manages return policy information, FAQ, and guidelines
 * Nigerian e-commerce platform optimized
 */

import { BaseService } from '../BaseService';
import { 
  NigerianReturnPolicy,
  ReturnReason
} from '../../types/return.types';
import { logger } from '../../utils/logger/winston';

interface ReturnPolicyDetails {
  generalPolicy: {
    returnWindowDays: number;
    acceptsReturns: boolean;
    requiresOriginalPackaging: boolean;
    requiresReceiptOrInvoice: boolean;
    acceptsGiftReturns: boolean;
    onlineOrdersOnly: boolean;
  };
  eligibilityRules: {
    maxReturnWindow: number;
    minOrderValue?: number;
    excludedCategories: string[];
    nonReturnableItems: string[];
    conditionRequirements: string[];
  };
  shippingPolicy: {
    whoPaysCost: 'customer' | 'merchant' | 'shared';
    freeReturnThreshold?: number;
    pickupServiceStates: string[];
    dropOffLocations: boolean;
    returnShippingMethods: string[];
  };
  refundPolicy: {
    refundMethods: string[];
    processingTimeDays: number;
    partialRefundsAllowed: boolean;
    restockingFee: number;
    shippingRefundPolicy: string;
    taxRefundPolicy: string;
  };
  nigerianSpecifics: {
    consumerProtectionCompliance: boolean;
    bankingRegulations: string[];
    stateSpecificRules: {
      [state: string]: {
        pickupAvailable: boolean;
        processingTime: string;
        specialRequirements?: string[];
      };
    };
    festivalScheduleImpact: boolean;
    localLanguageSupport: string[];
  };
  lastUpdated: Date;
}

interface ReturnFAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
  isPopular: boolean;
  nigerianSpecific: boolean;
  lastUpdated: Date;
}

interface ReturnReasonDetails {
  reason: ReturnReason;
  displayName: string;
  description: string;
  eligibilityImpact: 'none' | 'inspection_required' | 'partial_refund' | 'no_refund';
  documentationRequired: string[];
  processingTime: string;
  customerTips: string[];
  nigerianContext?: string;
}

export class ReturnPolicyService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Get comprehensive return policy
   */
  async getReturnPolicy(): Promise<ReturnPolicyDetails> {
    try {
      // In a real implementation, this would come from database/config
      const policy: ReturnPolicyDetails = {
        generalPolicy: {
          returnWindowDays: 14,
          acceptsReturns: true,
          requiresOriginalPackaging: true,
          requiresReceiptOrInvoice: false, // Digital receipts always available
          acceptsGiftReturns: true,
          onlineOrdersOnly: true
        },
        eligibilityRules: {
          maxReturnWindow: 30, // Extended for certain items
          excludedCategories: [
            'Personal Care & Hygiene',
            'Food & Beverages',
            'Digital Products',
            'Customized Items'
          ],
          nonReturnableItems: [
            'Undergarments and intimate apparel',
            'Perishable goods',
            'Gift cards',
            'Downloaded software',
            'Opened cosmetics',
            'Items with removed tags',
            'Damaged items due to misuse'
          ],
          conditionRequirements: [
            'Items must be in original condition',
            'All tags and labels must be attached',
            'Original packaging required',
            'No signs of wear or use',
            'All accessories included'
          ]
        },
        shippingPolicy: {
          whoPaysCost: 'shared', // Customer pays unless defective/wrong item
          freeReturnThreshold: 50000, // Free returns for orders above ₦50,000
          pickupServiceStates: [
            'Lagos',
            'FCT',
            'Kano',
            'Rivers',
            'Oyo',
            'Kaduna',
            'Ogun',
            'Delta',
            'Anambra',
            'Enugu'
          ],
          dropOffLocations: true,
          returnShippingMethods: [
            'Pickup Service',
            'Drop-off Centers',
            'Courier Service',
            'Postal Service'
          ]
        },
        refundPolicy: {
          refundMethods: [
            'Original Payment Method',
            'Bank Transfer',
            'Wallet Credit',
            'Store Credit'
          ],
          processingTimeDays: 7,
          partialRefundsAllowed: true,
          restockingFee: 0, // No restocking fee for Nigerian market
          shippingRefundPolicy: 'Original shipping charges non-refundable unless item defective',
          taxRefundPolicy: 'VAT refunded with item refund'
        },
        nigerianSpecifics: {
          consumerProtectionCompliance: true,
          bankingRegulations: [
            'CBN Guidelines for Electronic Payments',
            'Consumer Protection Framework'
          ],
          stateSpecificRules: this.getStateSpecificRules(),
          festivalScheduleImpact: true,
          localLanguageSupport: ['English', 'Pidgin English']
        },
        lastUpdated: new Date()
      };

      logger.info('Return policy retrieved successfully');
      return policy;

    } catch (error) {
      logger.error('Error retrieving return policy', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get return FAQ with categories
   */
  async getReturnFAQ(): Promise<{
    categories: string[];
    faqItems: ReturnFAQItem[];
    popularQuestions: ReturnFAQItem[];
    nigerianSpecific: ReturnFAQItem[];
  }> {
    try {
      const faqItems: ReturnFAQItem[] = [
        // General Return Questions
        {
          id: 'faq_001',
          category: 'General',
          question: 'How long do I have to return an item?',
          answer: 'You have 14 days from the delivery date to initiate a return request. Some categories like electronics have a 30-day window. The return window starts counting from when you receive the item, not when you place the order.',
          tags: ['return window', 'timeframe', 'delivery'],
          isPopular: true,
          nigerianSpecific: false,
          lastUpdated: new Date()
        },
        {
          id: 'faq_002',
          category: 'General',
          question: 'What items cannot be returned?',
          answer: 'Personal care items, opened cosmetics, undergarments, perishable goods, digital downloads, and customized items cannot be returned. Items must also be in original condition with tags attached.',
          tags: ['non-returnable', 'restrictions', 'conditions'],
          isPopular: true,
          nigerianSpecific: false,
          lastUpdated: new Date()
        },
        {
          id: 'faq_003',
          category: 'General',
          question: 'Do I need the original packaging?',
          answer: 'Yes, items must be returned in their original packaging when possible. This includes boxes, tags, labels, and any protective wrapping. This helps us process your return faster and ensures the item can be resold.',
          tags: ['packaging', 'original box', 'condition'],
          isPopular: true,
          nigerianSpecific: false,
          lastUpdated: new Date()
        },

        // Shipping & Pickup Questions
        {
          id: 'faq_004',
          category: 'Shipping & Pickup',
          question: 'Who pays for return shipping?',
          answer: 'For defective items or our mistakes, we cover return shipping. For change of mind or size issues, customers cover return shipping costs. Orders above ₦50,000 get free return shipping.',
          tags: ['shipping cost', 'free returns', 'defective'],
          isPopular: true,
          nigerianSpecific: true,
          lastUpdated: new Date()
        },
        {
          id: 'faq_005',
          category: 'Shipping & Pickup',
          question: 'Is pickup service available in my area?',
          answer: 'We offer pickup services in Lagos, Abuja, Kano, Port Harcourt, Ibadan, Kaduna, Abeokuta, Warri, Awka, and Enugu. For other areas, you can drop off at our partner locations or use courier services.',
          tags: ['pickup service', 'locations', 'states'],
          isPopular: true,
          nigerianSpecific: true,
          lastUpdated: new Date()
        },
        {
          id: 'faq_006',
          category: 'Shipping & Pickup',
          question: 'How do I schedule a pickup?',
          answer: 'After submitting your return request, go to your return details and click "Schedule Pickup". Choose your preferred date and time slot. You\'ll receive an SMS confirmation with pickup details.',
          tags: ['schedule pickup', 'process', 'confirmation'],
          isPopular: false,
          nigerianSpecific: true,
          lastUpdated: new Date()
        },

        // Refunds & Payments
        {
          id: 'faq_007',
          category: 'Refunds & Payments',
          question: 'How long does it take to get my refund?',
          answer: 'Bank transfers take 1-3 business days, original payment method takes 5-7 days, wallet credit is instant, and store credit is instant with 5% bonus. Processing starts after we receive and inspect your return.',
          tags: ['refund time', 'processing', 'payment methods'],
          isPopular: true,
          nigerianSpecific: true,
          lastUpdated: new Date()
        },
        {
          id: 'faq_008',
          category: 'Refunds & Payments',
          question: 'Can I get a refund to my Nigerian bank account?',
          answer: 'Yes! We support direct bank transfers to all major Nigerian banks. Provide your 10-digit account number, account name, and bank details. We verify account details before processing.',
          tags: ['bank transfer', 'nigerian banks', 'account verification'],
          isPopular: true,
          nigerianSpecific: true,
          lastUpdated: new Date()
        },
        {
          id: 'faq_009',
          category: 'Refunds & Payments',
          question: 'What is store credit and how does it work?',
          answer: 'Store credit is money added to your Bareloft account for future purchases. You get 5% extra credit (₦105 credit for ₦100 refund). Store credit never expires and can be used for any purchase.',
          tags: ['store credit', 'bonus', 'future purchases'],
          isPopular: false,
          nigerianSpecific: false,
          lastUpdated: new Date()
        },

        // Nigerian Specific Questions
        {
          id: 'faq_010',
          category: 'Nigerian Specific',
          question: 'Are there any delays during Nigerian holidays?',
          answer: 'Yes, pickup and processing may be delayed during Eid, Christmas, New Year, and Independence Day. We announce holiday schedules in advance. Bank transfers may also take longer during holiday periods.',
          tags: ['holidays', 'delays', 'festivals'],
          isPopular: true,
          nigerianSpecific: true,
          lastUpdated: new Date()
        },
        {
          id: 'faq_011',
          category: 'Nigerian Specific',
          question: 'Do you comply with Nigerian consumer protection laws?',
          answer: 'Yes, we fully comply with Nigerian Consumer Protection regulations and CBN guidelines. You have statutory rights to return faulty goods regardless of our return policy.',
          tags: ['consumer protection', 'legal rights', 'compliance'],
          isPopular: false,
          nigerianSpecific: true,
          lastUpdated: new Date()
        },
        {
          id: 'faq_012',
          category: 'Nigerian Specific',
          question: 'What if my return gets lost during shipping?',
          answer: 'All returns are insured and tracked. If a return is lost, we\'ll investigate with the courier and process your refund based on the tracking information and proof of dispatch.',
          tags: ['lost returns', 'insurance', 'tracking'],
          isPopular: false,
          nigerianSpecific: true,
          lastUpdated: new Date()
        },

        // Process & Status
        {
          id: 'faq_013',
          category: 'Process & Status',
          question: 'How can I track my return status?',
          answer: 'Log into your account and go to "My Returns" to see real-time status updates. You\'ll also receive SMS notifications for status changes and email updates with detailed information.',
          tags: ['track return', 'status', 'notifications'],
          isPopular: true,
          nigerianSpecific: false,
          lastUpdated: new Date()
        },
        {
          id: 'faq_014',
          category: 'Process & Status',
          question: 'What happens during the inspection process?',
          answer: 'Our team checks the item condition, verifies it matches the return reason, and determines the refund amount. Items in sellable condition get full refund, while damaged items may get partial refunds.',
          tags: ['inspection', 'condition check', 'refund amount'],
          isPopular: false,
          nigerianSpecific: false,
          lastUpdated: new Date()
        },
        {
          id: 'faq_015',
          category: 'Process & Status',
          question: 'Can I cancel my return request?',
          answer: 'You can cancel return requests that are still "Pending" status. Once approved or picked up, returns cannot be cancelled. Go to your return details and click "Cancel Return".',
          tags: ['cancel return', 'pending status', 'process'],
          isPopular: false,
          nigerianSpecific: false,
          lastUpdated: new Date()
        }
      ];

      const categories = [...new Set(faqItems.map(item => item.category))];
      const popularQuestions = faqItems.filter(item => item.isPopular);
      const nigerianSpecific = faqItems.filter(item => item.nigerianSpecific);

      return {
        categories,
        faqItems,
        popularQuestions,
        nigerianSpecific
      };

    } catch (error) {
      logger.error('Error retrieving return FAQ', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get return reasons with detailed information
   */
  async getReturnReasons(): Promise<ReturnReasonDetails[]> {
    try {
      const reasons: ReturnReasonDetails[] = [
        {
          reason: ReturnReason.DEFECTIVE,
          displayName: 'Defective or Faulty Item',
          description: 'The item has manufacturing defects or doesn\'t work properly',
          eligibilityImpact: 'none',
          documentationRequired: ['Photos of defect', 'Description of issue'],
          processingTime: '2-3 business days',
          customerTips: [
            'Take clear photos of the defect',
            'Describe the issue in detail',
            'Include any error messages if applicable'
          ],
          nigerianContext: 'Covered under Nigerian Consumer Protection laws'
        },
        {
          reason: ReturnReason.WRONG_ITEM,
          displayName: 'Wrong Item Sent',
          description: 'You received a different item than what you ordered',
          eligibilityImpact: 'none',
          documentationRequired: ['Photo of received item', 'Order details'],
          processingTime: '1-2 business days',
          customerTips: [
            'Compare with your order confirmation',
            'Take photos of the item and packaging',
            'Keep all packaging materials'
          ]
        },
        {
          reason: ReturnReason.WRONG_SIZE,
          displayName: 'Wrong Size',
          description: 'The item size doesn\'t fit as expected',
          eligibilityImpact: 'inspection_required',
          documentationRequired: ['Size ordered vs received'],
          processingTime: '3-4 business days',
          customerTips: [
            'Check our size guide before ordering',
            'Keep size tags attached',
            'Item must be unworn and undamaged'
          ]
        },
        {
          reason: ReturnReason.DAMAGED_SHIPPING,
          displayName: 'Damaged During Shipping',
          description: 'The item was damaged while being delivered to you',
          eligibilityImpact: 'none',
          documentationRequired: ['Photos of damage', 'Photos of packaging'],
          processingTime: '2-3 business days',
          customerTips: [
            'Take photos immediately upon delivery',
            'Don\'t discard damaged packaging',
            'Note damage on delivery receipt if possible'
          ],
          nigerianContext: 'Report to delivery partner and us immediately'
        },
        {
          reason: ReturnReason.NOT_AS_DESCRIBED,
          displayName: 'Item Not as Described',
          description: 'The item differs significantly from the product description',
          eligibilityImpact: 'inspection_required',
          documentationRequired: ['Comparison with product description', 'Photos'],
          processingTime: '3-5 business days',
          customerTips: [
            'Reference specific product description points',
            'Take clear comparison photos',
            'Explain the differences in detail'
          ]
        },
        {
          reason: ReturnReason.CHANGED_MIND,
          displayName: 'Changed Mind',
          description: 'You no longer want the item (personal preference)',
          eligibilityImpact: 'inspection_required',
          documentationRequired: [],
          processingTime: '3-5 business days',
          customerTips: [
            'Item must be in perfect condition',
            'All tags must be attached',
            'Return shipping costs apply'
          ]
        },
        {
          reason: ReturnReason.DUPLICATE_ORDER,
          displayName: 'Duplicate Order',
          description: 'You accidentally ordered the same item multiple times',
          eligibilityImpact: 'none',
          documentationRequired: ['Reference to duplicate orders'],
          processingTime: '2-3 business days',
          customerTips: [
            'Identify which order to keep',
            'Return duplicate items promptly',
            'Check for duplicate charges'
          ]
        },
        {
          reason: ReturnReason.QUALITY_ISSUES,
          displayName: 'Quality Issues',
          description: 'The item quality is below expectations',
          eligibilityImpact: 'inspection_required',
          documentationRequired: ['Photos showing quality issues', 'Detailed description'],
          processingTime: '3-5 business days',
          customerTips: [
            'Document specific quality problems',
            'Compare with product images',
            'Be specific about expectations vs reality'
          ]
        },
        {
          reason: ReturnReason.LATE_DELIVERY,
          displayName: 'Late Delivery',
          description: 'Item arrived significantly after promised delivery date',
          eligibilityImpact: 'none',
          documentationRequired: ['Original delivery estimate', 'Actual delivery date'],
          processingTime: '1-2 business days',
          customerTips: [
            'Reference original delivery promise',
            'Check tracking information',
            'Consider compensation instead of return'
          ],
          nigerianContext: 'Common during holiday seasons and traffic issues in major cities'
        },
        {
          reason: ReturnReason.OTHER,
          displayName: 'Other Reason',
          description: 'Reason not covered by the above categories',
          eligibilityImpact: 'inspection_required',
          documentationRequired: ['Detailed explanation of reason'],
          processingTime: '3-7 business days',
          customerTips: [
            'Provide detailed explanation',
            'Include relevant photos or documentation',
            'May require additional verification'
          ]
        }
      ];

      logger.info('Return reasons retrieved successfully');
      return reasons;

    } catch (error) {
      logger.error('Error retrieving return reasons', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get Nigerian return policy specifics
   */
  async getNigerianReturnPolicy(): Promise<NigerianReturnPolicy> {
    try {
      const policy: NigerianReturnPolicy = {
        returnWindowDays: 14,
        acceptedReasons: Object.values(ReturnReason),
        shippingCostResponsibility: 'shared',
        requiresOriginalPackaging: true,
        qualityCheckRequired: true,
        restockingFeePercentage: 0,
        fastTrackEligibleStates: ['Lagos', 'FCT', 'Rivers', 'Kano'],
        pickupServiceStates: [
          'Lagos', 'FCT', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 
          'Ogun', 'Delta', 'Anambra', 'Enugu'
        ],
        dropOffLocations: [
          {
            state: 'Lagos',
            city: 'Lagos Island',
            address: '12 Broad Street, Lagos Island, Lagos',
            businessHours: {
              weekdays: { open: '8:00 AM', close: '6:00 PM' },
              saturday: { open: '9:00 AM', close: '4:00 PM' },
              sunday: { open: 'Closed', close: 'Closed' }
            },
            contactPhone: '+2341234567890'
          },
          {
            state: 'Lagos',
            city: 'Ikeja',
            address: '45 Obafemi Awolowo Way, Ikeja, Lagos',
            businessHours: {
              weekdays: { open: '8:00 AM', close: '6:00 PM' },
              saturday: { open: '9:00 AM', close: '4:00 PM' },
              sunday: { open: 'Closed', close: 'Closed' }
            },
            contactPhone: '+2341234567891'
          },
          {
            state: 'FCT',
            city: 'Abuja',
            address: '23 Aminu Kano Crescent, Wuse II, Abuja',
            businessHours: {
              weekdays: { open: '8:00 AM', close: '6:00 PM' },
              saturday: { open: '9:00 AM', close: '4:00 PM' },
              sunday: { open: 'Closed', close: 'Closed' }
            },
            contactPhone: '+2341234567892'
          },
          {
            state: 'Rivers',
            city: 'Port Harcourt',
            address: '15 Aba Road, Port Harcourt, Rivers',
            businessHours: {
              weekdays: { open: '8:00 AM', close: '6:00 PM' },
              saturday: { open: '9:00 AM', close: '4:00 PM' },
              sunday: { open: 'Closed', close: 'Closed' }
            },
            contactPhone: '+2341234567893'
          }
        ]
      };

      return policy;

    } catch (error) {
      logger.error('Error retrieving Nigerian return policy', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  private getStateSpecificRules(): { [state: string]: any } {
    return {
      'Lagos': {
        pickupAvailable: true,
        processingTime: '2-3 business days',
        specialRequirements: ['Traffic delays may affect pickup times']
      },
      'FCT': {
        pickupAvailable: true,
        processingTime: '2-3 business days'
      },
      'Kano': {
        pickupAvailable: true,
        processingTime: '3-4 business days',
        specialRequirements: ['Holiday schedules may vary']
      },
      'Rivers': {
        pickupAvailable: true,
        processingTime: '3-4 business days'
      },
      'Oyo': {
        pickupAvailable: true,
        processingTime: '3-5 business days'
      },
      'Default': {
        pickupAvailable: false,
        processingTime: '5-7 business days',
        specialRequirements: ['Use drop-off locations or courier service']
      }
    };
  }
}