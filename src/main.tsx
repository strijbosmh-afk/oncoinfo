import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Patch removeChild to suppress known React DOM conflict with external scripts/extensions
// See: https://github.com/facebook/react/issues/11538
const originalRemoveChild = Node.prototype.removeChild;
Node.prototype.removeChild = function <T extends Node>(child: T): T {
  if (child.parentNode !== this) {
    // Silently return instead of throwing when the node was already removed
    // (common with Radix portals + browser extensions / preview infrastructure)
    return child;
  }
  return originalRemoveChild.call(this, child) as T;
};

createRoot(document.getElementById("root")!).render(<App />);
