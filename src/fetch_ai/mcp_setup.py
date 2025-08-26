import asyncio
import nest_asyncio
from mcp import ClientSession
from mcp.client.sse import sse_client
from openai import OpenAI
nest_asyncio.apply()  
import asyncio
import json
from contextlib import AsyncExitStack
from typing import Any, Dict, List
import nest_asyncio
from dotenv import load_dotenv
from mcp import ClientSession, StdioServerParameters
from mcp.client.sse import sse_client
from openai import AsyncOpenAI
nest_asyncio.apply()

# Load environment variables
load_dotenv()

# Global variables to store session state
session = None
exit_stack = AsyncExitStack()
openai_client = AsyncOpenAI()
gpt_client = OpenAI()
model = "gpt-5"


import asyncio, os
from contextlib import AsyncExitStack
from mcp import ClientSession
from mcp.client.sse import sse_client

URL = "https://mcp.api.coingecko.com/sse"
HEADERS = {"x-cg-demo-api-key": os.getenv("COINGECKO_API")}

stack = AsyncExitStack()
session: ClientSession | None = None

async def connect():
    global session
    read, write = await stack.enter_async_context(sse_client(URL, headers=HEADERS))
    session = await stack.enter_async_context(ClientSession(read, write))
    await session.initialize()
    return session

async def close():
    await stack.aclose()

session = None
tools = None
async def main():
    global session, tools
    session = await connect()

    tools = await session.list_tools()

    price = await session.call_tool(
        "get_simple_price",
        {"ids": "bitcoin,ethereum", "vs_currencies": "usd"}
    )

    # 🔥 You can still reuse `session` later
    price2 = await session.call_tool(
        "get_simple_price",
        {"ids": "dogecoin", "vs_currencies": "usd"}
    )
    await close()
asyncio.run(main())

coingecko_mcp_tools = [
    {
        "type": "function",
        "function": {
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.inputSchema,
        },
    }
    for tool in tools.tools
]


def gpt_response(messages):
    response = gpt_client.responses.create(
        model="gpt-5",
        input=messages,
        text={
            "format": {
            "type": "text"
            },
            "verbosity": "medium"
        },
        reasoning={
            "effort": "medium"
        },
        tools=[],
        store=True
        )
    return response.output[1].content[0].text