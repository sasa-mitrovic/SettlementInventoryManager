import { useState, useCallback } from 'react';
import { supabaseClient } from '../supabase/supabaseClient';

interface UsernameValidationResult {
  available: boolean;
  message: string;
  existing_user_id?: string;
  error?: string;
}

interface UseUsernameValidationReturn {
  isValidating: boolean;
  validationResult: UsernameValidationResult | null;
  validateUsername: (username: string) => Promise<UsernameValidationResult>;
  clearValidation: () => void;
}

export function useUsernameValidation(): UseUsernameValidationReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<UsernameValidationResult | null>(null);

  const validateUsername = useCallback(
    async (username: string): Promise<UsernameValidationResult> => {
      if (!username || username.trim().length < 2) {
        const result: UsernameValidationResult = {
          available: false,
          message: 'Username must be at least 2 characters long',
        };
        setValidationResult(result);
        return result;
      }

      setIsValidating(true);

      try {
        const { data, error } = await supabaseClient.rpc(
          'check_username_availability',
          {
            username_to_check: username.trim(),
          },
        );

        if (error) {
          console.error('Error checking username availability:', error);

          // If the function doesn't exist (404), treat as available to not block signups
          if (
            error.message?.includes('404') ||
            error.message?.includes('function') ||
            error.message?.includes('not found')
          ) {
            const result: UsernameValidationResult = {
              available: true,
              message: 'Username validation unavailable - assuming available',
            };
            setValidationResult(result);
            return result;
          }

          const result: UsernameValidationResult = {
            available: false,
            message: '', //I don't want to show an error message
            error: error.message,
          };
          setValidationResult(result);
          return result;
        }

        const result = data as UsernameValidationResult;
        // Clear any previous error state on successful validation
        if (result && !result.error) {
          delete result.error;
        }
        setValidationResult(result);
        return result;
      } catch (err) {
        console.error('Username validation error:', err);
        const result: UsernameValidationResult = {
          available: false,
          message: 'Failed to validate username',
          error: err instanceof Error ? err.message : 'Unknown error',
        };
        setValidationResult(result);
        return result;
      } finally {
        setIsValidating(false);
      }
    },
    [],
  );

  const clearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    isValidating,
    validationResult,
    validateUsername,
    clearValidation,
  };
}
