import requests
import json
import os
from dotenv import load_dotenv
from uagents_core.contrib.protocols.chat import (
    chat_protocol_spec,
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    StartSessionContent,
)
from uagents import Agent, Context, Protocol, Model
from datetime import datetime, timezone
from uuid import uuid4

# Load environment variables
load_dotenv()

# Request and Response Models for REST endpoints
class ChatRequest(Model):
    message: str
    session_id: str = "web_session"
    user_principal: str = None

class ChatResponse(Model):
    response: str
    timestamp: str
    session_id: str

class ClearMemoryRequest(Model):
    session_id: str = "web_session"

class ClearMemoryResponse(Model):
    success: bool
    message: str
    timestamp: str

class HealthResponse(Model):
    status: str
    service: str
    timestamp: str

class InfoResponse(Model):
    name: str
    port: int
    endpoints: list
    description: str

# ASI1 API settings
ASI1_API_KEY = os.getenv("ASI1_API_KEY")
ASI1_BASE_URL = "https://api.asi1.ai/v1"

if not ASI1_API_KEY:
    print("⚠️  WARNING: ASI1_API_KEY not found in environment variables!")
    print("   Please add your ASI1 API key to the .env file:")
    print("   ASI1_API_KEY=your_api_key_here")
    print("   The agent will return helpful error messages until configured.")

ASI1_HEADERS = {
    "Authorization": f"Bearer {ASI1_API_KEY}" if ASI1_API_KEY else "Bearer missing_key",
    "Content-Type": "application/json"
}

CANISTER_ID = os.getenv("CANISTER_ID_VAULT_APP0_BACKEND")
BASE_URL = "http://127.0.0.1:4943"

HEADERS = {
    "Host": f"{CANISTER_ID}.localhost",
    "Content-Type": "application/json"
}

# Function definitions for ASI1 function calling
tools = [
    # ========== VAULT FUNCTIONS ==========
    
    # Token and Balance Functions
    {
        "type": "function",
        "function": {
            "name": "get_user_balance",
            "description": "Returns the USDX token balance of a user's account.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_principal": {
                        "type": "string",
                        "description": "The principal ID of the user to check balance for."
                    }
                },
                "required": ["user_principal"],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    
    # Vault Information Functions
    {
        "type": "function",
        "function": {
            "name": "get_vault_info",
            "description": "Returns general information about the vault including total locked tokens, dividend count, and product information.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_active_products",
            "description": "Returns all active investment products available for users to invest in.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_investment_instruments",
            "description": "Returns all available investment instruments with their details including APY, risk level, and investment limits.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    
    # User Portfolio Functions
    {
        "type": "function",
        "function": {
            "name": "get_user_vault_entries",
            "description": "Returns all vault entries (locked investments) for a specific user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_principal": {
                        "type": "string",
                        "description": "The principal ID of the user to get vault entries for."
                    }
                },
                "required": ["user_principal"],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_investment_report",
            "description": "Returns a comprehensive investment report for a user including total investments, ROI, and dividends.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_principal": {
                        "type": "string",
                        "description": "The principal ID of the user to get investment report for."
                    }
                },
                "required": ["user_principal"],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_unclaimed_dividends",
            "description": "Returns all unclaimed dividends for a specific user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_principal": {
                        "type": "string",
                        "description": "The principal ID of the user to check unclaimed dividends for."
                    }
                },
                "required": ["user_principal"],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    
    # Admin Functions (require admin privileges)
    {
        "type": "function",
        "function": {
            "name": "check_admin_status",
            "description": "Checks if a user has admin privileges. Required before using admin functions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_principal": {
                        "type": "string",
                        "description": "The principal ID to check for admin privileges."
                    }
                },
                "required": ["user_principal"],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_admin_investment_report",
            "description": "Returns comprehensive platform investment report with user statistics and performance metrics. Admin only.",
            "parameters": {
                "type": "object",
                "properties": {
                    "admin_principal": {
                        "type": "string",
                        "description": "The principal ID of the admin requesting the report."
                    }
                },
                "required": ["admin_principal"],
                "additionalProperties": False
            },
            "strict": True
        }
    }
]

async def call_icp_endpoint(func_name: str, args: dict):
    # ========== VAULT FUNCTIONS ==========
    
    # Token and Balance Functions
    if func_name == "get_user_balance":
        url = f"{BASE_URL}/balance"
        response = requests.post(url, headers=HEADERS, json={"owner": args["user_principal"]})
    
    # Vault Information Functions
    elif func_name == "get_vault_info":
        url = f"{BASE_URL}/vault-info"
        response = requests.post(url, headers=HEADERS, json={})
    elif func_name == "get_active_products":
        url = f"{BASE_URL}/products"
        response = requests.post(url, headers=HEADERS, json={})
    elif func_name == "get_investment_instruments":
        url = f"{BASE_URL}/get-investment-instruments"
        response = requests.post(url, headers=HEADERS, json={})
    
    # User Portfolio Functions
    elif func_name == "get_user_vault_entries":
        url = f"{BASE_URL}/user-vault-entries"
        response = requests.post(url, headers=HEADERS, json={"user": args["user_principal"]})
    elif func_name == "get_user_investment_report":
        url = f"{BASE_URL}/user-investment-report"
        response = requests.post(url, headers=HEADERS, json={"user": args["user_principal"]})
    elif func_name == "get_unclaimed_dividends":
        url = f"{BASE_URL}/unclaimed-dividends"
        response = requests.post(url, headers=HEADERS, json={"user": args["user_principal"]})
    
    # Admin Functions
    elif func_name == "check_admin_status":
        url = f"{BASE_URL}/admin-check"
        response = requests.post(url, headers=HEADERS, json={"principal": args["user_principal"]})
    elif func_name == "get_admin_investment_report":
        url = f"{BASE_URL}/admin-investment-report"
        response = requests.post(url, headers=HEADERS, json={"admin_principal": args["admin_principal"]})
    
    else:
        raise ValueError(f"Unsupported function call: {func_name}")
    
    response.raise_for_status()
    return response.json()

# Global variable to store admin principals for session-based auth
USER_ADMIN_STATUS = {}

# Memory management for conversation context
CONVERSATION_MEMORY = {}
MAX_MEMORY_MESSAGES = 50  # Maximum messages to keep in memory per session

def get_session_id(sender: str) -> str:
    """Generate a consistent session ID from sender address."""
    return f"session_{sender}"

def add_to_memory(session_id: str, role: str, content: str, ctx: Context):
    """Add a message to conversation memory."""
    if session_id not in CONVERSATION_MEMORY:
        CONVERSATION_MEMORY[session_id] = []
    
    CONVERSATION_MEMORY[session_id].append({
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Limit memory size
    if len(CONVERSATION_MEMORY[session_id]) > MAX_MEMORY_MESSAGES:
        CONVERSATION_MEMORY[session_id] = CONVERSATION_MEMORY[session_id][-MAX_MEMORY_MESSAGES:]
    
    ctx.logger.info(f"Added to memory for {session_id}: {role} message")

def get_conversation_history(session_id: str, limit: int = 10) -> list:
    """Get recent conversation history for context."""
    if session_id not in CONVERSATION_MEMORY:
        return []
    
    return CONVERSATION_MEMORY[session_id][-limit:] if limit else CONVERSATION_MEMORY[session_id]

def clear_memory(session_id: str, ctx: Context) -> bool:
    """Clear conversation memory for a session."""
    try:
        if session_id in CONVERSATION_MEMORY:
            del CONVERSATION_MEMORY[session_id]
            ctx.logger.info(f"Cleared memory for session {session_id}")
            return True
        return False
    except Exception as e:
        ctx.logger.error(f"Error clearing memory for {session_id}: {str(e)}")
        return False

async def check_user_admin_status(user_principal: str, ctx: Context) -> bool:
    """Check if a user has admin privileges and cache the result."""
    try:
        # Check cache first
        if user_principal in USER_ADMIN_STATUS:
            return USER_ADMIN_STATUS[user_principal]
        
        # Call the admin check endpoint
        result = await call_icp_endpoint("check_admin_status", {"user_principal": user_principal})
        is_admin = result.get("is_admin", False)
        
        # Cache the result
        USER_ADMIN_STATUS[user_principal] = is_admin
        
        ctx.logger.info(f"User {user_principal} admin status: {is_admin}")
        return is_admin
        
    except Exception as e:
        ctx.logger.error(f"Error checking admin status for {user_principal}: {str(e)}")
        return False

async def process_query(query: str, ctx: Context, session_id: str = "default", user_principal: str = None) -> str:
    try:
        # Check for missing API key
        if not ASI1_API_KEY or ASI1_API_KEY == "your_asi1_api_key_here":
            return """🔑 **API Configuration Required**

I need an ASI1 API key to function properly. Please:

1. Get an API key from https://api.asi1.ai/
2. Add it to your `.env` file:
   ```
   ASI1_API_KEY=your_actual_api_key
   ```
3. Restart the agent

Until then, I can help with general information about the vault system, but I won't be able to fetch real data or use advanced AI features."""

        # Check for memory management commands
        if query.strip().lower() in ['/clear', '/clear memory', '/reset', '/new session']:
            clear_memory(session_id, ctx)
            return "🧠 Memory cleared! Starting a fresh conversation. How can I help you?"
        
        # Add user message to memory
        add_to_memory(session_id, "user", query, ctx)
        
        # Get conversation history for context
        conversation_history = get_conversation_history(session_id, limit=10)
        
        # Step 1: Initial call to ASI1 with user query, tools, and conversation history
        user_context = ""
        if user_principal:
            user_context = f"\n\nIMPORTANT: The user's principal ID is: {user_principal}. When they ask about 'my balance', 'my investments', or other personal queries, automatically use this principal ID to fetch their data without asking them to provide it."
        
        system_message = {
            "role": "system",
            "content": f"""You are a helpful AI assistant for an ICP vault system that manages USDX token investments. 
            
You can help users with:
- 📊 Vault information (vault status, investment products, available instruments)
- 💰 User portfolio management (balances, vault entries, investment reports, dividends)
- 👑 Admin functions (for authorized administrators only)

When users ask for specific data, use the available tools to fetch real information from the vault system.
When users ask general questions or need help understanding the system, provide helpful explanations without using tools.

You have access to previous conversation history to maintain context. Reference past interactions when relevant to provide better, more personalized responses.

Special commands:
- '/clear', '/clear memory', '/reset', or '/new session' - Clear conversation memory

Always be friendly, helpful, and clear in your responses.{user_context}"""
        }
        
        # Build messages with conversation history
        messages = [system_message]
        
        # Add conversation history (excluding system messages to avoid duplication)
        for msg in conversation_history[:-1]:  # Exclude the last message (current query) as it's added separately
            if msg["role"] != "system":
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        # Add current user message
        initial_message = {
            "role": "user",
            "content": query
        }
        messages.append(initial_message)
        payload = {
            "model": "asi1-mini",
            "messages": messages,
            "tools": tools,
            "temperature": 0.7,
            "max_tokens": 1024
        }
        response = requests.post(
            f"{ASI1_BASE_URL}/chat/completions",
            headers=ASI1_HEADERS,
            json=payload
        )
        
        if response.status_code == 401:
            ctx.logger.error("ASI1 API authentication failed - check API key")
            return "🔑 **Authentication Error**: Invalid or missing ASI1 API key. Please check your API key configuration in the .env file."
        elif response.status_code == 403:
            ctx.logger.error("ASI1 API access forbidden")
            return "🚫 **Access Denied**: Your API key doesn't have access to this service. Please check your ASI1 subscription."
        elif response.status_code == 429:
            ctx.logger.error("ASI1 API rate limit exceeded")
            return "⏳ **Rate Limited**: Too many requests. Please wait a moment and try again."
        
        response.raise_for_status()
        response_json = response.json()

        # Step 2: Parse tool calls from response
        tool_calls = response_json["choices"][0]["message"].get("tool_calls", [])
        messages_history = messages + [response_json["choices"][0]["message"]]

        if not tool_calls:
            # Handle general questions without tool calls - let AI respond naturally
            ai_response = response_json["choices"][0]["message"]["content"]
            # Add AI response to memory
            add_to_memory(session_id, "assistant", ai_response, ctx)
            return ai_response

        # Step 3: Execute tools and format results
        for tool_call in tool_calls:
            func_name = tool_call["function"]["name"]
            arguments = json.loads(tool_call["function"]["arguments"])
            tool_call_id = tool_call["id"]

            ctx.logger.info(f"Executing {func_name} with arguments: {arguments}")

            try:
                # Check if this is an admin function that requires authentication
                admin_functions = ["get_admin_investment_report"]
                
                if func_name in admin_functions:
                    # Get admin principal from arguments
                    admin_principal = arguments.get("admin_principal")
                    if not admin_principal:
                        error_content = {
                            "error": "Admin functions require admin_principal parameter",
                            "status": "authentication_required"
                        }
                        content_to_send = json.dumps(error_content)
                    else:
                        # Check admin status
                        is_admin = await check_user_admin_status(admin_principal, ctx)
                        if not is_admin:
                            error_content = {
                                "error": f"Access denied: {admin_principal} does not have admin privileges",
                                "status": "unauthorized",
                                "required_role": "admin"
                            }
                            content_to_send = json.dumps(error_content)
                        else:
                            # User is admin, proceed with function call
                            result = await call_icp_endpoint(func_name, arguments)
                            content_to_send = json.dumps(result)
                else:
                    # Regular function call
                    result = await call_icp_endpoint(func_name, arguments)
                    content_to_send = json.dumps(result)
                    
            except Exception as e:
                error_content = {
                    "error": f"Tool execution failed: {str(e)}",
                    "status": "failed"
                }
                content_to_send = json.dumps(error_content)

            tool_result_message = {
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": content_to_send
            }
            messages_history.append(tool_result_message)

        # Step 4: Send results back to ASI1 for final answer
        final_payload = {
            "model": "asi1-mini",
            "messages": messages_history,
            "temperature": 0.7,
            "max_tokens": 1024
        }
        final_response = requests.post(
            f"{ASI1_BASE_URL}/chat/completions",
            headers=ASI1_HEADERS,
            json=final_payload
        )
        
        if final_response.status_code == 401:
            ctx.logger.error("ASI1 API authentication failed on final call")
            return "🔑 **Authentication Error**: API key issue during final processing. Please check your configuration."
        elif final_response.status_code == 429:
            ctx.logger.error("ASI1 API rate limit exceeded on final call")
            return "⏳ **Rate Limited**: Please wait a moment and try again."
            
        final_response.raise_for_status()
        final_response_json = final_response.json()

        # Step 5: Return the model's final answer
        final_ai_response = final_response_json["choices"][0]["message"]["content"]
        # Add final AI response to memory
        add_to_memory(session_id, "assistant", final_ai_response, ctx)
        return final_ai_response

    except Exception as e:
        ctx.logger.error(f"Error processing query: {str(e)}")
        return f"An error occurred while processing your request: {str(e)}"

agent = Agent(
    name='test-ICP-agent',
    port=8001,
    mailbox=True
)
chat_proto = Protocol(spec=chat_protocol_spec)

@chat_proto.on_message(model=ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    try:
        session_id = get_session_id(sender)
        
        ack = ChatAcknowledgement(
            timestamp=datetime.now(timezone.utc),
            acknowledged_msg_id=msg.msg_id
        )
        await ctx.send(sender, ack)

        for item in msg.content:
            if isinstance(item, StartSessionContent):
                ctx.logger.info(f"Got a start session message from {sender}")
                continue
            elif isinstance(item, TextContent):
                ctx.logger.info(f"Got a message from {sender}: {item.text}")
                response_text = await process_query(item.text, ctx, session_id, None)
                ctx.logger.info(f"Response text: {response_text}")
                response = ChatMessage(
                    timestamp=datetime.now(timezone.utc),
                    msg_id=uuid4(),
                    content=[TextContent(type="text", text=response_text)]
                )
                await ctx.send(sender, response)
            else:
                ctx.logger.info(f"Got unexpected content from {sender}")
    except Exception as e:
        ctx.logger.error(f"Error handling chat message: {str(e)}")
        error_response = ChatMessage(
            timestamp=datetime.now(timezone.utc),
            msg_id=uuid4(),
            content=[TextContent(type="text", text=f"An error occurred: {str(e)}")]
        )
        await ctx.send(sender, error_response)

@chat_proto.on_message(model=ChatAcknowledgement)
async def handle_chat_acknowledgement(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.info(f"Received acknowledgement from {sender} for message {msg.acknowledged_msg_id}")
    if msg.metadata:
        ctx.logger.info(f"Metadata: {msg.metadata}")

agent.include(chat_proto)

# Native Agent REST Endpoints
@agent.on_rest_post("/api/chat", ChatRequest, ChatResponse)
async def handle_chat_rest(ctx: Context, req: ChatRequest) -> ChatResponse:
    """REST endpoint for frontend chat interface"""
    try:
        ctx.logger.info(f"Received REST chat message: {req.message} (session: {req.session_id})")
        user_principal = req.user_principal
        response_text = await process_query(req.message, ctx, req.session_id, user_principal)
        return ChatResponse(
            response=response_text,
            timestamp=datetime.now().isoformat(),
            session_id=req.session_id
        )
    except Exception as e:
        ctx.logger.error(f"Error in REST chat endpoint: {e}")
        return ChatResponse(
            response=f"An error occurred: {str(e)}",
            timestamp=datetime.now().isoformat(),
            session_id=req.session_id
        )

@agent.on_rest_post("/api/clear-memory", ClearMemoryRequest, ClearMemoryResponse)
async def handle_clear_memory_rest(ctx: Context, req: ClearMemoryRequest) -> ClearMemoryResponse:
    """REST endpoint to clear conversation memory"""
    try:
        ctx.logger.info(f"Clearing memory for session: {req.session_id}")
        success = clear_memory(req.session_id, ctx)
        return ClearMemoryResponse(
            success=success,
            message="Memory cleared successfully" if success else "No memory found for session",
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        ctx.logger.error(f"Error in clear memory endpoint: {e}")
        return ClearMemoryResponse(
            success=False,
            message=f"Error clearing memory: {str(e)}",
            timestamp=datetime.now().isoformat()
        )

@agent.on_rest_get("/health", HealthResponse)
async def handle_health(ctx: Context) -> HealthResponse:
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="Fetch.AI Agent",
        timestamp=datetime.now().isoformat()
    )

@agent.on_rest_get("/", InfoResponse)
async def handle_info(ctx: Context) -> InfoResponse:
    """Agent information endpoint"""
    return InfoResponse(
        name="Fetch.AI ICP Vault Agent",
        port=8001,
        endpoints=["/api/chat", "/api/clear-memory", "/health", "/"],
        description="AI agent for ICP vault operations and investment management. Supports user portfolio tracking, admin functions, comprehensive investment reporting, and persistent conversation memory."
    )

if __name__ == "__main__":
    print("Starting Fetch.AI ICP Vault Agent with integrated REST endpoints on port 8001...")
    print("Chat endpoint: http://localhost:8001/api/chat")
    print("Clear memory endpoint: http://localhost:8001/api/clear-memory")
    print("Health endpoint: http://localhost:8001/health")
    print("Info endpoint: http://localhost:8001/")
    print("")
    print("Available functions:")
    print("📊 Vault Operations: get_vault_info, get_active_products, get_investment_instruments")
    print("💰 User Portfolio: get_user_balance, get_user_vault_entries, get_user_investment_report, get_unclaimed_dividends")
    print("👑 Admin Functions: check_admin_status, get_admin_investment_report (requires admin privileges)")
    print("🧠 Memory Commands: /clear, /clear memory, /reset, /new session")
    print("")
    agent.run()


"""
========== EXAMPLE QUERIES ==========

🏦 VAULT INFORMATION QUERIES (No specific user required):
- What's the current vault status and total locked tokens?
- Show me all available investment products with their durations
- List all investment instruments with their APY rates and risk levels
- What are the current investment opportunities?
- How much is currently locked in the vault?
- What investment products are active right now?

💰 USER PORTFOLIO QUERIES (Replace with actual principal):
- What's my USDX token balance? [principal: xygmt-g36ra-6fx4l-vrohf-fhtid-h7jba-gbumz-34aii-c2j73-vh53b-mqe]
- Show me all my current vault investments and their status [principal: ddm5i-napuo-a6jjo-czjha-xcr4l-dzpqe-uygc7-w3yxz-dmqso-zd36q-eae]
- Get my complete investment performance report [principal: xygmt-g36ra-6fx4l-vrohf-fhtid-h7jba-gbumz-34aii-c2j73-vh53b-mqe]
- Check my unclaimed dividends and earnings [principal: ddm5i-napuo-a6jjo-czjha-xcr4l-dzpqe-uygc7-w3yxz-dmqso-zd36q-eae]
- What's my total ROI across all investments?
- Which of my vault entries can I unlock now?

💡 GENERAL INVESTMENT QUERIES:
- How do dividends work in this system?
- What are the different lock durations available?
- Explain the investment instruments and their risk levels
- What's the difference between flexible and time-locked staking?
- How is the APY calculated for different instruments?

👑 ADMIN QUERIES (Requires admin privileges):
- Check if I have admin privileges [principal: xygmt-g36ra-6fx4l-vrohf-fhtid-h7jba-gbumz-34aii-c2j73-vh53b-mqe]
- Get the complete platform investment report [admin: xygmt-g36ra-6fx4l-vrohf-fhtid-h7jba-gbumz-34aii-c2j73-vh53b-mqe]
- Show me platform-wide investment statistics and user activity
- What are the top-performing investment products?
- How many users are actively investing?

🔧 SYSTEM QUERIES:
- What functions can you help me with?
- How do I check my investment status?
- What information do I need to provide to get my portfolio data?
- Can you explain how to interpret my investment report?

========== USAGE NOTES ==========
- Replace example principals with actual user principals from your system
- User portfolio queries require your principal ID to fetch personalized data
- Admin functions require valid admin principal IDs and admin privileges
- General information queries work without providing any principal ID
- The AI can explain concepts and provide help without making tool calls
"""