import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Person, Gift, GameStage, AppData } from './types';
import { INITIAL_PEOPLE, INITIAL_GIFTS } from './constants';
import { generateCongratulation } from './services/geminiService';
import { Snow } from './components/Snow';
import { AdminPanel } from './components/AdminPanel';

// Utility for delay
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const LOCAL_STORAGE_KEY = 'christmas_exchange_data_2024';

const App: React.FC = () => {
  // --- Initialization Logic ---
  const loadInitialData = (): AppData => {
     try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
           return JSON.parse(saved);
        }
     } catch (e) {
        console.error("Failed to load saved data", e);
     }
     return { people: INITIAL_PEOPLE, gifts: INITIAL_GIFTS };
  };

  const initialData = loadInitialData();

  // --- State ---
  const [people, setPeople] = useState<Person[]>(initialData.people);
  const [gifts, setGifts] = useState<Gift[]>(initialData.gifts);
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

  // --- Persistence ---
  // Whenever people or gifts change (due to game progress), save to local storage
  // to prevent data loss on refresh during the event.
  useEffect(() => {
     const data: AppData = { people, gifts };
     localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  }, [people, gifts]);

  // --- Admin Handler ---
  const handleAdminSave = (newPeople: Person[], newGifts: Gift[]) => {
     // Reset game state for safety when config changes
     const resetPeople = newPeople.map(p => ({ ...p, hasDrawn: false }));
     const resetGifts = newGifts.map(g => ({ ...g, revealed: false, ownerId: null }));
     
     setPeople(resetPeople);
     setGifts(resetGifts);
     setStage(GameStage.IDLE);
     setCurrentPerson(null);
     setCurrentGift(null);
     setAiMessage("");
     setShowAdmin(false);
  };

  // --- Logic ---

  // 1. Pick a Person
  const handleStartDraw = useCallback(async () => {
    if (remainingPeople.length === 0) return;

    setStage(GameStage.SELECTING_PERSON);
    setAiMessage("");
    setCurrentGift(null);
    setCurrentPerson(null);

    // Roulette Animation for Person
    const duration = 2000; // ms
    const intervalTime = 100;
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
    // Actually pick one securely
    const randomIndex = Math.floor(Math.random() * remainingPeople.length);
    const selected = remainingPeople[randomIndex];
    setCurrentPerson(selected);
    setStage(GameStage.PERSON_SELECTED);
  };

  // 2. Pick a Gift
  const handleDrawGift = useCallback(async () => {
    if (!currentPerson || remainingGifts.length === 0) return;

    setStage(GameStage.SELECTING_GIFT);

    // Roulette Animation for Gift
    const duration = 2500;
    const intervalTime = 80;
    const steps = duration / intervalTime;

    let step = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * remainingGifts.length);
      setCurrentGift(remainingGifts[randomIndex]);
      step++;
      if (step >= steps) {
        clearInterval(interval);
        finalizeGiftSelection(currentPerson);
      }
    }, intervalTime);
  }, [currentPerson, remainingGifts]);

  const finalizeGiftSelection = async (person: Person) => {
    const randomIndex = Math.floor(Math.random() * remainingGifts.length);
    const selectedGift = remainingGifts[randomIndex];
    setCurrentGift(selectedGift);

    // Trigger AI Message Generation in background
    setIsGeneratingMessage(true);
    generateCongratulation(person.name, selectedGift.number, selectedGift.description)
      .then(msg => {
        setAiMessage(msg);
        setIsGeneratingMessage(false);
      });

    await sleep(500); // slight pause for dramatic effect
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

  return (
    <div className="min-h-screen relative flex flex-col font-serif">
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
      <header className="p-4 bg-christmas-red shadow-lg z-10 flex justify-between items-center border-b-4 border-christmas-gold">
        <div className="w-10"></div> {/* Spacer for centering */}
        <div className="text-center">
          <h1 className="text-2xl md:text-5xl font-bold text-christmas-gold drop-shadow-md">
            🎄 Christmas Gift Exchange 🎁
          </h1>
          <p className="text-christmas-cream mt-2 opacity-90 text-sm md:text-base">
            {isComplete 
              ? "Exchange Complete! Merry Christmas!" 
              : `Next up: Drawing ${people.length - remainingPeople.length + 1} / ${people.length}`}
          </p>
        </div>
        <button 
           onClick={() => setShowAdmin(true)}
           className="text-christmas-gold hover:text-white transition-colors p-2"
           title="Admin Settings"
        >
           ⚙️
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-8 flex flex-col items-center justify-start z-10 gap-8">
        
        {/* ACTION STAGE (Modal-like overlay or prominent section) */}
        {(stage !== GameStage.IDLE && stage !== GameStage.FINISHED) && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-christmas-green border-4 border-christmas-gold rounded-xl p-8 max-w-2xl w-full text-center shadow-2xl relative overflow-hidden">
              
              {/* Confetti/Decor if Revealed */}
              {stage === GameStage.GIFT_REVEALED && (
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
              )}

              <h2 className="text-3xl font-bold text-christmas-gold mb-8">
                {stage === GameStage.SELECTING_PERSON && "Picking someone..."}
                {stage === GameStage.PERSON_SELECTED && "Ready to draw!"}
                {stage === GameStage.SELECTING_GIFT && "Spinning the wheel of gifts..."}
                {stage === GameStage.GIFT_REVEALED && "It's a Match!"}
              </h2>

              <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
                {/* Person Card Display */}
                {currentPerson && (
                  <div className="flex flex-col items-center animate-bounce-short">
                    <img 
                      src={currentPerson.photoUrl} 
                      alt={currentPerson.name}
                      className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-white shadow-lg object-cover bg-gray-200"
                    />
                    <p className="mt-4 text-2xl font-bold text-white">{currentPerson.name}</p>
                  </div>
                )}

                {/* Arrow */}
                {currentGift && (
                  <div className="text-4xl text-christmas-gold">➜</div>
                )}

                {/* Gift Card Display */}
                {stage === GameStage.PERSON_SELECTED && (
                   <div className="w-32 h-32 md:w-48 md:h-48 bg-christmas-red border-4 border-dashed border-christmas-gold rounded-xl flex items-center justify-center opacity-50">
                      <span className="text-4xl">?</span>
                   </div>
                )}

                {currentGift && (
                  <div className={`perspective-1000 w-48 h-64 cursor-pointer`}>
                     <div className={`relative w-full h-full text-center transition-transform duration-700 transform-style-3d ${stage === GameStage.GIFT_REVEALED ? 'rotate-y-180' : ''}`}>
                        
                        {/* Front of Card (Number) */}
                        <div className="absolute w-full h-full backface-hidden bg-christmas-red rounded-xl border-4 border-christmas-gold flex flex-col items-center justify-center shadow-lg">
                           <span className="text-6xl font-bold text-christmas-gold">#{currentGift.number}</span>
                           <span className="mt-2 text-sm text-white">Gift</span>
                        </div>

                        {/* Back of Card (Revealed) */}
                        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-xl border-4 border-christmas-green flex flex-col items-center justify-start overflow-hidden shadow-lg">
                           <img src={currentGift.photoUrl} className="w-full h-32 object-cover" alt="Gift" />
                           <div className="p-2 overflow-y-auto">
                              <p className="text-christmas-dark font-bold text-lg leading-tight">Gift #{currentGift.number}</p>
                              <p className="text-gray-600 text-xs mt-1">{currentGift.description}</p>
                           </div>
                        </div>
                     </div>
                  </div>
                )}
              </div>

              {/* AI Message Area */}
              {stage === GameStage.GIFT_REVEALED && (
                <div className="bg-white/10 p-4 rounded-lg mb-6 min-h-[80px] flex items-center justify-center">
                  {isGeneratingMessage ? (
                    <span className="animate-pulse text-christmas-gold">✨ Asking the Christmas Elves (AI)... ✨</span>
                  ) : (
                    <p className="text-lg italic text-christmas-gold">"{aiMessage}"</p>
                  )}
                </div>
              )}

              {/* Controls */}
              <div className="flex justify-center">
                {stage === GameStage.PERSON_SELECTED && (
                  <button 
                    onClick={handleDrawGift}
                    className="bg-christmas-gold text-christmas-red font-bold py-3 px-8 rounded-full text-xl hover:scale-105 transition-transform shadow-lg border-2 border-white"
                  >
                    Draw Gift! 🎁
                  </button>
                )}
                {stage === GameStage.GIFT_REVEALED && (
                  <button 
                    onClick={handleConfirmMatch}
                    disabled={isGeneratingMessage}
                    className="bg-christmas-green text-white font-bold py-3 px-8 rounded-full text-xl hover:bg-green-700 transition-colors shadow-lg border-2 border-christmas-gold disabled:opacity-50"
                  >
                    Accept & Next 🎄
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Start Button (Idle State) */}
        {stage === GameStage.IDLE && !isComplete && (
           <button 
              onClick={handleStartDraw}
              className="bg-christmas-red text-white text-2xl font-bold py-6 px-12 rounded-2xl shadow-xl border-4 border-christmas-gold animate-pulse hover:scale-105 transition-transform"
            >
              Start Next Draw 🎲
           </button>
        )}

        {isComplete && (
           <div className="text-4xl font-bold text-christmas-gold text-center py-10 bg-black/30 rounded-xl p-8 backdrop-blur">
              🎉 All gifts have been exchanged! 🎉
           </div>
        )}

        {/* --- GRID DISPLAYS --- */}
        
        {/* Gift Grid */}
        <div className="w-full max-w-6xl">
          <h3 className="text-2xl font-bold text-christmas-gold mb-4 border-b border-white/20 pb-2">🎁 Gift Pool</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
             {gifts.map((gift) => (
                <div 
                  key={gift.id}
                  className={`relative aspect-[3/4] rounded-lg border-2 transition-all duration-500
                    ${gift.ownerId 
                      ? 'border-christmas-gold bg-white' 
                      : 'border-white/30 bg-christmas-red/20 opacity-80'
                    }
                  `}
                >
                  {/* If revealed, show owner's face on top of gift */}
                  {gift.ownerId ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                        <span className="absolute top-1 left-1 text-xs font-bold text-christmas-dark bg-christmas-gold px-1 rounded">#{gift.number}</span>
                        {/* Find owner photo */}
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
                    <div className="absolute inset-0 flex items-center justify-center text-christmas-cream/50 font-bold text-xl">
                       #{gift.number}
                    </div>
                  )}
                </div>
             ))}
          </div>
        </div>

        {/* Remaining People */}
        <div className="w-full max-w-6xl">
           <h3 className="text-2xl font-bold text-christmas-gold mb-4 border-b border-white/20 pb-2">🎅 Participants Waiting</h3>
           <div className="flex flex-wrap gap-2 justify-center">
              {people.filter(p => !p.hasDrawn).map((person) => (
                 <div key={person.id} className="relative group">
                    <img 
                      src={person.photoUrl} 
                      alt={person.name}
                      className="w-12 h-12 rounded-full border-2 border-white/50 opacity-80 group-hover:opacity-100 transition-opacity object-cover bg-gray-600"
                    />
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                       {person.name}
                    </div>
                 </div>
              ))}
              {people.filter(p => !p.hasDrawn).length === 0 && (
                 <p className="text-gray-400 italic">Everyone has drawn!</p>
              )}
           </div>
        </div>

      </main>
      
      <footer className="p-4 text-center text-sm text-white/50">
         Configured for {people.length} Employees • Powered by React & Gemini
      </footer>
    </div>
  );
};

export default App;
