export function CinematicBackdrop() {
  return (
    <div className="cinematic-backdrop" aria-hidden="true">
      <div className="cinematic-backdrop__aura cinematic-backdrop__aura--amber" />
      <div className="cinematic-backdrop__aura cinematic-backdrop__aura--cyan" />
      <div className="cinematic-backdrop__aura cinematic-backdrop__aura--violet" />
      <div className="cinematic-backdrop__storyboard" />
      <div className="cinematic-backdrop__scan" />
      <div className="cinematic-backdrop__grain" />
      <div className="cinematic-backdrop__vignette" />
    </div>
  )
}
