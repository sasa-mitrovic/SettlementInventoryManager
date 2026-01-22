import { useState, useCallback, useRef, useEffect } from 'react';
import { supabaseClient } from '../supabase/supabaseClient';
import BitjitaChatService from '../services/bitjitaChatService';

export type VerificationStatus =
  | 'idle'
  | 'pending'
  | 'polling'
  | 'polling_stopped'
  | 'verified'
  | 'failed'
  | 'expired'
  | 'username_mismatch';

export interface VerificationState {
  status: VerificationStatus;
  code: string | null;
  verificationId: string | null;
  sessionToken: string | null;
  expectedUsername: string | null;
  bitjitaEntityId: string | null;
  expiresAt: Date | null;
  error: string | null;
  pollCount: number;
  foundUsername: string | null;
}

interface CreateVerificationResponse {
  success: boolean;
  verification_id?: string;
  code?: string;
  expires_at?: string;
  expected_username?: string;
  session_token?: string;
  error?: string;
}

interface VerifyCodeResponse {
  success: boolean;
  verified?: boolean;
  message?: string;
  expected?: string;
  found?: string;
  session_token?: string;
  bitjita_entity_id?: string;
  error?: string;
}

interface UseCharacterVerificationOptions {
  pollIntervalMs?: number;
  pollingDurationMs?: number;
}

interface UseCharacterVerificationReturn {
  state: VerificationState;
  startVerification: (
    expectedUsername: string,
    bitjitaEntityId: string
  ) => Promise<boolean>;
  cancelVerification: () => Promise<void>;
  retryPolling: () => void;
  retryVerification: () => Promise<void>;
  timeRemaining: number;
}

const POLL_INTERVAL_MS = 5000; // 5 seconds
const POLLING_DURATION_MS = 300000; // 5 minutes of polling (matches code expiry)

export function useCharacterVerification({
  pollIntervalMs = POLL_INTERVAL_MS,
  pollingDurationMs = POLLING_DURATION_MS,
}: UseCharacterVerificationOptions = {}): UseCharacterVerificationReturn {
  const [state, setState] = useState<VerificationState>({
    status: 'idle',
    code: null,
    verificationId: null,
    sessionToken: null,
    expectedUsername: null,
    bitjitaEntityId: null,
    expiresAt: null,
    error: null,
    pollCount: 0,
    foundUsername: null,
  });

  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Use refs to store current values for polling (avoids stale closure issues)
  const codeRef = useRef<string | null>(null);
  const verificationIdRef = useRef<string | null>(null);
  const expectedUsernameRef = useRef<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatService = useRef(BitjitaChatService.getInstance());
  const lastVerificationParamsRef = useRef<{
    username: string;
    entityId: string;
  } | null>(null);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Define handleExpiration before the useEffect that uses it
  const handleExpiration = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      status: 'expired',
      error: 'Verification code has expired. Please generate a new code.',
    }));
  }, []);

  // Start countdown timer when expiresAt changes
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    if (state.expiresAt && (state.status === 'polling' || state.status === 'polling_stopped')) {
      const updateCountdown = () => {
        const now = new Date();
        const remaining = Math.max(
          0,
          Math.floor((state.expiresAt!.getTime() - now.getTime()) / 1000)
        );
        setTimeRemaining(remaining);

        if (remaining === 0) {
          handleExpiration();
        }
      };

      updateCountdown();
      countdownIntervalRef.current = setInterval(updateCountdown, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [state.expiresAt, state.status, handleExpiration]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const stopPollingWithStatus = useCallback(() => {
    stopPolling();
    setState((prev) => ({
      ...prev,
      status: 'polling_stopped',
      error: null,
    }));
  }, [stopPolling]);

  const pollForCode = useCallback(async () => {
    // Check if polling duration has elapsed
    if (pollingStartTimeRef.current) {
      const elapsed = Date.now() - pollingStartTimeRef.current;
      if (elapsed >= pollingDurationMs) {
        console.log('[Verification] Polling duration elapsed, stopping polling');
        stopPollingWithStatus();
        return;
      }
    }

    // Use refs to get current values (avoids stale closure)
    const currentCode = codeRef.current;
    const currentVerificationId = verificationIdRef.current;
    const currentExpectedUsername = expectedUsernameRef.current;

    if (!currentCode || !currentVerificationId || !currentExpectedUsername) {
      console.log('[Verification] Missing required data for polling');
      return;
    }

    setState((prev) => ({ ...prev, pollCount: prev.pollCount + 1 }));

    try {
      console.log(`[Verification] Polling for code "${currentCode}"`);

      const result = await chatService.current.searchForVerificationCode(currentCode);

      if (result.found && result.username) {
        console.log(`[Verification] Code found! Posted by: ${result.username}`);

        // Verify with the backend (no auth required)
        const { data, error } = await supabaseClient.rpc('verify_character_code', {
          p_verification_id: currentVerificationId,
          p_found_username: result.username,
        });

        if (error) {
          console.error('[Verification] Backend verification error:', error);
          stopPolling();
          setState((prev) => ({
            ...prev,
            status: 'failed',
            error: error.message,
          }));
          return;
        }

        const response = data as VerifyCodeResponse;

        if (response.success && response.verified) {
          console.log('[Verification] Character verified successfully!');
          stopPolling();
          setState((prev) => ({
            ...prev,
            status: 'verified',
            foundUsername: result.username,
            sessionToken: response.session_token || prev.sessionToken,
            bitjitaEntityId: response.bitjita_entity_id || prev.bitjitaEntityId,
            error: null,
          }));
        } else if (response.success && !response.verified) {
          console.log(
            `[Verification] Username mismatch: expected "${response.expected}", found "${response.found}"`
          );
          setState((prev) => ({
            ...prev,
            status: 'username_mismatch',
            foundUsername: response.found || null,
            error: `The code was posted by "${response.found}" but you selected "${response.expected}". Please post the code from the correct character.`,
          }));
        } else {
          console.error('[Verification] Verification failed:', response.error);
          stopPolling();
          setState((prev) => ({
            ...prev,
            status: 'failed',
            error: response.error || 'Verification failed',
          }));
        }
      }
    } catch (error) {
      console.error('[Verification] Polling error:', error);
      // Don't stop on individual poll errors - just log and continue
    }
  }, [pollingDurationMs, stopPolling, stopPollingWithStatus]);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollingStartTimeRef.current = Date.now();
    setState((prev) => ({ ...prev, status: 'polling', pollCount: 0 }));

    // Initial poll
    pollForCode();

    // Set up interval for subsequent polls
    pollIntervalRef.current = setInterval(pollForCode, pollIntervalMs);
  }, [pollForCode, pollIntervalMs]);

  const retryPolling = useCallback(() => {
    // Restart polling with existing code (if not expired)
    if (codeRef.current && verificationIdRef.current && state.expiresAt && new Date() < state.expiresAt) {
      startPolling();
    }
  }, [state.expiresAt, startPolling]);

  const startVerification = useCallback(
    async (
      expectedUsername: string,
      bitjitaEntityId: string
    ): Promise<boolean> => {
      stopPolling();

      // Store params for retry
      lastVerificationParamsRef.current = {
        username: expectedUsername,
        entityId: bitjitaEntityId,
      };

      // Clear refs
      codeRef.current = null;
      verificationIdRef.current = null;
      expectedUsernameRef.current = expectedUsername;
      sessionTokenRef.current = null;

      setState({
        status: 'pending',
        code: null,
        verificationId: null,
        sessionToken: null,
        expectedUsername,
        bitjitaEntityId,
        expiresAt: null,
        error: null,
        pollCount: 0,
        foundUsername: null,
      });

      try {
        // Call RPC without authentication (uses anon key)
        const { data, error } = await supabaseClient.rpc(
          'create_verification_code',
          {
            p_expected_username: expectedUsername,
            p_bitjita_entity_id: bitjitaEntityId,
            p_session_token: null, // Let server generate
          }
        );

        if (error) {
          console.error('[Verification] Failed to create code:', error);
          setState((prev) => ({
            ...prev,
            status: 'failed',
            error: error.message,
          }));
          return false;
        }

        const response = data as CreateVerificationResponse;

        if (!response.success) {
          console.error('[Verification] RPC returned failure:', response.error);
          setState((prev) => ({
            ...prev,
            status: 'failed',
            error: response.error || 'Failed to create verification code',
          }));
          return false;
        }

        console.log(
          '[Verification] Code created:',
          response.code,
          'expires:',
          response.expires_at
        );

        // Store in refs immediately for polling
        codeRef.current = response.code || null;
        verificationIdRef.current = response.verification_id || null;
        sessionTokenRef.current = response.session_token || null;

        const expiresAt = response.expires_at ? new Date(response.expires_at) : null;

        setState((prev) => ({
          ...prev,
          code: response.code || null,
          verificationId: response.verification_id || null,
          sessionToken: response.session_token || null,
          expiresAt,
        }));

        // Start polling immediately
        startPolling();

        return true;
      } catch (error) {
        console.error('[Verification] Error:', error);
        setState((prev) => ({
          ...prev,
          status: 'failed',
          error:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        }));
        return false;
      }
    },
    [stopPolling, startPolling]
  );

  const cancelVerification = useCallback(async () => {
    stopPolling();

    if (verificationIdRef.current) {
      try {
        await supabaseClient.rpc('cancel_verification', {
          p_verification_id: verificationIdRef.current,
          p_session_token: sessionTokenRef.current,
        });
      } catch (error) {
        console.error('[Verification] Failed to cancel:', error);
      }
    }

    // Clear refs
    codeRef.current = null;
    verificationIdRef.current = null;
    expectedUsernameRef.current = null;
    sessionTokenRef.current = null;

    setState({
      status: 'idle',
      code: null,
      verificationId: null,
      sessionToken: null,
      expectedUsername: null,
      bitjitaEntityId: null,
      expiresAt: null,
      error: null,
      pollCount: 0,
      foundUsername: null,
    });
  }, [stopPolling]);

  const retryVerification = useCallback(async () => {
    if (lastVerificationParamsRef.current) {
      await startVerification(
        lastVerificationParamsRef.current.username,
        lastVerificationParamsRef.current.entityId
      );
    }
  }, [startVerification]);

  return {
    state,
    startVerification,
    cancelVerification,
    retryPolling,
    retryVerification,
    timeRemaining,
  };
}
