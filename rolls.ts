export type RollMode = "none" | "edge" | "doubleEdge" | "bane" | "doubleBane";

export type Tier = 1 | 2 | 3;

export interface RollHistoryEntry {
	id: string;
	timestamp: number;
	kind: "power-roll" | "saving-throw";
	label: string | null;
	creatureLabel: string | null;
	formulaText: string;
	mode: RollMode | null;
	dieA: number;
	dieB: number | null;
	modifier: number | null;
	total: number;
	tier: Tier | null;
	success: boolean | null;
}

export interface PowerRollResult {
	dieA: number;
	dieB: number;
	total: number;
	tier: Tier;
}

export interface SavingThrowResult {
	die: number;
	success: boolean;
}

export function rollDie(): number {
	return Math.floor(Math.random() * 10) + 1;
}

function tierFor(total: number): Tier {
	if (total <= 11) return 1;
	if (total <= 16) return 2;
	return 3;
}

export function rollPowerRoll(modifier: number, mode: RollMode): PowerRollResult {
	const dieA = rollDie();
	const dieB = rollDie();

	let total: number;
	switch (mode) {
		case "edge":
			total = dieA + dieB + modifier + 2;
			break;
		case "bane":
			total = dieA + dieB + modifier - 2;
			break;
		default:
			total = dieA + dieB + modifier;
	}

	let tier = tierFor(total);
	if (mode === "doubleEdge") tier = Math.min(3, tier + 1) as Tier;
	if (mode === "doubleBane") tier = Math.max(1, tier - 1) as Tier;

	return { dieA, dieB, total, tier };
}

export function rollSavingThrow(): SavingThrowResult {
	const die = rollDie();
	return { die, success: die >= 6 };
}

export function tierLabel(tier: Tier): string {
	if (tier === 1) return "Tier 1: ≤11";
	if (tier === 2) return "Tier 2: 12-16";
	return "Tier 3: 17+";
}

export function modeLabel(mode: RollMode): string {
	switch (mode) {
		case "edge":
			return "Edge";
		case "doubleEdge":
			return "Double Edge";
		case "bane":
			return "Bane";
		case "doubleBane":
			return "Double Bane";
		default:
			return "";
	}
}

export function makeEntryId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
