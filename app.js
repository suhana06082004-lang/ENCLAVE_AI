document.addEventListener("DOMContentLoaded", async () => {
    // Buttons
    const btnEncrypt = document.getElementById("btn-encrypt");
    const btnHack = document.getElementById("btn-hack");
    const btnKill = document.getElementById("btn-kill");
    
    // UI Elements
    const networkLogs = document.getElementById("network-logs");
    const enclaveLogs = document.getElementById("enclave-logs");
    const panelEnclave = document.getElementById("panel-enclave");
    const enclaveBadge = document.getElementById("enclave-badge");
    const cpuIcon = document.getElementById("cpu-icon");
    const responseBox = document.getElementById("response-box");
    const aiResult = document.getElementById("ai-result");
    const clientKeyDisplay = document.getElementById("client-key-display");
    const aiKeyDisplay = document.getElementById("ai-key-display");
    const latencyMetric = document.getElementById("latency-metric");
    const matrixCanvas = document.getElementById("matrix-canvas");
    const cloudSelector = document.getElementById("cloud-selector");
    
    // Biometric Modal
    const bioModal = document.getElementById("biometric-modal");
    const fingerprint = document.getElementById("fingerprint");

    // The massive dummy dataset
    const massiveDataset = `PT_ID,AGE,BP_SYS,BP_DIA,CHOL,ECG_RESULT,GENE_MARKER\nPT-4921,56,140,90,240,ANOMALY_DETECTED,BRCA_NEG\n`.repeat(100);

    // Pipeline State
    let aesClientKey = null;
    let aesAiKey = null;
    let isActivePipeline = false;
    let isRevoked = false;
    let currentCiphertext = "";

    function buf2hex(buffer) { return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join(''); }
    
    // Interruptible Wait Function allowing Kill Switch abort
    const wait = async (ms) => {
        const interval = 50;
        let elapsed = 0;
        while(elapsed < ms) {
            if(isRevoked) throw new Error("REVOKED");
            await new Promise(r => setTimeout(r, interval));
            elapsed += interval;
        }
    };

    // Matrix Logic
    const ctx = matrixCanvas.getContext('2d');
    matrixCanvas.width = 400; matrixCanvas.height = 300;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";
    const drops = new Array(Math.floor(matrixCanvas.width / 10)).fill(1);
    let matrixInterval;

    function drawMatrix() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
        ctx.fillStyle = '#39ff14';
        ctx.font = '10px monospace';
        for(let i = 0; i < drops.length; i++) {
            ctx.fillText(chars.charAt(Math.floor(Math.random() * chars.length)), i * 10, drops[i] * 10);
            if(drops[i] * 10 > matrixCanvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
    }

    function toggleMatrix(show) {
        matrixCanvas.style.opacity = show ? 1 : 0;
        if(show) matrixInterval = setInterval(drawMatrix, 33);
        else clearInterval(matrixInterval);
    }

    // Init
    async function initKeys() {
        aesClientKey = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
        clientKeyDisplay.innerText = buf2hex(await window.crypto.subtle.exportKey("raw", aesClientKey)).substring(0, 32) + "...";
        aesAiKey = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
        aiKeyDisplay.innerText = buf2hex(await window.crypto.subtle.exportKey("raw", aesAiKey)).substring(0, 32) + "...";
    }
    await initKeys();

    function log(container, msg, cssClass="gray") {
        container.innerHTML += `<div class="log ${cssClass} typing-effect">${msg}</div>`;
        container.scrollTop = container.scrollHeight;
    }

    function setLatency(ms) {
        latencyMetric.innerText = `+${ms.toFixed(2)}ms`;
        latencyMetric.style.color = ms > 0 ? "var(--accent)" : "inherit";
    }

    function getCloudString() {
        const sel = cloudSelector.value;
        if(sel === "AWS_NITRO") return "AWS Nitro Hypervisor";
        if(sel === "GCP_SPACE") return "GCP Contigency Net";
        return "Azure SGX Router";
    }

    // -------------------------------------------------------------
    // FEATURE 1: Biometric Verification Sequence
    // -------------------------------------------------------------
    function verifyBiometrics() {
        return new Promise((resolve) => {
            bioModal.style.display = 'flex';
            fingerprint.onclick = async () => {
                fingerprint.classList.remove("pulse-scaning");
                fingerprint.classList.add("verified");
                fingerprint.innerText = "check_circle";
                await new Promise(r => setTimeout(r, 800));
                bioModal.style.display = 'none';
                resolve(true);
            };
        });
    }

    // -------------------------------------------------------------
    // FEATURE 2: Rogue RAM Hack Simulation
    // -------------------------------------------------------------
    btnHack.addEventListener("click", () => {
        if(!isActivePipeline) return log(networkLogs, `[ERROR] No active memory payload.`, "gray");
        log(networkLogs, ``, "gray");
        log(networkLogs, `[ROOT ACQUIRED] >> sudo cat /dev/mem | grep '${getCloudString()}'`, "primary");
        log(networkLogs, `[DUMPING HYPERVISOR RAM]:`, "red");
        let garbage = "";
        for(let i=0; i<300; i++) garbage += chars.charAt(Math.floor(Math.random() * chars.length));
        log(networkLogs, `<span style="word-break:break-all; font-size:10px;">${currentCiphertext || garbage}</span>`, "gray");
        log(networkLogs, `[ACCESS DENIED] Payload hardware locked. Data completely unreadable.`, "green");
    });

    // -------------------------------------------------------------
    // FEATURE 3: Kill Switch Revocation
    // -------------------------------------------------------------
    btnKill.addEventListener("click", () => {
        if(!isActivePipeline) return;
        isRevoked = true;
        btnKill.disabled = true;
        btnKill.innerHTML = `<span class="material-symbols-outlined">gavel</span> REVOKED`;
    });

    // -------------------------------------------------------------
    // THE CORE SECURE PIPELINE
    // -------------------------------------------------------------
    btnEncrypt.addEventListener("click", async () => {
        // Run Biometrics First
        await verifyBiometrics();

        // Reset Pipeline States
        isActivePipeline = true;
        isRevoked = false;
        btnKill.disabled = false;
        btnKill.innerHTML = `<span class="material-symbols-outlined">block</span> REVOKE`;
        responseBox.style.display = "none";
        aiResult.innerHTML = "";
        btnEncrypt.disabled = true;
        btnEncrypt.innerHTML = `<span class="material-symbols-outlined pulse-glow">sync</span> PIPELINE ACTIVE...`;
        
        try {
            // 1. Encrypt Bulk Data
            setLatency(0.42);
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const cipherBuffer = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, aesClientKey, new TextEncoder().encode(massiveDataset));
            currentCiphertext = buf2hex(cipherBuffer);

            // 2. Network Transmit
            log(networkLogs, `> [TCP DUMP] Routing securely to ${getCloudString()}`, "gray");
            await wait(600);
            log(networkLogs, `> Large batch ingress detected.`, "yellow");
            setLatency(1.05);
            await wait(800);
            log(networkLogs, `[ENCRYPTED ARCHIVE]: ${currentCiphertext.substring(0, 80)}...<br>[4.2MB CIPHERTEXT]`, "gray");

            // 3. Enclave Flow
            await wait(1200);
            log(enclaveLogs, `> Receiving payload via ${getCloudString()}...`);
            await wait(800);
            log(enclaveLogs, `> Validating Multi-Party Signatures...`, "yellow");
            await wait(1200);
            log(enclaveLogs, `[✓] Hospital Data Key Verified.`);
            log(enclaveLogs, `[✓] AI Startup Weights Verified.`);
            
            await wait(1000);
            log(enclaveLogs, `[ATTESTATION] SUCCESS. Hardware is secure.`, "green");
            
            // Unlock Sequence
            panelEnclave.classList.remove("enclave-locked");
            panelEnclave.classList.add("enclave-open");
            enclaveBadge.innerText = "VAULT OPEN";
            cpuIcon.innerText = "memory";
            toggleMatrix(true);
            setLatency(2.14);

            await wait(1000);
            log(enclaveLogs, `> L3 CACHE: Buffering dataset blindly in memory...`, "primary");
            
            // Decode Simulation (Check for revocation!)
            const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, aesClientKey, cipherBuffer);
            
            await wait(1200);
            log(enclaveLogs, `[BLIND DECRYPT OK]: Parsed 12,450 rows inside CPU Sandbox...`, "gray");

            await wait(1500);
            log(enclaveLogs, `> Processing AI Inference across dataset...`, "yellow");
            await wait(2000); // Massive workload simulation
            
            // Re-encrypt Result
            log(enclaveLogs, `> AI Batch Analysis Complete. Re-encrypting output...`, "gray");
            const resCipher = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: window.crypto.getRandomValues(new Uint8Array(12)) }, aesClientKey, new TextEncoder().encode("DONE"));
            setLatency(2.81);

            await wait(1000);
            log(enclaveLogs, `> SECURELY PURGING ALL L3 RAM...`, "red");
            toggleMatrix(false);
            
            await wait(800);
            log(enclaveLogs, `> V-RAM ZEROED. KNOWLEDGE SECURED.`, "green");

            // Lock Sequence
            panelEnclave.classList.remove("enclave-open");
            panelEnclave.classList.add("enclave-locked");
            enclaveBadge.innerText = "VAULT LOCKED";
            cpuIcon.innerText = "lock";

            // Net Out
            log(networkLogs, `> Outgress payload via ${getCloudString()}: ${buf2hex(resCipher).substring(0, 40)}...`, "gray");

            // -------------------------------------------------------------
            // FEATURE 4: Live Analytics Graph Rendering
            // -------------------------------------------------------------
            responseBox.style.display = "block";
            setLatency(0.00);
            aiResult.innerHTML = `
                <div style="margin-bottom:10px; color:#fff;">BATCH PROCESSED: 12,450 RECORDS</div>
                <div class="chart-container">
                    <div class="chart-row">
                        <div class="chart-label">Healthy Rhythm</div>
                        <div class="chart-bar-wrap"><div class="chart-bar bar-normal" id="bar-normal"></div></div>
                        <div class="chart-val">12035</div>
                    </div>
                    <div class="chart-row">
                        <div class="chart-label">Arrhythmias</div>
                        <div class="chart-bar-wrap"><div class="chart-bar bar-warning" id="bar-warn"></div></div>
                        <div class="chart-val">412</div>
                    </div>
                    <div class="chart-row">
                        <div class="chart-label">Critical Thrombosis</div>
                        <div class="chart-bar-wrap"><div class="chart-bar bar-critical" id="bar-crit"></div></div>
                        <div class="chart-val">3</div>
                    </div>
                </div>
            `;
            // Trigger animation
            setTimeout(() => {
                document.getElementById('bar-normal').style.width = '96%';
                document.getElementById('bar-warn').style.width = '3.5%';
                document.getElementById('bar-crit').style.width = '0.5%';
            }, 50);

        } catch (e) {
            if(e.message === "REVOKED") {
                // EXTREME ABORT SEQUENCE
                log(enclaveLogs, `[CRITICAL ALERT] ACCESS REVOKED BY DATA OWNER!`, "red");
                log(enclaveLogs, `[CRITICAL ALERT] COMMENCING EMERGENCY V-RAM SHRED!`, "red");
                log(networkLogs, `[CONNECTION TERMINATED BY CLIENT KEY MANAGEMENT]`, "red");
                toggleMatrix(false);
                panelEnclave.classList.remove("enclave-open");
                panelEnclave.classList.add("enclave-locked");
                enclaveBadge.innerText = "ACCESS REVOKED";
                cpuIcon.innerText = "gavel";
                setLatency(0.00);
            }
        }

        // Cleanup
        btnEncrypt.innerHTML = `<span class="material-symbols-outlined">lock</span> ENCRYPT & INJECT ARCHIVE`;
        btnEncrypt.disabled = false;
        btnKill.disabled = true;
        isActivePipeline = false;
        
        setTimeout(() => {
            if(isRevoked) { enclaveBadge.innerText = "VAULT LOCKED"; cpuIcon.innerText = "lock"; }
            networkLogs.innerHTML = '<div class="log gray">> Monitoring packet ingress across subnets...</div>';
            enclaveLogs.innerHTML = '<div class="log gray">[INIT] Awaiting Attestation Handshake...</div>';
            responseBox.style.display = 'none';
            fingerprint.innerText = "fingerprint";
            fingerprint.className = "material-symbols-outlined fingerprint-icon pulse-scaning";
        }, 30000);
    });
});
