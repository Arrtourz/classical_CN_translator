import os
import openai
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)  # 允许跨域请求，扩展需要

# Initialize the OpenAI client with DeepSeek API details
client = openai.OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com/v1",
)

def chat_with_deepseek(messages, model="deepseek-chat"):
    """
    使用DeepSeek API进行对话
    支持 deepseek-chat 和 deepseek-reasoner 模型
    """
    try:
        if model == "deepseek-reasoner":
            # 使用reasoner模型
            response = client.chat.completions.create(
                model="deepseek-reasoner",
                messages=messages,
                stream=True
            )
            
            reasoning_content = ""
            final_content = ""

            for chunk in response:
                if chunk.choices[0].delta.reasoning_content:
                    reasoning_content += chunk.choices[0].delta.reasoning_content
                elif chunk.choices[0].delta.content:
                    final_content += chunk.choices[0].delta.content

            return {
                "success": True,
                "content": final_content,
                "reasoning": reasoning_content,
                "model": model
            }
        else:
            # 使用普通chat模型
            response = client.chat.completions.create(
                model="deepseek-chat",
                messages=messages,
                stream=False
            )
            
            return {
                "success": True,
                "content": response.choices[0].message.content,
                "reasoning": None,
                "model": model
            }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "model": model
        }

@app.route('/translate', methods=['POST'])
def translate_text():
    """
    翻译API端点
    接收JSON: {
        "text": "要翻译的文本",
        "prompt": "自定义prompt（可选）",
        "model": "chat" 或 "reasoner"（可选，默认chat）
    }
    """
    try:
        data = request.json
        text = data.get('text', '')
        custom_prompt = data.get('prompt', '')
        model_type = data.get('model', 'chat')
        
        if not text:
            return jsonify({"success": False, "error": "没有提供要翻译的文本"})
        
        # 默认prompt
        default_prompt = "把这段文本翻译为现代中文并标注典故"
        
        # 使用自定义prompt或默认prompt
        prompt = custom_prompt if custom_prompt else default_prompt
        
        # 构建消息
        messages = [
            {"role": "user", "content": f"{prompt}：\n\n{text}"}
        ]
        
        # 选择模型
        model = "deepseek-reasoner" if model_type == "reasoner" else "deepseek-chat"
        
        # 调用DeepSeek API
        result = chat_with_deepseek(messages, model)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"服务器错误: {str(e)}"
        })

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({"status": "healthy", "service": "DeepSeek Translation API"})

@app.route('/models', methods=['GET'])
def get_models():
    """获取可用模型列表"""
    return jsonify({
        "models": [
            {
                "id": "chat",
                "name": "DeepSeek Chat",
                "description": "快速聊天模型"
            },
            {
                "id": "reasoner", 
                "name": "DeepSeek Reasoner",
                "description": "推理模型，提供思考过程"
            }
        ]
    })

if __name__ == '__main__':
    print("启动DeepSeek翻译API服务器...")
    print("默认端口: 5000")
    print("翻译端点: http://localhost:5000/translate")
    print("健康检查: http://localhost:5000/health")
    print("模型列表: http://localhost:5000/models")
    print("-" * 50)
    
    app.run(debug=True, host='localhost', port=5000)