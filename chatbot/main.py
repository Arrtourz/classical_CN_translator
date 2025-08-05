import os
import openai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize the OpenAI client with DeepSeek API details
client = openai.OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com/v1",
)

def chat_with_reasoner(messages):
    """
    Sends messages to the DeepSeek Reasoner model and streams the response.
    It separates and prints the reasoning_content and the final content.
    Returns the final content for multi-turn conversation context.
    """
    try:
        response = client.chat.completions.create(
            model="deepseek-reasoner",
            messages=messages,
            stream=True
        )
        
        reasoning_content = ""
        final_content = ""

        print("Assistant's thought process (reasoning_content):")
        for chunk in response:
            if chunk.choices[0].delta.reasoning_content:
                reasoning_text = chunk.choices[0].delta.reasoning_content
                print(reasoning_text, end="", flush=True)
                reasoning_content += reasoning_text
            elif chunk.choices[0].delta.content:
                # This part prints the "final answer" header only once
                if not final_content and reasoning_content:
                    print("\n\nAssistant's final answer (content):")
                elif not final_content:
                     print("Assistant's final answer (content):")
                
                content_text = chunk.choices[0].delta.content
                print(content_text, end="", flush=True)
                final_content += content_text

        print("\n")
        return final_content

    except Exception as e:
        print(f"\nAn error occurred: {e}")
        return None

if __name__ == "__main__":
    # Message history for multi-turn conversation
    messages = []
    print("Welcome to the interactive chat with DeepSeek Reasoner!")
    print("Type your message and press Enter. Type 'exit' or 'quit' to end.")
    print("-" * 50)

    while True:
        try:
            # Get user input
            user_prompt = input("You: ")
            if user_prompt.lower() in ["exit", "quit"]:
                print("Exiting chat...")
                break
            
            print() # Add a newline for better formatting

            # Add user message to history and call the model
            messages.append({"role": "user", "content": user_prompt})
            assistant_content = chat_with_reasoner(messages)
            
            if assistant_content:
                # Per documentation, only add the 'content' part to the message history
                messages.append({"role": "assistant", "content": assistant_content})
            else:
                # If there was an error (e.g., network issue), remove the last user message
                # so it's not part of the history for the next valid turn.
                print("An error occurred, the last message was not processed.")
                messages.pop()

        except KeyboardInterrupt:
            print("\nExiting chat...")
            break
        except Exception as e:
            print(f"\nA critical error occurred: {e}")
            break
