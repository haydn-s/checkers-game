package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	_ "github.com/lib/pq"
)

type Position struct {
	Row int `json:"row"`
	Col int `json:"col"`
}

type Move struct {
	From Position `json:"from"`
	To   Position `json:"to"`
}

type GameState struct {
	Board       [][]string `json:"board"`
	CurrentTurn string     `json:"currentTurn"` // "player" or "bot"
	GameOver    bool       `json:"gameOver"`
	Winner      string     `json:"winner,omitempty"`
}

type MoveRequest struct {
	Move Move `json:"move"`
}

type MoveResponse struct {
	GameState GameState `json:"gameState"`
	BotMove   *Move     `json:"botMove,omitempty"`
}

type WinRecord struct {
	Wins   int `json:"wins"`
	Losses int `json:"losses"`
	Draws  int `json:"draws"`
}

var db *sql.DB

func main() {
	// Initialize database connection
	var err error
	db, err = sql.Open("postgres", "host=localhost port=5432 user=checkers_admin password=checkers_pass dbname=checkers sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Initialize database tables
	initDB()

	// Enable CORS and set up routes
	http.HandleFunc("/api/new-game", corsMiddleware(handleNewGame))
	http.HandleFunc("/api/make-move", corsMiddleware(handleMakeMove))
	http.HandleFunc("/api/win-record", corsMiddleware(handleWinRecord))

	log.Println("Server starting on :8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func initDB() {
	query := `
	CREATE TABLE IF NOT EXISTS games (
		id SERIAL PRIMARY KEY,
		winner VARCHAR(10),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	_, err := db.Exec(query)
	if err != nil {
		log.Fatal(err)
	}
}

func handleNewGame(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	gameState := initializeBoard()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(gameState)
}

func handleMakeMove(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var moveReq MoveRequest
	if err := json.NewDecoder(r.Body).Decode(&moveReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// TODO: Implement move validation and game logic
	// For now, create a placeholder response
	gameState := initializeBoard()

	// Simulate bot making a move
	botMove := &Move{
		From: Position{Row: 5, Col: 0},
		To:   Position{Row: 4, Col: 1},
	}

	response := MoveResponse{
		GameState: gameState,
		BotMove:   botMove,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleWinRecord(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var wins, losses, draws int

	rows, err := db.Query("SELECT winner FROM games")
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var winner string
		if err := rows.Scan(&winner); err != nil {
			continue
		}
		switch winner {
		case "player":
			wins++
		case "bot":
			losses++
		case "draw":
			draws++
		}
	}

	record := WinRecord{
		Wins:   wins,
		Losses: losses,
		Draws:  draws,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(record)
}

func initializeBoard() GameState {
	// Initialize an 8x8 checkers board
	// "r" = red player piece, "b" = black bot piece, "R"/"B" = kings, "" = empty
	board := make([][]string, 8)
	for i := range board {
		board[i] = make([]string, 8)
	}

	// Place red pieces (player) on rows 0-2
	for row := 0; row < 3; row++ {
		for col := 0; col < 8; col++ {
			if (row+col)%2 == 1 {
				board[row][col] = "r"
			}
		}
	}

	// Place black pieces (bot) on rows 5-7
	for row := 5; row < 8; row++ {
		for col := 0; col < 8; col++ {
			if (row+col)%2 == 1 {
				board[row][col] = "b"
			}
		}
	}

	return GameState{
		Board:       board,
		CurrentTurn: "player",
		GameOver:    false,
	}
}

func saveGame(winner string) error {
	_, err := db.Exec("INSERT INTO games (winner, created_at) VALUES ($1, $2)", winner, time.Now())
	return err
}
