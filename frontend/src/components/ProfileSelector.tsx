import { useAppContext } from "../context/AppContext";
import { SetActiveProfile } from "../../wailsjs/go/main/App";

export function ProfileSelector() {
  const { state, dispatch, showToast } = useAppContext();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    try {
      await SetActiveProfile(id);
      dispatch({ type: "SET_ACTIVE_PROFILE_ID", id });
    } catch (err: any) {
      showToast(err?.toString() || "Failed to switch profile");
    }
  };

  if (state.profiles.length === 0) {
    return <span className="muted">No profiles</span>;
  }

  return (
    <select
      className="profile-select"
      value={state.activeProfileId}
      onChange={handleChange}
    >
      {state.profiles.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
