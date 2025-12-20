import React, { useState, useRef } from 'react';
import { Person, Gift, AppData } from '../types';

interface AdminPanelProps {
  initialPeople: Person[];
  initialGifts: Gift[];
  onSave: (people: Person[], gifts: Gift[]) => Promise<void>;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ initialPeople, initialGifts, onSave, onClose }) => {
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [gifts, setGifts] = useState<Gift[]>(initialGifts);
  const [activeTab, setActiveTab] = useState<'people' | 'gifts'>('people');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---
  
  // Aggressive compression to support "file://" protocol (LocalStorage limit)
  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // 180px is enough for a clear avatar but small enough for storage
          const MAX_SIZE = 180; 

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Quality 0.6 is the sweet spot for file size vs visual quality
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // --- Handlers ---

  const handlePersonChange = (id: number, field: keyof Person, value: string) => {
    setPeople(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleGiftChange = (id: number, field: keyof Gift, value: string) => {
    setGifts(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: number, type: 'person' | 'gift') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await processImage(file);
        if (type === 'person') {
          handlePersonChange(id, 'photoUrl', compressedBase64);
        } else {
          handleGiftChange(id, 'photoUrl', compressedBase64);
        }
      } catch (err) {
        alert("處理圖片時發生錯誤");
      }
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
             const cleanPeople = data.people.map(p => ({...p, hasDrawn: false}));
             const cleanGifts = data.gifts.map(g => ({...g, revealed: false, ownerId: null}));
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
        // Small delay to allow React to render the loading state
        setTimeout(async () => {
          try {
            await onSave(people, gifts);
          } catch(e) {
            console.error(e);
            setIsSaving(false);
          }
        }, 100);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col p-4 md:p-8 overflow-hidden font-sans text-white">
      <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-4">
        <h2 className="text-3xl font-bold text-christmas-gold">⚙️ 後台管理</h2>
        <div className="flex gap-4">
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
      <div className="flex-grow bg-gray-800 rounded-b-lg rounded-tr-lg p-4 overflow-y-auto border border-gray-700">
        <div className="grid gap-4">
          
          {activeTab === 'people' && people.map((person) => (
            <div key={person.id} className="bg-gray-900 p-4 rounded flex flex-col md:flex-row gap-4 items-center border border-gray-700">
              <span className="text-gray-500 font-mono w-8">#{person.id}</span>
              
              <div className="flex-grow w-full md:w-auto">
                 <label className="text-xs text-gray-400 block mb-1">姓名</label>
                 <input 
                    type="text" 
                    value={person.name}
                    onChange={(e) => handlePersonChange(person.id, 'name', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 focus:border-christmas-gold outline-none"
                 />
              </div>

              <div className="flex flex-col items-center gap-2">
                 <label className="text-xs text-gray-400">照片</label>
                 <div className="flex items-center gap-4">
                    <img src={person.photoUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-gray-600" />
                    <input 
                      type="file" 
                      accept="image/*"
                      className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600"
                      onChange={(e) => handleImageUpload(e, person.id, 'person')}
                    />
                 </div>
              </div>
            </div>
          ))}

          {activeTab === 'gifts' && gifts.map((gift) => (
             <div key={gift.id} className="bg-gray-900 p-4 rounded flex flex-col md:flex-row gap-4 items-center border border-gray-700">
               <span className="text-gray-500 font-mono w-8">#{gift.number}</span>
               
               <div className="flex-grow w-full md:w-auto">
                  <label className="text-xs text-gray-400 block mb-1">禮物說明 (顯示於揭曉畫面)</label>
                  <input 
                     type="text" 
                     value={gift.description}
                     onChange={(e) => handleGiftChange(gift.id, 'description', e.target.value)}
                     className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 focus:border-christmas-gold outline-none"
                  />
               </div>
 
               <div className="flex flex-col items-center gap-2">
                  <label className="text-xs text-gray-400">照片</label>
                  <div className="flex items-center gap-4">
                     <img src={gift.photoUrl} alt="Preview" className="w-12 h-12 rounded object-cover border border-gray-600" />
                     <input 
                       type="file" 
                       accept="image/*"
                       className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600"
                       onChange={(e) => handleImageUpload(e, gift.id, 'gift')}
                     />
                  </div>
               </div>
             </div>
          ))}

        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex justify-end gap-4 border-t border-white/20 pt-4">
        <span className="text-yellow-500 text-sm self-center mr-auto">
           ⚠️ 模式：自動切換 (若無法使用資料庫將使用 LocalStorage)
        </span>
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
           className="bg-christmas-red text-white px-8 py-3 rounded font-bold hover:scale-105 transition-transform shadow-lg border border-christmas-gold disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
        >
           {isSaving ? (
             <>
               <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
               儲存中...
             </>
           ) : (
             "儲存設定並重新開始"
           )}
        </button>
      </div>
    </div>
  );
};