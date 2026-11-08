import React, { useState } from 'react';
import { TextCard as TextCardType, AppSettings } from '../types';
import { BookOpen, MessageCircle, Sparkles, CheckCircle2, ChevronDown, ChevronUp, Loader2, Copy, Check, Feather } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { explainMore } from '../api';

const typeConfig: Record<string, { color: string; border: string; bg: string; badgeBg: string; badgeColor: string; label: string; icon: any }> = {
  quran: { 
    color: 'text-emerald-400', 
    border: 'border-emerald-500/30', 
    bg: 'bg-emerald-950/20', 
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
    badgeColor: 'text-emerald-300',
    label: 'القرآن الكريم', 
    icon: BookOpen 
  },
  hadith: { 
    color: 'text-sky-400', 
    border: 'border-sky-500/30', 
    bg: 'bg-sky-950/20', 
    badgeBg: 'bg-sky-500/15 border-sky-500/30',
    badgeColor: 'text-sky-300',
    label: 'الحديث النبوي الشريف', 
    icon: MessageCircle 
  },
  sahaba: { 
    color: 'text-amber-400', 
    border: 'border-amber-500/30', 
    bg: 'bg-amber-950/20', 
    badgeBg: 'bg-amber-500/15 border-amber-500/30',
    badgeColor: 'text-amber-300',
    label: 'من أقوال الصحابة رضي الله عنهم', 
    icon: Feather 
  },
  tabiin: { 
    color: 'text-orange-400', 
    border: 'border-orange-500/30', 
    bg: 'bg-orange-950/20', 
    badgeBg: 'bg-orange-500/15 border-orange-500/30',
    badgeColor: 'text-orange-300',
    label: 'من أقوال التابعين', 
    icon: Feather 
  },
  salaf: { 
    color: 'text-yellow-400', 
    border: 'border-yellow-500/30', 
    bg: 'bg-yellow-950/20', 
    badgeBg: 'bg-yellow-500/15 border-yellow-500/30',
    badgeColor: 'text-yellow-300',
    label: 'من أقوال السلف الصالح', 
    icon: Sparkles 
  },
};

export const TextCard: React.FC<{ card: TextCardType; settings: AppSettings }> = ({ card, settings }) => {
  const config = typeConfig[card.type] || typeConfig.salaf;
  const Icon = config.icon;
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `${config.label} - ${card.source}:\n"${card.originalText}"\n\nالشرح: ${card.simpleExplanation}\nالإضافة للموضوع: ${card.additionToTopic}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExplain = async () => {
    if (explanation) {
      setExplanation(null);
      return;
    }
    setIsExplaining(true);
    try {
      const result = await explainMore(card.originalText || card.simpleExplanation, settings);
      setExplanation(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border ${config.border} ${config.bg} p-6 backdrop-blur-md transition-all flex flex-col justify-between hover:border-[#d4af37]/40 shadow-lg`}
    >
      <div>
        <div className="flex justify-between items-start gap-2 mb-4">
          <div className={`flex items-center gap-2 text-sm font-bold ${config.color}`}>
            <Icon className="w-5 h-5 shrink-0" />
            <span>{config.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCard}
              title="نسخ هذا النص"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${config.badgeBg} ${config.badgeColor}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{card.type === 'quran' ? 'موثّق بالرسم العثماني' : 'مخرّج ومُحقّق'}</span>
            </div>
          </div>
        </div>

        <div className="mb-3 text-sm text-[#d4af37] font-semibold flex items-center gap-1.5">
          <span>{card.source}</span>
        </div>
        
        <div className={`text-xl md:text-2xl leading-relaxed mb-6 text-white ${card.type === 'quran' ? 'font-amiri text-center my-6 text-[#f0f9f4] bg-white/[0.02] p-4 rounded-xl border border-emerald-500/10' : 'font-cairo'}`}>
          {card.type === 'quran' ? `﴿ ${card.originalText} ﴾` : `«${card.originalText}»`}
        </div>

        <div className="space-y-3 mt-4 border-t border-white/10 pt-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-[#d4af37]/15 flex items-center justify-center text-[#d4af37]">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-[#d4af37] block mb-0.5 font-semibold">المعنى والدلالة</span>
              <p className="text-sm text-gray-300 leading-relaxed">{card.simpleExplanation}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-[#d4af37]/15 flex items-center justify-center text-[#d4af37]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-[#d4af37] block mb-0.5 font-semibold">الإضافة لفهم الموضوع</span>
              <p className="text-sm text-gray-300 leading-relaxed">{card.additionToTopic}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-white/5">
        <button 
          onClick={handleExplain}
          className="w-full py-2 flex items-center justify-center gap-2 text-xs font-semibold text-[#d4af37] hover:bg-[#d4af37]/10 rounded-lg transition-colors"
        >
          {isExplaining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : explanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {isExplaining ? 'يستنبط الشرح التوسعي...' : explanation ? 'إخفاء الشرح المفصل' : 'توسّع في شرح هذا النص'}
        </button>
        
        <AnimatePresence>
          {explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 text-sm leading-relaxed text-gray-200 bg-black/40 border border-[#d4af37]/20 p-4 rounded-xl"
            >
              {explanation}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
