import React, { useState, useRef } from 'react';
import { Person, Gift, AppData } from '../types';
import { INITIAL_PEOPLE, INITIAL_GIFTS } from '../constants';

import { ENCRYPTED_NAMES } from '../encrypted_data';
import CryptoJS from 'crypto-js';

interface AdminPanelProps {
  initialPeople: Person[];
  initialGifts: Gift[];
  onSave: (people: Person[], gifts: Gift[]) => Promise<void>;
  onClose: () => void;
  onReset: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ initialPeople, initialGifts, onSave, onClose, onReset }) => {
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [gifts, setGifts] = useState<Gift[]>(initialGifts);
  const [activeTab, setActiveTab] = useState<'people' | 'gifts'>('people');
  const [isSaving, setIsSaving] = useState(false);
  const [secretPassword, setSecretPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handlePersonChange = (id: number, field: keyof Person, value: string) => {
    setPeople(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleGiftChange = (id: number, field: keyof Gift, value: string) => {
    setGifts(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleSecretImport = () => {
    try {
      if (!secretPassword) {
        alert("請輸入解密密碼！");
        return;
      }
      const bytes = CryptoJS.AES.decrypt(ENCRYPTED_NAMES, secretPassword);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      if (Array.isArray(decryptedData) && decryptedData.length > 0) {
        // Convert string list to Person objects
        const newPeople: Person[] = decryptedData.map((name: string, index: number) => ({
          id: index + 1,
          name: name,
          hasDrawn: false
        }));

        // If length differs, maybe warn, but for now just replace
        setPeople(newPeople);
        alert(`成功匯入 ${newPeople.length} 筆加密名單！請記得儲存。`);
        setSecretPassword(""); // Clear password
      } else {
        alert("密碼錯誤或資料損毀！");
      }
    } catch (e) {
      console.error(e);
      alert("密碼錯誤，無法解密！");
    }
  };

  const handleExport = () => {
    const data: AppData = { people, gifts };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `christmas-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string) as AppData;
          if (data.people && data.gifts) {
            const cleanPeople = data.people.map(p => {
              // Backward compatibility: remove photoUrl if exists in old json
              const { photoUrl, ...rest } = p as any;
              return { ...rest, hasDrawn: false };
            });
            const cleanGifts = data.gifts.map(g => {
              const { photoUrl, ...rest } = g as any;
              return { ...rest, revealed: false, ownerId: null };
            });
            setPeople(cleanPeople);
            setGifts(cleanGifts);
            alert("設定檔載入成功！請點擊「儲存設定並重新開始」以套用。");
          } else {
            alert("檔案格式錯誤。");
          }
        } catch (err) {
          alert("解析 JSON 檔案時發生錯誤。");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSave = async () => {
    if (window.confirm("確定要儲存設定並重新開始遊戲嗎？（目前的進度將會重置）")) {
      setIsSaving(true);
      setTimeout(async () => {
        try {
          await onSave(people, gifts);
        } catch (e) {
          console.error(e);
          setIsSaving(false);
        }
      }, 100);
    }
  };

  const handleReset = async () => {
    const confirmText = prompt("這將會清除所有抽獎紀錄並還原至初始狀態！\n若要繼續，請輸入「RESET」");
    if (confirmText === "RESET") {
      setIsSaving(true);
      await onReset();
    }
  };

  return (
    <div className="fixed inset-0 bg-christmas-dark/95 z-[100] flex flex-col p-4 md:p-8 overflow-hidden font-sans text-white backdrop-blur-md">
      <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-4">
        <h2 className="text-3xl font-bold text-christmas-gold">⚙️ 後台管理</h2>

        <div className="flex flex-wrap gap-4 items-center justify-end">
          {/* Secret Import */}
          <div className="flex items-center gap-2 bg-gray-800 p-1 rounded border border-gray-600">
            <input
              type="password"
              value={secretPassword}
              onChange={(e) => setSecretPassword(e.target.value)}
              placeholder="輸入密碼匯入名單"
              className="bg-transparent px-2 py-1 text-sm outline-none w-32"
            />
            <button
              onClick={handleSecretImport}
              className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-xs font-bold transition-colors"
            >
              解鎖
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-bold transition-colors"
          >
            📂 匯入設定
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json"
            onChange={handleImport}
          />
          <button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-bold transition-colors"
          >
            💾 匯出設定
          </button>
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-sm font-bold transition-colors"
          >
            ✕ 關閉
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        <button
          className={`px-6 py-2 rounded-t-lg font-bold text-lg ${activeTab === 'people' ? 'bg-christmas-red text-white' : 'bg-gray-700 text-gray-400'}`}
          onClick={() => setActiveTab('people')}
        >
          🧑 員工名單 ({people.length})
        </button>
        <button
          className={`px-6 py-2 rounded-t-lg font-bold text-lg ${activeTab === 'gifts' ? 'bg-christmas-red text-white' : 'bg-gray-700 text-gray-400'}`}
          onClick={() => setActiveTab('gifts')}
        >
          🎁 禮物清單 ({gifts.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-grow bg-gray-800/50 rounded-b-lg rounded-tr-lg p-4 overflow-y-auto border border-gray-700">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

          {activeTab === 'people' && people.map((person) => (
            <div key={person.id} className="bg-gray-900 p-3 rounded flex gap-3 items-center border border-gray-700">
              <div className="w-8 h-8 rounded-full bg-christmas-green flex items-center justify-center text-xs font-bold text-christmas-gold border border-christmas-gold">
                {person.id}
              </div>
              <div className="flex-grow">
                <input
                  type="text"
                  value={person.name}
                  placeholder="輸入姓名"
                  onChange={(e) => handlePersonChange(person.id, 'name', e.target.value)}
                  className="w-full bg-transparent text-white border-b border-gray-600 focus:border-christmas-gold outline-none px-1 py-1"
                />
              </div>
            </div>
          ))}

          {activeTab === 'gifts' && gifts.map((gift) => (
            <div key={gift.id} className="bg-gray-900 p-3 rounded flex gap-3 items-center border border-gray-700">
              <div className="w-8 h-8 rounded bg-christmas-red flex items-center justify-center text-xs font-bold text-white border border-white/20">
                #{gift.number}
              </div>
              <div className="flex-grow">
                <input
                  type="text"
                  value={gift.description}
                  placeholder="輸入禮物內容"
                  onChange={(e) => handleGiftChange(gift.id, 'description', e.target.value)}
                  className="w-full bg-transparent text-white border-b border-gray-600 focus:border-christmas-gold outline-none px-1 py-1"
                />
              </div>
            </div>
          ))}

        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex justify-between items-center border-t border-white/20 pt-4">
        <button
          onClick={handleReset}
          disabled={isSaving}
          className="px-6 py-3 rounded font-bold text-white bg-red-800 hover:bg-red-900 border border-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          🗑️ 重置所有抽獎紀錄
        </button>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-3 rounded font-bold text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-christmas-gold text-christmas-dark px-8 py-3 rounded font-bold hover:scale-105 transition-transform shadow-lg border-2 border-white disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="animate-spin h-5 w-5 border-2 border-christmas-dark border-t-transparent rounded-full"></span>
                儲存中...
              </>
            ) : (
              "儲存設定並重啟"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
