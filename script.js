/* =========================================================
   وادي مكة للتقنية — منصة مشاريع التخرج
   ========================================================= */

/* -------------------------------------------------------
   1) نقطة الاتصال بالـ Agent (فريق CrewAI: crew.jsonc)
   -------------------------------------------------------
   عدّل الرابط أدناه ليشير إلى سيرفر FastAPI اللي يشغّل الـ
   crew (راجع server.py المرفق). الدالة analyzeWithAgent()
   هي المكان الوحيد اللي يحتاج تعديل لربط الموقع بالـ agent.

   الـ crew يقبل مُدخل نصي واحد فقط: project_idea. لذا يتم
   دمج اسم المشروع والوصف في نص واحد قبل الإرسال — الملفات
   المرفوعة لا تُرسل حالياً للـ crew لأنه لا يقرأ ملفات.

   شكل الطلب (POST):
   { "project_idea": "نص فكرة المشروع الكامل" }

   شكل الرد المتوقع (من quality_control_task)، بصياغة JSON
   بعد استخراجها من تقرير الـ QC agent:
   {
     "verdict": "PASS" | "FAIL",
     "idea_summary": "...",
     "scores": { "technical_score": 0-100, "commercial_score": 0-100, "overall_score": 0-100 },
     "primary_reason": "...",
     "recommendation": {
        "type": "startup",
        "startup_name": "...",
        "justification": "..."
     }
     // أو عند عدم وجود ستارتب مطابق:
     // "recommendation": { "type": "incubators", "items": [
     //   { "incubator_name": "...", "justification": "...", "source": "..." }, ... ] }
     // أو عند FAIL:
     // "recommendation": null
   }
--------------------------------------------------------- */
const AGENT_API_URL = ""; // <-- ضع هنا رابط سيرفر الـ crew، مثال: "http://localhost:8000/analyze"

async function analyzeWithAgent(payload) {
  const project_idea =
    (payload.projectName ? payload.projectName + " — " : "") + (payload.description || payload.projectName || "");

  if (!AGENT_API_URL) {
    // لا يوجد رابط agent مضبوط بعد — نستخدم تحليلاً تجريبياً محلياً
    // حتى تشتغل الواجهة فوراً. احذف هذا الجزء بعد ربط الـ agent الحقيقي.
    console.warn("AGENT_API_URL غير مضبوط — يتم استخدام تحليل تجريبي محلي.");
    return mockAnalyze(payload);
  }

  const res = await fetch(AGENT_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_idea }),
  });

  if (!res.ok) throw new Error("تعذّر الاتصال بالـ agent (كود " + res.status + ")");
  return res.json();
}

// تحليل تجريبي محلي — يحاكي شكل تقرير quality_control_task فقط
// ريثما يتم ربط سيرفر الـ crew الحقيقي عبر AGENT_API_URL
function mockAnalyze(payload) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const seed = (payload.projectName || "").length + (payload.description || "").length;
      const rand = (base) => Math.min(97, Math.max(58, base + ((seed * 7) % 23) - 11));
      const overall = rand(76);
      const pass = overall >= 65;

      let recommendation = null;
      if (pass) {
        const hasStartupMatch = seed % 2 === 0;
        recommendation = hasStartupMatch
          ? {
              type: "startup",
              startup_name: "مثال ستارتب سعودي",
              justification: "تشابه في المجال والتقنية المستخدمة والسوق المستهدف مع فكرة المشروع.",
            }
          : {
              type: "incubators",
              items: [
                { incubator_name: "حاضنة تقنية 1 (مثال)", justification: "تدعم مشاريع بنفس المجال.", source: "بحث تجريبي" },
                { incubator_name: "مسرّعة أعمال 2 (مثال)", justification: "تركّز على حلول الطاقة والاستدامة.", source: "بحث تجريبي" },
              ],
            };
      }

      resolve({
        verdict: pass ? "PASS" : "FAIL",
        idea_summary: "هذا ملخص تجريبي مبدئي لفكرة «" + (payload.projectName || "المشروع") + "». بعد ربط سيرفر الـ crew الحقيقي سيظهر هنا ملخص فعلي من quality_control_agent.",
        scores: {
          technical_score: rand(78),
          commercial_score: rand(71),
          overall_score: overall,
        },
        primary_reason: pass
          ? "الفكرة قابلة للتنفيذ تقنياً وتجارياً بشكل مبدئي."
          : "المخاطر التقنية أو التجارية أعلى من الحد المقبول حالياً.",
        recommendation,
      });
    }, 1400);
  });
}

/* -------------------------------------------------------
   2) تخزين المشاريع محلياً (localStorage)
   حتى تُربط قاعدة بيانات حقيقية، تُحفظ المشاريع في المتصفح
   وتظهر في صفحة "المشاريع".
--------------------------------------------------------- */
const STORE_KEY = "wadimakkah_projects";

function getProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveProject(project) {
  const list = getProjects();
  list.unshift(project);
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

/* بيانات تمهيدية تظهر أول مرة فقط، حتى لا تكون صفحة المشاريع فارغة */
const SEED_PROJECTS = [
  {
    id: "seed-1",
    projectName: "نظام تتبع ذكي لإدارة النفايات الصلبة",
    studentName: "عبدالله القرشي",
    department: "هندسة حاسب",
    description: "نظام IoT لمراقبة مستوى امتلاء الحاويات وتحسين مسارات الجمع باستخدام خوارزميات تحسين المسار.",
    date: "2026-05-12",
    verdict: "PASS",
    scores: { technical_score: 88, commercial_score: 82, overall_score: 85 },
  },
  {
    id: "seed-2",
    projectName: "منصة تعليمية تفاعلية لذوي صعوبات التعلم",
    studentName: "لينا الزهراني",
    department: "علوم حاسب",
    description: "تطبيق ويب يستخدم التعلم التكيّفي لتخصيص المحتوى التعليمي حسب نمط تعلّم كل طالب.",
    date: "2026-04-28",
    verdict: "PASS",
    scores: { technical_score: 91, commercial_score: 87, overall_score: 89 },
  },
  {
    id: "seed-3",
    projectName: "روبوت مساعد لفرز المنتجات الغذائية",
    studentName: "سعود الحربي",
    department: "هندسة ميكانيكية",
    description: "ذراع آلي مزوّد برؤية حاسوبية لفرز المنتجات حسب الجودة داخل خطوط الإنتاج الصغيرة.",
    date: "2026-04-02",
    verdict: "PASS",
    scores: { technical_score: 76, commercial_score: 80, overall_score: 78 },
  },
  {
    id: "seed-4",
    projectName: "تطبيق لتحليل استهلاك الطاقة في المنازل",
    studentName: "منيرة العتيبي",
    department: "هندسة كهربائية",
    description: "لوحة تحكم ذكية تعرض استهلاك الأجهزة المنزلية وتقترح توصيات لخفض الفاتورة.",
    date: "2026-03-19",
    verdict: "FAIL",
    scores: { technical_score: 55, commercial_score: 48, overall_score: 52 },
  },
  {
    id: "seed-5",
    projectName: "نظام توصية لمحتوى القراءة العربي",
    studentName: "فهد آل سالم",
    department: "علوم حاسب",
    description: "محرك توصية يعتمد على معالجة اللغة الطبيعية لاقتراح كتب ومقالات عربية حسب اهتمامات القارئ.",
    date: "2026-03-05",
    verdict: "PASS",
    scores: { technical_score: 84, commercial_score: 79, overall_score: 81 },
  },
  {
    id: "seed-6",
    projectName: "منصة لربط المزارعين بمحطات الطقس المحلية",
    studentName: "ريم الدوسري",
    department: "نظم معلومات",
    description: "خدمة تنبيهات زراعية مبنية على بيانات الطقس الفعلية لمساعدة المزارعين على اتخاذ قرارات الري والحصاد.",
    date: "2026-02-21",
    verdict: "PASS",
    scores: { technical_score: 80, commercial_score: 83, overall_score: 82 },
  },
];

function ensureSeed() {
  if (!localStorage.getItem(STORE_KEY)) {
    localStorage.setItem(STORE_KEY, JSON.stringify(SEED_PROJECTS));
  }
}

/* -------------------------------------------------------
   3) توست إشعارات بسيط
--------------------------------------------------------- */
function showToast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.innerHTML = '<span class="grad-dot"></span>' + msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2800);
}

/* -------------------------------------------------------
   4) أدوات مساعدة
--------------------------------------------------------- */
function fmtSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

function scoreClass(avg) {
  if (avg >= 85) return "high";
  if (avg >= 70) return "mid";
  return "low";
}

function avgScore(scores) {
  if (scores.overall_score !== undefined) return scores.overall_score;
  const v = Object.values(scores);
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

/* =========================================================
   منطق صفحة الرفع (index.html)
   ========================================================= */
function initUploadPage() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const fileList = document.getElementById("fileList");
  const form = document.getElementById("uploadForm");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const analysisBox = document.getElementById("analysisBox");
  const analysisHead = document.getElementById("analysisHead");
  const analysisBody = document.getElementById("analysisBody");

  if (!form) return;

  let files = [];

  function renderFiles() {
    fileList.innerHTML = "";
    files.forEach((f, i) => {
      const chip = document.createElement("div");
      chip.className = "file-chip";
      chip.innerHTML = `
        <div class="file-ico">${(f.name.split(".").pop() || "?").slice(0, 3).toUpperCase()}</div>
        <div class="file-meta">
          <div class="file-name">${f.name}</div>
          <div class="file-size">${fmtSize(f.size)}</div>
        </div>
        <button type="button" class="file-remove" aria-label="إزالة الملف" data-i="${i}">✕</button>
      `;
      fileList.appendChild(chip);
    });
    fileList.querySelectorAll(".file-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        files.splice(Number(btn.dataset.i), 1);
        renderFiles();
      });
    });
  }

  function addFiles(list) {
    Array.from(list).forEach((f) => files.push(f));
    renderFiles();
  }

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") fileInput.click();
  });
  fileInput.addEventListener("change", (e) => addFiles(e.target.files));

  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add("drag");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag");
    })
  );
  dropzone.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const projectName = document.getElementById("projectName").value.trim();
    const studentName = document.getElementById("studentName").value.trim();
    const department = document.getElementById("department").value;
    const description = document.getElementById("description").value.trim();

    if (!projectName || !studentName || !department) {
      showToast("رجاءً عبّي كل الحقول المطلوبة");
      return;
    }
    if (files.length === 0) {
      showToast("رجاءً ارفع ملف واحد على الأقل");
      return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "جارِ التحليل…";

    analysisBox.classList.add("show");
    analysisHead.innerHTML = `
      <div class="spinner"></div>
      <b>الوكيل الذكي يحلل مشروعك الآن…</b>
      <span class="status-pill pending">قيد التحليل</span>
    `;
    analysisBody.innerHTML = `<p style="color:var(--text-soft)">قد تستغرق هذه العملية بضع ثوانٍ حسب حجم الملفات.</p>`;
    analysisBox.scrollIntoView({ behavior: "smooth", block: "center" });

    try {
      const payload = {
        projectName,
        studentName,
        department,
        description,
        files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
      };

      const result = await analyzeWithAgent(payload);
      const pass = result.verdict === "PASS";

      analysisHead.innerHTML = `
        <b>تقرير فريق التحليل الذكي</b>
        <span class="status-pill ${pass ? "" : "fail"}">${pass ? "PASS — مقبول" : "FAIL — مرفوض"}</span>
      `;

      const scoresHtml = result.scores
        ? `<div class="score-row">` +
          [
            ["technical_score", "التقييم التقني"],
            ["commercial_score", "التقييم التجاري"],
            ["overall_score", "التقييم العام"],
          ]
            .filter(([key]) => result.scores[key] !== undefined)
            .map(
              ([key, label]) =>
                `<div class="score-chip"><div class="score-val">${result.scores[key]}</div><div class="score-label">${label}</div></div>`
            )
            .join("") +
          `</div>`
        : "";

      let recHtml = "";
      const rec = result.recommendation;
      if (rec && rec.type === "startup") {
        recHtml = `
          <div class="rec-block">
            <div class="rec-title">🎯 مطابقة مع ستارتب قائم</div>
            <div class="rec-card">
              <b>${rec.startup_name}</b>
              <p>${rec.justification || ""}</p>
            </div>
          </div>`;
      } else if (rec && rec.type === "incubators" && rec.items && rec.items.length) {
        recHtml = `
          <div class="rec-block">
            <div class="rec-title">🚀 حاضنات ومسرّعات مقترحة</div>
            ${rec.items
              .map(
                (it) => `
              <div class="rec-card">
                <b>${it.incubator_name}</b>
                <p>${it.justification || ""}</p>
                ${it.source ? `<span class="rec-source">المصدر: ${it.source}</span>` : ""}
              </div>`
              )
              .join("")}
          </div>`;
      }

      analysisBody.innerHTML = `
        <p>${result.idea_summary || ""}</p>
        ${scoresHtml}
        <div class="analysis-note" style="border-top:none;padding-top:0;margin-top:4px;">
          <b style="color:var(--text)">${pass ? "سبب القبول: " : "سبب الرفض: "}</b>${result.primary_reason || "—"}
        </div>
        ${recHtml}
        <div class="analysis-note">
          هذا التحليل مبدئي وناتج عن فريق وكلاء ذكاء اصطناعي، وقد لا يعكس القرار النهائي للجنة المشاريع.
        </div>
      `;

      // حفظ المشروع محلياً ليظهر في صفحة "المشاريع"
      saveProject({
        id: "p-" + Date.now(),
        projectName,
        studentName,
        department,
        description,
        date: new Date().toISOString(),
        verdict: result.verdict || (pass ? "PASS" : "FAIL"),
        scores: result.scores || { technical_score: 70, commercial_score: 70, overall_score: 70 },
      });

      showToast(pass ? "تم قبول المشروع وإضافته إلى قائمة المشاريع" : "تم تحليل المشروع — النتيجة: مرفوض مبدئياً");
    } catch (err) {
      analysisHead.innerHTML = `<b>تعذّر إكمال التحليل</b><span class="status-pill" style="background:rgba(176,57,47,.12);color:#b0392f">خطأ</span>`;
      analysisBody.innerHTML = `<p style="color:#b0392f">${err.message}</p>`;
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = "حلّل المشروع";
    }
  });
}

/* =========================================================
   منطق صفحة المشاريع (projects.html)
   ========================================================= */
function initProjectsPage() {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;

  ensureSeed();

  const searchInput = document.getElementById("searchInput");
  const deptFilter = document.getElementById("deptFilter");
  const countEl = document.getElementById("projectsCount");

  function populateDepartments(list) {
    const depts = [...new Set(list.map((p) => p.department))];
    deptFilter.innerHTML =
      `<option value="">كل الأقسام</option>` +
      depts.map((d) => `<option value="${d}">${d}</option>`).join("");
  }

  function render() {
    const all = getProjects();
    populateDepartments(all);

    const q = searchInput.value.trim().toLowerCase();
    const dept = deptFilter.value;

    const filtered = all.filter((p) => {
      const matchQ =
        !q ||
        p.projectName.toLowerCase().includes(q) ||
        p.studentName.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q);
      const matchDept = !dept || p.department === dept;
      return matchQ && matchDept;
    });

    countEl.innerHTML = `عدد المشاريع: <b>${filtered.length}</b>`;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <svg class="em-wave" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 55 Q20 25 35 55 T65 55 T95 55" stroke="url(#g1)" stroke-width="6" stroke-linecap="round"/>
            <defs><linearGradient id="g1" x1="0" y1="0" x2="100" y2="0">
              <stop offset="0%" stop-color="#29B6E8"/><stop offset="50%" stop-color="#F5A623"/><stop offset="100%" stop-color="#96479A"/>
            </linearGradient></defs>
          </svg>
          <h3>ما فيه مشاريع مطابقة</h3>
          <p>جرّب تغيير كلمات البحث أو الفلتر.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered
      .map((p) => {
        const avg = avgScore(p.scores);
        const cls = scoreClass(avg);
        const isPass = (p.verdict || "PASS") === "PASS";
        return `
        <article class="project-card">
          <div class="project-card-top"></div>
          <div class="project-card-body">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span class="project-dept">${p.department}</span>
              <span class="verdict-tag ${isPass ? "pass" : "fail"}">${isPass ? "PASS" : "FAIL"}</span>
            </div>
            <h3>${p.projectName}</h3>
            <p class="project-desc">${p.description || "بدون وصف."}</p>
            <div class="project-meta">
              <span class="student">${p.studentName}</span>
              <span class="score-badge ${cls}">● ${avg}</span>
            </div>
          </div>
        </article>`;
      })
      .join("");
  }

  searchInput.addEventListener("input", render);
  deptFilter.addEventListener("change", render);
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  initUploadPage();
  initProjectsPage();
});
