import { createContext, useContext, createSignal, ParentProps } from "solid-js";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: () => Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>();

function getInitialTheme(): Theme {
  // Check localStorage first, then system preference
  if (typeof window === "undefined") return "light";

  const stored = localStorage.getItem("theme") as Theme | null;
  if (stored) return stored;

  // Check system preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider(props: ParentProps) {
  // Initialize theme immediately to avoid FOUC
  const initialTheme = getInitialTheme();
  const [theme, setThemeState] = createSignal<Theme>(initialTheme);

  // Set initial theme on document immediately
  if (typeof document !== "undefined") {
    const html = document.documentElement;
    if (initialTheme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    if (typeof document !== "undefined") {
      const html = document.documentElement;
      if (newTheme === "dark") {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme() === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
