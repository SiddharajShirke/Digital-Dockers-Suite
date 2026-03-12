import { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Paper, Button, LinearProgress, IconButton,
    TextField, Fade, Grow, Slider, Chip
} from '@mui/material';
import {
    ArrowBack, ArrowForward, Check, Close, VolumeUp, VolumeOff,
    PlayArrow, Pause, Refresh
} from '@mui/icons-material';

// ============= Activity Components =============

// Breathing Exercise Activity
const BreathingActivity = ({ activity, onComplete }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [phase, setPhase] = useState('ready');
    const [count, setCount] = useState(0);
    const [cycle, setCycle] = useState(0);
    const [scale, setScale] = useState(1);

    const pattern = useMemo(() => activity.config?.pattern === 'box'
        ? { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }
        : { inhale: 4, hold1: 7, exhale: 8, hold2: 0 }, [activity.config?.pattern]);
    const totalCycles = activity.config?.cycles || 4;

    useEffect(() => {
        if (!isRunning) return;

        const timer = setInterval(() => {
            setCount(prev => {
                const maxCount = phase === 'inhale' ? pattern.inhale
                    : phase === 'hold1' ? pattern.hold1
                        : phase === 'exhale' ? pattern.exhale
                            : pattern.hold2;

                if (prev >= maxCount) {
                    // Move to next phase
                    if (phase === 'inhale') {
                        setPhase('hold1');
                        return 0;
                    } else if (phase === 'hold1') {
                        setPhase('exhale');
                        return 0;
                    } else if (phase === 'exhale') {
                        if (pattern.hold2 > 0) {
                            setPhase('hold2');
                            return 0;
                        }
                        // New cycle
                        if (cycle + 1 >= totalCycles) {
                            setIsRunning(false);
                            setPhase('complete');
                            return 0;
                        }
                        setCycle(c => c + 1);
                        setPhase('inhale');
                        return 0;
                    } else {
                        // hold2 complete
                        if (cycle + 1 >= totalCycles) {
                            setIsRunning(false);
                            setPhase('complete');
                            return 0;
                        }
                        setCycle(c => c + 1);
                        setPhase('inhale');
                        return 0;
                    }
                }
                return prev + 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isRunning, phase, cycle, pattern, totalCycles]);

    useEffect(() => {
        if (phase === 'inhale') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setScale(1 + (count / pattern.inhale) * 0.5);
        } else if (phase === 'exhale') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setScale(1.5 - (count / pattern.exhale) * 0.5);
        }
    }, [phase, count, pattern]);

    const getPhaseText = () => {
        switch (phase) {
            case 'inhale': return 'Breathe In';
            case 'hold1': return 'Hold';
            case 'exhale': return 'Breathe Out';
            case 'hold2': return 'Hold';
            case 'complete': return 'Complete! 🎉';
            default: return 'Ready';
        }
    };

    const getPhaseColor = () => {
        switch (phase) {
            case 'inhale': return '#4f46e5';
            case 'hold1': return '#8b5cf6';
            case 'exhale': return '#06b6d4';
            case 'hold2': return '#ec4899';
            default: return '#94a3b8';
        }
    };

    return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" sx={{ mb: 4, color: 'rgba(255,255,255,0.9)' }}>
                {activity.description}
            </Typography>

            {/* Breathing Circle */}
            <Box sx={{ position: 'relative', width: 200, height: 200, mx: 'auto', mb: 4 }}>
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: 140,
                        height: 140,
                        borderRadius: '50%',
                        background: `${getPhaseColor()}40`,
                        border: `4px solid ${getPhaseColor()}`,
                        transform: `translate(-50%, -50%) scale(${scale})`,
                        transition: 'transform 0.5s ease, background 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        boxShadow: `0 0 40px ${getPhaseColor()}40`
                    }}
                >
                    <Typography variant="body1" fontWeight={600} color={getPhaseColor()}>
                        {getPhaseText()}
                    </Typography>
                    {isRunning && phase !== 'complete' && (
                        <Typography variant="h4" fontWeight={700} color={getPhaseColor()}>
                            {Math.ceil(
                                (phase === 'inhale' ? pattern.inhale :
                                    phase === 'hold1' ? pattern.hold1 :
                                        phase === 'exhale' ? pattern.exhale : pattern.hold2) - count
                            )}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Progress */}
            {isRunning && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="rgba(255,255,255,0.6)">
                        Cycle {cycle + 1} of {totalCycles}
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={(cycle / totalCycles) * 100}
                        sx={{
                            mt: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)',
                            '& .MuiLinearProgress-bar': { bgcolor: getPhaseColor() }
                        }}
                    />
                </Box>
            )}

            {/* Controls */}
            {phase === 'complete' ? (
                <Button
                    variant="contained"
                    onClick={onComplete}
                    sx={{
                        px: 4, py: 1.5, borderRadius: 3,
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    }}
                >
                    Continue →
                </Button>
            ) : !isRunning ? (
                <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => { setIsRunning(true); setPhase('inhale'); }}
                    sx={{
                        px: 4, py: 1.5, borderRadius: 3,
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                    }}
                >
                    Start Breathing
                </Button>
            ) : (
                <IconButton onClick={() => setIsRunning(false)} sx={{ color: 'warning.main' }}>
                    <Pause />
                </IconButton>
            )}
        </Box>
    );
};

// Journal/Text Input Activity
const JournalActivity = ({ activity, onComplete }) => {
    const [text, setText] = useState('');
    const minLength = activity.minLength || 20;
    const canComplete = text.trim().length >= minLength;

    return (
        <Box sx={{ py: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'rgba(255,255,255,0.9)' }}>
                {activity.title}
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)' }}>
                {activity.prompt}
            </Typography>

            <TextField
                multiline
                rows={5}
                fullWidth
                placeholder="Start writing here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.05)',
                        borderRadius: 3,
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#7c3aed' }
                    }
                }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color={canComplete ? '#22c55e' : 'rgba(255,255,255,0.5)'}>
                    {text.length} characters {!canComplete && `(${minLength - text.length} more needed)`}
                </Typography>
                <Button
                    variant="contained"
                    disabled={!canComplete}
                    onClick={() => onComplete({ text })}
                    sx={{
                        borderRadius: 3,
                        background: canComplete
                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                            : undefined
                    }}
                >
                    Done →
                </Button>
            </Box>
        </Box>
    );
};

// Simple Prompt Activity (with confirmation)
const PromptActivity = ({ activity, onComplete }) => {
    const [input, setInput] = useState('');
    const needsInput = activity.inputRequired;

    return (
        <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography
                variant="h5"
                sx={{ mb: 3, color: 'rgba(255,255,255,0.95)', lineHeight: 1.6 }}
            >
                {activity.text}
            </Typography>

            {needsInput && (
                <TextField
                    fullWidth
                    placeholder="Type your response..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    sx={{
                        mb: 3, maxWidth: 500, mx: 'auto',
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(255,255,255,0.05)',
                            borderRadius: 3,
                            color: 'white',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }
                        }
                    }}
                />
            )}

            <Button
                variant="contained"
                disabled={needsInput && !input.trim()}
                onClick={() => onComplete(needsInput ? { response: input } : {})}
                sx={{
                    px: 5, py: 1.5, borderRadius: 3, fontSize: '1rem',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                }}
            >
                {activity.confirmText || "I'm done! ✓"}
            </Button>
        </Box>
    );
};

// Gratitude Activity
const GratitudeActivity = ({ activity, onComplete }) => {
    const count = activity.count || 3;
    const [items, setItems] = useState(Array(count).fill(''));
    const allFilled = items.every(item => item.trim().length > 0);

    return (
        <Box sx={{ py: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'rgba(255,255,255,0.9)' }}>
                {activity.title}
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)' }}>
                {activity.prompt}
            </Typography>

            {items.map((item, i) => (
                <TextField
                    key={i}
                    fullWidth
                    placeholder={`${i + 1}. I'm grateful for...`}
                    value={item}
                    onChange={(e) => {
                        const newItems = [...items];
                        newItems[i] = e.target.value;
                        setItems(newItems);
                    }}
                    sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(255,255,255,0.05)',
                            borderRadius: 3,
                            color: 'white',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }
                        }
                    }}
                />
            ))}

            <Button
                variant="contained"
                fullWidth
                disabled={!allFilled}
                onClick={() => onComplete({ gratitudeItems: items })}
                sx={{
                    mt: 2, py: 1.5, borderRadius: 3,
                    background: allFilled
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                        : undefined
                }}
            >
                Complete Gratitude Practice 🙏
            </Button>
        </Box>
    );
};

// Soundscape Activity
const SoundscapeActivity = ({ activity, onComplete }) => {
    const [playing, setPlaying] = useState(false);
    const [selectedSound, setSelectedSound] = useState('rain');
    const [timeLeft, setTimeLeft] = useState(activity.duration || 120);

    useEffect(() => {
        if (!playing || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    setPlaying(false);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [playing, timeLeft]);

    const sounds = {
        rain: { emoji: '🌧️', label: 'Rain' },
        ocean: { emoji: '🌊', label: 'Ocean' },
        forest: { emoji: '🌲', label: 'Forest' }
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 3, color: 'rgba(255,255,255,0.9)' }}>
                {activity.description}
            </Typography>

            {/* Sound Selection */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 4, flexWrap: 'wrap' }}>
                {Object.entries(sounds).map(([key, { emoji, label }]) => (
                    <Chip
                        key={key}
                        label={`${emoji} ${label}`}
                        onClick={() => setSelectedSound(key)}
                        sx={{
                            px: 2, py: 3, fontSize: '1rem',
                            bgcolor: selectedSound === key ? 'rgba(124, 58, 237, 0.3)' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: selectedSound === key ? '2px solid #7c3aed' : '2px solid transparent',
                            '&:hover': { bgcolor: 'rgba(124, 58, 237, 0.2)' }
                        }}
                    />
                ))}
            </Box>

            {/* Timer Display */}
            <Typography variant="h2" sx={{ mb: 4, color: 'white', fontWeight: 300 }}>
                {formatTime(timeLeft)}
            </Typography>

            {/* Note: In production, you'd add actual audio */}
            <Typography variant="caption" sx={{ display: 'block', mb: 3, color: 'rgba(255,255,255,0.5)' }}>
                {playing ? `🔊 Playing ${sounds[selectedSound].label} sounds...` : 'Press play to start'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <IconButton
                    onClick={() => setPlaying(!playing)}
                    sx={{
                        bgcolor: playing ? 'warning.main' : '#7c3aed',
                        color: 'white',
                        width: 64, height: 64,
                        '&:hover': { bgcolor: playing ? 'warning.dark' : '#6d28d9' }
                    }}
                >
                    {playing ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
                </IconButton>
            </Box>

            {timeLeft === 0 && (
                <Button
                    variant="contained"
                    onClick={onComplete}
                    sx={{
                        mt: 4, px: 4, py: 1.5, borderRadius: 3,
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    }}
                >
                    Continue →
                </Button>
            )}

            <Button
                variant="text"
                onClick={onComplete}
                sx={{ mt: 2, color: 'rgba(255,255,255,0.5)' }}
            >
                Skip this activity
            </Button>
        </Box>
    );
};

const QuoteActivity = ({ onComplete }) => {
    const quotes = useMemo(() => [
        { text: "You are capable of amazing things.", author: "Unknown" },
        { text: "Every moment is a fresh beginning.", author: "T.S. Eliot" },
        { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" }
    ], []);
    const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);

    return (
        <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography
                variant="h4"
                sx={{
                    mb: 3,
                    color: 'white',
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                    maxWidth: 600,
                    mx: 'auto'
                }}
            >
                "{quote.text}"
            </Typography>
            <Typography variant="body1" sx={{ mb: 5, color: 'rgba(255,255,255,0.6)' }}>
                — {quote.author}
            </Typography>
            <Button
                variant="contained"
                onClick={onComplete}
                sx={{
                    px: 4, py: 1.5, borderRadius: 3,
                    background: 'linear-gradient(135deg, #f472b6 0%, #c084fc 100%)'
                }}
            >
                Inspired! Continue →
            </Button>
        </Box>
    );
};

// ============= Main Journey Player =============

const JourneyPlayer = ({ path, onComplete, onExit }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [completedActivities, setCompletedActivities] = useState([]);
    const [activityResults, setActivityResults] = useState({});

    const activity = path.activities[currentIndex];
    const progress = ((currentIndex + 1) / path.activities.length) * 100;
    const isLastActivity = currentIndex === path.activities.length - 1;

    const handleActivityComplete = (result = {}) => {
        setCompletedActivities(prev => [...prev, activity.id]);
        setActivityResults(prev => ({ ...prev, [activity.id]: result }));

        if (isLastActivity) {
            onComplete({
                pathId: path.id,
                completedActivities: [...completedActivities, activity.id],
                results: { ...activityResults, [activity.id]: result }
            });
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const renderActivity = () => {
        switch (activity.type) {
            case 'breathing':
                return <BreathingActivity activity={activity} onComplete={handleActivityComplete} />;
            case 'journal':
                return <JournalActivity activity={activity} onComplete={handleActivityComplete} />;
            case 'prompt':
                return <PromptActivity activity={activity} onComplete={handleActivityComplete} />;
            case 'gratitude':
                return <GratitudeActivity activity={activity} onComplete={handleActivityComplete} />;
            case 'soundscape':
                return <SoundscapeActivity activity={activity} onComplete={handleActivityComplete} />;
            case 'quote':
            case 'affirmation':
                return <QuoteActivity activity={activity} onComplete={handleActivityComplete} />;
            case 'aiChat':
            case 'taskBreakdown':
            case 'muscleRelaxation':
            case 'satisfaction':
                // Simplified version for now - shows prompt and continues
                return <PromptActivity
                    activity={{ ...activity, text: activity.prompt || activity.description, confirmText: 'Continue' }}
                    onComplete={handleActivityComplete}
                />;
            default:
                return <PromptActivity activity={activity} onComplete={handleActivityComplete} />;
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
                py: 3,
                px: 2
            }}
        >
            {/* Header */}
            <Box sx={{ maxWidth: 700, mx: 'auto' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <IconButton onClick={onExit} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        <Close />
                    </IconButton>
                    <Typography variant="body2" color="rgba(255,255,255,0.6)">
                        {currentIndex + 1} of {path.activities.length}
                    </Typography>
                    <Box sx={{ width: 40 }} />
                </Box>

                {/* Progress Bar */}
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        mb: 4,
                        '& .MuiLinearProgress-bar': {
                            background: path.gradient,
                            borderRadius: 3
                        }
                    }}
                />

                {/* Path Title */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Chip
                        label={`${path.icon} ${path.title}`}
                        sx={{
                            background: path.gradient,
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            px: 1
                        }}
                    />
                </Box>

                {/* Activity Content */}
                <Paper
                    sx={{
                        p: 4,
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    <Fade in key={activity.id} timeout={400}>
                        <Box>
                            {renderActivity()}
                        </Box>
                    </Fade>
                </Paper>
            </Box>
        </Box>
    );
};

export default JourneyPlayer;
