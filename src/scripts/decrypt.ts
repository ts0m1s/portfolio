// Your name in the sidebar starts scrambled and resolves left to right. Plays once per visit.

const GLYPHS = '!<>-_/[]{}=+*^?#$%&0123456789';
const DURATION = 1100;
const FRAME = 45;
const FONT_WAIT = 800;

const root = document.documentElement;

const hasPlayed = () => {
  try {
    return sessionStorage.getItem('decrypted') === '1';
  } catch {
    return true;
  }
};

const random = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/**
 * The name is in a proportional font, so a scrambled letter would change its width and the
 * whole name would jitter or re-wrap. Give each letter a box fixed to the real letter's width.
 */
const splitIntoLetters = (name: HTMLElement, text: string) => {
  const range = document.createRange();
  const node = name.firstChild as Text;
  const widths = [...text].map((_, i) => {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    return range.getBoundingClientRect().width;
  });

  name.textContent = '';
  let word: HTMLElement | undefined;
  return [...text].map((char, i) => {
    if (char === ' ') {
      name.append(' ');
      word = undefined;
      return undefined;
    }
    // Letters are grouped by word, or the name could wrap in the middle of one.
    if (!word) {
      word = document.createElement('span');
      word.className = 'decrypt-word';
      name.append(word);
    }
    const letter = document.createElement('span');
    letter.className = 'decrypt-letter';
    letter.style.width = `${widths[i]}px`;
    letter.textContent = random();
    word.append(letter);
    return letter;
  });
};

const decrypt = (name: HTMLElement) => {
  const text = name.textContent ?? '';
  // Screen readers get the real name, not the scramble.
  name.setAttribute('aria-label', text);
  const letters = splitIntoLetters(name, text);

  const start = performance.now();
  let last = 0;

  const frame = (now: number) => {
    const progress = (now - start) / DURATION;

    if (now - last >= FRAME) {
      last = now;
      letters.forEach((letter, i) => {
        if (letter) letter.textContent = i / text.length < progress ? text[i] : random();
      });
    }

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      name.textContent = text;
      name.removeAttribute('aria-label');
    }
  };

  requestAnimationFrame(frame);
};

document.addEventListener(
  'astro:page-load',
  async () => {
    if (root.classList.contains('decrypt') && !hasPlayed()) {
      // Measure letters in the real font, not the fallback.
      await Promise.race([document.fonts.ready, new Promise((done) => setTimeout(done, FONT_WAIT))]);

      // Only the visible name: the sidebar on desktop, the top bar on phones.
      const names = [...document.querySelectorAll<HTMLElement>('.site-name')].filter((el) => el.offsetParent);
      names.forEach(decrypt);

      try {
        sessionStorage.setItem('decrypted', '1');
      } catch {}
    }
    root.classList.remove('decrypt');
  },
  { once: true },
);
