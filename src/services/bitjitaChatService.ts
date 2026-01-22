// Bitjita Chat API Service
// Handles fetching chat messages for verification purposes

export interface BitjitaChatMessage {
  username: string; // Format: "en/{username}" or "{language}/{username}"
  text: string;
  timestamp: string;
}

export interface BitjitaChatResponse {
  messages: BitjitaChatMessage[];
}

export interface ParsedChatMessage {
  rawUsername: string;
  username: string; // Extracted username without language prefix
  text: string;
  timestamp: string;
}

export interface VerificationCodeMatch {
  found: boolean;
  username: string | null;
  timestamp: string | null;
}

class BitjitaChatService {
  private static instance: BitjitaChatService;

  public static getInstance(): BitjitaChatService {
    if (!BitjitaChatService.instance) {
      BitjitaChatService.instance = new BitjitaChatService();
    }
    return BitjitaChatService.instance;
  }

  /**
   * Make a request to the Bitjita API via backend proxy
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    // Use backend proxy for API requests to avoid CORS issues
const proxyUrl = `/api/bitjita-proxy?endpoint=${encodeURIComponent(endpoint.substring(1))}`;

    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Fetch recent chat messages from the global chat
   */
  async fetchChatMessages(): Promise<BitjitaChatResponse> {
    try {
      const data = await this.makeRequest<BitjitaChatResponse>('/chat');
      return data;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw new Error(
        `Failed to fetch chat messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse username from the "language/username" format
   * Examples: "en/Olask" -> "Olask", "de/PlayerName" -> "PlayerName"
   */
  parseUsername(rawUsername: string): string {
    if (!rawUsername) return '';

    // Check if it contains a language prefix (format: "xx/username")
    const slashIndex = rawUsername.indexOf('/');
    if (slashIndex > 0 && slashIndex < 4) {
      // Language prefix is typically 2-3 characters
      return rawUsername.substring(slashIndex + 1);
    }

    return rawUsername;
  }

  /**
   * Parse all chat messages to extract clean usernames
   */
  parseMessages(response: BitjitaChatResponse): ParsedChatMessage[] {
    if (!response.messages || !Array.isArray(response.messages)) {
      return [];
    }

    return response.messages.map((msg) => ({
      rawUsername: msg.username,
      username: this.parseUsername(msg.username),
      text: msg.text,
      timestamp: msg.timestamp,
    }));
  }

  /**
   * Search chat messages for a verification code
   * Returns the username of the person who posted the code (if found)
   */
  findVerificationCode(
    messages: ParsedChatMessage[],
    code: string
  ): VerificationCodeMatch {
    // Look for exact code match in message text
    // The code should be the entire message content (trimmed)
    const trimmedCode = code.trim();

    for (const message of messages) {
      const messageText = message.text.trim();

      // Only accept exact matches to prevent false positives
      // The user should post ONLY the verification code
if (messageText === trimmedCode) {
  // Only accept messages from the last 5 minutes
  const messageTime = new Date(message.timestamp);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  if (messageTime >= fiveMinutesAgo) {
    return {
      found: true,
      username: message.username,
      timestamp: message.timestamp,
    };
  }
}
        return {
          found: true,
          username: message.username,
          timestamp: message.timestamp,
        };
      }
    }

    return {
      found: false,
      username: null,
      timestamp: null,
    };
  }

  /**
   * Convenience method: Fetch messages and search for a code in one call
   */
  async searchForVerificationCode(code: string): Promise<VerificationCodeMatch> {
    try {
      const response = await this.fetchChatMessages();
      const messages = this.parseMessages(response);
      return this.findVerificationCode(messages, code);
    } catch (error) {
      console.error('Error searching for verification code:', error);
      // Return not found on error - let the caller handle retries
      return {
        found: false,
        username: null,
        timestamp: null,
      };
    }
  }

  /**
   * Check if two usernames match (case-insensitive)
   */
  usernamesMatch(username1: string, username2: string): boolean {
    return (
      username1.toLowerCase().trim() === username2.toLowerCase().trim()
    );
  }
}

export default BitjitaChatService;
