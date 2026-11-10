// Inject a lightweight launcher into the existing FreeVoice home screen.
const installLauncher = () => {
  const header = document.querySelector('.app > header');
  if (!header || header.querySelector('[data-motion-launcher]')) return;
  const link = document.createElement('a');
  link.dataset.motionLauncher = 'true';
  link.href = './motion.html';
  link.textContent = 'Motion Studio ↗';
  link.setAttribute('aria-label', 'Open FreeVoice Motion Graphics Studio');
  Object.assign(link.style, {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    marginLeft: 'auto', marginRight: '10px', padding: '9px 12px',
    border: '1px solid #315b80', borderRadius: '9px',
    background: 'linear-gradient(110deg,#214f83,#12677a)',
    color: '#effaff', font: '600 11px system-ui', textDecoration: 'none',
    whiteSpace: 'nowrap'
  });
  const status = header.querySelector('.live');
  if (status) header.insertBefore(link, status);
  else header.appendChild(link);
};
const observer = new MutationObserver(installLauncher);
observer.observe(document.documentElement, { childList: true, subtree: true });
installLauncher();
