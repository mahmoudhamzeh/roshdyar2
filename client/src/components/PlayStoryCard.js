import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import PlayStoryArt, { sceneForActivity } from './PlayStoryArt';
import './PlayStoryCard.css';

const PlayStoryCard = ({
    activity,
    onComplete,
    onClose,
    busy = false,
    showClose = true,
}) => {
    if (!activity) return null;
    const steps = activity.instructions || [];
    const scene = sceneForActivity(activity);

    return (
        <article className={`play-story-card${activity.completed ? ' is-done' : ''}`}>
            <div className="play-story-art-wrap">
                <PlayStoryArt scene={scene} imageUrl={activity.imageUrl} alt={activity.title} />
            </div>
            <h3>{activity.title}</h3>
            {activity.duration != null && activity.duration !== '' && (
                <span className="play-story-mins">{activity.duration} دقیقه</span>
            )}
            {activity.goal && <p className="play-story-goal">{activity.goal}</p>}
            <ol className="play-story-steps">
                {steps.map((step, index) => (
                    <li key={`${index}-${step}`}>
                        <span>{index + 1}. {step}</span>
                        <i aria-hidden="true"><FontAwesomeIcon icon={faCheck} /></i>
                    </li>
                ))}
            </ol>
            <div className={`play-story-actions${showClose && onClose ? '' : ' is-single'}`}>
                {showClose && onClose && (
                    <button type="button" className="play-story-close" onClick={onClose}>بستن</button>
                )}
                {onComplete && (
                    <button
                        type="button"
                        className="play-story-done"
                        disabled={busy || activity.completed}
                        onClick={() => onComplete(activity)}
                    >
                        انجام شد <FontAwesomeIcon icon={faCheck} />
                    </button>
                )}
            </div>
        </article>
    );
};

export default PlayStoryCard;
