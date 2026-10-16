// Everything the duck (and the tray menu) says. `{n}` is replaced with an
// amount like "5 seconds", which the bubble highlights.

const ruPlural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export const LINES = {
  en: {
    name: 'Duck',
    seconds: n => `${n} ${n === 1 ? 'second' : 'seconds'}`,
    minutes: n => `${n} ${n === 1 ? 'minute' : 'minutes'}`,
    warn: ['You got {n} to leave this page.'],
    again: ['Back already? You got {n}.', 'Again?! {n}. Go.'],
    orElse: ['Or else.', 'Or else.', "Don't test me."],
    relief: ['Good choice.', "That's what I thought.", 'Smart human.', 'Your wallet thanks me.'],
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
      actionClose: 'Close the tab',
      actionNothing: 'Only threaten',
      countdown: 'Countdown',
      size: 'Duck size',
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      sound: 'Sound',
      language: 'Language',
      autostart: 'Start with system',
      extension: 'Browser extension (more accurate)...',
      settings: 'Open settings file',
      quit: 'Quit',
      paused: 'Paused',
      watching: 'Watching',
      saved: n => `Stupid buys stopped: ${n}`,
    },
  },
  ru: {
    name: 'Утка',
    seconds: n => `${n} ${ruPlural(n, 'секунда', 'секунды', 'секунд')}`,
    minutes: n => `${n} ${ruPlural(n, 'минута', 'минуты', 'минут')}`,
    warn: ['У тебя {n}, чтобы свалить с этой страницы.', 'У тебя {n}, чтобы закрыть эту страницу.'],
    again: ['Опять?! У тебя {n}.', 'Серьёзно? Снова? {n}.'],
    orElse: ['Иначе пожалеешь.', 'А то хуже будет.', 'Не испытывай меня.'],
    relief: ['Правильный выбор.', 'Так-то лучше.', 'Умница. Деньги целее.', 'Кошелёк тебе спасибо скажет.'],
    shot: ['Я предупреждала.', 'Потом спасибо скажешь.', 'Проблема решена.'],
    blank: ['Это был предупредительный.', 'Следующий будет не холостой.'],
    demo: ['Это были учения. В следующий раз всё по-настоящему.'],
    hello: ['Слежу за твоим кошельком.'],
    quack: ['Кря.', 'Кря!', 'Чего?', 'Руки убрал.'],
    snooze: 'Ладно. {n}. Я слежу.',
    snoozeForever: 'Ладно. До перезапуска. Слабак.',
    resume: 'Перерыв окончен. Я снова на посту.',
    menu: {
      demo: 'Покажи, что ты умеешь (демо)',
      pause: 'Мне правда надо кое-что купить',
      pause15: 'На 15 минут',
      pause60: 'На 1 час',
      pauseRestart: 'До перезапуска',
      resume: 'Снова следить',
      action: 'Когда время вышло',
      actionClose: 'Закрыть вкладку',
      actionNothing: 'Только угрожать',
      countdown: 'Отсчёт',
      size: 'Размер утки',
      small: 'Маленькая',
      medium: 'Средняя',
      large: 'Большая',
      sound: 'Звук',
      language: 'Язык',
      autostart: 'Запускать вместе с системой',
      extension: 'Расширение для браузера (точнее)...',
      settings: 'Открыть файл настроек',
      quit: 'Выход',
      paused: 'На паузе',
      watching: 'Слежу',
      saved: n => `Тупых покупок предотвращено: ${n}`,
    },
  },
};

export function pick(list) {
  return Array.isArray(list) ? list[Math.floor(Math.random() * list.length)] : list;
}
