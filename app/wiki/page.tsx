'use client'

import Link from 'next/link'
import { Panel } from '@/components/tui/Panel'

export default function WikiPage() {
  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-terminal-green text-lg font-bold font-mono">ECON WIKI</h1>
        <Link href="/" className="text-terminal-bright-black hover:text-terminal-foreground text-xs font-mono">
          [ESC] Back to Game
        </Link>
      </div>

      {/* Table of Contents */}
      <Panel title="CONTENTS">
        <div className="text-xs space-y-1 font-mono">
          <a href="#economic-models" className="block text-terminal-cyan hover:text-terminal-green">1. Economic Model Modes</a>
          <a href="#interactions" className="block text-terminal-cyan hover:text-terminal-green">2. Cross-Country Interactions</a>
          <a href="#capital-flows" className="block text-terminal-cyan hover:text-terminal-green ml-4">2.1 Capital Flows</a>
          <a href="#trade" className="block text-terminal-cyan hover:text-terminal-green ml-4">2.2 Trade & Net Exports</a>
          <a href="#migration" className="block text-terminal-cyan hover:text-terminal-green ml-4">2.3 Population Migration</a>
          <a href="#qe" className="block text-terminal-cyan hover:text-terminal-green ml-4">2.4 Quantitative Easing</a>
          <a href="#twin-deficits" className="block text-terminal-cyan hover:text-terminal-green ml-4">2.5 Twin Deficits</a>
          <a href="#resolution" className="block text-terminal-cyan hover:text-terminal-green">3. Resolution Order</a>
          <a href="#cabinet" className="block text-terminal-cyan hover:text-terminal-green">4. Cabinet Ministers</a>
          <a href="#warrior" className="block text-terminal-cyan hover:text-terminal-green ml-4">4.1 Warrior (Trade & Competition)</a>
          <a href="#mage" className="block text-terminal-cyan hover:text-terminal-green ml-4">4.2 Mage (Central Bank)</a>
          <a href="#engineer" className="block text-terminal-cyan hover:text-terminal-green ml-4">4.3 Engineer (Development)</a>
          <a href="#diplomat" className="block text-terminal-cyan hover:text-terminal-green ml-4">4.4 Diplomat (Foreign Affairs)</a>
          <a href="#focus" className="block text-terminal-cyan hover:text-terminal-green">5. Focus Points</a>
          <a href="#policies" className="block text-terminal-cyan hover:text-terminal-green">6. Policy Controls</a>
        </div>
      </Panel>

      {/* Economic Models */}
      <div className="mt-4" id="economic-models">
        <Panel title="1. ECONOMIC MODEL MODES">
          <div className="text-xs space-y-3 font-mono">
            <p className="text-terminal-foreground">
              The game supports two resolution modes that control how cross-country interactions are calculated each quarter.
            </p>

            <div className="border border-terminal-border p-2">
              <div className="text-terminal-green font-bold mb-1">LAGGED (Default)</div>
              <p className="text-terminal-foreground">
                Single-pass resolution. The world state is computed from each player{"'"}s <span className="text-terminal-yellow">previous quarter</span> resources.
                Each player is then resolved once against that snapshot. Simple, fast, no iteration.
              </p>
              <p className="text-terminal-bright-black mt-1">
                Best for: Casual play, quick games, learning the mechanics.
              </p>
            </div>

            <div className="border border-terminal-border p-2">
              <div className="text-terminal-green font-bold mb-1">EQUILIBRIUM</div>
              <p className="text-terminal-foreground">
                Iterative convergence. Players are resolved multiple times per quarter until the world state stabilizes.
                This models the real-world feedback loop where economic decisions ripple back and forth between countries.
              </p>
              <p className="text-terminal-bright-black mt-1">
                Converges in 2-3 iterations typically. Max 5 iterations with threshold 0.001.
              </p>
              <p className="text-terminal-bright-black mt-1">
                Best for: Competitive play where precise cross-country feedback matters.
              </p>
            </div>

            <div className="text-terminal-bright-black">
              <span className="text-terminal-cyan">Theory:</span> In general equilibrium economics, all markets clear simultaneously.
              The lagged mode is a partial equilibrium approximation (each country optimizes independently given last period{"'"}s data).
              The equilibrium mode approaches a Nash equilibrium where each country{"'"}s outcome is consistent with others{"'"} actions.
            </div>
          </div>
        </Panel>
      </div>

      {/* Cross-Country Interactions */}
      <div className="mt-4" id="interactions">
        <Panel title="2. CROSS-COUNTRY INTERACTIONS">
          <div className="text-xs font-mono text-terminal-foreground">
            <p>
              All interactions flow through a <span className="text-terminal-yellow">WorldState</span> object:
              GDP-weighted averages of interest rates, inflation, and exchange rates across all players,
              plus population-weighted quality of life and simple-average tariff rates.
            </p>
            <p className="text-terminal-bright-black mt-2">
              With 1 player, all differentials are zero and the game behaves identically to single-player mode.
            </p>
          </div>
        </Panel>
      </div>

      {/* Capital Flows */}
      <div className="mt-4" id="capital-flows">
        <Panel title="2.1 CAPITAL FLOWS (Uncovered Interest Rate Parity)">
          <div className="text-xs space-y-2 font-mono">
            <div className="text-terminal-bright-black">
              <span className="text-terminal-cyan">Economic Theory:</span> Uncovered Interest Rate Parity (UIP) predicts that
              capital flows toward countries with higher real interest rates. Investors seek the best risk-adjusted returns,
              so money moves from low-yield to high-yield economies. This is one of the fundamental arbitrage conditions
              in international finance.
            </div>

            <div className="border border-terminal-border p-2 text-terminal-yellow">
              <div>realRateDiff = (i_domestic - inflation) - (i_world - inflation_world)</div>
              <div>dampening = {'{'} open: 1.0, moderate: 0.4, strict: 0.1 {'}'}</div>
              <div>flowPressure = realRateDiff * dampening[capitalControls]</div>
            </div>

            <div className="text-terminal-foreground">
              <span className="text-terminal-green">Effects:</span>
            </div>
            <ul className="text-terminal-foreground space-y-1 ml-2">
              <li>Exchange rate appreciates with capital inflows (flowPressure * 0.01)</li>
              <li>GDP boosted by capital inflows via increased investment (flowPressure * 0.002)</li>
            </ul>

            <div className="text-terminal-foreground">
              <span className="text-terminal-green">Policy levers:</span>
            </div>
            <ul className="text-terminal-foreground space-y-1 ml-2">
              <li><span className="text-terminal-cyan">Interest Rate</span> - Higher rates attract capital</li>
              <li><span className="text-terminal-cyan">Capital Controls</span> - Strict controls block 90% of flows, moderate blocks 60%</li>
            </ul>
          </div>
        </Panel>
      </div>

      {/* Trade */}
      <div className="mt-4" id="trade">
        <Panel title="2.2 TRADE & NET EXPORTS (Exchange Rate Pass-Through)">
          <div className="text-xs space-y-2 font-mono">
            <div className="text-terminal-bright-black">
              <span className="text-terminal-cyan">Economic Theory:</span> The Marshall-Lerner condition states that currency
              depreciation improves the trade balance when export and import demand elasticities sum to greater than one.
              A weaker currency makes exports cheaper and imports more expensive. Tariffs act as a tax on imports but
              invite retaliation, modeled as the world average tariff rate penalizing your exports.
            </div>

            <div className="border border-terminal-border p-2 text-terminal-yellow">
              <div>relativeRate = exchangeRate / world.avgExchangeRate</div>
              <div>competitiveness = 1.0 - relativeRate</div>
              <div>netExports = 0.5 * competitiveness + tariffRate * 0.005 - worldAvgTariff * 0.003</div>
              <div>tradeBalance = netExports * 100  (as % of GDP)</div>
            </div>

            <div className="text-terminal-foreground">
              <span className="text-terminal-green">Effects:</span>
            </div>
            <ul className="text-terminal-foreground space-y-1 ml-2">
              <li>Net exports feed directly into the IS curve (aggregate demand)</li>
              <li>Trade balance stored on resources (+ = surplus, - = deficit)</li>
              <li>Persistent trade deficits raise the risk premium on debt (twin deficits)</li>
            </ul>

            <div className="text-terminal-foreground">
              <span className="text-terminal-green">Policy levers:</span>
            </div>
            <ul className="text-terminal-foreground space-y-1 ml-2">
              <li><span className="text-terminal-cyan">Tariff Rate</span> - Reduces imports but triggers world retaliation</li>
              <li><span className="text-terminal-cyan">Interest Rate</span> - Indirectly affects exchange rate via capital flows</li>
            </ul>
          </div>
        </Panel>
      </div>

      {/* Migration */}
      <div className="mt-4" id="migration">
        <Panel title="2.3 POPULATION MIGRATION (Quality of Life Index)">
          <div className="text-xs space-y-2 font-mono">
            <div className="text-terminal-bright-black">
              <span className="text-terminal-cyan">Economic Theory:</span> The Tiebout model of migration suggests people
              {'"'}vote with their feet{'"'} by moving to jurisdictions offering the best package of public services and
              economic opportunity. Migration is driven by quality-of-life differentials and gated by immigration policy,
              reflecting real-world visa systems and border controls.
            </div>

            <div className="border border-terminal-border p-2 text-terminal-yellow">
              <div>qualityOfLife =</div>
              <div className="ml-2">0.40 * normalize(gdpPerCapita, 20k-80k)</div>
              <div className="ml-2">+ 0.20 * (healthcareIndex / 100)</div>
              <div className="ml-2">+ 0.15 * (educationIndex / 100)</div>
              <div className="ml-2">+ 0.15 * (1 - unemployment / 25)</div>
              <div className="ml-2">+ 0.10 * max(0, 1 - |inflation - 2| / 20)</div>
              <div className="mt-1">migrationPull = qualityOfLife - world.avgQualityOfLife</div>
              <div>gate = {'{'} restrictive: 0.2, moderate: 0.6, open: 1.0 {'}'}</div>
              <div>netMigrationRate = migrationPull * 0.01 * gate</div>
            </div>

            <div className="text-terminal-foreground">
              <span className="text-terminal-green">Effects:</span>
            </div>
            <ul className="text-terminal-foreground space-y-1 ml-2">
              <li>Population grows/shrinks from migration (additive to natural birth/death)</li>
              <li>Higher QoL attracts migrants, lower QoL causes emigration</li>
            </ul>

            <div className="text-terminal-foreground">
              <span className="text-terminal-green">Policy levers:</span>
            </div>
            <ul className="text-terminal-foreground space-y-1 ml-2">
              <li><span className="text-terminal-cyan">Immigration Policy</span> - Open lets all migration through, restrictive blocks 80%</li>
              <li><span className="text-terminal-cyan">Healthcare/Education spending</span> - Improves QoL components</li>
            </ul>
          </div>
        </Panel>
      </div>

      {/* QE */}
      <div className="mt-4" id="qe">
        <Panel title="2.4 QUANTITATIVE EASING (Money Supply & Inflation)">
          <div className="text-xs space-y-2 font-mono">
            <div className="text-terminal-bright-black">
              <span className="text-terminal-cyan">Economic Theory:</span> The Quantity Theory of Money (MV=PY) suggests that
              excess money growth beyond real output growth leads to inflation. QE expands the monetary base by purchasing
              government bonds, lowering long-term rates and stimulating demand. The flip side is inflationary pressure
              when money growth exceeds what the economy can absorb.
            </div>

            <div className="border border-terminal-border p-2 text-terminal-yellow">
              <div>moneyGrowth = {'{'} tightening: -0.02, neutral: 0.00, easing: +0.03 {'}'}</div>
              <div>moneySupplyIndex *= (1 + moneyGrowth)</div>
              <div>excessMoneyGrowth = moneyGrowth - gdpGrowthRate</div>
              <div>supplyShock = excessMoneyGrowth * 0.5</div>
            </div>

            <div className="text-terminal-foreground">
              <span className="text-terminal-green">Effects:</span>
            </div>
            <ul className="text-terminal-foreground space-y-1 ml-2">
              <li>Supply shock fed into Phillips Curve, raising or lowering inflation</li>
              <li>Money supply index tracked over time (starts at 100)</li>
              <li>Easing during low growth = mild inflation; easing during high growth = significant inflation</li>
            </ul>

            <div className="text-terminal-foreground">
              <span className="text-terminal-green">Policy levers:</span>
            </div>
            <ul className="text-terminal-foreground space-y-1 ml-2">
              <li><span className="text-terminal-cyan">QE Stance</span> - Tightening shrinks money supply, easing expands it</li>
            </ul>
          </div>
        </Panel>
      </div>

      {/* Twin Deficits */}
      <div className="mt-4" id="twin-deficits">
        <Panel title="2.5 TWIN DEFICITS (Trade + Budget)">
          <div className="text-xs space-y-2 font-mono">
            <div className="text-terminal-bright-black">
              <span className="text-terminal-cyan">Economic Theory:</span> The twin deficits hypothesis links fiscal deficits
              and trade deficits. A country running a trade deficit is effectively borrowing from abroad,
              adding to national debt. Persistent trade deficits also raise the risk premium on government debt
              as investors worry about the country{"'"}s ability to repay.
            </div>

            <div className="border border-terminal-border p-2 text-terminal-yellow">
              <div>debtToGdp += max(0, -tradeBalance * 0.1)  (trade deficit spills into debt)</div>
              <div>riskPremium += |tradeBalance + 3| * 0.02  (if tradeBalance {"<"} -3%)</div>
            </div>

            <div className="text-terminal-foreground">
              <span className="text-terminal-green">Effects:</span>
            </div>
            <ul className="text-terminal-foreground space-y-1 ml-2">
              <li>Trade deficits accelerate debt accumulation</li>
              <li>Large trade deficits ({">"}3% of GDP) raise borrowing costs via risk premium</li>
              <li>Higher risk premium tightens monetary conditions, slowing GDP growth</li>
            </ul>
          </div>
        </Panel>
      </div>

      {/* Resolution Order */}
      <div className="mt-4" id="resolution">
        <Panel title="3. RESOLUTION ORDER">
          <div className="text-xs space-y-1 font-mono">
            <p className="text-terminal-foreground mb-2">Each quarter, every player is resolved in this order:</p>
            <div className="text-terminal-foreground space-y-1">
              <div><span className="text-terminal-yellow"> 1.</span> Cabinet effects (minister focus bonuses)</div>
              <div><span className="text-terminal-yellow"> 2.</span> <span className="text-terminal-green">QE effect</span> &rarr; supply shock, money supply index</div>
              <div><span className="text-terminal-yellow"> 3.</span> CBRF or manual interest rate</div>
              <div><span className="text-terminal-yellow"> 4.</span> <span className="text-terminal-green">Capital flows (UIP)</span> &rarr; exchange rate change, GDP effect</div>
              <div><span className="text-terminal-yellow"> 5.</span> <span className="text-terminal-green">Net exports (trade)</span> &rarr; net exports, trade balance</div>
              <div><span className="text-terminal-yellow"> 6.</span> IS Curve (aggregate demand) with NX + capital flow GDP effect</div>
              <div><span className="text-terminal-yellow"> 7.</span> Phillips Curve with QE supply shock</div>
              <div><span className="text-terminal-yellow"> 8.</span> <span className="text-terminal-green">Migration</span> &rarr; net migration rate, quality of life</div>
              <div><span className="text-terminal-yellow"> 9.</span> Population dynamics with migration</div>
              <div><span className="text-terminal-yellow">10.</span> GDP per capita</div>
              <div><span className="text-terminal-yellow">11.</span> Budget identity with trade deficit (twin deficits)</div>
              <div><span className="text-terminal-yellow">12.</span> Exchange rate from capital flows</div>
              <div><span className="text-terminal-yellow">13.</span> Unemployment via Okun{"'"}s Law</div>
              <div><span className="text-terminal-yellow">14.</span> Store trade balance, money supply index, quality of life</div>
              <div><span className="text-terminal-yellow">15.</span> Random events</div>
              <div><span className="text-terminal-yellow">16.</span> Score calculation</div>
            </div>
            <p className="text-terminal-bright-black mt-2">
              <span className="text-terminal-green">Green</span> steps are new cross-country interactions.
            </p>
          </div>
        </Panel>
      </div>

      {/* Cabinet Ministers */}
      <div className="mt-4" id="cabinet">
        <Panel title="4. CABINET MINISTERS">
          <div className="text-xs font-mono text-terminal-foreground">
            <p>
              Your cabinet consists of 4 ministers. Each can be assigned to a specific task and given
              a focus level (0-4). You have <span className="text-terminal-yellow">10 focus points</span> total
              to distribute. Higher focus increases effectiveness but means less focus elsewhere.
            </p>
          </div>
        </Panel>
      </div>

      {/* Warrior */}
      <div className="mt-4" id="warrior">
        <Panel title="4.1 WARRIOR - Trade & Competition Minister">
          <div className="text-xs space-y-2 font-mono">
            <div className="text-terminal-red font-bold">General Marcus</div>
            <p className="text-terminal-foreground">
              Handles tariffs, trade wars, currency defense, and strategic reserves.
              The warrior{"'"}s focus scales the effectiveness of trade-related actions.
            </p>

            <div className="space-y-2 mt-2">
              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Tariff Management</div>
                <p className="text-terminal-foreground mt-1">
                  Maintain and adjust trade tariffs. Works alongside the tariff rate policy slider.
                  Higher focus improves the net export calculation through the chi (exchange rate sensitivity) parameter.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: Modulates trade competitiveness. Pairs with tariff rate policy.</p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Strategic Reserves</div>
                <p className="text-terminal-foreground mt-1">
                  Build commodity reserves for shock immunity. Provides a buffer against oil price shocks
                  and supply disruptions.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: Defensive. Reduces vulnerability to random supply shocks.</p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Currency Defense</div>
                <p className="text-terminal-foreground mt-1">
                  Protect exchange rate from speculation. Stabilizes the exchange rate by reducing
                  the impact of capital flow pressure.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: Exchange rate stability. Useful when capital controls are open.</p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Economic Warfare <span className="text-terminal-yellow">(Focus 4 required)</span></div>
                <p className="text-terminal-foreground mt-1">
                  Devastating tariffs or competitive devaluation. A heroic-level assignment that
                  amplifies trade advantages at the cost of diplomatic relations.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: Aggressive trade posture. High risk, high reward.</p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Mage */}
      <div className="mt-4" id="mage">
        <Panel title="4.2 MAGE - Central Bank Governor">
          <div className="text-xs space-y-2 font-mono">
            <div className="text-terminal-magenta font-bold">Archmage Elena</div>
            <p className="text-terminal-foreground">
              Manages interest rates, QE, inflation control, and financial stability.
              The mage{"'"}s focus scales the CBRF (Central Bank Reaction Function) sensitivity parameters.
            </p>

            <div className="space-y-2 mt-2">
              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Interest Rate Control</div>
                <p className="text-terminal-foreground mt-1">
                  Set interest rates via the CBRF autopilot or manually. The CBRF follows a Taylor Rule:
                  i = r* + pi* + alpha*(pi - pi*) + gamma*(y - y*). Focus scales both alpha and gamma.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: Core monetary policy. Higher focus = more responsive CBRF.</p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">QE Management</div>
                <p className="text-terminal-foreground mt-1">
                  Execute quantitative easing or tightening. Works alongside the QE stance policy toggle.
                  Manages the money supply expansion/contraction that feeds into inflation.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: Money supply control. Easing boosts demand but risks inflation.</p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Inflation Targeting</div>
                <p className="text-terminal-foreground mt-1">
                  Focus purely on price stability. At focus 3+, directly reduces Phillips curve sensitivity,
                  effectively anchoring inflation expectations. This is the most powerful anti-inflation tool.
                </p>
                <p className="text-terminal-bright-black mt-1">
                  Impact: At focus 3+, inflation reduced by 5% per focus level. Strong inflation anchor.
                </p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Financial Stability</div>
                <p className="text-terminal-foreground mt-1">
                  Monitor and prevent financial crises. Reduces the probability and severity of
                  financial crisis random events.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: Defensive. Reduces crisis risk.</p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Forward Guidance <span className="text-terminal-yellow">(Focus 3 required)</span></div>
                <p className="text-terminal-foreground mt-1">
                  Commit to an interest rate path for coming quarters. Shapes expectations and reduces
                  volatility in financial markets.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: Expectation management. Smooths monetary policy transmission.</p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Engineer */}
      <div className="mt-4" id="engineer">
        <Panel title="4.3 ENGINEER - Development Minister">
          <div className="text-xs space-y-2 font-mono">
            <div className="text-terminal-yellow font-bold">Chief Engineer Chen</div>
            <p className="text-terminal-foreground">
              Oversees infrastructure, education, healthcare, and innovation.
              The engineer{"'"}s focus directly scales the effectiveness of development spending.
              At focus 2 (standard), effects are at 100%. At focus 4 (heroic), effects are at 170%.
            </p>

            <div className="space-y-2 mt-2">
              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Infrastructure Investment</div>
                <p className="text-terminal-foreground mt-1">
                  Build and maintain national infrastructure. Increases the infrastructure index
                  and boosts potential GDP. Infrastructure is a supply-side improvement that raises
                  the economy{"'"}s long-run capacity.
                </p>
                <p className="text-terminal-bright-black mt-1">
                  Impact: +0.5 * effectiveness to infrastructure index. +0.1% * effectiveness to potential GDP.
                  Compounds over time.
                </p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Education System</div>
                <p className="text-terminal-foreground mt-1">
                  Oversee education spending and outcomes. Increases the education index, which
                  contributes to quality of life (attracting migrants) and long-term productivity.
                </p>
                <p className="text-terminal-bright-black mt-1">
                  Impact: +0.5 * effectiveness to education index. Boosts QoL migration pull.
                </p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Healthcare System</div>
                <p className="text-terminal-foreground mt-1">
                  Manage healthcare and public health. Increases the healthcare index, which reduces
                  the death rate and contributes to quality of life.
                </p>
                <p className="text-terminal-bright-black mt-1">
                  Impact: +0.5 * effectiveness to healthcare index. Reduces death rate. Boosts QoL.
                </p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Productivity & Innovation</div>
                <p className="text-terminal-foreground mt-1">
                  Drive technological advancement. Focuses on total factor productivity growth,
                  which raises potential GDP without requiring more capital or labor.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: Long-term growth potential.</p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Green Transition <span className="text-terminal-yellow">(Focus 3 required)</span></div>
                <p className="text-terminal-foreground mt-1">
                  Transition to a sustainable economy. Long-term investment that may slow growth
                  initially but provides compounding benefits.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: Sustainability investment. Slow burn, long payoff.</p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Diplomat */}
      <div className="mt-4" id="diplomat">
        <Panel title="4.4 DIPLOMAT - Foreign Minister">
          <div className="text-xs space-y-2 font-mono">
            <div className="text-terminal-cyan font-bold">Ambassador Sophia</div>
            <p className="text-terminal-foreground">
              Conducts trade negotiations, immigration policy, and international cooperation.
              The diplomat{"'"}s focus scales the effectiveness of foreign policy actions.
              Immigration policy assignment provides a direct population bonus scaled by focus.
            </p>

            <div className="space-y-2 mt-2">
              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Trade Negotiations</div>
                <p className="text-terminal-foreground mt-1">
                  Manage trade agreements and relations. Improves the terms of trade and reduces
                  the retaliation penalty from tariffs imposed by other nations.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: Improves trade balance. Reduces tariff retaliation cost.</p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Immigration Policy</div>
                <p className="text-terminal-foreground mt-1">
                  Manage immigration flows and integration. Provides a direct population growth bonus
                  (scaled by focus effectiveness) on top of the migration system. Open immigration +
                  high diplomat focus = fastest population growth.
                </p>
                <p className="text-terminal-bright-black mt-1">
                  Impact: Direct population bonus. Open=2.5%, Moderate=1.0%, Restrictive=0% base rate, scaled by focus.
                </p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">International Aid <span className="text-terminal-yellow">(Focus 3 required)</span></div>
                <p className="text-terminal-foreground mt-1">
                  Offer aid to build alliances. Improves diplomatic standing and can reduce
                  trade friction with other nations.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: Soft power. Reduces friction in cross-country interactions.</p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Crisis Management</div>
                <p className="text-terminal-foreground mt-1">
                  Handle trade disputes and conflicts. Provides a defensive buffer against
                  trade wars and diplomatic incidents.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: Defensive. Mitigates trade conflict damage.</p>
              </div>

              <div className="border border-terminal-border p-2">
                <div className="text-terminal-cyan font-bold">Global Initiatives <span className="text-terminal-yellow">(Focus 4 required)</span></div>
                <p className="text-terminal-foreground mt-1">
                  Currency unions or coordinated stimulus. Heroic-level diplomatic action that can
                  reshape the international economic order.
                </p>
                <p className="text-terminal-bright-black mt-1">Impact: System-level change. Highest diplomatic impact.</p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Focus Points */}
      <div className="mt-4" id="focus">
        <Panel title="5. FOCUS POINTS">
          <div className="text-xs space-y-2 font-mono">
            <p className="text-terminal-foreground">
              You have <span className="text-terminal-yellow">10 focus points</span> to distribute across 4 ministers (max 4 each).
              Focus determines effectiveness:
            </p>
            <div className="border border-terminal-border p-2 space-y-1">
              <div><span className="text-terminal-yellow">0</span> - Autopilot <span className="text-terminal-bright-black">(50% effectiveness)</span></div>
              <div><span className="text-terminal-yellow">1</span> - Basic attention <span className="text-terminal-bright-black">(75% effectiveness)</span></div>
              <div><span className="text-terminal-yellow">2</span> - Standard <span className="text-terminal-bright-black">(100% effectiveness)</span></div>
              <div><span className="text-terminal-yellow">3</span> - Enhanced <span className="text-terminal-bright-black">(130% effectiveness)</span> - Unlocks some assignments</div>
              <div><span className="text-terminal-yellow">4</span> - Heroic <span className="text-terminal-bright-black">(170% effectiveness)</span> - Unlocks special abilities</div>
            </div>
            <p className="text-terminal-bright-black">
              Strategy: Concentrating focus on one minister (4) gives 170% but leaves others at lower effectiveness.
              Spreading evenly (2-3 each) gives balanced performance. The optimal allocation depends on your
              current economic situation and strategy.
            </p>
          </div>
        </Panel>
      </div>

      {/* Policies */}
      <div className="mt-4" id="policies">
        <Panel title="6. POLICY CONTROLS">
          <div className="text-xs space-y-2 font-mono">
            <div className="border border-terminal-border p-2">
              <div className="text-terminal-cyan font-bold">Interest Rate (-1% to 20%)</div>
              <p className="text-terminal-foreground">Set manually or via CBRF autopilot. Affects capital flows, exchange rate, aggregate demand, and debt servicing cost.</p>
            </div>
            <div className="border border-terminal-border p-2">
              <div className="text-terminal-cyan font-bold">Government Spending (Education / Healthcare / Infrastructure)</div>
              <p className="text-terminal-foreground">Fiscal stimulus that boosts GDP through the IS curve. Each category also improves its respective index. Total capped at 30% of GDP.</p>
            </div>
            <div className="border border-terminal-border p-2">
              <div className="text-terminal-cyan font-bold">Tax Rate (15% to 45%)</div>
              <p className="text-terminal-foreground">Revenue collection. Higher taxes reduce the fiscal deficit but don{"'"}t directly affect GDP growth in the model.</p>
            </div>
            <div className="border border-terminal-border p-2">
              <div className="text-terminal-cyan font-bold">Tariff Rate (0% to 25%)</div>
              <p className="text-terminal-foreground">Uniform tariff on imports. Reduces imports but triggers retaliation from the world average tariff rate.</p>
            </div>
            <div className="border border-terminal-border p-2">
              <div className="text-terminal-cyan font-bold">Immigration Policy (Restrictive / Moderate / Open)</div>
              <p className="text-terminal-foreground">Gates migration flows. Open allows full quality-of-life-driven migration, restrictive blocks 80%.</p>
            </div>
            <div className="border border-terminal-border p-2">
              <div className="text-terminal-cyan font-bold">QE Stance (Tightening / Neutral / Easing)</div>
              <p className="text-terminal-foreground">Controls money supply growth. Easing adds 3% per quarter, tightening removes 2%. Excess growth causes inflation.</p>
            </div>
            <div className="border border-terminal-border p-2">
              <div className="text-terminal-cyan font-bold">Capital Controls (Open / Moderate / Strict)</div>
              <p className="text-terminal-foreground">Dampens capital flow sensitivity. Strict blocks 90% of interest-rate-driven flows. Protects exchange rate but reduces investment.</p>
            </div>
          </div>
        </Panel>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-terminal-bright-black text-xs font-mono py-4">
        <Link href="/" className="text-terminal-cyan hover:text-terminal-green">[ESC] Back to Game</Link>
      </div>
    </div>
  )
}
