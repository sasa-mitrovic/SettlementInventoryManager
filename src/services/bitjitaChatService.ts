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
  private readonly BASE_URL = 'https://bitjita.com/api';
  private readonly CORS_PROXY = 'https://api.allorigins.win/get?url=';

  public static getInstance(): BitjitaChatService {
    if (!BitjitaChatService.instance) {
      BitjitaChatService.instance = new BitjitaChatService();
    }
    return BitjitaChatService.instance;
  }

  /**
   * Make a CORS-safe request to the Bitjita API
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.BASE_URL}${endpoint}`;

    try {
      console.log('🌐 [Chat] Making API request to:', url);

      // Use backend proxy for API requests
      try {
        const proxyUrl = `/api/bitjita-proxy?endpoint=${endpoint.substring(1)}`;
        console.log('🔄 [Chat] Using backend proxy:', proxyUrl);
        const proxyResponse = await fetch(proxyUrl);
        if (proxyResponse.ok) {
          console.log('✅ [Chat] Backend proxy request successful');
          return await proxyResponse.json();
        }
        console.log('⚠️ [Chat] Backend proxy failed, trying direct request...');
      } catch (proxyError) {
        console.log(
          '⚠️ [Chat] Proxy error:',
          proxyError instanceof Error ? proxyError.message : 'Unknown proxy error'
        );
      }

      // Try direct request second
      try {
        const directResponse = await fetch(url);
        if (directResponse.ok) {
          console.log('✅ [Chat] Direct API request successful');
          return await directResponse.json();
        }
        console.log('⚠️ [Chat] Direct request failed, trying AllOrigins proxy...');
      } catch (corsError) {
        console.log(
          '⚠️ [Chat] CORS error, using AllOrigins proxy:',
          corsError instanceof Error ? corsError.message : 'Unknown CORS error'
        );
      }

      // Use AllOrigins CORS proxy as final fallback
      const allOriginsUrl = `${this.CORS_PROXY}${encodeURIComponent(url)}`;
      console.log('🔄 [Chat] Using AllOrigins proxy URL:', allOriginsUrl);

      const allOriginsResponse = await fetch(allOriginsUrl);

      if (!allOriginsResponse.ok) {
        throw new Error(
          `AllOrigins proxy request failed with status: ${allOriginsResponse.status}`
        );
      }

      const allOriginsData = await allOriginsResponse.json();

      if (allOriginsData.status && allOriginsData.status.http_code === 200) {
        console.log('✅ [Chat] AllOrigins proxy request successful');
        return JSON.parse(allOriginsData.contents);
      } else {
        console.error('❌ [Chat] API returned error:', allOriginsData.status);
        throw new Error(
          `API request failed: ${allOriginsData.status?.http_code || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.error('❌ [Chat] API request failed:', error);
      throw new Error(
        'Unable to connect to Bitjita Chat API. Please check your connection or try again later.'
      );
    }
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
    // The code should be the entire message or at least contained in it
    const trimmedCode = code.trim();

    for (const message of messages) {
      const messageText = message.text.trim();

      // Check if the message contains the verification code
      // Allow for some flexibility: exact match, or code surrounded by whitespace/punctuation
      if (
        messageText === trimmedCode ||
        messageText.includes(trimmedCode)
      ) {
        console.log(
          `✅ [Chat] Found verification code "${code}" posted by "${message.username}"`
        );
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
