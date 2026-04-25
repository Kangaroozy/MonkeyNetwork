export const PLAYER_MODAL_EVENT = "monkeynetwork:open-player-modal";

export function openPlayerModal(username: string) {
  if (!username) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<{ username: string }>(PLAYER_MODAL_EVENT, {
      detail: { username },
    }),
  );
}
