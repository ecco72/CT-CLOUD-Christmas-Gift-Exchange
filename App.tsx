import React, { useState, useEffect, useCallback } from 'react';
import { Person, Gift, GameStage, AppData } from './types';
import { INITIAL_PEOPLE, INITIAL_GIFTS } from './constants';
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
        };
        await saveToDB(fullState);
      } catch (e) {
        console.error("Auto-save failed", e);
      }
    };

    const timer = setTimeout(saveData, 300);
    return () => clearTimeout(timer);
  }, [people, gifts, stage, currentPerson, currentGift, isDataLoaded]);

  // --- Handlers ---
  const handleAdminSave = async (newPeople: Person[], newGifts: Gift[]) => {
    const resetState: AppData = {
      people: newPeople,
      gifts: newGifts,
      savedStage: GameStage.IDLE,
      savedCurrentPersonId: null,
      savedCurrentGiftId: null,
    };
    await saveToDB(resetState);
    window.location.reload();
  };

  const handleFullReset = async () => {
    // Revert to hardcoded initial constants
    const resetState: AppData = {
      people: INITIAL_PEOPLE,
      gifts: INITIAL_GIFTS,
      savedStage: GameStage.IDLE,
      savedCurrentPersonId: null,
      savedCurrentGiftId: null
    };
    await saveToDB(resetState);
    window.location.reload();
  };

  const handleStartDraw = useCallback(async () => {
    if (remainingPeople.length === 0) return;

    setStage(GameStage.SELECTING_PERSON);
    setCurrentGift(null);
    setCurrentPerson(null);

    // If only one person left, fast forward
    if (remainingPeople.length === 1) {
      // Show for a brief moment then finalize
      setCurrentPerson(remainingPeople[0]);
      setTimeout(() => {
        finalizePersonSelection();
      }, 800);
      return;
    }

    const duration = 1800;
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
    const randomIndex = Math.floor(Math.random() * remainingPeople.length);
    const selected = remainingPeople[randomIndex];
    setCurrentPerson(selected);
    setStage(GameStage.PERSON_ANNOUNCEMENT);
  };

  const handleProceedToGiftSelection = () => {
    setStage(GameStage.PERSON_SELECTED);
  };

  const handleGiftClick = async (gift: Gift) => {
    if (stage !== GameStage.PERSON_SELECTED) return;
    if (gift.ownerId !== null) return;
    if (!currentPerson) return;

    setCurrentGift(gift);
    setStage(GameStage.GIFT_REVEALED);
  };

  const handleAutoPickGift = async () => {
    if (stage !== GameStage.PERSON_SELECTED || !currentPerson) return;
    if (remainingGifts.length === 0) return;

    // Simulate "thinking" or shuffling feel
    // Just a quick visual delay if desired, or instant.
    // Let's pick randomly from available gifts
    const randomIndex = Math.floor(Math.random() * remainingGifts.length);
    const selectedGift = remainingGifts[randomIndex];

    await handleGiftClick(selectedGift);
  };

  const handleConfirmMatch = () => {
    if (!currentPerson || !currentGift) return;

    setPeople(prev => prev.map(p => p.id === currentPerson.id ? { ...p, hasDrawn: true } : p));
    setGifts(prev => prev.map(g => g.id === currentGift.id ? { ...g, ownerId: currentPerson.id, revealed: true } : g));

    setStage(GameStage.IDLE);
    setCurrentPerson(null);
    setCurrentGift(null);
  };

  // --- Render Helpers ---

  // Generate a consistent color based on ID for avatar background
  const getAvatarColor = (id: number) => {
    const colors = ['bg-red-600', 'bg-green-600', 'bg-blue-600', 'bg-purple-600', 'bg-orange-600', 'bg-teal-600'];
    return colors[id % colors.length];
  };

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-christmas-green flex items-center justify-center text-christmas-gold text-2xl font-bold">
        🎄 載入中... 🎅
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col font-serif select-none bg-gradient-to-b from-christmas-green to-christmas-dark text-white overflow-hidden">
      <Snow />

      {showAdmin && (
        <AdminPanel
          initialPeople={people}
          initialGifts={gifts}
          onSave={handleAdminSave}
          onReset={handleFullReset}
          onClose={() => setShowAdmin(false)}
        />
      )}

      {/* Header */}
      <header className="px-6 py-4 bg-christmas-red/90 backdrop-blur-md shadow-2xl z-40 flex justify-between items-center border-b-4 border-christmas-gold sticky top-0">
        <div className="flex items-center gap-2">
          <span className="text-3xl animate-bounce">🎄</span>
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-christmas-gold leading-none tracking-wider">
              誠雲抽禮物
            </h1>
            <p className="text-xs text-white/80">
              Merry Christmas 2025
            </p>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="bg-christmas-dark/50 px-4 py-1 rounded-full border border-christmas-gold/30 backdrop-blur">
            <span className="text-christmas-gold font-bold font-mono">
              {people.length - remainingPeople.length} / {people.length}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowAdmin(true)}
          className="bg-christmas-dark/30 hover:bg-christmas-dark/60 text-christmas-gold p-2 rounded-lg transition-all border border-transparent hover:border-christmas-gold"
          title="後台設定"
        >
          ⚙️ 設定
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 flex flex-col items-center justify-start z-10 w-full max-w-7xl mx-auto mb-[200px]">

        {/* --- MODAL --- */}
        {(stage === GameStage.SELECTING_PERSON || stage === GameStage.PERSON_ANNOUNCEMENT || stage === GameStage.GIFT_REVEALED) && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-christmas-green border-4 border-christmas-gold rounded-xl p-8 max-w-4xl w-full text-center shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">

              {/* Background Decor */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-300 to-transparent animate-pulse"></div>

              {/* STAGE: Selecting / Announcing Person */}
              {stage !== GameStage.GIFT_REVEALED && currentPerson && (
                <div className="animate-in zoom-in duration-300 flex flex-col items-center">
                  <div className="text-christmas-gold font-bold text-xl mb-4 tracking-widest uppercase">
                    {stage === GameStage.SELECTING_PERSON ? "抽選中..." : "THE WINNER IS"}
                  </div>

                  {/* Big Name Display */}
                  <div className="bg-white text-christmas-red px-12 py-8 rounded-lg shadow-[0_0_50px_rgba(255,255,255,0.2)] border-4 border-christmas-red transform -rotate-2">
                    <h2 className="text-5xl md:text-7xl font-black tracking-tight whitespace-nowrap">
                      {currentPerson.name}
                    </h2>
                  </div>

                  {stage === GameStage.PERSON_ANNOUNCEMENT && (
                    <button
                      onClick={handleProceedToGiftSelection}
                      className="mt-12 bg-christmas-gold text-christmas-dark font-bold py-4 px-12 rounded-full text-2xl hover:bg-yellow-400 hover:scale-110 transition-all shadow-xl animate-bounce"
                    >
                      開始選禮物 🎁
                    </button>
                  )}
                </div>
              )}

              {/* STAGE: Gift Revealed */}
              {stage === GameStage.GIFT_REVEALED && currentGift && (
                <div className="w-full flex flex-col items-center animate-in scale-95 duration-500">
                  <div className="text-christmas-cream/60 font-bold text-lg mb-2 uppercase tracking-widest">
                    CONGRATULATIONS
                  </div>

                  {/* The Gift Card */}
                  <div className="bg-gradient-to-br from-white to-gray-100 w-full max-w-2xl rounded-xl shadow-2xl p-1 border-8 border-double border-christmas-gold">
                    <div className="bg-white border-2 border-dashed border-christmas-green p-10 md:p-16 flex flex-col items-center justify-center min-h-[300px]">
                      {/* Just the description, huge and elegant */}
                      <p className="text-christmas-dark text-3xl md:text-5xl font-bold leading-tight break-words font-serif">
                        {currentGift.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmMatch}
                    className="mt-8 bg-christmas-red text-white font-bold py-3 px-10 rounded-full text-xl hover:bg-red-700 transition-colors shadow-lg border-2 border-christmas-gold flex items-center gap-2"
                  >
                    <span>確認領取</span>
                    <span className="text-2xl">🎅</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- PROMPT BAR --- */}
        {stage === GameStage.PERSON_SELECTED && currentPerson && (
          <div className="sticky top-24 z-30 w-full max-w-xl mx-auto flex flex-col gap-4">
            <div className="bg-christmas-gold text-christmas-dark p-4 rounded-xl shadow-2xl border-4 border-white transform hover:scale-105 transition-transform cursor-default flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${getAvatarColor(currentPerson.id)} text-white flex items-center justify-center font-bold border-2 border-white`}>
                  {currentPerson.name.charAt(0)}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold opacity-70">當前玩家</span>
                  <span className="text-xl font-black">{currentPerson.name}</span>
                </div>
              </div>
              <div className="font-bold text-lg flex items-center gap-2">
                <span className="hidden md:inline">請選擇禮物 或</span>
                <span className="text-2xl">👇</span>
              </div>
            </div>

            {/* Auto Pick Button */}
            <button
              onClick={handleAutoPickGift}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-xl border-2 border-white/50 transition-all flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300"
            >
              <span>🤖 系統代抽 (請假專用)</span>
            </button>
          </div>
        )}

        {/* Start Button */}
        {stage === GameStage.IDLE && !isComplete && (
          <div className="my-8">
            <button
              onClick={handleStartDraw}
              className="group relative bg-christmas-red text-white text-4xl font-black py-8 px-20 rounded-2xl shadow-[0_10px_0_rgb(150,0,0)] active:shadow-[0_2px_0_rgb(150,0,0)] active:translate-y-2 transition-all border-4 border-christmas-gold"
            >
              <span className="drop-shadow-md">開始抽選</span>
              <div className="absolute -top-4 -right-4 text-5xl group-hover:rotate-12 transition-transform">🎁</div>
              <div className="absolute -bottom-4 -left-4 text-5xl group-hover:-rotate-12 transition-transform">🎄</div>
            </button>
          </div>
        )}

        {isComplete && (
          <div className="text-5xl font-bold text-christmas-gold text-center py-20 animate-pulse">
            🎉 聖誕快樂 🎉
          </div>
        )}

        {/* --- GIFT GRID --- */}
        <div className="w-full mt-4">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-4">
            {gifts.map((gift) => {
              const isAvailable = gift.ownerId === null;
              const isSelectable = stage === GameStage.PERSON_SELECTED && isAvailable;
              const owner = people.find(p => p.id === gift.ownerId);
              const isWish = gift.number >= 39 && gift.number <= 45;

              return (
                <button
                  key={gift.id}
                  onClick={() => handleGiftClick(gift)}
                  disabled={!isSelectable && isAvailable}
                  className={`
                    relative aspect-square rounded-xl shadow-lg transition-all duration-300 flex flex-col items-center justify-center
                    ${gift.ownerId
                      ? 'bg-christmas-dark/40 border-2 border-christmas-green opacity-80' // Taken
                      : isSelectable
                        ? isWish
                          ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 border-4 border-white cursor-pointer hover:scale-110 hover:shadow-[0_0_40px_rgba(250,204,21,0.9)] z-20 animate-pulse text-yellow-900' // Active Wish Gift (Bright Yellow/Gold)
                          : 'bg-gradient-to-br from-christmas-red to-red-800 border-2 border-christmas-gold cursor-pointer hover:scale-110 hover:shadow-[0_0_20px_rgba(241,213,112,0.6)] z-10' // Active Normal
                        : isWish
                          ? 'bg-yellow-400/30 border-4 border-yellow-200/50 opacity-80 cursor-not-allowed' // Inactive Wish Gift (Bright but waiting)
                          : 'bg-christmas-red/20 border-2 border-white/10 opacity-50 cursor-not-allowed' // Inactive Normal
                    }
                  `}
                >
                  {gift.ownerId ? (
                    // Taken State
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <div className={`w-8 h-8 rounded-full ${getAvatarColor(owner?.id || 0)} flex items-center justify-center text-xs text-white font-bold border border-white/50 mb-1`}>
                        {owner?.name.charAt(0)}
                      </div>
                      <span className="text-[10px] text-christmas-gold font-bold truncate w-full">{owner?.name}</span>
                      <span className="text-[9px] text-white/50 mt-1">#{gift.number}</span>
                    </div>
                  ) : (
                    // Available State
                    <>
                      <div className="text-3xl mb-1 opacity-80 drop-shadow-sm">
                        {isWish ? '🌟' : '🎁'}
                      </div>
                      <span className={`text-xl font-bold font-mono ${isSelectable ? (isWish ? 'text-yellow-900' : 'text-white') : 'text-white/30'}`}>
                        {gift.number}
                      </span>
                      {isWish && (
                        <div className="absolute top-1 right-1">
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-white/50">
                            許願
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>

      </main>

      {/* Footer: Waiting List Drawer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t-4 border-christmas-gold shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40 max-h-[180px] flex flex-col">
        <div className="bg-christmas-gold text-christmas-dark text-xs font-bold px-4 py-1 self-start rounded-tr-lg -mt-7 shadow-lg ml-4">
          待抽選名單 ({remainingPeople.length})
        </div>
        <div className="p-4 overflow-y-auto flex-grow custom-scrollbar">
          {remainingPeople.length > 0 ? (
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {remainingPeople.map(person => (
                <div key={person.id} className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full px-3 py-1 flex items-center gap-2 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${getAvatarColor(person.id)}`}></div>
                  <span className="text-gray-300 text-sm font-medium">{person.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-christmas-gold/50 italic">
              全部抽選完畢！
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;