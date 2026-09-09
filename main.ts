import { MarkdownPostProcessorContext, Notice, Plugin } from "obsidian";

const POWER_ROLL_PATTERN = /Power Roll\s*\+\s*(-?\d+)/gi;
const SKIP_PARENT_SELECTOR =
	"code, pre, a, button, input, textarea, select, .power-roll-inline";

function rollDie(): number {
	return Math.floor(Math.random() * 10) + 1;
}

function tierFor(total: number): string {
	if (total <= 11) return "Tier 1: ≤11";
	if (total <= 16) return "Tier 2: 12-16";
	return "Tier 3: 17+";
}

function handleRoll(span: HTMLElement) {
	const modifier = Number(span.dataset.modifier);
	const dieA = rollDie();
	const dieB = rollDie();
	const total = dieA + dieB + modifier;
	const sign = modifier >= 0 ? "+" : "";
	new Notice(
		`${span.textContent} → 🎲 ${dieA} + ${dieB} ${sign}${modifier} = ${total} (${tierFor(total)})`,
		6000
	);
}

function processNode(root: HTMLElement) {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode: (node) => {
			const parent = node.parentElement;
			if (!parent) return NodeFilter.FILTER_REJECT;
			if (parent.closest(SKIP_PARENT_SELECTOR)) {
				return NodeFilter.FILTER_REJECT;
			}
			return NodeFilter.FILTER_ACCEPT;
		},
	});

	const targets: Text[] = [];
	let current: Node | null;
	while ((current = walker.nextNode())) {
		const text = current.textContent ?? "";
		POWER_ROLL_PATTERN.lastIndex = 0;
		if (POWER_ROLL_PATTERN.test(text)) {
			targets.push(current as Text);
		}
	}

	for (const textNode of targets) {
		splitAndWrap(textNode);
	}
}

function splitAndWrap(textNode: Text) {
	const text = textNode.textContent ?? "";
	POWER_ROLL_PATTERN.lastIndex = 0;

	const fragment = document.createDocumentFragment();
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = POWER_ROLL_PATTERN.exec(text))) {
		const [fullMatch, modifier] = match;
		const start = match.index;

		if (start > lastIndex) {
			fragment.appendChild(
				document.createTextNode(text.slice(lastIndex, start))
			);
		}

		const span = document.createElement("span");
		span.addClass("power-roll-inline");
		span.setAttr("role", "button");
		span.setAttr("tabindex", "0");
		span.setAttr("aria-label", `Roll ${fullMatch}`);
		span.dataset.modifier = modifier;
		span.setText(fullMatch);
		span.addEventListener("click", () => handleRoll(span));
		span.addEventListener("keydown", (evt: KeyboardEvent) => {
			if (evt.key === "Enter" || evt.key === " ") {
				evt.preventDefault();
				handleRoll(span);
			}
		});
		fragment.appendChild(span);

		lastIndex = start + fullMatch.length;
	}

	if (lastIndex < text.length) {
		fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
	}

	textNode.replaceWith(fragment);
}

export default class PowerRollDetectorPlugin extends Plugin {
	async onload() {
		this.registerMarkdownPostProcessor(
			(el: HTMLElement, _ctx: MarkdownPostProcessorContext) => {
				processNode(el);
			}
		);
	}
}
