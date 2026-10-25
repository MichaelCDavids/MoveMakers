// MoveMakers - Teachable Machine Pose Model & HUD Controller
// ProjectCodeX December Hackathon

window.addEventListener("DOMContentLoaded", function () {
    let soundMuted = false;
    const bell = new Audio('/audio/bell.mp3');
    const jinglebells = new Audio('/audio/jinglebells.mp3');
    const error = new Audio('/audio/error.mp3');

    function playSound(audio) {
        if (!soundMuted && audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    }

    const URL = "https://teachablemachine.withgoogle.com/models/C8EwO48qN/";
    let model, webcam, ctx, maxPredictions;

    // HUD Elements
    const canvas = document.getElementById("canvas");
    const idleScreen = document.getElementById("camera-idle-screen");
    const hudScanner = document.getElementById("hud-scanner");
    const hudStatusText = document.getElementById("hud-status-text");
    const hudStatusDot = document.getElementById("hud-status-dot");
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

    const showMeList = ["Hungry", "I See You", "Quiet Down", "Get Busy"];
    const gestureHints = [
        "Hint: Bring your hand up towards your mouth as if eating.",
        "Hint: Point your index & middle fingers towards your eyes (peace style).",
        "Hint: Hold your index finger upright in front of your lips (shh gesture).",
        "Hint: Raise both hands up and groove to the music!"
    ];
    const gestureEmojis = ["🍽️", "👀", "🤫", "💃"];

    let lookingForIndex = 0;
    let isRunning = false;
    let isFlipped = true;

    // Toggle Audio
    if (audioBtn) {
        audioBtn.addEventListener("click", function () {
            soundMuted = !soundMuted;
            audioBtn.textContent = soundMuted ? "🔇 Sound OFF" : "🔊 Sound ON";
            audioBtn.classList.toggle("bg-secondary", !soundMuted);
            audioBtn.classList.toggle("bg-warning", soundMuted);
        });
    }

    // Toggle Camera Flip
    if (mirrorBtn) {
        mirrorBtn.addEventListener("click", function () {
            isFlipped = !isFlipped;
            if (canvas) {
                canvas.style.transform = isFlipped ? "scaleX(1)" : "scaleX(-1)";
            }
        });
    }

    // Interactive Test Buttons
    document.querySelectorAll(".sim-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            const g = this.getAttribute("data-gesture");
            checkForGesture(g);
        });
    });

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
                const pct = ((lookingForIndex + 1) / showMeList.length) * 100;
                challengeProgressBar.style.width = `${pct}%`;
            }

            // Highlight target card
            for (let i = 0; i < 4; i++) {
                const card = document.getElementById(`pred-card-${i}`);
                if (card) {
                    card.classList.toggle("active-target", i === lookingForIndex);
                }
            }
        }
    }

    async function init() {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        try {
            if (hudStatusText) hudStatusText.textContent = "INITIALIZING MODEL...";
            if (hudStatusDot) hudStatusDot.style.backgroundColor = "#f59e0b";

            if (!model) {
                model = await tmPose.load(modelURL, metadataURL);
                maxPredictions = model.getTotalClasses();
            }

            const size = 360;
            webcam = new tmPose.Webcam(size, size, isFlipped);

            try {
                if (hudStatusText) hudStatusText.textContent = "REQUESTING CAMERA...";
                await webcam.setup();
                await webcam.play();
                isRunning = true;

                if (hudStatusText) hudStatusText.textContent = "LIVE • POSE TRACKING";
                if (hudStatusDot) hudStatusDot.style.backgroundColor = "#22c55e";
                if (hudScanner) hudScanner.style.display = "block";
                if (idleScreen) idleScreen.style.display = "none";
                if (canvas) canvas.style.display = "block";

                window.requestAnimationFrame(loop);
            } catch (cameraErr) {
                console.warn("Camera setup failed or denied:", cameraErr);
                if (hudStatusText) hudStatusText.textContent = "SIMULATION READY";
                if (hudStatusDot) hudStatusDot.style.backgroundColor = "#38bdf8";
                if (alignTextElem) {
                    alignTextElem.innerHTML = '<span class="text-warning">Camera unavailable. You can use the gesture test buttons below to play!</span>';
                }
            }

            if (canvas) {
                canvas.width = size;
                canvas.height = size;
                ctx = canvas.getContext("2d");
            }

            if (startBtn) startBtn.style.display = "none";
            if (stopBtn) stopBtn.style.display = "inline-block";
            if (restartBtn) restartBtn.style.display = "none";

            updateChallengeUI();
        } catch (err) {
            console.error("Init failed:", err);
            if (hudStatusText) hudStatusText.textContent = "MODEL ERROR";
            if (hudStatusDot) hudStatusDot.style.backgroundColor = "#ef4444";
        }
    }

    async function loop() {
        if (!isRunning) return;
        if (webcam && webcam.canvas) {
            webcam.update();
            await predict();
        }
        window.requestAnimationFrame(loop);
    }

    async function predict() {
        if (!model || !webcam || !webcam.canvas) return;

        try {
            const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
            const prediction = await model.predict(posenetOutput);

            let highestProbability = 0;
            let gestureName = "";

            drawPose(pose);

            // Update real-time prediction meter cards
            for (let i = 0; i < maxPredictions; i++) {
                const prob = prediction[i].probability;
                const pct = Math.round(prob * 100);

                const bar = document.getElementById(`pred-bar-${i}`);
                const text = document.getElementById(`pred-pct-${i}`);
                if (bar) bar.style.width = `${pct}%`;
                if (text) text.textContent = `${pct}%`;

                if (prob > highestProbability) {
                    highestProbability = prob;
                    gestureName = prediction[i].className;
                }
            }

            // Real-time confidence threshold
            if (highestProbability >= 0.85) {
                checkForGestureThrottled(gestureName);
            }
        } catch (e) {
            // Drop frame gracefully
        }
    }

    function drawPose(pose) {
        if (webcam && webcam.canvas && ctx) {
            ctx.drawImage(webcam.canvas, 0, 0, canvas.width, canvas.height);
            if (pose) {
                const minPartConfidence = 0.5;
                tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
                tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
            }
        }
    }

    async function stop() {
        isRunning = false;
        if (webcam) {
            try { await webcam.stop(); } catch (e) {}
        }
        if (hudScanner) hudScanner.style.display = "none";
        if (canvas) canvas.style.display = "none";
        if (idleScreen) idleScreen.style.display = "flex";
        if (hudStatusText) hudStatusText.textContent = "CAMERA STANDBY";
        if (hudStatusDot) hudStatusDot.style.backgroundColor = "#64748b";

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

    function currentlyLookingFor() {
        if (lookingForIndex < showMeList.length) {
            return showMeList[lookingForIndex];
        }
        return "";
    }

    async function checkForGesture(gesture) {
        if (!gesture || gesture === "Nothing") return;

        const lookingFor = currentlyLookingFor();
        const formatted = getModelName(gesture);

        if (lookingFor !== "" && formatted === lookingFor) {
            if (webcam && webcam.pause) {
                try { await webcam.pause(); } catch (e) {}
            }
            playSound(bell);

            if (incorrectElement) incorrectElement.style.display = "none";
            if (correctElement) {
                correctElement.style.display = "block";
                if (correctHeaderElement) {
                    correctHeaderElement.innerHTML = `Great job! You made the <strong>${lookingFor}</strong> gesture!`;
                }
            }

            setTimeout(function () {
                if (correctElement) correctElement.style.display = "none";
            }, 2500);

            setTimeout(async function () {
                await advanceQuestion();
            }, 2000);

        } else if (lookingFor !== "") {
            if (incorrectElement) {
                incorrectElement.style.display = "block";
                if (incorrectHeaderElement) {
                    incorrectHeaderElement.innerHTML = `Pose not recognized for <strong>${lookingFor}</strong>`;
                }
            }
            playSound(error);

            setTimeout(function () {
                if (incorrectElement) incorrectElement.style.display = "none";
            }, 2000);
        }
    }

    async function advanceQuestion() {
        lookingForIndex++;
        if (lookingForIndex < showMeList.length) {
            updateChallengeUI();
            if (webcam && webcam.play) {
                try { await webcam.play(); } catch (e) {}
            }
        } else {
            // Victory!
            playSound(jinglebells);
            if (questionElem) {
                questionElem.innerHTML = "🎉 Congratulations! You Mastered All Gestures! 🎉";
            }
            if (gestureHintElem) {
                gestureHintElem.innerHTML = "<span class='text-success fw-bold'>All 4 challenges completed. Check your score on the Leaderboard!</span>";
            }
            if (challengeProgressBar) {
                challengeProgressBar.style.width = "100%";
                challengeProgressBar.classList.remove("bg-info");
                challengeProgressBar.classList.add("bg-success");
            }
            await stop();

            if (restartBtn) restartBtn.style.display = "inline-block";
            if (startBtn) startBtn.style.display = "none";

            // Submit completed score to database
            fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score: 4 })
            }).catch(e => console.warn(e));
        }
    }

    const checkForGestureThrottled = _.throttle(checkForGesture, 2500);

    // Initial setup
    updateChallengeUI();
});