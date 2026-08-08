import { motion } from 'framer-motion';
import { Star, Users, ShoppingCart } from 'lucide-react';
import { Logo } from './Logo';

interface Props {
  onSignIn: () => void;
}

// The hero deliberately shows the collections home — the three SECTIONS below each
// own a screen, so reusing one of them here would show the same image twice.
const HERO_SHOT = {
  src: '/shots/home.webp',
  alt: 'The Soda Taster home screen listing four soda collections alongside an automatically written summary of the drinker’s palate.',
  w: 640, h: 1280,
};

const SECTIONS = [
  {
    icon: Star,
    kicker: 'Rate',
    title: 'Rate it once. Remember it forever.',
    body: 'Tap a star and it saves instantly. Add a tasting note while it is still in your mouth, and six months from now you will still know exactly why you loved it.',
    shot: '/shots/soda.webp',
    alt: 'A soda page in Soda Taster showing a 4.5 group average, a 5.0 personal rating, a tasting note and every member’s score.',
    w: 640, h: 1280, framed: true,
  },
  {
    icon: Users,
    kicker: 'Compare',
    title: 'Settle it as a group.',
    body: 'Share a collection with a link. Everyone rates the same bottle, the scores pool into one honest average, and the app quietly flags the ones you disagree about the most.',
    shot: '/shots/stash.webp',
    alt: 'A shared Soda Taster collection listing rated sodas with group scores, stock counts and a most-controversial flag.',
    w: 640, h: 1280, framed: true,
  },
  {
    icon: ShoppingCart,
    kicker: 'Restock',
    title: 'Never buy the wrong soda again.',
    body: 'Mark what is in the fridge as you drink it. Anything you rated four stars or better that you have run out of — or are down to the last bottle of — becomes a shopping list you can copy straight into your phone on the way to the store.',
    shot: '/shots/shop.webp',
    alt: 'The Soda Taster shopping list showing highly rated sodas that are out of stock, with quantity steppers and a copy button.',
    // A bottom sheet rather than a whole screen, so it gets a plain card instead of a phone bezel.
    w: 720, h: 729, framed: false,
  },
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function SignInButton({ onSignIn, className = '' }: { onSignIn: () => void; className?: string }) {
  return (
    <motion.button
      type="button"
      onClick={onSignIn}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white text-gray-900 font-sans text-sm font-semibold hover:bg-gray-100 transition-colors shadow-[0_4px_24px_-6px_rgba(255,61,120,0.55)] ${className}`}
    >
      <GoogleIcon />
      Continue with Google
    </motion.button>
  );
}

/** Screenshot in a phone bezel. The shopping-list shot is a sheet, so it gets a plain card. */
function Shot({ src, alt, w, h, framed, eager }: {
  src: string; alt: string; w: number; h: number; framed: boolean; eager?: boolean;
}) {
  const img = (
    <img
      src={src}
      alt={alt}
      width={w}
      height={h}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={framed ? 'w-full rounded-[1.6rem]' : 'w-full rounded-2xl'}
    />
  );
  return framed ? (
    <div className="rounded-[2rem] bg-gray-900 p-2 ring-1 ring-gray-800 shadow-[0_24px_70px_-20px_rgba(255,61,120,0.35)]">
      {img}
    </div>
  ) : (
    <div className="rounded-2xl ring-1 ring-gray-800 overflow-hidden shadow-[0_24px_70px_-20px_rgba(255,61,120,0.35)]">
      {img}
    </div>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
};

export function LandingPage({ onSignIn }: Props) {
  return (
    <div className="min-h-dvh bg-gray-950 text-gray-100 overflow-x-hidden">

      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between">
        <Logo size="sm" />
        <button
          type="button"
          onClick={onSignIn}
          className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
        >
          Sign in
        </button>
      </header>

      {/* Hero */}
      <section className="relative">
        {/* Ambient cherry glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full blur-3xl opacity-25"
          style={{ background: 'radial-gradient(circle, #ff3d78 0%, transparent 65%)' }}
        />
        <div className="relative max-w-6xl mx-auto px-6 pt-14 pb-8 lg:pt-24 lg:pb-20 grid lg:grid-cols-2 gap-14 lg:gap-10 items-center">
          <div className="text-center lg:text-left">
            <span className="inline-block font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-sky-400 mb-5">
              Free · No credit card
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-white leading-[1.08] mb-5">
              Never forget a good soda again.
            </h1>
            <p className="font-sans text-base text-gray-400 leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
              Rate what you drink, see what everyone else thought, and walk into the
              store knowing exactly which bottles are worth buying twice.
            </p>
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3 sm:justify-center lg:justify-start">
              <SignInButton onSignIn={onSignIn} className="w-full sm:w-auto" />
            </div>
            <p className="font-sans text-xs text-gray-600 mt-4">
              Takes about ten seconds. Your first soda can be the one in your hand.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
            className="mx-auto w-full max-w-[17rem] lg:max-w-[19rem]"
          >
            <Shot {...HERO_SHOT} framed eager />
          </motion.div>
        </div>
      </section>

      {/* Outcome sections */}
      <div className="max-w-6xl mx-auto px-6 pb-4">
        {SECTIONS.map(({ icon: Icon, kicker, title, body, shot, alt, w, h, framed }, i) => (
          <motion.section
            key={title}
            {...fadeUp}
            className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center py-14 lg:py-20 ${
              i > 0 ? 'border-t border-gray-800/70' : ''
            }`}
          >
            <div className={`text-center lg:text-left ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
              <span className="inline-flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-sky-400 mb-4">
                <Icon size={14} />
                {kicker}
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight mb-4">
                {title}
              </h2>
              <p className="font-sans text-sm sm:text-base text-gray-400 leading-relaxed max-w-md mx-auto lg:mx-0">
                {body}
              </p>
            </div>
            <div
              className={`mx-auto w-full ${framed ? 'max-w-[15rem] lg:max-w-[17rem]' : 'max-w-sm lg:max-w-md'} ${
                i % 2 === 1 ? 'lg:order-1' : ''
              }`}
            >
              <Shot src={shot} alt={alt} w={w} h={h} framed={framed} />
            </div>
          </motion.section>
        ))}
      </div>

      {/* Closing CTA */}
      <motion.section {...fadeUp} className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[36rem] h-[24rem] rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #ff3d78 0%, transparent 65%)' }}
        />
        <div className="relative max-w-md mx-auto px-6 py-20 text-center">
          <h2 className="font-display text-3xl font-bold text-white leading-tight mb-4">
            Start your collection.
          </h2>
          <p className="font-sans text-sm text-gray-400 leading-relaxed mb-8">
            Free, unlimited collections, and it installs to your home screen like an app.
          </p>
          <SignInButton onSignIn={onSignIn} className="w-full" />
          <p className="font-sans text-[11px] text-gray-600 mt-4 tracking-wide uppercase">
            Free · No credit card required
          </p>
        </div>
      </motion.section>

      <footer className="border-t border-gray-800/70">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Logo size="sm" />
          <p className="font-sans text-xs text-gray-600">Rate, track and share your soda collection.</p>
        </div>
      </footer>
    </div>
  );
}
