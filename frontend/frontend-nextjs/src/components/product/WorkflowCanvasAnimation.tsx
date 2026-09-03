"use client";

import { useEffect, useState } from "react";

type DemoPhase =
  | "typingRequest"
  | "requestSent"
  | "assistantTyping"
  | "assistantReply"
  | "typingConfirm"
  | "confirmSent"
  | "generating"
  | "ready"
  | "applied";

type NodeProps = {
  className: string;
  delay: string;
  title: string;
  detail?: string;
  tone?: "yellow" | "blue";
  input?: boolean;
  output?: boolean;
};

const requestText = "Build a lead follow-up workflow with human approval.";
const confirmText = "Yes, create it.";

function CanvasNode({ className, delay, title, detail, tone, input, output }: NodeProps) {
  return (
    <div className={`workflow-chat-node ${className}`} style={{ animationDelay: delay }}>
      {input && <span className="workflow-chat-handle workflow-chat-handle-left" />}
      {output && <span className="workflow-chat-handle workflow-chat-handle-right" />}
      <div className="flex items-center gap-1.5 rounded-[7px] bg-[#676765] px-2.5 py-2 text-white/90">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m4 12 15-7-4.5 14-3-5-5.5-2Z" strokeLinejoin="round" />
          <path d="m11.5 14 2.5-3" strokeLinecap="round" />
        </svg>
        <span className="min-w-0 flex-1 truncate text-[8px] font-light">{title}</span>
        <span className="rounded bg-black/10 px-1 text-[9px] text-white/55">⌃</span>
      </div>
      {detail && <div className={`workflow-chat-node-detail ${tone === "yellow" ? "workflow-chat-yellow" : "workflow-chat-blue"}`}>{detail}</div>}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1 py-1.5">
      {[0, 1, 2].map((index) => (
        <span key={index} className="h-1 w-1 rounded-full bg-white/55 animate-bounce" style={{ animationDelay: `${index * 140}ms` }} />
      ))}
    </span>
  );
}

export function WorkflowAnimation() {
  const [phase, setPhase] = useState<DemoPhase>("typingRequest");
  const [typedRequest, setTypedRequest] = useState("");
  const [typedConfirm, setTypedConfirm] = useState("");

  const requestVisible = phase !== "typingRequest";
  const replyVisible = ["assistantReply", "typingConfirm", "confirmSent", "generating", "ready"].includes(phase);
  const confirmVisible = ["confirmSent", "generating", "ready"].includes(phase);
  const readyVisible = phase === "ready";
  const graphVisible = phase === "applied";

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("applied");
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let requestTimer: ReturnType<typeof setInterval> | undefined;
    let confirmTimer: ReturnType<typeof setInterval> | undefined;

    if (phase === "typingRequest") {
      let index = 0;
      requestTimer = setInterval(() => {
        index += 1;
        setTypedRequest(requestText.slice(0, index));
        if (index >= requestText.length) {
          clearInterval(requestTimer);
          timer = setTimeout(() => setPhase("requestSent"), 550);
        }
      }, 24);
    } else if (phase === "requestSent") {
      timer = setTimeout(() => setPhase("assistantTyping"), 500);
    } else if (phase === "assistantTyping") {
      timer = setTimeout(() => setPhase("assistantReply"), 1250);
    } else if (phase === "assistantReply") {
      timer = setTimeout(() => setPhase("typingConfirm"), 1200);
    } else if (phase === "typingConfirm") {
      let index = 0;
      confirmTimer = setInterval(() => {
        index += 1;
        setTypedConfirm(confirmText.slice(0, index));
        if (index >= confirmText.length) {
          clearInterval(confirmTimer);
          timer = setTimeout(() => setPhase("confirmSent"), 400);
        }
      }, 48);
    } else if (phase === "confirmSent") {
      timer = setTimeout(() => setPhase("generating"), 600);
    } else if (phase === "generating") {
      timer = setTimeout(() => setPhase("ready"), 1800);
    } else if (phase === "ready") {
      timer = setTimeout(() => setPhase("applied"), 3600);
    } else if (phase === "applied") {
      timer = setTimeout(() => {
        setTypedRequest("");
        setTypedConfirm("");
        setPhase("typingRequest");
      }, 4600);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (requestTimer) clearInterval(requestTimer);
      if (confirmTimer) clearInterval(confirmTimer);
    };
  }, [phase]);

  return (
    <div className="workflow-chat-demo relative h-full w-full overflow-hidden rounded-[16px] bg-[#343432] font-sans text-white">
      <style>{`
        .workflow-chat-canvas {
          background-color: #353533;
          background-image: radial-gradient(rgba(226,225,219,.19) .62px, transparent .75px);
          background-size: 17px 17px;
        }
        .workflow-chat-node {
          position: absolute;
          width: clamp(78px, 16.2%, 128px);
          overflow: visible;
          border: 3px solid #a6a6a3;
          border-radius: 9px;
          background: #676765;
          box-shadow: 0 7px 14px rgba(0,0,0,.24);
          opacity: 1;
          transform: translateY(8px) scale(.97);
        }
        .workflow-chat-node-detail {
          display: flex;
          align-items: center;
          min-height: 30px;
          padding: 6px 9px;
          border-radius: 0 0 6px 6px;
          color: #252525;
          font-size: 8px;
          font-weight: 500;
        }
        .workflow-chat-yellow { background: #fff0ad; }
        .workflow-chat-blue { background: #cfe4ff; }
        .workflow-chat-handle {
          position: absolute;
          top: 50%;
          width: 8px;
          height: 8px;
          border: 2px solid #343432;
          border-radius: 50%;
          background: #d9d8d1;
          transform: translateY(-50%);
          z-index: 3;
        }
        .workflow-chat-handle-left { left: -7px; }
        .workflow-chat-handle-right { right: -7px; }
        .workflow-chat-canvas.is-applied .workflow-chat-node { animation: workflow-chat-node-in 430ms cubic-bezier(.16,1,.3,1) forwards; }
        .workflow-chat-edge { fill: none; stroke: #f2f1eb; stroke-width: 1.6; stroke-dasharray: 5 4; opacity: 0; }
        .workflow-chat-canvas.is-applied .workflow-chat-edge { animation: workflow-chat-edge-flow 1.3s linear infinite; opacity: 1; }
        @keyframes workflow-chat-node-in { to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes workflow-chat-edge-flow { to { stroke-dashoffset: -18; } }
        @media (prefers-reduced-motion: reduce) {
          .workflow-chat-node { opacity: 1; transform: none; animation: none !important; }
          .workflow-chat-edge { animation: none !important; opacity: 1; }
        }
      `}</style>

      <div className="absolute inset-x-0 top-0 z-30 flex h-9 items-center border-b border-white/[0.08] bg-[#292927] px-2.5 text-[7px] sm:px-3 sm:text-[8px]">
        <div className="flex min-w-0 items-center gap-1.5 text-white/88">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-white/80 text-[8px] text-[#343432]">▦</span>
          <span className="truncate">Blank Workflow</span><span className="text-white/35">⌄</span>
        </div>
        <span className="ml-3 hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-1 text-white/55 sm:inline">Preview Mode</span>
        <div className="ml-auto flex items-center gap-1 text-white/68">
          <span className="rounded-full border border-white/15 px-1.5 py-1"><i className="mr-1 inline-block h-1 w-1 rounded-full bg-[#f1bd58]" />Draft</span>
          <span className="hidden rounded-full border border-white/15 px-1.5 py-1 sm:inline">Save</span>
          <span className="rounded-full border border-white/15 px-1.5 py-1">Generate</span>
          <span className="hidden rounded-full border border-white/15 px-1.5 py-1 sm:inline">↶ Undo</span>
          <span className="rounded-full border border-white/25 px-1.5 py-1">▷ Activate</span>
        </div>
      </div>

      <div className="absolute inset-x-0 top-9 z-20 flex h-7 items-end border-b border-white/[0.07] bg-[#30302e] px-2.5 text-[7px] sm:px-3 sm:text-[8px]">
        <span className="border-b-2 border-white/80 px-1.5 pb-1.5 text-white">Canvas</span>
        <span className="px-1.5 pb-1.5 text-white/42">Preview</span>
        <span className="hidden px-1.5 pb-1.5 text-white/35 sm:inline">Execution Logs</span>
      </div>

      <div className={`workflow-chat-canvas ${graphVisible ? "is-applied" : ""} absolute inset-x-0 bottom-0 top-[64px]`}>
        {graphVisible && (
          <>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
              <path className="workflow-chat-edge" d="M310 132 C310 206 292 207 292 245" />
              <path className="workflow-chat-edge" d="M454 245 H570" />
              <path className="workflow-chat-edge" d="M732 245 C785 245 780 396 740 396 H475" />
              <path className="workflow-chat-edge" d="M475 396 H570" />
            </svg>
            <CanvasNode className="left-[15%] top-[10%]" delay="70ms" title="Webhook Trigger" output />
            <CanvasNode className="left-[29.2%] top-[28%]" delay="180ms" title="Step 1: Generate" detail="Draft Reply" tone="yellow" input output />
            <CanvasNode className="left-[57%] top-[28%]" delay="290ms" title="Step 2: Send Draft" detail="Human Review" tone="blue" input output />
            <CanvasNode className="left-[31%] top-[60%]" delay="400ms" title="Step 3: Human" detail="Approval Check" tone="blue" input output />
            <CanvasNode className="left-[57%] top-[60%]" delay="510ms" title="Step 4: Send" detail="Notify Contact" tone="blue" input />
          </>
        )}

        <div className="absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-1 text-[7px] text-white/48">◷ 0 &nbsp;⌘ 0</div>
        <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[#393937] text-[10px] text-white/65">⌁</div>

        {graphVisible ? (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-[#464643] px-3 py-1.5 text-[8px] text-white/65 shadow-xl">Workflow applied to canvas</div>
        ) : (
          <div className="absolute bottom-0 left-1/2 top-0 z-20 flex w-[min(410px,calc(100vw-120px))] max-w-[calc(100vw-46px)] -translate-x-1/2 flex-col">
            <div className="mx-auto flex h-8 w-fit shrink-0 items-center gap-2 rounded-b-xl border border-t-0 border-white/[0.12] bg-[#2d2d2a] px-3 text-[8px] text-white/85 shadow-lg">
              <img src="/aivory-logo.svg" alt="Aivory" width={383} height={79} className="h-3 w-auto object-contain" />
              <span className="h-3 w-px bg-white/15" />
              <span>Aivory Copilot</span>
              <span className="text-white/35">/ or ⌘K</span>
              <span className="text-white/35">⌄</span>
            </div>

            <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-b-[16px] border border-t-0 border-white/[0.12] bg-[#3a3a38] shadow-[0_20px_50px_rgba(0,0,0,.48)]">
              <div className="flex h-9 shrink-0 items-center justify-end border-b border-white/[0.08] px-3">
                <span className="text-[11px] text-white/35">♧</span>
                <span className="ml-3 text-white/35">⌃</span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col justify-end space-y-2 overflow-hidden px-3 py-2 text-[8px] leading-relaxed sm:text-[9px]">
                {requestVisible && <div className="ml-auto w-fit max-w-[82%] rounded-[9px] rounded-br-[2px] border border-white/[0.06] bg-[#282825] px-2.5 py-2 text-white/90">{requestText}</div>}
                {phase === "typingRequest" && <div className="ml-auto flex max-w-[82%] items-center rounded-[9px] rounded-br-[2px] border border-white/[0.06] bg-[#282825] px-2.5 py-1.5 text-white/80">{typedRequest}<span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-white/55" /></div>}
                {phase === "assistantTyping" && <div className="flex items-start gap-1.5"><img src="/aivory-logo.svg" alt="" width={383} height={79} className="mt-1 h-2.5 w-7 object-contain" /><div className="rounded-[9px] rounded-bl-[2px] border border-white/[0.06] bg-white/[0.045] px-2.5"><TypingDots /></div></div>}
                {replyVisible && <div className="flex items-start gap-1.5"><img src="/aivory-logo.svg" alt="" width={383} height={79} className="mt-1 h-2.5 w-7 object-contain" /><div className="max-w-[84%] rounded-[9px] rounded-bl-[2px] border border-white/[0.06] bg-white/[0.045] px-2.5 py-2 text-white/84">I’ll add the trigger, generate a tailored reply, route it for human approval, and notify the contact. Want me to build it?</div></div>}
                {phase === "typingConfirm" && <div className="ml-auto flex w-fit items-center rounded-[9px] rounded-br-[2px] border border-white/[0.06] bg-[#282825] px-2.5 py-1.5 text-white/80">{typedConfirm}<span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-white/55" /></div>}
                {confirmVisible && <div className="ml-auto w-fit rounded-[9px] rounded-br-[2px] border border-white/[0.06] bg-[#282825] px-2.5 py-2 text-white/90">{confirmText}</div>}
                {phase === "generating" && <div className="flex items-start gap-1.5"><img src="/aivory-logo.svg" alt="" width={383} height={79} className="mt-1 h-2.5 w-7 object-contain" /><div className="rounded-[9px] rounded-bl-[2px] border border-white/[0.06] bg-white/[0.045] px-2.5 py-2 text-white/65">Creating and validating the workflow… <span className="animate-pulse">•••</span></div></div>}
                {readyVisible && <div className="flex items-start gap-1.5"><img src="/aivory-logo.svg" alt="" width={383} height={79} className="mt-1 h-2.5 w-7 object-contain" /><div className="rounded-[9px] rounded-bl-[2px] border border-white/[0.06] bg-white/[0.045] px-2.5 py-2 text-white/84">Your workflow is ready. I’ve validated the structure and setup requirements.</div></div>}
              </div>
              {readyVisible && <div className="mx-3 mb-2 flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#343432] px-2.5 py-2"><div className="min-w-0 flex-1"><div className="text-[8px] font-light text-white">Workflow ready — 5 steps</div><div className="mt-0.5 text-[7px] text-white/42">Validated. Setup items: 4</div></div><button type="button" onClick={() => setPhase("applied")} className="rounded-md bg-[#6c5ce7] px-2.5 py-1.5 text-[8px] font-light text-white">Apply to canvas</button></div>}
              <div className="mx-3 mb-3 flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#292927] px-2.5 py-2 text-[8px] text-white/32"><span className="flex-1">Enter an idea or app name to get started</span><span className="text-white/45">♧</span><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5a5a57] text-[10px] text-white">↑</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
