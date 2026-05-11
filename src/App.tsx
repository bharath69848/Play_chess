import { useState, useCallback, useEffect } from 'react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Play, RotateCcw, BrainCircuit, User } from 'lucide-react';

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [gameStatus, setGameStatus] = useState<string>('Your turn to play');
  const [isBotThinking, setIsBotThinking] = useState(false);

  // Derive the current board from the game
  const fen = game.fen();

  const makeCustomMove = useCallback((move: string | { from: string, to: string, promotion?: string }) => {
    try {
      const gameCopy = new Chess(game.fen());
      gameCopy.move(move);
      setGame(gameCopy);
      return gameCopy;
    } catch (e) {
      return null; // Invalid move
    }
  }, [game]);

  const updateGameStatus = (currentGame: Chess) => {
    if (currentGame.isCheckmate()) {
      setGameStatus(`Checkmate! ${currentGame.turn() === 'w' ? 'Black' : 'White'} wins.`);
    } else if (currentGame.isDraw()) {
      setGameStatus('Draw!');
    } else if (currentGame.isCheck()) {
      setGameStatus('Check!');
    } else {
      setGameStatus(`${currentGame.turn() === playerColor ? 'Your turn' : 'Bot is thinking...'}`);
    }
  };

  const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare) return false;
    // If it's not the player's turn or game over, ignore
    if (game.turn() !== playerColor || game.isGameOver()) {
      return false;
    }

    const newGame = makeCustomMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q', // Always promote to queen for simplicity
    });

    if (newGame) {
       updateGameStatus(newGame);
       return true; // Valid move
    }
    return false; // Invalid move
  };

  const getBotMove = async () => {
    setIsBotThinking(true);
    setGameStatus("Bot is thinking...");
    try {
      const currentFen = game.fen();
      const response = await fetch('/api/best-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: currentFen })
      });

      if (!response.ok) {
        throw new Error('API Error');
      }

      const data = await response.json();
      
      if (data.bestmove) {
        // Wait a slight random amount for realism
        setTimeout(() => {
          // ensure the board state hasn't changed drastically while waiting
          setGame((g) => {
            if (g.fen() === currentFen) {
              const resultingGame = new Chess(g.fen());
              const moveStr = data.bestmove; // e.g. "e2e4" or "e7e8q"
              const moveObj = {
                from: moveStr.substring(0, 2),
                to: moveStr.substring(2, 4),
                promotion: moveStr.length > 4 ? moveStr.substring(4, 5) : 'q'
              };
              resultingGame.move(moveObj);
              updateGameStatus(resultingGame);
              setIsBotThinking(false);
              return resultingGame;
            }
            setIsBotThinking(false);
            return g;
          });
        }, 300);
      } else {
         throw new Error("No bestmove returned");
      }
    } catch (error) {
      console.error("Bot failed to move:", error);
      setGameStatus("Error connecting to bot Engine.");
      setIsBotThinking(false);
    }
  };

  useEffect(() => {
    // Trigger bot if it's not the player's turn
    if (game.turn() !== playerColor && !game.isGameOver()) {
       getBotMove();
    } else {
       updateGameStatus(game);
    }
  }, [fen, playerColor]);

  const resetGame = () => {
    setGame(new Chess());
    setPlayerColor('w');
    setGameStatus("Your turn to play");
    setIsBotThinking(false);
  };

  const playAsBlack = () => {
    setGame(new Chess());
    setPlayerColor('b');
  };

  return (
    <div className="min-h-screen text-emerald-400 flex flex-col items-center py-10 font-silkscreen selection:bg-emerald-500 selection:text-black">
      <header className="mb-10 text-center drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
        <h1 className="text-4xl md:text-5xl font-pixel tracking-widest mb-4 flex items-center justify-center gap-4 text-emerald-300">
          PLAY CHESS
        </h1>
        <p className="text-emerald-500 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
          {'>'} READY TO PLAY_
        </p>
      </header>

      <main className="flex flex-col md:flex-row gap-10 items-center md:items-start max-w-5xl w-full px-6">
        
        {/* Chess Board Area */}
        <div className="w-full max-w-[500px] shrink-0 p-2 md:p-4 bg-black border-4 border-emerald-600 shadow-[8px_8px_0px_#065f46] relative">
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-10" />
          <Chessboard
            options={{
              position: fen,
              onPieceDrop: onDrop,
              boardOrientation: playerColor === 'w' ? 'white' : 'black',
              darkSquareStyle: { backgroundColor: '#064e3b' },
              lightSquareStyle: { backgroundColor: '#a7f3d0' }
            }}
          />
        </div>

        {/* Sidebar Controls */}
        <div className="flex-1 w-full bg-black border-4 border-emerald-600 shadow-[8px_8px_0px_#065f46] p-6 flex flex-col gap-8 relative">
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-50 z-10" />

          <div className="relative z-20">
            <h2 className="text-xs font-pixel tracking-wider text-emerald-600 mb-4">{'>'}{'>'} SYSTEM.STATUS</h2>
            <div className={`p-4 border-2 ${isBotThinking ? 'bg-emerald-900 border-emerald-400 text-emerald-300' : 'bg-black border-emerald-700 text-emerald-500'} flex items-center gap-4`}>
              <span className="text-sm font-pixel">{isBotThinking ? 'CALCULATING...' : gameStatus.toUpperCase()}</span>
            </div>
          </div>

          <div className="relative z-20">
             <h2 className="text-xs font-pixel tracking-wider text-emerald-600 mb-4">{'>'}{'>'} EXECUTE.COMMAND</h2>
             <div className="flex flex-col gap-4">
               <button 
                 onClick={resetGame}
                 className="w-full border-4 border-emerald-600 bg-emerald-900 hover:bg-emerald-500 hover:text-black text-emerald-400 font-pixel text-xs py-4 transition-colors active:translate-y-1 active:translate-x-1 active:shadow-none shadow-[4px_4px_0px_#047857]"
               >
                 INITIATE: WHITE
               </button>
               <button 
                 onClick={playAsBlack}
                 className="w-full border-4 border-emerald-800 bg-black hover:bg-emerald-800 hover:text-emerald-100 text-emerald-600 font-pixel text-xs py-4 transition-colors active:translate-y-1 active:translate-x-1 active:shadow-none shadow-[4px_4px_0px_#064e3b]"
               >
                 INITIATE: BLACK
               </button>
             </div>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}
