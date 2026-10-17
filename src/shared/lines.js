// Everything the duck (and the tray menu) says. `{n}` is replaced with an
// amount like "5 seconds", which the bubble highlights.

export const LINES = {
  name: 'Duck',
  seconds: n => `${n} ${n === 1 ? 'second' : 'seconds'}`,
  minutes: n => `${n} ${n === 1 ? 'minute' : 'minutes'}`,
  warn: ['You got {n} to leave this page.'],
  again: ['Back already? You got {n}.', 'Again?! {n}. Go.'],
  orElse: ['Or else.', 'Or else.', "Don't test me."],
  relief: ['Good choice.', "That's what I thought.", 'Smart human.', 'Your wallet thanks me.'],
  peckStart: ["Fine. I'll do it myself.", 'Ugh. Move over.'],
  peck: 'tap!',
  shot: ['Told you.', "You'll thank me later.", 'Problem solved.'],
  blank: ['That was a warning shot.', 'Next one is not a blank.'],
  demo: ['That was a drill. Next time it is real.'],
  hello: ["I'm watching your wallet."],
  quack: ['Quack.', 'Quack!', 'What.', "Don't touch me."],
  snooze: 'Fine. {n}. I am watching you.',
  snoozeForever: 'Fine. Until restart. Coward.',
  resume: 'Break is over. Back on duty.',
  menu: {
    demo: 'Show me what you do (demo)',
    pause: 'I really need to buy something',
    pause15: 'For 15 minutes',
    pause60: 'For 1 hour',
    pauseRestart: 'Until restart',
    resume: 'Resume watching',
    action: 'When time runs out',
    actionPeck: 'Fly up and peck the tab closed',
    actionShoot: 'Shoot and close the tab',
    actionNothing: 'Only threaten',
    countdown: 'Countdown',
    size: 'Duck size',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    sound: 'Sound',
    autostart: 'Start with system',
    extension: 'Browser extension (more accurate)...',
    settings: 'Open settings file',
    quit: 'Quit',
    paused: 'Paused',
    watching: 'Watching',
    saved: n => `Stupid buys stopped: ${n}`,
  },
  extension: {
    title: 'Browser extension',
    message: 'The duck sees the exact tab URL and closes the tab itself',
    detail: dir => `1. Open chrome://extensions (or edge://extensions)\n2. Turn on "Developer mode"\n3. Click "Load unpacked" and pick this folder:\n${dir}\n\nThe duck also works without it, using window titles.`,
  },
};

export function pick(list) {
  return Array.isArray(list) ? list[Math.floor(Math.random() * list.length)] : list;
}
