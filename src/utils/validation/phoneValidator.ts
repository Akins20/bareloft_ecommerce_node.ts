/**
 * Phone Number Validation Utilities
 * Nigerian phone number format validation and formatting
 */

import { logger } from '../logger/winston';

/**
 * Nigerian mobile network prefixes
 */
const NIGERIAN_MOBILE_PREFIXES = [
  // MTN
  '0803', '0806', '0813', '0814', '0816', '0903', '0906', '0913', '0916',
  // Airtel
  '0701', '0708', '0802', '0812', '0901', '0902', '0904', '0907', '0912',
  // Glo
  '0705', '0807', '0811', '0815', '0905', '0915',
  // 9mobile (Etisalat)
  '0809', '0817', '0818', '0908', '0909'
];

/**
 * Nigerian landline area codes
 */
const NIGERIAN_LANDLINE_CODES = [
  // Lagos
  '01',
  // Abuja
  '09',
  // Kano
  '064',
  // Port Harcourt
  '084',
  // Ibadan
  '02',
  // Kaduna
  '062',
  // Jos
  '073',
  // Benin
  '052',
  // Calabar
  '087',
  // Maiduguri
  '076'
];

/**
 * Validate Nigerian phone number format
 * Supports formats: +234XXXXXXXXXX, 234XXXXXXXXXX, 0XXXXXXXXXXX
 */
export function validateNigerianPhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }

  // Clean the phone number (remove spaces, dashes, etc.)
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

  try {
    // Check different formats
    if (cleaned.startsWith('+234')) {
      return validateInternationalFormat(cleaned);
    } else if (cleaned.startsWith('234')) {
      return validateInternationalFormat('+' + cleaned);
    } else if (cleaned.startsWith('0')) {
      return validateLocalFormat(cleaned);
    }

    return false;

  } catch (error) {
    logger.warn('Phone number validation error', {
      phoneNumber: phoneNumber.substring(0, 5) + '***', // Log partial for security
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Validate international format (+234XXXXXXXXXX)
 */
function validateInternationalFormat(phoneNumber: string): boolean {
  // Must start with +234 and have exactly 14 characters
  if (!phoneNumber.startsWith('+234') || phoneNumber.length !== 14) {
    return false;
  }

  const localPart = '0' + phoneNumber.substring(4); // Convert to local format for validation
  return validateLocalFormat(localPart);
}

/**
 * Validate local format (0XXXXXXXXXXX)
 */
function validateLocalFormat(phoneNumber: string): boolean {
  // Must start with 0 and have exactly 11 digits
  if (!phoneNumber.startsWith('0') || phoneNumber.length !== 11) {
    return false;
  }

  // Check if all characters after 0 are digits
  const digits = phoneNumber.substring(1);
  if (!/^\d+$/.test(digits)) {
    return false;
  }

  // Check mobile number prefixes
  const prefix = phoneNumber.substring(0, 4);
  if (NIGERIAN_MOBILE_PREFIXES.includes(prefix)) {
    return true;
  }

  // Check landline numbers (less common but still valid)
  for (const code of NIGERIAN_LANDLINE_CODES) {
    if (phoneNumber.substring(1).startsWith(code)) {
      // Landline numbers vary in length, typically 7-8 digits after area code
      const remainingDigits = phoneNumber.substring(1 + code.length);
      return remainingDigits.length >= 6 && remainingDigits.length <= 8;
    }
  }

  return false;
}

/**
 * Format Nigerian phone number to international format
 */
export function formatNigerianPhoneNumber(
  phoneNumber: string,
  format: 'international' | 'local' | 'display' = 'international'
): string | null {
  if (!validateNigerianPhoneNumber(phoneNumber)) {
    return null;
  }

  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  let localNumber: string;

  // Convert to local format first
  if (cleaned.startsWith('+234')) {
    localNumber = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('234')) {
    localNumber = '0' + cleaned.substring(3);
  } else {
    localNumber = cleaned;
  }

  switch (format) {
    case 'international':
      return '+234' + localNumber.substring(1);

    case 'local':
      return localNumber;

    case 'display':
      // Format as +234 XXX XXX XXXX
      const international = '+234' + localNumber.substring(1);
      return international.substring(0, 4) + ' ' +
             international.substring(4, 7) + ' ' +
             international.substring(7, 10) + ' ' +
             international.substring(10);

    default:
      return '+234' + localNumber.substring(1);
  }
}

/**
 * Get mobile network provider from phone number
 */
export function getNigerianMobileProvider(phoneNumber: string): string | null {
  if (!validateNigerianPhoneNumber(phoneNumber)) {
    return null;
  }

  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  let localNumber: string;

  // Convert to local format
  if (cleaned.startsWith('+234')) {
    localNumber = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('234')) {
    localNumber = '0' + cleaned.substring(3);
  } else {
    localNumber = cleaned;
  }

  const prefix = localNumber.substring(0, 4);

  // MTN prefixes
  const mtnPrefixes = ['0803', '0806', '0813', '0814', '0816', '0903', '0906', '0913', '0916'];
  if (mtnPrefixes.includes(prefix)) {
    return 'MTN';
  }

  // Airtel prefixes
  const airtelPrefixes = ['0701', '0708', '0802', '0812', '0901', '0902', '0904', '0907', '0912'];
  if (airtelPrefixes.includes(prefix)) {
    return 'Airtel';
  }

  // Glo prefixes
  const gloPrefixes = ['0705', '0807', '0811', '0815', '0905', '0915'];
  if (gloPrefixes.includes(prefix)) {
    return 'Glo';
  }

  // 9mobile prefixes
  const nineMobilePrefixes = ['0809', '0817', '0818', '0908', '0909'];
  if (nineMobilePrefixes.includes(prefix)) {
    return '9mobile';
  }

  return 'Unknown';
}

/**
 * Generate phone number patterns for validation
 */
export function getPhoneNumberPatterns(): {
  international: RegExp;
  local: RegExp;
  display: RegExp;
} {
  return {
    international: /^\+234[789][01]\d{8}$/,
    local: /^0[789][01]\d{8}$/,
    display: /^\+234 \d{3} \d{3} \d{4}$/
  };
}

/**
 * Validate and normalize phone number for storage
 */
export function normalizeNigerianPhoneNumber(phoneNumber: string): string | null {
  if (!validateNigerianPhoneNumber(phoneNumber)) {
    return null;
  }

  // Always store in international format
  return formatNigerianPhoneNumber(phoneNumber, 'international');
}

/**
 * Check if phone number is a mobile number (not landline)
 */
export function isMobileNumber(phoneNumber: string): boolean {
  if (!validateNigerianPhoneNumber(phoneNumber)) {
    return false;
  }

  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  let localNumber: string;

  if (cleaned.startsWith('+234')) {
    localNumber = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('234')) {
    localNumber = '0' + cleaned.substring(3);
  } else {
    localNumber = cleaned;
  }

  const prefix = localNumber.substring(0, 4);
  return NIGERIAN_MOBILE_PREFIXES.includes(prefix);
}

/**
 * Get SMS-friendly format (for notifications)
 */
export function getSMSFriendlyFormat(phoneNumber: string): string | null {
  // SMS services typically prefer international format without +
  const international = formatNigerianPhoneNumber(phoneNumber, 'international');
  return international ? international.substring(1) : null; // Remove the + sign
}

/**
 * Validate multiple phone numbers
 */
export function validateMultiplePhoneNumbers(phoneNumbers: string[]): {
  valid: string[];
  invalid: string[];
  normalized: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  const normalized: string[] = [];

  for (const phone of phoneNumbers) {
    if (validateNigerianPhoneNumber(phone)) {
      valid.push(phone);
      const normalizedPhone = normalizeNigerianPhoneNumber(phone);
      if (normalizedPhone) {
        normalized.push(normalizedPhone);
      }
    } else {
      invalid.push(phone);
    }
  }

  return { valid, invalid, normalized };
}

/**
 * Phone number utility for customer support
 */
export function getPhoneNumberInfo(phoneNumber: string): {
  isValid: boolean;
  provider: string | null;
  isMobile: boolean;
  formats: {
    international: string | null;
    local: string | null;
    display: string | null;
  };
} {
  const isValid = validateNigerianPhoneNumber(phoneNumber);
  
  return {
    isValid,
    provider: isValid ? getNigerianMobileProvider(phoneNumber) : null,
    isMobile: isValid ? isMobileNumber(phoneNumber) : false,
    formats: {
      international: isValid ? formatNigerianPhoneNumber(phoneNumber, 'international') : null,
      local: isValid ? formatNigerianPhoneNumber(phoneNumber, 'local') : null,
      display: isValid ? formatNigerianPhoneNumber(phoneNumber, 'display') : null
    }
  };
}