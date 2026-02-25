export function GridOverlay() {
  return (
    <div className='fixed inset-0 pointer-events-none z-0' aria-hidden>
      <div className='absolute inset-0' style={{
        backgroundImage: 'linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div className='absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020c12]/40' />
    </div>
  );
}
