export function Spinner({ small = false }: { small?: boolean }) {
  return <span className={small ? "spinner spinner--small" : "spinner"} />;
}
