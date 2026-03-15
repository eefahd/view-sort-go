import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from "react";
import { models } from "../../wailsjs/go/models";

type Profile = models.Profile;
type ImageInfo = models.ImageInfo;
type ImageCounts = models.ImageCounts;

interface AppState {
  page: "viewer" | "settings";
  workingDir: string;
  currentImage: ImageInfo | null;
  counts: ImageCounts;
  profiles: Profile[];
  activeProfileId: string;
  undoCount: number;
  toast: string | null;
  pendingLabels: string[];
  viewMode: "all" | "pending";
}

type Action =
  | { type: "SET_PAGE"; page: "viewer" | "settings" }
  | { type: "SET_WORKING_DIR"; dir: string }
  | { type: "SET_CURRENT_IMAGE"; image: ImageInfo | null }
  | { type: "SET_COUNTS"; counts: ImageCounts }
  | { type: "SET_PROFILES"; profiles: Profile[] }
  | { type: "SET_ACTIVE_PROFILE_ID"; id: string }
  | { type: "SET_UNDO_COUNT"; count: number }
  | { type: "SET_TOAST"; message: string | null }
  | {
      type: "REFRESH_STATE";
      image: ImageInfo | null;
      counts: ImageCounts;
      undoCount: number;
    }
  | { type: "TOGGLE_LABEL"; key: string }
  | { type: "CLEAR_LABELS" }
  | { type: "SET_VIEW_MODE"; mode: "all" | "pending" };

const initialState: AppState = {
  page: "viewer",
  workingDir: "",
  currentImage: null,
  counts: { remaining: 0, processed: 0 },
  profiles: [],
  activeProfileId: "",
  undoCount: 0,
  toast: null,
  pendingLabels: [],
  viewMode: "pending",
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_PAGE":
      return { ...state, page: action.page };
    case "SET_WORKING_DIR":
      return { ...state, workingDir: action.dir };
    case "SET_CURRENT_IMAGE":
      return { ...state, currentImage: action.image, pendingLabels: [] };
    case "SET_COUNTS":
      return { ...state, counts: action.counts };
    case "SET_PROFILES":
      return { ...state, profiles: action.profiles };
    case "SET_ACTIVE_PROFILE_ID":
      return { ...state, activeProfileId: action.id };
    case "SET_UNDO_COUNT":
      return { ...state, undoCount: action.count };
    case "SET_TOAST":
      return { ...state, toast: action.message };
    case "REFRESH_STATE":
      return {
        ...state,
        currentImage: action.image,
        counts: action.counts,
        undoCount: action.undoCount,
      };
    case "TOGGLE_LABEL": {
      const has = state.pendingLabels.includes(action.key);
      return {
        ...state,
        pendingLabels: has
          ? state.pendingLabels.filter((k) => k !== action.key)
          : [...state.pendingLabels, action.key],
      };
    }
    case "CLEAR_LABELS":
      return { ...state, pendingLabels: [] };
    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.mode };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  showToast: (message: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const showToast = useCallback(
    (message: string) => {
      dispatch({ type: "SET_TOAST", message });
      setTimeout(() => dispatch({ type: "SET_TOAST", message: null }), 2500);
    },
    [dispatch]
  );

  return (
    <AppContext.Provider value={{ state, dispatch, showToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
