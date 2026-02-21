'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerId } from '@/lib/hooks/usePlayerId'
import { Panel } from '@/components/tui/Panel'
import { MapView } from '@/components/tui/MapView'
import { CabinetPanel } from '@/components/tui/CabinetPanel'
import { StatsPanel } from '@/components/tui/StatsPanel'
import { ActionLog } from '@/components/tui/ActionLog'
import { MinisterNotification } from '@/components/tui/MinisterNotification'
import { MinisterActionPanel } from '@/components/tui/MinisterActionPanel'
import { PolicyPanel } from '@/components/game/PolicyPanel'
import { GameList } from '@/components/game/GameList'
import { boxChars } from '@/lib/assets/box-chars'
import { ScoringPreset, SCORING_PRESETS, AVAILABLE_PLAYER_EMOJIS, ResolutionMode } from '@/lib/types/game'
import { MinisterRole } from '@/lib/types/cabinet'
import { useGameStore } from '@/lib/store/gameStore'


export default function HomePage() {
  const [view, setView] = useState<'lobby' | 'create' | 'demo'>('lobby')

  if (view === 'demo') {
    return <DemoGame onBack={() => setView('lobby')} />
  }

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <pre className="text-terminal-green text-xs leading-tight inline-block text-left">
{`╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ███████╗ ██████╗ ██████╗ ███╗   ██╗                    ║
║   ██╔════╝██╔════╝██╔═══██╗████╗  ██║                    ║
║   █████╗  ██║     ██║   ██║██╔██╗ ██║                    ║
║   ██╔══╝  ██║     ██║   ██║██║╚██╗██║                    ║
║   ███████╗╚██████╗╚██████╔╝██║ ╚████║                    ║
║   ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝                    ║
║                                                          ║
║        ECONOMICS STRATEGY GAME                           ║
║        Multiplayer Cabinet Management                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝`}
        </pre>
      </div>

      {view === 'lobby' && (
        <LobbyView
          onDemo={() => setView('demo')}
          onCreate={() => setView('create')}
        />
      )}

      {view === 'create' && (
        <CreateGameView onBack={() => setView('lobby')} />
      )}
    </div>
  )
}

function LobbyView({ onDemo, onCreate }: { onDemo: () => void; onCreate: () => void }) {
  const { playerId } = usePlayerId()
  const router = useRouter()

  return (
    <div className="space-y-4">
      <Panel title="MAIN MENU" borderStyle="double">
        <div className="space-y-2">
          <button
            onClick={onDemo}
            className="block w-full text-left px-4 py-2 text-terminal-green hover:bg-terminal-bright-black transition-colors font-bold"
          >
            {boxChars.play} Play Demo (vs 3 AI Nations)
          </button>
          <button
            onClick={onCreate}
            className="block w-full text-left px-4 py-2 text-terminal-cyan hover:bg-terminal-bright-black transition-colors font-bold"
          >
            {boxChars.play} Create Multiplayer Game
          </button>
        </div>
      </Panel>

      <GameList
        userId={playerId}
        onJoin={(gameId) => router.push(`/game/${gameId}?join=true`)}
        onResume={(gameId) => router.push(`/game/${gameId}`)}
      />

      <Panel title="HOW IT WORKS">
        <div className="text-xs space-y-2 text-terminal-bright-black">
          <p className="text-terminal-foreground">Each quarter, you manage your nation{"'"}s economy through 4 cabinet ministers:</p>
          <div className="grid grid-cols-2 gap-1 text-terminal-foreground">
            <span>⚔️ <span className="text-terminal-red">Warrior</span> - Trade & Tariffs</span>
            <span>🔮 <span className="text-terminal-magenta">Mage</span> - Interest Rates & Inflation</span>
            <span>🔧 <span className="text-terminal-yellow">Engineer</span> - Infrastructure & Growth</span>
            <span>🤝 <span className="text-terminal-cyan">Diplomat</span> - Trade Deals & Immigration</span>
          </div>
          <p>Allocate <span className="text-terminal-yellow">10 focus points</span> across ministers. Higher focus = stronger effects.</p>
          <p>Set monetary policy, fiscal spending, taxes, and trade policy.</p>
          <p>Compete for the highest score based on GDP growth, stability, and demographics.</p>
        </div>
      </Panel>

      <Panel title="SCORING MODES">
        <div className="text-xs space-y-1">
          {(Object.entries(SCORING_PRESETS) as [ScoringPreset, typeof SCORING_PRESETS[ScoringPreset]][]).map(([key, weights]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-terminal-cyan w-44">{key.replace(/_/g, ' ').toUpperCase()}</span>
              <span className="text-terminal-bright-black text-xs">
                GDP:{(weights.gdpGrowth * 100).toFixed(0)}% | Per-Cap:{(weights.gdpPerCapitaGrowth * 100).toFixed(0)}% | Pop:{(weights.populationGrowth * 100).toFixed(0)}% | Stability:{(weights.stabilityScore * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function CreateGameView({ onBack }: { onBack: () => void }) {
  const { playerId } = usePlayerId()
  const router = useRouter()
  const [name, setName] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [playerEmoji, setPlayerEmoji] = useState('👑')
  const [scoringPreset, setScoringPreset] = useState<ScoringPreset>('balanced_growth')
  const [totalQuarters, setTotalQuarters] = useState(40)
  const [quarterDuration, setQuarterDuration] = useState(300)
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [resolutionMode, setResolutionMode] = useState<ResolutionMode>('timer')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim() || !playerName.trim()) {
      setError('Game name and player name are required')
      return
    }

    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-player-id': playerId! },
        body: JSON.stringify({
          name: name.trim(),
          playerName: playerName.trim(),
          playerEmoji,
          scoringPreset,
          totalQuarters,
          quarterDurationSeconds: quarterDuration,
          maxPlayers,
          resolutionMode,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create game')
      }

      const game = await res.json()
      router.push(`/game/${game.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game')
      setCreating(false)
    }
  }

  return (
    <Panel title="CREATE NEW GAME" borderStyle="double">
      <div className="space-y-3 text-sm">
        {error && (
          <div className="text-terminal-red text-xs border border-terminal-red px-2 py-1">
            {error}
          </div>
        )}

        <div>
          <label className="text-terminal-cyan text-xs block mb-1">Game Name:</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter game name..."
            className="w-full bg-terminal-background border border-terminal-border text-terminal-foreground px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-terminal-cyan text-xs block mb-1">Your Name:</label>
          <input
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter your nation leader name..."
            className="w-full bg-terminal-background border border-terminal-border text-terminal-foreground px-3 py-2 text-sm"
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

        <div>
          <label className="text-terminal-cyan text-xs block mb-1">Scoring Mode:</label>
          <select
            value={scoringPreset}
            onChange={e => setScoringPreset(e.target.value as ScoringPreset)}
            className="w-full bg-terminal-background border border-terminal-border text-terminal-foreground px-3 py-2 text-sm"
          >
            <option value="balanced_growth">Balanced Growth</option>
            <option value="pure_prosperity">Pure Prosperity</option>
            <option value="population_power">Population Power</option>
            <option value="economic_powerhouse">Economic Powerhouse</option>
            <option value="stability_doctrine">Stability Doctrine</option>
          </select>
        </div>

        <div>
          <label className="text-terminal-cyan text-xs block mb-1">Resolution Mode:</label>
          <select
            value={resolutionMode}
            onChange={e => setResolutionMode(e.target.value as ResolutionMode)}
            className="w-full bg-terminal-background border border-terminal-border text-terminal-foreground px-3 py-2 text-sm"
          >
            <option value="timer">Timer (resubmit allowed)</option>
            <option value="all_submit">All Submit (submit once)</option>
          </select>
          <div className="text-terminal-bright-black text-xs mt-1">
            {resolutionMode === 'timer'
              ? 'Quarter resolves when timer expires. Players can resubmit policies until then.'
              : 'Each player submits once. Quarter resolves when all players have submitted.'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-terminal-cyan text-xs block mb-1">Quarters:</label>
            <select
              value={totalQuarters}
              onChange={e => setTotalQuarters(parseInt(e.target.value))}
              className="w-full bg-terminal-background border border-terminal-border text-terminal-foreground px-3 py-2 text-sm"
            >
              <option value={12}>12 (3 years)</option>
              <option value={20}>20 (5 years)</option>
              <option value={40}>40 (10 years)</option>
              <option value={60}>60 (15 years)</option>
            </select>
          </div>
          <div>
            <label className="text-terminal-cyan text-xs block mb-1">
              {resolutionMode === 'all_submit' ? 'Deadline (fallback):' : 'Quarter Time:'}
            </label>
            <select
              value={quarterDuration}
              onChange={e => setQuarterDuration(parseInt(e.target.value))}
              className="w-full bg-terminal-background border border-terminal-border text-terminal-foreground px-3 py-2 text-sm"
            >
              <option value={120}>2 min</option>
              <option value={300}>5 min</option>
              <option value={600}>10 min</option>
              <option value={900}>15 min</option>
            </select>
          </div>
          <div>
            <label className="text-terminal-cyan text-xs block mb-1">Max Players:</label>
            <select
              value={maxPlayers}
              onChange={e => setMaxPlayers(parseInt(e.target.value))}
              className="w-full bg-terminal-background border border-terminal-border text-terminal-foreground px-3 py-2 text-sm"
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={6}>6</option>
              <option value={8}>8</option>
              <option value={10}>10</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onBack} className="px-4 py-2 border border-terminal-border text-terminal-foreground hover:bg-terminal-bright-black text-sm">
            [ESC] Back
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-terminal-green text-terminal-background font-bold text-sm disabled:opacity-50"
          >
            {creating ? 'Creating...' : '[ENTER] Create'}
          </button>
        </div>
      </div>
    </Panel>
  )
}

function DemoGame({ onBack }: { onBack: () => void }) {
  const store = useGameStore()
  const [selectedMinister, setSelectedMinister] = useState<MinisterRole>('warrior')
  const [activeTab, setActiveTab] = useState<'cabinet' | 'policy'>('cabinet')

  const players = store.getAllPlayers()

  // Find player rank
  const sorted = [...players].sort((a, b) => b.playerScore - a.playerScore)
  const playerRank = sorted.findIndex(p => p.id === 'player-1') + 1

  return (
    <div className="min-h-screen p-2">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2 px-2 py-1 border border-terminal-border">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-terminal-cyan font-bold">QUARTER {store.quarter}/{store.totalQuarters}</span>
          <span className="text-terminal-bright-black">|</span>
          <span className="text-terminal-yellow">DEMO vs AI</span>
          <span className="text-terminal-bright-black">|</span>
          <span className="text-terminal-green">{store.scoringPreset.replace(/_/g, ' ')}</span>
          <span className="text-terminal-bright-black">|</span>
          <span className={playerRank === 1 ? 'text-terminal-green' : 'text-terminal-foreground'}>
            Rank #{playerRank}
          </span>
          <span className="text-terminal-bright-black">|</span>
          <span className="text-terminal-yellow">Score: {store.player.score.toFixed(1)}</span>
        </div>
        <button onClick={onBack} className="text-terminal-bright-black hover:text-terminal-foreground text-xs">
          [ESC] Exit
        </button>
      </div>

      {/* Game Over overlay */}
      {store.gameOver && (
        <div className="mb-2">
          <Panel title="GAME OVER" borderStyle="double">
            <div className="text-center space-y-2">
              <div className="text-2xl">{playerRank === 1 ? '🏆' : playerRank === 2 ? '🥈' : playerRank === 3 ? '🥉' : '📊'}</div>
              <div className="text-terminal-green text-lg font-bold">
                {playerRank === 1 ? 'VICTORY!' : `Finished #${playerRank}`}
              </div>
              <div className="text-terminal-foreground text-sm">
                Final Score: {store.player.score.toFixed(1)} points
              </div>
              <div className="text-xs text-terminal-bright-black space-y-1">
                {sorted.map((p, i) => (
                  <div key={p.id} className={p.id === 'player-1' ? 'text-terminal-green' : ''}>
                    #{i + 1} {p.playerEmoji} {p.playerName}: {p.playerScore} pts
                  </div>
                ))}
              </div>
              <button
                onClick={() => store.resetGame()}
                className="px-4 py-2 bg-terminal-green text-terminal-background font-bold text-sm mt-2"
              >
                Play Again
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-12 gap-2 md:grid-cols-12">
        {/* Left column */}
        <div className="col-span-12 md:col-span-7 space-y-2">
          <MapView players={players} currentQuarter={store.quarter} />

          {/* Notifications */}
          <div className="space-y-1">
            {store.notifications.slice(-4).map((n) => (
              <MinisterNotification
                key={n.id}
                minister={n.minister}
                message={n.message}
                type={n.type}
                onDismiss={() => store.dismissNotification(n.id)}
              />
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'cabinet' ? (
            <MinisterActionPanel
              assignment={store.policies.cabinetAssignment}
              onAssignmentChange={(a) => store.setPolicies({ ...store.policies, cabinetAssignment: a })}
              onSubmit={store.advanceQuarter}
              quarterNumber={store.quarter}
            />
          ) : (
            <PolicyPanel policies={store.policies} onChange={store.setPolicies} />
          )}

          <ActionLog entries={store.logEntries} maxEntries={12} />
        </div>

        {/* Right column */}
        <div className="col-span-12 md:col-span-5 space-y-2">
          {/* Quarter control */}
          <Panel title="QUARTER CONTROL" borderStyle="double">
            <div className="text-center space-y-2">
              <div className="text-terminal-bright-black text-xs">
                Quarter {store.quarter} / {store.totalQuarters}
              </div>
              <div className="text-terminal-green text-sm">
                {boxChars.darkShade.repeat(Math.min(20, Math.max(0, Math.round((store.quarter / store.totalQuarters) * 20))))}
                {boxChars.lightShade.repeat(Math.max(0, 20 - Math.round((store.quarter / store.totalQuarters) * 20)))}
                {' '}{Math.min(100, Math.round((store.quarter / store.totalQuarters) * 100))}%
              </div>
              {!store.gameOver && (
                <button
                  onClick={store.advanceQuarter}
                  className="w-full py-2 bg-terminal-green text-terminal-background font-bold text-sm hover:bg-terminal-green/80"
                >
                  {boxChars.play} Advance Quarter (Submit Policies)
                </button>
              )}
            </div>
          </Panel>

          <CabinetPanel
            cabinet={store.cabinet}
            selectedMinister={selectedMinister}
            onSelectMinister={setSelectedMinister}
          />

          <StatsPanel
            resources={store.player.resources}
            previousResources={store.previousResources || undefined}
            score={store.player.score}
            rank={playerRank}
            totalPlayers={4}
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
            </div>
          </Panel>

          {/* Scoring breakdown */}
          {store.quarter > 1 && (
            <Panel title="SCORE BREAKDOWN">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-terminal-cyan">GDP Growth:</span>
                  <span className="text-terminal-foreground">
                    {((store.player.resources.gdp - DEFAULT_PLAYER_RESOURCES_REF.gdp) / DEFAULT_PLAYER_RESOURCES_REF.gdp * 100).toFixed(2)}% total
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-cyan">Per Capita:</span>
                  <span className="text-terminal-foreground">
                    ${store.player.resources.gdpPerCapita.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-cyan">Population:</span>
                  <span className="text-terminal-foreground">
                    {(store.player.resources.population / 1e6).toFixed(1)}M ({((store.player.resources.population - DEFAULT_PLAYER_RESOURCES_REF.population) / DEFAULT_PLAYER_RESOURCES_REF.population * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-cyan">Stability:</span>
                  <span className={store.player.resources.inflation > 3.5 || store.player.resources.debtToGdp > 100 ? 'text-terminal-yellow' : 'text-terminal-green'}>
                    Infl:{store.player.resources.inflation.toFixed(1)}% Debt:{store.player.resources.debtToGdp.toFixed(0)}%
                  </span>
                </div>
              </div>
            </Panel>
          )}

          {/* Quick actions */}
          <Panel title="ACTIONS">
            <div className="space-y-1 text-xs">
              <button
                onClick={() => store.resetGame()}
                className="block w-full text-left px-2 py-1 text-terminal-foreground hover:bg-terminal-bright-black"
              >
                {boxChars.play} Reset Game
              </button>
              <button
                onClick={() => store.resetGame('economic_powerhouse')}
                className="block w-full text-left px-2 py-1 text-terminal-bright-black hover:bg-terminal-bright-black hover:text-terminal-foreground"
              >
                {boxChars.play} New Game: Economic Powerhouse
              </button>
              <button
                onClick={() => store.resetGame('stability_doctrine')}
                className="block w-full text-left px-2 py-1 text-terminal-bright-black hover:bg-terminal-bright-black hover:text-terminal-foreground"
              >
                {boxChars.play} New Game: Stability Doctrine
              </button>
              <button
                onClick={() => store.resetGame('population_power')}
                className="block w-full text-left px-2 py-1 text-terminal-bright-black hover:bg-terminal-bright-black hover:text-terminal-foreground"
              >
                {boxChars.play} New Game: Population Power
              </button>
            </div>
          </Panel>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="mt-2 px-2 py-1 border border-terminal-border text-xs text-terminal-bright-black flex justify-between">
        <span>[1-4] Minister | [A] Cabinet | [P] Policy | [SPACE] Submit/Advance</span>
        <span>Q{store.quarter}/{store.totalQuarters} | Score: {store.player.score.toFixed(1)} | v0.1.0</span>
      </div>
    </div>
  )
}

// Reference for score breakdown calculations
import { DEFAULT_PLAYER_RESOURCES } from '@/lib/types/game'
const DEFAULT_PLAYER_RESOURCES_REF = DEFAULT_PLAYER_RESOURCES
