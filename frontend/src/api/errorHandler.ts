// Centralized API Error Mapper
// Translates raw backend HTTP, network, and validation errors into user-readable messages for ErrorState and UI alerts.

export interface MappedError {
  title: string;
  message: string;
  statusCode?: number;
}

export function mapApiError(error: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): MappedError {
  if (!error) {
    return {
      title: 'Request Failed',
      message: fallbackMessage,
    };
  }

  if (error instanceof Error) {
    const rawMsg = error.message;

    // Network / connectivity issues
    if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('ERR_CONNECTION_REFUSED')) {
      return {
        title: 'Connection Unavailable',
        message: 'Could not connect to the Verity verification server. Please check your network connection.',
      };
    }

    // Specific HTTP status codes
    if (rawMsg.includes('HTTP error 401') || rawMsg.includes('401')) {
      return {
        title: 'Authentication Required',
        message: 'Your session has expired or requires verification. Please sign in again.',
        statusCode: 401,
      };
    }

    if (rawMsg.includes('HTTP error 403') || rawMsg.includes('403')) {
      return {
        title: 'Access Restricted',
        message: 'Integrity engine flagged this action or permission was denied.',
        statusCode: 403,
      };
    }

    if (rawMsg.includes('HTTP error 404') || rawMsg.includes('404')) {
      return {
        title: 'Item Not Found',
        message: 'The requested event, seat hold, or ticket does not exist or has been removed.',
        statusCode: 404,
      };
    }

    if (rawMsg.includes('HTTP error 409') || rawMsg.includes('409') || rawMsg.toLowerCase().includes('conflict') || rawMsg.toLowerCase().includes('already held')) {
      return {
        title: 'Seat Conflict',
        message: 'One or more of the selected seats were locked by another user just now. Please choose different seats.',
        statusCode: 409,
      };
    }

    if (rawMsg.includes('HTTP error 429') || rawMsg.includes('429') || rawMsg.toLowerCase().includes('rate limit')) {
      return {
        title: 'Rate Limit Reached',
        message: 'Too many requests were sent in a short window. Please wait a moment before trying again.',
        statusCode: 429,
      };
    }

    if (rawMsg.includes('HTTP error 500') || rawMsg.includes('500') || rawMsg.includes('502') || rawMsg.includes('503')) {
      return {
        title: 'Service Temporarily Unavailable',
        message: 'The verification gateway is experiencing high volume. Please retry in a few seconds.',
        statusCode: 500,
      };
    }

    return {
      title: 'Action Failed',
      message: rawMsg || fallbackMessage,
    };
  }

  return {
    title: 'Error',
    message: typeof error === 'string' ? error : fallbackMessage,
  };
}
