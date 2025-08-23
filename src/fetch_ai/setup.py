import requests
import json
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

# Request and Response Models for REST endpoints
class ChatRequest(Model):
    message: str

class ChatResponse(Model):
    response: str
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
ASI1_API_KEY = "sk_35b5bd1888f243899624dfb068ad0f086800983c2d63455db891a017dae34339"  # Replace with your ASI1 key
ASI1_BASE_URL = "https://api.asi1.ai/v1"
ASI1_HEADERS = {
    "Authorization": f"Bearer {ASI1_API_KEY}",
    "Content-Type": "application/json"
}

CANISTER_ID = "u6s2n-gx777-77774-qaaba-cai" # Backend canister ID (vault_app0_backend)
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

async def process_query(query: str, ctx: Context) -> str:
    try:
        # Step 1: Initial call to ASI1 with user query and tools
        system_message = {
            "role": "system",
            "content": """You are a helpful AI assistant for an ICP vault system that manages USDX token investments. 
            
You can help users with:
- 📊 Vault information (vault status, investment products, available instruments)
- 💰 User portfolio management (balances, vault entries, investment reports, dividends)
- 👑 Admin functions (for authorized administrators only)

When users ask for specific data, use the available tools to fetch real information from the vault system.
When users ask general questions or need help understanding the system, provide helpful explanations without using tools.

Always be friendly, helpful, and clear in your responses."""
        }
        
        initial_message = {
            "role": "user",
            "content": query
        }
        payload = {
            "model": "asi1-mini",
            "messages": [system_message, initial_message],
            "tools": tools,
            "temperature": 0.7,
            "max_tokens": 1024
        }
        response = requests.post(
            f"{ASI1_BASE_URL}/chat/completions",
            headers=ASI1_HEADERS,
            json=payload
        )
        response.raise_for_status()
        response_json = response.json()

        # Step 2: Parse tool calls from response
        tool_calls = response_json["choices"][0]["message"].get("tool_calls", [])
        messages_history = [system_message, initial_message, response_json["choices"][0]["message"]]

        if not tool_calls:
            # Handle general questions without tool calls - let AI respond naturally
            return response_json["choices"][0]["message"]["content"]

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
        final_response.raise_for_status()
        final_response_json = final_response.json()

        # Step 5: Return the model's final answer
        return final_response_json["choices"][0]["message"]["content"]

    except Exception as e:
        ctx.logger.error(f"Error processing query: {str(e)}")
        return f"An error occurred while processing your request: {str(e)}"

agent = Agent(
    name='test-ICP-agent',
    port=8001,
    mailbox=True,
    endpoint=["http://localhost:8001"]
)
chat_proto = Protocol(spec=chat_protocol_spec)

@chat_proto.on_message(model=ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    try:
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
                response_text = await process_query(item.text, ctx)
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
        ctx.logger.info(f"Received REST chat message: {req.message}")
        response_text = await process_query(req.message, ctx)
        return ChatResponse(
            response=response_text,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        ctx.logger.error(f"Error in REST chat endpoint: {e}")
        return ChatResponse(
            response=f"An error occurred: {str(e)}",
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
        endpoints=["/api/chat", "/health", "/"],
        description="AI agent for ICP vault operations and investment management. Supports user portfolio tracking, admin functions, and comprehensive investment reporting."
    )

if __name__ == "__main__":
    print("Starting Fetch.AI ICP Vault Agent with integrated REST endpoints on port 8001...")
    print("Chat endpoint: http://localhost:8001/api/chat")
    print("Health endpoint: http://localhost:8001/health")
    print("Info endpoint: http://localhost:8001/")
    print("")
    print("Available functions:")
    print("📊 Vault Operations: get_vault_info, get_active_products, get_investment_instruments")
    print("💰 User Portfolio: get_user_balance, get_user_vault_entries, get_user_investment_report, get_unclaimed_dividends")
    print("👑 Admin Functions: check_admin_status, get_admin_investment_report (requires admin privileges)")
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