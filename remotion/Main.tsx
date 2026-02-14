import React from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, spring, Audio, staticFile, Img, Sequence } from 'remotion';

export interface MainProps {
    title: string;
    subHeadline: string;
    slides: string[];
    category?: string;
    backgroundColor?: string;
    backgroundImages: string[];
    focusPoint?: { x: 'left' | 'center' | 'right', y: 'top' | 'center' | 'bottom' };
    durationInFrames: number;
    hasMusic?: boolean;
    persona?: string;
}

export const Main: React.FC<MainProps> = ({
    title,
    subHeadline,
    slides = [],
    category = 'NATIONAL',
    backgroundColor = '#000000',
    backgroundImages = ['background_0.png'],
    focusPoint = { x: 'center', y: 'top' }, // Default to top for faces
    durationInFrames,
    hasMusic,
    persona = 'NEWS'
}) => {
    const { fps, height, width } = useVideoConfig();
    const frame = useCurrentFrame();

    // Slide Logic - First slide is 7 seconds, rest are 5 seconds
    const firstSlideDuration = fps * 7;
    const regularSlideDuration = fps * 5;

    let currentSlideIndex = 0;
    let elapsedFrames = frame;

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

    // Background Animation Logic (Global Smooth Zoom)
    const zoomScale = interpolate(
        frame,
        [0, durationInFrames],
        [1.1, 1.4],
        { extrapolateRight: 'clamp' }
    );

    const panX = interpolate(
        frame,
        [0, durationInFrames],
        [0, focusPoint.x === 'left' ? 40 : focusPoint.x === 'right' ? -40 : 0]
    );

    const panY = interpolate(
        frame,
        [0, durationInFrames],
        [0, focusPoint.y === 'top' ? 30 : focusPoint.y === 'bottom' ? -30 : 0]
    );

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

    // Persona Themes
    const getTheme = (p: string) => {
        switch (p) {
            case 'CELEBRATION':
                return {
                    primary: '#facc15',
                    secondary: '#a16207',
                    text: '#000',
                    tint: 'rgba(250, 204, 21, 0.2)',
                    label: 'GLORY',
                    glow: '0 0 40px rgba(250, 204, 21, 0.4)'
                };
            case 'EMERGENCY':
                return {
                    primary: '#ef4444',
                    secondary: '#991b1b',
                    text: '#fff',
                    tint: 'rgba(239, 68, 68, 0.3)',
                    label: 'ALERT',
                    glow: '0 0 50px rgba(239, 68, 68, 0.5)'
                };
            case 'SCOUTING':
                return {
                    primary: '#38bdf8',
                    secondary: '#075985',
                    text: '#000',
                    tint: 'rgba(56, 189, 248, 0.2)',
                    label: 'DRAFT',
                    glow: '0 0 40px rgba(56, 189, 248, 0.4)'
                };
            default: // NEWS
                return {
                    primary: '#a3e635',
                    secondary: '#65a30d',
                    text: '#000',
                    tint: 'rgba(163, 230, 53, 0.15)',
                    label: 'BREAKING',
                    glow: 'none'
                };
        }
    };
    const theme = getTheme(persona);

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

            {/* Background Layer */}
            <AbsoluteFill style={{ overflow: 'hidden' }}>
                <AbsoluteFill style={{
                    transform: `scale(${zoomScale}) translate(${panX}px, ${panY}px)`,
                    transformOrigin: `${posX} ${posY}`
                }}>
                    <Img
                        src={staticFile('background_0.png')}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'brightness(1.0) saturate(1.2)',
                        }}
                    />
                </AbsoluteFill>

                {/* Tint Overlay */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `radial-gradient(circle at ${posX} ${posY}, transparent 20%, rgba(0,0,0,0.4) 100%), linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, ${theme.tint} 100%)`,
                    pointerEvents: 'none',
                    opacity: interpolate(Math.sin(frame / 20), [-1, 1], [0.7, 1])
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
                            backgroundColor: theme.primary,
                            padding: '10px 25px',
                            fontSize: 34,
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: 2,
                            color: theme.text,
                            boxShadow: theme.glow
                        }}>
                            {theme.label}
                        </div>
                        <div style={{
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            padding: '10px 25px',
                            fontSize: 34,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            border: `1px solid ${theme.primary}`
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
                        borderLeft: `18px solid ${theme.primary}`,
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

            {/* Full Block Content Slides */}
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
                            backgroundColor: theme.primary,
                            padding: '30px 40px',
                            width: '92%',
                            borderRadius: 4,
                            boxShadow: '0 20px 80px rgba(0,0,0,0.8)',
                            borderBottom: `14px solid ${theme.secondary}`,
                            color: theme.text,
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

                                return (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        right: '12px',
                                        fontSize: '18px',
                                        fontWeight: '900',
                                        opacity: 0.8,
                                        fontFamily: 'monospace',
                                        color: secondsRemaining <= 1 ? '#ef4444' : '#000'
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
