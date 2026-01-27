import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8080/api';

export default function CheckersGame() {
  const [gameState, setGameState] = useState(null);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [winRecord, setWinRecord] = useState({ wins: 0, losses: 0, draws: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    startNewGame();
    fetchWinRecord();
  }, []);

  const startNewGame = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/new-game`, {
        method: 'POST',
      });
      const data = await response.json();
      setGameState(data);
      setSelectedPiece(null);
    } catch (error) {
      console.error('Error starting new game:', error);
    }
    setLoading(false);
  };

  const fetchWinRecord = async () => {
    try {
      const response = await fetch(`${API_URL}/win-record`);
      const data = await response.json();
      setWinRecord(data);
    } catch (error) {
      console.error('Error fetching win record:', error);
    }
  };

  const handleSquareClick = async (row, col) => {
    if (loading || !gameState || gameState.gameOver) return;
    if (gameState.currentTurn !== 'player') return;

    const piece = gameState.board[row][col];

    // Select a piece
    if (!selectedPiece && piece && piece.toLowerCase() === 'r') {
      setSelectedPiece({ row, col });
      return;
    }

    // Make a move
    if (selectedPiece) {
      if (selectedPiece.row === row && selectedPiece.col === col) {
        // Deselect if clicking same piece
        setSelectedPiece(null);
        return;
      }

      // Send move to backend
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/make-move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            move: {
              from: selectedPiece,
              to: { row, col },
            },
          }),
        });
        const data = await response.json();
        setGameState(data.gameState);
        setSelectedPiece(null);
        
        if (data.gameState.gameOver) {
          fetchWinRecord();
        }
      } catch (error) {
        console.error('Error making move:', error);
      }
      setLoading(false);
    }
  };

  const isValidMove = (row, col) => {
    if (!selectedPiece) return false;
    const rowDiff = Math.abs(row - selectedPiece.row);
    const colDiff = Math.abs(col - selectedPiece.col);
    return rowDiff === 1 && colDiff === 1 && !gameState.board[row][col];
  };

  if (!gameState) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Checkers Game</h1>
        
        {/* Win Record */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 flex justify-around">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{winRecord.wins}</div>
            <div className="text-sm text-gray-400">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{winRecord.losses}</div>
            <div className="text-sm text-gray-400">Losses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{winRecord.draws}</div>
            <div className="text-sm text-gray-400">Draws</div>
          </div>
        </div>

        {/* Game Status */}
        <div className="text-center mb-4">
          {gameState.gameOver ? (
            <div className="text-2xl font-bold">
              Game Over! {gameState.winner === 'player' ? 'You Win!' : 'Bot Wins!'}
            </div>
          ) : (
            <div className="text-xl">
              {gameState.currentTurn === 'player' ? "Your Turn" : "Bot's Turn..."}
              {loading && <span className="ml-2 text-gray-400">(Processing...)</span>}
            </div>
          )}
        </div>

        {/* Checkers Board */}
        <div className="inline-block mx-auto">
          <div className="grid grid-cols-8 gap-0 border-4 border-gray-700">
            {gameState.board.map((row, rowIndex) =>
              row.map((piece, colIndex) => {
                const isDark = (rowIndex + colIndex) % 2 === 1;
                const isSelected = selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex;
                const isValidMoveSquare = selectedPiece && isValidMove(rowIndex, colIndex);

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                    className={`
                      w-16 h-16 flex items-center justify-center cursor-pointer
                      ${isDark ? 'bg-gray-700' : 'bg-gray-300'}
                      ${isSelected ? 'ring-4 ring-yellow-400' : ''}
                      ${isValidMoveSquare ? 'ring-2 ring-green-400' : ''}
                      hover:opacity-80 transition-opacity
                    `}
                  >
                    {piece && (
                      <div
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center font-bold
                          ${piece.toLowerCase() === 'r' ? 'bg-red-500' : 'bg-gray-900'}
                          ${piece === piece.toUpperCase() && piece !== '' ? 'border-4 border-yellow-400' : ''}
                        `}
                      >
                        {piece === piece.toUpperCase() && piece !== '' && '♔'}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* New Game Button */}
        <div className="text-center mt-6">
          <button
            onClick={startNewGame}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
            disabled={loading}
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}