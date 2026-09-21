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
        <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fbf4ea" />
                <stop offset="1" stopColor="#f4e6d4" />
            </linearGradient>
        </defs>
        <rect width="640" height="360" rx="28" fill="url(#sky)" />
        <ellipse cx="320" cy="302" rx="228" ry="48" fill="#cfeecf" />
        <rect x="92" y="168" width="16" height="108" rx="6" fill="#86c896" />
        <ellipse cx="100" cy="170" rx="42" ry="26" fill="#7dbe8d" />
        <ellipse cx="86" cy="156" rx="22" ry="14" fill="#5fa572" />
        <ellipse cx="118" cy="160" rx="18" ry="12" fill="#6bb07c" />
        <circle cx="548" cy="252" r="32" fill="#e2a36d" />
        <ellipse cx="536" cy="238" rx="9" ry="10" fill="#c47d45" />
        <ellipse cx="560" cy="238" rx="9" ry="10" fill="#c47d45" />
        <ellipse cx="548" cy="266" rx="18" ry="11" fill="#d89055" />
        <circle cx="538" cy="250" r="4" fill="#5b3a2e" />
        <circle cx="558" cy="250" r="4" fill="#5b3a2e" />
        <path d="M200 258c12-78 58-118 108-92 22 12 38 42 32 86" fill="#4fb3a0" />
        <path d="M248 214c28-10 58 0 70 24" fill="#3b9a89" />
        <circle cx="262" cy="142" r="32" fill="#f4d0b6" />
        <path d="M224 148c10-46 78-50 92-8 2 20-16 34-36 36-22 2-48-6-56-28z" fill="#f3b7c8" />
        <path d="M232 138c22-10 62-8 74 14" fill="none" stroke="#e59aac" strokeWidth="12" strokeLinecap="round" />
        <rect x="236" y="172" width="92" height="96" rx="32" fill="#4fb3a0" />
        <rect x="218" y="198" width="30" height="58" rx="15" fill="#f4d0b6" />
        <rect x="312" y="206" width="30" height="50" rx="15" fill="#f4d0b6" />
        <rect x="254" y="250" width="24" height="40" rx="10" fill="#7a5340" />
        <rect x="284" y="250" width="24" height="40" rx="10" fill="#7a5340" />
        <rect x="278" y="204" width="24" height="24" rx="6" fill="#f4c14b" />
        <circle cx="250" cy="140" r="3.4" fill="#5b3a2e" />
        <circle cx="274" cy="140" r="3.4" fill="#5b3a2e" />
        <path d="M252 156c8 9 22 9 32 0" fill="none" stroke="#c56b5a" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="384" cy="170" r="28" fill="#f7d7bc" />
        <path d="M358 164c8-22 56-20 60 8-8 12-24 16-38 14-12-2-22-10-22-22z" fill="#c9844e" />
        <rect x="356" y="194" width="64" height="70" rx="24" fill="#efe4c6" />
        <rect x="344" y="210" width="22" height="40" rx="11" fill="#f7d7bc" />
        <rect x="408" y="210" width="22" height="40" rx="11" fill="#f7d7bc" />
        <rect x="366" y="250" width="18" height="32" rx="8" fill="#7a5340" />
        <rect x="388" y="250" width="18" height="32" rx="8" fill="#7a5340" />
        <circle cx="374" cy="168" r="3" fill="#5b3a2e" />
        <circle cx="394" cy="168" r="3" fill="#5b3a2e" />
        <path d="M376 182c6 6 16 6 22 0" fill="none" stroke="#c56b5a" strokeWidth="2.8" strokeLinecap="round" />
        <rect x="300" y="236" width="30" height="30" rx="6" fill="#ef6b6b" />
        <rect x="326" y="216" width="26" height="26" rx="6" fill="#f4c14b" />
        <rect x="318" y="244" width="24" height="24" rx="6" fill="#6db7f2" />
        <rect x="344" y="236" width="22" height="22" rx="5" fill="#8ed08a" />
        <rect x="308" y="262" width="20" height="20" rx="4" fill="#c9a0ff" />
        <path d="M438 112c10 0 14 12 8 18-10 2-18-6-16-14 1-3 4-4 8-4z" fill="#f4b8c9" />
        <path d="M462 128c10 0 14 12 8 18-10 2-18-6-16-14 1-3 4-4 8-4z" fill="#f4b8c9" />
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
