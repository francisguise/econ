'use client'

import { Panel } from '@/components/tui/Panel'
import { PolicyChoices } from '@/lib/types/game'

interface PolicyPanelProps {
  policies: PolicyChoices
  onChange: (policies: PolicyChoices) => void
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group">
      {children}
      <span className="pointer-events-none absolute left-0 top-full mt-1 z-50 hidden group-hover:block w-56 px-2 py-1 text-xs text-terminal-foreground bg-terminal-background border border-terminal-cyan whitespace-normal leading-tight">
        {text}
      </span>
    </span>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  tooltip,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  tooltip?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      {tooltip ? (
        <Tooltip text={tooltip}>
          <span className="text-terminal-cyan w-32 text-xs cursor-help border-b border-dotted border-terminal-bright-black">{label}:</span>
        </Tooltip>
      ) : (
        <span className="text-terminal-cyan w-32 text-xs">{label}:</span>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-terminal-green h-1"
      />
      <span className="text-terminal-yellow w-16 text-right text-xs">{value}{unit}</span>
    </div>
  )
}

function LabelWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Tooltip text={tooltip}>
      <span className="text-terminal-cyan w-32 text-xs cursor-help border-b border-dotted border-terminal-bright-black">{label}:</span>
    </Tooltip>
  )
}

export function PolicyPanel({ policies, onChange }: PolicyPanelProps) {
  function update(partial: Partial<PolicyChoices>) {
    onChange({ ...policies, ...partial })
  }

  return (
    <Panel title="POLICY CONTROLS">
      <div className="font-mono text-xs space-y-3">
        {/* Interest Rate */}
        <div>
          <Slider
            label="Interest Rate"
            tooltip="Affects capital flows, exchange rate, aggregate demand, and debt servicing. Higher rates attract foreign capital but slow domestic growth."
            value={policies.interestRate}
            min={-1}
            max={20}
            step={0.5}
            unit="%"
            onChange={v => update({ interestRate: v })}
          />
          <div className="flex items-center gap-2 mt-1 ml-32">
            <label className="flex items-center gap-1 text-terminal-bright-black">
              <input
                type="checkbox"
                checked={policies.cbrfAutopilot}
                onChange={e => update({ cbrfAutopilot: e.target.checked })}
                className="accent-terminal-green"
              />
              <Tooltip text="Central Bank Reaction Function. Auto-sets interest rate using a Taylor Rule: responds to inflation gaps and output gaps. Effectiveness scales with Mage focus.">
                <span className="cursor-help border-b border-dotted border-terminal-bright-black">CBRF Autopilot</span>
              </Tooltip>
            </label>
          </div>
        </div>

        {/* Government Spending */}
        <div className="border-t border-terminal-border pt-2">
          <Tooltip text="Fiscal stimulus that boosts GDP through aggregate demand. Each category also improves its index. Total capped at 30% of GDP.">
            <span className="text-terminal-cyan mb-1 cursor-help border-b border-dotted border-terminal-bright-black">Government Spending:</span>
          </Tooltip>
          <div className="mt-1">
            <Slider
              label="Education"
              tooltip="Raises education index, improving quality of life and attracting migrants. Long-term human capital investment."
              value={policies.govSpendingEducation}
              min={0}
              max={10}
              step={0.5}
              unit="% GDP"
              onChange={v => update({ govSpendingEducation: v })}
            />
            <Slider
              label="Healthcare"
              tooltip="Raises healthcare index, reducing death rate and improving quality of life. Directly lowers population decline."
              value={policies.govSpendingHealthcare}
              min={0}
              max={15}
              step={0.5}
              unit="% GDP"
              onChange={v => update({ govSpendingHealthcare: v })}
            />
            <Slider
              label="Infrastructure"
              tooltip="Raises infrastructure index and boosts potential GDP. Supply-side improvement that raises long-run economic capacity."
              value={policies.govSpendingInfrastructure}
              min={0}
              max={10}
              step={0.5}
              unit="% GDP"
              onChange={v => update({ govSpendingInfrastructure: v })}
            />
          </div>
        </div>

        {/* Tax Rate */}
        <Slider
          label="Tax Rate"
          tooltip="Revenue collection. Higher taxes reduce the fiscal deficit and slow debt accumulation. Balances against government spending."
          value={policies.taxRate}
          min={15}
          max={45}
          step={1}
          unit="%"
          onChange={v => update({ taxRate: v })}
        />

        {/* Tariff Rate */}
        <Slider
          label="Tariff Rate"
          tooltip="Uniform tariff on imports. Reduces imports but triggers retaliation from other nations (world avg tariff penalizes your exports). Trade-off between protection and export competitiveness."
          value={policies.tariffRate}
          min={0}
          max={25}
          step={1}
          unit="%"
          onChange={v => update({ tariffRate: v })}
        />

        {/* Immigration */}
        <div className="flex items-center gap-2">
          <LabelWithTooltip
            label="Immigration"
            tooltip="Gates migration flows driven by quality-of-life differentials. Open allows full migration, moderate blocks 40%, restrictive blocks 80%. Higher QoL relative to world average attracts people."
          />
          <select
            value={policies.immigrationPolicy}
            onChange={e => update({ immigrationPolicy: e.target.value as PolicyChoices['immigrationPolicy'] })}
            className="bg-terminal-background border border-terminal-border text-terminal-foreground px-2 py-1 text-xs"
          >
            <option value="restrictive">Restrictive</option>
            <option value="moderate">Moderate</option>
            <option value="open">Open</option>
          </select>
        </div>

        {/* QE Stance */}
        <div className="flex items-center gap-2">
          <LabelWithTooltip
            label="QE Stance"
            tooltip="Controls money supply growth. Easing adds +3%/quarter, tightening removes -2%/quarter. Excess money growth above GDP growth causes inflation via the Phillips Curve."
          />
          <div className="flex gap-1">
            {(['tightening', 'neutral', 'easing'] as const).map(stance => (
              <button
                key={stance}
                onClick={() => update({ qeStance: stance })}
                title={
                  stance === 'tightening' ? 'Shrink money supply (-2%/qtr). Fights inflation but may slow growth.' :
                  stance === 'neutral' ? 'No change to money supply. Steady state.' :
                  'Expand money supply (+3%/qtr). Stimulates demand but risks inflation.'
                }
                className={`px-2 py-1 text-xs border ${
                  policies.qeStance === stance
                    ? 'border-terminal-green text-terminal-green'
                    : 'border-terminal-border text-terminal-bright-black'
                }`}
              >
                {stance}
              </button>
            ))}
          </div>
        </div>

        {/* Capital Controls */}
        <div className="flex items-center gap-2">
          <LabelWithTooltip
            label="Capital Controls"
            tooltip="Dampens capital flow sensitivity to interest rate differentials. Open: full exposure. Moderate: blocks 60%. Strict: blocks 90%. Protects exchange rate but reduces foreign investment."
          />
          <select
            value={policies.capitalControls}
            onChange={e => update({ capitalControls: e.target.value as PolicyChoices['capitalControls'] })}
            className="bg-terminal-background border border-terminal-border text-terminal-foreground px-2 py-1 text-xs"
          >
            <option value="open">Open</option>
            <option value="moderate">Moderate</option>
            <option value="strict">Strict</option>
          </select>
        </div>
      </div>
    </Panel>
  )
}
