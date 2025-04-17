from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
        
    audio_file = request.files['audio']
    scenario = request.form.get('scenario', 'job_interview')
    
    try:
        # Use OpenAI's Whisper API to transcribe audio
        transcript = openai.Audio.transcribe(
            model="whisper-1",
            file=audio_file
        )
        
        return jsonify({"transcript": transcript.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate_response', methods=['POST'])
def generate_response():
    data = request.json
    transcript = data.get('transcript', '')
    scenario = data.get('scenario', 'job_interview')
    difficulty = data.get('difficulty', 'medium')
    
    if not transcript:
        return jsonify({"error": "No transcript provided"}), 400
        
    try:
        # Prepare prompt based on scenario and difficulty
        scenario_prompts = {
            "job_interview": "You are a job interviewer. Respond to the candidate's answer.",
            "customer_service": "You are a customer with a problem. Respond to the customer service representative.",
            "networking": "You are a professional at a networking event. Continue the conversation.",
            "presentation": "You are an audience member at a presentation. Ask a relevant question."
        }
        
        difficulty_modifiers = {
            "easy": "Be friendly and straightforward.",
            "medium": "Be neutral but occasionally challenging.",
            "hard": "Be critical and challenging, finding flaws in their response."
        }
        
        prompt = f"{scenario_prompts.get(scenario, scenario_prompts['job_interview'])} {difficulty_modifiers.get(difficulty, difficulty_modifiers['medium'])} The person said: '{transcript}'"
        
        # Generate response using OpenAI's GPT
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": transcript}
            ],
            max_tokens=150
        )
        
        return jsonify({"response": response.choices[0].message.content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze_speech', methods=['POST'])
def analyze_speech():
    data = request.json
    transcript = data.get('transcript', '')
    scenario = data.get('scenario', 'job_interview')
    
    if not transcript:
        return jsonify({"error": "No transcript provided"}), 400
        
    try:
        # Prepare prompt for feedback analysis
        prompt = f"""
        Analyze the following response in a {scenario} scenario. Provide feedback on:
        1. Clarity and articulation
        2. Confidence and tone
        3. Content relevance
        4. Areas for improvement
        
        Response: "{transcript}"
        
        Provide constructive feedback that is helpful and specific.
        """
        
        # Generate feedback using OpenAI's GPT
        feedback = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a communication skills coach."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300
        )
        
        return jsonify({"feedback": feedback.choices[0].message.content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
