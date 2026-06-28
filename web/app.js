let nextId = 1;
let sessionId;
let initialized = false;
let presets = [];

const elements = {
  setupStatus: document.querySelector("#setupStatus"),
  preset: document.querySelector("#preset"),
  topic: document.querySelector("#topic"),
  audience: document.querySelector("#audience"),
  location: document.querySelector("#location"),
  tone: document.querySelector("#tone"),
  generateButton: document.querySelector("#generateButton"),
  researchButton: document.querySelector("#researchButton"),
  voiceButton: document.querySelector("#voiceButton"),
  kitTitle: document.querySelector("#kitTitle"),
  posterImage: document.querySelector("#posterImage"),
  imagePlaceholder: document.querySelector("#imagePlaceholder"),
  posterMeta: document.querySelector("#posterMeta"),
  scoreValue: document.querySelector("#scoreValue"),
  scoreLabel: document.querySelector("#scoreLabel"),
  positioningText: document.querySelector("#positioningText"),
  langfuseStatus: document.querySelector("#langfuseStatus"),
  insightsList: document.querySelector("#insightsList"),
  sourcesList: document.querySelector("#sourcesList"),
  voiceScript: document.querySelector("#voiceScript"),
  voiceAudio: document.querySelector("#voiceAudio"),
  voiceMeta: document.querySelector("#voiceMeta"),
  captionsList: document.querySelector("#captionsList"),
  sourceTemplate: document.querySelector("#sourceTemplate"),
};

function setBusy(isBusy, label = "Working...") {
  for (const button of [
    elements.generateButton,
    elements.researchButton,
    elements.voiceButton,
  ]) {
    button.disabled = isBusy;
  }

  if (isBusy) {
    setStatus("warn", label);
  }
}

function setStatus(kind, message) {
  const dotClass =
    kind === "ok"
      ? "status-dot--ok"
      : kind === "error"
        ? "status-dot--error"
        : kind === "warn"
          ? "status-dot--warn"
          : "status-dot--idle";

  elements.setupStatus.innerHTML = `<span class="status-dot ${dotClass}"></span><span>${message}</span>`;
}

function parseRpcResponse(text) {
  if (!text) {
    return null;
  }

  if (text.startsWith("event:")) {
    const line = text.split("\n").find((part) => part.startsWith("data: "));
    return JSON.parse(line.slice(6));
  }

  return JSON.parse(text);
}

async function rpc(method, params = {}, notification = false) {
  const body = notification
    ? { jsonrpc: "2.0", method, params }
    : { jsonrpc: "2.0", id: nextId++, method, params };

  const response = await fetch("/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(sessionId ? { "mcp-session-id": sessionId } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!sessionId) {
    sessionId = response.headers.get("mcp-session-id");
  }

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`MCP HTTP ${response.status}: ${text}`);
  }

  const parsed = parseRpcResponse(text);

  if (parsed?.error) {
    throw new Error(parsed.error.message || JSON.stringify(parsed.error));
  }

  return parsed;
}

async function initializeMcp() {
  if (initialized) {
    return;
  }

  await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "promo-kit-web-ui", version: "1.0.0" },
  });
  await rpc("notifications/initialized", {}, true);
  initialized = true;
}

async function callTool(name, args = {}) {
  await initializeMcp();
  const response = await rpc("tools/call", { name, arguments: args });

  if (response?.result?.isError) {
    throw new Error(response.result.content?.[0]?.text || `${name} failed`);
  }

  return response?.result?.structuredContent;
}

function selectedBrief() {
  return {
    topic: elements.topic.value.trim(),
    audience: elements.audience.value.trim(),
    location: elements.location.value.trim(),
    tone: elements.tone.value.trim() || "energetic and practical",
  };
}

function renderPresets(items) {
  presets = items;
  elements.preset.innerHTML = '<option value="">Custom brief</option>';

  for (const preset of items) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    elements.preset.append(option);
  }
}

function applyPreset(presetId) {
  const preset = presets.find((item) => item.id === presetId);

  if (!preset) {
    return;
  }

  elements.topic.value = preset.topic;
  elements.audience.value = preset.audience;
  elements.location.value = preset.location;
  elements.tone.value = preset.tone;
}

function renderSetup(setup) {
  const configured = setup.providers
    .filter((provider) => provider.configured)
    .map((provider) => provider.name)
    .join(", ");

  if (setup.demoReady) {
    setStatus("ok", `MCP ready. Active providers: ${configured}`);
    return;
  }

  setStatus("error", `Missing required keys: ${setup.missingRequired.join(", ")}`);
}

function renderPoster(poster) {
  elements.posterImage.removeAttribute("src");
  elements.posterImage.style.display = "none";
  elements.imagePlaceholder.style.display = "grid";

  if (poster?.imageUrl) {
    elements.posterImage.src = poster.imageUrl;
    elements.posterImage.style.display = "block";
    elements.imagePlaceholder.style.display = "none";
  }

  const attribution = poster?.attribution || poster?.provider || "";
  elements.posterMeta.textContent = attribution
    ? `${poster.provider} visual. ${attribution}`
    : "";
}

function renderResearch(research) {
  elements.insightsList.innerHTML = "";
  elements.sourcesList.innerHTML = "";

  for (const insight of research?.insights || []) {
    const li = document.createElement("li");
    li.textContent = insight;
    elements.insightsList.append(li);
  }

  for (const source of research?.sources || []) {
    const node = elements.sourceTemplate.content.cloneNode(true);
    const link = node.querySelector("a");
    const summary =
      source.summary.length > 260
        ? `${source.summary.slice(0, 257).trim()}...`
        : source.summary;
    link.href = source.url;
    link.querySelector("strong").textContent = source.title;
    link.querySelector("span").textContent = summary;
    elements.sourcesList.append(node);
  }
}

function renderVoiceover(voiceover) {
  elements.voiceScript.textContent = voiceover?.script || "";
  elements.voiceAudio.removeAttribute("src");
  elements.voiceAudio.style.display = "none";

  if (voiceover?.status === "generated" && voiceover.audioUrl) {
    elements.voiceAudio.src = voiceover.audioUrl;
    elements.voiceAudio.style.display = "block";
    elements.voiceMeta.textContent = `Generated with ElevenLabs voice ${voiceover.voiceId}.`;
    return;
  }

  elements.voiceMeta.textContent = voiceover?.error
    ? `Audio unavailable: ${voiceover.error}`
    : "Audio has not been generated yet.";
}

function renderCaptions(captions = []) {
  elements.captionsList.innerHTML = "";

  for (const caption of captions) {
    const div = document.createElement("div");
    div.className = "caption";
    div.textContent = caption;
    elements.captionsList.append(div);
  }
}

function renderEvaluation(evaluation, langfuse) {
  if (!evaluation) {
    elements.scoreValue.textContent = "--";
    elements.scoreLabel.textContent = "No score yet";
    elements.langfuseStatus.textContent = "";
    return;
  }

  elements.scoreValue.textContent = Math.round(evaluation.overallScore * 100);
  elements.scoreLabel.textContent = `${evaluation.verdict.replace("_", " ")} by ${evaluation.judge}`;

  const langfuseText = langfuse?.sent
    ? `Langfuse trace sent: ${langfuse.traceId}`
    : langfuse?.dryRun
      ? `Langfuse dry run: ${langfuse.scoreCount || 0} scores prepared`
      : "Langfuse disabled for this run";

  elements.langfuseStatus.textContent = langfuseText;
}

function renderPromoKit(result) {
  const promoKit = result.promoKit || result;
  elements.kitTitle.textContent = promoKit.title || "Promo kit";
  elements.positioningText.textContent = promoKit.positioning || "";
  renderPoster(promoKit.poster);
  renderResearch(promoKit.research);
  renderVoiceover(promoKit.voiceover);
  renderCaptions(promoKit.captions);
  renderEvaluation(result.evaluation, result.langfuse);
}

function renderResearchOnly(research) {
  elements.kitTitle.textContent = `${research.topic} research`;
  elements.positioningText.textContent = research.angle;
  renderResearch(research);
  renderEvaluation(null, null);
}

async function loadInitialState() {
  try {
    await initializeMcp();
    const [setup, presetResult] = await Promise.all([
      callTool("check_setup"),
      callTool("list_demo_presets"),
    ]);
    renderSetup(setup);
    renderPresets(presetResult.presets);
  } catch (error) {
    setStatus(
      "error",
      error instanceof Error
        ? error.message
        : "Could not connect to the MCP server"
    );
  }
}

elements.preset.addEventListener("change", (event) => {
  applyPreset(event.target.value);
});

elements.generateButton.addEventListener("click", async () => {
  try {
    setBusy(true, "Generating promo kit...");
    const presetId = elements.preset.value;
    const result = presetId
      ? await callTool("run_demo_preset", { preset: presetId })
      : await callTool("create_and_evaluate_promo_kit", selectedBrief());
    renderPromoKit(result);
    setStatus("ok", "Promo kit generated through MCP.");
  } catch (error) {
    setStatus("error", error instanceof Error ? error.message : String(error));
  } finally {
    setBusy(false);
  }
});

elements.researchButton.addEventListener("click", async () => {
  try {
    setBusy(true, "Researching with Exa...");
    const result = await callTool("research_market", {
      ...selectedBrief(),
      maxResults: 3,
    });
    renderResearchOnly(result);
    setStatus("ok", "Research returned from Exa through MCP.");
  } catch (error) {
    setStatus("error", error instanceof Error ? error.message : String(error));
  } finally {
    setBusy(false);
  }
});

elements.voiceButton.addEventListener("click", async () => {
  try {
    setBusy(true, "Generating ElevenLabs voiceover...");
    const brief = selectedBrief();
    const result = await callTool("generate_voiceover", {
      script: `Join us for ${brief.topic} in ${brief.location}. Bring a friend and leave with something useful.`,
      voiceId: "TX3LPaxmHKxFdv7VOQHJ",
      language: "en",
    });
    renderVoiceover(result);
    setStatus(
      result.status === "generated" ? "ok" : "warn",
      result.status === "generated"
        ? "Voiceover generated through MCP."
        : "Voiceover script returned; audio unavailable."
    );
  } catch (error) {
    setStatus("error", error instanceof Error ? error.message : String(error));
  } finally {
    setBusy(false);
  }
});

loadInitialState();
