 
from uagents import Agent, Context, Model
 
class Message(Model):
    message: str
 
 
bob = Agent(
    name="Bob2",
    port=8004,
    seed="BobSecretPhrase1",
    endpoint=["http://127.0.0.1:8004/submit"],
)
 
print(f"Your agent's address is: {bob.address}")
 
 
@bob.on_message(model=Message)
async def message_handler(ctx: Context, sender: str, msg: Message):
    ctx.logger.info(f'Received message from {sender}: {msg.message}')
 
    await ctx.send(sender, Message(message="Hello There!"))
 
 
if __name__ == "__main__":
    bob.run()
 
