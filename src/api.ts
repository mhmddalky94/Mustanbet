import { TopicAnalysis, AppSettings } from "./types";

async function generateWithGemini(
  prompt: string,
  systemInstruction: string | undefined,
  responseMimeType: string | undefined,
  settings: AppSettings
): Promise<string> {
  // 1. Try server proxy first
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.geminiApiKey) {
    headers["x-gemini-key"] = settings.geminiApiKey;
  }

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt,
        systemInstruction,
        responseMimeType,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.text;
    }

    // If server responded with an error message that isn't 404/502, extract it
    if (response.status !== 404 && response.status !== 502) {
      const err = await response.json().catch(() => ({ error: "فشل في التواصل مع الخادم" }));
      throw new Error(err.error || `خطأ من الخادم (${response.status})`);
    }
  } catch (err: any) {
    // If it's a specific custom error from server, rethrow unless it's network/404
    if (err.message && !err.message.includes("404") && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError")) {
      // If we don't have a direct key, throw this error
      const directKey = settings.geminiApiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (!directKey) throw err;
    }
  }

  // 2. Direct client-side fallback if server is not available (e.g. static hosting on Vercel / Netlify / GitHub Pages)
  const directKey = settings.geminiApiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!directKey) {
    throw new Error("يرجى إدخال مفتاح Gemini API في الإعدادات للمتابعة في وضع الاستضافة المجاني.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${directKey}`;
  const reqBody: any = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ]
  };

  if (systemInstruction) {
    reqBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (responseMimeType) {
    reqBody.generationConfig = {
      responseMimeType: responseMimeType
    };
  }

  const directRes = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqBody)
  });

  if (!directRes.ok) {
    const errorData = await directRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل الاتصال بـ Gemini API (${directRes.status})`);
  }

  const directData = await directRes.json();
  const text = directData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("لم يتم استلام نص من نموذج الذكاء الاصطناعي.");
  }
  return text;
}

export async function fetchTopicAnalysis(
  topic: string,
  settings: AppSettings,
  onProgress?: (msg: string) => void
): Promise<TopicAnalysis> {
  onProgress?.("يستنبط موسوعة النصوص الشاملة من القرآن والسنة وأقوال السلف...");

  const prompt = `أنت عالم إسلامي ومحقق وباحث موسوعي ومفكر مبدع.
المستخدم يطلب استنباطاً وافياً وشاملاً وغزيراً للنصوص الإسلامية حول موضوع: "${topic}".

المطلوب بدقة تامة:
1. وفر عدداً كبيراً وغزيراً من النصوص المتنوعة بمجموع (12 إلى 16 نصاً) مقسمة بالتساوي والشمولية على الفئات التالية:
   - آيات قرآنية كريمة (type: "quran"): لا تقل عن 4 إلى 5 آيات كريمة مباشرة تتناول الموضوع من أبعاد متعددة (الأمر، النهي، الجزاء، الحكمة، السكينة). ضع quranKey بصيغة (رقم السورة:رقم الآية مثل "2:155" أو "3:134") وضع نص الآية مشكولاً في originalText.
   - أحاديث نبوية شريفة (type: "hadith"): لا تقل عن 4 إلى 5 أحاديث نبوية صحيحة أو حسنة من كتب السنة المعتمدة (صحيح البخاري، صحيح مسلم، السنن، المسند...) مع ذكر الصحابي الراوي والمخرّج بدقة في source.
   - أقوال الصحابة رضي الله عنهم (type: "sahaba"): لا تقل عن 3 إلى 4 أقوال بليغة مأثورة عن الخلفاء الراشدين وكبار الصحابة (أبو بكر، عمر بن الخطاب، عثمان، علي، عبد الله بن مسعود، ابن عباس، معاذ بن جبل، سلمان الفارسي، أبو الدرداء، عائشة أم المؤمنين).
   - أقوال التابعين والسلف الصالح (type: "tabiin" أو "salaf"): لا تقل عن 3 إلى 4 أقوال ومواعظ أصيلة من أئمة التابعين وأعلام السلف الصالح (الحسن البصري، عمر بن عبد العزيز، سفيان الثوري، الفضيل بن عياض، الإمام مالك، الشافعي، أحمد بن حنبل، ابن المبارك، ابن القيم).

2. الرد يجب أن يكون بصيغة JSON فقط، بدون أي مقدمات أو علامات إضافية خارج الـ JSON:
{
  "topic": "${topic}",
  "overallPicture": "جملة جامعة بليغة تلخّص الرؤية الإسلامية العميقة لهذا الموضوع وأثره على النفس والحياة",
  "cards": [
    {
      "id": "unique_string_1",
      "type": "quran | hadith | sahaba | tabiin | salaf",
      "source": "السورة ورقم الآية، أو الراوي واسم كتاب الحديث، أو اسم الصحابي/الإمام والمصدر",
      "originalText": "النص الأصلي بدقة مع التشكيل (سواء كان قرآناً أو حديثاً أو أثراً)",
      "quranKey": "رقم السورة:رقم الآية للقرآن فقط (مثال: 2:155)، وإلا اتركه فارغاً",
      "simpleExplanation": "شرح مبسط وواضح بأسلوب عصري يفهمه القارئ المعاصر",
      "additionToTopic": "ما البعد الجديد أو الزاوية الخاصة التي يضيفها هذا النص لفهم الموضوع"
    }
  ],
  "mindmap": [
    { "mainIdea": "محور رئيسي (مثل: المفاهيم والأسس، الثمرات والآثار، المزالق والتحذيرات، الوسائل العملية)", "subIdeas": ["نقطة فرعية 1", "نقطة فرعية 2", "نقطة فرعية 3"] }
  ],
  "summary": ["خلاصة 1", "خلاصة 2", "خلاصة 3", "خلاصة 4", "خلاصة 5", "خلاصة 6"],
  "finalWisdom": "حكمة بليغة مكثفة تلهم القارئ وتصلح كمنشور أو اقتباس للتأمل اليومي"
}

تحرَّ الدقة التامة في صحة الآيات وتخريج الأحاديث ونسبة أقوال السلف لمصادرها.`;

  const textOutput = await generateWithGemini(
    prompt,
    "أنت عالم ومحقق إسلامي خبير. تقدم استنباطات نصوص قرآنية ونبوية وآثار السلف الصالح بصيغة JSON حصرية ودقيقة وبمجموع لا يقل عن 12-16 نصاً.",
    "application/json",
    settings
  );

  let analysis: TopicAnalysis;
  try {
    let text = textOutput.trim();
    if (text.startsWith("```json")) text = text.substring(7);
    if (text.startsWith("```")) text = text.substring(3);
    if (text.endsWith("```")) text = text.substring(0, text.length - 3);
    analysis = JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON:", textOutput);
    throw new Error("فشل في معالجة استجابة الاستنباط");
  }

  // Fetch verified Quran verses in parallel
  const quranCards = analysis.cards.filter((card) => card.type === "quran" && card.quranKey);
  if (quranCards.length > 0) {
    onProgress?.(`يوثّق الآيات القرآنية (${quranCards.length} آيات) بالرسم العثماني المعتمد...`);
    
    let token = "";
    if (settings.quranClientId && settings.quranClientSecret) {
      try {
        const tokenRes = await fetch("/api/quran/token", {
          method: "POST",
          headers: {
            "x-quran-client-id": settings.quranClientId,
            "x-quran-client-secret": settings.quranClientSecret,
          },
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          token = tokenData.access_token || "";
        }
      } catch (err) {
        console.warn("Quran OAuth token error, will fallback to public API:", err);
      }
    }

    await Promise.allSettled(
      quranCards.map(async (card) => {
        try {
          // 1. Try server endpoint
          let uthmaniText = "";
          try {
            const verseHeaders: Record<string, string> = {};
            if (token) verseHeaders["x-quran-token"] = token;
            if (settings.quranClientId) verseHeaders["x-quran-client-id"] = settings.quranClientId;

            const verseRes = await fetch(`/api/quran/verse/${card.quranKey}`, {
              headers: verseHeaders,
            });
            if (verseRes.ok) {
              const verseData = await verseRes.json();
              uthmaniText = verseData.text || verseData.verse?.text_uthmani || verseData.verse?.text;
            }
          } catch {
            // Server endpoint not reachable
          }

          // 2. Direct public API fallback
          if (!uthmaniText) {
            const publicRes = await fetch(
              `https://api.quran.com/api/v4/verses/by_key/${card.quranKey}?language=ar&words=false&fields=text_uthmani`
            );
            if (publicRes.ok) {
              const pData = await publicRes.json();
              uthmaniText = pData.verse?.text_uthmani || pData.verse?.text;
            }
          }

          if (uthmaniText) {
            card.originalText = uthmaniText;
          }
        } catch (err) {
          console.warn("Error fetching verse", card.quranKey, err);
        }
      })
    );
  }

  return analysis;
}

export async function explainMore(text: string, settings: AppSettings): Promise<string> {
  const prompt = `اشرح هذا النص الإسلامي بشكل أعمق ومفصل وأسلوب عصري رشيق يلامس واقع القارئ ويوضح معانيه اللغوية والتربوية: "${text}"`;
  return generateWithGemini(prompt, undefined, undefined, settings);
}
