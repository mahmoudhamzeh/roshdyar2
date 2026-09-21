import React from 'react';

export const PLAY_SCENES = [
    { id: 'blocks', label: 'ساختنی و مکعب' },
    { id: 'face', label: 'چهره به چهره' },
    { id: 'book', label: 'کتاب و قصه' },
    { id: 'song', label: 'آواز و ریتم' },
    { id: 'tummy', label: 'زمان روی شکم' },
    { id: 'walk', label: 'حرکت و بازی آزاد' },
];

export const sceneForActivity = (activity) => {
    if (activity && activity.scene) return activity.scene;
    const text = `${(activity && activity.id) || ''} ${(activity && activity.title) || ''}`;
    if (/tummy|شکم/i.test(text)) return 'tummy';
    if (/song|آواز|صدا|لالایی/i.test(text)) return 'song';
    if (/book|کتاب|داستان|قصه/i.test(text)) return 'book';
    if (/face|چهره|لبخند/i.test(text)) return 'face';
    if (/walk|حرکت|توپ|دویدن/i.test(text)) return 'walk';
    return 'blocks';
};

const BlocksScene = () => (
    <svg viewBox="0 0 640 360" className="play-story-svg" role="img" aria-hidden="true">
        <rect width="640" height="360" rx="28" fill="#f8efe4" />
        <ellipse cx="318" cy="292" rx="210" ry="42" fill="#d8f3dc" />
        <rect x="78" y="168" width="18" height="92" rx="6" fill="#9ad0a6" />
        <ellipse cx="87" cy="168" rx="36" ry="22" fill="#7cbc8c" />
        <ellipse cx="87" cy="158" rx="22" ry="10" fill="#5ea572" />
        <circle cx="545" cy="248" r="28" fill="#e8b07a" />
        <circle cx="534" cy="236" r="8" fill="#c9844e" />
        <circle cx="556" cy="236" r="8" fill="#c9844e" />
        <ellipse cx="545" cy="258" rx="16" ry="10" fill="#dca06f" />
        <path d="M168 250c18-62 48-98 92-86 28 8 42 38 38 78" fill="#5bb8a4" />
        <path d="M214 214c22-8 48-4 62 18" fill="#3f9d8c" />
        <circle cx="248" cy="148" r="28" fill="#f3d1b8" />
        <path d="M214 150c8-38 64-42 78-8 4 18-8 28-22 30-18 4-42 2-56-22z" fill="#f4b8c9" />
        <path d="M226 142c18-6 48-4 58 10" fill="none" stroke="#e59aac" strokeWidth="10" strokeLinecap="round" />
        <rect x="232" y="176" width="78" height="86" rx="28" fill="#5bb8a4" />
        <rect x="214" y="198" width="28" height="54" rx="14" fill="#f3d1b8" />
        <rect x="298" y="206" width="28" height="46" rx="14" fill="#f3d1b8" />
        <rect x="248" y="248" width="22" height="36" rx="10" fill="#7a5a48" />
        <rect x="274" y="248" width="22" height="36" rx="10" fill="#7a5a48" />
        <rect x="268" y="208" width="22" height="22" rx="5" fill="#f4c14b" />
        <circle cx="236" cy="146" r="3.2" fill="#5b3a2e" />
        <circle cx="258" cy="146" r="3.2" fill="#5b3a2e" />
        <path d="M238 160c8 8 20 8 28 0" fill="none" stroke="#c56b5a" strokeWidth="3" strokeLinecap="round" />
        <circle cx="372" cy="176" r="26" fill="#f6d7be" />
        <path d="M348 168c6-18 48-16 52 6-8 10-22 14-34 12-10-1-18-8-18-18z" fill="#c9844e" />
        <rect x="348" y="198" width="56" height="62" rx="22" fill="#efe3c4" />
        <rect x="338" y="214" width="20" height="36" rx="10" fill="#f6d7be" />
        <rect x="392" y="214" width="20" height="36" rx="10" fill="#f6d7be" />
        <rect x="356" y="250" width="16" height="28" rx="8" fill="#7a5a48" />
        <rect x="376" y="250" width="16" height="28" rx="8" fill="#7a5a48" />
        <circle cx="362" cy="174" r="2.8" fill="#5b3a2e" />
        <circle cx="380" cy="174" r="2.8" fill="#5b3a2e" />
        <path d="M364 186c6 6 14 6 20 0" fill="none" stroke="#c56b5a" strokeWidth="2.6" strokeLinecap="round" />
        <rect x="292" y="236" width="28" height="28" rx="6" fill="#f26b6b" />
        <rect x="318" y="218" width="24" height="24" rx="6" fill="#f4c14b" />
        <rect x="308" y="242" width="22" height="22" rx="6" fill="#6db7f2" />
        <rect x="332" y="236" width="20" height="20" rx="5" fill="#8ed08a" />
        <rect x="300" y="258" width="18" height="18" rx="4" fill="#c9a0ff" />
        <path d="M430 118c8 0 12 10 8 16-8 2-16-4-14-12 2-4 4-4 6-4z" fill="#f4b8c9" />
        <path d="M452 132c8 0 12 10 8 16-8 2-16-4-14-12 2-4 4-4 6-4z" fill="#f4b8c9" />
    </svg>
);

const FaceScene = () => (
    <svg viewBox="0 0 640 360" className="play-story-svg" role="img" aria-hidden="true">
        <rect width="640" height="360" rx="28" fill="#eef8f4" />
        <ellipse cx="320" cy="300" rx="180" ry="28" fill="#d7efe4" />
        <circle cx="250" cy="168" r="54" fill="#f3d1b8" />
        <path d="M198 168c10-54 90-58 108-6-16 22-46 32-74 28-16-2-30-10-34-22z" fill="#f4b8c9" />
        <circle cx="390" cy="198" r="42" fill="#f6d7be" />
        <path d="M352 190c8-28 76-24 80 8-12 16-36 22-56 18-14-2-24-12-24-26z" fill="#c9844e" />
        <rect x="214" y="220" width="80" height="70" rx="24" fill="#5bb8a4" />
        <rect x="356" y="236" width="68" height="56" rx="22" fill="#efe3c4" />
    </svg>
);

const BookScene = () => (
    <svg viewBox="0 0 640 360" className="play-story-svg" role="img" aria-hidden="true">
        <rect width="640" height="360" rx="28" fill="#f7f1e8" />
        <ellipse cx="320" cy="300" rx="190" ry="30" fill="#e7f3d8" />
        <rect x="250" y="168" width="140" height="96" rx="12" fill="#f26b6b" />
        <rect x="258" y="176" width="58" height="80" rx="6" fill="#fff7ea" />
        <rect x="324" y="176" width="58" height="80" rx="6" fill="#fff7ea" />
        <circle cx="230" cy="150" r="34" fill="#f3d1b8" />
        <circle cx="410" cy="168" r="30" fill="#f6d7be" />
        <rect x="196" y="184" width="70" height="72" rx="22" fill="#5bb8a4" />
        <rect x="384" y="196" width="60" height="62" rx="20" fill="#efe3c4" />
    </svg>
);

const SongScene = () => (
    <svg viewBox="0 0 640 360" className="play-story-svg" role="img" aria-hidden="true">
        <rect width="640" height="360" rx="28" fill="#eef4fb" />
        <ellipse cx="320" cy="302" rx="180" ry="28" fill="#d9e7f8" />
        <circle cx="286" cy="168" r="36" fill="#f3d1b8" />
        <circle cx="372" cy="188" r="30" fill="#f6d7be" />
        <rect x="250" y="204" width="74" height="70" rx="24" fill="#5bb8a4" />
        <rect x="344" y="218" width="60" height="56" rx="20" fill="#efe3c4" />
        <path d="M430 120c20 8 28 36 12 52" fill="none" stroke="#6db7f2" strokeWidth="8" strokeLinecap="round" />
        <circle cx="442" cy="118" r="10" fill="#6db7f2" />
        <path d="M470 146c16 8 22 28 8 40" fill="none" stroke="#f4c14b" strokeWidth="7" strokeLinecap="round" />
        <circle cx="478" cy="144" r="8" fill="#f4c14b" />
    </svg>
);

const TummyScene = () => (
    <svg viewBox="0 0 640 360" className="play-story-svg" role="img" aria-hidden="true">
        <rect width="640" height="360" rx="28" fill="#f6efe6" />
        <rect x="120" y="230" width="400" height="48" rx="16" fill="#efe0cc" />
        <ellipse cx="320" cy="214" rx="86" ry="36" fill="#f6d7be" />
        <circle cx="402" cy="198" r="24" fill="#f6d7be" />
        <circle cx="220" cy="168" r="34" fill="#f3d1b8" />
        <rect x="186" y="198" width="70" height="70" rx="24" fill="#5bb8a4" />
        <circle cx="430" cy="168" r="16" fill="#8ed08a" />
    </svg>
);

const WalkScene = () => (
    <svg viewBox="0 0 640 360" className="play-story-svg" role="img" aria-hidden="true">
        <rect width="640" height="360" rx="28" fill="#eef8f1" />
        <ellipse cx="320" cy="300" rx="200" ry="32" fill="#d4efd8" />
        <circle cx="286" cy="150" r="28" fill="#f3d1b8" />
        <circle cx="366" cy="176" r="24" fill="#f6d7be" />
        <rect x="260" y="178" width="52" height="78" rx="20" fill="#5bb8a4" />
        <rect x="346" y="198" width="44" height="62" rx="18" fill="#efe3c4" />
        <circle cx="430" cy="250" r="22" fill="#f26b6b" />
        <circle cx="430" cy="250" r="12" fill="#fff" />
    </svg>
);

const SCENES = {
    blocks: BlocksScene,
    face: FaceScene,
    book: BookScene,
    song: SongScene,
    tummy: TummyScene,
    walk: WalkScene,
};

const PlayStoryArt = ({ scene = 'blocks', imageUrl, alt = '' }) => {
    if (imageUrl) {
        return <img className="play-story-photo" src={imageUrl} alt={alt} />;
    }
    const Scene = SCENES[scene] || BlocksScene;
    return <Scene />;
};

export default PlayStoryArt;
