/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {string} message
 */

export const CompanyFormValidations = {
  // Mobile number validation (Indian format)
  validateMobileNumber: mobile => {
    if (!mobile || mobile.trim() === '') {
      return { isValid: true, message: '' }; // Empty is allowed
    }

    // Remove spaces, hyphens, and plus sign
    const cleanedMobile = mobile.replace(/[\s\-+]/g, '');

    // Indian mobile number regex: 10 digits starting with 6,7,8,9
    const mobileRegex = /^[6-9]\d{9}$/;

    if (!mobileRegex.test(cleanedMobile)) {
      return {
        isValid: false,
        message:
          'Please enter a valid 10-digit Indian mobile number starting with 6,7,8, or 9',
      };
    }

    return { isValid: true, message: '' };
  },

  // Email validation
  validateEmail: email => {
    if (!email || email.trim() === '') {
      return { isValid: true, message: '' }; // Empty is allowed
    }

    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

    if (!emailRegex.test(email.trim())) {
      return {
        isValid: false,
        message: 'Please enter a valid email address',
      };
    }

    return { isValid: true, message: '' };
  },

  // PAN number validation
  validatePANNumber: pan => {
    if (!pan || pan.trim() === '') {
      return { isValid: true, message: '' }; // Empty is allowed
    }

    // PAN format: AAAAP1234A (5 letters, 4 digits, 1 letter)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (!panRegex.test(pan.trim().toUpperCase())) {
      return {
        isValid: false,
        message: 'Please enter a valid PAN number (Format: AAAAA9999A)',
      };
    }

    return { isValid: true, message: '' };
  },

  // Simplified GSTIN validation (format only, no checksum)
  validateGSTIN: gstin => {
    if (!gstin || gstin.trim() === '') {
      return { isValid: true, message: '' };
    }

    const cleanedGSTIN = gstin.trim().toUpperCase();

    // Basic GSTIN format validation (15 alphanumeric characters)
    // First 2 digits: state code
    // Next 10 characters: business identifier
    // 12th character: entity number (1-9 or A-Z)
    // 13th character: Z (fixed)
    // 14th character: checksum digit
    const gstinRegex = /^[0-9]{2}[A-Z0-9]{10}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;

    if (!gstinRegex.test(cleanedGSTIN)) {
      return {
        isValid: false,
        message:
          'Please enter a valid GSTIN (15 characters: 2-digit state code + 10-char business ID + entity + Z + checksum)',
      };
    }

    return { isValid: true, message: '' };
  },

  // TAN number validation
  validateTANNumber: tan => {
    if (!tan || tan.trim() === '') {
      return { isValid: true, message: '' }; // Empty is allowed
    }

    // TAN format: 4 letters + 5 digits + 1 letter OR 10 digits
    const tanRegex = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;

    if (!tanRegex.test(tan.trim().toUpperCase())) {
      return {
        isValid: false,
        message: 'Please enter a valid TAN number (Format: ABCD12345E)',
      };
    }

    return { isValid: true, message: '' };
  },

  // Comprehensive form validation (added from web code)
  validateFormFields: fields => {
    const results = {};

    if (fields.mobileNumber !== undefined) {
      results.mobileNumber = CompanyFormValidations.validateMobileNumber(
        fields.mobileNumber,
      );
    }

    if (fields.emailId !== undefined) {
      results.emailId = CompanyFormValidations.validateEmail(fields.emailId);
    }

    if (fields.PANNumber !== undefined) {
      results.PANNumber = CompanyFormValidations.validatePANNumber(
        fields.PANNumber,
      );
    }

    if (fields.gstin !== undefined) {
      results.gstin = CompanyFormValidations.validateGSTIN(fields.gstin);
    }

    if (fields.TANNumber !== undefined) {
      results.TANNumber = CompanyFormValidations.validateTANNumber(
        fields.TANNumber,
      );
    }

    return results;
  },
};

// Hook for real-time validation
export const useCompanyFormValidation = () => {
  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'mobileNumber':
        return CompanyFormValidations.validateMobileNumber(value);
      case 'emailId':
        return CompanyFormValidations.validateEmail(value);
      case 'PANNumber':
        return CompanyFormValidations.validatePANNumber(value);
      case 'gstin':
        return CompanyFormValidations.validateGSTIN(value);
      case 'TANNumber':
        return CompanyFormValidations.validateTANNumber(value);
      default:
        return { isValid: true, message: '' };
    }
  };

  const validateMultipleFields = fields => {
    return CompanyFormValidations.validateFormFields(fields);
  };

  return {
    validateField,
    validateMultipleFields,
    CompanyFormValidations,
  };
};
