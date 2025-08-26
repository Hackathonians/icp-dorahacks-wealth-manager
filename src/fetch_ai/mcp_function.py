from openai import OpenAI
gpt_client = OpenAI()

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