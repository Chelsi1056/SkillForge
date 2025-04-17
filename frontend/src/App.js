import React, { useState, useRef } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  // State variables
  const [scenario, setScenario] = useState('Interview');
  const [difficulty, setDifficulty] = useState('beginner');
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // References
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  // Prompts for different scenarios
  const prompts = {
    Interview: {
      beginner: "Tell me about yourself.",
      intermediate: "Describe a challenge you faced and how you overcame it.",
      advanced: "Explain a time when you had to make a difficult decision with limited information."
    },
    Debate: {
      beginner: "Should homework be mandatory in schools?",
      intermediate: "Is social media beneficial or harmful to society?",
      advanced: "Should artificial intelligence development be regulated by governments?"
    },
    Presentation: {
      beginner: "Present a brief overview of your favorite hobby.",
      intermediate: "Explain the importance of your field of study or work.",
      advanced: "Present a solution to a complex problem in your industry or field."
    }
  };

  // Start recording audio
  const startRecording = () => {
    setError('');
    setTranscript('');
    setAiResponse('');
    setFeedback(null);
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.start();
        setRecording(true);
        audioChunksRef.current = [];

        mediaRecorderRef.current.addEventListener('dataavailable', event => {
          audioChunksRef.current.push(event.data);
        });

        mediaRecorderRef.current.addEventListener('stop', () => {
          const audioBlob = new Blob(audioChunksRef.current);
          sendAudioToBackend(audioBlob);
          
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
        });
      })
      .catch(err => {
        setError('Error accessing microphone: ' + err.message);
      });
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setLoading(true);
    }
  };

  // Send audio to backend for transcription
  const sendAudioToBackend = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await axios.post('http://localhost:5000/transcribe', formData);
      const transcriptText = response.data.transcript;
      setTranscript(transcriptText);
      
      // Get AI response
      await getAIResponse(transcriptText);
      
      // Analyze transcript
      await analyzeTranscript(transcriptText);
      
      setLoading(false);
    } catch (err) {
      setError('Error processing audio: ' + err.message);
      setLoading(false);
    }
  };

  // Get AI response based on transcript
  const getAIResponse = async (transcriptText) => {
    try {
      const response = await axios.post('http://localhost:5000/ai_response', {
        user_input: transcriptText,
        difficulty: difficulty,
        scenario: scenario
      });
      
      setAiResponse(response.data.ai_response);
    } catch (err) {
      setError('Error getting AI response: ' + err.message);
    }
  };

  // Analyze transcript for feedback
  const analyzeTranscript = async (transcriptText) => {
    try {
      const response = await axios.post('http://localhost:5000/analyze', {
        transcript: transcriptText
      });
      
      setFeedback(response.data);
    } catch (err) {
      setError('Error analyzing transcript: ' + err.message);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>SkillForge - AI Interpersonal Skills Simulator</h1>
        <p>Practice your communication skills with AI-powered feedback</p>
      </header>

      <main>
        <section className="controls">
          <div className="control-group">
            <label>Scenario:</label>
            <select 
              value={scenario} 
              onChange={e => setScenario(e.target.value)}
              disabled={recording}
            >
              <option value="Interview">Interview</option>
              <option value="Debate">Debate</option>
              <option value="Presentation">Presentation</option>
            </select>
          </div>

          <div className="control-group">
            <label>Difficulty:</label>
            <select 
              value={difficulty} 
              onChange={e => setDifficulty(e.target.value)}
              disabled={recording}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </section>

        <section className="prompt-section">
          <h2>Your Prompt:</h2>
          <p className="prompt">{prompts[scenario][difficulty]}</p>
        </section>

        <section className="recording-section">
          {!recording ? (
            <button 
              className="record-button" 
              onClick={startRecording}
              disabled={loading}
            >
              Start Recording
            </button>
          ) : (
            <button 
              className="stop-button" 
              onClick={stopRecording}
            >
              Stop Recording
            </button>
          )}
          {loading && <div className="loading">Processing...</div>}
        </section>

        {error && <div className="error-message">{error}</div>}

        {transcript && (
          <section className="transcript-section">
            <h2>Your Response:</h2>
            <p className="transcript">{transcript}</p>
          </section>
        )}

        {aiResponse && (
          <section className="ai-response-section">
            <h2>AI Response:</h2>
            <p className="ai-response">{aiResponse}</p>
          </section>
        )}

        {feedback && (
          <section className="feedback-section">
            <h2>Performance Feedback:</h2>
            <div className="feedback-metrics">
              <div className="metric">
                <span className="metric-label">Filler Words:</span>
                <span className="metric-value">{feedback.filler_count}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Logical Flow:</span>
                <span className="metric-value">{feedback.logical_flow_score}/5</span>
              </div>
              <div className="metric">
                <span className="metric-label">Words per Sentence:</span>
                <span className="metric-value">{feedback.avg_words_per_sentence}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Speaking Pace:</span>
                <span className="metric-value">{feedback.words_per_minute} wpm</span>
              </div>
            </div>
            
            {feedback.tips.length > 0 && (
              <div className="feedback-tips">
                <h3>Tips for Improvement:</h3>
                <ul>
                  {feedback.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>

      <footer>
        <p>Created for the 24-hour Hackathon - April 2025</p>
      </footer>
    </div>
  );
}

export default App;
