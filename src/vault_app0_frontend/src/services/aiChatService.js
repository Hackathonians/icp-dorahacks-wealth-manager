// AI Chat Service - handles communication with Fetch.AI agent
class AiChatService {
  constructor() {
    // Since the Fetch.AI agent uses uagents protocol, we'll simulate the communication
    // In production, you would set up a proper WebSocket or HTTP bridge to the agent
    this.mockMode = false; // Set to false when you have the agent bridge ready
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generate a unique session ID for the user
   * @returns {string} - Unique session ID
   */
  generateSessionId() {
    return `web_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Send a message to the AI agent
   * @param {string} message - The user's message
   * @param {string|null} userPrincipal - The user's principal (optional)
   * @returns {Promise<string>} - The AI's response
   */
  async sendMessage(message, userPrincipal = null) {
    try {
      if (this.mockMode) {
        // Mock responses for demonstration
        const response = await this.makeMockRequest(message);
        return response;
      } else {
        // Real agent communication would go here
        const response = await this.makeRealRequest(message, userPrincipal);
        return response;
      }
    } catch (error) {
      console.error('Error communicating with AI agent:', error);
      throw error;
    }
  }

  /**
   * Make a real request to the Fetch.AI agent directly
   */
  async makeRealRequest(message, userPrincipal) {
    try {
      const response = await fetch('http://localhost:8001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          session_id: this.sessionId,
          user_principal: userPrincipal
        })
      });

      if (!response.ok) {
        throw new Error(`Fetch.AI agent error: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.warn('Fetch.AI agent not available, falling back to mock:', error);
      // Fall back to mock if agent is not running
      return await this.makeMockRequest(message);
    }
  }

  /**
   * Clear conversation memory
   * @returns {Promise<boolean>} - Success status
   */
  async clearMemory() {
    try {
      if (this.mockMode) {
        // For mock mode, just generate a new session ID
        this.sessionId = this.generateSessionId();
        return true;
      } else {
        const response = await fetch('http://localhost:8001/api/clear-memory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: this.sessionId
          })
        });

        if (!response.ok) {
          throw new Error(`Clear memory error: ${response.status}`);
        }

        const data = await response.json();
        // Generate new session ID after clearing memory
        this.sessionId = this.generateSessionId();
        return data.success;
      }
    } catch (error) {
      console.error('Error clearing memory:', error);
      // Fallback: generate new session ID
      this.sessionId = this.generateSessionId();
      return false;
    }
  }

  async makeMockRequest(message) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Mock responses based on message content
    if (message.toLowerCase().includes('balance')) {
      return `I'll check the Bitcoin balance for you. The address tb1qexample1234567890abcdef has a confirmed balance of 150,000 satoshis (1.5 mBTC) and 0 unconfirmed satoshis.`;
    } else if (message.toLowerCase().includes('fee')) {
      return `Current Bitcoin fee percentiles are: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89] sat/vB. This represents the distribution of fees across different confirmation priorities.`;
    } else if (message.toLowerCase().includes('address')) {
      return `Your canister's P2PKH Bitcoin address is: bc1qmock_address_example_123456789. You can use this address to receive Bitcoin payments.`;
    } else if (message.toLowerCase().includes('dummy') || message.toLowerCase().includes('test')) {
      return `Dummy test successful! The canister vault_app0_backend is responding correctly. All systems are operational.`;
    } else if (message.toLowerCase().includes('send') || message.toLowerCase().includes('transfer')) {
      const amountMatch = message.match(/(\d+)/);
      const amount = amountMatch ? amountMatch[1] : '50000';
      return `Transaction initiated! Sent ${amount} satoshis to destination address tb1qdestination123456789. Transaction ID: mock_tx_send_123. Status: Success.`;
    } else if (message.toLowerCase().includes('vault') || message.toLowerCase().includes('info')) {
      return `Vault Information:\n• Total Locked: 0 tokens\n• Dividend Count: 0 distributions\n• Total Products: 2 investment products\n• Status: Active and operational`;
    } else if (message.toLowerCase().includes('utxo')) {
      return `UTXOs for the requested address:\n• Transaction ID: mock_tx_123\n• Output: 0\n• Value: 50,000 satoshis\n• Script: mock_script\n\nThis shows one unspent transaction output available for spending.`;
    } else {
      return `I understand you're asking: "${message}"\n\nI can help you with:\n• Bitcoin balance queries\n• UTXO lookups\n• Fee information\n• Sending Bitcoin transactions\n• Vault information\n• Address generation\n• System tests\n\nPlease ask me about any of these topics!`;
    }
  }

  /**
   * Check if the Fetch.AI agent is available
   * @returns {Promise<boolean>}
   */
  async checkFetchAIAgent() {
    try {
      const response = await fetch('http://localhost:8001/health', {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Auto-detect if Fetch.AI agent is available and set mode accordingly
   */
  async autoDetectMode() {
    const agentAvailable = await this.checkFetchAIAgent();
    this.mockMode = !agentAvailable;
    return !this.mockMode;
  }

  /**
   * Manually set the service mode
   * @param {boolean} mockMode - True for mock mode, false for real mode
   */
  setMode(mockMode) {
    this.mockMode = mockMode;
  }

  /**
   * Get current session ID
   * @returns {string} - Current session ID
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Start a new session (generates new session ID)
   * @returns {string} - New session ID
   */
  startNewSession() {
    this.sessionId = this.generateSessionId();
    return this.sessionId;
  }

  /**
   * Check if the AI agent is available
   * @returns {Promise<boolean>}
   */
  async checkAgentStatus() {
    if (this.mockMode) {
      return true; // Mock is always available
    } else {
      return await this.checkFetchAIAgent();
    }
  }
}

export default new AiChatService();