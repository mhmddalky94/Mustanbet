import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Settings, Save, Key, Shield } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

export function SettingsModal({ settings, onSave, onClose }: SettingsProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#122a1f] border border-[#d4af37]/20 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <h2 className="text-2xl font-bold mb-4 text-[#d4af37] flex items-center gap-2">
          <Settings className="w-6 h-6" /> الإعدادات (اختياري)
        </h2>

        <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl p-3 mb-6 text-sm text-[#22c55e]">
          ✨ <strong>الباقة المجانية مفعّلة تلقائياً:</strong> التطبيق يعمل مباشرة ومجاناً بالكامل دون الحاجة لإدخال أي مفاتيح. يمكنك ترك هذه الحقول فارغة أو تخصيصها بمفاتيحك إذا رغبت.
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-[#e0e8e4]/80 flex items-center gap-2">
              <Key className="w-4 h-4" /> مفتاح Gemini API (اختياري)
            </label>
            <input
              type="password"
              dir="ltr"
              className="w-full bg-[#0a1510] border border-[#22c55e]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37] transition-colors text-left"
              value={localSettings.geminiApiKey}
              onChange={(e) => setLocalSettings({...localSettings, geminiApiKey: e.target.value})}
              placeholder="متروك للباقة المجانية التلقائية..."
            />
          </div>
          
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-sm text-[#d4af37] mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" /> توثيق آيات القرآن (Quran Foundation - اختياري)
            </h3>
            <p className="text-xs text-gray-400 mb-4">يتم جلب الآيات الصحيحة والمشكولة تلقائياً مجاناً من مصدر القرآن المعتمد، ويمكنك ربط حسابك الخاص اختيارياً:</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[#e0e8e4]/80">Client ID</label>
                <input
                  type="text"
                  dir="ltr"
                  className="w-full bg-[#0a1510] border border-[#22c55e]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37] transition-colors text-left"
                  value={localSettings.quranClientId}
                  onChange={(e) => setLocalSettings({...localSettings, quranClientId: e.target.value})}
                  placeholder="رقم العميل"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-[#e0e8e4]/80">Client Secret</label>
                <input
                  type="password"
                  dir="ltr"
                  className="w-full bg-[#0a1510] border border-[#22c55e]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37] transition-colors text-left"
                  value={localSettings.quranClientSecret}
                  onChange={(e) => setLocalSettings({...localSettings, quranClientSecret: e.target.value})}
                  placeholder="السر الخاص بالعميل"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => onSave(localSettings)}
            className="flex-1 bg-[#d4af37] hover:bg-[#b8952b] text-[#0a1510] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" /> حفظ الإعدادات
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
