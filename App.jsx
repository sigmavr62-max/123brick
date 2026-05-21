import React, { useState } from 'react';
import { 
  Languages, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  RefreshCw, 
  Trophy, 
  ChevronRight,
  BookOpen,
  Keyboard
} from 'lucide-react';

// Mock database for the languages and lessons
const LANGUAGES_DATA = {
  Lithuanian: {
    flag: "🇱🇹",
    lessons: [
      {
        id: 1,
        title: "The Alphabet Essentials",
        description: "Mastering the unique Lithuanian diacritics (š, č, ž, ė).",
        words: [
          { english: "Hello", correct: "labas", phonetic: "lah-bahs", hint: "Basic 5-letter masculine greeting." },
          { english: "Cold", correct: "šalta", phonetic: "shahl-tah", hint: "Requires the 'sh' modifier on the S." },
          { english: "Thank you", correct: "ačiū", phonetic: "ah-choo", hint: "Uses 'č' for the 'ch' sound and ends with a long 'ū'." }
        ]
      },
      {
        id: 2,
        title: "The Kitchen Table",
        description: "Spelling everyday food items with tricky vowel blends.",
        words: [
          { english: "Bread", correct: "duona", phonetic: "dwah-nah", hint: "Watch out for the 'uo' diphthong sound." },
          { english: "Milk", correct: "pienas", phonetic: "pyah-nahs", hint: "Uses the 'ie' blend right after the 'p'." },
          { english: "Water", correct: "vanduo", phonetic: "vahn-dwah", hint: "Ends with that classic 'uo' vowel combination." }
        ]
      }
    ]
  },
  Spanish: {
    flag: "🇪🇸",
    lessons: [
      {
        id: 1,
        title: "Basics & Accents",
        description: "Getting used to upside-down punctuation and accent marks.",
        words: [
          { english: "Hello", correct: "hola", phonetic: "oh-lah", hint: "The 'h' is completely silent!" },
          { english: "Thank you", correct: "gracias", phonetic: "grah-syahs", hint: "Watch the 'c', it makes an 's' or 'th' sound." },
          { english: "Good morning", correct: "buenos días", phonetic: "bweh-nohs dee-ahs", hint: "Don't forget the written accent over the 'i'." }
        ]
      }
    ]
  }
};

export default function App() {
  // Application State
  const [step, setStep] = useState('welcome'); // welcome -> select-lang -> dashboard -> internal-lesson -> results
  const [nativeLang, setNativeLang] = useState('English');
  const [targetLang, setTargetLang] = useState('');
  const [activeLesson, setActiveLesson] = useState(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [score, setScore] = useState(0);

  // Experience Points (XP) simulation
  const [xp, setXp] = useState(120);

  const handleStartLesson = (lesson) => {
    setActiveLesson(lesson);
    setCurrentWordIndex(0);
    setUserInput('');
    setFeedback(null);
    setScore(0);
    setStep('internal-lesson');
  };

  const handleCheckAnswer = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const currentWord = activeLesson.words[currentWordIndex];
    const isCorrect = userInput.trim().toLowerCase() === currentWord.correct.toLowerCase();

    if (isCorrect) {
      setFeedback('correct');
      setScore(prev => prev + 1);
      setXp(prev => prev + 15);
    } else {
      setFeedback('wrong');
    }
  };

  const handleNextWord = () => {
    setFeedback(null);
    setUserInput('');
    if (currentWordIndex + 1 < activeLesson.words.length) {
      setCurrentWordIndex(prev => prev + 1);
    } else {
      setStep('results');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-between">
      
      {/* HEADER NAVBAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setStep('welcome')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-100">
              <Languages className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              lingoWrite
            </span>
          </div>

          {step !== 'welcome' && step !== 'select-lang' && (
            <div className="flex items-center space-x-4">
              <div className="bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-amber-700">{xp} XP</span>
              </div>
              <div className="text-2xl">{LANGUAGES_DATA[targetLang]?.flag}</div>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-xl w-full mx-auto px-4 py-8 flex-grow flex flex-col justify-center">
        
        {/* STEP 1: WELCOME SCREEN */}
        {step === 'welcome' && (
          <div className="text-center space-y-8 py-12 animate-fade-in">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 scale-150 animate-pulse"></div>
              <div className="relative bg-gradient-to-tr from-indigo-600 to-violet-500 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100">
                <Keyboard className="w-16 h-16 stroke-[1.5]" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Ditch speaking.<br/>
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Master writing.</span>
              </h1>
              <p className="text-slate-500 text-base max-w-sm mx-auto">
                Perfect your spelling, tackle accents, and bridge the gap between listening and writing fluent prose.
              </p>
            </div>

            <button
              onClick={() => setStep('select-lang')}
              className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3.5 rounded-2xl transition shadow-lg shadow-slate-200 w-full justify-center group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* STEP 2: NATIVE & TARGET LANGUAGE SELECTOR */}
        {step === 'select-lang' && (
          <div className="space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Configure your profile</h2>
              <p className="text-slate-400 text-sm">Tell us what you speak and what you want to write.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">I speak fluent:</label>
                <select 
                  value={nativeLang} 
                  onChange={(e) => setNativeLang(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="English">English 🇺🇸</option>
                  <option value="Lithuanian">Lithuanian 🇱🇹</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">I want to practice writing:</label>
                <div className="grid grid-cols-1 gap-3">
                  {Object.keys(LANGUAGES_DATA).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setTargetLang(lang)}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition text-left ${
                        targetLang === lang 
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900' 
                          : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{LANGUAGES_DATA[lang].flag}</span>
                        <span className="font-semibold">{lang}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${targetLang === lang ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                        {targetLang === lang && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              disabled={!targetLang}
              onClick={() => setStep('dashboard')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold py-3.5 rounded-2xl transition flex items-center justify-center space-x-2"
            >
              <span>Enter Writing Lab</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 3: DASHBOARD / LESSON SELECTOR */}
        {step === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                Pathways
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2 flex items-center space-x-2">
                <span>{targetLang} Writing Path</span>
              </h2>
              <p className="text-slate-400 text-sm">Select a bite-sized module to train your orthography skills.</p>
            </div>

            <div className="space-y-3">
              {LANGUAGES_DATA[targetLang]?.lessons.map((lesson, idx) => (
                <div 
                  key={lesson.id}
                  className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-400">MODULE {idx + 1}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span className="text-xs font-medium text-indigo-600 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {lesson.words.length} write-tests
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">{lesson.title}</h3>
                    <p className="text-slate-500 text-xs sm:text-sm">{lesson.description}</p>
                  </div>
                  <button
                    onClick={() => handleStartLesson(lesson)}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-sm font-semibold px-4 py-2.5 rounded-xl transition self-start sm:self-center shrink-0"
                  >
                    Start Training
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: INTERACTIVE RUNTIME LESSON */}
        {step === 'internal-lesson' && activeLesson && (
          <div className="space-y-6">
            {/* PROGRESS BAR */}
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${((currentWordIndex) / activeLesson.words.length) * 100}%` }}
              />
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
              
              {/* Card Header Status */}
              <div className="flex justify-between items-center text-xs font-bold tracking-wider text-slate-400 uppercase">
                <span>Translate to {targetLang}</span>
                <span>{currentWordIndex + 1} / {activeLesson.words.length}</span>
              </div>

              {/* Central Target Concept */}
              <div className="space-y-2 text-center py-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">English Source</span>
                <h3 className="text-3xl font-black text-slate-900">
                  "{activeLesson.words[currentWordIndex].english}"
                </h3>
                <p className="text-xs font-medium text-indigo-500 italic">
                  Sounds like: / {activeLesson.words[currentWordIndex].phonetic} /
                </p>
              </div>

              {/* Dynamic Answer Feedback Panel */}
              {feedback && (
                <div className={`p-4 rounded-xl border flex items-start space-x-3 animate-fade-in ${
                  feedback === 'correct' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {feedback === 'correct' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">{feedback === 'correct' ? 'Perfectly Spelled!' : 'Spelling Incorrect'}</h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      Correct entry: <span className="font-mono font-bold tracking-wide uppercase bg-white/60 px-1.5 py-0.5 rounded">{activeLesson.words[currentWordIndex].correct}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Interactive Writing Form */}
              <form onSubmit={handleCheckAnswer} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    disabled={feedback !== null}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type the exact spelling here..."
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3.5 font-medium tracking-wide focus:outline-none focus:border-indigo-500 disabled:opacity-60 transition"
                    autoFocus
                  />
                  {feedback === null && userInput.trim() && (
                    <button 
                      type="submit"
                      className="absolute right-2.5 top-2.5 bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-lg transition"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Micro Hint */}
                <p className="text-slate-400 text-xs italic px-1">
                  <span className="font-bold not-italic text-slate-500">Hint:</span> {activeLesson.words[currentWordIndex].hint}
                </p>
              </form>
            </div>

            {/* Bottom Action Tray */}
            {feedback !== null && (
              <button
                onClick={handleNextWord}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-2xl transition flex items-center justify-center space-x-2 shadow-lg shadow-slate-200 animate-fade-in"
              >
                <span>{currentWordIndex + 1 === activeLesson.words.length ? 'Finish Module' : 'Continue Pattern'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* STEP 5: RUNTIME RESULTS SCREEN */}
        {step === 'results' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-6 animate-fade-in">
            <div className="inline-flex bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-500 shadow-sm">
              <Trophy className="w-10 h-10 stroke-[1.5]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Module Completed!</h2>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">
                You successfully tested your cognitive sound-to-grapheme processing limits.
              </p>
            </div>

            {/* Performance metrics display */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="text-center border-r border-slate-200/60">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Accuracy</span>
                <span className="text-2xl font-black text-slate-800">
                  {Math.round((score / activeLesson.words.length) * 100)}%
                </span>
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Bonus Gain</span>
                <span className="text-2xl font-black text-emerald-600">+{score * 15} XP</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setStep('dashboard')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-2xl transition"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => handleStartLesson(activeLesson)}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold py-3.5 rounded-2xl transition flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry This Module</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* COMPACT CLEAN FOOTER */}
      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs font-medium text-slate-400">
        <div>lingoWrite Orthography Lab &copy; 2026. Micro-targeted writing workouts.</div>
      </footer>
    </div>
  );
}
