
import React, { useState, useEffect, useCallback } from 'react';
import { Person, Gift, GameStage, AppData } from './types';
import { INITIAL_PEOPLE, INITIAL_GIFTS } from './constants';
import { generateCongratulation } from './services/geminiService';
import { saveToDB, loadFromDB } from './utils/db';
import { Snow } from './components/Snow';
import { AdminPanel } from './components/AdminPanel';

// Utility for delay
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const App: React.FC = () => {
  // --- State ---
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [people, setPeople] = useState<Person[]>(INITIAL_PEOPLE);
  const [gifts, setGifts] = useState<Gift[]>(INITIAL_GIFTS);
  const [stage, setStage] = useState<GameStage>(GameStage.IDLE);
  
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null);
  const [currentGift, setCurrentGift] = useState<Gift | null>(null);
  const [aiMessage, setAiMessage] = useState<string>("");
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // --- Derived State ---
  const remainingPeople = people.filter(p => !p.hasDrawn);
  const remainingGifts = gifts.filter(g => g.ownerId === null);
  const isComplete = remainingPeople.length === 0 && remainingGifts.length === 0;

  // --- Initialization Logic (Async) ---
  useEffect(() => {
    const init = async () => {
      try {
        const savedData = await loadFromDB();
        if (savedData) {
          setPeople(savedData.people);
          setGifts(savedData.gifts);
          
          // Restore Game State if exists
          if (savedData.savedStage && savedData.savedStage !== GameStage.IDLE && savedData.savedStage !== GameStage.SELECTING_PERSON) {
             setStage(savedData.savedStage);
             
             if (savedData.savedCurrentPersonId) {
                const p = savedData.people.find(p => p.id === savedData.savedCurrentPersonId);
                if (p) setCurrentPerson(p);
             }
             
             if (savedData.savedCurrentGiftId) {
                const g = savedData.gifts.find(g => g.id === savedData.savedCurrentGiftId);
                if (g) setCurrentGift(g);
             }

             if (savedData.savedAiMessage) {
                setAiMessage(savedData.savedAiMessage);
             }
          }
        }
      } catch (e) {
        console.error("Failed to load DB", e);
      } finally {
        setIsDataLoaded(true);
      }
    };
    init();
  }, []);

  // --- Persistence ---
  // Save EVERYTHING whenever state changes
  useEffect(() => {
    if (!isDataLoaded) return;
    
    const saveData = async () => {
      try {
        const fullState: AppData = {
           people,
           gifts,
           savedStage: stage,
           savedCurrentPersonId: currentPerson?.id || null,
           savedCurrentGiftId: currentGift?.id || null,
           savedAiMessage: aiMessage
        };
        await saveToDB(fullState);
      } catch (e) {
        console.error("Auto-save failed", e);
      }
    };
    
    // Debounce slightly
    const timer = setTimeout(saveData, 300);
    return () => clearTimeout(timer);
  }, [people, gifts, stage, currentPerson, currentGift, aiMessage, isDataLoaded]);

  // --- Admin Handler ---
  const handleAdminSave = async (newPeople: Person[], newGifts: Gift[]) => {
     try {
        // Reset state when admin saves new config
        const resetState: AppData = { 
           people: newPeople, 
           gifts: newGifts,
           savedStage: GameStage.IDLE,
           savedCurrentPersonId: null,
           savedCurrentGiftId: null,
           savedAiMessage: ""
        };
        await saveToDB(resetState);
        alert("設定儲存成功！網頁即將重新整理。");
        window.location.reload();
     } catch (e: any) {
        console.error("Save failed", e);
        alert("⚠️ 儲存失敗: " + e.message);
     }
  };

  // --- Logic ---

  // 1. Pick a Person (Random)
  const handleStartDraw = useCallback(async () => {
    if (remainingPeople.length === 0) return;

    setStage(GameStage.SELECTING_PERSON);
    setAiMessage("");
    setCurrentGift(null);
    setCurrentPerson(null);

    // Roulette Animation
    const duration = 2500; 
    const intervalTime = 80;
    const steps = duration / intervalTime;
    
    let step = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * remainingPeople.length);
      setCurrentPerson(remainingPeople[randomIndex]);
      step++;
      if (step >= steps) {
        clearInterval(interval);
        finalizePersonSelection();
      }
    }, intervalTime);
  }, [remainingPeople]);

  const finalizePersonSelection = () => {
    // True random selection
    const randomIndex = Math.floor(Math.random() * remainingPeople.length);
    const selected = remainingPeople[randomIndex];
    setCurrentPerson(selected);
    
    // NEW STEP: Show the person clearly first
    setStage(GameStage.PERSON_ANNOUNCEMENT);
  };

  const handleProceedToGiftSelection = () => {
     setStage(GameStage.PERSON_SELECTED);
  };

  // 2. Manual Gift Selection
  const handleGiftClick = async (gift: Gift) => {
    if (stage !== GameStage.PERSON_SELECTED) return;
    if (gift.ownerId !== null) return;
    if (!currentPerson) return;

    setCurrentGift(gift);
    
    setIsGeneratingMessage(true);
    const msg = await generateCongratulation(currentPerson.name, gift.number, gift.description);
    setAiMessage(msg);
    setIsGeneratingMessage(false);

    setStage(GameStage.GIFT_REVEALED);
  };

  // 3. Confirm & Move On
  const handleConfirmMatch = () => {
    if (!currentPerson || !currentGift) return;

    // Update Data
    setPeople(prev => prev.map(p => p.id === currentPerson.id ? { ...p, hasDrawn: true } : p));
    setGifts(prev => prev.map(g => g.id === currentGift.id ? { ...g, ownerId: currentPerson.id, revealed: true } : g));

    setStage(GameStage.IDLE);
    setCurrentPerson(null);
    setCurrentGift(null);
    setAiMessage("");
  };

  // --- Renders ---

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-christmas-green flex items-center justify-center text-christmas-gold text-2xl font-bold">
        🎄 聖誕精神載入中... 🎅
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col font-serif pb-20 select-none">
      <Snow />
      
      {showAdmin && (
         <AdminPanel 
            initialPeople={people} 
            initialGifts={gifts} 
            onSave={handleAdminSave} 
            onClose={() => setShowAdmin(false)} 
         />
      )}

      {/* Header */}
      {/* UPDATE: Changed z-10 to z-40 to ensure sticky header stays on top of content */}
      <header className="p-4 bg-christmas-red shadow-lg z-40 flex justify-between items-center border-b-4 border-christmas-gold sticky top-0">
        <div className="w-10"></div> 
        <div className="text-center">
          <h1 className="text-2xl md:text-5xl font-bold text-christmas-gold drop-shadow-md">
            🎄 聖誕交換禮物 🎁
          </h1>
          <p className="text-christmas-cream mt-2 opacity-90 text-sm md:text-base">
            {isComplete 
              ? "交換完成！聖誕快樂！" 
              : `目前進度：第 ${people.length - remainingPeople.length + 1} 位 / 共 ${people.length} 位`}
          </p>
        </div>
        <button 
           onClick={() => setShowAdmin(true)}
           className="text-christmas-gold hover:text-white transition-colors p-2 text-2xl"
           title="後台設定"
        >
           ⚙️
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-8 flex flex-col items-center justify-start z-10 gap-8 w-full max-w-7xl mx-auto">
        
        {/* --- MODAL: SELECTING, ANNOUNCING, or REVEALING --- */}
        {(stage === GameStage.SELECTING_PERSON || stage === GameStage.PERSON_ANNOUNCEMENT || stage === GameStage.GIFT_REVEALED) && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-christmas-green border-4 border-christmas-gold rounded-xl p-8 max-w-3xl w-full text-center shadow-2xl relative overflow-hidden animate-bounce-short">
              
              {/* Confetti/Decor if Revealed */}
              {(stage === GameStage.GIFT_REVEALED || stage === GameStage.PERSON_ANNOUNCEMENT) && (
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
              )}

              <h2 className="text-3xl font-bold text-christmas-gold mb-8">
                {stage === GameStage.SELECTING_PERSON && "🎅 正在抽出幸運兒..."}
                {stage === GameStage.PERSON_ANNOUNCEMENT && "🎉 輪到你了！ 🎉"}
                {stage === GameStage.GIFT_REVEALED && "🎁 禮物揭曉..."}
              </h2>

              <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
                
                {/* 1. Person Card Display (Hide when gift is revealed) */}
                {currentPerson && stage !== GameStage.GIFT_REVEALED && (
                  <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <div className="relative">
                       <img 
                         src={currentPerson.photoUrl} 
                         alt={currentPerson.name}
                         className="w-48 h-48 md:w-64 md:h-64 rounded-full border-8 border-white shadow-2xl object-cover bg-gray-200"
                       />
                       {stage === GameStage.PERSON_ANNOUNCEMENT && (
                          <div className="absolute -bottom-2 -right-2 text-6xl animate-bounce">👋</div>
                       )}
                    </div>
                    <p className="mt-6 text-4xl font-bold text-white drop-shadow-lg">{currentPerson.name}</p>
                  </div>
                )}

                {/* 2. Gift Card Display (Show ONLY when revealed, centered, large) */}
                {stage === GameStage.GIFT_REVEALED && currentGift && (
                  <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
                     <div className="relative mb-6">
                        <img 
                           src={currentGift.photoUrl} 
                           alt="Gift" 
                           className="w-64 h-64 md:w-80 md:h-80 rounded-xl border-8 border-christmas-gold shadow-2xl object-cover bg-white"
                        />
                        <div className="absolute -top-6 -right-6 bg-christmas-red text-white text-2xl font-bold w-16 h-16 flex items-center justify-center rounded-full border-4 border-white shadow-lg rotate-12">
                           #{currentGift.number}
                        </div>
                     </div>
                     <div className="bg-white/90 p-4 rounded-xl border-2 border-christmas-gold max-w-md w-full">
                        <h3 className="text-christmas-dark text-xl md:text-2xl font-bold mb-2">
                           {currentGift.description}
                        </h3>
                     </div>
                  </div>
                )}
              </div>

              {/* AI Message Area */}
              {stage === GameStage.GIFT_REVEALED && (
                <div className="bg-white/10 p-4 rounded-lg mb-6 min-h-[60px] flex items-center justify-center">
                    <p className="text-lg italic text-christmas-gold">{aiMessage}</p>
                </div>
              )}

              {/* Controls */}
              <div className="flex justify-center mt-4">
                {stage === GameStage.PERSON_ANNOUNCEMENT && (
                   <button 
                     onClick={handleProceedToGiftSelection}
                     className="bg-christmas-red text-white font-bold py-4 px-10 rounded-full text-2xl hover:scale-105 hover:bg-red-700 transition-all shadow-xl border-2 border-christmas-gold animate-pulse"
                   >
                     請選擇你的禮物！ 🎁
                   </button>
                )}

                {stage === GameStage.GIFT_REVEALED && (
                  <button 
                    onClick={handleConfirmMatch}
                    className="bg-christmas-green text-white font-bold py-3 px-8 rounded-full text-xl hover:bg-green-700 transition-colors shadow-lg border-2 border-christmas-gold"
                  >
                    確認並繼續 🎄
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- MANUAL SELECTION PROMPT --- */}
        {stage === GameStage.PERSON_SELECTED && currentPerson && (
           <div className="bg-christmas-dark/90 p-6 rounded-xl border-2 border-christmas-gold text-center animate-pulse sticky top-24 z-30 shadow-2xl mx-4 w-full max-w-md">
              <h2 className="text-2xl md:text-3xl text-christmas-gold font-bold mb-2 flex items-center justify-center gap-3">
                 <img src={currentPerson.photoUrl} className="w-10 h-10 rounded-full border border-white" />
                 {currentPerson.name}
              </h2>
              <p className="text-white text-lg font-bold">請點擊下方的禮物盒！</p>
           </div>
        )}

        {/* Start Button (Idle State) */}
        {stage === GameStage.IDLE && !isComplete && (
           <button 
              onClick={handleStartDraw}
              className="bg-christmas-red text-white text-3xl font-bold py-8 px-16 rounded-3xl shadow-2xl border-4 border-christmas-gold animate-bounce hover:scale-105 transition-transform mt-8"
            >
              開始抽選 🎲
           </button>
        )}

        {isComplete && (
           <div className="text-4xl font-bold text-christmas-gold text-center py-10 bg-black/30 rounded-xl p-8 backdrop-blur">
              🎉 所有禮物都已交換完畢！ 🎉
           </div>
        )}

        {/* --- GRID DISPLAYS --- */}
        
        {/* Gift Grid */}
        <div className="w-full">
          <h3 className="text-2xl font-bold text-christmas-gold mb-4 border-b border-white/20 pb-2">🎁 禮物池</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
             {gifts.map((gift) => {
                const isAvailable = gift.ownerId === null;
                const isSelectable = stage === GameStage.PERSON_SELECTED && isAvailable;
                
                return (
                <button 
                  key={gift.id}
                  onClick={() => handleGiftClick(gift)}
                  disabled={!isSelectable && isAvailable} 
                  className={`
                    relative aspect-[3/4] rounded-lg border-2 transition-all duration-300 overflow-hidden
                    ${gift.ownerId 
                      ? 'border-christmas-gold bg-white cursor-default' 
                      : isSelectable
                        ? 'border-christmas-gold bg-christmas-red cursor-pointer hover:scale-110 hover:shadow-[0_0_15px_rgba(241,213,112,0.8)] hover:z-20'
                        : 'border-white/30 bg-christmas-red/20 opacity-60 cursor-not-allowed'
                    }
                  `}
                >
                  {/* If revealed, show owner's face on top of gift */}
                  {gift.ownerId ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                        <span className="absolute top-1 left-1 text-xs font-bold text-christmas-dark bg-christmas-gold px-1 rounded">#{gift.number}</span>
                        <img 
                           src={people.find(p => p.id === gift.ownerId)?.photoUrl} 
                           className="w-16 h-16 rounded-full object-cover border-2 border-christmas-green shadow-sm mb-1"
                           alt="Owner"
                        />
                        <p className="text-[10px] text-center font-bold text-christmas-dark leading-tight truncate w-full px-1">
                           {people.find(p => p.id === gift.ownerId)?.name}
                        </p>
                     </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-christmas-cream font-bold text-xl group">
                       <span className={isSelectable ? 'animate-bounce' : ''}>#{gift.number}</span>
                    </div>
                  )}
                </button>
             )})}
          </div>
        </div>

        {/* Remaining People */}
        <div className="w-full opacity-80 hover:opacity-100 transition-opacity">
           <h3 className="text-xl font-bold text-christmas-gold mb-4 border-b border-white/20 pb-2">🎅 等待抽選名單</h3>
           <div className="flex flex-wrap gap-2 justify-center">
              {people.filter(p => !p.hasDrawn).map((person) => (
                 <div key={person.id} className="relative group">
                    <img 
                      src={person.photoUrl} 
                      alt={person.name}
                      className={`w-10 h-10 rounded-full border border-white/50 object-cover bg-gray-600 ${currentPerson?.id === person.id ? 'ring-4 ring-christmas-gold scale-125 z-10' : ''}`}
                    />
                 </div>
              ))}
              {people.filter(p => !p.hasDrawn).length === 0 && (
                 <p className="text-gray-400 italic">所有人都已抽完！</p>
              )}
           </div>
        </div>

      </main>
      
      <footer className="p-4 text-center text-sm text-white/50">
         設定人數: {people.length} 人 • 安全重新整理已啟用
      </footer>
    </div>
  );
};

export default App;
