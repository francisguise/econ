'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePlayerId } from '@/lib/hooks/usePlayerId'
import { useMultiplayerGame } from '@/lib/hooks/useMultiplayerGame'
import { useMultiplayerStore } from '@/lib/store/multiplayerStore'
import { useKeyboard } from '@/lib/hooks/useKeyboard'
import { Panel } from '@/components/tui/Panel'
import { MapView } from '@/components/tui/MapView'
import { CabinetPanel } from '@/components/tui/CabinetPanel'
import { StatsPanel } from '@/components/tui/StatsPanel'
import { TimerPanel } from '@/components/tui/TimerPanel'
import { ActionLog } from '@/components/tui/ActionLog'
import { MinisterNotification } from '@/components/tui/MinisterNotification'
import { MinisterActionPanel } from '@/components/tui/MinisterActionPanel'
import { PolicyPanel } from '@/components/game/PolicyPanel'
import { SubmissionStatus } from '@/components/game/SubmissionStatus'
import { ScoreChart } from '@/components/game/ScoreChart'
import { EconomicsChart } from '@/components/game/EconomicsChart'
import { LoadingScreen } from '@/components/tui/LoadingScreen'
import { MinisterRole } from '@/lib/types/cabinet'
import { DEFAULT_PLAYER_RESOURCES, AVAILABLE_PLAYER_EMOJIS } from '@/lib/types/game'
import { boxChars } from '@/lib/assets/box-chars'

export default function GamePage({ params }: { params: { gameId: string } }) {
  const { playerId, isLoaded } = usePlayerId()
  const searchParams = useSearchParams()

  if (!isLoaded || !playerId) {
    return <LoadingScreen message="Loading..." />
  }

  return <GameContent gameId={params.gameId} userId={playerId} showJoin={searchParams.get('join') === 'true'} />
}

function GameContent({ gameId, userId, showJoin }: { gameId: string; userId: string; showJoin: boolean }) {
  // Use individual selectors for reliable re-renders in Zustand v5
  const game = useMultiplayerStore(s => s.game)
  const players = useMultiplayerStore(s => s.players)
  const snapshots = useMultiplayerStore(s => s.snapshots)

  const { submitPolicies, startGame, refetch } = useMultiplayerGame(gameId, userId)
  const router = useRouter()

  const [selectedMinister, setSelectedMinister] = useState<MinisterRole>('warrior')
  const [activeTab, setActiveTab] = useState<'cabinet' | 'policy' | 'charts'>('cabinet')
  const [showJoinForm, setShowJoinForm] = useState(showJoin)
  const [joinedSuccessfully, setJoinedSuccessfully] = useState(false)

  // Keyboard shortcuts
  useKeyboard({
    '1': () => setSelectedMinister('warrior'),
    '2': () => setSelectedMinister('mage'),
    '3': () => setSelectedMinister('engineer'),
    '4': () => setSelectedMinister('diplomat'),
    'a': () => setActiveTab('cabinet'),
    'p': () => setActiveTab('policy'),
    'c': () => setActiveTab('charts'),
    ' ': () => {
      const s = useMultiplayerStore.getState()
      if (!s.hasSubmitted && s.game?.status === 'active') submitPolicies()
    },
  })

  // Clean up store on unmount
  useEffect(() => {
    return () => { useMultiplayerStore.getState().reset() }
  }, [])

  // Derive local player info from reactive selectors
  const localPlayer = players.find(p => p.userId === userId)
  const isCreator = game?.createdBy === userId
  const isInGame = !!localPlayer
  const playerRank = (() => {
    const sorted = [...players].sort((a, b) => b.playerScore - a.playerScore)
    return sorted.findIndex(p => p.userId === userId) + 1
  })()

  // Loading state
  if (!game) {
    return <LoadingScreen message="Loading game..." />
  }

  // Join form
  if (showJoinForm && !isInGame && !joinedSuccessfully && game.status === 'waiting') {
    return (
      <JoinGameForm
        gameId={gameId}
        gameName={game.name}
        playerId={userId}
        onJoined={() => { setShowJoinForm(false); setJoinedSuccessfully(true); refetch() }}
        onCancel={() => router.push('/')}
      />
    )
  }

  // Not in game
  if (!isInGame && game.status !== 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Panel title="ACCESS DENIED" borderStyle="double">
          <div className="text-center space-y-2 text-sm">
            <div className="text-terminal-red">You are not a player in this game.</div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 border border-terminal-border text-terminal-foreground hover:bg-terminal-bright-black"
            >
              Back to Lobby
            </button>
          </div>
        </Panel>
      </div>
    )
  }

  // Waiting room
  if (game.status === 'waiting') {
    return (
      <WaitingRoom
        game={game}
        players={players}
        isCreator={isCreator}
        isInGame={isInGame || joinedSuccessfully}
        onStart={startGame}
        onBack={() => router.push('/')}
        onJoin={() => setShowJoinForm(true)}
      />
    )
  }

  // Game over
  if (game.status === 'completed') {
    return (
      <GameOver
        game={game}
        players={players}
        localUserId={userId}
        snapshots={snapshots}
        onBack={() => router.push('/')}
      />
    )
  }

  // Active game
  return (
    <ActiveGame
      localPlayer={localPlayer!}
      playerRank={playerRank}
      selectedMinister={selectedMinister}
      setSelectedMinister={setSelectedMinister}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onSubmit={submitPolicies}
      onBack={() => router.push('/')}
    />
  )
}

// ─── Join Form ───────────────────────────────────────────
function JoinGameForm({
  gameId,
  gameName,
  playerId,
  onJoined,
  onCancel,
}: {
  gameId: string
  gameName: string
  playerId: string
  onJoined: () => void
  onCancel: () => void
}) {
  const [playerName, setPlayerName] = useState('')
  const [playerEmoji, setPlayerEmoji] = useState('🎯')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    if (!playerName.trim()) {
      setError('Enter your nation leader name')
      return
    }

    setJoining(true)
    setError('')

    try {
      const res = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-player-id': playerId },
        body: JSON.stringify({ playerName: playerName.trim(), playerEmoji }),
      })

      if (!res.ok) {
        const data = await res.json()
        // "Already joined" means we're in — treat as success
        if (data.error === 'Already joined this game') {
          onJoined()
          return
        }
        throw new Error(data.error || 'Failed to join')
      }

      onJoined()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join')
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Panel title={`JOIN: ${gameName}`} borderStyle="double">
          <div className="space-y-3 text-sm">
            {error && (
              <div className="text-terminal-red text-xs border border-terminal-red px-2 py-1">{error}</div>
            )}

            <div>
              <label className="text-terminal-cyan text-xs block mb-1">Your Name:</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Nation leader name..."
                className="w-full bg-terminal-background border border-terminal-border text-terminal-foreground px-3 py-2 text-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="text-terminal-cyan text-xs block mb-1">Your Emoji:</label>
              <div className="flex flex-wrap gap-1">
                {AVAILABLE_PLAYER_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setPlayerEmoji(emoji)}
                    className={`w-8 h-8 text-lg flex items-center justify-center border ${
                      playerEmoji === emoji
                        ? 'border-terminal-green bg-terminal-bright-black'
                        : 'border-terminal-border hover:border-terminal-bright-black'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={onCancel} className="px-4 py-2 border border-terminal-border text-terminal-foreground hover:bg-terminal-bright-black text-sm">
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="px-4 py-2 bg-terminal-green text-terminal-background font-bold text-sm disabled:opacity-50"
              >
                {joining ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ─── Waiting Room ────────────────────────────────────────
function WaitingRoom({
  game,
  players,
  isCreator,
  isInGame,
  onStart,
  onBack,
  onJoin,
}: {
  game: ReturnType<typeof useMultiplayerStore.getState>['game'] & object
  players: ReturnType<typeof useMultiplayerStore.getState>['players']
  isCreator: boolean
  isInGame: boolean
  onStart: () => void
  onBack: () => void
  onJoin: () => void
}) {
  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <Panel title={`WAITING ROOM: ${game.name}`} borderStyle="double">
        <div className="space-y-4">
          {/* Game config */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-terminal-bright-black">Scoring: <span className="text-terminal-cyan">{game.scoringPreset.replace(/_/g, ' ')}</span></div>
            <div className="text-terminal-bright-black">Quarters: <span className="text-terminal-foreground">{game.totalQuarters}</span></div>
            <div className="text-terminal-bright-black">Quarter Time: <span className="text-terminal-foreground">{game.quarterDurationSeconds}s</span></div>
            <div className="text-terminal-bright-black">Max Players: <span className="text-terminal-foreground">{game.maxPlayers}</span></div>
          </div>

          {/* Player list */}
          <div>
            <div className="text-terminal-cyan text-xs mb-2">
              PLAYERS ({players.length}/{game.maxPlayers})
            </div>
            <div className="space-y-1">
              {players.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 px-2 py-1 border border-terminal-border text-xs">
                  <span className="text-terminal-bright-black">#{i + 1}</span>
                  <span>{p.playerEmoji}</span>
                  <span className="text-terminal-foreground">{p.playerName}</span>
                  {p.userId === game.createdBy && (
                    <span className="text-terminal-yellow text-xs">(host)</span>
                  )}
                </div>
              ))}
              {players.length === 0 && (
                <div className="text-terminal-bright-black text-xs py-2">Waiting for players...</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={onBack} className="px-4 py-2 border border-terminal-border text-terminal-foreground hover:bg-terminal-bright-black text-sm">
              Back to Lobby
            </button>
            {!isInGame && (
              <button
                onClick={onJoin}
                className="px-4 py-2 bg-terminal-cyan text-terminal-background font-bold text-sm"
              >
                Join Game
              </button>
            )}
            {isCreator && (
              <button
                onClick={onStart}
                disabled={players.length < 2}
                className="px-4 py-2 bg-terminal-green text-terminal-background font-bold text-sm disabled:opacity-50"
              >
                {players.length < 2 ? `Need ${2 - players.length} more player(s)` : 'Start Game'}
              </button>
            )}
            {isInGame && !isCreator && (
              <div className="px-4 py-2 text-terminal-yellow text-sm">
                Waiting for host to start...
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  )
}

// ─── Active Game ─────────────────────────────────────────
function ActiveGame({
  localPlayer,
  playerRank,
  selectedMinister,
  setSelectedMinister,
  activeTab,
  setActiveTab,
  onSubmit,
  onBack,
}: {
  localPlayer: NonNullable<ReturnType<ReturnType<typeof useMultiplayerStore.getState>['getLocalPlayer']>>
  playerRank: number
  selectedMinister: MinisterRole
  setSelectedMinister: (m: MinisterRole) => void
  activeTab: 'cabinet' | 'policy' | 'charts'
  setActiveTab: (t: 'cabinet' | 'policy' | 'charts') => void
  onSubmit: () => void
  onBack: () => void
}) {
  const game = useMultiplayerStore(s => s.game)
  const players = useMultiplayerStore(s => s.players)
  const currentQuarter = useMultiplayerStore(s => s.currentQuarter)
  const policies = useMultiplayerStore(s => s.policies)
  const hasSubmitted = useMultiplayerStore(s => s.hasSubmitted)
  const notifications = useMultiplayerStore(s => s.notifications)
  const logEntries = useMultiplayerStore(s => s.logEntries)
  const submittedPlayers = useMultiplayerStore(s => s.submittedPlayers)
  const cabinet = useMultiplayerStore(s => s.cabinet)
  const snapshots = useMultiplayerStore(s => s.snapshots)

  if (!game) return null

  return (
    <div className="min-h-screen p-2">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2 px-2 py-1 border border-terminal-border">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-terminal-cyan font-bold">{game.name}</span>
          <span className="text-terminal-bright-black">|</span>
          <span className="text-terminal-cyan">Q{game.currentQuarter}/{game.totalQuarters}</span>
          <span className="text-terminal-bright-black">|</span>
          <span className="text-terminal-green">{game.scoringPreset.replace(/_/g, ' ')}</span>
          <span className="text-terminal-bright-black">|</span>
          <span className={playerRank === 1 ? 'text-terminal-green' : 'text-terminal-foreground'}>
            Rank #{playerRank}
          </span>
          <span className="text-terminal-bright-black">|</span>
          <span className="text-terminal-yellow">Score: {localPlayer.playerScore}</span>
        </div>
        <button onClick={onBack} className="text-terminal-bright-black hover:text-terminal-foreground text-xs">
          [ESC] Lobby
        </button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-12 gap-2">
        {/* Left column */}
        <div className="col-span-12 md:col-span-7 space-y-2">
          <MapView players={players} currentQuarter={game.currentQuarter} />

          {/* Notifications */}
          <div className="space-y-1">
            {notifications.slice(-4).map((n) => (
              <MinisterNotification
                key={n.id}
                minister={n.minister}
                message={n.message}
                type={n.type}
                onDismiss={() => useMultiplayerStore.getState().dismissNotification(n.id)}
              />
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'cabinet' ? (
            <MinisterActionPanel
              assignment={policies.cabinetAssignment}
              onAssignmentChange={(a) => useMultiplayerStore.getState().setPolicies({ ...policies, cabinetAssignment: a })}
              onSubmit={onSubmit}
              quarterNumber={game.currentQuarter}
            />
          ) : activeTab === 'policy' ? (
            <PolicyPanel policies={policies} onChange={useMultiplayerStore.getState().setPolicies} />
          ) : (
            <div className="space-y-2">
              <ScoreChart players={players} snapshots={snapshots} />
              <EconomicsChart localUserId={localPlayer.userId} snapshots={snapshots} />
            </div>
          )}

          <ActionLog entries={logEntries} maxEntries={12} />
        </div>

        {/* Right column */}
        <div className="col-span-12 md:col-span-5 space-y-2">
          {currentQuarter && (
            <TimerPanel
              endsAt={currentQuarter.endsAt}
              quarterNumber={currentQuarter.quarterNumber}
              totalQuarters={game.totalQuarters}
              hasSubmitted={hasSubmitted}
              onSubmit={onSubmit}
            />
          )}

          <SubmissionStatus
            players={players}
            submittedPlayerIds={submittedPlayers}
          />

          <CabinetPanel
            cabinet={cabinet}
            selectedMinister={selectedMinister}
            onSelectMinister={setSelectedMinister}
          />

          <StatsPanel
            resources={localPlayer.playerResources || DEFAULT_PLAYER_RESOURCES}
            previousResources={useMultiplayerStore.getState().previousResources || undefined}
            score={localPlayer.playerScore}
            rank={playerRank}
            totalPlayers={players.length}
          />

          {/* Tab buttons */}
          <Panel title="VIEW">
            <div className="flex gap-1 text-xs">
              <button
                onClick={() => setActiveTab('cabinet')}
                className={`flex-1 px-3 py-1 ${activeTab === 'cabinet' ? 'bg-terminal-bright-black text-terminal-green' : 'text-terminal-bright-black hover:text-terminal-foreground'}`}
              >
                [A] Cabinet
              </button>
              <button
                onClick={() => setActiveTab('policy')}
                className={`flex-1 px-3 py-1 ${activeTab === 'policy' ? 'bg-terminal-bright-black text-terminal-green' : 'text-terminal-bright-black hover:text-terminal-foreground'}`}
              >
                [P] Policy
              </button>
              <button
                onClick={() => setActiveTab('charts')}
                className={`flex-1 px-3 py-1 ${activeTab === 'charts' ? 'bg-terminal-bright-black text-terminal-green' : 'text-terminal-bright-black hover:text-terminal-foreground'}`}
              >
                [C] Charts
              </button>
            </div>
          </Panel>

          {/* Submit button */}
          {!hasSubmitted && (
            <button
              onClick={onSubmit}
              className="w-full py-2 bg-terminal-green text-terminal-background font-bold text-sm hover:bg-terminal-green/80"
            >
              {boxChars.play} Submit Policies
            </button>
          )}
          {hasSubmitted && (
            <div className="text-center py-2 text-terminal-green text-sm border border-terminal-green">
              ✓ Policies Submitted — Waiting for other players
            </div>
          )}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="mt-2 px-2 py-1 border border-terminal-border text-xs text-terminal-bright-black flex justify-between">
        <span>[1-4] Minister | [A] Cabinet | [P] Policy | [C] Charts | [SPACE] Submit</span>
        <span>{hasSubmitted ? '✓ Submitted' : 'Not submitted'} | Q{game.currentQuarter}/{game.totalQuarters}</span>
      </div>
    </div>
  )
}

// ─── Game Over ───────────────────────────────────────────
function GameOver({
  game,
  players,
  localUserId,
  snapshots,
  onBack,
}: {
  game: NonNullable<ReturnType<typeof useMultiplayerStore.getState>['game']>
  players: ReturnType<typeof useMultiplayerStore.getState>['players']
  localUserId: string
  snapshots: ReturnType<typeof useMultiplayerStore.getState>['snapshots']
  onBack: () => void
}) {
  const sorted = [...players].sort((a, b) => b.playerScore - a.playerScore)
  const localRank = sorted.findIndex(p => p.userId === localUserId) + 1
  const localPlayer = sorted.find(p => p.userId === localUserId)

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <Panel title={`GAME OVER: ${game.name}`} borderStyle="double">
        <div className="text-center space-y-4">
          <div className="text-4xl">
            {localRank === 1 ? '🏆' : localRank === 2 ? '🥈' : localRank === 3 ? '🥉' : '📊'}
          </div>
          <div className="text-terminal-green text-2xl font-bold">
            {localRank === 1 ? 'VICTORY!' : `You finished #${localRank}`}
          </div>
          {localPlayer && (
            <div className="text-terminal-foreground text-lg">
              Final Score: {localPlayer.playerScore} points
            </div>
          )}
        </div>
      </Panel>

      {/* Final rankings */}
      <div className="mt-4">
        <Panel title="FINAL RANKINGS">
          <div className="space-y-1">
            {sorted.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-2 py-1 border text-xs ${
                  p.userId === localUserId
                    ? 'border-terminal-green text-terminal-green'
                    : 'border-terminal-border text-terminal-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 text-right text-terminal-bright-black">#{i + 1}</span>
                  <span>{p.playerEmoji}</span>
                  <span className="font-bold">{p.playerName}</span>
                </div>
                <div className="flex items-center gap-4">
                  {p.playerResources && (
                    <>
                      <span className="text-terminal-bright-black">
                        GDP: ${(p.playerResources.gdp / 1e12).toFixed(2)}T
                      </span>
                      <span className="text-terminal-bright-black">
                        Pop: {(p.playerResources.population / 1e6).toFixed(1)}M
                      </span>
                    </>
                  )}
                  <span className="font-bold text-terminal-yellow w-20 text-right">
                    {p.playerScore} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Charts */}
      <div className="mt-4 space-y-4">
        <ScoreChart players={players} snapshots={snapshots} />
        <EconomicsChart localUserId={localUserId} snapshots={snapshots} />
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-terminal-green text-terminal-background font-bold text-sm"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  )
}
