import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { NewsCard } from './NewsCard';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="NewsVideo"
                component={Main}
                durationInFrames={1800} // Default 60s
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{
                    title: 'MESSI MAKES HISTORY',
                    subHeadline: 'Lionel Messi has just shattered another record in the world of professional soccer.',
                    slides: [
                        'Lionel Messi has once again proven why he is considered the greatest of all time.',
                        'The Argentine superstar delivered a masterclass performance that left fans speechless.',
                        'Records continue to fall as Messi leads his team to another monumental victory.'
                    ],
                    backgroundColor: '#000000',
                    backgroundImage: 'background.png',
                    durationInFrames: 1800,
                    focusPoint: { x: 'center', y: 'top' },
                    category: 'SPORTS'
                }}
                calculateMetadata={({ props }) => {
                    return {
                        durationInFrames: (props as any).durationInFrames || 1800
                    };
                }}
            />
            <Composition
                id="NewsCard"
                component={NewsCard}
                durationInFrames={1}
                fps={30}
                width={1080}
                height={1350} // 4:5 Aspect Ratio
                defaultProps={{
                    title: 'TOTTENHAM SACK MANAGER THOMAS FRANK',
                    subHeadline: 'Shocking turn of events in North London today.',
                    image: 'background_0.png',
                    category: 'BREAKING NEWS',
                    type: 'BREAKING',
                    quoteAuthor: '',
                    statValue: '',
                    statLabel: ''
                }}
            />
        </>
    );
};
