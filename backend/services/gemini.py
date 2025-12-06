"""
Gemini AI Service for generating ad-related questions
"""
import os
import json
import httpx
from typing import List, Dict, Any, Optional


class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

    async def generate_questions(
        self,
        ad_description: str,
        question_count: int = 3,
        option_count: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Generate questions about an advertisement using Gemini AI.

        Args:
            ad_description: Description of the ad content
            question_count: Number of questions to generate
            option_count: Number of options per question

        Returns:
            List of questions with options and correct answer index
        """
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")

        prompt = f"""Aşağıdaki reklam açıklaması hakkında {question_count} adet soru oluştur.
Her soruda {option_count} şık olsun ve sadece 1 tanesi doğru olsun.

Reklam Açıklaması:
{ad_description}

Kurallar:
1. Sorular reklamı dikkatli incelemeyi gerektirmeli
2. Şıklar birbirine yakın olmalı ama ayırt edilebilir olmalı
3. Çok kolay veya çok zor sorular olmasın
4. Sorular Türkçe olmalı
5. Her soru reklamın farklı bir yönüne odaklanmalı (örn: marka, slogan, ürün özellikleri, fiyat vb.)

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir şey yazma:
{{
  "questions": [
    {{
      "question": "Soru metni buraya",
      "options": ["Şık A", "Şık B", "Şık C", "Şık D"],
      "correct": 0
    }}
  ]
}}

"correct" değeri doğru şıkkın index'idir (0'dan başlar).
"""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}?key={self.api_key}",
                    json={
                        "contents": [{
                            "parts": [{
                                "text": prompt
                            }]
                        }],
                        "generationConfig": {
                            "temperature": 0.7,
                            "topK": 40,
                            "topP": 0.95,
                            "maxOutputTokens": 2048,
                        }
                    },
                    headers={
                        "Content-Type": "application/json"
                    }
                )

                if response.status_code != 200:
                    error_detail = response.text
                    raise Exception(f"Gemini API error: {response.status_code} - {error_detail}")

                result = response.json()

                # Extract text from Gemini response
                if "candidates" not in result or not result["candidates"]:
                    raise Exception("No response from Gemini")

                text_content = result["candidates"][0]["content"]["parts"][0]["text"]

                # Clean up the response - remove markdown code blocks if present
                text_content = text_content.strip()
                if text_content.startswith("```json"):
                    text_content = text_content[7:]
                if text_content.startswith("```"):
                    text_content = text_content[3:]
                if text_content.endswith("```"):
                    text_content = text_content[:-3]
                text_content = text_content.strip()

                # Parse JSON
                parsed = json.loads(text_content)

                if "questions" not in parsed:
                    raise Exception("Invalid response format from Gemini")

                # Validate and format questions
                questions = []
                for i, q in enumerate(parsed["questions"]):
                    if "question" not in q or "options" not in q or "correct" not in q:
                        continue

                    # Ensure option count matches
                    options = q["options"][:option_count]
                    while len(options) < option_count:
                        options.append(f"Şık {len(options) + 1}")

                    questions.append({
                        "question_text": q["question"],
                        "options": options,
                        "correct_option_index": min(q["correct"], len(options) - 1),
                        "order": i
                    })

                return questions[:question_count]

        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse Gemini response as JSON: {e}")
        except httpx.RequestError as e:
            raise Exception(f"Network error while calling Gemini API: {e}")
        except Exception as e:
            raise Exception(f"Error generating questions: {e}")


# Singleton instance
gemini_service = GeminiService()
