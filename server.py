"""
server.py — يشغّل فريق الـ crew (crew.jsonc) خلف نقطة API واحدة
تستخدمها صفحة الرفع في الموقع (script.js -> AGENT_API_URL).

⚠️ هذا الملف مبني على افتراض بنية مشروع CrewAI القياسية، لكن
مشروعكم يستخدم "crew.jsonc" بدل agents.yaml/tasks.yaml المعتادة،
وهذا غالباً تنسيق مخصص (يبدو من "Antigravity Backend" في السكرين‌شوت
أنه بيئة/أداة تبني الـ crew تلقائياً من هذا الملف).

عشان أربط الاستدعاء الفعلي بشكل صحيح 100%، أحتاج واحد من:
  1) ملف main.py أو run.py اللي فيه استدعاء crew.kickoff(...) الحالي، أو
  2) الأمر اللي تشغلون فيه المشروع حالياً (مثلاً: crewai run)، أو
  3) ملف crew.py إذا موجود يوضح كيف يُبنى الـ Crew object من crew.jsonc

ريثما توفّرون أحد هذين، هذا السيرفر يعمل بوضعين:
  - إذا لقى دالة kickoff() حقيقية (بعد ما تعدّلون RUN_CREW أدناه) يستخدمها.
  - إذا لا، يرجّع خطأ واضح يطلب إكمال الربط، بدل بيانات وهمية صامتة.

التشغيل:
  pip install fastapi uvicorn python-dotenv
  uvicorn server:app --reload --port 8000

ثم في script.js:
  const AGENT_API_URL = "http://localhost:8000/analyze";
"""

import json
import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="AI_Agent Crew API")

# اسمحوا لصفحة الموقع (Live Server / أي مصدر أثناء التطوير) بالوصول للـ API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ضيّقوها لدومين الموقع الفعلي عند النشر
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    project_idea: str


def run_crew(project_idea: str) -> dict:
    """
    -------------------------------------------------------------
    TODO: استبدلوا محتوى هذي الدالة بالاستدعاء الحقيقي لمشروعكم.
    -------------------------------------------------------------
    مثال إذا كان مشروعكم بالبنية القياسية لـ CrewAI:

        from ai_agent.crew import AiAgent

        crew_output = AiAgent().crew().kickoff(inputs={"project_idea": project_idea})
        raw = crew_output.raw  # أو crew_output.json_dict إذا معرّف Pydantic output

    الناتج المطلوب إرجاعه من هذي الدالة (dict) لازم يطابق شكل
    quality_control_task expected_output:
      Idea Summary, Verdict (PASS/FAIL), Recommendation أو سبب الرفض،
      بالإضافة لنتائج feasibility_task (technical_score, commercial_score,
      overall_score) ونتائج startup_matching_task / incubator_task.

    إذا رجع الـ agent نص حر (raw string) بدل JSON منظم، لازم يتم
    استخراج/تحويل هذا النص إلى القاموس أدناه (أو تُعدّل تعريف
    expected_output في crew.jsonc ليطلب صراحة إخراج JSON).
    """
    raise NotImplementedError(
        "لم يتم ربط run_crew() بعد بمنطق تشغيل الـ crew الفعلي. "
        "زوّدوني بملف main.py / crew.py أو طريقة التشغيل الحالية لإكمال هذا الجزء."
    )


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    if not req.project_idea or not req.project_idea.strip():
        raise HTTPException(status_code=400, detail="project_idea مطلوب")

    try:
        result = run_crew(req.project_idea)
    except NotImplementedError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل تشغيل الـ crew: {e}")

    return result


@app.get("/health")
def health():
    return {"status": "ok"}
