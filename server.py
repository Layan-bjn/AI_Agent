"""
server.py — يشغّل الـ crew عبر أمر التشغيل المؤكد "crewai run"،
ويكشفه كـ endpoint واحد يستخدمه الموقع (script.js -> AGENT_API_URL).

-------------------------------------------------------------------
كيف يشتغل (لأن crewai run هو أمر CLI وما يقبل مدخلات عبر HTTP مباشرة):
-------------------------------------------------------------------
1) نفتح ملف crew.jsonc الحقيقي عند كل طلب.
2) نستبدل قيمة inputs.project_idea بالفكرة اللي وصلت من الموقع.
3) نشغّل "crewai run" كـ subprocess داخل مجلد المشروع (نفس المجلد
   اللي فيه crew.jsonc وpyproject.toml).
4) نلتقط كل الـ stdout، ونحاول نطلع منه تقرير quality_control_task
   بصيغة JSON (آخر كتلة JSON صريحة بالمخرجات).
5) لو ما قدرنا نطلع JSON منظم، نرجّع النص الخام raw_output عشان
   ما نخسر شيء، والموقع يقدر يعرضه كـ fallback.

⚠️ نقطتين تحتاجون تتأكدون منهم بعد أول تجربة فعلية:

  أ) استبدال project_idea بالـ regex أدناه بسيط ويفترض إن القيمة
     الحالية داخل crew.jsonc ما فيها اقتباسات مهربة معقّدة. إذا صار
     خطأ بالاستبدال، ابعتولي رسالة الخطأ.

  ب) الطريقة الأدق والأثبت لضمان JSON منظم من quality_control_task
     هي إضافة output_json (أو output_pydantic) لتعريف هذا الـ task
     إذا كانت أداة/طبقة "Antigravity" اللي تبني الـ crew من هذا
     الملف تدعمه — بدل الاعتماد على استخراج JSON من نص حر بالـ regex.
     هذا السيرفر يدعم الحالتين، لكن الأول أضمن بكثير.

التشغيل:
  pip install fastapi uvicorn
  export CREW_PROJECT_DIR="/path/to/ai_agent"     # المجلد اللي فيه crew.jsonc
  uvicorn server:app --reload --port 8000

ثم في script.js:
  const AGENT_API_URL = "http://localhost:8000/analyze";
"""

import asyncio
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="AI_Agent Crew API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ضيّقوها لدومين الموقع الفعلي عند النشر
    allow_methods=["*"],
    allow_headers=["*"],
)

# مجلد مشروع الـ crew — عدّلوه أو مرروه عبر متغيّر بيئة CREW_PROJECT_DIR
PROJECT_DIR = Path(os.environ.get("CREW_PROJECT_DIR", "./ai_agent")).resolve()
CREW_FILE = PROJECT_DIR / "crew.jsonc"

# قفل يمنع تشغيل أكثر من طلب بنفس الوقت (لأننا نعدّل crew.jsonc مؤقتاً)
_run_lock = asyncio.Lock()


class AnalyzeRequest(BaseModel):
    project_idea: str


def _set_project_idea_in_file(original_text: str, project_idea: str) -> str:
    """يستبدل قيمة inputs.project_idea داخل نص crew.jsonc كما هو (مع الحفاظ على التعليقات)."""
    escaped = project_idea.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")
    pattern = re.compile(r'("project_idea"\s*:\s*)"(?:[^"\\]|\\.)*"')
    new_text, count = pattern.subn(rf'\1"{escaped}"', original_text)
    if count == 0:
        raise ValueError('لم يتم العثور على "project_idea" داخل crew.jsonc للاستبدال.')
    return new_text


def _extract_json_block(text: str) -> Optional[dict]:
    """يحاول استخراج آخر كتلة JSON صالحة من مخرجات الـ crew (stdout)."""
    candidates = re.findall(r"\{(?:[^{}]|\{[^{}]*\})*\}", text, re.DOTALL)
    for candidate in reversed(candidates):
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue
    return None


def _run_crewai_sync(project_idea: str) -> dict:
    if not CREW_FILE.exists():
        raise RuntimeError(f"لم أجد crew.jsonc في: {CREW_FILE}. اضبط CREW_PROJECT_DIR بشكل صحيح.")

    original_text = CREW_FILE.read_text(encoding="utf-8")
    try:
        updated_text = _set_project_idea_in_file(original_text, project_idea)
        CREW_FILE.write_text(updated_text, encoding="utf-8")

        proc = subprocess.run(
            ["crewai", "run"],
            cwd=str(PROJECT_DIR),
            capture_output=True,
            text=True,
            timeout=600,  # 10 دقائق كحد أقصى — عدّلوها حسب طول تشغيل الـ crew عندكم
        )
    finally:
        # نرجّع الملف الأصلي دائماً، حتى لو صار خطأ
        CREW_FILE.write_text(original_text, encoding="utf-8")

    stdout = proc.stdout or ""
    stderr = proc.stderr or ""

    if proc.returncode != 0:
        raise RuntimeError(f"crewai run فشل (كود {proc.returncode}). stderr:\n{stderr[-2000:]}")

    parsed = _extract_json_block(stdout)
    if parsed:
        return parsed

    # لم نجد JSON منظم — نرجّع النص الخام حتى لا نخسر النتيجة
    return {
        "verdict": "PASS" if re.search(r"\bPASS\b", stdout) else ("FAIL" if re.search(r"\bFAIL\b", stdout) else "UNKNOWN"),
        "idea_summary": None,
        "scores": None,
        "primary_reason": None,
        "recommendation": None,
        "raw_output": stdout[-6000:],
    }


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    if not req.project_idea or not req.project_idea.strip():
        raise HTTPException(status_code=400, detail="project_idea مطلوب")

    async with _run_lock:  # طلب واحد بنفس الوقت لأننا نعدّل ملف مشترك
        try:
            result = await asyncio.to_thread(_run_crewai_sync, req.project_idea)
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="استغرق تشغيل الـ crew وقتاً أطول من المتوقع.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return result


@app.get("/health")
def health():
    return {"status": "ok", "project_dir": str(PROJECT_DIR), "crew_file_exists": CREW_FILE.exists()}