import React from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, spring, Audio, staticFile, Img, Sequence } from 'remotion';

export interface MainProps {
    title: string;
    subHeadline: string;
    slides: string[];
    category?: string;
    backgroundColor?: string;
    backgroundImage: string;
    focusPoint?: { x: 'left' | 'center' | 'right', y: 'top' | 'center' | 'bottom' };
    durationInFrames: number;
    hasMusic?: boolean;
}

export const Main: React.FC<MainProps> = ({
    title,
    subHeadline,
    slides = [],
    category = 'NATIONAL',
    backgroundColor = '#000000',
    backgroundImage = 'background.png',
    focusPoint = { x: 'center', y: 'top' }, // Default to top for faces
    durationInFrames,
    hasMusic
}) => {
    const { fps, height, width } = useVideoConfig();
    const frame = useCurrentFrame();

    // Background Movement Logic
    const moveType = title.length % 3;

    let scale = 1.1;
    let transX = 0;
    let transY = 0;

    if (moveType === 0) {
        scale = interpolate(frame, [0, durationInFrames], [1.1, 1.4]);
    } else if (moveType === 1) {
        scale = 1.25;
        transX = interpolate(frame, [0, durationInFrames], [-80, 80]); // Reduced drift to keep subject in view
    } else {
        scale = interpolate(frame, [0, durationInFrames], [1.3, 1.1]);
        transX = interpolate(frame, [0, durationInFrames], [80, -80]);
    }

    // Dynamic Focus Logic
    const focusMapX: Record<string, string> = {
        'left': '25%',
        'center': '50%',
        'right': '75%'
    };

    const focusMapY: Record<string, string> = {
        'top': '20%',
        'center': '50%',
        'bottom': '80%'
    };

    const posX = focusMapX[focusPoint.x] || '50%';
    const posY = focusMapY[focusPoint.y] || '20%';

    // Safe Zones
    const safeZoneBottom = 280;
    const safeZoneTop = 150;

    // Slide Logic - First slide is 7 seconds, rest are 5 seconds
    const firstSlideDuration = fps * 7; // 7 seconds for first slide (people read title + description first)
    const regularSlideDuration = fps * 5; // 5 seconds for other slides

    let currentSlideIndex = 0;
    let elapsedFrames = frame;

    // Calculate which slide we're on
    if (elapsedFrames < firstSlideDuration) {
        currentSlideIndex = 0;
    } else {
        elapsedFrames -= firstSlideDuration;
        currentSlideIndex = Math.min(
            1 + Math.floor(elapsedFrames / regularSlideDuration),
            slides.length - 1
        );
    }

    const currentSlideText = slides[currentSlideIndex];

    // Slide Animation (Drop into place)
    const slideFrame = currentSlideIndex === 0
        ? frame
        : frame - firstSlideDuration - ((currentSlideIndex - 1) * regularSlideDuration);

    const slideEntry = spring({
        frame: slideFrame,
        fps,
        config: { stiffness: 100, damping: 15 }
    });

    const currentSlideDuration = currentSlideIndex === 0 ? firstSlideDuration : regularSlideDuration;

    const slideExit = currentSlideIndex === slides.length - 1
        ? 1 // Last slide doesn't exit
        : interpolate(
            slideFrame,
            [currentSlideDuration - 10, currentSlideDuration],
            [1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

    const slideY = interpolate(slideEntry, [0, 1], [-100, 0]);
    const slideScale = interpolate(slideEntry, [0, 1], [0.8, 1]);
    const slideOpacity = slideEntry * slideExit;

    // Ending Sequence Reveal
    const isEnding = frame > durationInFrames - (fps * 2.5);
    const opacityEnding = spring({
        frame: frame - (durationInFrames - fps * 2.5),
        fps,
        config: { damping: 20 }
    });

    return (
        <AbsoluteFill style={{ backgroundColor, color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>

            {hasMusic && (
                <Audio
                    src={staticFile('music.mp3')}
                    volume={isEnding ? 0.5 : 0.3}
                />
            )}

            {/* Background Layer (SMART FOCUS ENABLED) */}
            <AbsoluteFill style={{ overflow: 'hidden' }}>
                <Img
                    src={staticFile(backgroundImage)}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: `${posX} ${posY}`,
                        filter: 'brightness(0.35) saturate(1.2) blur(1px)',
                        transform: `scale(${scale}) translate(${transX}px, ${transY}px)`
                    }}
                />

                {/* Newsroom Tint Overlay */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(239, 68, 68, 0.1) 100%)',
                    pointerEvents: 'none'
                }} />
            </AbsoluteFill>

            {/* Pro Header Section */}
            {!isEnding && (
                <div style={{
                    position: 'absolute',
                    top: safeZoneTop,
                    left: 55,
                    right: 55,
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
                        <div style={{
                            backgroundColor: '#a3e635',
                            padding: '10px 25px',
                            fontSize: 34,
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: 2,
                            color: '#000'
                        }}>
                            BREAKING
                        </div>
                        <div style={{
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            padding: '10px 25px',
                            fontSize: 34,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            border: '1px solid #a3e635'
                        }}>
                            {category}
                        </div>
                    </div>

                    <h1 style={{
                        fontSize: 64,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        lineHeight: 0.95,
                        margin: 0,
                        textShadow: '0 6px 30px rgba(0,0,0,1)',
                        color: '#fff',
                        borderLeft: '18px solid #a3e635',
                        paddingLeft: 30
                    }}>
                        {title}
                    </h1>

                    <div style={{
                        fontSize: 38,
                        fontWeight: 700,
                        marginTop: 20,
                        color: '#fff',
                        lineHeight: 1.1,
                        textShadow: '0 2px 10px rgba(0,0,0,1)',
                        maxWidth: '92%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        padding: '5px 15px',
                        display: 'inline-block'
                    }}>
                        {subHeadline}
                    </div>
                </div>
            )}

            {/* Full Block Content Slides (The part the user liked) */}
            {!isEnding && (
                <AbsoluteFill style={{
                    justifyContent: 'center',
                    opacity: slideOpacity,
                    transform: `translateY(${slideY}px) scale(${slideScale})`
                }}>
                    <div style={{
                        width: '100%',
                        padding: '0 50px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            fontSize: 48,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            textAlign: 'center',
                            lineHeight: 1.1,
                            backgroundColor: 'rgba(163, 230, 53, 0.98)',
                            padding: '30px 40px',
                            width: '92%',
                            borderRadius: 4,
                            boxShadow: '0 20px 80px rgba(0,0,0,0.8)',
                            borderBottom: '14px solid #65a30d',
                            color: '#000',
                            position: 'relative'
                        }}>
                            {currentSlideText}

                            {currentSlideIndex < slides.length - 1 && (() => {
                                const framesInSlide = currentSlideIndex === 0 ? firstSlideDuration : regularSlideDuration;
                                const framesElapsedInCurrentSlide = currentSlideIndex === 0
                                    ? frame
                                    : frame - firstSlideDuration - ((currentSlideIndex - 1) * regularSlideDuration);

                                const framesRemaining = framesInSlide - framesElapsedInCurrentSlide;
                                const secondsRemaining = Math.ceil(framesRemaining / fps);

                                // Show countdown for the full duration of the slide

                                return (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        right: '12px',
                                        fontSize: '18px',
                                        fontWeight: '900',
                                        opacity: 0.8,
                                        fontFamily: 'monospace',
                                        color: secondsRemaining <= 1 ? '#ef4444' : '#000' // Red on last second
                                    }}>
                                        {secondsRemaining}...
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </AbsoluteFill>
            )}

            {/* Footer Branding */}
            {!isEnding && (
                <div style={{
                    position: 'absolute',
                    bottom: safeZoneBottom,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 15,
                    zIndex: 5
                }}>
                    <Img src={staticFile('logo.png')} style={{ height: 180 }} />
                    <div style={{
                        fontSize: 42,
                        fontWeight: 900,
                        letterSpacing: 6,
                        color: '#fff',
                        textShadow: '0 4px 15px rgba(0,0,0,0.8)'
                    }}>
                        @THEVITALSPORT
                    </div>
                </div>
            )}

            {/* Outro */}
            {isEnding && (
                <AbsoluteFill style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#000',
                    opacity: opacityEnding
                }}>
                    <Img
                        src={staticFile('logo.png')}
                        style={{
                            height: 560,
                            transform: `scale(${interpolate(opacityEnding, [0, 1], [0.8, 1])})`
                        }}
                    />
                    <div style={{
                        marginTop: 60,
                        fontSize: 85,
                        fontWeight: 900,
                        letterSpacing: 10
                    }}>
                        @THEVITALSPORT
                    </div>
                    <div style={{
                        fontSize: 40,
                        color: '#a3e635',
                        fontWeight: 800,
                        marginTop: 25,
                        letterSpacing: 4
                    }}>
                        FOLLOW FOR MORE SPORTS CONTENT
                    </div>
                </AbsoluteFill>
            )}
        </AbsoluteFill>
    );
};
