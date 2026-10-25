// MoveMakers - Robust Camera & PoseNet Gesture Detection Engine
// ProjectCodeX December Hackathon

window.addEventListener("DOMContentLoaded", function () {
    let soundMuted = false;
    const bell = new Audio('/audio/bell.mp3');
    const jinglebells = new Audio('/audio/jinglebells.mp3');
    const errorSound = new Audio('/audio/error.mp3');

    function playSound(audio) {
        if (!soundMuted && audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    }

    const URL = "https://teachablemachine.withgoogle.com/models/C8EwO48qN/";
    let model, ctx, maxPredictions;
    let localStream = null;

    // DOM Elements
    const videoElem = document.getElementById("webcam-video");
    const canvas = document.getElementById("canvas");
    const idleScreen = document.getElementById("camera-idle-screen");
    const hudScanner = document.getElementById("hud-scanner");
    const hudStatusText = document.getElementById("hud-status-text");
    const hudStatusDot = document.getElementById("hud-status-dot");
    const personIndicator = document.getElementById("person-indicator");
    const cameraHudBottom = document.getElementById("camera-hud-bottom");
    const bodyTrackingLabel = document.getElementById("body-tracking-label");
    const bodyConfidenceLabel = document.getElementById("body-confidence-label");

    // Camera Error Overlay Elements
    const cameraErrorOverlay = document.getElementById("camera-error-overlay");
    const cameraErrorMessage = document.getElementById("camera-error-message");
    const retryCameraBtn = document.getElementById("retry-camera-btn");
    const dismissErrorBtn = document.getElementById("dismiss-error-btn");

    const mirrorBtn = document.getElementById("mirror-btn");
    const audioBtn = document.getElementById("audio-status-btn");

    const correctElement = document.getElementById("correct-toggle");
    const incorrectElement = document.getElementById("incorrect-toggle");
    const correctHeaderElement = document.getElementById("correct-toggle-header");
    const incorrectHeaderElement = document.getElementById("incorrect-toggle-header");
    const alignTextElem = document.getElementById("position-yourself");
    const startBtn = document.getElementById("start-button");
    const stopBtn = document.getElementById("stop");
    const restartBtn = document.getElementById("restart");

    const questionElem = document.getElementById("question");
    const gestureHintElem = document.getElementById("gesture-hint");
    const challengeNumElem = document.getElementById("challenge-num");
    const challengeProgressBar = document.getElementById("challenge-progress");

    // Hold Confirmation Elements
    const holdContainer = document.getElementById("hold-progress-container");
    const holdBar = document.getElementById("hold-bar");
    const holdStatusText = document.getElementById("hold-status-text");
    const holdPct = document.getElementById("hold-pct");

    const showMeList = ["Hungry", "I See You", "Quiet Down", "Get Busy"];
    const gestureHints = [
        "Hint: Bring your hand up towards your mouth as if eating.",
        "Hint: Point your index & middle fingers towards your eyes.",
        "Hint: Hold your index finger upright in front of your lips.",
        "Hint: Raise both hands up and groove to the music!"
    ];
    const gestureEmojis = ["🍽️", "👀", "🤫", "💃"];

    let lookingForIndex = 0;
    let isRunning = false;
    let isFlipped = true;

    // Gesture hold-to-confirm counter
    let holdCount = 0;
    const REQUIRED_HOLD_FRAMES = 12; // ~0.4-0.5s of holding pose for certainty
    let isAdvancing = false;

    // Camera Error Overlay Helpers
    function hideCameraErrorOverlay() {
        if (cameraErrorOverlay) cameraErrorOverlay.style.display = "none";
    }

    function showCameraErrorOverlay(userMessage) {
        if (cameraErrorMessage) {
            cameraErrorMessage.textContent = userMessage;
        }
        if (cameraErrorOverlay) {
            cameraErrorOverlay.style.display = "block";
        }
        if (hudStatusText) hudStatusText.textContent = "CAMERA ERROR";
        if (hudStatusDot) hudStatusDot.style.backgroundColor = "#ef4444";
        if (personIndicator) {
            personIndicator.className = "badge bg-danger font-monospace";
            personIndicator.textContent = "👤 Camera: Blocked";
        }
        if (startBtn) startBtn.style.display = "inline-block";
        if (stopBtn) stopBtn.style.display = "none";
    }

    // Camera Availability Check & Diagnostic Logger
    async function checkCameraAvailability() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const err = new Error("navigator.mediaDevices.getUserMedia is not supported in this browser or context.");
            err.name = "NotSupportedError";
            console.error("[MediaPipe/Camera Stream Issue] Browser missing mediaDevices or getUserMedia support:", err);
            throw err;
        }

        if (navigator.mediaDevices.enumerateDevices) {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                console.log(`[MediaPipe/Camera Stream Check] Found ${videoInputs.length} videoinput device(s):`, videoInputs);
                if (videoInputs.length === 0) {
                    const err = new Error("No physical videoinput camera device found on this system.");
                    err.name = "NotFoundError";
                    console.error("[MediaPipe/Camera Stream Issue] Zero camera devices detected:", err);
                    throw err;
                }
            } catch (enumErr) {
                if (enumErr.name === "NotFoundError") throw enumErr;
                console.warn("[MediaPipe/Camera Stream Check] Could not enumerate devices:", enumErr);
            }
        }
    }

    function handleCameraStreamError(err) {
        console.error("[MediaPipe/Camera Stream Issue] Detailed Stream Diagnostics:", {
            name: err.name,
            message: err.message,
            constraint: err.constraint || "N/A",
            stack: err.stack,
            timestamp: new Date().toISOString()
        });

        let userMessage = "Unable to access the camera.";

        switch (err.name) {
            case "NotAllowedError":
            case "PermissionDeniedError":
                userMessage = "Camera permission was denied. Please allow camera access in your browser address bar and click 'Retry Camera'.";
                break;
            case "NotFoundError":
            case "DevicesNotFoundError":
                userMessage = "No webcam detected on your device. Please plug in a camera.";
                break;
            case "NotReadableError":
            case "TrackStartError":
                userMessage = "Camera is currently in use by another application or OS process. Please close other video apps.";
                break;
            case "OverconstrainedError":
                userMessage = "The requested camera resolution is not supported by your webcam hardware.";
                break;
            case "SecurityError":
                userMessage = "Camera access was blocked due to an insecure context. Camera requires an HTTPS or localhost connection.";
                break;
            case "NotSupportedError":
                userMessage = "Webcam media APIs are not supported in your current browser.";
                break;
            default:
                userMessage = `Camera access error: ${err.message || "Failed to initialize video stream"}.`;
        }

        showCameraErrorOverlay(userMessage);
    }

    // Error Overlay Action Handlers
    if (retryCameraBtn) {
        retryCameraBtn.addEventListener("click", async function () {
            hideCameraErrorOverlay();
            await init();
        });
    }

    if (dismissErrorBtn) {
        dismissErrorBtn.addEventListener("click", function () {
            hideCameraErrorOverlay();
            if (hudStatusText) hudStatusText.textContent = "SIMULATION MODE";
            if (hudStatusDot) hudStatusDot.style.backgroundColor = "#38bdf8";
            if (alignTextElem) {
                alignTextElem.innerHTML = '<span class="text-info">Simulation active.</span>';
            }
        });
    }

    // Audio Toggle
    if (audioBtn) {
        audioBtn.addEventListener("click", function () {
            soundMuted = !soundMuted;
            audioBtn.textContent = soundMuted ? "🔇 Sound OFF" : "🔊 Sound ON";
            audioBtn.classList.toggle("bg-secondary", !soundMuted);
            audioBtn.classList.toggle("bg-warning", soundMuted);
        });
    }

    // Mirror Flip Toggle
    if (mirrorBtn) {
        mirrorBtn.addEventListener("click", function () {
            isFlipped = !isFlipped;
        });
    }

    function updateChallengeUI() {
        if (lookingForIndex < showMeList.length) {
            const name = showMeList[lookingForIndex];
            const emoji = gestureEmojis[lookingForIndex];
            if (questionElem) {
                questionElem.innerHTML = `${emoji} Make the gesture for <strong>${name}</strong>`;
            }
            if (gestureHintElem) {
                gestureHintElem.textContent = gestureHints[lookingForIndex];
            }
            if (challengeNumElem) {
                challengeNumElem.textContent = (lookingForIndex + 1).toString();
            }
            if (challengeProgressBar) {
                const pct = ((lookingForIndex) / showMeList.length) * 100;
                challengeProgressBar.style.width = `${pct}%`;
            }

            // Reset hold progress
            holdCount = 0;
            if (holdContainer) holdContainer.style.display = "none";
            if (holdBar) holdBar.style.width = "0%";

            // Highlight target card in prediction meters
            for (let i = 0; i < 4; i++) {
                const card = document.getElementById(`pred-card-${i}`);
                if (card) {
                    card.classList.toggle("active-target", i === lookingForIndex);
                }
            }
        }
    }

    async function init() {
        hideCameraErrorOverlay();
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        try {
            if (hudStatusText) hudStatusText.textContent = "INITIALIZING MODEL...";
            if (hudStatusDot) hudStatusDot.style.backgroundColor = "#f59e0b";

            // Load Teachable Machine Pose model
            if (!model) {
                model = await tmPose.load(modelURL, metadataURL);
                maxPredictions = model.getTotalClasses();
            }

            // Perform Camera Availability Pre-Check
            await checkCameraAvailability();

            // Launch Camera using standard getUserMedia
            if (hudStatusText) hudStatusText.textContent = "ACCESSING WEBCAM...";

            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                    },
                    audio: false
                });

                if (videoElem) {
                    videoElem.srcObject = localStream;
                    await videoElem.play();
                }

                isRunning = true;

                if (hudStatusText) hudStatusText.textContent = "LIVE • POSE TRACKING";
                if (hudStatusDot) hudStatusDot.style.backgroundColor = "#22c55e";
                if (hudScanner) hudScanner.style.display = "block";
                if (idleScreen) idleScreen.style.display = "none";
                if (canvas) canvas.style.display = "block";
                if (cameraHudBottom) cameraHudBottom.style.setProperty("display", "flex", "important");

                window.requestAnimationFrame(renderLoop);
            } catch (camErr) {
                console.warn("[MediaPipe/Camera Stream Issue] Primary constraints failed, trying basic fallback constraint:", camErr);
                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                if (videoElem) {
                    videoElem.srcObject = localStream;
                    await videoElem.play();
                }
                isRunning = true;
                if (canvas) canvas.style.display = "block";
                if (idleScreen) idleScreen.style.display = "none";
                if (hudStatusText) hudStatusText.textContent = "LIVE • POSE TRACKING";
                if (hudStatusDot) hudStatusDot.style.backgroundColor = "#22c55e";
                window.requestAnimationFrame(renderLoop);
            }

            if (canvas) {
                ctx = canvas.getContext("2d");
            }

            if (startBtn) startBtn.style.display = "none";
            if (stopBtn) stopBtn.style.display = "inline-block";
            if (restartBtn) restartBtn.style.display = "none";

            updateChallengeUI();
        } catch (err) {
            handleCameraStreamError(err);
        }
    }

    async function renderLoop() {
        if (!isRunning) return;

        if (videoElem && videoElem.readyState >= 2 && canvas && ctx) {
            const w = canvas.width;
            const h = canvas.height;

            // Draw video frame to canvas
            ctx.save();
            if (isFlipped) {
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(videoElem, 0, 0, w, h);
            ctx.restore();

            // Run PoseNet estimation & sequential evaluation
            if (model && !isAdvancing) {
                try {
                    const { pose, posenetOutput } = await model.estimatePose(canvas);
                    const prediction = await model.predict(posenetOutput);

                    // Check keypoints for person detection
                    if (pose && pose.keypoints) {
                        const validKeypoints = pose.keypoints.filter(k => k.score > 0.2);
                        const count = validKeypoints.length;

                        drawEnhancedPose(pose, ctx, w, h);

                        if (personIndicator) {
                            if (count >= 5) {
                                personIndicator.className = "badge bg-success font-monospace";
                                personIndicator.textContent = `👤 Person: Locked (${count}/17)`;
                            } else {
                                personIndicator.className = "badge bg-warning text-dark font-monospace";
                                personIndicator.textContent = `👤 Step back into frame (${count}/17)`;
                            }
                        }

                        if (bodyTrackingLabel) {
                            bodyTrackingLabel.innerHTML = `Keypoints: <strong class="text-info">${count}/17</strong>`;
                        }
                        if (bodyConfidenceLabel) {
                            const avgConf = Math.round((pose.score || 0) * 100);
                            bodyConfidenceLabel.innerHTML = `Pose Confidence: <strong class="text-white">${avgConf}%</strong>`;
                        }
                    } else {
                        if (personIndicator) {
                            personIndicator.className = "badge bg-secondary font-monospace";
                            personIndicator.textContent = "👤 Person: Searching...";
                        }
                    }

                    // Process Gesture Prediction meters
                    for (let i = 0; i < maxPredictions; i++) {
                        const prob = prediction[i].probability;
                        const pct = Math.round(prob * 100);

                        const bar = document.getElementById(`pred-bar-${i}`);
                        const text = document.getElementById(`pred-pct-${i}`);
                        if (bar) bar.style.width = `${pct}%`;
                        if (text) text.textContent = `${pct}%`;
                    }

                    // Strict Sequential Check: Evaluate ONLY the currently active target gesture
                    const targetName = showMeList[lookingForIndex];
                    const targetPrediction = prediction.find(p => getModelName(p.className) === targetName);
                    const targetProb = targetPrediction ? targetPrediction.probability : 0;

                    if (targetProb >= 0.55) {
                        holdCount++;
                        if (holdContainer) holdContainer.style.display = "block";
                        const pct = Math.min(100, Math.round((holdCount / REQUIRED_HOLD_FRAMES) * 100));
                        if (holdBar) holdBar.style.width = `${pct}%`;
                        if (holdPct) holdPct.textContent = `${pct}%`;
                        if (holdStatusText) {
                            holdStatusText.textContent = `Holding ${targetName}... ${pct}%`;
                        }

                        if (holdCount >= REQUIRED_HOLD_FRAMES) {
                            handleGestureConfirmed(targetName);
                        }
                    } else {
                        // Slowly decay hold if user drops pose
                        if (holdCount > 0) {
                            holdCount = Math.max(0, holdCount - 2);
                            const pct = Math.round((holdCount / REQUIRED_HOLD_FRAMES) * 100);
                            if (holdBar) holdBar.style.width = `${pct}%`;
                            if (holdPct) holdPct.textContent = `${pct}%`;
                            if (holdCount === 0 && holdContainer) {
                                holdContainer.style.display = "none";
                            }
                        }
                    }

                } catch (predErr) {
                    // Frame drop handled silently
                }
            }
        }

        window.requestAnimationFrame(renderLoop);
    }

    function drawEnhancedPose(pose, ctx, w, h) {
        if (!pose || !pose.keypoints) return;
        const minPartConfidence = 0.25;
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#00f0ff";
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 8;
        tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
        ctx.shadowBlur = 0;

        pose.keypoints.forEach((kp, idx) => {
            if (kp.score >= minPartConfidence) {
                const { x, y } = kp.position;
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                if (idx === 9 || idx === 10) {
                    ctx.fillStyle = "#ec4899";
                } else if (idx === 5 || idx === 6) {
                    ctx.fillStyle = "#eab308";
                } else {
                    ctx.fillStyle = "#38bdf8";
                }
                ctx.fill();
            }
        });
    }

    function getModelName(gestureName) {
        switch (gestureName) {
            case "ISeeYou":
                return "I See You";
            case "GetBusy":
                return "Get Busy";
            case "QuietDown":
                return "Quiet Down";
            default:
                return gestureName;
        }
    }

    function handleGestureConfirmed(gestureName) {
        if (isAdvancing) return;
        const targetName = showMeList[lookingForIndex];
        const normalized = getModelName(gestureName);

        if (normalized === targetName) {
            isAdvancing = true;
            playSound(bell);

            if (holdContainer) holdContainer.style.display = "none";
            if (correctElement) {
                correctElement.style.display = "block";
                if (correctHeaderElement) {
                    correctHeaderElement.innerHTML = `Great job! Mastered <strong>${targetName}</strong>!`;
                }
            }

            setTimeout(function () {
                if (correctElement) correctElement.style.display = "none";
            }, 1500);

            setTimeout(async function () {
                await advanceQuestion();
                isAdvancing = false;
            }, 1500);
        }
    }

    async function advanceQuestion() {
        lookingForIndex++;
        if (lookingForIndex < showMeList.length) {
            updateChallengeUI();
        } else {
            // All 4 challenges completed successfully!
            playSound(jinglebells);
            if (questionElem) {
                questionElem.innerHTML = "🎉 Congratulations! All 4 Gestures Mastered! 🎉";
            }
            if (gestureHintElem) {
                gestureHintElem.innerHTML = "<span class='text-success fw-bold'>Redirecting to Leaderboard...</span>";
            }
            if (challengeProgressBar) {
                challengeProgressBar.style.width = "100%";
                challengeProgressBar.classList.remove("bg-info");
                challengeProgressBar.classList.add("bg-success");
            }
            await stop();

            if (restartBtn) restartBtn.style.display = "inline-block";
            if (startBtn) startBtn.style.display = "none";

            // Post final score (4/4) to Render database and redirect
            try {
                const response = await fetch('/api/score', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ score: 4 })
                });
                const data = await response.json();
                if (data.success) {
                    setTimeout(() => {
                        window.location.href = '/scoreboard';
                    }, 1500);
                }
            } catch (e) {
                console.warn('Failed to post final score:', e);
            }
        }
    }

    async function stop() {
        isRunning = false;
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        if (hudScanner) hudScanner.style.display = "none";
        if (canvas) canvas.style.display = "none";
        if (idleScreen) idleScreen.style.display = "flex";
        if (cameraHudBottom) cameraHudBottom.style.setProperty("display", "none", "important");
        if (hudStatusText) hudStatusText.textContent = "CAMERA STANDBY";
        if (hudStatusDot) hudStatusDot.style.backgroundColor = "#64748b";
        if (personIndicator) {
            personIndicator.className = "badge bg-secondary font-monospace";
            personIndicator.textContent = "👤 Person: Off";
        }

        if (startBtn) startBtn.style.display = "inline-block";
        if (stopBtn) stopBtn.style.display = "none";
    }

    if (startBtn) {
        startBtn.addEventListener("click", async function () {
            await init();
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener("click", async function () {
            if (startBtn) startBtn.style.display = "inline-block";
            if (correctElement) correctElement.style.display = "none";
            if (incorrectElement) incorrectElement.style.display = "none";
            if (stopBtn) stopBtn.style.display = "none";
            await stop();
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener("click", async function () {
            await stop();
            lookingForIndex = 0;
            restartBtn.style.display = "none";
            updateChallengeUI();
            await init();
        });
    }

    // Initial setup
    updateChallengeUI();
    init();
});