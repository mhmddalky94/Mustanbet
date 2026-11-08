import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SettingsModal } from './components/Settings';
import { TextCard } from './components/TextCard';
import { TopicAnalysis, AppSettings } from './types';
import { fetchTopicAnalysis } from './api';
import { 
  Settings, Search, Sparkles, Share2, Image as ImageIcon, 
  Loader2, AlertCircle, RotateCcw, Check, BookOpen, MessageCircle, Feather, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';

const DEFAULT_TOPICS = [
  'الصبر عند البلاء', 
  'الرضا واليقين', 
  'بر الوالدين', 
  'الغضب والحلم', 
  'الاستغفار والتوبة', 
  'النية والإخلاص', 
  'الرزق والتوكل', 
  'الشكر والحمد'
];

type CategoryFilter = 'all' | 'quran' | 'hadith' | 'salaf';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('mustanbit_settings');
    return saved ? JSON.parse(saved) : { geminiApiKey: '', quranClientId: '', quranClientSecret: '' };
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [result, setResult] = useState<TopicAnalysis | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchFilter, setSearchFilter] = useState('');
  
  const wisdomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('mustanbit_settings', JSON.stringify(settings));
  }, [settings]);

  const handleSearch = async (searchTopic: string = topic) => {
    if (!searchTopic.trim()) return;

    setTopic(searchTopic);
    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    setActiveCategory('all');
    setSearchFilter('');
    try {
      const data = await fetchTopicAnalysis(searchTopic, settings, setLoadingMsg);
      setResult(data);
    } catch (e: any) {
      setErrorMessage(e.message || "حدث خطأ أثناء الاستنباط. يرجى المحاولة مجدداً.");
    } finally {
      setIsLoading(false);
    }
  };

  const shareText = () => {
    if (!result) return;
    const text = `المُستنبِط: ${result.topic}\n\n${result.overallPicture}\n\nالخلاصة:\n${result.summary.map(s => '- ' + s).join('\n')}\n\nالحكمة: ${result.finalWisdom}`;
    if (navigator.share) {
      navigator.share({ text }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    }
  };

  const convertToImage = async () => {
    if (!wisdomRef.current) return;
    try {
      const canvas = await html2canvas(wisdomRef.current, { backgroundColor: '#122a1f' });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `حكمة_${result?.topic}.png`;
      a.click();
    } catch (e) {
      console.error("Image export error:", e);
    }
  };

  // Counts for each category
  const quranCount = useMemo(() => result?.cards.filter(c => c.type === 'quran').length || 0, [result]);
  const hadithCount = useMemo(() => result?.cards.filter(c => c.type === 'hadith').length || 0, [result]);
  const salafCount = useMemo(() => 
    result?.cards.filter(c => c.type === 'sahaba' || c.type === 'tabiin' || c.type === 'salaf').length || 0, 
    [result]
  );
  const totalCount = useMemo(() => result?.cards.length || 0, [result]);

  // Filtered cards based on active tab and search query
  const filteredCards = useMemo(() => {
    if (!result) return [];
    return result.cards.filter(card => {
      // Category check
      if (activeCategory === 'quran' && card.type !== 'quran') return false;
      if (activeCategory === 'hadith' && card.type !== 'hadith') return false;
      if (activeCategory === 'salaf' && card.type !== 'sahaba' && card.type !== 'tabiin' && card.type !== 'salaf') return false;

      // Search keyword check
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase();
        const inText = card.originalText.toLowerCase().includes(query);
        const inSource = card.source.toLowerCase().includes(query);
        const inExplanation = card.simpleExplanation.toLowerCase().includes(query);
        return inText || inSource || inExplanation;
      }

      return true;
    });
  }, [result, activeCategory, searchFilter]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 min-h-screen pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#d4af37] text-[#0a1510] rounded-xl flex items-center justify-center rotate-45 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            <Sparkles className="w-6 h-6 -rotate-45" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-amiri text-[#d4af37]">المُستنبِط</h1>
            <p className="text-xs text-[#e0e8e4]/70">استنباط موسوعي من القرآن والسنة وأقوال السلف الصالح</p>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10"
          title="الإعدادات"
        >
          <Settings className="w-5 h-5 text-[#d4af37]" />
        </button>
      </header>

      {/* Main Search */}
      <div className="relative z-20 mb-10">
        <div className="relative">
          <input
            type="text"
            placeholder="اكتب الموضوع الذي تريد استنباط نصوصه... (مثال: الصبر، بر الوالدين، الرضا، التوكل...)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-[#122a1f]/80 backdrop-blur-md border-2 border-[#22c55e]/20 rounded-2xl p-5 pr-14 text-lg text-white focus:outline-none focus:border-[#d4af37] shadow-xl transition-all placeholder:text-gray-400/80"
          />
          <button 
            onClick={() => handleSearch()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-[#d4af37] text-[#0a1510] rounded-xl hover:bg-[#b8952b] transition-colors shadow-md"
            title="استنباط"
          >
            <Search className="w-6 h-6" />
          </button>
        </div>
        
        {!result && !isLoading && (
          <div className="mt-6">
            <p className="text-center text-xs text-[#d4af37]/80 mb-3 font-semibold">مواضيع مقترحة للاستنباط والتدبر:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {DEFAULT_TOPICS.map(t => (
                <button
                  key={t}
                  onClick={() => handleSearch(t)}
                  className="px-4 py-2 bg-white/5 hover:bg-[#d4af37]/20 border border-white/10 text-sm rounded-full transition-all text-gray-300 hover:text-[#d4af37]"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Message Display with Retry */}
      <AnimatePresence>
        {errorMessage && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 p-5 bg-red-950/40 border border-red-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
              <p className="text-red-200 text-sm">{errorMessage}</p>
            </div>
            <button
              onClick={() => handleSearch()}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-sm rounded-xl transition-all font-semibold shrink-0"
            >
              <RotateCcw className="w-4 h-4" /> إعادة المحاولة
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy Toast Notification */}
      <AnimatePresence>
        {copyFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-[#122a1f] border border-[#22c55e]/40 text-[#22c55e] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm"
          >
            <Check className="w-4 h-4" />
            <span>تم نسخ الخلاصة للحافظة بنجاح</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-[#d4af37]/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#d4af37] rounded-full border-t-transparent animate-spin"></div>
              <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-[#d4af37] animate-pulse" />
            </div>
            <p className="mt-6 text-[#d4af37] font-semibold text-lg text-center max-w-md">{loadingMsg}</p>
            <p className="mt-2 text-xs text-gray-400">نستخرج باقة متكاملة من الآيات والأحاديث المخرّجة وأقوال أئمة السلف</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            {/* Overall Picture */}
            <div className="bg-[#d4af37]/10 border border-[#d4af37]/30 p-8 rounded-3xl text-center shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-center gap-2 mb-3 text-[#d4af37] font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>الصورة الكاملة لموقف الإسلام</span>
              </div>
              <p className="text-2xl md:text-3xl leading-relaxed font-amiri text-white">"{result.overallPicture}"</p>
              
              {/* Stat breakdown pills */}
              <div className="mt-6 pt-6 border-t border-[#d4af37]/20 flex flex-wrap items-center justify-center gap-3 text-xs">
                <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {quranCount} آيات قرآنية
                </span>
                <span className="px-3 py-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-semibold flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {hadithCount} أحاديث نبوية
                </span>
                <span className="px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold flex items-center gap-1.5">
                  <Feather className="w-3.5 h-3.5" />
                  {salafCount} من أقوال السلف الصالح
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/10 text-gray-300 font-semibold">
                  المجموع: {totalCount} نصوص
                </span>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 p-1.5 bg-[#122a1f] border border-white/10 rounded-2xl w-full sm:w-auto overflow-x-auto">
                  <button
                    onClick={() => setActiveCategory('all')}
                    className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      activeCategory === 'all'
                        ? 'bg-[#d4af37] text-[#0a1510] shadow-md'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>الكل</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${activeCategory === 'all' ? 'bg-black/20 text-[#0a1510]' : 'bg-white/10 text-gray-300'}`}>
                      {totalCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveCategory('quran')}
                    className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      activeCategory === 'quran'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>القرآن الكريم</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${activeCategory === 'quran' ? 'bg-black/20 text-white' : 'bg-white/10 text-gray-300'}`}>
                      {quranCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveCategory('hadith')}
                    className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      activeCategory === 'hadith'
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>الحديث الشريف</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${activeCategory === 'hadith' ? 'bg-black/20 text-white' : 'bg-white/10 text-gray-300'}`}>
                      {hadithCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveCategory('salaf')}
                    className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      activeCategory === 'salaf'
                        ? 'bg-amber-500 text-black shadow-md'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Feather className="w-3.5 h-3.5" />
                    <span>أقوال السلف والصحابة</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${activeCategory === 'salaf' ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-300'}`}>
                      {salafCount}
                    </span>
                  </button>
                </div>

                {/* Sub-search inside results */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="ابحث في النصوص المستنبطة..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full bg-[#122a1f] border border-white/10 rounded-xl px-4 py-2 pl-9 text-xs text-white placeholder:text-gray-400 focus:outline-none focus:border-[#d4af37]"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Cards Grid */}
            {filteredCards.length === 0 ? (
              <div className="p-12 text-center bg-[#122a1f]/50 border border-white/10 rounded-3xl">
                <p className="text-gray-400 text-sm">لا توجد نصوص مطابقة لهذا الفلتر.</p>
                <button
                  onClick={() => { setActiveCategory('all'); setSearchFilter(''); }}
                  className="mt-3 text-xs text-[#d4af37] underline"
                >
                  إلغاء الفلاتر وعرض جميع النصوص
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCards.map((card, idx) => (
                  <TextCard key={card.id || idx} card={card} settings={settings} />
                ))}
              </div>
            )}

            {/* Mindmap (Hierarchical Themes) */}
            <div className="bg-[#122a1f] border border-white/10 p-8 rounded-3xl shadow-xl">
              <h2 className="text-xl text-[#d4af37] mb-6 font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> خريطة محاور الموضوع
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.mindmap.map((node, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-black/20 border-r-4 border-[#d4af37] border-y border-l border-white/5">
                    <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#d4af37]"></span>
                      {node.mainIdea}
                    </h3>
                    <ul className="space-y-2 text-gray-300 text-sm pr-2">
                      {node.subIdeas.map((sub, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <span className="text-[#d4af37] mt-0.5">•</span>
                          <span>{sub}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Points */}
            {result.summary && result.summary.length > 0 && (
              <div className="bg-[#122a1f] border border-[#22c55e]/20 p-8 rounded-3xl shadow-xl">
                <h2 className="text-xl text-[#22c55e] mb-4 font-bold flex items-center gap-2">
                  <Check className="w-5 h-5" /> خلاصة الهدايات والاستنباطات
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.summary.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-gray-200 leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final Wisdom Card with Image Generation & Sharing */}
            <div 
              ref={wisdomRef}
              className="bg-gradient-to-br from-[#122a1f] via-[#0d1e16] to-[#0a1510] border-2 border-[#d4af37]/40 p-12 rounded-3xl text-center relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#22c55e]/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="inline-block px-4 py-1.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] text-xs font-semibold mb-6">
                حكمة الاستنباط
              </div>

              <p className="text-2xl md:text-3xl leading-relaxed font-amiri text-[#f0fdf4] relative z-10 max-w-2xl mx-auto">
                « {result.finalWisdom} »
              </p>
              
              <div className="mt-8 pt-8 border-t border-white/10 flex flex-wrap justify-center gap-4 relative z-10" data-html2canvas-ignore="true">
                <button 
                  onClick={convertToImage} 
                  className="flex items-center gap-2 px-6 py-3 bg-[#d4af37] text-black font-bold rounded-xl hover:bg-[#b8952b] transition-all shadow-lg"
                >
                  <ImageIcon className="w-5 h-5" /> حفظ كبطاقة مصورة
                </button>
                <button 
                  onClick={shareText} 
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/10"
                >
                  <Share2 className="w-5 h-5" /> مشاركة الخلاصة
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          settings={settings} 
          onSave={(newSettings) => {
            setSettings(newSettings);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
