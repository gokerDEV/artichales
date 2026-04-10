import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";

export const getBaseExtensions = () => [
	basicSetup,
	history(),
	keymap.of([...defaultKeymap, ...historyKeymap]),
	EditorView.lineWrapping,
];
