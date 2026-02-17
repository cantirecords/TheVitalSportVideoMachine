import React from 'react';
import { AbsoluteFill, staticFile, Img } from 'remotion';

export interface NewsCardProps {
    title: string;
    subHeadline?: string;
    image: string;
    category: string;
    type: 'BREAKING' | 'QUOTE' | 'STAT' | 'SKY';
    quoteAuthor?: string;
    statValue?: string;
    statLabel?: string;
}

export const NewsCard: React.FC<NewsCardProps> = ({
    title,
    subHeadline,
    image,
    category = 'SPORTS',
    type = 'BREAKING',
    quoteAuthor,
    statValue,
    statLabel
}) => {

    const theme = {
        primary: '#E11D48', // Red for Breaking
        secondary: '#000000',
        text: '#ffffff',
        accent: '#FACC15', // Yellow accent
        skyBlue: '#001A72' // Deep Blue for Sky template
    };

    if (type === 'QUOTE') {
        theme.primary = '#0EA5E9'; // Blue for Quotes
    } else if (type === 'STAT') {
        theme.primary = '#22C55E'; // Green for Stats
    }

    return (
        <AbsoluteFill style={{ backgroundColor: '#000', fontFamily: 'Inter, sans-serif' }}>

            {/* Template: SKY (The "Daily News" design) */}
            {type === 'SKY' ? (
                <AbsoluteFill>
                    {/* Full Background Image */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                        <Img
                            src={staticFile(image)}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: 'center 20%' // Focus on faces (upper center)
                            }}
                        />
                    </div>

                    {/* Smooth Black Gradient Overlay */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '70%',
                        background: `linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, transparent 100%)`,
                        zIndex: 10
                    }} />

                    {/* Content Section */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        padding: '0 60px 80px 60px',
                        zIndex: 20
                    }}>
                        {/* Dynamic League/Category Pill or Logo */}
                        {(() => {
                            const catUpper = category.toUpperCase();
                            const titleUpper = title.toUpperCase();
                            const subUpper = (subHeadline || '').toUpperCase();

                            const LEAGUE_LOGOS: { [key: string]: string } = {
                                'NBA': 'https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg',
                                'PREMIER': 'https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg',
                                'LALIGA': 'https://upload.wikimedia.org/wikipedia/commons/b/bb/LaLiga_2023_logo.svg',
                                'NFL': 'https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg',
                                'MLB': 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Major_League_Baseball_logo.svg',
                                'F1': 'https://upload.wikimedia.org/wikipedia/commons/3/33/F1.svg',
                                'FORMULA': 'https://upload.wikimedia.org/wikipedia/commons/3/33/F1.svg',
                                'UFC': 'https://upload.wikimedia.org/wikipedia/commons/0/0d/UFC_logo.svg',
                                'CHAMPIONS': 'https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2.svg',
                                'UEFA': 'https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2.svg',
                                'REAL MADRID': 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
                                'BARCELONA': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_(crest).svg'
                            };

                            let matchedLogo = null;

                            // 1. Team Focus
                            if (titleUpper.includes('REAL MADRID') || subUpper.includes('REAL MADRID')) matchedLogo = LEAGUE_LOGOS['REAL MADRID'];
                            else if (titleUpper.includes('BARCELONA') || subUpper.includes('BARCELONA')) matchedLogo = LEAGUE_LOGOS['BARCELONA'];

                            // 2. League Focus
                            if (!matchedLogo) {
                                for (const key in LEAGUE_LOGOS) {
                                    if (catUpper.includes(key)) {
                                        matchedLogo = LEAGUE_LOGOS[key];
                                        break;
                                    }
                                }
                            }

                            return (
                                <div style={{
                                    backgroundColor: matchedLogo ? 'white' : '#ff0000',
                                    padding: matchedLogo ? '10px 25px' : '5px 20px',
                                    borderRadius: '8px',
                                    marginBottom: '20px',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: matchedLogo ? '90px' : '60px',
                                    minWidth: matchedLogo ? '160px' : '150px'
                                }}>
                                    {matchedLogo ? (
                                        <Img
                                            src={matchedLogo}
                                            style={{
                                                height: '70px',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    ) : (
                                        <span style={{
                                            color: 'white',
                                            fontSize: '32px',
                                            fontWeight: '900',
                                            fontFamily: 'Heebo, sans-serif',
                                            textTransform: 'uppercase',
                                            letterSpacing: '2px'
                                        }}>
                                            {category || 'NEWS'}
                                        </span>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Centered Headline - Balanced Text */}
                        <h1 style={{
                            color: 'white',
                            fontSize: '80px', // Slightly smaller to fix 2 lines nicely
                            fontWeight: '900',
                            textAlign: 'center',
                            margin: '0 0 25px 0',
                            lineHeight: '1.0', // Tighter leading for 2 lines
                            letterSpacing: '-2px',
                            fontFamily: 'Inter, sans-serif',
                            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                            textWrap: 'balance',
                            maxWidth: '95%'
                        }}>
                            {title}
                        </h1>

                        {/* Centered Description - Balanced Text */}
                        <p style={{
                            color: 'rgba(255,255,255,0.9)',
                            fontSize: '32px',
                            fontWeight: '500',
                            textAlign: 'center',
                            margin: '0',
                            lineHeight: '1.3',
                            maxWidth: '90%',
                            fontFamily: 'Inter, sans-serif',
                            textWrap: 'balance'
                        }}>
                            {subHeadline}
                        </p>
                    </div>

                    {/* Logo in Top Left - Back to 200px */}
                    <div style={{
                        position: 'absolute',
                        top: 50,
                        left: 50,
                        zIndex: 30,
                        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))'
                    }}>
                        <Img
                            src={staticFile('logo.png')}
                            style={{
                                height: '200px'
                            }}
                        />
                    </div>
                </AbsoluteFill>
            ) : (
                <>
                    {/* Background Image for other templates */}
                    <Img
                        src={staticFile(image)}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: type === 'QUOTE' ? 'brightness(0.4)' : 'brightness(0.8)',
                        }}
                    />

                    {/* Gradient Overlay for Text Readability */}
                    <AbsoluteFill
                        style={{
                            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
                        }}
                    />

                    {/* Top Bar: Logo & Category (Hidden for QUOTE) */}
                    {type !== 'QUOTE' && (
                        <div style={{
                            position: 'absolute',
                            top: 60,
                            left: 60,
                            right: 60,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            zIndex: 10
                        }}>
                            <Img src={staticFile('logo.png')} style={{ height: 120 }} />
                            <div style={{
                                backgroundColor: theme.primary,
                                color: '#fff',
                                padding: '15px 30px',
                                fontSize: 32,
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                borderRadius: 8,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                            }}>
                                {category}
                            </div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        top: 0,
                        zIndex: 10
                    }}>

                        {/* --- TEMPLATE: BREAKING NEWS --- */}
                        {type === 'BREAKING' && (
                            <div style={{ position: 'absolute', bottom: 250, left: 60, right: 60, display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div style={{
                                    display: 'inline-block',
                                    backgroundColor: '#fff',
                                    color: '#E11D48',
                                    padding: '10px 25px',
                                    fontSize: 36,
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    width: 'fit-content',
                                    borderRadius: 4
                                }}>
                                    BREAKING NEWS
                                </div>
                                <h1 style={{
                                    fontSize: 90,
                                    lineHeight: 0.95,
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    color: '#fff',
                                    textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                                    margin: 0
                                }}>
                                    {title}
                                </h1>
                                {subHeadline && (
                                    <div style={{
                                        fontSize: 40,
                                        fontWeight: 500,
                                        color: '#e5e5e5',
                                        marginTop: 10,
                                        lineHeight: 1.3
                                    }}>
                                        {subHeadline}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- TEMPLATE: QUOTE --- */}
                        {type === 'QUOTE' && (
                            <AbsoluteFill>
                                {/* Logo in top left - Larger and original color */}
                                <div style={{ position: 'absolute', top: 50, left: 50 }}>
                                    <Img src={staticFile('logo.png')} style={{ height: 180 }} />
                                </div>

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    padding: '0 80px'
                                }}>
                                    {/* Quote Icon Box */}
                                    <div style={{
                                        backgroundColor: '#A3E635',
                                        padding: '12px 30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 60,
                                        position: 'relative'
                                    }}>
                                        <div style={{ position: 'absolute', left: -50, top: '50%', width: 50, height: 2, backgroundColor: '#A3E635' }} />
                                        <div style={{ fontSize: 45, fontWeight: 900, color: '#000', lineHeight: 1 }}>“ ”</div>
                                        <div style={{ position: 'absolute', right: -50, top: '50%', width: 50, height: 2, backgroundColor: '#A3E635' }} />
                                    </div>

                                    {/* Main Quote Text - Uniform and Beautiful */}
                                    <h1 style={{
                                        fontSize: 80,
                                        fontWeight: 900,
                                        textAlign: 'center',
                                        color: '#fff',
                                        textTransform: 'uppercase',
                                        lineHeight: 1.1,
                                        margin: '0 0 50px 0',
                                        fontFamily: 'Inter, sans-serif',
                                        letterSpacing: '-2px'
                                    }}>
                                        {title}
                                    </h1>

                                    {/* Author Name */}
                                    <div style={{
                                        fontSize: 42,
                                        fontWeight: 900,
                                        color: '#A3E635',
                                        textTransform: 'uppercase',
                                        letterSpacing: 2,
                                        marginBottom: 10
                                    }}>
                                        {quoteAuthor || 'UNKNOWN'}
                                    </div>

                                    {/* Category / Context */}
                                    <div style={{
                                        fontSize: 26,
                                        fontWeight: 800,
                                        color: '#fff',
                                        textTransform: 'uppercase',
                                        letterSpacing: 3,
                                        opacity: 0.8
                                    }}>
                                        {category}
                                    </div>
                                </div>
                            </AbsoluteFill>
                        )}

                        {/* --- TEMPLATE: STATS --- */}
                        {type === 'STAT' && (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 30 }}>
                                <div style={{
                                    fontSize: 180,
                                    lineHeight: 0.9,
                                    fontWeight: 900,
                                    color: theme.accent
                                }}>
                                    {statValue}
                                </div>
                                <div style={{
                                    fontSize: 50,
                                    fontWeight: 800,
                                    color: '#fff',
                                    textTransform: 'uppercase',
                                    paddingBottom: 25,
                                    lineHeight: 1
                                }}>
                                    {statLabel}
                                    <div style={{
                                        fontSize: 32,
                                        fontWeight: 400,
                                        color: '#ccc',
                                        marginTop: 10,
                                        textTransform: 'none'
                                    }}>
                                        {title}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer / Branding Line (Hidden for SKY and QUOTE) */}
                    {type !== 'QUOTE' && (
                        <div style={{
                            position: 'absolute',
                            bottom: 60,
                            left: 0,
                            right: 0,
                            textAlign: 'center',
                            borderTop: '2px solid rgba(255,255,255,0.2)',
                            paddingTop: 40
                        }}>
                            <div style={{
                                fontSize: 32,
                                fontWeight: 700,
                                letterSpacing: 4,
                                color: 'rgba(255,255,255,0.8)'
                            }}>
                                @THEVITALSPORT
                            </div>
                        </div>
                    )}
                </>
            )}

        </AbsoluteFill>
    );
};
