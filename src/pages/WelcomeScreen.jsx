import React from 'react';

function WelcomeScreen({ onNavigate }) {
    return (
        <div className="welcome-screen">
            <h2 style={{ marginBottom: '3rem', fontSize: '2.5rem', color: 'white' }}>
                Welcome to NFT Studio
            </h2>

            <div className="welcome-options">
                <div className="welcome-card" onClick={() => onNavigate('new')}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</div>
                    <h3>New Project</h3>
                    <p>
                        Start a new NFT project from scratch. Define your project settings,
                        choose color schemes, and build effects step by step using our wizard.
                    </p>
                </div>

                <div className="welcome-card" onClick={() => onNavigate('resume')}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>▶️</div>
                    <h3>Resume Project</h3>
                    <p>
                        Continue working on an existing project. Pick up where you left off
                        and watch the generation progress in real-time.
                    </p>
                </div>

                <div className="welcome-card" onClick={() => onNavigate('edit')}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✏️</div>
                    <h3>Edit Project</h3>
                    <p>
                        Load and modify an existing project file. Edit effects,
                        adjust settings, and regenerate with your changes.
                    </p>
                </div>
            </div>

            <div style={{ marginTop: '3rem', color: 'rgba(255,255,255,0.8)' }}>
                <p>Powered by my-nft-gen • Built with ❤️</p>
            </div>
        </div>
    );
}

export default WelcomeScreen;