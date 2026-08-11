/**
 * Utility to extract detailed error messages from API responses/errors.
 * Handles Zod validation errors array: { message, errors: [{ field, message }] }
 */
export const formatApiError = (errOrData, defaultMsg = 'An error occurred') => {
  if (!errOrData) return defaultMsg;

  const data = errOrData?.response?.data || errOrData?.data || errOrData;

  if (data) {
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const details = data.errors
        .map(e => `${e.field ? e.field + ': ' : ''}${e.message}`)
        .join(' | ');
      return `${data.message || defaultMsg} (${details})`;
    }

    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }

    if (typeof data.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }

    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
  }

  if (typeof errOrData?.message === 'string' && errOrData.message.trim()) {
    return errOrData.message;
  }

  return defaultMsg;
};
