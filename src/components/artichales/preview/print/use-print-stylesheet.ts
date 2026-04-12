import * as React from "react";

export function usePrintStylesheet(cssText: string, key: string): void {
	React.useEffect(() => {
		const styleElement = globalThis.document.createElement("style");
		styleElement.setAttribute("data-art-print-stylesheet", key);
		styleElement.textContent = cssText;
		globalThis.document.head.appendChild(styleElement);
		return () => {
			styleElement.remove();
		};
	}, [cssText, key]);
}
